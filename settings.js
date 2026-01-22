window.appSettingsFromScript = {
  "defaults": {
    // QR入力欄の初期値
    "qrData": "Hello, World!",
    // ユーザーコード欄の初期値
    "userCode": "text",
    // 履歴パネルの初期表示
    "historyVisible": false,
    // パターン詳細パネルの初期表示
    "patternPanelOpen": false,
    // デバッグ表示の初期状態
    "debugVisible": false,
    // 既に値があるセルをスキップするか
    "skipExistingCells": false,
    // タイミングパターン回避の自動化
    "autoAvoidTiming": false,
    // 初期マスク番号
    "defaultMask": 0,
    // 利用可能なスイッチの数 (0〜4)。0未満は0、5以上は4、デフォルト2。
    "switchCount": 2,
    // ステップ実行の待機速度
    "stepSpeed": 30,
    // スキップモードの初期状態
    "skipMode": false,
    // ステップ中はデータ配置のみを対象にするか
    "stepSkipDataOnly": true,
    // putアニメーションの有効/無効
    "stepAnimationEnabled": true,
    // putアニメーションの時間(ms)
    "stepAnimationDurationMs": 250,
    // putアニメーションの開始時透明度
    "stepAnimationStartOpacity": 0.5,
    // putアニメーションの開始時倍率
    "stepAnimationStartScale": 2.0,
    // putアニメーションの枠表示
    "stepAnimationShowBorder": true,
    // マスクフェードの時間(ms)
    "maskFadeDurationMs": 250,
    // 文字ズーム設定
    "codeZoomStepPx": 4,
    "codeZoomMinPx": 12,
    "codeZoomMaxPx": 200,
    "codeZoomHoldCount": 10,
    "codeZoomBasePx": 22,
    "codeZoomLineHeightMinPx": 16,
    "codeZoomLineHeightRatio": 1.2,
    "codeZoomLineHeightMaxOffsetPx": 8,
    // プレゼンモード設定
    "presentationMode": false,
    "presentationPointerRingEnabled": true,
    "presentationPointerRingDurationMs": 400,
    "presentationPointerRingSize": 120,
    "presentationPointerRingColor": "rgba(60, 120, 255, 0.75)",
    "presentationPointerRingShadowColor": "rgba(60, 120, 255, 0.25)",
    "presentationPointerRingScaleStart": 1.4,
    "presentationPointerRingScaleEnd": 0.35,
    "presentationPointerRingEase": "ease-out",
    // 表示のON/OFF初期値
    "viewFlags": {
      // カーソル表示
      "viewCursor": true,
      // ガイド表示
      "viewGuide": true,
      // グリッド表示
      "viewGrid": true,
      // 空セル表示
      "viewEmpty": true,
      // 色分け表示
      "viewColor": true,
      // デバッグ値表示
      "viewDebugValues": true
    },
    "drawText": {
      "forceUppercase": true,
      "skipNonAlnum": true
    },
    "useDirection": false,
    // カーソル初期方向
    "homeCursorDirection": "right",
    // サンプル入力の候補
    "dataTemplates": [
      { "value": "Hello, World!" },
      { "value": "https://www.nkk.ac.jp/" },
      { "value": "Cwm fjord-bank glyphs vext quiz." },
      { "value": "UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU" }
    ],
    "codeSamples": []
  }
};
