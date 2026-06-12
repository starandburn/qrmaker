/**
 * Python-like user script parser.
 */
(function(global){
  if(!global) return;

  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");
  const registerUserScriptLanguage = global.registerUserScriptLanguage;
  const buildDefaultUserScript = global.buildDefaultUserScript;

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
    return !trimmed || trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("'");
  };

  const normalizeCallSyntax = (line) => {
    return String(line ?? "").replace(/\b([A-Za-z_$][A-Za-z0-9_$-]*)\s*\(([^()]*)\)/g, (match, name, args) => {
      const normalizedArgs = String(args ?? "").trim().replace(/\s*,\s*/g, " ");
      return normalizedArgs ? `${name} ${normalizedArgs}` : name;
    });
  };

  const toDslLines = (line) => {
    const trimmed = normalizeCallSyntax(line).trim();
    const inlineIfMatch = trimmed.match(/^(if)\s+([^:]+):\s+(.+)$/i);
    if(inlineIfMatch){
      return [`${inlineIfMatch[1]} ${inlineIfMatch[2].trim()} ${inlineIfMatch[3].trim()}`];
    }
    const inlineElifMatch = trimmed.match(/^elif\s+([^:]+):\s+(.+)$/i);
    if(inlineElifMatch){
      return [`elseif ${inlineElifMatch[1].trim()}`, inlineElifMatch[2].trim()];
    }
    const elifMatch = trimmed.match(/^elif\s+(.+):$/i);
    if(elifMatch){
      return [`elseif ${elifMatch[1].trim()}`];
    }
    const inlineElseMatch = trimmed.match(/^else\s*:\s+(.+)$/i);
    if(inlineElseMatch){
      return ["else", inlineElseMatch[1].trim()];
    }
    if(!trimmed.endsWith(":")) return [trimmed];
    return [trimmed.slice(0, -1).trim()];
  };

  const isBlockLine = (line) => {
    return /^(?:if|repeat)\b/i.test(line);
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
      const indent = countIndent(rawLine);
      const trimmed = rawLine.trim();
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

  function buildPythonUserScript(rawText, options = {}){
    if(!isFunction(buildDefaultUserScript)){
      throw new Error("script-parser.js must be loaded before script-parser-python.js");
    }
    const dslText = buildPythonLikeDsl(rawText);
    try{
      return buildDefaultUserScript(dslText, options);
    }catch(err){
      if(err && typeof err === "object"){
        err.userScriptDebugSource = dslText;
        err.userScriptDebugSourceLabel = "PH -> QR";
      }
      throw err;
    }
  }

  if(!isFunction(registerUserScriptLanguage)){
    throw new Error("user-script-language-registry.js must be loaded before script-parser-python.js");
  }
  registerUserScriptLanguage("python", {
    label: "Python-like",
    buildUserScript: buildPythonUserScript,
  });

  global.buildPythonLikeDsl = buildPythonLikeDsl;
})(typeof window !== "undefined" ? window : globalThis);
