(function(){
  if(typeof window === "undefined") return;
  const publishWindowApi = () => {
    const win = window;
    const api = win.__deferredWindowApi || {};
    const assign = (name, fn) => {
      if(typeof fn === "function"){
        win[name] = fn;
      }
    };
    assign("applyMask", api.applyMask);
    assign("drawBasePatterns", api.drawBasePatterns);
    assign("drawBasePatternsStepped", api.drawBasePatternsStepped);
    assign("makeStepThenable", api.makeStepThenable);
    assign("shouldStepFunctions", api.shouldStepFunctions);
    if(api.qrLegacyDrawers && typeof api.qrLegacyDrawers === "object"){
      win.qrLegacyDrawers = api.qrLegacyDrawers;
    }
  };
  window.publishWindowApi = publishWindowApi;
  if(typeof runMainApp !== "function") return;
  const layoutUI = window.layoutUI || {};
  const urlState = window.urlState || {};
  const debugUI = window.debugUI || {};
  runMainApp({ layoutUI, urlState, debugUI });
  publishWindowApi();
})();
