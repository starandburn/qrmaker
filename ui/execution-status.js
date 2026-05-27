// ui/execution-status.js
(function(global){
  if(!global) return;

  function createExecutionStatusManager({ dom, inputMaxLength, isStepModeOn, onAfterStatusUpdate } = {}){
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
    const executionStatusLabels = {
      stopped: "停止中",
      running: "作成中",
      finished: "作成完了",
      error: "エラー",
      warning: "警告",
    };
    const extractUnknownCommandWord = (message) => {
      if(!message) return "";
      const text = String(message).trim();
      if(!text) return "";
      const match = text.match(/(?:不明なコマンド|Unknown command)[:：]?\s*([^\s,、。.]+)/i);
      return match ? match[1] : "";
    };
    const normalizeStatusDetail = (detail) => {
      if(!detail || typeof detail !== "object") return null;
      const l2 = (typeof detail.l2 === "string") ? detail.l2 : "";
      const l3 = (typeof detail.l3 === "string") ? detail.l3 : "";
      if(!l2) return null;
      return { l2, l3 };
    };
    const buildExecutionStatusText = (state, message, detail, options = {}) => {
      const label = executionStatusLabels[state] || "";
      if(state === "error"){
        const token = extractUnknownCommandWord(message);
        if(token){
          return `${token}はコマンドとして認識できませんでした。`;
        }
        const resolved = message ? String(message).trim() : "";
        return resolved ? `${label}：${resolved}` : label;
      }
      const isTransientPlainMessage = (typeof detail === "string")
        && /(?:リセットしました。|停止してリセットしました。|プログラムが変更されたので停止しました。|データが変更されたので停止しました。)$/.test(detail);
      if((options && options.plainDetail && typeof detail === "string" && detail) || isTransientPlainMessage){
        return detail;
      }
      if(state === "stopped" && !detail){
        return `${label}：実行できます。`;
      }
      const normalized = normalizeStatusDetail(detail);
      if(normalized){
        const resolvedL3 = normalized.l3 || "作成中";
        return `${normalized.l2}：${resolvedL3}`;
      }
      if(detail){
        return `${label}：${detail}`;
      }
      return label;
    };
    const NON_ASCII_MESSAGE = "半角英数字以外が含まれています。";
    const resolvedNonAsciiMessage = NON_ASCII_MESSAGE;

    const DATA_PATTERN_STAGE_MESSAGES = {
      [global.BIT_INFO_MODE]: { l2: "データパターン", l3: "種別パターンを描画しています。" },
      [global.BIT_INFO_LENGTH]: { l2: "データパターン", l3: "文字数パターンを描画しています。" },
      [global.BIT_INFO_CHAR]: { l2: "データパターン", l3: "文字パターンを描画しています。" },
      [global.BIT_INFO_TERMINATOR]: { l2: "データパターン", l3: "終端パターンを描画しています。" },
      [global.BIT_INFO_PADDING]: { l2: "データパターン", l3: "パディングパターンを描画しています。" },
      [global.BIT_INFO_PARITY]: { l2: "データパターン", l3: "パリティパターンを描画しています。" },
    };
    let currentDataPatternStage = null;


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
      target.textContent = buildExecutionStatusText(state, message, detail, options);
      executionStatusEl.className = `execution-status status-${state}`;
      if(typeof onAfterStatusUpdate === "function"){
        callIfFunction(onAfterStatusUpdate, { state, message, detail });
      }else if(typeof global.updateExecutionStatusCursor === "function"){
        callIfFunction(global.updateExecutionStatusCursor);
      }
    };

    const isExecutionRunning = () => executionStatusEl ? executionStatusEl.classList.contains("status-running") : false;
    const updateDataPatternStatus = (kind) => {
      if(typeof isStepModeOn !== "function" || !isStepModeOn()) return false;
      const message = DATA_PATTERN_STAGE_MESSAGES[kind];
      if(!message) return false;
      if(currentDataPatternStage === message) return false;
      currentDataPatternStage = message;
      setExecutionStatus("running", undefined, message);
      return true;
    };
    const resetDataPatternStage = () => {
      currentDataPatternStage = null;
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
        lastExecutionError = resolvedNonAsciiMessage;
        setExecutionStatus("error", resolvedNonAsciiMessage);
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
      global.updateDataPatternStatus = updateDataPatternStatus;
    }

    return {
      setExecutionStatus,
      normalizeInputBeforeRun,
      setInputLock,
      getLastExecutionError,
      setLastExecutionError,
      isExecutionRunning,
      updateDataPatternStatus,
      resetDataPatternStage,
    };
  }

  global.createExecutionStatusManager = createExecutionStatusManager;
})(typeof window !== "undefined" ? window : globalThis);
