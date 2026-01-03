(function(global){
  if(!global) return;

  const generateQr = async (deps = {}) => {
    // Control dependencies
    const {
      runIdAccessor,
      stepFillAccessor,
      runUserCode,
      isStepModeOn,
      stepSkipFunctions,
    } = deps;
    // Rendering dependencies
    const {
      setRenderMode,
      drawBasePatterns,
      drawBasePatternsStepped,
      buildFunctionSet,
      buildBitSequence,
    } = deps;
    // Cursor / board helpers
    const {
      updateCursor,
      moveCursor,
      getStepDelay,
      sleep,
      requestRender,
    } = deps;
    // Environment constants
    const {
      renderModeImmediate,
      renderModeBuffered,
      directionUp,
      directionDown,
    } = deps;
    if(!runIdAccessor || !stepFillAccessor || typeof runUserCode !== "function") return;
    // --- Run control / cancellation ---
    // TODO(step10): hoist run/abort guard to a run coordinator helper
    const requestedRun = runIdAccessor.increment();
    if(stepFillAccessor.get()){
      const start = Date.now();
      while(stepFillAccessor.get() && Date.now() - start < 2000){
        await sleep(10);
      }
    }
    stepFillAccessor.set(true);
    const currentRun = runIdAccessor.set(requestedRun);
    let aborted = false;
    // --- User code execution ---
    try{
      const userOk = await runUserCode();
      if(!userOk){ aborted = true; return; }
      let stepEnabled = isStepModeOn();
      const skipFunctions = stepEnabled && stepSkipFunctions && stepSkipFunctions.checked;
      // --- Base pattern drawing ---
      // TODO(step11): extract base pattern sequencing to drawBasePatternsService
      setRenderMode(stepEnabled ? renderModeImmediate : renderModeBuffered);
      if(stepEnabled && skipFunctions){
        const ok = await drawBasePatterns({ deferFlush: false, currentRun });
        if(currentRun !== runIdAccessor.get() || !ok){ aborted = true; return; }
        setRenderMode(renderModeImmediate);
      }else if(stepEnabled){
        const res = await drawBasePatternsStepped({ currentRun });
        if(res && res.fastForwarded){
          // already finished function patterns quickly
        }else if(currentRun !== runIdAccessor.get() || (res && res.ok === false)){ aborted = true; return; }
      }else{
        const ok = await drawBasePatterns({ deferFlush: false, currentRun });
        if(currentRun !== runIdAccessor.get() || !ok){ aborted = true; return; }
      }
      stepEnabled = isStepModeOn();
      setRenderMode(stepEnabled ? renderModeImmediate : renderModeBuffered);
      // --- Data bit preparation ---
      // TODO(step12): move bit sequence construction to a builder helper
      const funcSet = buildFunctionSet();
      const bitsSeq = buildBitSequence();
      updateCursor(25, 25, directionUp);
      let bitIdx = 0;
      let col = 25;
      let upward = true;
      let startRow = 25;
      while(col > 0 && bitIdx < bitsSeq.length){
        if(currentRun !== runIdAccessor.get()){ aborted = true; break; }
        if(global.timingColIndex > 0 && col === global.timingColIndex){ col--; continue; }
        const colLeft = col - 1;
        for(let i = 0; i < 25 && bitIdx < bitsSeq.length; i++){
          if(currentRun !== runIdAccessor.get()){ aborted = true; break; }
          const row = (() => {
            if(upward){
              const r = startRow - i;
              return r >= 1 ? r : 25 + r;
            }else{
              const r = startRow + i;
              return r <= 25 ? r : r - 25;
            }
          })();
          updateCursor(global.cursorPos.row, global.cursorPos.col, upward ? directionUp : directionDown);
          for(const cTarget of [col, colLeft]){
            if(bitIdx >= bitsSeq.length) break;
            if(cTarget < 1) continue;
            if(global.timingColIndex > 0 && cTarget === global.timingColIndex) continue;
            if(cTarget < 1 || cTarget > 25) continue;
            const moved = moveCursor(row, cTarget);
            if(!moved) continue;
            if(!global.isEmpty()) continue;
            const { bit, kind } = bitsSeq[bitIdx];
            const encoded = global.encodeBit(kind, bit === 1);
            global.updateCell(global.cursorPos.row, global.cursorPos.col, encoded);
            bitIdx++;
            if(currentRun !== runIdAccessor.get()){ aborted = true; break; }
            if(stepEnabled){
              const delay = getStepDelay();
              await sleep(Math.max(0, delay));
              if(currentRun !== runIdAccessor.get()){ aborted = true; break; }
              if(!isStepModeOn()){
                stepEnabled = false;
                setRenderMode(renderModeBuffered);
              }
            }
          }
        }
        upward = !upward;
        startRow = upward ? 25 : 1;
        col -= 2;
      }
      // --- Data placement loop ---
      // TODO(step13): break out placement loop into placeDataBits handler
      if(currentRun === runIdAccessor.get() && !stepEnabled){
        requestRender("runGenerateLegacy");
      }
      if(currentRun === runIdAccessor.get() && Array.isArray(global.toggleInputs)){
        // do not auto-clear toggles; user can use 全解除 as needed
      }
    }catch(err){
      if(err === global.ABORT_ERR){
        aborted = true;
        return;
      }
      throw err;
    }finally{
      // --- Final render / cleanup ---
      stepFillAccessor.set(false);
      setRenderMode(renderModeImmediate);
    }
  };

  global.qrBuildService = Object.assign(global.qrBuildService || {}, {
    generateQr,
  });
})(typeof window !== "undefined" ? window : globalThis);
