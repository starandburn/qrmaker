
/**
 * 実行環境を初期化し、UI/状態/描画APIの依存を束ねるメイン関数。
 */
function runMainApp({ urlState = window.urlState || {}, layoutUI = window.layoutUI || {}, debugUI = window.debugUI || {} } = {}){
  const btnGenerate = document.getElementById("btnGenerate");
  const btnInit = document.getElementById("btnInit");
  const btnClearCode = document.getElementById("btnClearCode");
  const btnCopyCode = document.getElementById("btnCopyCode");
  const btnPasteCode = document.getElementById("btnPasteCode");
  const debugLog = document.getElementById("debugLog");
  const dataPatternPanel = document.getElementById("dataPatternPanel") || document.getElementById("patternDetails");
  const codePanel = document.querySelector(".code-panel");
  const userCodeParsed = document.getElementById("userCodeParsed");
  const footerCopy = document.querySelector(".page-footer p:first-child");
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
  const toggleDebugValues = document.getElementById("toggleDebugValues");
  const titleIcon = document.querySelector(".title-icon");
  const toggleCursor = document.getElementById("toggleCursor");
  const toggleGuide = document.getElementById("toggleGuide");
  const toggleGrid = document.getElementById("toggleGrid");
  const toggleEmpty = document.getElementById("toggleEmpty");
  const toggleColor = document.getElementById("toggleColor");
  const txtInput = document.getElementById("txtInput");
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
  const historyController = window.historyController || {
    pushHistorySnapshot: () => {},
    markHistoryPending: () => {},
    commitPendingHistory: () => false,
    ensureRunHistory: () => {},
    finalizeRunHistoryEntry: () => {},
    pruneHistoryEntries: () => {},
    getEntry: () => null,
    getEntries: () => [],
    setRenderer: () => {},
    setValueGetter: () => {},
  };
  historyController.setRenderer(renderHistoryList);
  const getCurrentCodeValue = () => {
    return userCodeInput ? userCodeInput.value ?? "" : "";
  };
  historyController.setValueGetter(getCurrentCodeValue);
  const urlParams = urlState.params || new URLSearchParams(window.location.search || "");
  const {
    decodeDataParamValue,
    applyPatternOpenFromParam,
    applyDebugFromParam,
    applyHistoryFromParam,
    applySampleParam,
    applyCombinedStepParam,
    applyUrlControlStates,
    buildStateUrl: buildStateUrlFromState,
    PARAM_KEYS = {},
  } = urlState;
  const {
    DATA: DATA_PARAM_KEY = "d",
    HISTORY: HISTORY_PARAM_KEY = "h",
    DEBUG: DEBUG_PARAM_KEY = "g",
    SAMPLES: SAMPLES_PARAM_KEY = "m",
  } = PARAM_KEYS;
  const DATA_DEFAULT_TEXT = "Hello, World!";
  const initialDebugParamPresent = urlParams.has(DEBUG_PARAM_KEY);
  const defaultHistoryVisible = getHistoryVisible();
  let defaultDebugVisible = isDebugVisible();
  const defaultPatternOpen = getPatternPanelOpen();
  const defaultStepMode = stepMode ? (typeof stepMode.defaultChecked === "boolean" ? stepMode.defaultChecked : Boolean(stepMode.checked)) : false;
  const defaultStepSkipFunctions = stepSkipFunctions ? (typeof stepSkipFunctions.defaultChecked === "boolean" ? stepSkipFunctions.defaultChecked : Boolean(stepSkipFunctions.checked)) : false;
  const defaultStepSpeed = stepSpeed ? (stepSpeed.defaultValue ?? stepSpeed.value ?? "") : "";
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
  if(!btnGenerate || !btnInit) return;
  const executionStatusEl = document.getElementById("executionStatus");
  const executionStatusLabels = {
    stopped: "停止中",
    running: "実行中",
    finished: "実行終了",
    error: "入力したスクリプトにエラーがあるので実行できません",
  };
  let lastExecutionError = null;
  const extractUnknownCommandWord = (message) => {
    if(!message) return "";
    const text = String(message).trim();
    if(!text) return "";
    const match = text.match(/(?:不明なコマンド|Unknown command)[:：]?\s*([^\s,、。.]+)/i);
    return match ? match[1] : "";
  };
  const buildExecutionStatusText = (state, message) => {
    const label = executionStatusLabels[state] || "";
    if(state !== "error") return label;
    const token = extractUnknownCommandWord(message);
    return token ? `${label} (${token})` : label;
  };
  const setExecutionStatus = (state, message) => {
    if(!executionStatusEl) return;
    executionStatusEl.textContent = buildExecutionStatusText(state, message);
    executionStatusEl.className = `execution-status status-${state}`;
  };
  setExecutionStatus("stopped");

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
  const DIR_UP = "up";
  const DIR_RIGHT = "right";
  const DIR_DOWN = "down";
  const DIR_LEFT = "left";
  const DIR_FRONT = "front";
  const DIR_BACK = "back";
  const RENDER_IMMEDIATE = "immediate";
  const RENDER_BUFFERED = "buffered";
  const STEP_DELAY_MS = 12;
  const ABORT_ERR = window.ABORT_ERR || Symbol("run-aborted");
  window.ABORT_ERR = ABORT_ERR;
  const RESET_DELAY_MS = 10;
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
  const domainUtil = window.domainUtil || {};
  const domainQrParams = window.domainQrParams || {};
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
  function stopCurrentRun({ resetCursor: resetCursorFlag = false, clear = false } = {}){
    ctx.runId++;
    ctx.isStepFillRunning = false;
    if(clear){
      resetQRCode();
    }
    if(resetCursorFlag){
      resetCursor();
    }
    setRenderMode(RENDER_IMMEDIATE);
  }

  let cellsInitialized = false;
  function resetQRCode(options = {}){
    const {
      abortRun = true,
      forceImmediate = abortRun,
      stopStep = abortRun,
    } = options;
    window.logEvent("resetQRCode", `abort=${abortRun},forceImmediate=${forceImmediate},stopStep=${stopStep}`, "QRコード描画をリセット");
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
    const cells = document.querySelectorAll(".qr-cells .cell");
    if(!cells || cells.length === 0) return;
    for(const cell of cells){
      cell.className = "cell";
      cell.dataset.debugVal = "0";
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
    timingColIndex = 0;
    hasFormatPattern = false;
    if(typeof resetData === "function"){
      resetData();
    }
    resetCursor();
    pendingCursor = null;
  }
  ctx.resetQRCode = resetQRCode;
  ctx.resetCursor = resetCursor;

  async function resetCommand(){
    window.logEvent("resetCommand", "", "コマンドをリセット");
    resetQRCode();
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
    fitSquare: window.fitSquare,
  });

  // Export helpers to window
  window.RENDER_IMMEDIATE = RENDER_IMMEDIATE;
  window.RENDER_BUFFERED = RENDER_BUFFERED;
  window.updateCursor = updateCursor;
  window.boardMatrix = boardMatrix;
  window.getNextData = getNextData;
  // Update board matrix directly: row/col 1-based, encoded value (encodeBit)
  window.invertCell = invertCell;
    const callApplyMask = (...args) => {
    const drawer = window.qrLegacyDrawers;
      if(!ctx) return false;
      if(drawer && typeof drawer.applyMask === "function"){
        return drawer.applyMask(ctx, ...args);
      }
      return false;
    };
    const callDrawBasePatterns = (...args) => {
      const drawerInstance = window.qrLegacyDrawers;
      if(!ctx) return false;
      if(drawerInstance && typeof drawerInstance.drawBasePatterns === "function"){
        return drawerInstance.drawBasePatterns(ctx, ...args);
      }
      return false;
    };
    const callDrawBasePatternsStepped = (...args) => {
      const drawerInstance = window.qrLegacyDrawers;
      if(!ctx) return { ok: false, fastForwarded: false };
      if(drawerInstance && typeof drawerInstance.drawBasePatternsStepped === "function"){
        return drawerInstance.drawBasePatternsStepped(ctx, ...args);
      }
      return { ok: false, fastForwarded: false };
    };
    const deferredWindowApi = {
      applyMask: callApplyMask,
      drawBasePatterns: callDrawBasePatterns,
      drawBasePatternsStepped: callDrawBasePatternsStepped,
      makeStepThenable,
      shouldStepFunctions,
      qrLegacyDrawers: window.qrLegacyDrawers,
    };
    window.__deferredWindowApi = Object.assign(window.__deferredWindowApi || {}, deferredWindowApi);
  const wrapDrawApi = (name, fn, description) => {
    const wrapped = async function(...args){
      const mainArg = args[0] ?? "";
      window.logEvent(name, mainArg, description);
      return fn.apply(this, args);
    };
    return wrapped;
  };
  const callPutFinderCells = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.putFinderCells === "function"){
      return drawerInstance.putFinderCells(ctx, ...args);
    }
    return false;
  };
  const callDrawFinderPatterns = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.drawFinderPatterns === "function"){
      return drawerInstance.drawFinderPatterns(ctx, ...args);
    }
    return false;
  };
  const callPutAlignmentCells = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.putAlignmentCells === "function"){
      return drawerInstance.putAlignmentCells(ctx, ...args);
    }
    return false;
  };
  const callDrawAlignmentPatterns = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.drawAlignmentPatterns === "function"){
      return drawerInstance.drawAlignmentPatterns(ctx, ...args);
    }
    return false;
  };
  const callPutTimingCells = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.putTimingCells === "function"){
      return drawerInstance.putTimingCells(ctx, ...args);
    }
    return false;
  };
  const callDrawTimingPatterns = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.drawTimingPatterns === "function"){
      return drawerInstance.drawTimingPatterns(ctx, ...args);
    }
    return false;
  };
  const callPutDarkModuleCells = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.putDarkModuleCells === "function"){
      return drawerInstance.putDarkModuleCells(ctx, ...args);
    }
    return false;
  };
  const callDrawDarkModulePatterns = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.drawDarkModulePatterns === "function"){
      return drawerInstance.drawDarkModulePatterns(ctx, ...args);
    }
    return false;
  };
  const callPutFormatCells = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.putFormatCells === "function"){
      return drawerInstance.putFormatCells(ctx, ...args);
    }
    return false;
  };
  const callDrawFormatPatterns = (...args) => {
    const drawerInstance = window.qrLegacyDrawers;
    if(!ctx) return false;
    if(drawerInstance && typeof drawerInstance.drawFormatPatterns === "function"){
      return drawerInstance.drawFormatPatterns(ctx, ...args);
    }
    return false;
  };
  const drawFinderPatterns = wrapDrawApi("drawFinderPatterns", callDrawFinderPatterns, "ファインダーパターンを描画");
  const drawAlignmentPatterns = wrapDrawApi("drawAlignmentPatterns", callDrawAlignmentPatterns, "配置パターンを描画");
  const drawDarkModulePatterns = wrapDrawApi("drawDarkModulePatterns", callDrawDarkModulePatterns, "ダークモジュールを描画");
  const drawTimingPatterns = wrapDrawApi("drawTimingPatterns", callDrawTimingPatterns, "タイミングパターンを描画");
  const drawFormatPatterns = wrapDrawApi("drawFormatPatterns", callDrawFormatPatterns, "フォーマットパターンを描画");
  ctx.drawFormatPatterns = drawFormatPatterns;
  window.putNextCell = putNextCell;
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
    window.__deferredWindowApi = Object.assign(window.__deferredWindowApi || {}, {
      drawQRCode,
      buildQRCode,
      drawDataPatterns,
      drawFunctionalPatterns,
      initializeQRCode,
      resetQRCode,
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
      syncViewToggles: window.syncViewToggles,
      toggleInputs: window.toggleInputs,
    });
  }
  async function drawDataPatterns({ currentRun } = {}){
    window.logEvent("drawDataPatterns", currentRun ?? "", "データパターンを描画");
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const shouldAbort = () => runToken !== runId;
    resetLoopGuard();
    resetData();
    updateCursor(BOARD_ROWS, BOARD_COLS, DIR_UP);
    while(hasMoreData()){
      if(shouldAbort()) throw ABORT_ERR;
      if(!canContinueLoop()) return false;
      await putNextCell();
      if(shouldAbort()) throw ABORT_ERR;
    }
    return runToken === runId;
  }
  async function drawQRCode(arg){
    window.logEvent("drawQRCode", arg ?? "", "QRコードを描画");
    let maskIndex;
    if(arg === undefined){
      maskIndex = 0;
    }else if(typeof arg === "object" && arg !== null){
      maskIndex = arg.maskIndex;
    }else{
      maskIndex = arg;
    }
    const currentRun = ++runId;
    const baseOk = await callDrawBasePatterns({ deferFlush: false, currentRun, resetDelay: true });
    if(currentRun !== runId || !baseOk) return false;
    const dataOk = await drawDataPatterns({ currentRun });
    if(currentRun !== runId || !dataOk) return false;
    let maskSpecified = false;
    let idx = 0;
    const rawValue = maskIndex;
    const numeric = Number(rawValue);
    if(Number.isFinite(numeric) && numeric >= 0 && numeric <= 7){
      maskSpecified = true;
      idx = numeric;
    }
    if(!maskSpecified){
      return true;
    }
      const maskOk = await window.qrLegacyDrawers.applyMask(ctx, idx);
    if(currentRun !== runId || !maskOk) return false;
    return true;
  }
  window.up = DIR_UP;
  window.right = DIR_RIGHT;
  window.down = DIR_DOWN;
  window.left = DIR_LEFT;
  window.u = DIR_UP;
  window.r = DIR_RIGHT;
  window.d = DIR_DOWN;
  window.l = DIR_LEFT;

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

  btnInit.addEventListener("click", () => {
    window.logEvent("btnInit", "", "初期化ボタン押下");
    stopCurrentRun({ resetCursor: true, clear: true });
    if(Array.isArray(window.toggleInputs)){
      for(const el of window.toggleInputs){
        el.checked = true;
        try{ el.dispatchEvent(new Event("change")); }catch(_e){}
      }
      if(typeof window.syncViewToggles === "function"){
        window.syncViewToggles();
      }
    }
    btnGenerate.disabled = false;
    btnInit.disabled = false;
    setRenderMode(RENDER_IMMEDIATE);
    lastExecutionError = null;
    setExecutionStatus("stopped");
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
      runWithCoordinator: globalThis.runCoordinatorService?.runWithCoordinator,
    });
  }

  btnGenerate.addEventListener("click", async () => {
    historyController.ensureRunHistory();
    window.logEvent("btnGenerate", "", "コード生成ボタン押下");
    setExecutionStatus("running");
    let runOk = false;
    try{
      runOk = await runUserCodeWithStep();
      if(runOk){
        setExecutionStatus("finished");
      }else if(lastExecutionError){
        setExecutionStatus("error", lastExecutionError);
      }else{
        setExecutionStatus("stopped");
      }
    }finally{
      historyController.finalizeRunHistoryEntry(runOk);
    }
  });
  if(btnGenerate){
    window.addEventListener("keydown", (ev) => {
      const active = document.activeElement;
      if(active && active.id === "userCode"){
        return; // let textarea handler manage shortcuts
      }
      if(ev.ctrlKey && !ev.shiftKey && !ev.altKey && ev.key === "Enter"){
        ev.preventDefault();
        btnGenerate.click();
      }
    });
  }

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
  resetQRCode({ abortRun: false });
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
  syncDebugPanelLayout();
  syncParsedCode();
  if(dataPatternPanel){
    dataPatternPanel.addEventListener("toggle", () => {
      syncDebugPanelLayout();
      syncParsedCode();
      if(typeof window.fitSquare === "function"){
        requestAnimationFrame(window.fitSquare);
      }
    });
  }
  if(userCodeInput){
    userCodeInput.addEventListener("input", (ev) => {
      syncParsedCode();
      ensureUserCodeCaretVisible();
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
    userCodeInput.addEventListener("blur", (ev) => {
      const related = ev.relatedTarget || document.activeElement;
      if(btnGenerate && related === btnGenerate){
        return;
      }
      historyController.commitPendingHistory("修正");
    });
  }
  if(!urlParams.has(HISTORY_PARAM_KEY)){
    setHistoryVisibility(false);
  }
  historyController.pushHistorySnapshot("初期状態");
  const sampleButtons = document.querySelectorAll(".code-debug-btn");
  sampleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sampleId = btn.dataset.sample;
      const template = sampleId ? document.getElementById(sampleId) : null;
      if(!template) return;
      const raw = template.textContent || "";
      const lines = raw.replace(/\r/g, "").split("\n");
      while(lines.length && lines[0].trim() === ""){
        lines.shift();
      }
      while(lines.length && lines[lines.length - 1].trim() === ""){
        lines.pop();
      }
      const normalized = lines.join("\n");
      if(userCodeInput){
        userCodeInput.value = normalized;
        userCodeInput.selectionStart = userCodeInput.selectionEnd = 0;
        userCodeInput.scrollTop = 0;
        userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
        historyController.commitPendingHistory("サンプル");
      }
    });
  });
  if(btnPruneHistory){
    btnPruneHistory.addEventListener("click", historyController.pruneHistoryEntries);
  }
  if(codeHistoryList){
    codeHistoryList.addEventListener("click", (ev) => {
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

  if(document && document.body){
    requestAnimationFrame(() => {
      document.body.classList.remove("app-loading");
    });
  }

  setupFooterDebugToggle();
}
