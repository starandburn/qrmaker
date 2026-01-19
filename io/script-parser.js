/**
 * 学習用スクリプト（英語キーワード→内部API）を解析/変換するパーサ実装。
 */
(function(global){
  if(!global) return;
  const missingAbortMsg = "board.js must be loaded before script-parser.js. Required constant 'ABORT_ERR' is not defined.";
  const requireUtils = global.requireUtils;
  if(!requireUtils){
    throw new Error(missingAbortMsg);
  }
  requireUtils.requireGlobalProp(global, "ABORT_ERR", missingAbortMsg);
  const ABORT_ERR = global.ABORT_ERR;
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
    block: "isMoveBlocked",
    wall: "isMoveBlocked",
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
    pause: "pauseRunning",
    text: "drawText",
  };
  const CSS_DARK_COLORS = new Set(["red", "blue", "green", "yellow"]);
  const CSS_DARK_COLOR_CACHE = new Map();
  const resolveRootComputedStyle = () => {
    const doc = (global && global.document) ? global.document : null;
    if(!doc || !doc.documentElement) return null;
    const view = doc.defaultView || global;
    if(view && typeof view.getComputedStyle === "function"){
      return view.getComputedStyle(doc.documentElement);
    }
    return null;
  };
  const getCssDarkColor = (name) => {
    if(typeof name !== "string"){
      throw new Error("Color name must be a string");
    }
    const normalized = name.trim().toLowerCase();
    if(!normalized){
      throw new Error("Color name cannot be empty");
    }
    if(CSS_DARK_COLOR_CACHE.has(normalized)){
      return CSS_DARK_COLOR_CACHE.get(normalized);
    }
    const rootStyle = resolveRootComputedStyle();
    if(!rootStyle || typeof rootStyle.getPropertyValue !== "function"){
      throw new Error("Unable to read CSS variables for dark colors");
    }
    const varName = `--col-${normalized}-dark`;
    const value = rootStyle.getPropertyValue(varName);
    if(typeof value !== "string"){
      throw new Error(`CSS variable ${varName} is not defined`);
    }
    const trimmedValue = value.trim();
    if(!trimmedValue){
      throw new Error(`CSS variable ${varName} is empty`);
    }
    CSS_DARK_COLOR_CACHE.set(normalized, trimmedValue);
    return trimmedValue;
  };
  global.getCssDarkColor = getCssDarkColor;
  const COLOR_KIND_PRIORITY = {
    red: [
      { name: "BIT_FUNC_ALIGNMENT", sign: 1 },
      { name: "BIT_FUNC_FINDER", sign: 1 },
      { name: "BIT_FUNC_DARK", sign: 1 },
    ],
    blue: [
      { name: "BIT_INFO_MODE", sign: 1 },
      { name: "BIT_INFO_LENGTH", sign: 1 },
    ],
    green: [
      { name: "BIT_INFO_PARITY", sign: -1 },
    ],
    yellow: [
      { name: "BIT_INFO_TERMINATOR", sign: -1 },
    ],
  };
  const resolveKindConstant = (name) => {
    if(typeof name !== "string" || !name) return null;
    if(typeof global !== "undefined" && typeof global[name] === "number"){
      return name;
    }
    if(typeof globalThis !== "undefined" && typeof globalThis[name] === "number"){
      return name;
    }
    return null;
  };
  const getKindNameForColor = (colorName) => {
    const normalized = typeof colorName === "string" ? colorName.trim().toLowerCase() : "";
    if(!normalized) return null;
    const priority = COLOR_KIND_PRIORITY[normalized];
    if(!Array.isArray(priority)) return null;
    for(const candidate of priority){
      const resolved = resolveKindConstant(candidate.name);
      if(resolved) return { name: resolved, sign: candidate.sign };
    }
    return null;
  };
  const BASE_SWITCH_NAMES = ["red", "blue", "green", "yellow"];
  const DEFAULT_ACTIVE_SWITCH_NAMES = BASE_SWITCH_NAMES.slice(0, 2);
  const makeSwitchStateInfo = (name) => ({
    name,
    getter: `isSwitchOn("${name}")`,
    onExpr: `isSwitchOn("${name}")`,
    offExpr: `!isSwitchOn("${name}")`,
  });
  const SWITCH_STATE_INFO = Object.fromEntries(BASE_SWITCH_NAMES.map((name) => [name, makeSwitchStateInfo(name)]));
  const BASE_CONDITIONAL_KEYWORDS = [
    "block",
    "wall",
    "pass",
    "empty",
    "used",
    "timing",
    "skip",
    "last",
  ];
  const BASE_ALLOWED_COMMANDS = new Set(Object.keys(ALIAS_MAP).map((key) => key.toLowerCase()));
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
    allowed.add("setswitch");
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
    const normalized = normalizeColorStateSpacing(text);
    return normalized.replace(ALIAS_PATTERN, (match) => ALIAS_MAP[match.toLowerCase()] || match);
  };
  const ALLOWED_CONTROL = new Set([
    "if",
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
      if(/^put\s*(black|white)\b/i.test(trimmed)){
        continue;
      }
      if(/^move\s+(next|advance)\b/i.test(trimmed)){
        throw new Error("move next/advance は使用できません");
      }
      const match = trimmed.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\b/);
      if(!match){
        throw new Error(`不明なコマンド: ${trimmed}`);
      }
      const head = match[1].toLowerCase();
      if(head === "next?"){
        continue;
      }
      if(ALLOWED_CONTROL.has(head)) continue;
      if(allowedCommands.has(head)) continue;
      throw new Error(`不明なコマンド: ${match[1]}`);
    }
  };
  const KEYWORD_NUMBER_PATTERN = /\b(repeat|loop|for|mask|pause|qrcode|put)(\d+)\b/gi;
  const applyKeywordSpacing = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text
      .replace(/\bputnext\b/gi, "put next")
      .replace(KEYWORD_NUMBER_PATTERN, "$1 $2");
  };
  const DIRECTION_SUFFIX_PATTERN = /\b(move|turn)(up|down|left|right|front|back)\b/gi;
  const ASCII_ALPHANUMERIC_PATTERN = /[0-9A-Za-z]/;
  const WHITESPACE_PATTERN = /\s/;
  const ALLOWED_SPECIAL_SYMBOLS = new Set(["?", "-", "'"]);
  const FULLWIDTH_BRACKETS = new Set(["（","）","［","］","｛","｝","【","】","〈","〉","《","》"]);
  const TEXT_LINE_PATTERN = /^\s*text\b/i;
  const ensureNoForbiddenSymbols = (text) => {
    if(typeof text !== "string" || !text) return;
    const lines = text.replace(/\r/g, "").split("\n");
    for(const line of lines){
      if(TEXT_LINE_PATTERN.test(line)){
        continue;
      }
      let inDoubleQuotes = false;
      for(const ch of line){
        if(inDoubleQuotes){
          if(ch === "\""){
            inDoubleQuotes = false;
          }
          continue;
        }
        if(ch === "\""){
          inDoubleQuotes = true;
          continue;
        }
        if(WHITESPACE_PATTERN.test(ch)) continue;
        const code = ch.codePointAt(0);
        if(code <= 0x7F){
          if(ASCII_ALPHANUMERIC_PATTERN.test(ch) || ALLOWED_SPECIAL_SYMBOLS.has(ch)) continue;
          throw new Error(`使用できない文字(${ch})が含まれています。`);
        }
        if(FULLWIDTH_BRACKETS.has(ch)){
          throw new Error(`使用できない文字(${ch})が含まれています。`);
        }
      }
    }
  };
  const applyCompoundDirectionSpacing = (text) => {
    if(typeof text !== "string" || !text) return "";
    return text.replace(DIRECTION_SUFFIX_PATTERN, "$1 $2");
  };
  const applyNegationQuestionSpacing = (text) => {
    if(typeof text !== "string" || !text) return text;
    const names = getActiveSwitchNames();
    const keywords = BASE_CONDITIONAL_KEYWORDS.concat(names);
    if(!keywords.length) return text;
    const keywordPattern = keywords.map(escapeRegExp).join("|");
    const newline = text.includes("\r\n") ? "\r\n" : "\n";
    return text
      .split(/\r?\n/)
      .map((line) => {
        const match = line.match(
          new RegExp(`^(\\s*if\\s+)-\\s*(${keywordPattern})(\\s*)(\\??)(.*)$`, "i"),
        );
        if(!match){
          return line;
        }
        const [, prefix, keyword, spacing = "", question = "", rest = ""] = match;
        return `${prefix}-${keyword}?${spacing}${rest}`;
      })
      .join(newline);
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
  const applySwitchConditionSpacing = (text) => {
    if(typeof text !== "string" || !text) return text;
    const names = getActiveSwitchNames();
    if(!names.length) return text;
    const pattern = names.map(escapeRegExp).join("|");
    const condPattern = new RegExp(`\\b(${pattern})(on|off)\\?`, "gi");
    return text.replace(condPattern, "$1 $2?");
  };
  const applySwitchCommandAliases = (text) => {
    if(typeof text !== "string" || !text) return "";
    const names = getActiveSwitchNames();
    if(!names.length) return text;
    const namePattern = names.map(escapeRegExp).join("|");
      const switchLinePattern = new RegExp(
      `^([ \\t]*)(await\\s+)?(${namePattern})(?:\\s*\\(([^)]*)\\)|((?:on|off|flip|toggle))|\\s+((?:on|off|flip|toggle)))?\\s*;?$`,
      "i",
    );
    return text
      .split(/\r?\n/)
      .map((rawLine) => {
        const trimmed = rawLine.trim();
        if(!trimmed || trimmed.includes("?")){
          return rawLine;
        }
        const match = rawLine.match(switchLinePattern);
        if(!match){
          return rawLine;
        }
        const [, indent = "", awaitPart = "", name, args, inlineState, spacedState] = match;
        const callArgs = [`"${name}"`];
        if(args){
          const trimmedArgs = args.trim();
          if(trimmedArgs){
            callArgs.push(trimmedArgs);
          }
        }
        const state = inlineState || spacedState;
        if(state){
          callArgs.push(`"${state.toLowerCase()}"`);
        }
        const placeholder = "__SWITCH_COMMA__";
        const joined = callArgs.join(placeholder);
        return `${indent}${awaitPart || ""}setSwitch(${joined})`;
      })
      .join("\n");
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
      ? new RegExp(`^\\s*(if)\\s+(-\\s*)?(${conditionalPattern})\\s*\\?\\s*(.*)$`, "i")
      : null;
    const shorthandPattern = conditionalPattern
      ? new RegExp(`^\\s*(-\\s*)?(${conditionalPattern})\\s*\\?\\s*(.*)$`, "i")
      : null;
    const resolveConditionExpression = (rawKeyword, negated) => {
      if(typeof rawKeyword !== "string") return rawKeyword;
      const trimmed = rawKeyword.trim();
      if(!trimmed) return trimmed;
      const lower = trimmed.toLowerCase();
      let expr = trimmed;
      let negationCount = negated ? 1 : 0;
      if(lower === "used"){
        expr = "isEmpty";
        negationCount += 1;
      }else if(lower === "pass"){
        expr = "isMoveBlocked";
        negationCount += 1;
      }else if(lower === "last"){
        expr = "hasMoreData";
        negationCount += 1;
      }else if(lower === "timing"){
        expr = "isSkipZone";
      }else{
        const info = activeSwitchInfoMap[lower];
        if(info){
          expr = info.getter;
        }
      }
      if(negationCount % 2 === 0){
        return expr;
      }
      if(expr.startsWith("!")){
        return expr.slice(1);
      }
      return `!${expr}`;
    };
    const lines = text.split(/\r?\n/);
    const mapped = lines.map((line) => {
      if(explicitPattern){
        const explicitMatch = line.match(explicitPattern);
        if(explicitMatch){
          const prefix = explicitMatch[1];
          const negated = Boolean(explicitMatch[2]);
          const rawKeyword = explicitMatch[3];
          const rest = (explicitMatch[4] || "").trim();
          const condition = resolveConditionExpression(rawKeyword, negated);
          return rest ? `${prefix} ${condition} ${rest}` : `${prefix} ${condition}`;
        }
      }
      if(shorthandPattern){
        const shorthandMatch = line.match(shorthandPattern);
        if(shorthandMatch){
          const negated = Boolean(shorthandMatch[1]);
          const rawKeyword = shorthandMatch[2];
          const rest = (shorthandMatch[3] || "").trim();
          const condition = resolveConditionExpression(rawKeyword, negated);
          return rest ? `if ${condition} ${rest}` : `if ${condition}`;
        }
      }
      return line;
    });
    let result = mapped.join("\n");
    if(conditionalPattern){
      const ifSimplePattern = new RegExp(`\\bif\\s+(-\\s*)?(${conditionalPattern})\\b(?!\\s*\\?)`, "gi");
      result = result.replace(ifSimplePattern, (_match, negPrefix, cond) => {
        const negated = Boolean(negPrefix && negPrefix.trim());
        const resolved = resolveConditionExpression(cond, negated);
        return `if ${resolved}`;
      });
      const ifParenPattern = new RegExp(`\\bif\\s*\\(\\s*(-\\s*)?(${conditionalPattern})\\b(?!\\s*\\?)`, "gi");
      result = result.replace(ifParenPattern, (_match, negPrefix, cond) => {
        const negated = Boolean(negPrefix && negPrefix.trim());
        const resolved = resolveConditionExpression(cond, negated);
        return `if (${resolved}`;
      });
      const loopKeywordPattern = "(while|until|repeat|loop)";
      const whileUntilQuestionPattern = new RegExp(
        `\\b${loopKeywordPattern}\\s+(-\\s*)?(${conditionalPattern})\\s*\\?`,
        "gi",
      );
      result = result.replace(
        whileUntilQuestionPattern,
        (_match, keyword, negPrefix, cond) => {
          const negated = Boolean(negPrefix && negPrefix.trim());
          const resolved = resolveConditionExpression(cond, negated);
          return `${keyword} ${resolved}`;
        },
      );
      const whileUntilParenQuestionPattern = new RegExp(
        `\\b${loopKeywordPattern}\\s*\\(\\s*(-\\s*)?(${conditionalPattern})\\s*\\?`,
        "gi",
      );
      result = result.replace(
        whileUntilParenQuestionPattern,
        (_match, keyword, negPrefix, cond) => {
          const negated = Boolean(negPrefix && negPrefix.trim());
          const resolved = resolveConditionExpression(cond, negated);
          return `${keyword} (${resolved}`;
        },
      );
      const whileUntilSimplePattern = new RegExp(
        `\\b${loopKeywordPattern}\\s+(-\\s*)?(${conditionalPattern})\\b(?!\\s*\\?)`,
        "gi",
      );
      result = result.replace(
        whileUntilSimplePattern,
        (_match, keyword, negPrefix, cond) => {
          const negated = Boolean(negPrefix && negPrefix.trim());
          const resolved = resolveConditionExpression(cond, negated);
          return `${keyword} ${resolved}`;
        },
      );
      const whileUntilParenPattern = new RegExp(
        `\\b${loopKeywordPattern}\\s*\\(\\s*(-\\s*)?(${conditionalPattern})\\b(?!\\s*\\?)`,
        "gi",
      );
      result = result.replace(
        whileUntilParenPattern,
        (_match, keyword, negPrefix, cond) => {
          const negated = Boolean(negPrefix && negPrefix.trim());
          const resolved = resolveConditionExpression(cond, negated);
          return `${keyword} (${resolved}`;
        },
      );
    }
    result = result.replace(/\bif\s+!pass\b/gi, (match) => match.replace(/!pass/i, "isMoveBlocked"));
    result = result.replace(/\bif\s*\(\s*!pass\b/gi, (match) => match.replace(/!pass/i, "isMoveBlocked"));
    result = result.replace(/\b(while|until|repeat|loop)\s+!pass\b/gi, (match) => match.replace(/!pass/i, "isMoveBlocked"));
    result = result.replace(/\b(while|until|repeat|loop)\s*\(\s*!pass\b/gi, (match) => match.replace(/!pass/i, "isMoveBlocked"));
    const replaceColorStateCondition = (source, info, state, expr) => {
      if(!info) return source;
      const statePattern = `${state}\\??`;
      const parenPattern = new RegExp(`\\b(if)\\s*\\(\\s*${escapeRegExp(info.name)}\\s+${statePattern}\\s*\\)`, "gi");
      source = source.replace(parenPattern, (match, keyword) => `${keyword} (${expr})`);
      const barePattern = new RegExp(`\\b(if)\\s+${escapeRegExp(info.name)}\\s+${statePattern}\\b`, "gi");
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
    result = result.replace(/(!?\s*isSwitchOn\("[^"]+"\))\?/gi, "$1");
    return result;
  };

  const normalizeLoopHyphenSpacing = (text) => {
    if(typeof text !== "string" || !text) return text || "";
    return text.replace(/\b(if|while|until|repeat|loop)-\s*/gi, "$1 - ");
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
    const DEFAULT_WHILE_CONDITION = "";
    const DEFAULT_UNTIL_CONDITION = "";
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
      const parseLoopCondition = (value) => {
        const trimmed = typeof value === "string" ? value.trim() : "";
        if(!trimmed) return null;
        let base = trimmed;
        let negationCount = 0;
        if(base.startsWith("-")){
          negationCount++;
          base = base.slice(1).trim();
        }
        const lower = base.toLowerCase();
        if(lower === "last"){
          negationCount++;
          base = "hasMoreData";
        }
        if(!base) return null;
        return { base, negationCount };
      };
      const parsed = parseLoopCondition(conditionRaw);
      if(!parsed) return null;
      const condFormatted = formatStudentCodeLine(parsed.base, { context: "condition" });
      if(!condFormatted) return null;
      let condExpr = condFormatted;
      const negationCount = parsed.negationCount % 2;
      for(let i = 0; i < negationCount; i++){
        condExpr = `!(${condExpr})`;
      }
      if(keyword === "while"){
        return `while (${condExpr} && canContinueLoop()) {`;
      }
      return `while (!(${condExpr}) && canContinueLoop()) {`;
    };
    const formatSimpleFor = (countVal) => {
      const n = Number(countVal);
      if(!Number.isFinite(n)) return null;
      const loopVar = `i${autoLoopCounter++}`;
      return `for (let ${loopVar} = 0; ${loopVar} < ${n} && canContinueLoop(); ${loopVar}++){`;
    };
    const buildConditionalLine = (prefix, conditionRaw) => {
      const condition = typeof conditionRaw === "string" ? conditionRaw.trim() : "";
      if(!condition) return null;
      if(condition.startsWith("(") && condition.endsWith(")")){
        return `${prefix} ${condition} {`;
      }
      const formatted = formatStudentCodeLine(condition, { context: "condition" });
      if(!formatted) return null;
      return `${prefix} (${formatted}) {`;
    };
    const stripLineComments = (value) => {
      if(typeof value !== "string" || value === "") return "";
    return value
      .replace(/(?:\/\/|#|'|;).*$/gm, "")
      .replace(/^[ \t]*(?:\/\/|#|'|;).*$/gm, "");
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
    const inputText = rawText || "";
    const commentStrippedText = stripLineComments(inputText);
    ensureNoForbiddenSymbols(commentStrippedText);
    const spacedText = applyKeywordSpacing(commentStrippedText);
    const directionSpaced = applyCompoundDirectionSpacing(spacedText);
    const hyphenNormalizedText = normalizeLoopHyphenSpacing(directionSpaced);
    const negatedConditionText = applyNegationQuestionSpacing(hyphenNormalizedText);
    const switchConditionText = applySwitchConditionSpacing(negatedConditionText);
    const switchAliasedText = applySwitchCommandAliases(switchConditionText);
    const turnCommandText = applyTurnSwitchCommands(switchAliasedText);
    const conditionalText = applyConditionalAliases(turnCommandText);
    validateAllowedCommands(conditionalText);
    const codeRaw = applyAliasTransforms(conditionalText);
    if(!codeRaw.trim()) return "";
    const formattedLines = codeRaw.replace(/\r/g, "").split("\n");
    const preparedLines = expandInlineElseLines(formattedLines);
    const ASYNC_COMMANDS = new Set([
      "applyMask",
      "buildQRCode",
      "drawBasePatterns",
      "drawBasePatternsStepped",
      "drawDataPatterns",
      "drawFunctionalPatterns",
      "drawQRCode",
      "initializeQRCode",
      "pauseRunning",
      "resetCommand",
      "resetQRCode",
    ]);
    const getCommandName = (value) => {
      if(typeof value !== "string") return "";
      const match = value.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
      return match ? match[1] : "";
    };
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
      const ifMatch = line.match(/^(if)\b(.*)$/i);
      if(ifMatch){
        const conditionRaw = (ifMatch[2] || "").trim();
        if(!conditionRaw){
          throw new Error("if の後に条件が必要です");
        }
        if(/^-\s*\??$/.test(conditionRaw)){
          throw new Error("if の後に条件が必要です");
        }
        const singleLineInfo = (() => {
          const firstSpaceIdx = conditionRaw.search(/\s/);
          if(firstSpaceIdx === -1) return null;
          const conditionToken = conditionRaw.slice(0, firstSpaceIdx).trim();
          const rest = conditionRaw.slice(firstSpaceIdx).trim();
          if(!conditionToken || !rest) return null;
          const condFormatted = formatStudentCodeLine(conditionToken, { context: "condition" });
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
        const restIfMatch = elseRest.match(/^(if)\b(.*)$/i);
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
        if(!conditionRaw || /^-\s*\??$/.test(conditionRaw)){
          throw new Error("while の後に条件が必要です");
        }
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
        if(!conditionRaw || /^-\s*\??$/.test(conditionRaw)){
          throw new Error("until の後に条件が必要です");
        }
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
      const repeatMatch = line.match(/^repeat(?:\s+(.+))?$/i);
      const loopMatch = line.match(/^loop(?:\s+(.+))?$/i);
      if(repeatMatch || loopMatch){
        const repeatArgRaw = repeatMatch ? repeatMatch[1] : loopMatch[1];
        const repeatArg = typeof repeatArgRaw === "string" ? repeatArgRaw.trim() : "";
        if(repeatArg && /^-\s*\??$/.test(repeatArg)){
          throw new Error("repeat の後に条件が必要です");
        }
      if(repeatArg){
        if(/^\d+$/.test(repeatArg)){
          const formattedFor = formatSimpleFor(repeatArg);
          if(formattedFor){
            combined.push(formattedFor);
            blockDepth += countBraceDelta(formattedFor);
            pushBlock("repeat");
            continue;
          }
        }else{
          const loopLine = buildSimpleLoopLine("until", repeatArg);
          if(loopLine){
            combined.push(loopLine);
            blockDepth += countBraceDelta(loopLine);
            pushBlock("repeat");
            continue;
          }
        }
      }
        const whileLine = `while (canContinueLoop()) {`;
        combined.push(whileLine);
        blockDepth += countBraceDelta(whileLine);
        pushBlock("repeat");
        continue;
      }
      const isBlocky = /^(for|while|if|else\b|switch|do\b|try\b|catch\b|finally\b|function\b|async\b|return\b)/i.test(line)
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
        const commandName = getCommandName(formatted);
        if(awaitCalls || ASYNC_COMMANDS.has(commandName)){
          combined.push(`await ${stmt}`);
        }else{
          combined.push(stmt);
        }
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
    return indentScriptLines(combined).replace(/__SWITCH_COMMA__/g, ",");
  }

  const splitCommandParts = (value) => {
    const parts = [];
    let buffer = "";
    let inDoubleQuotes = false;
    for(const ch of value){
      if(ch === '"'){
        buffer += ch;
        inDoubleQuotes = !inDoubleQuotes;
        continue;
      }
      if(!inDoubleQuotes && (WHITESPACE_PATTERN.test(ch) || ch === ",")){
        if(buffer){
          parts.push(buffer);
          buffer = "";
        }
        continue;
      }
      buffer += ch;
    }
    if(buffer){
      parts.push(buffer);
    }
    return parts.map((part) => part.trim()).filter(Boolean);
  };

  function formatStudentCodeLine(line, { context = "statement" } = {}){
    const rawLine = (typeof line === "string") ? line : "";
    const trimmed = rawLine.trim();
    if(!trimmed) return "";
    const globalEnv = typeof global !== "undefined"
      ? global
      : (typeof globalThis !== "undefined" ? globalThis : null);
    const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    if(trimmed.includes("(") && trimmed.includes(")")){
      return trimmed.replace(/,/g, " ");
    }
    const textMatch = rawLine.match(/^\s*drawtext(?:\s+([\s\S]*))?$/i);
    if(textMatch){
      const rawText = textMatch[1];
      if(rawText === undefined || rawText === ""){
        return "drawText()";
      }
      return `drawText(${JSON.stringify(rawText)})`;
    }
    const parts = splitCommandParts(trimmed);
    if(parts.length === 0) return "";
    const fn = parts.shift();
    const fnLower = typeof fn === "string" ? fn.toLowerCase() : "";
    const directionEnabled = (typeof global !== "undefined" && global.useDirection === true);
    const isConditionContext = context === "condition";
    const normalizeArgValue = (value) => {
      if(typeof value !== "string") return "";
      const trimmedArg = value.trim();
      return trimmedArg.replace(/^["'](.+)["']$/, "$1");
    };
    const getArgLower = (index = 0) => {
      const value = normalizeArgValue(parts[index]);
      return value ? value.toLowerCase() : "";
    };
    if(fnLower === "next?"){
      return "hasMoreData()";
    }
    if(fnLower === "next"){
      if(isConditionContext){
        return "hasMoreData()";
      }
      throw new Error("next は put の引数、または条件式（if/while/until/repeat、next?）でのみ使用できます");
    }
    const firstArgLower = getArgLower();
    if(fnLower === "putcell" && parts.length === 1){
      const argLower = firstArgLower;
      if(argLower === "next"){
        return "putCell(getNextData())";
      }
      if(argLower === "black"){
        return "putCell(1)";
      }
      if(argLower === "white"){
        return "putCell(0)";
      }
      const kindConst = getKindNameForColor(argLower);
      if(kindConst){
        const expr = kindConst.sign === -1 ? `-${kindConst.name}` : kindConst.name;
        return `putCell(${expr})`;
      }
    }
    if(fnLower === "movecursor" && parts.length === 1){
      if(firstArgLower === "home"){
        return "moveCursor(\"home\")";
      }
      if(firstArgLower === "end"){
        return "moveCursor(\"end\")";
      }
    }
    if(!directionEnabled){
      if(fnLower === "turn" || fnLower === "turncursor"){
        throw new Error("Direction commands are disabled (useDirection=false): turn");
      }
      if(fnLower === "movenext"){
        throw new Error("Direction commands are disabled (useDirection=false): move next");
      }
      if(fnLower === "moveadvance" || fnLower === "advancecommand"){
        throw new Error("Direction commands are disabled (useDirection=false): move advance");
      }
      if(fnLower === "move" || fnLower === "movecursor"){
        if(parts.length === 0){
          return `${fn}()`;
        }
        const normalizeArg = (value) => {
          if(typeof value !== "string") return "";
          const trimmedArg = value.trim();
          const unquoted = trimmedArg.replace(/^["'](.+)["']$/, "$1");
          return unquoted.toLowerCase();
        };
        const forbidden = parts.map(normalizeArg).find((arg) => arg === "front" || arg === "back");
        if(forbidden){
          throw new Error(`Direction commands are disabled (useDirection=false): move ${forbidden}`);
        }
      }
    }
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
