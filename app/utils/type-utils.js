(function(global){
  if(!global) return;

  const isFunction = (value) => typeof value === "function";
  const isDefined = (value) => typeof value !== "undefined";
  function callIfFunction(fn, ...args){
    if(isFunction(fn)){
      return fn(...args);
    }
    return undefined;
  }
  function callWithFallback(primary, fallback, ...args){
    if(isFunction(primary)){
      return primary(...args);
    }
    if(isFunction(fallback)){
      return fallback(...args);
    }
    return undefined;
  }

  const typeUtils = {
    isFunction,
    isDefined,
    callIfFunction,
    callWithFallback,
  };

  global.typeUtils = Object.assign(global.typeUtils || {}, typeUtils);

  if(typeof global.callIfFunction !== "function"){
    global.callIfFunction = callIfFunction;
  }
  if(typeof global.callWithFallback !== "function"){
    global.callWithFallback = callWithFallback;
  }
})(typeof window !== "undefined" ? window : globalThis);
