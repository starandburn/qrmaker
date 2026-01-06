window.appSettingsFromScript = {
  "defaults": {
    "qrData": "Hello, World!",
    "userCode": "qrcode",
    "historyVisible": false,
    "patternPanelOpen": false,
    "debugVisible": false,
    "stepMode": false,
    "stepSkipFunctions": true,
    "skipExistingCells": false,
    "autoAvoidTiming": false,
    "stepSpeed": 60,
    "toggleFlags": {
      "toggleCursor": true,
      "toggleGuide": true,
      "toggleGrid": true,
      "toggleEmpty": true,
      "toggleColor": true,
      "toggleDebugValues": true,
      "stepMode": false,
      "stepSkipFunctions": true
    },
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
        "code": `reset
base
data
mask`
      },
      {
        "label": "3",
        "code": `reset
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
        "code": `reset
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
        "code": `reset
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
