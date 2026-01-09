/**
 * UIイベント（履歴パネルトグル、パターンパネルトグル等）のバインディングをまとめたエントリ。
 */
(function(global){
  if(!global) return;

  const bindUiEvents = (deps = {}) => {
    const {
      setHistoryVisibility,
      getHistoryVisible,
      setPatternPanelOpen,
    } = deps || {};

    const bindHistoryToggle = () => {
      if(typeof setHistoryVisibility !== "function" || typeof getHistoryVisible !== "function") return;
      const btnToggleHistory = document.getElementById("btnToggleHistory");
      if(!btnToggleHistory) return;
      btnToggleHistory.addEventListener("click", () => {
        setHistoryVisibility(!getHistoryVisible());
      });
    };

    const bindPatternToggle = () => {
      if(typeof setPatternPanelOpen !== "function") return;
      const dataPatternPanel = document.getElementById("dataPatternPanel") || document.getElementById("patternDetails");
      if(!dataPatternPanel) return;
      dataPatternPanel.addEventListener("toggle", () => {
        setPatternPanelOpen(dataPatternPanel.open);
      });
    };

    bindHistoryToggle();
    bindPatternToggle();
  };

  global.bindUiEvents = bindUiEvents;
})(typeof window !== "undefined" ? window : globalThis);
