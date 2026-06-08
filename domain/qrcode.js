/**
 * QR core domain constants and helpers for bit encoding and parity calculation.
 */
const BIT_UNPLACED = -1;
const BIT_WHITE = 0;
const BIT_BLACK = 1;
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
  if(kind === BIT_UNPLACED) return BIT_UNPLACED;
  const mag = Math.abs(kind);
  return isBlack ? mag : -mag;
}

/** Return the absolute kind; BIT_UNPLACED stays BIT_UNPLACED. */
function bitKind(val){
  if(val === BIT_UNPLACED) return BIT_UNPLACED;
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

/** Is unplaced? (BIT_UNPLACED) */
function isUnplacedBit(val){
  return val === BIT_UNPLACED || bitKind(val) === BIT_UNPLACED;
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

const QR_VERSION2_SPECS = {
  L: {
    version: 2,
    errorCorrectionLevel: "L",
    errorCorrectionBits: 1,
    boardSize: 25,
    expectedBits: 352,
    dataCodewords: 34,
    ecCodewords: 10,
    maxBytes: 32,
    formatBits: [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976],
  },
  M: {
    version: 2,
    errorCorrectionLevel: "M",
    errorCorrectionBits: 0,
    boardSize: 25,
    expectedBits: 352,
    dataCodewords: 28,
    ecCodewords: 16,
    maxBytes: 26,
    formatBits: [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0],
  },
  Q: {
    version: 2,
    errorCorrectionLevel: "Q",
    errorCorrectionBits: 3,
    boardSize: 25,
    expectedBits: 352,
    dataCodewords: 22,
    ecCodewords: 22,
    maxBytes: 20,
    formatBits: [0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed],
  },
  H: {
    version: 2,
    errorCorrectionLevel: "H",
    errorCorrectionBits: 2,
    boardSize: 25,
    expectedBits: 352,
    dataCodewords: 16,
    ecCodewords: 28,
    maxBytes: 14,
    formatBits: [0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b],
  },
};

const QR_ERROR_CORRECTION_AUTO_LEVEL = "A";
const QR_ERROR_CORRECTION_LEVEL_ORDER = ["H", "Q", "M", "L"];

function normalizeQrErrorCorrectionLevel(value, fallback = "A"){
  const raw = String(value ?? "").trim().toUpperCase();
  if(raw === QR_ERROR_CORRECTION_AUTO_LEVEL) return QR_ERROR_CORRECTION_AUTO_LEVEL;
  return Object.prototype.hasOwnProperty.call(QR_VERSION2_SPECS, raw) ? raw : fallback;
}

function getConfiguredQrErrorCorrectionLevel(){
  const defaults = (typeof window !== "undefined" && window.appSettings?.defaults)
    || (typeof window !== "undefined" && window.appSettingsFromScript?.defaults)
    || {};
  const nested = defaults.qrSpec && typeof defaults.qrSpec === "object"
    ? defaults.qrSpec.errorCorrectionLevel
    : undefined;
  const configuredLevel = normalizeQrErrorCorrectionLevel(nested ?? defaults.errorCorrectionLevel, "A");
  if(typeof window !== "undefined" && window.urlState){
    const paramKey = window.urlState.PARAM_KEYS?.ERROR_CORRECTION_LEVEL || "ec";
    if(typeof window.urlState.hasParam === "function"
      && typeof window.urlState.getParam === "function"
      && window.urlState.hasParam(paramKey)){
      return normalizeQrErrorCorrectionLevel(window.urlState.getParam(paramKey), "A");
    }
  }
  return configuredLevel;
}

function getQrSpecForErrorCorrectionLevel(level){
  const normalized = normalizeQrErrorCorrectionLevel(level, "A");
  return QR_VERSION2_SPECS[normalized] || QR_VERSION2_SPECS.L;
}

function getQrBoardSizeForVersion(version){
  const numeric = Number(version);
  const resolvedVersion = Number.isFinite(numeric) ? Math.max(1, Math.trunc(numeric)) : 2;
  return 17 + (4 * resolvedVersion);
}

function getQrFinderOriginsForSpec(spec){
  const size = Number.isFinite(spec?.boardSize) ? spec.boardSize : getQrBoardSizeForVersion(spec?.version);
  return [
    [1, 1],
    [1, size - 6],
    [size - 6, 1],
  ];
}

function getQrAlignmentCenterAxesForVersion(version){
  const numeric = Number(version);
  const resolvedVersion = Number.isFinite(numeric) ? Math.max(1, Math.trunc(numeric)) : 2;
  if(resolvedVersion <= 1) return [];
  return [7, getQrBoardSizeForVersion(resolvedVersion) - 6];
}

function getQrAlignmentCentersForSpec(spec){
  const centers = getQrAlignmentCenterAxesForVersion(spec?.version);
  const finderOrigins = getQrFinderOriginsForSpec(spec);
  const overlapsFinder = (row, col) => finderOrigins.some(([originRow, originCol]) => (
    row >= originRow - 2 && row <= originRow + 8 && col >= originCol - 2 && col <= originCol + 8
  ));
  const pairs = [];
  for(const row of centers){
    for(const col of centers){
      if(!overlapsFinder(row, col)){
        pairs.push([row, col]);
      }
    }
  }
  return pairs;
}

function getQrDarkModuleCoordForSpec(spec){
  const version = Number.isFinite(spec?.version) ? spec.version : 2;
  return [4 * version + 10, 9];
}

function getActiveQrBoardSize(text){
  const spec = getActiveQrSpec(text);
  return Number.isFinite(spec?.boardSize) ? spec.boardSize : getQrBoardSizeForVersion(spec?.version);
}

function getQrSpecForInputLength(length){
  const numeric = Number(length);
  const inputLength = Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
  const level = QR_ERROR_CORRECTION_LEVEL_ORDER.find((candidate) => inputLength <= QR_VERSION2_SPECS[candidate].maxBytes) || "L";
  return QR_VERSION2_SPECS[level];
}

function getQrSpecForText(text){
  const configuredLevel = getConfiguredQrErrorCorrectionLevel();
  if(configuredLevel === QR_ERROR_CORRECTION_AUTO_LEVEL){
    return getQrSpecForInputLength(String(text ?? "").length);
  }
  return getQrSpecForErrorCorrectionLevel(configuredLevel);
}

function getActiveQrMaxBytes(){
  const configuredLevel = getConfiguredQrErrorCorrectionLevel();
  if(configuredLevel === QR_ERROR_CORRECTION_AUTO_LEVEL){
    return QR_VERSION2_SPECS.L.maxBytes;
  }
  return getQrSpecForErrorCorrectionLevel(configuredLevel).maxBytes;
}

function getQrSpecForFormatErrorLevelBits(bits){
  const numeric = Number(bits);
  if(!Number.isFinite(numeric)) return getQrSpecForErrorCorrectionLevel("L");
  const match = Object.values(QR_VERSION2_SPECS).find((spec) => spec.errorCorrectionBits === numeric);
  return match || getQrSpecForErrorCorrectionLevel("L");
}

function getActiveQrSpec(text){
  return getQrSpecForText(text);
}

function qrBuildPatternSegments(text){
  const rawInput = typeof text === "string" ? text : "";
  const spec = getActiveQrSpec(rawInput);
  const input = rawInput.length > spec.maxBytes ? rawInput.slice(0, spec.maxBytes) : rawInput;
  const DATA_CODEWORDS = spec.dataCodewords;
  const EC_CODEWORDS = spec.ecCodewords;
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
window.BIT_WHITE = BIT_WHITE;
window.BIT_BLACK = BIT_BLACK;
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
window.getConfiguredQrErrorCorrectionLevel = getConfiguredQrErrorCorrectionLevel;
window.getActiveQrSpec = getActiveQrSpec;
window.getActiveQrMaxBytes = getActiveQrMaxBytes;
window.getActiveQrBoardSize = getActiveQrBoardSize;
window.getQrBoardSizeForVersion = getQrBoardSizeForVersion;
window.getQrFinderOriginsForSpec = getQrFinderOriginsForSpec;
window.getQrAlignmentCentersForSpec = getQrAlignmentCentersForSpec;
window.getQrDarkModuleCoordForSpec = getQrDarkModuleCoordForSpec;
window.getQrSpecForErrorCorrectionLevel = getQrSpecForErrorCorrectionLevel;
window.getQrSpecForFormatErrorLevelBits = getQrSpecForFormatErrorLevelBits;
window.qrBuildPatternSegments = qrBuildPatternSegments;
window.qrComputeParity = qrComputeParity;
