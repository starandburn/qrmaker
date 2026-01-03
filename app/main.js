
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
  const applyDebugVisibilityBase = layoutUI.applyDebugVisibility || debugUI.applyDebugVisibility || (() => {});
  let lastAppliedDebugVisible = null;
  const getDebugVisible = () => (store ? Boolean(store.getState().debugVisible) : (typeof debugUI.isDebugVisible === "function" ? debugUI.isDebugVisible() : false));
  const isDebugVisible = () => getDebugVisible();
  const applyDebugVisibilityDom = (visible) => {
    const target = Boolean(visible);
    if(target === lastAppliedDebugVisible) return;
    applyDebugVisibilityBase(target);
    lastAppliedDebugVisible = target;
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
      window.setRenderMode = setRenderMode;
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

  function syncStepControls(){
    if(!stepSpeed) return;
    const on = isStepModeOn();
    stepSpeed.disabled = !on;
    if(stepSpeedLabel){
      stepSpeedLabel.classList.toggle("disabled", stepSpeed.disabled);
    }
    if(stepSkipFunctions){
      stepSkipFunctions.disabled = !on;
      const label = stepSkipFunctions.closest("label");
      if(label){
        label.classList.toggle("disabled", !on);
      }
    }
  }

  function getStepDelay(){
    if(!isStepModeOn()) return 0;
    const val = Number(stepSpeed ? stepSpeed.value : STEP_DELAY_MS);
    if(Number.isNaN(val)) return 0;
    return Math.max(0, Math.min(120, val));
  }
  ctx.getStepDelay = getStepDelay;

  function stepDelayAbort(runToken){
    const token = (typeof runToken === "number") ? runToken : runId;
    const d = getStepDelay();
    const wait = d > 0 ? sleep(d) : new Promise(requestAnimationFrame);
    return wait.then(() => {
      if(token !== runId){
        throw ABORT_ERR;
      }
      return true;
    });
  }

  function makeStepThenable(ok){
    if(!ok) return false;
    if(!isStepModeOn()){
      return true;
    }
    const stepRunToken = runId;
    const delay = getStepDelay();
    const wait = () => new Promise((resolve) => {
      const done = () => resolve(true);
      if(delay > 0){
        setTimeout(() => requestAnimationFrame(done), delay);
      }else{
        requestAnimationFrame(done);
      }
    });
    const p = wait().then(() => {
      if(stepRunToken !== runId){
        throw ABORT_ERR;
      }
      return true;
    });
    return {
      then: (...args) => p.then(...args),
      catch: (...args) => p.catch(...args),
      valueOf: () => true,
      toString: () => "true",
    };
  }
  const runIdAccessor = {
    get: () => runId,
    set: (value) => { runId = value; return runId; },
    increment: () => ++runId,
  };
  const stepFillAccessor = {
    get: () => isStepFillRunning,
    set: (value) => { isStepFillRunning = value; },
  };
  window.makeStepThenable = makeStepThenable;

  function syncDebugOverlay(){
    const cellsWrap = document.querySelector(".qr-cells");
    if(!cellsWrap) return;
    const debugOn = isDebugVisible();
    if(toggleDebugValues){
      const label = toggleDebugValues.closest("label");
      if(label){
        label.style.display = debugOn ? "inline-flex" : "none";
      }
    }
    const showValues = debugOn && toggleDebugValues && toggleDebugValues.checked;
    cellsWrap.classList.toggle("show-debug-values", showValues);
  }

  function syncDebugPanelLayout(){
    if(!debugLog) return;
    const baseMin = "80px";
    const baseMax = "110px";
    let minH = baseMin;
    let maxH = baseMax;
    if(isDebugVisible() && dataPatternPanel && dataPatternPanel.open){
      minH = "70px";
      maxH = "80px";
    }
    debugLog.style.minHeight = minH;
    debugLog.style.maxHeight = maxH;
  }

  function syncParsedCode(){
    if(!userCodeParsed || !codePanel) return;
    const debugOn = isDebugVisible();
    codePanel.classList.toggle("debug-mode", debugOn);
    if(!debugOn){
      userCodeParsed.value = "";
      return;
    }
    try{
      const script = buildUserScript(userCodeInput ? userCodeInput.value : "", { awaitCalls: true });
      userCodeParsed.value = script;
    }catch(err){
      userCodeParsed.value = `// ${err && err.message ? String(err.message) : String(err)}`;
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
    fitSquare: window.fitSquare,
  });

  // Export helpers to window
  window.RENDER_IMMEDIATE = RENDER_IMMEDIATE;
  window.RENDER_BUFFERED = RENDER_BUFFERED;
  window.updateCursor = updateCursor;
  window.resetQRCode = resetQRCode;
  window.resetCommand = resetCommand;
  window.clearAllCells = resetQRCode; // backward compat
  window.boardMatrix = boardMatrix;
  window.getNextData = getNextData;
  // Update board matrix directly: row/col 1-based, encoded value (encodeBit)
  function shouldStepFunctions(){
    return isStepModeOn() && !(stepSkipFunctions && stepSkipFunctions.checked);
  }

  function validateRunnerSyntax(runner){
    try{
      new Function(runner);
      return null;
    }catch(err){
      if(err instanceof SyntaxError){
        lastExecutionError = err.message;
        return err;
      }
      throw err;
    }
  }

  async function runUserCode(){
    if(!userCodeInput) return true;
    lastExecutionError = null;
    resetLoopGuard();
    let script = "";
    try{
      script = buildUserScript(userCodeInput.value || "", { awaitCalls: true });
    }catch(err){
      lastExecutionError = err && err.message ? String(err.message) : String(err);
      return false;
    }
    if(!script.trim()) return true;
    try{
      const runner = `(async () => {\n${script}\n})();`;
      const syntaxError = validateRunnerSyntax(runner);
      if(syntaxError){
        return false;
      }
      const res = (0, eval)(runner);
      if(res && typeof res.then === "function"){
        await res;
      }
      lastExecutionError = null;
      return true;
    }catch(err){
      if(err === ABORT_ERR){
        return false;
      }
      const msg = err && err.message ? err.message : String(err);
      lastExecutionError = msg;
      return false;
    }
  }

  async function runUserCodeWithStep(){
    const currentRun = ++ctx.runId;
    ctx.isStepFillRunning = true;
    const prevRender = ctx.renderMode;
    const stepOn = isStepModeOn();
    setRenderMode(RENDER_IMMEDIATE);
    try{
      const ok = await runUserCode();
      if(!ok) return false;
      return true;
    }catch(err){
      if(err === ABORT_ERR){
        return false;
      }
      throw err;
    }finally{
    ctx.isStepFillRunning = false;
      requestRender("runUserCodeWithStep");
      setRenderMode(prevRender);
    }
  }

  window.invertCell = invertCell;
    const callApplyMask = (...args) => {
      const drawer = window.qrLegacyDrawers;
      if(drawer && typeof drawer.applyMask === "function"){
        return drawer.applyMask(ctx, ...args);
      }
      return false;
    };
    window.applyMask = callApplyMask;
  window.putFinderCells = putFinderCells;
  window.putAlignmentCells = putAlignmentCells;
  window.putTimingCells = putTimingCells;
  window.putDarkModuleCells = putDarkModuleCells;
  window.putFormatCells = putFormatCells;
  const wrapDrawApi = (name, fn, description) => {
    const wrapped = async function(...args){
      const mainArg = args[0] ?? "";
      window.logEvent(name, mainArg, description);
      return fn.apply(this, args);
    };
    return wrapped;
  };
  drawFinderPatterns = wrapDrawApi("drawFinderPatterns", drawFinderPatterns, "ファインダーパターンを描画");
  drawAlignmentPatterns = wrapDrawApi("drawAlignmentPatterns", drawAlignmentPatterns, "配置パターンを描画");
  drawDarkModulePatterns = wrapDrawApi("drawDarkModulePatterns", drawDarkModulePatterns, "ダークモジュールを描画");
  drawTimingPatterns = wrapDrawApi("drawTimingPatterns", drawTimingPatterns, "タイミングパターンを描画");
  drawFormatPatterns = wrapDrawApi("drawFormatPatterns", drawFormatPatterns, "フォーマットパターンを描画");
  window.drawFormatPatterns = drawFormatPatterns;
  window.drawFinderPatterns = drawFinderPatterns;
  window.drawAlignmentPatterns = drawAlignmentPatterns;
  window.drawDarkModulePatterns = drawDarkModulePatterns;
  window.drawTimingPatterns = drawTimingPatterns;
  window.drawBasePatterns = drawBasePatterns;
  window.putNextCell = putNextCell;
  window.drawDataPatterns = drawDataPatterns;
  window.drawQRCode = drawQRCode;
  window.qrcode = drawQRCode;
  window.buildFunctionSet = buildFunctionSet;
  window.stopCurrentRun = stopCurrentRun;
  window.parseCellRef = parseCellRef;
  window.cellRefFromRowCol = cellRefFromRowCol;
  window.moveCursor = moveCursor;
  window.turnCursor = turnCursor;
  window.drawFunctionalPatterns = () => drawBasePatterns({ deferFlush: false, currentRun: runId });
  window.initializeQRCode = async () => {
    const current = ++runId;
    await drawBasePatterns({ deferFlush: false, currentRun: current });
    if(current !== runId) return false;
    updateCursor(cursorPos.row, cursorPos.col, DIR_UP);
    return true;
  };
  window.buildQRCode = async () => {
    const currentRun = runId;
    let stepEnabled = isStepModeOn();
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
    function resolveFunctionalOptions(overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
      if(typeof overwriteOrOpts === "object" && overwriteOrOpts !== null && !Array.isArray(overwriteOrOpts)){
        const { overwrite = false, currentRun, stepEnabled: stepFromOpts } = overwriteOrOpts;
        const resolvedRun = (typeof currentRun === "number") ? currentRun : runId;
        const resolvedStep = (typeof stepFromOpts === "boolean") ? stepFromOpts : shouldStepFunctions();
        return { overwrite, currentRun: resolvedRun, stepEnabled: resolvedStep };
      }
      const overwriteValue = (overwriteOrOpts === undefined) ? true : overwriteOrOpts;
      if(typeof currentRunOrOpts === "object" && currentRunOrOpts !== null && !Array.isArray(currentRunOrOpts)){
        const { currentRun, stepEnabled: stepFromOpts } = currentRunOrOpts;
        const resolvedRun = (typeof currentRun === "number") ? currentRun : runId;
        const resolvedStep = (typeof stepFromOpts === "boolean") ? stepFromOpts : shouldStepFunctions();
        return { overwrite: overwriteValue, currentRun: resolvedRun, stepEnabled: resolvedStep };
      }
      const resolvedRun = (typeof currentRunOrOpts === "number") ? currentRunOrOpts : runId;
      const resolvedStep = (typeof stepEnabled === "boolean") ? stepEnabled : shouldStepFunctions();
      return { overwrite: overwriteValue, currentRun: resolvedRun, stepEnabled: resolvedStep };
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
    if(maskIndex === undefined){
      maskIndex = 0;
    }
    const currentRun = ++runId;
    const baseOk = await drawBasePatterns({ deferFlush: false, currentRun, resetDelay: true });
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

  function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async function drawBasePatterns({ deferFlush = false, currentRun, resetDelay = false } = {}){
    window.logEvent("drawBasePatterns", currentRun ?? "", `基本パターンを描画 (deferFlush=${deferFlush}, resetDelay=${resetDelay})`);
    if(currentRun !== undefined && currentRun !== runId) throw ABORT_ERR;
    if(isStepModeOn() && shouldStepFunctions()){
      const stepped = await drawBasePatternsStepped({ currentRun });
      return stepped ? !!stepped.ok : false;
    }
    setRenderMode(RENDER_BUFFERED);
    resetQRCode({ abortRun: false });
    resetCursor();
    if(resetDelay){
      await sleep(RESET_DELAY_MS);
    }
    if(currentRun !== undefined && currentRun !== runId) throw ABORT_ERR;
    const funcOpts = { stepEnabled: false, currentRun, overwrite: false };
    await drawFinderPatterns(funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(currentRun !== undefined && currentRun !== runId) throw ABORT_ERR;
    await drawTimingPatterns(funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(currentRun !== undefined && currentRun !== runId) throw ABORT_ERR;
    await drawAlignmentPatterns(funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(currentRun !== undefined && currentRun !== runId) throw ABORT_ERR;
    await drawDarkModulePatterns(funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(currentRun !== undefined && currentRun !== runId) throw ABORT_ERR;
    await drawFormatPatterns(undefined, funcOpts.overwrite, funcOpts.currentRun, funcOpts.stepEnabled);
    if(!deferFlush){
      if(currentRun !== undefined && currentRun !== runId) throw ABORT_ERR;
      requestRender("drawBasePatterns");
      setRenderMode(RENDER_IMMEDIATE);
    }
    resetCursor();
    return true;
  }

  async function drawBasePatternsStepped({ currentRun } = {}){
    window.logEvent("drawBasePatternsStepped", currentRun ?? "", "基本パターンを描画");
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    resetQRCode({ abortRun: false });
    setRenderMode(RENDER_IMMEDIATE);
    updateCursorIfRun(runToken, 1, 1, DIR_DOWN);
    let stepEnabled = isStepModeOn();
    let fastForwarded = false;
    const stepActive = () => stepEnabled && isStepModeOn();
    const shouldAbort = () => runToken !== runId;
    const shouldSkipFunctions = () => {
      if(runToken !== runId) return false;
      return !!(stepSkipFunctions && stepSkipFunctions.checked && isStepModeOn());
    };

    window.isFunctionalKind = isFunctionalKind;
    window.MASK_FUNCTIONS = MASK_FUNCTIONS;
    const maybeCursorJumpDelay = async () => {
      if(!stepActive()) return true;
      const delay = getStepDelay();
      if(delay > 0){
        await sleep(delay * 5);
      }else{
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      }
      return !shouldAbort();
    };
    const maybeStepDelay = async () => {
      if(shouldAbort()) throw ABORT_ERR;
      if(shouldSkipFunctions()){
        fastForwarded = true;
        stepEnabled = false;
        setRenderMode(RENDER_BUFFERED);
        return true;
      }
      if(!stepActive()) return true;
      const delay = getStepDelay();
      if(delay > 0){
        await sleep(delay);
      }else{
        await new Promise(requestAnimationFrame);
      }
      if(shouldAbort()) throw ABORT_ERR;
      if(shouldSkipFunctions()){
        fastForwarded = true;
        stepEnabled = false;
        setRenderMode(RENDER_BUFFERED);
        return true;
      }
      if(!isStepModeOn()){
        stepEnabled = false;
        setRenderMode(RENDER_BUFFERED);
      }
      return true;
    };
    let lastRow = 1;
    let lastCol = 1;
    let lastDir = DIR_DOWN;
    const moveCursorPath = async (targetRow, targetCol) => {
      if(shouldAbort()) throw ABORT_ERR;
      const dr = targetRow - lastRow;
      const dc = targetCol - lastCol;
      if(Math.abs(dr) > Math.abs(dc)){
        lastDir = dr > 0 ? DIR_DOWN : dr < 0 ? DIR_UP : lastDir;
      }else if(Math.abs(dc) > 0){
        lastDir = dc > 0 ? DIR_RIGHT : DIR_LEFT;
      }
      lastRow = targetRow;
      lastCol = targetCol;
      updateCursorIfRun(runToken, targetRow, targetCol, lastDir);
      if(!(await maybeCursorJumpDelay())) return false;
      return !shouldAbort();
    };
  const stepCell = (row, col, value, cellKind) => {
    if(shouldAbort()) throw ABORT_ERR;
    const kind = typeof cellKind === "number" ? cellKind : BIT_UNKNOWN;
    const encoded = window.encodeBit(kind, value === 1);
    window.updateCell(row, col, encoded);
    const dr = row - lastRow;
    const dc = col - lastCol;
    if(Math.abs(dr) > Math.abs(dc)){
      lastDir = dr > 0 ? DIR_DOWN : dr < 0 ? DIR_UP : lastDir;
    }else if(Math.abs(dc) > 0){
      lastDir = dc > 0 ? DIR_RIGHT : DIR_LEFT;
    }
      updateCursorIfRun(runToken, row, col, lastDir);
      lastRow = row;
      lastCol = col;
      return true;
    };
    const spiralOrder = size => {
      const coords = [];
      let top = 0, bottom = size - 1, left = 0, right = size - 1;
      while(top <= bottom && left <= right){
        for(let c = left; c <= right; c++) coords.push([top, c]);
        top++;
        for(let r = top; r <= bottom; r++) coords.push([r, right]);
        right--;
        if(top <= bottom){
          for(let c = right; c >= left; c--) coords.push([bottom, c]);
          bottom--;
        }
        if(left <= right){
          for(let r = bottom; r >= top; r--) coords.push([r, left]);
          left++;
        }
      }
      return coords;
    };

    if((await moveCursorPath(1, 1)) === false) return { ok: false, fastForwarded };

    // finder 7x7 + separator
    const drawFinderStep = async (topRow, leftCol) => {
        const pattern = [
          [1,1,1,1,1,1,1],
          [1,0,0,0,0,0,1],
          [1,0,1,1,1,0,1],
          [1,0,1,1,1,0,1],
          [1,0,1,1,1,0,1],
        [1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1],
      ];
      const coreSpiral = spiralOrder(7);
      for(const [r0, c0] of coreSpiral){
        if(shouldAbort()) throw ABORT_ERR;
        const row = topRow + r0;
        const col = leftCol + c0;
        if(row < 1 || row > 25 || col < 1 || col > 25) continue;
        const bit = pattern[r0][c0];
        if(shouldAbort()) throw ABORT_ERR;
        if(!stepCell(row, col, bit, BIT_FUNC_FINDER)) return;
        const md = await maybeStepDelay();
        if(md === false) return;
      }
      const sRow = topRow - 1;
      const eRow = topRow + 7;
      const sCol = leftCol - 1;
      const eCol = leftCol + 7;
      const ring = [];
      for(let c = sCol; c <= eCol; c++) ring.push([sRow, c]);
      for(let r = sRow + 1; r <= eRow; r++) ring.push([r, eCol]);
      for(let c = eCol - 1; c >= sCol; c--) ring.push([eRow, c]);
      for(let r = eRow - 1; r > sRow; r--) ring.push([r, sCol]);
      if(ring.length){
        if((await moveCursorPath(ring[0][0], ring[0][1])) === false) return { ok: false, fastForwarded };
      }
      for(const [r, c] of ring){
        if(shouldAbort()) throw ABORT_ERR;
        if(r < 1 || r > 25 || c < 1 || c > 25) continue;
        if(typeof window.updateCell === "function"){
          window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
        }
        if(shouldAbort()) throw ABORT_ERR;
        if(!stepCell(r, c, 0, BIT_FUNC_FINDER)) return;
        const md = await maybeStepDelay();
        if(md === false) return;
    }
  };
    await drawFinderStep(1, 1);
    if(shouldAbort()) throw ABORT_ERR;
    if((await moveCursorPath(1, 19)) === false) return { ok: false, fastForwarded };
    await drawFinderStep(1, 19);
    if(shouldAbort()) throw ABORT_ERR;
    if((await moveCursorPath(19, 1)) === false) return { ok: false, fastForwarded };
    await drawFinderStep(19, 1);
    if(shouldAbort()) throw ABORT_ERR;

    // timing (row 7, col 7) after finders
    {
      timingRowIndex = TIMING_ROW;
      timingColIndex = TIMING_COL;
      const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : UNPLACED_KIND;
      if((await moveCursorPath(timingRowIndex, 1)) === false) return { ok: false, fastForwarded };
      for(let c = 1; c <= 25; c++){
        if(shouldAbort()) throw ABORT_ERR;
        const existing = boardMatrix[timingRowIndex - 1][c - 1];
        const kind = (typeof window.bitKind === "function") ? window.bitKind(existing) : Math.abs(existing);
        const empty = (typeof window.isUnplacedBit === "function") ? window.isUnplacedBit(existing) : (kind === unplacedKind);
        if(!empty) continue;
        const bit = (c % 2 === 1) ? 1 : 0;
        if(typeof window.updateCell === "function"){
          window.updateCell(timingRowIndex, c, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
        stepCell(timingRowIndex, c, bit, BIT_FUNC_TIMING);
        const md = await maybeStepDelay();
        if(md === false) return { ok: false, fastForwarded };
      }
      if((await moveCursorPath(1, timingColIndex)) === false) return { ok: false, fastForwarded };
      for(let r = 1; r <= 25; r++){
        if(shouldAbort()) throw ABORT_ERR;
        const existing = boardMatrix[r - 1][timingColIndex - 1];
        const kind = (typeof window.bitKind === "function") ? window.bitKind(existing) : Math.abs(existing);
        const empty = (typeof window.isUnplacedBit === "function") ? window.isUnplacedBit(existing) : (kind === unplacedKind);
        if(!empty) continue;
        const bit = (r % 2 === 1) ? 1 : 0;
        if(typeof window.updateCell === "function"){
          window.updateCell(r, timingColIndex, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
        stepCell(r, timingColIndex, bit, BIT_FUNC_TIMING);
        const md = await maybeStepDelay();
        if(md === false) return { ok: false, fastForwarded };
      }
    }

    // alignment 5x5
    if((await moveCursorPath(19, 19)) === false) return { ok: false, fastForwarded };
    const drawAlignmentStep = async (centerRow, centerCol) => {
      const pattern = [
        [1,1,1,1,1],
        [1,0,0,0,1],
        [1,0,1,0,1],
        [1,0,0,0,1],
        [1,1,1,1,1],
      ];
      const topRow = centerRow - 2;
      const leftCol = centerCol - 2;
      const coreSpiral = spiralOrder(5);
      for(const [r0, c0] of coreSpiral){
        if(shouldAbort()) throw ABORT_ERR;
        const row = topRow + r0;
        const col = leftCol + c0;
        if(row < 1 || row > 25 || col < 1 || col > 25) continue;
        const bit = pattern[r0][c0];
        if(typeof window.updateCell === "function"){
        const encAlign = window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1);
        window.updateCell(row, col, encAlign);
      }
        if(!stepCell(row, col, bit, BIT_FUNC_ALIGNMENT)) return;
        const md = await maybeStepDelay();
        if(md === false) return;
      }
    };
    await drawAlignmentStep(19, 19);
    if(shouldAbort()) throw ABORT_ERR;

    // dark module
    if((await moveCursorPath(18, 9)) === false) return { ok: false, fastForwarded };
    if(shouldAbort()) throw ABORT_ERR;
    if(typeof window.updateCell === "function"){
      window.updateCell(18, 9, window.encodeBit(BIT_FUNC_DARK, true));
    }
    if(!stepCell(18, 9, 1, BIT_FUNC_DARK)) return { ok: false, fastForwarded };
    const mdDark = await maybeStepDelay();
    if(mdDark === false) return { ok: false, fastForwarded };

    // format info (two copies)
    const coordsA = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],
      [8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
    ];
    const n = 25;
    const coordsB = [
      [8,n-1],[8,n-2],[8,n-3],[8,n-4],[8,n-5],[8,n-6],[8,n-7],[8,n-8],
      [n-7,8],[n-6,8],[n-5,8],[n-4,8],[n-3,8],[n-2,8],[n-1,8],
    ];
    if((await moveCursorPath(coordsA[0][0] + 1, coordsA[0][1] + 1)) === false) return;
    const bits15 = FORMAT_L[0];
    const drawFormatSide = async (coords) => {
      for(let i = 0; i < 15; i++){
        if(shouldAbort()) throw ABORT_ERR;
        const bit = (bits15 >>> i) & 1;
        const [r, c] = coords[i];
        if(typeof window.updateCell === "function"){
          window.updateCell(r + 1, c + 1, window.encodeBit(BIT_FUNC_FORMAT, bit === 1));
        }
        if(!stepCell(r + 1, c + 1, bit, BIT_FUNC_FORMAT)) return;
        const md = await maybeStepDelay();
        if(md === false) return;
      }
    };
    // 左上周りを先に、右下周りを後から描く
    await drawFormatSide(coordsA);
    if((await moveCursorPath(coordsB[0][0] + 1, coordsB[0][1] + 1)) === false) return { ok: false, fastForwarded };
    await drawFormatSide(coordsB);

    if(shouldAbort()) throw ABORT_ERR;
    await moveCursorPath(25, 25);

    if(renderMode === RENDER_BUFFERED){
      requestRender("drawFormatSide");
      setRenderMode(RENDER_IMMEDIATE);
    }
    return { ok: true, fastForwarded };
  }

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
      drawBasePatterns,
      drawBasePatternsStepped,
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

  function putAlignmentCells(overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const step = !!resolvedStep;
    const baseRow = cursorPos.row;
    const baseCol = cursorPos.col;
    updateCursor(baseRow, baseCol, DIR_RIGHT);
    const pattern = [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,1,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
    ];
    const startRow = baseRow - 2;
    const startCol = baseCol - 2;
    const allowOverwrite = overwrite !== false;
    const shouldDrawCell = (row, col) => shouldPlaceCell(row, col, allowOverwrite);
    if(!step){
      const prevRender = renderMode;
      setRenderMode(RENDER_BUFFERED);
      for(let r = 0; r < 5; r++){
        for(let c = 0; c < 5; c++){
          const row = startRow + r;
          const col = startCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1));
        }
      }
      requestRender("putAlignmentCells");
      setRenderMode(prevRender);
      return true;
    }
    const stepActive = () => shouldStepFunctions() && runToken === runId;
    const delay = async () => {
      await stepDelayAbort(runToken);
    };
    return (async () => {
      const prevRender = renderMode;
      setRenderMode(RENDER_IMMEDIATE);
      for(let r = 0; r < 5; r++){
        for(let c = 0; c < 5; c++){
          if(runToken !== runId) return false;
          if(!stepActive()){
            setRenderMode(prevRender);
            return putAlignmentCells(overwrite, { stepEnabled: false, currentRun: runToken });
          }
          const row = startRow + r;
          const col = startCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1));
          updateCursorIfRun(runToken, row, col, DIR_RIGHT);
          await delay();
        }
      }
      setRenderMode(prevRender);
      return true;
    })();
  }

  async function drawAlignmentPatterns(overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    updateCursor(19, 19, DIR_RIGHT);
    await putAlignmentCells(overwrite, opts);
    return true;
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

  async function putFinderCells(overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const shouldAbort = () => runToken !== runId;
    const stepInitial = !!resolvedStep;
    const baseRow = cursorPos.row;
    const baseCol = cursorPos.col;
    updateCursor(baseRow, baseCol, DIR_RIGHT);
    const pattern = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1],
    ];
    const prevRender = renderMode;
    const allowOverwrite = overwrite !== false;
    const shouldDrawCell = (row, col) => shouldPlaceCell(row, col, allowOverwrite);
    const updateCursorSafe = (row, col, dir = DIR_RIGHT) => {
      if(runToken !== runId) return false;
      return updateCursor(row, col, dir);
    };
    let lastCursorRow = null;
    let lastCursorCol = null;
    const drawSync = () => {
      for(let r = 0; r < 7; r++){
        for(let c = 0; c < 7; c++){
          const row = baseRow + r;
          const col = baseCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          lastCursorRow = row;
          lastCursorCol = col;
        }
      }
      const sRow = baseRow - 1;
      const eRow = baseRow + 7;
      const sCol = baseCol - 1;
      const eCol = baseCol + 7;
      for(let r = sRow; r <= eRow; r++){
        for(let c = sCol; c <= eCol; c++){
          const insideCore = r >= baseRow && r < baseRow + 7 && c >= baseCol && c < baseCol + 7;
          if(insideCore) continue;
          if(r < 1 || r > 25 || c < 1 || c > 25) continue;
          if(r === sRow || r === eRow || c === sCol || c === eCol){
            if(!shouldDrawCell(r, c)) continue;
            window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
            lastCursorRow = r;
            lastCursorCol = c;
          }
        }
      }
    };
    const finishSync = () => {
      setRenderMode(RENDER_BUFFERED);
      drawSync();
      requestRender("drawFinderPatterns");
      setRenderMode(prevRender);
      if(lastCursorRow !== null && lastCursorCol !== null){
        updateCursorSafe(lastCursorRow, lastCursorCol, DIR_RIGHT);
      }
      return true;
    };
    if(!stepInitial){
      return finishSync();
    }
    const stepActive = () => shouldStepFunctions();
    const delay = async () => {
      await stepDelayAbort(runToken);
    };
    const drawStep = async () => {
      for(let r = 0; r < 7; r++){
        for(let c = 0; c < 7; c++){
          if(shouldAbort()) return false;
          if(!stepActive()) return finishSync();
          const row = baseRow + r;
          const col = baseCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          if(!shouldDrawCell(row, col)) continue;
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          updateCursorSafe(row, col, DIR_RIGHT);
          lastCursorRow = row;
          lastCursorCol = col;
          await delay();
        }
      }
      const sRow = baseRow - 1;
      const eRow = baseRow + 7;
      const sCol = baseCol - 1;
      const eCol = baseCol + 7;
      for(let r = sRow; r <= eRow; r++){
        for(let c = sCol; c <= eCol; c++){
          if(shouldAbort()) return false;
          if(!stepActive()) return finishSync();
          const insideCore = r >= baseRow && r < baseRow + 7 && c >= baseCol && c < baseCol + 7;
          if(insideCore) continue;
          if(r < 1 || r > 25 || c < 1 || c > 25) continue;
          if(r === sRow || r === eRow || c === sCol || c === eCol){
            if(!shouldDrawCell(r, c)) continue;
            window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
            updateCursorSafe(r, c, DIR_RIGHT);
            lastCursorRow = r;
            lastCursorCol = c;
            await delay();
          }
        }
      }
      return true;
    };
    setRenderMode(RENDER_IMMEDIATE);
    const res = await drawStep();
    setRenderMode(prevRender);
    if(lastCursorRow !== null && lastCursorCol !== null){
      updateCursorSafe(lastCursorRow, lastCursorCol, DIR_RIGHT);
    }
    return !!res;
  }

  async function drawFinderPatterns(overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    const moveAndDraw = async (row, col) => {
      updateCursor(row, col, DIR_RIGHT);
      return putFinderCells(overwrite, opts);
    };
    await moveAndDraw(1, 1);
    await moveAndDraw(1, 19);
    await moveAndDraw(19, 1);
    return true;
  }

  async function drawDarkModulePatterns(overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runVal = (typeof currentRun === "number") ? currentRun : runId;
    const opts = { stepEnabled: resolvedStep, currentRun: runVal };
    updateCursor(18, 9, DIR_RIGHT);
    await putDarkModuleCells(overwrite, opts);
    return true;
  }

  async function putDarkModuleCells(overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const step = !!resolvedStep;
    const baseRow = cursorPos.row;
    const baseCol = cursorPos.col;
    if(!shouldPlaceCell(baseRow, baseCol, overwrite !== false)) return true;
    if(!step){
      if(typeof window.updateCell === "function"){
        window.updateCell(baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
      }
      return true;
    }
    const delay = async () => {
      await stepDelayAbort(runToken);
    };
    if(runToken !== runId) return false;
    setRenderMode(RENDER_IMMEDIATE);
    if(typeof window.updateCell === "function"){
      window.updateCell(baseRow, baseCol, window.encodeBit(BIT_FUNC_DARK, true));
    }
    updateCursorIfRun(runToken, baseRow, baseCol, DIR_RIGHT);
    await delay();
    return true;
  }

  function putTimingCells(direction = TIMING_HORIZONTAL, index = TIMING_ROW, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const dirVal = Number(direction);
    if(!Number.isFinite(dirVal)) return false;
    if(dirVal !== TIMING_HORIZONTAL && dirVal !== TIMING_VERTICAL) return false;
    const resolvedIndex = (dirVal === TIMING_VERTICAL)
      ? resolveRowCol(undefined, index, cursorPos.row, cursorPos.col)
      : resolveRowCol(index, undefined, cursorPos.row, cursorPos.col);
    const pos = (dirVal === TIMING_HORIZONTAL) ? resolvedIndex.row : resolvedIndex.col;
    if(!Number.isFinite(pos) || !Number.isInteger(pos) || pos < 1 || pos > 25) return false;
    if(dirVal === TIMING_HORIZONTAL){
      timingRowIndex = pos;
    }else{
      timingColIndex = pos;
    }
      const step = !!resolvedStep;
    const allowOverwrite = overwrite !== false;
    const canWriteTimingCell = (r, c) => shouldPlaceCell(r, c, allowOverwrite);
    if(!step){
      const prevRender = renderMode;
      setRenderMode(RENDER_BUFFERED);
      if(dirVal === TIMING_HORIZONTAL){
        for(let c = 1; c <= 25; c++){
          const bit = (c % 2 === 1) ? 1 : 0;
          if(!canWriteTimingCell(pos, c)) continue;
          window.updateCell(pos, c, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
      }else{
        for(let r = 1; r <= 25; r++){
          const bit = (r % 2 === 1) ? 1 : 0;
          if(!canWriteTimingCell(r, pos)) continue;
          window.updateCell(r, pos, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
      }
      requestRender("putTimingCells");
      setRenderMode(prevRender);
      return true;
    }
    const delay = async () => {
      await stepDelayAbort(runToken);
    };
    return (async () => {
      const prevRender = renderMode;
      setRenderMode(RENDER_IMMEDIATE);
      if(dirVal === TIMING_HORIZONTAL){
        for(let c = 1; c <= 25; c++){
          if(runToken !== runId) return false;
          if(!shouldStepFunctions()) return putTimingCells(direction, index, overwrite, { stepEnabled: false, currentRun: runToken });
          const bit = (c % 2 === 1) ? 1 : 0;
          if(!canWriteTimingCell(pos, c)) continue;
          window.updateCell(pos, c, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
          updateCursorIfRun(runToken, pos, c, DIR_RIGHT);
          await delay();
        }
      }else{
        for(let r = 1; r <= 25; r++){
          if(runToken !== runId) return false;
          if(!shouldStepFunctions()) return putTimingCells(direction, index, overwrite, { stepEnabled: false, currentRun: runToken });
          const bit = (r % 2 === 1) ? 1 : 0;
          if(!canWriteTimingCell(r, pos)) continue;
          window.updateCell(r, pos, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
          updateCursorIfRun(runToken, r, pos, DIR_RIGHT);
          await delay();
        }
      }
      setRenderMode(prevRender);
      return true;
    })();
  }

  async function drawTimingPatterns(overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const opts = { stepEnabled: resolvedStep, currentRun };
    await putTimingCells(TIMING_HORIZONTAL, TIMING_ROW, overwrite, opts);
    await putTimingCells(TIMING_VERTICAL, TIMING_COL, overwrite, opts);
    return true;
  }

  async function putFormatCells(bits15, coords, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, stepEnabled: resolvedStep, currentRun } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const step = !!resolvedStep;
    const coordsArr = Array.isArray(coords) ? coords : [];
    const allowOverwrite = overwrite !== false;
    const shouldDrawCell = (row, col) => shouldPlaceCell(row, col, allowOverwrite);
    if(!step){
      setRenderMode(RENDER_BUFFERED);
      for(let i = 0; i < coordsArr.length && i < 15; i++){
        const bit = (bits15 >>> i) & 1; // LSB first
        const [r1, c1] = coordsArr[i];
        const row = r1 + 1;
        const col = c1 + 1;
        if(!shouldDrawCell(row, col)) continue;
        if(typeof window.updateCell === "function"){
          const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
          window.updateCell(row, col, enc);
        }
      }
      hasFormatPattern = true;
      requestRender("putFormatCells");
      setRenderMode(RENDER_IMMEDIATE);
      return true;
    }
    const delay = async () => {
      await stepDelayAbort(runToken);
    };
    const prevRender = renderMode;
    setRenderMode(RENDER_IMMEDIATE);
    for(let i = 0; i < coordsArr.length && i < 15; i++){
      if(runToken !== runId) return false;
      if(!shouldStepFunctions()) return putFormatCells(bits15, coords, overwrite, { stepEnabled: false, currentRun: runToken });
      const bit = (bits15 >>> i) & 1; // LSB first
      const [r1, c1] = coordsArr[i];
      const row = r1 + 1;
      const col = c1 + 1;
      if(!shouldDrawCell(row, col)) continue;
      if(typeof window.updateCell === "function"){
        const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
        window.updateCell(row, col, enc);
      }
      updateCursorIfRun(runToken, row, col, DIR_RIGHT);
      await delay();
    }
    hasFormatPattern = true;
    setRenderMode(prevRender);
    return true;
  }

  async function drawFormatPatterns(mask, overwriteOrOpts = false, currentRunOrOpts, stepEnabled){
    const { overwrite, currentRun, stepEnabled: resolvedStep } = resolveFunctionalOptions(overwriteOrOpts, currentRunOrOpts, stepEnabled);
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const maskIsSpecified = mask !== undefined;
    let idx = 0;
    if(maskIsSpecified){
      idx = Number(mask);
      if(!Number.isFinite(idx) || idx < 0 || idx > 7){
        idx = 0;
      }
    }
    const maskLabel = maskIsSpecified ? String(idx) : "unset";
    const bits15 = maskIsSpecified ? FORMAT_L[idx] : 0;
    const coordsA = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],
      [8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
    ];
    const n = 25;
    const coordsB = [
      [8,n-1],[8,n-2],[8,n-3],[8,n-4],[8,n-5],[8,n-6],[8,n-7],[8,n-8],
      [n-7,8],[n-6,8],[n-5,8],[n-4,8],[n-3,8],[n-2,8],[n-1,8],
    ];
    const opts = { stepEnabled: resolvedStep, currentRun: runToken };
    await putFormatCells(bits15, coordsA, overwrite, opts);
    await putFormatCells(bits15, coordsB, overwrite, opts);
    hasFormatPattern = true;
    return true;
  }
  ctx.drawFormatPatterns = drawFormatPatterns;

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
  applyDataParam();
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
      const url = buildStateUrl();
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

  const buildStateUrl = () => {
    if(typeof buildStateUrlFromState !== "function"){
      return window.location.href;
    }
    return buildStateUrlFromState({
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
  };

  function applyDataParam(){
    if(!txtInput) return false;
    if(!urlParams.has(DATA_PARAM_KEY)) return false;
    const rawValue = urlParams.get(DATA_PARAM_KEY);
    if(rawValue === null) return false;
    const nextValue = decodeDataParamValue(rawValue);
    if(txtInput.value !== nextValue){
      txtInput.value = nextValue;
      try{
        txtInput.dispatchEvent(new Event("input", { bubbles: true }));
      }catch(err){
        // some environments may not support dispatching synthetic events
      }
    }
    return true;
  }

  if(document && document.body){
    requestAnimationFrame(() => {
      document.body.classList.remove("app-loading");
    });
  }

  setupFooterDebugToggle();
}
