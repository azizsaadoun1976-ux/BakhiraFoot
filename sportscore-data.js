/* =====================================================
   BAKHIRAFOOT - SPORT SCORE REAL DATA
   Matchs du jour + Classements
   ===================================================== */

(() => {
  "use strict";

  const API = "https://sportscore.com/api";
  const SRC = "bakhira-foot.vercel.app";

  const competitions = [
    {
      name: "Premier League",
      slug: "premier-league",
      icon: "🏴"
    },
    {
      name: "La Liga",
      slug: "la-liga",
      icon: "🇪🇸"
    },
    {
      name: "Ligue 1",
      slug: "ligue-1",
      icon: "🇫🇷"
    },
    {
      name: "Botola Pro",
      slug: "the-botola-pro",
      icon: "🇲🇦"
    },
    {
      name: "Champions League",
      slug: "uefa-champions-league",
      icon: "🏆"
    }
  ];

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getTodayUTC() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatTime(value) {
    if (!value) return "--:--";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return "--:--";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  }

  async function fetchJSON(url) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  /* =====================================================
     MATCHS DU JOUR
     ===================================================== */

  function isLive(status = "", statusText = "") {
    const s = `${status} ${statusText}`.toLowerCase();

    return (
      s.includes("live") ||
      s.includes("playing") ||
      s.includes("1h") ||
      s.includes("2h") ||
      s.includes("half")
    );
  }

  function renderMatch(match) {
    const home = escapeHTML(match.home || "Équipe locale");
    const away = escapeHTML(match.away || "Équipe visiteuse");

    const homeLogo = match.home_logo || "";
    const awayLogo = match.away_logo || "";

    const homeScore =
      match.home_score === null ||
      match.home_score === undefined
        ? "-"
        : match.home_score;

    const awayScore =
      match.away_score === null ||
      match.away_score === undefined
        ? "-"
        : match.away_score;

    const live = isLive(
      match.status,
      match.status_text
    );

    return `
      <article
        class="match-card sportscore-match"
        data-sportscore-slug="${escapeHTML(match.slug || "")}"
      >

        <div class="match-league">
          ${escapeHTML(match.competition || "Football")}
        </div>

        <div class="match-main">

          <div class="team">
            ${
              homeLogo
                ? `
                  <img
                    src="${escapeHTML(homeLogo)}"
                    alt="${home}"
                    loading="lazy"
                  >
                `
                : `
                  <div class="team-logo-fallback">
                    ⚽
                  </div>
                `
            }

            <strong>
              ${home}
            </strong>
          </div>

          <div class="match-center">

            ${
              live
                ? `
                  <span class="sportscore-live">
                    LIVE
                  </span>
                `
                : `
                  <span class="sportscore-time">
                    ${formatTime(match.time)}
                  </span>
                `
            }

            <div class="score">
              ${escapeHTML(homeScore)}
              <span>–</span>
              ${escapeHTML(awayScore)}
            </div>

            <small>
              ${escapeHTML(match.status_text || "")}
            </small>

          </div>

          <div class="team">
            ${
              awayLogo
                ? `
                  <img
                    src="${escapeHTML(awayLogo)}"
                    alt="${away}"
                    loading="lazy"
                  >
                `
                : `
                  <div class="team-logo-fallback">
                    ⚽
                  </div>
                `
            }

            <strong>
              ${away}
            </strong>
          </div>

        </div>

      </article>
    `;
  }

  async function loadTodayMatches() {
    const homeContainer =
      document.getElementById("homeMatches");

    const scoresContainer =
      document.getElementById("scoreList");

    if (!homeContainer && !scoresContainer) {
      return;
    }

    if (homeContainer) {
      homeContainer.innerHTML = `
        <div class="sportscore-loading">
          ⚽ Chargement des matchs du jour...
        </div>
      `;
    }

    if (scoresContainer) {
      scoresContainer.innerHTML = `
        <div class="sportscore-loading">
          ⚽ Chargement des matchs...
        </div>
      `;
    }

    try {
      const date = getTodayUTC();

      const data = await fetchJSON(
        `${API}/v1/fixtures/?sport=football&date=${date}&limit=200&src=${SRC}`
      );

      const matches = Array.isArray(data?.matches)
        ? data.matches
        : [];

      if (!matches.length) {
        const empty = `
          <div class="sportscore-empty">
            Aucun match trouvé pour aujourd'hui.
          </div>
        `;

        if (homeContainer) homeContainer.innerHTML = empty;
        if (scoresContainer) scoresContainer.innerHTML = empty;

        return;
      }

      /* HOME : seulement les premiers matchs */
      if (homeContainer) {
        homeContainer.innerHTML = matches
          .slice(0, 12)
          .map(renderMatch)
          .join("");
      }

      /* SCORES : tous les matchs récupérés */
      if (scoresContainer) {
        scoresContainer.innerHTML = `
          <div class="sportscore-day-title">
            <strong>${matches.length}</strong>
            matchs aujourd'hui
          </div>

          ${matches
            .map(renderMatch)
            .join("")}
        `;
      }

    } catch (error) {
      console.error(
        "SportScore fixtures:",
        error
      );

      const errorHTML = `
        <div class="sportscore-error">
          Impossible de charger les matchs actuellement.
        </div>
      `;

      if (homeContainer) {
        homeContainer.innerHTML = errorHTML;
      }

      if (scoresContainer) {
        scoresContainer.innerHTML = errorHTML;
      }
    }
  }

  /* =====================================================
     EXTRACTION CLASSEMENT
     ===================================================== */

  function findStandingRows(node) {
    if (!node) return [];

    if (Array.isArray(node)) {

      const looksLikeStandings = node.some((item) => {
        return (
          item &&
          typeof item === "object" &&
          (
            "position" in item ||
            "rank" in item ||
            "points" in item ||
            "pts" in item
          )
        );
      });

      if (looksLikeStandings) {
        return node;
      }

      for (const item of node) {
        const found = findStandingRows(item);

        if (found.length) {
          return found;
        }
      }

      return [];
    }

    if (typeof node === "object") {

      const preferredKeys = [
        "standings",
        "table",
        "rows",
        "teams",
        "entries",
        "data",
        "groups"
      ];

      for (const key of preferredKeys) {
        if (node[key]) {
          const found = findStandingRows(node[key]);

          if (found.length) {
            return found;
          }
        }
      }

      for (const value of Object.values(node)) {
        const found = findStandingRows(value);

        if (found.length) {
          return found;
        }
      }
    }

    return [];
  }

  function getTeamName(row) {
    if (!row) return "Équipe";

    if (typeof row.team === "string") {
      return row.team;
    }

    if (row.team && typeof row.team === "object") {
      return (
        row.team.name ||
        row.team.team_name ||
        row.team.title ||
        "Équipe"
      );
    }

    return (
      row.team_name ||
      row.name ||
      row.club ||
      row.title ||
      "Équipe"
    );
  }

  function getValue(row, keys, fallback = 0) {
    for (const key of keys) {
      if (
        row &&
        row[key] !== undefined &&
        row[key] !== null
      ) {
        return row[key];
      }
    }

    return fallback;
  }

  function renderStandingRow(row, index) {
    const position = getValue(
      row,
      ["position", "rank", "place"],
      index + 1
    );

    const teamName = getTeamName(row);

    const played = getValue(
      row,
      ["played", "matches", "p", "games"],
      "-"
    );

    const wins = getValue(
      row,
      ["wins", "won", "w"],
      "-"
    );

    const draws = getValue(
      row,
      ["draws", "drawn", "d"],
      "-"
    );

    const losses = getValue(
      row,
      ["losses", "lost", "l"],
      "-"
    );

    const gf = getValue(
      row,
      ["goals_for", "gf", "goals"],
      "-"
    );

    const ga = getValue(
      row,
      ["goals_against", "ga"],
      "-"
    );

    const gd = getValue(
      row,
      ["goal_difference", "gd"],
      "-"
    );

    const points = getValue(
      row,
      ["points", "pts"],
      "-"
    );

    return `
      <div class="sportscore-table-row">

        <span class="ss-pos">
          ${escapeHTML(position)}
        </span>

        <strong class="ss-team">
          ${escapeHTML(teamName)}
        </strong>

        <span>
          ${escapeHTML(played)}
        </span>

        <span>
          ${escapeHTML(wins)}
        </span>

        <span>
          ${escapeHTML(draws)}
        </span>

        <span>
          ${escapeHTML(losses)}
        </span>

        <span>
          ${escapeHTML(gf)}
        </span>

        <span>
          ${escapeHTML(ga)}
        </span>

        <span>
          ${escapeHTML(gd)}
        </span>

        <strong class="ss-points">
          ${escapeHTML(points)}
        </strong>

      </div>
    `;
  }

  /* =====================================================
     CLASSEMENTS
     ===================================================== */

  async function loadStandings() {
    const container =
      document.getElementById("homeTables");

    if (!container) {
      return;
    }

    container.innerHTML = `
      <div class="sportscore-loading">
        🏆 Chargement des classements...
      </div>
    `;

    try {
      const results =
        await Promise.all(
          competitions.map(async (competition) => {

            try {
              const data = await fetchJSON(
                `${API}/v1/standings/?sport=football&slug=${encodeURIComponent(competition.slug)}&src=${SRC}`
              );

              return {
                competition,
                data
              };

            } catch (error) {
              console.warn(
                `Classement indisponible: ${competition.name}`,
                error
              );

              return {
                competition,
                data: null
              };
            }
          })
        );

      const html = results
        .map(({ competition, data }) => {

          if (!data) {
            return "";
          }

          const rows = findStandingRows(data);

          if (!rows.length) {
            return "";
          }

          return `
            <section class="sportscore-standing">

              <div class="ss-standing-head">

                <div>
                  <span class="ss-icon">
                    ${competition.icon}
                  </span>

                  <strong>
                    ${escapeHTML(competition.name)}
                  </strong>
                </div>

                <span class="ss-live-label">
                  Saison actuelle
                </span>

              </div>

              <div class="ss-table-wrap">

                <div class="sportscore-table">

                  <div class="sportscore-table-row ss-header">

                    <span>#</span>
                    <span>Équipe</span>
                    <span>J</span>
                    <span>G</span>
                    <span>N</span>
                    <span>P</span>
                    <span>BP</span>
                    <span>BC</span>
                    <span>Diff</span>
                    <span>Pts</span>

                  </div>

                  ${rows
                    .slice(0, 10)
                    .map(renderStandingRow)
                    .join("")}

                </div>

              </div>

            </section>
          `;
        })
        .join("");

      if (!html.trim()) {
        container.innerHTML = `
          <div class="sportscore-empty">
            Aucun classement disponible actuellement.
          </div>
        `;

        return;
      }

      container.innerHTML = html;

    } catch (error) {
      console.error(
        "SportScore standings:",
        error
      );

      container.innerHTML = `
        <div class="sportscore-error">
          Impossible de charger les classements.
        </div>
      `;
    }
  }

  /* =====================================================
     STYLES
     ===================================================== */

  function addStyles() {

    if (
      document.getElementById(
        "sportscore-data-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "sportscore-data-styles";

    style.textContent = `

      .sportscore-loading,
      .sportscore-empty,
      .sportscore-error {
        width: 100%;
        padding: 22px;
        text-align: center;
        border-radius: 16px;
        box-sizing: border-box;
        background: rgba(255,255,255,.60);
        border: 1px solid rgba(20,40,50,.08);
        color: #6b7983;
      }

      body.dark .sportscore-loading,
      body.dark .sportscore-empty,
      body.dark .sportscore-error {
        background: rgba(255,255,255,.04);
        border-color: rgba(255,255,255,.07);
        color: #9eabb4;
      }

      .sportscore-day-title {
        margin-bottom: 14px;
        font-size: 14px;
        opacity: .7;
      }

      .sportscore-match {
        cursor: default;
      }

      .sportscore-live {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 8px;
        border-radius: 999px;
        background: #e53935;
        color: #fff;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .5px;
      }

      .sportscore-time {
        font-size: 12px;
        font-weight: 800;
        opacity: .7;
      }

      .team-logo-fallback {
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(20,40,50,.06);
        font-size: 18px;
      }

      .sportscore-standing {
        margin-bottom: 20px;
        overflow: hidden;
        border-radius: 20px;
        background: #fff;
        border: 1px solid rgba(20,40,50,.08);
        box-shadow: 0 8px 25px rgba(20,40,50,.06);
      }

      body.dark .sportscore-standing {
        background: #14212b;
        border-color: rgba(255,255,255,.07);
        box-shadow: 0 8px 25px rgba(0,0,0,.18);
      }

      .ss-standing-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 20px;
        border-bottom: 1px solid rgba(20,40,50,.07);
      }

      body.dark .ss-standing-head {
        border-bottom-color: rgba(255,255,255,.07);
      }

      .ss-icon {
        margin-right: 7px;
      }

      .ss-live-label {
        font-size: 11px;
        font-weight: 800;
        opacity: .55;
      }

      .ss-table-wrap {
        width: 100%;
        overflow-x: auto;
      }

      .sportscore-table {
        min-width: 720px;
      }

      .sportscore-table-row {
        display: grid;
        grid-template-columns:
          34px
          minmax(180px, 1fr)
          repeat(7, 42px)
          48px;

        align-items: center;
        gap: 7px;
        padding: 9px 14px;
      }

      .sportscore-table-row:nth-child(even) {
        background: rgba(20,40,50,.025);
      }

      body.dark .sportscore-table-row:nth-child(even) {
        background: rgba(255,255,255,.025);
      }

      .sportscore-table-row.ss-header {
        min-height: 34px;
        background: rgba(20,40,50,.045);
        font-size: 10px;
        font-weight: 900;
        opacity: .65;
      }

      body.dark .sportscore-table-row.ss-header {
        background: rgba(255,255,255,.035);
      }

      .ss-team {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .ss-pos {
        font-weight: 900;
      }

      .ss-points {
        font-weight: 950;
      }

      @media (max-width: 700px) {

        .ss-standing-head {
          padding: 15px;
        }

        .sportscore-table-row {
          padding: 8px 12px;
        }

        .sportscore-standing {
          border-radius: 16px;
        }

      }

    `;

    document.head.appendChild(style);
  }

  /* =====================================================
     INITIALISATION
     ===================================================== */

  async function initSportScore() {

    addStyles();

    await Promise.all([
      loadTodayMatches(),
      loadStandings()
    ]);

    console.log(
      "✅ BakhiraFoot: SportScore data loaded"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initSportScore,
      { once: true }
    );
  } else {
    initSportScore();
  }

  /* تحديث كل 60 ثانية */
  setInterval(() => {
    loadTodayMatches();
  }, 60000);

})();
