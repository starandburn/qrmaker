/**
 * 最終的に window 入口APIを統一公開するブートストラップ処理。
 */
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
    assign("buildQRCode", api.buildQRCode);
    assign("drawQRCode", api.drawQRCode);
    assign("drawDataPatterns", api.drawDataPatterns);
    assign("drawFunctionalPatterns", api.drawFunctionalPatterns);
    assign("initializeQRCode", api.initializeQRCode);
    assign("resetQRCode", api.resetQRCode);
    assign("resetCommand", api.resetCommand);
    assign("stopCurrentRun", api.stopCurrentRun);
    assign("drawFormatPatterns", api.drawFormatPatterns);
    assign("drawFinderPatterns", api.drawFinderPatterns);
    assign("drawAlignmentPatterns", api.drawAlignmentPatterns);
    assign("drawDarkModulePatterns", api.drawDarkModulePatterns);
    assign("drawTimingPatterns", api.drawTimingPatterns);
    assign("putFinderCells", api.putFinderCells);
    assign("putAlignmentCells", api.putAlignmentCells);
    assign("putTimingCells", api.putTimingCells);
    assign("putDarkModuleCells", api.putDarkModuleCells);
    assign("putFormatCells", api.putFormatCells);
    assign("clearBoard", api.clearBoard);
    assign("syncViewToggles", api.syncViewToggles);
    if(Array.isArray(api.toggleInputs)){
      win.toggleInputs = api.toggleInputs;
    }
  };
  window.publishWindowApi = publishWindowApi;
  if(typeof runMainApp !== "function") return;
  if(!window.layoutUI){
    throw new Error("ui/layout.js must be loaded before app/bootstrap.js.");
  }
  if(!window.urlState){
    throw new Error("state/url-state.js must be loaded before app/bootstrap.js.");
  }
  const layoutUI = window.layoutUI;
  const urlState = window.urlState;
  const debugUI = window.debugUI || {};
  const loadSettings = async () => {
    if(typeof window.appSettingsFromScript === "object" && window.appSettingsFromScript !== null){
      return window.appSettingsFromScript;
    }
    return null;
  };

  const startApp = (settings) => {
    const safeSettings = (settings && typeof settings === "object") ? settings : {};
    window.appSettings = safeSettings;
    runMainApp({ layoutUI, urlState, debugUI, settings: safeSettings });
    publishWindowApi();
    if(typeof window.__qrmakerSelfCheck === "function"){
      window.__qrmakerSelfCheck();
    }
  };

  loadSettings().then(startApp).catch(() => startApp({}));
})();
