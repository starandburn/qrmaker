// ui/sample-ui.js
(function(global){
  if(!global) return;

  function setupSampleUI({
    dom,
    configDefaults,
    resolvedDataTemplates,
    historyController,
    focusCodeArea,
  } = {}){
    const sampleDropdownMenu = dom ? dom.sampleDropdownMenu : null;
    if(sampleDropdownMenu){
      sampleDropdownMenu.innerHTML = "";
      resolvedDataTemplates.forEach((entry, index) => {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        let label = "";
        if(typeof entry.label === "string" && entry.label.trim().length){
          label = entry.label;
        }else if(typeof entry.value === "string" && entry.value.trim().length){
          label = entry.value;
        }else{
          label = `テンプレート ${index + 1}`;
        }
        const value = (typeof entry.value === "string") ? entry.value : "";
        li.setAttribute("data-sample-value", value);
        li.textContent = label;
        sampleDropdownMenu.append(li);
      });
    }

    const userCodeInput = dom ? dom.userCodeInput : null;
    const normalizeSampleText = (raw) => {
      const source = typeof raw === "string" ? raw : "";
      const lines = source.replace(/\r/g, "").split("\n");
      while(lines.length && lines[0].trim() === ""){
        lines.shift();
      }
      while(lines.length && lines[lines.length - 1].trim() === ""){
        lines.pop();
      }
      return lines.join("\n");
    };
    const applySampleCode = (code) => {
      const normalized = normalizeSampleText(code);
      if(!userCodeInput) return;
      userCodeInput.value = normalized;
      userCodeInput.selectionStart = userCodeInput.selectionEnd = 0;
      userCodeInput.scrollTop = 0;
      userCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
      if(typeof focusCodeArea === "function"){
        focusCodeArea();
      }
      historyController.commitPendingHistory("サンプル");
    };

    const sampleToolbar = dom ? dom.codeSampleToolbar : null;
    if(!sampleToolbar){
      throw new Error("codeSampleToolbar is required");
    }
    const configuredSamples = Array.isArray(configDefaults.codeSamples) ? configDefaults.codeSamples : [];
    if(sampleToolbar && configuredSamples.length > 0){
      sampleToolbar.innerHTML = "";
      configuredSamples.forEach((sample, index) => {
        const label = (typeof sample.label === "string") ? sample.label : String(index + 1);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "code-debug-btn";
        button.textContent = label;
        button.addEventListener("click", () => {
          applySampleCode(sample.code);
        });
        sampleToolbar.append(button);
      });
    }
  }

  global.setupSampleUI = setupSampleUI;
})(typeof window !== "undefined" ? window : globalThis);
