
(function(){
  const btnGenerate = document.getElementById("btnGenerate");
  const btnInit = document.getElementById("btnInit");
  const btnMask = document.getElementById("btnMask");
  const debugCellInput = document.getElementById("debugCellInput");
  const debugCellButton = document.getElementById("debugCellButton");
  const debugLog = document.getElementById("debugLog");
  const debugPanel = document.getElementById("debugPanel");
  const footerCopy = document.querySelector(".page-footer p:first-child");
  const stepMode = document.getElementById("stepMode");
  const stepSkipFunctions = document.getElementById("stepSkipFunctions");
  const stepSpeed = document.getElementById("stepSpeed");
  const stepSpeedLabel = document.querySelector(".step-speed");
  const toggleDebugValues = document.getElementById("toggleDebugValues");
  if(!btnGenerate || !btnInit) return;

  // Relative directions (turn relative to current)
  const DIR_UP = 0;
  const DIR_RIGHT = 1;
  const DIR_DOWN = 2;
  const DIR_LEFT = 3;
  // Absolute cardinal directions
  const CARD_NORTH = 4;
  const CARD_EAST = 5;
  const CARD_SOUTH = 6;
  const CARD_WEST = 7;
  const north = CARD_NORTH;
  const east = CARD_EAST;
  const south = CARD_SOUTH;
  const west = CARD_WEST;
  const n = CARD_NORTH;
  const e = CARD_EAST;
  const s = CARD_SOUTH;
  const w = CARD_WEST;
  const RENDER_IMMEDIATE = "immediate";
  const RENDER_BUFFERED = "buffered";
  const STEP_DELAY_MS = 12;

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
  let timingRowIndex = 0;
  let timingColIndex = 0;
  const ENABLE_TIMING = true; // timing pattern enabled
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

  function isStepModeOn(){
    return !!(stepMode && stepMode.checked);
  }

  function parseCellRef(ref){
    if(typeof ref !== "string") return null;
    const m = ref.trim().match(/^([a-zA-Z]+)\s*([0-9]+)$/);
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
  function stopCurrentRun({ resetCursor = false, clear = false } = {}){
    runId++;
    isStepFillRunning = false;
    if(clear){
      clearAllCells();
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

  function applyCursor(row, col, dir){
    const gridArea = document.querySelector(".grid-area");
    const cursor = gridArea?.querySelector(".qr-cursor");
    if(!gridArea || !cursor) return;

    cursor.classList.remove("is-set");
    cursor.style.setProperty("--cursor-color", "#e60000");
    cursor.style.borderColor = "#e60000";

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
    let targetDir = cursorPos.dir;

    if(args.length === 0){
      if(targetDir === DIR_UP){
        targetRow -= 1;
      }else if(targetDir === DIR_RIGHT){
        targetCol += 1;
      }else if(targetDir === DIR_DOWN){
        targetRow += 1;
      }else if(targetDir === DIR_LEFT){
        targetCol -= 1;
      }
    }else if(args.length === 1){
      const v = args[0];
      if(typeof v === "string"){
        const parsed = parseCellRef(v);
        if(parsed){
          targetRow = parsed.row;
          targetCol = parsed.col;
        }else{
          return;
        }
      }else if(Number.isFinite(v)){
        const dirAbs = v;
        let dr = 0, dc = 0;
        if(dirAbs === DIR_UP) dr = -1;
        if(dirAbs === DIR_RIGHT) dc = 1;
        if(dirAbs === DIR_DOWN) dr = 1;
        if(dirAbs === DIR_LEFT) dc = -1;
        targetRow += dr;
        targetCol += dc;
      }else{
        return;
      }
    }else if(args.length >= 2){
      const [r, c] = args;
      if(Number.isFinite(r) && Number.isFinite(c)){
        targetRow = r;
        targetCol = c;
      }else{
        return;
      }
    }

    // clamp and validate bounds before applying; if out of bounds, do nothing
    if(targetRow < 1 || targetRow > 25 || targetCol < 1 || targetCol > 25){
      lastMoveBlocked = true;
      return false;
    }
    const ok = updateCursor(targetRow, targetCol, cursorPos.dir);
    if(!ok){
      lastMoveBlocked = true;
      return false;
    }
    lastMoveBlocked = false;
    return true;
  }

  function turnCursor(dirArg){
    let targetDir = cursorPos.dir;
    if(dirArg === undefined){
      targetDir = (cursorPos.dir + 2) % 4;
      return updateCursor(cursorPos.row, cursorPos.col, targetDir);
    }
    switch(dirArg){
      case CARD_NORTH: targetDir = DIR_UP; break;
      case CARD_EAST:  targetDir = DIR_RIGHT; break;
      case CARD_SOUTH: targetDir = DIR_DOWN; break;
      case CARD_WEST:  targetDir = DIR_LEFT; break;
      case DIR_UP:     targetDir = cursorPos.dir; break;
      case DIR_RIGHT:  targetDir = (cursorPos.dir + 1) % 4; break;
      case DIR_DOWN:   targetDir = (cursorPos.dir + 2) % 4; break;
      case DIR_LEFT:   targetDir = (cursorPos.dir + 3) % 4; break;
      default: return false;
    }
    return updateCursor(cursorPos.row, cursorPos.col, targetDir);
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
      cursor.style.setProperty("--cursor-color", "#1b66ff");
      cursor.style.borderColor = "#1b66ff";
    }
  }

  function clearAllCells(){
    window.log("clearAllCells()");
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

  // Export helpers to window
  window.DIR_UP = DIR_UP;
  window.DIR_RIGHT = DIR_RIGHT;
  window.DIR_DOWN = DIR_DOWN;
  window.DIR_LEFT = DIR_LEFT;
  window.RENDER_IMMEDIATE = RENDER_IMMEDIATE;
  window.RENDER_BUFFERED = RENDER_BUFFERED;
  window.cursorPos = cursorPos;
  window.updateCursor = updateCursor;
  window.ensureCells = ensureCells;
  window.flushRender = flushRender;
  window.setRenderMode = setRenderMode;
  window.reapplyCellColors = reapplyCellColors;
  window.clearAllCells = clearAllCells;
  window.boardMatrix = boardMatrix;
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

  window.invertCell = invertCell;
  window.drawFinder = drawFinder;
  window.drawAlignment = drawAlignment;
  window.drawTiming = drawTiming;
  window.drawDarkModule = drawDarkModule;
  window.drawFormat = drawFormat;
  window.drawAllFormats = drawAllFormats;
  window.drawAllFinders = drawAllFinders;
  window.drawAllAlignments = drawAllAlignments;
  window.drawAllDarkModules = drawAllDarkModules;
  window.drawAllTimings = drawAllTimings;
  window.drawBasePatterns = drawBasePatterns;
  window.buildFunctionSet = buildFunctionSet;
  window.stopCurrentRun = stopCurrentRun;
  window.parseCellRef = parseCellRef;
  window.cellRefFromRowCol = cellRefFromRowCol;
  window.moveCursor = moveCursor;
  window.turnCursor = turnCursor;
  window.drawFunctionalPatterns = () => drawBasePatterns("red", { deferFlush: false, currentRun: runId });
  window.initializeQRCode = async () => {
    const current = ++runId;
    await drawBasePatterns("red", { deferFlush: false, currentRun: current });
    if(current !== runId) return false;
    turnCursor(DIR_UP);
    return true;
  };
  window.buildQRCode = async () => {
    const currentRun = runId;
    let stepEnabled = isStepModeOn();
    setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
    const bitsSeq = buildBitSequence();

    // Start at bottom-right, facing up
    turnCursor(CARD_NORTH);

      let bitIdx = 0;
      let col = 25;
      let upward = true;
      while(col > 0 && bitIdx < bitsSeq.length){
        if(currentRun !== runId) break;
        if(ENABLE_TIMING && col === timingColIndex){ col--; continue; } // skip timing column when enabled
        const colLeft = col - 1;
        for(let i = 0; i < 25 && bitIdx < bitsSeq.length; i++){
          if(currentRun !== runId) break;
          const row = upward ? (25 - i) : (1 + i);
          // Face the walking direction
          turnCursor(upward ? DIR_UP : DIR_DOWN);
          for(const cTarget of [col, colLeft]){
            if(bitIdx >= bitsSeq.length) break;
            if(cTarget < 1) continue;
            const targetCol = cTarget;
            if(targetCol < 1 || targetCol > 25) continue;
            const moved = moveCursor(row, targetCol);
            if(!moved) continue;
            if(ENABLE_TIMING && targetCol === timingColIndex) continue;
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
    const funcSet = buildFunctionSet();
    return funcSet.has(`${cursorPos.row}-${cursorPos.col}`);
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
  window.CARD_NORTH = CARD_NORTH;
  window.CARD_EAST = CARD_EAST;
  window.CARD_SOUTH = CARD_SOUTH;
  window.CARD_WEST = CARD_WEST;
  window.north = north;
  window.east = east;
  window.south = south;
  window.west = west;
  window.n = n;
  window.e = e;
  window.s = s;
  window.w = w;

  const dirs = [DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT];
  const MASK_FUNCTIONS = {
    0: (r, c) => ((r + c) % 2) === 0, // r,c are 0-based
  };

  function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function drawBasePatterns(color = "red", { deferFlush = false, currentRun } = {}){
    if(currentRun !== undefined && currentRun !== runId) return false;
    setRenderMode(RENDER_BUFFERED);
    clearAllCells();
    updateCursor(1, 1, DIR_DOWN);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawAllFinders(color);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawAllTimings(TIMING_COLOR);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawAllAlignments(color);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawAllDarkModules(color);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawAllFormats(0, FORMAT_COLOR);
    if(!deferFlush){
      if(currentRun !== undefined && currentRun !== runId) return false;
      flushRender();
      setRenderMode(RENDER_IMMEDIATE);
    }
    return true;
  }

  async function drawBasePatternsStepped(color = "red", { currentRun } = {}){
    clearAllCells();
    setRenderMode(RENDER_IMMEDIATE);
    updateCursor(1, 1, DIR_DOWN);
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
      updateCursor(targetRow, targetCol, lastDir);
      if(!(await maybeCursorJumpDelay())) return false;
      return !shouldAbort();
    };
  const stepCell = (row, col, value, cellColor) => {
    if(shouldAbort()) return false;
    const kind = cellColor === TIMING_COLOR ? BIT_FUNC_TIMING
      : cellColor === FORMAT_COLOR ? BIT_FUNC_FORMAT
      : cellColor === color ? BIT_FUNC_FINDER
      : BIT_UNKNOWN;
    const encoded = window.encodeBit(kind, value === 1);
    window.updateCell(row, col, encoded);
    const dr = row - lastRow;
    const dc = col - lastCol;
    if(Math.abs(dr) > Math.abs(dc)){
      lastDir = dr > 0 ? DIR_DOWN : dr < 0 ? DIR_UP : lastDir;
    }else if(Math.abs(dc) > 0){
      lastDir = dc > 0 ? DIR_RIGHT : DIR_LEFT;
    }
      updateCursor(row, col, lastDir);
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
        if(!stepCell(row, col, bit, color)) return;
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
        if(!stepCell(r, c, 0, color)) return;
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
    if(ENABLE_TIMING){
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
        stepCell(timingRowIndex, c, bit, TIMING_COLOR);
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
        stepCell(r, timingColIndex, bit, TIMING_COLOR);
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
          const encFinder = window.encodeBit(BIT_FUNC_FINDER, bit === 1);
          const encAlign = window.encodeBit(BIT_FUNC_ALIGNMENT, bit === 1);
          window.updateCell(row, col, encFinder);
          window.updateCell(row, col, encAlign);
        }
        if(!stepCell(row, col, bit, color)) return;
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
    if(!stepCell(18, 9, 1, color)) return { ok: false, fastForwarded };
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
        if(!stepCell(r + 1, c + 1, bit, FORMAT_COLOR)) return;
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
    if(ENABLE_TIMING && timingRowIndex > 0){
      for(let c = 1; c <= 25; c++) add(timingRowIndex, c);
    }
    if(ENABLE_TIMING && timingColIndex > 0){
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
    isStepFillRunning = false;
    clearAllCells();
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
  });

  btnGenerate.addEventListener("click", async () => {
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
      let stepEnabled = isStepModeOn();
      const skipFunctions = stepEnabled && stepSkipFunctions && stepSkipFunctions.checked;
      setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
      if(stepEnabled && skipFunctions){
        const ok = drawBasePatterns("red", { deferFlush: false, currentRun });
        if(currentRun !== runId || !ok){ aborted = true; return; }
        setRenderMode(RENDER_IMMEDIATE);
      }else if(stepEnabled){
        const res = await drawBasePatternsStepped("red", { currentRun });
        if(res && res.fastForwarded){
          // already finished function patterns quickly
        }else if(currentRun !== runId || (res && res.ok === false)){ aborted = true; return; }
      }else{
        const ok = drawBasePatterns("red", { deferFlush: false, currentRun });
        if(currentRun !== runId || !ok){ aborted = true; return; }
      }
      // re-evaluate in case step mode changed during base patterns
      stepEnabled = isStepModeOn();
      setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
      const funcSet = buildFunctionSet();
      const bitsSeq = buildBitSequence();

      // Start at bottom-right, facing up
      turnCursor(CARD_NORTH);
      updateCursor(25, 25, DIR_UP);
      let bitIdx = 0;
      let col = 25;
      let upward = true;
      let startRow = 25;
      while(col > 0 && bitIdx < bitsSeq.length){
        if(currentRun !== runId){ aborted = true; break; }
        if(ENABLE_TIMING && col === timingColIndex){ col--; continue; } // skip timing column when enabled
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
          turnCursor(upward ? CARD_NORTH : CARD_SOUTH);
          for(const cTarget of [col, colLeft]){
            if(bitIdx >= bitsSeq.length) break;
            if(cTarget < 1) continue;
            if(ENABLE_TIMING && cTarget === timingColIndex) continue;
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
    }finally{
      isStepFillRunning = false;
      setRenderMode(RENDER_IMMEDIATE);
    }
  });

  if(btnMask){
    btnMask.addEventListener('click', () => {
      if(isStepFillRunning) return;
      const maskFn = MASK_FUNCTIONS[0];
      if(!maskFn) return;
      const funcSet = buildFunctionSet();
      setRenderMode(RENDER_BUFFERED);
      for(let row = 1; row <= 25; row++){
        for(let col = 1; col <= 25; col++){
          if(funcSet.has(row + "-" + col)) continue;
          if(!maskFn(row - 1, col - 1)) continue;
          // Apply mask by inverting the cell (handles unplaced <-> mask)
          invertCell(row, col);
        }
      }
      flushRender();
      setRenderMode(RENDER_IMMEDIATE);
    });
  }

  function drawFinder(topRow, leftCol, color = "red"){
    window.log && window.log(`drawFinder(${topRow}, ${leftCol})`);
    // 7x7 finder (black outer ring, white ring around as separator)
    const pattern = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1],
    ];
    setRenderMode(RENDER_BUFFERED);
    // core 7x7
    for(let r = 0; r < 7; r++){
      for(let c = 0; c < 7; c++){
        const row = topRow + r;
        const col = leftCol + c;
        if(row < 1 || row > 25 || col < 1 || col > 25) continue;
        const bit = pattern[r][c];
        if(typeof window.updateCell === "function"){
          window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
        }
        window.updateCell(row, col, window.encodeBit(BIT_FUNC_FINDER, bit === 1));
      }
    }
    // white separator ring outside
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
          if(typeof window.updateCell === "function"){
            window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
          }
          window.updateCell(r, c, window.encodeBit(BIT_FUNC_FINDER, false));
        }
      }
    }
    flushRender();
    setRenderMode(RENDER_IMMEDIATE);
  }

  function drawAlignment(centerRow, centerCol, color = "red"){
    window.log && window.log(`drawAlignment(${centerRow}, ${centerCol})`);
    // 5x5 alignment pattern centered at (centerRow, centerCol)
    const pattern = [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,1,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
    ];
    const startRow = centerRow - 2;
    const startCol = centerCol - 2;
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
    setRenderMode(RENDER_IMMEDIATE);
  }

  function drawAllAlignments(color = "red"){
    window.log && window.log(`drawAllAlignments(color=${color})`);
    drawAlignment(19, 19, color);
  }

  function drawAllFinders(color = "blue"){
    window.log && window.log(`drawAllFinders(color=${color})`);
    drawFinder(1, 1, color);
    drawFinder(1, 19, color);
    drawFinder(19, 1, color);
  }

  function drawAllDarkModules(color = "red"){
    window.log && window.log(`drawAllDarkModules(color=${color})`);
    // Version 2 dark module is at (18, 9)
    drawDarkModule(18, 9, color);
  }

  function drawTiming(direction = "row", index = TIMING_ROW, color = TIMING_COLOR){
    window.log && window.log(`drawTiming(dir=${direction}, idx=${index})`);
    if(!ENABLE_TIMING) return;
    const dirStr = String(direction || "").toLowerCase();
    const isRow = dirStr === "row" || dirStr === "horizontal" || dirStr === "h";
    const pos = Math.min(25, Math.max(1, Number(index)));
    if(isRow){
      timingRowIndex = pos;
    }else{
      timingColIndex = pos;
    }
    setRenderMode(RENDER_BUFFERED);
    if(isRow){
      for(let c = 1; c <= 25; c++){
        const bit = (c % 2 === 1) ? 1 : 0;
        const existing = boardMatrix[pos - 1][c - 1];
        const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : UNPLACED_KIND;
        if(typeof window.isUnplacedBit === "function"){
          if(!window.isUnplacedBit(existing)) continue;
        }else{
          if((typeof window.bitKind === "function" ? window.bitKind(existing) : Math.abs(existing)) !== unplacedKind) continue;
        }
        if(typeof window.updateCell === "function"){
          window.updateCell(pos, c, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
      }
    }else{
      for(let r = 1; r <= 25; r++){
        const bit = (r % 2 === 1) ? 1 : 0;
        const existing = boardMatrix[r - 1][pos - 1];
        const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : UNPLACED_KIND;
        if(typeof window.isUnplacedBit === "function"){
          if(!window.isUnplacedBit(existing)) continue;
        }else{
          if((typeof window.bitKind === "function" ? window.bitKind(existing) : Math.abs(existing)) !== unplacedKind) continue;
        }
        if(typeof window.updateCell === "function"){
          window.updateCell(r, pos, window.encodeBit(BIT_FUNC_TIMING, bit === 1));
        }
      }
    }
    flushRender();
    setRenderMode(RENDER_IMMEDIATE);
  }

  function drawAllTimings(color = TIMING_COLOR){
    window.log && window.log(`drawAllTimings(color=${color})`);
    drawTiming("row", TIMING_ROW, color);
    drawTiming("col", TIMING_COL, color);
  }

  function drawDarkModule(row = 18, col = 9, color = "red"){
    window.log && window.log(`drawDarkModule(${row}, ${col})`);
    if(typeof window.updateCell === "function"){
      window.updateCell(row, col, window.encodeBit(BIT_FUNC_DARK, true));
    }
  }

  function drawFormat(bits15, coords, color = "red"){
    window.log && window.log(`drawFormat(bits15=${bits15})`);
    const coordsArr = Array.isArray(coords) ? coords : [];
    setRenderMode(RENDER_BUFFERED);
    for(let i = 0; i < coordsArr.length && i < 15; i++){
      const bit = (bits15 >>> i) & 1; // LSB first
      const [r1, c1] = coordsArr[i];
      if(typeof window.updateCell === "function"){
        const enc = window.encodeBit(BIT_FUNC_FORMAT, bit === 1);
        window.updateCell(r1 + 1, c1 + 1, enc);
      }
    }
    flushRender();
    setRenderMode(RENDER_IMMEDIATE);
  }

  function drawAllFormats(mask = 0, color = FORMAT_COLOR){
    window.log && window.log(`drawAllFormats(mask=${mask}, color=${color})`);
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
    drawFormat(bits15, coordsA, color);
    drawFormat(bits15, coordsB, color);
  }

  if(stepMode){
    stepMode.addEventListener("change", syncStepControls);
  }
  syncStepControls();

  ensureCells();
  clearAllCells();
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

  function runDebugEval(){
    if(!debugCellInput) return;
    const code = debugCellInput.value.trim();
    if(!code){
      appendDebugLog("入力が空です");
      return;
    }
    let evalCode = code;
    const mLog = code.match(/^log\s+(.+)/);
    if(mLog){
      evalCode = `log(${mLog[1]})`;
    }
    try{
      const result = (0, eval)(evalCode); // global eval so window.* が使える
      appendDebugLog(`OK: ${String(result)}`);
      window.log(`eval result: ${String(result)}`);
    }catch(err){
      appendDebugLog(`ERR: ${err}`);
      window.log(err);
    }
  }
  if(debugCellButton){
    debugCellButton.addEventListener("click", runDebugEval);
  }
  if(debugCellInput){
    debugCellInput.addEventListener("keydown", (ev) => {
      if(ev.key === "Enter"){
        ev.preventDefault();
        runDebugEval();
      }
    });
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
      const isHidden = debugPanel.style.display === "none" || getComputedStyle(debugPanel).display === "none";
      debugPanel.style.display = isHidden ? "block" : "none";
      syncDebugOverlay();
      if(typeof window.fitSquare === "function"){
        requestAnimationFrame(window.fitSquare);
      }
    });
  }
})();
