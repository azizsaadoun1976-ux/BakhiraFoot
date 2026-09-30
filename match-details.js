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
          0 4px 11px rgba(0,0,0,.30);
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

  const p =
    player?.player &&
    typeof player.player ===
      "object"
      ? player.player
      : player;

  return first(

    p?.number,

    p?.shirt_number,

    p?.shirtNumber,

    p?.jersey,

    p?.jersey_number,

    p?.jerseyNumber,

    player?.number,

    player?.shirt_number,

    player?.shirtNumber,

    "-"

  );
}


function getPlayerPosition(
  player
) {

  const p =
    player?.player &&
    typeof player.player ===
      "object"
      ? player.player
      : player;

  return first(

    p?.position,

    p?.pos,

    p?.role,

    player?.position,

    player?.pos,

    ""
  );
}


function getPlayerPhoto(
  player
) {

  const p =
    player?.player &&
    typeof player.player ===
      "object"
      ? player.player
      : player;

  return first(

    p?.photo,

    p?.logo,

    p?.picture,

    p?.image,

    p?.avatar,

    player?.photo,

    player?.logo,

    player?.picture,

    player?.image,

    player?.avatar,

    ""
  );
}


function getPlayerRating(
  player
) {

  return first(

    player?.rating,

    player?.performance?.rating,

    player?.statistics?.rating,

    player?.games?.rating,

    player?.player?.rating,

    null
  );
}

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

  const raw =
    details?.lineups ||
    details?.lineup ||
    details?.compositions ||
    details?.formations ||
    null;

  let source = null;

  /*
   * =====================================================
   * 1) ARRAY
   *
   * api/index.js الحالي كيرجع:
   *
   * [
   *   {
   *     team: home,
   *     formation: "...",
   *     startXI: [...]
   *   },
   *
   *   {
   *     team: away,
   *     formation: "...",
   *     startXI: [...]
   *   }
   * ]
   *
   * لذلك نستعمل index مباشرة.
   * =====================================================
   */

  if (
    Array.isArray(raw)
  ) {

    const wantedIndex =
      side === "home"
        ? 0
        : 1;

    source =
      raw[wantedIndex] ||
      null;

    /*
     * احتياط إضافي إذا تبدل الترتيب.
     */
    if (
      !source
    ) {

      source =
        raw.find(
          item => {

            const itemTeam =
              item?.team ||
              item?.club ||
              {};

            const id =
              itemTeam?.id ||
              item?.team_id ||
              item?.teamId ||
              null;

            const name =
              itemTeam?.name ||
              item?.team_name ||
              item?.name ||
              "";

            if (
              team?.id &&
              id &&
              String(
                team.id
              ) ===
              String(
                id
              )
            ) {
              return true;
            }

            return (
              name &&
              team?.name &&
              norm(
                name
              ) ===
              norm(
                team.name
              )
            );
          }
        ) || null;
    }
  }

  /*
   * =====================================================
   * 2) OBJECT
   *
   * home / away
   * homeTeam / awayTeam
   * host / guest
   * =====================================================
   */

  else if (
    obj(raw)
  ) {

    source =
      raw?.[side] ||
      raw?.[
        side === "home"
          ? "homeTeam"
          : "awayTeam"
      ] ||
      raw?.[
        side === "home"
          ? "host"
          : "guest"
      ] ||
      null;

    /*
     * direct format:
     *
     * home_xi
     * away_xi
     */

    if (
      !source
    ) {

      const directXI =
        raw?.[
          `${side}_xi`
        ];

      const directSubs =
        raw?.[
          `${side}_subs`
        ];

      const directFormation =
        raw?.[
          `${side}_formation`
        ];

      if (
        Array.isArray(
          directXI
        ) ||
        Array.isArray(
          directSubs
        ) ||
        directFormation
      ) {

        source = {

          team,

          formation:
            directFormation ||
            "—",

          startXI:
            Array.isArray(
              directXI
            )
              ? directXI
              : [],

          substitutes:
            Array.isArray(
              directSubs
            )
              ? directSubs
              : []

        };

      }
    }
  }

  /*
   * =====================================================
   * إذا ما لقيناش source
   * =====================================================
   */

  if (
    !source
  ) {

    return {

      side,

      team,

      formation:
        "—",

      xi: [],

      subs: []

    };
  }

  /*
   * =====================================================
   * FORMATION
   * =====================================================
   */

  const formation =
    normalizeFormation(
      first(
        source?.formation,
        source?.tactics?.formation,
        source?.tacticalFormation,
        details?.[
          `${side}_formation`
        ],
        "—"
      )
    );

  /*
   * =====================================================
   * START XI
   * =====================================================
   */

  let starters =
    first(
      source?.startXI,
      source?.startingXI,
      source?.starting_xi,
      source?.starters,
      source?.startingLineup,
      source?.xi,
      []
    );

  starters =
    Array.isArray(
      starters
    )
      ? starters
      : [];

  /*
   * -----------------------------------------------------
   * إذا source فيه players كاملين
   * وعندهم starter / first
   * -----------------------------------------------------
   */

  if (
    !starters.length &&
    Array.isArray(
      source?.players
    )
  ) {

    const players =
      source.players;

    const marked =
      players.filter(
        player => {

          if (
            player?.first !==
              undefined
          ) {
            return (
              player.first === 1 ||
              player.first === true ||
              player.first === "1"
            );
          }

          if (
            player?.starter !==
              undefined
          ) {
            return (
              player.starter === true
            );
          }

          if (
            player?.substitute !==
              undefined
          ) {
            return (
              player.substitute !== true
            );
          }

          return false;
        }
      );

    if (
      marked.length
    ) {
      starters =
        marked;
    }
    else {
      starters =
        players.slice(
          0,
          11
        );
    }
  }

  /*
   * =====================================================
   * SUBSTITUTES
   * =====================================================
   */

  let substitutes =
    first(
      source?.substitutes,
      source?.subs,
      source?.bench,
      source?.backup,
      []
    );

  substitutes =
    Array.isArray(
      substitutes
    )
      ? substitutes
      : [];

  /*
   * إذا players فيها first=0
   * نستعملوهم كـbench.
   */

  if (
    !substitutes.length &&
    Array.isArray(
      source?.players
    )
  ) {

    substitutes =
      source.players.filter(
        player =>
          player?.first === 0 ||
          player?.first === false ||
          player?.first === "0" ||
          player?.substitute === true ||
          player?.starter === false
      );

  }

  /*
   * =====================================================
   * نضمنو 11 starters فقط
   * =====================================================
   */

  starters =
    starters
      .slice(
        0,
        11
      );

  /*
   * =====================================================
   * RESULT
   * =====================================================
   */

  return {

    side,

    team,

    formation,

    xi:
      starters,

    subs:
      substitutes

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

function playerCoordinates(
  player
) {

  const p =
    player?.player &&
    typeof player.player ===
      "object"
      ? player.player
      : player;

  const x =
    Number(
      first(
        p?.x,
        player?.x,
        p?.posX,
        player?.posX,
        null
      )
    );

  const y =
    Number(
      first(
        p?.y,
        player?.y,
        p?.posY,
        player?.posY,
        null
      )
    );

  if (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= 0 &&
    x <= 100 &&
    y >= 0 &&
    y <= 100
  ) {

    return {
      x,
      y,
      valid: true
    };
  }

  return {
    x: null,
    y: null,
    valid: false
  };
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
   * =====================================================
   * 1) نستعمل x/y الحقيقية إلا كانت موجودة
   * =====================================================
   */

  const exact =
    players.map(
      player => {

        const p =
          player?.player &&
          typeof player.player ===
            "object"
            ? player.player
            : player;

        const x =
          Number(
            first(
              p?.x,
              player?.x,
              p?.posX,
              player?.posX,
              NaN
            )
          );

        const y =
          Number(
            first(
              p?.y,
              player?.y,
              p?.posY,
              player?.posY,
              NaN
            )
          );

        return {
          player,
          x,
          y,
          valid:
            Number.isFinite(x) &&
            Number.isFinite(y) &&
            x >= 0 &&
            x <= 100 &&
            y >= 0 &&
            y <= 100
        };
      }
    );

  const valid =
    exact.filter(
      item =>
        item.valid
    );

  /*
   * إذا عندنا coordinates حقيقية
   * نستعملوها.
   */

  if (
    valid.length >=
      Math.max(
        5,
        Math.ceil(
          players.length *
          0.6
        )
      )
  ) {

    return exact.map(
      item => {

        if (
          !item.valid
        ) {

          return {
            player:
              item.player,

            x: 50,

            y: side === "home"
              ? 50
              : 50
          };
        }

        return {

          player:
            item.player,

          x:
            Math.max(
              7,
              Math.min(
                93,
                item.x
              )
            ),

          y:
            Math.max(
              7,
              Math.min(
                93,
                side === "away"
                  ? 100 - item.y
                  : item.y
              )
            )
        };
      }
    );
  }

  /*
   * =====================================================
   * 2) FALLBACK حسب position + formation
   * =====================================================
   */

  const formation =
    formationRows(
      lineup?.formation
    );

  const goalkeeper = [];
  const defenders = [];
  const midfielders = [];
  const forwards = [];
  const unknown = [];

  players.forEach(
    player => {

      const type =
        category(
          player
        );

      if (
        type === "gk"
      ) {
        goalkeeper.push(
          player
        );
      }
      else if (
        type === "def"
      ) {
        defenders.push(
          player
        );
      }
      else if (
        type === "mid"
      ) {
        midfielders.push(
          player
        );
      }
      else if (
        type === "fwd"
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

  const rows =
    [];

  /*
   * GK دائما بوحدو
   */

  if (
    goalkeeper.length
  ) {

    rows.push(
      goalkeeper.slice(
        0,
        1
      )
    );

  }
  else {

    const possibleGK =
      players.find(
        player =>
          norm(
            getPlayerPosition(
              player
            )
          ) === "gk"
      );

    rows.push(
      possibleGK
        ? [possibleGK]
        : []
    );

  }

  /*
   * باقي formation
   *
   * 4-3-3
   * → 4 defenders
   * → 3 midfielders
   * → 3 forwards
   *
   * 4-2-3-1
   * → 4 defenders
   * → 2 midfielders
   * → 3 midfielders/attackers
   * → 1 forward
   */

  const pools = [
    defenders,
    midfielders,
    forwards
  ];

  let unknownIndex =
    0;

  formation.forEach(
    (count, index) => {

      let pool =
        pools[index] ||
        [];

      const row =
        pool.slice(
          0,
          count
        );

      /*
       * إلا نقصنا لاعبين
       * نكمّلو من unknown
       */

      while (
        row.length <
          count &&
        unknownIndex <
          unknown.length
      ) {

        row.push(
          unknown[
            unknownIndex++
          ]
        );
      }

      rows.push(
        row
      );

    }
  );

  /*
   * أي لاعب بقى
   * نضيفوه لآخر خط.
   */

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

  /*
   * =====================================================
   * تحويل rows إلى coordinates
   * =====================================================
   */

  const positions =
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
                (
                  80 *
                  (
                    index /
                    (
                      row.length -
                      1
                    )
                  )
                );

          let y =
            8 +
            (
              84 *
              (
                rowIndex /
                Math.max(
                  1,
                  rows.length -
                    1
                )
              )
            );

          if (
            side === "away"
          ) {
            y =
              100 - y;
          }

          positions.push({

            player,

            x:
              Math.max(
                6,
                Math.min(
                  94,
                  x
                )
              ),

            y:
              Math.max(
                6,
                Math.min(
                  94,
                  y
                )
              )

          });

        }
      );

    }
  );

  return positions;
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
function playerHasInjury(
  player
) {

  const p =
    player?.player &&
    typeof player.player ===
      "object"
      ? player.player
      : player;

  const direct =
    first(
      player?.injury,
      player?.injured,
      p?.injury,
      p?.injured,
      null
    );

  if (
    direct
  ) {
    return true;
  }

  const incidents =
    first(
      player?.incidents,
      p?.incidents,
      []
    );

  if (
    Array.isArray(
      incidents
    )
  ) {

    return incidents.some(
      incident => {

        const type =
          norm(
            first(
              incident?.type,
              incident?.event_type,
              incident?.incidentType,
              ""
            )
          );

        const detail =
          norm(
            first(
              incident?.detail,
              incident?.description,
              incident?.reason,
              ""
            )
          );

        return (
          type.includes(
            "injur"
          ) ||
          detail.includes(
            "injur"
          ) ||
          type.includes(
            "hurt"
          ) ||
          detail.includes(
            "hurt"
          )
        );
      }
    );
  }

  return false;
}
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

  if (
    playerHasInjury(
      player
    )
  ) {
    badges.push(
      "🤕"
    );
  }

  return badges.length
    ? `
      <div
        class="bfmd-event-mini"
        title="Événements du joueur"
      >
        ${badges.join("")}
      </div>
    `
    : "";
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

      const response =
        await fetch(
          `${DETAILS_API}${encodeURIComponent(
            identifier
          )}`,
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
     GLOBAL OPEN
     script.js => openMatchDetails(index)
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
        getCardIdentifier(
          card
        );

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
