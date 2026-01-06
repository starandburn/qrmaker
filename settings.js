window.appSettingsFromScript = {
  "defaults": {
    "qrData": "Hello, World!",
    "userCode": "qrcode",
    "historyVisible": false,
    "patternPanelOpen": false,
    "debugVisible": false,
    "stepMode": false,
    "stepSkipFunctions": true,
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
repeat
\tput
\tmove
\tif block
\t\tturn right
\telse
\t\tif used
\t\t\tturn
\t\t\tmove
\t\t\tturn left
\t\t\tmove
\t\tend
\tend
end`
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
