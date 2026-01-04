/**
 * Finderパターン描画を提供するモジュール（core/patterns 専用）
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

  async function putFinderCells(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const shouldAbort = () => {
      if(global.executionControl && typeof global.executionControl.shouldAbort === "function"){
        return global.executionControl.shouldAbort(runToken, ctx);
      }
      return runToken !== ctx.runId;
    };
    const stepInitial = !!resolvedStep;
    const baseRow = cursorPos.row;
    const baseCol = cursorPos.col;
    updateCursor(baseRow, baseCol, DIR_RIGHT);
    const pattern = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1],
    ];
    const prevRender = ctx.renderMode;
    const allowOverwrite = overwrite !== false;
    const shouldDrawCell = (row, col) => shouldPlaceCell(row, col, allowOverwrite);
    const updateCursorSafe = (row, col, dir = DIR_RIGHT) => {
      if(global.executionControl && typeof global.executionControl.updateCursorSafe === "function"){
        return global.executionControl.updateCursorSafe(runToken, ctx, row, col, dir);
      }
      if(runToken !== ctx.runId) return false;
      return updateCursor(row, col, dir);
    };
    let lastCursorRow = null;
    let lastCursorCol = null;
    const drawSync = () => {
      for(let r = 0; r < 7; r++){
        for(let c = 0; c < 7; c++){
          const row = baseRow + r;
          const col = baseCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          lastCursorRow = row;
          lastCursorCol = col;
        }
      }
      const sRow = baseRow - 1;
      const eRow = baseRow + 7;
      const sCol = baseCol - 1;
      const eCol = baseCol + 7;
      for(let r = sRow; r <= eRow; r++){
        for(let c = sCol; c <= eCol; c++){
          const insideCore = r >= baseRow && r < baseRow + 7 && c >= baseCol && c < baseCol + 7;
          if(insideCore) continue;
          if(r < 1 || r > 25 || c < 1 || c > 25) continue;
          if(r === sRow || r === eRow || c === sCol || c === eCol){
            if(!shouldDrawCell(r, c)) continue;
            window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
            lastCursorRow = r;
            lastCursorCol = c;
          }
        }
      }
    };
    const finishSync = () => {
      ctx.setRenderMode(ctx.RENDER_BUFFERED);
      drawSync();
      ctx.requestRender("drawFinderPatterns");
      ctx.setRenderMode(prevRender);
      if(lastCursorRow !== null && lastCursorCol !== null){
        updateCursorSafe(lastCursorRow, lastCursorCol, DIR_RIGHT);
      }
      return true;
    };
    if(!stepInitial){
      return finishSync();
    }
    const stepActive = () => executionControl.stepActive
      ? executionControl.stepActive({ helpers: H, ctx, runToken, stepEnabled: !!resolvedStep })
      : (H.shouldStepFunctions ? H.shouldStepFunctions() : false);
    const delay = async () => {
      return H.stepDelayAbort ? H.stepDelayAbort(runToken) : Promise.resolve();
    };
    const drawStep = async () => {
      for(let r = 0; r < 7; r++){
        for(let c = 0; c < 7; c++){
          if(shouldAbort()) return false;
          if(!stepActive()) return finishSync();
          const row = baseRow + r;
          const col = baseCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          updateCursorSafe(row, col, DIR_RIGHT);
          lastCursorRow = row;
          lastCursorCol = col;
          await delay();
        }
      }
      const sRow = baseRow - 1;
      const eRow = baseRow + 7;
      const sCol = baseCol - 1;
      const eCol = baseCol + 7;
      for(let r = sRow; r <= eRow; r++){
        for(let c = sCol; c <= eCol; c++){
          if(shouldAbort()) return false;
          if(!stepActive()) return finishSync();
          const insideCore = r >= baseRow && r < baseRow + 7 && c >= baseCol && c < baseCol + 7;
          if(insideCore) continue;
          if(r < 1 || r > 25 || c < 1 || c > 25) continue;
          if(r === sRow || r === eRow || c === sCol || c === eCol){
            if(!shouldDrawCell(r, c)) continue;
            window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
            updateCursorSafe(r, c, DIR_RIGHT);
            lastCursorRow = r;
            lastCursorCol = c;
            await delay();
          }
        }
      }
      return true;
    };
    ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
    const res = await drawStep();
    ctx.setRenderMode(prevRender);
    if(lastCursorRow !== null && lastCursorCol !== null){
      updateCursorSafe(lastCursorRow, lastCursorCol, DIR_RIGHT);
    }
    return !!res;
  }

  async function drawFinderPatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    const moveAndDraw = async (row, col) => {
      updateCursor(row, col, DIR_RIGHT);
      await putFinderCells(ctx, overwrite, opts);
    };
    await moveAndDraw(1, 1);
    await moveAndDraw(1, 19);
    await moveAndDraw(19, 1);
    return true;
  }

  global.finderPattern = Object.assign(global.finderPattern || {}, {
    putFinderCells,
    drawFinderPatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
