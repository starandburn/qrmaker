/**
 * データビットのセット構築・ビット列作成・カーソル移動を担うサービス。
 */
(function(global){
  if(!global || !global.dataEncodingService) return;
  global.dataBitPreparationService = Object.assign(global.dataBitPreparationService || {}, global.dataEncodingService);
})(typeof window !== "undefined" ? window : globalThis);
