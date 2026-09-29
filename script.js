/* =========================================================
   BAKHIRAFOOT PRO
   LIVE + SCORES + NAVIGATION + PROFESSIONAL MATCH DETAILS
========================================================= */

const API_BASE = "";

let currentMatches = [];
let currentDate = null;
let currentFilter = "all";
let currentOpenedFixture = null;

/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizeMatches(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.response)) return data.response;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.fixtures)) return data.fixtures;
  if (Array.isArray(data?.matches)) return data.matches;
  return [];
}

function extractMatchDetails(data) {
  if (!data) return null;
  if (data?.data && typeof data.data === "object") return data.data;
  if (data?.match && typeof data.match === "object") {
    return data.match;
  }
  return data;
}

/* =========================================================
   MATCH HELPERS
========================================================= */

function getStatus(match) {
  return (
    match?.fixture?.status?.short ||
    match?.status?.short ||
    match?.status_code ||
    match?.short_status ||
    match?.status?.long ||
    match?.status ||
    "MATCH"
  );
}

function getMinute(match) {
  return (
    match?.fixture?.status?.elapsed ??
    match?.status?.elapsed ??
    match?.minute ??
    null
  );
}

function getHome(match) {
  return (
    match?.teams?.home?.name ||
    match?.home?.name ||
    (typeof match?.home === "string" ? match.home : "") ||
    "Domicile"
  );
}

function getAway(match) {
  return (
    match?.teams?.away?.name ||
    match?.away?.name ||
    (typeof match?.away === "string" ? match.away : "") ||
    "Extérieur"
  );
}

function getHomeId(match) {
  return (
    match?.teams?.home?.id ||
    match?.home?.id ||
    match?.home_id ||
    null
  );
}

function getAwayId(match) {
  return (
    match?.teams?.away?.id ||
    match?.away?.id ||
    match?.away_id ||
    null
  );
}

function getHomeLogo(match) {
  return (
    match?.teams?.home?.logo ||
    match?.home?.logo ||
    match?.home_logo ||
    ""
  );
}

function getAwayLogo(match) {
  return (
    match?.teams?.away?.logo ||
    match?.away?.logo ||
    match?.away_logo ||
    ""
  );
}

function getHomeScore(match) {
  return (
    match?.goals?.home ??
    match?.score?.fulltime?.home ??
    match?.score?.home ??
    match?.home_score ??
    match?.homeScore ??
    "-"
  );
}

function getAwayScore(match) {
  return (
    match?.goals?.away ??
    match?.score?.fulltime?.away ??
    match?.score?.away ??
    match?.away_score ??
    match?.awayScore ??
    "-"
  );
}

function getLeague(match) {
  return (
    match?.league?.name ||
    match?.competition?.name ||
    (typeof match?.league === "string" ? match.league : "") ||
    "Football"
  );
}

function getFixtureId(match) {
  return (
    match?.fixture?.slug ||
    match?.slug ||
    match?.match_slug ||
    match?.fixture?.id ||
    match?.id ||
    match?.match_id ||
    null
  );
}

function statusLabel(match) {
  const status = String(getStatus(match)).toUpperCase();
  const minute = getMinute(match);

  if (["1H", "2H", "LIVE", "ET", "P", "BT"].includes(status) || status.includes("LIVE")) {
    return minute !== null && minute !== undefined
      ? `🔴 LIVE ${minute}'`
      : "🔴 LIVE";
  }
  if (status === "HT" || status.includes("HALF")) return "⏸ MI-TEMPS";
  if (status === "FT" || status.includes("FINISHED") || status.includes("ENDED")) return "✅ TERMINÉ";
  if (status === "PST" || status.includes("POSTPONED")) return "⏸ REPORTÉ";
  if (status === "CANC" || status.includes("CANCEL")) return "❌ ANNULÉ";
  if (status === "NS" || status.includes("NOT STARTED")) return "🕒 À VENIR";
  return status || "MATCH";
}

function sortMatchesByImportance(matches) {
  return [...matches].sort((a, b) => {
    const sa = String(getStatus(a)).toUpperCase();
    const sb = String(getStatus(b)).toUpperCase();
    const liveA = ["1H", "2H", "LIVE", "ET", "P", "BT"].includes(sa) || sa.includes("LIVE") ? 1000 : 0;
    const liveB = ["1H", "2H", "LIVE", "ET", "P", "BT"].includes(sb) || sb.includes("LIVE") ? 1000 : 0;
    return (liveB - liveA);
  });
}

function teamHTML(name, logo) {
  return `
    <div class="team">
      ${logo
        ? `<img class="teamLogo" src="${escapeHTML(logo)}" alt="${escapeHTML(name)}" loading="lazy">`
        : `<div class="teamLogo">⚽</div>`}
      <span>${escapeHTML(name)}</span>
    </div>
  `;
}

/* =========================================================
   MATCH CARD
========================================================= */

function createMatchHTML(match, index) {
  const home = getHome(match);
  const away = getAway(match);
  const fixtureId = getFixtureId(match);
  const date = match?.fixture?.date || match?.date || null;

  return `
    <div
      class="match-card"
      data-match-index="${index}"
      data-fixture-id="${escapeHTML(fixtureId || "")}" 
      onclick="openMatchDetails(${index})"
    >
      <div class="flash-league">
        <span>🏆 ${escapeHTML(getLeague(match))}</span>
      </div>

      <div class="flash-match">
        <div class="flash-time">
          <span>${escapeHTML(statusLabel(match))}</span>
          ${date ? `<small>${escapeHTML(formatDate(date))}</small>` : ""}
        </div>

        <div class="flash-teams">
          <div class="flash-team">${teamHTML(home, getHomeLogo(match))}</div>
          <div class="flash-team">${teamHTML(away, getAwayLogo(match))}</div>
        </div>

        <div class="flash-score">
          <strong>${escapeHTML(getHomeScore(match))}</strong>
          <strong>${escapeHTML(getAwayScore(match))}</strong>
        </div>
      </div>
    </div>
  `;
}

