const CHAR_SPACE = "空白";
const CHAR_TERMINATE = "終端";
const CHAR_COLON = "：";
const CHAR_PADDING = "パディング";

const TYPE_MODE = "種別";
const TYPE_LENGTH = "文字数";

const CAPTION_DATA_PATTERN = "データパターン";
const CAPTION_SHOW_DATA_PATTERN = `${CAPTION_DATA_PATTERN}を表示`;
const CAPTION_HIDE_DATA_PATTERN = `${CAPTION_DATA_PATTERN}を非表示`;

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
const dataPatternPanel = document.getElementById("dataPatternPanel");
if(!dataPatternPanel){
  throw new Error("dataPatternPanel is required");
}
const patternToggleText = document.getElementById("patternToggleText");
const asciiLink = document.getElementById("asciiLink");
const asciiModal = document.getElementById("asciiModal");
const asciiClose = document.getElementById("asciiClose");
const asciiTable = document.getElementById("asciiTable");
const toggleDebugValues = document.getElementById("toggleDebugValues");
const toggleInputs = [toggleCursor, toggleGuide, toggleGrid, toggleEmpty, toggleColor, toggleDebugValues].filter(Boolean);
window.toggleInputs = toggleInputs;
const userCodeTextarea = document.getElementById("userCode");
const btnCopyCode = document.getElementById("btnCopyCode");
const btnPasteCode = document.getElementById("btnPasteCode");
const btnFormatCode = document.getElementById("btnFormatCode");
const btnClearCode = document.getElementById("btnClearCode");
const dataInputStatus = document.getElementById("dataInputStatus");
const dataCount = document.getElementById("dataCount");
const sampleDropdown = document.getElementById("sampleDropdown");
const sampleDropdownToggle = document.getElementById("btnSampleDropdown");
const sampleDropdownMenu = document.getElementById("sampleDropdownMenu");
const DATA_INPUT_MAX_LENGTH = Number(txtInput?.getAttribute("maxlength")) || 32;
const FULLWIDTH_CHAR_REGEX = /[^\u0000-\u007F]/;
const STOP_REASON_DATA = "データが変更されたので停止しました。";
const STOP_REASON_CODE = "プログラムが変更されたので停止しました。";
const isExecutionRunningNow = () => {
  const statusEl = document.getElementById("executionStatus");
  return Boolean(statusEl && statusEl.classList.contains("status-running"));
};
const stopCurrentRunIfRunning = (reason) => {
  if(!isExecutionRunningNow()) return;
  callIfFunction(window.stopCurrentRun, { resetCursor: false, clear: false, reason });
};
let lastBuiltPatternInput = null;
const isPatternPanelOpen = () => Boolean(dataPatternPanel && dataPatternPanel.open);
const refreshPatternIfPanelOpen = () => {
  if(!isPatternPanelOpen()){
    return false;
  }
  return refreshPattern();
};
const refreshPatternForCreate = () => {
  if(!txtInput){
    return false;
  }
  const input = txtInput.value ?? "";
  const needsUpdate = (lastBuiltPatternInput === null || input !== lastBuiltPatternInput);
  if(!needsUpdate){
    return false;
  }
  return refreshPattern({ force: true });
};

function updateDataStatus(){
  if(!txtInput || !dataInputStatus) return;
  const value = txtInput.value ?? "";
  const length = value.length;
  const errors = [];
  if(length === 0){
    errors.push("何か入力してください。");
  }
  if(length > DATA_INPUT_MAX_LENGTH){
    errors.push(`文字数が${DATA_INPUT_MAX_LENGTH}文字を超えています。`);
  }
  if(FULLWIDTH_CHAR_REGEX.test(value)){
    errors.push("全角文字が含まれています。");
  }

  const baseText = `${length}/${DATA_INPUT_MAX_LENGTH}文字`;
  if(dataCount){
    dataCount.textContent = baseText;
  }
  if(errors.length){
    const errorText = errors.map((msg) => `<span class="data-status-warning">※${msg}</span>`).join("");
    dataInputStatus.innerHTML = errorText;
    return;
  }
  dataInputStatus.textContent = "";
}

