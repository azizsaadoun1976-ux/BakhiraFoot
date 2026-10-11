/* =========================================================
   BAKHIRAFOOT
   SPORT SCORE - MATCHS + CLASSEMENTS + BUTEURS + PASSEURS
   ========================================================= */

(() => {
  "use strict";

  const API = "https://sportscore.com/api";

  const SRC = "bakhira-foot.vercel.app";

  /* =========================================================
     GRANDES COMPÉTITIONS
     ========================================================= */

const competitions = [

  {
    name: "Premier League",
    slug: "english-premier-league",
    country: "Angleterre",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Premier_League.svg"
  },

  {
    name: "LaLiga",
    slug: "spanish-la-liga",
    country: "Espagne",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/LaLiga_logo_(2023).svg"
  },

  {
    name: "Serie A",
    slug: "italian-serie-a",
    country: "Italie",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Serie_A.svg"
  },

  {
    name: "Bundesliga",
    slug: "bundesliga",
    country: "Allemagne",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Bundesliga_logo.svg"
  },

  {
    name: "Ligue 1",
    slug: "french-ligue-1",
    country: "France",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Ligue1.svg"
  },

  {
    name: "Eredivisie",
    slug: "netherlands-eredivisie",
    country: "Pays-Bas",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Eredivisie_nieuw_logo_2017-.svg"
  },

  {
    name: "UEFA Champions League",
    slug: "uefa-champions-league",
    country: "Europe",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/UEFA_Champions_League_logo.svg"
  },

  {
    name: "UEFA Europa League",
    slug: "uefa-europa-league",
    country: "Europe",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/UEFA_Europa_league_logo.svg"
  },

  {
    name: "UEFA Conference League",
    slug: "uefa-europa-conference-league",
    country: "Europe",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/UEFA_Conference_League_full_logo_(2024_version).svg"
  },

  {
    name: "Botola Pro",
    slug: "the-botola-pro",
    country: "Maroc",
    logo: "https://seeklogo.com/images/B/botolapro-inwi-logo-CDFB034249-seeklogo.com.png"
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


  function todayUTC() {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }


  function formatTime(value) {

    if (!value) {
      return "--:--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "--:--";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }


  function isLive(status, text) {

    const value =
      `${status || ""} ${text || ""}`
        .toLowerCase();

    return (
      value.includes("live") ||
      value.includes("playing") ||
      value === "1h" ||
      value === "2h" ||
      value.includes("half")
    );
  }


  /* =========================================================
     MATCHS DU JOUR
     ========================================================= */

  function renderMatch(match) {

  const home =
    match.home ||
    "Équipe locale";

  const away =
    match.away ||
    "Équipe visiteuse";

  const homeLogo =
    match.home_logo ||
    "";

  const awayLogo =
    match.away_logo ||
    "";

  const homeScore =
    match.home_score ?? "-";

  const awayScore =
    match.away_score ?? "-";

  const live =
    isLive(
      match.status,
      match.status_text
    );

  const statusText =
    match.status_text ||
    (live ? "En direct" : "");

  const competition =
    match.competition ||
    match.league ||
    "Football";

  return `
    <article
      class="match-card bf-pro-match-card"
    >

      <!-- COMPETITION -->
      <div class="bf-match-top">

        <div class="bf-match-competition">
          <span class="bf-match-ball">⚽</span>
          <strong>
            ${escapeHTML(competition)}
          </strong>
        </div>

        ${
          live
            ? `
              <span class="bf-match-live">
                <span class="bf-live-dot"></span>
                LIVE
              </span>
            `
            : `
              <span class="bf-match-time">
                ${formatTime(match.time)}
              </span>
            `
        }

      </div>


      <!-- MATCH -->
      <div class="bf-match-body">

        <!-- HOME -->
        <div class="bf-match-team">

          ${
            homeLogo
              ? `
                <img
                  class="bf-team-logo"
                  src="${escapeHTML(homeLogo)}"
                  alt="${escapeHTML(home)}"
                  loading="lazy"
                >
              `
              : `
                <div class="bf-team-placeholder">
                  ⚽
                </div>
              `
          }

          <strong class="bf-team-name">
            ${escapeHTML(home)}
          </strong>

        </div>


        <!-- SCORE -->
        <div class="bf-match-score">

          <div class="bf-score-numbers">
            <span>
              ${escapeHTML(homeScore)}
            </span>

            <b>:</b>

            <span>
              ${escapeHTML(awayScore)}
            </span>
          </div>

          <div class="bf-match-status">
            ${escapeHTML(statusText)}
          </div>

        </div>


        <!-- AWAY -->
        <div class="bf-match-team">

          ${
            awayLogo
              ? `
                <img
                  class="bf-team-logo"
                  src="${escapeHTML(awayLogo)}"
                  alt="${escapeHTML(away)}"
                  loading="lazy"
                >
              `
              : `
                <div class="bf-team-placeholder">
                  ⚽
                </div>
              `
          }

          <strong class="bf-team-name">
            ${escapeHTML(away)}
          </strong>

        </div>

      </div>


      <!-- BOTTOM -->
      <div class="bf-match-bottom">

        <span>
          ${live ? "🔴 En direct" : "📅 Match"}
        </span>

        <span>
          BakhiraFoot
        </span>

      </div>

    </article>
  `;
}

async function loadTodayMatches() {

  const homeContainer =
    document.getElementById(
      "homeMatches"
    );

  /*
   * مهم:
   * sportscore-data.js مسؤول هنا
   * غير على Home.
   *
   * scoreList كتتحكم فيه script.js
   * باش ما يقعش conflit بيناتهم.
   */

  if (!homeContainer) {
    return;
  }

  try {

    const date =
      todayUTC();

    const data =
      await fetchJSON(
        `${API}/v1/fixtures/?sport=football&date=${date}&limit=200&src=${SRC}`
      );

    const matches =
      Array.isArray(
        data?.matches
      )
        ? data.matches
        : [];

    if (!matches.length) {

      homeContainer.innerHTML = `
        <div class="ss-empty">
          Aucun match trouvé aujourd'hui.
        </div>
      `;

      return;
    }


    homeContainer.innerHTML =
      matches
        .slice(0, 12)
        .map(renderMatch)
        .join("");

  }

  catch (error) {

    console.error(
      "SportScore fixtures:",
      error
    );

    homeContainer.innerHTML = `
      <div class="ss-error">
        Impossible de charger les matchs actuellement.
      </div>
    `;

  }
}
   
   /* =========================================================
     EXTRACTION DES CLASSEMENTS
     ========================================================= */

  function findRows(node) {

    if (!node) {
      return [];
    }


    if (Array.isArray(node)) {

      const looksLikeTable =
        node.some(item =>
          item &&
          typeof item === "object" &&
          (
            "position" in item ||
            "rank" in item ||
            "points" in item ||
            "pts" in item
          )
        );


      if (looksLikeTable) {
        return node;
      }


      for (const item of node) {

        const result =
          findRows(item);

        if (result.length) {
          return result;
        }

      }

      return [];
    }


    if (
      typeof node === "object"
    ) {

      const keys = [
        "standings",
        "table",
        "rows",
        "entries",
        "teams",
        "data",
        "groups"
      ];


      for (const key of keys) {

        if (
          node[key] !== undefined
        ) {

          const result =
            findRows(
              node[key]
            );

          if (result.length) {
            return result;
          }

        }

      }


      for (
        const value of Object.values(node)
      ) {

        const result =
          findRows(value);

        if (result.length) {
          return result;
        }

      }

    }


    return [];
  }


  function teamName(row) {

    if (!row) {
      return "Équipe";
    }


    if (
      typeof row.team === "string"
    ) {
      return row.team;
    }


    if (
      row.team &&
      typeof row.team === "object"
    ) {

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


  function teamLogo(row) {

    if (!row) {
      return "";
    }


    if (
      typeof row.team === "object" &&
      row.team
    ) {

      return (
        row.team.logo ||
        row.team.image ||
        row.team.crest ||
        ""
      );

    }


    return (
      row.team_logo ||
      row.logo ||
      row.crest ||
      row.image ||
      ""
    );
  }


  function value(
    row,
    keys,
    fallback = "-"
  ) {

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

/* =========================================================
   BAKHIRAFOOT - QUALIFICATION ZONES
   ========================================================= */

// القواعد الأساسية؛ معلومات التأهل من المصدر عند توفرها عندها الأولوية.
const QUALIFICATION_RULES = {
  "english-premier-league": [
    { from: 1, to: 4, key: "ucl", label: "Champions League" },
    { from: 5, to: 5, key: "uel", label: "Europa League — place de base" },
    { from: 6, to: 6, key: "uecl", label: "Conference League — place de base" },
    { from: 18, to: 20, key: "relegation", label: "Relégation" }
  ],

  "spanish-la-liga": [
    { from: 1, to: 4, key: "ucl", label: "Champions League" },
    { from: 5, to: 5, key: "uel", label: "Europa League — place de base" },
    { from: 6, to: 6, key: "uecl", label: "Conference League — place de base" },
    { from: 18, to: 20, key: "relegation", label: "Relégation" }
  ],

  "italian-serie-a": [
    { from: 1, to: 4, key: "ucl", label: "Champions League" },
    { from: 5, to: 5, key: "uel", label: "Europa League" },
    { from: 6, to: 6, key: "uecl", label: "Conference League — place de base" },
    { from: 18, to: 20, key: "relegation", label: "Relégation" }
  ],

  "bundesliga": [
    { from: 1, to: 4, key: "ucl", label: "Champions League" },
    { from: 5, to: 5, key: "uel", label: "Europa League — place de base" },
    { from: 6, to: 6, key: "uecl", label: "Conference League — place de base" },
    { from: 16, to: 16, key: "relegation-playoff", label: "Barrage de relégation" },
    { from: 17, to: 18, key: "relegation", label: "Relégation" }
  ],

  "french-ligue-1": [
    { from: 1, to: 3, key: "ucl", label: "Champions League" },
    { from: 4, to: 4, key: "ucl-playoff", label: "Qualifications Champions League" },
    { from: 5, to: 5, key: "uel", label: "Europa League — place de base" },
    { from: 6, to: 6, key: "uecl", label: "Conference League — place de base" },
    { from: 16, to: 16, key: "relegation-playoff", label: "Barrage de relégation" },
    { from: 17, to: 18, key: "relegation", label: "Relégation" }
  ],

  "netherlands-eredivisie": [
    { from: 1, to: 1, key: "ucl", label: "Champions League" },
    { from: 2, to: 2, key: "ucl-playoff", label: "Qualifications Champions League" },
    { from: 3, to: 3, key: "uel", label: "Qualifications Europa League" },
    { from: 4, to: 7, key: "europe-playoff", label: "Play-offs européens — zone indicative" },
    { from: 16, to: 16, key: "relegation-playoff", label: "Barrage de relégation" },
    { from: 17, to: 18, key: "relegation", label: "Relégation" }
  ],

  "the-botola-pro": [
    { from: 1, to: 2, key: "caf-cl", label: "Ligue des champions CAF — places de base" },
    { from: 3, to: 3, key: "caf-confed", label: "Coupe de la Confédération CAF — place indicative" },
    { from: 15, to: 16, key: "relegation", label: "Relégation" }
  ]
};

function qualificationText(item) {
  if (typeof item === "string") return item;

  if (Array.isArray(item)) {
    return item.map(qualificationText).join(" ");
  }

  if (item && typeof item === "object") {
    return [
      item.label,
      item.name,
      item.title,
      item.description,
      item.type,
      item.competition
    ]
      .filter(value => typeof value === "string")
      .join(" ");
  }

  return "";
}

function getProviderQualificationZone(row) {
  const source = [
    row?.zone,
    row?.zone_name,
    row?.qualification,
    row?.qualified_for,
    row?.description
  ]
    .map(qualificationText)
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!source) return null;

  if (
    /(knockout.*play.?off|play.?off.*round of 16|barrage.*huitieme)/.test(source)
  ) {
    return {
      key: "stage-playoff",
      label: "Barrages d'accès aux huitièmes"
    };
  }

  if (
    /round of 16|huitiemes de finale|last 16/.test(source)
  ) {
    return {
      key: "stage-direct",
      label: "Qualifié directement en huitièmes"
    };
  }

  if (
    /caf.*champions|champions.*caf/.test(source)
  ) {
    return {
      key: "caf-cl",
      label: "Ligue des champions CAF"
    };
  }

  if (
    /relegat|descenso|descente/.test(source) &&
    /play.?off|barrage/.test(source)
  ) {
    return {
      key: "relegation-playoff",
      label: "Barrage de relégation"
    };
  }

  if (/champions league|\bucl\b/.test(source)) {
    if (/qualif|play.?off|barrage|preliminary/.test(source)) {
      return {
        key: "ucl-playoff",
        label: "Qualifications Champions League"
      };
    }

    return {
      key: "ucl",
      label: "Champions League"
    };
  }

  if (/conference league|\buecl\b/.test(source)) {
    return {
      key: "uecl",
      label: "Conference League"
    };
  }

  if (/europa league|\buel\b/.test(source)) {
    return {
      key: "uel",
      label: "Europa League"
    };
  }

  if (/confederation caf/.test(source)) {
    return {
      key: "caf-confed",
      label: "Coupe de la Confédération CAF"
    };
  }

  if (/relegat|descenso|descente/.test(source)) {
    return {
      key: "relegation",
      label: "Relégation"
    };
  }

  if (/eliminated|elimine|elimination/.test(source)) {
    return {
      key: "eliminated",
      label: "Éliminé de la compétition"
    };
  }

  return null;
}

function getQualificationZone(row, competition, position) {
  // الأولوية لأي معلومة تأهل صريحة جاية من SportScore.
  const providerZone = getProviderQualificationZone(row);

  if (providerZone) return providerZone;

  const slug = competition?.slug;

  // نظام مرحلة الدوري الأوروبية: 36 فريقاً.
  if (
    slug === "uefa-champions-league" ||
    slug === "uefa-europa-league" ||
    slug === "uefa-europa-conference-league"
  ) {
    if (position >= 1 && position <= 8) {
      return {
        key: "stage-direct",
        label: "Qualifié directement en huitièmes"
      };
    }

    if (position >= 9 && position <= 24) {
      return {
        key: "stage-playoff",
        label: "Barrages d'accès aux huitièmes"
      };
    }

    if (position >= 25 && position <= 36) {
      return {
        key: "eliminated",
        label: "Éliminé de la compétition"
      };
    }

    return null;
  }

  const rules = QUALIFICATION_RULES[slug] || [];

  return rules.find(
    rule => position >= rule.from && position <= rule.to
  ) || null;
}

function renderQualificationLegend(standings, competition) {
  const zones = new Map();

  standings.forEach((row, index) => {
    const position =
      Number(value(row, ["position", "rank", "place"], index + 1)) ||
      index + 1;

    const zone = getQualificationZone(row, competition, position);

    if (zone && !zones.has(zone.key)) {
      zones.set(zone.key, zone);
    }
  });

  if (!zones.size) return "";

  return `
    <div class="ss-qualification-legend">
      ${Array.from(zones.values()).map(zone => `
        <span class="ss-zone-legend-item">
          <i class="ss-zone-swatch ss-zone-${zone.key}"></i>
          <span>${escapeHTML(zone.label)}</span>
        </span>
      `).join("")}
    </div>
  `;
}
   
  /* =========================================================
     LIGNE DU CLASSEMENT
     ========================================================= */

 function renderStandingRow(row, index, competition) {

    const position =
      value(
        row,
        [
          "position",
          "rank",
          "place"
        ],
        index + 1
      );

    const rank = Number(position) || index + 1;
const zone = getQualificationZone(row, competition, rank);

     const rankNumber = Number(position);

const rankClass =
  rankNumber === 1 ? "is-first" :
  rankNumber === 2 ? "is-second" :
  rankNumber === 3 ? "is-third" :
  "";

    const name =
      teamName(row);


    const logo =
      teamLogo(row);


    const played =
      value(
        row,
        [
          "played",
          "matches",
          "p",
          "games"
        ]
      );


    const wins =
      value(
        row,
        [
          "wins",
          "won",
          "w"
        ]
      );


    const draws =
      value(
        row,
        [
          "draws",
          "drawn",
          "d"
        ]
      );


    const losses =
      value(
        row,
        [
          "losses",
          "lost",
          "l"
        ]
      );


    const gf =
      value(
        row,
        [
          "goals_for",
          "gf"
        ]
      );


    const ga =
      value(
        row,
        [
          "goals_against",
          "ga"
        ]
      );


    const gd =
      value(
        row,
        [
          "goal_difference",
          "gd"
        ]
      );


    const points =
      value(
        row,
        [
          "points",
          "pts"
        ]
      );


    return `

      <div
  class="ss-standing-row ss-row-zone-${zone ? zone.key : "none"}"
  title="${escapeHTML(zone ? zone.label : "")}"
>

      <span class="ss-position ss-position-zone-${zone ? zone.key : "none"}">
          ${escapeHTML(position)}
        </span>


        <div class="ss-club">

          ${
            logo
              ? `
                <img
                  src="${escapeHTML(logo)}"
                  alt=""
                  loading="lazy"
                >
              `
              : `
                <div class="ss-club-fallback">
                  ⚽
                </div>
              `
          }

         <div class="ss-club-info">
  <strong>${escapeHTML(name)}</strong>

  ${zone ? `
    <small class="ss-zone-caption ss-zone-${zone.key}">
      ${escapeHTML(zone.label)}
    </small>
  ` : ""}
</div>

        </div>


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


  /* =========================================================
     TOP BUTEURS / PASSEURS
     ========================================================= */

  function findPlayers(node) {

    if (!node) {
      return [];
    }


    if (Array.isArray(node)) {

      const players =
        node.filter(item =>
          item &&
          typeof item === "object" &&
          (
            "player" in item ||
            "player_name" in item ||
            "goals" in item ||
            "assists" in item ||
            "value" in item
          )
        );


      if (players.length) {
        return players;
      }


      for (
        const item of node
      ) {

        const result =
          findPlayers(item);

        if (result.length) {
          return result;
        }

      }

      return [];
    }


    if (
      typeof node === "object"
    ) {

      const keys = [
        "topscorers",
        "players",
        "scorers",
        "assists",
        "data"
      ];


      for (const key of keys) {

        if (
          node[key] !== undefined
        ) {

          const result =
            findPlayers(
              node[key]
            );

          if (result.length) {
            return result;
          }

        }

      }


      for (
        const value of Object.values(node)
      ) {

        const result =
          findPlayers(value);

        if (result.length) {
          return result;
        }

      }

    }


    return [];
  }


  function playerName(row) {

    if (!row) {
      return "Joueur";
    }


    if (
      row.player &&
      typeof row.player === "object"
    ) {

      return (
        row.player.name ||
        row.player.player_name ||
        row.player.full_name ||
        "Joueur"
      );

    }


    return (
      row.player_name ||
      row.name ||
      row.player ||
      "Joueur"
    );
  }


  function playerPhoto(row) {

    if (!row) {
      return "";
    }


    if (
      row.player &&
      typeof row.player === "object"
    ) {

      return (
        row.player.photo ||
        row.player.image ||
        ""
      );

    }


    return (
      row.photo ||
      row.image ||
      ""
    );
  }


  function statValue(
    row,
    stat
  ) {

    if (stat === "goals") {

      return value(
        row,
        [
          "goals",
          "goal",
          "total",
          "value"
        ],
        0
      );

    }


    return value(
      row,
      [
        "assists",
        "assist",
        "total",
        "value"
      ],
      0
    );
  }


  function renderPlayers(
    players,
    stat,
    title,
    icon
  ) {

    const rows =
      players
        .slice(0, 5)
        .map(
          (player, index) => {

            const name =
              playerName(player);

            const photo =
              playerPhoto(player);

            const total =
              statValue(
                player,
                stat
              );


            return `

              <div class="ss-player-row">

                <span class="ss-player-rank">
                  ${index + 1}
                </span>


                <div class="ss-player">

                  ${
                    photo
                      ? `
                        <img
                          src="${escapeHTML(photo)}"
                          alt=""
                          loading="lazy"
                        >
                      `
                      : `
                        <div class="ss-player-fallback">
                          👤
                        </div>
                      `
                  }

                  <strong>
                    ${escapeHTML(name)}
                  </strong>

                </div>


                <strong class="ss-player-value">
                  ${escapeHTML(total)}
                </strong>

              </div>

            `;

          }
        )
        .join("");


    return `

      <div class="ss-player-card">

        <div class="ss-player-card-head">

          <div>
            <span class="ss-stat-icon">
              ${icon}
            </span>

            <strong>
              ${escapeHTML(title)}
            </strong>
          </div>

          <span>
            Top 5
          </span>

        </div>


        ${
          rows ||
          `
            <div class="ss-no-player-data">
              Données indisponibles.
            </div>
          `
        }

      </div>

    `;
  }


  /* =========================================================
     UNE COMPÉTITION
     ========================================================= */

  async function loadCompetition(
    competition
  ) {

    const [
      standingsData,
      goalsData,
      assistsData
    ] =
      await Promise.allSettled([

        fetchJSON(
          `${API}/v1/standings/?sport=football&slug=${encodeURIComponent(competition.slug)}&src=${SRC}`
        ),

        fetchJSON(
          `${API}/v1/topscorers/?sport=football&slug=${encodeURIComponent(competition.slug)}&limit=5&stat=goals&src=${SRC}`
        ),

        fetchJSON(
          `${API}/v1/topscorers/?sport=football&slug=${encodeURIComponent(competition.slug)}&limit=5&stat=assists&src=${SRC}`
        )

      ]);


    const standings =
      standingsData.status === "fulfilled"
        ? findRows(
            standingsData.value
          )
        : [];


    const goals =
      goalsData.status === "fulfilled"
        ? findPlayers(
            goalsData.value
          )
        : [];


    const assists =
      assistsData.status === "fulfilled"
        ? findPlayers(
            assistsData.value
          )
        : [];


    return {

      competition,

      standings,

      goals,

      assists

    };

  }


  /* =========================================================
     AFFICHER TOUTES LES COMPÉTITIONS
     ========================================================= */

 function renderCompetition(result) {

  const {
    competition,
    standings,
    goals,
    assists
  } = result;

 const rows = standings
    .map((row, index) =>
      renderStandingRow(row, index, competition)
    )
    .join("");

  return `
    <details class="bf-competition">

      <summary class="bf-competition-summary">

        <div class="bf-competition-brand">

          <div class="bf-competition-logo">
            <img
              src="${escapeHTML(competition.logo)}"
              alt="${escapeHTML(competition.name)}"
              loading="lazy"
            >
          </div>

          <div class="bf-competition-info">

            <small>
              ${escapeHTML(competition.country)}
            </small>

            <h2>
              ${escapeHTML(competition.name)}
            </h2>

            <span>
              ${standings.length} équipes
            </span>

          </div>

        </div>

        <span class="bf-competition-arrow">›</span>

      </summary>

      <div class="bf-competition-content">
${renderQualificationLegend(standings, competition)}
        <div class="ss-table-scroll">

          <div class="ss-table">

            <div class="ss-standing-row ss-table-header">
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

            ${rows}

          </div>

        </div>

        <div class="ss-players-grid">

          ${renderPlayers(
            goals,
            "goals",
            "Meilleurs buteurs",
            "⚽"
          )}

          ${renderPlayers(
            assists,
            "assists",
            "Meilleurs passeurs",
            "🎯"
          )}

        </div>

      </div>

    </details>
  `;
}

async function loadAllStandings() {

  function setupCompetitionToggles() {

  const container =
    document.getElementById("realStandings");

  if (!container) return;

  container
    .querySelectorAll(".ss-competition-toggle")
    .forEach((button) => {

      button.addEventListener("click", () => {

        const card =
          button.closest(".ss-competition-card");

        if (!card) return;

        const isOpen =
          card.classList.contains("is-open");

        /* نسدو جميع البطولات */
        container
          .querySelectorAll(".ss-competition-card")
          .forEach((otherCard) => {

            otherCard.classList.remove("is-open");

            const otherButton =
              otherCard.querySelector(
                ".ss-competition-toggle"
              );

            if (otherButton) {
              otherButton.setAttribute(
                "aria-expanded",
                "false"
              );
            }

          });

        /* إلا كانت مسدودة نفتحها */
        if (!isOpen) {

          card.classList.add("is-open");

          button.setAttribute(
            "aria-expanded",
            "true"
          );

        }

      });

    });
}   
    const container =
      document.getElementById(
        "realStandings"
      );


    if (!container) {
      return;
    }


    container.innerHTML = `

      <div class="ss-loading-main">

        <div class="ss-loader-ball">
          ⚽
        </div>

        <strong>
          Chargement des classements...
        </strong>

        <span>
          Données réelles SportScore
        </span>

      </div>

    `;


    const results =
      await Promise.all(
        competitions.map(
          loadCompetition
        )
      );


    container.innerHTML =
      results
        .map(
          renderCompetition
        )
        .join("");

  }


  /* =========================================================
     STYLES
     ========================================================= */

  function addStyles() {

    if (
      document.getElementById(
        "sportscore-final-styles"
      )
    ) {
      return;
    }


    const style =
      document.createElement("style");


    style.id =
      "sportscore-final-styles";


    style.textContent = `

 body.dark .bf-competition-logo {
  background: #ffffff !important;
  border-color: rgba(255,255,255,.12) !important;
}

body.dark .bf-competition-logo img {
  background: #ffffff !important;
}
      /* HIDE OLD COMPETITION CARDS */

      .legacy-league-grid {
        display: none !important;
      }


      /* PAGE HEADER */

      .competitions-page-head {
        margin-bottom: 30px;
      }

      .competitions-page-head small {
        display: block;
        margin-bottom: 7px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 1.4px;
        opacity: .58;
      }

      .competitions-page-head h1 {
        margin: 0;
        font-size: clamp(30px, 5vw, 46px);
        line-height: 1.08;
        letter-spacing: -1.3px;
      }

      .competitions-page-head p {
        margin: 12px 0 0;
        color: #6f7e89;
        line-height: 1.6;
      }


      body.dark .competitions-page-head p {
        color: #9baab4;
      }


      /* MAIN CONTAINER */

      .real-standings {
        display: grid;
        gap: 28px;
      }


      /* COMPETITION CARD */

      /* =========================================
   COMPETITION COMPACT
   ========================================= */

.bf-competition {
  overflow: hidden;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(16, 35, 48, .08);
  box-shadow: 0 7px 22px rgba(16, 35, 48, .055);
}

body.dark .bf-competition {
  background: #13212b;
  border-color: rgba(255,255,255,.07);
  box-shadow: 0 8px 24px rgba(0,0,0,.18);
}


/* =========================================
   COMPETITION HEADER
   ========================================= */

.bf-competition-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;

  width: 100%;
  min-height: 76px;

  padding: 12px 16px;

  cursor: pointer;
  user-select: none;

  text-align: left;
  color: inherit;
}

.bf-competition-summary:hover {
  background: rgba(20,40,50,.025);
}

body.dark .bf-competition-summary:hover {
  background: rgba(255,255,255,.025);
}


/* logo + infos */

.bf-competition-brand {
  display: flex;
  align-items: center;
  gap: 13px;

  min-width: 0;
}


/* vrai logo compétition */

.bf-competition-logo {
  width: 50px;
  height: 50px;

  flex: 0 0 50px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 14px;

  background: #f5f8fa;
  border: 1px solid rgba(16,35,48,.06);
}

body.dark .bf-competition-logo {
  background: #0d1922;
  border-color: rgba(255,255,255,.06);
}

.bf-competition-logo img {
  width: 37px;
  height: 37px;

  object-fit: contain;
}


/* texte */

.bf-competition-info {
  min-width: 0;
}

.bf-competition-info small {
  display: block;

  margin-bottom: 2px;

  font-size: 9px;
  font-weight: 900;

  text-transform: uppercase;
  letter-spacing: .7px;

  opacity: .48;
}

.bf-competition-info h2 {
  margin: 0;

  font-size: 17px;
  line-height: 1.2;
}

.bf-competition-info span {
  display: block;

  margin-top: 4px;

  font-size: 11px;
  opacity: .5;
}


/* flèche */

.bf-competition-arrow {
  width: 32px;
  height: 32px;

  flex: 0 0 32px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: rgba(20,40,50,.055);

  font-size: 24px;
  line-height: 1;

  transition: transform .2s ease;
}

body.dark .bf-competition-arrow {
  background: rgba(255,255,255,.06);
}


/* quand on ouvre */

.bf-competition[open] .bf-competition-arrow {
  transform: rotate(90deg);
}


/* contenu */

.bf-competition-content {
  border-top: 1px solid rgba(16,35,48,.07);
}

body.dark .bf-competition-content {
  border-top-color: rgba(255,255,255,.07);
}


/* =========================================
   TABLE
   ========================================= */

.ss-table-scroll {
  width: 100%;
  overflow-x: auto;
}

.ss-table {
  min-width: 850px;
}

.ss-standing-row {
  display: grid;

  grid-template-columns:
    42px
    minmax(240px, 1fr)
    repeat(7, 43px)
    55px;

  align-items: center;

  gap: 8px;

  padding: 10px 18px;

  min-height: 49px;

  border-bottom:
    1px solid rgba(16,35,48,.055);
}

body.dark .ss-standing-row {
  border-bottom-color:
    rgba(255,255,255,.055);
}

.ss-standing-row:last-child {
  border-bottom: 0;
}

.ss-table-header {
  min-height: 40px;

  background:
    rgba(20,40,50,.035);

  font-size: 10px;
  font-weight: 900;

  color: #73818b;
}

body.dark .ss-table-header {
  background:
    rgba(255,255,255,.035);

  color: #91a0aa;
}

.ss-position {
  font-weight: 900;
  font-size: 13px;
}

/* Qualification legend */
.ss-qualification-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(16, 35, 48, .07);
}

.ss-zone-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
}

.ss-zone-swatch {
  display: inline-block;
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border-radius: 50%;
}

.ss-club-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.ss-zone-caption {
  display: block;
  width: fit-content;
  max-width: 100%;
  padding: 2px 5px;
  border-radius: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 9px;
  font-weight: 800;
}

.ss-row-zone-ucl {
  border-left: 4px solid #2563eb;
  background-color: rgba(37, 99, 235, .045);
}

.ss-row-zone-ucl-playoff {
  border-left: 4px solid #60a5fa;
  background-color: rgba(96, 165, 250, .05);
}

.ss-row-zone-uel {
  border-left: 4px solid #ea580c;
  background-color: rgba(234, 88, 12, .045);
}

.ss-row-zone-uecl,
.ss-row-zone-europe-playoff {
  border-left: 4px solid #9333ea;
  background-color: rgba(147, 51, 234, .045);
}

.ss-row-zone-caf-cl {
  border-left: 4px solid #0d9488;
  background-color: rgba(13, 148, 136, .05);
}

.ss-row-zone-caf-confed {
  border-left: 4px solid #0891b2;
  background-color: rgba(8, 145, 178, .045);
}

.ss-row-zone-relegation-playoff {
  border-left: 4px solid #d97706;
  background-color: rgba(217, 119, 6, .05);
}

.ss-row-zone-relegation {
  border-left: 4px solid #dc2626;
  background-color: rgba(220, 38, 38, .045);
}

.ss-row-zone-stage-direct {
  border-left: 4px solid #16a34a;
  background-color: rgba(22, 163, 74, .05);
}

.ss-row-zone-stage-playoff {
  border-left: 4px solid #ca8a04;
  background-color: rgba(202, 138, 4, .05);
}

.ss-row-zone-eliminated {
  border-left: 4px solid #94a3b8;
  background-color: rgba(148, 163, 184, .045);
}

.ss-zone-ucl {
  color: #1d4ed8;
  background: #dbeafe;
}

.ss-zone-ucl-playoff {
  color: #1d4ed8;
  background: #eff6ff;
}

.ss-zone-uel {
  color: #c2410c;
  background: #ffedd5;
}

.ss-zone-uecl,
.ss-zone-europe-playoff {
  color: #7e22ce;
  background: #f3e8ff;
}

.ss-zone-caf-cl {
  color: #0f766e;
  background: #ccfbf1;
}

.ss-zone-caf-confed {
  color: #0e7490;
  background: #cffafe;
}

.ss-zone-relegation-playoff {
  color: #92400e;
  background: #fef3c7;
}

.ss-zone-relegation {
  color: #b91c1c;
  background: #fee2e2;
}

.ss-zone-stage-direct {
  color: #166534;
  background: #dcfce7;
}

.ss-zone-stage-playoff {
  color: #854d0e;
  background: #fef9c3;
}

.ss-zone-eliminated {
  color: #475569;
  background: #e2e8f0;
}

body.dark .ss-zone-caption,
body.dark .ss-zone-legend-item {
  filter: brightness(.9);
}

@media (max-width: 600px) {
  .ss-qualification-legend {
    gap: 7px 10px;
    padding: 10px 12px;
  }

  .ss-zone-caption {
    font-size: 8px;
  }
}

.ss-position.is-first {
  color: #765000;
  background: #fff0b3;
  border: 1px solid #edcf61;
  border-radius: 9px;
  padding: 5px;
  text-align: center;
  font-weight: 900;
}

.ss-position.is-second {
  color: #46515c;
  background: #e8edf2;
  border: 1px solid #c7d0d9;
  border-radius: 9px;
  padding: 5px;
  text-align: center;
  font-weight: 900;
}

.ss-position.is-third {
  color: #8b4b27;
  background: #f7dfce;
  border: 1px solid #dfb08e;
  border-radius: 9px;
  padding: 5px;
  text-align: center;
  font-weight: 900;
}

body.dark .ss-position.is-first {
  color: #ffe9a0;
  background: #493a18;
  border-color: #78612b;
}

body.dark .ss-position.is-second {
  color: #e0e7ee;
  background: #303b46;
  border-color: #52606e;
}

body.dark .ss-position.is-third {
  color: #ffd0ad;
  background: #492f22;
  border-color: #805438;
}

.ss-club {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ss-club img,
.ss-club-fallback {
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
}

.ss-club img {
  object-fit: contain;
}

.ss-club-fallback {
  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background:
    rgba(20,40,50,.06);

  font-size: 16px;
}

body.dark .ss-club-fallback {
  background:
    rgba(255,255,255,.06);
}

.ss-club strong {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}


/* =========================================
   MOBILE
   ========================================= */

@media (max-width: 700px) {

  .bf-competition-summary {
    min-height: 68px;
    padding: 10px 12px;
  }

  .bf-competition-logo {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
  }

  .bf-competition-logo img {
    width: 32px;
    height: 32px;
  }

  .bf-competition-info h2 {
    font-size: 15px;
  }

  .bf-competition-info span {
    font-size: 10px;
  }

}

      .ss-points {
        font-size: 14px;
      }


      /* PLAYER SECTION */

      .ss-players-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));

        gap: 18px;

        padding: 20px;

        background:
          rgba(20,40,50,.025);
      }


      body.dark .ss-players-grid {
        background:
          rgba(255,255,255,.025);
      }


      .ss-player-card {
        padding: 17px;

        border-radius: 18px;

        background: #ffffff;

        border: 1px solid
          rgba(16,35,48,.07);
      }


      body.dark .ss-player-card {
        background: #0e1b24;

        border-color:
          rgba(255,255,255,.07);
      }


      .ss-player-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;

        gap: 12px;

        padding-bottom: 10px;
        margin-bottom: 3px;
      }


      .ss-player-card-head > div {
        display: flex;
        align-items: center;
        gap: 7px;
      }


      .ss-stat-icon {
        font-size: 16px;
      }


      .ss-player-card-head > span {
        font-size: 10px;
        font-weight: 900;
        opacity: .5;
      }


      .ss-player-row {
        display: grid;

        grid-template-columns:
          25px
          minmax(0,1fr)
          35px;

        align-items: center;

        gap: 8px;

        min-height: 47px;

        border-top:
          1px solid rgba(16,35,48,.06);
      }


      body.dark .ss-player-row {
        border-top-color:
          rgba(255,255,255,.06);
      }


      .ss-player-rank {
        font-size: 11px;
        font-weight: 900;
        opacity: .48;
      }


      .ss-player {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
      }


      .ss-player img,
      .ss-player-fallback {
        width: 30px;
        height: 30px;
        flex: 0 0 30px;

        border-radius: 50%;

        object-fit: cover;
      }


      .ss-player-fallback {
        display: flex;
        align-items: center;
        justify-content: center;

        background:
          rgba(20,40,50,.06);

        font-size: 15px;
      }


      body.dark .ss-player-fallback {
        background:
          rgba(255,255,255,.06);
      }


      .ss-player strong {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }


      .ss-player-value {
        text-align: right;
        font-size: 14px;
      }


      /* LOADING */

      .ss-loading-main {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        min-height: 220px;

        padding: 25px;

        border-radius: 24px;

        background: #ffffff;

        border: 1px solid
          rgba(16,35,48,.08);

        gap: 8px;
      }


      body.dark .ss-loading-main {
        background: #13212b;
        border-color:
          rgba(255,255,255,.07);
      }


      .ss-loader-ball {
        font-size: 40px;
        animation:
          ssBall 1.3s ease-in-out infinite;
      }


      @keyframes ssBall {
        0%,100% {
          transform:
            translateY(0)
            rotate(0deg);
        }

        50% {
          transform:
            translateY(-10px)
            rotate(12deg);
        }
      }


      .ss-loading-main span {
        font-size: 12px;
        opacity: .55;
      }


      /* EMPTY / ERROR */

      .ss-empty,
      .ss-error,
      .ss-no-data,
      .ss-no-player-data {
        padding: 22px;
        text-align: center;

        color: #6f7e89;

        background:
          rgba(255,255,255,.65);

        border:
          1px solid rgba(16,35,48,.07);

        border-radius: 16px;
      }


      body.dark .ss-empty,
      body.dark .ss-error,
      body.dark .ss-no-data,
      body.dark .ss-no-player-data {
        color: #99a8b2;
        background:
          rgba(255,255,255,.035);

        border-color:
          rgba(255,255,255,.07);
      }


      .ss-error {
        color: #c94b4b;
      }


      .ss-day-count {
        margin-bottom: 14px;
        font-size: 13px;
        opacity: .7;
      }


      .sportscore-live {
        display: inline-flex;
        align-items: center;
        justify-content: center;

        padding: 4px 8px;

        border-radius: 999px;

        background: #e53935;
        color: #ffffff;

        font-size: 10px;
        font-weight: 900;
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

        background:
          rgba(20,40,50,.06);

        font-size: 17px;
      }


      /* MOBILE */

      @media (max-width: 800px) {

        .ss-competition-head {
          align-items: flex-start;
          padding: 16px;
        }


        .ss-season {
          display: none;
        }


        .ss-competition-logo-wrap {
          width: 50px;
          height: 50px;
          flex-basis: 50px;
        }


        .ss-competition-logo-wrap img {
          width: 37px;
          height: 37px;
        }


        .ss-competition-brand h2 {
          font-size: 17px;
        }


        .ss-players-grid {
          grid-template-columns: 1fr;
          padding: 14px;
        }


        .ss-competition-card {
          border-radius: 19px;
        }

      }


      @media (max-width: 500px) {

        .competitions-page-head h1 {
          font-size: 30px;
        }


        .ss-standing-row {
          padding-left: 12px;
          padding-right: 12px;
        }

      }

    `;


    document.head.appendChild(style);
  }


  /* =========================================================
     START
     ========================================================= */

  async function init() {

    addStyles();


    await Promise.all([
      loadTodayMatches(),
      loadAllStandings()
    ]);


    console.log(
      "✅ BakhiraFoot : SportScore real data ready"
    );

  }


  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );

  } else {

    init();

  }

})();
