(function(){
  if(typeof runMainApp !== "function") return;
  const layoutUI = window.layoutUI || {};
  const urlState = window.urlState || {};
  runMainApp({ layoutUI, urlState });
})();
