(function(){
  if(typeof window === "undefined") return;
  const getRunId = (ctx) => (ctx && typeof ctx.runId === "number") ? ctx.runId : null;

  function shouldAbort(runToken, ctx, extraAbort){
    if(typeof extraAbort === "function" && extraAbort()) return true;
    const current = getRunId(ctx);
    if(current === null) return false;
    return runToken !== current;
  }

  function updateCursorSafe(runToken, ctx, row, col, dir = DIR_RIGHT, extraAbort){
    if(shouldAbort(runToken, ctx, extraAbort)) return false;
    return updateCursor(row, col, dir);
  }

  function stepActive({ helpers, ctx, runToken, stepEnabled } = {}){
    if(!helpers) return false;
    const helperActive = (typeof helpers.shouldStepFunctions === "function")
      ? helpers.shouldStepFunctions()
      : false;
    if(!helperActive) return false;
    if(typeof helpers.isStepModeOn === "function" && !helpers.isStepModeOn()){
      return false;
    }
    if(stepEnabled === undefined){
      const current = getRunId(ctx);
      return current === null ? helperActive : runToken === current;
    }
    return stepEnabled && helperActive;
  }

  const executionControl = {
    shouldAbort,
    updateCursorSafe,
    stepActive,
  };

  window.executionControl = Object.assign({}, window.executionControl || {}, executionControl);
})();
