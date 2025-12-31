let debugPanelElement = document.getElementById("debugPanel");
let debugLogElement = document.getElementById("debugLog");
const debugOnlyControlsList = Array.from(document.querySelectorAll(".debug-only"));
const logBuffer = window._logBuffer || [];
let lastLogBody = null;

const getDebugPanelElement = () => {
  if(debugPanelElement) return debugPanelElement;
  debugPanelElement = document.getElementById("debugPanel");
  return debugPanelElement;
};
if(!debugPanelElement && document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", () => {
    debugPanelElement = document.getElementById("debugPanel");
  }, { once: true });
}

const getDebugLogElement = () => {
  if(debugLogElement) return debugLogElement;
  debugLogElement = document.getElementById("debugLog");
  return debugLogElement;
};
if(!debugLogElement && document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", () => {
    debugLogElement = document.getElementById("debugLog");
  }, { once: true });
}

function applyDebugVisibility(visible){
  const isVisible = Boolean(visible);
  const panel = getDebugPanelElement();
  if(!panel) return;
  panel.style.display = isVisible ? "block" : "none";
  for(const control of debugOnlyControlsList){
    control.style.display = isVisible ? "inline-flex" : "none";
  }
}

function appendDebugLog(message, { raw = false } = {}){
  const text = raw ? String(message) : (() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `[${hh}:${mm}:${ss}] ${String(message)}`;
  })();
  const body = String(message);
  const logEl = getDebugLogElement();
  if(!logEl){
    logBuffer.push(text);
    return;
  }
  const first = logEl.firstChild;
  if(first && first.dataset && first.dataset.body === body){
    first.textContent += ".";
    return;
  }
  const line = document.createElement("div");
  line.className = "log-line";
  line.dataset.body = body;
  line.textContent = text;
  logEl.insertBefore(line, first || null);
  logEl.scrollTop = 0;
  lastLogBody = body;
}

function isDebugVisible(){
  const panel = getDebugPanelElement();
  if(!panel) return false;
  const styleDisp = panel.style.display;
  if(styleDisp){
    return styleDisp !== "none";
  }
  return getComputedStyle(panel).display !== "none";
}

function flushLogBuffer(){
  const logEl = getDebugLogElement();
  if(!logEl) return;
  while(logBuffer.length){
    appendDebugLog(logBuffer.shift(), { raw: true });
  }
}

window.log = (msg) => {
  const logEl = getDebugLogElement();
  if(logEl && logBuffer.length){
    const buffered = logBuffer.splice(0);
    for(const bufferedLine of buffered){
      appendDebugLog(bufferedLine, { raw: true });
    }
  }
  appendDebugLog(String(msg));
  try{
    console.log(msg);
  }catch(e){
    // ignore console errors
  }
};

const debugUI = {
  applyDebugVisibility,
  isDebugVisible,
  flushLogBuffer,
  get debugPanel(){
    return getDebugPanelElement();
  },
};

window.debugUI = Object.assign({}, window.debugUI || {}, debugUI);
const existingLayoutUI = window.layoutUI || {};
window.layoutUI = Object.assign({}, existingLayoutUI, {
  applyDebugVisibility,
});
