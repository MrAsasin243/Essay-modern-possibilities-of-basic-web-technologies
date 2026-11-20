(() => {
  "use strict";

  const tool = document.getElementById("lcp-tool");
  if (!tool) return;

  const inputs = [...tool.querySelectorAll("input[data-lcp]")];
  const totalNode = document.getElementById("lcp-total");
  const adviceNode = document.getElementById("lcp-advice");
  const segments = [...tool.querySelectorAll("[data-segment]")];
  const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  const labels = {
    ttfb: "TTFB",
    delay: "задержка до начала загрузки ресурса",
    duration: "длительность загрузки ресурса",
    render: "задержка отображения элемента"
  };

  function readValues() {
    const values = {};
    for (const input of inputs) {
      const parsed = Number(input.value);
      values[input.dataset.lcp] = Number.isFinite(parsed)
        ? Math.min(10000, Math.max(0, parsed))
        : 0;
    }
    return values;
  }

  function update() {
    const values = readValues();
    const total = Object.values(values).reduce((sum, value) => sum + value, 0);
    totalNode.textContent = `${nf.format(total)} мс`;

    for (const segment of segments) {
      const key = segment.dataset.segment;
      const share = total > 0 ? (values[key] / total) * 100 : 0;
      segment.style.width = `${share}%`;
      segment.setAttribute("aria-label", `${labels[key]}: ${nf.format(values[key])} мс (${share.toFixed(1)}%)`);
    }

    if (total === 0) {
      adviceNode.textContent = "Введите хотя бы одно ненулевое значение, чтобы увидеть структуру задержки.";
      return;
    }

    const [dominantKey, dominantValue] = Object.entries(values)
      .sort((a, b) => b[1] - a[1])[0];
    const share = (dominantValue / total) * 100;
    adviceNode.textContent = `Самая большая составляющая в этой модели — ${labels[dominantKey]} (${nf.format(dominantValue)} мс, ${share.toFixed(1)}% суммы). Это отправная точка для гипотезы, а не автоматический диагноз причины.`;
  }

  for (const input of inputs) {
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  }
  update();
})();

