/**
 * URL-state module for parameter parsing, normalization, and state URL building.
 */
(function(){
  const params = new URLSearchParams(window.location.search || "");
  const VIEW_FLAGS_PARAM_KEY = "v";
  const DEBUG_PARAM_KEY = "g";
  const PATTERN_PANEL_PARAM_KEY = "p";
  const DATA_EMPTY_TOKEN = "_";
  const HISTORY_PARAM_KEY = "h";
  const SAMPLES_PARAM_KEY = "m";
  const STEP_SPEED_PARAM_KEY = "e";
  const STEP_FLAGS_PARAM_KEY = "s";
  const CODE_SAMPLE_PARAM_KEY = "c";
  const SWITCH_COUNT_PARAM_KEY = "w";
  const LAYOUT_LEFT_PANE_RATIO_PARAM_KEY = "l";
  const OVERWRITE_DATA_ON_FUNCTIONAL_PARAM_KEY = "o";
  const AUTO_RESET_ON_RUN_PARAM_KEY = "a";
  const DEFAULT_PUT_PARAM_KEY = "u";
  const ERROR_CORRECTION_LEVEL_PARAM_KEY = "ec";
  const USER_SCRIPT_LANGUAGE_PARAM_KEY = "lang";

  // Default URL parameter keys used across the app.
  // Keep PARAM_KEYS stable for compatibility with existing shared URLs.
  const DEFAULT_PARAM_KEYS = {
    VIEW_FLAGS: VIEW_FLAGS_PARAM_KEY,
    DEBUG: DEBUG_PARAM_KEY,
    PATTERN_PANEL: PATTERN_PANEL_PARAM_KEY,
    STEP_SPEED: STEP_SPEED_PARAM_KEY,
    STEP_FLAGS: STEP_FLAGS_PARAM_KEY,
    CODE_SAMPLE: CODE_SAMPLE_PARAM_KEY,
    SAMPLES: SAMPLES_PARAM_KEY,
    DATA: "d",
    HISTORY: HISTORY_PARAM_KEY,
    COMMAND_REFERENCE: "ref",
    SKIP_EXISTING: "x",
    AUTO_AVOID_TIMING: "t",
    USE_DIRECTION: "r",
    SWITCH_COUNT: SWITCH_COUNT_PARAM_KEY,
    LAYOUT_LEFT_PANE_RATIO: LAYOUT_LEFT_PANE_RATIO_PARAM_KEY,
    OVERWRITE_DATA_ON_FUNCTIONAL: OVERWRITE_DATA_ON_FUNCTIONAL_PARAM_KEY,
    AUTO_RESET_ON_RUN: AUTO_RESET_ON_RUN_PARAM_KEY,
    DEFAULT_PUT: DEFAULT_PUT_PARAM_KEY,
    ERROR_CORRECTION_LEVEL: ERROR_CORRECTION_LEVEL_PARAM_KEY,
    USER_SCRIPT_LANGUAGE: USER_SCRIPT_LANGUAGE_PARAM_KEY,
  };

  // INTERNAL_PARAM_KEYS: keys used internally and omitted from normal state URL output.
  const INTERNAL_PARAM_KEYS = {
    PRESENTATION_MODE: "z",
  };

  const normalizeParamKeys = (raw = {}) => {
    const source = (raw && typeof raw === "object") ? raw : {};
    const normalized = Object.assign({}, DEFAULT_PARAM_KEYS);
    Object.keys(source).forEach((key) => {
      const value = source[key];
      if(value === undefined || value === null) return;
      normalized[key] = value;
    });
    return normalized;
  };
  const PARAM_KEYS = normalizeParamKeys(DEFAULT_PARAM_KEYS);

  const stringifyBool = (value) => {
    if(value === null) return null;
    if(typeof value !== "string") return null;
    const trimmed = value.trim();
    if(!trimmed) return true;
    if(/^(?:1|true|yes|on|open|show)$/i.test(trimmed)) return true;
    if(/^(?:0|false|no|off|close|closed|hide)$/i.test(trimmed)) return false;
    return null;
  };
  const hasParam = (key) => Boolean(key) && params.has(key);
  const getParam = (key) => (hasParam(key) ? params.get(key) : null);
  const getBoolParam = (key) => {
    if(!hasParam(key)) return null;
    return stringifyBool(params.get(key));
  };
  const setParam = (stateParams, key, valueOrNull) => {
    if(!stateParams || !key) return;
    if(valueOrNull === null || valueOrNull === undefined){
      stateParams.delete(key);
      return;
    }
    stateParams.set(key, String(valueOrNull));
  };
  const setBoolParam = (stateParams, key, boolOrNull) => {
    if(!stateParams || !key) return;
    if(boolOrNull === null || boolOrNull === undefined){
      stateParams.delete(key);
      return;
    }
    const normalized = boolOrNull ? "1" : "0";
    stateParams.set(key, normalized);
  };
  const setNumberParam = (stateParams, key, numOrNull) => {
    if(!stateParams || !key) return;
    if(numOrNull === null || numOrNull === undefined){
      stateParams.delete(key);
      return;
    }
    const numeric = Number(numOrNull);
    if(!Number.isFinite(numeric)){
      stateParams.delete(key);
      return;
    }
    stateParams.set(key, String(numeric));
  };
  const setStringParam = (stateParams, key, strOrNull) => {
    if(!stateParams || !key) return;
    if(strOrNull === null || strOrNull === undefined){
      stateParams.delete(key);
      return;
    }
    stateParams.set(key, String(strOrNull));
  };
  const getDataParam = (decodeFn) => {
    const raw = getParam(PARAM_KEYS.DATA);
    if(raw === null) return null;
    if(typeof decodeFn === "function"){
      return decodeFn(raw);
    }
    return raw;
  };
  const setDataParam = (stateParams, encodedOrNull) => {
    setStringParam(stateParams, PARAM_KEYS.DATA, encodedOrNull);
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

  const applyPatternOpenFromParam = ({ dataPatternPanel, setPatternPanelOpen } = {}) => {
    if(!dataPatternPanel && typeof setPatternPanelOpen !== "function") return false;
    const spec = getParam(PATTERN_PANEL_PARAM_KEY);
    if(spec === null) return false;
    const parsed = stringifyBool(spec);
    if(parsed === null) return false;
    if(typeof setPatternPanelOpen === "function"){
      setPatternPanelOpen(parsed);
      return true;
    }
    dataPatternPanel.open = parsed;
    try{
      dataPatternPanel.dispatchEvent(new Event("toggle"));
    }catch(err){
      // ignore environments that do not expose Event
    }
    return true;
  };

  const applyDebugFromParam = ({ debugPanel, applyDebugVisibility, setDebugVisible } = {}) => {
    if(!debugPanel && typeof setDebugVisible !== "function") return false;
    const spec = getParam(DEBUG_PARAM_KEY);
    if(spec === null) return false;
    const parsed = stringifyBool(spec);
    if(parsed === null) return false;
    if(typeof setDebugVisible === "function"){
      setDebugVisible(parsed);
    }else{
      applyDebugVisibility(parsed);
    }
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

  const applyCommandReferenceFromParam = ({ setCommandReferenceVisible } = {}) => {
    if(typeof setCommandReferenceVisible !== "function") return false;
    const spec = getParam(PARAM_KEYS.COMMAND_REFERENCE);
    if(spec === null) return false;
    const parsed = stringifyBool(spec);
    if(parsed === null) return false;
    setCommandReferenceVisible(parsed);
    return true;
  };

  const parseStepFlagsParam = () => {
    if(!params.has(STEP_FLAGS_PARAM_KEY)) return null;
    const spec = params.get(STEP_FLAGS_PARAM_KEY);
    if(typeof spec !== "string" || !/^[01]{2}$/.test(spec)) return null;
    return {
      enabled: spec[0] === "1",
      dataOnly: spec[1] === "1",
    };
  };

  const parseStepSpeedParam = () => {
    if(!params.has(STEP_SPEED_PARAM_KEY)) return null;
    const raw = params.get(STEP_SPEED_PARAM_KEY);
    if(raw === null) return null;
    const numeric = Number(raw);
    if(!Number.isFinite(numeric)){
      return null;
    }
    const clamped = Math.max(0, Math.min(120, numeric));
    return String(Math.round(clamped));
  };

  const parseSwitchCountParam = () => {
    if(!params.has(SWITCH_COUNT_PARAM_KEY)) return null;
    const raw = params.get(SWITCH_COUNT_PARAM_KEY);
    if(raw === null) return null;
    const numeric = Number(raw);
    if(!Number.isFinite(numeric)){
      return null;
    }
    const clamped = Math.max(0, Math.min(4, numeric));
    return String(Math.trunc(clamped));
  };

  const parseLayoutLeftPaneRatioParam = () => {
    if(!params.has(LAYOUT_LEFT_PANE_RATIO_PARAM_KEY)) return null;
    const raw = params.get(LAYOUT_LEFT_PANE_RATIO_PARAM_KEY);
    if(raw === null) return null;
    const numeric = Number(raw);
    if(!Number.isFinite(numeric)){
      return null;
    }
    const clamped = Math.max(0.1, Math.min(0.9, numeric));
    return String(Math.round(clamped * 1000) / 1000);
  };

  const buildStepFlagsParamValue = ({
    stepMode,
    stepSkipFunctions,
  } = {}) => {
    const modeEnabled = stepMode && typeof stepMode.checked === "boolean" ? stepMode.checked : false;
    const dataOnly = stepSkipFunctions && typeof stepSkipFunctions.checked === "boolean"
      ? stepSkipFunctions.checked
      : false;
    return `${modeEnabled ? "1" : "0"}${dataOnly ? "1" : "0"}`;
  };

  const applyCombinedStepParam = ({
    stepMode,
    stepSkipFunctions,
  } = {}) => {
    if(!stepMode && !stepSkipFunctions) return false;
    const spec = parseStepFlagsParam();
    if(!spec) return false;

    if(stepMode && typeof stepMode.checked === "boolean"){
      stepMode.checked = spec.enabled;
    }
    if(stepSkipFunctions && typeof stepSkipFunctions.checked === "boolean"){
      stepSkipFunctions.checked = spec.dataOnly;
    }
    return true;
  };

  const applyStepSpeedParam = ({ stepSpeed } = {}) => {
    if(!stepSpeed) return false;
    const parsed = parseStepSpeedParam();
    if(parsed === null) return false;
    stepSpeed.value = parsed;
    stepSpeed.defaultValue = parsed;
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
    const flagValue = params.get(VIEW_FLAGS_PARAM_KEY);
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
    userCodeInput,
    codeSamples = [],
    flagString,
    defaultDataValue,
    defaultUserCode = "",
    debugPanel,
    dataPatternPanel,
    stepSpeed,
    stepMode,
    stepSkipFunctions,
    historyVisible,
    commandReferenceVisible,
    isDebugVisible,
    defaultFlagString,
    defaultHistoryVisible = false,
    defaultCommandReferenceVisible = false,
    defaultDebugVisible = false,
    defaultPatternOpen = false,
    defaultStepMode = false,
    defaultStepSkipFunctions = false,
    defaultStepSpeed = "",
    switchCount,
    defaultSwitchCount,
    layoutLeftPaneRatio,
    defaultLayoutLeftPaneRatio,
    overwriteDataOnFunctional,
    defaultOverwriteDataOnFunctional = false,
    autoResetOnRun,
    defaultAutoResetOnRun = false,
    skipExistingCells,
    defaultSkipExistingCells = false,
    autoAvoidTiming,
    defaultAutoAvoidTiming = false,
    useDirection,
    defaultUseDirection = false,
    errorCorrectionLevel,
    defaultErrorCorrectionLevel,
    userScriptLanguage,
    defaultUserScriptLanguage,
    initialDebugParamPresent = false,
    codePanel,
  } = {}) => {
    const stateParams = new URLSearchParams();
    if(txtInput){
      const value = txtInput.value ?? "";
      const defaultValue = typeof defaultDataValue === "string" ? defaultDataValue : "";
      if(value !== defaultValue){
        const encoded = encodeDataParamValue(value);
        setDataParam(stateParams, encoded);
      }
    }
    if(userCodeInput){
      const currentCode = String(userCodeInput.value ?? "");
      const defaultCode = String(defaultUserCode ?? "");
      if(currentCode !== defaultCode){
        if(currentCode === ""){
          setStringParam(stateParams, PARAM_KEYS.CODE_SAMPLE, "0");
          return;
        }
        const samples = Array.isArray(codeSamples) ? codeSamples : [];
        const sampleIndex = samples.findIndex((entry) => {
          const code = (entry && typeof entry.code === "string") ? entry.code : "";
          return code === currentCode;
        });
        if(sampleIndex >= 0){
          setStringParam(stateParams, PARAM_KEYS.CODE_SAMPLE, String(sampleIndex + 1));
        }
      }
    }
    if(typeof flagString === "string" && flagString.length){
      const flagDefault = typeof defaultFlagString === "string" && defaultFlagString.length ? defaultFlagString : "";
      if(flagString !== flagDefault){
        setStringParam(stateParams, PARAM_KEYS.VIEW_FLAGS, flagString);
      }
    }
    if(debugPanel && typeof isDebugVisible === "function"){
      const visible = isDebugVisible();
      const shouldIncludeDebug = initialDebugParamPresent || visible !== Boolean(defaultDebugVisible);
      if(shouldIncludeDebug){
        setBoolParam(stateParams, PARAM_KEYS.DEBUG, Boolean(visible));
      }
    }
    if(dataPatternPanel){
      const patternOpen = dataPatternPanel.open;
      if(patternOpen !== Boolean(defaultPatternOpen)){
        setBoolParam(stateParams, PARAM_KEYS.PATTERN_PANEL, Boolean(patternOpen));
      }
    }
    if(codePanel){
      const sampleVisible = codePanel.classList.contains("show-samples");
      if(sampleVisible){
        setStringParam(stateParams, PARAM_KEYS.SAMPLES, "1");
      }
    }
    const currentSpeed = stepSpeed
      ? String(stepSpeed.value ?? stepSpeed.defaultValue ?? "")
      : "";
    const normalizedDefaultSpeed = String(defaultStepSpeed ?? (stepSpeed ? (stepSpeed.defaultValue ?? "") : ""));
    if(currentSpeed !== normalizedDefaultSpeed){
      setStringParam(stateParams, PARAM_KEYS.STEP_SPEED, currentSpeed);
    }
    const flagsValue = buildStepFlagsParamValue({ stepMode, stepSkipFunctions });
    const defaultFlagsValue = buildStepFlagsParamValue({
      stepMode: { checked: Boolean(defaultStepMode) },
      stepSkipFunctions: { checked: Boolean(defaultStepSkipFunctions) },
    });
    if(flagsValue !== defaultFlagsValue){
      setStringParam(stateParams, PARAM_KEYS.STEP_FLAGS, flagsValue);
    }
    const normalizedSwitchCount = (() => {
      if(switchCount === undefined || switchCount === null) return null;
      const numeric = Number(switchCount);
      if(!Number.isFinite(numeric)) return null;
      return Math.max(0, Math.min(4, Math.trunc(numeric)));
    })();
    const normalizedSwitchDefault = (() => {
      if(defaultSwitchCount === undefined || defaultSwitchCount === null) return null;
      const numeric = Number(defaultSwitchCount);
      if(!Number.isFinite(numeric)) return null;
      return Math.max(0, Math.min(4, Math.trunc(numeric)));
    })();
    if(normalizedSwitchCount !== null && normalizedSwitchDefault !== null && normalizedSwitchCount !== normalizedSwitchDefault){
      setStringParam(stateParams, PARAM_KEYS.SWITCH_COUNT, String(normalizedSwitchCount));
    }
    const normalizedLayoutLeftPaneRatio = (() => {
      if(layoutLeftPaneRatio === undefined || layoutLeftPaneRatio === null) return null;
      const numeric = Number(layoutLeftPaneRatio);
      if(!Number.isFinite(numeric)) return null;
      return Math.max(0.1, Math.min(0.9, numeric));
    })();
    const normalizedDefaultLayoutLeftPaneRatio = (() => {
      if(defaultLayoutLeftPaneRatio === undefined || defaultLayoutLeftPaneRatio === null) return null;
      const numeric = Number(defaultLayoutLeftPaneRatio);
      if(!Number.isFinite(numeric)) return null;
      return Math.max(0.1, Math.min(0.9, numeric));
    })();
    if(
      normalizedLayoutLeftPaneRatio !== null &&
      normalizedDefaultLayoutLeftPaneRatio !== null &&
      normalizedLayoutLeftPaneRatio !== normalizedDefaultLayoutLeftPaneRatio
    ){
      setStringParam(stateParams, PARAM_KEYS.LAYOUT_LEFT_PANE_RATIO, String(Math.round(normalizedLayoutLeftPaneRatio * 1000) / 1000));
    }
    if(Boolean(overwriteDataOnFunctional) !== Boolean(defaultOverwriteDataOnFunctional)){
      setBoolParam(stateParams, PARAM_KEYS.OVERWRITE_DATA_ON_FUNCTIONAL, Boolean(overwriteDataOnFunctional));
    }
    if(Boolean(autoResetOnRun) !== Boolean(defaultAutoResetOnRun)){
      setBoolParam(stateParams, PARAM_KEYS.AUTO_RESET_ON_RUN, Boolean(autoResetOnRun));
    }
    if(historyVisible !== Boolean(defaultHistoryVisible)){
      setBoolParam(stateParams, PARAM_KEYS.HISTORY, Boolean(historyVisible));
    }
    if(Boolean(commandReferenceVisible) !== Boolean(defaultCommandReferenceVisible)){
      setBoolParam(stateParams, PARAM_KEYS.COMMAND_REFERENCE, Boolean(commandReferenceVisible));
    }
    const normalizedSkipExisting = Boolean(skipExistingCells);
    const normalizedSkipDefault = Boolean(defaultSkipExistingCells);
    if(normalizedSkipExisting !== normalizedSkipDefault){
      setBoolParam(stateParams, PARAM_KEYS.SKIP_EXISTING, normalizedSkipExisting);
    }
    const normalizedAutoAvoid = Boolean(autoAvoidTiming);
    const normalizedAutoDefault = Boolean(defaultAutoAvoidTiming);
    if(normalizedAutoAvoid !== normalizedAutoDefault){
      setBoolParam(stateParams, PARAM_KEYS.AUTO_AVOID_TIMING, normalizedAutoAvoid);
    }
    const normalizedDirection = Boolean(useDirection);
    const normalizedDefaultDirection = Boolean(defaultUseDirection);
    if(normalizedDirection !== normalizedDefaultDirection){
      setBoolParam(stateParams, PARAM_KEYS.USE_DIRECTION, normalizedDirection);
    }
    const normalizedErrorCorrectionLevel = String(errorCorrectionLevel ?? "").trim().toUpperCase();
    const normalizedDefaultErrorCorrectionLevel = String(defaultErrorCorrectionLevel ?? "").trim().toUpperCase();
    if(normalizedErrorCorrectionLevel && normalizedErrorCorrectionLevel !== normalizedDefaultErrorCorrectionLevel){
      setStringParam(stateParams, PARAM_KEYS.ERROR_CORRECTION_LEVEL, normalizedErrorCorrectionLevel);
    }
    const normalizedUserScriptLanguage = String(userScriptLanguage ?? "").trim();
    const normalizedDefaultUserScriptLanguage = String(defaultUserScriptLanguage ?? "").trim();
    if(normalizedUserScriptLanguage && normalizedUserScriptLanguage !== normalizedDefaultUserScriptLanguage){
      setStringParam(stateParams, PARAM_KEYS.USER_SCRIPT_LANGUAGE, normalizedUserScriptLanguage);
    }
    if(params.get("z") === "1"){
      setStringParam(stateParams, INTERNAL_PARAM_KEYS.PRESENTATION_MODE, "1");
    }
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const query = stateParams.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  };

  const urlState = {
    getBoolParam,
    getParam,
    hasParam,
    getDataParam,
    decodeDataParamValue,
    applyPatternOpenFromParam,
    applyDebugFromParam,
    applyHistoryFromParam,
    applySampleParam,
    applyCommandReferenceFromParam,
    applyCombinedStepParam,
    applyStepSpeedParam,
    applyUrlControlStates,
    buildStateUrl,
    PARAM_KEYS,
    INTERNAL_PARAM_KEYS,
  };

  window.urlState = urlState;
})();
