/*
 * assets/demos-js.js — примеры раздела «JavaScript» (javascript.html).
 * Все примеры, кроме консольной песочницы, работают в режиме host: код написан автором сайта.
 * Что вводит читатель — только ДАННЫЕ (JSON-массив, имя свойства, текст запроса). Эти данные
 * никогда не передаются в eval, new Function или innerHTML: выражения для примеров
 * заранее написаны автором, а ввод подставляется как значение.
 * Консольная песочница (js-console) исполняет код читателя в sandbox-iframe без allow-same-origin.
 * Ресурсы (слушатели, таймеры, кадры, наблюдатели, Worker, соединения IndexedDB) освобождаются через ctx.
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
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  }
  function labelled(text, control) {
    var l = h('label', { 'class': 'demo-field' });
    l.appendChild(document.createTextNode(text));
    l.appendChild(control);
    return l;
  }
  function select(options, value) {
    var s = h('select');
    options.forEach(function (o) {
      var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      s.appendChild(h('option', { value: v }, t));
    });
    if (value != null) s.value = value;
    return s;
  }
  function btn(text, extra) {
    var b = h('button', Object.assign({ type: 'button' }, extra || {}), text);
    return b;
  }
  function tableOf(headers, rows, cls) {
    var wrap = h('div', { 'class': 'table-wrap' });
    var t = h('table', cls ? { 'class': cls } : null);
    var tr = h('tr');
    headers.forEach(function (x) { tr.appendChild(h('th', { scope: 'col' }, x)); });
    add(t, add(h('thead'), tr));
    var tb = h('tbody');
    rows.forEach(function (r) { tb.appendChild(r); });
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  }
  function cell(tag, text, attrs) { return h(tag, attrs || null, text); }
  function show(v) {
    if (typeof v === 'string') return "'" + v + "'";
    if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
    if (typeof v === 'function') return 'function';
    if (v === undefined) return 'undefined';
    if (typeof v === 'bigint') return v + 'n';
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  function errText(e) { return (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e)); }

  // ---------- Подводные камни и ограничения ----------
  var PITFALLS = {
    'js-eventloop': [
      'Времена берутся из performance.now(). Браузеры округляют их (обычно до долей миллисекунды, а иногда грубее ради защиты от атак по времени), поэтому мелкие различия недостоверны.',
      'setTimeout(fn, 0) означает «не раньше, чем», а не «сразу». Вложенные таймеры получают минимальную задержку около 4 мс, а в фоновых вкладках таймеры могут срабатывать раз в секунду.',
      'Порядок между «timeout 0» и requestAnimationFrame не определён: он зависит от момента кадра и от браузера. Поэтому в сценарии с rAF пример строго проверяет только начало (синхронный код, затем microtask).',
      'Microtasks выполняются до конца, прежде чем браузер возьмёт следующую задачу или нарисует кадр. Бесконечно порождающая microtasks цепочка полностью блокирует страницу (microtask starvation).',
      'Модель упрощена: на самом деле очередей задач несколько (таймеры, ввод, сеть, отрисовка), и браузер сам выбирает, какую брать следующей. Не полагайтесь на порядок между разными источниками задач.',
      'Таймеры и rAF в примере идут через обёртку движка, чтобы их можно было отменить при очистке. Порядок выполнения от этого не меняется. await на значении без Promise тоже создаёт microtask.',
      'В скрытой вкладке rAF может не вызываться. Тогда пример завершит запуск по тайм-ауту и сообщит, что кадра не было.',
      'Порядок с await менялся: в старых движках (примерно до 2019 года) await промиса занимал больше «тиков», чем сейчас. Результат на очень старых браузерах может отличаться.'
    ],
    'js-coercion': [
      'Таблица считает настоящие выражения в вашем браузере, а не картинку из учебника. Спецификация одна, поэтому различий между браузерами быть не должно, а если они есть, это ошибка движка.',
      'Оператор == применяет сложный алгоритм приведения типов. Правило «всегда ===» убирает неожиданности, но не заменяет знание, как работает приведение (оно нужно и в if, и в +).',
      'NaN не равен ничему, даже самому себе. Проверять нужно Number.isNaN() или Object.is().',
      'Оператор + склеивает строки, а остальные арифметические приводят к числу: «5» + 3 даёт «53», а «5» - 3 даёт 2.',
      'typeof null возвращает "object": это историческая ошибка языка, которую оставили ради совместимости.',
      'Дроби считаются по IEEE 754: 0.1 + 0.2 не равно 0.3. Для денег используют целые (копейки) или специальные библиотеки.',
      'Объекты приводятся к примитивам через valueOf() и toString() (или Symbol.toPrimitive), поэтому [] + {} и {} + [] дают неочевидные результаты.',
      'Number("12px") даёт NaN, а parseInt("12px") даёт 12: у разбора и приведения разные правила.'
    ],
    'js-arrays': [
      'sort() без функции сравнивает элементы как строки: [10, 2, 1] становится [1, 10, 2]. Для чисел всегда передавайте (a, b) => a - b.',
      'Мутирующие методы (push, pop, shift, unshift, splice, sort, reverse, fill) меняют исходный массив. Их копирующие аналоги toSorted, toReversed, with, toSpliced — новые методы: проверьте поддержку.',
      'slice, spread и concat делают поверхностную копию: вложенные объекты остаются общими.',
      'map и filter не изменяют массив, но колбэк может изменить объекты внутри него.',
      'indexOf не находит NaN, а includes находит. forEach нельзя прервать: для этого есть for…of, some и every.',
      'reduce без начального значения на пустом массиве бросает TypeError.',
      'Ввод разбирается как JSON, поэтому в нём нет undefined, NaN и функций, а пропуски в разреженных массивах теряются.',
      'Колонка «мутирует» сверяет объявленное свойство метода с фактическим изменением на вашем массиве: метод может «мутировать» формально, но ничего не изменить, например sort уже отсортированного.'
    ],
    'js-proto': [
      'Поиск свойства идёт по цепочке снизу вверх. Запись создаёт собственное свойство и «затеняет» то, что лежит выше, а не меняет прототип.',
      '__proto__ — устаревший доступ к прототипу. Используйте Object.getPrototypeOf() и Object.setPrototypeOf(); смена прототипа у живого объекта к тому же замедляет работу движка.',
      'class — синтаксис над прототипами. Методы класса лежат на prototype, а поля экземпляра на самом объекте.',
      'Object.create(null) создаёт объект вообще без прототипа: у него нет toString и hasOwnProperty. Проверять «собственность» нужно через Object.hasOwn().',
      'Изменять встроенные прототипы (Array.prototype, Object.prototype) нельзя: это ломает чужой код и может конфликтовать с будущими стандартами.',
      'Пример показывает не более 10 собственных ключей на уровень, чтобы вывод оставался читаемым.'
    ],
    'js-closure': [
      'Замыкание хранит ссылку на окружение (переменные), а не копию значения. Поэтому счётчики a и b независимы, но общая переменная меняется сразу для всех, кто на неё ссылается.',
      'Окружение живёт, пока достижима функция. Долгоживущее замыкание, захватившее большие данные, удерживает их в памяти: частый источник утечек.',
      'В цикле let создаёт новое окружение на каждой итерации, а var одно на все: из-за этого функции, созданные в цикле с var, видят последнее значение.',
      'Пример выполняет настоящие функции, а значения счётчиков берутся из их возвращаемых значений, а не нарисованы заранее.',
      'В DevTools замкнутые переменные можно увидеть в панели Scope → Closure при остановке на точке останова.'
    ],
    'js-dom': [
      'MutationObserver доставляет записи пачкой в microtask после завершения текущего скрипта, а не в момент каждого изменения.',
      'Множество мелких изменений DOM дорого: изменения лучше собирать в DocumentFragment или менять классы одним действием.',
      'Живые коллекции (getElementsByClassName, childNodes) меняются на лету, а результат querySelectorAll — статичный снимок.',
      'textContent безопасен, innerHTML — нет: вставка пользовательской строки через innerHTML открывает XSS. В примере весь текст ставится через textContent.',
      'Подсветка — класс, который снимается через 0,8 с. Анимации нет, поэтому prefers-reduced-motion ничего не меняет.',
      'Наблюдатель отключается при очистке (disconnect). Забытый observer удерживает узлы и вызывает лишнюю работу.'
    ],
    'js-events': [
      'Порядок: capture сверху вниз, затем цель, затем bubble снизу вверх. На самой цели capture- и bubble-слушатели в современных браузерах вызываются в порядке «capture, потом bubble»; в старых — в порядке регистрации.',
      'stopPropagation() останавливает только дальнейшее распространение: остальные слушатели того же узла всё равно вызовутся. Чтобы остановить и их, нужен stopImmediatePropagation().',
      'Остановка в capture-фазе делает цель недостижимой: обработчик на кнопке даже не вызовется. Выберите это в селекторе и убедитесь.',
      'Не все события всплывают: focus, blur, mouseenter и mouseleave не всплывают (для всплывающих аналогов есть focusin и focusout).',
      'У пассивных слушателей (по умолчанию touchstart, touchmove и wheel на документе) preventDefault() не работает.',
      'События, созданные программно (dispatchEvent, click()), имеют isTrusted = false, и некоторые действия браузер для них не выполняет.'
    ],
    'js-delegation': [
      'Делегирование опирается на всплытие, поэтому не работает для событий, которые не всплывают.',
      'event.target может быть вложенным элементом (например, иконкой внутри кнопки). Для поиска нужного элемента используйте event.target.closest(селектор).',
      'Слишком общий родитель (например, document) вызывает лишнюю работу на каждом событии; выбирайте ближайший стабильный контейнер.',
      'Динамически добавленные элементы начинают работать сами, без повторной подписки: это главное преимущество приёма.',
      'stopPropagation() на потомке ломает делегирование: событие не дойдёт до родителя.'
    ],
    'js-forms': [
      'В FormData попадают только поля с атрибутом name, не отключённые (disabled), отмеченные флажки и переключатели, выбранные option и только нажатая кнопка отправки.',
      'disabled-поля не отправляются, а readonly отправляются. Это постоянный источник ошибок.',
      'Для файлов в FormData лежит объект File; здесь показаны только имя и размер. Содержимое файла нигде не читается и не отправляется.',
      'Многострочный текст на сервер уходит с переводами строк CRLF, а не LF.',
      'Пример форму не отправляет: стоит preventDefault(). Данные никуда не уходят.',
      'Валидность читается через form.checkValidity() и validity у полей; атрибут novalidate отключает автоматическую проверку при отправке, но не само состояние validity.'
    ],
    'js-fetch': [
      'fetch отклоняется только при сетевой ошибке. Ответы 404 и 500 приходят как обычные, и их нужно проверять через res.ok.',
      'Запросы здесь настоящие, но идут к blob:-адресу, созданному в этой странице. Это сетевой стек браузера, а не удалённый сервер: CORS, заголовки и задержки реальной сети не воспроизводятся.',
      'Сетевая ошибка получена через fetch к уже отозванному blob:-адресу. Это настоящий отклонённый Promise (TypeError), но причина отличается от обрыва связи.',
      'Статусы HTTP доступны только по http(s). По file:// сценарий «404» честно помечен как требующий сервера и не имитируется.',
      'Тело ответа читается один раз: повторный res.json() бросит ошибку. Для повторного чтения используйте res.clone().',
      'У fetch нет таймаута по умолчанию. Задавать его нужно через AbortSignal.timeout().',
      'Если blob:-запросы в вашем браузере по file:// запрещены, пример сообщит об этом и ничего не будет имитировать.'
    ],
    'js-fetch-race': [
      'Задержка перед отправкой добавлена искусственно, чтобы вызвать гонку ответов. Сам fetch к blob:-адресу настоящий, но мгновенный. В реальной сети порядок определяют сервер и канал.',
      'Наивный обработчик показывает последний пришедший ответ, а не ответ на последний запрос. Поэтому устаревший результат может перезаписать свежий.',
      'AbortController отменяет ожидание на клиенте, но сервер мог уже принять и обработать запрос. Отмена не гарантирует, что побочных эффектов не было.',
      'Альтернатива отмене — номер запроса и игнорирование устаревших ответов. Она работает и там, где отменить нельзя.',
      'Отмена бросает AbortError. Это штатная ситуация, а не ошибка: её нужно ловить и не показывать пользователю как сбой.',
      'Debounce уменьшает число запросов, но не заменяет защиту от гонки.'
    ],
    'js-storage': [
      'Пример работает только с ключами и базой с префиксом «demo», но на GitHub Pages localStorage общий для всех страниц вашего github.io (это один origin): другие ваши проекты тоже могут видеть эти данные.',
      'localStorage синхронный: он блокирует основной поток. Хранит только строки, а лимит около 5 МБ на origin (зависит от браузера).',
      'Проверка лимита временно заполняет хранилище ключами demo и сразу удаляет их. В этот момент другие вкладки того же origin могут получить QuotaExceededError.',
      'Доступ к localStorage может бросать SecurityError (блокировка cookies, некоторые приватные режимы), поэтому всегда оборачивайте в try/catch.',
      'На file:// область хранилища в одних браузерах общая для всех файлов, в других у каждого файла своя. Данные могут «пропасть» при переносе папки.',
      'navigator.storage.estimate() даёт оценку, а не точное значение. Она может быть округлена и недоступна без защищённого контекста.',
      'IndexedDB асинхронна, но открытое соединение блокирует смену версии базы в другой вкладке (событие blocked). Закрывайте соединения.',
      'Не храните секреты в localStorage и IndexedDB: любой XSS прочитает всё содержимое.',
      'sessionStorage живёт в пределах вкладки и копируется в новое окно, открытое через window.open().'
    ],
    'js-webapi': [
      'Многие API требуют защищённого контекста, пользовательского жеста (user activation) и разрешения. Отказ — обычная ситуация, а не сбой, и приложение должно уметь с ним жить.',
      'Permissions API показывает состояние разрешения, но не запрашивает его. Не все имена поддерживаются во всех браузерах: query() может бросить TypeError.',
      'Геолокация: координаты здесь округляются до сотых и никуда не отправляются. Браузер может отдать приблизительное положение вместо точного.',
      'Clipboard: запись обычно разрешена по жесту пользователя, а чтение (readText) в Firefox и Safari ограничено или запрашивает разрешение.',
      'navigator.share() работает только по жесту и в основном на мобильных устройствах и в Safari; на многих настольных браузерах его нет.',
      'Встроенные в iframe страницы не получают API без атрибута allow и разрешающей политики (Permissions-Policy).',
      'Наличие API в проверке не гарантирует, что оно сработает: всегда обрабатывайте ошибки и отказы.'
    ],
    'js-worker': [
      'Блокирующий вариант намеренно замораживает вкладку на 1,5 секунды: это и есть демонстрация. Не нажимайте его, если на странице есть несохранённый ввод.',
      'Worker создаётся из Blob. На file:// поведение зависит от браузера; если создать Worker не удалось, пример сообщит об этом и покажет только блокирующий вариант.',
      'Данные между потоками копируются (structured clone) или передаются (transferable). Общая память (SharedArrayBuffer) требует cross-origin isolation, которая недоступна на GitHub Pages: заголовки COOP и COEP там задать нельзя.',
      'У Worker нет доступа к DOM, window и document.',
      'Максимальная пауза между кадрами и частота кадров измеряются через requestAnimationFrame: они показывают отзывчивость основного потока, а не мощность процессора.',
      'Создание Worker стоит десятков миллисекунд. Для коротких задач он не оправдан.',
      'Worker нужно завершать (terminate), иначе поток остаётся жить. Пример делает это при уходе с экрана.',
      'Объём работы задан временем (1,5 с), а не числом итераций: на быстром процессоре итераций будет больше.'
    ],
    'js-perf': [
      'Debounce ждёт паузы и вызывает функцию один раз; throttle вызывает не чаще интервала; rAF-throttle не чаще одного раза за кадр. Выбор зависит от задачи: поиск по вводу — debounce, прокрутка и изменение размера — throttle или rAF.',
      'setTimeout дрейфует и не привязан к кадрам. Для визуальных обновлений используйте requestAnimationFrame.',
      'События в примере имитируются таймерами. Реальная частота pointermove зависит от устройства и браузера (часть событий склеивается).',
      'Debounce с trailing-вызовом задерживает отклик. Важные действия вроде кнопки «Отправить» дебаунсить нельзя.',
      'Для прокрутки используйте passive-слушатели и IntersectionObserver вместо постоянного опроса положения.',
      'В фоновых вкладках requestAnimationFrame не вызывается, а таймеры замедляются.'
    ],
    'js-console': [
      'Код выполняется в песочнице, а console перенаправлен в панель. В DevTools вывод тоже есть, но для него нужно выбрать контекст этого iframe.',
      'DevTools показывает объекты «живыми» (можно раскрыть и увидеть актуальное состояние), а здесь выводится JSON-снимок на момент вызова.',
      'table, group, count, time и assert в панели имитируются простым текстом. В DevTools они выглядят богаче.',
      'У песочницы нет доступа к странице, localStorage и сети (CSP). Бесконечный цикл подвесит вкладку: sandbox ограничивает доступ, но не процессорное время.',
      'Номер строки в сообщении об ошибке может быть смещён из-за служебного кода вокруг пользовательского скрипта.',
      'console.log в рабочем коде замедляет страницу и может раскрыть лишнее. Для постоянных сообщений используйте уровни и отключайте вывод в production.'
    ],
    'js-modern': [
      'Наличие функции не гарантирует полную реализацию. Бейдж проверяет именно вашу версию браузера, а результат «Выполнить» показывает, что реально произошло.',
      'Temporal доступен только в самых новых браузерах. Полифил на сайте не подключается, поэтому без поддержки пример честно сообщает об отсутствии.',
      'structuredClone не копирует функции и DOM-узлы, теряет прототипы (экземпляры классов станут простыми объектами) и бросает DataCloneError.',
      'Object.groupBy возвращает объект без прототипа. Для ключей, не являющихся строками, есть Map.groupBy.',
      'toSorted и другие копирующие методы делают поверхностную копию: вложенные объекты остаются общими.',
      'Iterator helpers ленивые: ничего не вычисляется, пока не вызван toArray() или не начат for…of. Они доступны на итераторах (arr.values()), а не на самих массивах.',
      'AbortSignal.timeout() отменяет с причиной TimeoutError, а не AbortError.'
    ]
  };
  function register(id, def) {
    if (PITFALLS[id]) def.pitfalls = PITFALLS[id];
    Demo.register(id, def);
  }

  // ==========================================================================
  // 17. Event Loop: реальные отметки времени и порядок выполнения
  // ==========================================================================
  var EL_SCEN = [
    {
      id: 'classic', title: 'Пример из текста',
      code: 'console.log("A");\nsetTimeout(() => console.log("B: task"), 0);\nPromise.resolve().then(() => console.log("C: microtask"));\nconsole.log("D");',
      expect: ['A', 'D', 'C: microtask', 'B: task'], strict: true,
      run: function (e) {
        e.log('A', 'стек');
        e.timeout(function () { e.log('B: task', 'task'); }, 0);
        Promise.resolve().then(function () { e.log('C: microtask', 'microtask'); });
        e.log('D', 'стек');
      }
    },
    {
      id: 'nested', title: 'Вложенные microtasks',
      code: 'log("sync 1");\nsetTimeout(() => log("task: timeout"), 0);\nPromise.resolve().then(() => {\n  log("micro 1");\n  Promise.resolve().then(() => log("micro 3 (вложена в micro 1)"));\n});\nPromise.resolve().then(() => log("micro 2"));\nlog("sync 2");',
      expect: ['sync 1', 'sync 2', 'micro 1', 'micro 2', 'micro 3 (вложена в micro 1)', 'task: timeout'], strict: true,
      run: function (e) {
        e.log('sync 1', 'стек');
        e.timeout(function () { e.log('task: timeout', 'task'); }, 0);
        Promise.resolve().then(function () {
          e.log('micro 1', 'microtask');
          Promise.resolve().then(function () { e.log('micro 3 (вложена в micro 1)', 'microtask'); });
        });
        Promise.resolve().then(function () { e.log('micro 2', 'microtask'); });
        e.log('sync 2', 'стек');
      }
    },
    {
      id: 'await', title: 'async / await',
      code: 'async function f() {\n  log("f: до await");\n  await null;\n  log("f: после await");\n}\nf();\nPromise.resolve().then(() => log("then"));\nlog("sync: конец");',
      expect: ['f: до await', 'sync: конец', 'f: после await', 'then'], strict: true,
      run: function (e) {
        async function f() { e.log('f: до await', 'стек'); await null; e.log('f: после await', 'microtask'); }
        f();
        Promise.resolve().then(function () { e.log('then', 'microtask'); });
        e.log('sync: конец', 'стек');
      }
    },
    {
      id: 'timers', title: 'queueMicrotask и таймеры с разной задержкой',
      code: 'setTimeout(() => log("timeout 10"), 10);\nsetTimeout(() => log("timeout 0"), 0);\nqueueMicrotask(() => log("microtask"));\nlog("sync");',
      expect: ['sync', 'microtask', 'timeout 0', 'timeout 10'], strict: true,
      run: function (e) {
        e.timeout(function () { e.log('timeout 10', 'task'); }, 10);
        e.timeout(function () { e.log('timeout 0', 'task'); }, 0);
        queueMicrotask(function () { e.log('microtask', 'microtask'); });
        e.log('sync', 'стек');
      }
    },
    {
      id: 'raf', title: 'Где в цикле requestAnimationFrame',
      code: 'log("sync");\nsetTimeout(() => log("timeout 0"), 0);\nrequestAnimationFrame(() => log("rAF"));\nPromise.resolve().then(() => log("microtask"));',
      expect: ['sync', 'microtask'], strict: false, then: ['timeout 0', 'rAF'],
      run: function (e) {
        e.log('sync', 'стек');
        e.timeout(function () { e.log('timeout 0', 'task'); }, 0);
        e.raf(function () { e.log('rAF', 'task'); });
        Promise.resolve().then(function () { e.log('microtask', 'microtask'); });
      }
    }
  ];

  register('js-eventloop', {
    title: 'Event Loop: порядок выполнения с настоящими отметками времени',
    mode: 'host',
    note: 'Выберите сценарий и нажмите «Запустить». Порядок и время записываются во время настоящего выполнения в вашем браузере, затем сравниваются с тем, что предсказывает модель из учебника.',
    init: function (ctx) {
      var sel = select(EL_SCEN.map(function (s) { return [s.id, s.title]; }));
      var run = btn('Запустить');
      var code = h('pre', { 'class': 'js-code', tabindex: '0', 'aria-label': 'Код сценария' });
      var out = h('div', { role: 'status' });
      var busy = false;
      function cur() { return EL_SCEN.filter(function (s) { return s.id === sel.value; })[0]; }
      function paintCode() { code.textContent = cur().code; ctx.clear(out); }
      function finish(s, entries) {
        var labels = entries.map(function (x) { return x.label; });
        var rows = entries.map(function (x, i) {
          var tr = h('tr');
          tr.appendChild(cell('td', String(i + 1)));
          tr.appendChild(cell('td', x.t.toFixed(2)));
          tr.appendChild(cell('td', x.label));
          tr.appendChild(add(h('td'), h('span', { 'class': 'el-kind', 'data-k': x.kind }, x.kind)));
          return tr;
        });
        var ok, msg;
        if (s.strict) {
          ok = labels.join('|') === s.expect.join('|');
          msg = ok ? 'Фактический порядок совпал с ожидаемым: ' + s.expect.join(' → ') + '.'
            : 'Порядок отличается от ожидаемого (' + s.expect.join(' → ') + '). Получено: ' + labels.join(' → ') + '. Это необычно для современных браузеров.';
        } else {
          var head = labels.slice(0, s.expect.length).join('|') === s.expect.join('|');
          var rest = labels.slice(s.expect.length);
          var all = s.then.every(function (l) { return rest.indexOf(l) > -1; });
          ok = head && all;
          msg = !head ? 'Начало отличается от ожидаемого (' + s.expect.join(' → ') + '): ' + labels.join(' → ') + '.'
            : !all ? 'Кадр не наступил за отведённое время (вкладка могла быть скрыта): rAF не вызван. Получено: ' + labels.join(' → ') + '.'
            : 'Строго предсказуемо только начало (' + s.expect.join(' → ') + '). Порядок между «timeout 0» и rAF в этот раз: ' + rest.join(' → ') + '. Он зависит от момента кадра и может быть другим.';
        }
        ctx.clear(out);
        out.appendChild(h('div', { 'class': 'el-verdict', 'data-ok': ok ? 'yes' : 'no' }, msg));
        out.appendChild(tableOf(['№', 'Время, мс', 'Событие', 'Откуда'], rows));
        busy = false; run.disabled = false;
        ctx.say(msg);
      }
      ctx.on(run, 'click', function () {
        if (busy) return;
        busy = true; run.disabled = true;
        var s = cur(), entries = [], t0 = performance.now();
        var env = {
          log: function (label, kind) { entries.push({ t: performance.now() - t0, label: label, kind: kind }); },
          timeout: function (fn, ms) { return ctx.timeout(fn, ms); },
          raf: function (fn) { return ctx.raf(fn); }
        };
        s.run(env);
        // Завершающая задача идёт позже всех запланированных: к ней всё уже выполнено.
        ctx.timeout(function () { finish(s, entries); }, s.id === 'raf' ? 700 : 150);
      });
      ctx.on(sel, 'change', paintCode);
      add(ctx.live, labelled('Сценарий', sel), run, code, out);
      paintCode();
    }
  });

  // ==========================================================================
  // 6–7. Типы и приведение: интерактивная таблица
  // ==========================================================================
  var CX_VALUES = [
    ['0', 0], ["'0'", '0'], ["''", ''], ["' '", ' '], ["'abc'", 'abc'], ['1', 1], ["'1'", '1'], ['true', true], ['false', false],
    ['null', null], ['undefined', undefined], ['NaN', NaN], ['[]', []], ['[0]', [0]], ['{}', {}]
  ];
  var CX_EQ = [['0', 0], ["'0'", '0'], ["''", ''], ['false', false], ['null', null], ['undefined', undefined], ['NaN', NaN], ['[]', []]];
  var CX_OPS = {
    '+': function (a, b) { return a + b; }, '-': function (a, b) { return a - b; }, '*': function (a, b) { return a * b; }, '/': function (a, b) { return a / b; },
    '==': function (a, b) { return a == b; }, '===': function (a, b) { return a === b; }, '<': function (a, b) { return a < b; }, '>': function (a, b) { return a > b; }
  };

  register('js-coercion', {
    title: 'Приведение типов: матрица сравнений и калькулятор операторов',
    mode: 'host',
    note: 'Три инструмента: матрица равенства для типичных значений, калькулятор «значение, оператор, значение» и проба строки. Всё считается настоящими операторами в вашем браузере.',
    code:
      "'5' + 3          // '53'  — + склеивает строки\n'5' - 3          // 2     — остальные операторы приводят к числу\n" +
      "[] == false      // true\nnull == undefined // true\nnull === undefined // false\nNaN == NaN       // false\n0.1 + 0.2        // 0.30000000000000004",
    init: function (ctx) {
      // 1. Матрица
      var mode = select([['==', '==  (нестрогое)'], ['===', '===  (строгое)'], ['is', 'Object.is']]);
      var grid = h('div');
      function eq(a, b, m) { return m === '==' ? a == b : m === '===' ? a === b : Object.is(a, b); }
      function paintGrid() {
        var hr = h('tr'); hr.appendChild(h('th', { scope: 'col' }, ''));
        CX_EQ.forEach(function (c) { hr.appendChild(h('th', { scope: 'col' }, c[0])); });
        var tb = h('tbody');
        CX_EQ.forEach(function (r) {
          var tr = h('tr'); tr.appendChild(h('th', { scope: 'row' }, r[0]));
          CX_EQ.forEach(function (c) {
            var v = eq(r[1], c[1], mode.value);
            tr.appendChild(h('td', { 'class': v ? 'cx-yes' : 'cx-no', 'aria-label': r[0] + ' ' + mode.value + ' ' + c[0] + ': ' + (v ? 'true' : 'false') }, v ? '✓' : '✗'));
          });
          tb.appendChild(tr);
        });
        var t = h('table', { 'class': 'cx-grid' }); add(t, add(h('thead'), hr), tb);
        var w = h('div', { 'class': 'table-wrap' }); w.appendChild(t);
        ctx.clear(grid); grid.appendChild(w);
      }
      ctx.on(mode, 'change', paintGrid);

      // 2. Калькулятор
      var va = select(CX_VALUES.map(function (v, i) { return [String(i), v[0]]; }), '6');
      var vb = select(CX_VALUES.map(function (v, i) { return [String(i), v[0]]; }), '5');
      var op = select(Object.keys(CX_OPS), '+');
      va.value = '6'; vb.value = '5';
      var res = h('p', { 'class': 'demo-readout', role: 'status' });
      function calc() {
        var a = CX_VALUES[+va.value], b = CX_VALUES[+vb.value], r;
        try { r = CX_OPS[op.value](a[1], b[1]); } catch (e) { res.textContent = errText(e); return; }
        res.textContent = a[0] + ' ' + op.value + ' ' + b[0] + '  →  ' + show(r) + '   (typeof: ' + (r === null ? 'null' : typeof r) + ')';
      }
      ctx.on(va, 'change', calc); ctx.on(vb, 'change', calc); ctx.on(op, 'change', calc);

      // 3. Проба строки
      var inp = h('input', { type: 'text', value: '12px', size: '14', 'aria-label': 'Строка для пробы', spellcheck: 'false' });
      var probe = h('div', { 'class': 'demo-readout', role: 'status' });
      function paintProbe() {
        var s = inp.value;
        probe.textContent = [
          "Number(s)      = " + show(Number(s)), "parseInt(s)    = " + show(parseInt(s, 10)), "parseFloat(s)  = " + show(parseFloat(s)),
          "+s             = " + show(+s), "Boolean(s)     = " + show(Boolean(s)), "s == 0         = " + show(s == 0), "s == false     = " + show(s == false)
        ].join('\n');
      }
      ctx.on(inp, 'input', paintProbe);

      add(ctx.live,
        h('p', { 'class': 'demo-label' }, '1. Матрица равенства'), labelled('Сравнение', mode), grid,
        h('p', { 'class': 'demo-label' }, '2. Калькулятор'), labelled('Левое значение', va), labelled('Оператор', op), labelled('Правое значение', vb), res,
        h('p', { 'class': 'demo-label' }, '3. Проба строки'), labelled('Строка s', inp), probe);
      paintGrid(); calc(); paintProbe();
    }
  });

  // ==========================================================================
  // 10. Массивы: вход → выход, мутирует или нет
  // ==========================================================================
  function has(name) { return typeof [][name] === 'function'; }
  var ARR = [
    ['map', 'arr.map(x => x * 2)', false, function (a) { return a.map(function (x) { return x * 2; }); }],
    ['filter', 'arr.filter(x => x % 2 === 0)', false, function (a) { return a.filter(function (x) { return x % 2 === 0; }); }],
    ['reduce', 'arr.reduce((s, x) => s + x, 0)', false, function (a) { return a.reduce(function (s, x) { return s + x; }, 0); }],
    ['find', 'arr.find(x => x > 2)', false, function (a) { return a.find(function (x) { return x > 2; }); }],
    ['some', 'arr.some(x => x > 2)', false, function (a) { return a.some(function (x) { return x > 2; }); }],
    ['every', 'arr.every(x => x > 0)', false, function (a) { return a.every(function (x) { return x > 0; }); }],
    ['includes', 'arr.includes(2)', false, function (a) { return a.includes(2); }],
    ['indexOf', 'arr.indexOf(2)', false, function (a) { return a.indexOf(2); }],
    ['slice', 'arr.slice(1, 3)', false, function (a) { return a.slice(1, 3); }],
    ['splice', 'arr.splice(1, 2)', true, function (a) { return a.splice(1, 2); }],
    ['sort()', 'arr.sort()   // без функции: сравнение как строк!', true, function (a) { return a.sort(); }],
    ['sort(сравнение)', 'arr.sort((a, b) => a - b)', true, function (a) { return a.sort(function (x, y) { return x - y; }); }],
    ['reverse', 'arr.reverse()', true, function (a) { return a.reverse(); }],
    ['push', 'arr.push(99)', true, function (a) { return a.push(99); }],
    ['pop', 'arr.pop()', true, function (a) { return a.pop(); }],
    ['shift', 'arr.shift()', true, function (a) { return a.shift(); }],
    ['unshift', 'arr.unshift(0)', true, function (a) { return a.unshift(0); }],
    ['concat', 'arr.concat([7, 8])', false, function (a) { return a.concat([7, 8]); }],
    ['flat', 'arr.flat()', false, function (a) { return a.flat(); }],
    ['flatMap', 'arr.flatMap(x => [x, x * 10])', false, function (a) { return a.flatMap(function (x) { return [x, x * 10]; }); }],
    ['join', 'arr.join(" - ")', false, function (a) { return a.join(' - '); }],
    ['at', 'arr.at(-1)', false, function (a) { return a.at(-1); }],
    ['toSorted', 'arr.toSorted((a, b) => a - b)', false, function (a) { return a.toSorted(function (x, y) { return x - y; }); }, 'toSorted'],
    ['toReversed', 'arr.toReversed()', false, function (a) { return a.toReversed(); }, 'toReversed'],
    ['with', 'arr.with(0, 100)', false, function (a) { return a.with(0, 100); }, 'with'],
    ['toSpliced', 'arr.toSpliced(1, 1)', false, function (a) { return a.toSpliced(1, 1); }, 'toSpliced']
  ];

  register('js-arrays', {
    title: 'Методы массивов: вход → выход, мутирует или нет',
    mode: 'host',
    note: 'Впишите массив в формате JSON, выберите метод. Пример выполняет его на копии и сравнивает массив до и после. Обратите внимание на sort() без функции.',
    init: function (ctx) {
      var inp = h('input', { type: 'text', value: '[3, 1, 10, 2]', size: '28', 'aria-label': 'Массив в формате JSON', spellcheck: 'false' });
      var sel = select(ARR.map(function (m, i) { return [String(i), m[0]]; }));
      var out = h('div', { 'class': 'demo-readout', role: 'status' });
      function paint() {
        var m = ARR[+sel.value], arr;
        try { arr = JSON.parse(inp.value); if (!Array.isArray(arr)) throw new Error('нужен массив, например [1, 2, 3]'); }
        catch (e) { out.textContent = 'Ввод не разобран: ' + errText(e); return; }
        if (m[4] && !has(m[4])) { out.textContent = m[1] + '\n\nМетод ' + m[4] + ' не поддерживается вашим браузером (проверка: typeof [].' + m[4] + ').'; return; }
        var copy = arr.slice(), before = JSON.stringify(arr), res;
        try { res = m[3](copy); } catch (e) { out.textContent = m[1] + '\n\nОшибка: ' + errText(e); return; }
        var changed = JSON.stringify(copy) !== before;
        out.textContent = m[1] + '\n\nИсходный массив: ' + before + '\nВозвращено:      ' + show(res) + '\nМассив после:    ' + JSON.stringify(copy) +
          '\n\nМетод мутирующий: ' + (m[2] ? 'да' : 'нет') + ' · на этом массиве изменился: ' + (changed ? 'да' : 'нет');
      }
      ctx.on(inp, 'input', paint); ctx.on(sel, 'change', paint);
      add(ctx.live, labelled('Массив (JSON)', inp), labelled('Метод', sel), out);
      paint();
    }
  });

  // ==========================================================================
  // 11. Прототипы: визуализатор цепочки
  // ==========================================================================
  register('js-proto', {
    title: 'Цепочка прототипов: где найдено свойство',
    mode: 'host',
    note: 'Выберите объект и введите имя свойства (например, speak, bark, push, toString, hasOwnProperty). Пример проходит по настоящей цепочке Object.getPrototypeOf().',
    code:
      "class Animal { speak() { return 'звук'; } }\nclass Dog extends Animal { constructor(n) { super(); this.name = n; } bark() { return 'гав'; } }\n" +
      "const rex = new Dog('Рекс');\nObject.getPrototypeOf(rex) === Dog.prototype;           // true\nObject.getPrototypeOf(Dog.prototype) === Animal.prototype; // true",
    init: function (ctx) {
      var Animal = class Animal { speak() { return 'звук'; } };
      var Dog = class Dog extends Animal { constructor(n) { super(); this.name = n; } bark() { return 'гав'; } };
      var proto = { greet: function () { return 'привет'; } };
      var PRE = [
        ['new Dog("Рекс")', function () { return new Dog('Рекс'); }],
        ['[1, 2, 3]', function () { return [1, 2, 3]; }],
        ['function f() {}', function () { return function f() {}; }],
        ['new Date()', function () { return new Date(0); }],
        ['{ a: 1 }', function () { return { a: 1 }; }],
        ['Object.create(proto)', function () { return Object.create(proto); }],
        ['Object.create(null)', function () { return Object.create(null); }]
      ];
      var sel = select(PRE.map(function (p, i) { return [String(i), p[0]]; }));
      var prop = h('input', { type: 'text', value: 'speak', size: '16', 'aria-label': 'Имя свойства', spellcheck: 'false' });
      var out = h('div', { role: 'status' });
      function paint() {
        var o = PRE[+sel.value][1](), name = prop.value, chain = [], cur = o, found = -1;
        while (cur !== null && chain.length < 12) { chain.push(cur); cur = Object.getPrototypeOf(cur); }
        chain.forEach(function (c, i) { if (found < 0 && Object.prototype.hasOwnProperty.call(c, name)) found = i; });
        ctx.clear(out);
        var box = h('div', { 'class': 'pc-chain' });
        chain.forEach(function (c, i) {
          var label = i === 0 ? 'сам объект' : (Object.prototype.hasOwnProperty.call(c, 'constructor') && typeof c.constructor === 'function' ? c.constructor.name + '.prototype' : 'прототип');
          var keys = Object.getOwnPropertyNames(c);
          var shown = keys.slice(0, 10).join(', ') + (keys.length > 10 ? ', … (всего ' + keys.length + ')' : '');
          var b = h('div', { 'class': 'pc-box', 'data-found': i === found ? '1' : null }, (i === found ? '✓ ' : '') + label + '\nсобственные: ' + (shown || '—'));
          b.style.whiteSpace = 'pre-wrap';
          box.appendChild(b);
          box.appendChild(h('div', { 'class': 'pc-arrow', 'aria-hidden': 'true' }, '↓ [[Prototype]]'));
        });
        box.appendChild(h('div', { 'class': 'pc-box' }, 'null — конец цепочки'));
        var msg = !name ? 'Введите имя свойства.' : found < 0 ? 'Свойство «' + name + '» не найдено во всей цепочке: результат undefined (' + (name in o ? 'но оператор in говорит true' : 'и оператор in даёт false') + ').'
          : found === 0 ? 'Свойство «' + name + '» — собственное свойство объекта (Object.hasOwn = true).'
          : 'Свойство «' + name + '» найдено на уровне ' + found + ' цепочки (' + (chain[found] ? 'унаследовано' : '') + '). Object.hasOwn = false, оператор in = true.';
        out.appendChild(h('p', { 'class': 'demo-readout' }, msg));
        out.appendChild(box);
      }
      ctx.on(sel, 'change', paint); ctx.on(prop, 'input', paint);
      add(ctx.live, labelled('Объект', sel), labelled('Свойство', prop), out);
      paint();
    }
  });

  // ==========================================================================
  // 9. Замыкания: пошаговый счётчик
  // ==========================================================================
  var CL_LINES = [
    'function makeCounter() {', '  let count = 0;', '  return () => ++count;', '}',
    'const a = makeCounter();', 'const b = makeCounter();', 'a();', 'a();', 'b();', 'a();'
  ];
  register('js-closure', {
    title: 'Замыкание: каждый счётчик помнит своё окружение',
    mode: 'host',
    note: 'Нажимайте «Шаг»: выполняются настоящие функции, а значения берутся из их результатов. Видно, что a и b хранят независимые переменные count.',
    code: CL_LINES.join('\n'),
    init: function (ctx) {
      var code = h('pre', { 'class': 'js-code', tabindex: '0', 'aria-label': 'Код с подсветкой текущей строки' });
      var spans = CL_LINES.map(function (l) { var s = h('span', { 'class': 'cl-line' }, l); code.appendChild(s); return s; });
      var envs = h('div', { role: 'status' }), log = h('p', { 'class': 'demo-readout', role: 'status' });
      var next = btn('Шаг'), reset = btn('Сначала');
      var i, a, b, cA, cB, lastMsg;
      function makeCounter() { var count = 0; return function () { return ++count; }; }
      var STEPS = [
        [5, function () { a = makeCounter(); cA = 0; return 'makeCounter() вызван: создано окружение с count = 0. Функция a запомнила именно его.'; }],
        [6, function () { b = makeCounter(); cB = 0; return 'Снова makeCounter(): создано ВТОРОЕ, отдельное окружение. Функция b запомнила его.'; }],
        [7, function () { cA = a(); return 'a() вернула ' + cA + ': увеличен count в окружении a.'; }],
        [8, function () { cA = a(); return 'a() вернула ' + cA + ': окружение a сохранило значение между вызовами.'; }],
        [9, function () { cB = b(); return 'b() вернула ' + cB + ': у b своё окружение, оно не затронуто вызовами a.'; }],
        [10, function () { cA = a(); return 'a() вернула ' + cA + ': окружение a продолжает жить, пока достижима a.'; }]
      ];
      function paint() {
        spans.forEach(function (s, k) { s.setAttribute('data-on', STEPS[i - 1] && STEPS[i - 1][0] === k + 1 ? '1' : '0'); });
        ctx.clear(envs);
        envs.appendChild(h('span', { 'class': 'cl-env' }, 'окружение a: count = ' + (cA === undefined ? '—' : cA)));
        envs.appendChild(h('span', { 'class': 'cl-env' }, 'окружение b: count = ' + (cB === undefined ? '—' : cB)));
        log.textContent = (i === 0 ? 'Нажмите «Шаг».' : lastMsg) + '  [шаг ' + i + ' из ' + STEPS.length + ']';
        next.disabled = i >= STEPS.length;
      }
      function restart() { i = 0; a = b = cA = cB = undefined; lastMsg = ''; paint(); }
      ctx.on(next, 'click', function () { if (i < STEPS.length) { lastMsg = STEPS[i][1](); i++; paint(); ctx.say(lastMsg); } });
      ctx.on(reset, 'click', restart);
      add(ctx.live, code, next, document.createTextNode(' '), reset, envs, log);
      restart();
    }
  });
  // ==========================================================================
  // 14. DOM: редактор дерева с подсветкой мутаций (MutationObserver)
  // ==========================================================================
  register('js-dom', {
    title: 'DOM: меняйте дерево и смотрите записи MutationObserver',
    mode: 'host',
    note: 'Любое действие (добавить, удалить, переименовать, переключить класс) меняет настоящий DOM. MutationObserver присылает записи, а изменившиеся узлы кратко подсвечиваются.',
    code:
      "const observer = new MutationObserver(records => {\n  for (const r of records) console.log(r.type, r.target, r.addedNodes, r.removedNodes);\n});\n" +
      "observer.observe(list, { childList: true, subtree: true, attributes: true, characterData: true });\n" +
      "// observer.disconnect() — когда наблюдение больше не нужно",
    init: function (ctx) {
      var list = h('ul', { 'class': 'dom-tree', 'aria-label': 'Редактируемый список' });
      ['Яблоко', 'Груша', 'Слива'].forEach(function (t) { list.appendChild(h('li', null, t)); });
      var sel = select(['1']); sel.setAttribute('aria-label', 'Выбранный элемент');
      var text = h('input', { type: 'text', value: 'Вишня', size: '14', 'aria-label': 'Текст элемента', spellcheck: 'false' });
      var log = h('div', { 'class': 'demo-log', role: 'log', 'aria-label': 'Записи MutationObserver' });
      var lines = [];
      function addLog(t) { lines.push(t); if (lines.length > 14) lines.shift(); log.textContent = lines.join('\n'); }
      function refill(keep) {
        ctx.clear(sel);
        Array.prototype.forEach.call(list.children, function (li, i) { sel.appendChild(h('option', { value: String(i) }, (i + 1) + '. ' + li.textContent)); });
        if (list.children.length) sel.value = String(Math.min(keep == null ? 0 : keep, list.children.length - 1));
      }
      function cur() { return list.children[+sel.value]; }
      function flash(node) {
        var el = node.nodeType === 1 ? node : node.parentElement;
        if (!el || el === list) return;
        el.style.outline = '3px solid #d97706'; el.style.background = '#fff3d6';
        ctx.timeout(function () { el.style.outline = ''; el.style.background = ''; }, 800);
      }
      var observer = ctx.observe(new MutationObserver(function (records) {
        records.forEach(function (r) {
          var t = r.type === 'childList' ? 'childList: добавлено ' + r.addedNodes.length + ', удалено ' + r.removedNodes.length
            : r.type === 'attributes' ? 'attributes: изменён «' + r.attributeName + '»' : 'characterData: изменён текст';
          addLog(t + ' — цель <' + (r.target.nodeType === 1 ? r.target.localName : '#text') + '>');
          if (r.type === 'childList') Array.prototype.forEach.call(r.addedNodes, flash); else flash(r.target);
        });
      }));
      observer.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-x'], characterData: true });
      var bAdd = btn('Добавить в конец'), bDel = btn('Удалить'), bUp = btn('Поднять'), bName = btn('Переименовать'), bCls = btn('Класс done'), bAttr = btn('Атрибут data-x');
      ctx.on(bAdd, 'click', function () { list.appendChild(h('li', null, text.value || 'Новый')); refill(list.children.length - 1); });
      ctx.on(bDel, 'click', function () { var c = cur(); if (c) { var i = +sel.value; c.remove(); refill(i); } });
      ctx.on(bUp, 'click', function () { var c = cur(); if (c && c.previousElementSibling) { var i = +sel.value; list.insertBefore(c, c.previousElementSibling); refill(i - 1); } });
      ctx.on(bName, 'click', function () { var c = cur(); if (c) { c.firstChild.data = text.value || '—'; refill(+sel.value); } });
      ctx.on(bCls, 'click', function () { var c = cur(); if (c) c.classList.toggle('done'); });
      ctx.on(bAttr, 'click', function () { var c = cur(); if (c) { if (c.hasAttribute('data-x')) c.removeAttribute('data-x'); else c.setAttribute('data-x', '1'); } });
      var row = h('div'); add(row, labelled('Элемент', sel), labelled('Текст', text), bAdd, document.createTextNode(' '), bDel, document.createTextNode(' '), bUp, document.createTextNode(' '), bName, document.createTextNode(' '), bCls, document.createTextNode(' '), bAttr);
      add(ctx.live, row, list, log);
      refill(0);
    }
  });

  // ==========================================================================
  // 15. События: распространение capture → target → bubble
  // ==========================================================================
  register('js-events', {
    title: 'Распространение события: capture, цель, bubble',
    mode: 'host',
    note: 'Нажмите на кнопку внутри вложенных блоков (мышью, Enter или пробелом). Числа на блоках показывают порядок вызова слушателей. Попробуйте остановить распространение на среднем блоке.',
    code:
      "el.addEventListener('click', handler, true);   // capture: сверху вниз\nel.addEventListener('click', handler);         // bubble: снизу вверх\n" +
      "event.eventPhase;   // 1 — capture, 2 — цель, 3 — bubble\nevent.stopPropagation();",
    init: function (ctx) {
      var names = ['outer', 'middle', 'inner'], boxes = {}, stopAt = 'none', n = 0, lines = [];
      var outer = h('div', { 'class': 'ev-box' }), middle = h('div', { 'class': 'ev-box' }), inner = h('div', { 'class': 'ev-box' });
      boxes.outer = outer; boxes.middle = middle; boxes.inner = inner;
      var target = btn('Нажми меня');
      add(outer, h('span', { 'class': 'ev-name' }, 'outer'), middle);
      add(middle, h('span', { 'class': 'ev-name' }, 'middle'), inner);
      add(inner, h('span', { 'class': 'ev-name' }, 'inner'), target);
      var sel = select([['none', 'Не останавливать'], ['middle-capture', 'stopPropagation на middle (capture)'], ['middle-bubble', 'stopPropagation на middle (bubble)']]);
      var log = h('div', { 'class': 'demo-log', role: 'log', 'aria-label': 'Порядок вызова слушателей' });
      var prog = btn('Программный click()');
      function hit(el, k) { var cur = el.getAttribute('data-hit'); el.setAttribute('data-hit', cur ? cur + ', ' + k : String(k)); }
      function handler(name, capture) {
        return function (e) {
          if (name === 'outer' && capture) {      // начало нового пути
            n = 0; lines = [];
            names.forEach(function (x) { boxes[x].removeAttribute('data-hit'); });
          }
          n++;
          var phase = e.eventPhase === 1 ? 'capture' : e.eventPhase === 2 ? 'цель' : 'bubble';
          lines.push(n + '. ' + name + ' — ' + (capture ? 'capture-слушатель' : 'bubble-слушатель') + ' (eventPhase ' + e.eventPhase + ': ' + phase + ')' + (e.isTrusted ? '' : ' [isTrusted = false]'));
          hit(boxes[name], n);
          if (name === 'middle' && stopAt === 'middle-' + (capture ? 'capture' : 'bubble')) { e.stopPropagation(); lines.push('   → stopPropagation(): дальше событие не идёт'); }
          log.textContent = lines.join('\n');
        };
      }
      names.forEach(function (nm) { ctx.on(boxes[nm], 'click', handler(nm, true), true); ctx.on(boxes[nm], 'click', handler(nm, false)); });
      ctx.on(target, 'click', function (e) { lines.push('· сработал обработчик самой кнопки (eventPhase ' + e.eventPhase + ')'); log.textContent = lines.join('\n'); });
      ctx.on(sel, 'change', function () { stopAt = sel.value; });
      ctx.on(prog, 'click', function () { target.click(); });
      add(ctx.live, labelled('Остановка', sel), prog, outer, log);
    }
  });

  register('js-delegation', {
    title: 'Делегирование: один слушатель на весь список',
    mode: 'host',
    note: 'В режиме «делегирование» один слушатель на списке обслуживает и новые элементы. Переключитесь на «на каждый элемент», добавьте пункт и убедитесь, что он не отзывается.',
    code:
      "list.addEventListener('click', e => {\n  const li = e.target.closest('li');\n  if (li && list.contains(li)) console.log(li.textContent);\n});",
    init: function (ctx) {
      var list = h('ul', { 'class': 'dom-tree', 'aria-label': 'Список для кликов' });
      var count = 0;
      function item(t) { var li = h('li'); var b = btn(t); li.appendChild(b); return li; }
      ['Первый', 'Второй', 'Третий'].forEach(function (t) { list.appendChild(item(t)); });
      var mode = select([['delegate', 'Делегирование: один слушатель на ul'], ['each', 'Слушатель на каждый элемент']]);
      var out = h('p', { 'class': 'demo-readout', role: 'status' }), info = h('p', { 'class': 'demo-hint', role: 'status' });
      var addBtn = btn('Добавить пункт');
      var releasers = [];
      function say(t) { out.textContent = t; }
      function releaseAll() { while (releasers.length) releasers.pop()(); }
      function subscribe() {
        releaseAll();
        if (mode.value === 'delegate') {
          releasers.push(ctx.on(list, 'click', function (e) {
            var li = e.target.closest && e.target.closest('li');
            if (li && list.contains(li)) say('Клик: «' + li.textContent + '» (обработал единственный слушатель на ul)');
          }));
        } else {
          Array.prototype.forEach.call(list.children, function (li) {
            releasers.push(ctx.on(li, 'click', function () { say('Клик: «' + li.textContent + '» (собственный слушатель элемента)'); }));
          });
        }
        info.textContent = 'Слушателей у списка и его элементов сейчас: ' + releasers.length;
      }
      ctx.on(mode, 'change', function () { say('Режим изменён.'); subscribe(); });
      ctx.on(addBtn, 'click', function () {
        count++; list.appendChild(item('Новый ' + count));
        info.textContent = 'Слушателей у списка и его элементов сейчас: ' + releasers.length + (mode.value === 'each' ? ' — у нового пункта слушателя нет, он «мёртвый»' : ' — новый пункт работает без новой подписки');
      });
      add(ctx.live, labelled('Режим', mode), addBtn, list, info, out);
      subscribe();
    }
  });

  // ==========================================================================
  // 16. Формы: инспектор FormData и живая валидность
  // ==========================================================================
  register('js-forms', {
    title: 'FormData: что реально уйдёт на сервер',
    mode: 'host',
    note: 'Меняйте поля. Панель показывает содержимое FormData (формат «имя = значение»), что в него НЕ попало и почему, и состояние валидности. Форма не отправляется.',
    code:
      "const data = new FormData(form, event.submitter);\nfor (const [name, value] of data) console.log(name, value);\nform.checkValidity();   // true / false",
    init: function (ctx) {
      var n = ++uid;
      var form = h('form');
      var fName = h('input', { type: 'text', name: 'name', required: '', id: 'fd-n' + n, value: '' });
      var fMail = h('input', { type: 'email', name: 'email', id: 'fd-m' + n });
      var r1 = h('input', { type: 'radio', name: 'role', value: 'user', checked: '' }), r2 = h('input', { type: 'radio', name: 'role', value: 'admin' });
      var c1 = h('input', { type: 'checkbox', name: 'tag', value: 'html' }), c2 = h('input', { type: 'checkbox', name: 'tag', value: 'css' }), c3 = h('input', { type: 'checkbox', name: 'tag', value: 'js' });
      var country = select([['', '—'], ['fi', 'Финляндия'], ['de', 'Германия']]); country.name = 'country';
      var comment = h('textarea', { name: 'comment', rows: '2' });
      var file = h('input', { type: 'file', name: 'attachment' });
      var dis = h('input', { type: 'text', name: 'disabled_field', value: 'отключено', disabled: '' });
      var ro = h('input', { type: 'text', name: 'readonly_field', value: 'только чтение', readonly: '' });
      var noName = h('input', { type: 'text', value: 'без имени' });
      var sub = h('button', { type: 'submit', name: 'action', value: 'save' }, 'Отправить (не уйдёт)');
      function lab(t, c) { return labelled(t, c); }
      function box(t, items) { var f = h('fieldset'); f.appendChild(h('legend', null, t)); items.forEach(function (x) { f.appendChild(x); }); return f; }
      function wrapL(t, c) { var l = h('label'); l.appendChild(c); l.appendChild(document.createTextNode(' ' + t + ' ')); return l; }
      add(form, lab('name (обязательное)', fName), lab('email', fMail),
        box('role', [wrapL('user', r1), wrapL('admin', r2)]), box('tag', [wrapL('html', c1), wrapL('css', c2), wrapL('js', c3)]),
        lab('country', country), lab('comment', comment), lab('attachment', file), lab('disabled_field', dis), lab('readonly_field', ro), lab('поле без name', noName), sub);
      var out = h('div', { 'class': 'demo-readout', role: 'status' });
      function paint(submitter) {
        var fd = new FormData(form, submitter || undefined), lines = [], keys = {};
        fd.forEach(function (v, k) {
          keys[k] = true;
          lines.push(k + ' = ' + (typeof v === 'string' ? JSON.stringify(v) : 'File(' + v.name + ', ' + v.size + ' байт)'));
        });
        var miss = [];
        Array.prototype.forEach.call(form.elements, function (el) {
          if (!el.name || (el.type === 'submit')) return;
          if (!keys[el.name] || ((el.type === 'checkbox' || el.type === 'radio') && !el.checked && !keys[el.name])) {
            miss.push(el.name + (el.disabled ? ' (disabled)' : (el.type === 'checkbox' || el.type === 'radio') ? ' (не отмечено)' : ''));
          }
        });
        var unnamed = Array.prototype.filter.call(form.elements, function (el) { return !el.name && el.type !== 'submit'; }).length;
        out.textContent = 'FormData (' + lines.length + ' записей):\n' + (lines.join('\n') || '—') +
          '\n\nНе попало: ' + (Array.from(new Set(miss)).join(', ') || '—') + (unnamed ? '\nПолей без name: ' + unnamed + ' (они никогда не попадают в FormData)' : '') +
          '\n\nВалидность формы: ' + (form.checkValidity() ? 'валидна' : 'невалидна (проверьте поле name)');
      }
      ctx.on(form, 'input', function () { paint(); });
      ctx.on(form, 'change', function () { paint(); });
      ctx.on(form, 'submit', function (e) { e.preventDefault(); paint(e.submitter); ctx.say('Форма не отправлена: показано содержимое FormData'); });
      add(ctx.live, form, out);
      paint();
    }
  });

  // ==========================================================================
  // 18. Fetch: состояния загрузки, пустоты и ошибки — настоящие запросы
  // ==========================================================================
  register('js-fetch', {
    title: 'fetch: загрузка, успех, пусто, ошибка',
    mode: 'host',
    note: 'Запросы настоящие: fetch() к blob:-адресам, созданным в этой странице. Перед запросом стоит пауза 400 мс, добавленная только затем, чтобы состояние «загрузка» было видно. Сценарий «404» требует веб-сервера.',
    code:
      "async function load(url) {\n  state = 'loading';\n  try {\n    const res = await fetch(url, { signal });\n    if (!res.ok) throw new Error('HTTP ' + res.status);   // fetch сам на 404 не отклоняется!\n    const data = await res.json();\n    state = data.length ? 'success' : 'empty';\n  } catch (e) { state = 'error'; }\n}",
    init: function (ctx) {
      var ctl = new AbortController();
      ctx.onCleanup(function () { ctl.abort(); });
      var jsonUrl = ctx.blobURL(new Blob(['[{"id":1,"title":"Первая запись"},{"id":2,"title":"Вторая запись"}]'], { type: 'application/json' }));
      var emptyUrl = ctx.blobURL(new Blob(['[]'], { type: 'application/json' }));
      var sel = select([['ok', 'Успех: два элемента'], ['empty', 'Пусто: []'], ['network', 'Сетевая ошибка (отозванный blob:-адрес)'], ['404', 'HTTP 404 (нужен сервер)']]);
      var go = btn('Запустить');
      var out = h('div', { role: 'status' });
      var broken = false;
      function state(kind, title, body) {
        ctx.clear(out);
        out.appendChild(h('div', { 'class': 'el-verdict', 'data-ok': (kind === 'error' ? 'no' : 'yes') }, title));
        if (body) out.appendChild(body);
        ctx.say(title);
      }
      // Проверка: разрешает ли браузер fetch к blob: на этой странице (на file:// это не всегда так).
      fetch(emptyUrl, { signal: ctl.signal }).then(function (r) { return r.text(); }, function (e) {
        if (e.name === 'AbortError') return;
        broken = true; go.disabled = sel.value !== '404';
        state('error', 'Ваш браузер не разрешает fetch к blob:-адресам на этой странице (' + errText(e) + '). Откройте сайт через http(s), например командой python3 -m http.server. Результат не имитируется.');
      });
      ctx.on(sel, 'change', function () { go.disabled = broken && sel.value !== '404'; });
      ctx.on(go, 'click', function () {
        var kind = sel.value;
        if (kind === '404' && !Demo.env.isHttp) {
          state('error', 'Нужен сервер: ответ 404 даёт только веб-сервер. Страница открыта по ' + Demo.env.protocol + '. Запустите python3 -m http.server 8000 и откройте http://localhost:8000. Запрос не имитируется.');
          return;
        }
        state('loading', 'Загрузка… (пауза 400 мс перед запросом добавлена только для наглядности)');
        go.disabled = true;
        ctx.timeout(function () {
          var url;
          if (kind === 'ok') url = jsonUrl;
          else if (kind === 'empty') url = emptyUrl;
          else if (kind === 'network') { url = URL.createObjectURL(new Blob(['x'])); URL.revokeObjectURL(url); }
          else url = 'assets/does-not-exist.json';
          fetch(url, { signal: ctl.signal }).then(function (res) {
            if (!res.ok) { state('error', 'Promise выполнен успешно, но res.ok = false, статус ' + res.status + '. fetch на 404 не отклоняется: проверка res.ok обязательна.'); return null; }
            return res.json().then(function (data) {
              if (!data.length) { state('empty', 'Пусто: сервер ответил успешно, но данных нет. Это отдельное состояние интерфейса, а не ошибка.'); return; }
              var ul = h('ul'); data.forEach(function (d) { ul.appendChild(h('li', null, d.id + ': ' + d.title)); });
              state('success', 'Успех: res.ok = true, получено записей — ' + data.length, ul);
            });
          }).catch(function (e) {
            if (e.name === 'AbortError') return;
            state('error', 'Promise отклонён (' + errText(e) + '). Так выглядит сетевая ошибка: сам запрос не состоялся.');
          }).then(function () { go.disabled = broken && sel.value !== '404'; });
        }, 400);
      });
      add(ctx.live, labelled('Сценарий', sel), go, out);
      state('idle', 'Выберите сценарий и нажмите «Запустить».');
    }
  });

  // ==========================================================================
  // 18.3 Гонка ответов и AbortController
  // ==========================================================================
  register('js-fetch-race', {
    title: 'Гонка ответов и AbortController',
    mode: 'host',
    note: 'Две реализации «поиска при вводе». Задержка перед отправкой добавлена искусственно, чтобы ответ на старый запрос мог прийти позже ответа на новый; сам fetch настоящий. Нажмите «Набрать abc» или печатайте в поле.',
    code:
      "let ctl;\nasync function search(q) {\n  ctl?.abort();                    // отменяем предыдущий запрос\n  ctl = new AbortController();\n  try { const res = await fetch(url, { signal: ctl.signal }); show(q); }\n  catch (e) { if (e.name !== 'AbortError') throw e; }  // отмена — не ошибка\n}",
    init: function (ctx) {
      var url = ctx.blobURL(new Blob(['{"ok":true}'], { type: 'application/json' }));
      var inp = h('input', { type: 'text', value: '', size: '14', 'aria-label': 'Поисковый запрос', spellcheck: 'false', autocomplete: 'off' });
      var typeBtn = btn('Набрать «abc» (имитация)'), clr = btn('Сбросить');
      var naive = h('div', { 'class': 'el-verdict', 'data-ok': 'no', role: 'status' }, 'Наивная версия: показано — «»');
      var good = h('div', { 'class': 'el-verdict', 'data-ok': 'yes', role: 'status' }, 'С AbortController: показано — «»');
      var log = h('div', { 'class': 'demo-log', role: 'log', 'aria-label': 'Журнал запросов' });
      var lines = [], t0 = performance.now(), pending = null;
      function L(t) { lines.push(((performance.now() - t0) / 1).toFixed(0).padStart(4) + ' мс  ' + t); if (lines.length > 16) lines.shift(); log.textContent = lines.join('\n'); }
      function send(q, delay) {
        L('запрос «' + q + '», ответ примерно через ' + delay + ' мс');
        // Наивная версия
        ctx.timeout(function () {
          fetch(url).then(function (r) { return r.json(); }).then(function () { naive.textContent = 'Наивная версия: показано — «' + q + '»'; L('наивная: пришёл ответ на «' + q + '» и перезаписал экран'); });
        }, delay);
        // С отменой
        if (pending) { pending.ctl.abort(); pending.rel(); L('отмена предыдущего запроса «' + pending.q + '»'); }
        var c = new AbortController(), me = { ctl: c, q: q };
        me.rel = ctx.timeout(function () {
          fetch(url, { signal: c.signal }).then(function (r) { return r.json(); }).then(function () {
            good.textContent = 'С AbortController: показано — «' + q + '»'; L('с отменой: показан ответ на «' + q + '»');
          }, function (e) { if (e.name !== 'AbortError') L('ошибка: ' + errText(e)); });
        }, delay);
        pending = me;
      }
      ctx.on(typeBtn, 'click', function () {
        lines = []; t0 = performance.now(); naive.textContent = 'Наивная версия: показано — «»'; good.textContent = 'С AbortController: показано — «»';
        send('a', 400);
        ctx.timeout(function () { send('ab', 500); }, 50);
        ctx.timeout(function () { send('abc', 100); }, 100);
        ctx.timeout(function () { ctx.say('Итог: наивная версия показывает ' + naive.textContent.replace(/^.*— /, '') + ', версия с отменой показывает «abc»'); }, 800);
      });
      ctx.on(inp, 'input', function () { if (!lines.length) t0 = performance.now(); send(inp.value, 100 + Math.round(Math.random() * 600)); });
      ctx.on(clr, 'click', function () { lines = []; log.textContent = ''; naive.textContent = 'Наивная версия: показано — «»'; good.textContent = 'С AbortController: показано — «»'; if (pending) { pending.ctl.abort(); pending.rel(); pending = null; } inp.value = ''; });
      // Проверяем, что fetch к blob: разрешён
      fetch(url).then(function () { /* blob: доступен */ }, function (e) { ctx.fail(new Error('fetch к blob:-адресу недоступен в вашем браузере на этой странице (' + errText(e) + '). Откройте сайт через http(s): пример ничего не имитирует.')); });
      add(ctx.live, labelled('Запрос', inp), typeBtn, document.createTextNode(' '), clr, naive, good, log);
    }
  });

  // ==========================================================================
  // 19. Хранилища: localStorage / sessionStorage / IndexedDB и квота
  // ==========================================================================
  register('js-storage', {
    title: 'Хранилища: localStorage, sessionStorage, IndexedDB и квота',
    mode: 'host',
    note: 'Пример трогает только ключи с префиксом «demo:» и базу «demo-storage». Все обращения обёрнуты в try/catch: в некоторых режимах браузера хранилища недоступны.',
    code:
      "try { localStorage.setItem('demo:key', 'value'); }\ncatch (e) { /* SecurityError или QuotaExceededError */ }\n\n" +
      "const { usage, quota } = await navigator.storage.estimate();   // оценка, не точное значение\n" +
      "const open = indexedDB.open('demo-storage', 1);",
    init: function (ctx) {
      var PREFIX = 'demo:';
      var store = select([['local', 'localStorage'], ['session', 'sessionStorage'], ['idb', 'IndexedDB']]);
      var key = h('input', { type: 'text', value: 'язык', size: '10', 'aria-label': 'Ключ', spellcheck: 'false' });
      var val = h('input', { type: 'text', value: 'ru', size: '10', 'aria-label': 'Значение', spellcheck: 'false' });
      var bSet = btn('Записать'), bClr = btn('Удалить мои demo-данные'), bEst = btn('Обновить оценку квоты');
      var out = h('div', { 'class': 'demo-readout', role: 'status' }), quota = h('p', { 'class': 'demo-readout', role: 'status' });
      var db = null, dead = false;
      ctx.onCleanup(function () { dead = true; if (db) { db.close(); db = null; } });
      function sto() { return store.value === 'local' ? localStorage : sessionStorage; }
      function openDb() {
        return new Promise(function (res, rej) {
          if (db) return res(db);
          var rq = indexedDB.open('demo-storage', 1);
          rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
          rq.onsuccess = function () { if (dead) { rq.result.close(); rej(new Error('закрыто')); } else { db = rq.result; db.onversionchange = function () { db.close(); db = null; }; res(db); } };
          rq.onerror = function () { rej(rq.error); };
          rq.onblocked = function () { rej(new Error('открытие заблокировано другой вкладкой (onblocked)')); };
        });
      }
      function tx(mode, fn) {
        return openDb().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('kv', mode), s = t.objectStore('kv'), r = fn(s); t.oncomplete = function () { res(r && r.result); }; t.onerror = function () { rej(t.error); }; }); });
      }
      function list() {
        if (store.value === 'idb') {
          return openDb().then(function (d) {
            return new Promise(function (res, rej) {
              var rows = [], rq = d.transaction('kv').objectStore('kv').openCursor();
              rq.onsuccess = function () { var c = rq.result; if (c) { rows.push([c.key, c.value]); c.continue(); } else res(rows); };
              rq.onerror = function () { rej(rq.error); };
            });
          });
        }
        return Promise.resolve().then(function () {
          var s = sto(), rows = [];
          for (var i = 0; i < s.length; i++) { var k = s.key(i); if (k.indexOf(PREFIX) === 0 && k.indexOf('demo:fill:') !== 0) rows.push([k.slice(PREFIX.length), s.getItem(k)]); }
          return rows;
        });
      }
      function paint(note) {
        list().then(function (rows) {
          if (dead) return;
          out.textContent = (note ? note + '\n\n' : '') + store.options[store.selectedIndex].text + ': записей demo — ' + rows.length + '\n' +
            (rows.map(function (r) { return '  ' + r[0] + ' = ' + show(r[1]); }).join('\n') || '  (пусто)');
        }, function (e) { if (!dead) out.textContent = 'Хранилище недоступно: ' + errText(e); });
      }
      function estimate() {
        if (!navigator.storage || !navigator.storage.estimate) { quota.textContent = 'navigator.storage.estimate() недоступен (нужен защищённый контекст и поддержка браузера).'; return; }
        navigator.storage.estimate().then(function (e) {
          if (dead) return;
          quota.textContent = 'Оценка: использовано ' + (e.usage / 1048576).toFixed(2) + ' МБ из ' + (e.quota / 1048576).toFixed(0) + ' МБ (это оценка, а не точное значение).';
        }, function (e) { if (!dead) quota.textContent = 'Не удалось получить оценку: ' + errText(e); });
      }
      ctx.on(store, 'change', function () { paint(); });
      ctx.on(bSet, 'click', function () {
        if (!key.value) { paint('Введите ключ.'); return; }
        if (store.value === 'idb') { tx('readwrite', function (s) { return s.put(val.value, key.value); }).then(function () { paint('Записано в IndexedDB.'); }, function (e) { paint('Ошибка записи: ' + errText(e)); }); return; }
        try { sto().setItem(PREFIX + key.value, val.value); paint('Записано.'); } catch (e) { paint('Ошибка записи: ' + errText(e)); }
        estimate();
      });
      ctx.on(bClr, 'click', function () {
        if (store.value === 'idb') { tx('readwrite', function (s) { return s.clear(); }).then(function () { paint('Очищено.'); }, function (e) { paint('Ошибка: ' + errText(e)); }); return; }
        try { var s = sto(), del = []; for (var i = 0; i < s.length; i++) if (s.key(i).indexOf(PREFIX) === 0) del.push(s.key(i)); del.forEach(function (k) { s.removeItem(k); }); paint('Удалено ключей: ' + del.length); }
        catch (e) { paint('Ошибка: ' + errText(e)); }
        estimate();
      });
      ctx.on(bEst, 'click', estimate);

      // Проверка лимита localStorage: заполняем и сразу очищаем (только с явным подтверждением).
      var agree = h('input', { type: 'checkbox' }), agreeL = h('label'); add(agreeL, agree, document.createTextNode(' Понимаю: хранилище origin будет на секунду заполнено и тут же очищено'));
      var bLim = btn('Проверить лимит localStorage'); bLim.disabled = true;
      var lim = h('p', { 'class': 'demo-readout', role: 'status' });
      ctx.on(agree, 'change', function () { bLim.disabled = !agree.checked; });
      ctx.on(bLim, 'click', function () {
        var chunk = new Array(100 * 1024 + 1).join('x'), n = 0, err = null;
        try { while (n < 200) { localStorage.setItem('demo:fill:' + n, chunk); n++; } }
        catch (e) { err = e; }
        finally { for (var i = 0; i < 200; i++) { try { localStorage.removeItem('demo:fill:' + i); } catch (e2) { /* игнорируем */ } } }
        lim.textContent = err ? 'Записано ≈ ' + n * 100 + ' тыс. символов до ошибки ' + err.name + '. Всё очищено.' : 'Лимит не достигнут за 20 млн символов (необычно). Всё очищено.';
        agree.checked = false; bLim.disabled = true; estimate();
      });
      add(ctx.live, labelled('Хранилище', store), labelled('Ключ', key), labelled('Значение', val), bSet, document.createTextNode(' '), bClr, out, bEst, quota, agreeL, bLim, lim);
      paint(); estimate();
    }
  });

  // ==========================================================================
  // 20. Web API: безопасные «попробовать» с корректной обработкой разрешений
  // ==========================================================================
  register('js-webapi', {
    title: 'Web API: попробуйте безопасные возможности',
    mode: 'host',
    note: 'Каждая кнопка запускает одно действие по вашему клику и честно показывает отказ или отсутствие возможности. Ничего не отправляется по сети.',
    code:
      "const status = await navigator.permissions.query({ name: 'geolocation' });   // status.state\n" +
      "navigator.geolocation.getCurrentPosition(onOk, onError, { timeout: 10000 });\n" +
      "await navigator.clipboard.writeText('текст');   // по жесту, в защищённом контексте\n" +
      "await navigator.share({ title, text });         // по жесту, не везде",
    init: function (ctx) {
      var dead = false; ctx.onCleanup(function () { dead = true; });
      var tb = h('tbody');
      function row(title, key, controls) {
        var tr = h('tr'), res = h('div', { 'class': 'demo-readout', role: 'status' }, 'Ещё не запускали');
        tr.appendChild(add(h('td'), h('strong', null, title)));
        tr.appendChild(add(h('td'), ctx.badge(key)));
        var c = h('td'); controls.forEach(function (x) { c.appendChild(x); c.appendChild(document.createTextNode(' ')); }); c.appendChild(res); tr.appendChild(c);
        tb.appendChild(tr);
        return function (t) { if (!dead) res.textContent = t; };
      }
      // Permissions
      var pSel = select(['geolocation', 'camera', 'microphone', 'notifications', 'clipboard-write', 'persistent-storage']);
      var pBtn = btn('Спросить состояние');
      var pOut = row('Permissions API', 'api:permissions', [pSel, pBtn]);
      ctx.on(pBtn, 'click', function () {
        if (!navigator.permissions) { pOut('Permissions API недоступен.'); return; }
        navigator.permissions.query({ name: pSel.value }).then(function (s) {
          pOut(pSel.value + ': ' + s.state + ({ granted: ' (разрешено)', denied: ' (запрещено)', prompt: ' (будет запрос)' }[s.state] || ''));
        }, function (e) { pOut('Имя «' + pSel.value + '» не поддерживается этим браузером (' + errText(e) + ').'); });
      });
      // Geolocation
      var gBtn = btn('Определить положение');
      var gOut = row('Geolocation', 'api:geolocation', [gBtn]);
      ctx.on(gBtn, 'click', function () {
        if (!navigator.geolocation) { gOut('Geolocation недоступна.'); return; }
        gOut('Ждём ответ браузера…');
        navigator.geolocation.getCurrentPosition(function (p) {
          gOut('Широта ' + p.coords.latitude.toFixed(2) + ', долгота ' + p.coords.longitude.toFixed(2) + ', точность ≈ ' + Math.round(p.coords.accuracy) + ' м. Данные округлены и никуда не отправляются.');
        }, function (e) {
          gOut(({ 1: 'Доступ запрещён (PERMISSION_DENIED): вы отказали или политика страницы запрещает.', 2: 'Положение недоступно (POSITION_UNAVAILABLE).', 3: 'Время ожидания вышло (TIMEOUT).' }[e.code]) || 'Ошибка: ' + e.message);
        }, { timeout: 10000, maximumAge: 60000 });
      });
      // Clipboard
      var wBtn = btn('Записать текст'), rBtn = btn('Прочитать текст');
      var cOut = row('Clipboard', 'api:clipboard', [wBtn, rBtn]);
      ctx.on(wBtn, 'click', function () {
        if (!navigator.clipboard) { cOut('Clipboard API недоступен (нужен защищённый контекст).'); return; }
        navigator.clipboard.writeText('Привет из примера Web API').then(function () { cOut('Записано в буфер обмена.'); }, function (e) { cOut('Запись отклонена: ' + errText(e)); });
      });
      ctx.on(rBtn, 'click', function () {
        if (!navigator.clipboard || !navigator.clipboard.readText) { cOut('Чтение буфера недоступно в этом браузере.'); return; }
        navigator.clipboard.readText().then(function (t) { cOut('Прочитано символов: ' + t.length + ' (само содержимое не показывается).'); }, function (e) { cOut('Чтение отклонено: ' + errText(e)); });
      });
      // Share
      var sBtn = btn('Поделиться');
      var sOut = row('Web Share', 'api:share', [sBtn]);
      ctx.on(sBtn, 'click', function () {
        if (!navigator.share) { sOut('navigator.share недоступен: на многих настольных браузерах его нет.'); return; }
        navigator.share({ title: 'Учебник по веб-платформе', text: 'Пример Web Share' }).then(function () { sOut('Диалог отправки закрыт успешно.'); }, function (e) { sOut(e.name === 'AbortError' ? 'Вы закрыли диалог (AbortError): это не ошибка.' : 'Ошибка: ' + errText(e)); });
      });
      var table = h('table'), hr = h('tr');
      ['API', 'В вашем браузере', 'Попробовать'].forEach(function (x) { hr.appendChild(h('th', { scope: 'col' }, x)); });
      add(table, add(h('thead'), hr), tb);
      var w = h('div', { 'class': 'table-wrap' }); w.appendChild(table);
      ctx.live.appendChild(w);
    }
  });

  // ==========================================================================
  // 21. Workers: тяжёлое вычисление в Worker против главного потока
  // ==========================================================================
  register('js-worker', {
    title: 'Worker против блокирующего вычисления',
    mode: 'host',
    needs: { support: ['api:worker'] },
    badges: ['api:worker'],
    note: 'Счётчик кадров работает на главном потоке. Запустите вычисление в Worker: кадры идут плавно. Запустите его на главном потоке: страница замирает на 1,5 с, и максимальная пауза между кадрами это показывает.',
    code:
      "const worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));\nworker.onmessage = e => console.log(e.data);\nworker.postMessage({ ms: 1500 });\n// worker.terminate() — когда он больше не нужен",
    init: function (ctx) {
      var SRC = 'self.onmessage=function(e){var d=e.data.ms,t0=performance.now(),loops=0,n=0;while(performance.now()-t0<d){for(var k=0;k<20000;k++){n+=Math.sqrt(k)*Math.sin(k);}loops++;}self.postMessage({loops:loops,n:n%1});};';
      var DUR = 1500;
      var dot = h('div', { 'class': 'wk-dot' }), mover = h('div', { 'class': 'wk-mover', 'aria-hidden': 'true' });
      mover.appendChild(dot);
      var fps = h('p', { 'class': 'demo-readout' }), res = h('p', { 'class': 'demo-readout', role: 'status' });
      var bW = btn('В Worker (1,5 с)'), bM = btn('На главном потоке (1,5 с): страница зависнет');
      var worker = null, workerErr = null, stamps = [], maxGap = 0, lastT = 0, track = false;
      function tick(t) {
        if (lastT && track) maxGap = Math.max(maxGap, t - lastT);
        lastT = t;
        stamps.push(t); while (stamps.length && t - stamps[0] > 1000) stamps.shift();
        if (!ctx.reducedMotion) dot.style.left = (3 + ((t / 1500) % 1) * (mover.clientWidth - 22)) + 'px';
        fps.textContent = 'Кадров за последнюю секунду: ' + stamps.length + ' · максимальная пауза между кадрами в последнем запуске: ' + Math.round(maxGap) + ' мс';
        ctx.raf(tick);
      }
      ctx.raf(tick);
      function report(kind, loops) {
        ctx.timeout(function () {
          track = false;
          res.textContent = kind + ': выполнено ' + loops + ' шагов за ≈1,5 с. Максимальная пауза между кадрами: ' + Math.round(maxGap) + ' мс (≈16 мс — плавно, ≈1500 мс — страница замирала).';
          ctx.say(res.textContent); bW.disabled = false; bM.disabled = false;
        }, 250);
      }
      function getWorker() {
        if (worker || workerErr) return worker;
        try {
          worker = new Worker(ctx.blobURL(new Blob([SRC], { type: 'text/javascript' })));
          ctx.onCleanup(function () { if (worker) { worker.terminate(); worker = null; } });
          ctx.on(worker, 'error', function (e) { workerErr = e.message || 'ошибка в Worker'; res.textContent = 'Ошибка Worker: ' + workerErr; bW.disabled = false; bM.disabled = false; track = false; });
          ctx.on(worker, 'message', function (e) { report('Worker', e.data.loops); });
        } catch (e) { workerErr = errText(e); }
        return worker;
      }
      ctx.on(bW, 'click', function () {
        var w = getWorker();
        if (!w) { res.textContent = 'Не удалось создать Worker из Blob в этом браузере (' + workerErr + '). По file:// такое бывает: откройте сайт через http(s). Блокирующий вариант всё равно доступен.'; return; }
        maxGap = 0; track = true; bW.disabled = bM.disabled = true; res.textContent = 'Worker считает…';
        w.postMessage({ ms: DUR });
      });
      ctx.on(bM, 'click', function () {
        maxGap = 0; track = true; bW.disabled = bM.disabled = true; res.textContent = 'Считаем на главном потоке…';
        ctx.timeout(function () {
          var t0 = performance.now(), loops = 0, n = 0;
          while (performance.now() - t0 < DUR) { for (var k = 0; k < 20000; k++) n += Math.sqrt(k) * Math.sin(k); loops++; }
          report('Главный поток', loops);
        }, 50);
      });
      add(ctx.live, mover, fps, bW, document.createTextNode(' '), bM, res);
      if (ctx.reducedMotion) add(ctx.live, h('p', { 'class': 'demo-hint' }, 'Включено уменьшение движения: точка не двигается, но счётчик кадров работает.'));
    }
  });

  // ==========================================================================
  // 23. Производительность: debounce, throttle и requestAnimationFrame
  // ==========================================================================
  register('js-perf', {
    title: 'debounce, throttle и rAF: сколько вызовов на самом деле',
    mode: 'host',
    note: 'Двигайте указатель по области или нажмите «Пачка событий» (20 событий за секунду). Счётчики показывают, сколько раз сработала каждая стратегия.',
    code:
      "const debounced = debounce(fn, 300);   // вызов после паузы в 300 мс\nconst throttled = throttle(fn, 300);   // не чаще раза в 300 мс\n" +
      "let queued = false;\nfunction onMove() { if (queued) return; queued = true;\n  requestAnimationFrame(() => { queued = false; fn(); });   // не чаще раза за кадр\n}",
    init: function (ctx) {
      var area = h('div', { 'class': 'fp-area' }, 'Двигайте указатель здесь');
      var burst = btn('Пачка событий (20 за 1 с)'), reset = btn('Сбросить');
      var counts = { raw: 0, deb: 0, thr: 0, raf: 0 }, last = { deb: '—', thr: '—', raf: '—' }, t0 = performance.now();
      var lanes = {};
      ['raw', 'deb', 'thr', 'raf'].forEach(function (k) { lanes[k] = h('span'); });
      var box = h('div', { role: 'status' });
      [['raw', 'Сырые события'], ['deb', 'debounce 300'], ['thr', 'throttle 300'], ['raf', 'rAF']].forEach(function (p) {
        var l = h('div', { 'class': 'fp-lane' }); add(l, h('b', null, p[1]), lanes[p[0]]); box.appendChild(l);
      });
      function paint() {
        lanes.raw.textContent = counts.raw + ' вызовов';
        lanes.deb.textContent = counts.deb + ' вызовов (последний на ' + last.deb + ' мс)';
        lanes.thr.textContent = counts.thr + ' вызовов (последний на ' + last.thr + ' мс)';
        lanes.raf.textContent = counts.raf + ' вызовов (последний на ' + last.raf + ' мс)';
      }
      function now() { return Math.round(performance.now() - t0); }
      var debRel = null, lastThr = -Infinity, rafRel = null;
      function onEvent() {
        counts.raw++;
        if (debRel) debRel();
        debRel = ctx.timeout(function () { counts.deb++; last.deb = now(); paint(); }, 300);
        var tn = performance.now();
        if (tn - lastThr >= 300) { lastThr = tn; counts.thr++; last.thr = now(); }
        if (!rafRel) rafRel = ctx.raf(function () { rafRel = null; counts.raf++; last.raf = now(); paint(); });
        paint();
      }
      ctx.on(area, 'pointermove', onEvent);
      var bursting = false;
      ctx.on(burst, 'click', function () {
        if (bursting) return;
        bursting = true; var n = 0, rel;
        rel = ctx.interval(function () { onEvent(); if (++n >= 20) { rel(); bursting = false; } }, 50);
      });
      ctx.on(reset, 'click', function () { counts = { raw: 0, deb: 0, thr: 0, raf: 0 }; last = { deb: '—', thr: '—', raf: '—' }; t0 = performance.now(); lastThr = -Infinity; paint(); });
      add(ctx.live, area, burst, document.createTextNode(' '), reset, box);
      paint();
    }
  });

  // ==========================================================================
  // 24. Console API: песочница с перехватом вывода (код читателя — только в sandbox)
  // ==========================================================================
  register('js-console', {
    title: 'Песочница Console API',
    mode: 'sandbox',
    kind: 'js',
    scripts: true,
    height: 24,
    note: 'Правьте код и смотрите вывод в панели под полем. Код исполняется в изолированном iframe, а console перенаправлен на страницу.',
    code:
      "console.log('строка', 42, { a: 1 }, [1, 2]);\n" +
      "console.info('информация');\nconsole.warn('предупреждение');\nconsole.error('ошибка');\n" +
      "console.table([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);\n" +
      "console.group('Группа');\nconsole.log('внутри группы');\nconsole.groupEnd();\n" +
      "console.count();\nconsole.count();\nconsole.count('x');\n" +
      "console.assert(1 === 2, 'утверждение не выполнено');\n" +
      "console.time('цикл');\nfor (let i = 0; i < 1e6; i++) {}\nconsole.timeEnd('цикл');"
  });

  // ==========================================================================
  // 26. Современный JavaScript: каждая возможность с бейджем и кнопкой «Выполнить»
  // ==========================================================================
  var MODERN = [
    ['js:groupBy', 'Object.groupBy', "Object.groupBy([1, 2, 3, 4, 5], n => n % 2 ? 'нечётные' : 'чётные')",
      function () { return Object.groupBy([1, 2, 3, 4, 5], function (n) { return n % 2 ? 'нечётные' : 'чётные'; }); }],
    ['js:toSorted', 'Array.prototype.toSorted', "const a = [3, 1, 2];\nconst s = a.toSorted();   // a не изменился",
      function () { var a = [3, 1, 2], s = a.toSorted(); return { исходный: a, копия: s }; }],
    ['js:structuredClone', 'structuredClone', "const c = structuredClone({ d: new Date(0), m: new Map([[1, 'a']]) });",
      function () { var o = { d: new Date(0), m: new Map([[1, 'a']]), n: { x: 1 } }, c = structuredClone(o); return 'clone.d instanceof Date: ' + (c.d instanceof Date) + '; clone.m instanceof Map: ' + (c.m instanceof Map) + '; clone.n !== o.n: ' + (c.n !== o.n) + '; JSON.stringify(Map) даёт ' + JSON.stringify(o.m); }],
    ['js:withResolvers', 'Promise.withResolvers', "const { promise, resolve } = Promise.withResolvers();\nsetTimeout(() => resolve('готово'), 50);",
      function (ctx) { var r = Promise.withResolvers(); ctx.timeout(function () { r.resolve('promise выполнен снаружи: готово'); }, 50); return r.promise; }],
    ['js:abortTimeout', 'AbortSignal.timeout', "const s = AbortSignal.timeout(50);\ns.addEventListener('abort', () => console.log(s.reason.name));",
      function (ctx) { var s = AbortSignal.timeout(50); return new Promise(function (res) { ctx.on(s, 'abort', function () { res('сигнал отменён через 50 мс, причина: ' + s.reason.name); }); }); }],
    ['js:iteratorHelpers', 'Iterator helpers', "[1, 2, 3, 4, 5].values().filter(x => x % 2).map(x => x * 10).toArray()",
      function () { return [1, 2, 3, 4, 5].values().filter(function (x) { return x % 2; }).map(function (x) { return x * 10; }).toArray(); }],
    ['js:temporal', 'Temporal', "const d = Temporal.Now.plainDateISO();\nd.add({ days: 30 }).toString()",
      function () { var d = Temporal.Now.plainDateISO(); return { сегодня: d.toString(), 'через 30 дней': d.add({ days: 30 }).toString() }; }]
  ];

  register('js-modern', {
    title: 'Современный JavaScript: бейдж и живой запуск',
    mode: 'host',
    note: 'У каждой возможности бейдж проверяет ваш браузер. Нажмите «Выполнить»: результат получен настоящим вызовом, а при отсутствии возможности пример скажет об этом и ничего не подменит.',
    init: function (ctx) {
      var dead = false; ctx.onCleanup(function () { dead = true; });
      var outs = [], runs = [];
      MODERN.forEach(function (m, i) {
        var row = h('div', { 'class': 'mj-row' });
        var title = h('p', { 'class': 'demo-label' }, m[1]);
        var pre = h('pre', { 'class': 'js-code', tabindex: '0', 'aria-label': 'Код: ' + m[1] }); pre.textContent = m[2];
        var b = btn('Выполнить'), out = h('div', { 'class': 'demo-readout', role: 'status' }, 'Ещё не запускали');
        function run() {
          var sp = ctx.supports(m[0]);
          if (!sp.ok) { out.textContent = 'Не поддерживается вашим браузером (проверка: ' + sp.how + '). Результата нет, и он не имитируется.'; return; }
          var r;
          try { r = m[3](ctx); } catch (e) { out.textContent = 'Ошибка: ' + errText(e); return; }
          if (r && typeof r.then === 'function') { out.textContent = 'Ждём результат…'; r.then(function (v) { if (!dead) out.textContent = 'Результат: ' + (typeof v === 'string' ? v : show(v)); }, function (e) { if (!dead) out.textContent = 'Ошибка: ' + errText(e); }); }
          else out.textContent = 'Результат: ' + (typeof r === 'string' ? r : show(r));
        }
        ctx.on(b, 'click', run);
        runs.push(run);
        add(row, title, ctx.badge(m[0]), pre, b, out);
        ctx.live.appendChild(row);
      });
      var all = btn('Выполнить все');
      ctx.on(all, 'click', function () { runs.forEach(function (r) { r(); }); });
      ctx.live.insertBefore(all, ctx.live.firstChild);
    }
  });
})();
