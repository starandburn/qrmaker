/**
 * Domain-level shared utility helpers.
 */
(function(global){
  if(!global) return;

  function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  if(global.domainUtil){
    console.warn("domainUtil is already defined; duplicate load detected");
  }
  global.domainUtil = {
    randomInt,
  };
})(typeof window !== "undefined" ? window : globalThis);
