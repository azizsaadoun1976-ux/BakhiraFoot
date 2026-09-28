/* =========================================================
   BAKHIRAFOOT PRO
   LIVE + MATCH DETAILS
   No HTML/CSS changes required
========================================================= */

const API_BASE = "";

/* =========================================================
   GLOBAL DATA
========================================================= */

let currentMatches = [];
let currentDate = null;
let currentFilter = "all";

/* =========================================================
   HELPERS
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

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getStatus(match) {
  return (
    match?.fixture?.status?.long ||
    match?.status?.long ||
    match?.status?.short ||
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
    match?.home ||
    "Domicile"
  );
}

function getAway(match) {
  return (
    match?.teams?.away?.name ||
    match?.away?.name ||
    match?.away ||
    "Extérieur"
  );
}

function getHomeLogo(match) {
  return (
    match?.teams?.home?.logo ||
    match?.home?.logo ||
    ""
  );
}

function getAwayLogo(match) {
  return (
    match?.teams?.away?.logo ||
    match?.away?.logo ||
    ""
  );
}

function getHomeScore(match) {
  return (
    match?.goals?.home ??
    match?.score?.fulltime?.home ??
    match?.score?.home ??
    match?.homeScore ??
    "-"
  );
}

function getAwayScore(match) {
  return (
    match?.goals?.away ??
    match?.score?.fulltime?.away ??
    match?.score?.away ??
    match?.awayScore ??
    "-"
  );
}

function getLeague(match) {
  return (
    match?.league?.name ||
    match?.competition?.name ||
    match?.league ||
    "Football"
  );
}
// =========================================
// BAKHIRAFOOT — MATCH IMPORTANCE
// =========================================

function getCompetitionPriority(match) {
  const league = getLeague(match).toLowerCase();

  if (
    league.includes("world cup") ||
    league.includes("coupe du monde") ||
    league.includes("mundial")
  ) return 150;

  if (
    league === "euro" ||
    league.includes("european championship") ||
    league.includes("uefa euro")
  ) return 140;

  if (
    league.includes("champions league") ||
    league.includes("uefa champions")
  ) return 130;

  if (
    league.includes("europa league") ||
    league.includes("uefa europa")
  ) return 120;

  if (
    league.includes("conference league") ||
    league.includes("uefa conference")
  ) return 110;

  if (
    league.includes("premier league") ||
    league.includes("english premier")
  ) return 100;

  if (
    league.includes("la liga") ||
    league.includes("laliga")
  ) return 95;

  if (
    league === "serie a" ||
    league.includes("italian serie")
  ) return 90;

  if (
    league.includes("afcon") ||
    league.includes("africa cup") ||
    league.includes("african cup") ||
    league.includes("coupe d'afrique") ||
    league.includes("cup of nations")
  ) return 85;

  if (
    league.includes("copa america") ||
    league.includes("copa américa")
  ) return 80;

  if (
    league.includes("nations league") ||
    league.includes("uefa nations")
  ) return 75;

  if (
    league.includes("bundesliga") ||
    league.includes("german bundesliga")
  ) return 70;

  if (
    league === "ligue 1" ||
    league.includes("ligue 1")
  ) return 65;

  if (
    league.includes("world cup qualifier") ||
    league.includes("world cup qualification") ||
    league.includes("coupe du monde - qualification")
  ) return 60;

  if (
    league.includes("botola") ||
    league.includes("botola pro") ||
    league.includes("morocco")
  ) return 55;

  return 10;
}

function getTeamPriority(match) {
  const home = getHome(match).toLowerCase();
  const away = getAway(match).toLowerCase();

  const bigTeams = [
    "real madrid",
    "barcelona",
    "atletico madrid",
    "manchester city",
    "manchester united",
    "liverpool",
    "arsenal",
    "chelsea",
    "tottenham",
    "bayern",
    "borussia dortmund",
    "psg",
    "paris saint-germain",
    "juventus",
    "inter",
    "ac milan",
    "napoli",
    "ajax",
    "benfica",
    "porto",
    "wydad",
    "wydad casablanca",
    "raja",
    "raja casablanca",
    "fenerbahce",
    "galatasaray"
  ];

  let priority = 0;

  for (const team of bigTeams) {
    if (home.includes(team)) priority += 20;
    if (away.includes(team)) priority += 20;
  }

  return priority;
}

function getMatchPriority(match) {
  const status = String(getStatus(match)).toUpperCase();

  let priority =
    getCompetitionPriority(match) +
    getTeamPriority(match);

  // LIVE ديما عندو أولوية
  if (
    ["1H", "2H", "LIVE", "ET", "P", "BT"].includes(status) ||
    status.includes("LIVE")
  ) {
    priority += 1000;
  }

  // Half-time كذلك يبقى فوق
  if (status === "HT" || status.includes("HALF")) {
    priority += 900;
  }

  return priority;
}

function sortMatchesByImportance(matches) {
   function renderMatchesByCompetition(matches) {
  const groups = {};

  matches.forEach((match) => {
    const league = getLeague(match);

    if (!groups[league]) {
      groups[league] = [];
    }

    groups[league].push(match);
  });

  return Object.entries(groups)
    .map(([league, leagueMatches]) => {

      const competitionMatches =
        leagueMatches
          .map((match) => {
            const index =
              currentMatches.indexOf(match);

            return createMatchHTML(
              match,
              index
            );
          })
          .join("");

      return `
        <section class="competition-block">

          <div class="competition-header">

            <div class="competition-title">
              <span class="competition-icon">🏆</span>
              <strong>${escapeHTML(league)}</strong>
            </div>

            <span class="competition-count">
              ${leagueMatches.length}
              ${leagueMatches.length > 1 ? "matchs" : "match"}
            </span>

          </div>

          <div class="competition-matches">
            ${competitionMatches}
          </div>

        </section>
      `;
    })
    .join("");
}
  return [...matches].sort((a, b) => {
    const priorityA = getMatchPriority(a);
    const priorityB = getMatchPriority(b);

    return priorityB - priorityA;
  });
}
function getFixtureId(match) {
  return (
    match?.fixture?.id ||
    match?.id ||
    null
  );
}

function normalizeMatches(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.response)) {
    return data.response;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.fixtures)) {
    return data.data.fixtures;
  }

  if (Array.isArray(data?.fixtures)) {
    return data.fixtures;
  }

  if (Array.isArray(data?.matches)) {
    return data.matches;
  }

  return [];
}

/* =========================================================
   NAVIGATION
========================================================= */

