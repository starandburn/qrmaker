/**
 * Service that places encoded data bits into QR matrix cells with traversal rules.
 */
(function(global){
  if(!global) return;

  const typeUtils = (typeof window !== "undefined" && window.typeUtils) ? window.typeUtils : {};
  const isFunction = typeUtils.isFunction || ((value) => typeof value === "function");
  const callIfFunction = typeUtils.callIfFunction || ((fn, ...args) => {
    if(isFunction(fn)){
      return fn(...args);
    }
    return undefined;
  });

  const placeDataBits = async (deps = {}) => {
    const {
      bitsSeq = [],
      updateCursor,
      moveCursor,
      getStepDelay,
      sleep,
      isStepModeOn,
      setRenderMode,
      renderModeBuffered,
      renderModeImmediate,
      requestRender,
      directionUp,
      directionDown,
      runIdAccessor,
      currentRun,
      cursorPos,
      encodeBit,
      updateCell,
      isEmpty,
      getTimingColIndex,
      stepEnabled: initialStepEnabled = false,
    } = deps;
    const seq = Array.isArray(bitsSeq) ? bitsSeq : [];
    const boardSize = Number.isFinite(deps.boardSize) ? deps.boardSize : 25;
    let bitIdx = 0;
    let col = boardSize;
    let upward = true;
    let startRow = boardSize;
    let aborted = false;
    let stepEnabled = !!initialStepEnabled;
    while(col > 0 && bitIdx < seq.length){
      if(currentRun !== runIdAccessor.get()){
        aborted = true;
        break;
      }
      const timingColIndex = isFunction(getTimingColIndex) ? getTimingColIndex() : 0;
      if(timingColIndex > 0 && col === timingColIndex){
        col--;
        continue;
      }
      const colLeft = col - 1;
      for(let i = 0; i < boardSize && bitIdx < seq.length; i++){
        if(currentRun !== runIdAccessor.get()){
          aborted = true;
          break;
        }
        const row = (() => {
          if(upward){
            const r = startRow - i;
            return r >= 1 ? r : boardSize + r;
          }
          const r = startRow + i;
          return r <= boardSize ? r : r - boardSize;
        })();
        callIfFunction(updateCursor, cursorPos.row, cursorPos.col, upward ? directionUp : directionDown);
        for(const cTarget of [col, colLeft]){
          if(bitIdx >= seq.length) break;
          if(cTarget < 1) continue;
          if(timingColIndex > 0 && cTarget === timingColIndex) continue;
          if(cTarget < 1 || cTarget > boardSize) continue;
          const moved = moveCursor(row, cTarget);
          if(!moved) continue;
          if(isFunction(isEmpty) && !isEmpty()){
            if(stepEnabled){
              const delay = isFunction(getStepDelay) ? getStepDelay() : 0;
              const skipDelay = Math.max(0, Math.round(delay / 2));
              if(skipDelay > 0){
                await sleep(skipDelay);
                if(currentRun !== runIdAccessor.get()){
                  aborted = true;
                  break;
                }
                if(isFunction(isStepModeOn) && !isStepModeOn()){
                  stepEnabled = false;
                  if(isFunction(setRenderMode)){
                    setRenderMode(renderModeBuffered);
                  }
                }
              }
            }
            continue;
          }
          const { bit, kind } = seq[bitIdx];
          const encoded = isFunction(encodeBit) ? encodeBit(kind, bit === 1) : null;
          if(encoded !== null && isFunction(updateCell)){
            updateCell(cursorPos.row, cursorPos.col, encoded);
          }
          bitIdx++;
          if(currentRun !== runIdAccessor.get()){
            aborted = true;
            break;
          }
          if(stepEnabled){
            const delay = isFunction(getStepDelay) ? getStepDelay() : 0;
            await sleep(Math.max(0, delay));
            if(currentRun !== runIdAccessor.get()){
              aborted = true;
              break;
            }
            if(isFunction(isStepModeOn) && !isStepModeOn()){
              stepEnabled = false;
              if(isFunction(setRenderMode)){
                setRenderMode(renderModeBuffered);
              }
            }
          }
        }
        if(aborted) break;
      }
      if(aborted) break;
      upward = !upward;
      startRow = upward ? boardSize : 1;
      col -= 2;
    }
    const stepEnded = !stepEnabled;
    return {
      aborted,
      stepEnded,
    };
  };

})(typeof window !== "undefined" ? window : globalThis);
