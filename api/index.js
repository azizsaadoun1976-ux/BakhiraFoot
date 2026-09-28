module.exports = async (req, res) => {
  try {
    const { live, date } = req.query;

    let url = "https://api.kickoffapi.com/api/v2/fixtures";

    if (live === "all") {
      url += "?live=all";
    } else {
      const matchDate =
        date ||
        new Date().toISOString().split("T")[0];

      url += `?date=${encodeURIComponent(matchDate)}`;
    }

    const apiKeys = [
      process.env.KICKOFF_API_KEY,
      process.env.KICKOFF_API_KEY_2,
      process.env.KICKOFF_API_KEY_3,
      process.env.KICKOFF_API_KEY_4,
      process.env.KICKOFF_API_KEY_5
    ].filter(Boolean);

    let lastResponse = null;
    let lastData = null;

    for (let i = 0; i < apiKeys.length; i++) {
      const key = apiKeys[i];

      const response = await fetch(url, {
        headers: {
          "x-api-key": key
        }
      });

      const data = await response.json();

      lastResponse = response;
      lastData = data;

      // API خدامة
      if (response.ok) {
        return res.status(response.status).json(data);
      }

      // نشوفو واش quota سالات
      const quotaFinished =
        data?.code === "FREE_ALLOWANCE_AND_CREDITS_EXHAUSTED";

      // إلا ماشي quota → نوقفو هنا
      if (!quotaFinished) {
        return res.status(response.status).json(data);
      }

      console.log(
        `API ${i + 1} quota exhausted → trying API ${i + 2}`
      );
    }

    // جميع الـAPI سالاو quota
    return res.status(lastResponse?.status || 429).json(
      lastData || {
        error: "All KickoffAPI keys have exhausted their quota."
      }
    );

  } catch (error) {
    console.error("KICKOFF API ERROR:", error);

    return res.status(500).json({
      error: error.message,
      data: []
    });
  }
};
