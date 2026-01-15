# 入力コードサンプル

## Step1 いきなり完成
```
qrcode  // QRコードを作成する
```

## Step2 フェーズ分解
````
reset   // 盤面をクリアー
base    // 基本パターンを描画
data    // データパターンを描画
mask    // マスクを適用
````

## Step3 上方向に連続描画
````
reset           // 盤面をクリア
move y25 up     // y=25へ移動して上向きに設定
repeat          // 繰り返し開始
  put           // 現在位置に描画
  move          // 1マス進む
endrepeat       // 繰り返し終了
````

## Step4 折り返して連続描画
````
reset           // 盤面をクリア
move y25 up     // y=25へ移動して上向きに設定
repeat          // 繰り返し開始
  put           // 現在位置に描画
  move          // 1マス進む
  if block?     // 壁に当たったら
    move left   // 左にずれて
    turn        // 進行方向を反転
  endif
endrepeat       // 繰り返し終了
````

## Step5 ジグザグ描画
````
reset           // 盤面をクリア
move y25 up     // y=25へ移動して上向きに設定
repeat          // 繰り返し開始
  put           // 左列に描画
  move left     // 左へ移動
  put           // 右列に描画
  move          // 1マス進む
  if block?     // 壁に当たったら
    move left   // 左にずれて
    turn        // 進行方向を反転
  else
    move right  // 次の列へ移動
  endif
endrepeat       // 繰り返し終了
````

## Step6 基本パターン追加
````
reset           // 盤面をクリア
base            // 基本パターンを描画
move y25 up     // y=25へ移動して上向きに設定
repeat          // 繰り返し開始
  put           // 左列に描画
  move left     // 左へ移動
  put           // 右列に描画
  move          // 1マス進む
  if block?     // 壁に当たったら
    move left   // 左にずれて
    turn        // 進行方向を反転
  else
    move right  // 次の列へ移動
  endif
endrepeat       // 繰り返し終了
````

## Step7 基本パターン回避
````
reset             // 盤面をクリア
base              // 基本パターンを描画
move y25 up       // y=25へ移動して上向きに設定
repeat            // 繰り返し開始
  if empty? put   // 空きなら描画
  move left       // 左へ移動
  if empty? put   // 空きなら描画
  move            // 1マス進む
  if block?       // 壁に当たったら
    move left     // 左にずれて
    turn          // 進行方向を反転
  else
    move right    // 次の列へ移動
  endif
endrepeat         // 繰り返し終了
````

## Step8 タイミング列回避
````
reset             // 盤面をクリア
base              // 基本パターンを描画
move y25 up       // y=25へ移動して上向きに設定
repeat            // 繰り返し開始
  if empty? put   // 空きなら描画
  move left       // 左へ移動
  if empty? put   // 空きなら描画
  move            // 1マス進む
  if block?       // 壁に当たったら
    move left     // 左にずれて
    if skip? move left // タイミング列ならさらに左へ
    turn          // 進行方向を反転
  else
    move right    // 次の列へ移動
  endif
endrepeat         // 繰り返し終了
````

## Step9 マスク適用
````
reset             // 盤面をクリア
base              // 基本パターンを描画
move y25 up       // y=25へ移動して上向きに設定
repeat            // 繰り返し開始
  if empty? put   // 空きなら描画
  move left       // 左へ移動
  if empty? put   // 空きなら描画
  move            // 1マス進む
  if block?       // 壁に当たったら
    move left     // 左にずれて
    if skip? move left // タイミング列ならさらに左へ
    turn          // 進行方向を反転
  else
    move right    // 次の列へ移動
  endif
endrepeat         // 繰り返し終了
mask              // マスクを適用
````

## Step10 スイッチによる1リピート1put
````
reset             // 盤面をクリア
base              // 基本パターンを描画
move y25 up       // y=25へ移動して上向きに設定
repeat            // 繰り返し開始
  if empty? put   // 空きなら描画
  red             // フラグを赤に設定
  if red?         // 赤なら
    move left     // 左に移動
  else
    move          // 1マス進む
    if block?     // 壁に当たったら
      move left   // 左にずれて
      if skip? move left // タイミング列ならさらに左へ
      turn        // 進行方向を反転
    else
      move right  // 次の列へ移動
    endif
  endif
endrepeat         // 繰り返し終了
mask              // マスクを適用
````

## Step11 相対移動のみ
````
reset                      // 盤面をクリア
base                       // 基本パターンを描画
move y25 right             // y=25へ移動して右向きに設定
repeat                     // 繰り返し開始
  if empty? put            // 空きなら描画
  red                       // フラグを赤に設定
  if red?                  // 赤なら
    turn                   // 方向転換
    move                   // 1マス進む
  else
    if blue? turn left else turn right // 青フラグで左右を切替
    move                   // 1マス進む
    if block?              // 壁に当たったら
      if blue? turn right else turn left // 方向を調整
      move                 // 1マス進む
      if skip? move        // タイミング列ならさらに進む
      turn                 // 進行方向を反転
      blue                 // フラグを青に設定
    else
      if blue? turn left else turn right // 次の列へ向ける
      move                 // 1マス進む
    endif
  endif
endrepeat                  // 繰り返し終了
mask                       // マスクを適用
````

## Step12 向き概念廃止
````
reset
base
move y25

red on
repeat-last

  // 2マス分配置（列ペア）
  if empty? put next
  move left
  if empty? put next

  // 縦に1マス進む（赤スイッチで上/下）
  if red? move up else move down

  // 端に当たったら折り返し処理
  if block?
    move left
    if timing? move left
    red flip
  else
    // 折り返しでない場合は列ペアの位置合わせ
    move right
  endif

end repeat
mask
````

## Final 完成形
````
reset
base
move y25
repeat-last 
	if empty put next
	move left
	if empty put next
	if red move down else move up
	if block
		move left
		if skip move left
		red flip
	else
		move right
	endif
endrepeat
mask
````

