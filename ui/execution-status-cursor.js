// ui/execution-status-cursor.js
(function(global){
  if(!global) return;

  function createExecutionStatusCursor({
    dom,
    getCursorState,
    getBoardCellInfo,
    isCursorVisible,
    logEvent,
  } = {}){
    const updateExecutionStatusCursor = () => {
      const executionStatusCursorEl = dom ? dom.executionStatusCursorEl : null;
      if(!executionStatusCursorEl) return;
      if(typeof isCursorVisible === "function" && !isCursorVisible()){
        executionStatusCursorEl.textContent = "";
        return;
      }
      const cursorState = (typeof getCursorState === "function") ? getCursorState() : null;
      if(!cursorState) return;
      const row = cursorState.row;
      const col = cursorState.col;
      const dir = cursorState.dir;
      const ref = cursorState.ref || "";
      const directionEnabled = cursorState.directionEnabled === true;
      const dirConstants = cursorState.dirConstants || {};
      const switchIndicatorGroupEl = cursorState.switchIndicatorGroupEl || null;
      const {
        DIR_UP,
        DIR_RIGHT,
        DIR_DOWN,
        DIR_LEFT,
      } = dirConstants;
      const boardInfo = (typeof getBoardCellInfo === "function") ? getBoardCellInfo() : null;
      const getCurrentValue = boardInfo ? boardInfo.getCurrentValue : null;
      const getCurrentKind = boardInfo ? boardInfo.getCurrentKind : null;
      const colorsForKind = boardInfo ? boardInfo.colorsForKind : null;
      const isBlackBit = boardInfo ? boardInfo.isBlackBit : null;
      const unplacedKind = (boardInfo && typeof boardInfo.unplacedKind === "number") ? boardInfo.unplacedKind : -1;
      const basePatternActive = Boolean(boardInfo ? boardInfo.isDrawingBasePattern : false);
      const getNextBasePatternInfos = boardInfo ? boardInfo.getNextBasePatternInfos : null;
      const getNextDataInfos = boardInfo ? boardInfo.getNextDataInfos : null;
      const getNextDataInfo = boardInfo ? boardInfo.getNextDataInfo : null;

      let cursorTextEl = executionStatusCursorEl.querySelector(".execution-status-cursor-text");
      let cursorCellEl = executionStatusCursorEl.querySelector(".execution-status-cell");
      let cursorInlineLabelEl = executionStatusCursorEl.querySelector(".execution-status-cursor-inline-label");
      let nextLabelEl = executionStatusCursorEl.querySelector(".execution-status-next-label");
      let nextListEl = executionStatusCursorEl.querySelector(".execution-status-next-list");
      let cursorBodyEl = executionStatusCursorEl.querySelector(".execution-status-cursor-body");
      if(!cursorTextEl){
        cursorTextEl = document.createElement("span");
        cursorTextEl.className = "execution-status-cursor-text";
      }
      if(!cursorCellEl){
        cursorCellEl = document.createElement("span");
        cursorCellEl.className = "execution-status-cell";
      }
      if(!cursorInlineLabelEl){
        cursorInlineLabelEl = document.createElement("span");
        cursorInlineLabelEl.className = "execution-status-label execution-status-label-chip execution-status-cursor-inline-label";
        cursorInlineLabelEl.dataset.labelKind = "cursor";
      }
      if(!nextLabelEl){
        nextLabelEl = document.createElement("span");
        nextLabelEl.className = "execution-status-label execution-status-label-chip execution-status-next-label";
        nextLabelEl.dataset.labelKind = "next";
      }
      const NEXT_CELL_COUNT = 4;
      if(!nextListEl){
        nextListEl = document.createElement("span");
        nextListEl.className = "execution-status-next-list";
      }
      if(nextListEl.childElementCount !== NEXT_CELL_COUNT){
        nextListEl.textContent = "";
        for(let i = 0; i < NEXT_CELL_COUNT; i++){
          const cell = document.createElement("span");
          cell.className = "execution-status-next-cell";
          nextListEl.append(cell);
        }
      }
      const nextCells = Array.from(nextListEl.children);
      if(!cursorBodyEl){
        cursorBodyEl = document.createElement("span");
        cursorBodyEl.className = "execution-status-cursor-body";
      }
      cursorInlineLabelEl.textContent = "Cursor";
      cursorBodyEl.textContent = "";
      const cursorBodyChildren = [];
      if(switchIndicatorGroupEl){
        cursorBodyChildren.push(switchIndicatorGroupEl);
      }
      cursorBodyChildren.push(
        cursorInlineLabelEl,
        cursorTextEl,
        cursorCellEl,
        nextLabelEl,
        nextListEl,
      );
      cursorBodyEl.append(...cursorBodyChildren);
      executionStatusCursorEl.textContent = "";
      executionStatusCursorEl.append(cursorBodyEl);
      let cursorVisualEl = cursorCellEl.querySelector(".execution-status-visual-cursor");
      if(!cursorVisualEl){
        cursorVisualEl = document.createElement("span");
        cursorVisualEl.className = "execution-status-visual-cursor";
        cursorCellEl.append(cursorVisualEl);
      }
      const colorMap = {
        red: ["var(--col-red-light)", "var(--col-red-dark)"],
        blue: ["var(--col-blue-light)", "var(--col-blue-dark)"],
        green: ["var(--col-green-light)", "var(--col-green-dark)"],
        yellow: ["var(--col-yellow-light)", "var(--col-yellow-dark)"],
        purple: ["var(--col-purple-light)", "var(--col-purple-dark)"],
        orange: ["var(--col-orange-light)", "var(--col-orange-dark)"],
        gray: ["var(--col-gray-light)", "var(--col-gray-dark)"],
        format: ["var(--col-format-blue-light)", "var(--col-format-blue-dark)"],
        black: ["var(--col-black-light)", "var(--col-black-dark)"],
      };
      const resetNextCell = (cellEl) => {
        if(!cellEl) return;
        cellEl.style.backgroundColor = "#ffffff";
        cellEl.style.borderColor = "#999999";
        cellEl.style.boxShadow = "";
      };
      const applyNextCellInfo = (cellEl, info) => {
        if(!cellEl) return;
        if(!info || typeof info.kind !== "number" || typeof info.bit !== "number"){
          resetNextCell(cellEl);
          return;
        }
        const colName = (typeof colorsForKind === "function")
          ? colorsForKind(info.kind)
          : "black";
        const resolved = colorMap[colName] || colorMap.black;
        const bitIsBlack = info.bit === 1;
        const fill = bitIsBlack ? resolved[1] : resolved[0];
        const border = bitIsBlack ? resolved[0] : resolved[1];
        cellEl.style.backgroundColor = fill;
        cellEl.style.borderColor = border;
        cellEl.style.boxShadow = "";
      };
      const rowText = String(row).padStart(2, " ");
      const colText = String(col).padStart(2, " ");
      const dirSymbol = (() => {
        switch(dir){
          case DIR_UP: return "\u25B2";
          case DIR_RIGHT: return "\u25B6";
          case DIR_DOWN: return "\u25BC";
          case DIR_LEFT: return "\u25C0";
          default: return "\u25B2";
        }
      })();
      const dirName = (() => {
        switch(dir){
          case DIR_UP: return "up";
          case DIR_RIGHT: return "right";
          case DIR_DOWN: return "down";
          case DIR_LEFT: return "left";
          default: return "up";
        }
      })();
      cursorInlineLabelEl.textContent = "Cursor";
      cursorTextEl.textContent = `${ref}(${rowText},${colText})`;
      if(directionEnabled){
        cursorVisualEl.setAttribute("data-arrow", dirSymbol);
        cursorVisualEl.setAttribute("data-dir", dirName);
      }else{
        cursorVisualEl.removeAttribute("data-arrow");
        cursorVisualEl.removeAttribute("data-dir");
      }
      cursorVisualEl.style.setProperty("--cursor-color", "#e60000");
      const guideCol = document.querySelector(".guide-col");
      if(guideCol){
        const spans = guideCol.querySelectorAll("span");
        spans.forEach((span, index) => {
          span.classList.toggle("is-active", index === col - 1);
        });
      }
      const guideRow = document.querySelector(".guide-row");
      if(guideRow){
        const spans = guideRow.querySelectorAll("span");
        spans.forEach((span, index) => {
          span.classList.toggle("is-active", index === row - 1);
        });
      }
      const currentValue = (typeof getCurrentValue === "function")
        ? getCurrentValue()
        : null;
      const currentKind = (typeof getCurrentKind === "function" && typeof currentValue === "number")
        ? getCurrentKind(currentValue)
        : (typeof currentValue === "number" ? Math.abs(currentValue) : null);
      if(typeof currentKind === "number" && currentKind !== unplacedKind){
        const currentColor = (typeof colorsForKind === "function")
          ? colorsForKind(currentKind)
          : "black";
        const resolved = colorMap[currentColor] || colorMap.black;
        const bitIsBlack = (typeof isBlackBit === "function")
          ? isBlackBit(currentValue)
          : currentValue > 0;
        const fill = bitIsBlack ? resolved[1] : resolved[0];
        const border = bitIsBlack ? resolved[0] : resolved[1];
        cursorCellEl.style.backgroundColor = fill;
        cursorCellEl.style.borderColor = border;
        cursorCellEl.style.boxShadow = "";
      }else{
        cursorCellEl.style.backgroundColor = "#ffffff";
        cursorCellEl.style.borderColor = "#999999";
        cursorCellEl.style.boxShadow = "";
      }
      nextLabelEl.textContent = "Next";
      let nextInfos = [];
      if(basePatternActive){
        if(typeof getNextBasePatternInfos === "function"){
          nextInfos = getNextBasePatternInfos(NEXT_CELL_COUNT) || [];
        }
      }else if(typeof getNextDataInfos === "function"){
        nextInfos = getNextDataInfos(NEXT_CELL_COUNT) || [];
      }else{
        const single = (typeof getNextDataInfo === "function") ? getNextDataInfo() : null;
        if(single) nextInfos = [single];
      }
      for(let i = 0; i < nextCells.length; i++){
        applyNextCellInfo(nextCells[i], nextInfos[i]);
      }
    };

    if(typeof global !== "undefined"){
      global.updateExecutionStatusCursor = updateExecutionStatusCursor;
    }
    return { updateExecutionStatusCursor };
  }

  global.createExecutionStatusCursor = createExecutionStatusCursor;
})(typeof window !== "undefined" ? window : globalThis);
