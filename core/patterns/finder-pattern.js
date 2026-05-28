/**
 * [Purpose] Finder pattern drawing
 * [Inputs] ctx, runToken, functional options, helpers
 * [Outputs] board cell updates, cursor moves, renderMode changes
 * [Abort] executionControl.shouldAbort only
 * [Exports] window.finderPattern: putFinderCells, drawFinderPatterns
 * [Exports] window.finderPattern: putFinderCells, drawFinderPatterns
 */
(function(global){
  if(!global) return;
  const requireMessage = "pattern-common.js must be loaded before finder-pattern.js.";
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
  const spiralCoordinates = (rows, cols, rowOffset = 0, colOffset = 0) => {
    const coords = [];
    let top = 0;
    let bottom = rows - 1;
    let left = 0;
    let right = cols - 1;
    while(top <= bottom && left <= right){
      for(let col = left; col <= right; col++){
        coords.push([top + rowOffset, col + colOffset]);
      }
      top++;
      for(let row = top; row <= bottom; row++){
        coords.push([row + rowOffset, right + colOffset]);
      }
      right--;
      if(top <= bottom){
        for(let col = right; col >= left; col--){
          coords.push([bottom + rowOffset, col + colOffset]);
        }
        bottom--;
      }
      if(left <= right){
        for(let row = bottom; row >= top; row--){
          coords.push([row + rowOffset, left + colOffset]);
        }
        left++;
      }
    }
    return coords;
  };
  const resolveStepDir = (fromRow, fromCol, toRow, toCol) => {
    if(toRow < fromRow) return DIR_UP;
    if(toRow > fromRow) return DIR_DOWN;
    if(toCol < fromCol) return DIR_LEFT;
    if(toCol > fromCol) return DIR_RIGHT;
    return DIR_RIGHT;
  };
  const PATTERN_STEP_SCALE = 1;

  /** Draws a single finder block with step/abort awareness. */
  async function putFinderCells(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
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
    let lastCursorRow = null;
    let lastCursorCol = null;
    const coreCoords = spiralCoordinates(7, 7, baseRow, baseCol);
    const borderCoords = spiralCoordinates(9, 9, baseRow - 1, baseCol - 1);
    const ringTop = baseRow - 1;
    const ringBottom = baseRow + 7;
    const ringLeft = baseCol - 1;
    const ringRight = baseCol + 7;
    const inBounds = (row, col) => row >= 1 && row <= 25 && col >= 1 && col <= 25;
    const coreSeq = coreCoords
      .filter(([row, col]) => inBounds(row, col))
      .map(([row, col]) => {
        const relRow = row - baseRow;
        const relCol = col - baseCol;
        const bit = pattern[relRow][relCol];
        return { row, col, bit };
      });
    const borderSeq = borderCoords
      .filter(([row, col]) => inBounds(row, col) && (row === ringTop || row === ringBottom || col === ringLeft || col === ringRight))
      .map(([row, col]) => ({ row, col, bit: 0 }));
    const fullSeq = coreSeq.concat(borderSeq);
    const buildLookahead = (idx) => {
      const infos = [];
      for(let i = 1; i <= 4; i++){
        const entry = fullSeq[idx + i];
        if(!entry) break;
        infos.push({ kind: BIT_FUNC_FINDER, bit: entry.bit });
      }
      return infos;
    };
    const drawSync = () => {
      for(const [row, col] of coreCoords){
        const relRow = row - baseRow;
        const relCol = col - baseCol;
        if(row < 1 || row > 25 || col < 1 || col > 25) continue;
        const bit = pattern[relRow][relCol];
        if(!shouldDrawCell(row, col)) continue;
        window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
        lastCursorRow = row;
        lastCursorCol = col;
      }
      for(const [row, col] of borderCoords){
        if(row < 1 || row > 25 || col < 1 || col > 25) continue;
        const isBorder = row === ringTop || row === ringBottom || col === ringLeft || col === ringRight;
        if(!isBorder) continue;
        if(!shouldDrawCell(row, col)) continue;
        window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, false));
        lastCursorRow = row;
        lastCursorCol = col;
      }
    };
    const finishSync = () => {
      ctx.setRenderMode(ctx.RENDER_BUFFERED);
      drawSync();
      ctx.requestRender("drawFinderPatterns");
      ctx.setRenderMode(prevRender);
      if(lastCursorRow !== null && lastCursorCol !== null){
        updateCursorSafe(runToken, ctx, lastCursorRow, lastCursorCol, DIR_RIGHT);
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
      return H.stepDelayAbort
        ? H.stepDelayAbort(runToken, { scale: PATTERN_STEP_SCALE })
        : Promise.resolve();
    };
      const drawStep = async () => {
        for(let idx = 0; idx < coreSeq.length; idx++){
          const { row, col, bit } = coreSeq[idx];
          const nextEntry = coreSeq[idx + 1] || coreSeq[idx];
          const nextRow = nextEntry.row;
          const nextCol = nextEntry.col;
          if(shouldAbort(runToken, ctx)) return false;
          if(!stepActive()) return finishSync();
          const canDraw = shouldDrawCell(row, col);
          if(canDraw){
            window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          }
          setBasePatternLookahead(buildLookahead(idx));
        updateCursorSafe(runToken, ctx, row, col, resolveStepDir(row, col, nextRow, nextCol));
          lastCursorRow = row;
          lastCursorCol = col;
          await delay();
        }
        for(let idx = 0; idx < borderSeq.length; idx++){
          const { row, col } = borderSeq[idx];
          const nextEntry = borderSeq[idx + 1] || borderSeq[idx];
          const nextRow = nextEntry.row;
          const nextCol = nextEntry.col;
          if(shouldAbort(runToken, ctx)) return false;
          if(!stepActive()) return finishSync();
          const canDraw = shouldDrawCell(row, col);
          if(canDraw){
            window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, false));
          }
          setBasePatternLookahead(buildLookahead(coreSeq.length + idx));
          updateCursorSafe(runToken, ctx, row, col, resolveStepDir(row, col, nextRow, nextCol));
          lastCursorRow = row;
          lastCursorCol = col;
          await delay();
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

  /** Moves to each corner and calls putFinderCells to place finders. */
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
