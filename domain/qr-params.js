/**
 * URLパラメータ/ステータス解決の純粋関数をまとめた domain 層モジュール。
 */
(function(global){
  if(!global) return;

  const resolveFunctionalOptions = (context = {}, overwriteOrOpts = false, currentRunOrOpts, stepEnabled) => {
    const {
      baseRun = 0,
      shouldStepResolver = () => false,
    } = context || {};
    const defaultStep = typeof shouldStepResolver === "function" ? shouldStepResolver() : false;
    if(typeof overwriteOrOpts === "object" && overwriteOrOpts !== null && !Array.isArray(overwriteOrOpts)){
      const { overwrite = false, currentRun, stepEnabled: stepFromOpts } = overwriteOrOpts;
      const resolvedRun = (typeof currentRun === "number") ? currentRun : baseRun;
      const resolvedStep = (typeof stepFromOpts === "boolean") ? stepFromOpts : defaultStep;
      return { overwrite, currentRun: resolvedRun, stepEnabled: resolvedStep };
    }
    const overwriteValue = (overwriteOrOpts === undefined) ? true : overwriteOrOpts;
    if(typeof currentRunOrOpts === "object" && currentRunOrOpts !== null && !Array.isArray(currentRunOrOpts)){
      const { currentRun, stepEnabled: stepFromOpts } = currentRunOrOpts;
      const resolvedRun = (typeof currentRun === "number") ? currentRun : baseRun;
      const resolvedStep = (typeof stepFromOpts === "boolean") ? stepFromOpts : defaultStep;
      return { overwrite: overwriteValue, currentRun: resolvedRun, stepEnabled: resolvedStep };
    }
    const resolvedRun = (typeof currentRunOrOpts === "number") ? currentRunOrOpts : baseRun;
    const resolvedStep = (typeof stepEnabled === "boolean") ? stepEnabled : defaultStep;
    return { overwrite: overwriteValue, currentRun: resolvedRun, stepEnabled: resolvedStep };
  };

  const applyDataParam = ({
    txtInput,
    urlParams,
    DATA_PARAM_KEY,
    decodeDataParamValue,
  } = {}) => {
    if(!txtInput || !urlParams || !DATA_PARAM_KEY) return false;
    if(!urlParams.has(DATA_PARAM_KEY)) return false;
    const rawValue = urlParams.get(DATA_PARAM_KEY);
    if(rawValue === null) return false;
    const maxLength = Number(txtInput.getAttribute("maxlength")) || 32;
    const decodedValue = typeof decodeDataParamValue === "function" ? decodeDataParamValue(rawValue) : rawValue;
    const safeValue = (typeof decodedValue === "string") ? decodedValue : String(decodedValue ?? "");
    const nextValue = safeValue.length > maxLength ? safeValue.slice(0, maxLength) : safeValue;
    if(txtInput.value !== nextValue){
      txtInput.value = nextValue;
      try{
        txtInput.dispatchEvent(new Event("input", { bubbles: true }));
      }catch(_err){
        // ignore environments without Event
      }
    }
    return true;
  };

  global.domainQrParams = Object.assign(global.domainQrParams || {}, {
    resolveFunctionalOptions,
    applyDataParam,
  });
})(typeof window !== "undefined" ? window : globalThis);
