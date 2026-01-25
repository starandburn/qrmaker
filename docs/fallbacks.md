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
- **Fallback-Value / core/execution-control.js:3**
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
- **Fallback-Global / ui/debug.js:198-201**
  - 内容: `window.debugUI = Object.assign({}, window.debugUI || {}, debugUI); window.layoutUI = Object.assign({}, existingLayoutUI, {...});`
  - 存在理由: デバッグ UI をオプションで上書きしたり、レイアウト UI にデバッグ分岐を混ぜたりするフック。
  - 削除難易度: Mid/High（デバッグ UI の拡張性を狭めないように慎重に進める必要）。
  - 削除手順案: `window.debugUI` を常駐オブジェクトから明示的な引数に切り替え、`layoutUI` へのマージも同時に整理。
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
- **Unused / domain/util.js:11-13**
  - 内容: `global.domainUtil = Object.assign(global.domainUtil || {}, { randomInt });`
  - 存在理由: このスコープから `domainUtil` を参照している箇所が `rg` で見つからず、旧ドキュメントにも `domainUtil` の記述のみ。
  - 削除難易度: Low
  - 削除手順案: `rg domainUtil` → 参照なしを確認 → ドキュメントからも削除。
- **Unused / core/data-encoding-service.js:22-24**
  - 内容: `global.dataEncodingService = Object.assign(global.dataEncodingService || {}, { prepareDataBits });`
  - 存在理由: これも同様に定義しかなく、参照なし。今は内部でしか使われていない処理を旧 API として公開している状態。
  - 削除難易度: Low
  - 削除手順案: `rg dataEncodingService` で0件確認 → モジュール内に閉じて `global` 参照なしへ。
- **Unused / core/data-placement-service.js:137-139**
  - 内容: `global.dataPlacementService = Object.assign(global.dataPlacementService || {}, { ensureBaseData });`
  - 存在理由: 参照なし。`dataPlacementService` の API は docs にも記載無し。
  - 削除難易度: Low
  - 削除手順案: テストで `global` に依存するコードがないことを確認しつつ `Object.assign` を削除。
- **Unused / core/base-pattern-service.js:55-57**
  - 内容: `global.basePatternService = Object.assign(global.basePatternService || {}, { buildPattern });`
  - 存在理由: 基本パターンを描画するローカルモジュールからしか呼ばれておらず、グローバル公開の根拠がない。
  - 削除難易度: Low
  - 削除手順案: 同様に `rg basePatternService` を実行して参照0 を確認 → module 内部で関数を共有。
- **Unused / core/execution-coordinator-service.js:40-42**
  - 内容: `global.executionCoordinatorService = Object.assign(global.executionCoordinatorService || {}, { coordinateExecution });`
  - 存在理由: docs に説明はあるがコード内に参照が見つからないため、不要な公開。
  - 削除難易度: Low
  - 削除手順案: 依存先を調査し、内部 API に移行するか完全削除。

## 4. 優先度付きTODO（次の削除候補）
1. `domain/util.js` の `global.domainUtil` 公開（Low）：`rg domainUtil` で再確認してから `Object.assign` を削除し、`randomInt` を直接モジュールで `export` あるいは内包。
2. `core/data-encoding-service.js` `dataEncodingService`（Low）：外部参照0 なので `global` マージをやめ、必要なら module 内で `prepareDataBits` を共有。
3. `core/data-placement-service.js` `dataPlacementService`（Low）：同様に `global` 依存を排除して内部 API に収束。
4. `core/base-pattern-service.js` `basePatternService`（Low）：描画モジュールだけで使うため `global` への公開を取っ払う。
5. `core/execution-coordinator-service.js` `executionCoordinatorService`（Low）：ドキュメントだけの存在なので実体のない公開を削除する。
6. `ui/debug.js` の `window.debugUI` / `window.layoutUI` マージ（Mid）：デバッグ UI が不要なビルドでは完全に省略できるよう名前空間を整理。

## 5. ルール（削除手順テンプレ）
1. 全体検索で参照を洗う  
2. 参照を正式ルート（モジュール内 import）に統一する  
3. 参照0 を確認する  
4. 互換枝（`window.X || {}` や `global.X` など）を削除する  
5. 再検索で0 を確認する  
6. 動作確認（最低限、影響範囲の UI/URL 操作を手動でチェック）
