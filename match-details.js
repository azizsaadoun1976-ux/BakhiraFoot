(function () {
  "use strict";

  /*
   * BakhiraFoot - Match Details
   *
   * IMPORTANT:
   * SportScore يرجع lineups بهذا الشكل:
   *
   * lineups: {
   *   home_formation: "4-2-3-1",
   *   away_formation: "4-2-3-1",
   *   home_xi: [...],
   *   away_xi: [...],
   *   home_subs: [...],
   *   away_subs: [...]
   * }
   *
   * والأحداث:
   * {
   *   time: 45,
   *   type: "Substitution",
   *   player: "",
   *   player_in: "...",
   *   player_out: "..."
   * }
   */

  const DETAILS_API = "/api?fixture=";

  /* =========================================================
     HELPERS
  ========================================================= */

  function arr(value) {
    return Array.isArray(value) ? value : [];
  }

  function str(value, fallback = "") {
    if (
      value === undefined ||
      value === null
    ) {
      return fallback;
    }

    return String(value);
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

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalName(value) {
    return str(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function isObject(value) {
    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
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

    modal.querySelector(
      ".bfmd-overlay"
    ).addEventListener(
      "click",
      closeModal
    );

    modal.querySelector(
      "#bfmdClose"
    ).addEventListener(
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
      modal.style.display = "none";
    }

    document.body.style.overflow = "";
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
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(0,0,0,.82);
        backdrop-filter: blur(7px);
        overflow-y: auto;
      }

      .bfmd-box {
        position: relative;
        width: min(1180px, 100%);
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
        z-index: 50;
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

      /* =====================================================
         PITCHES
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
        padding: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 900;
      }

      .bfmd-formation {
        padding: 5px 9px;
        border-radius: 999px;
        background: rgba(127,127,127,.11);
        font-size: 11px;
      }

      .bfmd-confirmed {
        margin-left: 5px;
        font-size: 9px;
        opacity: .55;
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
        box-shadow:
          0 4px 12px rgba(0,0,0,.35);
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

      /* =====================================================
         PLAYERS
      ===================================================== */

      .bfmd-players {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .bfmd-team-column-title {
        font-size: 13px;
        font-weight: 900;
        margin-bottom: 10px;
      }

      .bfmd-subtitle {
        margin: 17px 0 9px;
        font-size: 11px;
        font-weight: 950;
        opacity: .72;
      }

      .bfmd-row {
        display: grid;
        grid-template-columns: 38px 40px 1fr auto;
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
        opacity: .72;
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
        border-radius: 12px;
        padding: 11px;
        background: rgba(127,127,127,.07);
      }

      .bfmd-sub-line {
        display: grid;
        grid-template-columns: 45px 1fr;
        gap: 8px;
        padding: 7px 0;
        border-bottom: 1px solid rgba(127,127,127,.10);
      }

      .bfmd-sub-line:last-child {
        border-bottom: none;
      }

      .bfmd-sub-minute {
        font-size: 10px;
        font-weight: 950;
      }

      .bfmd-in {
        color: #16a34a;
        font-weight: 900;
      }

      .bfmd-out {
        color: #dc2626;
        font-weight: 900;
      }

      /* =====================================================
         SUMMARY
      ===================================================== */

      .bfmd-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 9px;
      }

      .bfmd-summary-box {
        padding: 12px;
        border-radius: 12px;
        background: rgba(127,127,127,.07);
        text-align: center;
      }

      .bfmd-summary-value {
        font-size: 18px;
        font-weight: 950;
      }

      .bfmd-summary-label {
        margin-top: 3px;
        font-size: 9px;
        opacity: .58;
        font-weight: 800;
      }

      /* =====================================================
         MOTM
      ===================================================== */

      .bfmd-motm {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 12px;
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

        .bfmd-summary {
          gap: 6px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     TEAM
  ========================================================= */

  function getTeams(details) {
    const teams =
      details?.teams || {};

    const home =
      teams?.home ||
      details?.home_team ||
      details?.homeTeam ||
      {};

    const away =
      teams?.away ||
      details?.away_team ||
      details?.awayTeam ||
      {};

    return {
      home: {
        id:
          first(
            home?.id,
            details?.home_id
          ),
        name:
          first(
            home?.name,
            details?.home_name,
            typeof details?.home === "string"
              ? details.home
              : null,
            "Domicile"
          ),
        logo:
          first(
            home?.logo,
            details?.home_logo,
            ""
          )
      },

      away: {
        id:
          first(
            away?.id,
            details?.away_id
          ),
        name:
          first(
            away?.name,
            details?.away_name,
            typeof details?.away === "string"
              ? details.away
              : null,
            "Extérieur"
          ),
        logo:
          first(
            away?.logo,
            details?.away_logo,
            ""
          )
      }
    };
  }

  /* =========================================================
     LINEUPS - SPORTscore FORMAT
  ========================================================= */

  function getTeamLineup(
    details,
    side,
    team
  ) {
    const lineups =
      details?.lineups || {};

    const formation =
      first(
        lineups?.[`${side}_formation`],
        lineups?.[side]?.formation,
        "—"
      );

    const xi =
      arr(
        first(
          lineups?.[`${side}_xi`],
          lineups?.[side]?.xi,
          lineups?.[side]?.startingXI,
          lineups?.[side]?.startXI
        )
      );

    const subs =
      arr(
        first(
          lineups?.[`${side}_subs`],
          lineups?.[side]?.subs,
          lineups?.[side]?.substitutes
        )
      );

    return {
      side,
      team,
      formation,
      xi,
      subs,
      confirmed:
        lineups?.confirmed === true
    };
  }

  /* =========================================================
     PLAYER HELPERS
  ========================================================= */

  function playerName(player) {
    if (typeof player === "string") {
      return player || "Joueur";
    }

    return first(
      player?.name,
      player?.player?.name,
      "Joueur"
    );
  }

  function playerNumber(player) {
    if (typeof player === "string") {
      return "-";
    }

    return first(
      player?.number,
      player?.shirt_number,
      player?.shirtNumber,
      "-"
    );
  }

  function playerPosition(player) {
    if (typeof player === "string") {
      return "";
    }

    return first(
      player?.position,
      player?.pos,
      ""
    );
  }

  function playerPhoto(player) {
    if (!isObject(player)) {
      return "";
    }

    return first(
      player?.photo,
      player?.image,
      player?.picture,
      player?.avatar,
      player?.player?.photo,
      player?.player?.image,
      ""
    );
  }

  function playerRating(player) {
    if (!isObject(player)) {
      return null;
    }

    const value =
      first(
        player?.rating,
        player?.statistics?.rating,
        player?.player?.rating,
        null
      );

    if (
      value === null ||
      value === ""
    ) {
      return null;
    }

    return value;
  }

  function playerKey(player) {
    return normalName(
      playerName(player)
    );
  }

  /* =========================================================
     NORMALIZE EVENTS
  ========================================================= */

  function normalizeEvents(details) {
    let source =
      details?.events;

    if (!Array.isArray(source)) {
      source =
        details?.incidents;
    }

    if (!Array.isArray(source)) {
      source =
        details?.timeline;
    }

    if (!Array.isArray(source)) {
      return [];
    }

    return source.map((event, index) => {

      const type =
        first(
          event?.type,
          event?.event_type,
          ""
        );

      const typeLower =
        str(type).toLowerCase();

      let name =
        "";

      if (
        typeof event?.player === "string"
      ) {
        name =
          event.player;
      }
      else {
        name =
          first(
            event?.player?.name,
            event?.player_name,
            ""
          );
      }

      const assist =
        first(
          typeof event?.assist === "string"
            ? event.assist
            : event?.assist?.name,
          typeof event?.assist1 === "string"
            ? event.assist1
            : event?.assist1?.name,
          event?.relatedPlayer?.name,
          ""
        );

      const side =
        first(
          event?.side,
          event?.team_side,
          ""
        );

      const teamId =
        first(
          event?.team?.id,
          event?.team_id,
          null
        );

      const playerIn =
        first(
          typeof event?.player_in === "string"
            ? event.player_in
            : event?.player_in?.name,
          typeof event?.incoming === "string"
            ? event.incoming
            : event?.incoming?.name,
          ""
        );

      const playerOut =
        first(
          typeof event?.player_out === "string"
            ? event.player_out
            : event?.player_out?.name,
          typeof event?.outgoing === "string"
            ? event.outgoing
            : event?.outgoing?.name,
          ""
        );

      const minute =
        first(
          event?.time?.elapsed,
          event?.time,
          event?.minute,
          ""
        );

      const extra =
        first(
          event?.time?.extra,
          event?.extra,
          event?.addedTime,
          ""
        );

      let kind = "other";

      if (
        typeLower.includes("goal")
      ) {
        kind = "goal";
      }
      else if (
        typeLower.includes("yellow")
      ) {
        kind = "yellow";
      }
      else if (
        typeLower.includes("red") ||
        typeLower.includes("second yellow")
      ) {
        kind = "red";
      }
      else if (
        typeLower.includes("card")
      ) {
        kind =
          str(
            event?.detail
          ).toLowerCase()
            .includes("red")
            ? "red"
            : "yellow";
      }
      else if (
        typeLower.includes("subst")
      ) {
        kind = "substitution";
      }
      else if (
        typeLower.includes("var")
      ) {
        kind = "var";
      }

      return {
        id: index,
        raw: event,
        type,
        typeLower,
        kind,
        name,
        assist,
        side,
        teamId,
        playerIn,
        playerOut,
        minute,
        extra,
        detail:
          first(
            event?.detail,
            event?.description,
            ""
          )
      };
    });
  }

  /* =========================================================
     EVENT MAP
  ========================================================= */

  function buildPlayerEventMap(events) {
    const map =
      new Map();

    function getData(name) {
      const key =
        normalName(name);

      if (!key) {
        return null;
      }

      if (!map.has(key)) {
        map.set(key, {
          goals: 0,
          assists: 0,
          yellow: 0,
          red: 0,
          in: 0,
          out: 0
        });
      }

      return map.get(key);
    }

    events.forEach(event => {

      if (event.kind === "goal") {
        const data =
          getData(event.name);

        if (data) {
          data.goals++;
        }

        if (event.assist) {
          const assistData =
            getData(event.assist);

          if (assistData) {
            assistData.assists++;
          }
        }
      }

      if (event.kind === "yellow") {
        const data =
          getData(event.name);

        if (data) {
          data.yellow++;
        }
      }

      if (event.kind === "red") {
        const data =
          getData(event.name);

        if (data) {
          data.red++;
        }
      }

      if (
        event.kind === "substitution"
      ) {
        if (event.playerIn) {
          const data =
            getData(event.playerIn);

          if (data) {
            data.in++;
          }
        }

        if (event.playerOut) {
          const data =
            getData(event.playerOut);

          if (data) {
            data.out++;
          }
        }
      }

    });

    return map;
  }

  /* =========================================================
     PITCH FORMATION
  ========================================================= */

  function formationNumbers(
    formation
  ) {
    const values =
      str(formation)
        .split("-")
        .map(Number)
        .filter(
          value =>
            Number.isFinite(value) &&
            value > 0
        );

    return values.length
      ? values
      : [4, 3, 3];
  }

  function getFormationRows(
    lineup
  ) {
    const players =
      lineup?.xi || [];

    const formation =
      formationNumbers(
        lineup?.formation
      );

    const goalkeepers =
      players.filter(player => {
        const p =
          str(
            playerPosition(player)
          ).toUpperCase();

        return (
          p === "G" ||
          p === "GK" ||
          p.includes("GOAL")
        );
      });

    const defenders =
      players.filter(player => {
        const p =
          str(
            playerPosition(player)
          ).toUpperCase();

        return (
          p === "D" ||
          p.includes("DEF")
        );
      });

    const midfielders =
      players.filter(player => {
        const p =
          str(
            playerPosition(player)
          ).toUpperCase();

        return (
          p === "M" ||
          p.includes("MID")
        );
      });

    const forwards =
      players.filter(player => {
        const p =
          str(
            playerPosition(player)
          ).toUpperCase();

        return (
          p === "F" ||
          p === "FW" ||
          p.includes("ATT") ||
          p.includes("FORWARD")
        );
      });

    const used =
      new Set();

    const rows = [];

    function addRow(list) {
      rows.push(
        list.filter(Boolean)
      );

      list.forEach(
        player => used.add(player)
      );
    }

    /* Gardien */

    let keeper =
      goalkeepers[0] ||
      players.find(
        player => !used.has(player)
      );

    if (keeper) {
      addRow([keeper]);
    }

    /*
     * Défense
     */
    if (formation[0]) {

      let row =
        defenders.slice(
          0,
          formation[0]
        );

      if (
        row.length <
        formation[0]
      ) {
        const extras =
          players.filter(
            player =>
              !used.has(player) &&
              !row.includes(player)
          );

        row =
          row.concat(
            extras.slice(
              0,
              formation[0] -
              row.length
            )
          );
      }

      addRow(row);
    }

    /*
     * Milieu + attaque
     *
     * Les nombres restants
     * كيتوزعو حسب الفورماسيون.
     */

    const remainingNumbers =
      formation.slice(1);

    let middlePool =
      midfielders.filter(
        player =>
          !used.has(player)
      );

    let forwardPool =
      forwards.filter(
        player =>
          !used.has(player)
      );

    let fallbackPool =
      players.filter(
        player =>
          !used.has(player)
      );

    remainingNumbers.forEach(
      (count, index) => {

        const last =
          index ===
          remainingNumbers.length - 1;

        let pool =
          last
            ? forwardPool
            : middlePool;

        let row =
          pool.slice(
            0,
            count
          );

        pool.splice(
          0,
          row.length
        );

        if (
          row.length <
          count
        ) {

          const extra =
            fallbackPool.filter(
              player =>
                !used.has(player) &&
                !row.includes(player)
            );

          row =
            row.concat(
              extra.slice(
                0,
                count - row.length
              )
            );
        }

        addRow(row);

        middlePool =
          middlePool.filter(
            player =>
              !used.has(player)
          );

        forwardPool =
          forwardPool.filter(
            player =>
              !used.has(player)
          );

        fallbackPool =
          fallbackPool.filter(
            player =>
              !used.has(player)
          );
      }
    );

    /*
     * إلا بقا شي لاعب
     */
    const leftovers =
      players.filter(
        player =>
          !used.has(player)
      );

    if (leftovers.length) {
      addRow(leftovers);
    }

    return rows.filter(
      row => row.length
    );
  }

  function pitchPositions(
    lineup,
    side
  ) {
    const rows =
      getFormationRows(
        lineup
      );

    const result = [];

    const maxRows =
      Math.max(
        rows.length,
        2
      );

    rows.forEach(
      (row, rowIndex) => {

        row.forEach(
          (player, index) => {

            let x;

            if (row.length === 1) {
              x = 50;
            }
            else {
              x =
                12 +
                76 *
                (
                  index /
                  (row.length - 1)
                );
            }

            let y =
              8 +
              84 *
              (
                rowIndex /
                Math.max(
                  1,
                  maxRows - 1
                )
              );

            if (
              side === "away"
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
     PLAYER HTML
  ========================================================= */

  function playerAvatarHTML(
    player
  ) {
    const photo =
      playerPhoto(player);

    const number =
      playerNumber(player);

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
            playerName(player)
          )}"
          loading="lazy"
          onerror="
            this.style.display='none';
            this.parentElement
              .querySelector('.bfmd-fallback-number')
              ?.style.setProperty(
                'display',
                'flex'
              );
          "
        >

        <div class="bfmd-number">
          ${esc(number)}
        </div>

      </div>
    `;
  }

  function eventBadges(
    player,
    eventMap
  ) {
    const stats =
      eventMap.get(
        playerKey(player)
      );

    if (!stats) {
      return "";
    }

    const badges = [];

    if (stats.goals) {
      badges.push("⚽");
    }

    if (stats.assists) {
      badges.push("🅰️");
    }

    if (stats.yellow) {
      badges.push("🟨");
    }

    if (stats.red) {
      badges.push("🟥");
    }

    if (stats.in) {
      badges.push("↗️");
    }

    if (stats.out) {
      badges.push("↙️");
    }

    if (!badges.length) {
      return "";
    }

    return `
      <div class="bfmd-event-mini">
        ${badges.join("")}
      </div>
    `;
  }

  /* =========================================================
     RENDER PITCH
  ========================================================= */

  function renderPitch(
    lineup,
    side,
    eventMap
  ) {
    const team =
      lineup.team;

    const positions =
      pitchPositions(
        lineup,
        side
      );

    const playersHTML =
      positions
        .map(position => {

          const player =
            position.player;

          const stats =
            eventMap.get(
              playerKey(player)
            ) || {
              goals: 0,
              assists: 0,
              yellow: 0,
              red: 0,
              in: 0,
              out: 0
            };

          const rating =
            playerRating(player);

          return `
            <div
              class="bfmd-player"
              style="
                left:${position.x}%;
                top:${position.y}%;
              "
              title="${esc(
                playerName(player)
              )}"
            >

              ${eventBadges(
                player,
                eventMap
              )}

              ${playerAvatarHTML(
                player
              )}

              <div class="bfmd-name">
                ${esc(
                  playerName(player)
                )}
              </div>

              ${
                rating !== null &&
                rating !== undefined &&
                rating !== ""
                  ? `
                    <div class="bfmd-rating">
                      ⭐ ${esc(
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
            ${esc(
              team.name
            )}

            ${
              lineup.confirmed
                ? `
                  <span class="bfmd-confirmed">
                    ✓ Confirmée
                  </span>
                `
                : ""
            }
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

  function playerRow(
    player,
    eventMap
  ) {
    const stats =
      eventMap.get(
        playerKey(player)
      ) || {
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        in: 0,
        out: 0
      };

    const rating =
      playerRating(player);

    const photo =
      playerPhoto(player);

    return `
      <div class="bfmd-row">

        <div class="bfmd-shirt">
          ${esc(
            playerNumber(player)
          )}
        </div>

        ${
          photo
            ? `
              <img
                class="bfmd-player-photo"
                src="${esc(photo)}"
                alt="${esc(
                  playerName(player)
                )}"
                loading="lazy"
                onerror="
                  this.style.display='none'
                "
              >
            `
            : `
              <div></div>
            `
        }

        <div>

          <div class="bfmd-player-name">
            ${esc(
              playerName(player)
            )}
          </div>

          <div class="bfmd-position">
            ${esc(
              playerPosition(player)
            )}
          </div>

        </div>

        <div class="bfmd-badges">

          ${
            rating !== null &&
            rating !== undefined &&
            rating !== ""
              ? `
                <span class="bfmd-badge">
                  ⭐ ${esc(
                    Number(rating)
                      .toFixed(1)
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
                  🟨 ${stats.yellow}
                </span>
              `
              : ""
          }

          ${
            stats.red
              ? `
                <span class="bfmd-badge">
                  🟥 ${stats.red}
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
    const starters =
      arr(
        lineup.xi
      );

    const subs =
      arr(
        lineup.subs
      );

    return `
      <div>

        <div class="bfmd-team-column-title">
          ${esc(
            lineup.team.name
          )}
        </div>

        <div class="bfmd-subtitle">
          🟢 Onze de départ
        </div>

        ${
          starters.length
            ? starters
                .map(player =>
                  playerRow(
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
          subs.length
            ? `
              <div class="bfmd-subtitle">
                🪑 Remplaçants
              </div>

              ${subs
                .map(player =>
                  playerRow(
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
     EVENT ICON
  ========================================================= */

  function eventIcon(
    event
  ) {
    switch (
      event.kind
    ) {
      case "goal":
        return "⚽";

      case "yellow":
        return "🟨";

      case "red":
        return "🟥";

      case "substitution":
        return "🔄";

      case "var":
        return "🎥";

      default:
        return "📌";
    }
  }

  /* =========================================================
     EVENT TEAM
  ========================================================= */

  function eventTeamName(
    event,
    teams
  ) {
    if (
      str(event.side)
        .toLowerCase()
        === "home"
    ) {
      return teams.home.name;
    }

    if (
      str(event.side)
        .toLowerCase()
        === "away"
    ) {
      return teams.away.name;
    }

    if (
      event.teamId &&
      teams.home.id &&
      String(
        event.teamId
      ) === String(
        teams.home.id
      )
    ) {
      return teams.home.name;
    }

    if (
      event.teamId &&
      teams.away.id &&
      String(
        event.teamId
      ) === String(
        teams.away.id
      )
    ) {
      return teams.away.name;
    }

    return "";
  }

  /* =========================================================
     EVENTS HTML
  ========================================================= */

  function minuteText(
    event
  ) {
    if (
      event.minute === "" ||
      event.minute === null ||
      event.minute === undefined
    ) {
      return "";
    }

    if (
      event.extra !== "" &&
      event.extra !== null &&
      event.extra !== undefined
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
    events,
    teams
  ) {
    if (!events.length) {
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
              a.minute || 999
            ) -
            Number(
              b.minute || 999
            )
        );

    return `
      <div class="bfmd-section">

        <div class="bfmd-title">
          ⚡ Événements
        </div>

        <div class="bfmd-events">

          ${sorted
            .map(event => {

              const teamName =
                eventTeamName(
                  event,
                  teams
                );

              let mainText =
                event.name ||
                event.type ||
                "Événement";

              let detail =
                event.detail ||
                "";

              let assistHTML =
                "";

              if (
                event.kind ===
                "goal" &&
                event.assist
              ) {
                assistHTML = `
                  <div class="bfmd-event-assist">
                    🅰️ Passe décisive :
                    ${esc(
                      event.assist
                    )}
                  </div>
                `;
              }

              if (
                event.kind ===
                "substitution"
              ) {
                mainText = `
                  <span class="bfmd-out">
                    ${esc(
                      event.playerOut ||
                      "—"
                    )}
                  </span>

                  →
                  
                  <span class="bfmd-in">
                    ${esc(
                      event.playerIn ||
                      "—"
                    )}
                  </span>
                `;

                detail =
                  "Changement";
              }

              return `
                <div class="bfmd-event">

                  <div class="bfmd-minute">
                    ${minuteText(
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
                      ${
                        typeof mainText ===
                        "string"
                          ? esc(
                              mainText
                            )
                          : mainText
                      }
                    </div>

                    ${
                      teamName
                        ? `
                          <div class="bfmd-event-team">
                            ${esc(
                              teamName
                            )}
                          </div>
                        `
                        : ""
                    }

                    ${
                      detail
                        ? `
                          <div class="bfmd-event-detail">
                            ${esc(
                              detail
                            )}
                          </div>
                        `
                        : ""
                    }

                    ${assistHTML}

                  </div>

                </div>
              `;
            })
            .join("")}

        </div>

      </div>
    `;
  }

  /* =========================================================
     SUBSTITUTIONS
  ========================================================= */

  function renderSubstitutions(
    events,
    teams
  ) {
    const substitutions =
      events.filter(
        event =>
          event.kind ===
          "substitution"
      );

    if (
      !substitutions.length
    ) {
      return "";
    }

    const grouped = {
      home: [],
      away: [],
      other: []
    };

    substitutions.forEach(
      event => {

        const side =
          str(
            event.side
          ).toLowerCase();

        if (
          side === "home"
        ) {
          grouped.home.push(
            event
          );
        }
        else if (
          side === "away"
        ) {
          grouped.away.push(
            event
          );
        }
        else {
          grouped.other.push(
            event
          );
        }

      }
    );

    function card(
      title,
      list
    ) {
      if (!list.length) {
        return "";
      }

      return `
        <div class="bfmd-sub-card">

          <div class="bfmd-team-column-title">
            ${esc(title)}
          </div>

          ${list
            .map(event => `
              <div class="bfmd-sub-line">

                <div class="bfmd-sub-minute">
                  ${minuteText(
                    event
                  )}
                </div>

                <div>

                  <div>
                    <span class="bfmd-out">
                      ↓
                      ${esc(
                        event.playerOut ||
                        "—"
                      )}
                    </span>
                  </div>

                  <div>
                    <span class="bfmd-in">
                      ↑
                      ${esc(
                        event.playerIn ||
                        "—"
                      )}
                    </span>
                  </div>

                </div>

              </div>
            `)
            .join("")}

        </div>
      `;
    }

    return `
      <div class="bfmd-section">

        <div class="bfmd-title">
          🔄 Remplacements
        </div>

        <div class="bfmd-subs">

          ${card(
            teams.home.name,
            grouped.home
          )}

          ${card(
            teams.away.name,
            grouped.away
          )}

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
          event.kind === "goal"
      ).length;

    const yellow =
      events.filter(
        event =>
          event.kind === "yellow"
      ).length;

    const red =
      events.filter(
        event =>
          event.kind === "red"
      ).length;

    const subs =
      events.filter(
        event =>
          event.kind === "substitution"
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
     PLAYER OF THE MATCH
  ========================================================= */

  function getManOfMatch(
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
      return null;
    }

    if (typeof value === "string") {
      return value;
    }

    return first(
      value?.name,
      value?.player?.name,
      null
    );
  }

  function renderManOfMatch(
    details
  ) {
    const player =
      getManOfMatch(
        details
      );

    if (!player) {
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
            ${esc(player)}
          </span>

        </div>

      </div>
    `;
  }

  /* =========================================================
     SCORE / STATUS
  ========================================================= */

  function getScore(
    details
  ) {
    const score =
      details?.score || {};

    return {
      home:
        first(
          score?.home,
          details?.goals?.home,
          details?.home_score,
          details?.homeScore,
          "-"
        ),

      away:
        first(
          score?.away,
          details?.goals?.away,
          details?.away_score,
          details?.awayScore,
          "-"
        )
    };
  }

  function getStatus(
    details
  ) {
    const status =
      details?.fixture?.status;

    return first(
      details?.status_text,
      typeof details?.status === "string"
        ? details.status
        : null,
      status?.long,
      status?.short,
      "MATCH"
    );
  }

  function getCompetition(
    details
  ) {
    return first(
      details?.league?.name,
      details?.competition?.name,
      typeof details?.competition === "string"
        ? details.competition
        : null,
      "Football"
    );
  }

  /* =========================================================
     OPEN DETAILS
  ========================================================= */

  async function openDetailsByIdentifier(
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
            cache: "no-store"
          }
        );

      const rawText =
        await response.text();

      if (!response.ok) {
        throw new Error(
          `API HTTP ${response.status}`
        );
      }

      let payload;

      try {
        payload =
          JSON.parse(
            rawText
          );
      }
      catch {
        throw new Error(
          "Réponse API invalide"
        );
      }

      console.log(
        "BAKHIRAFOOT DETAILS:",
        payload
      );

      const details =
        payload?.data ||
        payload?.match ||
        payload;

      if (
        !details ||
        typeof details !==
        "object"
      ) {
        throw new Error(
          "Données du match introuvables"
        );
      }

      /* =====================================================
         TEAMS
      ===================================================== */

      const teams =
        getTeams(details);

      /* =====================================================
         SCORE
      ===================================================== */

      const score =
        getScore(details);

      /* =====================================================
         STATUS
      ===================================================== */

      const status =
        getStatus(details);

      /* =====================================================
         COMPETITION
      ===================================================== */

      const competition =
        getCompetition(
          details
        );

      /* =====================================================
         DATE / VENUE / REFEREE
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
          typeof details?.venue === "string"
            ? details.venue
            : null,
          ""
        );

      const referee =
        first(
          details?.fixture?.referee?.name,
          details?.referee?.name,
          typeof details?.referee === "string"
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
        normalizeEvents(
          details
        );

      const eventMap =
        buildPlayerEventMap(
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
          events,
          teams
        )}

        ${renderEvents(
          events,
          teams
        )}

        ${renderManOfMatch(
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
              "Erreur lors du chargement des détails."
            )}
          </div>

        </div>

      `;
    }
  }

  /* =========================================================
     GLOBAL OVERRIDE
     script.js كينادي openMatchDetails(index)
  ========================================================= */

  window.bfOpenMatchDetails =
    openDetailsByIdentifier;

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

      openDetailsByIdentifier(
        identifier
      );
    };

})();
