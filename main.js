
(function(){
  const btnGenerate = document.getElementById("btnGenerate");
  const btnInit = document.getElementById("btnInit");
  const debugLog = document.getElementById("debugLog");
  const debugPanel = document.getElementById("debugPanel");
  const dataPatternPanel = document.getElementById("dataPatternPanel") || document.getElementById("patternDetails");
  const codePanel = document.querySelector(".code-panel");
  const userCodeParsed = document.getElementById("userCodeParsed");
  const footerCopy = document.querySelector(".page-footer p:first-child");
  const userCodeInput = document.getElementById("userCode");
  const stepMode = document.getElementById("stepMode");
  const stepSkipFunctions = document.getElementById("stepSkipFunctions");
  const stepSpeed = document.getElementById("stepSpeed");
  const stepSpeedLabel = document.querySelector(".step-speed");
  const toggleDebugValues = document.getElementById("toggleDebugValues");
  const debugRow = document.querySelector(".debug-row");
  const debugOnlyControls = Array.from(document.querySelectorAll(".debug-only"));
  const urlParams = new URLSearchParams(window.location.search || "");
  const lookupParam = (primary, alias) => {
    if(alias && urlParams.has(alias)) return urlParams.get(alias);
    if(primary && urlParams.has(primary)) return urlParams.get(primary);
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
  const applyDebugVisibility = (visible) => {
    if(!debugPanel) return;
    debugPanel.style.display = visible ? "block" : "none";
    if(debugRow){
      debugRow.style.display = visible ? "flex" : "none";
    }
    for(const control of debugOnlyControls){
      control.style.display = visible ? "inline-flex" : "none";
    }
  };
  const setPatternOpenFromParam = () => {
    if(!dataPatternPanel) return;
    const spec = lookupParam("patternPanel", "p");
    if(spec === null) return;
    const parsed = stringifyBool(spec);
    if(parsed === null) return;
    dataPatternPanel.open = parsed;
    try{
      dataPatternPanel.dispatchEvent(new Event("toggle"));
    }catch(err){
      // ignore if toggle event cannot fire
    }
  };
  const setDebugFromParam = () => {
    if(!debugPanel) return;
    const spec = lookupParam("debug", "d");
    if(spec === null) return;
    const parsed = stringifyBool(spec);
    if(parsed === null) return;
    applyDebugVisibility(parsed);
  };
  setPatternOpenFromParam();
  setDebugFromParam();
  if(!btnGenerate || !btnInit) return;
  const executionStatusEl = document.getElementById("executionStatus");
  const executionStatusLabels = {
    stopped: "停止中",
    running: "実行中",
    finished: "実行終了",
    error: "入力したスクリプトにエラーがあるので実行できません",
  };
  let lastExecutionError = null;
  const setExecutionStatus = (state) => {
    if(!executionStatusEl) return;
    const label = executionStatusLabels[state] || "";
    executionStatusEl.textContent = label;
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
  const ABORT_ERR = Symbol("run-aborted");
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ALIAS_MAP = {
    move: "moveCursor",
    turn: "turnCursor",
    reset: "resetQRCode",
    base: "drawBasePatterns",
    mask: "applyMask",
    empty: "isEmpty",
    used: "isUsed",
    clash: "isMoveBlocked",
    put: "putCell",
    timing: "isTimingCell",
    next: "getNextData",
    pause: "pauseRunning",
  };
  const ALIAS_PATTERN = new RegExp(
    `\\b(${Object.keys(ALIAS_MAP).map(escapeRegExp).join("|")})\\b`,
    "gi",
  );
  const applyAliasTransforms = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text.replace(ALIAS_PATTERN, (match) => ALIAS_MAP[match.toLowerCase()] || match);
  };
  const KEYWORD_NUMBER_PATTERN = /\b(repeat|for|mask|pause)(\d+)\b/gi;
  const applyKeywordSpacing = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text.replace(KEYWORD_NUMBER_PATTERN, "$1 $2");
  };
  const DIRECTION_SUFFIX_PATTERN = /\b(move|turn)(up|down|left|right|front|back)\b/gi;
  const applyCompoundDirectionSpacing = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text.replace(DIRECTION_SUFFIX_PATTERN, "$1 $2");
  };
  const CONDITIONAL_KEYWORDS = ["clash", "empty", "used", "timing"];
  const CONDITIONAL_PATTERN = new RegExp(
    `\\b(${CONDITIONAL_KEYWORDS.map(escapeRegExp).join("|")})\\s*\\?\\s*(\\S.*)`,
    "gi",
  );
  const CONDITIONAL_LINE_PATTERN = new RegExp(
    `^\\s*(${CONDITIONAL_KEYWORDS.map(escapeRegExp).join("|")})\\s*\\?\\s*$`,
    "gim",
  );
  const applyConditionalAliases = (text) => {
    if(typeof text !== "string" || !text) return "";
    if(CONDITIONAL_LINE_PATTERN.test(text)){
      text = text.replace(CONDITIONAL_LINE_PATTERN, (_match, keyword) => `if ${keyword}`);
    }
    return text.replace(CONDITIONAL_PATTERN, (_match, keyword, rest) => `if ${keyword} ${rest}`);
  };

  const DIR_ORDER = [DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT];
  const DIR_TO_INDEX = new Map(DIR_ORDER.map((d, i) => [d, i]));
  const normalizeDir = (val) => {
    if(val === undefined || val === null) return null;
    if(DIR_TO_INDEX.has(val)) return val;
    if(typeof val === "string"){
      const lower = val.toLowerCase();
      if(DIR_TO_INDEX.has(lower)) return lower;
    }
    if(typeof val === "number" && Number.isFinite(val)){
      const idx = ((val % 4) + 4) % 4;
      return DIR_ORDER[idx];
    }
    return null;
  };
  const rotateDir = (baseDir, delta) => {
    const norm = normalizeDir(baseDir);
    if(!norm) return null;
    const idx = DIR_TO_INDEX.get(norm);
    const next = DIR_ORDER[((idx + delta) % 4 + 4) % 4];
    return next;
  };

  const cursorPos = {
    row: 1,
    col: 1,
    dir: DIR_DOWN,
  };
  const pendingCells = new Map();
  const cellStates = new Map(); // key: "r-c", value: { row, col, value, color }
  let isColorEnabled = true;
  const COLORS = ["black", "red", "blue", "green", "yellow", "purple", "orange"];
  const GROUP_COLORS = { A: "blue", B: "black", C: "green" };
  const TERMINATOR_COLOR = "yellow";
  const PADDING_COLOR = "purple";
  const TIMING_COLOR = "orange";
  const FORMAT_COLOR = GROUP_COLORS.A || "blue";
  const TIMING_ROW = 7;
  const TIMING_COL = 7;
  const TIMING_HORIZONTAL = 0;
  const TIMING_VERTICAL = 1;
  let timingRowIndex = 0;
  let timingColIndex = 0;
  let hasFormatPattern = false;
  const isDebugVisible = () => {
    if(!debugPanel) return false;
    const styleDisp = debugPanel.style.display;
    if(styleDisp){
      return styleDisp !== "none";
    }
    return getComputedStyle(debugPanel).display !== "none";
  };
  let lastMoveBlocked = false;
  const BOARD_ROWS = 25;
  const BOARD_COLS = 25;
  const UNPLACED_KIND = (typeof window !== "undefined" && typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : 0;
  const boardMatrix = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(UNPLACED_KIND));

  const LOOP_ITER_LIMIT = BOARD_ROWS * BOARD_COLS;
  let loopGuardCounter = 0;
  function resetLoopGuard(){
    loopGuardCounter = 0;
  }
  function canContinueLoop(){
    loopGuardCounter++;
    return loopGuardCounter <= LOOP_ITER_LIMIT;
  }

  function isStepModeOn(){
    return !!(stepMode && stepMode.checked);
  }

  function parseCellRef(ref){
    if(typeof ref !== "string") return null;
    const trimmed = ref.trim();
    const lower = trimmed.toLowerCase();
    if(lower === "home"){
      return { row: 1, col: 1 };
    }
    if(lower === "end"){
      return { row: BOARD_ROWS, col: BOARD_COLS };
    }
    const m = trimmed.match(/^([a-zA-Z]+)\s*([0-9]+)$/);
    if(!m) return null;
    const letters = m[1].toUpperCase();
    let col = 0;
    for(const ch of letters){
      const n = ch.charCodeAt(0);
      if(n < 65 || n > 90) return null; // not A-Z
      col = col * 26 + (n - 64); // A=1
    }
    const row = parseInt(m[2], 10);
    if(!Number.isInteger(row) || row < 1) return null;
    if(col < 1) return null;
    return { row, col };
  }

  function cellRefFromRowCol(row, col){
    const r = Number(row);
    const c = Number(col);
    if(!Number.isInteger(r) || r < 1) return null;
    if(!Number.isInteger(c) || c < 1) return null;
    let n = c;
    let letters = "";
    while(n > 0){
      const rem = (n - 1) % 26;
      letters = String.fromCharCode(65 + rem) + letters;
      n = Math.floor((n - 1) / 26);
    }
    return `${letters}${r}`;
  }
  const FORMAT_L = [
    0b111011111000100, // mask 0
    0b111001011110011, // mask 1
    0b111110110101010, // mask 2
    0b111100010011101, // mask 3
    0b110011000101111, // mask 4
    0b110001100011000, // mask 5
    0b110110001000001, // mask 6
    0b110100101110110, // mask 7
  ];
  let pendingCursor = null;
  let renderMode = RENDER_IMMEDIATE;
  let isStepFillRunning = false;
  let runId = 0;
  let maskRunId = 0;
  function stopCurrentRun({ resetCursor = false, clear = false } = {}){
    runId++;
    isStepFillRunning = false;
    if(clear){
      resetQRCode();
    }
    if(resetCursor){
      updateCursor(1, 1, DIR_DOWN);
    }
    setRenderMode(RENDER_IMMEDIATE);
  }

  let cellsInitialized = false;
  function ensureCells(){
    const gridArea = document.querySelector(".grid-area");
    const cells = gridArea?.querySelector(".qr-cells");
    if(!gridArea || !cells) return;
    if(cells.childElementCount === 25 * 25){
      return;
    }
    const frag = document.createDocumentFragment();
    for(let r = 1; r <= 25; r++){
      for(let c = 1; c <= 25; c++){
        const div = document.createElement("div");
        div.className = "cell";
        div.dataset.row = r;
        div.dataset.col = c;
        frag.appendChild(div);
      }
    }
    cells.appendChild(frag);
    if(!cellsInitialized){
      window.log("ensureCells(): grid initialized");
    }
    cellsInitialized = true;
  }

  function setCursorColor(color){
    const cursor = document.querySelector(".qr-cursor");
    if(!cursor) return;
    cursor.style.setProperty("--cursor-color", color);
    cursor.style.borderColor = color;
  }

  function applyCursor(row, col, dir){
    const gridArea = document.querySelector(".grid-area");
    const cursor = gridArea?.querySelector(".qr-cursor");
    if(!gridArea || !cursor) return;

    cursor.classList.remove("is-set");

    const r = Math.min(25, Math.max(1, row));
    const c = Math.min(25, Math.max(1, col));
    cursorPos.row = r;
    cursorPos.col = c;
    cursorPos.dir = dir;

    const cellW = gridArea.clientWidth / 25;
    const cellH = gridArea.clientHeight / 25;
    const x = (c - 1) * cellW;
    const y = (r - 1) * cellH;

    const angle = dir === DIR_RIGHT ? 90
      : dir === DIR_DOWN ? 180
      : dir === DIR_LEFT ? 270
      : 0;

    cursor.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
  }

  function updateCursor(row = cursorPos.row, col = cursorPos.col, dir = cursorPos.dir){
    if(row < 1 || row > 25 || col < 1 || col > 25) return false;
    const r = row;
    const c = col;
    cursorPos.row = r;
    cursorPos.col = c;
    cursorPos.dir = dir;
    if(renderMode === RENDER_BUFFERED){
      pendingCursor = { row: r, col: c, dir };
      return true;
    }
    applyCursor(r, c, dir);
    return true;
  }

  function moveCursor(...args){
    lastMoveBlocked = false;
    let targetRow = cursorPos.row;
    let targetCol = cursorPos.col;
    let finalDir = cursorPos.dir;
    const stepOnce = (dirVal) => {
      const norm = normalizeDir(dirVal);
      if(!norm) return false;
      if(norm === DIR_UP){
        targetRow -= 1;
      }else if(norm === DIR_RIGHT){
        targetCol += 1;
      }else if(norm === DIR_DOWN){
        targetRow += 1;
      }else if(norm === DIR_LEFT){
        targetCol -= 1;
      }
      return true;
    };

    if(args.length === 0){
      stepOnce(cursorPos.dir);
    }else if(args.length === 1){
      const v = args[0];
      if(typeof v === "string"){
        const parsed = parseCellRef(v);
        if(parsed){
          targetRow = parsed.row;
          targetCol = parsed.col;
        }else{
          const lower = v.toLowerCase();
          if(lower === DIR_FRONT){
            stepOnce(cursorPos.dir);
          }else if(lower === DIR_BACK){
            stepOnce(rotateDir(cursorPos.dir, 2));
          }else{
            const dirAbs = normalizeDir(v);
            if(!dirAbs) return;
            stepOnce(dirAbs);
          }
        }
      }else{
        const dirAbs = normalizeDir(v);
        if(!dirAbs) return;
        stepOnce(dirAbs);
      }
    }else if(args.length >= 2){
      const [first, second, third] = args;
      const maybeDir = (val) => {
        const d = normalizeDir(val);
        if(d) finalDir = d;
      };
      // pattern: cellRef, dir?
      if(typeof first === "string"){
        const parsed = parseCellRef(first);
        if(!parsed) return;
        targetRow = parsed.row;
        targetCol = parsed.col;
        if(third !== undefined){
          maybeDir(third);
        }else if(typeof second === "string"){
          maybeDir(second);
        }
      }else if(Number.isFinite(first) && Number.isFinite(second)){
        targetRow = first;
        targetCol = second;
        if(third !== undefined){
          maybeDir(third);
        }
      }else{
        return;
      }
    }

    // clamp and validate bounds before applying; if out of bounds, do nothing
    if(targetRow < 1 || targetRow > 25 || targetCol < 1 || targetCol > 25){
      lastMoveBlocked = true;
      return false;
    }
    const ok = updateCursor(targetRow, targetCol, finalDir);
    if(!ok){
      lastMoveBlocked = true;
      return false;
    }
    lastMoveBlocked = false;
    return makeStepThenable(true);
  }

  function turnCursor(dirArg){
    let targetDir = cursorPos.dir;
    if(dirArg === undefined){
      targetDir = rotateDir(cursorPos.dir, 2);
      return targetDir ? updateCursor(cursorPos.row, cursorPos.col, targetDir) : false;
    }
    if(typeof dirArg === "string"){
      const lower = dirArg.toLowerCase();
      if(lower === "right"){
        targetDir = rotateDir(cursorPos.dir, 1);
      }else if(lower === "left"){
        targetDir = rotateDir(cursorPos.dir, -1);
      }else if(lower === "down"){
        targetDir = rotateDir(cursorPos.dir, 2);
      }else if(lower === "up" || lower === DIR_FRONT){
        targetDir = cursorPos.dir;
      }else if(lower === DIR_BACK){
        targetDir = rotateDir(cursorPos.dir, 2);
      }else{
        return false; // unsupported string for relative turn
      }
    }else if(typeof dirArg === "number"){
      targetDir = rotateDir(cursorPos.dir, dirArg);
    }else{
      return false;
    }
    if(!targetDir) return false;
    const ok = updateCursor(cursorPos.row, cursorPos.col, targetDir);
    if(!ok) return false;
    return makeStepThenable(true);
  }

  function applySetCell(row, col, encodedValue, color = "black"){
    const cells = document.querySelectorAll(".qr-cells .cell");
    if(!cells || cells.length === 0) return;
    const r = Math.min(25, Math.max(1, row));
    const c = Math.min(25, Math.max(1, col));
    const idx = (r - 1) * 25 + (c - 1);
    const cell = cells[idx];
    if(!cell) return;
    const finalColor = isColorEnabled ? color : "black";
    cell.className = "cell";
    const kind = (typeof window.bitKind === "function") ? window.bitKind(encodedValue) : Math.abs(encodedValue);
    const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : 0;
    if(kind !== unplacedKind){
      const isBlack = (typeof window.isBlackBit === "function")
        ? window.isBlackBit(encodedValue)
        : encodedValue > 0;
      cell.classList.add(isBlack ? "state-1" : "state-0");
    }
    cell.classList.add(`col-${finalColor}`);
    cell.dataset.debugVal = String(encodedValue);
    const isPositive = encodedValue > 0;
    const debugColor = isPositive ? "#ffffff" : "#000000";
    const debugShadow = isPositive
      ? "0 0 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.8)"
      : "0 0 2px #fff, 0 0 4px #fff";
    cell.style.setProperty("--debug-color", debugColor);
    cell.style.setProperty("--debug-shadow", debugShadow);
    cellStates.set(`${r}-${c}`, { row: r, col: c, value: encodedValue, color });
    if(boardMatrix[r - 1] && boardMatrix[r - 1][c - 1] !== undefined){
      boardMatrix[r - 1][c - 1] = encodedValue;
    }
    const cursor = document.querySelector(".qr-cursor");
    if(cursor){
      cursor.classList.add("is-set");
      setCursorColor("#e60000");
    }
  }

  function resetQRCode(options = {}){
    const {
      abortRun = true,
      forceImmediate = abortRun,
      stopStep = abortRun,
    } = options;
    window.log("resetQRCode()");
    if(abortRun){
      runId++;
      maskRunId++;
    }
    if(stopStep){
      isStepFillRunning = false;
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
  }

  // Guarded cursor update for async flows: only applies if runToken matches current runId
  function updateCursorIfRun(runToken, row, col, dir = cursorPos.dir){
    if(runToken !== runId) return false;
    return updateCursor(row, col, dir);
  }

  function flushRender(){
    if(renderMode !== RENDER_BUFFERED) return;
    if(pendingCells.size > 0){
      for(const { row, col, value, color } of pendingCells.values()){
        applySetCell(row, col, value, color);
      }
      pendingCells.clear();
    }
    if(pendingCursor){
      applyCursor(pendingCursor.row, pendingCursor.col, pendingCursor.dir);
      pendingCursor = null;
    }
  }

  function setRenderMode(mode){
    renderMode = mode === RENDER_BUFFERED ? RENDER_BUFFERED : RENDER_IMMEDIATE;
    if(renderMode === RENDER_IMMEDIATE){
      flushRender();
    }
  }

  async function pauseRunning({ delayMs = 60 } = {}){
    flushRender();
    const wait = Number(delayMs);
    if(!Number.isFinite(wait) || wait <= 0) return;
    await sleep(wait);
  }

  function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
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

  function colorsForKind(kind){
    const map = {
      [BIT_FUNC_FINDER]:     "red",
      [BIT_FUNC_TIMING]:     "orange",
      [BIT_FUNC_ALIGNMENT]:  "red",
      [BIT_FUNC_DARK]:       "red",
      [BIT_FUNC_FORMAT]:     "blue",
      [BIT_FUNC_VERSION]:    "blue",
      [BIT_INFO_MODE]:       "blue",
      [BIT_INFO_LENGTH]:     "blue",
      [BIT_INFO_CHAR]:       "black",
      [BIT_INFO_TERMINATOR]: "yellow",
      [BIT_INFO_PADDING]:    "purple",
      [BIT_INFO_PARITY]:     "green",
      [BIT_MASK]:            "gray",
      [BIT_UNKNOWN]:         "gray",
    };
    return map[kind] || "black";
  }

  function buildBitSequence(){
    if(!Array.isArray(window.patternBits) || window.patternBits.length === 0) return [];
    const seq = [];
    for(const v of window.patternBits){
      const kind = (typeof window.bitKind === "function") ? window.bitKind(v) : Math.abs(v);
      const isBlk = (typeof window.isBlackBit === "function") ? window.isBlackBit(v) : v > 0;
      const bit = isBlk ? 1 : 0;
      const color = (() => {
        switch(kind){
          case BIT_INFO_MODE:
          case BIT_INFO_LENGTH:
            return GROUP_COLORS.A || "blue";
          case BIT_INFO_CHAR:
            return GROUP_COLORS.B || "black";
          case BIT_INFO_TERMINATOR:
            return TERMINATOR_COLOR;
          case BIT_INFO_PADDING:
            return PADDING_COLOR;
          case BIT_INFO_PARITY:
            return GROUP_COLORS.C || "green";
          default:
            return "black";
        }
      })();
      seq.push({ bit, kind });
    }
    return seq;
  }

  let dataSeq = [];
  let dataSeqIndex = 0;
  function resetData(){
    dataSeq = buildBitSequence();
    dataSeqIndex = 0;
  }
  function encodeBitPair(kind, bit){
    if(typeof window.encodeBit === "function"){
      return window.encodeBit(kind, bit === 1);
    }
    return bit === 1 ? Math.abs(kind) : -Math.abs(kind || 0);
  }
  function isDataEnd(){
    return !Array.isArray(dataSeq) || dataSeqIndex >= dataSeq.length;
  }
  function hasMoreData(){
    return Array.isArray(dataSeq) && dataSeqIndex < dataSeq.length;
  }
  function getNextData(){
    if(isDataEnd()){
      return null;
    }
    const entry = dataSeq[dataSeqIndex++];
    if(!entry || typeof entry.kind !== "number" || typeof entry.bit !== "number") return null;
    return encodeBitPair(entry.kind, entry.bit);
  }

  function reapplyCellColors(){
    if(cellStates.size === 0) return;
    for(const { row, col, value, color } of cellStates.values()){
      applySetCell(row, col, value, color);
    }
    timingRowIndex = 0;
    timingColIndex = 0;
  }

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
    const baseMin = "120px";
    const baseMax = "160px";
    let minH = baseMin;
    let maxH = baseMax;
    if(isDebugVisible() && dataPatternPanel && dataPatternPanel.open){
      minH = "110px";
      maxH = "120px";
    }
    debugLog.style.minHeight = minH;
    debugLog.style.maxHeight = maxH;
  }

  function buildUserScript(rawText, { awaitCalls = true } = {}){
    let autoLoopCounter = 0;
    const repeatDefaultConditionName = () => {
      if(typeof window !== "undefined" && typeof window.hasMoreMove === "function"){
        return "hasMoreMove";
      }
      return "hasMoreData";
    };
    const DEFAULT_WHILE_CONDITION = "hasMoreData";
    const DEFAULT_UNTIL_CONDITION = "isDataEnd";
    const extractParenInfo = (line) => {
      const openIdx = line.indexOf("(");
      if(openIdx === -1) return null;
      let depth = 0;
      let closeIdx = -1;
      let inSingle = false;
      let inDouble = false;
      let escapeChar = false;
      for(let i = openIdx; i < line.length; i++){
        const ch = line[i];
        if(escapeChar){
          escapeChar = false;
          continue;
        }
        if(ch === "\\" && (inSingle || inDouble)){
          escapeChar = true;
          continue;
        }
        if(ch === "'" && !inDouble){
          inSingle = !inSingle;
          continue;
        }
        if(ch === '"' && !inSingle){
          inDouble = !inDouble;
          continue;
        }
        if(inSingle || inDouble){
          continue;
        }
        if(ch === "("){
          depth++;
        }else if(ch === ")"){
          depth--;
          if(depth === 0){
            closeIdx = i;
            break;
          }
        }
      }
      if(closeIdx === -1) return null;
      return {
        closeIdx,
        condition: line.slice(openIdx + 1, closeIdx),
        remainder: line.slice(closeIdx + 1),
        prefix: line.slice(0, closeIdx),
      };
    };
    const guardWhileWithParen = (line) => {
      if(line.toLowerCase().includes("cancontinueloop")) return null;
      const info = extractParenInfo(line);
      if(!info) return null;
      const closing = line.slice(info.closeIdx);
      return `${info.prefix} && canContinueLoop()${closing}`;
    };
    const rewriteUntilWithParen = (line) => {
      const info = extractParenInfo(line);
      if(!info) return null;
      const cond = info.condition.trim();
      if(!cond) return null;
      return `while (!(${cond}) && canContinueLoop())${info.remainder}`;
    };
    const stopCommandPattern = /^stop(?:\s+(?:for|while|repeat))?$/i;
    const buildSimpleLoopLine = (keyword, conditionRaw) => {
      const condFormatted = formatStudentCodeLine(conditionRaw);
      if(!condFormatted) return null;
      if(keyword === "while"){
        return `while (${condFormatted} && canContinueLoop()) {`;
      }
      return `while (!(${condFormatted}) && canContinueLoop()) {`;
    };
    const formatSimpleFor = (countVal) => {
      const n = Number(countVal);
      if(!Number.isFinite(n)) return null;
      const loopVar = `i${autoLoopCounter++}`;
      return `for (let ${loopVar} = 0; ${loopVar} < ${n}; ${loopVar}++){`;
    };
    const buildConditionalLine = (prefix, conditionRaw) => {
      const condition = typeof conditionRaw === "string" ? conditionRaw.trim() : "";
      if(!condition) return null;
      if(condition.startsWith("(") && condition.endsWith(")")){
        return `${prefix} ${condition} {`;
      }
      const formatted = formatStudentCodeLine(condition);
      if(!formatted) return null;
      return `${prefix} (${formatted}) {`;
    };
      const spacedText = applyKeywordSpacing(rawText || "");
      const directionSpaced = applyCompoundDirectionSpacing(spacedText);
      const conditionalText = applyConditionalAliases(directionSpaced);
      const codeRaw = applyAliasTransforms(conditionalText);
    if(!codeRaw.trim()) return "";
    const lines = codeRaw.split(/\r?\n/);
    const combined = [];
    let blockDepth = 0;
    const countBraceDelta = (line) => {
      let depth = 0;
      let inSingle = false;
      let inDouble = false;
      let inBacktick = false;
      let escapeChar = false;
      for(const ch of line){
        if(escapeChar){
          escapeChar = false;
          continue;
        }
        if(ch === "\\" && (inSingle || inDouble || inBacktick)){
          escapeChar = true;
          continue;
        }
        if(ch === "'" && !inDouble && !inBacktick){
          inSingle = !inSingle;
          continue;
        }
        if(ch === '"' && !inSingle && !inBacktick){
          inDouble = !inDouble;
          continue;
        }
        if(ch === "`" && !inSingle && !inDouble){
          inBacktick = !inBacktick;
          continue;
        }
        if(inSingle || inDouble || inBacktick){
          continue;
        }
        if(ch === "{"){
          depth += 1;
        }else if(ch === "}"){
          depth -= 1;
        }
      }
      return depth;
    };
    const addLine = (line) => {
      combined.push(line);
      blockDepth = Math.max(0, blockDepth + countBraceDelta(line));
    };
    let pendingInlineIf = null;
    for(const raw of lines){
      const trimmed = typeof raw === "string" ? raw.trim() : "";
      const indent = typeof raw === "string" ? raw.match(/^\s*/)[0] : "";
      const line = trimmed;
      if(!line){
        if(pendingInlineIf) continue;
        continue;
      }
      const elseMatch = line.match(/^else\b(.*)$/i);
      const elseRest = elseMatch ? (elseMatch[1] || "").trim() : "";
      let handledInlineElse = false;
      if(pendingInlineIf && elseMatch && elseRest){
        if(pendingInlineIf.condFormatted && pendingInlineIf.awaitedBody && pendingInlineIf.indent === indent){
          const elseFormatted = formatStudentCodeLine(elseRest);
          const elseStmt = elseFormatted ? (elseFormatted.endsWith(";") ? elseFormatted : `${elseFormatted};`) : "";
          const elseAwaited = elseStmt ? (awaitCalls ? `await ${elseStmt}` : elseStmt) : "";
          const combinedLine = `if (${pendingInlineIf.condFormatted}) { ${pendingInlineIf.awaitedBody} } else { ${elseAwaited} }`;
          addLine(combinedLine);
          pendingInlineIf = null;
          handledInlineElse = true;
        }
      }
      if(handledInlineElse){
        continue;
      }
      if(pendingInlineIf){
        addLine(pendingInlineIf.singleLine);
        pendingInlineIf = null;
      }
      const lineLower = line.toLowerCase();
      if(/^(?:end|endfor|endwhile|enduntil|endrepeat|endif|end\s*for|end\s*while|end\s*until|end\s*repeat|end\s*if)$/i.test(line)){
        addLine("}");
        continue;
      }
      if(stopCommandPattern.test(line)){
        addLine("throw ABORT_ERR;");
        continue;
      }
      const exitMatch = line.match(/^exit(?:\s+(for|while|repeat))?$/i);
      if(exitMatch){
        addLine("break;");
        continue;
      }
      const simpleFor = line.match(/^for(?:\s+(\d+))?\s*$/i);
      if(simpleFor){
        const formattedFor = formatSimpleFor(simpleFor[1] || "1");
        if(formattedFor){
          addLine(formattedFor);
          continue;
        }
      }
      const ifMatch = line.match(/^if\b(.*)$/i);
      if(ifMatch){
        const conditionRaw = (ifMatch[1] || "").trim();
        const singleLineInfo = (() => {
          if(!conditionRaw) return null;
          const firstSpaceIdx = conditionRaw.search(/\s/);
          if(firstSpaceIdx === -1) return null;
          const conditionToken = conditionRaw.slice(0, firstSpaceIdx).trim();
          const rest = conditionRaw.slice(firstSpaceIdx).trim();
          if(!conditionToken || !rest) return null;
          const condFormatted = formatStudentCodeLine(conditionToken);
          if(!condFormatted) return null;
          const exitMatch = rest.match(/^exit(?:\s+(?:for|while|repeat))?$/i);
          if(exitMatch){
            return { singleLine: `if (${condFormatted}) break;`, indent: typeof raw === "string" ? raw.match(/^\s*/)[0] : "" };
          }
          if(stopCommandPattern.test(rest)){
            return { singleLine: `if (${condFormatted}) throw ABORT_ERR;`, indent: typeof raw === "string" ? raw.match(/^\s*/)[0] : "" };
          }
          const bodyFormatted = formatStudentCodeLine(rest);
          if(!bodyFormatted) return null;
          const bodyStmt = bodyFormatted.endsWith(";") ? bodyFormatted : `${bodyFormatted};`;
          const awaitedBody = awaitCalls ? `await ${bodyStmt}` : bodyStmt;
          return {
            singleLine: `if (${condFormatted}) ${awaitedBody}`,
            condFormatted,
            awaitedBody,
            indent: typeof raw === "string" ? raw.match(/^\s*/)[0] : "",
          };
        })();
        if(singleLineInfo){
          pendingInlineIf = singleLineInfo;
          continue;
        }
        if(!line.includes("{")){
          if(conditionRaw){
            const buildLine = buildConditionalLine("if", conditionRaw);
            if(buildLine){
              addLine(buildLine);
              continue;
            }
          }
        }
      }
      if(elseMatch && !line.includes("{")){
        const restIfMatch = elseRest.match(/^if\b(.*)$/i);
        if(restIfMatch){
          const nestedLine = buildConditionalLine("} else if", restIfMatch[1]);
          if(nestedLine){
            addLine(nestedLine);
            continue;
          }
        }
        addLine("} else {");
        continue;
      }
      const whileMatch = line.match(/^while\b(.*)$/i);
      if(whileMatch && !lineLower.includes("cancontinueloop")){
        const conditionRaw = (whileMatch[1] || "").trim();
        const hasCondition = Boolean(conditionRaw);
        const actualCondition = hasCondition ? conditionRaw : DEFAULT_WHILE_CONDITION;
        if(conditionRaw.startsWith("(")){
          const guarded = guardWhileWithParen(line);
          if(guarded){
            addLine(guarded);
            continue;
          }
        }else if(conditionRaw){
          const loopLine = buildSimpleLoopLine("while", conditionRaw);
          if(loopLine){
            addLine(loopLine);
            continue;
          }
        }else if(actualCondition){
          const loopLine = buildSimpleLoopLine("while", actualCondition);
          if(loopLine){
            addLine(loopLine);
            continue;
          }
        }
      }
      const untilMatch = line.match(/^until\b(.*)$/i);
      if(untilMatch && !lineLower.includes("cancontinueloop")){
        const conditionRaw = (untilMatch[1] || "").trim();
        const actualCondition = conditionRaw || DEFAULT_UNTIL_CONDITION;
        if(conditionRaw.startsWith("(")){
          const rewritten = rewriteUntilWithParen(line);
          if(rewritten){
            addLine(rewritten);
            continue;
          }
        }else if(conditionRaw){
          const loopLine = buildSimpleLoopLine("until", conditionRaw);
          if(loopLine){
            addLine(loopLine);
            continue;
          }
        }else if(actualCondition){
          const loopLine = buildSimpleLoopLine("until", actualCondition);
          if(loopLine){
            addLine(loopLine);
            continue;
          }
        }
      }
      const repeatMatch = line.match(/^repeat(?:\s+(\d+))?$/i);
      if(repeatMatch){
        const count = repeatMatch[1];
        if(count){
          const formattedFor = formatSimpleFor(count);
          if(formattedFor){
            addLine(formattedFor);
            continue;
          }
        }else{
          const repeatCondition = repeatDefaultConditionName();
          const guardCondition = formatStudentCodeLine(repeatCondition);
          addLine(`while (${guardCondition} && canContinueLoop()) {`);
          continue;
        }
      }
      const isBlocky = /^(for|while|if|else\b|switch|do\b|try\b|catch\b|finally\b|function\b|async\b|return\b)/i.test(line)
        || /[{;}]$/.test(line);
      if(isBlocky){
        addLine(line);
        continue;
      }
      const formatted = formatStudentCodeLine(line);
      if(formatted){
        const stmt = formatted.endsWith(";") ? formatted : `${formatted};`;
        addLine(awaitCalls ? `await ${stmt}` : stmt);
      }
    }
    if(pendingInlineIf){
      addLine(pendingInlineIf.singleLine);
      pendingInlineIf = null;
    }
    while(blockDepth > 0){
      addLine("}");
    }
    return combined.join("\n");
  }

  function syncParsedCode(){
    if(!userCodeParsed || !codePanel) return;
    const debugOn = isDebugVisible();
    codePanel.classList.toggle("debug-mode", debugOn);
    if(!debugOn){
      userCodeParsed.value = "";
      return;
    }
    const script = buildUserScript(userCodeInput ? userCodeInput.value : "", { awaitCalls: true });
    userCodeParsed.value = script;
  }

  // Export helpers to window
  window.DIR_UP = DIR_UP;
  window.DIR_RIGHT = DIR_RIGHT;
  window.DIR_DOWN = DIR_DOWN;
  window.DIR_LEFT = DIR_LEFT;
  window.DIR_FRONT = DIR_FRONT;
  window.DIR_BACK = DIR_BACK;
  window.RENDER_IMMEDIATE = RENDER_IMMEDIATE;
  window.RENDER_BUFFERED = RENDER_BUFFERED;
  window.cursorPos = cursorPos;
  window.updateCursor = updateCursor;
  window.ensureCells = ensureCells;
  window.flushRender = flushRender;
  window.setRenderMode = setRenderMode;
  window.reapplyCellColors = reapplyCellColors;
  window.resetQRCode = resetQRCode;
  window.clearAllCells = resetQRCode; // backward compat
  window.boardMatrix = boardMatrix;
  window.getNextData = getNextData;
  window.resetData = resetData;
  window.isDataEnd = isDataEnd;
  window.resetLoopGuard = resetLoopGuard;
  window.canContinueLoop = canContinueLoop;
  window.hasMoreData = hasMoreData;
  window.renderFrameAndWait = pauseRunning;
  window.pauseRunning = pauseRunning;
  // Update board matrix directly: row/col 1-based, encoded value (encodeBit)
  window.updateCell = (row, col, encodedValue) => {
    if(row < 1 || row > BOARD_ROWS || col < 1 || col > BOARD_COLS) return false;
    const r = row;
    const c = col;
    const kind = (typeof window.bitKind === "function") ? window.bitKind(encodedValue) : Math.abs(encodedValue);
    const colorEntry = colorsForKind(kind);
    const color = colorEntry || "black";
    if(renderMode === RENDER_BUFFERED){
      pendingCells.set(`${r}-${c}`, { row: r, col: c, value: encodedValue, color });
    }else{
      applySetCell(r, c, encodedValue, color);
    }
    boardMatrix[r - 1][c - 1] = encodedValue;
    return true;
  };
  // Set value at current cursor position using updateCell
  window.putCell = (encodedValue) => {
    let val = encodedValue;
    let usedAuto = false;
    if(val === undefined){
      val = getNextData();
      usedAuto = true;
    }
    // Do not write into functional or timing cells
    if(window.isFunctionalCell && window.isFunctionalCell()){
      if(usedAuto && dataSeqIndex > 0) dataSeqIndex = Math.max(0, dataSeqIndex - 1);
      return false;
    }
    if(window.isTimingCell && window.isTimingCell()){
      if(usedAuto && dataSeqIndex > 0) dataSeqIndex = Math.max(0, dataSeqIndex - 1);
      return false;
    }
    if(!Number.isFinite(val)) return false;
    const ok = window.updateCell(cursorPos.row, cursorPos.col, val);
    if(!ok && usedAuto && dataSeqIndex > 0){
      // rollback auto-advanced data cursor on failure
      dataSeqIndex = Math.max(0, dataSeqIndex - 1);
    }
    return ok;
  };
  // Get raw encoded value from board matrix; returns null if out of range
  window.getCell = (row, col) => {
    let r = row;
    let c = col;
    if(typeof row === "string" && col === undefined){
      const parsed = parseCellRef(row);
      if(!parsed) return null;
      r = parsed.row;
      c = parsed.col;
    }
    if(!Number.isInteger(r) || !Number.isInteger(c)) return null;
    if(r < 1 || r > BOARD_ROWS || c < 1 || c > BOARD_COLS) return null;
    return boardMatrix[r - 1][c - 1];
  };

  function invertCell(rowOrRef, colMaybe){
    let r = rowOrRef;
    let c = colMaybe;
    if(typeof rowOrRef === "string" && colMaybe === undefined){
      const parsed = parseCellRef(rowOrRef);
      if(!parsed) return false;
      r = parsed.row;
      c = parsed.col;
    }
    const rNum = Number(r);
    const cNum = Number(c);
    if(!Number.isInteger(rNum) || !Number.isInteger(cNum)) return false;
    if(rNum < 1 || rNum > BOARD_ROWS || cNum < 1 || cNum > BOARD_COLS) return false;
    const current = window.getCell(rNum, cNum);
    if(typeof current !== "number") return false;
    const rawKind = (typeof window.bitKind === "function") ? window.bitKind(current) : Math.abs(current);
    const maskKind = (typeof window.BIT_MASK === "number" ? window.BIT_MASK : 30);
    const isUnplaced = rawKind === UNPLACED_KIND;
    const kind = isUnplaced ? maskKind : rawKind;
    const isBlack = isUnplaced
      ? false // treat unplaced as white (-kind) before inverting
      : ((typeof window.isBlackBit === "function") ? window.isBlackBit(current) : current > 0);

    // If currently mask black, revert to unplaced
    if(kind === maskKind && isBlack){
      window.updateCell(rNum, cNum, UNPLACED_KIND);
      return UNPLACED_KIND;
    }

    const encoded = (typeof window.encodeBit === "function")
      ? window.encodeBit(kind, !isBlack)
      : (!isBlack ? kind : -kind);
    window.updateCell(rNum, cNum, encoded);
    return encoded;
  }

  function shouldStepFunctions(){
    return isStepModeOn() && !(stepSkipFunctions && stepSkipFunctions.checked);
  }

  function formatStudentCodeLine(line){
    const trimmed = typeof line === "string" ? line.trim() : "";
    if(!trimmed) return "";
    const globalEnv = typeof window !== "undefined"
      ? window
      : (typeof globalThis !== "undefined" ? globalThis : null);
    const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    // If already has parentheses, keep structure but normalize commas to spaces for parsing intent
    if(trimmed.includes("(") && trimmed.includes(")")){
      return trimmed.replace(/,/g, " ");
    }
    // Split by whitespace or comma; comma treated as whitespace
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    if(parts.length === 0) return "";
    const fn = parts.shift();
    const args = parts.map((arg) => {
      const t = arg.trim();
      if(!t) return "";
      if(/^[-+]?\d+(?:\.\d+)?$/.test(t)) return t; // keep numeric
      if(/^["'].+["']$/.test(t)) return t; // already quoted
      if(identifierPattern.test(t) && globalEnv){
        const value = globalEnv[t];
        if(typeof value === "function"){
          return `${t}()`;
        }
      }
      return `"${t.replace(/"/g, '\\"')}"`;
    }).filter(Boolean);
    if(args.length === 0){
      return `${fn}()`;
    }
    // Join args with comma for valid JS call; inputs can be space-separated
    return `${fn}(${args.join(", ")})`;
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
    const script = buildUserScript(userCodeInput.value || "", { awaitCalls: true });
    if(!script.trim()) return true;
    try{
      const runner = `(async () => {\n${script}\n})();`;
      const syntaxError = validateRunnerSyntax(runner);
      if(syntaxError){
        if(typeof window.log === "function"){
          window.log(`syntax error: ${syntaxError.message}`);
        }
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
      if(typeof window.log === "function"){
        window.log(`userCode error: ${msg}`);
      }
      return false;
    }
  }

  async function runUserCodeWithStep(){
    const currentRun = ++runId;
    isStepFillRunning = true;
    const prevRender = renderMode;
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
      isStepFillRunning = false;
      flushRender();
      setRenderMode(prevRender);
    }
  }

  async function applyMask(maskIndex = 0){
    const baseRun = runId;
    const currentMaskRun = ++maskRunId;
    let idx = (maskIndex === undefined) ? 0 : Number(maskIndex);
    if(!Number.isFinite(idx)){
      idx = 0;
    }
    if(idx < 0 || idx > 7){
      return false; // out of range: do nothing
    }
    const maskFn = MASK_FUNCTIONS[idx];
    if(!maskFn) return false;
    const stepMask = isStepModeOn() && !(stepSkipFunctions && stepSkipFunctions.checked);
    const prevRender = renderMode;
    const shouldAbort = () => (baseRun !== runId) || (currentMaskRun !== maskRunId);
    const updateCursorSafe = (row, col, dir = DIR_RIGHT) => {
      if(shouldAbort()) return false;
      return updateCursor(row, col, dir);
    };
    const prevCursor = { row: cursorPos.row, col: cursorPos.col, dir: cursorPos.dir };
    const maskCursorDir = stepMask ? DIR_RIGHT : prevCursor.dir;
    setRenderMode(stepMask ? RENDER_IMMEDIATE : RENDER_BUFFERED);
    const maybeDelay = async () => {
      if(!stepMask) return true;
      if(shouldAbort()) return false;
      const delay = getStepDelay();
      if(delay > 0){
        await sleep(delay);
      }else{
        await new Promise(requestAnimationFrame);
      }
      return !shouldAbort();
    };
    for(let row = 1; row <= 25; row++){
      for(let col = 1; col <= 25; col++){
        if(shouldAbort()) break;
        const encoded = window.getCell(row, col);
        if(typeof encoded !== "number") continue;
        const kind = (typeof window.bitKind === "function") ? window.bitKind(encoded) : Math.abs(encoded);
        if(isFunctionalKind(kind)) continue;
        if(!maskFn(row - 1, col - 1)) continue;
        if(stepMask){
          updateCursorSafe(row, col, maskCursorDir);
        }
        // Apply mask by toggling the bit; invertCell handles unplaced/mask kinds.
        invertCell(row, col);
        const ok = await maybeDelay();
        if(!ok) break;
      }
      if(shouldAbort()) break;
    }
    const completed = !shouldAbort();
    if(completed && hasFormatPattern){
      drawFormatPatterns(idx);
    }
    if(renderMode === RENDER_BUFFERED){
      flushRender();
    }
    setRenderMode(prevRender);
    if(stepMask){
      updateCursorSafe(prevCursor.row, prevCursor.col, maskCursorDir);
    }
    return completed;
  }

  window.invertCell = invertCell;
  window.applyMask = applyMask;
  window.putFinderCells = putFinderCells;
  window.putAlignmentCells = putAlignmentCells;
  window.putTimingCells = putTimingCells;
  window.putDarkModuleCells = putDarkModuleCells;
  window.putFormatCells = putFormatCells;
  window.drawFormatPatterns = drawFormatPatterns;
  window.drawFinderPatterns = drawFinderPatterns;
  window.drawAlignmentPatterns = drawAlignmentPatterns;
  window.drawDarkModulePatterns = drawDarkModulePatterns;
  window.drawTimingPatterns = drawTimingPatterns;
  window.drawBasePatterns = drawBasePatterns;
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
      flushRender();
    }
    return currentRun === runId;
  };
  window.isEmpty = () => {
    const r = cursorPos.row - 1;
    const c = cursorPos.col - 1;
    const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : UNPLACED_KIND;
    if(boardMatrix[r] && typeof boardMatrix[r][c] === "number"){
      const val = boardMatrix[r][c];
      if(typeof window.isUnplacedBit === "function"){
        return window.isUnplacedBit(val);
      }
      const kind = (typeof window.bitKind === "function") ? window.bitKind(val) : Math.abs(val);
      return kind === unplacedKind;
    }
    const key = `${cursorPos.row}-${cursorPos.col}`;
    const entry = cellStates.get(key);
    if(!entry) return true;
    const kind = (typeof window.bitKind === "function") ? window.bitKind(entry.value) : Math.abs(entry.value);
    return kind === unplacedKind;
  };
  window.isUsed = () => {
    const key = `${cursorPos.row}-${cursorPos.col}`;
    return cellStates.has(key);
  };
  window.isTimingCell = () => {
    const { row, col } = cursorPos;
    if(timingRowIndex > 0 && row === timingRowIndex) return true;
    if(timingColIndex > 0 && col === timingColIndex) return true;
    return false;
  };
  window.isFunctionalCell = () => {
    const { row, col } = cursorPos;
    if(row < 1 || row > BOARD_ROWS || col < 1 || col > BOARD_COLS) return false;
    const val = boardMatrix[row - 1][col - 1];
    if(typeof val !== "number") return false;
    const kind = (typeof window.bitKind === "function") ? window.bitKind(val) : Math.abs(val);
    return isFunctionalKind(kind);
  };
  window.isMoveBlocked = () => lastMoveBlocked;
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

  function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function drawBasePatterns({ deferFlush = false, currentRun } = {}){
    if(currentRun !== undefined && currentRun !== runId) return false;
    setRenderMode(RENDER_BUFFERED);
    resetQRCode({ abortRun: false });
    updateCursor(1, 1, DIR_DOWN);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawFinderPatterns({ stepEnabled: false, currentRun });
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawTimingPatterns({ stepEnabled: false, currentRun });
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawAlignmentPatterns({ stepEnabled: false, currentRun });
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawDarkModulePatterns({ stepEnabled: false, currentRun });
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawFormatPatterns(0, { stepEnabled: false, currentRun });
    if(!deferFlush){
      if(currentRun !== undefined && currentRun !== runId) return false;
      flushRender();
      setRenderMode(RENDER_IMMEDIATE);
    }
    return true;
  }

  async function drawBasePatternsStepped({ currentRun } = {}){
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    resetQRCode({ abortRun: false });
    setRenderMode(RENDER_IMMEDIATE);
    updateCursorIfRun(runToken, 1, 1, DIR_DOWN);
    let stepEnabled = isStepModeOn();
    let fastForwarded = false;
    const stepActive = () => stepEnabled && isStepModeOn();
    const shouldAbort = () => (currentRun !== undefined && currentRun !== runId);
    const shouldSkipFunctions = () => {
      if(currentRun !== undefined && currentRun !== runId) return false;
      return !!(stepSkipFunctions && stepSkipFunctions.checked && isStepModeOn());
    };
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
      if(shouldAbort()) return false;
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
      if(shouldAbort()) return false;
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
      if(shouldAbort()) return false;
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
    if(shouldAbort()) return false;
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
        const row = topRow + r0;
        const col = leftCol + c0;
        if(row < 1 || row > 25 || col < 1 || col > 25) continue;
        const bit = pattern[r0][c0];
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
        if(r < 1 || r > 25 || c < 1 || c > 25) continue;
        if(typeof window.updateCell === "function"){
          window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
        }
        if(!stepCell(r, c, 0, BIT_FUNC_FINDER)) return;
        const md = await maybeStepDelay();
        if(md === false) return;
      }
    };
    await drawFinderStep(1, 1);
    if((await moveCursorPath(1, 19)) === false) return { ok: false, fastForwarded };
    await drawFinderStep(1, 19);
    if((await moveCursorPath(19, 1)) === false) return { ok: false, fastForwarded };
    await drawFinderStep(19, 1);

    // timing (row 7, col 7) after finders
    {
      timingRowIndex = TIMING_ROW;
      timingColIndex = TIMING_COL;
      const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : UNPLACED_KIND;
      if((await moveCursorPath(timingRowIndex, 1)) === false) return { ok: false, fastForwarded };
      for(let c = 1; c <= 25; c++){
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

    // dark module
    if((await moveCursorPath(18, 9)) === false) return { ok: false, fastForwarded };
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

    await moveCursorPath(25, 25);

    if(renderMode === RENDER_BUFFERED){
      flushRender();
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
    runId++;
    resetQRCode({ abortRun: false, forceImmediate: true, stopStep: true });
    updateCursor(1, 1, DIR_DOWN);
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
    // Advance runId to signal any in-flight render to cancel
    const requestedRun = ++runId;
    // If a run is active, wait briefly for it to stop
    if(isStepFillRunning){
      const start = Date.now();
      while(isStepFillRunning && Date.now() - start < 2000){
        await sleep(10);
      }
    }
    isStepFillRunning = true;
    const currentRun = runId = requestedRun;
    let aborted = false;
    try{
      const userOk = await runUserCode();
      if(!userOk){ aborted = true; return; }
      let stepEnabled = isStepModeOn();
      const skipFunctions = stepEnabled && stepSkipFunctions && stepSkipFunctions.checked;
      setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
      if(stepEnabled && skipFunctions){
        const ok = drawBasePatterns({ deferFlush: false, currentRun });
        if(currentRun !== runId || !ok){ aborted = true; return; }
        setRenderMode(RENDER_IMMEDIATE);
      }else if(stepEnabled){
        const res = await drawBasePatternsStepped({ currentRun });
        if(res && res.fastForwarded){
          // already finished function patterns quickly
        }else if(currentRun !== runId || (res && res.ok === false)){ aborted = true; return; }
      }else{
        const ok = drawBasePatterns({ deferFlush: false, currentRun });
        if(currentRun !== runId || !ok){ aborted = true; return; }
      }
      // re-evaluate in case step mode changed during base patterns
      stepEnabled = isStepModeOn();
      setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
      const funcSet = buildFunctionSet();
      const bitsSeq = buildBitSequence();

      // Start at bottom-right, facing up
      updateCursor(25, 25, DIR_UP);
      let bitIdx = 0;
      let col = 25;
      let upward = true;
      let startRow = 25;
      while(col > 0 && bitIdx < bitsSeq.length){
        if(currentRun !== runId){ aborted = true; break; }
        if(timingColIndex > 0 && col === timingColIndex){ col--; continue; } // skip timing column
        const colLeft = col - 1;
        for(let i = 0; i < 25 && bitIdx < bitsSeq.length; i++){
          if(currentRun !== runId){ aborted = true; break; }
          const row = (() => {
            if(upward){
              const r = startRow - i;
              return r >= 1 ? r : 25 + r;
            }else{
              const r = startRow + i;
              return r <= 25 ? r : r - 25;
            }
          })();
          updateCursor(cursorPos.row, cursorPos.col, upward ? DIR_UP : DIR_DOWN);
          for(const cTarget of [col, colLeft]){
            if(bitIdx >= bitsSeq.length) break;
            if(cTarget < 1) continue;
            if(timingColIndex > 0 && cTarget === timingColIndex) continue;
            if(cTarget < 1 || cTarget > 25) continue;
            const moved = moveCursor(row, cTarget);
            if(!moved) continue;
            if(!window.isEmpty()) continue;
            const { bit, kind } = bitsSeq[bitIdx];
            const encoded = window.encodeBit(kind, bit === 1);
            window.updateCell(cursorPos.row, cursorPos.col, encoded);
            bitIdx++;
            if(currentRun !== runId){ aborted = true; break; }
            if(stepEnabled){
              const delay = getStepDelay();
              await sleep(Math.max(0, delay));
              if(currentRun !== runId){ aborted = true; break; }
              if(!isStepModeOn()){
                stepEnabled = false;
                setRenderMode(RENDER_BUFFERED);
              }
            }
          }
        }
        upward = !upward;
        startRow = upward ? 25 : 1;
        col -= 2;
      }
      if(currentRun === runId && !stepEnabled){
        flushRender();
      }
      if(currentRun === runId && Array.isArray(window.toggleInputs)){
        // do not auto-clear toggles; user can use 全解除 as needed
      }
    }catch(err){
      if(err === ABORT_ERR){
        aborted = true;
        return;
      }
      throw err;
    }finally{
      isStepFillRunning = false;
      setRenderMode(RENDER_IMMEDIATE);
    }
  }

  btnGenerate.addEventListener("click", async () => {
    setExecutionStatus("running");
    const ok = await runUserCodeWithStep();
    if(ok){
      setExecutionStatus("finished");
    }else if(lastExecutionError){
      setExecutionStatus("error");
    }else{
      setExecutionStatus("stopped");
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

  function putAlignmentCells(centerRow, centerCol, { stepEnabled, currentRun } = {}){
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const step = (typeof stepEnabled === "boolean") ? stepEnabled : shouldStepFunctions();
    window.log && window.log(`putAlignmentCells(${centerRow}, ${centerCol}, step=${step}, run=${runToken})`);
    const pattern = [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,1,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
    ];
    const startRow = centerRow - 2;
    const startCol = centerCol - 2;
    if(!step){
      const prevRender = renderMode;
      setRenderMode(RENDER_BUFFERED);
      for(let r = 0; r < 5; r++){
        for(let c = 0; c < 5; c++){
          const row = startRow + r;
          const col = startCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1));
        }
      }
      flushRender();
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
            return putAlignmentCells(centerRow, centerCol, { stepEnabled: false, currentRun: runToken });
          }
          const row = startRow + r;
          const col = startCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1));
          updateCursorIfRun(runToken, row, col, DIR_RIGHT);
          await delay();
        }
      }
      setRenderMode(prevRender);
      return true;
    })();
  }

  async function drawAlignmentPatterns(options = {}){
    const opts = { ...options, currentRun: (typeof options.currentRun === "number" ? options.currentRun : runId) };
    await putAlignmentCells(19, 19, opts);
    return true;
  }

  async function putFinderCells(topRow, leftCol, { stepEnabled, currentRun } = {}){
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const shouldAbort = () => runToken !== runId;
    const stepInitial = (typeof stepEnabled === "boolean") ? stepEnabled : shouldStepFunctions();
    window.log && window.log(`putFinderCells(${topRow}, ${leftCol}, step=${stepInitial}, run=${runToken})`);
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
    const updateCursorSafe = (row, col, dir = DIR_RIGHT) => {
      if(runToken !== runId) return false;
      return updateCursor(row, col, dir);
    };
    let lastCursorRow = null;
    let lastCursorCol = null;
    const drawSync = () => {
      for(let r = 0; r < 7; r++){
        for(let c = 0; c < 7; c++){
          const row = topRow + r;
          const col = leftCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          lastCursorRow = row;
          lastCursorCol = col;
        }
      }
      const sRow = topRow - 1;
      const eRow = topRow + 7;
      const sCol = leftCol - 1;
      const eCol = leftCol + 7;
      for(let r = sRow; r <= eRow; r++){
        for(let c = sCol; c <= eCol; c++){
          const insideCore = r >= topRow && r < topRow + 7 && c >= leftCol && c < leftCol + 7;
          if(insideCore) continue;
          if(r < 1 || r > 25 || c < 1 || c > 25) continue;
          if(r === sRow || r === eRow || c === sCol || c === eCol){
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
      flushRender();
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
          const row = topRow + r;
          const col = leftCol + c;
          if(row < 1 || row > 25 || col < 1 || col > 25) continue;
          const bit = pattern[r][c];
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
          updateCursorSafe(row, col, DIR_RIGHT);
          lastCursorRow = row;
          lastCursorCol = col;
          await delay();
        }
      }
      const sRow = topRow - 1;
      const eRow = topRow + 7;
      const sCol = leftCol - 1;
      const eCol = leftCol + 7;
      for(let r = sRow; r <= eRow; r++){
        for(let c = sCol; c <= eCol; c++){
          if(shouldAbort()) return false;
          if(!stepActive()) return finishSync();
          const insideCore = r >= topRow && r < topRow + 7 && c >= leftCol && c < leftCol + 7;
          if(insideCore) continue;
          if(r < 1 || r > 25 || c < 1 || c > 25) continue;
          if(r === sRow || r === eRow || c === sCol || c === eCol){
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

  async function drawFinderPatterns(options = {}){
    const opts = { ...options, currentRun: (typeof options.currentRun === "number" ? options.currentRun : runId) };
    await putFinderCells(1, 1, opts);
    await putFinderCells(1, 19, opts);
    await putFinderCells(19, 1, opts);
    return true;
  }

  async function drawDarkModulePatterns(options = {}){
    window.log && window.log("drawDarkModulePatterns()");
    const opts = { ...options, currentRun: (typeof options.currentRun === "number" ? options.currentRun : runId) };
    await putDarkModuleCells(18, 9, opts);
    return true;
  }

  async function putDarkModuleCells(row = 18, col = 9, { stepEnabled, currentRun } = {}){
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const step = (typeof stepEnabled === "boolean") ? stepEnabled : shouldStepFunctions();
    window.log && window.log(`putDarkModuleCells(${row}, ${col}, step=${step}, run=${runToken})`);
    if(!Number.isFinite(row) || !Number.isFinite(col)) return false;
    if(row < 1 || row > 25 || col < 1 || col > 25) return false;
    if(!step){
      if(typeof window.updateCell === "function"){
        window.updateCell(row, col, window.encodeBit(BIT_FUNC_DARK, true));
      }
      return true;
    }
    const delay = async () => {
      await stepDelayAbort(runToken);
    };
    if(runToken !== runId) return false;
    setRenderMode(RENDER_IMMEDIATE);
    if(typeof window.updateCell === "function"){
      window.updateCell(row, col, window.encodeBit(BIT_FUNC_DARK, true));
    }
    updateCursorIfRun(runToken, row, col, DIR_RIGHT);
    await delay();
    return true;
  }

  function putTimingCells(direction = TIMING_HORIZONTAL, index = TIMING_ROW, { stepEnabled, currentRun } = {}){
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    window.log && window.log(`putTimingCells(dir=${direction}, idx=${index}, run=${runToken})`);
    const dirVal = Number(direction);
    if(!Number.isFinite(dirVal)) return false;
    if(dirVal !== TIMING_HORIZONTAL && dirVal !== TIMING_VERTICAL) return false;
    const pos = Number(index);
    if(!Number.isFinite(pos) || !Number.isInteger(pos) || pos < 1 || pos > 25) return false;
    if(dirVal === TIMING_HORIZONTAL){
      timingRowIndex = pos;
    }else{
      timingColIndex = pos;
    }
    const step = (typeof stepEnabled === "boolean") ? stepEnabled : shouldStepFunctions();
    const writeIfEmpty = (r, c) => {
      const existing = boardMatrix[r - 1][c - 1];
      const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : UNPLACED_KIND;
      if(typeof window.isUnplacedBit === "function"){
        if(!window.isUnplacedBit(existing)) return false;
      }else{
        if((typeof window.bitKind === "function" ? window.bitKind(existing) : Math.abs(existing)) !== unplacedKind) return false;
      }
      return true;
    };
    if(!step){
      const prevRender = renderMode;
      setRenderMode(RENDER_BUFFERED);
      if(dirVal === TIMING_HORIZONTAL){
        for(let c = 1; c <= 25; c++){
          const bit = (c % 2 === 1) ? 1 : 0;
          if(!writeIfEmpty(pos, c)) continue;
          window.updateCell(pos, c, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
      }else{
        for(let r = 1; r <= 25; r++){
          const bit = (r % 2 === 1) ? 1 : 0;
          if(!writeIfEmpty(r, pos)) continue;
          window.updateCell(r, pos, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
      }
      flushRender();
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
        if(!shouldStepFunctions()) return putTimingCells(direction, index, { stepEnabled: false, currentRun: runToken });
          const bit = (c % 2 === 1) ? 1 : 0;
          if(!writeIfEmpty(pos, c)) continue;
          window.updateCell(pos, c, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
          updateCursorIfRun(runToken, pos, c, DIR_RIGHT);
          await delay();
        }
      }else{
        for(let r = 1; r <= 25; r++){
          if(runToken !== runId) return false;
        if(!shouldStepFunctions()) return putTimingCells(direction, index, { stepEnabled: false, currentRun: runToken });
          const bit = (r % 2 === 1) ? 1 : 0;
          if(!writeIfEmpty(r, pos)) continue;
          window.updateCell(r, pos, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
          updateCursorIfRun(runToken, r, pos, DIR_RIGHT);
          await delay();
        }
      }
      setRenderMode(prevRender);
      return true;
    })();
  }

  async function drawTimingPatterns(options = {}){
    window.log && window.log("drawTimingPatterns()");
    const opts = { ...options, currentRun: (typeof options.currentRun === "number" ? options.currentRun : runId) };
    await putTimingCells(TIMING_HORIZONTAL, TIMING_ROW, opts);
    await putTimingCells(TIMING_VERTICAL, TIMING_COL, opts);
    return true;
  }

  async function putFormatCells(bits15, coords, { stepEnabled, currentRun } = {}){
    const runToken = (typeof currentRun === "number") ? currentRun : runId;
    const step = (typeof stepEnabled === "boolean") ? stepEnabled : shouldStepFunctions();
    window.log && window.log(`putFormatCells(bits15=${bits15}, step=${step}, run=${runToken})`);
    const coordsArr = Array.isArray(coords) ? coords : [];
    if(!step){
      setRenderMode(RENDER_BUFFERED);
      for(let i = 0; i < coordsArr.length && i < 15; i++){
        const bit = (bits15 >>> i) & 1; // LSB first
        const [r1, c1] = coordsArr[i];
        if(typeof window.updateCell === "function"){
          const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
          window.updateCell(r1 + 1, c1 + 1, enc);
        }
      }
      hasFormatPattern = true;
      flushRender();
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
      if(!shouldStepFunctions()) return putFormatCells(bits15, coords, { stepEnabled: false, currentRun: runToken });
      const bit = (bits15 >>> i) & 1; // LSB first
      const [r1, c1] = coordsArr[i];
      if(typeof window.updateCell === "function"){
        const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
        window.updateCell(r1 + 1, c1 + 1, enc);
      }
      updateCursorIfRun(runToken, r1 + 1, c1 + 1, DIR_RIGHT);
      await delay();
    }
    hasFormatPattern = true;
    setRenderMode(prevRender);
    return true;
  }

  async function drawFormatPatterns(mask = 0, options = {}){
    const runToken = (typeof options.currentRun === "number") ? options.currentRun : runId;
    window.log && window.log(`drawFormatPatterns(mask=${mask})`);
    const m = Math.min(7, Math.max(0, mask));
    const bits15 = FORMAT_L[m];
    const coordsA = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],
      [8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
    ];
    const n = 25;
    const coordsB = [
      [8,n-1],[8,n-2],[8,n-3],[8,n-4],[8,n-5],[8,n-6],[8,n-7],[8,n-8],
      [n-7,8],[n-6,8],[n-5,8],[n-4,8],[n-3,8],[n-2,8],[n-1,8],
    ];
    await putFormatCells(bits15, coordsA, { ...options, currentRun: runToken });
    await putFormatCells(bits15, coordsB, { ...options, currentRun: runToken });
    hasFormatPattern = true;
    return true;
  }

  if(stepMode){
    stepMode.addEventListener("change", syncStepControls);
  }
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
    userCodeInput.addEventListener("input", () => {
      syncParsedCode();
      ensureUserCodeCaretVisible();
    });
    userCodeInput.addEventListener("keydown", async (ev) => {
      if(ev.ctrlKey && !ev.shiftKey && !ev.altKey && ev.key === "Enter"){
        ev.preventDefault();
        ev.stopPropagation();
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
  }

  if(document && document.body){
    requestAnimationFrame(() => {
      document.body.classList.remove("app-loading");
    });
  }

  const logBuffer = window._logBuffer || [];

  let lastLogBody = null;
  function appendDebugLog(message, { raw = false } = {}){
    const text = raw ? String(message) : (() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      return `[${hh}:${mm}:${ss}] ${String(message)}`;
    })();
    const body = String(message);
    if(!debugLog){
      logBuffer.push(text);
      return;
    }
    const first = debugLog.firstChild;
    if(first && first.dataset && first.dataset.body === body){
      first.textContent += ".";
      return;
    }
    const line = document.createElement("div");
    line.className = "log-line";
    line.dataset.body = body;
    line.textContent = text;
    debugLog.insertBefore(line, first || null);
    debugLog.scrollTop = 0;
    lastLogBody = body;
  }

  // Expose simple logger for debugging
  window.log = (msg) => {
    // flush buffered entries if any
    if(debugLog && logBuffer.length){
      for(const buffered of logBuffer.splice(0)){
        appendDebugLog(buffered, { raw: true });
      }
    }
    appendDebugLog(String(msg));
    try{
      console.log(msg);
    }catch(e){
      // ignore console errors
    }
  };

  if(footerCopy && debugPanel){
    footerCopy.addEventListener("dblclick", () => {
      const nextVisible = !isDebugVisible();
      applyDebugVisibility(nextVisible);
      syncDebugOverlay();
      syncDebugPanelLayout();
      syncParsedCode();
      if(typeof window.fitSquare === "function"){
        requestAnimationFrame(window.fitSquare);
      }
    });
  }
})();
