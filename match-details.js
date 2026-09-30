(function () {
  "use strict";

  const DETAILS_API = "/api?fixture=";

  /* =========================================================
     HELPERS
  ========================================================= */

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function first(...values) {
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

  function arr(value) {
    return Array.isArray(value)
      ? value
      : [];
  }

  function obj(value) {
    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      ? value
      : null;
  }

  function norm(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(/\s+/g, " ");
  }

  /* =========================================================
     MODAL
  ========================================================= */

  function createModal() {

    let modal =
      document.getElementById(
        "bfMatchDetailsModal"
      );

    if (modal) {
      return modal;
    }

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
            type="button"
            aria-label="Fermer"
          >
            ✕
          </button>

          <div id="bfmdContent"></div>

        </div>

      </div>
    `;

    document.body.appendChild(
      modal
    );

    modal
      .querySelector(
        ".bfmd-overlay"
      )
      .addEventListener(
        "click",
        closeModal
      );

    modal
      .querySelector(
        ".bfmd-close"
      )
      .addEventListener(
        "click",
        closeModal
      );

    addStyles();

    return modal;
  }

  function closeModal() {

    const modal =
      document.getElementById(
        "bfMatchDetailsModal"
      );

    if (modal) {
      modal.style.display =
        "none";
    }

    document.body.style.overflow =
      "";
  }

  /* =========================================================
     STYLES
  ========================================================= */

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
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,.82);
        backdrop-filter: blur(7px);
        overflow-y: auto;
      }

      .bfmd-box {
        position: relative;
        width: min(1200px,100%);
        max-height: 95vh;
        overflow-y: auto;
        padding: 28px;
        border-radius: 24px;
        background: var(--card,#fff);
        color: var(--text,#111827);
        box-shadow:
          0 30px 100px rgba(0,0,0,.45);
      }

      .bfmd-close {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 100;
        width: 40px;
        height: 40px;
        border: 0;
        border-radius: 50%;
        cursor: pointer;
        background: rgba(127,127,127,.13);
        color: inherit;
        font-size: 18px;
        font-weight: 900;
      }

      .bfmd-close:hover {
        background: rgba(220,38,38,.15);
      }

      .bfmd-league {
        text-align: center;
        margin-bottom: 14px;
        font-size: 13px;
        font-weight: 900;
        opacity: .68;
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
        gap: 8px;
        font-size: 14px;
        font-weight: 950;
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
        font-size: 40px;
      }

      .bfmd-score {
        font-size: 42px;
        line-height: 1;
        font-weight: 950;
      }

      .bfmd-status {
        display: inline-block;
        margin-top: 8px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(220,38,38,.10);
        font-size: 10px;
        font-weight: 900;
      }

      .bfmd-info {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 14px;
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

      /* =====================================================
         SUMMARY
      ===================================================== */

      .bfmd-summary {
        display: grid;
        grid-template-columns:
          repeat(4,1fr);
        gap: 9px;
      }

      .bfmd-summary-box {
        padding: 13px;
        border-radius: 12px;
        background: rgba(127,127,127,.07);
        text-align: center;
      }

      .bfmd-summary-value {
        font-size: 19px;
        font-weight: 950;
      }

      .bfmd-summary-label {
        margin-top: 3px;
        font-size: 9px;
        opacity: .58;
        font-weight: 800;
      }

      /* =====================================================
         PITCH
      ===================================================== */

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
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 12px;
        font-size: 12px;
        font-weight: 950;
      }

      .bfmd-formation {
        padding: 5px 9px;
        border-radius: 999px;
        background: rgba(127,127,127,.11);
        font-size: 10px;
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
        border:
          2px solid rgba(255,255,255,.92);
      }

      .bfmd-half {
        position: absolute;
        left: 8px;
        right: 8px;
        top: 50%;
        height: 2px;
        background:
          rgba(255,255,255,.92);
      }

      .bfmd-circle {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 20%;
        aspect-ratio: 1;
        transform:
          translate(-50%,-50%);
        border:
          2px solid rgba(255,255,255,.92);
        border-radius: 50%;
      }

      .bfmd-center-dot {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 7px;
        height: 7px;
        transform:
          translate(-50%,-50%);
        border-radius: 50%;
        background: #fff;
      }

      .bfmd-box-line {
        position: absolute;
        left: 27%;
        right: 27%;
        height: 16%;
        border:
          2px solid rgba(255,255,255,.92);
      }

      .bfmd-box-line.top {
        top: 8px;
      }

      .bfmd-box-line.bottom {
        bottom: 8px;
      }

      .bfmd-player {
        position: absolute;
        transform:
          translate(-50%,-50%);
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
        overflow: hidden;
        border-radius: 50%;
        border:
          2px solid rgba(255,255,255,.95);
        background: #fff;
        box-shadow:
          0 4px 12px rgba(0,0,0,.35);
      }

      .bfmd-photo {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .bfmd-number {
        position: absolute;
        right: -7px;
        bottom: -5px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 999px;
        background: #fff;
        color: #111827;
        border:
          1px solid rgba(0,0,0,.15);
        font-size: 8px;
        font-weight: 950;
      }

      .bfmd-number-only {
        width: 36px;
        height: 36px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        background: #fff;
        color: #111827;
        font-size: 11px;
        font-weight: 950;
        box-shadow:
          0 4px 11px rgba(0,0,0,.3);
      }

      .bfmd-name {
        max-width: 82px;
        margin-top: 5px;
        padding: 3px 5px;
        border-radius: 5px;
        background: rgba(0,0,0,.72);
        color: #fff;
        font-size: 8px;
        font-weight: 900;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bfmd-rating {
        margin-top: 2px;
        padding: 2px 5px;
        border-radius: 5px;
        background: #fff;
        color: #111827;
        font-size: 8px;
        font-weight: 900;
      }

      .bfmd-event-mini {
        position: absolute;
        top: -8px;
        left: -8px;
        z-index: 10;
        display: flex;
        gap: 2px;
        font-size: 10px;
      }

      /* =====================================================
         PLAYERS
      ===================================================== */

      .bfmd-players {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .bfmd-column-title {
        margin-bottom: 9px;
        font-size: 13px;
        font-weight: 950;
      }

      .bfmd-subtitle {
        margin: 15px 0 8px;
        font-size: 11px;
        font-weight: 950;
        opacity: .7;
      }

      .bfmd-row {
        display: grid;
        grid-template-columns:
          38px 40px 1fr auto;
        gap: 8px;
        align-items: center;
        margin-bottom: 7px;
        padding: 9px;
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
        justify-content: center;
        align-items: center;
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
        border-radius: 10px;
        background: rgba(127,127,127,.06);
        font-size: 11px;
        opacity: .6;
      }

      /* =====================================================
         EVENTS
      ===================================================== */

      .bfmd-events {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .bfmd-event {
        display: grid;
        grid-template-columns:
          45px 30px 1fr;
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
        text-align: center;
        font-size: 18px;
      }

      .bfmd-event-player {
        font-size: 11px;
        font-weight: 900;
      }

      .bfmd-event-team {
        margin-top: 2px;
        font-size: 9px;
        opacity: .55;
      }

      .bfmd-event-detail {
        margin-top: 2px;
        font-size: 9px;
        opacity: .58;
      }

      .bfmd-event-assist {
        margin-top: 3px;
        font-size: 9px;
        opacity: .75;
      }

      /* =====================================================
         SUBSTITUTIONS
      ===================================================== */

      .bfmd-subs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .bfmd-sub-card {
        padding: 11px;
        border-radius: 12px;
        background: rgba(127,127,127,.07);
      }

      .bfmd-sub-line {
        display: grid;
        grid-template-columns: 45px 1fr;
        gap: 8px;
        padding: 8px 0;
        border-bottom:
          1px solid rgba(127,127,127,.10);
      }

      .bfmd-sub-line:last-child {
        border-bottom: 0;
      }

      .bfmd-sub-minute {
        font-size: 10px;
        font-weight: 950;
      }

      .bfmd-out {
        color: #dc2626;
        font-weight: 900;
      }

      .bfmd-in {
        color: #16a34a;
        font-weight: 900;
      }

      /* =====================================================
         MOTM
      ===================================================== */

      .bfmd-motm {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 13px;
        border-radius: 13px;
        background: rgba(250,204,21,.10);
        font-size: 12px;
        font-weight: 900;
      }

      .bfmd-motm-star {
        font-size: 23px;
      }

      @media(max-width:800px) {
        .bfmd-pitches,
        .bfmd-players,
        .bfmd-subs {
          grid-template-columns: 1fr;
        }

        .bfmd-summary {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media(max-width:600px) {
        .bfmd-box {
          padding: 20px 12px;
        }

        .bfmd-header {
          gap: 7px;
        }

        .bfmd-team img,
        .bfmd-fallback {
          width: 56px;
          height: 56px;
        }

        .bfmd-score {
          font-size: 28px;
        }

        .bfmd-team {
          font-size: 11px;
        }

        .bfmd-row {
          grid-template-columns:
            34px 35px 1fr;
        }

        .bfmd-badges {
          grid-column: 3;
          justify-content: flex-start;
        }

        .bfmd-player {
          width: 66px;
        }

        .bfmd-name {
          max-width: 66px;
          font-size: 7px;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }

  /* =========================================================
     TEAMS
  ========================================================= */

  function getTeams(details) {

    const teams =
      details?.teams || {};

    const homeSource =
      teams?.home ||
      details?.home_team ||
      details?.homeTeam ||
      details?.home ||
      {};

    const awaySource =
      teams?.away ||
      details?.away_team ||
      details?.awayTeam ||
      details?.away ||
      {};

    function makeTeam(
      source,
      side
    ) {

      if (
        typeof source ===
        "string"
      ) {
        return {
          id: null,
          name: source,
          logo: ""
        };
      }

      return {

        id:
          first(
            source?.id,
            source?.team_id,
            details?.[
              `${side}_id`
            ],
            null
          ),

        name:
          first(
            source?.name,
            details?.[
              `${side}_name`
            ],
            side === "home"
              ? "Domicile"
              : "Extérieur"
          ),

        logo:
          first(
            source?.logo,
            source?.image,
            source?.picture,
            details?.[
              `${side}_logo`
            ],
            ""
          )
      };
    }

    return {

      home:
        makeTeam(
          homeSource,
          "home"
        ),

      away:
        makeTeam(
          awaySource,
          "away"
        )

    };
  }

  /* =========================================================
     LINEUPS
  ========================================================= */

  function getTeamLineup(
    details,
    side,
    team
  ) {

    const lineups =
      details?.lineups ||
      {};

    let formation =
      first(
        lineups?.[
          `${side}_formation`
        ],
        lineups?.[
          `${side}Formation`
        ],
        lineups?.[
          `${side}` +
          "_tactic"
        ],
        lineups?.[side]?.formation,
        "—"
      );

    let xi =
      first(
        lineups?.[
          `${side}_xi`
        ],
        lineups?.[
          `${side}_starting_xi`
        ],
        lineups?.[
          `${side}_startingXI`
        ],
        lineups?.[side]?.startXI,
        lineups?.[side]?.startingXI,
        lineups?.[side]?.xi,
        []
      );

    let subs =
      first(
        lineups?.[
          `${side}_subs`
        ],
        lineups?.[
          `${side}_substitutes`
        ],
        lineups?.[side]?.subs,
        lineups?.[side]?.substitutes,
        []
      );

    /*
     * API ممكن يرجع lineups كـarray
     */

    if (
      Array.isArray(
        lineups
      )
    {

      const item =
        lineups.find(
          lineup => {

            const lineupTeam =
              lineup?.team ||
              {};

            const id =
              lineupTeam?.id ||
              lineup?.team_id ||
              null;

            const name =
              lineupTeam?.name ||
              lineup?.team_name ||
              "";

            return (

              (
                team?.id &&
                id &&
                String(
                  team.id
                ) ===
                String(
                  id
                )
              )

              ||

              (
                name &&
                team?.name &&
                norm(name) ===
                  norm(
                    team.name
                  )
              )

            );
          }
        ) ||
        lineups[
          side === "home"
            ? 0
            : 1
        ] ||
        null;

      if (
        item
      ) {

        formation =
          first(
            item?.formation,
            item?.tacticalFormation,
            formation,
            "—"
          );

        xi =
          first(
            item?.startXI,
            item?.startingXI,
            item?.starting_xi,
            item?.starters,
            item?.xi,
            xi,
            []
          );

        subs =
          first(
            item?.substitutes,
            item?.subs,
            item?.bench,
            subs,
            []
          );
      }
    }

    return {

      side,

      team,

      formation:
        formation || "—",

      xi:
        Array.isArray(xi)
          ? xi
          : [],

      subs:
        Array.isArray(subs)
          ? subs
          : []

    };
  }

  /* =========================================================
     PLAYER HELPERS
  ========================================================= */

  function getPlayer(
    item
  ) {

    if (
      item?.player &&
      typeof item.player ===
        "object"
    ) {
      return item.player;
    }

    return item || {};
  }

  function getPlayerName(
    item
  ) {

    if (
      typeof item ===
      "string"
    ) {
      return item;
    }

    const player =
      getPlayer(
        item
      );

    return first(
      player?.name,
      player?.full_name,
      player?.fullName,
      item?.name,
      item?.player_name,
      "Joueur"
    );
  }

  function getPlayerNumber(
    item
  ) {

    if (
      typeof item ===
      "string"
    ) {
      return "-";
    }

    const player =
      getPlayer(
        item
      );

    return first(
      item?.shirt_number,
      item?.shirtNumber,
      item?.jersey_number,
      item?.jerseyNumber,
      item?.number,
      player?.shirt_number,
      player?.shirtNumber,
      player?.jersey_number,
      player?.jerseyNumber,
      player?.number,
      "-"
    );
  }

  function getPlayerPosition(
    item
  ) {

    if (
      typeof item ===
      "string"
    ) {
      return "";
    }

    const player =
      getPlayer(
        item
      );

    return first(
      item?.position,
      item?.pos,
      player?.position,
      player?.pos,
      ""
    );
  }

  function getPlayerPhoto(
    item
  ) {

    if (
      typeof item ===
      "string"
    ) {
      return "";
    }

    const player =
      getPlayer(
        item
      );

    return first(
      item?.logo,
      item?.photo,
      item?.picture,
      item?.image,
      item?.avatar,
      player?.logo,
      player?.photo,
      player?.picture,
      player?.image,
      player?.avatar,
      ""
    );
  }

  function getPlayerRating(
    item
  ) {

    if (
      typeof item ===
      "string"
    ) {
      return null;
    }

    const player =
      getPlayer(
        item
      );

    return first(
      item?.rating,
      item?.performance?.rating,
      item?.statistics?.rating,
      item?.games?.rating,
      player?.rating,
      null
    );
  }

  function playerKey(
    item
  ) {
    return norm(
      getPlayerName(
        item
      )
    );
  }

  /* =========================================================
     EVENTS
  ========================================================= */

  function getName(
    value
  ) {

    if (
      typeof value ===
      "string"
    ) {
      return value;
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {
      return first(
        value?.name,
        value?.full_name,
        value?.fullName,
        value?.player?.name,
        ""
      );
    }

    return "";
  }

  function normalizeEvent(
    event,
    index
  ) {

    const type =
      first(
        event?.type,
        event?.event_type,
        event?.incidentType,
        event?.kind,
        ""
      );

    const detail =
      first(
        event?.detail,
        event?.incidentClass,
        event?.reason,
        event?.description,
        ""
      );

    const typeNorm =
      norm(type);

    const detailNorm =
      norm(detail);

    let kind =
      "other";

    if (
      typeNorm.includes(
        "goal"
      ) ||
      detailNorm === "goal" ||
      event?.goal
    ) {
      kind = "goal";
    }

    else if (
      typeNorm.includes(
        "red"
      ) ||
      detailNorm.includes(
        "red"
      ) ||
      typeNorm.includes(
        "second yellow"
      )
    ) {
      kind = "red";
    }

    else if (
      typeNorm.includes(
        "yellow"
      ) ||
      detailNorm.includes(
        "yellow"
      ) ||
      typeNorm.includes(
        "card"
      )
    ) {
      kind = "yellow";
    }

    else if (
      typeNorm.includes(
        "subst"
      ) ||
      typeNorm.includes(
        "change"
      ) ||
      event?.player_in ||
      event?.player_out
    ) {
      kind = "substitution";
    }

    else if (
      typeNorm.includes(
        "var"
      )
    ) {
      kind = "var";
    }

    const player =
      getName(
        event?.player
      ) ||
      getName(
        event?.scorer
      ) ||
      event?.player_name ||
      event?.playerName ||
      "";

    const assist =
      getName(
        event?.assist
      ) ||
      getName(
        event?.assist1
      ) ||
      event?.assist_name ||
      event?.assistName ||
      "";

    const playerIn =
      getName(
        event?.player_in
      ) ||
      getName(
        event?.playerIn
      ) ||
      getName(
        event?.incoming
      ) ||
      event?.player_in_name ||
      "";

    const playerOut =
      getName(
        event?.player_out
      ) ||
      getName(
        event?.playerOut
      ) ||
      getName(
        event?.outgoing
      ) ||
      event?.player_out_name ||
      "";

    const team =
      event?.team &&
      typeof event.team ===
        "object"
        ? event.team
        : {};

    const minute =
      first(
        event?.time?.elapsed,
        typeof event?.time ===
          "number"
          ? event.time
          : null,
        event?.minute,
        event?.elapsed,
        ""
      );

    const extra =
      first(
        event?.time?.extra,
        event?.extra,
        event?.addedTime,
        ""
      );

    return {

      id:
        index,

      kind,

      type:
        String(
          type
        ),

      detail:
        String(
          detail
        ),

      minute,

      extra,

      name:
        player,

      assist,

      playerIn,

      playerOut,

      teamId:
        first(
          team?.id,
          event?.team_id,
          event?.teamId,
          null
        ),

      teamName:
        first(
          team?.name,
          event?.team_name,
          event?.teamName,
          ""
        ),

      side:
        norm(
          first(
            event?.side,
            event?.team_side,
            ""
          )
        )
    };
  }

  function getEvents(
    details
  ) {

    const source =
      first(
        details?.events,
        details?.incidents,
        details?.timeline,
        details?.match_events,
        []
      );

    return arr(
      source
    ).map(
      normalizeEvent
    );
  }

  /* =========================================================
     PLAYER EVENT MAP
  ========================================================= */

  function buildEventMap(
    events
  ) {

    const map =
      new Map();

    function data(
      name
    ) {

      const key =
        norm(
          name
        );

      if (!key) {
        return null;
      }

      if (
        !map.has(key)
      ) {

        map.set(
          key,
          {
            goals: 0,
            assists: 0,
            yellow: 0,
            red: 0,
            in: 0,
            out: 0
          }
        );
      }

      return map.get(
        key
      );
    }

    events.forEach(
      event => {

        if (
          event.kind ===
          "goal"
        ) {

          const scorer =
            data(
              event.name
            );

          if (
            scorer
          ) {
            scorer.goals++;
          }

          if (
            event.assist
          ) {

            const assist =
              data(
                event.assist
              );

            if (
              assist
            ) {
              assist.assists++;
            }
          }
        }

        if (
          event.kind ===
          "yellow"
        ) {

          const player =
            data(
              event.name
            );

          if (
            player
          ) {
            player.yellow++;
          }
        }

        if (
          event.kind ===
          "red"
        ) {

          const player =
            data(
              event.name
            );

          if (
            player
          ) {
            player.red++;
          }
        }

        if (
          event.kind ===
          "substitution"
        ) {

          if (
            event.playerIn
          ) {

            const player =
              data(
                event.playerIn
              );

            if (
              player
            ) {
              player.in++;
            }
          }

          if (
            event.playerOut
          ) {

            const player =
              data(
                event.playerOut
              );

            if (
              player
            ) {
              player.out++;
            }
          }
        }
      }
    );

    return map;
  }

  /* =========================================================
     FORMATION POSITION
     ========================================================= */

  function formationRows(
    formation
  ) {

    const value =
      String(
        formation || ""
      )
        .trim();

    const parts =
      value
        .split("-")
        .map(
          Number
        )
        .filter(
          n =>
            Number.isFinite(n) &&
            n > 0
        );

    return parts.length
      ? parts
      : [4,3,3];
  }

  function playerCategory(
    player
  ) {

    const position =
      norm(
        getPlayerPosition(
          player
        )
      );

    if (
      position === "g" ||
      position === "gk" ||
      position.includes(
        "goal"
      )
    ) {
      return "gk";
    }

    if (
      position === "d" ||
      position === "df" ||
      position === "def" ||
      position.includes(
        "def"
      )
    ) {
      return "def";
    }

    if (
      position === "m" ||
      position === "mf" ||
      position === "mid" ||
      position.includes(
        "mid"
      )
    ) {
      return "mid";
    }

    if (
      position === "f" ||
      position === "fw" ||
      position === "att" ||
      position.includes(
        "attack"
      ) ||
      position.includes(
        "forward"
      ) ||
      position.includes(
        "striker"
      )
    ) {
      return "fwd";
    }

    return "unknown";
  }

  function pitchPositions(
    lineup,
    side
  ) {

    const players =
      arr(
        lineup?.xi
      ).slice(
        0,
        11
      );

    if (
      !players.length
    ) {
      return [];
    }

    /*
     * ------------------------------------------------------
     * أولاً نحاول نستعمل grid إلا كانت موجودة
     * ------------------------------------------------------
     */

    const gridPlayers =
      players.map(
        player => {

          const p =
            getPlayer(
              player
            );

          const grid =
            first(
              p?.grid,
              player?.grid,
              p?.positionGrid,
              player?.positionGrid,
              ""
            );

          const match =
            String(
              grid
            ).match(
              /(\d+)\s*:\s*(\d+)/
            );

          return {
            player,
            row:
              match
                ? Number(
                    match[1]
                  )
                : null,
            col:
              match
                ? Number(
                    match[2]
                  )
                : null
          };
        }
      );

    const validGrid =
      gridPlayers.filter(
        item =>
          item.row !== null
      );

    /*
     * ------------------------------------------------------
     * إذا كاين Grid صحيح
     * ------------------------------------------------------
     */

    if (
      validGrid.length >=
        Math.ceil(
          players.length *
          0.6
        )
    ) {

      const grouped =
        {};

      gridPlayers.forEach(
        item => {

          const row =
            item.row ??
            4;

          if (
            !grouped[row]
          ) {
            grouped[row] = [];
          }

          grouped[row].push(
            item
          );
        }
      );

      const rowKeys =
        Object.keys(
          grouped
        )
          .map(
            Number
          )
          .sort(
            (a,b) =>
              a - b
          );

      const maxRow =
        Math.max(
          ...rowKeys,
          4
        );

      const result =
        [];

      rowKeys.forEach(
        row => {

          const group =
            grouped[row].sort(
              (a,b) =>
                (
                  a.col ?? 999
                ) -
                (
                  b.col ?? 999
                )
            );

          group.forEach(
            (
              item,
              index
            ) => {

              const x =
                group.length === 1
                  ? 50
                  : 12 +
                    76 *
                    (
                      index /
                      (
                        group.length -
                        1
                      )
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
                side ===
                "away"
              ) {
                y =
                  100 - y;
              }

              result.push({
                player:
                  item.player,
                x,
                y
              });
            }
          );
        }
      );

      return result;
    }

    /*
     * ------------------------------------------------------
     * Fallback حسب position + formation
     * ------------------------------------------------------
     */

    const gk = [];
    const def = [];
    const mid = [];
    const fwd = [];
    const unknown = [];

    players.forEach(
      player => {

        switch (
          playerCategory(
            player
          )
        ) {

          case "gk":
            gk.push(
              player
            );
            break;

          case "def":
            def.push(
              player
            );
            break;

          case "mid":
            mid.push(
              player
            );
            break;

          case "fwd":
            fwd.push(
              player
            );
            break;

          default:
            unknown.push(
              player
            );
        }
      }
    );

    const formation =
      formationRows(
        lineup?.formation
      );

    const rows = [];

    /*
     * GK
     */
    rows.push(
      gk.slice(
        0,
        1
      )
    );

    let unknownIndex =
      0;

    let defIndex =
      0;

    let midIndex =
      0;

    let fwdIndex =
      0;

    formation.forEach(
      (
        count,
        index
      ) => {

        let pool;

        if (
          index === 0
        ) {

          pool =
            def.slice(
              defIndex,
              defIndex +
                count
            );

          defIndex +=
            pool.length;
        }

        else if (
          index ===
          formation.length - 1
        ) {

          pool =
            fwd.slice(
              fwdIndex,
              fwdIndex +
                count
            );

          fwdIndex +=
            pool.length;
        }

        else {

          pool =
            mid.slice(
              midIndex,
              midIndex +
                count
            );

          midIndex +=
            pool.length;
        }

        while (
          pool.length <
            count &&
          unknownIndex <
            unknown.length
        ) {

          pool.push(
            unknown[
              unknownIndex++
            ]
          );
        }

        rows.push(
          pool
        );
      }
    );

    const used =
      new Set(
        rows.flat()
      );

    const leftovers =
      players.filter(
        player =>
          !used.has(
            player
          )
      );

    if (
      leftovers.length
    ) {

      rows[
        rows.length - 1
      ].push(
        ...leftovers
      );
    }

    const result =
      [];

    rows.forEach(
      (
        row,
        rowIndex
      ) => {

        if (
          !row.length
        ) {
          return;
        }

        row.forEach(
          (
            player,
            index
          ) => {

            const x =
              row.length === 1
                ? 50
                : 10 +
                  80 *
                  (
                    index /
                    (
                      row.length -
                      1
                    )
                  );

            let y =
              8 +
              84 *
              (
                rowIndex /
                Math.max(
                  1,
                  rows.length -
                    1
                )
              );

            if (
              side ===
              "away"
            ) {
              y =
                100 - y;
            }

            result.push({
              player,
              x,
              y
            });
          }
        );
      }
    );

    return result;
  }

  /* =========================================================
     PLAYER AVATAR
  ========================================================= */

  function playerAvatar(
    player
  ) {

    const photo =
      getPlayerPhoto(
        player
      );

    const number =
      getPlayerNumber(
        player
      );

    if (!photo) {

      return `
        <div class="bfmd-number-only">
          ${esc(number)}
        </div>
      `;
    }

    return `
      <div class="bfmd-photo-wrap">

        <img
          class="bfmd-photo"
          src="${esc(photo)}"
          alt="${esc(
            getPlayerName(
              player
            )
          )}"
          loading="lazy"
          onerror="
            this.style.display='none';
          "
        >

        <div class="bfmd-number">
          ${esc(number)}
        </div>

      </div>
    `;
  }

  /* =========================================================
     PLAYER BADGES
  ========================================================= */

  function playerBadges(
    player,
    eventMap
  ) {

    const stats =
      eventMap.get(
        playerKey(
          player
        )
      );

    if (!stats) {
      return "";
    }

    const badges =
      [];

    if (
      stats.goals
    ) {
      badges.push(
        "⚽"
      );
    }

    if (
      stats.assists
    ) {
      badges.push(
        "🅰️"
      );
    }

    if (
      stats.yellow
    ) {
      badges.push(
        "🟨"
      );
    }

    if (
      stats.red
    ) {
      badges.push(
        "🟥"
      );
    }

    if (
      stats.in
    ) {
      badges.push(
        "↗️"
      );
    }

    if (
      stats.out
    ) {
      badges.push(
        "↙️"
      );
    }

    return badges.length
      ? `
        <div class="bfmd-event-mini">
          ${badges.join("")}
        </div>
      `
      : "";
  }

  /* =========================================================
     PITCH
  ========================================================= */

  function renderPitch(
    lineup,
    side,
    eventMap
  ) {

    if (
      !lineup?.xi?.length
    ) {

      return `
        <div class="bfmd-pitch-card">

          <div class="bfmd-pitch-head">

            <span>
              ${esc(
                lineup?.team?.name ||
                ""
              )}
            </span>

            <span class="bfmd-formation">
              ${esc(
                lineup?.formation ||
                "—"
              )}
            </span>

          </div>

          <div class="bfmd-pitch">

            <div class="bfmd-border"></div>
            <div class="bfmd-half"></div>
            <div class="bfmd-circle"></div>
            <div class="bfmd-center-dot"></div>
            <div class="bfmd-box-line top"></div>
            <div class="bfmd-box-line bottom"></div>

          </div>

        </div>
      `;
    }

    const positions =
      pitchPositions(
        lineup,
        side
      );

    const playersHTML =
      positions
        .map(
          item => {

            const player =
              item.player;

            const rating =
              getPlayerRating(
                player
              );

            return `
              <div
                class="bfmd-player"
                style="
                  left:${item.x}%;
                  top:${item.y}%;
                "
                title="${esc(
                  getPlayerName(
                    player
                  )
                )}"
              >

                ${playerBadges(
                  player,
                  eventMap
                )}

                ${playerAvatar(
                  player
                )}

                <div class="bfmd-name">
                  ${esc(
                    getPlayerName(
                      player
                    )
                  )}
                </div>

                ${
                  rating !== null &&
                  rating !== undefined &&
                  rating !== ""
                    ? `
                      <div class="bfmd-rating">
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
      <div class="bfmd-pitch-card">

        <div class="bfmd-pitch-head">

          <span>
            ${esc(
              lineup.team.name
            )}
          </span>

          <span class="bfmd-formation">
            ${esc(
              lineup.formation
            )}
          </span>

        </div>

        <div class="bfmd-pitch">

          <div class="bfmd-border"></div>

          <div class="bfmd-half"></div>

          <div class="bfmd-circle"></div>

          <div class="bfmd-center-dot"></div>

          <div class="bfmd-box-line top"></div>

          <div class="bfmd-box-line bottom"></div>

          ${playersHTML}

        </div>

      </div>
    `;
  }

  /* =========================================================
     PLAYER LIST
  ========================================================= */

  function renderPlayerRow(
    player,
    eventMap
  ) {

    const stats =
      eventMap.get(
        playerKey(
          player
        )
      ) || {
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        in: 0,
        out: 0
      };

    const photo =
      getPlayerPhoto(
        player
      );

    const rating =
      getPlayerRating(
        player
      );

    return `
      <div class="bfmd-row">

        <div class="bfmd-shirt">
          ${esc(
            getPlayerNumber(
              player
            )
          )}
        </div>

        ${
          photo
            ? `
              <img
                class="bfmd-player-photo"
                src="${esc(photo)}"
                alt="${esc(
                  getPlayerName(
                    player
                  )
                )}"
                loading="lazy"
              >
            `
            : `
              <div></div>
            `
        }

        <div>

          <div class="bfmd-player-name">
            ${esc(
              getPlayerName(
                player
              )
            )}
          </div>

          <div class="bfmd-position">
            ${esc(
              getPlayerPosition(
                player
              )
            )}
          </div>

        </div>

        <div class="bfmd-badges">

          ${
            rating !== null
              ? `
                <span class="bfmd-badge">
                  ⭐ ${esc(
                    Number(
                      rating
                    ).toFixed(1)
                  )}
                </span>
              `
              : ""
          }

          ${
            stats.goals
              ? `
                <span class="bfmd-badge">
                  ⚽ ${stats.goals}
                </span>
              `
              : ""
          }

          ${
            stats.assists
              ? `
                <span class="bfmd-badge">
                  🅰️ ${stats.assists}
                </span>
              `
              : ""
          }

          ${
            stats.yellow
              ? `
                <span class="bfmd-badge">
                  🟨
                </span>
              `
              : ""
          }

          ${
            stats.red
              ? `
                <span class="bfmd-badge">
                  🟥
                </span>
              `
              : ""
          }

          ${
            stats.in
              ? `
                <span class="bfmd-badge">
                  ↗️
                </span>
              `
              : ""
          }

          ${
            stats.out
              ? `
                <span class="bfmd-badge">
                  ↙️
                </span>
              `
              : ""
          }

        </div>

      </div>
    `;
  }

  function renderPlayerColumn(
    lineup,
    eventMap
  ) {

    return `
      <div>

        <div class="bfmd-column-title">
          ${esc(
            lineup.team.name
          )}
        </div>

        <div class="bfmd-subtitle">
          🟢 Onze de départ
        </div>

        ${
          lineup.xi.length
            ? lineup.xi
                .map(
                  player =>
                    renderPlayerRow(
                      player,
                      eventMap
                    )
                )
                .join("")
            : `
              <div class="bfmd-empty">
                Composition indisponible.
              </div>
            `
        }

        ${
          lineup.subs.length
            ? `
              <div class="bfmd-subtitle">
                🪑 Remplaçants
              </div>

              ${lineup.subs
                .map(
                  player =>
                    renderPlayerRow(
                      player,
                      eventMap
                    )
                )
                .join("")}
            `
            : ""
        }

      </div>
    `;
  }

  /* =========================================================
     EVENTS RENDER
  ========================================================= */

  function eventIcon(
    event
  ) {

    if (
      event.kind ===
      "goal"
    ) {
      return "⚽";
    }

    if (
      event.kind ===
      "yellow"
    ) {
      return "🟨";
    }

    if (
      event.kind ===
      "red"
    ) {
      return "🟥";
    }

    if (
      event.kind ===
      "substitution"
    ) {
      return "🔄";
    }

    if (
      event.kind ===
      "var"
    ) {
      return "🎥";
    }

    return "📌";
  }

  function eventMinute(
    event
  ) {

    if (
      event.minute === "" ||
      event.minute ===
        null ||
      event.minute ===
        undefined
    ) {
      return "";
    }

    if (
      event.extra !== "" &&
      event.extra !==
        null &&
      event.extra !==
        undefined
    ) {

      return `
        ${esc(
          event.minute
        )}+${esc(
          event.extra
        )}'
      `;
    }

    return `
      ${esc(
        event.minute
      )}'
    `;
  }

  function renderEvents(
    events
  ) {

    if (
      !events.length
    ) {

      return `
        <div class="bfmd-section">

          <div class="bfmd-title">
            ⚡ Événements
          </div>

          <div class="bfmd-empty">
            Aucun événement disponible.
          </div>

        </div>
      `;
    }

    const sorted =
      events
        .slice()
        .sort(
          (a,b) =>
            Number(
              a.minute ||
              999
            ) -
            Number(
              b.minute ||
              999
            )
        );

    return `
      <div class="bfmd-section">

        <div class="bfmd-title">
          ⚡ Événements
        </div>

        <div class="bfmd-events">

          ${sorted
            .map(
              event => {

                let contentHTML =
                  esc(
                    event.name ||
                    event.type ||
                    "Événement"
                  );

                if (
                  event.kind ===
                  "substitution"
                ) {

                  contentHTML = `
                    <span class="bfmd-out">
                      ↓ ${esc(
                        event.playerOut ||
                        "—"
                      )}
                    </span>

                    <span>
                      →
                    </span>

                    <span class="bfmd-in">
                      ↑ ${esc(
                        event.playerIn ||
                        "—"
                      )}
                    </span>
                  `;
                }

                return `
                  <div class="bfmd-event">

                    <div class="bfmd-minute">
                      ${eventMinute(
                        event
                      )}
                    </div>

                    <div class="bfmd-event-icon">
                      ${eventIcon(
                        event
                      )}
                    </div>

                    <div>

                      <div class="bfmd-event-player">
                        ${contentHTML}
                      </div>

                      ${
                        event.detail &&
                        event.kind !==
                          "substitution"
                          ? `
                            <div class="bfmd-event-detail">
                              ${esc(
                                event.detail
                              )}
                            </div>
                          `
                          : ""
                      }

                      ${
                        event.kind ===
                          "goal" &&
                        event.assist
                          ? `
                            <div class="bfmd-event-assist">
                              🅰️ Passe décisive :
                              ${esc(
                                event.assist
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
            .join("")}

        </div>

      </div>
    `;
  }

  /* =========================================================
     SUBSTITUTIONS
  ========================================================= */

  function renderSubstitutions(
    events
  ) {

    const list =
      events.filter(
        event =>
          event.kind ===
          "substitution"
      );

    if (
      !list.length
    ) {
      return "";
    }

    return `
      <div class="bfmd-section">

        <div class="bfmd-title">
          🔄 Remplacements
        </div>

        <div class="bfmd-subs">

          ${list
            .map(
              event => `
                <div class="bfmd-sub-card">

                  <div class="bfmd-sub-line">

                    <div class="bfmd-sub-minute">
                      ${eventMinute(
                        event
                      )}
                    </div>

                    <div>

                      <div class="bfmd-out">
                        ↓ ${esc(
                          event.playerOut ||
                          "—"
                        )}
                      </div>

                      <div class="bfmd-in">
                        ↑ ${esc(
                          event.playerIn ||
                          "—"
                        )}
                      </div>

                    </div>

                  </div>

                </div>
              `
            )
            .join("")}

        </div>

      </div>
    `;
  }

  /* =========================================================
     SUMMARY
  ========================================================= */

  function renderSummary(
    events
  ) {

    const goals =
      events.filter(
        event =>
          event.kind ===
          "goal"
      ).length;

    const yellow =
      events.filter(
        event =>
          event.kind ===
          "yellow"
      ).length;

    const red =
      events.filter(
        event =>
          event.kind ===
          "red"
      ).length;

    const subs =
      events.filter(
        event =>
          event.kind ===
          "substitution"
      ).length;

    return `
      <div class="bfmd-section">

        <div class="bfmd-title">
          📊 Résumé
        </div>

        <div class="bfmd-summary">

          <div class="bfmd-summary-box">
            <div class="bfmd-summary-value">
              ${goals}
            </div>

            <div class="bfmd-summary-label">
              Buts
            </div>
          </div>

          <div class="bfmd-summary-box">
            <div class="bfmd-summary-value">
              ${yellow}
            </div>

            <div class="bfmd-summary-label">
              Cartons jaunes
            </div>
          </div>

          <div class="bfmd-summary-box">
            <div class="bfmd-summary-value">
              ${red}
            </div>

            <div class="bfmd-summary-label">
              Cartons rouges
            </div>
          </div>

          <div class="bfmd-summary-box">
            <div class="bfmd-summary-value">
              ${subs}
            </div>

            <div class="bfmd-summary-label">
              Remplacements
            </div>
          </div>

        </div>

      </div>
    `;
  }

  /* =========================================================
     MOTM
  ========================================================= */

  function renderMOTM(
    details
  ) {

    const value =
      first(
        details?.player_of_match,
        details?.playerOfMatch,
        details?.man_of_the_match,
        details?.manOfTheMatch,
        details?.mvp,
        details?.best_player
      );

    if (!value) {
      return "";
    }

    const name =
      typeof value ===
      "string"
        ? value
        : first(
            value?.name,
            value?.player?.name,
            ""
          );

    if (!name) {
      return "";
    }

    return `
      <div class="bfmd-section">

        <div class="bfmd-motm">

          <span class="bfmd-motm-star">
            ⭐
          </span>

          <span>
            Joueur du match :
            ${esc(name)}
          </span>

        </div>

      </div>
    `;
  }

  /* =========================================================
     SCORE
  ========================================================= */

  function getScore(
    details
  ) {

    return {

      home:
        first(
          details?.score?.home,
          details?.goals?.home,
          details?.home_score,
          details?.homeScore,
          "-"
        ),

      away:
        first(
          details?.score?.away,
          details?.goals?.away,
          details?.away_score,
          details?.awayScore,
          "-"
        )

    };
  }

  /* =========================================================
     OPEN DETAILS
  ========================================================= */

  async function openDetails(
    identifier
  ) {

    if (!identifier) {
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

        <div class="bfmd-empty">
          جاري تحميل تفاصيل المباراة...
        </div>

      </div>
    `;

    try {

      const response =
        await fetch(
          `${DETAILS_API}${encodeURIComponent(
            identifier
          )}`,
          {
            cache:
              "no-store",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          `API HTTP ${response.status}`
        );
      }

      const payload =
        await response.json();

      let details =
        payload?.data ||
        payload?.match ||
        payload;

      if (
        details?.match &&
        typeof details.match ===
          "object"
      ) {
        details =
          details.match;
      }

      if (
        !details ||
        typeof details !==
          "object"
      ) {
        throw new Error(
          "Données du match introuvables"
        );
      }

      console.log(
        "BAKHIRAFOOT DETAILS:",
        details
      );

      /* =====================================================
         TEAMS
      ===================================================== */

      const teams =
        getTeams(
          details
        );

      /* =====================================================
         SCORE
      ===================================================== */

      const score =
        getScore(
          details
        );

      /* =====================================================
         STATUS
      ===================================================== */

      const status =
        first(
          details?.status_text,
          typeof details?.status ===
            "string"
            ? details.status
            : null,
          details?.fixture?.status?.long,
          details?.fixture?.status?.short,
          "MATCH"
        );

      /* =====================================================
         COMPETITION
      ===================================================== */

      const competition =
        first(
          details?.league?.name,
          details?.competition?.name,
          typeof details?.competition ===
            "string"
            ? details.competition
            : null,
          "Football"
        );

      /* =====================================================
         INFO
      ===================================================== */

      const date =
        first(
          details?.fixture?.date,
          details?.date,
          details?.time,
          ""
        );

      const venue =
        first(
          details?.fixture?.venue?.name,
          details?.venue?.name,
          typeof details?.venue ===
            "string"
            ? details.venue
            : null,
          ""
        );

      const referee =
        first(
          details?.fixture?.referee,
          details?.referee?.name,
          typeof details?.referee ===
            "string"
            ? details.referee
            : null,
          ""
        );

      /* =====================================================
         LINEUPS
      ===================================================== */

      const homeLineup =
        getTeamLineup(
          details,
          "home",
          teams.home
        );

      const awayLineup =
        getTeamLineup(
          details,
          "away",
          teams.away
        );

      /* =====================================================
         EVENTS
      ===================================================== */

      const events =
        getEvents(
          details
        );

      const eventMap =
        buildEventMap(
          events
        );

      /* =====================================================
         RENDER
      ===================================================== */

      content.innerHTML = `

        <div class="bfmd-league">
          🏆
          ${esc(
            competition
          )}
        </div>

        <div class="bfmd-header">

          <div class="bfmd-team">

            ${
              teams.home.logo
                ? `
                  <img
                    src="${esc(
                      teams.home.logo
                    )}"
                    alt="${esc(
                      teams.home.name
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
              ${esc(
                teams.home.name
              )}
            </span>

          </div>

          <div>

            <div class="bfmd-score">
              ${esc(
                score.home
              )}
              -
              ${esc(
                score.away
              )}
            </div>

            <div class="bfmd-status">
              ${esc(
                status
              )}
            </div>

          </div>

          <div class="bfmd-team">

            ${
              teams.away.logo
                ? `
                  <img
                    src="${esc(
                      teams.away.logo
                    )}"
                    alt="${esc(
                      teams.away.name
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
              ${esc(
                teams.away.name
              )}
            </span>

          </div>

        </div>

        ${
          date ||
          venue ||
          referee
            ? `
              <div class="bfmd-info">

                ${
                  date
                    ? `
                      <span>
                        📅 ${esc(
                          date
                        )}
                      </span>
                    `
                    : ""
                }

                ${
                  venue
                    ? `
                      <span>
                        🏟️ ${esc(
                          venue
                        )}
                      </span>
                    `
                    : ""
                }

                ${
                  referee
                    ? `
                      <span>
                        👨‍⚖️ ${esc(
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

        ${renderSummary(
          events
        )}

        <div class="bfmd-section">

          <div class="bfmd-title">
            🧩 Formations & Compositions
          </div>

          <div class="bfmd-pitches">

            ${renderPitch(
              homeLineup,
              "home",
              eventMap
            )}

            ${renderPitch(
              awayLineup,
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

            ${renderPlayerColumn(
              homeLineup,
              eventMap
            )}

            ${renderPlayerColumn(
              awayLineup,
              eventMap
            )}

          </div>

        </div>

        ${renderSubstitutions(
          events
        )}

        ${renderEvents(
          events
        )}

        ${renderMOTM(
          details
        )}

      `;

    }
    catch (error) {

      console.error(
        "BAKHIRAFOOT DETAILS ERROR:",
        error
      );

      content.innerHTML = `
        <div class="bfmd-section">

          <div class="bfmd-title">
            ❌ Erreur
          </div>

          <div
            style="
              color:#ef4444;
              font-size:12px;
            "
          >
            ${esc(
              error?.message ||
              "Erreur lors du chargement."
            )}
          </div>

        </div>
      `;
    }
  }

  /* =========================================================
     GLOBAL
  ========================================================= */

  window.bfOpenMatchDetails =
    openDetails;

  window.openMatchDetails =
    function (index) {

      const card =
        document.querySelector(
          `.match-card[data-match-index="${index}"]`
        );

      if (!card) {
        console.error(
          "BakhiraFoot: match card introuvable",
          index
        );
        return;
      }

      const identifier =
        card.dataset.fixtureId ||
        card.dataset.matchSlug ||
        card.dataset.slug ||
        card.dataset.fixture ||
        "";

      if (!identifier) {
        console.error(
          "BakhiraFoot: fixture introuvable",
          card
        );
        return;
      }

      openDetails(
        identifier
      );
    };

})();
