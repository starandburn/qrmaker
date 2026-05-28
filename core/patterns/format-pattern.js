/**
 * [Purpose] Format pattern drawing (format bits)
 * [Inputs] ctx, runToken, coords, helpers
 * [Outputs] draws format info cells, updates cursor when stepping
 * [Abort] executionControl.shouldAbort only
 * [Exports] window.formatPattern: putFormatCells, drawFormatPatterns
 * [Exports] window.formatPattern: putFormatCells, drawFormatPatterns
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
  const requireMessage = "pattern-common.js must be loaded before format-pattern.js.";
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
  const resolveStepDir = (fromRow, fromCol, toRow, toCol) => {
    if(toRow < fromRow) return DIR_UP;
    if(toRow > fromRow) return DIR_DOWN;
    if(toCol < fromCol) return DIR_LEFT;
    if(toCol > fromCol) return DIR_RIGHT;
    return DIR_RIGHT;
  };

  const DEFAULT_FORMAT_BOARD_SIZE = 25;
  const FORMAT_DEFAULT_BITS = 0xffff;
  const FORMAT_COORDS_SIDE_0 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7],
    [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const normalizeBoardSize = (value) => {
    const numeric = Number(value);
    if(Number.isFinite(numeric)){
      const truncated = Math.trunc(numeric);
      if(truncated > 0){
        return truncated;
      }
    }
    return DEFAULT_FORMAT_BOARD_SIZE;
  };
  const buildFormatCoordsSide1 = (boardSize) => {
    const size = normalizeBoardSize(boardSize);
    const coords = [];
    for(let offset = 1; offset <= 8; offset++){
      coords.push([8, size - offset]);
    }
    for(let row = size - 7; row <= size - 1; row++){
      coords.push([row, 8]);
    }
    return coords;
  };
  const FORMAT_COORDS_SIDE_1 = buildFormatCoordsSide1(DEFAULT_FORMAT_BOARD_SIZE);
  const cloneCoords = (coords) => coords.map(([row, col]) => [row, col]);
  const resolveFormatBoardSize = (ctx) => {
    if(ctx && Array.isArray(ctx.boardMatrix) && ctx.boardMatrix.length > 0){
      return normalizeBoardSize(ctx.boardMatrix.length);
    }
    return DEFAULT_FORMAT_BOARD_SIZE;
  };
  const getFormatCoords = (side, boardSize = DEFAULT_FORMAT_BOARD_SIZE) => {
    const normalizedSide = (side === 1) ? 1 : 0;
    if(normalizedSide === 1){
      return buildFormatCoordsSide1(boardSize);
    }
    return cloneCoords(FORMAT_COORDS_SIDE_0);
  };
  const computeFormatBits = (ctx, maskIndex) => {
    if(!ctx){
      return FORMAT_DEFAULT_BITS;
    }
    if(maskIndex === null || maskIndex === undefined){
      return FORMAT_DEFAULT_BITS;
    }
    const numeric = Number(maskIndex);
    const idx = Number.isFinite(numeric) ? Math.trunc(numeric) : null;
    if(idx === null){
      return 0;
    }
    if(idx < 0 || idx > 7){
      return 0;
    }
    if(ctx.FORMAT_L && Number.isFinite(ctx.FORMAT_L[idx])){
      return ctx.FORMAT_L[idx];
    }
    return FORMAT_DEFAULT_BITS;
  };
  const renderFormatSide = (ctx, side, bits15, overwriteOrOpts = false, currentRunOrOpts, stepEnabled) => {
    const boardSize = resolveFormatBoardSize(ctx);
    const coords = getFormatCoords(side, boardSize);
    return putFormatCells(ctx, bits15, coords, overwriteOrOpts, currentRunOrOpts, stepEnabled);
  };

  /** Writes format bits over provided coordinates, honoring steps and aborts. */
  async function putFormatCells(ctx, bits15, coords, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const step = !!resolvedStep;
    const coordsArr = Array.isArray(coords) ? coords : [];
    const allowOverwrite = overwrite !== false;
    const shouldDrawCell = (row, col) => shouldPlaceCell(row, col, allowOverwrite);
    if(!step){
      ctx.setRenderMode(ctx.RENDER_BUFFERED);
      for(let i = 0; i < coordsArr.length && i < 15; i++){
        const bit = (bits15 >>> i) & 1;
        const [r1, c1] = coordsArr[i];
        const row = r1 + 1;
        const col = c1 + 1;
        if(!shouldDrawCell(row, col)) continue;
      if(isFunction(window.updateCell)){
        const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
        callIfFunction(window.updateCell, row, col, enc);
        if(isFunction(window.animateCellPlacement)){
          callIfFunction(window.animateCellPlacement, row, col, BIT_FUNC_FORMAT);
        }
      }
      }
      ctx.requestRender("putFormatCells");
      ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
      return true;
    }
    const delay = async () => {
      return H.stepDelayAbort
        ? H.stepDelayAbort(runToken, { scale: PATTERN_STEP_SCALE })
        : Promise.resolve();
    };
    const buildLookahead = (startIdx) => {
      const infos = [];
      for(let i = 1; i <= 4; i++){
        const idx = startIdx + i;
        if(idx >= coordsArr.length || idx >= 15) break;
        const bit = (bits15 >>> idx) & 1;
        infos.push({ kind: BIT_FUNC_FORMAT, bit });
      }
      return infos;
    };
    const prevRender = ctx.renderMode;
    ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
    for(let i = 0; i < coordsArr.length && i < 15; i++){
      if(shouldAbort(runToken, ctx)) return false;
      if(H.shouldStepFunctions && !H.shouldStepFunctions()){
        return putFormatCells(ctx, bits15, coords, overwrite, { stepEnabled: false, currentRun: runToken });
      }
      const bit = (bits15 >>> i) & 1;
      const [r1, c1] = coordsArr[i];
      const next = coordsArr[i + 1] || [r1, c1];
      const [nextR, nextC] = next;
      const row = r1 + 1;
      const col = c1 + 1;
      const nextRow = nextR + 1;
      const nextCol = nextC + 1;
      const stepDir = resolveStepDir(row, col, nextRow, nextCol);
      const canDraw = shouldDrawCell(row, col);
      if(canDraw && isFunction(window.updateCell)){
        const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
        callIfFunction(window.updateCell, row, col, enc);
        if(isFunction(window.animateCellPlacement)){
          callIfFunction(window.animateCellPlacement, row, col, BIT_FUNC_FORMAT);
        }
      }
      setBasePatternLookahead(buildLookahead(i));
      updateCursorSafe(runToken, ctx, row, col, stepDir);
      await delay();
    }
    ctx.setRenderMode(prevRender);
    return true;
  }

  /** Draws both format regions through the shared helpers. */
  async function drawFormatPatterns(ctx, mask, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const bits15 = computeFormatBits(ctx, mask);
    const opts = { stepEnabled: resolvedStep, currentRun: runToken };
    await renderFormatSide(ctx, 0, bits15, overwrite, opts);
    await renderFormatSide(ctx, 1, bits15, overwrite, opts);
    return true;
  }

  global.formatPattern = Object.assign(global.formatPattern || {}, {
    FORMAT_COORDS_SIDE_0,
    FORMAT_COORDS_SIDE_1,
    FORMAT_DEFAULT_BITS,
    computeFormatBits,
    getFormatCoords,
    renderFormatSide,
    putFormatCells,
    drawFormatPatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
