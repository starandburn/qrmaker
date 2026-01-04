# 外部契約ドキュメント

## A. `index.html` の `<script>` 読み込み順
1. `script` `type="text/plain"` `id="codeSample1"`（静的サンプル文字列、ボタン `data-sample="codeSample1"` から利用）
2. `script` `type="text/plain"` `id="codeSample2"`（同上、サンプル 2）
3. `script` `type="text/plain"` `id="codeSample3"`（同上、サンプル 3）
4. `script` `type="text/plain"` `id="codeSample4"`（同上、サンプル 4）
5. `script` `type="text/plain"` `id="codeSample5"`（同上、サンプル 5）
6. `script src="domain/qrcode.js"`（同期読み込み、モジュール指定なし）
7. `script src="domain/board.js"`（同期）
8. `script src="domain/util.js"`（同期）
9. `script src="domain/qrParams.js"`（同期）
10. `script src="core/renderCycle.js"`（同期）
11. `script src="ui/layout.js"`（同期）
12. `script src="ui/debugView.js"`（同期）
13. `script src="state/urlState.js"`（同期）
14. `script src="state/historyStore.js"`（同期）
15. `script src="io/scriptParser.js"`（同期）
16. `script src="ui/uiControls.js"`（同期）
17. `script src="state/appState.js"`（同期）
18. `script src="core/basePatternService.js"`（同期）
19. `script src="core/dataBitPreparationService.js"`（同期）
20. `script src="core/dataPlacementService.js"`（同期）
21. `script src="core/runCoordinatorService.js"`（同期）
22. `script src="core/qrBuildService.js"`（同期）
23. `script src="ui/eventBindings.js"`（同期）
24. `script src="app/legacy/functionalPatterns.js"`（同期）
25. `script src="app/qrLegacyDrawers.js"`（同期）
26. `script src="ui/debugSync.js"`（同期）
27. `script src="app/stepControl.js"`（同期）
28. `script src="app/userCodeRunner.js"`（同期）
29. `script src="app/main.js"`（同期）
30. `script src="app/bootstrap.js"`（同期、最後に読み込まれ主制御を起動）

## B. `window` に公開される API（`app/bootstrap.js` 経由）
### B.1 `app/bootstrap.js` での橋渡し
- `window.publishWindowApi`：`window.__deferredWindowApi` の内容を `window` に再適用する公開ヘルパー。`runMainApp` の初期実行後に呼び出され、必要に応じて再度同名 API を上書きする。
- `runMainApp` を `window.layoutUI`/`window.urlState`/`window.debugUI` を引数に実行し、レスポンスの準備が完了したタイミングで `publishWindowApi()` により `window` 上にプロパティを定義する。

### B.2 `window.__deferredWindowApi` の登録（`app/main.js` 起点）
`window.__deferredWindowApi` は `app/main.js` 側で構築され、`app/bootstrap.js` がコピーして `window` に直接公開する。以下の名前一覧が現在公開されている契約であり、併記した由来は現状の実装から読み取れる範囲にとどめている。
- `applyMask`：`app/main.js` で `callApplyMask` を経由（`window.qrLegacyDrawers.applyMask` をラップ）
- `drawBasePatterns`：同（`qrLegacyDrawers.drawBasePatterns` ）
- `drawBasePatternsStepped`：同（`qrLegacyDrawers.drawBasePatternsStepped`）
- `makeStepThenable`：ステップ実行と通信する補助関数（`app/main.js` 内部）
- `shouldStepFunctions`：ステップ実行中の挙動判定（`app/main.js` 内部）
- `qrLegacyDrawers`：`app/qrLegacyDrawers.js` から `window.qrLegacyDrawers` にセットされている描画オブジェクト
- `drawQRCode`：主要描画関数（`app/main.js`）
- `buildQRCode`：QR 生成コントローラ（`app/main.js`）
- `drawDataPatterns`：データ描画ループ（`app/main.js`）
- `drawFunctionalPatterns`：機能パターン描画（`app/main.js`）
- `initializeQRCode`：初期化処理（`app/main.js`）
- `resetQRCode`：リセット処理（`app/main.js`）
- `resetCommand`：コマンドリセット（`app/main.js`）
- `stopCurrentRun`：実行中断（`app/main.js`）
- `drawFormatPatterns`：フォーマットパターン描画（`app/main.js`）
- `drawFinderPatterns`：ファインダパターン描画（`app/main.js`）
- `drawAlignmentPatterns`：アライメントパターン描画（`app/main.js`）
- `drawDarkModulePatterns`：ダークモジュール描画（`app/main.js`）
- `drawTimingPatterns`：タイミングパターン描画（`app/main.js`）
- `putFinderCells`：`callPutFinderCells` を経由し `qrLegacyDrawers.putFinderCells` を呼び出す（`app/main.js`）
- `putAlignmentCells`：同様にアライメント（`app/main.js`）
- `putTimingCells`：同様にタイミング（`app/main.js`）
- `putDarkModuleCells`：同様にダークモジュール（`app/main.js`）
- `putFormatCells`：同様にフォーマット（`app/main.js`）
- `syncViewToggles`：`ui/layout.js` で定義されたビュートグル同期関数。現在は `app/bootstrap.js` が `window.__deferredWindowApi` の `syncViewToggles` をそのまま流している。
- `toggleInputs`：`ui/layout.js` で `global.toggleInputs` に格納されている表示トグル要素の配列。必要に応じて再設定される。

