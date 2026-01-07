/**
 * マスの座標/方向・カーソル制御・セル更新を担う board モジュール。
 */
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
const RESET_DELAY_MS = 10;

if(typeof window !== "undefined" && typeof window.makeStepThenable !== "function"){
  window.makeStepThenable = (ok = true) => ok;
}

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
  dir: DIR_RIGHT,
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
let lastMoveBlocked = false;
const BOARD_ROWS = 25;
const BOARD_COLS = 25;
const UNPLACED_KIND = (typeof window !== "undefined" && typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : 0;
const DEFAULT_CURSOR_COLOR = "#e60000";
const STEP_CURSOR_COLOR = "#1a73e8";
const MASK_KIND = (typeof window !== "undefined" && typeof window.BIT_MASK === "number") ? window.BIT_MASK : null;
const boardMatrix = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(UNPLACED_KIND));

const FUNCTION_KINDS = [
  (typeof window !== "undefined" && typeof window.BIT_FUNC_FINDER === "number") ? window.BIT_FUNC_FINDER : null,
  (typeof window !== "undefined" && typeof window.BIT_FUNC_ALIGNMENT === "number") ? window.BIT_FUNC_ALIGNMENT : null,
  (typeof window !== "undefined" && typeof window.BIT_FUNC_TIMING === "number") ? window.BIT_FUNC_TIMING : null,
  (typeof window !== "undefined" && typeof window.BIT_FUNC_DARK === "number") ? window.BIT_FUNC_DARK : null,
  (typeof window !== "undefined" && typeof window.BIT_FUNC_FORMAT === "number") ? window.BIT_FUNC_FORMAT : null,
  (typeof window !== "undefined" && typeof window.BIT_FUNC_VERSION === "number") ? window.BIT_FUNC_VERSION : null,
].filter((v) => typeof v === "number");
const isFunctionalKind = (kind) => FUNCTION_KINDS.includes(kind);
const isMaskKind = (kind) => typeof kind === "number" && MASK_KIND !== null && kind === MASK_KIND;
function isDataKind(kind){
  if(typeof kind !== "number") return false;
  if(isMaskKind(kind)){
    return false;
  }
  return !isFunctionalKind(kind);
}

const LOOP_ITER_LIMIT = BOARD_ROWS * BOARD_COLS;
let loopGuardCounter = 0;
function resetLoopGuard(){
  loopGuardCounter = 0;
}
function canContinueLoop(){
  loopGuardCounter++;
  return loopGuardCounter <= LOOP_ITER_LIMIT;
}

const HOME_CURSOR = { row: 1, col: 1, dir: DIR_RIGHT };

function ensureCells(){
  const gridArea = document.querySelector(".grid-area");
  const cells = gridArea?.querySelector(".qr-cells");
  if(!gridArea || !cells) return;
  if(cells.childElementCount === BOARD_ROWS * BOARD_COLS){
    return;
  }
  const frag = document.createDocumentFragment();
  for(let r = 1; r <= BOARD_ROWS; r++){
    for(let c = 1; c <= BOARD_COLS; c++){
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.row = r;
      div.dataset.col = c;
      frag.appendChild(div);
    }
  }
  cells.appendChild(frag);
}

function setCursorColor(color){
  const cursor = document.querySelector(".qr-cursor");
  if(!cursor) return;
  cursor.style.setProperty("--cursor-color", color);
  cursor.style.borderColor = color;
}

// Helpers for keeping cursor coloring in sync when stepping through cells.
function isMaskApplying(){
  return typeof window !== "undefined" && Boolean(window.maskApplying);
}

function isStepModeEnabled(){
  return typeof window !== "undefined" && typeof window.isStepModeOn === "function" && window.isStepModeOn();
}

function isStepModeDataOnly(){
  if(!isStepModeEnabled()) return false;
  if(typeof window.shouldStepFunctions !== "function") return false;
  return !window.shouldStepFunctions();
}

function isStepModeActive(){
  if(isStepModeEnabled()) return true;
  if(typeof window !== "undefined" && typeof window.shouldStepFunctions === "function"){
    return window.shouldStepFunctions();
  }
  return false;
}

function requestCursorColorRender(reason = "cursor-color-change"){
  if(typeof window === "undefined") return;
  const cycle = window.renderCycle;
  if(cycle && typeof cycle.requestRender === "function"){
    cycle.requestRender(reason);
    return;
  }
  flushRender();
}

