(function(global){
  if(!global) return;

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

  global.createDebugSync = createDebugSync;
})(typeof window !== "undefined" ? window : globalThis);
