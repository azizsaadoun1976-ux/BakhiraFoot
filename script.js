```javascript
/* =========================================================
   BAKHIRAFOOT PRO
   Main JavaScript
   Compatible with Vercel + /api
========================================================= */

const API_BASE = "";

/* =========================================================
   DATA DEMO
========================================================= */

const demoMatches = [
  {
    league: "Champions League",
    home: "Barcelona",
    away: "Arsenal",
    homeScore: 2,
    awayScore: 1,
    minute: 67,
    status: "LIVE"
  },
  {
    league: "Premier League",
    home: "Liverpool",
    away: "Chelsea",
    homeScore: 0,
    awayScore: 0,
    minute: 32,
    status: "LIVE"
  },
  {
    league: "La Liga",
    home: "Real Madrid",
    away: "Villarreal",
    homeScore: 3,
    awayScore: 2,
    minute: 78,
    status: "LIVE"
  },
  {
    league: "Botola",
    home: "Raja CA",
    away: "Wydad",
    homeScore: 1,
    awayScore: 0,
    minute: 54,
    status: "LIVE"
  }
];


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function getElement(id) {

  return document.getElementById(id);

}


/* =========================================================
   NAVIGATION
========================================================= */

function go(page) {

  const pages =
    document.querySelectorAll(".page");

  const buttons =
    document.querySelectorAll("nav button");

  pages.forEach(section => {

    section.classList.remove("active");

  });


  const target =
    getElement(page);

  if (target) {

    target.classList.add("active");

  }


  buttons.forEach(button => {

    button.classList.remove("active");

    if (
      button.dataset.page === page
    ) {

      button.classList.add("active");

    }

  });


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  if (page === "scores") {

    loadMatches();

  }


  if (page === "news") {

    renderNews();

  }


  if (page === "leagues") {

    renderLeagues();

  }


  if (page === "teams") {

    renderTeams();

  }

}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

  const element =
    getElement("toast");

  if (!element) return;

  element.textContent = message;

  element.style.display = "block";

  setTimeout(() => {

    element.style.display = "none";

  }, 2500);

}


/* =========================================================
   LIVE API
========================================================= */

async function loadLive() {

  const liveElement =
    getElement("live");

  const scoreList =
    getElement("scoreList");


  if (liveElement) {

    liveElement.innerHTML =
      "🟡 Chargement du LIVE...";

  }


  try {

    const response =
      await fetch("/api?live=all", {
        cache: "no-store"
      });


    if (!response.ok) {

      throw new Error(
        "API HTTP " + response.status
      );

    }


    const result =
      await response.json();


    const matches =
      Array.isArray(result.data)
        ? result.data
        : [];


    console.log(
      "BakhiraFoot LIVE:",
      matches
    );


    if (liveElement) {

      liveElement.innerHTML =
        matches.length
          ? `🔴 ${matches.length} MATCH(S) LIVE`
          : "⚪ Aucun match live";

    }


    if (scoreList) {

      if (matches.length) {

        scoreList.innerHTML =
          matches
            .map(createMatchHTML)
            .join("");

      } else {

        scoreList.innerHTML =
          createEmptyState(
            "Aucun match en direct actuellement."
          );

      }

    }


    return matches;

  } catch (error) {

    console.error(
      "Erreur LIVE:",
      error
    );


    if (liveElement) {

      liveElement.innerHTML =
        "🟠 Live indisponible";

    }


    if (scoreList) {

      scoreList.innerHTML =
        createEmptyState(
          "Les données LIVE sont momentanément indisponibles."
        );

    }


    return [];

  }

}


/* =========================================================
   MATCH HTML
========================================================= */

function createMatchHTML(match) {

  const home =
    match.home?.name ||
    match.teams?.home?.name ||
    "Équipe domicile";


  const away =
    match.away?.name ||
    match.teams?.away?.name ||
    "Équipe extérieure";


  const homeLogo =
    match.home?.logo ||
    match.teams?.home?.logo ||
    "";


  const awayLogo =
    match.away?.logo ||
    match.teams?.away?.logo ||
    "";


  const homeScore =
    match.score?.home ??
    match.goals?.home ??
    0;


  const awayScore =
    match.score?.away ??
    match.goals?.away ??
    0;


  const league =
    match.league?.name ||
    match.competition?.name ||
    "Football";


  const elapsed =
    match.status?.elapsed ??
    match.fixture?.status?.elapsed;


  const status =
    match.status?.short ||
    match.fixture?.status?.short ||
    "LIVE";


  const minute =
    elapsed
      ? `${elapsed}'`
      : "LIVE";


  return `

    <div class="card live-card">

      <div class="comp">
        🏆 ${escapeHTML(league)}
      </div>


      <div class="teams">

        <div class="team">

          ${
            homeLogo
              ? `
                <img
                  class="teamLogo"
                  src="${escapeHTML(homeLogo)}"
                  alt="${escapeHTML(home)}"
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
            ${escapeHTML(home)}
          </span>

        </div>


        <div class="score">

          <strong>
            ${escapeHTML(homeScore)}
            -
            ${escapeHTML(awayScore)}
          </strong>

          <small class="red">
            🔴 LIVE ${escapeHTML(minute)}
          </small>

        </div>


        <div class="team">

          ${
            awayLogo
              ? `
                <img
                  class="teamLogo"
                  src="${escapeHTML(awayLogo)}"
                  alt="${escapeHTML(away)}"
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
            ${escapeHTML(away)}
          </span>

        </div>

      </div>

    </div>

  `;

}


