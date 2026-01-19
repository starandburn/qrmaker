// ui/view-flags.js
(function(global){
  if(!global) return;

  function setupViewFlags({
    dom,
    configDefaults,
    settings,
    urlState,
    store,
    requestRender,
    setRenderMode,
    RENDER_IMMEDIATE,
    logEvent,
    onColorChange,
  } = {}){
    let isColorEnabled = undefined;
    const toggleCursor = dom ? dom.toggleCursor : null;
    const toggleGuide = dom ? dom.toggleGuide : null;
    const toggleGrid = dom ? dom.toggleGrid : null;
    const toggleEmpty = dom ? dom.toggleEmpty : null;
    const toggleColor = dom ? dom.toggleColor : null;
    const toggleDebugValues = dom ? dom.toggleDebugValues : null;
    const viewOverrides = configDefaults.viewFlags || {};
    const viewOverridePairs = [
      { key: "viewCursor", element: toggleCursor },
      { key: "viewGuide", element: toggleGuide },
      { key: "viewGrid", element: toggleGrid },
      { key: "viewEmpty", element: toggleEmpty },
      { key: "viewColor", element: toggleColor },
      { key: "viewDebugValues", element: toggleDebugValues },
    ];
    viewOverridePairs.forEach(({ element, key }) => {
      if(!element) return;
      const overrideValue = viewOverrides[key];
      if(typeof overrideValue !== "boolean") return;
      element.checked = overrideValue;
      if(typeof element.defaultChecked === "boolean"){
        element.defaultChecked = overrideValue;
      }
      if(key === "viewColor"){
        isColorEnabled = overrideValue;
      }
    });

    const colorToggleEl = toggleColor;
    if(colorToggleEl){
      colorToggleEl.addEventListener("change", () => {
        isColorEnabled = !!colorToggleEl.checked;
        if(typeof onColorChange === "function"){
          onColorChange(isColorEnabled);
        }
      });
    }

    return {
      isColorEnabled: () => isColorEnabled,
    };
  }

  global.setupViewFlags = setupViewFlags;
})(typeof window !== "undefined" ? window : globalThis);
