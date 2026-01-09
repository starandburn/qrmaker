# QRコード作成アプリ 簡易設計書

## 1. 概要
- ブラウザ上で入力から QR 描画までを完結させる教材アプリで、固定サイズの 25×25 ボードを前提にしています。
- 実装は HTML+CSS+JavaScript の構成で、外部バンドルやビルドを使わず `<script>` の直読みで依存を見える化しています。
- 学習者がロジックを追いやすいよう、描画手順を順に追うこととデバッグ表示の可視化に重きを置いています。

## 2. 全体構成
- `domain/` はカーソル･盤面･QR パラメータなど低レベルのデータ/ヘルパを公開し、`core/` は描画と実行制御、`ui/` は表示制御、`state/` は URL/履歴連携、`app/` はユーザー操作から各処理の起点を仲介します。
- script の直読み方式（import/export を使わない）は、ブラウザ上で依存と実行順を視覚的に追える教材性を優先した設計です。
- `core/execution-control.js` と `core/execution-coordinator-service.js` を中心に、`runToken/runId` を使って同時実行/中断を管理しつつステップ実行も同じ仕組みで扱う方針です。

## 3. 実行制御の設計
- `executionControl` は `shouldAbort` により `runToken/runId` の一致を確認し、中断後のカーソル更新を `updateCursorSafe` でガードします。
- `executionCoordinatorService` は描画処理とマスク実行の呼び出しをまとめ、全体の実行順序を監視して `runId` を増やすことで途中停止にも壊れない構造を維持します。
- ステップ実行では `stepMode`/`stepSpeed`/`stepSkipFunctions` を共通の判定ロジックで扱い、`shouldStepFunctions` などを通じて描画ごとの待機や速さを制御します。

## 4. 機能パターン描画（core/patterns）
- 新設した `core/patterns/` 以下で Finder/Timing/Alignment/Dark/Format のそれぞれの描画を切り出し、`core/base-pattern-service.js` や `app/legacy/functionalPatterns.js` から共通的に呼ぶ構成です。
- `core/patterns/functionalPatterns.js` がオーケストレーションを担い、Finder→Timing→Alignment→Dark→Format の順で呼び出します。

### 4.1 Finder Pattern
- 担当: Finder モジュールの装飾とステップ時の 1 セルずつの描画ループ。
- 入力: `ctx`, `runToken`, `functionalOptions` など。副作用: 盤面セルとカーソルの更新。
- 非対象: データ配置/マスク適用/UI/URL/履歴の操作。
- 固定前提: 25×25 盤面上の決まった Finder 軸を描くため、サイズやバージョンが変わると位置がずれる可能性があります。

### 4.2 Timing Pattern
- 担当: 水平および垂直の Timing ライン（行・列）を描き、タイミングビットの配置とステップ時のカーソル更新を担います。
- 入力: `direction`/`index` などのパラメータと `ctx` ヘルパ。
- 非対象: Finder 以外のパターンや UI/URL 操作。
- 固定前提: 25×25 ボード上で Timing ラインの位置が固定されており、サイズ変更を想定していません。

### 4.3 Alignment Pattern
- 固定座標 (19,19) を前提とし、ここから 5×5 の Alignment パターンを描画する構成です。
- QR の右下コーナ近傍に置かれるパターンを教材用途に単純化したもので、実務では `ctx` やバージョンから動的に位置を計算することが考えられます。

### 4.4 Dark Module Pattern
- 固定座標 (18,9) は QR 仕様上の位置で、タイミングパターンが隣接する暗モジュールです。
- `executionControl.updateCursorSafe` を使って位置を移動し、描画中の中断やステップにも対応します。
- この位置は 25×25 固定を前提としているため、バージョン/サイズが変わると調整が必要になります。

### 4.5 Format Pattern
- フォーマット情報は上 15 セル×2 ラインに並んでおり、`coordsA`/`coordsB` で座標を管理します。
- 規定の 15 セル×2 ラインという前提に則ってハードコードされているため、汎化するなら `ctx` から座標値を導く方向の拡張が想定されます。

## 5. データ処理の流れ（概要）
- 入力文字列は `core/data-encoding-service.js` などでビット系列に変換されます。
- `core/base-pattern-service.js` → `app/legacy/functionalPatterns.js` → `core/patterns/*` という流れで機能パターンを描画し、盤面の枠組みを整えます。
- 機能パターンの後に `core/data-placement-service.js` がデータ部を割り込ませ、`app/main.js` の `applyMask` 経由でマスク処理が続きます。
- 詳細なアルゴリズムは抑え、処理の順序や制御フローを追うことを学習上の重点にしています。

## 6. UI・URL連携の考え方
- UI 操作は `app/main.js` を経由して `ui/` の関数群に伝播し、`state/` モジュールが URL と履歴を同期させます。
- `state/url-state.js` の `buildStateUrl`/`apply*FromParam` 系でクエリを組み直し、読み込むと同じ状態を復元できるようになっています。
- デバッグ UI は `ui/debug.js` に統合され、ビューのトグル状態と同期しながらも描画ロジックに影響を与えないよう分離されています。

## 7. 教材としての設計意図
- サイズと座標を固定し、描画位置や順序を追いやすくすることで、学習者が QR 描画の流れを把握しやすくしています。
- 一部をハードコードする理由は QR 仕様の複雑さよりも「描画手順と制御ロジックの理解」を優先するためです。
- 読む順番の目安は `core/patterns/*` → `core/execution-control.js` → `app/main.js` → `app/bootstrap.js` で、機能単位ごとの動きと全体調整を順に追える構成です。

## 8. 今後の拡張ポイント（設計上の余地）
- QR バージョンやボードサイズをパラメータ化し、`domain/qr-params.js` から座標を計算する方向で汎化できます。
- 現在の script 直読み構成を ES Modules 化して依存を明示化することで、`window.__deferredWindowApi` の再設計が求められます。
- `core/patterns/*` をさらに小粒化することで、各パターンの再利用性と教材上の説明粒度を向上できます。
