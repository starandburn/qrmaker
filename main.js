// メイン動作用の簡易テストスクリプト
// リセット: カーソルを外周ランダム・外向きに移動
// 作成実行: 現在位置のセルにランダムで白/黒をセット

(function(){
  const btnGenerate = document.getElementById("btnGenerate");
  const btnInit = document.getElementById("btnInit");
  if(!btnGenerate || !btnInit) return;

  // カーソル・セル描画系をまとめて管理
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

  function applySetCell(row, col, value){
    ensureCells();
    const cells = document.querySelectorAll(".qr-cells .cell");
    if(!cells || cells.length === 0) return;
    const r = Math.min(25, Math.max(1, row));
    const c = Math.min(25, Math.max(1, col));
    const idx = (r - 1) * 25 + (c - 1);
    const cell = cells[idx];
    if(!cell) return;
    cell.classList.remove("white", "black");
    if(value === 1){
      cell.classList.add("black");
    }else if(value === 0){
      cell.classList.add("white");
    }
    const cursor = document.querySelector(".qr-cursor");
    if(cursor){
      cursor.classList.add("is-set");
      cursor.style.setProperty("--cursor-color", "#1b66ff");
      cursor.style.borderColor = "#1b66ff";
    }
  }

  function setCell(row, col, value){
    if(renderMode === RENDER_BUFFERED){
      const r = Math.min(25, Math.max(1, row));
      const c = Math.min(25, Math.max(1, col));
      pendingCells.set(`${r}-${c}`, { row: r, col: c, value });
      return;
    }
    applySetCell(row, col, value);
  }

  function flushRender(){
    if(renderMode !== RENDER_BUFFERED) return;
    if(pendingCells.size > 0){
      ensureCells();
      for(const { row, col, value } of pendingCells.values()){
        applySetCell(row, col, value);
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

  const dirs = [DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT];

  function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  btnInit.addEventListener("click", () => {
    if(isStepFillRunning) return;
    setRenderMode(RENDER_BUFFERED);
    for(let r = 1; r <= 25; r++){
      for(let c = 1; c <= 25; c++){
        setCell(r, c, randomInt(0, 1));
      }
    }
    flushRender();
    setRenderMode(RENDER_IMMEDIATE);

    // 外周からランダムに選び、外向きにする
    const edge = randomInt(0, 3); // 0:top,1:right,2:bottom,3:left
    let row = 1;
    let col = 1;
    let dir = DIR_UP;
    if(edge === 0){ // top
      row = 1;
      col = randomInt(1, 25);
      dir = DIR_UP;
    }else if(edge === 1){ // right
      row = randomInt(1, 25);
      col = 25;
      dir = DIR_RIGHT;
    }else if(edge === 2){ // bottom
      row = 25;
      col = randomInt(1, 25);
      dir = DIR_DOWN;
    }else{ // left
      row = randomInt(1, 25);
      col = 1;
      dir = DIR_LEFT;
    }
    updateCursor(row, col, dir);
  });

  btnGenerate.addEventListener("click", async () => {
    if(isStepFillRunning) return;
    isStepFillRunning = true;
    btnGenerate.disabled = true;
    btnInit.disabled = true;
    try{
      setRenderMode(RENDER_IMMEDIATE);
      ensureCells();
      for(let r = 1; r <= 25; r++){
        for(let c = 1; c <= 25; c++){
          setCell(r, c, randomInt(0, 1));
          updateCursor(r, c, c === 25 ? DIR_DOWN : DIR_RIGHT);
          await sleep(STEP_DELAY_MS);
        }
      }
    }finally{
      btnGenerate.disabled = false;
      btnInit.disabled = false;
      isStepFillRunning = false;
    }
  });

  // 初期描画
  ensureCells();
  updateCursor(cursorPos.row, cursorPos.col, cursorPos.dir);
})();