function go(page) {
  const pages = document.querySelectorAll(".page");
  const buttons = document.querySelectorAll("nav button");

  pages.forEach(section => {
    section.classList.remove("active");
  });

  const target = $(page);

  if (!target) return;

  target.classList.add("active");

  buttons.forEach(button => {
    button.classList.remove("active");

    if (button.dataset.page === page) {
      button.classList.add("active");
    }
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (page === "home") {
    renderHome();
  }

  if (page === "scores") {
    createDateBar();
    loadMatches(currentDate);
  }

  if (page === "leagues") {
    renderLeagues();
  }

  if (page === "teams") {
    renderTeams();
  }

  if (page === "news") {
    renderNews();
  }
}

/* =========================================================
   TOAST
========================================================= */

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
   MATCH STATUS
========================================================= */

function statusLabel(match) {
  const status = String(getStatus(match)).toUpperCase();
  const minute = getMinute(match);

  const liveStatuses = [
    "1H",
    "2H",
    "LIVE",
    "ET",
    "P",
    "BT"
  ];

  if (
    liveStatuses.includes(status) ||
    status.includes("LIVE")
  ) {
    return minute
      ? `🔴 LIVE ${minute}'`
      : "🔴 LIVE";
  }

  if (
    status === "HT" ||
    status.includes("HALF")
  ) {
    return "⏸ MI-TEMPS";
  }

  if (
    status === "FT" ||
    status.includes("FINISHED")
  ) {
    return "✅ TERMINÉ";
  }

  if (
    status === "NS" ||
    status.includes("NOT STARTED")
  ) {
    return "🕒 À VENIR";
  }

  if (
    status === "PST" ||
    status.includes("POSTPONED")
  ) {
    return "⏸ REPORTÉ";
  }

  if (
    status === "CANC" ||
    status.includes("CANCEL")
  ) {
    return "❌ ANNULÉ";
  }

  return status || "MATCH";
}

/* =========================================================
   TEAM HTML
========================================================= */

function teamHTML(name, logo) {
  return `
    <div class="team">
      ${
        logo
          ? `
            <img
              class="teamLogo"
              src="${escapeHTML(logo)}"
              alt="${escapeHTML(name)}"
              loading="lazy"
            >
          `
          : `
            <div class="teamLogo">
              ⚽
            </div>
          `
      }

      <span>
        ${escapeHTML(name)}
      </span>
    </div>
  `;
}

/* =========================================================
   MATCH CARD
========================================================= */
function createMatchHTML(match, index) {
  const home = getHome(match);
  const away = getAway(match);

  const homeLogo = getHomeLogo(match);
  const awayLogo = getAwayLogo(match);

  const homeScore = getHomeScore(match);
  const awayScore = getAwayScore(match);

  const league = getLeague(match);
  const status = statusLabel(match);

  const date =
    match?.fixture?.date ||
    match?.date ||
    null;

  const fixtureId = getFixtureId(match);

  return `
    <div
      class="match-card"
      data-match-index="${index}"
      data-fixture-id="${escapeHTML(fixtureId || "")}"
      onclick="openMatchDetails(${index})"
    >

      <div class="flash-league">
        <span>🏆 ${escapeHTML(league)}</span>
      </div>

      <div class="flash-match">

        <div class="flash-time">
          <span>${escapeHTML(status)}</span>

          ${
            date
              ? `<small>${escapeHTML(formatDate(date))}</small>`
              : ""
          }
        </div>

        <div class="flash-teams">

          <div class="flash-team">
            ${teamHTML(home, homeLogo)}
          </div>

          <div class="flash-team">
            ${teamHTML(away, awayLogo)}
          </div>

        </div>

        <div class="flash-score">
          <strong>${escapeHTML(homeScore)}</strong>
          <strong>${escapeHTML(awayScore)}</strong>
        </div>

      </div>

    </div>
  `;
}
/* =========================================================
   LOAD LIVE
========================================================= */

async function loadLive() {
  const liveElement = $("live");

  try {
    if (liveElement) {
      liveElement.textContent =
        "🟡 Chargement du LIVE...";
    }

    const response = await fetch(
      `${API_BASE}/api?live=all`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    const matches = sortMatchesByImportance(normalizeMatches(data));

    currentMatches = matches;
     window.currentMatches = currentMatches;

    if (liveElement) {
      liveElement.textContent =
        matches.length
          ? `🔴 ${matches.length} MATCH(S) LIVE`
          : "⚪ Aucun match live";
    }

    const list =
      $("scoreList");

    if (list) {

      if (!matches.length) {

        list.innerHTML =
          emptyCard(
            "Aucun match en direct actuellement."
          );

      } else {

       list.innerHTML =
  matches
    .map((match, index) =>
      createMatchHTML(
        match,
        index
      )
    )
    .join("");
      }
    }

    return matches;

  } catch (error) {

    console.error(
      "LIVE ERROR:",
      error
    );

    if (liveElement) {
      liveElement.textContent =
        "⚪ Live indisponible";
    }

    return [];
  }
}

/* =========================================================
   LOAD MATCHES BY DATE
========================================================= */

async function loadMatches(date) {

  const list =
    $("scoreList");

  if (!list) return;

  currentDate =
    date ||
    new Date()
      .toISOString()
      .split("T")[0];

  list.innerHTML =
    emptyCard(
      "Chargement des matchs..."
    );

  try {

    const response =
      await fetch(
        `${API_BASE}/api?date=${encodeURIComponent(currentDate)}`,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    let matches = sortMatchesByImportance(normalizeMatches(data));

    currentMatches = matches;
     window.currentMatches = [];

    /* FILTER */
    if (
      currentFilter &&
      currentFilter !== "all"
    ) {

      matches =
        matches.filter(match =>
          getLeague(match)
            .toLowerCase()
            .includes(
              currentFilter.toLowerCase()
            )
        );
    }

    if (!matches.length) {

      list.innerHTML =
        emptyCard(
          "Aucun match trouvé pour cette date."
        );

      return;
    }

  list.innerHTML =
  matches
    .map((match, index) =>
      createMatchHTML(
        match,
        index
      )
    )
    .join("");

  } catch (error) {

    console.error(
      "MATCHES ERROR:",
      error
    );

    list.innerHTML =
      emptyCard(
        "Impossible de charger les matchs."
      );
  }
}

/* =========================================================
   EMPTY CARD
========================================================= */

function emptyCard(message) {
  return `
    <div class="card">

      <div class="newsImg">
        ⚽
      </div>

      <h3>
        BakhiraFoot
      </h3>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>
  `;
}

/* =========================================================
   MATCH DETAILS MODAL
========================================================= */

function createMatchModal() {

  if ($("matchModal")) {
    return;
  }

  const modal =
    document.createElement("div");

  modal.id = "matchModal";

  modal.innerHTML = `
    <div
      class="bf-modal-overlay"
      onclick="closeMatchDetails(event)"
    >

      <div
        class="bf-modal"
        onclick="event.stopPropagation()"
      >

        <button
          class="bf-modal-close"
          onclick="closeMatchDetails()"
          aria-label="Fermer"
        >
          ✕
        </button>

        <div id="matchDetailsContent">
        </div>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  addModalStyles();
}

/* =========================================================
   MODAL STYLES
========================================================= */

function addModalStyles() {

  if ($("bakhira-modal-style")) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "bakhira-modal-style";

  style.textContent = `

    #matchModal {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
    }

    .bf-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.72);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-y: auto;
    }

    .bf-modal {
      position: relative;
      width: min(760px, 100%);
      max-height: 90vh;
      overflow-y: auto;
      background: var(--card, #ffffff);
      color: var(--text, #111827);
      border-radius: 22px;
      padding: 28px;
      box-shadow: 0 25px 80px rgba(0,0,0,.35);
      animation: bfModalIn .2s ease;
    }

    @keyframes bfModalIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(.97);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .bf-modal-close {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      background: rgba(127,127,127,.12);
      color: inherit;
      z-index: 2;
    }

    .bf-modal-close:hover {
      transform: scale(1.05);
    }

    .bf-details-league {
      text-align: center;
      font-size: 13px;
      opacity: .7;
      margin-bottom: 18px;
    }

    .bf-details-status {
      display: inline-block;
      padding: 7px 13px;
      border-radius: 999px;
      background: rgba(220,38,38,.1);
      margin-bottom: 18px;
      font-size: 13px;
      font-weight: 700;
    }

    .bf-details-teams {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 20px;
      text-align: center;
    }

    .bf-details-team {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      font-weight: 700;
    }

    .bf-details-team img,
    .bf-details-logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
    }

    .bf-details-fallback-logo {
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 42px;
    }

    .bf-details-score {
      font-size: 34px;
      font-weight: 900;
      white-space: nowrap;
    }

    .bf-details-time {
      text-align: center;
      opacity: .65;
      margin-top: 12px;
      font-size: 13px;
    }

    .bf-detail-section {
      margin-top: 25px;
      border-top: 1px solid rgba(127,127,127,.18);
      padding-top: 20px;
    }

    .bf-detail-section h3 {
      margin: 0 0 14px;
    }

    .bf-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .bf-detail-item {
      padding: 12px;
      border-radius: 12px;
      background: rgba(127,127,127,.08);
    }

    .bf-detail-item strong {
      display: block;
      margin-bottom: 4px;
    }

    .bf-events {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .bf-event {
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(127,127,127,.08);
    }

    .bf-stat {
      display: grid;
      grid-template-columns: 1fr 80px 1fr;
      gap: 10px;
      align-items: center;
      margin: 10px 0;
    }

    .bf-stat span:nth-child(1) {
      text-align: right;
    }

    .bf-stat span:nth-child(3) {
      text-align: left;
    }

    .bf-stat-name {
      text-align: center !important;
      font-size: 12px;
      opacity: .7;
    }

    @media (max-width: 600px) {

      .bf-modal {
        padding: 20px 15px;
        border-radius: 18px;
      }

      .bf-details-teams {
        gap: 8px;
      }

      .bf-details-score {
        font-size: 26px;
      }

      .bf-details-team {
        font-size: 13px;
      }

      .bf-details-team img,
      .bf-details-logo,
      .bf-details-fallback-logo {
        width: 55px;
        height: 55px;
      }

      .bf-detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   OPEN DETAILS
========================================================= */

async function openMatchDetails(index) {

  const match =
    currentMatches[index];

  if (!match) {
    toast("تفاصيل الماتش غير متوفرة");
    return;
  }

  createMatchModal();

  const content =
    $("matchDetailsContent");

  if (!content) return;

  // =========================
  // البيانات الموجودة حاليا
  // =========================

  const home = getHome(match);
  const away = getAway(match);

  const homeLogo = getHomeLogo(match);
  const awayLogo = getAwayLogo(match);

  const homeScore = getHomeScore(match);
  const awayScore = getAwayScore(match);

  const league = getLeague(match);
  const status = statusLabel(match);

  const date =
    match?.fixture?.date ||
    match?.date ||
    null;

  // =========================
  // نفتح الـmodal مباشرة
  // =========================

  content.innerHTML = `

    <div class="bf-details-league">
      🏆 ${escapeHTML(league)}
    </div>

    <div style="text-align:center">
      <div class="bf-details-status">
        ${escapeHTML(status)}
      </div>
    </div>

    <div class="bf-details-teams">

      <div class="bf-details-team">

        ${
          homeLogo
            ? `
              <img
                class="bf-details-logo"
                src="${escapeHTML(homeLogo)}"
                alt="${escapeHTML(home)}"
              >
            `
            : `
              <div class="bf-details-fallback-logo">
                ⚽
              </div>
            `
        }

        <span>
          ${escapeHTML(home)}
        </span>

      </div>

      <div>

        <div class="bf-details-score">
          ${escapeHTML(homeScore)}
          -
          ${escapeHTML(awayScore)}
        </div>

        ${
          date
            ? `
              <div class="bf-details-time">
                ${escapeHTML(formatDate(date))}
              </div>
            `
            : ""
        }

      </div>

      <div class="bf-details-team">

        ${
          awayLogo
            ? `
              <img
                class="bf-details-logo"
                src="${escapeHTML(awayLogo)}"
                alt="${escapeHTML(away)}"
              >
            `
            : `
              <div class="bf-details-fallback-logo">
                ⚽
              </div>
            `
        }

        <span>
          ${escapeHTML(away)}
        </span>

      </div>

    </div>

    <div class="bf-detail-section">

      <h3>⏳ تفاصيل المباراة</h3>

      <p style="opacity:.65">
        جاري تحميل تفاصيل المباراة...
      </p>

    </div>
  `;

  const modal =
    $("matchModal");

  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  // =========================
  // Fixture ID
  // =========================

  const fixtureId =
    getFixtureId(match);

  if (!fixtureId) {

    content.innerHTML += `
      <div class="bf-detail-section">
        <p style="opacity:.65">
          معرف المباراة غير متوفر.
        </p>
      </div>
    `;

    return;
  }

  // =========================
  // طلب التفاصيل من API
  // =========================

  try {

    const response =
      await fetch(
        `${API_BASE}/api?fixture=${encodeURIComponent(fixtureId)}`,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    console.log(
      "MATCH DETAILS:",
      data
    );

    // بعض APIs كترجع response
    // وبعضها data
    const details =
      data?.response?.[0] ||
      data?.data?.[0] ||
      data?.fixture ||
      data?.data ||
      data;

    if (!details) {
      throw new Error(
        "Aucune donnée détaillée"
      );
    }

    // =========================
    // معلومات المباراة
    // =========================

    const venue =
      details?.fixture?.venue?.name ||
      details?.venue?.name ||
      details?.venue ||
      null;

    const city =
      details?.fixture?.venue?.city ||
      details?.venue?.city ||
      null;

    const referee =
      details?.fixture?.referee ||
      details?.referee ||
      null;

    const round =
      details?.league?.round ||
      details?.round ||
      null;

    const season =
      details?.league?.season ||
      details?.season ||
      null;

    // =========================
    // Events
    // =========================

    const events =
      details?.events ||
      details?.fixture?.events ||
      [];

    // =========================
    // Statistics
    // =========================

    const statistics =
      details?.statistics ||
      [];

    // =========================
    // Lineups
    // =========================

    const lineups =
      details?.lineups ||
      [];

    // =========================
    // Players
    // =========================

    const players =
      details?.players ||
      [];

    // =========================
    // إعادة بناء التفاصيل
    // =========================

    content.innerHTML = `

      <div class="bf-details-league">
        🏆 ${escapeHTML(
          details?.league?.name ||
          league
        )}
      </div>

      <div style="text-align:center">
        <div class="bf-details-status">
          ${escapeHTML(
            statusLabel(details)
          )}
        </div>
      </div>

      <div class="bf-details-teams">

        <div class="bf-details-team">

          ${
            getHomeLogo(details)
              ? `
                <img
                  class="bf-details-logo"
                  src="${escapeHTML(
                    getHomeLogo(details)
                  )}"
                  alt="${escapeHTML(
                    getHome(details)
                  )}"
                >
              `
              : `
                <div class="bf-details-fallback-logo">
                  ⚽
                </div>
              `
          }

          <span>
            ${escapeHTML(
              getHome(details)
            )}
          </span>

        </div>

        <div>

          <div class="bf-details-score">
            ${escapeHTML(
              getHomeScore(details)
            )}
            -
            ${escapeHTML(
              getAwayScore(details)
            )}
          </div>

          ${
            date
              ? `
                <div class="bf-details-time">
                  ${escapeHTML(
                    formatDate(date)
                  )}
                </div>
              `
              : ""
          }

        </div>

        <div class="bf-details-team">

          ${
            getAwayLogo(details)
              ? `
                <img
                  class="bf-details-logo"
                  src="${escapeHTML(
                    getAwayLogo(details)
                  )}"
                  alt="${escapeHTML(
                    getAway(details)
                  )}"
                >
              `
              : `
                <div class="bf-details-fallback-logo">
                  ⚽
                </div>
              `
          }

          <span>
            ${escapeHTML(
              getAway(details)
            )}
          </span>

        </div>

      </div>

      ${
        venue ||
        city ||
        referee ||
        round ||
        season
          ? `
            <div class="bf-detail-section">

              <h3>
                📋 Informations
              </h3>

              <div class="bf-detail-grid">

                ${
                  venue
                    ? `
                      <div class="bf-detail-item">
                        <strong>🏟️ Stade</strong>
                        ${escapeHTML(venue)}
                        ${
                          city
                            ? ` — ${escapeHTML(city)}`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }

                ${
                  referee
                    ? `
                      <div class="bf-detail-item">
                        <strong>👨‍⚖️ Arbitre</strong>
                        ${escapeHTML(referee)}
                      </div>
                    `
                    : ""
                }

                ${
                  round
                    ? `
                      <div class="bf-detail-item">
                        <strong>🔢 Journée</strong>
                        ${escapeHTML(round)}
                      </div>
                    `
                    : ""
                }

                ${
                  season
                    ? `
                      <div class="bf-detail-item">
                        <strong>📅 Saison</strong>
                        ${escapeHTML(season)}
                      </div>
                    `
                    : ""
                }

              </div>

            </div>
          `
          : ""
      }

      ${
        events.length
          ? `
            <div class="bf-detail-section">

              <h3>
                ⚡ Événements
              </h3>

              <div class="bf-events">

                ${events
                  .map(event => {

                    const minute =
                      event?.time?.elapsed ??
                      event?.minute ??
                      "";

                    const player =
                      event?.player?.name ||
                      event?.player ||
                      "";

                    const assist =
                      event?.assist?.name ||
                      "";

                    const type =
                      event?.type ||
                      "";

                    const detail =
                      event?.detail ||
                      "";

                    return `
                      <div class="bf-event">

                        <strong>
                          ${escapeHTML(
                            minute
                              ? minute + "'"
                              : ""
                          )}
                        </strong>

                        ${escapeHTML(type)}
                        ${escapeHTML(detail)}

                        ${
                          player
                            ? `
                              — ${escapeHTML(player)}
                            `
                            : ""
                        }

                        ${
                          assist
                            ? `
                              <small>
                                · Assist:
                                ${escapeHTML(assist)}
                              </small>
                            `
                            : ""
                        }

                      </div>
                    `;

                  })
                  .join("")}

              </div>

            </div>
          `
          : `
            <div class="bf-detail-section">

              <h3>
                ⚡ Événements
              </h3>

              <p style="opacity:.65">
                Aucun événement disponible.
              </p>

            </div>
          `
      }

      ${
        statistics.length
          ? `
            <div class="bf-detail-section">

              <h3>
                📊 Statistiques
              </h3>

              ${renderStatistics(
                statistics
              )}

            </div>
          `
          : ""
      }

      ${
        lineups.length
          ? `
            <div class="bf-detail-section">

              <h3>
                👥 Compositions
              </h3>

              <pre style="
                white-space:pre-wrap;
                font-size:12px;
                opacity:.8;
              ">${escapeHTML(
                JSON.stringify(
                  lineups,
                  null,
                  2
                )
              )}</pre>

            </div>
          `
          : ""
      }

      ${
        players.length
          ? `
            <div class="bf-detail-section">

              <h3>
                ⭐ Joueurs
              </h3>

              <pre style="
                white-space:pre-wrap;
                font-size:12px;
                opacity:.8;
              ">${escapeHTML(
                JSON.stringify(
                  players,
                  null,
                  2
                )
              )}</pre>

            </div>
          `
          : ""
      }

    `;

  } catch (error) {

    console.error(
      "MATCH DETAILS ERROR:",
      error
    );

    content.innerHTML += `
      <div class="bf-detail-section">

        <h3>
          ⚠️ Détails
        </h3>

        <p style="opacity:.65">
          تعذر تحميل التفاصيل الإضافية
          ديال هاد الماتش.
        </p>

      </div>
    `;
  }
}

/* =========================================================
   STATISTICS
========================================================= */

function renderStatistics(statistics) {

  if (!Array.isArray(statistics)) {
    return "";
  }

  let html = "";

  statistics.forEach(teamStats => {

    const team =
      teamStats?.team?.name ||
      "";

    const stats =
      teamStats?.statistics ||
      [];

    if (!stats.length) return;

    html += `
      <div style="margin-bottom:18px">

        <strong>
          ${escapeHTML(team)}
        </strong>

        ${
          stats
            .slice(0, 10)
            .map(stat => {

              const name =
                stat?.type ||
                stat?.name ||
                "Stat";

              const value =
                stat?.value ??
                "-";

              return `
                <div
                  class="bf-detail-item"
                  style="margin-top:7px"
                >
                  <strong>
                    ${escapeHTML(name)}
                  </strong>

                  ${escapeHTML(value)}
                </div>
              `;

            })
            .join("")
        }

      </div>
    `;
  });

  return html ||
    `
      <p style="opacity:.65">
        Aucune statistique disponible.
      </p>
    `;
}

/* =========================================================
   CLOSE MODAL
========================================================= */

function closeMatchDetails(event) {

  if (
    event &&
    event.target &&
    !event.target.classList.contains(
      "bf-modal-overlay"
    )
  ) {
    return;
  }

  const modal =
    $("matchModal");

  if (modal) {
    modal.style.display = "none";
  }

  document.body.style.overflow = "";
}

/* ESC KEY */
document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {
      closeMatchDetails();
    }

  }
);

/* =========================================================
   DATE BAR
========================================================= */

function createDateBar() {

  const bar =
    $("dateBar");

  if (!bar) return;

  bar.innerHTML = "";

  const today =
    new Date();

  for (
    let i = -2;
    i <= 4;
    i++
  ) {

    const date =
      new Date(today);

    date.setDate(
      today.getDate() + i
    );

    const iso =
      date
        .toISOString()
        .split("T")[0];

    let label;

    if (i === 0) {
      label = "Aujourd'hui";
    } else if (i === -1) {
      label = "Hier";
    } else if (i === 1) {
      label = "Demain";
    } else {
      label =
        date.toLocaleDateString(
          "fr-FR",
          {
            weekday: "short",
            day: "numeric",
            month: "short"
          }
        );
    }

    const button =
      document.createElement("button");

    button.textContent =
      label;

    if (
      iso ===
      (
        currentDate ||
        today
          .toISOString()
          .split("T")[0]
      )
    ) {
      button.classList.add(
        "selected"
      );
    }

    button.addEventListener(
      "click",
      () => {

        bar
          .querySelectorAll("button")
          .forEach(btn =>
            btn.classList.remove(
              "selected"
            )
          );

        button.classList.add(
          "selected"
        );

        currentDate = iso;

        loadMatches(iso);
      }
    );

    bar.appendChild(button);
  }
}

/* =========================================================
   LEAGUES
========================================================= */

const leagues = [
  {
    name: "🏆 Champions League",
    key: "Champions League",
    country: "Europe"
  },
  {
    name: "🏴 Premier League",
    key: "Premier League",
    country: "England"
  },
  {
    name: "🇪🇸 La Liga",
    key: "La Liga",
    country: "Spain"
  },
  {
    name: "🇫🇷 Ligue 1",
    key: "Ligue 1",
    country: "France"
  },
  {
    name: "🇲🇦 Botola Pro",
    key: "Botola",
    country: "Morocco"
  }
];

function renderLeagues() {

  const grid =
    $("leagueGrid");

  if (!grid) return;

  grid.innerHTML =
    leagues
      .map(league => `

        <div
          class="league"
          data-league="${escapeHTML(league.key)}"
          onclick="filterLeague('${escapeHTML(league.key)}')"
          style="cursor:pointer"
        >

          ${escapeHTML(league.name)}

          <small>
            ${escapeHTML(league.country)}
          </small>

        </div>

      `)
      .join("");
}

function filterLeague(league) {

  currentFilter = league;

  go("scores");

  setTimeout(() => {

    loadMatches(currentDate);

    toast(
      `🏆 ${league}`
    );

  }, 100);
}

/* =========================================================
   TEAMS
========================================================= */

const teams = [
  {
    name: "Barcelona",
    logo: "🔵🔴",
    country: "Spain"
  },
  {
    name: "Real Madrid",
    logo: "⚪",
    country: "Spain"
  },
  {
    name: "Liverpool",
    logo: "🔴",
    country: "England"
  },
  {
    name: "Chelsea",
    logo: "🔵",
    country: "England"
  },
  {
    name: "Arsenal",
    logo: "🔴⚪",
    country: "England"
  },
  {
    name: "PSG",
    logo: "🔵🔴",
    country: "France"
  },
  {
    name: "Raja CA",
    logo: "🟢",
    country: "Morocco"
  },
  {
    name: "Wydad",
    logo: "🔴",
    country: "Morocco"
  }
];

function renderTeams() {

  const grid =
    $("teamGrid");

  if (!grid) return;

  grid.innerHTML =
    teams
      .map(team => `

        <div
          class="card"
          onclick="showTeam('${escapeHTML(team.name)}')"
          style="cursor:pointer"
        >

          <div
            class="teamLogo"
            style="font-size:45px"
          >
            ${team.logo}
          </div>

          <h3>
            ${escapeHTML(team.name)}
          </h3>

          <p>
            ${escapeHTML(team.country)}
          </p>

        </div>

      `)
      .join("");
}

function showTeam(name) {

  const detail =
    $("teamDetail");

  if (!detail) return;

  const team =
    teams.find(
      item =>
        item.name === name
    );

  if (!team) return;

  detail.innerHTML = `

    <div class="card">

      <div
        style="
          text-align:center;
          font-size:55px;
        "
      >
        ${team.logo}
      </div>

      <h2>
        ${escapeHTML(team.name)}
      </h2>

      <p>
        ${escapeHTML(team.country)}
      </p>

    </div>

  `;

  detail.scrollIntoView({
    behavior: "smooth"
  });
}

/* =========================================================
   NEWS
========================================================= */

const news = [
  {
    title: "BakhiraFoot",
    text: "Bienvenue sur BakhiraFoot : scores, matchs, compétitions et actualités football.",
    icon: "⚽"
  },
  {
    title: "Football mondial",
    text: "Retrouve les grandes compétitions et les résultats de tes équipes préférées.",
    icon: "🌍"
  },
  {
    title: "Botola Pro",
    text: "Suivez également le football marocain et les grands clubs de la Botola.",
    icon: "🇲🇦"
  }
];

function renderNews() {

  const grid =
    $("newsGrid");

  if (!grid) return;

  grid.innerHTML =
    news
      .map(item => `

        <div class="card">

          <div class="newsImg">
            ${item.icon}
          </div>

          <h3>
            ${escapeHTML(item.title)}
          </h3>

          <p>
            ${escapeHTML(item.text)}
          </p>

        </div>

      `)
      .join("");
}

function renderHomeNews() {

  const grid =
    $("homeNews");

  if (!grid) return;

  grid.innerHTML =
    news
      .map(item => `

        <div class="card">

          <div class="newsImg">
            ${item.icon}
          </div>

          <h3>
            ${escapeHTML(item.title)}
          </h3>

          <p>
            ${escapeHTML(item.text)}
          </p>

        </div>

      `)
      .join("");
}

/* =========================================================
   HOME
========================================================= */

async function renderHomeMatches() {

  const container =
    $("homeMatches");

  if (!container) return;

  try {

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const response =
      await fetch(
        `${API_BASE}/api?date=${today}`,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    const matches =
      normalizeMatches(data);

    if (!matches.length) {

      container.innerHTML =
        emptyCard(
          "Aucun match aujourd'hui."
        );

      return;
    }

    container.innerHTML =
      matches
        .slice(0, 6)
        .map((match, index) =>
          createMatchHTML(
            match,
            index
          )
        )
        .join("");

  } catch (error) {

    console.error(
      "HOME MATCH ERROR:",
      error
    );

    container.innerHTML =
      emptyCard(
        "Impossible de charger les matchs."
      );
  }
}

function renderTables() {

  const container =
    $("homeTables");

  if (!container) return;

  container.innerHTML = `

    <div class="table">

      <h3>
        🇪🇸 La Liga
      </h3>

      <table>

        <tr>
          <th>#</th>
          <th>Équipe</th>
          <th>Pts</th>
        </tr>

        <tr>
          <td>1</td>
          <td>Barcelona</td>
          <td>--</td>
        </tr>

        <tr>
          <td>2</td>
          <td>Real Madrid</td>
          <td>--</td>
        </tr>

        <tr>
          <td>3</td>
          <td>Atlético</td>
          <td>--</td>
        </tr>

      </table>

    </div>

    <div class="table">

      <h3>
        🇲🇦 Botola Pro
      </h3>

      <table>

        <tr>
          <th>#</th>
          <th>Équipe</th>
          <th>Pts</th>
        </tr>

        <tr>
          <td>1</td>
          <td>Raja CA</td>
          <td>--</td>
        </tr>

        <tr>
          <td>2</td>
          <td>Wydad</td>
          <td>--</td>
        </tr>

        <tr>
          <td>3</td>
          <td>FAR</td>
          <td>--</td>
        </tr>

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
   FILTERS