/* =========================================================
   EMPTY STATE
========================================================= */

function createEmptyState(message) {

  return `

    <div class="card">

      <div class="newsImg">
        ⚽
      </div>

      <h3>
        BakhiraFoot LIVE
      </h3>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>

  `;

}


/* =========================================================
   MATCHES BY DATE
========================================================= */

async function loadMatches(date) {

  const scoreList =
    getElement("scoreList");


  if (!scoreList) return;


  scoreList.innerHTML =
    createEmptyState(
      "Chargement des matchs..."
    );


  try {

    const selectedDate =
      date ||
      new Date()
        .toISOString()
        .split("T")[0];


    const response =
      await fetch(
        `/api?date=${encodeURIComponent(selectedDate)}`,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "HTTP " + response.status
      );

    }


    const result =
      await response.json();


    const matches =
      Array.isArray(result.data)
        ? result.data
        : [];


    if (!matches.length) {

      scoreList.innerHTML =
        createEmptyState(
          "Aucun match trouvé pour cette date."
        );

      return;

    }


    scoreList.innerHTML =
      matches
        .map(createMatchHTML)
        .join("");


  } catch (error) {

    console.error(
      "Erreur MATCHES:",
      error
    );


    scoreList.innerHTML =
      createEmptyState(
        "Impossible de charger les matchs."
      );

  }

}


/* =========================================================
   HOME MATCHES
========================================================= */

function renderHomeMatches(
  matches = demoMatches
) {

  const container =
    getElement("homeMatches");


  if (!container) return;


  container.innerHTML =
    matches
      .slice(0, 6)
      .map(createMatchHTML)
      .join("");

}


/* =========================================================
   NEWS
========================================================= */

const newsData = [

  {
    category: "FOOTBALL",
    title:
      "Toute l'actualité football du jour",
    text:
      "Retrouvez les dernières informations, résultats et nouvelles du football.",
    icon: "⚽"
  },

  {
    category: "EUROPE",
    title:
      "Les grandes compétitions européennes",
    text:
      "Suivez les matchs et les résultats des principales compétitions européennes.",
    icon: "🏆"
  },

  {
    category: "MAROC",
    title:
      "L'actualité du football marocain",
    text:
      "Botola, équipe nationale et joueurs marocains à l'étranger.",
    icon: "🇲🇦"
  },

  {
    category: "MERCATO",
    title:
      "Les dernières nouvelles du mercato",
    text:
      "Retrouvez les informations importantes du marché des transferts.",
    icon: "💰"
  },

  {
    category: "CHAMPIONS LEAGUE",
    title:
      "La soirée européenne à suivre",
    text:
      "Scores, résultats et informations des grands matchs européens.",
    icon: "⭐"
  },

  {
    category: "MONDE",
    title:
      "Le football international",
    text:
      "Les dernières nouvelles des équipes et compétitions internationales.",
    icon: "🌍"
  }

];