function setInputValue(value){
  if(!txtInput) return;
  txtInput.value = value;
  stopCurrentRunIfRunning(STOP_REASON_DATA);
  refreshPatternIfPanelOpen();
  updateDataStatus();
  txtInput.focus();
}

function closeSampleDropdown(){
  if(!sampleDropdown) return;
  sampleDropdown.classList.remove("is-open");
  if(sampleDropdownToggle){
    sampleDropdownToggle.setAttribute("aria-expanded", "false");
  }
}

function openSampleDropdown(){
  if(!sampleDropdown) return;
  sampleDropdown.classList.add("is-open");
  if(sampleDropdownToggle){
    sampleDropdownToggle.setAttribute("aria-expanded", "true");
  }
}

function toggleSampleDropdown(){
  if(sampleDropdown?.classList.contains("is-open")){
    closeSampleDropdown();
  }else{
    openSampleDropdown();
  }
}

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

const safeConsoleLog = (value) => {
  callIfFunction(window.safeConsoleLog, value);
};

// Minimal logger stub (overridden later in main.js) to buffer early logs
window._logBuffer = window._logBuffer || [];
if(typeof window.log !== "function"){
  window.log = (msg, { consoleDetails, debugMessage } = {}) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const debugText = String(debugMessage ?? msg);
    const line = `[${hh}:${mm}:${ss}] ${debugText}`;
    window._logBuffer.push(line);
    safeConsoleLog(consoleDetails ?? msg);
  };
}

const formatLogEventMessage = (fnName, mainArg, description) => {
  const safeName = fnName || "unknown";
  const text = description ? `${safeName}: ${description}` : safeName;
  if(fnName === "qrVerify" || fnName === "resetCursor" || fnName === "moveCursor" || fnName === "setCursorDirection" || fnName === "setSwitch"){
    return text;
  }
  if(typeof mainArg !== "string") return text;
  const trimmed = mainArg.trim();
  if(!trimmed || !/^\{[\s\S]*\}$/.test(trimmed)) return text;
  let parsed = null;
  try{
    parsed = JSON.parse(trimmed);
  }catch(e){
    return text;
  }
  if(!parsed || typeof parsed !== "object") return text;
  const details = Object.entries(parsed)
    .filter(([, value]) => typeof value === "number" || typeof value === "string")
    .map(([key, value]) => `${key}=${value}`);
  if(!details.length) return text;
  return `${text} (${details.join(", ")})`;
};
window.formatLogEventMessage = formatLogEventMessage;

