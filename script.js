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
let selectedCompetitionIndex = 0;
let scoreCompetitionGroups = [];
let scoreStatusFilter = "all";

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
  const values = [
    match?.fixture?.status?.short,
    match?.fixture?.status?.long,
    match?.status?.short,
    match?.status?.long,
    match?.status_text,
    typeof match?.status === "string"
      ? match.status
      : "",
    match?.status_code
  ]
    .filter(
      value =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
    .map(
      value =>
        String(value)
          .trim()
          .toUpperCase()
    );

  const joined =
    values.join(" ");

  /* LIVE / FIRST HALF / SECOND HALF */
  if (
    joined.includes("LIVE") ||
    joined.includes("IN PLAY") ||
    joined.includes("INPLAY") ||
    joined.includes("IN PROGRESS") ||
    joined.includes("FIRST HALF") ||
    joined.includes("SECOND HALF") ||
    joined.includes("1ST HALF") ||
    joined.includes("2ND HALF")
  ) {
    return "LIVE";
  }

  /* Codes numériques de status */
  const numeric =
    values.find(
      value =>
        /^-?\d+$/.test(value)
    );

  if (numeric) {
    const code =
      Number(numeric);

    if (
      code === 1 ||
      code === 3 ||
      code === 4 ||
      code === 5
    ) {
      return "LIVE";
    }

    if (code === 2) {
      return "HT";
    }

    if (code === 0) {
      return "NS";
    }

    if (code === -1) {
      return "FT";
    }

    if (code === -10) {
      return "CANC";
    }

    if (code === -13) {
      return "PST";
    }

    if (code === -14) {
      return "INT";
    }
  }

  /* MI-TEMPS */
  if (
    joined === "HT" ||
    joined.includes("HALFTIME") ||
    joined.includes("HALF TIME") ||
    joined.includes("HALF-TIME")
  ) {
    return "HT";
  }

  /* TERMINÉ */
  if (
    joined === "FT" ||
    joined.includes("FINISHED") ||
    joined.includes("FULL TIME") ||
    joined.includes("ENDED") ||
    joined.includes("MATCH FINISHED")
  ) {
    return "FT";
  }

  /* À VENIR */
  if (
    joined === "NS" ||
    joined.includes("NOT STARTED") ||
    joined.includes("SCHEDULED") ||
    joined.includes("UPCOMING")
  ) {
    return "NS";
  }

  if (
    joined.includes("POSTPON")
  ) {
    return "PST";
  }

  if (
    joined.includes("CANCEL")
  ) {
    return "CANC";
  }

  return (
    values[0] ||
    "MATCH"
  );
}

function getMinute(match) {

  const direct =
    match?.fixture?.status?.elapsed ??
    match?.status?.elapsed ??
    match?.elapsed ??
    match?.minute ??
    null;

  if (
    direct !== null &&
    direct !== undefined &&
    direct !== ""
  ) {
    const n =
      Number(direct);

    if (
      Number.isFinite(n)
    ) {
      return Math.max(
        0,
        Math.min(
          120,
          n
        )
      );
    }
  }

  const statusText =
    String(
      match?.fixture?.status?.long ||
      match?.status?.long ||
      match?.status_text ||
      ""
    );

  /* إذا كان المصدر كيعطي 67' داخل النص */
  const minuteMatch =
    statusText.match(
      /(\d{1,3})\s*['′]|(\d{1,3})\s*(?:MIN|MINUTE)/i
    );

  if (minuteMatch) {
    const n =
      Number(
        minuteMatch[1] ||
        minuteMatch[2]
      );

    if (
      Number.isFinite(n)
    ) {
      return Math.min(
        120,
        n
      );
    }
  }

  if (
    getStatus(match) !== "LIVE"
  ) {
    return null;
  }

  /*
   * Fallback تقريبي من وقت البداية.
   * ما كنستعملوه غير إلا المصدر ما عطاش elapsed.
   */

  const kickoff =
    match?.fixture?.date ||
    match?.date ||
    null;

  if (!kickoff) {
    return null;
  }

  const start =
    new Date(kickoff);

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return null;
  }

  const minutes =
    Math.floor(
      (
        Date.now() -
        start.getTime()
      ) / 60000
    );

  if (
    minutes < 0
  ) {
    return null;
  }

  /*
   * الشوط الأول
   */
  if (
    minutes <= 45
  ) {
    return Math.max(
      1,
      minutes
    );
  }

  /*
   * بعد الاستراحة:
   * تقريباً 15 دقيقة pause.
   */
  return Math.min(
    120,
    Math.max(
      46,
      minutes - 14
    )
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

function getLeagueLogo(match) {
  return (
    match?.league?.logo ||
    match?.league?.image ||
    match?.league?.icon ||
    match?.league?.logo_url ||
    match?.competition?.logo ||
    match?.competition?.image ||
    match?.competition?.icon ||
    match?.competition?.logo_url ||
    ""
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
  const leagueId = Number(
    match?.league?.id ??
    match?.competition?.id ??
    match?.league_id ??
    match?.competition_id ??
    0
  );

  const league = normalizeText(getLeague(match));

  /*
   * =========================================
   * PRIORITY PAR ID
   * API-Football League IDs
   * =========================================
   */

  const priorityById = {
    /* Coupes du monde */
    1: 150,   // FIFA World Cup

    /* Euro */
    4: 140,   // UEFA Euro

    /* Champions League */
    2: 130,   // UEFA Champions League

    /* Europa League */
    3: 120,   // UEFA Europa League

    /* Conference League */
    848: 110, // UEFA Conference League

    /* Angleterre */
    39: 100,  // Premier League

    /* Espagne */
    140: 95,  // La Liga

    /* Italie */
    135: 90,  // Serie A

    /* Allemagne */
    78: 70,   // Bundesliga

    /* France */
    61: 65,   // Ligue 1

    /* Maroc */
    200: 55   // Botola Pro
  };

  if (
    leagueId &&
    Object.prototype.hasOwnProperty.call(
      priorityById,
      leagueId
    )
  ) {
    return priorityById[leagueId];
  }

  /*
   * =========================================
   * FALLBACK PAR NOM EXACT
   * مهم:
   * ما نستعملوش includes() هنا للبطولات
   * باش ما نخلطوش البطولات المتشابهة.
   * =========================================
   */

  const exactPriority = {
    "world cup": 150,
    "fifa world cup": 150,
    "coupe du monde": 150,

    "euro": 140,
    "uefa euro": 140,
    "european championship": 140,

    "champions league": 130,
    "uefa champions league": 130,

    "europa league": 120,
    "uefa europa league": 120,

    "conference league": 110,
    "uefa conference league": 110,

    "premier league": 100,
    "english premier league": 100,

    "la liga": 95,
    "laliga": 95,

    "serie a": 90,
    "italian serie a": 90,

    "afcon": 85,
    "africa cup of nations": 85,
    "african cup of nations": 85,

    "copa america": 80,

    "nations league": 75,
    "uefa nations league": 75,

    "bundesliga": 70,
    "german bundesliga": 70,

    "ligue 1": 65,
    "french ligue 1": 65,

    "world cup qualifier": 60,
    "world cup qualifiers": 60,
    "world cup qualification": 60,

    "botola": 55,
    "botola pro": 55,
    "botola pro maroc": 55
  };

  if (
    Object.prototype.hasOwnProperty.call(
      exactPriority,
      league
    )
  ) {
    return exactPriority[league];
  }

  /*
   * أي بطولة أخرى:
   * ما تاخد حتى أولوية ديال بطولة كبيرة
   */
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
  const leagueLogo = getLeagueLogo(match);

  const fixtureId =
    getFixtureId(match);

  const rawStatus =
    String(
      getStatus(match)
    ).toUpperCase();

  const minute =
    getMinute(match);

  const date =
    match?.fixture?.date ||
    match?.date ||
    null;

   let kickoffTime = "";

if (date) {
  const d = new Date(date);

  if (!Number.isNaN(d.getTime())) {
    kickoffTime =
      d.toLocaleTimeString(
        "fr-FR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );
  }
}
  let statusText = "MATCH";
  let statusClass = "upcoming";
  let timeText = "";

  const liveStatuses = [
    "1H",
    "2H",
    "LIVE",
    "ET",
    "P",
    "BT"
  ];

  if (
    liveStatuses.includes(rawStatus) ||
    rawStatus.includes("LIVE")
  ) {
    statusClass = "live";

    statusText =
      minute !== null &&
      minute !== undefined
        ? `🔴 LIVE ${minute}'`
        : "🔴 LIVE";
  }

  else if (
    rawStatus === "HT" ||
    rawStatus.includes("HALF")
  ) {
    statusClass = "halftime";
    statusText = "⏸ MI-TEMPS";

    if (minute !== null) {
      timeText = `${minute}'`;
    }
  }

  else if (
    rawStatus === "FT" ||
    rawStatus.includes("FINISHED") ||
    rawStatus.includes("FINISH")
  ) {
    statusClass = "finished";
    statusText = "✅ TERMINÉ";

    if (date) {
      const d =
        new Date(date);

      if (!Number.isNaN(d.getTime())) {
        timeText =
          d.toLocaleTimeString(
            "fr-FR",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          );
      }
    }
  }

  else if (
    rawStatus === "NS" ||
    rawStatus.includes("NOT STARTED")
  ) {
    statusClass = "upcoming";
    statusText = "🕒 À VENIR";

    if (date) {
      const d =
        new Date(date);

      if (!Number.isNaN(d.getTime())) {
        timeText =
          d.toLocaleTimeString(
            "fr-FR",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          );
      }
    }
  }

  else if (
    rawStatus === "PST" ||
    rawStatus.includes("POSTPONED")
  ) {
    statusClass = "postponed";
    statusText = "⏸ REPORTÉ";
  }

  else if (
    rawStatus === "CANC" ||
    rawStatus.includes("CANCEL")
  ) {
    statusClass = "cancelled";
    statusText = "❌ ANNULÉ";
  }

  else {
    statusText =
      statusLabel(match);

    if (date) {
      const d =
        new Date(date);

      if (!Number.isNaN(d.getTime())) {
        timeText =
          d.toLocaleTimeString(
            "fr-FR",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          );
      }
    }
  }

  return `
    <div
      class="match-card bf-score-clean-card"
      data-match-index="${index}"
      data-fixture-id="${escapeHTML(
        fixtureId || ""
      )}"
onclick="
  window.bfOpenMatchDetails(
    this.dataset.fixtureId
  )
"    >

      <div
        class="bf-score-card-header"
      >

        <div
          class="bf-score-card-league"
        >

          ${
            leagueLogo
              ? `
                <img
                  src="${escapeHTML(
                    leagueLogo
                  )}"
                  alt=""
                  class="bf-score-card-league-logo"
                >
              `
              : `
                <span
                  class="
                    bf-score-card-league-icon
                  "
                >
                  🏆
                </span>
              `
          }

          <span>
            ${escapeHTML(
              league
            )}
          </span>

        </div>


<div
  class="
    bf-score-card-status
    ${statusClass}
  "
>

  <strong>
    ${escapeHTML(
      statusText
    )}
  </strong>

  ${
    kickoffTime
      ? `
        <span
          class="
            bf-score-card-time
          "
        >
          🕐 ${escapeHTML(
            kickoffTime
          )}
        </span>
      `
      : ""
  }

</div>

      </div>


      <div
        class="bf-score-card-body"
      >

        <div
          class="bf-score-card-team home"
        >

          ${
            homeLogo
              ? `
                <img
                  src="${escapeHTML(
                    homeLogo
                  )}"
                  alt="${escapeHTML(
                    home
                  )}"
                  class="
                    bf-score-card-team-logo
                  "
                  loading="lazy"
                >
              `
              : `
                <div
                  class="
                    bf-score-card-team-logo
                    placeholder
                  "
                >
                  ⚽
                </div>
              `
          }

          <strong>
            ${escapeHTML(
              home
            )}
          </strong>

        </div>


        <div
          class="bf-score-card-center"
        >

          <div
            class="
              bf-score-card-score
            "
          >

            <span>
              ${escapeHTML(
                homeScore
              )}
            </span>

            <b>-</b>

            <span>
              ${escapeHTML(
                awayScore
              )}
            </span>

          </div>

          ${
            statusClass === "upcoming"
              ? `
                <small>
                  Coup d'envoi
                </small>
              `
              : ""
          }

        </div>


        <div
          class="
            bf-score-card-team away
          "
        >

          ${
            awayLogo
              ? `
                <img
                  src="${escapeHTML(
                    awayLogo
                  )}"
                  alt="${escapeHTML(
                    away
                  )}"
                  class="
                    bf-score-card-team-logo
                  "
                  loading="lazy"
                >
              `
              : `
                <div
                  class="
                    bf-score-card-team-logo
                    placeholder
                  "
                >
                  ⚽
                </div>
              `
          }

          <strong>
            ${escapeHTML(
              away
            )}
          </strong>

        </div>

      </div>


      <div
        class="
          bf-score-card-footer
        "
      >
        <span>
          Voir les détails
        </span>

        <span
          class="
            bf-score-card-arrow
          "
        >
          ›
        </span>
      </div>

    </div>
  `;
}

