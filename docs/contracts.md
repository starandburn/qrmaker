# 外部契約ドキュメント

## A. `index.html` の `<script>` 読み込み順
1. `script src="domain/qrcode.js"`
2. `script src="domain/board.js"`
3. `script src="domain/util.js"`
4. `script src="domain/qr-params.js"`
5. `script src="core/render-cycle.js"`
6. `script src="ui/layout.js"`
7. `script src="ui/debug.js"`
8. `script src="state/url-state.js"`
9. `script src="state/history-store.js"`
10. `script src="io/script-parser.js"`
11. `script src="ui/ui-controls.js"`
12. `script src="state/app-state.js"`
13. `script src="core/patterns/finder-pattern.js"`
14. `script src="core/patterns/timing-pattern.js"`
15. `script src="core/patterns/alignment-pattern.js"`
16. `script src="core/patterns/dark-module-pattern.js"`
17. `script src="core/patterns/format-pattern.js"`
18. `script src="core/base-pattern-service.js"`
19. `script src="core/data-encoding-service.js"`
20. `script src="core/data-placement-service.js"`
21. `script src="core/execution-coordinator-service.js"`
22. `script src="core/qr-build-service.js"`
23. `script src="core/qr-verify-service.js"`
24. `script src="core/execution-control.js"`
25. `script src="ui/event-bindings.js"`
26. `script src="app/step-control.js"`
27. `script src="app/user-code-runner.js"`
28. `script src="app/self-check.js"`
29. `script src="app/main.js"`
30. `script src="settings.js"`
31. `script src="app/bootstrap.js"`

### A.1 サンプルコードの定義
- `settings.js` の `defaults.codeSamples` に並べた文字列だけサンプルボタンが `code-debug-toolbar` に追加されます。

### A.2 データテンプレート
- `settings.js` の `defaults.dataTemplates` に並べたオブジェクト（`label`/`value`）で `#sampleDropdownMenu` の項目が再構築され、選んだ文字列が `#txtInput` に入ります（設定がないと空リストになります）。

### A.3 バージョン表示
- `version.js` で定義した `window.appVersionString` をヘッダー内 `.title` の横に置いた `#appVersionInfo` に表示します。minor/revision 運用は `node scripts/bump-revision.js`。

### A.4 データ描画と既存セル制御
- `settings.js` の `defaults.skipExistingCells` を `true` にすると、すでに値が入っているマスには `put` 系の命令を書き込みません（デフォルト `false`＝常に上書き）。教材側で空きチェックしてから命令を出すときはこちらを設定してください。
- URL パラメータ `x` は `true`/`1` で配置済セルを避け、`false`/`0` で常に上書きを許可します。
## B. window へ公開する API
### B.1 実装 `app/main.js`
- `window.__deferredWindowApi` 経由で `applyMask` 〜 `buildQRCode`/`draw*` 系を公開し、`publishWindowApi()` で `window` にコピーされます。
- `putFinderCells`/`putAlignmentCells`/`putTimingCells`/`putDarkModuleCells`/`putFormatCells` も同様。
- `syncViewToggles` や `toggleInputs` も公開され、UI 側から状態を同期できるようになっています。
- `app/bootstrap.js` が `runMainApp` を起動し、必要な依存（`layoutUI`, `urlState`, `debugUI`, `settings`）を渡します。

## C. URL で指定できる制御パラメータ
1. `d`：`#txtInput` の値を `encodeDataParamValue`/`decodeDataParamValue` で圧縮・展開します。
2. `v`：`toggleCursor` や `stepSkipFunctions` を `applyUrlControlStates` で切り替えるためのフラグ文字列です。
3. `g`：`applyDebugFromParam` でデバッグパネルの表示をオン／オフします。
4. `p`：`dataPatternPanel.open` の状態を `stringifyBool` で URL パラメータに保存／復元します。
5. `s`：`stepMode`/`stepSpeed`/`stepSkipFunctions` を `buildCombinedStepParamValue`/`parseCombinedStepParam` で１つの値にまとめたものです。
6. `h`：`historyController.setHistoryVisibility()` を通じて履歴パネル表示を切り替えます。
7. `m`：`.code-panel` の `show-samples` クラスを付けることでサンプル一覧表示を制御します。
8. `x`：`skipExistingCells` のフラグで、`true`/`1` なら配置済セルを避け、`false`/`0` なら常に上書きを許可します。

## D. 契約補足
- このファイルは UI との契約をまとめたもので、`index.html` の `<script>` 順序や `settings.js` の構造を変更したらあわせて更新してください。
- バージョン番号は `version.js` で管理します。軽微な修正のたびに `node scripts/bump-revision.js` を実行すれば `revision` の値だけ書き換わるので、他ファイルを触らずに差分を限定できます。必要に応じて `major`/`minor` を直接書き換えてください。
