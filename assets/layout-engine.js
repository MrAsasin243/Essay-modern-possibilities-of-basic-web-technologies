(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // LAB 01 — box generation and display formatting.
  const boxDisplay = $("le-box-display");
  const demoParent = $("le-demo-parent");
  const boxOutput = $("le-box-output");
  const boxDescriptions = {
    block: "Родитель создаёт block box. Потомки компонуются внутри него в обычном потоке; видна граница principal box.",
    flex: "Родитель становится flex container. Непосредственные дочерние боксы и generated ::before участвуют как flex items.",
    grid: "Родитель становится grid container. Его непосредственные дочерние боксы и generated ::before становятся grid items.",
    contents: "Principal box родителя отсутствует. Его содержимое участвует во внешнем grid-контексте; сама рамка родителя исчезает.",
    none: "Боксы элемента и его поддерева не создаются для визуального layout. DOM-узлы при этом остаются в документе."
  };
  function updateBoxDisplay() {
    if (!boxDisplay || !demoParent || !boxOutput) return;
    const value = boxDisplay.value;
    demoParent.style.display = value;
    boxOutput.textContent = boxDescriptions[value] || "Выбранное значение display изменило генерацию боксов.";
  }
  boxDisplay?.addEventListener("change", updateBoxDisplay);
  updateBoxDisplay();

  // LAB 02 — intrinsic sizing.
  const intrinsicMode = $("le-intrinsic-mode");
  const intrinsicSpace = $("le-intrinsic-space");
  const intrinsicSpaceValue = $("le-intrinsic-space-value");
  const intrinsicFrame = $("le-intrinsic-frame");
  const intrinsicBox = $("le-intrinsic-box");
  const intrinsicOutput = $("le-intrinsic-output");
  function updateIntrinsic() {
    if (!intrinsicMode || !intrinsicSpace || !intrinsicFrame || !intrinsicBox || !intrinsicOutput) return;
    const mode = intrinsicMode.value;
    const available = Number(intrinsicSpace.value);
    intrinsicFrame.style.width = `${available}px`;
    intrinsicBox.style.width = mode;
    if (intrinsicSpaceValue) intrinsicSpaceValue.value = `${available} px`;
    intrinsicOutput.textContent = `${mode}: фактическая ширина бокса ${intrinsicBox.getBoundingClientRect().width.toFixed(1)} CSS px; ширина содержимого с прокруткой ${intrinsicBox.scrollWidth} px. Доступная ширина контейнера — ${available} px.`;
  }
  intrinsicMode?.addEventListener("change", updateIntrinsic);
  intrinsicSpace?.addEventListener("input", updateIntrinsic);
  updateIntrinsic();

  // LAB 03 — automatic minimum size of a flex item.
  const flexMode = $("le-flex-mode");
  const flexMain = $("le-flex-main");
  const flexOutput = $("le-flex-output");
  function updateFlex() {
    if (!flexMode || !flexMain || !flexOutput) return;
    const mode = flexMode.value;
    flexMain.style.minWidth = mode === "auto" ? "auto" : "0";
    flexMain.style.overflowWrap = mode === "wrap" ? "anywhere" : "normal";
    const label = mode === "auto"
      ? "min-width:auto сохраняет автоматический minimum size. Непереносимый фрагмент может не дать item сжаться и вытолкнуть соседнюю панель."
      : mode === "zero"
        ? "min-width:0 снимает automatic minimum constraint. Сам длинный токен всё ещё может визуально переполнять сжатый item."
        : "min-width:0 позволяет item сжаться, а overflow-wrap:anywhere разрешает разрывать длинный токен внутри строки.";
    requestAnimationFrame(() => {
      const width = flexMain.getBoundingClientRect().width;
      flexOutput.textContent = `${label} Ширина main item сейчас ${width.toFixed(1)} px; scrollWidth ${flexMain.scrollWidth} px.`;
    });
  }
  flexMode?.addEventListener("change", updateFlex);
  updateFlex();

  // LAB 04 — layout position compared with transformed visual geometry.
  const transformToggle = $("le-transform-toggle");
  const geometryTarget = $("le-geometry-target");
  const offsetLeftNode = $("le-offset-left");
  const offsetWidthNode = $("le-offset-width");
  const rectLeftNode = $("le-rect-left");
  const rectWidthNode = $("le-rect-width");
  const geometryOutput = $("le-geometry-output");
  function updateGeometry() {
    if (!geometryTarget) return;
    geometryTarget.style.transform = transformToggle?.checked ? "translateX(48px)" : "none";
    requestAnimationFrame(() => {
      const rect = geometryTarget.getBoundingClientRect();
      if (offsetLeftNode) offsetLeftNode.textContent = `${geometryTarget.offsetLeft} px`;
      if (offsetWidthNode) offsetWidthNode.textContent = `${geometryTarget.offsetWidth} px`;
      if (rectLeftNode) rectLeftNode.textContent = `${rect.left.toFixed(1)} px`;
      if (rectWidthNode) rectWidthNode.textContent = `${rect.width.toFixed(1)} px`;
      if (geometryOutput) {
        geometryOutput.textContent = transformToggle?.checked
          ? "Transform изменил visual rectangle в viewport coordinates, но не переместил исходный layout slot. Поэтому rect.left изменился относительно offsetLeft."
          : "Без transform значения снова отражают исходное размещение. offsetLeft и rect.left используют разные системы отсчёта.";
      }
    });
  }
  transformToggle?.addEventListener("change", updateGeometry);
  window.addEventListener("resize", updateGeometry, { passive: true });
  updateGeometry();

  // LAB 05 — intentionally compare interleaved layout reads/writes with batching.
  const runLayoutTest = $("le-run-layout-test");
  const benchmarkFixture = $("le-benchmark-fixture");
  const syncBar = $("le-sync-bar");
  const batchBar = $("le-batch-bar");
  const syncTime = $("le-sync-time");
  const batchTime = $("le-batch-time");
  const benchmarkOutput = $("le-benchmark-output");
  if (benchmarkFixture) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 80; i += 1) {
      const node = document.createElement("div");
      node.className = "le-benchmark-item";
      node.style.width = `${80 + (i % 17)}px`;
      node.style.height = "12px";
      node.style.marginBottom = "1px";
      fragment.append(node);
    }
    benchmarkFixture.append(fragment);
  }
  function measureInterleaved(nodes) {
    let checksum = 0;
    const start = performance.now();
    for (let round = 0; round < 3; round += 1) {
      nodes.forEach((node, index) => {
        node.style.width = `${90 + ((index + round * 3) % 23)}px`;
        checksum += node.offsetHeight;
      });
    }
    return { duration: performance.now() - start, checksum };
  }
  function measureBatched(nodes) {
    let checksum = 0;
    const start = performance.now();
    for (let round = 0; round < 3; round += 1) {
      nodes.forEach((node, index) => {
        node.style.width = `${90 + ((index + round * 3) % 23)}px`;
      });
      nodes.forEach((node) => { checksum += node.offsetHeight; });
    }
    return { duration: performance.now() - start, checksum };
  }
  runLayoutTest?.addEventListener("click", () => {
    if (!benchmarkFixture || !benchmarkOutput) return;
    runLayoutTest.disabled = true;
    runLayoutTest.textContent = "Выполняется…";
    requestAnimationFrame(() => {
      const nodes = [...benchmarkFixture.children];
      // Warm up JIT and style machinery before the displayed pair.
      measureBatched(nodes);
      const interleaved = measureInterleaved(nodes);
      const batched = measureBatched(nodes);
      const max = Math.max(interleaved.duration, batched.duration, 0.1);
      if (syncBar) syncBar.style.width = `${Math.max(3, interleaved.duration / max * 100)}%`;
      if (batchBar) batchBar.style.width = `${Math.max(3, batched.duration / max * 100)}%`;
      if (syncTime) syncTime.textContent = `${interleaved.duration.toFixed(2)} ms`;
      if (batchTime) batchTime.textContent = `${batched.duration.toFixed(2)} ms`;
      const ratio = batched.duration > 0 ? interleaved.duration / batched.duration : 0;
      benchmarkOutput.textContent = `В этой попытке: interleaved ${interleaved.duration.toFixed(2)} ms; batched ${batched.duration.toFixed(2)} ms; отношение ${ratio.toFixed(2)}×. Checksum: ${interleaved.checksum}/${batched.checksum}. Это демонстрация механизма, а не benchmark: результаты шумные и меняются от запуска к запуску.`;
      runLayoutTest.disabled = false;
      runLayoutTest.textContent = "Запустить ещё раз";
    });
  });
})();
