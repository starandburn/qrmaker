// app/pattern-callers.js
(function(global){
  if(!global) return;

  function createPatternCallers({ ctx } = {}){
    const formatFinderArgValue = (value) => {
      if(value === undefined) return "undefined";
      if(value === null) return "null";
      return String(value);
    };
    const formatFinderArgsForMessage = (args = []) => {
      if(!args.length) return "（引数なし）";
      return args
        .map((value) => formatFinderArgValue(value))
        .join(" ");
    };
    const buildFinderWarningDetail = (args = []) => (
      `finder コマンドの位置指定が不正です: ${formatFinderArgsForMessage(args)}（位置は A1 形式または 1 から ${BOARD_ROWS} までの row col で指定してください）`
    );
    const parseCellAddress = (token) => {
      if(typeof token !== "string") return null;
      const trimmed = token.trim();
      if(!trimmed) return null;
      const addrMatch = trimmed.match(/^([A-Za-z]+)(\d+)$/);
      if(!addrMatch) return null;
      const letters = addrMatch[1].toUpperCase();
      const number = Number(addrMatch[2]);
      if(!Number.isFinite(number)) return null;
      const row = Math.trunc(number);
      if(row < 1 || row > BOARD_ROWS) return null;
      let col = 0;
      for(const ch of letters){
        const code = ch.charCodeAt(0);
        if(code < 65 || code > 90) return null;
        col = col * 26 + (code - 64);
      }
      if(col < 1 || col > BOARD_COLS) return null;
      return { row, col };
    };
    const normalizeFinderCommandArgs = (args = []) => {
      const filtered = args.filter((value) => value !== undefined && value !== null);
      const tokens = [...filtered];
      if(!tokens.length){
        return {
          type: "finder",
          overwrite: false,
          row: null,
          col: null,
          detailInput: filtered,
        };
      }
      const last = tokens[tokens.length - 1];
      let overwrite = false;
      if(typeof last === "boolean"){
        overwrite = Boolean(last);
        tokens.pop();
      }else if(typeof last === "string"){
        const lower = last.toLowerCase();
        if(lower === "on" || lower === "off"){
          overwrite = lower === "on";
          tokens.pop();
        }
      }
      if(tokens.some((value) => typeof value === "object")){
        return { type: "legacy" };
      }
      if(tokens.length === 0){
        return {
          type: "finder",
          overwrite,
          row: null,
          col: null,
          detailInput: filtered,
        };
      }
      if(tokens.length === 1){
        const parsed = parseCellAddress(tokens[0]);
        if(parsed){
          return {
            type: "finder",
            overwrite,
            row: parsed.row,
            col: parsed.col,
            detailInput: filtered,
          };
        }
        return { type: "invalid", detail: buildFinderWarningDetail(filtered) };
      }
      if(tokens.length === 2){
        const [one, two] = tokens;
        const rowVal = Number(one);
        const colVal = Number(two);
        if(Number.isFinite(rowVal) && Number.isFinite(colVal)){
          const row = Math.trunc(rowVal);
          const col = Math.trunc(colVal);
          if(row >= 1 && row <= BOARD_ROWS && col >= 1 && col <= BOARD_COLS){
            return {
              type: "finder",
              overwrite,
              row,
              col,
              detailInput: filtered,
            };
          }
        }
        return { type: "invalid", detail: buildFinderWarningDetail(filtered) };
      }
      return { type: "invalid", detail: buildFinderWarningDetail(filtered) };
    };
    const reportFinderCommandWarning = (detail) => {
      callIfFunction(window.setExecutionStatus, "warning", undefined, detail);
      callIfFunction(window.logEvent, "finder", detail, "位置指定が不正です");
      callIfFunction(console.error, detail);
    };
    const moveCursorToFinderPosition = (row, col) => {
      const executionCtrl = (typeof window !== "undefined") ? window.executionControl : null;
      if(executionCtrl && typeof executionCtrl.updateCursorSafe === "function"){
        return Boolean(executionCtrl.updateCursorSafe(ctx.runId, ctx, row, col, DIR_RIGHT));
      }
      if(typeof window !== "undefined" && typeof window.updateCursor === "function"){
        window.updateCursor(row, col, DIR_RIGHT);
        return true;
      }
      return false;
    };
    const callPutFinderCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.finderPattern;
      if(pattern && typeof pattern.putFinderCells === "function"){
        const parsed = normalizeFinderCommandArgs(args);
        if(parsed.type === "legacy"){
          const normalized = (args.length === 0) ? [false] : args;
          return pattern.putFinderCells(ctx, ...normalized);
        }
        if(parsed.type === "invalid"){
          reportFinderCommandWarning(parsed.detail);
          return false;
        }
        if(parsed.row !== null && parsed.col !== null){
          if(!moveCursorToFinderPosition(parsed.row, parsed.col)){
            return false;
          }
        }
        return pattern.putFinderCells(ctx, parsed.overwrite);
      }
      return false;
    };
    const callDrawFinderPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.finderPattern;
      if(pattern && typeof pattern.drawFinderPatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawFinderPatterns(ctx, ...normalized);
      }
      return false;
    };
    const callPutAlignmentCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.alignmentPattern;
      if(pattern && typeof pattern.putAlignmentCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putAlignmentCells(ctx, ...normalized);
      }
      return false;
    };
    const callDrawAlignmentPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.alignmentPattern;
      if(pattern && typeof pattern.drawAlignmentPatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawAlignmentPatterns(ctx, ...normalized);
      }
      return false;
    };
    const callPutTimingCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.timingPattern;
      if(pattern && typeof pattern.putTimingCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putTimingCells(ctx, ...normalized);
      }
      return false;
    };
    const callDrawTimingPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.timingPattern;
      if(pattern && typeof pattern.drawTimingPatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawTimingPatterns(ctx, ...normalized);
      }
      return false;
    };
    const callPutDarkModuleCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.darkModulePattern;
      if(pattern && typeof pattern.putDarkModuleCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putDarkModuleCells(ctx, ...normalized);
      }
      return false;
    };
    const callDrawDarkModulePatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.darkModulePattern;
      if(pattern && typeof pattern.drawDarkModulePatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawDarkModulePatterns(ctx, ...normalized);
      }
      return false;
    };
    const callPutFormatCells = (...args) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      if(pattern && typeof pattern.putFormatCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putFormatCells(ctx, ...normalized);
      }
      return false;
    };
    const callDrawFormatPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      if(pattern && typeof pattern.drawFormatPatterns === "function"){
        const normalized = (args.length === 0) ? [] : args;
        return pattern.drawFormatPatterns(ctx, ...normalized);
      }
      return false;
    };

    return {
      callPutFinderCells,
      callDrawFinderPatterns,
      callPutAlignmentCells,
      callDrawAlignmentPatterns,
      callPutTimingCells,
      callDrawTimingPatterns,
      callPutDarkModuleCells,
      callDrawDarkModulePatterns,
      callPutFormatCells,
      callDrawFormatPatterns,
    };
  }

  global.createPatternCallers = createPatternCallers;
})(typeof window !== "undefined" ? window : globalThis);