### B.3 補足
- `syncViewToggles` / `toggleInputs` については `ui/layout.js` 由来で上記契約名に含まれている。`core`/`app` 側では配列を共有する前提で参照しているため、変更の際はこれらの依存先を先に検証することを推奨する。

## C. URL パラメータ（`state/urlState.js`）
現状把握しているすべてのキーを列挙してあり、実装で差分が現れた場合はこのファイルを更新すること。
各パラメータは `stringifyBool` により真偽判定され、その他値は個別スキーマに従う。`buildStateUrl()` で現在状態の URL を生成するときは既定値との差分のみクエリに含める。

### 1. `d`（データ文字列）
- `txtInput` の内容を表し、空文字は `_` に置換（`DATA_EMPTY_TOKEN`）。実際に `_` を送りたい場合や `~` で始まる文字列は先頭に `~` を付けたうえで送る（`encodeDataParamValue` / `decodeDataParamValue` が相互処理）。
- デフォルトは `defaultDataValue`（通常は空）。UI 上はタグ内テキスト（`#txtInput`）がこの値で初期化される。

### 2. `v`（表示トグルフラグ）
- `ui/uiControls.js` の `TOGGLE_FLAG_ORDER` に従い、`toggleCursor`/`toggleGuide`/`toggleGrid`/`toggleEmpty`/`toggleColor`/`toggleDebugValues`/`stepMode`/`stepSkipFunctions` の順で `1`/`0` を並べたビット文字列。
- `applyUrlControlStates` に `applyToggleFlags` を渡すと該当要素を更新して `syncViewToggles()` / `syncDebugOverlay()` / `syncStepControls()` 等を必要に応じて呼び出す。
- デフォルトは各トグルの初期チェック状態を並べた `defaultFlagString`。クエリ値は非 `0` 文字（アルファベットや記号）もフィルタ後の `0/1` で判別される。

### 3. `g`（デバッグパネル表示）
- `applyDebugFromParam` で `debugPanel` の表示・非表示を制御。`stringifyBool` は `1|true|yes|on|open|show` で `true`、`0|false|no|off|close|closed|hide` で `false`、空文字は `true`。
- `setDebugVisible` が渡されていればそちらを呼び、無ければ `applyDebugVisibility()` を使って表示を切り替える。
- `buildStateUrl()` は、初期 `g` パラメータの有無または現在の状態が既定値と異なるときのみ `g=1`/`0` を出力。

### 4. `p`（データパターンパネル）
- `applyPatternOpenFromParam` で `<details id="dataPatternPanel">` の `open` 属性を切り替える。`stringifyBool` の真偽に応じて `setPatternPanelOpen(parsed)` または `dataPatternPanel.open = parsed`/`toggle` イベント派生で UI 表示を更新。
- 既定ではパネルの `open` 状態に従う（現在は閉じた状態）。

### 5. `s`（ステップモード関連）
- 整数値を使い、1000 以上なら「関数スキップ OFF」、それ未満なら ON。`parseCombinedStepParam()` は `enabled`（1 以上でステップ有効）、`speedSource`（clamp した速度）`、`skipFunctions`（numeric < 1000 なら true）を返す。
- `applyCombinedStepParam()` は `#stepMode` / `#stepSpeed` / `#stepSkipFunctions` を更新し、`stepSpeed` はスライダー値（0〜120 で clamped）を `baseValue - 1` で再現。`stepSkipFunctions` は `skipFunctions` フラグでチェックする。
- `buildCombinedStepParamValue()` ではステップOFF時に `"0"`、ON 時に `speed + 1`、かつスキップ OFF なら `+1000` して URL に encode。

### 6. `h`（履歴パネル）
- `applyHistoryFromParam()` で `codePanel` 操作履歴エリアの表示状態を `historyController.setHistoryVisibility(parsed)` で切り替える。`stringifyBool` を使うため、`h=1`/`h=true` で表示、`h=0`/`false` で非表示。
- パラメータ指定が無い場合、起動直後に `setHistoryVisibility(false)` して非表示スタート（`historyStore` 側の既定）。

### 7. `m`（コードパネルのサンプル表示）
- `applySampleParam()` で `.code-panel` に `show-samples` クラスを出したり消したりする。`stringifyBool` の結果を `codePanel.classList.toggle("show-samples", parsed)` で反映。
- 指定が無い場合は `.code-panel` のデフォルト状態（JavaScript により `false` からスタート）。

### 補足：URL 側からの制御と状態構築
- `applyUrlControlStates()` は `toggleConfig` 配列で個別パラメータ（`flag` 系）を受け取り、`viewRefreshTargets`/`colorToggleElement`/`debugToggleElement`/`stepToggleTargets` を刷新する。
- `buildStateUrl()` は `txtInput`/`flagString`/`debugPanel`/`historyVisible`/`codePanel` などの現在値と既定値の差分のみを `URLSearchParams` に追加し、空ならパラメータ無しのパスを返す。
- `PARAM_KEYS` マップ（`FLAG`, `DEBUG`, `PATTERN_PANEL`, `COMBINED_STEP`, `SAMPLES`, `DATA`, `HISTORY`）を外部から参照することでパラメータキーのハードコードを避けている。

## D. 手動動作確認チェックリスト（Step 1）
- docs/contracts.md の追加以外に差分がないことを確認する。
- 通常起動して画面が表示されること（`index.html` を開いて UI がレンダリングされること）。
- QR 生成・リセット・ステップ実行・トグル操作・履歴表示・URL 初期化が従来どおり動作すること（確認観点として列挙）。
