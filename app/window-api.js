// app/window-api.js
(function(global){
  if(!global) return;
  if(typeof global.createWindowApi === "function") return;

  function createWindowApi(win, deps = {}){
    const {
      callApplyMask,
      callDrawBasePatterns,
      callDrawBasePatternsStepped,
      makeStepThenable,
      shouldStepFunctions,
      drawQRCode,
      drawDataPatterns,
      drawFunctionalPatterns,
      initializeQRCode,
      resetQRCode,
      clearBoard,
      resetCommand,
      stopCurrentRun,
      drawFormatPatterns,
      drawFinderPatterns,
      drawAlignmentPatterns,
      drawDarkModulePatterns,
      drawTimingPatterns,
      callPutFinderCells,
      callPutAlignmentCells,
      callPutTimingCells,
      callPutDarkModuleCells,
      callPutFormatCells,
    } = deps;
    return {
      applyMask: callApplyMask,
      drawBasePatterns: callDrawBasePatterns,
      drawBasePatternsStepped: callDrawBasePatternsStepped,
      makeStepThenable,
      shouldStepFunctions,
      drawQRCode,
      drawText: (typeof win !== "undefined") ? win.drawText : undefined,
      drawDataPatterns,
      drawFunctionalPatterns,
      initializeQRCode,
      resetQRCode,
      clearBoard,
      resetCommand,
      stopCurrentRun,
      drawFormatPatterns,
      drawFinderPatterns,
      drawAlignmentPatterns,
      drawDarkModulePatterns,
      drawTimingPatterns,
      putFinderCells: callPutFinderCells,
      putAlignmentCells: callPutAlignmentCells,
      putTimingCells: callPutTimingCells,
      putDarkModuleCells: callPutDarkModuleCells,
      putFormatCells: callPutFormatCells,
      syncViewToggles: typeof win.syncViewToggles === "function" ? win.syncViewToggles : undefined,
      toggleInputs: win.toggleInputs,
    };
  }

  global.createWindowApi = createWindowApi;
})(typeof window !== "undefined" ? window : globalThis);
