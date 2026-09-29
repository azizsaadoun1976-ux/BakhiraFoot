/* ==========================================
   BAKHIRAFOOT - REAL FOOTBALL DATA
   SportScore API
   ========================================== */

(() => {
  "use strict";

  const API = "https://sportscore.com/api";

  const COMPETITIONS = [
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

  function formatTime(dateString) {
    if (!dateString) return "--:--";

    const d = new Date(dateString);

    if (Number.isNaN(d.getTime())) {
      return "--:--";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  }

  function formatDateUTC(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  async function getJSON(url) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  }

  /* ==========================================
     MATCHS DU JOUR
     ========================================== */

  async function loadRealMatches() {
    const container = document.getElementById("homeMatches");

    if (!container) return;

    container.innerHTML = `
      <div class="real-loading">
        Chargement des matchs réels...
      </div>
    `;

    try {
      const today = formatDateUTC();

      const data = await getJSON(
        `${API}/v1/fixtures/?sport=football&date=${today}&limit=40`
      );

      const matches = Array.isArray(data?.matches)
        ? data.matches
        : Array.isArray(data)
          ? data
          : [];

      if (!matches.length) {
        container.innerHTML = `
          <div class="real-empty">
            Aucun match trouvé pour aujourd'hui.
          </div>
        `;
        return;
      }

      container.innerHTML = matches
        .slice(0, 12)
        .map((match) => {
          const home = escapeHTML(
            match.home_name ||
            match.home ||
            "Équipe locale"
          );

          const away = escapeHTML(
            match.away_name ||
            match.away ||
            "Équipe visiteuse"
          );

          const homeLogo =
            match.home_logo ||
            match.homeLogo ||
            "";

          const awayLogo =
            match.away_logo ||
            match.awayLogo ||
            "";

          const homeScore =
            match.home_score ??
            "-";

          const awayScore =
            match.away_score ??
            "-";

          const status = String(
            match.status ||
            match.status_text ||
            "upcoming"
          ).toLowerCase();

          const isLive =
            status.includes("live") ||
            status.includes("playing") ||
            status === "1h" ||
            status === "2h";

          return `
            <article
              class="match-card real-match-card"
              data-real-slug="${escapeHTML(match.slug || "")}"
            >

              <div class="match-league">
                ${escapeHTML(match.competition || match.league || "Football")}
              </div>

              <div class="match-main">

                <div class="team">
                  ${
                    homeLogo
                      ? `<img src="${escapeHTML(homeLogo)}" alt="">`
                      : `<div class="team-logo-fallback">⚽</div>`
                  }
                  <strong>${home}</strong>
                </div>

                <div class="match-center">

                  ${
                    isLive
                      ? `<span class="live-badge">LIVE</span>`
                      : `<span class="match-time">${formatTime(match.time)}</span>`
                  }

                  <div class="score">
                    ${escapeHTML(homeScore)}
                    <span>-</span>
                    ${escapeHTML(awayScore)}
                  </div>

                  <small>
                    ${escapeHTML(match.status_text || "")}
                  </small>

                </div>

                <div class="team">
                  ${
                    awayLogo
                      ? `<img src="${escapeHTML(awayLogo)}" alt="">`
                      : `<div class="team-logo-fallback">⚽</div>`
                  }
                  <strong>${away}</strong>
                </div>

              </div>

            </article>
          `;
        })
        .join("");

    } catch (error) {
      console.error("BakhiraFoot matchs:", error);

      container.innerHTML = `
        <div class="real-error">
          Impossible de charger les matchs pour le moment.
        </div>
      `;
    }
  }


  /* ==========================================
     CLASSEMENTS
     ========================================== */

  async function loadRealStandings() {
    const container = document.getElementById("homeTables");

    if (!container) return;

    container.innerHTML = `
      <div class="real-loading">
        Chargement des classements...
      </div>
    `;

    try {
      const results = await Promise.all(
        COMPETITIONS.map(async (competition) => {

          try {
            const data = await getJSON(
              `${API}/widget/standings/?sport=football&slug=${encodeURIComponent(competition.slug)}`
            );

            return {
              ...competition,
              data
            };

          } catch (error) {
            console.warn(
              `Classement indisponible: ${competition.name}`,
              error
            );

            return {
              ...competition,
              data: null
            };
          }
        })
      );

      const valid = results.filter((item) => item.data);

      if (!valid.length) {
        container.innerHTML = `
          <div class="real-error">
            Aucun classement disponible actuellement.
          </div>
        `;
        return;
      }

      container.innerHTML = valid
        .map((competition) => {

          const rows =
            competition.data?.standings ||
            competition.data?.table ||
            competition.data?.teams ||
            [];

          if (!Array.isArray(rows) || !rows.length) {
            return "";
          }

          const topRows = rows.slice(0, 6);

          return `
            <div class="real-table-card">

              <div class="real-table-header">
                <div>
                  <span class="real-comp-icon">
                    ${competition.icon}
                  </span>

                  <strong>
                    ${escapeHTML(competition.name)}
                  </strong>
                </div>

                <span class="real-table-label">
                  Classement
                </span>
              </div>

              <div class="real-table">

                <div class="real-table-row real-table-head">
                  <span>#</span>
                  <span>Équipe</span>
                  <span>Pts</span>
                </div>

                ${topRows
                  .map((row, index) => {

                    const rank =
                      row.position ??
                      row.rank ??
                      index + 1;

                    const team =
                      row.team_name ??
                      row.team ??
                      row.name ??
                      "Équipe";

                    const points =
                      row.points ??
                      row.pts ??
                      0;

                    return `
                      <div class="real-table-row">

                        <span class="rank">
                          ${escapeHTML(rank)}
                        </span>

                        <span class="real-team-name">
                          ${escapeHTML(team)}
                        </span>

                        <strong>
                          ${escapeHTML(points)}
                        </strong>

                      </div>
                    `;
                  })
                  .join("")}

              </div>

            </div>
          `;
        })
        .join("");

    } catch (error) {
      console.error("BakhiraFoot standings:", error);

      container.innerHTML = `
        <div class="real-error">
          Impossible de charger les classements.
        </div>
      `;
    }
  }


  /* ==========================================
     BUTEURS + PASSEURS
     ========================================== */

  async function loadRealScorers() {

    const container = document.getElementById("homeNews");

    if (!container) return;

    const firstCompetition = COMPETITIONS[0];

    try {

      const [goalsData, assistsData] = await Promise.all([
        getJSON(
          `${API}/widget/topscorers/?sport=football&slug=${encodeURIComponent(firstCompetition.slug)}&limit=5&stat=goals`
        ),
        getJSON(
          `${API}/widget/topscorers/?sport=football&slug=${encodeURIComponent(firstCompetition.slug)}&limit=5&stat=assists`
        )
      ]);

      const goals =
        goalsData?.topscorers ||
        goalsData?.players ||
        [];

      const assists =
        assistsData?.topscorers ||
        assistsData?.players ||
        [];

      if (!goals.length && !assists.length) {
        return;
      }

      const block = document.createElement("div");

      block.className = "real-stats-strip";

      block.innerHTML = `
        <div class="real-stat-card">

          <div class="real-stat-title">
            ⚽ Meilleurs buteurs
          </div>

          ${
            goals.slice(0, 5).map((player, index) => {

              const name =
                player.player_name ||
                player.player ||
                player.name ||
                "Joueur";

              const value =
                player.goals ??
                player.value ??
                player.total ??
                0;

              return `
                <div class="real-player-row">
                  <span>${index + 1}</span>
                  <strong>${escapeHTML(name)}</strong>
                  <b>${escapeHTML(value)}</b>
                </div>
              `;
            }).join("")
          }

        </div>


        <div class="real-stat-card">

          <div class="real-stat-title">
            🎯 Meilleurs passeurs
          </div>

          ${
            assists.slice(0, 5).map((player, index) => {

              const name =
                player.player_name ||
                player.player ||
                player.name ||
                "Joueur";

              const value =
                player.assists ??
                player.value ??
                player.total ??
                0;

              return `
                <div class="real-player-row">
                  <span>${index + 1}</span>
                  <strong>${escapeHTML(name)}</strong>
                  <b>${escapeHTML(value)}</b>
                </div>
              `;
            }).join("")
          }

        </div>
      `;

      container.prepend(block);

    } catch (error) {

      console.warn(
        "BakhiraFoot scorers/assists:",
        error
      );
    }
  }


  /* ==========================================
     STYLES
     ========================================== */

  function addRealDataStyles() {

    if (document.getElementById("real-data-styles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "real-data-styles";

    style.textContent = `

      .real-loading,
      .real-empty,
      .real-error {
        padding: 24px;
        text-align: center;
        border-radius: 16px;
        background: rgba(255,255,255,.55);
        border: 1px solid rgba(20,40,50,.08);
        color: #6c7b85;
      }

      body.dark .real-loading,
      body.dark .real-empty,
      body.dark .real-error {
        background: rgba(255,255,255,.04);
        border-color: rgba(255,255,255,.08);
        color: #9eacb5;
      }

      .real-table-card {
        padding: 18px;
        border-radius: 20px;
        background: #fff;
        border: 1px solid rgba(20,40,50,.08);
        box-shadow: 0 8px 24px rgba(20,40,50,.06);
      }

      body.dark .real-table-card {
        background: #14212b;
        border-color: rgba(255,255,255,.07);
        box-shadow: 0 8px 24px rgba(0,0,0,.18);
      }

      .real-table-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .real-comp-icon {
        margin-right: 6px;
      }

      .real-table-label {
        font-size: 11px;
        opacity: .65;
        font-weight: 800;
      }

      .real-table {
        display: grid;
        gap: 2px;
      }

      .real-table-row {
        display: grid;
        grid-template-columns: 35px minmax(0,1fr) 42px;
        align-items: center;
        gap: 8px;
        min-height: 38px;
        padding: 6px 8px;
        border-radius: 10px;
      }

      .real-table-row:nth-child(even) {
        background: rgba(20,40,50,.035);
      }

      body.dark .real-table-row:nth-child(even) {
        background: rgba(255,255,255,.035);
      }

      .real-table-head {
        font-size: 11px;
        font-weight: 800;
        opacity: .55;
        min-height: 28px;
      }

      .real-team-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .real-stats-strip {
        display: grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap: 16px;
        width: 100%;
        margin-bottom: 18px;
      }

      .real-stat-card {
        padding: 18px;
        border-radius: 20px;
        background: #fff;
        border: 1px solid rgba(20,40,50,.08);
        box-shadow: 0 8px 24px rgba(20,40,50,.06);
      }

      body.dark .real-stat-card {
        background: #14212b;
        border-color: rgba(255,255,255,.07);
      }

      .real-stat-title {
        font-weight: 900;
        margin-bottom: 12px;
      }

      .real-player-row {
        display: grid;
        grid-template-columns: 26px minmax(0,1fr) 35px;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-top: 1px solid rgba(20,40,50,.07);
      }

      body.dark .real-player-row {
        border-top-color: rgba(255,255,255,.07);
      }

      .real-player-row span {
        opacity: .55;
        font-size: 12px;
      }

      .real-player-row strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .real-player-row b {
        text-align: right;
      }

      .live-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .5px;
        background: #e53935;
        color: white;
      }

      .match-time {
        font-size: 12px;
        font-weight: 800;
        opacity: .7;
      }

      @media (max-width: 700px) {

        .real-stats-strip {
          grid-template-columns: 1fr;
        }

        .real-table-card {
          padding: 14px;
        }

        .real-table-row {
          grid-template-columns: 28px minmax(0,1fr) 38px;
        }
      }

    `;

    document.head.appendChild(style);
  }


  /* ==========================================
     INITIALISATION
     ========================================== */

  async function initRealData() {

    addRealDataStyles();

    await Promise.all([
      loadRealMatches(),
      loadRealStandings(),
      loadRealScorers()
    ]);

    console.log(
      "✅ BakhiraFoot : données sportives réelles chargées."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initRealData,
      { once: true }
    );
  } else {
    initRealData();
  }

})();
