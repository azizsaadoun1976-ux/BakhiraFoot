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
  let activeDetailsRequest = 0;

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
    repeat(6,1fr);
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
.bfmd-role {
  margin-top: 2px;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(255,255,255,.90);
  color: #111827;
  font-size: 8px;
  line-height: 1;
  font-weight: 950;
  text-align: center;
  box-shadow:
    0 2px 6px rgba(0,0,0,.16);
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
@media(max-width:1000px) {
  .bfmd-summary {
    grid-template-columns:
      repeat(3,1fr);
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

  function normalizeFormation(formation) {
    let value = formation;
    if (value && typeof value === "object") {
      value =
        value?.name ??
        value?.displayName ??
        value?.display_name ??
        value?.label ??
        value?.value ??
        value?.formation ??
        "";
    }

    value = text(value).trim().replace(/[‐‑‒–—−]/g, "-").replace(/\s+/g, "");
    if (/^\d{3,4}$/.test(value)) value = value.split("").join("-");
    const parts = value.split("-").map(Number);
    if (
      parts.length >= 2 &&
      parts.length <= 4 &&
      parts.every(n => Number.isInteger(n) && n >= 1 && n <= 5) &&
      parts.reduce((sum, n) => sum + n, 0) === 10
    ) return value;
    return "—";
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
  if (player.tacticalPosition) return String(player.tacticalPosition);

  const p =
    player?.player &&
    typeof player.player === "object"
      ? {
          ...player.player,
          ...player
        }
      : player;

  const nonNumericRole = value => {
    if (value === null || value === undefined || value === "") return "";
    if (/^\d+$/.test(String(value).trim())) return "";
    return value;
  };
  const sourceValues = [
    /* Original provider tactical position names/abbreviations. */
    player?.raw?.player?.position_name,
    player?.raw?.player?.positionName,
    player?.raw?.player?.position_abbreviation,
    player?.raw?.player?.positionAbbreviation,
    player?.raw?.player?.position_code,
    player?.raw?.player?.positionCode,
    player?.raw?.player?.position,
    player?.raw?.position_name,
    player?.raw?.positionName,
    player?.raw?.position_abbreviation,
    player?.raw?.positionAbbreviation,
    player?.raw?.position_code,
    player?.raw?.positionCode,
    player?.raw?.position,
    player?.raw?.pos,
    player?.raw?.role,
    player?.position_name,
    player?.positionName,
    player?.position_abbreviation,
    player?.positionAbbreviation,
    player?.position_code,
    player?.positionCode,
    player?.player?.position_name,
    player?.player?.positionName,
    player?.player?.position_abbreviation,
    player?.player?.positionAbbreviation,
    player?.player?.position_code,
    player?.player?.positionCode,
    player?.statistics?.position_abbreviation,
    player?.statistics?.positionAbbreviation,
    player?.statistics?.position_code,
    player?.statistics?.positionCode,
    player?.statistics?.positionName,
    player?.statistics?.position,
    player?.position,
    player?.pos,
    player?.role,
    player?.player?.position,
    player?.player?.pos,
    player?.player?.role,
    p?.position_name,
    p?.positionName,
    p?.position_abbreviation,
    p?.positionAbbreviation,
    p?.position_code,
    p?.positionCode,
    p?.position,
    p?.pos,
    p?.role,
    nonNumericRole(player?.formation_position),
    nonNumericRole(player?.formationPosition),
    nonNumericRole(player?.lineup_position),
    nonNumericRole(player?.lineupPosition),
    nonNumericRole(player?.player?.formation_position),
    nonNumericRole(player?.player?.formationPosition),
    nonNumericRole(player?.player?.lineup_position),
    nonNumericRole(player?.player?.lineupPosition),
    nonNumericRole(p?.formation_position),
    nonNumericRole(p?.formationPosition),
    nonNumericRole(p?.lineup_position),
    nonNumericRole(p?.lineupPosition)
  ];

  const labels = [];
  for (const candidate of sourceValues) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    if (typeof candidate === "object") {
      for (const key of [
        "position_name", "positionName",
        "position_abbreviation", "positionAbbreviation",
        "position_code", "positionCode",
        "code", "abbreviation", "shortName", "short_name",
        "displayName", "display_name", "name", "label", "slug"
      ]) {
        const label = candidate[key];
        if (label !== null && label !== undefined && String(label).trim()) {
          labels.push(String(label).trim());
        }
      }
    } else if (!/^\d+$/.test(String(candidate).trim())) {
      labels.push(String(candidate).trim());
    }
  }

  const broadRoles = new Set([
    "d","df","def","defender","defence","defense",
    "m","mf","mid","midfielder","midfield",
    "f","fw","fwd","att","attacker","forward","striker"
  ]);
  let raw =
    labels.find(label => !broadRoles.has(norm(label).replace(/[^a-z0-9]/g, ""))) ||
    labels[0] ||
    "";
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
    "d l": "LB",
    "df l": "LB",

    lcb: "LCB",
    "d lc": "LCB",
    "df lc": "LCB",
    "d c": "CB",
    "df c": "CB",
    "left centre back": "LCB",
    "left center back": "LCB",

    cb: "CB",
    "centre back": "CB",
    "center back": "CB",
    "central defender": "CB",

    rcb: "RCB",
    "right centre back": "RCB",
    "d rc": "RCB",
    "df rc": "RCB",
    "right center back": "RCB",

    rb: "RB",
    "right back": "RB",
    "right fullback": "RB",
    "right full back": "RB",

    rwb: "RWB",
    "right wing back": "RWB",
    "d r": "RB",
    "df r": "RB",

    ldm: "LDM",
    "m l": "LM",
    "mf l": "LM",
    "m lc": "LCM",
    "mf lc": "LCM",
    "m c": "CM",
    "mf c": "CM",
    "m rc": "RCM",
    "mf rc": "RCM",
    "m r": "RM",
    "mf r": "RM",
    dm: "DM",
    cdm: "DM",
    rdm: "RDM",
    "defensive midfielder": "DM",
    "central defensive midfielder": "DM",
    "holding midfielder": "DM",
    "deep lying midfielder": "DM",
    "deep lying playmaker": "DM",
    "left defensive midfielder": "LDM",
    "right defensive midfielder": "RDM",

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
    "attacking midfielder": "AM",
    "central attacking midfielder": "AM",
    "left attacking midfielder": "LAM",
    "right attacking midfielder": "RAM",
    "central midfielder": "CM",
    "left central midfielder": "LCM",
    "right central midfielder": "RCM",
    "left midfielder": "LM",
    "right midfielder": "RM",

    lw: "LW",
    lf: "LF",
    "left wing": "LW",
    "left winger": "LW",

    rw: "RW",
    rf: "RF",
    "right wing": "RW",
    "right winger": "RW",

    st: "ST",
    "f c": "ST",
    "fw c": "ST",
    "f l": "LF",
    "fw l": "LF",
    "f r": "RF",
    "fw r": "RF",
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

function getPlayerRating(player) {
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
      ? {
          ...player.player,
          ...player
        }
      : player;

  const values = [];

  function push(value) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      values.push(value);
    }
  }

  function readStats(value) {
    if (Array.isArray(value)) {
      value.forEach(readStats);
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    push(value.rating);
    push(value.match_rating);
    push(value.matchRating);
    push(value.player_rating);
    push(value.rating_value);
    push(value.ratingValue);
    push(value.score);

    if (value.performance) {
      readStats(value.performance);
    }
  }

  /* مباشر */
  push(player?.rating);
  push(player?.match_rating);
  push(player?.matchRating);
  push(player?.rating_value);
  push(player?.ratingValue);
  push(player?.score);

  /* nested */
  push(p?.rating);
  push(p?.match_rating);
  push(p?.matchRating);
  push(p?.rating_value);
  push(p?.ratingValue);
  push(p?.score);

  /* statistics / performance */
  readStats(player?.statistics);
  readStats(player?.performance);
  readStats(p?.statistics);
  readStats(p?.performance);

  for (const value of values) {
    const raw =
      Number(
        String(value)
          .replace(",", ".")
          .trim()
      );

    if (!Number.isFinite(raw) || raw <= 0) {
      continue;
    }

    /*
     * بعض APIs كتستعمل 82 بدل 8.2
     */
    const rating =
      raw > 10 && raw <= 100
        ? raw / 10
        : raw;

    return rating;
  }

  return null;
}
  /* =========================================================
     BUILD LINEUP
  ========================================================= */
function bfNormalizeTacticalRole(value) {
  if (value && typeof value === "object") {
    const fields = [
      "position_name","positionName","position_abbreviation","positionAbbreviation",
      "position_code","positionCode","displayName","display_name","shortName","short_name",
      "abbreviation","name","label","code","slug","value"
    ];
    for (const key of fields) {
      if (value[key] !== null && value[key] !== undefined && String(value[key]).trim()) {
        const parsed = bfNormalizeTacticalRole(value[key]);
        if (parsed && !["DEF","MID","FWD"].includes(parsed)) return parsed;
      }
    }
    for (const key of fields) {
      if (value[key] !== null && value[key] !== undefined && String(value[key]).trim()) {
        const parsed = bfNormalizeTacticalRole(value[key]);
        if (parsed) return parsed;
      }
    }
    return "";
  }
  const text = String(value ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase();
  const key = text.replace(/[^a-z0-9]/g, "");
  const aliases = {
    g:"GK",gk:"GK",goalkeeper:"GK",goalie:"GK",keeper:"GK","1":"GK",
    lb:"LB",leftback:"LB",leftfullback:"LB",dl:"LB",dfl:"LB",
    lwb:"LWB",leftwingback:"LWB",
    lcb:"LCB",leftcentreback:"LCB",leftcenterback:"LCB",dlc:"LCB",dflc:"LCB",
    cb:"CB",centreback:"CB",centerback:"CB",centraldefender:"CB",dc:"CB",dfc:"CB",
    rcb:"RCB",rightcentreback:"RCB",rightcenterback:"RCB",drc:"RCB",dfrc:"RCB",
    rb:"RB",rightback:"RB",rightfullback:"RB",dr:"RB",dfr:"RB",
    rwb:"RWB",rightwingback:"RWB",
    dm:"CDM",cdm:"CDM",defensivemidfielder:"CDM",centraldefensivemidfielder:"CDM",
    holdingmidfielder:"CDM",deeplyingmidfielder:"CDM",deeplyingplaymaker:"CDM",
    ldm:"LDM",leftdefensivemidfielder:"LDM",
    rdm:"RDM",rightdefensivemidfielder:"RDM",
    cm:"CM",mc:"CM",centralmidfielder:"CM",centralmidfield:"CM",mfc:"CM",
    lcm:"LCM",leftcentralmidfielder:"LCM",mcl:"LCM",mflc:"LCM",
    rcm:"RCM",rightcentralmidfielder:"RCM",mcr:"RCM",mfrc:"RCM",
    lm:"LM",leftmidfielder:"LM",ml:"LM",mfl:"LM",
    rm:"RM",rightmidfielder:"RM",mr:"RM",mfr:"RM",
    am:"CAM",cam:"CAM",attackingmidfielder:"CAM",centralattackingmidfielder:"CAM",
    lam:"LAM",leftattackingmidfielder:"LAM",
    ram:"RAM",rightattackingmidfielder:"RAM",
    lw:"LW",leftwing:"LW",leftwinger:"LW",fl:"LW",fwl:"LW",
    rw:"RW",rightwing:"RW",rightwinger:"RW",fr:"RW",fwr:"RW",
    lf:"LF",leftforward:"LF",rf:"RF",rightforward:"RF",
    st:"ST",striker:"ST",fc:"ST",fwc:"ST",cf:"CF",centreforward:"CF",centerforward:"CF",
    ss:"SS",secondstriker:"SS"
  };
  if (aliases[key]) return aliases[key];
  if (["d","df","def","defender","defence","defense","back"].includes(key) || key.includes("defender")) return "DEF";
  if (["m","mf","mid","midfielder","midfield"].includes(key) || key.includes("midfielder")) return "MID";
  if (["f","fw","fwd","att","attacker","forward"].includes(key) || key.includes("forward")) return "FWD";
  const splitAliases = {
    "d l":"LB","df l":"LB","d lc":"LCB","df lc":"LCB","d c":"CB","df c":"CB",
    "d rc":"RCB","df rc":"RCB","d r":"RB","df r":"RB",
    "m l":"LM","mf l":"LM","m lc":"LCM","mf lc":"LCM","m c":"CM","mf c":"CM",
    "m rc":"RCM","mf rc":"RCM","m r":"RM","mf r":"RM",
    "f l":"LW","fw l":"LW","f c":"ST","fw c":"ST","f r":"RW","fw r":"RW"
  };
  return splitAliases[text] || "";
}

function bfRoleGroup(role) {
  const value = bfNormalizeTacticalRole(role);
  if (value === "GK") return "gk";
  if (["DEF","LB","LCB","CB","RCB","RB","LWB","RWB"].includes(value)) return "def";
  if (["MID","CDM","LDM","RDM","CM","LCM","RCM","CAM","LAM","RAM","LM","RM"].includes(value)) return "mid";
  if (["FWD","LW","RW","LF","RF","ST","CF","SS"].includes(value)) return "fwd";
  return "";
}

function bfFormationRoleRows(formation) {
  let text = String(formation || "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‐‑‒–—−]/g, "-").replace(/\s+/g, "");
  if (/^\d{3,4}$/.test(text)) text = text.split("").join("-");
  const counts = text.split("-").map(Number);
  if (counts.length < 2 || counts.length > 5 ||
      counts.some(n => !Number.isInteger(n) || n < 1 || n > 5) ||
      counts.reduce((sum,n)=>sum+n,0) !== 10) return null;

  const templates = {
    "4-3-3":[["LB","CB","CB","RB"],["CDM","CM","CM"],["LW","ST","RW"]],
    "4-2-3-1":[["LB","CB","CB","RB"],["CDM","CDM"],["LW","CAM","RW"],["ST"]],
    "4-4-2":[["LB","CB","CB","RB"],["LM","CM","CM","RM"],["ST","ST"]],
    "4-1-4-1":[["LB","CB","CB","RB"],["CDM"],["LW","CM","CM","RW"],["ST"]],
    "4-5-1":[["LB","CB","CB","RB"],["LM","CM","CDM","CM","RM"],["ST"]],
    "4-2-2-2":[["LB","CB","CB","RB"],["CDM","CDM"],["CAM","CAM"],["ST","ST"]],
    "4-3-1-2":[["LB","CB","CB","RB"],["CDM","CM","CM"],["CAM"],["ST","ST"]],
    "4-3-2-1":[["LB","CB","CB","RB"],["CDM","CM","CM"],["LAM","RAM"],["ST"]],
    "4-4-1-1":[["LB","CB","CB","RB"],["LM","CM","CM","RM"],["CAM"],["ST"]],
    "3-4-3":[["LCB","CB","RCB"],["LWB","CM","CM","RWB"],["LW","ST","RW"]],
    "3-5-2":[["LCB","CB","RCB"],["LWB","CM","CDM","CM","RWB"],["ST","ST"]],
    "5-3-2":[["LWB","LCB","CB","RCB","RWB"],["CDM","CM","CM"],["ST","ST"]],
    "5-4-1":[["LWB","LCB","CB","RCB","RWB"],["LM","CM","CM","RM"],["ST"]],
    "5-2-3":[["LWB","LCB","CB","RCB","RWB"],["CDM","CM"],["LW","ST","RW"]],
    "3-4-2-1":[["LCB","CB","RCB"],["LWB","CM","CM","RWB"],["LAM","RAM"],["ST"]],
    "4-1-2-1-2":[["LB","CB","CB","RB"],["CDM"],["LCM","RCM"],["CAM"],["ST","ST"]]
  };
  if (templates[text] && templates[text].length===counts.length &&
      templates[text].every((row,i)=>row.length===counts[i])) return templates[text].map(row=>row.slice());

  const backs = counts[0] === 5 ? ["LWB","LCB","CB","RCB","RWB"]
    : counts[0] === 4 ? ["LB","CB","CB","RB"]
    : counts[0] === 3 ? ["LCB","CB","RCB"]
    : counts[0] === 2 ? ["CB","CB"] : ["CB"];
  const nFront = counts[counts.length-1];
  const forwards = nFront === 3 ? ["LW","ST","RW"] : nFront===2 ? ["ST","ST"] : Array.from({length:nFront},()=> "ST");
  const rows = [backs];
  for(let i=1;i<counts.length-1;i++){
    const n=counts[i];
    if(n===5) rows.push(["LM","CM","CDM","CM","RM"]);
    else if(n===4) rows.push(counts.length===3?["LM","CM","CM","RM"]:["LWB","CM","CM","RWB"]);
    else if(n===3) rows.push(["CDM","CM","CM"]);
    else if(n===2) rows.push(i===counts.length-2 && counts.length>=4?["CAM","CAM"]:["CDM","CDM"]);
    else rows.push(["CDM"]);
  }
  rows.push(forwards);
  return rows.every((row,i)=>row.length===counts[i]) ? rows : null;
}

function bfAssignFormationRoles(players, formation, readPosition) {
  if (!Array.isArray(players) || !players.length) return [];
  const shape = bfFormationRoleRows(formation);
  const parsed = players.map((player,index)=>{
    const role = bfNormalizeTacticalRole(readPosition(player));
    return {player,index,role,group:bfRoleGroup(role),generic:["DEF","MID","FWD"].includes(role)||!role,slot:null,assigned:false};
  });
  if (!shape) {
    return parsed.map(item=>({...item.player,tacticalPosition:item.role||item.player?.tacticalPosition||""}));
  }

  const slots=[];
  shape.forEach((row,rowIndex)=>row.forEach((role,col)=>slots.push({role,row:rowIndex+1,col,rowSize:row.length,used:false})));
  const slotFamily=role=>{
    if(["LB","LCB","CB","RCB","RB","LWB","RWB"].includes(role))return "def";
    if(["CDM","LDM","RDM","CM","LCM","RCM","CAM","LAM","RAM","LM","RM"].includes(role))return "mid";
    if(["LW","RW","LF","RF","ST","CF","SS"].includes(role))return "fwd";
    return "";
  };
  const occupy=(entry,slot,label)=>{
    if(!slot)return;
    slot.used=true;entry.slot=slot;entry.assigned=true;entry.finalRole=label||slot.role;
  };

  parsed.filter(item=>item.group==="gk").forEach(item=>{
    item.slot={role:"GK",row:0,col:0,rowSize:1,used:true};
    item.assigned=true;item.finalRole="GK";
  });

  parsed.filter(item=>item.group && !item.generic && item.group!=="gk").forEach(entry=>{
    let options=slots.filter(slot=>!slot.used&&slot.role===entry.role);
    if(!options.length) options=slots.filter(slot=>!slot.used&&slotFamily(slot.role)===entry.group).sort((a,b)=>a.row-b.row||a.col-b.col);
    if(!options.length) options=slots.filter(slot=>!slot.used);
    if(options.length){
      const slot=options[0];
      const label=slot.role===entry.role ? entry.role :
        (entry.role==="CB"&&["LCB","RCB"].includes(slot.role)) ||
        (entry.role==="CM"&&["LCM","RCM"].includes(slot.role)) ||
        (entry.role==="CDM"&&["LDM","RDM"].includes(slot.role)) ||
        (entry.role==="CAM"&&["LAM","RAM"].includes(slot.role)) ? slot.role : entry.role;
      occupy(entry,slot,label);
    }
  });

  const lastRow=shape.length;
  let defPool=slots.filter(slot=>slot.row===1&&!slot.used);
  let midPool=slots.filter(slot=>slot.row>1&&slot.row<lastRow&&!slot.used);
  let frontPool=slots.filter(slot=>slot.row===lastRow&&!slot.used);
  const genericIn=group=>parsed.filter(item=>!item.assigned&&item.group===group);
  const genericDef=genericIn("def"),genericMid=genericIn("mid"),genericFwd=genericIn("fwd");
  const moveFlexible=(from,to,amount,priority)=>{
    for(const role of priority){
      for(let i=from.length-1;i>=0&&amount>0;i--){
        if(from[i].role===role){const slot=from.splice(i,1)[0];to.push(slot);amount--;}
      }
    }
  };
  if(genericFwd.length>frontPool.length) moveFlexible(midPool,frontPool,genericFwd.length-frontPool.length,["LW","RW","LAM","RAM","CAM","SS","CF"]);
  if(genericFwd.length<frontPool.length) moveFlexible(frontPool,midPool,frontPool.length-genericFwd.length,["LW","RW","CF","SS","LAM","RAM","CAM"]);
  const assign=(entries,pool,group)=>{
    entries.forEach(entry=>{
      let slot=pool.shift();
      if(!slot) slot=slots.find(s=>!s.used&&(!group||slotFamily(s.role)===group))||slots.find(s=>!s.used);
      if(slot)occupy(entry,slot,slot.role);
    });
  };
  assign(genericDef,defPool,"def");
  assign(genericMid,midPool,"mid");
  assign(genericFwd,frontPool,"fwd");

  const unknown=parsed.filter(item=>!item.assigned);
  if(players.length===11&&!parsed.some(item=>item.group==="gk")&&unknown.length===1&&slots.filter(slot=>slot.used).length===10){
    const item=unknown[0];item.slot={role:"GK",row:0,col:0,rowSize:1,used:true};item.assigned=true;item.finalRole="GK";
  }
  const remaining=slots.filter(slot=>!slot.used).sort((a,b)=>a.row-b.row||a.col-b.col);
  parsed.filter(item=>!item.assigned).forEach(item=>{const slot=remaining.shift();if(slot)occupy(item,slot,slot.role);});

  return parsed.map(item=>({
    ...item.player,
    tacticalPosition:item.finalRole||item.role||"",
    _tacticRow:item.slot?item.slot.row:null,
    _tacticCol:item.slot?item.slot.col:null,
    _tacticRowSize:item.slot?item.slot.rowSize:0,
    _tacticRowCount:shape.length+1
  }));
}

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
      null
    );

  for (
    const root of roots
  ) {

    const block =
      teamBlock(root);

    /*
     * The SportScore adapter returns lineups as an ARRAY:
     * [{ team, formation, startXI, substitutes }, ...].
     * The previous code only looked at root.home/root.away and therefore
     * found the players but missed the official formation stored beside them.
     */
    const arrayLineupBlock = Array.isArray(root)
      ? root.find(item =>
          teamMatches(item, team) &&
          (
            item?.formation ||
            item?.tactics?.formation ||
            item?.formationUsed ||
            item?.tacticalFormation ||
            item?.formationName ||
            item?.formation_name
          )
        )
      : null;

    formation =
      first(
        formation,
        block?.formation,
        block?.tactics?.formation,
        arrayLineupBlock?.formation,
        arrayLineupBlock?.tactics?.formation,
        arrayLineupBlock?.formationUsed,
        arrayLineupBlock?.tacticalFormation,
        arrayLineupBlock?.formationName,
        arrayLineupBlock?.formation_name,
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

      /*
       * بعض المصادر كترجع lineups كمصفوفة ديال الفريقين:
       * [{ team: {...}, formation, startXI, substitutes }, ...]
       * ما خاصناش نتعاملو مع كل lineup بحال إلا هو لاعب.
       */
      const teamLineupBlock = root.find(item =>
        teamMatches(item, team) &&
        (
          Array.isArray(item?.startXI) ||
          Array.isArray(item?.startingXI) ||
          Array.isArray(item?.starting_xi) ||
          Array.isArray(item?.starters) ||
          Array.isArray(item?.players) ||
          Array.isArray(item?.substitutes) ||
          Array.isArray(item?.subs) ||
          Array.isArray(item?.bench)
        )
      );

      if (teamLineupBlock) {
        extractFromBlock(teamLineupBlock);
        continue;
      }

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
    xi: bfAssignFormationRoles(starters, formation, getPlayerPosition),
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

function pitchPositions(lineup, side) {
  const players = arr(lineup?.xi).slice(0, 11);
  if (!players.length) return [];

  const objectsFor = player => [
    player?.player,
    player,
    player?.raw?.player,
    player?.raw,
    player?.coordinates,
    player?.player?.coordinates,
    player?.position,
    player?.player?.position
  ].filter(value => value && typeof value === "object");

  const readGrid = player => {
    for (const source of objectsFor(player)) {
      const value = source?.grid ?? source?.position_grid ?? source?.positionGrid ?? source?.formation_grid ?? source?.formationGrid;
      if (Array.isArray(value) && value.length >= 2) {
        const row = Number(value[0]), col = Number(value[1]);
        if (Number.isInteger(row) && Number.isInteger(col)) return {row,col};
      }
      if (value && typeof value === "object") {
        const row = Number(value.row ?? value.line ?? value.y);
        const col = Number(value.column ?? value.col ?? value.slot ?? value.x);
        if (Number.isInteger(row) && Number.isInteger(col)) return {row,col};
      }
      if (typeof value === "string") {
        const match = value.trim().match(/^(\d+)\s*[:;,]\s*(\d+)$/);
        if (match) return {row:Number(match[1]),col:Number(match[2])};
      }
    }
    return null;
  };

  const readXY = player => {
    for (const source of objectsFor(player)) {
      const xRaw = source.x ?? source.coord_x ?? source.coordinate_x ?? source.pitch_x ?? source.pitchX;
      const yRaw = source.y ?? source.coord_y ?? source.coordinate_y ?? source.pitch_y ?? source.pitchY;
      if (xRaw === undefined || yRaw === undefined || xRaw === null || yRaw === null || xRaw === "" || yRaw === "") continue;
      const x = Number(xRaw), y = Number(yRaw);
      if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= 120 && y <= 100) {
        return {x,y,oriented:!!source?.coordinatesOriented};
      }
    }
    return null;
  };

  /* Trust real provider pitch coordinates first. */
  const xy = players.map(player => ({player, ... (readXY(player) || {x:null,y:null})}));
  if (xy.length >= 10 && xy.every(item => Number.isFinite(item.x) && Number.isFinite(item.y))) {
    const xs = xy.map(item => item.x), ys = xy.map(item => item.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const normalized = maxX <= 1 && maxY <= 1 && maxX-minX >= 0.2 && maxY-minY >= 0.2;
    const integerGrid = xs.every(v => Number.isInteger(v) && v >= 1 && v <= 11) &&
      ys.every(v => Number.isInteger(v) && v >= 1 && v <= 11) && maxX-minX >= 3 && maxY-minY >= 3;
    const pitchUnits = maxX > 100;
    const percentages = !pitchUnits && maxX > 11 && maxY > 11 && maxX-minX >= 15 && maxY-minY >= 15;
    if (normalized || integerGrid || pitchUnits || percentages) {
      return xy.map(item => {
        let x=item.x, y=item.y;
        if (normalized) { x=8+x*84; y=8+y*84; }
        else if (integerGrid) { x=8+((x-1)/10)*84; y=8+((y-1)/10)*84; }
        else if (pitchUnits) {
          const pitchLength = maxX > 105 ? 120 : 105;
          const pitchWidth = maxY > 68 ? 80 : 68;
          x=8+(x/pitchLength)*84; y=8+(y/pitchWidth)*84;
        }
        if (side === "away" && !item.oriented) y=100-y;
        return {player:item.player,x:Math.max(6,Math.min(94,x)),y:Math.max(6,Math.min(94,y))};
      });
    }
  }

  /* Next, use the provider's grid when it exists for all starters. */
  const grids = players.map(player => ({player, ...(readGrid(player) || {row:null,col:null})}));
  const validGrid = grids.length >= 10 &&
    grids.every(item => Number.isInteger(item.row) && item.row >= 0 &&
      Number.isInteger(item.col) && item.col >= 0 && item.col <= 10) &&
    new Set(grids.map(item => `${item.row}:${item.col}`)).size === grids.length;
  const gridRows = [...new Set(grids.map(item => item.row))].sort((a,b)=>a-b);
  if (validGrid && gridRows.length >= 3 && gridRows.length <= 5) {
    return grids.map(item => {
      const cols = [...new Set(grids.filter(other=>other.row===item.row).map(other=>other.col))].sort((a,b)=>a-b);
      const x = cols.length <= 1 ? 50 : 10 + 80*cols.indexOf(item.col)/(cols.length-1);
      let y = gridRows.length <= 1 ? 50 : 8 + 84*gridRows.indexOf(item.row)/(gridRows.length-1);
      if (side==="away") y=100-y;
      return {player:item.player,x:Math.max(6,Math.min(94,x)),y:Math.max(6,Math.min(94,y))};
    });
  }

  /* Use the coach's formation when the provider omits individual X/Y and grid data. */
  const shapeEntries=players.map(player=>({
    player,row:Number(player?._tacticRow),col:Number(player?._tacticCol),
    rowSize:Number(player?._tacticRowSize),rowCount:Number(player?._tacticRowCount)
  }));
  const shapeUsable=shapeEntries.length===11&&shapeEntries.every(item=>
    Number.isInteger(item.row)&&item.row>=0&&Number.isInteger(item.col)&&item.col>=0&&
    Number.isInteger(item.rowSize)&&item.rowSize>=1&&item.col<item.rowSize&&item.rowCount>=3
  )&&new Set(shapeEntries.map(item=>item.row+":"+item.col)).size===11;
  if(shapeUsable){
    return shapeEntries.map(item=>{
      const x=item.rowSize<=1?50:10+80*item.col/(item.rowSize-1);
      let y=8+84*item.row/item.rowCount;
      if(side==="away")y=100-y;
      return {player:item.player,x:Math.max(6,Math.min(94,x)),y:Math.max(6,Math.min(94,y))};
    });
  }
  return [];
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

function normalizeEvent(event, index) {
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
    norm(rawType);

  const detail =
    norm(rawDetail);

  let kind = "other";

  /*
   * BUT
   */
  if (
    type.includes("goal") ||
    type.includes("but") ||
    detail.includes("goal") ||
    detail.includes("but") ||
    detail === "goal" ||
    obj(event?.goal)
  ) {
    kind = "goal";
  }

  /*
   * CARTON ROUGE
   */
  else if (
    type.includes("second yellow") ||
    detail.includes("second yellow") ||
    type.includes("red") ||
    detail.includes("red") ||
    type.includes("rouge") ||
    detail.includes("rouge")
  ) {
    kind = "red";
  }

  /*
   * CARTON JAUNE
   */
  else if (
    type.includes("yellow") ||
    detail.includes("yellow") ||
    type.includes("jaune") ||
    detail.includes("jaune") ||
    type.includes("card") ||
    detail.includes("card") ||
    type.includes("carton") ||
    detail.includes("carton")
  ) {
    kind = "yellow";
  }

  /*
   * CHANGEMENT
   */
  else if (
    type.includes("subst") ||
    type.includes("change") ||
    type.includes("changement") ||
    detail.includes("subst") ||
    detail.includes("change") ||
    detail.includes("changement") ||
    getSubIn(event) ||
    getSubOut(event)
  ) {
    kind = "substitution";
  }

  /*
   * BLESSURE
   */
  else if (
    type.includes("injur") ||
    detail.includes("injur") ||
    type.includes("medical") ||
    detail.includes("medical") ||
    type.includes("bless") ||
    detail.includes("bless") ||
    type.includes("lesion") ||
    detail.includes("lesion")
  ) {
    kind = "injury";
  }

  /*
   * VAR
   */
  else if (
    type.includes("var") ||
    detail.includes("var")
  ) {
    kind = "var";
  }

  const minute =
    first(
      event?.time?.elapsed,
      typeof event?.time === "number"
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
    getEventPlayer(event);

  const assist =
    getEventAssist(event);

  return {
    index,
    raw: event,
    kind,
    type: text(rawType),
    detail: text(rawDetail),
    minute,
    extra,
    name,
    assist,
    playerIn: getSubIn(event),
    playerOut: getSubOut(event),
    teamId: getEventTeamId(event),
    teamName: getEventTeamName(event),
    side: norm(
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

 function eventStatsMap(events) {
  const map = new Map();

  function data(name) {
    const key = playerKey(name);

    if (!key) {
      return null;
    }

    if (!map.has(key)) {
      map.set(key, {
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        injury: 0,
        in: 0,
        out: 0
      });
    }

    return map.get(key);
  }

  events.forEach(event => {

    /*
     * GOAL
     */
    if (event.kind === "goal") {
      const scorer =
        data(event.name);

      if (scorer) {
        scorer.goals++;
      }

      /*
       * ASSIST
       */
      if (event.assist) {
        const assist =
          data(event.assist);

        if (assist) {
          assist.assists++;
        }
      }
    }

    /*
     * YELLOW
     */
    if (event.kind === "yellow") {
      const player =
        data(event.name);

      if (player) {
        player.yellow++;
      }
    }

    /*
     * RED
     */
    if (event.kind === "red") {
      const player =
        data(event.name);

      if (player) {
        player.red++;
      }
    }

    /*
     * INJURY
     */
    if (event.kind === "injury") {
      const player =
        data(event.name);

      if (player) {
        player.injury++;
      }
    }

    /*
     * SUBSTITUTION
     */
    if (event.kind === "substitution") {

      if (event.playerIn) {
        const player =
          data(event.playerIn);

        if (player) {
          player.in++;
        }
      }

      if (event.playerOut) {
        const player =
          data(event.playerOut);

        if (player) {
          player.out++;
        }
      }
    }

  });

  return map;
}

  /* =========================================================
     PLAYER KEY
     Normalize player objects and event names to the same key.
     This helper is used by pitch badges and player rows.
  ========================================================= */
  function playerKey(player) {
    if (player === null || player === undefined) return "";

    let value = player;

    if (typeof value === "object") {
      const nested = value.player && typeof value.player === "object"
        ? value.player
        : {};
      value = first(
        value.name,
        value.player_name,
        value.playerName,
        value.short_name,
        value.shortName,
        value.full_name,
        value.fullName,
        nested.name,
        nested.player_name,
        nested.playerName,
        nested.short_name,
        nested.full_name,
        value.id,
        value.player_id,
        value.playerId,
        nested.id,
        nested.player_id,
        ""
      );
    }

    return norm(value)
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  /* =========================================================
     PITCH EVENT BADGES
  ========================================================= */

 function playerIsOfficialMvp(player) {
  const sources = [
    player, player?.player, player?.raw, player?.raw?.player,
    player?.statistics, player?.stats
  ].filter(value => value && typeof value === "object");
  return sources.some(source => [
    source.mvp, source.is_mvp, source.isMvp, source.isMVP,
    source.man_of_the_match, source.manOfTheMatch,
    source.player_of_match, source.playerOfMatch,
    source.player_of_the_match, source.playerOfTheMatch,
    source.award, source.awards
  ].some(value => value === true || (
    typeof value === "string" &&
    /^(mvp|man of the match|player of the match|player of the game)$/i.test(value.trim())
  )));
 }

 function playerBadges(player, statsMap) {
  const stats =
    statsMap.get(
      playerKey(player)
    ) || {
      goals: 0,
      assists: 0,
      yellow: 0,
      red: 0,
      injury: 0,
      in: 0,
      out: 0
    };

  const badges = [];

  if (Number(stats.goals) > 0) {
    badges.push(
      `⚽ ${Number(stats.goals)}`
    );
  }

  if (Number(stats.assists) > 0) {
    badges.push(
      `🅰️ ${Number(stats.assists)}`
    );
  }

  if (Number(stats.yellow) > 0) {
    badges.push(
      `🟨 ${Number(stats.yellow)}`
    );
  }

  if (Number(stats.red) > 0) {
    badges.push(
      `🟥 ${Number(stats.red)}`
    );
  }

  if (Number(stats.injury) > 0) {
    badges.push(
      `🤕 ${Number(stats.injury)}`
    );
  }

  if (playerIsOfficialMvp(player)) {
    badges.push("👑 MVP");
  }

  if (Number(stats.in) > 0) {
    badges.push(
      `↗️ ${Number(stats.in)}`
    );
  }

  if (Number(stats.out) > 0) {
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

    if (!positions.length) {
      return `
        <div class="bfmd-pitch-card">
          <div class="bfmd-pitch-head">
            <span>${esc(team.name)}</span>
            <span class="bfmd-formation">${esc(lineup.formation || "—")}</span>
          </div>
          <div class="bfmd-pitch" style="display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;color:#fff;font-weight:850;">
            Formation ou positions tactiques non fournies par la source pour ce match.
          </div>
        </div>
      `;
    }

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

<div class="bfmd-role">
  ${esc(
    getPlayerPosition(
      player
    ) || ""
  )}
</div>

${
  rating !== null &&
  rating !== undefined && rating !== ""
    ? `
      <div class="bfmd-rating">
        ⭐ ${esc(Number(rating).toFixed(1))}
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

 function renderSummary(events) {
  const goals =
    events.filter(
      event =>
        event.kind === "goal"
    ).length;

  const assists =
    events.filter(
      event =>
        event.kind === "goal" &&
        event.assist
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

  const substitutions =
    events.filter(
      event =>
        event.kind === "substitution"
    ).length;

  const injuries =
    events.filter(
      event =>
        event.kind === "injury"
    ).length;

  return `
    <div class="bfmd-section">

      <div class="bfmd-title">
        📊 Résumé du match
      </div>

      <div class="bfmd-summary">

        <div class="bfmd-summary-box">
          <div class="bfmd-summary-value">
            ${goals}
          </div>

          <div class="bfmd-summary-label">
            ⚽ Buts
          </div>
        </div>

        <div class="bfmd-summary-box">
          <div class="bfmd-summary-value">
            ${assists}
          </div>

          <div class="bfmd-summary-label">
            🅰️ Assists
          </div>
        </div>

        <div class="bfmd-summary-box">
          <div class="bfmd-summary-value">
            ${yellow}
          </div>

          <div class="bfmd-summary-label">
            🟨 Cartons jaunes
          </div>
        </div>

        <div class="bfmd-summary-box">
          <div class="bfmd-summary-value">
            ${red}
          </div>

          <div class="bfmd-summary-label">
            🟥 Cartons rouges
          </div>
        </div>

        <div class="bfmd-summary-box">
          <div class="bfmd-summary-value">
            ${substitutions}
          </div>

          <div class="bfmd-summary-label">
            🔄 Remplacements
          </div>
        </div>

        <div class="bfmd-summary-box">
          <div class="bfmd-summary-value">
            ${injuries}
          </div>

          <div class="bfmd-summary-label">
            🤕 Blessures
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
     MATCH STATISTICS — supports SportScore + SofaScore shapes
  ========================================================= */

  function getMatchStatistics(details) {
    const source = first(details?.statistics, details?.stats, null);
    const rows = [];
    const clean = value => value === undefined || value === null || value === "" ? "—" : String(value);
    const add = (label, home, away) => {
      if (!label || (home == null && away == null)) return;
      rows.push({ label: String(label), home: clean(home), away: clean(away) });
    };

    if (Array.isArray(source)) {
      const allBlock = source.find(block => String(block?.period || "").toUpperCase() === "ALL") || source[0];
      if (Array.isArray(allBlock?.groups)) {
        for (const group of allBlock.groups) {
          for (const item of Array.isArray(group?.statisticsItems) ? group.statisticsItems : []) {
            add(item?.name || item?.key || item?.label, item?.home ?? item?.homeValue, item?.away ?? item?.awayValue);
          }
        }
      }
      if (!rows.length && source.length >= 2) {
        const homeBlock = source.find(block => /home|domicile/i.test(String(block?.team?.name || block?.team?.side || ""))) || source[0];
        const awayBlock = source.find(block => /away|extérieur|exterieur/i.test(String(block?.team?.name || block?.team?.side || ""))) || source[1];
        const homeStats = Array.isArray(homeBlock?.statistics) ? homeBlock.statistics : Array.isArray(homeBlock?.stats) ? homeBlock.stats : [];
        const awayStats = Array.isArray(awayBlock?.statistics) ? awayBlock.statistics : Array.isArray(awayBlock?.stats) ? awayBlock.stats : [];
        const byName = new Map();
        for (const item of homeStats) {
          const label = item?.type || item?.name || item?.key;
          if (label) byName.set(String(label), { label: String(label), home: clean(item?.value ?? item?.displayValue ?? item?.total), away: "—" });
        }
        for (const item of awayStats) {
          const label = item?.type || item?.name || item?.key;
          if (!label) continue;
          const key = String(label);
          const current = byName.get(key) || { label: key, home: "—", away: "—" };
          current.away = clean(item?.value ?? item?.displayValue ?? item?.total);
          byName.set(key, current);
        }
        rows.push(...byName.values());
      }
    } else if (source && typeof source === "object") {
      const homeStats = Array.isArray(source.home) ? source.home : Array.isArray(source.home?.statistics) ? source.home.statistics : [];
      const awayStats = Array.isArray(source.away) ? source.away : Array.isArray(source.away?.statistics) ? source.away.statistics : [];
      const byName = new Map();
      for (const item of homeStats) {
        const label = item?.type || item?.name || item?.key;
        if (label) byName.set(String(label), { label: String(label), home: clean(item?.value ?? item?.total), away: "—" });
      }
      for (const item of awayStats) {
        const label = item?.type || item?.name || item?.key;
        if (label) {
          const current = byName.get(String(label)) || { label: String(label), home: "—", away: "—" };
          current.away = clean(item?.value ?? item?.total);
          byName.set(String(label), current);
        }
      }
      rows.push(...byName.values());
    }
    return rows.slice(0, 24);
  }

  function renderMatchStatistics(details) {
    const rows = getMatchStatistics(details);
    const content = rows.length
      ? rows.map(row => '<div class="bfmd-stat-row"><div class="bfmd-stat-values"><strong>' + esc(row.home) + '</strong><span>' + esc(row.label) + '</span><strong>' + esc(row.away) + '</strong></div></div>').join("")
      : '<div class="bfmd-empty">Les statistiques détaillées ne sont pas disponibles pour cette rencontre.</div>';
    return '<div class="bfmd-section bfmd-statistics-section"><div class="bfmd-title">📊 Statistiques du match</div><div class="bfmd-statistics">' + content + '</div></div>';
  }


  function hasOfficialLineupCoordinates(details) {
    const groups = arr(details?.lineups);
    if (groups.length < 2) return false;
    return groups.slice(0, 2).every(group => {
      const starters = arr(group?.startXI || group?.xi || group?.starters);
      if (starters.length !== 11) return false;
      const coordinates = starters.map(player => {
        const value = readPlayerCoordinatesForCheck(player);
        return value;
      });
      if (coordinates.every(Boolean)) {
        const xs = coordinates.map(point => point.x);
        const ys = coordinates.map(point => point.y);
        const spreadX = Math.max(...xs)-Math.min(...xs);
        const spreadY = Math.max(...ys)-Math.min(...ys);
        const normalized = Math.max(...xs) <= 1 && Math.max(...ys) <= 1 &&
          spreadX >= 0.2 && spreadY >= 0.2;
        const integerGrid = xs.every(value => Number.isInteger(value) && value >= 1 && value <= 11) &&
          ys.every(value => Number.isInteger(value) && value >= 1 && value <= 11) &&
          spreadX >= 3 && spreadY >= 3;
        if (normalized || integerGrid || (spreadX >= 10 && spreadY >= 10)) return true;
      }
      const grids = starters.map(player => readPlayerGridForCheck(player));
      if (grids.some(value => !value)) return false;
      const keys = grids.map(value => value.row + ":" + value.col);
      const rows = [...new Set(grids.map(value => value.row))];
      return new Set(keys).size === 11 && rows.length >= 3 && rows.length <= 5;
    });
  }

  function readPlayerCoordinatesForCheck(player) {
    const candidates = [
      player?.player, player,
      player?.raw?.player, player?.raw,
      player?.position, player?.player?.position,
      player?.coordinates, player?.player?.coordinates
    ].filter(value => value && typeof value === "object");
    for (const source of candidates) {
      const xRaw = source.x ?? source.coord_x ?? source.coordinate_x ?? source.pitch_x ?? source.pitchX;
      const yRaw = source.y ?? source.coord_y ?? source.coordinate_y ?? source.pitch_y ?? source.pitchY;
      if (xRaw === null || xRaw === undefined || xRaw === "" ||
          yRaw === null || yRaw === undefined || yRaw === "") continue;
      const x = Number(xRaw), y = Number(yRaw);
      if (Number.isFinite(x) && Number.isFinite(y) &&
          x >= 0 && y >= 0 && x <= 120 && y <= 100) return {x,y};
    }
    return null;
  }

  function readPlayerGridForCheck(player) {
    const candidates = [
      player?.player, player, player?.raw?.player, player?.raw,
      player?.position, player?.player?.position, player?.coordinates
    ].filter(value => value && typeof value === "object");
    for (const source of candidates) {
      const value = source.grid ?? source.position_grid ?? source.positionGrid ??
        source.formation_grid ?? source.formationGrid;
      if (Array.isArray(value) && value.length >= 2) {
        const row = Number(value[0]), col = Number(value[1]);
        if (Number.isInteger(row) && Number.isInteger(col)) return {row,col};
      }
      if (value && typeof value === "object") {
        const row = Number(value.row ?? value.line ?? value.y);
        const col = Number(value.column ?? value.col ?? value.slot ?? value.x);
        if (Number.isInteger(row) && Number.isInteger(col)) return {row,col};
      }
      if (typeof value === "string") {
        const match = value.trim().match(/^(\d+)\s*[:;,.-]\s*(\d+)$/);
        if (match) return {row:Number(match[1]),col:Number(match[2])};
      }
    }
    return null;
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

    const requestId = ++activeDetailsRequest;
    const detailsController = new AbortController();
    const detailsTimeout = setTimeout(() => detailsController.abort(), 18000);

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
      signal: detailsController.signal,
      headers: {
        Accept:
          "application/json"
      }
    }
  );

      
      const rawText =
        await response.text();

      clearTimeout(detailsTimeout);
      if (requestId !== activeDetailsRequest) return;

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

      /* Load this exact fixture's official player layout if this API only returns broad roles. */
      if (!hasOfficialLineupCoordinates(details)) {
        try {
          const baseTeams = getTeams(details);
          const lookupDate = details?.fixture?.date || details?.date ||
            details?.time || "";
          const params = new URLSearchParams({
            fixture: "sofa-fotmob-lookup",
            home: String(baseTeams?.home?.name || ""),
            away: String(baseTeams?.away?.name || ""),
            date: String(lookupDate)
          });
          if (params.get("home") && params.get("away") && params.get("date")) {
            const response = await fetch("/api?" + params.toString(), {
              cache: "no-store",
              signal: detailsController.signal,
              headers: { Accept: "application/json" }
            });
            const payload = await response.json();
            const official = payload?.data || payload?.match || payload;
            if (response.ok && hasOfficialLineupCoordinates(official)) {
              details = { ...details, lineups: official.lineups };
              console.info("BAKHIRAFOOT: loaded exact official lineup coordinates", {
                provider: official?.provider || "FotMob",
                home: baseTeams?.home?.name,
                away: baseTeams?.away?.name
              });
            } else {
              console.warn("BAKHIRAFOOT: no exact external lineup coordinates",
                payload?.details || payload?.error || "No complete lineups");
            }
          }
        } catch (layoutError) {
          if (layoutError?.name !== "AbortError") {
            console.warn("BAKHIRAFOOT: official layout fallback failed", layoutError);
          }
        }
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

        ${renderMatchStatistics(details)}

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

      clearTimeout(detailsTimeout);
      if (requestId !== activeDetailsRequest) return;

      console.error(
        "BAKHIRAFOOT DETAILS ERROR:",
        error
      );

      const errorMessage = error?.name === "AbortError"
        ? "Le serveur met trop de temps à répondre. Réessayez dans quelques instants."
        : (error?.message || "Erreur lors du chargement.");

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
              errorMessage
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
