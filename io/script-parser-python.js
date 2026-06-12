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

  const toDslLine = (line) => {
    const trimmed = String(line ?? "").trim();
    if(!trimmed.endsWith(":")) return trimmed;
    return trimmed.slice(0, -1).trim();
  };

  const isBlockLine = (line) => {
    return /^(?:if|repeat)\b/i.test(line);
  };

  const isElseLine = (line) => {
    return /^else\s*:?\s*$/i.test(line);
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
      const elseLine = isElseLine(trimmed);

      while(stack.length){
        const top = stack[stack.length - 1];
        const shouldClose = elseLine ? indent < top.indent : indent <= top.indent;
        if(!shouldClose) break;
        out.push("end");
        stack.pop();
      }

      const dslLine = elseLine ? "} else {" : toDslLine(trimmed);
      out.push(dslLine);
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
    return buildDefaultUserScript(buildPythonLikeDsl(rawText), options);
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