/* =========================================================
   BAKHIRAFOOT PRO SCORES
   Structure:
   Date -> Competitions -> Matches
========================================================= */

function getScoreState(match) {
  const status = String(
    getStatus(match)
  ).toUpperCase();

  if (
    status === "LIVE" ||
    status === "1H" ||
    status === "2H" ||
    status === "ET" ||
    status === "P" ||
    status === "BT" ||
    status.includes("IN PLAY") ||
    status.includes("INPLAY") ||
    status.includes("IN PROGRESS") ||
    status.includes("FIRST HALF") ||
    status.includes("SECOND HALF") ||
    status.includes("1ST HALF") ||
    status.includes("2ND HALF")
  ) {
    return "live";
  }

  if (
    status === "HT" ||
    status.includes("HALFTIME") ||
    status.includes("HALF TIME") ||
    status.includes("HALF-TIME")
  ) {
    return "halftime";
  }

  if (
    status === "NS" ||
    status.includes("NOT STARTED") ||
    status.includes("SCHEDULED") ||
    status.includes("UPCOMING")
  ) {
    return "upcoming";
  }

  if (
    status === "FT" ||
    status.includes("FINISHED") ||
    status.includes("FULL TIME") ||
    status.includes("ENDED") ||
    status.includes("MATCH FINISHED")
  ) {
    return "finished";
  }

  if (
    status === "PST" ||
    status.includes("POSTPON")
  ) {
    return "postponed";
  }

  if (
    status === "CANC" ||
    status.includes("CANCEL")
  ) {
    return "cancelled";
  }

  return "other";
}


/* =========================================================
   COMPETITION KEY
   ID أولاً باش Premier League ما تخلطش
   مع India / Jordan Premier League
========================================================= */

function getCompetitionGroupKey(match) {
  const leagueId =
    match?.league?.id ??
    match?.competition?.id ??
    match?.league_id ??
    match?.competition_id ??
    "";

  const leagueName =
    normalizeText(
      getLeague(match)
    );

  if (leagueId !== "") {
    return `${leagueId}__${leagueName}`;
  }

  return leagueName;
}


/* =========================================================
   SORT MATCHES
   LIVE -> HT -> UPCOMING -> POSTPONED -> FINISHED
========================================================= */

function getScoreStateOrder(match) {
  const state =
    getScoreState(match);

  const order = {
    live: 1,
    halftime: 2,
    upcoming: 3,
    postponed: 4,
    cancelled: 5,
    finished: 6,
    other: 7
  };

  return order[state] ?? 7;
}


function sortScoreMatches(matches) {
  return [...matches].sort(
    (a, b) => {

      const stateA =
        getScoreStateOrder(a.match);

      const stateB =
        getScoreStateOrder(b.match);

      if (stateA !== stateB) {
        return stateA - stateB;
      }

      const dateA =
        new Date(
          a.match?.fixture?.date ||
          a.match?.date ||
          0
        ).getTime();

      const dateB =
        new Date(
          b.match?.fixture?.date ||
          b.match?.date ||
          0
        ).getTime();

      /* القادم: الأقرب أولاً */
      if (stateA === 3) {
        return dateA - dateB;
      }

      /* المنتهي: الأحدث أولاً */
      if (stateA === 6) {
        return dateB - dateA;
      }

      return (
        getMatchPriority(b.match) -
        getMatchPriority(a.match)
      );
    }
  );
}


/* =========================================================
   BUILD COMPETITIONS
========================================================= */

