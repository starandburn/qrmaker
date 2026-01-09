window.appSettingsFromScript = {
  "defaults": {
    // QR入力欄の初期値
    "qrData": "Hello, World!",
    // ユーザーコード欄の初期値
    "userCode": "QRCode",
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
    // 表示のON/OFF初期値
    "viewFlags": {
      // カーソル表示
      "viewCursor": false,
      // ガイド表示
      "viewGuide": false,
      // グリッド表示
      "viewGrid": false,
      // 空セル表示
      "viewEmpty": false,
      // 色分け表示
      "viewColor": false,
      // デバッグ値表示
      "viewDebugValues": false
    },
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
        "code": `clear
base
data
mask`
      },
      {
        "label": "3",
        "code": `clear
finders
timings
alignments
darkmodules
formats
move end up
repeat
	empty? put
	move next
	block?
		turn
		move left
		skip? move left
	endif
end
mask`
      },
      {
        "label": "4",
        "code": `clear
base
move end
turn left
repeat
    put
    move left
    put
    move
    block?
        turn
        move left
     else
        move right
    end
end
mask`
      },
      {
        "label": "5",
        "code": `clear
base
move end
turn left
repeat
    empty? put
    move left
    empty? put
    move
    block?
        turn
        move left
    skip? move left
    else
        move right
    end
end
mask`
      }
    ]
  }
};
