/* =========================================================
   BAKHIRAFOOT PRO
   LIVE + MATCH DETAILS PRO
   FORMATION + PITCH + PLAYERS + RATINGS + EVENTS
   No HTML/CSS changes required
========================================================= */

const API_BASE = "";

/* =========================================================
   GLOBAL DATA
========================================================= */

let currentMatches = [];
let currentDate = null;
let currentFilter = "all";
let currentOpenedFixture = null;

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

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
    match?.fixture?.status?.short ||
    match?.fixture?.status?.long ||
    match?.status?.short ||
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

function getHomeId(match) {
  return (
    match?.teams?.home?.id ||
    match?.home?.id ||
    null
  );
}

function getAwayId(match) {
  return (
    match?.teams?.away?.id ||
    match?.away?.id ||
    null
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

function getFixtureId(match) {
  return (
    match?.fixture?.slug ||
    match?.slug ||
    match?.fixture?.id ||
    match?.id ||
    null
  );
}

/* =========================================================
   MATCH IMPORTANCE
========================================================= */

function getCompetitionPriority(match) {
  const league = normalizeText(getLeague(match));

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
    league.includes("copa america")
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
    league.includes("coupe du monde qualification")
  ) return 60;

  if (
    league.includes("botola") ||
    league.includes("botola pro") ||
    league.includes("morocco")
  ) return 55;

  return 10;
}

function getTeamPriority(match) {
  const home = normalizeText(getHome(match));
  const away = normalizeText(getAway(match));

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

  if (
    ["1H", "2H", "LIVE", "ET", "P", "BT"].includes(status) ||
    status.includes("LIVE")
  ) {
    priority += 1000;
  }

  if (
    status === "HT" ||
    status.includes("HALF")
  ) {
    priority += 900;
  }

  return priority;
}

function sortMatchesByImportance(matches) {
  return [...matches].sort((a, b) => {
    const priorityA = getMatchPriority(a);
    const priorityB = getMatchPriority(b);

    return priorityB - priorityA;
  });
}

/* =========================================================
   NORMALIZE API DATA
========================================================= */

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

function extractMatchDetails(data) {
  if (!data) return null;

  /*
     بعض الـproxy APIs كيرجعو مباشرة:
     {
       fixture: {...},
       events: [...],
       lineups: [...],
       statistics: [...],
       players: [...]
     }
  */

  if (
    data.fixture ||
    data.events ||
    data.lineups ||
    data.statistics ||
    data.players
  ) {
    return data;
  }

  if (Array.isArray(data.response)) {
    return data.response[0] || null;
  }

  if (Array.isArray(data.data)) {
    return data.data[0] || null;
  }

  if (data.data?.fixture) {
    return data.data;
  }

  return data;
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
    return minute !== null && minute !== undefined
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
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const matches =
      sortMatchesByImportance(
        normalizeMatches(data)
      );

    /*
       مهم:
       currentMatches دابا كيمثل بالضبط
       الماتشات اللي معروضة، باش click/index
       يبقى صحيح حتى مع filter.
    */
    currentMatches = matches;

    if (liveElement) {
      liveElement.textContent =
        matches.length
          ? `🔴 ${matches.length} MATCH(S) LIVE`
          : "⚪ Aucun match live";
    }

    const list = $("scoreList");

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
              createMatchHTML(match, index)
            )
            .join("");
      }
    }

    return matches;

  } catch (error) {
    console.error("LIVE ERROR:", error);

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

  const list = $("scoreList");

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

    let matches =
      sortMatchesByImportance(
        normalizeMatches(data)
      );

    if (
      currentFilter &&
      currentFilter !== "all"
    ) {
      matches =
        matches.filter(match =>
          normalizeText(getLeague(match))
            .includes(
              normalizeText(currentFilter)
            )
        );
    }

    /*
       كنخزنو غير الماتشات اللي فعلا
       باينين للمستخدم.
    */
    currentMatches = matches;

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
   MODAL CREATION
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

        <div id="matchDetailsContent"></div>

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
      background: rgba(0,0,0,.76);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      overflow-y: auto;
      backdrop-filter: blur(5px);
    }

    .bf-modal {
      position: relative;
      width: min(1100px, 100%);
      max-height: 94vh;
      overflow-y: auto;
      background: var(--card, #ffffff);
      color: var(--text, #111827);
      border-radius: 24px;
      padding: 30px;
      box-shadow:
        0 25px 90px rgba(0,0,0,.45);
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
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      background: rgba(127,127,127,.12);
      color: inherit;
      z-index: 5;
      transition: .2s;
    }

    .bf-modal-close:hover {
      transform: rotate(8deg) scale(1.05);
    }

    .bf-details-league {
      text-align: center;
      font-size: 13px;
      opacity: .7;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .bf-details-round {
      text-align: center;
      font-size: 12px;
      opacity: .55;
      margin-bottom: 14px;
    }

    .bf-details-status-wrap {
      text-align: center;
      margin-bottom: 20px;
    }

    .bf-details-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 7px 14px;
      border-radius: 999px;
      background: rgba(220,38,38,.1);
      font-size: 13px;
      font-weight: 800;
    }

    .bf-details-teams {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 24px;
      text-align: center;
    }

    .bf-details-team {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      min-width: 0;
    }

    .bf-details-team-name {
      line-height: 1.25;
    }

    .bf-details-team img,
    .bf-details-logo {
      width: 82px;
      height: 82px;
      object-fit: contain;
    }

    .bf-details-fallback-logo {
      width: 82px;
      height: 82px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 46px;
    }

    .bf-details-score {
      font-size: 38px;
      font-weight: 950;
      white-space: nowrap;
      letter-spacing: 1px;
    }

    .bf-details-time {
      text-align: center;
      opacity: .62;
      margin-top: 9px;
      font-size: 12px;
    }

    .bf-details-venue {
      text-align: center;
      margin-top: 9px;
      font-size: 12px;
      opacity: .55;
    }

    .bf-detail-section {
      margin-top: 28px;
      border-top: 1px solid rgba(127,127,127,.17);
      padding-top: 22px;
    }

    .bf-detail-section h3 {
      margin: 0 0 16px;
      font-size: 18px;
    }

    .bf-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .bf-detail-item {
      padding: 12px;
      border-radius: 13px;
      background: rgba(127,127,127,.08);
    }

    .bf-detail-item strong {
      display: block;
      margin-bottom: 4px;
    }

    /* ========================================
       FORMATION AREA
    ======================================== */

    .bf-formation-summary {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 12px;
      align-items: center;
      margin-bottom: 18px;
    }

    .bf-formation-team {
      text-align: center;
      font-weight: 850;
    }

    .bf-formation-team small {
      display: block;
      margin-top: 5px;
      opacity: .55;
      font-weight: 600;
    }

    .bf-formation-vs {
      font-weight: 900;
      opacity: .45;
    }

    .bf-pitches {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }

    .bf-pitch-box {
      border-radius: 18px;
      overflow: hidden;
      background: rgba(127,127,127,.06);
      border: 1px solid rgba(127,127,127,.14);
    }

    .bf-pitch-title {
      padding: 13px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-weight: 800;
    }

    .bf-pitch-formation {
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(127,127,127,.11);
      font-size: 12px;
      font-weight: 900;
    }

    .bf-pitch {
      position: relative;
      width: 100%;
      aspect-ratio: 0.67;
      overflow: hidden;
      background:
        repeating-linear-gradient(
          90deg,
          #318447 0,
          #318447 10%,
          #357f45 10%,
          #357f45 20%
        );
    }

    .bf-pitch::before {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px solid rgba(255,255,255,.9);
      pointer-events: none;
    }

    .bf-pitch-line-half {
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 2px;
      background: rgba(255,255,255,.9);
    }

    .bf-pitch-center-circle {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 18%;
      aspect-ratio: 1;
      transform: translate(-50%, -50%);
      border: 2px solid rgba(255,255,255,.9);
      border-radius: 50%;
    }

    .bf-pitch-center-dot {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
    }

    .bf-pitch-box-area {
      position: absolute;
      left: 26%;
      width: 48%;
      height: 15%;
      border: 2px solid rgba(255,255,255,.9);
    }

    .bf-pitch-box-area.top {
      top: 0;
      border-top: 0;
    }

    .bf-pitch-box-area.bottom {
      bottom: 0;
      border-bottom: 0;
    }

    .bf-pitch-goal-area {
      position: absolute;
      left: 39%;
      width: 22%;
      height: 6%;
      border: 2px solid rgba(255,255,255,.9);
    }

    .bf-pitch-goal-area.top {
      top: 0;
      border-top: 0;
    }

    .bf-pitch-goal-area.bottom {
      bottom: 0;
      border-bottom: 0;
    }

    .bf-pitch-player {
      position: absolute;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 2;
      width: 82px;
      pointer-events: none;
    }

    .bf-shirt {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 950;
      background: #ffffff;
      color: #111827;
      border: 3px solid rgba(0,0,0,.18);
      box-shadow: 0 4px 10px rgba(0,0,0,.3);
    }

    .bf-pitch-name {
      margin-top: 4px;
      padding: 3px 6px;
      max-width: 80px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-radius: 6px;
      background: rgba(0,0,0,.62);
      color: #fff;
      font-size: 9px;
      font-weight: 750;
    }

    .bf-pitch-rating {
      margin-top: 2px;
      font-size: 9px;
      font-weight: 900;
      padding: 2px 5px;
      border-radius: 5px;
      background: rgba(255,255,255,.93);
      color: #111827;
    }

    .bf-coach {
      padding: 10px 14px;
      font-size: 12px;
      opacity: .72;
      border-top: 1px solid rgba(127,127,127,.12);
    }

    /* ========================================
       PLAYER LIST
    ======================================== */

    .bf-player-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }

    .bf-player-team-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      padding-bottom: 9px;
      border-bottom: 1px solid rgba(127,127,127,.14);
      font-weight: 900;
    }

    .bf-player-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .bf-player-row {
      display: grid;
      grid-template-columns: 42px 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 10px;
      border-radius: 12px;
      background: rgba(127,127,127,.07);
    }

    .bf-player-number {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(127,127,127,.12);
      font-weight: 950;
      font-size: 12px;
    }

    .bf-player-main {
      min-width: 0;
    }

    .bf-player-name {
      font-weight: 850;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bf-player-position {
      margin-top: 2px;
      font-size: 10px;
      opacity: .55;
    }

    .bf-player-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 4px;
    }

    .bf-player-action {
      min-width: 29px;
      padding: 4px 6px;
      border-radius: 7px;
      background: rgba(127,127,127,.12);
      font-size: 10px;
      font-weight: 850;
      text-align: center;
    }

    .bf-rating {
      background: rgba(245,158,11,.16);
    }

    .bf-goal {
      background: rgba(34,197,94,.16);
    }

    .bf-assist {
      background: rgba(59,130,246,.16);
    }

    .bf-yellow {
      background: rgba(250,204,21,.2);
    }

    .bf-red {
      background: rgba(239,68,68,.17);
    }

    .bf-keypass {
      background: rgba(168,85,247,.16);
    }

    .bf-substitute {
      opacity: .62;
    }

    /* ========================================
       SUBSTITUTES
    ======================================== */

    .bf-bench-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }

    .bf-bench {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .bf-bench-player {
      display: grid;
      grid-template-columns: 32px 1fr auto;
      gap: 8px;
      align-items: center;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(127,127,127,.06);
    }

    .bf-bench-number {
      font-size: 11px;
      font-weight: 900;
      opacity: .65;
    }

    .bf-bench-name {
      font-size: 12px;
      font-weight: 750;
    }

    .bf-bench-rating {
      font-size: 10px;
      font-weight: 900;
      opacity: .7;
    }

    /* ========================================
       EVENTS
    ======================================== */

    .bf-events {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .bf-event {
      display: grid;
      grid-template-columns: 52px 30px 1fr;
      gap: 9px;
      align-items: center;
      padding: 10px 12px;
      border-radius: 11px;
      background: rgba(127,127,127,.08);
    }

    .bf-event-minute {
      font-weight: 950;
      font-size: 12px;
    }

    .bf-event-icon {
      font-size: 19px;
      text-align: center;
    }

    .bf-event-main {
      min-width: 0;
    }

    .bf-event-player {
      font-weight: 850;
    }

    .bf-event-assist {
      margin-top: 2px;
      font-size: 11px;
      opacity: .62;
    }

    .bf-event-team {
      margin-top: 2px;
      font-size: 10px;
      opacity: .5;
    }

    .bf-event.home {
      border-left: 3px solid rgba(59,130,246,.55);
    }

    .bf-event.away {
      border-left: 3px solid rgba(239,68,68,.55);
    }

    /* ========================================
       STATISTICS
    ======================================== */

    .bf-stat-table {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .bf-stat-row {
      display: grid;
      grid-template-columns: 1fr 100px 1fr;
      gap: 10px;
      align-items: center;
    }

    .bf-stat-value-home,
    .bf-stat-value-away {
      font-weight: 850;
      font-size: 12px;
    }

    .bf-stat-value-home {
      text-align: right;
    }

    .bf-stat-value-away {
      text-align: left;
    }

    .bf-stat-name {
      text-align: center;
      font-size: 11px;
      opacity: .65;
    }

    .bf-stat-bar {
      grid-column: 1 / 4;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px;
      height: 4px;
    }

    .bf-stat-bar-home,
    .bf-stat-bar-away {
      border-radius: 99px;
      background: rgba(127,127,127,.23);
    }

    .bf-stat-bar-home {
      justify-self: end;
      width: 100%;
    }

    .bf-stat-bar-away {
      justify-self: start;
      width: 100%;
    }

    /* ========================================
       RESPONSIVE
    ======================================== */

    @media (max-width: 850px) {

      .bf-pitches {
        grid-template-columns: 1fr;
      }

      .bf-player-columns,
      .bf-bench-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {

      .bf-modal {
        padding: 22px 13px;
        border-radius: 18px;
      }

      .bf-details-teams {
        gap: 8px;
      }

      .bf-details-score {
        font-size: 27px;
      }

      .bf-details-team {
        font-size: 12px;
      }

      .bf-details-team img,
      .bf-details-logo,
      .bf-details-fallback-logo {
        width: 58px;
        height: 58px;
      }

      .bf-detail-grid {
        grid-template-columns: 1fr;
      }

      .bf-formation-summary {
        grid-template-columns: 1fr;
      }

      .bf-formation-vs {
        display: none;
      }

      .bf-event {
        grid-template-columns: 45px 27px 1fr;
      }

      .bf-player-row {
        grid-template-columns: 38px 1fr;
      }

      .bf-player-actions {
        grid-column: 2;
        justify-content: flex-start;
      }

      .bf-stat-row {
        grid-template-columns: 1fr 75px 1fr;
      }

      .bf-pitch-player {
        width: 68px;
      }

      .bf-shirt {
        width: 30px;
        height: 30px;
        font-size: 10px;
      }

      .bf-pitch-name {
        max-width: 67px;
        font-size: 8px;
      }

      .bf-pitch-rating {
        font-size: 8px;
      }
    }

  `;

  document.head.appendChild(style);
}

/* =========================================================
   PLAYER / STATS HELPERS
========================================================= */

function getPlayerId(player) {
  return (
    player?.player?.id ||
    player?.id ||
    null
  );
}

function getPlayerName(player) {
  return (
    player?.player?.name ||
    player?.name ||
    "Joueur"
  );
}

function getPlayerNumber(player) {
  return (
    player?.player?.number ??
    player?.number ??
    "-"
  );
}

function getPlayerPosition(player) {
  return (
    player?.player?.pos ||
    player?.pos ||
    player?.games?.position ||
    player?.position ||
    ""
  );
}

function getPlayerGrid(player) {
  return (
    player?.player?.grid ||
    player?.grid ||
    null
  );
}

function getPlayerPhoto(player) {
  return (
    player?.player?.photo ||
    player?.photo ||
    ""
  );
}

function getFirstStatistic(playerRow) {
  if (!playerRow) return null;

  if (
    Array.isArray(
      playerRow.statistics
    )
  ) {
    return (
      playerRow.statistics[0] ||
      null
    );
  }

  if (
    playerRow.statistics &&
    typeof playerRow.statistics === "object"
  ) {
    return playerRow.statistics;
  }

  return playerRow;
}

function unwrapPlayers(players) {
  if (Array.isArray(players)) {
    return players;
  }

  if (Array.isArray(players?.response)) {
    return players.response;
  }

  if (Array.isArray(players?.data)) {
    return players.data;
  }

  return [];
}

function buildPlayerPerformanceMap(players) {

  const map = new Map();

  const groups =
    unwrapPlayers(players);

  groups.forEach(group => {

    const teamId =
      group?.team?.id ||
      null;

    const rows =
      Array.isArray(group?.players)
        ? group.players
        : [];

    rows.forEach(row => {

      const player =
        row?.player ||
        row ||
        {};

      const id =
        player?.id ||
        null;

      const name =
        player?.name ||
        "";

      const statistic =
        getFirstStatistic(row);

      const keys = [];

      if (teamId && id) {
        keys.push(
          `${teamId}-${id}`
        );
      }

      if (id) {
        keys.push(
          `id-${id}`
        );
      }

      if (name) {
        keys.push(
          `name-${normalizeText(name)}`
        );
      }

      keys.forEach(key => {
        map.set(key, {
          player,
          statistics: statistic
        });
      });

    });
  });

  return map;
}

function getPerformance(
  player,
  teamId,
  performanceMap
) {

  const id =
    getPlayerId(player);

  const name =
    getPlayerName(player);

  const possibleKeys = [
    teamId && id
      ? `${teamId}-${id}`
      : null,

    id
      ? `id-${id}`
      : null,

    name
      ? `name-${normalizeText(name)}`
      : null

  ].filter(Boolean);

  for (const key of possibleKeys) {

    if (performanceMap.has(key)) {
      return performanceMap.get(key);
    }
  }

  return null;
}

/* =========================================================
   EVENT CONTRIBUTIONS
========================================================= */

function buildEventContributions(events) {

  const map = new Map();

  if (!Array.isArray(events)) {
    return map;
  }

  function ensure(key) {

    if (!map.has(key)) {
      map.set(key, {
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        shots: 0
      });
    }

    return map.get(key);
  }

  events.forEach(event => {

    const playerId =
      event?.player?.id ||
      null;

    const playerName =
      event?.player?.name ||
      "";

    const keys = [];

    if (playerId) {
      keys.push(
        `id-${playerId}`
      );
    }

    if (playerName) {
      keys.push(
        `name-${normalizeText(playerName)}`
      );
    }

    if (!keys.length) {
      return;
    }

    const type =
      normalizeText(
        event?.type
      );

    const detail =
      normalizeText(
        event?.detail
      );

    keys.forEach(key => {

      const item =
        ensure(key);

      if (
        type.includes("goal") &&
        !detail.includes("missed")
      ) {
        item.goals += 1;
      }

      if (
        event?.assist?.id ||
        event?.assist?.name
      ) {
        const assistId =
          event?.assist?.id ||
          null;

        const assistName =
          event?.assist?.name ||
          "";

        if (
          (
            assistId &&
            key === `id-${assistId}`
          ) ||
          (
            assistName &&
            key ===
              `name-${normalizeText(assistName)}`
          )
        ) {
          item.assists += 1;
        }
      }

      if (
        type.includes("card")
      ) {

        if (
          detail.includes("yellow-red") ||
          detail.includes("second yellow") ||
          detail.includes("red")
        ) {
          item.red += 1;
        } else if (
          detail.includes("yellow")
        ) {
          item.yellow += 1;
        }
      }

    });

  });

  /* assistants are easier to calculate separately */
  events.forEach(event => {

    const assistId =
      event?.assist?.id ||
      null;

    const assistName =
      event?.assist?.name ||
      "";

    if (!assistId && !assistName) {
      return;
    }

    const keys = [];

    if (assistId) {
      keys.push(
        `id-${assistId}`
      );
    }

    if (assistName) {
      keys.push(
        `name-${normalizeText(assistName)}`
      );
    }

    keys.forEach(key => {

      const item =
        ensure(key);

      if (
        normalizeText(event?.type)
          .includes("goal")
      ) {
        item.assists += 1;
      }
    });

  });

  return map;
}

function getEventContribution(
  player,
  eventMap
) {

  const id =
    getPlayerId(player);

  const name =
    getPlayerName(player);

  if (
    id &&
    eventMap.has(`id-${id}`)
  ) {
    return eventMap.get(
      `id-${id}`
    );
  }

  if (
    name &&
    eventMap.has(
      `name-${normalizeText(name)}`
    )
  ) {
    return eventMap.get(
      `name-${normalizeText(name)}`
    );
  }

  return {
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    shots: 0
  };
}

function numberOrZero(value) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getPlayerData(
  player,
  teamId,
  performanceMap,
  eventMap
) {

  const performance =
    getPerformance(
      player,
      teamId,
      performanceMap
    );

  const stats =
    performance?.statistics ||
    {};

  const game =
    stats?.games ||
    {};

  const goalsObject =
    stats?.goals ||
    {};

  const cardsObject =
    stats?.cards ||
    {};

  const shotsObject =
    stats?.shots ||
    {};

  const passesObject =
    stats?.passes ||
    {};

  const eventData =
    getEventContribution(
      player,
      eventMap
    );

  const goalsApi =
    numberOrZero(
      goalsObject?.total
    );

  const assistsApi =
    numberOrZero(
      goalsObject?.assists
    );

  const yellowApi =
    numberOrZero(
      cardsObject?.yellow
    );

  const redApi =
    numberOrZero(
      cardsObject?.red
    );

  return {

    id:
      getPlayerId(player),

    name:
      getPlayerName(player),

    number:
      getPlayerNumber(player),

    position:
      getPlayerPosition(player),

    grid:
      getPlayerGrid(player),

    photo:
      getPlayerPhoto(player),

    rating:
      game?.rating ??
      null,

    minutes:
      game?.minutes ??
      null,

    substitute:
      game?.substitute === true,

    captain:
      game?.captain === true,

    goals:
      goalsApi ||
      eventData.goals ||
      0,

    assists:
      assistsApi ||
      eventData.assists ||
      0,

    yellow:
      yellowApi ||
      eventData.yellow ||
      0,

    red:
      redApi ||
      eventData.red ||
      0,

    keyPasses:
      numberOrZero(
        passesObject?.key
      ),

    shots:
      numberOrZero(
        shotsObject?.total
      ),

    shotsOn:
      numberOrZero(
        shotsObject?.on
      )

  };
}

/* =========================================================
   LINEUPS
========================================================= */

function normalizeLineups(lineups) {

  if (Array.isArray(lineups)) {
    return lineups;
  }

  if (
    Array.isArray(
      lineups?.response
    )
  ) {
    return lineups.response;
  }

  if (
    Array.isArray(
      lineups?.data
    )
  ) {
    return lineups.data;
  }

  return [];
}

function getLineupForTeam(
  lineups,
  teamId,
  teamName
) {

  const groups =
    normalizeLineups(
      lineups
    );

  const normalizedName =
    normalizeText(teamName);

  return (
    groups.find(group => {

      const id =
        group?.team?.id ||
        null;

      const name =
        normalizeText(
          group?.team?.name ||
          ""
        );

      if (
        teamId &&
        id &&
        Number(teamId) === Number(id)
      ) {
        return true;
      }

      return (
        normalizedName &&
        name &&
        normalizedName === name
      );
    }) ||

    groups.find(group => {

      const name =
        normalizeText(
          group?.team?.name ||
          ""
        );

      return (
        normalizedName &&
        name &&
        (
          name.includes(normalizedName) ||
          normalizedName.includes(name)
        )
      );

    }) ||

    null
  );
}

/* =========================================================
   FORMATION FALLBACK
========================================================= */

function getPositionRow(position) {

  const pos =
    normalizeText(position);

  if (
    pos === "g" ||
    pos.includes("goalkeeper") ||
    pos.includes("gardien")
  ) {
    return 1;
  }

  if (
    pos === "d" ||
    pos.includes("defender") ||
    pos.includes("defense") ||
    pos.includes("back")
  ) {
    return 2;
  }

  if (
    pos === "m" ||
    pos.includes("midfielder") ||
    pos.includes("milieu")
  ) {
    return 3;
  }

  if (
    pos === "f" ||
    pos.includes("forward") ||
    pos.includes("attacker") ||
    pos.includes("striker") ||
    pos.includes("attaque")
  ) {
    return 4;
  }

  return 3;
}

function getPitchPlayers(
  lineup
) {

  if (!lineup) {
    return [];
  }

  const starters =
    Array.isArray(
      lineup?.startXI
    )
      ? lineup.startXI
      : [];

  return starters.map(
    (entry, index) => {

      const player =
        entry?.player ||
        entry ||
        {};

      let grid =
        getPlayerGrid(entry);

      if (!grid) {

        const row =
          getPositionRow(
            getPlayerPosition(entry)
          );

        grid =
          `${row}:${index + 1}`;
      }

      return {
        ...entry,
        player,
        _grid: grid
      };

    }
  );
}

function makePitchCoordinates(
  pitchPlayers,
  side
) {

  const rows = {};

  pitchPlayers.forEach(item => {

    const match =
      String(
        item?._grid || ""
      ).match(
        /(\d+)\s*:\s*(\d+)/
      );

    let row = 0;
    let col = 0;

    if (match) {
      row = Number(match[1]);
      col = Number(match[2]);
    }

    if (!row) {
      row =
        getPositionRow(
          getPlayerPosition(item)
        );
    }

    if (!col) {
      col = 1;
    }

    if (!rows[row]) {
      rows[row] = [];
    }

    rows[row].push({
      item,
      row,
      col
    });

  });

  const maxRow =
    Math.max(
      ...Object.keys(rows)
        .map(Number),
      4
    );

  const coordinates = [];

  Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(row => {

      const list =
        rows[row]
          .sort(
            (a, b) =>
              a.col - b.col
          );

      const count =
        list.length;

      list.forEach(
        (entry, positionIndex) => {

          let x;

          if (count === 1) {
            x = 50;
          } else {
            x =
              18 +
              (
                64 *
                (
                  positionIndex /
                  (count - 1)
                )
              );
          }

          let y =
            9 +
            (
              78 *
              (
                (row - 1) /
                Math.max(
                  1,
                  maxRow - 1
                )
              )
            );

          if (side === "away") {
            y = 100 - y;
          }

          coordinates.push({
            ...entry.item,
            _x: Math.max(
              7,
              Math.min(93, x)
            ),
            _y: Math.max(
              7,
              Math.min(93, y)
            )
          });

        }
      );

    });

  return coordinates;
}

/* =========================================================
   PLAYER SHORT NAME
========================================================= */

function shortPlayerName(name) {

  const value =
    String(name || "");

  if (value.length <= 14) {
    return value;
  }

  const parts =
    value.split(" ");

  if (parts.length >= 2) {
    return (
      parts[0] +
      " " +
      parts[parts.length - 1]
    );
  }

  return value.slice(
    0,
    13
  ) + "…";
}

/* =========================================================
   PLAYER ACTION BADGES
========================================================= */

function renderPlayerActions(playerData) {

  let html = "";

  const rating =
    playerData?.rating;

  if (
    rating !== null &&
    rating !== undefined &&
    rating !== ""
  ) {
    html += `
      <span class="bf-player-action bf-rating">
        ⭐ ${escapeHTML(
          Number(rating).toFixed(1)
        )}
      </span>
    `;
  }

  if (
    numberOrZero(
      playerData?.goals
    ) > 0
  ) {
    html += `
      <span class="bf-player-action bf-goal">
        ⚽ ${playerData.goals}
      </span>
    `;
  }

  if (
    numberOrZero(
      playerData?.assists
    ) > 0
  ) {
    html += `
      <span class="bf-player-action bf-assist">
        🅰️ ${playerData.assists}
      </span>
    `;
  }

  if (
    numberOrZero(
      playerData?.yellow
    ) > 0
  ) {
    html += `
      <span class="bf-player-action bf-yellow">
        🟨
      </span>
    `;
  }

  if (
    numberOrZero(
      playerData?.red
    ) > 0
  ) {
    html += `
      <span class="bf-player-action bf-red">
        🟥
      </span>
    `;
  }

  if (
    numberOrZero(
      playerData?.keyPasses
    ) > 0
  ) {
    html += `
      <span class="bf-player-action bf-keypass">
        🎯 ${playerData.keyPasses}
      </span>
    `;
  }

  if (
    playerData?.captain
  ) {
    html += `
      <span class="bf-player-action">
        ©
      </span>
    `;
  }

  return html;
}

/* =========================================================
   PLAYER ROW
========================================================= */

function renderPlayerRow(
  playerData
) {

  const number =
    playerData?.number ??
    "-";

  const position =
    playerData?.position ||
    "";

  const minutes =
    playerData?.minutes;

  return `
    <div class="bf-player-row">

      <div class="bf-player-number">
        ${escapeHTML(number)}
      </div>

      <div class="bf-player-main">

        <div class="bf-player-name">
          ${escapeHTML(
            playerData?.name ||
            "Joueur"
          )}
        </div>

        <div class="bf-player-position">

          ${escapeHTML(position)}

          ${
            minutes !== null &&
            minutes !== undefined
              ? ` · ${escapeHTML(
                  minutes
                )} min`
              : ""
          }

          ${
            playerData?.substitute
              ? " · Remplaçant"
              : ""
          }

        </div>

      </div>

      <div class="bf-player-actions">
        ${renderPlayerActions(
          playerData
        )}
      </div>

    </div>
  `;
}

/* =========================================================
   PITCH PLAYER
========================================================= */

function renderPitchPlayer(
  playerData,
  x,
  y
) {

  const number =
    playerData?.number ??
    "?";

  const rating =
    playerData?.rating;

  const ratingHTML =
    rating !== null &&
    rating !== undefined &&
    rating !== ""
      ? `
        <span class="bf-pitch-rating">
          ⭐ ${escapeHTML(
            Number(rating).toFixed(1)
          )}
        </span>
      `
      : "";

  return `
    <div
      class="bf-pitch-player"
      style="
        left:${x}%;
        top:${y}%;
      "
      title="${escapeHTML(
        playerData?.name || ""
      )}"
    >

      <span class="bf-shirt">
        ${escapeHTML(number)}
      </span>

      <span class="bf-pitch-name">
        ${escapeHTML(
          shortPlayerName(
            playerData?.name
          )
        )}
      </span>

      ${ratingHTML}

    </div>
  `;
}

/* =========================================================
   PITCH
========================================================= */

function renderPitch(
  lineup,
  teamName,
  side,
  teamId,
  performanceMap,
  eventMap
) {

  const formation =
    lineup?.formation ||
    "Formation";

  const rawPlayers =
    getPitchPlayers(
      lineup
    );

  const positioned =
    makePitchCoordinates(
      rawPlayers,
      side
    );

  const pitchPlayers =
    positioned.map(item => {

      const data =
        getPlayerData(
          item,
          teamId,
          performanceMap,
          eventMap
        );

      return {
        data,
        x: item._x,
        y: item._y
      };

    });

  const playersHTML =
    pitchPlayers
      .map(item =>
        renderPitchPlayer(
          item.data,
          item.x,
          item.y
        )
      )
      .join("");

  const coach =
    lineup?.coach?.name ||
    "";

  return `
    <div class="bf-pitch-box">

      <div class="bf-pitch-title">

        <span>
          ${escapeHTML(teamName)}
        </span>

        <span class="bf-pitch-formation">
          ${escapeHTML(formation)}
        </span>

      </div>

      <div class="bf-pitch">

        <div class="bf-pitch-line-half"></div>
        <div class="bf-pitch-center-circle"></div>
        <div class="bf-pitch-center-dot"></div>

        <div class="bf-pitch-box-area top"></div>
        <div class="bf-pitch-box-area bottom"></div>

        <div class="bf-pitch-goal-area top"></div>
        <div class="bf-pitch-goal-area bottom"></div>

        ${playersHTML}

      </div>

      ${
        coach
          ? `
            <div class="bf-coach">
              👔 ${escapeHTML(coach)}
            </div>
          `
          : ""
      }

    </div>
  `;
}

/* =========================================================
   BENCH
========================================================= */

function renderBench(
  lineup,
  teamId,
  performanceMap,
  eventMap
) {

  const substitutes =
    Array.isArray(
      lineup?.substitutes
    )
      ? lineup.substitutes
      : [];

  if (!substitutes.length) {
    return `
      <div class="bf-bench">
        <div class="bf-detail-item">
          Aucun remplaçant disponible.
        </div>
      </div>
    `;
  }

  return `
    <div class="bf-bench">

      ${substitutes
        .map(item => {

          const data =
            getPlayerData(
              item,
              teamId,
              performanceMap,
              eventMap
            );

          return `
            <div class="bf-bench-player">

              <span class="bf-bench-number">
                ${escapeHTML(
                  data.number
                )}
              </span>

              <span class="bf-bench-name">
                ${escapeHTML(
                  data.name
                )}
              </span>

              <span class="bf-bench-rating">

                ${
                  data.rating !== null &&
                  data.rating !== undefined
                    ? `⭐ ${escapeHTML(
                        Number(
                          data.rating
                        ).toFixed(1)
                      )}`
                    : ""
                }

              </span>

            </div>
          `;

        })
        .join("")}

    </div>
  `;
}

/* =========================================================
   FORMATION SECTION
========================================================= */

function renderFormations(
  homeLineup,
  awayLineup,
  homeName,
  awayName,
  homeId,
  awayId,
  performanceMap,
  eventMap
) {

  const homeFormation =
    homeLineup?.formation ||
    "—";

  const awayFormation =
    awayLineup?.formation ||
    "—";

  return `

    <div class="bf-detail-section">

      <h3>
        🧩 Formations & Compositions
      </h3>

      <div class="bf-formation-summary">

        <div class="bf-formation-team">
          ${escapeHTML(homeName)}
          <small>
            ${escapeHTML(homeFormation)}
          </small>
        </div>

        <div class="bf-formation-vs">
          VS
        </div>

        <div class="bf-formation-team">
          ${escapeHTML(awayName)}
          <small>
            ${escapeHTML(awayFormation)}
          </small>
        </div>

      </div>

      <div class="bf-pitches">

        ${
          homeLineup
            ? renderPitch(
                homeLineup,
                homeName,
                "home",
                homeId,
                performanceMap,
                eventMap
              )
            : `
              <div class="bf-pitch-box">
                <div class="bf-pitch-title">
                  ${escapeHTML(homeName)}
                  <span class="bf-pitch-formation">
                    —
                  </span>
                </div>

                <div class="bf-detail-item">
                  Formation indisponible.
                </div>
              </div>
            `
        }

        ${
          awayLineup
            ? renderPitch(
                awayLineup,
                awayName,
                "away",
                awayId,
                performanceMap,
                eventMap
              )
            : `
              <div class="bf-pitch-box">
                <div class="bf-pitch-title">
                  ${escapeHTML(awayName)}
                  <span class="bf-pitch-formation">
                    —
                  </span>
                </div>

                <div class="bf-detail-item">
                  Formation indisponible.
                </div>
              </div>
            `
        }

      </div>

    </div>
  `;
}

/* =========================================================
   PLAYERS SECTION
========================================================= */

function renderPlayersSection(
  homeLineup,
  awayLineup,
  homeName,
  awayName,
  homeId,
  awayId,
  performanceMap,
  eventMap
) {

  const homePlayers =
    Array.isArray(
      homeLineup?.startXI
    )
      ? homeLineup.startXI
      : [];

  const awayPlayers =
    Array.isArray(
      awayLineup?.startXI
    )
      ? awayLineup.startXI
      : [];

  const homeHTML =
    homePlayers
      .map(player => {

        const data =
          getPlayerData(
            player,
            homeId,
            performanceMap,
            eventMap
          );

        return renderPlayerRow(
          data
        );

      })
      .join("");

  const awayHTML =
    awayPlayers
      .map(player => {

        const data =
          getPlayerData(
            player,
            awayId,
            performanceMap,
            eventMap
          );

        return renderPlayerRow(
          data
        );

      })
      .join("");

  return `

    <div class="bf-detail-section">

      <h3>
        ⭐ أداء اللاعبين
      </h3>

      <div class="bf-player-columns">

        <div>

          <div class="bf-player-team-title">
            <span>
              ${escapeHTML(homeName)}
            </span>

            <span>
              ${homePlayers.length}
            </span>
          </div>

          <div class="bf-player-list">

            ${
              homeHTML ||
              `
                <div class="bf-detail-item">
                  Pas de composition disponible.
                </div>
              `
            }

          </div>

        </div>

        <div>

          <div class="bf-player-team-title">
            <span>
              ${escapeHTML(awayName)}
            </span>

            <span>
              ${awayPlayers.length}
            </span>
          </div>

          <div class="bf-player-list">

            ${
              awayHTML ||
              `
                <div class="bf-detail-item">
                  Pas de composition disponible.
                </div>
              `
            }

          </div>

        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   BENCH SECTION
========================================================= */

function renderBenchSection(
  homeLineup,
  awayLineup,
  homeName,
  awayName,
  homeId,
  awayId,
  performanceMap,
  eventMap
) {

  return `

    <div class="bf-detail-section">

      <h3>
        🔄 Bancs
      </h3>

      <div class="bf-bench-grid">

        <div>

          <div class="bf-player-team-title">
            ${escapeHTML(homeName)}
          </div>

          ${renderBench(
            homeLineup,
            homeId,
            performanceMap,
            eventMap
          )}

        </div>

        <div>

          <div class="bf-player-team-title">
            ${escapeHTML(awayName)}
          </div>

          ${renderBench(
            awayLineup,
            awayId,
            performanceMap,
            eventMap
          )}

        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   EVENT ICON
========================================================= */

function getEventIcon(event) {

  const type =
    normalizeText(
      event?.type
    );

  const detail =
    normalizeText(
      event?.detail
    );

  if (
    type.includes("goal")
  ) {

    if (
      detail.includes("own")
    ) {
      return "🥅";
    }

    if (
      detail.includes("penalty")
    ) {
      return "⚽";
    }

    return "⚽";
  }

  if (
    type.includes("card")
  ) {

    if (
      detail.includes("red") ||
      detail.includes("yellow-red") ||
      detail.includes("second yellow")
    ) {
      return "🟥";
    }

    return "🟨";
  }

  if (
    type.includes("subst")
  ) {
    return "🔄";
  }

  if (
    type.includes("var")
  ) {
    return "🎥";
  }

  return "📌";
}

/* =========================================================
   EVENT MINUTE
========================================================= */

function getEventMinute(event) {

  const elapsed =
    event?.time?.elapsed ??
    event?.elapsed ??
    event?.minute ??
    null;

  const extra =
    event?.time?.extra ??
    event?.extra ??
    null;

  if (
    elapsed === null ||
    elapsed === undefined
  ) {
    return "";
  }

  if (
    extra !== null &&
    extra !== undefined &&
    Number(extra) > 0
  ) {
    return `${elapsed}+${extra}'`;
  }

  return `${elapsed}'`;
}

/* =========================================================
   EVENTS RENDER
========================================================= */

function renderEvents(
  events,
  homeId,
  awayId,
  homeName,
  awayName
) {

  if (
    !Array.isArray(events) ||
    !events.length
  ) {
    return `
      <div class="bf-detail-section">

        <h3>
          ⚡ Événements
        </h3>

        <div class="bf-detail-item">
          Aucun événement disponible.
        </div>

      </div>
    `;
  }

  const sorted =
    [...events].sort(
      (a, b) => {

        const ma =
          Number(
            a?.time?.elapsed ??
            a?.minute ??
            999
          );

        const mb =
          Number(
            b?.time?.elapsed ??
            b?.minute ??
            999
          );

        return ma - mb;
      }
    );

  const html =
    sorted
      .map(event => {

        const minute =
          getEventMinute(event);

        const player =
          event?.player?.name ||
          "";

        const assist =
          event?.assist?.name ||
          "";

        const teamId =
          event?.team?.id ||
          null;

        let teamName =
          event?.team?.name ||
          "";

        if (!teamName) {

          if (
            homeId &&
            teamId &&
            Number(teamId) === Number(homeId)
          ) {
            teamName = homeName;
          }

          if (
            awayId &&
            teamId &&
            Number(teamId) === Number(awayId)
          ) {
            teamName = awayName;
          }

        }

        const icon =
          getEventIcon(event);

        const detail =
          event?.detail ||
          event?.comments ||
          event?.type ||
          "";

        const sideClass =
          homeId &&
          teamId &&
          Number(teamId) === Number(homeId)
            ? "home"
            : "away";

        let assistHTML = "";

        if (assist) {
          assistHTML = `
            <div class="bf-event-assist">
              🅰️ Passe décisive :
              ${escapeHTML(assist)}
            </div>
          `;
        }

        return `
          <div class="bf-event ${sideClass}">

            <div class="bf-event-minute">
              ${escapeHTML(minute)}
            </div>

            <div class="bf-event-icon">
              ${icon}
            </div>

            <div class="bf-event-main">

              <div class="bf-event-player">
                ${
                  player
                    ? escapeHTML(player)
                    : escapeHTML(detail)
                }
              </div>

              ${
                player
                  ? `
                    <div class="bf-event-team">
                      ${escapeHTML(detail)}
                    </div>
                  `
                  : ""
              }

              ${assistHTML}

              ${
                teamName
                  ? `
                    <div class="bf-event-team">
                      ${escapeHTML(teamName)}
                    </div>
                  `
                  : ""
              }

            </div>

          </div>
        `;

      })
      .join("");

  return `
    <div class="bf-detail-section">

      <h3>
        ⚡ Événements
      </h3>

      <div class="bf-events">
        ${html}
      </div>

    </div>
  `;
}

/* =========================================================
   STATISTICS NORMALIZATION
========================================================= */

function normalizeStatistics(statistics) {

  if (Array.isArray(statistics)) {
    return statistics;
  }

  if (
    Array.isArray(
      statistics?.response
    )
  ) {
    return statistics.response;
  }

  if (
    Array.isArray(
      statistics?.data
    )
  ) {
    return statistics.data;
  }

  return [];
}

function flattenStatsForTeam(
  teamBlock
) {

  const stats =
    Array.isArray(
      teamBlock?.statistics
    )
      ? teamBlock.statistics
      : [];

  const map = {};

  stats.forEach(item => {

    const name =
      normalizeText(
        item?.type ||
        item?.name ||
        ""
      );

    if (!name) return;

    map[name] =
      item?.value ?? "-";

  });

  return map;
}

function parsePercentage(value) {

  if (
    typeof value === "string" &&
    value.includes("%")
  ) {
    return (
      Number(
        value.replace("%", "")
      ) || 0
    );
  }

  return Number(value) || 0;
}

function formatStatValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  return String(value);
}

