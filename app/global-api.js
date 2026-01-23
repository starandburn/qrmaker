// app/global-api.js
(function(global){
  if(!global) return;
  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");
  const isDefined = typeUtils.isDefined || ((value) => typeof value !== "undefined");
  if(isFunction(global.registerGlobalApi) && isFunction(global.buildQrmakerObject)) return;

  function buildQrmakerObject(win, api){
    const qrmaker = { public: {}, internal: {} };
    const internalApi = (isFunction(win.createInternalApi))
      ? win.createInternalApi(win, api)
      : null;
    if(internalApi){
      qrmaker.internal = internalApi;
    }
    const commands = (isFunction(win.createCommands))
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
      if(isDefined(api[key])){
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
      "drawQRCode",
      "drawDataPatterns",
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
