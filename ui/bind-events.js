// ui/bind-events.js
(function(global){
  if(!global) return;
  if(typeof global.bindSimpleUiEvents === "function") return;

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

  global.bindSimpleUiEvents = bindSimpleUiEvents;
})(typeof window !== "undefined" ? window : globalThis);
