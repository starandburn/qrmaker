// app/board-reset.js
(function(global){
  if(!global) return;
  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");

  function createBoardReset(options = {}){
    const {
      boardMatrix,
      cellStates,
      boardRows,
      boardCols,
      unplacedKind,
      setTimingColIndex,
      setTimingRowIndex,
      setFormatWrittenMask,
      resetData,
      resetCursor,
      requestRender,
      clearNoiseLayer,
      setQRCodeReadable,
      setRenderMode,
      renderModeImmediate,
      ctx,
      resetSwitchStates,
      setPendingCursor,
      showApiStatus,
      sleep,
      resetDelayMs,
      logMessages = {},
    } = options;

    const logResetBoardStateMessage = logMessages.resetBoardState || "";
    const logResetQRCodeMessage = logMessages.resetQRCode || "";
    const logResetCommandMessage = logMessages.resetCommand || "";
    const logClearBoardMessage = logMessages.clearBoard || "";

    function clearBoardSurface({ resetData: resetDataFlag = true } = {}){
      setQRCodeReadable(false);
      clearNoiseLayer();
      const cells = document.querySelectorAll(".qr-cells .cell");
      if(!cells || cells.length === 0) return false;
      const unplacedValue = (typeof global.BIT_UNPLACED === "number") ? global.BIT_UNPLACED : unplacedKind;
      for(const cell of cells){
        cell.className = "cell";
        cell.dataset.debugVal = String(unplacedValue);
        cell.style.setProperty("--debug-color", "#000000");
        cell.style.setProperty("--debug-shadow", "0 0 2px #fff, 0 0 4px #fff");
      }
      cellStates.clear();
      for(let r = 0; r < boardRows; r++){
        for(let c = 0; c < boardCols; c++){
          boardMatrix[r][c] = unplacedKind;
        }
      }
      callIfFunction(setTimingRowIndex, 0);
      if(!isFunction(setTimingColIndex)){
        throw new Error("setTimingColIndex is required");
      }
      setTimingColIndex(0);
      callIfFunction(setFormatWrittenMask, 0);
      if(resetDataFlag){
        callIfFunction(resetData);
      }
      callIfFunction(resetSwitchStates);
      return true;
    }

    function clearBoard(){
      global.logEvent("clearBoard", "", logClearBoardMessage);
      clearNoiseLayer();
      return clearBoardSurface();
    }

    function resetBoardState(options = {}){
      const {
        abortRun = true,
        forceImmediate = abortRun,
        stopStep = abortRun,
        resetData: resetDataFlag = true,
      } = options;
      global.logEvent("resetQRCode", `abort=${abortRun},forceImmediate=${forceImmediate},stopStep=${stopStep}`, logResetBoardStateMessage);
      if(abortRun){
        ctx.runId++;
        ctx.maskRunId++;
      }
      if(stopStep){
        ctx.isStepFillRunning = false;
      }
      if(forceImmediate){
        setRenderMode(renderModeImmediate);
      }
      if(!clearBoardSurface({ resetData: resetDataFlag })){
        return;
      }
      resetCursor();
      callIfFunction(setPendingCursor, null);
      requestRender("resetBoardState");
      if(isFunction(requestAnimationFrame)){
        return {
          then: (resolve, _reject) => {
            const waitFrame = () => new Promise((frameResolve) => {
              let done = false;
              const finish = () => {
                if(done) return;
                done = true;
                frameResolve(true);
              };
              requestAnimationFrame(finish);
              setTimeout(finish, 50);
            });
            waitFrame().then(() => waitFrame().then(() => resolve(true)));
          },
          catch: () => {},
          valueOf: () => true,
          toString: () => "true",
        };
      }
    }

    function resetQRCode(){
      global.logEvent("resetQRCode", "", logResetQRCodeMessage);
      if(!clearBoardSurface()){
        return false;
      }
      resetCursor();
      callIfFunction(setPendingCursor, null);
      requestRender("resetQRCode");
      if(isFunction(requestAnimationFrame)){
        return {
          then: (resolve, _reject) => {
            const waitFrame = () => new Promise((frameResolve) => {
              let done = false;
              const finish = () => {
                if(done) return;
                done = true;
                frameResolve(true);
              };
              requestAnimationFrame(finish);
              setTimeout(finish, 50);
            });
            waitFrame().then(() => waitFrame().then(() => resolve(true)));
          },
          catch: () => {},
          valueOf: () => true,
          toString: () => "true",
        };
      }
      return true;
    }

    async function resetCommand(options = {}){
      global.logEvent("resetCommand", "", logResetCommandMessage);
      showApiStatus("resetCommand");
      resetBoardState(options);
      callIfFunction(resetSwitchStates);
      requestRender("resetCommand");
      if(isFunction(requestAnimationFrame)){
        await new Promise((resolve) => requestAnimationFrame(() => resolve(true)));
      }
      await sleep(resetDelayMs);
    }

    return {
      clearBoardSurface,
      clearBoard,
      resetBoardState,
      resetQRCode,
      resetCommand,
    };
  }

  global.createBoardReset = createBoardReset;
})(typeof window !== "undefined" ? window : globalThis);
