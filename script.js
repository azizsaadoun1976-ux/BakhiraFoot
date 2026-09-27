/* =========================================================
   BAKHIRAFOOT - SCRIPT.JS
   LIVE + SCORES + LEAGUES + TEAMS + NEWS
   API CACHE PROTECTION
========================================================= */

const API_BASE = "";

let currentMatches = [];
let currentDate = null;
let currentFilter = "all";

const matchStore = new Map();

/* =========================================================
   API CACHE - PROTECTION
========================================================= */

const apiCache = new Map();

const API_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const LIVE_CACHE_TIME = 60 * 1000;    // 1 minute

async function fetchCached(url, options = {}) {

    const now = Date.now();
    const isLive = url.includes("live=all");

    const cacheTime =
        isLive
            ? LIVE_CACHE_TIME
            : API_CACHE_TIME;

    const saved = apiCache.get(url);

    /* USE CACHE */
    if (
        saved &&
        now - saved.time < cacheTime
    ) {

        console.log("⚡ CACHE:", url);

        return saved.data;
    }

    try {

        console.log("🌐 API:", url);

        const response = await fetch(url, {
            ...options,
            cache: "no-store"
        });

        if (!response.ok) {

            if (saved) {

                console.log(
                    "⚠️ API failed → old cache"
                );

                return saved.data;
            }

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        apiCache.set(
            url,
            {
                time: now,
                data: data
            }
        );

        return data;

    } catch (error) {

        console.error(
            "API CACHE ERROR:",
            error
        );

        if (saved) {
            return saved.data;
        }

        throw error;
    }
}


/* =========================================================
   HELPERS
========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {

    if (!dateString) return "";

    const date =
        new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString(
        "fr-FR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


/* =========================================================
   API NORMALIZATION
========================================================= */

function getStatus(match) {

    return (
        match?.fixture?.status?.short ||
        match?.fixture?.status?.long ||
        match?.status ||
        ""
    );
}

function getMinute(match) {

    return (
        match?.fixture?.status?.elapsed ??
        match?.status?.elapsed ??
        ""
    );
}

function getHome(match) {

    return (
        match?.teams?.home?.name ||
        match?.home?.name ||
        "Home"
    );
}

function getAway(match) {

    return (
        match?.teams?.away?.name ||
        match?.away?.name ||
        "Away"
    );
}

function getHomeLogo(match) {

    return (
        match?.teams?.home?.logo ||
        match?.home?.logo ||
        ""
    );
}

function getAwayLogo(match) {

    return (
        match?.teams?.away?.logo ||
        match?.away?.logo ||
        ""
    );
}

function getHomeScore(match) {

    return (
        match?.goals?.home ??
        match?.score?.fulltime?.home ??
        match?.home?.score ??
        "-"
    );
}

function getAwayScore(match) {

    return (
        match?.goals?.away ??
        match?.score?.fulltime?.away ??
        match?.away?.score ??
        "-"
    );
}

function getLeague(match) {

    return (
        match?.league?.name ||
        match?.competition?.name ||
        "Football"
    );
}

function getFixtureId(match) {

    return (
        match?.fixture?.id ||
        match?.id ||
        ""
    );
}

function normalizeMatches(data) {

    if (Array.isArray(data)) {
        return data;
    }

    if (
        data &&
        Array.isArray(data.response)
    ) {
        return data.response;
    }

    if (
        data &&
        Array.isArray(data.data)
    ) {
        return data.data;
    }

    return [];
}


/* =========================================================
   STORE MATCHES
========================================================= */

function storeMatches(matches) {

    matches.forEach(match => {

        const id =
            getFixtureId(match);

        if (id) {

            matchStore.set(
                String(id),
                match
            );
        }
    });
}


/* =========================================================
   NAVIGATION
========================================================= */

function go(page) {

    document
        .querySelectorAll(".page")
        .forEach(section => {

            section.classList.remove(
                "active"
            );
        });

    const target =
        document.getElementById(
            page
        );

    if (target) {

        target.classList.add(
            "active"
        );
    }

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(button => {

            button.classList.remove(
                "active"
            );

            if (
                button.dataset.page === page
            ) {

                button.classList.add(
                    "active"
                );
            }
        });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    /* PAGE ACTIONS */

    if (page === "home") {

        renderHome();
    }

    if (page === "scores") {

        if (!currentDate) {

            currentDate =
                new Date()
                    .toISOString()
                    .split("T")[0];
        }

        loadMatches(
            currentDate
        );
    }

    if (page === "leagues") {

        renderLeagues();
    }

    if (page === "teams") {

        renderTeams();
    }

    if (page === "news") {

        renderNews();
    }
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    let toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id = "toast";

        toast.style.position =
            "fixed";

        toast.style.bottom =
            "25px";

        toast.style.right =
            "25px";

        toast.style.zIndex =
            "99999";

        toast.style.padding =
            "12px 18px";

        toast.style.borderRadius =
            "12px";

        toast.style.background =
            "#111827";

        toast.style.color =
            "#fff";

        toast.style.fontWeight =
            "600";

        document.body.appendChild(
            toast
        );
    }

    toast.textContent =
        message;

    toast.style.display =
        "block";

    clearTimeout(
        toast._timer
    );

    toast._timer =
        setTimeout(() => {

            toast.style.display =
                "none";

        }, 2500);
}


