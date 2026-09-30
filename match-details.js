
(function () {
  "use strict";

  /*
   * BakhiraFoot - Match Details
   * يعتمد على API الداخلي:
   * /api?fixture=SLUG
   */

  const DETAILS_API = "/api?fixture=";

  /* =======================================================
     HELPERS
  ======================================================= */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function arrSafe(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  function getSlug(card) {
    return (
      card?.dataset?.matchSlug ||
      card?.dataset?.slug ||
      card?.dataset?.fixtureId ||
      card?.dataset?.fixture ||
      null
    );
  }

  function firstValue(...values) {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return value;
      }
    }

    return null;
  }

  /* =======================================================
     MODAL
  ======================================================= */

  function createModal() {
    let modal = document.getElementById("bfMatchDetailsModal");

    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "bfMatchDetailsModal";

    modal.innerHTML = `
      <div class="bfmd-overlay">
        <div
          class="bfmd-box"
          onclick="event.stopPropagation()"
        >
          <button
            class="bfmd-close"
            id="bfmdClose"
            aria-label="Fermer"
          >
            ✕
          </button>

          <div id="bfmdContent"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("bfmdClose").onclick = closeModal;

    modal
      .querySelector(".bfmd-overlay")
      .onclick = closeModal;

    addStyles();

    return modal;
  }

  function closeModal() {
    const modal =
      document.getElementById("bfMatchDetailsModal");

    if (modal) {
      modal.style.display = "none";
    }

    document.body.style.overflow = "";
  }

  /* =======================================================
     STYLES
  ======================================================= */

  function addStyles() {
    if (document.getElementById("bfmdStyle")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "bfmdStyle";

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
        background: rgba(0,0,0,.80);
        backdrop-filter: blur(7px);
        overflow-y: auto;
      }

      .bfmd-box {
        position: relative;
        width: min(1180px,100%);
        max-height: 94vh;
        overflow-y: auto;
        background: var(--card,#fff);
        color: var(--text,#111827);
        border-radius: 24px;
        padding: 28px;
        box-shadow: 0 30px 100px rgba(0,0,0,.45);
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
        z-index: 30;
      }

      .bfmd-close:hover {
        background: rgba(220,38,38,.15);
      }

      .bfmd-league {
        text-align: center;
        opacity: .65;
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
        background: rgba(220,38,38,.10);
        font-size: 11px;
        font-weight: 900;
      }

      .bfmd-info {
        margin-top: 14px;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 7px;
      }

      .bfmd-info span {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(127,127,127,.09);
        font-size: 10px;
        font-weight: 800;
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

      /* ===================================================
         PITCH
      =================================================== */

      .bfmd-pitches {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .bfmd-pitch-card {
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid rgba(127,127,127,.15);
        background: rgba(127,127,127,.025);
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
            #26743b 0%,
            #26743b 10%,
            #2e8045 10%,
            #2e8045 20%
          );
      }

      .bfmd-border {
        position: absolute;
        inset: 8px;
        border: 2px solid rgba(255,255,255,.92);
        pointer-events: none;
      }

      .bfmd-half {
        position: absolute;
        left: 8px;
        right: 8px;
        top: 50%;
        height: 2px;
        background: rgba(255,255,255,.92);
      }

      .bfmd-circle {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 20%;
        aspect-ratio: 1;
        transform: translate(-50%,-50%);
        border: 2px solid rgba(255,255,255,.92);
        border-radius: 50%;
      }

      .bfmd-center-dot {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 7px;
        height: 7px;
        transform: translate(-50%,-50%);
        border-radius: 50%;
        background: white;
      }

      .bfmd-box-line {
        position: absolute;
        left: 27%;
        right: 27%;
        height: 16%;
        border: 2px solid rgba(255,255,255,.92);
      }

      .bfmd-box-line.top {
        top: 8px;
      }

      .bfmd-box-line.bottom {
        bottom: 8px;
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

      .bfmd-photo-wrap {
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255,255,255,.95);
        border: 2px solid rgba(255,255,255,.95);
        box-shadow: 0 4px 12px rgba(0,0,0,.35);
        overflow: hidden;
      }

      .bfmd-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .bfmd-number {
        position: absolute;
        right: -7px;
        bottom: -5px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #fff;
        color: #111827;
        border: 1px solid rgba(0,0,0,.15);
        font-size: 8px;
        font-weight: 950;
      }

      .bfmd-number-only {
        width: 36px;
        height: 36px;
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
        max-width: 82px;
        margin-top: 5px;
        padding: 3px 5px;
        border-radius: 5px;
        background: rgba(0,0,0,.72);
        color: #fff;
        font-size: 8px;
        font-weight: 850;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }

      .bfmd-rating {
        margin-top: 2px;
        padding: 2px 5px;
        border-radius: 5px;
        background: #fff;
        font-size: 8px;
        font-weight: 900;
      }

      .bfmd-event-mini {
        position: absolute;
        top: -7px;
        left: -8px;
        display: flex;
        gap: 2px;
        z-index: 10;
        font-size: 10px;
      }

      /* ===================================================
         PLAYERS
      =================================================== */

      .bfmd-players {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .bfmd-row {
        display: grid;
        grid-template-columns: 42px 40px 1fr auto;
        gap: 8px;
        align-items: center;
        padding: 9px;
        margin-bottom: 7px;
        border-radius: 10px;
        background: rgba(127,127,127,.07);
      }

      .bfmd-player-photo {
        width: 38px;
        height: 38px;
        object-fit: cover;
        border-radius: 50%;
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

      .bfmd-empty {
        padding: 12px;
        font-size: 11px;
        opacity: .6;
      }

      /* ===================================================
         EVENTS
      =================================================== */

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

      /* ===================================================
         MOBILE
      =================================================== */

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
          grid-template-columns: 34px 35px 1fr;
        }

        .bfmd-badges {
          grid-column: 3;
          justify-content: flex-start;
        }

        .bfmd-player {
          width: 65px;
        }

        .bfmd-name {
          max-width: 65px;
          font-size: 7px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     TEAM
  ======================================================= */

  function teamFrom(details, side) {
    const teams = details?.teams || {};
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
        (typeof details?.[side] === "string"
          ? details[side]
          : null) ||
        (side === "home"
          ? "Domicile"
          : "Extérieur"),

      logo:
        source?.logo ||
        details?.[`${side}_logo`] ||
        ""
    };
  }

  /* =======================================================
     LINEUP
  ======================================================= */

  function getLineup(lineups, team, fallbackIndex) {
    if (!Array.isArray(lineups)) {
      return null;
    }

    const exact = lineups.find(lineup => {
      const id =
        lineup?.team?.id ||
        lineup?.team_id ||
        null;

      const name = String(
        lineup?.team?.name ||
        lineup?.team_name ||
        ""
      ).toLowerCase();

      return (
        (team.id &&
          id &&
          String(team.id) === String(id)) ||
        (
          name &&
          name ===
            String(team.name).toLowerCase()
        )
      );
    });

    return exact ||
      lineups[fallbackIndex] ||
      null;
  }

  function lineupPlayers(lineup) {
    return (
      lineup?.startXI ||
      lineup?.startingXI ||
      lineup?.starting_xi ||
      lineup?.starters ||
      []
    );
  }

  /* =======================================================
     PLAYER HELPERS
  ======================================================= */

  function getPlayerObject(item) {
    return item?.player || item || {};
  }

  function getPlayerName(item) {
    const p = getPlayerObject(item);

    return (
      p?.name ||
      item?.name ||
      "Joueur"
    );
  }

  function getPlayerNumber(item) {
    const p = getPlayerObject(item);

    return firstValue(
      p?.number,
      item?.number,
      item?.shirt_number,
      "-"
    );
  }

  function getPlayerPhoto(item) {
    const p = getPlayerObject(item);

    return firstValue(
      p?.photo,
      p?.image,
      p?.avatar,
      item?.photo,
      item?.image,
      item?.avatar,
      ""
    );
  }

  function getPlayerPosition(item) {
    const p = getPlayerObject(item);

    return firstValue(
      p?.pos,
      p?.position,
      item?.position,
      ""
    );
  }

  function getPlayerId(item) {
    const p = getPlayerObject(item);

    return firstValue(
      p?.id,
      item?.id,
      null
    );
  }

  /* =======================================================
     PLAYER IMAGE
  ======================================================= */

  function playerImageHTML(item) {
    const photo = getPlayerPhoto(item);

    if (!photo) {
      return `
        <div class="bfmd-number-only">
          ${escapeHTML(getPlayerNumber(item))}
        </div>
      `;
    }

    return `
      <div class="bfmd-photo-wrap">
        <img
          class="bfmd-photo"
          src="${escapeHTML(photo)}"
          alt="${escapeHTML(getPlayerName(item))}"
          loading="lazy"
          onerror="
            this.style.display='none';
            this.parentElement.classList.add('bfmd-photo-error');
          "
        >

        <div class="bfmd-number">
          ${escapeHTML(getPlayerNumber(item))}
        </div>
      </div>
    `;
  }

  /* =======================================================
     PITCH POSITION
  ======================================================= */

  function pitchPlayers(lineup, side) {
    const players = lineupPlayers(lineup);

    const rows = {};

    players.forEach(item => {
      const p = getPlayerObject(item);

      const grid =
        p?.grid ||
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

      let column =
        match
          ? Number(match[2])
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
          pos === "g" ||
          pos === "gk"
        ) {
          row = 1;
        } else if (
          pos.includes("def") ||
          pos === "d"
        ) {
          row = 2;
        } else if (
          pos.includes("mid") ||
          pos === "m"
        ) {
          row = 3;
        } else {
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
    });

    const rowKeys =
      Object.keys(rows)
        .map(Number)
        .sort(
          (a,b) => a-b
        );

    const maxRow =
      Math.max(
        ...rowKeys,
        4
      );

    const result = [];

    rowKeys.forEach(row => {
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
              : 14 +
                72 *
                (
                  index /
                  (list.length - 1)
                );

          let y =
            8 +
            84 *
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
            y = 100 - y;
          }

          result.push({
            player: entry.item,
            x,
            y
          });
        }
      );
    });

    return result;
  }

  /* =======================================================
     EVENT MAP
  ======================================================= */

  function buildPlayerEvents(events) {
    const map = new Map();

    arrSafe(events).forEach(event => {
      const player =
        event?.player ||
        {};

      const id =
        player?.id ||
        event?.player_id ||
        null;

      const name =
        player?.name ||
        event?.player_name ||
        "";

      const key =
        id
          ? `id:${id}`
          : name
            ? `name:${String(name).toLowerCase()}`
            : null;

      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          goals: 0,
          assists: 0,
          yellow: 0,
          red: 0,
          substitutionsIn: 0,
          substitutionsOut: 0
        });
      }

      const data =
        map.get(key);

      const type =
        String(
          event?.type ||
          ""
        ).toLowerCase();

      const detail =
        String(
          event?.detail ||
          ""
        ).toLowerCase();

      if (
        type.includes("goal")
      ) {
        data.goals++;
      }

      if (
        event?.assist?.id ||
        event?.assist?.name
      ) {
        data.assists++;
      }

      if (
        type.includes("card")
      ) {
        if (
          detail.includes("red") ||
          detail.includes("second yellow")
        ) {
          data.red++;
        } else if (
          detail.includes("yellow")
        ) {
          data.yellow++;
        }
      }

      if (
        type.includes("subst")
      ) {
        const assist =
          event?.assist ||
          {};

        const playerName =
          String(
            player?.name ||
            ""
          ).toLowerCase();

        const assistName =
          String(
            assist?.name ||
            ""
          ).toLowerCase();

        /*
         * SportScore peut représenter
         * entrant/sortant différemment.
         */
        if (
          assistName &&
          playerName &&
          assistName !== playerName
        ) {
          data.substitutionsOut++;
        }
      }
    });

    return map;
  }

  function getEventStats(item, eventMap) {
    const id =
      getPlayerId(item);

    const name =
      getPlayerName(item);

    return (
      (id &&
        eventMap.get(
          `id:${id}`
        )) ||
      eventMap.get(
        `name:${String(name).toLowerCase()}`
      ) ||
      {
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        substitutionsIn: 0,
        substitutionsOut: 0
      }
    );
  }

  /* =======================================================
     PITCH
  ======================================================= */

  function renderPitch(
    lineup,
    team,
    side,
    eventMap
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
            Composition indisponible.
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
        .map(item => {
          const row =
            item.player;

          const name =
            getPlayerName(row);

          const rating =
            firstValue(
              row?.rating,
              row?.statistics?.rating,
              getPlayerObject(row)?.rating
            );

          const stats =
            getEventStats(
              row,
              eventMap
            );

          const eventBadges = [];

          if (stats.goals > 0) {
            eventBadges.push("⚽");
          }

          if (stats.assists > 0) {
            eventBadges.push("🅰️");
          }

          if (stats.yellow > 0) {
            eventBadges.push("🟨");
          }

          if (stats.red > 0) {
            eventBadges.push("🟥");
          }

          if (stats.substitutionsIn > 0) {
            eventBadges.push("↗️");
          }

          if (stats.substitutionsOut > 0) {
            eventBadges.push("↙️");
          }

          return `
            <div
              class="bfmd-player"
              style="
                left:${item.x}%;
                top:${item.y}%;
              "
              title="${escapeHTML(name)}"
            >

              ${
                eventBadges.length
                  ? `
                    <div class="bfmd-event-mini">
                      ${eventBadges.join("")}
                    </div>
                  `
                  : ""
              }

              ${playerImageHTML(row)}

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
                        Number(rating)
                          .toFixed(1)
                      )}
                    </div>
                  `
                  : ""
              }

            </div>
          `;
        })
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

          <div class="bfmd-center-dot"></div>

          <div class="bfmd-box-line top"></div>

          <div class="bfmd-box-line bottom"></div>

          ${html}

        </div>
      </div>
    `;
  }

  /* =======================================================
     PLAYERS LIST
  ======================================================= */

  function renderPlayers(
    lineup,
    team,
    eventMap
  ) {
    if (!lineup) {
      return `
        <div>
          <div
            style="
              font-size:13px;
              font-weight:900;
              margin-bottom:10px;
            "
          >
            ${escapeHTML(team.name)}
          </div>

          <div class="bfmd-empty">
            Composition indisponible.
          </div>
        </div>
      `;
    }

    const list =
      lineupPlayers(lineup);

    return `
      <div>

        <div
          style="
            font-size:13px;
            font-weight:900;
            margin-bottom:10px;
          "
        >
          ${escapeHTML(team.name)}
        </div>

        ${
          list.length
            ? list
                .map(item => {
                  const p =
                    getPlayerObject(item);

                  const stats =
                    getEventStats(
                      item,
                      eventMap
                    );

                  const rating =
                    firstValue(
                      item?.rating,
                      item?.statistics?.rating,
                      p?.rating
                    );

                  const photo =
                    getPlayerPhoto(item);

                  return `
                    <div class="bfmd-row">

                      <div class="bfmd-shirt">
                        ${escapeHTML(
                          getPlayerNumber(item)
                        )}
                      </div>

                      ${
                        photo
                          ? `
                            <img
                              class="bfmd-player-photo"
                              src="${escapeHTML(photo)}"
                              alt="${escapeHTML(
                                getPlayerName(item)
                              )}"
                              loading="lazy"
                              onerror="
                                this.style.display='none';
                              "
                            >
                          `
                          : `
                            <div></div>
                          `
                      }

                      <div>

                        <div class="bfmd-player-name">
                          ${escapeHTML(
                            getPlayerName(item)
                          )}
                        </div>

                        <div class="bfmd-position">
                          ${escapeHTML(
                            getPlayerPosition(item)
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
                                  Number(rating)
                                    .toFixed(1)
                                )}
                              </span>
                            `
                            : ""
                        }

                        ${
                          stats.goals > 0
                            ? `
                              <span class="bfmd-badge">
                                ⚽ ${stats.goals}
                              </span>
                            `
                            : ""
                        }

                        ${
                          stats.assists > 0
                            ? `
                              <span class="bfmd-badge">
                                🅰️ ${stats.assists}
                              </span>
                            `
                            : ""
                        }

                        ${
                          stats.yellow > 0
                            ? `
                              <span class="bfmd-badge">
                                🟨
                              </span>
                            `
                            : ""
                        }

                        ${
                          stats.red > 0
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
                })
                .join("")
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

  function eventIcon(event) {
    const type =
      String(
        event?.type ||
        ""
      ).toLowerCase();

    const detail =
      String(
        event?.detail ||
        ""
      ).toLowerCase();

    if (
      type.includes("goal")
    ) {
      return "⚽";
    }

    if (
      type.includes("card")
    ) {
      if (
        detail.includes("red") ||
        detail.includes("second yellow")
      ) {
        return "🟥";
      }

      return "🟨";
    }

    if (
      type.includes("subst")
    ) {
      return "🔄";
    }

    if (
      type.includes("var")
    ) {
      return "🎥";
    }

    return "📌";
  }

  function renderEvents(
    events
  ) {
    if (!events.length) {
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
          (a,b) => {
            const am =
              Number(
                a?.time?.elapsed ??
                a?.minute ??
                999
              );

            const bm =
              Number(
                b?.time?.elapsed ??
                b?.minute ??
                999
              );

            return am - bm;
          }
        )
        .map(event => {

          const player =
            event?.player ||
            {};

          const assist =
            event?.assist ||
            {};

          const minute =
            firstValue(
              event?.time?.elapsed,
              event?.minute,
              ""
            );

          const extra =
            firstValue(
              event?.time?.extra,
              event?.extra,
              ""
            );

          const minuteText =
            minute !== ""
              ? extra
                ? `${minute}+${extra}'`
                : `${minute}'`
              : "";

          const playerName =
            firstValue(
              player?.name,
              event?.player_name,
              event?.detail,
              "Événement"
            );

          let detail =
            event?.detail ||
            event?.description ||
            "";

          const type =
            String(
              event?.type ||
              ""
            ).toLowerCase();

          /*
           * Substitution
           */
          let substitutionText = "";

          if (
            type.includes("subst")
          ) {
            const inPlayer =
              event?.assist?.name ||
              event?.player_in?.name ||
              event?.incoming?.name ||
              "";

            const outPlayer =
              event?.player?.name ||
              event?.player_out?.name ||
              event?.outgoing?.name ||
              "";

            if (
              inPlayer &&
              outPlayer &&
              inPlayer !== outPlayer
            ) {
              substitutionText =
                `${escapeHTML(outPlayer)} → ${escapeHTML(inPlayer)}`;
            }
          }

          return `
            <div class="bfmd-event">

              <div class="bfmd-minute">
                ${escapeHTML(
                  minuteText
                )}
              </div>

              <div class="bfmd-event-icon">
                ${eventIcon(event)}
              </div>

              <div>

                <div class="bfmd-event-player">
                  ${
                    substitutionText
                      ? substitutionText
                      : escapeHTML(
                          playerName
                        )
                  }
                </div>

                ${
                  detail
                    ? `
                      <div class="bfmd-event-detail">
                        ${escapeHTML(
                          detail
                        )}
                      </div>
                    `
                    : ""
                }

                ${
                  assist?.name &&
                  !type.includes("subst")
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
        })
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

  async function openDetails(card) {
    const slug =
      getSlug(card);

    if (!slug) {
      alert(
        "Identifiant du match introuvable"
      );

      console.error(
        "BakhiraFoot DETAILS: no slug",
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
      "BakhiraFoot DETAILS:",
      slug
    );

    try {

      /*
       * IMPORTANT:
       * On utilise maintenant le backend BakhiraFoot.
       */
      const response =
        await fetch(
          `${DETAILS_API}${encodeURIComponent(slug)}`,
          {
            cache: "no-store"
          }
        );

      const text =
        await response.text();

      console.log(
        "BakhiraFoot DETAILS RAW:",
        text
      );

      if (!response.ok) {
        throw new Error(
          `API HTTP ${response.status}`
        );
      }

      let payload;

      try {
        payload =
          JSON.parse(text);
      } catch {
        throw new Error(
          "API a retourné un JSON invalide"
        );
      }

      console.log(
        "BakhiraFoot DETAILS JSON:",
        payload
      );

      const details =
        payload?.data ||
        payload?.match ||
        payload;

      if (!details) {
        throw new Error(
          "Données du match introuvables"
        );
      }

      /* =================================================
         TEAM
      ================================================= */

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

      /* =================================================
         SCORE
      ================================================= */

      const homeScore =
        firstValue(
          details?.score?.home,
          details?.home_score,
          details?.homeScore,
          "-"
        );

      const awayScore =
        firstValue(
          details?.score?.away,
          details?.away_score,
          details?.awayScore,
          "-"
        );

      /* =================================================
         STATUS
      ================================================= */

      const status =
        firstValue(
          details?.status_text,
          details?.status,
          details?.fixture?.status?.long,
          "MATCH"
        );

      /* =================================================
         COMPETITION
      ================================================= */

      const competition =
        firstValue(
          details?.competition?.name,
          details?.league?.name,
          typeof details?.competition ===
            "string"
            ? details.competition
            : null,
          "Football"
        );

      /* =================================================
         EXTRA INFO
      ================================================= */

      const stadium =
        firstValue(
          details?.venue?.name,
          details?.stadium?.name,
          details?.venue,
          ""
        );

      const referee =
        firstValue(
          details?.referee?.name,
          details?.referee,
          ""
        );

      const date =
        firstValue(
          details?.date,
          details?.fixture?.date,
          details?.start_at,
          ""
        );

      /* =================================================
         EVENTS
      ================================================= */

      const events =
        Array.isArray(
          details?.timeline
        )
          ? details.timeline
          : Array.isArray(
              details?.events
            )
            ? details.events
            : [];

      /* =================================================
         LINEUPS
      ================================================= */

      const lineups =
        Array.isArray(
          details?.lineups
        )
          ? details.lineups
          : [];

      /* =================================================
         PLAYERS
      ================================================= */

      const players =
        Array.isArray(
          details?.players
        )
          ? details.players
          : [];

      /* =================================================
         FIND LINEUPS
      ================================================= */

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

      /* =================================================
         EVENT MAP
      ================================================= */

      const eventMap =
        buildPlayerEvents(
          events
        );

      /* =================================================
         RENDER
      ================================================= */

      content.innerHTML = `

        <div class="bfmd-league">
          🏆
          ${escapeHTML(
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
                    alt="${escapeHTML(
                      home.name
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
              ${escapeHTML(
                home.name
              )}
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
                    alt="${escapeHTML(
                      away.name
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
              ${escapeHTML(
                away.name
              )}
            </span>

          </div>

        </div>

        ${
          stadium ||
          referee ||
          date
            ? `
              <div class="bfmd-info">

                ${
                  date
                    ? `
                      <span>
                        📅 ${escapeHTML(
                          date
                        )}
                      </span>
                    `
                    : ""
                }

                ${
                  stadium
                    ? `
                      <span>
                        🏟️ ${escapeHTML(
                          stadium
                        )}
                      </span>
                    `
                    : ""
                }

                ${
                  referee
                    ? `
                      <span>
                        👨‍⚖️ ${escapeHTML(
                          referee
                        )}
                      </span>
                    `
                    : ""
                }

              </div>
            `
            : ""
        }

        <div class="bfmd-section">

          <div class="bfmd-title">
            🧩 Formations & Compositions
          </div>

          <div class="bfmd-pitches">

            ${renderPitch(
              homeLineup,
              home,
              "home",
              eventMap
            )}

            ${renderPitch(
              awayLineup,
              away,
              "away",
              eventMap
            )}

          </div>

        </div>

        <div class="bfmd-section">

          <div class="bfmd-title">
            👥 Joueurs
          </div>

          <div class="bfmd-players">

            ${renderPlayers(
              homeLineup,
              home,
              eventMap
            )}

            ${renderPlayers(
              awayLineup,
              away,
              eventMap
            )}

          </div>

        </div>

        ${renderEvents(
          events
        )}

      `;

    } catch (err) {

      console.error(
        "BakhiraFoot DETAILS ERROR:",
        err
      );

      content.innerHTML = `

        <div class="bfmd-section">

          <div class="bfmd-title">
            ❌ Erreur
          </div>

          <div
            style="
              font-size:12px;
              color:#ef4444;
            "
          >
            ${escapeHTML(
              err.message ||
              "Erreur lors du chargement des détails."
            )}
          </div>

        </div>

      `;
    }
  }

  /* =======================================================
     GLOBAL
  ======================================================= */

  window.bfOpenMatchDetails =
    openDetails;

  /* =======================================================
     CLICK MATCH
  ======================================================= */

  document.addEventListener(
    "click",
    function (e) {

      const card =
        e.target.closest(
          "[data-match-slug]," +
          "[data-slug]," +
          "[data-fixture-id]," +
          "[data-fixture]"
        );

      if (!card) {
        return;
      }

      /*
       * ما نفتحووش التفاصيل إلا
       * إذا فعلاً عندنا identifier.
       */
      if (
        getSlug(card)
      ) {
        openDetails(card);
      }

    }
  );

})();
