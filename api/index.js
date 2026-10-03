/* =========================================================
   BAKHIRAFOOT PRO API
   SPORTScore ONLY
   LIVE + DATE + MATCH DETAILS
   SCORE + EVENTS + LINEUPS + STATS
   ========================================================= */

module.exports = async (req, res) => {
  try {
    const live = req?.query?.live || "";
    const date = req?.query?.date || "";
    const fixture = req?.query?.fixture || "";

    const SPORTSCORE = "https://sportscore.com/api/v1";
    const WIDGET = "https://sportscore.com/api/widget";
    const today = new Date().toISOString().split("T")[0];

    function output(status, data) {
      res.setHeader(
        "Cache-Control",
        "s-maxage=30, stale-while-revalidate=60"
      );
      res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
      );

      return res.status(status).json(data);
    }

    async function getJSON(url) {
      console.log("SPORTSCORE REQUEST:", url);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36"
          },
          cache: "no-store",
          signal: controller.signal
        });

        const rawText = await response.text();

        let data;

        try {
          data = JSON.parse(rawText);
        } catch (_) {
          data = {
            raw: rawText
          };
        }

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          error.status = response.status;
          error.data = data;
          throw error;
        }

        return data;
      } finally {
        clearTimeout(timeout);
      }
    }

     async function getTheSportsDBMatches(date) {
  try {

    const response =
      await fetch(
        `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${encodeURIComponent(
          date
        )}&s=Soccer`,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `TheSportsDB HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    return Array.isArray(data?.events)
      ? data.events
      : [];

  } catch (error) {

    console.warn(
      "THESPORTSDB ERROR:",
      error.message
    );

    return [];
  }
}

     async function findTheSportsDBEvent(
  homeName,
  awayName,
  matchDate
) {

  const home =
    String(
      homeName || ""
    )
      .trim()
      .replace(/\s+/g, "_");

  const away =
    String(
      awayName || ""
    )
      .trim()
      .replace(/\s+/g, "_");

  const date =
    String(
      matchDate || ""
    )
      .slice(0, 10);

  if (
    !home ||
    !away ||
    !date
  ) {
    return null;
  }

  const eventName =
    `${home}_vs_${away}`;

  const url =
    `https://www.thesportsdb.com/api/v1/json/123/searchevents.php?e=${encodeURIComponent(
      eventName
    )}&d=${encodeURIComponent(
      date
    )}`;

  try {

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json"
          },

          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `TheSportsDB HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      !Array.isArray(
        data?.event
      )
    ) {
      return null;
    }

    return (
      data.event[0] ||
      null
    );

  }
  catch (error) {

    console.warn(
      "THESPORTSDB SEARCH ERROR:",
      error.message
    );
     
    return null;
  }
}

/* =====================================================
   THE SPORTS DB - MATCHES BY DAY
===================================================== */

async function getTheSportsDBDayMatches(date) {
  const matchDate = String(
    date || ""
  ).slice(0, 10);

  if (!matchDate) {
    return [];
  }

  const url =
    `https://www.thesportsdb.com/api/v1/json/123/eventsday.php` +
    `?d=${encodeURIComponent(matchDate)}` +
    `&s=Soccer`;

  try {
    const response = await fetch(
      url,
      {
        method: "GET",
        headers: {
          Accept:
            "application/json"
        },
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

    return Array.isArray(
      data?.events
    )
      ? data.events
      : [];

  } catch (error) {

    console.warn(
      "THESPORTSDB DAY ERROR:",
      error.message
    );

    return [];
  }
}
     
     
     /* =====================================================
   SOFASCORE - WORLD FOOTBALL BY DATE
===================================================== */

async function getSofaWorldMatches(date) {

const sofaUrls = [
  `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${encodeURIComponent(date)}/inverse`,
  `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${encodeURIComponent(date)}`,

  `https://www.sofascore.com/api/v1/sport/football/scheduled-events/${encodeURIComponent(date)}/inverse`,
  `https://www.sofascore.com/api/v1/sport/football/scheduled-events/${encodeURIComponent(date)}`
];

  /* =========================================
     1. SOFASCORE
  ========================================= */

  for (const url of sofaUrls) {

    try {

      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Accept: "application/json",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36"
            },

            cache: "no-store"
          }
        );

      if (!response.ok) {
        continue;
      }

      const data =
        await response.json();

   if (
  Array.isArray(
    data?.events
  )
) {

  console.log(
    "SOFASCORE WORLD:",
    data.events.length
  );

  return [
    ...data.events
  ];

}

    }
    catch (error) {

      console.warn(
        "SOFASCORE WORLD ERROR:",
        error.message
      );

    }

  }

  /* =========================================
     2. ESPN FALLBACK
  ========================================= */

  try {

    const compactDate =
      String(date || "")
        .replace(/-/g, "");

    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${encodeURIComponent(
        compactDate
      )}`;

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36"
          },

          cache: "no-store"
        }
      );

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    const events =
      Array.isArray(
        data?.events
      )
        ? data.events
        : [];

const tsdbEvents =
  await getTheSportsDBDayMatches(
    date
  );

const tsdbByTeams =
  new Map();

for (
  const event of tsdbEvents
) {

  const home =
    norm(
      event?.strHomeTeam
    );

  const away =
    norm(
      event?.strAwayTeam
    );

  const day =
    String(
      event?.dateEvent ||
      ""
    ).slice(0, 10);

  if (
    home &&
    away &&
    day
  ) {

    const key =
      `${home}__${away}__${day}`;

    tsdbByTeams.set(
      key,
      event
    );

  }

}


function espnCompetitionFromSeason(
  event
) {

  const slug =
    String(
      event?.season?.slug ||
      ""
    )
      .toLowerCase()
      .trim();

  const displayName =
    String(
      event?.season?.displayName ||
      ""
    )
      .trim();

  if (!slug) {
    return null;
  }

  let name =
    slug
      .replace(
        /^\d{4}(?:-\d{2})?-/,
        ""
      )
      .replace(
        /-(?:fall-season|spring-season|summer-season|winter-season|group-stage|first-round|second-round|third-round|round-of-\d+|quarterfinals?|semifinals?|final)$/,
        ""
      )
      .replace(
        /-/g,
        " "
      )
      .trim();

  const stageOnly =
    /^(fall-season|spring-season|summer-season|winter-season|group-stage|first-round|second-round|third-round|round-of-\d+|quarterfinals?|semifinals?|final)$/
      .test(
        slug
          .replace(
            /^\d{4}(?:-\d{2})?-/,
            ""
          )
      );

  if (
    !stageOnly &&
    name
  ) {

    return {
      name:
        name.replace(
          /\b\w/g,
          char =>
            char.toUpperCase()
        ),

      logo:
        "",

      id:
        null
    };

  }

  if (
    /^(fall season|spring season|summer season|winter season|group stage|first round|second round|third round|round of \d+|quarterfinals?|semifinals?|final)$/i
      .test(
        displayName
      )
  ) {

    return null;

  }

  return null;
}


const enrichedEvents =
  events.map(
    event => {

      const competition =
        espnCompetitionFromSeason(
          event
        );

      if (
        competition
      ) {

        return {
          ...event,

          league: {
            id:
              competition.id,

            name:
              competition.name,

            logo:
              competition.logo
          }
        };

      }


      const competitionRaw =
        Array.isArray(
          event?.competitions
        )
          ? event.competitions[0]
          : null;

      const competitors =
        Array.isArray(
          competitionRaw?.competitors
        )
          ? competitionRaw.competitors
          : [];

      const home =
        competitors.find(
          item =>
            item?.homeAway ===
            "home"
        );

      const away =
        competitors.find(
          item =>
            item?.homeAway ===
            "away"
        );

      const homeName =
        home?.team?.displayName ||
        home?.team?.name ||
        "";

      const awayName =
        away?.team?.displayName ||
        away?.team?.name ||
        "";

      const matchDay =
        String(
          event?.date ||
          ""
        ).slice(0, 10);

      const key =
        `${norm(homeName)}__${norm(awayName)}__${matchDay}`;

      const tsdb =
        tsdbByTeams.get(
          key
        );

      if (
        tsdb?.strLeague
      ) {

        return {
          ...event,

          league: {

            id:
              tsdb?.idLeague ||
              null,

            name:
              tsdb.strLeague,

            logo:
              tsdb?.strLeagueBadge ||
              ""
          }

        };

      }

      return event;

    }
  );
events.splice(
  0,
  events.length,
  ...enrichedEvents
);
     
    const converted =
      events
        .map(event => {

          const competition =
            Array.isArray(
              event?.competitions
            )
              ? event.competitions[0]
              : null;

          const competitors =
            Array.isArray(
              competition?.competitors
            )
              ? competition.competitors
              : [];

          const home =
            competitors.find(
              item =>
                item?.homeAway ===
                "home"
            );

          const away =
            competitors.find(
              item =>
                item?.homeAway ===
                "away"
            );

          if (!home || !away) {
            return null;
          }

          const state =
            String(
              event?.status
                ?.type
                ?.state ||
              ""
            ).toLowerCase();

          let statusType =
            "notstarted";

          if (state === "in") {
            statusType =
              "inprogress";
          }

          else if (state === "post") {
            statusType =
              "finished";
          }

          const sourceId =
  event?.id
    ? `espn-${event.id}`
    : "";

return {

  id:
    sourceId ||
    null,

  slug:
    sourceId ||
    null,

  provider:
    "ESPN",
             
            homeTeam: {

              id:
                home?.team?.id ||
                null,

              name:
                home?.team?.displayName ||
                home?.team?.name ||
                "",

              shortName:
                home?.team?.shortDisplayName ||
                "",

              national:
                !!home?.team?.isNational,

logo:
  home?.team?.logo ||
  (
    home?.team?.id
      ? `https://a.espncdn.com/i/teamlogos/soccer/500/${home.team.id}.png`
      : ""
  )

            },

            awayTeam: {

              id:
                away?.team?.id ||
                null,

              name:
                away?.team?.displayName ||
                away?.team?.name ||
                "",

              shortName:
                away?.team?.shortDisplayName ||
                "",

              national:
                !!away?.team?.isNational,

 logo:
  away?.team?.logo ||
  (
    away?.team?.id
      ? `https://a.espncdn.com/i/teamlogos/soccer/500/${away.team.id}.png`
      : ""
  )

            },

