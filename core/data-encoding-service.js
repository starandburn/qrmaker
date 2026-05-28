/**
 * Service functions for QR data encoding and bit preparation.
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

})(typeof window !== "undefined" ? window : globalThis);
