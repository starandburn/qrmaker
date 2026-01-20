// core/function-utils.js
(function(global){
  if(!global) return;
  if(typeof global.callIfFunction === "function") return;

  function callIfFunction(fn, ...args){
    if(typeof fn === "function"){
      return fn(...args);
    }
  }

  global.callIfFunction = callIfFunction;
})(typeof window !== "undefined" ? window : globalThis);
