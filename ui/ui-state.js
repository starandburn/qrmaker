// ui/ui-state.js
(function(global){
  if(!global) return;
  if(typeof global.createUiState === "function") return;

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
    return state;
  }

  global.createUiState = createUiState;
})(typeof window !== "undefined" ? window : globalThis);
