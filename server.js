/* =========================================================
   BAKHIRAFOOT PRO
   SPORTScore API
   Compatibility server for current script.js
========================================================= */

const express = require("express");

const app = express();

app.use(express.static("."));

/* =========================================================
   SPORTSCORE
========================================================= */

const SPORTSCORE_BASE =
  "https://sportscore.com/api/v1";

const SPORTSCORE_SRC =
  "bakhira-foot.vercel.app";

/* =========================================================
   CACHE
========================================================= */

const matchesCache = new Map();

const detailsCache = new Map();

let liveCache = {
  data: [],
  time: 0
};

const CACHE_TIME =
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

function saveCache(
  cache,
  key,
  data
) {
  cache.set(key, {
    data,
    time: Date.now()
  });
}

/* =========================================================
   SPORTSCORE REQUEST
========================================================= */

async function sportScoreFetch(
  path
) {

  const separator =
    path.includes("?")
      ? "&"
      : "?";

  const url =
    `${SPORTSCORE_BASE}${path}` +
    `${separator}src=${encodeURIComponent(
      SPORTSCORE_SRC
    )}`;

  console.log(
    "SportScore:",
    url
  );

  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        Accept:
          "application/json"
      }
    });

  if (!response.ok) {

    const error =
      new Error(
        `SportScore HTTP ${response.status}`
      );

    error.status =
      response.status;

    throw error;
  }

  return response.json();
}

/* =========================================================
   FIND ARRAY IN RESPONSE
========================================================= */

function findArray(data) {

  if (Array.isArray(data)) {
    return data;
  }

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
    Array.isArray(data?.data?.matches)
  ) {
    return data.data.matches;
  }

  if (
    Array.isArray(data?.fixtures)
  ) {
    return data.fixtures;
  }

  return [];
}

/* =========================================================
   STATUS
========================================================= */

function normalizeStatus(
  match
) {

  const raw =
    String(
      match?.status ||
      match?.state ||
      ""
    )
      .toLowerCase()
      .trim();

  if (
    raw === "live" ||
    raw === "inplay" ||
    raw === "in_play"
  ) {
    return "LIVE";
  }

  if (
    raw === "finished" ||
    raw === "ft" ||
    raw === "ended"
  ) {
    return "FT";
  }

  if (
    raw === "upcoming" ||
    raw === "scheduled"
  ) {
    return "NS";
  }

  if (
    raw === "postponed"
  ) {
    return "PST";
  }

  if (
    raw === "cancelled" ||
    raw === "canceled"
  ) {
    return "CANC";
  }

  return (
    match?.status_code ||
    match?.short_status ||
    "NS"
  );
}

function normalizeStatusLong(
  match
) {

  return (
    match?.status_text ||
    match?.status_long ||
    match?.status ||
    "Match"
  );
}

function getElapsed(
  match
) {

  return (
    match?.minute ??
    match?.elapsed ??
    match?.time?.elapsed ??
    match?.status?.elapsed ??
    null
  );
}

/* =========================================================
   TEAM
========================================================= */

function normalizeTeam(
  source,
  fallbackName
) {

  if (
    typeof source === "string"
  ) {
    return {
      id: null,
      name: source,
      logo: ""
    };
  }

  source =
    source || {};

  return {

    id:
      source.id ??
      source.team_id ??
      null,

    name:
      source.name ||
      source.team ||
      fallbackName,

    logo:
      source.logo ||
      source.image ||
      source.team_logo ||
      ""

  };
}

/* =========================================================
   FIXTURE ADAPTER
========================================================= */

