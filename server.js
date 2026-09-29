const express = require("express");

const app = express();

app.use(express.static("."));

const SPORTSCORE_BASE =
  "https://sportscore.com/api/v1";

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
  const response = await fetch(
    `${SPORTSCORE_BASE}${path}`,
    {
      headers: {
        Accept: "application/json"
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

  const baseMatch =
    findCachedMatch(
      identifier
    );

  const slug =
    baseMatch?.fixture?.slug ||
    identifier;

  const data =
    await sportScoreFetch(
      `/match/?sport=football&slug=${encodeURIComponent(
        slug
      )}`
    );

  /*
     SportScore match endpoint
     كيقدر يرجع envelope فيه data
     أو match مباشرة.
  */

  const detail =
    data?.match ||
    data?.data ||
    data;

  const adapted =
    adaptFixture(
      detail
    ) || baseMatch;

  const details = {

    ...adapted,

    events:
      detail?.timeline ||
      detail?.events ||
      [],

    lineups:
      detail?.lineups ||
      [],

    statistics:
      detail?.statistics ||
      [],

    players:
      detail?.players ||
      []

  };

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
