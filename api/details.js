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



  async function fotmobLineupLookup(query) {
    const homeName = String(query && query.home || "").trim();
    const awayName = String(query && query.away || "").trim();
    const dateValue = String(query && query.date || "").trim();
    const dateMatch = dateValue.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
    let dateKey = dateMatch ? dateMatch[1] + dateMatch[2] + dateMatch[3] : "";
    if (!dateKey && dateValue) {
      const parsed = new Date(dateValue);
      if (Number.isFinite(parsed.getTime())) dateKey = parsed.toISOString().slice(0,10).replace(/-/g,"");
    }
    if (!homeName || !awayName || !dateKey) {
      const error = new Error("Home, away et date sont nécessaires.");
      error.status = 400;
      throw error;
    }

    const nameKey = value => {
      let s = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      s = s.replace(/\bman utd\b/g,"manchester united").replace(/\bman united\b/g,"manchester united")
        .replace(/\bman city\b/g,"manchester city").replace(/\bspurs\b/g,"tottenham hotspur")
        .replace(/\bwolves\b/g,"wolverhampton wanderers").replace(/\bpsg\b/g,"paris saint germain")
        .replace(/\bbarca\b/g,"barcelona").replace(/\binter\b/g,"inter milan");
      return s.replace(/\bfc\b|\bcf\b|\bsc\b|\bafc\b|\bfk\b|\bclub\b/g," ")
        .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
    };
    const similarity = (a,b) => {
      const x=nameKey(a), y=nameKey(b);
      if (!x || !y) return 0;
      if (x===y) return 1;
      if (x.length>4 && y.length>4 && (x.includes(y) || y.includes(x))) return 0.9;
      const xs=new Set(x.split(" ")), ys=new Set(y.split(" "));
      let same=0; for (const part of xs) if (ys.has(part)) same++;
      return 2*same/Math.max(1,xs.size+ys.size);
    };
    const dateOffset = (key,offset) => {
      const d=new Date(key.slice(0,4)+"-"+key.slice(4,6)+"-"+key.slice(6,8)+"T12:00:00Z");
      d.setUTCDate(d.getUTCDate()+offset);
      return d.toISOString().slice(0,10).replace(/-/g,"");
    };
    const fotmobJSON = async url => {
      const cached=FOTMOB_CACHE.get(url);
      if (cached && cached.exp>Date.now()) return cached.value;
      const value=await getJSON(url);
      if (!value || typeof value!=="object" || value.raw) throw new Error("FotMob returned non-JSON data");
      FOTMOB_CACHE.set(url,{value,exp:Date.now()+180000});
      if (FOTMOB_CACHE.size>80) {
        for (const [key,item] of FOTMOB_CACHE) if (item.exp<=Date.now()) FOTMOB_CACHE.delete(key);
        while (FOTMOB_CACHE.size>80) FOTMOB_CACHE.delete(FOTMOB_CACHE.keys().next().value);
      }
      return value;
    };
    const matchesFor = data => [
      ...arr(data && data.matches),
      ...arr(data && data.leagues).flatMap(league=>arr(league && league.matches))
    ];
    let selected=null;
    for (const day of [dateKey,dateOffset(dateKey,-1),dateOffset(dateKey,1)]) {
      let body;
      try {
        body=await fotmobJSON("https://www.fotmob.com/api/data/matches?date="+day);
      } catch (error) {
        if (day===dateKey) throw error;
        continue;
      }
      const ranked=matchesFor(body).map(match=>{
        const homeChoices=[match?.home?.name,match?.home?.longName,match?.home?.shortName].filter(Boolean);
        const awayChoices=[match?.away?.name,match?.away?.longName,match?.away?.shortName].filter(Boolean);
        const hs=Math.max(0,...homeChoices.map(name=>similarity(homeName,name)));
        const as=Math.max(0,...awayChoices.map(name=>similarity(awayName,name)));
        return {match,hs,as,score:hs+as};
      }).filter(item=>item.hs>=0.66 && item.as>=0.66).sort((a,b)=>b.score-a.score);
      if (ranked.length) { selected=ranked[0].match; break; }
    }
    if (!selected || selected.id==null) {
      const error=new Error("Ma l9inach nafs lmatch f masdar dyal التشكيلة.");
      error.status=404;
      throw error;
    }

    const detail=await fotmobJSON("https://www.fotmob.com/api/data/matchDetails?matchId="+encodeURIComponent(String(selected.id)));
    const lineup=detail?.content?.lineup || detail?.content?.lineups || detail?.lineup || null;
    const rawHome=lineup?.homeTeam || lineup?.home || lineup?.host || null;
    const rawAway=lineup?.awayTeam || lineup?.away || lineup?.guest || null;
    const formationRows=value=>String(value||"").trim().replace(/\s+/g,"").split("-").map(Number);
    const validLayout=player=>{
      const vertical=player?.verticalLayout;
      if (vertical && Number.isFinite(Number(vertical.x)) && Number.isFinite(Number(vertical.y))) {
        return Number(vertical.x)>=0 && Number(vertical.x)<=1 && Number(vertical.y)>=0 && Number(vertical.y)<=1;
      }
      const horizontal=player?.horizontalLayout;
      return !!(horizontal && Number.isFinite(Number(horizontal.x)) && Number.isFinite(Number(horizontal.y)) &&
        Number(horizontal.x)>=0 && Number(horizontal.x)<=1 && Number(horizontal.y)>=0 && Number(horizontal.y)<=1);
    };
    const point=player=>{
      const v=player?.verticalLayout;
      if (validLayout(player) && v) return {x:Number(v.x)*100,y:Number(v.y)*100};
      const h=player?.horizontalLayout;
      if (validLayout(player) && h) return {x:Number(h.y)*100,y:Number(h.x)*100};
      return null;
    };
    const sourceRole=player=>{
      const values=[
        player?.positionStringShort,player?.localizedPosition?.label,player?.localizedPosition?.fallback,
        player?.position?.label,player?.position?.abbreviation,player?.position?.name,
        player?.role?.label,player?.role?.name
      ];
      const broad=new Set(["g","gk","d","df","def","m","mf","mid","f","fw","fwd","att","forward"]);
      for (const value of values) {
        if (typeof value!=="string" || !value.trim()) continue;
        const label=value.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
        if (!broad.has(label.toLowerCase())) return value.trim().toUpperCase();
      }
      return "";
    };
    const roleTemplates={
      "4-2-3-1":[["LB","CB","CB","RB"],["CDM","CDM"],["LW","CAM","RW"],["ST"]],
      "4-3-3":[["LB","CB","CB","RB"],["CDM","CM","CM"],["LW","ST","RW"]],
      "4-4-2":[["LB","CB","CB","RB"],["LM","CM","CM","RM"],["ST","ST"]],
      "4-1-4-1":[["LB","CB","CB","RB"],["CDM"],["LM","CM","CM","RM"],["ST"]],
      "4-2-2-2":[["LB","CB","CB","RB"],["CDM","CDM"],["CAM","CAM"],["ST","ST"]],
      "4-3-1-2":[["LB","CB","CB","RB"],["CDM","CM","CM"],["CAM"],["ST","ST"]],
      "4-3-2-1":[["LB","CB","CB","RB"],["CDM","CM","CM"],["LAM","RAM"],["ST"]],
      "4-5-1":[["LB","CB","CB","RB"],["LM","CM","CDM","CM","RM"],["ST"]],
      "4-1-2-1-2":[["LB","CB","CB","RB"],["CDM"],["LCM","RCM"],["CAM"],["ST","ST"]],
      "3-4-3":[["LCB","CB","RCB"],["LWB","CM","CM","RWB"],["LW","ST","RW"]],
      "3-5-2":[["LCB","CB","RCB"],["LWB","CM","CDM","CM","RWB"],["ST","ST"]],
      "3-4-2-1":[["LCB","CB","RCB"],["LWB","CM","CM","RWB"],["LAM","RAM"],["ST"]],
      "5-3-2":[["LWB","LCB","CB","RCB","RWB"],["CDM","CM","CM"],["ST","ST"]],
      "5-4-1":[["LWB","LCB","CB","RCB","RWB"],["LM","CM","CM","RM"],["ST"]]
    };
    const getSlotRoles=(rawTeam,side)=>{
      const starters=arr(rawTeam?.starters);
      const form=String(rawTeam?.formation||"").replace(/\s+/g,"");
      const rows=formationRows(form), templates=roleTemplates[form];
      if (starters.length!==11 || !templates || rows.length!==templates.length ||
          rows.some(n=>!Number.isInteger(n)||n<1) || rows.reduce((s,n)=>s+n,0)!==10) return new Map();
      const entries=starters.map((player,index)=>({player,index,point:point(player)}));
      if (entries.some(item=>!item.point)) return new Map();
      const sorted=[...entries].sort((a,b)=>a.point.y-b.point.y);
      const clusters=[];
      for (const entry of sorted) {
        let cluster=clusters.find(group=>Math.abs(group.y-entry.point.y)<=5.5);
        if (!cluster) {cluster={y:entry.point.y,entries:[]};clusters.push(cluster);}
        cluster.entries.push(entry);
        cluster.y=cluster.entries.reduce((sum,item)=>sum+item.point.y,0)/cluster.entries.length;
      }
      let defensive=clusters;
      if (side==="away") defensive=[...clusters].reverse();
      const expected=[1,...rows];
      if (defensive.length!==expected.length || defensive.some((group,i)=>group.entries.length!==expected[i])) return new Map();
      const result=new Map();
      result.set(defensive[0].entries[0].index,"GK");
      for (let row=1;row<defensive.length;row++) {
        const roles=templates[row-1], group=defensive[row].entries;
        if (!Array.isArray(roles) || roles.length!==group.length) return new Map();
        const ordered=[...group].sort((a,b)=>side==="away"?b.point.x-a.point.x:a.point.x-b.point.x);
        ordered.forEach((entry,i)=>result.set(entry.index,roles[i]));
      }
      return result;
    };
    const normalizeTeam=(rawTeam,side,requestedName)=>{
      const starters=arr(rawTeam?.starters), subs=arr(rawTeam?.subs);
      const roles=getSlotRoles(rawTeam,side);
      const team={id:null,name:requestedName||String(rawTeam?.name||"Équipe"),
        logo:rawTeam?.id?"https://images.fotmob.com/image_resources/logo/teamlogo/"+rawTeam.id+"_small.png":""};
      const normalizePlayer=(player,index,isSub)=>{
        const location=point(player);
        const role=sourceRole(player)||(!isSub?roles.get(index)||"":"");
        const id=player?.id==null?"":String(player.id);
        const photo=player?.imageUrl||player?.photo||(id?"https://images.fotmob.com/image_resources/playerimages/"+id+".png":"");
        const normalized={id:player?.id??null,name:String(player?.name||"Joueur"),
          number:player?.shirtNumber||player?.number||"-",position:role,position_name:role,
          position_abbreviation:role,position_code:role,tacticalPosition:role,photo,
          x:location?location.x:null,y:location?location.y:null,
          coordinatesOriented:!!location,team};
        const rating=player?.performance?.rating??player?.rating?.num??null;
        return {player:normalized,rating,games:{rating,position:role,
          minutes:player?.minutesPlayed??null,substitute:!!isSub,captain:!!player?.isCaptain},raw:player};
      };
      return {team,formation:String(rawTeam?.formation||"—"),
        coach:rawTeam?.coach?.name?{name:rawTeam.coach.name}:null,
        startXI:starters.slice(0,11).map((p,i)=>normalizePlayer(p,i,false)),
        substitutes:subs.map((p,i)=>normalizePlayer(p,i,true))};
    };
    const homeLineup=rawHome?normalizeTeam(rawHome,"home",homeName):null;
    const awayLineup=rawAway?normalizeTeam(rawAway,"away",awayName):null;
    const complete=candidate=>candidate && candidate.startXI.length===11 && candidate.startXI.every(item=>validLayout(item.raw));
    if (!complete(homeLineup) || !complete(awayLineup)) {
      const error=new Error("FotMob ma kay3tich l'emplacement officiel de tous les joueurs f had lmatch.");
      error.status=404;
      throw error;
    }
    const matchDate=selected.status?.utcTime||detail.general?.matchTimeUTCDate||null;
    return {
      fixture:{id:String(selected.id),slug:"fotmob-"+String(selected.id),upstreamId:selected.id,date:matchDate,
        status:{short:selected.status?.reason?.short||(selected.status?.finished?"FT":selected.status?.started?"LIVE":"NS"),
          long:selected.status?.reason?.long||"",elapsed:null},venue:null,referee:null,timezone:"UTC"},
      league:{name:selected.league?.name||detail.general?.leagueName||"Football",logo:""},
      competition:{name:selected.league?.name||detail.general?.leagueName||"Football"},
      teams:{home:{id:rawHome?.id??null,name:homeName,logo:homeLineup.team.logo},
        away:{id:rawAway?.id??null,name:awayName,logo:awayLineup.team.logo}},
      goals:{home:selected.home?.score??null,away:selected.away?.score??null},
      lineups:[homeLineup,awayLineup],
      players:[homeLineup,awayLineup].map(item=>({team:item.team,players:[...item.startXI,...item.substitutes]})),
      events:[],statistics:[],provider:"FotMob"
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


  if (fixture.toLowerCase() === "sofa-fotmob-lookup") {
    try {
      const details = await fotmobLineupLookup(req && req.query || {});
      return send(200, { data: details, provider: "FotMob" });
    } catch (error) {
      return send(error && error.status || 502, { error: "fotmob_lineup_unavailable", details: String(error && error.message || error), data: [] });
    }
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
