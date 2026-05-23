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
    code: `reset
base
move y25
red on
repeat last
    repeat 25
        if empty put next
        move left
        if empty put next
        move right
        if red
            move up
        else
            move down
        endif
    endrepeat
    red flip
    move left
    move left
    if timing move left
endrepeat
mask`  }
];