if(typeof window.logEvent !== "function"){
  window.logEvent = (fnName, mainArg, description) => {
    const message = formatLogEventMessage(fnName, mainArg, description);
    const consoleDetails = {
      api: fnName || "unknown",
      args: mainArg,
      description,
      timestamp: new Date().toISOString(),
    };
    window.log(message, { consoleDetails, debugMessage: message });
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

function refreshPattern({ force = false } = {}){
  if(!txtInput) return;
  if(!patternRowA || !patternRowB || !patternRowC) return;
  const input = txtInput.value ?? "";
  const patternLabel = input ? `データパターンを更新（${input}）` : "データパターンを更新";
  window.logEvent("refreshPattern", input, patternLabel);

  const builder = (typeof window.qrBuildPatternSegments === "function") ? window.qrBuildPatternSegments(input) : null;
  if(!builder) return false;
  if(!force && input === lastBuiltPatternInput) return false;
  lastBuiltPatternInput = input;

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
  callIfFunction(window.resetData);
  return true;
}
function refreshGuide(){
  if(!inputGuide || !txtInput) return;
  const remain = Math.max(0, 32 - txtInput.value.length);
  inputGuide.textContent = `${remain}`;
}
if(txtInput){
  txtInput.addEventListener("input", () => {
    callIfFunction(window.logEvent, "txtInput.input", txtInput.value ?? "", "テキスト入力が変更されました");
    stopCurrentRunIfRunning(STOP_REASON_DATA);
    refreshPatternIfPanelOpen();
    updateDataStatus();
  });
  txtInput.addEventListener("focus", () => {
    txtInput.select();
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
    callIfFunction(window.logEvent, "btnClear.click", "", "入力をゼロにクリアしました");
    stopCurrentRunIfRunning(STOP_REASON_DATA);
    txtInput.value = "";
    refreshPatternIfPanelOpen();
    txtInput.focus();
    updateDataStatus();
  });
}

if(sampleDropdownToggle){
  sampleDropdownToggle.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const willOpen = !(sampleDropdown?.classList.contains("is-open"));
    callIfFunction(
      window.logEvent,
      "sampleDropdown.toggle",
      { state: willOpen ? "open" : "close" },
      willOpen ? "サンプルメニューを開きました" : "サンプルメニューを閉じました",
    );
    toggleSampleDropdown();
  });
}
if(sampleDropdownMenu){
  sampleDropdownMenu.addEventListener("click", (ev) => {
    const option = ev.target.closest("[data-sample-value]");
    if(!option) return;
    const value = option.getAttribute("data-sample-value") ?? "";
    callIfFunction(window.logEvent, "sampleDropdown.select", { value }, "サンプル入力が選択されました");
    setInputValue(value);
    closeSampleDropdown();
  });
}
document.addEventListener("click", () => {
  closeSampleDropdown();
});

const userCode = document.getElementById("userCode");
if(userCode){
  userCode.addEventListener("input", () => {
    stopCurrentRunIfRunning(STOP_REASON_CODE);
  });
}

refreshPatternIfPanelOpen();
updateDataStatus();

function syncViewLayout(){
  window.logEvent("syncViewLayout", "", "描画領域にフィット");
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
  const rawSize = isSingleColumn
    ? Math.max(60, Math.floor(w)) // single-column/tall: base strictly on available width
    : Math.max(60, Math.floor(Math.min(w, h))); // two-column: fit both axes
  const size = Math.max(60, rawSize - (rawSize % 25));

  // Hide guide text if the available width is too narrow
  const guideCompact = w < 420 || h < 420 || size < 280;
  area.classList.toggle("guide-compact", guideCompact);

  sq.style.width = size + "px";
  sq.style.height = size + "px";
  callIfFunction(window.updateCursor);
}

window.addEventListener("resize", () => requestAnimationFrame(syncViewLayout));
window.addEventListener("load", () => requestAnimationFrame(syncViewLayout));
requestAnimationFrame(syncViewLayout);
window.syncViewLayout = syncViewLayout;

