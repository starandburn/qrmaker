/**
 * [役割] Alignment pattern drawing
 * [入力] ctx, runToken, helpers
 * [副作用] writes 5x5 alignment cells, cursor updates when stepping
 * [中断] prefer executionControl.shouldAbort, fallback to runToken !== ctx.runId
 * [非対象] data placement, mask, UI, URL, history
 * [公開] window.alignmentPattern: putAlignmentCells, drawAlignmentPatterns
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

  /** Draws alignment square, respecting step/abort helpers. */
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
    const patternCoords = spiralCoordinates(5, 5, startRow, startCol);
    if(!step){
      const prevRender = ctx.renderMode;
      ctx.setRenderMode(ctx.RENDER_BUFFERED);
      for(const [row, col] of patternCoords){
        if(row < 1 || row > 25 || col < 1 || col > 25) continue;
        const relRow = row - startRow;
        const relCol = col - startCol;
        const bit = pattern[relRow][relCol];
        if(!shouldDrawCell(row, col)) continue;
        window.updateCell(row, col, window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1));
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
      return H.stepDelayAbort
        ? H.stepDelayAbort(runToken, { scale: PATTERN_STEP_SCALE })
        : Promise.resolve();
    };
    return (async () => {
      const prevRender = ctx.renderMode;
      ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
      for(let idx = 0; idx < patternCoords.length; idx++){
        const [row, col] = patternCoords[idx];
        const [nextRow, nextCol] = patternCoords[idx + 1] || [row, col];
        const stepDir = resolveStepDir(row, col, nextRow, nextCol);
        if(shouldAbort(runToken, ctx)) return false;
        if(!stepActive()){
          ctx.setRenderMode(prevRender);
          return putAlignmentCells(ctx, overwrite, { stepEnabled: false, currentRun: runToken });
        }
        if(row < 1 || row > 25 || col < 1 || col > 25) continue;
        const relRow = row - startRow;
        const relCol = col - startCol;
        const bit = pattern[relRow][relCol];
        const canDraw = shouldDrawCell(row, col);
        if(canDraw){
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1));
        }
        if(H.updateCursorIfRun){
          H.updateCursorIfRun(runToken, row, col, stepDir);
        }
        updateCursorSafe(runToken, ctx, row, col, stepDir);
        await delay();
      }
      ctx.setRenderMode(prevRender);
      return true;
    })();
  }

  /** Positions cursor and runs putAlignmentCells for each alignment location. */
  async function drawAlignmentPatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    /*
     * [前提] Alignment base is fixed at (19,19) on the 25x25 board used here.
     * [理由] QR version and teaching setup use the lower-right finder corner as anchor.
     * [影響] Any board resizing or version change would misplace this updateCursor call.
     * [将来] Derive center positions from ctx metadata instead of hard-coding.
     */
    updateCursor(19, 19, DIR_RIGHT);
    await putAlignmentCells(ctx, overwrite, opts);
    return true;
  }

  global.alignmentPattern = Object.assign(global.alignmentPattern || {}, {
    putAlignmentCells,
    drawAlignmentPatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
