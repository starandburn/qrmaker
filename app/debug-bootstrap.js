/**
 * デバッグ入口コンテナの最速初期化。
 * ui/debug.js より先に読み込むこと
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
