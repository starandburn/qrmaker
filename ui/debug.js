/**
 * デバッグパネル表示/ログ同期処理をまとめたモジュール
 */
(function(global){
  if(!global) return;

  let debugPanelElement = document.getElementById("debugPanel");
  let debugLogElement = document.getElementById("debugLog");
  const debugOnlyControlsList = Array.from(document.querySelectorAll(".debug-only"));
  const logBuffer = global._logBuffer || [];
  const shouldMirrorConsoleLogs = () => true;
  const safeConsoleLog = (value) => {
    if(!shouldMirrorConsoleLogs()) return;
    try{
      console.log(value);
    }catch(e){
      // ignore console errors
    }
  };
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
    return global.getComputedStyle(panel).display !== "none";
  }

  function flushLogBuffer(){
    const logEl = getDebugLogElement();
    if(!logEl) return;
    while(logBuffer.length){
      appendDebugLog(logBuffer.shift(), { raw: true });
    }
  }

  function formatEventMessage(fnName, mainArg, description){
    const clip = global.formatLogEventMessage || ((fnName, mainArg, description) => {
      const safeName = fnName || "unknown";
      const text = description ? `${safeName}: ${description}` : safeName;
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
    });
    return clip(fnName, mainArg, description);
  }

  function createDebugSync({ toggleDebugValues, dataPatternPanel, debugLog, isDebugVisible } = {}){
    function syncDebugOverlay(){
      const cellsWrap = document.querySelector(".qr-cells");
      if(!cellsWrap) return;
      const debugOn = typeof isDebugVisible === "function" ? isDebugVisible() : false;
      if(toggleDebugValues){
        const label = toggleDebugValues.closest("label");
        if(label){
          label.style.display = debugOn ? "inline-flex" : "none";
        }
      }
      const showValues = debugOn && toggleDebugValues && toggleDebugValues.checked;
      cellsWrap.classList.toggle("show-debug-values", showValues);
    }

    function syncDebugPanelLayout(){
      if(!debugLog) return;
      const baseMin = "80px";
      const baseMax = "110px";
      let minH = baseMin;
      let maxH = baseMax;
      const debugOn = typeof isDebugVisible === "function" ? isDebugVisible() : false;
      if(debugOn && dataPatternPanel && dataPatternPanel.open){
        minH = "70px";
        maxH = "80px";
      }
      debugLog.style.minHeight = minH;
      debugLog.style.maxHeight = maxH;
    }

    return {
      syncDebugOverlay,
      syncDebugPanelLayout,
    };
  }

  function logEvent(fnName, mainArg, description){
    const message = formatEventMessage(fnName, mainArg, description);
    const consoleDetails = {
      api: fnName || "unknown",
      args: mainArg,
      description,
      timestamp: new Date().toISOString(),
    };
    window.log(message, { consoleDetails, debugMessage: message });
  }

  window.log = (msg, { consoleDetails, debugMessage } = {}) => {
    const logEl = getDebugLogElement();
    if(logEl && logBuffer.length){
      const buffered = logBuffer.splice(0);
      for(const bufferedLine of buffered){
        appendDebugLog(bufferedLine, { raw: true });
      }
    }
    const text = String(debugMessage ?? msg);
    appendDebugLog(text);
    safeConsoleLog(consoleDetails ?? msg);
  };
  if(!global.__DEBUG_LOG_STARTED){
    global.__DEBUG_LOG_STARTED = true;
    window.log("ログを開始しました");
  }

  window.logEvent = logEvent;

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
  window.createDebugSync = createDebugSync;
})(typeof window !== "undefined" ? window : globalThis);
