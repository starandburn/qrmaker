// ui/ui-state.js
(function(global){
  if(!global) return;
  if(typeof global.createUiState === "function") return;

  // createUiState は uiState を生成する唯一のエントリとして扱い、依存モジュールはこれを必ず呼び出す前提です。
  // 今のところ runId/maskRunId/isStepFillRunning を含む状態オブジェクトを一元的に初期化します。
  // ※このコメントを残すことでロード順の問題があれば即座に検出しやすくします。

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
