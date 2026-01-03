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
      runWithCoordinator,
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
    const normalizeResult = (abortedFlag, stepEndedFlag) => ({
      ok: !abortedFlag,
      aborted: abortedFlag,
      stepEnded: Boolean(stepEndedFlag),
    });
    if(!runIdAccessor || !stepFillAccessor || typeof runUserCode !== "function" || typeof runWithCoordinator !== "function"){
      return normalizeResult(false, false);
    }
    const runResult = await runWithCoordinator({
      runIdAccessor,
      stepFillAccessor,
      sleep,
      setRenderMode,
      renderModeImmediate,
    }, async (currentRun) => {
      let aborted = false;
      let stepEnded = false;
      const result = () => normalizeResult(aborted, stepEnded);
      try{
        // --- User code execution ---
        const userOk = await runUserCode();
        if(!userOk){
          aborted = true;
          return result();
        }
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
          return result();
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
          return result();
        }
        if(placementResult && typeof placementResult.stepEnded === "boolean"){
          stepEnabled = !placementResult.stepEnded;
          stepEnded = placementResult.stepEnded;
        }
        if(currentRun === runIdAccessor.get() && !stepEnabled){
          requestRender("runGenerateLegacy");
        }
        if(currentRun === runIdAccessor.get() && Array.isArray(global.toggleInputs)){
          // do not auto-clear toggles; user can use 全解除 as needed
        }
        return result();
      }catch(err){
        if(err === global.ABORT_ERR){
          aborted = true;
          return result();
        }
        throw err;
      }
    });
    return runResult ?? normalizeResult(false, false);
  };

  global.qrBuildService = Object.assign(global.qrBuildService || {}, {
    generateQr,
  });
})(typeof window !== "undefined" ? window : globalThis);