tournament: {

  id:
    event?.season?.slug ||
    event?.season?.year ||
    null,

 name:
  event?.league?.name ||
  event?.competition?.name ||
  "Football",

  uniqueTournament: {

    id:
      event?.season?.slug ||
      event?.season?.year ||
      null,

    name:
      (
        event?.season?.slug
          ? String(
              event.season.slug
            )
              .replace(
                /^\d{4}-\d{2}-/,
                ""
              )
              .replace(
                /-/g,
                " "
              )
              .replace(
                /\b\w/g,
                char =>
                  char.toUpperCase()
              )
          : ""
      ) ||
      event?.season?.displayName ||
      "Football"

  },

  category: {

    name:
      "World"

  }

},

            status: {

              type:
                statusType,

              description:
                event?.status
                  ?.type
                  ?.description ||
                ""

            },

            startTimestamp:
              event?.date
                ? Math.floor(
                    new Date(
                      event.date
                    ).getTime() / 1000
                  )
                : null,

            homeScore: {

              current:
                home?.score !== undefined
                  ? Number(
                      home.score
                    )
                  : null

            },

            awayScore: {

              current:
                away?.score !== undefined
                  ? Number(
                      away.score
                    )
                  : null

            }

          };

        })
        .filter(Boolean);

    console.log(
      "ESPN WORLD FALLBACK:",
      converted.length
    );

    return converted;

  }
  catch (error) {

    console.warn(
      "ESPN WORLD ERROR:",
      error.message
    );

    return [];

  }

}

/* =====================================================
   ADAPT SOFASCORE EVENT
   لنفس structure ديال BakhiraFoot
===================================================== */

