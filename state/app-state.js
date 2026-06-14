/**
 * Central app-state store for UI visibility and panel/history flags.
 */
(function(global){
  if(!global) return;

  // State keys:
  // - historyVisible: boolean
  // - patternPanelOpen: boolean
  // - debugVisible: boolean
  // - commandReferenceVisible: boolean
  const DEFAULT_STATE = {
    historyVisible: false,
    patternPanelOpen: false,
    debugVisible: false,
    commandReferenceVisible: false,
  };

  const createStore = (initialState = {}) => {
    let state = Object.assign({}, initialState);
    const listeners = new Set();

    const getState = () => Object.assign({}, state);

    const setState = (patch = {}, reason) => {
      if(!patch || typeof patch !== "object") return;
      const next = Object.assign({}, state, patch);
      state = next;
      for(const listener of Array.from(listeners)){
        try{
          listener(next, patch, reason);
        }catch(_err){
          // swallow errors from listeners
        }
      }
    };

    const subscribe = (listener) => {
      if(typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };

    return { getState, setState, subscribe };
  };

  const appState = Object.assign(global.appState || {}, {
    createStore,
  });
  let singletonStore = null;
  const getStore = (initialState) => {
    if(singletonStore) return singletonStore;
    const merged = Object.assign({}, DEFAULT_STATE, initialState || {});
    singletonStore = createStore(merged);
    return singletonStore;
  };
  appState.getStore = getStore;
  global.appState = appState;
})(typeof window !== "undefined" ? window : globalThis);
