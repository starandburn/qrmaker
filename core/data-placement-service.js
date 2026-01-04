/**
 * データビット配置ループを切り出したサービス。ステップモード/中断チェックと描画タイミングを含む。
 */
(function(global){
  if(!global) return;

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
    let bitIdx = 0;
    let col = 25;
    let upward = true;
    let startRow = 25;
    let aborted = false;
    let stepEnabled = !!initialStepEnabled;
    while(col > 0 && bitIdx < seq.length){
      if(currentRun !== runIdAccessor.get()){
        aborted = true;
        break;
      }
      const timingColIndex = typeof getTimingColIndex === "function" ? getTimingColIndex() : 0;
      if(timingColIndex > 0 && col === timingColIndex){
        col--;
        continue;
      }
      const colLeft = col - 1;
      for(let i = 0; i < 25 && bitIdx < seq.length; i++){
        if(currentRun !== runIdAccessor.get()){
          aborted = true;
          break;
        }
        const row = (() => {
          if(upward){
            const r = startRow - i;
            return r >= 1 ? r : 25 + r;
          }
          const r = startRow + i;
          return r <= 25 ? r : r - 25;
        })();
        if(typeof updateCursor === "function"){
          updateCursor(cursorPos.row, cursorPos.col, upward ? directionUp : directionDown);
        }
        for(const cTarget of [col, colLeft]){
          if(bitIdx >= seq.length) break;
          if(cTarget < 1) continue;
          if(timingColIndex > 0 && cTarget === timingColIndex) continue;
          if(cTarget < 1 || cTarget > 25) continue;
          const moved = moveCursor(row, cTarget);
          if(!moved) continue;
          if(typeof isEmpty === "function" && !isEmpty()){
            continue;
          }
          const { bit, kind } = seq[bitIdx];
          const encoded = typeof encodeBit === "function" ? encodeBit(kind, bit === 1) : null;
          if(encoded !== null && typeof updateCell === "function"){
            updateCell(cursorPos.row, cursorPos.col, encoded);
          }
          bitIdx++;
          if(currentRun !== runIdAccessor.get()){
            aborted = true;
            break;
          }
          if(stepEnabled){
            const delay = typeof getStepDelay === "function" ? getStepDelay() : 0;
            await sleep(Math.max(0, delay));
            if(currentRun !== runIdAccessor.get()){
              aborted = true;
              break;
            }
            if(typeof isStepModeOn === "function" && !isStepModeOn()){
              stepEnabled = false;
              if(typeof setRenderMode === "function"){
                setRenderMode(renderModeBuffered);
              }
            }
          }
        }
        if(aborted) break;
      }
      if(aborted) break;
      upward = !upward;
      startRow = upward ? 25 : 1;
      col -= 2;
    }
    const stepEnded = !stepEnabled;
    return {
      aborted,
      stepEnded,
    };
  };

  global.dataPlacementService = Object.assign(global.dataPlacementService || {}, {
    placeDataBits,
  });
})(typeof window !== "undefined" ? window : globalThis);
