/**
 * Render-cycle utility for scheduling and batching requestAnimationFrame updates.
 */
(function(global){
  if(!global) return;
  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");

  const requestAnimationFrameFn = isFunction(global.requestAnimationFrame)
    ? global.requestAnimationFrame.bind(global)
    : null;
  const pendingReasons = new Set();
  let frameScheduled = false;

  const flushRenderNow = () => {
    pendingReasons.clear();
    if(isFunction(global.flushRender)){
      global.flushRender();
    }
  };

  const scheduleFrame = () => {
    if(frameScheduled) return;
    frameScheduled = true;
    const runner = () => {
      frameScheduled = false;
      if(pendingReasons.size === 0) return;
      flushRenderNow();
      scheduleFrame();
    };
    if(requestAnimationFrameFn){
      requestAnimationFrameFn(runner);
    }else if(isFunction(global.setTimeout)){
      global.setTimeout(runner, 16);
    }
  };

  const requestRender = (reason) => {
    if(reason){
      pendingReasons.add(reason);
    }
    flushRenderNow();
    scheduleFrame();
  };

  global.renderCycle = Object.assign(global.renderCycle || {}, {
    requestRender,
  });
})(typeof window !== "undefined" ? window : globalThis);
