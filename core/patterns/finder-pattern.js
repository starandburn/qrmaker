/**
 * [役割] Finder pattern drawing
 * [入力] ctx, runToken, functional options, helpers
 * [副作用] board cell updates, cursor moves, renderMode changes
 * [中断] prefer executionControl.shouldAbort, fallback to runToken !== ctx.runId
 * [非対象] data placement, mask, UI, URL, history
 * [公開] window.finderPattern: putFinderCells, drawFinderPatterns
 */
(function(global){
  if(!global) return;

  const ensureHelpers = (ctx) => (ctx && ctx.helpers) ? ctx.helpers : {};
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

  /** Draws a single finder block with step/abort awareness. */
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
    const coreCoords = spiralCoordinates(7, 7, baseRow, baseCol);
    const borderCoords = spiralCoordinates(9, 9, baseRow - 1, baseCol - 1);
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
      const ringTop = baseRow - 1;
      const ringBottom = baseRow + 7;
      const ringLeft = baseCol - 1;
      const ringRight = baseCol + 7;
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
      return H.stepDelayAbort
        ? H.stepDelayAbort(runToken, { scale: PATTERN_STEP_SCALE })
        : Promise.resolve();
    };
      const drawStep = async () => {
        for(let idx = 0; idx < coreCoords.length; idx++){
          const [row, col] = coreCoords[idx];
          const [nextRow, nextCol] = coreCoords[idx + 1] || [row, col];
          if(shouldAbort()) return false;
          if(!stepActive()) return finishSync();
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const relRow = row - baseRow;
          const relCol = col - baseCol;
          const bit = pattern[relRow][relCol];
          const canDraw = shouldDrawCell(row, col);
          if(canDraw){
            window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          }
          updateCursorSafe(row, col, resolveStepDir(row, col, nextRow, nextCol));
          lastCursorRow = row;
          lastCursorCol = col;
          await delay();
        }
      const ringTop = baseRow - 1;
      const ringBottom = baseRow + 7;
      const ringLeft = baseCol - 1;
      const ringRight = baseCol + 7;
        for(let idx = 0; idx < borderCoords.length; idx++){
          const [row, col] = borderCoords[idx];
          const [nextRow, nextCol] = borderCoords[idx + 1] || [row, col];
          if(shouldAbort()) return false;
          if(!stepActive()) return finishSync();
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const isBorder = row === ringTop || row === ringBottom || col === ringLeft || col === ringRight;
          if(!isBorder) continue;
          const canDraw = shouldDrawCell(row, col);
          if(canDraw){
            window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, false));
          }
          updateCursorSafe(row, col, resolveStepDir(row, col, nextRow, nextCol));
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

