// ========================================
// BAKHIRAFOOT PRO
// ========================================

const API_BASE = "https://bakhira-foot-evhxls5ni-saad-c86e.vercel.app";

let currentDate = new Date();
let currentFilter = "all";

// ========================================
// DATE
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

// ========================================
// TOAST
// ========================================

function toast(message) {
    const box = document.getElementById("toast");

    if (!box) return;

    box.textContent = message;
    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 2500);
}

// ========================================
// NAVIGATION
// ========================================

function go(page) {
    const target = document.getElementById(page);

    if (!target) return;

    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
    });

    target.classList.add("active");

    document.querySelectorAll("nav button").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

document.querySelectorAll("nav button").forEach(button => {
    button.addEventListener("click", () => {
        go(button.dataset.page);
    });
});

// ========================================
// DATE BAR
// ========================================

function createDateBar() {

    const datesBox = document.querySelector(".dates");

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

    const previous = document.createElement("button");

    previous.innerHTML = "‹";

    previous.onclick = () => {

        currentDate.setDate(
            currentDate.getDate() - 1
        );

        createDateBar();
        loadMatches(currentDate);
    };

    datesBox.appendChild(previous);

    for (let i = 0; i < 7; i++) {

        const date = new Date(today);

        date.setHours(0, 0, 0, 0);

        date.setDate(
            today.getDate() + i
        );

        const button =
            document.createElement("button");

        let label;

        if (i === 0) {
            label = "Aujourd'hui";
        }
        else if (i === 1) {
            label = "Demain";
        }
        else {
            label =
                `${date.getDate()} ${monthName(date)}`;
        }

        button.innerHTML = `
            <b>${label}</b>
            <br>
            <small>${names[date.getDay()]}</small>
        `;

        if (
            formatDate(date) ===
            formatDate(currentDate)
        ) {
            button.classList.add("selected");
        }

        button.onclick = () => {

            currentDate = new Date(date);

            createDateBar();

            loadMatches(currentDate);
        };

        datesBox.appendChild(button);
    }

    const next = document.createElement("button");

    next.innerHTML = "›";

    next.onclick = () => {

        currentDate.setDate(
            currentDate.getDate() + 1
        );

        createDateBar();

        loadMatches(currentDate);
    };

    datesBox.appendChild(next);
}

// ========================================
// LOAD MATCHES
// ========================================

async function loadMatches(date = currentDate) {

    const dateString = formatDate(date);

    try {

        const response = await fetch(
            `${API_BASE}/api/matches?date=${dateString}`
        );

        const data = await response.json();

        console.log("DATE :", dateString);
        console.log("KICKOFF API :", data);

        let matches = data.data || [];

        if (currentFilter !== "all") {

            matches = matches.filter(match => {

                const league =
                    match.league?.name || "";

                return league
                    .toLowerCase()
                    .includes(
                        currentFilter.toLowerCase()
                    );
            });
        }

        renderMatches(matches);

    }
    catch (error) {

        console.error(
            "Erreur matchs :",
            error
        );

        const box =
            document.getElementById("scoreList");

        if (box) {

            box.innerHTML = `
                <div class="card">
                    ❌ Erreur de connexion au serveur
                </div>
            `;
        }
    }
}