function buildCompetitionGroups(matches) {

  const groupsMap =
    new Map();

  matches.forEach(
    (match, index) => {

      const key =
        getCompetitionGroupKey(
          match
        );

      if (!groupsMap.has(key)) {
        groupsMap.set(
          key,
          {
            name:
              getLeague(match) ||
              "Football",

            logo:
              getLeagueLogo(match),

            matches: []
          }
        );
      }

      groupsMap
        .get(key)
        .matches
        .push({
          match,
          index
        });
    }
  );


  const result =
    Array.from(
      groupsMap.values()
    );


  /* ترتيب المنافسات */
  result.sort(
    (a, b) => {

      const priorityA =
        getCompetitionPriority(
          a.matches[0].match
        );

      const priorityB =
        getCompetitionPriority(
          b.matches[0].match
        );

      if (
        priorityA !==
        priorityB
      ) {
        return (
          priorityB -
          priorityA
        );
      }

      return a.name.localeCompare(
        b.name,
        "fr"
      );
    }
  );


  /* ترتيب الماتشات داخل كل Competition */
  result.forEach(
    group => {

      group.matches =
        sortScoreMatches(
          group.matches
        );

    }
  );


  return result;
}


/* =========================================================
   RENDER SCORES
========================================================= */

function renderScoreCompetitions(
  matches
) {

  const list =
    $("scoreList");

  if (!list) {
    return;
  }


  if (
    !Array.isArray(matches) ||
    !matches.length
  ) {

    list.innerHTML =
      emptyCard(
        "Aucun match trouvé."
      );

    return;
  }


  scoreCompetitionGroups =
    buildCompetitionGroups(
      matches
    );


  if (
    selectedCompetitionIndex >=
    scoreCompetitionGroups.length
  ) {
    selectedCompetitionIndex = 0;
  }


  renderSelectedCompetition();
}


/* =========================================================
   SELECT COMPETITION
========================================================= */

function selectScoreCompetition(
  index
) {

  selectedCompetitionIndex =
    Number(index);

  if (
    !Number.isFinite(
      selectedCompetitionIndex
    )
  ) {
    selectedCompetitionIndex = 0;
  }


  if (
    selectedCompetitionIndex < 0
  ) {
    selectedCompetitionIndex = 0;
  }


  if (
    selectedCompetitionIndex >=
    scoreCompetitionGroups.length
  ) {
    selectedCompetitionIndex =
      scoreCompetitionGroups.length - 1;
  }


  renderSelectedCompetition();
}


/* =========================================================
   STATUS FILTER
========================================================= */

function setScoreStatusFilter(
  filter
) {

  scoreStatusFilter =
    filter || "all";

  renderSelectedCompetition();
}


/* =========================================================
   FORMAT TIME
========================================================= */

function getScoreKickoffTime(
  match
) {

  const date =
    match?.fixture?.date ||
    match?.date ||
    null;

  if (!date) {
    return "";
  }

  const d =
    new Date(date);

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {
    return "";
  }

  return d.toLocaleTimeString(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


/* =========================================================
   STATUS DISPLAY
========================================================= */

function getScoreStatusDisplay(
  match
) {

  const state =
    getScoreState(match);

  const minute =
    getMinute(match);

  if (state === "live") {

    return {
      className: "live",
      text:
        minute !== null &&
        minute !== undefined
          ? `🔴 LIVE ${minute}'`
          : "🔴 LIVE"
    };
  }


  if (state === "halftime") {

    return {
      className: "halftime",
      text: "⏸ MI-TEMPS"
    };
  }


  if (state === "finished") {

    return {
      className: "finished",
      text: "✅ TERMINÉ"
    };
  }


  if (state === "upcoming") {

    return {
      className: "upcoming",
      text: "🕒 À VENIR"
    };
  }


  if (state === "postponed") {

    return {
      className: "postponed",
      text: "⏸ REPORTÉ"
    };
  }


  if (state === "cancelled") {

    return {
      className: "cancelled",
      text: "❌ ANNULÉ"
    };
  }


  return {
    className: "upcoming",
    text:
      statusLabel(match)
  };
}


/* =========================================================
   SELECTED COMPETITION
========================================================= */

function renderSelectedCompetition() {

  const list =
    $("scoreList");

  if (!list) {
    return;
  }


  const group =
    scoreCompetitionGroups[
      selectedCompetitionIndex
    ];

  if (!group) {
    return;
  }


  /* =====================================
     COUNTERS
  ===================================== */

  const liveCount =
    group.matches.filter(
      ({ match }) =>
        getScoreState(match) ===
          "live" ||
        getScoreState(match) ===
          "halftime"
    ).length;


  const upcomingCount =
    group.matches.filter(
      ({ match }) =>
        getScoreState(match) ===
        "upcoming"
    ).length;


  const finishedCount =
    group.matches.filter(
      ({ match }) =>
        getScoreState(match) ===
        "finished"
    ).length;


  /* =====================================
     COMPETITIONS LEFT
  ===================================== */

  const competitionsHTML =
    scoreCompetitionGroups
      .map(
        (item, index) => {

          const itemLive =
            item.matches.filter(
              ({ match }) =>
                getScoreState(match) ===
                  "live" ||
                getScoreState(match) ===
                  "halftime"
            ).length;


          return `
            <button
              type="button"
              class="
                bf-score-competition
                ${
                  index ===
                  selectedCompetitionIndex
                    ? "active"
                    : ""
                }
              "
              onclick="
                selectScoreCompetition(
                  ${index}
                )
              "
            >

              <span
                class="
                  bf-score-comp-left
                  bf-score-pro-comp-left
                "
              >

                ${
                  item.logo
                    ? `
                      <img
                        class="bf-score-comp-logo"
                        src="${escapeHTML(
                          item.logo
                        )}"
                        alt="${escapeHTML(
                          item.name
                        )}"
                        loading="lazy"
                      >
                    `
                    : `
                      <span
                        class="
                          bf-score-comp-icon
                        "
                      >
                        🏆
                      </span>
                    `
                }

                <span
                  class="bf-score-comp-name"
                >
                  ${escapeHTML(
                    item.name
                  )}
                </span>

              </span>


              <span
                class="
                  bf-score-comp-meta
                  bf-score-pro-comp-meta
                "
              >

                ${
                  itemLive
                    ? `
                      <span
                        class="
                          bf-score-live-count
                        "
                      >
                        ${itemLive}
                      </span>
                    `
                    : ""
                }

                <span
                  class="bf-score-pro-match-count"
                >
                  ${item.matches.length}
                </span>

              </span>

            </button>
          `;
        }
      )
      .join("");


  /* =====================================
     STATUS FILTERS
  ===================================== */

  const filtersHTML = `
    <div
      class="
        bf-score-pro-filters
      "
    >

      <button
        type="button"
        class="${
          scoreStatusFilter ===
          "all"
            ? "active"
            : ""
        }"
        onclick="
          setScoreStatusFilter(
            'all'
          )
        "
      >
        Tous
      </button>

      <button
        type="button"
        class="${
          scoreStatusFilter ===
          "live"
            ? "active"
            : ""
        }"
        onclick="
          setScoreStatusFilter(
            'live'
          )
        "
      >
        <span class="bf-score-dot">
          ●
        </span>
        Live
      </button>

      <button
        type="button"
        class="${
          scoreStatusFilter ===
          "upcoming"
            ? "active"
            : ""
        }"
        onclick="
          setScoreStatusFilter(
            'upcoming'
          )
        "
      >
        À venir
      </button>

      <button
        type="button"
        class="${
          scoreStatusFilter ===
          "finished"
            ? "active"
            : ""
        }"
        onclick="
          setScoreStatusFilter(
            'finished'
          )
        "
      >
        Terminés
      </button>

    </div>
  `;


  /* =====================================
     FILTER CURRENT COMPETITION
  ===================================== */

  let visibleMatches =
    group.matches;


  if (
    scoreStatusFilter !==
    "all"
  ) {

    visibleMatches =
      group.matches.filter(
        ({ match }) => {

          const state =
            getScoreState(
              match
            );

          if (
            scoreStatusFilter ===
            "live"
          ) {
            return (
              state === "live" ||
              state === "halftime"
            );
          }

          return (
            state ===
            scoreStatusFilter
          );
        }
      );
  }


  visibleMatches =
    sortScoreMatches(
      visibleMatches
    );


  /* =====================================
     MATCH CARDS
  ===================================== */

  const matchesHTML =
    visibleMatches
      .map(
        ({
          match,
          index
        }) => {

          const status =
            getScoreStatusDisplay(
              match
            );

          const kickoff =
            getScoreKickoffTime(
              match
            );

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

          const state =
            getScoreState(
              match
            );

          const isLive =
            state === "live" ||
            state === "halftime";


return `
  <article
    class="
      bf-score-professional-match
      bf-score-pro-card
      ${
        isLive
          ? "bf-score-pro-live"
          : ""
      }
    "
    data-match-index="${index}"
    onclick="
      openMatchDetails(${index})
    "
  >

              <div
                class="
                  bf-score-match-status
                  ${status.className}
                  bf-score-pro-status
                "
              >

                <strong>
                  ${escapeHTML(
                    status.text
                  )}
                </strong>

                ${
                  kickoff
                    ? `
                      <small
                        class="
                          bf-score-kickoff-time
                        "
                      >
                        ${escapeHTML(
                          kickoff
                        )}
                      </small>
                    `
                    : ""
                }

              </div>


              <div
                class="
                  bf-score-match-teams
                  bf-score-pro-teams
                "
              >

                <div
                  class="
                    bf-score-team
                    home
                    bf-score-pro-team
                  "
                >

                  <strong>
                    ${escapeHTML(
                      home
                    )}
                  </strong>

                  ${
                    homeLogo
                      ? `
                        <img
                          src="${escapeHTML(
                            homeLogo
                          )}"
                          alt="${escapeHTML(
                            home
                          )}"
                          loading="lazy"
                        >
                      `
                      : `
                        <span
                          class="
                            bf-score-team-placeholder
                          "
                        >
                          ⚽
                        </span>
                      `
                  }

                </div>


                <div
                  class="
                    bf-score-professional-score
                    bf-score-pro-score
                    ${
                      isLive
                        ? "live"
                        : ""
                    }
                  "
                >

                  <span>
                    ${escapeHTML(
                      homeScore
                    )}
                  </span>

                  <b>
                    -
                  </b>

                  <span>
                    ${escapeHTML(
                      awayScore
                    )}
                  </span>

                </div>


                <div
                  class="
                    bf-score-team
                    away
                    bf-score-pro-team
                  "
                >

                  ${
                    awayLogo
                      ? `
                        <img
                          src="${escapeHTML(
                            awayLogo
                          )}"
                          alt="${escapeHTML(
                            away
                          )}"
                          loading="lazy"
                        >
                      `
                      : `
                        <span
                          class="
                            bf-score-team-placeholder
                          "
                        >
                          ⚽
                        </span>
                      `
                  }

                  <strong>
                    ${escapeHTML(
                      away
                    )}
                  </strong>

                </div>

              </div>


              <div
                class="
                  bf-score-match-arrow
                  bf-score-pro-details
                "
              >
                <span>
                  Détails
                </span>
                <b>
                  →
                </b>
              </div>

            </article>
          `;
        }
      )
      .join("");


  /* =====================================
     EMPTY FILTER
  ===================================== */

  const matchesContent =
    matchesHTML ||
    `
      <div
        class="
          bf-score-pro-no-matches
        "
      >
        <div>
          ⚽
        </div>

        <strong>
          Aucun match
        </strong>

        <span>
          Aucun match dans ce filtre.
        </span>
      </div>
    `;


  /* =====================================
     FINAL SCORE LAYOUT
  ===================================== */

  list.innerHTML = `
    <div
      class="bf-score-layout"
    >

      <aside
        class="
          bf-score-competition-list
          bf-score-pro-sidebar
        "
      >

        <div
          class="
            bf-score-side-title
            bf-score-pro-side-title
          "
        >

          <span>
            🏆 COMPÉTITIONS
          </span>

          <small>
            ${scoreCompetitionGroups.length}
          </small>

        </div>


        <div
          class="
            bf-score-competition-items
          "
        >
          ${competitionsHTML}
        </div>

      </aside>


      <section
        class="
          bf-score-details-panel
          bf-score-pro-panel
        "
      >

        <div
          class="
            bf-score-details-head
            bf-score-pro-head
          "
        >

          <div
            class="
              bf-score-selected-competition
              bf-score-pro-selected
            "
          >

            ${
              group.logo
                ? `
                  <img
                    src="${escapeHTML(
                      group.logo
                    )}"
                    alt="${escapeHTML(
                      group.name
                    )}"
                  >
                `
                : `
                  <span>
                    🏆
                  </span>
                `
            }


            <div
              class="
                bf-score-pro-title
              "
            >

              <small>
                COMPÉTITION
              </small>

              <h2>
                ${escapeHTML(
                  group.name
                )}
              </h2>

              <div
                class="
                  bf-score-pro-stats
                "
              >

                <span>
                  ${group.matches.length}
                  matchs
                </span>

                ${
                  liveCount
                    ? `
                      <span
                        class="
                          bf-score-pro-live-total
                        "
                      >
                        ● ${liveCount}
                        LIVE
                      </span>
                    `
                    : ""
                }

                <span>
                  ${upcomingCount}
                  à venir
                </span>

                <span>
                  ${finishedCount}
                  terminés
                </span>

              </div>

            </div>

          </div>


          ${filtersHTML}

        </div>


        <div
          class="
            bf-score-professional-matches
            bf-score-pro-matches
          "
        >

          ${matchesContent}

        </div>

      </section>

    </div>
  `;
}
/* =========================================================
   LOAD LIVE
========================================================= */

