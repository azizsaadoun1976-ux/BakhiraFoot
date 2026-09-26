const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("."));

const headers = {
    "x-apisports-key": process.env.API_FOOTBALL_KEY
};

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/api/matches", async (req, res) => {
    try {
        const date =
            req.query.date ||
            new Date().toISOString().split("T")[0];

        const response = await fetch(
            `https://v3.football.api-sports.io/fixtures?date=${date}`,
            { headers }
        );

        const data = await response.json();

        console.log("API MATCHES:", JSON.stringify(data));

        res.json({
            results: data.results,
            errors: data.errors,
            response: data.response
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

app.get("/api/live", async (req, res) => {
    try {
        const response = await fetch(
            "https://v3.football.api-sports.io/fixtures?live=all",
            { headers }
        );

        const data = await response.json();

        console.log("API LIVE:", JSON.stringify(data));

        res.json({
            results: data.results,
            errors: data.errors,
            response: data.response
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

app.get("/api/test", (req, res) => {
    res.json({
        status: "ok"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`BakhiraFoot running on port ${PORT}`);
});
