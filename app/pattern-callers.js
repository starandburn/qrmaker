// app/pattern-callers.js
(function(global){
  if(!global) return;

  function createPatternCallers({ ctx } = {}){
    const callPutFinderCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.finderPattern;
      if(pattern && typeof pattern.putFinderCells === "function"){
        return pattern.putFinderCells(ctx, ...args);
      }
      return false;
    };
    const callDrawFinderPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.finderPattern;
      if(pattern && typeof pattern.drawFinderPatterns === "function"){
        return pattern.drawFinderPatterns(ctx, ...args);
      }
      return false;
    };
    const callPutAlignmentCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.alignmentPattern;
      if(pattern && typeof pattern.putAlignmentCells === "function"){
        return pattern.putAlignmentCells(ctx, ...args);
      }
      return false;
    };
    const callDrawAlignmentPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.alignmentPattern;
      if(pattern && typeof pattern.drawAlignmentPatterns === "function"){
        return pattern.drawAlignmentPatterns(ctx, ...args);
      }
      return false;
    };
    const callPutTimingCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.timingPattern;
      if(pattern && typeof pattern.putTimingCells === "function"){
        return pattern.putTimingCells(ctx, ...args);
      }
      return false;
    };
    const callDrawTimingPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.timingPattern;
      if(pattern && typeof pattern.drawTimingPatterns === "function"){
        return pattern.drawTimingPatterns(ctx, ...args);
      }
      return false;
    };
    const callPutDarkModuleCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.darkModulePattern;
      if(pattern && typeof pattern.putDarkModuleCells === "function"){
        return pattern.putDarkModuleCells(ctx, ...args);
      }
      return false;
    };
    const callDrawDarkModulePatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.darkModulePattern;
      if(pattern && typeof pattern.drawDarkModulePatterns === "function"){
        return pattern.drawDarkModulePatterns(ctx, ...args);
      }
      return false;
    };
    const callPutFormatCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      if(pattern && typeof pattern.putFormatCells === "function"){
        return pattern.putFormatCells(ctx, ...args);
      }
      return false;
    };
    const callDrawFormatPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      if(pattern && typeof pattern.drawFormatPatterns === "function"){
        return pattern.drawFormatPatterns(ctx, ...args);
      }
      return false;
    };

    return {
      callPutFinderCells,
      callDrawFinderPatterns,
      callPutAlignmentCells,
      callDrawAlignmentPatterns,
      callPutTimingCells,
      callDrawTimingPatterns,
      callPutDarkModuleCells,
      callDrawDarkModulePatterns,
      callPutFormatCells,
      callDrawFormatPatterns,
    };
  }

  global.createPatternCallers = createPatternCallers;
})(typeof window !== "undefined" ? window : globalThis);
