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
  },
    {
    name: "FIFA World Cup",
    slug: "fifa-world-cup",
    country: "International",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/2026_FIFA_World_Cup_logo.svg"
  },
  {
    name: "UEFA Euro",
    slug: "uefa-european-championship",
    country: "Europe",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/UEFA_Euro_2024_logo.svg"
  },
  {
    name: "CAF Africa Cup of Nations",
    slug: "caf-africa-cup-of-nations",
    fallbackSlugs: ["africa-cup-of-nations"],
    country: "Afrique",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/2025_Africa_Cup_of_Nations_logo.svg"
  },
  {
    name: "AFC Asian Cup",
    slug: "afc-asian-cup",
    country: "Asie",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/AFC_Asian_Cup.svg"
  },
  {
    name: "Copa América",
    slug: "conmebol-copa-america",
    fallbackSlugs: ["copa-america"],
    country: "Amérique du Sud",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Copa_America_wordmark.svg"
  },
  {
    name: "UEFA Nations League",
    slug: "uefa-nations-league",
    country: "Europe",
    logo: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Uefa_nations_league_textlogo.png"
  },
  {
    name: "EFL Championship",
    slug: "english-football-league-championship",
    country: "Angleterre",
    logo: "https://seeklogo.com/images/E/efl-championship-logo-472D2177A6-seeklogo.com.png"
  },
  {
    name: "Serie B",
    slug: "italian-serie-b",
    country: "Italie",
    logo: "https://www.ceroacero.es/img/logos/competicoes/95_imgbank_sb_20250311155014.png"
  },
  {
    name: "Brasileirão Série A",
    slug: "brazilian-serie-a",
    country: "Brésil",
    logo: "https://logospng.org/download/brasileirao-serie-a/logo-brasileirao-512.png"
  },
  {
    name: "Egyptian Premier League",
    slug: "egyptian-premier-league",
    country: "Égypte",
    logo: "https://assets.footylogos.com/logos/egyptian-premier-league/egyptian-premier-league-logo-footylogos.svg"
  },
 {
  name: "Saudi Professional League",
  slug: "saudi-professional-league",
  country: "Arabie saoudite",
  logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Saudi_Pro_League_Logo.svg/3840px-Saudi_Pro_League_Logo.svg.png"
},
 {
  name: "Primeira Liga",
  slug: "portuguese-primera-liga",
  country: "Portugal",
  logo: "https://www.ligaportugal.pt/backoffice/assets/ic_ligabetclic_c07b64a3af.png"
},
  {
    name: "Süper Lig",
    slug: "turkish-super-league",
    country: "Turquie",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/86/Trendyol_super_lig_logo.svg"
  },
  {
    name: "Belgian Pro League",
    slug: "belgian-pro-league",
    country: "Belgique",
    logo: "https://assets.footylogos.com/logos/belgian-pro-league/belgian-pro-league-logo-footylogos.svg"
  },
  {
    name: "Scottish Premiership",
    slug: "scottish-premiership",
    country: "Écosse",
    logo: "https://assets.football-logos.cc/logos/scotland/700x700/scottish-premiership.b3d4bdfb.png"
  },
  {
   name: "Argentine Division 1",
  slug: "argentine-division-1",
  country: "Argentine",
  logo: "https://upload.wikimedia.org/wikipedia/commons/9/91/Liga_Profesional_de_F%C3%BAtbol_%28Argentina%29_wordmark.svg"
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


  /* =========================================================
     EXTRACTION DES TABLEAUX PAR GROUPE
     - Garde le comportement des ligues à tableau unique
     - Récupère tous les groupes des compétitions nationales
     ========================================================= */

  function isStandingRow(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }

    const hasRankOrPoints = [
      "position", "rank", "place", "points", "pts",
      "played", "matches", "p", "games"
    ].some(key => item[key] !== undefined && item[key] !== null);

    const hasTeam = [
      "team", "team_name", "teamName", "club", "name", "title"
    ].some(key => item[key] !== undefined && item[key] !== null);

    return hasRankOrPoints && hasTeam;
  }

  function groupNameFrom(value) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (value && typeof value === "object") {
      for (const key of ["name", "title", "label", "short_name", "display_name"]) {
        if (typeof value[key] === "string" && value[key].trim()) {
          return value[key].trim();
        }
      }
    }

    return "";
  }

  function rowGroupName(row) {
    if (!row || typeof row !== "object") return "";

    return (
      groupNameFrom(row.group_name) ||
      groupNameFrom(row.groupName) ||
      groupNameFrom(row.group_title) ||
      groupNameFrom(row.groupTitle) ||
      groupNameFrom(row.pool_name) ||
      groupNameFrom(row.poolName) ||
      groupNameFrom(row.group) ||
      groupNameFrom(row.pool) ||
      ""
    );
  }

  function looksLikeStandingTable(node) {
    return Array.isArray(node) && node.length > 0 && node.some(isStandingRow);
  }

  function findStandingGroups(root) {
    const groups = [];
    const seenArrays = new Set();
    const seenSignatures = new Set();

    function hasStandingsChild(node) {
      if (!node || typeof node !== "object" || Array.isArray(node)) return false;
      return Object.keys(node).some(key =>
        /^(standings?|tables?|rows|entries|teams|group_standings|groupStandings)$/i.test(key)
      );
    }

    function explicitGroupName(node) {
      if (!node || typeof node !== "object" || Array.isArray(node)) return "";
      return (
        groupNameFrom(node.group_name) ||
        groupNameFrom(node.groupName) ||
        groupNameFrom(node.group_title) ||
        groupNameFrom(node.groupTitle) ||
        groupNameFrom(node.pool_name) ||
        groupNameFrom(node.poolName) ||
        groupNameFrom(node.group) ||
        groupNameFrom(node.pool) ||
        ""
      );
    }

    function addTable(rows, label) {
      if (!looksLikeStandingTable(rows)) return;
      if (seenArrays.has(rows)) return;
      seenArrays.add(rows);

      // Some APIs return one flat array with a group property on every row.
      const byGroup = new Map();
      for (const row of rows) {
        const rowGroup = rowGroupName(row);
        if (!rowGroup) continue;
        if (!byGroup.has(rowGroup)) byGroup.set(rowGroup, []);
        byGroup.get(rowGroup).push(row);
      }

      if (byGroup.size > 1) {
        for (const [groupName, groupRows] of byGroup.entries()) {
          const signature = `${groupName}::${groupRows.map(teamName).join("|")}`;
          if (!seenSignatures.has(signature)) {
            seenSignatures.add(signature);
            groups.push({ name: groupName, rows: groupRows });
          }
        }
        return;
      }

      const inferredName = label || (byGroup.size === 1 ? byGroup.keys().next().value : "");
      const signature = `${inferredName}::${rows.map(teamName).join("|")}`;
      if (!seenSignatures.has(signature)) {
        seenSignatures.add(signature);
        groups.push({ name: inferredName, rows });
      }
    }

    function walk(node, inheritedLabel = "", parentKey = "", depth = 0) {
      if (!node || depth > 14) return;

      if (Array.isArray(node)) {
        if (looksLikeStandingTable(node)) {
          addTable(node, inheritedLabel);
          return;
        }

        for (const item of node) {
          let nextLabel = inheritedLabel;
          if (item && typeof item === "object" && !Array.isArray(item)) {
            const explicit = explicitGroupName(item);
            if (explicit) {
              nextLabel = explicit;
            } else if (hasStandingsChild(item)) {
              // A named item inside groups[] is a group wrapper, not a team row.
              const possibleName = groupNameFrom(item.name) || groupNameFrom(item.title) || groupNameFrom(item.label);
              if (possibleName && !isStandingRow(item)) nextLabel = possibleName;
            }
          }
          walk(item, nextLabel, parentKey, depth + 1);
        }
        return;
      }

      if (typeof node !== "object") return;

      const ownGroupName = explicitGroupName(node);
      const currentLabel = ownGroupName || inheritedLabel;

      for (const [key, child] of Object.entries(node)) {
        if (!child || typeof child !== "object") continue;

        let childLabel = currentLabel;
        const isGroupContainer = /^(groups?|pools?)$/i.test(parentKey);

        // Supports responses such as { groups: { "Group A": [...], "Group B": [...] } }.
        if (
          isGroupContainer &&
          !/^\d+$/.test(key) &&
          !/^(standings?|tables?|rows|entries|teams)$/i.test(key) &&
          looksLikeStandingTable(child)
        ) {
          childLabel = key;
        }

        // Supports { groups: [{ name: "Group A", standings: [...] }, ...] }.
        if (/^(group|pool|groups|pools)$/i.test(key)) {
          walk(child, childLabel, key, depth + 1);
        } else {
          walk(child, childLabel, key, depth + 1);
        }
      }
    }

    walk(root);

    // Fallback to the original extractor to preserve existing league standings.
    if (!groups.length) {
      const rows = findRows(root);
      if (rows.length) groups.push({ name: "", rows });
    }

    return groups.filter(group => Array.isArray(group.rows) && group.rows.length);
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
  /* =======================
     COMPÉTITIONS EXISTANTES
     ======================= */

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
  ],

  /* =======================
     NOUVELLES COMPÉTITIONS
     ======================= */

  "english-football-league-championship": [
    { from: 1, to: 2, key: "stage-direct", label: "Promotion directe en Premier League" },
    { from: 3, to: 8, key: "stage-playoff", label: "Play-offs de promotion — Premier League" },
    { from: 22, to: 24, key: "relegation", label: "Relégation en League One" }
  ],

  "italian-serie-b": [
    { from: 1, to: 2, key: "stage-direct", label: "Promotion directe en Serie A" },
    { from: 3, to: 8, key: "stage-playoff", label: "Play-offs de promotion" },
    { from: 16, to: 17, key: "relegation-playoff", label: "Zone conditionnelle de play-out — vérifier l'écart de points" },
    { from: 18, to: 20, key: "relegation", label: "Relégation en Serie C" }
  ],

  "brazilian-serie-a": [
    { from: 1, to: 5, key: "ucl", label: "Copa Libertadores — places via le championnat" },
    { from: 6, to: 12, key: "uel", label: "Zone indicative Copa Sudamericana — selon les coupes et les quotas" },
    { from: 17, to: 20, key: "relegation", label: "Relégation en Série B" }
  ],

  "egyptian-premier-league": [
    { from: 1, to: 6, key: "stage-direct", label: "Groupe championnat — après la phase initiale" },
    { from: 7, to: 30, key: "stage-playoff", label: "Groupe maintien — après la phase initiale" }
  ],

  "saudi-professional-league": [
    { from: 1, to: 3, key: "ucl", label: "AFC Champions League Elite — places de base" },
    { from: 4, to: 5, key: "ucl-playoff", label: "Qualifications AFC Champions League Elite" },
    { from: 6, to: 6, key: "uecl", label: "AFC Champions League Two — selon les quotas" },
    { from: 7, to: 8, key: "uel", label: "Gulf Club Champions League" },
    { from: 16, to: 18, key: "relegation", label: "Relégation" }
  ],

  "portuguese-primera-liga": [
    { from: 1, to: 1, key: "ucl", label: "Champions League — qualification directe" },
    { from: 2, to: 2, key: "ucl-playoff", label: "Champions League — tour préliminaire" },
    { from: 3, to: 4, key: "uecl", label: "Conference League — selon les places UEFA" },
    { from: 16, to: 16, key: "relegation-playoff", label: "Barrage de maintien" },
    { from: 17, to: 18, key: "relegation", label: "Relégation" }
  ],

  "turkish-super-league": [
    { from: 1, to: 2, key: "ucl", label: "Zone Champions League — selon les places UEFA" },
    { from: 3, to: 3, key: "uel", label: "Zone Europa League — selon les places UEFA" },
    { from: 4, to: 4, key: "uecl", label: "Zone Conference League — selon les places UEFA et la Coupe" },
    { from: 16, to: 18, key: "relegation", label: "Relégation" }
  ],

  "belgian-pro-league": [
    { from: 1, to: 1, key: "stage-direct", label: "Champion de Belgique" },
    { from: 2, to: 4, key: "uecl", label: "Places européennes — selon les quotas UEFA et la Coupe" },
    { from: 17, to: 18, key: "relegation", label: "Relégation en Challenger Pro League" }
  ],

  "scottish-premiership": [
    { from: 1, to: 3, key: "stage-direct", label: "Zone européenne — selon les places UEFA et les Coupes" },
    { from: 11, to: 11, key: "relegation-playoff", label: "Barrage de relégation" },
    { from: 12, to: 12, key: "relegation", label: "Relégation" }
  ],

  "argentine-division-1": [
  {
    from: 1,
    to: 8,
    key: "stage-playoff",
    label: "Qualifié pour les play-offs — dans chaque groupe"
  },
  {
    from: 9,
    to: 15,
    key: "eliminated",
    label: "Hors de la zone des play-offs du groupe"
  }
],

