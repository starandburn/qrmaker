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
})(typeof window !== "undefined" ? window : globalThis);
