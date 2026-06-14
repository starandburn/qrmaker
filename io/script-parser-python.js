/**
 * Python-like user script parser.
 */
(function(global){
  if(!global) return;

  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");
  const registerUserScriptLanguage = global.registerUserScriptLanguage;
  const formatStudentCodeLine = global.formatStudentCodeLine;

  const countIndent = (line) => {
    let count = 0;
    for(const ch of line){
      if(ch === " "){
        count += 1;
      }else if(ch === "\t"){
        count += 4;
      }else{
        break;
      }
    }
    return count;
  };

  const isIgnorableLine = (line) => {
    const trimmed = String(line ?? "").trim();
    return !trimmed || trimmed.startsWith("#");
  };

  const stripPythonComment = (line) => {
    const text = String(line ?? "");
    let quote = "";
    let escaped = false;
    for(let i = 0; i < text.length; i++){
      const ch = text[i];
      if(escaped){
        escaped = false;
        continue;
      }
      if(ch === "\\"){
        escaped = true;
        continue;
      }
      if(quote){
        if(ch === quote){
          quote = "";
        }
        continue;
      }
      if(ch === "\"" || ch === "'"){
        quote = ch;
        continue;
      }
      if(ch === "#"){
        return text.slice(0, i);
      }
    }
    return text;
  };

  const CALL_NAME_MAP = {
    apply_mask: "applyMask",
    can_continue_loop: "canContinueLoop",
    draw_alignment_patterns: "drawAlignmentPatterns",
    draw_base_patterns: "drawBasePatterns",
    draw_data_patterns: "drawDataPatterns",
    draw_dark_module_patterns: "drawDarkModulePatterns",
    draw_finder_patterns: "drawFinderPatterns",
    draw_format_patterns: "drawFormatPatterns",
    draw_qr_code: "drawQRCode",
    draw_text: "drawText",
    draw_timing_patterns: "drawTimingPatterns",
    get_next_data: "getNextData",
    has_next_data: "hasNextData",
    is_empty: "isEmpty",
    is_move_blocked: "isMoveBlocked",
    is_skip_zone: "isSkipZone",
    is_switch_on: "isSwitchOn",
    is_timing_zone: "isTimingZone",
    move_cursor: "moveCursor",
    pause_running: "pauseRunning",
    put_alignment_cells: "putAlignmentCells",
    put_cell: "putCell",
    put_dark_module_cells: "putDarkModuleCells",
    put_finder_cells: "putFinderCells",
    put_format_cells: "putFormatCells",
    put_timing_cells: "putTimingCells",
    reset_board: "resetBoard",
    set_switch: "setSwitch",
    turn_cursor: "turnCursor",
  };

  const normalizeCallName = (name) => {
    return CALL_NAME_MAP[name] || name;
  };

  const shouldCallMappedName = (name) => {
    return Object.prototype.hasOwnProperty.call(CALL_NAME_MAP, name)
      || Object.values(CALL_NAME_MAP).includes(name);
  };

  const normalizeCallArg = (arg) => {
    const trimmed = String(arg ?? "").trim();
    const normalizedName = normalizeCallName(trimmed);
    if(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(normalizedName) && shouldCallMappedName(trimmed)){
      return `${normalizedName}()`;
    }
    return normalizeCallName(trimmed);
  };

  const SWITCH_ACTION_CALLS = {
    on_switch: "on",
    off_switch: "off",
    flip_switch: "flip",
  };

  const normalizeSwitchArg = (arg) => {
    return String(arg ?? "").trim().replace(/^["'](.+)["']$/, "$1");
  };

  const BASE_SWITCH_NAMES = ["red", "blue", "green", "yellow"];
  const DEFAULT_ACTIVE_SWITCH_NAMES = BASE_SWITCH_NAMES.slice(0, 2);

  const normalizeSwitchName = (value) => {
    return String(value ?? "").trim().toLowerCase();
  };

  const getConfiguredSwitchNames = () => {
    const switchConfig = global.__qrSwitchConfig;
    if(!switchConfig || !Array.isArray(switchConfig.switchNames)) return null;
    const configured = switchConfig.switchNames
      .map(normalizeSwitchName)
      .filter((name) => BASE_SWITCH_NAMES.includes(name));
    const unique = Array.from(new Set(configured));
    return BASE_SWITCH_NAMES.filter((name) => unique.includes(name));
  };

  const getActiveSwitchNames = () => {
    const configured = getConfiguredSwitchNames();
    return Array.isArray(configured) ? configured : DEFAULT_ACTIVE_SWITCH_NAMES;
  };

  const normalizeSwitchCondition = (condition) => {
    const trimmed = String(condition ?? "").trim();
    const names = getActiveSwitchNames();
    const namePattern = names.join("|");
    if(!namePattern) return trimmed;
    const match = trimmed.match(new RegExp(`^(not\\s+)?(${namePattern})$`, "i"));
    if(!match) return trimmed;
    const switchName = match[2].toLowerCase();
    return match[1] ? `!isSwitchOn("${switchName}")` : `isSwitchOn("${switchName}")`;
  };

  const normalizeSwitchAssignment = (line) => {
    const trimmed = String(line ?? "").trim();
    const names = getActiveSwitchNames();
    const namePattern = names.join("|");
    if(!namePattern) return "";
    const match = trimmed.match(new RegExp(`^(${namePattern})\\s*=\\s*(.+)$`, "i"));
    if(!match) return "";
    const switchName = match[1].toLowerCase();
    const rawValue = match[2].trim();
    const lowerValue = rawValue.toLowerCase();
    if(lowerValue === "true"){
      return `setSwitch("${switchName}", true)`;
    }
    if(lowerValue === "false"){
      return `setSwitch("${switchName}", false)`;
    }
    const switchCondition = normalizeSwitchCondition(rawValue);
    if(switchCondition !== rawValue){
      return `setSwitch("${switchName}", ${switchCondition})`;
    }
    return "";
  };

  const normalizeCallSyntax = (line) => {
    let current = String(line ?? "");
    const callPattern = /\b([A-Za-z_$][A-Za-z0-9_$-]*)\s*\(([^()]*)\)/g;
    for(let i = 0; i < 20; i++){
      const next = current.replace(callPattern, (match, name, args) => {
        const lowerName = String(name ?? "").toLowerCase();
        const rawArgs = String(args ?? "").split(",").map(normalizeSwitchArg).filter(Boolean);
        if(lowerName === "set_switch" && rawArgs.length >= 1){
          return [rawArgs[0], rawArgs[1] || "on"].join(" ");
        }
        if(Object.prototype.hasOwnProperty.call(SWITCH_ACTION_CALLS, lowerName) && rawArgs.length >= 1){
          return `${rawArgs[0]} ${SWITCH_ACTION_CALLS[lowerName]}`;
        }
        const normalizedArgs = String(args ?? "")
          .split(",")
          .map(normalizeCallArg)
          .filter(Boolean)
          .join(" ");
        const normalizedName = normalizeCallName(name);
        return normalizedArgs ? `${normalizedName} ${normalizedArgs}` : normalizedName;
      });
      if(next === current) return next;
      current = next;
    }
    return current;
  };

  const normalizeBareCallName = (line) => {
    return String(line ?? "").replace(/^(\s*)([A-Za-z_$][A-Za-z0-9_$-]*)(\b)/, (match, indent, name, boundary) => {
      return `${indent}${normalizeCallName(name)}${boundary}`;
    });
  };

  const normalizeConditionCallName = (condition) => {
    return normalizeBareCallName(normalizeSwitchCondition(condition));
  };

  const normalizePhLine = (line) => {
    return normalizeBareCallName(normalizeCallSyntax(line));
  };

  const toDslLines = (line) => {
    const trimmed = normalizePhLine(line).trim();
    const inlineIfMatch = trimmed.match(/^(if)\s+([^:]+):\s+(.+)$/i);
    if(inlineIfMatch){
      return [`${inlineIfMatch[1]} ${normalizeConditionCallName(inlineIfMatch[2])} : ${inlineIfMatch[3].trim()}`];
    }
    const inlineElifMatch = trimmed.match(/^elif\s+([^:]+):\s+(.+)$/i);
    if(inlineElifMatch){
      return [`elseif ${normalizeConditionCallName(inlineElifMatch[1])} : ${inlineElifMatch[2].trim()}`];
    }
    const elifMatch = trimmed.match(/^elif\s+(.+):$/i);
    if(elifMatch){
      return [`elseif ${normalizeConditionCallName(elifMatch[1])}`];
    }
    const inlineElseMatch = trimmed.match(/^else\s*:\s+(.+)$/i);
    if(inlineElseMatch){
      return [`else : ${inlineElseMatch[1].trim()}`];
    }
    if(!trimmed.endsWith(":")) return [trimmed];
    return [trimmed.slice(0, -1).trim()];
  };

  const isBlockLine = (line) => {
    return /^(?:if|while|for)\b/i.test(line);
  };

  const isElseLine = (line) => {
    return /^else\s*:?\s*$/i.test(line);
  };

  const isBranchContinuationLine = (line) => {
    const trimmed = String(line ?? "").trim();
    return isElseLine(trimmed) || /^else\s*:\s+.+$/i.test(trimmed) || /^elif\s+.+:\s*.*$/i.test(trimmed);
  };

  function buildPythonLikeDsl(rawText){
    const lines = String(rawText ?? "").replace(/\r/g, "").split("\n");
    const stack = [];
    const out = [];

    for(const rawLine of lines){
      if(isIgnorableLine(rawLine)){
        out.push(rawLine);
        continue;
      }
      const lineWithoutComment = stripPythonComment(rawLine);
      const indent = countIndent(lineWithoutComment);
      const trimmed = lineWithoutComment.trim();
      const branchContinuationLine = isBranchContinuationLine(trimmed);

      while(stack.length){
        const top = stack[stack.length - 1];
        const shouldClose = branchContinuationLine ? indent < top.indent : indent <= top.indent;
        if(!shouldClose) break;
        out.push("end");
        stack.pop();
      }

      const dslLines = isElseLine(trimmed) ? ["else"] : toDslLines(trimmed);
      out.push(...dslLines);
      const dslLine = dslLines[0] || "";
      if(trimmed.endsWith(":") && isBlockLine(dslLine)){
        stack.push({ indent });
      }
    }

    while(stack.length){
      out.push("end");
      stack.pop();
    }
    return out.join("\n");
  }

  const ASYNC_COMMANDS = new Set([
    "applyMask",
    "drawBasePatterns",
    "drawBasePatternsStepped",
    "drawDataPatterns",
    "drawQRCode",
    "pauseRunning",
    "resetBoard",
    "drawFinderPatterns",
    "drawAlignmentPatterns",
    "drawDarkModulePatterns",
    "drawFormatPatterns",
    "drawTimingPatterns",
  ]);

  const getCommandName = (value) => {
    if(typeof value !== "string") return "";
    const match = value.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
    return match ? match[1] : "";
  };

  const formatStatement = (line, awaitCalls) => {
    const switchAssignment = normalizeSwitchAssignment(line);
    if(switchAssignment){
      const stmt = `${switchAssignment};`;
      return awaitCalls ? `await ${stmt}` : stmt;
    }
    const callArgMatch = String(line ?? "").trim().match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s+([A-Za-z_$][A-Za-z0-9_$]*\(\))$/);
    const formatted = callArgMatch
      ? `${callArgMatch[1]}(${callArgMatch[2]})`
      : formatStudentCodeLine(line);
    if(!formatted) return "";
    const stmt = formatted.endsWith(";") ? formatted : `${formatted};`;
    const commandName = getCommandName(formatted);
    if((awaitCalls || ASYNC_COMMANDS.has(commandName)) && !/^return\b/i.test(formatted)){
      return `await ${stmt}`;
    }
    return stmt;
  };

  const formatCondition = (condition) => {
    const trimmed = String(condition ?? "").trim();
    if(!trimmed) return "";
    if(/^is_data_finished(?:\s*\(\s*\))?$/i.test(trimmed)) return "!hasNextData()";
    const switchCondition = normalizeSwitchCondition(trimmed);
    if(switchCondition !== trimmed) return switchCondition;
    return formatStudentCodeLine(trimmed, { context: "condition" });
  };

  const buildWhileLine = (condition) => {
    const trimmed = String(condition ?? "").trim();
    if(!trimmed){
      throw new Error("while requires a condition");
    }
    if(/^\d+$/.test(trimmed)){
      throw new Error("while does not accept a numeric count; use for");
    }
    const formatted = formatCondition(trimmed);
    if(!formatted) return "";
    return `while (${formatted} && canContinueLoop()) {`;
  };

  const buildForLine = (count) => {
    const trimmed = String(count ?? "").trim();
    if(!/^\d+$/.test(trimmed)){
      throw new Error("for requires a numeric count");
    }
    const loopVar = `i${buildForLine.loopCounter++}`;
    return `for (let ${loopVar} = 0; ${loopVar} < ${Number(trimmed)} && canContinueLoop(); ${loopVar}++){`;
  };
  buildForLine.loopCounter = 0;

  function buildPythonScript(rawText, { awaitCalls = true } = {}){
    const dslText = buildPythonLikeDsl(rawText);
    try{
      if(!isFunction(formatStudentCodeLine)){
        throw new Error("script-parser.js must be loaded before script-parser-python.js");
      }
      buildForLine.loopCounter = 0;
      const lines = dslText.replace(/\r/g, "").split("\n");
      const combined = [];
      let blockDepth = 0;
      const isBranchLine = (value) => /^(?:elseif\b|else\b)/i.test(String(value ?? "").trim());
      const nextSignificantLine = (startIndex) => {
        for(let i = startIndex + 1; i < lines.length; i++){
          const candidate = String(lines[i] ?? "").trim();
          if(!candidate || candidate.startsWith("#")) continue;
          return candidate;
        }
        return "";
      };
      for(let lineIndex = 0; lineIndex < lines.length; lineIndex++){
        const rawLine = lines[lineIndex];
        const line = String(rawLine ?? "").trim();
        if(!line || line.startsWith("#")) continue;
        if(/^end$/i.test(line)){
          if(blockDepth > 0){
            combined.push("}");
            blockDepth--;
          }
          continue;
        }
        const elseInlineMatch = line.match(/^else\s+:\s+(.+)$/i);
        if(elseInlineMatch){
          combined.push(`} else { ${formatStatement(elseInlineMatch[1], awaitCalls)}`);
          continue;
        }
        if(/^else$/i.test(line)){
          combined.push("} else {");
          continue;
        }
        const elseifInlineMatch = line.match(/^elseif\s+(.+?)\s+:\s+(.+)$/i);
        if(elseifInlineMatch){
          const condition = formatCondition(elseifInlineMatch[1]);
          combined.push(`} else if (${condition}) { ${formatStatement(elseifInlineMatch[2], awaitCalls)}`);
          continue;
        }
        const elseifMatch = line.match(/^elseif\s+(.+)$/i);
        if(elseifMatch){
          const condition = formatCondition(elseifMatch[1]);
          combined.push(`} else if (${condition}) {`);
          continue;
        }
        const ifInlineMatch = line.match(/^if\s+(.+?)\s+:\s+(.+)$/i);
        if(ifInlineMatch){
          const condition = formatCondition(ifInlineMatch[1]);
          if(isBranchLine(nextSignificantLine(lineIndex))){
            combined.push(`if (${condition}) { ${formatStatement(ifInlineMatch[2], awaitCalls)}`);
            blockDepth++;
          }else{
            combined.push(`if (${condition}) ${formatStatement(ifInlineMatch[2], awaitCalls)}`);
          }
          continue;
        }
        const ifMatch = line.match(/^if\s+(.+)$/i);
        if(ifMatch){
          const condition = formatCondition(ifMatch[1]);
          combined.push(`if (${condition}) {`);
          blockDepth++;
          continue;
        }
        const whileMatch = line.match(/^while(?:\s+(.+))?$/i);
        if(whileMatch){
          const whileLine = buildWhileLine(whileMatch[1]);
          if(whileLine){
            combined.push(whileLine);
            blockDepth++;
          }
          continue;
        }
        const forMatch = line.match(/^for(?:\s+(.+))?$/i);
        if(forMatch){
          const forLine = buildForLine(forMatch[1]);
          combined.push(forLine);
          blockDepth++;
          continue;
        }
        const statement = formatStatement(line, awaitCalls);
        if(statement){
          combined.push(statement);
        }
      }
      while(blockDepth > 0){
        combined.push("}");
        blockDepth--;
      }
      return combined.join("\n");
    }catch(err){
      if(err && typeof err === "object"){
        err.userScriptDebugSource = dslText;
        err.userScriptDebugSourceLabel = "PH";
      }
      throw err;
    }
  }

  if(!isFunction(registerUserScriptLanguage)){
    throw new Error("user-script-language-registry.js must be loaded before script-parser-python.js");
  }
  registerUserScriptLanguage("python", {
    label: "Python-like",
    buildUserScript: buildPythonScript,
  });

  global.buildPythonLikeDsl = buildPythonLikeDsl;
})(typeof window !== "undefined" ? window : globalThis);
