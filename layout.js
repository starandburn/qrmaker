const CHAR_SPACE = "空白";
const CHAR_TERMINATE = "終端";
const CHAR_COLON = "：";
const CHAR_PADDING = "パディング";

const TYPE_MODE = "モード";
const TYPE_LENGTH = "長さ";

const CAPTION_CODEPATTERN = "コードパターン";
const CAPTION_SHOWCODEPATTERN = `${CAPTION_CODEPATTERN}を表示`;
const CAPTION_HIDECODEPATTERN = `${CAPTION_CODEPATTERN}を非表示`;

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
const btnSelectAllToggles = document.getElementById("btnSelectAllToggles");
const btnClearAllToggles = document.getElementById("btnClearAllToggles");
const dataPanel = document.getElementById("dataPanel");
const dataInputArea = document.getElementById("dataInputArea");
const dataPatternPanel = document.getElementById("dataPatternPanel") || document.getElementById("patternDetails");
const patternToggleText = document.getElementById("patternToggleText");
const asciiLink = document.getElementById("asciiLink");
const asciiModal = document.getElementById("asciiModal");
const asciiClose = document.getElementById("asciiClose");
const asciiTable = document.getElementById("asciiTable");
const toggleDebugValues = document.getElementById("toggleDebugValues");
const toggleInputs = [toggleCursor, toggleGuide, toggleGrid, toggleEmpty, toggleColor, toggleDebugValues].filter(Boolean);
window.toggleInputs = toggleInputs;
const userCodeTextarea = document.getElementById("userCode");

function getKindColor(kind){
  if(typeof window.colorsForKind === "function"){
    const entry = window.colorsForKind(kind);
    if(typeof entry === "string") return entry;
    if(entry && entry.label) return entry.label;
  }
  const fallback = {
    [BIT_INFO_MODE]: "blue",
    [BIT_INFO_LENGTH]: "blue",
    [BIT_INFO_CHAR]: "black",
    [BIT_INFO_TERMINATOR]: "yellow",
    [BIT_INFO_PADDING]: "purple",
    [BIT_INFO_PARITY]: "green",
    [BIT_FUNC_FINDER]: "red",
    [BIT_FUNC_TIMING]: "orange",
    [BIT_FUNC_ALIGNMENT]: "green",
    [BIT_FUNC_DARK]: "black",
    [BIT_FUNC_FORMAT]: "blue",
    [typeof BIT_MASK !== "undefined" ? BIT_MASK : -1]: "gray",
  };
  return fallback[kind] || "black";
}

// Minimal logger stub (overridden later in main.js) to buffer early logs
window._logBuffer = window._logBuffer || [];
if(typeof window.log !== "function"){
  window.log = (msg) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const line = `[${hh}:${mm}:${ss}] ${String(msg)}`;
    window._logBuffer.push(line);
    try{ console.log(msg); }catch(e){}
  };
}

const formatLogEventMessage = (fnName, mainArg, description) => {
  const safeName = fnName || "unknown";
  const mainArgText = (mainArg === undefined || mainArg === null) ? "" : String(mainArg);
  const callText = `${safeName}(${mainArgText})`;
  return description ? `${callText}: ${description}` : callText;
};
window.formatLogEventMessage = formatLogEventMessage;

