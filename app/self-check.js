(function(){
  const REQUIRED_DOM_IDS = [
    "txtInput",
    "userCode",
    "userCodeParsed",
    "userCodeEditor",
    "btnGenerate",
    "btnInit",
    "btnClear",
    "btnClearCode",
    "btnCopyCode",
    "btnPasteCode",
    "btnSampleDropdown",
    "sampleDropdown",
    "sampleDropdownMenu",
    "codeSampleToolbar",
    "dataPatternPanel",
    "codeHistoryList",
    "btnToggleHistory",
    "btnPruneHistory",
    "stepMode",
    "stepSpeed",
    "stepSkipFunctions",
    "executionStatus",
    "executionStatusText",
    "executionStatusCursor",
    "toggleCursor",
    "toggleGuide",
    "toggleGrid",
    "toggleEmpty",
    "toggleColor",
    "toggleDebugValues",
    "debugPanel",
    "debugLog",
    "noiseModeHint",
    "appVersionInfo",
  ];

  const REQUIRED_WINDOW_APIS = [
    "drawQRCode",
    "resetQRCode",
    "clearBoard",
    "resetCommand",
    "stopCurrentRun",
    "syncViewToggles",
    "applyMask",
    "drawBasePatterns",
    "drawBasePatternsStepped",
    "drawDataPatterns",
    "drawFunctionalPatterns",
    "drawText",
    "drawFormatPatterns",
    "drawFinderPatterns",
    "drawAlignmentPatterns",
    "drawDarkModulePatterns",
    "drawTimingPatterns",
  ];

  const hasDocument = () => (typeof document === "object" && document !== null);
  const hasConsole = () => (typeof console === "object" && console !== null && typeof console.error === "function");
  const globalWindow = (typeof window !== "undefined" && window !== null) ? window : null;
  if(!globalWindow) return;

  const collectMissingDom = () => {
    if(!hasDocument()){
      return REQUIRED_DOM_IDS.slice();
    }
    return REQUIRED_DOM_IDS.filter((id) => document.getElementById(id) === null);
  };

  const collectMissingApis = () => {
    return REQUIRED_WINDOW_APIS.filter((name) => typeof globalWindow[name] !== "function");
  };

  globalWindow.__qrmakerSelfCheck = function(){
    if(!hasConsole()) return;
    const missingDom = collectMissingDom();
    const missingApis = collectMissingApis();
    if(!missingDom.length && !missingApis.length) return;
    const lines = ["[qrmaker self check] 外部契約の不足を検出しました:"];
    if(missingDom.length){
      lines.push(`- DOM 要素なし: ${missingDom.join(", ")}`);
    }
    if(missingApis.length){
      lines.push(`- 公開 API 関数なし: ${missingApis.join(", ")}`);
    }
    console.error(lines.join("\n"));
  };
})();
