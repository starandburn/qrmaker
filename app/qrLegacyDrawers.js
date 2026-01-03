const DEBUG_STEP_LOG = false;
function debugLog(...args){
  if(!DEBUG_STEP_LOG) return;
  console.log(...args);
}

(function(global){
  if(!global) return;

  const applyMask = async (ctx, maskIndex = 0) => {
    if(!ctx) return false;
    const {
      isStepModeOn,
      stepSkipFunctions,
      getStepDelay,
      setRenderMode,
      requestRender,
      drawFormatPatterns,
      resetCursor,
      MASK_FUNCTIONS,
      isFunctionalKind,
    } = ctx;
    const modeSetter = typeof setRenderMode === "function"
      ? setRenderMode
      : (mode) => {
        if(typeof window.setRenderMode === "function"){
          window.setRenderMode(mode);
        }
      };
    const baseRun = ctx.runId;
    const currentMaskRun = ++ctx.maskRunId;
    let idx = (maskIndex === undefined) ? 0 : Number(maskIndex);
    if(!Number.isFinite(idx)){
      idx = 0;
    }
    if(idx < 0 || idx > 7){
      window.logEvent("applyMask", maskIndex ?? "", "マスクインデックスが無効");
      return false;
    }
    window.logEvent("applyMask", idx, `マスク${idx}を適用`);
    const maskFn = (MASK_FUNCTIONS && typeof MASK_FUNCTIONS[idx] === "function") ? MASK_FUNCTIONS[idx] : null;
    if(!maskFn) return false;
    const stepMask = (typeof isStepModeOn === "function" ? isStepModeOn() : false)
      && !(stepSkipFunctions && stepSkipFunctions.checked);
    const prevRender = ctx.renderMode;
    const shouldAbort = () => (baseRun !== ctx.runId) || (currentMaskRun !== ctx.maskRunId);
    const updateCursorSafe = (row, col, dir = DIR_RIGHT) => {
      if(shouldAbort()) return false;
      return updateCursor(row, col, dir);
    };
    const prevCursor = { row: cursorPos.row, col: cursorPos.col, dir: cursorPos.dir };
    const maskCursorDir = stepMask ? DIR_RIGHT : prevCursor.dir;
    modeSetter(stepMask ? RENDER_IMMEDIATE : RENDER_BUFFERED);
    const maybeDelay = async () => {
      if(!stepMask) return true;
      if(shouldAbort()) return false;
      const delay = (typeof getStepDelay === "function") ? getStepDelay() : 0;
      if(delay > 0){
        await sleep(delay);
      }else{
        await new Promise(requestAnimationFrame);
      }
      return !shouldAbort();
    };
    for(let row = 1; row <= 25; row++){
      for(let col = 1; col <= 25; col++){
        if(shouldAbort()) break;
        const encoded = window.getCell(row, col);
        if(typeof encoded !== "number") continue;
        const kind = (typeof window.bitKind === "function") ? window.bitKind(encoded) : Math.abs(encoded);
        if(typeof isFunctionalKind === "function" && isFunctionalKind(kind)) continue;
        if(!maskFn(row - 1, col - 1)) continue;
        if(stepMask){
          updateCursorSafe(row, col, maskCursorDir);
        }
        invertCell(row, col);
        const ok = await maybeDelay();
        if(!ok) break;
      }
      if(shouldAbort()) break;
    }
    const completed = !shouldAbort();
    if(completed && hasFormatPattern && typeof drawFormatPatterns === "function"){
      await drawFormatPatterns(idx, true);
    }
    if(ctx.renderMode === RENDER_BUFFERED && typeof requestRender === "function"){
      requestRender("applyMask");
    }
    modeSetter(prevRender);
    if(stepMask){
      updateCursorSafe(prevCursor.row, prevCursor.col, maskCursorDir);
    }
    if(typeof resetCursor === "function"){
      resetCursor();
    }
    return completed;
  };

  async function drawBasePatterns(ctx, { deferFlush = false, currentRun, resetDelay = false } = {}){
    if(!ctx) return false;
    const {
      ABORT_ERR,
      RESET_DELAY_MS,
      RENDER_BUFFERED,
      RENDER_IMMEDIATE,
      setRenderMode,
      resetQRCode,
      resetCursor,
    } = ctx;
    const H = ctx.helpers || null;
    if(!H) return false;
    window.logEvent("drawBasePatterns", currentRun ?? "", `基本パターンを描画 (deferFlush=${deferFlush}, resetDelay=${resetDelay})`);
    if(currentRun !== undefined && currentRun !== ctx.runId) throw ABORT_ERR;
    if(H.isStepModeOn() && H.shouldStepFunctions()){
      const stepped = await drawBasePatternsStepped(ctx, { currentRun });
      return stepped ? !!stepped.ok : false;
    }
    setRenderMode(RENDER_BUFFERED);
    hasFormatPattern = false;
    resetQRCode({ abortRun: false });
    resetCursor();
    if(resetDelay){
      await H.sleep(RESET_DELAY_MS);
    }
    if(currentRun !== undefined && currentRun !== ctx.runId) throw ABORT_ERR;
    const funcOpts = { stepEnabled: false, currentRun, overwrite: false };
    await H.drawFinderPatterns(funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(currentRun !== undefined && currentRun !== ctx.runId) throw ABORT_ERR;
    await H.drawTimingPatterns(funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(currentRun !== undefined && currentRun !== ctx.runId) throw ABORT_ERR;
    await H.drawAlignmentPatterns(funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(currentRun !== undefined && currentRun !== ctx.runId) throw ABORT_ERR;
    await H.drawDarkModulePatterns(funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(currentRun !== undefined && currentRun !== ctx.runId) throw ABORT_ERR;
    await H.drawFormatPatterns(undefined, funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(!deferFlush){
      if(currentRun !== undefined && currentRun !== ctx.runId) throw ABORT_ERR;
      H.requestRender("drawBasePatterns");
      setRenderMode(RENDER_IMMEDIATE);
    }
    resetCursor();
    hasFormatPattern = true;
    return true;
  }

  async function drawBasePatternsStepped(ctx, { currentRun } = {}){
    if(!ctx) return { ok: false, fastForwarded: false };
    const {
      ABORT_ERR,
      setRenderMode,
      resetQRCode,
      stepSkipFunctions,
      MASK_FUNCTIONS,
      isFunctionalKind,
      RENDER_IMMEDIATE,
      RENDER_BUFFERED,
      FORMAT_L,
    } = ctx;
    const H = ctx.helpers || null;
    if(!H) return { ok: false, fastForwarded: false };
    window.logEvent("drawBasePatternsStepped", currentRun ?? "", "基本パターンを描画");
    const runToken = (typeof currentRun === "number") ? currentRun : ctx.runId;
    resetQRCode({ abortRun: false });
    setRenderMode(RENDER_IMMEDIATE);
    H.updateCursorIfRun(runToken, 1, 1, DIR_DOWN);
    let stepEnabled = H.isStepModeOn();
    let fastForwarded = false;
    const stepActive = () => stepEnabled && H.isStepModeOn();
    const shouldAbort = () => runToken !== ctx.runId;
    const shouldSkipFunctions = () => {
      if(runToken !== ctx.runId) return false;
      return !!(stepSkipFunctions && stepSkipFunctions.checked && H.isStepModeOn());
    };

    window.isFunctionalKind = isFunctionalKind;
    window.MASK_FUNCTIONS = MASK_FUNCTIONS;
    const maybeCursorJumpDelay = async () => {
      if(!stepActive()) return true;
      const delay = H.getStepDelay();
      if(delay > 0){
        await H.sleep(delay * 5);
      }else{
        await new Promise(H.requestAnimationFrame);
        await new Promise(H.requestAnimationFrame);
        await new Promise(H.requestAnimationFrame);
        await new Promise(H.requestAnimationFrame);
        await new Promise(H.requestAnimationFrame);
      }
      return !shouldAbort();
    };
    const maybeStepDelay = async () => {
      debugLog("maybeStepDelay enter", { runToken, stepEnabled, fastForwarded });
      if(shouldAbort()) throw ABORT_ERR;
      if(shouldSkipFunctions()){
        fastForwarded = true;
        stepEnabled = false;
        setRenderMode(RENDER_BUFFERED);
        debugLog("maybeStepDelay exit (skipped functions)", { runToken, fastForwarded });
        return true;
      }
      if(!stepActive()){
        debugLog("maybeStepDelay exit (step inactive)", { runToken });
        return true;
      }
      const delay = H.getStepDelay();
      if(delay > 0){
        await H.sleep(delay);
      }else{
        await new Promise(H.requestAnimationFrame);
      }
      if(shouldAbort()) throw ABORT_ERR;
      if(shouldSkipFunctions()){
        fastForwarded = true;
        stepEnabled = false;
        setRenderMode(RENDER_BUFFERED);
        debugLog("maybeStepDelay exit (skip after wait)", { runToken, fastForwarded });
        return true;
      }
      if(!H.isStepModeOn()){
        stepEnabled = false;
        setRenderMode(RENDER_BUFFERED);
      }
      debugLog("maybeStepDelay exit (normal)", { runToken, fastForwarded });
      return true;
    };
    let lastRow = 1;
    let lastCol = 1;
    let lastDir = DIR_DOWN;
    const moveCursorPath = async (targetRow, targetCol) => {
      if(shouldAbort()) throw ABORT_ERR;
      const dr = targetRow - lastRow;
      const dc = targetCol - lastCol;
      if(Math.abs(dr) > Math.abs(dc)){
        lastDir = dr > 0 ? DIR_DOWN : dr < 0 ? DIR_UP : lastDir;
      }else if(Math.abs(dc) > 0){
        lastDir = dc > 0 ? DIR_RIGHT : DIR_LEFT;
      }
      lastRow = targetRow;
      lastCol = targetCol;
      H.updateCursorIfRun(runToken, targetRow, targetCol, lastDir);
      if(!(await maybeCursorJumpDelay())) return false;
      return !shouldAbort();
    };
  const stepCell = (row, col, value, cellKind) => {
    if(shouldAbort()) throw ABORT_ERR;
    const kind = typeof cellKind === "number" ? cellKind : BIT_UNKNOWN;
    const encoded = window.encodeBit(kind, value === 1);
    window.updateCell(row, col, encoded);
    const dr = row - lastRow;
    const dc = col - lastCol;
    if(Math.abs(dr) > Math.abs(dc)){
      lastDir = dr > 0 ? DIR_DOWN : dr < 0 ? DIR_UP : lastDir;
    }else if(Math.abs(dc) > 0){
      lastDir = dc > 0 ? DIR_RIGHT : DIR_LEFT;
    }
      H.updateCursorIfRun(runToken, row, col, lastDir);
      lastRow = row;
      lastCol = col;
      return true;
    };

    const spiralOrder = size => {
      const coords = [];
      let top = 0, bottom = size - 1, left = 0, right = size - 1;
      while(top <= bottom && left <= right){
        for(let c = left; c <= right; c++) coords.push([top, c]);
        top++;
        for(let r = top; r <= bottom; r++) coords.push([r, right]);
        right--;
        if(top <= bottom){
          for(let c = right; c >= left; c--) coords.push([bottom, c]);
          bottom--;
        }
        if(left <= right){
          for(let r = bottom; r >= top; r--) coords.push([r, left]);
          left++;
        }
      }
      return coords;
    };

    const finderStep = await H.drawFinderPatterns(false, { currentRun: runToken, stepEnabled: stepActive() });
    if(!finderStep) return { ok: false, fastForwarded };
    if(shouldAbort()) throw ABORT_ERR;

    // timing (row 7, col 7) after finders
    {
      timingRowIndex = TIMING_ROW;
      timingColIndex = TIMING_COL;
      const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : UNPLACED_KIND;
      if((await moveCursorPath(timingRowIndex, 1)) === false) return { ok: false, fastForwarded };
      for(let c = 1; c <= 25; c++){
        if(shouldAbort()) throw ABORT_ERR;
        const existing = boardMatrix[timingRowIndex - 1][c - 1];
        const kind = (typeof window.bitKind === "function") ? window.bitKind(existing) : Math.abs(existing);
        const empty = (typeof window.isUnplacedBit === "function") ? window.isUnplacedBit(existing) : (kind === unplacedKind);
        if(!empty) continue;
        const bit = (c % 2 === 1) ? 1 : 0;
        if(typeof window.updateCell === "function"){
          window.updateCell(timingRowIndex, c, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
        stepCell(timingRowIndex, c, bit, BIT_FUNC_TIMING);
        const md = await maybeStepDelay();
        if(md === false) return { ok: false, fastForwarded };
      }
      if((await moveCursorPath(1, timingColIndex)) === false) return { ok: false, fastForwarded };
      for(let r = 1; r <= 25; r++){
        if(shouldAbort()) throw ABORT_ERR;
        const existing = boardMatrix[r - 1][timingColIndex - 1];
        const kind = (typeof window.bitKind === "function") ? window.bitKind(existing) : Math.abs(existing);
        const empty = (typeof window.isUnplacedBit === "function") ? window.isUnplacedBit(existing) : (kind === unplacedKind);
        if(!empty) continue;
        const bit = (r % 2 === 1) ? 1 : 0;
        if(typeof window.updateCell === "function"){
          window.updateCell(r, timingColIndex, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
        stepCell(r, timingColIndex, bit, BIT_FUNC_TIMING);
        const md = await maybeStepDelay();
        if(md === false) return { ok: false, fastForwarded };
      }
    }

    // alignment 5x5
    if((await moveCursorPath(19, 19)) === false) return { ok: false, fastForwarded };
    const drawAlignmentStep = async (centerRow, centerCol) => {
      const pattern = [
        [1,1,1,1,1],
        [1,0,0,0,1],
        [1,0,1,0,1],
        [1,0,0,0,1],
        [1,1,1,1,1],
      ];
      const topRow = centerRow - 2;
      const leftCol = centerCol - 2;
      const coreSpiral = spiralOrder(5);
      for(const [r0, c0] of coreSpiral){
        if(shouldAbort()) throw ABORT_ERR;
        const row = topRow + r0;
        const col = leftCol + c0;
        if(row < 1 || row > 25 || col < 1 || col > 25) continue;
        const bit = pattern[r0][c0];
        if(typeof window.updateCell === "function"){
        const encAlign = window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1);
        window.updateCell(row, col, encAlign);
      }
        if(!stepCell(row, col, bit, BIT_FUNC_ALIGNMENT)) return;
        const md = await maybeStepDelay();
        if(md === false) return;
      }
    };
    await drawAlignmentStep(19, 19);
    if(shouldAbort()) throw ABORT_ERR;

    // dark module
    if((await moveCursorPath(18, 9)) === false) return { ok: false, fastForwarded };
    if(shouldAbort()) throw ABORT_ERR;
    if(typeof window.updateCell === "function"){
      window.updateCell(18, 9, window.encodeBit(BIT_FUNC_DARK, true));
    }
    if(!stepCell(18, 9, 1, BIT_FUNC_DARK)) return { ok: false, fastForwarded };
    const mdDark = await maybeStepDelay();
    if(mdDark === false) return { ok: false, fastForwarded };

    // format info (two copies)
    const coordsA = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],
      [8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
    ];
    const n = 25;
    const coordsB = [
      [8,n-1],[8,n-2],[8,n-3],[8,n-4],[8,n-5],[8,n-6],[8,n-7],[8,n-8],
      [n-7,8],[n-6,8],[n-5,8],[n-4,8],[n-3,8],[n-2,8],[n-1,8],
    ];
    const bits15 = 0;
    console.log("drawBasePatterns -> drawFormatPatterns(undefined)", { currentRun, bits15 });
    const drawFormatSide = async (coords, side) => {
      for(let i = 0; i < 15; i++){
        if(shouldAbort()) throw ABORT_ERR;
        const bit = (bits15 >>> i) & 1;
        const [r, c] = coords[i];
        debugLog("drawFormatSide", { side, i, row: r + 1, col: c + 1 });
        if(typeof window.updateCell === "function"){
          window.updateCell(r + 1, c + 1, window.encodeBit(BIT_FUNC_FORMAT, bit === 1));
        }
        if(!stepCell(r + 1, c + 1, bit, BIT_FUNC_FORMAT)) return false;
        const md = await maybeStepDelay();
        if(md === false) return false;
      }
      return true;
    };
    if((await moveCursorPath(coordsA[0][0] + 1, coordsA[0][1] + 1)) === false) return { ok: false, fastForwarded };
    if(!(await drawFormatSide(coordsA, "A"))) return { ok: false, fastForwarded };
    if((await moveCursorPath(coordsB[0][0] + 1, coordsB[0][1] + 1)) === false) return { ok: false, fastForwarded };
    if(!(await drawFormatSide(coordsB, "B"))) return { ok: false, fastForwarded };

    if(shouldAbort()) throw ABORT_ERR;
    await moveCursorPath(25, 25);
    hasFormatPattern = true;

    if(renderMode === RENDER_BUFFERED){
      H.requestRender("drawFormatSide");
      setRenderMode(RENDER_IMMEDIATE);
    }
    return { ok: true, fastForwarded };
  }

  const legacyPatterns = global.legacyFunctionalPatterns || {};
  global.qrLegacyDrawers = Object.assign(global.qrLegacyDrawers || {}, {
    applyMask,
    drawBasePatterns,
    drawBasePatternsStepped,
    ...legacyPatterns,
  });
})(typeof window !== "undefined" ? window : globalThis);
