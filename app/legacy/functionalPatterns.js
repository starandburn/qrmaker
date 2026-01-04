/**
 * QR基本パターン描画（finder/timing/alignment/...）を提供するレガシーモジュール。
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
    const bridge = window.finderPattern;
    if(bridge && typeof bridge.putFinderCells === "function"){
      return bridge.putFinderCells(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
    return false;
  }

  async function drawFinderPatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const bridge = window.finderPattern;
    if(bridge && typeof bridge.drawFinderPatterns === "function"){
      return bridge.drawFinderPatterns(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
    return false;
  }

  async function putDarkModuleCells(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const bridge = window.darkModulePattern;
    if(bridge && typeof bridge.putDarkModuleCells === "function"){
      return bridge.putDarkModuleCells(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
    return true;
  }

  async function drawDarkModulePatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const bridge = window.darkModulePattern;
    if(bridge && typeof bridge.drawDarkModulePatterns === "function"){
      return bridge.drawDarkModulePatterns(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
    return false;
  }

  function resolveTimingPos(direction, index){
    if(direction === TIMING_HORIZONTAL){
      return resolveRowCol(index, undefined, cursorPos.row, cursorPos.col).row;
    }
    return resolveRowCol(undefined, index, cursorPos.row, cursorPos.col).col;
  }

  function shouldWriteTimingCell(r, c, allowOverwrite){
    return shouldPlaceCell(r, c, allowOverwrite);
  }

  async function putTimingCells(ctx, direction = TIMING_HORIZONTAL, index = TIMING_ROW, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const bridge = window.timingPattern;
    if(bridge && typeof bridge.putTimingCells === "function"){
      return bridge.putTimingCells(ctx, direction, index, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
    if(!ctx) return false;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const dirVal = Number(direction);
    if(!Number.isFinite(dirVal)) return false;
    if(dirVal !== TIMING_HORIZONTAL && dirVal !== TIMING_VERTICAL) return false;
    const pos = resolveTimingPos(dirVal, index);
    if(!Number.isFinite(pos) || !Number.isInteger(pos) || pos < 1 || pos > 25) return false;
    if(dirVal === TIMING_HORIZONTAL){
      timingRowIndex = pos;
    }else{
      timingColIndex = pos;
    }
    const step = !!resolvedStep;
    const allowOverwrite = overwrite !== false;
    const canWriteTimingCell = (r, c) => shouldWriteTimingCell(r, c, allowOverwrite);
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
    return (async () => {
      const prevRender = ctx.renderMode;
      ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
      if(dirVal === TIMING_HORIZONTAL){
        for(let c = 1; c <= 25; c++){
          if(runToken !== ctx.runId) return false;
          if(H.shouldStepFunctions && !H.shouldStepFunctions()){
            return putTimingCells(ctx, direction, index, overwrite, { stepEnabled: false, currentRun: runToken });
          }
          const bit = (c % 2 === 1) ? 1 : 0;
          if(!canWriteTimingCell(pos, c)) continue;
          window.updateCell(pos, c, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
          if(H.updateCursorIfRun){
            H.updateCursorIfRun(runToken, pos, c, DIR_RIGHT);
          }
          await delay();
        }
      }else{
        for(let r = 1; r <= 25; r++){
          if(runToken !== ctx.runId) return false;
          if(H.shouldStepFunctions && !H.shouldStepFunctions()){
            return putTimingCells(ctx, direction, index, overwrite, { stepEnabled: false, currentRun: runToken });
          }
          const bit = (r % 2 === 1) ? 1 : 0;
          if(!canWriteTimingCell(r, pos)) continue;
          window.updateCell(r, pos, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
          if(H.updateCursorIfRun){
            H.updateCursorIfRun(runToken, r, pos, DIR_RIGHT);
          }
          await delay();
        }
      }
      ctx.setRenderMode(prevRender);
      return true;
    })();
  }

  async function drawTimingPatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const bridge = window.timingPattern;
    if(bridge && typeof bridge.drawTimingPatterns === "function"){
      return bridge.drawTimingPatterns(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const opts = { stepEnabled: resolvedStep, currentRun };
    await putTimingCells(ctx, TIMING_HORIZONTAL, TIMING_ROW, overwrite, opts);
    await putTimingCells(ctx, TIMING_VERTICAL, TIMING_COL, overwrite, opts);
    return true;
  }

  async function putAlignmentCells(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const bridge = window.alignmentPattern;
    if(bridge && typeof bridge.putAlignmentCells === "function"){
      return bridge.putAlignmentCells(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
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
          if(runToken !== ctx.runId) return false;
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
          await delay();
        }
      }
      ctx.setRenderMode(prevRender);
      return true;
    })();
  }

  async function drawAlignmentPatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const bridge = window.alignmentPattern;
    if(bridge && typeof bridge.drawAlignmentPatterns === "function"){
      return bridge.drawAlignmentPatterns(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    updateCursor(19, 19, DIR_RIGHT);
    await putAlignmentCells(ctx, overwrite, opts);
    return true;
  }

  async function putFormatCells(ctx, bits15, coords, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const bridge = window.formatPattern;
    if(bridge && typeof bridge.putFormatCells === "function"){
      return bridge.putFormatCells(ctx, bits15, coords, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
    return false;
  }

  async function drawFormatPatterns(ctx, mask, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const bridge = window.formatPattern;
    if(bridge && typeof bridge.drawFormatPatterns === "function"){
      return bridge.drawFormatPatterns(ctx, mask, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    }
    return false;
  }

  global.legacyFunctionalPatterns = Object.assign(global.legacyFunctionalPatterns || {}, {
    putFinderCells,
    drawFinderPatterns,
    putDarkModuleCells,
    drawDarkModulePatterns,
    putTimingCells,
    drawTimingPatterns,
    putAlignmentCells,
    drawAlignmentPatterns,
    putFormatCells,
    drawFormatPatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