const STEP_HIGHLIGHT_MIN_MS = 80;
const STEP_ANIMATION_DURATION_MS = 220;
let stepHighlightExpiresAt = 0;
let pendingResetTimer = null;
let cursorHighlightActive = false;
let suppressStepPlacementAnimation = false;

function withStepPlacementSuppressed(fn){
  if(!fn) return;
  const prev = suppressStepPlacementAnimation;
  suppressStepPlacementAnimation = true;
  try{
    return fn();
  }finally{
    suppressStepPlacementAnimation = prev;
  }
}

function executeCursorReset(){
  pendingResetTimer = null;
  cursorHighlightActive = false;
  setCursorColor(DEFAULT_CURSOR_COLOR);
  requestCursorColorRender("cursor-step-reset");
}

function scheduleCursorReset(delayMs = 0){
  if(pendingResetTimer !== null){
    clearTimeout(pendingResetTimer);
    pendingResetTimer = null;
  }
  if(delayMs <= 0){
    executeCursorReset();
    return;
  }
  pendingResetTimer = setTimeout(executeCursorReset, delayMs);
}

function shouldAnimatePlacement(kind){
  if(!isStepModeActive()) return false;
  if(isMaskApplying() && (!isStepModeEnabled() || isStepModeDataOnly())){
    return false;
  }
  if(isStepModeDataOnly()){
    if(typeof kind === "number"){
      return isDataKind(kind);
    }
    return false;
  }
  return true;
}

function highlightCursorForStepPutCell(kind){
  if(!shouldAnimatePlacement(kind)) return;
  flushRender();
  const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  stepHighlightExpiresAt = now + STEP_HIGHLIGHT_MIN_MS;
  cursorHighlightActive = true;
  requestCursorColorRender("cursor-step-highlight");
  scheduleCursorReset(STEP_HIGHLIGHT_MIN_MS);
}

function resetCursorColorAfterStepMove(){
  if(!cursorHighlightActive) return;
  const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  const remaining = Math.max(0, stepHighlightExpiresAt - now);
  scheduleCursorReset(remaining);
}

function applyStepPlacementAnimation(row, col){
  if(suppressStepPlacementAnimation) return null;
  const cell = getCellElement(row, col);
  if(!cell) return null;
  cell.classList.remove("cell-step-put");
  void cell.offsetWidth;
  cell.classList.add("cell-step-put");
  cell.style.zIndex = "999";
  if(cell.dataset.stepZResetTimer){
    clearTimeout(Number(cell.dataset.stepZResetTimer));
  }
  const timer = setTimeout(() => {
    cell.style.removeProperty("z-index");
    delete cell.dataset.stepZResetTimer;
  }, STEP_ANIMATION_DURATION_MS);
  cell.dataset.stepZResetTimer = String(timer);
  return cell;
}

function getCellElement(row, col){
  if(!Number.isInteger(row) || !Number.isInteger(col)) return null;
  if(row < 1 || row > BOARD_ROWS || col < 1 || col > BOARD_COLS) return null;
  const cells = document.querySelectorAll(".qr-cells .cell");
  if(!cells || cells.length === 0) return null;
  const idx = (row - 1) * BOARD_COLS + (col - 1);
  return cells[idx] || null;
}

function animateCellPlacementAt(row, col, kind){
  if(!shouldAnimatePlacement(kind)) return;
  applyStepPlacementAnimation(row, col);
}

if(typeof window !== "undefined"){
  window.animateCellPlacement = animateCellPlacementAt;
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

  const cellW = gridArea.clientWidth / BOARD_COLS;
  const cellH = gridArea.clientHeight / BOARD_ROWS;
  const x = (c - 1) * cellW;
  const y = (r - 1) * cellH;

  const angle = dir === DIR_RIGHT ? 90
    : dir === DIR_DOWN ? 180
    : dir === DIR_LEFT ? 270
    : 0;

  cursor.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
}

