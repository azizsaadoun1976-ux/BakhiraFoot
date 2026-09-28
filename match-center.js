(() => {
  "use strict";

  let requestNumber = 0;

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

  function section(title, html) {
    return `
      <div class="bf-detail-section bf-mc-section">
        <h3>${title}</h3>
        ${html}
      </div>
    `;
  }

  function emptyMessage(text) {
    return `
      <p style="opacity:.65;margin:0">
        ${escapeHTML(text)}
      </p>
    `;
  }

  function renderEvents(events, fixture) {
    if (!Array.isArray(events) || !events.length) {
      return emptyMessage(
        "Aucun événement disponible pour ce match."
      );
    }

    return `
      <div class="bf-mc-events">

        ${events.map(event => {

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

          const type =
            event?.type ||
            "";

          const detail =
            event?.detail ||
            "";

          const teamId =
            event?.teamId;

          let teamName = "";

          if (
            String(teamId) ===
            String(fixture?.home?.id)
          ) {
            teamName =
              fixture?.home?.name || "";
          }

          if (
            String(teamId) ===
            String(fixture?.away?.id)
          ) {
            teamName =
              fixture?.away?.name || "";
          }

          let icon = "•";

          const typeLower =
            String(type).toLowerCase();

          const detailLower =
            String(detail).toLowerCase();

          if (
            typeLower.includes("goal")
          ) {
            icon = "⚽";
          }

          if (
            typeLower.includes("card") ||
            detailLower.includes("yellow")
          ) {
            icon = "🟨";
          }

          if (
            detailLower.includes("red") ||
            detailLower.includes("second yellow")
          ) {
            icon = "🟥";
          }

          if (
            typeLower.includes("subst")
          ) {
            icon = "🔄";
          }

          return `
            <div class="bf-mc-event-row">

              <div class="bf-mc-event-minute">
                ${
                  minute !== ""
                    ? escapeHTML(minute) + "'"
                    : "—"
                }
              </div>

              <div class="bf-mc-event-icon">
                ${icon}
              </div>

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
                  teamName
                    ? `
                      <small>
                        ${escapeHTML(teamName)}
                      </small>
                    `
                    : ""
                }

              </div>

            </div>
          `;
        }).join("")}

      </div>
    `;
  }

  function renderStatistics(statistics) {
    if (
      !Array.isArray(statistics) ||
      !statistics.length
    ) {
      return emptyMessage(
        "Les statistiques détaillées ne sont pas disponibles pour ce match."
      );
    }

    return statistics
      .map(teamBlock => {

        const teamName =
          teamBlock?.team?.name ||
          teamBlock?.teamName ||
          "";

        const list =
          Array.isArray(
            teamBlock?.statistics
          )
            ? teamBlock.statistics
            : [];

        return `
          <div class="bf-mc-stat-team">

            ${
              teamName
                ? `
                  <strong>
                    ${escapeHTML(teamName)}
                  </strong>
                `
                : ""
            }

            ${
              list.length
                ? `
                  <div class="bf-mc-stat-list">

                    ${list.map(stat => {

                      const name =
                        stat?.type ||
                        stat?.name ||
                        "";

                      const value =
                        stat?.value ??
                        "";

                      return `
                        <div class="bf-mc-stat-row">
                          <span>
                            ${escapeHTML(name)}
                          </span>

                          <strong>
                            ${escapeHTML(value)}
                          </strong>
                        </div>
                      `;
                    }).join("")}

                  </div>
                `
                : emptyMessage(
                    "Aucune statistique."
                  )
            }

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
      return emptyMessage(
        "Les compositions ne sont pas disponibles pour ce match."
      );
    }

    return lineups.map(teamBlock => {

      const teamName =
        teamBlock?.team?.name ||
        teamBlock?.teamName ||
        "Équipe";

      const formation =
        teamBlock?.formation ||
        "";

      const startXI =
        Array.isArray(
          teamBlock?.startXI
        )
          ? teamBlock.startXI
          : [];

      const substitutes =
        Array.isArray(
          teamBlock?.substitutes
        )
          ? teamBlock.substitutes
          : [];

      const players = [
        ...startXI.map(player => ({
          player,
          status: "Titulaire"
        })),
        ...substitutes.map(player => ({
          player,
          status: "Remplaçant"
        }))
      ];

      return `
        <div class="bf-mc-lineup-team">

          <div class="bf-mc-lineup-head">

            <strong>
              ${escapeHTML(teamName)}
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

                  ${players.map(item => {

                    const player =
                      item.player?.player ||
                      item.player;

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
                          ${escapeHTML(number)}
                        </span>

                        <span>
                          ${escapeHTML(name)}
                        </span>

                        <small>
                          ${item.status}
                        </small>

                      </div>
                    `;
                  }).join("")}

                </div>
              `
              : emptyMessage(
                  "Aucun joueur."
                )
          }

        </div>
      `;
    }).join("");
  }

  function renderPlayers(players) {
    if (
      !Array.isArray(players) ||
      !players.length
    ) {
      return emptyMessage(
        "Les notes des joueurs ne sont pas disponibles pour ce match."
      );
    }

    return players.map(block => {

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

          ${list.map(item => {

            const player =
              item?.player ||
              item;

            const name =
              player?.name ||
              player?.playerName ||
              "Joueur";

            const rating =
              item?.rating ??
              item?.statistics?.rating ??
              item?.stats?.rating ??
              null;

            return `
              <div class="bf-mc-rating-row">

                <span>
                  ${escapeHTML(name)}
                </span>

                ${
                  rating !== null
                    ? `
                      <strong>
                        ⭐ ${escapeHTML(rating)}
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
          }).join("")}

        </div>
      `;
    }).join("");
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

  function addStyles() {

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
        opacity: .7;
      }

      .bf-mc-stat-team,
      .bf-mc-lineup-team,
      .bf-mc-player-team {
        margin-bottom: 14px;
      }

      .bf-mc-stat-list,
      .bf-mc-player-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-top: 8px;
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

      .bf-mc-lineup-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }

      .bf-mc-lineup-head span {
        opacity: .65;
      }

      .bf-mc-player-ratings {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      @media (max-width: 600px) {
        .bf-mc-event-row {
          grid-template-columns: 36px 26px minmax(0, 1fr);
          padding: 8px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  addStyles();

  /*
   * ==========================================
   * IMPORTANT:
   * We DO NOT replace openMatchDetails().
   * We only listen to the card click.
   * ==========================================
   */

  document.addEventListener(
    "click",
    event => {

      const card =
        event.target.closest(
          ".match-card"
        );

      if (!card) {
        return;
      }

      const fixtureId =
        card.getAttribute(
          "data-fixture-id"
        );

      if (!fixtureId) {
        console.warn(
          "BakhiraFoot: fixture ID missing."
        );
        return;
      }

      /*
       * Wait for the original
       * script.js modal to open.
       */

      const current =
        ++requestNumber;

      setTimeout(
        async () => {

          if (current !== requestNumber) {
            return;
          }

          const content =
            getContent();

          if (!content) {
            console.warn(
              "BakhiraFoot: match modal content not found."
            );
            return;
          }

          const loading =
            document.createElement(
              "div"
            );

          loading.className =
            "bf-detail-section bf-mc-section";

          loading.id =
            "bfMatchCenterLoading";

          loading.innerHTML = `
            <h3>⚡ Match Center</h3>

            <p style="opacity:.7;margin:0">
              Chargement des détails...
            </p>
          `;

          content.appendChild(
            loading
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

            if (
              current !== requestNumber
            ) {
              return;
            }

            loading.remove();

            const fixture =
              data?.fixture ||
              {};

            const events =
              Array.isArray(
                data?.events
              )
                ? data.events
                : [];

            const lineups =
              Array.isArray(
                data?.lineups
              )
                ? data.lineups
                : [];

            const statistics =
              Array.isArray(
                data?.statistics
              )
                ? data.statistics
                : [];

            const players =
              Array.isArray(
                data?.players
              )
                ? data.players
                : [];

            const detailsHTML = [

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
                renderStatistics(
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
              detailsHTML
            );

            console.log(
              "BakhiraFoot Match Center loaded:",
              fixtureId
            );

          } catch (error) {

            console.error(
              "BakhiraFoot Match Center:",
              error
            );

            loading.innerHTML = `
              <h3>⚠️ Match Center</h3>

              <p style="opacity:.7;margin:0">
                تعذر تحميل التفاصيل الإضافية.
              </p>
            `;
          }

        },
        100
      );
    },
    true
  );

})();
