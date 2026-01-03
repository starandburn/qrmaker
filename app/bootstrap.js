(function(){
  if(typeof runMainApp !== "function") return;
  const layoutUI = window.layoutUI || {};
  const urlState = window.urlState || {};
  const debugUI = window.debugUI || {};
  runMainApp({ layoutUI, urlState, debugUI });
})();
