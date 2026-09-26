// ========================================
// BAKHIRAFOOT
// FOOTBALL LIVE + KICKOFF API
// ========================================

const API_BASE = "";

let currentDate = new Date();

// ========================================
// HELPERS
// ========================================

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function monthName(date) {
    return date.toLocaleDateString("fr-FR", {
        month: "short"
    }).replace(".", "").toUpperCase();
}

function matchTime(match) {
    if (!match.date) return "--:--";

    return new Date(match.date).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function matchIsLive(match) {
    const status = match.status?.short || "";

    return [
        "1H",
        "2H",
        "HT",
        "ET",
        "P",
        "BT",
        "LIVE"
    ].includes(status);
}

function statusText(match) {

    const status = match.status?.short || "";

    if (matchIsLive(match)) {

        const minute =
            match.status?.elapsed
                ? ` ${match.status.elapsed}'`
                : "";

        return `🔴 LIVE${minute}`;
    }

    if (["FT", "AET", "PEN"].includes(status)) {
        return "✅ Terminé";
    }

    return `🕐 ${matchTime(match)}`;
}

// ========================================
// DATE BAR
// ========================================

function createDateBar() {

    const datesBox =
        document.querySelector(".dates");

    if (!datesBox) return;

    datesBox.innerHTML = "";

    const today = new Date();

    const names = [
        "DIM",
        "LUN",
        "MAR",
        "MER",
        "JEU",
        "VEN",
        "SAM"
    ];

    for (let i = 0; i < 7; i++) {

        const date =
            new Date(today);

        date.setHours(0, 0, 0, 0);

        date.setDate(
            today.getDate() + i
        );

        const button =
            document.createElement("button");

        let label;

        if (i === 0) {

            label = "Aujourd'hui";

        } else if (i === 1) {

            label = "Demain";

        } else {

            label =
                `${date.getDate()} ${monthName(date)}`;
        }

        button.innerHTML = `
            <b>${label}</b>
            <br>
            <small>${names[date.getDay()]}</small>
        `;

        button.onclick = () => {

            currentDate =
                new Date(date);

            document
                .querySelectorAll(".dates button")
                .forEach(btn =>
                    btn.classList.remove("selected")
                );

            button.classList.add("selected");

            loadMatches(currentDate);
        };

        if (i === 0) {

            button.classList.add("selected");

            currentDate =
                new Date(date);
        }

        datesBox.appendChild(button);
    }
}

// ========================================
// LOAD MATCHES BY DATE
// ========================================

async function loadMatches(date = currentDate) {

    try {

        const dateString =
            formatDate(date);

        console.log(
            "BakhiraFoot DATE:",
            dateString
        );

        const response =
            await fetch(
                `${API_BASE}/api/matches?date=${dateString}`
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const result =
            await response.json();

        const matches =
            result.data || [];

        console.log(
            "MATCHS:",
            matches.length
        );

        renderMatches(matches);

    } catch (error) {

        console.error(
            "Erreur matchs:",
            error
        );

        const scoreList =
            document.getElementById("scoreList");

        if (scoreList) {

            scoreList.innerHTML = `
                <div class="card">
                    ❌ Impossible de charger les matchs.
                </div>
            `;
        }
    }
}

// ========================================
// RENDER NORMAL MATCHES
// ========================================

function renderMatches(matches) {

    const scoreList =
        document.getElementById("scoreList");

    const homeMatches =
        document.getElementById("homeMatches");

    if (!matches.length) {

        const empty = `
            <div class="card">
                ⚽ Aucun match pour cette date
            </div>
        `;

        if (scoreList)
            scoreList.innerHTML = empty;

        if (homeMatches)
            homeMatches.innerHTML = empty;

        return;
    }

    // ------------------------------------
    // SCORES
    // ------------------------------------

    if (scoreList) {

        scoreList.innerHTML =
            matches.map(match => {

                const home =
                    match.home?.name || "?";

                const away =
                    match.away?.name || "?";

                const homeLogo =
                    match.home?.logo || "";

                const awayLogo =
                    match.away?.logo || "";

                const homeScore =
                    match.score?.home ?? "-";

                const awayScore =
                    match.score?.away ?? "-";

                const league =
                    match.league?.name ||
                    "Football";

                return `
                    <div class="card">

                        <div class="comp">
                            🏆 ${league}
                        </div>

                        <div class="teams">

                            <div>
                                ${
                                    homeLogo
                                    ? `<img
                                        src="${homeLogo}"
                                        style="
                                            width:40px;
                                            height:40px;
                                            object-fit:contain;
                                        "
                                      >`
                                    : "⚽"
                                }

                                <br>

                                <strong>
                                    ${home}
                                </strong>
                            </div>

                            <div class="score">

                                ${homeScore}
                                -
                                ${awayScore}

                                <div class="time">
                                    ${statusText(match)}
                                </div>

                            </div>

                            <div class="away">

                                ${
                                    awayLogo
                                    ? `<img
                                        src="${awayLogo}"
                                        style="
                                            width:40px;
                                            height:40px;
                                            object-fit:contain;
                                        "
                                      >`
                                    : "⚽"
                                }

                                <br>

                                <strong>
                                    ${away}
                                </strong>

                            </div>

                        </div>

                    </div>
                `;

            }).join("");
    }

    // ------------------------------------
    // HOME
    // ------------------------------------

    if (homeMatches) {

        homeMatches.innerHTML =
            matches.slice(0, 10)
                .map(match => {

                    const home =
                        match.home?.name || "?";

                    const away =
                        match.away?.name || "?";

                    const homeLogo =
                        match.home?.logo || "";

                    const awayLogo =
                        match.away?.logo || "";

                    const homeScore =
                        match.score?.home ?? "-";

                    const awayScore =
                        match.score?.away ?? "-";

                    const league =
                        match.league?.name ||
                        "Football";

                    return `
                        <div class="card">

                            <div class="comp">
                                🏆 ${league}
                            </div>

                            <div class="teams">

                                <div>
                                    ${
                                        homeLogo
                                        ? `<img
                                            src="${homeLogo}"
                                            style="
                                                width:35px;
                                                height:35px;
                                                object-fit:contain;
                                            "
                                          >`
                                        : "⚽"
                                    }

                                    <br>

                                    ${home}
                                </div>

                                <div class="score">

                                    ${homeScore}
                                    -
                                    ${awayScore}

                                </div>

                                <div class="away">

                                    ${
                                        awayLogo
                                        ? `<img
                                            src="${awayLogo}"
                                            style="
                                                width:35px;
                                                height:35px;
                                                object-fit:contain;
                                            "
                                          >`
                                        : "⚽"
                                    }

                                    <br>

                                    ${away}

                                </div>

                            </div>

                            <div class="time">
                                ${statusText(match)}
                            </div>

                        </div>
                    `;

                }).join("");
    }
}

// ========================================
// 🔴 LIVE MATCHES
// ========================================

async function loadLive() {

    try {

        console.log(
            "🔴 BakhiraFoot LIVE..."
        );

        const response =
            await fetch(
                `${API_BASE}/api/live`
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const result =
            await response.json();

        const matches =
            result.data || [];

        console.log(
            "🔴 LIVE MATCHES:",
            matches.length
        );

        // ==================================
        // LIVE COUNTER
        // ==================================

        const live =
            document.getElementById("live");

        if (live) {

            if (!matches.length) {

                live.innerHTML =
                    "⚪ Aucun match live";

            } else {

                live.innerHTML =
                    `🔴 ${matches.length} MATCH(S) LIVE`;
            }
        }

        // ==================================
        // SHOW LIVE IN SCORE PAGE
        // ==================================

        const scoreList =
            document.getElementById("scoreList");

        if (!scoreList) return;

        if (!matches.length) {

            console.log(
                "Aucun match live actuellement."
            );

            return;
        }

        const liveTitle = `
            <div style="
                margin:20px 0 12px;
                font-weight:900;
                font-size:18px;
            ">
                🔴 MATCHS EN DIRECT
            </div>
        `;

        const liveHTML =
            matches.map(match => {

                const home =
                    match.home?.name || "?";

                const away =
                    match.away?.name || "?";

                const homeLogo =
                    match.home?.logo || "";

                const awayLogo =
                    match.away?.logo || "";

                const homeScore =
                    match.score?.home ?? 0;

                const awayScore =
                    match.score?.away ?? 0;

                const league =
                    match.league?.name ||
                    "Football";

                const minute =
                    match.status?.elapsed
                    ? `${match.status.elapsed}'`
                    : "LIVE";

                return `
                    <div class="card"
                         style="
                            border-left:
                            4px solid #e23f3f;
                         ">

                        <div class="comp">

                            🏆 ${league}

                            <span style="
                                float:right;
                                color:#e23f3f;
                                font-weight:900;
                            ">
                                🔴 ${minute}
                            </span>

                        </div>

                        <div class="teams">

                            <div>

                                ${
                                    homeLogo
                                    ? `<img
                                        src="${homeLogo}"
                                        alt="${home}"
                                        style="
                                            width:45px;
                                            height:45px;
                                            object-fit:contain;
                                        "
                                      >`
                                    : "⚽"
                                }

                                <br>

                                <strong>
                                    ${home}
                                </strong>

                            </div>

                            <div class="score">

                                ${homeScore}
                                -
                                ${awayScore}

                            </div>

                            <div class="away">

                                ${
                                    awayLogo
                                    ? `<img
                                        src="${awayLogo}"
                                        alt="${away}"
                                        style="
                                            width:45px;
                                            height:45px;
                                            object-fit:contain;
                                        "
                                      >`
                                    : "⚽"
                                }

                                <br>

                                <strong>
                                    ${away}
                                </strong>

                            </div>

                        </div>

                        <div class="time red">
                            🔴 EN DIRECT
                        </div>

                    </div>
                `;

            }).join("");

        scoreList.innerHTML =
            liveTitle + liveHTML;

    } catch (error) {

        console.error(
            "❌ Erreur LIVE:",
            error
        );

        const live =
            document.getElementById("live");

        if (live) {

            live.innerHTML =
                "⚪ Live indisponible";
        }
    }
}

// ========================================
// TEAMS
// ========================================

function loadTeams() {

    const box =
        document.getElementById("teamGrid");

    if (!box) return;

    const teams = [
        "Real Madrid",
        "FC Barcelona",
        "Manchester City",
        "Manchester United",
        "Liverpool",
        "Arsenal",
        "Chelsea",
        "PSG",
        "Bayern Munich",
        "Inter",
        "AC Milan",
        "Juventus"
    ];

    box.innerHTML =
        teams.map(team => `

            <div class="card team">

                <div class="teamLogo">
                    ⚽
                </div>

                <h3>
                    ${team}
                </h3>

                <button
                    onclick="showTeam('${team}')">
                    Voir l'équipe →
                </button>

            </div>

        `).join("");
}

function showTeam(team) {

    const box =
        document.getElementById("teamDetail");

    if (!box) return;

    box.innerHTML = `

        <div class="card detail">

            <div class="detailHead">

                <div class="big">
                    ⚽
                </div>

                <div>

                    <h2>
                        ${team}
                    </h2>

                    <p>
                        Informations de l'équipe.
                    </p>

                </div>

            </div>

        </div>
    `;
}

// ========================================
// NEWS
// ========================================

function loadNews() {

    const news = [

        {
            title: "⚽ Actualités football",
            text:
                "Toutes les dernières informations du football."
        },

        {
            title: "🏆 Compétitions",
            text:
                "Suivez les grandes compétitions européennes."
        },

        {
            title: "🔥 Matchs du jour",
            text:
                "Découvrez les matchs programmés."
        },

        {
            title: "🇲🇦 Football marocain",
            text:
                "Suivez l'actualité du football marocain."
        }

    ];

    const html =
        news.map(item => `

            <div class="card">

                <h3>
                    ${item.title}
                </h3>

                <p>
                    ${item.text}
                </p>

                <small>
                    📰 BakhiraFoot
                </small>

            </div>

        `).join("");

    const newsGrid =
        document.getElementById("newsGrid");

    const homeNews =
        document.getElementById("homeNews");

    if (newsGrid)
        newsGrid.innerHTML = html;

    if (homeNews)
        homeNews.innerHTML = html;
}

// ========================================
// NAVIGATION
// ========================================

function go(page) {

    document.querySelectorAll(".page")
        .forEach(p =>
            p.classList.remove("active")
        );

    const target =
        document.getElementById(page);

    if (target)
        target.classList.add("active");

    document.querySelectorAll("nav button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });
}

// ========================================
// DARK MODE
// ========================================

function setupTheme() {

    const theme =
        document.getElementById("theme");

    if (!theme) return;

    theme.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );

        }
    );
}

// ========================================
// SEARCH
// ========================================

function setupSearch() {

    const search =
        document.getElementById("search");

    if (!search) return;

    search.addEventListener(
        "input",
        function () {

            const value =
                this.value.toLowerCase();

            document
                .querySelectorAll(".card")
                .forEach(card => {

                    const text =
                        card.innerText
                            .toLowerCase();

                    card.style.display =
                        text.includes(value)
                            ? ""
                            : "none";
                });

        }
    );
}

// ========================================
// START
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // Navigation
        document
            .querySelectorAll("nav button")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {
                        go(
                            button.dataset.page
                        );
                    }
                );

            });

        // Dates
        createDateBar();

        // Matches
        loadMatches(currentDate);

        // Live
        loadLive();

        // Teams
        loadTeams();

        // News
        loadNews();

        // Theme
        setupTheme();

        // Search
        setupSearch();
    }
);

// ========================================
// AUTO UPDATE
// ========================================

// Live كل 30 ثانية
setInterval(() => {

    loadLive();

}, 30000);

// Matches كل 30 ثانية
setInterval(() => {

    loadMatches(currentDate);

}, 30000);

// Date bar كل ساعة
setInterval(() => {

    createDateBar();

}, 60 * 60 * 1000);
