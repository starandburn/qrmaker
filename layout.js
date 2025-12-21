const txtInput = document.getElementById("txtInput");
const patternBox = document.getElementById("patternBox");
const patternRowA = document.getElementById("patternRowA");
const patternRowB = document.getElementById("patternRowB");
const patternRowC = document.getElementById("patternRowC");
const btnClear = document.getElementById("btnClear");
const inputGuide = document.getElementById("inputGuide");
const toggleGuide = document.getElementById("toggleGuide");
const toggleGrid = document.getElementById("toggleGrid");
const toggleEmpty = document.getElementById("toggleEmpty");
const toggleCursor = document.getElementById("toggleCursor");
const toggleColor = document.getElementById("toggleColor");
const patternDetails = document.getElementById("patternDetails");
const patternToggleText = document.getElementById("patternToggleText");
const asciiLink = document.getElementById("asciiLink");
const asciiModal = document.getElementById("asciiModal");
const asciiClose = document.getElementById("asciiClose");
const asciiTable = document.getElementById("asciiTable");

// Reed-Solomon (QR, GF(256), poly 0x11d) helpers
const GF256_EXP = new Array(512);
const GF256_LOG = new Array(256);
let gfReady = false;
const generatorCache = {};
function ensureGF(){
  if(gfReady) return;
  let x = 1;
  for(let i = 0; i < 256; i++){
    GF256_EXP[i] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if(x & 0x100){
      x ^= 0x11d;
    }
  }
  for(let i = 256; i < 512; i++){
    GF256_EXP[i] = GF256_EXP[i - 256];
  }
  gfReady = true;
}
function gfMul(a, b){
  if(a === 0 || b === 0) return 0;
  return GF256_EXP[(GF256_LOG[a] + GF256_LOG[b]) % 255];
}
function polyMultiply(p, q){
  const res = new Array(p.length + q.length - 1).fill(0);
  for(let i = 0; i < p.length; i++){
    for(let j = 0; j < q.length; j++){
      res[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return res;
}
function getGenerator(ecLen){
  if(generatorCache[ecLen]) return generatorCache[ecLen];
  ensureGF();
  let poly = [1];
  for(let i = 0; i < ecLen; i++){
    poly = polyMultiply(poly, [1, GF256_EXP[i]]);
  }
  generatorCache[ecLen] = poly;
  return poly;
}
function computeParity(dataCodewords, ecLen){
  const gen = getGenerator(ecLen);
  const ec = new Array(ecLen).fill(0);
  for(const d of dataCodewords){
    const factor = d ^ ec[0];
    ec.shift();
    ec.push(0);
    if(factor !== 0){
      for(let i = 0; i < ecLen; i++){
        ec[i] ^= gfMul(gen[i + 1], factor);
      }
    }
  }
  return ec;
}

function renderRow(row, groups, { small = false, breakAfterTerminator = false } = {}){
  if(!row) return;
  const gapLarge = 7;
  const gapSmall = 6.25;
  row.innerHTML = "";

  const totalBits = groups.reduce((sum, g) => sum + g.bits.length + (g.terminator ? 4 : 0), 0);
  let bitIndex = 0;
  for(const g of groups){
    if(g.label && g.labelFullLine){
      const labelLine = document.createElement("div");
      labelLine.className = "bit-label full-row full-line";
      labelLine.textContent = g.label;
      row.appendChild(labelLine);
    }

    const block = document.createElement("div");
    block.className = "bit-block";
    if(g.color){
      block.classList.add(`col-${g.color}`);
    }

    if(g.label && !g.labelFullLine){
      const labelEl = document.createElement("div");
      labelEl.className = "bit-label";
      labelEl.textContent = g.label;
      block.appendChild(labelEl);
    }

    const strip = document.createElement("div");
    strip.className = small ? "bit-strip small" : "bit-strip";
    for(let i = 0; i < g.bits.length; i++, bitIndex++){
      const bit = g.bits[i];
      const cell = document.createElement("div");
      cell.className = "bit-cell " + (bit === "1" ? "bit-1" : "");
      if(small){
        cell.classList.add("small");
      }
      const isBoundary = (bitIndex % 4 === 3);
      const isLastOverall = (bitIndex === totalBits - 1);
      if(!isLastOverall){
        cell.style.marginRight = isBoundary ? `${small ? gapSmall : gapLarge}px` : "2px";
      }else{
        cell.style.marginRight = "0px";
      }
      strip.appendChild(cell);
    }
    if(g.terminator){
      for(let i = 0; i < 4; i++, bitIndex++){
        const cell = document.createElement("div");
        cell.className = "bit-cell placeholder";
        if(small){
          cell.classList.add("small");
        }
        const isBoundary = (bitIndex % 4 === 3);
        const isLastOverall = (bitIndex === totalBits - 1);
        if(!isLastOverall){
          cell.style.marginRight = isBoundary ? `${small ? gapSmall : gapLarge}px` : "2px";
        }else{
          cell.style.marginRight = "0px";
        }
        strip.appendChild(cell);
      }
    }
    block.appendChild(strip);
    row.appendChild(block);

    if(breakAfterTerminator && g.label && g.label.startsWith("終端")){
      const brk = document.createElement("div");
      brk.className = "line-break";
      row.appendChild(brk);
    }
  }
}

function renderAsciiTable(){
  if(!asciiTable) return;
  if(asciiTable.dataset.rendered === "1") return;
  asciiTable.innerHTML = "";
  const frag = document.createDocumentFragment();
  for(let code = 32; code <= 126; code++){
    const entry = document.createElement("div");
    entry.className = "ascii-entry";

    const charLabel = document.createElement("div");
    charLabel.className = "ascii-char";
    const disp = code === 32 ? "空白" : String.fromCharCode(code);
    charLabel.textContent = disp;
    entry.appendChild(charLabel);

    const codeLabel = document.createElement("div");
    codeLabel.className = "ascii-code";
    codeLabel.textContent = String(code);
    entry.appendChild(codeLabel);

    const bitsWrap = document.createElement("div");
    bitsWrap.className = "ascii-bits";
    const bits = code.toString(2).padStart(8, "0");
    for(const b of bits){
      const cell = document.createElement("div");
      cell.className = "ascii-bit " + (b === "1" ? "ascii-bit1" : "ascii-bit0");
      bitsWrap.appendChild(cell);
    }
    entry.appendChild(bitsWrap);
    frag.appendChild(entry);
  }
  asciiTable.appendChild(frag);
  asciiTable.dataset.rendered = "1";
}

function refreshPattern(){
  if(!txtInput) return;
  if(!patternRowA || !patternRowB || !patternRowC) return;
  const input = txtInput.value;

  // QR v2-L constants
  const DATA_CODEWORDS = 34; // data bytes
  const EC_CODEWORDS = 10;   // parity bytes
  const PAD_CODEWORDS = [0xec, 0x11];

  const groupA = [];
  const groupB = [];

  // A: モード(0100) + 文字数(8bit)
  const modeBits = "0100";
  const lenBits = input.length.toString(2).padStart(8, "0");
  groupA.push({ label: `種別:4`, bits: modeBits });
  groupA.push({ label: `文字数:${input.length}`, bits: lenBits });

  // B: データ(ASCII) + 終端 + 0詰め + パディング
  let bitStream = modeBits + lenBits;
  for(let i = 0; i < input.length; i++){
    const code = input.charCodeAt(i) & 0xff; // ASCII 8bit
    const bits = code.toString(2).padStart(8, "0");
    const dispChar = input[i] === " " ? "空白"
      : input[i] === ":" ? "コロン(:)"
      : input[i];
    const label = `${dispChar}:${code}`;
    groupB.push({ label, bits });
    bitStream += bits;
  }

  // Terminator (up to 4 bits)
  const terminatorBits = "0000";
  groupB.push({ label: `終端:0`, bits: terminatorBits, terminator: true, color: "yellow" });
  bitStream += terminatorBits;

  // Align to byte boundary with zero padding if needed
  const mod8 = bitStream.length % 8;
  if(mod8 !== 0){
    const zeroPad = "0".repeat(8 - mod8);
    groupB.push({ label: "0詰め", bits: zeroPad, padding: true });
    bitStream += zeroPad;
  }

  // Split into bytes and pad to DATA_CODEWORDS with 0xEC/0x11
  const dataCodewords = [];
  for(let i = 0; i < bitStream.length; i += 8){
    const byteBits = bitStream.slice(i, i + 8);
    dataCodewords.push(parseInt(byteBits, 2));
  }
  let padIdx = 0;
  while(dataCodewords.length < DATA_CODEWORDS){
    const padVal = PAD_CODEWORDS[padIdx % PAD_CODEWORDS.length];
    dataCodewords.push(padVal);
    const label = `固定:${padVal}`;
    groupB.push({ label, bits: padVal.toString(2).padStart(8, "0"), color: "purple", padding: true });
    padIdx++;
  }

  // C: パリティ（RS 10バイト）
  const parity = computeParity(dataCodewords, EC_CODEWORDS);
  const groupC = parity.map(val => ({
    label: "",
    bits: val.toString(2).padStart(8, "0"),
  }));

  renderRow(patternRowA, groupA, { small: false });
  renderRow(patternRowB, groupB, { breakAfterTerminator: false });
  renderRow(patternRowC, groupC, { small: false });
  window.patternData = { A: groupA, B: groupB, C: groupC };
  refreshGuide();
}

function refreshGuide(){
  if(!inputGuide || !txtInput) return;
  const remain = Math.max(0, 32 - txtInput.value.length);
  inputGuide.textContent = `残り${remain}文字`;
}

if(txtInput){
  txtInput.addEventListener("input", () => {
    if(typeof window.stopCurrentRun === "function"){
      window.stopCurrentRun({ resetCursor: false, clear: false });
    }
    refreshPattern();
  });
}

if(btnClear){
  btnClear.addEventListener("click", () => {
    if(typeof window.stopCurrentRun === "function"){
      window.stopCurrentRun({ resetCursor: false, clear: false });
    }
    txtInput.value = "";
    refreshPattern();
    txtInput.focus();
  });
}

const studentCode = document.getElementById("studentCode");
if(studentCode){
  studentCode.addEventListener("input", () => {
    if(typeof window.stopCurrentRun === "function"){
      window.stopCurrentRun({ resetCursor: false, clear: false });
    }
  });
}

refreshPattern();

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
  if(typeof window.updateCursor === "function"){
    window.updateCursor();
  }
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

function openAsciiModal(ev){
  if(ev){ ev.preventDefault(); }
  renderAsciiTable();
  if(asciiModal){
    asciiModal.classList.remove("hidden");
  }
}
function closeAsciiModal(ev){
  if(ev){ ev.preventDefault(); }
  if(asciiModal){
    asciiModal.classList.add("hidden");
  }
}
if(asciiLink){
  asciiLink.addEventListener("click", openAsciiModal);
  asciiLink.addEventListener("click", (ev) => ev.stopPropagation());
}
if(asciiClose){
  asciiClose.addEventListener("click", closeAsciiModal);
}
if(asciiModal){
  asciiModal.addEventListener("click", (ev) => {
    if(ev.target === asciiModal){
      closeAsciiModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  const y = document.getElementById("currentYear");
  if(y){
    y.textContent = String(new Date().getFullYear());
  }
});

function updatePatternToggleText(){
  if(patternToggleText && patternDetails){
    patternToggleText.textContent = patternDetails.open ? "コードパターンを隠す" : "コードパターンを表示";
  }
}
if(patternDetails){
  patternDetails.addEventListener("toggle", updatePatternToggleText);
  updatePatternToggleText();
}
