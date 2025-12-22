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
 * kind は上記定数（絶対値で種類を判別）。
 */
function encodeBit(kind, isBlack){
  if(kind === BIT_UNPLACED || kind === 0) return 0;
  const mag = Math.abs(kind);
  return isBlack ? mag : -mag;
}

/** 0 なら未配置、それ以外は絶対値で種類を返す */
function bitKind(val){
  if(val === 0) return BIT_UNPLACED;
  return Math.abs(val);
}

/** 黒(1)か判定 */
function isBlackBit(val){
  return val > 0;
}

/** 白(0)か判定 */
function isWhiteBit(val){
  return val < 0;
}

/** 未配置か判定 (0 または kind が BIT_UNPLACED) */
function isUnplacedBit(val){
  return bitKind(val) === BIT_UNPLACED;
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
