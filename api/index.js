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
     * HELPER — CALL KICKOFF API WITH FALLBACK
     * ==========================================
     */

    async function callAPI(url) {
      let lastResponse = null;
      let lastData = null;

      for (let i = 0; i < apiKeys.length; i++) {
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
          `API ${i + 1} quota exhausted → trying API ${i + 2}`
        );
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
     * MATCH DETAILS
     *
     * /api?fixture=fx_xxxxx
     * ==========================================
     */

    if (fixture && !details) {
      const url =
        `https://api.kickoffapi.com/api/v2/fixtures/${encodeURIComponent(fixture)}`;

      const result = await callAPI(url);

      return res
        .status(result.status)
        .json(result.data);
    }

    /*
     * ==========================================
     * ADVANCED MATCH CENTER
     *
     * /api?fixture=fx_xxxxx&details=all
     *
     * V2 fixture -> find corresponding V1
     * fixture -> get events / lineups /
     * statistics / players
     * ==========================================
     */

    if (fixture && details === "all") {

      /*
       * 1. Get the V2 fixture
       */

      const fixtureUrl =
        `https://api.kickoffapi.com/api/v2/fixtures/${encodeURIComponent(fixture)}`;

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
        v2Fixture?.home?.name ||
        "";

      const awayName =
        v2Fixture?.away?.name ||
        "";

      const matchDate =
        v2Fixture?.date ||
        "";

      if (!homeName || !awayName || !matchDate) {
        return res.status(404).json({
          error:
            "Could not read the V2 fixture information.",
          fixture
        });
      }

      /*
       * 2. Get V1 fixtures for the same date
       */

      const dateOnly =
        matchDate.split("T")[0];

      const v1FixturesUrl =
        `https://api.kickoffapi.com/api/v1/fixtures?date=${encodeURIComponent(dateOnly)}`;

      const v1FixturesResult =
        await callAPI(v1FixturesUrl);

      if (!v1FixturesResult.ok) {
        return res
          .status(v1FixturesResult.status)
          .json(v1FixturesResult.data);
      }

      const v1Fixtures =
        v1FixturesResult.data?.response || [];

      /*
       * 3. Find the same match
       */

      const normalizeName = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      const targetHome =
        normalizeName(homeName);

      const targetAway =
        normalizeName(awayName);

      const matchingFixture =
        v1Fixtures.find(item => {

          const v1Home =
            normalizeName(
              item?.teams?.home?.name
            );

          const v1Away =
            normalizeName(
              item?.teams?.away?.name
            );

          return (
            v1Home === targetHome &&
            v1Away === targetAway
          );
        });

      if (!matchingFixture) {
        return res.status(404).json({
          error:
            "Matching V1 fixture not found.",
          v2Fixture: {
            id: fixture,
            home: homeName,
            away: awayName,
            date: matchDate
          }
        });
      }

      const v1FixtureId =
        matchingFixture?.fixture?.id;

      if (!v1FixtureId) {
        return res.status(404).json({
          error:
            "V1 fixture ID not found."
        });
      }

      /*
       * 4. Get all advanced information
       */

      const base =
        "https://api.kickoffapi.com/api/v1/fixtures";

      const eventsUrl =
        `${base}/events?fixture=${encodeURIComponent(v1FixtureId)}`;

      const lineupsUrl =
        `${base}/lineups?fixture=${encodeURIComponent(v1FixtureId)}`;

      const statisticsUrl =
        `${base}/statistics?fixture=${encodeURIComponent(v1FixtureId)}`;

      const playersUrl =
        `${base}/players?fixture=${encodeURIComponent(v1FixtureId)}`;

      /*
       * Run the four requests in parallel.
       */

      const [
        eventsResult,
        lineupsResult,
        statisticsResult,
        playersResult
      ] = await Promise.all([
        callAPI(eventsUrl),
        callAPI(lineupsUrl),
        callAPI(statisticsUrl),
        callAPI(playersUrl)
      ]);

      /*
       * 5. Return everything together
       */

      return res.json({
        fixture: v2Fixture,

        legacyFixtureId: v1FixtureId,

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
