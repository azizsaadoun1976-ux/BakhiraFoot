/* =========================================================
   BAKHIRAFOOT - SCRIPT.JS
   Compatible with the current index.html
   No changes to HTML/CSS required
========================================================= */

const API_BASE = "";

/* =========================================================
   DATA
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

function normalizeMatches(data) {
  if (Array.isArray(data)) return data;

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

function normalizeMatch(match) {
  return {
    league:
      match?.league?.name ||
      match?.competition?.name ||
      match?.league ||
      "Football",

    home:
      match?.teams?.home?.name ||
      match?.home?.name ||
      match?.home ||
      "Équipe domicile",

    away:
      match?.teams?.away?.name ||
      match?.away?.name ||
      match?.away ||
      "Équipe extérieure",

    homeLogo:
      match?.teams?.home?.logo ||
      match?.home?.logo ||
      "",

    awayLogo:
      match?.teams?.away?.logo ||
      match?.away?.logo ||
      "",

    homeScore:
      match?.goals?.home ??
      match?.score?.home ??
      match?.homeScore ??
      0,

    awayScore:
      match?.goals?.away ??
      match?.score?.away ??
      match?.awayScore ??
      0,

    minute:
      match?.fixture?.status?.elapsed ??
      match?.status?.elapsed ??
      match?.minute ??
      "",

    status:
      match?.fixture?.status?.short ||
      match?.status?.short ||
      match?.status ||
      ""
  };
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

  if (!target) {
    console.warn("Page introuvable:", page);
    return;
  }

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
    loadMatches();
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
   MATCH HTML
========================================================= */

