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

      const slug =
        item.slug ||
        item.match_slug ||
        null;

      const id =
        slug ||
        item.id ||
        item.match_id ||
        item.fixture_id ||
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
       MATCH DETAILS
    ===================================================== */

/* =====================================================
   MATCH DETAILS - SPORTSCORE
===================================================== */

if (fixture) {

  const slug =
    String(fixture).trim();

  if (!slug) {
    return sendJSON(
      400,
      {
        error:
          "Match slug manquant",
        data: []
      }
    );
  }

  console.log(
    "MATCH DETAILS SLUG:",
    slug
  );

  const body =
    await getJSON(
      `${BASE}/match/?sport=football&slug=${encodeURIComponent(
        slug
      )}`
    );

  /*
   * SportScore match endpoint can return
   * the match object inside different envelopes.
   */

  const root =
    body?.data ||
    body?.match ||
    body;

  const match =
    root?.match ||
    root?.fixture ||
    root;

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

  return sendJSON(
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