function syncViewToggles(){
  const baseLabel = "表示オプションを反映";
  const summary = buildViewToggleSummary();
  const message = summary ? `${baseLabel}${summary}` : baseLabel;
  window.logEvent("syncViewToggles", "", message);
  updateToggleButtons();
  const area = document.querySelector(".view-area");
  if(!area) return;
  area.classList.toggle("hide-guide", toggleGuide && !toggleGuide.checked);
  area.classList.toggle("hide-grid", toggleGrid && !toggleGrid.checked);
  area.classList.toggle("hide-empty", toggleEmpty && !toggleEmpty.checked);
  area.classList.toggle("hide-cursor", toggleCursor && !toggleCursor.checked);
}
function buildViewToggleSummary(){
  const entries = [
    { el: toggleCursor, label: "カーソル" },
    { el: toggleGuide, label: "ガイド" },
    { el: toggleGrid, label: "グリッド" },
    { el: toggleEmpty, label: "空セル" },
    { el: toggleColor, label: "色" },
    { el: toggleDebugValues, label: "セルの値" },
  ].filter((entry) => entry.el);
  if(!entries.length) return "";
  const allChecked = entries.every((entry) => entry.el.checked);
  const allUnchecked = entries.every((entry) => !entry.el.checked);
  if(allChecked) return "（全選択）";
  if(allUnchecked) return "（全解除）";
  const enabled = entries.filter((entry) => entry.el.checked).map((entry) => entry.label);
  return enabled.length ? `（${enabled.join("/")})` : "";
}
function updateToggleButtons(){
  if(!btnSelectAllToggles && !btnClearAllToggles) return;
  const allChecked = toggleInputs.length > 0 && toggleInputs.every((el) => el.checked);
  const allUnchecked = toggleInputs.length > 0 && toggleInputs.every((el) => !el.checked);
  if(btnSelectAllToggles) btnSelectAllToggles.disabled = allChecked;
  if(btnClearAllToggles) btnClearAllToggles.disabled = allUnchecked;
}
function closeViewToggleDrawer(){
  const drawer = document.querySelector(".qr-controls-drawer");
  if(!drawer) return;
  drawer.classList.add("force-close");
  if(document.activeElement instanceof HTMLElement){
    document.activeElement.blur();
  }
  if(drawer.dataset.forceCloseListening === "1") return;
  drawer.dataset.forceCloseListening = "1";
  const onPointerMove = (ev) => {
    if(!drawer.contains(ev.target)){
      drawer.classList.remove("force-close");
      delete drawer.dataset.forceCloseListening;
      document.removeEventListener("pointermove", onPointerMove, true);
    }
  };
  document.addEventListener("pointermove", onPointerMove, true);
}
window.syncViewToggles = syncViewToggles;
updateToggleButtons();

function canHandleToggleShortcut(active){
  if(!active || !(active instanceof HTMLElement)) return true;
  if(active.closest(".qr-controls-drawer")) return true;
  const tag = active.tagName ? active.tagName.toUpperCase() : "";
  if(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  if(active.isContentEditable) return false;
  return true;
}
function toggleAllViewToggles(){
  const allChecked = toggleInputs.length > 0 && toggleInputs.every((el) => el.checked);
  const next = !allChecked;
  for(const el of toggleInputs){
    el.checked = next;
  }
  syncViewToggles();
  for(const el of toggleInputs){
    el.dispatchEvent(new Event("change"));
  }
  closeViewToggleDrawer();
}
window.addEventListener("keydown", (ev) => {
  if(ev.key !== " ") return;
  if(ev.ctrlKey || ev.altKey || ev.metaKey) return;
  if(!canHandleToggleShortcut(document.activeElement)) return;
  ev.preventDefault();
  toggleAllViewToggles();
});

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
if(btnSelectAllToggles){
  btnSelectAllToggles.addEventListener("click", () => {
    callIfFunction(window.logEvent, "btnSelectAllToggles.click", "", "表示トグルをすべてオンにしました");
    for(const el of toggleInputs){
      el.checked = true;
    }
    syncViewToggles();
    for(const el of toggleInputs){
      el.dispatchEvent(new Event("change"));
    }
    closeViewToggleDrawer();
  });
}
if(btnClearAllToggles){
  btnClearAllToggles.addEventListener("click", () => {
    callIfFunction(window.logEvent, "btnClearAllToggles.click", "", "表示トグルをすべてオフにしました");
    for(const el of toggleInputs){
      el.checked = false;
    }
    syncViewToggles();
    for(const el of toggleInputs){
      el.dispatchEvent(new Event("change"));
    }
    closeViewToggleDrawer();
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
  asciiLink.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    callIfFunction(window.logEvent, "asciiLink.click", "", "ASCII 表を開きました");
    openAsciiModal();
  });
  asciiLink.addEventListener("click", (ev) => ev.stopPropagation());
}
if(asciiClose){
  asciiClose.addEventListener("click", (ev) => {
    ev.preventDefault();
    callIfFunction(window.logEvent, "asciiClose.click", "", "ASCII 表を閉じました");
    closeAsciiModal();
  });
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
    patternToggleText.textContent = dataPatternPanel.open ? CAPTION_HIDE_DATA_PATTERN : CAPTION_SHOW_DATA_PATTERN;
  }
}
if(dataPatternPanel){
  dataPatternPanel.addEventListener("toggle", () => {
    updatePatternToggleText();
    if(dataPatternPanel.open){
      refreshPattern({ force: true });
    }
  });
  updatePatternToggleText();
}