// ========================================
// RENDER MATCHES
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

    const html = matches.map(match => {

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
            match.league?.name || "Football";

        const status =
            match.status?.short || "";

        const time =
            match.date
                ? new Date(
                    match.date
                ).toLocaleTimeString(
                    "fr-FR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
                : "--:--";

        let statusText =
            `🕐 ${time}`;

        if (
            [
                "1H",
                "2H",
                "HT",
                "ET",
                "P",
                "BT"
            ].includes(status)
        ) {
            statusText = "🔴 LIVE";
        }

        if (
            [
                "FT",
                "AET",
                "PEN"
            ].includes(status)
        ) {
            statusText = "✅ Terminé";
        }

        return `
            <div class="card match-card">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:15px;
                ">

                    <b>🏆 ${league}</b>

                    <small>
                        ${match.status?.elapsed
                            ? match.status.elapsed + "'"
                            : ""}
                    </small>

                </div>

                <div style="
                    display:grid;
                    grid-template-columns:1fr 90px 1fr;
                    align-items:center;
                    gap:15px;
                    text-align:center;
                ">

                    <div>

                        <img
                            src="${homeLogo}"
                            alt="${home}"
                            style="
                                width:48px;
                                height:48px;
                                object-fit:contain;
                                display:block;
                                margin:auto;
                            "
                        >

                        <strong>
                            ${home}
                        </strong>

                    </div>

                    <div>

                        <strong style="
                            font-size:22px;
                        ">
                            ${homeScore} -
                            ${awayScore}
                        </strong>

                        <br>

                        <small>
                            ${statusText}
                        </small>

                    </div>

                    <div>

                        <img
                            src="${awayLogo}"
                            alt="${away}"
                            style="
                                width:48px;
                                height:48px;
                                object-fit:contain;
                                display:block;
                                margin:auto;
                            "
                        >

                        <strong>
                            ${away}
                        </strong>

                    </div>

                </div>

            </div>
        `;

    }).join("");

    if (scoreList) {
        scoreList.innerHTML = html;
    }

    if (homeMatches) {

        homeMatches.innerHTML =
            matches
                .slice(0, 10)
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

                            <small>
                                🏆 ${league}
                            </small>

                            <div style="
                                display:grid;
                                grid-template-columns:
                                    1fr 70px 1fr;
                                align-items:center;
                                text-align:center;
                                gap:10px;
                                padding:15px 0;
                            ">

                                <div>

                                    <img
                                        src="${homeLogo}"
                                        style="
                                            width:38px;
                                            height:38px;
                                            object-fit:contain;
                                        "
                                    >

                                    <br>

                                    <span>
                                        ${home}
                                    </span>

                                </div>

                                <strong>
                                    ${homeScore}
                                    -
                                    ${awayScore}
                                </strong>

                                <div>

                                    <img
                                        src="${awayLogo}"
                                        style="
                                            width:38px;
                                            height:38px;
                                            object-fit:contain;
                                        "
                                    >

                                    <br>

                                    <span>
                                        ${away}
                                    </span>

                                </div>

                            </div>

                        </div>
                    `;

                })
                .join("");
    }
}

// ========================================
// LIVE
// ========================================

async function loadLive() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/live?live=all`
            );

        const data =
            await response.json();

        const matches =
            data.data || [];

        const live =
            document.getElementById("live");

        if (!live) return;

        if (!matches.length) {

            live.innerHTML =
                "⚪ Aucun match live";

        }
        else {

            live.innerHTML =
                `🔴 ${matches.length} MATCH(S) LIVE`;
        }

    }
    catch (error) {

        console.error(
            "Erreur LIVE :",
            error
        );
    }
}

// ========================================
// COMPETITIONS
// ========================================

const competitions = [

    {
        name: "Champions League",
        icon: "🏆",
        filter: "Champions League"
    },

    {
        name: "Premier League",
        icon: "🏴",
        filter: "Premier League"
    },

    {
        name: "La Liga",
        icon: "🇪🇸",
        filter: "La Liga"
    },

    {
        name: "Ligue 1",
        icon: "🇫🇷",
        filter: "Ligue 1"
    },

    {
        name: "Botola Pro",
        icon: "🇲🇦",
        filter: "Botola"
    },

    {
        name: "Serie A",
        icon: "🇮🇹",
        filter: "Serie A"
    },

    {
        name: "Bundesliga",
        icon: "🇩🇪",
        filter: "Bundesliga"
    }

];

function loadLeagues() {

    const box =
        document.getElementById("leagueGrid");

    if (!box) return;

    box.innerHTML =
        competitions.map(league => `

            <div
                class="card league"
                onclick="
                    selectLeague(
                        '${league.filter}'
                    )
                "
            >

                <div style="
                    font-size:38px;
                    margin-bottom:10px;
                ">
                    ${league.icon}
                </div>

                <h3>
                    ${league.name}
                </h3>

                <small>
                    Voir les matchs →
                </small>

            </div>

        `).join("");
}

function selectLeague(league) {

    currentFilter = league;

    go("scores");

    document.querySelectorAll(".filter")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.filter === league
            );

        });

    loadMatches(currentDate);

    toast(
        `🏆 ${league} sélectionnée`
    );
}

// ========================================
// SIDEBAR FILTERS
// ========================================

document.querySelectorAll(".filter[data-filter]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentFilter =
                    button.dataset.filter;

                document
                    .querySelectorAll(
                        ".filter[data-filter]"
                    )
                    .forEach(btn => {
                        btn.classList.remove(
                            "active"
                        );
                    });

                button.classList.add("active");

                go("scores");

                loadMatches(currentDate);
            }
        );

    });

