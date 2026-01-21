(function(global){
  if(!global) return;

  function createPatternCallers({ ctx } = {}){
    const formatPlacementArgValue = (value) => {
      if(value === undefined) return "undefined";
      if(value === null) return "null";
      return String(value);
    };
    const formatPlacementArgsForMessage = (args = []) => {
      if(!args.length) return "(no args)";
      return args
        .map((value) => formatPlacementArgValue(value))
        .join(" ");
    };
    const buildPlacementWarningDetail = (commandName, args = []) => (
      `${commandName} command location is invalid: ${formatPlacementArgsForMessage(args)} (use A1 style or row/col between 1 and ${BOARD_ROWS})`
    );
    const buildFormatWarningDetail = (args = []) => (
      `format command arguments are invalid: ${formatPlacementArgsForMessage(args)} (use side 0/1 and mask 0-7)`
    );
    const reportFormatCommandWarning = (detail) => {
      callIfFunction(window.setExecutionStatus, "warning", undefined, detail);
      callIfFunction(window.logEvent, "format", detail, "command arguments invalid");
      callIfFunction(console.error, detail);
    };
    const buildFormatsMaskErrorDetail = (raw) => {
      const formatted = raw ? String(raw) : "(missing)";
      return `formats のマスク番号が不正です: ${formatted}（有効範囲: 0～7、未指定はオール1）`;
    };
    const reportFormatsMaskWarning = (detail) => {
      callIfFunction(window.setExecutionStatus, "warning", undefined, detail);
      callIfFunction(window.logEvent, "formats", detail, "invalid mask index");
      callIfFunction(console.error, detail);
    };
    const parseFormatsOverwriteToken = (value) => {
      if(typeof value === "boolean"){
        return value;
      }
      if(typeof value === "string"){
        const lower = value.trim().toLowerCase();
        if(lower === "on" || lower === "off"){
          return lower === "on";
        }
      }
      return undefined;
    };
    const normalizeFormatsCommandArgs = (args = []) => {
      const filtered = args.filter((value) => value !== undefined && value !== null);
      const tokens = [...filtered];
      let overwrite = false;
      if(tokens.length){
        const last = tokens[tokens.length - 1];
        const parsedOverwrite = parseFormatsOverwriteToken(last);
        if(parsedOverwrite !== undefined){
          overwrite = parsedOverwrite;
          tokens.pop();
        }
      }
      if(tokens.some((value) => (typeof value === "object" && value !== null) || typeof value === "function")){
        return null;
      }
      let maskIndex = null;
      let isInvalidMask = false;
      let detail = null;
      const buildRawValue = () => tokens.map((value) => formatPlacementArgValue(value)).join(" ");
      if(tokens.length === 0){
        maskIndex = null;
      }else if(tokens.length === 1){
        const raw = tokens[0];
        const parsed = parseFormatNumberToken(raw);
        if(parsed === null){
          maskIndex = Number.NaN;
          isInvalidMask = true;
          detail = buildFormatsMaskErrorDetail(formatPlacementArgValue(raw));
        }else if(parsed < 0 || parsed > 7){
          maskIndex = parsed;
          isInvalidMask = true;
          detail = buildFormatsMaskErrorDetail(formatPlacementArgValue(raw));
        }else{
          maskIndex = parsed;
        }
      }else{
        isInvalidMask = true;
        detail = buildFormatsMaskErrorDetail(buildRawValue());
        maskIndex = Number.NaN;
      }
      return { maskIndex, overwrite, isInvalidMask, detail };
    };
    const parseFormatNumberToken = (value) => {
      const numeric = Number(value);
      if(!Number.isFinite(numeric)) return null;
      return Math.trunc(numeric);
    };
    const normalizeFormatCommandArgs = (args = []) => {
      const filtered = args.filter((value) => value !== undefined && value !== null);
      const tokens = [...filtered];
      let overwrite = false;
      if(tokens.length){
        const last = tokens[tokens.length - 1];
        if(typeof last === "boolean"){
          overwrite = Boolean(last);
          tokens.pop();
        }else if(typeof last === "string"){
          const lower = last.trim().toLowerCase();
          if(lower === "on" || lower === "off"){
            overwrite = lower === "on";
            tokens.pop();
          }
        }
      }
      if(tokens.some((value) => typeof value === "object")){
        return { type: "legacy" };
      }
      const invalid = { type: "invalid", detail: buildFormatWarningDetail(filtered) };
      if(tokens.length === 0){
        return {
          type: "ok",
          side: 0,
          value: null,
          overwrite,
          detailInput: filtered,
        };
      }
      if(tokens.length > 2){
        return invalid;
      }
      if(tokens.length === 1){
        const parsed = parseFormatNumberToken(tokens[0]);
        if(parsed === null){
          return invalid;
        }
        if(parsed === 0 || parsed === 1){
          return {
            type: "ok",
            side: parsed,
            value: null,
            overwrite,
            detailInput: filtered,
          };
        }
        return {
          type: "ok",
          side: 0,
          value: parsed,
          overwrite,
          detailInput: filtered,
        };
      }
      const sideParsed = parseFormatNumberToken(tokens[0]);
      const valueParsed = parseFormatNumberToken(tokens[1]);
      if(sideParsed === null || valueParsed === null){
        return invalid;
      }
      if(sideParsed !== 0 && sideParsed !== 1){
        return invalid;
      }
      return {
        type: "ok",
        side: sideParsed,
        value: valueParsed,
        overwrite,
        detailInput: filtered,
      };
    };
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
    const normalizePlacementCommandArgs = (args = [], commandName = "command") => {
      const filtered = args.filter((value) => value !== undefined && value !== null);
      const tokens = [...filtered];
      if(!tokens.length){
        return {
          type: "placement",
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
          type: "placement",
          overwrite,
          row: null,
          col: null,
          detailInput: filtered,
        };
      }
      const invalid = { type: "invalid", detail: buildPlacementWarningDetail(commandName, filtered) };
      if(tokens.length === 1){
        const parsed = parseCellAddress(tokens[0]);
        if(parsed){
          return {
            type: "placement",
            overwrite,
            row: parsed.row,
            col: parsed.col,
            detailInput: filtered,
          };
        }
        return invalid;
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
              type: "placement",
              overwrite,
              row,
              col,
              detailInput: filtered,
            };
          }
        }
        return invalid;
      }
      return invalid;
    };
    const reportPlacementCommandWarning = (commandName, detail) => {
      callIfFunction(window.setExecutionStatus, "warning", undefined, detail);
      callIfFunction(window.logEvent, commandName, detail, "command location invalid");
      callIfFunction(console.error, detail);
    };
    const moveCursorToPosition = (row, col) => {
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
        const parsed = normalizePlacementCommandArgs(args, "finder");
        if(parsed.type === "legacy"){
          const normalized = (args.length === 0) ? [false] : args;
          return pattern.putFinderCells(ctx, ...normalized);
        }
        if(parsed.type === "invalid"){
          reportPlacementCommandWarning("finder", parsed.detail);
          return false;
        }
        if(parsed.row !== null && parsed.col !== null){
          if(!moveCursorToPosition(parsed.row, parsed.col)){
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
        const parsed = normalizePlacementCommandArgs(args, "alignment");
        if(parsed.type === "legacy"){
          const normalized = (args.length === 0) ? [false] : args;
          return pattern.putAlignmentCells(ctx, ...normalized);
        }
        if(parsed.type === "invalid"){
          reportPlacementCommandWarning("alignment", parsed.detail);
          return false;
        }
        if(parsed.row !== null && parsed.col !== null){
          if(!moveCursorToPosition(parsed.row, parsed.col)){
            return false;
          }
        }
        return pattern.putAlignmentCells(ctx, parsed.overwrite);
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
        const parsed = normalizePlacementCommandArgs(args, "dark");
        if(parsed.type === "legacy"){
          const normalized = (args.length === 0) ? [false] : args;
          return pattern.putDarkModuleCells(ctx, ...normalized);
        }
        if(parsed.type === "invalid"){
          reportPlacementCommandWarning("dark", parsed.detail);
          return false;
        }
        if(parsed.row !== null && parsed.col !== null){
          if(!moveCursorToPosition(parsed.row, parsed.col)){
            return false;
          }
        }
        return pattern.putDarkModuleCells(ctx, parsed.overwrite);
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
        const parsed = normalizeFormatCommandArgs(args);
        if(parsed.type === "legacy"){
          const normalized = (args.length === 0) ? [false] : args;
          return pattern.putFormatCells(ctx, ...normalized);
        }
        if(parsed.type === "invalid"){
          reportFormatCommandWarning(parsed.detail);
          return false;
        }
        const computeBitsFn = pattern.computeFormatBits;
        const getCoordsFn = pattern.getFormatCoords;
        const bits = (typeof computeBitsFn === "function")
          ? computeBitsFn(ctx, parsed.value)
          : (pattern.FORMAT_DEFAULT_BITS ?? 0xffff);
        const coords = (typeof getCoordsFn === "function")
          ? getCoordsFn(parsed.side, BOARD_ROWS)
          : ((parsed.side === 1) ? pattern.FORMAT_COORDS_SIDE_1 : pattern.FORMAT_COORDS_SIDE_0);
        return pattern.putFormatCells(ctx, bits, coords, parsed.overwrite);
      }
      return false;
    };
    const callDrawFormatPatterns = (...args) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      if(pattern && typeof pattern.drawFormatPatterns === "function"){
        const normalized = normalizeFormatsCommandArgs(args);
        if(!normalized){
          const fallback = (args.length === 0) ? [] : args;
          return pattern.drawFormatPatterns(ctx, ...fallback);
        }
        if(normalized.isInvalidMask && normalized.detail){
          reportFormatsMaskWarning(normalized.detail);
        }
        return pattern.drawFormatPatterns(ctx, normalized.maskIndex, normalized.overwrite);
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
