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
  window.makeStepThenable = (ok = true, _options = {}) => ok;
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
const isDirectionEnabled = () => (typeof window !== "undefined" && window.useDirection === true);
let internalDirectionOverrideDepth = 0;
const withInternalDirectionOverride = (fn) => {
  internalDirectionOverrideDepth += 1;
  try{
    const result = fn();
    if(result && typeof result.then === "function"){
      return result.then(
        (value) => {
          internalDirectionOverrideDepth = Math.max(0, internalDirectionOverrideDepth - 1);
          return value;
        },
        (err) => {
          internalDirectionOverrideDepth = Math.max(0, internalDirectionOverrideDepth - 1);
          throw err;
        },
      );
    }
    internalDirectionOverrideDepth = Math.max(0, internalDirectionOverrideDepth - 1);
    return result;
  }catch(err){
    internalDirectionOverrideDepth = Math.max(0, internalDirectionOverrideDepth - 1);
    throw err;
  }
};
const shouldAllowDirectionCommands = () => internalDirectionOverrideDepth > 0;
const isDirectionAllowed = () => isDirectionEnabled() || shouldAllowDirectionCommands();

const HOME_CURSOR = { row: 1, col: 1, dir: DIR_RIGHT };
const cursorPos = {
  row: HOME_CURSOR.row,
  col: HOME_CURSOR.col,
  dir: HOME_CURSOR.dir,
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
const globalScope = (typeof window !== "undefined")
  ? window
  : ((typeof globalThis !== "undefined") ? globalThis : null);
function setTimingColIndex(value){
  const normalized = (typeof value === "number" && Number.isFinite(value) && value > 0) ? Number(value) : 0;
  timingColIndex = normalized;
  if(globalScope){
    globalScope.timingColIndex = normalized;
  }
  return normalized;
}
if(globalScope){
  globalScope.setTimingColIndex = setTimingColIndex;
}
setTimingColIndex(0);
let hasFormatPattern = false;
let lastMoveBlocked = false;
const BOARD_ROWS = 25;
const BOARD_COLS = 25;
const UNPLACED_KIND = (typeof window !== "undefined" && typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : -1;
const GENERIC_WHITE = (typeof window !== "undefined" && typeof window.BIT_WHITE === "number") ? window.BIT_WHITE : 0;
const GENERIC_BLACK = (typeof window !== "undefined" && typeof window.BIT_BLACK === "number") ? window.BIT_BLACK : 1;
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
  if(isGenericKind(kind)){
    return false;
  }
  return !isFunctionalKind(kind);
}

function isGenericKind(kind){
  return kind === GENERIC_WHITE || kind === GENERIC_BLACK;
}

const FONT5 = {
  " ": [
    "00000",
    "00000",
    "00000",
    "00000",
    "00000",
  ],
  "0": [
    "01100",
    "10010",
    "10110",
    "11010",
    "01100",
  ],
  "1": [
    "01000",
    "11000",
    "01000",
    "01000",
    "11100",
  ],
  "2": [
    "11100",
    "00010",
    "01100",
    "10000",
    "11110",
  ],
  "3": [
    "11100",
    "00010",
    "01100",
    "00010",
    "11100",
  ],
  "4": [
    "10010",
    "10010",
    "11110",
    "00010",
    "00010",
  ],
  "5": [
    "11110",
    "10000",
    "11100",
    "00010",
    "11100",
  ],
  "6": [
    "01110",
    "10000",
    "11100",
    "10010",
    "11100",
  ],
  "7": [
    "11110",
    "00010",
    "00100",
    "01000",
    "01000",
  ],
  "8": [
    "01100",
    "10010",
    "01100",
    "10010",
    "01100",
  ],
  "9": [
    "11100",
    "10010",
    "11110",
    "00010",
    "11100",
  ],
  "A": [
    "01100",
    "10010",
    "11110",
    "10010",
    "10010",
  ],
  "B": [
    "11100",
    "10010",
    "11100",
    "10010",
    "11100",
  ],
  "C": [
    "01110",
    "10000",
    "10000",
    "10000",
    "01110",
  ],
  "D": [
    "11100",
    "10010",
    "10010",
    "10010",
    "11100",
  ],
  "E": [
    "11110",
    "10000",
    "11100",
    "10000",
    "11110",
  ],
  "F": [
    "11110",
    "10000",
    "11100",
    "10000",
    "10000",
  ],
  "G": [
    "01110",
    "10000",
    "10110",
    "10010",
    "01110",
  ],
  "H": [
    "10010",
    "10010",
    "11110",
    "10010",
    "10010",
  ],
  "I": [
    "11110",
    "00100",
    "00100",
    "00100",
    "11110",
  ],
  "J": [
    "00010",
    "00010",
    "00010",
    "10010",
    "01100",
  ],
  "K": [
    "10010",
    "10100",
    "11000",
    "10100",
    "10010",
  ],
  "L": [
    "10000",
    "10000",
    "10000",
    "10000",
    "11110",
  ],
  "M": [
    "10010",
    "11110",
    "10110",
    "10010",
    "10010",
  ],
  "N": [
    "10010",
    "11010",
    "10110",
    "10010",
    "10010",
  ],
  "O": [
    "01100",
    "10010",
    "10010",
    "10010",
    "01100",
  ],
  "P": [
    "11100",
    "10010",
    "11100",
    "10000",
    "10000",
  ],
  "Q": [
    "01100",
    "10010",
    "10010",
    "10110",
    "01110",
  ],
  "R": [
    "11100",
    "10010",
    "11100",
    "10100",
    "10010",
  ],
  "S": [
    "01110",
    "10000",
    "01100",
    "00010",
    "11100",
  ],
  "T": [
    "11110",
    "00100",
    "00100",
    "00100",
    "00100",
  ],
  "U": [
    "10010",
    "10010",
    "10010",
    "10010",
    "01100",
  ],
  "V": [
    "10010",
    "10010",
    "10010",
    "01100",
    "01000",
  ],
  "W": [
    "10001",
    "10001",
    "10101",
    "10101",
    "01010",
  ],
  "X": [
    "10010",
    "01010",
    "00100",
    "01010",
    "10010",
  ],
  "Y": [
    "10010",
    "01010",
    "00100",
    "00100",
    "00100",
  ],
  "Z": [
    "11110",
    "00010",
    "00100",
    "01000",
    "11110",
  ],
  "a": [
    "01100",
    "00010",
    "01100",
    "10010",
    "01100",
  ],
  "b": [
    "10000",
    "10000",
    "11100",
    "10010",
    "11100",
  ],
  "c": [
    "01100",
    "10000",
    "10000",
    "10000",
    "01100",
  ],
  "d": [
    "00010",
    "00010",
    "01110",
    "10010",
    "01110",
  ],
  "e": [
    "01100",
    "10010",
    "11110",
    "10000",
    "01100",
  ],
  "f": [
    "01100",
    "10000",
    "11100",
    "10000",
    "10000",
  ],
  "g": [
    "01110",
    "10010",
    "01110",
    "00010",
    "11100",
  ],
  "h": [
    "10000",
    "10000",
    "11100",
    "10010",
    "10010",
  ],
  "i": [
    "01000",
    "00000",
    "11000",
    "01000",
    "11100",
  ],
  "j": [
    "00100",
    "00000",
    "00100",
    "10100",
    "01000",
  ],
  "k": [
    "10000",
    "10010",
    "11000",
    "10010",
    "10010",
  ],
  "l": [
    "11000",
    "01000",
    "01000",
    "01000",
    "11100",
  ],
  "m": [
    "00000",
    "11100",
    "10110",
    "10110",
    "10110",
  ],
  "n": [
    "00000",
    "11100",
    "10010",
    "10010",
    "10010",
  ],
  "o": [
    "00000",
    "01100",
    "10010",
    "10010",
    "01100",
  ],
  "p": [
    "00000",
    "11100",
    "10010",
    "11100",
    "10000",
  ],
  "q": [
    "01110",
    "10010",
    "01110",
    "00010",
    "00010",
  ],
  "r": [
    "00000",
    "11100",
    "10010",
    "10000",
    "10000",
  ],
  "s": [
    "00000",
    "01110",
    "11000",
    "00110",
    "11100",
  ],
  "t": [
    "10000",
    "11100",
    "10000",
    "10000",
    "01100",
  ],
  "u": [
    "00000",
    "10010",
    "10010",
    "10010",
    "01100",
  ],
  "v": [
    "00000",
    "10010",
    "10010",
    "01100",
    "01000",
  ],
  "w": [
    "00000",
    "10010",
    "10010",
    "10110",
    "01010",
  ],
  "x": [
    "00000",
    "10010",
    "01100",
    "01100",
    "10010",
  ],
  "y": [
    "10010",
    "10010",
    "01110",
    "00010",
    "11100",
  ],
  "z": [
    "11110",
    "00100",
    "01000",
    "10000",
    "11110",
  ],
  "!": [
    "00100",
    "00100",
    "00100",
    "00000",
    "00100",
  ],
  "\"": [
    "01010",
    "01010",
    "00000",
    "00000",
    "00000",
  ],
  "#": [
    "01010",
    "11110",
    "01010",
    "11110",
    "01010",
  ],
  "$": [
    "01110",
    "10100",
    "01110",
    "00110",
    "01110",
  ],
  "%": [
    "11010",
    "11000",
    "00100",
    "01010",
    "10010",
  ],
  "&": [
    "01100",
    "10010",
    "01100",
    "10010",
    "01100",
  ],
  "'": [
    "00100",
    "00100",
    "00000",
    "00000",
    "00000",
  ],
  "(": [
    "00010",
    "00100",
    "00100",
    "00100",
    "00010",
  ],
  ")": [
    "01000",
    "00100",
    "00100",
    "00100",
    "01000",
  ],
  "*": [
    "00100",
    "10100",
    "01110",
    "10100",
    "00100",
  ],
  "+": [
    "00000",
    "00100",
    "01110",
    "00100",
    "00000",
  ],
  ",": [
    "00000",
    "00000",
    "00000",
    "00100",
    "01000",
  ],
  "-": [
    "00000",
    "00000",
    "01110",
    "00000",
    "00000",
  ],
  ".": [
    "00000",
    "00000",
    "00000",
    "00100",
    "00000",
  ],
  "/": [
    "00010",
    "00100",
    "01000",
    "10000",
    "00000",
  ],
  ":": [
    "00000",
    "00100",
    "00000",
    "00100",
    "00000",
  ],
  ";": [
    "00000",
    "00100",
    "00000",
    "00100",
    "01000",
  ],
  "<": [
    "00010",
    "00100",
    "01000",
    "00100",
    "00010",
  ],
  "=": [
    "00000",
    "01110",
    "00000",
    "01110",
    "00000",
  ],
  ">": [
    "01000",
    "00100",
    "00010",
    "00100",
    "01000",
  ],
  "?": [
    "01110",
    "00010",
    "00100",
    "00000",
    "00100",
  ],
  "@": [
    "01110",
    "10010",
    "10110",
    "10100",
    "01110",
  ],
  "[": [
    "01110",
    "01000",
    "01000",
    "01000",
    "01110",
  ],
  "\\": [
    "10000",
    "01000",
    "00100",
    "00010",
    "00010",
  ],
  "]": [
    "01110",
    "00010",
    "00010",
    "00010",
    "01110",
  ],
  "^": [
    "00100",
    "01010",
    "10010",
    "00000",
    "00000",
  ],
  "_": [
    "00000",
    "00000",
    "00000",
    "00000",
    "11110",
  ],
  "`": [
    "01000",
    "00100",
    "00000",
    "00000",
    "00000",
  ],
  "{": [
    "00010",
    "00100",
    "01100",
    "00100",
    "00010",
  ],
  "|": [
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
  ],
  "}": [
    "01000",
    "00100",
    "00110",
    "00100",
    "01000",
  ],
  "~": [
    "00000",
    "01010",
    "10110",
    "00000",
    "00000",
  ],
};

const LOOP_ITER_LIMIT = BOARD_ROWS * BOARD_COLS;
const LOOP_STAGNANT_LIMIT = Math.max(BOARD_ROWS, BOARD_COLS);
const LOOP_OCCUPIED_LIMIT = (BOARD_ROWS + BOARD_COLS) * 2;
let loopGuardCounter = 0;
let loopStagnantCounter = 0;
let loopOccupiedCounter = 0;
let loopStagnantPosition = `${cursorPos.row}-${cursorPos.col}`;
let loopStopLogged = false;
const getCursorPositionKey = () => `${cursorPos.row}-${cursorPos.col}`;
function resetLoopGuard(){
  loopGuardCounter = 0;
  loopStagnantCounter = 0;
  loopOccupiedCounter = 0;
  loopStagnantPosition = getCursorPositionKey();
  loopStopLogged = false;
}
function recordLoopOccupiedTarget(row, col){
  if(!Number.isInteger(row) || !Number.isInteger(col)) return;
  const isUnplaced = isBoardCellUnplaced(row, col);
  if(isUnplaced){
    loopOccupiedCounter = 0;
  }else{
    loopOccupiedCounter++;
  }
}
function canContinueLoop(){
  loopGuardCounter++;
  const currentPosition = getCursorPositionKey();
  if(currentPosition === loopStagnantPosition){
    loopStagnantCounter++;
  }else{
    loopStagnantPosition = currentPosition;
    loopStagnantCounter = 0;
  }
  const canContinue = loopGuardCounter <= LOOP_ITER_LIMIT
    && loopStagnantCounter <= LOOP_STAGNANT_LIMIT
    && loopOccupiedCounter <= LOOP_OCCUPIED_LIMIT;
  if(!canContinue && !loopStopLogged){
    loopStopLogged = true;
    const detail = "canContinueLoopの上限に達したため停止";
    if(typeof window !== "undefined"){
      if(typeof window.logEvent === "function"){
        window.logEvent("canContinueLoop", "", detail);
      }
      if(typeof window.setExecutionStatus === "function"){
        window.setExecutionStatus("stopped", undefined, detail);
      }
    }
  }
  return canContinue;
}

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
const DEFAULT_STEP_ANIMATION_DURATION_MS = 250;
let stepHighlightExpiresAt = 0;
let pendingResetTimer = null;
let cursorHighlightActive = false;
let suppressStepPlacementAnimation = false;
function isStepPlacementAnimationEnabled(){
  if(typeof window !== "undefined" && typeof window.stepAnimationEnabled === "boolean"){
    return window.stepAnimationEnabled;
  }
  return true;
}
function getStepAnimationDurationMs(){
  if(typeof window !== "undefined"){
    const raw = window.stepAnimationDurationMs;
    if(typeof raw === "number" && Number.isFinite(raw)){
      return Math.max(0, raw);
    }
  }
  return DEFAULT_STEP_ANIMATION_DURATION_MS;
}

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

function shouldAnimatePlacement(kind, allowGenericData = false){
  if(!isStepModeActive()) return false;
  if(!isStepPlacementAnimationEnabled()) return false;
  if(isMaskApplying()) return false;
  if(typeof window !== "undefined" && window.isDrawingBasePattern && isStepModeDataOnly()){
    return false;
  }
  if(isStepModeDataOnly()){
    if(typeof kind === "number"){
      if(isDataKind(kind)) return true;
      return allowGenericData && isGenericKind(kind);
    }
    return false;
  }
  return true;
}

function highlightCursorForStepPutCell(kind, allowGenericData = false){
  if(!shouldAnimatePlacement(kind, allowGenericData)) return;
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
    cell.classList.remove("cell-step-put");
    delete cell.dataset.stepZResetTimer;
  }, getStepAnimationDurationMs());
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

