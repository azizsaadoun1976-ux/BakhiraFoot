const https = require("https");

module.exports = (req, res) => {

    const options = {
        hostname: "v3.football.api-sports.io",
        path: "/status",
        method: "GET",
        headers: {
            "x-apisports-key":
                process.env.API_FOOTBALL_KEY
        }
    };

    const request = https.request(
        options,
        response => {

            let data = "";

            response.on(
                "data",
                chunk => {
                    data += chunk;
                }
            );

            response.on(
                "end",
                () => {

                    res.status(
                        response.statusCode || 200
                    ).json(
                        JSON.parse(data)
                    );

                }
            );

        }
    );

    request.on(
        "error",
        error => {

            res.status(500).json({
                error: error.message
            });

        }
    );

    request.end();
};
