async function loadLive() {
    try {
        console.log("KICKOFF LIVE...");

        const response = await fetch(`${API_BASE}/api/live`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const matches = result.data || [];

        console.log("LIVE MATCHES:", matches.length);

        const live = document.getElementById("live");
        const scoreList = document.getElementById("scoreList");

        if (live) {
            live.innerHTML = matches.length
                ? `🔴 ${matches.length} MATCH(S) LIVE`
                : "⚪ Aucun match live";
        }

        // عرض الماتشات LIVE بنفس design الموجود
        if (scoreList && matches.length) {

            scoreList.innerHTML = matches.map(match => {

                const home = match.home?.name || "?";
                const away = match.away?.name || "?";

                const homeLogo = match.home?.logo || "";
                const awayLogo = match.away?.logo || "";

                const homeScore = match.score?.home ?? 0;
                const awayScore = match.score?.away ?? 0;

                const league = match.league?.name || "Football";

                const minute =
                    match.status?.elapsed
                        ? `${match.status.elapsed}'`
                        : "LIVE";

                return `
                    <div class="card">

                        <small>
                            🏆 ${league}
                        </small>

                        <div class="teams">

                            <div class="team">

                                ${
                                    homeLogo
                                    ? `<img
                                        class="teamLogo"
                                        src="${homeLogo}"
                                        alt="${home}"
                                    >`
                                    : "⚽"
                                }

                                <span>${home}</span>

                            </div>

                            <div class="score">

                                <strong>
                                    ${homeScore} - ${awayScore}
                                </strong>

                                <small class="red">
                                    🔴 LIVE ${minute}
                                </small>

                            </div>

                            <div class="team">

                                ${
                                    awayLogo
                                    ? `<img
                                        class="teamLogo"
                                        src="${awayLogo}"
                                        alt="${away}"
                                    >`
                                    : "⚽"
                                }

                                <span>${away}</span>

                            </div>

                        </div>

                    </div>
                `;

            }).join("");
        }

    } catch (error) {

        console.error("Erreur LIVE:", error);

        const live = document.getElementById("live");

        if (live) {
            live.innerHTML = "⚪ Live indisponible";
        }
    }
}
