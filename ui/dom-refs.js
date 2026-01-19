// ui/dom-refs.js
(function(global){
  if(!global) return;

  function createDomRefs(){
    const doc = global.document;
    const getById = (id) => (doc ? doc.getElementById(id) : null);
    const query = (sel) => (doc ? doc.querySelector(sel) : null);

    return {
      btnGenerate: getById("btnGenerate"),
      btnInit: getById("btnInit"),
      btnClearCode: getById("btnClearCode"),
      btnCopyCode: getById("btnCopyCode"),
      btnPasteCode: getById("btnPasteCode"),
      btnClear: getById("btnClear"),
      btnSampleDropdown: getById("btnSampleDropdown"),
      sampleDropdown: getById("sampleDropdown"),
      debugLog: getById("debugLog"),
      dataPatternPanel: getById("dataPatternPanel"),
      codePanel: query(".code-panel"),
      userCodeParsed: getById("userCodeParsed"),
      footerCopy: query(".page-footer p:first-child"),
      versionInfo: getById("appVersionInfo"),
      userCodeInput: getById("userCode"),
      btnToggleHistory: getById("btnToggleHistory"),
      btnPruneHistory: getById("btnPruneHistory"),
      codeHistoryList: getById("codeHistoryList"),
      stepMode: getById("stepMode"),
      stepSkipFunctions: getById("stepSkipFunctions"),
      stepSpeed: getById("stepSpeed"),
      stepSpeedLabel: query(".step-speed"),
      toggleDebugValues: getById("toggleDebugValues"),
      titleIcon: query(".title-icon"),
      toggleCursor: getById("toggleCursor"),
      toggleGuide: getById("toggleGuide"),
      toggleGrid: getById("toggleGrid"),
      toggleEmpty: getById("toggleEmpty"),
      toggleColor: getById("toggleColor"),
      txtInput: getById("txtInput"),
      noiseModeHint: getById("noiseModeHint"),
      executionStatusEl: getById("executionStatus"),
      executionStatusTextEl: getById("executionStatusText"),
      executionStatusCursorEl: getById("executionStatusCursor"),
      sampleDropdownMenu: getById("sampleDropdownMenu"),
      codeSampleToolbar: getById("codeSampleToolbar"),
      userCodeEditorHost: getById("userCodeEditor"),
    };
  }

  global.createDomRefs = createDomRefs;
})(typeof window !== "undefined" ? window : globalThis);
