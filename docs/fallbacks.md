# Fallbacks Inventory

## 1. 目的と方針
- 本資料はフォールバック／互換性層を機械的に洗い出し、「参照があれば残し、参照ゼロなら削除」の作業につなぐための台帳です。
- 直近の URL 状態整備と同様に、コード自体に手を入れる前に事実を記録し、削除の対象と削除手順を明示します。
- 互換項目に keep/done/candidate/investigate のステータスを付け、「何を残し、どこを次に消すか」を今後の作業で共通認識とします。

## 2. 棚卸しカテゴリ定義
- **Fallback-Value**: `??` や `||` でデフォルト文字列・オブジェクトをセットする定義。たとえば `const foo = bar || {};` のように「値がなければこれを使う」振る舞い。
- **Fallback-Global**: `window.X || {}` や `Object.assign(global.X || {}, …)` で、外部から上書きできるように安全に公開するグローバルオブジェクト。
- **Compat-Alias**: 旧名→新名、複数キー併存、あるいは `window.newName = window.oldName || window.newName` というような互換エイリアス（現時点では該当コードが見つかっていません）。
- **Compat-Guard**: `if(global.createX) return;` や `typeof window.foo === "function"` で二重ロードや未定義の分岐を防ぎ、互換呼び出しを維持している箇所。
- **Unused**: VSCode でグレーアウトされたエクスポートや `rg` で参照0 が確認できる定義。削除候補として動作に影響が少ない前提で扱います。

## 3. ステータス分類ルール
- **keep**: 参照が残っていて、残す理由（外部互換／モジュール依存など）が明確な互換層。
- **done**: 互換実装そのものを削除済みで、ドキュメントや履歴にのみ記録しておく状態。
- **candidate**: 実装は残っていても参照が0件で、削除条件が満たされているため次の作業で取り除ける状態。
- **investigate**: 参照があるが「どの経路で使われているか」「削除しても影響が出ないか」が未確定なもの。調査・確認が必要。

## 4. 棚卸し結果（一覧）
### A) `Object.assign(global.X || {}, …)` による Compat-Guard
#### global.appState（Compat-Guard）
- 参照検索: `rg -n "global\.appState"`
- 現状: `state/app-state.js:47/58` で `global.appState` を `Object.assign` し、テストや依存注入が先に `appState` を定義していても衝突しないようにしている。
- 次アクション: keep（依存注入/モック対策として現状の公開を維持）。

#### global.qrBuildService（Compat-Guard）
- 参照検索: `rg -n "global\.qrBuildService"`
- 現状: `core/qr-build-service.js:147` で `global.qrBuildService` を `Object.assign`、重複読込を検知しながら描画 API を公開している。
- 次アクション: keep（重複読込検知と描画 API の共有が目的で継続公開）。

#### global.alignmentPattern（Compat-Guard）
- 参照検索: `rg -n "global\.alignmentPattern"`
- 現状: `core/patterns/alignment-pattern.js:173` で既存予約にマージし、外部スクリプトが `window.alignmentPattern` へハンドラを追加できる前提にしている。
- 次アクション: keep（外部やテストで常設登録があるため）。

#### global.qrVerifyService（Compat-Guard）
- 参照検索: `rg -n "global\.qrVerifyService"`
- 現状: `core/qr-verify-service.js:375` で `global.qrVerifyService` を `Object.assign`、重複読み込みを検知しつつ API を継続公開。
- 次アクション: keep（描画検証 API を安全に共有するため）。

#### global.darkModulePattern（Compat-Guard）
- 参照検索: `rg -n "global\.darkModulePattern"`
- 現状: `core/patterns/dark-module-pattern.js:92` で `global.darkModulePattern` を `Object.assign`、旧 API と共存してダークモジュールを公開。
- 次アクション: keep（同様に外部スクリプトでの参照可能性を担保）。

#### global.renderCycle（Compat-Guard）
- 参照検索: `rg -n "global\.renderCycle"`
- 現状: `core/render-cycle.js:46` で `global.renderCycle` を `Object.assign`、レンダリングサイクルを継続公開。
- 次アクション: keep（レンダル周期を外部から制御する可能性があるため）。

#### global.finderPattern（Compat-Guard）
- 参照検索: `rg -n "global\.finderPattern"`
- 現状: `core/patterns/finder-pattern.js:220` で `global.finderPattern` を `Object.assign` しており、他のパターンとの共存を図っている。
- 次アクション: keep（Finder パターンの互換 API を維持）。

#### global.requireUtils（Compat-Guard）
- 参照検索: `rg -n "global\.requireUtils"`
- 現状: `core/require.js:25` で `requireUtils` を既存グローバルとマージし、`core/patterns/timing-pattern.js` `core/patterns/format-pattern.js` `core/patterns/finder-pattern.js` `core/patterns/dark-module-pattern.js` `core/patterns/alignment-pattern.js` `io/script-parser.js` などが `global.requireUtils` を直接参照している。
- 次アクション: keep（全パターン・スクリプトパーサが共有ユーティリティを前提としている）。

