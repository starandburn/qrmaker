(function () {
  const toColumnLabel = (index) => {
    let value = index;
    let label = "";
    while (value >= 0) {
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26) - 1;
    }
    return label;
  };

  const getBoardSize = () => {
    const matrix = window.boardMatrix;
    if (Array.isArray(matrix) && matrix.length > 0) {
      const rows = matrix.length;
      const cols =
        Array.isArray(matrix[0]) && typeof matrix[0].length === "number"
          ? matrix[0].length
          : rows;
      return Math.min(rows, cols);
    }
    if (typeof window.getActiveQrBoardSize === "function") {
      return window.getActiveQrBoardSize();
    }
    return 25;
  };

  const createLabelSpan = (content) => {
    const span = document.createElement("span");
    span.textContent = content;
    return span;
  };

  const getGuideLabelSize = (boardSize) => {
    const numeric = Number(boardSize);
    const size = Number.isFinite(numeric) ? Math.max(1, numeric) : 25;
    return Math.max(7, Math.min(12, 260 / size));
  };

  const rebuildGuides = () => {
    const boardSize = Math.max(1, getBoardSize());
    const boardEl = document.querySelector(".qr-board");
    if (boardEl) {
      boardEl.style.setProperty("--board-size", boardSize.toString());
      boardEl.style.setProperty("--guide-label-size", `${getGuideLabelSize(boardSize)}px`);
    }

    const colContainer = document.querySelector(".guide-col");
    if (colContainer) {
      const cols = Array.from({ length: boardSize }, (_, idx) =>
        createLabelSpan(toColumnLabel(idx))
      );
      colContainer.replaceChildren(...cols);
    }

    const rowContainer = document.querySelector(".guide-row");
    if (rowContainer) {
      const rows = Array.from({ length: boardSize }, (_, idx) =>
        createLabelSpan(String(idx + 1))
      );
      rowContainer.replaceChildren(...rows);
    }
  };

  window.rebuildGuides = rebuildGuides;
  rebuildGuides();
})();
