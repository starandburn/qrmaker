// main.js is the bootstrap/orchestrator.
// It wires UI, editor, and APIs together; heavy logic lives in modules.
const safeWindow = (typeof window !== "undefined") ? window : null;
const typeUtils = (safeWindow && safeWindow.typeUtils) ? safeWindow.typeUtils : null;
if(!typeUtils
  || typeof typeUtils.isFunction !== "function"
  || typeof typeUtils.callIfFunction !== "function"
  || typeof typeUtils.callWithFallback !== "function"
){
  throw new Error("app/utils/type-utils.js must be loaded before main.js.");
}
const {
  callIfFunction,
  callWithFallback,
  isFunction,
} = typeUtils;
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
  const dom = (safeWindow && isFunction(safeWindow.createDomRefs))
    ? safeWindow.createDomRefs()
    : {};
  const btnGenerate = dom.btnGenerate;
  const btnInit = dom.btnInit;
  const btnClearCode = dom.btnClearCode;
  const btnCopyCode = dom.btnCopyCode;
  const btnFormatCode = dom.btnFormatCode;
  const btnPasteCode = dom.btnPasteCode;
  const debugLog = dom.debugLog;
  const dataPatternPanel = dom.dataPatternPanel;
  const codePanel = dom.codePanel;
  if(!dataPatternPanel){
    throw new Error("dataPatternPanel is required");
  }
  const userCodeParsed = dom.userCodeParsed;
  const footerCopy = dom.footerCopy;
  const versionInfo = dom.versionInfo;
  const userCodeInput = dom.userCodeInput;
  const stepMode = dom.stepMode;
  const stepSkipFunctions = dom.stepSkipFunctions;
  const stepSpeed = dom.stepSpeed;
  const stepSpeedLabel = dom.stepSpeedLabel;
  function isStepModeOn(){
    return !!(stepMode && stepMode.checked);
  }
  const toggleDebugValues = dom.toggleDebugValues;
  const titleIcon = dom.titleIcon;
  const toggleCursor = dom.toggleCursor;
  const toggleGuide = dom.toggleGuide;
  const toggleGrid = dom.toggleGrid;
  const toggleEmpty = dom.toggleEmpty;
  const toggleColor = dom.toggleColor;
  const txtInput = dom.txtInput;
  const configDefaults = (settings && typeof settings === "object") ? settings.defaults || {} : {};
  const resolvedSwitchCountForConfig = (() => {
    const key = urlState && urlState.PARAM_KEYS ? urlState.PARAM_KEYS.SWITCH_COUNT : null;
    if(!key || typeof urlState?.hasParam !== "function" || typeof urlState?.getParam !== "function"){
      return configDefaults.switchCount;
    }
    if(!urlState.hasParam(key)){
      return configDefaults.switchCount;
    }
    const raw = urlState.getParam(key);
    const numeric = Number(raw);
    if(!Number.isFinite(numeric)){
      return configDefaults.switchCount;
    }
    return Math.max(0, Math.min(4, Math.trunc(numeric)));
  })();
  const configDefaultsForSwitch = (resolvedSwitchCountForConfig === configDefaults.switchCount)
    ? configDefaults
    : Object.assign({}, configDefaults, { switchCount: resolvedSwitchCountForConfig });
  const resolvedDataTemplates = Array.isArray(configDefaults.dataTemplates)
    ? configDefaults.dataTemplates
    : [];
  const buildSetSwitchDescription = (color, next) => {
    const labelMap = { red: "赤", blue: "青", green: "緑", yellow: "黄" };
    const label = labelMap[color] || color;
    const desc = `スイッチを${next ? "ON" : "OFF"}に設定`.replace("スイッチ", `${label}スイッチ`);
    return desc;
  };
  const buildToggleSwitchDescription = (color) => {
    const labelMap = { red: "赤", blue: "青", green: "緑", yellow: "黄" };
    const label = labelMap[color] || color;
    const desc = `スイッチを反転`.replace("スイッチ", `${label}スイッチ`);
    return desc;
  };
  const switchController = (safeWindow && isFunction(safeWindow.createSwitchController))
    ? safeWindow.createSwitchController({
      configDefaults: configDefaultsForSwitch,
      executionStatusEl: dom.executionStatusEl,
      executionStatusTextEl: dom.executionStatusTextEl,
      buildSetSwitchDescription,
      buildToggleSwitchDescription,
    })
    : null;
  const ensureSwitchIndicators = switchController
    ? switchController.ensureSwitchIndicators
    : () => null;
  const resetSwitchStates = switchController
    ? switchController.resetSwitchStates
    : () => {};
  const toggleSwitchState = switchController
    ? switchController.toggleSwitch
    : () => false;
  const setSwitch = switchController
    ? switchController.setSwitch
    : () => false;
  const getSwitchStates = switchController
    ? switchController.getSwitchStates
    : () => ({});
  const isSwitchOn = (color) => Boolean(getSwitchStates()[color]);
  const homeCursorDirectionOverride = (typeof configDefaults.homeCursorDirection === "string")
    ? configDefaults.homeCursorDirection
    : null;
  if(homeCursorDirectionOverride && isFunction(safeWindow?.setHomeCursor)){
    safeWindow.setHomeCursor({ dir: homeCursorDirectionOverride });
  }
  const configuredQrData = (typeof configDefaults.qrData === "string") ? configDefaults.qrData : null;
  if(txtInput && configuredQrData !== null){
    txtInput.value = configuredQrData;
  }
  const DATA_DEFAULT_TEXT = configuredQrData !== null
    ? configuredQrData
    : (txtInput?.value ?? "Hello, World!");
  callWindowFunctionIfExists("refreshPatternIfPanelOpen");
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
  const settingsNormalizer = (safeWindow && isFunction(safeWindow.createSettingsNormalizer))
    ? safeWindow.createSettingsNormalizer()
    : null;
  const resolvedSettings = (settingsNormalizer && typeof settingsNormalizer.resolveSettings === "function")
    ? settingsNormalizer.resolveSettings(configDefaults)
    : null;
  if(settingsNormalizer && isFunction(settingsNormalizer.applyWindowSettings)){
    settingsNormalizer.applyWindowSettings(resolvedSettings);
  }
  const stepAnimationShowBorder = resolvedSettings.stepAnimationShowBorder;
  const stepAnimationDurationMs = resolvedSettings.stepAnimationDurationMs;
  const stepAnimationStartOpacity = resolvedSettings.stepAnimationStartOpacity;
  const stepAnimationStartScale = resolvedSettings.stepAnimationStartScale;
  const presentationRingEnabled = resolvedSettings.presentationRingEnabled;
  const presentationRingDurationMs = resolvedSettings.presentationRingDurationMs;
  const presentationRingSize = resolvedSettings.presentationRingSize;
  const presentationRingScaleStart = resolvedSettings.presentationRingScaleStart;
  const presentationRingScaleEnd = resolvedSettings.presentationRingScaleEnd;
  const presentationRingColor = resolvedSettings.presentationRingColor;
  const presentationRingShadowColor = resolvedSettings.presentationRingShadowColor;
  const presentationRingEase = resolvedSettings.presentationRingEase;
  const presentationRingDuration = resolvedSettings.presentationRingDuration;
  const codeZoomStepPx = resolvedSettings.codeZoomStepPx;
  const codeZoomMinPx = resolvedSettings.codeZoomMinPx;
  const codeZoomMaxPx = resolvedSettings.codeZoomMaxPx;
  const codeZoomHoldCount = resolvedSettings.codeZoomHoldCount;
  const codeZoomBasePx = resolvedSettings.codeZoomBasePx;
  const codeZoomLineHeightMinPx = resolvedSettings.codeZoomLineHeightMinPx;
  const codeZoomLineHeightRatio = resolvedSettings.codeZoomLineHeightRatio;
  const codeZoomLineHeightMaxOffsetPx = resolvedSettings.codeZoomLineHeightMaxOffsetPx;
  const layoutLeftPaneRatio = resolvedSettings.layoutLeftPaneRatio;
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
    if(typeof layoutLeftPaneRatio === "number" && Number.isFinite(layoutLeftPaneRatio)){
      const percent = Math.round(layoutLeftPaneRatio * 1000) / 10;
      rootStyle.setProperty("--layout-left-pane-percent", `${Math.min(90, Math.max(10, percent))}%`);
    }
  }

  const paneSplitter = document.getElementById("paneSplitter");
  if(paneSplitter && rootStyle){
    const STORAGE_KEY = "layoutLeftPaneRatio";
    const clamp01 = (value) => Math.min(0.9, Math.max(0.1, value));
    const applyRatio = (ratio) => {
      const clamped = clamp01(ratio);
      const percent = Math.round(clamped * 1000) / 10;
      rootStyle.setProperty("--layout-left-pane-percent", `${percent}%`);
      return clamped;
    };

    try{
      const stored = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
      if(stored !== null){
        const parsed = Number(stored);
        if(Number.isFinite(parsed)){
          applyRatio(parsed);
        }
      }
    }catch(_err){
      // ignore storage errors
    }

    let dragging = false;
    let pointerId = null;
    paneSplitter.addEventListener("pointerdown", (ev) => {
      if(ev.button !== 0) return;
      const layout = paneSplitter.parentElement;
      if(!layout) return;
      dragging = true;
      pointerId = ev.pointerId;
      paneSplitter.classList.add("is-dragging");
      try{
        paneSplitter.setPointerCapture(pointerId);
      }catch(_err){
        // ignore
      }
      ev.preventDefault();
    });

    const endDrag = () => {
      if(!dragging) return;
      dragging = false;
      pointerId = null;
      paneSplitter.classList.remove("is-dragging");
    };

    paneSplitter.addEventListener("pointermove", (ev) => {
      if(!dragging) return;
      if(pointerId !== null && ev.pointerId !== pointerId) return;
      const layout = paneSplitter.parentElement;
      if(!layout) return;
      const rect = layout.getBoundingClientRect();
      const splitterWidth = paneSplitter.getBoundingClientRect().width || 0;
      const available = Math.max(1, rect.width - splitterWidth);
      const x = ev.clientX - rect.left;
      const ratio = x / available;
      const next = applyRatio(ratio);
      try{
        if(window.localStorage){
          window.localStorage.setItem(STORAGE_KEY, String(next));
        }
      }catch(_err){
        // ignore storage errors
      }
      ev.preventDefault();
    });

    paneSplitter.addEventListener("pointerup", () => endDrag());
    paneSplitter.addEventListener("pointercancel", () => endDrag());
  }
  const layoutSetHistoryVisibility = layoutUI.setHistoryVisibility || (() => {});
  const appState = safeWindow?.appState;
  const store = (appState && isFunction(appState.getStore))
    ? appState.getStore({ historyVisible: false, patternPanelOpen: false, debugVisible: false })
    : null;
  const getHistoryVisible = () => (store ? Boolean(store.getState().historyVisible) : false);
  const getPatternPanelOpen = () => (store ? Boolean(store.getState().patternPanelOpen) : Boolean(dataPatternPanel?.open));
  const debugViewApply = isFunction(debugUI.applyDebugVisibility) ? debugUI.applyDebugVisibility : (() => {});
  const debugViewIsVisible = isFunction(debugUI.isDebugVisible) ? debugUI.isDebugVisible : (() => false);
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
  callIfFunction(window.bindUiEvents, {
    setHistoryVisibility,
    getHistoryVisible,
    setPatternPanelOpen,
  });
  const getDebugPanel = () => debugUI.debugPanel;
  if(!window.historyController){
    throw new Error("state/history-store.js must be loaded before main.js.");
  }
  const historyController = window.historyController;
  const getCurrentCodeValue = () => {
    return userCodeInput ? userCodeInput.value ?? "" : "";
  };
  callIfFunction(window.bindHistoryUI, {
    dom,
    layoutUI,
    store,
    historyController,
    getCurrentCodeValue,
    setHistoryVisibility,
    getHistoryVisible,
  });
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
    PARAM_KEYS,
    INTERNAL_PARAM_KEYS,
    hasParam,
    getParam,
    getBoolParam,
    getDataParam,
  } = urlState;
  const presentationMode = hasParam(INTERNAL_PARAM_KEYS.PRESENTATION_MODE)
    ? getParam(INTERNAL_PARAM_KEYS.PRESENTATION_MODE) === "1"
    : Boolean(configDefaults.presentationMode);
  const initialDebugParamPresent = hasParam(PARAM_KEYS.DEBUG);
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
  const MASK_INDEX_MIN = 0;
  const MASK_INDEX_MAX = 7;
  const formatMaskInputValue = (value) => {
    if(value === undefined) return "undefined";
    return String(value);
  };
  const buildMaskErrorDetail = (value) => (
    `マスク番号が不正です: ${formatMaskInputValue(value)}（有効範囲: ${MASK_INDEX_MIN}～${MASK_INDEX_MAX}）`
  );
  const reportMaskCommandError = (value) => {
    const detail = buildMaskErrorDetail(value);
    setExecutionStatus("warning", undefined, detail);
    callIfFunction(safeWindow?.logEvent, "applyMask", value ?? "", detail);
    callIfFunction(console?.error, detail);
  };
    const normalizeMaskCommandValue = (rawValue) => {
      if(rawValue === undefined){
        return { valid: true, index: 0 };
      }
    const numeric = Number(rawValue);
    if(!Number.isFinite(numeric)){
      return { valid: false, raw: rawValue };
    }
    const truncated = Math.trunc(numeric);
    if(truncated < MASK_INDEX_MIN || truncated > MASK_INDEX_MAX){
      return { valid: false, raw: rawValue };
    }
    return { valid: true, index: truncated };
  };
  const skipExistingFromParam = getBoolParam(PARAM_KEYS.SKIP_EXISTING);
  const skipExistingCells = (skipExistingFromParam !== null)
    ? skipExistingFromParam
    : defaultSkipExistingCells;
  const autoAvoidTimingFromParam = getBoolParam(PARAM_KEYS.AUTO_AVOID_TIMING);
  const autoAvoidTiming = (autoAvoidTimingFromParam !== null)
    ? autoAvoidTimingFromParam
    : defaultAutoAvoidTiming;
  const useDirectionFromParam = getBoolParam(PARAM_KEYS.USE_DIRECTION);
  const useDirection = (useDirectionFromParam !== null)
    ? useDirectionFromParam
    : defaultUseDirection;
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
    callIfFunction(window.flushRender);
  };
  applyPatternOpenFromParam({ dataPatternPanel, setPatternPanelOpen });
  applyDebugFromParam({ debugPanel: getDebugPanel(), setDebugVisible });
  applyHistoryFromParam({ codePanel, setHistoryVisibility });
  applySampleParam({ codePanel });
  if(!hasParam(PARAM_KEYS.PATTERN_PANEL)){
    setPatternPanelOpen(defaultPatternOpen);
  }
  if(!hasParam(PARAM_KEYS.DEBUG)){
    setDebugVisible(defaultDebugVisible);
  }
  if(!hasParam(PARAM_KEYS.HISTORY)){
    setHistoryVisibility(defaultHistoryVisible);
  }
  if(!btnGenerate || !btnInit) return;
  const statusManager = (safeWindow && isFunction(safeWindow.createExecutionStatusManager))
    ? safeWindow.createExecutionStatusManager({
      dom,
      inputMaxLength: Number(txtInput?.getAttribute("maxlength")) || 32,
      isStepModeOn,
    })
    : null;
  const setExecutionStatus = statusManager
    ? statusManager.setExecutionStatus
    : () => {};
  const normalizeInputBeforeRun = statusManager
    ? statusManager.normalizeInputBeforeRun
    : () => ({ ok: true });
  const setInputLock = statusManager
    ? statusManager.setInputLock
    : () => {};
  const getLastExecutionError = statusManager
    ? statusManager.getLastExecutionError
    : () => null;
  const setLastExecutionError = statusManager
    ? statusManager.setLastExecutionError
    : () => {};
  setExecutionStatus("stopped");
  if(!isFunction(safeWindow?.createUiState)){
    throw new Error("ui/ui-state.js must be loaded before main.js.");
  }
  const uiState = safeWindow.createUiState();
  const EXEC_STATUS = {
    RUNNING: "running",
    STOPPED: "stopped",
  };
  const runGuardedExecution = async ({ kind, statusRunning = EXEC_STATUS.RUNNING, statusDone = EXEC_STATUS.STOPPED } = {}, fn) => {
    if(typeof fn !== "function") return fn;
    const hasLock = uiState.hasInputLockToken();
    if(hasLock){
      return fn();
    }
    uiState.setInputLockToken(1);
    setInputLock(true);
    if(statusRunning){
      setExecutionStatus(statusRunning);
    }
    try{
      return await fn();
    }finally{
      setInputLock(false);
      uiState.clearInputLockToken();
      if(statusDone){
        setExecutionStatus(statusDone);
      }
    }
  };
  const isInputLocked = () => Boolean(txtInput?.readOnly || userCodeInput?.readOnly);
  if(userCodeInput){
    const initialCode = (typeof userCodeInput.value === "string") ? userCodeInput.value.trim() : "";
    btnGenerate.disabled = !initialCode;
  }

  const API_STATUS_DESCRIPTIONS = {
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
  const cursorUI = (isFunction(safeWindow?.createExecutionStatusCursor))
    ? safeWindow.createExecutionStatusCursor({
      dom,
      getCursorState: () => {
        const ref = (typeof window.cellRefFromRowCol === "function")
          ? safeWindow?.cellRefFromRowCol(cursorPos.row, cursorPos.col)
          : "";
        return {
          row: cursorPos.row,
          col: cursorPos.col,
          dir: cursorPos.dir,
          ref,
          directionEnabled: useDirection === true,
          dirConstants: {
            DIR_UP: safeWindow?.DIR_UP,
            DIR_RIGHT: safeWindow?.DIR_RIGHT,
            DIR_DOWN: safeWindow?.DIR_DOWN,
            DIR_LEFT: safeWindow?.DIR_LEFT,
          },
          switchIndicatorGroupEl: ensureSwitchIndicators(),
        };
      },
      getBoardCellInfo: () => ({
        getCurrentValue: () => (typeof window.getCell === "function")
          ? safeWindow?.getCell(cursorPos.row, cursorPos.col)
          : null,
        getCurrentKind: (value) => (typeof window.bitKind === "function" && typeof value === "number")
          ? safeWindow?.bitKind(value)
          : (typeof value === "number" ? Math.abs(value) : null),
        colorsForKind: (kind) => (typeof window.colorsForKind === "function")
          ? safeWindow?.colorsForKind(kind)
          : "black",
        isBlackBit: (value) => (typeof window.isBlackBit === "function")
          ? safeWindow?.isBlackBit(value)
          : value > 0,
        unplacedKind: (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : -1,
        isDrawingBasePattern: Boolean(window.isDrawingBasePattern),
        getNextBasePatternInfos: (count) => (typeof window.getNextBasePatternInfos === "function")
          ? safeWindow?.getNextBasePatternInfos(count)
          : [],
        getNextDataInfos: (count) => (typeof window.getNextDataInfos === "function")
          ? safeWindow?.getNextDataInfos(count)
          : [],
        getNextDataInfo: () => (typeof window.getNextDataInfo === "function")
          ? safeWindow?.getNextDataInfo()
          : null,
      }),
      isCursorVisible: () => true,
      logEvent: isFunction(safeWindow?.logEvent) ? safeWindow.logEvent : null,
    })
    : null;
  const updateExecutionStatusCursor = isFunction(cursorUI?.updateExecutionStatusCursor)
    ? cursorUI.updateExecutionStatusCursor
    : undefined;
  const setBasePatternLookahead = (infos) => {
    window.basePatternLookahead = Array.isArray(infos) ? infos : [];
  };
  const getNextBasePatternInfos = (count = 4) => {
    const list = Array.isArray(window.basePatternLookahead) ? window.basePatternLookahead : [];
    return list.slice(0, Math.max(0, count));
  };

  let clearNoiseLayer = () => {};
  let isQRCodeReadable = false;
  let noiseSingleClickEnabled = false;
  const noiseModeHintEl = dom.noiseModeHint;
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

  // moved to ui/bind-events.js (phase1)

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
    get runId(){ return uiState.getRunId(); },
    set runId(value){ return uiState.setRunId(value); },
    get maskRunId(){ return uiState.getMaskRunId(); },
    set maskRunId(value){ return uiState.setMaskRunId(value); },
    get isStepFillRunning(){ return uiState.getIsStepFillRunning(); },
    set isStepFillRunning(value){ return uiState.setIsStepFillRunning(value); },
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
  ctx.helpers = ctx.helpers || {};
  ctx.invalidateRun = () => uiState.invalidateRun();
  ctx.invalidateMaskRun = () => uiState.invalidateMaskRun();
  ctx.setStepFillRunning = (value) => uiState.setStepFillRunning(value);
  ctx.stopAllRuns = () => uiState.stopAllRuns();
  let formatWrittenMaskValue = 0;
  const normalizeFormatMaskValue = (value) => {
    if(Number.isFinite(value)){
      return Number(value) & 3;
    }
    const numeric = Number(value);
    if(Number.isFinite(numeric)){
      return Math.trunc(numeric) & 3;
    }
    return 0;
  };
  const getFormatWrittenMask = () => formatWrittenMaskValue;
  const setFormatWrittenMask = (value) => {
    formatWrittenMaskValue = normalizeFormatMaskValue(value);
    return formatWrittenMaskValue;
  };
  const markFormatSideWritten = (side) => {
    const bit = (side === 1) ? 2 : (side === 0 ? 1 : 0);
    if(bit){
      formatWrittenMaskValue |= bit;
    }
    return formatWrittenMaskValue;
  };
  const markAllFormatWritten = () => setFormatWrittenMask(3);
  const clearFormatWritten = () => setFormatWrittenMask(0);

  ctx.getFormatWrittenMask = getFormatWrittenMask;
  ctx.setFormatWrittenMask = setFormatWrittenMask;
  ctx.markFormatSideWritten = markFormatSideWritten;
  ctx.markAllFormatWritten = markAllFormatWritten;
  ctx.clearFormatWritten = clearFormatWritten;
  if(!window.domainQrParams){
    throw new Error("domain/qr-params.js must be loaded before main.js.");
  }
  const domainQrParams = window.domainQrParams;
  const applyDataParam = (typeof domainQrParams.applyDataParam === "function")
    ? (options) => domainQrParams.applyDataParam(options)
    : () => false;
  ctx.FORMAT_L = FORMAT_L;
  const runIdAccessor = {
    get: () => uiState.getRunId(),
    set: (value) => uiState.setRunId(value),
    increment: () => uiState.incrementRunId(),
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
  const bumpPauseAbortVersion = () => {
    if(typeof window === "undefined") return;
    const current = Number.isFinite(window.__pauseAbortVersion) ? window.__pauseAbortVersion : 0;
    window.__pauseAbortVersion = current + 1;
  };
  const setTimingRowIndex = (value) => { timingRowIndex = value; };
  const setPendingCursor = (value) => { pendingCursor = value; };
  const boardReset = (typeof window !== "undefined" && typeof window.createBoardReset === "function")
    ? window.createBoardReset({
      boardMatrix,
      cellStates,
      boardRows: BOARD_ROWS,
      boardCols: BOARD_COLS,
      unplacedKind: UNPLACED_KIND,
      setTimingColIndex: window.setTimingColIndex,
      setTimingRowIndex,
      setFormatWrittenMask: ctx.setFormatWrittenMask,
      resetData,
      resetCursor,
      requestRender,
      clearNoiseLayer,
      setQRCodeReadable,
      setRenderMode,
      renderModeImmediate: RENDER_IMMEDIATE,
      ctx,
      resetSwitchStates,
      setPendingCursor,
      showApiStatus,
      sleep,
      resetDelayMs: RESET_DELAY_MS,
      logMessages: {
        resetBoardState: "盤面状態をリセット",
        resetBoard: "盤面状態をリセット",
        clearBoard: "盤面をクリア",
      },
    })
    : null;
  const clearBoardSurface = boardReset ? boardReset.clearBoardSurface : () => false;
  const clearBoard = boardReset ? boardReset.clearBoard : () => false;
  const resetBoardState = boardReset ? boardReset.resetBoardState : () => {};
  const resetBoard = boardReset ? boardReset.resetBoard : () => false;
  function stopCurrentRun({ resetCursor: resetCursorFlag = false, clear = false, reason = "", resetData: resetDataFlag = true } = {}){
    bumpPauseAbortVersion();
    ctx.stopAllRuns();
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
      setExecutionStatus("stopped", undefined, reason, { lockStopReason: true });
    }else if(clear){
      setExecutionStatus("stopped", undefined, undefined, { clearStopReason: true, suppressUpdate: true });
    }
    return resetResult;
  }

  let cellsInitialized = false;
  ctx.resetBoard = resetBoard;
  ctx.resetCursor = resetCursor;

  // Guarded cursor update for async flows: only applies if runToken matches current runId
  function updateCursorIfRun(runToken, row, col, dir = cursorPos.dir){
    if(runToken !== uiState.getRunId()) return false;
    return updateCursor(row, col, dir);
  }

  const stepFillAccessor = {
    get: () => uiState.getIsStepFillRunning(),
    set: (value) => { uiState.setIsStepFillRunning(value); },
  };

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

  const viewFlagsApi = (typeof window.setupViewFlags === "function")
    ? window.setupViewFlags({
      dom,
      configDefaults,
      settings,
      urlState,
      store,
      requestRender,
      setRenderMode,
      RENDER_IMMEDIATE,
      logEvent: isFunction(window.logEvent) ? window.logEvent : null,
      onColorChange: (enabled) => {
        isColorEnabled = enabled;
        reapplyCellColors();
      },
    })
    : null;
  if(viewFlagsApi && typeof viewFlagsApi.isColorEnabled === "function"){
    const v = viewFlagsApi.isColorEnabled();
    if(typeof v === "boolean"){
      isColorEnabled = v;
    }
  }

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

  const wrapDrawApi = (name, fn, description) => {
    const wrapped = async function(...args){
      showApiStatus(name);
      const mainArg = args[0] ?? "";
      window.logEvent(name, mainArg, description);
      return fn.apply(this, args);
    };
    return wrapped;
  };
  const patternCallers = (typeof window !== "undefined" && typeof window.createPatternCallers === "function")
    ? window.createPatternCallers({ ctx })
    : {};
  const {
    putFinderCellsCore = () => false,
    drawFinderPatternsCore = () => false,
    putAlignmentCellsCore = () => false,
    drawAlignmentPatternsCore = () => false,
    putTimingCellsCore = () => false,
    drawTimingPatternsCore = () => false,
    putDarkModuleCellsCore = () => false,
    drawDarkModulePatternsCore = () => false,
    putFormatCellsCore = () => false,
    callRenderFormatSide = () => false,
    drawFormatPatternsCore = () => false,
  } = patternCallers;

  const putFinderCells = (...args) => putFinderCellsCore(...args);
  const putAlignmentCells = (...args) => putAlignmentCellsCore(...args);
  const putTimingCells = (...args) => putTimingCellsCore(...args);
  const putDarkModuleCells = (...args) => putDarkModuleCellsCore(...args);
  const putFormatCells = (...args) => putFormatCellsCore(...args);

  async function applyMaskCore(maskIndex = defaultMaskIndex){
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
        callIfFunction(window.setRenderMode, mode);
      };
    const baseRun = ctx.runId;
    const currentMaskRun = uiState.incrementMaskRunId();
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
      const formatWrittenMask = (typeof ctx.getFormatWrittenMask === "function") ? ctx.getFormatWrittenMask() : 0;
      if(completed && formatWrittenMask){
        showApiStatus("applyMaskFormat");
        const formatBits = (ctx.FORMAT_L && Number.isFinite(ctx.FORMAT_L[idx])) ? ctx.FORMAT_L[idx] : null;
        const formatHex = Number.isFinite(formatBits) ? formatBits.toString(16).toUpperCase().padStart(4, "0") : "----";
        window.logEvent("applyMask", idx, `フォーマットパターンを更新（${formatHex}）`);
        if(formatWrittenMask & 1){
          await callRenderFormatSide(0, idx, true);
        }
        if(formatWrittenMask & 2){
          await callRenderFormatSide(1, idx, true);
        }
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
  const applyMask = (...args) => {
    if(!ctx) return false;
    const rawValue = (args.length > 0) ? args[0] : undefined;
    const normalized = normalizeMaskCommandValue(rawValue);
    if(!normalized.valid){
      reportMaskCommandError(rawValue);
      return false;
    }
    return runGuardedExecution(
      { kind: "applyMask" },
      () => applyMaskCore(normalized.index),
    );
  };
  async function drawBasePatternsCore(ctx, { deferFlush = false, currentRun, resetDelay = false } = {}){
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
        callIfFunction(window.setBasePatternLookahead, []);
      }
      try{
        const result = await fn(...fnArgs);
        return result;
      }finally{
        if(typeof window !== "undefined"){
          window.isDrawingBasePattern = false;
          callIfFunction(window.setBasePatternLookahead, []);
        }
      }
    };
    await runFunctionalPattern(drawFinderPatterns, opts.overwrite, opts.currentRun);
    await runFunctionalPattern(drawTimingPatterns, opts.overwrite, opts.currentRun);
    await runFunctionalPattern(drawAlignmentPatterns, opts.overwrite, opts.currentRun);
    await runFunctionalPattern(drawDarkModulePatterns, opts.overwrite, opts.currentRun);
    await runFunctionalPattern(drawFormatPatterns, undefined, opts.overwrite, opts.currentRun);
    ctx.markAllFormatWritten?.();
    window.logEvent("drawBasePatterns", currentRun ?? "", "基本パターン描画完了");
    if(!deferFlush){
      requestRender("drawBasePatterns");
      setRenderMode(RENDER_IMMEDIATE);
    }else{
      setRenderMode(prevRender);
    }
    resetCursor();
    return true;
  }
  async function drawBasePatternsSteppedCore(ctx, { currentRun } = {}){
    const ok = await drawBasePatternsCore(ctx, { currentRun, resetDelay: true });
    return { ok: Boolean(ok), fastForwarded: false };
  }
  const drawBasePatterns = (...args) => {
    if(!ctx) return false;
    return drawBasePatternsCore(ctx, ...args);
  };
  const drawBasePatternsStepped = (...args) => {
    if(!ctx) return { ok: false, fastForwarded: false };
    return drawBasePatternsSteppedCore(ctx, ...args);
  };
  const drawFinderPatterns = wrapDrawApi("drawFinderPatterns", drawFinderPatternsCore, "ファインダーパターンを描画");
  const drawAlignmentPatterns = wrapDrawApi("drawAlignmentPatterns", drawAlignmentPatternsCore, "アライメントパターンを描画");
  const drawDarkModulePatterns = wrapDrawApi("drawDarkModulePatterns", drawDarkModulePatternsCore, "ダークモジュールを描画");
  const drawTimingPatterns = wrapDrawApi("drawTimingPatterns", drawTimingPatternsCore, "タイミングパターンを描画");
  const drawFormatPatterns = wrapDrawApi("drawFormatPatterns", drawFormatPatternsCore, "フォーマットパターンを描画");
  ctx.drawFormatPatterns = drawFormatPatterns;
  async function drawDataPatterns({ currentRun } = {}){
    window.logEvent("drawDataPatterns", currentRun ?? "", "データパターン描画");
    showApiStatus("drawDataPatterns");
    const runToken = (typeof currentRun === "number") ? currentRun : uiState.getRunId();
    const shouldAbort = () => runToken !== uiState.getRunId();
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
      if(statusManager?.updateDataPatternStatus?.(kind)){
        dataPatternStageDirty = true;
      }
    };
    const finalizeStage = () => {
      if(dataPatternStageDirty){
        statusManager?.resetDataPatternStage?.();
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
    while(hasNextData()){
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
        if(runToken === uiState.getRunId() && typeof resetData === "function"){
          resetData();
        }
        return runToken === uiState.getRunId();
      }finally{
        finalizeStage();
        if(!stepModeOn){
          requestRender("drawDataPatterns");
          setRenderMode(prevRenderMode);
          if(typeof window !== "undefined"){
            window.suppressCursorUpdates = prevSuppressCursorUpdates;
            window.suppressDataPatternLog = prevSuppressDataPatternLog;
            callIfFunction(cursorUI?.updateExecutionStatusCursor);
          }
        }else if(typeof window !== "undefined"){
          window.suppressDataPatternLog = prevSuppressDataPatternLog;
        }
        if(isFunction(window.logEvent)){
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
  async function composeQRCode(arg){
    const resetOk = await resetBoard();
    if(resetOk === false) return false;
    const baseOk = await drawBasePatterns();
    if(!baseOk) return false;
    const dataOk = await drawDataPatterns();
    if(!dataOk) return false;
    let maskOk;
    if(arg === undefined){
      maskOk = await applyMask();
    }else if(typeof arg === "object" && arg !== null){
      maskOk = await applyMask(arg.maskIndex);
    }else{
      maskOk = await applyMask(arg);
    }
    if(!maskOk) return false;
    return true;
  }

  const renderQRCode = () => {
    if(typeof requestRender === "function"){
      requestRender("drawQRCode");
      return;
    }
    callIfFunction(window.flushRender);
  };

  async function drawQRCode(arg){
    window.logEvent("drawQRCode", arg ?? "", "QRコード描画開始");
    const composed = await composeQRCode(arg);
    if(!composed) return false;
    renderQRCode();
    window.logEvent("drawQRCode", arg ?? "", "QRコード描画完了");
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

  const stopAndReset = ({ resetData: resetDataFlag = true } = {}) => {
    window.logEvent("btnInit", "", "初期化ボタン押下");
    stopCurrentRun({ resetCursor: false, clear: false });
    const resetResult = resetBoard({ resetData: resetDataFlag });
    if(userCodeInput){
      const codeText = (typeof userCodeInput.value === "string") ? userCodeInput.value.trim() : "";
      btnGenerate.disabled = !codeText;
      if(!codeText){
        setExecutionStatus("stopped", undefined, "実行できるプログラムがありません。");
      }
    }
    btnInit.disabled = false;
    setRenderMode(RENDER_IMMEDIATE);
    setLastExecutionError(null);
    if(!userCodeInput || (typeof userCodeInput.value === "string" && userCodeInput.value.trim())){
      setExecutionStatus("stopped");
    }
    return resetResult;
  };
  btnInit.addEventListener("click", stopAndReset);
  document.addEventListener("keydown", (ev) => {
    if(ev.key !== "Escape") return;
    if(ev.repeat) return;
    const asciiModal = document.getElementById("asciiModal");
    if(asciiModal && !asciiModal.classList.contains("hidden")) return;
    stopAndReset();
    ev.preventDefault();
  });

  const logVerificationOutcome = () => {
    const verifyService = globalThis.qrVerifyService;
    if(!verifyService || typeof verifyService.verifyBoard !== "function") return null;
    showApiStatus("verify");
    const result = verifyService.verifyBoard();
    setQRCodeReadable(Boolean(result?.ok));
    if(!result) return null;
    const inputValue = txtInput?.value ?? "";
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

  btnGenerate.addEventListener("click", async () => {
    historyController.ensureRunHistory();
    window.logEvent("btnGenerate", "", "コード生成ボタン押下");
    const patternUpdated = callIfFunction(window.refreshPatternForCreate) ?? false;
    if(isInputLocked()){
      const resetWait = stopAndReset({ resetData: Boolean(patternUpdated) });
      if(resetWait && isFunction(resetWait.then)){
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
    const generateToken = callIfFunction(
      window.beginGenerateClick,
      { uiState, setExecutionStatus, setInputLock },
    ) ?? null;
    const lockToken = generateToken ? generateToken.lockToken : null;
    let runOk = false;
    let verificationOutcome = null;
    const shouldStepRun = isFunction(isStepModeOn) && isStepModeOn();
    const prevRenderMode = ctx.renderMode;
    const prevSuppressCursorUpdates = typeof window !== "undefined" ? window.suppressCursorUpdates : false;
    const perfNow = (typeof performance !== "undefined" && isFunction(performance.now))
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
      runOk = await runGuardedExecution(
        { kind: "step" },
        () => runUserCodeWithStep(),
      );
      runDurationMs = Math.max(0, perfNow() - runStart);
    }finally{
      if(!shouldStepRun){
        requestRender("runUserCodeBuffered");
        setRenderMode(prevRenderMode);
        if(typeof window !== "undefined"){
          window.suppressCursorUpdates = prevSuppressCursorUpdates;
          callIfFunction(cursorUI?.updateExecutionStatusCursor);
        }
      }
      callIfFunction(
        window.endGenerateClick,
        { uiState, setInputLock },
        { lockToken },
      );
      callIfFunction(
        window.logEvent,
        "perfRunUserCode",
        JSON.stringify({ ms: Math.round(runDurationMs) }),
        "実行時間",
      );
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
        const lastError = getLastExecutionError();
        if(lastError){
          setExecutionStatus("error", lastError);
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
            callIfFunction(
              window.logEvent,
              "perfVerify",
              JSON.stringify({ ms: Math.round(verifyDurationMs) }),
              "検証時間",
            );
            applyExecutionStatus(verificationOutcome);
          }catch(err){
            callIfFunction(
              window.logEvent,
              "perfVerify",
              JSON.stringify({ error: String(err) }),
              "検証失敗",
            );
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
    if(target && isFunction(target.closest)){
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
  H.drawFinderPatterns = drawFinderPatterns;
  H.drawTimingPatterns = drawTimingPatterns;
  H.drawAlignmentPatterns = drawAlignmentPatterns;
  H.drawFormatPatterns = drawFormatPatterns;
  H.drawDarkModulePatterns = drawDarkModulePatterns;
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

  const colorToggleEl = toggleColor;
  if(toggleDebugValues){
    toggleDebugValues.addEventListener("change", syncDebugOverlay);
  }
  if(Array.isArray(window.toggleInputs) && toggleDebugValues && !window.toggleInputs.includes(toggleDebugValues)){
    window.toggleInputs.push(toggleDebugValues);
  }
  applyDataParam({
    txtInput,
    getDataParam,
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
    syncViewToggles: isFunction(window.syncViewToggles) ? window.syncViewToggles : undefined,
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
      if(isFunction(window.syncViewLayout)){
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
      if(!statusManager?.isExecutionRunning?.()){
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
  callIfFunction(window.setupSampleUI, { dom, configDefaults, resolvedDataTemplates, historyController });
  const clipboardApi = (typeof navigator !== "undefined" ? navigator.clipboard : null);
  if(btnCopyCode){
    if(clipboardApi && isFunction(clipboardApi.writeText)){
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
  if(btnFormatCode){
    const FULLWIDTH_CHAR_REGEX = /[^\u0000-\u007F]/;
    const formatStudentCode = (value) => {
      const text = (typeof value === "string") ? value : "";
      const newline = text.includes("\r\n") ? "\r\n" : "\n";
      const lines = text.split(/\r?\n/);
      const leadingTabLines = lines.filter((line) => /^\t+/.test(line)).length;
      const leadingSpaceLines = lines.filter((line) => /^ +/.test(line)).length;
      const indentUnit = (leadingTabLines > leadingSpaceLines) ? "\t" : "    ";
      const openers = new Set(["if","while","until","repeat","for","loop"]);
      const closers = new Set(["endif","endwhile","enduntil","endrepeat","endfor","endloop","end"]);
      let depth = 0;
      const splitComment = (raw) => {
        const line = String(raw ?? "");
        let min = -1;
        const candidates = [];
        const slash = line.indexOf("//");
        if(slash >= 0) candidates.push(slash);
        const hash = line.indexOf("#");
        if(hash >= 0) candidates.push(hash);
        const apos = line.indexOf("'");
        if(apos >= 0) candidates.push(apos);
        for(const idx of candidates){
          if(idx < 0) continue;
          if(min === -1 || idx < min) min = idx;
        }
        if(min === -1){
          return { code: line, comment: "" };
        }
        return { code: line.slice(0, min), comment: line.slice(min) };
      };
      const isBlockOpener = (trimmedCode) => {
        const lower = trimmedCode.toLowerCase();
        const headMatch = lower.match(/^([a-z_$][a-z0-9_$-]*)\b/);
        if(!headMatch) return false;
        const head = headMatch[1];
        if(!openers.has(head)) return false;
        if(head === "if" || head === "while" || head === "until"){
          if(!trimmedCode.includes("?") && /\b(if|while|until)\s+\S+\s+\S/i.test(trimmedCode)){
            return false;
          }
          if(/\?\s+\S/.test(trimmedCode)){
            return false;
          }
        }
        return true;
      };
      const isOneLineElse = (trimmedCode) => {
        if(!/^else\b/i.test(trimmedCode)) return false;
        return /\belse\s+\S/.test(trimmedCode);
      };

      const out = [];
      for(const rawLine of lines){
        if(FULLWIDTH_CHAR_REGEX.test(rawLine)){
          out.push(rawLine);
          continue;
        }
        const original = String(rawLine ?? "");
        if(!original.trim()){
          out.push("");
          continue;
        }
        const { code, comment } = splitComment(original);
        const trimmedCode = code.trim();
        const trimmedComment = comment.replace(/\s+$/g, "");
        const lower = trimmedCode.toLowerCase();
        const headMatch = lower.match(/^([a-z_$][a-z0-9_$-]*)\b/);
        const head = headMatch ? headMatch[1] : "";
        const isCloser = Boolean(head && (closers.has(head) || head === "else"));
        if(isCloser){
          depth = Math.max(0, depth - 1);
        }
        const indent = indentUnit.repeat(depth);
        const combined = trimmedCode + (trimmedComment ? ` ${trimmedComment.trimStart()}` : "");
        out.push(indent + combined.replace(/\s+$/g, ""));
        if(head === "else"){
          if(!isOneLineElse(trimmedCode)){
            depth += 1;
          }
          continue;
        }
        if(isBlockOpener(trimmedCode)){
          depth += 1;
        }
      }
      return out.join(newline);
    };

    btnFormatCode.addEventListener("click", () => {
      if(!userCodeInput) return;
      const before = userCodeInput.value ?? "";
      const after = formatStudentCode(before);
      if(after === before) return;
      userCodeInput.value = after;
      userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
      historyController.commitPendingHistory("整形");
    });
  }
  if(btnPasteCode){
    if(clipboardApi && isFunction(clipboardApi.readText)){
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
      const buildFn = isFunction(buildStateUrlFromState)
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
        switchCount: resolvedSwitchCountForConfig,
        defaultSwitchCount: configDefaults.switchCount,
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
  // moved to ui/bind-events.js (phase1)

  const initOfflineCodeEditor = () => {
    const ta = userCodeInput;
    const host = dom.userCodeEditorHost;
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

  const windowApi = (safeWindow && isFunction(safeWindow.createWindowApi))
    ? safeWindow.createWindowApi(safeWindow, {
      applyMask,
      drawBasePatterns,
      drawBasePatternsStepped,
      makeStepThenable,
      shouldStepFunctions,
      drawQRCode,
      drawDataPatterns,
      resetBoard,
      clearBoard,
      stopCurrentRun,
      drawFormatPatterns,
      drawFinderPatterns,
      drawAlignmentPatterns,
      drawDarkModulePatterns,
      drawTimingPatterns,
      putFinderCells,
      putAlignmentCells,
      putTimingCells,
      putDarkModuleCells,
      putFormatCells,
    })
    : null;
  const uiDeps = {
    dom,
    editor: (typeof window !== "undefined") ? window.__codeEditor : null,
    windowApi,
    qrmaker: (typeof window !== "undefined") ? window.qrmaker : null,
  };
  if(isFunction(window.bindSimpleUiEvents)){
    window.bindSimpleUiEvents(uiDeps);
  }
  callIfFunction(window.registerGlobalApi, {
    isStepModeOn,
    skipExistingCells,
    autoAvoidTiming,
    useDirection,
    updateExecutionStatusCursor,
    isDrawingBasePattern: false,
    basePatternLookahead: [],
    setBasePatternLookahead,
    getNextBasePatternInfos,
    setRenderMode,
    shouldStepFunctions,
    RENDER_IMMEDIATE,
    RENDER_BUFFERED,
    updateCursor,
    boardMatrix,
    getNextData,
    invertCell,
    buildFunctionSet,
    parseCellRef,
    cellRefFromRowCol,
    moveCursor,
    turnCursor,
    setSwitch,
    isSwitchOn,
    toggleSwitchState,
    applyMask,
    drawBasePatterns,
    drawBasePatternsStepped,
    drawQRCode,
    drawDataPatterns,
    resetBoard,
    clearBoard,
    stopCurrentRun,
    drawFormatPatterns,
    drawFinderPatterns,
    drawAlignmentPatterns,
    drawDarkModulePatterns,
    drawTimingPatterns,
    putFinderCells,
    putAlignmentCells,
    putTimingCells,
    putDarkModuleCells,
    dark: putDarkModuleCells,
    darkmodule: putDarkModuleCells,
    putFormatCells,
    makeStepThenable,
  });
}
