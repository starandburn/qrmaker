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
      focusCodeArea,
    } = deps || {};

    const bindHistoryToggle = () => {
      if(typeof setHistoryVisibility !== "function" || typeof getHistoryVisible !== "function") return;
      const btnToggleHistory = document.getElementById("btnToggleHistory");
      if(!btnToggleHistory) return;
      btnToggleHistory.addEventListener("click", () => {
        setHistoryVisibility(!getHistoryVisible());
        if(typeof focusCodeArea === "function"){
          focusCodeArea();
        }
      });
    };

    const bindPatternToggle = () => {
      if(typeof setPatternPanelOpen !== "function") return;
      const dataPatternPanel = document.getElementById("dataPatternPanel");
      if(!dataPatternPanel){
        throw new Error("dataPatternPanel is required");
      }
      dataPatternPanel.addEventListener("toggle", () => {
        setPatternPanelOpen(dataPatternPanel.open);
      });
    };

    bindHistoryToggle();
    bindPatternToggle();
  };

  global.bindUiEvents = bindUiEvents;
})(typeof window !== "undefined" ? window : globalThis);
