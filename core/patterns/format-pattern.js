/**
 * [役割] Format pattern drawing (format bits)
 * [入力] ctx, runToken, coords, helpers
 * [副作用] draws format info cells, updates cursor when stepping
 * [中断] prefer executionControl.shouldAbort, fallback to runToken !== ctx.runId
 * [非対象] data placement, mask, UI, URL, history
 * [公開] window.formatPattern: putFormatCells, drawFormatPatterns
 */
(function(global){
  if(!global) return;

  const ensureHelpers = (ctx) => (ctx && ctx.helpers) ? ctx.helpers : {};
  const PATTERN_STEP_SCALE = 1;
  const resolveStepDir = (fromRow, fromCol, toRow, toCol) => {
    if(toRow < fromRow) return DIR_UP;
    if(toRow > fromRow) return DIR_DOWN;
    if(toCol < fromCol) return DIR_LEFT;
    if(toCol > fromCol) return DIR_RIGHT;
    return DIR_RIGHT;
  };

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
        if(typeof window.updateCell === "function"){
          const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
          window.updateCell(row, col, enc);
          if(typeof window.animateCellPlacement === "function"){
            window.animateCellPlacement(row, col, BIT_FUNC_FORMAT);
          }
        }
      }
      hasFormatPattern = true;
      ctx.requestRender("putFormatCells");
      ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
      return true;
    }
    const delay = async () => {
      return H.stepDelayAbort
        ? H.stepDelayAbort(runToken, { scale: PATTERN_STEP_SCALE })
        : Promise.resolve();
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
      if(canDraw && typeof window.updateCell === "function"){
        const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
        window.updateCell(row, col, enc);
        if(typeof window.animateCellPlacement === "function"){
          window.animateCellPlacement(row, col, BIT_FUNC_FORMAT);
        }
      }
      updateCursorSafe(runToken, ctx, row, col, stepDir);
      await delay();
    }
    hasFormatPattern = true;
    ctx.setRenderMode(prevRender);
    return true;
  }

  /** Calculates coords for both format regions and delegates to putFormatCells. */
  async function drawFormatPatterns(ctx, mask, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const maskIsSpecified = mask !== undefined;
    let idx = 0;
    if(maskIsSpecified){
      idx = Number(mask);
      if(!Number.isFinite(idx) || idx < 0 || idx > 7){
        idx = 0;
      }
    }
    const bits15 = maskIsSpecified && ctx.FORMAT_L && ctx.FORMAT_L[idx]
      ? ctx.FORMAT_L[idx]
      : 0xffff;
    /*
     * [前提] Format patterns live in the standard two 15-cell lines around the top-left & top-right corners.
     * [理由] QR format info is conventionally stored along these fixed paths on a 25x25 grid.
     * [影響] Non-standard board sizes or versioning would require recalculating these lists.
     * [将来] Derive coordinates from ctx.FORMAT_COORDS instead of hard-coded arrays.
     */
    const coordsA = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],
      [8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
    ];
    const n = 25;
    const coordsB = [
      [8,n-1],[8,n-2],[8,n-3],[8,n-4],[8,n-5],[8,n-6],[8,n-7],[8,n-8],
      [n-7,8],[n-6,8],[n-5,8],[n-4,8],[n-3,8],[n-2,8],[n-1,8],
    ];
    const opts = { stepEnabled: resolvedStep, currentRun: runToken };
    await putFormatCells(ctx, bits15, coordsA, overwrite, opts);
    await putFormatCells(ctx, bits15, coordsB, overwrite, opts);
    hasFormatPattern = true;
    return true;
  }

  global.formatPattern = Object.assign(global.formatPattern || {}, {
    putFormatCells,
    drawFormatPatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
