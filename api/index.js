module.exports = async (req, res) => {
  try {
    const response = await fetch(
      "https://api.kickoffapi.com/v2/live",
      {
        headers: {
          "x-api-key": process.env.KICKOFF_API_KEY
        }
      }
    );

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