function renderNews() {

  const container =
    getElement("newsGrid");


  if (!container) return;


  container.innerHTML =
    newsData
      .map(news => `

        <div class="card">

          <div class="newsImg">
            ${news.icon}
          </div>

          <small>
            ${escapeHTML(news.category)}
          </small>

          <h3>
            ${escapeHTML(news.title)}
          </h3>

          <p>
            ${escapeHTML(news.text)}
          </p>

        </div>

      `)
      .join("");


  const homeNews =
    getElement("homeNews");


  if (homeNews) {

    homeNews.innerHTML =
      newsData
        .slice(0, 3)
        .map(news => `

          <div class="card">

            <div class="newsImg">
              ${news.icon}
            </div>

            <small>
              ${escapeHTML(news.category)}
            </small>

            <h3>
              ${escapeHTML(news.title)}
            </h3>

            <p>
              ${escapeHTML(news.text)}
            </p>

          </div>

        `)
        .join("");

  }

}


/* =========================================================
   LEAGUES
========================================================= */

const leagues = [

  ["🏆", "Champions League"],
  ["🏴", "Premier League"],
  ["🇪🇸", "La Liga"],
  ["🇫🇷", "Ligue 1"],
  ["🇲🇦", "Botola Pro"],
  ["🇮🇹", "Serie A"]

];


function renderLeagues() {

  const container =
    getElement("leagueGrid");


  if (!container) return;


  container.innerHTML =
    leagues
      .map(league => `

        <div
          class="league"
          onclick="toast('${escapeHTML(league[1])}')"
        >

          ${league[0]}
          ${escapeHTML(league[1])}

          <small>
            Voir les matchs et classements
          </small>

        </div>

      `)
      .join("");

}


/* =========================================================
   TEAMS
========================================================= */

const teams = [

  ["🔵", "Barcelona"],
  ["⚪", "Real Madrid"],
  ["🔴", "Liverpool"],
  ["🔴", "Arsenal"],
  ["🔵", "Chelsea"],
  ["🟢", "Raja CA"],
  ["🔴", "Wydad"],
  ["🔵", "Manchester City"]

];


function renderTeams() {

  const container =
    getElement("teamGrid");


  if (!container) return;


  container.innerHTML =
    teams
      .map(team => `

        <div
          class="card team"
          onclick="showTeam('${escapeHTML(team[1])}', '${team[0]}')"
        >

          <div class="teamLogo">
            ${team[0]}
          </div>

          <h3>
            ${escapeHTML(team[1])}
          </h3>

          <p>
            Voir l'équipe
          </p>

        </div>

      `)
      .join("");

}


function showTeam(name, logo) {

  const detail =
    getElement("teamDetail");


  if (!detail) return;


  detail.innerHTML = `

    <div class="card detail">

      <div class="detailHead">

        <div class="big">
          ${logo}
        </div>

        <div>

          <h2>
            ${escapeHTML(name)}
          </h2>

          <p>
            Informations de l'équipe
          </p>

        </div>

      </div>

      <div class="statgrid">

        <div class="stat">
          Matchs
          <strong>—</strong>
        </div>

        <div class="stat">
          Victoires
          <strong>—</strong>
        </div>

        <div class="stat">
          Classement
          <strong>—</strong>
        </div>

      </div>

    </div>

  `;

}


/* =========================================================
   SEARCH
========================================================= */