if(typeof window.logEvent !== "function"){
  window.logEvent = (fnName, mainArg, description) => {
    const message = formatLogEventMessage(fnName, mainArg, description);
    window.log(message);
  };
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

    if(breakAfterTerminator && g.label && g.label.startsWith(CHAR_TERMINATE)){
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
    const disp = code === 32 ? CHAR_SPACE : String.fromCharCode(code);
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
  window.logEvent("refreshPattern", input, "パターンを再描画");

  const builder = (typeof window.qrBuildPatternSegments === "function") ? window.qrBuildPatternSegments(input) : null;
  if(!builder) return;

  const {
    modeBits,
    lenBits,
    characterEntries,
    terminatorBits,
    zeroPadBits,
    padEntries,
    dataCodewords,
  } = builder;

  const groupA = [];
  groupA.push({ label: `${TYPE_MODE}:4`, bits: modeBits, color: getKindColor(BIT_INFO_MODE) });
  groupA.push({ label: `${TYPE_LENGTH}:${input.length}`, bits: lenBits, color: getKindColor(BIT_INFO_LENGTH) });

  const groupB = [];
  for(const entry of characterEntries){
    const dispChar = entry.char === " " ? CHAR_SPACE
      : entry.char === ":" ? CHAR_COLON
      : entry.char;
    const label = `${dispChar}:${entry.code}`;
    groupB.push({ label, bits: entry.bits, color: getKindColor(BIT_INFO_CHAR) });
  }
  groupB.push({ label: `${CHAR_TERMINATE}:0`, bits: terminatorBits, terminator: true, color: getKindColor(BIT_INFO_TERMINATOR) });
  if(zeroPadBits){
    groupB.push({ label: "zero-pad", bits: zeroPadBits, color: getKindColor(BIT_INFO_PADDING), padding: true });
  }
  for(const padEntry of padEntries){
    const padLabel = `${CHAR_PADDING}:${padEntry.value}`;
    groupB.push({ label: padLabel, bits: padEntry.bits, color: getKindColor(BIT_INFO_PADDING), padding: true });
  }

  const EC_CODEWORDS = 10;
  const parityBytes = (typeof window.qrComputeParity === "function")
    ? window.qrComputeParity(dataCodewords, EC_CODEWORDS)
    : [];
  const groupC = parityBytes.map((val) => ({
    label: "",
    bits: val.toString(2).padStart(8, "0"),
    color: getKindColor(BIT_INFO_PARITY),
  }));

  renderRow(patternRowA, groupA, { small: false });
  renderRow(patternRowB, groupB, { breakAfterTerminator: false });
  renderRow(patternRowC, groupC, { small: false });
  refreshGuide();
}
function refreshGuide(){
  if(!inputGuide || !txtInput) return;
  const remain = Math.max(0, 32 - txtInput.value.length);
  inputGuide.textContent = `${remain}`;
}
if(txtInput){
  txtInput.addEventListener("input", () => {
    if(typeof window.stopCurrentRun === "function"){
      window.stopCurrentRun({ resetCursor: false, clear: false });
    }
    refreshPattern();
  });
}
// Enhanced typing helpers for the script textarea
if(userCodeTextarea){
  const insertText = (text) => {
    const start = userCodeTextarea.selectionStart ?? 0;
    const end = userCodeTextarea.selectionEnd ?? start;
    const val = userCodeTextarea.value ?? "";
    userCodeTextarea.value = val.slice(0, start) + text + val.slice(end);
    const pos = start + text.length;
    userCodeTextarea.selectionStart = userCodeTextarea.selectionEnd = pos;
  };
  userCodeTextarea.addEventListener("keydown", (e) => {
    if(e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "Enter"){
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if(e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey){
      const start = userCodeTextarea.selectionStart ?? 0;
      const val = userCodeTextarea.value ?? "";
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      const currentLine = val.slice(lineStart, start);
      const indent = (currentLine.match(/^[\t ]*/) || [""])[0];
      e.preventDefault();
      insertText("\n" + indent);
    }
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

const userCode = document.getElementById("userCode");
if(userCode){
  userCode.addEventListener("input", () => {
    if(typeof window.stopCurrentRun === "function"){
      window.stopCurrentRun({ resetCursor: false, clear: false });
    }
  });
}

refreshPattern();

function fitSquare(){
  window.logEvent("fitSquare", "", "描画領域にフィット");
  const area = document.querySelector(".view-area");
  const sq = document.querySelector(".square");
  if(!area || !sq) return;

  const cs = getComputedStyle(area);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

  const w = Math.max(0, area.clientWidth - padX);
  const h = Math.max(0, area.clientHeight - padY);
  const isSingleColumn = (
    (window.matchMedia && window.matchMedia("(orientation: portrait)").matches) ||
    (window.innerHeight > window.innerWidth) ||
    window.innerWidth <= 1100
  );
  const size = isSingleColumn
    ? Math.max(60, Math.floor(w)) // single-column/tall: base strictly on available width
    : Math.max(60, Math.floor(Math.min(w, h))); // two-column: fit both axes

  // Hide guide text if the available width is too narrow
  const guideCompact = w < 420 || h < 420 || size < 280;
  area.classList.toggle("guide-compact", guideCompact);

  sq.style.width = size + "px";
  sq.style.height = size + "px";
  if(typeof window.updateCursor === "function"){
    window.updateCursor();
  }
}

window.addEventListener("resize", () => requestAnimationFrame(fitSquare));
window.addEventListener("load", () => requestAnimationFrame(fitSquare));
requestAnimationFrame(fitSquare);
window.fitSquare = fitSquare;

function syncViewToggles(){
  window.logEvent("syncViewToggles", "", "表示トグルの状態を同期");
  const area = document.querySelector(".view-area");
  if(!area) return;
  area.classList.toggle("hide-guide", toggleGuide && !toggleGuide.checked);
  area.classList.toggle("hide-grid", toggleGrid && !toggleGrid.checked);
  area.classList.toggle("hide-empty", toggleEmpty && !toggleEmpty.checked);
  area.classList.toggle("hide-cursor", toggleCursor && !toggleCursor.checked);
}
window.syncViewToggles = syncViewToggles;

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
if(btnSelectAllToggles){
  btnSelectAllToggles.addEventListener("click", () => {
    for(const el of toggleInputs){
      el.checked = true;
    }
    syncViewToggles();
    for(const el of toggleInputs){
      el.dispatchEvent(new Event("change"));
    }
  });
}
if(btnClearAllToggles){
  btnClearAllToggles.addEventListener("click", () => {
    for(const el of toggleInputs){
      el.checked = false;
    }
    syncViewToggles();
    for(const el of toggleInputs){
      el.dispatchEvent(new Event("change"));
    }
  });
}

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
  if(patternToggleText && dataPatternPanel){
    patternToggleText.textContent = dataPatternPanel.open ? CAPTION_HIDECODEPATTERN : CAPTION_SHOWCODEPATTERN;
  }
}
if(dataPatternPanel){
  dataPatternPanel.addEventListener("toggle", updatePatternToggleText);
  updatePatternToggleText();
}

const historyCount = document.getElementById("historyCount");
const codeHistoryList = document.getElementById("codeHistoryList");
const codePanelElement = document.querySelector(".code-panel");
const btnToggleHistory = document.getElementById("btnToggleHistory");

const LAYOUT_HISTORY_PREVIEW_LENGTH = 64;
const escapeHtml = (value) => {
  const text = value ?? "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};
const formatHistoryPreview = (value) => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if(!normalized) return "（空白）";
  if(normalized.length <= LAYOUT_HISTORY_PREVIEW_LENGTH) return normalized;
  return `${normalized.slice(0, LAYOUT_HISTORY_PREVIEW_LENGTH)}…`;
};

const layoutUI = {
  setHistoryVisibility(visible){
    const isVisible = Boolean(visible);
    if(codePanelElement){
      codePanelElement.classList.toggle("history-visible", isVisible);
    }
    if(btnToggleHistory){
      btnToggleHistory.setAttribute("aria-pressed", isVisible ? "true" : "false");
      btnToggleHistory.classList.toggle("is-active", isVisible);
    }
  },
  renderHistoryList(entries){
    if(historyCount){
      historyCount.textContent = String(entries.length);
    }
    if(!codeHistoryList) return;
    if(!entries.length){
      codeHistoryList.innerHTML = "<li class=\"history-empty\">履歴はまだありません</li>";
      return;
    }
    const rows = entries.map((entry, index) => {
      const preview = formatHistoryPreview(entry.value);
      const label = entry.label || "変更";
      const metaLabel = entry.explanation ?? label;
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const title = `${label} · ${timestamp}`;
      const htmlPreview = escapeHtml(preview);
      const htmlMeta = escapeHtml(metaLabel);
      const status = entry.status ? String(entry.status).toLowerCase().replace(/[^a-z0-9-_]/g, "") : "";
      const classAttr = status ? ` class="status-${status}"` : "";
      return `<li data-index="${index}" title="${escapeHtml(title)}"${classAttr}><span class="history-snippet">${htmlPreview}</span><span class="history-meta">${htmlMeta}</span></li>`;
    });
    codeHistoryList.innerHTML = rows.join("");
  },
};

window.layoutUI = Object.assign({}, window.layoutUI || {}, layoutUI);

