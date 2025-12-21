// メイン動作用の簡易テストスクリプト

(function(){
  const btnGenerate = document.getElementById("btnGenerate");
  const btnInit = document.getElementById("btnInit");
  const btnPatternFill = document.getElementById("btnPatternFill");
  const btnMask = document.getElementById("btnMask");
  const stepMode = document.getElementById("stepMode");
  if(!btnGenerate || !btnInit) return;

  const DIR_UP = "up";
  const DIR_RIGHT = "right";
  const DIR_DOWN = "down";
  const DIR_LEFT = "left";
  const RENDER_IMMEDIATE = "immediate";
  const RENDER_BUFFERED = "buffered";
  const STEP_DELAY_MS = 12;

  const cursorPos = {
    row: 3,
    col: 2,
    dir: DIR_DOWN,
  };
  const pendingCells = new Map();
  const cellStates = new Map(); // key: "r-c", value: { row, col, value, color }
  let isColorEnabled = true;
  const COLORS = ["black", "red", "blue", "green", "yellow", "purple"];
  const GROUP_COLORS = { A: "blue", B: "black", C: "green" };
  const TERMINATOR_COLOR = "yellow";
  const PADDING_COLOR = "purple";
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

  function ensureCells(){
    const gridArea = document.querySelector(".grid-area");
    const cells = gridArea?.querySelector(".qr-cells");
    if(!gridArea || !cells) return;
    if(cells.childElementCount === 25 * 25) return;
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
    const r = Math.min(25, Math.max(1, row));
    const c = Math.min(25, Math.max(1, col));
    cursorPos.row = r;
    cursorPos.col = c;
    cursorPos.dir = dir;
    if(renderMode === RENDER_BUFFERED){
      pendingCursor = { row: r, col: c, dir };
      return;
    }
    applyCursor(r, c, dir);
  }

  function applySetCell(row, col, value, color = "black"){
    ensureCells();
    const cells = document.querySelectorAll(".qr-cells .cell");
    if(!cells || cells.length === 0) return;
    const r = Math.min(25, Math.max(1, row));
    const c = Math.min(25, Math.max(1, col));
    const idx = (r - 1) * 25 + (c - 1);
    const cell = cells[idx];
    if(!cell) return;
    const finalColor = isColorEnabled ? color : "black";
    cell.className = "cell";
    if(value === 1){
      cell.classList.add("state-1");
    }else if(value === 0){
      cell.classList.add("state-0");
    }
    cell.classList.add(`col-${finalColor}`);
    cellStates.set(`${r}-${c}`, { row: r, col: c, value, color });
    const cursor = document.querySelector(".qr-cursor");
    if(cursor){
      cursor.classList.add("is-set");
      cursor.style.setProperty("--cursor-color", "#1b66ff");
      cursor.style.borderColor = "#1b66ff";
    }
  }

  function clearAllCells(){
    ensureCells();
    const cells = document.querySelectorAll(".qr-cells .cell");
    if(!cells || cells.length === 0) return;
    for(const cell of cells){
      cell.className = "cell";
    }
    cellStates.clear();
  }

  function setCell(row, col, value, color = "black"){
    if(renderMode === RENDER_BUFFERED){
      const r = Math.min(25, Math.max(1, row));
      const c = Math.min(25, Math.max(1, col));
      pendingCells.set(`${r}-${c}`, { row: r, col: c, value, color });
      return;
    }
    applySetCell(row, col, value, color);
  }

  function flushRender(){
    if(renderMode !== RENDER_BUFFERED) return;
    if(pendingCells.size > 0){
      ensureCells();
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

  function reapplyCellColors(){
    if(cellStates.size === 0) return;
    for(const { row, col, value, color } of cellStates.values()){
      applySetCell(row, col, value, color);
    }
  }

  // 外からも使えるように export
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

  const dirs = [DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT];
  const MASK_FUNCTIONS = {
    0: (r, c) => ((r + c) % 2) === 0, // r,c are 0-based
  };

  function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function drawBasePatterns(color = "red", { deferFlush = false } = {}){
    setRenderMode(RENDER_BUFFERED);
    clearAllCells();
    drawTiming(color);
    drawFinder(1, 1, color);
    drawFinder(1, 19, color);
    drawFinder(19, 1, color);
    drawAlignment(19, 19, color);
    drawDarkModule(color);
    drawFormat(0, color);
    if(!deferFlush){
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
    if(isStepFillRunning) return;
    clearAllCells();
    updateCursor(cursorPos.row, cursorPos.col, cursorPos.dir);
  });

    btnGenerate.addEventListener("click", async () => {
    if(isStepFillRunning) return;
    isStepFillRunning = true;
    btnGenerate.disabled = true;
    btnInit.disabled = true;
    try{
      const stepEnabled = !!(stepMode && stepMode.checked);
      setRenderMode(stepEnabled ? RENDER_IMMEDIATE : RENDER_BUFFERED);
      // 機�Eパターンを描画してから、データをジグザグ配置
      drawBasePatterns("red", { deferFlush: !stepEnabled });
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

      let bitIdx = 0;
      let col = 25;
      let upward = true;
      while(col > 0 && bitIdx < bitsSeq.length){
        if(col === 7){ col--; continue; } // skip timing column
        const colLeft = col - 1;
        for(let i = 0; i < 25 && bitIdx < bitsSeq.length; i++){
          const row = upward ? (25 - i) : (1 + i);
          for(const c of [col, colLeft]){
            if(c < 1) continue;
            if(c === 7) continue;
            if(funcSet.has(`${row}-${c}`)) continue;
            const { bit, color } = bitsSeq[bitIdx];
            setCell(row, c, bit, color || "black");
            updateCursor(row, c, upward ? DIR_UP : DIR_DOWN);
            bitIdx++;
            if(stepEnabled){
              await sleep(STEP_DELAY_MS);
            }
            if(bitIdx >= bitsSeq.length) break;
          }
        }
        upward = !upward;
        col -= 2;
      }
      if(!stepEnabled){
        flushRender();
      }
    }finally{
      btnGenerate.disabled = false;
      btnInit.disabled = false;
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
      for(const { row, col, value, color } of cellStates.values()){
        if(value !== 0 && value !== 1) continue;
        if(funcSet.has(`${row}-${col}`)) continue;
        const masked = value ^ (maskFn(row - 1, col - 1) ? 1 : 0);
        setCell(row, col, masked, color || "black");
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
      setCell(7, c, bit, color);
    }
    for(let r = 1; r <= 25; r++){
      const bit = (r % 2 === 1) ? 1 : 0;
      setCell(r, 7, bit, color);
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

  function fillFromPattern(){
    const data = window.patternData;
    if(!data) return;
    const ordered = ["A", "B", "C"];
    const bitsSeq = [];
    for(const key of ordered){
      const groups = data[key] || [];
      for(const g of groups){
        const isPadding = typeof g.label === "string" && g.label.startsWith("固定");
        const isTerm = !!g.terminator;
        const baseColor = isTerm ? TERMINATOR_COLOR : isPadding ? PADDING_COLOR : (GROUP_COLORS[key] || "black");
        for(const bit of g.bits){
          bitsSeq.push({ bit: Number(bit), group: key, color: baseColor });
        }
      }
    }
    clearAllCells();
    setRenderMode(RENDER_BUFFERED);
    let idx = 0;
    for(let r = 1; r <= 25 && idx < bitsSeq.length; r++){
      for(let c = 1; c <= 25 && idx < bitsSeq.length; c++, idx++){
        const { bit, color } = bitsSeq[idx];
        setCell(r, c, bit, color || "black");
      }
    }
    flushRender();
    setRenderMode(RENDER_IMMEDIATE);
  }

  if(btnPatternFill){
    btnPatternFill.addEventListener("click", fillFromPattern);
  }

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
})();
