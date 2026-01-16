(function(global){
  if(!global) return;

  const ensureHelpers = (ctx) => (ctx && ctx.helpers) ? ctx.helpers : {};

  const setBasePatternLookahead = (infos) => {
    if(typeof global.setBasePatternLookahead === "function"){
      global.setBasePatternLookahead(infos);
      return;
    }
    global.basePatternLookahead = Array.isArray(infos) ? infos : [];
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

  function shouldAbort(runToken, ctx){
    if(global.executionControl && typeof global.executionControl.shouldAbort === "function"){
      return global.executionControl.shouldAbort(runToken, ctx);
    }
    return runToken !== ctx.runId;
  }

  function updateCursorSafe(runToken, ctx, row, col, dir = DIR_RIGHT){
    if(global.executionControl && typeof global.executionControl.updateCursorSafe === "function"){
      return global.executionControl.updateCursorSafe(runToken, ctx, row, col, dir);
    }
    if(runToken !== ctx.runId) return false;
    return updateCursor(row, col, dir);
  }

  global.patternCommon = Object.assign(global.patternCommon || {}, {
    ensureHelpers,
    resolveFunctionalOptions,
    setBasePatternLookahead,
    shouldAbort,
    updateCursorSafe,
  });
})(typeof window !== "undefined" ? window : globalThis);