// ========================================
// FAVORIS
// ========================================

let favorites =
    JSON.parse(
        localStorage.getItem(
            "bakhirafoot_favorites"
        )
    ) || [];

function toggleFavorite(team) {

    if (favorites.includes(team)) {

        favorites =
            favorites.filter(
                item => item !== team
            );

        toast(
            `❌ ${team} supprimée des favoris`
        );

    }
    else {

        favorites.push(team);

        toast(
            `⭐ ${team} ajoutée aux favoris`
        );
    }

    localStorage.setItem(
        "bakhirafoot_favorites",
        JSON.stringify(favorites)
    );

    loadTeams();
}

function showFavorites() {

    go("teams");

    const box =
        document.getElementById("teamGrid");

    if (!box) return;

    if (!favorites.length) {

        box.innerHTML = `
            <div class="card">
                ⭐ Aucun favori pour le moment.
                <br><br>
                Ajoute tes équipes préférées.
            </div>
        `;

        return;
    }

    box.innerHTML =
        favorites.map(team => `

            <div class="card team">

                <div class="teamLogo">
                    ⚽
                </div>

                <h3>
                    ${team}
                </h3>

                <button
                    onclick="
                        toggleFavorite('${team}')
                    "
                >
                    ❌ Retirer
                </button>

            </div>

        `).join("");
}

const favoriteButton =
    [...document.querySelectorAll(".filter")]
        .find(button =>
            button.textContent.includes("Favoris")
        );

if (favoriteButton) {
    favoriteButton.onclick =
        showFavorites;
}

// ========================================
// TEAMS
// ========================================

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

function loadTeams() {

    const box =
        document.getElementById("teamGrid");

    if (!box) return;

    box.innerHTML =
        teams.map(team => {

            const isFavorite =
                favorites.includes(team);

            return `

                <div class="card team">

                    <div class="teamLogo">
                        ⚽
                    </div>

                    <h3>
                        ${team}
                    </h3>

                    <button
                        onclick="
                            toggleFavorite('${team}')
                        "
                    >
                        ${isFavorite
                            ? "⭐ Favori"
                            : "☆ Ajouter aux favoris"}
                    </button>

                    <button
                        onclick="
                            showTeam('${team}')
                        "
                    >
                        Voir l'équipe →
                    </button>

                </div>

            `;

        }).join("");
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
            title:
                "⚽ Actualités football",
            text:
                "Toutes les dernières informations du football."
        },

        {
            title:
                "🏆 Compétitions",
            text:
                "Suivez les grandes compétitions européennes."
        },

        {
            title:
                "🔥 Matchs du jour",
            text:
                "Découvrez les matchs programmés."
        },

        {
            title:
                "🇲🇦 Football marocain",
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
        document.getElementById(
            "newsGrid"
        );

    const homeNews =
        document.getElementById(
            "homeNews"
        );

    if (newsGrid)
        newsGrid.innerHTML = html;

    if (homeNews)
        homeNews.innerHTML = html;
}

// ========================================
// DARK MODE
// ========================================

const theme =
    document.getElementById("theme");

if (theme) {

    theme.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );

            const isDark =
                document.body.classList.contains(
                    "dark"
                );

            localStorage.setItem(
                "bakhirafoot_dark",
                isDark
            );

            theme.textContent =
                isDark ? "☀️" : "☾";
        }
    );

    if (
        localStorage.getItem(
            "bakhirafoot_dark"
        ) === "true"
    ) {

        document.body.classList.add("dark");

        theme.textContent = "☀️";
    }
}

// ========================================
// SEARCH
// ========================================

const search =
    document.getElementById("search");

if (search) {

    search.addEventListener(
        "input",
        function () {

            const value =
                this.value
                    .toLowerCase()
                    .trim();

            if (!value) {

                document
                    .querySelectorAll(".card")
                    .forEach(card => {
                        card.style.display = "";
                    });

                return;
            }

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

createDateBar();

loadMatches(currentDate);

loadLive();

loadTeams();

loadLeagues();

loadNews();

// ========================================
// AUTO UPDATE
// ========================================

setInterval(() => {

    loadMatches(currentDate);

    loadLive();

}, 60000);