function animateCellPlacementAt(row, col, kind, allowGenericData = false){
  if(!shouldAnimatePlacement(kind, allowGenericData)) return;
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

  const directionAllowed = isDirectionAllowed();
  const angle = isDirectionEnabled()
    ? (dir === DIR_RIGHT ? 90
      : dir === DIR_DOWN ? 180
      : dir === DIR_LEFT ? 270
      : 0)
    : 0;

  cursor.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
}

function updateCursor(row = cursorPos.row, col = cursorPos.col, dir = cursorPos.dir){
  if(row < 1 || row > BOARD_ROWS || col < 1 || col > BOARD_COLS) return false;
  const directionAllowed = isDirectionAllowed();
  const nextDir = directionAllowed ? dir : cursorPos.dir;
  const r = row;
  const c = col;
  cursorPos.row = r;
  cursorPos.col = c;
  cursorPos.dir = nextDir;
  if(renderMode === RENDER_BUFFERED){
    pendingCursor = { row: r, col: c, dir: nextDir };
    if(!(typeof window !== "undefined" && window.suppressCursorUpdates)
      && typeof window.updateExecutionStatusCursor === "function"){
      window.updateExecutionStatusCursor();
    }
    return true;
  }
  applyCursor(r, c, nextDir);
  if(!(typeof window !== "undefined" && window.suppressCursorUpdates)
    && typeof window.updateExecutionStatusCursor === "function"){
    window.updateExecutionStatusCursor();
  }
  return true;
}

