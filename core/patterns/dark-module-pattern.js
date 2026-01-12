/**
 * [役割] Dark module pattern drawing (fixed module)
 * [入力] ctx, runToken, helpers
 * [副作用] sets dark module cell, updates cursor in steps
 * [中断] prefer executionControl.shouldAbort, fallback to runToken !== ctx.runId
 * [非対象] data placement, mask, UI, URL, history
 * [公開] window.darkModulePattern: putDarkModuleCells, drawDarkModulePatterns
 */
(function(global){
  if(!global) return;
  const patternCommon = global.patternCommon;
  if(!patternCommon){
    throw new Error("pattern-common.js must be loaded before dark-module-pattern.js.");
  }
  const {
    ensureHelpers,
    resolveFunctionalOptions,
    setBasePatternLookahead,
    shouldAbort,
    updateCursorSafe,
  } = patternCommon;
  const PATTERN_STEP_SCALE = 1;

  /** Places the fixed dark module cell with optional stepping support. */
  async function putDarkModuleCells(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return true;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const step = !!resolvedStep;
    const baseRow = cursorPos.row;
    const baseCol = cursorPos.col;
    const delay = async () => {
      return H.stepDelayAbort
        ? H.stepDelayAbort(runToken, { scale: PATTERN_STEP_SCALE })
        : Promise.resolve();
    };
    const canDraw = shouldPlaceCell(baseRow, baseCol, overwrite !== false);
    if(!canDraw){
      if(!step) return true;
      if(shouldAbort(runToken, ctx)) return false;
      ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
      setBasePatternLookahead([]);
      updateCursorSafe(runToken, ctx, baseRow, baseCol, DIR_RIGHT);
      await delay();
      return true;
    }
    if(!step){
      if(typeof window.updateCell === "function"){
        window.updateCell(baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
      }
      return true;
    }
    if(shouldAbort(runToken, ctx)) return false;
    ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
    if(typeof window.updateCell === "function"){
      window.updateCell(baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
    }
    setBasePatternLookahead([]);
    updateCursorSafe(runToken, ctx, baseRow, baseCol, DIR_RIGHT);
    await delay();
    return true;
  }

  /** Calls putDarkModuleCells with resolved options to paint the single dark module. */
  async function drawDarkModulePatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const opts = { stepEnabled: resolvedStep, currentRun };
    /*
     * [前提] Dark module sits at (18,9) for the fixed 25x25 board/version.
     * [理由] QR spec mandates a single dark module near the timing patterns.
     * [影響] Changing board layout would leave this cell unchanged or mislocated.
     * [将来] Compute dark module position from ctx/version metadata instead of constants.
     */
    updateCursor(18, 9, DIR_RIGHT);
    await putDarkModuleCells(ctx, overwrite, opts);
    return true;
  }

  global.darkModulePattern = Object.assign(global.darkModulePattern || {}, {
    putDarkModuleCells,
    drawDarkModulePatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
