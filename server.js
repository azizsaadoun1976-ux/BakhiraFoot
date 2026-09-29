/* =========================================================
   BAKHIRAFOOT PRO
   KICKOFFAPI V2 -> BAKHIRAFOOT COMPATIBILITY SERVER
========================================================= */

const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(express.static("."));

/* =========================================================
   KICKOFF API
========================================================= */

const KICKOFF_BASE =
  "https://api.kickoffapi.com/api/v2";

const KICKOFF_API_KEY =
  process.env.KICKOFF_API_KEY;

const headers = {
  "x-api-key": KICKOFF_API_KEY,
  "Accept": "application/json"
};

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
  5 * 60 * 1000;

const LIVE_CACHE_TIME =
  60 * 1000;

const DETAILS_CACHE_TIME =
  5 * 60 * 1000;

/* =========================================================
   HELPERS
========================================================= */

function todayISO() {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function getCache(cache, key, maxAge) {
  const item = cache.get(key);

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

function setCache(cache, key, data) {
  cache.set(key, {
    data,
    time: Date.now()
  });
}

/* =========================================================
   KICKOFF REQUEST
========================================================= */

async function kickoffFetch(path) {

  if (!KICKOFF_API_KEY) {

    throw new Error(
      "KICKOFF_API_KEY manquante dans .env"
    );
  }

  const response = await fetch(
    `${KICKOFF_BASE}${path}`,
    {
      method: "GET",
      headers
    }
  );

  const remaining =
    response.headers.get(
      "X-RateLimit-Remaining"
    );

  const reset =
    response.headers.get(
      "X-RateLimit-Reset"
    );

  if (!response.ok) {

    const error =
      new Error(
        `KickoffAPI HTTP ${response.status}`
      );

    error.status =
      response.status;

    error.remaining =
      remaining;

    error.reset =
      reset;

    throw error;
  }

  const data =
    await response.json();

  return {
    data,
    remaining,
    reset
  };
}

/* =========================================================
   V2 FIXTURE -> LEGACY SHAPE
   باش script.js الحالي يبقى خدام
========================================================= */

function adaptFixture(fixture) {

  if (!fixture) {
    return null;
  }

  return {

    fixture: {

      id:
        fixture.id ||
        null,

      date:
        fixture.date ||
        null,

      timezone:
        fixture.timezone ||
        null,

      referee:
        fixture.referee ||
        null,

      venue:
        fixture.venue ||
        null,

      status:
        fixture.status ||
        {
          short: "NS",
          long: "Not Started",
          elapsed: null
        }

    },

    league: {

      id:
        fixture?.league?.id ||
        null,

      name:
        fixture?.league?.name ||
        "Football",

      country:
        fixture?.league?.country ||
        null,

      logo:
        fixture?.league?.logo ||
        null,

      season:
        fixture?.league?.season ||
        null,

      round:
        fixture?.league?.round ||
        null

    },

    teams: {

      home: {

        id:
          fixture?.home?.id ||
          null,

        name:
          fixture?.home?.name ||
          "Domicile",

        logo:
          fixture?.home?.logo ||
          ""

      },

      away: {

        id:
          fixture?.away?.id ||
          null,

        name:
          fixture?.away?.name ||
          "Extérieur",

        logo:
          fixture?.away?.logo ||
          ""

      }

    },

    goals: {

      home:
        fixture?.score?.home ??
        null,

      away:
        fixture?.score?.away ??
        null

    },

    score: {

      home:
        fixture?.score?.home ??
        null,

      away:
        fixture?.score?.away ??
        null,

      halftime:
        fixture?.score?.halftime ||
        {
          home: null,
          away: null
        },

      fulltime:
        fixture?.score?.fulltime ||
        {
          home:
            fixture?.score?.home ??
            null,

          away:
            fixture?.score?.away ??
            null
        }

    },

    content:
      fixture?.content ||
      null

  };
}

/* =========================================================
   EXTRACT DATA
========================================================= */

function extractData(result) {

  if (!result) {
    return null;
  }

  if (
    Array.isArray(
      result.data
    )
  ) {
    return result.data;
  }

  return result.data ?? null;
}

/* =========================================================
   GET MATCHES BY DATE
========================================================= */

async function fetchMatchesByDate(
  date
) {

  const cached =
    getCache(
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

    const result =
      await kickoffFetch(
        `/fixtures?date=${encodeURIComponent(
          date
        )}&limit=100`
      );

    const raw =
      extractData(
        result.data
      ) || [];

    const matches =
      raw
        .map(adaptFixture)
        .filter(Boolean);

    setCache(
      matchesCache,
      date,
      matches
    );

    return {
      data: matches,
      cached: false,
      remaining:
        result.remaining,
      reset:
        result.reset
    };

  } catch (error) {

    /*
       إلا الـAPI سالات quota ولكن
       عندنا cache قديم، نستعملوه.
    */

    const stale =
      matchesCache.get(date);

    if (stale) {

      console.warn(
        "Using stale date cache:",
        date
      );

      return {
        data: stale.data,
        cached: true,
        stale: true,
        error:
          error.message
      };
    }

    throw error;
  }
}

/* =========================================================
   LIVE
========================================================= */

async function fetchLive() {

  if (
    liveCache.time &&
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

    /*
       KickoffAPI v2 كتدعم live=all.
    */

    const result =
      await kickoffFetch(
        `/fixtures?live=all&limit=100`
      );

    const raw =
      extractData(
        result.data
      ) || [];

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
      cached: false,
      remaining:
        result.remaining,
      reset:
        result.reset
    };

  } catch (error) {

    /*
       نخليو آخر LIVE متوفر بدل
       ما نخليو الموقع خاوي.
    */

    if (
      liveCache.data.length
    ) {

      return {
        data: liveCache.data,
        cached: true,
        stale: true,
        error:
          error.message
      };

    }

    throw error;
  }
}

/* =========================================================
   NORMALIZE PLAYER STATS
========================================================= */

function normalizePlayerStats(
  playerData
) {

  if (
    !Array.isArray(playerData)
  ) {
    return [
      {
        players: []
      }
    ];
  }

  const players =
    playerData.map(row => {

      const player =
        row?.player ||
        {};

      const statistics = {

        games: {

          rating:
            row?.rating ??
            row?.statistics?.rating ??
            null,

          minutes:
            row?.minutes ??
            row?.statistics?.minutes ??
            null,

          position:
            row?.position ??
            row?.statistics?.position ??
            null,

          substitute:
            row?.substitute ??
            row?.statistics?.substitute ??
            false,

          captain:
            row?.captain ??
            row?.statistics?.captain ??
            false

        },

        goals: {

          total:
            row?.goals ??
            row?.statistics?.goals ??
            null,

          assists:
            row?.assists ??
            row?.statistics?.assists ??
            null

        },

        cards: {

          yellow:
            row?.yellow ??
            row?.statistics?.yellow ??
            0,

          red:
            row?.red ??
            row?.statistics?.red ??
            0

        },

        shots: {

          total:
            row?.shots?.total ??
            row?.shotsTotal ??
            row?.statistics?.shots?.total ??
            0,

          on:
            row?.shots?.on ??
            row?.shotsOn ??
            row?.statistics?.shots?.on ??
            0

        },

        passes: {

          key:
            row?.passes?.key ??
            row?.keyPasses ??
            row?.statistics?.passes?.key ??
            0

        }

      };

      return {

        player: {

          id:
            player?.id ??
            row?.id ??
            null,

          name:
            player?.name ??
            row?.name ??
            "Joueur",

          number:
            player?.number ??
            row?.number ??
            null,

          pos:
            player?.pos ??
            row?.position ??
            null,

          photo:
            player?.photo ??
            row?.photo ??
            ""

        },

        statistics: [
          statistics
        ]

      };

    });

  return [
    {
      players
    }
  ];
}

/* =========================================================
   MATCH DETAILS
========================================================= */

async function fetchMatchDetails(
  fixtureId
) {

  const cached =
    getCache(
      detailsCache,
      fixtureId,
      DETAILS_CACHE_TIME
    );

  if (cached) {

    return {
      data: cached,
      cached: true
    };

  }

  /*
     On récupère:
     1. fixture
     2. events
     3. lineups
     4. statistics
     5. player stats
  */

  const results =
    await Promise.allSettled([

      kickoffFetch(
        `/fixtures/${encodeURIComponent(
          fixtureId
        )}`
      ),

      kickoffFetch(
        `/fixtures/${encodeURIComponent(
          fixtureId
        )}/events`
      ),

      kickoffFetch(
        `/fixtures/${encodeURIComponent(
          fixtureId
        )}/lineups`
      ),

      kickoffFetch(
        `/fixtures/${encodeURIComponent(
          fixtureId
        )}/statistics`
      ),

      kickoffFetch(
        `/fixtures/${encodeURIComponent(
          fixtureId
        )}/players`
      )

    ]);

  const fixtureResult =
    results[0];

  const eventsResult =
    results[1];

  const lineupsResult =
    results[2];

  const statisticsResult =
    results[3];

  const playersResult =
    results[4];

  let fixture = null;

  if (
    fixtureResult.status === "fulfilled"
  ) {

    const value =
      fixtureResult.value?.data;

    const raw =
      value?.data ||
      null;

    fixture =
      adaptFixture(raw);

  }

  /*
     Si le endpoint principal est rate-limited,
     on essaie de récupérer le match depuis
     le cache des matchs.
  */

  if (!fixture) {

    for (
      const entry
      of matchesCache.values()
    ) {

      const found =
        entry.data.find(
          match =>
            String(
              match?.fixture?.id
            ) ===
            String(fixtureId)
        );

      if (found) {
        fixture = found;
        break;
      }

    }

  }

  const events =
    eventsResult.status ===
    "fulfilled"
      ? (
          extractData(
            eventsResult.value.data
          ) || []
        )
      : [];

  const lineups =
    lineupsResult.status ===
    "fulfilled"
      ? (
          extractData(
            lineupsResult.value.data
          ) || []
        )
      : [];

  const statistics =
    statisticsResult.status ===
    "fulfilled"
      ? (
          extractData(
            statisticsResult.value.data
          ) || []
        )
      : [];

  let players = [];

  if (
    playersResult.status ===
    "fulfilled"
  ) {

    const playerRaw =
      extractData(
        playersResult.value.data
      ) || [];

    players =
      normalizePlayerStats(
        playerRaw
      );

  }

  const details = {

    ...fixture,

    events,

    lineups,

    statistics,

    players

  };

  /*
     حتى إلا شي endpoint من التفاصيل
     فشل، نخزنو اللي قدرنا نجيبو.
  */

  if (details.fixture) {

    setCache(
      detailsCache,
      fixtureId,
      details
    );

  }

  return {
    data: details,
    cached: false
  };
}

/* =========================================================
   MAIN API ROUTE
   script.js كيستعمل:
   /api?date=...
   /api?live=all
   /api?fixture=...
========================================================= */

app.get(
  "/api",
  async (req, res) => {

    try {

      /* ==========================
         LIVE
      ========================== */

      if (
        req.query.live === "all"
      ) {

        const result =
          await fetchLive();

        return res.json({
          data: result.data,
          cached:
            result.cached || false,
          stale:
            result.stale || false
        });

      }

      /* ==========================
         FIXTURE DETAILS
      ========================== */

      if (
        req.query.fixture
      ) {

        const fixtureId =
          String(
            req.query.fixture
          ).trim();

        if (!fixtureId) {

          return res.status(400).json({
            error:
              "fixture ID manquant"
          });

        }

        const result =
          await fetchMatchDetails(
            fixtureId
          );

        return res.json({
          data: result.data,
          cached:
            result.cached || false
        });

      }

      /* ==========================
         DATE
      ========================== */

      const date =
        req.query.date ||
        todayISO();

      const result =
        await fetchMatchesByDate(
          date
        );

      return res.json({
        data: result.data,
        cached:
          result.cached || false,
        stale:
          result.stale || false
      });

    } catch (error) {

      console.error(
        "API ERROR:",
        error
      );

      const status =
        error?.status === 429
          ? 429
          : 500;

      return res.status(
        status
      ).json({

        error:
          error.message ||
          "API error",

        data: [],

        rateLimitRemaining:
          error?.remaining ??
          null,

        rateLimitReset:
          error?.reset ??
          null

      });

    }

  }
);

/* =========================================================
   COMPATIBILITY:
   /api/matches?date=...
========================================================= */

app.get(
  "/api/matches",
  async (req, res) => {

    try {

      const date =
        req.query.date ||
        todayISO();

      const result =
        await fetchMatchesByDate(
          date
        );

      res.json({
        data: result.data,
        cached:
          result.cached || false,
        stale:
          result.stale || false
      });

    } catch (error) {

      console.error(
        "MATCHES ERROR:",
        error
      );

      res.status(
        error?.status === 429
          ? 429
          : 500
      ).json({

        error:
          error.message,

        data: []

      });

    }

  }
);

/* =========================================================
   COMPATIBILITY:
   /api/live
========================================================= */

app.get(
  "/api/live",
  async (req, res) => {

    try {

      const result =
        await fetchLive();

      res.json({
        data: result.data,
        cached:
          result.cached || false,
        stale:
          result.stale || false
      });

    } catch (error) {

      console.error(
        "LIVE ERROR:",
        error
      );

      res.status(
        error?.status === 429
          ? 429
          : 500
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

      status: "ok",

      service:
        "BakhiraFoot",

      api:
        "KickoffAPI v2",

      routes: [
        "/api?date=YYYY-MM-DD",
        "/api?live=all",
        "/api?fixture=FX_ID"
      ]

    });

  }
);

/* =========================================================
   TEST KICKOFF API
========================================================= */

app.get(
  "/api/test-api",
  async (req, res) => {

    try {

      const result =
        await kickoffFetch(
          "/fixtures?date=" +
          todayISO() +
          "&limit=5"
        );

      res.json({

        status: "ok",

        remaining:
          result.remaining,

        reset:
          result.reset,

        data:
          result.data

      });

    } catch (error) {

      res.status(
        error?.status === 429
          ? 429
          : 500
      ).json({

        status: "error",

        error:
          error.message,

        remaining:
          error?.remaining ??
          null,

        reset:
          error?.reset ??
          null

      });

    }

  }
);

/* =========================================================
   START / VERCEL
========================================================= */

module.exports = app;