/* =========================================================
   STATUS
========================================================= */

function statusLabel(match) {

    const status =
        getStatus(match);

    const minute =
        getMinute(match);

    const liveStatuses = [
        "1H",
        "2H",
        "ET",
        "P",
        "LIVE",
        "HT"
    ];

    if (
        liveStatuses.includes(
            String(status).toUpperCase()
        )
    ) {

        if (
            String(status).toUpperCase()
            === "HT"
        ) {

            return "MT";
        }

        return minute
            ? `${minute}'`
            : "LIVE";
    }

    if (
        [
            "FT",
            "AET",
            "PEN"
        ].includes(
            String(status).toUpperCase()
        )
    ) {

        return "Terminé";
    }

    if (
        [
            "NS",
            "TBD"
        ].includes(
            String(status).toUpperCase()
        )
    ) {

        const date =
            match?.fixture?.date;

        if (date) {

            return new Date(date)
                .toLocaleTimeString(
                    "fr-FR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );
        }

        return "À venir";
    }

    return status || "À venir";
}


/* =========================================================
   TEAM HTML
========================================================= */

function teamHTML(
    name,
    logo
) {

    return `
        <div class="team">
            ${
                logo
                    ? `
                        <img
                            src="${escapeHTML(logo)}"
                            alt="${escapeHTML(name)}"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="team-logo-placeholder">
                            ⚽
                        </div>
                    `
            }

            <span>
                ${escapeHTML(name)}
            </span>
        </div>
    `;
}


/* =========================================================
   MATCH CARD
========================================================= */

function createMatchHTML(
    match,
    index
) {

    const fixtureId =
        getFixtureId(match);

    const home =
        getHome(match);

    const away =
        getAway(match);

    const homeLogo =
        getHomeLogo(match);

    const awayLogo =
        getAwayLogo(match);

    const homeScore =
        getHomeScore(match);

    const awayScore =
        getAwayScore(match);

    const league =
        getLeague(match);

    const status =
        statusLabel(match);

    const isLive =
        [
            "1H",
            "2H",
            "ET",
            "P",
            "LIVE",
            "HT"
        ].includes(
            String(
                getStatus(match)
            ).toUpperCase()
        );

    return `
        <div
            class="match-card ${isLive ? "live-match" : ""}"
            data-fixture-id="${escapeHTML(String(fixtureId))}"
            onclick="openMatchDetailsById('${escapeHTML(String(fixtureId))}')"
        >

            <div class="match-top">

                <span class="league-name">
                    ${escapeHTML(league)}
                </span>

                <span class="match-status ${isLive ? "live" : ""}">
                    ${escapeHTML(status)}
                </span>

            </div>

            <div class="match-main">

                <div class="match-team home-team">

                    ${
                        homeLogo
                            ? `
                                <img
                                    src="${escapeHTML(homeLogo)}"
                                    alt="${escapeHTML(home)}"
                                    loading="lazy"
                                >
                            `
                            : "⚽"
                    }

                    <span>
                        ${escapeHTML(home)}
                    </span>

                </div>

                <div class="match-score">

                    <strong>
                        ${escapeHTML(homeScore)}
                    </strong>

                    <span>:</span>

                    <strong>
                        ${escapeHTML(awayScore)}
                    </strong>

                </div>

                <div class="match-team away-team">

                    ${
                        awayLogo
                            ? `
                                <img
                                    src="${escapeHTML(awayLogo)}"
                                    alt="${escapeHTML(away)}"
                                    loading="lazy"
                                >
                            `
                            : "⚽"
                    }

                    <span>
                        ${escapeHTML(away)}
                    </span>

                </div>

            </div>

            <div class="match-bottom">

                <span>
                    ${formatDate(match?.fixture?.date)}
                </span>

                <span>
                    Voir détails →
                </span>

            </div>

        </div>
    `;
}


/* =========================================================
   LIVE
========================================================= */

async function loadLive() {

    const liveContainer =
        $("#live");

    const scoreList =
        $("#scoreList");

    try {

        const data =
            await fetchCached(
                `${API_BASE}/api?live=all`
            );

        const matches =
            normalizeMatches(data);

        currentMatches =
            matches;

        storeMatches(
            matches
        );

        if (!matches.length) {

            const empty =
                emptyCard(
                    "Aucun match en direct"
                );

            if (liveContainer) {
                liveContainer.innerHTML =
                    empty;
            }

            if (scoreList) {
                scoreList.innerHTML =
                    empty;
            }

            return;
        }

        const html =
            matches
                .map(
                    createMatchHTML
                )
                .join("");

        if (liveContainer) {

            liveContainer.innerHTML =
                html;
        }

        if (scoreList) {

            scoreList.innerHTML =
                html;
        }

    } catch (error) {

        console.error(
            "LIVE ERROR:",
            error
        );

        if (liveContainer) {

            liveContainer.innerHTML =
                emptyCard(
                    "Impossible de charger les matchs"
                );
        }
    }
}


/* =========================================================
   MATCHES BY DATE
========================================================= */

async function loadMatches(
    date
) {

    currentDate =
        date ||
        new Date()
            .toISOString()
            .split("T")[0];

    const container =
        $("#scoreList");

    if (!container) {
        return;
    }

    try {

        const data =
            await fetchCached(
                `${API_BASE}/api?date=${encodeURIComponent(
                    currentDate
                )}`
            );

        const allMatches =
            normalizeMatches(data);

        currentMatches =
            allMatches;

        storeMatches(
            allMatches
        );

        let matches =
            allMatches;

        /* FILTER */

        if (
            currentFilter &&
            currentFilter !== "all"
        ) {

            matches =
                allMatches.filter(
                    match =>
                        getLeague(
                            match
                        )
                        .toLowerCase()
                        .includes(
                            currentFilter
                                .toLowerCase()
                        )
                );
        }

        if (!matches.length) {

            container.innerHTML =
                emptyCard(
                    "Aucun match pour cette date"
                );

            return;
        }

        container.innerHTML =
            matches
                .map(
                    createMatchHTML
                )
                .join("");

    } catch (error) {

        console.error(
            "MATCHES ERROR:",
            error
        );

        container.innerHTML =
            emptyCard(
                "Erreur lors du chargement"
            );
    }
}


/* =========================================================
   EMPTY CARD
========================================================= */

function emptyCard(
    message
) {

    return `
        <div class="empty-card">
            <div class="empty-icon">
                ⚽
            </div>

            <p>
                ${escapeHTML(message)}
            </p>
        </div>
    `;
}


/* =========================================================
   MATCH MODAL
========================================================= */

function createMatchModal() {

    if (
        document.getElementById(
            "matchDetailsModal"
        )
    ) {

        return;
    }

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "matchDetailsModal";

    modal.className =
        "match-modal";

    modal.innerHTML = `
        <div class="match-modal-overlay"
             onclick="closeMatchDetails()">
        </div>

        <div class="match-modal-box">

            <button
                class="match-modal-close"
                onclick="closeMatchDetails()"
            >
                ×
            </button>

            <div id="matchModalContent">
            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );

    addModalStyles();
}


/* =========================================================
   MODAL STYLES
========================================================= */

function addModalStyles() {

    if (
        document.getElementById(
            "bakhira-modal-style"
        )
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "bakhira-modal-style";

    style.textContent = `

        .match-modal {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: none;
        }

        .match-modal.show {
            display: block;
        }

        .match-modal-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,.70);
            backdrop-filter: blur(5px);
        }

        .match-modal-box {
            position: relative;
            z-index: 2;
            width: min(720px, 94%);
            max-height: 90vh;
            overflow-y: auto;
            margin: 5vh auto;
            background: #fff;
            border-radius: 22px;
            padding: 25px;
            box-shadow: 0 20px 60px rgba(0,0,0,.35);
        }

        .match-modal-close {
            position: absolute;
            right: 15px;
            top: 12px;
            width: 38px;
            height: 38px;
            border: none;
            border-radius: 50%;
            background: #f1f1f1;
            font-size: 28px;
            cursor: pointer;
            z-index: 5;
        }

        .modal-league {
            text-align: center;
            color: #777;
            font-size: 14px;
            margin-bottom: 12px;
        }

        .modal-teams {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 20px;
            text-align: center;
        }

        .modal-team img {
            width: 75px;
            height: 75px;
            object-fit: contain;
        }

        .modal-team-name {
            font-weight: 700;
            margin-top: 8px;
        }

        .modal-score {
            font-size: 34px;
            font-weight: 900;
        }

        .modal-status {
            margin-top: 7px;
            font-size: 13px;
            color: #666;
        }

        .modal-info {
            display: grid;
            grid-template-columns: repeat(2,1fr);
            gap: 10px;
            margin-top: 25px;
        }

        .modal-info-item {
            background: #f7f7f7;
            padding: 12px;
            border-radius: 12px;
        }

        .modal-info-item small {
            display: block;
            color: #777;
            margin-bottom: 4px;
        }

        .modal-section {
            margin-top: 25px;
        }

        .modal-section h3 {
            margin-bottom: 12px;
        }

        .event-row {
            display: flex;
            justify-content: space-between;
            padding: 9px 0;
            border-bottom: 1px solid #eee;
        }

        .stat-row {
            display: grid;
            grid-template-columns: 1fr 80px 1fr;
            gap: 10px;
            align-items: center;
            padding: 8px 0;
        }

        .stat-row .stat-home {
            text-align: right;
        }

        .stat-row .stat-name {
            text-align: center;
            font-size: 12px;
            color: #777;
        }

        @media(max-width:600px) {

            .match-modal-box {
                padding: 18px;
            }

            .modal-teams {
                gap: 8px;
            }

            .modal-team img {
                width: 55px;
                height: 55px;
            }

            .modal-score {
                font-size: 25px;
            }

            .modal-info {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}


/* =========================================================
   OPEN MATCH
========================================================= */

function openMatchDetailsById(
    id
) {

    const match =
        matchStore.get(
            String(id)
        );

    if (!match) {

        showToast(
            "Détails du match indisponibles"
        );

        return;
    }

    openMatchModal(
        match
    );
}


function openMatchModal(
    match
) {

    createMatchModal();

    const modal =
        document.getElementById(
            "matchDetailsModal"
        );

    const content =
        document.getElementById(
            "matchModalContent"
        );

    const home =
        getHome(match);

    const away =
        getAway(match);

    const homeLogo =
        getHomeLogo(match);

    const awayLogo =
        getAwayLogo(match);

    const homeScore =
        getHomeScore(match);

    const awayScore =
        getAwayScore(match);

    const league =
        getLeague(match);

    const status =
        statusLabel(match);

    const fixture =
        match?.fixture || {};

    const venue =
        fixture?.venue?.name ||
        "Non disponible";

    const city =
        fixture?.venue?.city ||
        "";

    const referee =
        fixture?.referee ||
        "Non disponible";

    const round =
        match?.league?.round ||
        "Non disponible";

    const season =
        match?.league?.season ||
        "Non disponible";

    const events =
        match?.events || [];

    const statistics =
        match?.statistics || [];

    let eventsHTML =
        "";

    if (events.length) {

        eventsHTML =
            events
                .map(event => {

                    const player =
                        event?.player?.name ||
                        "";

                    const type =
                        event?.type ||
                        "";

                    const detail =
                        event?.detail ||
                        "";

                    const minute =
                        event?.time?.elapsed ??
                        "";

                    return `
                        <div class="event-row">

                            <span>
                                ${escapeHTML(
                                    minute
                                        ? minute + "'"
                                        : ""
                                )}
                            </span>

                            <span>
                                ${escapeHTML(
                                    player
                                )}
                                ${
                                    detail
                                        ? " - " +
                                          escapeHTML(
                                              detail
                                          )
                                        : ""
                                }
                            </span>

                            <span>
                                ${escapeHTML(
                                    type
                                )}
                            </span>

                        </div>
                    `;
                })
                .join("");

    } else {

        eventsHTML =
            "<p>Aucun événement disponible.</p>";
    }


    let statsHTML =
        "";

    if (
        Array.isArray(
            statistics
        ) &&
        statistics.length
    ) {

        const homeStats =
            statistics[0]?.statistics ||
            [];

        const awayStats =
            statistics[1]?.statistics ||
            [];

        const statMap =
            new Map();

        homeStats.forEach(
            stat => {

                statMap.set(
                    stat.type,
                    {
                        home: stat.value,
                        away: "-"
                    }
                );
            }
        );

        awayStats.forEach(
            stat => {

                if (
                    statMap.has(
                        stat.type
                    )
                ) {

                    statMap.get(
                        stat.type
                    ).away =
                        stat.value;
                }
            }
        );

        statsHTML =
            Array.from(
                statMap.entries()
            )
            .map(
                ([name, value]) => `
                    <div class="stat-row">

                        <div class="stat-home">
                            ${escapeHTML(
                                value.home ?? "-"
                            )}
                        </div>

                        <div class="stat-name">
                            ${escapeHTML(
                                name
                            )}
                        </div>

                        <div>
                            ${escapeHTML(
                                value.away ?? "-"
                            )}
                        </div>

                    </div>
                `
            )
            .join("");

    } else {

        statsHTML =
            "<p>Statistiques indisponibles.</p>";
    }


    content.innerHTML = `

        <div class="modal-league">
            ${escapeHTML(league)}
        </div>

        <div class="modal-teams">

            <div class="modal-team">

                ${
                    homeLogo
                        ? `
                            <img
                                src="${escapeHTML(homeLogo)}"
                                alt="${escapeHTML(home)}"
                            >
                        `
                        : "⚽"
                }

                <div class="modal-team-name">
                    ${escapeHTML(home)}
                </div>

            </div>


            <div>

                <div class="modal-score">
                    ${escapeHTML(homeScore)}
                    -
                    ${escapeHTML(awayScore)}
                </div>

                <div class="modal-status">
                    ${escapeHTML(status)}
                </div>

            </div>


            <div class="modal-team">

                ${
                    awayLogo
                        ? `
                            <img
                                src="${escapeHTML(awayLogo)}"
                                alt="${escapeHTML(away)}"
                            >
                        `
                        : "⚽"
                }

                <div class="modal-team-name">
                    ${escapeHTML(away)}
                </div>

            </div>

        </div>


        <div class="modal-info">

            <div class="modal-info-item">
                <small>Date</small>
                ${escapeHTML(
                    formatDate(
                        fixture?.date
                    )
                )}
            </div>

            <div class="modal-info-item">
                <small>Heure</small>
                ${
                    fixture?.date
                        ? new Date(
                            fixture.date
                          ).toLocaleTimeString(
                            "fr-FR",
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                          )
                        : "-"
                }
            </div>

            <div class="modal-info-item">
                <small>Stade</small>
                ${escapeHTML(
                    venue
                )}
            </div>

            <div class="modal-info-item">
                <small>Ville</small>
                ${escapeHTML(
                    city
                )}
            </div>

            <div class="modal-info-item">
                <small>Arbitre</small>
                ${escapeHTML(
                    referee
                )}
            </div>

            <div class="modal-info-item">
                <small>Journée</small>
                ${escapeHTML(
                    round
                )}
            </div>

            <div class="modal-info-item">
                <small>Saison</small>
                ${escapeHTML(
                    season
                )}
            </div>

        </div>


        <div class="modal-section">

            <h3>
                Événements
            </h3>

            ${eventsHTML}

        </div>


        <div class="modal-section">

            <h3>
                Statistiques
            </h3>

            ${statsHTML}

        </div>
    `;

    modal.classList.add(
        "show"
    );

    document.body.style.overflow =
        "hidden";
}


function closeMatchDetails() {

    const modal =
        document.getElementById(
            "matchDetailsModal"
        );

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }

    document.body.style.overflow =
        "";
}


