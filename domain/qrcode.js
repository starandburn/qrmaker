const BIT_UNPLACED = 0;
const BIT_FUNC_FINDER = 10;
const BIT_FUNC_TIMING = 11;
const BIT_FUNC_ALIGNMENT = 12;
const BIT_FUNC_DARK = 13;
const BIT_FUNC_FORMAT = 14;
const BIT_FUNC_VERSION = 15;
const BIT_INFO_MODE = 20;
const BIT_INFO_LENGTH = 21;
const BIT_INFO_CHAR = 22;
const BIT_INFO_TERMINATOR = 23;
const BIT_INFO_PADDING = 24;
const BIT_INFO_PARITY = 25;
const BIT_MASK = 30;
const BIT_UNKNOWN = 99;

/**
 * Encode a bit with sign: positive => black(1), negative => white(0).
 * kind is the absolute category id (BIT_***).
 */
function encodeBit(kind, isBlack){
  if(kind === BIT_UNPLACED || kind === 0) return 0;
  const mag = Math.abs(kind);
  return isBlack ? mag : -mag;
}

/** Return the absolute kind; 0 (BIT_UNPLACED) stays 0. */
function bitKind(val){
  if(val === 0) return BIT_UNPLACED;
  return Math.abs(val);
}

/** Is black? (1) */
function isBlackBit(val){
  return val > 0;
}

/** Is white? (0) */
function isWhiteBit(val){
  return val < 0;
}

/** Is unplaced? (0 or kind == BIT_UNPLACED) */
function isUnplacedBit(val){
  return bitKind(val) === BIT_UNPLACED;
}

// --- Reed-Solomon parity (QR GF(256) poly 0x11d) helpers ---
const QR_GF_EXP = new Array(512);
const QR_GF_LOG = new Array(256);
const QR_GEN_CACHE = {};
let qrGFReady = false;

function ensureQR_GF(){
  if(qrGFReady) return;
  let x = 1;
  for(let i = 0; i < 256; i++){
    QR_GF_EXP[i] = x;
    QR_GF_LOG[x] = i;
    x <<= 1;
    if(x & 0x100){
      x ^= 0x11d;
    }
  }
  for(let i = 256; i < 512; i++){
    QR_GF_EXP[i] = QR_GF_EXP[i - 256];
  }
  qrGFReady = true;
}

function qrMul(a, b){
  if(a === 0 || b === 0) return 0;
  return QR_GF_EXP[(QR_GF_LOG[a] + QR_GF_LOG[b]) % 255];
}

function qrPolyMultiply(p, q){
  const res = new Array(p.length + q.length - 1).fill(0);
  for(let i = 0; i < p.length; i++){
    for(let j = 0; j < q.length; j++){
      res[i + j] ^= qrMul(p[i], q[j]);
    }
  }
  return res;
}

function qrGetGenerator(ecLen){
  if(QR_GEN_CACHE[ecLen]) return QR_GEN_CACHE[ecLen];
  ensureQR_GF();
  let poly = [1];
  for(let i = 0; i < ecLen; i++){
    poly = qrPolyMultiply(poly, [1, QR_GF_EXP[i]]);
  }
  QR_GEN_CACHE[ecLen] = poly;
  return poly;
}

function qrComputeParity(dataCodewords, ecLen){
  const gen = qrGetGenerator(ecLen);
  const ec = new Array(ecLen).fill(0);
  for(const d of dataCodewords){
    const factor = d ^ ec[0];
    ec.shift();
    ec.push(0);
    if(factor !== 0){
      for(let i = 0; i < ecLen; i++){
        ec[i] ^= qrMul(gen[i + 1], factor);
      }
    }
  }
  return ec;
}

const toBinaryString = (value, width = 8) => {
  const numeric = Number.isFinite(value) ? value : 0;
  return numeric.toString(2).padStart(width, "0");
};

