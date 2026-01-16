(function(global){
  if(!global) return;

  const requireUtils = {
    requireGlobal(globalObject, message){
      if(!globalObject){
        throw new Error(message);
      }
    },
    requireGlobalKeys(globalObject, keys, messageFactory){
      if(!globalObject) return;
      for(const key of keys){
        if(!(key in globalObject)){
          throw new Error(messageFactory(key));
        }
      }
    },
    requireGlobalProp(globalObject, key, message){
      if(!globalObject || !(key in globalObject)){
        throw new Error(message);
      }
    },
  };

  global.requireUtils = Object.assign(global.requireUtils || {}, requireUtils);
})(typeof window !== "undefined" ? window : globalThis);
