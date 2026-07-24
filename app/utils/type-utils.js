(function(global){
  if(!global) return;

  const isFunction = (value) => typeof value === "function";
  const isDefined = (value) => typeof value !== "undefined";
  const callIfFunction = (fn, ...args) => {
    if(isFunction(fn)){
      return fn(...args);
    }
    return undefined;
  };
  const assignIfFunction = (target, key, value) => {
    if(isFunction(value)){
      target[key] = value;
    }
  };

  const typeUtils = {
    isFunction,
    isDefined,
    callIfFunction,
    assignIfFunction,
  };

  global.typeUtils = Object.assign(global.typeUtils || {}, typeUtils);

  if(typeof global.callIfFunction !== "function"){
    global.callIfFunction = callIfFunction;
  }
  if(typeof global.assignIfFunction !== "function"){
    global.assignIfFunction = assignIfFunction;
  }
})(typeof window !== "undefined" ? window : globalThis);
