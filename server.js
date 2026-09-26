const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static("."));

const headers = {
    "x-apisports-key": process.env.API_FOOTBALL_KEY
};


// ========================================
// CACHE
// ========================================

const matchesCache = new Map();

let liveCache = {
    data: [],
    time: 0
};


// مدة cache ديال مباريات التاريخ
// 5 دقائق
const MATCH_CACHE_TIME = 5 * 60 * 1000;


// مدة cache ديال live
// دقيقة وحدة
const LIVE_CACHE_TIME = 60 * 1000;


// ========================================
// API STATUS
// ========================================

let apiBlockedUntil = 0;


// إلا وصلنا للـquota
// ما نعاودوش نضربو API لمدة 10 دقائق
const BLOCK_TIME = 10 * 60 * 1000;


// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});


// ========================================
// MATCHES
// ========================================

app.get("/api/matches", async (req, res) => {

    try {

        const date =
            req.query.date ||
            new Date().toISOString().split("T")[0];


        // --------------------------------
        // CACHE
        // --------------------------------

        const cached =
            matchesCache.get(date);

        const now = Date.now();


        if (
            cached &&
            now - cached.time < MATCH_CACHE_TIME
        ) {

            console.log(
                `CACHE MATCHES: ${date}`
            );

            return res.json({
                results: cached.data.length,
                errors: {},
                response: cached.data,
                cached: true
            });
        }


        // --------------------------------
        // API BLOCK
        // --------------------------------

        if (now < apiBlockedUntil) {

            console.log(
                "API temporairement bloquée بسبب quota"
            );

            if (cached) {

                return res.json({
                    results: cached.data.length,
                    errors: {
                        requests:
                            "API temporairement en cache"
                    },
                    response: cached.data,
                    cached: true
                });

            }

            return res.json({
                results: 0,
                errors: {
                    requests:
                        "API temporairement indisponible"
                },
                response: []
            });
        }


        // --------------------------------
        // API REQUEST
        // --------------------------------

        console.log(
            `API REQUEST MATCHES: ${date}`
        );


        const response = await fetch(
            `https://v3.football.api-sports.io/fixtures?date=${date}`,
            {
                headers
            }
        );


        const data =
            await response.json();


        console.log(
            "API MATCHES:",
            data.results,
            data.errors
        );


        // --------------------------------
        // QUOTA ERROR
        // --------------------------------

        if (
            data.errors &&
            data.errors.requests
        ) {

            const errorText =
                String(data.errors.requests)
                    .toLowerCase();


            if (
                errorText.includes("limit") ||
                errorText.includes("quota") ||
                errorText.includes("reached")
            ) {

                apiBlockedUntil =
                    Date.now() + BLOCK_TIME;

                console.log(
                    "API quota atteinte."
                );
            }


            // إذا عندنا cache قديم
            if (cached) {

                return res.json({
                    results: cached.data.length,
                    errors: data.errors,
                    response: cached.data,
                    cached: true
                });
            }


            return res.json({
                results: 0,
                errors: data.errors,
                response: []
            });
        }


        // --------------------------------
        // SAVE CACHE
        // --------------------------------

        const matches =
            data.response || [];


        matchesCache.set(date, {
            data: matches,
            time: Date.now()
        });


        // --------------------------------
        // RESPONSE
        // --------------------------------

        res.json({
            results: matches.length,
            errors: data.errors || {},
            response: matches,
            cached: false
        });


    }
    catch (error) {

        console.error(
            "MATCHES ERROR:",
            error
        );


        res.status(500).json({
            results: 0,
            errors: {
                server: error.message
            },
            response: []
        });

    }

});


// ========================================
// LIVE
// ========================================

app.get("/api/live", async (req, res) => {

    try {

        const now =
            Date.now();


        // --------------------------------
        // LIVE CACHE
        // --------------------------------

        if (
            now - liveCache.time <
            LIVE_CACHE_TIME
        ) {

            console.log(
                "CACHE LIVE"
            );

            return res.json({
                results:
                    liveCache.data.length,

                errors: {},

                response:
                    liveCache.data,

                cached: true
            });
        }


        // --------------------------------
        // API BLOCK
        // --------------------------------

        if (now < apiBlockedUntil) {

            return res.json({
                results:
                    liveCache.data.length,

                errors: {
                    requests:
                        "API temporairement en cache"
                },

                response:
                    liveCache.data,

                cached: true
            });
        }


        // --------------------------------
        // API REQUEST
        // --------------------------------

        console.log(
            "API REQUEST LIVE"
        );


        const response = await fetch(
            "https://v3.football.api-sports.io/fixtures?live=all",
            {
                headers
            }
        );


        const data =
            await response.json();


        console.log(
            "API LIVE:",
            data.results,
            data.errors
        );


        // --------------------------------
        // QUOTA ERROR
        // --------------------------------

        if (
            data.errors &&
            data.errors.requests
        ) {

            const errorText =
                String(data.errors.requests)
                    .toLowerCase();


            if (
                errorText.includes("limit") ||
                errorText.includes("quota") ||
                errorText.includes("reached")
            ) {

                apiBlockedUntil =
                    Date.now() + BLOCK_TIME;

                console.log(
                    "API LIVE quota atteinte."
                );
            }


            return res.json({
                results:
                    liveCache.data.length,

                errors:
                    data.errors,

                response:
                    liveCache.data,

                cached: true
            });
        }


        // --------------------------------
        // SAVE LIVE CACHE
        // --------------------------------

        const matches =
            data.response || [];


        liveCache = {
            data: matches,
            time: Date.now()
        };


        // --------------------------------
        // RESPONSE
        // --------------------------------

        res.json({

            results:
                matches.length,

            errors:
                data.errors || {},

            response:
                matches,

            cached: false
        });


    }
    catch (error) {

        console.error(
            "LIVE ERROR:",
            error
        );


        res.status(500).json({

            results: 0,

            errors: {
                server:
                    error.message
            },

            response: []
        });

    }

});


// ========================================
// TEST
// ========================================

app.get("/api/test", (req, res) => {

    res.json({
        status: "ok",
        service: "BakhiraFoot",
        apiCache: "active"
    });

});


// ========================================
// CACHE INFO
// ========================================

app.get("/api/cache", (req, res) => {

    const matches = {};

    for (
        const [date, value]
        of matchesCache
    ) {

        matches[date] = {
            age:
                Math.round(
                    (Date.now() - value.time)
                    / 1000
                ) + " seconds",

            matches:
                value.data.length
        };
    }


    res.json({

        matches,

        live: {
            age:
                liveCache.time
                    ? Math.round(
                        (Date.now() -
                        liveCache.time)
                        / 1000
                    ) + " seconds"
                    : null,

            matches:
                liveCache.data.length
        },

        apiBlocked:
            Date.now() < apiBlockedUntil

    });

});


// ========================================
// START SERVER
// ========================================

app.get("/api/test-api", async (req, res) => {
    try {
        const response = await fetch(
            "https://v3.football.api-sports.io/status",
            {
                headers: {
                    "x-apisports-key": process.env.API_FOOTBALL_KEY
                }
            }
        );

        const data = await response.json();

        res.json(data);

    } catch (error) {
        res.json({
            error: error.message,
            cause: error.cause?.message || null
        });
    }
});
app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `BakhiraFoot running on port ${PORT}`
        );

    }
);
