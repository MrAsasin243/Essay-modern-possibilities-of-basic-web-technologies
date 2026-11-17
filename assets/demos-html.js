/*
 * assets/demos-html.js — примеры раздела «HTML» (html.html).
 * Все примеры здесь работают в режиме host: код написан автором сайта.
 * Единственное, что вводит читатель, — данные (разметка для разбора, значения полей),
 * и данные никогда не вставляются в страницу через innerHTML:
 *   - чужая разметка разбирается DOMParser в отдельный неактивный документ,
 *     а на экран выводятся только имена узлов через textContent;
 *   - собственная разметка автора превращается в узлы через fromHTML() (DOMParser + importNode).
 * Каждый ресурс создаётся через ctx (см. assets/demo.js), поэтому очищается автоматически.
 */
(function () {
  'use strict';

  var NS_MATH = 'http://www.w3.org/1998/Math/MathML';
  var NS_SVG = 'http://www.w3.org/2000/svg';
  var uid = 0;

  // ---------- Подводные камни и ограничения (контент отделён от реализации примеров) ----------
  var PITFALLS = {
    'html-dom': [
      'DOMParser разбирает текст в отдельный неактивный документ: скрипты не выполняются, ресурсы не грузятся. Но это не санитайзер: если взять результат и вставить в живую страницу (innerHTML, importNode), чужая разметка станет частью страницы со всеми последствиями.',
      'Здесь показан статический разбор. Дерево во вкладке Elements в DevTools — это живой DOM после выполнения скриптов, расширений и действий пользователя, поэтому оно может отличаться.',
      'Пробельные текстовые узлы скрыты ради читаемости, но в настоящем DOM они есть: влияют на childNodes.length, firstChild и на пробелы между inline-элементами.',
      'parseFromString разбирает документ целиком и достраивает html, head, body. Разбор фрагмента через innerHTML элемента идёт в контексте этого элемента, и результат отличается: например, <td> вне таблицы в контексте body отбрасывается.',
      'Дерево строится по правилам восстановления ошибок HTML, а не по «здравому смыслу». Вложенные <p> или <a> в <a> закрываются и переставляются, поэтому нельзя считать, что «что написал, то и получил».',
      'Вывод ограничен 300 узлами и 2000 символов ввода, чтобы вставка огромного текста не подвесила страницу.'
    ],
    'html-semantics': [
      'Таблица ролей упрощена. Например, header и footer получают роли banner и contentinfo только вне article, section и main; section становится областью (region) лишь при наличии доступного имени; a без href не ссылка.',
      'Настоящее дерево доступности строит браузер, и оно зависит от браузера и операционной системы. Проверять нужно во вкладке Accessibility в DevTools и в живом скринридере (NVDA, VoiceOver, TalkBack): их озвучивание различается.',
      'Имя (name) элементов из aria-label, alt, label и содержимого здесь не вычисляется: показан только текст.',
      'Семантика не чинится ARIA «сверху»: роль на div не добавляет фокус, клавиши и поведение. Первое правило ARIA — по возможности использовать нативный элемент.',
      'Один main на страницу, осмысленная иерархия h1–h6 и подписи у повторяющихся областей (например, двух nav) — частые места ошибок, которые автоматическая проверка не всегда ловит.'
    ],
    'html-text': [
      'Внешний вид взят из встроенной таблицы стилей браузера (user agent stylesheet), он различается между браузерами. Смысл элемента от внешнего вида не зависит: b и strong выглядят одинаково, а читаются и значат по-разному.',
      'Подсказка abbr title появляется при наведении мыши и недоступна на сенсорных экранах и при навигации с клавиатуры. Не прячьте в ней важное: раскрывайте сокращение в тексте.',
      'Кавычки у q зависят от атрибута lang в документе и от браузера, поэтому не добавляйте свои кавычки рядом.',
      'Не выбирайте элемент ради внешнего вида: заголовок для крупного шрифта или blockquote для отступа нарушают структуру. Для вида есть CSS.',
      'sub и sup подходят для настоящих индексов и степеней, а для сложных формул нужен MathML.'
    ],
    'html-links': [
      'mailto: и tel: зависят от программ на устройстве. На компьютере без почтового клиента или телефонии клик может не сделать ничего, и страница об этом не узнает.',
      'Атрибут download игнорируется для cross-origin адресов: браузер просто перейдёт по ссылке. Работает для того же origin, blob: и data:.',
      'target="_blank" без rel: современные браузеры по умолчанию подразумевают noopener, но старые нет. Явный rel="noopener" остаётся хорошей привычкой; noreferrer дополнительно скрывает адрес источника.',
      'На GitHub Pages проектный сайт живёт под префиксом /имя-репозитория/. Ссылки, начинающиеся с «/», ведут в корень домена, а не в проект, поэтому на сайте используйте относительные адреса.',
      'URL.origin на file: у разных браузеров может быть строкой «null» или «file://», а относительные ссылки превращаются в пути файловой системы. Это одна из причин, почему по file:// работает не всё.',
      'Якорная ссылка меняет hash и историю, но не перезагружает страницу. Цель должна иметь id, а для фокуса клавиатуры целевому элементу без интерактивности нужен tabindex="-1".'
    ],
    'html-table-scope': [
      'Это упрощённая модель. Реальные программы чтения экрана по-разному озвучивают заголовки: зависит от режима таблиц, настроек подробности и версии программы.',
      'Для простых таблиц достаточно th и scope. Для сложных (объединённые ячейки, несколько уровней заголовков) нужны атрибуты headers и id, а часто стоит упростить структуру.',
      'Жирный шрифт в td не делает ячейку заголовком. Заголовком её делает только th, и это не меняется ни стилями, ни JavaScript.',
      'Не используйте таблицы для вёрстки. Для сетки есть CSS Grid и Flexbox, а таблица ради расположения создаёт шум для скринридера.',
      'caption — единственный способ дать таблице имя, которое видят все, включая программы чтения экрана.'
    ],
    'html-input-types': [
      'Проверка probe.type === t выясняет только то, знает ли браузер тип. Качество интерфейса она не проверяет: выбор даты, цвета и файла различается между браузерами и операционными системами, а в части браузеров некоторые типы (например, month и week) работают хуже или иначе.',
      'У date, time и datetime-local value всегда в машинном формате (например, 2026-11-17), а отображение зависит от языка системы и браузера. Нельзя разбирать то, что видит пользователь.',
      'number принимает «e» и знак, теряет ведущие нули и при некорректном вводе даёт пустое value (флаг badInput). Для телефонов, индексов и номеров карт лучше type="text" с inputmode="numeric" и pattern.',
      'tel и search не проверяют формат; email проверяет только базовую форму; url требует схему. Серьёзная проверка всё равно нужна на сервере.',
      'hidden — не секрет: значение видно в DevTools и меняется. password скрывает ввод только визуально, значение читается из JavaScript.',
      'У file в value попадает вымышленный путь вида C:\\fakepath\\имя; читать нужно files. Задать value файла программно нельзя, можно только очистить.',
      'radio образуют группу только при одинаковом name. Без него выбираются независимо.',
      'color возвращает только #rrggbb без прозрачности. Кнопка type="image" при отправке формы добавляет координаты клика.'
    ],
    'html-validation': [
      'Тексты сообщений браузера локализованы и плохо поддаются стилизации. Единообразных сообщений получить нельзя, поэтому часто пишут свои на основе validity.',
      'Псевдокласс :invalid срабатывает сразу, ещё до ввода, и пугает красной рамкой на пустой форме. Мягче :user-invalid, но его поддержка новее и на неё нельзя опираться вслепую.',
      'minlength и maxlength проверяются только при вводе пользователем, не при программной установке value. Поля с readonly и disabled в проверке не участвуют.',
      'Если выставили setCustomValidity с текстом, поле остаётся недопустимым, пока не вызвать setCustomValidity("") на пустую строку. Забытый сброс — классическая ошибка.',
      'pattern неявно оборачивается в начало и конец строки и компилируется браузером как регулярное выражение; часть синтаксиса может зависеть от режима (флаги u или v).',
      'Клиентская проверка не защита. Запрос можно отправить без формы, а атрибут novalidate и DevTools отключают проверку. Сервер обязан проверять всё заново.',
      'checkValidity() только возвращает результат и вызывает событие invalid; reportValidity() ещё и показывает сообщение пользователю.'
    ],
    'html-srcset': [
      'sizes описывает предполагаемую ширину слота, а не фактический размер картинки. Браузер выбирает ресурс до вёрстки, поэтому sizes не может опираться на размеры контейнера, только на viewport и абсолютные значения.',
      'Выбор остаётся за браузером: он учитывает кэш, сеть и режим экономии трафика, поэтому нельзя ожидать строго «наименьший подходящий». Уже загруженный более крупный вариант при уменьшении окна обычно сохраняется.',
      'Дескрипторы w и x в одном srcset смешивать нельзя. Для w обязателен sizes, иначе по умолчанию считается 100vw.',
      'devicePixelRatio меняется при масштабе страницы (Ctrl +/−), и в этот момент выбор может не обновиться.',
      'Всегда указывайте width и height (или aspect-ratio), иначе при загрузке макет «прыгает» (смещение макета, CLS).',
      'Здесь изображения — SVG из Blob: они векторные, поэтому «разрешение» условное. blob:-адреса действуют только в этом документе. Для реальных проектов делают отдельные растровые файлы.'
    ],
    'html-media': [
      'Автовоспроизведение со звуком блокируется политикой браузеров. play() возвращает Promise, и он может быть отклонён, поэтому у него обязателен обработчик ошибок.',
      'Дорожка здесь создана из JavaScript через addTextTrack. Обычный путь — <track src="файл.vtt">, и он требует тот же origin или CORS; по file:// файл с субтитрами в части браузеров не загрузится.',
      'Поддержка форматов и кодеков различается: mp3, aac, ogg, mp4, webm. Давайте несколько <source> и проверяйте canPlayType().',
      'На iOS Safari свойство volume у медиаэлементов игнорируется (громкость задаётся системой).',
      'Доступность: нужны субтитры или транскрипт, подпись и управление с клавиатуры. Родные controls этому соответствуют, самодельные плееры часто нет.',
      'Приём «видео с аудиофайлом ради субтитров» используется только для демонстрации. В проектах для звука без картинки субтитры не показываются у <audio>.',
      'Объекты Blob и URL, созданные примером, освобождаются при уходе с экрана, а элементы останавливаются и теряют src.'
    ],
    'html-iframe-sandbox': [
      'Флаги sandbox применяются при навигации iframe. Если поменять атрибут у уже загруженного iframe, это не подействует до перезагрузки, поэтому пример каждый раз создаёт iframe заново.',
      'Комбинация allow-scripts и allow-same-origin опасна, когда встроенный документ того же origin, что и страница (как srcdoc здесь или свой сайт): он может удалить sandbox у своего iframe. Для сторонней страницы с другим origin она не даёт доступа к родителю, но для чужого кода на своём origin недопустима.',
      'Флаги allow-forms, allow-popups, allow-modals и другие здесь не проверяются: без пользовательского жеста их поведение нельзя надёжно наблюдать из скрипта. Читайте их в документации MDN.',
      'Запрет встраивания вашего сайта в чужие iframe задаётся заголовками X-Frame-Options или CSP frame-ancestors. На GitHub Pages заголовки настроить нельзя, а в <meta> директива frame-ancestors игнорируется.',
      'В тестовой странице сообщение отправляется через postMessage с адресом «*» и принимается только после проверки event.source и токена. В реальном коде указывают конкретный targetOrigin и проверяют origin.',
      'srcdoc наследует политику CSP родителя. Если вы добавите на страницу CSP без разрешения inline-скриптов, тестовая страница и песочницы сайта перестанут работать.'
    ],
    'html-svg': [
      'SVG в <img src="*.svg"> и в CSS-фоне не выполняет скрипты и не принимает события; интерактивность работает только у инлайнового <svg>, а также у <object> и iframe.',
      'У path с fill="none" клик ловится только по линии. Кликабельную область можно расширить прозрачной обводкой побольше.',
      'role="button" на rect даёт только имя и роль. Клавиатуру (Tab, Enter, пробел) пришлось добавить вручную; нативных кнопок внутри SVG нет.',
      'getTotalLength() для элемента без отрисовки (display:none, не в документе) может вернуть 0 или бросить ошибку. Измеряйте после вставки в DOM.',
      'Фиксированные width и height мешают адаптивности. Лучше задавать viewBox и размер через CSS (в примере для этого стоит max-width).',
      'При включённом «уменьшении движения» путь появляется сразу, без анимации. Не делайте смысл зависимым от движения.'
    ],
    'html-canvas': [
      'Canvas — растр. При масштабировании через CSS картинка размывается. Для чётких линий на экранах с высокой плотностью размеры канваса умножают на devicePixelRatio; в этом примере это не сделано, поэтому штрихи могут быть мягче.',
      'Нарисованное не входит в DOM и в дерево доступности. Скринридер не узнает, что на холсте. Нужны текстовая альтернатива и управление с клавиатуры, как здесь.',
      'Изменение атрибутов width и height очищает холст и сбрасывает состояние контекста.',
      'touch-action: none нужен, чтобы палец рисовал, а не прокручивал страницу. Побочный эффект: страницу нельзя прокрутить, начав жест на холсте.',
      'Размер холста ограничен браузером (максимальные размеры и площадь у Chrome, Safari и мобильных отличаются). getContext("2d") может вернуть null.',
      'pointermove может приходить реже, чем двигается палец. Для точных линий есть getCoalescedEvents(); здесь линия строится из доступных точек.'
    ],
    'html-mathml': [
      'MathML Core появилось в Chromium сравнительно недавно (2023), в Firefox и Safari поддержка старше. Отрисовка зависит от математических шрифтов в системе, поэтому вид формул различается.',
      'Колонка «поддержка» определяется проверкой реальных размеров вставленного элемента: проверка свойств в JS для MathML ненадёжна.',
      'Длинные формулы автоматически не переносятся. Нужна прокрутка контейнера или ручная разбивка.',
      'Копирование формулы в другие программы (Word и т. п.) зависит от приложения, и не всегда сохраняет структуру.',
      'Самый распространённый обходной путь — библиотеки MathJax и KaTeX. На этом сайте внешних зависимостей нет, поэтому показан только нативный MathML.',
      'Картинка с формулой (canvas) фиксирует шрифт и размер в момент рисования; aria-label содержит только то, что написали вручную.'
    ],
    'html-dialog': [
      'Атрибут open у <dialog> открывает окно немодально и без управления фокусом. Для настоящего модального окна используйте showModal().',
      'Esc закрывает модальный диалог и вызывает событие cancel. После закрытия по Esc значение returnValue остаётся прежним: оно меняется только кнопкой формы с method="dialog".',
      'Клик по фону сам диалог не закрывает. Нужен собственный обработчик (или новые возможности вроде closedby, но их поддержка пока не везде).',
      'Модальный диалог делает остальную страницу инертной, но не блокирует прокрутку полностью во всех браузерах одинаково.',
      'Диалог живёт в верхнем слое (top layer): z-index на него не действует, а стилизация фона делается через ::backdrop.',
      'Поддержка <dialog> в современных браузерах хорошая, но не в очень старых. Проверка выше показывает результат именно для вашего браузера.'
    ],
    'html-inert': [
      'inert — не то же самое, что disabled: поля внутри inert-блока по-прежнему отправляются с формой. Для отключения отправки нужен disabled.',
      'Inert-содержимое недоступно для клавиатурного фокуса и программ чтения экрана, но визуально остаётся. Покажите пользователю, что блок отключён (например, затемнение), иначе он не поймёт причину.',
      'contenteditable не создаёт редактор: поведение вставки, отмены и форматирования отличается между браузерами. Вставка форматированного текста приносит чужую разметку, и сохранять её на сервере без очистки нельзя.',
      'Для редактируемого блока обязательны role="textbox", имя и tabindex, иначе он недоступен.',
      'Свой редактор текста — задача на недели: если можно, берите нативные input и textarea.'
    ],
    'html-webcomponent': [
      'customElements.define нельзя вызвать дважды для одного имени и нельзя отменить. Регистрация остаётся, пока открыта страница; имя должно содержать дефис.',
      'Из-за Shadow DOM внешние стили не доходят до внутреннего содержимого. Наследуемые свойства (color, font) всё же протекают внутрь, а снаружи стилизуют через CSS-переменные, ::part() и ::slotted().',
      'Слотированное содержимое остаётся частью обычного DOM страницы и стилизуется снаружи, как показывает пример.',
      'Конструктор нельзя использовать для чтения атрибутов и дочерних узлов: они ещё могут быть не готовы. Работу делают в connectedCallback.',
      'Пользовательский элемент сам не участвует в форме. Для этого нужен ElementInternals и formAssociated, иначе значение не отправится.',
      'aria-labelledby и подобные ссылки по id не пересекают границу Shadow DOM, что осложняет доступность.',
      'Без JavaScript содержимое компонента не появится. Декларативный Shadow DOM (атрибут shadowrootmode) решает это частично и поддерживается не везде.'
    ],
    'html-script-order': [
      'Это модель по правилам HTML Standard, а не измерение. В реальности порядок и время зависят от кэша, приоритетов HTTP/2, preload scanner и параллельных загрузок.',
      'defer действует только на внешние классические скрипты. Для встроенного классического скрипта он игнорируется. async у встроенного классического скрипта тоже не действует.',
      'Скрипты type="module" отложены, как defer, и даже встроенные модули ждут конца разбора. Модуль с async выполняется, как только готов.',
      'DOMContentLoaded наступает после defer-скриптов и модулей, но не ждёт async. Событие load ждёт все ресурсы.',
      'Динамически созданный скрипт по умолчанию асинхронный. Чтобы сохранить порядок, нужно поставить script.async = false.',
      'Время выполнения здесь условно 40 мс, а пауза парсера на время выполнения async-скрипта не нарисована.',
      'По file:// браузеры блокируют type="module" с внешним файлом, поэтому этот сайт использует классические скрипты с defer.'
    ],
    'html-a11y': [
      'Автоматические проверки находят лишь часть проблем доступности. Многое (порядок фокуса, понятность подписей, контекст) проверяется только вручную и с участием реальных пользователей.',
      'Режим «только клавиатура» здесь отключает мышь через pointer-events: none. Это упрощение: он не воспроизводит переключатели, голосовое управление и экранные клавиатуры.',
      'outline: none без замены нарушает критерий WCAG 2.4.7 (видимый фокус). Если убираете стандартный контур, дайте свой, достаточно заметный.',
      'placeholder не заменяет подпись: он пропадает при вводе, часто плохо контрастен и не всегда озвучивается. aria-label невидим, а это мешает голосовому управлению: видимый текст и имя должны совпадать (критерий 2.5.3).',
      'Имя поля здесь вычисляется упрощённо. Настоящий алгоритм вычисления доступного имени сложнее и зависит от браузера.',
      'Тестируйте на реальных программах чтения экрана (NVDA, JAWS, VoiceOver, TalkBack): их результаты различаются между собой.'
    ],
    'html-obsolete': [
      'Браузеры рисуют устаревшие элементы ради совместимости со старыми сайтами, но спецификация не обещает вечной поддержки. Так ушли плагины и <applet>.',
      'Валидатор такие элементы отвергает, поэтому в самом HTML-файле этого сайта их нет: они вставляются скриптом. Значит, Nu validator проверяет только исходную разметку, а не DOM, созданный JavaScript.',
      '<font>, <center> и <big> несут только вид, а не смысл. Замена — CSS, а там, где смысл есть (s, del, code), — смысловые элементы.',
      'Элементы <marquee> и <blink> не показаны намеренно: непрерывное движение вредно для внимания и доступности.',
      'Атрибуты оформления (bgcolor, align, border у table) устарели так же, как и теги.'
    ]
  };
  function register(id, def) {
    if (PITFALLS[id]) def.pitfalls = PITFALLS[id];
    Demo.register(id, def);
  }


  // ---------- Небольшие помощники ----------
  function h(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
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
  /** Разметка АВТОРА → узлы. Разбор в неактивном документе, затем импорт: скрипты не выполняются. */
  function fromHTML(str) {
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + str, 'text/html');
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(doc.body.childNodes).forEach(function (n) {
      frag.appendChild(document.importNode(n, true));
    });
    return frag;
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS_SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function mathEl(tag, text, attrs) {
    var n = document.createElementNS(NS_MATH, tag);
    if (text != null) n.textContent = text;
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function tableOf(headers, rows) {
    var wrap = h('div', { 'class': 'table-wrap' });
    var t = h('table');
    var tr = h('tr');
    headers.forEach(function (x) { tr.appendChild(h('th', { scope: 'col' }, x)); });
    add(t, add(h('thead'), tr));
    var tb = h('tbody');
    rows.forEach(function (r) { tb.appendChild(r); });
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  }
  function plainBadge(ok, yes, no) {
    var s = h('span', { 'class': 'support-badge', 'data-ok': ok ? 'yes' : 'no' }, (ok ? '✓ ' : '✗ ') + (ok ? yes : no));
    return s;
  }

  // ==========================================================================
  // 2.1 DOM: вводишь разметку — видишь дерево узлов
  // ==========================================================================
  function describeNode(n) {
    if (n.nodeType === 1) {
      var s = '<' + n.localName;
      for (var i = 0; i < n.attributes.length; i++) s += ' ' + n.attributes[i].name + '="' + n.attributes[i].value + '"';
      return s + '>';
    }
    if (n.nodeType === 3) return '"' + n.data.replace(/\s+/g, ' ').trim() + '"';
    if (n.nodeType === 8) return '<!--' + n.data + '-->';
    if (n.nodeType === 10) return '<!doctype ' + n.name + '>';
    return n.nodeName;
  }
  function nodeTree(node, state, root) {
    var ul = h('ul', { 'class': 'demo-tree' + (root ? ' demo-tree-root' : '') });
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = node.childNodes[i];
      if (c.nodeType === 3 && !c.data.trim()) continue;       // пробельные текстовые узлы не показываем
      if (state.count >= state.max) { state.cut = true; break; }
      state.count++;
      var li = h('li', null, describeNode(c));
      if (c.childNodes && c.childNodes.length) li.appendChild(nodeTree(c, state, false));
      ul.appendChild(li);
    }
    return ul;
  }

  register('html-dom', {
    title: 'Разметка → дерево узлов DOM',
    mode: 'host',
    note: 'Введите разметку. Обратите внимание: даже неполный фрагмент браузер достраивает до html, head и body, а незакрытые теги закрывает сам. Введённый текст разбирается в отдельном неактивном документе и на страницу не вставляется.',
    code:
      "var doc = new DOMParser().parseFromString(markup, 'text/html');\n" +
      "// doc — отдельный документ: скрипты не выполняются, ресурсы не грузятся.\n" +
      "// Дальше мы только обходим doc.childNodes и выводим имена через textContent.",
    init: function (ctx) {
      var ta = h('textarea', { 'aria-label': 'Разметка для разбора', rows: '6', spellcheck: 'false', maxlength: '2000' });
      ta.value = '<h1>Мой сайт</h1>\n<p>Изучаю <strong>HTML</strong>.\n<p>Второй абзац без закрывающего тега';
      var out = h('div', { 'class': 'demo-tree-box', tabindex: '0', role: 'region', 'aria-label': 'Дерево узлов' });
      var info = h('p', { 'class': 'demo-hint' });
      var pending = null;
      function render() {
        var doc = new DOMParser().parseFromString(ta.value, 'text/html');
        var state = { count: 0, max: 300, cut: false };
        ctx.clear(out);
        out.appendChild(nodeTree(doc, state, true));
        info.textContent = 'Узлов показано: ' + state.count + (state.cut ? ' (вывод ограничен 300 узлами)' : '') + '. Пробельные текстовые узлы скрыты.';
      }
      ctx.on(ta, 'input', function () {
        if (pending) pending();
        pending = ctx.timeout(render, 150);
      });
      add(ctx.live, ta, info, out);
      render();
    }
  });

  // ==========================================================================
  // 5 Семантика: упрощённая модель дерева доступности
  // ==========================================================================
  var SEM_SEMANTIC =
    '<header><h1>Мой блог</h1><nav><a href="#">Главная</a><a href="#">О проекте</a></nav></header>' +
    '<main><article><h2>Заголовок статьи</h2><p>Текст статьи.</p></article>' +
    '<aside><h2>Связанное</h2><ul><li>Первая ссылка</li><li>Вторая ссылка</li></ul></aside></main>' +
    '<footer>Контакты</footer>';
  var SEM_SOUP =
    '<div class="top"><div class="title">Мой блог</div><div class="menu"><div class="link">Главная</div><div class="link">О проекте</div></div></div>' +
    '<div class="page"><div class="post"><div class="title">Заголовок статьи</div><div>Текст статьи.</div></div>' +
    '<div class="side"><div class="title">Связанное</div><div><div>Первая ссылка</div><div>Вторая ссылка</div></div></div></div>' +
    '<div class="bottom">Контакты</div>';
  var ROLES = { header: 'banner', nav: 'navigation', main: 'main', article: 'article', aside: 'complementary', footer: 'contentinfo',
    section: 'region (если есть имя)', ul: 'list', ol: 'list', li: 'listitem', p: 'paragraph', a: 'link', button: 'button', img: 'image' };
  var LANDMARKS = { banner: 1, navigation: 1, main: 1, complementary: 1, contentinfo: 1 };

  function a11yTree(node, stats) {
    var ul = h('ul', { 'class': 'demo-tree' });
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = node.childNodes[i];
      var li;
      if (c.nodeType === 3) {
        if (!c.data.trim()) continue;
        li = h('li', null, 'текст "' + c.data.trim() + '"');
        ul.appendChild(li);
        continue;
      }
      if (c.nodeType !== 1) continue;
      var tag = c.localName, role = ROLES[tag], label;
      if (/^h[1-6]$/.test(tag)) { role = 'heading, уровень ' + tag.charAt(1); stats.headings++; }
      if (role && LANDMARKS[role]) stats.landmarks++;
      li = h('li');
      if (role) li.appendChild(h('span', { 'class': 'role' }, role));
      else li.appendChild(h('span', { 'class': 'generic' }, 'generic'));
      label = ' <' + tag + '>';
      li.appendChild(document.createTextNode(label));
      li.appendChild(a11yTree(c, stats));
      ul.appendChild(li);
    }
    return ul;
  }

  register('html-semantics', {
    title: 'Семантика и «div-суп»: что видит программа',
    mode: 'host',
    note: 'Один и тот же внешний вид, разная структура. Это упрощённая модель дерева доступности, построенная по таблице ролей элементов; настоящее дерево строит браузер (его можно посмотреть во вкладке Accessibility в DevTools).',
    code:
      "<!-- Семантическая версия -->\n" + SEM_SEMANTIC.replace(/></g, '>\n<') + "\n\n" +
      "<!-- Версия из div -->\n<div class=\"top\"><div class=\"title\">Мой блог</div>…</div>",
    init: function (ctx) {
      var id = 'sem' + (++uid);
      var fs = h('fieldset');
      fs.appendChild(h('legend', null, 'Вариант разметки'));
      var r1 = h('input', { type: 'radio', name: id, value: 'sem', checked: '' });
      var r2 = h('input', { type: 'radio', name: id, value: 'soup' });
      var l1 = h('label'); add(l1, r1, document.createTextNode(' Семантические элементы '));
      var l2 = h('label'); add(l2, r2, document.createTextNode(' Только div и span'));
      add(fs, l1, l2);
      var out = h('div', { 'class': 'demo-tree-box', tabindex: '0', role: 'region', 'aria-label': 'Упрощённое дерево доступности' });
      var summary = h('p', { role: 'status', 'class': 'demo-hint' });
      function render() {
        var soup = r2.checked;
        var doc = new DOMParser().parseFromString(soup ? SEM_SOUP : SEM_SEMANTIC, 'text/html');
        var stats = { headings: 0, landmarks: 0 };
        ctx.clear(out);
        out.appendChild(a11yTree(doc.body, stats));
        summary.textContent = 'Областей-ориентиров: ' + stats.landmarks + '. Заголовков для навигации: ' + stats.headings +
          (soup ? '. Пользователь скринридера не может перейти к навигации, основному содержимому или заголовкам: для программы это один сплошной generic.' : '.');
      }
      ctx.on(fs, 'change', render);
      add(ctx.live, fs, summary, out);
      render();
    }
  });

  // ==========================================================================
  // 6.1 Текстовые элементы
  // ==========================================================================
  var TEXT_ROWS = [
    ['h1', '<h1 style="margin:0;font-size:1.4em">Заголовок</h1>', 'Заголовок верхнего уровня.'],
    ['p', '<p style="margin:0">Абзац текста.</p>', 'Абзац.'],
    ['strong', '<strong>Важно</strong>', 'Высокая важность.'],
    ['em', '<em>ударение</em>', 'Смысловое ударение.'],
    ['b', '<b>внимание</b>', 'Привлечение внимания без важности.'],
    ['i', '<i>термин</i>', 'Иной голос или характер.'],
    ['mark', '<mark>найдено</mark>', 'Релевантный фрагмент.'],
    ['small', '<small>мелкий текст</small>', 'Примечание.'],
    ['del / ins', '<del>старое</del> <ins>новое</ins>', 'Удалённое и добавленное.'],
    ['sub / sup', 'H<sub>2</sub>O, x<sup>2</sup>', 'Нижний и верхний индексы.'],
    ['code', '<code>input</code>', 'Фрагмент кода.'],
    ['kbd', '<kbd>Ctrl</kbd>+<kbd>K</kbd>', 'Ввод с клавиатуры.'],
    ['abbr', '<abbr title="HyperText Markup Language">HTML</abbr>', 'Сокращение (подсказка при наведении).'],
    ['q', '<q>Короткая цитата</q>', 'Встроенная цитата.'],
    ['blockquote', '<blockquote style="margin:0;padding-left:10px;border-left:3px solid #b7c3e6">Большая цитата.</blockquote>', 'Блочная цитата.'],
    ['time', '<time datetime="2026-11-16">16 ноября 2026</time>', 'Дата в машинно-читаемом виде.'],
    ['br / hr', 'Строка один<br>строка два<hr style="margin:4px 0">', 'Перенос строки и разделитель.']
  ];
  register('html-text', {
    title: 'Текстовые элементы рядом с их названиями',
    mode: 'host',
    note: 'Левый столбец — разметка, средний — как её рисует ваш браузер.',
    init: function (ctx) {
      var rows = TEXT_ROWS.map(function (r) {
        var tr = h('tr');
        add(tr, add(h('th', { scope: 'row' }), h('code', null, r[0])));
        var td = h('td'); td.appendChild(fromHTML(r[1]));
        tr.appendChild(td);
        tr.appendChild(h('td', null, r[2]));
        return tr;
      });
      var wrap = tableOf(['Элемент', 'Как выглядит', 'Смысл'], rows);
      wrap.classList.add('demo-scroll');
      ctx.live.appendChild(wrap);
    }
  });

  // ==========================================================================
  // 7 Ссылки: схемы href живьём + разбор относительных URL
  // ==========================================================================
  register('html-links', {
    title: 'Виды ссылок живьём и как браузер разбирает URL',
    mode: 'host',
    note: 'Ссылки ниже настоящие. Что произойдёт при mailto: и tel:, зависит от программ на вашем устройстве. Ссылка download получает файл, собранный прямо в браузере.',
    code:
      '<a href="#html-links-target">Якорь на этой странице</a>\n' +
      '<a href="mailto:hello@example.com">Написать</a>\n' +
      '<a href="tel:+358123456789">Позвонить</a>\n' +
      '<a href="blob:…" download="привет.txt">Скачать</a>\n' +
      '<a href="html.html#links">Относительная ссылка</a>\n' +
      '<a href="https://example.com" target="_blank" rel="noopener">Новая вкладка</a>',
    init: function (ctx) {
      var target = h('p', { id: 'html-links-target', tabindex: '-1', 'class': 'demo-hint' }, 'Это цель якорной ссылки. Фокус попал сюда после перехода.');
      var fileURL = ctx.blobURL(new Blob(['Привет из Blob!\nЭтот файл создан в браузере.'], { type: 'text/plain;charset=utf-8' }));
      var rows = [
        ['Якорь', h('a', { href: '#html-links-target' }, 'Перейти к цели ниже'), 'Прокрутка и смена фрагмента адреса (hash).'],
        ['mailto:', h('a', { href: 'mailto:hello@example.com' }, 'Написать письмо'), 'Открывает почтовую программу.'],
        ['tel:', h('a', { href: 'tel:+358123456789' }, 'Позвонить'), 'Предлагает набрать номер (на устройствах, умеющих звонить).'],
        ['download', h('a', { href: fileURL, download: 'привет.txt' }, 'Скачать привет.txt'), 'Браузер сохраняет ресурс как файл вместо открытия.'],
        ['Относительная', h('a', { href: 'html.html#links' }, 'К разделу «Ссылки»'), 'Адрес вычисляется от адреса текущей страницы.'],
        ['target=_blank', h('a', { href: 'https://example.com', target: '_blank', rel: 'noopener' }, 'example.com (новая вкладка)'), 'Новая вкладка; noopener не даёт ей доступ к window.opener.']
      ].map(function (r) {
        var tr = h('tr');
        tr.appendChild(h('th', { scope: 'row' }, r[0]));
        add(tr, add(h('td'), r[1]), h('td', null, r[2]));
        return tr;
      });
      var wrap = tableOf(['Схема', 'Ссылка', 'Что происходит'], rows);
      wrap.classList.add('demo-scroll');

      var inp = h('input', { type: 'text', value: '../css.html#cascade?x=1', 'aria-label': 'Ссылка для разбора', size: '30' });
      var res = h('p', { role: 'status', 'class': 'demo-stat' });
      function parse() {
        try {
          var u = new URL(inp.value, location.href);
          res.textContent = 'Базовый адрес: ' + location.href + '\nИтог: ' + u.href + '\nprotocol: ' + u.protocol +
            ' · origin: ' + u.origin + ' · pathname: ' + u.pathname + ' · hash: ' + (u.hash || '—');
        } catch (e) {
          res.textContent = 'Не удалось разобрать: ' + e.name + ' — ' + e.message;
        }
      }
      res.style.whiteSpace = 'pre-wrap';
      ctx.on(inp, 'input', parse);
      add(ctx.live, wrap, target, labelled('Разбор URL относительно этой страницы:', inp), res);
      parse();
    }
  });

  // ==========================================================================
  // 8 Таблицы: со scope и без — что услышит пользователь скринридера
  // ==========================================================================
  register('html-table-scope', {
    title: 'Таблица с scope и без: как озвучивается ячейка',
    mode: 'host',
    note: 'Это упрощённая модель того, как программа чтения экрана связывает ячейку с заголовками. Выберите ячейку и сравните две таблицы с одинаковым внешним видом.',
    code:
      '<!-- С заголовками -->\n<th scope="col">Математика</th>\n<th scope="row">Алексей</th><td>5</td>\n\n' +
      '<!-- Без заголовков: только внешний вид -->\n<td><strong>Алексей</strong></td><td>5</td>',
    init: function (ctx) {
      var students = ['Алексей', 'Иван', 'Мария'], subjects = ['Математика', 'Физика'];
      var grades = [[5, 4], [4, 3], [5, 5]];
      function build(withScope) {
        var t = h('table');
        t.appendChild(h('caption', null, withScope ? 'С th и scope' : 'Только td (имитация заголовков)'));
        var tr = h('tr');
        tr.appendChild(h(withScope ? 'th' : 'td', withScope ? { scope: 'col' } : null, 'Студент'));
        subjects.forEach(function (s) {
          var c = withScope ? h('th', { scope: 'col' }, s) : add(h('td'), h('strong', null, s));
          tr.appendChild(c);
        });
        add(t, add(h('thead'), tr));
        var tb = h('tbody');
        students.forEach(function (st, i) {
          var r = h('tr');
          r.appendChild(withScope ? h('th', { scope: 'row' }, st) : add(h('td'), h('strong', null, st)));
          grades[i].forEach(function (g) { r.appendChild(h('td', null, String(g))); });
          tb.appendChild(r);
        });
        t.appendChild(tb);
        var w = h('div', { 'class': 'table-wrap' }); w.appendChild(t);
        return w;
      }
      var selS = h('select'), selJ = h('select');
      students.forEach(function (s, i) { selS.appendChild(h('option', { value: String(i) }, s)); });
      subjects.forEach(function (s, i) { selJ.appendChild(h('option', { value: String(i) }, s)); });
      var out = h('div', { role: 'status', 'class': 'demo-stat' });
      function say() {
        var i = +selS.value, j = +selJ.value, g = grades[i][j];
        out.textContent = '';
        out.appendChild(h('p', null, 'С scope: «' + students[i] + ', ' + subjects[j] + ': ' + g + '» — программа знает и строку, и столбец.'));
        out.appendChild(h('p', null, 'Без заголовков: «' + g + '» — просто число в ячейке; к чему оно относится, придётся угадывать по позиции.'));
      }
      ctx.on(selS, 'change', say); ctx.on(selJ, 'change', say);
      add(ctx.live, labelled('Студент', selS), labelled('Предмет', selJ), build(true), build(false), out);
      say();
    }
  });

  // ==========================================================================
  // 9.1 Все типы input
  // ==========================================================================
  var INPUT_TYPES = ['text', 'password', 'email', 'url', 'tel', 'search', 'number', 'range', 'date', 'time',
    'datetime-local', 'month', 'week', 'color', 'checkbox', 'radio', 'file', 'hidden', 'submit', 'reset', 'button', 'image'];
  var IMG_SRC = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2224%22%3E%3Crect width=%2232%22 height=%2224%22 rx=%224%22 fill=%22%233157c8%22/%3E%3C/svg%3E';

  function inputValueText(inp) {
    var t = inp.type;
    if (t === 'checkbox') return 'checked = ' + inp.checked;
    if (t === 'file') return inp.files && inp.files.length ? 'файлов: ' + inp.files.length + ', первый: ' + inp.files[0].name : 'файл не выбран';
    if (t === 'hidden') return 'value = "' + inp.value + '" (не виден, уходит вместе с формой)';
    if (t === 'submit' || t === 'reset' || t === 'button' || t === 'image') return 'кнопка: значения нет (value = "' + inp.value + '")';
    var s = 'value = "' + inp.value + '"';
    if (t === 'number' || t === 'range') s += ', valueAsNumber = ' + inp.valueAsNumber;
    if (t === 'date' && inp.value) s += ', valueAsDate = ' + (inp.valueAsDate ? inp.valueAsDate.toISOString().slice(0, 10) : 'null');
    return s;
  }

  register('html-input-types', {
    title: 'Все типы input: живые поля и их значения',
    mode: 'host',
    note: 'Вид выбора даты, цвета и файла зависит от браузера и операционной системы. Колонка «Тип» проверяет по-настоящему: если браузер не знает тип, он сообщает type = "text".',
    code:
      "var probe = document.createElement('input');\n" +
      "probe.type = 'datetime-local';\n" +
      "probe.type === 'datetime-local';   // false → браузер не знает этот тип\n\n" +
      "// Одно делегированное событие на всю таблицу вместо 22 слушателей:\n" +
      "tbody.addEventListener('input', refresh);\n" +
      "tbody.addEventListener('change', refresh);",
    init: function (ctx) {
      var tbody = h('tbody');
      var rows = [];
      INPUT_TYPES.forEach(function (t) {
        var probe = document.createElement('input');
        probe.type = t;
        var supported = probe.type === t;
        var inputs = [];
        var tr = h('tr');
        tr.appendChild(add(h('th', { scope: 'row' }), h('code', null, t)));
        tr.appendChild(add(h('td'), plainBadge(supported, 'есть', 'нет (работает как text)')));
        var cell = h('td');
        function make(extra) {
          var a = { type: t, 'aria-label': 'Поле типа ' + t + (extra ? ' ' + extra.v : '') };
          if (t === 'image') { a.src = IMG_SRC; a.alt = 'Кнопка-изображение'; }
          if (t === 'range') { a.min = '0'; a.max = '100'; }
          if (t === 'number') { a.min = '0'; a.max = '10'; a.step = '1'; }
          if (t === 'radio') { a.name = 'demo-radio-' + uid; a.value = extra.v; }
          if (t === 'hidden') a.value = 'секрет-42';
          if (t === 'submit' || t === 'reset' || t === 'button') a.value = t;
          var el = h('input', a);
          if (t === 'range') el.value = '50';
          if (t === 'radio' && extra.v === 'A') el.checked = true;
          inputs.push(el);
          cell.appendChild(el);
          return el;
        }
        if (t === 'radio') { uid++; make({ v: 'A' }); make({ v: 'B' }); } else make();
        tr.appendChild(cell);
        var out = h('td', { 'class': 'demo-stat' });
        tr.appendChild(out);
        var row = { tr: tr, inputs: inputs, out: out };
        rows.push(row);
        tbody.appendChild(tr);
      });
      function refresh(row) {
        var inp = row.inputs[0];
        row.out.textContent = row.inputs.length > 1
          ? 'выбран: ' + (row.inputs.filter(function (x) { return x.checked; })[0] || { value: '—' }).value
          : inputValueText(inp);
      }
      function onEvent(e) {
        var tr = e.target.closest && e.target.closest('tr');
        for (var i = 0; i < rows.length; i++) if (rows[i].tr === tr) { refresh(rows[i]); return; }
      }
      ctx.on(tbody, 'input', onEvent);
      ctx.on(tbody, 'change', onEvent);
      rows.forEach(refresh);
      var table = h('table');
      var hr = h('tr');
      ['Тип', 'Поддержка', 'Поле', 'Значение'].forEach(function (x) { hr.appendChild(h('th', { scope: 'col' }, x)); });
      add(table, add(h('thead'), hr), tbody);
      var wrap = h('div', { 'class': 'table-wrap demo-scroll' });
      wrap.appendChild(table);
      ctx.live.appendChild(wrap);
    }
  });

  // ==========================================================================
  // 9.3 Constraint Validation API
  // ==========================================================================
  var VALIDITY_FLAGS = ['valueMissing', 'typeMismatch', 'patternMismatch', 'tooShort', 'tooLong', 'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'badInput', 'customError'];
  register('html-validation', {
    title: 'Constraint Validation API: validity в реальном времени',
    mode: 'host',
    note: 'Заполняйте поля и смотрите, какие флаги validity поднимаются. Отправка формы настоящая только наполовину: после проверки запрос не уходит никуда. Переключатель novalidate показывает, что проверка в браузере не защищает сервер.',
    code:
      "input.validity.valueMissing;     // пусто, а поле required\n" +
      "input.validity.typeMismatch;     // не похоже на email\n" +
      "input.validity.patternMismatch;  // не подошло под pattern\n" +
      "input.setCustomValidity('Сообщение'); // своя ошибка; '' — снять\n" +
      "form.checkValidity();            // true/false без показа сообщений\n" +
      "form.reportValidity();           // + показать сообщение браузера",
    init: function (ctx) {
      var form = h('form');
      var f = {
        email: h('input', { type: 'email', name: 'email', required: '', id: 'v-email' + (++uid) }),
        age: h('input', { type: 'number', name: 'age', min: '18', max: '100', required: '', id: 'v-age' + uid }),
        code: h('input', { type: 'text', name: 'code', pattern: '[A-Z]{3}-[0-9]{3}', title: 'Формат: ABC-123', id: 'v-code' + uid }),
        user: h('input', { type: 'text', name: 'user', minlength: '3', id: 'v-user' + uid })
      };
      var names = { email: 'Почта (type=email, required)', age: 'Возраст (number, 18–100, required)', code: 'Код (pattern ABC-123)', user: 'Имя (minlength=3, не «admin»)' };
      Object.keys(f).forEach(function (k) {
        form.appendChild(labelled(names[k], f[k]));
      });
      var submit = h('button', { type: 'submit' }, 'Отправить');
      var nv = h('input', { type: 'checkbox' });
      var nvLabel = h('label'); add(nvLabel, nv, document.createTextNode(' novalidate (отключить проверку при отправке)'));
      var msg = h('p', { role: 'status', 'class': 'demo-hint' });
      var tbody = h('tbody');
      var cells = {};
      Object.keys(f).forEach(function (k) {
        var tr = h('tr');
        tr.appendChild(add(h('th', { scope: 'row' }), h('code', null, k)));
        cells[k] = { ok: h('td'), flags: h('td'), msg: h('td') };
        add(tr, cells[k].ok, cells[k].flags, cells[k].msg);
        tbody.appendChild(tr);
      });
      function refresh() {
        // Своё правило поверх встроенных: setCustomValidity.
        f.user.setCustomValidity(f.user.value.toLowerCase() === 'admin' ? 'Имя «admin» зарезервировано' : '');
        Object.keys(f).forEach(function (k) {
          var v = f[k].validity;
          var on = VALIDITY_FLAGS.filter(function (n) { return v[n]; });
          cells[k].ok.textContent = v.valid ? '✓ valid' : '✗ invalid';
          cells[k].flags.textContent = on.length ? on.join(', ') : '—';
          cells[k].msg.textContent = f[k].validationMessage || '—';
        });
      }
      ctx.on(form, 'input', refresh);
      ctx.on(form, 'invalid', refresh, true);   // событие invalid не всплывает, поэтому capture
      ctx.on(nv, 'change', function () { form.noValidate = nv.checked; });
      ctx.on(form, 'submit', function (e) {
        e.preventDefault();
        var ok = form.checkValidity();
        msg.textContent = ok
          ? 'Форма валидна. В настоящем проекте здесь ушёл бы запрос, а сервер всё равно проверил бы данные заново.'
          : 'Форма невалидна, но отправка дошла до обработчика, потому что включён novalidate. Сервер получил бы эти данные.';
        ctx.say(msg.textContent);
      });
      var table = h('table');
      var hr = h('tr');
      ['Поле', 'Состояние', 'Поднятые флаги validity', 'validationMessage'].forEach(function (x) { hr.appendChild(h('th', { scope: 'col' }, x)); });
      add(table, add(h('thead'), hr), tbody);
      var wrap = h('div', { 'class': 'table-wrap demo-scroll' }); wrap.appendChild(table);
      add(form, submit);
      add(ctx.live, form, nvLabel, msg, wrap);
      refresh();
    }
  });

  // ==========================================================================
  // 10.1 srcset / sizes: какой ресурс реально выбран
  // ==========================================================================
  register('html-srcset', {
    title: 'srcset и sizes: какой файл выбрал браузер',
    mode: 'host',
    note: 'Три картинки создаются прямо в браузере. Меняйте sizes, масштаб страницы (Ctrl +/−) или ширину окна. Браузер вправе оставить уже загруженный вариант, если он подходит, поэтому при уменьшении выбор может не поменяться.',
    code:
      '<img srcset="small 400w, medium 800w, large 1600w"\n' +
      '     sizes="(max-width: 600px) 100vw, 800px"\n' +
      '     alt="…">\n\n' +
      "img.currentSrc;          // что выбрал браузер\n" +
      "window.devicePixelRatio; // плотность пикселей экрана",
    init: function (ctx) {
      var widths = [400, 800, 1600], colors = ['#3157c8', '#16794b', '#b45309'], labels = {}, list = [];
      widths.forEach(function (w, i) {
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + Math.round(w * 0.4) + '" viewBox="0 0 ' + w + ' ' + Math.round(w * 0.4) + '">' +
          '<rect width="100%" height="100%" fill="' + colors[i] + '"/><text x="50%" y="55%" fill="#fff" font-size="' + Math.round(w / 8) + '" font-family="sans-serif" text-anchor="middle">' + w + 'w</text></svg>';
        var url = ctx.blobURL(new Blob([svg], { type: 'image/svg+xml' }));
        labels[url] = w + 'w';
        list.push(url + ' ' + w + 'w');
      });
      var img = h('img', { alt: 'Цветной прямоугольник с подписью выбранного размера', srcset: list.join(', '), sizes: '100vw' });
      img.style.cssText = 'max-width:100%;width:240px;height:auto;display:block;border-radius:8px';
      var opts = ['100vw', '50vw', '300px', '(max-width: 600px) 100vw, 800px'];
      var sel = h('select');
      opts.forEach(function (o) { sel.appendChild(h('option', { value: o }, o)); });
      var out = h('div', { role: 'status', 'class': 'demo-stat' });
      out.style.whiteSpace = 'pre-wrap';
      function slot(s) {
        if (s === '100vw') return innerWidth;
        if (s === '50vw') return innerWidth / 2;
        if (s === '300px') return 300;
        return innerWidth <= 600 ? innerWidth : 800;
      }
      function update() {
        var need = Math.round(slot(sel.value) * (window.devicePixelRatio || 1));
        var expected = widths.filter(function (w) { return w >= need; })[0] || widths[widths.length - 1];
        out.textContent = 'Окно: ' + innerWidth + ' px · devicePixelRatio: ' + (window.devicePixelRatio || 1) +
          '\nsizes → слот ' + Math.round(slot(sel.value)) + ' px × DPR = нужно ≈ ' + need + ' px' +
          '\nОжидаемый кандидат (наименьший, не меньше нужного): ' + expected + 'w' +
          '\nВыбрал браузер (currentSrc): ' + (labels[img.currentSrc] || 'ещё не загружено');
      }
      var queued = null;
      function schedule() { if (queued) queued(); queued = ctx.timeout(update, 120); }
      ctx.on(sel, 'change', function () { img.sizes = sel.value; schedule(); });
      ctx.on(img, 'load', update);
      ctx.on(window, 'resize', schedule);
      add(ctx.live, labelled('sizes', sel), img, out);
      update();
    }
  });

  // ==========================================================================
  // 10.2–10.3 Аудио и видео с субтитрами и управлением из JS
  // ==========================================================================
  function makeWav() {
    var rate = 16000, dur = 6, n = rate * dur, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    var f = [440, 554.37, 659.25];
    for (var i = 0; i < n; i++) {
      var t = i / rate, seg = Math.min(2, Math.floor(t / 2)), local = t - seg * 2;
      var env = Math.min(1, local / 0.05, (2 - local) / 0.1);
      v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * f[seg] * t) * 0.2 * env * 32767), true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  }

  register('html-media', {
    title: 'Аудио и видео: субтитры и управление из JavaScript',
    mode: 'host',
    note: 'У сайта нет внешних медиафайлов, поэтому звук (три ноты) генерируется в коде, а <video> проигрывает его с дорожкой субтитров. Кадров нет: чёрный фон здесь вместо изображения. Громкость стоит на половине.',
    badges: [],
    code:
      "var track = video.addTextTrack('subtitles', 'Русский', 'ru');\n" +
      "track.mode = 'showing';\n" +
      "track.addCue(new VTTCue(0, 2, 'Нота ля, 440 Гц'));\n\n" +
      "video.play();            // возвращает Promise\n" +
      "video.playbackRate = 1.5;\n" +
      "video.volume = 0.5;\n" +
      "video.addEventListener('timeupdate', onTime);",
    init: function (ctx) {
      if (typeof VTTCue === 'undefined') throw new Error('VTTCue не поддерживается: дорожки субтитров из JavaScript недоступны в этом браузере');
      var url = ctx.blobURL(makeWav());
      var audio = h('audio', { controls: '', preload: 'metadata', 'aria-label': 'Аудио: три ноты' });
      audio.src = url;
      var video = h('video', { controls: '', preload: 'metadata', 'aria-label': 'Видео-плеер с субтитрами' });
      video.src = url;
      var tt = video.addTextTrack('subtitles', 'Русский', 'ru');
      tt.mode = 'showing';
      tt.addCue(new VTTCue(0, 2, 'Нота ля, 440 Гц'));
      tt.addCue(new VTTCue(2, 4, 'Нота до-диез, 554 Гц'));
      tt.addCue(new VTTCue(4, 6, 'Нота ми, 659 Гц'));
      video.volume = audio.volume = 0.5;

      var play = h('button', { type: 'button' }, 'Играть');
      var rate = h('select');
      ['0.5', '1', '1.5', '2'].forEach(function (r) { rate.appendChild(h('option', { value: r }, r + '×')); });
      rate.value = '1';
      var vol = h('input', { type: 'range', min: '0', max: '1', step: '0.1', value: '0.5' });
      var loop = h('input', { type: 'checkbox' });
      var loopL = h('label'); add(loopL, loop, document.createTextNode(' loop'));
      var info = h('p', { 'class': 'demo-stat' });

      function paint() {
        var cues = tt.activeCues && tt.activeCues.length ? tt.activeCues[0].text : '—';
        info.textContent = 'currentTime: ' + video.currentTime.toFixed(1) + ' с из ' + (isFinite(video.duration) ? video.duration.toFixed(1) : '?') +
          ' · paused: ' + video.paused + ' · субтитр: ' + cues;
      }
      ctx.on(play, 'click', function () {
        if (video.paused) {
          var p = video.play();
          if (p && p.catch) p.catch(function (e) { info.textContent = 'play() отклонён: ' + e.name + ' (политика автовоспроизведения или ошибка медиа)'; });
        } else video.pause();
      });
      ctx.on(video, 'play', function () { play.textContent = 'Пауза'; });
      ctx.on(video, 'pause', function () { play.textContent = 'Играть'; paint(); });
      ctx.on(video, 'timeupdate', paint);
      ctx.on(video, 'loadedmetadata', paint);
      ctx.on(video, 'error', function () { ctx.fail(new Error('Не удалось загрузить сгенерированный звук (код ошибки медиа: ' + (video.error && video.error.code) + ')')); });
      ctx.on(rate, 'change', function () { video.playbackRate = +rate.value; });
      ctx.on(vol, 'input', function () { video.volume = +vol.value; });
      ctx.on(loop, 'change', function () { video.loop = loop.checked; });
      ctx.onCleanup(function () {
        video.pause(); audio.pause();
        video.removeAttribute('src'); audio.removeAttribute('src');
        video.load(); audio.load();
      });
      var box = h('div', { 'class': 'demo-media' });
      add(box, h('p', { 'class': 'demo-label' }, '<audio controls>'), audio, h('p', { 'class': 'demo-label' }, '<video controls> + дорожка субтитров'), video);
      add(ctx.live, box, play, labelled('Скорость', rate), labelled('Громкость', vol), loopL, info);
      paint();
    }
  });

  // ==========================================================================
  // 11.1 iframe sandbox: что ломается при смене флагов
  // ==========================================================================
  register('html-iframe-sandbox', {
    title: 'iframe и sandbox: что ломается без флагов',
    mode: 'host',
    needs: {},
    note: 'Внутри iframe открыта тестовая страница автора сайта: она пытается выполнить скрипт, прочитать документ родителя и записать в localStorage. Читатель меняет только флаги. Код читателя на этой странице всегда исполняется в песочнице без allow-same-origin, а здесь комбинация специально показана как опасная.',
    code:
      '<iframe sandbox="allow-scripts" srcdoc="…"></iframe>\n\n' +
      '<!-- Пусто:                       всё запрещено\n' +
      '     allow-scripts:               скрипты работают, origin «null»\n' +
      '     allow-scripts allow-same-origin: документ может сам снять sandbox! -->',
    init: function (ctx) {
      var cbS = h('input', { type: 'checkbox' }), cbO = h('input', { type: 'checkbox' });
      var fs = h('fieldset');
      fs.appendChild(h('legend', null, 'Флаги sandbox'));
      var l1 = h('label'); add(l1, cbS, document.createTextNode(' allow-scripts '));
      var l2 = h('label'); add(l2, cbO, document.createTextNode(' allow-same-origin'));
      add(fs, l1, l2);
      var attr = h('p', { 'class': 'demo-stat' });
      var warn = h('p', { 'class': 'demo-error', role: 'note' });
      warn.hidden = true;
      var box = h('div');
      var results = h('div', { role: 'status', 'class': 'demo-stat' });
      var frame = null, token = null, got = null, waiter = null, settled = false;
      var LABELS = { script: 'Скрипты выполняются', parent: 'Доступ к документу родителя', storage: 'localStorage' };

      function show() {
        results.textContent = '';
        ['script', 'parent', 'storage'].forEach(function (k) {
          var v = got[k];
          var text = v === true ? 'да' : v === false ? 'нет (заблокировано)' : !settled ? 'ждём ответа…' : (got.script === true ? 'нет ответа' : 'не проверялось: скрипт не выполнился');
          results.appendChild(h('div', null, LABELS[k] + ': ' + text));
        });
      }
      function rebuild() {
        if (waiter) waiter();
        if (frame) frame.remove();
        var flags = [];
        if (cbS.checked) flags.push('allow-scripts');
        if (cbO.checked) flags.push('allow-same-origin');
        attr.textContent = 'sandbox="' + flags.join(' ') + '"';
        warn.hidden = !(cbS.checked && cbO.checked);
        warn.textContent = 'Опасная комбинация: если встроенный документ того же origin, что и страница (как srcdoc здесь), он может удалить атрибут sandbox у собственного iframe и получить полный доступ. Для чужого кода так делать нельзя.';
        token = 'sb' + (++uid) + Math.random().toString(36).slice(2, 7);
        got = {};
        settled = false;
        frame = h('iframe', { 'class': 'demo-iframe-test', title: 'Тестовая страница внутри iframe' });
        frame.setAttribute('sandbox', flags.join(' '));
        frame.srcdoc = '<!doctype html><meta charset="utf-8"><body style="font:13px system-ui;margin:8px">Тестовая страница внутри iframe.' +
          '<script>(function(){var T=' + JSON.stringify(token) + ';function s(k,v){parent.postMessage({sb:T,test:k,ok:v},"*");}' +
          's("script",true);try{void parent.document.title;s("parent",true);}catch(e){s("parent",false);}' +
          'try{localStorage.setItem("t","1");localStorage.removeItem("t");s("storage",true);}catch(e){s("storage",false);}})();<\/script>';
        box.appendChild(frame);
        show();
        waiter = ctx.timeout(function () { settled = true; show(); }, 700);   // если скрипт не отчитался за 700 мс, считаем, что он заблокирован
      }
      // Принимаем только сообщения от нашего iframe и с нашим токеном (origin у песочницы "null").
      ctx.on(window, 'message', function (e) {
        var d = e.data;
        if (!frame || e.source !== frame.contentWindow || !d || d.sb !== token) return;
        if (LABELS[d.test]) { got[d.test] = d.ok === true; show(); }
      });
      ctx.on(fs, 'change', rebuild);
      ctx.onCleanup(function () { if (frame) { frame.removeAttribute('srcdoc'); frame.remove(); frame = null; } token = null; });
      add(ctx.live, fs, attr, warn, box, results);
      rebuild();
    }
  });

  // ==========================================================================
  // 12.1 SVG
  // ==========================================================================
  register('html-svg', {
    title: 'SVG: кликабельные фигуры и анимация пути',
    mode: 'host',
    note: 'Фигуры — настоящие элементы DOM: их можно сфокусировать клавишей Tab и активировать Enter или пробелом. Путь рисуется через Web Animations API; при включённом «уменьшении движения» он появляется сразу.',
    code:
      "rect.addEventListener('click', toggleColor);\n" +
      "var len = path.getTotalLength();\n" +
      "path.style.strokeDasharray = len;\n" +
      "path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],\n" +
      "             { duration: 1500, fill: 'forwards' });",
    init: function (ctx) {
      var svg = svgEl('svg', { viewBox: '0 0 300 170', width: '300', role: 'group', 'aria-label': 'Интерактивная SVG-схема' });
      svg.setAttribute('class', 'demo-svg');
      var palette = ['#3157c8', '#16794b', '#b45309', '#a12626'];
      var msg = h('p', { role: 'status', 'class': 'demo-hint' }, 'Нажмите на фигуру.');
      function clickable(shape, name, i0) {
        var i = i0;
        shape.setAttribute('tabindex', '0');
        shape.setAttribute('role', 'button');
        shape.setAttribute('aria-label', name + ': нажмите, чтобы сменить цвет');
        function act() { i = (i + 1) % palette.length; shape.setAttribute('fill', palette[i]); msg.textContent = name + ': цвет ' + palette[i]; }
        ctx.on(shape, 'click', act);
        ctx.on(shape, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      }
      var rect = svgEl('rect', { x: '15', y: '15', width: '110', height: '70', rx: '8', fill: palette[0] });
      var circ = svgEl('circle', { cx: '210', cy: '50', r: '38', fill: palette[2] });
      clickable(rect, 'Прямоугольник', 0);
      clickable(circ, 'Круг', 2);
      var path = svgEl('path', { d: 'M15 150 C 70 100, 120 100, 150 135 S 250 170, 285 105', fill: 'none', stroke: '#172033', 'stroke-width': '4', 'stroke-linecap': 'round' });
      add(svg, rect, circ, path);
      var btn = h('button', { type: 'button' }, 'Нарисовать путь');
      var anim = null;
      ctx.on(btn, 'click', function () {
        if (anim) anim.cancel();
        var len = path.getTotalLength();
        path.style.strokeDasharray = String(len);
        if (ctx.reducedMotion || !path.animate) { path.style.strokeDashoffset = '0'; return; }
        anim = path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1500, easing: 'ease-in-out', fill: 'forwards' });
      });
      ctx.onCleanup(function () { if (anim) anim.cancel(); });
      add(ctx.live, svg, msg, btn);
    }
  });

  // ==========================================================================
  // 12.2 Canvas: рисование мышью, касанием и клавиатурой
  // ==========================================================================
  register('html-canvas', {
    title: 'Canvas: рисование мышью, касанием и клавиатурой',
    mode: 'host',
    note: 'Рисуйте мышью или пальцем. С клавиатуры: Tab на холст, стрелки двигают перо (Shift — быстрее), пробел опускает или поднимает перо.',
    code:
      "var ctx2d = canvas.getContext('2d');\n" +
      "canvas.addEventListener('pointerdown', function (e) {\n" +
      "  canvas.setPointerCapture(e.pointerId);\n" +
      "  ctx2d.beginPath(); ctx2d.moveTo(x, y);\n" +
      "});\n" +
      "// pointermove → ctx2d.lineTo(x, y); ctx2d.stroke();",
    init: function (ctx) {
      var W = 400, H = 220;
      var draw = h('canvas', { width: String(W), height: String(H), tabindex: '0', 'class': 'draw', role: 'img',
        'aria-label': 'Холст для рисования. Стрелки двигают перо, пробел опускает или поднимает перо.' });
      var cur = h('canvas', { width: String(W), height: String(H), 'class': 'overlay', 'aria-hidden': 'true' });
      var g = draw.getContext('2d'), gc = cur.getContext('2d');
      var color = h('input', { type: 'color', value: '#3157c8' });
      var size = h('input', { type: 'range', min: '1', max: '20', value: '4' });
      var clr = h('button', { type: 'button' }, 'Очистить');
      var status = h('p', { role: 'status', 'class': 'demo-hint' }, 'Перо поднято.');
      var x = W / 2, y = H / 2, down = false, drawing = false;
      function style() { g.strokeStyle = color.value; g.lineWidth = +size.value; g.lineCap = 'round'; }
      function pos(e) {
        var r = draw.getBoundingClientRect();
        return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
      }
      function cursor() {
        gc.clearRect(0, 0, W, H);
        if (document.activeElement !== draw) return;
        gc.strokeStyle = '#d97706'; gc.lineWidth = 2;
        gc.beginPath(); gc.moveTo(x - 8, y); gc.lineTo(x + 8, y); gc.moveTo(x, y - 8); gc.lineTo(x, y + 8); gc.stroke();
      }
      ctx.on(draw, 'pointerdown', function (e) {
        draw.setPointerCapture(e.pointerId);
        var p = pos(e); x = p[0]; y = p[1]; drawing = true; style();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.01, y); g.stroke();
      });
      ctx.on(draw, 'pointermove', function (e) {
        if (!drawing) return;
        var p = pos(e); g.beginPath(); g.moveTo(x, y); x = p[0]; y = p[1]; g.lineTo(x, y); g.stroke();
      });
      function end() { drawing = false; }
      ctx.on(draw, 'pointerup', end);
      ctx.on(draw, 'pointercancel', end);
      ctx.on(draw, 'keydown', function (e) {
        var step = e.shiftKey ? 20 : 6, dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -step; else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step; else if (e.key === 'ArrowDown') dy = step;
        else if (e.key === ' ') {
          e.preventDefault(); down = !down;
          status.textContent = down ? 'Перо опущено, позиция ' + Math.round(x) + ', ' + Math.round(y) + '.' : 'Перо поднято.';
          cursor(); return;
        } else return;
        e.preventDefault();
        var nx = Math.max(0, Math.min(W, x + dx)), ny = Math.max(0, Math.min(H, y + dy));
        if (down) { style(); g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); }
        x = nx; y = ny; cursor();
      });
      ctx.on(draw, 'focus', cursor);
      ctx.on(draw, 'blur', cursor);
      ctx.on(clr, 'click', function () { g.clearRect(0, 0, W, H); status.textContent = 'Холст очищен.'; });
      var wrap = h('div', { 'class': 'demo-canvas-wrap' });
      add(wrap, draw, cur);
      add(ctx.live, wrap, h('br'), labelled('Цвет', color), labelled('Толщина', size), clr, status);
    }
  });

  // ==========================================================================
  // 12.3 MathML против картинки
  // ==========================================================================
  register('html-mathml', {
    title: 'MathML против формулы-картинки',
    mode: 'host',
    badges: ['html:mathml'],
    note: 'Слева формула как MathML: текст, масштабируется без потери чёткости, выделяется и читается программами. Справа та же формула, нарисованная на canvas: при увеличении становится размытой, а вспомогательные технологии получат только текст из aria-label.',
    code:
      '<math display="block">\n  <mi>x</mi><mo>=</mo>\n  <mfrac>\n    <mrow><mo>−</mo><mi>b</mi><mo>±</mo><msqrt>…</msqrt></mrow>\n    <mrow><mn>2</mn><mi>a</mi></mrow>\n  </mfrac>\n</math>',
    init: function (ctx) {
      var m = mathEl('math', null, { display: 'block' });
      var disc = mathEl('msqrt');
      add(disc, add(mathEl('msup'), mathEl('mi', 'b'), mathEl('mn', '2')), mathEl('mo', '−'), mathEl('mn', '4'), mathEl('mi', 'a'), mathEl('mi', 'c'));
      var num = add(mathEl('mrow'), mathEl('mo', '−'), mathEl('mi', 'b'), mathEl('mo', '±'), disc);
      var den = add(mathEl('mrow'), mathEl('mn', '2'), mathEl('mi', 'a'));
      add(m, mathEl('mi', 'x'), mathEl('mo', '='), add(mathEl('mfrac'), num, den));

      var cv = h('canvas', { width: '220', height: '60', role: 'img', 'aria-label': 'x = (−b ± √(b² − 4ac)) / 2a' });
      var g = cv.getContext('2d');
      g.fillStyle = '#172033'; g.font = '20px serif'; g.textBaseline = 'middle';
      g.fillText('x = (−b ± √(b² − 4ac)) / 2a', 8, 30);

      var scale = h('input', { type: 'range', min: '1', max: '4', step: '0.5', value: '1' });
      var mw = h('div'); mw.appendChild(m);
      var cw = h('div'); cw.appendChild(cv);
      function apply() {
        var k = +scale.value;
        mw.style.fontSize = k + 'em';
        cv.style.width = Math.round(220 * k) + 'px';
        cv.style.maxWidth = 'none';
      }
      ctx.on(scale, 'input', apply);
      var row = h('div', { 'class': 'demo-math-row' });
      add(row, add(h('div'), h('p', { 'class': 'demo-label' }, 'MathML'), mw), add(h('div'), h('p', { 'class': 'demo-label' }, 'Картинка (canvas)'), cw));
      var scroller = h('div', { 'class': 'demo-scroll' }); scroller.appendChild(row);
      add(ctx.live, labelled('Масштаб', scale), scroller);
      apply();
    }
  });

  // ==========================================================================
  // 13.2 dialog (details и popover — статическая разметка прямо в странице)
  // ==========================================================================
  register('html-dialog', {
    title: 'dialog: showModal(), Esc и returnValue',
    mode: 'host',
    needs: { support: ['html:dialog'] },
    badges: ['html:dialog'],
    note: 'Модальный диалог: браузер сам выносит его на верхний слой, затемняет страницу, переводит фокус внутрь и закрывает по Esc. Обратите, как после закрытия фокус возвращается на кнопку.',
    code:
      '<dialog id="confirm-dialog">\n  <form method="dialog">\n    <button value="cancel">Отмена</button>\n    <button value="confirm">Подтвердить</button>\n  </form>\n</dialog>\n\n' +
      "dialog.showModal();   // модально\ndialog.show();        // не модально\ndialog.addEventListener('close', () => dialog.returnValue);",
    init: function (ctx) {
      var id = 'dlg-t' + (++uid);
      var dlg = h('dialog', { 'aria-labelledby': id });
      var form = h('form', { method: 'dialog' });
      add(form, h('h5', { id: id, style: 'margin:0 0 6px;font-size:16px' }, 'Подтверждение'), h('p', null, 'Продолжить операцию?'),
        add(h('div'), h('button', { value: 'cancel' }, 'Отмена'), document.createTextNode(' '), h('button', { value: 'confirm' }, 'Подтвердить')));
      dlg.appendChild(form);
      var out = h('p', { role: 'status', 'class': 'demo-stat' }, 'Диалог ещё не открывали.');
      var b1 = h('button', { type: 'button' }, 'showModal()');
      var b2 = h('button', { type: 'button' }, 'show() (не модально)');
      ctx.on(b1, 'click', function () { dlg.showModal(); });
      ctx.on(b2, 'click', function () { dlg.show(); });
      ctx.on(dlg, 'close', function () { out.textContent = 'Событие close: returnValue = "' + dlg.returnValue + '".'; });
      ctx.on(dlg, 'cancel', function () { out.textContent = 'Событие cancel: диалог закрывают клавишей Esc.'; });
      ctx.onCleanup(function () { if (dlg.open) dlg.close(); });
      add(ctx.live, b1, document.createTextNode(' '), b2, out, dlg);
    }
  });

  // 13.4 inert и contenteditable
  register('html-inert', {
    title: 'inert и contenteditable',
    mode: 'host',
    needs: { support: ['html:inert'] },
    badges: ['html:inert'],
    note: 'Включите inert: поддерево перестанет получать фокус и клики, а скринридеры его пропустят. contenteditable делает обычный блок редактируемым, но редактором он не становится.',
    code: "box.inert = true;   // атрибут inert\n<div contenteditable=\"true\">…</div>",
    init: function (ctx) {
      var box = h('div', { 'class': 'a11y-box' });
      add(box, h('p', null, 'Блок, который можно отключить.'), h('button', { type: 'button' }, 'Кнопка внутри'), document.createTextNode(' '), h('input', { type: 'text', 'aria-label': 'Поле внутри блока', value: 'поле' }));
      var cb = h('input', { type: 'checkbox' });
      var l = h('label'); add(l, cb, document.createTextNode(' inert для блока'));
      ctx.on(cb, 'change', function () { box.inert = cb.checked; ctx.say(cb.checked ? 'Блок отключён: inert' : 'Блок снова доступен'); });
      var ed = h('div', { contenteditable: 'true', role: 'textbox', 'aria-label': 'Редактируемый блок', 'aria-multiline': 'true', tabindex: '0' }, 'Этот текст можно править прямо на странице.');
      ed.style.cssText = 'margin-top:10px;padding:8px 10px;border:1px solid #b7c3e6;border-radius:8px;background:#fff';
      add(ctx.live, l, box, ed);
    }
  });

  // ==========================================================================
  // 14 Web Components: настоящий Custom Element с Shadow DOM и слотами
  // ==========================================================================
  register('html-webcomponent', {
    title: 'Web Component: Custom Element, Shadow DOM и слоты',
    mode: 'host',
    needs: { support: ['html:custom-elements'] },
    badges: ['html:custom-elements'],
    note: 'Включите «глобальный» стиль для абзацев. Обычный абзац страницы изменится, абзац внутри Shadow DOM — нет. Слотированный текст (<span slot="name">) остаётся частью страницы и стилизуется снаружи. Регистрацию Custom Element отменить нельзя: она живёт, пока открыта страница.',
    code:
      "class DemoUserCard extends HTMLElement {\n" +
      "  constructor() {\n" +
      "    super();\n" +
      "    const root = this.attachShadow({ mode: 'open' });\n" +
      "    root.append(template.content.cloneNode(true));\n" +
      "  }\n" +
      "}\n" +
      "customElements.define('demo-user-card', DemoUserCard);\n\n" +
      "<demo-user-card><span slot=\"name\">Анна</span></demo-user-card>",
    init: function (ctx) {
      if (!customElements.get('demo-user-card')) {
        var tpl = document.createElement('template');
        var style = h('style', null,
          ':host{display:block;margin:8px 0}.card{padding:10px 12px;border:1px solid #16794b;border-radius:10px;background:#edfaf3}' +
          'p{margin:4px 0;color:#16794b;font-weight:700}');
        var card = h('div', { 'class': 'card' });
        var slotName = document.createElement('slot'); slotName.setAttribute('name', 'name'); slotName.textContent = 'Имя не задано';
        add(card, h('p', null, 'Абзац внутри Shadow DOM'), add(h('p'), document.createTextNode('Имя: '), slotName), document.createElement('slot'));
        add(tpl.content, style, card);
        customElements.define('demo-user-card', class extends HTMLElement {
          constructor() {
            super();
            this.attachShadow({ mode: 'open' }).appendChild(tpl.content.cloneNode(true));
          }
        });
      }
      var scope = h('div', { 'class': 'demo-wc-scope' });
      var uc = document.createElement('demo-user-card');
      var nameSpan = h('span', { slot: 'name' }, 'Анна');
      var extra = h('span', null, 'Слотируемый текст по умолчанию.');
      add(uc, nameSpan, extra);
      add(scope, h('p', null, 'Обычный абзац страницы (light DOM).'), uc);
      var globalStyle = null;
      var cb = h('input', { type: 'checkbox' });
      var l = h('label'); add(l, cb, document.createTextNode(' Добавить стиль .demo-wc-scope p, .demo-wc-scope span { color: crimson; font-style: italic }'));
      ctx.on(cb, 'change', function () {
        if (cb.checked && !globalStyle) {
          globalStyle = h('style', null, '.demo-wc-scope p,.demo-wc-scope span{color:crimson;font-style:italic}');
          document.head.appendChild(globalStyle);
        } else if (!cb.checked && globalStyle) { globalStyle.remove(); globalStyle = null; }
      });
      ctx.onCleanup(function () { if (globalStyle) { globalStyle.remove(); globalStyle = null; } });
      add(ctx.live, l, scope);
    }
  });

  // ==========================================================================
  // 15.2 Порядок выполнения скриптов: модель по правилам спецификации
  // ==========================================================================
  register('html-script-order', {
    title: 'defer, async и module: шкала порядка (модель)',
    mode: 'host',
    note: 'Это не реальные загрузки, а модель по правилам HTML Standard: два внешних скрипта A и B встречаются на 25% и 50% разбора документа. Меняйте длительность загрузки. Исполнение каждого скрипта занимает 40 мс. Упрощение: пауза парсера на время выполнения async-скрипта не нарисована.',
    code:
      '<script src="a.js"></script>          <!-- классический: блокирует разбор -->\n' +
      '<script src="a.js" defer></script>    <!-- после разбора, по порядку -->\n' +
      '<script src="a.js" async></script>    <!-- как только загрузился -->\n' +
      '<script type="module" src="a.js"></script> <!-- отложен, как defer -->',
    init: function (ctx) {
      var E = 40;
      var rangeP = h('input', { type: 'range', min: '200', max: '1000', step: '50', value: '500' });
      var rangeA = h('input', { type: 'range', min: '50', max: '800', step: '50', value: '400' });
      var rangeB = h('input', { type: 'range', min: '50', max: '800', step: '50', value: '100' });
      var vals = h('p', { 'class': 'demo-stat' });
      var out = h('div');
      var legend = h('div', { 'class': 'tl-legend' });
      [['tl-parse', 'разбор HTML'], ['tl-blocked', 'разбор заблокирован'], ['tl-load', 'загрузка'], ['tl-exec', 'выполнение']].forEach(function (x) {
        var s = h('span'); s.appendChild(h('i', { 'class': x[0] })); s.appendChild(document.createTextNode(x[1])); legend.appendChild(s);
      });

      function model(mode, P, dA, dB) {
        var tA = P * 0.25, tB = P * 0.5, seg = { parse: [], a: [], b: [] }, order, dcl;
        function push(l, s, e, k) { seg[l].push({ s: s, e: e, k: k }); }
        if (mode === 'classic') {
          var eA = tA + dA, xA = eA + E, sB = xA + (tB - tA), eB = sB + dB, xB = eB + E, end = xB + (P - tB);
          push('parse', 0, tA, 'tl-parse'); push('parse', tA, xA, 'tl-blocked'); push('parse', xA, sB, 'tl-parse');
          push('parse', sB, xB, 'tl-blocked'); push('parse', xB, end, 'tl-parse');
          push('a', tA, eA, 'tl-load'); push('a', eA, xA, 'tl-exec'); push('b', sB, eB, 'tl-load'); push('b', eB, xB, 'tl-exec');
          order = 'A → B'; dcl = end;
        } else if (mode === 'async') {
          var rA = tA + dA, rB = tB + dB, sa = rA, sb = rB;
          if (sb < sa + E && sb >= sa - E) sb = sa + E;
          push('parse', 0, P, 'tl-parse');
          push('a', tA, rA, 'tl-load'); push('a', sa, sa + E, 'tl-exec'); push('b', tB, rB, 'tl-load'); push('b', sb, sb + E, 'tl-exec');
          order = sa <= sb ? 'A → B (кто загрузился раньше)' : 'B → A (кто загрузился раньше)'; dcl = P;
        } else {   // defer и module: после конца разбора, строго по порядку в документе
          var xa = Math.max(P, tA + dA), xb = Math.max(xa + E, tB + dB, P);
          push('parse', 0, P, 'tl-parse');
          push('a', tA, tA + dA, 'tl-load'); push('a', xa, xa + E, 'tl-exec'); push('b', tB, tB + dB, 'tl-load'); push('b', xb, xb + E, 'tl-exec');
          order = 'A → B (всегда порядок документа)'; dcl = xb + E;
        }
        return { seg: seg, order: order, dcl: dcl };
      }
      function render() {
        var P = +rangeP.value, dA = +rangeA.value, dB = +rangeB.value;
        vals.textContent = 'Разбор документа: ' + P + ' мс · загрузка A: ' + dA + ' мс · загрузка B: ' + dB + ' мс';
        var modes = [['classic', '<script src>'], ['defer', 'defer'], ['async', 'async'], ['module', 'type="module"']];
        var models = modes.map(function (m) { return model(m[0], P, dA, dB); });
        var total = Math.max.apply(null, models.map(function (m) { return Math.max(m.dcl, P); })) * 1.02;
        ctx.clear(out);
        modes.forEach(function (m, idx) {
          var md = models[idx];
          out.appendChild(h('p', { 'class': 'tl-mode' }, m[1]));
          [['parse', 'Разбор'], ['a', 'Скрипт A'], ['b', 'Скрипт B']].forEach(function (ln) {
            var row = h('div', { 'class': 'tl-row' });
            row.appendChild(h('span', { 'class': 'tl-lane-name' }, ln[1]));
            var lane = h('div', { 'class': 'tl-lane', 'aria-hidden': 'true' });
            md.seg[ln[0]].forEach(function (s) {
              var b = h('span', { 'class': s.k });
              b.style.left = (s.s / total * 100) + '%';
              b.style.width = Math.max(0.4, (s.e - s.s) / total * 100) + '%';
              lane.appendChild(b);
            });
            row.appendChild(lane);
            out.appendChild(row);
          });
          out.appendChild(h('p', { 'class': 'tl-summary' }, 'Порядок выполнения: ' + md.order + ' · DOM-разбор и скрипты завершены к ≈' + Math.round(md.dcl) + ' мс'));
        });
      }
      ctx.on(rangeP, 'input', render); ctx.on(rangeA, 'input', render); ctx.on(rangeB, 'input', render);
      add(ctx.live, labelled('Разбор HTML', rangeP), labelled('Загрузка A', rangeA), labelled('Загрузка B', rangeB), vals, legend, out);
      render();
    }
  });

  // ==========================================================================
  // 16 Доступность: режим «только клавиатура», фокус, подписи форм
  // ==========================================================================
  register('html-a11y', {
    title: 'Доступность: клавиатура, фокус и подписи полей',
    mode: 'host',
    note: 'Включите «только клавиатура» (мышь в блоке отключается) и пройдите форму клавишей Tab. Сравните две формы: у левой нет подписей и «кнопка» сделана из div, у правой всё нативно. Имена полей — упрощённая модель того, что получит скринридер.',
    code:
      '<!-- Плохо -->\n<input placeholder="Имя">\n<div class="btn" onclick="send()">Отправить</div>\n\n' +
      '<!-- Хорошо -->\n<label for="n">Имя</label>\n<input id="n" name="name">\n<button type="submit">Отправить</button>',
    init: function (ctx) {
      var n = ++uid;
      var kbd = h('input', { type: 'checkbox' }), nof = h('input', { type: 'checkbox' });
      var l1 = h('label'); add(l1, kbd, document.createTextNode(' Только клавиатура (отключить мышь в блоке)'));
      var l2 = h('label'); add(l2, nof, document.createTextNode(' Скрыть индикатор фокуса (так делать нельзя)'));
      var area = h('div', { 'class': 'a11y-cols' });
      var bad = h('div', { 'class': 'a11y-box' }); bad.appendChild(h('h5', null, 'Плохо'));
      var b1 = h('input', { type: 'text', placeholder: 'Имя' }), b2 = h('input', { type: 'text', placeholder: 'Почта' });
      var fake = h('div', { 'class': 'a11y-fake-btn' }, 'Отправить');
      var good = h('div', { 'class': 'a11y-box' }); good.appendChild(h('h5', null, 'Хорошо'));
      var g1 = h('input', { type: 'text', id: 'a11y-n' + n, name: 'name' }), g2 = h('input', { type: 'email', id: 'a11y-e' + n, name: 'email' });
      var gl1 = h('label', { 'for': 'a11y-n' + n }, 'Имя'), gl2 = h('label', { 'for': 'a11y-e' + n }, 'Почта');
      var gbtn = h('button', { type: 'button' }, 'Отправить');
      add(bad, b1, b2, fake); add(good, gl1, g1, gl2, g2, gbtn);
      add(area, bad, good);
      var res = h('div', { role: 'status', 'class': 'demo-stat' });
      function nameOf(inp) {
        var lab = inp.id && area.querySelector('label[for="' + inp.id + '"]');
        if (lab) return '«' + lab.textContent + '»';
        if (inp.getAttribute('aria-label')) return '«' + inp.getAttribute('aria-label') + '»';
        return 'имени нет' + (inp.placeholder ? ' (есть только placeholder «' + inp.placeholder + '», он исчезает при вводе и не заменяет подпись)' : '');
      }
      ctx.on(fake, 'click', function () { res.textContent = 'Div-«кнопка» нажата мышью. С клавиатуры до неё не добраться: у div нет фокуса и роли button.'; });
      ctx.on(gbtn, 'click', function () { res.textContent = 'Кнопка нажата. Она доступна по Tab, Enter и пробелу без единой строки JavaScript.'; });
      ctx.on(kbd, 'change', function () { area.classList.toggle('a11y-kbd-only', kbd.checked); ctx.say(kbd.checked ? 'Мышь в блоке отключена' : 'Мышь снова работает'); });
      ctx.on(nof, 'change', function () { area.classList.toggle('a11y-no-focus', nof.checked); });
      var names = h('p', { 'class': 'demo-hint' });
      names.style.whiteSpace = 'pre-wrap';
      names.textContent = 'Имена полей:\nЛевая форма: поле 1 — ' + nameOf(b1) + '; поле 2 — ' + nameOf(b2) +
        '\nПравая форма: поле 1 — ' + nameOf(g1) + '; поле 2 — ' + nameOf(g2);
      add(ctx.live, l1, document.createElement('br'), l2, area, names, res);
    }
  });

  // ==========================================================================
  // 18 Устаревшее: старый и новый подход рядом
  // ==========================================================================
  var OBSOLETE = [
    ['<center>Текст по центру</center>', '<div style="text-align:center">Текст по центру</div>', 'CSS: text-align'],
    ['<font color="crimson" size="5">Красный крупный</font>', '<span style="color:crimson;font-size:1.5em">Красный крупный</span>', 'CSS: color, font-size'],
    ['<big>Увеличенный</big>', '<span style="font-size:larger">Увеличенный</span>', 'CSS: font-size'],
    ['<strike>Зачёркнуто</strike>', '<s>Зачёркнуто</s> или <del>удалено</del>', 'Смысловые s и del'],
    ['<tt>моноширинный</tt>', '<code>моноширинный</code>', 'Смысловой code, kbd, samp']
  ];
  register('html-obsolete', {
    title: 'Устаревшее и современное: рядом',
    mode: 'host',
    note: 'Браузеры до сих пор рисуют старые элементы ради совместимости со старыми сайтами, но для нового кода их использовать не следует. Старая разметка вставляется только из этого скрипта: в самом HTML-файле страницы устаревших элементов нет.',
    init: function (ctx) {
      var rows = OBSOLETE.map(function (r) {
        var tr = h('tr');
        var a = h('td'); a.appendChild(fromHTML(r[0])); a.appendChild(h('div', { 'class': 'demo-hint' }, r[0]));
        var b = h('td'); b.appendChild(fromHTML(r[1])); b.appendChild(h('div', { 'class': 'demo-hint' }, r[1]));
        add(tr, a, b, h('td', null, r[2]));
        return tr;
      });
      var wrap = tableOf(['Старый подход', 'Современный подход', 'Чем заменяют'], rows);
      wrap.classList.add('demo-scroll');
      ctx.live.appendChild(wrap);
    }
  });
})();
