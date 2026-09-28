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

    /*
     * ==========================================
     * ADVANCED MATCH DETAILS — V1
     * events / lineups / statistics / players
     * ==========================================
     */

    if (fixture && details) {

      const allowedDetails = [
        "events",
        "lineups",
        "statistics",
        "players"
      ];

      if (!allowedDetails.includes(details)) {
        return res.status(400).json({
          error: "Invalid details type."
        });
      }

      const url =
        `https://api.kickoffapi.com/api/v1/fixtures/${details}?fixture=${encodeURIComponent(fixture)}`;

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
          return res
            .status(response.status)
            .json(data);
        }

        const quotaFinished =
          data?.code ===
          "FREE_ALLOWANCE_AND_CREDITS_EXHAUSTED";

        if (!quotaFinished) {
          return res
            .status(response.status)
            .json(data);
        }

        console.log(
          `API ${i + 1} quota exhausted → trying API ${i + 2}`
        );
      }

      return res
        .status(lastResponse?.status || 429)
        .json(
          lastData || {
            error:
              "All KickoffAPI keys have exhausted their quota."
          }
        );
    }


    /*
     * ==========================================
     * MATCH DETAILS
     * /api?fixture=fx_xxxxx
     * ==========================================
     */

    if (fixture) {
      const url =
        `https://api.kickoffapi.com/api/v2/fixtures/${encodeURIComponent(fixture)}`;

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

        // API خدامة
        if (response.ok) {
          return res
            .status(response.status)
            .json(data);
        }

        // غير quota اللي كتخليونا ندوزو للـAPI التالية
        const quotaFinished =
          data?.code ===
          "FREE_ALLOWANCE_AND_CREDITS_EXHAUSTED";

        if (!quotaFinished) {
          return res
            .status(response.status)
            .json(data);
        }

        console.log(
          `API ${i + 1} quota exhausted → trying API ${i + 2}`
        );
      }

      return res
        .status(lastResponse?.status || 429)
        .json(
          lastData || {
            error:
              "All KickoffAPI keys have exhausted their quota."
          }
        );
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

      // API خدامة
      if (response.ok) {
        return res
          .status(response.status)
          .json(data);
      }

      // quota سالات
      const quotaFinished =
        data?.code ===
        "FREE_ALLOWANCE_AND_CREDITS_EXHAUSTED";

      // أي error آخر → ما ندوزوش للـAPI التالية
      if (!quotaFinished) {
        return res
          .status(response.status)
          .json(data);
      }

      console.log(
        `API ${i + 1} quota exhausted → trying API ${i + 2}`
      );
    }

    // جميع API keys سالاو
    return res
      .status(lastResponse?.status || 429)
      .json(
        lastData || {
          error:
            "All KickoffAPI keys have exhausted their quota."
        }
      );

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
