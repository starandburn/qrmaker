/**
 * Domain utilities for normalizing QR drawing options and parameter handling.
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
    getDataParam,
    decodeDataParamValue,
  } = {}) => {
    if(!txtInput || typeof getDataParam !== "function") return false;
    const decodedValue = getDataParam(decodeDataParamValue);
    if(decodedValue === null) return false;
    const maxLength = Number(txtInput.getAttribute("maxlength")) || 32;
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

  const applyCodeSampleParam = ({
    userCodeInput,
    hasParam,
    getParam,
    codeSampleParamKey,
    codeSamples,
  } = {}) => {
    const normalizeSampleText = (raw) => {
      const source = (typeof raw === "string") ? raw : "";
      const lines = source.replace(/\r/g, "").split("\n");
      while(lines.length && lines[0].trim() === ""){
        lines.shift();
      }
      while(lines.length && lines[lines.length - 1].trim() === ""){
        lines.pop();
      }
      return lines.join("\n");
    };
    if(!userCodeInput || typeof hasParam !== "function" || typeof getParam !== "function") return false;
    if(!codeSampleParamKey || !hasParam(codeSampleParamKey)) return false;
    const raw = getParam(codeSampleParamKey);
    const numeric = Number(raw);
    if(Number.isInteger(numeric) && numeric === 0){
      if(userCodeInput.value !== ""){
        userCodeInput.value = "";
        try{
          userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
        }catch(_err){
          // ignore environments without Event
        }
      }
      return true;
    }
    const list = Array.isArray(codeSamples) ? codeSamples : [];
    if(!Number.isInteger(numeric) || numeric < 1 || numeric > list.length) return false;
    const selected = list[numeric - 1];
    const code = normalizeSampleText((selected && typeof selected.code === "string") ? selected.code : "");
    if(userCodeInput.value !== code){
      userCodeInput.value = code;
      try{
        userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
      }catch(_err){
        // ignore environments without Event
      }
    }
    return true;
  };

  global.domainQrParams = Object.assign(global.domainQrParams || {}, {
    resolveFunctionalOptions,
    applyDataParam,
    applyCodeSampleParam,
  });
})(typeof window !== "undefined" ? window : globalThis);
