(function(){
  const DEFAULT_PARAM_META = {
    v: { type: "string", desc: "表示トグル一括フラグ" },
    g: { type: "bool", desc: "デバッグ表示" },
    p: { type: "bool", desc: "データパターン表示" },
    d: { type: "string", desc: "入力データ（空文字は _）" },
    h: { type: "bool", desc: "履歴パネル表示" },
    m: { type: "bool", desc: "サンプル表示" },
    e: { type: "number", desc: "ステップ速度（0-120）" },
    s: { type: "string", desc: "ステップ実行フラグ（2桁01）" },
    c: { type: "number", desc: "初期コードサンプル番号（1始まり）" },
    w: { type: "number", desc: "スイッチ数（0-4）" },
    l: { type: "number", desc: "左ペイン比率（0.1-0.9）" },
    o: { type: "bool", desc: "機能パターン時にデータ上書き" },
    a: { type: "bool", desc: "実行時に自動リセット" },
    u: { type: "number", desc: "put命令の既定値(0/1/2/3)" },
    x: { type: "bool", desc: "put時に既存セルをスキップ" },
    t: { type: "bool", desc: "タイミングパターン自動回避" },
    r: { type: "bool", desc: "方向コマンドを有効化" },
    z: { type: "bool", desc: "プレゼンモード（内部キー）" },
  };
  DEFAULT_PARAM_META.ec = { type: "string", desc: "QR error correction level (A/L/M/Q/H)" };
  DEFAULT_PARAM_META.qrv = { type: "number", desc: "QR version (1-6)" };

  const dom = {
    btnGenerate: document.getElementById("btnGenerate"),
    btnCopy: document.getElementById("btnCopy"),
    btnOpen: document.getElementById("btnOpen"),
    btnDownloadSettings: document.getElementById("btnDownloadSettings"),
    btnResetAllDefaults: document.getElementById("btnResetAllDefaults"),
    generatedUrl: document.getElementById("generatedUrl"),
    copyStatus: document.getElementById("copyStatus"),
    paramRows: document.getElementById("paramRows"),
  };
  const currentParams = new URLSearchParams(window.location.search || "");

  const keySets = (() => {
    const keys = [];
    const orderedKeys = [
      "qrv",
      "d",  // 入力データ
      "v",  // 表示トグル一括
      "g",  // デバッグ表示
      "p",  // パターンパネル
      "h",  // 履歴表示
      "m",  // サンプル表示
      "e",  // ステップ速度
      "s",  // ステップ実行フラグ
      "c",  // 初期コードサンプル
      "w",  // スイッチ数
      "l",  // ペイン比率
      "o",  // 機能パターン上書き
      "a",  // 実行時に自動リセット
      "u",  // put既定値
      "x",  // 既存セルスキップ
      "t",  // timing自動回避
      "r",  // 方向コマンド
      "z",  // プレゼンモード
    ];
    const add = (value) => {
      if(typeof value !== "string" || !value) return;
      if(keys.includes(value)) return;
      keys.push(value);
    };
    const paramKeys = window.urlState && window.urlState.PARAM_KEYS ? window.urlState.PARAM_KEYS : {};
    const internalKeys = window.urlState && window.urlState.INTERNAL_PARAM_KEYS ? window.urlState.INTERNAL_PARAM_KEYS : {};
    Object.values(paramKeys).forEach(add);
    Object.values(internalKeys).forEach(add);
    Object.keys(DEFAULT_PARAM_META).forEach(add);
    const ordered = orderedKeys.filter((key) => keys.includes(key));
    const rest = keys.filter((key) => !orderedKeys.includes(key)).sort();
    return ordered.concat(rest);
  })();

  const rowState = [];
  const VIEW_FLAG_ITEMS = [
    { key: "toggleCursor", label: "カーソル" },
    { key: "toggleGuide", label: "ガイド" },
    { key: "toggleGrid", label: "グリッド" },
    { key: "toggleEmpty", label: "空セル" },
    { key: "toggleColor", label: "色" },
    { key: "toggleDebugValues", label: "セルの値" },
  ];
  const defaults = (window.appSettingsFromScript && window.appSettingsFromScript.defaults) ? window.appSettingsFromScript.defaults : {};
  const resolvedCodeSamples = (() => {
    if(Array.isArray(window.appCodeSamplesFromScript)){
      return window.appCodeSamplesFromScript;
    }
    if(Array.isArray(defaults.codeSamples)){
      return defaults.codeSamples;
    }
    return [];
  })();

  const BOOL_DEFAULTS = {
    g: Boolean(defaults.debugVisible),
    p: Boolean(defaults.patternPanelOpen),
    h: Boolean(defaults.historyVisible),
    m: false,
    o: Boolean(defaults.overwriteDataOnFunctional),
    a: (typeof defaults.autoResetOnRun === "boolean") ? defaults.autoResetOnRun : false,
    x: Boolean(defaults.skipExistingCells),
    t: Boolean(defaults.autoAvoidTiming),
    r: Boolean(defaults.useDirection),
    z: Boolean(defaults.presentationMode),
  };

  const VIEW_FLAG_DEFAULT = (() => {
    const vf = defaults.viewFlags || {};
    const bits = [
      Boolean(vf.viewCursor),
      Boolean(vf.viewGuide),
      Boolean(vf.viewGrid),
      Boolean(vf.viewEmpty),
      Boolean(vf.viewColor),
      Boolean(vf.viewDebugValues),
    ];
    return bits.map((b) => (b ? "1" : "0")).join("");
  })();

  function applyDefaultValueToRow(row){
    if(!row || typeof row.applyDefault !== "function") return;
    row.applyDefault();
  }

  function resetAllToDefaults(){
    rowState.forEach(applyDefaultValueToRow);
    dom.generatedUrl.value = "";
    dom.copyStatus.textContent = "";
  }

  function createRow(key){
    const meta = DEFAULT_PARAM_META[key] || { type: "string", desc: "" };
    const tr = document.createElement("tr");

    const tdKey = document.createElement("td");
    tdKey.className = "mono";
    tdKey.textContent = key;

    const tdDesc = document.createElement("td");
    tdDesc.textContent = meta.desc;

    const tdValue = document.createElement("td");
    const tdAction = document.createElement("td");
    let value;
    let getParamValue = null;
    let defaultParamValue = "";
    let applyDefault = null;
    if(key === "v"){
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "8px 12px";
      const flagInputs = [];
      VIEW_FLAG_ITEMS.forEach((item, index) => {
        const label = document.createElement("label");
        label.style.display = "inline-flex";
        label.style.alignItems = "center";
        label.style.gap = "4px";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = VIEW_FLAG_DEFAULT[index] === "1";
        const text = document.createElement("span");
        text.textContent = item.label;
        label.appendChild(input);
        label.appendChild(text);
        wrap.appendChild(label);
        flagInputs.push(input);
      });
      tdValue.appendChild(wrap);
      value = { flagInputs };
      getParamValue = () => flagInputs.map((input) => (input.checked ? "1" : "0")).join("");
      defaultParamValue = VIEW_FLAG_DEFAULT;
      applyDefault = () => {
        flagInputs.forEach((input, index) => {
          input.checked = VIEW_FLAG_DEFAULT[index] === "1";
        });
      };
    }else if(key === "qrv"){
      value = document.createElement("select");
      value.className = "value-input mono";
      value.style.fontSize = "20px";
      value.style.width = "220px";
      value.style.minWidth = "220px";
      const defaultSpec = defaults.qrSpec && typeof defaults.qrSpec === "object" ? defaults.qrSpec : {};
      const defaultVersion = Number(defaultSpec.version ?? defaults.qrVersion ?? 2);
      const normalizedDefault = Number.isInteger(defaultVersion) && defaultVersion >= 1 && defaultVersion <= 6
        ? defaultVersion
        : 2;
      [1, 2, 3, 4, 5, 6].forEach((version) => {
        const option = document.createElement("option");
        const boardSize = 17 + (4 * version);
        option.value = String(version);
        option.textContent = `Version ${version} (${boardSize}x${boardSize})`;
        value.appendChild(option);
      });
      value.value = String(normalizedDefault);
      tdValue.appendChild(value);
      getParamValue = () => String(value.value || "").trim();
      defaultParamValue = String(normalizedDefault);
      applyDefault = () => {
        value.value = defaultParamValue;
      };
    }else if(meta.type === "bool"){
      const wrap = document.createElement("label");
      wrap.className = "toggle-wrap";
      value = document.createElement("input");
      value.type = "checkbox";
      value.className = "toggle";
      value.checked = BOOL_DEFAULTS[key] !== undefined ? BOOL_DEFAULTS[key] : true;
      const stateLabel = document.createElement("span");
      stateLabel.className = "toggle-label";
      stateLabel.textContent = value.checked ? "する" : "しない";
      value.addEventListener("change", () => {
        stateLabel.textContent = value.checked ? "する" : "しない";
      });
      wrap.appendChild(value);
      wrap.appendChild(stateLabel);
      tdValue.appendChild(wrap);
      getParamValue = () => (value.checked ? "1" : "0");
      defaultParamValue = (BOOL_DEFAULTS[key] ? "1" : "0");
      applyDefault = () => {
        value.checked = BOOL_DEFAULTS[key] ? true : false;
        stateLabel.textContent = value.checked ? "する" : "しない";
      };
    }else if(key === "ec"){
      value = document.createElement("select");
      value.className = "value-input mono";
      value.style.fontSize = "20px";
      value.style.width = "88px";
      value.style.minWidth = "88px";
      const defaultSpec = defaults.qrSpec && typeof defaults.qrSpec === "object" ? defaults.qrSpec : {};
      const normalizedDefault = String(defaultSpec.errorCorrectionLevel ?? defaults.errorCorrectionLevel ?? "A").trim().toUpperCase();
      ["A", "L", "M", "Q", "H"].forEach((level) => {
        const option = document.createElement("option");
        option.value = level;
        option.textContent = level;
        value.appendChild(option);
      });
      value.value = ["A", "L", "M", "Q", "H"].includes(normalizedDefault) ? normalizedDefault : "A";
      tdValue.appendChild(value);
      getParamValue = () => String(value.value || "").trim();
      defaultParamValue = value.value;
      applyDefault = () => {
        value.value = defaultParamValue;
      };
    }else if(key === "w"){
      value = document.createElement("select");
      value.className = "value-input mono";
      value.style.fontSize = "20px";
      value.style.width = "88px";
      value.style.minWidth = "88px";
      for(let i = 0; i <= 4; i++){
        const option = document.createElement("option");
        option.value = String(i);
        option.textContent = String(i);
        value.appendChild(option);
      }
      value.value = String(defaults.switchCount ?? "2");
      tdValue.appendChild(value);
      getParamValue = () => String(value.value || "").trim();
      defaultParamValue = String(defaults.switchCount ?? "2");
      applyDefault = () => {
        value.value = defaultParamValue;
      };
    }else if(key === "c"){
      value = document.createElement("select");
      value.className = "value-input mono";
      value.style.fontSize = "20px";
      value.style.width = "120px";
      value.style.minWidth = "120px";
      const emptyOption = document.createElement("option");
      emptyOption.value = "0";
      emptyOption.textContent = "0 (空欄)";
      value.appendChild(emptyOption);
      for(let i = 0; i < resolvedCodeSamples.length; i++){
        const option = document.createElement("option");
        option.value = String(i + 1);
        option.textContent = String(i + 1);
        value.appendChild(option);
      }
      tdValue.appendChild(value);
      getParamValue = () => String(value.value || "").trim();
      defaultParamValue = (() => {
        const numeric = Number(defaults.initialCode);
        if(!Number.isInteger(numeric) || numeric < 0 || numeric > resolvedCodeSamples.length){
          return "0";
        }
        return String(numeric);
      })();
      applyDefault = () => {
        value.value = defaultParamValue;
      };
    }else if(key === "u"){
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "8px 12px";
      const defaultNumeric = Number(defaults.defaultPut);
      const normalizedDefault = (Number.isFinite(defaultNumeric) && Math.trunc(defaultNumeric) >= 0 && Math.trunc(defaultNumeric) <= 3)
        ? Math.trunc(defaultNumeric)
        : 2;
      const options = [
        { value: "0", label: "next" },
        { value: "1", label: "透明" },
        { value: "2", label: "黒" },
        { value: "3", label: "白" },
      ];
      const radios = [];
      options.forEach((entry) => {
        const label = document.createElement("label");
        label.style.display = "inline-flex";
        label.style.alignItems = "center";
        label.style.gap = "4px";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "defaultPutGroup";
        input.value = entry.value;
        input.checked = (entry.value === String(normalizedDefault));
        const text = document.createElement("span");
        text.textContent = entry.label;
        label.appendChild(input);
        label.appendChild(text);
        wrap.appendChild(label);
        radios.push(input);
      });
      tdValue.appendChild(wrap);
      value = { radios };
      getParamValue = () => {
        const selected = radios.find((r) => r.checked);
        return selected ? selected.value : String(normalizedDefault);
      };
      defaultParamValue = String(normalizedDefault);
      applyDefault = () => {
        radios.forEach((r) => {
          r.checked = (r.value === defaultParamValue);
        });
      };
    }else if(key === "l"){
      const wrap = document.createElement("div");
      wrap.className = "toggle-wrap";
      value = document.createElement("input");
      value.type = "range";
      value.min = "0.1";
      value.max = "0.9";
      value.step = "0.01";
      value.value = String(defaults.layoutLeftPaneRatio ?? "0.5");
      value.style.minWidth = "180px";
      const valueLabel = document.createElement("span");
      valueLabel.className = "toggle-label mono";
      valueLabel.textContent = value.value;
      value.addEventListener("input", () => {
        valueLabel.textContent = String(value.value);
      });
      wrap.appendChild(value);
      wrap.appendChild(valueLabel);
      tdValue.appendChild(wrap);
      getParamValue = () => String(value.value || "").trim();
      defaultParamValue = String(defaults.layoutLeftPaneRatio ?? "0.5");
      applyDefault = () => {
        value.value = defaultParamValue;
        valueLabel.textContent = String(value.value);
      };
    }else if(key === "e"){
      const wrap = document.createElement("div");
      wrap.className = "toggle-wrap";
      value = document.createElement("input");
      value.type = "range";
      value.min = "0";
      value.max = "120";
      value.step = "1";
      value.value = String(defaults.stepSpeed ?? "30");
      value.style.minWidth = "180px";
      const valueLabel = document.createElement("span");
      valueLabel.className = "toggle-label mono";
      valueLabel.textContent = value.value;
      value.addEventListener("input", () => {
        valueLabel.textContent = String(value.value);
      });
      wrap.appendChild(value);
      wrap.appendChild(valueLabel);
      tdValue.appendChild(wrap);
      getParamValue = () => String(value.value || "").trim();
      defaultParamValue = String(defaults.stepSpeed ?? "30");
      applyDefault = () => {
        value.value = defaultParamValue;
        valueLabel.textContent = String(value.value);
      };
    }else if(key === "s"){
      const stepModeDefault = defaults.skipMode ? "1" : "0";
      const stepDataOnlyDefault = defaults.stepSkipDataOnly ? "1" : "0";
      const composite = `${stepModeDefault}${stepDataOnlyDefault}`;
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "8px 12px";

      const modeLabel = document.createElement("label");
      modeLabel.style.display = "inline-flex";
      modeLabel.style.alignItems = "center";
      modeLabel.style.gap = "4px";
      const modeInput = document.createElement("input");
      modeInput.type = "checkbox";
      modeInput.checked = composite[0] === "1";
      const modeText = document.createElement("span");
      modeText.textContent = "ステップ表示";
      modeLabel.appendChild(modeInput);
      modeLabel.appendChild(modeText);

      const dataOnlyLabel = document.createElement("label");
      dataOnlyLabel.style.display = "inline-flex";
      dataOnlyLabel.style.alignItems = "center";
      dataOnlyLabel.style.gap = "4px";
      const dataOnlyInput = document.createElement("input");
      dataOnlyInput.type = "checkbox";
      dataOnlyInput.checked = composite[1] === "1";
      const dataOnlyText = document.createElement("span");
      dataOnlyText.textContent = "データパターンのみ";
      dataOnlyLabel.appendChild(dataOnlyInput);
      dataOnlyLabel.appendChild(dataOnlyText);

      wrap.appendChild(modeLabel);
      wrap.appendChild(dataOnlyLabel);
      tdValue.appendChild(wrap);
      value = { modeInput, dataOnlyInput };
      getParamValue = () => `${modeInput.checked ? "1" : "0"}${dataOnlyInput.checked ? "1" : "0"}`;
      defaultParamValue = composite;
      applyDefault = () => {
        modeInput.checked = composite[0] === "1";
        dataOnlyInput.checked = composite[1] === "1";
      };
    }else{
      value = document.createElement("input");
      value.type = "text";
      value.className = "value-input mono";
      if(key === "d"){
        value.value = String(defaults.qrData ?? "");
        defaultParamValue = String(defaults.qrData ?? "");
      }else{
        defaultParamValue = "";
      }
      tdValue.appendChild(value);
      getParamValue = () => String(value.value || "").trim();
      applyDefault = () => {
        value.value = defaultParamValue;
      };
    }

    const btnReset = document.createElement("button");
    btnReset.type = "button";
    btnReset.textContent = "初期値";
    tdAction.appendChild(btnReset);

    tr.appendChild(tdKey);
    tr.appendChild(tdDesc);
    tr.appendChild(tdValue);
    tr.appendChild(tdAction);
    dom.paramRows.appendChild(tr);

    const row = { key, type: meta.type, value, getParamValue, defaultParamValue, applyDefault };
    btnReset.addEventListener("click", () => {
      applyDefaultValueToRow(row);
      dom.generatedUrl.value = "";
      dom.copyStatus.textContent = "";
    });
    rowState.push(row);
  }

  function buildUrl(){
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/[^/]*$/, "/");
    url.hash = "";
    const search = new URLSearchParams();

    rowState.forEach((row) => {
      if(typeof row.getParamValue === "function"){
        const paramValue = row.getParamValue();
        if(paramValue === row.defaultParamValue) return;
        if(!paramValue) return;
        search.set(row.key, paramValue);
        return;
      }
      const raw = String(row.value.value || "").trim();
      if(!raw) return;
      search.set(row.key, raw);
    });

    const query = search.toString();
    url.search = query ? `?${query}` : "";
    return url.toString();
  }

  function applyUrlParamToRow(row, raw){
    if(!row) return;
    const key = row.key;
    if(key === "v" && row.value && Array.isArray(row.value.flagInputs)){
      const bits = String(raw ?? "");
      row.value.flagInputs.forEach((input, index) => {
        input.checked = bits[index] === "1";
      });
      return;
    }
    if(row.type === "bool" && row.value && typeof row.value.checked === "boolean"){
      const text = String(raw ?? "").trim().toLowerCase();
      if(["1", "true", "yes", "on", "open", "show"].includes(text)){
        row.value.checked = true;
      }else if(["0", "false", "no", "off", "close", "closed", "hide"].includes(text)){
        row.value.checked = false;
      }
      const stateLabel = row.value.parentElement ? row.value.parentElement.querySelector(".toggle-label") : null;
      if(stateLabel){
        stateLabel.textContent = row.value.checked ? "する" : "しない";
      }
      return;
    }
    if(key === "s" && row.value && row.value.modeInput && row.value.dataOnlyInput){
      const spec = String(raw ?? "");
      if(/^[01]{2}$/.test(spec)){
        row.value.modeInput.checked = spec[0] === "1";
        row.value.dataOnlyInput.checked = spec[1] === "1";
      }
      return;
    }
    if(key === "u" && row.value && Array.isArray(row.value.radios)){
      const value = String(raw ?? "").trim();
      row.value.radios.forEach((r) => {
        r.checked = (r.value === value);
      });
      return;
    }
    if(row.value && typeof row.value.value === "string"){
      row.value.value = String(raw ?? "");
      const label = row.value.parentElement ? row.value.parentElement.querySelector(".toggle-label.mono") : null;
      if(label){
        label.textContent = String(row.value.value);
      }
    }
  }

  function applyUrlBaseValues(){
    rowState.forEach((row) => {
      if(!currentParams.has(row.key)) return;
      applyUrlParamToRow(row, currentParams.get(row.key));
    });
  }

  async function copyGenerated(){
    const text = dom.generatedUrl.value || "";
    if(!text){
      dom.copyStatus.textContent = "生成URLがありません。";
      return;
    }
    try{
      await navigator.clipboard.writeText(text);
      dom.copyStatus.textContent = "コピーしました。";
    }catch(err){
      dom.copyStatus.textContent = "コピーに失敗しました。";
    }
  }

  function openGeneratedInNewTab(){
    const built = buildUrl();
    dom.generatedUrl.value = built;
    dom.copyStatus.textContent = "";
    window.open(built, "_blank", "noopener");
  }

  function parseBoolParam(raw){
    const text = String(raw ?? "").trim().toLowerCase();
    return ["1", "true", "yes", "on", "open", "show"].includes(text);
  }

  function buildSettingsDefaultsFromRows(){
    const source = (window.appSettingsFromScript && window.appSettingsFromScript.defaults)
      ? window.appSettingsFromScript.defaults
      : {};
    const next = JSON.parse(JSON.stringify(source));
    const map = new Map(rowState.map((row) => [row.key, row]));

    const get = (key, fallback = "") => {
      const row = map.get(key);
      if(!row || typeof row.getParamValue !== "function") return fallback;
      return row.getParamValue();
    };

    const asNumber = (raw, fallback) => {
      const num = Number(raw);
      return Number.isFinite(num) ? num : fallback;
    };

    const view = get("v", "");
    const bits = String(view).padEnd(6, "0");
    next.qrData = String(get("d", next.qrData ?? ""));
    next.debugVisible = parseBoolParam(get("g", next.debugVisible ? "1" : "0"));
    next.patternPanelOpen = parseBoolParam(get("p", next.patternPanelOpen ? "1" : "0"));
    next.historyVisible = parseBoolParam(get("h", next.historyVisible ? "1" : "0"));
    next.layoutLeftPaneRatio = asNumber(get("l", String(next.layoutLeftPaneRatio ?? 0.5)), 0.5);
    next.autoResetOnRun = parseBoolParam(get("a", next.autoResetOnRun ? "1" : "0"));
    next.skipExistingCells = parseBoolParam(get("x", next.skipExistingCells ? "1" : "0"));
    next.autoAvoidTiming = parseBoolParam(get("t", next.autoAvoidTiming ? "1" : "0"));
    next.overwriteDataOnFunctional = parseBoolParam(get("o", next.overwriteDataOnFunctional ? "1" : "0"));
    next.defaultPut = Math.trunc(asNumber(get("u", String(next.defaultPut ?? 2)), 2));
    next.switchCount = Math.trunc(asNumber(get("w", String(next.switchCount ?? 2)), 2));
    next.stepSpeed = Math.trunc(asNumber(get("e", String(next.stepSpeed ?? 30)), 30));
    next.initialCode = Math.trunc(asNumber(get("c", String(next.initialCode ?? 0)), 0));
    next.presentationMode = parseBoolParam(get("z", next.presentationMode ? "1" : "0"));
    next.useDirection = parseBoolParam(get("r", next.useDirection ? "1" : "0"));
    const errorCorrectionLevel = String(get("ec", next.qrSpec?.errorCorrectionLevel ?? next.errorCorrectionLevel ?? "A")).trim().toUpperCase();
    const qrVersion = Math.trunc(asNumber(get("qrv", String(next.qrSpec?.version ?? next.qrVersion ?? 2)), 2));
    next.qrSpec = Object.assign({}, next.qrSpec, {
      version: (qrVersion >= 1 && qrVersion <= 6) ? qrVersion : 2,
      errorCorrectionLevel: ["A", "L", "M", "Q", "H"].includes(errorCorrectionLevel) ? errorCorrectionLevel : "A",
    });
    const skipSpec = String(get("s", "01")).padEnd(2, "0");
    next.skipMode = skipSpec[0] === "1";
    next.stepSkipDataOnly = skipSpec[1] === "1";
    next.viewFlags = Object.assign({}, next.viewFlags, {
      viewCursor: bits[0] === "1",
      viewGuide: bits[1] === "1",
      viewGrid: bits[2] === "1",
      viewEmpty: bits[3] === "1",
      viewColor: bits[4] === "1",
      viewDebugValues: bits[5] === "1",
    });
    if(!Array.isArray(next.codeSamples)){
      next.codeSamples = [];
    }
    return next;
  }

  function buildSettingsScriptText(){
    const defaultsOut = buildSettingsDefaultsFromRows();
    const payload = { defaults: defaultsOut };
    const isBareKey = (key) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
    const renderJs = (value, depth = 0) => {
      const indent = "  ".repeat(depth);
      const nextIndent = "  ".repeat(depth + 1);
      if(Array.isArray(value)){
        if(value.length === 0) return "[]";
        const items = value.map((item) => `${nextIndent}${renderJs(item, depth + 1)}`);
        return `[\n${items.join(",\n")}\n${indent}]`;
      }
      if(value && typeof value === "object"){
        const entries = Object.entries(value);
        if(entries.length === 0) return "{}";
        const lines = entries.map(([key, val]) => {
          const keyText = isBareKey(key) ? key : JSON.stringify(key);
          return `${nextIndent}${keyText}: ${renderJs(val, depth + 1)}`;
        });
        return `{\n${lines.join(",\n")}\n${indent}}`;
      }
      return JSON.stringify(value);
    };
    return `window.appSettingsFromScript = ${renderJs(payload)};\n`;
  }

  function downloadSettingsJs(){
    const text = buildSettingsScriptText();
    const blob = new Blob([text], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settings.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    dom.copyStatus.textContent = "settings.js をダウンロードしました。";
  }

  function init(){
    keySets.forEach(createRow);
    applyUrlBaseValues();
    dom.btnGenerate.addEventListener("click", () => {
      dom.generatedUrl.value = buildUrl();
      dom.copyStatus.textContent = "";
    });
    dom.btnCopy.addEventListener("click", copyGenerated);
    dom.btnOpen.addEventListener("click", openGeneratedInNewTab);
    if(dom.btnDownloadSettings){
      dom.btnDownloadSettings.addEventListener("click", downloadSettingsJs);
    }
    dom.btnResetAllDefaults.addEventListener("click", resetAllToDefaults);
  }

  init();
})();