function renderStatistics(statistics) {

  const groups =
    normalizeStatistics(
      statistics
    );

  if (!groups.length) {
    return `
      <div class="bf-detail-item">
        Aucune statistique disponible.
      </div>
    `;
  }

  const homeBlock =
    groups[0] ||
    {};

  const awayBlock =
    groups[1] ||
    {};

  const homeName =
    homeBlock?.team?.name ||
    "Domicile";

  const awayName =
    awayBlock?.team?.name ||
    "Extérieur";

  const homeStats =
    flattenStatsForTeam(
      homeBlock
    );

  const awayStats =
    flattenStatsForTeam(
      awayBlock
    );

  const preferredStats = [
    {
      key: "ball possession",
      label: "Possession"
    },
    {
      key: "total shots",
      label: "Tirs"
    },
    {
      key: "shots on goal",
      label: "Tirs cadrés"
    },
    {
      key: "corner kicks",
      label: "Corners"
    },
    {
      key: "offsides",
      label: "Hors-jeu"
    },
    {
      key: "fouls",
      label: "Fautes"
    },
    {
      key: "yellow cards",
      label: "Cartons jaunes"
    },
    {
      key: "red cards",
      label: "Cartons rouges"
    },
    {
      key: "goalkeeper saves",
      label: "Arrêts"
    }
  ];

  const availableKeys = new Set([
    ...Object.keys(homeStats),
    ...Object.keys(awayStats)
  ]);

  const used = [];

  preferredStats.forEach(stat => {

    if (
      availableKeys.has(
        stat.key
      )
    ) {
      used.push(stat);
    }

  });

  /*
     Si l'API utilise une autre nomenclature,
     on rajoute les stats restantes.
  */

  availableKeys.forEach(key => {

    if (
      used.some(
        item => item.key === key
      )
    ) {
      return;
    }

    used.push({
      key,
      label: key
    });

  });

  const rows =
    used
      .slice(0, 14)
      .map(stat => {

        const homeValue =
          homeStats[
            stat.key
          ] ?? "-";

        const awayValue =
          awayStats[
            stat.key
          ] ?? "-";

        return `
          <div class="bf-stat-row">

            <div class="bf-stat-value-home">
              ${escapeHTML(
                formatStatValue(
                  homeValue
                )
              )}
            </div>

            <div class="bf-stat-name">
              ${escapeHTML(
                stat.label
              )}
            </div>

            <div class="bf-stat-value-away">
              ${escapeHTML(
                formatStatValue(
                  awayValue
                )
              )}
            </div>

          </div>
        `;

      })
      .join("");

  return `

    <div
      style="
        display:grid;
        grid-template-columns:1fr 40px 1fr;
        gap:10px;
        margin-bottom:14px;
        font-weight:800;
        font-size:12px;
      "
    >

      <div style="text-align:right">
        ${escapeHTML(homeName)}
      </div>

      <div style="text-align:center;opacity:.5">
        VS
      </div>

      <div>
        ${escapeHTML(awayName)}
      </div>

    </div>

    <div class="bf-stat-table">
      ${rows}
    </div>

  `;
}

