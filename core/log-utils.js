// core/log-utils.js
(function(global){
  if(!global) return;
  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");
  if(isFunction(global.safeConsoleLog)) return;

  const shouldMirrorConsoleLogs = () => true;
  const safeConsoleLog = (value) => {
    if(!shouldMirrorConsoleLogs()) return;
    try{
      if(typeof value === "string"){
        console.log(value);
      }else{
        const desc = value && typeof value === "object" && typeof value.description === "string"
          ? value.description
          : "[qrmaker log]";
        console.log(desc, value);
      }
    }catch(e){
      // ignore console errors
    }
  };

  global.safeConsoleLog = safeConsoleLog;
})(typeof window !== "undefined" ? window : globalThis);
