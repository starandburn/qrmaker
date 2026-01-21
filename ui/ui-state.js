// ui/ui-state.js
(function(global){
  if(!global) return;
  if(typeof global.createUiState === "function") return;

  function createUiState(){
    const state = {
      inputLockToken: 0,
      runId: 0,
      maskRunId: 0,
      isStepFillRunning: false,
      setInputLockToken(value){
        state.inputLockToken = value;
      },
      clearInputLockToken(){
        state.inputLockToken = 0;
      },
      hasInputLockToken(){
        return state.inputLockToken !== 0;
      },
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
