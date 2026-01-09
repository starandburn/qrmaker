/**
 * ステップ実行用コントロール群を生成し、UIとの同期・ステップ遅延制御を担うファクトリ。
 */
(function(global){
  if(!global) return;

  function createStepControl(deps = {}){
    const {
      stepMode,
      stepSkipFunctions,
      stepSpeed,
      stepSpeedLabel,
      isStepModeOn = () => false,
      requestAnimationFrame = (() => {}),
      sleep = (() => Promise.resolve()),
      ABORT_ERR,
      runIdAccessor = { get: () => 0 },
      defaultStepDelay = 12,
    } = deps;

    function syncStepControls(){
      if(!stepSpeed) return;
      const on = isStepModeOn();
      stepSpeed.disabled = !on;
      if(stepSpeedLabel){
        stepSpeedLabel.classList.toggle("disabled", stepSpeed.disabled);
      }
      if(stepSkipFunctions){
        stepSkipFunctions.disabled = !on;
        const label = stepSkipFunctions.closest("label");
        if(label){
          label.classList.toggle("disabled", !on);
        }
      }
    }

    function getStepDelay(){
      if(!isStepModeOn()) return 0;
      const val = Number(stepSpeed ? stepSpeed.value : defaultStepDelay);
      if(Number.isNaN(val)) return 0;
      return Math.max(0, Math.min(120, val));
    }

    function stepDelayAbort(runToken, options = {}){
      const token = (typeof runToken === "number") ? runToken : runIdAccessor.get();
      const d = getStepDelay();
      const scale = (typeof options.scale === "number") ? options.scale : 1;
      const minDelay = (typeof options.minDelay === "number") ? options.minDelay : 0;
      const maxDelay = (typeof options.maxDelay === "number") ? options.maxDelay : null;
      let computed = Number.isFinite(d) ? Math.round(d * scale) : 0;
      if(computed < minDelay){
        computed = minDelay;
      }
      if(maxDelay !== null && computed > maxDelay){
        computed = maxDelay;
      }
      const wait = computed > 0 ? sleep(computed) : new Promise(requestAnimationFrame);
      return wait.then(() => {
        if(token !== runIdAccessor.get()){
          throw ABORT_ERR;
        }
        return true;
      });
    }

    function makeStepThenable(ok){
      if(!ok) return false;
      if(!isStepModeOn()){
        return true;
      }
      const stepRunToken = runIdAccessor.get();
      const delay = getStepDelay();
      const wait = () => new Promise((resolve) => {
        const done = () => resolve(true);
        if(delay > 0){
          setTimeout(() => requestAnimationFrame(done), delay);
        }else{
          requestAnimationFrame(done);
        }
      });
      const p = wait().then(() => {
        if(stepRunToken !== runIdAccessor.get()){
          throw ABORT_ERR;
        }
        return true;
      });
      return {
        then: (...args) => p.then(...args),
        catch: (...args) => p.catch(...args),
        valueOf: () => true,
        toString: () => "true",
      };
    }

    function shouldStepFunctions(){
      return isStepModeOn() && !(stepSkipFunctions && stepSkipFunctions.checked);
    }

    return {
      syncStepControls,
      getStepDelay,
      stepDelayAbort,
      makeStepThenable,
      shouldStepFunctions,
    };
  }

  global.createStepControl = createStepControl;
})(typeof window !== "undefined" ? window : globalThis);
