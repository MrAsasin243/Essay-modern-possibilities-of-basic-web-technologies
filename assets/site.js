/*
 * assets/site.js — возможности самого сайта. Каждая применяет приём, который объясняет учебник:
 *   - поиск по Ctrl+K: <dialog>, ARIA combobox, ленивая загрузка индекса (скрипт подключается при первом открытии);
 *   - прогресс: IntersectionObserver + localStorage (JavaScript → Web API / Хранилища);
 *   - тема: prefers-color-scheme + ручной выбор (CSS → Адаптивность и пользовательские настройки);
 *   - панель «Настройки»: Popover API с запасным вариантом на <details> (HTML → Встроенная интерактивность);
 *   - пропуск навигации и управление фокусом (доступность);
 *   - печать: @media print в site.css и открытие <details> перед печатью.
 * Классический скрипт без модулей (по file:// модули блокируются). Работает и по file://: всё, что зависит
 * от хранилища, обёрнуто в try/catch и деградирует до «не сохраняется».
 */
(function () {
  'use strict';

  var DATA = window.SITE_DATA || { pages: [] };
  var here = location.pathname.split('/').pop();
  if (!/\.html$/.test(here)) here = 'index.html';

  // ---------- Помощники ----------
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) { if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]); } });
    if (text != null) n.textContent = text;
    return n;
  }
  function add(p) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) p.appendChild(arguments[i]); return p; }
  function link(text, href) { return el('a', { href: href }, text); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }

  // Хранилище с запасным вариантом: если localStorage недоступен (приватный режим, блокировка), работаем в памяти.
  var store = (function () {
    var mem = {};
    try {
      localStorage.setItem('essay:probe', '1'); localStorage.removeItem('essay:probe');
      return { ok: true, get: function (k) { return localStorage.getItem(k); }, set: function (k, v) { localStorage.setItem(k, v); }, remove: function (k) { localStorage.removeItem(k); } };
    } catch (e) {
      return { ok: false, get: function (k) { return k in mem ? mem[k] : null; }, set: function (k, v) { mem[k] = v; }, remove: function (k) { delete mem[k]; } };
    }
  })();
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* не критично */ } }
  function sdel(k) { try { sessionStorage.removeItem(k); } catch (e) { /* не критично */ } }

  var topbar = document.querySelector('.topbar');
  var main = document.querySelector('main');
  var uiHooks = [];             // функции обновления интерфейса (тема, прогресс)

  // ==========================================================================
  // Пропуск навигации
  // ==========================================================================
  if (main) {
    if (!main.id) main.id = 'main-content';
    main.setAttribute('tabindex', '-1');
    document.body.insertBefore(link('Перейти к содержимому', '#' + main.id), document.body.firstChild).className = 'skip-link';
  }

  // ==========================================================================
  // Тема: auto (prefers-color-scheme) / light / dark
  // ==========================================================================
  function getTheme() { var t = store.get('essay:theme'); return t === 'light' || t === 'dark' ? t : 'auto'; }
  function applyTheme(t) {
    var r = document.documentElement;
    if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  }
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function systemDark() { return !!(mq && mq.matches); }
  applyTheme(getTheme());
  if (mq) {
    var onSys = function () { uiHooks.forEach(function (f) { f(); }); };
    if (mq.addEventListener) mq.addEventListener('change', onSys); else if (mq.addListener) mq.addListener(onSys);
  }

  // ==========================================================================
  // Прогресс: «конец раздела появился на экране» (IntersectionObserver) → localStorage
  // ==========================================================================
  var progress = (function () { try { var j = JSON.parse(store.get('essay:progress') || '{}'); return j && typeof j === 'object' ? j : {}; } catch (e) { return {}; } })();
  var saveFailed = false, saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { store.set('essay:progress', JSON.stringify(progress)); } catch (e) { saveFailed = true; uiHooks.forEach(function (f) { f(); }); }
    }, 300);
  }
  function pagesWithSections() { return (DATA.pages || []).filter(function (p) { return p.sections && p.sections.length; }); }
  function countRead(page) {
    var done = progress[page.file] || {}, n = 0;
    page.sections.forEach(function (s) { if (done[s.id]) n++; });
    return n;
  }
  function totals() {
    var t = 0, r = 0;
    pagesWithSections().forEach(function (p) { t += p.sections.length; r += countRead(p); });
    return { total: t, read: r };
  }
  function markRead(id) {
    var p = progress[here] || (progress[here] = {});
    if (!p[id]) { p[id] = 1; save(); uiHooks.forEach(function (f) { f(); }); }
  }
  function trackSections() {
    if (!('IntersectionObserver' in window) || !main) return;
    var map = [];
    Array.prototype.forEach.call(main.querySelectorAll('.content-section[id]'), function (s) { map.push({ sentinel: s.lastElementChild || s, id: s.id }); });
    if (!map.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        for (var i = 0; i < map.length; i++) if (map[i].sentinel === e.target) { markRead(map[i].id); io.unobserve(e.target); break; }
      });
    }, { threshold: 0 });
    map.forEach(function (m) { io.observe(m.sentinel); });
  }
  function paintProgress() {
    // Боковое меню: галочка у просмотренных разделов
    var done = progress[here] || {};
    Array.prototype.forEach.call(document.querySelectorAll('.sidebar a[href^="#"]'), function (a) {
      a.classList.toggle('is-read', !!done[a.getAttribute('href').slice(1)]);
    });
    // Карточки разделов на главной
    Array.prototype.forEach.call(document.querySelectorAll('a.chapter-card'), function (card) {
      var page = pagesWithSections().filter(function (p) { return p.file === card.getAttribute('href'); })[0];
      if (!page) return;
      var box = card.querySelector('.chapter-progress');
      if (!box) { box = el('span', { 'class': 'chapter-progress' }); box.appendChild(el('span', { 'class': 'cp-text' })); box.appendChild(el('progress', { max: '100', value: '0', 'aria-hidden': 'true' })); card.appendChild(box); }
      var n = countRead(page);
      box.querySelector('.cp-text').textContent = 'Просмотрено: ' + n + ' из ' + page.sections.length;
      box.querySelector('progress').value = Math.round(n / page.sections.length * 100);
    });
  }
  uiHooks.push(paintProgress);

  // ==========================================================================
  // Панель инструментов в шапке: поиск и «Настройки»
  // ==========================================================================
  var tools = null;
  if (topbar) {
    // Controls exist in HTML; site.js only attaches behavior to them.
    tools = topbar.querySelector('.site-tools');
    if (!tools) { tools = el('div', { 'class': 'site-tools', 'aria-label': 'Инструменты сайта' }); topbar.appendChild(tools); }
  }

  // Shared reading settings. Values are validated before applying them to the root element.
  function getReaderPref(key, fallback, allowed) {
    var value = store.get('essay:' + key);
    return allowed.indexOf(value) >= 0 ? value : fallback;
  }
  function saveReaderPref(key, value) {
    try { store.set('essay:' + key, value); } catch (e) { saveFailed = true; }
    applyReaderPrefs();
  }
  function applyReaderPrefs() {
    var root = document.documentElement;
    root.setAttribute('data-site-font', getReaderPref('font-size', 'normal', ['small', 'normal', 'large']));
    root.setAttribute('data-site-width', getReaderPref('content-width', 'normal', ['narrow', 'normal', 'wide']));
    root.setAttribute('data-site-line', getReaderPref('line-height', 'normal', ['compact', 'normal', 'relaxed']));
    if (getReaderPref('motion', 'system', ['system', 'reduce']) === 'reduce') root.setAttribute('data-site-motion', 'reduce');
    else root.removeAttribute('data-site-motion');
  }
  applyReaderPrefs();
  function buildPanel() {
    var panel = el('div', { 'class': 'site-panel', role: 'dialog', 'aria-label': 'Настройки сайта' });
    panel.appendChild(el('h3', null, 'Настройки'));

    // Тема
    var fs = el('fieldset'); fs.appendChild(el('legend', null, 'Тема оформления'));
    var radios = {};
    [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']].forEach(function (o) {
      var l = el('label'), r = el('input', { type: 'radio', name: 'essay-theme', value: o[0] });
      radios[o[0]] = r; l.appendChild(r); l.appendChild(document.createTextNode(' ' + o[1])); fs.appendChild(l);
    });
    var themeNote = el('p', { 'class': 'site-note', role: 'status' });
    fs.addEventListener('change', function (e) {
      if (!e.target || e.target.name !== 'essay-theme') return;
      try { if (e.target.value === 'auto') store.remove('essay:theme'); else store.set('essay:theme', e.target.value); } catch (er) { saveFailed = true; }
      applyTheme(e.target.value); paintTheme();
    });
    function paintTheme() {
      var t = getTheme(); radios[t].checked = true;
      var eff = t === 'auto' ? (systemDark() ? 'тёмная (по настройке системы)' : 'светлая (по настройке системы)') : (t === 'dark' ? 'тёмная (выбрана вручную)' : 'светлая (выбрана вручную)');
      themeNote.textContent = 'Сейчас: ' + eff + '.';
    }
    uiHooks.push(paintTheme);
    var themeHow = el('p', { 'class': 'site-note' });
    add(themeHow, document.createTextNode('Приём: media-запрос '), el('code', null, 'prefers-color-scheme'), document.createTextNode(' плюс ручной выбор в '), el('code', null, 'localStorage'), document.createTextNode('. См. '), link('CSS → Адаптивность и пользовательские настройки', 'css.html#responsive'), document.createTextNode('.'));
    add(panel, fs, themeNote, themeHow);
    // Reading preferences apply to all main sections.
    var viewSet = el('fieldset', { 'class': 'site-reading-settings' });
    viewSet.appendChild(el('legend', null, 'Чтение и отображение'));
    var prefControls = [];
    function makeReaderSelect(labelText, key, fallback, options) {
      var row = el('label', { 'class': 'site-setting-row' });
      row.appendChild(el('span', null, labelText));
      var control = el('select', { 'aria-label': labelText });
      options.forEach(function (o) { control.appendChild(el('option', { value: o[0] }, o[1])); });
      control.value = getReaderPref(key, fallback, options.map(function (o) { return o[0]; }));
      control.addEventListener('change', function () { saveReaderPref(key, control.value); });
      row.appendChild(control);
      viewSet.appendChild(row);
      prefControls.push({ control: control, fallback: fallback });
    }
    makeReaderSelect('Размер текста', 'font-size', 'normal', [['small', 'Меньше'], ['normal', 'Обычно'], ['large', 'Больше']]);
    makeReaderSelect('Ширина контента', 'content-width', 'normal', [['narrow', 'Уже'], ['normal', 'Обычно'], ['wide', 'Шире']]);
    makeReaderSelect('Межстрочный интервал', 'line-height', 'normal', [['compact', 'Компактный'], ['normal', 'Обычный'], ['relaxed', 'Свободный']]);
    makeReaderSelect('Анимация', 'motion', 'system', [['system', 'Как в системе'], ['reduce', 'Сократить']]);
    var resetView = el('button', { type: 'button' }, 'Сбросить настройки отображения');
    var viewNote = el('p', { 'class': 'site-note', role: 'status' });
    resetView.addEventListener('click', function () {
      ['essay:font-size', 'essay:content-width', 'essay:line-height', 'essay:motion'].forEach(function (key) {
        try { store.remove(key); } catch (e) { saveFailed = true; }
      });
      applyReaderPrefs();
      prefControls.forEach(function (item) { item.control.value = item.fallback; });
      viewNote.textContent = (store.ok && !saveFailed) ? 'Настройки отображения сброшены.' : 'Настройки сброшены только до закрытия страницы: хранилище недоступно.';
    });
    viewNote.textContent = (store.ok && !saveFailed) ? 'Настройки сохраняются локально в этом браузере.' : 'Хранилище недоступно: настройки действуют только до закрытия страницы.';
    add(panel, viewSet, resetView, viewNote);


    // Прогресс
    panel.appendChild(el('h3', null, 'Прогресс'));
    var pText = el('p', { role: 'status' }), pBar = el('progress', { max: '100', value: '0', 'aria-hidden': 'true' }), pList = el('p', { 'class': 'site-note' });
    var reset = el('button', { type: 'button' }, 'Сбросить прогресс');
    var pWarn = el('p', { 'class': 'site-note' });
    reset.addEventListener('click', function () {
      progress = {}; try { store.remove('essay:progress'); } catch (e) { /* игнорируем */ }
      uiHooks.forEach(function (f) { f(); });
    });
    function paintPanelProgress() {
      var t = totals();
      pText.textContent = 'Просмотрено разделов: ' + t.read + ' из ' + t.total + '.';
      pBar.value = t.total ? Math.round(t.read / t.total * 100) : 0;
      pList.textContent = pagesWithSections().map(function (p) { return p.label + ': ' + countRead(p) + '/' + p.sections.length; }).join(' · ');
      pWarn.textContent = (store.ok && !saveFailed) ? 'Прогресс хранится только в этом браузере (localStorage).' : 'Хранилище браузера недоступно: прогресс не сохранится после закрытия страницы.';
    }
    uiHooks.push(paintPanelProgress);
    var pHow = el('p', { 'class': 'site-note' });
    add(pHow, document.createTextNode('«Просмотрено» значит, что конец раздела появился на экране, а не что вы всё прочитали. Приём: '), el('code', null, 'IntersectionObserver'), document.createTextNode(' и '), link('Web API', 'javascript.html#apis'), document.createTextNode(', '), link('хранилища', 'javascript.html#storage'), document.createTextNode('.'));
    add(panel, pText, pBar, pList, reset, pWarn, pHow);

    // Подсказки
    panel.appendChild(el('h3', null, 'Подсказки'));
    var hint = el('p', { 'class': 'site-note' });
    add(hint, document.createTextNode('Поиск: '), el('kbd', null, 'Ctrl K'), document.createTextNode(' или '), el('kbd', null, '/'), document.createTextNode('. Копирование кода — Clipboard API, см. '), link('Web API', 'javascript.html#apis'), document.createTextNode('. Эта панель — '), link('Popover API', 'html.html#interaction'), document.createTextNode('. Печать: '), link('@media print', 'css.html#modern'), document.createTextNode('.'));
    panel.appendChild(hint);
    paintTheme(); paintPanelProgress();
    return panel;
  }

  if (tools) {
    var supportsPopover = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;
    var panel = buildPanel();
    var sb = tools.querySelector('[data-site-settings-trigger]');
    if (!sb) { sb = el('button', { type: 'button' }, 'Настройки'); tools.appendChild(sb); }
    if (supportsPopover) {
      panel.id = 'site-settings-panel';
      panel.setAttribute('popover', 'auto');
      tools.appendChild(panel);
      sb.setAttribute('popovertarget', panel.id);
      sb.setAttribute('aria-controls', panel.id);
      sb.removeAttribute('disabled');
      panel.addEventListener('toggle', function (e) {
        sb.setAttribute('aria-expanded', String(e.newState === 'open'));
      });
    } else {
      // Native details/summary is the fallback when Popover API is unavailable.
      var det = el('details', { 'class': 'site-settings' });
      det.appendChild(el('summary', null, 'Настройки'));
      det.appendChild(panel);
      tools.replaceChild(det, sb);
    }
  }

  // ==========================================================================
  // Поиск (диалог + combobox). Индекс загружается лениво, при первом открытии.
  // ==========================================================================
  var dialogOK = typeof HTMLDialogElement !== 'undefined' && HTMLDialogElement.prototype && typeof HTMLDialogElement.prototype.showModal === 'function';
  var dlg = null, input, list, status, items = null, loading = null, active = -1, current = [], lastTokens = [], searchTrigger = null;

  function loadIndex() {
    if (items) return Promise.resolve(items);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (window.SEARCH_INDEX) return resolve(window.SEARCH_INDEX);
      var s = document.createElement('script');
      s.src = 'assets/search-index.js';
      s.onload = function () { window.SEARCH_INDEX ? resolve(window.SEARCH_INDEX) : reject(new Error('индекс пуст')); };
      s.onerror = function () { reject(new Error('файл assets/search-index.js не загрузился')); };
      document.head.appendChild(s);
    }).then(function (idx) {
      items = idx.entries.map(function (e) { return { page: e[0], sec: e[1], secTitle: e[2], title: e[3], level: e[4], text: e[5], nt: norm(e[3]), nx: norm(e[5]) }; });
      return items;
    });
    loading['catch'](function () { loading = null; });
    return loading;
  }
  function wordStart(s, i) { return i === 0 || !/[\p{L}\p{N}]/u.test(s.charAt(i - 1)); }
  function search(q) {
    var toks = norm(q).split(/\s+/).filter(Boolean).slice(0, 6);
    lastTokens = toks;
    if (!toks.length) return [];
    var res = [];
    items.forEach(function (it, i) {
      var score = 0;
      for (var k = 0; k < toks.length; k++) {
        var t = toks[k], ti = it.nt.indexOf(t), xi = it.nx.indexOf(t);
        if (ti < 0 && xi < 0) { score = -1; break; }
        if (ti >= 0) { score += 10; if (wordStart(it.nt, ti)) score += 5; if (it.nt === t) score += 10; }
        if (xi >= 0) { var c = 0, p = xi; while (p >= 0 && c < 5) { c++; p = it.nx.indexOf(t, p + t.length); } score += c; if (wordStart(it.nx, xi)) score += 2; }
      }
      if (score > 0) res.push([score, i]);
    });
    res.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    return res.slice(0, 40).map(function (r) { return items[r[1]]; });
  }
  /** Подсветка найденного через <mark>: весь текст вставляется как узлы, innerHTML не используется. */
  function highlight(text, toks) {
    var frag = document.createDocumentFragment(), n = norm(text);
    if (n.length !== text.length) { frag.appendChild(document.createTextNode(text)); return frag; }
    var marks = [];
    toks.forEach(function (t) { var p = n.indexOf(t); var guard = 0; while (p >= 0 && guard++ < 20) { marks.push([p, p + t.length]); p = n.indexOf(t, p + t.length); } });
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    marks.forEach(function (m) { var l = merged[merged.length - 1]; if (l && m[0] <= l[1]) l[1] = Math.max(l[1], m[1]); else merged.push(m.slice()); });
    var pos = 0;
    merged.forEach(function (m) {
      if (m[0] > pos) frag.appendChild(document.createTextNode(text.slice(pos, m[0])));
      frag.appendChild(el('mark', null, text.slice(m[0], m[1]))); pos = m[1];
    });
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    return frag;
  }
  function snippet(it, toks) {
    if (!it.text) return '';
    var idx = -1;
    for (var i = 0; i < toks.length && idx < 0; i++) idx = it.nx.indexOf(toks[i]);
    var from = Math.max(0, idx < 0 ? 0 : idx - 60), to = Math.min(it.text.length, from + 170);
    return (from > 0 ? '…' : '') + it.text.slice(from, to) + (to < it.text.length ? '…' : '');
  }
  function pageLabel(file) { var p = (DATA.pages || []).filter(function (x) { return x.file === file; })[0]; return p ? p.label : file; }
  function hrefOf(it) { return it.page + (it.sec ? '#' + it.sec : ''); }

  function render() {
    while (list.firstChild) list.removeChild(list.firstChild);
    active = -1; input.removeAttribute('aria-activedescendant');
    var q = input.value.trim();
    if (!q) { current = []; status.textContent = 'Введите запрос, например: замыкание, preflight, grid, специфичность.'; input.setAttribute('aria-expanded', 'false'); return; }
    current = search(q);
    input.setAttribute('aria-expanded', current.length ? 'true' : 'false');
    status.textContent = current.length ? 'Найдено результатов: ' + current.length + (current.length === 40 ? ' (показаны первые 40)' : '') + '.' : 'Ничего не найдено. Попробуйте часть слова или другой термин.';
    current.forEach(function (it, i) {
      var li = el('li', { role: 'option', id: 'ss-opt-' + i, 'aria-selected': 'false' });
      var a = el('a', { href: hrefOf(it), tabindex: '-1' });
      a.appendChild(el('div', { 'class': 'ss-path' }, pageLabel(it.page) + (it.secTitle && it.secTitle !== it.title ? ' › ' + it.secTitle : '')));
      var t = el('div', { 'class': 'ss-title' }); t.appendChild(highlight(it.title, lastTokens)); a.appendChild(t);
      var sn = snippet(it, lastTokens);
      if (sn) { var s = el('div', { 'class': 'ss-snip' }); s.appendChild(highlight(sn, lastTokens)); a.appendChild(s); }
      li.appendChild(a); li.setAttribute('data-i', String(i)); list.appendChild(li);
    });
    if (current.length) setActive(0);
  }
  function setActive(i) {
    var opts = list.children;
    if (active >= 0 && opts[active]) opts[active].setAttribute('aria-selected', 'false');
    active = i;
    if (opts[i]) { opts[i].setAttribute('aria-selected', 'true'); input.setAttribute('aria-activedescendant', opts[i].id); if (opts[i].scrollIntoView) opts[i].scrollIntoView({ block: 'nearest' }); }
  }
  function remember(it) { sset('essay:find', JSON.stringify({ page: it.page, title: it.title, level: it.level, sec: it.sec })); }
  function chooseActive() { if (active >= 0 && current[active]) { var a = list.children[active].querySelector('a'); a.click(); } }

  function buildDialog() {
    dlg = el(dialogOK ? 'dialog' : 'div', { 'class': 'site-search', 'aria-label': 'Поиск по сайту' });
    if (!dialogOK) { dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.hidden = true; }
    var head = el('div', { 'class': 'ss-head' });
    input = el('input', { type: 'search', id: 'ss-input', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'ss-list', 'aria-autocomplete': 'list', 'aria-label': 'Поиск по сайту', placeholder: 'Поиск по сайту…', autocomplete: 'off', spellcheck: 'false' });
    var close = el('button', { type: 'button', 'aria-label': 'Закрыть поиск' }, 'Закрыть');
    add(head, input, close);
    status = el('p', { 'class': 'ss-status', role: 'status' });
    list = el('ul', { id: 'ss-list', role: 'listbox', 'aria-label': 'Результаты поиска', 'class': 'ss-list' });
    var hint = el('p', { 'class': 'ss-hint' }, '↑ ↓ — выбрать · Enter — открыть · Esc — закрыть');
    add(dlg, head, status, list, hint);
    document.body.appendChild(dlg);
    var debounce = 0;
    input.addEventListener('input', function () { clearTimeout(debounce); debounce = setTimeout(function () { if (items) render(); }, 80); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' && current.length) { e.preventDefault(); setActive((active + 1) % current.length); }
      else if (e.key === 'ArrowUp' && current.length) { e.preventDefault(); setActive((active - 1 + current.length) % current.length); }
      else if (e.key === 'Enter') { e.preventDefault(); chooseActive(); }
    });
    close.addEventListener('click', closeSearch);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeSearch(); });
    list.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a'); if (!a) return;
      var li = a.parentNode, it = current[+li.getAttribute('data-i')];
      if (it) remember(it);
      closeSearch();
      if (it && it.page === here) setTimeout(findTarget, 0);
    });
  }
  function closeSearch() {
    if (!dlg) return;
    if (dialogOK) {
      if (dlg.open) dlg.close();
    } else {
      dlg.hidden = true;
      dlg.classList.remove('site-search-fallback-open');
    }
    if (searchTrigger) searchTrigger.focus();
  }
  function openSearch() {
    if (!dlg) buildDialog();
    if (dialogOK) {
      if (!dlg.open) dlg.showModal();
    } else {
      dlg.hidden = false;
      dlg.classList.add('site-search-fallback-open');
    }
    input.focus(); input.select();
    status.textContent = items ? '' : 'Загрузка индекса…';
    loadIndex().then(function () { render(); }, function (e) { status.textContent = 'Не удалось загрузить индекс поиска: ' + e.message + '.'; });
  }
  if (tools) {
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    searchTrigger = tools.querySelector('[data-site-search-trigger]');
    if (!searchTrigger) {
      searchTrigger = el('button', { type: 'button' });
      add(searchTrigger, document.createTextNode('Поиск '), el('kbd', null, isMac ? '⌘K' : 'Ctrl K'));
      tools.insertBefore(searchTrigger, tools.firstChild);
    }
    searchTrigger.setAttribute('aria-haspopup', 'dialog');
    searchTrigger.setAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    searchTrigger.disabled = false;
    searchTrigger.addEventListener('click', openSearch);
  }
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    var typing = e.target && (/^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); openSearch(); }
    else if (k === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openSearch(); }
    else if (!dialogOK && k === 'escape' && dlg && !dlg.hidden) { closeSearch(); }
  });

  // ==========================================================================
  // Переход к найденному подзаголовку (h3 без собственного id)
  // ==========================================================================
  function findTarget() {
    var raw = sget('essay:find'); if (!raw) return;
    var t; try { t = JSON.parse(raw); } catch (e) { sdel('essay:find'); return; }
    if (!t || t.page !== here) return;
    sdel('essay:find');
    var heads = main ? main.querySelectorAll('h1, h2, h3') : [], target = null;
    for (var i = 0; i < heads.length; i++) if (heads[i].textContent.replace(/\s+/g, ' ').trim() === t.title) { target = heads[i]; break; }
    if (!target && t.sec) target = document.getElementById(t.sec);
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    if (target.scrollIntoView) target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
    target.classList.add('find-flash');
    setTimeout(function () { target.classList.remove('find-flash'); }, 1800);
  }
  window.addEventListener('hashchange', findTarget);

  // ==========================================================================
  // Печать: открыть все <details> и вернуть как было
  // ==========================================================================
  var opened = [];
  window.addEventListener('beforeprint', function () {
    opened = [];
    Array.prototype.forEach.call(document.querySelectorAll('main details:not([open])'), function (d) { if (!d.closest('.demo-shell')) { d.open = true; opened.push(d); } });
  });
  window.addEventListener('afterprint', function () { opened.forEach(function (d) { d.open = false; }); opened = []; });

  // ==========================================================================
  // Запуск
  // ==========================================================================
  function start() {
    uiHooks.forEach(function (f) { f(); });
    trackSections();
    findTarget();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // Для проверок и отладки: window.Site.stats() и window.Site.openSearch().
  window.Site = Object.freeze({
    stats: function () { return { storage: store.ok, theme: getTheme(), progress: totals(), page: here }; },
    openSearch: openSearch, search: function (q) { return items ? search(q) : null; }
  });
})();
