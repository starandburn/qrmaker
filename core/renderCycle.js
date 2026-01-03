(function(global){
  if(!global) return;

  const requestAnimationFrameFn = typeof global.requestAnimationFrame === "function"
    ? global.requestAnimationFrame.bind(global)
    : null;
  const pendingReasons = new Set();
  let frameScheduled = false;

  const flushRenderNow = () => {
    pendingReasons.clear();
    if(typeof global.flushRender === "function"){
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
    }else if(typeof global.setTimeout === "function"){
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
