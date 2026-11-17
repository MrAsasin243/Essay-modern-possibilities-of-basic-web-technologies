/*
 * assets/demos-css.js — примеры раздела «CSS» (css.html).
 * Почти все примеры работают в режиме host: код написан автором сайта, а читатель
 * меняет только ДАННЫЕ (значения ползунков, текст селектора, значения свойств).
 *   - Значения применяются как CSS-свойства своего элемента (style.setProperty и т. п.):
 *     неверное значение браузер просто отбрасывает, выполнить его нельзя.
 *   - Текст селектора уходит только в querySelectorAll и в калькулятор специфичности.
 * Единственный пример с редактируемым кодом (css-lab) работает в sandbox-iframe.
 * Статический CSS самих примеров (@container, @keyframes, :has() и т. д.) лежит в demo.css.
 */
(function () {
  'use strict';

  var uid = 0;

  // ---------- Небольшие помощники (те же, что в demos-html.js) ----------
  function h(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;                 // null/undefined не превращаем в строку "null"
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
  function fromHTML(str) {
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + str, 'text/html');
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(doc.body.childNodes).forEach(function (n) { frag.appendChild(document.importNode(n, true)); });
    return frag;
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
  function range(min, max, value, step) {
    return h('input', { type: 'range', min: String(min), max: String(max), value: String(value), step: step == null ? '1' : String(step) });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function chips(items) {
    var row = h('div', { 'class': 'demo-chips' });
    items.forEach(function (t) { var b = h('button', { type: 'button', 'data-v': t }, t); row.appendChild(b); });
    return row;
  }

  // ==========================================================================
  // Калькулятор специфичности (A, B, C). Используют «Специфичность» и «Каскад».
  // Реализация упрощённая, но разбирает :is(), :not(), :has(), :where(), nth-child(... of S).
  // ==========================================================================
  function splitTop(s, sep) {
    var out = [], depth = 0, q = null, cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) { cur += c; if (c === '\\') { cur += s[++i] || ''; } else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(' || c === '[') depth++; else if (c === ')' || c === ']') depth--;
      if (c === sep && depth === 0) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out;
  }
  function readBalanced(s, i) {            // s[i] === '(' → [содержимое, индекс после ')']
    var depth = 0, q = null, start = i + 1;
    for (var j = i; j < s.length; j++) {
      var c = s[j];
      if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c;
      else if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) return [s.slice(start, j), j + 1]; }
    }
    return [s.slice(start), s.length];
  }
  function readIdent(s, i) {
    var j = i;
    while (j < s.length) {
      var c = s[j];
      if (c === '\\') { j += 2; continue; }
      if (/[\w\u00a0-\uffff-]/.test(c)) j++; else break;
    }
    return [s.slice(i, j), j];
  }
  function cmp(a, b) {
    for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1; }
    return 0;
  }
  function specOfList(str) {
    var best = [0, 0, 0];
    splitTop(str, ',').forEach(function (part) {
      var r = specificity(part.trim());
      if (cmp(r.v, best) > 0) best = r.v;
    });
    return best;
  }
  /** Возвращает { v: [A, B, C], tokens: [{ t, cat, vv, note }] }. */
  function specificity(sel) {
    var v = [0, 0, 0], tokens = [], i = 0, s = sel, r;
    function put(cat, txt, vv, note) {
      if (vv) { v[0] += vv[0]; v[1] += vv[1]; v[2] += vv[2]; }
      tokens.push({ t: txt, cat: cat, vv: vv, note: note || '' });
    }
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c) || c === '>' || c === '+' || c === '~' || c === ',') { i++; continue; }   // комбинаторы
      if (c === '*') { put('0', '*', null, 'универсальный селектор ничего не добавляет'); i++; continue; }
      if (c === '#') { r = readIdent(s, i + 1); put('A', '#' + r[0], [1, 0, 0]); i = r[1]; continue; }
      if (c === '.') { r = readIdent(s, i + 1); put('B', '.' + r[0], [0, 1, 0]); i = r[1]; continue; }
      if (c === '[') {
        var j = i + 1, q = null;
        while (j < s.length) {
          if (q) { if (s[j] === '\\') j++; else if (s[j] === q) q = null; }
          else if (s[j] === '"' || s[j] === "'") q = s[j];
          else if (s[j] === ']') break;
          j++;
        }
        put('B', s.slice(i, j + 1), [0, 1, 0], 'атрибут считается как класс');
        i = j + 1; continue;
      }
      if (c === ':') {
        if (s[i + 1] === ':') {
          r = readIdent(s, i + 2);
          var pe = '::' + r[0]; i = r[1];
          if (s[i] === '(') { var pb = readBalanced(s, i); pe += '(' + pb[0] + ')'; i = pb[1]; }
          put('C', pe, [0, 0, 1], 'псевдоэлемент считается как тип');
          continue;
        }
        r = readIdent(s, i + 1);
        var name = r[0].toLowerCase(); i = r[1];
        if (/^(before|after|first-line|first-letter)$/.test(name) && s[i] !== '(') {
          put('C', ':' + r[0], [0, 0, 1], 'старая запись псевдоэлемента с одним двоеточием');
          continue;
        }
        if (s[i] === '(') {
          var bb = readBalanced(s, i), inner = bb[0]; i = bb[1];
          var full = ':' + r[0] + '(' + inner + ')';
          if (name === 'where') put('0', full, null, ':where() всегда даёт ноль');
          else if (/^(is|not|has|matches|-webkit-any|-moz-any)$/.test(name)) put('fn', full, specOfList(inner), 'берётся наибольшая специфичность из аргументов; сам псевдокласс ничего не добавляет');
          else if (/^nth-(last-)?child$/.test(name)) {
            var m = /\sof\s([\s\S]*)$/i.exec(inner), sv = m ? specOfList(m[1]) : [0, 0, 0];
            put('B', full, [sv[0], sv[1] + 1, sv[2]], 'псевдокласс = класс' + (m ? ', плюс наибольший селектор после «of»' : ''));
          } else put('B', full, [0, 1, 0], 'псевдокласс считается как класс');
        } else put('B', ':' + r[0], [0, 1, 0], 'псевдокласс считается как класс');
        continue;
      }
      var id = readIdent(s, i);
      if (id[0]) { put('C', id[0], [0, 0, 1], 'тип элемента'); i = id[1]; continue; }
      i++;
    }
    return { v: v, tokens: tokens };
  }

  // ---------- Подводные камни и ограничения ----------
  var PITFALLS = {
    'css-selectors': [
      'querySelectorAll оценивает селектор относительно всего документа, а не только образца: комбинаторы могут «смотреть» за пределы образца (например, body article).',
      'Неверный или неизвестный браузеру селектор бросает SyntaxError. Поддержка :has(), :is(), :where() и вложенности зависит от версии браузера, так что ошибка здесь не обязательно ваша.',
      'Выбор в JavaScript — это снимок: при изменении DOM он не пересчитывается, а CSS-правила применяются к любым изменениям автоматически.',
      'Псевдоэлементы (::before, ::first-line) в querySelectorAll ничего не вернут: это не элементы дерева.',
      'Подсветка добавляет класс sel-hit, поэтому селекторы вроде :not(.sel-hit) увидят это изменение. В обычном CSS класса нет.',
      'Сложные селекторы с :has() и длинными цепочками дороже для браузера; не пишите их ради красоты на огромных деревьях.'
    ],
    'css-specificity': [
      'Калькулятор упрощён: он не учитывает @scope, вложенные правила с & (там специфичность родителя подставляется как :is()), теневой DOM (:host, ::slotted, ::part) и редкие экранирования.',
      'Специфичность — только один шаг каскада. Слои @layer, !important, источник стиля и порядок записи могут перебить её (см. пример каскада ниже).',
      'Атрибут style и !important в тройку (A, B, C) не входят: они сравниваются на других шагах.',
      ':is(), :not() и :has() берут наибольшую специфичность из аргументов, :where() — всегда ноль. Из-за этого :where() удобен для базовых стилей, которые легко перекрыть.',
      'Сравнение идёт поразрядно, без переноса: десять классов не побеждают один id. (0,10,0) всё равно меньше (1,0,0).',
      'Универсальный селектор и комбинаторы специфичность не меняют, а псевдоэлементы считаются как типы.'
    ],
    'css-cascade': [
      'Это модель одного свойства (color) для одного элемента. Она не учитывает анимации, переходы, наследование, @scope, revert и revert-layer.',
      'Для !important порядок слоёв обратный: побеждает самый ранний слой, а объявление вне слоя проигрывает. Это частая причина путаницы.',
      'Для обычных объявлений стили вне слоя побеждают любой слой независимо от специфичности. Поэтому библиотеки кладут свои стили в слои.',
      'Стили браузера (UA) с !important побеждают стили автора, это строго по спецификации и в реальных страницах встречается редко.',
      'Настоящий результат всегда проверяйте в DevTools, во вкладке Styles: перечёркнутые правила проиграли, а вкладка Computed показывает итог.',
      'Большое число !important — признак проблем с архитектурой. Для управления приоритетом есть слои @layer и :where().'
    ],
    'css-box': [
      'Это настоящий элемент: числа берутся из getBoundingClientRect(). Margin показан тенью (box-shadow): тень не входит в блочную модель и ничего не сдвигает, она нужна только для наглядности.',
      'По умолчанию box-sizing равен content-box, и width не включает padding и border. Поэтому width: 100% вместе с padding вызывает переполнение. Многие проекты сбрасывают его на border-box для всех элементов.',
      'Вертикальные margin соседних блоков схлопываются (margin collapse). В примере один элемент, поэтому это не видно; см. раздел про margin collapse.',
      'Проценты в padding и margin считаются от ширины контейнера, даже у вертикальных отступов.',
      'Браузеры округляют дробные пиксели по-разному, поэтому суммы могут отличаться на доли пикселя.',
      'У inline-элементов width, height и вертикальные margin не действуют.',
      'min-width и max-width сильнее width, и при border-box в них тоже входят padding и border.'
    ],
    'css-flex': [
      'У элементов разный вертикальный padding, чтобы были видны различия align-items. В реальных проектах разные высоты дают содержимое и дизайн.',
      'Минимальный размер flex-элемента по умолчанию равен размеру его содержимого (min-width: auto). Длинное слово или картинка не дадут элементу сжаться, и нужен min-width: 0.',
      'justify-content действует по главной оси, а align-items — по поперечной. При flex-direction: column оси меняются местами: частая путаница.',
      'align-content работает только при переносе (flex-wrap) и нескольких линиях; для одной линии он ничего не делает.',
      'order и reverse-направления меняют только визуальный порядок. Порядок чтения и фокуса остаётся по DOM, что вредит доступности.',
      'flex-basis сильнее width, но не сильнее min-width и max-width.',
      'Свойство gap для flex поддерживается современными браузерами; в очень старых версиях Safari его не было.',
      'margin: auto у flex-элемента забирает свободное место и конфликтует с justify-content: это мощный приём, но неожиданный.'
    ],
    'css-grid': [
      'Значения дорожек проверяются через CSS.supports(). Неверное значение игнорируется целиком, как в настоящем CSS: ошибки в консоли не будет.',
      'В grid-template-areas все строки должны иметь одинаковое число колонок и образовывать прямоугольники; иначе объявление недействительно целиком, и никаких предупреждений нет.',
      'grid-auto-flow: dense заполняет «дырки», но меняет только визуальный порядок. Порядок чтения и фокуса остаётся по DOM.',
      '1fr не делит место поровну, если содержимое шире: минимум у fr-дорожки равен min-content. Нужен minmax(0, 1fr).',
      'Неявные дорожки появляются, когда элементов больше, чем явных ячеек; их размер задаёт grid-auto-rows и grid-auto-columns.',
      'Для одномерной раскладки Flexbox обычно проще. Grid выбирают, когда нужно управлять строками и столбцами одновременно.'
    ],
    'css-grid-auto': [
      'auto-fit схлопывает пустые дорожки, auto-fill сохраняет их. Разница заметна только когда элементов меньше, чем помещается дорожек.',
      'Если минимум в minmax() больше самого контейнера, дорожка переполнит его. Помогает minmax(min(100%, 90px), 1fr).',
      'Число дорожек вычисляется из доступной ширины и gap, а не из числа элементов.',
      'Число дорожек берётся из getComputedStyle(...).gridTemplateColumns. Браузеры возвращают там разрешённые размеры в пикселях, но формат строки может отличаться.'
    ],
    'css-grid-subgrid': [
      'subgrid поддерживается во всех основных браузерах только в сравнительно новых версиях: бейдж показывает результат для вашего. Без поддержки раскладка деградирует до независимых дорожек.',
      'Subgrid по умолчанию наследует gap родителя, но его можно переопределить.',
      'Родитель обязан отводить элементу несколько строк (grid-row: span 3), иначе нечего «наследовать».',
      'Без subgrid выравнивание частей карточек решали фиксированными высотами или JavaScript. Оба подхода хрупкие.'
    ],
    'css-container': [
      'container-type: inline-size включает containment: ширина контейнера не может зависеть от содержимого. В flex и inline-контекстах без явной ширины он может схлопнуться.',
      'Container query применяется к потомкам контейнера, но не к самому контейнеру: элемент не может запрашивать собственный размер.',
      'Media query смотрит на viewport (вторая карточка): она не реагирует на ползунок, потому что ширина окна не меняется.',
      'Порог в пикселях здесь 420 для наглядности. В реальных проектах лучше em или rem, чтобы учитывать размер шрифта.',
      'Единицы cqw, cqi и подобные отсчитываются от ближайшего контейнера, и без контейнера они равны единицам viewport.'
    ],
    'css-variables': [
      'Значение пользовательского свойства — просто текст. Ошибка обнаруживается только при подстановке (invalid at computed-value time), а не при объявлении.',
      'При такой ошибке свойство ведёт себя как unset: width становится auto и блок растягивается. Тихо и без ошибки в консоли.',
      'Запасное значение var(--x, fallback) срабатывает только если переменная не определена. Если она определена, но неверна, запасное значение не спасёт.',
      'Переменные нельзя использовать в именах свойств и в условиях @media: @media (min-width: var(--w)) не сработает.',
      'Переменные наследуются: переопределение на вложенном элементе действует на всё поддерево. Это сила и источник неожиданностей.',
      'Плавно анимировать переменные можно только после регистрации через @property; иначе значение меняется скачком.',
      'Здесь значения ставятся из JavaScript через style.setProperty: встроенный стиль имеет высокий приоритет и затрёт правила из таблиц стилей.'
    ],
    'css-transforms': [
      'Порядок преобразований важен: матрицы перемножаются, и «сдвиг, потом поворот» отличается от «поворота, потом сдвига» (кнопка «Развернуть порядок»).',
      'transform не влияет на раскладку: соседние элементы не сдвигаются, а место, которое занимал элемент, остаётся прежним (пунктирный контур).',
      'transform создаёт новый контекст наложения и содержащий блок для потомков с position: fixed и absolute.',
      'На строчных (inline) элементах transform не действует: нужен display: inline-block или блочный.',
      'Дробные значения translate могут размывать текст; браузеры по-разному выравнивают по пикселям.',
      'Есть отдельные свойства translate, rotate и scale. Они комбинируются в фиксированном порядке и в этом примере не используются.',
      'Значение matrix(...) читается из getComputedStyle: это итоговая матрица, а не записанная строка.'
    ],
    'css-transitions': [
      'Редактор ограничивает x контрольных точек диапазоном 0–1: при другом x CSS считает cubic-bezier() недопустимым и отбрасывает объявление. Значение y может выходить за 0–1 и давать «пружину».',
      'Показанное время — это интервал от запуска до события transitionend на странице, оно включает задержку кадра, а не точное значение.',
      'Переход запускается только при изменении значения. Нельзя анимировать из display: none и между auto и числом (интерполяция невозможна).',
      'Если вкладка скрыта, браузер может не доставить события вовремя; а если переход прервали, transitionend не придёт.',
      'При включённом «уменьшении движения» шарики перепрыгивают мгновенно, как и должен вести себя интерфейс.',
      'Для плавности анимируйте transform и opacity (см. раздел про стоимость изменений в браузерах); width, height и left вызывают перерасчёт раскладки.',
      'Для ступенчатых эффектов есть steps(), но у него другая семантика, чем у кривых.'
    ],
    'css-animations': [
      'Пример запускается только по кнопке: сайт не стартует движение сам, особенно при включённом prefers-reduced-motion.',
      'animation-fill-mode определяет вид до начала (backwards) и после конца (forwards). Его забывают, и элемент «прыгает» к исходному положению.',
      'Направление alternate считает итерации: нечётные идут вперёд, чётные назад, поэтому при одной итерации разницы с normal нет.',
      'Бесконечные анимации расходуют ресурсы, пока элемент в документе. Пример останавливает анимацию, когда уходит с экрана.',
      'Анимация не перезапускается при повторной установке того же имени: нужен сброс (убрать имя, перерисовать, поставить снова), как делает кнопка.',
      'Отрицательная задержка начинает анимацию «с середины», а не откладывает её.',
      'animation-play-state: paused замораживает, а не сбрасывает; после «Продолжить» движение идёт с того же места.'
    ],
    'css-modern-1': [
      ':has() — родительский селектор. Он дороже обычных, поэтому осторожно с ним на огромных деревьях. Поддерживается в новых версиях браузеров; проверяйте бейдж.',
      'Вложенность CSS: старые браузеры отбрасывают весь блок целиком. Поэтому здесь правило обёрнуто в @supports selector(&). Специфичность & равна :is() родителя, это отличается от препроцессоров.',
      'oklch() и color-mix(): цвета вне гаммы экрана сжимаются (gamut mapping) и выглядят иначе на разных мониторах. Неизвестное значение объявление просто отбрасывает.',
      'light-dark() работает только при заданном color-scheme на элементе или предке и только для цветов. Без color-scheme он не реагирует на prefers-color-scheme.',
      'Интерполяция color-mix() зависит от выбранного цветового пространства: srgb, oklab и oklch дают разные середины.'
    ],
    'css-modern-2': [
      'text-wrap: balance работает только для коротких блоков: браузеры ограничивают число строк, а у длинного абзаца свойство молча не действует.',
      'field-sizing: content растит поле по содержимому. Без max-width и max-height оно может вырасти больше нужного.',
      'accent-color окрашивает только нативные элементы управления; контраст при этом автоматически не гарантируется.',
      'Scroll-driven animations поддерживаются не везде: проверяйте бейдж. animation-timeline перекрывает animation-duration, а правило безопасно прячут в @supports.',
      'View Transitions делают снимки страницы: view-transition-name должен быть уникальным на странице, а без поддержки пример просто обновляет состояние сразу.',
      'Anchor positioning новая, и синтаксис менялся (inset-area → position-area). Нужна запасная раскладка, а через границу Shadow DOM привязка не работает.',
      'Для scroll-driven анимации прогресс-бар здесь связан с прокруткой, а не со временем, поэтому он не мерцает и не зависит от prefers-reduced-motion; а декоративные анимации по времени в этом блоке отсутствуют.'
    ],
    'css-lab': [
      'Скрипты в песочнице отключены, а iframe не имеет доступа к странице: стили не влияют на сайт и сайт не влияет на них.',
      'Внешние адреса (url(), @import) заблокированы политикой CSP внутри песочницы; допускаются только data:-изображения.',
      'Если браузер не поддерживает вложенность или :has(), правила молча не применятся. Откройте DevTools, чтобы увидеть, что отброшено.',
      'Каждое изменение пересоздаёт iframe с задержкой 0,5 с, поэтому состояние внутри (например, отмеченный чекбокс) сбрасывается при правке.'
    ]
  };
  function register(id, def) {
    if (PITFALLS[id]) def.pitfalls = PITFALLS[id];
    Demo.register(id, def);
  }

  // ==========================================================================
  // 5. Селекторы: вводишь селектор — совпавшие элементы подсвечиваются
  // ==========================================================================
  var SEL_SAMPLE =
    '<article class="card active"><h2>Заголовок карточки</h2><p>Первый абзац со <a href="https://example.com">ссылкой</a>.</p>' +
    '<p class="note">Примечание.</p><ul><li>Раз</li><li class="done">Два</li><li>Три</li><li>Четыре</li></ul>' +
    '<input type="email" placeholder="email"><input type="text" placeholder="текст"></article>' +
    '<article class="card"><h3>Другая карточка</h3><p>Абзац без классов.</p></article>';

  register('css-selectors', {
    title: 'Селектор → подсвеченные элементы',
    mode: 'host',
    note: 'Введите селектор или нажмите готовый пример. Совпавшие элементы образца получают оранжевую рамку. Ошибки (неверный или неподдерживаемый селектор) показываются текстом.',
    code:
      "var hits = sample.querySelectorAll('article > p');\n" +
      "hits.forEach(function (el) { el.classList.add('sel-hit'); });\n" +
      "// Неверный селектор бросает SyntaxError — ловим его через try/catch.",
    init: function (ctx) {
      var sample = h('div', { 'class': 'sel-sample' });
      sample.appendChild(fromHTML(SEL_SAMPLE));
      var inp = h('input', { type: 'text', value: 'article > p', 'aria-label': 'CSS-селектор', size: '36', spellcheck: 'false', autocomplete: 'off' });
      var out = h('p', { role: 'status', 'class': 'demo-readout' });
      var row = chips(['article > p', 'h2 + p', '.card.active', '[type="email"]', 'li:nth-child(2n+1)', 'p:not(.note)', ':is(h2, h3)', 'a[href^="https"]', 'article:has(.note)', 'li.done ~ li']);
      function run() {
        sample.querySelectorAll('.sel-hit').forEach(function (e) { e.classList.remove('sel-hit'); });
        var list;
        try { list = sample.querySelectorAll(inp.value); }
        catch (e) { out.textContent = 'Селектор не принят браузером (' + e.name + '). Проверьте синтаксис; возможно, ваш браузер не поддерживает эту возможность.'; return; }
        list.forEach(function (e) { e.classList.add('sel-hit'); });
        var names = Array.prototype.slice.call(list, 0, 8).map(function (e) { return '<' + e.localName + (e.className && typeof e.className === 'string' ? '.' + e.className.replace(/\s*sel-hit\s*/g, '').trim().split(/\s+/).join('.') : '') + '>'; });
        out.textContent = 'Найдено элементов: ' + list.length + (names.length ? '\n' + names.join(' ') + (list.length > 8 ? ' …' : '') : '');
      }
      ctx.on(inp, 'input', run);
      ctx.on(row, 'click', function (e) { var v = e.target.getAttribute && e.target.getAttribute('data-v'); if (v) { inp.value = v; run(); } });
      add(ctx.live, labelled('Селектор', inp), row, out, sample);
      run();
    }
  });

  // ==========================================================================
  // 6.2 Специфичность: калькулятор (A, B, C) и сравнение двух селекторов
  // ==========================================================================
  function renderSpec(host, sel, ctx) {
    var r = specificity(sel);
    ctx.clear(host);
    if (!sel.trim()) { host.appendChild(h('p', { 'class': 'demo-hint' }, 'Введите селектор.')); return r; }
    var tb = h('tbody');
    r.tokens.forEach(function (t) {
      var tr = h('tr');
      tr.appendChild(add(h('td'), h('code', null, t.t)));
      var contrib = t.cat === 'A' ? 'A +1' : t.cat === 'B' ? 'B +1' : t.cat === 'C' ? 'C +1' : t.cat === 'fn' ? '(' + t.vv.join(', ') + ') из аргументов' : '0';
      tr.appendChild(h('td', null, contrib));
      tr.appendChild(h('td', null, t.note));
      tb.appendChild(tr);
    });
    var table = h('table', { 'class': 'demo-spec' });
    var hr = h('tr'); ['Часть', 'Вклад', 'Пояснение'].forEach(function (x) { hr.appendChild(h('th', { scope: 'col' }, x)); });
    add(table, add(h('thead'), hr), tb);
    var w = h('div', { 'class': 'table-wrap' }); w.appendChild(table);
    host.appendChild(h('p', { 'class': 'demo-spec-total' }, 'Специфичность (A, B, C) = (' + r.v.join(', ') + ')'));
    host.appendChild(w);
    return r;
  }

  register('css-specificity', {
    title: 'Калькулятор специфичности (A, B, C)',
    mode: 'host',
    note: 'Введите два селектора и сравните. Калькулятор учитывает :is(), :not(), :has() (берётся наибольший аргумент), :where() (ноль) и nth-child(… of S).',
    code:
      "A — число #id          B — классы, атрибуты, псевдоклассы          C — типы и псевдоэлементы\n\n" +
      "#nav .item:hover   →  (1, 2, 0)\n" +
      "ul li a            →  (0, 0, 3)\n" +
      ":is(#a, .b) p      →  (1, 0, 1)   /* наибольший аргумент */\n" +
      ":where(#a) p       →  (0, 0, 1)   /* :where() даёт ноль */",
    init: function (ctx) {
      var i1 = h('input', { type: 'text', value: '#nav .item:hover', size: '30', spellcheck: 'false', autocomplete: 'off' });
      var i2 = h('input', { type: 'text', value: 'ul li a.link', size: '30', spellcheck: 'false', autocomplete: 'off' });
      var o1 = h('div'), o2 = h('div'), verdict = h('p', { role: 'status', 'class': 'demo-readout' });
      var row = chips(['#nav .item:hover', 'ul li a', ':is(#a, .b) p', ':where(#a) p', 'a:not(.x)', 'p::first-line', 'li:nth-child(2n+1 of .x)', ':has(> img)', '[type="email"]']);
      var focused = i1;
      function run() {
        var a = renderSpec(o1, i1.value, ctx), b = renderSpec(o2, i2.value, ctx);
        if (!i1.value.trim() || !i2.value.trim()) { verdict.textContent = ''; return; }
        var c = cmp(a.v, b.v), names = ['A (идентификаторы)', 'B (классы, атрибуты, псевдоклассы)', 'C (типы, псевдоэлементы)'];
        if (c === 0) verdict.textContent = 'Специфичность равна. Побеждает объявление, которое записано в стилях позже.';
        else {
          var k = 0; while (a.v[k] === b.v[k]) k++;
          verdict.textContent = 'Побеждает селектор ' + (c > 0 ? '1' : '2') + ': разряды сравниваются слева направо, и решает разряд ' + names[k] + ' (' + a.v[k] + ' и ' + b.v[k] + '). Остальные разряды не смотрят.';
        }
      }
      ctx.on(i1, 'input', run); ctx.on(i2, 'input', run);
      ctx.on(i1, 'focus', function () { focused = i1; }); ctx.on(i2, 'focus', function () { focused = i2; });
      ctx.on(row, 'click', function (e) { var v = e.target.getAttribute && e.target.getAttribute('data-v'); if (v) { focused.value = v; run(); } });
      add(ctx.live, h('p', { 'class': 'demo-hint' }, 'Нажмите готовый пример: он подставится в поле, где последний раз был фокус.'), row,
        labelled('Селектор 1', i1), o1, labelled('Селектор 2', i2), o2, verdict);
      run();
    }
  });

  // ==========================================================================
  // 6.5 Каскад: разрешитель конфликтов с @layer
  // ==========================================================================
  var LAYERS = ['reset', 'base', 'components', 'utilities'];
  var CASCADE_STEPS = ['Происхождение и !important', 'Слой @layer', 'Встроенный style=""', 'Специфичность: A', 'Специфичность: B', 'Специфичность: C', 'Порядок записи (позднее побеждает)'];

  function cascadeRank(d, order) {
    var tier = d.imp ? (d.origin === 'author' ? 5 : d.origin === 'user' ? 6 : 7) : (d.origin === 'author' ? 3 : d.origin === 'user' ? 2 : 1);
    var li = LAYERS.indexOf(d.layer), layerRank;
    if (d.origin !== 'author') layerRank = 0;
    else if (!d.imp) layerRank = li < 0 ? 100 : li;                         // обычные: вне слоя — самый сильный, поздний слой сильнее
    else layerRank = li < 0 ? -1 : (LAYERS.length - 1 - li);                // !important: порядок обратный
    var s = d.inline ? [1, 0, 0, 0] : [0].concat(specificity(d.sel).v);
    return [tier, layerRank].concat(s, [order]);
  }

  register('css-cascade', {
    title: 'Разрешитель каскада: кто победил и почему',
    mode: 'host',
    note: 'Пять конкурирующих объявлений color для одного абзаца. Меняйте селекторы, значения, слои, источники и !important. Показан решающий шаг каскада между первым и вторым местом. Это модель одного свойства; проверяйте в DevTools.',
    code:
      "@layer reset, base, components, utilities;\n\n" +
      "@layer base       { p { color: gray; } }\n" +
      "@layer components { .note { color: green; } }\n" +
      "p.note { color: orange; }                  /* вне слоя */\n" +
      "<p style=\"color: purple\">                   /* встроенный стиль */",
    init: function (ctx) {
      var rows = [
        { sel: 'p', val: 'black', origin: 'ua', layer: '', imp: false, inline: false, on: true, name: 'Стили браузера' },
        { sel: 'p', val: 'gray', origin: 'author', layer: 'base', imp: false, inline: false, on: true, name: 'Автор: p в слое base' },
        { sel: '.note', val: 'green', origin: 'author', layer: 'components', imp: false, inline: false, on: true, name: 'Автор: .note в слое components' },
        { sel: 'p.note', val: 'orange', origin: 'author', layer: '', imp: false, inline: false, on: true, name: 'Автор: p.note вне слоя' },
        { sel: '', val: 'purple', origin: 'author', layer: '', imp: false, inline: true, on: true, name: 'Автор: style="…"' }
      ];
      var tbody = h('tbody'), ctrl = [];
      rows.forEach(function (r, i) {
        var tr = h('tr');
        var on = h('input', { type: 'checkbox', 'aria-label': 'Учитывать: ' + r.name }); on.checked = r.on;
        var sel = h('input', { type: 'text', value: r.sel, size: '12', 'aria-label': 'Селектор: ' + r.name, spellcheck: 'false' });
        if (r.inline) { sel.disabled = true; sel.value = 'style=""'; }
        var val = h('input', { type: 'text', value: r.val, size: '8', 'aria-label': 'Значение color: ' + r.name, spellcheck: 'false' });
        var origin = select([['ua', 'Браузер (UA)'], ['user', 'Пользователь'], ['author', 'Автор']], r.origin); origin.setAttribute('aria-label', 'Источник: ' + r.name);
        var layer = select([['', 'вне слоя']].concat(LAYERS.map(function (l) { return [l, l]; })), r.layer); layer.setAttribute('aria-label', 'Слой: ' + r.name);
        var imp = h('input', { type: 'checkbox', 'aria-label': '!important: ' + r.name });
        [on, sel, val, origin, layer, imp].forEach(function (c) { tr.appendChild(add(h('td'), c)); });
        tbody.appendChild(tr);
        ctrl.push({ on: on, sel: sel, val: val, origin: origin, layer: layer, imp: imp, row: r });
      });
      var table = h('table');
      var hr = h('tr'); ['В игре', 'Селектор', 'color', 'Источник', 'Слой', '!important'].forEach(function (x) { hr.appendChild(h('th', { scope: 'col' }, x)); });
      add(table, add(h('thead'), hr), tbody);
      var wrap = h('div', { 'class': 'table-wrap demo-scroll' }); wrap.appendChild(table);
      var out = h('div', { role: 'status', 'class': 'demo-readout' });
      var sample = h('p', { 'class': 'demo-spec-total' }, 'Образец текста: цвет выбирает каскад');

      function compute() {
        var ds = ctrl.filter(function (c) { return c.on.checked; }).map(function (c, k) {
          var d = { sel: c.sel.value, val: c.val.value, origin: c.origin.value, layer: c.origin.value === 'author' ? c.layer.value : '', imp: c.imp.checked, inline: c.row.inline, name: c.row.name };
          d.rank = cascadeRank(d, ctrl.indexOf(c));
          return d;
        });
        ctrl.forEach(function (c) { c.layer.disabled = c.origin.value !== 'author'; });
        if (!ds.length) { out.textContent = 'Объявлений нет: значение будет унаследовано или станет начальным.'; sample.style.color = ''; return; }
        ds.sort(function (a, b) { return cmp(b.rank, a.rank); });
        var win = ds[0];
        sample.style.color = '';
        sample.style.color = win.val;
        var text = 'Победило: color: ' + win.val + ' — ' + win.name;
        if (ds.length > 1) {
          var k = 0; while (k < win.rank.length && win.rank[k] === ds[1].rank[k]) k++;
          text += '\nМежду первым и вторым местом решил шаг: «' + CASCADE_STEPS[Math.min(k, CASCADE_STEPS.length - 1)] + '».';
        } else text += '\nЕдинственное объявление: конкурентов нет.';
        text += '\n\nПорядок (сильное → слабое):\n' + ds.map(function (d, n) { return (n + 1) + '. ' + d.val + ' (' + d.name + ')' + (d.imp ? ' !important' : ''); }).join('\n');
        out.textContent = text;
      }
      ctx.on(tbody, 'input', compute);
      ctx.on(tbody, 'change', compute);
      add(ctx.live, h('p', { 'class': 'demo-hint' }, 'Порядок слоёв: @layer reset, base, components, utilities (раньше = слабее для обычных объявлений).'), wrap, sample, out);
      compute();
    }
  });
  // ==========================================================================
  // 9. Box model: ползунки margin / border / padding, живой размер
  // ==========================================================================
  function valueLabel(text, input, unit) {
    var l = h('label', { 'class': 'demo-field' });
    var s = h('span', { 'class': 'demo-val' });
    l.appendChild(document.createTextNode(text + ' '));
    l.appendChild(s);
    l.appendChild(input);
    function sync() { s.textContent = input.value + (unit || ''); }
    input.addEventListener('input', sync);     // слушатель на элементе, который живёт и умирает вместе с примером
    sync();
    return l;
  }

  register('css-box', {
    title: 'Box model: размеры считаются на ваших глазах',
    mode: 'host',
    note: 'Двигайте ползунки и переключайте box-sizing: цифры берутся из настоящего элемента. Синий — содержимое, жёлтый — padding, оранжевый — border, розовое кольцо — margin.',
    code:
      ".box {\n  width: 160px;\n  padding: 16px;\n  border: 6px solid;\n  margin: 16px;\n  box-sizing: content-box;   /* или border-box */\n}\n" +
      "/* content-box: занимает 160 + 2×16 + 2×6 = 204 px\n   border-box:  занимает ровно 160 px, содержимое уменьшается */",
    init: function (ctx) {
      var W = range(80, 300, 160), P = range(0, 40, 16), B = range(0, 20, 6), M = range(0, 40, 16);
      var bs = select(['content-box', 'border-box'], 'content-box');
      bs.setAttribute('aria-label', 'box-sizing');
      var controls = h('div');
      add(controls, valueLabel('width', W, 'px'), valueLabel('padding', P, 'px'), valueLabel('border', B, 'px'), valueLabel('margin', M, 'px'), labelled('box-sizing', bs));
      var el = h('div', { 'class': 'bm-el' }, 'content');
      var stage = h('div', { 'class': 'bm-stage', tabindex: '0', role: 'region', 'aria-label': 'Образец блока' });
      stage.appendChild(el);
      var legend = h('p', { 'class': 'demo-hint' });
      [['#93c5fd', 'content'], ['#fde68a', 'padding'], ['#d97706', 'border'], ['rgba(244,114,182,.5)', 'margin']].forEach(function (k) {
        var key = h('span', { 'class': 'demo-key' }); key.style.background = k[0];
        legend.appendChild(key); legend.appendChild(document.createTextNode(k[1]));
      });
      var out = h('div', { role: 'status', 'class': 'demo-readout' });
      function update() {
        var w = +W.value, p = +P.value, b = +B.value, m = +M.value;
        el.style.width = w + 'px'; el.style.padding = p + 'px'; el.style.borderWidth = b + 'px';
        el.style.margin = m + 'px'; el.style.boxSizing = bs.value;
        el.style.boxShadow = '0 0 0 ' + m + 'px rgba(244,114,182,.35)';
        var r = el.getBoundingClientRect(), content = Math.round((el.clientWidth - 2 * p) * 10) / 10;
        var cs = getComputedStyle(el);
        out.textContent =
          'width: ' + w + 'px; padding: ' + p + 'px; border: ' + b + 'px; margin: ' + m + 'px; box-sizing: ' + bs.value + ';\n' +
          'Ширина содержимого: ' + content + ' px\n' +
          'Ширина рамки (border-box): ' + Math.round(r.width * 10) / 10 + ' px = содержимое + 2×padding + 2×border\n' +
          'С margin по горизонтали: ' + Math.round((r.width + 2 * m) * 10) / 10 + ' px\n' +
          'getComputedStyle(el).width = ' + cs.width + (bs.value === 'content-box' ? ' (это ширина содержимого)' : ' (это ширина вместе с padding и border)');
      }
      ctx.on(controls, 'input', update);
      ctx.on(controls, 'change', update);
      add(ctx.live, controls, legend, stage, out);
      update();
    }
  });

  // ==========================================================================
  // 12. Flexbox: песочница со всеми свойствами контейнера и счётчиком элементов
  // ==========================================================================
  register('css-flex', {
    title: 'Flexbox: свойства контейнера и элементов',
    mode: 'host',
    note: 'Меняйте свойства контейнера, число элементов и параметры выбранного элемента. Внизу — сгенерированный CSS. У элементов разный padding, чтобы были видны align-items и align-self.',
    code:
      ".container {\n  display: flex;\n  flex-direction: row;\n  flex-wrap: nowrap;\n  justify-content: flex-start;\n  align-items: stretch;\n  align-content: stretch;\n  gap: 8px;\n}\n" +
      ".item { flex: 0 1 auto; order: 0; align-self: auto; }",
    init: function (ctx) {
      var MAX = 12;
      var dir = select(['row', 'row-reverse', 'column', 'column-reverse']);
      var wrap = select(['nowrap', 'wrap', 'wrap-reverse']);
      var jc = select(['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']);
      var ai = select(['stretch', 'flex-start', 'center', 'flex-end', 'baseline']);
      var ac = select(['stretch', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around']);
      var gap = range(0, 30, 8), count = range(1, MAX, 5);
      var panel = h('div');
      add(panel, labelled('flex-direction', dir), labelled('flex-wrap', wrap), labelled('justify-content', jc),
        labelled('align-items', ai), labelled('align-content', ac), valueLabel('gap', gap, 'px'), valueLabel('Элементов', count, ''));
      var pad = [6, 18, 10, 26];
      var items = [], state = [];
      var box = h('div', { 'class': 'fx-box', role: 'group', 'aria-label': 'Flex-контейнер' });
      for (var i = 0; i < MAX; i++) {
        var it = h('div', { 'class': 'fx-item' }, String(i + 1));
        it.style.paddingTop = it.style.paddingBottom = pad[i % 4] + 'px';
        items.push(it);
        state.push({ grow: 0, shrink: 1, basis: 'auto', order: 0, self: 'auto' });
      }
      // Выбранный элемент
      var cur = 0;
      var pick = select(['1']); pick.setAttribute('aria-label', 'Элемент для настройки');
      var grow = range(0, 5, 0), shrink = range(0, 5, 1), order = range(-2, 5, 0);
      var basis = select(['auto', '0', '60px', '120px', '30%']);
      var self = select(['auto', 'flex-start', 'center', 'flex-end', 'stretch']);
      var ipanel = h('fieldset');
      ipanel.appendChild(h('legend', null, 'Выбранный элемент'));
      add(ipanel, labelled('Элемент №', pick), valueLabel('flex-grow', grow, ''), valueLabel('flex-shrink', shrink, ''), labelled('flex-basis', basis), valueLabel('order', order, ''), labelled('align-self', self));
      var out = h('div', { 'class': 'demo-readout', role: 'status' });
      var counter = h('p', { 'class': 'demo-hint', role: 'status' });

      function refillPick(n) {
        ctx.clear(pick);
        for (var k = 1; k <= n; k++) pick.appendChild(h('option', { value: String(k - 1) }, String(k)));
        if (cur >= n) cur = n - 1;
        pick.value = String(cur);
      }
      function loadItem() {
        var s = state[cur];
        grow.value = s.grow; shrink.value = s.shrink; basis.value = s.basis; order.value = s.order; self.value = s.self;
        [grow, shrink, order].forEach(function (r) { r.dispatchEvent(new Event('input')); });
      }
      function apply() {
        var n = +count.value;
        box.style.flexDirection = dir.value; box.style.flexWrap = wrap.value; box.style.justifyContent = jc.value;
        box.style.alignItems = ai.value; box.style.alignContent = ac.value; box.style.gap = gap.value + 'px';
        ctx.clear(box);
        for (var i = 0; i < n; i++) {
          var s = state[i], it = items[i];
          it.style.flex = s.grow + ' ' + s.shrink + ' ' + s.basis; it.style.order = s.order; it.style.alignSelf = s.self;
          if (i === cur) it.setAttribute('data-sel', '1'); else it.removeAttribute('data-sel');
          box.appendChild(it);
        }
        var css = '.container {\n  display: flex;\n  flex-direction: ' + dir.value + ';\n  flex-wrap: ' + wrap.value + ';\n  justify-content: ' + jc.value + ';\n  align-items: ' + ai.value + ';\n  align-content: ' + ac.value + ';\n  gap: ' + gap.value + 'px;\n}';
        for (var j = 0; j < n; j++) {
          var t = state[j];
          if (t.grow !== 0 || t.shrink !== 1 || t.basis !== 'auto' || t.order !== 0 || t.self !== 'auto')
            css += '\n.item:nth-child(' + (j + 1) + ') { flex: ' + t.grow + ' ' + t.shrink + ' ' + t.basis + '; order: ' + t.order + '; align-self: ' + t.self + '; }';
        }
        out.textContent = css;
        counter.textContent = 'Элементов в контейнере: ' + n + '. Выбран элемент ' + (cur + 1) + ' (оранжевая рамка).';
      }
      ctx.on(panel, 'input', function (e) { if (e.target === count) refillPick(+count.value); apply(); });
      ctx.on(panel, 'change', function (e) { if (e.target === count) refillPick(+count.value); apply(); });
      ctx.on(ipanel, 'input', function (e) {
        if (e.target === pick) { cur = +pick.value; loadItem(); apply(); return; }
        var s = state[cur];
        s.grow = +grow.value; s.shrink = +shrink.value; s.basis = basis.value; s.order = +order.value; s.self = self.value;
        apply();
      });
      ctx.on(ipanel, 'change', function (e) {
        if (e.target === pick) { cur = +pick.value; loadItem(); apply(); return; }
        var s = state[cur];
        s.grow = +grow.value; s.shrink = +shrink.value; s.basis = basis.value; s.order = +order.value; s.self = self.value;
        apply();
      });
      add(ctx.live, panel, counter, box, ipanel, out);
      refillPick(+count.value);
      apply();
    }
  });

  // ==========================================================================
  // 13. Grid: дорожки, области, поток; auto-fit против auto-fill; subgrid
  // ==========================================================================
  register('css-grid', {
    title: 'Grid: дорожки, зазоры, выравнивание, области',
    mode: 'host',
    note: 'Впишите своё значение grid-template-columns или нажмите готовый пример. Включите «Именованные области», чтобы увидеть раскладку страницы по grid-template-areas.',
    code:
      ".grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 8px;\n  justify-items: stretch;\n  align-items: stretch;\n  grid-auto-flow: row;\n}\n" +
      ".grid-areas {\n  grid-template-areas:\n    \"header header\"\n    \"sidebar main\"\n    \"footer footer\";\n}",
    init: function (ctx) {
      var cols = h('input', { type: 'text', value: 'repeat(3, 1fr)', size: '30', 'aria-label': 'grid-template-columns', spellcheck: 'false' });
      var rows = h('input', { type: 'text', value: '', size: '16', 'aria-label': 'grid-template-rows', spellcheck: 'false', placeholder: 'например auto 80px' });
      var presets = chips(['repeat(3, 1fr)', '1fr 2fr', 'repeat(4, 80px)', '200px 1fr', 'repeat(auto-fill, minmax(90px, 1fr))']);
      var gap = range(0, 30, 8), count = range(1, 12, 7);
      var ji = select(['stretch', 'start', 'center', 'end']), ai = select(['stretch', 'start', 'center', 'end']);
      var flow = select(['row', 'column', 'row dense', 'column dense']);
      var span = h('input', { type: 'checkbox' }), areas = h('input', { type: 'checkbox' });
      var sl = h('label'); add(sl, span, document.createTextNode(' Элемент 1 занимает 2 столбца'));
      var al = h('label'); add(al, areas, document.createTextNode(' Именованные области (шапка, меню, содержимое, подвал)'));
      var panel = h('div');
      add(panel, labelled('grid-template-columns', cols), labelled('grid-template-rows', rows), presets, valueLabel('gap', gap, 'px'), valueLabel('Элементов', count, ''),
        labelled('justify-items', ji), labelled('align-items', ai), labelled('grid-auto-flow', flow), sl, document.createElement('br'), al);
      var box = h('div', { 'class': 'gr-box', role: 'group', 'aria-label': 'Grid-контейнер' });
      var msg = h('p', { role: 'status', 'class': 'demo-hint' });
      var out = h('div', { 'class': 'demo-readout' });
      var AREAS = ['header', 'sidebar', 'main', 'footer'];
      function apply() {
        var useAreas = areas.checked;
        var c = cols.value.trim(), r = rows.value.trim(), bad = [];
        if (!useAreas) {
          if (c && !CSS.supports('grid-template-columns', c)) bad.push('grid-template-columns: «' + c + '»');
          if (r && !CSS.supports('grid-template-rows', r)) bad.push('grid-template-rows: «' + r + '»');
        }
        msg.textContent = bad.length ? 'Недопустимое значение (' + bad.join(', ') + '): браузер его игнорирует, и раскладка остаётся прежней.' : '';
        box.style.gap = gap.value + 'px'; box.style.justifyItems = ji.value; box.style.alignItems = ai.value; box.style.gridAutoFlow = flow.value;
        var css;
        if (useAreas) {
          box.style.gridTemplateColumns = '120px 1fr'; box.style.gridTemplateRows = 'auto 1fr auto';
          box.style.gridTemplateAreas = '"header header" "sidebar main" "footer footer"';
          css = 'grid-template-columns: 120px 1fr;\ngrid-template-rows: auto 1fr auto;\ngrid-template-areas:\n  "header header"\n  "sidebar main"\n  "footer footer";';
        } else {
          box.style.gridTemplateAreas = '';
          if (c && !bad.some(function (x) { return x.indexOf('columns') > -1; })) box.style.gridTemplateColumns = c; else if (!c) box.style.gridTemplateColumns = '';
          if (r && !bad.some(function (x) { return x.indexOf('rows') > -1; })) box.style.gridTemplateRows = r; else if (!r) box.style.gridTemplateRows = '';
          css = 'grid-template-columns: ' + (c || 'none') + ';\ngrid-template-rows: ' + (r || 'none') + ';';
        }
        ctx.clear(box);
        var n = useAreas ? 4 : +count.value;
        for (var i = 0; i < n; i++) {
          var it = h('div', { 'class': 'gr-item' }, useAreas ? AREAS[i] : String(i + 1));
          if (useAreas) { it.setAttribute('data-area', AREAS[i]); it.style.gridArea = AREAS[i]; }
          else if (i === 0 && span.checked) it.style.gridColumn = 'span 2';
          box.appendChild(it);
        }
        out.textContent = '.grid {\n  display: grid;\n  ' + css.split('\n').join('\n  ') + '\n  gap: ' + gap.value + 'px;\n  justify-items: ' + ji.value + ';\n  align-items: ' + ai.value + ';\n  grid-auto-flow: ' + flow.value + ';\n}\nЭлементов: ' + n;
      }
      ctx.on(panel, 'input', apply);
      ctx.on(panel, 'change', apply);
      ctx.on(presets, 'click', function (e) { var v = e.target.getAttribute && e.target.getAttribute('data-v'); if (v) { cols.value = v; areas.checked = false; apply(); } });
      add(ctx.live, panel, msg, box, out);
      apply();
    }
  });

  register('css-grid-auto', {
    title: 'auto-fit против auto-fill',
    mode: 'host',
    note: 'Три элемента, разные режимы. Меняйте ширину контейнера: когда места больше, чем нужно для трёх дорожек, auto-fit растягивает элементы на свободное место, а auto-fill сохраняет пустые дорожки.',
    code:
      "grid-template-columns: repeat(auto-fit,  minmax(90px, 1fr));  /* пустые дорожки схлопываются */\n" +
      "grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));  /* пустые дорожки остаются */",
    init: function (ctx) {
      var w = range(120, 640, 520);
      var wrap = h('div', { 'class': 'gr-wrap' });
      function make(kind) {
        var box = h('div', { 'class': 'gr-box', role: 'group', 'aria-label': 'Режим ' + kind });
        box.style.gridTemplateColumns = 'repeat(' + kind + ', minmax(90px, 1fr))'; box.style.gap = '8px'; box.style.minHeight = '60px';
        for (var i = 1; i <= 3; i++) box.appendChild(h('div', { 'class': 'gr-item' }, String(i)));
        var info = h('p', { 'class': 'demo-readout', role: 'status' });
        return { box: box, info: info, kind: kind };
      }
      var a = make('auto-fit'), b = make('auto-fill');
      function update() {
        wrap.style.width = w.value + 'px';
        [a, b].forEach(function (g) {
          var tracks = getComputedStyle(g.box).gridTemplateColumns.split(/\s+/).filter(function (x) { return x && x !== 'none'; }).length;
          g.info.textContent = 'repeat(' + g.kind + ', minmax(90px, 1fr)) — дорожек сейчас: ' + tracks;
        });
      }
      ctx.on(w, 'input', update);
      add(wrap, a.box, a.info, b.box, b.info);
      add(ctx.live, valueLabel('Ширина контейнера', w, 'px'), wrap);
      update();
    }
  });

  register('css-grid-subgrid', {
    title: 'subgrid: части карточек выровнены по строкам',
    mode: 'host',
    needs: { support: ['css:subgrid'] },
    badges: ['css:subgrid'],
    note: 'Три карточки с текстом разной длины. С subgrid заголовки, тексты и «кнопки» выстраиваются по общим строкам родительской сетки, без него каждая карточка считает высоты сама.',
    code:
      ".parent { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }\n" +
      ".card {\n  grid-row: span 3;\n  display: grid;\n  grid-template-rows: subgrid;   /* берём строки у родителя */\n}",
    init: function (ctx) {
      var parent = h('div', { 'class': 'sg-parent' });
      var data = [['Коротко', 'Короткий текст.'], ['Заголовок подлиннее, чтобы занять две строки', 'Средний по длине текст описания карточки, который занимает несколько строк.'], ['Ещё карточка', 'Текст.']];
      data.forEach(function (d) {
        var c = h('div', { 'class': 'sg-card' });
        add(c, h('h5', null, d[0]), h('p', null, d[1]), h('span', null, 'Подробнее'));
        parent.appendChild(c);
      });
      var cb = h('input', { type: 'checkbox' }); cb.checked = true;
      var l = h('label'); add(l, cb, document.createTextNode(' Включить subgrid'));
      ctx.on(cb, 'change', function () { parent.classList.toggle('sg-off', !cb.checked); ctx.say(cb.checked ? 'subgrid включён' : 'subgrid выключен'); });
      add(ctx.live, l, parent);
    }
  });

  // ==========================================================================
  // 17.3 Адаптивность: container queries против media queries
  // ==========================================================================
  register('css-container', {
    title: 'Container queries: компонент реагирует на контейнер',
    mode: 'host',
    needs: { support: ['css:container'] },
    badges: ['css:container'],
    note: 'Двигайте ползунок ширины контейнера. Карточка внутри переключается на две колонки при ширине контейнера от 420 px. Нижняя карточка стоит вне контейнера и зависит только от ширины окна (от 1000 px).',
    code:
      ".wrap { container-type: inline-size; }\n" +
      ".card { display: grid; grid-template-columns: 1fr; }\n" +
      "@container (min-width: 420px) {\n  .card { grid-template-columns: 96px 1fr; }\n}\n" +
      "@media (min-width: 1000px) {            /* зависит от окна */\n  .card-mq { grid-template-columns: 96px 1fr; }\n}",
    init: function (ctx) {
      var w = range(160, 640, 360);
      var wrap = h('div', { 'class': 'cq-wrap' });
      var card = h('div', { 'class': 'cq-card' });
      add(card, h('div', { 'class': 'cq-img', 'aria-hidden': 'true' }), add(h('div'), h('h5', null, 'Карточка в контейнере'), h('p', null, 'Раскладка зависит от ширины контейнера.')));
      wrap.appendChild(card);
      var mq = h('div', { 'class': 'cq-card cq-card-mq' });
      add(mq, h('div', { 'class': 'cq-img', 'aria-hidden': 'true' }), add(h('div'), h('h5', null, 'Карточка вне контейнера (media query)'), h('p', null, 'Раскладка зависит только от ширины окна.')));
      var out = h('p', { 'class': 'demo-readout', role: 'status' });
      function update() {
        wrap.style.width = w.value + 'px';
        var cw = wrap.clientWidth;
        out.textContent = 'Ширина контейнера: ' + cw + ' px (порог 420 px: ' + (cw - 16 >= 420 ? 'две колонки' : 'одна колонка') + ')\nШирина окна: ' + innerWidth + ' px (порог 1000 px: ' + (innerWidth >= 1000 ? 'две колонки' : 'одна колонка') + ')';
      }
      ctx.on(w, 'input', update);
      if (typeof ResizeObserver !== 'undefined') ctx.observe(new ResizeObserver(update)).observe(wrap);
      ctx.on(window, 'resize', update);
      add(ctx.live, valueLabel('Ширина контейнера', w, 'px'), wrap, mq, out);
      update();
    }
  });

  // ==========================================================================
  // 7.3 Переменные: редактор токенов перекрашивает компонент
  // ==========================================================================
  register('css-variables', {
    title: 'Пользовательские свойства: редактор токенов',
    mode: 'host',
    note: 'Меняйте токены на контейнере: компонент перерисовывается сам, потому что везде использует var(). Вложенный блок может переопределить токен локально, а неверное значение показывает «тихую» ошибку.',
    code:
      ".comp {\n  --tok-primary: #3157c8;\n  --tok-radius: 12px;\n  --tok-space: 12px;\n}\n" +
      ".card { padding: var(--tok-space); border-radius: var(--tok-radius); border-color: var(--tok-primary); }\n" +
      "el.style.setProperty('--tok-primary', '#a12626');   // из JavaScript",
    init: function (ctx) {
      var comp = h('div', { 'class': 'tok-comp' });
      var card = h('div', { 'class': 'tok-card' });
      var btn = h('button', { type: 'button', 'class': 'tok-btn' }, 'Кнопка');
      var inner = h('div', { 'class': 'tok-card' });
      inner.style.marginTop = '10px';
      add(inner, h('h5', null, 'Вложенный блок'), h('p', { style: 'margin:0' }, 'Наследует токены контейнера.'));
      add(card, h('h5', null, 'Карточка'), h('p', { style: 'margin:0' }, 'Цвета, радиус и отступ идут из переменных.'), btn, inner);
      var bar = h('div', { 'class': 'tok-bar', 'aria-hidden': 'true' });
      add(comp, card, bar);
      var primary = h('input', { type: 'color', value: '#3157c8' }), bg = h('input', { type: 'color', value: '#ffffff' }), text = h('input', { type: 'color', value: '#172033' });
      var rad = range(0, 40, 12), sp = range(4, 40, 12);
      var ovr = h('input', { type: 'checkbox' }), bad = h('input', { type: 'checkbox' });
      var ol = h('label'); add(ol, ovr, document.createTextNode(' Вложенный блок переопределяет --tok-primary'));
      var bl = h('label'); add(bl, bad, document.createTextNode(' Положить цвет в --tok-bad, а он используется как width'));
      var panel = h('div');
      add(panel, labelled('--tok-primary', primary), labelled('--tok-bg', bg), labelled('--tok-text', text), valueLabel('--tok-radius', rad, 'px'), valueLabel('--tok-space', sp, 'px'), ol, document.createElement('br'), bl);
      var out = h('div', { 'class': 'demo-readout', role: 'status' });
      function update() {
        comp.style.setProperty('--tok-primary', primary.value); comp.style.setProperty('--tok-bg', bg.value); comp.style.setProperty('--tok-text', text.value);
        comp.style.setProperty('--tok-radius', rad.value + 'px'); comp.style.setProperty('--tok-space', sp.value + 'px');
        if (ovr.checked) inner.style.setProperty('--tok-primary', '#a12626'); else inner.style.removeProperty('--tok-primary');
        if (bad.checked) comp.style.setProperty('--tok-bad', 'red'); else comp.style.removeProperty('--tok-bad');
        out.textContent = '.comp {\n  --tok-primary: ' + primary.value + ';\n  --tok-bg: ' + bg.value + ';\n  --tok-text: ' + text.value + ';\n  --tok-radius: ' + rad.value + 'px;\n  --tok-space: ' + sp.value + 'px;\n}' +
          (ovr.checked ? '\n.inner { --tok-primary: #a12626; }   /* локальное переопределение */' : '') +
          (bad.checked ? '\n--tok-bad: red;  →  width: var(--tok-bad) недопустимо при вычислении: width ведёт себя как unset (auto), полоска растянулась на всю ширину' : '');
      }
      ctx.on(panel, 'input', update);
      ctx.on(panel, 'change', update);
      add(ctx.live, panel, comp, out);
      update();
    }
  });

  // ==========================================================================
  // 19.1 Трансформации: сборка transform по шагам
  // ==========================================================================
  var TF = {
    translateX: { unit: 'px', min: -120, max: 120, step: 1, def: 60 },
    translateY: { unit: 'px', min: -80, max: 80, step: 1, def: 30 },
    rotate: { unit: 'deg', min: -180, max: 180, step: 1, def: 30 },
    scale: { unit: '', min: 0.2, max: 2, step: 0.1, def: 1.3 },
    skewX: { unit: 'deg', min: -60, max: 60, step: 1, def: 20 }
  };
  register('css-transforms', {
    title: 'Transform по шагам: порядок важен',
    mode: 'host',
    note: 'Добавляйте шаги, меняйте их порядок кнопками ↑ ↓ или нажмите «Развернуть порядок». Пунктирный контур — место элемента без transform: раскладка не меняется.',
    code:
      ".el {\n  transform-origin: center;\n  transform: translateX(60px) rotate(30deg);   /* сдвиг, потом поворот */\n}\n" +
      "/* rotate(30deg) translateX(60px) даст другой результат */",
    init: function (ctx) {
      var steps = [{ type: 'translateX', val: 60 }, { type: 'rotate', val: 30 }];
      var el = h('div', { 'class': 'tf-el' }, 'Блок'), ghost = h('div', { 'class': 'tf-ghost', 'aria-hidden': 'true' });
      var stage = h('div', { 'class': 'tf-stage', role: 'img', 'aria-label': 'Образец преобразуемого блока' });
      add(stage, ghost, el);
      var type = select(Object.keys(TF)), val = range(TF.translateX.min, TF.translateX.max, TF.translateX.def, 1);
      var valOut = h('span', { 'class': 'demo-val' });
      var addBtn = h('button', { type: 'button' }, 'Добавить шаг'), rev = h('button', { type: 'button' }, 'Развернуть порядок'), clr = h('button', { type: 'button' }, 'Очистить');
      var origin = select(['center', 'top left', 'bottom right']);
      var list = h('ol', { 'class': 'tf-list' });
      var out = h('div', { 'class': 'demo-readout', role: 'status' });
      function fmt(s) { return s.type + '(' + s.val + TF[s.type].unit + ')'; }
      function syncVal() { var t = TF[type.value]; valOut.textContent = val.value + t.unit; }
      function render() {
        ctx.clear(list);
        steps.forEach(function (s, i) {
          var li = h('li');
          li.appendChild(document.createTextNode(fmt(s) + ' '));
          [['up', '↑', 'Поднять шаг ' + (i + 1)], ['down', '↓', 'Опустить шаг ' + (i + 1)], ['del', '×', 'Удалить шаг ' + (i + 1)]].forEach(function (b) {
            var bt = h('button', { type: 'button', 'data-act': b[0], 'data-i': String(i), 'aria-label': b[2] }, b[1]);
            li.appendChild(bt);
          });
          list.appendChild(li);
        });
        var css = steps.map(fmt).join(' ') || 'none';
        el.style.transformOrigin = origin.value;
        el.style.transform = css === 'none' ? '' : css;
        out.textContent = 'transform: ' + css + ';\ntransform-origin: ' + origin.value + ';\nИтоговая матрица (getComputedStyle): ' + getComputedStyle(el).transform;
      }
      ctx.on(type, 'change', function () { var t = TF[type.value]; val.min = t.min; val.max = t.max; val.step = t.step; val.value = t.def; syncVal(); });
      ctx.on(val, 'input', syncVal);
      ctx.on(addBtn, 'click', function () { if (steps.length >= 6) { ctx.say('Не больше шести шагов'); return; } steps.push({ type: type.value, val: +val.value }); render(); });
      ctx.on(rev, 'click', function () { steps.reverse(); render(); });
      ctx.on(clr, 'click', function () { steps = []; render(); });
      ctx.on(origin, 'change', render);
      ctx.on(list, 'click', function (e) {
        var act = e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        var i = +e.target.getAttribute('data-i');
        if (act === 'del') steps.splice(i, 1);
        else if (act === 'up' && i > 0) { var t1 = steps[i]; steps[i] = steps[i - 1]; steps[i - 1] = t1; }
        else if (act === 'down' && i < steps.length - 1) { var t2 = steps[i]; steps[i] = steps[i + 1]; steps[i + 1] = t2; }
        render();
      });
      var form = h('div');
      add(form, labelled('Шаг', type), labelled('Значение', add(h('span'), val, valOut)), addBtn, document.createTextNode(' '), rev, document.createTextNode(' '), clr, document.createElement('br'), labelled('transform-origin', origin));
      add(ctx.live, form, stage, list, out);
      syncVal(); render();
    }
  });

  // ==========================================================================
  // 19.2 Переходы: редактор cubic-bezier + прогон шариков
  // ==========================================================================
  register('css-transitions', {
    title: 'Редактор cubic-bezier: кривая и шарики',
    mode: 'host',
    note: 'Тяните оранжевые точки, меняйте числа или выберите готовую кривую. Шарики бегут по настоящему CSS-переходу transform; справа измеренное время до transitionend. Запуск только по кнопке.',
    code:
      ".ball {\n  transition: transform 1200ms cubic-bezier(0.25, 0.1, 0.25, 1);\n}\n" +
      "/* x1 и x2 — только от 0 до 1; y1 и y2 могут выходить за границы (эффект пружины) */",
    init: function (ctx) {
      var PRE = { 'ease': [0.25, 0.1, 0.25, 1], 'linear': [0, 0, 1, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] };
      var p = { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 };
      var NS = 'http://www.w3.org/2000/svg';
      function px(x) { return 30 + 180 * x; }
      function py(y) { return 200 - 120 * y; }
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 240 300'); svg.setAttribute('class', 'ts-editor'); svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', 'Редактор кривой cubic-bezier');
      function S(tag, a) { var n = document.createElementNS(NS, tag); Object.keys(a).forEach(function (k) { n.setAttribute(k, a[k]); }); return n; }
      var frame = S('rect', { x: 30, y: 80, width: 180, height: 120, fill: 'none', stroke: '#cbd5ee', 'stroke-dasharray': '4 3' });
      var diag = S('line', { x1: 30, y1: 200, x2: 210, y2: 80, stroke: '#e5e7eb' });
      var l1 = S('line', { stroke: '#94a3b8' }), l2 = S('line', { stroke: '#94a3b8' });
      var curve = S('path', { fill: 'none', stroke: '#3157c8', 'stroke-width': 3 });
      var c1 = S('circle', { r: 9, fill: '#d97706', tabindex: 0, role: 'slider', 'aria-label': 'Первая контрольная точка', 'aria-valuemin': 0, 'aria-valuemax': 1 });
      var c2 = S('circle', { r: 9, fill: '#d97706', tabindex: 0, role: 'slider', 'aria-label': 'Вторая контрольная точка', 'aria-valuemin': 0, 'aria-valuemax': 1 });
      [frame, diag, l1, l2, curve, c1, c2].forEach(function (n) { svg.appendChild(n); });
      var nums = {};
      var numRow = h('div');
      ['x1', 'y1', 'x2', 'y2'].forEach(function (k) {
        nums[k] = h('input', { type: 'number', step: '0.01', value: String(p[k]), 'aria-label': k, style: 'width:76px' });
        numRow.appendChild(labelled(k, nums[k]));
      });
      var presetRow = chips(Object.keys(PRE));
      var dur = range(200, 3000, 1200, 100);
      var runBtn = h('button', { type: 'button' }, 'Запустить');
      var str = h('p', { 'class': 'demo-readout', role: 'status' });
      var lanes = h('div');
      var L = [];
      Object.keys(PRE).concat(['свой']).forEach(function (name) {
        var lane = h('div', { 'class': 'ts-lane' });
        var track = h('div', { 'class': 'ts-track', 'aria-hidden': 'true' }), ball = h('div', { 'class': 'ts-ball' });
        track.appendChild(ball);
        var time = h('span', { 'class': 'ts-time' }, '—');
        add(lane, h('span', { 'class': 'ts-name' }, name), track, time);
        lanes.appendChild(lane);
        L.push({ name: name, track: track, ball: ball, time: time, t0: 0, fn: name === 'свой' ? '' : name });
      });
      var custom = L[L.length - 1];
      function bez() { return 'cubic-bezier(' + p.x1 + ', ' + p.y1 + ', ' + p.x2 + ', ' + p.y2 + ')'; }
      function draw() {
        var a = [px(p.x1), py(p.y1)], b = [px(p.x2), py(p.y2)];
        l1.setAttribute('x1', 30); l1.setAttribute('y1', 200); l1.setAttribute('x2', a[0]); l1.setAttribute('y2', a[1]);
        l2.setAttribute('x1', 210); l2.setAttribute('y1', 80); l2.setAttribute('x2', b[0]); l2.setAttribute('y2', b[1]);
        curve.setAttribute('d', 'M30 200 C ' + a[0] + ' ' + a[1] + ', ' + b[0] + ' ' + b[1] + ', 210 80');
        c1.setAttribute('cx', a[0]); c1.setAttribute('cy', a[1]); c2.setAttribute('cx', b[0]); c2.setAttribute('cy', b[1]);
        c1.setAttribute('aria-valuenow', p.x1); c1.setAttribute('aria-valuetext', 'x ' + p.x1 + ', y ' + p.y1);
        c2.setAttribute('aria-valuenow', p.x2); c2.setAttribute('aria-valuetext', 'x ' + p.x2 + ', y ' + p.y2);
        Object.keys(nums).forEach(function (k) { if (document.activeElement !== nums[k]) nums[k].value = String(p[k]); });
        custom.fn = bez();
        str.textContent = 'transition-timing-function: ' + bez() + ';';
      }
      function setP(x1, y1, x2, y2) {
        p.x1 = Math.round(clamp(x1, 0, 1) * 100) / 100; p.x2 = Math.round(clamp(x2, 0, 1) * 100) / 100;
        p.y1 = Math.round(clamp(y1, -0.5, 1.5) * 100) / 100; p.y2 = Math.round(clamp(y2, -0.5, 1.5) * 100) / 100;
        draw();
      }
      ctx.on(numRow, 'input', function () {
        var v = function (k) { var n = parseFloat(nums[k].value); return isNaN(n) ? p[k] : n; };
        setP(v('x1'), v('y1'), v('x2'), v('y2'));
      });
      ctx.on(presetRow, 'click', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-v'); if (k && PRE[k]) { setP(PRE[k][0], PRE[k][1], PRE[k][2], PRE[k][3]); } });
      // Перетаскивание точек: pointer events с захватом указателя
      var dragging = null;
      function toLocal(e) { var r = svg.getBoundingClientRect(), k = 240 / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; }
      [c1, c2].forEach(function (c, idx) {
        ctx.on(c, 'pointerdown', function (e) { dragging = idx; c.setPointerCapture(e.pointerId); e.preventDefault(); });
        ctx.on(c, 'pointermove', function (e) {
          if (dragging !== idx) return;
          var q = toLocal(e), x = (q[0] - 30) / 180, y = (200 - q[1]) / 120;
          if (idx === 0) setP(x, y, p.x2, p.y2); else setP(p.x1, p.y1, x, y);
        });
        ctx.on(c, 'pointerup', function () { dragging = null; });
        ctx.on(c, 'pointercancel', function () { dragging = null; });
        ctx.on(c, 'keydown', function (e) {
          var s = e.shiftKey ? 0.1 : 0.02, dx = 0, dy = 0;
          if (e.key === 'ArrowLeft') dx = -s; else if (e.key === 'ArrowRight') dx = s; else if (e.key === 'ArrowUp') dy = s; else if (e.key === 'ArrowDown') dy = -s; else return;
          e.preventDefault();
          if (idx === 0) setP(p.x1 + dx, p.y1 + dy, p.x2, p.y2); else setP(p.x1, p.y1, p.x2 + dx, p.y2 + dy);
        });
      });
      function run() {
        var d = +dur.value, reduce = ctx.reducedMotion;
        L.forEach(function (l) {
          var dist = l.track.clientWidth - l.ball.offsetWidth - 6;
          l.ball.style.transition = 'none'; l.ball.style.transform = 'translateX(0)';
          void l.ball.offsetWidth;                                   // сбрасываем состояние перед новым запуском
          if (reduce) { l.ball.style.transform = 'translateX(' + dist + 'px)'; l.time.textContent = 'мгновенно'; return; }
          l.ball.style.transition = 'transform ' + d + 'ms ' + l.fn;
          l.ball.style.transform = 'translateX(' + dist + 'px)';
          l.t0 = performance.now(); l.time.textContent = 'идёт…';
        });
        if (reduce) ctx.say('Включено уменьшение движения: шарики переходят мгновенно');
      }
      ctx.on(runBtn, 'click', run);
      ctx.on(lanes, 'transitionend', function (e) {
        for (var i = 0; i < L.length; i++) if (L[i].ball === e.target && e.propertyName === 'transform') L[i].time.textContent = Math.round(performance.now() - L[i].t0) + ' мс';
      });
      var left = h('div');
      add(left, svg);
      var right = h('div');
      add(right, numRow, presetRow, valueLabel('Длительность', dur, ' мс'), runBtn, str, lanes);
      var cols = h('div', { 'class': 'a11y-cols' });
      add(cols, left, right);
      add(ctx.live, cols);
      draw();
    }
  });

  // ==========================================================================
  // 19.3 Анимации: playState, direction, fill-mode, iteration-count
  // ==========================================================================
  register('css-animations', {
    title: 'animation: управление состоянием, направлением и заполнением',
    mode: 'host',
    note: 'Анимация стартует только по кнопке «Запустить». Менять параметры можно до запуска, перезапуск применяет их заново. «Пауза» меняет animation-play-state.',
    code:
      "@keyframes demo-slide { from { transform: translateX(0); } to { transform: translateX(160px); } }\n\n" +
      ".box {\n  animation-name: demo-slide;\n  animation-duration: 1200ms;\n  animation-timing-function: ease-in-out;\n  animation-delay: 0ms;\n  animation-iteration-count: 2;\n  animation-direction: alternate;\n  animation-fill-mode: both;\n  animation-play-state: running;  /* или paused */\n}",
    init: function (ctx) {
      var track = h('div', { 'class': 'an-track', role: 'img', 'aria-label': 'Дорожка с анимируемым блоком' }), box = h('div', { 'class': 'an-box' });
      track.appendChild(box);
      var dir = select(['normal', 'reverse', 'alternate', 'alternate-reverse']), fill = select(['none', 'forwards', 'backwards', 'both']);
      var iter = select(['1', '2', '3', 'infinite']), timing = select(['linear', 'ease', 'ease-in-out', 'steps(5)']);
      var dur = range(400, 3000, 1200, 100), delay = range(-1000, 2000, 0, 100);
      var go = h('button', { type: 'button' }, 'Запустить'), pause = h('button', { type: 'button' }, 'Пауза');
      var state = h('p', { 'class': 'demo-readout', role: 'status' });
      var log = h('div', { 'class': 'demo-readout', role: 'log', 'aria-label': 'События анимации' });
      var lines = [];
      function addLog(t) { lines.push(t); if (lines.length > 8) lines.shift(); log.textContent = lines.join('\n'); }
      function status() { state.textContent = 'animation-play-state: ' + getComputedStyle(box).animationPlayState + ' · animation-name: ' + (box.style.animationName || 'none'); }
      ctx.on(go, 'click', function () {
        box.style.animationName = 'none'; void box.offsetWidth;            // сброс: без него то же имя не перезапустится
        box.style.setProperty('--an-dist', Math.max(0, track.clientWidth - 52) + 'px');
        box.style.animationName = 'demo-slide'; box.style.animationDuration = dur.value + 'ms'; box.style.animationTimingFunction = timing.value;
        box.style.animationDelay = delay.value + 'ms'; box.style.animationDirection = dir.value; box.style.animationFillMode = fill.value;
        box.style.animationIterationCount = iter.value; box.style.animationPlayState = 'running';
        pause.textContent = 'Пауза'; lines = []; addLog('запуск'); status();
      });
      ctx.on(pause, 'click', function () {
        var run = getComputedStyle(box).animationPlayState === 'running';
        box.style.animationPlayState = run ? 'paused' : 'running'; pause.textContent = run ? 'Продолжить' : 'Пауза'; status();
      });
      ['animationstart', 'animationiteration', 'animationend'].forEach(function (n) {
        ctx.on(box, n, function (e) { addLog(n + ' (elapsed ' + e.elapsedTime.toFixed(2) + ' с)'); status(); });
      });
      ctx.onCleanup(function () { box.style.animationName = 'none'; });
      var panel = h('div');
      add(panel, labelled('animation-direction', dir), labelled('animation-fill-mode', fill), labelled('iteration-count', iter), labelled('timing-function', timing), valueLabel('duration', dur, ' мс'), valueLabel('delay', delay, ' мс'));
      add(ctx.live, panel, go, document.createTextNode(' '), pause, track, state, log);
      if (ctx.reducedMotion) add(ctx.live, h('p', { 'class': 'demo-hint' }, 'Включено уменьшение движения: пример всё равно запускается только вашей кнопкой.'));
      status();
    }
  });

  // ==========================================================================
  // 20 Современный CSS: каждая возможность — со своим бейджем поддержки
  // ==========================================================================
  function block(ctx, key, title, hint) {
    var b = h('div', { 'class': 'mo-block' });
    b.appendChild(h('h5', null, title));
    b.appendChild(ctx.badge(key));
    if (hint) b.appendChild(h('p', { 'class': 'demo-hint' }, hint));
    return b;
  }

  register('css-modern-1', {
    title: 'Современный CSS (1): :has(), вложенность, цвет',
    mode: 'host',
    note: 'У каждой возможности свой бейдж: он проверяет ваш браузер, а не «браузеры вообще».',
    init: function (ctx) {
      var b1 = block(ctx, 'css:has', ':has() — родительский селектор', 'Отметьте чекбокс: у карточки сменится рамка, хотя правило написано для родителя.');
      var has = h('div', { 'class': 'mo-has' }); var cb = h('input', { type: 'checkbox' }); var cl = h('label'); add(cl, cb, document.createTextNode(' Отметить')); has.appendChild(cl);
      b1.appendChild(has);

      var b2 = block(ctx, 'css:nesting', 'Вложенность CSS', 'Наведите на блок. Правила вложены друг в друга; без поддержки эффекта не будет.');
      var nest = h('div', { 'class': 'mo-nest' }); add(nest, h('h5', null, 'Заголовок'), add(h('p'), document.createTextNode('Текст с '), h('b', null, 'выделением'), document.createTextNode('.')));
      b2.appendChild(nest);

      var b3 = block(ctx, 'css:oklch', 'oklch()', 'Три ползунка воспринимаемой яркости, насыщенности и тона.');
      var L = range(0, 1, 0.7, 0.01), C = range(0, 0.4, 0.15, 0.01), H = range(0, 360, 250, 1), sw = h('div', { 'class': 'mo-swatch' }), t3 = h('p', { 'class': 'demo-readout', role: 'status' });
      function u3() { var v = 'oklch(' + L.value + ' ' + C.value + ' ' + H.value + ')'; sw.style.background = ''; sw.style.background = v; t3.textContent = 'background: ' + v + ';' + (CSS.supports('color', v) ? '' : '\nБраузер не знает oklch(): цвет не применён.'); }
      var p3 = h('div'); add(p3, valueLabel('L', L, ''), valueLabel('C', C, ''), valueLabel('H', H, '°'));
      ctx.on(p3, 'input', u3); add(b3, p3, sw, t3);

      var b4 = block(ctx, 'css:color-mix', 'color-mix()', 'Смешивание двух цветов в выбранном цветовом пространстве.');
      var ca = h('input', { type: 'color', value: '#3157c8' }), cbx = h('input', { type: 'color', value: '#d97706' }), pct = range(0, 100, 50, 1), spc = select(['srgb', 'oklab', 'oklch']);
      var sw4 = h('div', { 'class': 'mo-swatch' }), t4 = h('p', { 'class': 'demo-readout', role: 'status' });
      function u4() { var v = 'color-mix(in ' + spc.value + ', ' + ca.value + ' ' + pct.value + '%, ' + cbx.value + ')'; sw4.style.background = ''; sw4.style.background = v; t4.textContent = 'background: ' + v + ';' + (CSS.supports('color', v) ? '' : '\nБраузер не знает color-mix(): цвет не применён.'); }
      var p4 = h('div'); add(p4, labelled('Цвет A', ca), labelled('Цвет B', cbx), valueLabel('Доля A', pct, '%'), labelled('Пространство', spc));
      ctx.on(p4, 'input', u4); ctx.on(p4, 'change', u4); add(b4, p4, sw4, t4);

      var b5 = block(ctx, 'css:light-dark', 'light-dark()', 'Один блок, два набора цветов: color-scheme выбирает, какой из них действует.');
      var ld = h('div', { 'class': 'mo-ld', 'data-scheme': 'light' }, 'Текст и фон выбираются функцией light-dark().');
      var sch = select(['light', 'dark']); sch.setAttribute('aria-label', 'color-scheme');
      ctx.on(sch, 'change', function () { ld.setAttribute('data-scheme', sch.value); });
      add(b5, labelled('color-scheme', sch), ld);

      add(ctx.live, b1, b2, b3, b4, b5);
      u3(); u4();
    }
  });

  register('css-modern-2', {
    title: 'Современный CSS (2): текст, формы, прокрутка, переходы, привязка',
    mode: 'host',
    note: 'Продолжение: каждый блок имеет собственный бейдж. Там, где возможности нет, блок честно показывает, что эффекта не будет.',
    init: function (ctx) {
      var b1 = block(ctx, 'css:text-wrap-balance', 'text-wrap: balance', 'Слева обычный перенос, справа выровненные по длине строки. Двигайте ширину.');
      var tw = range(120, 340, 220, 5);
      var row = h('div', { 'class': 'a11y-cols' });
      var t1 = h('div', { 'class': 'mo-tw' }, 'Короткий заголовок, который переносится на несколько строк'), t2 = h('div', { 'class': 'mo-tw mo-balance' }, 'Короткий заголовок, который переносится на несколько строк');
      add(row, t1, t2);
      ctx.on(tw, 'input', function () { t1.style.width = t2.style.width = tw.value + 'px'; }); t1.style.width = t2.style.width = tw.value + 'px';
      add(b1, valueLabel('Ширина блока', tw, 'px'), row);

      var b2 = block(ctx, 'css:field-sizing', 'field-sizing: content', 'Печатайте в обоих полях: правое растёт вместе с текстом.');
      var f1 = h('textarea', { rows: '1', 'aria-label': 'Обычное поле', placeholder: 'обычное поле' }), f2 = h('textarea', { rows: '1', 'class': 'mo-fs', 'aria-label': 'Поле с field-sizing', placeholder: 'растущее поле' });
      f2.style.maxHeight = '120px';
      add(b2, f1, document.createTextNode(' '), f2);

      var b3 = block(ctx, 'css:accent-color', 'accent-color', 'Выберите цвет: нативные элементы управления перекрасятся.');
      var ac = h('input', { type: 'color', value: '#16794b' }), abox = h('div', { 'class': 'mo-accent-box' });
      var chk = h('input', { type: 'checkbox', 'aria-label': 'Пример флажка' }), rad = h('input', { type: 'radio', 'aria-label': 'Пример переключателя' }), rg = h('input', { type: 'range', 'aria-label': 'Пример ползунка' }), pr = h('progress', { value: '60', max: '100', 'aria-label': 'Пример индикатора' });
      chk.checked = true; rad.checked = true;
      add(abox, chk, rad, rg, pr);
      ctx.on(ac, 'input', function () { abox.style.setProperty('--mo-accent', ac.value); });
      add(b3, labelled('Цвет', ac), abox);

      var b4 = block(ctx, 'css:scroll-timeline', 'Scroll-driven animations', 'Прокрутите блок: полоса сверху растёт вместе с прокруткой (без JavaScript).');
      var sd = h('div', { 'class': 'mo-sd', tabindex: '0', role: 'region', 'aria-label': 'Прокручиваемый текст' });
      sd.appendChild(h('div', { 'class': 'mo-sd-bar', 'aria-hidden': 'true' }));
      for (var i = 1; i <= 14; i++) sd.appendChild(h('p', { 'class': 'mo-sd-text' }, 'Строка ' + i + ': текст внутри прокручиваемого контейнера.'));
      b4.appendChild(sd);

      var b5 = block(ctx, 'css:view-transitions', 'View Transitions', 'Нажмите кнопку: размер и цвет блока меняются плавно, если браузер умеет переходы.');
      var vt = h('div', { 'class': 'mo-vt', 'aria-hidden': 'true' }), vb = h('button', { type: 'button' }, 'Переключить');
      var vmsg = h('span', { 'class': 'demo-hint', role: 'status' });
      ctx.on(vb, 'click', function () {
        function flip() { vt.classList.toggle('mo-wide'); }
        if (document.startViewTransition && !ctx.reducedMotion) { document.startViewTransition(flip); vmsg.textContent = ' С переходом.'; }
        else { flip(); vmsg.textContent = ctx.reducedMotion ? ' Без анимации: включено уменьшение движения.' : ' Без перехода: браузер не поддерживает View Transitions.'; }
      });
      add(b5, vb, vmsg, h('div', { style: 'margin-top:8px' }), vt);

      var b6 = block(ctx, 'css:anchor', 'Anchor positioning', 'Подсказка привязана к кнопке без JavaScript-расчётов позиции.');
      var aw = h('div', { 'class': 'mo-anc-wrap' }), ab = h('button', { type: 'button', 'class': 'mo-anc-btn' }, 'Кнопка-якорь'), tip = h('div', { 'class': 'mo-anc-tip', role: 'tooltip' }, 'Я привязана к кнопке');
      var tc = h('input', { type: 'checkbox' }); tc.checked = true; var tl = h('label'); add(tl, tc, document.createTextNode(' Показывать подсказку'));
      ctx.on(tc, 'change', function () { tip.hidden = !tc.checked; });
      add(aw, ab, tip);
      add(b6, tl, aw);

      add(ctx.live, b1, b2, b3, b4, b5, b6);
    }
  });

  // ==========================================================================
  // Редактируемая песочница HTML+CSS (единственный пример с правкой кода читателем)
  // ==========================================================================
  register('css-lab', {
    title: 'Своя лаборатория CSS: правьте код, результат пересобирается',
    mode: 'sandbox',
    kind: 'html',
    scripts: false,
    height: 230,
    note: 'Код исполняется в изолированном iframe без скриптов. Попробуйте поменять цвета, добавить правила или включить свои селекторы.',
    code:
      '<style>\n' +
      '  body { font: 15px/1.5 system-ui, sans-serif; }\n' +
      '  .card {\n' +
      '    padding: 12px; border: 2px solid #3157c8; border-radius: 12px;\n' +
      '    & h3 { margin: 0 0 6px; text-wrap: balance; }\n' +
      '    &:has(input:checked) { background: #edfaf3; border-color: #16794b; }\n' +
      '  }\n' +
      '</style>\n' +
      '<div class="card">\n' +
      '  <h3>Карточка с вложенностью и :has()</h3>\n' +
      '  <label><input type="checkbox"> Отметить</label>\n' +
      '</div>'
  });
})();
