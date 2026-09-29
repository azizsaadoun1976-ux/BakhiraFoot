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

    if (fixture) {

      const slug =
        String(
          fixture
        ).trim();

      const body =
        await getJSON(
          `${BASE}/match/?sport=football&slug=${encodeURIComponent(
            slug
          )}`
        );

      const root =
        body?.data ||
        body?.match ||
        body;

      const match =
        root?.match ||
        root?.fixture ||
        root;

      const normalized =
        normalizeMatch(
          match
        );

      const events =
        root?.timeline ||
        root?.events ||
        root?.incidents ||
        [];

      const lineups =
        root?.lineups ||
        root?.lineup ||
        [];

      const statistics =
        root?.statistics ||
        root?.stats ||
        [];

      const players =
        root?.players ||
        [];

      return output(
        200,
        {

          fixture:
            normalized?.fixture ||
            {
              id: slug,
              slug: slug
            },

          league:
            normalized?.league ||
            {},

          teams:
            normalized?.teams ||
            {},

          goals:
            normalized?.goals ||
            {},

          score:
            normalized?.score ||
            {},

          events:
            Array.isArray(events)
              ? events
              : [],

          lineups:
            Array.isArray(lineups)
              ? lineups
              : [],

          statistics:
            Array.isArray(statistics)
              ? statistics
              : [],

          players:
            Array.isArray(players)
              ? players
              : [],

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
