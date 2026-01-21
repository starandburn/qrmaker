// app/pattern-callers.js
(function(global){
  if(!global) return;

  function createPatternCallers({ ctx } = {}){
    const callPutFinderCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.finderPattern;
      if(pattern && typeof pattern.putFinderCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putFinderCells(ctx, ...normalized);
      }
      return false;
    };
    const callDrawFinderPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.finderPattern;
      if(pattern && typeof pattern.drawFinderPatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawFinderPatterns(ctx, ...normalized);
      }
      return false;
    };
    const callPutAlignmentCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.alignmentPattern;
      if(pattern && typeof pattern.putAlignmentCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putAlignmentCells(ctx, ...normalized);
      }
      return false;
    };
    const callDrawAlignmentPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.alignmentPattern;
      if(pattern && typeof pattern.drawAlignmentPatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawAlignmentPatterns(ctx, ...normalized);
      }
      return false;
    };
    const callPutTimingCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.timingPattern;
      if(pattern && typeof pattern.putTimingCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putTimingCells(ctx, ...normalized);
      }
      return false;
    };
    const callDrawTimingPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.timingPattern;
      if(pattern && typeof pattern.drawTimingPatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawTimingPatterns(ctx, ...normalized);
      }
      return false;
    };
    const callPutDarkModuleCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.darkModulePattern;
      if(pattern && typeof pattern.putDarkModuleCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putDarkModuleCells(ctx, ...normalized);
      }
      return false;
    };
    const callDrawDarkModulePatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.darkModulePattern;
      if(pattern && typeof pattern.drawDarkModulePatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawDarkModulePatterns(ctx, ...normalized);
      }
      return false;
    };
    const callPutFormatCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      if(pattern && typeof pattern.putFormatCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putFormatCells(ctx, ...normalized);
      }
      return false;
    };
    const callDrawFormatPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      if(pattern && typeof pattern.drawFormatPatterns === "function"){
        const normalized = (args.length === 0) ? [] : args;
        return pattern.drawFormatPatterns(ctx, ...normalized);
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
