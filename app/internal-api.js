// app/internal-api.js
(function(global){
  if(!global) return;
  if(typeof global.createInternalApi === "function") return;

  function createInternalApi(win){
    const internal = {};
    assignIfFunction(internal, "shouldStepFunctions", win.shouldStepFunctions);
    assignIfFunction(internal, "makeStepThenable", win.makeStepThenable);
    assignIfFunction(internal, "drawBasePatternsStepped", win.drawBasePatternsStepped);
    assignIfFunction(internal, "drawDataPatternsStepped", win.drawDataPatternsStepped);
    assignIfFunction(internal, "stopCurrentRun", win.stopCurrentRun);
    assignIfFunction(internal, "resetCommand", win.resetCommand);
    return internal;
  }

  global.createInternalApi = createInternalApi;
})(typeof window !== "undefined" ? window : globalThis);
