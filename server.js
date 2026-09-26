const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: "*"
}));

app.use(express.json());

const headers = {
    "x-apisports-key": process.env.API_FOOTBALL_KEY
};

// ========================================
// MATCHES
// ========================================

app.get("/api/matches", async (req, res) => {

    try {

        const date =
            req.query.date ||
            new Date().toISOString().split("T")[0];

        const leagues = [
            39, 140, 61, 135, 78, 2
        ];

        let allMatches = [];

        for (const league of leagues) {

            const response = await fetch(
                `https://v3.football.api-sports.io/fixtures?league=${league}&date=${date}`,
                { headers }
            );

            const data = await response.json();

            if (data.response) {
                allMatches.push(...data.response);
            }
        }

        res.json({
            response: allMatches
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erreur API matches"
        });

    }

});

// ========================================
// LIVE
// ========================================

app.get("/api/live", async (req, res) => {

    try {

        const response = await fetch(
            "https://v3.football.api-sports.io/fixtures?live=all",
            { headers }
        );

        const data = await response.json();

        res.json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erreur API live"
        });

    }

});

// ========================================
// START
// ========================================

app.listen(PORT, () => {

    console.log(
        `BakhiraFoot Backend running on port ${PORT}`
    );

});
