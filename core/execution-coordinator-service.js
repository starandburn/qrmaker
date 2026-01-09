/**
 * 実行協調サービスのための関数を提供する。
 */
(function(global){
  if(!global) return;

  const runWithCoordinator = async (deps = {}, task) => {
    const {
      runIdAccessor,
      stepFillAccessor,
      sleep,
      setRenderMode,
      renderModeImmediate,
    } = deps;
    if(!runIdAccessor || !stepFillAccessor || typeof task !== "function") return;
    const requestedRun = runIdAccessor.increment();
    if(stepFillAccessor.get()){
      const start = Date.now();
      while(stepFillAccessor.get() && Date.now() - start < 2000){
        await sleep(10);
      }
    }
    stepFillAccessor.set(true);
    const currentRun = runIdAccessor.set(requestedRun);
    try{
      return await task(currentRun);
    }catch(err){
      if(err === global.ABORT_ERR){
        return;
      }
      throw err;
    }finally{
      stepFillAccessor.set(false);
      if(typeof setRenderMode === "function"){
        setRenderMode(renderModeImmediate);
      }
    }
  };

  global.executionCoordinatorService = Object.assign(global.executionCoordinatorService || {}, {
    runWithCoordinator,
  });
})(typeof window !== "undefined" ? window : globalThis);
