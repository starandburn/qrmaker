/**
 * User-code runner module with execution orchestration and safety checks.
 */
(function(global){
  if(!global) return;

  function createUserCodeRunner(deps = {}){
    const {
      userCodeInput,
      userCodeParsed,
      codePanel,
      buildUserScript,
      resetLoopGuard,
      isStepModeOn = () => false,
      isDebugVisible = () => false,
      requestRender = (() => {}),
      setRenderMode = (() => {}),
      ctx,
      ABORT_ERR,
      setLastExecutionError = () => {},
    } = deps;

    function syncParsedCode(){
      if(!userCodeParsed || !codePanel) return;
      const debugOn = isDebugVisible();
      codePanel.classList.toggle("debug-mode", debugOn);
      if(!debugOn){
        userCodeParsed.value = "";
        return;
      }
      try{
        const script = buildUserScript(userCodeInput ? userCodeInput.value : "", { awaitCalls: true });
        userCodeParsed.value = script;
      }catch(err){
        const message = err && err.message ? String(err.message) : String(err);
        const debugSource = err && typeof err.userScriptDebugSource === "string" ? err.userScriptDebugSource : "";
        const debugLabel = err && typeof err.userScriptDebugSourceLabel === "string" ? err.userScriptDebugSourceLabel : "converted";
        userCodeParsed.value = debugSource
          ? `// ${message}\n// ${debugLabel}\n${debugSource}`
          : `// ${message}`;
      }
    }

    function validateRunnerSyntax(runner){
      try{
        new Function(runner);
        return null;
      }catch(err){
        if(err instanceof SyntaxError){
          setLastExecutionError(err.message);
          return err;
        }
        throw err;
      }
    }

    async function runUserCode(){
      if(!userCodeInput) return true;
      setLastExecutionError(null);
      resetLoopGuard();
      const perfNow = (typeof performance !== "undefined" && typeof performance.now === "function")
        ? () => performance.now()
        : () => Date.now();
      const perfStats = {
        moveMs: 0,
        putMs: 0,
        moveCount: 0,
        putCount: 0,
      };
      const globalObj = (typeof window !== "undefined") ? window : globalThis;
      const wrapTimed = (name, counterKey, timeKey) => {
        const original = globalObj ? globalObj[name] : null;
        if(typeof original !== "function") return null;
        return {
          original,
          wrapped: (...args) => {
            const start = perfNow();
            const result = original(...args);
            perfStats[counterKey] += 1;
            perfStats[timeKey] += perfNow() - start;
            return result;
          },
        };
      };
      const moveWrapper = wrapTimed("moveCursor", "moveCount", "moveMs");
      const putWrapper = wrapTimed("putCell", "putCount", "putMs");
      if(moveWrapper){
        globalObj.moveCursor = moveWrapper.wrapped;
      }
      if(putWrapper){
        globalObj.putCell = putWrapper.wrapped;
      }
      let script = "";
      try{
        const awaitCalls = typeof isStepModeOn === "function" && isStepModeOn();
        script = buildUserScript(userCodeInput.value || "", { awaitCalls });
      }catch(err){
        setLastExecutionError(err && err.message ? String(err.message) : String(err));
        return false;
      }
      if(!script.trim()) return true;
      try{
        const runner = `(async () => {\n${script}\n})();`;
        const syntaxError = validateRunnerSyntax(runner);
        if(syntaxError){
          return false;
        }
        const res = (0, eval)(runner);
        if(res && typeof res.then === "function"){
          await res;
        }
        setLastExecutionError(null);
        return true;
      }catch(err){
        if(err === ABORT_ERR){
          return false;
        }
        const msg = err && err.message ? err.message : String(err);
        setLastExecutionError(msg);
        return false;
      }finally{
        if(moveWrapper){
          globalObj.moveCursor = moveWrapper.original;
        }
        if(putWrapper){
          globalObj.putCell = putWrapper.original;
        }
        if(typeof globalObj?.logEvent === "function"){
          globalObj.logEvent(
            "perfUserAlgo",
            JSON.stringify({
              moveCount: perfStats.moveCount,
              moveMs: Math.round(perfStats.moveMs),
              putCount: perfStats.putCount,
              putMs: Math.round(perfStats.putMs),
            }),
            "ユーザーコード内訳",
          );
        }
      }
    }

    async function runUserCodeWithStep(){
      if(!ctx) return false;
      const currentRun = ctx.invalidateRun();
      ctx.setStepFillRunning(true);
      const prevRender = ctx.renderMode;
      const prevSuppressCursorUpdates = typeof window !== "undefined" ? window.suppressCursorUpdates : false;
      setRenderMode(RENDER_IMMEDIATE);
      try{
        const ok = await runUserCode();
        if(!ok) return false;
        return true;
      }catch(err){
        if(err === ABORT_ERR){
          return false;
        }
        throw err;
      }finally{
        if(typeof window !== "undefined"){
          window.suppressCursorUpdates = prevSuppressCursorUpdates;
        }
        ctx.setStepFillRunning(false);
        requestRender("runUserCodeWithStep");
        setRenderMode(prevRender);
      }
    }

    return {
      syncParsedCode,
      validateRunnerSyntax,
      runUserCode,
      runUserCodeWithStep,
    };
  }

  global.createUserCodeRunner = createUserCodeRunner;
})(typeof window !== "undefined" ? window : globalThis);
