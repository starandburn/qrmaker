# URLパラメータ（クエリ）一覧

このアプリはURLクエリ（`?key=value`）で、表示状態・デバッグ・ステップ実行設定などを復元できます。

## 主要パラメータ

| キー | 型 | 概要 | 例 |
|---|---|---|---|
| `v` | string | 表示トグル一括フラグ（ビット列） | `?v=111000` |
| `g` | bool | デバッグ表示のON/OFF | `?g=1` |
| `p` | bool | パターンパネル開閉 | `?p=1` |
| `d` | string | 入力データ（空文字は `_` としてエンコード） | `?d=_` |
| `h` | bool | 履歴表示のON/OFF | `?h=1` |
| `m` | bool | サンプル表示のON/OFF | `?m=1` |
| `e` | number | ステップ速度（0〜120に丸め込み） | `?e=30` |
| `s` | string | ステップ系フラグ（`^[01]{2}$`） | `?s=10` |
| `w` | number | スイッチ数（0〜4、0以下は0、4以上は4） | `?w=2` |
| `x` | bool | 既存セルをスキップ | `?x=1` |
| `t` | bool | timing自動回避 | `?t=1` |
| `r` | bool | 方向コマンド有効化 | `?r=1` |
| `z` | bool | プレゼンモード（`z=1` で有効） | `?z=1` |

※ `z` が未指定の場合は `settings.js` の `presentationMode` が使用され、`z` が指定されている場合は `z` が優先されます。

## `v`（表示トグル一括フラグ）のビット順

`v` は `ui/ui-controls.js` の `TOGGLE_FLAG_ORDER` の順で解釈されます。

1. `toggleCursor`
2. `toggleGuide`
3. `toggleGrid`
4. `toggleEmpty`
5. `toggleColor`
6. `toggleDebugValues`

## bool値の解釈

`state/url-state.js` の `stringifyBool` の規則です。

- `?key` や `?key=` は true 扱い
- true: `1|true|yes|on|open|show`
- false: `0|false|no|off|close|closed|hide`

## 追加（個別トグル）

`app/main.js` の `applyUrlControlStates` により、以下の個別キーでもON/OFFが復元されます（値は上記のbool規則）。

- `toggleCursor`
- `toggleGuide`
- `toggleGrid`
- `toggleEmpty`
- `toggleColor`
- `toggleDebugValues`
- `stepMode`
- `stepSkipFunctions`
