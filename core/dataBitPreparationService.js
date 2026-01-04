/**
 * データビットのセット構築・ビット列作成・カーソル移動を担うサービス。
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

  global.dataBitPreparationService = Object.assign(global.dataBitPreparationService || {}, {
    prepareDataBits,
  });
})(typeof window !== "undefined" ? window : globalThis);
