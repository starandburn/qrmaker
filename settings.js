window.appSettingsFromScript = {
  "defaults": {
    // QR入力欄の初期値
    "qrData": "Hello, World!",
    // ユーザーコード欄の初期値
    "userCode": "qrcode",
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
        "code": `helloworld`
      },
      {
        "label": "4",
        "code": `reset

move b1
repeat 5
put 1
move down
endrepeat

move c3
repeat 2
put 1
move right
endrepeat

move e1
repeat 5
put 1
move down
endrepeat

move g1
repeat 5
put 1
move down
endrepeat

move h1
repeat 3
put 1
move right
endrepeat

move h3
repeat 3
put 1
move right
endrepeat

move h5
repeat 3
put 1
move right
endrepeat

move l1
repeat 5
put 1
move down
endrepeat

move m5
repeat 3
put 1
move right
endrepeat

move q1
repeat 5
put 1
move down
endrepeat

move r5
repeat 3
put 1
move right
endrepeat

move v2
repeat 3
put 1
move down
endrepeat

move w1
repeat 2
put 1
move right
endrepeat

move y2
repeat 3
put 1
move down
endrepeat

move w5
repeat 2
put 1
move right
endrepeat

move a11
repeat 3
put 1
move down
endrepeat

move b14
repeat 2
put 1
move down
endrepeat

move c11
repeat 3
put 1
move down
endrepeat

move d14
repeat 2
put 1
move down
endrepeat

move e11
repeat 3
put 1
move down
endrepeat

move g12
repeat 3
put 1
move down
endrepeat

move h11
repeat 2
put 1
move right
endrepeat

move j12
repeat 3
put 1
move down
endrepeat

move h15
repeat 2
put 1
move right
endrepeat

move l11
repeat 5
put 1
move down
endrepeat

move m11
repeat 2
put 1
move right
endrepeat

move o12
repeat 2
put 1
move down
endrepeat

move m13
repeat 2
put 1
move right
endrepeat

move n14
put 1

move o15
put 1

move q11
repeat 5
put 1
move down
endrepeat

move r15
repeat 3
put 1
move right
endrepeat

move v11
repeat 5
put 1
move down
end repeat

move w11
repeat 2
put 1
move right
endrepeat

move y12
repeat 3
put 1
move down
endrepeat

move w15
repeat 2
put 1
move right
endrepeat`
      },
      {
        "label": "5",
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
