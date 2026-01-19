// ui/execution-status.js
(function(global){
  if(!global) return;

  function createExecutionStatusManager({ dom, buildExecutionStatusText, nonAsciiMessage, inputMaxLength } = {}){
    const executionStatusEl = dom ? dom.executionStatusEl : null;
    const executionStatusTextEl = dom ? dom.executionStatusTextEl : null;
    const txtInput = dom ? dom.txtInput : null;
    const userCodeInput = dom ? dom.userCodeInput : null;
    const btnClear = dom ? dom.btnClear : null;
    const btnClearCode = dom ? dom.btnClearCode : null;
    const btnCopyCode = dom ? dom.btnCopyCode : null;
    const btnPasteCode = dom ? dom.btnPasteCode : null;
    const btnSampleDropdown = dom ? dom.btnSampleDropdown : null;
    const codeHistoryList = dom ? dom.codeHistoryList : null;

    let lastExecutionError = null;
    let pendingStopReason = null;
    let stopReasonLocked = false;
    const buildStatusText = (typeof buildExecutionStatusText === "function")
      ? buildExecutionStatusText
      : (() => "");

    const setExecutionStatus = (state, message, detail, options = {}) => {
      if(!executionStatusEl) return;
      if(options && options.clearStopReason){
        pendingStopReason = null;
        stopReasonLocked = false;
      }
      if(state !== "stopped"){
        pendingStopReason = null;
        stopReasonLocked = false;
      }else if(detail){
        if(!stopReasonLocked || detail === pendingStopReason){
          pendingStopReason = detail;
        }
        if(options && options.lockStopReason){
          stopReasonLocked = true;
        }
      }else if(pendingStopReason){
        detail = pendingStopReason;
      }
      if(options && options.suppressUpdate){
        return;
      }
      const target = executionStatusTextEl || executionStatusEl;
      target.textContent = buildStatusText(state, message, detail);
      executionStatusEl.className = `execution-status status-${state}`;
    };

    const INPUT_MAX_LENGTH = Number(inputMaxLength ?? txtInput?.getAttribute("maxlength")) || 32;
    const NON_ASCII_REGEX = /[^\u0000-\u007F]/;
    const normalizeInputBeforeRun = () => {
      if(!txtInput) return { ok: true };
      let value = (typeof txtInput.value === "string") ? txtInput.value : "";
      if(value.length > INPUT_MAX_LENGTH){
        value = value.slice(0, INPUT_MAX_LENGTH);
        txtInput.value = value;
        try{
          txtInput.dispatchEvent(new Event("input", { bubbles: true }));
        }catch(_err){
          // ignore environments without Event
        }
      }
      if(NON_ASCII_REGEX.test(value)){
        const message = (typeof nonAsciiMessage === "string") ? nonAsciiMessage : "";
        lastExecutionError = message;
        setExecutionStatus("error", message);
        return { ok: false };
      }
      return { ok: true };
    };

    const setInputLock = (locked) => {
      if(txtInput) txtInput.readOnly = locked;
      if(userCodeInput) userCodeInput.readOnly = locked;
      if(btnClear) btnClear.disabled = locked;
      if(btnClearCode) btnClearCode.disabled = locked;
      if(btnCopyCode) btnCopyCode.disabled = locked;
      if(btnPasteCode) btnPasteCode.disabled = locked;
      if(btnSampleDropdown) btnSampleDropdown.disabled = locked;
      const sampleButtons = document.querySelectorAll(".code-debug-btn");
      sampleButtons.forEach((btn) => {
        btn.disabled = locked;
      });
      const sampleDropdown = document.getElementById("sampleDropdown");
      if(locked && sampleDropdown){
        sampleDropdown.classList.remove("is-open");
      }
      if(codeHistoryList){
        codeHistoryList.classList.toggle("is-disabled", locked);
      }
    };

    const getLastExecutionError = () => lastExecutionError;
    const setLastExecutionError = (value) => { lastExecutionError = value; };

    if(typeof global !== "undefined"){
      global.setExecutionStatus = setExecutionStatus;
    }

    return {
      setExecutionStatus,
      normalizeInputBeforeRun,
      setInputLock,
      getLastExecutionError,
      setLastExecutionError,
    };
  }

  global.createExecutionStatusManager = createExecutionStatusManager;
})(typeof window !== "undefined" ? window : globalThis);
