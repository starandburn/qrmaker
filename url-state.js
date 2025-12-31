(function(){
  const params = new URLSearchParams(window.location.search || "");
  const FLAG_PARAM_KEY = "v";
  const DEBUG_PARAM_KEY = "d";
  const DEBUG_PARAM_ALIAS = null;
  const PATTERN_PANEL_PARAM_KEY = "p";
  const PATTERN_PANEL_PARAM_ALIAS = null;
  const COMBINED_STEP_PARAM_KEY = "s";
  const DATA_PARAM_KEY = "t";
  const DATA_EMPTY_TOKEN = "_";
  const HISTORY_PARAM_KEY = "h";
  const SAMPLES_PARAM_KEY = "m";

  const lookupParam = (primary, alias) => {
    if(alias && params.has(alias)) return params.get(alias);
    if(primary && params.has(primary)) return params.get(primary);
    return null;
  };

  const stringifyBool = (value) => {
    if(value === null) return null;
    if(typeof value !== "string") return null;
    const trimmed = value.trim();
    if(!trimmed) return true;
    if(/^(?:1|true|yes|on|open|show)$/i.test(trimmed)) return true;
    if(/^(?:0|false|no|off|close|closed|hide)$/i.test(trimmed)) return false;
    return null;
  };

  function encodeDataParamValue(value){
    const normalized = value ?? "";
    if(normalized === ""){
      return DATA_EMPTY_TOKEN;
    }
    if(normalized === DATA_EMPTY_TOKEN || normalized.startsWith("~")){
      return `~${normalized}`;
    }
    return normalized;
  }

  function decodeDataParamValue(rawValue){
    if(rawValue === DATA_EMPTY_TOKEN){
      return "";
    }
    if(rawValue.startsWith("~")){
      return rawValue.slice(1);
    }
    return rawValue;
  }

  const applyPatternOpenFromParam = ({ dataPatternPanel } = {}) => {
    if(!dataPatternPanel) return false;
    const spec = lookupParam(PATTERN_PANEL_PARAM_KEY, PATTERN_PANEL_PARAM_ALIAS);
    if(spec === null) return false;
    const parsed = stringifyBool(spec);
    if(parsed === null) return false;
    dataPatternPanel.open = parsed;
    try{
      dataPatternPanel.dispatchEvent(new Event("toggle"));
    }catch(err){
      // ignore environments that do not expose Event
    }
    return true;
  };

  const applyDebugFromParam = ({ debugPanel, applyDebugVisibility } = {}) => {
    if(!debugPanel || typeof applyDebugVisibility !== "function") return false;
    const spec = lookupParam(DEBUG_PARAM_KEY, DEBUG_PARAM_ALIAS);
    if(spec === null) return false;
    const parsed = stringifyBool(spec);
    if(parsed === null) return false;
    applyDebugVisibility(parsed);
    return true;
  };

  const applyHistoryFromParam = ({ codePanel, setHistoryVisibility } = {}) => {
    if(!codePanel || typeof setHistoryVisibility !== "function") return false;
    const spec = params.get(HISTORY_PARAM_KEY);
    if(spec === null) return false;
    const parsed = stringifyBool(spec);
    if(parsed === null) return false;
    setHistoryVisibility(parsed);
    return true;
  };

  const applySampleParam = ({ codePanel } = {}) => {
    if(!codePanel) return false;
    if(!params.has(SAMPLES_PARAM_KEY)) return false;
    const parsed = stringifyBool(params.get(SAMPLES_PARAM_KEY));
    if(parsed === null) return false;
    codePanel.classList.toggle("show-samples", parsed);
    return true;
  };

  const parseCombinedStepParam = () => {
    if(!params.has(COMBINED_STEP_PARAM_KEY)) return null;
    const rawValue = params.get(COMBINED_STEP_PARAM_KEY);
    if(rawValue === null) return null;
    const numeric = Number(rawValue);
    if(!Number.isFinite(numeric)) return null;
    const skipOff = numeric >= 1000;
    const baseValue = skipOff ? numeric - 1000 : numeric;
    return {
      enabled: baseValue >= 1,
      speedSource: Math.max(0, baseValue),
      skipFunctions: !skipOff,
    };
  };
 
  const buildCombinedStepParamValue = ({
    stepMode,
    stepSpeed,
    stepSkipFunctions,
  } = {}) => {
    const modeEnabled = stepMode && typeof stepMode.checked === "boolean" ? stepMode.checked : false;
    if(!modeEnabled){
      return "0";
    }
    const rawSpeed = stepSpeed ? Number(stepSpeed.value ?? stepSpeed.defaultValue ?? "") : NaN;
    const numericSpeed = Number.isFinite(rawSpeed) ? rawSpeed : 0;
    const minVal = Number(stepSpeed?.min ?? 0);
    const maxVal = Number(stepSpeed?.max ?? 120);
    const clampedLower = Number.isFinite(minVal) ? minVal : 0;
    const clampedUpper = Number.isFinite(maxVal) ? maxVal : clampedLower || 120;
    const clampedSpeed = Math.max(clampedLower, Math.min(clampedUpper, numericSpeed));
    const baseValue = Math.max(0, clampedSpeed) + 1;
    const skipOff = stepSkipFunctions && typeof stepSkipFunctions.checked === "boolean" ? !stepSkipFunctions.checked : false;
    const combined = baseValue + (skipOff ? 1000 : 0);
    return String(Math.round(combined));
  };

  const applyCombinedStepParam = ({
    stepMode,
    stepSpeed,
    stepSkipFunctions,
  } = {}) => {
    if(!stepMode && !stepSpeed && !stepSkipFunctions) return false;
    const spec = parseCombinedStepParam();
    if(!spec) return false;

    if(stepMode && typeof stepMode.checked === "boolean"){
      stepMode.checked = spec.enabled;
    }
    if(spec.enabled && stepSpeed){
      const minVal = Number(stepSpeed.min);
      const maxVal = Number(stepSpeed.max);
      const clampedLower = Number.isFinite(minVal) ? minVal : 0;
      const clampedUpper = Number.isFinite(maxVal) ? maxVal : clampedLower || 120;
      const targetValue = Math.max(clampedLower, Math.min(clampedUpper, spec.speedSource - 1));
      stepSpeed.value = String(targetValue);
    }
    if(stepSkipFunctions && typeof stepSkipFunctions.checked === "boolean"){
      stepSkipFunctions.checked = spec.skipFunctions;
    }
    return true;
  };

  const applyUrlControlStates = ({
    toggleConfig = [],
    viewRefreshTargets = [],
    stepToggleTargets = [],
    colorToggleElement,
    debugToggleElement,
    applyToggleFlags,
    syncViewToggles,
    syncDebugOverlay,
    syncStepControls,
  } = {}) => {
    const flagValue = params.get(FLAG_PARAM_KEY);
    let flagHandled = false;
    if(flagValue && typeof applyToggleFlags === "function"){
      const result = applyToggleFlags(flagValue);
      if(result && result.applied){
        flagHandled = true;
        if(result.viewNeedsRefresh && typeof syncViewToggles === "function"){
          syncViewToggles();
        }
        if(result.colorChanged && colorToggleElement){
          colorToggleElement.dispatchEvent(new Event("change"));
        }
        if(result.debugChanged && typeof syncDebugOverlay === "function"){
          syncDebugOverlay();
        }
        if(result.stepNeedsRefresh && typeof syncStepControls === "function"){
          syncStepControls();
        }
      }
    }
    if(flagHandled) return;
    let viewNeedsRefresh = false;
    let colorChanged = false;
    let debugChanged = false;
    let stepNeedsRefresh = false;
    toggleConfig.forEach(({ param, element }) => {
      if(!element || !params.has(param)) return;
      const parsed = stringifyBool(params.get(param));
      if(parsed === null) return;
      if(typeof element.checked === "boolean"){
        element.checked = parsed;
      }
      if(viewRefreshTargets.includes(element)){
        viewNeedsRefresh = true;
      }
      if(element === colorToggleElement){
        colorChanged = true;
      }
      if(element === debugToggleElement){
        debugChanged = true;
      }
      if(stepToggleTargets.includes(element)){
        stepNeedsRefresh = true;
      }
    });
    if(viewNeedsRefresh && typeof syncViewToggles === "function"){
      syncViewToggles();
    }
    if(colorChanged && colorToggleElement){
      colorToggleElement.dispatchEvent(new Event("change"));
    }
    if(debugChanged && typeof syncDebugOverlay === "function"){
      syncDebugOverlay();
    }
    if(stepNeedsRefresh && typeof syncStepControls === "function"){
      syncStepControls();
    }
  };

  const buildStateUrl = ({
    txtInput,
    flagString,
    defaultDataValue,
    debugPanel,
    dataPatternPanel,
    stepSpeed,
    stepMode,
    stepSkipFunctions,
    historyVisible,
    isDebugVisible,
    defaultFlagString,
    defaultHistoryVisible = false,
    defaultDebugVisible = false,
    defaultPatternOpen = false,
    defaultStepMode = false,
    defaultStepSkipFunctions = false,
    defaultStepSpeed = "",
    initialDebugParamPresent = false,
    codePanel,
  } = {}) => {
    const stateParams = new URLSearchParams();
    if(txtInput){
      const value = txtInput.value ?? "";
      const defaultValue = typeof defaultDataValue === "string" ? defaultDataValue : "";
      if(value !== defaultValue){
        const encoded = encodeDataParamValue(value);
        stateParams.set(DATA_PARAM_KEY, encoded);
      }
    }
    if(typeof flagString === "string" && flagString.length){
      const flagDefault = typeof defaultFlagString === "string" && defaultFlagString.length ? defaultFlagString : "";
      if(flagString !== flagDefault){
        stateParams.set(FLAG_PARAM_KEY, flagString);
      }
    }
    if(debugPanel && typeof isDebugVisible === "function"){
      const visible = isDebugVisible();
      const shouldIncludeDebug = initialDebugParamPresent || visible !== Boolean(defaultDebugVisible);
      if(shouldIncludeDebug){
        stateParams.set(DEBUG_PARAM_KEY, visible ? "1" : "0");
      }
    }
    if(dataPatternPanel){
      const patternOpen = dataPatternPanel.open;
      if(patternOpen !== Boolean(defaultPatternOpen)){
        stateParams.set(PATTERN_PANEL_PARAM_KEY, patternOpen ? "1" : "0");
      }
    }
    if(codePanel){
      const sampleVisible = codePanel.classList.contains("show-samples");
      if(sampleVisible){
        stateParams.set(SAMPLES_PARAM_KEY, "1");
      }
    }
    const combinedStepValue = buildCombinedStepParamValue({ stepMode, stepSpeed, stepSkipFunctions });
    const defaultCombinedStepValue = buildCombinedStepParamValue({
      stepMode: { checked: Boolean(defaultStepMode) },
      stepSpeed: stepSpeed
        ? {
            value: defaultStepSpeed ?? stepSpeed.defaultValue ?? "",
            defaultValue: defaultStepSpeed ?? stepSpeed.defaultValue ?? "",
            min: stepSpeed.min,
            max: stepSpeed.max,
          }
        : undefined,
      stepSkipFunctions: { checked: Boolean(defaultStepSkipFunctions) },
    });
    if(typeof combinedStepValue === "string"){
      if(combinedStepValue !== defaultCombinedStepValue){
        stateParams.set(COMBINED_STEP_PARAM_KEY, combinedStepValue);
      }
    }
    if(historyVisible !== Boolean(defaultHistoryVisible)){
      stateParams.set(HISTORY_PARAM_KEY, historyVisible ? "1" : "0");
    }
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const query = stateParams.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  };

  const urlState = {
    params,
    lookupParam,
    stringifyBool,
    encodeDataParamValue,
    decodeDataParamValue,
    applyPatternOpenFromParam,
    applyDebugFromParam,
    applyHistoryFromParam,
    applySampleParam,
    applyCombinedStepParam,
    applyUrlControlStates,
    buildStateUrl,
    PARAM_KEYS: {
      FLAG: FLAG_PARAM_KEY,
      DEBUG: DEBUG_PARAM_KEY,
      DEBUG_ALIAS: DEBUG_PARAM_ALIAS,
      PATTERN_PANEL: PATTERN_PANEL_PARAM_KEY,
      PATTERN_PANEL_ALIAS: PATTERN_PANEL_PARAM_ALIAS,
      COMBINED_STEP: COMBINED_STEP_PARAM_KEY,
      SAMPLES: SAMPLES_PARAM_KEY,
      DATA: DATA_PARAM_KEY,
      HISTORY: HISTORY_PARAM_KEY,
    },
  };

  window.urlState = Object.assign({}, window.urlState || {}, urlState);
})();
