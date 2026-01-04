/**
 * [役割] Timing pattern drawing (horizontal/vertical lines)
 * [入力] ctx, runToken, direction/index, helpers
 * [副作用] writes timing bits, updates cursor when stepping
 * [中断] prefer executionControl.shouldAbort, fallback to runToken !== ctx.runId
 * [非対象] data placement, mask, UI, URL, history
 * [公開] window.timingPattern: putTimingCells, drawTimingPatterns
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

  /** Writes one timing row or column and tracks stepping/abort. */
  async function putTimingCells(ctx, direction = TIMING_HORIZONTAL, index = TIMING_ROW, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const dirVal = Number(direction);
    if(!Number.isFinite(dirVal)) return false;
    if(dirVal !== TIMING_HORIZONTAL && dirVal !== TIMING_VERTICAL) return false;
    const pos = (dirVal === TIMING_HORIZONTAL)
      ? resolveRowCol(index, undefined, cursorPos.row, cursorPos.col).row
      : resolveRowCol(undefined, index, cursorPos.row, cursorPos.col).col;
    if(!Number.isFinite(pos) || !Number.isInteger(pos) || pos < 1 || pos > 25) return false;
    const step = !!resolvedStep;
    const allowOverwrite = overwrite !== false;
    const canWriteTimingCell = (r, c) => shouldPlaceCell(r, c, allowOverwrite);
    const shouldAbort = () => {
      if(global.executionControl && typeof global.executionControl.shouldAbort === "function"){
        return global.executionControl.shouldAbort(runToken, ctx);
      }
      return runToken !== ctx.runId;
    };
    if(!step){
      const prevRender = ctx.renderMode;
      ctx.setRenderMode(ctx.RENDER_BUFFERED);
      if(dirVal === TIMING_HORIZONTAL){
        for(let c = 1; c <= 25; c++){
          const bit = (c % 2 === 1) ? 1 : 0;
          if(!canWriteTimingCell(pos, c)) continue;
          window.updateCell(pos, c, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
      }else{
        for(let r = 1; r <= 25; r++){
          const bit = (r % 2 === 1) ? 1 : 0;
          if(!canWriteTimingCell(r, pos)) continue;
          window.updateCell(r, pos, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
      }
      ctx.requestRender("putTimingCells");
      ctx.setRenderMode(prevRender);
      return true;
    }
    const delay = async () => {
      return H.stepDelayAbort ? H.stepDelayAbort(runToken) : Promise.resolve();
    };
    const updateCursorSafe = (row, col, dir = DIR_RIGHT) => {
      if(global.executionControl && typeof global.executionControl.updateCursorSafe === "function"){
        return global.executionControl.updateCursorSafe(runToken, ctx, row, col, dir);
      }
      if(runToken !== ctx.runId) return false;
      return updateCursor(row, col, dir);
    };
    return (async () => {
      const prevRender = ctx.renderMode;
      ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
      if(dirVal === TIMING_HORIZONTAL){
        let col = 1;
        while(col <= 25){
          if(shouldAbort()) return false;
          if(!ctx.helpers || !ctx.helpers.shouldStepFunctions() && !ctx.helpers.isStepModeOn()){
            ctx.setRenderMode(prevRender);
            return putTimingCells(ctx, direction, index, overwrite, { stepEnabled: false, currentRun: runToken });
          }
          const bit = (col % 2 === 1) ? 1 : 0;
          if(canWriteTimingCell(pos, col)){
            window.updateCell(pos, col, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
            updateCursorSafe(pos, col, DIR_RIGHT);
          }
          const md = await delay();
          if(md === false) return false;
          col++;
        }
      }else{
        let row = 1;
        while(row <= 25){
          if(shouldAbort()) return false;
          if(!ctx.helpers || !ctx.helpers.shouldStepFunctions() && !ctx.helpers.isStepModeOn()){
            ctx.setRenderMode(prevRender);
            return putTimingCells(ctx, direction, index, overwrite, { stepEnabled: false, currentRun: runToken });
          }
          const bit = (row % 2 === 1) ? 1 : 0;
          if(canWriteTimingCell(row, pos)){
            window.updateCell(row, pos, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
            updateCursorSafe(row, pos, DIR_RIGHT);
          }
          const md = await delay();
          if(md === false) return false;
          row++;
        }
      }
      ctx.setRenderMode(prevRender);
      return true;
    })();
  }

  /** Entrypoint that draws both horizontal and vertical timing lines. */
  async function drawTimingPatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    await putTimingCells(ctx, TIMING_HORIZONTAL, TIMING_ROW, overwrite, opts);
    await putTimingCells(ctx, TIMING_VERTICAL, TIMING_COL, overwrite, opts);
    return true;
  }

  global.timingPattern = Object.assign(global.timingPattern || {}, {
    putTimingCells,
    drawTimingPatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);

