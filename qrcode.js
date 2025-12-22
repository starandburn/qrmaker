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

/**
 * Build QR (v2-L) pattern bits from input text.
 * - Generates A(mode/len), B(data+terminator+padding), C(parity)
 * - Each bit is encoded with sign (black/white) and kind (BIT_INFO_*)
 * - Stores detail to window.patterns and flattened bits to window.patternBits
 */
function parsePattern(text){
  const input = typeof text === "string" ? text : "";
  // QR v2-L constants
  const DATA_CODEWORDS = 34; // data bytes
  const EC_CODEWORDS = 10;   // parity bytes
  const PAD_CODEWORDS = [0xec, 0x11];

  const flat = [];
  const pushBits = (bits, kind) => {
    const k = typeof kind === "number" ? kind : BIT_UNKNOWN;
    for(const ch of bits){
      const isBlack = ch === "1";
      flat.push(encodeBit(k, isBlack));
    }
  };

  // A: mode (0100) + length (8bit)
  const modeBits = "0100";
  const lenBits = input.length.toString(2).padStart(8, "0");
  pushBits(modeBits, BIT_INFO_MODE);
  pushBits(lenBits, BIT_INFO_LENGTH);

  // B: chars + terminator + zero-pad + pad codewords
  let bitStream = modeBits + lenBits;
  for(let i = 0; i < input.length; i++){
    const code = input.charCodeAt(i) & 0xff; // ASCII 8bit
    const bits = code.toString(2).padStart(8, "0");
    pushBits(bits, BIT_INFO_CHAR);
    bitStream += bits;
  }
  // Terminator (up to 4 bits)
  const terminatorBits = "0000";
  pushBits(terminatorBits, BIT_INFO_TERMINATOR);
  bitStream += terminatorBits;

  // Align to byte boundary with zero padding if needed
  const mod8 = bitStream.length % 8;
  if(mod8 !== 0){
    const zeroPad = "0".repeat(8 - mod8);
    pushBits(zeroPad, BIT_INFO_PADDING);
    bitStream += zeroPad;
  }

  // Split into bytes and pad to DATA_CODEWORDS with 0xEC/0x11
  const dataCodewords = [];
  for(let i = 0; i < bitStream.length; i += 8){
    const byteBits = bitStream.slice(i, i + 8);
    dataCodewords.push(parseInt(byteBits, 2));
  }
  let padIdx = 0;
  while(dataCodewords.length < DATA_CODEWORDS){
    const padVal = PAD_CODEWORDS[padIdx % PAD_CODEWORDS.length];
    dataCodewords.push(padVal);
    pushBits(padVal.toString(2).padStart(8, "0"), BIT_INFO_PADDING);
    padIdx++;
  }

  // C: parity (Reed-Solomon)
  const parity = qrComputeParity(dataCodewords, EC_CODEWORDS);
  for(const val of parity){
    const bits = val.toString(2).padStart(8, "0");
    pushBits(bits, BIT_INFO_PARITY);
  }

  window.patterns = flat;
  window.patternBits = flat;
  window.patternData = null;
  try{ console.log("patternBits", flat); }catch(_e){}
  return flat;
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
window.BIT_UNKNOWN = BIT_UNKNOWN;
window.encodeBit = encodeBit;
window.bitKind = bitKind;
window.isBlackBit = isBlackBit;
window.isWhiteBit = isWhiteBit;
window.isUnplacedBit = isUnplacedBit;
window.parsePattern = parsePattern;
