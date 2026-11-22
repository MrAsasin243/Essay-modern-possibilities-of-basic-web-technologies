(() => {
  "use strict";

  // ---------- LAB 01: instructional tokenizer subset ----------
  const tokenInput = document.getElementById("hp-token-input");
  if (tokenInput) {
    const stepButton = document.getElementById("hp-token-step");
    const resetButton = document.getElementById("hp-token-reset");
    const runButton = document.getElementById("hp-token-run");
    const statusNode = document.getElementById("hp-token-status");
    const charNode = document.getElementById("hp-token-char");
    const stateNode = document.getElementById("hp-token-state");
    const positionNode = document.getElementById("hp-token-position");
    const currentNode = document.getElementById("hp-token-current-output");
    const emittedNode = document.getElementById("hp-token-emitted");

    const stateLabels = {
      data: "Data", tagOpen: "Tag open", endTagOpen: "End tag open", tagName: "Tag name",
      beforeAttr: "Before attribute name", attrName: "Attribute name", afterAttrName: "After attribute name",
      beforeAttrValue: "Before attribute value", attrValueDouble: "Attribute value (double quoted)",
      attrValueSingle: "Attribute value (single quoted)", attrValueUnquoted: "Attribute value (unquoted)",
      afterAttrValue: "After quoted attribute value", selfClosing: "Self-closing start tag",
      markupDecl: "Markup declaration open", comment: "Comment", doctype: "DOCTYPE", done: "EOF"
    };
    const space = ch => ch === " " || ch === "\n" || ch === "\t" || ch === "\f" || ch === "\r";
    const alpha = ch => !!ch && /[A-Za-z]/.test(ch);

    function createMachine(source) {
      return {
        chars: Array.from(source), index: 0, state: "data", token: null,
        emitted: [], trace: [], finished: false
      };
    }
    let machine = createMachine(tokenInput.value);

    function emitCurrent(m) {
      if (!m.token) return;
      const t = m.token;
      if (t.type === "tag") {
        const clean = {};
        for (const attr of t.attrs) {
          if (!(attr.name in clean)) clean[attr.name] = attr.value;
        }
        m.emitted.push({ type: t.end ? "end-tag" : "start-tag", name: t.name, attrs: clean, selfClosing: !!t.selfClosing });
      } else if (t.type === "comment" || t.type === "doctype") {
        m.emitted.push({ type: t.type, data: t.data.trim() });
      }
      m.token = null;
    }
    function startTag(m, end) { m.token = { type: "tag", end, name: "", attrs: [], attr: null, selfClosing: false }; }
    function startAttr(m) { m.token.attr = { name: "", value: "" }; }
    function finishAttr(m) {
      if (!m.token || !m.token.attr) return;
      if (!m.token.attrs.some(a => a.name === m.token.attr.name)) m.token.attrs.push(m.token.attr);
      m.token.attr = null;
    }
    function displayChar(ch) {
      if (ch === " ") return "␠";
      if (ch === "\n") return "LF";
      if (ch === "\t") return "TAB";
      if (ch === "\r") return "CR";
      if (ch === "\f") return "FF";
      return ch;
    }
    function step(m) {
      if (m.finished) return null;
      const before = m.state;
      const index = m.index;
      const ch = m.chars[m.index];
      let event = "consume";
      if (ch === undefined) {
        if (m.token && m.token.type === "tag") event = "EOF inside tag — token abandoned in this teaching model";
        else if (m.token && m.token.type === "comment") { emitCurrent(m); event = "EOF closes comment"; }
        else if (m.token && m.token.type === "doctype") { emitCurrent(m); event = "EOF closes DOCTYPE"; }
        m.state = "done"; m.finished = true;
      } else {
        m.index++;
        switch (m.state) {
          case "data":
            if (ch === "<") { m.state = "tagOpen"; event = "possible tag opener"; }
            else { m.emitted.push({ type: "character", data: ch }); event = "character token"; }
            break;
          case "tagOpen":
            if (ch === "/") { m.state = "endTagOpen"; event = "possible end tag"; }
            else if (ch === "!") { m.state = "markupDecl"; event = "markup declaration"; }
            else if (alpha(ch)) { startTag(m, false); m.token.name += ch.toLowerCase(); m.state = "tagName"; event = "start tag token created"; }
            else { m.emitted.push({ type: "character", data: "<" + ch }); m.state = "data"; event = "not a tag — emitted as text"; }
            break;
          case "endTagOpen":
            if (alpha(ch)) { startTag(m, true); m.token.name += ch.toLowerCase(); m.state = "tagName"; event = "end tag token created"; }
            else if (ch === ">") { m.state = "data"; event = "empty end tag ignored"; }
            else { m.emitted.push({ type: "character", data: "</" + ch }); m.state = "data"; event = "not a valid end-tag opener in this subset"; }
            break;
          case "tagName":
            if (space(ch)) m.state = "beforeAttr";
            else if (ch === "/") m.state = "selfClosing";
            else if (ch === ">") { emitCurrent(m); m.state = "data"; event = "tag token emitted"; }
            else m.token.name += ch.toLowerCase();
            break;
          case "beforeAttr":
            if (space(ch)) break;
            if (ch === "/") m.state = "selfClosing";
            else if (ch === ">") { emitCurrent(m); m.state = "data"; event = "tag token emitted"; }
            else { startAttr(m); m.token.attr.name += ch.toLowerCase(); m.state = "attrName"; }
            break;
          case "attrName":
            if (space(ch)) m.state = "afterAttrName";
            else if (ch === "=") m.state = "beforeAttrValue";
            else if (ch === "/") { finishAttr(m); m.state = "selfClosing"; }
            else if (ch === ">") { finishAttr(m); emitCurrent(m); m.state = "data"; event = "tag token emitted"; }
            else m.token.attr.name += ch.toLowerCase();
            break;
          case "afterAttrName":
            if (space(ch)) break;
            if (ch === "=") m.state = "beforeAttrValue";
            else if (ch === "/") { finishAttr(m); m.state = "selfClosing"; }
            else if (ch === ">") { finishAttr(m); emitCurrent(m); m.state = "data"; event = "tag token emitted"; }
            else { finishAttr(m); startAttr(m); m.token.attr.name += ch.toLowerCase(); m.state = "attrName"; }
            break;
          case "beforeAttrValue":
            if (space(ch)) break;
            if (ch === '"') m.state = "attrValueDouble";
            else if (ch === "'") m.state = "attrValueSingle";
            else if (ch === ">") { finishAttr(m); emitCurrent(m); m.state = "data"; event = "tag token emitted with empty value"; }
            else { m.token.attr.value += ch; m.state = "attrValueUnquoted"; }
            break;
          case "attrValueDouble":
            if (ch === '"') { finishAttr(m); m.state = "afterAttrValue"; }
            else m.token.attr.value += ch;
            break;
          case "attrValueSingle":
            if (ch === "'") { finishAttr(m); m.state = "afterAttrValue"; }
            else m.token.attr.value += ch;
            break;
          case "attrValueUnquoted":
            if (space(ch)) { finishAttr(m); m.state = "beforeAttr"; }
            else if (ch === ">") { finishAttr(m); emitCurrent(m); m.state = "data"; event = "tag token emitted"; }
            else m.token.attr.value += ch;
            break;
          case "afterAttrValue":
            if (space(ch)) m.state = "beforeAttr";
            else if (ch === "/") m.state = "selfClosing";
            else if (ch === ">") { emitCurrent(m); m.state = "data"; event = "tag token emitted"; }
            else { startAttr(m); m.token.attr.name += ch.toLowerCase(); m.state = "attrName"; event = "reconsume as attribute name (simplified)"; }
            break;
          case "selfClosing":
            if (ch === ">") { if (m.token) m.token.selfClosing = true; emitCurrent(m); m.state = "data"; event = "self-closing token emitted"; }
            else { m.state = "beforeAttr"; event = "unexpected slash — resume before attribute name (simplified)"; }
            break;
          case "markupDecl":
            if (ch === "-") {
              if (m.chars[m.index] === "-") { m.index++; m.token = { type: "comment", data: "" }; m.state = "comment"; event = "comment token created"; }
              else { m.token = { type: "comment", data: ch }; m.state = "comment"; event = "bogus comment fallback (simplified)"; }
            } else if ((m.chars.slice(m.index - 1, m.index + 6).join("")).toUpperCase() === "DOCTYPE") {
              for (let i = 0; i < 6; i++) m.index++;
              m.token = { type: "doctype", data: "" }; m.state = "doctype"; event = "DOCTYPE token created";
            } else { m.token = { type: "comment", data: ch }; m.state = "comment"; event = "bogus comment fallback (simplified)"; }
            break;
          case "comment":
            if (ch === "-" && m.chars[m.index] === "-" && m.chars[m.index + 1] === ">") {
              m.index += 2; emitCurrent(m); m.state = "data"; event = "comment token emitted";
            } else m.token.data += ch;
            break;
          case "doctype":
            if (ch === ">") { emitCurrent(m); m.state = "data"; event = "DOCTYPE token emitted"; }
            else m.token.data += ch;
            break;
          default:
            m.state = "data";
        }
      }
      const record = { index, char: ch === undefined ? "EOF" : displayChar(ch), before, after: m.state, event, token: m.token ? JSON.parse(JSON.stringify(m.token)) : null };
      m.trace.push(record);
      return record;
    }
    function currentTokenLabel(t) {
      if (!t) return "Токен не открыт";
      if (t.type === "tag") return `${t.end ? "End" : "Start"} tag: <${t.end ? "/" : ""}${t.name}>\nAttributes: ${JSON.stringify(t.attrs, null, 2)}\nSelf-closing: ${!!t.selfClosing}`;
      return `${t.type}: ${t.data}`;
    }
    function render() {
      const last = machine.trace[machine.trace.length - 1] || null;
      charNode.textContent = last ? last.char : "—";
      stateNode.textContent = stateLabels[machine.state] || machine.state;
      positionNode.textContent = `${machine.index} / ${machine.chars.length}`;
      currentNode.textContent = currentTokenLabel(machine.token);
      emittedNode.replaceChildren();
      if (!machine.emitted.length) {
        const li = document.createElement("li"); li.textContent = "Пока пусто"; emittedNode.appendChild(li);
      } else {
        machine.emitted.slice(-40).forEach((token, i) => {
          const li = document.createElement("li");
          li.textContent = `${machine.emitted.length - Math.min(40, machine.emitted.length) + i + 1}. ${JSON.stringify(token)}`;
          emittedNode.appendChild(li);
        });
      }
      if (!last) statusNode.textContent = "Готово к пошаговой обработке. Один шаг = одна Unicode code point (некоторые распознавания consume несколько).";
      else statusNode.textContent = `Шаг ${machine.trace.length}: ${last.event}. ${machine.finished ? "Вход завершён." : "Можно продолжить."}`;
      stepButton.disabled = machine.finished;
      runButton.disabled = machine.finished;
    }
    function reset() { machine = createMachine(tokenInput.value.slice(0, 400)); tokenInput.value = tokenInput.value.slice(0, 400); render(); }
    stepButton.addEventListener("click", () => { step(machine); render(); });
    resetButton.addEventListener("click", reset);
    runButton.addEventListener("click", () => { let guard = 0; while (!machine.finished && guard++ < 500) step(machine); render(); });
    tokenInput.addEventListener("change", reset);
    tokenInput.addEventListener("input", () => { if (tokenInput.value.length > 400) tokenInput.value = tokenInput.value.slice(0, 400); });
    reset();
  }

  // ---------- LAB 02: the browser's actual HTML parser via DOMParser ----------
  const parseInput = document.getElementById("hp-parse-input");
  if (parseInput) {
    const presets = {
      implicit: "<title>Example</title><p>Paragraph without html/head/body wrappers",
      paragraph: "<p>First paragraph<p>Second paragraph",
      table: "<table>outside text<tr><td>A<td>B</table>",
      formatting: "<p>1<b>2<i>3</b>4</i>5</p>",
      duplicate: "<div id=\"first\" id=\"second\" class=\"a\" class=\"b\">Duplicate attributes</div>",
      foreign: "<svg viewBox=\"0 0 10 10\"><foreignObject><p>HTML integration point</p></foreignObject></svg>",
      script: "<p>Before</p><script>document.body.dataset.executed = 'yes';</script><p>After</p>"
    };
    const select = document.getElementById("hp-parse-sample");
    const runButton = document.getElementById("hp-parse-run");
    const resetButton = document.getElementById("hp-parse-reset");
    const treeNode = document.getElementById("hp-parse-tree");
    const markupNode = document.getElementById("hp-parse-markup");
    const metaNode = document.getElementById("hp-parse-meta");
    const nf = new Intl.NumberFormat("ru-RU");

    function nodeLabel(node) {
      if (node.nodeType === Node.DOCUMENT_NODE) return "#document";
      if (node.nodeType === Node.DOCUMENT_TYPE_NODE) return `<!DOCTYPE ${node.name}>`;
      if (node.nodeType === Node.ELEMENT_NODE) return `<${node.localName}>`;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue.replace(/\s+/g, " ").trim();
        return text ? `#text ${JSON.stringify(text.slice(0, 90))}` : "#text (whitespace)";
      }
      if (node.nodeType === Node.COMMENT_NODE) return `<!-- ${node.nodeValue.slice(0, 70)} -->`;
      return `Node(type ${node.nodeType})`;
    }
    function renderTree(root) {
      let count = 0;
      function visit(node, depth) {
        const li = document.createElement("li");
        const label = document.createElement("span");
        label.className = "hp-tree-kind";
        label.textContent = nodeLabel(node);
        li.appendChild(label);
        if (node.nodeType === Node.ELEMENT_NODE) {
          const detail = document.createElement("span");
          detail.className = "hp-tree-detail";
          detail.textContent = ` · ${node.namespaceURI === "http://www.w3.org/2000/svg" ? "SVG" : node.namespaceURI === "http://www.w3.org/1998/Math/MathML" ? "MathML" : "HTML"}`;
          li.appendChild(detail);
        }
        count++;
        if (depth < 24 && count < 180 && node.childNodes && node.childNodes.length) {
          const ol = document.createElement("ol");
          for (const child of node.childNodes) {
            if (count >= 180) break;
            ol.appendChild(visit(child, depth + 1));
          }
          li.appendChild(ol);
        }
        return li;
      }
      const list = document.createElement("ol");
      list.appendChild(visit(root, 0));
      return { list, count };
    }
    function parse() {
      const source = parseInput.value.slice(0, 12000);
      parseInput.value = source;
      try {
        const doc = new DOMParser().parseFromString(source, "text/html");
        const tree = renderTree(doc);
        treeNode.replaceChildren(tree.list);
        markupNode.textContent = doc.documentElement ? doc.documentElement.outerHTML : "DOM не содержит documentElement";
        const elements = doc.getElementsByTagName("*").length;
        metaNode.textContent = `Готово: ${nf.format(tree.count)} узлов показано (лимит дерева — 180), элементов: ${nf.format(elements)}, document.compatMode: ${doc.compatMode}. Разобрано текущим браузером через DOMParser.`;
      } catch (error) {
        treeNode.textContent = "Не удалось построить дерево.";
        markupNode.textContent = "—";
        metaNode.textContent = `Ошибка API: ${error && error.message ? error.message : String(error)}`;
      }
    }
    function loadPreset() { parseInput.value = presets[select.value] || presets.implicit; parse(); }
    select.addEventListener("change", loadPreset);
    runButton.addEventListener("click", parse);
    resetButton.addEventListener("click", loadPreset);
    parseInput.addEventListener("keydown", event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") parse(); });
    loadPreset();
  }
})();
