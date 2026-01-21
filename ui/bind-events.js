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

  function beginGenerateClick(ctx){
    if(!ctx) return null;
    const uiState = ctx.uiState;
    const setExecutionStatus = ctx.setExecutionStatus;
    const setInputLock = ctx.setInputLock;
    const lockToken = (typeof global.acquireUiInputLock === "function")
      ? global.acquireUiInputLock(uiState)
      : (() => {
        const fallbackToken = uiState.inputLockToken + 1;
        uiState.setInputLockToken(fallbackToken);
        return fallbackToken;
      })();
    if(typeof setExecutionStatus === "function"){
      setExecutionStatus("running");
    }
    if(typeof setInputLock === "function"){
      setInputLock(true);
    }
    return { lockToken };
  }

  function endGenerateClick(ctx, token){
    if(!ctx || !token) return;
    const uiState = ctx.uiState;
    const setInputLock = ctx.setInputLock;
    const lockToken = token.lockToken;
    if(lockToken === uiState.inputLockToken){
      if(typeof setInputLock === "function"){
        setInputLock(false);
      }
      if(typeof global.releaseUiInputLockIfMatched === "function"){
        global.releaseUiInputLockIfMatched(uiState, lockToken);
      }else{
        uiState.clearInputLockToken();
      }
    }
  }

  if(typeof global.bindSimpleUiEvents !== "function"){
    global.bindSimpleUiEvents = bindSimpleUiEvents;
  }
  if(typeof global.beginGenerateClick !== "function"){
    global.beginGenerateClick = beginGenerateClick;
  }
  if(typeof global.endGenerateClick !== "function"){
    global.endGenerateClick = endGenerateClick;
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
