# Fallbacks Inventory

## 1. 目的と方針
- 本資料はフォールバック／互換性層を機械的に洗い出し、「参照があれば残し、参照ゼロなら削除」の作業につなぐための台帳です。
- 直近の URL 状態整備と同様に、コード自体に手を入れる前に事実を記録し、削除の対象と削除手順を明示します。

## 2. 棚卸しカテゴリ定義
- **Fallback-Value**: `??` や `||` でデフォルト文字列・オブジェクトをセットする定義。たとえば `const foo = bar || {};` のように「値がなければこれを使う」振る舞い。
- **Fallback-Global**: `window.X || {}` や `Object.assign(global.X || {}, …)` で、外部から上書きできるように安全に公開するグローバルオブジェクト。
- **Compat-Alias**: 旧名→新名、複数キー併存、あるいは `window.newName = window.oldName || window.newName` というような互換エイリアス（現時点では該当コードが見つかっていません）。
- **Compat-Guard**: `if(global.createX) return;` や `typeof window.foo === "function"` で二重ロードや未定義の分岐を防ぎ、互換呼び出しを維持している箇所。
- **Unused**: VSCode でグレーアウトされたエクスポートや `rg` で参照0 が確認できる定義。削除候補として動作に影響が少ない前提で扱います。

## 3. 棚卸し結果（一覧）
### A) `Object.assign(global.X || {}, …)`
- `state/app-state.js:47` (Compat-Guard): `const appState = Object.assign(global.appState || {}, { … });` で外部から先行して `appState` を定義しているケースと競合しないようにしている（依存注入/モック対策）。
- `domain/qr-params.js:53` (Compat-Guard): `global.domainQrParams = Object.assign(global.domainQrParams || {}, { … });` は外部からハンドラを追加できるようしている既存公開。
- `core/qr-build-service.js:147` (Compat-Guard): `global.qrBuildService = Object.assign(global.qrBuildService || {}, { … });` で重複読込を検知しつつ描画 API を公開。
- `core/patterns/alignment-pattern.js:173` (Compat-Guard): `global.alignmentPattern` を既存予約と統合するために `Object.assign` している。
- `core/qr-verify-service.js:375` (Compat-Guard): 同様に `global.qrVerifyService` を `Object.assign` して安全に初期化。
- `core/patterns/dark-module-pattern.js:92` (Compat-Guard): `global.darkModulePattern` も同じく互換の公開層。
- `core/render-cycle.js:46` (Compat-Guard): `global.renderCycle` を `Object.assign` で継続公開。
- `core/patterns/finder-pattern.js:220` (Compat-Guard): `global.finderPattern` も同様。
- `core/require.js:25` (Compat-Guard): `global.requireUtils = Object.assign(global.requireUtils || {}, requireUtils);` は既存グローバルとマージ。
- `core/patterns/format-pattern.js:199` (Compat-Guard): `global.formatPattern` の重複読み込みガード。
- `app/utils/type-utils.js:29` (Compat-Guard): `global.typeUtils = Object.assign(global.typeUtils || {}, typeUtils);` で `callIfFunction` 等を既存グローバルへマージ。
- `core/patterns/timing-pattern.js:162` (Compat-Guard): `global.timingPattern` にも同様の処理。
  - 共通分類: 全体が Compat-Guard（既存 API との共存を前提にしているため削除不可）。Remove候補はなし。

### B) `window/global.X || {}`
- `core/execution-control.js:3` (Compat-Guard): `const typeUtils = window.typeUtils || {};` は `window.typeUtils` が先行公開される前提ながら空オブジェクトで安全に立ち上げ、継続的に利用するパターン。
  - 共通分類: Compat-Guard。Remove候補なし（`typeUtils` が常設でグローバルになることを前提としている）。

- **Fallback-Value / core/execution-control.js:3** (see Section 3.B)
  - 内容: `const typeUtils = window.typeUtils || {};`
  - 存在理由: サイト読み込み順によって `window.typeUtils` が先に存在しない場合に備えている（他モジュールでも `callIfFunction` を定義しているため、重複公開の安全弁）。
  - 削除難易度: Mid（先行モジュールが常に `typeUtils` を提供する前提が固まれば簡略化可能）。
  - 削除手順案: `rg typeUtils` で参照を確認後、`window.typeUtils` が常時セットされているビルドのみを想定した版を用意し、`typeUtils` をサービスに依存させる。
