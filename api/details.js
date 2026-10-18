/* =========================================================
   BAKHIRAFOOT - api/details.js
   Details ONLY for new matches.
   Old SportScore Details stay in api/index.js.
   ========================================================= */

const FOTMOB_CACHE = new Map();

module.exports = async (req, res) => {

  const fixture =
    String(
      req?.query?.fixture || ""
    ).trim();

  const requestedSource =
    String(
      req?.query?.source || ""
    ).trim().toLowerCase();


  /* =====================================================
     RESPONSE
  ===================================================== */

  function send(
    status,
    data
  ) {

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    return res
      .status(status)
      .json(data);
  }


  /* =====================================================
     HELPERS
  ===================================================== */

  function arr(value) {

    return Array.isArray(value)
      ? value
      : [];
  }


  function first(...values) {

    return (
      values.find(
        value =>
          value !== undefined &&
          value !== null &&
          value !== ""
      ) ?? null
    );
  }


  function num(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const n =
      Number(value);

    return Number.isFinite(n)
      ? n
      : null;
  }

  function norm(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }


 async function getJSON(url) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      15000
    );

  try {

    /*
     * Keep upstream request headers aligned with the provider.
     * Using a SofaScore Origin for ESPN/TheSportsDB can look like
     * a cross-site request and may trigger upstream anti-bot rules.
     */
    const host = new URL(url).hostname.toLowerCase();
    const isESPN = host.endsWith("espn.com") || host.endsWith("espncdn.com");
    const isTSDB = host.endsWith("thesportsdb.com");
    const isFotMob = host.endsWith("fotmob.com");
    const referer = isESPN
      ? "https://www.espn.com/"
      : isTSDB
        ? "https://www.thesportsdb.com/"
        : isFotMob
          ? "https://www.fotmob.com/"
          : "https://www.sofascore.com/";
    const origin = isESPN
      ? "https://www.espn.com"
      : isTSDB
        ? "https://www.thesportsdb.com"
        : isFotMob
          ? "https://www.fotmob.com"
          : "https://www.sofascore.com";

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json, text/plain, */*",

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",

            Referer: referer,

            Origin: origin
          },

          cache:
            "no-store",

          signal:
            controller.signal
        }
      );

    const raw =
      await response.text();

    let data;

    try {
      data =
        JSON.parse(raw);
    }
    catch {
      data = {
        raw
      };
    }

    if (!response.ok) {

      const error =
        new Error(
          `HTTP ${response.status}`
        );

      error.status =
        response.status;

      error.data =
        data;

      throw error;
    }

    return data;

  }
  finally {

    clearTimeout(timer);

  }
}

  /* =====================================================
     SOURCE DETECTION
  ===================================================== */

function sourceOf() {

  const value =
    String(fixture || "")
      .trim()
      .toLowerCase();

  /* =========================================
     1. PREFIX ديال الماتش عندو الأولوية
  ========================================= */

  if (
    value.startsWith("sofa-")
  ) {
    return "sofascore";
  }

  if (
    value.startsWith("espn-")
  ) {
    return "espn";
  }

  if (
    value.startsWith("tsdb-")
  ) {
    return "thesportsdb";
  }

  /* =========================================
     2. إلا ما كانش prefix
        نستعمل source المرسل
  ========================================= */

  const requested =
    String(
      requestedSource || ""
    )
      .trim()
      .toLowerCase();

  if (
    requested === "sofa" ||
    requested === "sofascore"
  ) {
    return "sofascore";
  }

  if (
    requested === "espn"
  ) {
    return "espn";
  }

  if (
    requested === "tsdb" ||
    requested === "thesportsdb"
  ) {
    return "thesportsdb";
  }

  return "sportscore";
}

  /* =====================================================
     TEAM
  ===================================================== */

  function team(
    id,
    name,
    logo
  ) {

    return {

      id:
        id ?? null,

      name:
        name ||
        "Équipe",

      logo:
        logo ||
        ""

    };

  }


  /* =====================================================
     SOFASCORE STATUS
  ===================================================== */

  function sofaStatus(
    event
  ) {

    const type =
      String(
        event?.status?.type ||
        ""
      ).toLowerCase();


    if (
      type ===
      "inprogress"
    ) {

      return "LIVE";

    }


    if (
      type ===
      "halftime"
    ) {

      return "HT";

    }


    if (
      type ===
      "finished"
    ) {

      return "FT";

    }


    if (
      type ===
      "postponed"
    ) {

      return "PST";

    }


    if (
      type ===
        "canceled" ||
      type ===
        "cancelled"
    ) {

      return "CANC";

    }


    return "NS";

  }


  /* =====================================================
     SOFASCORE DETAILS
  ===================================================== */

async function sofaDetails(
  value
) {

  const id =
    String(value || "")
      .replace(/^sofa-/i, "")
      .trim();

  if (!id) {
    throw new Error(
      "SofaScore event ID manquant"
    );
  }

  /* =========================================
     SOFASCORE HOSTS
     الأول www ثم api كـfallback
  ========================================= */

  const hosts = [
    "https://www.sofascore.com/api/v1",
    "https://api.sofascore.com/api/v1"
  ];

  let eventBody = null;
  let usedHost = hosts[0];
  let lastError = null;

  /* =========================================
     EVENT
  ========================================= */

  for (const host of hosts) {

    try {

      eventBody =
        await getJSON(
          `${host}/event/${encodeURIComponent(id)}`
        );

      if (eventBody?.event) {

        usedHost =
          host;

        break;
      }

    } catch (error) {

      lastError =
        error;
    }
  }

  if (!eventBody?.event) {

    throw (
      lastError ||
      new Error(
        "SofaScore match introuvable"
      )
    );
  }

  const event =
    eventBody.event;

  /* =========================================
     INCIDENTS / LINEUPS / STATS
     نستعمل نفس الـhost اللي نجح
  ========================================= */

  const results =
    await Promise.allSettled([

      getJSON(
        `${usedHost}/event/${encodeURIComponent(id)}/incidents`
      ),

      getJSON(
        `${usedHost}/event/${encodeURIComponent(id)}/lineups`
      ),

      getJSON(
        `${usedHost}/event/${encodeURIComponent(id)}/statistics`
      )

    ]);

  const incidentsBody =
    results[0].status === "fulfilled"
      ? results[0].value
      : {};

  const lineupsBody =
    results[1].status === "fulfilled"
      ? results[1].value
      : {};

  const statsBody =
    results[2].status === "fulfilled"
      ? results[2].value
      : {};

  /* =========================================
     TEAMS
  ========================================= */

  const homeRaw =
    event?.homeTeam ||
    {};

  const awayRaw =
    event?.awayTeam ||
    {};

  const home = team(
    homeRaw?.id,
    homeRaw?.name ||
      homeRaw?.shortName,
    homeRaw?.logo ||
      (
        homeRaw?.id
          ? `https://www.sofascore.com/api/v1/team/${homeRaw.id}/image`
          : ""
      )
  );

  const away = team(
    awayRaw?.id,
    awayRaw?.name ||
      awayRaw?.shortName,
    awayRaw?.logo ||
      (
        awayRaw?.id
          ? `https://www.sofascore.com/api/v1/team/${awayRaw.id}/image`
          : ""
      )
  );

  /* =========================================
     COMPETITION
  ========================================= */

  const tournament =
    event?.tournament ||
    {};

  const uniqueTournament =
    tournament?.uniqueTournament ||
    {};

  const category =
    tournament?.category ||
    {};

  const league = {

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
        ? `https://www.sofascore.com/api/v1/unique-tournament/${uniqueTournament.id}/image`
        : "",

    round:
      event?.roundInfo?.name ||
      event?.roundInfo?.round ||
      null,

    season:
      event?.season?.name ||
      null
  };

  /* =========================================
     SCORE
  ========================================= */

  const homeScore =
    num(
      event?.homeScore?.current
    );

  const awayScore =
    num(
      event?.awayScore?.current
    );

  /* =========================================
     FIXTURE
  ========================================= */

  const fixtureData = {

    id:
      id,

    slug:
      event?.slug ||
      `sofa-${id}`,

    upstreamId:
      id,

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
        sofaStatus(
          event
        ),

      long:
        event?.status?.description ||
        "Match",

      elapsed:
        null
    },

    venue:
      event?.venue?.name ||
      null,

    referee:
      event?.referee?.name ||
      null,

    timezone:
      event?.timeZone ||
      null
  };

  /* =========================================
     LINEUPS
  ========================================= */

  const lineups = [];

  for (
    const side of
      ["home", "away"]
  ) {

    const raw =
      lineupsBody?.[side];

    if (!raw) {
      continue;
    }

    const selectedTeam =
      side === "home"
        ? home
        : away;

    const players =
      arr(
        raw?.players
      );

    const startXI =
      players
        .filter(
          player =>
            player?.substitute !== true
        )
        .slice(
          0,
          11
        );

    const substitutes =
      players.filter(
        player =>
          player?.substitute === true
      );

    lineups.push({

      team:
        selectedTeam,

      formation:
        raw?.formation ||
        "—",

      coach:
        raw?.manager?.name ||
        raw?.coach?.name ||
        null,

      startXI,

      substitutes,

      players: [
        ...startXI,
        ...substitutes
      ]
    });
  }

  /* =========================================
     EVENTS / STATS
  ========================================= */

  const events =
    arr(
      incidentsBody?.incidents
    );

  const statistics =
    arr(
      statsBody?.statistics
    );

  /* =========================================
     FINAL DETAILS
  ========================================= */

  return {

    fixture:
      fixtureData,

    league:
      league,

    competition:
      {
        ...league
      },

    teams: {
      home,
      away
    },

    home_team:
      home,

    away_team:
      away,

    goals: {
      home:
        homeScore,

      away:
        awayScore
    },

    home_score:
      homeScore,

    away_score:
      awayScore,

    score: {

      home:
        homeScore,

      away:
        awayScore,

      halftime: {

        home:
          num(
            event?.homeScore?.period1
          ),

        away:
          num(
            event?.awayScore?.period1
          )
      },

      fulltime: {

        home:
          homeScore,

        away:
          awayScore
      }
    },

    events,

    incidents:
      events,

    lineups,

    statistics,

    players:
      [],

    provider:
      "SofaScore"
  };
}

  /* =====================================================
     ESPN DETAILS
  ===================================================== */

  async function espnDetails(
    value
  ) {

    const id =
      value
        .replace(
          /^espn-/i,
          ""
        )
        .trim();


    if (!id) {

      throw new Error(
        "ESPN event ID manquant"
      );

    }


    const body =
      await getJSON(

        `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${encodeURIComponent(
          id
        )}`

      );


    const header =
      body?.header ||
      {};


    const competition =
      arr(
        header?.competitions
      )[0] ||
      {};


    const competitors =
      arr(
        competition
          ?.competitors
      );


    const homeRaw =
      competitors.find(
        x =>
          x?.homeAway ===
          "home"
      );


    const awayRaw =
      competitors.find(
        x =>
          x?.homeAway ===
          "away"
      );


    if (
      !homeRaw ||
      !awayRaw
    ) {

      throw new Error(
        "ESPN match introuvable"
      );

    }


    const homeTeamRaw =
      homeRaw?.team ||
      {};


    const awayTeamRaw =
      awayRaw?.team ||
      {};


    const home =
      team(

        homeTeamRaw?.id,

        homeTeamRaw
          ?.displayName ||
        homeTeamRaw
          ?.name,

        homeTeamRaw
          ?.logo ||

        (
          homeTeamRaw?.id

            ? `https://a.espncdn.com/i/teamlogos/soccer/500/${homeTeamRaw.id}.png`

            : ""
        )

      );


    const away =
      team(

        awayTeamRaw?.id,

        awayTeamRaw
          ?.displayName ||
        awayTeamRaw
          ?.name,

        awayTeamRaw
          ?.logo ||

        (
          awayTeamRaw?.id

            ? `https://a.espncdn.com/i/teamlogos/soccer/500/${awayTeamRaw.id}.png`

            : ""
        )

      );


    const state =
      String(

        competition
          ?.status
          ?.type
          ?.state ||

        ""

      ).toLowerCase();


    const status =

      state ===
      "in"

        ? "LIVE"

        : state ===
          "post"

          ? "FT"

          : "NS";


    const homeScore =
      num(
        homeRaw?.score
      );


    const awayScore =
      num(
        awayRaw?.score
      );


    const leagueName =
      header?.league
        ?.name ||

      competition?.league
        ?.name ||

      "Football";


    const events =
      arr(
        body?.plays
      ).map(

        play => ({

          time: {

            elapsed:
              play?.clock
                ?.displayValue ||

              play?.clock
                ?.value ||

              null,

            extra:
              null

          },


          minute:
            play?.clock
              ?.displayValue ||

            play?.clock
              ?.value ||

            null,


          team: {

            id:
              play?.team?.id ||
              null,

            name:
              play?.team
                ?.displayName ||

              play?.team?.name ||

              ""

          },


          player: {

            id:
              play
                ?.participants
                ?.[0]
                ?.athlete
                ?.id ||

              null,

            name:
              play
                ?.participants
                ?.[0]
                ?.athlete
                ?.displayName ||

              ""

          },


          assist: {

            id:
              play
                ?.participants
                ?.[1]
                ?.athlete
                ?.id ||

              null,

            name:
              play
                ?.participants
                ?.[1]
                ?.athlete
                ?.displayName ||

              ""

          },


          type:
            play?.type?.text ||
            play?.type?.id ||
            "Other",


          detail:
            play?.text ||
            ""

        })

      );


    /* ESPN summary: extract real team statistics and player data when available. */
    const espnPlayerBlocks = arr(body?.boxscore?.players);
    const espnLineups = [];
    for (const block of espnPlayerBlocks) {
      const blockTeam = block?.team || {};
      const blockTeamId = String(first(blockTeam?.id, block?.teamId, ""));
      const homeMatch = (blockTeamId && blockTeamId === String(homeTeamRaw?.id)) || norm(blockTeam?.displayName || blockTeam?.name) === norm(homeTeamRaw?.displayName || homeTeamRaw?.name);
      const awayMatch = (blockTeamId && blockTeamId === String(awayTeamRaw?.id)) || norm(blockTeam?.displayName || blockTeam?.name) === norm(awayTeamRaw?.displayName || awayTeamRaw?.name);
      const side = homeMatch ? "home" : awayMatch ? "away" : "";
      if (!side) continue;
      const playerMap = new Map();
      const mergeEntry = (entry, statKeys = []) => {
        const athlete = entry?.athlete || entry?.player || entry || {};
        const athleteId = String(first(athlete?.id, entry?.athleteId, entry?.id, athlete?.displayName, athlete?.fullName, athlete?.name, ""));
        if (!athleteId) return;
        const statValues = arr(entry?.stats || entry?.statistics);
        const stats = {};
        statKeys.forEach((key, i) => { if (statValues[i] !== undefined) stats[String(key).toLowerCase()] = statValues[i]; });
        const existing = playerMap.get(athleteId) || {};
        const headshot = first(athlete?.headshot?.href, athlete?.headshot?.url, athlete?.headshot, athlete?.image?.href, athlete?.image?.url, athlete?.image, athlete?.photo, "");
        playerMap.set(athleteId, {
          ...existing,
          id: athleteId,
          name: first(athlete?.displayName, athlete?.fullName, athlete?.full_name, athlete?.name, existing.name, ""),
          number: first(athlete?.jersey, athlete?.shirtNumber, athlete?.number, existing.number, null),
          position: first(athlete?.position?.displayName, athlete?.position?.name, athlete?.position?.abbreviation, typeof athlete?.position === "string" ? athlete.position : null, existing.position, ""),
          photo: first(headshot, existing.photo, ""),
          rating: first(athlete?.rating, entry?.rating, stats.rating, stats.matchrating, existing.rating, null),
          stats: { ...(existing.stats || {}), ...stats },
          starter: first(entry?.starter, athlete?.starter, entry?.isStarter, athlete?.isStarter, entry?.starting, athlete?.starting, existing.starter),
          substitute: first(entry?.substitute, athlete?.substitute, existing.substitute)
        });
      };
      arr(block?.athletes).forEach(entry => mergeEntry(entry));
      arr(block?.statistics).forEach(statGroup => {
        const keys = arr(statGroup?.keys);
        arr(statGroup?.athletes).forEach(entry => mergeEntry(entry, keys));
      });
      const allPlayers = [...playerMap.values()];
      const hasStarterFlags = allPlayers.some(player => typeof player.starter === "boolean" || typeof player.substitute === "boolean");
      const starters = hasStarterFlags
        ? allPlayers.filter(player => player.starter === true || (player.starter !== false && player.substitute !== true)).slice(0, 11)
        : allPlayers.length <= 11 ? allPlayers.slice(0, 11) : [];
      const substitutes = hasStarterFlags ? allPlayers.filter(player => !starters.includes(player)) : [];
      const teamInfo = side === "home" ? home : away;
      espnLineups.push({
        team: teamInfo, side,
        formation: first(block?.formation, block?.tactics?.formation, "—"),
        startXI: starters, substitutes, players: hasStarterFlags || starters.length ? [...starters, ...substitutes] : allPlayers
      });
    }

    const espnTeamStats = arr(body?.boxscore?.teams).map(block => {
      const blockTeam = block?.team || {};
      const blockTeamId = String(first(blockTeam?.id, block?.teamId, ""));
      const homeMatch = (blockTeamId && blockTeamId === String(homeTeamRaw?.id)) || norm(blockTeam?.displayName || blockTeam?.name) === norm(homeTeamRaw?.displayName || homeTeamRaw?.name);
      const awayMatch = (blockTeamId && blockTeamId === String(awayTeamRaw?.id)) || norm(blockTeam?.displayName || blockTeam?.name) === norm(awayTeamRaw?.displayName || awayTeamRaw?.name);
      const side = homeMatch ? "home" : awayMatch ? "away" : "";
      if (!side) return null;
      return {
        team: side === "home" ? home : away,
        side,
        statistics: arr(block?.statistics).map(stat => ({
          type: first(stat?.name, stat?.displayName, stat?.label, stat?.abbreviation, "Stat"),
          value: first(stat?.displayValue, stat?.value, stat?.display, null)
        }))
      };
    }).filter(Boolean);

    const league = {

      id:
        header?.league
          ?.id ||
        null,

      name:
        leagueName,

      country:
        "World",

      logo:
        header?.league
          ?.logo ||
        "",

      round:
        null,

      season:
        header?.season
          ?.displayName ||
        null

    };


    const fixtureData = {

      id:
        id,

      slug:
        `espn-${id}`,

      upstreamId:
        id,

      date:
        competition
          ?.date ||
        null,

      status: {

        short:
          status,

        long:
          competition
            ?.status
            ?.type
            ?.description ||
          status,

        elapsed:
          competition
            ?.status
            ?.displayClock ||
          null

      },

      venue:
        competition
          ?.venue
          ?.fullName ||
        competition
          ?.venue
          ?.displayName ||
        null,

      referee:
        null,

      timezone:
        null

    };


    return {

      fixture:
        fixtureData,

      league,

      competition:
        {
          ...league
        },

      teams: {

        home,

        away

      },

      home_team:
        home,

      away_team:
        away,

      goals: {

        home:
          homeScore,

        away:
          awayScore

      },

      home_score:
        homeScore,

      away_score:
        awayScore,

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

      events,

      incidents:
        events,

      lineups: espnLineups,

      statistics: espnTeamStats,

      players: espnLineups.flatMap(lineup => lineup.players),

      provider:
        "ESPN"

    };

  }


  /* =====================================================
     THE SPORTs DB DETAILS
  ===================================================== */

  async function tsdbDetails(
    value
  ) {

    const id =
      value
        .replace(
          /^tsdb-/i,
          ""
        )
        .trim();


    if (!id) {

      throw new Error(
        "TheSportsDB event ID manquant"
      );

    }


    const body =
      await getJSON(

        `https://www.thesportsdb.com/api/v1/json/123/lookupevent.php?id=${encodeURIComponent(
          id
        )}`

      );


    const event =
      arr(
        body?.events
      )[0];


    if (
      !event
    ) {

      throw new Error(
        "TheSportsDB match introuvable"
      );

    }


    const home =
      team(

        event?.idHomeTeam ||
        null,

        event?.strHomeTeam ||
        "Domicile",

        event?.strHomeTeamBadge ||
        ""

      );


    const away =
      team(

        event?.idAwayTeam ||
        null,

        event?.strAwayTeam ||
        "Extérieur",

        event?.strAwayTeamBadge ||
        ""

      );


    const homeScore =
      num(
        event?.intHomeScore
      );


    const awayScore =
      num(
        event?.intAwayScore
      );


    const rawStatus =
      String(

        event?.strStatus ||

        event?.strProgress ||

        ""

      ).toLowerCase();


    const status =

      /finished|\bft\b/.test(
        rawStatus
      )

        ? "FT"

        : /half|\bht\b/.test(
            rawStatus
          )

          ? "HT"

          : /live|progress/.test(
              rawStatus
            )

            ? "LIVE"

            : "NS";


    const league = {

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
        event?.intRound ||
        null,

      season:
        event?.strSeason ||
        null

    };


    return {

      fixture: {

        id:
          id,

        slug:
          `tsdb-${id}`,

        upstreamId:
          id,

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

        },


        venue:
          event?.strVenue ||
          null,


        referee:
          event?.strReferee ||
          null,


        timezone:
          null

      },


      league,


      competition:
        {
          ...league
        },


      teams: {

        home,

        away

      },


      home_team:
        home,


      away_team:
        away,


      goals: {

        home:
          homeScore,

        away:
          awayScore

      },


      home_score:
        homeScore,


      away_score:
        awayScore,


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


      events:
        [],


      incidents:
        [],


      lineups:
        [],


      statistics:
        [],


      players:
        [],


      provider:
        "TheSportsDB"

    };

  }


  /* =====================================================
     MAIN ROUTE
  ===================================================== */

  if (
    !fixture
  ) {

    return send(

      400,

      {

        error:
          "Fixture manquant",

        data:
          []

      }

    );

  }


  const source =
    sourceOf();


  /*
     هذا الملف فقط للماتشات الجديدة.
     SportScore يبقى فـ api/index.js.
  */

  if (
    source ===
    "sportscore"
  ) {

    return send(

      400,

      {

        error:
          "Match SportScore doit utiliser api/index.js",

        data:
          []

      }

    );

  }


  try {

    let details;


    if (
      source ===
      "sofascore"
    ) {

      details =
        await sofaDetails(
          fixture
        );

    }


    else if (
      source ===
      "espn"
    ) {

      details =
        await espnDetails(
          fixture
        );

    }


    else {

      details =
        await tsdbDetails(
          fixture
        );

    }


    return send(

      200,

      {

        data:
          details,

        provider:
          details?.provider ||
          source

      }

    );

  }


  catch (
    error
  ) {

    console.error(

      "BAKHIRAFOOT NEW DETAILS ERROR:",

      {

        fixture,

        source,

        message:
          error?.message

      }

    );


    return send(

      error?.status ||
        502,

      {

        error:
          "Impossible de charger le match",

        details:
          error?.message ||
          null,

        provider:
          source,

        data:
          []

      }

    );

  }

};