/* =========================================================
   URL MATCH
========================================================= */

function openMatchFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const matchId =
        params.get(
            "match"
        );

    if (!matchId) {
        return;
    }

    const match =
        matchStore.get(
            String(matchId)
        );

    if (match) {

        openMatchModal(
            match
        );
    }
}


window.addEventListener(
    "popstate",
    openMatchFromURL
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeMatchDetails();
        }
    }
);


/* =========================================================
   DATE BAR
========================================================= */

function initDateBar() {

    const dateInput =
        document.getElementById(
            "datePicker"
        );

    if (!dateInput) {
        return;
    }

    if (!dateInput.value) {

        dateInput.value =
            new Date()
                .toISOString()
                .split("T")[0];
    }

    currentDate =
        dateInput.value;

    dateInput.addEventListener(
        "change",
        () => {

            currentDate =
                dateInput.value;

            currentFilter =
                "all";

            go("scores");
        }
    );


    const previous =
        document.getElementById(
            "prevDay"
        );

    const next =
        document.getElementById(
            "nextDay"
        );

    if (previous) {

        previous.addEventListener(
            "click",
            () => {

                const date =
                    new Date(
                        currentDate
                    );

                date.setDate(
                    date.getDate() - 1
                );

                currentDate =
                    date
                        .toISOString()
                        .split("T")[0];

                dateInput.value =
                    currentDate;

                loadMatches(
                    currentDate
                );
            }
        );
    }


    if (next) {

        next.addEventListener(
            "click",
            () => {

                const date =
                    new Date(
                        currentDate
                    );

                date.setDate(
                    date.getDate() + 1
                );

                currentDate =
                    date
                        .toISOString()
                        .split("T")[0];

                dateInput.value =
                    currentDate;

                loadMatches(
                    currentDate
                );
            }
        );
    }
}