========================================================= */

function initFilters() {

  const filters =
    document.querySelectorAll(
      ".filter[data-filter]"
    );

  filters.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        filters.forEach(btn =>
          btn.classList.remove(
            "active"
          )
        );

        button.classList.add(
          "active"
        );

        currentFilter =
          button.dataset.filter ||
          "all";

        if (
          $("scores")?.classList.contains(
            "active"
          )
        ) {
          loadMatches(currentDate);
        } else {
          go("scores");
        }
      }
    );
  });
}

/* =========================================================
   SEARCH
========================================================= */

function initSearch() {

  const input =
    $("search");

  if (!input) return;

  input.addEventListener(
    "input",
    () => {

      const value =
        input.value
          .trim()
          .toLowerCase();

      if (!value) return;

      go("teams");

      document
        .querySelectorAll(
          "#teamGrid .card"
        )
        .forEach(card => {

          card.style.display =
            card.textContent
              .toLowerCase()
              .includes(value)
              ? ""
              : "none";
        });
    }
  );
}

/* =========================================================
   THEME
========================================================= */

function initTheme() {

  const button =
    $("theme");

  if (!button) return;

  const saved =
    localStorage.getItem(
      "bakhirafoot-theme"
    );

  if (saved === "dark") {

    document.body.classList.add(
      "dark"
    );

    button.textContent =
      "☀";
  }

  button.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "dark"
      );

      const dark =
        document.body.classList.contains(
          "dark"
        );

      button.textContent =
        dark ? "☀" : "☾";

      localStorage.setItem(
        "bakhirafoot-theme",
        dark
          ? "dark"
          : "light"
      );
    }
  );
}

/* =========================================================
   NAVIGATION BUTTONS
========================================================= */

function initNavigation() {

  const buttons =
    document.querySelectorAll(
      "nav button[data-page]"
    );

  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        go(
          button.dataset.page
        );

      }
    );

  });
}

/* =========================================================
   LIVE REFRESH
========================================================= */

function startLiveRefresh() {

  setInterval(
    () => {

      if (
        $("scores")?.classList.contains(
          "active"
        )
      ) {

        loadLive();

      }

    },
    60000
  );
}

/* =========================================================
   START APP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "⚓ BakhiraFoot Pro chargé"
    );

    createMatchModal();

    initNavigation();
    initFilters();
    initSearch();
    initTheme();

    currentDate =
      new Date()
        .toISOString()
        .split("T")[0];

    createDateBar();

    renderHome();
    renderLeagues();
    renderTeams();
    renderNews();

    startLiveRefresh();

  }
);