function adaptSofaWorldMatch(event) {

  if (
    !event ||
    typeof event !== "object"
  ) {
    return null;
  }

  const home =
    event?.homeTeam ||
    {};

  const away =
    event?.awayTeam ||
    {};

  const tournament =
    event?.tournament ||
    {};

  const uniqueTournament =
    tournament?.uniqueTournament ||
    {};

  const category =
    tournament?.category ||
    {};


  let status =
    "NS";

  const statusType =
    String(
      event?.status?.type ||
      ""
    ).toLowerCase();

  if (
    statusType === "inprogress"
  ) {
    status = "LIVE";
  }

  else if (
    statusType === "finished"
  ) {
    status = "FT";
  }

  else if (
    statusType === "halftime"
  ) {
    status = "HT";
  }

  else if (
    statusType === "postponed"
  ) {
    status = "PST";
  }

  else if (
    statusType === "canceled" ||
    statusType === "cancelled"
  ) {
    status = "CANC";
  }

  else {
    status = "NS";
  }


  const startTimestamp =
    Number(
      event?.startTimestamp
    );

  const matchDate =
    Number.isFinite(
      startTimestamp
    )
      ? new Date(
          startTimestamp * 1000
        ).toISOString()
      : null;


  const homeScore =
    event?.homeScore?.current ??
    event?.homeScore?.normaltime ??
    null;

  const awayScore =
    event?.awayScore?.current ??
    event?.awayScore?.normaltime ??
    null;


 const sourceId =
  event?.id
    ? `sofa-${event.id}`
    : "";

return {

  id:
    sourceId ||
    null,

  slug:
    sourceId ||
    null,

  provider:
    "SofaScore",

     
    home_team: {

      id:
        home?.id ||
        null,

      name:
        home?.name ||
        home?.shortName ||
        "Domicile",

     logo:
  home?.logo ||
  (
    home?.id
      ? `https://api.sofascore.com/api/v1/team/${home.id}/image`
      : ""
  )

    },

    away_team: {

      id:
        away?.id ||
        null,

      name:
        away?.name ||
        away?.shortName ||
        "Extérieur",

   logo:
  away?.logo ||
  (
    away?.id
      ? `https://api.sofascore.com/api/v1/team/${away.id}/image`
      : ""
  )

    },

    competition: {

      id:
        uniqueTournament?.id ||
        tournament?.id ||
        null,

      name:
        uniqueTournament?.name ||
        tournament?.name ||
        "Football",

      country:
        category?.name ||
        "",

      logo:
  uniqueTournament?.id
    ? `https://api.sofascore.com/api/v1/unique-tournament/${uniqueTournament.id}/image`
    : ""

    },

    home_score:
      homeScore,

    away_score:
      awayScore,

    status:
      status,

    status_text:
      event?.status?.description ||
      status,

    time:
      matchDate
 
  };

}

         /* =====================================================
       TheSportsDB - EVENT DETAILS
       مصدر احتياطي لبيانات المباراة
    ===================================================== */

    async function getTheSportsDBEvent(
      eventId
    ) {

      const id =
        String(
          eventId || ""
        ).trim();

      if (!id) {
        return null;
      }

      try {

        const response =
          await fetch(
            `https://www.thesportsdb.com/api/v1/json/123/lookupevent.php?id=${encodeURIComponent(
              id
            )}`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json"
              },

              cache:
                "no-store"
            }
          );

        if (!response.ok) {
          throw new Error(
            `TheSportsDB HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        return (
          Array.isArray(
            data?.events
          ) &&
          data.events.length
            ? data.events[0]
            : null
        );

      }
      catch (error) {

        console.warn(
          "THESPORTSDB EVENT ERROR:",
          error.message
        );

        return null;
      }

    }
    function arr(value) {
      return Array.isArray(value) ? value : [];
    }

    function obj(value) {
      return value &&
        typeof value === "object" &&
        !Array.isArray(value)
        ? value
        : {};
    }

    function text(value) {
      if (typeof value === "string") {
        return value.trim();
      }

      if (typeof value === "number") {
        return String(value);
      }

      if (value && typeof value === "object") {
        return (
          value.name ||
          value.full_name ||
          value.fullName ||
          value.title ||
          value.label ||
          ""
        );
      }

      return "";
    }

    function idOf(value) {
      if (
        typeof value === "string" ||
        typeof value === "number"
      ) {
        return value;
      }

      if (value && typeof value === "object") {
        return (
          value.id ??
          value.team_id ??
          value.player_id ??
          value.fixture_id ??
          null
        );
      }

      return null;
    }

    function first(...values) {
      for (const value of values) {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          return value;
        }
      }

      return null;
    }

    function norm(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }

    function slugPart(value) {
      return norm(value).replace(/\s+/g, "-");
    }

    function nameOf(value) {
      return text(value);
    }

 function imageOf(value) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return "";
  }

  return (
    value.picture ||
    value.image ||
    value.photo ||
    value.avatar ||
    value.logo ||
    value.icon ||
    value.image_url ||
    value.imageUrl ||
    value.logo_url ||
    value.logoUrl ||
    value.image_path ||
    value.imagePath ||
    value.logo_path ||
    value.logoPath ||
    value.badge ||
    value.badge_url ||
    value.badgeUrl ||
    value.strBadge ||
    value.strBadgeLogo ||
    value.team_logo ||
    value.teamLogo ||
    ""
  );
}

    function toISODate(value) {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return null;
      }

      if (
        typeof value === "number" ||
        /^\d+$/.test(String(value).trim())
      ) {
        const number = Number(value);
        const ms =
          number < 10000000000
            ? number * 1000
            : number;

        const d = new Date(ms);

        return Number.isNaN(d.getTime())
          ? null
          : d.toISOString().split("T")[0];
      }

      const str = String(value).trim();

      const direct = str.match(
        /^(\d{4}-\d{2}-\d{2})/
      );

      if (direct) {
        return direct[1];
      }

      const d = new Date(str);

      return Number.isNaN(d.getTime())
        ? null
        : d.toISOString().split("T")[0];
    }

    function normalizeTeam(
      team,
      fallbackName = "Équipe",
      fallbackLogo = ""
    ) {
      const raw = obj(team);

      return {
        id: idOf(raw),

        name:
          nameOf(raw) ||
          raw.name ||
          fallbackName ||
          "Équipe",

        logo:
          imageOf(raw) ||
          fallbackLogo ||
          ""
      };
    }

function isStageCompetitionName(value) {
  const name = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return /^(regular season|fall season|spring season|summer season|winter season|group stage|first round|second round|third round|round of \d+|quarterfinal|quarterfinals|quarter-final|quarter-finals|semifinal|semifinals|semi-final|semi-finals|final|playoff|playoffs|play-off|play-offs)$/i.test(
    name
  );
}

function cleanCompetitionName(value) {
  let name = text(value);

  if (!name) {
    return "";
  }

  name = String(name)
    .replace(/\s+/g, " ")
    .trim();

  /* مثال:
     Premier League - Regular Season - 7
     => Premier League
  */
  name = name.replace(
    /\s*[-–—:|]\s*(Regular Season|Fall Season|Spring Season|Summer Season|Winter Season|Group Stage|First Round|Second Round|Third Round|Round of \d+|Quarterfinals?|Quarter-finals?|Semifinals?|Semi-finals?|Final|Playoffs?|Play-offs?)\s*(?:[-–—:|]\s*\d+)?\s*$/i,
    ""
  ).trim();

  /* مثال:
     2026-27 Premier League
     => Premier League
  */
  name = name.replace(
    /^\d{4}(?:-\d{2})?\s*[-–—:|]?\s*/i,
    ""
  ).trim();

  return name;
}

function getRealCompetition(raw) {
  const candidates = [
    raw?.competition,
    raw?.league,
    raw?.tournament,
    raw?.uniqueTournament,
    raw?.competitionData,
    raw?.leagueData
  ];

  /* أولاً: نقلبو على اسم بطولة حقيقي */
  for (const candidate of candidates) {
    const name = cleanCompetitionName(candidate);

    if (
      name &&
      !isStageCompetitionName(name)
    ) {
      return {
        value: candidate,
        name
      };
    }
  }

  /* بعض APIs كيكون الاسم الحقيقي داخل nested objects */
  const nestedCandidates = [
    raw?.competition?.tournament,
    raw?.competition?.league,
    raw?.competition?.uniqueTournament,
    raw?.league?.tournament,
    raw?.league?.uniqueTournament,
    raw?.tournament?.uniqueTournament,
    raw?.tournament?.competition,
    raw?.tournament?.league
  ];

  for (const candidate of nestedCandidates) {
    const name = cleanCompetitionName(candidate);

    if (
      name &&
      !isStageCompetitionName(name)
    ) {
      return {
        value: candidate,
        name
      };
    }
  }

  return {
    value: {},
    name: "Football"
  };
}

/* =========================================================
   REAL COMPETITION NAME
   Stage ≠ Competition
========================================================= */

const GENERIC_STAGE_REGEX =
  /^(regular season|fall season|spring season|summer season|winter season|group stage|first round|second round|third round|round of \d+|quarterfinal|quarterfinals|quarter-final|quarter-finals|semifinal|semifinals|semi-final|semi-finals|final|playoff|playoffs|play-off|play-offs)(?:\s*[-–—:|]\s*\d+)?$/i;

function cleanCompetitionValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  let name = "";

  if (typeof value === "string") {
    name = value.trim();
  }

  else if (typeof value === "number") {
    name = String(value);
  }

  else if (
    typeof value === "object"
  ) {
    name =
      value?.name ||
      value?.displayName ||
      value?.full_name ||
      value?.fullName ||
      value?.title ||
      value?.label ||
      "";
  }

  name =
    String(name || "")
      .replace(/\s+/g, " ")
      .trim();

  if (!name) {
    return "";
  }

  /* 
     مثال:
     Premier League - Regular Season - 7
     => Premier League
  */
  name =
    name.replace(
      /\s*[-–—:|]\s*(regular season|fall season|spring season|summer season|winter season|group stage|first round|second round|third round|round of \d+|quarterfinals?|quarter-finals?|semifinals?|semi-finals?|final|playoffs?|play-offs?)\s*(?:[-–—:|]\s*\d+)?\s*$/i,
      ""
    )
    .trim();

  /*
     Regular Season - 7
     Final
     Group Stage
     => ماشي competition
  */
  if (
    !name ||
    GENERIC_STAGE_REGEX.test(name)
  ) {
    return "";
  }

  return name;
}

function findRealCompetition(raw) {

  const candidates = [
    raw?.league,
    raw?.tournament,
    raw?.uniqueTournament,
    raw?.competition,

    raw?.league?.tournament,
    raw?.league?.uniqueTournament,
    raw?.league?.competition,

    raw?.tournament?.uniqueTournament,
    raw?.tournament?.competition,
    raw?.tournament?.league,

    raw?.competition?.tournament,
    raw?.competition?.uniqueTournament,
    raw?.competition?.league,

    raw?.competition_name,
    raw?.league_name,
    raw?.tournament_name
  ];

  let stage = "";

  for (
    const candidate of candidates
  ) {

    const cleaned =
      cleanCompetitionValue(
        candidate
      );

    if (cleaned) {
      return {
        name: cleaned,
        source: candidate,
        stage
      };
    }

    /*
      إذا كان الاسم Stage،
      نخليه للـround ونكملو نقلبو على الحقيقي.
    */
    let rawName = "";

    if (
      typeof candidate === "string"
    ) {
      rawName =
        candidate.trim();
    }

    else if (
      candidate &&
      typeof candidate === "object"
    ) {
      rawName =
        candidate?.name ||
        candidate?.displayName ||
        candidate?.title ||
        "";
    }

    if (
      rawName &&
      GENERIC_STAGE_REGEX.test(
        String(rawName)
          .trim()
      )
    ) {
      stage =
        String(rawName)
          .trim();
    }
  }

  return {
    name: "",
    source: {},
    stage
  };
}

/* =========================================================
   COMPETITION RESOLVER
   IMPORTANT:
   Competition = البطولة
   Stage / Round = المرحلة
========================================================= */

function isGenericStage(value) {
  const name = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return /^(regular season|fall season|spring season|summer season|winter season|group stage|first round|second round|third round|round of \d+|quarterfinals?|quarter-finals?|semifinals?|semi-finals?|final|playoffs?|play-offs?|league)$/i.test(
    name
  );
}

function competitionNameFromSlug(value) {
  if (!value) return "";

  let slug = String(value)
    .toLowerCase()
    .trim();

  if (!slug) return "";

  slug = slug
    .replace(
      /^\d{4}(?:-\d{2})?-?/,
      ""
    )
    .replace(
      /-(regular-season|fall-season|spring-season|summer-season|winter-season|group-stage|first-round|second-round|third-round|round-of-\d+|quarterfinals?|quarter-finals?|semifinals?|semi-finals?|final|playoffs?|play-offs?)$/,
      ""
    )
    .replace(/-/g, " ")
    .trim();

  if (
    !slug ||
    isGenericStage(slug)
  ) {
    return "";
  }

  return slug
    .replace(/\b\w/g, char =>
      char.toUpperCase()
    );
}

function getCompetitionText(value) {
  if (
    typeof value === "string"
  ) {
    return value.trim();
  }

  if (
    typeof value === "number"
  ) {
    return String(value);
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return (
      value?.name ||
      value?.displayName ||
      value?.full_name ||
      value?.fullName ||
      value?.title ||
      value?.label ||
      ""
    );
  }

  return "";
}

function resolveCompetition(raw) {

  const objects = [
    raw?.league,
    raw?.uniqueTournament,
    raw?.tournament,
    raw?.competition,

    raw?.league?.uniqueTournament,
    raw?.league?.tournament,
    raw?.league?.competition,

    raw?.tournament?.uniqueTournament,
    raw?.tournament?.competition,
    raw?.tournament?.league,

    raw?.competition?.uniqueTournament,
    raw?.competition?.tournament,
    raw?.competition?.league
  ];

  let stage =
    raw?.round ||
    raw?.round_name ||
    raw?.stage ||
    raw?.stage_name ||
    null;

  /* 1. نقلبو على اسم حقيقي داخل objects */
  for (
    const candidate of objects
  ) {

    const name =
      getCompetitionText(
        candidate
      ).trim();

    if (!name) {
      continue;
    }

    if (
      isGenericStage(name)
    ) {
      if (!stage) {
        stage = name;
      }

      continue;
    }

    return {
      object: candidate,
      name,
      id:
        candidate?.id ??
        null,
      stage
    };
  }

  /* 2. نقلبو فالأسماء المباشرة */
  const directNames = [
    raw?.league_name,
    raw?.competition_name,
    raw?.tournament_name,
    raw?.competitionName,
    raw?.leagueName
  ];

  for (
    const value of directNames
  ) {

    const name =
      getCompetitionText(
        value
      ).trim();

    if (!name) {
      continue;
    }

    if (
      isGenericStage(name)
    ) {
      if (!stage) {
        stage = name;
      }

      continue;
    }

    return {
      object: {},
      name,
      id:
        raw?.competition_id ||
        raw?.league_id ||
        null,
      stage
    };
  }

  /* 3. آخر محاولة: competition slug */
  const slugCandidates = [
    raw?.competition_slug,
    raw?.league_slug,
    raw?.tournament_slug,
    raw?.competition?.slug,
    raw?.league?.slug,
    raw?.tournament?.slug,
    raw?.uniqueTournament?.slug
  ];

  for (
    const slug of slugCandidates
  ) {

    const name =
      competitionNameFromSlug(
        slug
      );

    if (name) {
      return {
        object: {},
        name,
        id:
          raw?.competition_id ||
          raw?.league_id ||
          null,
        stage
      };
    }
  }

  return {
    object: {},
    name: "",
    id:
      raw?.competition_id ||
      raw?.league_id ||
      null,
    stage
  };
}
     
function normalizeMatch(item) {
  if (!item) {
    return null;
  }

  const raw =
    item?.match &&
    typeof item.match === "object"
      ? item.match
      : item;

  const homeRaw = first(
    raw?.home_team,
    raw?.homeTeam,
    raw?.teams?.home,
    raw?.home,
    {}
  );

  const awayRaw = first(
    raw?.away_team,
    raw?.awayTeam,
    raw?.teams?.away,
    raw?.away,
    {}
  );

  const homeName =
    nameOf(homeRaw) ||
    raw?.home_name ||
    "Domicile";

  const awayName =
    nameOf(awayRaw) ||
    raw?.away_name ||
    "Extérieur";

  const homeLogo =
    imageOf(homeRaw) ||
    imageOf(raw?.home) ||
    imageOf(raw?.homeTeam) ||
    raw?.home_logo ||
    raw?.homeLogo ||
    raw?.home_logo_url ||
    "";

  const awayLogo =
    imageOf(awayRaw) ||
    imageOf(raw?.away) ||
    imageOf(raw?.awayTeam) ||
    raw?.away_logo ||
    raw?.awayLogo ||
    raw?.away_logo_url ||
    "";

  const homeId =
    idOf(homeRaw) ||
    raw?.home_id ||
    null;

  const awayId =
    idOf(awayRaw) ||
    raw?.away_id ||
    null;

  const slug =
    raw?.slug ||
    raw?.match_slug ||
    item?.slug ||
    item?.match_slug ||
    (
      homeName &&
      awayName
        ? `${slugPart(homeName)}-vs-${slugPart(awayName)}`
        : null
    );

  const provider =
    raw?.provider ||
    item?.provider ||
    "SportScore";

  const originalUpstreamId =
    raw?.id ||
    raw?.match_id ||
    raw?.fixture_id ||
    raw?.event_id ||
    null;

  let sourceFixtureId = null;

  if (
    provider === "SofaScore" &&
    originalUpstreamId !== null
  ) {
    sourceFixtureId =
      `sofa-${originalUpstreamId}`;
  }

  else if (
    provider === "ESPN" &&
    originalUpstreamId !== null
  ) {
    sourceFixtureId =
      `espn-${originalUpstreamId}`;
  }

  else if (
    provider === "TheSportsDB" &&
    originalUpstreamId !== null
  ) {
    sourceFixtureId =
      `tsdb-${originalUpstreamId}`;
  }

  const finalFixtureId =
    sourceFixtureId ||
    slug ||
    originalUpstreamId ||
    null;

  const score =
    obj(raw?.score);

  const homeScore =
    first(
      raw?.home_score,
      raw?.homeScore,
      score?.home,
      score?.fulltime?.home,
      score?.current?.home,
      null
    );

  const awayScore =
    first(
      raw?.away_score,
      raw?.awayScore,
      score?.away,
      score?.fulltime?.away,
      score?.current?.away,
      null
    );

  let statusShort =
    first(
      raw?.status_code,
      raw?.short_status,
      raw?.status?.short,
      ""
    );

  const statusText =
    String(
      first(
        raw?.status_text,
        raw?.status?.long,
        raw?.status,
        ""
      )
    ).toLowerCase();

  if (!statusShort) {
    if (
      /live|in play|inplay/.test(statusText)
    ) {
      statusShort = "LIVE";
    }

    else if (
      /half|ht|halftime/.test(statusText)
    ) {
      statusShort = "HT";
    }

    else if (
      /finish|ended|finished|ft/.test(
        statusText
      )
    ) {
      statusShort = "FT";
    }

    else if (
      /postpon/.test(statusText)
    ) {
      statusShort = "PST";
    }

    else if (
      /cancel/.test(statusText)
    ) {
      statusShort = "CANC";
    }

    else {
      statusShort = "NS";
    }
  }

  const competition =
    first(
      raw?.competition,
      raw?.league,
      raw?.tournament,
      raw?.uniqueTournament,
      {}
    );

  return {
    id:
      finalFixtureId,

    slug:
      finalFixtureId,

    provider:

      provider,

    fixture: {
      id:
        finalFixtureId,

      slug:
        finalFixtureId,

      upstreamId:
        finalFixtureId,

      date:
        first(
          raw?.time,
          raw?.date,
          raw?.start_time,
          raw?.kickoff,
          null
        ),

      status: {
        short:
          statusShort,

        long:
          first(
            raw?.status_text,
            raw?.status?.long,
            raw?.status,
            "Match"
          ),

        elapsed:
          first(
            raw?.minute,
            raw?.elapsed,
            raw?.status?.elapsed,
            null
          )
      },

      venue:
        raw?.venue ||
        null,

      referee:
        raw?.referee ||
        null,

      timezone:
        raw?.timezone ||
        null
    },

    league: {
      id:
        idOf(competition) ||
        raw?.competition_id ||
        raw?.league_id ||
        null,

      name:
        nameOf(competition) ||
        raw?.competition_name ||
        raw?.league_name ||
        "Football",

      country:
        competition?.country ||
        raw?.country ||
        null,

      logo:
        imageOf(competition) ||
        imageOf(raw?.league) ||
        imageOf(raw?.tournament) ||
        imageOf(raw?.uniqueTournament) ||
        raw?.competition_logo ||
        raw?.competitionLogo ||
        raw?.competition_logo_url ||
        raw?.league_logo ||
        raw?.leagueLogo ||
        "",

      round:
        raw?.round ||
        raw?.round_name ||
        null,

      season:
        raw?.season ||
        null
    },

    teams: {
      home:
        normalizeTeam(
          homeRaw,
          homeName,
          homeLogo
        ),

      away:
        normalizeTeam(
          awayRaw,
          awayName,
          awayLogo
        )
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
          first(
            score?.halftime?.home,
            score?.ht?.home,
            null
          ),

        away:
          first(
            score?.halftime?.away,
            score?.ht?.away,
            null
          )
      },

      fulltime: {
        home:
          homeScore,

        away:
          awayScore
      }
    }
  };
}

    function getMatches(body) {
      if (Array.isArray(body?.matches)) {
        return body.matches;
      }

      if (Array.isArray(body?.fixtures)) {
        return body.fixtures;
      }

      if (Array.isArray(body?.data)) {
        return body.data;
      }

      if (
        Array.isArray(body?.data?.matches)
      ) {
        return body.data.matches;
      }

      if (
        Array.isArray(body?.data?.fixtures)
      ) {
        return body.data.fixtures;
      }

      if (Array.isArray(body)) {
        return body;
      }

      return [];
    }

    function getDetailRoot(body) {
      if (
        body?.match &&
        typeof body.match === "object"
      ) {
        return body.match;
      }

      if (
        body?.data?.match &&
        typeof body.data.match === "object"
      ) {
        return body.data.match;
      }

      if (
        body?.data &&
        typeof body.data === "object" &&
        !Array.isArray(body.data)
      ) {
        return body.data;
      }

      return body || null;
    }

    function normalizePlayer(
      row,
      forcedTeam = null,
      forcedSubstitute = false
    ) {
      const wrapper = obj(row);

      const raw = obj(
        wrapper?.player ||
        wrapper
      );

      const teamRaw = first(
        wrapper?.team,
        wrapper?.club,
        raw?.team,
        raw?.club,
        forcedTeam,
        {}
      );

      const name = first(
        raw?.name,
        raw?.full_name,
        raw?.fullName,
        wrapper?.name,
        wrapper?.player_name,
        "Joueur"
      );

      const number = first(
        wrapper?.shirtNumber,
        wrapper?.shirt_number,
        wrapper?.jerseyNumber,
        wrapper?.jersey,
        wrapper?.number,
        raw?.shirtNumber,
        raw?.shirt_number,
        raw?.jerseyNumber,
        raw?.jersey,
        raw?.number,
        null
      );

      const position = first(
        wrapper?.position,
        wrapper?.pos,
        wrapper?.role,
        raw?.position,
        raw?.pos,
        raw?.role,
        ""
      );

      const grid = first(
        wrapper?.grid,
        wrapper?.position_grid,
        wrapper?.positionGrid,
        raw?.grid,
        raw?.position_grid,
        raw?.positionGrid,
        ""
      );

      const x = first(
        wrapper?.x,
        wrapper?.coord_x,
        wrapper?.coordinate_x,
        raw?.x,
        raw?.coord_x,
        raw?.coordinate_x,
        null
      );

      const y = first(
        wrapper?.y,
        wrapper?.coord_y,
        wrapper?.coordinate_y,
        raw?.y,
        raw?.coord_y,
        raw?.coordinate_y,
        null
      );

      const rating = first(
        wrapper?.rating,
        wrapper?.performance?.rating,
        wrapper?.statistics?.rating,
        raw?.rating,
        raw?.performance?.rating,
        raw?.statistics?.rating,
        null
      );

      return {
        player: {
          id: first(
            raw?.id,
            wrapper?.player_id,
            wrapper?.id,
            null
          ),

          name,

          number,

          pos: position,

          position,

          grid,

          x,

          y,

          photo:
            imageOf(raw) ||
            imageOf(wrapper) ||
            "",

          team: normalizeTeam(
            teamRaw,
            "Équipe",
            ""
          )
        },

        rating,

        games: {
          rating,

          minutes: first(
            wrapper?.minutes,
            wrapper?.minutesPlayed,
            raw?.minutes,
            null
          ),

          position,

          substitute:
            forcedSubstitute ||
            wrapper?.substitute === true ||
            wrapper?.starter === false,

          captain:
            wrapper?.captain === true ||
            raw?.captain === true
        },

        goals: {
          total:
            Number(
              first(
                wrapper?.goals?.total,
                wrapper?.goals,
                raw?.goals?.total,
                raw?.goals,
                0
              )
            ) || 0,

          assists:
            Number(
              first(
                wrapper?.goals?.assists,
                wrapper?.assists,
                raw?.goals?.assists,
                raw?.assists,
                0
              )
            ) || 0
        },

        cards: {
          yellow:
            Number(
              first(
                wrapper?.cards?.yellow,
                wrapper?.yellow,
                raw?.cards?.yellow,
                raw?.yellow,
                0
              )
            ) || 0,

          red:
            Number(
              first(
                wrapper?.cards?.red,
                wrapper?.red,
                raw?.cards?.red,
                raw?.red,
                0
              )
            ) || 0
        },

        passes: {
          key:
            Number(
              first(
                wrapper?.passes?.key,
                wrapper?.key_passes,
                raw?.passes?.key,
                0
              )
            ) || 0
        },

        shots: {
          total:
            Number(
              first(
                wrapper?.shots?.total,
                wrapper?.shots,
                raw?.shots?.total,
                0
              )
            ) || 0,

          on:
            Number(
              first(
                wrapper?.shots?.on,
                wrapper?.shots_on_target,
                raw?.shots?.on,
                0
              )
            ) || 0
        },

        raw: row
      };
    }

    function isPlayerLike(value) {
      if (
        !value ||
        typeof value !== "object"
      ) {
        return false;
      }

      return !!first(
        value?.player?.name,
        value?.name,
        value?.full_name,
        value?.player_name,
        value?.number,
        value?.shirtNumber,
        value?.shirt_number,
        value?.position,
        value?.pos,
        null
      );
    }

    function arrayFrom(value) {
      if (Array.isArray(value)) {
        return value;
      }

      if (
        value &&
        typeof value === "object"
      ) {
        for (
          const key of [
            "players",
            "items",
            "list",
            "data",
            "xi",
            "startXI",
            "startingXI",
            "starters"
          ]
        ) {
          if (Array.isArray(value[key])) {
            return value[key];
          }
        }
      }

      return [];
    }

    function normalizeLineup(
      source,
      team,
      fallbackFormation = "—"
    ) {
      if (
        source === null ||
        source === undefined
      ) {
        return null;
      }

      let raw = source;

      if (Array.isArray(source)) {
        raw = {
          players: source
        };
      } else if (
        typeof source !== "object"
      ) {
        return null;
      }

      const formationValue = first(
        raw?.formation,
        raw?.tacticalFormation,
        raw?.formationUsed,
        raw?.tactics?.formation,
        fallbackFormation,
        "—"
      );

      const formation =
        typeof formationValue === "object"
          ? first(
              formationValue?.name,
              formationValue?.value,
              formationValue?.formation,
              "—"
            )
          : formationValue;

      let starters = arrayFrom(
        first(
          raw?.startXI,
          raw?.startingXI,
          raw?.starting_xi,
          raw?.startingLineup,
          raw?.starters,
          raw?.xi,
          raw?.players,
          []
        )
      );

      let substitutes = arrayFrom(
        first(
          raw?.substitutes,
          raw?.subs,
          raw?.bench,
          raw?.players_substitutes,
          []
        )
      );

      if (
        !substitutes.length &&
        starters.length
      ) {
        const markedSubs =
          starters.filter(
            p =>
              p?.substitute === true ||
              p?.starter === false
          );

        if (markedSubs.length) {
          substitutes = markedSubs;

          starters =
            starters.filter(
              p =>
                !(
                  p?.substitute === true ||
                  p?.starter === false
                )
            );
        }
      }

      const startXI = starters
        .filter(isPlayerLike)
        .map(p =>
          normalizePlayer(
            p,
            team,
            false
          )
        )
        .slice(0, 11);

      const subs = substitutes
        .filter(isPlayerLike)
        .map(p =>
          normalizePlayer(
            p,
            team,
            true
          )
        );

      return {
        team: normalizeTeam(
          first(
            raw?.team,
            team,
            {}
          ),
          team?.name || "Équipe",
          team?.logo || ""
        ),

        formation:
          String(
            formation || "—"
          ),

        coach:
          first(
            raw?.coach,
            raw?.manager,
            null
          ),

        startXI,

        substitutes: subs
      };
    }

    function teamMatches(
      candidate,
      team,
      side
    ) {
      if (!candidate) {
        return false;
      }

      const c = obj(candidate);

      const ct = first(
        c?.team,
        c?.club,
        {}
      );

      const cid =
        idOf(ct) ||
        c?.team_id ||
        c?.teamId;

      const cname =
        nameOf(ct) ||
        c?.team_name ||
        c?.teamName;

      if (
        team?.id &&
        cid &&
        String(team.id) ===
          String(cid)
      ) {
        return true;
      }

      if (
        team?.name &&
        cname &&
        norm(team.name) ===
          norm(cname)
      ) {
        return true;
      }

      const key =
        norm(String(side || ""));

      const label = norm(
        first(
          c?.side,
          c?.team_side,
          c?.for,
          c?.group,
          c?.name,
          ""
        )
      );

      return (
        key === label ||
        (
          key === "home" &&
          ["home", "host"].includes(label)
        ) ||
        (
          key === "away" &&
          ["away", "guest"].includes(label)
        )
      );
    }

    function getLineups(
      root,
      homeTeam,
      awayTeam
    ) {
      const candidates = [
        root?.lineups,
        root?.lineup,
        root?.compositions,
        root?.formations,
        root
      ].filter(Boolean);

      let source = null;

      for (
        const candidate of candidates
      ) {
        if (
          candidate &&
          typeof candidate === "object"
        ) {
          source = candidate;

          if (
            candidate?.home ||
            candidate?.away ||
            candidate?.home_xi ||
            candidate?.away_xi ||
            candidate?.home_starting ||
            candidate?.away_starting ||
            candidate?.home_startingXI ||
            candidate?.away_startingXI
          ) {
            break;
          }
        }
      }

      const result = [];

      function makeSide(
        side,
        team
      ) {
        const direct = `${side}_`;

        let rawSide = null;

        if (
          source &&
          !Array.isArray(source)
        ) {
          rawSide = first(
            source?.[side],

            source?.[
              side === "home"
                ? "host"
                : "guest"
            ],

            source?.[
              `${direct}lineup`
            ],

            source?.[
              `${direct}xi`
            ],

            source?.[
              `${direct}starting`
            ],

            source?.[
              `${direct}starting_xi`
            ],

            source?.[
              `${direct}startingXI`
            ],

            source?.[
              `${direct}startingLineup`
            ],

            source?.[
              `${direct}players`
            ],

            source?.[
              `${direct}team`
            ],

            null
          );

          const formation =
            first(
              source?.[
                `${direct}formation`
              ],

              source?.formation?.[
                side
              ],

              source?.formation?.[
                `${direct}formation`
              ],

              null
            );

          const xi = first(
            source?.[
              `${direct}xi`
            ],

            source?.[
              `${direct}starting`
            ],

            source?.[
              `${direct}starting_xi`
            ],

            source?.[
              `${direct}startingXI`
            ],

            source?.[
              `${direct}startingLineup`
            ],

            source?.[
              `${direct}players`
            ],

            null
          );

          const subs = first(
            source?.[
              `${direct}subs`
            ],

            source?.[
              `${direct}substitutes`
            ],

            source?.[
              `${direct}bench`
            ],

            null
          );

          if (
            Array.isArray(xi) ||
            Array.isArray(subs) ||
            formation
          ) {
            rawSide = {
              formation,

              players:
                Array.isArray(xi)
                  ? xi
                  : [],

              substitutes:
                Array.isArray(subs)
                  ? subs
                  : []
            };
          }
        }

        if (
          !rawSide &&
          root &&
          !Array.isArray(root)
        ) {
          const xi = first(
            root?.[
              `${direct}xi`
            ],

            root?.[
              `${direct}starting`
            ],

            root?.[
              `${direct}starting_xi`
            ],

            root?.[
              `${direct}startingXI`
            ],

            root?.[
              `${direct}startingLineup`
            ],

            root?.[
              `${direct}players`
            ],

            null
          );

          const subs = first(
            root?.[
              `${direct}subs`
            ],

            root?.[
              `${direct}substitutes`
            ],

            root?.[
              `${direct}bench`
            ],

            null
          );

          const formation =
            root?.[
              `${direct}formation`
            ];

          if (
            Array.isArray(xi) ||
            Array.isArray(subs) ||
            formation
          ) {
            rawSide = {
              formation,

              players:
                arr(xi),

              substitutes:
                arr(subs)
            };
          }
        }

        if (Array.isArray(source)) {
          const group =
            source.find(
              item =>
                teamMatches(
                  item,
                  team,
                  side
                )
            );

          if (group) {
            rawSide = group;
          }
        }

        if (rawSide) {
          const lineup =
            normalizeLineup(
              rawSide,
              team
            );

          if (
            lineup &&
            (
              lineup.startXI.length ||
              lineup.substitutes.length
            )
          ) {
            return lineup;
          }
        }

        return null;
      }

      const home = makeSide(
        "home",
        homeTeam
      );

      const away = makeSide(
        "away",
        awayTeam
      );

      if (home) {
        result.push(home);
      }

      if (away) {
        result.push(away);
      }

      if (
        result.length < 2 &&
        Array.isArray(source)
      ) {
        for (
          const group of source
        ) {
          if (
            !group ||
            typeof group !== "object"
          ) {
            continue;
          }

          const team = first(
            group?.team,
            group?.club,
            {}
          );

          const normalizedName =
            norm(nameOf(team));

          if (
            !result.some(
              x =>
                norm(x.team.name) ===
                normalizedName
            )
          ) {
            const target =
              teamMatches(
                group,
                homeTeam,
                "home"
              )
                ? homeTeam
                : awayTeam;

            const lineup =
              normalizeLineup(
                group,
                target
              );

            if (
              lineup &&
              (
                lineup.startXI.length ||
                lineup.substitutes.length
              )
            ) {
              result.push(lineup);
            }
          }

          if (result.length >= 2) {
            break;
          }
        }
      }

      return result.slice(0, 2);
    }

    function playerValue(value) {
      if (
        typeof value === "string" ||
        typeof value === "number"
      ) {
        return String(value);
      }

      if (
        value &&
        typeof value === "object"
      ) {
        return first(
          value?.name,
          value?.full_name,
          value?.fullName,
          value?.short_name,
          value?.player?.name,
          ""
        );
      }

      return "";
    }

    function normalizeEvent(event) {
      const raw = obj(event);

      const rawType = first(
        raw?.type,
        raw?.incidentType,
        raw?.event_type,
        raw?.kind,
        "Other"
      );

      const detail = first(
        raw?.detail,
        raw?.incidentClass,
        raw?.reason,
        raw?.description,
        ""
      );

      const typeNorm =
        norm(rawType);

      const detailNorm =
        norm(detail);

      let kind = "other";

      if (
        typeNorm.includes("goal") ||
        detailNorm.includes("goal") ||
        raw?.goal
      ) {
        kind = "goal";
      }

      else if (
        typeNorm.includes("second yellow") ||
        detailNorm.includes("second yellow") ||
        typeNorm.includes("red") ||
        detailNorm.includes("red")
      ) {
        kind = "red";
      }

      else if (
        typeNorm.includes("yellow") ||
        detailNorm.includes("yellow") ||
        typeNorm.includes("card") ||
        detailNorm.includes("card")
      ) {
        kind = "yellow";
      }

      else if (
        typeNorm.includes("subst") ||
        typeNorm.includes("change") ||
        raw?.player_in ||
        raw?.playerOut ||
        raw?.player_out ||
        raw?.playerIn
      ) {
        kind = "substitution";
      }

      else if (
        typeNorm.includes("var") ||
        detailNorm.includes("var")
      ) {
        kind = "var";
      }

      const playerRaw = first(
        raw?.player,
        raw?.player_name,
        raw?.scorer,
        raw?.goalscorer,
        ""
      );

      const assistRaw = first(
        raw?.assist,
        raw?.assist1,
        raw?.assist_name,
        raw?.provider,
        ""
      );

      const inRaw = first(
        raw?.player_in,
        raw?.playerIn,
        raw?.incoming,
        raw?.in_player,
        raw?.substitute,
        raw?.sub_in,
        ""
      );

      const outRaw = first(
        raw?.player_out,
        raw?.playerOut,
        raw?.outgoing,
        raw?.out_player,
        raw?.replaced,
        raw?.sub_out,
        ""
      );

      const teamRaw =
        first(
          raw?.team,
          raw?.club,
          {}
        );

      const minute = first(
        raw?.time?.elapsed,

        typeof raw?.time ===
        "number"
          ? raw.time
          : null,

        raw?.minute,
        raw?.elapsed,
        raw?.time,
        null
      );

      const extra = first(
        raw?.time?.extra,
        raw?.addedTime,
        raw?.extra,
        null
      );

      return {
        time: {
          elapsed: minute,
          extra
        },

        minute,

        extra,

        team: {
          id: first(
            teamRaw?.id,
            raw?.team_id,
            raw?.teamId,
            raw?.club_id,
            null
          ),

          name: first(
            nameOf(teamRaw),
            raw?.team_name,
            raw?.teamName,
            raw?.club_name,
            ""
          )
        },

        player: {
          id: first(
            playerRaw?.id,
            raw?.player_id,
            raw?.playerId,
            null
          ),

          name:
            playerValue(playerRaw)
        },

        assist: {
          id: first(
            assistRaw?.id,
            raw?.assist_id,
            raw?.assistId,
            null
          ),

          name:
            playerValue(assistRaw)
        },

        type:
          String(
            rawType || "Other"
          ),

        detail:
          String(
            detail || ""
          ),

        kind,

        playerIn:
          playerValue(inRaw),

        playerOut:
          playerValue(outRaw)
      };
    }

    function normalizeEvents(root) {
      const source = first(
        root?.events,
        root?.incidents,
        root?.timeline,
        root?.match_events,
        root?.match?.events,
        []
      );

      return arr(source)
        .map(normalizeEvent)
        .filter(
          event =>
            event.minute !== null ||
            event.type ||
            event.detail
        );
    }

    function normalizeStatistics(
      root,
      homeTeam,
      awayTeam
    ) {
      const source = first(
        root?.statistics,
        root?.stats,
        []
      );

      if (
        Array.isArray(source) &&
        source[0]?.groups
      ) {
        const all =
          source.find(
            block =>
              String(
                block?.period || ""
              ).toUpperCase() === "ALL"
          ) ||
          source[0] ||
          {};

        const homeStats = [];
        const awayStats = [];

        arr(all?.groups).forEach(
          group => {
            arr(
              group?.statisticsItems
            ).forEach(item => {
              const name = first(
                item?.name,
                item?.key,
                "Stat"
              );

              homeStats.push({
                type: name,

                value: first(
                  item?.home,
                  item?.homeValue,
                  "-"
                )
              });

              awayStats.push({
                type: name,

                value: first(
                  item?.away,
                  item?.awayValue,
                  "-"
                )
              });
            });
          }
        );

        return [
          {
            team: homeTeam,
            statistics: homeStats
          },

          {
            team: awayTeam,
            statistics: awayStats
          }
        ];
      }

      if (
        Array.isArray(source) &&
        source.length >= 2
      ) {
        return source
          .slice(0, 2)
          .map(
            (
              block,
              index
            ) => ({
              team:
                index === 0
                  ? homeTeam
                  : awayTeam,

              statistics: arr(
                block?.statistics ||
                block?.stats
              ).map(
                stat => ({
                  type: first(
                    stat?.type,
                    stat?.name,
                    "Stat"
                  ),

                  value:
                    first(
                      stat?.value,
                      "-"
                    )
                })
              )
            })
          );
      }

      return [];
    }

    function buildPlayers(lineups) {
      return arr(lineups).map(
        lineup => ({
          team: lineup.team,

          players: [
            ...arr(lineup.startXI),
            ...arr(lineup.substitutes)
          ]
        })
      );
    }

    /* =====================================================
       MATCH DETAILS
       ===================================================== */

     const source =
  String(
    req?.query?.source ||
    ""
  )
    .trim()
    .toLowerCase();
     
  /* =====================================================
   SOURCE-SPECIFIC MATCH DETAILS
   كل ماتش خاصو يرجع من نفس المصدر
===================================================== */

if (
  source === "sofascore"
) {

  const eventId =
    String(fixture)
      .replace(/^sofa-/i, "")
      .trim();

  if (!eventId) {
    return output(
      400,
      {
        error:
          "SofaScore event ID manquant",
        data: []
      }
    );
  }

  try {

    const [
      eventBody,
      incidentsBody,
      lineupsBody,
      statisticsBody
    ] = await Promise.all([
      getJSON(
        `https://www.sofascore.com/api/v1/event/${encodeURIComponent(eventId)}`
      ),

      getJSON(
        `https://www.sofascore.com/api/v1/event/${encodeURIComponent(eventId)}/incidents`
      ),

      getJSON(
        `https://www.sofascore.com/api/v1/event/${encodeURIComponent(eventId)}/lineups`
      ),

      getJSON(
        `https://www.sofascore.com/api/v1/event/${encodeURIComponent(eventId)}/statistics`
      )
    ]);

    const event =
      eventBody?.event ||
      {};

    const home =
      event?.homeTeam ||
      {};

    const away =
      event?.awayTeam ||
      {};

    const tournament =
      event?.tournament ||
      {};

    const uniqueTournament =
      tournament?.uniqueTournament ||
      {};

    const category =
      tournament?.category ||
      {};

    const details = {

      fixture: {

        id:
          eventId,

        slug:
          event?.slug ||
          `sofa-${eventId}`,

        upstreamId:
          eventId,

        date:
          event?.startTimestamp
            ? new Date(
                Number(
                  event.startTimestamp
                ) * 1000
              ).toISOString()
            : null,

        status: {
          short:
            event?.status?.type === "inprogress"
              ? "LIVE"
              : event?.status?.type === "halftime"
                ? "HT"
                : event?.status?.type === "finished"
                  ? "FT"
                  : "NS",

          long:
            event?.status?.description ||
            "Match",

          elapsed:
            event?.status?.currentPeriodStartTimestamp
              ? null
              : null
        },

        venue:
          event?.venue?.name ||
          null

      },

      league: {

        id:
          uniqueTournament?.id ||
          tournament?.id ||
          null,

        name:
          uniqueTournament?.name ||
          tournament?.name ||
          "Football",

        country:
          category?.name ||
          "",

        logo:
          uniqueTournament?.id
            ? `https://api.sofascore.com/api/v1/unique-tournament/${uniqueTournament.id}/image`
            : "",

        round:
          null,

        season:
          event?.season?.name ||
          null

      },

      teams: {

        home: {

          id:
            home?.id ||
            null,

          name:
            home?.name ||
            "Domicile",

          logo:
            home?.id
              ? `https://api.sofascore.com/api/v1/team/${home.id}/image`
              : ""

        },

        away: {

          id:
            away?.id ||
            null,

          name:
            away?.name ||
            "Extérieur",

          logo:
            away?.id
              ? `https://api.sofascore.com/api/v1/team/${away.id}/image`
              : ""

        }

      },

      goals: {

        home:
          event?.homeScore?.current ??
          null,

        away:
          event?.awayScore?.current ??
          null

      },

      score: {

        home:
          event?.homeScore?.current ??
          null,

        away:
          event?.awayScore?.current ??
          null,

        halftime: {

          home:
            event?.homeScore?.period1 ??
            null,

          away:
            event?.awayScore?.period1 ??
            null

        },

        fulltime: {

          home:
            event?.homeScore?.current ??
            null,

          away:
            event?.awayScore?.current ??
            null

        }

      },

      events:
        incidentsBody?.incidents ||
        [],

      lineups: [

        {
          team:
            {
              id:
                home?.id ||
                null,
              name:
                home?.name ||
                "Domicile"
            },

          formation:
            lineupsBody?.home?.formation ||
            "—",

          players:
            lineupsBody?.home?.players ||
            [],

          substitutes:
            lineupsBody?.home?.substitutes ||
            []

        },

        {
          team:
            {
              id:
                away?.id ||
                null,
              name:
                away?.name ||
                "Extérieur"
            },

          formation:
            lineupsBody?.away?.formation ||
            "—",

          players:
            lineupsBody?.away?.players ||
            [],

          substitutes:
            lineupsBody?.away?.substitutes ||
            []

        }

      ],

      statistics:
        statisticsBody?.statistics ||
        [],

      players: [],

      provider:
        "SofaScore"

    };

    return output(
      200,
      {
        data: details,
        provider:
          "SofaScore"
      }
    );

  }
  catch (error) {

    console.warn(
      "SOFASCORE DETAILS ERROR:",
      error.message
    );

    return output(
      error?.status ||
        502,
      {
        error:
          "Impossible de charger les détails du match SofaScore",
        details:
          error?.data ||
          null,
        data: []
      }
    );

  }
}

