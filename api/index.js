export default async function handler(req, res) {
    try {
        const response = await fetch(
            "https://v3.football.api-sports.io/fixtures?date=" +
            new Date().toISOString().split("T")[0],
            {
                headers: {
                    "x-apisports-key": process.env.API_FOOTBALL_KEY
                }
            }
        );

        const data = await response.json();

        res.status(200).json(data);

    } catch (error) {

        res.status(500).json({
            error: error.message,
            cause: error.cause?.message || null
        });

    }
}
