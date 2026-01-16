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
      const viewArea = (typeof document !== "undefined") ? document.querySelector(".view-area") : null;
      if(viewArea){
        viewArea.classList.toggle("step-mode-on", on);
      }
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

    function makeStepThenable(ok, options = {}){
      if(!ok) return false;
      if(!isStepModeOn()){
        return true;
      }
      const stepRunToken = runIdAccessor.get();
      const baseDelay = getStepDelay();
      const scale = (typeof options.scale === "number") ? options.scale : 1;
      let delay = Number.isFinite(baseDelay) ? Math.round(baseDelay * scale) : 0;
      delay = Math.max(0, Math.min(120, delay));
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

    const scheduleBlur = (el) => {
      if(!el || typeof el.blur !== "function") return;
      setTimeout(() => {
        if(typeof document !== "undefined" && document.activeElement === el){
          el.blur();
        }
      }, 0);
    };
    const bindAutoBlur = (el) => {
      if(!el || typeof el.addEventListener !== "function") return;
      el.addEventListener("change", () => scheduleBlur(el));
      el.addEventListener("pointerup", () => scheduleBlur(el));
      el.addEventListener("keyup", (ev) => {
        if(ev.key === " " || ev.key === "Enter"){
          scheduleBlur(el);
        }
      });
    };
    bindAutoBlur(stepMode);
    bindAutoBlur(stepSkipFunctions);
    bindAutoBlur(stepSpeed);

    const isEditableTarget = (target) => {
      if(!target || typeof target !== "object") return false;
      if(target.isContentEditable) return true;
      const tag = target.tagName ? target.tagName.toLowerCase() : "";
      if(tag === "input"){
        const type = String(target.type || "").toLowerCase();
        return type !== "range";
      }
      return tag === "textarea" || tag === "select";
    };
    const getRangeStep = () => {
      if(!stepSpeed) return 1;
      return 10;
    };
    const clampRangeValue = (value) => {
      if(!stepSpeed) return value;
      const min = Number(stepSpeed.min);
      const max = Number(stepSpeed.max);
      let next = value;
      if(Number.isFinite(min)) next = Math.max(min, next);
      if(Number.isFinite(max)) next = Math.min(max, next);
      return next;
    };
    const handleStepSpeedKey = (ev) => {
      if(!stepSpeed || stepSpeed.disabled) return;
      if(!isStepModeOn()) return;
      if(ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      if(isEditableTarget(ev.target)) return;
      const step = getRangeStep();
      const current = Number(stepSpeed.value);
      const base = Number.isFinite(current) ? current : defaultStepDelay;
      const delta = (ev.key === "ArrowRight") ? step : -step;
      const next = clampRangeValue(base + delta);
      if(next === base) return;
      stepSpeed.value = String(next);
      stepSpeed.dispatchEvent(new Event("input", { bubbles: true }));
      ev.preventDefault();
    };
    if(typeof document !== "undefined"){
      document.addEventListener("keydown", handleStepSpeedKey);
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
