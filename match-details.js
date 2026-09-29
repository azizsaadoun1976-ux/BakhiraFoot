/* =========================================================
   BAKHIRAFOOT
   SEPARATE PROFESSIONAL MATCH DETAILS
========================================================= */

(function () {
  "use strict";

  let modal = null;

  /* =========================================
     HELPERS
  ========================================= */

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function norm(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function arr(value) {
    return Array.isArray(value) ? value : [];
  }

  function getMatch(index, card) {

    try {
      if (
        typeof currentMatches !== "undefined" &&
        Array.isArray(currentMatches) &&
        currentMatches[index]
      ) {
        return currentMatches[index];
      }
    } catch (e) {}

    return {
      fixture: {
        id:
          card?.dataset?.fixtureId ||
          card?.dataset?.matchSlug ||
          null,

        slug:
          card?.dataset?.matchSlug ||
          card?.dataset?.slug ||
          card?.dataset?.fixtureId ||
          null
      },

      teams: {
        home: {},
        away: {}
      }
    };
  }

  function getSlug(match, card) {

    return (
      match?.fixture?.slug ||
      match?.slug ||
      match?.match_slug ||
      match?.fixture?.id ||
      match?.id ||
      match?.match_id ||
      card?.dataset?.matchSlug ||
      card?.dataset?.slug ||
      card?.dataset?.fixtureId ||
      null
    );
  }

  /* =========================================
     MODAL
  ========================================= */

  function createModal() {

    if (
      document.getElementById(
        "bf-match-details-modal"
      )
    ) {
      return;
    }

    modal =
      document.createElement("div");

    modal.id =
      "bf-match-details-modal";

    modal.innerHTML = `
      <div class="bf-md-overlay">

        <div class="bf-md-box">

          <button
            class="bf-md-close"
            id="bf-md-close"
          >
            ✕
          </button>

          <div id="bf-md-content"></div>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    document
      .getElementById("bf-md-close")
      .addEventListener(
        "click",
        close
      );

    document
      .querySelector(
        "#bf-match-details-modal .bf-md-overlay"
      )
      .addEventListener(
        "click",
        function (event) {

          if (
            event.target.classList.contains(
              "bf-md-overlay"
            )
          ) {
            close();
          }

        }
      );

    addStyles();
  }

  function close() {

    const box =
      document.getElementById(
        "bf-match-details-modal"
      );

    if (box) {
      box.style.display =
        "none";
    }

    document.body.style.overflow =
      "";
  }

  /* =========================================
     STYLES
  ========================================= */

  function addStyles() {

    if (
      document.getElementById(
        "bf-md-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "bf-md-style";

    style.textContent = `

      #bf-match-details-modal {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: none;
      }

      .bf-md-overlay {
        position: fixed;
        inset: 0;
        padding: 18px;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        background: rgba(0,0,0,.78);
        backdrop-filter: blur(6px);
      }

      .bf-md-box {
        position: relative;
        width: min(1150px,100%);
        max-height: 94vh;
        overflow-y: auto;
        padding: 28px;
        border-radius: 24px;
        background: var(--card,#fff);
        color: var(--text,#111827);
        box-shadow:
          0 30px 100px rgba(0,0,0,.45);
      }

      .bf-md-close {
        position: absolute;
        top: 13px;
        right: 13px;
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        background: rgba(127,127,127,.12);
        color: inherit;
        font-size: 18px;
        font-weight: 900;
        z-index: 20;
      }

      .bf-md-league {
        text-align: center;
        opacity: .65;
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 16px;
      }

      .bf-md-head {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 20px;
        align-items: center;
        text-align: center;
      }

      .bf-md-team {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 9px;
        font-weight: 900;
      }

      .bf-md-team img,
      .bf-md-logo {
        width: 78px;
        height: 78px;
        object-fit: contain;
      }

      .bf-md-score {
        font-size: 40px;
        font-weight: 950;
      }

      .bf-md-status {
        display: inline-block;
        margin-top: 8px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(220,38,38,.1);
        font-size: 11px;
        font-weight: 900;
      }

      .bf-md-section {
        margin-top: 28px;
        padding-top: 22px;
        border-top: 1px solid rgba(127,127,127,.16);
      }

      .bf-md-title {
        margin-bottom: 15px;
        font-size: 18px;
        font-weight: 950;
      }

      .bf-md-pitches {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .bf-md-pitch-card {
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid rgba(127,127,127,.14);
      }

      .bf-md-pitch-head {
        padding: 12px 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        font-weight: 900;
      }

      .bf-md-formation {
        padding: 5px 9px;
        border-radius: 999px;
        background: rgba(127,127,127,.11);
        font-size: 11px;
      }

      .bf-md-pitch {
        position: relative;
        width: 100%;
        aspect-ratio: .67;
        overflow: hidden;
        background:
          repeating-linear-gradient(
            90deg,
            #2e8045 0%,
            #2e8045 10%,
            #367f47 10%,
            #367f47 20%
          );
      }

      .bf-md-border {
        position: absolute;
        inset: 0;
        border: 2px solid rgba(255,255,255,.9);
      }

      .bf-md-half {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 2px;
        background: rgba(255,255,255,.9);
      }

      .bf-md-circle {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 18%;
        aspect-ratio: 1;
        transform: translate(-50%,-50%);
        border: 2px solid rgba(255,255,255,.9);
        border-radius: 50%;
      }

      .bf-md-player {
        position: absolute;
        transform: translate(-50%,-50%);
        width: 80px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .bf-md-number {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 950;
        box-shadow: 0 3px 10px rgba(0,0,0,.35);
      }

      .bf-md-name {
        max-width: 76px;
        margin-top: 4px;
        padding: 3px 5px;
        border-radius: 5px;
        background: rgba(0,0,0,.7);
        color: #fff;
        font-size: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bf-md-rating {
        margin-top: 2px;
        padding: 2px 5px;
        border-radius: 5px;
        background: #fff;
        font-size: 8px;
        font-weight: 900;
      }

      .bf-md-players {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .bf-md-row {
        display: grid;
        grid-template-columns: 38px 1fr auto;
        gap: 8px;
        align-items: center;
        padding: 9px;
        margin-bottom: 7px;
        border-radius: 10px;
        background: rgba(127,127,127,.07);
      }

      .bf-md-shirt {
        width: 31px;
        height: 31px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(127,127,127,.13);
        font-size: 11px;
        font-weight: 950;
      }

      .bf-md-player-name {
        font-size: 11px;
        font-weight: 900;
      }

      .bf-md-position {
        margin-top: 2px;
        font-size: 9px;
        opacity: .55;
      }

      .bf-md-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        justify-content: flex-end;
      }

      .bf-md-badge {
        padding: 3px 5px;
        border-radius: 5px;
        background: rgba(127,127,127,.12);
        font-size: 8px;
        font-weight: 900;
      }

      .bf-md-events {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .bf-md-event {
        display: grid;
        grid-template-columns: 45px 30px 1fr;
        gap: 8px;
        align-items: center;
        padding: 9px 11px;
        border-radius: 10px;
        background: rgba(127,127,127,.07);
      }

      .bf-md-event-minute {
        font-size: 10px;
        font-weight: 950;
      }

      .bf-md-event-icon {
        font-size: 18px;
        text-align: center;
      }

      .bf-md-event-name {
        font-size: 11px;
        font-weight: 900;
      }

      .bf-md-event-detail {
        font-size: 9px;
        opacity: .58;
        margin-top: 2px;
      }

      .bf-md-event-assist {
        font-size: 9px;
        opacity: .7;
        margin-top: 3px;
      }

      .bf-md-stats {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .bf-md-stat {
        display: grid;
        grid-template-columns: 1fr 110px 1fr;
        gap: 8px;
        align-items: center;
        font-size: 10px;
      }

      .bf-md-stat-home {
        text-align: right;
        font-weight: 900;
      }

      .bf-md-stat-name {
        text-align: center;
        opacity: .55;
      }

      .bf-md-empty {
        padding: 14px;
        border-radius: 10px;
        background: rgba(127,127,127,.07);
        font-size: 11px;
        opacity: .65;
      }

      @media(max-width:800px) {

        .bf-md-pitches,
        .bf-md-players {
          grid-template-columns: 1fr;
        }

      }

      @media(max-width:600px) {

        .bf-md-box {
          padding: 20px 12px;
        }

        .bf-md-head {
          gap: 8px;
        }

        .bf-md-team img,
        .bf-md-logo {
          width: 55px;
          height: 55px;
        }

        .bf-md-score {
          font-size: 27px;
        }

        .bf-md-team {
          font-size: 11px;
        }

        .bf-md-row {
          grid-template-columns: 34px 1fr;
        }

        .bf-md-badges {
          grid-column: 2;
          justify-content: flex-start;
        }

      }

    `;

    document.head.appendChild(style);
  }

  /* =========================================
     PLAYER POSITION
  ========================================= */

  function positionPlayers(
    players,
    side
  ) {

    const rows = {};

    players.forEach(
      (item, index) => {

        const player =
          item?.player ||
          item ||
          {};

        const grid =
          player?.grid ||
          item?.grid ||
          "";

        const match =
          String(grid).match(
            /(\d+)\s*:\s*(\d+)/
          );

        let row =
          match
            ? Number(match[1])
            : null;

        let col =
          match
            ? Number(match[2])
            : null;

        if (!row) {

          const pos =
            norm(
              player?.pos ||
              player?.position ||
              item?.position ||
              ""
            );

          if (
            pos === "g" ||
            pos.includes("goal")
          ) {
            row = 1;
          }
          else if (
            pos === "d" ||
            pos.includes("def")
          ) {
            row = 2;
          }
          else if (
            pos === "m" ||
            pos.includes("mid")
          ) {
            row = 3;
          }
          else {
            row = 4;
          }

        }

        if (!rows[row]) {
          rows[row] = [];
        }

        if (!col) {
          col =
            rows[row].length + 1;
        }

        rows[row].push({
          item,
          col
        });

      }
    );

    const rowNumbers =
      Object.keys(rows)
        .map(Number)
        .sort((a,b) => a-b);

    const maxRow =
      Math.max(
        ...rowNumbers,
        4
      );

    const result = [];

    rowNumbers.forEach(
      row => {

        const line =
          rows[row].sort(
            (a,b) =>
              a.col - b.col
          );

        line.forEach(
          (entry, index) => {

            let x;

            if (
              line.length === 1
            ) {
              x = 50;
            }
            else {
              x =
                16 +
                (
                  68 *
                  (
                    index /
                    (line.length - 1)
                  )
                );
            }

            let y =
              8 +
              (
                82 *
                (
                  (row - 1) /
                  Math.max(
                    1,
                    maxRow - 1
                  )
                )
              );

            if (
              side === "away"
            ) {
              y =
                100 - y;
            }

            result.push({
              item:
                entry.item,
              x,
              y
            });

          }
        );

      }
    );

    return result;
  }

  /* =========================================
     PITCH
  ========================================= */

  function renderPitch(
    lineup,
    side,
    contributions,
    playerStats,
    teamName
  ) {

    if (!lineup) {

      return `
        <div class="bf-md-pitch-card">

          <div class="bf-md-pitch-head">
            ${esc(teamName)}
          </div>

          <div class="bf-md-empty">
            Formation indisponible.
          </div>

        </div>
      `;
    }

    const formation =
      lineup?.formation ||
      lineup?.tactics ||
      "—";

    const players =
      arr(
        lineup?.startXI ||
        lineup?.startingXI ||
        lineup?.starting_xi ||
        lineup?.starters
      );

    const positions =
      positionPlayers(
        players,
        side
      );

    const html =
      positions
        .map(
          entry => {

            const item =
              entry.item;

            const player =
              item?.player ||
              item ||
              {};

            const id =
              player?.id ||
              item?.player_id ||
              item?.id ||
              null;

            const name =
              player?.name ||
              item?.name ||
              "Joueur";

            const stats =
              playerStats.get(
                id
                  ? `id:${id}`
                  : `name:${norm(name)}`
              ) ||
              {};

            const rating =
              stats.rating ??
              item?.rating ??
              item?.statistics?.rating ??
              null;

            return `

              <div
                class="bf-md-player"
                style="
                  left:${entry.x}%;
                  top:${entry.y}%;
                "
                title="${esc(name)}"
              >

                <div class="bf-md-number">
                  ${esc(
                    player?.number ??
                    item?.number ??
                    item?.shirt_number ??
                    "-"
                  )}
                </div>

                <div class="bf-md-name">
                  ${esc(name)}
                </div>

                ${
                  rating !== null &&
                  rating !== undefined &&
                  rating !== ""
                    ? `
                      <div class="bf-md-rating">
                        ⭐ ${esc(
                          Number(
                            rating
                          ).toFixed(1)
                        )}
                      </div>
                    `
                    : ""
                }

              </div>

            `;
          }
        )
        .join("");

    return `

      <div class="bf-md-pitch-card">

        <div class="bf-md-pitch-head">

          <span>
            ${esc(teamName)}
          </span>

          <span class="bf-md-formation">
            ${esc(formation)}
          </span>

        </div>

        <div class="bf-md-pitch">

          <div class="bf-md-border"></div>

          <div class="bf-md-half"></div>

          <div class="bf-md-circle"></div>

          ${html}

        </div>

      </div>

    `;
  }

  /* =========================================
     PLAYER STATS
  ========================================= */

  function buildPlayerStats(
    players
  ) {

    const map =
      new Map();

    arr(players)
      .forEach(
        group => {

          arr(
            group?.players
          ).forEach(
            row => {

              const p =
                row?.player ||
                row ||
                {};

              const id =
                p?.id ||
                row?.player_id ||
                row?.id ||
                null;

              const name =
                p?.name ||
                row?.name ||
                "";

              const stats =
                row?.statistics?.[0] ||
                row?.statistics ||
                {};

              const data = {

                rating:
                  row?.rating ??
                  stats?.games?.rating ??
                  stats?.rating ??
                  null,

                minutes:
                  row?.minutes ??
                  stats?.games?.minutes ??
                  stats?.minutes ??
                  null,

                keyPasses:
                  row?.passes?.key ??
                  stats?.passes?.key ??
                  0

              };

              if (id) {
                map.set(
                  `id:${id}`,
                  data
                );
              }

              if (name) {
                map.set(
                  `name:${norm(name)}`,
                  data
                );
              }

            }
          );

        }
      );

    return map;
  }

  /* =========================================
     EVENTS CONTRIBUTIONS
  ========================================= */

  function buildContributions(
    events
  ) {

    const map =
      new Map();

    function item(
      id,
      name
    ) {

      const key =
        id
          ? `id:${id}`
          : `name:${norm(name)}`;

      if (
        !map.has(key)
      ) {
        map.set(
          key,
          {
            goals: 0,
            assists: 0,
            yellow: 0,
            red: 0
          }
        );
      }

      return map.get(key);
    }

    events.forEach(
      event => {

        const type =
          norm(
            event?.type ||
            event?.event_type ||
            ""
          );

        const detail =
          norm(
            event?.detail ||
            event?.description ||
            event?.text ||
            ""
          );

        const p =
          event?.player ||
          {};

        const a =
          event?.assist ||
          {};

        const pid =
          p?.id ||
          event?.player_id ||
          null;

        const pname =
          p?.name ||
          event?.player_name ||
          "";

        if (
          pid ||
          pname
        ) {

          const data =
            item(
              pid,
              pname
            );

          if (
            type.includes("goal") &&
            !detail.includes("missed")
          ) {
            data.goals++;
          }

          if (
            type.includes("card")
          ) {

            if (
              detail.includes("red") ||
              detail.includes("second yellow") ||
              detail.includes("yellow-red")
            ) {
              data.red++;
            }
            else if (
              detail.includes("yellow")
            ) {
              data.yellow++;
            }

          }

        }

        if (
          (
            a?.id ||
            a?.name
          ) &&
          type.includes("goal")
        ) {

          const data =
            item(
              a?.id ||
              null,
              a?.name ||
              ""
            );

          data.assists++;

        }

      }
    );

    return map;
  }

  /* =========================================
     PLAYERS UI
  ========================================= */

  function renderPlayers(
    lineup,
    teamName,
    contributions,
    playerStats
  ) {

    const players =
      arr(
        lineup?.startXI ||
        lineup?.startingXI ||
        lineup?.starting_xi ||
        lineup?.starters
      );

    if (!players.length) {

      return `
        <div>

          <div class="bf-md-team-heading">
            ${esc(teamName)}
          </div>

          <div class="bf-md-empty">
            Aucun joueur disponible.
          </div>

        </div>
      `;
    }

    const rows =
      players
        .map(
          item => {

            const p =
              item?.player ||
              item ||
              {};

            const id =
              p?.id ||
              item?.player_id ||
              item?.id ||
              null;

            const name =
              p?.name ||
              item?.name ||
              "Joueur";

            const key =
              id
                ? `id:${id}`
                : `name:${norm(name)}`;

            const perf =
              contributions.get(
                key
              ) ||
              {
                goals: 0,
                assists: 0,
                yellow: 0,
                red: 0
              };

            const stats =
              playerStats.get(
                key
              ) ||
              {};

            const rating =
              stats.rating ??
              item?.rating ??
              item?.statistics?.rating ??
              null;

            let badges = "";

            if (
              rating !== null &&
              rating !== undefined &&
              rating !== ""
            ) {
              badges += `
                <span class="bf-md-badge">
                  ⭐ ${esc(
                    Number(
                      rating
                    ).toFixed(1)
                  )}
                </span>
              `;
            }

            if (
              perf.goals > 0
            ) {
              badges += `
                <span class="bf-md-badge">
                  ⚽ ${perf.goals}
                </span>
              `;
            }

            if (
              perf.assists > 0
            ) {
              badges += `
                <span class="bf-md-badge">
                  🅰️ ${perf.assists}
                </span>
              `;
            }

            if (
              perf.yellow > 0
            ) {
              badges += `
                <span class="bf-md-badge">
                  🟨
                </span>
              `;
            }

            if (
              perf.red > 0
            ) {
              badges += `
                <span class="bf-md-badge">
                  🟥
                </span>
              `;
            }

            if (
              BF2_number(
                stats.keyPasses
              ) > 0
            ) {
              badges += `
                <span class="bf-md-badge">
                  🎯 ${stats.keyPasses}
                </span>
              `;
            }

            return `

              <div class="bf-md-row">

                <div class="bf-md-shirt">
                  ${esc(
                    p?.number ??
                    item?.number ??
                    item?.shirt_number ??
                    "-"
                  )}
                </div>

                <div>

                  <div class="bf-md-player-name">
                    ${esc(name)}
                  </div>

                  <div class="bf-md-position">

                    ${esc(
                      p?.pos ||
                      p?.position ||
                      item?.position ||
                      ""
                    )}

                    ${
                      stats.minutes !== null &&
                      stats.minutes !== undefined
                        ? ` · ${esc(
                            stats.minutes
                          )} min`
                        : ""
                    }

                  </div>

                </div>

                <div class="bf-md-badges">
                  ${badges}
                </div>

              </div>
            `;
          }
        )
        .join("");

    return `

      <div>

        <div
          class="bf-md-player-name"
          style="
            margin-bottom:10px;
            font-size:13px;
          "
        >
          ${esc(teamName)}
        </div>

        ${rows}

      </div>

    `;
  }

  function BF2_number(value) {

    const n =
      Number(value);

    return Number.isFinite(n)
      ? n
      : 0;
  }

  /* =========================================
     EVENTS UI
  ========================================= */

  function renderEvents(
    events,
    homeId,
    awayId,
    homeName,
    awayName
  ) {

    const list =
      arr(events);

    if (!list.length) {

      return `

        <div class="bf-md-section">

          <div class="bf-md-title">
            ⚡ Événements
          </div>

          <div class="bf-md-empty">
            Aucun événement disponible.
          </div>

        </div>

      `;
    }

    const rows =
      [...list]
        .sort(
          (a,b) =>
            Number(
              a?.time?.elapsed ??
              a?.minute ??
              999
            ) -
            Number(
              b?.time?.elapsed ??
              b?.minute ??
              999
            )
        )
        .map(
          event => {

            const team =
              event?.team ||
              {};

            const player =
              event?.player ||
              {};

            const assist =
              event?.assist ||
              {};

            const teamId =
              team?.id ||
              event?.team_id ||
              null;

            const side =
              (
                homeId &&
                teamId &&
                String(homeId) ===
                String(teamId)
              )
                ? "home"
                : "away";

            const type =
              norm(
                event?.type ||
                event?.event_type ||
                ""
              );

            const detail =
              norm(
                event?.detail ||
                event?.description ||
                ""
              );

            let icon =
              "📌";

            if (
              type.includes("goal")
            ) {
              icon = "⚽";
            }
            else if (
              type.includes("card")
            ) {
              icon =
                detail.includes("red")
                  ? "🟥"
                  : "🟨";
            }
            else if (
              type.includes("subst")
            ) {
              icon = "🔄";
            }

            const minute =
              event?.time?.elapsed ??
              event?.minute ??
              "";

            const extra =
              event?.time?.extra ??
              event?.extra ??
              "";

            const minuteText =
              minute !== ""
                ? extra
                  ? `${minute}+${extra}'`
                  : `${minute}'`
                : "";

            return `

              <div
                class="bf-md-event ${side}"
              >

                <div class="bf-md-event-minute">
                  ${esc(minuteText)}
                </div>

                <div class="bf-md-event-icon">
                  ${icon}
                </div>

                <div>

                  <div class="bf-md-event-name">
                    ${esc(
                      player?.name ||
                      event?.player_name ||
                      event?.description ||
                      event?.detail ||
                      "Événement"
                    )}
                  </div>

                  ${
                    event?.detail
                      ? `
                        <div class="bf-md-event-detail">
                          ${esc(
                            event.detail
                          )}
                        </div>
                      `
                      : ""
                  }

                  ${
                    assist?.name ||
                    event?.assist_name
                      ? `
                        <div class="bf-md-event-assist">
                          🅰️ Passe décisive :
                          ${esc(
                            assist?.name ||
                            event?.assist_name
                          )}
                        </div>
                      `
                      : ""
                  }

                </div>

              </div>

            `;
          }
        )
        .join("");

    return `

      <div class="bf-md-section">

        <div class="bf-md-title">
          ⚡ Événements
        </div>

        <div class="bf-md-events">
          ${rows}
        </div>

      </div>

    `;
  }

  /* =========================================
     OPEN MATCH
  ========================================= */

  async function openMatch(
    index,
    card
  ) {

    const match =
      getMatch(
        index,
        card
      );

    const slug =
      getSlug(
        match,
        card
      );

    createModal();

    const box =
      document.getElementById(
        "bf-match-details-modal"
      );

    const content =
      document.getElementById(
        "bf-md-content"
      );

    if (!box || !content) {
      return;
    }

    const home =
      match?.teams?.home?.name ||
      match?.home?.name ||
      match?.home ||
      "Domicile";

    const away =
      match?.teams?.away?.name ||
      match?.away?.name ||
      match?.away ||
      "Extérieur";

    const homeLogo =
      match?.teams?.home?.logo ||
      match?.home?.logo ||
      "";

    const awayLogo =
      match?.teams?.away?.logo ||
      match?.away?.logo ||
      "";

    const homeScore =
      match?.goals?.home ??
      match?.score?.home ??
      "-";

    const awayScore =
      match?.goals?.away ??
      match?.score?.away ??
      "-";

    const league =
      match?.league?.name ||
      match?.competition?.name ||
      match?.league ||
      "Football";

    content.innerHTML = `

      <div class="bf-md-league">
        🏆 ${esc(league)}
      </div>

      <div class="bf-md-head">

        <div class="bf-md-team">

          ${
            homeLogo
              ? `
                <img
                  src="${esc(homeLogo)}"
                >
              `
              : `
                <div class="bf-md-logo">
                  ⚽
                </div>
              `
          }

          <span>
            ${esc(home)}
          </span>

        </div>

        <div>

          <div class="bf-md-score">
            ${esc(homeScore)}
            -
            ${esc(awayScore)}
          </div>

          <div class="bf-md-status">
            Chargement...
          </div>

        </div>

        <div class="bf-md-team">

          ${
            awayLogo
              ? `
                <img
                  src="${esc(awayLogo)}"
                >
              `
              : `
                <div class="bf-md-logo">
                  ⚽
                </div>
              `
          }

          <span>
            ${esc(away)}
          </span>

        </div>

      </div>

      <div class="bf-md-section">

        <div class="bf-md-title">
          ⏳ Match Center
        </div>

        <div class="bf-md-empty">
          جاري تحميل تفاصيل المباراة...
        </div>

      </div>

    `;

    box.style.display =
      "block";

    document.body.style.overflow =
      "hidden";

    /*
       Debug واضح
    */

    console.log(
      "BAKHIRAFOOT DETAILS INDEX:",
      index
    );

    console.log(
      "BAKHIRAFOOT DETAILS MATCH:",
      match
    );

    console.log(
      "BAKHIRAFOOT DETAILS SLUG:",
      slug
    );

    if (!slug) {

      content.querySelector(
        ".bf-md-empty"
      ).innerHTML =
        "⚠️ ما تلقيناش slug ديال هاد الماتش.";

      return;
    }

    try {

      const response =
        await fetch(
          `/api?fixture=${encodeURIComponent(
            slug
          )}`,
          {
            cache:
              "no-store"
          }
        );

      const text =
        await response.text();

      let payload;

      try {
        payload =
          JSON.parse(text);
      }
      catch {
        throw new Error(
          "API returned invalid JSON"
        );
      }

      console.log(
        "BAKHIRAFOOT DETAILS API:",
        payload
      );

      if (!response.ok) {

        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const details =
        payload?.data?.fixture
          ? payload.data
          : (
              payload?.data ||
              payload
            );

      if (!details) {
        throw new Error(
          "No details"
        );
      }

      const teams =
        details?.teams ||
        {};

      const realHome =
        teams?.home?.name ||
        home;

      const realAway =
        teams?.away?.name ||
        away;

      const realHomeLogo =
        teams?.home?.logo ||
        homeLogo;

      const realAwayLogo =
        teams?.away?.logo ||
        awayLogo;

      const realHomeId =
        teams?.home?.id ||
        match?.teams?.home?.id ||
        null;

      const realAwayId =
        teams?.away?.id ||
        match?.teams?.away?.id ||
        null;

      const realHomeScore =
        details?.goals?.home ??
        details?.score?.home ??
        homeScore;

      const realAwayScore =
        details?.goals?.away ??
        details?.score?.away ??
        awayScore;

      const events =
        arr(
          details?.events ||
          details?.timeline
        );

      const lineups =
        arr(
          details?.lineups ||
          details?.lineup
        );

      const statistics =
        arr(
          details?.statistics ||
          details?.stats
        );

      const players =
        arr(
          details?.players
        );

      const contributions =
        buildContributions(
          events
        );

      const playerStats =
        buildPlayerStats(
          players
        );

      function findLineup(
        teamId,
        teamName,
        fallback
      ) {

        const wanted =
          norm(
            teamName
          );

        return (
          lineups.find(
            lineup => {

              const id =
                lineup?.team?.id ||
                lineup?.team_id ||
                null;

              const name =
                norm(
                  lineup?.team?.name ||
                  lineup?.team_name ||
                  ""
                );

              if (
                teamId &&
                id &&
                String(teamId) ===
                String(id)
              ) {
                return true;
              }

              return (
                wanted &&
                name &&
                wanted ===
                name
              );
            }
          ) ||
          lineups[fallback] ||
          null
        );
      }

      const homeLineup =
        findLineup(
          realHomeId,
          realHome,
          0
        );

      const awayLineup =
        findLineup(
          realAwayId,
          realAway,
          1
        );

      const status =
        details?.fixture?.status?.short ||
        details?.status ||
        "MATCH";

      content.innerHTML = `

        <div class="bf-md-league">
          🏆 ${esc(
            details?.league?.name ||
            league
          )}
        </div>

        <div class="bf-md-head">

          <div class="bf-md-team">

            ${
              realHomeLogo
                ? `
                  <img
                    src="${esc(
                      realHomeLogo
                    )}"
                  >
                `
                : `
                  <div class="bf-md-logo">
                    ⚽
                  </div>
                `
            }

            <span>
              ${esc(realHome)}
            </span>

          </div>

          <div>

            <div class="bf-md-score">
              ${esc(realHomeScore)}
              -
              ${esc(realAwayScore)}
            </div>

            <div class="bf-md-status">
              ${esc(status)}
            </div>

          </div>

          <div class="bf-md-team">

            ${
              realAwayLogo
                ? `
                  <img
                    src="${esc(
                      realAwayLogo
                    )}"
                  >
                `
                : `
                  <div class="bf-md-logo">
                    ⚽
                  </div>
                `
            }

            <span>
              ${esc(realAway)}
            </span>

          </div>

        </div>

        <div class="bf-md-section">

          <div class="bf-md-title">
            🧩 Formations & Compositions
          </div>

          ${
            homeLineup ||
            awayLineup
              ? `

                <div class="bf-md-pitches">

                  ${renderPitch(
                    homeLineup,
                    "home",
                    contributions,
                    playerStats,
                    realHome
                  )}

                  ${renderPitch(
                    awayLineup,
                    "away",
                    contributions,
                    playerStats,
                    realAway
                  )}

                </div>

              `
              : `
                <div class="bf-md-empty">
                  التشكيلة مازال ما متوفراش لهاد الماتش.
                </div>
              `
          }

        </div>

        ${
          homeLineup ||
          awayLineup
            ? `

              <div class="bf-md-section">

                <div class="bf-md-title">
                  ⭐ أداء اللاعبين
                </div>

                <div class="bf-md-players">

                  ${renderPlayers(
                    homeLineup,
                    realHome,
                    contributions,
                    playerStats
                  )}

                  ${renderPlayers(
                    awayLineup,
                    realAway,
                    contributions,
                    playerStats
                  )}

                </div>

              </div>

            `
            : ""
        }

        ${renderEvents(
          events,
          realHomeId,
          realAwayId,
          realHome,
          realAway
        )}

        ${
          statistics.length
            ? renderStatistics(
                statistics
              )
            : ""
        }

      `;

    }
    catch (error) {

      console.error(
        "BAKHIRAFOOT MATCH DETAILS ERROR:",
        error
      );

      content.innerHTML += `

        <div class="bf-md-section">

          <div class="bf-md-title">
            ⚠️ Match Details
          </div>

          <div class="bf-md-empty">

            تعذر تحميل تفاصيل المباراة.

            <br><br>

            <small>
              ${esc(
                error.message
              )}
            </small>

          </div>

        </div>

      `;
    }
  }

  /* =========================================
     STATISTICS
  ========================================= */

  function renderStatistics(
    statistics
  ) {

    if (
      !Array.isArray(
        statistics
      )
    ) {
      return "";
    }

    const home =
      statistics[0] ||
      {};

    const away =
      statistics[1] ||
      {};

    const homeStats =
      arr(
        home?.statistics
      );

    const awayStats =
      arr(
        away?.statistics
      );

    if (
      !homeStats.length
    ) {
      return "";
    }

    const awayMap =
      new Map();

    awayStats.forEach(
      stat => {

        const key =
          norm(
            stat?.type ||
            stat?.name ||
            ""
          );

        awayMap.set(
          key,
          stat?.value ??
          "-"
        );

      }
    );

    const rows =
      homeStats
        .slice(0,20)
        .map(
          stat => {

            const key =
              norm(
                stat?.type ||
                stat?.name ||
                ""
              );

            return `

              <div class="bf-md-stat">

                <div class="bf-md-stat-home">
                  ${esc(
                    stat?.value ??
                    "-"
                  )}
                </div>

                <div class="bf-md-stat-name">
                  ${esc(
                    stat?.type ||
                    stat?.name ||
                    "Stat"
                  )}
                </div>

                <div>
                  ${esc(
                    awayMap.get(key) ??
                    "-"
                  )}
                </div>

              </div>

            `;
          }
        )
        .join("");

    return `

      <div class="bf-md-section">

        <div class="bf-md-title">
          📊 Statistiques
        </div>

        <div class="bf-md-stats">
          ${rows}
        </div>

      </div>

    `;
  }

  /* =========================================
     CLICK HANDLER
     CAPTURE = true
     باش onclick القديم ما يخدمش
  ========================================= */

  document.addEventListener(
    "click",
    function (event) {

      const card =
        event.target.closest(
          ".match-card"
        );

      if (!card) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (
        event.stopImmediatePropagation
      ) {
        event.stopImmediatePropagation();
      }

      const index =
        Number(
          card.dataset.matchIndex
        );

      openMatch(
        index,
        card
      );

    },
    true
  );

  /* =========================================
     ESC
  ========================================= */

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape"
      ) {
        close();
      }

    }
  );

})();
