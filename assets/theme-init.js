/* assets/theme-init.js — применяет сохранённую тему ДО первой отрисовки, чтобы не было вспышки светлой темы.
   Подключается в <head> без defer. Если читатель не выбирал тему, ничего не делает: тогда работает prefers-color-scheme из CSS. */
(function () {
  'use strict';
  try {
    var t = localStorage.getItem('essay:theme');
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* хранилище недоступно: остаётся системная тема */ }
})();