#### global.formatPattern（Compat-Guard）
- 参照検索: `rg -n "global\.formatPattern"`
- 現状: `core/patterns/format-pattern.js:199` で `global.formatPattern` を `Object.assign` し、外部スクリプトからフォーマット処理を上書きできる構成。
- 次アクション: keep（教材での呼び出しを想定しつつ、引き続き公開）。

#### global.typeUtils（Compat-Guard）
- 参照検索: `rg -n "global\.typeUtils"`
- 現状: `app/utils/type-utils.js:35` で `global.typeUtils` を初期化し、`app/pattern-callers.js` `app/global-api.js` `app/board-reset.js` `core/base-pattern-service.js` `core/data-placement-service.js` `core/log-utils.js` `core/render-cycle.js` `core/patterns/timing-pattern.js` `core/patterns/dark-module-pattern.js` `core/patterns/pattern-common.js` `core/patterns/format-pattern.js` `io/script-parser.js` などが `typeUtils.callIfFunction` を通じてグローバルを参照。
- 次アクション: keep（`typeUtils` の存在を前提とするモジュールが多いため、依存注入で整理する準備が整うまでは公開する）。

#### global.timingPattern（Compat-Guard）
- 参照検索: `rg -n "global\.timingPattern"`
- 現状: `core/patterns/timing-pattern.js:162` で `global.timingPattern` を公開し、`app/pattern-callers.js:460,469` などが `window.timingPattern` を通じてタイミングセル情報へアクセス。
- 次アクション: keep（タイミングパターンを外部ロードから参照する前提を維持）。

### B) `window/global` 由来・フォールバック値
#### global.domainQrParams（Fallback-Global）
- 参照検索: `rg -n "domainQrParams"`
- 現状: `domain/qr-params.js:53` で `global.domainQrParams` を `Object.assign` し、`app/main.js:863-868` が `window.domainQrParams` を期待して `applyDataParam` などのハンドラを外部に公開。
- 次アクション: keep（依然として `window.domainQrParams` を通じて外部スクリプトを許容しているため）。

#### core/execution-control.js（Fallback-Value: window.typeUtils）
- 参照検索: `rg -n "window\.typeUtils"`
- 現状: `core/execution-control.js:3` で `window.typeUtils` を空オブジェクトで初期化し、`app/pattern-callers.js` `app/global-api.js` `app/board-reset.js` `core/base-pattern-service.js` `core/data-placement-service.js` `core/log-utils.js` `core/render-cycle.js` `core/patterns/timing-pattern.js` `core/patterns/dark-module-pattern.js` `core/patterns/pattern-common.js` `core/patterns/format-pattern.js` `io/script-parser.js` が `window.typeUtils` あるいは `typeUtils.callIfFunction` を前提に動作。
- 次アクション: keep（`typeUtils` グローバルを廃止するには依存モジュールをすべて依存注入に切り替える必要があるため）。

#### state/history-store.js（Fallback-Value: entry.value）
- 参照検索: `rg -n "entry\.value \?\?"`
- 現状: `state/history-store.js:85` の1箇所のみで `entry.value ?? ""` を使い、履歴エントリの `null`/`undefined` を文字列化してもクラッシュしないようにしている。
- 次アクション: keep（入力側を先に正規化しないと削除できない）。

### C) その他の互換層と Guard
#### ui/debug.js: `window.debugUI` エイリアス（Compat-Guard）
- 参照検索: `rg -n "window\.debugUI"`
- 現状: `ui/debug.js:207-210` で `window.debugUI` が `qrmakerDebug.ui` に同期されており、教材・古い外部スクリプトが `window.debugUI` を読んでも `qrmakerDebug` を通じて UI を操作できる（現ライン内ではこのファイルだけが参照）。
- 次アクション: keep（外部互換へ慎重な維持が必要）。

#### ui/debug.js: `window.layoutUI.applyDebugVisibility`（Compat-Guard → done）
- 参照検索: `rg -n "layoutUI\.applyDebugVisibility"`
- 現状: ソース側に該当文字列は存在せず，`qrmakerDebug.hooks.applyDebugVisibility` に一本化済み。
- 次アクション: done（エイリアスの削除と動作確認済みで、今後この互換は提供しない決定）。

#### app/commands.js（Compat-Guard: createCommands）
- 参照検索: `rg -n "global\.createCommands"`
- 現状: `app/commands.js:4-46` で `typeof global.createCommands === "function"` によるガードがあり、`app/global-api.js` が `window.createCommands` を参照してコマンド群を組み立てている。
- 次アクション: keep（複数ロードが同じコマンド定義を参照するためガードを維持）。

