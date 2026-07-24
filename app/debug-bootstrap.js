/**
 * Debug bootstrap for wiring debug container state before loading ui/debug.js.
 */
(function(){
  if(typeof window === "undefined") return;

  if(window.qrmakerDebug){
    return;
  }

  window.qrmakerDebug = {
    ui: {},
    hooks: {},
    flags: {},
    state: {},
    log: {},
  };
})();
