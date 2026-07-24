/**
 * History-store module with entry management and pruning behavior.
 */
;(function(window){
  const HISTORY_LIMIT = 48;
  const historyEntries = [];
  let renderer = () => {};
  let valueGetter = () => "";
  let pendingHistoryChange = false;
  let pendingHistoryLabel = "変更";
  let runHistoryEntryPending = false;

  const invokeRenderer = () => {
    try{
      renderer(historyEntries);
    }catch(err){
      // ignore render failures
    }
  };

  const pushHistorySnapshot = (label = "変更", { explanation = null, status = null, value = undefined } = {}) => {
    const valueText = (typeof value === "string") ? value : (valueGetter ? valueGetter() : "");
    const lastEntry = historyEntries[0];
    if(lastEntry && lastEntry.value === valueText) return;
    historyEntries.unshift({
      value: valueText,
      label,
      explanation,
      status,
      timestamp: Date.now(),
    });
    if(historyEntries.length > HISTORY_LIMIT){
      historyEntries.pop();
    }
    invokeRenderer();
  };

  const markHistoryPending = (label = "変更") => {
    pendingHistoryChange = true;
    pendingHistoryLabel = label;
  };

  const commitPendingHistory = (overrideLabel) => {
    if(!pendingHistoryChange) return false;
    pendingHistoryChange = false;
    const label = overrideLabel || pendingHistoryLabel || "変更";
    pendingHistoryLabel = "変更";
    pushHistorySnapshot(label);
    return true;
  };

  const ensureRunHistory = () => {
    if(runHistoryEntryPending) return;
    const committed = commitPendingHistory("実行");
    if(!committed){
      pushHistorySnapshot("実行");
    }
    runHistoryEntryPending = true;
  };

  const finalizeRunHistoryEntry = (success) => {
    if(!runHistoryEntryPending){
      return;
    }
    runHistoryEntryPending = false;
    const entry = historyEntries[0];
    if(!entry){
      return;
    }
    entry.label = "実行";
    entry.status = success ? "success" : "error";
    entry.explanation = success ? "実行成功" : "エラー";
    invokeRenderer();
  };

  const pruneHistoryEntries = () => {
    if(!historyEntries.length) return;
    const seenKeys = new Set();
    const filtered = [];
    let blankKept = false;
    for(const entry of historyEntries){
      if(entry.status === "error"){
        continue;
      }
      const valueText = entry.value ?? "";
      const isBlank = String(valueText).trim().length === 0;
      if(isBlank){
        if(blankKept){
          continue;
        }
        blankKept = true;
      }
      const key = `${valueText}\u0000${entry.label ?? ""}\u0000${entry.explanation ?? ""}\u0000${entry.status ?? ""}`;
      if(seenKeys.has(key)){
        continue;
      }
      seenKeys.add(key);
      filtered.push(entry);
    }
    if(filtered.length === historyEntries.length){
      return;
    }
    historyEntries.length = 0;
    historyEntries.push(...filtered);
    invokeRenderer();
  };

  const getEntry = (index) => {
    return historyEntries[index];
  };

  const getEntries = () => historyEntries;

  const setRenderer = (fn) => {
    renderer = (typeof fn === "function") ? fn : (() => {});
    invokeRenderer();
  };

  const setValueGetter = (fn) => {
    valueGetter = (typeof fn === "function") ? fn : (() => "");
  };

  window.historyController = {
    pushHistorySnapshot,
    markHistoryPending,
    commitPendingHistory,
    ensureRunHistory,
    finalizeRunHistoryEntry,
    pruneHistoryEntries,
    getEntry,
    getEntries,
    setRenderer,
    setValueGetter,
  };
})(window);
