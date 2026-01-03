(function(global){
  if(!global) return;

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
    singletonStore = createStore(initialState);
    return singletonStore;
  };
  appState.getStore = getStore;
  global.appState = appState;
})(typeof window !== "undefined" ? window : globalThis);