/* =========================================================
   COMPÉTITIONS DES SÉLECTIONS NATIONALES
   ========================================================= */

/* COUPE DU MONDE FIFA */
"fifa-world-cup": [
  {
    from: 1,
    to: 2,
    key: "stage-direct",
    label: "Qualifié au tour des 32 équipes"
  },
  {
    from: 3,
    to: 3,
    key: "stage-playoff",
    label: "3e du groupe — dépend du classement des meilleurs 3es"
  },
  {
    from: 4,
    to: 4,
    key: "eliminated",
    label: "Éliminé de la compétition"
  }
],

/* CHAMPIONNAT D'EUROPE DES NATIONS */
"uefa-european-championship": [
  {
    from: 1,
    to: 2,
    key: "stage-direct",
    label: "Qualifié en huitièmes de finale"
  },
  {
    from: 3,
    to: 3,
    key: "stage-playoff",
    label: "3e du groupe — dépend du classement des meilleurs 3es"
  },
  {
    from: 4,
    to: 4,
    key: "eliminated",
    label: "Éliminé de la compétition"
  }
],

/* COUPE D'AFRIQUE DES NATIONS */
"caf-africa-cup-of-nations": [
  {
    from: 1,
    to: 2,
    key: "stage-direct",
    label: "Qualifié en huitièmes de finale"
  },
  {
    from: 3,
    to: 3,
    key: "stage-playoff",
    label: "3e du groupe — dépend du classement des meilleurs 3es"
  },
  {
    from: 4,
    to: 4,
    key: "eliminated",
    label: "Éliminé de la compétition"
  }
],

/* COUPE D'ASIE */
"afc-asian-cup": [
  {
    from: 1,
    to: 2,
    key: "stage-direct",
    label: "Qualifié en huitièmes de finale"
  },
  {
    from: 3,
    to: 3,
    key: "stage-playoff",
    label: "3e du groupe — dépend du classement des meilleurs 3es"
  },
  {
    from: 4,
    to: 4,
    key: "eliminated",
    label: "Éliminé de la compétition"
  }
],

