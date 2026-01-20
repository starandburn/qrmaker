// app/settings-normalizer.js
(function(global){
  if(!global) return;
  if(typeof global.createSettingsNormalizer === "function") return;

  function normalizeNumberSetting(value){
    if(typeof value === "number" && Number.isFinite(value)){
      return value;
    }
    if(typeof value === "string"){
      const trimmed = value.trim();
      if(trimmed.length){
        const parsed = Number(trimmed);
        if(Number.isFinite(parsed)){
          return parsed;
        }
      }
    }
    return null;
  }

  function resolveSettings(configDefaults){
    const stepAnimationEnabledOverride = (typeof configDefaults.stepAnimationEnabled === "boolean")
      ? configDefaults.stepAnimationEnabled
      : true;
    const stepAnimationShowBorder = (typeof configDefaults.stepAnimationShowBorder === "boolean")
      ? configDefaults.stepAnimationShowBorder
      : true;
    const stepAnimationDurationMs = normalizeNumberSetting(configDefaults.stepAnimationDurationMs);
    const stepAnimationStartOpacity = normalizeNumberSetting(configDefaults.stepAnimationStartOpacity);
    const stepAnimationStartScale = normalizeNumberSetting(configDefaults.stepAnimationStartScale);
    const maskFadeDurationMs = normalizeNumberSetting(configDefaults.maskFadeDurationMs);
    const presentationRingEnabled = (typeof configDefaults.presentationPointerRingEnabled === "boolean")
      ? configDefaults.presentationPointerRingEnabled
      : true;
    const presentationRingDurationMs = normalizeNumberSetting(configDefaults.presentationPointerRingDurationMs);
    const presentationRingSize = normalizeNumberSetting(configDefaults.presentationPointerRingSize);
    const presentationRingScaleStart = normalizeNumberSetting(configDefaults.presentationPointerRingScaleStart);
    const presentationRingScaleEnd = normalizeNumberSetting(configDefaults.presentationPointerRingScaleEnd);
    const presentationRingColor = (typeof configDefaults.presentationPointerRingColor === "string")
      ? configDefaults.presentationPointerRingColor.trim()
      : "";
    const presentationRingShadowColor = (typeof configDefaults.presentationPointerRingShadowColor === "string")
      ? configDefaults.presentationPointerRingShadowColor.trim()
      : "";
    const presentationRingEase = (typeof configDefaults.presentationPointerRingEase === "string")
      ? configDefaults.presentationPointerRingEase.trim()
      : "";
    const presentationRingDuration = (presentationRingDurationMs !== null)
      ? Math.max(0, presentationRingDurationMs)
      : 400;
    const codeZoomStepPx = normalizeNumberSetting(configDefaults.codeZoomStepPx);
    const codeZoomMinPx = normalizeNumberSetting(configDefaults.codeZoomMinPx);
    const codeZoomMaxPx = normalizeNumberSetting(configDefaults.codeZoomMaxPx);
    const codeZoomHoldCount = normalizeNumberSetting(configDefaults.codeZoomHoldCount);
    const codeZoomBasePx = normalizeNumberSetting(configDefaults.codeZoomBasePx);
    const codeZoomLineHeightMinPx = normalizeNumberSetting(configDefaults.codeZoomLineHeightMinPx);
    const codeZoomLineHeightRatio = normalizeNumberSetting(configDefaults.codeZoomLineHeightRatio);
    const codeZoomLineHeightMaxOffsetPx = normalizeNumberSetting(configDefaults.codeZoomLineHeightMaxOffsetPx);

    return {
      stepAnimationEnabledOverride,
      stepAnimationShowBorder,
      stepAnimationDurationMs,
      stepAnimationStartOpacity,
      stepAnimationStartScale,
      maskFadeDurationMs,
      presentationRingEnabled,
      presentationRingDurationMs,
      presentationRingSize,
      presentationRingScaleStart,
      presentationRingScaleEnd,
      presentationRingColor,
      presentationRingShadowColor,
      presentationRingEase,
      presentationRingDuration,
      codeZoomStepPx,
      codeZoomMinPx,
      codeZoomMaxPx,
      codeZoomHoldCount,
      codeZoomBasePx,
      codeZoomLineHeightMinPx,
      codeZoomLineHeightRatio,
      codeZoomLineHeightMaxOffsetPx,
    };
  }

  function applyWindowSettings(resolved){
    if(typeof window === "undefined") return;
    window.stepAnimationEnabled = resolved.stepAnimationEnabledOverride;
    if(resolved.stepAnimationDurationMs !== null){
      window.stepAnimationDurationMs = Math.max(0, resolved.stepAnimationDurationMs);
    }
    if(resolved.maskFadeDurationMs !== null){
      window.maskFadeDurationMs = Math.max(0, resolved.maskFadeDurationMs);
    }
  }

  global.createSettingsNormalizer = function(){
    return { normalizeNumberSetting, resolveSettings, applyWindowSettings };
  };
})(typeof window !== "undefined" ? window : globalThis);
