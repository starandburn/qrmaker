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
    jump_cursor: "jumpCursor",
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
    did_move: "didMove",
  };
  const QR_DSL_COMMAND_HEADS = [
    "move",
    "turn",
    "reset",
    "base",
    "mask",
    "data",
    "qrcode",
    "empty",
    "block",
    "wall",
    "put",
    "timing",
    "skip",
    "finder",
    "finders",
    "alignment",
    "alignments",
    "dark",
    "darkmodule",
    "darkmodules",
    "format",
    "formats",
    "timings",
    "pause",
    "text",
    "left",
    "right",
    "up",
    "down",
    "stop",
  ];
  const PH_ALLOWED_STATEMENT_HEADS = new Set([
    ...Object.keys(CALL_NAME_MAP),
    ...Object.values(CALL_NAME_MAP),
    ...QR_DSL_COMMAND_HEADS,
  ]);
  const PH_KNOWN_STATEMENT_HEADS_LOWER = new Set(
    Array.from(PH_ALLOWED_STATEMENT_HEADS).map((name) => name.toLowerCase()),
  );

  const normalizeCallName = (name) => {
    return CALL_NAME_MAP[name] || name;
  };

  const shouldCallMappedName = (name) => {
    return Object.prototype.hasOwnProperty.call(CALL_NAME_MAP, name)
      || Object.values(CALL_NAME_MAP).includes(name);
  };

  const PH_MOVE_DIRECTION_ARGS = {
    0: "",
    1: "\"up\"",
    2: "\"right\"",
    3: "\"down\"",
    4: "\"left\"",
    UP: "\"up\"",
    RIGHT: "\"right\"",
    DOWN: "\"down\"",
    LEFT: "\"left\"",
  };
  const PH_CARDINAL_DIRECTION_ARGS = {
    1: "\"up\"",
    2: "\"right\"",
    3: "\"down\"",
    4: "\"left\"",
    UP: "\"up\"",
    RIGHT: "\"right\"",
    DOWN: "\"down\"",
    LEFT: "\"left\"",
    up: "\"up\"",
    right: "\"right\"",
    down: "\"down\"",
    left: "\"left\"",
  };
  const PH_MOVE_DIRECTION_WORDS = new Set(["up", "right", "down", "left", "front", "back"]);

  const normalizeCallArg = (arg) => {
    const trimmed = String(arg ?? "").trim();
    const normalizedName = normalizeCallName(trimmed);
    if(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(normalizedName) && shouldCallMappedName(trimmed)){
      throw new Error(`PH command requires parentheses: ${trimmed}`);
    }
    return normalizeCallName(trimmed);
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
    const match = trimmed.match(new RegExp(`^(not\\s+)?(${namePattern})$`));
    if(!match) return trimmed;
    const switchName = match[2];
    return match[1] ? `!isSwitchOn("${switchName}")` : `isSwitchOn("${switchName}")`;
  };

  const normalizeSwitchAssignment = (line) => {
    const trimmed = String(line ?? "").trim();
    const names = getActiveSwitchNames();
    const namePattern = names.join("|");
    if(!namePattern) return "";
    const match = trimmed.match(new RegExp(`^(${namePattern})\\s*=\\s*(.+)$`));
    if(!match) return "";
    const switchName = match[1];
    const rawValue = match[2].trim();
    if(rawValue === "True"){
      return `setSwitch("${switchName}", true)`;
    }
    if(rawValue === "False"){
      return `setSwitch("${switchName}", false)`;
    }
    const switchCondition = normalizeSwitchCondition(rawValue);
    if(switchCondition !== rawValue){
      return `setSwitch("${switchName}", ${switchCondition})`;
    }
    return "";
  };

  const isActiveSwitchName = (name) => {
    const normalized = normalizeSwitchName(name);
    return getActiveSwitchNames().includes(normalized);
  };

  const assertNoSwitchCommandShorthand = (line) => {
    const trimmed = String(line ?? "").trim();
    const match = trimmed.match(/^([A-Za-z_$][A-Za-z0-9_$-]*)\b/);
    if(!match) return;
    if(isActiveSwitchName(match[1])){
      throw new Error("PH switch shorthand commands are disabled; use set_switch(..., True/False) or assignment");
    }
  };

  const normalizeSwitchCommandNameArg = (arg) => {
    const normalized = normalizeSwitchArg(arg);
    if(!isActiveSwitchName(normalized)){
      return normalizeCallArg(arg);
    }
    return `"${normalized}"`;
  };

  const normalizeSwitchValueArg = (arg) => {
    const rawValue = normalizeSwitchArg(arg);
    if(rawValue === "True") return "true";
    if(rawValue === "False") return "false";
    if(isActiveSwitchName(rawValue)) return `isSwitchOn("${rawValue}")`;
    throw new Error("PH set_switch value must be True or False");
  };

  const CALL_SYNTAX_PATTERN = /\b([A-Za-z_$][A-Za-z0-9_$-]*)\s*\(([^()]*)\)/g;
  const isQuotedArg = (arg) => /^["'][\s\S]*["']$/.test(String(arg ?? "").trim());
  const isPhMoveDirectionLiteral = (rawArg, sourceArg) => {
    const lower = String(rawArg ?? "").trim().toLowerCase();
    if(!PH_MOVE_DIRECTION_WORDS.has(lower)) return false;
    return isQuotedArg(sourceArg);
  };
  const assertNoPhMoveDirectionLiteral = (rawArg, sourceArg) => {
    if(isPhMoveDirectionLiteral(rawArg, sourceArg)){
      throw new Error("PH move_cursor direction strings are disabled; use 1/2/3/4 or UP/RIGHT/DOWN/LEFT");
    }
  };
  const normalizeCallMatch = (name, args) => {
    const sourceArgs = String(args ?? "").split(",").map((arg) => String(arg ?? "").trim()).filter(Boolean);
    const rawArgs = sourceArgs.map(normalizeSwitchArg).filter(Boolean);
    const normalizedName = normalizeCallName(name);
    if(isActiveSwitchName(normalizedName)){
      throw new Error("PH switch shorthand commands are disabled; use set_switch(..., True/False) or assignment");
    }
    if(normalizedName === "moveCursor" && rawArgs.length >= 1){
      const rawMoveArg = rawArgs[0];
      if(Object.prototype.hasOwnProperty.call(PH_MOVE_DIRECTION_ARGS, rawMoveArg)){
        if(rawMoveArg === "0" && rawArgs.length === 1){
          return normalizedName;
        }
        const restArgs = sourceArgs.slice(1).map(normalizeCallArg).filter(Boolean);
        return [normalizedName, PH_MOVE_DIRECTION_ARGS[rawMoveArg], ...restArgs].join(" ");
      }
      assertNoPhMoveDirectionLiteral(rawMoveArg, sourceArgs[0]);
      throw new Error("PH position moves require jump_cursor(...)");
    }
    if(normalizedName === "isEmpty" && rawArgs.length === 1
      && Object.prototype.hasOwnProperty.call(PH_CARDINAL_DIRECTION_ARGS, rawArgs[0])){
      return `${normalizedName} ${PH_CARDINAL_DIRECTION_ARGS[rawArgs[0]]}`;
    }
    if(normalizedName === "jumpCursor" && rawArgs.length === 1){
      const rawJumpArg = rawArgs[0];
      if(rawJumpArg === "0"){
        return `${normalizedName} ${rawJumpArg}`;
      }
      if(Object.prototype.hasOwnProperty.call(PH_MOVE_DIRECTION_ARGS, rawJumpArg)
        || isPhMoveDirectionLiteral(rawJumpArg, sourceArgs[0])){
        throw new Error("PH direction moves require move_cursor(...)");
      }
    }
    if(name === "set_switch" && rawArgs.length >= 1){
      const switchArgs = [normalizeSwitchCommandNameArg(sourceArgs[0])];
      if(sourceArgs.length >= 2){
        switchArgs.push(normalizeSwitchValueArg(sourceArgs[1]));
      }
      return `setSwitch ${switchArgs.join(" ")}`;
    }
    if(name === "on_switch" || name === "off_switch" || name === "flip_switch"){
      throw new Error("PH on_switch/off_switch/flip_switch are disabled; use set_switch(..., True/False) or assignment");
    }
    const normalizedArgs = String(args ?? "")
      .split(",")
      .map(normalizeCallArg)
      .filter(Boolean)
      .join(" ");
    return normalizedArgs ? `${normalizedName} ${normalizedArgs}` : normalizedName;
  };

  const assertNoBarePhCalls = (line) => {
    const protectedCalls = [];
    const protectedLine = String(line ?? "").replace(CALL_SYNTAX_PATTERN, (match, name, args) => {
      const placeholder = `__PH_CALL_${protectedCalls.length}__`;
      protectedCalls.push(normalizeCallMatch(name, args));
      return placeholder;
    });
    const tokenPattern = /\b[A-Za-z_$][A-Za-z0-9_$-]*\b/g;
    let match = tokenPattern.exec(protectedLine);
    while(match){
      const token = match[0];
      if(PH_ALLOWED_STATEMENT_HEADS.has(token) || PH_KNOWN_STATEMENT_HEADS_LOWER.has(token.toLowerCase())){
        throw new Error(`PH command requires parentheses: ${token}`);
      }
      match = tokenPattern.exec(protectedLine);
    }
    return protectedLine.replace(/__PH_CALL_(\d+)__/g, (match, index) => protectedCalls[Number(index)] || match);
  };

  const normalizeConditionCallName = (condition) => {
    return normalizeSwitchCondition(condition);
  };

  const normalizePhLine = (line) => {
    return assertNoBarePhCalls(line);
  };

  const toDslLines = (line) => {
    const trimmed = normalizePhLine(line).trim();
    const inlineIfMatch = trimmed.match(/^(if)\s+([^:]+):\s+(.+)$/);
    if(inlineIfMatch){
      return [`${inlineIfMatch[1]} ${normalizeConditionCallName(inlineIfMatch[2])} : ${inlineIfMatch[3].trim()}`];
    }
    const inlineElifMatch = trimmed.match(/^elif\s+([^:]+):\s+(.+)$/);
    if(inlineElifMatch){
      return [`elseif ${normalizeConditionCallName(inlineElifMatch[1])} : ${inlineElifMatch[2].trim()}`];
    }
    const elifMatch = trimmed.match(/^elif\s+(.+):$/);
    if(elifMatch){
      return [`elseif ${normalizeConditionCallName(elifMatch[1])}`];
    }
    const inlineElseMatch = trimmed.match(/^else\s*:\s+(.+)$/);
    if(inlineElseMatch){
      return [`else : ${inlineElseMatch[1].trim()}`];
    }
    if(!trimmed.endsWith(":")) return [trimmed];
    return [trimmed.slice(0, -1).trim()];
  };

  const isBlockLine = (line) => {
    return /^(?:if|while|for)\b/.test(line);
  };

  const isElseLine = (line) => {
    return /^else\s*:?\s*$/.test(line);
  };

  const isBranchContinuationLine = (line) => {
    const trimmed = String(line ?? "").trim();
    return isElseLine(trimmed) || /^else\s*:\s+.+$/.test(trimmed) || /^elif\s+.+:\s*.*$/.test(trimmed);
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

  const assertPhStatementHeadCasing = (line) => {
    const match = String(line ?? "").trim().match(/^([A-Za-z_$][A-Za-z0-9_$-]*)\b/);
    if(!match) return;
    const head = match[1];
    if(PH_ALLOWED_STATEMENT_HEADS.has(head)) return;
    if(PH_KNOWN_STATEMENT_HEADS_LOWER.has(head.toLowerCase())){
      throw new Error(`Unknown PH command casing: ${head}`);
    }
  };

  const formatStatement = (line, awaitCalls) => {
    assertPhStatementHeadCasing(line);
    const switchAssignment = normalizeSwitchAssignment(line);
    if(switchAssignment){
      const stmt = `${switchAssignment};`;
      return awaitCalls ? `await ${stmt}` : stmt;
    }
    assertNoSwitchCommandShorthand(line);
    const callArgMatch = String(line ?? "").trim().match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s+([A-Za-z_$][A-Za-z0-9_$]*\(\))$/);
    const formatted = callArgMatch
      ? `${callArgMatch[1]}(${callArgMatch[2]})`
      : formatStudentCodeLine(line);
    if(!formatted) return "";
    const stmt = formatted.endsWith(";") ? formatted : `${formatted};`;
    const commandName = getCommandName(formatted);
    if((awaitCalls || ASYNC_COMMANDS.has(commandName)) && !/^return\b/.test(formatted)){
      return `await ${stmt}`;
    }
    return stmt;
  };

  const formatCondition = (condition) => {
    const trimmed = String(condition ?? "").trim();
    if(!trimmed) return "";
    const notMatch = trimmed.match(/^not\s+(.+)$/);
    if(notMatch){
      const inner = formatCondition(notMatch[1]);
      return inner ? `!(${inner})` : "";
    }
    if(/^is_data_finished(?:\s*\(\s*\))?$/.test(trimmed)) return "!hasNextData()";
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
      const isBranchLine = (value) => /^(?:elseif\b|else\b)/.test(String(value ?? "").trim());
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
        if(/^end$/.test(line)){
          if(blockDepth > 0){
            combined.push("}");
            blockDepth--;
          }
          continue;
        }
        const elseInlineMatch = line.match(/^else\s+:\s+(.+)$/);
        if(elseInlineMatch){
          combined.push(`} else { ${formatStatement(elseInlineMatch[1], awaitCalls)}`);
          continue;
        }
        if(/^else$/.test(line)){
          combined.push("} else {");
          continue;
        }
        const elseifInlineMatch = line.match(/^elseif\s+(.+?)\s+:\s+(.+)$/);
        if(elseifInlineMatch){
          const condition = formatCondition(elseifInlineMatch[1]);
          combined.push(`} else if (${condition}) { ${formatStatement(elseifInlineMatch[2], awaitCalls)}`);
          continue;
        }
        const elseifMatch = line.match(/^elseif\s+(.+)$/);
        if(elseifMatch){
          const condition = formatCondition(elseifMatch[1]);
          combined.push(`} else if (${condition}) {`);
          continue;
        }
        const ifInlineMatch = line.match(/^if\s+(.+?)\s+:\s+(.+)$/);
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
        const ifMatch = line.match(/^if\s+(.+)$/);
        if(ifMatch){
          const condition = formatCondition(ifMatch[1]);
          combined.push(`if (${condition}) {`);
          blockDepth++;
          continue;
        }
        const whileMatch = line.match(/^while(?:\s+(.+))?$/);
        if(whileMatch){
          const whileLine = buildWhileLine(whileMatch[1]);
          if(whileLine){
            combined.push(whileLine);
            blockDepth++;
          }
          continue;
        }
        const forMatch = line.match(/^for(?:\s+(.+))?$/);
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