function adaptFixture(
  match
) {

  if (!match) {
    return null;
  }

  const home =
    normalizeTeam(
      match.home_team ||
      match.home,
      "Domicile"
    );

  const away =
    normalizeTeam(
      match.away_team ||
      match.away,
      "Extérieur"
    );

  const homeScore =
    match.home_score ??
    match.score?.home ??
    match.homeScore ??
    null;

  const awayScore =
    match.away_score ??
    match.score?.away ??
    match.awayScore ??
    null;

  const date =
    match.time ||
    match.date ||
    match.start_time ||
    match.kickoff ||
    null;

  const slug =
    match.slug ||
    match.match_slug ||
    match.url_slug ||
    "";

  const id =
    match.id ??
    match.match_id ??
    match.fixture_id ??
    null;

  const leagueName =
    typeof match.competition === "string"
      ? match.competition
      : (
          match.competition?.name ||
          match.league?.name ||
          match.league ||
          "Football"
        );

  const leagueId =
    match.competition?.id ||
    match.competition_id ||
    match.league?.id ||
    null;

  const leagueCountry =
    match.competition?.country ||
    match.league?.country ||
    null;

  const statusShort =
    normalizeStatus(
      match
    );

  const elapsed =
    getElapsed(
      match
    );

  return {

    fixture: {

      id,

      slug,

      date,

      timezone:
        match.timezone ||
        "UTC",

      referee:
        match.referee ||
        null,

      venue:
        match.venue ||
        null,

      status: {

        short:
          statusShort,

        long:
          normalizeStatusLong(
            match
          ),

        elapsed

      }

    },

    league: {

      id:
        leagueId,

      name:
        leagueName,

      country:
        leagueCountry,

      logo:
        match.competition?.logo ||
        match.league?.logo ||
        ""

    },

    teams: {

      home,

      away

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
        match.score?.halftime ||
        {
          home: null,
          away: null
        },

      fulltime:
        match.score?.fulltime ||
        {
          home: homeScore,
          away: awayScore
        }

    }

  };
}

/* =========================================================
   DATE FIXTURES
========================================================= */

