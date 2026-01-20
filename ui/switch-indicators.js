// ui/switch-indicators.js
(function(global){
  if(!global) return;

  function createSwitchController({
    configDefaults = {},
    executionStatusEl,
    executionStatusTextEl,
    buildSetSwitchDescription,
    buildToggleSwitchDescription,
  } = {}){
    void executionStatusEl;
    void executionStatusTextEl;
    const switchDefinitions = [
      { name: "red", label: "Red", color: 0xff0000, idSuffix: "Red" },
      { name: "blue", label: "Blue", color: 0x567cff, idSuffix: "Blue" },
      { name: "green", label: "Green", color: 0x00a800, idSuffix: "Green" },
      { name: "yellow", label: "Yellow", color: 0xffd500, idSuffix: "Yellow" },
    ];
    const DEFAULT_SWITCH_COUNT = 2;
    const MAX_SWITCH_COUNT = switchDefinitions.length;
    const parseSwitchCountValue = (value) => {
      if(typeof value === "number" && Number.isFinite(value)){
        return value;
      }
      if(typeof value === "string"){
        const trimmed = value.trim();
        if(trimmed.length){
          const parsed = Number(trimmed);
          if(Number.isFinite(parsed)){
            return parsed;
          }
        }
      }
      return null;
    };
    const clampSwitchCount = (value) => Math.min(MAX_SWITCH_COUNT, Math.max(0, Math.trunc(value)));
    const requestedSwitchCount = (() => {
      const parsed = parseSwitchCountValue(configDefaults.switchCount);
      if(parsed === null){
        return DEFAULT_SWITCH_COUNT;
      }
      return clampSwitchCount(parsed);
    })();
    const activeSwitchDefinitions = switchDefinitions.slice(0, requestedSwitchCount);
    const activeSwitchNames = activeSwitchDefinitions.map((def) => def.name);
    if(typeof global !== "undefined"){
      global.__qrSwitchConfig = Object.assign({}, global.__qrSwitchConfig, { switchNames: activeSwitchNames });
    }
    const switchIndicatorElements = Object.create(null);
    let switchIndicatorContainer = null;
    let switchIndicatorLabel = null;
    const colorIntToHex = (value) => {
      if(typeof value !== "number" || Number.isNaN(value)) return "#000000";
      return `#${(value >>> 0).toString(16).padStart(6, "0")}`;
    };
    const ensureSwitchIndicators = () => {
      if(!activeSwitchDefinitions.length){
        return null;
      }
      if(switchIndicatorContainer){
        return switchIndicatorContainer;
      }
      switchIndicatorContainer = document.createElement("span");
      switchIndicatorContainer.className = "execution-status-switches";
      switchIndicatorContainer.setAttribute("role", "group");
      switchIndicatorContainer.setAttribute("aria-label", "Switch");
      switchIndicatorLabel = document.createElement("span");
      switchIndicatorLabel.className = "execution-status-label execution-status-label-chip";
      switchIndicatorLabel.dataset.labelKind = "switch";
      switchIndicatorLabel.textContent = "Switch";
      switchIndicatorContainer.append(switchIndicatorLabel);
      activeSwitchDefinitions.forEach((def) => {
        const idSuffix = def.idSuffix || (def.name.charAt(0).toUpperCase() + def.name.slice(1));
        const indicator = document.createElement("span");
        indicator.id = `executionStatusSwitch${idSuffix}Indicator`;
        indicator.className = "execution-status-switch-indicator";
        indicator.setAttribute("aria-label", def.label);
        switchIndicatorElements[def.name] = indicator;
        switchIndicatorContainer.append(indicator);
      });
      return switchIndicatorContainer;
    };
    const switchStates = Object.fromEntries(activeSwitchNames.map((name) => [name, false]));
    const updateSwitchIndicators = () => {
      if(!activeSwitchDefinitions.length) return;
      const container = ensureSwitchIndicators();
      if(!container) return;
      const offBackground = "#4a4a4a";
      const onBorderColor = "rgba(0,0,0,0.25)";
      const offBorderColor = "rgba(0,0,0,0.15)";
      activeSwitchDefinitions.forEach((def) => {
        const indicatorEl = switchIndicatorElements[def.name];
        if(!indicatorEl) return;
        const isOn = Boolean(switchStates[def.name]);
        indicatorEl.classList.toggle("is-on", isOn);
        indicatorEl.style.backgroundColor = isOn ? colorIntToHex(def.color) : offBackground;
        indicatorEl.style.borderColor = isOn ? onBorderColor : offBorderColor;
      });
    };
    const parseSwitchAction = (value) => {
      if(typeof value === "boolean") return value;
      if(typeof value === "string"){
        const normalized = value.trim().toLowerCase();
        if(!normalized.length) return null;
        if(normalized === "on" || normalized === "true" || normalized === "1") return true;
        if(normalized === "off" || normalized === "false" || normalized === "0") return false;
        return null;
      }
      return null;
    };
    const setSwitchState = (color, state) => {
      if(!(color in switchStates)) return false;
      const next = Boolean(state);
      switchStates[color] = next;
      updateSwitchIndicators();
      if(typeof global.logEvent === "function"){
        const desc = (typeof buildSetSwitchDescription === "function")
          ? buildSetSwitchDescription(color, next)
          : "";
        callIfFunction(global.logEvent, "setSwitch", JSON.stringify({ color, state: next }), desc);
      }
      return next;
    };
    const toggleSwitchState = (color) => {
      if(!(color in switchStates)) return false;
      const next = !switchStates[color];
      switchStates[color] = next;
      updateSwitchIndicators();
      if(typeof global.logEvent === "function" && typeof global.isStepModeOn === "function" && global.isStepModeOn()){
        const desc = (typeof buildToggleSwitchDescription === "function")
          ? buildToggleSwitchDescription(color)
          : "";
        callIfFunction(global.logEvent, "setSwitch", JSON.stringify({ color, flipped: true, state: next }), desc);
      }
      return next;
    };
    const isSwitchOn = (color) => Boolean(switchStates[color]);
    const setSwitch = (color, action) => {
      return updateSwitchState(color, action);
    };
    const updateSwitchState = (color, action) => {
      const desired = parseSwitchAction(action);
      return (desired === null) ? toggleSwitchState(color) : setSwitchState(color, desired);
    };
    const resetSwitchStates = () => {
      activeSwitchNames.forEach((name) => {
        switchStates[name] = false;
      });
      updateSwitchIndicators();
    };

    updateSwitchIndicators();

    const getSwitchStates = () => Object.assign({}, switchStates);
    const getActiveSwitchNames = () => activeSwitchNames.slice();

    return {
      ensureSwitchIndicators,
      resetSwitchStates,
      toggleSwitch: toggleSwitchState,
      setSwitch,
      getSwitchStates,
      getActiveSwitchNames,
    };
  }

  global.createSwitchController = createSwitchController;
})(typeof window !== "undefined" ? window : globalThis);
