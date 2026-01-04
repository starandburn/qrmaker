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
    assign("syncViewToggles", api.syncViewToggles);
    if(Array.isArray(api.toggleInputs)){
      win.toggleInputs = api.toggleInputs;
    }
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