#### core/function-utils.js（Compat-Guard: callIfFunction）
- 参照検索: `rg -n "global\.callIfFunction"`
- 現状: `core/function-utils.js:4-11` と `app/utils/type-utils.js:37-38` で `global.callIfFunction` を定義・公開し、`typeUtils.callIfFunction` を `app/main.js` や多数の UI/パターンが利用している。
- 次アクション: keep（callIfFunction を依存注入ベースに切り替えるまでは公開を残す）。

#### core/data-encoding-service.js（Compat-Guard: dataEncodingService）※candidate
- 参照検索: `rg -n "dataEncodingService"`
- 現状: `core/data-encoding-service.js:22-25` で `global.dataEncodingService` が既に存在する例を警告しつつ `prepareDataBits` を公開。リポジトリ内に `dataEncodingService` へのアクセスはこのファイル以外に存在しない。
- 次アクション: candidate（`prepareDataBits` をモジュールとして明示的に import するようにし、グローバル公開＋警告を削除する時点を探る）。

#### core/data-placement-service.js（Compat-Guard: dataPlacementService）※candidate
- 参照検索: `rg -n "dataPlacementService"`
- 現状: `core/data-placement-service.js:137-140` でグローバルを guard して `placeDataBits` を単一エクスポート。ほかに `global.dataPlacementService` を使うコードはない。
- 次アクション: candidate（`placeDataBits` を内部共有に切り替えたタイミングで guard を消す）。

#### core/base-pattern-service.js（Compat-Guard: basePatternService）※candidate
- 参照検索: `rg -n "basePatternService"`
- 現状: `core/base-pattern-service.js:55-58` で `global.basePatternService` を guard し、`drawBasePatternsService` を公開。リポジトリ内に `global.basePatternService` を読んでいる箇所はない。
- 次アクション: candidate（ローカル共有へ移行したら guard を削除）。

#### core/execution-coordinator-service.js（Removed）
- 参照検索: `rg -n "executionCoordinatorService"`
- 現状: ドキュメント以外に `executionCoordinatorService` を参照するソースはなく、`runWithCoordinator` はこのファイル内だけで使われている。
- 次アクション: done（グローバル公開を撤去済み。再公開するなら新しい依存ルートを明示する）。

## 5. 優先度付きTODO（削除候補・調査）
1. candidate: `core/data-encoding-service.js`
   - 参照検索: `rg -n "dataEncodingService"`（結果は該当ファイル内のみ）
   - 削除ステップ: `prepareDataBits` を必要な依存先が `import { prepareDataBits }` する形に変え、警告 + `global.dataEncodingService` の書き込みを除去。
2. candidate: `core/data-placement-service.js`
   - 参照検索: `rg -n "dataPlacementService"`
   - 削除ステップ: `placeDataBits` をモジュール内共有に統一し、`global` への書き込みと警告を廃止。
3. candidate: `core/base-pattern-service.js`
   - 参照検索: `rg -n "basePatternService"`
   - 削除ステップ: `drawBasePatternsService` をローカルで再利用し、`global.basePatternService` 欄と警告を削除。
4. investigate: `window.debugUI`
   - 参照検索: `rg -n "window\.debugUI"`
   - 見に行くファイル: `ui/debug.js`（207-210 行）で alias を維持しているため、外部が `window.debugUI` を参照していないか確認してから削除を判断。

## 6. ルール（削除手順テンプレ）
1. 全体検索で参照を洗う
2. 参照を正式ルート（モジュール内 import）に統一する
3. 参照0 を確認する
4. 互換枝（`window.X || {}` や `global.X` など）を削除する
5. 再検索で0 を確認する
6. 動作確認（最低限、影響範囲の UI/URL 操作を手動でチェック）

## 7. Debug API: window.qrmakerDebug
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
  - `ui/debug.js`: `ui`（`debugUI`）と `hooks`（`applyDebugVisibility`）を登録し、`window.debugUI` の互換エイリアスを維持しつつ `window.layoutUI.applyDebugVisibility` は廃止し `qrmakerDebug.hooks.applyDebugVisibility` に一本化している。
  - `app/bootstrap.js`: `runMainApp` の依存として `layoutUI`/`urlState`/`debugUI`/`settings` を渡し、`qrmakerDebug` 経由のデバッグ入口をアプリ本体に供給する。
  - **互換エイリアス**:
    - `window.debugUI` は常に `window.qrmakerDebug.ui` を参照し、従来コードと互換性を保つ。
    - `window.layoutUI.applyDebugVisibility` は廃止され、`qrmakerDebug.hooks.applyDebugVisibility` を直接呼ぶ形に一本化されている。
- **運用ルール**:
  - 新しいデバッグ機能は `qrmakerDebug` 配下に追加し、直接 `window.*` に公開しない。
  - 互換層（`window.debugUI`）を残す場合は本ドキュメントで「残す理由」と「削除条件」を明記する（`window.layoutUI` 側の互換は削除済）。
  - `qrmakerDebug` を介さない `window.layoutUI`（互換は削除済）や `window.debugUI` への直接依存は極力避け、hooks 経由で参照する。
