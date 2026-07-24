/**
 * QR verification service that decodes board state and validates RS parity.
 */
(function(global){
  if(!global) return;

  const getBoardSize = () => {
    const spec = getDefaultQrSpec();
    if(Number.isFinite(spec?.boardSize)) return spec.boardSize;
    if(Number.isFinite(global.BOARD_ROWS)) return global.BOARD_ROWS;
    return 25;
  };
  const getDefaultQrSpec = () => (typeof global.getActiveQrSpec === "function"
    ? global.getActiveQrSpec()
    : { expectedBits: 352, dataCodewords: 34, ecCodewords: 10 });
  const getQrSpecForFormatInfo = (formatInfo) => {
    const bits = formatInfo && Number.isFinite(formatInfo.errorLevel) ? formatInfo.errorLevel : null;
    if(bits !== null && typeof global.getQrSpecForFormatErrorLevelBits === "function"){
      return global.getQrSpecForFormatErrorLevelBits(bits);
    }
    return getDefaultQrSpec();
  };
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
  const buildFormatCoordsB = (boardSize) => [
    [8, boardSize - 1], [8, boardSize - 2], [8, boardSize - 3], [8, boardSize - 4], [8, boardSize - 5], [8, boardSize - 6], [8, boardSize - 7], [8, boardSize - 8],
    [boardSize - 7, 8], [boardSize - 6, 8], [boardSize - 5, 8], [boardSize - 4, 8], [boardSize - 3, 8], [boardSize - 2, 8], [boardSize - 1, 8],
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
  const buildExpectedFunctionalCoords = (spec = getDefaultQrSpec()) => {
    const boardSize = Number.isFinite(spec?.boardSize) ? spec.boardSize : getBoardSize();
    const set = new Set();
    const add = (row, col) => {
      if(row < 1 || row > boardSize || col < 1 || col > boardSize) return;
      set.add(`${row},${col}`);
    };
    const addFinderWithSeparator = (baseRow, baseCol) => {
      for(let row = baseRow - 1; row <= baseRow + 7; row++){
        for(let col = baseCol - 1; col <= baseCol + 7; col++){
          add(row, col);
        }
      }
    };
    const finderOrigins = typeof global.getQrFinderOriginsForSpec === "function"
      ? global.getQrFinderOriginsForSpec(spec)
      : [[1, 1], [1, boardSize - 6], [boardSize - 6, 1]];
    for(const [row, col] of finderOrigins){
      addFinderWithSeparator(row, col);
    }
    const alignmentCenters = typeof global.getQrAlignmentCentersForSpec === "function"
      ? global.getQrAlignmentCentersForSpec(spec)
      : [[boardSize - 6, boardSize - 6]];
    for(const [centerRow, centerCol] of alignmentCenters){
      for(let row = centerRow - 2; row <= centerRow + 2; row++){
        for(let col = centerCol - 2; col <= centerCol + 2; col++){
          add(row, col);
        }
      }
    }
    const darkModule = typeof global.getQrDarkModuleCoordForSpec === "function"
      ? global.getQrDarkModuleCoordForSpec(spec)
      : [boardSize - 7, 9];
    add(darkModule[0], darkModule[1]);
    for(const [rowOff, colOff] of FORMAT_COORDS_A){
      add(rowOff + 1, colOff + 1);
    }
    for(const [rowOff, colOff] of buildFormatCoordsB(boardSize)){
      add(rowOff + 1, colOff + 1);
    }
    for(let col = 1; col <= boardSize; col++){
      add(7, col);
    }
    for(let row = 1; row <= boardSize; row++){
      add(row, 7);
    }
    return Array.from(set, (key) => {
      const [row, col] = key.split(",").map((v) => Number(v));
      return { row, col };
    });
  };

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
  function verifyFunctionalPatterns(spec = getDefaultQrSpec()){
    const expectedFunctionalCoords = buildExpectedFunctionalCoords(spec);
    let missingCount = 0;
    for(const coord of expectedFunctionalCoords){
      const value = getCellValue(coord.row, coord.col);
      if(!isFunctionalCellValue(value)){
        missingCount += 1;
      }
    }
    return {
      ok: missingCount === 0,
      missingCount,
      expectedCount: expectedFunctionalCoords.length,
    };
  }

  function iterateDataCells(callback){
    if(typeof callback !== "function") return;
    const timingCol = Number.isFinite(global.timingColIndex) ? Number(global.timingColIndex) : 0;
    const boardSize = getBoardSize();
    let col = boardSize;
    let upward = true;
    let startRow = boardSize;
    while(col > 0){
      if(timingCol > 0 && col === timingCol){
        col--;
        continue;
      }
      const leftCol = col - 1;
      for(let step = 0; step < boardSize; step++){
        const rawRow = upward ? startRow - step : startRow + step;
        const row = upward
          ? (rawRow >= 1 ? rawRow : boardSize + rawRow)
          : (rawRow <= boardSize ? rawRow : rawRow - boardSize);
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
      startRow = upward ? boardSize : 1;
      col -= 2;
    }
  }

  function readDataCells(spec = getDefaultQrSpec()){
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
      if(cells.length >= spec.expectedBits){
        return false;
      }
      return true;
    });
    if(cells.length < spec.expectedBits){
      stats.paddedBits = spec.expectedBits - cells.length;
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

  function bytesToBits(bytes){
    const bits = [];
    for(const byte of bytes){
      const value = Number(byte) & 0xff;
      for(let shift = 7; shift >= 0; shift--){
        bits.push((value >> shift) & 1);
      }
    }
    return bits;
  }

  function getBlockSpecs(spec){
    if(Array.isArray(spec?.blocks) && spec.blocks.length > 0){
      const result = [];
      for(const blockSpec of spec.blocks){
        const count = Number.isFinite(blockSpec.count) ? Math.max(1, Math.trunc(blockSpec.count)) : 1;
        const dataCodewords = Number.isFinite(blockSpec.dataCodewords) ? Math.max(0, Math.trunc(blockSpec.dataCodewords)) : 0;
        const ecCodewords = Number.isFinite(blockSpec.ecCodewords) ? Math.max(0, Math.trunc(blockSpec.ecCodewords)) : 0;
        for(let i = 0; i < count; i++){
          result.push({ dataCodewords, ecCodewords });
        }
      }
      return result;
    }
    return [{ dataCodewords: spec.dataCodewords, ecCodewords: spec.ecCodewords }];
  }

  function deinterleaveCodewords(bytes, spec){
    const blockSpecs = getBlockSpecs(spec);
    const blocks = blockSpecs.map((blockSpec) => Object.assign({}, blockSpec, {
      dataCodewordsList: [],
      parityBytes: [],
      computedEc: [],
    }));
    const dataArea = bytes.slice(0, spec.dataCodewords);
    const parityArea = bytes.slice(spec.dataCodewords, spec.dataCodewords + spec.ecCodewords);
    const maxDataLength = Math.max(0, ...blocks.map((block) => block.dataCodewords));
    const maxParityLength = Math.max(0, ...blocks.map((block) => block.ecCodewords));
    let offset = 0;
    for(let idx = 0; idx < maxDataLength; idx++){
      for(const block of blocks){
        if(idx < block.dataCodewords && Number.isFinite(dataArea[offset])){
          block.dataCodewordsList.push(dataArea[offset]);
          offset++;
        }
      }
    }
    offset = 0;
    for(let idx = 0; idx < maxParityLength; idx++){
      for(const block of blocks){
        if(idx < block.ecCodewords && Number.isFinite(parityArea[offset])){
          block.parityBytes.push(parityArea[offset]);
          offset++;
        }
      }
    }
    const dataCodewords = blocks.flatMap((block) => block.dataCodewordsList);
    const computedEcBlocks = blocks.map((block) => {
      const computedEc = (typeof global.qrComputeParity === "function")
        ? global.qrComputeParity(block.dataCodewordsList, block.ecCodewords)
        : [];
      block.computedEc = computedEc;
      return computedEc;
    });
    const computedEc = [];
    for(let idx = 0; idx < maxParityLength; idx++){
      computedEcBlocks.forEach((blockEc, blockIdx) => {
        if(idx < blocks[blockIdx].ecCodewords && Number.isFinite(blockEc[idx])){
          computedEc.push(blockEc[idx]);
        }
      });
    }
    return {
      blocks,
      dataCodewords,
      parityBytes: parityArea,
      computedEc,
    };
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
    if(bits.length < 12) return { ok: false, text: null, modeValue: null };
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
    if(modeValue !== 0b0100) return { ok: false, text: null, modeValue };
    const length = readBits(8);
    if(length === null) return { ok: false, text: null, modeValue };
    if(!Number.isFinite(length) || length < 0){
      return { ok: false, text: null, modeValue };
    }
    const chars = [];
    for(let i = 0; i < length; i++){
      const code = readBits(8);
      if(code === null){
        return { ok: false, text: null, modeValue };
      }
      chars.push(String.fromCharCode(code));
    }
    return { ok: chars.length === length, text: chars.join(""), modeValue };
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
    const boardSize = getBoardSize();
    const rawA = readFormatBitsFrom(FORMAT_COORDS_A);
    const rawB = readFormatBitsFrom(buildFormatCoordsB(boardSize));
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

  function verifyWithMask(maskIdx, dataEntries, paddedBits, spec = getDefaultQrSpec()){
    const bits = unmaskBits(maskIdx, dataEntries);
    const filled = bits.concat(Array(paddedBits).fill(0));
    const bytes = buildBytesFromBits(filled);
    const codewords = deinterleaveCodewords(bytes, spec);
    const dataCodewords = codewords.dataCodewords;
    const parityBytes = codewords.parityBytes;
    const computedEc = codewords.computedEc;
    const ecMatch = computedEc.length === parityBytes.length
      && parityBytes.every((value, idx) => value === computedEc[idx]);
    const decoded = decodeTextFromBits(bytesToBits(dataCodewords));
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
      modeValue: decoded.modeValue,
      dataCodewords,
      parityBytes,
      computedEc,
      blocks: codewords.blocks,
      maskIndex: maskIdx,
    };
  }

  function verifyWithoutMask(dataEntries, paddedBits, spec = getDefaultQrSpec()){
    const bits = dataEntries.map(({ bit }) => bit);
    const filled = bits.concat(Array(paddedBits).fill(0));
    const bytes = buildBytesFromBits(filled);
    const codewords = deinterleaveCodewords(bytes, spec);
    const dataCodewords = codewords.dataCodewords;
    const parityBytes = codewords.parityBytes;
    const computedEc = codewords.computedEc;
    const ecMatch = computedEc.length === parityBytes.length
      && parityBytes.every((value, idx) => value === computedEc[idx]);
    const decoded = decodeTextFromBits(bytesToBits(dataCodewords));
    return {
      ok: ecMatch && decoded.ok,
      text: decoded.text,
      modeValue: decoded.modeValue,
      dataCodewords,
      parityBytes,
      computedEc,
      blocks: codewords.blocks,
    };
  }

  function verifyBoard(){
    const defaultSpec = getDefaultQrSpec();
    const { cells: dataEntries, stats } = readDataCells(defaultSpec);
    const functionalCheck = verifyFunctionalPatterns(defaultSpec);
    const bitsAvailable = dataEntries.length;
    const formatInfo = readFormatInfo();
    const spec = getQrSpecForFormatInfo(formatInfo);
    const paddedBits = Math.max(0, spec.expectedBits - bitsAvailable);
    stats.paddedBits = paddedBits;
    stats.insufficientBits = paddedBits > 0;
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
      const result = verifyWithMask(candidate, dataEntries, paddedBits, spec);
      if(result.ok){
        finalResult = result;
        break;
      }
      if(finalResult.reason === "rs_mismatch" && result.reason === "decode_error"){
        finalResult = result;
      }
    }
    const preMaskResult = verifyWithoutMask(dataEntries, paddedBits, spec);
    const preMaskLikely = functionalCheck.ok && !finalResult.ok && preMaskResult.ok;
    if(preMaskLikely){
      finalResult.reason = "mask_missing";
      finalResult.text = preMaskResult.text;
      finalResult.dataCodewords = preMaskResult.dataCodewords;
      finalResult.parityBytes = preMaskResult.parityBytes;
      finalResult.computedEc = preMaskResult.computedEc;
    }
    if(!functionalCheck.ok){
      finalResult.ok = false;
      finalResult.reason = "function_pattern_missing";
      finalResult.text = null;
    }
    finalResult.stats = Object.assign({}, stats, {
      formatValid,
      formatRaw: formatInfo.raw,
      formatMaskIndex: formatMaskIdx,
      formatErrorLevel: formatInfo.errorLevel,
      formatDistance: formatInfo.decoded ? formatInfo.decoded.distance : null,
      formatOrientation: formatInfo.decoded ? formatInfo.decoded.orientation : null,
      maskIndex: finalResult.maskIndex,
      preMaskLikely,
      functionalPatternValid: functionalCheck.ok,
      missingFunctionalCells: functionalCheck.missingCount,
      expectedFunctionalCells: functionalCheck.expectedCount,
    });
    return finalResult;
  }

  global.qrVerifyService = Object.assign(global.qrVerifyService || {}, {
    cellToBit,
    verifyBoard,
  });
})(typeof window !== "undefined" ? window : globalThis);
