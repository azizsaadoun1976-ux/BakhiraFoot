const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("."));

const KICKOFF_API =
    "https://api.kickoffapi.com/api/v2/fixtures";

const headers = {
    "x-api-key": process.env.KICKOFF_API_KEY
};

// ================================
// CACHE
// ================================

const matchesCache = new Map();

let liveCache = {
    data: [],
    time: 0
};

const MATCH_CACHE_TIME = 5 * 60 * 1000;
const LIVE_CACHE_TIME = 60 * 1000;

// ================================
// HOME
// ================================

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// ================================
// MATCHES BY DATE
// ================================

app.get("/api/matches", async (req, res) => {
    try {

        const date =
            req.query.date ||
            new Date().toISOString().split("T")[0];

        const now = Date.now();
        const cached = matchesCache.get(date);

        if (
            cached &&
            now - cached.time < MATCH_CACHE_TIME
        ) {
            console.log(`CACHE MATCHES: ${date}`);

            return res.json({
                data: cached.data,
                cached: true
            });
        }

        console.log(`KICKOFF API MATCHES: ${date}`);

        const response = await fetch(
            `${KICKOFF_API}?date=${date}`,
            {
                headers
            }
        );

        const data = await response.json();

        if (data.error) {

            console.error(
                "KICKOFF ERROR:",
                data.error
            );

            return res.status(500).json({
                error: data.error,
                data: []
            });
        }

        const matches = data.data || [];

        console.log(
            `MATCHES FOUND: ${matches.length}`
        );

        matchesCache.set(date, {
            data: matches,
            time: Date.now()
        });

        res.json({
            data: matches,
            cached: false
        });

    }
    catch (error) {

        console.error(
            "MATCHES ERROR:",
            error
        );

        res.status(500).json({
            error: error.message,
            data: []
        });
    }
});

// ================================
// LIVE MATCHES
// ================================

app.get("/api/live", async (req, res) => {
    try {

        const now = Date.now();

        if (
            liveCache.time &&
            now - liveCache.time < LIVE_CACHE_TIME
        ) {

            console.log("CACHE LIVE");

            return res.json({
                data: liveCache.data,
                cached: true
            });
        }

        console.log("KICKOFF API LIVE");

        const response = await fetch(
            `${KICKOFF_API}?live=all`,
            {
                headers
            }
        );

        const data = await response.json();

        if (data.error) {

            console.error(
                "KICKOFF LIVE ERROR:",
                data.error
            );

            return res.status(500).json({
                error: data.error,
                data: []
            });
        }

        const matches = data.data || [];

        console.log(
            `LIVE MATCHES: ${matches.length}`
        );

        liveCache = {
            data: matches,
            time: Date.now()
        };

        res.json({
            data: matches,
            cached: false
        });

    }
    catch (error) {

        console.error(
            "LIVE ERROR:",
            error
        );

        res.status(500).json({
            error: error.message,
            data: []
        });
    }
});

// ================================
// TEST SERVER
// ================================

app.get("/api/test", (req, res) => {

    res.json({
        status: "ok",
        service: "BakhiraFoot",
        api: "KickoffAPI",
        cache: "active"
    });

});

// ================================
// TEST KICKOFF API
// ================================

app.get("/api/test-api", async (req, res) => {

    try {

        const response = await fetch(
            `${KICKOFF_API}?live=all`,
            {
                headers
            }
        );

        const data =
            await response.json();

        res.json(data);

    }
    catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});

// ================================
// CACHE INFO
// ================================

app.get("/api/cache", (req, res) => {

    const matches = {};

    for (
        const [date, value]
        of matchesCache
    ) {

        matches[date] = {

            age:
                Math.round(
                    (Date.now() - value.time) / 1000
                ) + " seconds",

            matches:
                value.data.length
        };
    }

    res.json({

        matches,

        live: {

            age: liveCache.time
                ? Math.round(
                    (Date.now() - liveCache.time) / 1000
                ) + " seconds"
                : null,

            matches:
                liveCache.data.length
        }

    });

});

// ================================
// START SERVER
// ================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `BakhiraFoot running on http://localhost:${PORT}`
        );

    }
);