/* =====================================================
   NEW MATCH DETAILS
   SofaScore / ESPN / TheSportsDB
===================================================== */

if (
  fixture &&
  /^(sofa|espn|tsdb)-/i.test(
    String(fixture).trim()
  )
) {
  return require("./details")(req, res);
}
     
     if (fixture) {
      const slug =
        String(fixture).trim();

      if (!slug) {
        return output(
          400,
          {
            error:
              "Match slug manquant",

            data: []
          }
        );
      }

      let body;
      let firstError = null;

      try {
        body = await getJSON(
          `${SPORTSCORE}/match/?sport=football&slug=${encodeURIComponent(
            slug
          )}`
        );
      }

      catch (error) {
        firstError = error;

        console.warn(
          "PRIMARY MATCH ENDPOINT FAILED:",
          error.message
        );

        try {
          body = await getJSON(
            `${WIDGET}/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}`
          );
        }

        catch (widgetError) {
          console.warn(
            "WIDGET MATCH ENDPOINT FAILED:",
            widgetError.message
          );

          return output(
            widgetError?.status ||
              firstError?.status ||
              502,

            {
              error:
                "Impossible de charger le match",

              details:
                widgetError?.data ||
                firstError?.data ||
                null,

              data: []
            }
          );
        }
      }

      const root =
        getDetailRoot(body);

      if (
        !root ||
        typeof root !== "object"
      ) {
        return output(
          404,
          {
            error:
              "Match introuvable",

            data: []
          }
        );
      }

      const basic =
        normalizeMatch(root);

      if (!basic) {
        return output(
          404,
          {
            error:
              "Match introuvable",

            data: []
          }
        );
      }

      const homeTeam =
        normalizeTeam(
          first(
            root?.home_team,
            root?.homeTeam,
            root?.teams?.home,
            basic.teams.home
          ),

          basic.teams.home.name,

          basic.teams.home.logo
        );

      const awayTeam =
        normalizeTeam(
          first(
            root?.away_team,
            root?.awayTeam,
            root?.teams?.away,
            basic.teams.away
          ),

          basic.teams.away.name,

          basic.teams.away.logo
        );

      const lineups =
        getLineups(
          root,
          homeTeam,
          awayTeam
        );

      const events =
        normalizeEvents(root);

      const statistics =
        normalizeStatistics(
          root,
          homeTeam,
          awayTeam
        );

      const players =
        buildPlayers(lineups);

      const score =
        obj(root?.score);

      const homeScore =
        first(
          root?.home_score,
          root?.homeScore,
          score?.home,
          score?.fulltime?.home,
          basic.goals.home,
          null
        );

      const awayScore =
        first(
          root?.away_score,
          root?.awayScore,
          score?.away,
          score?.fulltime?.away,
          basic.goals.away,
          null
        );

      const rawStatusText =
        String(
          first(
            root?.status_text,
            root?.status?.long,
            root?.status,
            basic.fixture.status.long,
            ""
          )
        ).toLowerCase();

      let statusShort =
        String(
          first(
            root?.status_code,
            root?.short_status,
            root?.status?.short,
            basic.fixture.status.short,
            "NS"
          )
        );

      if (
        /live|in play|inplay/.test(
          rawStatusText
        )
      ) {
        statusShort = "LIVE";
      }

      else if (
        /half|halftime|ht/.test(
          rawStatusText
        )
      ) {
        statusShort = "HT";
      }

      else if (
        /finish|finished|ended|ft/.test(
          rawStatusText
        )
      ) {
        statusShort = "FT";
      }

      const competition =
        first(
          root?.competition,
          root?.league,
          {}
        );

      const referee =
        first(
          root?.referee,
          basic.fixture.referee,
          null
        );

      const details = {
        fixture: {
          id: slug,

          slug,

          upstreamId:
            first(
              root?.id,
              root?.match_id,
              root?.fixture_id,
              basic.fixture.upstreamId,
              slug
            ),

          date:
            first(
              root?.time,
              root?.date,
              root?.start_time,
              root?.kickoff,
              basic.fixture.date,
              null
            ),

          timezone:
            first(
              root?.timezone,
              null
            ),

          status: {
            short:
              statusShort,

            long:
              first(
                root?.status_text,
                root?.status?.long,
                root?.status,
                basic.fixture.status.long,
                "Match"
              ),

            elapsed:
              first(
                root?.minute,
                root?.elapsed,
                root?.status?.elapsed,
                basic.fixture.status.elapsed,
                null
              )
          },

          venue:
            first(
              root?.venue,
              basic.fixture.venue,
              null
            ),

          referee:
            typeof referee === "object"
              ? first(
                  referee?.name,
                  ""
                )
              : referee
        },

        league: {
          id:
            idOf(competition) ||
            basic.league.id ||
            null,

          name:
            nameOf(competition) ||
            root?.competition_name ||
            root?.league_name ||
            basic.league.name ||
            "Football",

          country:
            competition?.country ||
            root?.country ||
            basic.league.country ||
            "",

          logo:
            imageOf(competition) ||
            basic.league.logo ||
            "",

          round:
            root?.round ||
            root?.round_name ||
            basic.league.round ||
            null,

          season:
            root?.season?.name ||
            root?.season ||
            basic.league.season ||
            null
        },

        teams: {
          home: homeTeam,
          away: awayTeam
        },

        goals: {
          home: homeScore,
          away: awayScore
        },

        score: {
          home: homeScore,
          away: awayScore,

          halftime: {
            home:
              first(
                score?.halftime?.home,
                score?.ht?.home,
                null
              ),

            away:
              first(
                score?.halftime?.away,
                score?.ht?.away,
                null
              )
          },

          fulltime: {
            home: homeScore,
            away: awayScore
          }
        },

        events,

        lineups,

        statistics,

        players,

        provider:
          "SportScore"
      };

      console.log(
        "DETAIL RESULT:",

        JSON.stringify(
          {
            match:
              `${homeTeam.name} vs ${awayTeam.name}`,

            lineups:
              lineups.length,

            homePlayers:
              lineups[0]?.startXI?.length ||
              0,

            awayPlayers:
              lineups[1]?.startXI?.length ||
              0,

            events:
              events.length,

            statistics:
              statistics?.[0]?.statistics?.length ||
              0
          },

          null,
          2
        )
      );

      return output(
        200,
        {
          data: details,

          provider:
            "SportScore"
        }
      );
    }

      /* =====================================================
       LIVE + HALF-TIME
       ===================================================== */

    if (live === "all") {

      const allLiveMatches = [];

      /* =========================================
         1. Fixtures LIVE
      ========================================= */

      try {

        const liveBody =
          await getJSON(
            `${SPORTSCORE}/fixtures/?sport=football&status=live&limit=200`
          );

        allLiveMatches.push(
          ...getMatches(liveBody)
            .map(normalizeMatch)
            .filter(Boolean)
        );

      }
      catch (error) {

        console.warn(
          "FIXTURES LIVE ERROR:",
          error.message
        );

      }


      /* =========================================
         2. Widget matches
         باش نلقاو HT كذلك
      ========================================= */

      try {

        const widgetBody =
          await getJSON(
            `${WIDGET}/matches/?sport=football&limit=50`
          );

        const widgetMatches =
          getMatches(widgetBody)
            .map(normalizeMatch)
            .filter(Boolean);

        allLiveMatches.push(
          ...widgetMatches
        );

      }
      catch (error) {

        console.warn(
          "WIDGET LIVE ERROR:",
          error.message
        );

      }


      /* =========================================
         3. غير LIVE و HT
      ========================================= */

      const filtered =
        allLiveMatches.filter(
          match => {

            const status =
              String(
                match?.fixture?.status?.short ||
                ""
              ).toUpperCase();

            return (
              status === "LIVE" ||
              status === "HT" ||
              status === "1H" ||
              status === "2H" ||
              status === "ET" ||
              status === "P" ||
              status === "BT" ||
              status.includes("LIVE") ||
              status.includes("HALF")
            );

          }
        );


      /* =========================================
         4. حذف التكرار
      ========================================= */

      const unique =
        new Map();

      filtered.forEach(
        match => {

          const id =
            match?.fixture?.id ||
            match?.fixture?.slug ||
            match?.id ||
            null;

          const key =
            id
              ? String(id)
              : `${normalizeText(
                  getHome(match)
                )}__${normalizeText(
                  getAway(match)
                )}`;

          if (
            !unique.has(key)
          ) {

            unique.set(
              key,
              match
            );

          }

        }
      );


      const matches =
        Array.from(
          unique.values()
        );


      console.log(
        "BAKHIRAFOOT LIVE:",
        matches.length
      );


      return output(
        200,
        {
          data:
            matches,

          provider:
            "SportScore"
        }
      );

    }

    /* =====================================================
       DATE
       ===================================================== */

   const matchDate =
  date || today;

