(() => {
  "use strict";

  const originalOpenMatchDetails =
    window.openMatchDetails;

  if (typeof originalOpenMatchDetails !== "function") {
    console.warn(
      "BakhiraFoot Match Center: openMatchDetails not found."
    );
    return;
  }

  let requestId = 0;

  let lastClickedFixtureId = null;

document.addEventListener(
  "click",
  (event) => {

    const card =
      event.target.closest(".match-card");

    if (!card) return;

    const fixtureId =
      card.dataset.fixtureId;

    if (fixtureId) {
      lastClickedFixtureId = fixtureId;
    }
  },
  true
);

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getContent() {
    return document.getElementById(
      "matchDetailsContent"
    );
  }

  function section(title, content) {
    return `
      <div class="bf-detail-section bf-mc-section">
        <h3>${title}</h3>
        ${content}
      </div>
    `;
  }

  function emptyText(text) {
    return `
      <p style="opacity:.65;margin:0">
        ${escapeHTML(text)}
      </p>
    `;
  }

  function getTeamNameById(fixture, teamId) {
    if (
      teamId &&
      String(teamId) ===
        String(fixture?.home?.id)
    ) {
      return fixture?.home?.name || "Domicile";
    }

    if (
      teamId &&
      String(teamId) ===
        String(fixture?.away?.id)
    ) {
      return fixture?.away?.name || "Extérieur";
    }

    return "";
  }

  function eventIcon(event) {
    const type =
      String(event?.type || "").toLowerCase();

    const detail =
      String(event?.detail || "").toLowerCase();

    if (type.includes("goal")) {
      return "⚽";
    }

    if (
      type.includes("card") ||
      detail.includes("yellow")
    ) {
      return "🟨";
    }

    if (
      detail.includes("red") ||
      detail.includes("second yellow")
    ) {
      return "🟥";
    }

    if (
      type.includes("subst") ||
      type.includes("substitution")
    ) {
      return "🔄";
    }

    return "•";
  }

  function renderEvents(events, fixture) {
    if (!Array.isArray(events) || !events.length) {
      return emptyText(
        "Aucun événement supplémentaire disponible."
      );
    }

    return `
      <div class="bf-mc-events">

        ${events
          .map((event) => {

            const minute =
              event?.time ??
              event?.minute ??
              "";

            const player =
              event?.playerName ||
              event?.player?.name ||
              "";

            const assist =
              event?.assistName ||
              event?.assist?.name ||
              "";

            const team =
              getTeamNameById(
                fixture,
                event?.teamId
              );

            const type =
              event?.type || "";

            const detail =
              event?.detail || "";

            return `
              <div class="bf-mc-event-row">

                <span class="bf-mc-event-minute">
                  ${escapeHTML(
                    minute !== ""
                      ? `${minute}'`
                      : "—"
                  )}
                </span>

                <span class="bf-mc-event-icon">
                  ${eventIcon(event)}
                </span>

                <div class="bf-mc-event-main">

                  <strong>
                    ${escapeHTML(
                      player || type
                    )}
                  </strong>

                  ${
                    detail
                      ? `
                        <span>
                          ${escapeHTML(detail)}
                        </span>
                      `
                      : ""
                  }

                  ${
                    assist
                      ? `
                        <small>
                          Assist :
                          ${escapeHTML(assist)}
                        </small>
                      `
                      : ""
                  }

                  ${
                    team
                      ? `
                        <small>
                          ${escapeHTML(team)}
                        </small>
                      `
                      : ""
                  }

                </div>

              </div>
            `;
          })
          .join("")}

      </div>
    `;
  }

  function renderStats(statistics) {
    if (
      !Array.isArray(statistics) ||
      !statistics.length
    ) {
      return emptyText(
        "Statistiques détaillées non disponibles pour ce match."
      );
    }

    return statistics
      .map((teamBlock) => {

        const teamName =
          teamBlock?.team?.name ||
          teamBlock?.teamName ||
          "";

        const values =
          Array.isArray(
            teamBlock?.statistics
          )
            ? teamBlock.statistics
            : [];

        if (!values.length) {
          return "";
        }

        return `
          <div class="bf-mc-stat-team">

            ${
              teamName
                ? `
                  <strong class="bf-mc-stat-team-name">
                    ${escapeHTML(teamName)}
                  </strong>
                `
                : ""
            }

            <div class="bf-mc-stat-list">

              ${values
                .map((stat) => {

                  const label =
                    stat?.type ||
                    stat?.name ||
                    "";

                  const value =
                    stat?.value ??
                    stat?.val ??
                    "";

                  return `
                    <div class="bf-mc-stat-row">

                      <span>
                        ${escapeHTML(label)}
                      </span>

                      <strong>
                        ${escapeHTML(value)}
                      </strong>

                    </div>
                  `;
                })
                .join("")}

            </div>

          </div>
        `;
      })
      .join("");
  }

  function renderLineups(lineups) {
    if (
      !Array.isArray(lineups) ||
      !lineups.length
    ) {
      return emptyText(
        "Les compositions ne sont pas disponibles pour ce match."
      );
    }

    const blocks = [];

    lineups.forEach((teamBlock) => {

      const teamName =
        teamBlock?.team?.name ||
        teamBlock?.teamName ||
        "";

      const formation =
        teamBlock?.formation ||
        "";

      const startXI =
        Array.isArray(teamBlock?.startXI)
          ? teamBlock.startXI
          : [];

      const substitutes =
        Array.isArray(
          teamBlock?.substitutes
        )
          ? teamBlock.substitutes
          : [];

      const players = [
        ...startXI.map((item) => ({
          item,
          status: "Titulaire"
        })),
        ...substitutes.map((item) => ({
          item,
          status: "Remplaçant"
        }))
      ];

      blocks.push(`
        <div class="bf-mc-lineup-team">

          <div class="bf-mc-lineup-head">

            <strong>
              ${escapeHTML(
                teamName || "Équipe"
              )}
            </strong>

            ${
              formation
                ? `
                  <span>
                    ${escapeHTML(
                      formation
                    )}
                  </span>
                `
                : ""
            }

          </div>

          ${
            players.length
              ? `
                <div class="bf-mc-player-list">

                  ${players
                    .map(({ item, status }) => {

                      const player =
                        item?.player ||
                        item;

                      const name =
                        player?.name ||
                        player?.playerName ||
                        "Joueur";

                      const number =
                        player?.number ??
                        "";

                      return `
                        <div class="bf-mc-player-row">

                          <span class="bf-mc-shirt">
                            ${escapeHTML(
                              number
                            )}
                          </span>

                          <span>
                            ${escapeHTML(
                              name
                            )}
                          </span>

                          <small>
                            ${status}
                          </small>

                        </div>
                      `;
                    })
                    .join("")}

                </div>
              `
              : emptyText(
                  "Aucun joueur détaillé."
                )
          }

        </div>
      `);
    });

    return blocks.join("");
  }

  function renderPlayers(players) {
    if (
      !Array.isArray(players) ||
      !players.length
    ) {
      return emptyText(
        "Les notes/statistiques des joueurs ne sont pas disponibles."
      );
    }

    return `
      <div class="bf-mc-player-ratings">

        ${players
          .map((block) => {

            const teamName =
              block?.team?.name ||
              block?.teamName ||
              "";

            const list =
              Array.isArray(block?.players)
                ? block.players
                : [block];

            return `
              <div class="bf-mc-player-team">

                ${
                  teamName
                    ? `
                      <strong>
                        ${escapeHTML(teamName)}
                      </strong>
                    `
                    : ""
                }

                ${list
                  .map((playerBlock) => {

                    const player =
                      playerBlock?.player ||
                      playerBlock;

                    const name =
                      player?.name ||
                      player?.playerName ||
                      "Joueur";

                    const statistics =
                      playerBlock?.statistics ||
                      playerBlock?.stats ||
                      {};

                    const rating =
                      playerBlock?.rating ??
                      statistics?.rating ??
                      null;

                    return `
                      <div class="bf-mc-rating-row">

                        <span>
                          ${escapeHTML(name)}
                        </span>

                        ${
                          rating !== null &&
                          rating !== undefined
                            ? `
                              <strong>
                                ⭐ ${escapeHTML(
                                  rating
                                )}
                              </strong>
                            `
                            : `
                              <small>
                                Pas de note
                              </small>
                            `
                        }

                      </div>
                    `;
                  })
                  .join("")}

              </div>
            `;
          })
          .join("")}

      </div>
    `;
  }

  function renderInfo(fixture) {
    const venue =
      fixture?.venue?.name ||
      fixture?.stadium?.name ||
      null;

    const city =
      fixture?.venue?.city ||
      fixture?.stadium?.city ||
      null;

    const referee =
      fixture?.referee ||
      null;

    if (!venue && !city && !referee) {
      return "";
    }

    return section(
      "📋 Informations",
      `
        <div class="bf-detail-grid">

          ${
            venue
              ? `
                <div class="bf-detail-item">
                  <strong>🏟️ Stade</strong>
                  ${escapeHTML(venue)}
                  ${
                    city
                      ? ` — ${escapeHTML(city)}`
                      : ""
                  }
                </div>
              `
              : ""
          }

          ${
            referee
              ? `
                <div class="bf-detail-item">
                  <strong>👨‍⚖️ Arbitre</strong>
                  ${escapeHTML(referee)}
                </div>
              `
              : ""
          }

        </div>
      `
    );
  }

  function appendStyle() {
    if (
      document.getElementById(
        "bf-match-center-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "bf-match-center-style";

    style.textContent = `
      .bf-mc-section {
        margin-top: 14px;
      }

      .bf-mc-events {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .bf-mc-event-row {
        display: grid;
        grid-template-columns: 42px 30px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        padding: 9px 10px;
        border: 1px solid rgba(127,127,127,.15);
        border-radius: 10px;
        background: rgba(127,127,127,.05);
      }

      .bf-mc-event-minute {
        font-weight: 800;
        text-align: center;
      }

      .bf-mc-event-icon {
        text-align: center;
        font-size: 18px;
      }

      .bf-mc-event-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .bf-mc-event-main span,
      .bf-mc-event-main small {
        opacity: .72;
      }

      .bf-mc-stat-team,
      .bf-mc-lineup-team,
      .bf-mc-player-team {
        margin-bottom: 14px;
      }

      .bf-mc-stat-team-name,
      .bf-mc-lineup-head,
      .bf-mc-player-team > strong {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }

      .bf-mc-stat-list,
      .bf-mc-player-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .bf-mc-stat-row,
      .bf-mc-player-row,
      .bf-mc-rating-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(127,127,127,.05);
      }

      .bf-mc-player-row {
        justify-content: flex-start;
      }

      .bf-mc-player-row small {
        margin-left: auto;
        opacity: .6;
      }

      .bf-mc-shirt {
        width: 28px;
        text-align: center;
        font-weight: 800;
        opacity: .7;
      }

      .bf-mc-player-ratings {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .bf-mc-rating-row {
        margin-top: 5px;
      }

      @media (max-width: 600px) {
        .bf-mc-event-row {
          grid-template-columns: 36px 26px minmax(0,1fr);
          padding: 8px;
        }

        .bf-mc-event-main {
          font-size: 12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  appendStyle();

  window.openMatchDetails =
  async function (index) {

    const clickedFixtureId =
      lastClickedFixtureId;

    /*
     * Find the real match using fixture ID,
     * not the visual card index.
     */

    let actualIndex = -1;

    if (
      clickedFixtureId &&
      Array.isArray(window.currentMatches)
    ) {
      actualIndex =
        window.currentMatches.findIndex(
          (match) =>
            String(
              match?.fixture?.id ||
              match?.id ||
              ""
            ) ===
            String(clickedFixtureId)
        );
    }

    /*
     * Fallback for live matches / old behavior
     */

    if (
      actualIndex < 0 &&
      Array.isArray(window.currentMatches)
    ) {
      actualIndex = index;
    }

    /*
     * Open the original modal
     * using the REAL match index.
     */

    originalOpenMatchDetails(
      actualIndex
    );

    /*
     * Get the real fixture ID.
     */

    let fixtureId =
      clickedFixtureId || null;

    if (
      !fixtureId &&
      Array.isArray(window.currentMatches) &&
      actualIndex >= 0
    ) {
      const match =
        window.currentMatches[
          actualIndex
        ];

      fixtureId =
        match?.fixture?.id ||
        match?.id ||
        null;
    }

    const content =
      getContent();

    if (
      !fixtureId ||
      !content
    ) {
      return;
    }

    const currentRequest =
      ++requestId;

    /*
     * Loading
     */

    content.insertAdjacentHTML(
      "beforeend",
      `
        <div
          id="bfMatchCenterLoading"
          class="bf-detail-section bf-mc-section"
        >
          <h3>⚡ Match Center</h3>

          <p style="opacity:.7;margin:0">
            Chargement des détails...
          </p>
        </div>
      `
    );

    try {

      const response =
        await fetch(
          `/api?fixture=${encodeURIComponent(
            fixtureId
          )}&details=all`,
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      /*
       * Ignore old requests
       */

      if (
        currentRequest !== requestId
      ) {
        return;
      }

      const loading =
        document.getElementById(
          "bfMatchCenterLoading"
        );

      if (loading) {
        loading.remove();
      }

      const fixture =
        data?.fixture || {};

      const events =
        Array.isArray(data?.events)
          ? data.events
          : [];

      const lineups =
        Array.isArray(data?.lineups)
          ? data.lineups
          : [];

      const statistics =
        Array.isArray(data?.statistics)
          ? data.statistics
          : [];

      const players =
        Array.isArray(data?.players)
          ? data.players
          : [];

      /*
       * Add details to the
       * CORRECT match modal
       */

      const html = [

        renderInfo(
          fixture
        ),

        section(
          "⚡ Événements",
          renderEvents(
            events,
            fixture
          )
        ),

        section(
          "👥 Compositions",
          renderLineups(
            lineups
          )
        ),

        section(
          "📊 Statistiques",
          renderStats(
            statistics
          )
        ),

        section(
          "⭐ Joueurs",
          renderPlayers(
            players
          )
        )

      ].join("");

      content.insertAdjacentHTML(
        "beforeend",
        html
      );

    } catch (error) {

      console.error(
        "BF MATCH CENTER ERROR:",
        error
      );

      const loading =
        document.getElementById(
          "bfMatchCenterLoading"
        );

      if (loading) {

        loading.innerHTML = `
          <h3>⚠️ Match Center</h3>

          <p style="opacity:.7;margin:0">
            تعذر تحميل التفاصيل الإضافية.
          </p>
        `;
      }
    }
  };
      /*
       * أول حاجة: نخلي function القديمة
       * تخدم كما هي.
       */

      originalOpenMatchDetails(index);

      const card =
        document.querySelector(
          `.match-card[data-match-index="${index}"]`
        );

      const fixtureId =
        card?.dataset?.fixtureId;

      const content =
        getContent();

      if (!fixtureId || !content) {
        return;
      }

      const currentRequest =
        ++requestId;

      /*
       * Loading فقط داخل Match Center
       */

      content.insertAdjacentHTML(
        "beforeend",
        `
          <div
            id="bfMatchCenterLoading"
            class="bf-detail-section bf-mc-section"
          >
            <h3>⚡ Match Center</h3>
            <p style="opacity:.7;margin:0">
              Chargement des détails...
            </p>
          </div>
        `
      );

      try {

        const response =
          await fetch(
            `/api?fixture=${encodeURIComponent(
              fixtureId
            )}&details=all`,
            {
              cache: "no-store"
            }
          );

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        /*
         * User may have opened another match
         */

        if (
          currentRequest !== requestId
        ) {
          return;
        }

        const loading =
          document.getElementById(
            "bfMatchCenterLoading"
          );

        if (loading) {
          loading.remove();
        }

        const fixture =
          data?.fixture ||
          {};

        const events =
          Array.isArray(data?.events)
            ? data.events
            : [];

        const lineups =
          Array.isArray(data?.lineups)
            ? data.lineups
            : [];

        const statistics =
          Array.isArray(data?.statistics)
            ? data.statistics
            : [];

        const players =
          Array.isArray(data?.players)
            ? data.players
            : [];

        const html = [

          renderInfo(fixture),

          section(
            "⚡ Événements",
            renderEvents(
              events,
              fixture
            )
          ),

          section(
            "👥 Compositions",
            renderLineups(
              lineups
            )
          ),

          section(
            "📊 Statistiques",
            renderStats(
              statistics
            )
          ),

          section(
            "⭐ Joueurs",
            renderPlayers(
              players
            )
          )

        ].join("");

        content.insertAdjacentHTML(
          "beforeend",
          html
        );

      } catch (error) {

        console.error(
          "BF MATCH CENTER ERROR:",
          error
        );

        const loading =
          document.getElementById(
            "bfMatchCenterLoading"
          );

        if (loading) {
          loading.innerHTML = `
            <h3>⚠️ Match Center</h3>
            <p style="opacity:.7;margin:0">
              تعذر تحميل التفاصيل الإضافية.
            </p>
          `;
        }
      }
    };
})();
