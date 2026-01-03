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
    if(!ctx) return false;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const shouldAbort = () => runToken !== ctx.runId;
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
      if(runToken !== ctx.runId) return false;
      return updateCursor(row, col, dir);
    };
    let lastCursorRow = null;
    let lastCursorCol = null;
    const drawSync = () => {
      for(let r = 0; r < 7; r++){
        for(let c = 0; c < 7; c++){
          const row = baseRow + r;
          const col = baseCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          lastCursorRow = row;
          lastCursorCol = col;
        }
      }
      const sRow = baseRow - 1;
      const eRow = baseRow + 7;
      const sCol = baseCol - 1;
      const eCol = baseCol + 7;
      for(let r = sRow; r <= eRow; r++){
        for(let c = sCol; c <= eCol; c++){
          const insideCore = r >= baseRow && r < baseRow + 7 && c >= baseCol && c < baseCol + 7;
          if(insideCore) continue;
          if(r < 1 || r > 25 || c < 1 || c > 25) continue;
          if(r === sRow || r === eRow || c === sCol || c === eCol){
            if(!shouldDrawCell(r, c)) continue;
            window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
            lastCursorRow = r;
            lastCursorCol = c;
          }
        }
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
    const stepActive = () => H.shouldStepFunctions ? H.shouldStepFunctions() : false;
    const delay = async () => {
      return H.stepDelayAbort ? H.stepDelayAbort(runToken) : Promise.resolve();
    };
    const drawStep = async () => {
      for(let r = 0; r < 7; r++){
        for(let c = 0; c < 7; c++){
          if(shouldAbort()) return false;
          if(!stepActive()) return finishSync();
          const row = baseRow + r;
          const col = baseCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          updateCursorSafe(row, col, DIR_RIGHT);
          lastCursorRow = row;
          lastCursorCol = col;
          await delay();
        }
      }
      const sRow = baseRow - 1;
      const eRow = baseRow + 7;
      const sCol = baseCol - 1;
      const eCol = baseCol + 7;
      for(let r = sRow; r <= eRow; r++){
        for(let c = sCol; c <= eCol; c++){
          if(shouldAbort()) return false;
          if(!stepActive()) return finishSync();
          const insideCore = r >= baseRow && r < baseRow + 7 && c >= baseCol && c < baseCol + 7;
          if(insideCore) continue;
          if(r < 1 || r > 25 || c < 1 || c > 25) continue;
          if(r === sRow || r === eRow || c === sCol || c === eCol){
            if(!shouldDrawCell(r, c)) continue;
            window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
            updateCursorSafe(r, c, DIR_RIGHT);
            lastCursorRow = r;
            lastCursorCol = c;
            await delay();
          }
        }
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

  async function putDarkModuleCells(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return true;
    const H = ensureHelpers(ctx);
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const step = !!resolvedStep;
    const baseRow = cursorPos.row;
    const baseCol = cursorPos.col;
    if(!shouldPlaceCell(baseRow, baseCol, overwrite !== false)) return true;
    if(!step){
      if(typeof window.updateCell === "function"){
        window.updateCell(baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
      }
      return true;
    }
    const delay = async () => {
      return H.stepDelayAbort ? H.stepDelayAbort(runToken) : Promise.resolve();
    };
    if(runToken !== ctx.runId) return false;
    ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
    if(typeof window.updateCell === "function"){
      window.updateCell(baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
    }
    if(H.updateCursorIfRun){
      H.updateCursorIfRun(runToken, baseRow, baseCol, DIR_RIGHT);
    }
    await delay();
    return true;
  }

  async function drawDarkModulePatterns(ctx, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    updateCursor(18, 9, DIR_RIGHT);
    await putDarkModuleCells(ctx, overwrite, opts);
    return true;
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
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const opts = { stepEnabled: resolvedStep, currentRun };
    await putTimingCells(ctx, TIMING_HORIZONTAL, TIMING_ROW, overwrite, opts);
    await putTimingCells(ctx, TIMING_VERTICAL, TIMING_COL, overwrite, opts);
    return true;
  }

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
    const stepActive = () => (H.shouldStepFunctions ? H.shouldStepFunctions() : false) && runToken === ctx.runId;
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
    if(!ctx) return false;
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(ctx, overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : ctx.runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    updateCursor(19, 19, DIR_RIGHT);
    await putAlignmentCells(ctx, overwrite, opts);
    return true;
  }

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
        }
      }
      hasFormatPattern = true;
      ctx.requestRender("putFormatCells");
      ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
      return true;
    }
    const delay = async () => {
      return H.stepDelayAbort ? H.stepDelayAbort(runToken) : Promise.resolve();
    };
    const prevRender = ctx.renderMode;
    ctx.setRenderMode(ctx.RENDER_IMMEDIATE);
    for(let i = 0; i < coordsArr.length && i < 15; i++){
      if(runToken !== ctx.runId) return false;
      if(H.shouldStepFunctions && !H.shouldStepFunctions()){
        return putFormatCells(ctx, bits15, coords, overwrite, { stepEnabled: false, currentRun: runToken });
      }
      const bit = (bits15 >>> i) & 1;
      const [r1, c1] = coordsArr[i];
      const row = r1 + 1;
      const col = c1 + 1;
      if(!shouldDrawCell(row, col)) continue;
      if(typeof window.updateCell === "function"){
        const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
        window.updateCell(row, col, enc);
      }
      if(H.updateCursorIfRun){
        H.updateCursorIfRun(runToken, row, col, DIR_RIGHT);
      }
      await delay();
    }
    hasFormatPattern = true;
    ctx.setRenderMode(prevRender);
    return true;
  }

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
      : 0;
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
