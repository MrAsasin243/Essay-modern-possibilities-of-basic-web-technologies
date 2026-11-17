/*
 * assets/demos-showcase.js — примеры для главной страницы.
 * Каждый показывает одну часть контракта движка (assets/demo.js):
 *   html / js    — режим sandbox (код читателя только в изолированном iframe)
 *   lifecycle    — режим host и очистка ресурсов
 *   support      — проверка возможностей в браузере читателя
 *   camera       — состояния «защищённый контекст» и «не поддерживается»
 *   fetch        — состояние «нужен сервер» и настоящий запрос
 * Контент (где стоит пример) лежит в HTML, реализация — здесь, связь по id.
 */
(function () {
  'use strict';

  // 1. HTML/CSS в песочнице без скриптов: у iframe нет даже allow-scripts.
  Demo.register('showcase-html', {
    pitfalls: [
      'Скрипты в этом примере отключены полностью, поэтому кнопка не реагирует на клики: это демонстрация, а не ошибка.',
      'CSS из песочницы не влияет на сайт, и стили сайта не влияют на песочницу: у iframe свой документ.'
    ],
    title: 'HTML и CSS в изолированной песочнице',
    mode: 'sandbox',
    kind: 'html',
    scripts: false,
    height: 190,
    note: 'Правьте код слева: результат пересобирается сам. Скрипты здесь отключены полностью.',
    code:
      '<style>\n' +
      '  button { font: inherit; padding: .5em 1em; border-radius: 8px;\n' +
      '           border: 1px solid #3157c8; background: #edf1ff; }\n' +
      '  button:hover { background: #dbe4ff; }\n' +
      '  button:focus-visible { outline: 3px solid #d97706; outline-offset: 2px; }\n' +
      '</style>\n' +
      '<p>Измени текст или стили.</p>\n' +
      '<button type="button">Кнопка</button>'
  });

  // 2. JavaScript в песочнице: allow-scripts есть, allow-same-origin нет.
  Demo.register('showcase-js', {
    pitfalls: [
      'Бесконечный цикл в этом примере подвесит вкладку: sandbox ограничивает доступ, но не процессорное время.',
      'localStorage, cookie и IndexedDB в песочнице без allow-same-origin недоступны: попытка бросает SecurityError.',
      'Ошибки синтаксиса ловятся событием error, но номер строки может быть смещён из-за служебного кода вокруг.'
    ],
    title: 'JavaScript в песочнице: где проходит граница',
    mode: 'sandbox',
    kind: 'js',
    scripts: true,
    height: 40,
    note: 'Код выполняется в iframe с sandbox="allow-scripts" (без allow-same-origin). Попробуйте дописать обращение к window.parent.document.cookie или сломать синтаксис.',
    code:
      "console.log('origin внутри песочницы:', location.origin);\n" +
      "try { window.parent.document.title; }\n" +
      "catch (e) { console.log('Родительский документ недоступен:', e.name); }\n" +
      "try { localStorage.setItem('x', '1'); }\n" +
      "catch (e) { console.log('localStorage недоступен:', e.name); }\n" +
      "console.warn('Это предупреждение попало в панель через postMessage.');"
  });

  // 3. Режим host и контракт очистки.
  Demo.register('showcase-lifecycle', {
    pitfalls: [
      'Счётчики показывают только ресурсы, созданные через движок. Слушатели, добавленные напрямую через addEventListener, он не видит.',
      'Таймер, остановленный при уходе с экрана, не догоняет пропущенное время: отсчёт идёт с нуля.'
    ],
    title: 'Очистка ресурсов: слушатель и таймер живут, пока пример на экране',
    mode: 'host',
    note: 'Прокрутите страницу так, чтобы пример ушёл с экрана, а затем вернитесь. Таймер остановится и запустится заново, а счётчики внизу вернутся к прежним значениям. В консоли то же самое покажет Demo.stats().',
    code:
      "function (ctx) {\n" +
      "  var n = 0, sec = 0;\n" +
      "  ctx.on(btn, 'click', function () { n++; btn.textContent = 'Клик: ' + n; });\n" +
      "  ctx.interval(function () { sec++; paint(); }, 1000);\n" +
      "  // Больше ничего делать не нужно: при уходе с экрана движок\n" +
      "  // сам снимет слушатель и остановит таймер.\n" +
      "}",
    init: function (ctx) {
      var n = 0, sec = 0;
      var btn = ctx.el('button', { type: 'button', 'class': 'demo-btn' }, 'Клик: 0');
      var out = ctx.el('p', { 'class': 'demo-stat' });
      function paint() {
        var t = ctx.stats().totals;
        out.textContent = 'Секунд работы: ' + sec + ' · на странице сейчас слушателей: ' + t.listeners +
          ', таймеров: ' + t.timers + ', кадров: ' + t.frames;
      }
      ctx.on(btn, 'click', function () { n++; btn.textContent = 'Клик: ' + n; });
      ctx.interval(function () { sec++; paint(); }, 1000);
      ctx.live.appendChild(btn);
      ctx.live.appendChild(out);
      paint();
    }
  });

  // 4. Бейджи поддержки: таблица проверок в браузере читателя.
  Demo.register('showcase-support', {
    pitfalls: [
      'Feature detection отвечает «есть ли возможность», а не «работает ли она хорошо»: реализации могут быть неполными.',
      'Часть проверок (например, MathML) требует вставки элемента в документ и измерения размеров.',
      'Результат относится к вашему браузеру и его версии в данный момент: расширения и настройки могут его менять.'
    ],
    title: 'Что поддерживает именно ваш браузер',
    mode: 'host',
    note: 'Каждая строка — реальная проверка в момент открытия страницы. В колонке «Как проверяем» указан точный способ, он же подсказка при наведении на бейдж.',
    init: function (ctx) {
      var wrap = ctx.el('div', { 'class': 'table-wrap demo-scroll' });
      var table = ctx.el('table');
      var head = ctx.el('tr');
      ['Возможность', 'Результат', 'Как проверяем'].forEach(function (t) { head.appendChild(ctx.el('th', { scope: 'col' }, t)); });
      table.appendChild(ctx.el('thead')).appendChild(head);
      var tbody = ctx.el('tbody');
      Demo.supportKeys().forEach(function (key) {
        var r = ctx.supports(key);
        var tr = ctx.el('tr');
        var a = ctx.el('a', { href: r.url, rel: 'noopener' }, r.label);
        tr.appendChild(ctx.el('td')).appendChild(a);
        tr.appendChild(ctx.el('td')).appendChild(ctx.badge(key));
        tr.appendChild(ctx.el('td')).appendChild(ctx.el('code', null, r.how));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      ctx.live.appendChild(wrap);
    }
  });

  // 5. Камера: нужен защищённый контекст и getUserMedia.
  Demo.register('showcase-camera', {
    pitfalls: [
      'Камера требует разрешения пользователя. После явного отказа (NotAllowedError) браузер обычно запоминает решение, и повторный запрос кодом ничего не покажет.',
      'В iframe доступ к камере нужно отдельно разрешить атрибутом allow; поэтому такие примеры не запускают в песочнице.',
      'Поток нужно останавливать: пока дорожки активны, индикатор камеры горит. Пример делает это при уходе с экрана.'
    ],
    title: 'Камера: защищённый контекст и поддержка API',
    mode: 'host',
    needs: { secure: true, support: ['api:camera'] },
    badges: ['api:camera'],
    note: 'Если браузер не считает страницу защищённым контекстом (window.isSecureContext = false), пример честно скажет об этом. Не протокол определяет доступность API, а ответ браузера.',
    code:
      "navigator.mediaDevices.getUserMedia({ video: true })\n" +
      "  .then(function (stream) { video.srcObject = stream; })\n" +
      "  .catch(function (e) { console.log(e.name); });\n" +
      "// При выходе из примера: stream.getTracks().forEach(t => t.stop())",
    init: function (ctx) {
      var stream = null, dead = false;
      var info = ctx.el('p', { 'class': 'demo-stat' }, 'isSecureContext = ' + ctx.env.secure + ', протокол ' + ctx.env.protocol);
      var btn = ctx.el('button', { type: 'button', 'class': 'demo-btn' }, 'Включить камеру');
      var msg = ctx.el('p', { role: 'status' });
      var video = ctx.el('video', { playsinline: '', 'aria-label': 'Изображение с камеры' });
      video.muted = true;
      video.hidden = true;
      video.style.maxWidth = '100%';

      function stopStream(s) {
        if (s) s.getTracks().forEach(function (t) { t.stop(); });
      }
      ctx.onCleanup(function () {
        dead = true;
        stopStream(stream);
        stream = null;
        video.srcObject = null;
      });

      ctx.on(btn, 'click', function () {
        if (stream) {
          stopStream(stream);
          stream = null;
          video.srcObject = null;
          video.hidden = true;
          btn.textContent = 'Включить камеру';
          msg.textContent = 'Камера выключена.';
          return;
        }
        msg.textContent = 'Запрашиваю доступ…';
        navigator.mediaDevices.getUserMedia({ video: true }).then(function (s) {
          if (dead) { stopStream(s); return; }   // пример успели закрыть, пока шёл запрос
          stream = s;
          video.srcObject = s;
          video.hidden = false;
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
          btn.textContent = 'Выключить камеру';
          msg.textContent = 'Камера включена. Поток остановится при выходе примера с экрана.';
        }, function (e) {
          if (e.name === 'NotAllowedError') msg.textContent = 'Доступ запрещён (NotAllowedError): вы отклонили запрос или политика страницы запрещает камеру.';
          else if (e.name === 'NotFoundError') msg.textContent = 'Камера не найдена (NotFoundError).';
          else msg.textContent = 'Не удалось включить камеру: ' + e.name + (e.message ? ' — ' + e.message : '');
        });
      });

      ctx.live.appendChild(info);
      ctx.live.appendChild(btn);
      ctx.live.appendChild(msg);
      ctx.live.appendChild(video);
    }
  });

  // 6. Нужен сервер: настоящий запрос; fetch не отклоняется на 404.
  Demo.register('showcase-fetch', {
    pitfalls: [
      'fetch отклоняется только при сетевой ошибке. Ответ 404 или 500 — это успешный Promise с res.ok = false.',
      'По file:// запрос к соседнему файлу блокируется браузером и закончится TypeError — это не 404.',
      'Ответ может быть закэширован GitHub Pages на несколько минут.'
    ],
    title: 'fetch и ответ 404: настоящий запрос',
    mode: 'host',
    needs: { server: 'запрашивается несуществующий файл assets/does-not-exist.json, и ответ 404 даёт только веб-сервер.' },
    note: 'На file:// такого ответа получить нельзя, поэтому там пример объясняет это вместо имитации. Через http: или https: вы увидите настоящий 404.',
    code:
      "fetch('assets/does-not-exist.json')\n" +
      "  .then(function (res) {\n" +
      "    console.log(res.ok, res.status);   // false 404: promise НЕ отклонён\n" +
      "  })\n" +
      "  .catch(function (e) {\n" +
      "    console.log(e.name);               // только сетевая ошибка\n" +
      "  });",
    init: function (ctx) {
      var ctl = new AbortController();
      ctx.onCleanup(function () { ctl.abort(); });
      var btn = ctx.el('button', { type: 'button', 'class': 'demo-btn' }, 'Отправить запрос');
      var out = ctx.el('p', { role: 'status', 'class': 'demo-stat' });
      ctx.on(btn, 'click', function () {
        out.textContent = 'Запрос отправлен…';
        fetch('assets/does-not-exist.json', { signal: ctl.signal }).then(function (res) {
          out.textContent = 'Promise выполнен успешно, но res.ok = ' + res.ok + ', res.status = ' + res.status +
            '. Ошибки HTTP fetch не превращает в reject.';
        }, function (e) {
          if (e.name === 'AbortError') return;
          out.textContent = 'Promise отклонён (сетевая ошибка): ' + e.name + ': ' + e.message;
        });
      });
      ctx.live.appendChild(btn);
      ctx.live.appendChild(out);
    }
  });
})();
