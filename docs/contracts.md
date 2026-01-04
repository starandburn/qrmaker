# 外部契?E??キュメンチE
## A. `index.html` の `<script>` 読み込み順
1. `script` `type="text/plain"` `id="codeSample1"` （サンプル 1）
2. `script` `type="text/plain"` `id="codeSample2"` （サンプル 2）
3. `script` `type="text/plain"` `id="codeSample3"` （サンプル 3）
4. `script` `type="text/plain"` `id="codeSample4"` （サンプル 4）
5. `script` `type="text/plain"` `id="codeSample5"` （サンプル 5）
6. `script src="domain/qrcode.js"` （同期）
7. `script src="domain/board.js"` （同期）
8. `script src="domain/util.js"` （同期）
9. `script src="domain/qr-params.js"` （同期）
10. `script src="core/render-cycle.js"` （同期）
11. `script src="ui/layout.js"` （同期）
12. `script src="state/url-state.js"` （同期）
13. `script src="state/history-store.js"` （同期）
14. `script src="io/script-parser.js"` （同期）
15. `script src="ui/ui-controls.js"` （同期）
16. `script src="state/app-state.js"` （同期）
17. `script src="core/base-pattern-service.js"` （同期）
18. `script src="core/data-placement-service.js"` （同期）
19. `script src="core/qr-build-service.js"` （同期）
20. `script src="ui/event-bindings.js"` （同期）
21. `script src="app/legacy/functionalPatterns.js"` （同期）
22. `script src="app/qrLegacyDrawers.js"` （同期）
23. `script src="app/step-control.js"` （同期）
24. `script src="app/user-code-runner.js"` （同期）
25. `script src="app/main.js"` （同期）
26. `script src="app/bootstrap.js"` （同期、最後に主要制御を起動）
## B. `window` に公開される API?E?Eapp/bootstrap.js` 経由?E?E### B.1 `app/bootstrap.js` での橋渡ぁE- `window.publishWindowApi`?E?`window.__deferredWindowApi` の?E??めE`window` に再適用する公開?Eルパ?E。`runMainApp` の初期実行後に呼び出され、?E??に応じて再度同名 API を上書きする、E- `runMainApp` めE`window.layoutUI`/`window.urlState`/`window.debugUI` を引数に実行し、レスポンスの準備が完?E??たタイミングで `publishWindowApi()` により `window` 上にプロパティを定義する、E
### B.2 `window.__deferredWindowApi` の登録?E?Eapp/main.js` 起点?E?E`window.__deferredWindowApi` は `app/main.js` 側で構築され、`app/bootstrap.js` がコピ?Eして `window` に直接公開する。以下?E名前一覧が現在公開されてぁE??契?E??あり、併記した由来は現状の実裁E??ら読み取れる篁E??にとどめてぁE??、E- `applyMask`?E?`app/main.js` で `callApplyMask` を経由?E?Ewindow.qrLegacyDrawers.applyMask` をラチE?E?E?E- `drawBasePatterns`?E?同?E?EqrLegacyDrawers.drawBasePatterns` ?E?E- `drawBasePatternsStepped`?E?同?E?EqrLegacyDrawers.drawBasePatternsStepped`?E?E- `makeStepThenable`?E?スチE??プ実行と通信する補助関数?E?Eapp/main.js` ?E???E?E- `shouldStepFunctions`?E?スチE??プ実行中の挙動判定！Eapp/main.js` ?E???E?E- `qrLegacyDrawers`?E?`app/qrLegacyDrawers.js` から `window.qrLegacyDrawers` にセチE??されてぁE??描画オブジェクチE- `drawQRCode`?E?主要描画関数?E?Eapp/main.js`?E?E- `buildQRCode`?E?QR 生?Eコントローラ?E?Eapp/main.js`?E?E- `drawDataPatterns`?E?データ描画ループ！Eapp/main.js`?E?E- `drawFunctionalPatterns`?E?機?Eパターン描画?E?Eapp/main.js`?E?E- `initializeQRCode`?E??E期化処?E??Eapp/main.js`?E?E- `resetQRCode`?E?リセチE??処?E??Eapp/main.js`?E?E- `resetCommand`?E?コマンドリセチE???E?Eapp/main.js`?E?E- `stopCurrentRun`?E?実行中断?E?Eapp/main.js`?E?E- `drawFormatPatterns`?E?フォーマットパターン描画?E?Eapp/main.js`?E?E- `drawFinderPatterns`?E?ファインダパターン描画?E?Eapp/main.js`?E?E- `drawAlignmentPatterns`?E?アライメントパターン描画?E?Eapp/main.js`?E?E- `drawDarkModulePatterns`?E?ダークモジュール描画?E?Eapp/main.js`?E?E- `drawTimingPatterns`?E?タイミングパターン描画?E?Eapp/main.js`?E?E- `putFinderCells`?E?`callPutFinderCells` を経由ぁE`qrLegacyDrawers.putFinderCells` を呼び出す！Eapp/main.js`?E?E- `putAlignmentCells`?E?同様にアライメント！Eapp/main.js`?E?E- `putTimingCells`?E?同様にタイミング?E?Eapp/main.js`?E?E- `putDarkModuleCells`?E?同様にダークモジュール?E?Eapp/main.js`?E?E- `putFormatCells`?E?同様にフォーマット！Eapp/main.js`?E?E- `syncViewToggles`?E?`ui/layout.js` で定義されたビュートグル同期関数。現在は `app/bootstrap.js` ぁE`window.__deferredWindowApi` の `syncViewToggles` をそのまま流してぁE??、E- `toggleInputs`?E?`ui/layout.js` で `global.toggleInputs` に格納されてぁE??表示トグル要素の配?E。?E??に応じて再設定される、E
### B.3 補足
- `syncViewToggles` / `toggleInputs` につぁE??は `ui/layout.js` 由来で上記契?E??に含まれてぁE??。`core`/`app` 側では配?Eを?E有する前提で参?EしてぁE??ため、変更の際?Eこれら?E依存?Eを?Eに検証することを推奨する、E
## C. URL パラメータ?E?Estate/url-state.js`?E?E現状把握してぁE??すべてのキーを?E挙してあり、実裁E??差?E??現れた場合?Eこ?Eファイルを更新すること、E吁E??ラメータは `stringifyBool` により真偽判定され、その他値は個別スキーマに従う。`buildStateUrl()` で現在状態?E URL を生成するとき?E既定値との差?E?Eみクエリに含める、E
### 1. `d`?E?データ?E???E?E?E- `txtInput` の?E??を表し、空?E???E `_` に置換！EDATA_EMPTY_TOKEN`?E?。実際に `_` を送りたい場合や `~` で始まる文字?Eは先頭に `~` を付けたうえで送る?E?EencodeDataParamValue` / `decodeDataParamValue` が相互?E?E??、E- チE??ォルト?E `defaultDataValue`?E?通常は空?E?。UI 上?Eタグ?E??キスト！E#txtInput`?E?がこ?E値で初期化される、E
### 2. `v`?E?表示トグルフラグ?E?E- `ui/ui-controls.js` の `TOGGLE_FLAG_ORDER` に従い、`toggleCursor`/`toggleGuide`/`toggleGrid`/`toggleEmpty`/`toggleColor`/`toggleDebugValues`/`stepMode`/`stepSkipFunctions` の頁E?? `1`/`0` を並べたビチE???E???E、E- `applyUrlControlStates` に `applyToggleFlags` を渡すと該当要素を更新して `syncViewToggles()` / `syncDebugOverlay()` / `syncStepControls()` 等を?E??に応じて呼び出す、E- チE??ォルト?E吁E??グルの初期チェチE??状態を並べぁE`defaultFlagString`。クエリ値は?E`0` ?E??（アルファベットや記号?E?もフィルタ後?E `0/1` で判別される、E
### 3. `g`?E?デバッグパネル表示?E?E- `applyDebugFromParam` で `debugPanel` の表示・非表示を制御。`stringifyBool` は `1|true|yes|on|open|show` で `true`、`0|false|no|off|close|closed|hide` で `false`、空?E???E `true`、E- `setDebugVisible` が渡されてぁE??ばそちらを呼び、無ければ `applyDebugVisibility()` を使って表示を?Eり替える、E- `buildStateUrl()` は、?E?E`g` パラメータの有無また?E現在の状態が既定値と異なるとき?Eみ `g=1`/`0` を?E力、E
### 4. `p`?E?データパターンパネル?E?E- `applyPatternOpenFromParam` で `<details id="dataPatternPanel">` の `open` 属性を?Eり替える。`stringifyBool` の真偽に応じて `setPatternPanelOpen(parsed)` また?E `dataPatternPanel.open = parsed`/`toggle` イベント派生で UI 表示を更新、E- 既定ではパネルの `open` 状態に従う?E?現在は閉じた状態）、E
### 5. `s`?E?スチE??プモード関連?E?E- 整数値を使ぁE??E000 以上なら「関数スキチE?E OFF」、それ未満なめEON。`parseCombinedStepParam()` は `enabled`?E?E 以上でスチE??プ有効?E?、`speedSource`?E?Elamp した速度?E?`、`skipFunctions`?E?Eumeric < 1000 なめEtrue?E?を返す、E- `applyCombinedStepParam()` は `#stepMode` / `#stepSpeed` / `#stepSkipFunctions` を更新し、`stepSpeed` はスライダー値?E?E、E20 で clamped?E?を `baseValue - 1` で再現。`stepSkipFunctions` は `skipFunctions` フラグでチェチE??する、E- `buildCombinedStepParamValue()` ではスチE??プOFF時に "0"、ON 時に `speed + 1`、かつスキチE?E OFF なめE`+1000` して URL に encode、E
### 6. `h`?E?履歴パネル?E?E- `applyHistoryFromParam()` で `codePanel` 操作履歴エリアの表示状態を `historyController.setHistoryVisibility(parsed)` で?E??替える。`stringifyBool` を使ぁE??め、`h=1`/`h=true` で表示、`h=0`/`false` で非表示、E- パラメータ持E??が無ぁE??合、起動直後に `setHistoryVisibility(false)` して非表示スタート！EhistoryStore` 側の既定）、E
### 7. `m`?E?コードパネルのサンプル表示?E?E- `applySampleParam()` で `.code-panel` に `show-samples` クラスを?Eしたり消したりする。`stringifyBool` の結果めE`codePanel.classList.toggle("show-samples", parsed)` で反映、E- 持E??が無ぁE??合?E `.code-panel` のチE??ォルト状態！EavaScript により `false` からスタート）、E
### 補足?E?URL 側からの制御と状態構篁E- `applyUrlControlStates()` は `toggleConfig` 配?Eで個別パラメータ?E?Eflag` 系?E?を受け取り、`viewRefreshTargets`/`colorToggleElement`/`debugToggleElement`/`stepToggleTargets` を刷新する、E- `buildStateUrl()` は `txtInput`/`flagString`/`debugPanel`/`historyVisible`/`codePanel` などの現在値と既定値の差?E?EみめE`URLSearchParams` に追加し、空ならパラメータ無し?Eパスを返す、E- `PARAM_KEYS` マップ！EFLAG`, `DEBUG`, `PATTERN_PANEL`, `COMBINED_STEP`, `SAMPLES`, `DATA`, `HISTORY`?E?を外部から参?Eすることでパラメータキーのハ?Eドコードを避けてぁE??、E
## D. 手動動作確認チェチE??リスト！Etep 1?E?E- docs/contracts.md の追加以外に差?E??なぁE??とを確認する、E- 通常起動して画面が表示されること?E?Eindex.html` を開ぁE?? UI がレンダリングされること?E?、E- QR 生?E・リセチE??・スチE??プ実行?Eトグル操作?E履歴表示・URL 初期化が従来どおり動作すること?E?確認観点として列挙?E?、E


