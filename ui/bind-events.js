// ui/bind-events.js
(function(global){
  if(!global) return;

  function bindSimpleUiEvents(ctx){
    if(!ctx) return;
    const dom = ctx.dom;
    if(typeof document !== "undefined"){
      const allButtons = document.querySelectorAll("button");
      for(const btn of allButtons){
        btn.setAttribute("draggable", "false");
        btn.addEventListener("dragstart", (ev) => ev.preventDefault());
        btn.addEventListener("selectstart", (ev) => ev.preventDefault());
        btn.addEventListener("mousedown", (ev) => {
          if(ev.detail > 1){
            ev.preventDefault();
          }
        });
      }
    }
    const codePanel = dom?.codePanel;
    if(codePanel){
      const codeTitle = codePanel.querySelector(".panel-title");
      if(codeTitle){
        codeTitle.addEventListener("dblclick", () => {
          codePanel.classList.toggle("show-samples");
        });
      }
    }
  }

  if(typeof global.bindSimpleUiEvents !== "function"){
    global.bindSimpleUiEvents = bindSimpleUiEvents;
  }

  if(typeof global.acquireUiInputLock !== "function"){
    global.acquireUiInputLock = (uiState) => {
      const lockToken = uiState.inputLockToken + 1;
      uiState.setInputLockToken(lockToken);
      return lockToken;
    };
  }
  if(typeof global.releaseUiInputLockIfMatched !== "function"){
    global.releaseUiInputLockIfMatched = (uiState, lockToken) => {
      if(lockToken === uiState.inputLockToken){
        uiState.clearInputLockToken();
      }
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
