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
let selectedCompetitionFilterKey = "";
let selectedCompetitionFilterKeys = [];
let selectedCompetitionFilterName = "";
let selectedCompetitionFilterLogo = "";
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
  /*
   * BAKHIRAFOOT
   * ترتيب البطولات بالاسم
   * ماشي بالـID، حيث المصادر مختلفة
   */

  const rawLeague = getLeague(match);

  const original = normalizeText(
    typeof rawLeague === "string"
      ? rawLeague
      : rawLeague?.name || ""
  )
    .replace(/[’']/g, "")
    .replace(/[_–—-]+/g, " ")
    .replace(/\b(league phase|group stage|regular season|fall season|spring season|first round|second round|third round|qualifying round|round of 32|round of 16)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const league = original
    .replace(
      /\b(?:19|20)\d{2}(?:[-/](?:\d{2}|(?:19|20)\d{2}))?\b/g,
      " "
    )
    .replace(
      /\b(league phase|group stage|regular season|fall season|spring season|first round|second round|third round|qualifying round)\b/g,
      " "
    )
    .replace(
      /\b(ea sports|santander)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const rawCountry =
    match?.league?.country?.name ||
    match?.league?.country ||
    match?.competition?.country?.name ||
    match?.competition?.country ||
    "";

  const country = normalizeText(
    typeof rawCountry === "string"
      ? rawCountry
      : rawCountry?.name || ""
  );

const starts = (...names) =>
  names.some(name => {
    const n = normalizeText(name)
      .replace(/[_–—-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (league === n) return true;

    if (!league.startsWith(n + " ")) {
      return false;
    }

    const suffix = league
      .slice(n.length)
      .trim();

    // كنقبلو غير اختلافات البلد والأسماء المعروفة
    return [
      "england",
      "english",
      "spain",
      "spanish",
      "italy",
      "italian",
      "germany",
      "german",
      "france",
      "french",
      "morocco",
      "maroc",
      "europe",
      "inwi"
    ].includes(suffix);
  });
 const countryIs = (...names) =>
  !country ||
  names.some(name => {
    const normalized = normalizeText(name);

    return (
      country === normalized ||
      country.includes(normalized)
    );
  });
  /*
   * QUALIFIERS: ما نخلطوهمش مع البطولة النهائية
   */
  if (
    /\b(qualifiers?|qualification|qualifying)\b/.test(original)
  ) {
    if (/\b(world cup|coupe du monde)\b/.test(original)) {
      return 65;
    }

    if (/\b(euro|european championship)\b/.test(original)) {
      return 60;
    }
  }

  /*
   * COMPÉTITIONS INTERNATIONALES
   */
  if (starts("fifa club world cup", "club world cup")) return 270;
  if (starts("fifa world cup", "world cup", "coupe du monde")) return 300;
  if (starts("uefa european championship", "european championship", "uefa euro", "euro")) return 290;
  if (starts("uefa champions league", "champions league")) return 280;
  if (starts("copa america")) return 275;
  if (starts("africa cup of nations", "african cup of nations", "afcon")) return 270;
  if (starts("copa libertadores", "conmebol libertadores")) return 260;
  if (starts("uefa nations league", "nations league")) return 255;
  if (starts("afc asian cup", "asian cup")) return 250;
  if (starts("uefa europa league", "europa league")) return 245;
  if (starts("concacaf gold cup", "gold cup")) return 240;
  if (starts("caf champions league")) return 235;
  if (starts("afc champions league")) return 230;
  if (starts("uefa conference league", "europa conference league", "conference league")) return 220;

  /*
   * LIGUES LOCALES
   * الدوريات المتشابهة خاصها البلد الصحيح
   */

  if (
    starts("english premier league") ||
    (
      starts("premier league") &&
      countryIs("england", "united kingdom", "eng")
    )
  ) return 200;

  if (
    starts("laliga", "la liga", "spanish la liga") &&
    !starts("la liga 2", "laliga 2") &&
    countryIs("spain", "esp")
  ) return 195;

  if (
    starts("italian serie a") ||
    (
      starts("serie a") &&
      countryIs("italy", "ita")
    )
  ) return 190;

  if (
    starts("german bundesliga") ||
    (
      starts("bundesliga") &&
      countryIs("germany", "ger", "deu")
    )
  ) return 185;

  if (
    starts("french ligue 1") ||
    (
      starts("ligue 1") &&
      countryIs("france", "fra")
    )
  ) return 180;

  if (
    starts("campeonato brasileiro serie a", "brasileirao serie a", "brazilian serie a")
  ) return 175;

  if (starts("saudi pro league", "roshan saudi league")) return 170;
  if (starts("major league soccer", "mls")) return 165;
  if (starts("eredivisie")) return 160;
  if (starts("liga portugal", "primeira liga")) return 155;
  if (starts("botola pro", "botola")) return 150;
  if (starts("egyptian premier league")) return 145;
  if (starts("liga mx")) return 140;
  if (starts("argentine primera division", "liga profesional argentina")) return 135;
  if (starts("efl championship", "english championship")) return 120;
  if (starts("scottish premiership")) return 115;
  if (starts("j1 league", "j league")) return 110;

  /*
   * الكؤوس المحلية المعروفة
   */
  if (
    starts(
      "fa cup",
      "english fa cup",
      "copa del rey",
      "coppa italia",
      "dfb pokal",
      "coupe de france",
      "copa do brasil",
      "moroccan throne cup",
      "coupe du trone"
    )
  ) return 100;

  /*
   * باقي البطولات كتبقى موجودة
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

  // La qualité de l'affiche passe avant le statut : les grands matchs à venir
  // restent visibles même lorsqu'aucune rencontre n'est en direct.
  if (
    ["1H", "2H", "LIVE", "ET", "P", "BT"].includes(status) ||
    status.includes("LIVE")
  ) {
    priority += 12;
  }

  if (
    status === "HT" ||
    status.includes("HALF")
  ) {
    priority += 10;
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

function bfFixtureTextName(value) {
 if(typeof value==="string")return value.trim();
 if(!value||typeof value!=="object")return "";
 return String(value.name||value.displayName||value.display_name||value.shortName||value.short_name||value.teamName||value.team_name||"").trim();
}
function bfFixtureRoot(source) {
 let node=source;
 for(let i=0;i<4&&node&&typeof node==="object";i++){
  if(node.data&&typeof node.data==="object"&&(node.data.fixture||node.data.teams||node.data.lineups||node.data.events||node.data.match)){node=node.data;continue;}
  if(node.match&&typeof node.match==="object"&&(node.match.fixture||node.match.teams||node.match.lineups)){node=node.match;continue;}
  break;
 }
 return node||{};
}
function bfFixtureTeamName(source,side) {
 const node=bfFixtureRoot(source),home=side==="home";
 const values=home
  ?[node.teams?.home,node.fixture?.teams?.home,node.fixture?.homeTeam,node.fixture?.home_team,node.home_team,node.homeTeam,node.home,node.host,node.localTeam,node.competitors?.[0],node.lineups?.[0]?.team]
  :[node.teams?.away,node.fixture?.teams?.away,node.fixture?.awayTeam,node.fixture?.away_team,node.away_team,node.awayTeam,node.away,node.guest,node.visitorTeam,node.competitors?.[1],node.lineups?.[1]?.team];
 for(const value of values){const name=bfFixtureTextName(value);if(name&&!/^(home|away|home team|away team|domicile|extérieur|exterieur|local|visitor)$/i.test(name))return name;}
 return "";
}
function bfFixtureTime(source) {
 const node=bfFixtureRoot(source);
 const values=[node.fixture?.date,node.fixture?.utcDate,node.fixture?.dateTime,node.fixture?.kickoff,node.fixture?.timestamp,node.fixture?.startTimestamp,node.event?.date,node.event?.startTimestamp,node.utcDate,node.date,node.dateTime,node.kickoff,node.kickoff_time,node.startTime,node.start_time,node.timestamp,node.time,node.fixtureDate,node.fixture_date,node.gameDate];
 for(const value of values){
  if(value===null||value===undefined||value==="")continue;
  let result;
  if(typeof value==="number"||/^\d{10,13}$/.test(String(value).trim())){const n=Number(value);result=new Date(n<100000000000?n*1000:n).getTime();}
  else result=Date.parse(String(value));
  if(Number.isFinite(result))return result;
 }
 return null;
}
function bfFixtureNameKey(value) {
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/\b(football club|soccer club|fc|cf|sc|afc|f\.c\.|c\.f\.)\b/g," ")
  .replace(/[^a-z0-9\u0600-\u06ff]+/g,"").trim();
}
function bfFixtureNamesCompatible(a,b){if(!a||!b)return false;if(a===b)return true;return a.length>=5&&b.length>=5&&(a.includes(b)||b.includes(a));}
function bfSameFixtureMetadata(candidate,expected,requireDate=false) {
 const ah=bfFixtureTeamName(candidate,"home"),aa=bfFixtureTeamName(candidate,"away"),eh=bfFixtureTeamName(expected,"home"),ea=bfFixtureTeamName(expected,"away");
 if(eh&&ea){
  if(!ah||!aa)return false;
  const x=bfFixtureNameKey(ah),y=bfFixtureNameKey(aa),u=bfFixtureNameKey(eh),v=bfFixtureNameKey(ea);
  if(!((bfFixtureNamesCompatible(x,u)&&bfFixtureNamesCompatible(y,v))||(bfFixtureNamesCompatible(x,v)&&bfFixtureNamesCompatible(y,u))))return false;
 }
 const et=bfFixtureTime(expected),at=bfFixtureTime(candidate);
 if(et!==null&&requireDate&&at===null)return false;
 if(et!==null&&at!==null&&Math.abs(et-at)>36*60*60*1000)return false;
 return true;
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
    <div class="team" data-bf-team-name="${escapeHTML(name)}" data-bf-team-logo="${escapeHTML(logo || "")}" role="button" tabindex="0" aria-label="Voir la fiche de ${escapeHTML(name)}">
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
${index >= 0 ? `onclick="openMatchDetails(${index})"` : `data-bf-home-match="${escapeHTML(fixtureId || "")}" role="button" tabindex="0"`}
>

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

          <button type="button" class="bf-score-league-inline"
            data-bf-open-standings="${escapeHTML(league)}"
            title="Ouvrir le classement de cette compétition"
            aria-label="Ouvrir le classement de ${escapeHTML(league)}">
            ${escapeHTML(league)} <span aria-hidden="true">↗</span>
          </button>

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

        <div class="bf-score-card-team home" data-bf-team-side="home" role="button" tabindex="0" aria-label="Voir la fiche de ${escapeHTML(home)}">

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


        <div class="bf-score-card-team away" data-bf-team-side="away" role="button" tabindex="0" aria-label="Voir la fiche de ${escapeHTML(away)}">

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

const SCORE_COMPETITION_ALIASES = {
  "english-premier-league": ["Premier League", "English Premier League", "Premier League England"],
  "spanish-la-liga": ["LaLiga", "La Liga", "Spanish La Liga", "Primera Division Spain"],
  "italian-serie-a": ["Serie A", "Italian Serie A", "Serie A Italy"],
  "bundesliga": ["Bundesliga", "German Bundesliga"],
  "french-ligue-1": ["Ligue 1", "French Ligue 1"],
  "netherlands-eredivisie": ["Eredivisie", "Dutch Eredivisie"],
  "uefa-champions-league": ["UEFA Champions League", "Champions League", "UCL"],
  "uefa-europa-league": ["UEFA Europa League", "Europa League", "UEL"],
  "uefa-europa-conference-league": ["UEFA Conference League", "UEFA Europa Conference League", "Conference League", "UECL"],
  "the-botola-pro": ["Botola Pro", "Botola Pro Inwi", "Moroccan Botola Pro", "Botola Pro D1"],
  "fifa-world-cup": ["FIFA World Cup", "World Cup"],
  "uefa-european-championship": ["UEFA Euro", "UEFA European Championship", "European Championship", "EURO"],
  "caf-africa-cup-of-nations": ["CAF Africa Cup of Nations", "Africa Cup of Nations", "African Cup of Nations", "AFCON"],
  "afc-asian-cup": ["AFC Asian Cup", "Asian Cup"],
  "conmebol-copa-america": ["Copa América", "Copa America", "CONMEBOL Copa America"],
  "uefa-nations-league": ["UEFA Nations League", "Nations League"],
  "english-football-league-championship": ["EFL Championship", "English Football League Championship", "Championship England"],
  "italian-serie-b": ["Serie B", "Italian Serie B"],
  "brazilian-serie-a": ["Brasileirão Série A", "Brasileirao Serie A", "Brazilian Serie A", "Campeonato Brasileiro Serie A"],
  "egyptian-premier-league": ["Egyptian Premier League", "Egypt Premier League"],
  "saudi-professional-league": ["Saudi Professional League", "Saudi Pro League", "Roshn Saudi League"],
  "portuguese-primera-liga": ["Primeira Liga", "Liga Portugal", "Liga Portugal Betclic", "Portuguese Primeira Liga"],
  "turkish-super-league": ["Süper Lig", "Super Lig", "Turkish Super League"],
  "belgian-pro-league": ["Belgian Pro League", "Pro League Belgium"],
  "scottish-premiership": ["Scottish Premiership", "Premiership Scotland"],
  "argentine-division-1": ["Argentine Division 1", "Liga Profesional", "Argentina Primera Division"]
};

function canonicalCompetitionName(value) {
  let name = normalizeText(value)
    .replace(/\b(?:19|20)\d{2}(?:\s*[-/]\s*(?:\d{2}|(?:19|20)\d{2}))?\b/g, " ")
    .replace(/[_–—-]+/g, " ")
    .replace(/\b(?:league phase|group stage|regular season|fall season|spring season|first round|second round|third round|qualifying round|qualification round|round of 32|round of 16|group\s+[a-z]|pool\s+[a-z]|matchday\s+\d+|match week\s+\d+|week\s+\d+)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const aliases = {
    "english premier league":"premier league",
    "premier league england":"premier league",
    "international friendly":"international friendlies",
    "international friendlies":"international friendlies",
    "friendly international":"international friendlies",
    "friendly internationals":"international friendlies",
    "uefa nations league":"nations league",
    "nations league":"nations league",
    "uefa champions league":"champions league",
    "champions league":"champions league",
    "ucl":"champions league",
    "uefa europa league":"europa league",
    "europa league":"europa league",
    "uel":"europa league",
    "uefa conference league":"conference league",
    "uefa europa conference league":"conference league",
    "europa conference league":"conference league",
    "conference league":"conference league",
    "uecl":"conference league",
    "german bundesliga":"bundesliga",
    "bundesliga":"bundesliga",
    "italian serie a":"serie a",
    "serie a italy":"serie a",
    "serie a":"serie a",
    "french ligue 1":"ligue 1",
    "ligue 1":"ligue 1",
    "the botola pro":"botola pro",
    "botola pro inwi":"botola pro",
    "botola pro d1":"botola pro",
    "moroccan botola pro":"botola pro",
    "la liga":"laliga",
    "spanish la liga":"laliga",
    "laliga":"laliga",
    "uefa european championship":"uefa euro",
    "european championship":"uefa euro",
    "uefa euro":"uefa euro",
    "euro":"uefa euro",
    "caf africa cup of nations":"africa cup of nations",
    "african cup of nations":"africa cup of nations",
    "africa cup of nations":"africa cup of nations",
    "afcon":"africa cup of nations",
    "copa america":"copa america",
    "portuguese primera liga":"primeira liga",
    "portuguese primera":"primeira liga",
    "liga portugal":"primeira liga",
    "liga portugal betclic":"primeira liga",
    "primeira liga":"primeira liga",
    "saudi professional league":"saudi pro league",
    "saudi pro league":"saudi pro league",
    "roshan saudi league":"saudi pro league",
    "brasileirao serie a":"campeonato brasileiro serie a",
    "brazilian serie a":"campeonato brasileiro serie a",
    "campeonato brasileiro serie a":"campeonato brasileiro serie a",
    "world cup":"fifa world cup",
    "fifa world cup":"fifa world cup",
    "argentina primera division":"argentine division 1",
    "liga profesional":"argentine division 1"
  };
  return aliases[name] || name || "football";
}

function scoreCompetitionKeys(name, slug) {
  const values = [name, ...(SCORE_COMPETITION_ALIASES[slug] || [])];
  return Array.from(new Set(values.map(canonicalCompetitionName).filter(Boolean)));
}

function findScoreCompetitionIndex(name, slug = "") {
  const keys = new Set(scoreCompetitionKeys(name, slug));
  return scoreCompetitionGroups.findIndex(group =>
    keys.has(canonicalCompetitionName(group.name))
  );
}

function getCompetitionGroupKey(match) {
  return canonicalCompetitionName(
    getLeague(match)
  );
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

function renderScoreCompetitions(matches) {
  const list = $("scoreList");
  if (!list) return;
  scoreCompetitionGroups = buildCompetitionGroups(Array.isArray(matches) ? matches : []);

  if (typeof window.refreshBakhiraScoresCompetitionSidebar === "function") {
    window.refreshBakhiraScoresCompetitionSidebar(scoreCompetitionGroups);
  }

  if (selectedCompetitionFilterKey) {
    const filterKeys = selectedCompetitionFilterKeys.length
      ? selectedCompetitionFilterKeys
      : [selectedCompetitionFilterKey];
    selectedCompetitionIndex = scoreCompetitionGroups.findIndex(group =>
      filterKeys.includes(canonicalCompetitionName(group.name))
    );
  } else if (selectedCompetitionIndex < 0 || selectedCompetitionIndex >= scoreCompetitionGroups.length) {
    selectedCompetitionIndex = scoreCompetitionGroups.length ? 0 : -1;
  }

  if (!scoreCompetitionGroups.length && !selectedCompetitionFilterKey) {
    list.innerHTML = emptyCard("Aucun match trouvé.");
    return;
  }
  renderSelectedCompetition();
}


/* =========================================================
   SELECT COMPETITION
========================================================= */

function selectScoreCompetition(
  index
) {
  selectedCompetitionFilterKey = "";
  selectedCompetitionFilterKeys = [];
  selectedCompetitionFilterName = "";
  selectedCompetitionFilterLogo = "";
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


  if (typeof window.refreshBakhiraScoresCompetitionSidebar === "function") {
    window.refreshBakhiraScoresCompetitionSidebar(scoreCompetitionGroups);
  }
  renderSelectedCompetition();
}

function selectScoreCompetitionByName(name, slug = "", logo = "") {
  const requestedName = String(name || "").trim();
  if (!requestedName) return;

  selectedCompetitionFilterName = requestedName;
  selectedCompetitionFilterLogo = String(logo || "");
  selectedCompetitionFilterKeys = scoreCompetitionKeys(requestedName, slug);
  selectedCompetitionFilterKey =
    selectedCompetitionFilterKeys[0] || canonicalCompetitionName(requestedName);

  selectedCompetitionIndex = findScoreCompetitionIndex(requestedName, slug);
  if (selectedCompetitionIndex >= 0) {
    const matchedGroup = scoreCompetitionGroups[selectedCompetitionIndex];
    selectedCompetitionFilterName = matchedGroup.name;
    selectedCompetitionFilterKey = canonicalCompetitionName(matchedGroup.name);
    selectedCompetitionFilterKeys = Array.from(new Set([
      ...selectedCompetitionFilterKeys,
      selectedCompetitionFilterKey
    ]));
  }

  if (typeof window.go === "function" && !$("scores")?.classList.contains("active")) {
    window.go("scores");
  }
  if (typeof window.refreshBakhiraScoresCompetitionSidebar === "function") {
    window.refreshBakhiraScoresCompetitionSidebar(scoreCompetitionGroups);
  }
  renderSelectedCompetition();
}
window.selectScoreCompetitionByName = selectScoreCompetitionByName;
window.getBakhiraSelectedCompetitionKey = () =>
  selectedCompetitionFilterKey ||
  canonicalCompetitionName(scoreCompetitionGroups[selectedCompetitionIndex]?.name || "");

/* This explicit action remains available to other pages, but is not used by the Scores rail. */
function openSelectedCompetitionStandings() {
  const group = scoreCompetitionGroups[selectedCompetitionIndex];
  if (!group) return;

  if (typeof window.openBakhiraCompetitionStandings === "function") {
    window.openBakhiraCompetitionStandings(group.name);
  } else {
    go("leagues");
    toast("Le classement est en cours de chargement.");
  }
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
    if (!selectedCompetitionFilterKey) {
      list.innerHTML = emptyCard("Aucun match trouvé.");
      return;
    }
    const chosenName = selectedCompetitionFilterName || "Cette compétition";
    const chosenLogo = selectedCompetitionFilterLogo
      ? `<img src="${escapeHTML(selectedCompetitionFilterLogo)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<span aria-hidden="true">🏆</span>`;
    list.innerHTML = `
      <section class="bf-score-details-panel bf-score-pro-panel">
        <div class="bf-score-details-head bf-score-pro-head" style="display:flex;align-items:center;gap:12px;padding:16px">
          <div class="bf-score-pro-selected" style="cursor:default">
            ${chosenLogo}
            <div class="bf-score-pro-title">
              <small>COMPÉTITION SÉLECTIONNÉE</small>
              <h2>${escapeHTML(chosenName)}</h2>
              <div class="bf-score-pro-stats">${escapeHTML(currentDate || "")}</div>
            </div>
          </div>
        </div>
        <div class="bf-score-professional-matches bf-score-pro-matches">
          <div class="bf-score-pro-no-matches"><div>⚽</div>
            <strong>Aucun match disponible</strong>
            <span>Aucun match de cette compétition pour cette date. Choisissez une autre date pour consulter ses rencontres.</span>
          </div>
        </div>
      </section>
    `;
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
      .map((item, index) => `
        <option value="${index}" ${index === selectedCompetitionIndex ? "selected" : ""}>
          ${escapeHTML(item.name)} (${item.matches.length})
        </option>
      `)
      .join("");

  const filtersHTML = "";


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

    .bf-stat-teams { display:grid; grid-template-columns:minmax(0,1fr) 36px minmax(0,1fr); align-items:center; gap:8px; margin:0 0 12px; font-size:12px; font-weight:900; }
    .bf-stat-teams div:first-child { text-align:right; }
    .bf-stat-teams div:last-child { text-align:left; }
    .bf-stat-teams span { text-align:center; opacity:.5; }
    .bf-stat-table { display:flex; flex-direction:column; gap:5px; }
    .bf-stat-row { display:grid; grid-template-columns:46px minmax(0,1fr) 46px; align-items:center; gap:7px; padding:8px 0; border-bottom:1px solid rgba(127,127,127,.12); }
    .bf-stat-value-home,.bf-stat-value-away { font-size:11px; font-weight:950; font-variant-numeric:tabular-nums; }
    .bf-stat-value-home { text-align:left; }
    .bf-stat-value-away { text-align:right; }
    .bf-stat-name { text-align:center; font-size:10px; font-weight:750; opacity:.8; }
    .bf-stat-track { grid-column:1/-1; width:100%; display:flex; gap:3px; height:5px; margin-top:2px; }
    .bf-stat-home,.bf-stat-away { display:block; height:5px; min-width:2px; border-radius:99px; }
    .bf-stat-home { background:linear-gradient(90deg,#1d4ed8,#60a5fa); }
    .bf-stat-away { background:linear-gradient(90deg,#fb7185,#e11d48); }
    @media(max-width:600px) {
      .bf-stat-row { grid-template-columns:32px minmax(0,1fr) 32px; gap:4px; }
      .bf-stat-name { font-size:9px; }
      .bf-stat-teams { grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr); font-size:10px; }
    }


    .bf-stat-teams { display:grid; grid-template-columns:minmax(0,1fr) 36px minmax(0,1fr); align-items:center; gap:8px; margin:0 0 12px; font-size:12px; font-weight:900; }
    .bf-stat-teams div:first-child { text-align:right; }
    .bf-stat-teams div:last-child { text-align:left; }
    .bf-stat-teams span { text-align:center; opacity:.5; }
    .bf-stat-table { display:flex; flex-direction:column; gap:5px; }
    .bf-stat-row { display:grid; grid-template-columns:46px minmax(0,1fr) 46px; align-items:center; gap:7px; padding:8px 0; border-bottom:1px solid rgba(127,127,127,.12); }
    .bf-stat-value-home,.bf-stat-value-away { font-size:11px; font-weight:950; font-variant-numeric:tabular-nums; }
    .bf-stat-value-home { text-align:left; } .bf-stat-value-away { text-align:right; }
    .bf-stat-name { text-align:center; font-size:10px; font-weight:750; opacity:.8; }
    .bf-stat-track { grid-column:1/-1; width:100%; display:flex; gap:3px; height:5px; margin-top:2px; }
    .bf-stat-home,.bf-stat-away { display:block; height:5px; min-width:2px; border-radius:99px; }
    .bf-stat-home { background:linear-gradient(90deg,#1d4ed8,#60a5fa); }
    .bf-stat-away { background:linear-gradient(90deg,#fb7185,#e11d48); }
    @media(max-width:600px) { .bf-stat-row { grid-template-columns:32px minmax(0,1fr) 32px; gap:4px; } .bf-stat-name { font-size:9px; } .bf-stat-teams { grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr); font-size:10px; } }

    `;


  /* =====================================
     FINAL SCORE LAYOUT
  ===================================== */

  list.innerHTML = `
    <div
      class="bf-score-layout"
    >




      <section
        class="
          bf-score-details-panel
          bf-score-pro-panel
        "
      >

        <div
          class="bf-score-details-head bf-score-pro-head"
          style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px"
        >
          <label style="display:flex;align-items:center;gap:10px;color:#91a5b8;font-size:11px;font-weight:800">
            COMPÉTITION
            <select
              class="bf-score-competition-select"
              aria-label="Choisir une compétition"
              onchange="selectScoreCompetition(this.value)"
              style="max-width:100%;min-width:210px;padding:10px 12px;border:1px solid #294155;border-radius:9px;background:#102234;color:#f4f7fb;font-weight:800"
            >
              ${competitionsHTML}
            </select>
          </label>

          <div
            class="
              bf-score-selected-competition
              bf-score-pro-selected
            "
            title="Matchs de cette compétition"
            style="cursor:default"
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

              <button type="button" class="bf-score-league-standings-link"
                data-bf-open-standings="${escapeHTML(group.name)}"
                title="Ouvrir le classement de cette compétition"
                aria-label="Ouvrir le classement de ${escapeHTML(group.name)}">
                <span class="bf-score-league-standings-name" role="heading" aria-level="2">${escapeHTML(group.name)}</span>
                <span class="bf-score-league-standings-arrow" aria-hidden="true">↗</span>
              </button>

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
  list.querySelectorAll("[data-bf-open-standings]").forEach(button => {
    if(button.dataset.bfStandingsBound==="1")return;
    button.dataset.bfStandingsBound="1";
    button.addEventListener("click",event=>{
      event.preventDefault();event.stopPropagation();
      const name=button.getAttribute("data-bf-open-standings")||"";
      if(typeof window.openBakhiraCompetitionStandings==="function")window.openBakhiraCompetitionStandings(name);
      else if(typeof window.go==="function")window.go("leagues");
    });
  });
}
/* =========================================================
   LOAD LIVE
========================================================= */


async function loadLive() {
  const liveElement = $("live");

  const previousCompetition =
    scoreCompetitionGroups[
      selectedCompetitionIndex
    ]?.name || "";

  try {
    const response = await fetch(
      `${API_BASE}/api?live=all`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const liveMatches = normalizeMatches(data);

    const matches = Array.isArray(currentMatches)
      ? [...currentMatches]
      : [];

    function teamKey(match) {
      const home = normalizeText(getHome(match));
      const away = normalizeText(getAway(match));

      if (
        !home ||
        !away ||
        home === "domicile" ||
        away === "exterieur"
      ) {
        return "";
      }

      return `${home}__${away}`;
    }

    const liveById = new Map();
    const liveByTeams = new Map();

    for (const live of liveMatches) {
      const id = getFixtureId(live);
      const key = teamKey(live);

      if (id) {
        liveById.set(String(id), live);
      }

      if (key) {
        liveByTeams.set(key, live);
      }
    }

    /* تحديث الماتشات الموجودة */
    const mergedMatches = matches.map(match => {
      const id = getFixtureId(match);
      const key = teamKey(match);

      const live =
        (id && liveById.get(String(id))) ||
        (key && liveByTeams.get(key));

      if (!live) {
        return match;
      }

      return {
        ...match,

        teams: live.teams ?? match.teams,
        goals: live.goals ?? match.goals,
        score: live.score ?? match.score,
        league: live.league ?? match.league,

        status: live.status ?? match.status,

        status_text:
          live.status_text ?? match.status_text,

        fixture: {
          ...(match.fixture || {}),
          ...(live.fixture || {}),

          status: {
            ...(typeof match.fixture?.status === "object"
              ? match.fixture.status
              : {}),
            ...(typeof live.fixture?.status === "object"
              ? live.fixture.status
              : {})
          }
        }
      };
    });

    /* إضافة مباريات LIVE الناقصة بلا تكرار */
    const existingIds = new Set(
      mergedMatches
        .map(getFixtureId)
        .filter(Boolean)
        .map(String)
    );

    const existingTeams = new Set(
      mergedMatches
        .map(teamKey)
        .filter(Boolean)
    );

    for (const live of liveMatches) {
      const id = getFixtureId(live);
      const key = teamKey(live);

      const existsById =
        id && existingIds.has(String(id));

      const existsByTeams =
        key && existingTeams.has(key);

      if (existsById || existsByTeams) {
        continue;
      }

      mergedMatches.push(live);

      if (id) {
        existingIds.add(String(id));
      }

      if (key) {
        existingTeams.add(key);
      }
    }

    /* ترتيب نهائي وتحديث اللائحة */
    currentMatches =
      sortMatchesByImportance(mergedMatches);

    const liveCount = currentMatches.filter(match => {
      const state = getScoreState(match);

      return (
        state === "live" ||
        state === "halftime"
      );
    }).length;

    if (liveElement) {
      liveElement.textContent = liveCount
        ? `🔴 ${liveCount} MATCH(S) LIVE`
        : "⚪ Aucun match live";
    }

    /* الحفاظ على البطولة المختارة */
    if (
      $("scores")?.classList.contains("active")
    ) {
      if (previousCompetition) {
        const previousKey =
          canonicalCompetitionName(previousCompetition);

        const nextGroups =
          buildCompetitionGroups(currentMatches);

        const nextIndex =
          nextGroups.findIndex(
            group =>
              canonicalCompetitionName(group.name) ===
              previousKey
          );

        if (nextIndex >= 0) {
          selectedCompetitionIndex = nextIndex;
        }
      }

      renderScoreCompetitions(currentMatches);
    }

    return currentMatches;

  } catch (error) {
    console.error("LIVE ERROR:", error);

    /* ما نمسحوش المباريات إلا فشل التحديث */
    if (liveElement) {
      const liveCount = currentMatches.filter(match => {
        const state = getScoreState(match);

        return (
          state === "live" ||
          state === "halftime"
        );
      }).length;

      liveElement.textContent = liveCount
        ? `🔴 ${liveCount} MATCH(S) LIVE`
        : "⚠️ Actualisation LIVE impossible";
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

if (
  !Array.isArray(currentMatches) ||
  currentMatches.length === 0
) {
  list.innerHTML =
    emptyCard(
      "Chargement des matchs..."
    );
}
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
                   /* =========================================
             AJOUT DES LIVE MANQUANTS
             ========================================= */

          const existingMatchKeys =
            new Set();

          matches.forEach(match => {

            const id =
              getFixtureId(match);

            if (id) {
              existingMatchKeys.add(
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
              existingMatchKeys.add(
                `teams:${home}__${away}`
              );
            }

          });

          liveMatches.forEach(live => {

            const id =
              getFixtureId(live);

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
              existingMatchKeys.has(
                `id:${String(id)}`
              );

            const existsByTeams =
              home &&
              away &&
              existingMatchKeys.has(
                `teams:${home}__${away}`
              );

            if (
              !existsById &&
              !existsByTeams
            ) {

              matches.push(live);

              if (id) {
                existingMatchKeys.add(
                  `id:${String(id)}`
                );
              }

              if (home && away) {
                existingMatchKeys.add(
                  `teams:${home}__${away}`
                );
              }

            }

          });
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


    if (!matches.length) {
      renderScoreCompetitions([]);
      return;
    }


    const previousCompetitionName =
  scoreCompetitionGroups[
    selectedCompetitionIndex
  ]?.name || "";

const previousCompetitionKey =
  canonicalCompetitionName(
    previousCompetitionName
  );

const updatedGroups =
  buildCompetitionGroups(matches);

const restoredIndex =
  updatedGroups.findIndex(
    group =>
      canonicalCompetitionName(
        group.name
      ) === previousCompetitionKey
  );

selectedCompetitionIndex =
  restoredIndex >= 0
    ? restoredIndex
    : 0;

renderScoreCompetitions(matches);

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
  if (!player || typeof player !== "object") return "";
  if (player.tacticalPosition) return String(player.tacticalPosition);

  /*
   * The API adapter keeps the original provider object in "raw".
   * Read that original object before the simplified pos/position fields,
   * because those fields may only contain D / MID / FWD.
   */
  const sources = [
    player?.raw?.player,
    player?.raw,
    player?.player?.raw?.player,
    player?.player?.raw,
    player?.player,
    player?.games,
    player
  ].filter(value => value && typeof value === "object");

  const candidates = [];
  const addPositionValue = value => {
    if (value === null || value === undefined || value === "") return;
    if (typeof value === "object") {
      for (const key of [
        "displayName", "display_name", "fullName", "full_name",
        "positionName", "position_name", "label", "title",
        "name", "shortName", "short_name", "abbreviation",
        "code", "slug", "value"
      ]) {
        const nested = value[key];
        if (nested !== null && nested !== undefined && String(nested).trim()) {
          candidates.push(String(nested).trim());
        }
      }
      return;
    }
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) candidates.push(text);
    }
  };

  for (const source of sources) {
    for (const key of [
      "position_name", "positionName",
      "position_abbreviation", "positionAbbreviation",
      "position_code", "positionCode",
      "position", "pos", "role"
    ]) addPositionValue(source[key]);

    /* formation_position / lineup_position can be numeric slot IDs, not roles. */
    for (const key of [
      "formation_position", "formationPosition",
      "lineup_position", "lineupPosition"
    ]) {
      const value = source[key];
      if (value === null || value === undefined || value === "") continue;
      if (/^\d+$/.test(String(value).trim())) continue;
      addPositionValue(value);
    }

    if (source.games && typeof source.games === "object") {
      addPositionValue(source.games.position);
    }
  }

  const generic = new Set([
    "g", "gk", "goalkeeper", "keeper", "goalie",
    "d", "df", "def", "defender", "defence", "defense", "back",
    "m", "mf", "mid", "midfielder", "midfield",
    "f", "fw", "fwd", "att", "attacker", "forward"
  ]);

  const keyOf = value => normalizeText(value).replace(/[^a-z0-9]/g, "");
  return candidates.find(value => !generic.has(keyOf(value))) || candidates[0] || "";
}

function getPlayerGrid(player) {
  const values = [
    player?.player?.grid,
    player?.grid,
    player?.raw?.player?.grid,
    player?.raw?.grid,
    player?.player?.position?.grid,
    player?.raw?.player?.position?.grid,
    player?.raw?.position?.grid,
    player?.position?.grid,
    player?.raw?.coordinates?.grid
  ];
  return values.find(value => value !== null && value !== undefined && value !== "") ?? null;
}

function parsePitchGrid(value) {
  if (value === null || value === undefined || value === "") return null;

  if (Array.isArray(value) && value.length >= 2) {
    const row = Number(value[0]), col = Number(value[1]);
    return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0
      ? { row, col } : null;
  }

  if (typeof value === "object") {
    if (value.grid !== undefined) return parsePitchGrid(value.grid);
    const rowRaw = value.row ?? value.line ?? value.y ?? value.vertical;
    const colRaw = value.column ?? value.col ?? value.slot ?? value.x ?? value.horizontal;
    if (rowRaw !== undefined && colRaw !== undefined) {
      const row = Number(rowRaw), col = Number(colRaw);
      return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0
        ? { row, col } : null;
    }
    return null;
  }

  const match = String(value).trim().match(/^(\d+)\s*[:;,]\s*(\d+)$/);
  if (!match) return null;
  const row = Number(match[1]), col = Number(match[2]);
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0
    ? { row, col } : null;
}

function getPlayerFormationSlot(player) {
  const sources = [
    player?.raw?.player,
    player?.raw,
    player?.player?.raw?.player,
    player?.player?.raw,
    player?.player,
    player?.player?.position,
    player?.position,
    player
  ].filter(value => value && typeof value === "object");

  const keys = [
    "formation_position", "formationPosition",
    "formation_position_id", "formationPositionId",
    "formation_slot", "formationSlot",
    "lineup_position", "lineupPosition"
  ];

  for (const source of sources) {
    for (const key of keys) {
      let value = source[key];
      if (value && typeof value === "object") {
        value = value.number ?? value.slot ?? value.position ?? value.value ?? value.id ?? value.code;
      }
      if (value === null || value === undefined || value === "") continue;
      const slot = Number(value);
      if (Number.isInteger(slot) && slot >= 1 && slot <= 11) return slot;
    }
  }
  return null;
}

function formationSlotToGrid(slot, formationRows) {
  if (!Number.isInteger(slot) || slot < 1 || slot > 11 ||
      !Array.isArray(formationRows) ||
      formationRows.reduce((sum, count) => sum + count, 0) !== 10) return null;

  const rows = [1, ...formationRows];
  let remaining = slot - 1;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const count = rows[rowIndex];
    if (remaining < count) {
      /* Provider slot numbers are commonly ordered right-to-left. */
      const column = count - remaining;
      return `${rowIndex + 1}:${column}`;
    }
    remaining -= count;
  }
  return null;
}

function getPlayerCoordinates(player) {
  const objects = [
    player?.player,
    player,
    player?.raw?.player,
    player?.raw,
    player?.player?.raw?.player,
    player?.player?.raw,
    player?.position,
    player?.player?.position,
    player?.raw?.position,
    player?.raw?.player?.position,
    player?.coordinates,
    player?.player?.coordinates,
    player?.raw?.coordinates
  ].filter(value => value && typeof value === "object");

  const xKeys = ["x", "coord_x", "coordinate_x", "pitch_x", "pitchX"];
  const yKeys = ["y", "coord_y", "coordinate_y", "pitch_y", "pitchY"];

  for (const source of objects) {
    const xValue = xKeys.map(key => source[key]).find(value =>
      value !== null && value !== undefined && value !== ""
    );
    const yValue = yKeys.map(key => source[key]).find(value =>
      value !== null && value !== undefined && value !== ""
    );
    if (xValue !== undefined && yValue !== undefined) {
      const x = Number(xValue), y = Number(yValue);
      if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    }
  }

  return null;
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
        injury: 0,
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

      if (type.includes("injur") || type.includes("hurt") || type.includes("medical") || detail.includes("injur") || detail.includes("hurt")) {
        item.injury += 1;
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
    injury: 0,
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

    injury:
      numberOrZero(stats?.injury?.total ?? stats?.injuries?.total) ||
      eventData.injury ||
      0,

    mvp: (() => {
      const sources = [
        player, player?.player, player?.raw, player?.raw?.player,
        performance?.player, performance?.player?.player,
        performance?.statistics
      ].filter(value => value && typeof value === "object");
      return sources.some(source => [
        source.mvp, source.is_mvp, source.isMvp, source.isMVP,
        source.man_of_the_match, source.manOfTheMatch,
        source.player_of_match, source.playerOfMatch,
        source.player_of_the_match, source.playerOfTheMatch,
        source.award, source.awards
      ].some(value => value === true || (
        typeof value === "string" &&
        /^(mvp|man of the match|player of the match|player of the game)$/i.test(value.trim())
      )));
    })(),

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
    normalizeText(position)
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .trim();

  /* GK */
  if (
    pos === "g" ||
    pos === "gk" ||
    pos.includes("goalkeeper") ||
    pos.includes("gardien") ||
    pos.includes("keeper")
  ) {
    return 1;
  }

  /* DEFENCE */
  if (
    pos === "lb" ||
    pos === "lwb" ||
    pos === "lcb" ||
    pos === "cb" ||
    pos === "rcb" ||
    pos === "rb" ||
    pos === "rwb" ||
    pos === "d" ||
    pos === "df" ||
    pos === "def" ||
    pos.includes("back") ||
    pos.includes("defender") ||
    pos.includes("defense")
  ) {
    return 2;
  }

  /* DEFENSIVE MIDFIELD */
  if (
    pos === "ldm" ||
    pos === "dm" ||
    pos === "cdm" ||
    pos === "rdm"
  ) {
    return 3;
  }

  /* CENTRAL / WIDE MIDFIELD */
  if (
    pos === "lm" ||
    pos === "lcm" ||
    pos === "cm" ||
    pos === "mc" ||
    pos === "rcm" ||
    pos === "rm" ||
    pos === "m" ||
    pos === "mf"
  ) {
    return 4;
  }

  /* ATTACKING MIDFIELD */
  if (
    pos === "lam" ||
    pos === "am" ||
    pos === "cam" ||
    pos === "ram"
  ) {
    return 5;
  }

  /* WINGS */
  if (
    pos === "lw" ||
    pos === "lf" ||
    pos === "rw" ||
    pos === "rf" ||
    pos.includes("wing") ||
    pos.includes("winger")
  ) {
    return 6;
  }

  /* FORWARDS */
  if (
    pos === "st" ||
    pos === "cf" ||
    pos === "ss" ||
    pos === "f" ||
    pos === "fw" ||
    pos === "att" ||
    pos.includes("forward") ||
    pos.includes("striker") ||
    pos.includes("attaque")
  ) {
    return 7;
  }

  /* UNKNOWN */
  return 4;
}

function bfNormalizeTacticalRole(value) {
  if (value && typeof value === "object") {
    const fields = [
      "position_name","positionName","position_abbreviation","positionAbbreviation",
      "position_code","positionCode","displayName","display_name","shortName","short_name",
      "abbreviation","name","label","code","slug","value"
    ];
    for (const key of fields) {
      if (value[key] !== null && value[key] !== undefined && String(value[key]).trim()) {
        const parsed = bfNormalizeTacticalRole(value[key]);
        if (parsed && !["DEF","MID","FWD"].includes(parsed)) return parsed;
      }
    }
    for (const key of fields) {
      if (value[key] !== null && value[key] !== undefined && String(value[key]).trim()) {
        const parsed = bfNormalizeTacticalRole(value[key]);
        if (parsed) return parsed;
      }
    }
    return "";
  }
  const text = String(value ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase();
  const key = text.replace(/[^a-z0-9]/g, "");
  const aliases = {
    g:"GK",gk:"GK",goalkeeper:"GK",goalie:"GK",keeper:"GK","1":"GK",
    lb:"LB",leftback:"LB",leftfullback:"LB",dl:"LB",dfl:"LB",
    lwb:"LWB",leftwingback:"LWB",
    lcb:"LCB",leftcentreback:"LCB",leftcenterback:"LCB",dlc:"LCB",dflc:"LCB",
    cb:"CB",centreback:"CB",centerback:"CB",centraldefender:"CB",dc:"CB",dfc:"CB",
    rcb:"RCB",rightcentreback:"RCB",rightcenterback:"RCB",drc:"RCB",dfrc:"RCB",
    rb:"RB",rightback:"RB",rightfullback:"RB",dr:"RB",dfr:"RB",
    rwb:"RWB",rightwingback:"RWB",
    dm:"CDM",cdm:"CDM",defensivemidfielder:"CDM",centraldefensivemidfielder:"CDM",
    holdingmidfielder:"CDM",deeplyingmidfielder:"CDM",deeplyingplaymaker:"CDM",
    ldm:"LDM",leftdefensivemidfielder:"LDM",
    rdm:"RDM",rightdefensivemidfielder:"RDM",
    cm:"CM",mc:"CM",centralmidfielder:"CM",centralmidfield:"CM",mfc:"CM",
    lcm:"LCM",leftcentralmidfielder:"LCM",mcl:"LCM",mflc:"LCM",
    rcm:"RCM",rightcentralmidfielder:"RCM",mcr:"RCM",mfrc:"RCM",
    lm:"LM",leftmidfielder:"LM",ml:"LM",mfl:"LM",
    rm:"RM",rightmidfielder:"RM",mr:"RM",mfr:"RM",
    am:"CAM",cam:"CAM",attackingmidfielder:"CAM",centralattackingmidfielder:"CAM",
    lam:"LAM",leftattackingmidfielder:"LAM",
    ram:"RAM",rightattackingmidfielder:"RAM",
    lw:"LW",leftwing:"LW",leftwinger:"LW",fl:"LW",fwl:"LW",
    rw:"RW",rightwing:"RW",rightwinger:"RW",fr:"RW",fwr:"RW",
    lf:"LF",leftforward:"LF",rf:"RF",rightforward:"RF",
    st:"ST",striker:"ST",fc:"ST",fwc:"ST",cf:"CF",centreforward:"CF",centerforward:"CF",
    ss:"SS",secondstriker:"SS"
  };
  if (aliases[key]) return aliases[key];
  if (["d","df","def","defender","defence","defense","back"].includes(key) || key.includes("defender")) return "DEF";
  if (["m","mf","mid","midfielder","midfield"].includes(key) || key.includes("midfielder")) return "MID";
  if (["f","fw","fwd","att","attacker","forward"].includes(key) || key.includes("forward")) return "FWD";
  const splitAliases = {
    "d l":"LB","df l":"LB","d lc":"LCB","df lc":"LCB","d c":"CB","df c":"CB",
    "d rc":"RCB","df rc":"RCB","d r":"RB","df r":"RB",
    "m l":"LM","mf l":"LM","m lc":"LCM","mf lc":"LCM","m c":"CM","mf c":"CM",
    "m rc":"RCM","mf rc":"RCM","m r":"RM","mf r":"RM",
    "f l":"LW","fw l":"LW","f c":"ST","fw c":"ST","f r":"RW","fw r":"RW"
  };
  return splitAliases[text] || "";
}

function bfRoleGroup(role) {
  const value = bfNormalizeTacticalRole(role);
  if (value === "GK") return "gk";
  if (["DEF","LB","LCB","CB","RCB","RB","LWB","RWB"].includes(value)) return "def";
  if (["MID","CDM","LDM","RDM","CM","LCM","RCM","CAM","LAM","RAM","LM","RM"].includes(value)) return "mid";
  if (["FWD","LW","RW","LF","RF","ST","CF","SS"].includes(value)) return "fwd";
  return "";
}

function bfFormationRoleRows(formation) {
  let text = String(formation || "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‐‑‒–—−]/g, "-").replace(/\s+/g, "");
  if (/^\d{3,4}$/.test(text)) text = text.split("").join("-");
  const counts = text.split("-").map(Number);
  if (counts.length < 2 || counts.length > 5 ||
      counts.some(n => !Number.isInteger(n) || n < 1 || n > 5) ||
      counts.reduce((sum,n)=>sum+n,0) !== 10) return null;

  const templates = {
    "4-3-3":[["LB","CB","CB","RB"],["CDM","CM","CM"],["LW","ST","RW"]],
    "4-2-3-1":[["LB","CB","CB","RB"],["CDM","CDM"],["LW","CAM","RW"],["ST"]],
    "4-4-2":[["LB","CB","CB","RB"],["LM","CM","CM","RM"],["ST","ST"]],
    "4-1-4-1":[["LB","CB","CB","RB"],["CDM"],["LW","CM","CM","RW"],["ST"]],
    "4-5-1":[["LB","CB","CB","RB"],["LM","CM","CDM","CM","RM"],["ST"]],
    "4-2-2-2":[["LB","CB","CB","RB"],["CDM","CDM"],["CAM","CAM"],["ST","ST"]],
    "4-3-1-2":[["LB","CB","CB","RB"],["CDM","CM","CM"],["CAM"],["ST","ST"]],
    "4-3-2-1":[["LB","CB","CB","RB"],["CDM","CM","CM"],["LAM","RAM"],["ST"]],
    "4-4-1-1":[["LB","CB","CB","RB"],["LM","CM","CM","RM"],["CAM"],["ST"]],
    "3-4-3":[["LCB","CB","RCB"],["LWB","CM","CM","RWB"],["LW","ST","RW"]],
    "3-5-2":[["LCB","CB","RCB"],["LWB","CM","CDM","CM","RWB"],["ST","ST"]],
    "5-3-2":[["LWB","LCB","CB","RCB","RWB"],["CDM","CM","CM"],["ST","ST"]],
    "5-4-1":[["LWB","LCB","CB","RCB","RWB"],["LM","CM","CM","RM"],["ST"]],
    "5-2-3":[["LWB","LCB","CB","RCB","RWB"],["CDM","CM"],["LW","ST","RW"]],
    "3-4-2-1":[["LCB","CB","RCB"],["LWB","CM","CM","RWB"],["LAM","RAM"],["ST"]],
    "4-1-2-1-2":[["LB","CB","CB","RB"],["CDM"],["LCM","RCM"],["CAM"],["ST","ST"]]
  };
  if (templates[text] && templates[text].length===counts.length &&
      templates[text].every((row,i)=>row.length===counts[i])) return templates[text].map(row=>row.slice());

  const backs = counts[0] === 5 ? ["LWB","LCB","CB","RCB","RWB"]
    : counts[0] === 4 ? ["LB","CB","CB","RB"]
    : counts[0] === 3 ? ["LCB","CB","RCB"]
    : counts[0] === 2 ? ["CB","CB"] : ["CB"];
  const nFront = counts[counts.length-1];
  const forwards = nFront === 3 ? ["LW","ST","RW"] : nFront===2 ? ["ST","ST"] : Array.from({length:nFront},()=> "ST");
  const rows = [backs];
  for(let i=1;i<counts.length-1;i++){
    const n=counts[i];
    if(n===5) rows.push(["LM","CM","CDM","CM","RM"]);
    else if(n===4) rows.push(counts.length===3?["LM","CM","CM","RM"]:["LWB","CM","CM","RWB"]);
    else if(n===3) rows.push(["CDM","CM","CM"]);
    else if(n===2) rows.push(i===counts.length-2 && counts.length>=4?["CAM","CAM"]:["CDM","CDM"]);
    else rows.push(["CDM"]);
  }
  rows.push(forwards);
  return rows.every((row,i)=>row.length===counts[i]) ? rows : null;
}

function bfAssignFormationRoles(players, formation, readPosition) {
  if (!Array.isArray(players) || !players.length) return [];
  const shape = bfFormationRoleRows(formation);
  const parsed = players.map((player,index)=>{
    const role = bfNormalizeTacticalRole(readPosition(player));
    return {player,index,role,group:bfRoleGroup(role),generic:["DEF","MID","FWD"].includes(role)||!role,slot:null,assigned:false};
  });
  if (!shape) {
    return parsed.map(item=>({...item.player,tacticalPosition:item.role||item.player?.tacticalPosition||""}));
  }

  const slots=[];
  shape.forEach((row,rowIndex)=>row.forEach((role,col)=>slots.push({role,row:rowIndex+1,col,rowSize:row.length,used:false})));
  const slotFamily=role=>{
    if(["LB","LCB","CB","RCB","RB","LWB","RWB"].includes(role))return "def";
    if(["CDM","LDM","RDM","CM","LCM","RCM","CAM","LAM","RAM","LM","RM"].includes(role))return "mid";
    if(["LW","RW","LF","RF","ST","CF","SS"].includes(role))return "fwd";
    return "";
  };
  const occupy=(entry,slot,label)=>{
    if(!slot)return;
    slot.used=true;entry.slot=slot;entry.assigned=true;entry.finalRole=label||slot.role;
  };

  parsed.filter(item=>item.group==="gk").forEach(item=>{
    item.slot={role:"GK",row:0,col:0,rowSize:1,used:true};
    item.assigned=true;item.finalRole="GK";
  });

  parsed.filter(item=>item.group && !item.generic && item.group!=="gk").forEach(entry=>{
    let options=slots.filter(slot=>!slot.used&&slot.role===entry.role);
    if(!options.length) options=slots.filter(slot=>!slot.used&&slotFamily(slot.role)===entry.group).sort((a,b)=>a.row-b.row||a.col-b.col);
    if(!options.length) options=slots.filter(slot=>!slot.used);
    if(options.length){
      const slot=options[0];
      const label=slot.role===entry.role ? entry.role :
        (entry.role==="CB"&&["LCB","RCB"].includes(slot.role)) ||
        (entry.role==="CM"&&["LCM","RCM"].includes(slot.role)) ||
        (entry.role==="CDM"&&["LDM","RDM"].includes(slot.role)) ||
        (entry.role==="CAM"&&["LAM","RAM"].includes(slot.role)) ? slot.role : entry.role;
      occupy(entry,slot,label);
    }
  });

  const lastRow=shape.length;
  let defPool=slots.filter(slot=>slot.row===1&&!slot.used);
  let midPool=slots.filter(slot=>slot.row>1&&slot.row<lastRow&&!slot.used);
  let frontPool=slots.filter(slot=>slot.row===lastRow&&!slot.used);
  const genericIn=group=>parsed.filter(item=>!item.assigned&&item.group===group);
  const genericDef=genericIn("def"),genericMid=genericIn("mid"),genericFwd=genericIn("fwd");
  const moveFlexible=(from,to,amount,priority)=>{
    for(const role of priority){
      for(let i=from.length-1;i>=0&&amount>0;i--){
        if(from[i].role===role){const slot=from.splice(i,1)[0];to.push(slot);amount--;}
      }
    }
  };
  if(genericFwd.length>frontPool.length) moveFlexible(midPool,frontPool,genericFwd.length-frontPool.length,["LW","RW","LAM","RAM","CAM","SS","CF"]);
  if(genericFwd.length<frontPool.length) moveFlexible(frontPool,midPool,frontPool.length-genericFwd.length,["LW","RW","CF","SS","LAM","RAM","CAM"]);
  const assign=(entries,pool,group)=>{
    entries.forEach(entry=>{
      let slot=pool.shift();
      if(!slot) slot=slots.find(s=>!s.used&&(!group||slotFamily(s.role)===group))||slots.find(s=>!s.used);
      if(slot)occupy(entry,slot,slot.role);
    });
  };
  assign(genericDef,defPool,"def");
  assign(genericMid,midPool,"mid");
  assign(genericFwd,frontPool,"fwd");

  const unknown=parsed.filter(item=>!item.assigned);
  if(players.length===11&&!parsed.some(item=>item.group==="gk")&&unknown.length===1&&slots.filter(slot=>slot.used).length===10){
    const item=unknown[0];item.slot={role:"GK",row:0,col:0,rowSize:1,used:true};item.assigned=true;item.finalRole="GK";
  }
  const remaining=slots.filter(slot=>!slot.used).sort((a,b)=>a.row-b.row||a.col-b.col);
  parsed.filter(item=>!item.assigned).forEach(item=>{const slot=remaining.shift();if(slot)occupy(item,slot,slot.role);});

  return parsed.map(item=>({
    ...item.player,
    tacticalPosition:item.finalRole||item.role||"",
    _tacticRow:item.slot?item.slot.row:null,
    _tacticCol:item.slot?item.slot.col:null,
    _tacticRowSize:item.slot?item.slot.rowSize:0,
    _tacticRowCount:shape.length+1
  }));
}

function getPitchPlayers(lineup) {
  if (!lineup) return [];

  const starters = Array.isArray(lineup?.startXI)
    ? lineup.startXI.slice(0, 11)
    : [];
  if (!starters.length) return [];

  /* Never invent 4-3-3: preserve only a real formation from the source. */
  const rawFormation = typeof lineup?.formation === "object"
    ? (lineup?.formation?.name || lineup?.formation?.label || lineup?.formation?.value || "")
    : (lineup?.formation || lineup?.tacticalFormation || lineup?.formationName || lineup?.formation_name || "");
  const formation = String(rawFormation).trim().replace(/[‐‑‒–—−]/g, "-").replace(/\s+/g, "");
  let formationRows = formation.split("-").map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (!formationRows.length || formationRows.reduce((sum, n) => sum + n, 0) !== 10) {
    formationRows = null;
  }

  const players = starters.map((entry, index) => {
    const player = entry?.player || entry || {};
    const nativeGrid = parsePitchGrid(getPlayerGrid(entry));
    const parsed = nativeGrid;
    const coords = getPlayerCoordinates(entry);
    return {
      ...entry,
      player,
      index,
      row: parsed?.row ?? null,
      col: parsed?.col ?? null,
      sourceX: coords?.x ?? null,
      sourceY: coords?.y ?? null,
      coordinatesOriented: !!(entry?.coordinatesOriented || entry?.player?.coordinatesOriented || entry?.raw?.coordinatesOriented)
    };
  });

  /* Validate the provider's exact grid/slot data independently of the formation default. */
  const gridCells = players.map(item => `${item.row}:${item.col}`);
  const gridRows = [...new Set(players
    .filter(item => Number.isInteger(item.row) && Number.isInteger(item.col))
    .map(item => item.row))].sort((a, b) => a - b);
  const validGrid =
    players.length === 11 &&
    players.every(item =>
      Number.isInteger(item.row) && item.row >= 1 &&
      Number.isInteger(item.col) && item.col >= 1 && item.col <= 5
    ) &&
    new Set(gridCells).size === gridCells.length &&
    gridRows.length >= 3 && gridRows.length <= 5 &&
    gridRows.every(row => players.filter(item => item.row === row).length <= 5);

  const withPitchMetadata = players.map(item => ({
    ...item,
    _grid: validGrid ? `${item.row}:${item.col}` : "",
    _formationRows: formationRows,
    _formation: formation || "",
    _providerGrid: validGrid
  }));
  return bfAssignFormationRoles(withPitchMetadata, formation, getPlayerPosition);
}

function makePitchCoordinates(pitchPlayers, side) {
  if (!Array.isArray(pitchPlayers) || !pitchPlayers.length) return [];

  const players = pitchPlayers.slice(0, 11);

  /* 1) Use actual provider coordinates before any inferred layout. */
  const xyEntries = players.map(item => ({
    item,
    x: Number(item?.sourceX),
    y: Number(item?.sourceY),
    coordinatesOriented: !!item?.coordinatesOriented
  }));
  const xyValuesValid = players.length === 11 && xyEntries.every(entry =>
    Number.isFinite(entry.x) && Number.isFinite(entry.y) &&
    entry.x >= 0 && entry.y >= 0 && entry.x <= 120 && entry.y <= 100
  );

  if (xyValuesValid) {
    const xs = xyEntries.map(entry => entry.x);
    const ys = xyEntries.map(entry => entry.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const normalized = maxX <= 1 && maxY <= 1 &&
      maxX - minX >= 0.2 && maxY - minY >= 0.2;
    const integerGrid = xs.every(value => Number.isInteger(value) && value >= 1 && value <= 11) &&
      ys.every(value => Number.isInteger(value) && value >= 1 && value <= 11) &&
      maxX - minX >= 3 && maxY - minY >= 3;
    const pitchUnits = maxX > 100;
    const percentages = !pitchUnits && maxX > 11 && maxY > 11 &&
      maxX - minX >= 15 && maxY - minY >= 15;

    if (normalized || integerGrid || pitchUnits || percentages) {
      return xyEntries.map(entry => {
        let x = entry.x, y = entry.y;
        if (normalized) {
          x = 8 + x * 84;
          y = 8 + y * 84;
        } else if (integerGrid) {
          x = 8 + ((x - 1) / 10) * 84;
          y = 8 + ((y - 1) / 10) * 84;
        } else if (pitchUnits) {
          const pitchLength = maxX > 105 ? 120 : 105;
          const pitchWidth = maxY > 68 ? 80 : 68;
          x = 8 + (x / pitchLength) * 84;
          y = 8 + (y / pitchWidth) * 84;
        }
        if (side === "away" && !entry.coordinatesOriented) y = 100 - y;
        return {
          ...entry.item,
          _x: Math.max(5, Math.min(95, x)),
          _y: Math.max(5, Math.min(95, y))
        };
      });
    }
  }

  /* 2) Use the official lineup grid without assuming any specific formation. */
  const gridEntries = players.map(item => {
    const parsed = parsePitchGrid(item?._grid) || parsePitchGrid(getPlayerGrid(item));
    return { item, row: parsed?.row ?? null, col: parsed?.col ?? null };
  });
  const gridRows = [...new Set(gridEntries.filter(item =>
    Number.isInteger(item.row) && Number.isInteger(item.col)
  ).map(item => item.row))].sort((a, b) => a - b);
  const gridCells = gridEntries.map(item => `${item.row}:${item.col}`);
  const gridUsable =
    players.length === 11 &&
    gridEntries.every(item =>
      Number.isInteger(item.row) && item.row >= 0 &&
      Number.isInteger(item.col) && item.col >= 0 && item.col <= 10
    ) &&
    new Set(gridCells).size === gridCells.length &&
    gridRows.length >= 3 && gridRows.length <= 5 &&
    gridRows.every(row => gridEntries.filter(item => item.row === row).length <= 5);

  if (gridUsable) {
    return gridEntries.map(entry => {
      const columns = [...new Set(gridEntries.filter(other => other.row === entry.row)
        .map(other => other.col))].sort((a, b) => a - b);
      const columnIndex = columns.indexOf(entry.col);
      const x = columns.length <= 1 ? 50 : 10 + 80 * columnIndex / (columns.length - 1);
      const rowIndex = gridRows.indexOf(entry.row);
      let y = gridRows.length <= 1 ? 50 : 8 + 84 * rowIndex / (gridRows.length - 1);
      if (side === "away") y = 100 - y;
      return {
        ...entry.item,
        _x: Math.max(5, Math.min(95, x)),
        _y: Math.max(5, Math.min(95, y))
      };
    });
  }

  /* 3) Use the declared formation when official player coordinates/grid are absent. */
  const tacticalEntries = players.map(item => ({
    item, row:Number(item?._tacticRow), col:Number(item?._tacticCol),
    rowSize:Number(item?._tacticRowSize), rowCount:Number(item?._tacticRowCount)
  }));
  const tacticalUsable = players.length===11 &&
    tacticalEntries.every(entry=>Number.isInteger(entry.row)&&entry.row>=0&&
      Number.isInteger(entry.col)&&entry.col>=0&&Number.isInteger(entry.rowSize)&&
      entry.rowSize>=1&&entry.col<entry.rowSize&&entry.rowCount>=3) &&
    new Set(tacticalEntries.map(entry=>entry.row+":"+entry.col)).size===11;
  if(tacticalUsable){
    return tacticalEntries.map(entry=>{
      const x=entry.rowSize<=1?50:10+80*entry.col/(entry.rowSize-1);
      let y=8+84*entry.row/Math.max(1,entry.rowCount-1);
      if(side==="away")y=100-y;
      return {...entry.item,_x:Math.max(5,Math.min(95,x)),_y:Math.max(5,Math.min(95,y))};
    });
  }

  /* 3b) If there is a genuine formation string, use its row counts. */
  const declaredRows = players.find(item => Array.isArray(item?._formationRows))?._formationRows;
  let formationRows = Array.isArray(declaredRows) ? declaredRows.map(Number).filter(n => n > 0) : null;
  if (!formationRows || !formationRows.length || formationRows.reduce((sum, n) => sum + n, 0) !== 10) {
    formationRows = null;
  }

  const positionText = item => {
    const value = getPlayerPosition(item);
    if (value && typeof value === "object") {
      return normalizeText(value.displayName || value.name || value.label || value.abbreviation || "");
    }
    return normalizeText(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  };
  const positionKey = item => positionText(item).replace(/[^a-z0-9]/g, "");

  function positionBucket(item) {
    const p = positionText(item);
    const k = positionKey(item);
    if (["g", "gk", "goalkeeper", "keeper", "goalie"].includes(k) ||
        p.includes("goalkeeper") || p.includes("goalie") || p.includes("keeper")) return "gk";

    if (["d", "df", "def", "defender", "defence", "defense", "back",
      "lb", "lwb", "lcb", "cb", "rcb", "rb", "rwb"].includes(k) ||
        p.includes("defender") || p.includes("defence") || p.includes("defense") ||
        p.includes("back") || p.includes("centre back") || p.includes("center back")) return "def";

    if (["m", "mf", "mid", "midfielder", "midfield", "cm", "mc", "lcm", "rcm",
      "dm", "cdm", "ldm", "rdm", "am", "cam", "lam", "ram", "lm", "rm", "lwm", "rwm"].includes(k) ||
        p.includes("midfielder") || p.includes("midfield")) return "mid";

    if (["f", "fw", "fwd", "att", "attacker", "forward", "st", "cf", "ss",
      "lw", "rw", "lf", "rf"].includes(k) ||
        p.includes("striker") || p.includes("forward") || p.includes("winger") ||
        p.includes("left wing") || p.includes("right wing")) return "att";

    return "unknown";
  }

  function laneRank(item) {
    const p = positionText(item);
    const k = positionKey(item);
    if (["lb", "lwb", "lcb", "lcm", "ldm", "lm", "lam", "lw", "lf", "lst", "lwm"].includes(k) ||
        p.startsWith("left ")) return 0;
    if (["rb", "rwb", "rcb", "rcm", "rdm", "rm", "ram", "rw", "rf", "rst", "rwm"].includes(k) ||
        p.startsWith("right ")) return 4;
    return 2;
  }

  function midpointScore(item, lineIndex) {
    const k = positionKey(item);
    const p = positionText(item);
    if (!formationRows || formationRows.length < 4) return 0;
    if (lineIndex === 1) {
      if (["dm", "cdm", "ldm", "rdm"].includes(k) || p.includes("defensive midfielder")) return 35;
      if (["am", "cam", "lam", "ram"].includes(k) || p.includes("attacking midfielder")) return -15;
    }
    if (lineIndex === formationRows.length - 2) {
      if (["am", "cam", "lam", "ram", "lm", "rm", "lw", "rw", "lf", "rf"].includes(k) ||
          p.includes("attacking midfielder") || p.includes("winger")) return 35;
      if (["dm", "cdm", "ldm", "rdm"].includes(k) || p.includes("defensive midfielder")) return -15;
      if (["st", "cf", "ss", "striker"].includes(k) || p.includes("striker")) return -25;
    }
    return 0;
  }

  /* No official formation/grid: position a pitch only when every player has a specific tactical role. */
  {
    const roleLayouts = {
      gk: { x: 50, y: 8, key: "gk" },
      lb: { x: 12, y: 28, key: "def" }, lwb: { x: 8, y: 40, key: "wingback" },
      lcb: { x: 32, y: 28, key: "def" }, cb: { x: 50, y: 28, key: "def" },
      rcb: { x: 68, y: 28, key: "def" }, rb: { x: 88, y: 28, key: "def" },
      rwb: { x: 92, y: 40, key: "wingback" },
      ldm: { x: 34, y: 43, key: "dm" }, dm: { x: 50, y: 43, key: "dm" },
      cdm: { x: 50, y: 43, key: "dm" }, rdm: { x: 66, y: 43, key: "dm" },
      lm: { x: 12, y: 53, key: "mid" }, lcm: { x: 34, y: 53, key: "mid" },
      cm: { x: 50, y: 53, key: "mid" }, mc: { x: 50, y: 53, key: "mid" },
      rcm: { x: 66, y: 53, key: "mid" }, rm: { x: 88, y: 53, key: "mid" },
      lam: { x: 32, y: 64, key: "am" }, am: { x: 50, y: 64, key: "am" },
      cam: { x: 50, y: 64, key: "am" }, ram: { x: 68, y: 64, key: "am" },
      lw: { x: 12, y: 76, key: "wing" }, lf: { x: 28, y: 78, key: "wing" },
      st: { x: 50, y: 84, key: "striker" }, cf: { x: 50, y: 84, key: "striker" },
      ss: { x: 50, y: 76, key: "striker" }, rf: { x: 72, y: 78, key: "wing" },
      rw: { x: 88, y: 76, key: "wing" }
    };
    const exact = players.map(item => {
      const key = positionKey(item);
      let role = roleLayouts[key] || null;
      if (!role) {
        const p = positionText(item);
        const synonyms = [
          [/goalkeeper|goalie|keeper/, "gk"],
          [/left wing back/, "lwb"], [/right wing back/, "rwb"],
          [/left back|left full back|left fullback/, "lb"],
          [/right back|right full back|right fullback/, "rb"],
          [/left centre back|left center back/, "lcb"],
          [/right centre back|right center back/, "rcb"],
          [/centre back|center back|central defender/, "cb"],
          [/left defensive midfield|left defensive midfielder/, "ldm"],
          [/right defensive midfield|right defensive midfielder/, "rdm"],
          [/defensive midfield|defensive midfielder/, "cdm"],
          [/left central midfield|left central midfielder/, "lcm"],
          [/right central midfield|right central midfielder/, "rcm"],
          [/central midfield|central midfielder/, "cm"],
          [/left midfield|left midfielder/, "lm"],
          [/right midfield|right midfielder/, "rm"],
          [/left attacking midfield|left attacking midfielder/, "lam"],
          [/right attacking midfield|right attacking midfielder/, "ram"],
          [/attacking midfield|attacking midfielder/, "cam"],
          [/left winger|left wing/, "lw"], [/right winger|right wing/, "rw"],
          [/striker/, "st"], [/centre forward|center forward/, "cf"]
        ];
        const found = synonyms.find(([regex]) => regex.test(p));
        if (found) role = roleLayouts[found[1]];
      }
      return { item, role, key };
    });
    if (exact.every(entry => entry.role)) {
      const grouped = new Map();
      exact.forEach(entry => {
        const groupKey = entry.role.key;
        if (!grouped.has(groupKey)) grouped.set(groupKey, []);
        grouped.get(groupKey).push(entry);
      });
      const result = [];
      for (const [groupKey, group] of grouped.entries()) {
        group.sort((a,b) => laneRank(a.item) - laneRank(b.item));
        group.forEach((entry,index) => {
          const base = entry.role;
          const offset = group.length > 1 ? (index - (group.length - 1) / 2) * 7 : 0;
          let y = base.y;
          if (side === "away") y = 100 - y;
          result.push({
            ...entry.item,
            _x: Math.max(5, Math.min(95, base.x + offset)),
            _y: Math.max(5, Math.min(95, y))
          });
        });
      }
      return result;
    }

    /* Honest fallback: do not draw a made-up 4-3-3 for generic D/MID/FWD data. */
    return [];
  }

  /* Exact coordinates, grid or specific source-role labels only. Generic D/M/F plus a formation is not enough. */
  return [];
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
  const badges = [];
  const add = (label, value, kind) => {
    if (!value) return;
    badges.push('<span class="bf-player-action bf-player-action--' + kind + '">' + label + '</span>');
  };
  const rating = Number(playerData?.rating);
  if (playerData?.rating !== null && playerData?.rating !== undefined && playerData?.rating !== "" && Number.isFinite(rating)) add(rating.toFixed(1), true, "rating");
  const goals = numberOrZero(playerData?.goals), assists = numberOrZero(playerData?.assists);
  add("G " + goals, goals > 0, "goal");
  add("A " + assists, assists > 0, "assist");
  add("YC", numberOrZero(playerData?.yellow) > 0, "yellow");
  add("RC", numberOrZero(playerData?.red) > 0, "red");
  add("INJ", numberOrZero(playerData?.injury) > 0, "injury");
  add("MVP", playerData?.mvp === true, "mvp");
  add("KP " + numberOrZero(playerData?.keyPasses), numberOrZero(playerData?.keyPasses) > 0, "keypass");
  add("C", playerData?.captain === true, "captain");
  return badges.join("");
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
    <div class="bf-player-row" role="button" tabindex="0"
      data-bf-player-name="${escapeHTML(playerData?.name || "Joueur")}"
      data-bf-player-number="${escapeHTML(playerData?.number ?? "-")}"
      data-bf-player-position="${escapeHTML(playerData?.position || "")}"
      data-bf-player-minutes="${escapeHTML(playerData?.minutes ?? "")}"
      data-bf-player-rating="${escapeHTML(playerData?.rating ?? "")}"
      data-bf-player-goals="${escapeHTML(playerData?.goals ?? 0)}"
      data-bf-player-assists="${escapeHTML(playerData?.assists ?? 0)}">

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

function renderPitchPlayer(playerData, x, y) {
  const rating = Number(playerData?.rating);
  const hasRating = playerData?.rating !== null && playerData?.rating !== undefined && playerData?.rating !== "" && Number.isFinite(rating);
  const badges = [];
  const add = (label, value, kind) => {
    if (value) badges.push('<span class="bf-pitch-chip bf-pitch-chip--' + kind + '">' + label + '</span>');
  };
  add("G " + numberOrZero(playerData?.goals), numberOrZero(playerData?.goals) > 0, "goal");
  add("A " + numberOrZero(playerData?.assists), numberOrZero(playerData?.assists) > 0, "assist");
  add("YC", numberOrZero(playerData?.yellow) > 0, "yellow");
  add("RC", numberOrZero(playerData?.red) > 0, "red");
  add("INJ", numberOrZero(playerData?.injury) > 0, "injury");
  add(playerData?.mvpEstimated ? "MVP*" : "MVP", playerData?.mvp === true, "mvp");
  return '<div class="bf-pitch-player" role="button" tabindex="0" data-bf-player-name="' + escapeHTML(playerData?.name || "Joueur") + '" data-bf-player-number="' + escapeHTML(playerData?.number ?? "?") + '" data-bf-player-position="' + escapeHTML(playerData?.position || "") + '" data-bf-player-rating="' + escapeHTML(playerData?.rating ?? "") + '" data-bf-player-goals="' + escapeHTML(playerData?.goals ?? 0) + '" data-bf-player-assists="' + escapeHTML(playerData?.assists ?? 0) + '" style="left:' + x + '%;top:' + y + '%;" title="' + escapeHTML(playerData?.name || "") + '">' +
    '<div class="bf-pitch-role">' + escapeHTML(playerData?.position || "—") + '</div>' +
    '<div class="bf-pitch-identity"><span class="bf-shirt">' + escapeHTML(playerData?.number ?? "?") + '</span><span class="bf-pitch-name">' + escapeHTML(shortPlayerName(playerData?.name)) + '</span></div>' +
    (badges.length ? '<div class="bf-pitch-markers">' + badges.join("") + '</div>' : "") +
    (hasRating ? '<span class="bf-pitch-rating">' + rating.toFixed(1) + '</span>' : "") +
    '</div>';
}
/* =========================================================
   PITCH
========================================================= */

function pitchPlayerIdentityKey(data) {
  const id=data?.id;
  if(id!==null && id!==undefined && String(id).trim()) return `id-${String(id).trim()}`;
  const name=normalizeText(data?.name || "");
  return name ? `name-${name}` : "";
}

function getMatchMvpCandidate(homeLineup, awayLineup, homeId, awayId, performanceMap, eventMap) {
  const entries = [
    ...(Array.isArray(homeLineup?.startXI) ? homeLineup.startXI.map(player=>({player,teamId:homeId})) : []),
    ...(Array.isArray(awayLineup?.startXI) ? awayLineup.startXI.map(player=>({player,teamId:awayId})) : [])
  ];
  const candidates=entries.map(entry=>getPlayerData(entry.player,entry.teamId,performanceMap,eventMap));
  const official=candidates.find(player=>player.mvp===true);
  if(official){const key=pitchPlayerIdentityKey(official);if(key)return {key,official:true,name:official.name,rating:official.rating};}
  const rated=candidates.filter(player=>player.rating!==null&&player.rating!==undefined&&player.rating!==""&&Number.isFinite(Number(player.rating))&&Number(player.rating)>=0&&Number(player.rating)<=10)
    .sort((a,b)=>Number(b.rating)-Number(a.rating));
  if(!rated.length)return null;
  const best=rated[0],key=pitchPlayerIdentityKey(best);
  return key?{key,official:false,name:best.name,rating:best.rating}:null;
}
function renderPitch(
  lineup,
  teamName,
  side,
  teamId,
  performanceMap,
  eventMap,
  mvpCandidate = null
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

      const identityKey=pitchPlayerIdentityKey(data);
      const selectedForMvp=!!mvpCandidate && identityKey===mvpCandidate.key;
      return {
        data:{
          ...data,
          mvp:data.mvp===true || selectedForMvp,
          mvpEstimated:selectedForMvp && !mvpCandidate.official && data.mvp!==true
        },
        x:item._x,
        y:item._y
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

  if (!positioned.length) {
    return `
      <div class="bf-pitch-box">
        <div class="bf-pitch-title">
          <span>${escapeHTML(teamName)}</span>
          <span class="bf-pitch-formation">Formation non disponible</span>
        </div>
        <div class="bf-detail-item" style="min-height:140px;display:flex;align-items:center;justify-content:center;text-align:center;padding:18px;">
          La source ne fournit pas la formation tactique ou les positions exactes pour cette rencontre. Aucun 4-3-3 fictif n’est affiché.
        </div>
      </div>
    `;
  }

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
                    ? `Note ${escapeHTML(
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

  const mvpCandidate=getMatchMvpCandidate(
    homeLineup,awayLineup,homeId,awayId,performanceMap,eventMap
  );

  return `

    <div class="bf-detail-section">

      <h3>
        Formations et compositions
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
                eventMap,
                mvpCandidate
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
                eventMap,
                mvpCandidate
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
      ${mvpCandidate && !mvpCandidate.official ? '<div class="bf-mvp-note">MVP estimé à partir de la meilleure note disponible; la source ne le désigne pas officiellement.</div>' : ""}

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
        Notes des joueurs
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
        Remplaçants
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
  const type=normalizeText(typeof event==="string" ? event : (event?.type || event?.detail || ""));
  const detail=normalizeText(typeof event==="object" ? event?.detail || "" : "");
  if(type.includes("goal")||type.includes("but")||type.includes("score"))return detail.includes("own")?"OWN GOAL":"BUT";
  if(type.includes("card") && (detail.includes("red")||detail.includes("second yellow")||detail.includes("yellow-red")))return "RC";
  if(type.includes("card")||type.includes("yellow"))return "YC";
  if(type.includes("subst"))return "SUB";
  if(type.includes("var"))return "VAR";
  if(type.includes("injur")||type.includes("hurt"))return "INJ";
  return "EVENT";
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
          Événements
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
              Passe décisive :
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
        Événements
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
  const groups=normalizeStatistics(statistics);
  if(!groups.length)return '<div class="bf-detail-item">Aucune statistique disponible.</div>';
  const homeBlock=groups[0]||{},awayBlock=groups[1]||{};
  const homeName=homeBlock?.team?.name||"Domicile",awayName=awayBlock?.team?.name||"Extérieur";
  const homeStats=flattenStatsForTeam(homeBlock),awayStats=flattenStatsForTeam(awayBlock);
  const preferredStats=[
    {key:"ball possession",label:"Possession"},{key:"total shots",label:"Tirs"},
    {key:"shots on goal",label:"Tirs cadrés"},{key:"corner kicks",label:"Corners"},
    {key:"offsides",label:"Hors-jeu"},{key:"fouls",label:"Fautes"},
    {key:"yellow cards",label:"Cartons jaunes"},{key:"red cards",label:"Cartons rouges"},
    {key:"goalkeeper saves",label:"Arrêts"}
  ];
  const keys=new Set([...Object.keys(homeStats),...Object.keys(awayStats)]);
  const used=preferredStats.filter(stat=>keys.has(stat.key));
  keys.forEach(key=>{if(!used.some(item=>item.key===key))used.push({key,label:key});});
  const numeric=value=>{if(value===null||value===undefined||value==="")return null;const n=Number(String(value).replace("%","").replace(",",".").replace(/[^\d.\-]/g,""));return Number.isFinite(n)?n:null;};
  const rows=used.slice(0,14).map(stat=>{
    const hv=homeStats[stat.key]??"-",av=awayStats[stat.key]??"-";
    const h=numeric(hv),a=numeric(av),total=Math.max(0,h||0)+Math.max(0,a||0);
    const hw=total>0&&h!==null?Math.max(0,Math.min(100,h/total*100)):50;
    const aw=total>0&&a!==null?Math.max(0,Math.min(100,a/total*100)):50;
    return '<div class="bf-stat-row"><div class="bf-stat-value-home">'+escapeHTML(formatStatValue(hv))+'</div><div class="bf-stat-name">'+escapeHTML(stat.label)+'</div><div class="bf-stat-value-away">'+escapeHTML(formatStatValue(av))+'</div><div class="bf-stat-track"><span class="bf-stat-home" style="width:'+hw.toFixed(1)+'%"></span><span class="bf-stat-away" style="width:'+aw.toFixed(1)+'%"></span></div></div>';
  }).join("");
  return '<div class="bf-stat-teams"><div>'+escapeHTML(homeName)+'</div><span>VS</span><div>'+escapeHTML(awayName)+'</div></div><div class="bf-stat-table">'+rows+'</div>';
}
/* =========================================================
   MATCH INFORMATION
========================================================= */

function renderMatchInformation(details) {
  const firstText = (...values) => {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      if (typeof value === "object") {
        const nested = value.name || value.title || value.label || value.short_name;
        if (nested !== undefined && nested !== null && String(nested).trim()) return String(nested).trim();
        continue;
      }
      const text = String(value).trim();
      if (text && text !== "[object Object]" && text !== "null" && text !== "undefined") return text;
    }
    return "";
  };

  const venueObject = details?.fixture?.venue || details?.venue || details?.stadium || details?.ground || null;
  const venue = firstText(
    venueObject?.name, venueObject?.stadium, venueObject?.ground,
    typeof venueObject === "string" ? venueObject : "",
    details?.fixture?.stadium, details?.stadium_name, details?.ground_name
  );
  const city = firstText(
    venueObject?.city, details?.fixture?.venue_city, details?.venue_city, details?.city
  );
  const referee = firstText(
    details?.fixture?.referee?.name, details?.fixture?.referee,
    details?.referee?.name, details?.referee, details?.officials?.referee?.name,
    Array.isArray(details?.officials)
      ? details.officials.find(item => /referee|arbitre/i.test(String(item?.type || item?.role || "")))?.name
      : ""
  );
  const channel = firstText(
    details?.broadcast?.name, details?.broadcast?.channel,
    details?.tv?.name, details?.tv?.channel,
    details?.fixture?.broadcast?.name, details?.fixture?.broadcast,
    details?.fixture?.tv?.name, details?.fixture?.tv,
    details?.broadcast_channel, details?.tv_channel, details?.channel,
    Array.isArray(details?.broadcasts) ? details.broadcasts[0]?.name : "",
    Array.isArray(details?.channels) ? details.channels[0]?.name : ""
  );
  const round = firstText(details?.league?.round, details?.round, details?.round_name, details?.stage);
  const season = firstText(
    details?.league?.season?.name, details?.league?.season,
    details?.season?.name, details?.season
  );
  const date = firstText(details?.fixture?.date, details?.date, details?.time, details?.kickoff);
  const rows = [
    ["🏟️ Stade", venue ? venue + (city && !venue.toLowerCase().includes(city.toLowerCase()) ? " — " + city : "") : "Non communiqué"],
    ["👨‍⚖️ Arbitre", referee || "Non communiqué"],
    ["📺 Chaîne", channel || "Non communiquée"],
    ["🔢 Journée", round || "Non communiquée"],
    ["📅 Saison", season || "Non communiquée"],
    ["🕒 Date", date ? (typeof formatDate === "function" ? formatDate(date) : date) : "Non communiquée"]
  ];

  return `
    <div class="bf-detail-section bf-match-information">
      <h3>Informations du match</h3>
      <div class="bf-detail-grid">
        ${rows.map(([label, value]) => `
          <div class="bf-detail-item">
            <strong>${escapeHTML(label)}</strong>
            <span>${escapeHTML(value)}</span>
          </div>
        `).join("")}
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
    startXI = players.filter(
      player =>
        player?.first === 1 ||
        player?.first === true ||
        player?.first === "1"
    );

    if (!bench.length) {
      bench = players.filter(
        player =>
          player?.first === 0 ||
          player?.first === false ||
          player?.first === "0"
      );
    }
  } else {
    startXI = players.filter(
      player =>
        player?.substitute !== true &&
        player?.starter !== false
    );
  }

  const formationValue = [
    typeof source?.formation === "string" ? source.formation : null,
    source?.formation?.name,
    source?.formation?.displayName,
    source?.formation?.label,
    source?.formation?.value,
    source?.formation?.formation,
    source?.formationName,
    source?.formation_name,
    source?.formationUsed,
    source?.formation_used,
    source?.tacticalFormation,
    source?.tactical_formation,
    source?.tactic,
    source?.tactics?.formation
  ].find(value =>
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );

  return {
    team: team || source?.team || {},
    formation: String(formationValue || "—"),
    coach: source?.coach || source?.manager || null,
    startXI: startXI.slice(0, 11),
    substitutes: bench
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



function hasOfficialLineupCoordinates(lineups) {
  const groups = normalizeLineups(lineups);
  if (groups.length < 2) return false;
  return groups.slice(0, 2).every(group => {
    const starters = Array.isArray(group?.startXI) ? group.startXI
      : Array.isArray(group?.starters) ? group.starters
      : Array.isArray(group?.xi) ? group.xi : [];
    if (starters.length !== 11) return false;

    const coordinates = starters.map(player => getPlayerCoordinates(player));
    if (coordinates.every(Boolean)) {
      const xs = coordinates.map(point => point.x), ys = coordinates.map(point => point.y);
      const spreadX = Math.max(...xs) - Math.min(...xs);
      const spreadY = Math.max(...ys) - Math.min(...ys);
      const normalized = Math.max(...xs) <= 1 && Math.max(...ys) <= 1 &&
        spreadX >= 0.2 && spreadY >= 0.2;
      const integerGrid = xs.every(value => Number.isInteger(value) && value >= 1 && value <= 11) &&
        ys.every(value => Number.isInteger(value) && value >= 1 && value <= 11) &&
        spreadX >= 3 && spreadY >= 3;
      if (normalized || integerGrid || (spreadX >= 10 && spreadY >= 10)) return true;
    }

    const grids = starters.map(player => parsePitchGrid(getPlayerGrid(player)));
    if (grids.some(value => !value)) return false;
    const keys = grids.map(value => value.row + ":" + value.col);
    const rows = [...new Set(grids.map(value => value.row))];
    return new Set(keys).size === 11 && rows.length >= 3 && rows.length <= 5;
  });
}

/* =========================================================
   OPEN MATCH DETAILS
========================================================= */

function openMatchDetails(index) {
  const match = Array.isArray(currentMatches) ? currentMatches[Number(index)] : null;
  const identifier = String(match?.fixture?.slug || match?.slug || match?.fixture?.upstreamId || match?.upstreamId || match?.fixture?.id || match?.id || "").trim();
  if (typeof window.bfOpenUnifiedMatchDetails === "function") {
    return window.bfOpenUnifiedMatchDetails(Number(index), match, identifier);
  }
  toast("Le centre de match est en cours de chargement. Réessayez dans un instant.");
  return false;
}

/* =========================================================
   DATE BAR
========================================================= */
async function getLatestScheduledFixtureDate() {
  const cacheKey = "bf_latest_schedule_date_v1";
  const now = Date.now();

  function localISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const today = localISODate(new Date());

  // استعمال آخر نتيجة مخزنة لمدة 6 ساعات
  try {
    const cached = JSON.parse(
      localStorage.getItem(cacheKey) || "null"
    );

    if (
      cached &&
      cached.expires > now &&
      /^\d{4}-\d{2}-\d{2}$/.test(cached.date)
    ) {
      return cached.date;
    }
  } catch (_) {}

  try {
    const response = await fetch(
      "https://api.github.com/repos/openfootball/football.json/git/trees/master?recursive=1"
    );

    if (!response.ok) {
      throw new Error(`GitHub HTTP ${response.status}`);
    }

    const repository = await response.json();

    if (!Array.isArray(repository.tree) || repository.truncated) {
      throw new Error("Catalogue incomplet");
    }

    const year = new Date().getFullYear();

    // المواسم الحالية والقريبة فقط، وليس كل الأرشيف القديم
    const files = repository.tree
      .filter(file => file.type === "blob")
      .map(file => {
        const match = file.path.match(
          /^(\d{4}(?:-\d{2})?)\/([^/]+)\.json$/i
        );

        if (!match) return null;

        return {
          path: file.path,
          startYear: Number(match[1].slice(0, 4))
        };
      })
      .filter(file =>
        file &&
        file.startYear >= year - 1 &&
        file.startYear <= year + 1
      );

    if (!files.length) {
      throw new Error("Aucun fichier de saison disponible");
    }

    let latestDate = today;
    let nextIndex = 0;
    let failed = false;

    // جلب الملفات بالتوازي المحدود لتفادي عدد كبير من الطلبات مرة واحدة
    const workers = Array.from(
      { length: Math.min(6, files.length) },
      async () => {
        while (nextIndex < files.length) {
          const file = files[nextIndex++];

          try {
            const result = await fetch(
              "https://raw.githubusercontent.com/openfootball/football.json/master/" +
              file.path
            );

            if (!result.ok) {
              throw new Error("Fixture file unavailable");
            }

            const data = await result.json();

            for (const match of data.matches || []) {
              const date = String(match.date || "").slice(0, 10);

              if (
                /^\d{4}-\d{2}-\d{2}$/.test(date) &&
                date > latestDate
              ) {
                latestDate = date;
              }
            }
          } catch (_) {
            failed = true;
          }
        }
      }
    );

    await Promise.all(workers);

    // إلا فشل شي ملف، ما نفرضوش حدّاً ناقصاً على المستخدم
    if (failed) {
      throw new Error("Certaines données sont indisponibles");
    }

    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          date: latestDate,
          expires: now + 6 * 60 * 60 * 1000
        })
      );
    } catch (_) {}

    return latestDate;
  } catch (error) {
    console.warn(
      "BAKHIRAFOOT schedule date limit:",
      error
    );

    return null;
  }
}

function createDateBar() {
  const bar = $("dateBar");
  if (!bar) return;

  bar.innerHTML = "";

  // التاريخ المحلي بلا مشاكل اختلاف التوقيت
  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const today = new Date();
  const todayISO = toISODate(today);

 const maxDate = `${today.getFullYear()}-12-31`;

const initialDate =
  /^\d{4}-\d{2}-\d{2}$/.test(currentDate || "")
    ? currentDate
    : todayISO;
  // اختيار التاريخ من الكالندر
  const picker = document.createElement("input");

  picker.type = "date";
  picker.id = "bfDatePicker";
  picker.value = initialDate;
   picker.disabled = true;

getLatestScheduledFixtureDate()
  .then(latestDate => {
    if (!latestDate) return;

    picker.max = latestDate;

    if (picker.value > latestDate) {
      picker.value = latestDate;
      currentDate = latestDate;
    }
  })
  .finally(() => {
    picker.disabled = false;
  });
  picker.setAttribute("aria-label", "Choisir une date");
  picker.title = "Choisir la date des matchs";

  picker.addEventListener("change", () => {
    const chosenDate = picker.value;

    if (!chosenDate) return;

    currentDate = chosenDate;

    bar.querySelectorAll("button").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.date === chosenDate
      );
    });

    loadMatches(chosenDate);
  });

  bar.appendChild(picker);

  // نخليو أزرار الأيام السبعة الموجودة
  for (let i = -2; i <= 4; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const iso = toISODate(date);

    let label;

    if (iso === todayISO) {
      label = "Aujourd'hui";
    } else if (i === -1) {
      label = "Hier";
    } else if (i === 1) {
      label = "Demain";
    } else {
      label = date.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short"
      });
    }

    const button = document.createElement("button");

    button.type = "button";
    button.dataset.date = iso;
    button.textContent = label;

    if (iso === initialDate) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      currentDate = iso;
      picker.value = iso;

      bar.querySelectorAll("button").forEach(btn => {
        btn.classList.toggle(
          "selected",
          btn.dataset.date === iso
        );
      });

      loadMatches(iso);
    });

    bar.appendChild(button);
  }
}
/* =========================================================
   LEAGUES
========================================================= */

const leagues = [
  {
    name: "Champions League",
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
    `${league}`
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
  const grid = $("newsGrid");
  if (!grid) return;

  // real-news.js owns this area. Do not replace live articles with
  // the old static placeholder cards when the user returns to Actualités.
  if (document.querySelector('script[src*="real-news.js"]')) {
    if (grid.dataset.newsLoaded === "true" || grid.querySelector(".bf-real-news-card, .bf-news-status")) {
      return;
    }
    return;
  }

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

  // The real feed owns the home news area too; keep its last rendered
  // articles instead of briefly replacing them with generic placeholders.
  if (document.querySelector('script[src*="real-news.js"]')) {
    if (grid.dataset.newsLoaded === "true" || grid.querySelector(".bf-real-news-card, .bf-news-status")) {
      return;
    }
    return;
  }

  grid.innerHTML = news.map(item => `
    <div class="card">
      <div class="newsImg">${item.icon}</div>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.text)}</p>
    </div>
  `).join("");
}

/* =========================================================
   HOME MATCHES
========================================================= */

async function renderHomeMatches() {

  const container =
    $("homeMatches");

  if (!container) return;

  const loadedAt = Number(container.dataset.homeMatchesLoadedAt || 0);
  if (
    container.dataset.homeMatchesLoaded === "true" &&
    Date.now() - loadedAt < 60000
  ) {
    return;
  }

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
      container.dataset.homeMatchesLoaded = "true";
      container.dataset.homeMatchesLoadedAt = String(Date.now());
      return;
    }

    // Homepage fixtures come from a separate request, so don't bind their clicks
    // to numeric indexes in currentMatches (the Scores page may have a different order).
    const homeMatches = matches.slice(0, 8);
    const registry = new Map();
    const identifierKeys = match => [
      match?.fixture?.upstreamId, match?.upstreamId, match?.fixture?.id,
      match?.fixture?.slug, match?.slug, match?.id, match?.match_id, match?.fixture_id
    ].filter(value => value !== null && value !== undefined && String(value).trim())
      .map(value => String(value).trim().toLowerCase());
    homeMatches.forEach(match => identifierKeys(match).forEach(key => registry.set(key, match)));
    window.__bfHomeMatchRegistry = registry;

    container.innerHTML =
      homeMatches
        .map(match => createMatchHTML(match, -1))
        .join("");

    container.dataset.homeMatchesLoaded = "true";
    container.dataset.homeMatchesLoadedAt = String(Date.now());

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
  const input = $("search");
  if (!input) return;

  const host =
    input.closest(".tools") ||
    input.parentElement;

  if (!host) return;

  host.style.position = "relative";

  let panel = $("bfSearchResults");

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "bfSearchResults";
    host.appendChild(panel);
  }

  /* CSS ديال نتائج البحث */
  if (!$("bfSearchStyles")) {
    const style = document.createElement("style");
    style.id = "bfSearchStyles";

    style.textContent = `
      #bfSearchResults {
        display: none;
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: min(420px, calc(100vw - 24px));
        max-height: 65vh;
        overflow-y: auto;
        padding: 9px;
        border: 1px solid rgba(127,127,127,.25);
        border-radius: 14px;
        background: var(--card, #fff);
        color: var(--text, #111827);
        box-shadow: 0 16px 45px rgba(0,0,0,.22);
        z-index: 999999;
      }

      .bf-search-title {
        padding: 9px 8px 5px;
        font-size: 10px;
        font-weight: 950;
        opacity: .62;
        text-transform: uppercase;
      }

      .bf-search-result {
        display: block;
        width: 100%;
        padding: 10px;
        margin: 2px 0;
        border: 0;
        border-radius: 9px;
        text-align: left;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      .bf-search-result:hover {
        background: rgba(100,160,130,.14);
      }

      .bf-search-result strong {
        display: block;
        font-size: 12px;
        font-weight: 900;
      }

      .bf-search-result small {
        display: block;
        margin-top: 4px;
        font-size: 10px;
        opacity: .65;
      }

      .bf-search-empty {
        padding: 16px 10px;
        font-size: 12px;
        opacity: .65;
        text-align: center;
      }

    /* Match Centre: clean number/name/role tiles and textual stat badges */
    .bf-modal .bf-detail-section { margin-top:26px; padding-top:20px; }
    .bf-modal .bf-detail-section h3 { font-size:16px; letter-spacing:.01em; }
    .bf-pitch-box { border-radius:18px; border:1px solid rgba(128,145,166,.22); background:rgba(12,22,34,.025); }
    .bf-pitch-title { font-size:13px; gap:10px; }
    .bf-pitch-formation { background:#101c2b; color:#f8fafc; padding:5px 10px; }
    .bf-pitch-player { width:104px; gap:3px; z-index:3; }
    .bf-pitch-role { display:inline-flex; align-items:center; justify-content:center; min-width:30px; max-width:92px; padding:3px 7px; border:1px solid rgba(255,255,255,.6); border-radius:6px; color:#fff; background:#11243a; box-shadow:0 3px 10px rgba(0,0,0,.25); font-size:9px; font-weight:950; letter-spacing:.04em; line-height:1.1; }
    .bf-pitch-identity { display:flex; flex-direction:column; align-items:center; gap:3px; max-width:100%; }
    .bf-shirt { width:31px; height:31px; border:2px solid rgba(255,255,255,.95); background:#f8fafc; color:#111827; font-size:11px; box-shadow:0 3px 8px rgba(0,0,0,.3); }
    .bf-pitch-name { margin-top:0; max-width:100px; padding:3px 5px; border:1px solid rgba(255,255,255,.12); border-radius:5px; font-size:9px; font-weight:850; background:rgba(7,17,29,.9); color:#fff; }
    .bf-pitch-markers { display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:2px; max-width:110px; }
    .bf-pitch-chip { display:inline-flex; align-items:center; justify-content:center; min-height:15px; padding:2px 4px; border-radius:4px; color:#fff; font-size:8px; line-height:1; font-weight:950; background:#26394e; border:1px solid rgba(255,255,255,.17); }
    .bf-pitch-chip--goal { background:#087f5b; } .bf-pitch-chip--assist { background:#1d4ed8; }
    .bf-pitch-chip--yellow { background:#a16207; color:#fff7cc; } .bf-pitch-chip--red { background:#b91c1c; }
    .bf-pitch-chip--injury { background:#475569; } .bf-pitch-chip--mvp { background:#facc15; color:#172033; }
    .bf-mvp-note { margin-top:10px; padding:8px 10px; border-left:3px solid #d4a500; border-radius:5px; background:rgba(250,204,21,.08); font-size:10px; font-weight:750; opacity:.78; }
    .bf-pitch-rating { margin-top:0; padding:2px 5px; background:#e7edf5; color:#142033; border-radius:4px; font-size:9px; font-weight:950; }
    .bf-player-row { border:1px solid rgba(128,145,166,.13); background:rgba(128,145,166,.055); }
    .bf-player-actions { gap:4px; }
    .bf-player-action { min-width:26px; padding:4px 6px; border:1px solid rgba(128,145,166,.12); font-size:9px; letter-spacing:.01em; }
    .bf-player-action--rating { background:#e7edf5; color:#142033; }
    .bf-player-action--goal { background:#d9fbe9; color:#075c3a; }
    .bf-player-action--assist { background:#dbeafe; color:#1e40af; }
    .bf-player-action--yellow { background:#fef3c7; color:#92400e; }
    .bf-player-action--red { background:#fee2e2; color:#991b1b; }
    .bf-player-action--injury { background:#e2e8f0; color:#334155; }
    .bf-player-action--mvp { background:#fef08a; color:#713f12; }
    .bf-player-action--keypass { background:#ede9fe; color:#5b21b6; }
    .bf-event-icon { display:inline-flex; align-items:center; justify-content:center; min-width:38px; padding:4px; border-radius:5px; background:#172a41; color:#fff; font-size:8px; line-height:1; font-weight:950; letter-spacing:.03em; }
    @media (max-width:700px) {
      .bf-pitch-player { width:72px; gap:2px; }
      .bf-pitch-role { padding:2px 4px; font-size:8px; }
      .bf-shirt { width:27px; height:27px; font-size:10px; }
      .bf-pitch-name { max-width:72px; font-size:7px; padding:2px 3px; }
      .bf-pitch-markers { max-width:78px; gap:1px; }
      .bf-pitch-chip { padding:2px 3px; font-size:7px; min-height:13px; }
      .bf-pitch-rating { font-size:8px; }
    }

    `;

    document.head.appendChild(style);
  }

  let cachedDate = "";
  let searchMatches = [];
  let requestNumber = 0;

  function key(value) {
    return normalizeText(value)
      .replace(/\s+/g, " ")
      .trim();
  }

  /* جلب جميع مباريات التاريخ المختار
     بلا تغيير currentMatches ديال الموقع */
  async function loadSearchMatches() {
    const date =
      currentDate ||
      new Date().toISOString().slice(0, 10);

    if (cachedDate === date) return;

    const response = await fetch(
      `${API_BASE}/api?date=${encodeURIComponent(date)}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        `Search HTTP ${response.status}`
      );
    }

    const data = await response.json();

    searchMatches = normalizeMatches(data);
    cachedDate = date;
  }

  /* دمج نتائج البحث مع المباريات الموجودة */
  function getAllMatches() {
    const result = [];
    const seen = new Set();

    const all = [
      ...searchMatches,
      ...(Array.isArray(currentMatches)
        ? currentMatches
        : [])
    ];

    all.forEach(match => {
      const id = getFixtureId(match);

      const identity = id
        ? `id:${id}`
        : [
            key(getHome(match)),
            key(getAway(match)),
            key(getLeague(match)),
            match?.fixture?.date || match?.date || ""
          ].join("|");

      if (seen.has(identity)) return;

      seen.add(identity);
      result.push(match);
    });

    return result;
  }

  function playerName(value) {
    if (typeof value === "string") {
      return value;
    }

    if (!value || typeof value !== "object") {
      return "";
    }

    return (
      value?.player?.name ||
      value?.name ||
      value?.player_name ||
      value?.full_name ||
      value?.short_name ||
      value?.scorer_name ||
      ""
    );
  }

  function collectPlayers(matches) {
    const found = new Map();

    function add(name, matchIndex) {
      const clean = String(name || "").trim();
      const k = key(clean);

      if (!k || k.length < 2) return;

      if (!found.has(k)) {
        found.set(k, {
          name: clean,
          matchIndex
        });
      }
    }

    function scan(node, matchIndex, depth = 0) {
      if (!node || depth > 5) return;

      if (Array.isArray(node)) {
        node.forEach(item =>
          scan(item, matchIndex, depth + 1)
        );
        return;
      }

      if (typeof node !== "object") return;

      const p =
        node?.player &&
        typeof node.player === "object"
          ? { ...node.player, ...node }
          : node;

      const name = playerName(p);

      const isPlayer =
        !!node?.player ||
        !!p?.position ||
        !!p?.pos ||
        !!p?.player_id ||
        !!p?.playerId ||
        !!p?.shirt_number ||
        !!p?.shirtNumber ||
        p?.jersey_number != null;

      if (name && isPlayer) {
        add(name, matchIndex);
      }

      const containers = [
        "players",
        "lineups",
        "lineup",
        "compositions",
        "home",
        "away",
        "startXI",
        "startingXI",
        "starters",
        "substitutes",
        "subs",
        "bench",
        "player"
      ];

      Object.entries(node).forEach(([prop, value]) => {
        if (containers.includes(prop)) {
          scan(value, matchIndex, depth + 1);
        }
      });
    }

    matches.forEach((match, index) => {
      scan(match?.players, index);
      scan(match?.lineups, index);
      scan(match?.lineup, index);

      const events =
        match?.events ||
        match?.incidents ||
        match?.timeline ||
        [];

      if (Array.isArray(events)) {
        events.forEach(event => {
          add(
            playerName(event?.player) ||
            event?.player_name ||
            event?.scorer_name,
            index
          );

          add(
            playerName(event?.assist) ||
            event?.assist_name,
            index
          );
        });
      }
    });

    return Array.from(found.values());
  }

  function resultButton(type, name, subtitle, index, extra = "") {
    return `
      <button
        type="button"
        class="bf-search-result"
        data-search-type="${escapeHTML(type)}"
        data-search-value="${escapeHTML(name)}"
        ${index != null
          ? `data-match-index="${index}"`
          : ""}
        ${extra}
      >
        <strong>${escapeHTML(name)}</strong>
        ${subtitle
          ? `<small>${escapeHTML(subtitle)}</small>`
          : ""}
      </button>
    `;
  }

  function section(title, items) {
    if (!items.length) return "";

    return `
      <div class="bf-search-title">
        ${escapeHTML(title)}
      </div>
      ${items.join("")}
    `;
  }

  function renderResults(query) {
    const q = key(query);
    if (!q) {
      panel.style.display = "none";
      return;
    }

    const matches = getAllMatches();

    /* الفرق: من اللائحة الحالية ومن مباريات اليوم */
    const teamMap = new Map();

    function addTeam(name, country = "", isStatic = false) {
      if (!name) return;

      const k = key(name);
      if (!k) return;

      const existing = teamMap.get(k);

      if (!existing || isStatic) {
        teamMap.set(k, {
          name,
          country,
          isStatic
        });
      }
    }

    if (Array.isArray(teams)) {
      teams.forEach(team =>
        addTeam(team.name, team.country, true)
      );
    }

    matches.forEach(match => {
      addTeam(getHome(match));
      addTeam(getAway(match));
    });

    // Add teams already visible in standings, scorers and match cards.
    document.querySelectorAll(
      ".ss-club-info strong, .bf-score-pro-team strong, .bf-score-team strong, .bf-match-team .bf-team-name, .bf-ko-team strong, [data-bf-team-name]"
    ).forEach(node => {
      const name = String(node.getAttribute("data-bf-team-name") || node.textContent || "").trim();
      if (name && name.length < 70) addTeam(name, "", false);
    });

    const relevance = value => {
      const candidate = key(value);
      if (candidate === q) return 0;
      if (candidate.startsWith(q)) return 1;
      if (candidate.includes(q)) return 2;
      return 3;
    };

    const matchingTeams =
      Array.from(teamMap.values())
        .filter(team =>
          key(team.name).includes(q) ||
          key(team.country).includes(q)
        )
        .sort((a, b) => relevance(a.name) - relevance(b.name))
        .slice(0, 6)
        .map(team =>
          resultButton(
            "team",
            team.name,
            team.country || "Équipe",
            null,
            `data-static-team="${team.isStatic}"`
          )
        );

    /* البطولات */
    const competitionMap = new Map();

    matches.forEach(match => {
      const name = String(getLeague(match) || "").trim();
      const k = key(name);

      if (k && !competitionMap.has(k)) {
        competitionMap.set(k, {
          name,
          count: 0
        });
      }

      if (k) {
        competitionMap.get(k).count++;
      }
    });

    const matchingCompetitions =
      Array.from(competitionMap.values())
        .filter(item => key(item.name).includes(q))
        .slice(0, 5)
        .map(item =>
          resultButton(
            "competition",
            item.name,
            `${item.count} match(s)`,
            null
          )
        );

    /* المباريات */
    const matchingMatches =
      matches
        .map((match, index) => ({ match, index }))
        .filter(({ match }) => {
          const searchable = key([
            getHome(match),
            getAway(match),
            getLeague(match),
            getStatus(match)
          ].join(" "));

          return searchable.includes(q);
        })
        .slice(0, 7)
        .map(({ match, index }) =>
          resultButton(
            "match",
            `${getHome(match)} — ${getAway(match)}`,
            `${getLeague(match)} • ${statusLabel(match)} • ${getHomeScore(match)}-${getAwayScore(match)}`,
            index
          )
        );

    /* Players from the loaded fixtures plus top-scorer/lineup cards already on screen. */
    const playerMap = new Map();
    collectPlayers(matches).forEach(player => {
      const playerKey = key(player.name);
      if (playerKey && !playerMap.has(playerKey)) playerMap.set(playerKey, player);
    });

    document.querySelectorAll(
      "[data-player-name], [data-bf-player-name], .ss-player-name, .bfmd-player-name, .bf-new-safe-player-name, .bf-new-safe-name, .bf-pitch-name"
    ).forEach(node => {
      const holder = node.closest("[data-player-name], [data-bf-player-name]");
      const name = String(
        node.getAttribute("data-player-name") ||
        node.getAttribute("data-bf-player-name") ||
        holder?.getAttribute("data-player-name") ||
        holder?.getAttribute("data-bf-player-name") ||
        node.textContent || ""
      ).trim();
      const playerKey = key(name);
      if (!playerKey || name.length > 70 || playerKey.length < 2) return;
      if (!playerMap.has(playerKey)) playerMap.set(playerKey, { name, matchIndex: null });
    });

    const matchingPlayers =
      Array.from(playerMap.values())
        .filter(player => key(player.name).includes(q))
        .sort((a, b) => relevance(a.name) - relevance(b.name))
        .slice(0, 6)
        .map(player => {
          const match = Number.isInteger(player.matchIndex)
            ? matches[player.matchIndex]
            : null;

          return resultButton(
            "player",
            player.name,
            match
              ? `${getHome(match)} — ${getAway(match)}`
              : "Joueur",
            player.matchIndex
          );
        });

    const html = [
      section("Équipes", matchingTeams),
      section("Compétitions", matchingCompetitions),
      section("Matchs", matchingMatches),
      section("Joueurs disponibles", matchingPlayers)
    ].join("");

    panel.innerHTML = html ||
      `<div class="bf-search-empty">
        Aucun résultat dans les données chargées.
      </div>`;

    panel.style.display = "block";
  }

  function openSearchMatch(match) {
    if (!match) return;

    const id = getFixtureId(match);

    let index = id
      ? currentMatches.findIndex(
          item =>
            String(getFixtureId(item)) === String(id)
        )
      : -1;

    if (index < 0) {
      currentMatches = [
        ...(Array.isArray(currentMatches)
          ? currentMatches
          : []),
        match
      ];

      index = currentMatches.length - 1;
    }

    panel.style.display = "none";
    input.blur();

    openMatchDetails(index);
  }

  async function runSearch() {
    const q = input.value.trim();
    const token = ++requestNumber;

    if (!q) {
      panel.style.display = "none";

      if ($("teams")?.classList.contains("active")) {
        renderTeams();
      }

      return;
    }

    panel.style.display = "block";
    panel.innerHTML =
      `<div class="bf-search-empty">Recherche...</div>`;

    try {
      await loadSearchMatches();
    } catch (error) {
      console.warn("BAKHIRAFOOT SEARCH:", error);
    }

    if (token !== requestNumber) return;

    renderResults(q);
  }

  input.addEventListener("input", runSearch);

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      runSearch();
    }
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      const firstResult = panel.querySelector("[data-search-type]");
      if (firstResult) { event.preventDefault(); firstResult.click(); }
      return;
    }
    if (event.key === "Escape") {
      panel.style.display = "none";
      input.blur();
    }
  });

  panel.addEventListener("click", event => {
    const button =
      event.target.closest("[data-search-type]");

    if (!button) return;

    const type = button.dataset.searchType;
    const value = button.dataset.searchValue;

    if (type === "match") {
      const matches = getAllMatches();
      const index = Number(button.dataset.matchIndex);
      openSearchMatch(matches[index]);
      return;
    }

    if (type === "competition") {
      panel.style.display = "none";
      input.blur();
      if (typeof window.openBakhiraCompetitionStandings === "function") {
        window.openBakhiraCompetitionStandings(value);
      } else if (typeof window.go === "function") {
        window.go("leagues");
      }
      return;
    }

    if (type === "player") {
      panel.style.display = "none";
      input.blur();
      if (window.BakhiraFootEntities?.openPlayer) {
        window.BakhiraFootEntities.openPlayer(value, {
          subtitle: button.querySelector("small")?.textContent || ""
        });
      } else {
        const matches = getAllMatches();
        openSearchMatch(matches[Number(button.dataset.matchIndex)]);
      }
      return;
    }

    if (type === "team") {
      panel.style.display = "none";
      input.blur();
      if (window.BakhiraFootEntities?.openTeam) {
        window.BakhiraFootEntities.openTeam(value);
      } else {
        input.value = value;
        runSearch();
      }
      return;
    }

    input.value = value;
    runSearch();
  });

  document.addEventListener("click", event => {
    if (
      !host.contains(event.target)
    ) {
      panel.style.display = "none";
    }
  });
}


/* =========================================================
   THEME
========================================================= */

function initTheme() {
  const button = $("theme");
  if (!button) return;

  const applyTheme = dark => {
    // Keep <html> and <body> in sync; qualification and page styles use both.
    document.documentElement.classList.toggle("dark", dark);
    document.body.classList.toggle("dark", dark);

    button.textContent = dark ? "☀" : "☾";
    button.setAttribute(
      "aria-label",
      dark ? "Activer le mode clair" : "Activer le mode sombre"
    );
    button.setAttribute("title", dark ? "Mode sombre activé" : "Mode clair activé");
  };

  const saved = localStorage.getItem("bakhirafoot-theme");
  if (saved === "dark" || saved === "light") {
    applyTheme(saved === "dark");
  } else {
    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  button.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    applyTheme(dark);
    localStorage.setItem("bakhirafoot-theme", dark ? "dark" : "light");
  });
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
    renderNews();

    startLiveRefresh();

  }
);


/* Open homepage matches using the actual fixture, not index -1. */
function openHomepageMatchCard(card) {
  const registry = window.__bfHomeMatchRegistry;
  if (!(registry instanceof Map) || !card) return;
  const rawId = String(card.getAttribute("data-bf-home-match") || card.getAttribute("data-fixture-id") || "").trim();
  const wanted = rawId.toLowerCase();
  const ids = value => [
    value?.fixture?.upstreamId, value?.upstreamId, value?.fixture?.id,
    value?.fixture?.slug, value?.slug, value?.id, value?.match_id, value?.fixture_id
  ].filter(item => item !== null && item !== undefined && String(item).trim())
    .map(item => String(item).trim().toLowerCase());
  let match = wanted ? registry.get(wanted) : null;
  if (!match && wanted) match = Array.from(registry.values()).find(value => ids(value).includes(wanted));
  if (!match) {
    if (typeof toast === "function") toast("Les détails de cette rencontre ne sont pas disponibles.");
    return;
  }
  const wantedIds = new Set(ids(match));
  let list = Array.isArray(currentMatches) ? currentMatches : [];
  let index = list.findIndex(item => ids(item).some(id => wantedIds.has(id)));
  if (index < 0) {
    currentMatches = [...list, match];
    index = currentMatches.length - 1;
  } else {
    list[index] = match;
    currentMatches = list;
  }
  if (typeof openMatchDetails === "function") openMatchDetails(index);
}

document.addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const card = target.closest("[data-bf-home-match]");
  if (!card || target.closest("[data-bf-open-standings]")) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  openHomepageMatchCard(card);
}, true);

document.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest("button,a,input,select,textarea,[contenteditable='true']")) return;
  const card = target.closest("[data-bf-home-match]");
  if (!card || target !== card) return;
  event.preventDefault();
  openHomepageMatchCard(card);
}, true);


/* Open standings when clicking the league label, not the entire match card. */
document.addEventListener("click", function (event) {
  const target = event.target instanceof Element ? event.target.closest("[data-bf-open-standings]") : null;
  if (!target) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const competitionName = target.getAttribute("data-bf-open-standings") || "";
  if (typeof window.openBakhiraCompetitionStandings === "function") {
    window.openBakhiraCompetitionStandings(competitionName);
  } else if (typeof window.go === "function") {
    window.go("leagues");
  }
}, true);
