let debugPanelElement = document.getElementById("debugPanel");
const debugOnlyControlsList = Array.from(document.querySelectorAll(".debug-only"));

const getDebugPanelElement = () => {
  if(debugPanelElement) return debugPanelElement;
  debugPanelElement = document.getElementById("debugPanel");
  return debugPanelElement;
};
if(!debugPanelElement && document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", () => {
    debugPanelElement = document.getElementById("debugPanel");
  }, { once: true });
}

function applyDebugVisibility(visible){
  const isVisible = Boolean(visible);
  const panel = getDebugPanelElement();
  if(!panel) return;
  panel.style.display = isVisible ? "block" : "none";
  for(const control of debugOnlyControlsList){
    control.style.display = isVisible ? "inline-flex" : "none";
  }
}

function isDebugVisible(){
  const panel = getDebugPanelElement();
  if(!panel) return false;
  const styleDisp = panel.style.display;
  if(styleDisp){
    return styleDisp !== "none";
  }
  return getComputedStyle(debugPanelElement).display !== "none";
}

const debugUI = {
  applyDebugVisibility,
  isDebugVisible,
  get debugPanel(){
    return getDebugPanelElement();
  },
};

window.debugUI = Object.assign({}, window.debugUI || {}, debugUI);
const existingLayoutUI = window.layoutUI || {};
window.layoutUI = Object.assign({}, existingLayoutUI, {
  applyDebugVisibility,
});
