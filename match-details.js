(function () {
  "use strict";

  const SPORT_SCORE_URL =
    "https://sportscore.com/api/v1/match/";

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getSlug(card) {
    return (
      card?.dataset?.matchSlug ||
      card?.dataset?.slug ||
      card?.dataset?.fixtureId ||
      null
    );
  }

  function createModal() {

    let modal =
      document.getElementById(
        "bfMatchDetailsModal"
      );

    if (modal) return modal;

    modal =
      document.createElement("div");

    modal.id =
      "bfMatchDetailsModal";

    modal.innerHTML = `
      <div class="bfmd-overlay">

        <div
          class="bfmd-box"
          onclick="event.stopPropagation()"
        >

          <button
            class="bfmd-close"
            id="bfmdClose"
          >
            ✕
          </button>

          <div id="bfmdContent"></div>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    document
      .getElementById("bfmdClose")
      .onclick = closeModal;

    modal
      .querySelector(".bfmd-overlay")
      .onclick = closeModal;

    addStyles();

    return modal;
  }

  function closeModal() {

    const modal =
      document.getElementById(
        "bfMatchDetailsModal"
      );

    if (modal) {
      modal.style.display = "none";
    }

    document.body.style.overflow = "";
  }

  function addStyles() {

    if (
      document.getElementById(
        "bfmdStyle"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "bfmdStyle";

    style.textContent = `

      #bfMatchDetailsModal {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: none;
      }

      .bfmd-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(0,0,0,.78);
        backdrop-filter: blur(6px);
        overflow-y: auto;
      }

      .bfmd-box {
        position: relative;
        width: min(1150px,100%);
        max-height: 94vh;
        overflow-y: auto;
        background: var(--card,#fff);
        color: var(--text,#111827);
        border-radius: 24px;
        padding: 28px;
        box-shadow:
          0 30px 100px rgba(0,0,0,.45);
      }

      .bfmd-close {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        background: rgba(127,127,127,.13);
        color: inherit;
        font-size: 18px;
        font-weight: 900;
        z-index: 20;
      }

      .bfmd-league {
        text-align: center;
        opacity: .6;
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 15px;
      }

      .bfmd-header {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 20px;
        align-items: center;
        text-align: center;
      }

      .bfmd-team {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 9px;
        font-weight: 900;
      }

      .bfmd-team img {
        width: 78px;
        height: 78px;
        object-fit: contain;
      }

      .bfmd-fallback {
        width: 78px;
        height: 78px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 42px;
      }

      .bfmd-score {
        font-size: 40px;
        font-weight: 950;
      }

      .bfmd-status {
        margin-top: 8px;
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(220,38,38,.1);
        font-size: 11px;
        font-weight: 900;
      }

      .bfmd-section {
        margin-top: 28px;
        padding-top: 22px;
        border-top: 1px solid rgba(127,127,127,.16);
      }

      .bfmd-title {
        margin-bottom: 15px;
        font-size: 18px;
        font-weight: 950;
      }

      /* PITCH */

      .bfmd-pitches {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .bfmd-pitch-card {
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid rgba(127,127,127,.15);
      }

      .bfmd-pitch-head {
        padding: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        font-weight: 900;
      }

      .bfmd-formation {
        padding: 5px 9px;
        border-radius: 999px;
        background: rgba(127,127,127,.11);
        font-size: 11px;
      }

      .bfmd-pitch {
        position: relative;
        width: 100%;
        aspect-ratio: .67;
        overflow: hidden;
        background:
          repeating-linear-gradient(
            90deg,
            #2d7d42 0%,
            #2d7d42 10%,
            #367f47 10%,
            #367f47 20%
          );
      }

      .bfmd-border {
        position: absolute;
        inset: 0;
        border: 2px solid rgba(255,255,255,.9);
      }

      .bfmd-half {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 2px;
        background: rgba(255,255,255,.9);
      }

      .bfmd-circle {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 18%;
        aspect-ratio: 1;
        transform: translate(-50%,-50%);
        border: 2px solid rgba(255,255,255,.9);
        border-radius: 50%;
      }

      .bfmd-player {
        position: absolute;
        transform: translate(-50%,-50%);
        width: 82px;
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 5;
      }

      .bfmd-number {
        width: 35px;
        height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: #fff;
        color: #111827;
        font-size: 11px;
        font-weight: 950;
        box-shadow: 0 4px 11px rgba(0,0,0,.3);
      }

      .bfmd-name {
        max-width: 78px;
        margin-top: 4px;
        padding: 3px 5px;
        border-radius: 5px;
        background: rgba(0,0,0,.68);
        color: #fff;
        font-size: 8px;
        font-weight: 850;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bfmd-rating {
        margin-top: 2px;
        padding: 2px 5px;
        border-radius: 5px;
        background: #fff;
        font-size: 8px;
        font-weight: 900;
      }

      /* PLAYERS */

      .bfmd-players {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .bfmd-row {
        display: grid;
        grid-template-columns: 36px 1fr auto;
        gap: 8px;
        align-items: center;
        padding: 9px;
        margin-bottom: 7px;
        border-radius: 10px;
        background: rgba(127,127,127,.07);
      }

      .bfmd-shirt {
        width: 31px;
        height: 31px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(127,127,127,.12);
        font-size: 10px;
        font-weight: 950;
      }

      .bfmd-player-name {
        font-size: 11px;
        font-weight: 900;
      }

      .bfmd-position {
        margin-top: 2px;
        font-size: 9px;
        opacity: .55;
      }

      .bfmd-badges {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 3px;
      }

      .bfmd-badge {
        padding: 3px 5px;
        border-radius: 5px;
        background: rgba(127,127,127,.12);
        font-size: 8px;
        font-weight: 900;
      }

      /* EVENTS */

      .bfmd-events {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .bfmd-event {
        display: grid;
        grid-template-columns: 45px 30px 1fr;
        gap: 8px;
        align-items: center;
        padding: 9px 11px;
        border-radius: 10px;
        background: rgba(127,127,127,.07);
      }

      .bfmd-minute {
        font-size: 10px;
        font-weight: 950;
      }

      .bfmd-event-icon {
        font-size: 18px;
        text-align: center;
      }

      .bfmd-event-player {
        font-size: 11px;
        font-weight: 900;
      }

      .bfmd-event-detail {
        margin-top: 2px;
        font-size: 9px;
        opacity: .58;
      }

      .bfmd-event-assist {
        margin-top: 3px;
        font-size: 9px;
        opacity: .72;
      }

      /* MOBILE */

      @media(max-width:800px) {

        .bfmd-pitches,
        .bfmd-players {
          grid-template-columns: 1fr;
        }

      }

      @media(max-width:600px) {

        .bfmd-box {
          padding: 20px 12px;
        }

        .bfmd-header {
          gap: 8px;
        }

        .bfmd-team img,
        .bfmd-fallback {
          width: 56px;
          height: 56px;
        }

        .bfmd-score {
          font-size: 27px;
        }

        .bfmd-team {
          font-size: 11px;
        }

        .bfmd-row {
          grid-template-columns: 34px 1fr;
        }

        .bfmd-badges {
          grid-column: 2;
          justify-content: flex-start;
        }

      }

    `;

    document.head.appendChild(
      style
    );
  }

  /* =======================================================
     FIND TEAM
  ======================================================= */

  function teamFrom(
    details,
    side
  ) {

    const teams =
      details?.teams ||
      {};

    const source =
      teams?.[side] ||
      details?.[side] ||
      {};

    return {

      id:
        source?.id ||
        details?.[`${side}_id`] ||
        null,

      name:
        source?.name ||
        details?.[`${side}_name`] ||
        details?.[side] ||
        (
          side === "home"
            ? "Domicile"
            : "Extérieur"
        ),

      logo:
        source?.logo ||
        details?.[`${side}_logo`] ||
        ""

    };
  }

  /* =======================================================
     LINEUP
  ======================================================= */

  function getLineup(
    lineups,
    team,
    fallbackIndex
  ) {

    if (
      !Array.isArray(lineups)
    ) {
      return null;
    }

    const exact =
      lineups.find(
        lineup => {

          const id =
            lineup?.team?.id ||
            lineup?.team_id ||
            null;

          const name =
            String(
              lineup?.team?.name ||
              lineup?.team_name ||
              ""
            ).toLowerCase();

          return (
            (
              team.id &&
              id &&
              String(team.id) ===
              String(id)
            ) ||
            (
              name &&
              name ===
              String(
                team.name
              ).toLowerCase()
            )
          );
        }
      );

    return (
      exact ||
      lineups[fallbackIndex] ||
      null
    );
  }

  function lineupPlayers(
    lineup
  ) {

    return (
      lineup?.startXI ||
      lineup?.startingXI ||
      lineup?.starting_xi ||
      lineup?.starters ||
      []
    );
  }

  /* =======================================================
     PITCH
  ======================================================= */

  function pitchPlayers(
    lineup,
    side
  ) {

    const players =
      lineupPlayers(
        lineup
      );

    const rows = {};

    players.forEach(
      item => {

        const p =
          item?.player ||
          item ||
          {};

        const grid =
          p?.grid ||
          item?.grid ||
          "";

        const m =
          String(grid).match(
            /(\d+)\s*:\s*(\d+)/
          );

        let row =
          m
            ? Number(m[1])
            : null;

        let column =
          m
            ? Number(m[2])
            : null;

        if (!row) {

          const pos =
            String(
              p?.pos ||
              p?.position ||
              item?.position ||
              ""
            ).toLowerCase();

          if (
            pos.includes("goal") ||
            pos === "g"
          ) {
            row = 1;
          }
          else if (
            pos.includes("def") ||
            pos === "d"
          ) {
            row = 2;
          }
          else if (
            pos.includes("mid") ||
            pos === "m"
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

        column =
          column ||
          rows[row].length + 1;

        rows[row].push({
          item,
          column
        });

      }
    );

    const rowKeys =
      Object.keys(rows)
        .map(Number)
        .sort((a,b) => a-b);

    const maxRow =
      Math.max(
        ...rowKeys,
        4
      );

    const result = [];

    rowKeys.forEach(
      row => {

        const list =
          rows[row].sort(
            (a,b) =>
              a.column -
              b.column
          );

        list.forEach(
          (entry,index) => {

            const x =
              list.length === 1
                ? 50
                : 16 +
                  68 *
                  (
                    index /
                    (list.length - 1)
                  );

            let y =
              8 +
              82 *
              (
                (row - 1) /
                Math.max(
                  1,
                  maxRow - 1
                )
              );

            if (
              side === "away"
            ) {
              y =
                100 - y;
            }

            result.push({
              player:
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

  function renderPitch(
    lineup,
    team,
    side
  ) {

    if (!lineup) {

      return `

        <div class="bfmd-pitch-card">

          <div class="bfmd-pitch-head">
            ${escapeHTML(team.name)}
          </div>

          <div
            style="
              padding:14px;
              font-size:11px;
              opacity:.6;
            "
          >
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
      pitchPlayers(
        lineup,
        side
      );

    const html =
      players
        .map(
          item => {

            const row =
              item.player;

            const p =
              row?.player ||
              row ||
              {};

            const name =
              p?.name ||
              row?.name ||
              "Joueur";

            const number =
              p?.number ??
              row?.number ??
              row?.shirt_number ??
              "-";

            const rating =
              row?.rating ??
              row?.statistics?.rating ??
              p?.rating ??
              null;

            return `

              <div
                class="bfmd-player"
                style="
                  left:${item.x}%;
                  top:${item.y}%;
                "
              >

                <div class="bfmd-number">
                  ${escapeHTML(number)}
                </div>

                <div class="bfmd-name">
                  ${escapeHTML(name)}
                </div>

                ${
                  rating !== null &&
                  rating !== undefined &&
                  rating !== ""
                    ? `
                      <div class="bfmd-rating">
                        ⭐ ${escapeHTML(
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

      <div class="bfmd-pitch-card">

        <div class="bfmd-pitch-head">

          <span>
            ${escapeHTML(team.name)}
          </span>

          <span class="bfmd-formation">
            ${escapeHTML(formation)}
          </span>

        </div>

        <div class="bfmd-pitch">

          <div class="bfmd-border"></div>
          <div class="bfmd-half"></div>
          <div class="bfmd-circle"></div>

          ${html}

        </div>

      </div>

    `;
  }

  /* =======================================================
     PLAYERS
  ======================================================= */

  function renderPlayers(
    lineup,
    team
  ) {

    if (!lineup) {

      return `
        <div>

          <div style="
            font-size:13px;
            font-weight:900;
            margin-bottom:10px;
          ">
            ${escapeHTML(team.name)}
          </div>

          <div class="bfmd-empty">
            Composition indisponible.
          </div>

        </div>
      `;
    }

    const list =
      lineupPlayers(
        lineup
      );

    return `

      <div>

        <div style="
          font-size:13px;
          font-weight:900;
          margin-bottom:10px;
        ">
          ${escapeHTML(team.name)}
        </div>

        ${
          list.length
            ? list.map(
                item => {

                  const p =
                    item?.player ||
                    item ||
                    {};

                  const rating =
                    item?.rating ??
                    item?.statistics?.rating ??
                    null;

                  const goals =
                    item?.goals?.total ??
                    0;

                  const assists =
                    item?.goals?.assists ??
                    0;

                  const yellow =
                    item?.cards?.yellow ??
                    0;

                  const red =
                    item?.cards?.red ??
                    0;

                  return `

                    <div class="bfmd-row">

                      <div class="bfmd-shirt">
                        ${escapeHTML(
                          p?.number ??
                          item?.number ??
                          item?.shirt_number ??
                          "-"
                        )}
                      </div>

                      <div>

                        <div class="bfmd-player-name">
                          ${escapeHTML(
                            p?.name ||
                            item?.name ||
                            "Joueur"
                          )}
                        </div>

                        <div class="bfmd-position">
                          ${escapeHTML(
                            p?.pos ||
                            p?.position ||
                            item?.position ||
                            ""
                          )}
                        </div>

                      </div>

                      <div class="bfmd-badges">

                        ${
                          rating !== null &&
                          rating !== undefined
                            ? `
                              <span class="bfmd-badge">
                                ⭐ ${escapeHTML(
                                  Number(
                                    rating
                                  ).toFixed(1)
                                )}
                              </span>
                            `
                            : ""
                        }

                        ${
                          Number(goals) > 0
                            ? `
                              <span class="bfmd-badge">
                                ⚽ ${goals}
                              </span>
                            `
                            : ""
                        }

                        ${
                          Number(assists) > 0
                            ? `
                              <span class="bfmd-badge">
                                🅰️ ${assists}
                              </span>
                            `
                            : ""
                        }

                        ${
                          Number(yellow) > 0
                            ? `
                              <span class="bfmd-badge">
                                🟨
                              </span>
                            `
                            : ""
                        }

                        ${
                          Number(red) > 0
                            ? `
                              <span class="bfmd-badge">
                                🟥
                              </span>
                            `
                            : ""
                        }

                      </div>

                    </div>

                  `;

                }
              ).join("")
            : `
              <div class="bfmd-empty">
                Aucun joueur disponible.
              </div>
            `
        }

      </div>

    `;
  }

  /* =======================================================
     EVENTS
  ======================================================= */

  function renderEvents(
    events,
    homeId,
    awayId
  ) {

    if (
      !events.length
    ) {

      return `

        <div class="bfmd-section">

          <div class="bfmd-title">
            ⚡ Événements
          </div>

          <div
            style="
              font-size:11px;
              opacity:.6;
            "
          >
            Aucun événement disponible.
          </div>

        </div>

      `;
    }

    const html =
      events
        .slice()
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

            const player =
              event?.player ||
              {};

            const assist =
              event?.assist ||
              {};

            const team =
              event?.team ||
              {};

            const type =
              String(
                event?.type ||
                ""
              ).toLowerCase();

            const detail =
              String(
                event?.detail ||
                event?.description ||
                ""
              ).toLowerCase();

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
            else if (
              type.includes("var")
            ) {
              icon = "🎥";
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

              <div class="bfmd-event">

                <div class="bfmd-minute">
                  ${escapeHTML(
                    minuteText
                  )}
                </div>

                <div class="bfmd-event-icon">
                  ${icon}
                </div>

                <div>

                  <div class="bfmd-event-player">
                    ${escapeHTML(
                      player?.name ||
                      event?.player_name ||
                      event?.detail ||
                      "Événement"
                    )}
                  </div>

                  ${
                    event?.detail
                      ? `
                        <div class="bfmd-event-detail">
                          ${escapeHTML(
                            event.detail
                          )}
                        </div>
                      `
                      : ""
                  }

                  ${
                    assist?.name
                      ? `
                        <div class="bfmd-event-assist">
                          🅰️ Passe décisive :
                          ${escapeHTML(
                            assist.name
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

      <div class="bfmd-section">

        <div class="bfmd-title">
          ⚡ Événements
        </div>

        <div class="bfmd-events">
          ${html}
        </div>

      </div>

    `;
  }

  /* =======================================================
     OPEN DETAILS
  ======================================================= */

  async function openDetails(
    card
  ) {

    const slug =
      getSlug(card);

    if (!slug) {

      alert(
        "Slug du match introuvable"
      );

      console.error(
        "BF DETAILS: no slug",
        card
      );

      return;
    }

    const modal =
      createModal();

    const content =
      document.getElementById(
        "bfmdContent"
      );

    modal.style.display =
      "block";

    document.body.style.overflow =
      "hidden";

    content.innerHTML = `

      <div class="bfmd-section">

        <div class="bfmd-title">
          ⚽ Match Details
        </div>

        <div
          style="
            font-size:12px;
            opacity:.65;
          "
        >
          جاري تحميل تفاصيل المباراة...
        </div>

      </div>

    `;

    console.log(
      "BF DETAILS SLUG:",
      slug
    );

    try {

      const response =
        await fetch(
          `${SPORT_SCORE_URL}?sport=football&slug=${encodeURIComponent(
            slug
          )}`,
          {
            cache: "no-store"
          }
        );

      const text =
        await response.text();

      console.log(
        "BF DETAILS RAW:",
        text
      );

      if (!response.ok) {
        throw new Error(
          `SportScore HTTP ${response.status}`
        );
      }

      let payload;

      try {
        payload =
          JSON.parse(text);
      }
      catch {
        throw new Error(
          "SportScore returned invalid JSON"
        );
      }

      console.log(
        "BF DETAILS JSON:",
        payload
      );

      const details =
        payload?.data ||
        payload?.match ||
        payload;

      const home =
        teamFrom(
          details,
          "home"
        );

      const away =
        teamFrom(
          details,
          "away"
        );

      const homeScore =
        details?.score?.home ??
        details?.home_score ??
        details?.homeScore ??
        "-";

      const awayScore =
        details?.score?.away ??
        details?.away_score ??
        details?.awayScore ??
        "-";

      const status =
        details?.status_text ||
        details?.status ||
        "MATCH";

      const competition =
        details?.competition?.name ||
        details?.league?.name ||
        details?.competition ||
        "Football";

      const events =
        Array.isArray(
          details?.timeline
        )
          ? details.timeline
          : (
              Array.isArray(
                details?.events
              )
                ? details.events
                : []
            );

      const lineups =
        Array.isArray(
          details?.lineups
        )
          ? details.lineups
          : [];

      const players =
        Array.isArray(
          details?.players
        )
          ? details.players
          : [];

      const homeLineup =
        getLineup(
          lineups,
          home,
          0
        );

      const awayLineup =
        getLineup(
          lineups,
          away,
          1
        );

      const playerStats =
        new Map();

      players.forEach(
        group => {

          arrSafe(
            group?.players
          ).forEach(
            row => {

              const p =
                row?.player ||
                row ||
                {};

              const id =
                p?.id ||
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
                  null

              };

              if (id) {
                playerStats.set(
                  `id:${id}`,
                  data
                );
              }

              if (name) {
                playerStats.set(
                  `name:${String(name).toLowerCase()}`,
                  data
                );
              }

            }
          );

        }
      );

      /*
         Header
      */

      content.innerHTML = `

        <div class="bfmd-league">
          🏆 ${escapeHTML(
            competition
          )}
        </div>

        <div class="bfmd-header">

          <div class="bfmd-team">

            ${
              home.logo
                ? `
                  <img
                    src="${escapeHTML(
                      home.logo
                    )}"
                  >
                `
                : `
                  <div class="bfmd-fallback">
                    ⚽
                  </div>
                `
            }

            <span>
              ${escapeHTML(home.name)}
            </span>

          </div>

          <div>

            <div class="bfmd-score">
              ${escapeHTML(
                homeScore
              )}
              -
              ${escapeHTML(
                awayScore
              )}
            </div>

            <div class="bfmd-status">
              ${escapeHTML(
                status
              )}
            </div>

          </div>

          <div class="bfmd-team">

            ${
              away.logo
                ? `
                  <img
                    src="${escapeHTML(
                      away.logo
                    )}"
                  >
                `
                : `
                  <div class="bfmd-fallback">
                    ⚽
                  </div>
                `
            }

            <span>
              ${escapeHTML(away.name)}
            </span>

          </div>

        </div>

        <div class="bfmd-section">

          <div class="bfmd-title">
            🧩 Formations & Compositions
          </div>

          <div class="bfmd-pitches">

            ${renderPitch(
              homeLineup,
              home,
              "home"
            )}

            ${renderPitch(
              awayLineup,
              away,
              "away"
            )}

          </div>

        </div>

        <div class="bfmd-section">

          <div class="bfmd-title">
            ⭐ Performance des joueurs
          </div>

          <div class="bfmd-players">

            ${renderPlayers(
              homeLineup,
              home
            )}

            ${renderPlayers(
              awayLineup,
              away
            )}

          </div>

        </div>

        ${renderEvents(
          events,
          home.id,
          away.id
        )}

      `;

    }
    catch (error) {

      console.error(
        "BF DETAILS ERROR:",
        error
      );

      content.innerHTML = `

        <div class="bfmd-section">

          <div class="bfmd-title">
            ⚠️ Match Details
          </div>

          <div
            style="
              padding:14px;
              border-radius:10px;
              background:rgba(127,127,127,.08);
              font-size:12px;
            "
          >

            تعذر تحميل تفاصيل هاد الماتش.

            <br><br>

            <strong>
              ${escapeHTML(
                error.message
              )}
            </strong>

          </div>

        </div>

      `;
    }
  }

  function arrSafe(
    value
  ) {
    return Array.isArray(value)
      ? value
      : [];
  }

  /* =======================================================
     CLICK HANDLER
  ======================================================= */

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

      /*
         مهم:
         ما كنوقفوش propagation
         ديال الموقع كامل.

         غير كنمنعو onclick القديم
         ديال match-card.
      */

      event.preventDefault();

      event.stopImmediatePropagation();

      openDetails(card);

    },
    true
  );

  /* =======================================================
     ESC
  ======================================================= */

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape"
      ) {
        closeModal();
      }

    }
  );

})();
