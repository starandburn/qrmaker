// app/window-api.js
(function(global){
  if(!global) return;
  if(typeof global.createWindowApi === "function") return;

  function createWindowApi(win, deps = {}){
    const {
      applyMask,
      drawBasePatterns,
      drawBasePatternsStepped,
      makeStepThenable,
      shouldStepFunctions,
      drawQRCode,
      drawDataPatterns,
      resetBoard,
      clearBoard,
      stopCurrentRun,
      drawFormatPatterns,
      drawFinderPatterns,
      drawAlignmentPatterns,
      drawDarkModulePatterns,
      drawTimingPatterns,
      putFinderCells,
      putAlignmentCells,
      putTimingCells,
      putDarkModuleCells,
      putFormatCells,
    } = deps;
    return {
      applyMask,
      drawBasePatterns,
      drawBasePatternsStepped,
      makeStepThenable,
      shouldStepFunctions,
      drawQRCode,
      drawText: (typeof win !== "undefined") ? win.drawText : undefined,
      drawDataPatterns,
      resetBoard,
      clearBoard,
      stopCurrentRun,
      drawFormatPatterns,
      drawFinderPatterns,
      drawAlignmentPatterns,
      drawDarkModulePatterns,
      drawTimingPatterns,
      putFinderCells,
      putAlignmentCells,
      putTimingCells,
      putDarkModuleCells,
      putFormatCells,
      syncViewToggles: typeof win.syncViewToggles === "function" ? win.syncViewToggles : undefined,
      toggleInputs: win.toggleInputs,
    };
  }

  global.createWindowApi = createWindowApi;
})(typeof window !== "undefined" ? window : globalThis);
