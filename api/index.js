module.exports = async (req, res) => {
    try {
        const { live, date } = req.query;

        let url = "https://v3.football.api-sports.io/fixtures";

        // LIVE MATCHES
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
                "x-apisports-key": process.env.API_FOOTBALL_KEY
            }
        });

        const data = await response.json();

        // API-Football error
        if (!response.ok) {
            return res.status(response.status).json({
                error: data?.errors || "API-Football error",
                data: []
            });
        }

        // Keep the same format expected by BakhiraFoot
        return res.status(200).json({
            data: data.response || []
        });

    } catch (error) {
        console.error("API FOOTBALL ERROR:", error);

        return res.status(500).json({
            error: error.message,
            data: []
        });
    }
};
