/**
 * 学習用スクリプト（英語キーワード→内部API）を解析/変換するパーサ実装。
 */
(function(global){
  if(!global) return;
  const ABORT_ERR = global.ABORT_ERR || Symbol("run-aborted");
  global.ABORT_ERR = ABORT_ERR;

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ALIAS_MAP = {
    move: "moveCursor",
    turn: "turnCursor",
    reset: "resetQRCode",
    base: "drawBasePatterns",
    mask: "applyMask",
    data: "drawDataPatterns",
    qrcode: "drawQRCode",
    empty: "isEmpty",
    used: "isUsed",
    clash: "isMoveBlocked",
    block: "isMoveBlocked",
    put: "putCell",
    timing: "putTimingCells",
    skip: "isSkipZone",
    finder: "putFinderCells",
    finders: "drawFinderPatterns",
    alignment: "putAlignmentCells",
    alignments: "drawAlignmentPatterns",
    dark: "putDarkModuleCells",
    darkmodules: "drawDarkModulePatterns",
    format: "putFormatCells",
    formats: "drawFormatPatterns",
    timings: "drawTimingPatterns",
    next: "getNextData",
    pause: "pauseRunning",
    advance: "advanceCommand",
    clear: "clearBoard",
    red: "red",
    blue: "blue",
    green: "green",
    yellow: "yellow",
  };
  const BASE_SWITCH_NAMES = ["red", "blue", "green", "yellow"];
  const DEFAULT_ACTIVE_SWITCH_NAMES = BASE_SWITCH_NAMES.slice(0, 2);
  const SWITCH_STATE_INFO = {
    red: { name: "red", getter: "isRedOn", onExpr: "isRedOn()", offExpr: "!isRedOn()" },
    blue: { name: "blue", getter: "isBlueOn", onExpr: "isBlueOn()", offExpr: "!isBlueOn()" },
    green: { name: "green", getter: "isGreenOn", onExpr: "isGreenOn()", offExpr: "!isGreenOn()" },
    yellow: { name: "yellow", getter: "isYellowOn", onExpr: "isYellowOn()", offExpr: "!isYellowOn()" },
  };
  const BASE_CONDITIONAL_KEYWORDS = ["block", "clash", "empty", "used", "timing", "skip"];
  const BASE_ALLOWED_COMMANDS = new Set(Object.keys(ALIAS_MAP));
  const normalizeSwitchName = (value) => {
    if(typeof value !== "string") return "";
    return value.trim().toLowerCase();
  };
  const getConfiguredSwitchNames = () => {
    if(!global || !global.__qrSwitchConfig) return null;
    const { switchNames } = global.__qrSwitchConfig;
    if(!Array.isArray(switchNames)) return null;
    const normalized = switchNames
      .map(normalizeSwitchName)
      .filter((name) => name && BASE_SWITCH_NAMES.includes(name));
    const unique = Array.from(new Set(normalized));
    return BASE_SWITCH_NAMES.filter((name) => unique.includes(name));
  };
  const getActiveSwitchNames = () => {
    const configured = getConfiguredSwitchNames();
    if(Array.isArray(configured)){
      return configured;
    }
    return DEFAULT_ACTIVE_SWITCH_NAMES;
  };
  const buildActiveSwitchPattern = () => {
    const names = getActiveSwitchNames();
    if(!names.length) return "";
    return names.map(escapeRegExp).join("|");
  };
  const buildActiveSwitchInfoList = () => {
    const names = getActiveSwitchNames();
    return names.map((name) => SWITCH_STATE_INFO[name]).filter(Boolean);
  };
  const buildConditionalKeywordPattern = (activeInfoList) => {
    const expanded = BASE_CONDITIONAL_KEYWORDS.concat(activeInfoList.map((info) => info.name));
    if(!expanded.length) return "";
    return expanded.map(escapeRegExp).join("|");
  };
  const getAllowedCommandSet = () => {
    const allowed = new Set(BASE_ALLOWED_COMMANDS);
    const activeNames = new Set(getActiveSwitchNames());
    BASE_SWITCH_NAMES.forEach((name) => {
      if(!activeNames.has(name)){
        allowed.delete(name);
      }
    });
    return allowed;
  };
  const normalizeColorStateSpacing = (value) => {
    if(typeof value !== "string" || !value) return "";
    const pattern = buildActiveSwitchPattern();
    if(!pattern){
      return value;
    }
    return value.replace(new RegExp(`\\b(${pattern})(on|off)\\b`, "gi"), "$1 $2");
  };
  const ALIAS_PATTERN = new RegExp(
    `\\b(${Object.keys(ALIAS_MAP).map(escapeRegExp).join("|")})\\b`,
    "gi",
  );
  const applyAliasTransforms = (text) => {
    if(typeof text !== "string" || !text) return "";
    const normalized = normalizeColorStateSpacing(text)
      .replace(/\bmove\s+next\b/gi, "moveNext")
      .replace(/\bmove\s+advance\b/gi, "moveAdvance");
    return normalized.replace(ALIAS_PATTERN, (match) => ALIAS_MAP[match.toLowerCase()] || match);
  };
  const ALLOWED_CONTROL = new Set([
    "if",
    "when",
    "else",
    "while",
    "until",
    "repeat",
    "loop",
    "for",
    "end",
    "endif",
    "endfor",
    "endwhile",
    "enduntil",
    "endrepeat",
    "endloop",
  ]);
  const validateAllowedCommands = (text) => {
    if(typeof text !== "string") return;
    const lines = text.replace(/\r/g, "").split("\n");
    const allowedCommands = getAllowedCommandSet();
    for(const rawLine of lines){
      const trimmed = rawLine.trim();
      if(!trimmed) continue;
      const match = trimmed.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\b/);
      if(!match){
        throw new Error(`不明なコマンド: ${trimmed}`);
      }
      const head = match[1].toLowerCase();
      if(ALLOWED_CONTROL.has(head)) continue;
      if(allowedCommands.has(head)) continue;
      throw new Error(`不明なコマンド: ${match[1]}`);
    }
  };
  const KEYWORD_NUMBER_PATTERN = /\b(repeat|loop|for|mask|pause|qrcode)(\d+)\b/gi;
  const applyKeywordSpacing = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text.replace(KEYWORD_NUMBER_PATTERN, "$1 $2");
  };
  const DIRECTION_SUFFIX_PATTERN = /\b(move|turn)(up|down|left|right|front|back)\b/gi;
  const applyCompoundDirectionSpacing = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text.replace(DIRECTION_SUFFIX_PATTERN, "$1 $2");
  };
  const applyTurnSwitchCommands = (text) => {
    if(typeof text !== "string" || !text) return "";
    const pattern = buildActiveSwitchPattern();
    if(!pattern) return text;
    const turnSwitchPattern = new RegExp(`\\bturn\\s+(${pattern})\\b`, "gi");
    return text.replace(turnSwitchPattern, (_match, keyword) => {
      const normalized = keyword.toLowerCase();
      return `if ${normalized}? turn right else turn left`;
    });
  };
  const applyConditionalAliases = (text) => {
    if(typeof text !== "string" || !text) return "";
    text = normalizeColorStateSpacing(text);
    const switchPattern = buildActiveSwitchPattern();
    if(switchPattern){
      const stateShorthandPattern = new RegExp(`^([ \\t]*?)(${switchPattern})\\s+(on|off)\\?\\s*(.*)$`, "img");
      text = text.replace(stateShorthandPattern, (match, indent = "", keyword, state, rest = "") => {
        const trimmedRest = rest.trim();
        const suffix = trimmedRest ? ` ${trimmedRest}` : "";
        return `${indent}if ${keyword} ${state}?${suffix}`;
      });
    }
    const activeSwitchInfoList = buildActiveSwitchInfoList();
    const activeSwitchInfoMap = activeSwitchInfoList.reduce((map, info) => {
      map[info.name] = info;
      return map;
    }, Object.create(null));
    const conditionalPattern = buildConditionalKeywordPattern(activeSwitchInfoList);
    const explicitPattern = conditionalPattern
      ? new RegExp(`^\\s*(if|when)\\s+(${conditionalPattern})\\s*\\?\\s*(.*)$`, "i")
      : null;
    const shorthandPattern = conditionalPattern
      ? new RegExp(`^\\s*(${conditionalPattern})\\s*\\?\\s*(.*)$`, "i")
      : null;
    const resolveConditionalKeyword = (keyword) => {
      if(typeof keyword !== "string") return keyword;
      const lower = keyword.toLowerCase();
      const info = activeSwitchInfoMap[lower];
      if(info){
        return info.getter;
      }
      return keyword;
    };
    const lines = text.split(/\r?\n/);
    const mapped = lines.map((line) => {
      if(explicitPattern){
        const explicitMatch = line.match(explicitPattern);
        if(explicitMatch){
          const prefix = explicitMatch[1];
          const keyword = resolveConditionalKeyword(explicitMatch[2]);
          const rest = (explicitMatch[3] || "").trim();
          return rest ? `${prefix} ${keyword} ${rest}` : `${prefix} ${keyword}`;
        }
      }
      if(shorthandPattern){
        const shorthandMatch = line.match(shorthandPattern);
        if(shorthandMatch){
          const keyword = resolveConditionalKeyword(shorthandMatch[1]);
          const rest = (shorthandMatch[2] || "").trim();
          return rest ? `if ${keyword} ${rest}` : `if ${keyword}`;
        }
      }
      return line;
    });
    let result = mapped.join("\n");
    result = result.replace(/\bif\s+timing\b/gi, (match) => match.replace(/timing/i, "isSkip"));
    result = result.replace(/\bif\s*\(\s*timing\b/gi, (match) => match.replace(/timing/i, "isSkip"));
    const replaceColorStateCondition = (source, info, state, expr) => {
      if(!info) return source;
      const statePattern = `${state}\\??`;
      const parenPattern = new RegExp(`\\b(if|when)\\s*\\(\\s*${escapeRegExp(info.name)}\\s+${statePattern}\\s*\\)`, "gi");
      source = source.replace(parenPattern, (match, keyword) => `${keyword} (${expr})`);
      const barePattern = new RegExp(`\\b(if|when)\\s+${escapeRegExp(info.name)}\\s+${statePattern}\\b`, "gi");
      return source.replace(barePattern, (match, keyword) => `${keyword} ${expr}`);
    };
    activeSwitchInfoList.forEach((info) => {
      result = replaceColorStateCondition(result, info, "off", info.offExpr);
      result = replaceColorStateCondition(result, info, "on", info.onExpr);
    });
    const fixSimpleCondition = (source, info) => {
      if(!info) return source;
      const keyword = escapeRegExp(info.name);
      const getter = info.getter;
      const simplePattern = new RegExp(`\\bif\\s+${keyword}\\??\\b`, "gi");
      source = source.replace(simplePattern, (match) => match.replace(new RegExp(`${keyword}\\??`, "i"), getter));
      const parenPattern = new RegExp(`\\bif\\s*\\(\\s*${keyword}\\??\\b`, "gi");
      return source.replace(parenPattern, (match) => match.replace(new RegExp(`${keyword}\\??`, "i"), getter));
    };
    activeSwitchInfoList.forEach((info) => {
      result = fixSimpleCondition(result, info);
    });
    if(activeSwitchInfoList.length){
      const getterPattern = activeSwitchInfoList.map((info) => escapeRegExp(info.getter)).join("|");
      if(getterPattern){
        const positiveRegex = new RegExp(`((${getterPattern})\\(\\))\\?`, "g");
        result = result.replace(positiveRegex, "$1");
        const negativeRegex = new RegExp(`(!(${getterPattern})\\(\\))\\?`, "g");
        result = result.replace(negativeRegex, "$1");
      }
    }
    return result;
  };

  const countBraceDelta = (line) => {
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let escapeChar = false;
    for(const ch of line){
      if(escapeChar){
        escapeChar = false;
        continue;
      }
      if(ch === "\\" && (inSingle || inDouble || inBacktick)){
        escapeChar = true;
        continue;
      }
      if(ch === "'" && !inDouble && !inBacktick){
        inSingle = !inSingle;
        continue;
      }
      if(ch === '"' && !inSingle && !inBacktick){
        inDouble = !inDouble;
        continue;
      }
      if(ch === "`" && !inSingle && !inDouble){
        inBacktick = !inBacktick;
        continue;
      }
      if(inSingle || inDouble || inBacktick){
        continue;
      }
      if(ch === "{"){
        depth++;
      }else if(ch === "}"){
        depth--;
      }
    }
    return depth;
  };

  const indentScriptLines = (lines) => {
    const indented = [];
    let level = 0;
    for(const rawLine of lines){
      const trimmed = rawLine.trim();
      if(trimmed === ""){
        indented.push("");
        continue;
      }
      let effectiveLevel = level;
      if(/^\}/.test(trimmed)){
        effectiveLevel = Math.max(0, effectiveLevel - 1);
      }
      indented.push("  ".repeat(effectiveLevel) + trimmed);
      level = Math.max(0, level + countBraceDelta(trimmed));
    }
    return indented.join("\n");
  };

  function buildUserScript(rawText, { awaitCalls = true } = {}){
    let autoLoopCounter = 0;
    const blockStack = [];
    const popBlock = () => {
      if(blockStack.length > 0){
        blockStack.pop();
      }
    };
    const popBlockExpected = (type, endLabel) => {
      if(blockStack.length === 0 || blockStack[blockStack.length - 1] !== type){
        throw new Error(`${endLabel} に対応する ${type} がありません`);
      }
      blockStack.pop();
    };
    const pushBlock = (type) => {
      blockStack.push(type);
    };
    const repeatDefaultConditionName = () => {
      if(typeof global !== "undefined" && typeof global.hasMoreMove === "function"){
        return "hasMoreMove";
      }
      return "hasMoreData";
    };
    const DEFAULT_WHILE_CONDITION = "hasMoreData";
    const DEFAULT_UNTIL_CONDITION = "isDataEnd";
    const extractParenInfo = (line) => {
      const openIdx = line.indexOf("(");
      if(openIdx === -1) return null;
      let depth = 0;
      let closeIdx = -1;
      let inSingle = false;
      let inDouble = false;
      let escapeChar = false;
      for(let i = openIdx; i < line.length; i++){
        const ch = line[i];
        if(escapeChar){
          escapeChar = false;
          continue;
        }
        if(ch === "\\" && (inSingle || inDouble)){
          escapeChar = true;
          continue;
        }
        if(ch === "'" && !inDouble){
          inSingle = !inSingle;
          continue;
        }
        if(ch === '"' && !inSingle){
          inDouble = !inDouble;
          continue;
        }
        if(inSingle || inDouble){
          continue;
        }
        if(ch === "("){
          depth++;
        }else if(ch === ")"){
          depth--;
          if(depth === 0){
            closeIdx = i;
            break;
          }
        }
      }
      if(closeIdx === -1) return null;
      return {
        closeIdx,
        condition: line.slice(openIdx + 1, closeIdx),
        remainder: line.slice(closeIdx + 1),
        prefix: line.slice(0, closeIdx),
      };
    };
    const guardWhileWithParen = (line) => {
      if(line.toLowerCase().includes("cancontinueloop")) return null;
      const info = extractParenInfo(line);
      if(!info) return null;
      const closing = line.slice(info.closeIdx);
      return `${info.prefix} && canContinueLoop()${closing}`;
    };
    const rewriteUntilWithParen = (line) => {
      const info = extractParenInfo(line);
      if(!info) return null;
      const cond = info.condition.trim();
      if(!cond) return null;
      return `while (!(${cond}) && canContinueLoop())${info.remainder}`;
    };
    const stopCommandPattern = /^stop(?:\s+(?:for|while|repeat))?$/i;
    const buildSimpleLoopLine = (keyword, conditionRaw) => {
      const condFormatted = formatStudentCodeLine(conditionRaw);
      if(!condFormatted) return null;
      if(keyword === "while"){
        return `while (${condFormatted} && canContinueLoop()) {`;
      }
      return `while (!(${condFormatted}) && canContinueLoop()) {`;
    };
    const formatSimpleFor = (countVal) => {
      const n = Number(countVal);
      if(!Number.isFinite(n)) return null;
      const loopVar = `i${autoLoopCounter++}`;
      return `for (let ${loopVar} = 0; ${loopVar} < ${n}; ${loopVar}++){`;
    };
    const buildConditionalLine = (prefix, conditionRaw) => {
      const condition = typeof conditionRaw === "string" ? conditionRaw.trim() : "";
      if(!condition) return null;
      if(condition.startsWith("(") && condition.endsWith(")")){
        return `${prefix} ${condition} {`;
      }
      const formatted = formatStudentCodeLine(condition);
      if(!formatted) return null;
      return `${prefix} (${formatted}) {`;
    };
    const stripLineComments = (value) => {
      if(typeof value !== "string" || value === "") return "";
      return value
        .replace(/(?:\/\/|#|'|;|-).*$/gm, "")
        .replace(/^[ \t]*(?:\/\/|#|'|;|-).*$/gm, "");
    };
  const INLINE_ELSE_MARKER = "__inlineElse__";
  const expandInlineElseLines = (lines) => {
    if(!Array.isArray(lines)) return [];
    const inlineElsePattern = /^(\s*if\b[\s\S]+?)\belse\b\s*(.*)$/i;
    const expanded = [];
    for(const rawLine of lines){
      if(typeof rawLine !== "string" || !rawLine.trim().length){
        expanded.push(rawLine);
        continue;
      }
      const match = rawLine.match(inlineElsePattern);
      if(!match){
        expanded.push(rawLine);
        continue;
      }
      const [, ifPart, elsePart] = match;
      const trimmedIf = ifPart.replace(/\s+$/, "");
      const indentMatch = ifPart.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : "";
      const trimmedElse = elsePart.trim();
      const elseClause = trimmedElse ? `else ${trimmedElse}` : "else";
        expanded.push(trimmedIf);
        expanded.push(`${indent}${INLINE_ELSE_MARKER}${elseClause}`);
    }
    return expanded;
  };
    const spacedText = applyKeywordSpacing(stripLineComments(rawText || ""));
    const directionSpaced = applyCompoundDirectionSpacing(spacedText);
    const turnCommandText = applyTurnSwitchCommands(directionSpaced);
    const conditionalText = applyConditionalAliases(turnCommandText);
    validateAllowedCommands(conditionalText);
    const codeRaw = applyAliasTransforms(conditionalText);
    if(!codeRaw.trim()) return "";
    const formattedLines = codeRaw.replace(/\r/g, "").split("\n");
    const preparedLines = expandInlineElseLines(formattedLines);
    const combined = [];
    let blockDepth = 0;
    let pendingInlineIf = null;
    for(const raw of preparedLines){
      const trimmed = typeof raw === "string" ? raw.trim() : "";
      const pendingEndMatch = trimmed.match(/^end\s*(for|while|until|repeat|loop|if)$/i);
      if(pendingInlineIf && (trimmed === "end" || pendingEndMatch)){
        combined.push(pendingInlineIf.singleLine);
        blockDepth += countBraceDelta(pendingInlineIf.singleLine);
        pendingInlineIf = null;
      }
      if(trimmed === "end"){
        if(blockDepth > 0){
          combined.push("}");
          blockDepth--;
          popBlock();
        }
        continue;
      }
    const rawLineContent = trimmed.replace(/\s+$/g, "");
    const hasInlineElseMarker = rawLineContent.startsWith(INLINE_ELSE_MARKER);
    const line = hasInlineElseMarker ? rawLineContent.slice(INLINE_ELSE_MARKER.length) : rawLineContent;
    const lineLower = line.toLowerCase();
    const indent = typeof raw === "string" ? raw.match(/^\s*/)[0] : "";
      const endMatch = pendingEndMatch || line.match(/^end\s*(for|while|until|repeat|loop|if)$/i);
      if(endMatch){
        const kind = endMatch[1].toLowerCase();
        const expected = kind === "loop" ? "repeat" : kind;
        popBlockExpected(expected, `end${kind}`);
        combined.push("}");
        blockDepth = Math.max(0, blockDepth - 1);
        continue;
      }
      const elseMatch = line.match(/^else\b(.*)$/i);
      const elseRest = elseMatch ? (elseMatch[1] || "").trim() : "";
      let handledInlineElse = false;
      if(pendingInlineIf && !(elseMatch && elseRest)){
        combined.push(pendingInlineIf.singleLine);
        blockDepth += countBraceDelta(pendingInlineIf.singleLine);
        pendingInlineIf = null;
      }
      if(pendingInlineIf && elseMatch && elseRest){
        if(pendingInlineIf.condFormatted && pendingInlineIf.awaitedBody){
          const elseFormatted = formatStudentCodeLine(elseRest);
          const elseStmt = elseFormatted ? (elseFormatted.endsWith(";") ? elseFormatted : `${elseFormatted};`) : "";
          const elseAwaited = elseStmt ? (awaitCalls ? `await ${elseStmt}` : elseStmt) : "";
          const combinedLine = `if (${pendingInlineIf.condFormatted}) { ${pendingInlineIf.awaitedBody} } else { ${elseAwaited} }`;
          combined.push(combinedLine);
          blockDepth += countBraceDelta(combinedLine);
          pendingInlineIf = null;
          handledInlineElse = true;
        }
      }
      if(handledInlineElse){
        continue;
      }
      if(!line){
        if(pendingInlineIf) continue;
        continue;
      }
      const ifMatch = line.match(/^(if|when)\b(.*)$/i);
      if(ifMatch){
        const conditionRaw = (ifMatch[2] || "").trim();
        const singleLineInfo = (() => {
          if(!conditionRaw) return null;
          const firstSpaceIdx = conditionRaw.search(/\s/);
          if(firstSpaceIdx === -1) return null;
          const conditionToken = conditionRaw.slice(0, firstSpaceIdx).trim();
          const rest = conditionRaw.slice(firstSpaceIdx).trim();
          if(!conditionToken || !rest) return null;
          const condFormatted = formatStudentCodeLine(conditionToken);
          if(!condFormatted) return null;
          const exitMatch = rest.match(/^exit(?:\s+(?:for|while|repeat))?$/i);
          if(exitMatch){
            return { singleLine: `if (${condFormatted}) break;`, indent: typeof raw === "string" ? raw.match(/^\s*/)[0] : "" };
          }
          if(stopCommandPattern.test(rest)){
            return { singleLine: `if (${condFormatted}) throw ABORT_ERR;`, indent: typeof raw === "string" ? raw.match(/^\s*/)[0] : "" };
          }
          const bodyFormatted = formatStudentCodeLine(rest);
          if(!bodyFormatted) return null;
          const bodyStmt = bodyFormatted.endsWith(";") ? bodyFormatted : `${bodyFormatted};`;
          const awaitedBody = awaitCalls ? `await ${bodyStmt}` : bodyStmt;
          return {
            singleLine: `if (${condFormatted}) ${awaitedBody}`,
            condFormatted,
            awaitedBody,
            indent: typeof raw === "string" ? raw.match(/^\s*/)[0] : "",
          };
        })();
        if(singleLineInfo){
          pendingInlineIf = singleLineInfo;
          continue;
        }
        if(!line.includes("{")){
          if(conditionRaw){
            const buildLine = buildConditionalLine("if", conditionRaw);
            if(buildLine){
              combined.push(buildLine);
              blockDepth += countBraceDelta(buildLine);
              pushBlock("if");
              continue;
            }
          }
        }
      }
      if(elseMatch && !line.includes("{")){
        const restIfMatch = elseRest.match(/^(if|when)\b(.*)$/i);
        if(restIfMatch){
            const nestedLine = buildConditionalLine("} else if", restIfMatch[2]);
            if(nestedLine){
              combined.push(nestedLine);
              blockDepth += countBraceDelta(nestedLine);
              popBlock();
              pushBlock("if");
              continue;
            }
          }
        combined.push("} else {");
        blockDepth += countBraceDelta("} else {");
        popBlock();
        pushBlock("if");
        continue;
      }
      const whileMatch = line.match(/^while\b(.*)$/i);
      if(whileMatch && !lineLower.includes("cancontinueloop")){
        const conditionRaw = (whileMatch[1] || "").trim();
        const hasCondition = Boolean(conditionRaw);
        const actualCondition = hasCondition ? conditionRaw : DEFAULT_WHILE_CONDITION;
        if(conditionRaw.startsWith("(")){
          const guarded = guardWhileWithParen(line);
          if(guarded){
            combined.push(guarded);
            blockDepth += countBraceDelta(guarded);
            if(countBraceDelta(guarded) > 0){
              pushBlock("while");
            }
            continue;
          }
        }else if(conditionRaw){
          const loopLine = buildSimpleLoopLine("while", conditionRaw);
          if(loopLine){
            combined.push(loopLine);
            blockDepth += countBraceDelta(loopLine);
            pushBlock("while");
            continue;
          }
        }else if(actualCondition){
          const loopLine = buildSimpleLoopLine("while", actualCondition);
          if(loopLine){
            combined.push(loopLine);
            blockDepth += countBraceDelta(loopLine);
            pushBlock("while");
            continue;
          }
        }
      }
      const untilMatch = line.match(/^until\b(.*)$/i);
      if(untilMatch && !lineLower.includes("cancontinueloop")){
        const conditionRaw = (untilMatch[1] || "").trim();
        const actualCondition = conditionRaw || DEFAULT_UNTIL_CONDITION;
        if(conditionRaw.startsWith("(")){
          const rewritten = rewriteUntilWithParen(line);
          if(rewritten){
            combined.push(rewritten);
            blockDepth += countBraceDelta(rewritten);
            if(countBraceDelta(rewritten) > 0){
              pushBlock("until");
            }
            continue;
          }
        }else if(conditionRaw){
          const loopLine = buildSimpleLoopLine("until", conditionRaw);
          if(loopLine){
            combined.push(loopLine);
            blockDepth += countBraceDelta(loopLine);
            pushBlock("until");
            continue;
          }
        }else if(actualCondition){
          const loopLine = buildSimpleLoopLine("until", actualCondition);
          if(loopLine){
            combined.push(loopLine);
            blockDepth += countBraceDelta(loopLine);
            pushBlock("until");
            continue;
          }
        }
      }
      const forMatch = line.match(/^for(?:\s+(\d+))?$/i);
      if(forMatch){
        const count = forMatch[1];
        if(!count){
          throw new Error("for は回数指定のみ対応しています");
        }
        const formattedFor = formatSimpleFor(count);
        if(formattedFor){
          combined.push(formattedFor);
          blockDepth += countBraceDelta(formattedFor);
          pushBlock("for");
          continue;
        }
        throw new Error("for は回数指定のみ対応しています");
      }
      if(/^for\b/i.test(line)){
        throw new Error("for は回数指定のみ対応しています");
      }
      const repeatMatch = line.match(/^repeat(?:\s+(\d+))?$/i);
      const loopMatch = line.match(/^loop(?:\s+(\d+))?$/i);
      if(repeatMatch || loopMatch){
        const count = repeatMatch ? repeatMatch[1] : loopMatch[1];
        if(count){
          const formattedFor = formatSimpleFor(count);
          if(formattedFor){
            combined.push(formattedFor);
            blockDepth += countBraceDelta(formattedFor);
            pushBlock("repeat");
            continue;
          }
        }else{
          const repeatCondition = repeatDefaultConditionName();
          const guardCondition = formatStudentCodeLine(repeatCondition);
          const whileLine = `while (${guardCondition} && canContinueLoop()) {`;
          combined.push(whileLine);
          blockDepth += countBraceDelta(whileLine);
          pushBlock("repeat");
          continue;
        }
      }
      const isBlocky = /^(for|while|if|when|else\b|switch|do\b|try\b|catch\b|finally\b|function\b|async\b|return\b)/i.test(line)
        || /[{;}]$/.test(line);
      if(isBlocky){
        combined.push(line);
        blockDepth += countBraceDelta(line);
        const openDelta = countBraceDelta(line);
        if(openDelta > 0){
          const blockMatch = line.match(/^(if|while|until|repeat|for)\b/i);
          if(blockMatch){
            pushBlock(blockMatch[1].toLowerCase());
          }
        }
        continue;
      }
      const formatted = formatStudentCodeLine(line);
      if(formatted){
        const stmt = formatted.endsWith(";") ? formatted : `${formatted};`;
        combined.push(awaitCalls ? `await ${stmt}` : stmt);
      }
    }
    if(pendingInlineIf){
      combined.push(pendingInlineIf.singleLine);
      blockDepth += countBraceDelta(pendingInlineIf.singleLine);
      pendingInlineIf = null;
    }
    while(blockDepth > 0){
      combined.push("}");
      blockDepth--;
      popBlock();
    }
    return indentScriptLines(combined);
  }

  function formatStudentCodeLine(line){
    const trimmed = typeof line === "string" ? line.trim() : "";
    if(!trimmed) return "";
    const globalEnv = typeof global !== "undefined"
      ? global
      : (typeof globalThis !== "undefined" ? globalThis : null);
    const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    if(trimmed.includes("(") && trimmed.includes(")")){
      return trimmed.replace(/,/g, " ");
    }
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    if(parts.length === 0) return "";
    const fn = parts.shift();
    if(identifierPattern.test(fn)){
      if(!globalEnv || typeof globalEnv[fn] !== "function"){
        throw new Error(`不明なコマンド: ${fn}`);
      }
    }
    if(fn.toLowerCase() === "move"){
      const hasNumericArg = parts.some((arg) => /^[-+]?\d+(?:\.\d+)?$/.test(arg));
      if(hasNumericArg){
        throw new Error("move コマンドは数値指定に対応していません");
      }
    }
    const truthyKeywords = new Set(["true","ok","yes"]);
    const falseyKeywords = new Set(["false","ng","no"]);
    const args = parts.map((arg) => {
      const t = arg.trim();
      if(!t) return "";
      const lower = t.toLowerCase();
      if(truthyKeywords.has(lower)) return "true";
      if(falseyKeywords.has(lower)) return "false";
      if(/^[-+]?\d+(?:\.\d+)?$/.test(t)) return t;
      if(/^["'].+["']$/.test(t)) return t;
      if(identifierPattern.test(t) && globalEnv){
        const value = globalEnv[t];
        if(typeof value === "function"){
          return `${t}()`;
        }
      }
      return `"${t.replace(/"/g, '\\"')}"`;
    }).filter(Boolean);
    if(args.length === 0){
      return `${fn}()`;
    }
    return `${fn}(${args.join(", ")})`;
  }

  global.buildUserScript = buildUserScript;
  global.formatStudentCodeLine = formatStudentCodeLine;
})(typeof window !== "undefined" ? window : globalThis);
