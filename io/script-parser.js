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
    reset: "resetCommand",
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
    advance: "putNextCell",
  };
  const ALIAS_PATTERN = new RegExp(
    `\\b(${Object.keys(ALIAS_MAP).map(escapeRegExp).join("|")})\\b`,
    "gi",
  );
  const applyAliasTransforms = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text.replace(ALIAS_PATTERN, (match) => ALIAS_MAP[match.toLowerCase()] || match);
  };
  const KEYWORD_NUMBER_PATTERN = /\b(repeat|for|mask|pause|qrcode)(\d+)\b/gi;
  const applyKeywordSpacing = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text.replace(KEYWORD_NUMBER_PATTERN, "$1 $2");
  };
  const DIRECTION_SUFFIX_PATTERN = /\b(move|turn)(up|down|left|right|front|back)\b/gi;
  const applyCompoundDirectionSpacing = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text.replace(DIRECTION_SUFFIX_PATTERN, "$1 $2");
  };
  const CONDITIONAL_KEYWORDS = ["block", "clash", "empty", "used", "timing", "skip"];
  const CONDITIONAL_PATTERN = new RegExp(
    `\\b(${CONDITIONAL_KEYWORDS.map(escapeRegExp).join("|")})\\s*\\?\\s*(\\S.*)`,
    "gi",
  );
  const CONDITIONAL_LINE_PATTERN = new RegExp(
    `^\\s*(${CONDITIONAL_KEYWORDS.map(escapeRegExp).join("|")})\\s*\\?\\s*$`,
    "gim",
  );
  const applyConditionalAliases = (text) => {
    if(typeof text !== "string" || !text) return "";
    const resolveConditionalKeyword = (keyword) => {
      if(typeof keyword !== "string") return keyword;
      const lower = keyword.toLowerCase();
      if(lower === "timing" || lower === "skip") return "isSkipZone";
      return keyword;
    };
    if(CONDITIONAL_LINE_PATTERN.test(text)){
      text = text.replace(CONDITIONAL_LINE_PATTERN, (_match, keyword) => `if ${resolveConditionalKeyword(keyword)}`);
    }
    text = text.replace(
      CONDITIONAL_PATTERN,
      (_match, keyword, rest) => `if ${resolveConditionalKeyword(keyword)} ${rest}`,
    );
    text = text.replace(/\bif\s+timing\b/gi, (match) => match.replace(/timing/i, "isSkip"));
    text = text.replace(/\bif\s*\(\s*timing\b/gi, (match) => match.replace(/timing/i, "isSkip"));
    return text;
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
      return value.replace(/^[ \t]*(?:\/\/|#|'|;|-).*$/gm, "");
    };
    const spacedText = applyKeywordSpacing(stripLineComments(rawText || ""));
    const directionSpaced = applyCompoundDirectionSpacing(spacedText);
    const conditionalText = applyConditionalAliases(directionSpaced);
    const codeRaw = applyAliasTransforms(conditionalText);
    if(!codeRaw.trim()) return "";
    const formattedLines = codeRaw.replace(/\r/g, "").split("\n");
    const combined = [];
    let blockDepth = 0;
    let pendingInlineIf = null;
    for(const raw of formattedLines){
      const trimmed = typeof raw === "string" ? raw.trim() : "";
      if(trimmed === "end"){
        if(blockDepth > 0){
          combined.push("}");
          blockDepth--;
        }
        continue;
      }
      const line = trimmed.replace(/\s+$/g, "");
      const lineLower = line.toLowerCase();
      const indent = typeof raw === "string" ? raw.match(/^\s*/)[0] : "";
      const elseMatch = line.match(/^else\b(.*)$/i);
      const elseRest = elseMatch ? (elseMatch[1] || "").trim() : "";
      let handledInlineElse = false;
      if(pendingInlineIf && !(elseMatch && elseRest)){
        combined.push(pendingInlineIf.singleLine);
        blockDepth += countBraceDelta(pendingInlineIf.singleLine);
        pendingInlineIf = null;
      }
      if(pendingInlineIf && elseMatch && elseRest){
        if(pendingInlineIf.condFormatted && pendingInlineIf.awaitedBody && pendingInlineIf.indent === indent){
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
      const ifMatch = line.match(/^if\b(.*)$/i);
      if(ifMatch){
        const conditionRaw = (ifMatch[1] || "").trim();
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
              continue;
            }
          }
        }
      }
      if(elseMatch && !line.includes("{")){
        const restIfMatch = elseRest.match(/^if\b(.*)$/i);
        if(restIfMatch){
            const nestedLine = buildConditionalLine("} else if", restIfMatch[1]);
            if(nestedLine){
              combined.push(nestedLine);
              blockDepth += countBraceDelta(nestedLine);
              continue;
            }
          }
        combined.push("} else {");
        blockDepth += countBraceDelta("} else {");
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
            continue;
          }
        }else if(conditionRaw){
          const loopLine = buildSimpleLoopLine("while", conditionRaw);
          if(loopLine){
            combined.push(loopLine);
            blockDepth += countBraceDelta(loopLine);
            continue;
          }
        }else if(actualCondition){
          const loopLine = buildSimpleLoopLine("while", actualCondition);
          if(loopLine){
            combined.push(loopLine);
            blockDepth += countBraceDelta(loopLine);
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
            continue;
          }
        }else if(conditionRaw){
          const loopLine = buildSimpleLoopLine("until", conditionRaw);
          if(loopLine){
            combined.push(loopLine);
            blockDepth += countBraceDelta(loopLine);
            continue;
          }
        }else if(actualCondition){
          const loopLine = buildSimpleLoopLine("until", actualCondition);
          if(loopLine){
            combined.push(loopLine);
            blockDepth += countBraceDelta(loopLine);
            continue;
          }
        }
      }
      const repeatMatch = line.match(/^repeat(?:\s+(\d+))?$/i);
      if(repeatMatch){
        const count = repeatMatch[1];
        if(count){
          const formattedFor = formatSimpleFor(count);
          if(formattedFor){
            combined.push(formattedFor);
            blockDepth += countBraceDelta(formattedFor);
            continue;
          }
        }else{
          const repeatCondition = repeatDefaultConditionName();
          const guardCondition = formatStudentCodeLine(repeatCondition);
          const whileLine = `while (${guardCondition} && canContinueLoop()) {`;
          combined.push(whileLine);
          blockDepth += countBraceDelta(whileLine);
          continue;
        }
      }
      const isBlocky = /^(for|while|if|else\b|switch|do\b|try\b|catch\b|finally\b|function\b|async\b|return\b)/i.test(line)
        || /[{;}]$/.test(line);
      if(isBlocky){
        combined.push(line);
        blockDepth += countBraceDelta(line);
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
