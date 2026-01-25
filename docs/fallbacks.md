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
- **Compat-Guard / ui/debug.js:198-206**
  - 内容: `window.debugUI` を警告付きで再定義し、`window.layoutUI` があれば `applyDebugVisibility` を追加する流れ。`debugUI`/`layoutUI` は optional として扱う。
  - 存在理由: デバッグ UI は任意の拡張なので、存在すれば hook を追加し、同じファイルの複数ロード時は warn を出して重複を検知する。
  - 削除難易度: Mid
  - 削除手順案: デバッグ UI を不要なビルドでは `ui/debug.js` を読み込まず、`runMainApp` に引数で `debugUI`/`layoutUI` を渡す構造にする。
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
- 現在、優先度の高い候補はありません。

## 5. ルール（削除手順テンプレ）
1. 全体検索で参照を洗う  
2. 参照を正式ルート（モジュール内 import）に統一する  
3. 参照0 を確認する  
4. 互換枝（`window.X || {}` や `global.X` など）を削除する  
5. 再検索で0 を確認する  
6. 動作確認（最低限、影響範囲の UI/URL 操作を手動でチェック）
