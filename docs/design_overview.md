# QRコード作成アプリ 簡易設計書

## 1. 概要
- このアプリはブラウザ上で完結するQRコード作成の教材として、入力文字列→QR描画までを一貫して扱います。
- 25×25の固定サイズと限定的な描画順序で進めることで、学習者が全体の流れを追いやすい簡易構造になっています。
- シンプルなHTML+JavaScript構成で、外部ビルドやモジュールバンドルを使わずに動作する点も教材向けです。

## 2. 全体構成
- `domain/` では基礎的なボード、カーソル、セル操作を公開し、`core/` は描画ロジックと実行制御、`ui/` は表示・トグル制御、`state/` はURL/history連携、`app/` はユーザー操作から各処理への仲介を担っています。
- import/exportを使わず、`index.html` からの `<script>` 直読みを採用しているのは、ブラウザで順序制御を明示的に可視化し、学習者が依存関係を把握しやすくするためです。
- `core/executionControl.js` と `core/executionCoordinatorService.js` を軸に、`runToken/runId` で同時実行・中断を制御しつつ、ステップ実行も同一口径で扱う方針が貫かれています。

## 3. 実行制御の設計
- `executionControl` は `runToken/runId` を参照しながら `shouldAbort` で中断判定を行い、`updateCursorSafe` でカーソル更新もガードします。ステップ機能に関する判定・遅延処理もここで再利用されます。
- `executionCoordinatorService` は描画処理の起動手順やマスク/データ描画の呼び出しを統括し、`executionControl` と上下で連携します。
- 途中停止やリセットで `runId` をインクリメントすることで、描画処理内の非同期ループが安全に中断される設計です。

## 4. 機能パターン描画（core/patterns）
- `core/patterns/` 以下は各パターン（Finder/Timing/Alignment/Dark/Format）の本体ロジックを集約し、元の `legacyFunctionalPatterns` はこれらを呼び出す薄いラッパーになっています。
- `functionalPatterns`（legacy側）はパターン描画のオーケストレーションを担当し、一貫したオプション解決と実行順（Finder→Timing→Alignment→Dark→Format）を提供します。

### 4.1 Finder Pattern
- 担当責務：3か所のFinderブロックの描画と、ステップ時の1セルずつ描画ループ。
- 入力／副作用：`ctx/runToken/functional options` を受け取り、盤面セルとカーソルを更新しながら描画します。
- 非対象：マスクやデータ部、UI・URL・履歴操作は含みません。
- 固定前提：特定の7×7ブロック位置をそのまま描き、サイズ変更には依存している点に留意します。

### 4.2 Timing Pattern
- 担当責務：水平・垂直のTimingライン（列・行）を引き、ステップ/非ステップで描画経路を制御します。
- 入力／副作用：`direction/index` などのパラメータと `ctx helpers` を受け、対応するタイミングビットを書き込むとともにステップ時にカーソルを更新します。
- 非対象：Finder以外のパターン、マスクやUI、URL処理は含まれません。
- 固定前提：25×25ボード上で行/列の位置は固定しており、サイズ変更を想定していません。

### 4.3 Alignment Pattern
- 固定座標 (19,19) の前提：カーソルをこの座標に合わせてから5×5パターンを描きます。
- 理由：QRの右下コーナー近傍に置かれるAlignmentパターンという仕様を教材向けに固定したものです。
- 将来の汎化方向：実運用では `ctx` から動的に中心座標を計算する仕組みに差し替えることが考えられます。

### 4.4 Dark Module Pattern
- 固定座標 (18,9) の意味：QR仕様でタイミングパターン内かつ左上から7列目にある暗モジュールを反映しています。
- 根拠：Dark Module は配置が決まっているため、現状の実装は `updateCursor(18,9,DIR_RIGHT)` でその位置に移動して置きます。
- 教材上の補足：25×25固定を前提にしているので、版を変更すると位置が合わなくなります。

### 4.5 Format Pattern
- フォーマット情報は上下それぞれ15セルずつのラインに並んでおり、この `coordsA/coordsB` リストがその軌道を定義しています。
- 15セル×2ラインという前提はQR仕様に基づくものですが、現状はコード内にハードコードされているため、将来的には `ctx.FORMAT_COORDS` などから導出する方向での汎化が想定されています。

## 5. データ処理の流れ（概要）
- ユーザーからの入力文字列は `core/dataEncodingService` などでビット系列に変換されます。
- `core/basePatternService` → `legacyFunctionalPatterns` → `core/patterns/*` という流れで機能パターンを描画し、盤面の枠組みを整えます。
- 機能パターンの後に `core/dataPlacementService` がデータ部を埋め、`app/qrLegacyDrawers` のマスク処理が続きます。
- 詳細なアルゴリズムや最適化は教材用に分離し、ここでは「順番」を追うことを重視します。

## 6. UI・URL連携の考え方
- UI操作は `app/main.js` 経由で `ui/` の制御関数（トグル/ステップ/デバッグ）に伝わり、`state/` モジュールがURLや履歴と同期します。
- `state/urlState.js` は `buildStateUrl`/`apply*FromParam` 系でクエリを組み立て、URLを再読み込みした際に同じ状態を復元します。
- debug関連のUIは `ui/debug.js`（旧debugView/debugSync）にまとまり、UIトグルと同期しながら状態を見せつつも描画ロジックには影響しない構成です。

## 7. 教材としての設計意図
- サイズと座標を固定することで、学習者が描画位置やループの流れを追いやすくしています。
- 一部をハードコードしているのは、QR仕様の複雑さよりも「描画順とコントロール」を理解することを優先しているためです。
- 追うべき順序は `core/patterns/*` → `core/executionControl.js` → `app/main.js` → `app/bootstrap.js` のように機能単位で辿ると、全体像がつかみやすくなります。

## 8. 今後の拡張ポイント（設計上の余地）
- QRバージョンやサイズをパラメータ化し、`ctx` や `domain/qrParams` から座標を計算するようにすれば汎化できます。
- 現在のスクリプト直読み構成をES Modulesに移行することでテスト性と依存性の明示性が高まりますが、その際は読み込み順と `window.__deferredWindowApi` の再設計が必要です。
- `core/patterns` の機能をさらに細分化することで、各パターンの再利用性と教材内での説明の粒度をあげられます。
