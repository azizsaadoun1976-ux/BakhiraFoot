// ========================================
// BAKHIRAFOOT
// ========================================

let currentDate = new Date();

// ========================================
// DATE
// ========================================

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// ========================================
// DATE BAR
// ========================================

function createDateBar() {

    const datesBox = document.querySelector(".dates");

    if (!datesBox) return;

    datesBox.innerHTML = "";

    // 25 → 31 septembre 2026
    const startDate = new Date("2026-09-25T00:00:00");

    for (let i = 0; i < 7; i++) {

        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const day = date.getDate();
        const month = date.getMonth() + 1;

        const names = [
            "VEN",
            "SAM",
            "DIM",
            "LUN",
            "MAR",
            "MER",
            "JEU"
        ];

        const dateString = formatDate(date);

        const button = document.createElement("button");

        button.innerHTML = `
            <b>${day} SEP</b>
            <br>
            <small>${names[i]}</small>
        `;

        button.onclick = () => {

            currentDate = new Date(date);

            document
                .querySelectorAll(".dates button")
                .forEach(btn => btn.classList.remove("selected"));

            button.classList.add("selected");

            loadMatches(currentDate);
        };

        if (i === 1) {
            button.classList.add("selected");
            currentDate = new Date(date);
        }

        datesBox.appendChild(button);
    }
}


// ========================================
// LOAD MATCHES
// ========================================

async function loadMatches(date = currentDate) {

    try {

        const dateString = formatDate(date);

        const response = await fetch(
            `/api/matches?date=${dateString}`
        );

        const data = await response.json();

        const matches = data.response || [];

        console.log("DATE :", dateString);
        console.log("MATCHS :", matches.length);

        renderMatches(matches);

    } catch (error) {

        console.error(error);

        const box = document.getElementById("scoreList");

        if (box) {
            box.innerHTML = `
                <div class="card">
                    ❌ Erreur de chargement des matchs
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

        if (scoreList) scoreList.innerHTML = empty;
        if (homeMatches) homeMatches.innerHTML = empty;

        return;
    }


    const html = matches.map(match => {

        const home =
            match.teams?.home?.name || "?";

        const away =
            match.teams?.away?.name || "?";

        const homeLogo =
            match.teams?.home?.logo || "";

        const awayLogo =
            match.teams?.away?.logo || "";

        const homeScore =
            match.goals?.home ?? "-";

        const awayScore =
            match.goals?.away ?? "-";

        const league =
            match.league?.name || "Football";

        const country =
            match.league?.country || "";

        const status =
            match.fixture?.status?.short || "";

        const time =
            new Date(match.fixture.date)
                .toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit"
                });


        let statusText = `🕐 ${time}`;

        if (
            status === "1H" ||
            status === "2H" ||
            status === "HT" ||
            status === "ET" ||
            status === "P" ||
            status === "BT"
        ) {
            statusText = "🔴 LIVE";
        }

        if (
            status === "FT" ||
            status === "AET" ||
            status === "PEN"
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

                    <small>${country}</small>

                </div>


                <div style="
                    display:grid;
                    grid-template-columns:1fr 90px 1fr;
                    align-items:center;
                    gap:15px;
                    text-align:center;
                ">


                    <!-- HOME -->

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


                    <!-- SCORE -->

                    <div>

                        <strong style="
                            font-size:22px;
                        ">
                            ${homeScore} - ${awayScore}
                        </strong>

                        <br>

                        <small>
                            ${statusText}
                        </small>

                    </div>


                    <!-- AWAY -->

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


    // HOME PAGE

    if (homeMatches) {

        homeMatches.innerHTML =
            matches
                .slice(0, 10)
                .map(match => {

                    const home =
                        match.teams?.home?.name || "?";

                    const away =
                        match.teams?.away?.name || "?";

                    const homeLogo =
                        match.teams?.home?.logo || "";

                    const awayLogo =
                        match.teams?.away?.logo || "";

                    const homeScore =
                        match.goals?.home ?? "-";

                    const awayScore =
                        match.goals?.away ?? "-";

                    const league =
                        match.league?.name || "Football";

                    const time =
                        new Date(match.fixture.date)
                            .toLocaleTimeString(
                                "fr-FR",
                                {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }
                            );

                    return `
                        <div class="card">

                            <small>
                                🏆 ${league}
                            </small>

                            <div style="
                                display:grid;
                                grid-template-columns:1fr 70px 1fr;
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
                                    ${homeScore} -
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

                            <small>
                                🕐 ${time}
                            </small>

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
            await fetch("/api/live");

        const data =
            await response.json();

        const matches =
            data.response || [];

        const live =
            document.getElementById("live");

        if (!live) return;


        if (!matches.length) {

            live.innerHTML =
                "⚪ Aucun match live";

        } else {

            live.innerHTML =
                `🔴 ${matches.length} MATCH(S) LIVE`;

        }

    } catch (error) {

        console.error(error);

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

            <div class="card">

                <h3>
                    ⚽ ${team}
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

        <div class="card">

            <h2>
                ⚽ ${team}
            </h2>

            <p>
                Informations de l'équipe.
            </p>

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
            text: "Toutes les dernières informations du football."
        },

        {
            title: "🏆 Compétitions",
            text: "Suivez les grandes compétitions européennes."
        },

        {
            title: "🔥 Matchs du jour",
            text: "Découvrez les matchs programmés."
        },

        {
            title: "🇲🇦 Football marocain",
            text: "Suivez l'actualité du football marocain."
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


    if (newsGrid) {
        newsGrid.innerHTML = html;
    }

    if (homeNews) {
        homeNews.innerHTML = html;
    }
}


// ========================================
// NAVIGATION
// ========================================

function go(page) {

    document.querySelectorAll(".page")
        .forEach(p => {
            p.classList.remove("active");
        });


    const target =
        document.getElementById(page);

    if (target) {
        target.classList.add("active");
    }


    document.querySelectorAll("nav button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });
}


// ========================================
// NAV BUTTONS
// ========================================

document.querySelectorAll(
    "nav button"
).forEach(button => {

    button.addEventListener(
        "click",
        () => {
            go(button.dataset.page);
        }
    );

});


// ========================================
// DARK MODE
// ========================================

const theme =
    document.getElementById("theme");

if (theme) {

    theme.addEventListener(
        "click",
        () => {

            document.body.classList.toggle("dark");

        }
    );

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
                this.value.toLowerCase();

            document.querySelectorAll(
                ".card"
            ).forEach(card => {

                const text =
                    card.innerText.toLowerCase();

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

loadNews();


// ========================================
// AUTO UPDATE
// ========================================

setInterval(() => {

    loadMatches(currentDate);

    loadLive();

}, 30000);