function updateCursor(row = cursorPos.row, col = cursorPos.col, dir = cursorPos.dir){
  if(row < 1 || row > BOARD_ROWS || col < 1 || col > BOARD_COLS) return false;
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

function resetCursor(){
  return updateCursor(HOME_CURSOR.row, HOME_CURSOR.col, HOME_CURSOR.dir);
}

function moveCursor(...args){
  lastMoveBlocked = false;
  let targetRow = cursorPos.row;
  let targetCol = cursorPos.col;
  let finalDir = cursorPos.dir;
  let logLabel = null;
  let logPositionOnly = false;
  let relativeStepDir = null;
  let relativeMoveCount = 1;
  let isRelativeMove = false;
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
  const getOrientationLabel = (dirVal) => {
    if(!dirVal) return "";
    const orientationMap = {
      up: "上向き",
      right: "右向き",
      down: "下向き",
      left: "左向き",
    };
    return orientationMap[dirVal] || dirVal;
  };
  const describeMove = (key) => {
    const directionWords = {
      front: "前",
      back: "後",
      left: "左",
      right: "右",
      up: "丁",
      down: "丁",
    };
    const word = directionWords[key] ?? key;
    return "カーソル" + word + "移動";
  };

  const recordStraightMove = () => {
    logLabel = "カーソル直移動";
    logPositionOnly = true;
  };
  const recordRelativeMove = (key) => {
    logLabel = describeMove(key);
  };
  const scheduleRelativeMove = (dirVal) => {
    const norm = normalizeDir(dirVal);
    if(!norm) return false;
    relativeStepDir = norm;
    relativeMoveCount = 1;
    isRelativeMove = true;
    return true;
  };
  const handleAutoAvoidStep = (dirVal) => {
    const autoAvoidTiming = Boolean(window.autoAvoidTiming);
    if(!autoAvoidTiming || !dirVal) return;
    const isVertical = (dirVal === DIR_UP || dirVal === DIR_DOWN);
    const isHorizontal = (dirVal === DIR_LEFT || dirVal === DIR_RIGHT);
    const row = cursorPos.row;
    const col = cursorPos.col;
    const hitTimingRow = isVertical && timingRowIndex > 0 && row === timingRowIndex;
    const hitTimingCol = isHorizontal && timingColIndex > 0 && col === timingColIndex;
    if(!hitTimingRow && !hitTimingCol) return;
    const rowDelta = isVertical ? ((dirVal === DIR_DOWN) ? 1 : -1) : 0;
    const colDelta = isHorizontal ? ((dirVal === DIR_RIGHT) ? 1 : -1) : 0;
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;
    if(nextRow < 1 || nextRow > BOARD_ROWS || nextCol < 1 || nextCol > BOARD_COLS) return;
    const movedAgain = updateCursor(nextRow, nextCol, finalDir);
    if(movedAgain){
      targetRow = nextRow;
      targetCol = nextCol;
    }
  };
  const performRelativeMoves = () => {
    if(!isRelativeMove){
      return true;
    }
    if(relativeMoveCount <= 0){
      targetRow = cursorPos.row;
      targetCol = cursorPos.col;
      return true;
    }
    for(let i = 0; i < relativeMoveCount; i++){
      targetRow = cursorPos.row;
      targetCol = cursorPos.col;
      if(!stepOnce(relativeStepDir)){
        return false;
      }
      if(targetRow < 1 || targetRow > BOARD_ROWS || targetCol < 1 || targetCol > BOARD_COLS){
        lastMoveBlocked = true;
        return false;
      }
      const ok = updateCursor(targetRow, targetCol, finalDir);
      if(!ok){
        lastMoveBlocked = true;
        return false;
      }
      handleAutoAvoidStep(relativeStepDir);
    }
    targetRow = cursorPos.row;
    targetCol = cursorPos.col;
    return true;
  };

  if(args.length === 0){
    recordRelativeMove("front");
    scheduleRelativeMove(cursorPos.dir);
  }else if(args.length === 1){
    const v = args[0];
    if(typeof v === "number" && Number.isFinite(v)){
      return false;
    }
    if(typeof v === "string"){
      const aliasCoord = resolveCoordinateAlias(v);
      if(aliasCoord){
        targetRow = aliasCoord.row;
        targetCol = aliasCoord.col;
        recordStraightMove();
      }else{
        const parsed = parseCellRef(v);
        if(parsed){
          targetRow = parsed.row;
          targetCol = parsed.col;
          recordStraightMove();
        }else{
          const lower = v.toLowerCase();
          if(lower === DIR_FRONT){
            recordRelativeMove("front");
            scheduleRelativeMove(cursorPos.dir);
          }else if(lower === DIR_BACK){
            recordRelativeMove("back");
            scheduleRelativeMove(rotateDir(cursorPos.dir, 2));
          }else{
            const dirAbs = normalizeDir(v);
            if(!dirAbs) return false;
            recordRelativeMove(dirAbs);
            scheduleRelativeMove(dirAbs);
          }
        }
      }
    }else{
      const dirAbs = normalizeDir(v);
      if(!dirAbs) return false;
      recordRelativeMove(dirAbs);
      scheduleRelativeMove(dirAbs);
    }
  }else if(args.length >= 2){
    const [first, second, third] = args;
    const maybeDir = (val) => {
      const d = normalizeDir(val);
      if(d) finalDir = d;
    };
    if(typeof first === "string"){
      const aliasCoord = resolveCoordinateAlias(first);
      if(aliasCoord){
        targetRow = aliasCoord.row;
        targetCol = aliasCoord.col;
        recordStraightMove();
        if(third !== undefined){
          maybeDir(third);
        }else if(typeof second === "string"){
          maybeDir(second);
        }
      }else{
        const parsed = parseCellRef(first);
        if(parsed){
          targetRow = parsed.row;
          targetCol = parsed.col;
          recordStraightMove();
          if(third !== undefined){
            maybeDir(third);
          }else if(typeof second === "string"){
            maybeDir(second);
          }
        }else{
          const dirAbs = normalizeDir(first);
          if(!dirAbs) return false;
          if(typeof second === "number" && Number.isFinite(second)){
            return false;
          }
          if(typeof third === "number" && Number.isFinite(third)){
            return false;
          }
          let orientation = null;
          if(typeof second === "string"){
            const normalized = normalizeDir(second);
            if(normalized){
              orientation = second;
            }
          }
          if(!orientation && typeof third === "string"){
            const normalized = normalizeDir(third);
            if(normalized){
              orientation = third;
            }
          }
          if(!scheduleRelativeMove(dirAbs)) return false;
          recordRelativeMove(dirAbs);
          if(orientation){
            maybeDir(orientation);
          }
        }
      }
    }else if(Number.isFinite(first) && Number.isFinite(second)){
      targetRow = first;
      targetCol = second;
      recordStraightMove();
      if(third !== undefined){
        maybeDir(third);
      }
    }else{
      return false;
    }
  }

  if(isRelativeMove){
    if(!performRelativeMoves()){
      return false;
    }
  }else{
    if(targetRow < 1 || targetRow > BOARD_ROWS || targetCol < 1 || targetCol > BOARD_COLS){
      lastMoveBlocked = true;
      return false;
    }
    const ok = updateCursor(targetRow, targetCol, finalDir);
    if(!ok){
      lastMoveBlocked = true;
      return false;
    }
  }
  if(logLabel && logPositionOnly){
    const payload = {
      args,
      target: { row: targetRow, col: targetCol },
      dir: finalDir,
    };
    if(typeof window.logEvent === "function"){
      const cellRef = cellRefFromRowCol(targetRow, targetCol);
      const refLabel = cellRef ? ("@" + cellRef) : "";
      const coordsLabel = "(" + targetRow + ", " + targetCol + ")";
      const orientationLabel = getOrientationLabel(finalDir);
      const description = logLabel + refLabel + coordsLabel + " / " + orientationLabel;
      window.logEvent("moveCursor", JSON.stringify(payload), description);
    }
  }
  resetCursorColorAfterStepMove();
  lastMoveBlocked = false;
  return callMakeStepThenable();
}

function callMakeStepThenable(){
  if(typeof window.makeStepThenable === "function"){
    return window.makeStepThenable(true);
  }
  return true;
}

function turnCursor(dirArg){
  let targetDir = cursorPos.dir;
  const requestedDir = dirArg === undefined ? "back" : dirArg;
  if(dirArg === undefined){
    targetDir = rotateDir(cursorPos.dir, 2);
    if(!targetDir) return false;
    const ok = updateCursor(cursorPos.row, cursorPos.col, targetDir);
    if(!ok) return false;
    const logPayload = {
      requested: requestedDir,
      result: targetDir,
    };
    if(typeof window.logEvent === "function"){
      // window.logEvent("turnCursor", JSON.stringify(logPayload), "回転");
    }
    return callMakeStepThenable();
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
      return false;
    }
  }else if(typeof dirArg === "number"){
    targetDir = rotateDir(cursorPos.dir, dirArg);
  }else{
    return false;
  }
  if(!targetDir) return false;
  const ok = updateCursor(cursorPos.row, cursorPos.col, targetDir);
  if(!ok) return false;
  const logPayload = {
    requested: requestedDir,
    result: targetDir,
  };
  if(typeof window.logEvent === "function"){
    // window.logEvent("turnCursor", JSON.stringify(logPayload), "回転");
  }
  return callMakeStepThenable();
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
  animateCellPlacementAt(r, c, kind);
  const cursor = document.querySelector(".qr-cursor");
  if(cursor){
    cursor.classList.add("is-set");
    setCursorColor(DEFAULT_CURSOR_COLOR);
  }
}

