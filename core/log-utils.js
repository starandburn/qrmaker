// core/log-utils.js
(function(global){
  if(!global) return;
  if(typeof global.safeConsoleLog === "function") return;

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