function emptyCard(message) {
  return `
    <div class="card">
      <div class="newsImg">⚽</div>
      <h3>BakhiraFoot</h3>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

/* =========================================================
   NAVIGATION
========================================================= */

function go(page) {
  document.querySelectorAll(".page").forEach(section => section.classList.remove("active"));
  document.querySelectorAll("nav button").forEach(button => button.classList.remove("active"));

  const target = $(page);
  if (!target) return;
  target.classList.add("active");

  document.querySelectorAll("nav button").forEach(button => {
    if (button.dataset.page === page) button.classList.add("active");
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (page === "home") renderHome();
  if (page === "scores") {
    createDateBar();
    loadMatches(currentDate);
  }
  if (page === "leagues") renderLeagues();
  if (page === "teams") renderTeams();
  if (page === "news") renderNews();
}

function toast(message) {
  const box = $("toast");
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    box.style.display = "none";
  }, 2500);
}

/* =========================================================
   LOAD LIVE
========================================================= */

async function loadLive() {
  const liveElement = $("live");

  try {
    if (liveElement) liveElement.textContent = "🟡 Chargement du LIVE...";

    const response = await fetch(`${API_BASE}/api?live=all`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const matches = sortMatchesByImportance(normalizeMatches(data));
    currentMatches = matches;

    if (liveElement) {
      liveElement.textContent = matches.length
        ? `🔴 ${matches.length} MATCH(S) LIVE`
        : "⚪ Aucun match live";
    }

    const list = $("scoreList");
    if (list) {
      list.innerHTML = matches.length
        ? matches.map((match, index) => createMatchHTML(match, index)).join("")
        : emptyCard("Aucun match en direct actuellement.");
    }

    return matches;
  } catch (error) {
    console.error("LIVE ERROR:", error);
    if (liveElement) liveElement.textContent = "⚪ Live indisponible";
    return [];
  }
}

/* =========================================================
   LOAD BY DATE
========================================================= */

async function loadMatches(date) {
  const list = $("scoreList");
  if (!list) return;

  currentDate = date || new Date().toISOString().split("T")[0];
  list.innerHTML = emptyCard("Chargement des matchs...");

  try {
    const response = await fetch(`${API_BASE}/api?date=${encodeURIComponent(currentDate)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    let matches = sortMatchesByImportance(normalizeMatches(data));

    if (currentFilter && currentFilter !== "all") {
      matches = matches.filter(match =>
        normalizeText(getLeague(match)).includes(normalizeText(currentFilter))
      );
    }

    currentMatches = matches;

    list.innerHTML = matches.length
      ? matches.map((match, index) => createMatchHTML(match, index)).join("")
      : emptyCard("Aucun match trouvé pour cette date.");
  } catch (error) {
    console.error("MATCHES ERROR:", error);
    list.innerHTML = emptyCard("Impossible de charger les matchs.");
  }
}

/* =========================================================
   DATE BAR
========================================================= */

function createDateBar() {
  const bar = $("dateBar");
  if (!bar) return;

  bar.innerHTML = "";
  const today = new Date();

  for (let i = -2; i <= 4; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const iso = date.toISOString().split("T")[0];

    let label;
    if (i === 0) label = "Aujourd'hui";
    else if (i === -1) label = "Hier";
    else if (i === 1) label = "Demain";
    else {
      label = date.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short"
      });
    }

    const button = document.createElement("button");
    button.textContent = label;
    if (iso === (currentDate || today.toISOString().split("T")[0])) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      bar.querySelectorAll("button").forEach(btn => btn.classList.remove("selected"));
      button.classList.add("selected");
      currentDate = iso;
      loadMatches(iso);
    });

    bar.appendChild(button);
  }
}

/* =========================================================
   LEAGUES / TEAMS / NEWS
========================================================= */

const leagues = [
  { name: "🏆 Champions League", key: "Champions League", country: "Europe" },
  { name: "🏴 Premier League", key: "Premier League", country: "England" },
  { name: "🇪🇸 La Liga", key: "La Liga", country: "Spain" },
  { name: "🇫🇷 Ligue 1", key: "Ligue 1", country: "France" },
  { name: "🇲🇦 Botola Pro", key: "Botola", country: "Morocco" }
];

function renderLeagues() {
  const grid = $("leagueGrid");
  if (!grid) return;
  grid.innerHTML = leagues.map(league => `
    <div class="league" data-league="${escapeHTML(league.key)}" onclick="filterLeague('${escapeHTML(league.key)}')" style="cursor:pointer">
      ${escapeHTML(league.name)}
      <small>${escapeHTML(league.country)}</small>
    </div>
  `).join("");
}

function filterLeague(league) {
  currentFilter = league;
  go("scores");
  toast(`🏆 ${league}`);
}

const teams = [
  { name: "Barcelona", logo: "🔵🔴", country: "Spain" },
  { name: "Real Madrid", logo: "⚪", country: "Spain" },
  { name: "Liverpool", logo: "🔴", country: "England" },
  { name: "Chelsea", logo: "🔵", country: "England" },
  { name: "Arsenal", logo: "🔴⚪", country: "England" },
  { name: "PSG", logo: "🔵🔴", country: "France" },
  { name: "Raja CA", logo: "🟢", country: "Morocco" },
  { name: "Wydad", logo: "🔴", country: "Morocco" }
];

function renderTeams() {
  const grid = $("teamGrid");
  if (!grid) return;
  grid.innerHTML = teams.map(team => `
    <div class="card" onclick="showTeam('${escapeHTML(team.name)}')" style="cursor:pointer">
      <div class="teamLogo" style="font-size:45px">${team.logo}</div>
      <h3>${escapeHTML(team.name)}</h3>
      <p>${escapeHTML(team.country)}</p>
    </div>
  `).join("");
}

function showTeam(name) {
  const detail = $("teamDetail");
  if (!detail) return;
  const team = teams.find(item => item.name === name);
  if (!team) return;

  detail.innerHTML = `
    <div class="card">
      <div style="text-align:center;font-size:55px">${team.logo}</div>
      <h2>${escapeHTML(team.name)}</h2>
      <p>${escapeHTML(team.country)}</p>
    </div>
  `;
  detail.scrollIntoView({ behavior: "smooth" });
}

const news = [
  { title: "BakhiraFoot", text: "Bienvenue sur BakhiraFoot : scores, matchs, compétitions et actualités football.", icon: "⚽" },
  { title: "Football mondial", text: "Retrouve les grandes compétitions et les résultats de tes équipes préférées.", icon: "🌍" },
  { title: "Botola Pro", text: "Suivez également le football marocain et les grands clubs de la Botola.", icon: "🇲🇦" }
];

function renderNews() {
  const grid = $("newsGrid");
  if (!grid) return;
  grid.innerHTML = news.map(item => `
    <div class="card">
      <div class="newsImg">${item.icon}</div>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.text)}</p>
    </div>
  `).join("");
}

function renderHomeNews() {
  const grid = $("homeNews");
  if (!grid) return;
  grid.innerHTML = news.map(item => `
    <div class="card">
      <div class="newsImg">${item.icon}</div>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.text)}</p>
    </div>
  `).join("");
}

