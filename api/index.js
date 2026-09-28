module.exports = async (req, res) => {
  try {
    const {
      live,
      date,
      fixture,
      details
    } = req.query;

    const apiKeys = [
      process.env.KICKOFF_API_KEY,
      process.env.KICKOFF_API_KEY_2,
      process.env.KICKOFF_API_KEY_3,
      process.env.KICKOFF_API_KEY_4,
      process.env.KICKOFF_API_KEY_5
    ].filter(Boolean);

    if (!apiKeys.length) {
      return res.status(500).json({
        error: "No KickoffAPI keys configured."
      });
    }

    /*
     * ==========================================
     * API HELPER
     * ==========================================
     */

    async function callAPI(url) {
      let lastResponse = null;
      let lastData = null;

      for (let i = 0; i < apiKeys.length; i++) {
        try {
          const response = await fetch(url, {
            headers: {
              "x-api-key": apiKeys[i]
            }
          });

          const data = await response.json();

          lastResponse = response;
          lastData = data;

          if (response.ok) {
            return {
              ok: true,
              status: response.status,
              data
            };
          }

          const quotaFinished =
            data?.code ===
            "FREE_ALLOWANCE_AND_CREDITS_EXHAUSTED";

          if (!quotaFinished) {
            return {
              ok: false,
              status: response.status,
              data
            };
          }

          console.log(
            `API ${i + 1} quota exhausted -> trying API ${i + 2}`
          );

        } catch (error) {
          lastData = {
            error: error.message
          };
        }
      }

      return {
        ok: false,
        status: lastResponse?.status || 429,
        data:
          lastData || {
            error:
              "All KickoffAPI keys have exhausted their quota."
          }
      };
    }

    /*
     * ==========================================
     * NORMAL V2 FIXTURE DETAILS
     * ==========================================
     */

    if (fixture && !details) {
      const url =
        `https://api.kickoffapi.com/api/v2/fixtures/${encodeURIComponent(
          fixture
        )}`;

      const result = await callAPI(url);

      return res
        .status(result.status)
        .json(result.data);
    }

    /*
     * ==========================================
     * MATCH CENTER
     *
     * /api?fixture=fx_xxxxx&details=all
     * ==========================================
     */

    if (fixture && details === "all") {

      /*
       * 1. Get V2 fixture
       */

      const fixtureUrl =
        `https://api.kickoffapi.com/api/v2/fixtures/${encodeURIComponent(
          fixture
        )}`;

      const fixtureResult =
        await callAPI(fixtureUrl);

      if (!fixtureResult.ok) {
        return res
          .status(fixtureResult.status)
          .json(fixtureResult.data);
      }

      const v2Fixture =
        fixtureResult.data?.data ||
        fixtureResult.data;

      const homeName =
        v2Fixture?.home?.name || "";

      const awayName =
        v2Fixture?.away?.name || "";

      const leagueName =
        v2Fixture?.league?.name || "";

      const season =
        v2Fixture?.league?.season ||
        new Date(
          v2Fixture?.date || Date.now()
        ).getUTCFullYear();

      const matchDate =
        v2Fixture?.date || "";

      if (
        !homeName ||
        !awayName ||
        !leagueName
      ) {
        return res.status(404).json({
          error:
            "V2 fixture information is incomplete.",
          fixture,
          v2Fixture
        });
      }

      /*
       * 2. Find V1 league using its name
       */

      const leagueSearchUrl =
        `https://api.kickoffapi.com/api/v1/leagues?search=${encodeURIComponent(
          leagueName
        )}`;

      const leagueSearchResult =
        await callAPI(leagueSearchUrl);

      if (!leagueSearchResult.ok) {
        return res
          .status(leagueSearchResult.status)
          .json(leagueSearchResult.data);
      }

      const leagues =
        leagueSearchResult.data?.response || [];

      const normalizeName = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .replace(/\s+/g, " ")
          .trim();

      const targetLeague =
        normalizeName(leagueName);

      let matchingLeague =
        leagues.find(league => {
          const name =
            normalizeName(
              league?.league?.name ||
              league?.name
            );

          return name === targetLeague;
        });

      if (!matchingLeague) {
        matchingLeague = leagues.find(league => {
          const name =
            normalizeName(
              league?.league?.name ||
              league?.name
            );

          return (
            name.includes(targetLeague) ||
            targetLeague.includes(name)
          );
        });
      }

      if (!matchingLeague) {
        return res.status(404).json({
          error:
            "V1 league not found.",
          v2League: leagueName,
          searchedLeagues:
            leagues.map(item =>
              item?.league?.name ||
              item?.name ||
              null
            )
        });
      }

      const legacyLeagueId =
        matchingLeague?.league?.id ||
        matchingLeague?.id;

      if (!legacyLeagueId) {
        return res.status(404).json({
          error:
            "V1 league ID not found.",
          matchingLeague
        });
      }

      /*
       * 3. Get V1 fixtures from league + season
       */

      const v1FixturesUrl =
        `https://api.kickoffapi.com/api/v1/fixtures` +
        `?league=${encodeURIComponent(legacyLeagueId)}` +
        `&season=${encodeURIComponent(season)}`;

      const v1FixturesResult =
        await callAPI(v1FixturesUrl);

      if (!v1FixturesResult.ok) {
        return res
          .status(v1FixturesResult.status)
          .json(v1FixturesResult.data);
      }

      const v1Fixtures =
        v1FixturesResult.data?.response || [];

      const targetHome =
        normalizeName(homeName);

      const targetAway =
        normalizeName(awayName);

      const targetDate =
        matchDate
          ? matchDate.split("T")[0]
          : "";

      /*
       * 4. Find exact fixture
       */

      let matchingFixture =
        v1Fixtures.find(item => {

          const home =
            normalizeName(
              item?.teams?.home?.name
            );

          const away =
            normalizeName(
              item?.teams?.away?.name
            );

          const itemDate =
            item?.fixture?.date
              ? item.fixture.date.split("T")[0]
              : "";

          return (
            home === targetHome &&
            away === targetAway &&
            itemDate === targetDate
          );
        });

      /*
       * If date differs, try teams only
       */

      if (!matchingFixture) {
        matchingFixture =
          v1Fixtures.find(item => {

            const home =
              normalizeName(
                item?.teams?.home?.name
              );

            const away =
              normalizeName(
                item?.teams?.away?.name
              );

            return (
              home === targetHome &&
              away === targetAway
            );
          });
      }

      /*
       * 5. If still missing, use V1 teams
       */

      if (!matchingFixture) {

        const homeTeamUrl =
          `https://api.kickoffapi.com/api/v1/teams?search=${encodeURIComponent(
            homeName
          )}`;

        const awayTeamUrl =
          `https://api.kickoffapi.com/api/v1/teams?search=${encodeURIComponent(
            awayName
          )}`;

        const [
          homeTeamResult,
          awayTeamResult
        ] = await Promise.all([
          callAPI(homeTeamUrl),
          callAPI(awayTeamUrl)
        ]);

        const homeTeams =
          homeTeamResult.ok
            ? homeTeamResult.data?.response || []
            : [];

        const awayTeams =
          awayTeamResult.ok
            ? awayTeamResult.data?.response || []
            : [];

        const homeTeam =
          homeTeams.find(team =>
            normalizeName(
              team?.team?.name ||
              team?.name
            ) === targetHome
          );

        const awayTeam =
          awayTeams.find(team =>
            normalizeName(
              team?.team?.name ||
              team?.name
            ) === targetAway
          );

        const homeLegacyId =
          homeTeam?.team?.id ||
          homeTeam?.id;

        const awayLegacyId =
          awayTeam?.team?.id ||
          awayTeam?.id;

        /*
         * Try home team fixtures
         */

        if (homeLegacyId) {

          const teamFixturesUrl =
            `https://api.kickoffapi.com/api/v1/fixtures` +
            `?team=${encodeURIComponent(homeLegacyId)}` +
            `&season=${encodeURIComponent(season)}`;

          const teamFixturesResult =
            await callAPI(teamFixturesUrl);

          if (teamFixturesResult.ok) {

            const teamFixtures =
              teamFixturesResult.data?.response || [];

            matchingFixture =
              teamFixtures.find(item => {

                const home =
                  normalizeName(
                    item?.teams?.home?.name
                  );

                const away =
                  normalizeName(
                    item?.teams?.away?.name
                  );

                return (
                  home === targetHome &&
                  away === targetAway
                );
              });
          }
        }

        /*
         * Keep awayLegacyId in response only for debugging
         */

        if (!matchingFixture) {
          return res.status(404).json({
            error:
              "V1 fixture not found.",
            v2Fixture: {
              id: fixture,
              home: homeName,
              away: awayName,
              league: leagueName,
              season
            },
            v1League: {
              id: legacyLeagueId,
              name:
                matchingLeague?.league?.name ||
                matchingLeague?.name ||
                leagueName
            },
            v1Teams: {
              home: homeLegacyId || null,
              away: awayLegacyId || null
            },
            v1FixturesChecked:
              v1Fixtures.length
          });
        }
      }

      const v1FixtureId =
        matchingFixture?.fixture?.id;

      if (!v1FixtureId) {
        return res.status(404).json({
          error:
            "V1 fixture ID not found.",
          matchingFixture
        });
      }

      /*
       * 6. Advanced V1 endpoints
       */

      const base =
        "https://api.kickoffapi.com/api/v1/fixtures";

      const [
        eventsResult,
        lineupsResult,
        statisticsResult,
        playersResult
      ] = await Promise.all([

        callAPI(
          `${base}/events?fixture=${encodeURIComponent(
            v1FixtureId
          )}`
        ),

        callAPI(
          `${base}/lineups?fixture=${encodeURIComponent(
            v1FixtureId
          )}`
        ),

        callAPI(
          `${base}/statistics?fixture=${encodeURIComponent(
            v1FixtureId
          )}`
        ),

        callAPI(
          `${base}/players?fixture=${encodeURIComponent(
            v1FixtureId
          )}`
        )
      ]);

      /*
       * 7. Return Match Center data
       */

      return res.json({
        fixture: v2Fixture,

        legacyFixtureId:
          v1FixtureId,

        events:
          eventsResult.ok
            ? eventsResult.data?.response || []
            : [],

        lineups:
          lineupsResult.ok
            ? lineupsResult.data?.response || []
            : [],

        statistics:
          statisticsResult.ok
            ? statisticsResult.data?.response || []
            : [],

        players:
          playersResult.ok
            ? playersResult.data?.response || []
            : [],

        apiStatus: {
          events: eventsResult.status,
          lineups: lineupsResult.status,
          statistics: statisticsResult.status,
          players: playersResult.status
        }
      });
    }

    /*
     * ==========================================
     * LIVE / DATE FIXTURES
     * ==========================================
     */

    let url =
      "https://api.kickoffapi.com/api/v2/fixtures";

    if (live === "all") {
      url += "?live=all";
    } else {

      const matchDate =
        date ||
        new Date()
          .toISOString()
          .split("T")[0];

      url +=
        `?date=${encodeURIComponent(matchDate)}`;
    }

    const result =
      await callAPI(url);

    return res
      .status(result.status)
      .json(result.data);

  } catch (error) {

    console.error(
      "KICKOFF API ERROR:",
      error
    );

    return res.status(500).json({
      error: error.message,
      data: []
    });
  }
};