let pendingCursor = null;
let renderMode = RENDER_IMMEDIATE;

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

async function pauseRunning({ delayMs = 60 } = {}){
  flushRender();
  const wait = Number(delayMs);
  if(!Number.isFinite(wait) || wait <= 0) return;
  await sleep(wait);
}

function colorsForKind(kind){
  const map = {
    [BIT_FUNC_FINDER]:     "red",
    [BIT_FUNC_TIMING]:     "orange",
    [BIT_FUNC_ALIGNMENT]:  "red",
    [BIT_FUNC_DARK]:       "red",
    [BIT_FUNC_FORMAT]:     "format",
    [BIT_FUNC_VERSION]:    "format",
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

function getNextDataKind(){
  if(!Array.isArray(dataSeq) || dataSeqIndex >= dataSeq.length) return null;
  const entry = dataSeq[dataSeqIndex];
  if(!entry || typeof entry.kind !== "number") return null;
  return entry.kind;
}

function reapplyCellColors(){
  if(cellStates.size === 0) return;
  withStepPlacementSuppressed(() => {
    for(const { row, col, value, color } of cellStates.values()){
      applySetCell(row, col, value, color);
    }
  });
  timingRowIndex = 0;
  timingColIndex = 0;
}

function parseCellRef(ref){
  if(typeof ref !== "string") return null;
  const trimmed = ref.trim();
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

const resolveCoordinateAlias = (() => {
  const aliasMap = {
    home: { row: 1, col: 1 },
    end: { row: BOARD_ROWS, col: BOARD_COLS },
  };
  return (value) => {
    if(typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    return aliasMap[normalized] || null;
  };
})();

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
function resolveRowCol(rowArg, colArg, fallbackRow = cursorPos.row, fallbackCol = cursorPos.col){
  let row = fallbackRow;
  let col = fallbackCol;
  if(typeof rowArg === "string" && colArg === undefined){
    const aliasCoord = resolveCoordinateAlias(rowArg);
    if(aliasCoord){
      return { row: aliasCoord.row, col: aliasCoord.col };
    }
    const parsed = parseCellRef(rowArg);
    if(parsed){
      return { row: parsed.row, col: parsed.col };
    }
  }
  if(typeof rowArg === "string" && colArg !== undefined){
    const aliasCoord = resolveCoordinateAlias(rowArg);
    if(aliasCoord){
      row = aliasCoord.row;
      if(Number.isFinite(colArg)){
        col = colArg;
      }
    }else{
      const parsed = parseCellRef(rowArg);
      if(parsed){
        row = parsed.row;
        if(typeof colArg === "string"){
          const aliasCol = resolveCoordinateAlias(colArg);
          col = aliasCol ? aliasCol.col : parsed.col;
        }else if(Number.isFinite(colArg)){
          col = colArg;
        }else{
          col = parsed.col;
        }
      }
    }
  }else{
    if(Number.isFinite(rowArg)) row = rowArg;
    if(typeof colArg === "string"){
      const aliasCoord = resolveCoordinateAlias(colArg);
      if(aliasCoord){
        col = aliasCoord.col;
      }else{
        const parsed = parseCellRef(colArg);
        if(parsed){
          col = parsed.col;
        }
      }
    }else if(Number.isFinite(colArg)){
      col = colArg;
    }
  }
  return { row, col };
}

function shouldPlaceCell(row, col, overwrite = true){
  if(overwrite) return true;
  return isBoardCellUnplaced(row, col);
}

const isEncodedValueUnplaced = (value) => {
  if(typeof window.isUnplacedBit === "function"){
    return window.isUnplacedBit(value);
  }
  const kind = (typeof window.bitKind === "function") ? window.bitKind(value) : Math.abs(value);
  return kind === UNPLACED_KIND;
};
function isBoardCellUnplaced(row, col){
  if(!Number.isInteger(row) || !Number.isInteger(col)) return false;
  if(row < 1 || row > BOARD_ROWS || col < 1 || col > BOARD_COLS) return false;
  const rowArray = boardMatrix[row - 1];
  if(!Array.isArray(rowArray)) return true;
  const cellValue = rowArray[col - 1];
  if(typeof cellValue !== "number") return true;
  return isEncodedValueUnplaced(cellValue);
}

function updateCell(row, col, encodedValue){
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
}

function putCell(encodedValue){
  let val = encodedValue;
  let usedAuto = false;
  if(val === undefined){
    val = getNextData();
    usedAuto = true;
  }
  const skipExisting = Boolean(window.skipExistingCells);
  if(skipExisting && typeof window.isEmpty === "function" && !window.isEmpty()){
    if(usedAuto && dataSeqIndex > 0){
      dataSeqIndex = Math.max(0, dataSeqIndex - 1);
    }
    return false;
  }
  if(!Number.isFinite(val)) return false;
  const valKind = (typeof window.bitKind === "function") ? window.bitKind(val) : Math.abs(val);
  const ok = window.updateCell(cursorPos.row, cursorPos.col, val);
  if(!ok && usedAuto && dataSeqIndex > 0){
    dataSeqIndex = Math.max(0, dataSeqIndex - 1);
  }
  if(ok){
    highlightCursorForStepPutCell(valKind);
    if(isDataKind(valKind) && typeof window !== "undefined" && typeof window.updateDataPatternStatus === "function"){
      window.updateDataPatternStatus(valKind);
    }
  }
  return ok;
}

function getCell(row, col){
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
}

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
    ? false
    : ((typeof window.isBlackBit === "function") ? window.isBlackBit(current) : current > 0);

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

function isEmpty(){
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
}

function isUsed(){
  const key = `${cursorPos.row}-${cursorPos.col}`;
  return cellStates.has(key);
}

function isSkipZone(){
  const { row, col } = cursorPos;
  if(timingRowIndex > 0 && row === timingRowIndex) return true;
  if(timingColIndex > 0 && col === timingColIndex) return true;
  return false;
}
function isFunctionalCell(){
  const { row, col } = cursorPos;
  if(row < 1 || row > BOARD_ROWS || col < 1 || col > BOARD_COLS) return false;
  const val = boardMatrix[row - 1][col - 1];
  if(typeof val !== "number") return false;
  const kind = (typeof window.bitKind === "function") ? window.bitKind(val) : Math.abs(val);
  return isFunctionalKind(kind);
}

function isMoveBlocked(){
  return lastMoveBlocked;
}

async function putNextCell(){
  if(window.isEmpty && window.isEmpty()){
    await putCell();
  }
  await moveCursor("left");
  if(window.isEmpty && window.isEmpty()){
    await putCell();
  }
  await moveCursor();
  if(window.isMoveBlocked && window.isMoveBlocked()){
    await turnCursor();
    await moveCursor("left");
    if(window.isSkipZone && window.isSkipZone()){
      await moveCursor("left");
    }
  }else{
    await moveCursor("right");
  }
  return true;
}

window.DIR_UP = DIR_UP;
window.DIR_RIGHT = DIR_RIGHT;
window.DIR_DOWN = DIR_DOWN;
window.DIR_LEFT = DIR_LEFT;
window.DIR_FRONT = DIR_FRONT;
window.DIR_BACK = DIR_BACK;
window.RENDER_IMMEDIATE = RENDER_IMMEDIATE;
window.RENDER_BUFFERED = RENDER_BUFFERED;
window.cursorPos = cursorPos;
window.boardMatrix = boardMatrix;
window.ensureCells = ensureCells;
window.flushRender = flushRender;
window.setRenderMode = setRenderMode;
window.reapplyCellColors = reapplyCellColors;
window.resetData = resetData;
window.isDataEnd = isDataEnd;
window.hasMoreData = hasMoreData;
window.getNextData = getNextData;
window.getNextDataKind = getNextDataKind;
window.resetLoopGuard = resetLoopGuard;
window.canContinueLoop = canContinueLoop;
window.renderFrameAndWait = pauseRunning;
window.pauseRunning = pauseRunning;
window.updateCell = updateCell;
window.putCell = putCell;
window.getCell = getCell;
window.invertCell = invertCell;
window.isEmpty = isEmpty;
window.isUsed = isUsed;
window.isSkipZone = isSkipZone;
window.isFunctionalCell = isFunctionalCell;
window.isMoveBlocked = isMoveBlocked;
window.putNextCell = putNextCell;
window.shouldPlaceCell = shouldPlaceCell;
window.moveCursor = moveCursor;
window.turnCursor = turnCursor;
window.updateCursor = updateCursor;
window.resetCursor = resetCursor;
window.up = DIR_UP;
window.right = DIR_RIGHT;
window.down = DIR_DOWN;
window.left = DIR_LEFT;
window.u = DIR_UP;
window.r = DIR_RIGHT;
window.d = DIR_DOWN;
window.l = DIR_LEFT;

