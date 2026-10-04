(function () {
  "use strict";

  /*
   * =========================================================
   * BAKHIRAFOOT - MATCH DETAILS
   * =========================================================
   *
   * كيقرا:
   * /api?fixture=...
   *
   * وكيحوّل formats مختلفة ديال SportScore
   * إلى:
   *
   * - formation
   * - starting XI
   * - substitutes
   * - goals
   * - assists
   * - yellow / red cards
   * - substitutions
   * - event timeline
   * - player ratings
   * - player photos إلا كانت موجودة
   */

  const DETAILS_API = "/api?fixture=";

  /* =========================================================
     BASIC HELPERS
  ========================================================= */

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function text(value, fallback = "") {
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
    return text(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
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
            type="button"
            aria-label="Fermer"
          >
            ✕
          </button>

          <div id="bfmdContent"></div>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    const overlay =
      modal.querySelector(
        ".bfmd-overlay"
      );

    const close =
      modal.querySelector(
        ".bfmd-close"
      );

    overlay.addEventListener(
      "click",
      closeModal
    );

    close.addEventListener(
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
        width: min(1200px, 100%);
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
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        gap: 20px;
        align-items: center;
        text-align: center;
      }

     .bfmd-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  min-width: 0;
  width: 100%;
  max-width: 100%;

  font-size: 14px;
  font-weight: 950;
  text-align: center;
}

.bfmd-team > span {
  display: block;

  width: 100%;
  max-width: 100%;

  white-space: normal;
  overflow: visible;
  text-overflow: clip;

  overflow-wrap: anywhere;
  word-break: normal;

  line-height: 1.25;
  text-align: center;
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
        border: 2px solid rgba(255,255,255,.92);
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
  transform: translate(-50%, -50%);
  width: 105px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
  pointer-events: none;
}

.bfmd-photo-wrap {
  position: relative;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,.96);
  background: #fff;
  box-shadow:
    0 4px 14px rgba(0,0,0,.38);
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
  min-width: 21px;
  height: 21px;
  padding: 0 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 999px;
  background: #fff;
  color: #111827;
  border: 1px solid rgba(0,0,0,.16);
  font-size: 10px;
  font-weight: 950;
}

.bfmd-number-only {
  width: 43px;
  height: 43px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: #fff;
  color: #111827;
  font-size: 12px;
  font-weight: 950;
  box-shadow:
    0 4px 12px rgba(0,0,0,.32);
}

.bfmd-name {
  max-width: 105px;
  margin-top: 5px;
  padding: 4px 7px;
  border-radius: 6px;
  background: rgba(0,0,0,.78);
  color: #fff;
  font-size: 11px;
  line-height: 1.15;
  font-weight: 950;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bfmd-rating {
  margin-top: 3px;
  padding: 3px 7px;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  font-size: 10px;
  line-height: 1;
  font-weight: 950;
  box-shadow:
    0 2px 7px rgba(0,0,0,.22);
}

.bfmd-event-mini {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 3px 6px;
  min-height: 20px;
  border-radius: 999px;
  background: rgba(0,0,0,.76);
  color: #fff;
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  box-shadow:
    0 3px 8px rgba(0,0,0,.28);
}

      /* =====================================================
         PLAYER LIST
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
        opacity: .70;
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
        opacity: .60;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  text-align: center;
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

    document.head.appendChild(style);
  }

  /* =========================================================
     TEAM
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
        typeof source === "string"
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
            details?.[`${side}_id`],
            null
          ),

        name:
          first(
            source?.name,
            details?.[`${side}_name`],
            side === "home"
              ? "Domicile"
              : "Extérieur"
          ),

        logo:
          first(
            source?.logo,
            source?.image,
            source?.picture,
            details?.[`${side}_logo`],
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
     FORMATION
  ========================================================= */

  function normalizeFormation(
    formation
  ) {
    const value =
      text(formation)
        .trim();

    if (!value) {
      return "—";
    }

    if (
      value.includes("-")
    ) {
      return value;
    }

    if (
      /^\d{3,4}$/.test(value)
    ) {
      const parts =
        value
          .split("")
          .map(Number);

      return parts.join("-");
    }

    return value;
  }

  /* =========================================================
     LINEUP SOURCE HELPERS
  ========================================================= */

  function sideObject(
    raw,
    side
  ) {
    if (!obj(raw)) {
      return null;
    }

    return (
      raw?.[side] ||
      raw?.[side === "home"
        ? "homeTeam"
        : "awayTeam"] ||
      raw?.[
        side === "home"
          ? "host"
          : "guest"
      ] ||
      null
    );
  }

  function teamMatches(
    source,
    team
  ) {
    if (!obj(source)) {
      return false;
    }

    const sourceTeam =
      source?.team ||
      source?.team_info ||
      source?.club ||
      {};

    const id =
      first(
        sourceTeam?.id,
        sourceTeam?.team_id,
        source?.team_id,
        source?.id,
        null
      );

    const name =
      first(
        sourceTeam?.name,
        source?.team_name,
        source?.name,
        ""
      );

    if (
      team?.id &&
      id &&
      String(team.id) ===
        String(id)
    ) {
      return true;
    }

    if (
      name &&
      team?.name &&
      norm(name) ===
        norm(team.name)
    ) {
      return true;
    }

    return false;
  }

  function arrayTeamGroup(
    raw,
    team,
    side
  ) {
    if (!Array.isArray(raw)) {
      return null;
    }

    const exact =
      raw.find(
        item =>
          teamMatches(
            item,
            team
          )
      );

    if (exact) {
      return exact;
    }

    const sideFound =
      raw.find(item => {
        const s =
          norm(
            first(
              item?.side,
              item?.team_side,
              ""
            )
          );

        return (
          s === side ||
          (
            side === "home" &&
            s === "host"
          ) ||
          (
            side === "away" &&
            s === "guest"
          )
        );
      });

    if (sideFound) {
      return sideFound;
    }

    return null;
  }

  /* =========================================================
     PLAYERS FROM SOURCE
  ========================================================= */

  function playerSide(
    player
  ) {
    return norm(
      first(
        player?.side,
        player?.team_side,
        player?.teamType,
        ""
      )
    );
  }

  function playerIsStarting(
    player
  ) {
    if (!obj(player)) {
      return null;
    }

    const value =
      first(
        player?.is_starting,
        player?.starting,
        player?.starter,
        player?.isStarter,
        player?.in_starting,
        null
      );

    if (
      value === null
    ) {
      return null;
    }

    return (
      value === true ||
      value === 1 ||
      value === "1" ||
      value === "true"
    );
  }

  function playersFromSource(
    source,
    wantedSide
  ) {
    if (!source) {
      return [];
    }

    let candidates = [];

    if (
      Array.isArray(source)
    ) {
      candidates =
        source.slice();
    }
    else if (
      obj(source)
    ) {
      candidates =
        first(
          source?.startXI,
          source?.startingXI,
          source?.starting_xi,
          source?.starters,
          source?.players,
          source?.xi,
          []
        );

      if (
        !Array.isArray(
          candidates
        )
      ) {
        candidates = [];
      }
    }

    if (!candidates.length) {
      return [];
    }

    const hasSides =
      candidates.some(
        item =>
          playerSide(
            item
          )
      );

    if (
      hasSides &&
      wantedSide
    ) {
      candidates =
        candidates.filter(
          item => {

            const side =
              playerSide(
                item
              );

            if (
              wantedSide ===
              "home"
            ) {
              return (
                side === "home" ||
                side === "host"
              );
            }

            return (
              side === "away" ||
              side === "guest"
            );
          }
        );
    }

    return candidates;
  }

  function getPlayers(
    source,
    wantedSide
  ) {
    return playersFromSource(
      source,
      wantedSide
    );
  }

  /* =========================================================
     PLAYER HELPERS
  ========================================================= */

  function getPlayerName(
    player
  ) {
    if (
      typeof player === "string"
    ) {
      return player;
    }

    return first(
      player?.name,
      player?.player_name,
      player?.player?.name,
      player?.short_name,
      "Joueur"
    );
  }

 function getPlayerNumber(
  player
) {
  if (!player) {
    return "-";
  }

  if (
    typeof player === "string" ||
    typeof player === "number"
  ) {
    return "-";
  }

  const p =
    player?.player &&
    typeof player.player === "object"
      ? player.player
      : player;

  return first(

    /* مباشر */
    player?.number,
    player?.shirt_number,
    player?.shirtNumber,
    player?.jersey,
    player?.jersey_number,
    player?.jerseyNumber,

    /* nested player */
    p?.number,
    p?.shirt_number,
    p?.shirtNumber,
    p?.jersey,
    p?.jersey_number,
    p?.jerseyNumber,

    /* statistics / games */
    player?.statistics?.shirtNumber,
    player?.statistics?.jerseyNumber,
    player?.games?.shirtNumber,
    player?.games?.jerseyNumber,

    "-"
  );
}
  
function getPlayerPosition(player) {
  if (
    !player ||
    typeof player === "string" ||
    typeof player === "number"
  ) {
    return "";
  }

  const p =
    player?.player &&
    typeof player.player === "object"
      ? {
          ...player.player,
          ...player
        }
      : player;

  let raw =
    first(
      /* direct */
      player?.position,
      player?.pos,
      player?.role,
      player?.positionName,
      player?.position_name,

      /* nested */
      player?.player?.position,
      player?.player?.pos,
      player?.player?.role,

      /* statistics */
      player?.statistics?.position,
      player?.statistics?.positionName,

      p?.position,
      p?.pos,
      p?.role,

      ""
    );

  if (
    raw &&
    typeof raw === "object"
  ) {
    raw =
      first(
        raw?.abbreviation,
        raw?.shortName,
        raw?.short_name,
        raw?.displayName,
        raw?.name,
        ""
      );
  }

  const value =
    norm(raw);

  const map = {
    g: "GK",
    gk: "GK",
    goalkeeper: "GK",
    keeper: "GK",

    lb: "LB",
    "left back": "LB",
    "left fullback": "LB",
    "left full back": "LB",

    lwb: "LWB",
    "left wing back": "LWB",

    lcb: "LCB",
    "left centre back": "LCB",
    "left center back": "LCB",

    cb: "CB",
    "centre back": "CB",
    "center back": "CB",
    "central defender": "CB",

    rcb: "RCB",
    "right centre back": "RCB",
    "right center back": "RCB",

    rb: "RB",
    "right back": "RB",
    "right fullback": "RB",
    "right full back": "RB",

    rwb: "RWB",
    "right wing back": "RWB",

    ldm: "LDM",
    dm: "DM",
    cdm: "DM",
    rdm: "RDM",

    lm: "LM",
    lcm: "LCM",
    cm: "CM",
    mc: "CM",
    rcm: "RCM",
    rm: "RM",

    lam: "LAM",
    am: "AM",
    cam: "AM",
    ram: "RAM",

    lw: "LW",
    lf: "LF",
    "left wing": "LW",
    "left winger": "LW",

    rw: "RW",
    rf: "RF",
    "right wing": "RW",
    "right winger": "RW",

    st: "ST",
    cf: "CF",
    ss: "SS",
    striker: "ST",
    "centre forward": "CF",
    "center forward": "CF"
  };

  if (
    map[value]
  ) {
    return map[value];
  }

  if (
    value === "d" ||
    value === "df" ||
    value === "def" ||
    value.includes("def")
  ) {
    return "DEF";
  }

  if (
    value === "m" ||
    value === "mf" ||
    value === "mid" ||
    value.includes("mid")
  ) {
    return "MID";
  }

  if (
    value === "f" ||
    value === "fw" ||
    value === "att" ||
    value.includes("forw") ||
    value.includes("strik") ||
    value.includes("wing")
  ) {
    return "FWD";
  }

  return String(
    raw || ""
  );
}

  function getPlayerPhoto(
  player
) {
  if (!player) {
    return "";
  }

  if (
    typeof player === "string" ||
    typeof player === "number"
  ) {
    return "";
  }

  const p =
    player?.player &&
    typeof player.player === "object"
      ? player.player
      : player;

  function extractImage(
    value
  ) {
    if (!value) {
      return "";
    }

    if (
      typeof value === "string"
    ) {
      return value.trim();
    }

    if (
      typeof value !== "object"
    ) {
      return "";
    }

    return first(
      value?.url,
      value?.src,
      value?.href,
      value?.image,
      value?.photo,
      value?.picture,
      value?.avatar,
      value?.headshot,
      value?.profile,
      value?.path,
      ""
    );
  }

  return first(

    /* =================================
       مباشر
    ================================= */

    player?.photo,
    player?.image,
    player?.picture,
    player?.avatar,
    player?.headshot,
    player?.photo_url,
    player?.image_url,
    player?.photoUrl,
    player?.imageUrl,

    /* =================================
       image object
    ================================= */

    extractImage(
      player?.image
    ),

    extractImage(
      player?.photo
    ),

    extractImage(
      player?.picture
    ),

    extractImage(
      player?.avatar
    ),

    extractImage(
      player?.headshot
    ),

    /* =================================
       nested player
    ================================= */

    p?.photo,
    p?.image,
    p?.picture,
    p?.avatar,
    p?.headshot,
    p?.photo_url,
    p?.image_url,
    p?.photoUrl,
    p?.imageUrl,

    extractImage(
      p?.image
    ),

    extractImage(
      p?.photo
    ),

    extractImage(
      p?.picture
    ),

    extractImage(
      p?.avatar
    ),

    extractImage(
      p?.headshot
    ),

    /* =================================
       nested profile
    ================================= */

    extractImage(
      p?.profile
    ),

    extractImage(
      player?.profile
    ),

    ""
  );
}

function getPlayerRating(
  player
) {
  if (!player) {
    return null;
  }

  if (
    typeof player === "string" ||
    typeof player === "number"
  ) {
    return null;
  }

  const p =
    player?.player &&
    typeof player.player === "object"
      ? player.player
      : player;

  const value =
    first(

      /* =================================
         مباشر
      ================================= */

      player?.rating,
      player?.match_rating,
      player?.matchRating,
      player?.rating_value,
      player?.ratingValue,
      player?.score,

      /* =================================
         statistics
      ================================= */

      player?.statistics?.rating,
      player?.statistics?.player_rating,
      player?.statistics?.match_rating,
      player?.statistics?.ratingValue,
      player?.statistics?.score,

      /* =================================
         performance
      ================================= */

      player?.performance?.rating,
      player?.performance?.score,

      /* =================================
         nested player
      ================================= */

      p?.rating,
      p?.match_rating,
      p?.matchRating,
      p?.rating_value,
      p?.ratingValue,
      p?.score,

      p?.statistics?.rating,
      p?.statistics?.player_rating,
      p?.statistics?.match_rating,
      p?.statistics?.ratingValue,
      p?.statistics?.score,

      p?.performance?.rating,
      p?.performance?.score,

      null
    );

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const rating =
    Number(
      String(value)
        .replace(",", ".")
        .trim()
    );

  if (
    !Number.isFinite(
      rating
    )
  ) {
    return null;
  }

return rating > 0
  ? rating
  : null;}
  function playerKey(
    player
  ) {
    return norm(
      getPlayerName(
        player
      )
    );
  }

  /* =========================================================
     BUILD LINEUP
  ========================================================= */
function buildLineup(
  details,
  side,
  team
) {

  /* =====================================================
     1) COLLECT ALL POSSIBLE SOURCES
  ===================================================== */

  const roots = [];

  const pushRoot = (value) => {
    if (
      value !== undefined &&
      value !== null
    ) {
      roots.push(value);
    }
  };

  pushRoot(details?.lineups);
  pushRoot(details?.lineup);
  pushRoot(details?.compositions);
  pushRoot(details?.formations);
  pushRoot(details?.players);

  pushRoot(details?.data?.lineups);
  pushRoot(details?.data?.lineup);
  pushRoot(details?.data?.players);

  pushRoot(details?.match?.lineups);
  pushRoot(details?.match?.lineup);
  pushRoot(details?.match?.players);

  /* =====================================================
     2) TEAM HELPERS
  ===================================================== */

  function unwrapPlayer(player) {

    if (
      player &&
      typeof player === "object" &&
      player.player &&
      typeof player.player === "object"
    ) {
      return {
        ...player.player,
        ...player
      };
    }

    return player || {};
  }

  function playerTeamObject(player) {

    const p =
      unwrapPlayer(player);

    return (
      p?.team ||
      p?.club ||
      p?.team_info ||
      p?.teamInfo ||
      p?.player_team ||
      {}
    );
  }

  function belongs(player) {

    if (
      !player ||
      typeof player !== "object"
    ) {
      return false;
    }

    const p =
      unwrapPlayer(player);

    const wantedSide =
      side === "home"
        ? ["home", "host"]
        : ["away", "guest"];

    const rawSide =
      norm(
        first(
          p?.side,
          p?.team_side,
          p?.teamType,
          p?.sideType,
          ""
        )
      );

    if (
      rawSide &&
      wantedSide.includes(rawSide)
    ) {
      return true;
    }

    if (
      rawSide &&
      !wantedSide.includes(rawSide)
    ) {
      return false;
    }

    const pt =
      playerTeamObject(player);

    const teamId =
      first(
        team?.id,
        null
      );

    const playerTeamId =
      first(
        pt?.id,
        pt?.team_id,
        p?.team_id,
        p?.teamId,
        p?.club_id,
        null
      );

    if (
      teamId &&
      playerTeamId &&
      String(teamId) ===
        String(playerTeamId)
    ) {
      return true;
    }

    const wantedName =
      norm(
        team?.name || ""
      );

    const playerTeamName =
      norm(
        first(
          pt?.name,
          pt?.team_name,
          p?.team_name,
          p?.teamName,
          ""
        )
      );

    if (
      wantedName &&
      playerTeamName &&
      wantedName === playerTeamName
    ) {
      return true;
    }

    return false;
  }

  function startingValue(player) {

    const p =
      unwrapPlayer(player);

    const value =
      first(
        p?.is_starting,
        p?.isStarting,
        p?.starting,
        p?.starter,
        p?.isStarter,
        p?.in_starting,
        p?.inStarting,
        p?.starting_player,
        p?.startingPlayer,
        null
      );

    if (
      value === true ||
      value === 1 ||
      value === "1" ||
      value === "true"
    ) {
      return true;
    }

    if (
      value === false ||
      value === 0 ||
      value === "0" ||
      value === "false"
    ) {
      return false;
    }

    return null;
  }

  function cleanArray(value) {

    if (
      Array.isArray(value)
    ) {
      return value.filter(Boolean);
    }

    if (
      !value ||
      typeof value !== "object"
    ) {
      return [];
    }

    const possible =
      first(
        value?.data,
        value?.results,
        value?.items,
        value?.players,
        value?.list,
        value?.xi,
        value?.startXI,
        value?.startingXI,
        value?.starting_xi,
        value?.starters,
        value?.substitutes,
        value?.subs,
        []
      );

    if (
      Array.isArray(possible)
    ) {
      return possible.filter(Boolean);
    }

    return [];
  }

  function firstArray(...values) {

    for (
      const value of values
    ) {

      const list =
        cleanArray(value);

      if (
        list.length
      ) {
        return list;
      }

    }

    return [];
  }

  function teamBlock(root) {

    if (
      !root ||
      typeof root !== "object"
    ) {
      return null;
    }

    if (
      root?.[side]
    ) {
      return root[side];
    }

    if (
      side === "home" &&
      root?.host
    ) {
      return root.host;
    }

    if (
      side === "away" &&
      root?.guest
    ) {
      return root.guest;
    }

    if (
      side === "home" &&
      root?.homeTeam
    ) {
      return root.homeTeam;
    }

    if (
      side === "away" &&
      root?.awayTeam
    ) {
      return root.awayTeam;
    }

    return null;
  }

  /* =====================================================
     3) FORMATION
  ===================================================== */

  let formation =
    first(
      details?.[`${side}_formation`],
      details?.formation?.[side],
      details?.formation?.[`${side}_formation`],
      details?.lineups?.[side]?.formation,
      details?.lineup?.[side]?.formation,
      details?.compositions?.[side]?.formation,
      details?.players?.[side]?.formation,
      "4-3-3"
    );

  for (
    const root of roots
  ) {

    const block =
      teamBlock(root);

    formation =
      first(
        formation,
        block?.formation,
        block?.tactics?.formation,
        root?.[`${side}_formation`],
        root?.formation?.[side],
        root?.formation?.[`${side}_formation`],
        null
      );

  }

  formation =
    normalizeFormation(
      formation
    );

  /* =====================================================
     4) STARTERS + SUBSTITUTES
  ===================================================== */

  let starters = [];
  let substitutes = [];

  function extractFromBlock(block) {

    if (
      !block ||
      typeof block !== "object"
    ) {
      return;
    }

    const directStart =
      firstArray(
        block?.startXI,
        block?.startingXI,
        block?.starting_xi,
        block?.startingLineup,
        block?.starters,
        block?.xi,
        block?.starting,
        block?.starting_players
      );

    const directSubs =
      firstArray(
        block?.substitutes,
        block?.subs,
        block?.bench,
        block?.backup,
        block?.sub_players
      );

    if (
      !starters.length &&
      directStart.length
    ) {
      starters =
        directStart;
    }

    if (
      !substitutes.length &&
      directSubs.length
    ) {
      substitutes =
        directSubs;
    }

    /* players داخل block */

    if (
      !starters.length
    ) {

      const players =
        firstArray(
          block?.players,
          block?.lineup_players,
          block?.squad
        );

      if (
        players.length
      ) {

        const teamPlayers =
          players.filter(
            belongs
          );

        const marked =
          teamPlayers.filter(
            player =>
              startingValue(player) === true
          );

        if (
          marked.length
        ) {

          starters =
            marked;

        }
        else if (
          teamPlayers.length >= 11
        ) {

          starters =
            teamPlayers.slice(
              0,
              11
            );

          if (
            !substitutes.length
          ) {

            substitutes =
              teamPlayers.slice(
                11
              );

          }

        }

      }

    }

  }

  /* =====================================================
     5) READ SOURCES ONE BY ONE
  ===================================================== */

  for (
    const root of roots
  ) {

    if (
      !root
    ) {
      continue;
    }

    /* ---------------------------------------------
       Array source
    --------------------------------------------- */

    if (
      Array.isArray(root)
    ) {

      const teamPlayers =
        root.filter(
          player =>
            belongs(player)
        );

      const marked =
        teamPlayers.filter(
          player =>
            startingValue(player) === true
        );

      if (
        !starters.length &&
        marked.length
      ) {

        starters =
          marked;

      }

      else if (
        !starters.length &&
        teamPlayers.length >= 11
      ) {

        starters =
          teamPlayers.slice(
            0,
            11
          );

        if (
          !substitutes.length
        ) {

          substitutes =
            teamPlayers.slice(
              11
            );

        }

      }

      continue;
    }

    /* ---------------------------------------------
       Team block
    --------------------------------------------- */

    const block =
      teamBlock(root);

    if (
      block
    ) {
      extractFromBlock(
        block
      );
    }

    /* ---------------------------------------------
       Direct side keys
    --------------------------------------------- */

    const sideStart =
      firstArray(
        root?.[`${side}_xi`],
        root?.[`${side}_startXI`],
        root?.[`${side}_startingXI`],
        root?.[`${side}_starting_xi`],
        root?.[`${side}_starting`],
        root?.[`${side}_starters`],
        root?.[`${side}_players`]
      );

    const sideSubs =
      firstArray(
        root?.[`${side}_subs`],
        root?.[`${side}_substitutes`],
        root?.[`${side}_bench`],
        root?.[`${side}_backup`]
      );

    if (
      !starters.length &&
      sideStart.length
    ) {
      starters =
        sideStart;
    }

    if (
      !substitutes.length &&
      sideSubs.length
    ) {
      substitutes =
        sideSubs;
    }

    /* ---------------------------------------------
       players شاملين الفريقين
    --------------------------------------------- */

    if (
      !starters.length
    ) {

      const allPlayers =
        firstArray(
          root?.players,
          root?.lineup_players,
          root?.squad,
          root?.data?.players,
          root?.results?.players
        );

      if (
        allPlayers.length
      ) {

        const teamPlayers =
          allPlayers.filter(
            belongs
          );

        const marked =
          teamPlayers.filter(
            player =>
              startingValue(player) === true
          );

        if (
          marked.length
        ) {

          starters =
            marked;

        }
        else if (
          teamPlayers.length >= 11
        ) {

          starters =
            teamPlayers.slice(
              0,
              11
            );

          if (
            !substitutes.length
          ) {

            substitutes =
              teamPlayers.slice(
                11
              );

          }

        }

      }

    }

  }

  /* =====================================================
     6) DETAILS.PLAYERS
     API ديالك كيمكن ترجع:
     players: {home:[], away:[]}
     أو players: []
  ===================================================== */

  if (
    !starters.length &&
    details?.players
  ) {

    const playersRoot =
      details.players;

    if (
      playersRoot &&
      typeof playersRoot === "object" &&
      !Array.isArray(playersRoot)
    ) {

      const directTeam =
        firstArray(
          playersRoot?.[side],
          side === "home"
            ? playersRoot?.host
            : playersRoot?.guest
        );

      if (
        directTeam.length
      ) {

        const marked =
          directTeam.filter(
            player =>
              startingValue(player) !== false
          );

        starters =
          marked.slice(
            0,
            11
          );

        if (
          !substitutes.length
        ) {

          substitutes =
            directTeam
              .filter(
                player =>
                  !starters.includes(
                    player
                  )
              );

        }

      }

    }

    else if (
      Array.isArray(playersRoot)
    ) {

      const teamPlayers =
        playersRoot.filter(
          belongs
        );

      const marked =
        teamPlayers.filter(
          player =>
            startingValue(player) === true
        );

      if (
        marked.length
      ) {

        starters =
          marked.slice(
            0,
            11
          );

      }

      else if (
        teamPlayers.length >= 11
      ) {

        starters =
          teamPlayers.slice(
            0,
            11
          );

        if (
          !substitutes.length
        ) {

          substitutes =
            teamPlayers.slice(
              11
            );

        }

      }

    }

  }

  /* =====================================================
     7) REMOVE DUPLICATES
  ===================================================== */

  function uniquePlayers(
    list
  ) {

    const seen =
      new Set();

    const output =
      [];

    for (
      const player of list || []
    ) {

      const p =
        unwrapPlayer(
          player
        );

      const key =
        String(
          first(
            p?.id,
            p?.player_id,
            p?.playerId,
            getPlayerName(p),
            ""
          )
        )
          .trim()
          .toLowerCase();

      if (
        !key
      ) {
        continue;
      }

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);
      output.push(
        player
      );

    }

    return output;
  }

  starters =
    uniquePlayers(
      starters
    ).slice(
      0,
      11
    );

  substitutes =
    uniquePlayers(
      substitutes
    );

  /* =====================================================
     8) LAST FALLBACK
  ===================================================== */

  if (
    starters.length < 11
  ) {

    const candidates =
      [];

    for (
      const root of roots
    ) {

      const all =
        firstArray(
          root?.players,
          root?.lineup_players,
          Array.isArray(root)
            ? root
            : null
        );

      for (
        const player of all
      ) {

        if (
          belongs(player)
        ) {

          candidates.push(
            player
          );

        }

      }

    }

    const merged =
      uniquePlayers(
        [
          ...starters,
          ...candidates
        ]
      );

    starters =
      merged.slice(
        0,
        11
      );

    if (
      !substitutes.length
    ) {

      substitutes =
        merged.slice(
          11
        );

    }

  }

  /* =====================================================
     9) DEBUG
  ===================================================== */

  console.log(
    "BAKHIRAFOOT FINAL LINEUP",
    {
      side,
      team: team?.name,
      formation,
      starters: starters.length,
      substitutes: substitutes.length,
      firstPlayer:
        starters[0] || null
    }
  );

  return {
    side,
    team,
    formation,
    xi: starters,
    subs: substitutes
  };
}

  /* =========================================================
     PITCH POSITION
  ========================================================= */

  function formationRows(
    formation
  ) {
    const value =
      normalizeFormation(
        formation
      );

    const parts =
      value
        .split("-")
        .map(Number)
        .filter(
          number =>
            Number.isFinite(
              number
            ) &&
            number > 0
        );

    return parts.length
      ? parts
      : [4,3,3];
  }

  function category(
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
      position === "1" ||
      position.includes(
        "goalkeeper"
      )
    ) {
      return "gk";
    }

    if (
      position === "d" ||
      position === "df" ||
      position === "def" ||
      position === "2" ||
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
      position === "3" ||
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
      position === "4" ||
      position.includes(
        "forw"
      ) ||
      position.includes(
        "att"
      ) ||
      position.includes(
        "strik"
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

  /* =====================================================
     BASIC
  ===================================================== */

  function unwrap(
    player
  ) {
    if (
      player?.player &&
      typeof player.player === "object"
    ) {
      return {
        ...player.player,
        ...player
      };
    }

    return player || {};
  }

  function number(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const n =
      Number(
        String(value)
          .replace(",", ".")
          .trim()
      );

    return Number.isFinite(n)
      ? n
      : null;
  }

  function percent(
    value
  ) {
    const n =
      number(value);

    if (
      n === null
    ) {
      return null;
    }

    return (
      n >= 0 &&
      n <= 1
    )
      ? n * 100
      : n;
  }

  /* =====================================================
     GRID RÉEL
     الأولوية للـposition الحقيقي من الـAPI
  ===================================================== */

  function readGrid(
    player
  ) {
    const p =
      unwrap(
        player
      );

    const position =
      p?.position;

    const positionObj =
      position &&
      typeof position === "object"
        ? position
        : {};

    const raw =
      first(

        /* normalized */
        player?.grid,
        p?.grid,

        /* position.grid */
        positionObj?.grid,

        /* nested */
        player?.player?.grid,
        player?.player?.position?.grid,

        /* alternatives */
        player?.position_grid,
        p?.position_grid,

        player?.positionGrid,
        p?.positionGrid,

        null
      );

    if (
      raw === null ||
      raw === undefined ||
      raw === ""
    ) {
      return null;
    }

    /*
     * grid object
     */
    if (
      typeof raw === "object"
    ) {
      const row =
        number(
          first(
            raw?.row,
            raw?.line,
            raw?.r,
            null
          )
        );

      const col =
        number(
          first(
            raw?.column,
            raw?.col,
            raw?.c,
            null
          )
        );

      if (
        row !== null &&
        col !== null &&
        row > 0 &&
        col > 0
      ) {
        return {
          row,
          col
        };
      }

      return null;
    }

    /*
     * grid string:
     * 1:1
     * 2:1
     * 2:2
     * etc.
     */
    const match =
      String(raw)
        .trim()
        .match(
          /(\d+)\s*[:;,/_-]\s*(\d+)/
        );

    if (
      !match
    ) {
      return null;
    }

    return {
      row:
        Number(
          match[1]
        ),
      col:
        Number(
          match[2]
        )
    };
  }

  /* =====================================================
     REAL X / Y
  ===================================================== */

  function readXY(
    player
  ) {
    const p =
      unwrap(
        player
      );

    const x =
      percent(
        first(
          player?.x,
          p?.x,
          null
        )
      );

    const y =
      percent(
        first(
          player?.y,
          p?.y,
          null
        )
      );

    if (
      x === null ||
      y === null
    ) {
      return null;
    }

    return {
      x,
      y
    };
  }

  /* =====================================================
     ROLE
  ===================================================== */

  function getRole(
    player
  ) {
    return norm(
      getPlayerPosition(
        player
      )
    )
      .replace(
        /[_-]/g,
        " "
      )
      .trim();
  }

  /*
   * Exact role -> exact football position
   */
  const roleXY = {

    /* GK */
    gk: [50, 8],
    g: [50, 8],
    goalkeeper: [50, 8],
    keeper: [50, 8],

    /* DEFENCE */
    lb: [10, 27],
    "left back": [10, 27],

    lwb: [7, 34],
    "left wing back": [7, 34],

    lcb: [33, 27],
    "left centre back": [33, 27],
    "left center back": [33, 27],

    cb: [50, 27],
    "centre back": [50, 27],
    "center back": [50, 27],

    rcb: [67, 27],
    "right centre back": [67, 27],
    "right center back": [67, 27],

    rb: [90, 27],
    "right back": [90, 27],

    rwb: [93, 34],
    "right wing back": [93, 34],

    /* DEFENSIVE MIDFIELD */
    ldm: [34, 45],
    dm: [50, 45],
    cdm: [50, 45],
    rdm: [66, 45],

    /* MIDFIELD */
    lm: [12, 51],
    lcm: [30, 51],
    cm: [50, 51],
    mc: [50, 51],
    rcm: [70, 51],
    rm: [88, 51],

    /* ATTACKING MIDFIELD */
    lam: [28, 65],
    am: [50, 65],
    cam: [50, 65],
    ram: [72, 65],

    /* WINGS */
    lw: [10, 77],
    lf: [10, 77],
    "left wing": [10, 77],

    rw: [90, 77],
    rf: [90, 77],
    "right wing": [90, 77],

    /* ATTACK */
    st: [50, 84],
    cf: [50, 82],
    ss: [50, 75],
    striker: [50, 84]
  };

  /* =====================================================
     1) GRID EXACT
  ===================================================== */

  const gridPlayers =
    players
      .map(
        player => ({
          player,
          grid:
            readGrid(
              player
            )
        })
      )
      .filter(
        item =>
          !!item.grid
      );

  /*
   * Ila l-API عطانا grid
   * كنستعملوه قبل أي تخمين.
   */
  if (
    gridPlayers.length >=
    Math.max(
      7,
      Math.ceil(
        players.length * 0.7
      )
    )
  ) {

    const rows =
      [
        ...new Set(
          gridPlayers.map(
            item =>
              item.grid.row
          )
        )
      ]
        .sort(
          (a,b) =>
            a - b
        );

    const minRow =
      rows[0];

    const maxRow =
      rows[
        rows.length - 1
      ];

    const result =
      [];

    rows.forEach(
      row => {

        const line =
          gridPlayers
            .filter(
              item =>
                item.grid.row === row
            )
            .sort(
              (a,b) =>
                a.grid.col -
                b.grid.col
            );

        line.forEach(
          (
            item,
            index
          ) => {

            let x;

            if (
              line.length === 1
            ) {
              x = 50;
            }
            else {
              x =
                10 +
                (
                  80 *
                  (
                    index /
                    (
                      line.length - 1
                    )
                  )
                );
            }

            let y;

            if (
              rows.length === 1
            ) {
              y = 50;
            }
            else {
              y =
                8 +
                (
                  84 *
                  (
                    (row - minRow) /
                    Math.max(
                      1,
                      maxRow - minRow
                    )
                  )
                );
            }

            if (
              side === "away"
            ) {
              y =
                100 - y;
            }

            result.push({
              player:
                item.player,

              x:
                Math.max(
                  5,
                  Math.min(
                    95,
                    x
                  )
                ),

              y:
                Math.max(
                  5,
                  Math.min(
                    95,
                    y
                  )
                )
            });

          }
        );

      }
    );

    /*
     * players li ma3ndhomch grid
     * n7awlo nkmlouhom b exact role.
     */
    const used =
      new Set(
        result.map(
          item =>
            item.player
        )
      );

    players
      .filter(
        player =>
          !used.has(
            player
          )
      )
      .forEach(
        player => {

          const pair =
            roleXY[
              getRole(
                player
              )
            ];

          if (
            !pair
          ) {
            return;
          }

          let y =
            pair[1];

          if (
            side === "away"
          ) {
            y =
              100 - y;
          }

          result.push({
            player,

            x:
              pair[0],

            y:
              Math.max(
                5,
                Math.min(
                  95,
                  y
                )
              )
          });

        }
      );

    /*
     * ila وصلنا للـXI كاملين
     * رجعهم كاملين.
     */
    if (
      result.length >=
      players.length
    ) {
      return result.slice(
        0,
        11
      );
    }
  }

  /* =====================================================
     2) REAL X / Y
  ===================================================== */

  const xyPlayers =
    players.map(
      player => ({
        player,

        xy:
          readXY(
            player
          )
      })
    );

  if (
    xyPlayers.every(
      item =>
        !!item.xy
    )
  ) {

    return xyPlayers.map(
      item => {

        let {
          x,
          y
        } =
          item.xy;

        if (
          side === "away"
        ) {
          y =
            100 - y;
        }

        return {
          player:
            item.player,

          x:
            Math.max(
              5,
              Math.min(
                95,
                x
              )
            ),

          y:
            Math.max(
              5,
              Math.min(
                95,
                y
              )
            )
        };

      }
    );
  }

  /* =====================================================
     3) EXACT ROLE
  ===================================================== */

  const rolePlayers =
    players.map(
      player => {

        const role =
          getRole(
            player
          );

        return {
          player,
          role,
          pair:
            roleXY[
              role
            ]
        };

      }
    );

  const exactPlayers =
    rolePlayers.filter(
      item =>
        !!item.pair
    );

  if (
    exactPlayers.length >= 7
  ) {

    return exactPlayers.map(
      item => {

        let y =
          item.pair[1];

        if (
          side === "away"
        ) {
          y =
            100 - y;
        }

        return {
          player:
            item.player,

          x:
            item.pair[0],

          y:
            Math.max(
              5,
              Math.min(
                95,
                y
              )
            )
        };

      }
    );
  }

  /* =====================================================
     4) FORMATION FALLBACK
     ===================================================== */

  const formation =
    normalizeFormation(
      lineup?.formation ||
      "4-3-3"
    );

  let rows =
    formation
      .split("-")
      .map(Number)
      .filter(
        n =>
          Number.isFinite(n) &&
          n > 0
      );

  if (
    !rows.length ||
    rows.reduce(
      (a,b) =>
        a + b,
      0
    ) !== 10
  ) {
    rows =
      [4,3,3];
  }

  const keeper =
    players.find(
      player =>
        ["GK","gk","G","g"]
          .includes(
            getPlayerPosition(
              player
            )
          )
    ) ||
    players[0];

  const result =
    [];

  if (
    keeper
  ) {
    result.push({
      player:
        keeper,

      x: 50,

      y:
        side === "away"
          ? 92
          : 8
    });
  }

  const others =
    players.filter(
      player =>
        player !== keeper
    );

  /*
   * Classification
   */
  const defenders =
    [];

  const mids =
    [];

  const forwards =
    [];

  const unknown =
    [];

  others.forEach(
    player => {

      const value =
        norm(
          getPlayerPosition(
            player
          )
        );

      if (
        value === "d" ||
        value === "df" ||
        value === "def" ||
        value.includes(
          "def"
        )
      ) {
        defenders.push(
          player
        );
      }

      else if (
        value === "m" ||
        value === "mf" ||
        value === "mid" ||
        value.includes(
          "mid"
        )
      ) {
        mids.push(
          player
        );
      }

      else if (
        value === "f" ||
        value === "fw" ||
        value === "att" ||
        value.includes(
          "forw"
        ) ||
        value.includes(
          "strik"
        ) ||
        value.includes(
          "wing"
        )
      ) {
        forwards.push(
          player
        );
      }

      else {
        unknown.push(
          player
        );
      }

    }
  );

  let dIndex = 0;
  let mIndex = 0;
  let fIndex = 0;
  let uIndex = 0;

  rows.forEach(
    (
      count,
      rowIndex
    ) => {

      let source =
        [];

      /*
       * DEFENSE
       */
      if (
        rowIndex === 0
      ) {
        source =
          defenders.slice(
            dIndex,
            dIndex + count
          );

        dIndex +=
          source.length;
      }

      /*
       * ATTACK
       */
      else if (
        rowIndex ===
        rows.length - 1
      ) {
        source =
          forwards.slice(
            fIndex,
            fIndex + count
          );

        fIndex +=
          source.length;
      }

      /*
       * MIDFIELD
       */
      else {
        source =
          mids.slice(
            mIndex,
            mIndex + count
          );

        mIndex +=
          source.length;
      }

      /*
       * Unknown players
       */
      while (
        source.length <
          count &&
        uIndex <
          unknown.length
      ) {

        source.push(
          unknown[
            uIndex++
          ]
        );

      }

      if (
        source.length <
          count
      ) {
        return;
      }

      let y =
        8 +
        (
          84 *
          (
            (rowIndex + 1) /
            rows.length
          )
        );

      if (
        side === "away"
      ) {
        y =
          100 - y;
      }

      source.forEach(
        (
          player,
          index
        ) => {

          const x =
            count === 1
              ? 50
              : (
                  10 +
                  (
                    80 *
                    (
                      index /
                      (
                        count - 1
                      )
                    )
                  )
                );

          result.push({
            player,

            x:
              Math.max(
                5,
                Math.min(
                  95,
                  x
                )
              ),

            y:
              Math.max(
                5,
                Math.min(
                  95,
                  y
                )
              )
          });

        }
      );

    }
  );

  /*
   * أي لاعب بقى
   * نحطوه فـمكان آمن بلا duplicate.
   */
  const used =
    new Set(
      result.map(
        item =>
          item.player
      )
    );

  players
    .filter(
      player =>
        !used.has(
          player
        )
    )
    .forEach(
      player => {

        result.push({
          player,

          x: 50,

          y:
            side === "away"
              ? 68
              : 32
        });

      }
    );

  return result.slice(
    0,
    11
  );
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
  this.onerror=null;
  this.style.display='none';
  const fallback=this.parentElement?.querySelector('.bfmd-number');
  if(fallback) fallback.style.display='flex';
"
        >

        <div class="bfmd-number">
          ${esc(number)}
        </div>

      </div>
    `;
  }

  /* =========================================================
     EVENTS NORMALIZATION
  ========================================================= */

  function eventObjectName(
    value
  ) {
    if (
      typeof value ===
      "string"
    ) {
      return value;
    }

    return first(
      value?.name,
      value?.player?.name,
      value?.short_name,
      ""
    );
  }

  function getEventPlayer(
    event
  ) {
    return first(
      eventObjectName(
        event?.player
      ),
      eventObjectName(
        event?.scorer
      ),
      eventObjectName(
        event?.goal_scorer
      ),
      eventObjectName(
        event?.goal?.player
      ),
      eventObjectName(
        event?.actor
      ),
      event?.player_name,
      event?.playerName,
      event?.scorer_name,
      event?.name,
      ""
    );
  }

  function getEventAssist(
    event
  ) {
    return first(
      eventObjectName(
        event?.assist
      ),
      eventObjectName(
        event?.assist1
      ),
      eventObjectName(
        event?.relatedPlayer
      ),
      event?.assist_name,
      event?.assistName,
      event?.goal?.assist,
      ""
    );
  }

  function getSubIn(
    event
  ) {
    return first(
      eventObjectName(
        event?.player_in
      ),
      eventObjectName(
        event?.playerIn
      ),
      eventObjectName(
        event?.incoming
      ),
      eventObjectName(
        event?.in_player
      ),
      eventObjectName(
        event?.substitute
      ),
      event?.player_in_name,
      event?.playerInName,
      ""
    );
  }

  function getSubOut(
    event
  ) {
    return first(
      eventObjectName(
        event?.player_out
      ),
      eventObjectName(
        event?.playerOut
      ),
      eventObjectName(
        event?.outgoing
      ),
      eventObjectName(
        event?.out_player
      ),
      eventObjectName(
        event?.replaced
      ),
      event?.player_out_name,
      event?.playerOutName,
      ""
    );
  }

  function getEventTeamId(
    event
  ) {
    return first(
      event?.team?.id,
      event?.team_id,
      event?.teamId,
      event?.club?.id,
      null
    );
  }

  function getEventTeamName(
    event
  ) {
    return first(
      event?.team?.name,
      event?.team_name,
      event?.teamName,
      event?.club?.name,
      ""
    );
  }

  function normalizeEvent(
    event,
    index
  ) {
    const rawType =
      first(
        event?.type,
        event?.event_type,
        event?.incidentType,
        event?.kind,
        ""
      );

    const rawDetail =
      first(
        event?.detail,
        event?.description,
        event?.incidentClass,
        event?.reason,
        ""
      );

    const type =
      norm(
        rawType
      );

    const detail =
      norm(
        rawDetail
      );

    let kind =
      "other";

    if (
      type.includes("goal") ||
      detail === "goal" ||
      obj(event?.goal)
    ) {
      kind = "goal";
    }
    else if (
      type.includes("second yellow") ||
      detail.includes("second yellow") ||
      type.includes("red") ||
      detail.includes("red")
    ) {
      kind = "red";
    }
    else if (
      type.includes("yellow") ||
      detail.includes("yellow") ||
      type.includes("card") ||
      detail.includes("card")
    ) {
      kind = "yellow";
    }
    else if (
      type.includes("subst") ||
      type.includes("change") ||
      getSubIn(event) ||
      getSubOut(event)
    ) {
      kind = "substitution";
    }
else if (
  type.includes("injur") ||
  detail.includes("injur") ||
  type.includes("medical") ||
  detail.includes("medical")
) {
  kind = "injury";
}
      
    else if (
      type.includes("var") ||
      detail.includes("var")
    ) {
      kind = "var";
    }

    const minute =
      first(
        event?.time?.elapsed,
        typeof event?.time ===
          "number"
          ? event.time
          : null,
        event?.minute,
        event?.elapsed,
        event?.time,
        ""
      );

    const extra =
      first(
        event?.time?.extra,
        event?.extra,
        event?.addedTime,
        ""
      );

    const name =
      getEventPlayer(
        event
      );

    const assist =
      getEventAssist(
        event
      );

    return {
      index,
      raw: event,
      kind,
      type:
        text(rawType),
      detail:
        text(rawDetail),
      minute,
      extra,
      name,
      assist,
      playerIn:
        getSubIn(
          event
        ),
      playerOut:
        getSubOut(
          event
        ),
      teamId:
        getEventTeamId(
          event
        ),
      teamName:
        getEventTeamName(
          event
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
    const raw =
      first(
        details?.events,
        details?.timeline,
        details?.incidents,
        details?.match_events,
        []
      );

    return arr(
      raw
    ).map(
      normalizeEvent
    );
  }

  /* =========================================================
     EVENT MAP
  ========================================================= */

  function eventStatsMap(
    events
  ) {
    const map =
      new Map();

    function data(
      name
    ) {
      const key =
        norm(name);

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

          if (scorer) {
            scorer.goals++;
          }

          if (
            event.assist
          ) {
            const assist =
              data(
                event.assist
              );

            if (assist) {
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

          if (player) {
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

          if (player) {
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

            if (player) {
              player.in++;
            }
          }
if (
  event.kind === "injury"
) {
  const player =
    data(event.name);

  if (player) {
    player.injury++;
  }
}
          if (
            event.playerOut
          ) {
            const player =
              data(
                event.playerOut
              );

            if (player) {
              player.out++;
            }
          }
        }

      }
    );

    return map;
  }

  /* =========================================================
     PITCH EVENT BADGES
  ========================================================= */

  function playerBadges(
  player,
  statsMap
) {
  const stats =
    statsMap.get(
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

  const badges = [];

  if (
    Number(stats.goals) > 0
  ) {
    badges.push(
      `⚽ ${Number(stats.goals)}`
    );
  }

  if (
    Number(stats.assists) > 0
  ) {
    badges.push(
      `🅰️ ${Number(stats.assists)}`
    );
  }

  if (
    Number(stats.yellow) > 0
  ) {
    badges.push(
      `🟨 ${Number(stats.yellow)}`
    );
  }

  if (
    Number(stats.red) > 0
  ) {
    badges.push(
      `🟥 ${Number(stats.red)}`
    );
  }
    stats.injury
  ? `
    <span class="bfmd-badge">
      🤕
    </span>
  `
  : ""

  if (
    Number(stats.in) > 0
  ) {
    badges.push(
      `↗️ ${Number(stats.in)}`
    );
  }

  if (
    Number(stats.out) > 0
  ) {
    badges.push(
      `↙️ ${Number(stats.out)}`
    );
  }

  if (!badges.length) {
    return "";
  }

  return `
    <div
      class="bfmd-event-mini"
      title="${esc(
        badges.join(" • ")
      )}"
    >
      ${badges
        .map(
          badge => `
            <span
              style="
                margin:0 2px;
                font-weight:950;
              "
            >
              ${esc(badge)}
            </span>
          `
        )
        .join("")}
    </div>
  `;
}
  /* =========================================================
     RENDER PITCH
  ========================================================= */

  function renderPitch(
    lineup,
    side,
    statsMap
  ) {
    const team =
      lineup.team;

    if (
      !lineup.xi.length
    ) {
      return `
        <div class="bfmd-pitch-card">

          <div class="bfmd-pitch-head">
            <span>
              ${esc(
                team.name
              )}
            </span>

            <span class="bfmd-formation">
              ${esc(
                lineup.formation
              )}
            </span>
          </div>

          <div
            class="bfmd-pitch"
          >

            <div class="bfmd-border"></div>
            <div class="bfmd-half"></div>
            <div class="bfmd-circle"></div>
            <div class="bfmd-center-dot"></div>
            <div class="bfmd-box-line top"></div>
            <div class="bfmd-box-line bottom"></div>

            <div
              style="
                position:absolute;
                inset:0;
                display:flex;
                align-items:center;
                justify-content:center;
                color:#fff;
                font-size:12px;
                font-weight:900;
                text-align:center;
                padding:20px;
              "
            >
              Composition indisponible
            </div>

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
                  statsMap
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

                <div class="bfmd-rating">
  ⭐ ${
    rating !== null &&
    rating !== undefined &&
    rating !== ""
      ? esc(
          Number(
            rating
          ).toFixed(1)
        )
      : "—"
  }
</div>

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
              team.name
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
     PLAYER ROW
  ========================================================= */

  function renderPlayerRow(
    player,
    statsMap
  ) {
    const stats =
      statsMap.get(
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
    statsMap
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
                      statsMap
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
                      statsMap
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
     EVENTS
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

      case "injury":
        return "🤕";  
        
      default:
        return "📌";
    }
  }

  function eventMinute(
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
            .map(
              event => {

                let playerText =
                  event.name ||
                  "";

                let contentHTML =
                  "";

                /*
                 * SUBSTITUTION:
                 * هنا كنستعملو HTML
                 * مباشرة، بلا ما نهربوه.
                 */
                if (
                  event.kind ===
                  "substitution"
                ) {

                  const outName =
                    event.playerOut ||
                    "Inconnu";

                  const inName =
                    event.playerIn ||
                    "Inconnu";

                  contentHTML = `
                    <span class="bfmd-out">
                      ↓ ${esc(
                        outName
                      )}
                    </span>

                    <span>
                      →
                    </span>

                    <span class="bfmd-in">
                      ↑ ${esc(
                        inName
                      )}
                    </span>
                  `;

                }
                else {

                  if (
                    !playerText
                  ) {
                    playerText =
                      event.type ||
                      event.detail ||
                      "Événement";
                  }

                  contentHTML =
                    esc(
                      playerText
                    );
                }

                const teamName =
                  event.teamName ||
                  (
                    event.teamId &&
                    teams.home.id &&
                    String(
                      event.teamId
                    ) ===
                    String(
                      teams.home.id
                    )
                      ? teams.home.name
                      : ""
                  ) ||
                  (
                    event.teamId &&
                    teams.away.id &&
                    String(
                      event.teamId
                    ) ===
                    String(
                      teams.away.id
                    )
                      ? teams.away.name
                      : ""
                  );

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
                        event.detail &&
                        event.kind !==
                          "substitution" &&
                        norm(
                          event.detail
                        ) !==
                          norm(
                            event.type
                          )
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
    events,
    teams
  ) {
    const list =
      events.filter(
        event =>
          event.kind ===
          "substitution"
      );

    if (!list.length) {
      return "";
    }

    const home =
      [];

    const away =
      [];

    const other =
      [];

    list.forEach(
      event => {

        const side =
          norm(
            event.side
          );

        if (
          side === "home" ||
          side === "host"
        ) {
          home.push(
            event
          );
        }
        else if (
          side === "away" ||
          side === "guest"
        ) {
          away.push(
            event
          );
        }
        else if (
          event.teamId &&
          teams.home.id &&
          String(
            event.teamId
          ) ===
          String(
            teams.home.id
          )
        ) {
          home.push(
            event
          );
        }
        else if (
          event.teamId &&
          teams.away.id &&
          String(
            event.teamId
          ) ===
          String(
            teams.away.id
          )
        ) {
          away.push(
            event
          );
        }
        else {
          other.push(
            event
          );
        }
      }
    );

    function card(
      title,
      items
    ) {
      if (!items.length) {
        return "";
      }

      return `
        <div class="bfmd-sub-card">

          <div class="bfmd-column-title">
            ${esc(title)}
          </div>

          ${items
            .map(
              event => `
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
                        "Inconnu"
                      )}
                    </div>

                    <div class="bfmd-in">
                      ↑ ${esc(
                        event.playerIn ||
                        "Inconnu"
                      )}
                    </div>

                  </div>

                </div>
              `
            )
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
            home
          )}

          ${card(
            teams.away.name,
            away
          )}

          ${
            other.length
              ? card(
                  "Autres",
                  other
                )
              : ""
          }

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

    const substitutions =
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
              ${substitutions}
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
     MAN OF THE MATCH
  ========================================================= */

function manOfTheMatch(
  details,
  lineups = []
) {

  const explicit =
    first(
      details?.player_of_match,
      details?.playerOfMatch,
      details?.man_of_the_match,
      details?.manOfTheMatch,
      details?.mvp,
      details?.best_player
    );

  let name = "";
  let rating = null;
  let photo = "";
  let label =
    "Joueur du match";

  if (
    explicit
  ) {

    name =
      typeof explicit ===
      "string"
        ? explicit
        : first(
            explicit?.name,
            explicit?.player?.name,
            explicit?.player_name,
            ""
          );

    if (
      typeof explicit ===
      "object"
    ) {
      rating =
        getPlayerRating(
          explicit
        );

      photo =
        getPlayerPhoto(
          explicit
        );
    }
  }

  /*
   * FALLBACK:
   * أعلى rating بين اللاعبين
   */
  if (
    !name
  ) {

    let best =
      null;

    lineups.forEach(
      lineup => {

        arr(
          lineup?.xi
        ).forEach(
          player => {

            const r =
              getPlayerRating(
                player
              );

            if (
              r === null
            ) {
              return;
            }

            if (
              !best ||
              r >
                best.rating
            ) {
              best = {
                player,
                rating: r
              };
            }

          }
        );

      }
    );

    if (
      best
    ) {

      name =
        getPlayerName(
          best.player
        );

      rating =
        best.rating;

      photo =
        getPlayerPhoto(
          best.player
        );

      label =
        "Meilleure note";
    }
  }

  if (
    !name
  ) {
    return "";
  }

  return `
    <div class="bfmd-section">

      <div class="bfmd-motm">

        ${
          photo
            ? `
              <img
                src="${esc(
                  photo
                )}"
                alt="${esc(
                  name
                )}"
                style="
                  width:46px;
                  height:46px;
                  object-fit:cover;
                  border-radius:50%;
                "
                loading="lazy"
              >
            `
            : ""
        }

        <span
          class="bfmd-motm-star"
        >
          ⭐
        </span>

        <span>
          ${esc(
            label
          )}
          :
          <strong>
            ${esc(
              name
            )}
          </strong>

          ${
            rating !== null
              ? `
                · ${esc(
                  Number(
                    rating
                  ).toFixed(1)
                )}
              `
              : ""
          }
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
     STATUS
  ========================================================= */

  function getStatus(
    details
  ) {
    return first(
      details?.status_text,
      typeof details?.status ===
        "string"
        ? details.status
        : null,
      details?.fixture?.status?.long,
      details?.fixture?.status?.short,
      "MATCH"
    );
  }

  /* =========================================================
     COMPETITION
  ========================================================= */

  function getCompetition(
    details
  ) {
    return first(
      details?.league?.name,
      details?.competition?.name,
      typeof details?.competition ===
        "string"
        ? details.competition
        : null,
      "Football"
    );
  }

  /* =========================================================
     OPEN BY IDENTIFIER
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

   const value =
  String(identifier || "").trim();

let detailsUrl =
  `${DETAILS_API}${encodeURIComponent(value)}`;

const lowIdentifier =
  value.toLowerCase();

if (
  lowIdentifier.startsWith("sofa-")
) {
  detailsUrl +=
    "&source=sofascore";
}

else if (
  lowIdentifier.startsWith("espn-")
) {
  detailsUrl +=
    "&source=espn";
}

else if (
  lowIdentifier.startsWith("tsdb-")
) {
  detailsUrl +=
    "&source=thesportsdb";
}

const response =
  await fetch(
    detailsUrl,
    {
      cache: "no-store",
      headers: {
        Accept:
          "application/json"
      }
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
          "Réponse JSON invalide"
        );
      }

      console.log(
        "BAKHIRAFOOT DETAILS JSON:",
        payload
      );

      let details =
        payload?.data ||
        payload?.match ||
        payload;

      /*
       * بعض responses عندها:
       * data.match
       */
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

      /* =====================================================
         DATA
      ===================================================== */

      const teams =
        getTeams(
          details
        );

      const score =
        getScore(
          details
        );

      const status =
        getStatus(
          details
        );

      const competition =
        getCompetition(
          details
        );

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
        buildLineup(
          details,
          "home",
          teams.home
        );

      const awayLineup =
        buildLineup(
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

      const statsMap =
        eventStatsMap(
          events
        );

      console.log(
        "BAKHIRAFOOT HOME LINEUP:",
        homeLineup
      );

      console.log(
        "BAKHIRAFOOT AWAY LINEUP:",
        awayLineup
      );

      console.log(
        "BAKHIRAFOOT EVENTS:",
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
              statsMap
            )}

            ${renderPitch(
              awayLineup,
              "away",
              statsMap
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
              statsMap
            )}

            ${renderPlayerColumn(
              awayLineup,
              statsMap
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

     ${manOfTheMatch(
  details,
  [
    homeLineup,
    awayLineup
  ]
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
     GET IDENTIFIER FROM CARD
  ========================================================= */

  function getCardIdentifier(
    card
  ) {
    return first(
      card?.dataset?.fixtureId,
      card?.dataset?.matchSlug,
      card?.dataset?.slug,
      card?.dataset?.fixture,
      null
    );
  }

  /* =========================================================
     MATCH DETAILS GLOBAL CONTROL
  ========================================================= */

  window.bfOpenMatchDetails = openDetails;

  /*
     كنخليو SportScore القديم خدام كيف ما هو.
     غير الماتشات الجداد غادي نعترضو عليهم.
  */

  function getNewMatchIdentifier(index, card) {

    let match = null;

    try {
      if (
        typeof currentMatches !== "undefined" &&
        Array.isArray(currentMatches)
      ) {
        match = currentMatches[index] || null;
      }
    } catch {
      match = null;
    }

    if (!match) {
      return null;
    }

    const provider =
      String(
        match?.provider ||
        match?.score?.provider ||
        ""
      )
        .trim()
        .toLowerCase();

    const rawId =
      String(
        match?.fixture?.upstreamId ||
        match?.upstreamId ||
        match?.fixture?.id ||
        match?.id ||
        card?.dataset?.fixtureId ||
        ""
      ).trim();

    if (!rawId) {
      return null;
    }

    /* =========================
       SOFASCORE
    ========================= */

    if (
      provider === "sofascore" ||
      provider === "sofa"
    ) {
      return rawId
        .toLowerCase()
        .startsWith("sofa-")
        ? rawId
        : `sofa-${rawId}`;
    }

    /* =========================
       ESPN
    ========================= */

    if (
      provider === "espn"
    ) {
      return rawId
        .toLowerCase()
        .startsWith("espn-")
        ? rawId
        : `espn-${rawId}`;
    }

    /* =========================
       THESPORTSDB
    ========================= */

    if (
      provider === "thesportsdb" ||
      provider === "tsdb"
    ) {
      return rawId
        .toLowerCase()
        .startsWith("tsdb-")
        ? rawId
        : `tsdb-${rawId}`;
    }

    /* SportScore القديم */
    return null;
  }
/* =========================================================
   GLOBAL DETAILS ACCESS
========================================================= */

window.bfOpenMatchDetails = openDetails;


  /* =========================================================
     CLOSE IIFE
  ========================================================= */

})();
