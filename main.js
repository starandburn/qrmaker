
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
  const stepSpeed = document.getElementById("stepSpeed");
  const stepSpeedLabel = document.querySelector(".step-speed");
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
  let lastMoveBlocked = false;

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
    cellStates.set(`${r}-${c}`, { row: r, col: c, value: encodedValue, color });
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
    }
    cellStates.clear();
  }

  function setCell(row, col, value, color = "black", kind){
    const resolvedKind = (typeof kind === "number")
      ? kind
      : (typeof window.BIT_UNKNOWN === "number" ? window.BIT_UNKNOWN : 99);
    const encoded = (typeof window.encodeBit === "function")
      ? window.encodeBit(resolvedKind, value === 1)
      : (value === 1 ? Math.abs(resolvedKind) : -Math.abs(resolvedKind));
    if(renderMode === RENDER_BUFFERED){
      const r = Math.min(25, Math.max(1, row));
      const c = Math.min(25, Math.max(1, col));
      pendingCells.set(`${r}-${c}`, { row: r, col: c, value: encoded, color });
      return;
    }
    applySetCell(row, col, encoded, color);
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
  }

  function getStepDelay(){
    if(!isStepModeOn()) return 0;
    const val = Number(stepSpeed ? stepSpeed.value : STEP_DELAY_MS);
    if(Number.isNaN(val)) return 0;
    return Math.max(0, Math.min(120, val));
  }

  function reapplyCellColors(){
    if(cellStates.size === 0) return;
    for(const { row, col, value, color } of cellStates.values()){
      applySetCell(row, col, value, color);
    }
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
  window.setCell = setCell;
  window.ensureCells = ensureCells;
  window.flushRender = flushRender;
  window.setRenderMode = setRenderMode;
  window.reapplyCellColors = reapplyCellColors;
  window.clearAllCells = clearAllCells;
  window.drawFinder = drawFinder;
  window.drawAlignment = drawAlignment;
  window.drawTiming = drawTiming;
  window.drawDarkModule = drawDarkModule;
  window.drawFormat = drawFormat;
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
    const bitsSeq = (() => {
      const data = window.patternData;
      if(!data) return [];
      const ordered = ["A", "B", "C"];
      const seq = [];
      for(const key of ordered){
        const groups = data[key] || [];
        for(const g of groups){
          const baseColor = g.color
            || (g.terminator ? TERMINATOR_COLOR
            : (GROUP_COLORS[key] || "black"));
          for(const bit of g.bits){
            seq.push({ bit: Number(bit), color: baseColor });
          }
        }
      }
      return seq;
    })();

    // Start at bottom-right, facing up
    turnCursor(CARD_NORTH);

      let bitIdx = 0;
      let col = 25;
      let upward = true;
      while(col > 0 && bitIdx < bitsSeq.length){
        if(currentRun !== runId) break;
        if(col === TIMING_COL){ col--; continue; } // skip timing column
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
          if(targetCol === TIMING_COL) continue;
          if(!window.isEmpty()) continue;
          const { bit, color } = bitsSeq[bitIdx];
          setCell(cursorPos.row, cursorPos.col, bit, color || "black");
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
    const key = `${cursorPos.row}-${cursorPos.col}`;
    const entry = cellStates.get(key);
    if(!entry) return true;
    if(typeof window.isUnplacedBit === "function"){
      return window.isUnplacedBit(entry.value);
    }
    const kind = (typeof window.bitKind === "function") ? window.bitKind(entry.value) : Math.abs(entry.value);
    const unplacedKind = (typeof window.BIT_UNPLACED === "number") ? window.BIT_UNPLACED : 0;
    return kind === unplacedKind;
  };
  window.isUsed = () => {
    const key = `${cursorPos.row}-${cursorPos.col}`;
    return cellStates.has(key);
  };
  window.isTimingCell = () => {
    const { row, col } = cursorPos;
    return (row === TIMING_ROW || col === TIMING_COL) && cellStates.has(`${row}-${col}`);
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
    drawTiming(TIMING_COLOR);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawFinder(1, 1, color);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawFinder(1, 19, color);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawFinder(19, 1, color);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawAlignment(19, 19, color);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawDarkModule(color);
    if(currentRun !== undefined && currentRun !== runId) return false;
    drawFormat(0, FORMAT_COLOR);
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
    const stepActive = () => stepEnabled && isStepModeOn();
    const shouldAbort = () => (currentRun !== undefined && currentRun !== runId);
    const maybeStepDelay = async () => {
      if(shouldAbort()) return false;
      if(!stepActive()) return true;
      const delay = getStepDelay();
      if(delay > 0){
        await sleep(delay);
      }else{
        await new Promise(requestAnimationFrame);
      }
      if(shouldAbort()) return false;
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
      return !shouldAbort();
    };
    const stepCell = (row, col, value, cellColor) => {
      if(shouldAbort()) return false;
      setCell(row, col, value, cellColor);
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

    if((await moveCursorPath(1, 1)) === false) return;

    // timing (row 7, col 7)
    if((await moveCursorPath(7, 1)) === false) return;
    for(let c = 1; c <= 25; c++){
      const bit = (c % 2 === 1) ? 1 : 0;
      stepCell(7, c, bit, TIMING_COLOR);
      if((await maybeStepDelay()) === false) return;
    }
    if((await moveCursorPath(1, 7)) === false) return;
    for(let r = 1; r <= 25; r++){
      const bit = (r % 2 === 1) ? 1 : 0;
      stepCell(r, 7, bit, TIMING_COLOR);
      if((await maybeStepDelay()) === false) return;
    }

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
        if((await maybeStepDelay()) === false) return;
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
      for(const [r, c] of ring){
        if(r < 1 || r > 25 || c < 1 || c > 25) continue;
        if(!stepCell(r, c, 0, color)) return;
        if((await maybeStepDelay()) === false) return;
      }
    };
    await drawFinderStep(1, 1);
    if((await moveCursorPath(1, 19)) === false) return;
    await drawFinderStep(1, 19);
    if((await moveCursorPath(19, 1)) === false) return;
    await drawFinderStep(19, 1);

    // alignment 5x5
    if((await moveCursorPath(19, 19)) === false) return;
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
        if(!stepCell(row, col, bit, color)) return;
        if((await maybeStepDelay()) === false) return;
      }
    };
    await drawAlignmentStep(19, 19);

    // dark module
    if((await moveCursorPath(18, 9)) === false) return;
    if(!stepCell(18, 9, 1, color)) return;
    if((await maybeStepDelay()) === false) return;

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
        if(!stepCell(r + 1, c + 1, bit, FORMAT_COLOR)) return;
        if((await maybeStepDelay()) === false) return;
      }
    };
    // 左上周りを先に、右下周りを後から描く
    await drawFormatSide(coordsA);
    await drawFormatSide(coordsB);

    await moveCursorPath(25, 25);

    if(renderMode === RENDER_BUFFERED){
      flushRender();
      setRenderMode(RENDER_IMMEDIATE);
    }
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
    for(let c = 1; c <= 25; c++) add(7, c);
    for(let r = 1; r <= 25; r++) add(r, 7);
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
      setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
      if(stepEnabled){
        await drawBasePatternsStepped("red", { currentRun });
        if(currentRun !== runId){ aborted = true; return; }
      }else{
        const ok = drawBasePatterns("red", { deferFlush: false, currentRun });
        if(currentRun !== runId || !ok){ aborted = true; return; }
      }
      // re-evaluate in case step mode changed during base patterns
      stepEnabled = isStepModeOn();
      setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
      const funcSet = buildFunctionSet();
      const bitsSeq = (() => {
        const data = window.patternData;
        if(!data) return [];
        const ordered = ["A", "B", "C"];
        const seq = [];
        for(const key of ordered){
          const groups = data[key] || [];
          for(const g of groups){
            const baseColor = g.color
              || (g.terminator ? TERMINATOR_COLOR
              : (GROUP_COLORS[key] || "black"));
            for(const bit of g.bits){
              seq.push({ bit: Number(bit), color: baseColor });
            }
          }
        }
        return seq;
      })();

      // Start from current cursor position, face north
      turnCursor(CARD_NORTH);
      let bitIdx = 0;
      let col = cursorPos.col;
      let upward = cursorPos.dir !== DIR_DOWN;
      let startRow = cursorPos.row;
      while(col > 0 && bitIdx < bitsSeq.length){
        if(currentRun !== runId){ aborted = true; break; }
        if(col === TIMING_COL){ col--; continue; } // skip timing column
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
            if(cTarget === TIMING_COL) continue;
            if(cTarget < 1 || cTarget > 25) continue;
            const moved = moveCursor(row, cTarget);
            if(!moved) continue;
            if(!window.isEmpty()) continue;
            const { bit, color } = bitsSeq[bitIdx];
            setCell(cursorPos.row, cursorPos.col, bit, color || "black");
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
        for(const el of window.toggleInputs){
          el.checked = false;
        }
        if(typeof window.syncViewToggles === "function"){
          window.syncViewToggles();
        }
      }
    }finally{
      isStepFillRunning = false;
      setRenderMode(RENDER_IMMEDIATE);
    }
  });

  if(btnMask){
    btnMask.addEventListener("click", () => {
      if(isStepFillRunning) return;
      const maskFn = MASK_FUNCTIONS[0];
      if(!maskFn) return;
      const funcSet = buildFunctionSet();
      setRenderMode(RENDER_BUFFERED);
      for(let row = 1; row <= 25; row++){
        for(let col = 1; col <= 25; col++){
          if(funcSet.has(`${row}-${col}`)) continue;
          const existing = cellStates.get(`${row}-${col}`);
          const color = existing && existing.color ? existing.color : "black";
          const kind = existing && typeof window.bitKind === "function"
            ? window.bitKind(existing.value)
            : (existing ? Math.abs(existing.value) : (typeof window.BIT_UNKNOWN === "number" ? window.BIT_UNKNOWN : 99));
          const baseBit = existing
            ? ((typeof window.isBlackBit === "function") ? (window.isBlackBit(existing.value) ? 1 : 0) : (existing.value > 0 ? 1 : 0))
            : 0; // 譛ｪ驟咲ｽｮ縺ｯ逋ｽ謇ｱ縺・
          const masked = baseBit ^ (maskFn(row - 1, col - 1) ? 1 : 0);
          setCell(row, col, masked, color, kind);
        }
      }
      flushRender();
      setRenderMode(RENDER_IMMEDIATE);
    });
  }

  function drawFinder(topRow, leftCol, color = "red"){
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
        setCell(row, col, bit, color);
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
          setCell(r, c, 0, "black");
        }
      }
    }
    flushRender();
    setRenderMode(RENDER_IMMEDIATE);
  }

  function drawAlignment(centerRow, centerCol, color = "red"){
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
        setCell(row, col, bit, color);
      }
    }
    flushRender();
    setRenderMode(RENDER_IMMEDIATE);
  }

  function drawTiming(color = "red"){
    // Horizontal and vertical timing (row 7, col 7) across full grid
    setRenderMode(RENDER_BUFFERED);
    for(let c = 1; c <= 25; c++){
      const bit = (c % 2 === 1) ? 1 : 0;
      setCell(TIMING_ROW, c, bit, color);
    }
    for(let r = 1; r <= 25; r++){
      const bit = (r % 2 === 1) ? 1 : 0;
      setCell(r, TIMING_COL, bit, color);
    }
    flushRender();
    setRenderMode(RENDER_IMMEDIATE);
  }

  function drawDarkModule(color = "red"){
    // Dark module: row 18, col 9 (1-based) for version 2
    setCell(18, 9, 1, color);
  }

  function drawFormat(mask = 0, color = "red"){
    const m = Math.min(7, Math.max(0, mask));
    const bits15 = FORMAT_L[m];
    setRenderMode(RENDER_BUFFERED);
    // QR spec / old qrmaker placement (LSB-first)
    const coordsA = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],
      [8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
    ];
    const n = 25;
    const coordsB = [
      [8,n-1],[8,n-2],[8,n-3],[8,n-4],[8,n-5],[8,n-6],[8,n-7],[8,n-8],
      [n-7,8],[n-6,8],[n-5,8],[n-4,8],[n-3,8],[n-2,8],[n-1,8],
    ];
    for(let i = 0; i < 15; i++){
      const bit = (bits15 >>> i) & 1; // LSB first
      const [r1, c1] = coordsA[i];
      const [r2, c2] = coordsB[i];
      setCell(r1 + 1, c1 + 1, bit, color);
      setCell(r2 + 1, c2 + 1, bit, color);
    }
    flushRender();
    setRenderMode(RENDER_IMMEDIATE);
  }

  if(stepMode){
    stepMode.addEventListener("change", syncStepControls);
  }
  syncStepControls();

  ensureCells();
  clearAllCells();
  updateCursor(cursorPos.row, cursorPos.col, cursorPos.dir);

  const colorToggleEl = document.getElementById("toggleColor");
  if(colorToggleEl){
    colorToggleEl.addEventListener("change", () => {
      isColorEnabled = !!colorToggleEl.checked;
      reapplyCellColors();
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
      if(typeof window.fitSquare === "function"){
        requestAnimationFrame(window.fitSquare);
      }
    });
  }
})();
