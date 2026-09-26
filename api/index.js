module.exports = async (req, res) => {
  try {
    const response = await fetch(
      "https://api.kickoffapi.com/api/v2/fixtures?live=all",
      {
        headers: {
          "x-api-key": process.env.KICKOFF_API_KEY
        }
      }
    );

    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
