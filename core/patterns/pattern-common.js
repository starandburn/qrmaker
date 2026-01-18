(function(global){
  if(!global) return;

  const ensureHelpers = (ctx) => (ctx && ctx.helpers) ? ctx.helpers : {};

  const setBasePatternLookahead = (infos) => {
    if(typeof global.setBasePatternLookahead !== "function"){
      throw new Error("global.setBasePatternLookahead is required");
    }
    global.setBasePatternLookahead(infos);
  };

  function resolveFunctionalOptions(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const baseRun = ctx ? ctx.runId : 0;
    const helpers = ensureHelpers(ctx);
    const defaultStep = helpers.shouldStepFunctions ? helpers.shouldStepFunctions() : false;
    if(typeof overwriteOrOpts === "object" && overwriteOrOpts !== null && !Array.isArray(overwriteOrOpts)){
      const { overwrite = false, currentRun, stepEnabled: stepFromOpts } = overwriteOrOpts;
      const resolvedRun = (typeof currentRun === "number") ? currentRun : baseRun;
      const resolvedStep = (typeof stepFromOpts === "boolean") ? stepFromOpts : defaultStep;
      return { overwrite, currentRun: resolvedRun, stepEnabled: resolvedStep };
    }
    const overwriteValue = (overwriteOrOpts === undefined) ? true : overwriteOrOpts;
    if(typeof currentRunOrOpts === "object" && currentRunOrOpts !== null && !Array.isArray(currentRunOrOpts)){
      const { currentRun, stepEnabled: stepFromOpts } = currentRunOrOpts;
      const resolvedRun = (typeof currentRun === "number") ? currentRun : baseRun;
      const resolvedStep = (typeof stepFromOpts === "boolean") ? stepFromOpts : defaultStep;
      return { overwrite: overwriteValue, currentRun: resolvedRun, stepEnabled: resolvedStep };
    }
    const resolvedRun = (typeof currentRunOrOpts === "number") ? currentRunOrOpts : baseRun;
    const resolvedStep = (typeof stepEnabled === "boolean") ? stepEnabled : defaultStep;
    return { overwrite: overwriteValue, currentRun: resolvedRun, stepEnabled: resolvedStep };
  }

  function ensureExecutionControl(){
    if(!global.executionControl){
      throw new Error("global.executionControl is required");
    }
    return global.executionControl;
  }

  function shouldAbort(runToken, ctx){
    const executionControl = ensureExecutionControl();
    if(typeof executionControl.shouldAbort !== "function"){
      throw new Error("executionControl.shouldAbort is required");
    }
    return executionControl.shouldAbort(runToken, ctx);
  }

  function updateCursorSafe(runToken, ctx, row, col, dir = DIR_RIGHT){
    const executionControl = ensureExecutionControl();
    if(typeof executionControl.updateCursorSafe !== "function"){
      throw new Error("executionControl.updateCursorSafe is required");
    }
    return executionControl.updateCursorSafe(runToken, ctx, row, col, dir);
  }

  global.patternCommon = {
    ensureHelpers,
    resolveFunctionalOptions,
    setBasePatternLookahead,
    shouldAbort,
    updateCursorSafe,
  };
})(typeof window !== "undefined" ? window : globalThis);