async function fetchMatchesByDate(
  date
) {

  const cached =
    getCached(
      matchesCache,
      date,
      CACHE_TIME
    );

  if (cached) {

    return {
      data: cached,
      cached: true
    };

  }

  try {

    const result =
      await sportScoreFetch(
        `/fixtures/?sport=football&date=${encodeURIComponent(
          date
        )}&limit=200`
      );

    const raw =
      findArray(
        result
      );

    const matches =
      raw
        .map(adaptFixture)
        .filter(Boolean);

    saveCache(
      matchesCache,
      date,
      matches
    );

    return {
      data: matches,
      cached: false
    };

  } catch (error) {

    const old =
      matchesCache.get(date);

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

async function fetchLive() {

  if (
    liveCache.data.length &&
    Date.now() -
      liveCache.time <
      CACHE_TIME
  ) {

    return {
      data: liveCache.data,
      cached: true
    };

  }

  try {

    const result =
      await sportScoreFetch(
        `/fixtures/?sport=football&status=live&limit=200`
      );

    const raw =
      findArray(
        result
      );

    const matches =
      raw
        .map(adaptFixture)
        .filter(Boolean);

    liveCache = {

      data:
        matches,

      time:
        Date.now()

    };

    return {
      data: matches,
      cached: false
    };

  } catch (error) {

    if (
      liveCache.data.length
    ) {

      return {
        data:
          liveCache.data,

        cached:
          true,

        stale:
          true
      };

    }

    throw error;
  }
}

/* =========================================================
   FIND MATCH IN CACHE
========================================================= */

function findCachedMatch(
  value
) {

  const wanted =
    String(
      value || ""
    );

  /* DATE CACHE */

  for (
    const item
    of matchesCache.values()
  ) {

    const found =
      item.data.find(
        match => {

          const id =
            match?.fixture?.id;

          const slug =
            match?.fixture?.slug;

          return (
            String(id) === wanted ||
            String(slug) === wanted
          );

        }
      );

    if (found) {
      return found;
    }

  }

  /* LIVE CACHE */

  const liveFound =
    liveCache.data.find(
      match => {

        const id =
          match?.fixture?.id;

        const slug =
          match?.fixture?.slug;

        return (
          String(id) === wanted ||
          String(slug) === wanted
        );

      }
    );

  return liveFound || null;
}

/* =========================================================
   LINEUP HELPERS
========================================================= */

function normalizeLineupPlayer(
  item
) {

  const player =
    item?.player ||
    item ||
    {};

  return {

    player: {

      id:
        player.id ||
        item?.player_id ||
        item?.id ||
        null,

      name:
        player.name ||
        item?.name ||
        "Joueur",

      number:
        player.number ??
        item?.number ??
        item?.shirt_number ??
        null,

      pos:
        player.pos ||
        player.position ||
        item?.position ||
        item?.pos ||
        "",

      grid:
        player.grid ||
        item?.grid ||
        "",

      photo:
        player.photo ||
        item?.photo ||
        ""

    },

    rating:
      item?.rating ??
      player?.rating ??
      null,

    statistics:
      item?.statistics ||
      null,

    games:
      item?.games ||
      null,

    goals:
      item?.goals ||
      null,

    assists:
      item?.assists ||
      null,

    cards:
      item?.cards ||
      null,

    passes:
      item?.passes ||
      null,

    minutes:
      item?.minutes ||
      null,

    substitute:
      item?.substitute ??
      false,

    captain:
      item?.captain ??
      false

  };
}

function makeLineupBlock(
  source,
  fallbackTeam,
  fallbackId
) {

  if (!source) {
    return null;
  }

  const teamSource =
    source.team ||
    {};

  const team = {

    id:
      teamSource.id ||
      source.team_id ||
      fallbackId ||
      null,

    name:
      teamSource.name ||
      source.team_name ||
      fallbackTeam,

    logo:
      teamSource.logo ||
      source.team_logo ||
      ""

  };

  const starters =
    source.startXI ||
    source.startingXI ||
    source.starting_xi ||
    source.starters ||
    source.players?.filter?.(
      player =>
        player?.starter === true ||
        player?.starting === true
    ) ||
    [];

  const substitutes =
    source.substitutes ||
    source.bench ||
    source.players?.filter?.(
      player =>
        player?.substitute === true
    ) ||
    [];

  return {

    team,

    formation:
      source.formation ||
      source.tactics ||
      "—",

    coach:
      source.coach ||
      source.manager ||
      null,

    startXI:
      starters.map(
        normalizeLineupPlayer
      ),

    substitutes:
      substitutes.map(
        normalizeLineupPlayer
      )

  };
}

/* =========================================================
   ADAPT LINEUPS
========================================================= */

function adaptLineups(
  detail,
  baseMatch
) {

  let raw =
    detail?.lineups ||
    detail?.lineup ||
    detail?.formations ||
    null;

  if (
    Array.isArray(raw)
  ) {

    return raw
      .map(
        item =>
          makeLineupBlock(
            item,
            item?.team?.name ||
              "",
            item?.team?.id ||
              null
          )
      )
      .filter(Boolean);

  }

  if (
    raw &&
    typeof raw === "object"
  ) {

    const result = [];

    const home =
      raw.home ||
      raw.home_team ||
      null;

    const away =
      raw.away ||
      raw.away_team ||
      null;

    if (home) {

      const block =
        makeLineupBlock(
          home,
          baseMatch?.teams?.home?.name ||
            "Domicile",
          baseMatch?.teams?.home?.id ||
            null
        );

      if (block) {
        result.push(block);
      }

    }

    if (away) {

      const block =
        makeLineupBlock(
          away,
          baseMatch?.teams?.away?.name ||
            "Extérieur",
          baseMatch?.teams?.away?.id ||
            null
        );

      if (block) {
        result.push(block);
      }

    }

    return result;
  }

  return [];
}

/* =========================================================
   EVENTS
========================================================= */

function normalizeEvent(
  event
) {

  const team =
    event?.team ||
    {};

  const player =
    event?.player ||
    {};

  const assist =
    event?.assist ||
    {};

  const rawType =
    String(
      event?.type ||
      event?.kind ||
      event?.event_type ||
      ""
    ).toLowerCase();

  let type =
    event?.type ||
    "Other";

  if (
    rawType.includes("goal")
  ) {
    type = "Goal";
  }

  if (
    rawType.includes("card")
  ) {
    type = "Card";
  }

  if (
    rawType.includes("subst")
  ) {
    type = "subst";
  }

  if (
    rawType.includes("var")
  ) {
    type = "VAR";
  }

  return {

    time: {

      elapsed:
        event?.minute ??
        event?.elapsed ??
        event?.time?.elapsed ??
        null,

      extra:
        event?.extra ??
        event?.time?.extra ??
        null

    },

    team: {

      id:
        team.id ||
        event?.team_id ||
        null,

      name:
        team.name ||
        event?.team_name ||
        ""

    },

    player: {

      id:
        player.id ||
        event?.player_id ||
        null,

      name:
        player.name ||
        event?.player_name ||
        ""

    },

    assist: {

      id:
        assist.id ||
        event?.assist_id ||
        null,

      name:
        assist.name ||
        event?.assist_name ||
        ""

    },

    type,

    detail:
      event?.detail ||
      event?.description ||
      event?.text ||
      event?.comments ||
      ""

  };
}

/* =========================================================
   PLAYER DATA FROM LINEUPS
========================================================= */

function makePlayersFromLineups(
  lineups
) {

  const result = [];

  lineups.forEach(
    lineup => {

      const team =
        lineup?.team ||
        {};

      const allPlayers = [

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

      ];

      if (
        !allPlayers.length
      ) {
        return;
      }

      const players =
        allPlayers.map(
          item => {

            const normalized =
              normalizeLineupPlayer(
                item
              );

            const p =
              normalized.player;

            const stats =
              normalized.statistics ||
              {};

            return {

              player: p,

              statistics: [

                {

                  games: {

                    rating:
                      normalized.rating ??
                      stats?.rating ??
                      stats?.games?.rating ??
                      null,

                    minutes:
                      normalized.minutes ??
                      stats?.minutes ??
                      stats?.games?.minutes ??
                      null,

                    position:
                      p.pos ||
                      stats?.position ||
                      "",

                    substitute:
                      normalized.substitute,

                    captain:
                      normalized.captain

                  },

                  goals:
                    normalized.goals ||
                    stats?.goals ||
                    {},

                  cards:
                    normalized.cards ||
                    stats?.cards ||
                    {},

                  passes:
                    normalized.passes ||
                    stats?.passes ||
                    {}

                }

              ]

            };

          }
        );

      result.push({

        team: {

          id:
            team.id ||
            null,

          name:
            team.name ||
            "",

          logo:
            team.logo ||
            ""

        },

        players

      });

    }
  );

  return result;
}

/* =========================================================
   STATISTICS
========================================================= */

function normalizeStatistics(
  detail
) {

  const stats =
    detail?.statistics ||
    detail?.stats ||
    [];

  if (
    Array.isArray(stats)
  ) {
    return stats;
  }

  if (
    stats &&
    typeof stats === "object"
  ) {

    const home =
      stats.home ||
      stats.home_team ||
      null;

    const away =
      stats.away ||
      stats.away_team ||
      null;

    const result = [];

    if (home) {

      result.push({

        team: {

          id:
            home?.team?.id ||
            null,

          name:
            home?.team?.name ||
            detail?.match?.home ||
            "Domicile"

        },

        statistics:
          Array.isArray(
            home.statistics
          )
            ? home.statistics
            : Object.entries(
                home
              ).map(
                ([type, value]) => ({
                  type,
                  value
                })
              )

      });

    }

    if (away) {

      result.push({

        team: {

          id:
            away?.team?.id ||
            null,

          name:
            away?.team?.name ||
            detail?.match?.away ||
            "Extérieur"

        },

        statistics:
          Array.isArray(
            away.statistics
          )
            ? away.statistics
            : Object.entries(
                away
              ).map(
                ([type, value]) => ({
                  type,
                  value
                })
              )

      });

    }

    return result;
  }

  return [];
}

/* =========================================================
   DETAIL ADAPTER
========================================================= */

function adaptMatchDetails(
  result,
  baseMatch
) {

  const root =
    result?.data ||
    result?.match ||
    result ||
    {};

  const match =
    root?.match ||
    root?.fixture ||
    root?.data ||
    root;

  const adaptedBase =
    adaptFixture(
      match
    ) ||
    baseMatch;

  const lineups =
    adaptLineups(
      root,
      adaptedBase
    );

  const rawTimeline =
    root?.timeline ||
    root?.events ||
    root?.incidents ||
    [];

  const events =
    Array.isArray(
      rawTimeline
    )
      ? rawTimeline.map(
          normalizeEvent
        )
      : [];

  const statistics =
    normalizeStatistics(
      root
    );

  const players =
    Array.isArray(
      root?.players
    )
      ? root.players
      : makePlayersFromLineups(
          lineups
        );

  return {

    ...adaptedBase,

    events,

    lineups,

    statistics,

    players

  };
}

/* =========================================================
   MATCH DETAILS
========================================================= */

async function fetchMatchDetails(
  identifier
) {

  const cached =
    getCached(
      detailsCache,
      String(identifier),
      DETAILS_CACHE_TIME
    );

  if (cached) {

    return {
      data: cached,
      cached: true
    };

  }

  let baseMatch =
    findCachedMatch(
      identifier
    );

  let slug =
    baseMatch?.fixture?.slug ||
    null;

  /*
     إلى دخل slug مباشرة
  */

  if (
    !slug &&
    /[a-z-]/i.test(
      String(identifier)
    )
  ) {
    slug =
      String(identifier);
  }

  if (!slug) {

    throw new Error(
      "Match slug introuvable"
    );

  }

  const result =
    await sportScoreFetch(
      `/match/?sport=football&slug=${encodeURIComponent(
        slug
      )}`
    );

  const details =
    adaptMatchDetails(
      result,
      baseMatch
    );

  saveCache(
    detailsCache,
    String(identifier),
    details
  );

  /*
     نخليو كذلك cache بالـslug
  */

  saveCache(
    detailsCache,
    slug,
    details
  );

  return {
    data: details,
    cached: false
  };
}

/* =========================================================
   MAIN API
========================================================= */

app.get(
  "/api",
  async (req, res) => {

    try {

      /* ===================================
         LIVE
      =================================== */

      if (
        req.query.live === "all"
      ) {

        const result =
          await fetchLive();

        return res.json({
          data:
            result.data,
          cached:
            result.cached || false,
          stale:
            result.stale || false
        });

      }

      /* ===================================
         DETAILS
      =================================== */

      if (
        req.query.fixture
      ) {

        const identifier =
          String(
            req.query.fixture
          ).trim();

        const result =
          await fetchMatchDetails(
            identifier
          );

        return res.json({
          data:
            result.data,
          cached:
            result.cached || false
        });

      }

      /* ===================================
         DATE
      =================================== */

      const date =
        req.query.date ||
        todayISO();

      const result =
        await fetchMatchesByDate(
          date
        );

      return res.json({
        data:
          result.data,
        cached:
          result.cached || false,
        stale:
          result.stale || false
      });

    } catch (error) {

      console.error(
        "SPORTSCORE ERROR:",
        error
      );

      return res.status(
        error?.status === 404
          ? 404
          : 500
      ).json({

        error:
          error.message ||
          "SportScore error",

        data: []

      });

    }

  }
);

/* =========================================================
   OLD ROUTES — COMPATIBILITY
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
        data:
          result.data,
        cached:
          result.cached || false,
        stale:
          result.stale || false
      });

    } catch (error) {

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

app.get(
  "/api/live",
  async (req, res) => {

    try {

      const result =
        await fetchLive();

      res.json({
        data:
          result.data,
        cached:
          result.cached || false,
        stale:
          result.stale || false
      });

    } catch (error) {

      res.status(500).json({

        error:
          error.message,

        data: []

      });

    }

  }
);

/* =========================================================
   TEST SERVER
========================================================= */

app.get(
  "/api/test",
  (req, res) => {

    res.json({

      status:
        "ok",

      service:
        "BakhiraFoot",

      api:
        "SportScore",

      routes: {

        matches:
          "/api?date=YYYY-MM-DD",

        live:
          "/api?live=all",

        details:
          "/api?fixture=MATCH_ID_OR_SLUG"

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

    } catch (error) {

      res.status(500).json({

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
