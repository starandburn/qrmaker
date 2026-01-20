// ui/ui-state.js
(function(global){
  if(!global) return;
  if(typeof global.createUiState === "function") return;

  function createUiState(){
    const state = {
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
    };
    return state;
  }

  global.createUiState = createUiState;
})(typeof window !== "undefined" ? window : globalThis);
