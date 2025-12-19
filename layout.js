const txtInput = document.getElementById("txtInput");
const confirmBox = document.getElementById("confirmBox");
const btnClear = document.getElementById("btnClear");
const inputGuide = document.getElementById("inputGuide");

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
}

window.addEventListener("resize", () => requestAnimationFrame(fitSquare));
window.addEventListener("load", () => requestAnimationFrame(fitSquare));
requestAnimationFrame(fitSquare);

document.addEventListener("DOMContentLoaded", ()=>{
  const y = document.getElementById("currentYear");
  if(y){
    y.textContent = String(new Date().getFullYear());
  }
});