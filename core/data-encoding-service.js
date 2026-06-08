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
      const boardRows = Number.isFinite(global.BOARD_ROWS) ? global.BOARD_ROWS : 25;
      const boardCols = Number.isFinite(global.BOARD_COLS) ? global.BOARD_COLS : boardRows;
      updateCursor(boardRows, boardCols, directionUp);
    }
    return { funcSet, bitsSeq };
  };

})(typeof window !== "undefined" ? window : globalThis);
