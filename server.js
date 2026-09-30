const express = require("express");

const app = express();

app.use(express.static("."));

const SPORTSCORE_BASE =
  "https://sportscore.com/api/v1";
const SPORTSCORE_WIDGET_BASE =
  "https://sportscore.com";
/* =========================================================
   CACHE
========================================================= */

const matchesCache = new Map();
const detailsCache = new Map();

let liveCache = {
  data: [],
  time: 0
};

const MATCH_CACHE_TIME =
  60 * 1000;

const LIVE_CACHE_TIME =
  60 * 1000;

const DETAILS_CACHE_TIME =
  60 * 1000;

/* =========================================================
   HELPERS
========================================================= */

function todayISO() {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function getCached(
  cache,
  key,
  maxAge
) {
  const item = cache.get(String(key));

  if (!item) {
    return null;
  }

  if (
    Date.now() - item.time >= maxAge
  ) {
    return null;
  }

  return item.data;
}

function setCached(
  cache,
  key,
  data
) {
  cache.set(String(key), {
    data,
    time: Date.now()
  });
}

/* =========================================================
   SPORTSCORE FETCH
========================================================= */

async function sportScoreFetch(
  path
) {
  const base =
    path.startsWith("/api/widget/")
      ? SPORTSCORE_WIDGET_BASE
      : SPORTSCORE_BASE;

  const response =
    await fetch(
      `${base}${path}`,
      {
        headers: {
          Accept:
            "application/json"
        },
        cache: "no-store"
      }
    );

  if (!response.ok) {
    const error =
      new Error(
        `SportScore HTTP ${response.status}`
      );

    error.status =
      response.status;

    throw error;
  }

  return await response.json();
}


/* =========================================================
   EXTRACT LIST
========================================================= */

function extractMatches(data) {

  if (
    Array.isArray(data?.matches)
  ) {
    return data.matches;
  }

  if (
    Array.isArray(data?.data)
  ) {
    return data.data;
  }

  if (
    Array.isArray(data)
  ) {
    return data;
  }

  return [];
}

/* =========================================================
   FIXTURE ADAPTER
========================================================= */

function adaptFixture(match) {

  if (!match) {
    return null;
  }

  const homeName =
    match?.home ||
    match?.home_team?.name ||
    match?.homeTeam?.name ||
    "Domicile";

  const awayName =
    match?.away ||
    match?.away_team?.name ||
    match?.awayTeam?.name ||
    "Extérieur";

  const homeLogo =
    match?.home_logo ||
    match?.home_team?.logo ||
    match?.homeTeam?.logo ||
    "";

  const awayLogo =
    match?.away_logo ||
    match?.away_team?.logo ||
    match?.awayTeam?.logo ||
    "";

  const homeId =
    match?.home_id ||
    match?.home_team?.id ||
    match?.homeTeam?.id ||
    null;

  const awayId =
    match?.away_id ||
    match?.away_team?.id ||
    match?.awayTeam?.id ||
    null;

  const homeScore =
    match?.home_score ??
    match?.score?.home ??
    null;

  const awayScore =
    match?.away_score ??
    match?.score?.away ??
    null;

  const status =
    String(
      match?.status ||
      ""
    ).toLowerCase();

  let shortStatus = "NS";

  if (
    status.includes("live") ||
    status.includes("in play") ||
    status.includes("inplay")
  ) {
    shortStatus = "LIVE";
  }
  else if (
    status.includes("finish") ||
    status === "ft" ||
    status.includes("ended")
  ) {
    shortStatus = "FT";
  }
  else if (
    status.includes("postpon")
  ) {
    shortStatus = "PST";
  }
  else if (
    status.includes("cancel")
  ) {
    shortStatus = "CANC";
  }
  else if (
    status.includes("half")
  ) {
    shortStatus = "HT";
  }

  return {

    fixture: {

      id:
        match?.id ||
        match?.match_id ||
        match?.fixture_id ||
        null,

      slug:
        match?.slug ||
        match?.match_slug ||
        null,

      date:
        match?.time ||
        match?.date ||
        null,

      timezone:
        "UTC",

      status: {

        short:
          match?.status_code ||
          shortStatus,

        long:
          match?.status_text ||
          match?.status ||
          "Match",

        elapsed:
          match?.minute ??
          match?.elapsed ??
          null

      },

      venue:
        match?.venue ||
        null,

      referee:
        match?.referee ||
        null

    },

    league: {

      id:
        match?.competition_id ||
        match?.competition?.id ||
        match?.league?.id ||
        null,

      name:
        match?.competition ||
        match?.competition?.name ||
        match?.league?.name ||
        match?.league ||
        "Football",

      country:
        match?.country ||
        match?.competition?.country ||
        match?.league?.country ||
        null,

      logo:
        match?.competition_logo ||
        match?.competition?.logo ||
        match?.league?.logo ||
        ""

    },

    teams: {

      home: {

        id:
          homeId,

        name:
          homeName,

        logo:
          homeLogo

      },

      away: {

        id:
          awayId,

        name:
          awayName,

        logo:
          awayLogo

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

      halftime:
        match?.score?.halftime ||
        {
          home: null,
          away: null
        },

      fulltime:
        match?.score?.fulltime ||
        {
          home: homeScore,
          away: awayScore
        }

    }

  };
}

/* =========================================================
   MATCHES BY DATE
========================================================= */

async function getMatchesByDate(
  date
) {

  const cached =
    getCached(
      matchesCache,
      date,
      MATCH_CACHE_TIME
    );

  if (cached) {

    return {
      data: cached,
      cached: true
    };

  }

  try {

    const data =
      await sportScoreFetch(
        `/fixtures/?sport=football&date=${encodeURIComponent(
          date
        )}&limit=200`
      );

    const raw =
      extractMatches(data);

    const matches =
      raw
        .map(adaptFixture)
        .filter(Boolean);

    setCached(
      matchesCache,
      date,
      matches
    );

    return {
      data: matches,
      cached: false
    };

  }
  catch (error) {

    const old =
      matchesCache.get(
        String(date)
      );

    if (old) {

      return {
        data: old.data,
        cached: true,
        stale: true
      };

    }

    throw error;
  }
}

/* =========================================================
   LIVE
========================================================= */

async function getLiveMatches() {

  if (
    liveCache.data.length &&
    Date.now() -
      liveCache.time <
      LIVE_CACHE_TIME
  ) {

    return {
      data: liveCache.data,
      cached: true
    };

  }

  try {

    const data =
      await sportScoreFetch(
        `/fixtures/?sport=football&status=live&limit=200`
      );

    const raw =
      extractMatches(data);

    const matches =
      raw
        .map(adaptFixture)
        .filter(Boolean);

    liveCache = {
      data: matches,
      time: Date.now()
    };

    return {
      data: matches,
      cached: false
    };

  }
  catch (error) {

    if (
      liveCache.data.length
    ) {

      return {
        data: liveCache.data,
        cached: true,
        stale: true
      };

    }

    throw error;
  }
}

/* =========================================================
   FIND MATCH IN CACHE
========================================================= */

function findCachedMatch(
  identifier
) {

  const wanted =
    String(identifier);

  for (
    const cacheEntry
    of matchesCache.values()
  ) {

    const match =
      cacheEntry.data.find(
        item => {

          return (
            String(
              item?.fixture?.id
            ) === wanted ||

            String(
              item?.fixture?.slug
            ) === wanted
          );

        }
      );

    if (match) {
      return match;
    }
  }

  return (
    liveCache.data.find(
      item => {

        return (
          String(
            item?.fixture?.id
          ) === wanted ||

          String(
            item?.fixture?.slug
          ) === wanted
        );

      }
    ) || null
  );
}

/* =========================================================
   DETAILS
========================================================= */

async function getMatchDetails(
  identifier
) {
  const cached =
    getCached(
      detailsCache,
      identifier,
      DETAILS_CACHE_TIME
    );

  if (cached) {
    return {
      data: cached,
      cached: true
    };
  }

  /*
   * كنلقاو الماتش فالـcache باش ناخدو
   * الـslug الحقيقي ديالو.
   */
  const baseMatch =
    findCachedMatch(
      identifier
    );

  const slug =
    baseMatch?.fixture?.slug ||
    baseMatch?.slug ||
    String(identifier);

  /*
   * مهم:
   * كنستعملو الـWidget endpoint الرسمي
   * حيث كيرجع:
   *
   * {
   *   sport: "football",
   *   match: {
   *      incidents: [],
   *      lineups: {
   *        home_formation: "...",
   *        away_formation: "...",
   *        home_xi: [],
   *        away_xi: [],
   *        home_subs: [],
   *        away_subs: []
   *      }
   *   }
   * }
   */
  const data =
    await sportScoreFetch(
      `/api/widget/match/?sport=football&slug=${encodeURIComponent(
        slug
      )}&src=bakhira-foot`
    );

  /*
   * استخراج match الحقيقي.
   */
  const detail =
    data?.match ||
    data?.data?.match ||
    data?.data ||
    data;

  if (
    !detail ||
    typeof detail !== "object"
  ) {
    throw new Error(
      "Données détaillées du match introuvables"
    );
  }

  /*
   * Adapter ديال معلومات الماتش الأساسية.
   */
  const adapted =
    adaptFixture(
      detail
    ) || baseMatch;

  /*
   * مهم:
   * كنحتافظو بالـlineups كما رجعات من SportScore
   * بلا ما نحولو object لـ [].
   */
  const lineups =
    detail?.lineups ??
    detail?.lineup ??
    detail?.compositions ??
    {};

  /*
   * الأحداث الحقيقية.
   */
  const events =
    detail?.incidents ??
    detail?.events ??
    detail?.timeline ??
    [];

  /*
   * الإحصائيات.
   */
  const statistics =
    detail?.stats ??
    detail?.statistics ??
    [];

  /*
   * اللاعبين إذا كانوا موجودين.
   */
  const players =
    detail?.players ??
    [];

  /*
   * كنرجعو التفاصيل كاملة.
   */
  const details = {
    ...adapted,

    /*
     * معلومات SportScore الأصلية
     */
    sport:
      data?.sport ||
      "football",

    /*
     * فرق
     */
    home:
      detail?.home ||
      adapted?.teams?.home?.name ||
      baseMatch?.teams?.home?.name,

    away:
      detail?.away ||
      adapted?.teams?.away?.name ||
      baseMatch?.teams?.away?.name,

    home_logo:
      detail?.home_logo ||
      adapted?.teams?.home?.logo ||
      "",

    away_logo:
      detail?.away_logo ||
      adapted?.teams?.away?.logo ||
      "",

    /*
     * النتيجة
     */
    home_score:
      detail?.home_score ??
      adapted?.score?.home ??
      null,

    away_score:
      detail?.away_score ??
      adapted?.score?.away ??
      null,

    /*
     * الحالة
     */
    status:
      detail?.status ||
      adapted?.fixture?.status?.short ||
      "MATCH",

    status_text:
      detail?.status_text ||
      adapted?.fixture?.status?.long ||
      "",

    /*
     * الوقت
     */
    time:
      detail?.time ||
      adapted?.fixture?.date ||
      null,

    /*
     * البطولة
     */
    competition:
      detail?.competition ||
      adapted?.league?.name ||
      "Football",

    /*
     * المكان
     */
    venue:
      detail?.venue ||
      null,

    referee:
      detail?.referee ||
      null,

    /*
     * الأحداث
     */
    events,

    incidents:
      events,

    timeline:
      events,

    /*
     * التشكيلات
     */
    lineups,

    lineup:
      lineups,

    /*
     * الإحصائيات
     */
    statistics,

    stats:
      statistics,

    /*
     * اللاعبين
     */
    players
  };

  /*
   * مهم للتشخيص:
   * غادي نشوفو فـ Vercel console واش فعلاً
   * وصلات التشكيلة.
   */
  console.log(
    "BAKHIRAFOOT DETAILS:",
    {
      slug,
      home:
        details.home,
      away:
        details.away,
      formations: {
        home:
          lineups?.home_formation ||
          null,
        away:
          lineups?.away_formation ||
          null
      },
      homeXI:
        Array.isArray(
          lineups?.home_xi
        )
          ? lineups.home_xi.length
          : 0,
      awayXI:
        Array.isArray(
          lineups?.away_xi
        )
          ? lineups.away_xi.length
          : 0,
      homeSubs:
        Array.isArray(
          lineups?.home_subs
        )
          ? lineups.home_subs.length
          : 0,
      awaySubs:
        Array.isArray(
          lineups?.away_subs
        )
          ? lineups.away_subs.length
          : 0,
      events:
        Array.isArray(events)
          ? events.length
          : 0
    }
  );

  setCached(
    detailsCache,
    identifier,
    details
  );

  return {
    data: details,
    cached: false
  };
}

/* =========================================================
   MAIN /api
========================================================= */

app.get(
  "/api",
  async (req, res) => {

    try {

      /* LIVE */

      if (
        req.query.live === "all"
      ) {

        const result =
          await getLiveMatches();

        return res.json({
          data: result.data,
          cached:
            result.cached || false,
          stale:
            result.stale || false
        });

      }

      /* DETAILS */

      if (
        req.query.fixture
      ) {

        const result =
          await getMatchDetails(
            req.query.fixture
          );

        return res.json({
          data: result.data,
          cached:
            result.cached || false
        });

      }

      /* DATE */

      const date =
        req.query.date ||
        todayISO();

      const result =
        await getMatchesByDate(
          date
        );

      return res.json({
        data: result.data,
        cached:
          result.cached || false,
        stale:
          result.stale || false
      });

    }
    catch (error) {

      console.error(
        "SPORTSCORE ERROR:",
        error
      );

      return res.status(
        error.status || 500
      ).json({

        error:
          error.message,

        data: []

      });

    }

  }
);

/* =========================================================
   COMPATIBILITY ROUTES
========================================================= */

app.get(
  "/api/matches",
  async (req, res) => {

    try {

      const date =
        req.query.date ||
        todayISO();

      const result =
        await getMatchesByDate(
          date
        );

      res.json({
        data: result.data,
        cached:
          result.cached || false,
        stale:
          result.stale || false
      });

    }
    catch (error) {

      res.status(
        error.status || 500
      ).json({

        error:
          error.message,

        data: []

      });

    }

  }
);

app.get(
  "/api/live",
  async (req, res) => {

    try {

      const result =
        await getLiveMatches();

      res.json({
        data: result.data,
        cached:
          result.cached || false,
        stale:
          result.stale || false
      });

    }
    catch (error) {

      res.status(
        error.status || 500
      ).json({

        error:
          error.message,

        data: []

      });

    }

  }
);

/* =========================================================
   TEST
========================================================= */

app.get(
  "/api/test",
  (req, res) => {

    res.json({

      status:
        "ok",

      service:
        "BakhiraFoot",

      provider:
        "SportScore",

      routes: {

        date:
          "/api?date=YYYY-MM-DD",

        live:
          "/api?live=all",

        details:
          "/api?fixture=SLUG"

      }

    });

  }
);

/* =========================================================
   TEST SPORTSCORE
========================================================= */

app.get(
  "/api/test-api",
  async (req, res) => {

    try {

      const result =
        await sportScoreFetch(
          `/fixtures/?sport=football&date=${todayISO()}&limit=5`
        );

      res.json({

        status:
          "ok",

        provider:
          "SportScore",

        data:
          result

      });

    }
    catch (error) {

      res.status(
        error.status || 500
      ).json({

        status:
          "error",

        error:
          error.message

      });

    }

  }
);

/* =========================================================
   VERCEL
========================================================= */

module.exports = app;