function resetCursor(){
  const ok = updateCursor(HOME_CURSOR.row, HOME_CURSOR.col, HOME_CURSOR.dir);
  if(ok && !(typeof window !== "undefined" && window.suppressCursorUpdates)
    && typeof window.logEvent === "function"){
    const payload = {
      target: { row: HOME_CURSOR.row, col: HOME_CURSOR.col },
      dir: HOME_CURSOR.dir,
    };
    const cellRef = cellRefFromRowCol(HOME_CURSOR.row, HOME_CURSOR.col);
    const refLabel = cellRef ? cellRef.toUpperCase() : "";
    const coordsLabel = "(" + HOME_CURSOR.row + ", " + HOME_CURSOR.col + ")";
    window.logEvent("resetCursor", JSON.stringify(payload), "カーソルを" + refLabel + coordsLabel + "に移動");
    if(isDirectionEnabled()){
      const directionLabels = { up: "上", right: "右", down: "下", left: "左" };
      const label = directionLabels[HOME_CURSOR.dir] || "";
      if(label){
        window.logEvent("setCursorDirection", JSON.stringify({ dir: HOME_CURSOR.dir }), "向きを" + label + "に設定");
      }
    }
  }
  return ok;
}

function setHomeCursor({ row, col, dir } = {}){
  if(typeof row === "number" && Number.isFinite(row) && row > 0){
    HOME_CURSOR.row = row;
  }
  if(typeof col === "number" && Number.isFinite(col) && col > 0){
    HOME_CURSOR.col = col;
  }
  const normalized = typeof dir === "string" ? normalizeDir(dir) : null;
  if(normalized){
    HOME_CURSOR.dir = normalized;
  }
}