let body;

try {

  const [upcomingBody, finishedBody, liveBody] =
    await Promise.all([
      getJSON(
        `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
          matchDate
        )}&status=upcoming&limit=200`
      ),

      getJSON(
        `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
          matchDate
        )}&status=finished&limit=200`
      ),

      getJSON(
        `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
          matchDate
        )}&status=live&limit=200`
      )
    ]);

  body = {
    matches: [
      ...getMatches(upcomingBody),
      ...getMatches(finishedBody),
      ...getMatches(liveBody)
    ]
  };
    }

    catch (error) {
      if (matchDate === today) {
        body = await getJSON(
          `${SPORTSCORE}/matches/?sport=football&limit=100`
        );
      }

      else {
        try {
          body = await getJSON(
            `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
              matchDate
            )}&limit=100`
          );
        }

        catch (secondError) {
          return output(
            secondError?.status ||
              error?.status ||
              502,

            {
              error:
                secondError?.message ||
                error?.message ||
                "API request failed",

              details:
                secondError?.data ||
                error?.data ||
                null,

              data: []
            }
          );
        }
      }
    }

    let matches =
  getMatches(body)
    .map(normalizeMatch)
    .filter(Boolean);
/* =========================================
   MOROCCO - THE BOTOLA PRO
   Fetch competition directly
========================================= */

