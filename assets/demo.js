/**
 * Движок интерактивных демо для учебного справочника.
 * Работает по file:// и на GitHub Pages. Без внешних зависимостей.
 *
 * Принцип работы:
 * 1. Демо регистрируются по ID через registerDemo(id, config).
 * 2. Оболочки создаются через createShell(id, title, code, isEditable, mode).
 * 3. IntersectionObserver лениво инициализирует демо при появлении в зоне видимости.
 * 4. Контракт очистки: функция cleanup(liveArea) обязана снять все слушатели,
 *    таймеры, rAF и освободить ресурсы.
 */
(function () {
  'use strict';

  const registry = new Map();

  /**
   * Регистрация демо. Вызывается из inline-скриптов страниц.
   * @param {string} id — уникальный идентификатор демо
   * @param {object} config — конфигурация:
   *   - supports(): boolean — проверка поддержки API
   *   - needsSecureContext: boolean — требует HTTPS
   *   - needsServer: boolean — требует HTTP-сервер
   *   - init(liveArea): void — инициализация демо
   *   - cleanup(liveArea): void — освобождение ресурсов
   */
  window.registerDemo = function (id, config) {
    registry.set(id, config);
  };

  function getBadgeText(status) {
    const map = {
      'checking': 'Проверка...',
      'ready': 'Работает',
      'unsupported': 'Не поддерживается',
      'secure-context': 'Нужен HTTPS',
      'server': 'Нужен сервер',
      'error': 'Ошибка исполнения'
    };
    return map[status] || status;
  }

  /**
   * Создаёт DOM-оболочку демо.
   * @param {string} id
   * @param {string} title
   * @param {string} codeContent — исходный код для отображения
   * @param {boolean} isEditable — если true, код в textarea
   * @param {string} mode — 'parent' (в родительском документе) или 'iframe' (изолированный)
   */
  function createShell(id, title, codeContent, isEditable, mode) {
    mode = mode || 'parent';
    const wrapper = document.createElement('div');
    wrapper.className = 'demo-shell';
    wrapper.dataset.demoId = id;
    wrapper.dataset.mode = mode;
    // Сохраняем исходный код в атрибуте, чтобы iframe-режим мог его прочитать
    // при инициализации (config.codeContent может быть не задан)
    wrapper.dataset.code = codeContent || '';

    const header = document.createElement('div');
    header.className = 'demo-header';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'demo-title';
    titleSpan.textContent = title || id;
    const badge = document.createElement('span');
    badge.className = 'demo-badge';
    badge.dataset.status = 'checking';
    badge.textContent = getBadgeText('checking');
    header.appendChild(titleSpan);
    header.appendChild(badge);

    const codeBlock = document.createElement('div');
    codeBlock.className = 'demo-code';

    let codeTarget;
    if (isEditable) {
      codeTarget = document.createElement('textarea');
      codeTarget.className = 'demo-code-editor';
      codeTarget.value = codeContent;
      codeTarget.setAttribute('aria-label', 'Редактируемый код для демо ' + id);
      codeTarget.setAttribute('spellcheck', 'false');
    } else {
      const pre = document.createElement('pre');
      codeTarget = document.createElement('code');
      codeTarget.textContent = codeContent;
      pre.appendChild(codeTarget);
      codeBlock.appendChild(pre);
    }
    if (isEditable) codeBlock.appendChild(codeTarget);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'demo-copy-btn';
    copyBtn.type = 'button';
    copyBtn.textContent = 'Копировать';
    copyBtn.setAttribute('aria-label', 'Копировать код демо');
    copyBtn.addEventListener('click', function () {
      const text = isEditable ? codeTarget.value : codeTarget.textContent;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = 'Скопировано!';
          setTimeout(function () { copyBtn.textContent = 'Копировать'; }, 2000);
        }).catch(function () {
          copyBtn.textContent = 'Ошибка';
          setTimeout(function () { copyBtn.textContent = 'Копировать'; }, 2000);
        });
      } else {
        // Фолбэк для file:// — использует выделение и execCommand
        const range = document.createRange();
        range.selectNodeContents(codeTarget);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        try {
          document.execCommand('copy');
          copyBtn.textContent = 'Скопировано!';
          setTimeout(function () { copyBtn.textContent = 'Копировать'; }, 2000);
        } catch (err) {
          copyBtn.textContent = 'Не удалось';
          setTimeout(function () { copyBtn.textContent = 'Копировать'; }, 2000);
        }
        selection.removeAllRanges();
      }
    });
    codeBlock.appendChild(copyBtn);

    const liveArea = document.createElement('div');
    liveArea.className = 'demo-live';
    liveArea.setAttribute('aria-live', 'polite');

    const resetBtn = document.createElement('button');
    resetBtn.className = 'demo-reset-btn';
    resetBtn.type = 'button';
    resetBtn.textContent = 'Сбросить';
    resetBtn.addEventListener('click', function () {
      const config = registry.get(id);
      if (config && config.cleanup) {
        try { config.cleanup(liveArea); } catch (e) { console.error(e); }
      }
      liveArea.innerHTML = '';
      if (config && config.init) {
        try {
          config.init(liveArea);
          updateBadge(wrapper, 'ready');
        } catch (err) {
          updateBadge(wrapper, 'error');
          const errBox = document.createElement('pre');
          errBox.className = 'demo-error';
          errBox.textContent = 'Ошибка: ' + err.message;
          liveArea.appendChild(errBox);
        }
      }
    });

    wrapper.appendChild(header);
    wrapper.appendChild(codeBlock);
    wrapper.appendChild(liveArea);
    wrapper.appendChild(resetBtn);
    return wrapper;
  }

  function updateBadge(shell, status) {
    const badge = shell.querySelector('.demo-badge');
    if (!badge) return;
    badge.dataset.status = status;
    badge.textContent = getBadgeText(status);
  }

  /**
   * Ленивая инициализация через IntersectionObserver.
   * rootMargin: 200px — начинаем инициализацию заранее, до того как пользователь увидит демо.
   */
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const shell = entry.target;
      const id = shell.dataset.demoId;
      const mode = shell.dataset.mode;
      const config = registry.get(id);

      if (!config) {
        updateBadge(shell, 'error');
        shell.querySelector('.demo-live').innerHTML =
          '<pre class="demo-error">Демо не найдено в реестре.</pre>';
        observer.unobserve(shell);
        return;
      }

      if (config.supports && !config.supports()) {
        updateBadge(shell, 'unsupported');
        shell.querySelector('.demo-live').innerHTML =
          '<p class="demo-unsupported-msg">Ваш браузер не поддерживает API, необходимое для этого демо.</p>';
        observer.unobserve(shell);
        return;
      }

      if (config.needsSecureContext && !window.isSecureContext) {
        updateBadge(shell, 'secure-context');
        shell.querySelector('.demo-live').innerHTML =
          '<p class="demo-unsupported-msg">Этот пример требует защищённого контекста (HTTPS или localhost). По <code>file://</code> он недоступен из соображений безопасности браузера.</p>';
        observer.unobserve(shell);
        return;
      }

      if (config.needsServer) {
        updateBadge(shell, 'server');
        shell.querySelector('.demo-live').innerHTML =
          '<p class="demo-unsupported-msg">Для этого примера требуется HTTP-сервер из-за ограничений CORS или работы Fetch API по протоколу <code>file://</code>.</p>';
        observer.unobserve(shell);
        return;
      }

      updateBadge(shell, 'ready');
      const liveArea = shell.querySelector('.demo-live');

      if (mode === 'iframe') {
        const iframe = document.createElement('iframe');
        iframe.className = 'demo-iframe';
        // allow-scripts — разрешает выполнение JS внутри iframe.
        // Отсутствие allow-same-origin — блокирует доступ к document, localStorage и кукам родителя.
        iframe.sandbox = 'allow-scripts';
        iframe.title = 'Песочница для демо ' + id;

        const textarea = shell.querySelector('.demo-code-editor');

        const buildSrcdoc = function (body) {
          return '<!doctype html><html lang="ru"><head><meta charset="utf-8">' +
            '<style>body{font-family:system-ui,-apple-system,sans-serif;padding:16px;color:#172033;line-height:1.5;}' +
            'button,input,select,textarea{font:inherit;padding:6px 12px;border-radius:6px;border:1px solid #dce2ef;margin:4px;}' +
            'button{cursor:pointer;background:#3157c8;color:white;border:none;}' +
            'details{margin:8px 0;padding:8px 12px;border:1px solid #dce2ef;border-radius:6px;}' +
            'dialog{border:none;border-radius:8px;padding:20px;box-shadow:0 8px 24px rgba(0,0,0,.15);}' +
            'dialog::backdrop{background:rgba(0,0,0,.4);}' +
            '[popover]{border:1px solid #dce2ef;border-radius:8px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.15);}' +
            '</style></head><body>' + body + '</body></html>';
        };

        const updateIframe = function () {
          // Приоритет: textarea (если редактируемо) → data-code оболочки → config.codeContent
          let code;
          if (textarea) {
            code = textarea.value;
          } else if (shell.dataset.code) {
            code = shell.dataset.code;
          } else if (config && config.codeContent) {
            code = config.codeContent;
          } else {
            code = '';
          }
          iframe.srcdoc = buildSrcdoc(code);
        };

        if (textarea) {
          textarea.addEventListener('input', updateIframe);
          liveArea._cleanup = function () {
            textarea.removeEventListener('input', updateIframe);
            iframe.srcdoc = '';
          };
        } else {
          liveArea._cleanup = function () { iframe.srcdoc = ''; };
        }

        liveArea.appendChild(iframe);
        updateIframe();

        // Проверяем поддержку popover для информационных бейджей
        if (config.init) {
          try { config.init(liveArea); } catch (err) { /* игнорируем */ }
        }
      } else {
        // Режим 'parent' — демо исполняется в родительском документе
        try {
          if (config.init) config.init(liveArea);
        } catch (err) {
          updateBadge(shell, 'error');
          const errBox = document.createElement('pre');
          errBox.className = 'demo-error';
          errBox.textContent = 'Ошибка: ' + err.message;
          liveArea.appendChild(errBox);
        }
      }

      observer.unobserve(shell);
    });
  }, { rootMargin: '200px' });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.demo-shell').forEach(function (shell) {
      observer.observe(shell);
    });
  });

  window.DemoEngine = { createShell: createShell, register: registerDemo };
})();