function qrBuildPatternSegments(text){
  const input = typeof text === "string" ? text : "";
  const DATA_CODEWORDS = 34;
  const EC_CODEWORDS = 10;
  const PAD_CODEWORDS = [0xec, 0x11];
  const flat = [];
  const pushBitsToFlat = (bits, kind) => {
    const baseKind = typeof kind === "number" ? kind : BIT_UNKNOWN;
    for(const bit of bits){
      const isBlack = bit === "1";
      flat.push(encodeBit(baseKind, isBlack));
    }
  };

  const modeBits = "0100";
  const lenBits = Math.max(0, input.length).toString(2).padStart(8, "0");
  let dataBitStream = modeBits + lenBits;
  const characterEntries = [];
  for(let i = 0; i < input.length; i++){
    const code = input.charCodeAt(i) & 0xff;
    const bits = code.toString(2).padStart(8, "0");
    characterEntries.push({
      char: input.charAt(i),
      code,
      bits,
    });
    dataBitStream += bits;
  }

  const terminatorBits = "0000";
  dataBitStream += terminatorBits;
  let zeroPadBits = "";
  const mod8 = dataBitStream.length % 8;
  if(mod8 !== 0){
    const paddingLength = 8 - mod8;
    zeroPadBits = "0".repeat(paddingLength);
    dataBitStream += zeroPadBits;
  }

  const dataCodewords = [];
  for(let offset = 0; offset < dataBitStream.length; offset += 8){
    const byteBits = dataBitStream.slice(offset, offset + 8);
    if(byteBits.length < 8) continue;
    dataCodewords.push(parseInt(byteBits, 2));
  }

  const padEntries = [];
  let padIdx = 0;
  while(dataCodewords.length < DATA_CODEWORDS){
    const value = PAD_CODEWORDS[padIdx % PAD_CODEWORDS.length];
    const bits = toBinaryString(value, 8);
    dataCodewords.push(value);
    padEntries.push({ value, bits });
    padIdx++;
  }

  const parityBytes = qrComputeParity(dataCodewords, EC_CODEWORDS);

  pushBitsToFlat(modeBits, BIT_INFO_MODE);
  pushBitsToFlat(lenBits, BIT_INFO_LENGTH);
  for(const entry of characterEntries){
    pushBitsToFlat(entry.bits, BIT_INFO_CHAR);
  }
  pushBitsToFlat(terminatorBits, BIT_INFO_TERMINATOR);
  if(zeroPadBits){
    pushBitsToFlat(zeroPadBits, BIT_INFO_PADDING);
  }
  for(const padEntry of padEntries){
    pushBitsToFlat(padEntry.bits, BIT_INFO_PADDING);
  }
  for(const byte of parityBytes){
    pushBitsToFlat(toBinaryString(byte, 8), BIT_INFO_PARITY);
  }

  window.patternBits = flat.slice();
  return {
    modeBits,
    lenBits,
    characterEntries,
    terminatorBits,
    zeroPadBits,
    padEntries,
    dataCodewords,
    parityBytes,
  };
}

function parsePattern(text){
  const builder = qrBuildPatternSegments(text);
  return Array.isArray(window.patternBits) ? window.patternBits : [];
}

// Export to global scope for use by layout.js / main.js
window.BIT_UNPLACED = BIT_UNPLACED;
window.BIT_FUNC_FINDER = BIT_FUNC_FINDER;
window.BIT_FUNC_TIMING = BIT_FUNC_TIMING;
window.BIT_FUNC_ALIGNMENT = BIT_FUNC_ALIGNMENT;
window.BIT_FUNC_DARK = BIT_FUNC_DARK;
window.BIT_FUNC_FORMAT = BIT_FUNC_FORMAT;
window.BIT_FUNC_VERSION = BIT_FUNC_VERSION;
window.BIT_INFO_MODE = BIT_INFO_MODE;
window.BIT_INFO_LENGTH = BIT_INFO_LENGTH;
window.BIT_INFO_CHAR = BIT_INFO_CHAR;
window.BIT_INFO_TERMINATOR = BIT_INFO_TERMINATOR;
window.BIT_INFO_PADDING = BIT_INFO_PADDING;
window.BIT_INFO_PARITY = BIT_INFO_PARITY;
window.BIT_MASK = BIT_MASK;
window.BIT_UNKNOWN = BIT_UNKNOWN;
window.encodeBit = encodeBit;
window.bitKind = bitKind;
window.isBlackBit = isBlackBit;
window.isWhiteBit = isWhiteBit;
window.isUnplacedBit = isUnplacedBit;
window.parsePattern = parsePattern;
window.qrBuildPatternSegments = qrBuildPatternSegments;
window.qrComputeParity = qrComputeParity;