/* =========================================================
   MATCH INFORMATION
========================================================= */

function renderMatchInformation(
  details
) {

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

  const timezone =
    details?.fixture?.timezone ||
    null;

  if (
    !venue &&
    !city &&
    !referee &&
    !round &&
    !season &&
    !timezone
  ) {
    return "";
  }

  return `

    <div class="bf-detail-section">

      <h3>
        📋 Informations
      </h3>

      <div class="bf-detail-grid">

        ${
          venue
            ? `
              <div class="bf-detail-item">

                <strong>
                  🏟️ Stade
                </strong>

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

                <strong>
                  👨‍⚖️ Arbitre
                </strong>

                ${escapeHTML(referee)}

              </div>
            `
            : ""
        }

        ${
          round
            ? `
              <div class="bf-detail-item">

                <strong>
                  🔢 Journée
                </strong>

                ${escapeHTML(round)}

              </div>
            `
            : ""
        }

        ${
          season
            ? `
              <div class="bf-detail-item">

                <strong>
                  📅 Saison
                </strong>

                ${escapeHTML(season)}

              </div>
            `
            : ""
        }

        ${
          timezone
            ? `
              <div class="bf-detail-item">

                <strong>
                  🌍 Fuseau
                </strong>

                ${escapeHTML(timezone)}

              </div>
            `
            : ""
        }

      </div>

    </div>

  `;
}