/* =========================================================
   LEAGUES
========================================================= */

const leagues = [

    {
        name: "Premier League",
        country: "England",
        logo: "https://media.api-sports.io/football/leagues/39.png"
    },

    {
        name: "La Liga",
        country: "Spain",
        logo: "https://media.api-sports.io/football/leagues/140.png"
    },

    {
        name: "Serie A",
        country: "Italy",
        logo: "https://media.api-sports.io/football/leagues/135.png"
    },

    {
        name: "Bundesliga",
        country: "Germany",
        logo: "https://media.api-sports.io/football/leagues/78.png"
    },

    {
        name: "Ligue 1",
        country: "France",
        logo: "https://media.api-sports.io/football/leagues/61.png"
    },

    {
        name: "UEFA Champions League",
        country: "Europe",
        logo: "https://media.api-sports.io/football/leagues/2.png"
    },

    {
        name: "Europa League",
        country: "Europe",
        logo: "https://media.api-sports.io/football/leagues/3.png"
    },

    {
        name: "Botola Pro",
        country: "Morocco",
        logo: "https://media.api-sports.io/football/leagues/200.png"
    }

];


function renderLeagues() {

    const container =
        document.getElementById(
            "leagueList"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        leagues
            .map(
                league => `

                    <div
                        class="league-card"
                        onclick="filterLeague('${escapeHTML(
                            league.name
                        )}')"
                    >

                        <img
                            src="${escapeHTML(
                                league.logo
                            )}"
                            alt="${escapeHTML(
                                league.name
                            )}"
                            loading="lazy"
                        >

                        <div>

                            <h3>
                                ${escapeHTML(
                                    league.name
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    league.country
                                )}
                            </p>

                        </div>

                    </div>
                `
            )
            .join("");
}


function filterLeague(
    leagueName
) {

    currentFilter =
        leagueName;

    go("scores");
}


/* =========================================================
   TEAMS
========================================================= */

const teams = [

    {
        name: "Real Madrid",
        country: "Spain",
        logo: "https://media.api-sports.io/football/teams/541.png"
    },

    {
        name: "Barcelona",
        country: "Spain",
        logo: "https://media.api-sports.io/football/teams/529.png"
    },

    {
        name: "Manchester City",
        country: "England",
        logo: "https://media.api-sports.io/football/teams/50.png"
    },

    {
        name: "Manchester United",
        country: "England",
        logo: "https://media.api-sports.io/football/teams/33.png"
    },

    {
        name: "Liverpool",
        country: "England",
        logo: "https://media.api-sports.io/football/teams/40.png"
    },

    {
        name: "Bayern Munich",
        country: "Germany",
        logo: "https://media.api-sports.io/football/teams/157.png"
    },

    {
        name: "PSG",
        country: "France",
        logo: "https://media.api-sports.io/football/teams/85.png"
    },

    {
        name: "Wydad AC",
        country: "Morocco",
        logo: "https://media.api-sports.io/football/teams/967.png"
    },

    {
        name: "Raja Casablanca",
        country: "Morocco",
        logo: "https://media.api-sports.io/football/teams/968.png"
    }

];


function renderTeams() {

    const container =
        document.getElementById(
            "teamList"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        teams
            .map(
                team => `

                    <div
                        class="team-card"
                        onclick="showTeam('${escapeHTML(
                            team.name
                        )}')"
                    >

                        <img
                            src="${escapeHTML(
                                team.logo
                            )}"
                            alt="${escapeHTML(
                                team.name
                            )}"
                            loading="lazy"
                        >

                        <h3>
                            ${escapeHTML(
                                team.name
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                team.country
                            )}
                        </p>

                    </div>

                `
            )
            .join("");
}


function showTeam(
    teamName
) {

    showToast(
        `Équipe: ${teamName}`
    );
}


/* =========================================================
   NEWS
========================================================= */

const news = [

    {
        title: "Toute l'actualité du football",
        text: "Suivez les résultats, matchs et compétitions sur BakhiraFoot.",
        image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80"
    },

    {
        title: "Les grands matchs",
        text: "Retrouvez les informations essentielles des rencontres.",
        image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80"
    },

    {
        title: "Football mondial",
        text: "Premier League, Liga, Ligue 1, Serie A et plus encore.",
        image: "https://images.unsplash.com/photo-1518600506278-4e8ef466b810?auto=format&fit=crop&w=900&q=80"
    }

];


function renderNews() {

    const container =
        document.getElementById(
            "newsList"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        news
            .map(
                article => `

                    <article
                        class="news-card"
                    >

                        <img
                            src="${escapeHTML(
                                article.image
                            )}"
                            alt="${escapeHTML(
                                article.title
                            )}"
                            loading="lazy"
                        >

                        <div class="news-content">

                            <h3>
                                ${escapeHTML(
                                    article.title
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    article.text
                                )}
                            </p>

                        </div>

                    </article>

                `
            )
            .join("");
}


function renderHomeNews() {

    const container =
        document.getElementById(
            "homeNews"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        news
            .slice(0, 3)
            .map(
                article => `

                    <article
                        class="news-card"
                    >

                        <img
                            src="${escapeHTML(
                                article.image
                            )}"
                            alt="${escapeHTML(
                                article.title
                            )}"
                            loading="lazy"
                        >

                        <div class="news-content">

                            <h3>
                                ${escapeHTML(
                                    article.title
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    article.text
                                )}
                            </p>

                        </div>

                    </article>

                `
            )
            .join("");
}


/* =========================================================
   HOME MATCHES
========================================================= */

async function renderHomeMatches() {

    const container =
        document.getElementById(
            "homeMatches"
        );

    if (!container) {
        return;
    }

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    try {

        const data =
            await fetchCached(
                `${API_BASE}/api?date=${today}`
            );

        const matches =
            normalizeMatches(data);

        storeMatches(
            matches
        );

        const firstMatches =
            matches.slice(
                0,
                6
            );

        if (!firstMatches.length) {

            container.innerHTML =
                emptyCard(
                    "Aucun match aujourd'hui"
                );

            return;
        }

        container.innerHTML =
            firstMatches
                .map(
                    createMatchHTML
                )
                .join("");

    } catch (error) {

        console.error(
            "HOME MATCHES ERROR:",
            error
        );

        container.innerHTML =
            emptyCard(
                "Impossible de charger les matchs"
            );
    }
}


/* =========================================================
   TABLES
========================================================= */

function renderTables() {

    const container =
        document.getElementById(
            "tables"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `

        <div class="table-card">

            <h3>
                Classement
            </h3>

            <p>
                Les classements seront disponibles prochainement.
            </p>

        </div>
    `;
}


/* =========================================================
   HOME
========================================================= */

function renderHome() {

    renderHomeNews();

    renderTables();

    renderHomeMatches();
}


/* =========================================================
   FILTERS
========================================================= */

function initFilters() {

    document
        .querySelectorAll(
            "[data-filter]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            "[data-filter]"
                        )
                        .forEach(
                            btn =>
                                btn.classList.remove(
                                    "active"
                                )
                        );

                    button.classList.add(
                        "active"
                    );

                    currentFilter =
                        button.dataset.filter ||
                        "all";

                    loadMatches(
                        currentDate
                    );
                }
            );
        });
}


/* =========================================================
   SEARCH
========================================================= */

function initSearch() {

    const search =
        document.getElementById(
            "searchInput"
        );

    if (!search) {
        return;
    }

    search.addEventListener(
        "input",
        () => {

            const query =
                search.value
                    .trim()
                    .toLowerCase();

            document
                .querySelectorAll(
                    ".match-card"
                )
                .forEach(card => {

                    const text =
                        card.textContent
                            .toLowerCase();

                    card.style.display =
                        text.includes(
                            query
                        )
                            ? ""
                            : "none";
                });
        }
    );
}


/* =========================================================
   THEME
========================================================= */

function initTheme() {

    const button =
        document.getElementById(
            "themeToggle"
        );

    if (!button) {
        return;
    }

    const savedTheme =
        localStorage.getItem(
            "bakhira-theme"
        );

    if (
        savedTheme === "dark"
    ) {

        document.body.classList.add(
            "dark"
        );
    }


    button.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );

            const dark =
                document.body.classList.contains(
                    "dark"
                );

            localStorage.setItem(
                "bakhira-theme",
                dark
                    ? "dark"
                    : "light"
            );
        }
    );
}


