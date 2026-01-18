const REQUIRED_KEYS = [
  "DIR_UP",
  "DIR_RIGHT",
  "DIR_DOWN",
  "DIR_LEFT",
  "DIR_FRONT",
  "DIR_BACK",
  "RENDER_IMMEDIATE",
  "RENDER_BUFFERED",
  "STEP_DELAY_MS",
  "RESET_DELAY_MS",
  "ABORT_ERR",
];

/**
 * 実行環境を初期化し、UI/状態/描画APIの依存を束ねるメイン関数。
 */
function runMainApp({ urlState, layoutUI, debugUI, settings = {} } = {}){
  if(!urlState){
    throw new Error("state/url-state.js must be loaded before main.js.");
  }
  if(!layoutUI){
    throw new Error("ui/layout.js must be loaded before main.js.");
  }
  if(!debugUI){
    debugUI = {};
  }
  const btnGenerate = document.getElementById("btnGenerate");
  const btnInit = document.getElementById("btnInit");
  const btnClearCode = document.getElementById("btnClearCode");
  const btnCopyCode = document.getElementById("btnCopyCode");
  const btnPasteCode = document.getElementById("btnPasteCode");
  const btnClear = document.getElementById("btnClear");
  const btnSampleDropdown = document.getElementById("btnSampleDropdown");
  const debugLog = document.getElementById("debugLog");
  const dataPatternPanel = document.getElementById("dataPatternPanel");
  const codePanel = document.querySelector(".code-panel");
  if(!dataPatternPanel){
    throw new Error("dataPatternPanel is required");
  }
  const userCodeParsed = document.getElementById("userCodeParsed");
  const footerCopy = document.querySelector(".page-footer p:first-child");
  const versionInfo = document.getElementById("appVersionInfo");
  const userCodeInput = document.getElementById("userCode");
  const btnToggleHistory = document.getElementById("btnToggleHistory");
  const btnPruneHistory = document.getElementById("btnPruneHistory");
  const codeHistoryList = document.getElementById("codeHistoryList");
  const stepMode = document.getElementById("stepMode");
  const stepSkipFunctions = document.getElementById("stepSkipFunctions");
  const stepSpeed = document.getElementById("stepSpeed");
  const stepSpeedLabel = document.querySelector(".step-speed");
  function isStepModeOn(){
    return !!(stepMode && stepMode.checked);
  }
  if(typeof window !== "undefined"){
    window.isStepModeOn = isStepModeOn;
  }
  const toggleDebugValues = document.getElementById("toggleDebugValues");
  const titleIcon = document.querySelector(".title-icon");
  const toggleCursor = document.getElementById("toggleCursor");
  const toggleGuide = document.getElementById("toggleGuide");
  const toggleGrid = document.getElementById("toggleGrid");
  const toggleEmpty = document.getElementById("toggleEmpty");
  const toggleColor = document.getElementById("toggleColor");
  const txtInput = document.getElementById("txtInput");
  const configDefaults = (settings && typeof settings === "object") ? settings.defaults || {} : {};
  const resolvedDataTemplates = Array.isArray(configDefaults.dataTemplates)
    ? configDefaults.dataTemplates
    : [];
  const switchDefinitions = [
    { name: "red", label: "Red", color: 0xff0000, idSuffix: "Red" },
    { name: "blue", label: "Blue", color: 0x567cff, idSuffix: "Blue" },
    { name: "green", label: "Green", color: 0x00a800, idSuffix: "Green" },
    { name: "yellow", label: "Yellow", color: 0xffd500, idSuffix: "Yellow" },
  ];
  const DEFAULT_SWITCH_COUNT = 2;
  const MAX_SWITCH_COUNT = switchDefinitions.length;
  const parseSwitchCountValue = (value) => {
    if(typeof value === "number" && Number.isFinite(value)){
      return value;
    }
    if(typeof value === "string"){
      const trimmed = value.trim();
      if(trimmed.length){
        const parsed = Number(trimmed);
        if(Number.isFinite(parsed)){
          return parsed;
        }
      }
    }
    return null;
  };
  const clampSwitchCount = (value) => Math.min(MAX_SWITCH_COUNT, Math.max(0, Math.trunc(value)));
  const requestedSwitchCount = (() => {
    const parsed = parseSwitchCountValue(configDefaults.switchCount);
    if(parsed === null){
      return DEFAULT_SWITCH_COUNT;
    }
    return clampSwitchCount(parsed);
  })();
  const activeSwitchDefinitions = switchDefinitions.slice(0, requestedSwitchCount);
  const activeSwitchNames = activeSwitchDefinitions.map((def) => def.name);
  if(typeof window !== "undefined"){
    window.__qrSwitchConfig = Object.assign({}, window.__qrSwitchConfig, { switchNames: activeSwitchNames });
  }
  const switchIndicatorElements = Object.create(null);
  let switchIndicatorContainer = null;
  let switchIndicatorLabel = null;
  const colorIntToHex = (value) => {
    if(typeof value !== "number" || Number.isNaN(value)) return "#000000";
    return `#${(value >>> 0).toString(16).padStart(6, "0")}`;
  };
  const ensureSwitchIndicators = () => {
    if(!activeSwitchDefinitions.length){
      return null;
    }
    if(switchIndicatorContainer){
      return switchIndicatorContainer;
    }
    switchIndicatorContainer = document.createElement("span");
    switchIndicatorContainer.className = "execution-status-switches";
    switchIndicatorContainer.setAttribute("role", "group");
    switchIndicatorContainer.setAttribute("aria-label", "Switch状態");
    switchIndicatorLabel = document.createElement("span");
    switchIndicatorLabel.className = "execution-status-label execution-status-label-chip";
    switchIndicatorLabel.dataset.labelKind = "switch";
    switchIndicatorLabel.textContent = "Switch";
    switchIndicatorContainer.append(switchIndicatorLabel);
    activeSwitchDefinitions.forEach((def) => {
      const idSuffix = def.idSuffix || (def.name.charAt(0).toUpperCase() + def.name.slice(1));
      const indicator = document.createElement("span");
      indicator.id = `executionStatusSwitch${idSuffix}Indicator`;
      indicator.className = "execution-status-switch-indicator";
      indicator.setAttribute("aria-label", def.label);
      switchIndicatorElements[def.name] = indicator;
      switchIndicatorContainer.append(indicator);
    });
    return switchIndicatorContainer;
  };
  const switchStates = Object.fromEntries(activeSwitchNames.map((name) => [name, false]));
  const updateSwitchIndicators = () => {
    if(!activeSwitchDefinitions.length) return;
    const container = ensureSwitchIndicators();
    if(!container) return;
    const offBackground = "#4a4a4a";
    const onBorderColor = "rgba(0,0,0,0.25)";
    const offBorderColor = "rgba(0,0,0,0.15)";
    activeSwitchDefinitions.forEach((def) => {
      const indicatorEl = switchIndicatorElements[def.name];
      if(!indicatorEl) return;
      const isOn = Boolean(switchStates[def.name]);
      indicatorEl.classList.toggle("is-on", isOn);
      indicatorEl.style.backgroundColor = isOn ? colorIntToHex(def.color) : offBackground;
      indicatorEl.style.borderColor = isOn ? onBorderColor : offBorderColor;
    });
  };
  const parseSwitchAction = (value) => {
    if(typeof value === "boolean") return value;
    if(typeof value === "string"){
      const normalized = value.trim().toLowerCase();
      if(!normalized.length) return null;
      if(normalized === "on" || normalized === "true" || normalized === "1") return true;
      if(normalized === "off" || normalized === "false" || normalized === "0") return false;
      return null;
    }
    return null;
  };
  const setSwitchState = (color, state) => {
    if(!(color in switchStates)) return false;
    const next = Boolean(state);
    switchStates[color] = next;
    updateSwitchIndicators();
    if(typeof window.logEvent === "function"){
      const labelMap = { red: "赤", blue: "青", green: "緑", yellow: "黄" };
      const label = labelMap[color] || color;
      const desc = `スイッチを${next ? "ON" : "OFF"}に設定`.replace("スイッチ", `${label}スイッチ`);
      window.logEvent("setSwitch", JSON.stringify({ color, state: next }), desc);
    }
    return next;
  };
  const toggleSwitchState = (color) => {
    if(!(color in switchStates)) return false;
    const next = !switchStates[color];
    switchStates[color] = next;
    updateSwitchIndicators();
    if(typeof window.logEvent === "function" && typeof isStepModeOn === "function" && isStepModeOn()){
      const labelMap = { red: "赤", blue: "青", green: "緑", yellow: "黄" };
      const label = labelMap[color] || color;
      const desc = `スイッチを反転`.replace("スイッチ", `${label}スイッチ`);
      window.logEvent("setSwitch", JSON.stringify({ color, flipped: true, state: next }), desc);
    }
    return next;
  };
  const isSwitchOn = (color) => Boolean(switchStates[color]);
  const setSwitch = (color, action) => {
    return updateSwitchState(color, action);
  };
  const updateSwitchState = (color, action) => {
    const desired = parseSwitchAction(action);
    return (desired === null) ? toggleSwitchState(color) : setSwitchState(color, desired);
  };
  const red = (action) => setSwitch("red", action);
  const blue = (action) => setSwitch("blue", action);
  const green = (action) => setSwitch("green", action);
  const yellow = (action) => setSwitch("yellow", action);
  const isRedOn = () => isSwitchOn("red");
  const isBlueOn = () => isSwitchOn("blue");
  const isGreenOn = () => isSwitchOn("green");
  const isYellowOn = () => isSwitchOn("yellow");
  function resetSwitchStates(){
    activeSwitchNames.forEach((name) => {
      switchStates[name] = false;
    });
    updateSwitchIndicators();
  }
  updateSwitchIndicators();
  const sampleDropdownMenu = document.getElementById("sampleDropdownMenu");
  if(sampleDropdownMenu){
    sampleDropdownMenu.innerHTML = "";
    resolvedDataTemplates.forEach((entry, index) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      let label = "";
      if(typeof entry.label === "string" && entry.label.trim().length){
        label = entry.label;
      }else if(typeof entry.value === "string" && entry.value.trim().length){
        label = entry.value;
      }else{
        label = `テンプレート ${index + 1}`;
      }
      const value = (typeof entry.value === "string") ? entry.value : "";
      li.setAttribute("data-sample-value", value);
      li.textContent = label;
      sampleDropdownMenu.append(li);
    });
  }
  const viewOverrides = configDefaults.viewFlags || {};
  const viewOverridePairs = [
    { key: "viewCursor", element: toggleCursor },
    { key: "viewGuide", element: toggleGuide },
    { key: "viewGrid", element: toggleGrid },
    { key: "viewEmpty", element: toggleEmpty },
    { key: "viewColor", element: toggleColor },
    { key: "viewDebugValues", element: toggleDebugValues },
  ];
  viewOverridePairs.forEach(({ element, key }) => {
    if(!element) return;
    const overrideValue = viewOverrides[key];
    if(typeof overrideValue !== "boolean") return;
    element.checked = overrideValue;
    if(typeof element.defaultChecked === "boolean"){
      element.defaultChecked = overrideValue;
    }
    if(key === "viewColor" && typeof isColorEnabled !== "undefined"){
      isColorEnabled = overrideValue;
    }
  });
  const homeCursorDirectionOverride = (typeof configDefaults.homeCursorDirection === "string")
    ? configDefaults.homeCursorDirection
    : null;
  if(homeCursorDirectionOverride && typeof window.setHomeCursor === "function"){
    window.setHomeCursor({ dir: homeCursorDirectionOverride });
  }
  const configuredQrData = (typeof configDefaults.qrData === "string") ? configDefaults.qrData : null;
  if(txtInput && configuredQrData !== null){
    txtInput.value = configuredQrData;
  }
  const DATA_DEFAULT_TEXT = configuredQrData !== null
    ? configuredQrData
    : (txtInput?.value ?? "Hello, World!");
  if(typeof window !== "undefined" && typeof window.refreshPatternIfPanelOpen === "function"){
    window.refreshPatternIfPanelOpen();
  }
  if(userCodeInput){
    userCodeInput.value = (typeof configDefaults.userCode === "string") ? configDefaults.userCode : "qrcode";
  }
  const rawStepSpeedOverride = configDefaults.stepSpeed;
  const normalizedStepSpeedOverride = (typeof rawStepSpeedOverride === "number" || typeof rawStepSpeedOverride === "string")
    ? String(rawStepSpeedOverride)
    : null;
  if(stepSpeed && normalizedStepSpeedOverride !== null){
    stepSpeed.value = normalizedStepSpeedOverride;
    stepSpeed.defaultValue = normalizedStepSpeedOverride;
  }
  const normalizeNumberSetting = (value) => {
    if(typeof value === "number" && Number.isFinite(value)){
      return value;
    }
    if(typeof value === "string"){
      const trimmed = value.trim();
      if(trimmed.length){
        const parsed = Number(trimmed);
        if(Number.isFinite(parsed)){
          return parsed;
        }
      }
    }
    return null;
  };
  const stepAnimationEnabledOverride = (typeof configDefaults.stepAnimationEnabled === "boolean")
    ? configDefaults.stepAnimationEnabled
    : true;
  const stepAnimationShowBorder = (typeof configDefaults.stepAnimationShowBorder === "boolean")
    ? configDefaults.stepAnimationShowBorder
    : true;
  const stepAnimationDurationMs = normalizeNumberSetting(configDefaults.stepAnimationDurationMs);
  const stepAnimationStartOpacity = normalizeNumberSetting(configDefaults.stepAnimationStartOpacity);
  const stepAnimationStartScale = normalizeNumberSetting(configDefaults.stepAnimationStartScale);
  const maskFadeDurationMs = normalizeNumberSetting(configDefaults.maskFadeDurationMs);
  const presentationRingEnabled = (typeof configDefaults.presentationPointerRingEnabled === "boolean")
    ? configDefaults.presentationPointerRingEnabled
    : true;
  const presentationRingDurationMs = normalizeNumberSetting(configDefaults.presentationPointerRingDurationMs);
  const presentationRingSize = normalizeNumberSetting(configDefaults.presentationPointerRingSize);
  const presentationRingScaleStart = normalizeNumberSetting(configDefaults.presentationPointerRingScaleStart);
  const presentationRingScaleEnd = normalizeNumberSetting(configDefaults.presentationPointerRingScaleEnd);
  const presentationRingColor = (typeof configDefaults.presentationPointerRingColor === "string")
    ? configDefaults.presentationPointerRingColor.trim()
    : "";
  const presentationRingShadowColor = (typeof configDefaults.presentationPointerRingShadowColor === "string")
    ? configDefaults.presentationPointerRingShadowColor.trim()
    : "";
  const presentationRingEase = (typeof configDefaults.presentationPointerRingEase === "string")
    ? configDefaults.presentationPointerRingEase.trim()
    : "";
  const presentationRingDuration = (presentationRingDurationMs !== null)
    ? Math.max(0, presentationRingDurationMs)
    : 400;
  const codeZoomStepPx = normalizeNumberSetting(configDefaults.codeZoomStepPx);
  const codeZoomMinPx = normalizeNumberSetting(configDefaults.codeZoomMinPx);
  const codeZoomMaxPx = normalizeNumberSetting(configDefaults.codeZoomMaxPx);
  const codeZoomHoldCount = normalizeNumberSetting(configDefaults.codeZoomHoldCount);
  const codeZoomBasePx = normalizeNumberSetting(configDefaults.codeZoomBasePx);
  const codeZoomLineHeightMinPx = normalizeNumberSetting(configDefaults.codeZoomLineHeightMinPx);
  const codeZoomLineHeightRatio = normalizeNumberSetting(configDefaults.codeZoomLineHeightRatio);
  const codeZoomLineHeightMaxOffsetPx = normalizeNumberSetting(configDefaults.codeZoomLineHeightMaxOffsetPx);
  if(typeof window !== "undefined"){
    window.stepAnimationEnabled = stepAnimationEnabledOverride;
    if(stepAnimationDurationMs !== null){
      window.stepAnimationDurationMs = Math.max(0, stepAnimationDurationMs);
    }
    if(maskFadeDurationMs !== null){
      window.maskFadeDurationMs = Math.max(0, maskFadeDurationMs);
    }
  }
  const rootStyle = document.documentElement?.style;
  if(rootStyle){
    const stepBorderValue = stepAnimationShowBorder
      ? "1px solid rgba(0,0,0,0.65)"
      : "0 solid transparent";
    rootStyle.setProperty("--cell-step-animation-border", stepBorderValue);
    if(stepAnimationDurationMs !== null){
      rootStyle.setProperty("--cell-step-animation-duration", `${Math.max(0, stepAnimationDurationMs)}ms`);
    }
    if(stepAnimationStartOpacity !== null){
      rootStyle.setProperty("--cell-step-animation-start-opacity", String(stepAnimationStartOpacity));
    }
    if(stepAnimationStartScale !== null){
      rootStyle.setProperty("--cell-step-animation-start-scale", String(stepAnimationStartScale));
    }
    if(presentationRingDurationMs !== null){
      rootStyle.setProperty("--presentation-ring-duration", `${Math.max(0, presentationRingDurationMs)}ms`);
    }
    if(presentationRingSize !== null){
      rootStyle.setProperty("--presentation-ring-size", `${Math.max(0, presentationRingSize)}px`);
    }
    if(presentationRingScaleStart !== null){
      rootStyle.setProperty("--presentation-ring-scale-start", String(presentationRingScaleStart));
    }
    if(presentationRingScaleEnd !== null){
      rootStyle.setProperty("--presentation-ring-scale-end", String(presentationRingScaleEnd));
    }
    if(presentationRingColor){
      rootStyle.setProperty("--presentation-ring-border", `3px solid ${presentationRingColor}`);
    }
    if(presentationRingShadowColor){
      rootStyle.setProperty("--presentation-ring-shadow", `0 0 0 3px ${presentationRingShadowColor}`);
    }
    if(presentationRingEase){
      rootStyle.setProperty("--presentation-ring-ease", presentationRingEase);
    }
  }
  const layoutSetHistoryVisibility = layoutUI.setHistoryVisibility || (() => {});
  const store = (window.appState && typeof window.appState.getStore === "function")
    ? window.appState.getStore({ historyVisible: false, patternPanelOpen: false, debugVisible: false })
    : null;
  const getHistoryVisible = () => (store ? Boolean(store.getState().historyVisible) : false);
  const getPatternPanelOpen = () => (store ? Boolean(store.getState().patternPanelOpen) : Boolean(dataPatternPanel?.open));
  const debugViewApply = (typeof debugUI.applyDebugVisibility === "function") ? debugUI.applyDebugVisibility : (() => {});
  const debugViewIsVisible = (typeof debugUI.isDebugVisible === "function") ? debugUI.isDebugVisible : (() => false);
  const getDebugVisible = () => (store ? Boolean(store.getState().debugVisible) : debugViewIsVisible());
  const isDebugVisible = () => getDebugVisible();
  const applyDebugVisibilityDom = (visible) => {
    debugViewApply(Boolean(visible));
  };

  const setPatternPanelOpen = (value) => {
    const target = Boolean(value);
    if(store){
      const current = Boolean(store.getState().patternPanelOpen);
      if(current === target) return;
      store.setState({ patternPanelOpen: target }, "patternPanelToggle");
      return;
    }
    if(dataPatternPanel && dataPatternPanel.open !== target){
      dataPatternPanel.open = target;
      try{
        dataPatternPanel.dispatchEvent(new Event("toggle"));
      }catch(_err){
        // ignore environments without Event
      }
    }
  };
  const handleStoreUpdate = (next) => {
    if(!next) return;
    if(typeof next.historyVisible === "boolean"){
      layoutSetHistoryVisibility(Boolean(next.historyVisible));
    }
    if(dataPatternPanel && typeof next.patternPanelOpen === "boolean"){
      const target = Boolean(next.patternPanelOpen);
      if(dataPatternPanel.open !== target){
        dataPatternPanel.open = target;
        try{
          dataPatternPanel.dispatchEvent(new Event("toggle"));
        }catch(_err){
          // ignore environments without Event
        }
      }
    }
    if(typeof next.debugVisible === "boolean"){
      const target = Boolean(next.debugVisible);
      applyDebugVisibilityDom(target);
    }
  };
  if(store){
    handleStoreUpdate(store.getState());
    store.subscribe(handleStoreUpdate);
  }
  const setHistoryVisibility = (visible) => {
    const target = Boolean(visible);
    if(store){
      store.setState({ historyVisible: target }, "historyVisibility");
    }else{
      layoutSetHistoryVisibility(target);
    }
  };
  const setDebugVisible = (value) => {
    const target = Boolean(value);
    if(store){
      const current = Boolean(store.getState().debugVisible);
      if(current === target) return;
      store.setState({ debugVisible: target }, "debugToggle");
      return;
    }
    applyDebugVisibilityDom(target);
  };
  const applyDebugVisibility = (visible) => {
    if(store){
      setDebugVisible(visible);
      return;
    }
    applyDebugVisibilityDom(visible);
  };
  if(typeof window.bindUiEvents === "function"){
    window.bindUiEvents({
      setHistoryVisibility,
      getHistoryVisible,
      setPatternPanelOpen,
    });
  }
  const getDebugPanel = () => debugUI.debugPanel;
  const renderHistoryList = (entries) => {
    if(typeof layoutUI.renderHistoryList === "function"){
      layoutUI.renderHistoryList(entries);
    }
  };
  if(!window.historyController){
    throw new Error("state/history-store.js must be loaded before main.js.");
  }
  const historyController = window.historyController;
  historyController.setRenderer(renderHistoryList);
  const getCurrentCodeValue = () => {
    return userCodeInput ? userCodeInput.value ?? "" : "";
  };
  historyController.setValueGetter(getCurrentCodeValue);
  const urlParams = urlState.params || new URLSearchParams(window.location.search || "");
  const presentationMode = urlParams.get("z") === "1";
  const {
    decodeDataParamValue,
    applyPatternOpenFromParam,
    applyDebugFromParam,
    applyHistoryFromParam,
    applySampleParam,
    applyCombinedStepParam,
    applyStepSpeedParam,
    applyUrlControlStates,
    buildStateUrl: buildStateUrlFromState,
    PARAM_KEYS = {},
  } = urlState;
  const {
    DATA: DATA_PARAM_KEY = "d",
    HISTORY: HISTORY_PARAM_KEY = "h",
    DEBUG: DEBUG_PARAM_KEY = "g",
    SAMPLES: SAMPLES_PARAM_KEY = "m",
    PATTERN_PANEL: PATTERN_PANEL_PARAM_KEY = "p",
    STEP_SPEED: STEP_SPEED_PARAM_KEY = "e",
    STEP_FLAGS: STEP_FLAGS_PARAM_KEY = "s",
    SKIP_EXISTING: SKIP_EXISTING_PARAM_KEY = "x",
    AUTO_AVOID_TIMING: TIMING_AUTO_PARAM_KEY = "t",
    USE_DIRECTION: USE_DIRECTION_PARAM_KEY = "useDirection",
  } = PARAM_KEYS;
  const initialDebugParamPresent = urlParams.has(DEBUG_PARAM_KEY);
  const defaultHistoryVisible = (typeof configDefaults.historyVisible === "boolean")
    ? configDefaults.historyVisible
    : getHistoryVisible();
  let defaultDebugVisible = (typeof configDefaults.debugVisible === "boolean")
    ? configDefaults.debugVisible
    : isDebugVisible();
  const defaultPatternOpen = (typeof configDefaults.patternPanelOpen === "boolean")
    ? configDefaults.patternPanelOpen
    : getPatternPanelOpen();
  const defaultStepMode = (typeof configDefaults.skipMode === "boolean")
    ? configDefaults.skipMode
    : (stepMode ? (typeof stepMode.defaultChecked === "boolean" ? stepMode.defaultChecked : Boolean(stepMode.checked)) : false);
  const defaultStepSkipFunctions = (typeof configDefaults.stepSkipDataOnly === "boolean")
    ? configDefaults.stepSkipDataOnly
    : (stepSkipFunctions ? (typeof stepSkipFunctions.defaultChecked === "boolean" ? stepSkipFunctions.defaultChecked : Boolean(stepSkipFunctions.checked)) : false);
  const defaultStepSpeed = normalizedStepSpeedOverride ?? (stepSpeed ? (stepSpeed.defaultValue ?? stepSpeed.value ?? "") : "");
  if(stepMode){
    stepMode.checked = defaultStepMode;
    if(typeof stepMode.defaultChecked === "boolean"){
      stepMode.defaultChecked = defaultStepMode;
    }
  }
  if(stepSkipFunctions){
    stepSkipFunctions.checked = defaultStepSkipFunctions;
    if(typeof stepSkipFunctions.defaultChecked === "boolean"){
      stepSkipFunctions.defaultChecked = defaultStepSkipFunctions;
    }
  }
  const defaultSkipExistingCells = (typeof configDefaults.skipExistingCells === "boolean")
    ? configDefaults.skipExistingCells
    : false;
  const defaultAutoAvoidTiming = (typeof configDefaults.autoAvoidTiming === "boolean")
    ? configDefaults.autoAvoidTiming
    : false;
  const defaultUseDirection = (typeof configDefaults.useDirection === "boolean")
    ? configDefaults.useDirection
    : false;
  const resolveMaskIndex = (value, fallback = 0) => {
    const numeric = Number(value);
    if(Number.isFinite(numeric)){
      const truncated = Math.trunc(numeric);
      if(truncated >= 0 && truncated <= 7){
        return truncated;
      }
    }
    return fallback;
  };
  const defaultMaskIndex = resolveMaskIndex(configDefaults.defaultMask, 0);
  const skipExistingFromParam = urlParams.has(SKIP_EXISTING_PARAM_KEY)
    ? urlState.stringifyBool(urlParams.get(SKIP_EXISTING_PARAM_KEY))
    : null;
  const skipExistingCells = (skipExistingFromParam !== null)
    ? skipExistingFromParam
    : defaultSkipExistingCells;
  window.skipExistingCells = skipExistingCells;
  const autoAvoidTimingFromParam = urlParams.has(TIMING_AUTO_PARAM_KEY)
    ? urlState.stringifyBool(urlParams.get(TIMING_AUTO_PARAM_KEY))
    : null;
  const autoAvoidTiming = (autoAvoidTimingFromParam !== null)
    ? autoAvoidTimingFromParam
    : defaultAutoAvoidTiming;
  window.autoAvoidTiming = autoAvoidTiming;
  const useDirectionFromParam = urlParams.has(USE_DIRECTION_PARAM_KEY)
    ? urlState.stringifyBool(urlParams.get(USE_DIRECTION_PARAM_KEY))
    : null;
  const useDirection = (useDirectionFromParam !== null)
    ? useDirectionFromParam
    : defaultUseDirection;
  window.useDirection = useDirection;
  if(document && document.body){
    document.body.classList.toggle("direction-disabled", !useDirection);
  }
  const ensureUserCodeCaretVisible = () => {
    if(!userCodeInput) return;
    const pos = typeof userCodeInput.selectionEnd === "number" ? userCodeInput.selectionEnd : 0;
    const text = userCodeInput.value ?? "";
    const prefix = text.slice(0, pos);
    const lineIndex = (prefix.match(/\n/g) || []).length;
    const computedStyle = window.getComputedStyle ? window.getComputedStyle(userCodeInput) : null;
    const parsedLineHeight = computedStyle ? parseFloat(computedStyle.lineHeight) : NaN;
    const parsedFontSize = computedStyle ? parseFloat(computedStyle.fontSize) : NaN;
    const lineHeight = Number.isFinite(parsedLineHeight) && parsedLineHeight > 0
      ? parsedLineHeight
      : (Number.isFinite(parsedFontSize) && parsedFontSize > 0 ? parsedFontSize * 1.25 : 20);
    const clientHeight = userCodeInput.clientHeight;
    if(clientHeight <= 0) return;
    const targetTop = lineIndex * lineHeight;
    const viewTop = userCodeInput.scrollTop;
    const viewBottom = viewTop + clientHeight;
    const caretBottom = targetTop + lineHeight;
    const maxScroll = Math.max(0, userCodeInput.scrollHeight - clientHeight);
    if(caretBottom > viewBottom){
      userCodeInput.scrollTop = Math.min(maxScroll, caretBottom - clientHeight + 4);
    }else if(targetTop < viewTop){
      userCodeInput.scrollTop = Math.max(0, targetTop - 4);
    }
  };
  const requestRender = (reason) => {
    const cycle = window.renderCycle;
    if(cycle && typeof cycle.requestRender === "function"){
      cycle.requestRender(reason);
      return;
    }
    if(typeof window.flushRender === "function"){
      window.flushRender();
    }
  };
  applyPatternOpenFromParam({ dataPatternPanel, setPatternPanelOpen });
  applyDebugFromParam({ debugPanel: getDebugPanel(), setDebugVisible });
  applyHistoryFromParam({ codePanel, setHistoryVisibility });
  applySampleParam({ codePanel });
  if(!urlParams.has(PATTERN_PANEL_PARAM_KEY)){
    setPatternPanelOpen(defaultPatternOpen);
  }
  if(!urlParams.has(DEBUG_PARAM_KEY)){
    setDebugVisible(defaultDebugVisible);
  }
  if(!urlParams.has(HISTORY_PARAM_KEY)){
    setHistoryVisibility(defaultHistoryVisible);
  }
  if(!btnGenerate || !btnInit) return;
  const executionStatusEl = document.getElementById("executionStatus");
  const executionStatusTextEl = document.getElementById("executionStatusText");
  const executionStatusCursorEl = document.getElementById("executionStatusCursor");
  const isExecutionRunning = () => executionStatusEl ? executionStatusEl.classList.contains("status-running") : false;
  const executionStatusLabels = {
    stopped: "待機中",
    running: "作成中",
    finished: "作成完了",
    error: "エラー",
    warning: "警告",
  };
  let lastExecutionError = null;
  let pendingStopReason = null;
  let stopReasonLocked = false;
  const extractUnknownCommandWord = (message) => {
    if(!message) return "";
    const text = String(message).trim();
    if(!text) return "";
    const match = text.match(/(?:不明なコマンド|Unknown command)[:：]?\s*([^\s,、。.]+)/i);
    return match ? match[1] : "";
  };
  const normalizeStatusDetail = (detail) => {
    if(!detail || typeof detail !== "object") return null;
    const l2 = (typeof detail.l2 === "string") ? detail.l2 : "";
    const l3 = (typeof detail.l3 === "string") ? detail.l3 : "";
    if(!l2) return null;
    return { l2, l3 };
  };
  const buildExecutionStatusText = (state, message, detail) => {
    const label = executionStatusLabels[state] || "";
    if(state === "error"){
      const token = extractUnknownCommandWord(message);
      if(token){
        return `${token}はコマンドとして認識できませんでした。`;
      }
      const resolved = message ? String(message).trim() : "";
      return resolved ? `${label}：${resolved}` : label;
    }
    if(state === "stopped" && !detail){
      return `${label}：作成できます。`;
    }
    const normalized = normalizeStatusDetail(detail);
    if(normalized){
      const resolvedL3 = normalized.l3 || "作成中";
      return `${normalized.l2}：${resolvedL3}`;
    }
    if(detail){
      return `${label}：${detail}`;
    }
    return label;
  };
  const setExecutionStatus = (state, message, detail) => {
    if(!executionStatusEl) return;
    if(state !== "stopped"){
      pendingStopReason = null;
      stopReasonLocked = false;
    }else if(detail){
      if(!stopReasonLocked || detail === pendingStopReason){
        pendingStopReason = detail;
      }
    }else if(pendingStopReason){
      detail = pendingStopReason;
    }
    const target = executionStatusTextEl || executionStatusEl;
    target.textContent = buildExecutionStatusText(state, message, detail);
    executionStatusEl.className = `execution-status status-${state}`;
  };
  const INPUT_MAX_LENGTH = Number(txtInput?.getAttribute("maxlength")) || 32;
  const NON_ASCII_REGEX = /[^\u0000-\u007F]/;
  const normalizeInputBeforeRun = () => {
    if(!txtInput) return { ok: true };
    let value = (typeof txtInput.value === "string") ? txtInput.value : "";
    if(value.length > INPUT_MAX_LENGTH){
      value = value.slice(0, INPUT_MAX_LENGTH);
      txtInput.value = value;
      try{
        txtInput.dispatchEvent(new Event("input", { bubbles: true }));
      }catch(_err){
        // ignore environments without Event
      }
    }
    if(NON_ASCII_REGEX.test(value)){
      const message = "半角英数字以外が含まれています。";
      lastExecutionError = message;
      setExecutionStatus("error", message);
      return { ok: false };
    }
    return { ok: true };
  };
  setExecutionStatus("stopped");
  let inputLocked = false;
  let inputLockToken = 0;
  const setInputLock = (locked) => {
    inputLocked = locked;
    if(txtInput) txtInput.readOnly = locked;
    if(userCodeInput) userCodeInput.readOnly = locked;
    if(btnClear) btnClear.disabled = locked;
    if(btnClearCode) btnClearCode.disabled = locked;
    if(btnCopyCode) btnCopyCode.disabled = locked;
    if(btnPasteCode) btnPasteCode.disabled = locked;
    if(btnSampleDropdown) btnSampleDropdown.disabled = locked;
    const sampleButtons = document.querySelectorAll(".code-debug-btn");
    sampleButtons.forEach((btn) => {
      btn.disabled = locked;
    });
    const sampleDropdown = document.getElementById("sampleDropdown");
    if(locked && sampleDropdown){
      sampleDropdown.classList.remove("is-open");
    }
    if(codeHistoryList){
      codeHistoryList.classList.toggle("is-disabled", locked);
    }
  };
  if(userCodeInput){
    const initialCode = (typeof userCodeInput.value === "string") ? userCodeInput.value.trim() : "";
    btnGenerate.disabled = !initialCode;
  }

  const API_STATUS_DESCRIPTIONS = {
    resetCommand: { l2: "リセット", l3: "盤面" },
    drawQRCode: { l2: "QRコード描画", l3: "QRコードを描画しています。" },
    drawBasePatterns: { l2: "基本パターン", l3: "基本パターンを描画しています。" },
    drawDataPatterns: { l2: "データパターン", l3: "データパターンを描画しています。" },
    drawFinderPatterns: { l2: "基本パターン", l3: "ファインダーパターンを描画しています。" },
    drawTimingPatterns: { l2: "基本パターン", l3: "タイミングパターンを描画しています。" },
    drawAlignmentPatterns: { l2: "基本パターン", l3: "アライメントパターンを描画しています。" },
    drawDarkModulePatterns: { l2: "基本パターン", l3: "ダークモジュールを描画しています。" },
    drawFormatPatterns: { l2: "基本パターン", l3: "フォーマットパターンを描画しています。" },
    applyMaskFormat: { l2: "マスク", l3: "フォーマットパターンを更新しています。" },
    verify: { l2: "QRコード検証", l3: "作成中" },
    applyMask: (maskIndex) => ({ l2: "マスク", l3: `マスク${maskIndex}を適用しています。` }),
  };
  const DATA_PATTERN_STAGE_MESSAGES = {
    [window.BIT_INFO_MODE]: { l2: "データパターン", l3: "種別パターンを描画しています。" },
    [window.BIT_INFO_LENGTH]: { l2: "データパターン", l3: "文字数パターンを描画しています。" },
    [window.BIT_INFO_CHAR]: { l2: "データパターン", l3: "文字パターンを描画しています。" },
    [window.BIT_INFO_TERMINATOR]: { l2: "データパターン", l3: "終端パターンを描画しています。" },
    [window.BIT_INFO_PADDING]: { l2: "データパターン", l3: "パディングパターンを描画しています。" },
    [window.BIT_INFO_PARITY]: { l2: "データパターン", l3: "パリティパターンを描画しています。" },
  };
  let currentDataPatternStage = null;
  const updateDataPatternStatus = (kind) => {
    if(typeof isStepModeOn !== "function" || !isStepModeOn()) return false;
    const message = DATA_PATTERN_STAGE_MESSAGES[kind];
    if(!message) return false;
    if(currentDataPatternStage === message) return false;
    currentDataPatternStage = message;
    setExecutionStatus("running", undefined, message);
    return true;
  };
  window.updateDataPatternStatus = updateDataPatternStatus;
  const updateExecutionStatusCursor = () => {
    if(!executionStatusCursorEl) return;
    let cursorTextEl = executionStatusCursorEl.querySelector(".execution-status-cursor-text");
    let cursorCellEl = executionStatusCursorEl.querySelector(".execution-status-cell");
    let cursorInlineLabelEl = executionStatusCursorEl.querySelector(".execution-status-cursor-inline-label");
    let nextLabelEl = executionStatusCursorEl.querySelector(".execution-status-next-label");
    let nextListEl = executionStatusCursorEl.querySelector(".execution-status-next-list");
    let cursorBodyEl = executionStatusCursorEl.querySelector(".execution-status-cursor-body");
    if(!cursorTextEl){
      cursorTextEl = document.createElement("span");
      cursorTextEl.className = "execution-status-cursor-text";
    }
    if(!cursorCellEl){
      cursorCellEl = document.createElement("span");
      cursorCellEl.className = "execution-status-cell";
    }
    if(!cursorInlineLabelEl){
      cursorInlineLabelEl = document.createElement("span");
      cursorInlineLabelEl.className = "execution-status-label execution-status-label-chip execution-status-cursor-inline-label";
      cursorInlineLabelEl.dataset.labelKind = "cursor";
    }
    if(!nextLabelEl){
      nextLabelEl = document.createElement("span");
      nextLabelEl.className = "execution-status-label execution-status-label-chip execution-status-next-label";
      nextLabelEl.dataset.labelKind = "next";
    }
    const NEXT_CELL_COUNT = 4;
    if(!nextListEl){
      nextListEl = document.createElement("span");
      nextListEl.className = "execution-status-next-list";
    }
    if(nextListEl.childElementCount !== NEXT_CELL_COUNT){
      nextListEl.textContent = "";
      for(let i = 0; i < NEXT_CELL_COUNT; i++){
        const cell = document.createElement("span");
        cell.className = "execution-status-next-cell";
        nextListEl.append(cell);
      }
    }
    const nextCells = Array.from(nextListEl.children);
    if(!cursorBodyEl){
      cursorBodyEl = document.createElement("span");
      cursorBodyEl.className = "execution-status-cursor-body";
    }
    const switchIndicatorGroupEl = ensureSwitchIndicators();
    cursorInlineLabelEl.textContent = "Cursor";
    cursorBodyEl.textContent = "";
    const cursorBodyChildren = [];
    if(switchIndicatorGroupEl){
      cursorBodyChildren.push(switchIndicatorGroupEl);
    }
    cursorBodyChildren.push(
      cursorInlineLabelEl,
      cursorTextEl,
      cursorCellEl,
      nextLabelEl,
      nextListEl,
    );
    cursorBodyEl.append(...cursorBodyChildren);
    executionStatusCursorEl.textContent = "";
    executionStatusCursorEl.append(cursorBodyEl);
    let cursorVisualEl = cursorCellEl.querySelector(".execution-status-visual-cursor");
    if(!cursorVisualEl){
      cursorVisualEl = document.createElement("span");
      cursorVisualEl.className = "execution-status-visual-cursor";
      cursorCellEl.append(cursorVisualEl);
    }
    const colorMap = {
      red: ["var(--col-red-light)", "var(--col-red-dark)"],
      blue: ["var(--col-blue-light)", "var(--col-blue-dark)"],
      green: ["var(--col-green-light)", "var(--col-green-dark)"],
      yellow: ["var(--col-yellow-light)", "var(--col-yellow-dark)"],
      purple: ["var(--col-purple-light)", "var(--col-purple-dark)"],
      orange: ["var(--col-orange-light)", "var(--col-orange-dark)"],
      gray: ["var(--col-gray-light)", "var(--col-gray-dark)"],
      format: ["var(--col-format-blue-light)", "var(--col-format-blue-dark)"],
      black: ["var(--col-black-light)", "var(--col-black-dark)"],
    };
    const resetNextCell = (cellEl) => {
      if(!cellEl) return;
      cellEl.style.backgroundColor = "#ffffff";
      cellEl.style.borderColor = "#999999";
      cellEl.style.boxShadow = "";
    };
    const applyNextCellInfo = (cellEl, info) => {
      if(!cellEl) return;
      if(!info || typeof info.kind !== "number" || typeof info.bit !== "number"){
        resetNextCell(cellEl);
        return;
      }
      const colName = (typeof window.colorsForKind === "function")
        ? window.colorsForKind(info.kind)
        : "black";
      const resolved = colorMap[colName] || colorMap.black;
      const bitIsBlack = info.bit === 1;
      const fill = bitIsBlack ? resolved[1] : resolved[0];
      const border = bitIsBlack ? resolved[0] : resolved[1];
      cellEl.style.backgroundColor = fill;
      cellEl.style.borderColor = border;
      cellEl.style.boxShadow = "";
    };
    const ref = (typeof window.cellRefFromRowCol === "function")
      ? window.cellRefFromRowCol(cursorPos.row, cursorPos.col)
      : "";
    const rowText = String(cursorPos.row).padStart(2, " ");
    const colText = String(cursorPos.col).padStart(2, " ");
    const directionEnabled = useDirection === true;
    const dirSymbol = (() => {
      switch(cursorPos.dir){
        case DIR_UP: return "▲";
        case DIR_RIGHT: return "▶";
        case DIR_DOWN: return "▼";
        case DIR_LEFT: return "◀";
        default: return "▲";
      }
    })();
    const dirName = (() => {
      switch(cursorPos.dir){
        case DIR_UP: return "up";
        case DIR_RIGHT: return "right";
        case DIR_DOWN: return "down";
        case DIR_LEFT: return "left";
        default: return "up";
      }
    })();
    cursorInlineLabelEl.textContent = "Cursor";
    cursorTextEl.textContent = `${ref}(${rowText},${colText})`;
    if(directionEnabled){
      cursorVisualEl.setAttribute("data-arrow", dirSymbol);
      cursorVisualEl.setAttribute("data-dir", dirName);
    }else{
      cursorVisualEl.removeAttribute("data-arrow");
      cursorVisualEl.removeAttribute("data-dir");
    }
    cursorVisualEl.style.setProperty("--cursor-color", "#e60000");
    const guideCol = document.querySelector(".guide-col");
    if(guideCol){
      const spans = guideCol.querySelectorAll("span");
      spans.forEach((span, index) => {
        span.classList.toggle("is-active", index === cursorPos.col - 1);
      });
    }
    const guideRow = document.querySelector(".guide-row");
    if(guideRow){
      const spans = guideRow.querySelectorAll("span");
      spans.forEach((span, index) => {
        span.classList.toggle("is-active", index === cursorPos.row - 1);
      });
    }
    const currentValue = (typeof window.getCell === "function")
      ? window.getCell(cursorPos.row, cursorPos.col)
      : null;
    const currentKind = (typeof window.bitKind === "function" && typeof currentValue === "number")
      ? window.bitKind(currentValue)
      : (typeof currentValue === "number" ? Math.abs(currentValue) : null);
    const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : -1;
    if(typeof currentKind === "number" && currentKind !== unplacedKind){
      const currentColor = (typeof window.colorsForKind === "function")
        ? window.colorsForKind(currentKind)
        : "black";
      const resolved = colorMap[currentColor] || colorMap.black;
      const bitIsBlack = (typeof window.isBlackBit === "function")
        ? window.isBlackBit(currentValue)
        : currentValue > 0;
      const fill = bitIsBlack ? resolved[1] : resolved[0];
      const border = bitIsBlack ? resolved[0] : resolved[1];
      cursorCellEl.style.backgroundColor = fill;
      cursorCellEl.style.borderColor = border;
      cursorCellEl.style.boxShadow = "";
    }else{
      cursorCellEl.style.backgroundColor = "#ffffff";
      cursorCellEl.style.borderColor = "#999999";
      cursorCellEl.style.boxShadow = "";
    }
    nextLabelEl.textContent = "Next";
    const basePatternActive = Boolean(window.isDrawingBasePattern);
    let nextInfos = [];
    if(basePatternActive){
      if(typeof window.getNextBasePatternInfos === "function"){
        nextInfos = window.getNextBasePatternInfos(NEXT_CELL_COUNT) || [];
      }
    }else if(typeof window.getNextDataInfos === "function"){
      nextInfos = window.getNextDataInfos(NEXT_CELL_COUNT) || [];
    }else{
      const single = (typeof window.getNextDataInfo === "function") ? window.getNextDataInfo() : null;
      if(single) nextInfos = [single];
    }
    for(let i = 0; i < nextCells.length; i++){
      applyNextCellInfo(nextCells[i], nextInfos[i]);
    }
  };
  if(typeof window !== "undefined"){
    window.updateExecutionStatusCursor = updateExecutionStatusCursor;
    window.isDrawingBasePattern = false;
    window.basePatternLookahead = [];
    window.setBasePatternLookahead = (infos) => {
      window.basePatternLookahead = Array.isArray(infos) ? infos : [];
    };
    window.getNextBasePatternInfos = (count = 4) => {
      const list = Array.isArray(window.basePatternLookahead) ? window.basePatternLookahead : [];
      return list.slice(0, Math.max(0, count));
    };
  }

  let clearNoiseLayer = () => {};
  let isQRCodeReadable = false;
  let noiseSingleClickEnabled = false;
  const noiseModeHintEl = document.getElementById("noiseModeHint");
  const shouldShowNoiseHint = () => isQRCodeReadable && noiseSingleClickEnabled;
  const updateNoiseModeHint = () => {
    if(!noiseModeHintEl) return;
    noiseModeHintEl.classList.toggle("visible", shouldShowNoiseHint());
  };
  const setQRCodeReadable = (value) => {
    isQRCodeReadable = Boolean(value);
    noiseSingleClickEnabled = false;
    updateNoiseModeHint();
  };
  const setupNoiseScatter = () => {
    const gridArea = document.querySelector(".grid-area");
    if(!gridArea) return;
    let noiseLayer = gridArea.querySelector(".noise-layer");
    if(!noiseLayer){
      noiseLayer = document.createElement("div");
      noiseLayer.className = "noise-layer";
      gridArea.append(noiseLayer);
    }
    const palette = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#5ac8fa", "#007aff", "#af52de", "#ff2d55"];
    const MAX_DOTS = 320;
    const noiseShotStack = [];
    let noiseDotCount = 0;
    clearNoiseLayer = () => {
      noiseLayer.textContent = "";
      noiseShotStack.length = 0;
      noiseDotCount = 0;
    };
    const addNoiseDot = (container, x, y, size, color) => {
      const dot = document.createElement("span");
      dot.className = "noise-dot";
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.left = `${x - size / 2}px`;
      dot.style.top = `${y - size / 2}px`;
      dot.style.backgroundColor = color;
      container.append(dot);
    };
    const trimNoiseShots = () => {
      while(noiseDotCount > MAX_DOTS && noiseShotStack.length){
        const oldest = noiseShotStack.shift();
        const removedCount = Number(oldest?.dataset?.count) || 0;
        noiseDotCount = Math.max(0, noiseDotCount - removedCount);
        oldest.remove();
      }
    };
    const removeLastNoiseShot = () => {
      const last = noiseShotStack.pop();
      if(!last) return;
      const removedCount = Number(last.dataset.count) || 0;
      noiseDotCount = Math.max(0, noiseDotCount - removedCount);
      last.remove();
    };
    const shootNoiseAt = (ev) => {
      if(!isQRCodeReadable) return false;
      const rect = gridArea.getBoundingClientRect();
      const width = rect.width || 0;
      const height = rect.height || 0;
      if(width <= 0 || height <= 0) return false;
      const centerX = ev.clientX - rect.left;
      const centerY = ev.clientY - rect.top;
      const minDimension = Math.min(width, height);
      const maxGridRadius = Math.min((minDimension / 25) * 6, 260);
      const radius = Math.max(24, Math.min(maxGridRadius, minDimension * 0.15));
      const count = Math.max(16, Math.min(48, Math.round((width * height) / 18000)));
      const minSize = Math.max(6, Math.round(minDimension * 0.03));
      const maxSize = Math.max(minSize + 6, Math.round(minDimension * 0.168));
      const shotGroup = document.createElement("span");
      shotGroup.className = "noise-shot";
      noiseLayer.append(shotGroup);
      let shotCount = 0;
      for(let i = 0; i < count; i++){
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        let x = centerX + Math.cos(angle) * dist;
        let y = centerY + Math.sin(angle) * dist;
        const size = minSize + Math.random() * (maxSize - minSize);
        x = Math.max(0, Math.min(width, x));
        y = Math.max(0, Math.min(height, y));
        const color = palette[Math.floor(Math.random() * palette.length)];
        addNoiseDot(shotGroup, x, y, size, color);
        shotCount += 1;
      }
      shotGroup.dataset.count = String(shotCount);
      noiseShotStack.push(shotGroup);
      noiseDotCount += shotCount;
      trimNoiseShots();
      return true;
    };
    const handleDoubleClick = (ev) => {
      if(shootNoiseAt(ev)){
        noiseSingleClickEnabled = true;
        updateNoiseModeHint();
      }
    };
    gridArea.addEventListener("dblclick", handleDoubleClick);
    gridArea.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      removeLastNoiseShot();
    });
    gridArea.addEventListener("click", (ev) => {
      if(isQRCodeReadable && noiseSingleClickEnabled){
        shootNoiseAt(ev);
      }
    });
  };
  setupNoiseScatter();

  const describeApiStatus = (name, payload) => {
    const entry = API_STATUS_DESCRIPTIONS[name];
    if(typeof entry === "function"){
      return entry(payload);
    }
    return entry || null;
  };

  const BASIC_PATTERN_STATUS_NAMES = new Set([
    "drawBasePatterns",
    "drawFinderPatterns",
    "drawTimingPatterns",
    "drawAlignmentPatterns",
    "drawDarkModulePatterns",
    "drawFormatPatterns",
  ]);
  const STEP_STATUS_NAMES = new Set([
    "drawQRCode",
    "drawBasePatterns",
    "drawDataPatterns",
    "drawFinderPatterns",
    "drawTimingPatterns",
    "drawAlignmentPatterns",
    "drawDarkModulePatterns",
    "drawFormatPatterns",
    "applyMask",
    "applyMaskFormat",
  ]);
  const shouldShowStepStatus = (name) => {
    if(typeof isStepModeOn !== "function" || !isStepModeOn()) return false;
    if(!STEP_STATUS_NAMES.has(name)) return false;
    if(stepSkipFunctions && stepSkipFunctions.checked && BASIC_PATTERN_STATUS_NAMES.has(name)){
      return false;
    }
    return true;
  };
  const showApiStatus = (name, payload) => {
    if(!shouldShowStepStatus(name)) return null;
    const detail = describeApiStatus(name, payload);
    if(detail){
      setExecutionStatus("running", undefined, detail);
    }
    return detail;
  };

  // Prevent accidental text selection or drag on buttons
  const allButtons = document.querySelectorAll("button");
  for(const btn of allButtons){
    btn.setAttribute("draggable", "false");
    btn.addEventListener("dragstart", (ev) => ev.preventDefault());
    btn.addEventListener("selectstart", (ev) => ev.preventDefault());
    btn.addEventListener("mousedown", (ev) => {
      if(ev.detail > 1){
        ev.preventDefault();
      }
    });
  }

  // Relative directions (turn relative to current)
  const globalScope = (typeof window !== "undefined")
    ? window
    : (typeof globalThis !== "undefined" ? globalThis : null);
  if(!globalScope){
    throw new Error("board.js must be loaded before main.js. Global scope is not available.");
  }
  const requireUtils = globalScope.requireUtils;
  if(!requireUtils){
    throw new Error("core/require.js must be loaded before main.js.");
  }
  requireUtils.requireGlobalKeys(globalScope, REQUIRED_KEYS, (key) => `board.js must be loaded before main.js. Required constant '${key}' is not defined.`);
  const {
    DIR_UP,
    DIR_RIGHT,
    DIR_DOWN,
    DIR_LEFT,
    DIR_FRONT,
    DIR_BACK,
    RENDER_IMMEDIATE,
    RENDER_BUFFERED,
    STEP_DELAY_MS,
    ABORT_ERR,
    RESET_DELAY_MS,
  } = globalScope;
  const FORMAT_L = [
    30660, // mask 0
    29427, // mask 1
    32170, // mask 2
    30877, // mask 3
    26159, // mask 4
    25368, // mask 5
    27713, // mask 6
    26998, // mask 7
  ];
  let isStepFillRunning = false;
  let runId = 0;
  let maskRunId = 0;
  const originalSetRenderMode = window.setRenderMode;
  let renderModeState = RENDER_IMMEDIATE;
  const setRenderMode = (mode) => {
    const normalized = mode === RENDER_BUFFERED ? RENDER_BUFFERED : RENDER_IMMEDIATE;
    renderModeState = normalized;
    if(typeof originalSetRenderMode === "function"){
      originalSetRenderMode(mode);
    }
    return normalized;
  };
  const ctx = {
    get runId(){ return runId; },
    set runId(value){ runId = value; return runId; },
    get maskRunId(){ return maskRunId; },
    set maskRunId(value){ maskRunId = value; return maskRunId; },
    get isStepFillRunning(){ return isStepFillRunning; },
    set isStepFillRunning(value){ isStepFillRunning = value; return isStepFillRunning; },
    get renderMode(){ return renderModeState; },
    set renderMode(value){ renderModeState = value; return renderModeState; },
  };
  ctx.setRenderMode = setRenderMode;
  ctx.isStepModeOn = isStepModeOn;
  ctx.stepSkipFunctions = stepSkipFunctions;
  ctx.requestRender = requestRender;
  ctx.RENDER_IMMEDIATE = RENDER_IMMEDIATE;
  ctx.RENDER_BUFFERED = RENDER_BUFFERED;
  ctx.ABORT_ERR = ABORT_ERR;
  ctx.RESET_DELAY_MS = RESET_DELAY_MS;
  window.setRenderMode = setRenderMode;
  ctx.helpers = ctx.helpers || {};
  if(!window.domainQrParams){
    throw new Error("domain/qr-params.js must be loaded before main.js.");
  }
  const domainQrParams = window.domainQrParams;
  const applyDataParam = (typeof domainQrParams.applyDataParam === "function")
    ? (options) => domainQrParams.applyDataParam(options)
    : () => false;
  ctx.FORMAT_L = FORMAT_L;
  const runIdAccessor = {
    get: () => runId,
    set: (value) => { runId = value; return runId; },
    increment: () => ++runId,
  };
  const H = ctx.helpers;
  const {
    syncStepControls,
    getStepDelay,
    stepDelayAbort,
    makeStepThenable,
    shouldStepFunctions,
  } = typeof createStepControl === "function"
    ? createStepControl({
      stepMode,
      stepSkipFunctions,
      stepSpeed,
      stepSpeedLabel,
      isStepModeOn,
      requestAnimationFrame,
      sleep,
      ABORT_ERR,
      runIdAccessor,
      defaultStepDelay: STEP_DELAY_MS,
    })
    : {
      syncStepControls: () => {},
      getStepDelay: () => 0,
      stepDelayAbort: () => Promise.resolve(true),
      makeStepThenable: () => true,
      shouldStepFunctions: () => false,
    };
  if(typeof window !== "undefined"){
    window.shouldStepFunctions = shouldStepFunctions;
  }
  const bumpPauseAbortVersion = () => {
    if(typeof window === "undefined") return;
    const current = Number.isFinite(window.__pauseAbortVersion) ? window.__pauseAbortVersion : 0;
    window.__pauseAbortVersion = current + 1;
  };
  function stopCurrentRun({ resetCursor: resetCursorFlag = false, clear = false, reason = "", resetData: resetDataFlag = true } = {}){
    bumpPauseAbortVersion();
    ctx.runId++;
    ctx.isStepFillRunning = false;
    setInputLock(false);
    let resetResult;
    if(clear){
      resetResult = resetBoardState({ resetData: resetDataFlag });
    }
    if(resetCursorFlag){
      resetCursor();
    }
    setRenderMode(RENDER_IMMEDIATE);
    if(reason){
      pendingStopReason = reason;
      stopReasonLocked = true;
      setExecutionStatus("stopped", undefined, reason);
    }else if(clear){
      pendingStopReason = null;
      stopReasonLocked = false;
    }
    return resetResult;
  }

  let cellsInitialized = false;