function moveCursor(...args){
  const directionEnabled = isDirectionEnabled();
  if(!directionEnabled && !shouldAllowDirectionCommands()){
    if(args.length === 0){
      // allow default move in directionless mode
    }
    for(const arg of args){
      if(typeof arg !== "string") continue;
      const trimmedArg = arg.trim();
      const unquoted = trimmedArg.replace(/^["'](.+)["']$/, "$1");
      const lower = unquoted.toLowerCase();
      if(lower === DIR_FRONT || lower === DIR_BACK){
        throw new Error(`Direction commands are disabled (useDirection=false): move ${lower}`);
      }
    }
  }
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
      recordLoopOccupiedTarget(cursorPos.row, cursorPos.col);
    }
    targetRow = cursorPos.row;
    targetCol = cursorPos.col;
    return true;
  };

  if(args.length === 0){
    if(directionEnabled || shouldAllowDirectionCommands()){
      recordRelativeMove("front");
      scheduleRelativeMove(cursorPos.dir);
    }else{
      if(cursorPos.col < BOARD_COLS){
        targetRow = cursorPos.row;
        targetCol = cursorPos.col + 1;
      }else if(cursorPos.row < BOARD_ROWS){
        targetRow = cursorPos.row + 1;
        targetCol = 1;
      }else{
        targetRow = 1;
        targetCol = 1;
      }
      recordStraightMove();
    }
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
      if(!directionEnabled) return;
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
      recordLoopOccupiedTarget(targetRow, targetCol);
    }
  if(logLabel && logPositionOnly){
    const payload = {
      args,
      target: { row: targetRow, col: targetCol },
      dir: finalDir,
    };
    if(typeof window.logEvent === "function"){
      const cellRef = cellRefFromRowCol(targetRow, targetCol);
      const refLabel = cellRef ? cellRef.toUpperCase() : "";
      const coordsLabel = "(" + targetRow + ", " + targetCol + ")";
      const description = "カーソルを" + refLabel + coordsLabel + "に移動";
      window.logEvent("moveCursor", JSON.stringify(payload), description);
      if(isDirectionEnabled()){
        const directionLabels = { up: "上", right: "右", down: "下", left: "左" };
        const label = directionLabels[finalDir] || "";
        if(label){
          window.logEvent("setCursorDirection", JSON.stringify({ dir: finalDir }), "向きを" + label + "に設定");
        }
      }
    }
  }
  resetCursorColorAfterStepMove();
  lastMoveBlocked = false;
  return callMakeStepThenable();
}