try {

  const botolaBody =
    await getJSON(
      `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
        matchDate
      )}&competition=the-botola-pro&limit=200`
    );

  const botolaMatches =
    getMatches(botolaBody)
      .map(normalizeMatch)
      .filter(Boolean);

  matches.push(
    ...botolaMatches
  );

  console.log(
    "BOTOLA PRO MATCHES:",
    botolaMatches.length
  );

}
catch (error) {

  console.warn(
    "BOTOLA PRO ERROR:",
    error.message
  );

}
/* =====================================================
   THE SPORTS DB - AJOUT DES MATCHES DU JOUR
===================================================== */

try {

  const tsdbEvents =
    await getTheSportsDBDayMatches(
      matchDate
    );

  const tsdbMatches =
    tsdbEvents
      .map(event => {

        if (!event) {
          return null;
        }

        const eventId =
          event?.idEvent ||
          "";

        const homeName =
          event?.strHomeTeam ||
          "Domicile";

        const awayName =
          event?.strAwayTeam ||
          "Extérieur";

        let homeScore =
          event?.intHomeScore;

        let awayScore =
          event?.intAwayScore;

        if (
          homeScore === "" ||
          homeScore === null ||
          homeScore === undefined
        ) {
          homeScore = null;
        } else {
          homeScore =
            Number(homeScore);
        }

        if (
          awayScore === "" ||
          awayScore === null ||
          awayScore === undefined
        ) {
          awayScore = null;
        } else {
          awayScore =
            Number(awayScore);
        }

        const rawStatus =
          String(
            event?.strStatus ||
            event?.strProgress ||
            ""
          ).toLowerCase();

        let status = "NS";

        if (
          rawStatus.includes("finished") ||
          rawStatus === "ft"
        ) {
          status = "FT";
        }

        else if (
          rawStatus.includes("half") ||
          rawStatus === "ht"
        ) {
          status = "HT";
        }

        else if (
          rawStatus.includes("live") ||
          rawStatus.includes("progress")
        ) {
          status = "LIVE";
        }

        return {

          id:
            `tsdb-${eventId}`,

          slug:
            `tsdb-${eventId}`,
provider:
  "TheSportsDB",
           
          fixture: {

            id:
              `tsdb-${eventId}`,

            slug:
              `tsdb-${eventId}`,

            date:
              event?.dateEvent &&
              event?.strTime
                ? `${event.dateEvent}T${event.strTime}`
                : event?.dateEvent ||
                  null,

            status: {

              short:
                status,

              long:
                event?.strStatus ||
                status,

              elapsed:
                null

            }

          },

          league: {

            id:
              event?.idLeague ||
              null,

            name:
              event?.strLeague ||
              "Football",

            country:
              event?.strCountry ||
              "",

            logo:
              event?.strLeagueBadge ||
              "",

            round:
              null,

            season:
              event?.strSeason ||
              null

          },

          teams: {

            home: {

              id:
                null,

              name:
                homeName,

              logo:
                event?.strHomeTeamBadge ||
                ""

            },

            away: {

              id:
                null,

              name:
                awayName,

              logo:
                event?.strAwayTeamBadge ||
                ""

            }

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
                null,

              away:
                null

            },

            fulltime: {

              home:
                homeScore,

              away:
                awayScore

            }

          },

          status:
            status,

          status_text:
            event?.strStatus ||
            status,

          time:
            event?.dateEvent &&
            event?.strTime
              ? `${event.dateEvent}T${event.strTime}`
              : event?.dateEvent ||
                null

        };

      })
      .filter(Boolean);


  const existing =
    new Set();

  matches.forEach(
    match => {

      const home =
        norm(
          match?.teams?.home?.name
        );

      const away =
        norm(
          match?.teams?.away?.name
        );

      if (
        home &&
        away
      ) {
        existing.add(
          `teams:${home}__${away}`
        );
      }

    }
  );


  tsdbMatches.forEach(
    match => {

      const home =
        norm(
          match?.teams?.home?.name
        );

      const away =
        norm(
          match?.teams?.away?.name
        );

      const key =
        `teams:${home}__${away}`;

      if (
        home &&
        away &&
        !existing.has(key)
      ) {

        matches.push(
          match
        );

        existing.add(
          key
        );

      }

    }
  );


  console.log(
    "THE SPORTS DB MATCHES:",
    tsdbMatches.length
  );

}
catch (error) {

  console.warn(
    "THE SPORTS DB MERGE ERROR:",
    error.message
  );

}
     
     /* =====================================================
   AJOUT DES MATCHES DU MONDE
===================================================== */

