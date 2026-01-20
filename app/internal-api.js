// app/internal-api.js
(function(global){
  if(!global) return;
  if(typeof global.createInternalApi === "function") return;

  function createInternalApi(win){
    const internal = {};
    // Step & Thenable
    assignIfFunction(internal, "shouldStepFunctions", win.shouldStepFunctions);
    assignIfFunction(internal, "makeStepThenable", win.makeStepThenable);
    // Stepped Drawing
    assignIfFunction(internal, "drawBasePatternsStepped", win.drawBasePatternsStepped);
    assignIfFunction(internal, "drawDataPatternsStepped", win.drawDataPatternsStepped);
    // Run Control
    assignIfFunction(internal, "stopCurrentRun", win.stopCurrentRun);
    // Reset / State
    assignIfFunction(internal, "resetCommand", win.resetCommand);
    return internal;
  }

  global.createInternalApi = createInternalApi;
})(typeof window !== "undefined" ? window : globalThis);
