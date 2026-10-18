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

      /* BakhiraFoot Match Centre premium cards */
      .bfmd-section { margin-top:24px; padding-top:18px; }
      .bfmd-title { font-size:15px; font-weight:950; letter-spacing:.01em; }
      .bfmd-pitches { gap:14px; }
      .bfmd-pitch-card { border-radius:16px; border:1px solid rgba(110,130,155,.24); box-shadow:0 8px 24px rgba(11,28,48,.06); }
      .bfmd-pitch-head { padding:13px 14px; font-size:12px; border-bottom:1px solid rgba(110,130,155,.18); background:rgba(100,116,139,.055); }
      .bfmd-formation { background:#12233a; color:#f8fafc; border:1px solid rgba(255,255,255,.1); letter-spacing:.05em; }
      .bfmd-player { width:100px; gap:3px; }
      .bfmd-photo-wrap { width:38px; height:38px; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,.3); }
      .bfmd-number { right:-6px; bottom:-4px; min-width:18px; height:18px; font-size:9px; }
      .bfmd-number-only { width:34px; height:34px; font-size:11px; border:2px solid #fff; }
      .bfmd-name { max-width:98px; padding:3px 5px; margin-top:4px; border:1px solid rgba(255,255,255,.18); font-size:9px; }
      .bfmd-role { background:#e6edf6; border:1px solid rgba(12,35,59,.1); color:#14263c; font-size:8px; padding:3px 5px; box-shadow:0 2px 8px rgba(0,0,0,.16); }
      .bfmd-rating { background:#fff; color:#11243a; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:950; }
      .bfmd-event-mini { display:flex; flex-wrap:wrap; justify-content:center; gap:3px; margin-top:2px; }
      .bfmd-chip { display:inline-flex; align-items:center; justify-content:center; padding:2px 4px; min-height:14px; border-radius:4px; font-size:7px; line-height:1; font-weight:950; color:#fff; background:#334155; border:1px solid rgba(255,255,255,.13); }
      .bfmd-chip--goal { background:#087f5b; } .bfmd-chip--assist { background:#1d4ed8; }
      .bfmd-chip--yellow { background:#a16207; } .bfmd-chip--red { background:#b91c1c; }
      .bfmd-chip--injury { background:#475569; } .bfmd-chip--mvp { background:#facc15; color:#422006; }
      .bfmd-chip--sub-in { background:#047857; } .bfmd-chip--sub-out { background:#b91c1c; }
      .bfmd-statistics { display:flex; flex-direction:column; gap:8px; }
      .bfmd-stat-row { padding:9px 0; border-bottom:1px solid rgba(100,116,139,.14); }
      .bfmd-stat-values { display:grid; grid-template-columns:45px minmax(0,1fr) 45px; gap:7px; align-items:center; font-size:10px; }
      .bfmd-stat-values strong:first-child { text-align:left; }
      .bfmd-stat-values strong:last-child { text-align:right; }
      .bfmd-stat-values span { text-align:center; opacity:.8; font-weight:750; }
      .bfmd-stat-track { display:flex; gap:3px; height:5px; margin-top:6px; }
      .bfmd-stat-home,.bfmd-stat-away { display:block; height:5px; min-width:3px; border-radius:99px; }
      .bfmd-stat-home { background:linear-gradient(90deg,#1d4ed8,#60a5fa); }
      .bfmd-stat-away { background:linear-gradient(90deg,#fb7185,#e11d48); }
      /* BAKHIRAFOOT PRO BROADCAST MATCH CENTRE */
      #bfMatchDetailsModal { --bfmd-line:rgba(157,181,211,.18); }
      #bfMatchDetailsModal .bfmd-overlay { padding:clamp(8px,2vw,24px); background:rgba(2,8,18,.88); backdrop-filter:blur(12px) saturate(125%); }
      #bfMatchDetailsModal .bfmd-box { width:min(1440px,100%); max-height:96vh; padding:clamp(16px,2.4vw,34px); border:1px solid rgba(148,176,211,.2); border-radius:22px; color:#edf4ff; background:radial-gradient(ellipse at 50% -15%,rgba(24,94,130,.24),transparent 48%),#0b1422; box-shadow:0 36px 120px rgba(0,0,0,.62); }
      #bfMatchDetailsModal .bfmd-close { background:#1c2a3e; border:1px solid var(--bfmd-line); color:#f3f7ff; }
      #bfMatchDetailsModal .bfmd-league { color:#c8d8ee; opacity:1; font-size:11px; letter-spacing:.13em; text-transform:uppercase; }
      #bfMatchDetailsModal .bfmd-header { padding:clamp(20px,3vw,36px); border:1px solid rgba(145,176,211,.2); border-radius:20px; background:linear-gradient(120deg,#162b44,#0c192b 52%,#1b2a41); box-shadow:inset 0 1px rgba(255,255,255,.04),0 18px 42px rgba(0,0,0,.18); }
      #bfMatchDetailsModal .bfmd-team { color:#f3f7ff; gap:12px; font-size:clamp(12px,1.3vw,16px); }
      #bfMatchDetailsModal .bfmd-team img,#bfMatchDetailsModal .bfmd-fallback { width:clamp(54px,7vw,88px); height:clamp(54px,7vw,88px); filter:drop-shadow(0 7px 12px rgba(0,0,0,.25)); }
      #bfMatchDetailsModal .bfmd-score { color:#fff; font-size:clamp(34px,5vw,58px); letter-spacing:.045em; font-variant-numeric:tabular-nums; }
      #bfMatchDetailsModal .bfmd-status { color:#d9e7fa; background:rgba(148,163,184,.14); border:1px solid rgba(148,163,184,.22); letter-spacing:.09em; }
      #bfMatchDetailsModal .bfmd-info span { color:#c6d5e8; background:#132238; border:1px solid var(--bfmd-line); padding:7px 11px; }
      #bfMatchDetailsModal .bfmd-section { margin-top:22px; padding:20px; border:1px solid var(--bfmd-line); border-radius:18px; background:linear-gradient(145deg,rgba(19,34,54,.88),rgba(12,23,38,.92)); }
      #bfMatchDetailsModal .bfmd-title { margin-bottom:17px; color:#f1f6ff; font-size:14px; letter-spacing:.06em; text-transform:uppercase; }
      #bfMatchDetailsModal .bfmd-summary { grid-template-columns:repeat(6,minmax(0,1fr)); gap:10px; }
      #bfMatchDetailsModal .bfmd-summary-box { min-width:0; padding:16px 8px; background:linear-gradient(150deg,#182a42,#111f32); border:1px solid var(--bfmd-line); border-radius:14px; }
      #bfMatchDetailsModal .bfmd-summary-value { color:#f6f9ff; font-size:24px; font-variant-numeric:tabular-nums; }
      #bfMatchDetailsModal .bfmd-summary-label { color:#a8bad1; opacity:1; font-size:9px; line-height:1.4; }
      #bfMatchDetailsModal .bfmd-pitches { gap:12px; }
      #bfMatchDetailsModal .bfmd-pitch-card { border:1px solid rgba(141,173,204,.22); border-radius:16px; background:#0d1a2a; box-shadow:0 12px 30px rgba(0,0,0,.18); }
      #bfMatchDetailsModal .bfmd-pitch-head { min-height:52px; padding:12px 14px; color:#e8f1ff; background:#14253b; border-bottom:1px solid var(--bfmd-line); }
      #bfMatchDetailsModal .bfmd-formation { background:#203750; color:#e7f1ff; border-color:rgba(255,255,255,.12); }
      #bfMatchDetailsModal .bfmd-pitch { aspect-ratio:.72; background:repeating-linear-gradient(0deg,#17663e 0%,#17663e 12.5%,#1b7045 12.5%,#1b7045 25%); }
      #bfMatchDetailsModal .bfmd-border,#bfMatchDetailsModal .bfmd-circle,#bfMatchDetailsModal .bfmd-box-line { background:transparent; border-color:rgba(238,255,246,.82); }
      #bfMatchDetailsModal .bfmd-half { background:rgba(238,255,246,.82); }
      #bfMatchDetailsModal .bfmd-player { width:clamp(58px,7.2vw,100px); }
      #bfMatchDetailsModal .bfmd-photo-wrap { width:clamp(28px,3.2vw,42px); height:clamp(28px,3.2vw,42px); }
      #bfMatchDetailsModal .bfmd-name { max-width:100%; padding:4px 6px; background:rgba(5,13,23,.94); border:1px solid rgba(255,255,255,.18); border-radius:6px; color:#fff; font-size:clamp(7px,.72vw,10px); }
      #bfMatchDetailsModal .bfmd-role { background:#dbeafe; color:#14263c; }
      #bfMatchDetailsModal .bfmd-rating { display:none !important; }
      #bfMatchDetailsModal .bfmd-column-title { color:#e7f0ff; padding-bottom:10px; border-bottom:1px solid var(--bfmd-line); }
      #bfMatchDetailsModal .bfmd-row { grid-template-columns:36px 38px minmax(0,1fr) auto; gap:9px; margin-bottom:6px; padding:10px; border:1px solid rgba(146,172,201,.11); border-radius:12px; background:rgba(29,47,70,.72); }
      #bfMatchDetailsModal .bfmd-player-name { color:#eef5ff; font-size:11px; }
      #bfMatchDetailsModal .bfmd-position { color:#9eb1ca; opacity:1; }
      #bfMatchDetailsModal .bfmd-shirt { background:#263c56; color:#dceaff; }
      #bfMatchDetailsModal .bfmd-badge { background:#293e57; color:#dceaff; border:1px solid rgba(255,255,255,.07); }
      #bfMatchDetailsModal .bfmd-stat-row { padding:12px 0; border-color:var(--bfmd-line); }
      #bfMatchDetailsModal .bfmd-stat-values { grid-template-columns:minmax(30px,55px) minmax(0,1fr) minmax(30px,55px); color:#edf4ff; font-size:11px; }
      #bfMatchDetailsModal .bfmd-stat-values span { color:#b5c5da; opacity:1; font-size:10px; }
      #bfMatchDetailsModal .bfmd-stat-track,#bfMatchDetailsModal .bfmd-stat-home,#bfMatchDetailsModal .bfmd-stat-away { height:7px; }
      #bfMatchDetailsModal .bfmd-event { grid-template-columns:54px 36px minmax(0,1fr); gap:10px; padding:12px 14px; border:1px solid rgba(145,171,199,.12); background:rgba(28,46,68,.68); }
      #bfMatchDetailsModal .bfmd-minute { color:#a9c1dc; font-variant-numeric:tabular-nums; }
      #bfMatchDetailsModal .bfmd-event-player { color:#f2f7ff; }
      #bfMatchDetailsModal .bfmd-event-team,#bfMatchDetailsModal .bfmd-event-detail { color:#a6bad2; opacity:1; }
      #bfMatchDetailsModal .bfmd-event-assist { color:#7ee7bd; opacity:1; }
      #bfMatchDetailsModal .bfmd-sub-card { border:1px solid var(--bfmd-line); background:rgba(28,46,68,.68); }
      #bfMatchDetailsModal .bfmd-sub-line { border-color:var(--bfmd-line); }
      #bfMatchDetailsModal .bfmd-empty { color:#b7c7dc; background:#17283e; opacity:1; border:1px dashed rgba(153,180,210,.24); }
      #bfMatchDetailsModal .bfmd-motm { color:#fff3bf; background:rgba(234,179,8,.1); border:1px solid rgba(234,179,8,.25); }
      @media(max-width:1000px) { #bfMatchDetailsModal .bfmd-summary { grid-template-columns:repeat(3,minmax(0,1fr)); } #bfMatchDetailsModal .bfmd-section { padding:15px; } }
      @media(max-width:650px) { #bfMatchDetailsModal .bfmd-box { padding:18px 10px; border-radius:16px; } #bfMatchDetailsModal .bfmd-header { gap:8px; padding:18px 8px; } #bfMatchDetailsModal .bfmd-team img,#bfMatchDetailsModal .bfmd-fallback { width:44px; height:44px; } #bfMatchDetailsModal .bfmd-section { padding:12px; margin-top:14px; } #bfMatchDetailsModal .bfmd-pitches,#bfMatchDetailsModal .bfmd-players,#bfMatchDetailsModal .bfmd-subs { grid-template-columns:minmax(0,1fr); } #bfMatchDetailsModal .bfmd-pitch { aspect-ratio:.76; } #bfMatchDetailsModal .bfmd-player { width:68px; } #bfMatchDetailsModal .bfmd-photo-wrap { width:28px; height:28px; } #bfMatchDetailsModal .bfmd-name { max-width:66px; font-size:7px; } #bfMatchDetailsModal .bfmd-summary { grid-template-columns:repeat(2,minmax(0,1fr)); } #bfMatchDetailsModal .bfmd-event { grid-template-columns:42px 28px minmax(0,1fr); padding:10px; } }
      .bfmd-motm-badge { display:inline-flex; align-items:center; justify-content:center; margin-right:6px; padding:4px 7px; border-radius:5px; background:#facc15; color:#422006; font-size:9px; line-height:1; font-weight:950; letter-spacing:.04em; }
      .bfmd-summary-box { border:1px solid rgba(100,116,139,.17); border-radius:12px; background:rgba(100,116,139,.055); }
      @media(max-width:650px) {
        .bfmd-player { width:66px; } .bfmd-photo-wrap { width:28px; height:28px; }
        .bfmd-number-only { width:27px; height:27px; font-size:9px; }
        .bfmd-name { max-width:65px; font-size:7px; padding:3px; }
        .bfmd-role { font-size:7px; padding:2px 4px; }
        .bfmd-event-mini { max-width:75px; gap:1px; }
        .bfmd-chip { font-size:6px; padding:2px 3px; }
        .bfmd-stat-values { grid-template-columns:34px minmax(0,1fr) 34px; gap:4px; font-size:9px; }
      }


      /* BAKHIRAFOOT MATCH CENTRE 2.0 */
      #bfMatchDetailsModal .bfmd-box { width:min(1680px,100%); padding:clamp(12px,1.7vw,26px); color:#edf4ff; background:#07111e; border:1px solid rgba(135,164,194,.25); }
      #bfMatchDetailsModal .bfmd-overlay { padding:clamp(6px,1.3vw,18px); }
      #bfMatchDetailsModal .bfmd-header { padding:clamp(18px,2.3vw,34px); background:radial-gradient(ellipse at 50% 0%,rgba(46,104,157,.26),transparent 55%),linear-gradient(110deg,#101f31,#0b1726 50%,#18263b); border:1px solid rgba(155,185,217,.18); }
      #bfMatchDetailsModal .bfmd-status { color:#a7f3d0; background:rgba(16,185,129,.12); border-color:rgba(52,211,153,.22); }
      #bfMatchDetailsModal .bfmd-section { margin-top:14px; padding:clamp(12px,1.35vw,20px); border:1px solid rgba(134,164,197,.16); border-radius:16px; background:linear-gradient(155deg,#0e1a2a,#0b1523); }
      #bfMatchDetailsModal .bfmd-title { display:flex; align-items:center; gap:10px; margin-bottom:14px; color:#f6f9ff; font-size:12px; letter-spacing:.1em; font-weight:950; }
      #bfMatchDetailsModal .bfmd-title::before { content:""; display:block; width:3px; height:16px; border-radius:4px; background:linear-gradient(#5eead4,#38bdf8); }
      #bfMatchDetailsModal .bfmd-summary { grid-template-columns:repeat(8,minmax(0,1fr)); gap:8px; }
      #bfMatchDetailsModal .bfmd-summary-box { min-width:0; min-height:92px; padding:10px 6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:1px solid rgba(147,178,210,.14); border-radius:12px; background:linear-gradient(155deg,#14253a,#0e1b2b); }
      #bfMatchDetailsModal .bfmd-summary-icon { min-height:17px; color:#8ce8d5; font-size:13px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-summary-value { color:#f7fbff; font-size:22px; line-height:1.1; font-weight:950; font-variant-numeric:tabular-nums; }
      #bfMatchDetailsModal .bfmd-summary-label { max-width:100%; color:#9eb4cc; opacity:1; font-size:9px; line-height:1.35; text-align:center; overflow-wrap:anywhere; }
      #bfMatchDetailsModal .bfmd-summary-box--yellow .bfmd-summary-icon { color:#facc15; }
      #bfMatchDetailsModal .bfmd-summary-box--red .bfmd-summary-icon { color:#fb7185; }
      #bfMatchDetailsModal .bfmd-summary-box--own-goals .bfmd-summary-icon { color:#f9a8d4; }
      #bfMatchDetailsModal .bfmd-summary-box--penalties .bfmd-summary-icon { color:#fde68a; }
      #bfMatchDetailsModal .bfmd-match-analysis { padding:clamp(10px,1vw,16px); }
      #bfMatchDetailsModal .bfmd-tactics-layout { display:grid; grid-template-columns:minmax(218px,.78fr) minmax(510px,1.9fr) minmax(218px,.78fr); align-items:stretch; gap:12px; min-width:0; }
      #bfMatchDetailsModal .bfmd-tactics-center { min-width:0; }
      #bfMatchDetailsModal .bfmd-tactics-caption { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; padding:0 2px 10px; color:#91a9c4; font-size:8px; font-weight:900; letter-spacing:.1em; }
      #bfMatchDetailsModal .bfmd-tactics-caption span:first-child { color:#75e4ce; }
      #bfMatchDetailsModal .bfmd-pitches { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); align-items:start; gap:10px; }
      #bfMatchDetailsModal .bfmd-pitch-card { min-width:0; overflow:hidden; border:1px solid rgba(133,167,197,.2); border-radius:14px; background:#0a1725; box-shadow:0 14px 28px rgba(0,0,0,.2); }
      #bfMatchDetailsModal .bfmd-pitch-head { min-height:52px; display:flex; align-items:center; justify-content:space-between; gap:5px; padding:9px 10px; background:#12243a; border-bottom:1px solid rgba(141,172,205,.15); color:#eaf3ff; font-size:10px; }
      #bfMatchDetailsModal .bfmd-pitch-team { min-width:0; display:flex; align-items:center; gap:7px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-pitch-team img { width:25px; height:25px; object-fit:contain; flex:0 0 auto; }
      #bfMatchDetailsModal .bfmd-pitch-team > span:last-child { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
      #bfMatchDetailsModal .bfmd-pitch-team-mark { width:25px; height:25px; display:grid; place-items:center; border-radius:8px; background:#20344b; }
      #bfMatchDetailsModal .bfmd-formation { flex:0 0 auto; padding:5px 7px; color:#c8f9ee; background:#16463f; border:1px solid rgba(94,234,212,.18); font-size:9px; }
      #bfMatchDetailsModal .bfmd-pitch { position:relative; isolation:isolate; width:100%; aspect-ratio:.72; overflow:hidden; background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 8.33%,transparent 8.33% 16.66%),linear-gradient(135deg,#176b43,#0f5a37); }
      #bfMatchDetailsModal .bfmd-border { inset:9px; border:1px solid rgba(240,255,248,.76); }
      #bfMatchDetailsModal .bfmd-half { left:9px; right:9px; height:1px; background:rgba(240,255,248,.76); }
      #bfMatchDetailsModal .bfmd-circle { width:22%; border:1px solid rgba(240,255,248,.76); }
      #bfMatchDetailsModal .bfmd-center-dot { width:5px; height:5px; }
      #bfMatchDetailsModal .bfmd-box-line { left:25%; right:25%; height:16%; border:1px solid rgba(240,255,248,.78); }
      #bfMatchDetailsModal .bfmd-box-line.top { top:9px; border-top:0; }
      #bfMatchDetailsModal .bfmd-box-line.bottom { bottom:9px; border-bottom:0; }
      #bfMatchDetailsModal .bfmd-goal-box { position:absolute; z-index:1; left:39%; width:22%; height:3%; pointer-events:none; border-left:1px solid rgba(255,255,255,.72); border-right:1px solid rgba(255,255,255,.72); }
      #bfMatchDetailsModal .bfmd-goal-box.top { top:0; border-top:0; border-bottom:1px solid rgba(255,255,255,.72); }
      #bfMatchDetailsModal .bfmd-goal-box.bottom { bottom:0; border-top:1px solid rgba(255,255,255,.72); border-bottom:0; }
      #bfMatchDetailsModal .bfmd-penalty-spot { position:absolute; z-index:1; left:calc(50% - 2px); width:4px; height:4px; border-radius:50%; background:rgba(255,255,255,.9); transform:translateX(-50%); }
      #bfMatchDetailsModal .bfmd-penalty-spot.top { top:20%; }
      #bfMatchDetailsModal .bfmd-penalty-spot.bottom { bottom:20%; }
      #bfMatchDetailsModal .bfmd-player { z-index:5; width:clamp(58px,6.3vw,94px); gap:0; transform:translate(-50%,-50%); pointer-events:none; }
      #bfMatchDetailsModal .bfmd-photo-wrap { width:clamp(25px,2.5vw,38px); height:clamp(25px,2.5vw,38px); border:2px solid #d8fff0; box-shadow:0 3px 9px rgba(0,0,0,.5); }
      #bfMatchDetailsModal .bfmd-number-only { width:clamp(25px,2.5vw,38px); height:clamp(25px,2.5vw,38px); color:#061827; background:#d8fff0; border:2px solid #fff; font-size:10px; }
      #bfMatchDetailsModal .bfmd-number { right:-5px; bottom:-4px; min-width:17px; height:17px; padding:0 3px; border:1px solid #0f392c; color:#082017; background:#8cf0cf; font-size:8px; }
      #bfMatchDetailsModal .bfmd-pitch-card[data-side="away"] .bfmd-number-only,#bfMatchDetailsModal .bfmd-pitch-card[data-side="away"] .bfmd-number { color:#fff; background:#f87171; border-color:#7f1d1d; }
      #bfMatchDetailsModal .bfmd-name { width:auto; max-width:100%; margin-top:4px; padding:3px 5px; color:#fff; background:rgba(3,12,20,.94); border:1px solid rgba(255,255,255,.18); border-radius:5px; font-size:clamp(6px,.64vw,9px); line-height:1.1; text-align:center; }
      #bfMatchDetailsModal .bfmd-role { margin-top:2px; padding:2px 4px; border-radius:4px; color:#d9f7ef; background:rgba(2,18,13,.82); font-size:7px; }
      #bfMatchDetailsModal .bfmd-pitch-empty { position:absolute; z-index:8; inset:20px; display:grid; place-items:center; padding:12px; text-align:center; color:#d8e8f8; background:rgba(3,18,29,.72); border:1px dashed rgba(255,255,255,.24); border-radius:10px; font-size:11px; font-weight:850; }
      #bfMatchDetailsModal .bfmd-pitch-foot { display:flex; justify-content:space-between; gap:7px; padding:8px 10px; color:#93abc4; background:#0d1b2a; font-size:8px; font-weight:850; }
      #bfMatchDetailsModal .bfmd-performance-panel { min-width:0; overflow:hidden; display:flex; flex-direction:column; border:1px solid rgba(134,164,197,.2); border-radius:14px; background:linear-gradient(180deg,#102137,#0b1726); }
      #bfMatchDetailsModal .bfmd-performance-head { min-height:67px; display:flex; align-items:center; gap:8px; padding:10px; background:linear-gradient(110deg,rgba(37,76,111,.43),rgba(11,24,39,.6)); border-bottom:1px solid rgba(139,169,201,.16); }
      #bfMatchDetailsModal .bfmd-performance-logo,#bfMatchDetailsModal .bfmd-performance-logo-fallback { flex:0 0 auto; width:34px; height:34px; object-fit:contain; }
      #bfMatchDetailsModal .bfmd-performance-logo-fallback { display:grid; place-items:center; border-radius:9px; background:#20374e; }
      #bfMatchDetailsModal .bfmd-performance-team-name { min-width:0; flex:1; display:flex; flex-direction:column; gap:4px; }
      #bfMatchDetailsModal .bfmd-performance-team-name span { color:#f3f7ff; font-size:10px; font-weight:950; line-height:1.25; overflow-wrap:anywhere; }
      #bfMatchDetailsModal .bfmd-performance-team-name small { color:#8ba4bf; font-size:8px; font-weight:800; }
      #bfMatchDetailsModal .bfmd-team-average { flex:0 0 auto; min-width:38px; display:flex; flex-direction:column; align-items:center; gap:2px; padding:5px 4px; border:1px solid rgba(94,234,212,.2); border-radius:7px; background:rgba(20,83,73,.26); }
      #bfMatchDetailsModal .bfmd-team-average strong { color:#8ff1d8; font-size:14px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-team-average small { color:#9ab8c6; font-size:6px; font-weight:950; letter-spacing:.1em; }
      #bfMatchDetailsModal .bfmd-performance-team-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:4px; padding:8px; border-bottom:1px solid rgba(139,169,201,.13); }
      #bfMatchDetailsModal .bfmd-performance-team-stats > div { display:flex; flex-direction:column; align-items:center; gap:3px; min-width:0; padding:6px 2px; border-radius:7px; background:rgba(143,174,207,.07); }
      #bfMatchDetailsModal .bfmd-performance-team-stats strong { color:#edf6ff; font-size:14px; line-height:1; }
      #bfMatchDetailsModal .bfmd-performance-team-stats span { color:#90a8c3; font-size:7px; }
      #bfMatchDetailsModal .bfmd-performance-list-heading { display:flex; justify-content:space-between; gap:5px; padding:10px 9px 7px; color:#7edecb; font-size:7px; font-weight:950; letter-spacing:.06em; }
      #bfMatchDetailsModal .bfmd-performance-list-heading span:last-child { color:#829bb6; }
      #bfMatchDetailsModal .bfmd-performance-list { max-height:570px; overflow-y:auto; scrollbar-width:thin; display:flex; flex-direction:column; gap:4px; padding:0 7px 8px; }
      #bfMatchDetailsModal .bfmd-performance-player { display:grid; grid-template-columns:31px minmax(0,1fr) 32px; align-items:center; gap:6px; min-width:0; padding:6px 5px; border:1px solid rgba(142,171,202,.09); border-radius:8px; background:rgba(30,49,70,.48); }
      #bfMatchDetailsModal .bfmd-performance-avatar { width:30px; height:30px; overflow:hidden; display:grid; place-items:center; border-radius:8px; background:#1b344c; border:1px solid rgba(150,186,220,.17); }
      #bfMatchDetailsModal .bfmd-performance-photo { display:block; width:100%; height:100%; object-fit:cover; }
      #bfMatchDetailsModal .bfmd-performance-number { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#d9e9f9; font-size:10px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-performance-details { min-width:0; }
      #bfMatchDetailsModal .bfmd-performance-name { color:#eef5ff; font-size:9px; line-height:1.2; font-weight:950; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #bfMatchDetailsModal .bfmd-performance-position { margin-top:2px; color:#819bb7; font-size:7px; line-height:1.2; font-weight:750; }
      #bfMatchDetailsModal .bfmd-performance-tags { display:flex; align-items:center; gap:3px; flex-wrap:wrap; min-height:12px; margin-top:3px; }
      #bfMatchDetailsModal .bfmd-performance-tag { display:inline-flex; align-items:center; padding:2px 3px; border-radius:3px; background:#1a2f43; color:#c9def1; font-size:7px; font-weight:900; line-height:1; }
      #bfMatchDetailsModal .bfmd-performance-tag--goal { color:#a7f3d0; background:rgba(16,185,129,.13); }
      #bfMatchDetailsModal .bfmd-performance-tag--penalty { color:#fde68a; background:rgba(245,158,11,.15); }
      #bfMatchDetailsModal .bfmd-performance-tag--own { color:#f9a8d4; background:rgba(236,72,153,.12); }
      #bfMatchDetailsModal .bfmd-performance-tag--assist { color:#7dd3fc; background:rgba(14,165,233,.13); }
      #bfMatchDetailsModal .bfmd-performance-tag--yellow { color:#fde047; background:rgba(250,204,21,.12); }
      #bfMatchDetailsModal .bfmd-performance-tag--red { color:#fda4af; background:rgba(244,63,94,.13); }
      #bfMatchDetailsModal .bfmd-performance-tag--sub { color:#c4b5fd; background:rgba(139,92,246,.12); }
      #bfMatchDetailsModal .bfmd-performance-no-event { color:#7088a2; font-size:7px; font-weight:700; }
      #bfMatchDetailsModal .bfmd-performance-rating { min-width:30px; text-align:center; padding:5px 2px; border-radius:6px; color:#91a5ba; background:#17283a; font-size:10px; font-weight:950; font-variant-numeric:tabular-nums; }
      #bfMatchDetailsModal .bfmd-grade--high { color:#09291f; background:#78e8bf; }
      #bfMatchDetailsModal .bfmd-grade--good { color:#153328; background:#b8f2d9; }
      #bfMatchDetailsModal .bfmd-grade--low { color:#ffcfb5; background:#59382e; }
      #bfMatchDetailsModal .bfmd-stat-values span { color:#9ab1ca; opacity:1; }
      #bfMatchDetailsModal .bfmd-stat-row { border-color:rgba(139,169,201,.14); }
      #bfMatchDetailsModal .bfmd-event { padding:12px; border:1px solid rgba(139,169,201,.12); border-radius:10px; background:rgba(28,46,68,.56); }
      #bfMatchDetailsModal .bfmd-event-icon { display:flex; justify-content:center; align-items:center; min-width:28px; min-height:28px; border-radius:8px; color:#dcecff; background:#20344a; font-size:10px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-event-icon--goal { color:#9bf5d7; background:rgba(16,185,129,.13); }
      #bfMatchDetailsModal .bfmd-event-icon--penalty { color:#fde68a; background:rgba(245,158,11,.14); }
      #bfMatchDetailsModal .bfmd-event-icon--own { color:#f9a8d4; background:rgba(236,72,153,.14); }
      #bfMatchDetailsModal .bfmd-event-icon--penalty_missed { color:#fecaca; background:rgba(239,68,68,.13); }
      #bfMatchDetailsModal .bfmd-event-icon--yellow { color:#fde047; background:rgba(250,204,21,.14); }
      #bfMatchDetailsModal .bfmd-event-icon--red { color:#fda4af; background:rgba(244,63,94,.14); }
      #bfMatchDetailsModal .bfmd-event-type { display:inline-flex; margin-left:6px; vertical-align:middle; padding:3px 5px; border-radius:4px; font-size:7px; letter-spacing:.04em; font-weight:950; }
      #bfMatchDetailsModal .bfmd-event-type--goal { color:#9bf5d7; background:rgba(16,185,129,.13); }
      #bfMatchDetailsModal .bfmd-event-type--penalty { color:#fde68a; background:rgba(245,158,11,.14); }
      #bfMatchDetailsModal .bfmd-event-type--own { color:#f9a8d4; background:rgba(236,72,153,.14); }
      #bfMatchDetailsModal .bfmd-event-type--missed { color:#fecaca; background:rgba(239,68,68,.14); }
      #bfMatchDetailsModal .bfmd-event-player { color:#f4f8ff; display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
      #bfMatchDetailsModal .bfmd-event-team,#bfMatchDetailsModal .bfmd-event-detail { color:#9bb0c8; opacity:1; }
      #bfMatchDetailsModal .bfmd-event-assist { color:#7de6cc; opacity:1; }
      @media(max-width:1260px) {
        #bfMatchDetailsModal .bfmd-tactics-layout { grid-template-columns:minmax(190px,.72fr) minmax(440px,1.7fr) minmax(190px,.72fr); }
        #bfMatchDetailsModal .bfmd-player { width:64px; }
      }
      @media(max-width:1120px) {
        #bfMatchDetailsModal .bfmd-tactics-layout { grid-template-columns:repeat(2,minmax(0,1fr)); }
        #bfMatchDetailsModal .bfmd-tactics-center { grid-column:1 / -1; grid-row:1; }
        #bfMatchDetailsModal .bfmd-performance-panel--home { grid-column:1; grid-row:2; }
        #bfMatchDetailsModal .bfmd-performance-panel--away { grid-column:2; grid-row:2; }
        #bfMatchDetailsModal .bfmd-pitches { gap:8px; }
      }
      @media(max-width:760px) {
        #bfMatchDetailsModal .bfmd-summary { grid-template-columns:repeat(4,minmax(0,1fr)); }
        #bfMatchDetailsModal .bfmd-summary-box { min-height:78px; padding:8px 4px; }
        #bfMatchDetailsModal .bfmd-summary-value { font-size:19px; }
        #bfMatchDetailsModal .bfmd-tactics-layout { grid-template-columns:minmax(0,1fr); }
        #bfMatchDetailsModal .bfmd-tactics-center { grid-column:1; grid-row:1; }
        #bfMatchDetailsModal .bfmd-performance-panel--home { grid-column:1; grid-row:2; }
        #bfMatchDetailsModal .bfmd-performance-panel--away { grid-column:1; grid-row:3; }
        #bfMatchDetailsModal .bfmd-performance-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
        #bfMatchDetailsModal .bfmd-list-heading { font-size:8px; }
        #bfMatchDetailsModal .bfmd-pitch { aspect-ratio:.79; }
        #bfMatchDetailsModal .bfmd-player { width:70px; }
        #bfMatchDetailsModal .bfmd-name { font-size:7px; }
        #bfMatchDetailsModal .bfmd-performance-list { max-height:none; }
      }
      @media(max-width:470px) {
        #bfMatchDetailsModal .bfmd-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
        #bfMatchDetailsModal .bfmd-pitches { grid-template-columns:minmax(0,1fr); }
        #bfMatchDetailsModal .bfmd-pitch { aspect-ratio:.74; }
        #bfMatchDetailsModal .bfmd-player { width:80px; }
        #bfMatchDetailsModal .bfmd-name { font-size:9px; }
        #bfMatchDetailsModal .bfmd-performance-list { grid-template-columns:minmax(0,1fr); }
        #bfMatchDetailsModal .bfmd-event { grid-template-columns:42px 28px minmax(0,1fr); padding:10px; }
      }


      /* Player performance belongs to each individual player card */
      #bfMatchDetailsModal .bfmd-performance-list { gap:7px; padding:0 8px 10px; }
      #bfMatchDetailsModal .bfmd-performance-player {
        display:grid;
        grid-template-columns:38px minmax(0,1fr) 38px;
        grid-template-rows:auto auto;
        align-items:center;
        gap:4px 8px;
        padding:9px 8px 8px;
        border:1px solid rgba(139,177,211,.2);
        border-left:3px solid rgba(94,234,212,.55);
        border-radius:11px;
        background:linear-gradient(120deg,rgba(30,54,77,.96),rgba(16,31,48,.98));
        box-shadow:0 4px 12px rgba(0,0,0,.12);
      }
      #bfMatchDetailsModal .bfmd-performance-player:hover {
        border-color:rgba(94,234,212,.45);
        background:linear-gradient(120deg,rgba(35,65,91,.98),rgba(19,38,57,.98));
      }
      #bfMatchDetailsModal .bfmd-performance-avatar {
        grid-column:1; grid-row:1 / span 2;
        width:36px; height:36px; border-radius:10px;
        border-color:rgba(179,218,244,.28); background:#203b54;
      }
      #bfMatchDetailsModal .bfmd-performance-details {
        grid-column:2; grid-row:1; align-self:end;
      }
      #bfMatchDetailsModal .bfmd-performance-name { font-size:10px; line-height:1.25; }
      #bfMatchDetailsModal .bfmd-performance-position { font-size:8px; }
      #bfMatchDetailsModal .bfmd-performance-rating {
        grid-column:3; grid-row:1;
        min-width:36px; min-height:32px;
        display:flex; align-items:center; justify-content:center;
        padding:4px; border-radius:8px;
        font-size:12px; border:1px solid rgba(143,174,207,.15);
      }
      #bfMatchDetailsModal .bfmd-performance-tags--inside {
        grid-column:2 / 4; grid-row:2;
        display:flex; align-items:center; flex-wrap:wrap;
        gap:4px; margin:3px 0 0; min-height:17px;
      }
      #bfMatchDetailsModal .bfmd-performance-tag {
        padding:3px 5px; border-radius:5px; font-size:8px;
        border:1px solid rgba(151,181,211,.12);
      }
      #bfMatchDetailsModal .bfmd-performance-no-event {
        display:inline-flex; color:#8da4bd; font-size:8px;
        line-height:1.3; padding:2px 0;
      }
      #bfMatchDetailsModal .bfmd-performance-tag--goal { border-color:rgba(52,211,153,.2); }
      #bfMatchDetailsModal .bfmd-performance-tag--yellow { border-color:rgba(250,204,21,.22); }
      #bfMatchDetailsModal .bfmd-performance-tag--red { border-color:rgba(251,113,133,.23); }
      #bfMatchDetailsModal .bfmd-performance-tag--own { border-color:rgba(244,114,182,.23); }
      #bfMatchDetailsModal .bfmd-performance-tag--penalty { border-color:rgba(251,191,36,.23); }
      #bfMatchDetailsModal .bfmd-performance-tag--assist { border-color:rgba(56,189,248,.23); }
      @media(max-width:1120px) {
        #bfMatchDetailsModal .bfmd-performance-list { display:flex; }
        #bfMatchDetailsModal .bfmd-performance-player { grid-template-columns:38px minmax(0,1fr) 40px; }
      }
      @media(max-width:760px) {
        #bfMatchDetailsModal .bfmd-performance-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
        #bfMatchDetailsModal .bfmd-performance-player { grid-template-columns:34px minmax(0,1fr) 34px; gap:4px 6px; padding:8px 6px; }
        #bfMatchDetailsModal .bfmd-performance-avatar { width:32px; height:32px; }
        #bfMatchDetailsModal .bfmd-performance-name { font-size:9px; }
        #bfMatchDetailsModal .bfmd-performance-rating { min-width:32px; min-height:29px; font-size:10px; }
        #bfMatchDetailsModal .bfmd-performance-tags--inside { gap:3px; }
        #bfMatchDetailsModal .bfmd-performance-tag { font-size:7px; padding:3px 4px; }
      }
      @media(max-width:470px) {
        #bfMatchDetailsModal .bfmd-performance-list { grid-template-columns:minmax(0,1fr); }
      }


      /* Performance now appears below each player, not in the flanking panels. */
      #bfMatchDetailsModal .bfmd-tactics-layout,#bfMatchDetailsModal .bfmd-performance-panel { display:none !important; }
      #bfMatchDetailsModal .bfmd-pitches--performance { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; align-items:start; }
      #bfMatchDetailsModal .bfmd-pitch-card { min-width:0; overflow:hidden; }
      #bfMatchDetailsModal .bfmd-pitch { aspect-ratio:.68; overflow:hidden; }
      #bfMatchDetailsModal .bfmd-player { width:clamp(78px,8.5vw,112px); gap:1px; z-index:6; }
      #bfMatchDetailsModal .bfmd-photo-wrap,#bfMatchDetailsModal .bfmd-number-only { width:clamp(25px,2.4vw,36px); height:clamp(25px,2.4vw,36px); }
      #bfMatchDetailsModal .bfmd-name { max-width:108px; width:100%; margin-top:3px; padding:2px 4px; font-size:clamp(6px,.62vw,8px); line-height:1.1; }
      #bfMatchDetailsModal .bfmd-role { margin-top:1px; padding:1px 3px; font-size:6px; line-height:1.15; }
      #bfMatchDetailsModal .bfmd-event-mini { position:static !important; left:auto !important; top:auto !important; transform:none !important; z-index:auto; display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:2px; width:100%; max-width:112px; min-height:0; margin:2px 0 0; padding:0; background:transparent; border-radius:0; box-shadow:none; overflow:visible; white-space:normal; }
      #bfMatchDetailsModal .bfmd-chip { min-height:13px; padding:2px 3px; border-radius:4px; font-size:6px; line-height:1; letter-spacing:-.01em; text-shadow:none; box-shadow:0 1px 3px rgba(0,0,0,.22); }
      #bfMatchDetailsModal .bfmd-chip--goal { background:#087f5b; color:#ecfff7; }
      #bfMatchDetailsModal .bfmd-chip--assist { background:#1d4ed8; color:#eff6ff; }
      #bfMatchDetailsModal .bfmd-chip--penalty { background:#a16207; color:#fff7d6; }
      #bfMatchDetailsModal .bfmd-chip--own { background:#9d174d; color:#fff1f2; }
      #bfMatchDetailsModal .bfmd-chip--yellow { background:#a16207; color:#fff7d6; }
      #bfMatchDetailsModal .bfmd-chip--red { background:#b91c1c; color:#fff1f2; }
      #bfMatchDetailsModal .bfmd-chip--injury { background:#334155; color:#f1f5f9; }
      #bfMatchDetailsModal .bfmd-chip--mvp { background:#facc15; color:#422006; border-color:#fde68a; }
      #bfMatchDetailsModal .bfmd-chip--sub-in { background:#047857; color:#ecfdf5; }
      #bfMatchDetailsModal .bfmd-chip--sub-out { background:#b91c1c; color:#fff1f2; }
      #bfMatchDetailsModal .bfmd-chip--rating { display:inline-flex; background:#f8fafc; color:#0f172a; border:1px solid #a7f3d0; }
      #bfMatchDetailsModal .bfmd-pitch-bench { padding:0 10px 10px; background:#0b1928; }
      #bfMatchDetailsModal .bfmd-bench-inner { border-top:1px solid rgba(138,169,200,.18); padding-top:8px; }
      #bfMatchDetailsModal .bfmd-bench-heading { margin-bottom:6px; color:#8da9c5; font-size:8px; font-weight:950; letter-spacing:.1em; }
      #bfMatchDetailsModal .bfmd-bench-list { display:flex; flex-wrap:wrap; gap:5px; }
      #bfMatchDetailsModal .bfmd-bench-player { display:flex; align-items:center; flex-wrap:wrap; gap:4px; max-width:100%; padding:4px 6px; border:1px solid rgba(137,168,200,.16); border-radius:7px; background:rgba(29,49,70,.64); color:#e7f0fa; }
      #bfMatchDetailsModal .bfmd-bench-number { display:inline-grid; place-items:center; min-width:18px; height:18px; border-radius:5px; background:#213a53; color:#d9e9f9; font-size:8px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-bench-name { font-size:8px; font-weight:850; }
      #bfMatchDetailsModal .bfmd-bench-role { color:#8ea7c1; font-size:7px; }
      #bfMatchDetailsModal .bfmd-bench-actions .bfmd-event-mini { display:flex !important; width:auto; max-width:none; justify-content:flex-start; margin:0; gap:2px; }
      #bfMatchDetailsModal .bfmd-bench-actions .bfmd-chip { font-size:7px; }
      #bfMatchDetailsModal .bfmd-statistics-section { padding:clamp(14px,1.7vw,22px); }
      #bfMatchDetailsModal .bfmd-stat-highlights { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; margin:3px 0 16px; }
      #bfMatchDetailsModal .bfmd-stat-highlight { min-width:0; padding:12px; border:1px solid rgba(139,169,201,.17); border-radius:12px; background:linear-gradient(145deg,#13263a,#0c1a2a); }
      #bfMatchDetailsModal .bfmd-stat-highlight-label { color:#a5bdd5; font-size:10px; font-weight:850; text-align:center; }
      #bfMatchDetailsModal .bfmd-stat-highlight-values { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:7px; margin:9px 0; }
      #bfMatchDetailsModal .bfmd-stat-highlight-values strong { color:#f4f8ff; font-size:20px; text-align:center; font-weight:950; font-variant-numeric:tabular-nums; }
      #bfMatchDetailsModal .bfmd-stat-highlight-values span { color:#6c849e; font-size:7px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-stat-highlight-track { display:flex; gap:3px; width:100%; height:5px; }
      #bfMatchDetailsModal .bfmd-stat-highlight-track span { display:block; height:5px; min-width:2px; border-radius:99px; }
      #bfMatchDetailsModal .bfmd-stat-highlight-track span:first-child { background:linear-gradient(90deg,#14b8a6,#5eead4); }
      #bfMatchDetailsModal .bfmd-stat-highlight-track span:last-child { background:linear-gradient(90deg,#fb7185,#e11d48); }
      #bfMatchDetailsModal .bfmd-statistics-detail-heading { margin:15px 0 7px; color:#7edecb; font-size:9px; font-weight:950; letter-spacing:.1em; }
      #bfMatchDetailsModal .bfmd-statistics-note { margin-top:12px; color:#7189a3; font-size:8px; text-align:right; }
      #bfMatchDetailsModal .bfmd-statistics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:22px; }
      #bfMatchDetailsModal .bfmd-statistics .bfmd-stat-row { min-width:0; }
      @media(max-width:1120px) {
        #bfMatchDetailsModal .bfmd-pitches--performance { gap:9px; }
        #bfMatchDetailsModal .bfmd-player { width:80px; }
        #bfMatchDetailsModal .bfmd-event-mini { max-width:82px; }
        #bfMatchDetailsModal .bfmd-chip { font-size:6px; padding:2px; }
      }
      @media(max-width:760px) {
        #bfMatchDetailsModal .bfmd-pitches--performance { grid-template-columns:minmax(0,1fr); }
        #bfMatchDetailsModal .bfmd-pitch { aspect-ratio:.78; }
        #bfMatchDetailsModal .bfmd-player { width:clamp(78px,15vw,112px); }
        #bfMatchDetailsModal .bfmd-event-mini { max-width:112px; }
        #bfMatchDetailsModal .bfmd-chip { font-size:7px; padding:2px 3px; }
        #bfMatchDetailsModal .bfmd-stat-highlights { grid-template-columns:repeat(2,minmax(0,1fr)); }
        #bfMatchDetailsModal .bfmd-statistics { grid-template-columns:minmax(0,1fr); }
      }


      /* MATCH CENTRE VECTOR PERFORMANCE ICONS */
      #bfMatchDetailsModal .bfmd-vector-icon { display:inline-block; flex:0 0 auto; width:16px; height:16px; overflow:visible; }
      #bfMatchDetailsModal .bfmd-event-icon .bfmd-vector-icon { width:21px; height:21px; }
      #bfMatchDetailsModal .bfmd-chip { display:inline-flex; align-items:center; justify-content:center; gap:2px; min-width:15px; min-height:16px; padding:2px 3px; border-radius:5px; }
      #bfMatchDetailsModal .bfmd-chip-count { color:inherit; font-size:8px; line-height:1; font-weight:950; font-variant-numeric:tabular-nums; }
      #bfMatchDetailsModal .bfmd-chip--goal { color:#93f4d3; background:rgba(16,185,129,.16); }
      #bfMatchDetailsModal .bfmd-chip--penalty { color:#fcd98a; background:rgba(217,119,6,.22); }
      #bfMatchDetailsModal .bfmd-chip--own { color:#f9a8d4; background:rgba(190,24,93,.23); }
      #bfMatchDetailsModal .bfmd-chip--assist { color:#8bd5ff; background:rgba(29,78,216,.24); }
      #bfMatchDetailsModal .bfmd-chip--yellow { color:#facc15; background:rgba(161,98,7,.24); }
      #bfMatchDetailsModal .bfmd-chip--red { color:#fda4af; background:rgba(185,28,28,.24); }
      #bfMatchDetailsModal .bfmd-chip--injury { color:#d5e7f7; background:rgba(71,85,105,.4); }
      #bfMatchDetailsModal .bfmd-chip--subIn { color:#86efac; background:rgba(4,120,87,.28); }
      #bfMatchDetailsModal .bfmd-chip--subOut { color:#fda4af; background:rgba(185,28,28,.24); }
      #bfMatchDetailsModal .bfmd-chip--rating { color:#facc15; background:rgba(250,204,21,.12); border:1px solid rgba(250,204,21,.22); }
      #bfMatchDetailsModal .bfmd-chip-rating-number { color:#fff4c7; font-size:8px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-chip--mvp { color:#facc15; background:rgba(250,204,21,.15); border:1px solid rgba(250,204,21,.3); }
      #bfMatchDetailsModal .bfmd-event-mini { max-width:112px; display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:2px; }
      #bfMatchDetailsModal .bfmd-pitch-legend { display:flex; align-items:center; justify-content:center; gap:7px; flex-wrap:wrap; padding:12px 4px 0; }
      #bfMatchDetailsModal .bfmd-pitch-legend .bfmd-chip { min-height:22px; padding:4px 6px; gap:5px; border:1px solid rgba(144,174,204,.15); }
      #bfMatchDetailsModal .bfmd-event-type { width:23px; height:23px; display:inline-flex; align-items:center; justify-content:center; padding:2px; margin-left:4px; border-radius:6px; }
      #bfMatchDetailsModal .bfmd-event-type .bfmd-vector-icon { width:16px; height:16px; }
      #bfMatchDetailsModal .bfmd-event-type--goal { color:#93f4d3; background:rgba(16,185,129,.16); }
      #bfMatchDetailsModal .bfmd-event-type--penalty { color:#fcd98a; background:rgba(217,119,6,.22); }
      #bfMatchDetailsModal .bfmd-event-type--own { color:#f9a8d4; background:rgba(190,24,93,.23); }
      #bfMatchDetailsModal .bfmd-event-type--missed { color:#fda4af; background:rgba(185,28,28,.24); }
      #bfMatchDetailsModal .bfmd-statistics-section { padding:clamp(14px,1.7vw,22px); }
      #bfMatchDetailsModal .bfmd-stat-highlights { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; margin:3px 0 16px; }
      #bfMatchDetailsModal .bfmd-stat-highlight { min-width:0; padding:12px; border:1px solid rgba(139,169,201,.17); border-radius:12px; background:linear-gradient(145deg,#13263a,#0c1a2a); }
      #bfMatchDetailsModal .bfmd-stat-highlight-label { color:#a5bdd5; font-size:10px; font-weight:850; text-align:center; }
      #bfMatchDetailsModal .bfmd-stat-highlight-values { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:7px; margin:9px 0; }
      #bfMatchDetailsModal .bfmd-stat-highlight-values strong { color:#f4f8ff; font-size:20px; text-align:center; font-weight:950; font-variant-numeric:tabular-nums; }
      #bfMatchDetailsModal .bfmd-stat-highlight-values span { color:#6c849e; font-size:7px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-stat-highlight-track { display:flex; gap:3px; width:100%; height:5px; }
      #bfMatchDetailsModal .bfmd-stat-highlight-track span { display:block; height:5px; min-width:2px; border-radius:99px; }
      #bfMatchDetailsModal .bfmd-stat-highlight-track span:first-child { background:linear-gradient(90deg,#14b8a6,#5eead4); }
      #bfMatchDetailsModal .bfmd-stat-highlight-track span:last-child { background:linear-gradient(90deg,#fb7185,#e11d48); }
      #bfMatchDetailsModal .bfmd-statistics-detail-heading { margin:15px 0 7px; color:#7edecb; font-size:9px; font-weight:950; letter-spacing:.1em; }
      #bfMatchDetailsModal .bfmd-statistics-note { margin-top:12px; color:#8ca3bc; font-size:9px; text-align:right; }
      #bfMatchDetailsModal .bfmd-statistics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:22px; }
      #bfMatchDetailsModal .bfmd-statistics .bfmd-stat-row { min-width:0; }
      #bfMatchDetailsModal .bfmd-stat-values { color:#edf6ff; }
      #bfMatchDetailsModal .bfmd-stat-values strong { font-variant-numeric:tabular-nums; }
      @media(max-width:760px) {
        #bfMatchDetailsModal .bfmd-stat-highlights { grid-template-columns:repeat(2,minmax(0,1fr)); }
        #bfMatchDetailsModal .bfmd-statistics { grid-template-columns:minmax(0,1fr); }
        #bfMatchDetailsModal .bfmd-event-mini { max-width:112px; }
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
      let y=8+84*item.row/Math.max(1,item.rowCount-1);
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
      event?.goalDescription,
      event?.cardDescription,
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
  const missedPenalty = /(?:missed|saved|miss|wide|failed)\s+(?:penalty|penaltie)|(?:penalty|penaltie)\s+(?:missed|saved|wide|failed)/.test(type + " " + detail);

  if (
    !missedPenalty && (
      type.includes("goal") ||
      type.includes("but") ||
      detail.includes("goal") ||
      detail.includes("but") ||
      detail === "goal" ||
      obj(event?.goal)
    )
  ) {
    kind = "goal";
  }
  else if (missedPenalty) {
    kind = "penalty_missed";
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

  let goalType = "regular";
  if (kind === "goal") {
    const goalDescriptor = norm([
      rawType, rawDetail, event?.incidentType, event?.incidentClass,
      event?.goalType, event?.goal_type, event?.goal?.type,
      event?.goal?.detail, event?.goal?.description
    ].filter(value => value !== null && value !== undefined).join(" ")).replace(/[_-]+/g, " ");
    const ownGoalFlag = [
      event?.own_goal, event?.ownGoal, event?.is_own_goal,
      event?.isOwnGoal, event?.goal?.own_goal, event?.goal?.ownGoal
    ].some(value => value === true || value === 1 || value === "true");
    const penaltyFlag = [
      event?.is_penalty, event?.isPenalty, event?.penalty_goal,
      event?.penaltyGoal, event?.goal?.penalty, event?.goal?.is_penalty,
      event?.goal?.isPenalty,
      event?.penalty,
      event?.isPenalty
    ].some(value => value === true || value === 1 || value === "true");
    if (
      ownGoalFlag ||
      /\bown goal\b|\bauto[- ]?goal\b|\bautogoal\b|\bbut contre son camp\b|\bcontre son camp\b|\bautobut\b|\bcsc\b/.test(goalDescriptor)
    ) {
      goalType = "own";
    } else if (
      penaltyFlag ||
      /\bpenalt(?:y|ies)\b|\bpenalty kick\b|\bpenalty goal\b|\bpenaltie\b|\btir au but\b|\bbut sur penalty\b/.test(goalDescriptor)
    ) {
      goalType = "penalty";
    }
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
    goalType,
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
      if (!key) return null;
      if (!map.has(key)) map.set(key, {
        goals: 0, penalties: 0, ownGoals: 0, assists: 0,
        yellow: 0, red: 0, injury: 0, in: 0, out: 0
      });
      return map.get(key);
    }
    events.forEach(event => {
      if (event.kind === "goal") {
        const scorer = data(event.name);
        if (scorer) {
          if (event.goalType === "own") scorer.ownGoals++;
          else {
            scorer.goals++;
            if (event.goalType === "penalty") scorer.penalties++;
          }
        }
        if (event.assist && event.goalType !== "own" && event.goalType !== "penalty") {
          const assist = data(event.assist);
          if (assist) assist.assists++;
        }
      }
      if (event.kind === "yellow") {
        const player = data(event.name);
        if (player) player.yellow++;
      }
      if (event.kind === "red") {
        const player = data(event.name);
        if (player) player.red++;
      }
      if (event.kind === "injury") {
        const player = data(event.name);
        if (player) player.injury++;
      }
      if (event.kind === "substitution") {
        if (event.playerIn) {
          const player = data(event.playerIn);
          if (player) player.in++;
        }
        if (event.playerOut) {
          const player = data(event.playerOut);
          if (player) player.out++;
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
  const stats = statsMap.get(playerKey(player)) || {
    goals:0, penalties:0, ownGoals:0, assists:0, yellow:0, red:0, injury:0, in:0, out:0
  };
  const badges = [];
  const add = (kind, value, title) => {
    const count = Number(value || 0);
    if (!(count > 0)) return;
    badges.push('<span class="bfmd-chip bfmd-chip--' + kind + '" title="' + esc(title) + '">' +
      performanceIcon(kind) + (count > 1 ? '<span class="bfmd-chip-count">' + count + '</span>' : '') + '</span>');
  };

  const regularGoals = Math.max(0, Number(stats.goals || 0) - Number(stats.penalties || 0));
  add("goal", regularGoals, "But");
  add("penalty", stats.penalties, "But sur penalty");
  add("own", stats.ownGoals, "But contre son camp");
  add("assist", stats.assists, "Passe décisive");
  add("yellow", stats.yellow, "Carton jaune");
  add("red", stats.red, "Carton rouge");
  add("injury", stats.injury, "Blessure signalée");
  add("subIn", stats.in, "Entrée en jeu");
  add("subOut", stats.out, "Sortie du terrain");

  const rating = getPlayerRating(player);
  if (rating !== null && rating !== undefined && rating !== "" && Number.isFinite(Number(rating))) {
    badges.push('<span class="bfmd-chip bfmd-chip--rating" title="Note du joueur">' +
      performanceIcon("rating") + '<span class="bfmd-chip-rating-number">' + Number(rating).toFixed(1) + '</span></span>');
  }
  if (playerIsOfficialMvp(player) || (statsMap.mvpKey && statsMap.mvpKey === playerKey(player))) {
    badges.push('<span class="bfmd-chip bfmd-chip--mvp" title="Joueur du match">' + performanceIcon("mvp") + '</span>');
  }
  if (!badges.length) return "";
  return '<div class="bfmd-event-mini" aria-label="Performance de ' + esc(getPlayerName(player)) + '">' + badges.join("") + '</div>';
}
  /* =========================================================
     RENDER PITCH  /* =========================================================
     RENDER PITCH  /* =========================================================
     RENDER PITCH
  ========================================================= */

  function renderPitch(lineup, side, statsMap) {
    const team = lineup?.team || {};
    const teamHeader = '<div class="bfmd-pitch-head"><div class="bfmd-pitch-team">' +
      (team.logo ? '<img src="' + esc(team.logo) + '" alt="" loading="lazy">' : '<span class="bfmd-pitch-team-mark">⚽</span>') +
      '<span>' + esc(team.name || "Équipe") + '</span></div><span class="bfmd-formation">' + esc(lineup?.formation || "—") + '</span></div>';
    const markings = '<div class="bfmd-border"></div><div class="bfmd-half"></div><div class="bfmd-circle"></div><div class="bfmd-center-dot"></div>' +
      '<div class="bfmd-box-line top"></div><div class="bfmd-box-line bottom"></div><div class="bfmd-goal-box top"></div><div class="bfmd-goal-box bottom"></div>' +
      '<div class="bfmd-penalty-spot top"></div><div class="bfmd-penalty-spot bottom"></div>';
    if (!arr(lineup?.xi).length) {
      return '<div class="bfmd-pitch-card" data-side="' + side + '">' + teamHeader + '<div class="bfmd-pitch">' + markings +
        '<div class="bfmd-pitch-empty">Composition indisponible</div></div><div class="bfmd-pitch-foot">Onze de départ non communiqué</div></div>';
    }
    const positions = pitchPositions(lineup, side);
    if (!positions.length) {
      return '<div class="bfmd-pitch-card" data-side="' + side + '">' + teamHeader + '<div class="bfmd-pitch">' + markings +
        '<div class="bfmd-pitch-empty">Positions tactiques non fournies pour ce match.</div></div><div class="bfmd-pitch-foot">' +
        arr(lineup.xi).length + ' titulaires</div><div class="bfmd-pitch-bench">' + renderBenchPerformance(lineup, statsMap) + '</div></div>';
    }
    const playersHTML = positions.map(item => {
      const player = item.player, name = getPlayerName(player), position = getPlayerPosition(player);
      return '<div class="bfmd-player" style="left:' + item.x + '%;top:' + item.y + '%;" title="' + esc(name) + '">' +
        playerAvatar(player) + '<div class="bfmd-name">' + esc(name) + '</div>' +
        (position ? '<div class="bfmd-role">' + esc(position) + '</div>' : '') + playerBadges(player, statsMap) + '</div>';
    }).join("");
    return '<div class="bfmd-pitch-card" data-side="' + side + '">' + teamHeader +
      '<div class="bfmd-pitch bfmd-pitch--' + side + '">' + markings + playersHTML + '</div>' +
      '<div class="bfmd-pitch-foot"><span>' + esc(team.name || "Équipe") + '</span><span>' + arr(lineup.xi).length + ' titulaires</span></div>' +
      '<div class="bfmd-pitch-bench">' + renderBenchPerformance(lineup, statsMap) + '</div></div>';
  }

  function renderBenchPerformance(lineup, statsMap) {
    const substitutes = arr(lineup?.subs);
    if (!substitutes.length) return "";
    return '<div class="bfmd-bench-inner"><div class="bfmd-bench-heading">BANC & REMPLACEMENTS</div><div class="bfmd-bench-list">' +
      substitutes.map(player => {
        const name = getPlayerName(player) || "Remplaçant", pos = getPlayerPosition(player);
        return '<div class="bfmd-bench-player"><span class="bfmd-bench-number">' + esc(getPlayerNumber(player)) + '</span>' +
          '<span class="bfmd-bench-name" title="' + esc(name) + '">' + esc(name) + '</span>' +
          (pos ? '<span class="bfmd-bench-role">' + esc(pos) + '</span>' : '') +
          '<span class="bfmd-bench-actions">' + playerBadges(player, statsMap) + '</span></div>';
      }).join("") + '</div></div>';
  }

  /* =========================================================
     PLAYER ROW  /* =========================================================
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
                   ${esc(
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
                   ${stats.goals}
                </span>
              `
              : ""
          }

          ${
            stats.assists
              ? `
                <span class="bfmd-badge">
                   ${stats.assists}
                </span>
              `
              : ""
          }

          ${
            stats.yellow
              ? `
                <span class="bfmd-badge">
                   ${stats.yellow}
                </span>
              `
              : ""
          }

          ${
            stats.red
              ? `
                <span class="bfmd-badge">
                   ${stats.red}
                </span>
              `
              : ""
          }

          ${
            stats.in
              ? `
                <span class="bfmd-badge">
                  IN
                </span>
              `
              : ""
          }

          ${
            stats.out
              ? `
                <span class="bfmd-badge">
                  OUT
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

  function renderPerformancePlayer(player, statsMap) {
    const stats = statsMap.get(playerKey(player)) || {
      goals: 0, penalties: 0, ownGoals: 0, assists: 0, yellow: 0, red: 0, in: 0, out: 0
    };
    const name = getPlayerName(player) || "Joueur";
    const photo = getPlayerPhoto(player);
    const number = getPlayerNumber(player);
    const ratingRaw = getPlayerRating(player);
    const ratingNumber = Number(ratingRaw);
    const hasRating = ratingRaw !== null && ratingRaw !== undefined && ratingRaw !== "" && Number.isFinite(ratingNumber);
    const ratingClass = !hasRating ? "" : (ratingNumber >= 8 ? "bfmd-grade--high" : ratingNumber >= 7 ? "bfmd-grade--good" : "bfmd-grade--low");
    const markers = [];
    if (stats.goals) markers.push('<span class="bfmd-performance-tag bfmd-performance-tag--goal" title="Buts">⚽ ' + stats.goals + '</span>');
    if (stats.penalties) markers.push('<span class="bfmd-performance-tag bfmd-performance-tag--penalty" title="Buts sur penalty">PEN ' + stats.penalties + '</span>');
    if (stats.ownGoals) markers.push('<span class="bfmd-performance-tag bfmd-performance-tag--own" title="But contre son camp">CSC ' + stats.ownGoals + '</span>');
    if (stats.assists) markers.push('<span class="bfmd-performance-tag bfmd-performance-tag--assist" title="Passes décisives">A ' + stats.assists + '</span>');
    if (stats.yellow) markers.push('<span class="bfmd-performance-tag bfmd-performance-tag--yellow" title="Cartons jaunes">🟨 ' + stats.yellow + '</span>');
    if (stats.red) markers.push('<span class="bfmd-performance-tag bfmd-performance-tag--red" title="Cartons rouges">🟥 ' + stats.red + '</span>');
    if (stats.in) markers.push('<span class="bfmd-performance-tag bfmd-performance-tag--sub" title="Entrées en jeu">IN</span>');
    if (stats.out) markers.push('<span class="bfmd-performance-tag bfmd-performance-tag--sub" title="Sorties">OUT</span>');
    const avatar = photo
      ? '<img class="bfmd-performance-photo" src="' + esc(photo) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
        '<span class="bfmd-performance-number" style="display:none">' + esc(number) + '</span>'
      : '<span class="bfmd-performance-number">' + esc(number) + '</span>';
    const performanceHTML = markers.length
      ? markers.join("")
      : '<span class="bfmd-performance-no-event">Aucune action individuelle enregistrée</span>';
    return '<article class="bfmd-performance-player" aria-label="Performance de ' + esc(name) + '">' +
      '<div class="bfmd-performance-avatar">' + avatar + '</div>' +
      '<div class="bfmd-performance-details">' +
        '<div class="bfmd-performance-name" title="' + esc(name) + '">' + esc(name) + '</div>' +
        '<div class="bfmd-performance-position">' + esc(getPlayerPosition(player) || "Titulaire") + '</div>' +
      '</div>' +
      '<div class="bfmd-performance-rating ' + ratingClass + '" title="Note du joueur">' + (hasRating ? ratingNumber.toFixed(1) : "—") + '</div>' +
      '<div class="bfmd-performance-tags bfmd-performance-tags--inside">' + performanceHTML + '</div>' +
    '</article>';
  }

  function renderTeamPerformancePanel(lineup, statsMap, side) {
    const team = lineup?.team || {};
    const starters = arr(lineup?.xi);
    const totals = starters.reduce((sum, player) => {
      const stats = statsMap.get(playerKey(player)) || {};
      sum.goals += Number(stats.goals || 0);
      sum.penalties += Number(stats.penalties || 0);
      sum.ownGoals += Number(stats.ownGoals || 0);
      sum.assists += Number(stats.assists || 0);
      sum.yellow += Number(stats.yellow || 0);
      sum.red += Number(stats.red || 0);
      return sum;
    }, { goals: 0, penalties: 0, ownGoals: 0, assists: 0, yellow: 0, red: 0 });
    const ratings = starters.map(player => getPlayerRating(player)).filter(value =>
      value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
    ).map(Number);
    const average = ratings.length ? (ratings.reduce((total, value) => total + value, 0) / ratings.length).toFixed(1) : "—";
    const logo = team.logo
      ? '<img class="bfmd-performance-logo" src="' + esc(team.logo) + '" alt="" loading="lazy">'
      : '<span class="bfmd-performance-logo-fallback">⚽</span>';
    return '<aside class="bfmd-performance-panel bfmd-performance-panel--' + side + '">' +
      '<div class="bfmd-performance-head">' + logo +
        '<div class="bfmd-performance-team-name"><span>' + esc(team.name || "Équipe") + '</span><small>' + esc(lineup?.formation || "Formation inconnue") + '</small></div>' +
        '<div class="bfmd-team-average" title="Moyenne des notes disponibles"><strong>' + average + '</strong><small>NOTE</small></div></div>' +
      '<div class="bfmd-performance-team-stats"><div><strong>' + totals.goals + '</strong><span>Buts</span></div>' +
        '<div><strong>' + totals.assists + '</strong><span>Passes</span></div><div><strong>' + totals.yellow + '</strong><span>Jaunes</span></div>' +
        '<div><strong>' + totals.red + '</strong><span>Rouges</span></div></div>' +
      '<div class="bfmd-performance-list-heading"><span>PERFORMANCES INDIVIDUELLES</span><span>' + starters.length + ' JOUEURS</span></div>' +
      '<div class="bfmd-performance-list">' + (starters.length
        ? starters.map(player => renderPerformancePlayer(player, statsMap)).join("")
        : '<div class="bfmd-empty">Aucun joueur titulaire disponible.</div>') + '</div></aside>';
  }

  /* =========================================================
     EVENTS
  ========================================================= */

  function performanceIcon(kind) {
    const icons = {
      goal: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m12 7-3 2 1 4h4l1-4-3-2ZM9 9 6.8 8.2M16 9l2.2-.8M10 13l-1.7 3.1M14 13l1.7 3.1M9 16.1l3 2 3-2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
      penalty: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="5.2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><path d="M17 5.5 20 3m-3.2.2h3v3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
      own: '<circle cx="10.5" cy="13" r="7.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m10.5 9-2.4 1.7.9 3h3l.9-3-2.4-1.7ZM8 10.7l-1.8-.6m6.3.6 1.8-.6M9 13.7l-1.3 2.2m3.8-2.2 1.3 2.2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M13.8 5.5h6v6m0-6-6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      assist: '<path d="M5 3h5l1.3 6 3 2.2 4.9 2.5-.6 4.4H4v-3.2l3-2.6L5 3Z" fill="currentColor" opacity=".95"/><path d="M4.7 18.1h14M7.5 21v-2.8m4 2.8v-2.8m4 2.8v-2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      yellow: '<rect x="6" y="2.5" width="12" height="19" rx="1.8" fill="currentColor" stroke="currentColor" stroke-width="1.2"/><path d="M8.5 5h7" stroke="#1f2937" stroke-width="1" opacity=".45"/>',
      red: '<rect x="6" y="2.5" width="12" height="19" rx="1.8" fill="currentColor" stroke="currentColor" stroke-width="1.2"/><path d="M8.5 5h7" stroke="#1f2937" stroke-width="1" opacity=".45"/>',
      injury: '<rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 5V3.5h6V5m-3 3.5v7m-3.5-3.5h7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
      subIn: '<path d="M12 20V5m-5 5 5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 20h16" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".7"/>',
      subOut: '<path d="M12 4v15m-5-5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 4h16" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".7"/>',
      substitution: '<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
      mvp: '<path d="M7 4H4v2a5 5 0 0 0 5 5m8-7h3v2a5 5 0 0 1-5 5M7 3h10v5a5 5 0 0 1-10 0V3Zm5 10v4m-4 3h8m-6-3h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="m12 5 .9 1.8 2 .3-1.45 1.4.35 2-1.8-1-1.8 1 .35-2L9.1 7.1l2-.3L12 5Z" fill="currentColor"/>',
      rating: '<path d="m12 2.7 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9L12 2.7Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>',
      var: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15.2 15.2 5.3 5.3M7.5 10.5l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      missed: '<circle cx="10.5" cy="13" r="7.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m10.5 9-2.4 1.7.9 3h3l.9-3-2.4-1.7ZM8 10.7l-1.8-.6m6.3.6 1.8-.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="m15.2 3 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    };
    return '<svg class="bfmd-vector-icon bfmd-vector-icon--' + esc(kind) + '" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
      (icons[kind] || icons.goal) + '</svg>';
  }

  function eventIcon(event) {
    if (event.kind === "goal") return performanceIcon(event.goalType === "own" ? "own" : event.goalType === "penalty" ? "penalty" : "goal");
    switch (event.kind) {
      case "penalty_missed": return performanceIcon("missed");
      case "yellow": return performanceIcon("yellow");
      case "red": return performanceIcon("red");
      case "substitution": return performanceIcon("substitution");
      case "injury": return performanceIcon("injury");
      case "var": return performanceIcon("var");
      default: return performanceIcon("goal");
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

                  if (event.kind === "goal") {
                    const goalLabel = event.goalType === "own"
                      ? '<span class="bfmd-event-type bfmd-event-type--own">BUT CONTRE SON CAMP</span>'
                      : event.goalType === "penalty"
                        ? '<span class="bfmd-event-type bfmd-event-type--penalty">BUT SUR PENALTY</span>'
                        : '<span class="bfmd-event-type bfmd-event-type--goal">BUT</span>';
                    contentHTML = '<span>' + esc(playerText || "Buteur non renseigné") + '</span>' + goalLabel;
                  } else if (event.kind === "penalty_missed") {
                    contentHTML = '<span>' + esc(playerText || "Penalty") + '</span><span class="bfmd-event-type bfmd-event-type--missed">PENALTY MANQUÉ</span>';
                  } else {
                    contentHTML = esc(playerText);
                  }
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

                    <div class="bfmd-event-icon bfmd-event-icon--${event.kind} bfmd-event-icon--${event.kind === "goal" ? event.goalType : "default"}">
                      ${eventIcon(event)}
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
                              Passe décisive :
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
          Remplacements
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
    const count = kind => events.filter(event => event.kind === kind).length;
    const goals = count("goal");
    const penalties = events.filter(event => event.kind === "goal" && event.goalType === "penalty").length;
    const ownGoals = events.filter(event => event.kind === "goal" && event.goalType === "own").length;
    const assists = events.filter(event => event.kind === "goal" && event.assist && event.goalType !== "own" && event.goalType !== "penalty").length;
    const yellow = count("yellow"), red = count("red"), substitutions = count("substitution"), injuries = count("injury");
    const metrics = [
      ["goal", "Buts", goals, "goals"],
      ["penalty", "Buts sur penalty", penalties, "penalties"],
      ["own", "Buts contre son camp", ownGoals, "own-goals"],
      ["assist", "Passes décisives", assists, "assists"],
      ["yellow", "Cartons jaunes", yellow, "yellow"],
      ["red", "Cartons rouges", red, "red"],
      ["substitution", "Remplacements", substitutions, "subs"],
      ["injury", "Blessures signalées", injuries, "injuries"]
    ];
    return '<div class="bfmd-section bfmd-summary-section"><div class="bfmd-title">Résumé de la rencontre</div><div class="bfmd-summary">' +
      metrics.map(([icon, label, value, kind]) =>
        '<div class="bfmd-summary-box bfmd-summary-box--' + kind + '">' +
          '<div class="bfmd-summary-icon">' + performanceIcon(icon) + '</div><div class="bfmd-summary-value">' + value + '</div>' +
          '<div class="bfmd-summary-label">' + esc(label) + '</div></div>'
      ).join("") + '</div></div>';
  }

  /* =========================================================
     MAN OF THE MATCH  /* =========================================================
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

        <span class="bfmd-motm-badge">
          ${esc(label === "Joueur du match" ? "MVP" : "NOTE")}
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
    const rowsByName = new Map();
    const invalid = value => value === null || value === undefined || String(value).trim() === "" ||
      /^[-—–]+$/.test(String(value).trim()) || /^(n\/a|na|not available|undefined|null)$/i.test(String(value).trim());
    const rawValue = value => {
      if (value === null || value === undefined || value === "") return null;
      if (Array.isArray(value)) return value;
      if (typeof value === "object") return first(value?.displayValue, value?.display, value?.value, value?.text, value?.label, null);
      return value;
    };
    const clean = value => invalid(rawValue(value)) ? "—" : String(rawValue(value));
    const add = (labelValue, homeValue, awayValue) => {
      const label = String(labelValue ?? "").trim();
      const h = rawValue(homeValue), a = rawValue(awayValue);
      if (!label || (invalid(h) && invalid(a))) return;
      const key = norm(label);
      if (!key) return;
      const current = rowsByName.get(key) || { label, home: "—", away: "—" };
      if (!invalid(h)) current.home = clean(h);
      if (!invalid(a)) current.away = clean(a);
      rowsByName.set(key, current);
    };
    const labelOf = item => first(item?.name, item?.title, item?.displayName, item?.label, item?.type, item?.key, item?.statName, "");
    const addItem = item => {
      if (!item || typeof item !== "object") return false;
      const label = labelOf(item);
      if (!label) return false;
      let pair = first(item?.values, item?.stats, item?.value, item?.data, null);
      let home = first(item?.home, item?.homeValue, item?.home_value, item?.homeStat, item?.home_value_display, null);
      let away = first(item?.away, item?.awayValue, item?.away_value, item?.awayStat, item?.away_value_display, null);

      const nestedGroup = Array.isArray(pair) && pair.some(value =>
        value && typeof value === "object" && (Array.isArray(value?.stats) || Array.isArray(value?.statisticsItems))
      );
      if (nestedGroup) pair = null;

      if (Array.isArray(pair)) {
        if (home === null) home = pair[0];
        if (away === null) away = pair[1];
      } else if (pair && typeof pair === "object") {
        if (home === null) home = first(pair?.home, pair?.homeValue, pair?.home?.value, null);
        if (away === null) away = first(pair?.away, pair?.awayValue, pair?.away?.value, null);
      }
      if (home !== null || away !== null) {
        add(label, home, away);
        return true;
      }
      return false;
    };
    const processGroups = groups => {
      for (const group of arr(groups)) {
        if (!group || typeof group !== "object") continue;
        const items = group?.statisticsItems || group?.statistics || group?.items || group?.stats;
        if (Array.isArray(items) && items.length) {
          for (const item of items) addItem(item);
        } else {
          addItem(group);
        }
      }
    };
    const processTeamBlocks = blocks => {
      if (!Array.isArray(blocks) || blocks.length < 2) return;
      const homeBlock = blocks.find(block => /home|domicile|host/i.test(String(block?.side || block?.team?.side || ""))) || blocks[0];
      const awayBlock = blocks.find(block => /away|extérieur|exterieur|guest/i.test(String(block?.side || block?.team?.side || ""))) || blocks[1];
      const homeStats = arr(homeBlock?.statistics || homeBlock?.stats || homeBlock?.items);
      const awayStats = arr(awayBlock?.statistics || awayBlock?.stats || awayBlock?.items);
      const byName = new Map();
      for (const item of homeStats) {
        const label = labelOf(item);
        if (!label) continue;
        const key = norm(label);
        const row = byName.get(key) || { label: String(label), home: "—", away: "—" };
        row.home = clean(first(item?.value, item?.displayValue, item?.display, item?.total, item?.statValue, null));
        byName.set(key, row);
      }
      for (const item of awayStats) {
        const label = labelOf(item);
        if (!label) continue;
        const key = norm(label);
        const row = byName.get(key) || { label: String(label), home: "—", away: "—" };
        row.away = clean(first(item?.value, item?.displayValue, item?.display, item?.total, item?.statValue, null));
        byName.set(key, row);
      }
      for (const row of byName.values()) {
        if (!invalid(row.home) || !invalid(row.away)) add(row.label, row.home, row.away);
      }
    };
    const seen = new Set();
    const visit = (source, depth = 0) => {
      if (!source || depth > 5 || typeof source !== "object" || seen.has(source)) return;
      seen.add(source);

      if (Array.isArray(source)) {
        if (source.some(block => block?.team && (Array.isArray(block?.statistics) || Array.isArray(block?.stats)))) processTeamBlocks(source);
        const allBlock = source.find(block => /^(all|full time|fulltime|match)$/i.test(String(block?.period || block?.title || block?.name || ""))) || source[0];
        if (allBlock && allBlock !== source) visit(allBlock, depth + 1);
        for (const item of source) {
          if (!item || typeof item !== "object") continue;
          if (item?.groups || item?.statisticsItems) processGroups(item.groups || item.statisticsItems);
          if (addItem(item)) continue;
          if (Array.isArray(item?.stats) && item.stats.some(value => value && typeof value === "object")) visit(item.stats, depth + 1);
          else if (Array.isArray(item?.statistics) && item.statistics.length && !item?.team) visit(item.statistics, depth + 1);
        }
        return;
      }

      const periods = source?.Periods || source?.periods || source?.periodStats;
      if (periods && typeof periods === "object") {
        const all = periods?.All || periods?.ALL || periods?.all || periods?.["Full Time"] || periods?.fullTime || periods?.full_time || Object.values(periods)[0];
        visit(all, depth + 1);
      }
      if (source?.groups || source?.statisticsItems || source?.items) processGroups(source.groups || source.statisticsItems || source.items);
      if (Array.isArray(source?.stats)) {
        const pairStats = source.stats.some(value => typeof value !== "object" || value === null);
        if (labelOf(source) && pairStats) addItem(source);
        else visit(source.stats, depth + 1);
      }
      if (Array.isArray(source?.statistics)) {
        if (source?.team) processTeamBlocks([source]);
        else visit(source.statistics, depth + 1);
      }
      if (source?.home || source?.away) {
        const home = source.home, away = source.away;
        const homeStats = arr(Array.isArray(home) ? home : home?.statistics || home?.stats || home?.items);
        const awayStats = arr(Array.isArray(away) ? away : away?.statistics || away?.stats || away?.items);
        if (homeStats.length || awayStats.length) {
          processTeamBlocks([
            { team: { side: "home" }, statistics: homeStats },
            { team: { side: "away" }, statistics: awayStats }
          ]);
        } else if (typeof home === "object" && typeof away === "object") {
          for (const [key, value] of Object.entries(source)) {
            if (value && typeof value === "object" && !Array.isArray(value)) {
              const pairHome = first(value?.home, value?.homeValue, null);
              const pairAway = first(value?.away, value?.awayValue, null);
              if (pairHome !== null || pairAway !== null) add(value?.name || value?.title || key, pairHome, pairAway);
            }
          }
        }
      }
      if (source?.name || source?.title || source?.key || source?.label) addItem(source);
    };

    const candidates = [
      details?.statistics, details?.stats, details?.match_statistics, details?.matchStatistics,
      details?.match?.statistics, details?.match?.stats, details?.data?.statistics,
      details?.content?.stats, details?.content?.statistics, details?.fixture?.statistics,
      details?.score?.statistics
    ];
    for (const candidate of candidates) visit(candidate);
    return [...rowsByName.values()].slice(0, 48);
  }

  function renderMatchStatistics(details) {
    const rows = getMatchStatistics(details);
    if (!rows.length) return '<div class="bfmd-section bfmd-statistics-section"><div class="bfmd-title">Statistiques du match</div><div class="bfmd-empty">Les statistiques ne sont pas disponibles pour cette rencontre.</div></div>';

    const numeric = value => {
      if (value === null || value === undefined) return null;
      const parsed = Number(String(value).replace("%", "").replace(",", ".").replace(/[^\d.\-]/g, ""));
      return Number.isFinite(parsed) ? parsed : null;
    };
    const keyFor = label => {
      const key = norm(label);
      if (/possession|ball poss/.test(key)) return "possession";
      if (/shots on target|shots on goal|on target|tirs cadres|tirs cadr/.test(key)) return "shotsTarget";
      if (/total shots|shots total|tirs totaux|total des tirs/.test(key)) return "shots";
      if (/corner/.test(key)) return "corners";
      if (/pass accuracy|accurate passes|passes completed|passes accurate|passes precision|precision des passes/.test(key)) return "passes";
      if (/expected goals|(^|\s)xg(\s|$)|buts attendus/.test(key)) return "xg";
      if (/fouls|fautes/.test(key)) return "fouls";
      if (/goalkeeper saves|saves|arrets/.test(key)) return "saves";
      return "";
    };
    const featuredLabels = {
      possession:"Possession",
      shotsTarget:"Tirs cadrés",
      shots:"Tirs totaux",
      corners:"Corners",
      passes:"Précision des passes",
      xg:"Buts attendus (xG)",
      fouls:"Fautes",
      saves:"Arrêts"
    };
    const featured = [], usedLabels = new Set();
    for (const key of Object.keys(featuredLabels)) {
      const row = rows.find(item => keyFor(item.label) === key);
      if (!row) continue;
      featured.push({key,label:featuredLabels[key],home:row.home,away:row.away});
      usedLabels.add(row.label);
    }
    const featuredHTML = featured.length
      ? '<div class="bfmd-stat-highlights">' + featured.map(item => {
          const h=numeric(item.home), a=numeric(item.away), total=Math.max(0,h||0)+Math.max(0,a||0);
          const hw=total>0&&h!==null?Math.max(0,Math.min(100,h/total*100)):50;
          const aw=total>0&&a!==null?Math.max(0,Math.min(100,a/total*100)):50;
          return '<div class="bfmd-stat-highlight"><div class="bfmd-stat-highlight-label">'+esc(item.label)+'</div>' +
            '<div class="bfmd-stat-highlight-values"><strong>'+esc(item.home)+'</strong><span>VS</span><strong>'+esc(item.away)+'</strong></div>' +
            '<div class="bfmd-stat-highlight-track"><span style="width:'+hw.toFixed(1)+'%"></span><span style="width:'+aw.toFixed(1)+'%"></span></div></div>';
        }).join("") + '</div>' : "";
    const detailRows=rows.filter(row=>!usedLabels.has(row.label));
    const detailHTML=detailRows.length
      ? '<div class="bfmd-statistics-detail-heading">TOUTES LES STATISTIQUES DISPONIBLES</div><div class="bfmd-statistics">' + detailRows.map(row=>{
          const h=numeric(row.home),a=numeric(row.away),total=Math.max(0,h||0)+Math.max(0,a||0);
          const hw=total>0&&h!==null?Math.max(0,Math.min(100,h/total*100)):50;
          const aw=total>0&&a!==null?Math.max(0,Math.min(100,a/total*100)):50;
          return '<div class="bfmd-stat-row"><div class="bfmd-stat-values"><strong>'+esc(row.home)+'</strong><span>'+esc(row.label)+'</span><strong>'+esc(row.away)+'</strong></div>' +
            '<div class="bfmd-stat-track"><span class="bfmd-stat-home" style="width:'+hw.toFixed(1)+'%"></span><span class="bfmd-stat-away" style="width:'+aw.toFixed(1)+'%"></span></div></div>';
        }).join("") + '</div>' : "";
    return '<div class="bfmd-section bfmd-statistics-section"><div class="bfmd-title">Statistiques du match</div>' +
      featuredHTML + detailHTML + '<div class="bfmd-statistics-note">Valeurs issues des données disponibles pour cette rencontre.</div></div>';
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
           Match Details
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

      /* Fill missing official positions and/or missing match statistics from FotMob. */
      if (!hasOfficialLineupCoordinates(details) || !getMatchStatistics(details).length) {
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
            if (response.ok && official && typeof official === "object") {
              const merged = { ...details };
              const hasOfficialCoordinates = hasOfficialLineupCoordinates(official);
              const hasCurrentStats = getMatchStatistics(details).length > 0;
              const hasOfficialStats = getMatchStatistics(official).length > 0;
              if (hasOfficialCoordinates) merged.lineups = official.lineups;
              if (!hasCurrentStats && hasOfficialStats) merged.statistics = official.statistics;
              if ((!Array.isArray(merged.events) || !merged.events.length) && Array.isArray(official.events) && official.events.length) {
                merged.events = official.events;
              }
              if (!merged.player_of_match && official.player_of_match) merged.player_of_match = official.player_of_match;
              details = merged;
              console.info("BAKHIRAFOOT: match enrichment", {
                provider: official?.provider || "FotMob",
                officialCoordinates: hasOfficialCoordinates,
                statisticsAdded: !hasCurrentStats && hasOfficialStats,
                statisticsRows: getMatchStatistics(details).length,
                home: baseTeams?.home?.name,
                away: baseTeams?.away?.name
              });
            } else {
              console.warn("BAKHIRAFOOT: exact match enrichment unavailable",
                payload?.details || payload?.error || "No usable match data");
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
      const explicitMvp = first(details?.player_of_match, details?.playerOfMatch, details?.man_of_the_match, details?.manOfTheMatch, details?.mvp, details?.best_player);
      const explicitMvpName = typeof explicitMvp === "string"
        ? explicitMvp
        : first(explicitMvp?.name, explicitMvp?.player?.name, explicitMvp?.player_name, "");
      if (explicitMvpName) statsMap.mvpKey = playerKey(explicitMvpName);

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

        ${renderSummary(events)}

        ${renderMatchStatistics(details)}

        <div class="bfmd-section bfmd-match-analysis">
          <div class="bfmd-title">COMPOSITIONS & PERFORMANCES SUR LE TERRAIN</div>
          <div class="bfmd-tactics-caption">
            <span>NOTES · BUTS · PASSES · CARTONS · BLESSURES · MVP · REMPLACEMENTS</span>
            <span>DONNÉES DISPONIBLES POUR CHAQUE JOUEUR</span>
          </div>
          <div class="bfmd-pitches bfmd-pitches--performance">
            ${renderPitch(homeLineup, "home", statsMap)}
            ${renderPitch(awayLineup, "away", statsMap)}
          </div>
          <div class="bfmd-pitch-legend">
            <span class="bfmd-chip bfmd-chip--goal">G = But</span>
            <span class="bfmd-chip bfmd-chip--assist">A = Passe décisive</span>
            <span class="bfmd-chip bfmd-chip--penalty">PEN = Penalty</span>
            <span class="bfmd-chip bfmd-chip--own">CSC = But contre son camp</span>
            <span class="bfmd-chip bfmd-chip--yellow">🟨 Jaune</span>
            <span class="bfmd-chip bfmd-chip--red">🟥 Rouge</span>
            <span class="bfmd-chip bfmd-chip--injury">INJ = Blessure</span>
            <span class="bfmd-chip bfmd-chip--mvp">MVP</span>
            <span class="bfmd-chip bfmd-chip--sub-in">IN / OUT</span>
            <span class="bfmd-chip bfmd-chip--rating">★ Note</span>
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