try {

  const sofaEvents =
    await getSofaWorldMatches(
      matchDate
    );

  const sofaMatches =
    sofaEvents
      .map(
        adaptSofaWorldMatch
      )
      .map(
        normalizeMatch
      )
      .filter(Boolean);


  const existing =
    new Set();

  matches.forEach(
    match => {

      const id =
        match?.fixture?.id ||
        match?.fixture?.slug ||
        match?.id ||
        "";

      const home =
        norm(
          match?.teams?.home?.name
        );

      const away =
        norm(
          match?.teams?.away?.name
        );

      if (id) {
        existing.add(
          `id:${String(id)}`
        );
      }

      if (home && away) {
        existing.add(
          `teams:${home}__${away}`
        );
      }

    }
  );


  sofaMatches.forEach(
    match => {

      const id =
        match?.fixture?.id ||
        match?.fixture?.slug ||
        match?.id ||
        "";

      const home =
        norm(
          match?.teams?.home?.name
        );

      const away =
        norm(
          match?.teams?.away?.name
        );


      const exists =
        (
          id &&
          existing.has(
            `id:${String(id)}`
          )
        ) ||
        (
          home &&
          away &&
          existing.has(
            `teams:${home}__${away}`
          )
        );


      if (!exists) {

        matches.push(
          match
        );

        if (id) {

          existing.add(
            `id:${String(id)}`
          );

        }

        if (
          home &&
          away
        ) {

          existing.add(
            `teams:${home}__${away}`
          );

        }

      }

    }
  );


  console.log(
    "BAKHIRAFOOT WORLD:",
    JSON.stringify({
      sportScore:
        matches.length -
        sofaMatches.length,

      sofaScore:
        sofaMatches.length,

      total:
        matches.length
    })
  );

}
catch (error) {

  console.warn(
    "SOFASCORE WORLD MERGE:",
    error.message
  );

}

