# 入力コードサンプル

## Step1 いきなり完成
```
qrcode  // QRコードを作成する
```

## Step2 フェーズ分解
````
clear   // 盤面をクリアー
base    // 基本パターンを描画
data    // データパターンを描画
mask    // マスクを適用
````

## Step3 上方向に連続描画
````
clear
move y25 up
repeat
  put
  move
endrepeat
````

## Step4 折り返して連続描画
````
clear
move y25 up
repeat
  put
  move
  if block?
    move left
    turn
  endif
endrepeat
````

## Step5 ジグザグ描画
````
clear
move y25 up
repeat
  put
  move left
  put
  move
  if block?
    move left
    turn
  else
    move right
  endif
endrepeat
````

## Step6 基本パターン追加
````
clear
base
move y25 up
repeat
  put
  move left
  put
  move
  if block?
    move left
    turn
  else
    move right
  endif
endrepeat
````

## Step7 基本パターン回避
````
clear
base
move y25 up
repeat
  if empty? put
  move left
  if empty? put
  move
  if block?
    move left
    turn
  else
    move right
  endif
endrepeat
````

## Step8 タイミング列回避
````
clear
base
move y25 up
repeat
  if empty? put
  move left
  if empty? put
  move
  if block?
    move left
    if skip? move left
    turn
  else
    move right
  endif
endrepeat
````

## Step9 マスク適用
````
clear
base
move y25 up
repeat
  if empty? put
  move left
  if empty? put
  move
  if block?
    move left
    if skip? move left
    turn
  else
    move right
  endif
endrepeat
mask
````

## Step10 スイッチによる1リピート1put
````
clear
base
move y25 up
repeat
  if empty? put
  red
  if red?
    move left
  else
    move
    if block?
      move left
      if skip? move left
      turn
    else
      move right
    endif
  endif
endrepeat
mask
````

## Step10 相対移動のみ
````
clear
base
move y25 right
repeat
  if empty? put
  red
  if red?
  	turn
    move
  else
    if blue? turn left else turn right
    move
    if block?
      if blue? turn right else turn left 
      move
      if skip? move
      turn
      blue
    else
      if blue? turn left else turn right 
      move
    endif
  endif
endrepeat
mask
````
