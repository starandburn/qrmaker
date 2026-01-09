/**
 * データエンコーディングサービスのための関数を提供する。
 */
(function(global){
  if(!global) return;

  const prepareDataBits = (deps = {}) => {
    const {
      buildFunctionSet,
      buildBitSequence,
      updateCursor,
      directionUp,
    } = deps;
    const funcSet = typeof buildFunctionSet === "function" ? buildFunctionSet() : new Set();
    const bitsSeq = typeof buildBitSequence === "function" ? buildBitSequence() : [];
    if(typeof updateCursor === "function"){
      updateCursor(25, 25, directionUp);
    }
    return { funcSet, bitsSeq };
  };

  global.dataEncodingService = Object.assign(global.dataEncodingService || {}, {
    prepareDataBits,
  });
})(typeof window !== "undefined" ? window : globalThis);