/* =========================================================
   NAVIGATION BUTTONS
========================================================= */

function initNavigation() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const page =
                        button.dataset.page;

                    if (page) {

                        go(page);
                    }
                }
            );
        });


    /* Special links */

    document
        .querySelectorAll(
            ".nav-link"
        )
        .forEach(link => {

            link.addEventListener(
                "click",
                event => {

                    const page =
                        link.dataset.page;

                    if (page) {

                        event.preventDefault();

                        go(page);
                    }
                }
            );
        });
}


/* =========================================================
   LIVE AUTO REFRESH
========================================================= */

let liveRefreshTimer =
    null;


function startLiveRefresh() {

    if (
        liveRefreshTimer
    ) {

        clearInterval(
            liveRefreshTimer
        );
    }

    liveRefreshTimer =
        setInterval(
            () => {

                const scoresPage =
                    document.getElementById(
                        "scores"
                    );

                if (
                    scoresPage &&
                    scoresPage.classList.contains(
                        "active"
                    )
                ) {

                    loadLive();
                }

            },
            60 * 1000
        );
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "⚽ BakhiraFoot started"
        );

        createMatchModal();

        initDateBar();

        initFilters();

        initSearch();

        initTheme();

        initNavigation();

        renderLeagues();

        renderTeams();

        renderNews();

        renderHome();

        startLiveRefresh();


        /* Default page */

        const activePage =
            document.querySelector(
                ".page.active"
            );

        if (!activePage) {

            go("home");
        }


        /* Load LIVE */

        loadLive();


        /* URL match */

        setTimeout(
            () => {

                openMatchFromURL();

            },
            1500
        );
    }
);
