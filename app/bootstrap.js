/**
 * 最終的に window 入口APIを統一公開するブートストラップ処理。
 */
(function(){
  if(typeof window === "undefined") return;
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
    if(typeof window.__qrmakerSelfCheck === "function"){
      window.__qrmakerSelfCheck();
    }
  };

  loadSettings().then(startApp).catch(() => startApp({}));
})();
