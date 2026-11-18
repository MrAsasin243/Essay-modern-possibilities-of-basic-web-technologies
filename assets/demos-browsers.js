/*
 * assets/demos-browsers.js — примеры раздела «Браузеры» (browsers.html).
 * Режим host: код написан автором сайта. Читатель вводит только ДАННЫЕ (адреса, значения
 * выпадающих списков, флажки); данные не попадают в eval, new Function и innerHTML.
 * Пример CSP строит политику из фиксированных токенов по флажкам и показывает её в iframe
 * с sandbox="allow-scripts" (без allow-same-origin).
 * Сторонние серверы не используются: примеры про CORS считают решение браузера по правилам
 * спецификации, а настоящий запрос делают только к собственному origin сайта.
 */
(function () {
  'use strict';

  var uid = 0;

  // ---------- Небольшие помощники ----------
  function h(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    if (text != null) n.textContent = text;
    return n;
  }
  function add(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function labelled(text, control) {
    var l = h('label', { 'class': 'demo-field' }); l.appendChild(document.createTextNode(text)); l.appendChild(control); return l;
  }
  function select(options, value) {
    var s = h('select');
    options.forEach(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; s.appendChild(h('option', { value: v }, t)); });
    if (value != null) s.value = value;
    return s;
  }
  function btn(text) { return h('button', { type: 'button' }, text); }
  function check(text) { var c = h('input', { type: 'checkbox' }), l = h('label'); l.appendChild(c); l.appendChild(document.createTextNode(' ' + text)); return { input: c, label: l }; }
  function range(min, max, value, step) { return h('input', { type: 'range', min: String(min), max: String(max), value: String(value), step: String(step || 1) }); }
  function errText(e) { return (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e)); }
  function tableOf(headers, rows, cls) {
    var wrap = h('div', { 'class': 'table-wrap' }), t = h('table', cls ? { 'class': cls } : null), tr = h('tr');
    headers.forEach(function (x) { tr.appendChild(h('th', { scope: 'col' }, x)); });
    add(t, add(h('thead'), tr));
    var tb = h('tbody'); rows.forEach(function (r) { tb.appendChild(r); }); t.appendChild(tb); wrap.appendChild(t);
    return wrap;
  }

  // ==========================================================================
  // Общие функции для origin / site
  // ==========================================================================
  var DEFAULT_PORT = { 'http:': '80', 'https:': '443', 'ws:': '80', 'wss:': '443', 'ftp:': '21' };
  var SUFFIXES = ['co.uk', 'org.uk', 'com.au', 'github.io', 'herokuapp.com', 'vercel.app', 'pages.dev', 'netlify.app', 'blogspot.com'];

  function parseURL(s) { try { return new URL(s); } catch (e) { return null; } }
  function info(u) {
    var origin = u.origin;
    return {
      origin: origin, opaque: origin === 'null', scheme: u.protocol.replace(':', ''), host: u.hostname,
      port: u.port || DEFAULT_PORT[u.protocol] || '', protocol: u.protocol
    };
  }
  function sameOrigin(a, b) { var x = info(a), y = info(b); return !x.opaque && !y.opaque && x.origin === y.origin; }
  /** Приблизительный «регистрируемый домен». Настоящий нужен Public Suffix List, здесь мини-список. */
  function site(host) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.indexOf(':') > -1 || host.indexOf('.') < 0) return host;
    var labels = host.split('.'), i;
    for (i = 0; i < SUFFIXES.length; i++) {
      var suf = SUFFIXES[i];
      if (host === suf) return host;
      if (host.slice(-(suf.length + 1)) === '.' + suf) return labels.slice(-(suf.split('.').length + 1)).join('.');
    }
    return labels.slice(-2).join('.');
  }

  // ---------- Подводные камни и ограничения ----------
  var PITFALLS = {
    'bw-cost': [
      'Счётчик измеряет частоту кадров главного потока через requestAnimationFrame. CSS-анимация transform может выполняться в потоке композитора и оставаться плавной на экране, даже когда главный поток занят: это и есть причина её дешевизны. Поэтому цифры показывают нагрузку на главный поток, а не всё, что видит глаз.',
      'Разница зависит от устройства и от нагрузки. На мощном компьютере при малом числе соседних элементов обе анимации идут на полной частоте. Увеличьте «нагрузку» ползунком, чтобы увидеть разницу. Частота экрана (60, 120 Гц) и режим энергосбережения тоже влияют на результат.',
      'width меняет геометрию, и браузер пересчитывает раскладку для всех соседей. В примере они стоят в одном flex-контейнере с переносом, поэтому каждое изменение ширины сдвигает их все. transform раскладку не трогает. Это согласуется с таблицей выше, но «иногда достаточно Composite» остаётся ориентиром: итог зависит от слоя и движка.',
      'Тесты идут по очереди (по 3 секунды), чтобы одна анимация не мешала измерять другую. «Показать обе» запускает их одновременно только для наглядности, без измерения.',
      'В фоновой вкладке requestAnimationFrame не вызывается: результат будет пустым или недостоверным.',
      'Один запуск ничего не доказывает: первый прогон «прогревает» движок и кэши. Повторите 2–3 раза и сравнивайте на одном устройстве.',
      'Открытые DevTools заметно меняют тайминги. Для честных измерений закройте их или используйте запись на вкладке Performance.',
      'Очень большая нагрузка (4000–6000 элементов на слабом устройстве) может на заметное время подвесить вкладку. Начинайте с малых значений.',
      'При включённом «уменьшении движения» пример требует отдельного подтверждения, потому что движение здесь — предмет демонстрации, а не украшение.'
    ],
    'bw-pipeline': [
      'Таблица — ориентир, как и в тексте раздела. Какие стадии потребуются, зависит от движка, версии, слоя элемента и оборудования. Точную картину даёт вкладка Performance в DevTools.',
      'Стадия Style тоже не бесплатна: сложные селекторы и большие деревья дорого пересчитывать, даже если геометрия не меняется.',
      'Чтение геометрии (offsetWidth, getBoundingClientRect) после записи стилей заставляет браузер выполнить layout немедленно и синхронно. Чередование записей и чтений в цикле — «layout thrashing».',
      'Composite не бесплатен: каждый слой занимает память (в том числе видеопамять), а чрезмерное использование will-change вредит.',
      'Изменение transform может потребовать paint, если элемент не получил отдельный слой. «Только Composite» работает не всегда.',
      'Движки оптимизируют: layout бывает частичным, а contain и content-visibility помогают ограничить его область. Поэтому «Layout» в таблице не означает пересчёт всей страницы.',
      'Прокрутка часто сводится к Composite, но fixed- и sticky-элементы, обработчики scroll и изменение геометрии могут это изменить.'
    ],
    'bw-origin': [
      'Вычисление origin делает сам браузер через new URL(). Для file:, data: и about: большинство браузеров возвращает «null» (непрозрачный origin). Такой origin не равен никакому другому и даже самому себе.',
      'Порт по умолчанию нормализуется: https://a.com и https://a.com:443 — один origin. Хост регистронезависим, а международные имена приводятся к punycode.',
      'Same-site определяется по «регистрируемому домену», а для его точного вычисления нужен Public Suffix List. Здесь встроен лишь маленький список примеров, поэтому для многих доменов вердикт приблизителен.',
      'Origin, site и домен cookie — три разные вещи. У cookie свои правила (Domain, Path, SameSite), и они не совпадают с правилами Same-Origin Policy.',
      'document.domain устарел. Использовать его для ослабления Same-Origin Policy нельзя.',
      'blob:-адреса наследуют origin страницы, которая их создала, поэтому blob:https://example.com/… относится к origin https://example.com.',
      'На GitHub Pages все страницы одного пользователя (username.github.io) — один origin: у них общие localStorage и cookie. Разные пользователи — разные сайты, потому что github.io есть в Public Suffix List.'
    ],
    'bw-cors': [
      'Это реализация правил спецификации Fetch, а не настоящий запрос: сайт принципиально не обращается к чужим серверам. Результат — то, какое решение принял бы браузер, и какие заголовки должен вернуть сервер.',
      'Preflight запускает браузер, а не ваш код и не сервер. «Включить CORS» на клиенте нельзя: разрешение выдаёт только сервер своими заголовками.',
      'CORS защищает чтение ответа пользователем, а не сам сервер. Запрос без preflight всё равно доходит до сервера, и тот его обработает. CORS не заменяет аутентификацию и защиту от CSRF.',
      'Режим no-cors не позволяет прочитать ответ: он «непрозрачный» (type opaque, статус 0, тело недоступно). Он нужен для отправки (например, в «слепые» запросы) и подключения ресурсов.',
      'С учётными данными (credentials: include) нельзя отвечать Access-Control-Allow-Origin: *. Нужны конкретный origin, Access-Control-Allow-Credentials: true и желательно Vary: Origin.',
      'Символ * в Access-Control-Allow-Headers не покрывает заголовок Authorization: его нужно перечислять явно.',
      'Content-Type допустим без preflight только для трёх значений: text/plain, application/x-www-form-urlencoded и multipart/form-data. application/json всегда вызывает preflight.',
      'Результат preflight кэшируется на время Access-Control-Max-Age, но браузеры ограничивают максимум этого значения.',
      'Настоящий запрос в примере только один: к собственному origin сайта по http(s). По file:// он честно помечен как требующий сервера.'
    ],
    'bw-csp': [
      'Политика доставляется через <meta>, поэтому она действует только на содержимое ПОСЛЕ этого тега. Мета-тег нужно ставить в самом начале head. Код-наблюдатель в примере стоит ДО мета-тега намеренно, иначе политика заблокировала бы и его.',
      'Через <meta> нельзя задать frame-ancestors, sandbox, report-uri и report-to. На GitHub Pages HTTP-заголовки настроить нельзя, поэтому эти возможности для сайта недоступны.',
      '«unsafe-inline» и «unsafe-eval» сводят защиту от XSS почти к нулю. В примере они есть только ради наглядности. Если в script-src указан nonce, браузеры современных версий игнорируют «unsafe-inline». Здесь nonce не используется.',
      'Внешний адрес в тесте — зарезервированное имя example.invalid, которое заведомо не существует. Так пример не обращается к чужим серверам. Если разрешить https-картинки, запрос уйдёт в никуда и завершится ошибкой разрешения имени.',
      'Режим Report-Only и отправка отчётов на сервер здесь недоступны: нет заголовков и нет сервера. Нарушения видны только как события securitypolicyviolation внутри iframe.',
      'Если добавить CSP на сами страницы сайта, песочницы через srcdoc наследуют её и могут перестать работать (inline-скрипты, например).',
      'В DevTools нарушения CSP видны во вкладке Console в виде сообщений «Refused to…».'
    ],
    'bw-quota': [
      'Все значения — оценки. Браузеры намеренно округляют и искажают их (в целях приватности), а в приватных режимах квота может быть маленькой или условной.',
      'persist() может показать пользователю запрос (в Firefox) или решиться по эвристикам без вопроса (в Chromium). Отказ — нормальный исход, на него нужно рассчитывать.',
      'Квота общая для всего origin. На GitHub Pages это весь ваш username.github.io.',
      'Пробы временные: записанные демо-ключи и тестовая база удаляются сразу. Данные других страниц того же origin не затрагиваются.',
      'crossOriginIsolated на GitHub Pages ложно: заголовки COOP и COEP задать нельзя, поэтому SharedArrayBuffer недоступен.',
      'Без «постоянного» режима данные могут быть вытеснены при нехватке места на диске.',
      'Cache API и часть других возможностей работают только в защищённом контексте.'
    ],
    'bw-devtools': [
      'Названия панелей, их расположение и горячие клавиши различаются между Chrome, Firefox и Safari и меняются от версии к версии. В Safari сначала нужно включить меню «Разработка» в настройках.',
      'Открытые DevTools меняют поведение: могут быть отключены кэш и включено ограничение скорости, из-за чего тайминги отличаются от реальных.',
      'Расширения браузера добавляют свои скрипты, стили и запросы. Проверяйте проблемы в чистом профиле или в приватном окне.',
      'Параметр «Disable cache» действует только пока открыты DevTools.',
      'Отладка мобильного устройства требует отдельного подключения (remote debugging), а эмуляция устройства не воспроизводит процессор, память и сенсорный ввод.',
      'Вкладка из списка может называться иначе или находиться в меню «ещё». Если не нашли, воспользуйтесь командным меню (Ctrl/Cmd + Shift + P).'
    ]
  };
  function register(id, def) {
    if (PITFALLS[id]) def.pitfalls = PITFALLS[id];
    Demo.register(id, def);
  }

  // ==========================================================================
  // 9.4 Какие изменения дороже: width против transform, живой счётчик кадров
  // ==========================================================================
  register('bw-cost', {
    title: 'width против transform: разница в кадрах',
    mode: 'host',
    note: 'Две дорожки с одинаковой нагрузкой из соседних элементов. Нажмите «Измерить»: пример по очереди анимирует width, затем transform, по 3 секунды, и считает кадры главного потока. Живой счётчик работает всегда.',
    code:
      "@keyframes cw-grow { from { width: 40px; }  to { width: 220px; } }               /* геометрия */\n" +
      "@keyframes cw-move { from { transform: translateX(0); } to { transform: translateX(180px); } }  /* композиция */\n\n" +
      "requestAnimationFrame(function tick(t) {\n  frames.push(t - last);   // интервал между кадрами\n  requestAnimationFrame(tick);\n});",
    init: function (ctx) {
      var N = range(0, 6000, 2000, 500), nOut = h('span', { 'class': 'demo-val' });
      var nLabel = h('label', { 'class': 'demo-field' }); add(nLabel, document.createTextNode('Нагрузка: соседних элементов '), nOut, N);
      function syncN() { nOut.textContent = N.value; }
      function lane(kind) {
        var el = h('div', { 'class': 'cw-lane', 'data-kind': kind });
        el.appendChild(h('h5', null, kind === 'width' ? 'Анимируется width (геометрия)' : 'Анимируется transform (композиция)'));
        var row = h('div', { 'class': 'cw-row', 'aria-hidden': 'true' }), box = h('div', { 'class': 'cw-box' });
        row.appendChild(box); el.appendChild(row);
        return { kind: kind, el: el, row: row, box: box };
      }
      var L = { width: lane('width'), transform: lane('transform') };
      var lanes = h('div', { 'class': 'cw-lanes' }); add(lanes, L.width.el, L.transform.el);
      function fill() {
        var n = +N.value;
        [L.width, L.transform].forEach(function (x) {
          while (x.row.lastChild && x.row.lastChild !== x.box) x.row.removeChild(x.row.lastChild);
          var f = document.createDocumentFragment();
          for (var i = 0; i < n; i++) { var d = document.createElement('span'); d.className = 'cw-dot'; f.appendChild(d); }
          x.row.appendChild(f);
        });
      }
      function setAnim(x, on) { x.box.style.animation = on ? (x.kind === 'width' ? 'cw-grow' : 'cw-move') + ' 1s ease-in-out infinite alternate' : 'none'; }
      ctx.onCleanup(function () { setAnim(L.width, false); setAnim(L.transform, false); });

      // Живой счётчик кадров. Один цикл requestAnimationFrame, он же собирает интервалы во время теста.
      var fpsEl = h('div', { 'class': 'cw-fps', 'aria-hidden': 'true' }, '… кадров/с');
      var last = 0, recent = [], collecting = null;
      function tick(t) {
        if (last) { recent.push(t); if (collecting) collecting.push(t - last); }
        last = t;
        while (recent.length && t - recent[0] > 1000) recent.shift();
        fpsEl.textContent = recent.length + ' кадров/с';
        ctx.raf(tick);
      }
      ctx.raf(tick);

      var go = btn('Измерить (2 × 3 с)'), both = btn('Показать обе анимации'), force = check('Всё равно показать движение (включено уменьшение движения)');
      var status = h('p', { 'class': 'demo-readout', role: 'status' }), res = h('div');
      var running = false, showing = false;
      function summ(d) {
        var n = d.length; if (!n) return null;
        var sum = 0, worst = 0, jank = 0;
        d.forEach(function (x) { sum += x; if (x > worst) worst = x; if (x > 25) jank++; });
        return { frames: n, avg: sum / n, fps: 1000 / (sum / n), worst: worst, jank: jank };
      }
      function motionAllowed() {
        if (ctx.reducedMotion && !force.input.checked) { status.textContent = 'Включено уменьшение движения: отметьте «Всё равно показать движение», если хотите запустить сравнение.'; ctx.say(status.textContent); return false; }
        return true;
      }
      function measure(x, cb) {
        setAnim(x, true); collecting = []; last = 0;
        ctx.timeout(function () { var d = collecting; collecting = null; setAnim(x, false); cb(summ(d)); }, 3000);
      }
      ctx.on(go, 'click', function () {
        if (running || !motionAllowed()) return;
        running = true; go.disabled = both.disabled = true; ctx.clear(res);
        status.textContent = 'Измеряем width… (3 с)';
        measure(L.width, function (a) {
          status.textContent = 'Измеряем transform… (3 с)';
          ctx.timeout(function () {
            measure(L.transform, function (b) {
              running = false; go.disabled = both.disabled = false;
              if (!a || !b) { status.textContent = 'Кадров не пришло: вкладка скрыта или браузер не вызывает requestAnimationFrame. Повторите на видимой вкладке.'; return; }
              var f = function (s) { return [s.fps.toFixed(1), s.avg.toFixed(1) + ' мс', s.worst.toFixed(1) + ' мс', String(s.jank)]; };
              var rows = [['width', a], ['transform', b]].map(function (p) {
                var tr = h('tr'); tr.appendChild(h('th', { scope: 'row' }, p[0])); f(p[1]).forEach(function (v) { tr.appendChild(h('td', null, v)); }); return tr;
              });
              ctx.clear(res); res.appendChild(tableOf(['Анимация', 'Кадров/с', 'Средний кадр', 'Худший кадр', 'Кадров дольше 25 мс'], rows));
              var ratio = a.avg / b.avg;
              status.textContent = ratio > 1.3
                ? 'width: средний кадр ' + a.avg.toFixed(1) + ' мс, transform: ' + b.avg.toFixed(1) + ' мс. Геометрическая анимация заметно дороже для главного потока (в ' + ratio.toFixed(1) + ' раза).'
                : 'При нагрузке ' + N.value + ' элементов разница на вашем устройстве невелика (width ' + a.avg.toFixed(1) + ' мс, transform ' + b.avg.toFixed(1) + ' мс). Увеличьте нагрузку ползунком и повторите.';
              ctx.say(status.textContent);
            });
          }, 400);
        });
      });
      ctx.on(both, 'click', function () {
        if (running) return;
        if (!showing && !motionAllowed()) return;
        showing = !showing; setAnim(L.width, showing); setAnim(L.transform, showing);
        both.textContent = showing ? 'Остановить обе анимации' : 'Показать обе анимации';
      });
      var loadT = null;
      ctx.on(N, 'input', function () { syncN(); if (loadT) loadT(); loadT = ctx.timeout(fill, 250); });
      add(ctx.live, nLabel, lanes, go, document.createTextNode(' '), both, h('br'), ctx.reducedMotion ? force.label : null, h('p', { 'class': 'demo-label' }, 'Живой счётчик кадров главного потока:'), fpsEl, status, res);
      syncN(); fill();
    }
  });

  // ==========================================================================
  // 9 Конвейер рендеринга: выбор изменения → затронутые стадии
  // ==========================================================================
  var STAGES = ['JavaScript', 'Style', 'Layout', 'Paint', 'Composite'];
  var CHANGES = [
    ['Изменить width, height или margin', [1, 1, 1, 1, 1], 'high', 'Меняется геометрия: пересчитываются размеры и положение этого и зависимых элементов.'],
    ['Изменить font-size', [1, 1, 1, 1, 1], 'high', 'Меняются размеры текста, а значит, и раскладка.'],
    ['Добавить или удалить элемент', [1, 1, 1, 1, 1], 'high', 'Меняется дерево, затем стили, раскладка и отрисовка затронутой части.'],
    ['Изменить textContent', [1, 1, 1, 1, 1], 'mid', 'Размер текста мог измениться, поэтому layout, как правило, нужен.'],
    ['Изменить top / left у absolute-элемента', [1, 1, 1, 1, 1], 'mid', 'Layout ограничен, но он нужен: меняется положение.'],
    ['Изменить color или background-color', [1, 1, 0, 1, 1], 'mid', 'Геометрия не меняется, но нужно перерисовать.'],
    ['Изменить box-shadow', [1, 1, 0, 1, 1], 'mid', 'Layout не нужен, но тень может быть дорогой для отрисовки.'],
    ['Изменить visibility', [1, 1, 0, 1, 1], 'low', 'Место сохраняется, поэтому layout не нужен; нужно перерисовать.'],
    ['Изменить transform (на своём слое)', [1, 1, 0, 0, 1], 'low', 'Часто хватает композиции; если слоя нет, возможен и paint.'],
    ['Изменить opacity (на своём слое)', [1, 1, 0, 0, 1], 'low', 'Как и transform, часто выполняется на уровне композиции.'],
    ['Прокрутка контейнера на слое', [0, 0, 0, 0, 1], 'low', 'Часто достаточно композиции, если обработчики не меняют геометрию.'],
    ['Прочитать offsetWidth после записи стилей', [1, 1, 1, 0, 0], 'high', 'Вынужденный синхронный layout. В цикле это «layout thrashing».']
  ];
  register('bw-pipeline', {
    title: 'Конвейер рендеринга: какие стадии затрагивает изменение',
    mode: 'host',
    note: 'Выберите изменение: подсветятся стадии, которые, как правило, потребуются. Это ориентир, как и таблица ниже, а не гарантия: итог зависит от движка, слоя и оборудования.',
    init: function (ctx) {
      var sel = select(CHANGES.map(function (c, i) { return [String(i), c[0]]; }));
      var row = h('div', { 'class': 'pl-stages', 'aria-label': 'Стадии конвейера' }), chips = [];
      STAGES.forEach(function (s, i) {
        if (i) row.appendChild(h('span', { 'class': 'pl-arrow', 'aria-hidden': 'true' }, '→'));
        var c = h('span', { 'class': 'pl-stage', 'data-on': '0' }, s); chips.push(c); row.appendChild(c);
      });
      var out = h('div', { role: 'status', 'class': 'demo-readout' }), cost = h('span', { 'class': 'pl-cost' });
      var COSTS = { low: 'обычно дёшево', mid: 'средне', high: 'обычно дорого' };
      function paint() {
        var c = CHANGES[+sel.value];
        chips.forEach(function (chip, i) {
          var on = c[1][i];
          chip.setAttribute('data-on', on ? (i === 4 ? '2' : '1') : '0');
          chip.textContent = STAGES[i] + (on ? ' ✓' : ' —');
          chip.setAttribute('aria-label', STAGES[i] + (on ? ': затрагивается' : ': не затрагивается'));
        });
        cost.setAttribute('data-c', c[2]); cost.textContent = COSTS[c[2]];
        out.textContent = c[0] + '\nЗатрагиваются: ' + (STAGES.filter(function (s, i) { return c[1][i]; }).join(' → ') || '—') + '\n' + c[3];
      }
      ctx.on(sel, 'change', paint);
      add(ctx.live, labelled('Изменение', sel), row, cost, out);
      paint();
    }
  });

  // ==========================================================================
  // 15.1 Origin: сравнитель двух URL
  // ==========================================================================
  register('bw-origin', {
    title: 'Origin: сравнение двух адресов',
    mode: 'host',
    note: 'Введите два адреса. Origin вычисляет сам браузер через new URL(): схема + хост + порт. Ниже показаны вердикт Same-Origin Policy и приблизительный вердикт same-site.',
    code:
      "const a = new URL('https://example.com/page');\nconst b = new URL('https://example.com:8443');\n" +
      "a.origin === b.origin;   // false: другой порт\n// file:, data:, about: дают origin «null» (непрозрачный)",
    init: function (ctx) {
      var a = h('input', { type: 'text', value: 'https://example.com', size: '34', 'aria-label': 'Адрес A', spellcheck: 'false', autocomplete: 'off' });
      var b = h('input', { type: 'text', value: 'https://example.com/page', size: '34', 'aria-label': 'Адрес B', spellcheck: 'false', autocomplete: 'off' });
      var PRE = [['https://example.com/page', 'тот же'], ['http://example.com', 'схема'], ['https://api.example.com', 'хост'], ['https://example.com:8443', 'порт'], ['https://example.com:443', 'порт по умолчанию'], ['https://EXAMPLE.com', 'регистр'], ['file:///tmp/a.html', 'file:'], ['data:text/plain,hi', 'data:'], ['https://alice.github.io', 'github.io A'], ['https://bob.github.io', 'github.io B']];
      var chips = h('div', { 'class': 'demo-chips' });
      PRE.forEach(function (p) { chips.appendChild(h('button', { type: 'button', 'data-v': p[0] }, p[1])); });
      var out = h('div', { role: 'status' });
      function row(label, i) { var tr = h('tr'); tr.appendChild(h('th', { scope: 'row' }, label)); [i.scheme, i.host, i.port || '—', i.origin].forEach(function (v) { tr.appendChild(h('td', null, v)); }); return tr; }
      function paint() {
        var ua = parseURL(a.value), ub = parseURL(b.value);
        ctx.clear(out);
        if (!ua || !ub) { out.appendChild(h('div', { 'class': 'org-verdict', 'data-ok': 'no' }, 'Не удалось разобрать адрес ' + (!ua ? 'A' : 'B') + ': нужна схема, например https://…')); return; }
        var ia = info(ua), ib = info(ub);
        out.appendChild(tableOf(['Адрес', 'Схема', 'Хост', 'Порт (эффективный)', 'Origin'], [row('A', ia), row('B', ib)], 'org-grid'));
        var same = sameOrigin(ua, ub), reason;
        if (ia.opaque || ib.opaque) reason = 'Один из адресов даёт непрозрачный origin «null»: он не равен никакому другому.';
        else if (ia.scheme !== ib.scheme) reason = 'Другая схема (' + ia.scheme + ' и ' + ib.scheme + ').';
        else if (ia.host !== ib.host) reason = 'Другой хост (' + ia.host + ' и ' + ib.host + ').';
        else if (ia.port !== ib.port) reason = 'Другой порт (' + ia.port + ' и ' + ib.port + ').';
        else reason = 'Схема, хост и эффективный порт совпадают.';
        out.appendChild(h('div', { 'class': 'org-verdict', 'data-ok': same ? 'yes' : 'no' }, (same ? 'Тот же origin. ' : 'Разные origin. ') + reason));
        var ss = !ia.opaque && !ib.opaque && ia.scheme === ib.scheme && site(ia.host) === site(ib.host);
        out.appendChild(h('p', { 'class': 'demo-readout' }, 'Same-site (приблизительно): ' + (ss ? 'да' : 'нет') + '. Регистрируемые домены: ' + (ia.opaque ? '—' : site(ia.host)) + ' и ' + (ib.opaque ? '—' : site(ib.host)) + '. Нужен Public Suffix List, здесь только мини-список.'));
        ctx.say((same ? 'Тот же origin. ' : 'Разные origin. ') + reason);
      }
      ctx.on(a, 'input', paint); ctx.on(b, 'input', paint);
      ctx.on(chips, 'click', function (e) { var v = e.target.getAttribute && e.target.getAttribute('data-v'); if (v) { b.value = v; paint(); } });
      add(ctx.live, chips, labelled('Адрес A', a), labelled('Адрес B', b), out);
      paint();
    }
  });

  // ==========================================================================
  // 15.2 CORS: нужен ли preflight, что увидит скрипт; реальный запрос — только к своему origin
  // ==========================================================================
  var SAFE_CT = { 'text/plain': 1, 'application/x-www-form-urlencoded': 1, 'multipart/form-data': 1 };
  register('bw-cors', {
    title: 'CORS: решение браузера по правилам спецификации',
    mode: 'host',
    note: 'Выберите параметры запроса. Пример применяет правила Fetch: «простой» запрос или preflight, что должен ответить сервер и почему режим no-cors даёт непрозрачный ответ. Живого запроса на чужой адрес нет: сайт не обращается к чужим серверам.',
    code:
      "fetch('https://api.other.example/data', {\n  method: 'PUT',\n  headers: { 'Content-Type': 'application/json' },\n  credentials: 'include'\n});\n" +
      "// Браузер сначала отправит OPTIONS (preflight):\n//   Origin: https://site.example\n//   Access-Control-Request-Method: PUT\n//   Access-Control-Request-Headers: content-type",
    init: function (ctx) {
      var page = h('input', { type: 'text', value: 'https://site.example', size: '26', 'aria-label': 'Адрес страницы', spellcheck: 'false' });
      var target = h('input', { type: 'text', value: 'https://api.other.example/data', size: '30', 'aria-label': 'Адрес запроса', spellcheck: 'false' });
      var method = select(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
      var mode = select([['cors', 'cors (по умолчанию)'], ['no-cors', 'no-cors'], ['same-origin', 'same-origin']]);
      var ct = select([['', 'нет тела / не задан'], ['text/plain', 'text/plain'], ['application/x-www-form-urlencoded', 'application/x-www-form-urlencoded'], ['multipart/form-data', 'multipart/form-data'], ['application/json', 'application/json']]);
      var cred = select([['omit', 'omit (без cookie)'], ['same-origin', 'same-origin'], ['include', 'include (с cookie)']], 'same-origin');
      var xh = check('Свой заголовок X-Request-Id'), auth = check('Заголовок Authorization');
      var out = h('div', { role: 'status' });
      function li(parent, text) { parent.appendChild(h('li', null, text)); }
      function paint() {
        var pu = parseURL(page.value), tu = parseURL(target.value);
        ctx.clear(out);
        if (!pu || !tu) { out.appendChild(h('div', { 'class': 'org-verdict', 'data-ok': 'no' }, 'Не удалось разобрать адрес: нужна схема, например https://…')); return; }
        var po = info(pu).origin, to = info(tu).origin, same = sameOrigin(pu, tu), m = method.value, steps = h('ul'), verdict, ok = true;
        var unsafeHeaders = [];
        if (xh.input.checked) unsafeHeaders.push('x-request-id');
        if (auth.input.checked) unsafeHeaders.push('authorization');
        var ctOK = !ct.value || SAFE_CT[ct.value];
        if (!ctOK) unsafeHeaders.push('content-type');
        var simpleMethod = m === 'GET' || m === 'HEAD' || m === 'POST';
        if (same && mode.value !== 'no-cors') {
          verdict = 'Тот же origin: CORS не применяется. Запрос идёт без preflight, ответ читается полностью (response.type = "basic").';
        } else if (same) {
          verdict = 'Тот же origin: no-cors ничего не меняет, ответ обычный (response.type = "basic").';
        } else if (mode.value === 'same-origin') {
          ok = false; verdict = 'Режим same-origin запрещает запрос на другой origin: fetch отклонится с TypeError ещё до сети.';
        } else if (mode.value === 'no-cors') {
          if (!simpleMethod || unsafeHeaders.length) {
            ok = false; verdict = 'В режиме no-cors разрешены только методы GET, HEAD, POST и безопасные заголовки. Ваши параметры (' + (!simpleMethod ? 'метод ' + m : unsafeHeaders.join(', ')) + ') недопустимы: fetch отклонится с TypeError.';
          } else {
            verdict = 'Запрос уйдёт на сервер без preflight, но ответ будет «непрозрачным».';
            li(steps, 'response.type = "opaque", response.status = 0, response.ok = false.');
            li(steps, 'Тело ответа прочитать нельзя: response.text() и response.json() не дадут данных.');
            li(steps, 'Заголовки ответа недоступны. Такой ответ можно, например, передать в Cache API, но не обработать скриптом.');
            li(steps, 'Сервер при этом запрос получил и мог выполнить действие: no-cors не делает отправку «безопасной».');
          }
        } else {
          var simple = simpleMethod && unsafeHeaders.length === 0;
          var reqHeaders = unsafeHeaders.join(', ');
          if (simple) {
            verdict = 'Простой запрос: preflight не нужен. Браузер сразу отправляет ' + m + ' с заголовком Origin: ' + po + '.';
          } else {
            verdict = 'Нужен preflight: браузер сначала отправит запрос OPTIONS и только при разрешении выполнит основной.';
            li(steps, 'Причина: ' + (!simpleMethod ? 'метод ' + m + ' не входит в простые (GET, HEAD, POST)' : '') + (!simpleMethod && unsafeHeaders.length ? '; ' : '') + (unsafeHeaders.length ? 'небезопасные заголовки: ' + reqHeaders : '') + '.');
            li(steps, 'OPTIONS ' + tu.pathname + ' с заголовками: Origin: ' + po + '; Access-Control-Request-Method: ' + m + (reqHeaders ? '; Access-Control-Request-Headers: ' + reqHeaders : '') + '.');
            li(steps, 'Сервер должен ответить статусом 2xx и заголовками: Access-Control-Allow-Origin: ' + (cred.value === 'include' ? po : po + ' (или *, если без учётных данных)') + '; Access-Control-Allow-Methods: ' + m + (reqHeaders ? '; Access-Control-Allow-Headers: ' + reqHeaders : '') + '.');
            if (auth.input.checked) li(steps, 'Внимание: символ * в Access-Control-Allow-Headers не покрывает Authorization, его надо перечислить явно.');
          }
          li(steps, 'В ответе на основной запрос сервер обязан вернуть Access-Control-Allow-Origin: ' + (cred.value === 'include' ? po : po + ' (или *)') + '. Без него браузер ЗАПРЕТИТ скрипту читать ответ, хотя сервер запрос уже получил.');
          if (cred.value === 'include') { li(steps, 'С credentials: include нужен ещё Access-Control-Allow-Credentials: true, и Access-Control-Allow-Origin не может быть «*». Желательно добавить Vary: Origin.'); }
          if (!ctOK) li(steps, 'Content-Type ' + ct.value + ' не входит в безопасные (text/plain, application/x-www-form-urlencoded, multipart/form-data), поэтому вызвал preflight.');
        }
        out.appendChild(h('div', { 'class': 'org-verdict', 'data-ok': ok ? 'yes' : 'no' }, verdict));
        if (steps.childNodes.length) out.appendChild(steps);
        out.appendChild(h('p', { 'class': 'demo-hint' }, 'Origin страницы: ' + po + ' · origin цели: ' + to + ' · ' + (same ? 'тот же origin' : 'другой origin')));
        ctx.say(verdict);
      }
      [page, target, method, mode, ct, cred, xh.input, auth.input].forEach(function (c) { ctx.on(c, c.type === 'text' ? 'input' : 'change', paint); });

      // Единственный настоящий запрос: к собственному origin сайта, только по http(s).
      var realBtn = btn('Запросить assets/demo.css у собственного origin'), real = h('p', { 'class': 'demo-readout', role: 'status' });
      var ctl = new AbortController(); ctx.onCleanup(function () { ctl.abort(); });
      ctx.on(realBtn, 'click', function () {
        if (!Demo.env.isHttp) { real.textContent = 'Нужен сервер: по протоколу ' + Demo.env.protocol + ' браузер не даст получить статус ответа. Запустите python3 -m http.server 8000 и откройте http://localhost:8000. Запрос не имитируется.'; return; }
        real.textContent = 'Запрос…';
        fetch('assets/demo.css', { mode: 'no-cors', signal: ctl.signal }).then(function (r) {
          real.textContent = 'Настоящий ответ на запрос к тому же origin в режиме no-cors: type = "' + r.type + '", status = ' + r.status + '. Ответ не стал непрозрачным: «opaque» бывает только при запросе на ДРУГОЙ origin.';
        }, function (e) { if (e.name !== 'AbortError') real.textContent = 'Ошибка: ' + errText(e); });
      });
      var form = h('div');
      add(form, labelled('Страница (origin)', page), labelled('Запрос на', target), labelled('Метод', method), labelled('Режим', mode), labelled('Content-Type', ct), labelled('credentials', cred), xh.label, document.createTextNode(' '), auth.label);
      add(ctx.live, form, out, h('p', { 'class': 'demo-label' }, 'Единственный живой запрос:'), realBtn, real);
      paint();
    }
  });

  // ==========================================================================
  // 15.3 CSP через <meta>: заблокированные ресурсы видны в панели
  // ==========================================================================
  register('bw-csp', {
    title: 'CSP через <meta>: что разрешено, что заблокировано',
    mode: 'host',
    note: 'Отмечайте разрешения. Пример собирает политику и применяет её через <meta> внутри песочницы (iframe с sandbox="allow-scripts"). Тестовая страница пробует выполнить скрипт и eval, применить inline-стиль и загрузить две картинки. Нарушения приходят событиями securitypolicyviolation.',
    code:
      '<meta http-equiv="Content-Security-Policy"\n      content="default-src \'none\'; script-src \'unsafe-inline\'; img-src data:">\n' +
      "document.addEventListener('securitypolicyviolation', e => {\n  console.log(e.violatedDirective, e.blockedURI);\n});",
    init: function (ctx) {
      var cScript = check("Разрешить inline-скрипты ('unsafe-inline')"), cEval = check("Разрешить eval ('unsafe-eval')");
      var cData = check('Разрешить картинки data:'), cHttps = check('Разрешить картинки по https:'), cStyle = check("Разрешить inline-стили ('unsafe-inline' в style-src)");
      cScript.input.checked = false;
      var polOut = h('pre', { 'class': 'js-code', 'aria-label': 'Итоговая политика', tabindex: '0' });
      var res = h('div', { role: 'status' }), box = h('div'), frame = null, token = null, got = null, viol = null, waiter = null;
      function policy() {
        var p = ["default-src 'none'"];
        var sc = []; if (cScript.input.checked) sc.push("'unsafe-inline'"); if (cEval.input.checked) sc.push("'unsafe-eval'");
        p.push('script-src ' + (sc.join(' ') || "'none'"));
        var im = []; if (cData.input.checked) im.push('data:'); if (cHttps.input.checked) im.push('https:');
        p.push('img-src ' + (im.join(' ') || "'none'"));
        p.push('style-src ' + (cStyle.input.checked ? "'unsafe-inline'" : "'none'"));
        return p.join('; ');
      }
      var IMG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2230%22 height=%2220%22%3E%3Crect width=%2230%22 height=%2220%22 fill=%22%2316794b%22/%3E%3C/svg%3E';
      function srcdoc(pol, tok) {
        // Наблюдатель стоит ДО мета-тега: политика из <meta> действует только на то, что идёт после неё.
        var reporter = '(function(){var T=' + JSON.stringify(tok) + ';var v=[];function send(k,x){parent.postMessage({csp:T,k:k,v:x},"*");}window.__send=send;' +
          'document.addEventListener("securitypolicyviolation",function(e){send("violation",{d:e.violatedDirective,b:e.blockedURI||"inline"});});' +
          'window.addEventListener("load",function(){setTimeout(function(){' +
          'var s=document.getElementById("ts");send("style",getComputedStyle(s).color==="rgb(200, 0, 0)");' +
          'var a=document.getElementById("i1"),b=document.getElementById("i2");send("img-data",a.complete&&a.naturalWidth>0);send("img-ext",b.complete&&b.naturalWidth>0);send("done",true);},30);});})();';
        return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><script>' + reporter + '<\/script>' +
          '<meta http-equiv="Content-Security-Policy" content="' + pol + '"></head><body style="margin:6px;font:13px system-ui">' +
          '<p id="ts" style="color:rgb(200,0,0);margin:0">Текст с inline-стилем</p>' +
          '<script>__send("script",true);try{eval("1+1");__send("eval",true);}catch(e){__send("eval",false);}<\/script>' +
          '<img id="i1" alt="" src="' + IMG + '"> <img id="i2" alt="" src="https://example.invalid/pic.png"></body></html>';
      }
      var NAMES = { script: 'Inline-скрипт выполнен', eval: 'eval() выполнен', style: 'Inline-стиль применён', 'img-data': 'Картинка data: загружена', 'img-ext': 'Картинка https://example.invalid загружена' };
      function render(final) {
        ctx.clear(res);
        var rows = Object.keys(NAMES).map(function (k) {
          var v = got[k], text;
          if (v === true) text = 'да';
          else if (v === false) text = 'нет';
          else text = final ? (k === 'eval' && !got.script ? 'не проверялось: inline-скрипты заблокированы' : 'нет данных') : '…';
          var tr = h('tr'); tr.appendChild(h('th', { scope: 'row' }, NAMES[k])); tr.appendChild(h('td', null, text));
          var why = viol.filter(function (x) { return (k === 'script' && x.b === 'inline' && /script/.test(x.d)) || (k === 'eval' && x.b === 'eval') || (k === 'style' && /style/.test(x.d)) || (k === 'img-data' && /^data/.test(x.b)) || (k === 'img-ext' && /example\.invalid/.test(x.b)); });
          tr.appendChild(h('td', null, why.length ? 'CSP: ' + why[0].d : (v === false && k === 'img-ext' ? 'CSP не мешала, адрес не существует (.invalid)' : '—')));
          return tr;
        });
        res.appendChild(tableOf(['Проверка', 'Результат', 'Причина'], rows));
        var lines = viol.map(function (x) { return 'Refused: ' + (x.b || 'inline') + ' нарушает директиву «' + x.d + '»'; });
        res.appendChild(h('div', { 'class': 'demo-log', role: 'log', 'aria-label': 'Нарушения CSP' }, lines.join('\n') || 'Нарушений нет.'));
      }
      function rebuild() {
        if (waiter) waiter();
        if (frame) frame.remove();
        var pol = policy();
        polOut.textContent = 'Content-Security-Policy (через <meta>):\n' + pol.split('; ').join(';\n') + ';';
        token = 'cs' + (++uid) + Math.random().toString(36).slice(2, 7); got = {}; viol = [];
        frame = h('iframe', { 'class': 'csp-frame', title: 'Тестовая страница с политикой CSP' });
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.srcdoc = srcdoc(pol, token);
        box.appendChild(frame);
        render(false);
        waiter = ctx.timeout(function () { render(true); }, 900);
      }
      var msgHandler = function (e) {
        var d = e.data;
        if (!frame || e.source !== frame.contentWindow || !d || d.csp !== token) return;
        if (d.k === 'violation') viol.push(d.v); else if (d.k === 'done') { render(true); return; } else got[d.k] = d.v;
        render(false);
      };
      ctx.on(window, 'message', msgHandler);
      ctx.onCleanup(function () { if (frame) { frame.removeAttribute('srcdoc'); frame.remove(); frame = null; } token = null; });
      var panel = h('div'); add(panel, cScript.label, h('br'), cEval.label, h('br'), cData.label, h('br'), cHttps.label, h('br'), cStyle.label);
      ctx.on(panel, 'change', rebuild);
      add(ctx.live, panel, polOut, box, res);
      rebuild();
    }
  });

  // ==========================================================================
  // 14.2 Хранилища: живая проверка возможностей, квоты и поведения
  // ==========================================================================
  register('bw-quota', {
    title: 'Хранилища: проверка возможностей и квоты в вашем браузере',
    mode: 'host',
    note: 'Пробы выполняются прямо сейчас: временная запись в localStorage и sessionStorage, открытие и удаление тестовой базы IndexedDB, оценка квоты. Всё, что записано, сразу удаляется.',
    code:
      "const { usage, quota } = await navigator.storage.estimate();\nconst persisted = await navigator.storage.persisted();\nconst granted = await navigator.storage.persist();   // может показать запрос или отказать",
    init: function (ctx) {
      var dead = false; ctx.onCleanup(function () { dead = true; });
      var tb = h('tbody'), cells = {};
      function row(key, label) { var tr = h('tr'); tr.appendChild(h('th', { scope: 'row' }, label)); var td = h('td', null, '…'); tr.appendChild(td); tb.appendChild(tr); cells[key] = td; }
      function set(key, text) { if (!dead && cells[key]) cells[key].textContent = text; }
      [['secure', 'isSecureContext'], ['coi', 'crossOriginIsolated'], ['cookie', 'navigator.cookieEnabled'], ['ls', 'localStorage: запись, чтение, удаление'], ['ss', 'sessionStorage: запись, чтение, удаление'],
        ['idb', 'IndexedDB: открыть и удалить тестовую базу'], ['cache', 'Cache API (caches)'], ['est', 'storage.estimate()'], ['per', 'storage.persisted()'], ['opfs', 'Файловая система источника (getDirectory)']].forEach(function (r) { row(r[0], r[1]); });
      function probeStorage(s, name) {
        try { s.setItem('demo:probe', '1'); var ok = s.getItem('demo:probe') === '1'; s.removeItem('demo:probe'); return ok ? 'работает' : 'запись не прочиталась'; }
        catch (e) { return 'недоступно (' + errText(e) + ')'; }
      }
      function run() {
        set('secure', String(window.isSecureContext) + (window.isSecureContext ? '' : ': многие API недоступны'));
        set('coi', String(window.crossOriginIsolated === true) + (window.crossOriginIsolated ? '' : ' (SharedArrayBuffer недоступен; на GitHub Pages заголовки COOP/COEP задать нельзя)'));
        set('cookie', String(navigator.cookieEnabled));
        set('ls', (function () { try { return probeStorage(localStorage); } catch (e) { return 'недоступно (' + errText(e) + ')'; } })());
        set('ss', (function () { try { return probeStorage(sessionStorage); } catch (e) { return 'недоступно (' + errText(e) + ')'; } })());
        if (!window.indexedDB) set('idb', 'недоступно'); else {
          var name = 'demo-probe-' + (++uid);
          try {
            var rq = indexedDB.open(name, 1);
            rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
            rq.onsuccess = function () { rq.result.close(); var del = indexedDB.deleteDatabase(name); del.onsuccess = function () { set('idb', 'работает (база создана и удалена)'); }; del.onerror = function () { set('idb', 'создана, но не удалилась'); }; };
            rq.onerror = function () { set('idb', 'ошибка: ' + errText(rq.error)); };
            rq.onblocked = function () { set('idb', 'заблокировано другой вкладкой'); };
          } catch (e) { set('idb', 'недоступно (' + errText(e) + ')'); }
        }
        if (!('caches' in window)) set('cache', 'недоступно (нужен защищённый контекст)'); else caches.keys().then(function (k) { set('cache', 'доступно; кэшей у этого origin: ' + k.length); }, function (e) { set('cache', 'ошибка: ' + errText(e)); });
        if (!navigator.storage || !navigator.storage.estimate) { set('est', 'недоступно'); set('per', 'недоступно'); }
        else {
          navigator.storage.estimate().then(function (e) {
            var s = 'использовано ' + (e.usage / 1048576).toFixed(2) + ' МБ из ' + (e.quota / 1048576).toFixed(0) + ' МБ (оценка)';
            if (e.usageDetails) s += '; по типам: ' + JSON.stringify(e.usageDetails);
            set('est', s);
          }, function (er) { set('est', 'ошибка: ' + errText(er)); });
          if (navigator.storage.persisted) navigator.storage.persisted().then(function (p) { set('per', p ? 'да: данные не вытеснятся без вашего согласия' : 'нет: данные могут быть вытеснены при нехватке места'); }, function (er) { set('per', 'ошибка: ' + errText(er)); }); else set('per', 'недоступно');
        }
        set('opfs', navigator.storage && navigator.storage.getDirectory ? 'доступна' : 'недоступна');
      }
      var again = btn('Повторить пробы'), persist = btn('Запросить persist()'), pOut = h('p', { 'class': 'demo-readout', role: 'status' });
      ctx.on(again, 'click', run);
      ctx.on(persist, 'click', function () {
        if (!navigator.storage || !navigator.storage.persist) { pOut.textContent = 'persist() недоступен.'; return; }
        navigator.storage.persist().then(function (g) { if (!dead) pOut.textContent = g ? 'persist(): разрешено.' : 'persist(): отказано. Это нормальный исход: браузер решает сам или спрашивает пользователя.'; run(); }, function (e) { if (!dead) pOut.textContent = 'Ошибка: ' + errText(e); });
      });
      var table = h('table'), hr = h('tr');
      ['Проба', 'Результат'].forEach(function (x) { hr.appendChild(h('th', { scope: 'col' }, x)); });
      add(table, add(h('thead'), hr), tb);
      var w = h('div', { 'class': 'table-wrap' }); w.appendChild(table);
      add(ctx.live, w, again, document.createTextNode(' '), persist, pOut);
      run();
    }
  });

  // ==========================================================================
  // 17 DevTools: экскурсия по панелям (вкладки с клавиатурной навигацией)
  // ==========================================================================
  var DT = [
    ['Elements', 'Дерево DOM и стили выбранного элемента.', ['Styles: какие правила применились и какие перечёркнуты (проиграли в каскаде).', 'Computed: итоговые значения и откуда они взялись.', 'Box model: поля, рамка, padding и размер содержимого.', 'Правка DOM и CSS «на лету» (изменения пропадут при перезагрузке).'], 'Выберите кнопку «Запустить» в любом примере и посмотрите, откуда взяты её стили.'],
    ['Console', 'Ошибки, предупреждения и интерактивное выполнение выражений.', ['Красные строки — ошибки: начинайте диагностику отсюда.', 'Фильтр по уровням (Errors, Warnings, Info).', 'Переменная $0 — последний выбранный в Elements элемент.', 'Сообщения «Refused to…» — нарушения CSP.'], 'Введите Demo.stats() и посмотрите счётчики ресурсов примеров.'],
    ['Sources', 'Исходники, точки останова и пошаговая отладка.', ['Breakpoint на строке и «Pause on exceptions».', 'Call Stack и Scope (включая Closure).', 'Event Listener Breakpoints: остановка на любом клике.', 'Шаги: Step over, Step into, Step out.'], 'Откройте assets/demos-js.js, найдите makeCounter и поставьте точку останова в замыкании.'],
    ['Network', 'Запросы, ответы, заголовки, время и объём.', ['Status: 404, 500 и заблокированные запросы.', 'Waterfall: что и когда загружалось.', 'Disable cache и Throttling: проверка медленной сети.', 'Headers: Cache-Control, Content-Type и заголовки CORS.'], 'Перезагрузите страницу с открытой панелью и убедитесь, что нет запросов к сторонним доменам.'],
    ['Performance', 'Запись профиля выполнения и кадров.', ['Длинные задачи (отмечаются красным).', 'События Recalculate Style, Layout, Paint в потоке.', 'Кадры (Frames) и пропуски.', 'Flame chart: кто и сколько выполнялся.'], 'Запишите профиль во время «Измерить» в примере про width и transform и найдите события Layout.'],
    ['Memory', 'Снимки памяти и сведения о выделениях.', ['Heap snapshot: что удерживает память.', 'Сравнение двух снимков показывает утечки.', 'Detached DOM nodes: удалённые, но удерживаемые узлы.', 'Allocation sampling: кто выделяет много.'], 'Сделайте снимок, пролистайте все примеры вверх и вниз, сделайте второй и сравните: роста быть не должно.'],
    ['Application', 'Хранилища, кэш, Service Worker и манифест.', ['Local/Session Storage, IndexedDB, Cookies.', 'Cache Storage и Service Workers.', 'Manifest: параметры установки как приложения.', 'Clear site data: очистка для проверки с нуля.'], 'Запишите значение в примере про хранилища и найдите ключ demo:… в Local Storage.'],
    ['Rendering', 'Визуальные режимы диагностики.', ['Paint flashing: подсветка перерисовываемых областей.', 'Layout Shift Regions: сдвиги макета.', 'Frame Rendering Stats: частота кадров.', 'Emulate CSS media: prefers-reduced-motion, цветовая схема.'], 'Включите Paint flashing и запустите сравнение: у width перерисовка видна, у transform почти нет.'],
    ['Accessibility', 'Дерево доступности и вычисленные имя и роль.', ['Accessible Name и Role выбранного элемента.', 'Предупреждения о контрасте и подписях.', 'Проверка порядка фокуса через Tab.', 'Дерево доступности целиком.'], 'Выберите любое поле в примере про формы и сравните имя поля с подписью на экране.']
  ];
  register('bw-devtools', {
    title: 'Экскурсия по DevTools: что искать в каждой панели',
    mode: 'host',
    note: 'Выберите панель. Каждая вкладка содержит: зачем она нужна, на что смотреть и что попробовать на этой же странице. Вкладки переключаются стрелками, Home и End.',
    init: function (ctx) {
      var n = ++uid, tabs = h('div', { 'class': 'dt-tabs', role: 'tablist', 'aria-label': 'Панели DevTools' }), panel = h('div', { 'class': 'dt-panel', role: 'tabpanel', tabindex: '0' });
      var btns = [], cur = 0;
      DT.forEach(function (d, i) {
        var b = h('button', { type: 'button', role: 'tab', id: 'dt-tab-' + n + '-' + i, 'aria-controls': 'dt-panel-' + n, 'aria-selected': 'false', tabindex: '-1' }, d[0]);
        btns.push(b); tabs.appendChild(b);
      });
      panel.id = 'dt-panel-' + n;
      function show(i, focus) {
        cur = i;
        btns.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
        var d = DT[i];
        panel.setAttribute('aria-labelledby', btns[i].id);
        ctx.clear(panel);
        panel.appendChild(h('h5', null, d[0] + ': ' + d[1]));
        panel.appendChild(h('p', null, 'На что смотреть:'));
        var ul = h('ul'); d[2].forEach(function (t) { ul.appendChild(h('li', null, t)); }); panel.appendChild(ul);
        panel.appendChild(h('p', { 'class': 'dt-try' }, 'Попробуйте на этой странице: ' + d[3]));
        if (focus) btns[i].focus();
      }
      ctx.on(tabs, 'click', function (e) { var i = btns.indexOf(e.target); if (i > -1) show(i, false); });
      ctx.on(tabs, 'keydown', function (e) {
        var i = cur;
        if (e.key === 'ArrowRight') i = (cur + 1) % btns.length; else if (e.key === 'ArrowLeft') i = (cur - 1 + btns.length) % btns.length;
        else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = btns.length - 1; else return;
        e.preventDefault(); show(i, true);
      });
      var keys = h('p', { 'class': 'demo-hint' }, 'Открыть DevTools: F12 или Ctrl+Shift+I (Windows, Linux), Cmd+Option+I (macOS). В Safari сначала включите меню «Разработка» в настройках.');
      add(ctx.live, keys, tabs, panel);
      show(0, false);
    }
  });
})();