(() => {
  "use strict";
  const page = document.querySelector(".bp-page");
  if (!page) return;


  const searchDialog = document.getElementById("bp-search-dialog");
  const settingsDialog = document.getElementById("bp-settings-dialog");
  const searchInput = document.getElementById("bp-search-input");
  const results = document.getElementById("bp-search-results");
  const openSearch = document.getElementById("bp-open-search");
  const openSettings = document.getElementById("bp-open-settings");
  const dialogs = [searchDialog, settingsDialog].filter(Boolean);
  let lastFocus = null;
  let activeResults = [];

  function openDialog(dialog, focusTarget) {
    if (!dialog) return;
    lastFocus = document.activeElement;
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
    focusTarget?.focus();
  }
  function closeDialog(dialog) {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    if (dialogs.every(d => d.hidden)) document.body.style.removeProperty("overflow");
    (lastFocus && lastFocus.isConnected ? lastFocus : openSearch)?.focus();
  }
  openSearch?.addEventListener("click", () => openDialog(searchDialog, searchInput));
  openSettings?.addEventListener("click", () => openDialog(settingsDialog, document.getElementById("bp-setting-theme")));
  dialogs.forEach(dialog => {
    dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(dialog); });
    dialog.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => closeDialog(dialog)));
    dialog.addEventListener("keydown", event => {
      if (event.key !== "Tab") return;
      const focusables = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(el => !el.closest('[hidden]') && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault(); openDialog(searchDialog, searchInput); searchInput?.select();
    }
    if (event.key === "Escape") dialogs.forEach(closeDialog);
  });

  const searchable = [...document.querySelectorAll(".bp-section h2, .bp-section h3, .bp-section p, .bp-section li")]
    .filter(node => node.textContent.trim());
  const sectionHeading = element => element.closest(".bp-section")?.querySelector("h2")?.textContent.trim() || "Материал главы";
  const normalize = value => value.toLocaleLowerCase("ru-RU");
  function makeSnippet(text, query) {
    const pos = normalize(text).indexOf(normalize(query));
    if (pos < 0) return text.slice(0, 150);
    const start = Math.max(0, pos - 55), end = Math.min(text.length, pos + query.length + 90);
    return `${start ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
  }
  function renderMarkedSnippet(container, snippet, query) {
    const lower = normalize(snippet), q = normalize(query);
    const at = lower.indexOf(q);
    if (at < 0) { container.textContent = snippet; return; }
    container.append(document.createTextNode(snippet.slice(0, at)));
    const mark = document.createElement("mark"); mark.textContent = snippet.slice(at, at + query.length); container.append(mark);
    container.append(document.createTextNode(snippet.slice(at + query.length)));
  }
  function selectResult(item) {
    closeDialog(searchDialog);
    item.target.scrollIntoView({ behavior: page.dataset.motion === "off" ? "auto" : "smooth", block: "center" });
    item.target.classList.add("bp-search-target");
    window.setTimeout(() => item.target.classList.remove("bp-search-target"), 2200);
  }
  function runSearch(query) {
    results.replaceChildren();
    activeResults = [];
    const q = query.trim();
    if (!q) { results.innerHTML = '<div class="bp-search-empty">Начните вводить запрос.</div>'; return; }
    const qLower = normalize(q);
    const matches = searchable.filter(node => normalize(node.textContent).includes(qLower)).slice(0, 40);
    if (!matches.length) { results.innerHTML = '<div class="bp-search-empty">Ничего не найдено. Попробуйте другой термин.</div>'; return; }
    const count = document.createElement("div"); count.className = "bp-search-count"; count.textContent = `Найдено: ${matches.length}${matches.length === 40 ? " (показаны первые 40)" : ""}`; results.append(count);
    matches.forEach(node => {
      const item = { target: node.closest("h2, h3, p, li") || node };
      activeResults.push(item);
      const button = document.createElement("button"); button.type = "button"; button.className = "bp-search-result"; button.setAttribute("role", "option");
      const title = document.createElement("span"); title.className = "bp-search-result-title"; title.textContent = sectionHeading(node);
      const snippet = document.createElement("span"); snippet.className = "bp-search-result-snippet"; renderMarkedSnippet(snippet, makeSnippet(node.textContent.trim(), q), q);
      button.append(title, snippet); button.addEventListener("click", () => selectResult(item)); results.append(button);
    });
  }
  searchInput?.addEventListener("input", () => runSearch(searchInput.value));
  searchInput?.addEventListener("keydown", event => { if (event.key === "Enter" && activeResults.length) { event.preventDefault(); selectResult(activeResults[0]); } });

  // Settings are saved locally on this device; failure (private browsing, storage policy) is harmless.
  const controls = {
    theme: document.getElementById("bp-setting-theme"),
    font: document.getElementById("bp-setting-font"),
    width: document.getElementById("bp-setting-width"),
    spacing: document.getElementById("bp-setting-spacing"),
    motion: document.getElementById("bp-setting-motion")
  };
  const defaults = { theme: "system", font: "normal", width: "standard", spacing: "standard", motion: false };
  const storageKey = "modern-web-reading-settings-v1";
  function loadSettings() {
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(storageKey) || "{}")) }; }
    catch { return { ...defaults }; }
  }
  function saveSettings(settings) {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* storage is optional */ }
  }
  function applySettings(settings) {
    if (settings.theme === "system") page.removeAttribute("data-theme"); else page.dataset.theme = settings.theme;
    page.dataset.font = settings.font;
    page.dataset.width = settings.width;
    page.dataset.spacing = settings.spacing;
    page.dataset.motion = settings.motion ? "off" : "on";
    Object.entries(controls).forEach(([key, control]) => {
      if (!control) return;
      if (key === "motion") control.checked = Boolean(settings.motion);
      else control.value = settings[key] || defaults[key];
    });
  }
  let settings = loadSettings();
  applySettings(settings);
  Object.values(controls).forEach(control => control?.addEventListener("change", () => {
    settings = {
      theme: controls.theme.value,
      font: controls.font.value,
      width: controls.width.value,
      spacing: controls.spacing.value,
      motion: controls.motion.checked
    };
    applySettings(settings); saveSettings(settings);
  }));
  document.getElementById("bp-settings-reset")?.addEventListener("click", () => { settings = { ...defaults }; applySettings(settings); saveSettings(settings); });
  document.getElementById("bp-settings-done")?.addEventListener("click", () => closeDialog(settingsDialog));
})();
