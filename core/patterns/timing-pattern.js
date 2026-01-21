/**
 * [役割] Timing pattern drawing (horizontal/vertical lines)
 * [入力] ctx, runToken, direction/index, helpers
 * [副作用] writes timing bits, updates cursor when stepping
 * [中断] executionControl.shouldAbort のみで中断判定
 * [非対象] data placement, mask, UI, URL, history
 * [公開] window.timingPattern: putTimingCells, drawTimingPatterns
 */
(function(global){
  if(!global) return;
  const requireMessage = "pattern-common.js must be loaded before timing-pattern.js.";
  const requireUtils = global.requireUtils;
  if(!requireUtils){
    throw new Error(requireMessage);
  }
  requireUtils.requireGlobalProp(global, "patternCommon", requireMessage);
  const patternCommon = global.patternCommon;
  const {
    ensureHelpers,
    resolveFunctionalOptions,
    setBasePatternLookahead,
    shouldAbort,
    updateCursorSafe,
  } = patternCommon;
  const PATTERN_STEP_SCALE = 1;
  if(typeof global.setTimingColIndex !== "function"){
    throw new Error("setTimingColIndex is required");
  }
  const setTimingColIndex = global.setTimingColIndex;
  const resolveStepDir = (dirVal) => (dirVal === TIMING_HORIZONTAL ? DIR_RIGHT : DIR_DOWN);
  const buildTimingLookahead = (dirVal, startPos) => {
    const infos = [];
    for(let i = 1; i <= 4; i++){
      const nextPos = startPos + i;
      if(nextPos < 1 || nextPos > 25) break;
      const bit = (nextPos % 2 === 1) ? 1 : 0;
      infos.push({ kind: BIT_FUNC_TIMING, bit });
    }
    return infos;
  };

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
    if(!step){
      const prevRender = ctx.renderMode;
      ctx.setRenderMode(ctx.RENDER_BUFFERED);
      if(dirVal === TIMING_HORIZONTAL){
        timingRowIndex = pos;
      }else{
        setTimingColIndex(pos);
      }
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
      return H.stepDelayAbort
        ? H.stepDelayAbort(runToken, { scale: PATTERN_STEP_SCALE })
        : Promise.resolve();
    };
    return (async () => {
      const prevRender = ctx.renderMode;
      ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
      if(dirVal === TIMING_HORIZONTAL){
        let col = 1;
        timingRowIndex = pos;
        while(col <= 25){
          if(shouldAbort(runToken, ctx)) return false;
          if(!ctx.helpers || !ctx.helpers.shouldStepFunctions() && !ctx.helpers.isStepModeOn()){
            ctx.setRenderMode(prevRender);
            return putTimingCells(ctx, direction, index, overwrite, { stepEnabled: false, currentRun: runToken });
          }
          const bit = (col % 2 === 1) ? 1 : 0;
          const canDraw = canWriteTimingCell(pos, col);
          if(canDraw){
            window.updateCell(pos, col, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
          }
          setBasePatternLookahead(buildTimingLookahead(dirVal, col));
          updateCursorSafe(runToken, ctx, pos, col, resolveStepDir(dirVal));
          const md = await delay();
          if(md === false) return false;
          col++;
        }
      }else{
        setTimingColIndex(pos);
        let row = 1;
        while(row <= 25){
          if(shouldAbort(runToken, ctx)) return false;
          if(!ctx.helpers || !ctx.helpers.shouldStepFunctions() && !ctx.helpers.isStepModeOn()){
            ctx.setRenderMode(prevRender);
            return putTimingCells(ctx, direction, index, overwrite, { stepEnabled: false, currentRun: runToken });
          }
          const bit = (row % 2 === 1) ? 1 : 0;
          const canDraw = canWriteTimingCell(row, pos);
          if(canDraw){
            window.updateCell(row, pos, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
          }
          setBasePatternLookahead(buildTimingLookahead(dirVal, row));
          updateCursorSafe(runToken, ctx, row, pos, resolveStepDir(dirVal));
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
