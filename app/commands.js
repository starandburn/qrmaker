// app/commands.js
(function(global){
  if(!global) return;
  if(typeof global.createCommands === "function") return;

  function createCommands(win){
    const commandsPublic = {};
    // Basic Control
    assignIfFunction(commandsPublic, "resetBoard", win.resetBoard);
    assignIfFunction(commandsPublic, "pauseRunning", win.pauseRunning);
    // Cursor & Movement
    assignIfFunction(commandsPublic, "moveCursor", win.moveCursor);
    assignIfFunction(commandsPublic, "jumpCursor", win.jumpCursor);
    assignIfFunction(commandsPublic, "turnCursor", win.turnCursor);
    // QR Drawing
    assignIfFunction(commandsPublic, "drawQRCode", win.drawQRCode);
    assignIfFunction(commandsPublic, "drawBasePatterns", win.drawBasePatterns);
    assignIfFunction(commandsPublic, "drawDataPatterns", win.drawDataPatterns);
    assignIfFunction(commandsPublic, "applyMask", win.applyMask);
    assignIfFunction(commandsPublic, "drawFinderPatterns", win.drawFinderPatterns);
    assignIfFunction(commandsPublic, "drawAlignmentPatterns", win.drawAlignmentPatterns);
    assignIfFunction(commandsPublic, "drawDarkModulePatterns", win.drawDarkModulePatterns);
    assignIfFunction(commandsPublic, "drawFormatPatterns", win.drawFormatPatterns);
    assignIfFunction(commandsPublic, "drawTimingPatterns", win.drawTimingPatterns);
    // Text Drawing
    assignIfFunction(commandsPublic, "drawText", win.drawText);
    // Cell Operations
    assignIfFunction(commandsPublic, "putCell", win.putCell);
    assignIfFunction(commandsPublic, "putFinderCells", win.putFinderCells);
    assignIfFunction(commandsPublic, "putAlignmentCells", win.putAlignmentCells);
    assignIfFunction(commandsPublic, "putDarkModuleCells", win.putDarkModuleCells);
    assignIfFunction(commandsPublic, "putFormatCells", win.putFormatCells);
    assignIfFunction(commandsPublic, "putTimingCells", win.putTimingCells);
    // Queries & Utilities
    assignIfFunction(commandsPublic, "isEmpty", win.isEmpty);
    assignIfFunction(commandsPublic, "isMoveBlocked", win.isMoveBlocked);
    assignIfFunction(commandsPublic, "didMove", win.didMove);
    assignIfFunction(commandsPublic, "isSkipZone", win.isSkipZone);
    assignIfFunction(commandsPublic, "hasNextData", win.hasNextData);
    assignIfFunction(commandsPublic, "getNextData", win.getNextData);
    assignIfFunction(commandsPublic, "canContinueLoop", win.canContinueLoop);
    // Switch / Color Helpers
    assignIfFunction(commandsPublic, "setSwitch", win.setSwitch);
    assignIfFunction(commandsPublic, "isSwitchOn", win.isSwitchOn);
    return { public: commandsPublic };
  }

  global.createCommands = createCommands;
})(typeof window !== "undefined" ? window : globalThis);
