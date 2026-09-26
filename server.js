const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

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
// MATCHES
// ================================

app.get("/api/matches", async (req, res) => {
    try {
        const date =
            req.query.date ||
            new Date().toISOString().split("T")[0];

        const cached = matchesCache.get(date);

        if (
            cached &&
            Date.now() - cached.time < MATCH_CACHE_TIME
        ) {
            return res.json({
                data: cached.data,
                cached: true
            });
        }

        const response = await fetch(
            `${KICKOFF_API}?date=${date}`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(
                `KickoffAPI HTTP ${response.status}`
            );
        }

        const result = await response.json();

        const matches = result.data || [];

        matchesCache.set(date, {
            data: matches,
            time: Date.now()
        });

        res.json({
            data: matches,
            cached: false
        });

    } catch (error) {

        console.error("MATCHES ERROR:", error);

        res.status(500).json({
            error: error.message,
            data: []
        });
    }
});

// ================================
// LIVE
// ================================

app.get("/api/live", async (req, res) => {
    try {

        if (
            liveCache.time &&
            Date.now() - liveCache.time < LIVE_CACHE_TIME
        ) {
            return res.json({
                data: liveCache.data,
                cached: true
            });
        }

        console.log("Fetching LIVE from KickoffAPI");

        const response = await fetch(
            `${KICKOFF_API}?live=all`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(
                `KickoffAPI HTTP ${response.status}`
            );
        }

        const result = await response.json();

        const matches = result.data || [];

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

    } catch (error) {

        console.error("LIVE ERROR:", error);

        res.status(500).json({
            error: error.message,
            data: []
        });
    }
});

// ================================
// TEST
// ================================

app.get("/api/test", (req, res) => {
    res.json({
        status: "ok",
        service: "BakhiraFoot",
        api: "KickoffAPI"
    });
});

// ================================
// TEST KICKOFF API
// ================================

app.get("/api/test-api", async (req, res) => {
    try {

        const response = await fetch(
            `${KICKOFF_API}?live=all`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(
                `KickoffAPI HTTP ${response.status}`
            );
        }

        const data = await response.json();

        res.json(data);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
});

// ================================
// VERCEL
// ================================

module.exports = app;
