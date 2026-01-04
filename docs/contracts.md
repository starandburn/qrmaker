# 外部契約ドキュメント

## A. `index.html` の `<script>` 読み込み順
1. `script` `type="text/plain"` `id="codeSample1"`
2. `script` `type="text/plain"` `id="codeSample2"`
3. `script` `type="text/plain"` `id="codeSample3"`
4. `script` `type="text/plain"` `id="codeSample4"`
5. `script` `type="text/plain"` `id="codeSample5"`
6. `script src="domain/qrcode.js"`
7. `script src="domain/board.js"`
8. `script src="domain/util.js"`
9. `script src="domain/qr-params.js"`
10. `script src="core/render-cycle.js"`
11. `script src="ui/layout.js"`
12. `script src="ui/debug.js"`
13. `script src="state/url-state.js"`
14. `script src="state/history-store.js"`
15. `script src="io/script-parser.js"`
16. `script src="ui/ui-controls.js"`
17. `script src="state/app-state.js"`
18. `script src="core/patterns/finder-pattern.js"`
19. `script src="core/patterns/timing-pattern.js"`
20. `script src="core/patterns/alignment-pattern.js"`
21. `script src="core/patterns/dark-module-pattern.js"`
22. `script src="core/patterns/format-pattern.js"`
23. `script src="core/base-pattern-service.js"`
24. `script src="core/data-encoding-service.js"`
25. `script src="core/data-placement-service.js"`
26. `script src="core/execution-coordinator-service.js"`
27. `script src="core/qr-build-service.js"`
28. `script src="core/execution-control.js"`
29. `script src="ui/event-bindings.js"`
30. `script src="app/step-control.js"`
31. `script src="app/user-code-runner.js"`
32. `script src="app/self-check.js"`
33. `script src="app/main.js"`
34. `script src="app/bootstrap.js"`

## B. window に公開される API
### B.1 起点は `app/main.js`
- `window.__deferredWindowApi` には、UI 周りや描画機能などがまとめて登録されている。`app/bootstrap.js` が `publishWindowApi()` で `window` に展開する。
- 公開名の一覧（現状確認できるもの）
  - `applyMask`（現在は `callApplyMask` を経由し、マスク描画処理を提供）
  - `drawQRCode`, `buildQRCode`, `drawDataPatterns`, `drawFunctionalPatterns`, `initializeQRCode`, `resetQRCode`, `resetCommand`, `stopCurrentRun`
  - `drawFormatPatterns`, `drawFinderPatterns`, `drawAlignmentPatterns`, `drawDarkModulePatterns`, `drawTimingPatterns`
  - `putFinderCells`, `putAlignmentCells`, `putTimingCells`, `putDarkModuleCells`, `putFormatCells`
  - `syncViewToggles`, `toggleInputs`
- 本ドキュメントでは上記が外部契約とみなし、由来は現行コードから確認できる範囲の説明にとどめる。

## C. URL パラメータ（`state/url-state.js`）
1. `d` … `#txtInput` に入力されたデータ（空は `_`）で、`defaultDataValue` と異なるときにクエリに含まれる。`encodeDataParamValue`/`decodeDataParamValue` でエスケープ処理。
2. `v` … 表示系トグル `toggleCursor`/`toggleGuide`/`toggleGrid`/`toggleEmpty`/`toggleColor`/`toggleDebugValues`/`stepMode`/`stepSkipFunctions` を並べたフラグ文字列。`defaultFlagString` に一致するならクエリから省略。
3. `g` … デバッグパネル表示。`applyDebugFromParam()` が `debugPanel` を開閉し、既定値と異なるときのみ `g=1`/`g=0` を出力。
4. `p` … `dataPatternPanel` の `open` 属性。真偽は `stringifyBool` によって生成される。初期状態は `false`。
5. `s` … ステップモード。`parseCombinedStepParam()` で `enabled`/`speed`/`skipFunctions` に分解。`buildCombinedStepParamValue()` はスキップOFFで `0`、ON で `speed+1`、かつスキップOFFで `+1000` を付与。
6. `h` … 履歴パネルの表示。`historyController.setHistoryVisibility()` を通じてコントロールし、`h=1/true` で表示、`h=0/false` で非表示。
7. `m` … サンプル表示。`applySampleParam()` で `.code-panel` に `show-samples` クラスをトグル。

補足: `applyUrlControlStates()` は `PARAM_KEYS` を使ってキー名を集中管理するため、更新の際はそちらも併せて調整する。

## D. 手動動作確認チェックリスト
- docs/contracts.md の差分以外にファイル変更がないことを確認
- 通常起動で UI が表示され、エラーが発生しないこと
- QR 生成／リセット／ステップ／トグル操作／履歴表示／URL 初期化が従来どおり動くこと
- 旧 API や legacy ファイルを参照する箇所が残っていないこと
