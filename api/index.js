const cache = new Map();

const CACHE_TIME = 5 * 60 * 1000;       // 5 دقائق
const LIVE_CACHE_TIME = 60 * 1000;      // LIVE: دقيقة

module.exports = async (req, res) => {

    try {

        const { live, date } = req.query;

        const isLive = live === "all";

        const matchDate =
            date ||
            new Date().toISOString().split("T")[0];

        const cacheKey = isLive
            ? "live"
            : `date-${matchDate}`;

        const now = Date.now();

        /* =========================
           CHECK CACHE
        ========================= */

        const saved = cache.get(cacheKey);

        const maxAge =
            isLive
                ? LIVE_CACHE_TIME
                : CACHE_TIME;

        if (
            saved &&
            now - saved.time < maxAge
        ) {

            console.log(
                "CACHE:",
                cacheKey
            );

            return res.status(200).json(
                saved.data
            );
        }

        /* =========================
           API-FOOTBALL
        ========================= */

        let url =
            "https://v3.football.api-sports.io/fixtures";

        if (isLive) {

            url += "?live=all";

        } else {

            url +=
                `?date=${encodeURIComponent(
                    matchDate
                )}`;

        }

        const response =
            await fetch(url, {

                headers: {
                    "x-apisports-key":
                        process.env.API_FOOTBALL_KEY
                }

            });

        const data =
            await response.json();

        /* =========================
           API ERROR
        ========================= */

        if (!response.ok) {

            console.error(
                "API-FOOTBALL ERROR:",
                data
            );

            /* إذا كان عندنا cache قديم،
               نستعملوه بدل ما نخلي الموقع خاوي */

            if (saved) {

                console.log(
                    "Using old cache"
                );

                return res.status(200).json(
                    saved.data
                );
            }

            return res.status(
                response.status
            ).json({

                error:
                    data?.errors ||
                    "API-Football error",

                data: []

            });

        }

        /* =========================
           SAVE CACHE
        ========================= */

        const result = {

            data:
                data.response || []

        };

        cache.set(
            cacheKey,
            {
                time: now,
                data: result
            }
        );

        return res.status(200).json(
            result
        );

    } catch (error) {

        console.error(
            "API ERROR:",
            error
        );

        return res.status(500).json({

            error: error.message,

            data: []

        });

    }

};