function clearBoardSurface({ resetData: resetDataFlag = true } = {}){
  setQRCodeReadable(false);
  clearNoiseLayer();
    const cells = document.querySelectorAll(".qr-cells .cell");
    if(!cells || cells.length === 0) return false;
    const unplacedValue = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : UNPLACED_KIND;
    for(const cell of cells){
      cell.className = "cell";
      cell.dataset.debugVal = String(unplacedValue);
      cell.style.setProperty("--debug-color", "#000000");
      cell.style.setProperty("--debug-shadow", "0 0 2px #fff, 0 0 4px #fff");
    }
    cellStates.clear();
    for(let r = 0; r < BOARD_ROWS; r++){
      for(let c = 0; c < BOARD_COLS; c++){
        boardMatrix[r][c] = UNPLACED_KIND;
      }
    }
    timingRowIndex = 0;
    if(typeof window === "undefined" || typeof window.setTimingColIndex !== "function"){
      throw new Error("setTimingColIndex is required");
    }
    window.setTimingColIndex(0);
    hasFormatPattern = false;
  if(resetDataFlag && typeof resetData === "function"){
    resetData();
  }
  resetSwitchStates();
  return true;
}

    function clearBoard(){
      window.logEvent("clearBoard", "", "盤面をクリア");
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
    window.logEvent("resetQRCode", `abort=${abortRun},forceImmediate=${forceImmediate},stopStep=${stopStep}`, "盤面状態をリセット");
    if(abortRun){
      ctx.runId++;
      ctx.maskRunId++;
    }
    if(stopStep){
      ctx.isStepFillRunning = false;
    }
    if(forceImmediate){
      setRenderMode(RENDER_IMMEDIATE);
    }
    if(!clearBoardSurface({ resetData: resetDataFlag })){
      return;
    }
    resetCursor();
    pendingCursor = null;
    requestRender("resetBoardState");
    if(typeof requestAnimationFrame === "function"){
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
    window.logEvent("resetQRCode", "", "盤面状態をリセット");
    if(!clearBoardSurface()){
      return false;
    }
    resetCursor();
    pendingCursor = null;
    requestRender("resetQRCode");
    if(typeof requestAnimationFrame === "function"){
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
  ctx.resetQRCode = resetQRCode;
  ctx.resetCursor = resetCursor;

  async function resetCommand(options = {}){
    window.logEvent("resetCommand", "", "盤面をリセット");
    showApiStatus("resetCommand");
    resetBoardState(options);
    resetSwitchStates();
    requestRender("resetCommand");
    if(typeof requestAnimationFrame === "function"){
      await new Promise((resolve) => requestAnimationFrame(() => resolve(true)));
    }
    await sleep(RESET_DELAY_MS);
  }

  // Guarded cursor update for async flows: only applies if runToken matches current runId
  function updateCursorIfRun(runToken, row, col, dir = cursorPos.dir){
    if(runToken !== runId) return false;
    return updateCursor(row, col, dir);
  }

  const stepFillAccessor = {
    get: () => isStepFillRunning,
    set: (value) => { isStepFillRunning = value; },
  };

  const setLastExecutionError = (value) => { lastExecutionError = value; };
  const {
    syncParsedCode,
    validateRunnerSyntax,
    runUserCode,
    runUserCodeWithStep,
  } = typeof createUserCodeRunner === "function"
    ? createUserCodeRunner({
      userCodeInput,
      userCodeParsed,
      codePanel,
      buildUserScript,
      resetLoopGuard,
      isStepModeOn,
      isDebugVisible,
      requestRender,
      setRenderMode,
      ctx,
      ABORT_ERR,
      sleep,
      setLastExecutionError,
    })
    : {
      syncParsedCode: () => {},
      validateRunnerSyntax: () => null,
      runUserCode: async () => true,
      runUserCodeWithStep: async () => true,
    };
  const scheduleSyncParsedCode = (() => {
    let scheduled = null;
    const run = () => {
      scheduled = null;
      syncParsedCode();
    };
    return () => {
      if(scheduled !== null) return;
      if(typeof requestAnimationFrame === "function"){
        scheduled = requestAnimationFrame(run);
      }else{
        scheduled = setTimeout(run, 0);
      }
    };
  })();

  const {
    syncDebugOverlay,
    syncDebugPanelLayout,
  } = typeof createDebugSync === "function"
    ? createDebugSync({ toggleDebugValues, dataPatternPanel, debugLog, isDebugVisible })
    : { syncDebugOverlay: () => {}, syncDebugPanelLayout: () => {} };

  const {
    defaultFlagString,
    applyToggleFlags,
    buildFlagString,
    setupFooterDebugToggle,
  } = initUIControls({
    toggleCursor,
    toggleGuide,
    toggleGrid,
    toggleEmpty,
    toggleColor,
    toggleDebugValues,
    stepMode,
    stepSkipFunctions,
    footerCopy,
    getDebugPanel,
    applyDebugVisibility,
    syncDebugOverlay,
    syncDebugPanelLayout,
    syncParsedCode,
    isDebugVisible,
    requestAnimationFrame,
    syncViewLayout: window.syncViewLayout,
  });

  // Export helpers to window
  window.RENDER_IMMEDIATE = RENDER_IMMEDIATE;
  window.RENDER_BUFFERED = RENDER_BUFFERED;
  window.setExecutionStatus = setExecutionStatus;
  window.updateCursor = updateCursor;
  window.boardMatrix = boardMatrix;
  window.getNextData = getNextData;
  // Update board matrix directly: row/col 1-based, encoded value (encodeBit)
  window.invertCell = invertCell;
  const wrapDrawApi = (name, fn, description) => {
    const wrapped = async function(...args){
      showApiStatus(name);
      const mainArg = args[0] ?? "";
      window.logEvent(name, mainArg, description);
      return fn.apply(this, args);
    };
    return wrapped;
  };
  const callPutFinderCells = (...args) => {
    if(!ctx) return false;
    const pattern = window.finderPattern;
    if(pattern && typeof pattern.putFinderCells === "function"){
      return pattern.putFinderCells(ctx, ...args);
    }
    return false;
  };
  const callDrawFinderPatterns = (...args) => {
    if(!ctx) return false;
    const pattern = window.finderPattern;
    if(pattern && typeof pattern.drawFinderPatterns === "function"){
      return pattern.drawFinderPatterns(ctx, ...args);
    }
    return false;
  };
  const callPutAlignmentCells = (...args) => {
    if(!ctx) return false;
    const pattern = window.alignmentPattern;
    if(pattern && typeof pattern.putAlignmentCells === "function"){
      return pattern.putAlignmentCells(ctx, ...args);
    }
    return false;
  };
  const callDrawAlignmentPatterns = (...args) => {
    if(!ctx) return false;
    const pattern = window.alignmentPattern;
    if(pattern && typeof pattern.drawAlignmentPatterns === "function"){
      return pattern.drawAlignmentPatterns(ctx, ...args);
    }
    return false;
  };
  const callPutTimingCells = (...args) => {
    if(!ctx) return false;
    const pattern = window.timingPattern;
    if(pattern && typeof pattern.putTimingCells === "function"){
      return pattern.putTimingCells(ctx, ...args);
    }
    return false;
  };
  const callDrawTimingPatterns = (...args) => {
    if(!ctx) return false;
    const pattern = window.timingPattern;
    if(pattern && typeof pattern.drawTimingPatterns === "function"){
      return pattern.drawTimingPatterns(ctx, ...args);
    }
    return false;
  };
  const callPutDarkModuleCells = (...args) => {
    if(!ctx) return false;
    const pattern = window.darkModulePattern;
    if(pattern && typeof pattern.putDarkModuleCells === "function"){
      return pattern.putDarkModuleCells(ctx, ...args);
    }
    return false;
  };
  const callDrawDarkModulePatterns = (...args) => {
    if(!ctx) return false;
    const pattern = window.darkModulePattern;
    if(pattern && typeof pattern.drawDarkModulePatterns === "function"){
      return pattern.drawDarkModulePatterns(ctx, ...args);
    }
    return false;
  };
  const callPutFormatCells = (...args) => {
    if(!ctx) return false;
    const pattern = window.formatPattern;
    if(pattern && typeof pattern.putFormatCells === "function"){
      return pattern.putFormatCells(ctx, ...args);
    }
    return false;
  };
  const callDrawFormatPatterns = (...args) => {
    if(!ctx) return false;
    const pattern = window.formatPattern;
    if(pattern && typeof pattern.drawFormatPatterns === "function"){
      return pattern.drawFormatPatterns(ctx, ...args);
    }
    return false;
  };

  async function applyMask(maskIndex = defaultMaskIndex){
    if(!ctx) return false;
    const {
      isStepModeOn,
      stepSkipFunctions,
      getStepDelay,
      setRenderMode,
      requestRender,
      resetCursor,
      MASK_FUNCTIONS,
      isFunctionalKind,
    } = ctx;
    const modeSetter = typeof setRenderMode === "function"
      ? setRenderMode
      : (mode) => {
        if(typeof window.setRenderMode === "function"){
          window.setRenderMode(mode);
        }
      };
    const baseRun = ctx.runId;
    const currentMaskRun = ++ctx.maskRunId;
    let idx = Number(maskIndex);
    if(!Number.isFinite(idx)){
      idx = defaultMaskIndex;
    }
    if(idx < 0 || idx > 7){
      window.logEvent("applyMask", maskIndex ?? "", "マスク指定が不正です");
      return false;
    }
    window.logEvent("applyMask", idx, `マスク${idx}を適用`);
    showApiStatus("applyMask", idx);
    const maskFn = (MASK_FUNCTIONS && typeof MASK_FUNCTIONS[idx] === "function") ? MASK_FUNCTIONS[idx] : null;
    if(!maskFn) return false;
    const stepMask = (typeof isStepModeOn === "function" ? isStepModeOn() : false)
      && !(stepSkipFunctions && stepSkipFunctions.checked);
    const shouldAbort = () => executionControl.shouldAbort(baseRun, ctx, () => currentMaskRun !== ctx.maskRunId);
    const updateCursorSafe = (row, col, dir = DIR_RIGHT) => executionControl.updateCursorSafe(
      baseRun,
      ctx,
      row,
      col,
      dir,
      () => currentMaskRun !== ctx.maskRunId,
    );
    const prevCursor = { row: cursorPos.row, col: cursorPos.col, dir: cursorPos.dir };
    const maskCursorDir = stepMask ? DIR_RIGHT : prevCursor.dir;
    const prevRender = ctx.renderMode;
    modeSetter(stepMask ? RENDER_IMMEDIATE : RENDER_BUFFERED);
    const setMaskApplying = (value) => {
      if(typeof window === "undefined") return;
      window.maskApplying = Boolean(value);
    };
    const ensureMaskOverlay = () => {
      if(ctx.maskOverlayEl && ctx.maskOverlayEl.isConnected){
        return ctx.maskOverlayEl;
      }
      const gridArea = document.querySelector(".grid-area");
      if(!gridArea) return null;
      const overlay = document.createElement("div");
      overlay.className = "mask-overlay";
      const frag = document.createDocumentFragment();
      for(let i = 0; i < 25 * 25; i++){
        const cell = document.createElement("div");
        cell.className = "mask-cell";
        frag.appendChild(cell);
      }
      overlay.appendChild(frag);
      gridArea.appendChild(overlay);
      ctx.maskOverlayEl = overlay;
      return overlay;
    };
    const applyMaskOverlayColor = (overlay) => {
      if(!overlay) return;
      const maskKind = (typeof window.BIT_MASK === "number") ? window.BIT_MASK : 30;
      const colorName = (typeof window.colorsForKind === "function")
        ? window.colorsForKind(maskKind)
        : "gray";
      if(typeof window.isColorEnabled !== "undefined" && !window.isColorEnabled){
        overlay.style.setProperty("--mask-overlay-color", "#000");
        return;
      }
      switch(colorName){
        case "gray":
          overlay.style.setProperty("--mask-overlay-color", "var(--col-gray-dark)");
          break;
        case "red":
          overlay.style.setProperty("--mask-overlay-color", "var(--col-red-dark)");
          break;
        case "blue":
          overlay.style.setProperty("--mask-overlay-color", "var(--col-blue-dark)");
          break;
        case "green":
          overlay.style.setProperty("--mask-overlay-color", "var(--col-green-dark)");
          break;
        case "yellow":
          overlay.style.setProperty("--mask-overlay-color", "var(--col-yellow-dark)");
          break;
        case "purple":
          overlay.style.setProperty("--mask-overlay-color", "var(--col-purple-dark)");
          break;
        case "orange":
          overlay.style.setProperty("--mask-overlay-color", "var(--col-orange-dark)");
          break;
        case "format":
          overlay.style.setProperty("--mask-overlay-color", "var(--col-format-blue-dark)");
          break;
        default:
          overlay.style.setProperty("--mask-overlay-color", "#000");
          break;
      }
    };
    const updateMaskOverlay = (overlay) => {
      if(!overlay) return;
      const cells = overlay.children;
      let idx = 0;
      for(let row = 1; row <= 25; row++){
        for(let col = 1; col <= 25; col++){
          const cellEl = cells[idx++];
          if(!cellEl) continue;
          const encoded = window.getCell(row, col);
          if(typeof encoded !== "number"){
            cellEl.classList.remove("is-on");
            continue;
          }
          const kind = (typeof window.bitKind === "function") ? window.bitKind(encoded) : Math.abs(encoded);
          if(typeof isFunctionalKind === "function" && isFunctionalKind(kind)){
            cellEl.classList.remove("is-on");
            continue;
          }
          if(maskFn(row - 1, col - 1)){
            cellEl.classList.add("is-on");
          }else{
            cellEl.classList.remove("is-on");
          }
        }
      }
    };
    const setOverlayState = (overlay, state) => {
      if(!overlay) return;
      overlay.classList.toggle("is-half", state === "half");
      overlay.classList.toggle("is-full", state === "full");
      if(state === "clear"){
        overlay.classList.remove("is-half");
        overlay.classList.remove("is-full");
      }
    };
    const applyMaskBatch = () => {
      for(let row = 1; row <= 25; row++){
        for(let col = 1; col <= 25; col++){
          if(shouldAbort()) return false;
          const encoded = window.getCell(row, col);
          if(typeof encoded !== "number") continue;
          const kind = (typeof window.bitKind === "function") ? window.bitKind(encoded) : Math.abs(encoded);
          if(typeof isFunctionalKind === "function" && isFunctionalKind(kind)) continue;
          if(!maskFn(row - 1, col - 1)) continue;
          invertCell(row, col);
        }
      }
      return !shouldAbort();
    };
    const maybeDelay = async () => {
      if(!stepMask) return true;
      if(shouldAbort()) return false;
      const delay = (typeof getStepDelay === "function") ? getStepDelay() : 0;
      if(delay > 0){
        await sleep(delay);
      }else{
        await new Promise(requestAnimationFrame);
      }
      return !shouldAbort();
    };
    let completed = false;
    let prevStepAnim;
    let restoreStepAnim = false;
    let maskApplyingActive = false;
    try{
      setMaskApplying(true);
      maskApplyingActive = true;
      if(stepMask){
        prevStepAnim = (typeof window.stepAnimationEnabled === "boolean")
          ? window.stepAnimationEnabled
          : undefined;
        restoreStepAnim = true;
        window.stepAnimationEnabled = false;
        const overlay = ensureMaskOverlay();
        applyMaskOverlayColor(overlay);
        updateMaskOverlay(overlay);
        const stepDelay = (typeof getStepDelay === "function") ? getStepDelay() : 0;
        const fadeMs = (typeof window.maskFadeDurationMs === "number")
          ? Math.max(0, window.maskFadeDurationMs)
          : 250;
        const holdMs = Math.max(100, stepDelay * 10);
        if(overlay){
          overlay.style.transition = `opacity ${fadeMs}ms linear`;
          overlay.style.opacity = "0";
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
          overlay.style.opacity = "1";
          await sleep(fadeMs);
        }else{
          await sleep(fadeMs);
        }
        if(shouldAbort()) return false;
        completed = applyMaskBatch();
        if(!completed) return false;
        if(holdMs > 0){
          await sleep(holdMs);
        }
        if(overlay){
          overlay.style.transition = `opacity ${fadeMs}ms linear`;
          overlay.style.opacity = "1";
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
          overlay.style.opacity = "0";
          await sleep(fadeMs);
          overlay.style.transition = "";
          overlay.style.opacity = "";
          overlay.offsetHeight;
        }
        completed = !shouldAbort();
      }else{
      for(let row = 1; row <= 25; row++){
        for(let col = 1; col <= 25; col++){
          if(shouldAbort()) break;
          const encoded = window.getCell(row, col);
          if(typeof encoded !== "number") continue;
          const kind = (typeof window.bitKind === "function") ? window.bitKind(encoded) : Math.abs(encoded);
          if(typeof isFunctionalKind === "function" && isFunctionalKind(kind)) continue;
          if(!maskFn(row - 1, col - 1)) continue;
          if(stepMask){
            updateCursorSafe(row, col, maskCursorDir);
          }
          invertCell(row, col);
          const ok = await maybeDelay();
          if(!ok) break;
        }
        if(shouldAbort()) break;
      }
      completed = !shouldAbort();
      }
      if(completed && hasFormatPattern){
        showApiStatus("applyMaskFormat");
        const formatBits = (ctx.FORMAT_L && Number.isFinite(ctx.FORMAT_L[idx])) ? ctx.FORMAT_L[idx] : null;
        const formatHex = Number.isFinite(formatBits) ? formatBits.toString(16).toUpperCase().padStart(4, "0") : "----";
        window.logEvent("applyMask", idx, `フォーマットパターンを更新（${formatHex}）`);
        await callDrawFormatPatterns(idx, true);
        showApiStatus("applyMask", idx);
      }
    }finally{
      if(maskApplyingActive){
        setMaskApplying(false);
      }
      if(restoreStepAnim){
        if(prevStepAnim === undefined){
          delete window.stepAnimationEnabled;
        }else{
          window.stepAnimationEnabled = prevStepAnim;
        }
      }
    }
    if(ctx.renderMode === RENDER_BUFFERED && typeof requestRender === "function"){
      requestRender("applyMask");
    }
    modeSetter(prevRender);
    if(stepMask){
      updateCursorSafe(prevCursor.row, prevCursor.col, maskCursorDir);
    }
    if(typeof resetCursor === "function"){
      resetCursor();
    }
    return completed;
  }
  const callApplyMask = (...args) => {
    if(!ctx) return false;
    return applyMask(...args);
  };
  async function drawBasePatterns(ctx, { deferFlush = false, currentRun, resetDelay = false } = {}){
    if(!ctx) return false;
    window.logEvent("drawBasePatterns", currentRun ?? "", "基本パターン描画開始");
    const { setRenderMode, resetCursor, requestRender, RESET_DELAY_MS, RENDER_BUFFERED, RENDER_IMMEDIATE } = ctx;
    const prevRender = ctx.renderMode;
    setRenderMode(RENDER_BUFFERED);
    resetCursor();
    if(resetDelay){
      await ctx.helpers?.sleep?.(RESET_DELAY_MS ?? 0);
    }
    const opts = { overwrite: false, currentRun };
    const runFunctionalPattern = async (fn, ...fnArgs) => {
      if(typeof window !== "undefined"){
        window.isDrawingBasePattern = true;
        if(typeof window.setBasePatternLookahead === "function"){
          window.setBasePatternLookahead([]);
        }
      }
      try{
        const result = await fn(...fnArgs);
        return result;
      }finally{
        if(typeof window !== "undefined"){
          window.isDrawingBasePattern = false;
          if(typeof window.setBasePatternLookahead === "function"){
            window.setBasePatternLookahead([]);
          }
        }
      }
    };
    await runFunctionalPattern(drawFinderPatterns, opts.overwrite, opts.currentRun);
    await runFunctionalPattern(drawTimingPatterns, opts.overwrite, opts.currentRun);
    await runFunctionalPattern(drawAlignmentPatterns, opts.overwrite, opts.currentRun);
    await runFunctionalPattern(drawDarkModulePatterns, opts.overwrite, opts.currentRun);
    await runFunctionalPattern(drawFormatPatterns, undefined, opts.overwrite, opts.currentRun);
    window.logEvent("drawBasePatterns", currentRun ?? "", "基本パターン描画完了");
    if(!deferFlush){
      requestRender("drawBasePatterns");
      setRenderMode(RENDER_IMMEDIATE);
    }else{
      setRenderMode(prevRender);
    }
    return true;
  }
  async function drawBasePatternsStepped(ctx, { currentRun } = {}){
    const ok = await drawBasePatterns(ctx, { currentRun, resetDelay: true });
    return { ok: Boolean(ok), fastForwarded: false };
  }
  const callDrawBasePatterns = (...args) => {
    if(!ctx) return false;
    return drawBasePatterns(ctx, ...args);
  };
  const callDrawBasePatternsStepped = (...args) => {
    if(!ctx) return { ok: false, fastForwarded: false };
    return drawBasePatternsStepped(ctx, ...args);
  };
  const drawFinderPatterns = wrapDrawApi("drawFinderPatterns", callDrawFinderPatterns, "ファインダーパターンを描画");
  const drawAlignmentPatterns = wrapDrawApi("drawAlignmentPatterns", callDrawAlignmentPatterns, "アライメントパターンを描画");
  const drawDarkModulePatterns = wrapDrawApi("drawDarkModulePatterns", callDrawDarkModulePatterns, "ダークモジュールを描画");
  const drawTimingPatterns = wrapDrawApi("drawTimingPatterns", callDrawTimingPatterns, "タイミングパターンを描画");
  const drawFormatPatterns = wrapDrawApi("drawFormatPatterns", callDrawFormatPatterns, "フォーマットパターンを描画");
  ctx.drawFormatPatterns = drawFormatPatterns;
  window.buildFunctionSet = buildFunctionSet;
  window.parseCellRef = parseCellRef;
  window.cellRefFromRowCol = cellRefFromRowCol;
  window.moveCursor = moveCursor;
  window.turnCursor = turnCursor;
  const drawFunctionalPatterns = () => callDrawBasePatterns({ deferFlush: false, currentRun: runId });
  const initializeQRCode = async () => {
    const current = ++runId;
    await callDrawBasePatterns({ deferFlush: false, currentRun: current });
    if(current !== runId) return false;
    updateCursor(cursorPos.row, cursorPos.col, DIR_UP);
    return true;
  };
  async function buildQRCode(){
    const currentRun = runId;
    let stepEnabled = H.isStepModeOn();
    setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
    const bitsSeq = buildBitSequence();

    // Start at bottom-right, facing up
    updateCursor(cursorPos.row, cursorPos.col, DIR_UP);

      let bitIdx = 0;
      let col = 25;
      let upward = true;
      while(col > 0 && bitIdx < bitsSeq.length){
        if(currentRun !== runId) break;
        if(timingColIndex > 0 && col === timingColIndex){ col--; continue; } // skip timing column
        const colLeft = col - 1;
        for(let i = 0; i < 25 && bitIdx < bitsSeq.length; i++){
          if(currentRun !== runId) break;
          const row = upward ? (25 - i) : (1 + i);
          // Face the walking direction
          updateCursor(cursorPos.row, cursorPos.col, upward ? DIR_UP : DIR_DOWN);
          for(const cTarget of [col, colLeft]){
            if(bitIdx >= bitsSeq.length) break;
            if(cTarget < 1) continue;
            const targetCol = cTarget;
            if(targetCol < 1 || targetCol > 25) continue;
            const moved = moveCursor(row, targetCol);
            if(!moved) continue;
            if(timingColIndex > 0 && targetCol === timingColIndex) continue;
            if(!window.isEmpty()) continue;
            const { bit, kind } = bitsSeq[bitIdx];
            const encoded = window.encodeBit(kind, bit === 1);
            window.updateCell(cursorPos.row, cursorPos.col, encoded);
            bitIdx++;
            if(currentRun !== runId) break;
          if(stepEnabled){
            const delay = getStepDelay();
            await sleep(Math.max(0, delay));
            if(currentRun !== runId) break;
            if(!isStepModeOn()){
              stepEnabled = false;
              setRenderMode(RENDER_BUFFERED);
            }
          }
        }
      }
      upward = !upward;
      col -= 2;
    }
    if(currentRun === runId && !stepEnabled){
      requestRender("drawBasePatternsStepped");
    }
    return currentRun === runId;
  };

  if(typeof window !== "undefined"){
    window.setSwitch = setSwitch;
    window.isSwitchOn = isSwitchOn;
    window.toggleSwitchState = toggleSwitchState;
    window.red = red;
    window.blue = blue;
    window.green = green;
    window.yellow = yellow;
    window.isRedOn = isRedOn;
    window.isBlueOn = isBlueOn;
    window.isGreenOn = isGreenOn;
    window.isYellowOn = isYellowOn;
  }
  async function drawDataPatterns({ currentRun } = {}){
    window.logEvent("drawDataPatterns", currentRun ?? "", "データパターン描画");
    showApiStatus("drawDataPatterns");
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const shouldAbort = () => runToken !== runId;
    let dataPatternStageDirty = false;
    const perfNow = (typeof performance !== "undefined" && typeof performance.now === "function")
      ? () => performance.now()
      : () => Date.now();
    const waitForRender = async () => {
      if(typeof requestAnimationFrame !== "function") return;
      const waitFrame = () => new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if(done) return;
          done = true;
          resolve(true);
        };
        requestAnimationFrame(finish);
        setTimeout(finish, 50);
      });
      await waitFrame();
      await waitFrame();
    };
    const perfStats = {
      steps: 0,
      putMs: 0,
      moveMs: 0,
    };
    const markDataPatternStage = (kind) => {
      if(updateDataPatternStatus(kind)){
        dataPatternStageDirty = true;
      }
    };
    const finalizeStage = () => {
      if(dataPatternStageDirty){
        currentDataPatternStage = null;
        showApiStatus("drawDataPatterns");
      }
    };
    const runWithDirectionOverride = (fn) => {
      if(typeof withInternalDirectionOverride === "function"){
        return withInternalDirectionOverride(fn);
      }
      return fn();
    };
    return runWithDirectionOverride(async () => {
      let advanceStepCounter = 0;
      const stepModeOn = typeof isStepModeOn === "function" && isStepModeOn();
      const stepDataEnabled = stepModeOn;
      const prevRenderMode = ctx.renderMode;
      const prevSuppressCursorUpdates = typeof window !== "undefined" ? window.suppressCursorUpdates : false;
      const prevSuppressDataPatternLog = typeof window !== "undefined" ? window.suppressDataPatternLog : false;
      if(typeof window !== "undefined"){
        window.suppressDataPatternLog = true;
      }
      if(!stepModeOn){
        if(typeof window !== "undefined"){
          window.suppressCursorUpdates = true;
        }
        setRenderMode(RENDER_BUFFERED);
      }
      const awaitIfStepping = async (result) => {
        if(!stepDataEnabled){
          return result;
        }
        return await result;
      };
      const advanceDataCursorSync = () => {
        perfStats.steps += 1;
        if(window.isEmpty && window.isEmpty()){
          const nextData = (typeof window.getNextData === "function") ? window.getNextData() : null;
          if(nextData !== null && nextData !== undefined){
            const putStart = perfNow();
            putCell(nextData);
            perfStats.putMs += perfNow() - putStart;
          }else{
            const putStart = perfNow();
            putCell();
            perfStats.putMs += perfNow() - putStart;
          }
        }
        const moveStart = perfNow();
        const isLeftStep = (advanceStepCounter % 2) === 0;
        advanceStepCounter += 1;
        if(isLeftStep){
          moveCursor("left");
        }else{
          moveCursor();
          if(!(typeof window.isMoveBlocked === "function" && window.isMoveBlocked())){
            moveCursor("right");
          }
        }
        if(typeof window.isMoveBlocked === "function" && window.isMoveBlocked()){
          turnCursor();
          moveCursor("left");
          if(typeof window.isSkipZone === "function" && window.isSkipZone()){
            moveCursor("left");
          }
        }
        perfStats.moveMs += perfNow() - moveStart;
      };
      const advanceDataCursorAsync = async () => {
        perfStats.steps += 1;
        if(window.isEmpty && window.isEmpty()){
          const nextData = (typeof window.getNextData === "function") ? window.getNextData() : null;
          if(nextData !== null && nextData !== undefined){
            const putStart = perfNow();
            await awaitIfStepping(putCell(nextData));
            perfStats.putMs += perfNow() - putStart;
          }else{
            const putStart = perfNow();
            await awaitIfStepping(putCell());
            perfStats.putMs += perfNow() - putStart;
          }
        }
        const moveStart = perfNow();
        const isLeftStep = (advanceStepCounter % 2) === 0;
        advanceStepCounter += 1;
        if(isLeftStep){
          await awaitIfStepping(moveCursor("left"));
        }else{
          await awaitIfStepping(moveCursor());
          if(!(typeof window.isMoveBlocked === "function" && window.isMoveBlocked())){
            await awaitIfStepping(moveCursor("right"));
          }
        }
        if(typeof window.isMoveBlocked === "function" && window.isMoveBlocked()){
          await awaitIfStepping(turnCursor());
          await awaitIfStepping(moveCursor("left"));
          if(typeof window.isSkipZone === "function" && window.isSkipZone()){
            await awaitIfStepping(moveCursor("left"));
          }
        }
        perfStats.moveMs += perfNow() - moveStart;
      };
      try{
        resetLoopGuard();
        updateCursor(BOARD_ROWS, BOARD_COLS, DIR_UP);
        while(hasMoreData()){
          if(shouldAbort()) throw ABORT_ERR;
          if(!canContinueLoop()) return false;
          const nextKind = (typeof window.getNextDataKind === "function") ? window.getNextDataKind() : null;
          markDataPatternStage(nextKind);
          if(stepDataEnabled){
            await advanceDataCursorAsync();
          }else{
            advanceDataCursorSync();
          }
          if(shouldAbort()) throw ABORT_ERR;
        }
        if(runToken === runId && typeof resetData === "function"){
          resetData();
        }
        return runToken === runId;
      }finally{
        finalizeStage();
        if(!stepModeOn){
          requestRender("drawDataPatterns");
          setRenderMode(prevRenderMode);
          if(typeof window !== "undefined"){
            window.suppressCursorUpdates = prevSuppressCursorUpdates;
            window.suppressDataPatternLog = prevSuppressDataPatternLog;
            if(typeof window.updateExecutionStatusCursor === "function"){
              window.updateExecutionStatusCursor();
            }
          }
        }else if(typeof window !== "undefined"){
          window.suppressDataPatternLog = prevSuppressDataPatternLog;
        }
        if(typeof window.logEvent === "function"){
          const payload = {
            steps: perfStats.steps,
            putMs: Math.round(perfStats.putMs),
            moveMs: Math.round(perfStats.moveMs),
          };
          window.logEvent("perfDataPattern", JSON.stringify(payload), "data内訳");
        }
      }
    });
  }
  async function drawQRCode(arg){
    window.logEvent("drawQRCode", arg ?? "", "QRコード描画開始");
    const resetOk = await resetQRCode();
    if(resetOk === false) return false;
    const baseOk = await callDrawBasePatterns();
    if(!baseOk) return false;
    const dataOk = await drawDataPatterns();
    if(!dataOk) return false;
    let maskOk;
    if(arg === undefined){
      maskOk = await callApplyMask();
    }else if(typeof arg === "object" && arg !== null){
      maskOk = await callApplyMask(arg.maskIndex);
    }else{
      maskOk = await callApplyMask(arg);
    }
    if(!maskOk) return false;
    window.logEvent("drawQRCode", arg ?? "", "QRコード描画完了");
    return true;
  }

  const HELLO_WORLD_LINES = [
    ["b1", "down", 5],
    ["c3", "right", 2],
    ["e1", "down", 5],
    ["g1", "down", 5],
    ["h1", "right", 3],
    ["h3", "right", 3],
    ["h5", "right", 3],
    ["l1", "down", 5],
    ["m5", "right", 3],
    ["q1", "down", 5],
    ["r5", "right", 3],
    ["v2", "down", 3],
    ["w1", "right", 2],
    ["y2", "down", 3],
    ["w5", "right", 2],
    ["a11", "down", 3],
    ["b14", "down", 2],
    ["c11", "down", 3],
    ["d14", "down", 2],
    ["e11", "down", 3],
    ["g12", "down", 3],
    ["h11", "right", 2],
    ["j12", "down", 3],
    ["h15", "right", 2],
    ["l11", "down", 5],
    ["m11", "right", 2],
    ["o12", "down", 2],
    ["m13", "right", 2],
    ["n14", null, 1],
    ["o15", null, 1],
    ["q11", "down", 5],
    ["r15", "right", 3],
    ["v11", "down", 5],
    ["w11", "right", 2],
    ["y12", "down", 3],
    ["w15", "right", 2],
  ];

  async function drawHelloWorld(){
    const resetOk = await resetQRCode();
    if(resetOk === false) return false;
    const stepEnabled = typeof isStepModeOn === "function" && isStepModeOn();
    const prevRenderMode = ctx ? ctx.renderMode : RENDER_IMMEDIATE;
    setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
    try{
      const blackValue = (typeof window.BIT_BLACK === "number") ? window.BIT_BLACK : 1;
      const skipExisting = Boolean(window.skipExistingCells);
      const parseRef = (ref) => (typeof window.parseCellRef === "function" ? window.parseCellRef(ref) : null);
      const isCellEmpty = (row, col) => {
        if(typeof window.getCell !== "function") return true;
        const current = window.getCell(row, col);
        if(typeof current !== "number") return true;
        if(typeof window.isUnplacedBit === "function"){
          return window.isUnplacedBit(current);
        }
        const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : -1;
        const kind = (typeof window.bitKind === "function") ? window.bitKind(current) : Math.abs(current);
        return kind === unplacedKind;
      };
      const setCell = async (row, col) => {
        if(skipExisting && !isCellEmpty(row, col)) return;
        if(typeof window.updateCursor === "function"){
          window.updateCursor(row, col);
        }
        window.updateCell(row, col, blackValue, { treatGenericAsData: true });
        if(stepEnabled && typeof makeStepThenable === "function"){
          const wait = makeStepThenable(true, {});
          if(wait && typeof wait.then === "function"){
            await wait;
          }
        }
      };
      const drawLine = async (startRef, dir, count) => {
        const start = parseRef(startRef);
        if(!start || !count) return;
        let row = start.row;
        let col = start.col;
        for(let i = 0; i < count; i++){
          await setCell(row, col);
          if(dir === "down"){
            row += 1;
          }else if(dir === "right"){
            col += 1;
          }
        }
      };
      for(const [startRef, dir, count] of HELLO_WORLD_LINES){
        await drawLine(startRef, dir, count);
      }
      const endPos = parseRef("y15");
      if(endPos && typeof window.updateCursor === "function"){
        window.updateCursor(endPos.row, endPos.col);
      }
      requestRender("drawHelloWorld");
    }finally{
      setRenderMode(prevRenderMode);
    }
    return true;
  }

  const dirs = [DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT];
  const FUNCTION_KINDS = [
    (typeof window !== "undefined" && typeof window.BIT_FUNC_FINDER === "number") ? window.BIT_FUNC_FINDER : null,
    (typeof window !== "undefined" && typeof window.BIT_FUNC_ALIGNMENT === "number") ? window.BIT_FUNC_ALIGNMENT : null,
    (typeof window !== "undefined" && typeof window.BIT_FUNC_TIMING === "number") ? window.BIT_FUNC_TIMING : null,
    (typeof window !== "undefined" && typeof window.BIT_FUNC_DARK === "number") ? window.BIT_FUNC_DARK : null,
    (typeof window !== "undefined" && typeof window.BIT_FUNC_FORMAT === "number") ? window.BIT_FUNC_FORMAT : null,
    (typeof window !== "undefined" && typeof window.BIT_FUNC_VERSION === "number") ? window.BIT_FUNC_VERSION : null,
  ].filter((v) => typeof v === "number");
  const isFunctionalKind = (kind) => FUNCTION_KINDS.includes(kind);
  const MASK_FUNCTIONS = {
    0: (r, c) => ((r + c) % 2) === 0, // r,c are 0-based
    1: (r) => (r % 2) === 0,
    2: (_r, c) => (c % 3) === 0,
    3: (r, c) => ((r + c) % 3) === 0,
    4: (r, c) => ((Math.floor(r / 2) + Math.floor(c / 3)) % 2) === 0,
    5: (r, c) => (((r * c) % 2) + ((r * c) % 3)) === 0,
    6: (r, c) => ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0,
    7: (r, c) => ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0,
  };
  ctx.MASK_FUNCTIONS = MASK_FUNCTIONS;
  ctx.isFunctionalKind = isFunctionalKind;

  function buildFunctionSet(){
    const set = new Set();
    const add = (r, c) => {
      if(r < 1 || r > 25 || c < 1 || c > 25) return;
      set.add(`${r}-${c}`);
    };
    // finder + white separator (9x9 around each)
    const finders = [
      [1, 1],
      [1, 19],
      [19, 1],
    ];
    for(const [tr, tc] of finders){
      for(let dr = -1; dr <= 7; dr++){
        for(let dc = -1; dc <= 7; dc++){
          add(tr + dr, tc + dc);
        }
      }
    }
    // timing (row 7, col 7)
    if(timingRowIndex > 0){
      for(let c = 1; c <= 25; c++) add(timingRowIndex, c);
    }
    if(timingColIndex > 0){
      for(let r = 1; r <= 25; r++) add(r, timingColIndex);
    }
    // alignment 5x5 at (19,19)
    for(let dr = -2; dr <= 2; dr++){
      for(let dc = -2; dc <= 2; dc++){
        add(19 + dr, 19 + dc);
      }
    }
    // dark module
    add(18, 9);
    // format info positions (both copies)
    const coordsA = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],
      [8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
    ];
    const n = 25;
    const coordsB = [
      [8,n-1],[8,n-2],[8,n-3],[8,n-4],[8,n-5],[8,n-6],[8,n-7],[8,n-8],
      [n-7,8],[n-6,8],[n-5,8],[n-4,8],[n-3,8],[n-2,8],[n-1,8],
    ];
    for(const [r, c] of coordsA) add(r + 1, c + 1);
    for(const [r, c] of coordsB) add(r + 1, c + 1);
    return set;
  }

  const handleResetAction = () => {
    window.logEvent("btnInit", "", "初期化ボタン押下");
    stopCurrentRun({ resetCursor: true, clear: true });
    if(userCodeInput){
      const codeText = (typeof userCodeInput.value === "string") ? userCodeInput.value.trim() : "";
      btnGenerate.disabled = !codeText;
      if(!codeText){
        setExecutionStatus("stopped", undefined, "実行できるプログラムがありません。");
      }
    }
    btnInit.disabled = false;
    setRenderMode(RENDER_IMMEDIATE);
    lastExecutionError = null;
    if(!userCodeInput || (typeof userCodeInput.value === "string" && userCodeInput.value.trim())){
      setExecutionStatus("stopped");
    }
  };
  const isEditableTarget = (target) => {
    if(!target || typeof target !== "object") return false;
    if(target.isContentEditable) return true;
    const tag = target.tagName ? target.tagName.toLowerCase() : "";
    if(tag === "input"){
      const type = String(target.type || "").toLowerCase();
      return type !== "checkbox" && type !== "button" && type !== "submit" && type !== "reset";
    }
    return tag === "textarea" || tag === "select";
  };
  btnInit.addEventListener("click", handleResetAction);
  document.addEventListener("keydown", (ev) => {
    if(ev.key !== "Escape") return;
    if(ev.repeat) return;
    const asciiModal = document.getElementById("asciiModal");
    if(asciiModal && !asciiModal.classList.contains("hidden")) return;
    handleResetAction();
    ev.preventDefault();
  });

  async function runGenerateLegacy(){
    if(typeof globalThis.qrBuildService !== "object" || typeof globalThis.qrBuildService.generateQr !== "function"){
      return;
    }
    return globalThis.qrBuildService.generateQr({
      runIdAccessor,
      stepFillAccessor,
      runUserCode,
      isStepModeOn,
      stepSkipFunctions,
      setRenderMode,
      drawBasePatterns: callDrawBasePatterns,
      drawBasePatternsStepped: callDrawBasePatternsStepped,
      drawBasePatternsService: globalThis.basePatternService?.drawBasePatternsService,
      buildFunctionSet,
      buildBitSequence,
      updateCursor,
      moveCursor,
      getStepDelay,
      sleep,
      requestRender,
      renderModeImmediate: RENDER_IMMEDIATE,
      renderModeBuffered: RENDER_BUFFERED,
      directionUp: DIR_UP,
      directionDown: DIR_DOWN,
      placeDataBits: globalThis.dataPlacementService?.placeDataBits,
      runWithCoordinator: globalThis.executionCoordinatorService?.runWithCoordinator,
    });
  }

  const logVerificationOutcome = () => {
    const verifyService = globalThis.qrVerifyService;
    if(!verifyService || typeof verifyService.verifyBoard !== "function") return null;
    showApiStatus("verify");
    const result = verifyService.verifyBoard();
    setQRCodeReadable(Boolean(result?.ok));
    if(!result) return null;
    const inputValue = document.getElementById("txtInput")?.value ?? "";
    const match = result.text === inputValue;
    const outcomeLabel = match ? "入力と出力が一致しました。" : "入力と出力が一致しませんでした。";
    const payload = {
      reason: result.reason || (result.ok ? "ok" : "rs_mismatch"),
      maskIndex: result.maskIndex,
      decoded: result.text,
      match,
      stats: result.stats,
    };
    window.logEvent("qrVerify", JSON.stringify(payload), outcomeLabel);
    return Object.assign({ ok: result.ok }, payload);
  };

  const buildVerificationErrorMessage = (payload) => {
    if(!payload) return "検証できませんでした";
    switch(payload.reason){
      case "rs_mismatch":
        return "検証に失敗しました（RSチェック不一致）";
      case "decode_error":
        return "検証に失敗しました（デコードエラー）";
      default:
        return payload.reason
          ? `検証に失敗しました（${payload.reason}）`
          : "検証に失敗しました";
    }
  };

  btnGenerate.addEventListener("click", async () => {
    historyController.ensureRunHistory();
    window.logEvent("btnGenerate", "", "コード生成ボタン押下");
    const patternUpdated = (typeof window.refreshPatternForCreate === "function")
      ? window.refreshPatternForCreate()
      : false;
    if(inputLocked){
      const resetWait = stopCurrentRun({ resetCursor: true, clear: true, resetData: Boolean(patternUpdated) });
      if(resetWait && typeof resetWait.then === "function"){
        await resetWait;
      }
    }
    const codeText = (userCodeInput && typeof userCodeInput.value === "string")
      ? userCodeInput.value.trim()
      : "";
    if(!codeText){
      setExecutionStatus("stopped", undefined, "実行できるプログラムがありません。");
      return;
    }
    const inputCheck = normalizeInputBeforeRun();
    if(!inputCheck.ok){
      return;
    }
    const lockToken = ++inputLockToken;
    setExecutionStatus("running");
    setInputLock(true);
    let runOk = false;
    let verificationOutcome = null;
    const shouldStepRun = typeof isStepModeOn === "function" && isStepModeOn();
    const prevRenderMode = ctx.renderMode;
    const prevSuppressCursorUpdates = typeof window !== "undefined" ? window.suppressCursorUpdates : false;
    const perfNow = (typeof performance !== "undefined" && typeof performance.now === "function")
      ? () => performance.now()
      : () => Date.now();
    let runDurationMs = 0;
    let verifyDurationMs = 0;
    try{
      setQRCodeReadable(false);
      if(!shouldStepRun){
        if(typeof window !== "undefined"){
          window.suppressCursorUpdates = true;
        }
        setRenderMode(RENDER_BUFFERED);
      }
      const runStart = perfNow();
      runOk = await runUserCodeWithStep();
      runDurationMs = Math.max(0, perfNow() - runStart);
    }finally{
      if(!shouldStepRun){
        requestRender("runUserCodeBuffered");
        setRenderMode(prevRenderMode);
        if(typeof window !== "undefined"){
          window.suppressCursorUpdates = prevSuppressCursorUpdates;
          if(typeof window.updateExecutionStatusCursor === "function"){
            window.updateExecutionStatusCursor();
          }
        }
      }
      if(lockToken === inputLockToken){
        setInputLock(false);
      }
      if(typeof window.logEvent === "function"){
        window.logEvent("perfRunUserCode", JSON.stringify({ ms: Math.round(runDurationMs) }), "実行時間");
      }
      const applyExecutionStatus = (outcome) => {
        if(runOk){
          const verificationDetail = outcome
            ? (outcome.match ? "正しいQRコードです。" : "この盤面はQRコードとして読み取れません。")
            : "";
          if(outcome && !outcome.match){
            setExecutionStatus("warning", undefined, verificationDetail);
          }else{
            setExecutionStatus("finished", undefined, verificationDetail);
          }
          return;
        }
        if(lastExecutionError){
          setExecutionStatus("error", lastExecutionError);
        }else{
          setExecutionStatus("stopped");
        }
      };
      applyExecutionStatus(null);
      historyController.finalizeRunHistoryEntry(runOk);
      if(runOk){
        (async () => {
          if(!shouldStepRun){
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
          try{
            const verifyStart = perfNow();
            verificationOutcome = logVerificationOutcome();
            verifyDurationMs = Math.max(0, perfNow() - verifyStart);
            if(typeof window.logEvent === "function"){
              window.logEvent("perfVerify", JSON.stringify({ ms: Math.round(verifyDurationMs) }), "検証時間");
            }
            applyExecutionStatus(verificationOutcome);
          }catch(err){
            if(typeof window.logEvent === "function"){
              window.logEvent("perfVerify", JSON.stringify({ error: String(err) }), "検証失敗");
            }
          }
        })();
      }
    }
  });
  if(btnGenerate){
    window.addEventListener("keydown", (ev) => {
      const active = document.activeElement;
      if(active){
        const tag = active.tagName ? active.tagName.toUpperCase() : "";
        if(active.id === "userCode" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable){
          return; // let input handler manage shortcuts
        }
      }
      if(
        (!ev.ctrlKey && !ev.shiftKey && !ev.altKey && ev.key === "Enter")
        || (ev.ctrlKey && !ev.shiftKey && !ev.altKey && ev.key === "Enter")
      ){
        ev.preventDefault();
        btnGenerate.click();
      }
    });
  }
  const spawnPointerRing = (x, y) => {
    if(!document || !document.body) return;
    const ring = document.createElement("span");
    ring.className = "pointer-ring";
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    document.body.append(ring);
    const cleanup = () => {
      ring.remove();
    };
    ring.addEventListener("animationend", cleanup, { once: true });
    setTimeout(cleanup, Math.max(200, presentationRingDuration + 200));
  };
  document.addEventListener("contextmenu", (ev) => {
    const target = ev.target;
    if(target && typeof target.closest === "function"){
      const allowed = target.closest("input, textarea");
      if(allowed){
        return;
      }
    }
    ev.preventDefault();
    if(presentationMode && presentationRingEnabled){
      spawnPointerRing(ev.clientX, ev.clientY);
    }
  });
  document.addEventListener("mousedown", (ev) => {
    if(ev.button !== 1) return;
    ev.preventDefault();
    if(presentationMode && presentationRingEnabled){
      spawnPointerRing(ev.clientX, ev.clientY);
    }
  });

  if(btnClearCode){
    btnClearCode.addEventListener("click", () => {
      window.logEvent("clearCode", "", "コード入力をクリア");
      if(userCodeInput){
        userCodeInput.value = "";
        userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
        historyController.commitPendingHistory("クリア");
      }
      if(userCodeParsed){
        userCodeParsed.value = "";
      }
    });
  }

  H.shouldStepFunctions = shouldStepFunctions;
  H.updateCursorIfRun = updateCursorIfRun;
  H.stepDelayAbort = stepDelayAbort;
  H.drawFinderPatterns = callDrawFinderPatterns;
  H.drawTimingPatterns = callDrawTimingPatterns;
  H.drawAlignmentPatterns = callDrawAlignmentPatterns;
  H.drawFormatPatterns = callDrawFormatPatterns;
  H.drawDarkModulePatterns = callDrawDarkModulePatterns;
  H.sleep = sleep;
  H.requestAnimationFrame = requestAnimationFrame;
  H.requestRender = requestRender;
  H.getStepDelay = getStepDelay;
  H.isStepModeOn = isStepModeOn;

  if(stepMode){
    stepMode.addEventListener("change", syncStepControls);
  }
  applyCombinedStepParam({ stepMode, stepSpeed, stepSkipFunctions });
  syncStepControls();

  ensureCells();
  resetBoardState({ abortRun: false });
  updateCursor(cursorPos.row, cursorPos.col, cursorPos.dir);
  syncDebugOverlay();

  const colorToggleEl = document.getElementById("toggleColor");
  if(colorToggleEl){
    colorToggleEl.addEventListener("change", () => {
      isColorEnabled = !!colorToggleEl.checked;
      reapplyCellColors();
    });
  }
  if(toggleDebugValues){
    toggleDebugValues.addEventListener("change", syncDebugOverlay);
  }
  if(Array.isArray(window.toggleInputs) && toggleDebugValues && !window.toggleInputs.includes(toggleDebugValues)){
    window.toggleInputs.push(toggleDebugValues);
  }
  applyDataParam({
    txtInput,
    urlParams,
    DATA_PARAM_KEY,
    decodeDataParamValue,
  });
  const urlControlToggleConfig = [
    { param: "toggleCursor", element: toggleCursor },
    { param: "toggleGuide", element: toggleGuide },
    { param: "toggleGrid", element: toggleGrid },
    { param: "toggleEmpty", element: toggleEmpty },
    { param: "toggleColor", element: toggleColor },
    { param: "toggleDebugValues", element: toggleDebugValues },
    { param: "stepMode", element: stepMode },
    { param: "stepSkipFunctions", element: stepSkipFunctions },
  ];
  applyUrlControlStates({
    toggleConfig: urlControlToggleConfig,
    viewRefreshTargets: [toggleCursor, toggleGuide, toggleGrid, toggleEmpty],
    stepToggleTargets: [stepMode, stepSkipFunctions],
    colorToggleElement: colorToggleEl,
    debugToggleElement: toggleDebugValues,
    applyToggleFlags,
    syncViewToggles: typeof window.syncViewToggles === "function" ? window.syncViewToggles : undefined,
    syncDebugOverlay,
    syncStepControls,
  });
  applyStepSpeedParam({ stepSpeed });
  syncDebugPanelLayout();
  scheduleSyncParsedCode();
  if(dataPatternPanel){
    dataPatternPanel.addEventListener("toggle", () => {
      syncDebugPanelLayout();
      scheduleSyncParsedCode();
      if(typeof window.syncViewLayout === "function"){
        requestAnimationFrame(window.syncViewLayout);
      }
    });
  }
  if(userCodeInput){
    const resolvedZoomStepPx = Number.isFinite(codeZoomStepPx) ? codeZoomStepPx : 4;
    const resolvedZoomMinPx = Number.isFinite(codeZoomMinPx) ? codeZoomMinPx : 12;
    const resolvedZoomMaxPx = Number.isFinite(codeZoomMaxPx) ? codeZoomMaxPx : 200;
    const resolvedZoomHoldCount = Number.isFinite(codeZoomHoldCount)
      ? Math.max(0, Math.trunc(codeZoomHoldCount))
      : 10;
    const resolvedLineHeightMinPx = Number.isFinite(codeZoomLineHeightMinPx) ? codeZoomLineHeightMinPx : 16;
    const resolvedLineHeightRatio = Number.isFinite(codeZoomLineHeightRatio) ? codeZoomLineHeightRatio : 1.2;
    const resolvedLineHeightMaxOffsetPx = Number.isFinite(codeZoomLineHeightMaxOffsetPx) ? codeZoomLineHeightMaxOffsetPx : 8;
    const computedBaseFontSize = parseFloat(window.getComputedStyle(userCodeInput).fontSize) || 22;
    const baseFontSize = Number.isFinite(codeZoomBasePx) ? codeZoomBasePx : computedBaseFontSize;
    let wheelHoldCount = 0;
    let wheelHoldDirection = 0;
    userCodeInput.addEventListener("input", (ev) => {
      scheduleSyncParsedCode();
      ensureUserCodeCaretVisible();
      if(executionStatusEl && !executionStatusEl.classList.contains("status-running")){
        const codeText = (typeof userCodeInput.value === "string") ? userCodeInput.value.trim() : "";
        if(!codeText){
          setExecutionStatus("stopped", undefined, "実行できるプログラムがありません。");
        }else{
          setExecutionStatus("stopped");
        }
      }
      if(btnGenerate){
        const codeText = (typeof userCodeInput.value === "string") ? userCodeInput.value.trim() : "";
        btnGenerate.disabled = !codeText;
      }
      if(!ev.isComposing){
        const type = ev.inputType || "";
        if(/insert(LineBreak|Paragraph)/i.test(type)){
          historyController.markHistoryPending("改行");
          historyController.commitPendingHistory();
        }else{
          historyController.markHistoryPending("入力");
        }
      }
    });
    userCodeInput.addEventListener("keydown", async (ev) => {
      const navKey = ev.key === "ArrowUp" || ev.key === "ArrowDown";
      if(navKey){
        historyController.commitPendingHistory("行移動");
      }
      const captureEnterHistory = ev.key === "Enter" && !ev.ctrlKey && !ev.altKey;
      if(captureEnterHistory){
        setTimeout(() => historyController.commitPendingHistory("改行"), 0);
      }
      if(ev.ctrlKey && !ev.shiftKey && !ev.altKey && ev.key === "Enter"){
        ev.preventDefault();
        ev.stopPropagation();
        historyController.ensureRunHistory();
        if(btnGenerate && !btnGenerate.disabled){
          btnGenerate.click();
        }
        return;
      }
      if(ev.key === "Tab"){
        ev.preventDefault();
        const indent = "\t";
        const value = userCodeInput.value;
        const start = typeof userCodeInput.selectionStart === "number" ? userCodeInput.selectionStart : 0;
        const end = typeof userCodeInput.selectionEnd === "number" ? userCodeInput.selectionEnd : start;
        const hasSelection = start !== end;
        if(!hasSelection && !ev.shiftKey){
          userCodeInput.setRangeText(indent, start, end, "end");
          const delta = indent.length;
          userCodeInput.setSelectionRange(start + delta, start + delta);
          return;
        }

        const startLineBreak = value.lastIndexOf("\n", start - 1);
        const lineStart = startLineBreak + 1;
        const computeLastLineStart = () => {
          if(start === end){
            return lineStart;
          }
          let idx = end - 1;
          if(idx >= 0 && value[idx] === "\n"){
            idx = Math.max(0, idx - 1);
          }
          return value.lastIndexOf("\n", idx) + 1;
        };
        const lastLineStart = Math.max(lineStart, computeLastLineStart());
        const lineEnd = value.indexOf("\n", lastLineStart);
        const lineEndPos = lineEnd === -1 ? value.length : lineEnd;

        if(lineStart === lastLineStart){
          if(ev.shiftKey){
            const lineText = value.slice(lineStart, lineEndPos);
            const leadingMatch = lineText.match(/^[\t ]+/);
            if(leadingMatch){
              const leading = leadingMatch[0];
              const tabSize = 4;
              let width = 0;
              let removeLen = 0;
              for(let i = 0; i < leading.length; i++){
                const ch = leading[i];
                width += ch === "\t" ? tabSize : 1;
                removeLen++;
                if(width >= tabSize){
                  break;
                }
              }
              if(width < tabSize){
                removeLen = leading.length;
              }
              if(removeLen > 0){
                userCodeInput.setRangeText("", lineStart, lineStart + removeLen, "end");
                const newStart = Math.max(lineStart, start - removeLen);
                const newEnd = Math.max(lineStart, end - removeLen);
                userCodeInput.setSelectionRange(newStart, newEnd);
              }
            }
            return;
          }
          userCodeInput.setRangeText(indent, lineStart, lineStart, "end");
          const delta = 1;
          userCodeInput.setSelectionRange(start + delta, end + delta);
          return;
        }

        const blockEnd = lineEnd === -1 ? value.length : lineEnd;
        const block = value.slice(lineStart, blockEnd);
        const lines = block.split("\n");

        if(ev.shiftKey){
          const unindented = lines.map((line) => line.startsWith(indent) ? line.slice(1) : line).join("\n");
          const removedLines = lines.reduce((count, line) => count + (line.startsWith(indent) ? 1 : 0), 0);
          userCodeInput.setRangeText(unindented, lineStart, blockEnd, "end");
          const startShift = value.slice(lineStart, start).startsWith(indent) ? 1 : 0;
          userCodeInput.setSelectionRange(start - startShift, end - removedLines);
          return;
        }

        const indented = lines.map((line) => indent + line).join("\n");
        userCodeInput.setRangeText(indented, lineStart, blockEnd, "end");
        const indentLen = indent.length;
        userCodeInput.setSelectionRange(start + indentLen, end + indentLen * lines.length);
        return;
      }
      if(ev.key === "Enter" && ev.shiftKey && !ev.ctrlKey && !ev.altKey){
        ev.preventDefault();
        const value = userCodeInput.value;
        const caret = Math.max(
          typeof userCodeInput.selectionEnd === "number" ? userCodeInput.selectionEnd : 0,
          typeof userCodeInput.selectionStart === "number" ? userCodeInput.selectionStart : 0,
        );
        const lineStart = value.lastIndexOf("\n", caret - 1);
        const column = caret - ((lineStart === -1) ? 0 : lineStart + 1);
        const newlineIdx = value.indexOf("\n", caret);
        if(newlineIdx === -1) return;
        const nextLineStart = newlineIdx + 1;
        const nextLineEnd = value.indexOf("\n", nextLineStart);
        const nextLineLen = nextLineEnd === -1 ? value.length - nextLineStart : nextLineEnd - nextLineStart;
        const nextLine = value.slice(nextLineStart, nextLineEnd === -1 ? value.length : nextLineEnd);
        const indentMatch = nextLine.match(/^[\t ]*/);
        const indentLen = indentMatch ? indentMatch[0].length : 0;
        const targetPos = nextLineStart + indentLen;
        userCodeInput.setSelectionRange(targetPos, targetPos);
        ensureUserCodeCaretVisible();
        return;
      }
    if(ev.key === "Enter" && !ev.ctrlKey && !ev.altKey && !ev.shiftKey){
      requestAnimationFrame(ensureUserCodeCaretVisible);
    }
  });
    userCodeInput.addEventListener("wheel", (ev) => {
      if(!ev.ctrlKey) return;
      ev.preventDefault();
      const fontSize = parseFloat(window.getComputedStyle(userCodeInput).fontSize) || baseFontSize;
      const direction = ev.deltaY < 0 ? 1 : -1;
      if(fontSize === baseFontSize && wheelHoldCount > 0 && direction === wheelHoldDirection){
        wheelHoldCount -= 1;
        return;
      }
      if(direction !== wheelHoldDirection){
        wheelHoldDirection = direction;
        wheelHoldCount = 0;
      }
      const delta = direction * resolvedZoomStepPx;
      let next = fontSize + delta;
      if(direction < 0 && fontSize > baseFontSize && next < baseFontSize){
        next = baseFontSize;
        wheelHoldDirection = direction;
        wheelHoldCount = resolvedZoomHoldCount;
      }else if(direction > 0 && fontSize < baseFontSize && next > baseFontSize){
        next = baseFontSize;
        wheelHoldDirection = direction;
        wheelHoldCount = resolvedZoomHoldCount;
      }else if(next === baseFontSize && fontSize !== baseFontSize){
        wheelHoldDirection = direction;
        wheelHoldCount = resolvedZoomHoldCount;
      }
      next = Math.min(resolvedZoomMaxPx, Math.max(resolvedZoomMinPx, next));
      const lineHeight = Math.max(
        resolvedLineHeightMinPx,
        Math.min(next * resolvedLineHeightRatio, next + resolvedLineHeightMaxOffsetPx),
      );
      userCodeInput.style.fontSize = `${next}px`;
      userCodeInput.style.lineHeight = `${lineHeight}px`;
    }, { passive: false });
    userCodeInput.addEventListener("mousedown", (ev) => {
      if(!ev.ctrlKey || ev.button !== 1) return;
      ev.preventDefault();
      userCodeInput.style.fontSize = "";
      userCodeInput.style.lineHeight = "";
      wheelHoldCount = 0;
      wheelHoldDirection = 0;
    });
    userCodeInput.addEventListener("blur", (ev) => {
      const related = ev.relatedTarget || document.activeElement;
      if(btnGenerate && related === btnGenerate){
        return;
      }
      historyController.commitPendingHistory("修正");
    });
  }
  historyController.pushHistorySnapshot("初期状態");
  const normalizeSampleText = (raw) => {
    const source = typeof raw === "string" ? raw : "";
    const lines = source.replace(/\r/g, "").split("\n");
    while(lines.length && lines[0].trim() === ""){
      lines.shift();
    }
    while(lines.length && lines[lines.length - 1].trim() === ""){
      lines.pop();
    }
    return lines.join("\n");
  };
  const applySampleCode = (code) => {
    const normalized = normalizeSampleText(code);
    if(!userCodeInput) return;
    userCodeInput.value = normalized;
    userCodeInput.selectionStart = userCodeInput.selectionEnd = 0;
    userCodeInput.scrollTop = 0;
    userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
    historyController.commitPendingHistory("サンプル");
  };
  const sampleToolbar = document.getElementById("codeSampleToolbar");
  if(!sampleToolbar){
    throw new Error("codeSampleToolbar is required");
  }
  const configuredSamples = Array.isArray(configDefaults.codeSamples) ? configDefaults.codeSamples : [];
  if(sampleToolbar && configuredSamples.length > 0){
    sampleToolbar.innerHTML = "";
    configuredSamples.forEach((sample, index) => {
      const label = (typeof sample.label === "string") ? sample.label : String(index + 1);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-debug-btn";
      button.textContent = label;
      button.addEventListener("click", () => {
        applySampleCode(sample.code);
      });
      sampleToolbar.append(button);
    });
  }
  if(btnPruneHistory){
    btnPruneHistory.addEventListener("click", historyController.pruneHistoryEntries);
  }
  if(codeHistoryList){
    codeHistoryList.addEventListener("click", (ev) => {
      if(inputLocked) return;
      const target = (typeof Element !== "undefined" && ev.target instanceof Element) ? ev.target : null;
      const item = target ? target.closest("li[data-index]") : null;
      if(!item) return;
      const index = Number(item.getAttribute("data-index"));
      if(Number.isNaN(index)) return;
      const entry = historyController.getEntry(index);
      if(!entry || !userCodeInput) return;
      userCodeInput.value = entry.value;
      userCodeInput.selectionStart = userCodeInput.selectionEnd = 0;
      userCodeInput.scrollTop = 0;
      userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  const clipboardApi = (typeof navigator !== "undefined" ? navigator.clipboard : null);
  if(btnCopyCode){
    if(clipboardApi && typeof clipboardApi.writeText === "function"){
      btnCopyCode.addEventListener("click", async () => {
        if(!userCodeInput) return;
        try{
          await clipboardApi.writeText(userCodeInput.value ?? "");
        }catch(err){
          // ignore clipboard failures
        }
      });
    }else{
      btnCopyCode.disabled = true;
    }
  }
  if(btnPasteCode){
    if(clipboardApi && typeof clipboardApi.readText === "function"){
      btnPasteCode.addEventListener("click", async () => {
        if(!userCodeInput) return;
        try{
      const text = await clipboardApi.readText();
      userCodeInput.value = text;
      userCodeInput.selectionStart = userCodeInput.selectionEnd = 0;
      userCodeInput.scrollTop = 0;
      userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
      historyController.commitPendingHistory("貼り付け");
    }catch(err){
          // ignore clipboard failures
        }
      });
    }else{
      btnPasteCode.disabled = true;
    }
  }
  if(titleIcon){
    titleIcon.addEventListener("click", () => {
      const buildFn = typeof buildStateUrlFromState === "function"
        ? buildStateUrlFromState
        : (() => window.location.href);
      const url = buildFn({
        txtInput,
        flagString: buildFlagString(),
        defaultDataValue: DATA_DEFAULT_TEXT,
        debugPanel: getDebugPanel(),
        dataPatternPanel,
        stepSpeed,
        stepMode,
        stepSkipFunctions,
        historyVisible: getHistoryVisible(),
        isDebugVisible,
        defaultFlagString,
        defaultHistoryVisible,
        defaultDebugVisible,
        defaultPatternOpen,
        defaultStepMode,
        defaultStepSkipFunctions,
        defaultStepSpeed,
        skipExistingCells,
        defaultSkipExistingCells,
        autoAvoidTiming,
        defaultAutoAvoidTiming,
        useDirection,
        defaultUseDirection,
        initialDebugParamPresent,
        codePanel,
      });
      window.open(url, "_blank");
    });
  }
  if(codePanel){
    const codeTitle = codePanel.querySelector(".panel-title");
    if(codeTitle){
      codeTitle.addEventListener("dblclick", () => {
        codePanel.classList.toggle("show-samples");
      });
    }
  }

  const initOfflineCodeEditor = () => {
    const ta = userCodeInput;
    const host = document.getElementById("userCodeEditor");
    const createEditor = typeof window !== "undefined" ? window.OfflineCodeEditor?.createCodeEditor : null;
    if(!ta || !host || typeof createEditor !== "function" || window.__codeEditor) return;
    window.__codeEditor = createEditor(host, {
      value: ta.value ?? "",
      onChange: (nextValue) => {
        const next = (typeof nextValue === "string") ? nextValue : "";
        if(ta.value === next) return;
        ta.value = next;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      },
    });
    const syncEditorFontStyles = () => {
      if(!ta || !host) return;
      host.style.fontSize = ta.style.fontSize || "";
      host.style.lineHeight = ta.style.lineHeight || "";
    };
    syncEditorFontStyles();
    let lastValue = ta.value ?? "";
    setInterval(() => {
      const current = ta.value ?? "";
      if(current === lastValue) return;
      lastValue = current;
      const editor = window.__codeEditor;
      if(editor && typeof editor.getValue === "function" && editor.getValue() !== current){
        editor.setValue(current);
      }
    }, 100);

    host.addEventListener("keydown", (ev) => {
      if(ev.key === "Enter" && ev.ctrlKey && !ev.shiftKey && !ev.altKey){
        ev.preventDefault();
        ev.stopPropagation();
        const forwarded = new KeyboardEvent("keydown", {
          key: ev.key,
          code: ev.code,
          ctrlKey: ev.ctrlKey,
          shiftKey: ev.shiftKey,
          altKey: ev.altKey,
          metaKey: ev.metaKey,
          repeat: ev.repeat,
          bubbles: true,
          cancelable: true,
        });
        ta.dispatchEvent(forwarded);
        syncEditorFontStyles();
      }
    }, { capture: true });
    host.addEventListener("wheel", (ev) => {
      if(!ev.ctrlKey) return;
      ev.preventDefault();
      ev.stopPropagation();
      const forwarded = new WheelEvent("wheel", {
        deltaX: ev.deltaX,
        deltaY: ev.deltaY,
        deltaZ: ev.deltaZ,
        deltaMode: ev.deltaMode,
        ctrlKey: ev.ctrlKey,
        shiftKey: ev.shiftKey,
        altKey: ev.altKey,
        metaKey: ev.metaKey,
        clientX: ev.clientX,
        clientY: ev.clientY,
        movementX: ev.movementX,
        movementY: ev.movementY,
        button: ev.button,
        buttons: ev.buttons,
        relatedTarget: ev.relatedTarget,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      ta.dispatchEvent(forwarded);
      syncEditorFontStyles();
    }, { capture: true, passive: false });
    host.addEventListener("mousedown", (ev) => {
      if(ev.button !== 1 || !ev.ctrlKey) return;
      ev.preventDefault();
      ev.stopPropagation();
      const forwarded = new MouseEvent("mousedown", {
        button: ev.button,
        buttons: ev.buttons,
        ctrlKey: ev.ctrlKey,
        shiftKey: ev.shiftKey,
        altKey: ev.altKey,
        metaKey: ev.metaKey,
        clientX: ev.clientX,
        clientY: ev.clientY,
        movementX: ev.movementX,
        movementY: ev.movementY,
        relatedTarget: ev.relatedTarget,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      ta.dispatchEvent(forwarded);
      syncEditorFontStyles();
    }, { capture: true });
  };

  if(document && document.body){
    requestAnimationFrame(() => {
      document.body.classList.remove("app-loading");
    });
  }

  setupFooterDebugToggle();
  if(versionInfo && typeof window.appVersionString === "string"){
    versionInfo.textContent = `v${window.appVersionString}`;
  }

  initOfflineCodeEditor();

  const publishWindowApi = (api) => {
    if(typeof window === "undefined" || !api) return;
    const win = window;
    win.qrmakerApi = api;
    for(const [name, value] of Object.entries(api)){
      if(typeof value === "function"){
        win[name] = value;
      }
    }
    if(Array.isArray(api.toggleInputs)){
      win.toggleInputs = api.toggleInputs;
    }
  };

  const buildWindowApi = () => ({
    applyMask: callApplyMask,
    drawBasePatterns: callDrawBasePatterns,
    drawBasePatternsStepped: callDrawBasePatternsStepped,
    makeStepThenable,
    shouldStepFunctions,
    drawQRCode,
    drawHelloWorld,
    buildQRCode,
    drawDataPatterns,
    drawFunctionalPatterns,
    initializeQRCode,
    resetQRCode,
    clearBoard,
    resetCommand,
    stopCurrentRun,
    drawFormatPatterns,
    drawFinderPatterns,
    drawAlignmentPatterns,
    drawDarkModulePatterns,
    drawTimingPatterns,
    putFinderCells: callPutFinderCells,
    putAlignmentCells: callPutAlignmentCells,
    putTimingCells: callPutTimingCells,
    putDarkModuleCells: callPutDarkModuleCells,
    putFormatCells: callPutFormatCells,
    syncViewToggles: typeof window.syncViewToggles === "function" ? window.syncViewToggles : undefined,
    toggleInputs: window.toggleInputs,
  });

  const windowApi = buildWindowApi();
  publishWindowApi(windowApi);
  if(typeof window !== "undefined"){
    window.qrmaker = { public: {}, internal: {} };
    const qrmakerPublic = window.qrmaker.public;
    const qrmakerInternal = window.qrmaker.internal;
    if(typeof window.shouldStepFunctions === "function"){
      qrmakerInternal.shouldStepFunctions = window.shouldStepFunctions;
    }
    if(typeof window.makeStepThenable === "function"){
      qrmakerInternal.makeStepThenable = window.makeStepThenable;
    }
    if(typeof window.drawBasePatternsStepped === "function"){
      qrmakerInternal.drawBasePatternsStepped = window.drawBasePatternsStepped;
    }
    if(typeof window.drawDataPatternsStepped === "function"){
      qrmakerInternal.drawDataPatternsStepped = window.drawDataPatternsStepped;
    }
    if(typeof window.stopCurrentRun === "function"){
      qrmakerInternal.stopCurrentRun = window.stopCurrentRun;
    }
    if(typeof window.resetCommand === "function"){
      qrmakerInternal.resetCommand = window.resetCommand;
    }
    if(typeof window.moveCursor === "function"){
      qrmakerPublic.moveCursor = window.moveCursor;
    }
    if(typeof window.turnCursor === "function"){
      qrmakerPublic.turnCursor = window.turnCursor;
    }
    if(typeof window.resetQRCode === "function"){
      qrmakerPublic.resetQRCode = window.resetQRCode;
    }
    if(typeof window.pauseRunning === "function"){
      qrmakerPublic.pauseRunning = window.pauseRunning;
    }
    if(typeof window.drawQRCode === "function"){
      qrmakerPublic.drawQRCode = window.drawQRCode;
    }
    if(typeof window.drawBasePatterns === "function"){
      qrmakerPublic.drawBasePatterns = window.drawBasePatterns;
    }
    if(typeof window.drawDataPatterns === "function"){
      qrmakerPublic.drawDataPatterns = window.drawDataPatterns;
    }
    if(typeof window.applyMask === "function"){
      qrmakerPublic.applyMask = window.applyMask;
    }
    if(typeof window.drawHelloWorld === "function"){
      qrmakerPublic.drawHelloWorld = window.drawHelloWorld;
    }
    if(typeof window.drawFinderPatterns === "function"){
      qrmakerPublic.drawFinderPatterns = window.drawFinderPatterns;
    }
    if(typeof window.drawAlignmentPatterns === "function"){
      qrmakerPublic.drawAlignmentPatterns = window.drawAlignmentPatterns;
    }
    if(typeof window.drawDarkModulePatterns === "function"){
      qrmakerPublic.drawDarkModulePatterns = window.drawDarkModulePatterns;
    }
    if(typeof window.drawFormatPatterns === "function"){
      qrmakerPublic.drawFormatPatterns = window.drawFormatPatterns;
    }
    if(typeof window.drawTimingPatterns === "function"){
      qrmakerPublic.drawTimingPatterns = window.drawTimingPatterns;
    }
    if(typeof window.putCell === "function"){
      qrmakerPublic.putCell = window.putCell;
    }
    if(typeof window.putFinderCells === "function"){
      qrmakerPublic.putFinderCells = window.putFinderCells;
    }
    if(typeof window.putAlignmentCells === "function"){
      qrmakerPublic.putAlignmentCells = window.putAlignmentCells;
    }
    if(typeof window.putDarkModuleCells === "function"){
      qrmakerPublic.putDarkModuleCells = window.putDarkModuleCells;
    }
    if(typeof window.putFormatCells === "function"){
      qrmakerPublic.putFormatCells = window.putFormatCells;
    }
    if(typeof window.putTimingCells === "function"){
      qrmakerPublic.putTimingCells = window.putTimingCells;
    }
    if(typeof window.isEmpty === "function"){
      qrmakerPublic.isEmpty = window.isEmpty;
    }
    if(typeof window.isMoveBlocked === "function"){
      qrmakerPublic.isMoveBlocked = window.isMoveBlocked;
    }
    if(typeof window.isSkipZone === "function"){
      qrmakerPublic.isSkipZone = window.isSkipZone;
    }
    if(typeof window.hasMoreData === "function"){
      qrmakerPublic.hasMoreData = window.hasMoreData;
    }
    if(typeof window.getNextData === "function"){
      qrmakerPublic.getNextData = window.getNextData;
    }
    if(typeof window.canContinueLoop === "function"){
      qrmakerPublic.canContinueLoop = window.canContinueLoop;
    }
    if(typeof window.setSwitch === "function"){
      qrmakerPublic.setSwitch = window.setSwitch;
    }
    if(typeof window.isSwitchOn === "function"){
      qrmakerPublic.isSwitchOn = window.isSwitchOn;
    }
  }
}