function callMakeStepThenable(options = {}){
  if(typeof window.makeStepThenable === "function"){
    return window.makeStepThenable(true, options);
  }
  return true;
}

function makeStepResult(value, options = {}){
  const wait = callMakeStepThenable(options);
  if(wait && typeof wait.then === "function"){
    return {
      then: (resolve, reject) => wait.then(() => resolve(value), reject),
      catch: (fn) => wait.catch(fn),
      valueOf: () => value,
      toString: () => String(value),
    };
  }
  return value;
}

function turnCursor(dirArg){
  if(!isDirectionEnabled() && !shouldAllowDirectionCommands()){
    throw new Error("Direction commands are disabled (useDirection=false): turn");
  }
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

function applySetCell(row, col, encodedValue, color = "black", allowGenericData = false){
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
  const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : -1;
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
  animateCellPlacementAt(r, c, kind, allowGenericData);
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
    for(const { row, col, value, color, allowGenericData } of pendingCells.values()){
      applySetCell(row, col, value, color, Boolean(allowGenericData));
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

const getPauseAbortVersion = () => {
  if(typeof window === "undefined") return 0;
  const current = window.__pauseAbortVersion;
  return Number.isFinite(current) ? current : 0;
};

const sleepWithAbort = async (ms, version) => {
  let remaining = Math.max(0, ms);
  while(remaining > 0){
    if(getPauseAbortVersion() !== version){
      throw ABORT_ERR;
    }
    const chunk = Math.min(50, remaining);
    await sleep(chunk);
    remaining -= chunk;
  }
  if(getPauseAbortVersion() !== version){
    throw ABORT_ERR;
  }
};

const parseDelayMsValue = (value) => {
  if(typeof value === "string"){
    const trimmed = value.trim().toLowerCase();
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(ms|s)?$/);
    if(match){
      const amount = Number(match[1]);
      if(Number.isFinite(amount)){
        return match[2] === "s" ? amount * 1000 : amount;
      }
    }
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const resolvePauseDelayArg = (value) => {
  if(value === null || value === undefined){
    return 60;
  }
  if(typeof value === "object"){
    if("delayMs" in value){
      return value.delayMs === undefined ? 60 : value.delayMs;
    }
    return 60;
  }
  return value;
};

async function pauseRunning(arg = {}){
  flushRender();
  const delayCandidate = resolvePauseDelayArg(arg);
  const parsed = parseDelayMsValue(delayCandidate);
  if(parsed === null || parsed <= 0) return;
  const version = getPauseAbortVersion();
  await sleepWithAbort(parsed, version);
}

function colorsForKind(kind){
  const map = {
    [GENERIC_WHITE]:       "white",
    [GENERIC_BLACK]:       "black",
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
let dataPatternLogActive = false;
let dataPatternLogCompleted = false;
function resetData(){
  dataSeq = buildBitSequence();
  dataSeqIndex = 0;
  dataPatternLogActive = false;
  dataPatternLogCompleted = false;
}
function encodeBitPair(kind, bit){
  if(typeof window.encodeBit === "function"){
    return window.encodeBit(kind, bit === 1);
  }
  return bit === 1 ? Math.abs(kind) : -Math.abs(kind || 0);
}
function hasMoreData(){
  const hasData = Array.isArray(dataSeq) && dataSeqIndex < dataSeq.length;
  if(typeof window !== "undefined" && window.suppressDataPatternLog){
    return hasData;
  }
  if(!dataPatternLogActive && hasData && dataSeqIndex === 0){
    if(typeof window !== "undefined" && typeof window.logEvent === "function"){
      window.logEvent("DrawDataPatterns", "", "データパターンの描画開始");
    }
    dataPatternLogActive = true;
    dataPatternLogCompleted = false;
  }
  if(dataPatternLogActive && !hasData && !dataPatternLogCompleted){
    if(typeof window !== "undefined" && typeof window.logEvent === "function"){
      window.logEvent("DrawDataPatterns", "", "データパターンの描画終了");
    }
    dataPatternLogCompleted = true;
    dataPatternLogActive = false;
  }
  return hasData;
}
function getNextData(){
  if(!hasMoreData()){
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

function getNextDataInfo(){
  if(!Array.isArray(dataSeq) || dataSeqIndex >= dataSeq.length) return null;
  const entry = dataSeq[dataSeqIndex];
  if(!entry || typeof entry.kind !== "number" || typeof entry.bit !== "number") return null;
  return { kind: entry.kind, bit: entry.bit };
}

function getNextDataInfos(count = 4){
  if(!Array.isArray(dataSeq) || dataSeqIndex >= dataSeq.length) return [];
  const total = Math.max(0, Math.min(count, dataSeq.length - dataSeqIndex));
  const infos = [];
  for(let i = 0; i < total; i++){
    const entry = dataSeq[dataSeqIndex + i];
    if(!entry || typeof entry.kind !== "number" || typeof entry.bit !== "number") continue;
    infos.push({ kind: entry.kind, bit: entry.bit });
  }
  return infos;
}

function reapplyCellColors(){
  if(cellStates.size === 0) return;
  const prevTimingRow = timingRowIndex;
  const prevTimingCol = timingColIndex;
  withStepPlacementSuppressed(() => {
    for(const { row, col, value, color } of cellStates.values()){
      applySetCell(row, col, value, color);
    }
  });
  timingRowIndex = prevTimingRow;
  setTimingColIndex(prevTimingCol);
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

function updateCell(row, col, encodedValue, options = null){
  if(row < 1 || row > BOARD_ROWS || col < 1 || col > BOARD_COLS) return false;
  const r = row;
  const c = col;
  const kind = (typeof window.bitKind === "function") ? window.bitKind(encodedValue) : Math.abs(encodedValue);
  const colorEntry = colorsForKind(kind);
  const color = colorEntry || "black";
  const allowGenericData = Boolean(options && options.treatGenericAsData);
  if(renderMode === RENDER_BUFFERED){
    pendingCells.set(`${r}-${c}`, { row: r, col: c, value: encodedValue, color, allowGenericData });
  }else{
    applySetCell(r, c, encodedValue, color, allowGenericData);
  }
  boardMatrix[r - 1][c - 1] = encodedValue;
  return true;
}

function putCell(encodedValue){
  let val = encodedValue;
  let usedAuto = false;
  const treatGenericAsData = (val === 0 || val === 1);
  if(val === undefined){
    val = 1;
  }
  if(val === -1){
    val = UNPLACED_KIND;
  }else if(val === 0 || val === 1){
    val = (val === 1) ? GENERIC_BLACK : GENERIC_WHITE;
  }
  const skipExisting = Boolean(window.skipExistingCells);
  if(skipExisting && typeof window.isEmpty === "function" && !window.isEmpty()){
    if(usedAuto && dataSeqIndex > 0){
      dataSeqIndex = Math.max(0, dataSeqIndex - 1);
    }
    return makeStepResult(false, { scale: 0.5 });
  }
  if(!Number.isFinite(val)) return false;
  const valKind = (typeof window.bitKind === "function") ? window.bitKind(val) : Math.abs(val);
  const ok = window.updateCell(
    cursorPos.row,
    cursorPos.col,
    val,
    treatGenericAsData ? { treatGenericAsData: true } : null,
  );
  if(!ok && usedAuto && dataSeqIndex > 0){
    dataSeqIndex = Math.max(0, dataSeqIndex - 1);
  }
  if(ok){
    highlightCursorForStepPutCell(valKind, treatGenericAsData);
    if(isDataKind(valKind) && typeof window !== "undefined" && typeof window.updateDataPatternStatus === "function"){
      window.updateDataPatternStatus(valKind);
    }
    if(typeof window !== "undefined"
      && typeof window.isStepModeOn === "function"
      && window.isStepModeOn()
      && typeof window.logEvent === "function"){
      const isBlack = (typeof window.isBlackBit === "function") ? window.isBlackBit(val) : val > 0;
      const colorLabel = isBlack ? "黒" : "白";
      const cellRef = cellRefFromRowCol(cursorPos.row, cursorPos.col);
      const refLabel = cellRef ? cellRef.toUpperCase() : "";
      const coordsLabel = "(" + cursorPos.row + ", " + cursorPos.col + ")";
      window.logEvent("putCell", "", refLabel + coordsLabel + "に" + colorLabel + "を配置");
    }
  }
  const waitOptions = ok ? {} : { scale: 0.5 };
  return makeStepResult(ok, waitOptions);
}

const getTextInputValue = () => {
  if(typeof document === "undefined") return "";
  const input = document.getElementById("txtInput");
  if(!input) return "";
  return (typeof input.value === "string") ? input.value : String(input.value ?? "");
};

const resolveFontGlyph = (ch) => {
  const raw = (typeof ch === "string") ? ch : String(ch ?? "");
  if(!raw || raw.length === 0){
    throw new Error("drawText requires a character");
  }
  const first = raw.charAt(0);
  const code = first.charCodeAt(0);
  if(code > 0x7F){
    throw new Error(`Non-ASCII char: ${first}`);
  }
  const directGlyph = FONT5[first];
  if(directGlyph){
    return directGlyph;
  }
  const fallbackKey = first.toUpperCase();
  const glyph = FONT5[fallbackKey];
  if(!glyph){
    throw new Error(`Unsupported char: ${first}`);
  }
  return glyph;
};

const renderChar5x5 = (glyph, row, col, drawValue) => {
  for(let r = 0; r < 5; r++){
    const rowPattern = glyph[r];
    if(typeof rowPattern !== "string") continue;
    for(let c = 0; c < 5; c++){
      if(rowPattern[c] !== "1") continue;
      const targetRow = row + r;
      const targetCol = col + c;
      if(targetRow < 1 || targetRow > BOARD_ROWS || targetCol < 1 || targetCol > BOARD_COLS){
        continue;
      }
      updateCell(targetRow, targetCol, drawValue, { treatGenericAsData: true });
    }
  }
};

function drawText(text){
  const raw = (text === undefined) ? getTextInputValue() : String(text ?? "");
  if(!raw){
    return makeStepResult(true);
  }
  const drawTextSettings = (typeof window !== "undefined"
    && window.appSettings
    && window.appSettings.defaults
    && window.appSettings.defaults.drawText)
    ? window.appSettings.defaults.drawText
    : null;
  const forceUppercase = (drawTextSettings && typeof drawTextSettings.forceUppercase === "boolean")
    ? drawTextSettings.forceUppercase
    : true;
  const skipNonAlnum = (drawTextSettings && typeof drawTextSettings.skipNonAlnum === "boolean")
    ? drawTextSettings.skipNonAlnum
    : true;
  let normalized = raw;
  if(forceUppercase){
    normalized = normalized.toUpperCase();
  }
  if(skipNonAlnum){
    const filter = forceUppercase ? /[^A-Z0-9]/g : /[^A-Za-z0-9]/g;
    normalized = normalized.replace(filter, "");
  }
  if(!normalized){
    return makeStepResult(true);
  }
  let scanRow = cursorPos.row;
  let scanCol = cursorPos.col;
  let lastRow = scanRow;
  let lastCol = scanCol;
  let drawn = 0;
  let stepChain = null;
  const enqueueStep = (fn) => {
    if(stepChain){
      stepChain = stepChain.then(fn);
      return;
    }
    const result = fn();
    if(result && typeof result.then === "function"){
      stepChain = result;
    }
  };
  const advanceScanPos = (row, col) => {
    let nextRow = row;
    let nextCol = col + 1;
    if(nextCol > BOARD_COLS){
      nextCol = 1;
      nextRow += 1;
    }
    return { row: nextRow, col: nextCol };
  };
  const canPlaceAt = (row, col) => {
    if(row + 4 > BOARD_ROWS || col + 4 > BOARD_COLS) return false;
    for(let r = 0; r < 5; r++){
      for(let c = 0; c < 5; c++){
        if(!isBoardCellUnplaced(row + r, col + c)) return false;
      }
    }
    return true;
  };
  const blackValue = GENERIC_BLACK;
  const whiteValue = GENERIC_WHITE;
  for(let i = 0; i < normalized.length; i++){
    let foundRow = null;
    let foundCol = null;
    let probeRow = scanRow;
    let probeCol = scanCol;
    for(let step = 0; step < BOARD_ROWS * BOARD_COLS; step++){
      if(probeRow > BOARD_ROWS) break;
      enqueueStep(() => {
        updateCursor(probeRow, probeCol, cursorPos.dir);
        return callMakeStepThenable();
      });
      if(canPlaceAt(probeRow, probeCol)){
        foundRow = probeRow;
        foundCol = probeCol;
        break;
      }
      const next = advanceScanPos(probeRow, probeCol);
      probeRow = next.row;
      probeCol = next.col;
    }
    if(foundRow === null || foundCol === null){
      break;
    }
    const glyph = resolveFontGlyph(normalized.charAt(i));
    for(let r = 0; r < 5; r++){
      const rowPattern = (typeof glyph[r] === "string") ? glyph[r] : "00000";
      for(let c = 0; c < 5; c++){
        const targetRow = foundRow + r;
        const targetCol = foundCol + c;
        if(targetRow < 1 || targetRow > BOARD_ROWS || targetCol < 1 || targetCol > BOARD_COLS){
          continue;
        }
        const shouldDraw = rowPattern[c] === "1";
        const cellValue = shouldDraw ? blackValue : whiteValue;
        enqueueStep(() => {
          updateCursor(targetRow, targetCol, cursorPos.dir);
          updateCell(targetRow, targetCol, cellValue, { treatGenericAsData: true });
          return callMakeStepThenable();
        });
      }
    }
    lastRow = foundRow;
    lastCol = foundCol;
    scanRow = foundRow;
    scanCol = foundCol + 5;
    if(scanCol > BOARD_COLS){
      scanCol = 1;
      scanRow = foundRow + 5;
    }
    drawn += 1;
  }
  if(drawn > 0){
    const targetRow = lastRow + 5;
    const targetCol = 1;
    const finalizeCursor = () => {
      if(targetRow + 4 <= BOARD_ROWS){
        updateCursor(targetRow, targetCol, cursorPos.dir);
      }else{
        updateCursor(lastRow, lastCol, cursorPos.dir);
      }
      return true;
    };
    if(stepChain){
      stepChain = stepChain.then(finalizeCursor);
      return stepChain;
    }
    finalizeCursor();
  }
  return makeStepResult(true);
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

window.DIR_UP = DIR_UP;
window.DIR_RIGHT = DIR_RIGHT;
window.DIR_DOWN = DIR_DOWN;
window.DIR_LEFT = DIR_LEFT;
window.DIR_FRONT = DIR_FRONT;
window.DIR_BACK = DIR_BACK;
window.RENDER_IMMEDIATE = RENDER_IMMEDIATE;
window.RENDER_BUFFERED = RENDER_BUFFERED;
window.STEP_DELAY_MS = STEP_DELAY_MS;
window.RESET_DELAY_MS = RESET_DELAY_MS;
window.ABORT_ERR = ABORT_ERR;
window.cursorPos = cursorPos;
window.boardMatrix = boardMatrix;
window.ensureCells = ensureCells;
window.flushRender = flushRender;
window.setRenderMode = setRenderMode;
window.reapplyCellColors = reapplyCellColors;
window.resetData = resetData;
window.hasMoreData = hasMoreData;
window.getNextData = getNextData;
window.getNextDataKind = getNextDataKind;
window.getNextDataInfo = getNextDataInfo;
window.getNextDataInfos = getNextDataInfos;
window.resetLoopGuard = resetLoopGuard;
window.canContinueLoop = canContinueLoop;
window.pauseRunning = pauseRunning;
window.updateCell = updateCell;
window.putCell = putCell;
window.drawText = drawText;
window.getCell = getCell;
window.invertCell = invertCell;
window.isEmpty = isEmpty;
window.isSkipZone = isSkipZone;
window.isFunctionalCell = isFunctionalCell;
window.isMoveBlocked = isMoveBlocked;
window.shouldPlaceCell = shouldPlaceCell;
window.moveCursor = moveCursor;
window.turnCursor = turnCursor;
window.updateCursor = updateCursor;
window.resetCursor = resetCursor;
window.setHomeCursor = setHomeCursor;
