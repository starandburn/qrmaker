(function(global){
  if(!global) return;

  const QR_DSL_REFERENCE = {
    id: "qr-dsl",
    title: "標準QR言語",
    intro: [
      {
        text: "1行に1命令を書きます。大文字小文字は区別しません。コメントは ",
        code: ["//", "#", "'"],
        suffix: " から行末までです。",
      },
    ],
    sections: [
      {
        heading: "基本",
        items: [
          { terms: ["qrcode"], description: "入力データをQRコード仕様に従って自動配置します。" },
          { terms: ["text"], description: "入力データをドット文字として盤面に描画します。" },
          { terms: ["reset"], description: "盤面、カーソル、データ読み出し位置をリセットします。" },
          { terms: ["pause [ms]"], description: "指定時間だけ待機します。ステップ確認用です。" },
          { terms: ["stop"], description: "以降の実行を停止します。" },
        ],
      },
      {
        heading: "移動",
        items: [
          { terms: ["move"], description: "次のセルへ進みます。" },
          { terms: ["move up", "move down"], description: "上下へ1セル移動します。" },
          { terms: ["move left", "move right"], description: "左右へ1セル移動します。" },
          { terms: ["up", "down", "left", "right"], description: "move なしで使える短縮形です。" },
          { terms: ["move A1", "move 10 5"], description: "A1形式、または行・列の数字で指定位置へ移動します。" },
          { terms: ["move home", "move end"], description: "左上、または右下へ移動します。" },
        ],
      },
      {
        heading: "配置",
        items: [
          { terms: ["put"], description: "現在のセルに黒を配置します。" },
          { terms: ["put 0", "put white"], description: "現在のセルに白を配置します。" },
          { terms: ["put 1", "put black"], description: "現在のセルに黒を配置します。" },
          { terms: ["put next"], description: "次のデータパターンを1つ配置します。" },
        ],
      },
      {
        heading: "QR機能パターン",
        items: [
          { terms: ["base"], description: "基本パターンをまとめて描画します。" },
          { terms: ["finder", "finders"], description: "位置検出パターンを配置、またはまとめて描画します。" },
          { terms: ["alignment", "alignments"], description: "アライメントパターンを配置、またはまとめて描画します。" },
          { terms: ["timing", "timings"], description: "タイミングパターンを配置、またはまとめて描画します。" },
          { terms: ["dark", "darkmodule"], description: "ダークモジュールを配置します。" },
          { terms: ["format", "formats"], description: "フォーマット情報を配置、またはまとめて描画します。" },
          { terms: ["data"], description: "データパターンを描画します。" },
          { terms: ["mask [0-7]"], description: "マスクを適用します。番号省略時は自動選択です。" },
        ],
      },
      {
        heading: "条件",
        items: [
          { terms: ["if 条件", "endif"], description: "条件が真のときだけ実行します。" },
          { terms: ["else", "elseif 条件"], description: "分岐を追加します。" },
          { terms: ["if 条件 命令"], description: "1行だけの条件実行です。" },
          { terms: ["-条件"], description: "条件を反転します。" },
        ],
      },
      {
        heading: "繰り返し",
        items: [
          { terms: ["repeat", "endrepeat"], description: "無限ループ防止付きで繰り返します。" },
          { terms: ["repeat 10"], description: "指定回数だけ繰り返します。" },
          { terms: ["repeat last"], description: "次のデータがなくなるまで繰り返します。" },
          { terms: ["while 条件", "endwhile"], description: "条件が真の間、繰り返します。" },
          { terms: ["until 条件", "enduntil"], description: "条件が真になるまで、繰り返します。" },
          { terms: ["for 回数", "endfor"], description: "指定回数だけ繰り返します。" },
        ],
      },
      {
        heading: "条件に使える語",
        items: [
          { terms: ["empty"], description: "現在のセルが未配置なら真です。" },
          { terms: ["block", "wall"], description: "次の移動が盤面外などで止まるなら真です。" },
          { terms: ["timing"], description: "タイミング領域なら真です。" },
          { terms: ["skip"], description: "スキップ対象領域なら真です。" },
          { terms: ["next?", "next"], description: "次のデータが残っていれば真です。" },
          { terms: ["last"], description: "次のデータがなくなったら真です。" },
        ],
      },
      {
        heading: "スイッチ",
        items: [
          { terms: ["red on", "red off"], description: "スイッチをON/OFFします。色は red、blue、green、yellow です。" },
          { terms: ["red flip"], description: "ON/OFFを反転します。" },
          { terms: ["if red"], description: "スイッチがONなら真です。" },
        ],
      },
    ],
    example: [
      "move end",
      "red on",
      "repeat last",
      "    if empty put next",
      "    move left",
      "    if red up else down",
      "endrepeat",
      "mask",
    ].join("\n"),
  };

  const PYTHON_REFERENCE = {
    id: "python",
    title: "Python風言語",
    intro: [
      {
        text: "Pythonに近い字下げで書きます。コメントは ",
        code: ["#"],
        suffix: " から行末までです。",
      },
    ],
    sections: [
      {
        heading: "基本",
        items: [
          { terms: ["draw_qr_code()"], description: "入力データをQRコード仕様に従って自動配置します。" },
          { terms: ["draw_text()"], description: "入力データをドット文字として盤面に描画します。" },
          { terms: ["reset_board()"], description: "盤面、カーソル、データ読み出し位置をリセットします。" },
          { terms: ["pause_running(ms)"], description: "指定時間だけ待機します。ステップ確認用です。" },
          { terms: ["関数名(...)"], description: "PHでは命令呼び出しのカッコは省略できません。" },
          { terms: ["stop"], description: "以降の実行を停止します。" },
        ],
      },
      {
        heading: "移動",
        items: [
          { terms: ["move_cursor()"], description: "次のセルへ進みます。" },
          { terms: ["move_cursor(1)", "move_cursor(UP)"], description: "上へ1セル移動します。方向は上右下左を1,2,3,4、またはUP/RIGHT/DOWN/LEFTで指定できます。" },
          { terms: ["up()", "down()", "left()", "right()"], description: "方向移動の短縮形です。" },
          { terms: ["jump_cursor(\"A1\")", "jump_cursor(10, 5)"], description: "A1形式、または行・列の数字で指定位置へ移動します。" },
          { terms: ["jump_cursor(\"home\")", "jump_cursor(\"end\")"], description: "左上、または右下へ移動します。" },
        ],
      },
      {
        heading: "配置",
        items: [
          { terms: ["put_cell()"], description: "現在のセルに黒を配置します。" },
          { terms: ["put_cell(0)", "put_cell(\"white\")"], description: "現在のセルに白を配置します。" },
          { terms: ["put_cell(1)", "put_cell(\"black\")"], description: "現在のセルに黒を配置します。" },
          { terms: ["put_cell(\"next\")"], description: "次のデータパターンを1つ配置します。" },
        ],
      },
      {
        heading: "QR機能パターン",
        items: [
          { terms: ["draw_base_patterns()"], description: "基本パターンをまとめて描画します。" },
          { terms: ["put_finder_cells()", "draw_finder_patterns()"], description: "位置検出パターンを配置、またはまとめて描画します。" },
          { terms: ["put_alignment_cells()", "draw_alignment_patterns()"], description: "アライメントパターンを配置、またはまとめて描画します。" },
          { terms: ["put_timing_cells()", "draw_timing_patterns()"], description: "タイミングパターンを配置、またはまとめて描画します。" },
          { terms: ["put_dark_module_cells()", "draw_dark_module_patterns()"], description: "ダークモジュールを配置、またはまとめて描画します。" },
          { terms: ["put_format_cells()", "draw_format_patterns()"], description: "フォーマット情報を配置、またはまとめて描画します。" },
          { terms: ["draw_data_patterns()"], description: "データパターンを描画します。" },
          { terms: ["apply_mask()", "apply_mask(0)"], description: "マスクを適用します。番号省略時は自動選択です。" },
        ],
      },
      {
        heading: "条件",
        items: [
          { terms: ["if 条件:"], description: "条件が真のときだけ、字下げされた範囲を実行します。" },
          { terms: ["elif 条件:", "else:"], description: "分岐を追加します。" },
          { terms: ["if 条件: 命令"], description: "1行だけの条件実行です。" },
        ],
      },
      {
        heading: "繰り返し",
        items: [
          { terms: ["while 条件:"], description: "条件が真の間、字下げされた範囲を繰り返します。" },
          { terms: ["for 回数:"], description: "指定回数だけ繰り返します。" },
          { terms: ["while has_next_data():"], description: "次のデータが残っている間、繰り返します。" },
        ],
      },
      {
        heading: "条件に使える関数",
        items: [
          { terms: ["is_empty()"], description: "現在のセルが未配置なら真です。" },
          { terms: ["is_move_blocked()"], description: "前回の move_cursor() が盤面外などで止まったなら真です。" },
          { terms: ["did_move()"], description: "前回の move_cursor() がぶつからず、実際に移動できていれば true です。" },
          { terms: ["is_timing_zone()"], description: "タイミング領域なら真です。" },
          { terms: ["is_skip_zone()"], description: "スキップ対象領域なら真です。" },
          { terms: ["has_next_data()"], description: "次のデータが残っていれば真です。" },
          { terms: ["is_data_finished()"], description: "データが終わっていれば真です。" },
        ],
      },
      {
        heading: "スイッチ",
        items: [
          { terms: ["set_switch(red)", "set_switch(red, True)", "set_switch(blue, False)", "set_switch(red, blue)"], description: "スイッチの値を判定、True/Falseで指定、または別のスイッチと同じ値にします。" },
          { terms: ["if red:", "if not red:"], description: "スイッチを真偽値のように条件で使えます。" },
          { terms: ["red = True", "blue = False", "red = blue", "red = not red"], description: "スイッチを真偽値のように代入できます。" },
          { terms: ["is_switch_on(red)"], description: "スイッチがONなら真です。" },
        ],
      },
    ],
    example: [
      "move_cursor(\"end\")",
      "set_switch(red, True)",
      "while has_next_data():",
      "    if is_empty(): put_cell(\"next\")",
      "    move_cursor(LEFT)",
      "    if is_switch_on(red):",
      "        up()",
      "    else:",
      "        down()",
      "apply_mask()",
    ].join("\n"),
  };

  const references = {
    "qr-dsl": QR_DSL_REFERENCE,
    python: PYTHON_REFERENCE,
  };

  const appendCode = (parent, value, options = {}) => {
    const code = document.createElement("code");
    code.textContent = value;
    if(options.insertable){
      code.className = "command-reference-insert";
      code.setAttribute("data-insert-code", value);
      code.title = "ダブルクリックでコードに挿入";
    }
    parent.appendChild(code);
  };

  const renderIntro = (parent, reference) => {
    const section = document.createElement("section");
    section.className = "command-reference-section";
    const heading = document.createElement("h3");
    heading.textContent = reference.title;
    const paragraph = document.createElement("p");
    reference.intro.forEach((entry) => {
      paragraph.appendChild(document.createTextNode(entry.text));
      entry.code.forEach((value, index) => {
        if(index > 0){
          paragraph.appendChild(document.createTextNode("、"));
        }
        appendCode(paragraph, value);
      });
      paragraph.appendChild(document.createTextNode(entry.suffix));
    });
    section.append(heading, paragraph);
    parent.appendChild(section);
  };

  const renderSection = (parent, sectionData) => {
    const section = document.createElement("section");
    section.className = "command-reference-section";
    const heading = document.createElement("h3");
    heading.textContent = sectionData.heading;
    const list = document.createElement("dl");
    list.className = "command-reference-list";
    sectionData.items.forEach((item) => {
      const term = document.createElement("dt");
      if(item.terms.length > 1){
        term.className = "command-reference-terms-multi";
      }
      item.terms.forEach((value, index) => {
        if(index > 0){
          term.appendChild(document.createTextNode(" "));
        }
        appendCode(term, value, { insertable: true });
      });
      const description = document.createElement("dd");
      description.textContent = item.description;
      list.append(term, description);
    });
    section.append(heading, list);
    parent.appendChild(section);
  };

  const renderExample = (parent, reference) => {
    const section = document.createElement("section");
    section.className = "command-reference-section";
    const heading = document.createElement("h3");
    heading.textContent = "例";
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = reference.example;
    pre.appendChild(code);
    section.append(heading, pre);
    parent.appendChild(section);
  };

  const renderCommandReference = (languageId = "qr-dsl") => {
    const target = document.getElementById("commandReferenceContent");
    if(!target) return false;
    const reference = references[languageId] || references["qr-dsl"];
    target.textContent = "";
    target.setAttribute("data-language", reference.id);
    renderIntro(target, reference);
    reference.sections.forEach((sectionData) => renderSection(target, sectionData));
    renderExample(target, reference);
    return true;
  };

  const insertCommandAtCursor = (syntax) => {
    const text = String(syntax ?? "");
    if(!text) return false;
    const textarea = document.getElementById("userCode");
    if(!textarea) return false;
    const start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : (textarea.value ?? "").length;
    const end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : start;
    if(typeof textarea.setRangeText === "function"){
      textarea.setRangeText(text, start, end, "end");
    }else{
      const value = textarea.value ?? "";
      textarea.value = value.slice(0, start) + text + value.slice(end);
      const nextPos = start + text.length;
      textarea.selectionStart = textarea.selectionEnd = nextPos;
    }
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    if(typeof textarea.focus === "function"){
      textarea.focus();
    }
    const editor = global.__codeEditor;
    if(editor && typeof editor.setValue === "function" && typeof editor.getValue === "function"){
      const nextValue = textarea.value ?? "";
      if(editor.getValue() !== nextValue){
        editor.setValue(nextValue);
      }
      if(typeof editor.focus === "function"){
        editor.focus();
      }
    }
    return true;
  };

  const bindCommandReferenceInsertion = () => {
    const target = document.getElementById("commandReferenceContent");
    if(!target || target.dataset.insertBinding === "1") return;
    target.dataset.insertBinding = "1";
    target.addEventListener("dblclick", (ev) => {
      const code = ev.target && ev.target.closest ? ev.target.closest("[data-insert-code]") : null;
      if(!code) return;
      ev.preventDefault();
      insertCommandAtCursor(code.getAttribute("data-insert-code") || code.textContent || "");
    });
  };

  global.commandReferences = references;
  global.renderCommandReference = renderCommandReference;
  global.insertCommandReferenceAtCursor = insertCommandAtCursor;
  renderCommandReference("qr-dsl");
  bindCommandReferenceInsertion();
})(typeof window !== "undefined" ? window : globalThis);