function createMatchHTML(match) {
  const m = normalizeMatch(match);

  const minuteText = m.minute
    ? `${m.minute}'`
    : "LIVE";

  return `
    <div class="card">

      <div class="comp">
        🏆 ${escapeHTML(m.league)}
      </div>

      <div class="teams">

        <div class="team">
          ${
            m.homeLogo
              ? `
                <img
                  class="teamLogo"
                  src="${escapeHTML(m.homeLogo)}"
                  alt="${escapeHTML(m.home)}"
                  loading="lazy"
                >
              `
              : "⚽"
          }

          <span>
            ${escapeHTML(m.home)}
          </span>
        </div>

        <div class="score">

          <strong>
            ${escapeHTML(m.homeScore)}
            -
            ${escapeHTML(m.awayScore)}
          </strong>

          <small class="red">
            🔴 LIVE ${escapeHTML(minuteText)}
          </small>

        </div>

        <div class="team">

          ${
            m.awayLogo
              ? `
                <img
                  class="teamLogo"
                  src="${escapeHTML(m.awayLogo)}"
                  alt="${escapeHTML(m.away)}"
                  loading="lazy"
                >
              `
              : "⚽"
          }

          <span>
            ${escapeHTML(m.away)}
          </span>

        </div>

      </div>

    </div>
  `;
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
   LIVE
========================================================= */

async function loadLive() {
  const live = $("live");
  const scoreList = $("scoreList");

  if (live) {
    live.textContent = "🟡 Chargement...";
  }

  try {

    const response = await fetch(
      `${API_BASE}/api?live=all`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    const matches = normalizeMatches(json);

    console.log(
      "BakhiraFoot LIVE:",
      matches
    );

    if (live) {
      live.textContent = matches.length
        ? `🔴 ${matches.length} MATCH(S) LIVE`
        : "⚪ Aucun match live";
    }

    if (scoreList && matches.length) {
      scoreList.innerHTML =
        matches
          .map(createMatchHTML)
          .join("");
    }

    return matches;

  } catch (error) {

    console.error(
      "Erreur LIVE:",
      error
    );

    if (live) {
      live.textContent =
        "⚪ Live indisponible";
    }

    return [];
  }
}

/* =========================================================
   MATCHES BY DATE
========================================================= */

async function loadMatches(date) {

  const scoreList = $("scoreList");

  if (!scoreList) return;

  scoreList.innerHTML =
    emptyCard("Chargement des matchs...");

  const selectedDate =
    date ||
    new Date()
      .toISOString()
      .split("T")[0];

  try {

    const response = await fetch(
      `${API_BASE}/api?date=${encodeURIComponent(selectedDate)}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const json = await response.json();

    const matches =
      normalizeMatches(json);

    console.log(
      "BakhiraFoot MATCHS:",
      matches
    );

    if (!matches.length) {

      scoreList.innerHTML =
        emptyCard(
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
      "Erreur MATCHS:",
      error
    );

    scoreList.innerHTML =
      emptyCard(
        "Impossible de charger les matchs."
      );
  }
}

/* =========================================================
   HOME MATCHES
========================================================= */

async function renderHomeMatches() {

  const container =
    $("homeMatches");

  if (!container) return;

  container.innerHTML =
    emptyCard(
      "Chargement des matchs..."
    );

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

    const json =
      await response.json();

    const matches =
      normalizeMatches(json);

    if (!matches.length) {

      container.innerHTML =
        demoMatches
          .slice(0, 3)
          .map(createMatchHTML)
          .join("");

      return;
    }

    container.innerHTML =
      matches
        .slice(0, 6)
        .map(createMatchHTML)
        .join("");

  } catch (error) {

    console.error(
      "HOME MATCH ERROR:",
      error
    );

    container.innerHTML =
      demoMatches
        .slice(0, 3)
        .map(createMatchHTML)
        .join("");
  }
}

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

  for (let i = -2; i <= 4; i++) {

    const date =
      new Date(today);

    date.setDate(
      today.getDate() + i
    );

    const iso =
      date.toISOString()
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

    button.textContent = label;

    if (i === 0) {
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

        loadMatches(iso);
      }
    );

    bar.appendChild(button);
  }
}

/* =========================================================
   LEAGUES
========================================================= */

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

  go("scores");

  setTimeout(() => {

    const buttons =
      document.querySelectorAll(
        ".filter"
      );

    buttons.forEach(button => {

      button.classList.remove(
        "active"
      );

      if (
        button.dataset.filter ===
        league
      ) {
        button.classList.add(
          "active"
        );
      }
    });

    toast(
      `Compétition : ${league}`
    );

  }, 100);
}

/* =========================================================
   TEAMS
========================================================= */

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
      t => t.name === name
    );

  if (!team) return;

  detail.innerHTML = `
    <div class="card detail">

      <div class="detailHead">

        <div class="big">
          ${team.logo}
        </div>

        <div>
          <h2>
            ${escapeHTML(team.name)}
          </h2>

          <p>
            ${escapeHTML(team.country)}
          </p>
        </div>

      </div>

      <br>

      <div class="statgrid">

        <div class="stat">
          <strong>⚽</strong>
          <br>
          Football
        </div>

        <div class="stat">
          <strong>🏆</strong>
          <br>
          Compétitions
        </div>

        <div class="stat">
          <strong>📊</strong>
          <br>
          Statistiques
        </div>

      </div>

    </div>
  `;

  detail.scrollIntoView({
    behavior: "smooth"
  });
}

/* =========================================================
   NEWS
========================================================= */

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
      .slice(0, 3)
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

        const filter =
          button.dataset.filter;

        if (filter === "all") {

          loadMatches();

          return;
        }

        loadMatches()
          .then(() => {

            const cards =
              document.querySelectorAll(
                "#scoreList .card"
              );

            cards.forEach(card => {

              const text =
                card.textContent
                  .toLowerCase();

              card.style.display =
                text.includes(
                  filter.toLowerCase()
                )
                  ? ""
                  : "none";
            });

          });
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

        document
          .querySelectorAll(
            "#homeMatches .card, #scoreList .card, #teamGrid .card, #newsGrid .card"
          )
          .forEach(card => {
            card.style.display = "";
          });

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
   DARK MODE
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

      button.textContent =
        dark ? "☀" : "☾";

      localStorage.setItem(
        "bakhirafoot-theme",
        dark ? "dark" : "light"
      );
    }
  );
}

/* =========================================================
   HOME
========================================================= */

function renderHome() {

  renderHomeNews();
  renderTables();
  renderHomeMatches();
}

/* =========================================================
   LIVE AUTO REFRESH
========================================================= */

function startLiveRefresh() {

  setInterval(() => {

    const scores =
      $("scores");

    if (
      scores &&
      scores.classList.contains(
        "active"
      )
    ) {
      loadLive();
    }

  }, 60000);
}

/* =========================================================
   NAV BUTTONS
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

        const page =
          button.dataset.page;

        go(page);
      }
    );
  });
}

/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "⚓ BakhiraFoot chargé !"
    );

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

  }
);
