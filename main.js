// メイン動作用の簡易テストスクリプト
// 作成実行ボタンを押すたびにカーソルをランダム位置・ランダム向きへ動かす

function setCell(row, col, value){
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
}



(function(){
  const btnGenerate = document.getElementById("btnGenerate");
  const btnInit = document.getElementById("btnInit");
  if(!btnGenerate || !btnInit || typeof drawCursor !== "function" || typeof setCell !== "function") return;

  const dirs = [DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT];

  function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  btnInit.addEventListener("click", () => {
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
    drawCursor(row, col, dir);
  });

  btnGenerate.addEventListener("click", () => {
    const val = randomInt(0, 1);
    setCell(cursorPos.row, cursorPos.col, val);
  });
})();
