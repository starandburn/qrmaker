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

  global.qrLegacyDrawers = Object.assign(global.qrLegacyDrawers || {}, {
    applyMask,
  });
})(typeof window !== "undefined" ? window : globalThis);
