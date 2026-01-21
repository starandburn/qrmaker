// app/global-api.js
(function(global){
  if(!global) return;
  if(typeof global.registerGlobalApi === "function" && typeof global.buildQrmakerObject === "function") return;

  function buildQrmakerObject(win, api){
    const qrmaker = { public: {}, internal: {} };
    const internalApi = (typeof win.createInternalApi === "function")
      ? win.createInternalApi(win, api)
      : null;
    if(internalApi){
      qrmaker.internal = internalApi;
    }
    const commands = (typeof win.createCommands === "function")
      ? win.createCommands(win, api)
      : null;
    if(commands && commands.public){
      qrmaker.public = commands.public;
    }
    return qrmaker;
  }

  function registerGlobalApi(api){
    // A. Guard + window handle
    if(typeof window === "undefined") return;
    if(!api) return;
    const win = window;
    // C. Value exports
    const valueKeys = [
      "skipExistingCells",
      "autoAvoidTiming",
      "useDirection",
      "isDrawingBasePattern",
      "basePatternLookahead",
      "RENDER_IMMEDIATE",
      "RENDER_BUFFERED",
      "boardMatrix",
    ];
    for(const key of valueKeys){
      if(typeof api[key] !== "undefined"){
        win[key] = api[key];
      }
    }
    // D. Function exports
    const fnKeys = [
      "isStepModeOn",
      "updateExecutionStatusCursor",
      "setBasePatternLookahead",
      "getNextBasePatternInfos",
      "setRenderMode",
      "shouldStepFunctions",
      "updateCursor",
      "getNextData",
      "invertCell",
      "buildFunctionSet",
      "parseCellRef",
      "cellRefFromRowCol",
      "moveCursor",
      "turnCursor",
      "setSwitch",
      "isSwitchOn",
      "toggleSwitchState",
      "applyMask",
      "drawBasePatterns",
      "drawBasePatternsStepped",
      "drawFunctionalPatterns",
      "drawQRCode",
      "drawDataPatterns",
      "initializeQRCode",
      "resetQRCode",
      "clearBoard",
      "resetCommand",
      "stopCurrentRun",
      "drawFormatPatterns",
      "drawFinderPatterns",
      "drawAlignmentPatterns",
      "drawDarkModulePatterns",
      "drawTimingPatterns",
      "putFinderCells",
      "putAlignmentCells",
      "putTimingCells",
      "putDarkModuleCells",
      "dark",
      "darkmodule",
      "putFormatCells",
      "makeStepThenable",
    ];
    for(const key of fnKeys){
      assignIfFunction(win, key, api[key]);
    }
    // E. qrmaker public/internal (keep current behavior)
    const qrmaker = buildQrmakerObject(win, api);
    if(qrmaker) win.qrmaker = qrmaker;
  }

  global.buildQrmakerObject = buildQrmakerObject;
  global.registerGlobalApi = registerGlobalApi;
})(typeof window !== "undefined" ? window : globalThis);
