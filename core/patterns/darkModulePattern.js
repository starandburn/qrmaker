/**
 * Dark Module（固定暗モジュール）描画処理を提供する
 * core/patterns 用モジュール
 */
(function(global){
  if(!global) return;

  const ensureHelpers = (ctx) => (ctx && ctx.helpers) ? ctx.helpers : {};

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

  async function putDarkModuleCells(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return true;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const step = !!resolvedStep;
    const baseRow = cursorPos.row;
    const baseCol = cursorPos.col;
    if(!shouldPlaceCell(baseRow, baseCol, overwrite !== false)) return true;
    if(!step){
      if(typeof window.updateCell === "function"){
        window.updateCell(baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
      }
      return true;
    }
    const delay = async () => {
      return H.stepDelayAbort ? H.stepDelayAbort(runToken) : Promise.resolve();
    };
    if(shouldAbort(runToken, ctx)) return false;
    ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
    if(typeof window.updateCell === "function"){
      window.updateCell(baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
    }
    updateCursorSafe(runToken, ctx, baseRow, baseCol, DIR_RIGHT);
    await delay();
    return true;
  }

  async function drawDarkModulePatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const opts = { stepEnabled: resolvedStep, currentRun };
    updateCursor(18, 9, DIR_RIGHT);
    await putDarkModuleCells(ctx, overwrite, opts);
    return true;
  }

  global.darkModulePattern = Object.assign(global.darkModulePattern || {}, {
    putDarkModuleCells,
    drawDarkModulePatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
