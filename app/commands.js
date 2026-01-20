// app/commands.js
(function(global){
  if(!global) return;
  if(typeof global.createCommands === "function") return;

  function createCommands(win){
    const commandsPublic = {};
    assignIfFunction(commandsPublic, "moveCursor", win.moveCursor);
    assignIfFunction(commandsPublic, "turnCursor", win.turnCursor);
    assignIfFunction(commandsPublic, "resetQRCode", win.resetQRCode);
    assignIfFunction(commandsPublic, "pauseRunning", win.pauseRunning);
    assignIfFunction(commandsPublic, "drawQRCode", win.drawQRCode);
    assignIfFunction(commandsPublic, "drawBasePatterns", win.drawBasePatterns);
    assignIfFunction(commandsPublic, "drawDataPatterns", win.drawDataPatterns);
    assignIfFunction(commandsPublic, "applyMask", win.applyMask);
    assignIfFunction(commandsPublic, "drawText", win.drawText);
    assignIfFunction(commandsPublic, "drawFinderPatterns", win.drawFinderPatterns);
    assignIfFunction(commandsPublic, "drawAlignmentPatterns", win.drawAlignmentPatterns);
    assignIfFunction(commandsPublic, "drawDarkModulePatterns", win.drawDarkModulePatterns);
    assignIfFunction(commandsPublic, "drawFormatPatterns", win.drawFormatPatterns);
    assignIfFunction(commandsPublic, "drawTimingPatterns", win.drawTimingPatterns);
    assignIfFunction(commandsPublic, "putCell", win.putCell);
    assignIfFunction(commandsPublic, "putFinderCells", win.putFinderCells);
    assignIfFunction(commandsPublic, "putAlignmentCells", win.putAlignmentCells);
    assignIfFunction(commandsPublic, "putDarkModuleCells", win.putDarkModuleCells);
    assignIfFunction(commandsPublic, "putFormatCells", win.putFormatCells);
    assignIfFunction(commandsPublic, "putTimingCells", win.putTimingCells);
    assignIfFunction(commandsPublic, "isEmpty", win.isEmpty);
    assignIfFunction(commandsPublic, "isMoveBlocked", win.isMoveBlocked);
    assignIfFunction(commandsPublic, "isSkipZone", win.isSkipZone);
    assignIfFunction(commandsPublic, "hasMoreData", win.hasMoreData);
    assignIfFunction(commandsPublic, "getNextData", win.getNextData);
    assignIfFunction(commandsPublic, "canContinueLoop", win.canContinueLoop);
    assignIfFunction(commandsPublic, "setSwitch", win.setSwitch);
    assignIfFunction(commandsPublic, "isSwitchOn", win.isSwitchOn);
    return { public: commandsPublic };
  }

  global.createCommands = createCommands;
})(typeof window !== "undefined" ? window : globalThis);
