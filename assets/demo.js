/*
 * assets/demo.js — небольшой движок живых примеров.
 *
 * Зачем он нужен: каждый пример на сайте описывается данными (id, код, требования),
 * а общая оболочка, проверки поддержки, запуск и очистка живут здесь, в одном месте.
 *
 * Важные решения (их стоит понимать — они сами учебный материал):
 *  1. Это КЛАССИЧЕСКИЙ скрипт, а не ES-модуль. По file:// браузеры блокируют
 *     <script type="module" src="...">, потому что считают файлы разными origin.
 *  2. Два режима исполнения:
 *       'sandbox' — код читателя исполняется в <iframe sandbox srcdoc>, БЕЗ allow-same-origin.
 *                   Это единственное место, где исполняется или вставляется чужой код.
 *       'host'    — код АВТОРА сайта исполняется в этом документе (нужен доступ к
 *                   нашему DOM, событиям, таймингам). Читатель его не редактирует.
 *  3. Любой ресурс (слушатель, таймер, кадр анимации, наблюдатель, blob-URL) создаётся
 *     через «область» (scope) и освобождается одним вызовом dispose().
 *  4. Состояний у примера немного: работает / не поддерживается / нужен защищённый
 *     контекст / нужен сервер / ошибка / приостановлен. Тихих падений нет.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Окружение: где открыта страница
  // ---------------------------------------------------------------------------
  var proto = location.protocol;
  var env = {
    protocol: proto,
    isFile: proto === 'file:',
    isHttp: proto === 'http:' || proto === 'https:',
    // Именно isSecureContext, а не «https или нет»: браузеры считают защищёнными
    // не только https:, но и localhost, а многие — и file:. Не гадаем, а спрашиваем.
    secure: window.isSecureContext === true
  };

  // ---------------------------------------------------------------------------
  // 2. Проверки поддержки возможностей (feature detection)
  //    test() возвращает true/false; how — как именно проверяем (показывается читателю).
  // ---------------------------------------------------------------------------
  var MDN = 'https://developer.mozilla.org/en-US/docs/Web/';

  function cssOk(q) {
    return !!(window.CSS && typeof CSS.supports === 'function' && CSS.supports(q));
  }
  function has(obj, key) { return obj != null && key in Object(obj); }

  var CHECKS = {
    'css:has':        { label: ':has()', how: "CSS.supports('selector(:has(*))')", url: MDN + 'CSS/:has',
                        test: function () { return cssOk('selector(:has(*))'); } },
    'css:nesting':    { label: 'CSS-вложенность', how: "CSS.supports('selector(&)')", url: MDN + 'CSS/CSS_nesting',
                        test: function () { return cssOk('selector(&)'); } },
    'css:oklch':      { label: 'oklch()', how: "CSS.supports('color: oklch(0.7 0.1 200)')", url: MDN + 'CSS/color_value/oklch',
                        test: function () { return cssOk('color: oklch(0.7 0.1 200)'); } },
    'css:color-mix':  { label: 'color-mix()', how: "CSS.supports('color: color-mix(in srgb, red, blue)')", url: MDN + 'CSS/color_value/color-mix',
                        test: function () { return cssOk('color: color-mix(in srgb, red, blue)'); } },
    'css:light-dark': { label: 'light-dark()', how: "CSS.supports('color: light-dark(white, black)')", url: MDN + 'CSS/color_value/light-dark',
                        test: function () { return cssOk('color: light-dark(white, black)'); } },
    'css:text-wrap-balance': { label: 'text-wrap: balance', how: "CSS.supports('text-wrap: balance')", url: MDN + 'CSS/text-wrap',
                        test: function () { return cssOk('text-wrap: balance'); } },
    'css:field-sizing': { label: 'field-sizing', how: "CSS.supports('field-sizing: content')", url: MDN + 'CSS/field-sizing',
                        test: function () { return cssOk('field-sizing: content'); } },
    'css:accent-color': { label: 'accent-color', how: "CSS.supports('accent-color: red')", url: MDN + 'CSS/accent-color',
                        test: function () { return cssOk('accent-color: red'); } },
    'css:scroll-timeline': { label: 'scroll-driven animations', how: "CSS.supports('animation-timeline: scroll()')", url: MDN + 'CSS/animation-timeline',
                        test: function () { return cssOk('animation-timeline: scroll()'); } },
    'css:anchor':     { label: 'anchor positioning', how: "CSS.supports('anchor-name: --a')", url: MDN + 'CSS/anchor-name',
                        test: function () { return cssOk('anchor-name: --a'); } },
    'css:subgrid':    { label: 'subgrid', how: "CSS.supports('grid-template-columns: subgrid')", url: MDN + 'CSS/CSS_grid_layout/Subgrid',
                        test: function () { return cssOk('grid-template-columns: subgrid'); } },
    'css:container':  { label: 'container queries', how: "CSS.supports('container-type: inline-size')", url: MDN + 'CSS/CSS_containment/Container_queries',
                        test: function () { return cssOk('container-type: inline-size'); } },
    'css:view-transitions': { label: 'View Transitions', how: "'startViewTransition' in document", url: MDN + 'API/View_Transition_API',
                        test: function () { return has(document, 'startViewTransition'); } },
    'html:popover':   { label: 'Popover API', how: "'popover' in HTMLElement.prototype", url: MDN + 'API/Popover_API',
                        test: function () { return typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype; } },
    'html:dialog':    { label: '<dialog>', how: "typeof HTMLDialogElement", url: MDN + 'HTML/Element/dialog',
                        test: function () { return typeof window.HTMLDialogElement === 'function'; } },
    'js:temporal':    { label: 'Temporal', how: "typeof Temporal", url: MDN + 'JavaScript/Reference/Global_Objects/Temporal',
                        test: function () { return typeof window.Temporal !== 'undefined'; } },
    'js:groupBy':     { label: 'Object.groupBy', how: "typeof Object.groupBy", url: MDN + 'JavaScript/Reference/Global_Objects/Object/groupBy',
                        test: function () { return typeof Object.groupBy === 'function'; } },
    'js:toSorted':    { label: 'Array.prototype.toSorted', how: "typeof [].toSorted", url: MDN + 'JavaScript/Reference/Global_Objects/Array/toSorted',
                        test: function () { return typeof [].toSorted === 'function'; } },
    'js:structuredClone': { label: 'structuredClone', how: "typeof structuredClone", url: MDN + 'API/Window/structuredClone',
                        test: function () { return typeof window.structuredClone === 'function'; } },
    'js:withResolvers': { label: 'Promise.withResolvers', how: "typeof Promise.withResolvers", url: MDN + 'JavaScript/Reference/Global_Objects/Promise/withResolvers',
                        test: function () { return typeof Promise.withResolvers === 'function'; } },
    'js:abortTimeout': { label: 'AbortSignal.timeout', how: "typeof AbortSignal.timeout", url: MDN + 'API/AbortSignal/timeout_static',
                        test: function () { return typeof window.AbortSignal === 'function' && typeof AbortSignal.timeout === 'function'; } },
    'js:iteratorHelpers': { label: 'iterator helpers', how: "typeof Iterator.prototype.map", url: MDN + 'JavaScript/Reference/Global_Objects/Iterator',
                        test: function () { return typeof window.Iterator === 'function' && typeof Iterator.prototype.map === 'function'; } },
    'html:inert':     { label: 'inert', how: "'inert' in HTMLElement.prototype", url: MDN + 'HTML/Global_attributes/inert',
                        test: function () { return typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype; } },
    'html:mathml':    { label: 'MathML', how: 'ширина <mspace width="77px"> после вставки в документ', url: MDN + 'MathML',
                        test: function () {
                          // Единственный надёжный способ: вставить элемент и посмотреть, применил ли браузер размеры.
                          var NS = 'http://www.w3.org/1998/Math/MathML';
                          var m = document.createElementNS(NS, 'math');
                          var sp = document.createElementNS(NS, 'mspace');
                          sp.setAttribute('width', '77px');
                          sp.setAttribute('height', '23px');
                          m.appendChild(sp);
                          m.style.cssText = 'position:absolute;visibility:hidden';
                          document.body.appendChild(m);
                          var w = sp.getBoundingClientRect().width;
                          m.remove();
                          return Math.round(w) === 77;
                        } },
    'html:custom-elements': { label: 'Custom Elements и Shadow DOM', how: "'customElements' in window && 'attachShadow' in Element.prototype", url: MDN + 'API/Web_components',
                        test: function () { return 'customElements' in window && typeof Element !== 'undefined' && 'attachShadow' in Element.prototype; } },
    'api:clipboard':  { label: 'Clipboard API', how: "navigator.clipboard.writeText", url: MDN + 'API/Clipboard_API',
                        test: function () { return !!(navigator.clipboard && typeof navigator.clipboard.writeText === 'function'); } },
    'api:camera':     { label: 'getUserMedia', how: "navigator.mediaDevices.getUserMedia", url: MDN + 'API/MediaDevices/getUserMedia',
                        test: function () { return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'); } },
    'api:screen-capture': { label: 'Screen Capture', how: "navigator.mediaDevices.getDisplayMedia", url: MDN + 'API/Screen_Capture_API',
                        test: function () { return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function'); } },
    'api:pip':        { label: 'Picture-in-Picture', how: "document.pictureInPictureEnabled", url: MDN + 'API/Picture-in-Picture_API',
                        test: function () { return document.pictureInPictureEnabled === true; } },
    'api:share':      { label: 'Web Share', how: "typeof navigator.share", url: MDN + 'API/Navigator/share',
                        test: function () { return typeof navigator.share === 'function'; } },
    'api:permissions': { label: 'Permissions API', how: "navigator.permissions.query", url: MDN + 'API/Permissions_API',
                        test: function () { return !!(navigator.permissions && typeof navigator.permissions.query === 'function'); } },
    'api:serviceworker': { label: 'Service Worker', how: "'serviceWorker' in navigator", url: MDN + 'API/Service_Worker_API',
                        test: function () { return 'serviceWorker' in navigator; } },
    'api:worker':     { label: 'Web Workers', how: "typeof Worker", url: MDN + 'API/Web_Workers_API',
                        test: function () { return typeof window.Worker === 'function'; } },
    'api:wasm':       { label: 'WebAssembly', how: "typeof WebAssembly", url: MDN + 'WebAssembly',
                        test: function () { return typeof window.WebAssembly === 'object'; } },
    'api:webcodecs':  { label: 'WebCodecs', how: "typeof VideoEncoder", url: MDN + 'API/WebCodecs_API',
                        test: function () { return typeof window.VideoEncoder === 'function'; } },
    'api:indexeddb':  { label: 'IndexedDB', how: "typeof indexedDB", url: MDN + 'API/IndexedDB_API',
                        test: function () { return typeof window.indexedDB === 'object' && window.indexedDB !== null; } },
    'api:speculation': { label: 'Speculation Rules', how: "HTMLScriptElement.supports('speculationrules')", url: MDN + 'API/Speculation_Rules_API',
                        test: function () { return typeof HTMLScriptElement !== 'undefined' && typeof HTMLScriptElement.supports === 'function' && HTMLScriptElement.supports('speculationrules'); } }
  };

  /** Результат проверки по ключу. Неизвестный ключ — это ошибка автора, а не «нет поддержки». */
  function supports(key) {
    var c = CHECKS[key];
    if (!c) {
      return { key: key, ok: false, label: key, how: 'такой проверки нет в таблице CHECKS', url: '', unknown: true };
    }
    var ok = false;
    try { ok = !!c.test(); } catch (e) { ok = false; }
    return { key: key, ok: ok, label: c.label, how: c.how, url: c.url };
  }

  // ---------------------------------------------------------------------------
  // 3. Маленькие помощники DOM. Весь текст вставляется через textContent, не innerHTML.
  // ---------------------------------------------------------------------------
  function el(tag, props, text) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === 'class') node.className = props[k];
        else node.setAttribute(k, props[k]);
      });
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // Невидимая для глаз, но читаемая скринридером область для объявлений.
  var liveRegion = null;
  var liveTimer = 0;
  function announce(text) {
    if (!liveRegion) {
      liveRegion = el('div', { 'class': 'demo-sr', 'aria-live': 'polite', 'aria-atomic': 'true', id: 'demo-live' });
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    clearTimeout(liveTimer);
    // Небольшая задержка нужна, чтобы повторное одинаковое сообщение тоже озвучилось.
    liveTimer = setTimeout(function () { liveRegion.textContent = text; }, 40);
  }

  // ---------------------------------------------------------------------------
  // 4. Бейдж поддержки
  // ---------------------------------------------------------------------------
  function badge(key) {
    var r = supports(key);
    var node = el('span', { 'class': 'support-badge', 'data-ok': r.ok ? 'yes' : 'no' });
    node.textContent = (r.ok ? '✓ ' : '✗ ') + r.label + (r.ok ? ': есть' : ': нет');
    node.title = 'Проверка в вашем браузере: ' + r.how;
    node.setAttribute('aria-label', r.label + (r.ok ? ': поддерживается' : ': не поддерживается') + ' (проверка: ' + r.how + ')');
    return node;
  }

  /** Заменяет все <span data-support="css:has"></span> на живой бейдж. */
  function enhanceBadges(root) {
    var nodes = (root || document).querySelectorAll('[data-support]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-support');
      nodes[i].replaceWith(badge(key));
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Область ресурсов (scope) — единый контракт очистки
  //    Всё, что создаёт пример, создаётся через scope и снимается через dispose().
  //    totals — глобальные счётчики «сколько сейчас живо», их видно в Demo.stats().
  // ---------------------------------------------------------------------------
  var totals = { listeners: 0, timers: 0, frames: 0, observers: 0, urls: 0, other: 0 };

  function createScope() {
    var releasers = [];

    // track запоминает, как освободить ресурс, и считает его в totals.
    function track(kind, release) {
      var done = false;
      totals[kind]++;
      var r = function () {
        if (done) return;          // освобождать дважды безопасно
        done = true;
        totals[kind]--;
        var i = releasers.indexOf(r);
        if (i > -1) releasers.splice(i, 1);
        release();
      };
      releasers.push(r);
      return r;
    }

    return {
      on: function (target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        return track('listeners', function () { target.removeEventListener(type, fn, opts); });
      },
      timeout: function (fn, ms) {
        var rel;
        var id = setTimeout(function () { rel(); fn(); }, ms);
        rel = track('timers', function () { clearTimeout(id); });
        return rel;
      },
      interval: function (fn, ms) {
        var id = setInterval(fn, ms);
        return track('timers', function () { clearInterval(id); });
      },
      raf: function (fn) {
        var rel;
        var id = requestAnimationFrame(function (t) { rel(); fn(t); });
        rel = track('frames', function () { cancelAnimationFrame(id); });
        return rel;
      },
      // Наблюдатель (IntersectionObserver, ResizeObserver, MutationObserver…): disconnect при очистке.
      observe: function (observer) {
        track('observers', function () { observer.disconnect(); });
        return observer;
      },
      blobURL: function (blob) {
        var url = URL.createObjectURL(blob);
        track('urls', function () { URL.revokeObjectURL(url); });
        return url;
      },
      // Любая своя очистка: остановить медиапоток, закрыть Worker, abort() запроса.
      onCleanup: function (fn) { return track('other', fn); },
      dispose: function () {
        // С конца: что создано позже, освобождается раньше.
        while (releasers.length) {
          try { releasers[releasers.length - 1](); } catch (e) { console.error('Ошибка очистки примера:', e); }
        }
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 6. Реестр примеров: контент в HTML, реализация — в регистрации по id
  // ---------------------------------------------------------------------------
  var registry = Object.create(null);

  /**
   * def: {
   *   title:   'Название',            // обязательно
   *   mode:    'sandbox' | 'host',    // обязательно
   *   note:    'Пояснение под заголовком',
   *   needs:   { support: ['api:camera'], secure: true, server: 'почему нужен сервер' },
   *   badges:  ['css:has'],           // бейджи поддержки в шапке
   *   // для sandbox:
   *   kind: 'html' | 'js', code: '...', scaffold: '<p>…</p>', scripts: true|false, height: 220, editable: true,
   *   // для host:
   *   code: 'код для показа читателю', init: function (ctx) { ... return cleanup; }
   * }
   */
  function register(id, def) {
    if (registry[id]) throw new Error('Пример "' + id + '" уже зарегистрирован');
    if (!def || !def.title) throw new Error('У примера "' + id + '" нет title');
    if (def.mode !== 'sandbox' && def.mode !== 'host') throw new Error('У примера "' + id + '" mode должен быть sandbox или host');
    if (def.mode === 'host' && typeof def.init !== 'function') throw new Error('У host-примера "' + id + '" нет init(ctx)');
    registry[id] = def;
  }

  // ---------------------------------------------------------------------------
  // 7. Песочница: единственное место, где исполняется код читателя
  // ---------------------------------------------------------------------------

  // ГРАНИЦА БЕЗОПАСНОСТИ. Код читателя попадает в iframe, и только туда.
  //  - Без allow-same-origin у документа в iframe opaque origin ("null"):
  //    ему недоступны window.parent.document, localStorage, cookie родителя.
  //  - allow-scripts добавляется только если пример объявил scripts: true.
  //  - Нет allow-forms, allow-popups, allow-top-navigation, allow-modals: формы не отправятся,
  //    окна не откроются, родителя не перенаправить.
  //  - Внутри ещё и CSP через <meta>: сеть закрыта (default-src 'none'), картинки только data:.
  var SANDBOX_SCRIPTS = 'allow-scripts';
  var SANDBOX_NONE = '';
  var CSP_BASE = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; form-action 'none'";

  // Перехват console и ошибок внутри iframe. Это код автора; он шлёт сообщения родителю.
  function bootstrapSource(token) {
    return '(function(){var T=' + JSON.stringify(token) + ';' +
      'function send(t,x){parent.postMessage({demo:T,type:t,text:String(x)},"*");}' +
      'function fmt(a){return Array.prototype.map.call(a,function(v){try{' +
      'return typeof v==="string"?v:(typeof v==="object"&&v!==null?JSON.stringify(v):String(v));' +
      '}catch(e){return String(v);}}).join(" ");}' +
      '["log","info","warn","error"].forEach(function(k){var o=console[k];' +
      'console[k]=function(){send(k,fmt(arguments));o.apply(console,arguments);};});' +
      'window.addEventListener("error",function(e){send("error",(e.message||"Ошибка")+(e.lineno?" (строка "+e.lineno+")":""));});' +
      'window.addEventListener("unhandledrejection",function(e){send("error","Необработанный reject: "+(e.reason&&e.reason.message||e.reason));});' +
      '})();';
  }

  function buildSrcdoc(def, code, token) {
    var csp = CSP_BASE + (def.scripts ? "; script-src 'unsafe-inline'" : '');
    var body;
    if (def.kind === 'js') {
      // Защита от преждевременного закрытия тега <script> внутри строки.
      body = (def.scaffold || '') + '<script>' + code.replace(/<\/script/gi, '<\\/script') + '<\/script>';
    } else {
      body = code;
    }
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8">' +
      '<meta http-equiv="Content-Security-Policy" content="' + csp + '">' +
      '<style>body{font:15px/1.5 system-ui,sans-serif;margin:12px;color:#172033}</style>' +
      (def.scripts ? '<script>' + bootstrapSource(token) + '<\/script>' : '') +
      '</head><body>' + body + '</body></html>';
  }

  // ---------------------------------------------------------------------------
  // 8. Экземпляры примеров: оболочка, состояния, жизненный цикл
  // ---------------------------------------------------------------------------
  var STATE_LABEL = {
    idle: 'ждёт появления на экране',
    running: 'работает',
    unsupported: 'не поддерживается браузером',
    secure: 'нужен защищённый контекст',
    server: 'нужен сервер',
    error: 'ошибка исполнения',
    suspended: 'приостановлен'
  };

  var MAX_RUNNING = 6;       // одновременно «живых» примеров не больше
  var instances = [];
  var seq = 0;
  var io = null;
  var messageHooked = false;

  function setState(inst, state) {
    inst.state = state;
    inst.root.setAttribute('data-state', state);
    inst.stateEl.textContent = STATE_LABEL[state] || state;
  }

  function showError(inst, err) {
    var msg = err && err.message ? err.message : String(err);
    inst.errorEl.hidden = false;
    inst.errorEl.textContent = 'Ошибка: ' + msg;
    announce('Ошибка в примере «' + inst.def.title + '»: ' + msg);
  }
  function clearError(inst) { inst.errorEl.hidden = true; inst.errorEl.textContent = ''; }

  /** Проверяет требования примера. Возвращает null, если можно запускать, иначе — состояние и объяснение. */
  function checkNeeds(def) {
    var n = def.needs || {};
    if (n.server && !env.isHttp) {
      return {
        state: 'server',
        title: 'Нужен сервер',
        text: 'Этот пример делает настоящий сетевой запрос: ' + n.server +
          ' Сейчас страница открыта по протоколу ' + env.protocol + ', а запускать пример нужно через http: или https:. ' +
          'Откройте сайт на GitHub Pages или запустите в папке сайта локальный сервер: python3 -m http.server 8000 (затем http://localhost:8000).'
      };
    }
    if (n.secure && !env.secure) {
      return {
        state: 'secure',
        title: 'Нужен защищённый контекст',
        text: 'Этот API доступен только в защищённом контексте, а браузер сообщил window.isSecureContext = false ' +
          '(протокол ' + env.protocol + '). Защищённым обычно считаются https:, http://localhost и (зависит от браузера) file:. ' +
          'Откройте страницу через https: или http://localhost.'
      };
    }
    var missing = (n.support || []).map(supports).filter(function (r) { return !r.ok; });
    if (missing.length) {
      return {
        state: 'unsupported',
        title: 'Не поддерживается этим браузером',
        text: 'Не найдено: ' + missing.map(function (r) { return r.label + ' (проверка: ' + r.how + ')'; }).join('; ') +
          '. Это не ошибка примера: так проверяется поддержка возможности. Попробуйте актуальную версию другого браузера и сверьтесь с MDN и Can I Use.',
        missing: missing
      };
    }
    return null;
  }

  function showGate(inst, gate) {
    stop(inst, true);
    clear(inst.live);
    var box = el('div', { 'class': 'demo-gate', 'data-gate': gate.state });
    box.appendChild(el('p', { 'class': 'demo-gate-title' }, gate.title));
    box.appendChild(el('p', null, gate.text));
    if (gate.missing) {
      var row = el('p', { 'class': 'demo-gate-badges' });
      gate.missing.forEach(function (r) { row.appendChild(badge(r.key)); });
      box.appendChild(row);
    }
    inst.live.appendChild(box);
    setState(inst, gate.state);
    announce('Пример «' + inst.def.title + '»: ' + gate.title);
  }

  function textOfCode(inst) {
    return inst.textarea ? inst.textarea.value : (inst.def.code || '');
  }

  function appendConsoleLine(inst, kind, text) {
    if (!inst.consoleEl) return;
    var line = el('div', { 'class': 'demo-line demo-line-' + kind });
    line.textContent = text.length > 500 ? text.slice(0, 500) + '…' : text;
    inst.consoleEl.appendChild(line);
    while (inst.consoleEl.childNodes.length > 100) inst.consoleEl.removeChild(inst.consoleEl.firstChild);
  }

  function runSandbox(inst) {
    var def = inst.def;
    var flags = def.scripts ? SANDBOX_SCRIPTS : SANDBOX_NONE;
    // Страховка: если кто-то когда-нибудь добавит allow-same-origin, пример откажется работать.
    if (/allow-same-origin/.test(flags)) throw new Error('allow-same-origin запрещён: это граница безопасности');

    clear(inst.live);
    inst.token = 'd' + (++seq) + Math.random().toString(36).slice(2, 8);
    var frame = el('iframe', { 'class': 'demo-frame', title: 'Результат: ' + def.title });
    frame.setAttribute('sandbox', flags);
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.style.height = (def.height || 220) + 'px';
    frame.srcdoc = buildSrcdoc(def, textOfCode(inst), inst.token);
    inst.frame = frame;
    inst.live.appendChild(frame);

    inst.consoleEl = null;
    if (def.scripts) {
      inst.consoleEl = el('div', { 'class': 'demo-console', role: 'log', 'aria-label': 'Вывод console' });
      inst.live.appendChild(inst.consoleEl);
    }

    inst.scope.onCleanup(function () {
      inst.token = null;
      inst.frame = null;
      frame.removeAttribute('srcdoc');
      frame.remove();
    });
  }

  function runHost(inst) {
    clear(inst.live);
    var scope = inst.scope;
    var runId = ++inst.runId;
    var ctx = {
      live: inst.live,
      env: env,
      supports: supports,
      badge: badge,
      el: el,
      clear: clear,
      say: announce,
      stats: stats,
      on: scope.on, timeout: scope.timeout, interval: scope.interval, raf: scope.raf,
      observe: scope.observe, blobURL: scope.blobURL, onCleanup: scope.onCleanup,
      // Асинхронные ошибки примера тоже попадают в панель ошибок.
      fail: function (e) { showError(inst, e); setState(inst, 'error'); },
      get reducedMotion() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
    };
    var result = inst.def.init(ctx);
    if (result && typeof result.then === 'function') {
      result.then(function (cleanup) {
        if (typeof cleanup !== 'function') return;
        // Если пример уже остановили, пока init ждал, чистим сразу.
        if (inst.runId !== runId || !inst.running) cleanup(); else scope.onCleanup(cleanup);
      }, ctx.fail);
    } else if (typeof result === 'function') {
      scope.onCleanup(result);
    }
  }

  function start(inst) {
    if (inst.running) return;
    clearError(inst);
    var gate = checkNeeds(inst.def);
    if (gate) { showGate(inst, gate); return; }

    inst.scope = createScope();
    inst.running = true;
    inst.startedAt = ++seq;
    enforceCap(inst);
    try {
      if (inst.def.mode === 'sandbox') runSandbox(inst); else runHost(inst);
      if (inst.state !== 'error') setState(inst, 'running');
    } catch (e) {
      showError(inst, e);
      stop(inst, true);
      setState(inst, 'error');
    }
  }

  /** Останавливает пример и освобождает ВСЁ, что он создал. keepState — не менять состояние. */
  function stop(inst, keepState) {
    if (inst.scope) { inst.scope.dispose(); inst.scope = null; }
    inst.running = false;
    inst.runId++;
    inst.consoleEl = null;
    if (!keepState) {
      clear(inst.live);
      inst.live.appendChild(el('p', { 'class': 'demo-idle' },
        'Пример приостановлен, чтобы не нагружать страницу. Он запустится снова, когда окажется на экране, или нажмите «Запустить».'));
      setState(inst, 'suspended');
    }
  }

  function restart(inst) {
    if (inst.running) stop(inst, true);
    start(inst);
  }

  // Лимит одновременных примеров: самый «старый» работающий приостанавливается.
  function enforceCap(except) {
    var running = instances.filter(function (i) { return i.running && i !== except; });
    while (running.length + 1 > MAX_RUNNING) {
      running.sort(function (a, b) { return a.startedAt - b.startedAt; });
      stop(running.shift());
    }
  }

  // Единственный обработчик сообщений из всех iframe.
  // Проверяем ИСТОЧНИК (event.source), а не origin: у песочницы origin равен "null".
  function onMessage(e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || typeof d.demo !== 'string') return;
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (inst.frame && e.source === inst.frame.contentWindow && d.demo === inst.token) {
        var kind = ['log', 'info', 'warn', 'error'].indexOf(d.type) > -1 ? d.type : 'log';
        appendConsoleLine(inst, kind, String(d.text));
        return;
      }
    }
  }

  // Кнопка «Копировать»: Clipboard API, а если он недоступен — запасной путь.
  function copyText(text, returnFocusTo) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && env.secure) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      // Запасной путь через устаревший execCommand: другого способа без Clipboard API нет.
      var ta = el('textarea', { readonly: '', 'aria-hidden': 'true' });
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      if (returnFocusTo) returnFocusTo.focus();
      if (ok) resolve(); else reject(new Error('Clipboard API недоступен, а запасной способ не сработал'));
    });
  }

  var copyTimer = 0;
  function makeCopyButton(getText, label) {
    var btn = el('button', { type: 'button', 'class': 'code-copy', 'aria-label': label || 'Копировать код' }, 'Копировать');
    btn.title = 'Работает через Clipboard API, см. раздел «Web API» в разделе JavaScript';
    btn.addEventListener('click', function () {
      copyText(getText(), btn).then(function () {
        btn.textContent = 'Скопировано';
        announce('Код скопирован в буфер обмена');
      }, function (err) {
        btn.textContent = 'Не удалось';
        announce('Не удалось скопировать: ' + err.message);
      }).then(function () {
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () { btn.textContent = 'Копировать'; }, 1800);
      });
    });
    return btn;
  }

  /** Кнопка «Копировать» на каждом блоке кода сайта. Текст страницы при этом не меняется. */
  function enhanceCodeBlocks() {
    var pres = document.querySelectorAll('pre');
    for (var i = 0; i < pres.length; i++) {
      var pre = pres[i];
      if (pre.closest('.demo-shell') || (pre.parentNode && pre.parentNode.classList.contains('code-block'))) continue;
      var wrap = el('div', { 'class': 'code-block' });
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      wrap.appendChild(makeCopyButton((function (p) { return function () { return p.textContent; }; })(pre)));
    }
  }

  var nextId = 0;
  function mount(host) {
    var id = host.getAttribute('data-demo');
    var def = registry[id];
    var n = ++nextId;

    var root = el('section', { 'class': 'demo-shell', 'aria-labelledby': 'demo-title-' + n });
    var head = el('div', { 'class': 'demo-head' });
    head.appendChild(el('h4', { 'class': 'demo-title', id: 'demo-title-' + n }, def ? def.title : 'Пример «' + id + '»'));
    var stateEl = el('span', { 'class': 'demo-state' });
    head.appendChild(stateEl);
    root.appendChild(head);

    var inst = {
      id: id, def: def || { title: id, mode: 'host' }, root: root, stateEl: stateEl,
      running: false, state: 'idle', scope: null, runId: 0, startedAt: 0,
      shell: createScope(), token: null, frame: null, consoleEl: null, textarea: null
    };

    if (!def) {
      // Опечатка в data-demo или забытая регистрация: говорим об этом вслух, а не молчим.
      inst.live = el('div', { 'class': 'demo-live' });
      inst.errorEl = el('div', { 'class': 'demo-error', role: 'alert' });
      root.appendChild(inst.live); root.appendChild(inst.errorEl);
      host.replaceChildren(root);
      showError(inst, new Error('пример "' + id + '" не зарегистрирован (Demo.register)'));
      setState(inst, 'error');
      return inst;
    }

    var meta = el('p', { 'class': 'demo-meta' });
    meta.appendChild(document.createTextNode(def.mode === 'sandbox'
      ? 'Режим: изолированный iframe (sandbox). '
      : 'Режим: в этом документе, код написан автором сайта. '));
    (def.badges || []).forEach(function (key) { meta.appendChild(badge(key)); });
    root.appendChild(meta);
    if (def.note) root.appendChild(el('p', { 'class': 'demo-note' }, def.note));

    var body = el('div', { 'class': 'demo-body' });

    // Панель кода
    var codeCol = el('div', { 'class': 'demo-code' });
    var editable = def.mode === 'sandbox' && def.editable !== false;
    var codeLabelId = 'demo-code-' + n;
    if (def.code != null) {
      if (editable) {
        codeCol.appendChild(el('label', { 'for': codeLabelId, 'class': 'demo-label' }, 'Код (можно править; Ctrl+Enter — запустить)'));
        var ta = el('textarea', { id: codeLabelId, 'class': 'demo-textarea', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', wrap: 'off' });
        ta.value = def.code;
        ta.rows = Math.min(Math.max(def.code.split('\n').length + 1, 5), 18);
        inst.textarea = ta;
        codeCol.appendChild(ta);
      } else {
        codeCol.appendChild(el('p', { 'class': 'demo-label', id: codeLabelId }, 'Код примера'));
        var pre = el('pre', { 'class': 'demo-pre', tabindex: '0', 'aria-labelledby': codeLabelId });
        pre.appendChild(el('code', null, def.code));
        codeCol.appendChild(pre);
      }
    }
    if (def.code == null) body.classList.add('demo-body-single');   // нет кода — одна колонка
    body.appendChild(codeCol);

    // Живая панель
    var liveCol = el('div', { 'class': 'demo-result' });
    liveCol.appendChild(el('p', { 'class': 'demo-label' }, 'Результат'));
    inst.live = el('div', { 'class': 'demo-live' });
    liveCol.appendChild(inst.live);
    body.appendChild(liveCol);
    root.appendChild(body);

    // Панель управления
    var bar = el('div', { 'class': 'demo-toolbar' });
    var runBtn = el('button', { type: 'button', 'class': 'demo-btn' }, 'Запустить');
    var resetBtn = el('button', { type: 'button', 'class': 'demo-btn' }, 'Сбросить');
    bar.appendChild(runBtn);
    bar.appendChild(resetBtn);
    if (def.code != null) bar.appendChild(makeCopyButton(function () { return textOfCode(inst); }, 'Копировать код примера «' + def.title + '»'));
    root.appendChild(bar);

    inst.errorEl = el('div', { 'class': 'demo-error', role: 'alert' });
    inst.errorEl.hidden = true;
    root.appendChild(inst.errorEl);

    // Подводные камни и ограничения: нативный <details>, работает без единой строки JS.
    if (def.pitfalls && def.pitfalls.length) {
      var pit = el('details', { 'class': 'demo-pitfalls' });
      pit.appendChild(el('summary', null, 'Подводные камни и ограничения (' + def.pitfalls.length + ')'));
      var pl = el('ul');
      def.pitfalls.forEach(function (t) { pl.appendChild(el('li', null, t)); });
      pit.appendChild(pl);
      root.appendChild(pit);
    }

    // Слушатели оболочки живут, пока жив пример (снимаются в destroy).
    inst.shell.on(runBtn, 'click', function () { restart(inst); });
    inst.shell.on(resetBtn, 'click', function () {
      if (inst.textarea) inst.textarea.value = def.code;
      restart(inst);
    });
    if (inst.textarea) {
      inst.shell.on(inst.textarea, 'input', function () {
        // Живой перезапуск с задержкой, чтобы не пересоздавать iframe на каждую букву.
        if (inst.debounce) inst.debounce();
        inst.debounce = inst.shell.timeout(function () { restart(inst); }, 500);
      });
      inst.shell.on(inst.textarea, 'keydown', function (e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); restart(inst); }
      });
    }

    host.replaceChildren(root);
    setState(inst, 'idle');
    return inst;
  }

  /** Полностью убирает пример: останавливает и снимает слушатели оболочки. */
  function destroy(inst) {
    stop(inst, true);
    inst.shell.dispose();
    var i = instances.indexOf(inst);
    if (i > -1) instances.splice(i, 1);
    if (io) io.unobserve(inst.root);
  }

  function mountAll(root) {
    var hosts = (root || document).querySelectorAll('[data-demo]');
    for (var i = 0; i < hosts.length; i++) {
      // Повторный вызов не должен монтировать уже готовые примеры второй раз.
      if (hosts[i].hasAttribute('data-demo-ready')) continue;
      hosts[i].setAttribute('data-demo-ready', '');
      var inst = mount(hosts[i]);
      instances.push(inst);
      if (inst.def && registry[inst.id]) {
        if (io) io.observe(inst.root); else start(inst);   // без IntersectionObserver запускаем сразу
      }
    }
  }

  function stats() {
    return {
      totals: Object.assign({}, totals),
      running: instances.filter(function (i) { return i.running; }).length,
      instances: instances.map(function (i) { return { id: i.id, state: i.state, running: i.running }; })
    };
  }

  function init() {
    if (!messageHooked) { window.addEventListener('message', onMessage); messageHooked = true; }
    enhanceCodeBlocks();
    enhanceBadges();
    if ('IntersectionObserver' in window) {
      // Один наблюдатель на всё время жизни страницы. Запуск — при появлении, остановка — при уходе.
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var inst = instances.filter(function (i) { return i.root === entry.target; })[0];
          if (!inst) return;
          if (entry.isIntersecting) start(inst);
          else if (inst.running) stop(inst);
        });
      }, { rootMargin: '150px 0px' });
    }
    mountAll(document);
  }

  window.Demo = Object.freeze({
    register: register,
    supports: supports,
    supportKeys: function () { return Object.keys(CHECKS); },
    badge: badge,
    env: env,
    stats: stats,
    announce: announce,
    mountAll: mountAll,
    destroy: destroy
  });

  // Скрипты с defer выполняются ДО DOMContentLoaded, когда readyState уже "interactive".
  // Поэтому ждём DOMContentLoaded: к этому моменту зарегистрированы все файлы с примерами.
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