/* =========================================================
   OPEN MATCH DETAILS
========================================================= */

async function openMatchDetails(index) {

  const match =
    currentMatches[index];

  if (!match) {
    toast(
      "تفاصيل الماتش غير متوفرة"
    );
    return;
  }

  const fixtureId =
    getFixtureId(match);

  currentOpenedFixture =
    fixtureId;

  createMatchModal();

  const content =
    $("matchDetailsContent");

  if (!content) return;

  const home =
    getHome(match);

  const away =
    getAway(match);

  const homeLogo =
    getHomeLogo(match);

  const awayLogo =
    getAwayLogo(match);

  const homeScore =
    getHomeScore(match);

  const awayScore =
    getAwayScore(match);

  const league =
    getLeague(match);

  const status =
    statusLabel(match);

  const date =
    match?.fixture?.date ||
    match?.date ||
    null;

  content.innerHTML = `

    <div class="bf-details-league">
      🏆 ${escapeHTML(league)}
    </div>

    <div class="bf-details-round">
      ${fixtureId
        ? `ID Match: ${escapeHTML(fixtureId)}`
        : ""
      }
    </div>

    <div class="bf-details-status-wrap">

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

        <span class="bf-details-team-name">
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

        <span class="bf-details-team-name">
          ${escapeHTML(away)}
        </span>

      </div>

    </div>

    <div class="bf-detail-section">

      <h3>
        ⏳ تفاصيل المباراة
      </h3>

      <div class="bf-detail-item">
        جاري تحميل التشكيلة والإحصائيات والأحداث...
      </div>

    </div>
  `;

  const modal =
    $("matchModal");

  if (modal) {
    modal.style.display =
      "block";

    document.body.style.overflow =
      "hidden";
  }

  if (!fixtureId) {

    content.innerHTML += `

      <div class="bf-detail-section">

        <div class="bf-detail-item">
          ⚠️ معرف المباراة غير متوفر.
        </div>

      </div>

    `;

    return;
  }

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

    const details =
      extractMatchDetails(
        data
      );

    if (!details) {
      throw new Error(
        "Aucune donnée détaillée"
      );
    }

    /*
       إذا المستخدم سد الـmodal أو فتح ماتش آخر
       منخليش response القديم يكتب فوق الجديد.
    */
    if (
      currentOpenedFixture !==
      fixtureId
    ) {
      return;
    }

    const realHome =
      getHome(details) ||
      home;

    const realAway =
      getAway(details) ||
      away;

    const realHomeId =
      getHomeId(details) ||
      getHomeId(match);

    const realAwayId =
      getAwayId(details) ||
      getAwayId(match);

    const realHomeLogo =
      getHomeLogo(details) ||
      homeLogo;

    const realAwayLogo =
      getAwayLogo(details) ||
      awayLogo;

    const realHomeScore =
      getHomeScore(details);

    const realAwayScore =
      getAwayScore(details);

    const realLeague =
      details?.league?.name ||
      league;

    const realStatus =
      statusLabel(details);

    const realDate =
      details?.fixture?.date ||
      date;

    const events =
      details?.events ||
      details?.fixture?.events ||
      [];

    const statistics =
      details?.statistics ||
      [];

    const lineups =
      normalizeLineups(
        details?.lineups ||
        []
      );

    const players =
      details?.players ||
      [];

    const performanceMap =
      buildPlayerPerformanceMap(
        players
      );

    const eventMap =
      buildEventContributions(
        events
      );

    const homeLineup =
      getLineupForTeam(
        lineups,
        realHomeId,
        realHome
      ) ||
      lineups[0] ||
      null;

    const awayLineup =
      getLineupForTeam(
        lineups,
        realAwayId,
        realAway
      ) ||
      lineups[1] ||
      null;

    const venue =
      details?.fixture?.venue?.name ||
      details?.venue?.name ||
      details?.venue ||
      null;

    const city =
      details?.fixture?.venue?.city ||
      details?.venue?.city ||
      null;

    content.innerHTML = `

      <div class="bf-details-league">
        🏆 ${escapeHTML(realLeague)}
      </div>

      ${
        details?.league?.round
          ? `
            <div class="bf-details-round">
              ${escapeHTML(
                details.league.round
              )}
            </div>
          `
          : ""
      }

      <div class="bf-details-status-wrap">
        <div class="bf-details-status">
          ${escapeHTML(realStatus)}
        </div>
      </div>

      <div class="bf-details-teams">

        <div class="bf-details-team">

          ${
            realHomeLogo
              ? `
                <img
                  class="bf-details-logo"
                  src="${escapeHTML(
                    realHomeLogo
                  )}"
                  alt="${escapeHTML(
                    realHome
                  )}"
                >
              `
              : `
                <div class="bf-details-fallback-logo">
                  ⚽
                </div>
              `
          }

          <span class="bf-details-team-name">
            ${escapeHTML(realHome)}
          </span>

        </div>

        <div>

          <div class="bf-details-score">
            ${escapeHTML(realHomeScore)}
            -
            ${escapeHTML(realAwayScore)}
          </div>

          ${
            realDate
              ? `
                <div class="bf-details-time">
                  ${escapeHTML(
                    formatDate(realDate)
                  )}
                </div>
              `
              : ""
          }

          ${
            venue
              ? `
                <div class="bf-details-venue">
                  🏟️ ${escapeHTML(venue)}
                  ${
                    city
                      ? ` · ${escapeHTML(city)}`
                      : ""
                  }
                </div>
              `
              : ""
          }

        </div>

        <div class="bf-details-team">

          ${
            realAwayLogo
              ? `
                <img
                  class="bf-details-logo"
                  src="${escapeHTML(
                    realAwayLogo
                  )}"
                  alt="${escapeHTML(
                    realAway
                  )}"
                >
              `
              : `
                <div class="bf-details-fallback-logo">
                  ⚽
                </div>
              `
          }

          <span class="bf-details-team-name">
            ${escapeHTML(realAway)}
          </span>

        </div>

      </div>

      ${renderMatchInformation(details)}

      ${
        homeLineup ||
        awayLineup
          ? renderFormations(
              homeLineup,
              awayLineup,
              realHome,
              realAway,
              realHomeId,
              realAwayId,
              performanceMap,
              eventMap
            )
          : `
            <div class="bf-detail-section">

              <h3>
                🧩 Formations & Compositions
              </h3>

              <div class="bf-detail-item">
                التشكيلة مازال ما متوفراش لهاد الماتش.
              </div>

            </div>
          `
      }

      ${
        homeLineup ||
        awayLineup
          ? renderPlayersSection(
              homeLineup,
              awayLineup,
              realHome,
              realAway,
              realHomeId,
              realAwayId,
              performanceMap,
              eventMap
            )
          : ""
      }

      ${
        homeLineup ||
        awayLineup
          ? renderBenchSection(
              homeLineup,
              awayLineup,
              realHome,
              realAway,
              realHomeId,
              realAwayId,
              performanceMap,
              eventMap
            )
          : ""
      }

      ${renderEvents(
        events,
        realHomeId,
        realAwayId,
        realHome,
        realAway
      )}

      ${
        Array.isArray(statistics) &&
        statistics.length
          ? `
            <div class="bf-detail-section">

              <h3>
                📊 Statistiques du match
              </h3>

              ${renderStatistics(
                statistics
              )}

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

    /*
       منبدلوش header ديال الماتش،
       غير كنزيدو رسالة الخطأ.
    */

    content.innerHTML += `

      <div class="bf-detail-section">

        <h3>
          ⚠️ Détails supplémentaires
        </h3>

        <div class="bf-detail-item">
          تعذر تحميل التشكيلة والإحصائيات ديال هاد الماتش.
        </div>

      </div>

    `;
  }
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
    modal.style.display =
      "none";
  }

  currentOpenedFixture =
    null;

  document.body.style.overflow =
    "";
}

