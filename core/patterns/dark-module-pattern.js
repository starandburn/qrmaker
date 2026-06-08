/**
 * [Purpose] Dark module pattern drawing (fixed module)
 * [Inputs] ctx, runToken, helpers
 * [Outputs] sets dark module cell, updates cursor in steps
 * [Abort] executionControl.shouldAbort only
 * [Exports] window.darkModulePattern: putDarkModuleCells, drawDarkModulePatterns
 */
(function(global){
  if(!global) return;
  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");
  const callIfFunction = typeUtils.callIfFunction || ((fn, ...args) => {
    if(isFunction(fn)){
      return fn(...args);
    }
    return undefined;
  });
  const requireMessage = "pattern-common.js must be loaded before dark-module-pattern.js.";
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
      if(isFunction(window.updateCell)){
        callIfFunction(window.updateCell, baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
      }
      return true;
    }
    if(shouldAbort(runToken, ctx)) return false;
    ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
    if(isFunction(window.updateCell)){
      callIfFunction(window.updateCell, baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
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
    const spec = typeof global.getActiveQrSpec === "function" ? global.getActiveQrSpec() : null;
    const coord = typeof global.getQrDarkModuleCoordForSpec === "function"
      ? global.getQrDarkModuleCoordForSpec(spec)
      : [(Number.isFinite(global.BOARD_ROWS) ? global.BOARD_ROWS : 25) - 7, 9];
    updateCursor(coord[0], coord[1], DIR_RIGHT);
    await putDarkModuleCells(ctx, overwrite, opts);
    return true;
  }

  global.darkModulePattern = Object.assign(global.darkModulePattern || {}, {
    putDarkModuleCells,
    drawDarkModulePatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
