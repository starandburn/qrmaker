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
    const {
      drawBasePatternsService,
      prepareDataBits,
      placeDataBits,
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
      const basePatternResult = await drawBasePatternsService({
        isStepModeOn,
        stepSkipFunctions,
        setRenderMode,
        drawBasePatterns,
        drawBasePatternsStepped,
        renderModeImmediate,
        renderModeBuffered,
        currentRun,
        runIdAccessor,
      });
      if(basePatternResult && basePatternResult.shouldAbort){
        aborted = true;
        return;
      }
      stepEnabled = isStepModeOn();
      setRenderMode(stepEnabled ? renderModeImmediate : renderModeBuffered);
      // --- Data bit preparation ---
      // TODO(step12): move bit sequence construction to a builder helper
      const { funcSet, bitsSeq } = prepareDataBits({
        buildFunctionSet,
        buildBitSequence,
        updateCursor,
        directionUp,
      });
      // --- Data placement loop ---
      const placementResult = await placeDataBits({
        bitsSeq,
        updateCursor,
        moveCursor,
        getStepDelay,
        sleep,
        isStepModeOn,
        setRenderMode,
        renderModeBuffered,
        renderModeImmediate,
        requestRender,
        directionUp,
        directionDown,
        runIdAccessor,
        currentRun,
        cursorPos: global.cursorPos,
        encodeBit: global.encodeBit,
        updateCell: global.updateCell,
        isEmpty: global.isEmpty,
        getTimingColIndex: () => global.timingColIndex,
        stepEnabled,
      });
      if(placementResult && placementResult.aborted){
        aborted = true;
        return;
      }
      if(placementResult && typeof placementResult.stepEnded === "boolean"){
        stepEnabled = !placementResult.stepEnded;
      }
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