- **Fallback-Value / state/history-store.js:85**
  - 内容: `const valueText = entry.value ?? "";`
  - 存在理由: 履歴エントリの各フィールドに `null` や `undefined` が混ざったときに文字列化で例外を防ぐため。
  - 削除難易度: Low（`historyStore` のデータ構造が常に文字列を返すように統一すれば不要）。
  - 削除手順案: 入力元を正規化→`entry.value` を必ず空文字列で初期化→`?? ""` を削除。
- **Fallback-Global / domain/qr-params.js:53**
  - 内容: `global.domainQrParams = Object.assign(global.domainQrParams || {}, { ... });`
  - 存在理由: `app/main.js` から `window.domainQrParams` を期待して有効化済み。外部スクリプトでも `applyDataParam` などのハンドラを拡張可能。
  - 削除難易度: Mid（`app/main.js` 側の依存が明確なため即削除は不可だが、将来的には dependency injection への置き換えを検討）。
  - 削除手順案: `applyDataParam` を main 内部関数に統合し、`window.domainQrParams` の参照を消去→上書きハンドル捨てる。
- **Compat-Guard / ui/debug.js:198-214**
  - 内容: `window.qrmakerDebug` に `ui`/`hooks` を集約し、`window.debugUI` への参照と `qrmakerDebug.hooks.applyDebugVisibility` による出口を提供する。`window.layoutUI.applyDebugVisibility` の互換エイリアスは削除済み。
  - 存在理由: 教材用途でデバッグ機能を常設するが、入口は1本化して混乱を減らしたいため。
  - 現状: `window.layoutUI.applyDebugVisibility` の互換実装は `ui/debug.js` から取り除かれており、`rg -n "layoutUI\\.applyDebugVisibility"` の結果には現れず、参照側コードも存在していない。
  - 互換維持理由: 現在は互換の提供を終了しており、以後は `qrmakerDebug.hooks.applyDebugVisibility` を唯一の出口として使っている。
  - 削除条件（現在は満たされている）:
    - `rg -n "layoutUI\\.applyDebugVisibility"` の結果が docs と `ui/debug.js` の互換ブロック以外に 0 件であること（この変更で確認済み）。
    - `window.layoutUI` を外部公開 API として使わない方針が社内で確定していること。
    - デバッグ可視性の出口が `qrmakerDebug.hooks.applyDebugVisibility` に一本化され、参照元がすべて hooks 経由でアクセスしていること。
  - 削除済み: `ui/debug.js` の `window.layoutUI.applyDebugVisibility` 委譲ブロックとこの互換記述を削除し、動作確認（デバッグ表示のオン/オフ）を行った（`window.debugUI` など他の互換は継続）。
- **Compat-Guard / app/commands.js:3-5**
  - 内容: `if(typeof global.createCommands === "function") return;`
  - 存在理由: 複数のスクリプトが依存する `createCommands` を再定義しないようガード。
  - 削除難易度: High（シングルトンであることを保証するための安全弁）。
  - 削除手順案: コードを ES Module に分割して `createCommands` を明示的に1箇所からインポート→ガード不要にする。
- **Compat-Guard / core/function-utils.js:2-28**
  - 内容: `if(typeof global.callIfFunction !== "function"){ ... global.callIfFunction = callIfFunction; }` など。
  - 存在理由: `callIfFunction` / `assignIfFunction` 等のユーティリティをグローバルに初期化し、再定義を避けることで `app/main.js` 側がこれらを安全に参照可能。
  - 削除難易度: Mid（新しいモジュールシステムで依存注入すれば不要）。
  - 削除手順案: 依存先すべてで `import`/`require` を使って関数を共有し、`global` への注入を撤廃した時点でガードを消す。
- **Compat-Alias / 全リポジトリ**
  - 内容: `old name → new name` 形式のエイリアスは現コードベースでは検出できず（`rg` で該当クラスター無し）。必要な場合は履歴に追加予定。
  - 存在理由: —
  - 削除難易度: —
  - 削除手順案: —
- **Compat-Guard / core/data-encoding-service.js:22-25**
  - 内容: 重複読み込み時は `console.warn("dataEncodingService is already defined; duplicate load detected");` を出しつつ、`global.dataEncodingService = { prepareDataBits };` で単一初期化。
  - 存在理由: 旧版のマージ式から移行し、後続ロードを検知しつつ `prepareDataBits` を1箇所だけ公開する仕組みに切り替えた。
  - 削除難易度: Low
  - 削除手順案: 警告が不要になったら `if(global.dataEncodingService)` と `console.warn` を削除し、`prepareDataBits` を内部モジュールに閉じる。
