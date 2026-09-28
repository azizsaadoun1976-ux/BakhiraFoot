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

  function section(title, html, icon = "•") {
    return `
      <section class="bf-mc-section">

        <div class="bf-mc-section-head">
          <div class="bf-mc-section-title">
            <span class="bf-mc-section-icon">
              ${icon}
            </span>

            <h3>
              ${escapeHTML(title)}
            </h3>
          </div>
        </div>

        <div class="bf-mc-section-content">
          ${html}
        </div>

      </section>
    `;
  }

  function emptyMessage(text) {
    return `
      <div class="bf-mc-empty">

        <div class="bf-mc-empty-icon">
          —
        </div>

        <div>
          <strong>
            Information indisponible
          </strong>

          <p>
            ${escapeHTML(text)}
          </p>
        </div>

      </div>
    `;
  }

  function getEventTeam(fixture, teamId) {
    if (
      String(teamId) ===
      String(fixture?.home?.id)
    ) {
      return {
        name:
          fixture?.home?.name || "",
        side: "home"
      };
    }

    if (
      String(teamId) ===
      String(fixture?.away?.id)
    ) {
      return {
        name:
          fixture?.away?.name || "",
        side: "away"
      };
    }

    return {
      name: "",
      side: ""
    };
  }

  function getEventVisual(event) {
    const type =
      String(event?.type || "")
        .toLowerCase();

    const detail =
      String(event?.detail || "")
        .toLowerCase();

    if (
      type.includes("goal")
    ) {
      return {
        icon: "⚽",
        className: "goal"
      };
    }

    if (
      detail.includes("second yellow")
    ) {
      return {
        icon: "🟥",
        className: "red"
      };
    }

    if (
      detail.includes("red")
    ) {
      return {
        icon: "🟥",
        className: "red"
      };
    }

    if (
      type.includes("card") ||
      detail.includes("yellow")
    ) {
      return {
        icon: "🟨",
        className: "yellow"
      };
    }

    if (
      type.includes("subst") ||
      type.includes("substitution")
    ) {
      return {
        icon: "🔄",
        className: "substitution"
      };
    }

    return {
      icon: "•",
      className: "default"
    };
  }

  function renderEvents(events, fixture) {

    if (
      !Array.isArray(events) ||
      !events.length
    ) {
      return emptyMessage(
        "Aucun événement détaillé disponible pour ce match."
      );
    }

    return `
      <div class="bf-mc-timeline">

        ${events
          .map(event => {

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

            const team =
              getEventTeam(
                fixture,
                event?.teamId
              );

            const visual =
              getEventVisual(event);

            return `
              <div class="bf-mc-event ${visual.className}">

                <div class="bf-mc-event-time">
                  ${
                    minute !== ""
                      ? escapeHTML(minute) + "'"
                      : "—"
                  }
                </div>

                <div class="bf-mc-event-marker">
                  <span>
                    ${visual.icon}
                  </span>
                </div>

                <div class="bf-mc-event-body">

                  <div class="bf-mc-event-top">

                    <strong>
                      ${escapeHTML(
                        player || type
                      )}
                    </strong>

                    ${
                      team.name
                        ? `
                          <span class="bf-mc-event-team ${team.side}">
                            ${escapeHTML(team.name)}
                          </span>
                        `
                        : ""
                    }

                  </div>

                  ${
                    detail
                      ? `
                        <div class="bf-mc-event-detail">
                          ${escapeHTML(detail)}
                        </div>
                      `
                      : ""
                  }

                  ${
                    assist
                      ? `
                        <div class="bf-mc-event-assist">
                          Passe décisive ·
                          ${escapeHTML(assist)}
                        </div>
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

  function renderStatistics(statistics) {

    if (
      !Array.isArray(statistics) ||
      !statistics.length
    ) {
      return emptyMessage(
        "Les statistiques détaillées ne sont pas disponibles pour ce match."
      );
    }

    return `
      <div class="bf-mc-statistics">

        ${statistics
          .map(teamBlock => {

            const teamName =
              teamBlock?.team?.name ||
              teamBlock?.teamName ||
              "Équipe";

            const list =
              Array.isArray(
                teamBlock?.statistics
              )
                ? teamBlock.statistics
                : [];

            return `
              <div class="bf-mc-stat-team">

                <div class="bf-mc-team-header">
                  <strong>
                    ${escapeHTML(teamName)}
                  </strong>
                </div>

                ${
                  list.length
                    ? `
                      <div class="bf-mc-stat-list">

                        ${list
                          .map(stat => {

                            const name =
                              stat?.type ||
                              stat?.name ||
                              "";

                            const value =
                              stat?.value ??
                              "";

                            return `
                              <div class="bf-mc-stat-row">

                                <span class="bf-mc-stat-name">
                                  ${escapeHTML(name)}
                                </span>

                                <strong class="bf-mc-stat-value">
                                  ${escapeHTML(value)}
                                </strong>

                              </div>
                            `;
                          })
                          .join("")}

                      </div>
                    `
                    : `
                      <div class="bf-mc-inline-empty">
                        Aucune statistique disponible.
                      </div>
                    `
                }

              </div>
            `;
          })
          .join("")}

      </div>
    `;
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

    return `
      <div class="bf-mc-lineups">

        ${lineups
          .map(teamBlock => {

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

            return `
              <div class="bf-mc-lineup-card">

                <div class="bf-mc-lineup-head">

                  <div>
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

                </div>

                ${
                  startXI.length
                    ? `
                      <div class="bf-mc-lineup-block">

                        <div class="bf-mc-mini-title">
                          TITULAIRES
                        </div>

                        <div class="bf-mc-player-list">

                          ${startXI
                            .map(item => {

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

                                  <span class="bf-mc-number">
                                    ${escapeHTML(number)}
                                  </span>

                                  <span class="bf-mc-player-name">
                                    ${escapeHTML(name)}
                                  </span>

                                </div>
                              `;
                            })
                            .join("")}

                        </div>

                      </div>
                    `
                    : ""
                }

                ${
                  substitutes.length
                    ? `
                      <div class="bf-mc-lineup-block">

                        <div class="bf-mc-mini-title">
                          REMPLAÇANTS
                        </div>

                        <div class="bf-mc-player-list">

                          ${substitutes
                            .map(item => {

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
                                <div class="bf-mc-player-row substitute">

                                  <span class="bf-mc-number">
                                    ${escapeHTML(number)}
                                  </span>

                                  <span class="bf-mc-player-name">
                                    ${escapeHTML(name)}
                                  </span>

                                </div>
                              `;
                            })
                            .join("")}

                        </div>

                      </div>
                    `
                    : ""
                }

              </div>
            `;
          })
          .join("")}

      </div>
    `;
  }

  function renderPlayers(players) {

    if (
      !Array.isArray(players) ||
      !players.length
    ) {
      return emptyMessage(
        "Les notes et statistiques des joueurs ne sont pas disponibles pour ce match."
      );
    }

    return `
      <div class="bf-mc-ratings">

        ${players
          .map(block => {

            const teamName =
              block?.team?.name ||
              block?.teamName ||
              "";

            const list =
              Array.isArray(block?.players)
                ? block.players
                : [block];

            return `
              <div class="bf-mc-rating-team">

                ${
                  teamName
                    ? `
                      <div class="bf-mc-team-header">
                        <strong>
                          ${escapeHTML(teamName)}
                        </strong>
                      </div>
                    `
                    : ""
                }

                <div class="bf-mc-rating-list">

                  ${list
                    .map(item => {

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

                          <div class="bf-mc-rating-player">
                            <span class="bf-mc-player-dot"></span>

                            <span>
                              ${escapeHTML(name)}
                            </span>
                          </div>

                          ${
                            rating !== null
                              ? `
                                <strong class="bf-mc-rating-value">
                                  ${escapeHTML(rating)}
                                </strong>
                              `
                              : `
                                <span class="bf-mc-rating-na">
                                  —
                                </span>
                              `
                          }

                        </div>
                      `;
                    })
                    .join("")}

                </div>

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

    if (
      !venue &&
      !city &&
      !referee
    ) {
      return "";
    }

    return section(
      "Informations du match",
      `
        <div class="bf-mc-info-grid">

          ${
            venue
              ? `
                <div class="bf-mc-info-card">

                  <div class="bf-mc-info-icon">
                    🏟️
                  </div>

                  <div class="bf-mc-info-text">
                    <small>
                      STADE
                    </small>

                    <strong>
                      ${escapeHTML(venue)}
                    </strong>
                  </div>

                </div>
              `
              : ""
          }

          ${
            city
              ? `
                <div class="bf-mc-info-card">

                  <div class="bf-mc-info-icon">
                    📍
                  </div>

                  <div class="bf-mc-info-text">
                    <small>
                      VILLE
                    </small>

                    <strong>
                      ${escapeHTML(city)}
                    </strong>
                  </div>

                </div>
              `
              : ""
          }

          ${
            referee
              ? `
                <div class="bf-mc-info-card">

                  <div class="bf-mc-info-icon">
                    👨‍⚖️
                  </div>

                  <div class="bf-mc-info-text">
                    <small>
                      ARBITRE
                    </small>

                    <strong>
                      ${escapeHTML(referee)}
                    </strong>
                  </div>

                </div>
              `
              : ""
          }

        </div>
      `,
      "📋"
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

      /*
       * =====================================
       * MATCH CENTER — BAKHIRAFOOT
       * =====================================
       */

      .bf-mc-section {
        margin-top: 18px;
      }

      .bf-mc-section-head {
        margin-bottom: 10px;
      }

      .bf-mc-section-title {
        display: flex;
        align-items: center;
        gap: 9px;
        padding-bottom: 9px;
        border-bottom: 1px solid #e8edf1;
      }

      .bf-mc-section-icon {
        width: 29px;
        height: 29px;
        min-width: 29px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: #f3f6f8;
        font-size: 14px;
      }

      .bf-mc-section-title h3 {
        margin: 0;
        font-size: 14px;
        line-height: 1.2;
        font-weight: 800;
        color: #1b2733;
      }

      .bf-mc-section-content {
        min-width: 0;
      }

      /*
       * EMPTY
       */

      .bf-mc-empty {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 13px;
        border: 1px solid #e7ecef;
        border-radius: 10px;
        background: #fafbfc;
      }

      .bf-mc-empty-icon {
        width: 28px;
        height: 28px;
        min-width: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 7px;
        background: #f0f3f5;
        color: #8b98a3;
        font-weight: 800;
      }

      .bf-mc-empty strong {
        display: block;
        margin-bottom: 2px;
        font-size: 12px;
      }

      .bf-mc-empty p {
        margin: 0;
        font-size: 11px;
        line-height: 1.4;
        color: #81909b;
      }

      /*
       * EVENTS
       */

      .bf-mc-timeline {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .bf-mc-event {
        display: grid;
        grid-template-columns: 40px 34px minmax(0, 1fr);
        align-items: center;
        gap: 9px;
        min-width: 0;
        padding: 9px 10px;
        border: 1px solid #e7ecef;
        border-radius: 10px;
        background: #ffffff;
      }

      .bf-mc-event-time {
        font-size: 11px;
        font-weight: 800;
        text-align: center;
        color: #6e7d88;
      }

      .bf-mc-event-marker {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .bf-mc-event-marker span {
        width: 29px;
        height: 29px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: #f3f6f8;
        font-size: 14px;
      }

      .bf-mc-event.goal .bf-mc-event-marker span {
        background: #eef8f0;
      }

      .bf-mc-event.yellow .bf-mc-event-marker span {
        background: #fff8dc;
      }

      .bf-mc-event.red .bf-mc-event-marker span {
        background: #fff0f0;
      }

      .bf-mc-event.substitution .bf-mc-event-marker span {
        background: #eef5ff;
      }

      .bf-mc-event-body {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .bf-mc-event-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .bf-mc-event-top strong {
        min-width: 0;
        font-size: 12px;
        font-weight: 750;
        color: #1b2733;
      }

      .bf-mc-event-team {
        max-width: 44%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 3px 6px;
        border-radius: 5px;
        background: #f4f6f8;
        color: #667680;
        font-size: 9px;
        font-weight: 700;
      }

      .bf-mc-event-detail {
        font-size: 11px;
        color: #657580;
      }

      .bf-mc-event-assist {
        font-size: 10px;
        color: #8b98a2;
      }

      /*
       * INFO
       */

      .bf-mc-info-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .bf-mc-info-card {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        padding: 10px;
        border: 1px solid #e7ecef;
        border-radius: 10px;
        background: #ffffff;
      }

      .bf-mc-info-icon {
        width: 30px;
        height: 30px;
        min-width: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: #f3f6f8;
      }

      .bf-mc-info-text {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .bf-mc-info-text small {
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .05em;
        color: #8b98a2;
      }

      .bf-mc-info-text strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        color: #24313b;
      }

      /*
       * STATISTICS
       */

      .bf-mc-statistics {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .bf-mc-stat-team {
        padding: 10px;
        border: 1px solid #e7ecef;
        border-radius: 10px;
        background: #ffffff;
      }

      .bf-mc-team-header {
        padding-bottom: 7px;
        margin-bottom: 8px;
        border-bottom: 1px solid #edf1f3;
      }

      .bf-mc-team-header strong {
        font-size: 12px;
        color: #24313b;
      }

      .bf-mc-stat-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .bf-mc-stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 7px 8px;
        border-radius: 7px;
        background: #f8fafb;
      }

      .bf-mc-stat-name {
        font-size: 10px;
        color: #6e7d88;
      }

      .bf-mc-stat-value {
        font-size: 11px;
        color: #26343e;
      }

      .bf-mc-inline-empty {
        padding: 8px;
        font-size: 10px;
        color: #8a98a2;
      }

      /*
       * LINEUPS
       */

      .bf-mc-lineups {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .bf-mc-lineup-card {
        min-width: 0;
        padding: 10px;
        border: 1px solid #e7ecef;
        border-radius: 10px;
        background: #ffffff;
      }

      .bf-mc-lineup-head {
        padding-bottom: 8px;
        margin-bottom: 8px;
        border-bottom: 1px solid #edf1f3;
      }

      .bf-mc-lineup-head div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 7px;
      }

      .bf-mc-lineup-head strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
      }

      .bf-mc-lineup-head span {
        flex-shrink: 0;
        padding: 3px 6px;
        border-radius: 5px;
        background: #f3f6f8;
        color: #788792;
        font-size: 9px;
        font-weight: 750;
      }

      .bf-mc-lineup-block + .bf-mc-lineup-block {
        margin-top: 11px;
      }

      .bf-mc-mini-title {
        margin-bottom: 5px;
        font-size: 8px;
        font-weight: 850;
        letter-spacing: .08em;
        color: #91a0aa;
      }

      .bf-mc-player-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .bf-mc-player-row {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        padding: 6px 7px;
        border-radius: 7px;
        background: #f8fafb;
      }

      .bf-mc-number {
        width: 20px;
        min-width: 20px;
        text-align: center;
        font-size: 9px;
        font-weight: 800;
        color: #8b98a2;
      }

      .bf-mc-player-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px;
        color: #34424c;
      }

      .bf-mc-player-row.substitute {
        opacity: .68;
      }

      /*
       * RATINGS
       */

      .bf-mc-ratings {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .bf-mc-rating-team {
        padding: 10px;
        border: 1px solid #e7ecef;
        border-radius: 10px;
        background: #ffffff;
      }

      .bf-mc-rating-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .bf-mc-rating-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 7px 8px;
        border-radius: 7px;
        background: #f8fafb;
      }

      .bf-mc-rating-player {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }

      .bf-mc-rating-player > span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px;
        color: #34424c;
      }

      .bf-mc-player-dot {
        width: 6px;
        height: 6px;
        min-width: 6px;
        border-radius: 50%;
        background: #a4b0b8;
      }

      .bf-mc-rating-value {
        min-width: 30px;
        padding: 3px 5px;
        border-radius: 5px;
        background: #eef2f4;
        text-align: center;
        font-size: 10px;
        color: #25323b;
      }

      .bf-mc-rating-na {
        color: #9aa5ad;
        font-size: 11px;
      }

      /*
       * DARK MODE
       */

      .dark .bf-mc-section-title {
        border-bottom-color: #29343d;
      }

      .dark .bf-mc-section-title h3 {
        color: #edf2f5;
      }

      .dark .bf-mc-section-icon,
      .dark .bf-mc-empty,
      .dark .bf-mc-empty-icon,
      .dark .bf-mc-event,
      .dark .bf-mc-event-marker span,
      .dark .bf-mc-event-team,
      .dark .bf-mc-info-card,
      .dark .bf-mc-info-icon,
      .dark .bf-mc-stat-team,
      .dark .bf-mc-stat-row,
      .dark .bf-mc-lineup-card,
      .dark .bf-mc-lineup-head span,
      .dark .bf-mc-player-row,
      .dark .bf-mc-rating-team,
      .dark .bf-mc-rating-row,
      .dark .bf-mc-rating-value {
        background: #151d24;
        border-color: #29343d;
      }

      .dark .bf-mc-event-top strong,
      .dark .bf-mc-info-text strong,
      .dark .bf-mc-team-header strong,
      .dark .bf-mc-lineup-head strong,
      .dark .bf-mc-player-name,
      .dark .bf-mc-rating-player > span:last-child,
      .dark .bf-mc-stat-value {
        color: #edf2f5;
      }

      .dark .bf-mc-event-detail,
      .dark .bf-mc-stat-name,
      .dark .bf-mc-info-text small,
      .dark .bf-mc-lineup-head span,
      .dark .bf-mc-number,
      .dark .bf-mc-event-time {
        color: #91a0aa;
      }

      .dark .bf-mc-stat-row,
      .dark .bf-mc-player-row,
      .dark .bf-mc-rating-row {
        background: #1b252d;
      }

      .dark .bf-mc-section-icon,
      .dark .bf-mc-info-icon,
      .dark .bf-mc-event-marker span,
      .dark .bf-mc-rating-value {
        background: #1b252d;
      }

      /*
       * MOBILE
       */

      @media (max-width: 700px) {

        .bf-mc-info-grid {
          grid-template-columns: 1fr;
        }

        .bf-mc-lineups {
          grid-template-columns: 1fr;
        }

        .bf-mc-event {
          grid-template-columns: 34px 30px minmax(0, 1fr);
          gap: 7px;
          padding: 8px;
        }

        .bf-mc-event-top {
          align-items: flex-start;
          flex-direction: column;
          gap: 3px;
        }

        .bf-mc-event-team {
          max-width: 100%;
        }

        .bf-mc-stat-team,
        .bf-mc-lineup-card,
        .bf-mc-rating-team {
          padding: 9px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  addStyles();

  /*
   * ==========================================
   * MATCH CENTER DATA
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

      const current =
        ++requestNumber;

      setTimeout(
        async () => {

          if (
            current !== requestNumber
          ) {
            return;
          }

          const content =
            getContent();

          if (!content) {
            return;
          }

          const loading =
            document.createElement(
              "div"
            );

          loading.className =
            "bf-mc-loading";

          loading.innerHTML = `
            <div class="bf-mc-loading-inner">
              <span class="bf-mc-spinner"></span>
              <span>
                Chargement des détails...
              </span>
            </div>
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
function renderMatchHeader(fixture) {
  const home = fixture?.home || {};
  const away = fixture?.away || {};
  const status = fixture?.status || {};
  const score = fixture?.score || {};

  const statusShort =
    String(status?.short || "").toUpperCase();

  const statusLong =
    String(status?.long || "");

  const liveStatuses = [
    "1H",
    "2H",
    "HT",
    "ET",
    "P",
    "BT"
  ];

  const isLive =
    liveStatuses.includes(statusShort);

  const isHalfTime =
    statusShort === "HT";

  const isFinished =
    ["FT", "AET", "PEN"].includes(statusShort);

  let badge = "À VENIR";
  let badgeClass = "upcoming";

  if (isLive) {
    badge = isHalfTime
      ? "MI-TEMPS"
      : `🔴 LIVE ${status?.elapsed ? status.elapsed + "'" : ""}`;

    badgeClass = "live";
  }

  if (isFinished) {
    badge = "TERMINÉ";
    badgeClass = "finished";
  }

  const homeScore =
    score?.home ?? "-";

  const awayScore =
    score?.away ?? "-";

  return `
    <div class="bf-pro-match-header">

      <div class="bf-pro-match-top">

        <span class="bf-pro-competition">
          🏆 ${escapeHTML(
            fixture?.league?.name ||
            "Football"
          )}
        </span>

        <span class="bf-pro-status ${badgeClass}">
          ${escapeHTML(badge)}
        </span>

      </div>

      <div class="bf-pro-match-main">

        <div class="bf-pro-team home">

          ${
            home?.logo
              ? `
                <img
                  src="${escapeHTML(home.logo)}"
                  alt="${escapeHTML(home.name || "Domicile")}"
                >
              `
              : `
                <div class="bf-pro-logo-fallback">
                  ⚽
                </div>
              `
          }

          <strong>
            ${escapeHTML(
              home?.name || "Domicile"
            )}
          </strong>

        </div>

        <div class="bf-pro-score-box">

          <div class="bf-pro-score">
            <span>${escapeHTML(homeScore)}</span>
            <b>-</b>
            <span>${escapeHTML(awayScore)}</span>
          </div>

          <div class="bf-pro-status-long">
            ${escapeHTML(
              statusLong || "Match"
            )}
          </div>

        </div>

        <div class="bf-pro-team away">

          ${
            away?.logo
              ? `
                <img
                  src="${escapeHTML(away.logo)}"
                  alt="${escapeHTML(away.name || "Extérieur")}"
                >
              `
              : `
                <div class="bf-pro-logo-fallback">
                  ⚽
                </div>
              `
          }

          <strong>
            ${escapeHTML(
              away?.name || "Extérieur"
            )}
          </strong>

        </div>

      </div>

    </div>
  `;
}
            
            const detailsHTML = [

              renderInfo(
                fixture
              ),

              section(
                "Événements",
                renderEvents(
                  events,
                  fixture
                ),
                "⚡"
              ),

              section(
                "Compositions",
                renderLineups(
                  lineups
                ),
                "👥"
              ),

              section(
                "Statistiques",
                renderStatistics(
                  statistics
                ),
                "📊"
              ),

              section(
                "Notes des joueurs",
                renderPlayers(
                  players
                ),
                "⭐"
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
              <div class="bf-mc-error">
                <strong>
                  Impossible de charger les détails.
                </strong>

                <small>
                  ${escapeHTML(
                    error.message
                  )}
                </small>
              </div>
            `;
          }

        },
        100
      );
    },
    true
  );

})();
