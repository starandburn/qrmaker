/**
 * User script language registry and active compiler facade.
 */
(function(global){
  if(!global) return;

  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");
  const DEFAULT_USER_SCRIPT_LANGUAGE_ID = "qr-dsl";
  const userScriptLanguages = new Map();
  let activeUserScriptLanguageId = DEFAULT_USER_SCRIPT_LANGUAGE_ID;

  const normalizeUserScriptLanguage = (id, language) => {
    const normalizedId = String(id || "").trim();
    if(!normalizedId){
      throw new Error("User script language id is required");
    }
    const source = language && typeof language === "object" ? language : {};
    const buildScript = source.buildUserScript || source.compile;
    if(!isFunction(buildScript)){
      throw new Error(`User script language '${normalizedId}' requires buildUserScript`);
    }
    return {
      id: normalizedId,
      label: typeof source.label === "string" && source.label.trim() ? source.label.trim() : normalizedId,
      buildUserScript: buildScript,
      formatStudentCodeLine: isFunction(source.formatStudentCodeLine) ? source.formatStudentCodeLine : null,
    };
  };

  function registerUserScriptLanguage(id, language){
    const source = (typeof id === "object" && id !== null) ? id : language;
    const languageId = (typeof id === "object" && id !== null) ? id.id : id;
    const normalized = normalizeUserScriptLanguage(languageId, source);
    userScriptLanguages.set(normalized.id, normalized);
    return normalized;
  }

  function setActiveUserScriptLanguage(id){
    const normalizedId = String(id || "").trim();
    if(!userScriptLanguages.has(normalizedId)){
      throw new Error(`User script language '${normalizedId}' is not registered`);
    }
    activeUserScriptLanguageId = normalizedId;
    return userScriptLanguages.get(activeUserScriptLanguageId);
  }

  function getUserScriptLanguage(id = activeUserScriptLanguageId){
    return userScriptLanguages.get(String(id || "").trim()) || null;
  }

  function getActiveUserScriptLanguage(){
    return getUserScriptLanguage(activeUserScriptLanguageId);
  }

  function listUserScriptLanguages(){
    return Array.from(userScriptLanguages.values()).map(({ id, label }) => ({ id, label }));
  }

  function buildUserScript(rawText, options = {}){
    const language = getActiveUserScriptLanguage();
    if(!language){
      throw new Error(`User script language '${activeUserScriptLanguageId}' is not registered`);
    }
    return language.buildUserScript.call(language, rawText, options);
  }

  global.DEFAULT_USER_SCRIPT_LANGUAGE_ID = DEFAULT_USER_SCRIPT_LANGUAGE_ID;
  global.registerUserScriptLanguage = registerUserScriptLanguage;
  global.setActiveUserScriptLanguage = setActiveUserScriptLanguage;
  global.getUserScriptLanguage = getUserScriptLanguage;
  global.getActiveUserScriptLanguage = getActiveUserScriptLanguage;
  global.listUserScriptLanguages = listUserScriptLanguages;
  global.buildUserScript = buildUserScript;
})(typeof window !== "undefined" ? window : globalThis);
