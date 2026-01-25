/**
 * 基本パターン描画のロジックを切り出したサービスモジュール。
 * ステップ/即時描画の判断やレンダリングモードを管理しながら描画処理を呼ぶ。
 */
(function(global){
  if(!global) return;

  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");

  const drawBasePatternsService = async (deps = {}) => {
    const {
      isStepModeOn,
      stepSkipFunctions,
      setRenderMode,
      drawBasePatterns,
      drawBasePatternsStepped,
      renderModeImmediate,
      renderModeBuffered,
      currentRun,
      runIdAccessor,
    } = deps;
    if(!setRenderMode || !isFunction(runIdAccessor?.get)){
      return { shouldAbort: true };
    }
    let stepEnabled = isFunction(isStepModeOn) ? isStepModeOn() : false;
    const skipFunctions = stepEnabled && stepSkipFunctions && stepSkipFunctions.checked;

    setRenderMode(stepEnabled ? renderModeImmediate : renderModeBuffered);
    if(stepEnabled && skipFunctions){
      const ok = await drawBasePatterns({ deferFlush: false, currentRun });
      if(currentRun !== runIdAccessor.get() || !ok){
        return { shouldAbort: true };
      }
      setRenderMode(renderModeImmediate);
      return {};
    }
    if(stepEnabled){
      const res = await drawBasePatternsStepped({ currentRun });
      if(res && res.fastForwarded){
        return { fastForwarded: true };
      }
      if(currentRun !== runIdAccessor.get() || (res && res.ok === false)){
        return { shouldAbort: true };
      }
      return {};
    }
    const ok = await drawBasePatterns({ deferFlush: false, currentRun });
    if(currentRun !== runIdAccessor.get() || !ok){
      return { shouldAbort: true };
    }
    return {};
  };

  if(global.basePatternService){
    console.warn("basePatternService is already defined; duplicate load detected");
  }
  global.basePatternService = {
    drawBasePatternsService,
  };
})(typeof window !== "undefined" ? window : globalThis);
