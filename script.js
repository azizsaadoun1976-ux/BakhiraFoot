const API_BASE = "";

// ===============================
// API CACHE
// ===============================

const apiCache = new Map();

const LIVE_CACHE_TIME = 60 * 1000;       // 1 minute
const MATCHES_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache(url, cacheTime) {

    const now = Date.now();

    const cached = apiCache.get(url);

    // استعمال Cache إلا مازال صالح
    if (
        cached &&
        now - cached.time < cacheTime
    ) {
        console.log("⚡ CACHE:", url);
        return cached.data;
    }

    try {

        console.log("🌐 API REQUEST:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `API error: ${response.status}`
            );
        }

        const data = await response.json();

        // تخزين النتيجة
        apiCache.set(url, {
            time: now,
            data: data
        });

        return data;

    } catch (error) {

        console.error(
            "API ERROR:",
            error
        );

        // إلا API طاح، نستعمل آخر نسخة مخزنة
        if (cached) {

            console.log(
                "⚠️ استعمال آخر بيانات مخزنة"
            );

            return cached.data;
        }

        throw error;
    }
}

// ===============================
// HELPERS
// ===============================

function getTeamLogo(team) {
    return team?.logo || "";
}

function getTeamName(team) {
    return team?.name || "Unknown";
}

function getScore(score, side) {

    if (!score) return "-";

    return score[side] ?? "-";
}

function getStatus(match) {

    if (!match?.status) return "NS";

    if (match.status.short === "1H") {
        return `LIVE ${match.status.elapsed || ""}'`;
    }

    if (match.status.short === "2H") {
        return `LIVE ${match.status.elapsed || ""}'`;
    }

    return (
        match.status.long ||
        match.status.short ||
        "NS"
    );
}

// ===============================
// MATCH CARD
// ===============================

function createMatchCard(match) {

    const home = match.home || {};
    const away = match.away || {};
    const score = match.score || {};

    return `
        <div class="match-card">

            <div class="match-league">
                ${match.league?.name || "Football"}
            </div>

            <div class="match-teams">

                <div class="team">

                    ${
                        getTeamLogo(home)
                            ? `
                                <img
                                    src="${getTeamLogo(home)}"
                                    alt=""
                                >
                              `
                            : ""
                    }

                    <span>
                        ${getTeamName(home)}
                    </span>

                </div>

                <div class="match-score">

                    <strong>
                        ${getScore(score, "home")}
                        -
                        ${getScore(score, "away")}
                    </strong>

                    <small>
                        ${getStatus(match)}
                    </small>

                </div>

                <div class="team">

                    ${
                        getTeamLogo(away)
                            ? `
                                <img
                                    src="${getTeamLogo(away)}"
                                    alt=""
                                >
                              `
                            : ""
                    }

                    <span>
                        ${getTeamName(away)}
                    </span>

                </div>

            </div>

        </div>
    `;
}

// ===============================
// LOAD LIVE MATCHES
// ===============================

async function loadLive() {

    try {

        const result =
            await fetchWithCache(
                `${API_BASE}/api/live`,
                LIVE_CACHE_TIME
            );

        const matches =
            result.data || [];

        console.log(
            "LIVE MATCHES:",
            matches
        );

        const container =
            document.querySelector("#live-matches") ||
            document.querySelector(".live-matches") ||
            document.querySelector("#matches") ||
            document.querySelector(".matches");

        if (!container) {

            console.error(
                "Container dyal live matches ma l9itouch."
            );

            return;
        }

        if (matches.length === 0) {

            container.innerHTML = `
                <div class="no-matches">
                    <p>
                        ما كاين حتى ماتش لايف دابا
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            matches
                .map(createMatchCard)
                .join("");

    } catch (error) {

        console.error(
            "Error loading live matches:",
            error
        );

    }
}

// ===============================
// LOAD MATCHES BY DATE
// ===============================

async function loadMatches(date) {

    try {

        const url =
            `${API_BASE}/api/matches?date=${encodeURIComponent(date)}`;

        const result =
            await fetchWithCache(
                url,
                MATCHES_CACHE_TIME
            );

        const matches =
            result.data || [];

        console.log(
            `MATCHES ${date}:`,
            matches
        );

        const container =
            document.querySelector("#matches") ||
            document.querySelector(".matches") ||
            document.querySelector("#today-matches") ||
            document.querySelector(".today-matches");

        if (!container) {

            console.error(
                "Container dyal matches ma l9itouch."
            );

            return;
        }

        if (matches.length === 0) {

            container.innerHTML = `
                <div class="no-matches">
                    <p>
                        ما كاينين حتى ماتشات فهاد النهار
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            matches
                .map(createMatchCard)
                .join("");

    } catch (error) {

        console.error(
            "Error loading matches:",
            error
        );

    }
}

// ===============================
// TODAY
// ===============================

function getToday() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ===============================
// START
// ===============================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "BakhiraFoot started"
        );

        // أول تحميل
        loadLive();

        loadMatches(
            getToday()
        );

        // LIVE كل دقيقة
        setInterval(
            loadLive,
            60 * 1000
        );

    }
);
