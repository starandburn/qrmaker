/**
 * QR検証サービス
 * 盤面の正負から暗号ビット列を復元し、RS検証／デコードを試みる検証サービス。
 */
(function(global){
  if(!global) return;

  const BOARD_SIZE = 25;
  const EXPECTED_BITS = 352;
  const DATA_CODEWORDS = 34;
  const EC_CODEWORDS = 10;
  const FUNCTION_KINDS = [
    global.BIT_FUNC_FINDER,
    global.BIT_FUNC_TIMING,
    global.BIT_FUNC_ALIGNMENT,
    global.BIT_FUNC_DARK,
    global.BIT_FUNC_FORMAT,
    global.BIT_FUNC_VERSION,
  ].filter((v) => typeof v === "number");
  const MASK_FUNCTIONS = [
    (r, c) => ((r + c) % 2) === 0, // r,c are 0-based
    (r) => (r % 2) === 0,
    (_r, c) => (c % 3) === 0,
    (r, c) => ((r + c) % 3) === 0,
    (r, c) => ((Math.floor(r / 2) + Math.floor(c / 3)) % 2) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) === 0,
    (r, c) => ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0,
    (r, c) => ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0,
  ];
  const FORMAT_COORDS_A = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7],
    [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const n = 25;
  const FORMAT_COORDS_B = [
    [8, n - 1], [8, n - 2], [8, n - 3], [8, n - 4], [8, n - 5], [8, n - 6], [8, n - 7], [8, n - 8],
    [n - 7, 8], [n - 6, 8], [n - 5, 8], [n - 4, 8], [n - 3, 8], [n - 2, 8], [n - 1, 8],
  ];
  const FORMAT_INFO_DECODE = [
    { bits: 0x5412, data: 0x00 },
    { bits: 0x5125, data: 0x01 },
    { bits: 0x5e7c, data: 0x02 },
    { bits: 0x5b4b, data: 0x03 },
    { bits: 0x45f9, data: 0x04 },
    { bits: 0x40ce, data: 0x05 },
    { bits: 0x4f97, data: 0x06 },
    { bits: 0x4aa0, data: 0x07 },
    { bits: 0x77c4, data: 0x08 },
    { bits: 0x72f3, data: 0x09 },
    { bits: 0x7daa, data: 0x0a },
    { bits: 0x789d, data: 0x0b },
    { bits: 0x662f, data: 0x0c },
    { bits: 0x6318, data: 0x0d },
    { bits: 0x6c41, data: 0x0e },
    { bits: 0x6976, data: 0x0f },
    { bits: 0x1689, data: 0x10 },
    { bits: 0x13be, data: 0x11 },
    { bits: 0x1ce7, data: 0x12 },
    { bits: 0x19d0, data: 0x13 },
    { bits: 0x0762, data: 0x14 },
    { bits: 0x0255, data: 0x15 },
    { bits: 0x0d0c, data: 0x16 },
    { bits: 0x083b, data: 0x17 },
    { bits: 0x355f, data: 0x18 },
    { bits: 0x3068, data: 0x19 },
    { bits: 0x3f31, data: 0x1a },
    { bits: 0x3a06, data: 0x1b },
    { bits: 0x24b4, data: 0x1c },
    { bits: 0x2183, data: 0x1d },
    { bits: 0x2eda, data: 0x1e },
    { bits: 0x2bed, data: 0x1f },
  ];

  function cellToBit(value){
    if(typeof value !== "number") return 0;
    return value > 0 ? 1 : 0;
  }

  function getCellValue(row, col){
    if(typeof global.getCell !== "function"){
      throw new Error("global.getCell is required");
    }
    return global.getCell(row, col);
  }

  function isFunctionalCellValue(value){
    if(typeof global.bitKind !== "function"){
      throw new Error("global.bitKind is required");
    }
    const kindVal = global.bitKind(value);
    if(kindVal === global.BIT_MASK) return true;
    return FUNCTION_KINDS.includes(kindVal);
  }

  function iterateDataCells(callback){
    if(typeof callback !== "function") return;
    const timingCol = Number.isFinite(global.timingColIndex) ? Number(global.timingColIndex) : 0;
    let col = BOARD_SIZE;
    let upward = true;
    let startRow = BOARD_SIZE;
    while(col > 0){
      if(timingCol > 0 && col === timingCol){
        col--;
        continue;
      }
      const leftCol = col - 1;
      for(let step = 0; step < BOARD_SIZE; step++){
        const rawRow = upward ? startRow - step : startRow + step;
        const row = upward
          ? (rawRow >= 1 ? rawRow : BOARD_SIZE + rawRow)
          : (rawRow <= BOARD_SIZE ? rawRow : rawRow - BOARD_SIZE);
        for(const targetCol of [col, leftCol]){
          if(targetCol < 1) continue;
          if(timingCol > 0 && targetCol === timingCol) continue;
          const continueLoop = callback(row, targetCol);
          if(continueLoop === false){
            return;
          }
        }
      }
      upward = !upward;
      startRow = upward ? BOARD_SIZE : 1;
      col -= 2;
    }
  }

  function readDataCells(){
    const stats = {
      unplacedCells: 0,
      dataBitsRead: 0,
      paddedBits: 0,
      insufficientBits: false,
    };
    const cells = [];
    iterateDataCells((row, col) => {
      const value = getCellValue(row, col);
      if(isFunctionalCellValue(value)){
        return true;
      }
      if(value === 0 || value === null || value === undefined){
        stats.unplacedCells += 1;
      }
      const bit = cellToBit(value);
      cells.push({ row, col, bit });
      stats.dataBitsRead = cells.length;
      if(cells.length >= EXPECTED_BITS){
        return false;
      }
      return true;
    });
    if(cells.length < EXPECTED_BITS){
      stats.paddedBits = EXPECTED_BITS - cells.length;
      stats.insufficientBits = true;
    }
    return { cells, stats };
  }

  function buildBytesFromBits(bits){
    const bytes = [];
    for(let i = 0; i < bits.length; i += 8){
      const chunk = bits.slice(i, i + 8);
      if(chunk.length < 8) break;
      let val = 0;
      for(const bit of chunk){
        val = (val << 1) | (bit ? 1 : 0);
      }
      bytes.push(val);
    }
    return bytes;
  }

  function reverseBits(value, width = 15){
    let v = value >>> 0;
    let rev = 0;
    for(let i = 0; i < width; i++){
      rev = (rev << 1) | ((v >> i) & 1);
    }
    return rev;
  }

  function decodeFormatInfo(raw){
    if(typeof raw !== "number") return null;
    const normalized = raw & 0x7fff;
    let best = { distance: 16, entry: null, orientation: null };
    const variants = [
      { value: normalized, orientation: "normal" },
      { value: reverseBits(normalized), orientation: "reversed" },
    ];
    for(const variant of variants){
      for(const candidate of FORMAT_INFO_DECODE){
        const dist = popcount(variant.value ^ candidate.bits);
        if(dist < best.distance){
          best = { distance: dist, entry: candidate, orientation: variant.orientation };
        }
        if(dist === 0){
          break;
        }
      }
      if(best.distance === 0){
        break;
      }
    }
    return best.entry ? Object.assign({}, best.entry, { distance: best.distance, orientation: best.orientation }) : null;
  }

  function popcount(value){
    let v = value;
    let count = 0;
    while(v){
      count += v & 1;
      v >>>= 1;
    }
    return count;
  }

  function decodeTextFromBits(bits){
    if(bits.length < 12) return { ok: false, text: null };
    let offset = 0;
    const take = (count) => {
      const slice = bits.slice(offset, offset + count);
      offset += slice.length;
      return slice;
    };
    const readBits = (count) => {
      const chunk = take(count);
      if(chunk.length < count) return null;
      return chunk.reduce((acc, bit) => (acc << 1) | (bit ? 1 : 0), 0);
    };
    const modeValue = readBits(4);
    if(modeValue !== 0b0100) return { ok: false, text: null };
    const length = readBits(8);
    if(length === null) return { ok: false, text: null };
    if(!Number.isFinite(length) || length < 0){
      return { ok: false, text: null };
    }
    const chars = [];
    for(let i = 0; i < length; i++){
      const code = readBits(8);
      if(code === null){
        return { ok: false, text: null };
      }
      chars.push(String.fromCharCode(code));
    }
    return { ok: chars.length === length, text: chars.join("") };
  }

  function readFormatBitsFrom(coords){
    let value = 0;
    for(let i = 0; i < coords.length; i++){
      const [rowOff, colOff] = coords[i];
      const bit = cellToBit(getCellValue(rowOff + 1, colOff + 1));
      if(bit){
        value |= (1 << i);
      }
    }
    return value;
  }

  function readFormatInfo(){
    const rawA = readFormatBitsFrom(FORMAT_COORDS_A);
    const rawB = readFormatBitsFrom(FORMAT_COORDS_B);
    const decodedA = decodeFormatInfo(rawA);
    const decodedB = decodeFormatInfo(rawB);
    let chosen = {
      raw: rawA,
      decoded: decodedA,
      source: "A",
    };
    if(decodedB && (!decodedA || decodedB.distance <= decodedA.distance)){
      chosen = {
        raw: rawB,
        decoded: decodedB,
        source: "B",
      };
    }
    return {
      raw: chosen.raw,
      decoded: chosen.decoded,
      source: chosen.source,
      maskIndex: chosen.decoded ? (chosen.decoded.data & 0x07) : null,
      errorLevel: chosen.decoded ? (chosen.decoded.data >> 3) : null,
    };
  }

  function unmaskBits(maskIdx, entries){
    const maskFn = MASK_FUNCTIONS[maskIdx];
    return entries.map(({ bit, row, col }) => {
      const shouldFlip = typeof maskFn === "function"
        ? maskFn(row - 1, col - 1)
        : false;
      return shouldFlip ? (bit ^ 1) : bit;
    });
  }

  function verifyWithMask(maskIdx, dataEntries, paddedBits){
    const bits = unmaskBits(maskIdx, dataEntries);
    const filled = bits.concat(Array(paddedBits).fill(0));
    const bytes = buildBytesFromBits(filled);
    const dataCodewords = bytes.slice(0, DATA_CODEWORDS);
    const parityBytes = bytes.slice(DATA_CODEWORDS, DATA_CODEWORDS + EC_CODEWORDS);
    const computedEc = (typeof global.qrComputeParity === "function")
      ? global.qrComputeParity(dataCodewords, EC_CODEWORDS)
      : [];
    const ecMatch = computedEc.length === parityBytes.length
      && parityBytes.every((value, idx) => value === computedEc[idx]);
    const decoded = decodeTextFromBits(filled.slice(0, DATA_CODEWORDS * 8));
    let reason = null;
    if(!ecMatch){
      reason = "rs_mismatch";
    }else if(!decoded.ok){
      reason = "decode_error";
    }
    return {
      ok: ecMatch && decoded.ok,
      reason,
      text: decoded.text,
      dataCodewords,
      parityBytes,
      computedEc,
      maskIndex: maskIdx,
    };
  }

  function verifyBoard(){
    const { cells: dataEntries, stats } = readDataCells();
    const bitsAvailable = dataEntries.length;
    const paddedBits = Math.max(0, EXPECTED_BITS - bitsAvailable);
    stats.paddedBits = paddedBits;
    stats.insufficientBits = paddedBits > 0;
    const formatInfo = readFormatInfo();
    const formatValid = Boolean(formatInfo.decoded);
    const formatMaskIdx = formatInfo.maskIndex;
    const tried = new Set();
    const maskCandidates = [];
    if(typeof formatMaskIdx === "number"){
      maskCandidates.push(formatMaskIdx);
    }
    for(let i = 0; i < MASK_FUNCTIONS.length; i++){
      maskCandidates.push(i);
    }
    let finalResult = {
      ok: false,
      reason: "rs_mismatch",
      text: null,
      dataCodewords: [],
      parityBytes: [],
      computedEc: [],
      maskIndex: formatMaskIdx,
    };
    for(const candidate of maskCandidates){
      if(candidate === null) continue;
      if(tried.has(candidate)) continue;
      tried.add(candidate);
      const result = verifyWithMask(candidate, dataEntries, paddedBits);
      if(result.ok){
        finalResult = result;
        break;
      }
      if(finalResult.reason === "rs_mismatch" && result.reason === "decode_error"){
        finalResult = result;
      }
    }
    finalResult.stats = Object.assign({}, stats, {
      formatValid,
      formatRaw: formatInfo.raw,
      formatMaskIndex: formatMaskIdx,
      formatErrorLevel: formatInfo.errorLevel,
      formatDistance: formatInfo.decoded ? formatInfo.decoded.distance : null,
      formatOrientation: formatInfo.decoded ? formatInfo.decoded.orientation : null,
      maskIndex: finalResult.maskIndex,
    });
    return finalResult;
  }

  global.qrVerifyService = Object.assign(global.qrVerifyService || {}, {
    cellToBit,
    verifyBoard,
  });
})(typeof window !== "undefined" ? window : globalThis);
