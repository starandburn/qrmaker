/**
 * URLパラメータの解析・適用・URL再構築の補助処理をまとめたstateモジュール。
 */
(function(){
  const params = new URLSearchParams(window.location.search || "");
  const VIEW_FLAGS_PARAM_KEY = "v";
  const DEBUG_PARAM_KEY = "g";
  const PATTERN_PANEL_PARAM_KEY = "p";
  const DATA_PARAM_KEY = "d";
  const DATA_EMPTY_TOKEN = "_";
  const HISTORY_PARAM_KEY = "h";
  const SAMPLES_PARAM_KEY = "m";
  const TIMING_AUTO_PARAM_KEY = "t";
  const SKIP_EXISTING_PARAM_KEY = "x";
  const STEP_SPEED_PARAM_KEY = "e";
  const STEP_FLAGS_PARAM_KEY = "s";
  const USE_DIRECTION_PARAM_KEY = "useDirection";

  const DEFAULT_PARAM_KEYS = {
    VIEW_FLAGS: VIEW_FLAGS_PARAM_KEY,
    DEBUG: DEBUG_PARAM_KEY,
    PATTERN_PANEL: PATTERN_PANEL_PARAM_KEY,
    STEP_SPEED: STEP_SPEED_PARAM_KEY,
    STEP_FLAGS: STEP_FLAGS_PARAM_KEY,
    SAMPLES: SAMPLES_PARAM_KEY,
    DATA: DATA_PARAM_KEY,
    HISTORY: HISTORY_PARAM_KEY,
    SKIP_EXISTING: SKIP_EXISTING_PARAM_KEY,
    AUTO_AVOID_TIMING: TIMING_AUTO_PARAM_KEY,
    TIMING_AUTO: TIMING_AUTO_PARAM_KEY,
    USE_DIRECTION: USE_DIRECTION_PARAM_KEY,
  };

  const normalizeParamKeys = (raw = {}) => {
    const normalized = Object.assign({}, DEFAULT_PARAM_KEYS);
    if(raw && typeof raw === "object"){
      Object.keys(raw).forEach((key) => {
        if(raw[key] === undefined || raw[key] === null){
          return;
        }
        normalized[key] = raw[key];
      });
    }
    return normalized;
  };

  const lookupParam = (primary) => {
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

  const applyPatternOpenFromParam = ({ dataPatternPanel, setPatternPanelOpen } = {}) => {
    if(!dataPatternPanel && typeof setPatternPanelOpen !== "function") return false;
    const spec = lookupParam(PATTERN_PANEL_PARAM_KEY);
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
    const spec = lookupParam(DEBUG_PARAM_KEY);
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
    skipExistingCells,
    defaultSkipExistingCells = false,
    autoAvoidTiming,
    defaultAutoAvoidTiming = false,
    useDirection,
    defaultUseDirection = false,
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
        stateParams.set(VIEW_FLAGS_PARAM_KEY, flagString);
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
    const currentSpeed = stepSpeed
      ? String(stepSpeed.value ?? stepSpeed.defaultValue ?? "")
      : "";
    const normalizedDefaultSpeed = String(defaultStepSpeed ?? (stepSpeed ? (stepSpeed.defaultValue ?? "") : ""));
    if(currentSpeed !== normalizedDefaultSpeed){
      stateParams.set(STEP_SPEED_PARAM_KEY, currentSpeed);
    }
    const flagsValue = buildStepFlagsParamValue({ stepMode, stepSkipFunctions });
    const defaultFlagsValue = buildStepFlagsParamValue({
      stepMode: { checked: Boolean(defaultStepMode) },
      stepSkipFunctions: { checked: Boolean(defaultStepSkipFunctions) },
    });
    if(flagsValue !== defaultFlagsValue){
      stateParams.set(STEP_FLAGS_PARAM_KEY, flagsValue);
    }
    if(historyVisible !== Boolean(defaultHistoryVisible)){
      stateParams.set(HISTORY_PARAM_KEY, historyVisible ? "1" : "0");
    }
    const normalizedSkipExisting = Boolean(skipExistingCells);
    const normalizedSkipDefault = Boolean(defaultSkipExistingCells);
    if(normalizedSkipExisting !== normalizedSkipDefault){
      stateParams.set(SKIP_EXISTING_PARAM_KEY, normalizedSkipExisting ? "1" : "0");
    }
    const normalizedAutoAvoid = Boolean(autoAvoidTiming);
    const normalizedAutoDefault = Boolean(defaultAutoAvoidTiming);
    if(normalizedAutoAvoid !== normalizedAutoDefault){
      stateParams.set(TIMING_AUTO_PARAM_KEY, normalizedAutoAvoid ? "1" : "0");
    }
    const normalizedDirection = Boolean(useDirection);
    const normalizedDefaultDirection = Boolean(defaultUseDirection);
    if(normalizedDirection !== normalizedDefaultDirection){
      stateParams.set(USE_DIRECTION_PARAM_KEY, normalizedDirection ? "1" : "0");
    }
    if(params.get("z") === "1"){
      stateParams.set("z", "1");
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
    applyStepSpeedParam,
    applyUrlControlStates,
    buildStateUrl,
    normalizeParamKeys,
    PARAM_KEYS: normalizeParamKeys(DEFAULT_PARAM_KEYS),
  };

  window.urlState = urlState;
})();