function initSearch() {

  const search =
    getElement("search");


  if (!search) return;


  search.addEventListener(
    "input",
    function () {

      const query =
        this.value
          .trim()
          .toLowerCase();


      if (!query) return;


      const foundTeam =
        teams.find(team =>
          team[1]
            .toLowerCase()
            .includes(query)
        );


      if (foundTeam) {

        go("teams");

        setTimeout(() => {

          showTeam(
            foundTeam[1],
            foundTeam[0]
          );

        }, 100);

      }

    }
  );

}


/* =========================================================
   FILTERS
========================================================= */

function initFilters() {

  const filters =
    document.querySelectorAll(
      ".filter[data-filter]"
    );


  filters.forEach(filter => {

    filter.addEventListener(
      "click",
      async function () {

        filters.forEach(item => {

          item.classList.remove(
            "active"
          );

        });


        this.classList.add("active");


        const value =
          this.dataset.filter;


        if (value === "all") {

          renderHomeMatches();

          return;

        }


        const filtered =
          demoMatches.filter(match =>
            match.league
              .toLowerCase()
              .includes(
                value.toLowerCase()
              )
          );


        const homeMatches =
          getElement("homeMatches");


        if (homeMatches) {

          homeMatches.innerHTML =
            filtered.length
              ? filtered
                  .map(createMatchHTML)
                  .join("")
              : createEmptyState(
                  "Aucun match pour cette compétition."
                );

        }

      }
    );

  });

}


/* =========================================================
   DATE BAR
========================================================= */

function initDates() {

  const dateBar =
    getElement("dateBar");


  if (!dateBar) return;


  const dates = [];


  for (let i = -2; i <= 3; i++) {

    const date =
      new Date();


    date.setDate(
      date.getDate() + i
    );


    const iso =
      date.toISOString()
        .split("T")[0];


    const label =
      i === 0
        ? "Aujourd'hui"
        : date.toLocaleDateString(
            "fr-FR",
            {
              weekday: "short",
              day: "numeric",
              month: "short"
            }
          );


    dates.push({
      iso,
      label
    });

  }


  dateBar.innerHTML =
    dates
      .map((date, index) => `

        <button
          class="${index === 2 ? "selected" : ""}"
          data-date="${date.iso}"
        >
          ${escapeHTML(date.label)}
        </button>

      `)
      .join("");


  dateBar
    .querySelectorAll("button")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          dateBar
            .querySelectorAll("button")
            .forEach(btn =>
              btn.classList.remove(
                "selected"
              )
            );


          button.classList.add(
            "selected"
          );


          loadMatches(
            button.dataset.date
          );

        }
      );

    });

}


/* =========================================================
   DARK MODE
========================================================= */

function initTheme() {

  const button =
    getElement("theme");


  if (!button) return;


  const saved =
    localStorage.getItem(
      "bakhirafoot-theme"
    );


  if (saved === "dark") {

    document.body.classList.add(
      "dark"
    );

    button.textContent = "☀";

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


      localStorage.setItem(
        "bakhirafoot-theme",
        dark ? "dark" : "light"
      );


      button.textContent =
        dark ? "☀" : "☾";

    }
  );

}


/* =========================================================
   AUTO REFRESH LIVE
========================================================= */

function startLiveRefresh() {

  loadLive();


  setInterval(
    () => {

      loadLive();

    },
    60000
  );

}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "⚓ BakhiraFoot démarré"
    );


    renderHomeMatches();

    renderNews();

    renderLeagues();

    renderTeams();

    initSearch();

    initFilters();

    initDates();

    initTheme();

    startLiveRefresh();

  }
);
```

**مهم بزاف:** فالكود الجديد استعملت `/api?live=all` و`/api?date=...` باش يتوافق مباشرة مع `vercel.json` الموجود عندك، اللي كيوجه `/api/*` لـ `api/index.js`.

ومن بعد دير **Commit changes** فـ GitHub، وVercel غادي يدير deploy تلقائياً إذا كان مربوط بالـrepo.

**ملاحظة:** ما تبدلش `KICKOFF_API_KEY` داخل الملفات. خاصها تبقى فـ **Vercel → Project → Settings → Environment Variables** باسم `KICKOFF_API_KEY`، حيث `api/index.js` كيقراها من `process.env`.
