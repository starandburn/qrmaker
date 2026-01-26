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
  const ensureObject = (value) => (value && typeof value === "object") ? value : {};
  if(window.qrmakerDebug && window.qrmakerDebug._bootstrapInitialized){
    console.warn("qrmakerDebug is already defined; duplicate load detected");
  }
  if(!window.qrmakerDebug){
    window.qrmakerDebug = {
      ui: {},
      hooks: {},
      flags: {},
      state: {},
      log: {},
    };
  }
  window.qrmakerDebug.ui = ensureObject(window.qrmakerDebug.ui);
  window.qrmakerDebug.hooks = ensureObject(window.qrmakerDebug.hooks);
  window.qrmakerDebug.flags = ensureObject(window.qrmakerDebug.flags);
  window.qrmakerDebug.state = ensureObject(window.qrmakerDebug.state);
  window.qrmakerDebug.log = ensureObject(window.qrmakerDebug.log);
  window.qrmakerDebug._bootstrapInitialized = true;
  const layoutUI = window.layoutUI;
  const urlState = window.urlState;
  const debugUI = window.qrmakerDebug.ui;
  const loadSettings = async () => {
    if(typeof window.appSettingsFromScript === "object" && window.appSettingsFromScript !== null){
      return window.appSettingsFromScript;
    }
    return null;
  };

  const startApp = (settings) => {
    const safeSettings = (settings && typeof settings === "object") ? settings : {};

  const injected = window.appCodeSamplesFromScript;
  if (Array.isArray(injected)) {
    safeSettings.defaults = safeSettings.defaults && typeof safeSettings.defaults === "object"
      ? safeSettings.defaults
      : {};
    safeSettings.defaults.codeSamples = injected;
  }

    window.appSettings = safeSettings;
    runMainApp({ layoutUI, urlState, debugUI, settings: safeSettings });
    callIfFunction(window.__qrmakerSelfCheck);
  };

  loadSettings().then(startApp).catch(() => startApp({}));
})();
