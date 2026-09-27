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

        const response = await fetch(url, {
            headers: {
                "x-api-key": process.env.KICKOFF_API_KEY
            }
        });

        const data = await response.json();

        return res.status(response.status).json(data);

    } catch (error) {
        console.error("KICKOFF API ERROR:", error);

        return res.status(500).json({
            error: error.message,
            data: []
        });
    }
};
