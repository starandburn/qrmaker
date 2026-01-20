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
    // コード例の候補
    "codeSamples": [
      {
        "label": "1",
        "code": `qrcode`
      },
      {
        "label": "2",
        "code": `reset
base
data
mask`
      },
      {
        "label": "3",
        "code": `reset
text This
text is 
text not
text QR
text Code.`
      },
      {
        "label": "4",
        "code": `reset		// 盤面リセット
base		// 基本パターン描画
move y25 	// 開始位置右下に移動
red off		// 赤スイッチをOFF
blue off	// 青スイッチをOFF

// データパターン描画
repeat last	// 最後のデータまで繰り返し
	if empty? put next	// まだ未配置であれば次のデータを置く
	
	// 赤スイッチによる処理分け
	if red?	// 赤スイッチがON（2列の左側を処理中）
		if blue? move down else move up	// 青スイッチにより上下に移動
		if block?	// 進めなかった場合
			move left	// 左に移動
			if timing? move left	// タイミングパターン列を避ける
			blue flip	// 青スイッチ（上下方向）を反転
		else		// 進めた場合
			move right	// 右側の列に戻る
		endif
	else	// 赤スイッチがOFF（2列の右側を処理中）
		move left	// 左に移動	
	endif
	red flip	// 赤スイッチを反転する
endrepeat
mask	// マスクを適用する`
      }
    ]
  }
};
