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
     * KICKOFF API HELPER
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
          `API ${i + 1} quota exhausted -> trying API ${i + 2}`
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
     * MATCH CENTER
     *
     * /api?fixture=fx_xxxxx&details=all
     * ==========================================
     */

    if (fixture && details === "all") {
      const base =
        `https://api.kickoffapi.com/api/v2/fixtures/${encodeURIComponent(
          fixture
        )}`;

      /*
       * Get all Match Center data directly from V2
       */

      const [
        fixtureResult,
        eventsResult,
        lineupsResult,
        statisticsResult,
        playersResult
      ] = await Promise.all([
        callAPI(base),
        callAPI(`${base}/events`),
        callAPI(`${base}/lineups`),
        callAPI(`${base}/statistics`),
        callAPI(`${base}/players`)
      ]);

      /*
       * If main fixture itself fails
       */

      if (!fixtureResult.ok) {
        return res
          .status(fixtureResult.status)
          .json(fixtureResult.data);
      }

      /*
       * Return everything
       */

const unwrapV2 = (result) => {

  if (!result?.ok) {
    return {
      data: [],
      meta: {
        status: result?.status || 0
      }
    };
  }

  const body = result.data;

  return {
    data:
      body?.data ??
      body?.response ??
      (Array.isArray(body) ? body : []),

    meta:
      body?.meta || {}
  };
};

const eventsPack =
  unwrapV2(eventsResult);

const lineupsPack =
  unwrapV2(lineupsResult);

const statisticsPack =
  unwrapV2(statisticsResult);

const playersPack =
  unwrapV2(playersResult);

return res.json({

  fixture:
    fixtureResult.data?.data ||
    fixtureResult.data,

  events:
    eventsPack.data,

  lineups:
    lineupsPack.data,

  statistics:
    statisticsPack.data,

  players:
    playersPack.data,

  apiStatus: {
    events: eventsResult.status,
    lineups: lineupsResult.status,
    statistics: statisticsResult.status,
    players: playersResult.status
  },

  apiMeta: {
    events: eventsPack.meta,
    lineups: lineupsPack.meta,
    statistics: statisticsPack.meta,
    players: playersPack.meta
  }

});
    }

    /*
     * ==========================================
     * NORMAL MATCH DETAILS
     *
     * /api?fixture=fx_xxxxx
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

    const result = await callAPI(url);

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
