(function(global){
  if(!global) return;
  const exports = global.__debugUIExports || {};
  global.debugUI = Object.assign(global.debugUI || {}, exports);
  if(exports.applyDebugVisibility){
    const existingLayoutUI = global.layoutUI || {};
    global.layoutUI = Object.assign({}, existingLayoutUI, {
      applyDebugVisibility: exports.applyDebugVisibility,
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
