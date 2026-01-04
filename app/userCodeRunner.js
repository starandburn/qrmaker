(function(global){
  if(!global) return;

  function createUserCodeRunner(deps = {}){
    const {
      userCodeInput,
      userCodeParsed,
      codePanel,
      buildUserScript,
      resetLoopGuard,
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
        userCodeParsed.value = `// ${err && err.message ? String(err.message) : String(err)}`;
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
      let script = "";
      try{
        script = buildUserScript(userCodeInput.value || "", { awaitCalls: true });
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
      }
    }

    async function runUserCodeWithStep(){
      if(!ctx) return false;
      const currentRun = ++ctx.runId;
      ctx.isStepFillRunning = true;
      const prevRender = ctx.renderMode;
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
        ctx.isStepFillRunning = false;
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
