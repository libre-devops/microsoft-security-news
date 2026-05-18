(function () {
  "use strict";

  // ============================
  // State
  // ============================
  let articles = [];
  let filteredArticles = [];

  let searchQuery = "";
  let sortBy = "date-desc";
  let currentSource = "all";
  let showBookmarksOnly = false;

  const bookmarks = new Set(
    JSON.parse(localStorage.getItem("mssecnews-bookmarks") || "[]")
  );

  const sourceColors = {};
  const colorPalette = [
    "#0078D4",
    "#00BCF2",
    "#7719AA",
    "#E3008C",
    "#D83B01",
    "#107C10",
    "#008575",
    "#4F6BED",
  ];

  // ============================
  // DOM
  // ============================
  const articlesGrid = document.getElementById("articles-grid");
  const loadingEl = document.getElementById("loading");
  const noResultsEl = document.getElementById("no-results");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-by");
  const dateFilter = document.getElementById("date-filter");
  const themeToggle = document.getElementById("theme-toggle");
  const filterPills = document.getElementById("filter-pills");
  const showingCount = document.getElementById("showing-count");
  const lastUpdated = document.getElementById("last-updated");
  const totalCount = document.getElementById("total-count");
  const toastEl = document.getElementById("toast");
  const bookmarksToggle = document.getElementById("bookmarks-toggle");

  // ============================
  // Init
  // ============================
  async function init() {
    loadTheme();
    registerServiceWorker();
    setupEventListeners();
    await loadData();
  }

  // ============================
  // Service Worker
  // ============================
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  // ============================
  // Load Data
  // ============================
  async function loadData() {
    showLoading(true);

    try {
      const response = await fetch("data/feeds.json");

      if (!response.ok) {
        throw new Error("Feed load failed");
      }

      const data = await response.json();

      articles = data.articles || [];

      assignSourceColors();
      updateHeaderStats(data);
      renderFilters();
      applyFilters();
    } catch (err) {
      console.error(err);

      articlesGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem;">
          <p style="font-size:1.3rem;">📡 No feed data available yet</p>
          <p>Run the feed fetcher workflow and refresh.</p>
        </div>
      `;
    }

    showLoading(false);
  }

  function assignSourceColors() {
    const uniqueSources = [...new Set(articles.map((a) => a.source_id))];

    uniqueSources.forEach((sourceId, index) => {
      sourceColors[sourceId] =
        colorPalette[index % colorPalette.length];
    });
  }

  function updateHeaderStats(data) {
    totalCount.textContent = `${articles.length} articles`;

    if (data.lastUpdated) {
      const dt = new Date(data.lastUpdated);

      lastUpdated.textContent =
        "Last updated: " +
        dt.toLocaleString("en-GB", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
    }
  }

  // ============================
  // Filters
  // ============================
  function renderFilters() {
    const sourceCounts = {};

    articles.forEach((article) => {
      if (!sourceCounts[article.source_id]) {
        sourceCounts[article.source_id] = {
          name: article.source,
          count: 0,
        };
      }

      sourceCounts[article.source_id].count++;
    });

    let html = `
      <button class="pill active" data-source="all">
        All <span class="count">${articles.length}</span>
      </button>
    `;

    Object.entries(sourceCounts).forEach(([sourceId, source]) => {
      html += `
        <button class="pill" data-source="${sourceId}">
          ${escapeHtml(source.name)}
          <span class="count">${source.count}</span>
        </button>
      `;
    });

    filterPills.innerHTML = html;
  }

  function applyFilters() {
    let result = [...articles];

    if (currentSource !== "all") {
      result = result.filter(
        (article) => article.source_id === currentSource
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();

      result = result.filter((article) =>
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.source.toLowerCase().includes(q) ||
        article.author.toLowerCase().includes(q)
      );
    }

    const dateVal = dateFilter.value;

    if (dateVal !== "all") {
      const now = new Date();
      const cutoff = new Date();

      switch (dateVal) {
        case "today":
          cutoff.setHours(0, 0, 0, 0);
          break;
        case "week":
          cutoff.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }

      result = result.filter(
        (article) => new Date(article.published) >= cutoff
      );
    }

    if (showBookmarksOnly) {
      result = result.filter((article) =>
        bookmarks.has(article.link)
      );
    }

    switch (sortBy) {
      case "date-asc":
        result.sort(
          (a, b) =>
            new Date(a.published) - new Date(b.published)
        );
        break;

      case "source":
        result.sort((a, b) =>
          a.source.localeCompare(b.source)
        );
        break;

      default:
        result.sort(
          (a, b) =>
            new Date(b.published) - new Date(a.published)
        );
    }

    filteredArticles = result;

    showingCount.textContent =
      `Showing ${result.length} of ${articles.length} articles`;

    renderArticles();
  }

  // ============================
  // Rendering
  // ============================
  function renderArticles() {
    if (!filteredArticles.length) {
      articlesGrid.innerHTML = "";
      noResultsEl.classList.add("visible");
      return;
    }

    noResultsEl.classList.remove("visible");

    articlesGrid.innerHTML = filteredArticles
      .map(renderCard)
      .join("");
  }

  function renderCard(article) {
    const color =
      sourceColors[article.source_id] || "#0078D4";

    const isBookmarked = bookmarks.has(article.link);

    const date = new Date(article.published);

    const dateStr = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return `
      <article class="article-card">
        <div class="card-header">
          <span
            class="blog-tag"
            style="background:${color}18;color:${color};"
          >
            ${escapeHtml(article.source)}
          </span>

          <button
            class="bookmark-btn ${isBookmarked ? "bookmarked" : ""}"
            data-action="bookmark"
            data-link="${encodeURIComponent(article.link)}"
          >
            ${isBookmarked ? "⭐" : "☆"}
          </button>
        </div>

        <h3 class="article-title">
          <a
            href="${escapeHtml(article.link)}"
            target="_blank"
            rel="noopener"
          >
            ${escapeHtml(article.title)}
          </a>
        </h3>

        <div class="article-meta">
          <span>✍️ ${escapeHtml(article.author)}</span>
          <span>📅 ${dateStr}</span>
        </div>

        <p class="article-summary">
          ${escapeHtml(article.summary)}
        </p>
      </article>
    `;
  }

  // ============================
  // Theme
  // ============================
  function loadTheme() {
    const saved =
      localStorage.getItem("mssecnews-theme") || "light";

    document.documentElement.setAttribute("data-theme", saved);

    themeToggle.textContent =
      saved === "dark" ? "☀️" : "🌙";
  }

  function toggleTheme() {
    const current =
      document.documentElement.getAttribute("data-theme");

    const next = current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", next);

    localStorage.setItem("mssecnews-theme", next);

    themeToggle.textContent =
      next === "dark" ? "☀️" : "🌙";
  }

  // ============================
  // Bookmarks
  // ============================
  function toggleBookmark(link) {
    if (bookmarks.has(link)) {
      bookmarks.delete(link);
      showToast("Bookmark removed");
    } else {
      bookmarks.add(link);
      showToast("⭐ Bookmarked");
    }

    localStorage.setItem(
      "mssecnews-bookmarks",
      JSON.stringify([...bookmarks])
    );

    applyFilters();
  }

  // ============================
  // Helpers
  // ============================
  function showLoading(show) {
    loadingEl.classList.toggle("visible", show);
  }

  let toastTimeout;

  function showToast(message) {
    clearTimeout(toastTimeout);

    toastEl.textContent = message;
    toastEl.classList.add("visible");

    toastTimeout = setTimeout(() => {
      toastEl.classList.remove("visible");
    }, 2500);
  }

  const escapeDiv = document.createElement("div");

  function escapeHtml(str) {
    if (!str) return "";

    escapeDiv.textContent = str;
    return escapeDiv.innerHTML;
  }

  // ============================
  // Events
  // ============================
  function setupEventListeners() {
    let debounce;

    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounce);

      debounce = setTimeout(() => {
        searchQuery = e.target.value.trim();
        applyFilters();
      }, 250);
    });

    sortSelect.addEventListener("change", (e) => {
      sortBy = e.target.value;
      applyFilters();
    });

    dateFilter.addEventListener("change", applyFilters);

    themeToggle.addEventListener("click", toggleTheme);

    bookmarksToggle.addEventListener("click", () => {
      showBookmarksOnly = !showBookmarksOnly;

      bookmarksToggle.classList.toggle(
        "active",
        showBookmarksOnly
      );

      bookmarksToggle.textContent = showBookmarksOnly
        ? "⭐ Showing Bookmarks"
        : "⭐ Bookmarks";

      applyFilters();
    });

    filterPills.addEventListener("click", (e) => {
      const pill = e.target.closest("[data-source]");
      if (!pill) return;

      filterPills
        .querySelectorAll(".pill")
        .forEach((p) => p.classList.remove("active"));

      pill.classList.add("active");

      currentSource = pill.dataset.source;

      applyFilters();
    });

    articlesGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      if (btn.dataset.action === "bookmark") {
        toggleBookmark(
          decodeURIComponent(btn.dataset.link)
        );
      }
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();