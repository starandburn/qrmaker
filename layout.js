const txtInput = document.getElementById("txtInput");
const confirmBox = document.getElementById("confirmBox");
const btnClear = document.getElementById("btnClear");
const inputGuide = document.getElementById("inputGuide");
const toggleGuide = document.getElementById("toggleGuide");
const toggleGrid = document.getElementById("toggleGrid");
const toggleEmpty = document.getElementById("toggleEmpty");
const toggleCursor = document.getElementById("toggleCursor");

const DIR_UP = "up";
const DIR_RIGHT = "right";
const DIR_DOWN = "down";
const DIR_LEFT = "left";

const cursorPos = {
  row: 3,
  col: 2,
  dir: DIR_DOWN,
};

function refreshConfirm(){
  if(!confirmBox || !txtInput) return;
  const v = txtInput.value;
  const n = v.length;

  if(n === 0){
    confirmBox.textContent = "まだ何も入力されていません。";
    refreshGuide();
    return;
  }

  const lines = [];
  lines.push(`全体: ${n}文字「${v}」`);
  for(let i = 0; i < n; i++){
    const char = v[i];
    const code = v.charCodeAt(i);
    lines.push(`${String(i + 1).padStart(2, "0")}: 「${char}」 (ASCII ${code})`);
  }
  confirmBox.textContent = lines.join("\n");
  refreshGuide();
}

function refreshGuide(){
  if(!inputGuide || !txtInput) return;
  const remain = Math.max(0, 32 - txtInput.value.length);
  inputGuide.textContent = `（残り${remain}文字）`;
}

if(txtInput){
  txtInput.addEventListener("input", refreshConfirm);
}

if(btnClear){
  btnClear.addEventListener("click", () => {
    txtInput.value = "";
    refreshConfirm();
    txtInput.focus();
  });
}

refreshConfirm();

function fitSquare(){
  const area = document.querySelector(".view-area");
  const sq = document.querySelector(".square");
  if(!area || !sq) return;

  const cs = getComputedStyle(area);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

  const w = Math.max(0, area.clientWidth - padX);
  const h = Math.max(0, area.clientHeight - padY);
  const size = Math.max(60, Math.floor(Math.min(w, h)));

  sq.style.width = size + "px";
  sq.style.height = size + "px";
  drawCursor();
}

window.addEventListener("resize", () => requestAnimationFrame(fitSquare));
window.addEventListener("load", () => requestAnimationFrame(fitSquare));
requestAnimationFrame(fitSquare);

function syncViewToggles(){
  const area = document.querySelector(".view-area");
  if(!area) return;
  area.classList.toggle("hide-guide", toggleGuide && !toggleGuide.checked);
  area.classList.toggle("hide-grid", toggleGrid && !toggleGrid.checked);
  area.classList.toggle("hide-empty", toggleEmpty && !toggleEmpty.checked);
  area.classList.toggle("hide-cursor", toggleCursor && !toggleCursor.checked);
}

if(toggleGuide){
  toggleGuide.addEventListener("change", syncViewToggles);
}
if(toggleGrid){
  toggleGrid.addEventListener("change", syncViewToggles);
}
if(toggleEmpty){
  toggleEmpty.addEventListener("change", syncViewToggles);
}
if(toggleCursor){
  toggleCursor.addEventListener("change", syncViewToggles);
}
syncViewToggles();

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

function drawCursor(row = cursorPos.row, col = cursorPos.col, dir = cursorPos.dir){
  const gridArea = document.querySelector(".grid-area");
  const cursor = gridArea?.querySelector(".qr-cursor");
  if(!gridArea || !cursor) return;

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


ensureCells();
drawCursor(3, 2, DIR_DOWN);

document.addEventListener("DOMContentLoaded", ()=>{
  const y = document.getElementById("currentYear");
  if(y){
    y.textContent = String(new Date().getFullYear());
  }
});
