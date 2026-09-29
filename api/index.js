module.exports = async (req, res) => {
  try {
    const {
      live,
      date,
      fixture
    } = req.query;

    const BASE =
      "https://sportscore.com/api/v1";

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    function output(status, data) {
      res.setHeader(
        "Cache-Control",
        "s-maxage=30, stale-while-revalidate=60"
      );

      return res
        .status(status)
        .json(data);
    }

    async function getJSON(url) {

      console.log(
        "SPORTSCORE REQUEST:",
        url
      );

      const response =
        await fetch(url, {
          method: "GET",
          headers: {
            Accept:
              "application/json"
          },
          cache: "no-store"
        });

      const text =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(text);
      } catch {
        data = {
          raw: text
        };
      }

      if (!response.ok) {
        const error =
          new Error(
            `SportScore HTTP ${response.status}`
          );

        error.status =
          response.status;

        error.data =
          data;

        throw error;
      }

      return data;
    }

    /* =====================================================
       NORMALIZE MATCH
    ===================================================== */

    function normalizeMatch(item) {

      if (!item) {
        return null;
      }

     function makeSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const rawHome =
  item.home ||
  item.home_team?.name ||
  item.homeTeam?.name ||
  item.fixture?.home?.name ||
  item.match?.home ||
  item.match?.home_team?.name ||
  "";

const rawAway =
  item.away ||
  item.away_team?.name ||
  item.awayTeam?.name ||
  item.fixture?.away?.name ||
  item.match?.away ||
  item.match?.away_team?.name ||
  "";

const sportScoreSlug =
  item.slug ||
  item.match_slug ||
  item.fixture?.slug ||
  item.fixture?.match_slug ||
  item.match?.slug ||
  null;

const generatedSlug =
  sportScoreSlug ||
  (
    rawHome &&
    rawAway
      ? `${makeSlug(rawHome)}-vs-${makeSlug(rawAway)}`
      : null
  );

const slug =
  generatedSlug;

const id =
  slug ||
  item.id ||
  item.match_id ||
  item.fixture_id ||
  item.match?.id ||
  item.fixture?.id ||
  null;

      const homeName =
        item.home ||
        item.home_team?.name ||
        item.homeTeam?.name ||
        "Domicile";

      const awayName =
        item.away ||
        item.away_team?.name ||
        item.awayTeam?.name ||
        "Extérieur";

      const homeLogo =
        item.home_logo ||
        item.home_team?.logo ||
        item.homeTeam?.logo ||
        "";

      const awayLogo =
        item.away_logo ||
        item.away_team?.logo ||
        item.awayTeam?.logo ||
        "";

      const homeId =
        item.home_id ||
        item.home_team?.id ||
        item.homeTeam?.id ||
        null;

      const awayId =
        item.away_id ||
        item.away_team?.id ||
        item.awayTeam?.id ||
        null;

      const homeScore =
        item.home_score ??
        item.score?.home ??
        item.homeScore ??
        null;

      const awayScore =
        item.away_score ??
        item.score?.away ??
        item.awayScore ??
        null;

      const competition =
        item.competition ||
        item.league ||
        {};

      const competitionName =
        typeof competition === "string"
          ? competition
          : (
              competition.name ||
              item.competition_name ||
              item.league?.name ||
              "Football"
            );

      let shortStatus =
        item.status_code ||
        item.short_status ||
        "";

      const rawStatus =
        String(
          item.status ||
          ""
        ).toLowerCase();

      if (!shortStatus) {

        if (
          rawStatus === "live" ||
          rawStatus.includes("in play") ||
          rawStatus.includes("inplay")
        ) {
          shortStatus = "LIVE";
        }

        else if (
          rawStatus === "finished" ||
          rawStatus === "ft" ||
          rawStatus.includes("ended")
        ) {
          shortStatus = "FT";
        }

        else if (
          rawStatus === "postponed"
        ) {
          shortStatus = "PST";
        }

        else if (
          rawStatus === "cancelled" ||
          rawStatus === "canceled"
        ) {
          shortStatus = "CANC";
        }

        else if (
          rawStatus.includes("half")
        ) {
          shortStatus = "HT";
        }

        else {
          shortStatus = "NS";
        }
      }

      return {

        id: id,

        slug: slug,

        fixture: {

          /*
             مهم بزاف:
             script.js يستعمل fixture.id
             وDetails كيتطلب slug.
          */

          id: id,

          slug: slug,

          upstreamId:
            item.id ||
            item.match_id ||
            item.fixture_id ||
            null,

          date:
            item.time ||
            item.date ||
            item.start_time ||
            item.kickoff ||
            null,

          status: {

            short:
              shortStatus,

            long:
              item.status_text ||
              item.status ||
              "Match",

            elapsed:
              item.minute ??
              item.elapsed ??
              null

          },

          venue:
            item.venue ||
            null,

          referee:
            item.referee ||
            null

        },

        league: {

          id:
            item.competition_id ||
            competition.id ||
            item.league?.id ||
            null,

          name:
            competitionName,

          country:
            item.country ||
            competition.country ||
            item.league?.country ||
            null,

          logo:
            item.competition_logo ||
            competition.logo ||
            item.league?.logo ||
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
            item.score?.halftime ||
            {
              home: null,
              away: null
            },

          fulltime:
            item.score?.fulltime ||
            {
              home: homeScore,
              away: awayScore
            }

        }

      };
    }

    /* =====================================================
       GET MATCH ARRAY
    ===================================================== */

    function getMatches(body) {

      if (
        Array.isArray(body?.matches)
      ) {
        return body.matches;
      }

      if (
        Array.isArray(body?.data)
      ) {
        return body.data;
      }

      if (
        Array.isArray(body)
      ) {
        return body;
      }

      return [];
    }

    /* =====================================================
       DATE MATCHES
    ===================================================== */

    if (
      !live &&
      !fixture
    ) {

      const matchDate =
        date || today;

      let body;

      try {

        body =
          await getJSON(
            `${BASE}/fixtures/?sport=football&date=${encodeURIComponent(
              matchDate
            )}&limit=200`
          );

      } catch (firstError) {

        /*
           Fallback غير لليوم الحالي.
           /matches/ هو alias رسمي للماتشات الحالية.
        */

        if (
          matchDate === today
        ) {

          body =
            await getJSON(
              `${BASE}/matches/?sport=football&limit=50`
            );

        } else {

          throw firstError;

        }

      }

      const matches =
        getMatches(body)
          .map(normalizeMatch)
          .filter(Boolean);

      return output(
        200,
        {
          data: matches,
          provider: "SportScore"
        }
      );
    }

    /* =====================================================
       LIVE
    ===================================================== */

    if (
      live === "all"
    ) {

      const body =
        await getJSON(
          `${BASE}/fixtures/?sport=football&status=live&limit=200`
        );

      const matches =
        getMatches(body)
          .map(normalizeMatch)
          .filter(Boolean);

      return output(
        200,
        {
          data: matches,
          provider: "SportScore"
        }
      );
    }

    /* =====================================================
   MATCH DETAILS - SPORTSCORE ROBUST
===================================================== */

if (fixture) {

  const slug = String(fixture).trim();

  if (!slug) {
    return output(400, {
      error: "Match slug manquant",
      data: []
    });
  }

  console.log("MATCH DETAILS SLUG:", slug);

  const body = await getJSON(
    `${BASE}/match/?sport=football&slug=${encodeURIComponent(slug)}`
  );

  /* ===================================================
     ROOT
  =================================================== */

  const root =
    body?.data ||
    body?.match ||
    body;

  const match =
    root?.match ||
    root?.fixture ||
    (
      root?.home ||
      root?.away ||
      root?.home_score !== undefined ||
      root?.away_score !== undefined
        ? root
        : body?.match || body
    );

  /* ===================================================
     GENERIC HELPERS
  =================================================== */

  function objectOrEmpty(value) {
    return value &&
      typeof value === "object" &&
      !Array.isArray(value)
      ? value
      : {};
  }

  function valueName(value) {
    if (typeof value === "string") {
      return value;
    }

    if (value && typeof value === "object") {
      return (
        value.name ||
        value.title ||
        value.label ||
        ""
      );
    }

    return "";
  }

  function valueId(value) {
    if (
      typeof value === "string" ||
      typeof value === "number"
    ) {
      return value;
    }

    if (value && typeof value === "object") {
      return (
        value.id ||
        value.team_id ||
        value.player_id ||
        null
      );
    }

    return null;
  }

  /* ===================================================
     TEAMS
  =================================================== */

  function getTeam(side) {

    const direct =
      match?.[side];

    const teamObject =
      match?.[`${side}_team`] ||
      match?.[`${side}Team`] ||
      (
        direct &&
        typeof direct === "object"
          ? direct
          : null
      ) ||
      {};

    const name =
      (
        typeof direct === "string"
          ? direct
          : ""
      ) ||
      teamObject?.name ||
      teamObject?.title ||
      match?.[`${side}_name`] ||
      (
        side === "home"
          ? "Domicile"
          : "Extérieur"
      );

    const id =
      match?.[`${side}_id`] ||
      teamObject?.id ||
      null;

    const logo =
      match?.[`${side}_logo`] ||
      teamObject?.logo ||
      teamObject?.image ||
      "";

    return {
      id,
      name,
      logo
    };
  }

  const home = getTeam("home");
  const away = getTeam("away");

  /* ===================================================
     SCORE
  =================================================== */

  const scoreObject =
    objectOrEmpty(
      match?.score
    );

  const homeScore =
    match?.home_score ??
    scoreObject?.home ??
    match?.homeScore ??
    scoreObject?.fulltime?.home ??
    null;

  const awayScore =
    match?.away_score ??
    scoreObject?.away ??
    match?.awayScore ??
    scoreObject?.fulltime?.away ??
    null;

  /* ===================================================
     STATUS
  =================================================== */

  const rawStatus =
    String(
      match?.status ||
      match?.state ||
      match?.status_text ||
      ""
    ).toLowerCase();

  let shortStatus =
    match?.status_code ||
    match?.short_status ||
    "";

  if (!shortStatus) {

    if (
      rawStatus.includes("live") ||
      rawStatus.includes("in play") ||
      rawStatus.includes("inplay")
    ) {
      shortStatus = "LIVE";
    }

    else if (
      rawStatus.includes("half")
    ) {
      shortStatus = "HT";
    }

    else if (
      rawStatus.includes("finish") ||
      rawStatus.includes("ended") ||
      rawStatus === "ft"
    ) {
      shortStatus = "FT";
    }

    else if (
      rawStatus.includes("postpon")
    ) {
      shortStatus = "PST";
    }

    else if (
      rawStatus.includes("cancel")
    ) {
      shortStatus = "CANC";
    }

    else {
      shortStatus = "NS";
    }
  }

  /* ===================================================
     COMPETITION
  =================================================== */

  const competition =
    match?.competition ||
    match?.league ||
    {};

  const leagueName =
    typeof competition === "string"
      ? competition
      : (
          competition?.name ||
          competition?.title ||
          match?.competition_name ||
          match?.league_name ||
          "Football"
        );

  const leagueId =
    (
      typeof competition === "object"
        ? competition?.id
        : null
    ) ||
    match?.competition_id ||
    match?.league_id ||
    null;

  const leagueCountry =
    (
      typeof competition === "object"
        ? competition?.country
        : null
    ) ||
    match?.country ||
    "";

  const leagueLogo =
    (
      typeof competition === "object"
        ? competition?.logo
        : null
    ) ||
    match?.competition_logo ||
    match?.league_logo ||
    "";

  const leagueRound =
    (
      typeof competition === "object"
        ? competition?.round
        : null
    ) ||
    match?.round ||
    "";

  const leagueSeason =
    (
      typeof competition === "object"
        ? competition?.season
        : null
    ) ||
    match?.season ||
    "";

  /* ===================================================
     EVENTS / TIMELINE
  =================================================== */

  const rawEvents =
    root?.timeline ||
    root?.events ||
    root?.incidents ||
    match?.timeline ||
    match?.events ||
    match?.incidents ||
    [];

  const events = Array.isArray(rawEvents)
    ? rawEvents.map(event => {

        const teamRaw =
          event?.team ??
          event?.side ??
          null;

        const playerRaw =
          event?.player ??
          null;

        const assistRaw =
          event?.assist ??
          event?.assistant ??
          null;

        const teamName =
          valueName(teamRaw) ||
          event?.team_name ||
          event?.teamName ||
          "";

        const teamId =
          valueId(teamRaw) ||
          event?.team_id ||
          event?.teamId ||
          null;

        const playerName =
          valueName(playerRaw) ||
          event?.player_name ||
          event?.playerName ||
          event?.scorer ||
          event?.name ||
          "";

        const playerId =
          valueId(playerRaw) ||
          event?.player_id ||
          event?.playerId ||
          null;

        const assistName =
          valueName(assistRaw) ||
          event?.assist_name ||
          event?.assistName ||
          "";

        const assistId =
          valueId(assistRaw) ||
          event?.assist_id ||
          event?.assistId ||
          null;

        return {

          time: {

            elapsed:
              event?.minute ??
              event?.elapsed ??
              event?.time?.elapsed ??
              event?.time_minute ??
              null,

            extra:
              event?.extra ??
              event?.time?.extra ??
              null

          },

          team: {

            id: teamId,

            name: teamName

          },

          player: {

            id: playerId,

            name: playerName

          },

          assist: {

            id: assistId,

            name: assistName

          },

          type:
            event?.type ||
            event?.event_type ||
            event?.eventType ||
            "Other",

          detail:
            event?.detail ||
            event?.description ||
            event?.text ||
            event?.comments ||
            event?.subtype ||
            ""

        };

      })
    : [];

  /* ===================================================
     LINEUPS
  =================================================== */

  const lineupSource =
    root?.lineups ||
    root?.lineup ||
    root?.formations ||
    match?.lineups ||
    match?.lineup ||
    match?.formations ||
    null;

  let rawLineups = [];

  if (Array.isArray(lineupSource)) {

    rawLineups = lineupSource;

  }

  else if (
    lineupSource &&
    typeof lineupSource === "object"
  ) {

    if (
      lineupSource.home ||
      lineupSource.away
    ) {

      rawLineups = [
        {
          ...objectOrEmpty(lineupSource.home),
          _side: "home"
        },
        {
          ...objectOrEmpty(lineupSource.away),
          _side: "away"
        }
      ];

    }

    else {

      rawLineups =
        Object.values(
          lineupSource
        ).filter(
          item =>
            item &&
            typeof item === "object"
        );

    }

  }

  /* direct home/away lineup fallback */

  if (!rawLineups.length) {

    const directHome =
      root?.home_lineup ||
      root?.homeLineup ||
      match?.home_lineup ||
      match?.homeLineup ||
      null;

    const directAway =
      root?.away_lineup ||
      root?.awayLineup ||
      match?.away_lineup ||
      match?.awayLineup ||
      null;

    if (directHome) {
      rawLineups.push({
        ...objectOrEmpty(directHome),
        _side: "home"
      });
    }

    if (directAway) {
      rawLineups.push({
        ...objectOrEmpty(directAway),
        _side: "away"
      });
    }

  }

  function normalizePlayer(item) {

    const player =
      item?.player &&
      typeof item.player === "object"
        ? item.player
        : item;

    const nestedStats =
      item?.statistics?.[0] ||
      item?.statistics ||
      item?.stats ||
      {};

    const games =
      nestedStats?.games ||
      item?.games ||
      {};

    const goals =
      nestedStats?.goals ||
      item?.goals ||
      {};

    const cards =
      nestedStats?.cards ||
      item?.cards ||
      {};

    const passes =
      nestedStats?.passes ||
      item?.passes ||
      {};

    return {

      player: {

        id:
          player?.id ??
          item?.player_id ??
          item?.id ??
          null,

        name:
          player?.name ||
          player?.title ||
          item?.player_name ||
          item?.name ||
          "Joueur",

        number:
          player?.number ??
          item?.number ??
          item?.shirt_number ??
          item?.jersey_number ??
          null,

        pos:
          player?.pos ||
          player?.position ||
          item?.position ||
          item?.pos ||
          "",

        grid:
          player?.grid ||
          item?.grid ||
          item?.position_grid ||
          "",

        photo:
          player?.photo ||
          player?.image ||
          item?.photo ||
          item?.image ||
          ""

      },

      rating:
        item?.rating ??
        item?.player_rating ??
        games?.rating ??
        nestedStats?.rating ??
        player?.rating ??
        null,

      games: {

        rating:
          item?.rating ??
          item?.player_rating ??
          games?.rating ??
          nestedStats?.rating ??
          player?.rating ??
          null,

        minutes:
          item?.minutes ??
          games?.minutes ??
          nestedStats?.minutes ??
          null,

        position:
          item?.position ||
          games?.position ||
          player?.pos ||
          player?.position ||
          "",

        substitute:
          item?.substitute ??
          item?.is_substitute ??
          false,

        captain:
          item?.captain ??
          item?.is_captain ??
          false

      },

      goals: {

        total:
          goals?.total ??
          item?.goals_total ??
          0,

        assists:
          goals?.assists ??
          item?.assists ??
          0

      },

      cards: {

        yellow:
          cards?.yellow ??
          item?.yellow ??
          0,

        red:
          cards?.red ??
          item?.red ??
          0

      },

      passes: {

        key:
          passes?.key ??
          passes?.key_passes ??
          item?.key_passes ??
          0

      },

      shots: {

        total:
          shotsTotal(
            nestedStats,
            item
          ),

        on:
          shotsOn(
            nestedStats,
            item
          )

      }

    };
  }

  function shotsTotal(stats, item) {
    return (
      stats?.shots?.total ??
      item?.shots?.total ??
      item?.shots_total ??
      0
    );
  }

  function shotsOn(stats, item) {
    return (
      stats?.shots?.on ??
      item?.shots?.on ??
      item?.shots_on ??
      0
    );
  }

  const lineups =
    rawLineups.map(
      (lineup, index) => {

        const teamRaw =
          lineup?.team ||
          lineup?.club ||
          null;

        let teamId =
          valueId(teamRaw) ||
          lineup?.team_id ||
          lineup?.teamId ||
          null;

        let teamName =
          valueName(teamRaw) ||
          lineup?.team_name ||
          lineup?.teamName ||
          "";

        let teamLogo =
          (
            typeof teamRaw === "object"
              ? (
                  teamRaw?.logo ||
                  teamRaw?.image ||
                  ""
                )
              : ""
          ) ||
          lineup?.team_logo ||
          "";

        /* side fallback */

        if (!teamId && lineup?._side === "home") {
          teamId = home.id;
        }

        if (!teamId && lineup?._side === "away") {
          teamId = away.id;
        }

        if (!teamName && lineup?._side === "home") {
          teamName = home.name;
        }

        if (!teamName && lineup?._side === "away") {
          teamName = away.name;
        }

        if (!teamLogo && lineup?._side === "home") {
          teamLogo = home.logo;
        }

        if (!teamLogo && lineup?._side === "away") {
          teamLogo = away.logo;
        }

        /* index fallback */

        if (!teamName && index === 0) {
          teamId = teamId || home.id;
          teamName = home.name;
          teamLogo = teamLogo || home.logo;
        }

        if (!teamName && index === 1) {
          teamId = teamId || away.id;
          teamName = away.name;
          teamLogo = teamLogo || away.logo;
        }

        const startXI =
          lineup?.startXI ||
          lineup?.startingXI ||
          lineup?.starting_xi ||
          lineup?.starters ||
          lineup?.starting ||
          [];

        const substitutes =
          lineup?.substitutes ||
          lineup?.bench ||
          lineup?.subs ||
          [];

        return {

          team: {

            id: teamId,

            name: teamName,

            logo: teamLogo

          },

          formation:
            lineup?.formation ||
            lineup?.tactics ||
            lineup?.tactical_formation ||
            "—",

          coach:
            lineup?.coach ||
            lineup?.manager ||
            null,

          startXI:
            Array.isArray(startXI)
              ? startXI.map(
                  normalizePlayer
                )
              : [],

          substitutes:
            Array.isArray(substitutes)
              ? substitutes.map(
                  normalizePlayer
                )
              : []

        };

      }
    )
    .filter(
      lineup =>
        lineup?.startXI?.length ||
        lineup?.substitutes?.length ||
        lineup?.formation !== "—"
    );

  /* ===================================================
     EXTRA PLAYER STATS
  =================================================== */

  let players =
    root?.players ||
    match?.players ||
    [];

  if (!Array.isArray(players)) {
    players = [];
  }

  /* ===================================================
     STATISTICS
  =================================================== */

  let statistics =
    root?.statistics ||
    root?.stats ||
    match?.statistics ||
    match?.stats ||
    [];

  if (!Array.isArray(statistics)) {
    statistics = [];
  }

  /* ===================================================
     FINAL RESPONSE
  =================================================== */

  return output(
    200,
    {

      fixture: {

        id: slug,

        slug: slug,

        upstreamId:
          match?.id ||
          match?.match_id ||
          match?.fixture_id ||
          null,

        date:
          match?.time ||
          match?.date ||
          match?.start_time ||
          match?.kickoff ||
          null,

        timezone:
          match?.timezone ||
          "UTC",

        venue:
          match?.venue ||
          null,

        referee:
          match?.referee ||
          null,

        status: {

          short:
            shortStatus,

          long:
            match?.status_text ||
            match?.status ||
            "Match",

          elapsed:
            match?.minute ??
            match?.elapsed ??
            null

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
          leagueLogo,

        round:
          leagueRound,

        season:
          leagueSeason

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
          scoreObject?.halftime ||
          {
            home: null,
            away: null
          },

        fulltime:
          scoreObject?.fulltime ||
          {
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

    }
  );
}


  /* ===================================================
     TEAM HELPERS
  =================================================== */

  function getTeam(
    side
  ) {

    const direct =
      match?.[side];

    const team =
      match?.[`${side}_team`] ||
      match?.[`${side}Team`] ||
      (
        direct &&
        typeof direct === "object"
          ? direct
          : null
      );

    const name =
      (
        typeof direct === "string"
          ? direct
          : null
      ) ||
      team?.name ||
      team?.title ||
      match?.[`${side}_name`] ||
      (
        side === "home"
          ? "Domicile"
          : "Extérieur"
      );

    const logo =
      match?.[`${side}_logo`] ||
      team?.logo ||
      team?.image ||
      "";

    const id =
      match?.[`${side}_id`] ||
      team?.id ||
      null;

    return {
      id,
      name,
      logo
    };
  }

  const home =
    getTeam("home");

  const away =
    getTeam("away");

  /* ===================================================
     SCORE
  =================================================== */

  const homeScore =
    match?.home_score ??
    match?.score?.home ??
    match?.homeScore ??
    null;

  const awayScore =
    match?.away_score ??
    match?.score?.away ??
    match?.awayScore ??
    null;

  /* ===================================================
     STATUS
  =================================================== */

  const rawStatus =
    String(
      match?.status ||
      match?.state ||
      match?.status_text ||
      ""
    ).toLowerCase();

  let shortStatus =
    match?.status_code ||
    match?.short_status ||
    "";

  if (!shortStatus) {

    if (
      rawStatus.includes("live") ||
      rawStatus.includes("in play") ||
      rawStatus.includes("inplay")
    ) {
      shortStatus = "LIVE";
    }

    else if (
      rawStatus.includes("half")
    ) {
      shortStatus = "HT";
    }

    else if (
      rawStatus.includes("finish") ||
      rawStatus.includes("ended") ||
      rawStatus === "ft"
    ) {
      shortStatus = "FT";
    }

    else if (
      rawStatus.includes("postpon")
    ) {
      shortStatus = "PST";
    }

    else if (
      rawStatus.includes("cancel")
    ) {
      shortStatus = "CANC";
    }

    else {
      shortStatus = "NS";
    }
  }

  /* ===================================================
     COMPETITION
  =================================================== */

  const competition =
    match?.competition ||
    match?.league ||
    {};

  const leagueName =
    typeof competition === "string"
      ? competition
      : (
          competition?.name ||
          competition?.title ||
          "Football"
        );

  const leagueId =
    competition?.id ||
    match?.competition_id ||
    match?.league_id ||
    null;

  const leagueCountry =
    competition?.country ||
    match?.country ||
    "";

  const leagueLogo =
    competition?.logo ||
    match?.competition_logo ||
    match?.league_logo ||
    "";

  /* ===================================================
     EVENTS / TIMELINE
  =================================================== */

  const rawEvents =
    root?.timeline ||
    root?.events ||
    root?.incidents ||
    [];

  const events =
    Array.isArray(rawEvents)
      ? rawEvents.map(event => {

          const team =
            event?.team ||
            {};

          const player =
            event?.player ||
            {};

          const assist =
            event?.assist ||
            {};

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
              event?.event_type ||
              "Other",

            detail:
              event?.detail ||
              event?.description ||
              event?.text ||
              event?.comments ||
              ""

          };

        })
      : [];

  /* ===================================================
     LINEUPS
  =================================================== */

  const rawLineups =
    root?.lineups ||
    root?.lineup ||
    [];

  const lineups =
    Array.isArray(rawLineups)
      ? rawLineups.map(lineup => {

          const team =
            lineup?.team ||
            {};

          const startXI =
            lineup?.startXI ||
            lineup?.startingXI ||
            lineup?.starting_xi ||
            lineup?.starters ||
            [];

          const substitutes =
            lineup?.substitutes ||
            lineup?.bench ||
            [];

          function normalizePlayer(
            item
          ) {

            const p =
              item?.player ||
              item ||
              {};

            return {

              player: {

                id:
                  p?.id ??
                  item?.player_id ??
                  null,

                name:
                  p?.name ||
                  item?.name ||
                  "Joueur",

                number:
                  p?.number ??
                  item?.number ??
                  item?.shirt_number ??
                  null,

                pos:
                  p?.pos ||
                  p?.position ||
                  item?.position ||
                  item?.pos ||
                  "",

                grid:
                  p?.grid ||
                  item?.grid ||
                  "",

                photo:
                  p?.photo ||
                  item?.photo ||
                  ""

              },

              rating:
                item?.rating ??
                item?.statistics?.rating ??
                null,

              games: {

                rating:
                  item?.rating ??
                  item?.statistics?.rating ??
                  null,

                minutes:
                  item?.minutes ??
                  item?.statistics?.minutes ??
                  null,

                position:
                  item?.position ||
                  item?.statistics?.position ||
                  p?.pos ||
                  "",

                substitute:
                  item?.substitute ??
                  false,

                captain:
                  item?.captain ??
                  false

              },

              goals:
                item?.goals ||
                item?.statistics?.goals ||
                {},

              cards:
                item?.cards ||
                item?.statistics?.cards ||
                {},

              passes:
                item?.passes ||
                item?.statistics?.passes ||
                {},

              shots:
                item?.shots ||
                item?.statistics?.shots ||
                {}

            };
          }

          return {

            team: {

              id:
                team?.id ??
                lineup?.team_id ??
                null,

              name:
                team?.name ||
                lineup?.team_name ||
                "",

              logo:
                team?.logo ||
                lineup?.team_logo ||
                ""

            },

            formation:
              lineup?.formation ||
              lineup?.tactics ||
              "—",

            coach:
              lineup?.coach ||
              lineup?.manager ||
              null,

            startXI:
              Array.isArray(startXI)
                ? startXI.map(
                    normalizePlayer
                  )
                : [],

            substitutes:
              Array.isArray(substitutes)
                ? substitutes.map(
                    normalizePlayer
                  )
                : []

          };

        })
      : [];

  /* ===================================================
     STATISTICS
  =================================================== */

  const statistics =
    root?.statistics ||
    root?.stats ||
    [];

  /* ===================================================
     PLAYER STATS
  =================================================== */

  const players =
    Array.isArray(
      root?.players
    )
      ? root.players
      : [];

  /* ===================================================
     FINAL RESPONSE
  =================================================== */

  return output(
    200,
    {

      fixture: {

        id:
          slug,

        slug:
          slug,

        upstreamId:
          match?.id ||
          match?.match_id ||
          null,

        date:
          match?.time ||
          match?.date ||
          match?.start_time ||
          null,

        timezone:
          match?.timezone ||
          "UTC",

        venue:
          match?.venue ||
          null,

        referee:
          match?.referee ||
          null,

        status: {

          short:
            shortStatus,

          long:
            match?.status_text ||
            match?.status ||
            "Match",

          elapsed:
            match?.minute ??
            match?.elapsed ??
            null

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
          leagueLogo

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

      },

      events,

      lineups,

      statistics,

      players,

      provider:
        "SportScore"

    }
  );
}
    return output(
      400,
      {
        error:
          "Invalid request"
      }
    );

  } catch (error) {

    console.error(
      "SPORTSCORE ERROR:",
      error
    );

    return output(
      error?.status || 500,
      {

        error:
          error?.message ||
          "SportScore request failed",

        provider:
          "SportScore",

        details:
          error?.data ||
          null,

        data: []

      }
    );
  }
};