/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {
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
      document.createElement(
        "button"
      );

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

        currentDate =
          iso;

        loadMatches(
          iso
        );
      }
    );

    bar.appendChild(
      button
    );
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
          data-league="${escapeHTML(
            league.key
          )}"
          onclick="filterLeague('${escapeHTML(
            league.key
          )}')"
          style="cursor:pointer"
        >

          ${escapeHTML(
            league.name
          )}

          <small>
            ${escapeHTML(
              league.country
            )}
          </small>

        </div>

      `)
      .join("");
}

function filterLeague(
  league
) {

  currentFilter =
    league;

  go("scores");

  toast(
    `🏆 ${league}`
  );
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
          onclick="showTeam('${escapeHTML(
            team.name
          )}')"
          style="cursor:pointer"
        >

          <div
            class="teamLogo"
            style="font-size:45px"
          >
            ${team.logo}
          </div>

          <h3>
            ${escapeHTML(
              team.name
            )}
          </h3>

          <p>
            ${escapeHTML(
              team.country
            )}
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
        ${escapeHTML(
          team.name
        )}
      </h2>

      <p>
        ${escapeHTML(
          team.country
        )}
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
            ${escapeHTML(
              item.title
            )}
          </h3>

          <p>
            ${escapeHTML(
              item.text
            )}
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
            ${escapeHTML(
              item.title
            )}
          </h3>

          <p>
            ${escapeHTML(
              item.text
            )}
          </p>

        </div>

      `)
      .join("");
}

/* =========================================================
   HOME MATCHES
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
      sortMatchesByImportance(
        normalizeMatches(data)
      );

    if (!matches.length) {

      container.innerHTML =
        emptyCard(
          "Aucun match aujourd'hui."
        );

      return;
    }

    /*
       نخلي currentMatches متوافق
       مع cards اللي باينين فالـHome.
    */
    currentMatches =
      matches.slice(0, 6);

    container.innerHTML =
      currentMatches
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

/* =========================================================
   TABLES
========================================================= */

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

/* =========================================================
   HOME
========================================================= */

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
          loadMatches(
            currentDate
          );
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

      if (!value) {
        renderTeams();
        return;
      }

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
        dark
          ? "☀"
          : "☾";

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
      "⚽ BakhiraFoot Pro chargé"
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
/* =========================================================
   START APP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "⚽ BakhiraFoot Pro chargé"
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
