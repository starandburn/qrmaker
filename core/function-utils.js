// core/function-utils.js
(function(global){
  if(!global) return;
  if(typeof global.callIfFunction !== "function"){
    function callIfFunction(fn, ...args){
      if(typeof fn === "function"){
        return fn(...args);
      }
    }

    global.callIfFunction = callIfFunction;
  }
  if(typeof global.assignIfFunction !== "function"){
    function assignIfFunction(target, key, fn){
      if(typeof fn === "function"){
        target[key] = fn;
        return true;
      }
      return false;
    }

    global.assignIfFunction = assignIfFunction;
  }
  if(typeof global.callWindowFunctionIfExists !== "function"){
    function callWindowFunctionIfExists(name, ...args){
      if(typeof window === "undefined") return;
      const fn = window[name];
      if(typeof fn === "function"){
        return fn(...args);
      }
    }

    global.callWindowFunctionIfExists = callWindowFunctionIfExists;
  }
})(typeof window !== "undefined" ? window : globalThis);
