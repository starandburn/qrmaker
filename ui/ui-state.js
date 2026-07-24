// ui/ui-state.js
(function(global){
  if(!global) return;
  if(typeof global.createUiState === "function") return;

  // createUiState owns runId/maskRunId/isStepFillRunning and exposes safe accessors.
  // Keep these counters centralized to avoid state drift across modules.
  // Keep this module as the single source of truth for UI execution counters.

  function createUiState(){
    const state = {
      // UI input state
      inputLockToken: 0,
      setInputLockToken(value){
        state.inputLockToken = value;
      },
      clearInputLockToken(){
        state.inputLockToken = 0;
      },
      hasInputLockToken(){
        return state.inputLockToken !== 0;
      },
      // Execution state
      runId: 0,
      getRunId(){
        return state.runId;
      },
      setRunId(value){
        state.runId = value;
        return state.runId;
      },
      incrementRunId(){
        state.runId += 1;
        return state.runId;
      },
      maskRunId: 0,
      getMaskRunId(){
        return state.maskRunId;
      },
      setMaskRunId(value){
        state.maskRunId = value;
        return state.maskRunId;
      },
      incrementMaskRunId(){
        state.maskRunId += 1;
        return state.maskRunId;
      },
      isStepFillRunning: false,
      getIsStepFillRunning(){
        return state.isStepFillRunning;
      },
      setIsStepFillRunning(value){
        state.isStepFillRunning = value;
        return state.isStepFillRunning;
      },
    };
    state.stopAllRuns = () => {
      state.incrementRunId();
      state.incrementMaskRunId();
      state.setIsStepFillRunning(false);
    };
    state.invalidateRun = () => state.incrementRunId();
    state.invalidateMaskRun = () => state.incrementMaskRunId();
    state.setStepFillRunning = (value) => state.setIsStepFillRunning(value);
    return state;
  }

  global.createUiState = createUiState;
})(typeof window !== "undefined" ? window : globalThis);
