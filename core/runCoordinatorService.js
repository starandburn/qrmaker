/**
 * 実行の runId/stepFill 管理とタスクの排他制御を提供するコーディネータ。
 */
(function(global){
  if(!global || !global.executionCoordinatorService) return;
  global.runCoordinatorService = Object.assign(global.runCoordinatorService || {}, global.executionCoordinatorService);
})(typeof window !== "undefined" ? window : globalThis);
