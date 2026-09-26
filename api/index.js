module.exports = async (req, res) => {
  try {
    const path = req.url.split("?")[0];

    let url =
      "https://api.kickoffapi.com/api/v2/fixtures";

    if (path === "/api/live") {
      url += "?live=all";
    } else {
      const date =
        new URL(req.url, "http://localhost").searchParams.get("date") ||
        new Date().toISOString().split("T")[0];

      url += `?date=${date}`;
    }

    const response = await fetch(url, {
      headers: {
        "x-api-key": process.env.KICKOFF_API_KEY
      }
    });

    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
