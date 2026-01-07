window.appSettingsFromScript = {
  "defaults": {
    "qrData": "Hello, World!",
    "userCode": "qrcode",
    "historyVisible": false,
    "patternPanelOpen": false,
    "debugVisible": false,
    "skipExistingCells": false,
    "autoAvoidTiming": false,
    "defaultMask": 0,
    "stepSpeed": 30,
    "skipMode": false,
    "stepSkipDataOnly": true,
    "viewFlags": {
      "viewCursor": false,
      "viewGuide": false,
      "viewGrid": false,
      "viewEmpty": false,
      "viewColor": false,
      "viewDebugValues": false
    },
    "homeCursorDirection": "right",
    "dataTemplates": [
      { "value": "Hello, World!" },
      { "value": "https://www.nkk.ac.jp/" },
      { "value": "Cwm fjord-bank glyphs vext quiz." },
      { "value": "UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU" }
    ],
    "codeSamples": [
      {
        "label": "1",
        "code": `qrcode`
      },
      {
        "label": "2",
        "code": `clear
base
data
mask`
      },
      {
        "label": "3",
        "code": `clear
finders
timings
alignments
darkmodules
formats
move end up
repeat
\tadvance
end
mask`
      },
      {
        "label": "4",
        "code": `clear
base
move end
turn left
repeat
    put
    move left
    put
    move
    block?
        turn
        move left
     else
        move right
    end
end
mask`
      },
      {
        "label": "5",
        "code": `clear
base
move end
turn left
repeat
    empty? put
    move left
    empty? put
    move
    block?
        turn
        move left
    skip? move left
    else
        move right
    end
end
mask`
      }
    ]
  }
};
