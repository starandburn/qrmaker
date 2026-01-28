# 1. 目的
- 実行フローの入口を runGuardedExecution 経由で一本化し、停止・リセット・例外時も安全に戻る
- 後方互換を段階的に減らすためのルールを共有し、改修の判断材料とする

# 2. 主要コンポーネントと責務
## app/main.js
- アプリ全体のオーケストレーション（依存注入・UI 配線）
- 実行入口のガード runGuardedExecution を定義し、入口制御を一元化
- EXEC_STATUS と setExecutionStatus で実行状態表示を統制

## ui/ui-state.js
- createUiState が UI 状態の唯一の生成入口
- stopAllRuns / invalidateRun / invalidateMaskRun / setStepFillRunning で実行制御トークンを更新
- 入力ロックトークン（set/clear/has）を管理し、他は直書き禁止

## app/board-reset.js
- 盤面リセット処理のみを担当
- 実行中断トークンは ctx（uiState API）経由で操作し、直書きはしない

## app/user-code-runner.js
- ユーザーコード実行（step 実行の本体）を担当
- runId / isStepFillRunning の更新は ctx を介して行い、直書き禁止

## app/pattern-callers.js
- 引数を正規化し、modern / legacy / invalid の分類だけを返す
- 曖昧な入力は救済せず invalid 扱いで warning を発し、中断

# 3. 実行入口のルール
- mask 実行も step 実行も必ず runGuardedExecution を通す
- runGuardedExecution はロックを取得した側のみが finally で解除する
- ロック中（hasLock=true）の場合は状態表示を上書きしない

# 4. 実行状態（setExecutionStatus）のルール
- 状態文字列は main.js の EXEC_STATUS に集約
- 実行開始で RUNNING、終了（例外含む）で STOPPED を基本とする
- step 実行だけ例外扱いにせず、RUNNING→STOPPED をガードに任せる

# 5. 実行制御トークン（runId / maskRunId / isStepFillRunning）
- runId: 実行世代、古い処理の無効化トークン
- maskRunId: mask 実行世代、キャンセル／無効化トークン
- isStepFillRunning: step 実行中フラグ
- これらは uiState API 経由でのみ更新し、直書き禁止

# 6. 後方互換（legacy）のルール
- pattern-callers は modern / legacy / invalid を明確に返す
- object 1 個のみが旧仕様に明確一致する場合のみ legacy 扱い
- object と他トークン混在や function トークン等は invalid として warning を出し中断

# 7. 変更時のチェックリスト
- 実行入口が runGuardedExecution を通っているか確認
- runId/maskRunId/isStepFillRunning を直書きしていないか確認
- setExecutionStatus の開始／終了が RUNNING→STOPPED で揃っているか確認
- pattern-callers の modern/legacy/invalid 分類が崩れていないか確認
- 新たな window.* 互換を追加していないか（原則 qrmakerDebug 配下とする）
