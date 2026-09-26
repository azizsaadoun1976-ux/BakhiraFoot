module.exports = async (req, res) => {
  try {
    const url = new URL("https://api.kickoffapi.com/api/v2/fixtures");

    if (req.query.live === "all") {
      url.searchParams.set("live", "all");
    } else if (req.query.date) {
      url.searchParams.set("date", req.query.date);
    }

    const response = await fetch(url, {
      headers: {
        "x-api-key": process.env.KICKOFF_API_KEY
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