/* COPA AMÉRICA */
"conmebol-copa-america": [
  {
    from: 1,
    to: 2,
    key: "stage-direct",
    label: "Qualifié en quarts de finale"
  },
  {
    from: 3,
    to: 4,
    key: "eliminated",
    label: "Éliminé de la phase de groupes"
  }
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
  const slug = competition?.slug;

  // UEFA Conference League : phase de ligue à 36 équipes
  if (slug === "uefa-europa-conference-league") {
    if (position >= 1 && position <= 8) {
      return {
        key: "stage-direct",
        label: "Zone de qualification directe — positions 1 à 8"
      };
    }

    if (position >= 9 && position <= 24) {
      return {
        key: "stage-playoff",
        label: "Zone de barrages — positions 9 à 24"
      };
    }

    if (position >= 25 && position <= 36) {
      return {
        key: "eliminated",
        label: "Hors des places de qualification — positions 25 à 36"
      };
    }

    return null;
  }

  // Les autres compétitions gardent leurs règles actuelles.
  const providerZone = getProviderQualificationZone(row);

  if (providerZone) return providerZone;

  // Format de la phase de ligue européenne.
  if (
    slug === "uefa-champions-league" ||
    slug === "uefa-europa-league"
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
function renderQualificationLegend(groupsOrRows, competition) {
  const zones = new Map();

  // ندعمو المجموعات المتعددة، وحتى اللائحة القديمة ديال الفرق.
  const groups =
    Array.isArray(groupsOrRows) &&
    groupsOrRows.some(group =>
      group && Array.isArray(group.rows)
    )
      ? groupsOrRows
      : [{
          name: "",
          rows: Array.isArray(groupsOrRows)
            ? groupsOrRows
            : []
        }];

  // الحساب كيرجع يبدأ من المركز 1 فكل مجموعة.
  groups.forEach(group => {
    const rows = Array.isArray(group.rows)
      ? group.rows
      : [];

    rows.forEach((row, index) => {
      const position =
        Number(
          value(
            row,
            ["position", "rank", "place"],
            index + 1
          )
        ) || index + 1;

      const zone = getQualificationZone(
        row,
        competition,
        position
      );

      if (zone && !zones.has(zone.key)) {
        zones.set(zone.key, zone);
      }
    });
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


  
function imageURL(value) {
  if (value && typeof value === "object") {
    for (const key of [
      "url",
      "src",
      "original",
      "large",
      "medium",
      "default"
    ]) {
      const found = imageURL(value[key]);
      if (found) return found;
    }

    return "";
  }

  if (typeof value !== "string") return "";

  const url = value.trim();
  if (!url) return "";

  if (url.startsWith("//")) {
    return "https:" + url;
  }

  if (url.startsWith("/")) {
    return "https://sportscore.com" + url;
  }

  return /^https?:\/\//i.test(url) ? url : "";
}

function findPlayerPhoto(node, depth = 0) {
  if (!node || depth > 8) return "";

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findPlayerPhoto(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof node !== "object") return "";

  const imageKeys = [
    "player_photo_url",
    "playerPhotoUrl",
    "photo_url",
    "photoUrl",
    "headshot",
    "portrait",
    "avatar",
    "profile_image",
    "profileImage",
    "profile_picture",
    "profilePicture",
    "photo",
    "image_url",
    "imageUrl",
    "image",
    "picture",
    "thumbnail",
    "thumb"
  ];

  for (const key of imageKeys) {
    const found = imageURL(node[key]);
    if (found) return found;
  }

  const priorityKeys = [
    "player",
    "person",
    "athlete",
    "profile",
    "data",
    "result",
    "details",
    "entity"
  ];

  for (const key of priorityKeys) {
    const found = findPlayerPhoto(node[key], depth + 1);
    if (found) return found;
  }

  const ignoredKeys = new Set([
    "team",
    "club",
    "country",
    "nationality",
    "league",
    "competition",
    "tournament",
    "logo",
    "crest",
    "flag",
    "badge"
  ]);

  for (const [key, value] of Object.entries(node)) {
    if (ignoredKeys.has(key.toLowerCase())) continue;

    if (value && typeof value === "object") {
      const found = findPlayerPhoto(value, depth + 1);
      if (found) return found;
    }
  }

  return "";
}


function normaliseImageURL(value) {
  if (value && typeof value === "object") {
    value =
      value.url ||
      value.src ||
      value.original ||
      value.large ||
      "";
  }

  if (typeof value !== "string") return "";

  value = value.trim();

  if (value.startsWith("//")) {
    return "https:" + value;
  }

  if (value.startsWith("/")) {
    return "https://sportscore.com" + value;
  }

  return /^https?:\/\//i.test(value) ? value : "";
}

function playerName(row) {
  if (!row) return "Joueur";

  const player =
    row.player && typeof row.player === "object"
      ? row.player
      : row.data?.player || {};

  return (
    player.name ||
    player.player_name ||
    player.full_name ||
    row.player_name ||
    row.name ||
    (typeof row.player === "string" ? row.player : "") ||
    "Joueur"
  );
}


function playerPhoto(row) {
  if (!row || typeof row !== "object") return "";

  const player =
    row.player && typeof row.player === "object"
      ? row.player
      : row.data?.player || {};

  const candidates = [
    player.logo,
    player.photo,
    player.image,
    player.avatar,
    player.headshot,
    player.portrait,
    player.photo_url,
    player.photoUrl,
    player.image_url,
    player.imageUrl,
    player.profile_image,
    player.profile_picture,

    row.player_logo,
    row.player_photo,
    row.player_photo_url,
    row.photo_url,
    row.image_url,
    row.photo,
    row.image
  ];
   const sources = [
  player.logo,
  player.photo_url,
  player.photoUrl,
  player.image_url,
  player.imageUrl,
  player.headshot,
  player.portrait,
  player.avatar,
  player.photo,
  player.image,
  row.photo_url,
  row.image_url,
  row.photo,
  row.image
];

  for (const candidate of candidates) {
    const url = normaliseImageURL(candidate);
    if (url) return url;
  }

  return findPlayerPhoto(row);
}



function playerSlug(row) {
  if (!row || typeof row !== "object") return "";

  const player =
    row.player && typeof row.player === "object"
      ? row.player
      : row.data?.player || {};

  const candidates = [
    player.slug,
    player.player_slug,
    player.playerSlug,
    row.player_slug,
    row.playerSlug,
    row.slug,
    player.url,
    row.player_url,
    row.url,
    row.href,
    row.path
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;

    const url = candidate.trim();
    if (!url) continue;

    const match = url.match(
      /\/football\/player\/([^/?#]+)/
    );

    if (match) return match[1];

    if (
      !url.includes("/") &&
      !url.includes("://") &&
      /^[a-z0-9-]+$/i.test(url)
    ) {
      return url;
    }
  }

  return "";
}

function statValue(row, stat) {
  const player =
    row?.player && typeof row.player === "object"
      ? row.player
      : {};

  const keys =
    stat === "goals"
      ? ["goals", "goal", "total", "value"]
      : ["assists", "assist", "total", "value"];

  for (const source of [row, player]) {
    for (const key of keys) {
      const candidate = source?.[key];

      if (
        candidate !== undefined &&
        candidate !== null &&
        candidate !== "" &&
        Number.isFinite(Number(candidate))
      ) {
        return Number(candidate);
      }
    }
  }

  return 0;
}
   
/* =========================================================
   PLAYER TEAM + MATCHES PLAYED
   ========================================================= */

function playerTeamName(row) {
  if (!row || typeof row !== "object") {
    return "Équipe non renseignée";
  }

  const player =
    row.player && typeof row.player === "object"
      ? row.player
      : row.data?.player || {};

  const sources = [
    row,
    player,
    row.data,
    row.statistics,
    row.stats,
    player.statistics,
    player.stats
  ];

  const keys = [
    "team",
    "team_name",
    "teamName",
    "team_data",
    "teamData",
    "club",
    "club_name",
    "clubName"
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    for (const key of keys) {
      const item = source[key];

      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }

      if (item && typeof item === "object") {
        const name =
          item.name ||
          item.team_name ||
          item.teamName ||
          item.title ||
          item.short_name ||
          item.display_name;

        if (typeof name === "string" && name.trim()) {
          return name.trim();
        }
      }
    }
  }

  return "Équipe non renseignée";
}


function readPlayerNumber(value) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  if (value && typeof value === "object") {
    for (const key of [
      "total",
      "value",
      "count",
      "appearances",
      "played"
    ]) {
      if (value[key] !== undefined) {
        const result = readPlayerNumber(value[key]);

        if (result !== null) {
          return result;
        }
      }
    }
  }

  return null;
}


function playerAppearances(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const player =
    row.player && typeof row.player === "object"
      ? row.player
      : row.data?.player || {};

  const sources = [
    row,
    row.statistics,
    row.stats,
    row.player_statistics,
    row.playerStats,
    player,
    player.statistics,
    player.stats,
    row.data,
    row.data?.player
  ];

  const keys = [
    "appearances",
    "appearance",
    "matches_played",
    "matchesPlayed",
    "played_matches",
    "playedMatches",
    "games_played",
    "gamesPlayed",
    "apps",
    "played",
    "matches"
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    // Statistiques enregistrées directement dans un objet
    if (!Array.isArray(source)) {
      for (const key of keys) {
        if (source[key] === undefined) {
          continue;
        }

        const result = readPlayerNumber(source[key]);

        if (result !== null) {
          return result;
        }
      }
    }

    // Statistiques enregistrées sous forme de liste
    if (Array.isArray(source)) {
      for (const item of source) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const label = [
          item.name,
          item.type,
          item.key,
          item.label,
          item.stat
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .replace(/[_-]+/g, " ");

        if (
          /appearance|matches played|played matches|games played/.test(label)
        ) {
          const result = readPlayerNumber(item);

          if (result !== null) {
            return result;
          }
        }
      }
    }
  }

  return null;
}


/* Cache pour éviter de répéter les recherches */
const playerSearchCache = new Map();
const playerProfileCache = new Map();

function normalisePlayerName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findSlugInSearch(data, targetName, inPlayers = false, depth = 0) {
  if (!data || depth > 7) return "";

  if (Array.isArray(data)) {
    for (const item of data) {
      const slug = findSlugInSearch(
        item,
        targetName,
        inPlayers,
        depth + 1
      );

      if (slug) return slug;
    }

    return "";
  }

  if (typeof data !== "object") return "";

  const type = String(
    data.type ||
    data.entity_type ||
    data.kind ||
    data.category ||
    ""
  ).toLowerCase();

  const isPlayer =
    inPlayers ||
    type === "player" ||
    type === "football player" ||
    type === "athlete";

  const name =
    data.name ||
    data.player_name ||
    data.full_name ||
    "";

  const slug = playerSlug(data);

  if (
    isPlayer &&
    slug &&
    normalisePlayerName(name) === targetName
  ) {
    return slug;
  }

  for (const [key, value] of Object.entries(data)) {
    const childContainsPlayers =
      inPlayers || /^(players|player|athletes)$/i.test(key);

    const found = findSlugInSearch(
      value,
      targetName,
      childContainsPlayers,
      depth + 1
    );

    if (found) return found;
  }

  return "";
}

async function findPlayerProfileSlug(name) {
  const targetName = normalisePlayerName(name);

  if (!targetName) return "";

  if (playerSearchCache.has(targetName)) {
    return playerSearchCache.get(targetName);
  }

  const request = (async () => {
    try {
      const data = await fetchJSON(
        `${API}/v1/search/?sport=football&q=${encodeURIComponent(name)}&limit=8&src=${SRC}`
      );

      return findSlugInSearch(data, targetName);
    } catch {
      return "";
    }
  })();

  playerSearchCache.set(targetName, request);
  return request;
}


function extractProfilePhoto(data) {
  if (!data || typeof data !== "object") return "";

  const nestedPlayers = [
    data.player,
    data.data?.player,
    data.result?.player,
    data.player_data
  ];

  const possiblePlayers = [
    data.data,
    data.result,
    data
  ];

  const keys = [
    "logo",
    "photo",
    "image",
    "avatar",
    "headshot",
    "portrait",
    "photo_url",
    "photoUrl",
    "image_url",
    "imageUrl",
    "profile_image",
    "profile_picture"
  ];

  for (const player of nestedPlayers) {
    if (!player || typeof player !== "object") continue;

    for (const key of keys) {
      const url = normaliseImageURL(player[key]);
      if (url) return url;
    }
  }

  for (const player of possiblePlayers) {
    if (!player || typeof player !== "object") continue;

    const isPlayer =
      player.name ||
      player.player_name ||
      player.full_name ||
      player.slug;

    if (!isPlayer) continue;

    for (const key of keys) {
      const url = normaliseImageURL(player[key]);
      if (url) return url;
    }
  }

  return "";
}



async function fetchPlayerProfilePhoto(slug) {
  if (!slug) return "";

  if (playerProfileCache.has(slug)) {
    return playerProfileCache.get(slug);
  }

  const request = (async () => {
    try {
      const data = await fetchJSON(
        `${API}/widget/player/?sport=football&slug=${encodeURIComponent(slug)}&src=${SRC}`
      );

      return extractProfilePhoto(data);
    } catch (error) {
      console.warn("SportScore player photo:", error);
      return "";
    }
  })();

  playerProfileCache.set(slug, request);
  return request;
}


/* Source secondaire : TheSportsDB */
const sportsDbPhotoCache = new Map();

async function fetchTheSportsDBPhoto(name) {
  const key = normalisePlayerName(name);

  if (!key) return "";

  if (sportsDbPhotoCache.has(key)) {
    return sportsDbPhotoCache.get(key);
  }

  const request = (async () => {
    try {
      const query = String(name)
        .trim()
        .replace(/\s+/g, "_");

      const data = await fetchJSON(
        `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=${encodeURIComponent(query)}`
      );

      const players = Array.isArray(data?.player)
        ? data.player
        : [];

      const player = players.find(
        item =>
          normalisePlayerName(item?.strPlayer) === key
      );

      if (!player) return "";

      return normaliseImageURL(
        player.strCutout ||
        player.strThumb ||
        player.strRender ||
        ""
      );
    } catch (error) {
      console.warn("TheSportsDB player photo:", error);
      return "";
    }
  })();

  sportsDbPhotoCache.set(key, request);
  return request;
}



function renderPlayers(players, stat, title, icon) {
  const safePlayers = Array.isArray(players) ? players : [];

  const rows = safePlayers
    .slice(0, 5)
    .map((player, index) => {
      const name = playerName(player);
      const photo = playerPhoto(player);
      const slug = playerSlug(player);
      const total = statValue(player, stat);

      const club = playerTeamName(player);
      const appearances = playerAppearances(player);

      const appearancesText =
        appearances === null
          ? "Matchs joués : —"
          : `${appearances} matchs joués`;

      return `
        <div class="ss-player-row">
          <span class="ss-player-rank">
            ${index + 1}
          </span>

          <div
            class="ss-player"
            data-player-name="${escapeHTML(name)}"
            data-player-slug="${escapeHTML(slug)}"
          >
            <img
              class="ss-player-photo"
              ${photo ? `src="${escapeHTML(photo)}"` : ""}
              alt="${escapeHTML(name)}"
              loading="lazy"
              style="display:${photo ? "block" : "none"}"
              onload="
                this.style.display='block';
                this.nextElementSibling.style.display='none';
              "
              onerror="
                this.dataset.photoFailed='1';
                this.style.display='none';
                this.nextElementSibling.style.display='flex';
              "
            >

            <div
              class="ss-player-fallback"
              style="display:${photo ? "none" : "flex"}"
            >👤</div>

            <div class="ss-player-info">
              <strong class="ss-player-name">
                ${escapeHTML(name)}
              </strong>

              <div class="ss-player-meta">
                <span
                  class="ss-player-team"
                  title="${escapeHTML(club)}"
                >
                  🏟️ ${escapeHTML(club)}
                </span>

                <span class="ss-player-appearances">
                  ${escapeHTML(appearancesText)}
                </span>
              </div>
            </div>
          </div>

          <strong class="ss-player-value">
            ${escapeHTML(total)}
          </strong>
        </div>
      `;
    })
    .join("");

  return `
    <div class="ss-player-card ss-player-card--${stat}">
      <div class="ss-player-card-head">
        <div>
          <span class="ss-stat-icon">${icon}</span>
          <strong>${escapeHTML(title)}</strong>
        </div>

        <span>Top 5</span>
      </div>

      ${
        rows ||
        `<div class="ss-no-player-data">
          Données indisponibles.
        </div>`
      }
    </div>
  `;
}

/* Recherche des photos uniquement quand on ouvre une compétition */

async function loadRealPlayerPhotos(card) {
  if (!card) return;

  const holders = Array.from(
    card.querySelectorAll(".ss-player[data-player-name]")
  );

  async function loadOnePhoto(holder) {
    const img = holder.querySelector(".ss-player-photo");

    const fallback = holder.querySelector(
      ".ss-player-fallback"
    );

    if (!img) return;

    if (img.dataset.lookupStarted === "1") return;

    img.dataset.lookupStarted = "1";

    const name = holder.dataset.playerName || "";

    let slug = holder.dataset.playerSlug || "";
    let photo = "";

    /* 1. الصورة الموجودة أصلاً */
    if (img.getAttribute("src")) {
      if (!img.complete) {
        await Promise.race([
          new Promise(resolve => {
            img.addEventListener("load", resolve, {
              once: true
            });

            img.addEventListener("error", resolve, {
              once: true
            });
          }),
          new Promise(resolve => setTimeout(resolve, 1800))
        ]);
      }

      if (img.complete && img.naturalWidth > 0) {
        return;
      }

      img.removeAttribute("src");
      img.style.display = "none";

      if (fallback) {
        fallback.style.display = "flex";
      }
    }

    /* 2. البحث عن بروفايل اللاعب في SportScore */
    if (slug) {
      photo = await fetchPlayerProfilePhoto(slug);
    }

    if (!photo) {
      slug = await findPlayerProfileSlug(name);

      if (slug) {
        holder.dataset.playerSlug = slug;

        photo = await fetchPlayerProfilePhoto(slug);
      }
    }

    /* 3. البحث بالاسم في المصدر الاحتياطي */
    if (!photo) {
      photo = await fetchTheSportsDBPhoto(name);
    }

    if (!photo) {
      if (fallback) {
        fallback.style.display = "flex";
      }

      return;
    }

    img.onload = () => {
      img.style.display = "block";

      if (fallback) {
        fallback.style.display = "none";
      }
    };

    img.onerror = () => {
      img.style.display = "none";

      if (fallback) {
        fallback.style.display = "flex";
      }
    };

    img.src = photo;
  }

  /* 3 joueurs à la fois pour limiter les requêtes */
  for (let i = 0; i < holders.length; i += 3) {
    await Promise.all(
      holders
        .slice(i, i + 3)
        .map(loadOnePhoto)
    );
  }
}



  /* =========================================================
     UNE COMPÉTITION
     ========================================================= */

  async function fetchCompetitionEndpoint(endpoint, competition, extraQuery = "") {
    const slugs = [competition.slug, ...(competition.fallbackSlugs || [])]
      .filter((slug, index, list) => slug && list.indexOf(slug) === index);

    let lastData;
    let lastError;

    for (const slug of slugs) {
      try {
        const data = await fetchJSON(
          `${API}/v1/${endpoint}/?sport=football&slug=${encodeURIComponent(slug)}${extraQuery}&src=${SRC}`
        );

        if (endpoint !== "standings" || findStandingGroups(data).length > 0) {
          return data;
        }

        // Keep the empty response in case every alternate slug is also empty.
        lastData = data;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastData !== undefined) return lastData;
    throw lastError || new Error(`Impossible de charger ${endpoint} pour ${competition.name}`);
  }

/* =========================================================
   BAKHIRAFOOT — CONFERENCE LEAGUE 2026/27
   Calculer le classement à partir des matchs de la phase de ligue
   au lieu du tableau SportScore qui mélange les qualifications.
   ========================================================= */

const CONFERENCE_LEAGUE_DATES = [
  "2026-10-15",
  "2026-10-22",
  "2026-11-05",
  "2026-11-26",
  "2026-12-10",
  "2026-12-17"
];

const CONFERENCE_LEAGUE_TEAMS = [
  { name: "Ajax", aliases: ["AFC Ajax", "Ajax Amsterdam"] },
  { name: "Atalanta", aliases: ["Atalanta BC"] },
  { name: "Aarhus", aliases: ["Aarhus AGF", "AGF Aarhus"] },
  { name: "Bologna", aliases: [] },
  { name: "Borac", aliases: ["Borac Banja Luka"] },
  { name: "Braga", aliases: ["Sporting Braga", "SC Braga"] },
  { name: "Brann", aliases: ["SK Brann"] },
  {
    name: "Brighton",
    aliases: ["Brighton Hove Albion", "Brighton & Hove Albion"]
  },
  { name: "Copenhagen", aliases: ["FC Copenhagen", "FC Kobenhavn", "Kobenhavn"] },
  {
    name: "Crvena Zvezda",
    aliases: ["Red Star Belgrade", "FK Crvena Zvezda"]
  },
  { name: "CSKA Sofia", aliases: ["PFC CSKA Sofia"] },
  {
    name: "Egnatia",
    aliases: ["KF Egnatia"]
  },
  { name: "Freiburg", aliases: ["SC Freiburg"] },
  { name: "Getafe", aliases: ["Getafe CF"] },
  { name: "Gent", aliases: ["KAA Gent"] },
  {
    name: "Hajduk Split",
    aliases: ["HNK Hajduk Split"]
  },
  {
    name: "Hearts",
    aliases: ["Heart of Midlothian", "Heart of Midlothian FC"]
  },
  {
    name: "Iberia Tbilisi",
    aliases: ["FC Iberia 1999 Tbilisi", "FC Iberia 1999", "Iberia 1999"]
  },
  {
    name: "Inter Escaldes",
    aliases: ["Inter Club d'Escaldes", "Inter Club d Escaldes"]
  },
  { name: "Jablonec", aliases: ["FK Jablonec"] },
  {
    name: "Kauno Zalgiris",
    aliases: ["Kauno Žalgiris", "FK Kauno Zalgiris"]
  },
  { name: "Kairat Almaty", aliases: ["FC Kairat Almaty", "Kairat"] },
  { name: "KuPS", aliases: ["KuPS Kuopio"] },
  {
    name: "Lincoln Red Imps",
    aliases: ["Lincoln Red Imps FC", "L. Red Imps"]
  },
  { name: "Lugano", aliases: ["FC Lugano"] },
  { name: "Monaco", aliases: ["AS Monaco"] },
  { name: "Midtjylland", aliases: ["FC Midtjylland"] },
  { name: "Mjallby", aliases: ["Mjällby", "Mjallby AIF", "Mjällby AIF"] },
  {
    name: "Nordsjaelland",
    aliases: ["Nordsjælland", "FC Nordsjaelland"]
  },
  { name: "Pafos", aliases: ["Pafos FC"] },
  { name: "Panathinaikos", aliases: [] },
  { name: "Riga", aliases: ["Riga FC"] },
  {
    name: "Sint-Truidense",
    aliases: ["Sint-Truidense VV", "STVV"]
  },
  { name: "Thun", aliases: ["FC Thun"] },
  { name: "Trabzonspor", aliases: ["Trabzonspor FC"] },
  {
    name: "Twente",
    aliases: ["FC Twente", "FC Twente Enschede"]
  },
  {
    name: "Universitatea Craiova",
    aliases: [
      "CS Universitatea Craiova",
      "U Craiova",
      "U. Craiova"
    ]
  }
];

function normalizeConferenceTeamName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getConferenceFixtureList(data, depth = 0) {
  if (!data || depth > 8) return [];

  if (Array.isArray(data)) {
    const fixtures = data.filter(item =>
      item &&
      typeof item === "object" &&
      (
        ("home" in item && "away" in item) ||
        ("home_team" in item && "away_team" in item)
      )
    );

    if (fixtures.length) return fixtures;

    for (const item of data) {
      const found = getConferenceFixtureList(item, depth + 1);
      if (found.length) return found;
    }

    return [];
  }

  if (typeof data !== "object") return [];

  for (const key of [
    "matches",
    "fixtures",
    "events",
    "results",
    "data",
    "response"
  ]) {
    if (data[key] === undefined) continue;

    const found = getConferenceFixtureList(
      data[key],
      depth + 1
    );

    if (found.length) return found;
  }

  for (const child of Object.values(data)) {
    if (!child || typeof child !== "object") continue;

    const found = getConferenceFixtureList(
      child,
      depth + 1
    );

    if (found.length) return found;
  }

  return [];
}

function getConferenceFixtureTeam(match, side) {
  const raw =
    match?.[side] ??
    match?.[`${side}_team`] ??
    match?.[`${side}Team`] ??
    null;

  const name =
    typeof raw === "string"
      ? raw
      : raw?.name ||
        raw?.team_name ||
        raw?.teamName ||
        raw?.title ||
        match?.[`${side}_name`] ||
        "";

  const logo =
    match?.[`${side}_logo`] ||
    match?.[`${side}Logo`] ||
    (raw && typeof raw === "object"
      ? raw.logo || raw.image || raw.crest || ""
      : "");

  return {
    name: String(name).trim(),
    logo: String(logo || "").trim()
  };
}

function getConferenceFixtureScore(match, side) {
  const candidates = [
    match?.[`${side}_score`],
    match?.[`${side}Score`],
    match?.scores?.[side],
    match?.score?.[side]
  ];

  for (const candidate of candidates) {
    if (
      candidate !== undefined &&
      candidate !== null &&
      candidate !== "" &&
      Number.isFinite(Number(candidate))
    ) {
      return Number(candidate);
    }
  }

  return null;
}

function isConferenceFixtureFinished(match) {
  const status = [
    match?.status,
    match?.status_text,
    match?.status_name,
    match?.state
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(finished|complete|completed|ended|ft|aet|pen|final)\b/.test(
    status
  ) ||
  status.includes("full time") ||
  status.includes("after extra time") ||
  status.includes("after penalties");
}

async function loadConferenceLeaguePhaseStandings() {
  const aliasMap = new Map();

  for (const team of CONFERENCE_LEAGUE_TEAMS) {
    const aliases = [team.name, ...(team.aliases || [])];

    for (const alias of aliases) {
      aliasMap.set(
        normalizeConferenceTeamName(alias),
        team.name
      );
    }
  }

  const rowsByName = new Map();

  for (const team of CONFERENCE_LEAGUE_TEAMS) {
    rowsByName.set(team.name, {
      position: 0,
      team: {
        name: team.name,
        logo: ""
      },
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      away_goals_for: 0,
      away_wins: 0
    });
  }

  const seenMatches = new Set();
  let recognizedFixtures = 0;

  const dailyResults = await Promise.all(
    CONFERENCE_LEAGUE_DATES.map(async date => {
      const url =
        `${API}/v1/fixtures/?sport=football` +
        `&date=${date}` +
        `&competition=uefa-europa-conference-league` +
        `&limit=200` +
        `&src=${SRC}`;

      const data = await fetchJSON(url);

      return getConferenceFixtureList(data);
    })
  );

  for (const fixtures of dailyResults) {
    for (const match of fixtures) {
      const home = getConferenceFixtureTeam(match, "home");
      const away = getConferenceFixtureTeam(match, "away");

      const homeName = aliasMap.get(
        normalizeConferenceTeamName(home.name)
      );

      const awayName = aliasMap.get(
        normalizeConferenceTeamName(away.name)
      );

      // ما ندخلو حتى فريق ماشي من لائحة مرحلة الدوري.
      if (!homeName || !awayName) continue;

      const homeRow = rowsByName.get(homeName);
      const awayRow = rowsByName.get(awayName);

      if (!homeRow || !awayRow) continue;

      recognizedFixtures++;

      if (!homeRow.team.logo && home.logo) {
        homeRow.team.logo = home.logo;
      }

      if (!awayRow.team.logo && away.logo) {
        awayRow.team.logo = away.logo;
      }

      const matchKey = String(
        match.id ||
        match.fixture_id ||
        match.slug ||
        `${homeName}|${awayName}|${match.time || match.date || ""}`
      );

      if (seenMatches.has(matchKey)) continue;
      seenMatches.add(matchKey);

      // المباريات المقبلة ما كتدخلش فالنقاط حتى تسالي.
      if (!isConferenceFixtureFinished(match)) continue;

      const homeGoals = getConferenceFixtureScore(match, "home");
      const awayGoals = getConferenceFixtureScore(match, "away");

      if (homeGoals === null || awayGoals === null) continue;

      homeRow.played++;
      awayRow.played++;

      homeRow.goals_for += homeGoals;
      homeRow.goals_against += awayGoals;

      awayRow.goals_for += awayGoals;
      awayRow.goals_against += homeGoals;

      // الأهداف المسجلة خارج الميدان.
      awayRow.away_goals_for += awayGoals;

      if (homeGoals > awayGoals) {
        homeRow.wins++;
        awayRow.losses++;
        homeRow.points += 3;
      } else if (awayGoals > homeGoals) {
        awayRow.losses++;
        awayRow.wins++;
        awayRow.points += 3;
        awayRow.away_wins++;
      } else {
        homeRow.draws++;
        awayRow.draws++;
        homeRow.points++;
        awayRow.points++;
      }

      homeRow.goal_difference =
        homeRow.goals_for - homeRow.goals_against;

      awayRow.goal_difference =
        awayRow.goals_for - awayRow.goals_against;
    }
  }

  if (!recognizedFixtures) {
    throw new Error(
      "Impossible de récupérer les matchs de la phase de ligue de Conference League."
    );
  }

  const rows = Array.from(rowsByName.values());

  rows.sort((a, b) =>
    b.points - a.points ||
    b.goal_difference - a.goal_difference ||
    b.goals_for - a.goals_for ||
    b.away_goals_for - a.away_goals_for ||
    b.wins - a.wins ||
    b.away_wins - a.away_wins ||
    a.team.name.localeCompare(b.team.name, "fr")
  );

  const hasPlayedMatches = rows.some(row => row.played > 0);

  rows.forEach((row, index) => {
    row.position = index + 1;

    // قبل أول جولة، ما نبيّـنوش مناطق التأهل اعتماداً
    // على ترتيب أبجدي مؤقت.
    row._bfDisableQualificationZone = !hasPlayedMatches;
  });

  return [{
    name: "Phase de ligue — 2026/27",
    rows
  }];
}
   function sortTopPlayersByStat(data, stat) {
  const players = findPlayers(data);

  return [...players].sort((a, b) => {
    return statValue(b, stat) - statValue(a, stat);
  }).slice(0, 5);
}
   /* =========================================================
   BAKHIRAFOOT — TABLEAU DES ÉLIMINATOIRES ESPN
   1/8 DE FINALE → FINALE
   ========================================================= */

const ESPN_KNOCKOUT_CODES = {
  "UEFA Champions League": "uefa.champions",
  "UEFA Europa League": "uefa.europa",
  "UEFA Conference League": "uefa.europa.conf",
  "FIFA World Cup": "fifa.world",
  "UEFA Euro": "uefa.euro",
  "CAF Africa Cup of Nations": "caf.nations",
  "AFC Asian Cup": "afc.asian.cup",
  "Copa América": "conmebol.america",
  "UEFA Nations League": "uefa.nations"
};

const KNOCKOUT_STAGE_ORDER = [
  { key: "Rd of 32", title: "1/16 de finale — 32 équipes" },
  { key: "Rd of 16", title: "1/8 de finale" },
  { key: "Quarterfinals", title: "Quarts de finale" },
  { key: "Semifinals", title: "Demi-finales" },
  { key: "Final", title: "Finale" }
];
const knockoutEventsCache = new Map();

function knockoutStageFromText(value) {
  const text = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ");
if (
  /round of 32|rd of 32|last 32|1\/16 de finale|seizieme[s]? de finale/.test(text)
) {
  return "Rd of 32";
}
  if (
    /round of 16|rd of 16|last 16|huitiemes de finale|octavos de final|ottavi di finale/.test(text)
  ) {
    return "Rd of 16";
  }

  if (
    /quarter\s*final|quarts? de finale|cuartos de final|quarti di finale/.test(text)
  ) {
    return "Quarterfinals";
  }

  if (
    /semi\s*final|demi\s*final|semifinali/.test(text)
  ) {
    return "Semifinals";
  }

  if (
    /\bfinals?\b/.test(text) &&
    !/quarter|semi|playoff/.test(text)
  ) {
    return "Final";
  }

  return "";
}

function knockoutEventStage(event) {
  const match = event?.competitions?.[0] || {};

  return knockoutStageFromText([
    event?.season?.slug,
    match?.series?.title,
    event?.altGameNote,
    ...(match?.notes || []).map(note => note?.text)
  ].filter(Boolean).join(" "));
}

async function fetchKnockoutEvents(competitionName) {
  if (knockoutEventsCache.has(competitionName)) {
    return knockoutEventsCache.get(competitionName);
  }

  const code = ESPN_KNOCKOUT_CODES[competitionName];

  if (!code) return [];

  const request = (async () => {
    const endpoint =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard`;

    const seasonData = await fetchJSON(endpoint);
    const league = seasonData?.leagues?.[0];

    if (!league) return [];

   const rawCalendar = league.calendar || [];

const calendarEntries = Array.isArray(rawCalendar)
  ? rawCalendar.flatMap(item => {
      if (!item || typeof item !== "object") return [];

      const nestedEntries = Array.isArray(item.entries)
        ? item.entries
        : [];

      const directEntry =
        item.label && (item.startDate || item.endDate)
          ? [item]
          : [];

      return [...directEntry, ...nestedEntries];
    })
  : Array.isArray(rawCalendar.entries)
    ? rawCalendar.entries
    : [];

const knockoutEntries = calendarEntries.filter(entry =>
  knockoutStageFromText(entry.label)
);

console.log(
  "[BakhiraFoot] Calendrier ESPN:",
  calendarEntries.length,
  "phases éliminatoires:",
  knockoutEntries.map(entry => entry.label)
);
    const dateRanges = knockoutEntries.length
      ? knockoutEntries
      : [{
          startDate: league.calendarStartDate,
          endDate: league.calendarEndDate
        }];

    const months = new Set();

    dateRanges.forEach(entry => {
      const start = new Date(entry.startDate || "");
      const end = new Date(entry.endDate || "");

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        return;
      }

      const cursor = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        1
      ));

      const lastMonth = new Date(Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        1
      ));

      while (cursor <= lastMonth) {
        const month =
          String(cursor.getUTCFullYear()) +
          String(cursor.getUTCMonth() + 1).padStart(2, "0");

        months.add(month);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    });

    const responses = await Promise.all(
      [...months].map(async month => {
        try {
          return await fetchJSON(`${endpoint}?dates=${month}`);
        } catch (error) {
          console.warn(
            "BakhiraFoot knockout month:",
            competitionName,
            month,
            error
          );
          return null;
        }
      })
    );

    const allEvents = responses.flatMap(data =>
      Array.isArray(data?.events) ? data.events : []
    );

    const seen = new Set();

    return allEvents.filter(event => {
      const stage = knockoutEventStage(event);

      if (!stage || !event.id || seen.has(event.id)) {
        return false;
      }

      seen.add(event.id);
      return true;
    });
  })();

  knockoutEventsCache.set(competitionName, request);

  try {
    return await request;
  } catch (error) {
    knockoutEventsCache.delete(competitionName);
    throw error;
  }
}

function ensureKnockoutStyles() {
  if (document.getElementById("bf-knockout-styles")) return;

  const style = document.createElement("style");
  style.id = "bf-knockout-styles";

  style.textContent = `
  .bf-ko-section {
    --bf-ko-text: #172033;
    --bf-ko-muted: #718096;
    --bf-ko-panel: #f3f6fb;
    --bf-ko-card: #ffffff;
    --bf-ko-border: #e2e8f0;
    --bf-ko-accent: #0d9b78;

    position: relative;
    margin-top: 28px;
    padding: 24px;
    overflow: hidden;
    color: var(--bf-ko-text);
    background:
      radial-gradient(ellipse at top right,
        rgba(13, 155, 120, .09), transparent 45%),
      var(--bf-ko-card);
    border: 1px solid var(--bf-ko-border);
    border-radius: 20px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, .045);
  }

  .bf-ko-section::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 4px;
    background: linear-gradient(
      90deg, #10b981, #0d9488, #3b82f6, #8b5cf6
    );
  }

  .bf-ko-section-head {
    margin: 0 0 22px;
    padding-bottom: 18px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    border-bottom: 1px solid var(--bf-ko-border);
  }

  .bf-ko-section-head h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    color: var(--bf-ko-text);
    font-size: clamp(19px, 2vw, 25px);
    font-weight: 850;
    letter-spacing: -.5px;
  }

  .bf-ko-section-head h3::before {
    content: "🏆";
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 13px;
    background: rgba(16, 185, 129, .12);
    font-size: 20px;
  }

  .bf-ko-section-head p {
    margin: 0;
    color: var(--bf-ko-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .bf-ko-board {
    display: grid;
    grid-template-columns: repeat(4, minmax(225px, 1fr));
    align-items: stretch;
    gap: 16px;
    overflow-x: auto;
    padding: 2px 2px 14px;
    scrollbar-width: thin;
    scrollbar-color: #94a3b8 transparent;
  }

  .bf-ko-board::-webkit-scrollbar {
    height: 6px;
  }

  .bf-ko-board::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 20px;
  }

  .bf-ko-stage {
    --bf-ko-stage-accent: #10b981;

    position: relative;
    min-width: 0;
    padding: 15px;
    background: var(--bf-ko-panel);
    border: 1px solid var(--bf-ko-border);
    border-radius: 17px;
    transition: border-color .2s ease, box-shadow .2s ease;
  }

  .bf-ko-stage:nth-child(2) {
    --bf-ko-stage-accent: #3b82f6;
  }

  .bf-ko-stage:nth-child(3) {
    --bf-ko-stage-accent: #8b5cf6;
  }

  .bf-ko-stage:nth-child(4) {
    --bf-ko-stage-accent: #d49b22;
  }

  .bf-ko-stage:hover {
    border-color: var(--bf-ko-stage-accent);
    box-shadow: 0 6px 22px rgba(15, 23, 42, .055);
  }

  .bf-ko-stage-title {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 15px;
    padding-bottom: 13px;
    border-bottom: 1px solid var(--bf-ko-border);
    color: var(--bf-ko-text);
    font-size: 14px;
    font-weight: 850;
  }

  .bf-ko-stage-title::before {
    content: "";
    width: 4px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 5px;
    background: var(--bf-ko-stage-accent);
  }

  .bf-ko-match {
    position: relative;
    margin-bottom: 12px;
    padding: 13px;
    overflow: hidden;
    background: var(--bf-ko-card);
    border: 1px solid var(--bf-ko-border);
    border-radius: 14px;
    box-shadow: 0 2px 5px rgba(15, 23, 42, .025);
    transition: transform .2s ease, box-shadow .2s ease,
      border-color .2s ease;
  }

  .bf-ko-match:last-child {
    margin-bottom: 0;
  }

  .bf-ko-match:hover {
    transform: translateY(-2px);
    border-color: rgba(13, 155, 120, .4);
    box-shadow: 0 8px 20px rgba(15, 23, 42, .07);
  }

  .bf-ko-match-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 23px;
    margin-bottom: 10px;
    color: var(--bf-ko-muted);
    font-size: 11px;
    font-weight: 650;
  }

  .bf-ko-match-meta span:last-child:not(:empty) {
    padding: 4px 7px;
    color: var(--bf-ko-stage-accent, #0d9b78);
    background: var(--bf-ko-panel);
    border: 1px solid var(--bf-ko-border);
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
  }

  .bf-ko-team {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    min-height: 42px;
    padding: 5px 7px;
    border-radius: 9px;
    transition: background .2s ease;
  }

  .bf-ko-team + .bf-ko-team {
    margin-top: 3px;
  }

  .bf-ko-team:hover {
    background: var(--bf-ko-panel);
  }

  .bf-ko-team img {
    display: block;
    width: 27px;
    height: 27px;
    padding: 2px;
    object-fit: contain;
  }

  .bf-ko-team strong {
    min-width: 0;
    color: var(--bf-ko-text);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .bf-ko-team b {
    min-width: 25px;
    color: var(--bf-ko-text);
    font-size: 17px;
    font-weight: 900;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .bf-ko-match-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 9px;
    padding-top: 10px;
    color: var(--bf-ko-muted);
    border-top: 1px solid var(--bf-ko-border);
    font-size: 10px;
  }

  .bf-ko-match-status span:first-child {
    font-weight: 750;
  }

  .bf-ko-match-status span:last-child {
    padding: 4px 7px;
    color: var(--bf-ko-accent);
    background: rgba(13, 155, 120, .09);
    border-radius: 6px;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: .25px;
  }

  .bf-ko-loading,
  .bf-ko-empty {
    padding: 15px;
    color: var(--bf-ko-muted);
    background: var(--bf-ko-panel);
    border: 1px dashed var(--bf-ko-border);
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.7;
  }

  /* DARK MODE */
  body.dark .bf-ko-section,
  body.dark-mode .bf-ko-section,
  html.dark .bf-ko-section,
  html[data-theme="dark"] .bf-ko-section,
  body[data-theme="dark"] .bf-ko-section {
    --bf-ko-text: #edf2f7;
    --bf-ko-muted: #a0aec0;
    --bf-ko-panel: #171f2d;
    --bf-ko-card: #111827;
    --bf-ko-border: #2d3748;
    --bf-ko-accent: #34d399;

    background:
      radial-gradient(ellipse at top right,
        rgba(16, 185, 129, .09), transparent 45%),
      #111827;
    box-shadow: 0 10px 35px rgba(0, 0, 0, .16);
  }

  @media (max-width: 1100px) {
    .bf-ko-board {
      grid-template-columns: repeat(4, 250px);
    }
  }

  @media (max-width: 600px) {
    .bf-ko-section {
      margin-top: 20px;
      padding: 15px 12px;
      border-radius: 15px;
    }

    .bf-ko-section-head {
      margin-bottom: 15px;
      padding-bottom: 13px;
    }

    .bf-ko-section-head h3::before {
      width: 34px;
      height: 34px;
      font-size: 17px;
    }

    .bf-ko-board {
      grid-template-columns: repeat(4, 238px);
      gap: 11px;
    }

    .bf-ko-stage {
      padding: 11px;
      border-radius: 13px;
    }

    .bf-ko-match {
      padding: 10px;
      border-radius: 11px;
    }

    .bf-ko-team {
      min-height: 39px;
      grid-template-columns: 26px minmax(0, 1fr) auto;
      gap: 7px;
    }

    .bf-ko-team img {
      width: 24px;
      height: 24px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bf-ko-match,
    .bf-ko-stage,
    .bf-ko-team {
      transition: none;
    }
  }
`;


  document.head.appendChild(style);
}

function renderKnockoutBracket(events, competitionName) {
  const stages =
    competitionName === "FIFA World Cup"
      ? KNOCKOUT_STAGE_ORDER
      : KNOCKOUT_STAGE_ORDER.filter(
          stage => stage.key !== "Rd of 32"
        );

  const stagesHTML = stages.map(stage => {
    const matches = events
      .filter(event => knockoutEventStage(event) === stage.key)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const matchesHTML = matches.map(event => {
      const match = event.competitions?.[0] || {};
      const competitors = match.competitors || [];

      const home =
        competitors.find(team => team.homeAway === "home") ||
        competitors[0];

      const away =
        competitors.find(team => team.homeAway === "away") ||
        competitors[1];

      if (!home || !away) return "";

      const status = match.status || event.status || {};
      const statusType = status.type || {};
      const state = statusType.state || "";

      const hasScore =
        state === "post" ||
        state === "in" ||
        statusType.completed === true;

      const homeScore = hasScore
        ? (home.score ?? "–")
        : "–";

      const awayScore = hasScore
        ? (away.score ?? "–")
        : "–";

      const date = event.date
        ? new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "short"
          }).format(new Date(event.date))
        : "";

      const legValue = Number(match.leg?.value);

      const legLabel =
        legValue === 1 ? "Aller" :
        legValue === 2 ? "Retour" :
        "";

      const statusLabel =
        statusType.detail ||
        statusType.shortDetail ||
        statusType.description ||
        (state === "in" ? "En direct" : "Match");

      function teamHTML(team, score) {
        const name =
          team.team?.displayName ||
          team.team?.name ||
          "Équipe";

        const logo = team.team?.logo || "";

        return `
          <div class="bf-ko-team">
            ${
              logo
                ? `<img src="${escapeHTML(logo)}"
                        alt="${escapeHTML(name)}"
                        loading="lazy"
                        onerror="this.style.display='none'">`
                : `<span>⚽</span>`
            }
            <strong>${escapeHTML(name)}</strong>
            <b>${escapeHTML(score)}</b>
          </div>
        `;
      }

      return `
        <article class="bf-ko-match">
          <div class="bf-ko-match-meta">
            <span>${escapeHTML(date)}</span>
            <span>${escapeHTML(legLabel)}</span>
          </div>

          ${teamHTML(home, homeScore)}
          ${teamHTML(away, awayScore)}

          <div class="bf-ko-match-status">
            <span>${escapeHTML(statusLabel)}</span>
            <span>BakhiraFoot</span>
          </div>
        </article>
      `;
    }).join("");

    return `
      <section class="bf-ko-stage">
        <h4 class="bf-ko-stage-title">
          ${escapeHTML(stage.title)}
        </h4>
        ${
          matchesHTML ||
          `<p class="bf-ko-empty">Aucun match disponible pour cette phase.</p>`
        }
      </section>
    `;
  }).join("");

  return `<div class="bf-ko-board">${stagesHTML}</div>`;
}

async function loadKnockoutBracket(competitionName, container) {
  ensureKnockoutStyles();

  container.innerHTML =
    `<p class="bf-ko-loading">Chargement des matchs éliminatoires...</p>`;

  try {
    const events = await fetchKnockoutEvents(competitionName);

    if (!events.length) {
      container.innerHTML = `
        <p class="bf-ko-empty">
          Les matchs éliminatoires ne sont pas encore disponibles
          pour cette saison.
        </p>
      `;
      return;
    }

    container.innerHTML = renderKnockoutBracket(
  events,
  competitionName
);
  } catch (error) {
    console.error(
      "BakhiraFoot — knockout bracket:",
      competitionName,
      error
    );

    container.innerHTML = `
      <p class="bf-ko-empty">
        Impossible de charger le tableau éliminatoire pour le moment.
      </p>
    `;
  }
}
   /* =========================================================
   BAKHIRAFOOT — AFCON MAROC 2025
   GROUPES DES PHASES FINALES
   ========================================================= */

const AFCON_FINAL_GROUPS_2025 = [
  {
    name: "Groupe A",
    teams: [
      { name: "Maroc", aliases: ["Morocco"] },
      { name: "Mali", aliases: [] },
      { name: "Zambie", aliases: ["Zambia"] },
      { name: "Comores", aliases: ["Comoros"] }
    ]
  },
  {
    name: "Groupe B",
    teams: [
      { name: "Égypte", aliases: ["Egypt"] },
      {
        name: "Afrique du Sud",
        aliases: ["South Africa"]
      },
      { name: "Angola", aliases: [] },
      { name: "Zimbabwe", aliases: [] }
    ]
  },
  {
    name: "Groupe C",
    teams: [
      { name: "Nigeria", aliases: [] },
      { name: "Tunisie", aliases: ["Tunisia"] },
      { name: "Ouganda", aliases: ["Uganda"] },
      { name: "Tanzanie", aliases: ["Tanzania"] }
    ]
  },
  {
    name: "Groupe D",
    teams: [
      { name: "Sénégal", aliases: ["Senegal"] },
      {
        name: "RD Congo",
        aliases: [
          "DR Congo",
          "Congo DR",
          "Democratic Republic of the Congo"
        ]
      },
      { name: "Bénin", aliases: ["Benin"] },
      { name: "Botswana", aliases: [] }
    ]
  },
  {
    name: "Groupe E",
    teams: [
      { name: "Algérie", aliases: ["Algeria"] },
      { name: "Burkina Faso", aliases: [] },
      {
        name: "Guinée équatoriale",
        aliases: ["Equatorial Guinea"]
      },
      { name: "Soudan", aliases: ["Sudan"] }
    ]
  },
  {
    name: "Groupe F",
    teams: [
      {
        name: "Côte d'Ivoire",
        aliases: ["Ivory Coast", "Cote d'Ivoire"]
      },
      { name: "Cameroun", aliases: ["Cameroon"] },
      { name: "Gabon", aliases: [] },
      { name: "Mozambique", aliases: [] }
    ]
  }
];

function normaliseAfconTeamName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function loadAfconFinalStandings() {
  const endpoint =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/caf.nations/scoreboard";

  // نهائيات CAN المغرب 2025، ماشي تصفيات CAN 2027.
  const months = ["202512", "202601"];

  const responses = await Promise.all(
    months.map(month =>
      fetchJSON(`${endpoint}?dates=${month}`)
    )
  );

  const uniqueEvents = new Map();

  responses.forEach(data => {
    (Array.isArray(data?.events) ? data.events : [])
      .forEach(event => {
        if (event?.id) {
          uniqueEvents.set(event.id, event);
        }
      });
  });

  const groups = AFCON_FINAL_GROUPS_2025.map(
    definition => ({
      name: definition.name,
      rows: definition.teams.map(team => ({
        position: 0,
        team: {
          name: team.name,
          logo: ""
        },
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0
      }))
    })
  );

  const teamLookup = new Map();

  groups.forEach((group, groupIndex) => {
    const groupDefinition =
      AFCON_FINAL_GROUPS_2025[groupIndex];

    group.rows.forEach((row, teamIndex) => {
      const definition = groupDefinition.teams[teamIndex];

      [definition.name, ...(definition.aliases || [])]
        .forEach(alias => {
          teamLookup.set(
            normaliseAfconTeamName(alias),
            { group, row }
          );
        });
    });
  });

  let groupMatchesCount = 0;

  for (const event of uniqueEvents.values()) {
    const match = event?.competitions?.[0];

    if (!match) continue;

    const statusType =
      match.status?.type ||
      event.status?.type ||
      {};

    // ما نحسبوش المباريات اللي ما سالاوش.
    if (
      statusType.completed !== true &&
      statusType.state !== "post"
    ) {
      continue;
    }

    const competitors = match.competitors || [];

    const home =
      competitors.find(team => team.homeAway === "home") ||
      competitors[0];

    const away =
      competitors.find(team => team.homeAway === "away") ||
      competitors[1];

    if (!home || !away) continue;

    const homeName =
      home.team?.displayName ||
      home.team?.name ||
      home.team?.shortDisplayName ||
      "";

    const awayName =
      away.team?.displayName ||
      away.team?.name ||
      away.team?.shortDisplayName ||
      "";

    const homeInfo = teamLookup.get(
      normaliseAfconTeamName(homeName)
    );

    const awayInfo = teamLookup.get(
      normaliseAfconTeamName(awayName)
    );

    // كنقبلو غير الماتشات بين جوج فرق من نفس المجموعة.
    // هكا ماتشات الإقصائيات والتصفيات ما كيدخلوش فالترتيب.
    if (
      !homeInfo ||
      !awayInfo ||
      homeInfo.group !== awayInfo.group
    ) {
      continue;
    }

    if (
      home.score === null ||
      home.score === undefined ||
      away.score === null ||
      away.score === undefined ||
      String(home.score).trim() === "" ||
      String(away.score).trim() === ""
    ) {
      continue;
    }

    const homeScore = Number(home.score);
    const awayScore = Number(away.score);

    if (
      !Number.isFinite(homeScore) ||
      !Number.isFinite(awayScore)
    ) {
      continue;
    }

    const homeRow = homeInfo.row;
    const awayRow = awayInfo.row;

    const homeLogo =
      home.team?.logo ||
      home.team?.logos?.[0]?.href ||
      "";

    const awayLogo =
      away.team?.logo ||
      away.team?.logos?.[0]?.href ||
      "";

    if (!homeRow.team.logo && homeLogo) {
      homeRow.team.logo = homeLogo;
    }

    if (!awayRow.team.logo && awayLogo) {
      awayRow.team.logo = awayLogo;
    }

    homeRow.played++;
    awayRow.played++;

    homeRow.goals_for += homeScore;
    homeRow.goals_against += awayScore;

    awayRow.goals_for += awayScore;
    awayRow.goals_against += homeScore;

    if (homeScore > awayScore) {
      homeRow.wins++;
      awayRow.losses++;

      homeRow.points += 3;
    } else if (awayScore > homeScore) {
      awayRow.wins++;
      homeRow.losses++;

      awayRow.points += 3;
    } else {
      homeRow.draws++;
      awayRow.draws++;

      homeRow.points++;
      awayRow.points++;
    }

    groupMatchesCount++;
  }

  if (!groupMatchesCount) {
    throw new Error(
      "Impossible de récupérer les matchs de la phase finale AFCON 2025."
    );
  }

  groups.forEach(group => {
    group.rows.forEach(row => {
      row.goal_difference =
        row.goals_for - row.goals_against;
    });

    group.rows.sort((a, b) =>
      b.points - a.points ||
      b.goal_difference - a.goal_difference ||
      b.goals_for - a.goals_for ||
      b.wins - a.wins
    );

    group.rows.forEach((row, index) => {
      row.position = index + 1;
    });
  });

  console.log(
    "[BakhiraFoot] AFCON 2025:",
    groupMatchesCount,
    "matchs de groupes récupérés."
  );

  return groups;
}

/* =========================================================
   BAKHIRAFOOT — CAN MAROC 2025
   BUTEURS + PASSES DÉCISIVES
   Source: ESPN — saison 2025
   ========================================================= */

let afcon2025LeadersPayloadPromise = null;
const afcon2025PlayerCache = new Map();
const afcon2025ReferenceCache = new Map();

function afcon2025GetCategories(payload) {
  const found = [];

  function walk(node, depth = 0) {
    if (!node || typeof node !== "object" || depth > 8) return;

    if (Array.isArray(node.categories) && node.categories.length) {
      found.push(...node.categories);
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(item => walk(item, depth + 1));
      return;
    }

    Object.values(node).forEach(value => walk(value, depth + 1));
  }

  walk(payload);

  return [...new Set(found)];
}

async function afcon2025GetLeadersPayload() {
  if (afcon2025LeadersPayloadPromise) {
    return afcon2025LeadersPayloadPromise;
  }

  const urls = [
    "https://sports.core.api.espn.com/v2/sports/soccer/leagues/caf.nations/seasons/2025/leaders?limit=100&lang=en&region=us",
    "https://sports.core.api.espn.com/v2/sports/soccer/leagues/caf.nations/seasons/2025/types/2/leaders?limit=100&lang=en&region=us",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/caf.nations/leaders?season=2025&lang=en&region=us"
  ];

  const request = (async () => {
    let lastError;

    for (const url of urls) {
      try {
        const payload = await fetchJSON(url);

        if (afcon2025GetCategories(payload).length) {
          return payload;
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(
      "ESPN ne renvoie pas les statistiques CAN 2025."
    );
  })();

  afcon2025LeadersPayloadPromise = request;

  try {
    return await request;
  } catch (error) {
    afcon2025LeadersPayloadPromise = null;
    throw error;
  }
}

async function afcon2025ResolveReference(item) {
  if (!item || typeof item !== "object") return item || {};

  const ref = item.$ref;

  // L'objet contient déjà les informations du joueur ou de l'équipe.
  if (!ref || item.displayName || item.fullName || item.name) {
    return item;
  }

  let url = String(ref)
    .replace(/^http:\/\//i, "https://")
    .replace("sports.core.api.espn.pvt", "sports.core.api.espn.com");

  if (!afcon2025ReferenceCache.has(url)) {
    const request = fetchJSON(url).catch(error => {
      afcon2025ReferenceCache.delete(url);
      throw error;
    });

    afcon2025ReferenceCache.set(url, request);
  }

  return afcon2025ReferenceCache.get(url);
}

function afcon2025CategoryMatches(category, stat) {
  const label = [
    category?.name,
    category?.displayName,
    category?.shortDisplayName,
    category?.abbreviation
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (stat === "goals") {
    return /\b(goals?|scoring|buts?)\b/.test(label);
  }

  return /\b(assists?|passes decisives?)\b/.test(label);
}

async function loadAfcon2025PlayerLeaders(stat) {
  if (afcon2025PlayerCache.has(stat)) {
    return afcon2025PlayerCache.get(stat);
  }

  const request = (async () => {
    const payload = await afcon2025GetLeadersPayload();
    const categories = afcon2025GetCategories(payload);

    const category = categories.find(item =>
      afcon2025CategoryMatches(item, stat)
    );

    if (!category) {
      throw new Error(
        `Catégorie ESPN introuvable : ${stat} — CAN 2025`
      );
    }

    const rows = Array.isArray(category.leaders)
      ? category.leaders
      : [];

    if (!rows.length) {
      throw new Error(
        `Aucun joueur disponible pour ${stat} — CAN 2025`
      );
    }

const normalizedRows = await Promise.all(
  rows.slice(0, 5).map(async row => {
        try {
          const athlete = await afcon2025ResolveReference(
            row.athlete || row.player
          );

          const teamSource = row.team || athlete.team || {};
          const team = await afcon2025ResolveReference(teamSource);

          const rawValue = row.value ?? row.displayValue ?? 0;
          const total = Number(rawValue);

          const name =
            athlete.displayName ||
            athlete.fullName ||
            athlete.name ||
            athlete.shortName ||
            "";

          if (!name || !Number.isFinite(total)) {
            return null;
          }

          const headshot = athlete.headshot || {};
          const photo =
            headshot.href ||
            headshot.url ||
            athlete.photo ||
            athlete.image ||
            "";

          const teamName =
            team.displayName ||
            team.name ||
            team.shortDisplayName ||
            (typeof teamSource === "string" ? teamSource : "") ||
            "Équipe non renseignée";

          return {
            player: {
              name,
              full_name: name,
              headshot: photo,
              photo,
              url: athlete.links?.[0]?.href || ""
            },
            team: teamName,
            goals: stat === "goals" ? total : 0,
            assists: stat === "assists" ? total : 0
          };
        } catch (error) {
          console.warn(
            "BakhiraFoot — joueur CAN 2025:",
            error
          );
          return null;
        }
      })
    );

    const result = normalizedRows
      .filter(Boolean)
      .sort((a, b) => b[stat] - a[stat])
      .slice(0, 10);

    if (!result.length) {
      throw new Error(
        `Impossible de lire les joueurs CAN 2025 : ${stat}`
      );
    }

    return result;
  })();

  afcon2025PlayerCache.set(stat, request);

  try {
    return await request;
  } catch (error) {
    afcon2025PlayerCache.delete(stat);
    console.error("BakhiraFoot — CAN 2025:", error);
    throw error;
  }
}
  async function loadAfcon2025LeadersSafe(stat) {
  let timer;

  try {
    const result = await Promise.race([
      loadAfcon2025PlayerLeaders(stat),

      new Promise(resolve => {
        timer = setTimeout(() => resolve([]), 7000);
      })
    ]);

    return Array.isArray(result) ? result : [];

  } catch (error) {
    console.warn(
      "BakhiraFoot — Statistiques CAN 2025 indisponibles:",
      stat,
      error
    );

    return [];

  } finally {
    clearTimeout(timer);
  }
}       
async function loadCompetition(competition) {
  const isAfcon2025 =
    competition?.slug === "caf-africa-cup-of-nations";

  const [
    standingsData,
    goalsData,
    assistsData,
    knockoutData
  ] = await Promise.allSettled([
    fetchCompetitionEndpoint("standings", competition),

    isAfcon2025
      ? loadAfcon2025LeadersSafe("goals")
      : fetchCompetitionEndpoint(
          "topscorers",
          competition,
          "&limit=5&stat=goals"
        ),

    isAfcon2025
      ? loadAfcon2025LeadersSafe("assists")
      : fetchCompetitionEndpoint(
          "topscorers",
          competition,
          "&limit=5&stat=assists"
        ),

    fetchCompetitionKnockoutRounds(competition)
  ]);

  // خلي باقي الدالة كيف ما هو ابتداءً من هنا:
  const standingGroups =
  standingsData.status === "fulfilled"
    ? (
        isConferenceLeague || isAfconFinals
          ? standingsData.value
          : findStandingGroups(standingsData.value)
      )
    : [];

  const standings = standingGroups.flatMap(
    group => group.rows
  );

 const goals =
  goalsData.status === "fulfilled"
    ? sortTopPlayersByStat(goalsData.value, "goals")
    : [];

const assists =
  assistsData.status === "fulfilled"
    ? sortTopPlayersByStat(assistsData.value, "assists")
    : [];

  return {
    competition,
    standings,
    standingGroups,
    goals,
    assists
  };
}

  /* =========================================================
     AFFICHER TOUTES LES COMPÉTITIONS
     ========================================================= */

 function renderStandingTable(rows, title, competition) {
  const rowHTML = rows
    .map((row, index) => renderStandingRow(row, index, competition))
    .join("");

  return `
    <section class="ss-standing-group">
      ${title ? `<h3 class="ss-standing-group-title">${escapeHTML(title)}</h3>` : ""}
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
          ${rowHTML}
        </div>
      </div>
    </section>
  `;
}

 function renderCompetition(result) {
  const {
    competition,
    standings,
    standingGroups = [],
    goals,
    assists
  } = result;

  const usefulGroups = standingGroups.filter(group => group.rows && group.rows.length);
  const needsGroupTitles = usefulGroups.length > 1 || usefulGroups.some(group => group.name);

  const tablesHTML = usefulGroups.map((group, index) => {
    const title = group.name || (needsGroupTitles ? `Groupe ${String.fromCharCode(65 + index)}` : "");
    return renderStandingTable(group.rows, title, competition);
  }).join("");

  return `
    <details
  class="bf-competition"
  data-competition-name="${escapeHTML(competition.name)}"
>
      <summary class="bf-competition-summary">
        <div class="bf-competition-brand">
          <div class="bf-competition-logo">
            <img
              src="${escapeHTML(competition.logo)}"
              alt="${escapeHTML(competition.name)}"
              loading="lazy"
              onerror="this.onerror=null;this.style.display='none';this.parentElement.textContent='🏆';"
            >
          </div>
          <div class="bf-competition-info">
            <small>${escapeHTML(competition.country)}</small>
            <h2>${escapeHTML(competition.name)}</h2>
            <span>${standings.length} équipes${usefulGroups.length > 1 ? ` · ${usefulGroups.length} groupes` : ""}</span>
          </div>
        </div>
        <span class="bf-competition-arrow">›</span>
      </summary>

      <div class="bf-competition-content">
        ${renderQualificationLegend(usefulGroups, competition)}
        ${tablesHTML || `
          <div class="ss-no-data">
            Classement indisponible pour le moment. SportScore ne renvoie pas de tableau pour ce slug.
          </div>
        `}
${ESPN_KNOCKOUT_CODES[competition.name] ? `
  <section class="bf-ko-section" data-bf-knockout>
    <div class="bf-ko-section-head">
      <h3>Tableau des éliminatoires</h3>
      <p>De la huitième de finale jusqu'à la finale</p>
    </div>

    <p>
  ${
    competition.name === "FIFA World Cup"
      ? "Du tour des 32 équipes jusqu'à la finale"
      : "Des huitièmes de finale jusqu'à la finale"
  }
</p>
  </section>
` : ""}
        <div class="ss-players-grid">
          ${renderPlayers(goals, "goals", "Meilleurs buteurs", "⚽")}
${renderPlayers(assists, "assists", "Meilleurs passeurs", "🎯")}
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


   const results = [];

for (let i = 0; i < competitions.length; i += 3) {
  const batch = competitions.slice(i, i + 3);

  const batchResults = await Promise.all(
    batch.map(loadCompetition)
  );

  results.push(...batchResults);
}


    container.innerHTML =
      results
        .map(
          renderCompetition
        )
        .join("");
   

container
  .querySelectorAll("details.bf-competition")
  .forEach(card => {
    card.addEventListener("toggle", () => {
       if (
  card.open &&
  card.dataset.knockoutStarted !== "1"
) {
  const competitionName =
    card.dataset.competitionName;

  const bracket =
    card.querySelector("[data-bf-knockout]");

  if (
    bracket &&
    ESPN_KNOCKOUT_CODES[competitionName]
  ) {
    card.dataset.knockoutStarted = "1";

    loadKnockoutBracket(
      competitionName,
      bracket
    );
  }
}
      if (
        card.open &&
        card.dataset.playerPhotosStarted !== "1"
      ) {
        card.dataset.playerPhotosStarted = "1";

        loadRealPlayerPhotos(card);
      }
    });
  });

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
   TABLES PAR GROUPE
   ========================================= */

.ss-standing-group + .ss-standing-group {
  border-top: 1px solid rgba(16,35,48,.09);
}

body.dark .ss-standing-group + .ss-standing-group {
  border-top-color: rgba(255,255,255,.09);
}

.ss-standing-group-title {
  margin: 0;
  padding: 14px 18px;
  font-size: 14px;
  font-weight: 900;
  color: #166534;
  background: #f0fdf4;
  border-bottom: 1px solid rgba(16,35,48,.07);
}

body.dark .ss-standing-group-title {
  color: #86efac;
  background: #10291f;
  border-bottom-color: rgba(255,255,255,.07);
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

/* =========================================
   BAKHIRAFOOT STANDINGS — LIGHT MODE
========================================= */

.bf-competition-content,
.ss-table {
  background: #ffffff;
}

.bf-competition-info h2 {
  color: #172b38;
}

.ss-standing-row:not(.ss-table-header) {
  color: #273746;
  background: #ffffff;
  transition: background .18s ease;
}

.ss-standing-row:nth-child(even):not(.ss-table-header) {
  background: #f5f8fb;
}

.ss-standing-row:hover:not(.ss-table-header) {
  background: #eaf8ef;
}

.ss-position {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;
  border-radius: 8px;
  font-weight: 900;
  color: #34465a;
}

.ss-club strong {
  color: #172b38;
}

.ss-points {
  color: #15803d;
  font-size: 14px;
  font-weight: 950;
}

.ss-player-card-head strong {
  color: #172b38;
}

.ss-player-value {
  color: #15803d;
}

.ss-club-fallback,
.ss-player-fallback {
  color: #475569;
  background: #edf2f7;
}

.ss-qualification-legend {
  background: #f8fafc;
}


/* =========================================
   BAKHIRAFOOT STANDINGS — DARK MODE
========================================= */

body.dark .bf-competition-content,
body.dark .ss-table {
  background: #101c26;
}

body.dark .bf-competition-info h2 {
  color: #f0f6fa;
}

body.dark .ss-standing-row:not(.ss-table-header) {
  color: #dce6ee;
  background: #13212b;
}

body.dark .ss-standing-row:nth-child(even):not(.ss-table-header) {
  background: #172833;
}

body.dark .ss-standing-row:hover:not(.ss-table-header) {
  background: #203a2e;
}

body.dark .ss-position {
  color: #e2eaf1;
}

body.dark .ss-club strong {
  color: #edf4f8;
}

body.dark .ss-points,
body.dark .ss-player-value {
  color: #65e69a;
}

body.dark .ss-player-card-head strong {
  color: #edf4f8;
}

body.dark .ss-club-fallback,
body.dark .ss-player-fallback {
  color: #d4e0e8;
  background: #263743;
}

body.dark .ss-qualification-legend {
  background: #101c26;
  border-color: rgba(255, 255, 255, .08);
}

/* Améliorer la lisibilité des en-têtes */
.ss-table-header {
  font-weight: 900;
}

body.dark .ss-table-header {
  color: #bac8d3;
}

/* Accessibilité clavier */
.bf-competition-summary:focus-visible {
  outline: 3px solid #22c55e;
  outline-offset: -3px;
}

body.dark .bf-competition-summary:focus-visible {
  outline-color: #65e69a;
}

/* Téléphones */
@media (max-width: 600px) {
  .ss-standing-row {
    gap: 5px;
  }

  .ss-points {
    font-size: 13px;
  }

  .bf-competition-info h2 {
    overflow-wrap: anywhere;
  }
}

        .competitions-page-head h1 {
          font-size: 30px;
        }


        .ss-standing-row {
          padding-left: 12px;
          padding-right: 12px;
        }

      }
      /* =========================================
   BAKHIRAFOOT — FIX QUALIFICATION LABELS
   DARK MODE + LIGHT MODE
========================================= */

.ss-qualification-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px 18px;
  padding: 15px 16px;
  background: #f8fafc !important;
  color: #243746;
  border-bottom: 1px solid rgba(100, 116, 139, .22);
}

.ss-zone-legend-item {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  font-size: 12px !important;
  font-weight: 800;
  line-height: 1.45;
  color: #243746 !important;
  filter: none !important;
}

.ss-zone-legend-item > span:last-child {
  min-width: 0;
  max-width: 300px;
  white-space: normal !important;
  overflow-wrap: anywhere;
}

.ss-zone-swatch {
  flex: 0 0 10px;
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 50%;
}

.ss-zone-caption {
  display: block;
  width: fit-content;
  max-width: 100%;
  padding: 4px 7px;
  margin-top: 3px;
  border-radius: 6px;
  font-size: 11px !important;
  font-weight: 850;
  line-height: 1.4;
  white-space: normal !important;
  overflow: visible !important;
  overflow-wrap: anywhere;
  text-overflow: clip !important;
  filter: none !important;
}

/* DARK MODE */
body.dark .ss-qualification-legend {
  background: #101c26 !important;
  color: #e5edf4 !important;
  border-bottom-color: rgba(255, 255, 255, .12);
}

body.dark .ss-zone-legend-item {
  color: #e5edf4 !important;
  filter: none !important;
}

body.dark .ss-zone-caption {
  filter: none !important;
}

/* MOBILE */
@media (max-width: 600px) {
  .ss-qualification-legend {
    gap: 10px 12px;
    padding: 12px;
  }

  .ss-zone-legend-item {
    font-size: 11px !important;
  }

  .ss-zone-caption {
    font-size: 10px !important;
    padding: 3px 6px;
    white-space: normal !important;
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
