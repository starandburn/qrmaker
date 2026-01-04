/**
 * Alignmentパターン描画を提供するモジュール（core/patterns 用）
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

  async function putAlignmentCells(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const step = !!resolvedStep;
    updateCursor(cursorPos.row, cursorPos.col, DIR_RIGHT);
    const baseRow = cursorPos.row;
    const baseCol = cursorPos.col;
    const pattern = [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,1,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
    ];
    const startRow = baseRow - 2;
    const startCol = baseCol - 2;
    const allowOverwrite = overwrite !== false;
    const shouldDrawCell = (row, col) => shouldPlaceCell(row, col, allowOverwrite);
    if(!step){
      const prevRender = ctx.renderMode;
      ctx.setRenderMode(ctx.RENDER_BUFFERED);
      for(let r = 0; r < 5; r++){
        for(let c = 0; c < 5; c++){
          const row = startRow + r;
          const col = startCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1));
        }
      }
      ctx.requestRender("putAlignmentCells");
      ctx.setRenderMode(prevRender);
      return true;
    }
    const stepActive = () => executionControl.stepActive({
      helpers: H,
      ctx,
      runToken,
    });
    const delay = async () => {
      return H.stepDelayAbort ? H.stepDelayAbort(runToken) : Promise.resolve();
    };
    return (async () => {
      const prevRender = ctx.renderMode;
      ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
      for(let r = 0; r < 5; r++){
        for(let c = 0; c < 5; c++){
          if(shouldAbort(runToken, ctx)) return false;
          if(!stepActive()){
            ctx.setRenderMode(prevRender);
            return putAlignmentCells(ctx, overwrite, { stepEnabled: false, currentRun: runToken });
          }
          const row = startRow + r;
          const col = startCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1));
          if(H.updateCursorIfRun){
            H.updateCursorIfRun(runToken, row, col, DIR_RIGHT);
          }
          updateCursorSafe(runToken, ctx, row, col, DIR_RIGHT);
          await delay();
        }
      }
      ctx.setRenderMode(prevRender);
      return true;
    })();
  }

  async function drawAlignmentPatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    updateCursor(19, 19, DIR_RIGHT);
    await putAlignmentCells(ctx, overwrite, opts);
    return true;
  }

  global.alignmentPattern = Object.assign(global.alignmentPattern || {}, {
    putAlignmentCells,
    drawAlignmentPatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
