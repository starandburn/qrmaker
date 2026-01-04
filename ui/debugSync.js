(function(global){
  if(!global) return;
  const exports = global.__debugUIExports || {};
  if(typeof exports.createDebugSync === "function"){
    global.createDebugSync = exports.createDebugSync;
  }
})(typeof window !== "undefined" ? window : globalThis);
