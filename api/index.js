module.exports = async (req, res) => {
    try {

        const { live, date } = req.query;

        let url =
            "https://api.kickoffapi.com/api/v2/fixtures";

        // LIVE
        if (live === "all") {

            url += "?live=all";

        }
        // MATCHES BY DATE
        else {

            const matchDate =
                date ||
                new Date().toISOString().split("T")[0];

            url += `?date=${encodeURIComponent(matchDate)}`;
        }

        const response = await fetch(url, {
            headers: {
                "x-api-key":
                    process.env.KICKOFF_API_KEY
            }
        });

        const data =
            await response.json();

        res.status(response.status).json(data);

    } catch (error) {

        console.error("API ERROR:", error);

        res.status(500).json({
            error: error.message,
            data: []
        });
    }
};
