# 実行状態とステータスメッセージの状態遷移

```mermaid
stateDiagram-v2
  [*] --> 起動判定

  state "error" as エラー_実行前
  state "stopped<br/>表示: 停止中：実行できます。<br/>(clearStopReason=true)" as 停止_実行可
  state "stopped<br/>表示: 停止中：実行できるプログラムがありません。" as 停止_実行不可
  state "running" as 実行中
  state "running<br/>detail(l2/l3)更新中" as 実行中_詳細更新
  state "finished" as 完了
  state "warning" as 警告
  state "error" as エラー
  state "stopped<br/>表示: 停止中：〜が変更されたので停止しました。" as 停止_理由付き
  state "stopped<br/>表示更新なし<br/>(clearStopReason=true, suppressUpdate=true)" as 停止_内部クリア

  起動判定 --> 停止_実行可: コードあり
  起動判定 --> 停止_実行不可: コード空
  起動判定 --> エラー_実行前: 実行前入力検証NG\n(normalizeInputBeforeRun)

  停止_実行可 --> 実行中: 実行開始(runGuardedExecution)
  停止_実行不可 --> 停止_実行可: コード入力あり\n(stopped + clearStopReason=true)
  停止_実行可 --> 停止_実行不可: コードが空になる\n(stopped + 実行不可メッセージ)
  停止_実行可 --> 実行中: applyMask開始(runGuardedExecution kind=applyMask)
  実行中 --> 停止_実行可: applyMask終了(statusDone=stopped)

  実行中 --> 完了: 検証OK
  実行中 --> 警告: 検証不一致/注意
  実行中 --> エラー: 例外/不正入力
  実行中 --> 停止_実行可: 実行終了(finally)\nstatusDone=stopped
  実行中 --> 実行中_詳細更新: ステップ実行の進行表示更新\n(updateDataPatternStatus / showApiStatus)
  実行中_詳細更新 --> 実行中: 同一run内でdetail更新継続
  実行中 --> 停止_実行可: 実行失敗かつlastErrorなし\n(stopped detailなし)

  停止_実行可 --> 停止_実行可: 停止中に入力変更\n(理由付き停止は発火しない)
  停止_実行不可 --> 停止_実行不可: 停止中に入力変更(空のまま)

  実行中 --> 停止_理由付き: データ/コード変更時停止\n(stopCurrentRun reason, lockStopReason=true)
  停止_理由付き --> 停止_内部クリア: clear停止処理\n(表示更新なし)
  停止_内部クリア --> 停止_実行可: 次回 stopped(clearStopReason=true)
  停止_理由付き --> 停止_実行可: コードありで状態更新\n(clearStopReason=true)
  停止_理由付き --> 停止_実行不可: コード空で状態更新
```

## 補足

- `stopped` は `detail` なしなら「実行できます」、`detail` ありならその理由文言を表示します。
- `clearStopReason=true` を渡さないと、直前の停止理由が残って再表示されます。
- `normalizeInputBeforeRun()` で不正入力（例: 非ASCIIなど）が検出された場合は、`running` に入る前に `error` へ遷移します。
- `applyMask` は `runGuardedExecution` を通るため、`running -> stopped` の遷移を単独で持ちます。
- `running` 中はステップ進行に応じて `detail(l2/l3)` が更新されます（状態キーは `running` のまま）。
- `clearStopReason + suppressUpdate` は内部状態クリア用で、表示文言を更新しない遷移です。