async function loadLive() {
  const liveElement = $("live");

  /*
   * إلا ما عندناش matches ديال النهار،
   * ما نحاولوش نعوضوهم بـ LIVE فقط.
   */
  if (
    !Array.isArray(currentMatches) ||
    !currentMatches.length
  ) {
    if (liveElement) {
      liveElement.textContent =
        "⚪ Live indisponible";
    }

    return [];
  }

  /*
   * Live endpoint
   */
  try {

    if (liveElement) {
      liveElement.textContent =
        "🟡 Actualisation du LIVE...";
    }

    const response =
      await fetch(
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

    const liveMatches =
      normalizeMatches(data);

    /*
     * Index LIVE par fixture ID
     */
    const liveById =
      new Map();

    /*
     * Fallback par équipes
     */
    const liveByTeams =
      new Map();

    liveMatches.forEach(
      live => {

        const id =
          getFixtureId(live);

        if (id) {
          liveById.set(
            String(id),
            live
          );
        }

        const home =
          normalizeText(
            getHome(live)
          );

        const away =
          normalizeText(
            getAway(live)
          );

        if (home && away) {
          liveByTeams.set(
            `${home}__${away}`,
            live
          );
        }

      }
    );

    /*
     * مهم:
     * كنحتافظو بجميع matches اللي عندنا.
     * غير كنحدّثو الماتشات اللي ولات LIVE.
     */
    const updatedMatches =
      currentMatches.map(
        match => {

          const id =
            getFixtureId(match);

          const home =
            normalizeText(
              getHome(match)
            );

          const away =
            normalizeText(
              getAway(match)
            );

          const live =
            (
              id &&
              liveById.get(
                String(id)
              )
            ) ||
            liveByTeams.get(
              `${home}__${away}`
            );

          /*
           * ما كاينش update:
           * نخليو الماتش كيف كان.
           */
          if (!live) {
            return match;
          }

          /*
           * Merge آمن
           */
          return {
            ...match,

            teams:
              live.teams ||
              match.teams,

            goals:
              live.goals ||
              match.goals,

            score:
              live.score ||
              match.score,

            fixture: {
              ...match.fixture,
              ...live.fixture,

              status: {
                ...match.fixture?.status,
                ...live.fixture?.status
              }
            }
          };

        }
      );

               const existingLiveIds =
            new Set(
              matches
                .map(
                  match =>
                    getFixtureId(
                      match
                    )
                )
                .filter(Boolean)
                .map(String)
            );

          liveMatches.forEach(
            live => {

              const id =
                getFixtureId(
                  live
                );

              if (
                id &&
                !existingLiveIds.has(
                  String(id)
                )
              ) {

                matches.push(
                  live
                );

              }

            }
          );


    /*
     * Sort فقط من بعد الـmerge
     */
    const sortedMatches =
      sortMatchesByImportance(
        updatedMatches
      );

    /*
     * currentMatches كيبقى فيه
     * جميع مباريات النهار.
     */
    currentMatches =
      sortedMatches;


    /*
     * عدد LIVE الحقيقي
     */
    const liveCount =
      currentMatches.filter(
        match => {

          const status =
            getStatus(match);

          return (
            status === "LIVE" ||
            status === "HT"
          );

        }
      ).length;


    if (liveElement) {

      liveElement.textContent =
        liveCount
          ? `🔴 ${liveCount} MATCH(S) LIVE`
          : "⚪ Aucun match live";

    }


    /*
     * نعاودو نرسمو Scores
     * بنفس جميع matches.
     */
    if (
      $("scores")?.classList.contains(
        "active"
      )
    ) {

      selectedCompetitionIndex =
        Math.max(
          0,
          Math.min(
            selectedCompetitionIndex,
            scoreCompetitionGroups.length - 1
          )
        );

      renderScoreCompetitions(
        currentMatches
      );

    }

    return currentMatches;

  }
  catch (error) {

    console.error(
      "LIVE ERROR:",
      error
    );

    /*
     * مهم:
     * حتى إلا LIVE فشل،
     * ما نمسحوش matches الموجودة.
     */
    if (liveElement) {
      liveElement.textContent =
        "⚪ Live indisponible";
    }

    return currentMatches;
  }
}

/* =========================================================
   LOAD MATCHES BY DATE
========================================================= */

async function loadMatches(date) {

  const list =
    $("scoreList");

  if (!list) {
    return;
  }

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
        `${API_BASE}/api?date=${encodeURIComponent(
          currentDate
        )}`,
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
      normalizeMatches(data);


    /* =====================================================
       IMPORTANT :
       إذا كان اليوم هو اليوم الحالي،
       نجيب LIVE مباشرة فـأول تحميل.
    ===================================================== */

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    if (
      currentDate === today
    ) {

      try {

        const liveResponse =
          await fetch(
            `${API_BASE}/api?live=all`,
            {
              cache: "no-store"
            }
          );

        if (
          liveResponse.ok
        ) {

          const liveData =
            await liveResponse.json();

          const liveMatches =
            normalizeMatches(
              liveData
            );

          /*
           * indexes بالـID
           */

          const liveById =
            new Map();

          liveMatches.forEach(
            live => {

              const id =
                getFixtureId(
                  live
                );

              if (id) {
                liveById.set(
                  String(id),
                  live
                );
              }

            }
          );


          /*
           * indexes باسم الفريقين
           * كـfallback إلا اختلف الـID
           */

          const liveByTeams =
            new Map();

          liveMatches.forEach(
            live => {

              const home =
                normalizeText(
                  getHome(live)
                );

              const away =
                normalizeText(
                  getAway(live)
                );

              const key =
                `${home}__${away}`;

              liveByTeams.set(
                key,
                live
              );

            }
          );


          /*
           * Merge live data
           */

          matches =
            matches.map(
              match => {

                const id =
                  getFixtureId(
                    match
                  );

                           /*
           * إضافة LIVE اللي ما كانش موجود
           * أصلاً فـ date endpoint
           */

          const existingMatches =
            new Set();

          matches.forEach(
            match => {

              const id =
                getFixtureId(
                  match
                );

              if (id) {
                existingMatches.add(
                  `id:${String(id)}`
                );
              }

              const home =
                normalizeText(
                  getHome(match)
                );

              const away =
                normalizeText(
                  getAway(match)
                );

              if (home && away) {
                existingMatches.add(
                  `teams:${home}__${away}`
                );
              }

            }
          );


          liveMatches.forEach(
            live => {

              const id =
                getFixtureId(
                  live
                );

              const home =
                normalizeText(
                  getHome(live)
                );

              const away =
                normalizeText(
                  getAway(live)
                );


              const existsById =
                id &&
                existingMatches.has(
                  `id:${String(id)}`
                );

              const existsByTeams =
                home &&
                away &&
                existingMatches.has(
                  `teams:${home}__${away}`
                );


              if (
                !existsById &&
                !existsByTeams
              ) {

                matches.push(
                  live
                );

              }

            }
          );

                const home =
                  normalizeText(
                    getHome(match)
                  );

                const away =
                  normalizeText(
                    getAway(match)
                  );

                const teamKey =
                  `${home}__${away}`;

                const live =
                  (
                    id &&
                    liveById.get(
                      String(id)
                    )
                  ) ||
                  liveByTeams.get(
                    teamKey
                  );


                if (
                  !live
                ) {
                  return match;
                }


                return {
                  ...match,

                  teams:
                    live.teams ||
                    match.teams,

                  goals:
                    live.goals ||
                    match.goals,

                  score:
                    live.score ||
                    match.score,

                  league:
                    live.league ||
                    match.league,

                  fixture: {

                    ...match.fixture,

                    ...live.fixture,

                    status: {

                      ...match.fixture?.status,

                      ...live.fixture?.status

                    }

                  }

                };

              }
            );

        }

      }

      catch (
        liveError
      ) {

        console.warn(
          "LIVE MERGE:",
          liveError
        );

      }

    }


    /*
     * FILTER
     */

    if (
      currentFilter &&
      currentFilter !== "all"
    ) {

      matches =
        matches.filter(
          match =>
            normalizeText(
              getLeague(match)
            )
              .includes(
                normalizeText(
                  currentFilter
                )
              )
        );

    }


    /*
     * ترتيب نهائي
     */

    matches =
      sortMatchesByImportance(
        matches
      );


    /*
     * نخزنو نفس الماتشات
     * اللي غادي يبانوا.
     */

    currentMatches =
      matches;


    if (
      !matches.length
    ) {

      list.innerHTML =
        emptyCard(
          "Aucun match trouvé pour cette date."
        );

      return;
    }


    selectedCompetitionIndex =
      0;

    renderScoreCompetitions(
      matches
    );

  }

  catch (error) {

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

  if (!modal) {
    return;
  }

  modal.style.display =
    "none";

  document.body.style.overflow =
    "";

  currentOpenedFixture =
    null;
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

    /* ========================================
       DETAILS - MOBILE RESPONSIVE
    ======================================== */

    .bf-modal {
      width: min(1100px, 100%);
      max-width: 100%;
      box-sizing: border-box;
    }

    .bf-modal img {
      max-width: 100%;
    }

    @media (max-width: 700px) {

      .bf-modal-overlay {
        padding: 8px;
        align-items: flex-start;
      }

      .bf-modal {
        width: 100%;
        max-height: 96vh;
        padding: 18px 12px;
        border-radius: 16px;
      }

      .bf-details-teams {
        gap: 8px;
      }

      .bf-details-team {
        min-width: 0;
      }

      .bf-details-team-name {
        max-width: 110px;
        white-space: normal;
        overflow-wrap: anywhere;
        font-size: 11px;
      }

      .bf-details-logo,
      .bf-details-team img {
        width: 58px;
        height: 58px;
      }

      .bf-details-score {
        font-size: 25px;
      }
    }
    /* ========================================
       MATCH DETAILS - BETTER PITCH PLAYERS
    ======================================== */

    .bf-pitch-box {
      min-width: 0;
    }

    .bf-pitch {
      min-height: 420px;
    }

    .bf-pitch-player {
      width: 78px;
      gap: 2px;
    }

    .bf-shirt {
      width: 36px;
      height: 36px;
      font-size: 11px;
      font-weight: 950;
      border-width: 2px;
    }

    .bf-pitch-name {
      max-width: 74px;
      padding: 3px 5px;

      text-align: center;
      line-height: 1.1;

      font-size: 8px;
      font-weight: 850;
    }

    .bf-pitch-rating {
      margin-top: 1px;
      padding: 2px 5px;

      border-radius: 5px;

      font-size: 8px;
      font-weight: 950;
    }

    .bf-pitch-title {
      font-size: 12px;
      font-weight: 900;
    }

    .bf-pitch-formation {
      font-size: 10px;
    }

    @media (max-width: 600px) {

      .bf-pitch {
        min-height: 360px;
      }

      .bf-pitch-player {
        width: 64px;
      }

      .bf-shirt {
        width: 30px;
        height: 30px;
        font-size: 9px;
      }

      .bf-pitch-name {
        max-width: 61px;
        font-size: 7px;
      }

      .bf-pitch-rating {
        font-size: 7px;
      }
    }

        /* ========================================
       MATCH DETAILS - EVENTS PRO
    ======================================== */

    .bf-events {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .bf-event {
      position: relative;

      display: grid;
      grid-template-columns: 48px 34px minmax(0, 1fr);
      align-items: center;

      gap: 10px;

      min-height: 48px;
      padding: 8px 11px;

      border-radius: 10px;

      background: rgba(127,127,127,.06);
      border: 1px solid rgba(127,127,127,.09);
    }

    .bf-event-minute {
      font-size: 11px;
      font-weight: 950;
      text-align: center;
    }

    .bf-event-icon {
      width: 30px;
      height: 30px;

      display: flex;
      align-items: center;
      justify-content: center;

      border-radius: 50%;

      background: rgba(127,127,127,.10);

      font-size: 15px;
    }

    .bf-event-main {
      min-width: 0;
    }

    .bf-event-player {
      font-size: 11px;
      font-weight: 900;

      white-space: normal;
      overflow-wrap: anywhere;
    }

    .bf-event-assist {
      margin-top: 2px;
      font-size: 9px;
      opacity: .62;
    }

    .bf-event-team {
      margin-top: 2px;
      font-size: 8px;
      opacity: .48;
    }

    .bf-event.home {
      border-left: 3px solid rgba(70,110,180,.65);
    }

    .bf-event.away {
      border-left: 3px solid rgba(205,75,70,.65);
    }

    @media (max-width: 600px) {

      .bf-event {
        grid-template-columns:
          40px 30px minmax(0,1fr);

        gap: 7px;
        padding: 7px 8px;
      }

      .bf-event-minute {
        font-size: 10px;
      }

      .bf-event-icon {
        width: 27px;
        height: 27px;
        font-size: 13px;
      }

      .bf-event-player {
        font-size: 10px;
      }

      .bf-event-assist {
        font-size: 8px;
      }

      .bf-event-team {
        font-size: 7px;
      }
   }

       /* ========================================
       MATCH DETAILS - STATISTICS PRO
    ======================================== */

    .bf-stat-table {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }

    .bf-stat-row {
      display: grid;
      grid-template-columns:
        55px
        minmax(0, 1fr)
        55px;

      align-items: center;
      gap: 8px;

      padding: 9px 10px;
      border-radius: 10px;

      background: rgba(127,127,127,.055);
      border: 1px solid rgba(127,127,127,.08);
    }

    .bf-stat-value-home,
    .bf-stat-value-away {
      font-size: 11px;
      font-weight: 950;
    }

    .bf-stat-value-home {
      text-align: right;
    }

    .bf-stat-value-away {
      text-align: left;
    }

    .bf-stat-name {
      min-width: 0;

      text-align: center;

      font-size: 9px;
      font-weight: 800;

      opacity: .58;

      white-space: normal;
      overflow-wrap: anywhere;
    }

    .bf-stat-row:hover {
      background: rgba(127,127,127,.09);
    }

    @media (max-width: 600px) {

      .bf-stat-table {
        gap: 7px;
      }

      .bf-stat-row {
        grid-template-columns:
          45px
          minmax(0,1fr)
          45px;

        gap: 6px;
        padding: 8px;
      }

      .bf-stat-value-home,
      .bf-stat-value-away {
        font-size: 10px;
      }

      .bf-stat-name {
        font-size: 8px;
      }
    }

        /* ========================================
       PLAYER MATCH MARKERS
    ======================================== */

    .bf-pitch-markers {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-height: 16px;
      margin-bottom: 2px;
    }

    .bf-pitch-marker {
      display: inline-flex;
      align-items: center;
      justify-content: center;

      min-width: 17px;
      height: 17px;
      padding: 0 2px;

      border-radius: 5px;
      background: rgba(0,0,0,.65);

      font-size: 9px;
      line-height: 1;
    }

    @media (max-width: 600px) {

      .bf-pitch-markers {
        min-height: 14px;
      }

      .bf-pitch-marker {
        min-width: 15px;
        height: 15px;
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

  let badges = "";

  /* ⚽ Goals */
  if (
    numberOrZero(
      playerData?.goals
    ) > 0
  ) {
    badges += `
      <span class="bf-pitch-marker goal">
        ⚽
      </span>
    `;
  }

  /* 🅰️ Assists */
  if (
    numberOrZero(
      playerData?.assists
    ) > 0
  ) {
    badges += `
      <span class="bf-pitch-marker assist">
        🅰️
      </span>
    `;
  }

  /* 🟨 Yellow */
  if (
    numberOrZero(
      playerData?.yellow
    ) > 0
  ) {
    badges += `
      <span class="bf-pitch-marker yellow">
        🟨
      </span>
    `;
  }

  /* 🟥 Red */
  if (
    numberOrZero(
      playerData?.red
    ) > 0
  ) {
    badges += `
      <span class="bf-pitch-marker red">
        🟥
      </span>
    `;
  }

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

      ${
        badges
          ? `
            <span class="bf-pitch-markers">
              ${badges}
            </span>
          `
          : ""
      }

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
   LOAD REAL SPORTScore MATCH DETAILS
========================================================= */

async function loadRealMatchDetails(fixtureId) {

  const value =
    String(
      fixtureId || ""
    ).trim();

  if (!value) {
    throw new Error(
      "Fixture manquant"
    );
  }

  /*
   * كنخدمو من API ديال BakhiraFoot
   * وماشي من SportScore مباشرة.
   */

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => {
        controller.abort();
      },
      15000
    );

  try {

    const url =
      `/api?fixture=${encodeURIComponent(
        value
      )}`;

    console.log(
      "BAKHIRAFOOT DETAILS REQUEST:",
      url
    );

    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          cache:
            "no-store",

          headers: {
            Accept:
              "application/json"
          },

          signal:
            controller.signal
        }
      );

    const rawText =
      await response.text();

    let data;

    try {

      data =
        JSON.parse(
          rawText
        );

    } catch {

      throw new Error(
        "API a retourné une réponse non JSON"
      );

    }

    console.log(
      "BAKHIRAFOOT DETAILS RESPONSE:",
      data
    );

    if (
      !response.ok
    ) {

      throw new Error(
        data?.error ||
        `API HTTP ${response.status}`
      );

    }

    /*
     * API ديالنا كترجع:
     *
     * {
     *   data: {...}
     * }
     *
     * وadaptSportScoreDetails()
     * ديجا كيعرف data.
     */

    if (
      !data
    ) {

      throw new Error(
        "Réponse vide"
      );

    }

    return data;

  }
  catch (
    error
  ) {

    console.error(
      "BAKHIRAFOOT DETAILS ERROR:",
      error
    );

    if (
      error?.name ===
      "AbortError"
    ) {

      throw new Error(
        "Le chargement du match a expiré."
      );
    }

    throw error;

  }
  finally {

    clearTimeout(
      timer
    );

  }
}
/* =========================================================
   ADAPT SPORTScore DATA TO BAKHIRAFOOT
========================================================= */
function normalizeSofaLineup(
  source,
  team
) {

  if (
    !source ||
    typeof source !== "object"
  ) {
    return null;
  }

  const players =
    Array.isArray(source.players)
      ? source.players
      : Array.isArray(source.startXI)
        ? source.startXI
        : Array.isArray(source.startingXI)
          ? source.startingXI
          : Array.isArray(source.starting_xi)
            ? source.starting_xi
            : [];

  const substitutes =
    Array.isArray(source.substitutes)
      ? source.substitutes
      : Array.isArray(source.subs)
        ? source.subs
        : Array.isArray(source.bench)
          ? source.bench
          : [];

  let startXI = [];
  let bench = substitutes.slice();

  const hasFirst =
    players.some(
      player =>
        player &&
        typeof player === "object" &&
        player.first !== undefined
    );

  if (hasFirst) {

    startXI =
      players.filter(
        player =>
          player?.first === 1 ||
          player?.first === true ||
          player?.first === "1"
      );

    if (!bench.length) {

      bench =
        players.filter(
          player =>
            player?.first === 0 ||
            player?.first === false ||
            player?.first === "0"
        );

    }

  } else {

    startXI =
      players.filter(
        player =>
          player?.substitute !== true &&
          player?.starter !== false
      );

  }

  return {

    team:
      team ||
      source?.team ||
      {},

    formation:
      source?.formation ||
      source?.tacticalFormation ||
      source?.tactic ||
      "—",

    coach:
      source?.coach ||
      source?.manager ||
      null,

    startXI:
      startXI.slice(0, 11),

    substitutes:
      bench

  };
}
function adaptSportScoreDetails(
  raw,
  fallbackMatch
) {

  const root =
    raw?.match ||
    raw?.data?.match ||
    raw?.data ||
    raw;

  if (
    !root ||
    typeof root !== "object"
  ) {
    return null;
  }


  /* =======================================================
     TEAM
  ======================================================= */

  function makeTeam(
    value,
    fallback
  ) {

    if (
      typeof value === "string"
    ) {

      return {
        id: null,
        name: value,
        logo: ""
      };

    }

    const team =
      value || {};

    return {

      id:
        team?.id ??
        team?.team_id ??
        null,

      name:
        team?.name ||
        fallback ||
        "Équipe",

      logo:
        team?.logo ||
        team?.image ||
        team?.picture ||
        ""

    };

  }


  const homeSource =
    root?.home_team ||
    root?.homeTeam ||
    root?.teams?.home ||
    root?.home ||
    null;

  const awaySource =
    root?.away_team ||
    root?.awayTeam ||
    root?.teams?.away ||
    root?.away ||
    null;


  const homeTeam =
    makeTeam(
      homeSource,
      getHome(fallbackMatch)
    );

  const awayTeam =
    makeTeam(
      awaySource,
      getAway(fallbackMatch)
    );


  /* =======================================================
     SCORE
  ======================================================= */

  const rawScore =
    root?.score ||
    {};

  const homeScore =
    root?.home_score ??
    root?.homeScore ??
    rawScore?.home ??
    rawScore?.fulltime?.home ??
    getHomeScore(
      fallbackMatch
    );

  const awayScore =
    root?.away_score ??
    root?.awayScore ??
    rawScore?.away ??
    rawScore?.fulltime?.away ??
    getAwayScore(
      fallbackMatch
    );


  /* =======================================================
     DATE
  ======================================================= */

  const matchDate =
    root?.time ||
    root?.date ||
    root?.start_time ||
    root?.kickoff ||
    fallbackMatch?.fixture?.date ||
    null;


  /* =======================================================
     STATUS
  ======================================================= */

  let statusShort =
    root?.status_code ||
    root?.short_status ||
    "";

  const statusString =
    String(
      root?.status_text ||
      root?.status?.text ||
      root?.status?.description ||
      root?.status ||
      ""
    ).toLowerCase();

  if (!statusShort) {

    if (
      statusString.includes(
        "live"
      ) ||
      statusString.includes(
        "in play"
      ) ||
      statusString.includes(
        "inplay"
      )
    ) {

      statusShort =
        "LIVE";

    }
    else if (
      statusString.includes(
        "half"
      )
    ) {

      statusShort =
        "HT";

    }
    else if (
      statusString.includes(
        "finish"
      ) ||
      statusString.includes(
        "ended"
      ) ||
      statusString === "ft"
    ) {

      statusShort =
        "FT";

    }
    else if (
      statusString.includes(
        "postpon"
      )
    ) {

      statusShort =
        "PST";

    }
    else {

      statusShort =
        "NS";

    }

  }


  /* =======================================================
     LEAGUE
  ======================================================= */

  const leagueSource =
    root?.competition ||
    root?.league ||
    {};

  const league = {

    id:
      leagueSource?.id ??
      null,

    name:
      leagueSource?.name ||
      root?.competition_name ||
      root?.league_name ||
      getLeague(
        fallbackMatch
      ),

    country:
      leagueSource?.country ||
      root?.country ||
      "",

    logo:
      leagueSource?.logo ||
      "",

    round:
      root?.round ||
      root?.round_name ||
      null,

    season:
      typeof root?.season === "object"
        ? root?.season?.name
        : root?.season || null

  };


  /* =======================================================
     LINEUPS
  ======================================================= */

  const lineupSource =
    root?.lineups ||
    root?.lineup ||
    root?.compositions ||
    root?.formations ||
    null;

  const lineups = [];


  function addLineup(
    source,
    team
  ) {

    if (
      !source ||
      typeof source !== "object"
    ) {
      return;
    }

    const lineup =
      normalizeSofaLineup(
        source,
        team
      );

    if (lineup) {

      lineups.push(
        lineup
      );

    }

  }


  if (
    Array.isArray(
      lineupSource
    )
  ) {

    lineupSource.forEach(
      (item, index) => {

        const itemTeam =
          item?.team ||
          {};

        const itemTeamId =
          itemTeam?.id ||
          itemTeam?.team_id ||
          null;

        let team;

        if (
          homeTeam.id &&
          itemTeamId &&
          String(
            homeTeam.id
          ) ===
          String(
            itemTeamId
          )
        ) {

          team =
            homeTeam;

        }
        else if (
          awayTeam.id &&
          itemTeamId &&
          String(
            awayTeam.id
          ) ===
          String(
            itemTeamId
          )
        ) {

          team =
            awayTeam;

        }
        else {

          team =
            index === 0
              ? homeTeam
              : awayTeam;

        }

        addLineup(
          item,
          team
        );

      }
    );

  }
   else if (
    lineupSource &&
    typeof lineupSource === "object"
  ) {

    /*
     * SportScore:
     *
     * home_formation
     * away_formation
     * home_xi
     * away_xi
     * home_subs
     * away_subs
     */

    const hasDirectSportScoreLineups =
      Array.isArray(
        lineupSource?.home_xi
      ) ||
      Array.isArray(
        lineupSource?.away_xi
      ) ||
      Array.isArray(
        lineupSource?.home_subs
      ) ||
      Array.isArray(
        lineupSource?.away_subs
      );

    if (
      hasDirectSportScoreLineups
    ) {

      addLineup(
        {
          formation:
            lineupSource?.home_formation ||
            "—",

          players:
            lineupSource?.home_xi ||
            [],

          substitutes:
            lineupSource?.home_subs ||
            [],

          coach:
            lineupSource?.home_coach ||
            lineupSource?.home_manager ||
            null
        },
        homeTeam
      );

      addLineup(
        {
          formation:
            lineupSource?.away_formation ||
            "—",

          players:
            lineupSource?.away_xi ||
            [],

          substitutes:
            lineupSource?.away_subs ||
            [],

          coach:
            lineupSource?.away_coach ||
            lineupSource?.away_manager ||
            null
        },
        awayTeam
      );

    } else {

      /*
       * Fallback pour autres formats
       */

      const homeSource =
        lineupSource?.home ||
        lineupSource?.homeTeam ||
        lineupSource?.host ||
        null;

      const awaySource =
        lineupSource?.away ||
        lineupSource?.awayTeam ||
        lineupSource?.guest ||
        null;

      addLineup(
        homeSource,
        homeTeam
      );

      addLineup(
        awaySource,
        awayTeam
      );

    }

  }

  /* =======================================================
     EVENTS
  ======================================================= */

  const eventSource =
    root?.incidents ||
    root?.events ||
    root?.timeline ||
    root?.match_events ||
    [];

  const events =
    Array.isArray(
      eventSource
    )
      ? eventSource.map(
          event => {

            const player =
              event?.player ||
              {};

            const assist =
              event?.assist ||
              event?.assist1 ||
              event?.relatedPlayer ||
              {};

            const team =
              event?.team ||
              {};

            return {

              time: {

                elapsed:
                  event?.time?.elapsed ??
                  event?.minute ??
                  event?.time ??
                  null,

                extra:
                  event?.time?.extra ??
                  event?.addedTime ??
                  event?.extra ??
                  null

              },

              team: {

                id:
                  team?.id ??
                  event?.team_id ??
                  null,

                name:
                  team?.name ||
                  event?.team_name ||
                  ""

              },

              player: {

                id:
                  player?.id ??
                  event?.player_id ??
                  null,

                name:
                  player?.name ||
                  event?.player_name ||
                  ""

              },

              assist: {

                id:
                  assist?.id ??
                  event?.assist_id ??
                  null,

                name:
                  assist?.name ||
                  event?.assist_name ||
                  ""

              },

              type:
                event?.type ||
                event?.incidentType ||
                event?.event_type ||
                "Other",

              detail:
                event?.detail ||
                event?.incidentClass ||
                event?.reason ||
                event?.description ||
                ""

            };

          }
        )
      : [];


  /* =======================================================
     STATISTICS
  ======================================================= */

  let statistics = [];

  try {

    statistics =
      normalizeStatistics(
        root,
        {
          homeTeam,
          awayTeam
        }
      );

  } catch (
    error
  ) {

    console.warn(
      "STATISTICS ADAPTER ERROR:",
      error
    );

    statistics = [];

  }


  /* =======================================================
     PLAYERS
  ======================================================= */

   const players =
    lineups.map(
      lineup => ({
        team:
          lineup?.team ||
          {},

        players: [
          ...(
            Array.isArray(
              lineup?.startXI
            )
              ? lineup.startXI
              : []
          ),

          ...(
            Array.isArray(
              lineup?.substitutes
            )
              ? lineup.substitutes
              : []
          )
        ]
      })
    );


  /* =======================================================
     FINAL DATA
  ======================================================= */

  return {

    fixture: {

      id:
        fallbackMatch?.fixture?.id ||
        fallbackMatch?.id ||
        null,

      slug:
        fallbackMatch?.fixture?.slug ||
        fallbackMatch?.slug ||
        null,

      upstreamId:
        root?.id ||
        root?.match_id ||
        null,

      date:
        matchDate,

      timezone:
        root?.timezone ||
        "UTC",

      status: {

        short:
          statusShort,

        long:
          root?.status_text ||
          root?.status?.description ||
          root?.status ||
          "Match",

        elapsed:
          root?.minute ??
          root?.elapsed ??
          root?.status?.elapsed ??
          null

      },

      venue:
        root?.venue ||
        null,

      referee:
        typeof root?.referee ===
          "object"
          ? root?.referee?.name ||
            ""
          : root?.referee ||
            ""

    },

    league,

    teams: {

      home:
        homeTeam,

      away:
        awayTeam

    },

    goals: {

      home:
        homeScore,

      away:
        awayScore

    },

    score: {

      home:
        homeScore,

      away:
        awayScore,

      halftime: {

        home:
          rawScore?.halftime?.home ??
          rawScore?.ht?.home ??
          null,

        away:
          rawScore?.halftime?.away ??
          rawScore?.ht?.away ??
          null

      },

      fulltime: {

        home:
          homeScore,

        away:
          awayScore

      }

    },

    events,

    lineups,

    statistics,

    players

  };

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
    match?.fixture?.slug ||
    match?.slug ||
    match?.fixture?.id ||
    match?.id ||
    null;

  createMatchModal();

  const modal =
    $("matchModal");

  const content =
    $("matchDetailsContent");

  if (
    !modal ||
    !content
  ) {
    return;
  }

  currentOpenedFixture =
    String(
      fixtureId || ""
    );

  modal.style.display =
    "block";

  document.body.style.overflow =
    "hidden";


  /* =======================================================
     HEADER
  ======================================================= */

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

  content.innerHTML = `

    <div class="bf-details-league">
      🏆 ${escapeHTML(league)}
    </div>

    <div class="bf-details-status-wrap">

      <div class="bf-details-status">
        ${escapeHTML(
          statusLabel(match)
        )}
      </div>

    </div>

    <div class="bf-details-teams">

      <div class="bf-details-team">

        ${
          homeLogo
            ? `
              <img
                class="bf-details-logo"
                src="${escapeHTML(
                  homeLogo
                )}"
                alt="${escapeHTML(
                  home
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
          ${escapeHTML(home)}
        </span>

      </div>

      <div>

        <div class="bf-details-score">
          ${escapeHTML(
            homeScore
          )}
          -
          ${escapeHTML(
            awayScore
          )}
        </div>

      </div>

      <div class="bf-details-team">

        ${
          awayLogo
            ? `
              <img
                class="bf-details-logo"
                src="${escapeHTML(
                  awayLogo
                )}"
                alt="${escapeHTML(
                  away
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
          ${escapeHTML(away)}
        </span>

      </div>

    </div>

    <div class="bf-detail-section">

      <h3>
        ⏳ Chargement...
      </h3>

      <div class="bf-detail-item">
        Chargement des données réelles de la rencontre.
      </div>

    </div>

  `;


  /* =======================================================
     NO FIXTURE
  ======================================================= */

  if (!fixtureId) {

    content.innerHTML += `

      <div class="bf-detail-section">

        <div class="bf-detail-item">
          ⚠️ Identifiant du match introuvable.
        </div>

      </div>

    `;

    return;
  }


  try {

    const raw =
      await loadRealMatchDetails(
        fixtureId
      );


    if (
      currentOpenedFixture !==
      String(fixtureId)
    ) {
      return;
    }


    const details =
      adaptSportScoreDetails(
        raw,
        match
      );


    if (!details) {

      throw new Error(
        "Données du match invalides"
      );

    }


    const realHome =
      details?.teams?.home?.name ||
      home;

    const realAway =
      details?.teams?.away?.name ||
      away;

    const realHomeId =
      details?.teams?.home?.id ||
      getHomeId(match);

    const realAwayId =
      details?.teams?.away?.id ||
      getAwayId(match);

    const realHomeLogo =
      details?.teams?.home?.logo ||
      homeLogo;

    const realAwayLogo =
      details?.teams?.away?.logo ||
      awayLogo;

    const realHomeScore =
      details?.goals?.home ??
      homeScore;

    const realAwayScore =
      details?.goals?.away ??
      awayScore;

    const realLeague =
      details?.league?.name ||
      league;

    const events =
      Array.isArray(
        details?.events
      )
        ? details.events
        : [];

    const statistics =
      Array.isArray(
        details?.statistics
      )
        ? details.statistics
        : [];

    const lineups =
      Array.isArray(
        details?.lineups
      )
        ? details.lineups
        : [];

    const players =
      Array.isArray(
        details?.players
      )
        ? details.players
        : [];

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


    content.innerHTML = `

      <div class="bf-details-league">
        🏆 ${escapeHTML(
          realLeague
        )}
      </div>

      <div class="bf-details-status-wrap">

        <div class="bf-details-status">
          ${escapeHTML(
            statusLabel(details)
          )}
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
            ${escapeHTML(
              realHome
            )}
          </span>

        </div>

        <div>

          <div class="bf-details-score">
            ${escapeHTML(
              realHomeScore
            )}
            -
            ${escapeHTML(
              realAwayScore
            )}
          </div>

          ${
            details?.fixture?.date
              ? `
                <div class="bf-details-time">
                  ${escapeHTML(
                    formatDate(
                      details.fixture.date
                    )
                  )}
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
            ${escapeHTML(
              realAway
            )}
          </span>

        </div>

      </div>


      ${renderMatchInformation(
        details
      )}


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
                La composition n'est pas encore disponible pour cette rencontre.
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


      <div
        style="
          margin-top:24px;
          padding-top:14px;
          border-top:1px solid rgba(127,127,127,.15);
          text-align:center;
          font-size:11px;
          opacity:.6;
        "
      >
        Données fournies par
        <a
          href="https://sportscore.com/"
          target="_blank"
          rel="dofollow noopener"
        >
          SportScore
        </a>
      </div>

    `;

  } catch (error) {

    console.error(
      "BAKHIRAFOOT DETAILS ERROR:",
      error
    );

    content.innerHTML = `

      <div class="bf-details-league">
        🏆 ${escapeHTML(
          league
        )}
      </div>

      <div class="bf-details-status-wrap">

        <div class="bf-details-status">
          ${escapeHTML(
            statusLabel(match)
          )}
        </div>

      </div>

      <div class="bf-details-teams">

        <div class="bf-details-team">

          ${
            homeLogo
              ? `
                <img
                  class="bf-details-logo"
                  src="${escapeHTML(
                    homeLogo
                  )}"
                  alt="${escapeHTML(
                    home
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
            ${escapeHTML(home)}
          </span>

        </div>

        <div class="bf-details-score">
          ${escapeHTML(
            homeScore
          )}
          -
          ${escapeHTML(
            awayScore
          )}
        </div>

        <div class="bf-details-team">

          ${
            awayLogo
              ? `
                <img
                  class="bf-details-logo"
                  src="${escapeHTML(
                    awayLogo
                  )}"
                  alt="${escapeHTML(
                    away
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
            ${escapeHTML(away)}
          </span>

        </div>

      </div>

      <div class="bf-detail-section">

        <h3>
          ⚠️ Détails supplémentaires
        </h3>

        <div class="bf-detail-item">
          ما قدرناش نجيبو تفاصيل هاد الماتش من SportScore دابا.
        </div>

      </div>

    `;

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

        loadMatches(currentDate);

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