- **Compat-Guard / core/data-placement-service.js:137-140**
  - 内容: 重複読み込み時に `console.warn("dataPlacementService is already defined; duplicate load detected");` を出しつつ、`global.dataPlacementService = { placeDataBits };` で単一初期化。
  - 存在理由: 後続のロードを検知しながら `placeDataBits` を一箇所だけ公開する構成に移行済み。
  - 削除難易度: Low
  - 削除手順案: 警告が不要になったら `if(global.dataPlacementService)` と `console.warn` を削除し、`placeDataBits` を内部モジュールに閉じる。
- **Compat-Guard / core/base-pattern-service.js:55-58**
  - 内容: 重複読み込み時は `console.warn("basePatternService is already defined; duplicate load detected");` を出しつつ、`global.basePatternService = { drawBasePatternsService };` で単一初期化。
  - 存在理由: `drawBasePatternsService` を1箇所だけ公開する構成へ移行し、重複ロードを検知できるようにした。
  - 削除難易度: Low
  - 削除手順案: 警告が不要になったら `if(global.basePatternService)` まわりを削除し、ローカルで `drawBasePatternsService` を共有。
**Removed / core/execution-coordinator-service.js**
  - 内容: `executionCoordinatorService` のグローバル定義を削除し、今はこのファイル内部だけで `runWithCoordinator` を保持。
  - 存在理由: ドキュメント以外に参照がないため、unused となった global 公開を撤去。
  - 削除難易度: Low
  - 削除手順案: `runWithCoordinator` を外部提供したい場合、新しい依存ルートを明記して再度公開する。

## 4. 優先度付きTODO（次の削除候補）
1. `window.debugUI` / `window.layoutUI` 参照を `window.qrmakerDebug` に段階移行し、互換 alias ではなく container 経由で取得できるようにする。
2. `layoutUI.applyDebugVisibility` の注入を `window.qrmakerDebug.hooks.applyDebugVisibility` のみで行えるようにして、layout 初期化後でも再適用できる形にする（この項目は完了し、互換 alias は廃止済み）。

## 5. ルール（削除手順テンプレ）
1. 全体検索で参照を洗う  
2. 参照を正式ルート（モジュール内 import）に統一する  
3. 参照0 を確認する  
4. 互換枝（`window.X || {}` や `global.X` など）を削除する  
5. 再検索で0 を確認する  
6. 動作確認（最低限、影響範囲の UI/URL 操作を手動でチェック）

## Debug API: window.qrmakerDebug

- **目的**: 教材用途のデバッグ入口を `window` に常設しつつ、グローバルなデバッグ変数の増殖を抑えて一本化した API を提供する。
- **構造図**:
  ```
  window.qrmakerDebug
  ├─ ui
  │   └─ (debugUI: デバッグ UI の表示/トグル/ログ統制)
  ├─ hooks
  │   └─ applyDebugVisibility(...)
  ├─ flags
  │   └─ (例: suppressCursorUpdates などのフラグ)
  ├─ state
  │   └─ (デバッグ用スナップショットや一時データ収容)
  └─ log
      └─ (追加のログストリームやバッファ)
  ```
- **初期化責務**:
  - `app/debug-bootstrap.js`: `qrmakerDebug` の空箱を最速で構築し、各プロパティ領域の初期オブジェクトを準備する。
  - `ui/debug.js`: `ui`（`debugUI`）と `hooks`（`applyDebugVisibility`）を登録し、`window.debugUI` の互換エイリアスを維持しつつ `window.layoutUI.applyDebugVisibility` は廃止して `qrmakerDebug.hooks.applyDebugVisibility` に一本化している。
  - `app/bootstrap.js`: `runMainApp` の依存として `layoutUI`/`urlState`/`debugUI`/`settings` を渡し、`qrmakerDebug` 経由のデバッグ入口をアプリ本体に供給する。
  - **互換エイリアス**:
    - `window.debugUI` は常に `window.qrmakerDebug.ui` を参照し、従来コードと互換性を保つ。
    - `window.layoutUI.applyDebugVisibility` は廃止され、`qrmakerDebug.hooks.applyDebugVisibility` を直接呼ぶ形に一本化されている。
- **運用ルール**:
  - 新しいデバッグ機能は `qrmakerDebug` 配下に追加し、直接 `window.*` に公開しない。
  - 互換層（`window.debugUI`）を残す場合は本ドキュメントで「残す理由」と「削除条件」を明記する（`window.layoutUI` 側の互換は削除済）。
  - `qrmakerDebug` を介さない `window.layoutUI`（互換は削除済）や `window.debugUI` への直接依存は極力避け、hooks 経由で参照する。
