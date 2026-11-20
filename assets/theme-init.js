/* assets/theme-init.js — применяет сохранённую тему ДО первой отрисовки, чтобы не было вспышки светлой темы.
   Подключается в <head> без defer. Если читатель не выбирал тему, ничего не делает: тогда работает prefers-color-scheme из CSS. */
(function () {
  'use strict';
  try {
    var t = localStorage.getItem('essay:theme');
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
    var prefs = [
      ['essay:font-size', 'data-site-font', ['small', 'normal', 'large']],
      ['essay:content-width', 'data-site-width', ['narrow', 'normal', 'wide']],
      ['essay:line-height', 'data-site-line', ['compact', 'normal', 'relaxed']]
    ];
    prefs.forEach(function (p) {
      var value = localStorage.getItem(p[0]);
      if (p[2].indexOf(value) >= 0) document.documentElement.setAttribute(p[1], value);
    });
    if (localStorage.getItem('essay:motion') === 'reduce') document.documentElement.setAttribute('data-site-motion', 'reduce');

  } catch (e) { /* хранилище недоступно: остаётся системная тема */ }
})();
