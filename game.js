(() => {
  "use strict";

  const STORY = window.LINGXI_STORY;
  if (!STORY || !Array.isArray(STORY.evidence) || STORY.evidence.length !== 24) {
    document.body.innerHTML = '<main class="fatal-error"><h1>档案载入失败</h1><p>剧情数据不完整，请刷新页面。</p></main>';
    return;
  }

  const STORAGE_KEY = "lingxi-paper-horse-v2";
  const VERSION = 2;
  const evidenceById = new Map(STORY.evidence.map((item) => [item.id, item]));
  const evidenceByKeyword = new Map(STORY.evidence.map((item) => [item.keyword, item]));
  const chapterById = new Map(STORY.chapters.map((item) => [item.id, item]));
  const endings = STORY.endings || STORY.chapters.find((item) => item.endings)?.endings || {};
  const knowledgeGates = {
    "沈知遥": "ev-01", "沈婉": "ev-01", "周砚": "ev-07", "陈守铺": "ev-11", "罗庆生": "ev-05",
    "临溪纸马铺": "ev-01", "柳树渡": "ev-03", "临水号": "ev-13", "临溪镇公所": "ev-05", "沈氏旧祠": "ev-09", "怀川市": "ev-08",
  };

  const el = (id) => document.getElementById(id);
  const shell = el("app-shell");
  const cover = el("case-cover");
  const evidenceContent = el("evidence-content");
  const globalSearch = el("global-search");
  const searchForm = el("search-form");
  const searchInput = el("search-input");
  const searchFeedback = el("search-feedback");
  const currentQuestion = el("current-question");
  const chapterProgress = el("chapter-progress");
  const recentClues = el("recent-clues");
  const cluebook = el("cluebook");
  const hintPanel = el("hint-panel");
  const updateBanner = el("update-banner");
  const endingActions = el("ending-actions");

  let state = loadState();
  let hintLevel = 0;
  let lastFocus = null;

  function defaultState() {
    return {
      version: VERSION,
      started: false,
      searched: [],
      read: [],
      archived: [],
      recent: [],
      currentId: null,
      failures: 0,
      ending: null,
      updatedAt: Date.now(),
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && parsed.version === VERSION) return { ...defaultState(), ...parsed };
    } catch {
      // A damaged local save should never stop the investigation.
    }
    return defaultState();
  }

  function saveState() {
    state.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function addUnique(list, value) {
    if (!list.includes(value)) list.push(value);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeKeyword(value) {
    return value.trim().replace(/\s+/g, "");
  }

  function isChineseKeyword(value) {
    return /^[\u3400-\u9fff]+$/.test(value);
  }

  function prerequisitesMet(record) {
    return (record.prerequisites || []).every((id) => state.read.includes(id));
  }

  function currentRecord() {
    return evidenceById.get(state.currentId) || null;
  }

  function beginInvestigation() {
    state.started = true;
    const first = STORY.evidence[0];
    addUnique(state.searched, first.id);
    saveState();
    if (searchInput) searchInput.disabled = false;
    openEvidence(first.id);
    shell?.classList.add("is-started");
    cover?.setAttribute("hidden", "");
  }

  function openEvidence(id) {
    const record = evidenceById.get(id);
    if (!record || !prerequisitesMet(record)) return;
    state.currentId = id;
    addUnique(state.searched, id);
    addUnique(state.read, id);
    state.recent = [id, ...state.recent.filter((item) => item !== id)].slice(0, 3);
    state.failures = 0;
    hintLevel = 0;
    saveState();
    renderEvidence(record);
    renderChrome();
    closeOverlays();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderEvidence(record) {
    const chapter = chapterById.get(record.chapter);
    evidenceContent.innerHTML = `
      <article class="evidence-document" data-evidence="${escapeHtml(record.id)}">
        <header class="evidence-header">
          <div>
            <p class="kicker">${escapeHtml(record.type)} · ${escapeHtml(record.archiveNo)}</p>
            <h1>${escapeHtml(record.title)}</h1>
          </div>
          <span class="credibility">${escapeHtml(record.credibility)}</span>
        </header>
        <dl class="evidence-meta">
          <div><dt>来源</dt><dd>${escapeHtml(record.source)}</dd></div>
          <div><dt>日期</dt><dd>${escapeHtml(record.date)}</dd></div>
          <div><dt>地点</dt><dd>${escapeHtml(record.location)}</dd></div>
          <div><dt>章节</dt><dd>${escapeHtml(chapter?.title || record.chapter)}</dd></div>
        </dl>
        ${renderVisual(record)}
        <section class="evidence-body">${record.body}</section>
        <section class="finding-strip">
          <p class="kicker">本页改变了什么</p>
          <p>${escapeHtml(record.summary)}</p>
        </section>
        <section class="direction-strip">
          <p class="kicker">值得继续查的方向</p>
          <p>${escapeHtml(record.nextDirection)}</p>
        </section>
        <footer class="evidence-actions">
          <button type="button" class="command-button" data-archive="${escapeHtml(record.id)}">
            ${state.archived.includes(record.id) ? "已加入线索簿" : "加入线索簿"}
          </button>
          ${record.id === STORY.evidence.at(-1).id ? renderEndingButtons() : ""}
        </footer>
      </article>
    `;
    const counter = el("page-counter");
    if (counter) counter.textContent = `${String(STORY.evidence.indexOf(record) + 1).padStart(2, "0")}/24`;
    const stageTitle = document.querySelector(".stage-heading h2");
    if (stageTitle) stageTitle.textContent = `${record.archiveNo} · ${record.title}`;
    if (record.id === STORY.evidence.at(-1).id && state.ending) renderEnding(state.ending);
  }

  function visualAsset(record) {
    const visual = typeof record.visual === "string" ? record.visual : record.visual?.id;
    const manifest = window.LINGXI_VISUALS || {};
    return manifest[record.id] || manifest[visual] || record.visual?.path || `assets/evidence/${record.id}.svg`;
  }

  function renderVisual(record) {
    const src = visualAsset(record);
    const modes = { "ev-01": "flip", "ev-03": "compare", "ev-11": "compare", "ev-15": "reveal", "ev-16": "compare", "ev-22": "compare" };
    const mode = typeof record.visual === "object" ? record.visual.mode : (modes[record.id] || "inspect");
    const alt = typeof record.visual === "object" && record.visual.alt
      ? record.visual.alt
      : `${record.title}的证物图像`;
    if (mode === "flip") {
      return `<figure class="evidence-visual flip-evidence" data-flipped="false">
        <button type="button" class="visual-button" data-action="flip" aria-pressed="false">
          <span class="visual-face visual-front"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"></span>
          <span class="visual-face visual-back"><span class="receipt-back">2023年8月30日<br>取货人：沈知遥<br><strong>向河第二间</strong></span></span>
        </button><figcaption>点击翻到证物背面</figcaption></figure>`;
    }
    if (mode === "compare") {
      return `<figure class="evidence-visual compare-evidence">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
        <input type="range" min="0" max="100" value="52" aria-label="对照新旧档案" data-action="compare">
        <div class="comparison-note" style="--reveal:52%">旧页无此姓名，新页墨色未干。</div>
        <figcaption>拖动滑块对照两份记录</figcaption></figure>`;
    }
    if (mode === "reveal") {
      return `<figure class="evidence-visual reveal-evidence" data-revealed="false">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
        <button type="button" class="reveal-seal" data-action="reveal">揭开朱砂覆盖</button>
        <p class="hidden-inscription">第十三道划痕旁，是沈知遥的出生日期。</p>
        <figcaption>覆盖层下似乎还有刻痕</figcaption></figure>`;
    }
    return `<figure class="evidence-visual inspect-evidence">
      <button type="button" class="visual-button" data-action="zoom" aria-label="放大查看${escapeHtml(record.title)}">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
      </button><figcaption>点击图片放大检查</figcaption></figure>`;
  }

  function renderEndingButtons() {
    return `<div class="ending-choices" id="ending-actions">
      <button type="button" class="ending-button" data-ending="publish">公开档案</button>
      <button type="button" class="ending-button secondary" data-ending="seal">封存账本</button>
    </div>`;
  }

  function renderEnding(kind) {
    const target = document.querySelector(".ending-result");
    target?.remove();
    const configured = endings[kind];
    const copy = configured?.text || configured || (kind === "publish"
      ? "你把二十四份档案交给外地警方。临溪镇的名字第一次登上全国新闻，但三名幸存者从此失去联系。"
      : "你把账本封回木箱。沈婉和周砚暂时安全，七月半那晚，纸马铺门口却多出一匹没有点眼的青马。");
    const section = document.createElement("section");
    section.className = `ending-result ending-${kind}`;
    section.innerHTML = `<p class="kicker">结局记录</p><h2>${escapeHtml(configured?.title || (kind === "publish" ? "旧名见光" : "河门未开"))}</h2><p>${escapeHtml(copy)}</p><p class="late-postscript">次日零点，网站自动新增一行：附言上传于陈守铺失踪后的第二天。</p>`;
    document.querySelector(".evidence-document")?.append(section);
    document.body.dataset.ending = kind;
  }

  function handleSearch(raw) {
    const query = normalizeKeyword(raw);
    if (!query) return searchError("请输入关键词", "搜索框里还是空的。回看当前证物中的姓名、地点、日期或物件。", false);
    if (!isChineseKeyword(query)) return searchError("格式不对", "每次只能输入一个连续中文关键词，不能包含数字、空格或标点。", false);
    const record = evidenceByKeyword.get(query);
    if (!record) return searchError("没有找到相关记录", `档案中没有“${escapeHtml(query)}”。先检查最近证物里的专有名词。`, true);
    if (!prerequisitesMet(record)) {
      return searchError("证据不足", "这个词似乎存在，但当前档案还缺少一份前置证据。先完成正在调查的问题。", true);
    }
    addUnique(state.searched, record.id);
    state.failures = 0;
    saveState();
    searchFeedback.innerHTML = `<div class="search-hit" role="status">
      <p class="kicker">检索命中 · ${escapeHtml(record.type)}</p>
      <h2>${escapeHtml(record.title)}</h2>
      <p>${escapeHtml(record.source)}，${escapeHtml(record.date)}</p>
      <button type="button" class="command-button" data-open-evidence="${escapeHtml(record.id)}">拆封阅读</button>
    </div>`;
    searchFeedback.hidden = false;
  }

  function searchError(title, message, countsFailure) {
    if (countsFailure) state.failures += 1;
    saveState();
    searchFeedback.innerHTML = `<div class="search-miss" role="status"><h2>${title}</h2><p>${message}</p>${state.failures >= 2 ? '<button type="button" class="text-button" data-show-hint>查看调查提示</button>' : ""}</div>`;
    searchFeedback.hidden = false;
    renderHintPanel();
  }

  function renderChrome() {
    const record = currentRecord();
    if (!record) return;
    const chapter = chapterById.get(record.chapter);
    const chapterRecords = STORY.evidence.filter((item) => item.chapter === record.chapter);
    const readInChapter = chapterRecords.filter((item) => state.read.includes(item.id)).length;
    currentQuestion.textContent = record.question || chapter?.question || "确认这份证据与沈婉失踪的关系。";
    chapterProgress.innerHTML = `<strong>${escapeHtml(chapter?.title || "调查中")}</strong><span>${readInChapter}/${chapterRecords.length} 份关键证据</span><progress max="${chapterRecords.length}" value="${readInChapter}"></progress>`;
    recentClues.innerHTML = state.recent.map((id) => {
      const item = evidenceById.get(id);
      return `<button type="button" data-open-evidence="${id}"><span>${escapeHtml(item.archiveNo)}</span>${escapeHtml(item.title)}</button>`;
    }).join("") || "<p>尚无新证据</p>";
    renderCluebook("evidence");
    renderHintPanel();
    document.querySelectorAll("[data-chapter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.chapter === record.chapter);
    });
  }

  function renderCluebook(tab) {
    document.querySelectorAll("[data-clue-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.clueTab === tab));
    if (tab === "people") {
      cluebook.innerHTML = renderKnowledgeCards(STORY.people, "person");
      return;
    }
    if (tab === "places") {
      cluebook.innerHTML = renderKnowledgeCards(STORY.places, "place");
      return;
    }
    if (tab === "timeline") {
      const visible = STORY.evidence.filter((item) => state.read.includes(item.id));
      cluebook.innerHTML = `<ol class="timeline">${visible.map((item) => `<li><time>${escapeHtml(item.date)}</time><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.location)}</span></li>`).join("")}</ol>`;
      return;
    }
    cluebook.innerHTML = state.read.map((id) => {
      const item = evidenceById.get(id);
      const archived = state.archived.includes(id);
      return `<button type="button" class="clue-entry ${archived ? "is-archived" : ""}" data-open-evidence="${id}"><span>${escapeHtml(item.archiveNo)}</span><strong>${escapeHtml(item.title)}</strong><small>${archived ? "已归档" : "已阅读"}</small></button>`;
    }).join("") || '<p class="empty-state">拆封证据后会出现在这里。</p>';
  }

  function renderKnowledgeCards(items = [], kind) {
    const readSet = new Set(state.read);
    const cards = items.filter((item) => {
      if (item.evidenceIds) return item.evidenceIds.some((id) => readSet.has(id));
      const gate = knowledgeGates[item.name];
      return !gate || readSet.has(gate);
    });
    return cards.map((item) => `<article class="knowledge-card ${kind}"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("") || '<p class="empty-state">还没有足够证据。</p>';
  }

  function renderHintPanel() {
    const record = currentRecord();
    if (!record) return;
    const autoLevel = state.failures >= 4 ? 2 : state.failures >= 2 ? 1 : 0;
    hintLevel = Math.max(hintLevel, autoLevel);
    const visibleHints = (record.hints || []).slice(0, hintLevel);
    hintPanel.innerHTML = `<p class="kicker">分级提示</p>${visibleHints.map((hint, index) => `<p><strong>${index + 1}</strong> ${escapeHtml(hint)}</p>`).join("") || "<p>先观察证物，再决定要查的人、地点或物件。</p>"}<button type="button" class="text-button" data-more-hint ${hintLevel >= 3 ? "disabled" : ""}>${hintLevel >= 3 ? "提示已全部显示" : "再给一点提示"}</button>`;
  }

  function archiveEvidence(id) {
    addUnique(state.archived, id);
    saveState();
    const button = document.querySelector(`[data-archive="${CSS.escape(id)}"]`);
    if (button) button.textContent = "已加入线索簿";
    renderCluebook("evidence");
  }

  function closeOverlays() {
    document.querySelectorAll("[data-overlay].is-open").forEach((node) => node.classList.remove("is-open"));
    searchFeedback.hidden = true;
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
    lastFocus = null;
  }

  function openMobilePanel(name, trigger) {
    lastFocus = trigger;
    const panel = name === "clues" ? el("clue-sidebar") : name === "case" ? el("case-sidebar") : name === "hint" ? hintPanel : globalSearch;
    if (!panel) return;
    if (panel.classList.contains("is-open")) {
      closeOverlays();
      return;
    }
    document.querySelectorAll("[data-overlay].is-open").forEach((node) => node.classList.remove("is-open"));
    panel.dataset.overlay = "true";
    panel.classList.add("is-open");
    panel.querySelector("button, input, [tabindex]")?.focus();
  }

  function jumpToChapter(chapterId) {
    const opened = STORY.evidence.find((item) => item.chapter === chapterId && state.read.includes(item.id));
    if (opened) {
      openEvidence(opened.id);
      return;
    }
    const firstLocked = STORY.evidence.find((item) => item.chapter === chapterId);
    if (firstLocked && prerequisitesMet(firstLocked)) {
      openEvidence(firstLocked.id);
      return;
    }
    searchFeedback.innerHTML = '<div class="search-miss" role="status"><h2>章节尚未解锁</h2><p>先把当前线索链往前推进，再回来看这一章。</p></div>';
    searchFeedback.hidden = false;
  }

  function resetProgress() {
    const confirmed = window.confirm("只清除这台设备上的新版游戏进度，不会删除网站文件。确定重新开始吗？");
    if (!confirmed) return;
    state = defaultState();
    saveState();
    location.reload();
  }

  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-evidence]");
    const archive = event.target.closest("[data-archive]");
    const tab = event.target.closest("[data-clue-tab]");
    const nav = event.target.closest("[data-mobile-panel]");
    const chapter = event.target.closest("[data-chapter]");
    const action = event.target.closest("[data-action]");
    const ending = event.target.closest("[data-ending]");
    if (open) openEvidence(open.dataset.openEvidence);
    if (archive) archiveEvidence(archive.dataset.archive);
    if (tab) renderCluebook(tab.dataset.clueTab);
    if (nav) openMobilePanel(nav.dataset.mobilePanel, nav);
    if (chapter) jumpToChapter(chapter.dataset.chapter);
    if (event.target.closest("[data-close-overlay]")) closeOverlays();
    if (event.target.closest("[data-show-hint]")) openMobilePanel("hint", event.target.closest("button"));
    if (event.target.closest("[data-more-hint]")) { hintLevel = Math.min(3, hintLevel + 1); renderHintPanel(); }
    if (ending) { state.ending = ending.dataset.ending; saveState(); renderEnding(state.ending); }
    if (action?.dataset.action === "flip") {
      const figure = action.closest(".flip-evidence");
      const flipped = figure.dataset.flipped !== "true";
      figure.dataset.flipped = String(flipped);
      action.setAttribute("aria-pressed", String(flipped));
    }
    if (action?.dataset.action === "zoom") action.closest(".evidence-visual")?.classList.toggle("is-zoomed");
    if (action?.dataset.action === "reveal") action.closest(".reveal-evidence").dataset.revealed = "true";
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches('[data-action="compare"]')) {
      event.target.closest(".compare-evidence")?.style.setProperty("--reveal", `${event.target.value}%`);
    }
  });

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSearch(searchInput.value);
  });
  el("start-game")?.addEventListener("click", beginInvestigation);
  el("reset-progress")?.addEventListener("click", resetProgress);
  el("show-intro")?.addEventListener("click", () => {
    searchFeedback.innerHTML = `<div class="search-hit"><p class="kicker">案情提要</p><h2>三年前失踪的人，先用了你的名字</h2><p>你叫沈知遥。2026年七月，一只没有投递记录的旧包裹出现在住所门禁室。包内收据属于失踪三年的表姐沈婉，领取栏却写着你的名字。</p><p>目标：确认沈婉是否仍活着，并阻止临溪镇在七月半完成所谓“开河门”。</p></div>`;
    searchFeedback.hidden = false;
  });
  el("share-game")?.addEventListener("click", async () => {
    const data = { title: "临溪纸马铺", text: "从一只无名包裹开始，查清临溪河祭旧案。", url: location.href };
    if (navigator.share && location.protocol !== "file:") {
      try { await navigator.share(data); return; } catch { /* use clipboard fallback */ }
    }
    try {
      await navigator.clipboard.writeText(location.href);
      searchFeedback.innerHTML = '<div class="search-hit"><h2>链接已复制</h2><p>手机和电脑都可以继续调查。</p></div>';
    } catch {
      searchFeedback.innerHTML = `<div class="search-hit"><h2>分享案卷</h2><p>${escapeHtml(location.href)}</p></div>`;
    }
    searchFeedback.hidden = false;
  });
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    const button = el("install-game");
    if (button) button.hidden = false;
  });
  el("install-game")?.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    el("install-game").hidden = true;
  });
  updateBanner?.addEventListener("click", () => location.reload());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOverlays();
    if (event.key === "/" && document.activeElement !== searchInput) { event.preventDefault(); searchInput?.focus(); }
  });

  window.addEventListener("online", () => document.body.classList.remove("is-offline"));
  window.addEventListener("offline", () => document.body.classList.add("is-offline"));

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").then((registration) => {
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller && updateBanner) updateBanner.hidden = false;
        });
      });
    }).catch(() => {});
  }

  if (state.started) {
    shell?.classList.add("is-started");
    cover?.setAttribute("hidden", "");
    if (searchInput) searchInput.disabled = false;
    openEvidence(state.currentId || STORY.evidence[0].id);
  } else {
    shell?.classList.remove("is-started");
    cover?.removeAttribute("hidden");
    if (searchInput) searchInput.disabled = true;
  }
})();
