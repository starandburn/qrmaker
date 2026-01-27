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
    const buildFormatMaskErrorDetail = (raw) => {
      const formatted = (typeof raw === "string" && raw) ? raw : String(raw ?? "(missing)");
      return `format のマスク番号が不正です: ${formatted}（有効範囲: 0～7、未指定はオール1）`;
    };
    const reportFormatCommandWarning = (detail) => {
      callIfFunction(window.setExecutionStatus, "warning", undefined, detail);
      callIfFunction(window.logEvent, "format", detail, "command arguments invalid");
      callIfFunction(console.error, detail);
    };
    const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : null;
    if(!typeUtils
      || typeof typeUtils.isFunction !== "function"
      || typeof typeUtils.callIfFunction !== "function"
      || typeof typeUtils.callWithFallback !== "function"
      || typeof typeUtils.isDefined !== "function"
    ){
      throw new Error("app/utils/type-utils.js must be loaded before pattern-callers.js.");
    }
    const {
      callIfFunction,
      callWithFallback,
      isDefined,
      isFunction,
    } = typeUtils;
    const reportMaskWarning = (detail, commandName = "formats") => {
      callIfFunction(window.setExecutionStatus, "warning", undefined, detail);
      callIfFunction(window.logEvent, commandName, detail, "invalid mask index");
      callIfFunction(console.error, detail);
    };
    const buildFormatsMaskErrorDetail = (raw) => {
      const formatted = raw ? String(raw) : "(missing)";
      return `formats のマスク番号が不正です: ${formatted}（有効範囲: 0～7、未指定はオール1）`;
    };
    const reportFormatsMaskWarning = (detail) => {
      reportMaskWarning(detail, "formats");
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
      if(tokens.some((value) => (typeof value === "object" && value !== null) || isFunction(value))){
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
          isInvalidMask: false,
          maskDetail: null,
        };
      }
      if(tokens.length > 2){
        return invalid;
      }
      if(tokens.length === 1){
        const parsed = parseFormatNumberToken(tokens[0]);
        if(parsed === null){
          return {
            type: "ok",
            side: 0,
            value: Number.NaN,
            overwrite,
            detailInput: filtered,
            isInvalidMask: true,
            maskDetail: buildFormatMaskErrorDetail(formatPlacementArgValue(tokens[0])),
          };
        }
        if(parsed === 0 || parsed === 1){
          return {
            type: "ok",
            side: parsed,
            value: null,
            overwrite,
            detailInput: filtered,
            isInvalidMask: false,
            maskDetail: null,
          };
        }
        return {
          type: "ok",
          side: 0,
          value: parsed,
          overwrite,
          detailInput: filtered,
          isInvalidMask: (parsed < 0 || parsed > 7),
          maskDetail: (parsed < 0 || parsed > 7)
            ? buildFormatMaskErrorDetail(formatPlacementArgValue(tokens[0]))
            : null,
        };
      }
      const sideParsed = parseFormatNumberToken(tokens[0]);
      if(sideParsed === null || (sideParsed !== 0 && sideParsed !== 1)){
        return invalid;
      }
      const rawMask = tokens[1];
      const valueParsed = parseFormatNumberToken(rawMask);
      const maskDetailInfo = {
        value: valueParsed,
        isInvalidMask: false,
        maskDetail: null,
      };
      if(valueParsed === null || valueParsed < 0 || valueParsed > 7){
        maskDetailInfo.value = Number.NaN;
        maskDetailInfo.isInvalidMask = true;
        maskDetailInfo.maskDetail = buildFormatMaskErrorDetail(formatPlacementArgValue(rawMask));
      }
      return {
        type: "ok",
        side: sideParsed,
        value: maskDetailInfo.value,
        overwrite,
        detailInput: filtered,
        isInvalidMask: maskDetailInfo.isInvalidMask,
        maskDetail: maskDetailInfo.maskDetail,
      };
    };
    const getFormatDefaultBits = (pattern) => {
      const bits = pattern && pattern.FORMAT_DEFAULT_BITS;
      return Number.isFinite(bits) ? bits : 0xffff;
    };
    const resolveFormatBitsFromPattern = (pattern, ctx, maskIndex) => {
      const defaultBits = getFormatDefaultBits(pattern);
      if(!pattern){
        return defaultBits;
      }
      const computeBitsFn = pattern.computeFormatBits;
      if(isFunction(computeBitsFn)){
        return computeBitsFn(ctx, maskIndex);
      }
      if(maskIndex === null || maskIndex === undefined){
        return defaultBits;
      }
      const numeric = Number(maskIndex);
      if(!Number.isFinite(numeric)){
        return 0;
      }
      const idx = Math.trunc(numeric);
      if(idx < 0 || idx > 7){
        return 0;
      }
      return defaultBits;
    };
    const resolveFormatCoordsFromPattern = (pattern, side) => {
      if(!pattern){
        return [];
      }
      const getCoordsFn = pattern.getFormatCoords;
      if(isFunction(getCoordsFn)){
        return getCoordsFn(side, BOARD_ROWS);
      }
      const coords = (side === 1) ? pattern.FORMAT_COORDS_SIDE_1 : pattern.FORMAT_COORDS_SIDE_0;
      return Array.isArray(coords) ? coords : [];
    };
    const markFormatSideState = (side) => {
      if(!ctx) return;
      if(typeof ctx.markFormatSideWritten === "function"){
        ctx.markFormatSideWritten(side);
      }
    };
    const markBothFormatSides = () => {
      markFormatSideState(0);
      markFormatSideState(1);
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
    const putFinderCellsCore = (...args) => {
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
    const drawFinderPatternsCore = (...args) => {
      if(!ctx) return false;
      const pattern = window.finderPattern;
      if(pattern && typeof pattern.drawFinderPatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawFinderPatterns(ctx, ...normalized);
      }
      return false;
    };
    const putAlignmentCellsCore = (...args) => {
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
    const drawAlignmentPatternsCore = (...args) => {
      if(!ctx) return false;
      const pattern = window.alignmentPattern;
      if(pattern && typeof pattern.drawAlignmentPatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawAlignmentPatterns(ctx, ...normalized);
      }
      return false;
    };
    const putTimingCellsCore = (...args) => {
      if(!ctx) return false;
      const pattern = window.timingPattern;
      if(pattern && typeof pattern.putTimingCells === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.putTimingCells(ctx, ...normalized);
      }
      return false;
    };
    const drawTimingPatternsCore = (...args) => {
      if(!ctx) return false;
      const pattern = window.timingPattern;
      if(pattern && typeof pattern.drawTimingPatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawTimingPatterns(ctx, ...normalized);
      }
      return false;
    };
    const putDarkModuleCellsCore = (...args) => {
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
    const drawDarkModulePatternsCore = (...args) => {
      if(!ctx) return false;
      const pattern = window.darkModulePattern;
      if(pattern && typeof pattern.drawDarkModulePatterns === "function"){
        const normalized = (args.length === 0) ? [false] : args;
        return pattern.drawDarkModulePatterns(ctx, ...normalized);
      }
      return false;
    };
    const putFormatCellsCore = (...args) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      const putFormatFn = pattern && pattern.putFormatCells;
      if(!isFunction(putFormatFn)){
        return false;
      }
      const parsed = normalizeFormatCommandArgs(args);
      if(parsed.type === "legacy"){
        const normalized = (args.length === 0) ? [false] : args;
        return putFormatFn(ctx, ...normalized);
      }
      if(parsed.type === "invalid"){
        reportFormatCommandWarning(parsed.detail);
        return false;
      }
      if(parsed.isInvalidMask && isDefined(parsed.maskDetail)){
        reportMaskWarning(parsed.maskDetail, "format");
      }
      const bits = resolveFormatBitsFromPattern(pattern, ctx, parsed.value);
      const coords = resolveFormatCoordsFromPattern(pattern, parsed.side);
      const markResult = (value) => {
        if(value !== false){
          markFormatSideState(parsed.side);
        }
        return value;
      };
      const result = putFormatFn(ctx, bits, coords, parsed.overwrite);
      if(result && typeof result.then === "function"){
        return result.then(markResult);
      }
      return markResult(result);
    };
    const drawFormatPatternsCore = async (...args) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      if(!pattern) return false;
      const drawFn = pattern.drawFormatPatterns;
      const normalized = normalizeFormatsCommandArgs(args);
      if(!normalized){
        if(!isFunction(drawFn)){
          return false;
        }
        const fallback = (args.length === 0) ? [] : args;
        return drawFn(ctx, ...fallback);
      }
      if(normalized.isInvalidMask && isDefined(normalized.detail)){
        reportFormatsMaskWarning(normalized.detail);
      }
      const bits = resolveFormatBitsFromPattern(pattern, ctx, normalized.maskIndex);
      const renderSideFn = pattern.renderFormatSide;
      if(isFunction(renderSideFn)){
        const first = await renderSideFn(ctx, 0, bits, normalized.overwrite);
        const second = await renderSideFn(ctx, 1, bits, normalized.overwrite);
        const success = (first !== false && second !== false);
        if(success){
          markBothFormatSides();
        }
        return success;
      }
      if(!isFunction(drawFn)){
        return false;
      }
      const result = await drawFn(ctx, normalized.maskIndex, normalized.overwrite);
      if(result !== false){
        markBothFormatSides();
      }
      return result;
    };
    const callRenderFormatSide = async (side, maskIndex, overwrite = false) => {
      if(!ctx) return false;
      const pattern = window.formatPattern;
      if(!pattern) return false;
      const bits = resolveFormatBitsFromPattern(pattern, ctx, maskIndex);
      const renderSideFn = pattern.renderFormatSide;
      if(isFunction(renderSideFn)){
        return renderSideFn(ctx, side, bits, overwrite, { currentRun: ctx.runId });
      }
      const drawFn = pattern.drawFormatPatterns;
      if(!isFunction(drawFn)){
        return false;
      }
      return drawFn(ctx, maskIndex, overwrite);
    };

    return {
      putFinderCellsCore,
      drawFinderPatternsCore,
      putAlignmentCellsCore,
      drawAlignmentPatternsCore,
      putTimingCellsCore,
      drawTimingPatternsCore,
      putDarkModuleCellsCore,
      drawDarkModulePatternsCore,
      putFormatCellsCore,
      callRenderFormatSide,
      drawFormatPatternsCore,
    };
  }

  global.createPatternCallers = createPatternCallers;
})(typeof window !== "undefined" ? window : globalThis);