async function renderHomeMatches() {
  const container = $("homeMatches");
  if (!container) return;

  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(`${API_BASE}/api?date=${today}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const matches = sortMatchesByImportance(normalizeMatches(data));

    if (!matches.length) {
      container.innerHTML = emptyCard("Aucun match aujourd'hui.");
      return;
    }

    currentMatches = matches.slice(0, 6);
    container.innerHTML = currentMatches.map((match, index) => createMatchHTML(match, index)).join("");
  } catch (error) {
    console.error("HOME MATCH ERROR:", error);
    container.innerHTML = emptyCard("Impossible de charger les matchs.");
  }
}

function renderTables() {
  const container = $("homeTables");
  if (!container) return;

  container.innerHTML = `
    <div class="table">
      <h3>🇪🇸 La Liga</h3>
      <table>
        <tr><th>#</th><th>Équipe</th><th>Pts</th></tr>
        <tr><td>1</td><td>Barcelona</td><td>--</td></tr>
        <tr><td>2</td><td>Real Madrid</td><td>--</td></tr>
        <tr><td>3</td><td>Atlético</td><td>--</td></tr>
      </table>
    </div>

    <div class="table">
      <h3>🇲🇦 Botola Pro</h3>
      <table>
        <tr><th>#</th><th>Équipe</th><th>Pts</th></tr>
        <tr><td>1</td><td>Raja CA</td><td>--</td></tr>
        <tr><td>2</td><td>Wydad</td><td>--</td></tr>
        <tr><td>3</td><td>FAR</td><td>--</td></tr>
      </table>
    </div>
  `;
}

function renderHome() {
  renderHomeMatches();
  renderTables();
  renderHomeNews();
}

/* =========================================================
   SEARCH / THEME / NAV
========================================================= */

function initFilters() {
  document.querySelectorAll(".filter[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter[data-filter]").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.filter || "all";
      if ($("scores")?.classList.contains("active")) loadMatches(currentDate);
      else go("scores");
    });
  });
}

function initSearch() {
  const input = $("search");
  if (!input) return;

  input.addEventListener("input", () => {
    const value = input.value.trim().toLowerCase();
    if (!value) {
      renderTeams();
      return;
    }

    go("teams");
    document.querySelectorAll("#teamGrid .card").forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(value) ? "" : "none";
    });
  });
}

function initTheme() {
  const button = $("theme");
  if (!button) return;

  const saved = localStorage.getItem("bakhirafoot-theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
    button.textContent = "☀";
  }

  button.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    button.textContent = dark ? "☀" : "☾";
    localStorage.setItem("bakhirafoot-theme", dark ? "dark" : "light");
  });
}

function initNavigation() {
  document.querySelectorAll("nav button[data-page]").forEach(button => {
    button.addEventListener("click", () => go(button.dataset.page));
  });
}

function startLiveRefresh() {
  setInterval(() => {
    if ($("scores")?.classList.contains("active")) loadLive();
  }, 60000);
}

/* =========================================================
   MATCH DETAILS - MODAL CSS
========================================================= */

function ensureDetailsStyles() {
  if ($("bf-details-styles")) return;

  const style = document.createElement("style");
  style.id = "bf-details-styles";
  style.textContent = `
    #bf-details-modal {
      position:fixed; inset:0; z-index:999999; display:none;
    }
    .bf-details-overlay {
      position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
      padding:18px; overflow:auto; background:rgba(0,0,0,.78); backdrop-filter:blur(7px);
    }
    .bf-details-modal-box {
      width:min(1180px,100%); max-height:94vh; overflow:auto; position:relative;
      background:var(--card,#fff); color:var(--text,#111827); border-radius:24px;
      padding:28px; box-shadow:0 30px 110px rgba(0,0,0,.45);
    }
    .bf-details-close {
      position:absolute; top:12px; right:12px; width:42px; height:42px; border:0;
      border-radius:50%; cursor:pointer; background:rgba(127,127,127,.14); color:inherit;
      font-size:18px; font-weight:900; z-index:20;
    }
    .bf-details-league{text-align:center;font-size:13px;font-weight:900;opacity:.65;margin-bottom:10px}
    .bf-details-status{text-align:center;margin-bottom:20px}
    .bf-details-status span{display:inline-flex;padding:7px 14px;border-radius:999px;background:rgba(220,38,38,.10);font-size:12px;font-weight:900}
    .bf-details-score-head{display:grid;grid-template-columns:1fr auto 1fr;gap:24px;align-items:center;text-align:center}
    .bf-details-team{display:flex;flex-direction:column;align-items:center;gap:9px;font-weight:900}
    .bf-details-team-logo{width:82px;height:82px;object-fit:contain}
    .bf-details-fallback{width:82px;height:82px;display:flex;align-items:center;justify-content:center;font-size:44px}
    .bf-details-team-name{line-height:1.25}
    .bf-details-score{font-size:40px;font-weight:950;white-space:nowrap}
    .bf-details-date{margin-top:7px;font-size:11px;opacity:.55}
    .bf-detail-section{margin-top:28px;padding-top:22px;border-top:1px solid rgba(127,127,127,.16)}
    .bf-detail-title{font-size:18px;font-weight:950;margin-bottom:15px}
    .bf-empty{padding:14px;border-radius:11px;background:rgba(127,127,127,.07);font-size:12px;opacity:.68}

    .bf-formation-summary{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;text-align:center;margin-bottom:16px}
    .bf-formation-team{font-weight:900}.bf-formation-team small{display:block;margin-top:5px;opacity:.55}
    .bf-formation-vs{font-size:11px;font-weight:900;opacity:.45}
    .bf-pitches{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .bf-pitch-card{overflow:hidden;border-radius:19px;background:rgba(127,127,127,.06);border:1px solid rgba(127,127,127,.14)}
    .bf-pitch-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;font-weight:900;font-size:13px}
    .bf-formation-pill{padding:5px 9px;border-radius:999px;background:rgba(127,127,127,.12);font-size:11px;font-weight:950}
    .bf-pitch{position:relative;width:100%;aspect-ratio:.67;overflow:hidden;background:repeating-linear-gradient(90deg,#2d7f43 0%,#2d7f43 10%,#347e45 10%,#347e45 20%)}
    .bf-mark{position:absolute;pointer-events:none}.bf-border{inset:0;border:2px solid rgba(255,255,255,.9)}
    .bf-half{left:0;right:0;top:50%;height:2px;background:rgba(255,255,255,.9)}
    .bf-circle{left:50%;top:50%;width:18%;aspect-ratio:1;transform:translate(-50%,-50%);border:2px solid rgba(255,255,255,.9);border-radius:50%}
    .bf-dot{left:50%;top:50%;width:6px;height:6px;transform:translate(-50%,-50%);background:#fff;border-radius:50%}
    .bf-box-top{left:24%;top:0;width:52%;height:17%;border:2px solid rgba(255,255,255,.9);border-top:0}
    .bf-box-bottom{left:24%;bottom:0;width:52%;height:17%;border:2px solid rgba(255,255,255,.9);border-bottom:0}
    .bf-goal-top{left:39%;top:0;width:22%;height:6%;border:2px solid rgba(255,255,255,.9);border-top:0}
    .bf-goal-bottom{left:39%;bottom:0;width:22%;height:6%;border:2px solid rgba(255,255,255,.9);border-bottom:0}
    .bf-pitch-player{position:absolute;transform:translate(-50%,-50%);width:92px;display:flex;flex-direction:column;align-items:center;z-index:5}
    .bf-avatar{position:relative;width:42px;height:42px;border-radius:50%;background:#fff;border:3px solid rgba(0,0,0,.18);box-shadow:0 4px 12px rgba(0,0,0,.35);overflow:visible}
    .bf-avatar img{width:100%;height:100%;display:block;border-radius:50%;object-fit:cover;background:#fff}
    .bf-avatar-number{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:12px;font-weight:950;color:#111827}
    .bf-shirt-number{position:absolute;right:-6px;bottom:-4px;min-width:17px;height:17px;padding:0 3px;border-radius:50%;background:#fff;border:1px solid rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:950;color:#111827;box-shadow:0 2px 5px rgba(0,0,0,.2)}
    .bf-pitch-name{max-width:90px;margin-top:4px;padding:3px 6px;background:rgba(0,0,0,.72);color:#fff;border-radius:5px;font-size:8px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
    .bf-pitch-rating{margin-top:2px;padding:2px 5px;background:rgba(255,255,255,.94);color:#111827;border-radius:5px;font-size:8px;font-weight:950}
    .bf-mini-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:2px;margin-top:2px}
    .bf-mini{padding:2px 4px;border-radius:5px;background:rgba(255,255,255,.94);color:#111827;font-size:8px;font-weight:950}
    .bf-mini.goal{background:rgba(34,197,94,.95)}.bf-mini.assist{background:rgba(59,130,246,.95)}.bf-mini.yellow{background:rgba(250,204,21,.98)}.bf-mini.red{background:rgba(239,68,68,.98);color:#fff}
    .bf-coach{padding:10px 13px;font-size:11px;opacity:.62;border-top:1px solid rgba(127,127,127,.12)}

    .bf-player-columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.bf-team-heading{display:flex;justify-content:space-between;margin-bottom:10px;padding-bottom:9px;border-bottom:1px solid rgba(127,127,127,.14);font-weight:950}
    .bf-player-list{display:flex;flex-direction:column;gap:7px}.bf-player-row{display:grid;grid-template-columns:38px 1fr auto;gap:9px;align-items:center;padding:9px;border-radius:11px;background:rgba(127,127,127,.065)}
    .bf-player-number{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(127,127,127,.12);font-size:11px;font-weight:950}
    .bf-player-name{font-size:12px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bf-player-position{font-size:9px;opacity:.54;margin-top:3px}.bf-badges{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}.bf-badge{padding:4px 5px;border-radius:6px;background:rgba(127,127,127,.11);font-size:9px;font-weight:900}
    .bf-bench-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.bf-bench{display:flex;flex-direction:column;gap:7px}.bf-bench-player{display:grid;grid-template-columns:32px 1fr auto;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;background:rgba(127,127,127,.06)}.bf-bench-number{font-size:11px;font-weight:900;opacity:.65}.bf-bench-name{font-size:12px;font-weight:800}.bf-bench-rating{font-size:10px;font-weight:900;opacity:.7}
    .bf-events{display:flex;flex-direction:column;gap:7px}.bf-event{display:grid;grid-template-columns:48px 30px 1fr;gap:9px;align-items:center;padding:10px 11px;border-radius:11px;background:rgba(127,127,127,.07)}.bf-event.home{border-left:3px solid rgba(59,130,246,.55)}.bf-event.away{border-left:3px solid rgba(239,68,68,.55)}.bf-event-minute{font-size:11px;font-weight:950}.bf-event-icon{text-align:center;font-size:18px}.bf-event-player{font-size:12px;font-weight:900}.bf-event-detail{margin-top:2px;font-size:10px;opacity:.57}.bf-event-assist{margin-top:3px;font-size:10px;opacity:.75}
    .bf-stat-row{display:grid;grid-template-columns:1fr 120px 1fr;gap:8px;align-items:center;padding:6px 0}.bf-stat-home{text-align:right;font-size:11px;font-weight:900}.bf-stat-name{text-align:center;font-size:10px;opacity:.56}.bf-stat-away{font-size:11px;font-weight:900}
    .bf-info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.bf-info{padding:11px;border-radius:11px;background:rgba(127,127,127,.07);font-size:11px}.bf-info strong{display:block;margin-bottom:4px}
    @media(max-width:850px){.bf-pitches,.bf-player-columns,.bf-bench-grid{grid-template-columns:1fr}}
    @media(max-width:600px){.bf-details-modal-box{padding:20px 12px;border-radius:18px}.bf-details-score-head{gap:8px}.bf-details-team-logo,.bf-details-fallback{width:58px;height:58px}.bf-details-score{font-size:27px}.bf-details-team-name{font-size:11px}.bf-formation-summary{grid-template-columns:1fr}.bf-formation-vs{display:none}.bf-player-row{grid-template-columns:35px 1fr}.bf-badges{grid-column:2;justify-content:flex-start}.bf-info-grid{grid-template-columns:1fr}.bf-pitch-player{width:68px}.bf-avatar{width:34px;height:34px}.bf-shirt-number{min-width:14px;height:14px;font-size:7px}.bf-pitch-name{max-width:67px;font-size:7px}.bf-pitch-rating,.bf-mini{font-size:7px}}
  `;
  document.head.appendChild(style);
}

function createDetailsModal() {
  ensureDetailsStyles();

  let modal = $("bf-details-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "bf-details-modal";
  modal.innerHTML = `
    <div class="bf-details-overlay" id="bf-details-overlay">
      <div class="bf-details-modal-box" onclick="event.stopPropagation()">
        <button class="bf-details-close" onclick="closeMatchDetails()">✕</button>
        <div id="bf-details-content"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $("bf-details-overlay").addEventListener("click", event => {
    if (event.target.id === "bf-details-overlay") closeMatchDetails();
  });

  return modal;
}

function closeMatchDetails() {
  const modal = $("bf-details-modal");
  if (modal) modal.style.display = "none";
  currentOpenedFixture = null;
  document.body.style.overflow = "";
}

/* =========================================================
   DETAIL DATA HELPERS
========================================================= */

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function getPlayerObject(row) {
  if (row?.player && typeof row.player === "object") return row.player;
  return row || {};
}

function getPlayerName(row) {
  const p = getPlayerObject(row);
  return (
    p?.name ||
    p?.full_name ||
    p?.fullName ||
    row?.player_name ||
    row?.playerName ||
    row?.name ||
    "Joueur"
  );
}

function getPlayerId(row) {
  const p = getPlayerObject(row);
  return p?.id || row?.player_id || row?.playerId || row?.id || null;
}

function getPlayerNumber(row) {
  const p = getPlayerObject(row);
  return (
    p?.number ??
    p?.jersey_number ??
    row?.number ??
    row?.shirt_number ??
    row?.jersey_number ??
    "-"
  );
}

function getPlayerPosition(row) {
  const p = getPlayerObject(row);
  return (
    p?.pos ||
    p?.position ||
    row?.position ||
    row?.position_name ||
    row?.pos ||
    ""
  );
}

function getPlayerGrid(row) {
  const p = getPlayerObject(row);
  return (
    p?.grid ||
    row?.grid ||
    row?.positionGrid ||
    row?.position_grid ||
    ""
  );
}

function getPlayerPhoto(row) {
  const p = getPlayerObject(row);
  return (
    p?.photo ||
    p?.picture ||
    p?.image ||
    row?.photo ||
    row?.picture ||
    row?.image ||
    ""
  );
}

function getPlayerStats(row) {
  const statistics = row?.statistics?.[0] || row?.statistics || row?.stats || {};
  const games = statistics?.games || row?.games || {};
  const goals = statistics?.goals || row?.goals || {};
  const cards = statistics?.cards || row?.cards || {};
  const passes = statistics?.passes || row?.passes || {};
  return {
    rating: row?.rating ?? row?.player_rating ?? games?.rating ?? statistics?.rating ?? null,
    minutes: row?.minutes ?? row?.minutesPlayed ?? games?.minutes ?? statistics?.minutes ?? null,
    goals: numberOrZero(goals?.total),
    assists: numberOrZero(goals?.assists),
    yellow: numberOrZero(cards?.yellow),
    red: numberOrZero(cards?.red),
    keyPasses: numberOrZero(passes?.key ?? passes?.key_passes)
  };
}

function playerKey(row) {
  const id = getPlayerId(row);
  if (id) return `id:${id}`;
  return `name:${normalizeText(getPlayerName(row))}`;
}

function buildPlayerStatsMap(players) {
  const map = new Map();
  arrayValue(players).forEach(group => {
    const rows = arrayValue(group?.players || group?.data || group);
    rows.forEach(row => {
      map.set(playerKey(row), getPlayerStats(row));
    });
  });
  return map;
}

function buildContributions(events) {
  const map = new Map();

  function ensure(row) {
    const key = playerKey(row);
    if (!map.has(key)) {
      map.set(key, { goals: 0, assists: 0, yellow: 0, red: 0 });
    }
    return map.get(key);
  }

  arrayValue(events).forEach(event => {
    const type = normalizeText(event?.type || event?.event_type || "");
    const detail = normalizeText(event?.detail || event?.description || event?.text || "");
    const player = event?.player || {};
    const playerName = getPlayerName({ player });

    if (playerName && playerName !== "Joueur") {
      const target = ensure({
        player: {
          id: player?.id || event?.player_id || null,
          name: playerName
        }
      });

      if (type.includes("goal") && !detail.includes("missed")) target.goals++;

      if (type.includes("card")) {
        if (detail.includes("red") || detail.includes("second yellow") || detail.includes("yellow-red")) target.red++;
        else if (detail.includes("yellow")) target.yellow++;
      }
    }

    const assist = event?.assist || {};
    const assistName = assist?.name || event?.assist_name || event?.assistName || "";
    if (assistName && type.includes("goal")) {
      const target = ensure({
        player: {
          id: assist?.id || event?.assist_id || null,
          name: assistName
        }
      });
      target.assists++;
    }
  });

  return map;
}

function normalizeLineupsForUI(lineups) {
  if (Array.isArray(lineups)) return lineups;
  if (Array.isArray(lineups?.response)) return lineups.response;
  if (Array.isArray(lineups?.data)) return lineups.data;

  if (lineups && typeof lineups === "object") {
    const out = [];
    if (lineups.home) out.push({ ...lineups.home, _side: "home" });
    if (lineups.away) out.push({ ...lineups.away, _side: "away" });
    return out;
  }

  return [];
}

function lineupForTeam(lineups, teamId, teamName, fallbackIndex) {
  const normalizedName = normalizeText(teamName);

  return (
    lineups.find(lineup => {
      const id = lineup?.team?.id || lineup?.team_id || null;
      const name = normalizeText(lineup?.team?.name || lineup?.team_name || "");
      return (
        (teamId && id && String(teamId) === String(id)) ||
        (normalizedName && name && (normalizedName === name || normalizedName.includes(name) || name.includes(normalizedName)))
      );
    }) ||
    lineups[fallbackIndex] ||
    null
  );
}

function getLineupPlayers(lineup, starter = true) {
  if (!lineup) return [];
  const list = starter
    ? (lineup?.startXI || lineup?.startingXI || lineup?.starting_xi || lineup?.starters || lineup?.starting || [])
    : (lineup?.substitutes || lineup?.bench || lineup?.subs || []);
  return Array.isArray(list) ? list : [];
}

function pitchRowFromPosition(position) {
  const pos = normalizeText(position);
  if (pos === "g" || pos.includes("goal") || pos.includes("gardien") || pos.includes("keeper")) return 1;
  if (pos === "d" || pos.includes("def") || pos.includes("back")) return 2;
  if (pos === "m" || pos.includes("mid") || pos.includes("milieu")) return 3;
  return 4;
}

function positionPlayersOnPitch(players, side) {
  const rows = {};

  players.forEach(row => {
    const grid = String(getPlayerGrid(row) || "");
    const match = grid.match(/(\d+)\s*:\s*(\d+)/);
    let r = match ? Number(match[1]) : pitchRowFromPosition(getPlayerPosition(row));
    let c = match ? Number(match[2]) : 0;

    if (!rows[r]) rows[r] = [];
    if (!c) c = rows[r].length + 1;
    rows[r].push({ row, column: c });
  });

  const rowNumbers = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const maxRow = Math.max(...rowNumbers, 4);
  const result = [];

  rowNumbers.forEach(r => {
    const list = rows[r].sort((a, b) => a.column - b.column);
    const count = list.length;

    list.forEach((entry, index) => {
      const x = count === 1 ? 50 : 12 + 76 * (index / (count - 1));
      let y = 8 + 84 * ((r - 1) / Math.max(1, maxRow - 1));
      if (side === "away") y = 100 - y;

      result.push({
        row: entry.row,
        x: Math.max(6, Math.min(94, x)),
        y: Math.max(5, Math.min(95, y))
      });
    });
  });

  return result;
}

function eventMinute(event) {
  const minute = event?.time?.elapsed ?? event?.minute ?? event?.elapsed ?? null;
  const extra = event?.time?.extra ?? event?.extra ?? null;
  if (minute === null || minute === undefined) return "";
  return extra ? `${minute}+${extra}'` : `${minute}'`;
}

function eventIcon(event) {
  const type = normalizeText(event?.type);
  const detail = normalizeText(event?.detail);
  if (type.includes("goal")) return "⚽";
  if (type.includes("card")) {
    return detail.includes("red") || detail.includes("second yellow") || detail.includes("yellow-red") ? "🟥" : "🟨";
  }
  if (type.includes("subst")) return "🔄";
  if (type.includes("var")) return "🎥";
  return "📌";
}

function playerBadges(row, stats, contribution) {
  let html = "";
  const rating = stats?.rating ?? row?.rating;
  if (rating !== null && rating !== undefined && rating !== "") html += `<span class="bf-badge">⭐ ${escapeHTML(Number(rating).toFixed(1))}</span>`;
  if (numberOrZero(stats.goals) + numberOrZero(contribution.goals) > 0) html += `<span class="bf-badge">⚽ ${numberOrZero(stats.goals) || numberOrZero(contribution.goals)}</span>`;
  if (numberOrZero(stats.assists) + numberOrZero(contribution.assists) > 0) html += `<span class="bf-badge">🅰️ ${numberOrZero(stats.assists) || numberOrZero(contribution.assists)}</span>`;
  if (numberOrZero(stats.yellow) + numberOrZero(contribution.yellow) > 0) html += `<span class="bf-badge">🟨</span>`;
  if (numberOrZero(stats.red) + numberOrZero(contribution.red) > 0) html += `<span class="bf-badge">🟥</span>`;
  if (numberOrZero(stats.keyPasses) > 0) html += `<span class="bf-badge">🎯 ${stats.keyPasses}</span>`;
  return html;
}

function renderPitchPlayer(row, x, y, stats, contribution) {
  const number = getPlayerNumber(row);
  const name = getPlayerName(row);
  const photo = getPlayerPhoto(row);
  const goals = numberOrZero(stats.goals) || numberOrZero(contribution.goals);
  const assists = numberOrZero(stats.assists) || numberOrZero(contribution.assists);
  const yellow = numberOrZero(stats.yellow) || numberOrZero(contribution.yellow);
  const red = numberOrZero(stats.red) || numberOrZero(contribution.red);

  const actions = `
    ${goals ? `<span class="bf-mini goal">⚽${goals}</span>` : ""}
    ${assists ? `<span class="bf-mini assist">🅰️${assists}</span>` : ""}
    ${yellow ? `<span class="bf-mini yellow">🟨</span>` : ""}
    ${red ? `<span class="bf-mini red">🟥</span>` : ""}
  `;

  return `
    <div class="bf-pitch-player" style="left:${x}%;top:${y}%" title="${escapeHTML(name)}">
      <div class="bf-avatar">
        ${photo
          ? `<img src="${escapeHTML(photo)}" alt="${escapeHTML(name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ""}
        <span class="bf-avatar-number" style="${photo ? "display:none" : ""}">${escapeHTML(number)}</span>
        <span class="bf-shirt-number">${escapeHTML(number)}</span>
      </div>
      <div class="bf-pitch-name">${escapeHTML(name)}</div>
      ${stats.rating !== null && stats.rating !== undefined && stats.rating !== "" ? `<div class="bf-pitch-rating">⭐ ${escapeHTML(Number(stats.rating).toFixed(1))}</div>` : ""}
      ${actions ? `<div class="bf-mini-actions">${actions}</div>` : ""}
    </div>
  `;
}

function renderPitch(lineup, teamName, side, playerStatsMap, contributionMap) {
  if (!lineup) {
    return `<div class="bf-pitch-card"><div class="bf-pitch-head">${escapeHTML(teamName)}</div><div class="bf-empty">Formation non disponible.</div></div>`;
  }

  const players = getLineupPlayers(lineup, true);
  const positioned = positionPlayersOnPitch(players, side);
  const formation = lineup?.formation || lineup?.tactics?.formation || "—";
  const coach = lineup?.coach?.name || lineup?.coach || lineup?.manager?.name || lineup?.manager || "";

  const playersHTML = positioned.map(({ row, x, y }) => {
    const key = playerKey(row);
    const stats = playerStatsMap.get(key) || getPlayerStats(row);
    const contribution = contributionMap.get(key) || { goals: 0, assists: 0, yellow: 0, red: 0 };
    return renderPitchPlayer(row, x, y, stats, contribution);
  }).join("");

  return `
    <div class="bf-pitch-card">
      <div class="bf-pitch-head">
        <span>${escapeHTML(teamName)}</span>
        <span class="bf-formation-pill">${escapeHTML(formation)}</span>
      </div>

      <div class="bf-pitch">
        <div class="bf-mark bf-border"></div>
        <div class="bf-mark bf-half"></div>
        <div class="bf-mark bf-circle"></div>
        <div class="bf-mark bf-dot"></div>
        <div class="bf-mark bf-box-top"></div>
        <div class="bf-mark bf-box-bottom"></div>
        <div class="bf-mark bf-goal-top"></div>
        <div class="bf-mark bf-goal-bottom"></div>
        ${playersHTML}
      </div>

      ${coach ? `<div class="bf-coach">👔 ${escapeHTML(typeof coach === "object" ? coach.name || "" : coach)}</div>` : ""}
    </div>
  `;
}

function renderPlayersColumn(lineup, teamName, playerStatsMap, contributionMap) {
  if (!lineup) {
    return `<div><div class="bf-team-heading">${escapeHTML(teamName)}</div><div class="bf-empty">Composition indisponible.</div></div>`;
  }

  const players = getLineupPlayers(lineup, true);
  const rows = players.map(row => {
    const key = playerKey(row);
    const stats = playerStatsMap.get(key) || getPlayerStats(row);
    const contribution = contributionMap.get(key) || { goals: 0, assists: 0, yellow: 0, red: 0 };

    return `
      <div class="bf-player-row">
        <div class="bf-player-number">${escapeHTML(getPlayerNumber(row))}</div>
        <div>
          <div class="bf-player-name">${escapeHTML(getPlayerName(row))}</div>
          <div class="bf-player-position">
            ${escapeHTML(getPlayerPosition(row))}
            ${stats.minutes !== null && stats.minutes !== undefined ? ` · ${escapeHTML(stats.minutes)} min` : ""}
          </div>
        </div>
        <div class="bf-badges">${playerBadges(row, stats, contribution)}</div>
      </div>
    `;
  }).join("");

  return `
    <div>
      <div class="bf-team-heading"><span>${escapeHTML(teamName)}</span><span>${players.length}</span></div>
      <div class="bf-player-list">${rows || `<div class="bf-empty">Aucun joueur disponible.</div>`}</div>
    </div>
  `;
}

function renderBench(lineup, teamName, playerStatsMap) {
  const substitutes = getLineupPlayers(lineup, false);
  if (!substitutes.length) return `<div><div class="bf-team-heading">${escapeHTML(teamName)}</div><div class="bf-empty">Aucun remplaçant disponible.</div></div>`;

  return `
    <div>
      <div class="bf-team-heading">${escapeHTML(teamName)}</div>
      <div class="bf-bench">
        ${substitutes.map(row => {
          const stats = playerStatsMap.get(playerKey(row)) || getPlayerStats(row);
          return `
            <div class="bf-bench-player">
              <span class="bf-bench-number">${escapeHTML(getPlayerNumber(row))}</span>
              <span class="bf-bench-name">${escapeHTML(getPlayerName(row))}</span>
              <span class="bf-bench-rating">${stats.rating !== null && stats.rating !== undefined && stats.rating !== "" ? `⭐ ${escapeHTML(Number(stats.rating).toFixed(1))}` : ""}</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderEvents(events, homeId, awayId, homeName, awayName) {
  if (!events.length) {
    return `<div class="bf-detail-section"><div class="bf-detail-title">⚡ Événements</div><div class="bf-empty">Aucun événement disponible.</div></div>`;
  }

  const html = [...events].sort((a, b) => numberOrZero(a?.time?.elapsed ?? a?.minute ?? 999) - numberOrZero(b?.time?.elapsed ?? b?.minute ?? 999)).map(event => {
    const team = event?.team || {};
    const player = event?.player || {};
    const assist = event?.assist || {};
    const teamId = team?.id || event?.team_id || null;
    const side = homeId && teamId && String(homeId) === String(teamId) ? "home" : "away";
    const teamName = team?.name || (side === "home" ? homeName : awayName);
    const playerName = player?.name || event?.player_name || event?.playerName || "Événement";
    const detail = event?.detail || event?.description || event?.text || "";
    const assistName = assist?.name || event?.assist_name || event?.assistName || "";

    return `
      <div class="bf-event ${side}">
        <div class="bf-event-minute">${escapeHTML(eventMinute(event))}</div>
        <div class="bf-event-icon">${eventIcon(event)}</div>
        <div>
          <div class="bf-event-player">${escapeHTML(playerName)}</div>
          ${detail ? `<div class="bf-event-detail">${escapeHTML(detail)}</div>` : ""}
          ${assistName ? `<div class="bf-event-assist">🅰️ Passe décisive : ${escapeHTML(assistName)}</div>` : ""}
          <div class="bf-event-detail">${escapeHTML(teamName)}</div>
        </div>
      </div>
    `;
  }).join("");

  return `<div class="bf-detail-section"><div class="bf-detail-title">⚡ Événements</div><div class="bf-events">${html}</div></div>`;
}

function renderStatistics(statistics) {
  if (!Array.isArray(statistics) || !statistics.length) return "";
  const home = statistics[0] || {};
  const away = statistics[1] || {};
  const homeStats = Array.isArray(home.statistics) ? home.statistics : [];
  const awayStats = Array.isArray(away.statistics) ? away.statistics : [];
  if (!homeStats.length) return "";

  const awayMap = new Map();
  awayStats.forEach(stat => awayMap.set(normalizeText(stat?.type || stat?.name || ""), stat?.value ?? "-"));

  return `
    <div class="bf-detail-section">
      <div class="bf-detail-title">📊 Statistiques</div>
      ${homeStats.slice(0, 20).map(stat => {
        const key = normalizeText(stat?.type || stat?.name || "");
        return `
          <div class="bf-stat-row">
            <div class="bf-stat-home">${escapeHTML(stat?.value ?? "-")}</div>
            <div class="bf-stat-name">${escapeHTML(stat?.type || stat?.name || "Stat")}</div>
            <div class="bf-stat-away">${escapeHTML(awayMap.get(key) ?? "-")}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderInfo(details) {
  const fixture = details?.fixture || {};
  const venue = fixture?.venue;
  const venueName = typeof venue === "string" ? venue : venue?.name || "";
  const city = venue?.city || "";
  const referee = typeof fixture?.referee === "string" ? fixture.referee : fixture?.referee?.name || "";
  const round = details?.league?.round || "";
  const season = details?.league?.season || "";

  if (!venueName && !city && !referee && !round && !season) return "";

  return `
    <div class="bf-detail-section">
      <div class="bf-detail-title">📋 Informations</div>
      <div class="bf-info-grid">
        ${venueName ? `<div class="bf-info"><strong>🏟️ Stade</strong>${escapeHTML(venueName)}${city ? ` · ${escapeHTML(city)}` : ""}</div>` : ""}
        ${referee ? `<div class="bf-info"><strong>👨‍⚖️ Arbitre</strong>${escapeHTML(referee)}</div>` : ""}
        ${round ? `<div class="bf-info"><strong>🔢 Journée</strong>${escapeHTML(round)}</div>` : ""}
        ${season ? `<div class="bf-info"><strong>📅 Saison</strong>${escapeHTML(season)}</div>` : ""}
      </div>
    </div>
  `;
}

/* =========================================================
   OPEN DETAILS
========================================================= */

async function openMatchDetails(index) {
  const match = currentMatches[index];
  if (!match) {
    toast("تفاصيل الماتش غير متوفرة");
    return;
  }

  const fixtureId = getFixtureId(match);
  currentOpenedFixture = fixtureId;
  const modal = createDetailsModal();
  const content = $("bf-details-content");
  if (!content) return;

  const home = getHome(match);
  const away = getAway(match);
  const homeLogo = getHomeLogo(match);
  const awayLogo = getAwayLogo(match);
  const league = getLeague(match);
  const date = match?.fixture?.date || match?.date || null;

  content.innerHTML = `
    <div class="bf-details-league">🏆 ${escapeHTML(league)}</div>
    <div class="bf-details-status"><span>${escapeHTML(statusLabel(match))}</span></div>
    <div class="bf-details-score-head">
      <div class="bf-details-team">
        ${homeLogo ? `<img class="bf-details-team-logo" src="${escapeHTML(homeLogo)}" alt="${escapeHTML(home)}">` : `<div class="bf-details-fallback">⚽</div>`}
        <div class="bf-details-team-name">${escapeHTML(home)}</div>
      </div>
      <div>
        <div class="bf-details-score">${escapeHTML(getHomeScore(match))} - ${escapeHTML(getAwayScore(match))}</div>
        ${date ? `<div class="bf-details-date">${escapeHTML(formatDate(date))}</div>` : ""}
      </div>
      <div class="bf-details-team">
        ${awayLogo ? `<img class="bf-details-team-logo" src="${escapeHTML(awayLogo)}" alt="${escapeHTML(away)}">` : `<div class="bf-details-fallback">⚽</div>`}
        <div class="bf-details-team-name">${escapeHTML(away)}</div>
      </div>
    </div>
    <div class="bf-detail-section"><div class="bf-detail-title">⏳ Match Center</div><div class="bf-empty">جاري تحميل تفاصيل المباراة...</div></div>
  `;

  modal.style.display = "block";
  document.body.style.overflow = "hidden";

  if (!fixtureId) {
    content.innerHTML += `<div class="bf-detail-section"><div class="bf-empty">⚠️ معرف المباراة غير متوفر.</div></div>`;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api?fixture=${encodeURIComponent(fixtureId)}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    const details = extractMatchDetails(data);
    if (!details) throw new Error("Aucune donnée détaillée");
    if (currentOpenedFixture !== fixtureId) return;

    const realHome = getHome(details) || home;
    const realAway = getAway(details) || away;
    const realHomeId = getHomeId(details) || getHomeId(match);
    const realAwayId = getAwayId(details) || getAwayId(match);
    const realHomeLogo = getHomeLogo(details) || homeLogo;
    const realAwayLogo = getAwayLogo(details) || awayLogo;
    const realLeague = getLeague(details) || league;
    const realDate = details?.fixture?.date || date;
    const realHomeScore = getHomeScore(details);
    const realAwayScore = getAwayScore(details);

    const events = arrayValue(details?.events || details?.timeline || details?.incidents);
    const lineups = normalizeLineupsForUI(details?.lineups || details?.lineup);
    const players = arrayValue(details?.players);
    const statistics = arrayValue(details?.statistics || details?.stats);

    const playerStatsMap = buildPlayerStatsMap(players);
    const contributionMap = buildContributions(events);

    const homeLineup = lineupForTeam(lineups, realHomeId, realHome, 0);
    const awayLineup = lineupForTeam(lineups, realAwayId, realAway, 1);

    content.innerHTML = `
      <div class="bf-details-league">🏆 ${escapeHTML(realLeague)}</div>
      <div class="bf-details-status"><span>${escapeHTML(statusLabel(details))}</span></div>

      <div class="bf-details-score-head">
        <div class="bf-details-team">
          ${realHomeLogo ? `<img class="bf-details-team-logo" src="${escapeHTML(realHomeLogo)}" alt="${escapeHTML(realHome)}">` : `<div class="bf-details-fallback">⚽</div>`}
          <div class="bf-details-team-name">${escapeHTML(realHome)}</div>
        </div>
        <div>
          <div class="bf-details-score">${escapeHTML(realHomeScore)} - ${escapeHTML(realAwayScore)}</div>
          ${realDate ? `<div class="bf-details-date">${escapeHTML(formatDate(realDate))}</div>` : ""}
        </div>
        <div class="bf-details-team">
          ${realAwayLogo ? `<img class="bf-details-team-logo" src="${escapeHTML(realAwayLogo)}" alt="${escapeHTML(realAway)}">` : `<div class="bf-details-fallback">⚽</div>`}
          <div class="bf-details-team-name">${escapeHTML(realAway)}</div>
        </div>
      </div>

      ${renderInfo(details)}

      <div class="bf-detail-section">
        <div class="bf-detail-title">🧩 Formations & Compositions</div>
        ${homeLineup || awayLineup
          ? `
            <div class="bf-formation-summary">
              <div class="bf-formation-team">${escapeHTML(realHome)}<small>${escapeHTML(homeLineup?.formation || "—")}</small></div>
              <div class="bf-formation-vs">VS</div>
              <div class="bf-formation-team">${escapeHTML(realAway)}<small>${escapeHTML(awayLineup?.formation || "—")}</small></div>
            </div>
            <div class="bf-pitches">
              ${renderPitch(homeLineup, realHome, "home", playerStatsMap, contributionMap)}
              ${renderPitch(awayLineup, realAway, "away", playerStatsMap, contributionMap)}
            </div>
          `
          : `<div class="bf-empty">التشكيلة غير متوفرة لهاد الماتش.</div>`}
      </div>

      ${homeLineup || awayLineup
        ? `
          <div class="bf-detail-section">
            <div class="bf-detail-title">⭐ أداء اللاعبين</div>
            <div class="bf-player-columns">
              ${renderPlayersColumn(homeLineup, realHome, playerStatsMap, contributionMap)}
              ${renderPlayersColumn(awayLineup, realAway, playerStatsMap, contributionMap)}
            </div>
          </div>

          <div class="bf-detail-section">
            <div class="bf-detail-title">🔄 Banc</div>
            <div class="bf-bench-grid">
              ${renderBench(homeLineup, realHome, playerStatsMap)}
              ${renderBench(awayLineup, realAway, playerStatsMap)}
            </div>
          </div>
        `
        : ""}

      ${renderEvents(events, realHomeId, realAwayId, realHome, realAway)}
      ${renderStatistics(statistics)}

      <div style="margin-top:24px;text-align:center;font-size:10px;opacity:.45">Powered by SportScore</div>
    `;
  } catch (error) {
    console.error("MATCH DETAILS ERROR:", error);
    content.innerHTML = `
      <div class="bf-detail-section">
        <div class="bf-detail-title">⚠️ Match Details</div>
        <div class="bf-empty">ما قدرناش نحملو تفاصيل هاد الماتش.<br><br><strong>${escapeHTML(error?.message || "Erreur inconnue")}</strong></div>
      </div>
    `;
  }
}

/* =========================================================
   DOM EVENTS
========================================================= */

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMatchDetails();
});

document.addEventListener("DOMContentLoaded", () => {
  console.log("⚽ BakhiraFoot Pro chargé");

  currentDate = new Date().toISOString().split("T")[0];

  initNavigation();
  initFilters();
  initSearch();
  initTheme();

  createDateBar();
  renderHome();
  renderLeagues();
  renderTeams();
  renderNews();
  startLiveRefresh();
});

