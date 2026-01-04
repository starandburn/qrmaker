(function(global){
  if(!global) return;

  function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  global.domainUtil = Object.assign(global.domainUtil || {}, {
    randomInt,
  });
})(typeof window !== "undefined" ? window : globalThis);
