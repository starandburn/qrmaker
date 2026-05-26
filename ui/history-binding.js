// ui/history-binding.js
(function(global){
  if(!global) return;

  function bindHistoryUI({
    dom,
    layoutUI,
    store,
    historyController,
    getCurrentCodeValue,
    setHistoryVisibility,
    getHistoryVisible,
    focusCodeArea,
  } = {}){
    if(!historyController) return;
    const renderHistoryList = (entries) => {
      if(typeof layoutUI?.renderHistoryList === "function"){
        layoutUI.renderHistoryList(entries);
      }
    };
    historyController.setRenderer(renderHistoryList);
    if(typeof getCurrentCodeValue === "function"){
      historyController.setValueGetter(getCurrentCodeValue);
    }
    const btnPruneHistory = dom ? dom.btnPruneHistory : null;
    if(btnPruneHistory){
      btnPruneHistory.addEventListener("click", historyController.pruneHistoryEntries);
    }
    const codeHistoryList = dom ? dom.codeHistoryList : null;
    const userCodeInput = dom ? dom.userCodeInput : null;
    if(codeHistoryList){
      codeHistoryList.addEventListener("click", (ev) => {
        if(userCodeInput && userCodeInput.readOnly) return;
        const target = (typeof Element !== "undefined" && ev.target instanceof Element) ? ev.target : null;
        const item = target ? target.closest("li[data-index]") : null;
        if(!item) return;
        const index = Number(item.getAttribute("data-index"));
        if(Number.isNaN(index)) return;
        const entry = historyController.getEntry(index);
        if(!entry || !userCodeInput) return;
        userCodeInput.value = entry.value;
        userCodeInput.selectionStart = userCodeInput.selectionEnd = 0;
        userCodeInput.scrollTop = 0;
        userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
        if(typeof focusCodeArea === "function"){
          focusCodeArea();
        }
      });
    }
  }

  global.bindHistoryUI = bindHistoryUI;
})(typeof window !== "undefined" ? window : globalThis);
