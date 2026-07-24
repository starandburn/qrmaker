/**
 * UI controls module for toggle setup, step controls, and related helpers.
 */
(function(global){
  function initUIControls(opts = {}){
    const {
      toggleCursor,
      toggleGuide,
      toggleGrid,
      toggleEmpty,
      toggleColor,
      toggleDebugValues,
      stepMode,
      stepSkipFunctions,
      footerCopy,
      getDebugPanel,
      applyDebugVisibility,
      syncDebugOverlay,
      syncDebugPanelLayout,
      syncParsedCode,
      isDebugVisible,
      requestAnimationFrame,
      syncViewLayout,
    } = opts;

    const TOGGLE_FLAG_ORDER = [
      toggleCursor,
      toggleGuide,
      toggleGrid,
      toggleEmpty,
      toggleColor,
      toggleDebugValues,
    ];

    const readToggleDefault = (target) => {
      if(!target || typeof target.checked !== "boolean") return false;
      return typeof target.defaultChecked === "boolean" ? target.defaultChecked : Boolean(target.checked);
    };
    const defaultFlagString = TOGGLE_FLAG_ORDER.map((target) => (readToggleDefault(target) ? "1" : "0")).join("");

    const buildFlagString = () => {
      return TOGGLE_FLAG_ORDER.map((target) => {
        if(!target || typeof target.checked !== "boolean") return "0";
        return target.checked ? "1" : "0";
      }).join("");
    };

    const applyToggleFlags = (flagString) => {
      if(typeof flagString !== "string") return { applied: false };
      const bits = flagString.replace(/[^01]/g, "").split("");
      if(bits.length === 0) return { applied: false };
      let viewNeedsRefresh = false;
      let colorChanged = false;
      let debugChanged = false;
      let stepNeedsRefresh = false;
      bits.forEach((bit, index) => {
        const target = TOGGLE_FLAG_ORDER[index];
        if(!target) return;
        if(typeof target.checked !== "boolean") return;
        const checked = bit === "1";
        if(target.checked === checked) return;
        target.checked = checked;
        if([toggleCursor, toggleGuide, toggleGrid, toggleEmpty].includes(target)){
          viewNeedsRefresh = true;
        }
        if(target === toggleColor){
          colorChanged = true;
        }
        if(target === toggleDebugValues){
          debugChanged = true;
        }
        if(target === stepMode || target === stepSkipFunctions){
          stepNeedsRefresh = true;
        }
      });
      return {
        applied: true,
        viewNeedsRefresh,
        colorChanged,
        debugChanged,
        stepNeedsRefresh,
      };
    };

    const setupFooterDebugToggle = () => {
      const panel = (typeof getDebugPanel === "function") ? getDebugPanel() : null;
      if(!footerCopy || !panel) return;
      footerCopy.addEventListener("dblclick", () => {
        const nextVisible = (typeof isDebugVisible === "function") ? !isDebugVisible() : true;
        callIfFunction(applyDebugVisibility, nextVisible);
        callIfFunction(syncDebugOverlay);
        callIfFunction(syncDebugPanelLayout);
        callIfFunction(syncParsedCode);
        if(typeof requestAnimationFrame === "function" && typeof syncViewLayout === "function"){
          requestAnimationFrame(syncViewLayout);
        }
      });
    };

    return {
      defaultFlagString,
      buildFlagString,
      applyToggleFlags,
      setupFooterDebugToggle,
    };
  }

  global.initUIControls = initUIControls;
})(typeof window !== "undefined" ? window : globalThis);