const historyCount = document.getElementById("historyCount");
const codeHistoryList = document.getElementById("codeHistoryList");
const codePanelElement = document.querySelector(".code-panel");
const btnToggleHistory = document.getElementById("btnToggleHistory");
const codePanelTitleRow = document.querySelector(".code-panel .panel-title-row");
const codeActionToolbar = document.querySelector(".code-action-toolbar");
const executionStatusElement = document.getElementById("executionStatus");
const executionStatusSubpanels = executionStatusElement
  ? executionStatusElement.querySelector(".execution-status-subpanels")
  : null;
let executionStatusCompactSticky = false;
const portraitMediaQuery = (typeof window !== "undefined" && typeof window.matchMedia === "function")
  ? window.matchMedia("(orientation: portrait)")
  : null;
const codeActionButtonLabels = [
  { el: btnCopyCode, normal: "コピー", portrait: "コ" },
  { el: btnPasteCode, normal: "貼付", portrait: "貼" },
  { el: btnFormatCode, normal: "整形", portrait: "整" },
  { el: btnClearCode, normal: "全消去", portrait: "消" },
  { el: btnToggleHistory, normal: "履歴", portrait: "履" },
];
const setCodeActionButtonText = (compact) => {
  codeActionButtonLabels.forEach((entry) => {
    if(!entry.el) return;
    const next = compact ? entry.portrait : entry.normal;
    if(entry.el.textContent !== next){
      entry.el.textContent = next;
    }
  });
};
const measureTitleSingleLineWidth = () => {
  if(!codePanelTitleRow) return 0;
  const title = codePanelTitleRow.querySelector(".panel-title");
  if(!title) return 0;
  const previous = title.style.whiteSpace;
  title.style.whiteSpace = "nowrap";
  const width = title.scrollWidth;
  title.style.whiteSpace = previous;
  return width;
};
const measureToolbarWidth = (compact) => {
  if(!codeActionToolbar) return 0;
  const previousLabels = codeActionButtonLabels.map((entry) => (entry.el ? entry.el.textContent : ""));
  setCodeActionButtonText(compact);
  const width = codeActionToolbar.scrollWidth;
  codeActionButtonLabels.forEach((entry, index) => {
    if(!entry.el) return;
    const previous = previousLabels[index];
    if(entry.el.textContent !== previous){
      entry.el.textContent = previous;
    }
  });
  return width;
};
const updateCodeActionButtonLabels = () => {
  const isPortrait = Boolean(portraitMediaQuery && portraitMediaQuery.matches);
  if(isPortrait){
    setCodeActionButtonText(true);
    if(codePanelElement){
      codePanelElement.classList.remove("compact-title-actions");
    }
    return;
  }
  if(!codePanelElement || !codePanelTitleRow || !codeActionToolbar){
    setCodeActionButtonText(false);
    return;
  }
  const wasStacked = codePanelElement.classList.contains("compact-title-actions");
  if(wasStacked){
    codePanelElement.classList.remove("compact-title-actions");
  }
  const panelStyle = window.getComputedStyle(codePanelElement);
  const panelPaddingLeft = Number.parseFloat(panelStyle.paddingLeft || "0");
  const panelPaddingRight = Number.parseFloat(panelStyle.paddingRight || "0");
  const panelInnerWidth = codePanelElement.clientWidth
    - (Number.isFinite(panelPaddingLeft) ? panelPaddingLeft : 0)
    - (Number.isFinite(panelPaddingRight) ? panelPaddingRight : 0);
  const rowWidth = Math.max(0, panelInnerWidth);
  const rowStyle = window.getComputedStyle(codePanelTitleRow);
  const gap = Number.parseFloat(rowStyle.columnGap || rowStyle.gap || "0");
  const spacer = Number.isFinite(gap) ? gap : 0;
  const titleWidth = measureTitleSingleLineWidth();
  const toolbarNormalWidth = measureToolbarWidth(false);
  const toolbarCompactWidth = measureToolbarWidth(true);
  const canSingleNormal = (titleWidth + spacer + toolbarNormalWidth) <= rowWidth;
  const canSingleCompact = (titleWidth + spacer + toolbarCompactWidth) <= rowWidth;
  const canStackNormal = titleWidth <= rowWidth && toolbarNormalWidth <= rowWidth;
  // 優先順:
  // 0. 1行 + 通常
  // 1. 1行 + 短縮
  // 2. 2行 + 通常
  // 3. 2行 + 短縮
  if(canSingleNormal){
    codePanelElement.classList.remove("compact-title-actions");
    setCodeActionButtonText(false);
    return;
  }
  if(canSingleCompact){
    codePanelElement.classList.remove("compact-title-actions");
    setCodeActionButtonText(true);
    return;
  }
  if(canStackNormal){
    codePanelElement.classList.add("compact-title-actions");
    setCodeActionButtonText(false);
    return;
  }
  codePanelElement.classList.add("compact-title-actions");
  setCodeActionButtonText(true);
};
const updateExecutionStatusCompactLayout = () => {
  if(!executionStatusElement || !executionStatusSubpanels) return;
  const isPortrait = Boolean(portraitMediaQuery && portraitMediaQuery.matches);
  if(isPortrait){
    executionStatusElement.classList.remove("compact-subpanels");
    executionStatusCompactSticky = false;
    return;
  }
  const width = executionStatusSubpanels.clientWidth;
  const enterWidthPx = 720;
  const exitWidthPx = 760;
  const needsCompact = executionStatusCompactSticky
    ? width < exitWidthPx
    : width < enterWidthPx;
  executionStatusCompactSticky = needsCompact;
  executionStatusElement.classList.toggle("compact-subpanels", needsCompact);
};
if(portraitMediaQuery){
  if(typeof portraitMediaQuery.addEventListener === "function"){
    portraitMediaQuery.addEventListener("change", updateCodeActionButtonLabels);
    portraitMediaQuery.addEventListener("change", updateExecutionStatusCompactLayout);
  }else if(typeof portraitMediaQuery.addListener === "function"){
    portraitMediaQuery.addListener(updateCodeActionButtonLabels);
    portraitMediaQuery.addListener(updateExecutionStatusCompactLayout);
  }
}
if(typeof window !== "undefined"){
  window.addEventListener("resize", updateCodeActionButtonLabels);
  window.addEventListener("load", updateCodeActionButtonLabels);
  window.addEventListener("resize", updateExecutionStatusCompactLayout);
  window.addEventListener("load", updateExecutionStatusCompactLayout);
}
if(typeof ResizeObserver !== "undefined" && codePanelTitleRow){
  const titleRowResizeObserver = new ResizeObserver(() => {
    updateCodeActionButtonLabels();
  });
  titleRowResizeObserver.observe(codePanelTitleRow);
}
if(typeof ResizeObserver !== "undefined" && codeActionToolbar){
  const toolbarResizeObserver = new ResizeObserver(() => {
    updateCodeActionButtonLabels();
  });
  toolbarResizeObserver.observe(codeActionToolbar);
}
if(typeof ResizeObserver !== "undefined" && executionStatusSubpanels){
  const statusResizeObserver = new ResizeObserver(() => {
    updateExecutionStatusCompactLayout();
  });
  statusResizeObserver.observe(executionStatusSubpanels);
}
updateCodeActionButtonLabels();
updateExecutionStatusCompactLayout();
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

window.layoutUI = layoutUI;
if(typeof window.refreshPatternForCreate !== "function"){
  window.refreshPatternForCreate = refreshPatternForCreate;
}
if(typeof window.refreshPatternIfPanelOpen !== "function"){
  window.refreshPatternIfPanelOpen = refreshPatternIfPanelOpen;
}
/**
 * レイアウト周りの定数/表示トグル/パターン出力ロジックをまとめたモジュール。
 */
