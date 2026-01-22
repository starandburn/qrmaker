window.appCodeSamplesFromScript = [
  { label: "1", code: `// 対象文字列を盤面に描画する
text` },
  { label: "2", code: `qrcode` },
  { label: "3", code: `reset
base
data
mask
` 
  },
  { label: "4", code: `reset
finders
timings
alignments
darkmodules
formats
data
mask
` },
  { label: "5", code: `reset
finder a1
finder s1
finder a19
timing 0 7
timing 1 7
alignment s19
darkmodule i18
format 0
format 1
data
mask
` },
  {
    label: "6",
    code: `reset		// 盤面リセット
base		// 基本パターン描画
move y25 	// 開始位置右下に移動
red off		// 赤スイッチをOFF
blue off	// 青スイッチをOFF

// データパターン描画
repeat last	// 最後のデータまで繰り返し
	if empty? put next	// まだ未配置であれば次のデータを置く
	
	// 赤スイッチによる処理分け
	if red?	// 赤スイッチがON（2列の左側を処理中）
		if blue? move down else move up	// 青スイッチにより上下に移動
		if block?	// 進めなかった場合
			move left	// 左に移動
			if timing? move left	// タイミングパターン列を避ける
			blue flip	// 青スイッチ（上下方向）を反転
		else		// 進めた場合
			move right	// 右側の列に戻る
		endif
	else	// 赤スイッチがOFF（2列の右側を処理中）
		move left	// 左に移動	
	endif
	red flip	// 赤スイッチを反転する
endrepeat
mask	// マスクを適用する`  }
];
