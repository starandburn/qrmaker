const txtInput = document.getElementById("txtInput");
const confirmBox = document.getElementById("confirmBox");
const btnClear = document.getElementById("btnClear");

function refreshConfirm(){
  const v = txtInput.value;
  const n = v.length;

  if(n === 0){
    confirmBox.textContent = "(入力なし)";
    return;
  }

  const lines = [];
  for(let i = 1; i <= n; i++){
    lines.push(String(i).padStart(2, "0") + ": ダミーテキスト [" + v + "]");
  }
  confirmBox.textContent = lines.join("\n");
}

txtInput.addEventListener("input", refreshConfirm);
btnClear.addEventListener("click", () => {
  txtInput.value = "";
  refreshConfirm();
  txtInput.focus();
});
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
  const size = Math.floor(Math.min(w, h));

  sq.style.width = size + "px";
  sq.style.height = size + "px";
}

window.addEventListener("resize", () => requestAnimationFrame(fitSquare));
window.addEventListener("load", () => requestAnimationFrame(fitSquare));
requestAnimationFrame(fitSquare);