/* =========================================
   EXTRA: UEFA NATIONS LEAGUE
   كنجيبوها بوحدها باش ما تضيعش
   خارج أول 200 مباراة
========================================= */

try {

  const nationsBody =
    await getJSON(
      `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
        matchDate
      )}&competition=uefa-nations-league&limit=200`
    );

  const nationsMatches =
    getMatches(nationsBody)
      .map(normalizeMatch)
      .filter(Boolean);


  const existing =
    new Set(
      matches
        .map(match =>
          String(
            match?.fixture?.id ||
            match?.fixture?.slug ||
            match?.id ||
            ""
          )
        )
        .filter(Boolean)
    );


  nationsMatches.forEach(
    match => {

      const id =
        String(
          match?.fixture?.id ||
          match?.fixture?.slug ||
          match?.id ||
          ""
        );

      if (
        id &&
        !existing.has(id)
      ) {

        matches.push(match);

        existing.add(id);

      }

    }
  );

}
catch (error) {

  console.warn(
    "UEFA NATIONS LEAGUE EXTRA:",
    error.message
  );

}
/* =========================================
   FINAL DEDUPE
   نحيدو غير duplicate الحقيقي
   وما نضيعوش matches من competitions مختلفة
========================================= */

/* =========================================
   FIX ESPN STAGE NAMES
   Stage ماشي Competition
========================================= */

const stageNames = new Set([
  "fall season",
  "spring season",
  "summer season",
  "winter season",
  "group stage",
  "first round",
  "second round",
  "third round",
  "round of 16",
  "round of 32",
  "round of 64",
  "quarterfinal",
  "quarterfinals",
  "semifinal",
  "semifinals",
  "final"
]);

for (const match of matches) {

  const leagueName =
    String(
      match?.league?.name ||
      ""
    )
      .trim()
      .toLowerCase();

  if (
    !stageNames.has(
      leagueName
    )
  ) {
    continue;
  }

  const home =
    norm(
      match?.teams?.home?.name
    );

  const away =
    norm(
      match?.teams?.away?.name
    );

  const date =
    toISODate(
      match?.fixture?.date ||
      match?.time
    ) || matchDate;

  if (
    !home ||
    !away
  ) {
    continue;
  }

  const replacement =
    matches.find(
      other => {

        if (
          other === match
        ) {
          return false;
        }

        const otherLeague =
          String(
            other?.league?.name ||
            ""
          )
            .trim()
            .toLowerCase();

        if (
          !otherLeague ||
          stageNames.has(
            otherLeague
          ) ||
          otherLeague === "football"
        ) {
          return false;
        }

        const otherHome =
          norm(
            other?.teams?.home?.name
          );

        const otherAway =
          norm(
            other?.teams?.away?.name
          );

        const otherDate =
          toISODate(
            other?.fixture?.date ||
            other?.time
          ) || matchDate;

        return (
          otherHome === home &&
          otherAway === away &&
          otherDate === date
        );

      }
    );

  if (replacement) {

    match.league = {
      ...match.league,
      name:
        replacement?.league?.name ||
        match.league.name,

      id:
        replacement?.league?.id ||
        match.league.id,

      logo:
        replacement?.league?.logo ||
        match.league.logo,

      country:
        replacement?.league?.country ||
        match.league.country,

      round:
        match.league.round ||
        match?.round ||
        null
    };

  }

}
     
const finalUnique = new Map();

for (const match of matches) {

  const id =
    match?.fixture?.id ||
    match?.fixture?.slug ||
    match?.id ||
    "";

  const home =
    norm(
      match?.teams?.home?.name
    );

  const away =
    norm(
      match?.teams?.away?.name
    );

  const dateValue =
    match?.fixture?.date ||
    match?.time ||
    "";

  const timestamp =
    dateValue
      ? new Date(
          dateValue
        ).getTime()
      : 0;

  /*
    ID معروف:
    نستعملوه مباشرة.
  */
  if (id) {

    const idKey =
      `id:${String(id)}`;

    if (
      !finalUnique.has(
        idKey
      )
    ) {
      finalUnique.set(
        idKey,
        match
      );
    }

    continue;
  }

  /*
    بلا ID:
    نستعملو الفرق + وقت الماتش
    بدل الفرق + اليوم فقط.
  */

  if (
    home &&
    away &&
    timestamp
  ) {

    /*
      كنقربو الوقت لـ 15 دقيقة
      باش نفس الماتش من مصدرين
      يبقى duplicate حتى إلا كان
      فرق صغير فالوقت.
    */
    const roundedTime =
      Math.round(
        timestamp /
        (15 * 60 * 1000)
      );

   const competitionName =
  norm(
    match?.league?.name ||
    match?.competition?.name ||
    "football"
  );

const key =
  `${home}__${away}__${matchDay}__${competitionName}`;

    if (
      !finalUnique.has(
        key
      )
    ) {
      finalUnique.set(
        key,
        match
      );
    }

  }

}

matches =
  Array.from(
    finalUnique.values()
  );
     
    return output(
      200,
      {
        data: matches,

        provider:
          "SportScore"
      }
    );

  }

  catch (error) {
    console.error(
      "BAKHIRAFOOT API ERROR:",
      error
    );

    return res.status(
      error?.status || 500
    ).json({
      error:
        error?.message ||
        "API request failed",

      details:
        error?.data ||
        null,

      data: []
    });
  }
};
