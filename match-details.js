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

      #bfMatchDetailsModal .bfmd-pitches--performance { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; align-items:start; }
      #bfMatchDetailsModal .bfmd-combined-pitch-card { overflow:hidden; border:1px solid rgba(127,127,127,.18); border-radius:18px; background:rgba(127,127,127,.035); }
      #bfMatchDetailsModal .bfmd-combined-head { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); gap:8px; align-items:center; padding:12px; background:linear-gradient(115deg,rgba(11,155,105,.13),rgba(59,130,246,.09)); }
      #bfMatchDetailsModal .bfmd-combined-team { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:6px; min-width:0; font-size:12px; text-align:center; }
      #bfMatchDetailsModal .bfmd-combined-team span { display:flex; align-items:center; justify-content:center; width:26px; height:26px; }
      #bfMatchDetailsModal .bfmd-combined-team img { width:26px; height:26px; object-fit:contain; }
      #bfMatchDetailsModal .bfmd-combined-team strong { overflow-wrap:anywhere; }
      #bfMatchDetailsModal .bfmd-combined-team em { padding:3px 6px; border-radius:6px; background:rgba(127,127,127,.13); font-size:10px; font-style:normal; }
      #bfMatchDetailsModal .bfmd-combined-vs { font-size:10px; font-weight:950; opacity:.55; }
      #bfMatchDetailsModal .bfmd-pitch--combined { width:min(100%,460px); height:auto; min-height:0; max-height:none; aspect-ratio:.70; margin:0 auto; }
      #bfMatchDetailsModal .bfmd-combined-player { width:clamp(74px,7vw,94px); cursor:pointer; pointer-events:auto; outline-offset:2px; }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-photo-wrap,#bfMatchDetailsModal .bfmd-combined-player .bfmd-number-only { width:clamp(29px,2.8vw,42px); height:clamp(29px,2.8vw,42px); }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-name { max-width:92px; font-size:clamp(8px,.72vw,10px); padding:3px 5px; line-height:1.15; }
      #bfMatchDetailsModal .bfmd-combined-player--active .bfmd-name { background:#087f5b; color:#fff; }
      #bfMatchDetailsModal .bfmd-selected-player-panel:not([hidden]) { display:block; margin:10px 12px; padding:13px; border:1px solid rgba(11,155,105,.35); border-radius:14px; background:rgba(11,155,105,.08); }
      #bfMatchDetailsModal .bfmd-selected-player-inner { display:flex; align-items:center; gap:13px; }
      #bfMatchDetailsModal .bfmd-selected-player-photo { width:62px; height:62px; flex:0 0 62px; border-radius:50%; object-fit:cover; background:#dce7e2; }
      #bfMatchDetailsModal .bfmd-selected-player-photo--fallback { display:grid; place-items:center; font-size:28px; }
      #bfMatchDetailsModal .bfmd-selected-player-copy { min-width:0; }
      #bfMatchDetailsModal .bfmd-selected-player-copy strong { display:block; font-size:15px; font-weight:950; }
      #bfMatchDetailsModal .bfmd-selected-player-copy>span { display:block; margin-top:4px; font-size:11px; opacity:.7; }
      #bfMatchDetailsModal .bfmd-selected-player-copy p { margin:7px 0; font-size:12px; line-height:1.5; }
      #bfMatchDetailsModal .bfmd-selected-player-events { display:flex; flex-wrap:wrap; gap:4px; }
      #bfMatchDetailsModal .bfmd-player-statistics-details>summary { cursor:pointer; list-style:none; }
      #bfMatchDetailsModal .bfmd-player-statistics-details>summary::-webkit-details-marker { display:none; }
      #bfMatchDetailsModal .bfmd-player-statistics-details>summary:after { content:"＋"; float:right; opacity:.6; }
      #bfMatchDetailsModal .bfmd-player-statistics-details[open]>summary:after { content:"−"; }
      #bfMatchDetailsModal .bfmd-vote-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
      #bfMatchDetailsModal .bfmd-vote-option { display:grid; grid-template-columns:36px minmax(0,1fr); gap:4px 9px; align-items:center; width:100%; min-width:0; padding:12px; text-align:left; border:1px solid rgba(127,127,127,.22); border-radius:14px; background:rgba(127,127,127,.06); color:inherit; cursor:pointer; }
      #bfMatchDetailsModal .bfmd-vote-option img,#bfMatchDetailsModal .bfmd-vote-mark { grid-row:span 2; width:34px; height:34px; object-fit:contain; display:grid; place-items:center; }
      #bfMatchDetailsModal .bfmd-vote-team { min-width:0; overflow-wrap:anywhere; font-size:12px; font-weight:900; }
      #bfMatchDetailsModal .bfmd-vote-option strong { font-size:10px; opacity:.7; }
      #bfMatchDetailsModal .bfmd-vote-option--selected { border-color:#0b9b69; box-shadow:0 0 0 2px rgba(11,155,105,.12); background:rgba(11,155,105,.1); }
      #bfMatchDetailsModal .bfmd-vote-bar { display:flex; gap:3px; overflow:hidden; height:7px; margin-top:12px; border-radius:99px; background:rgba(127,127,127,.1); }
      #bfMatchDetailsModal .bfmd-vote-bar span { width:0; display:block; transition:width .2s; }
      #bfMatchDetailsModal [data-bf-vote-bar="home"] { background:#0b9b69; }
      #bfMatchDetailsModal [data-bf-vote-bar="away"] { background:#3b82f6; }
      #bfMatchDetailsModal .bfmd-vote-status { margin-top:8px; font-size:11px; opacity:.7; }
      #bfMatchDetailsModal .bfmd-h2h-row { padding:11px 0; border-bottom:1px solid rgba(127,127,127,.15); }
      #bfMatchDetailsModal .bfmd-h2h-row>small { display:block; margin-bottom:7px; font-size:10px; opacity:.6; }
      #bfMatchDetailsModal .bfmd-h2h-row>div { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); gap:8px; align-items:center; font-size:12px; }
      #bfMatchDetailsModal .bfmd-h2h-row>div strong:last-child { text-align:right; }
      #bfMatchDetailsModal .bfmd-h2h-row>div b { padding:5px 8px; border-radius:8px; background:rgba(127,127,127,.1); white-space:nowrap; }
      #bfMatchDetailsModal .bfmd-standings-scroll { max-width:100%; overflow-x:auto; }
      #bfMatchDetailsModal .bfmd-mini-table { width:100%; border-collapse:collapse; font-size:11px; }
      #bfMatchDetailsModal .bfmd-mini-table th,#bfMatchDetailsModal .bfmd-mini-table td { padding:8px 6px; border-bottom:1px solid rgba(127,127,127,.12); text-align:center; white-space:nowrap; }
      #bfMatchDetailsModal .bfmd-mini-table th:nth-child(2),#bfMatchDetailsModal .bfmd-mini-table td:nth-child(2) { text-align:left; }
      #bfMatchDetailsModal .bfmd-mini-team { display:flex; gap:6px; align-items:center; min-width:100px; }
      #bfMatchDetailsModal .bfmd-mini-team img { width:19px; height:19px; object-fit:contain; }
      @media(max-width:650px) {
        #bfMatchDetailsModal .bfmd-pitch--combined { width:min(100%,390px); aspect-ratio:.68; height:auto; min-height:0; }
        #bfMatchDetailsModal .bfmd-combined-player { width:clamp(58px,14vw,72px); }
        #bfMatchDetailsModal .bfmd-combined-player .bfmd-name { max-width:68px; font-size:7px; }
        #bfMatchDetailsModal .bfmd-combined-player .bfmd-photo-wrap,#bfMatchDetailsModal .bfmd-combined-player .bfmd-number-only { width:27px; height:27px; }
        #bfMatchDetailsModal .bfmd-vote-options { grid-template-columns:minmax(0,1fr); }
      }
      #bfMatchDetailsModal .bfmd-combined-player { width:clamp(54px,7vw,82px); gap:1px; }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-photo-wrap,#bfMatchDetailsModal .bfmd-combined-player .bfmd-number-only { width:clamp(20px,2vw,30px); height:clamp(20px,2vw,30px); }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-name { max-width:82px; font-size:clamp(6px,.58vw,8px); padding:2px; }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-role { font-size:6px; padding:1px 3px; }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-performance-tags { display:none; }
      #bfMatchDetailsModal .bfmd-combined-empty { position:absolute; left:5%; width:90%; text-align:center; color:#fff; font-size:11px; font-weight:800; background:rgba(3,12,20,.65); border-radius:8px; padding:8px; box-sizing:border-box; }
      #bfMatchDetailsModal .bfmd-combined-empty--home { top:25%; }
      #bfMatchDetailsModal .bfmd-combined-empty--away { top:72%; }
      #bfMatchDetailsModal .bfmd-combined-caption { display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; padding:8px 12px; font-size:9px; font-weight:900; opacity:.65; }
      #bfMatchDetailsModal .bfmd-combined-benches { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; padding:12px; }
      #bfMatchDetailsModal .bfmd-combined-benches h4 { margin:4px 0 10px; font-size:12px; }
      #bfMatchDetailsModal .bfmd-player-stats-intro { margin:-5px 0 14px; font-size:12px; opacity:.7; }
      #bfMatchDetailsModal .bfmd-player-stats-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
      #bfMatchDetailsModal .bfmd-player-stats-team { min-width:0; padding:12px; border:1px solid rgba(127,127,127,.18); border-radius:14px; }
      #bfMatchDetailsModal .bfmd-player-stats-team h3 { margin:0 0 10px; font-size:14px; }
      #bfMatchDetailsModal .bfmd-extra-copy { margin:-4px 0 14px; font-size:12px; line-height:1.6; opacity:.72; }
      #bfMatchDetailsModal .bfmd-recent-team-actions { display:flex; flex-wrap:wrap; gap:10px; }
      #bfMatchDetailsModal .bfmd-recent-team-actions .bfmd-extra-button { max-width:100%; text-align:center; overflow-wrap:anywhere; }
      #bfMatchDetailsModal .bfmd-extra-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; max-width:100%; border:0; border-radius:11px; padding:11px 15px; background:linear-gradient(110deg,#087f5b,#0b9b69); color:#fff; font-size:12px; font-weight:900; text-decoration:none; cursor:pointer; }
      #bfMatchDetailsModal .bfmd-news-card { display:grid; grid-template-columns:88px minmax(0,1fr); gap:12px; align-items:center; margin:8px 0; padding:10px; border:1px solid rgba(127,127,127,.18); border-radius:12px; text-decoration:none; color:inherit; }
      #bfMatchDetailsModal .bfmd-news-card img,#bfMatchDetailsModal .bfmd-news-card-mark { display:flex; width:88px; height:62px; align-items:center; justify-content:center; object-fit:cover; border-radius:8px; background:rgba(127,127,127,.12); font-weight:950; }
      #bfMatchDetailsModal .bfmd-news-card strong { display:block; font-size:12px; line-height:1.45; }
      #bfMatchDetailsModal .bfmd-news-card small { display:block; margin-top:6px; font-size:10px; opacity:.65; }
      #bfMatchDetailsModal .bfmd-news-card:hover { border-color:#0b9b69; }
      #bf-new-match-safe-modal .bfmd-section { margin-top:22px; padding-top:18px; border-top:1px solid rgba(127,127,127,.16); }
      #bf-new-match-safe-modal .bfmd-title { margin:0 0 13px; font-size:16px; font-weight:950; }
      #bf-new-match-safe-modal .bfmd-extra-copy { margin:-4px 0 14px; font-size:12px; line-height:1.6; opacity:.72; }
      #bf-new-match-safe-modal .bfmd-extra-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; max-width:100%; border:0; border-radius:11px; padding:11px 15px; background:#087f5b; color:#fff; font-size:12px; font-weight:900; text-decoration:none; cursor:pointer; }
      #bf-new-match-safe-modal .bfmd-vote-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
      #bf-new-match-safe-modal .bfmd-vote-option { display:grid; grid-template-columns:36px minmax(0,1fr); gap:4px 9px; align-items:center; padding:12px; border:1px solid rgba(127,127,127,.22); border-radius:14px; background:rgba(127,127,127,.06); color:inherit; cursor:pointer; }
      #bf-new-match-safe-modal .bfmd-vote-option img,#bf-new-match-safe-modal .bfmd-vote-mark { grid-row:span 2; width:34px; height:34px; object-fit:contain; display:grid; place-items:center; }
      #bf-new-match-safe-modal .bfmd-vote-team { font-size:12px; font-weight:900; overflow-wrap:anywhere; }
      #bf-new-match-safe-modal .bfmd-vote-option strong { font-size:10px; opacity:.7; }
      #bf-new-match-safe-modal .bfmd-vote-option--selected { border-color:#0b9b69; background:rgba(11,155,105,.1); }
      #bf-new-match-safe-modal .bfmd-vote-bar { display:flex; gap:3px; height:7px; margin-top:12px; overflow:hidden; border-radius:99px; }
      #bf-new-match-safe-modal .bfmd-vote-bar span { display:block; width:0; }
      #bf-new-match-safe-modal [data-bf-vote-bar="home"] { background:#0b9b69; }
      #bf-new-match-safe-modal [data-bf-vote-bar="away"] { background:#3b82f6; }
      #bf-new-match-safe-modal .bfmd-vote-status { margin-top:8px; font-size:11px; opacity:.7; }
      #bf-new-match-safe-modal .bfmd-h2h-row { padding:11px 0; border-bottom:1px solid rgba(127,127,127,.15); }
      #bf-new-match-safe-modal .bfmd-h2h-row>small { display:block; margin-bottom:7px; font-size:10px; opacity:.65; }
      #bf-new-match-safe-modal .bfmd-h2h-row>div { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); gap:8px; align-items:center; font-size:12px; }
      #bf-new-match-safe-modal .bfmd-h2h-row>div b { white-space:nowrap; }
      #bf-new-match-safe-modal .bfmd-standings-scroll { max-width:100%; overflow-x:auto; }
      #bf-new-match-safe-modal .bfmd-mini-table { width:100%; border-collapse:collapse; font-size:11px; }
      #bf-new-match-safe-modal .bfmd-mini-table th,#bf-new-match-safe-modal .bfmd-mini-table td { padding:8px 6px; border-bottom:1px solid rgba(127,127,127,.12); text-align:center; white-space:nowrap; }
      #bf-new-match-safe-modal .bfmd-mini-table th:nth-child(2),#bf-new-match-safe-modal .bfmd-mini-table td:nth-child(2) { text-align:left; }
      #bf-new-match-safe-modal .bfmd-mini-team { display:flex; gap:6px; align-items:center; min-width:100px; }
      #bf-new-match-safe-modal .bfmd-mini-team img { width:19px; height:19px; object-fit:contain; }
      #bf-new-match-safe-modal .bfmd-news-card { display:grid; grid-template-columns:88px minmax(0,1fr); gap:12px; align-items:center; margin:8px 0; padding:10px; border:1px solid rgba(127,127,127,.18); border-radius:12px; text-decoration:none; color:inherit; }
      #bf-new-match-safe-modal .bfmd-news-card img,#bf-new-match-safe-modal .bfmd-news-card-mark { display:flex; width:88px; height:62px; align-items:center; justify-content:center; object-fit:cover; border-radius:8px; background:rgba(127,127,127,.12); font-weight:950; }
      #bf-new-match-safe-modal .bfmd-news-card strong { display:block; font-size:12px; line-height:1.45; }
      #bf-new-match-safe-modal .bfmd-news-card small { display:block; margin-top:6px; font-size:10px; opacity:.65; }
      @media(max-width:650px) { #bf-new-match-safe-modal .bfmd-vote-options { grid-template-columns:minmax(0,1fr); } }
      @media(max-width:650px) {
        #bfMatchDetailsModal .bfmd-pitch--combined { min-height:370px; }
        #bfMatchDetailsModal .bfmd-combined-player { width:55px; }
        #bfMatchDetailsModal .bfmd-combined-player .bfmd-name { max-width:58px; font-size:6px; }
        #bfMatchDetailsModal .bfmd-combined-benches,#bfMatchDetailsModal .bfmd-player-stats-grid { grid-template-columns:minmax(0,1fr); }
      }
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

      /* Match-centre polish: theme-aware tabs and performance markers beside each player. */
      #bfMatchDetailsModal .bfmd-header .bfmd-info { width:100%; grid-column:1/-1; flex:0 0 100%; justify-content:flex-start; margin-top:16px; padding-top:13px; border-top:1px solid var(--bfmd-divider,rgba(148,163,184,.22)); }
      #bfMatchDetailsModal .bfmd-center-nav { background:transparent; border-bottom:1px solid rgba(127,127,127,.13); }
      #bfMatchDetailsModal .bfmd-combined-player { overflow:visible; }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-event-mini { position:absolute; top:10px; left:calc(100% - 1px); right:auto; transform:none; z-index:14; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; gap:3px; width:20px; max-width:20px; min-height:0; margin:0; padding:0; background:transparent; border:0; border-radius:0; overflow:visible; }
      #bfMatchDetailsModal .bfmd-combined-player--perf-left .bfmd-event-mini { left:auto; right:calc(100% - 1px); }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-event-mini .bfmd-chip { min-width:16px; min-height:15px; padding:2px 3px; border-radius:5px; box-shadow:0 2px 5px rgba(0,0,0,.25); }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-event-mini .bfmd-chip-rating-number { font-size:7px; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-box { color:#172033; background:#f7f9fc; border-color:#d9e2ee; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-header { color:#172033; background:linear-gradient(125deg,#ffffff,#edf3f9); border-color:#d8e2ed; } body:not(.dark) #bfMatchDetailsModal .bfmd-header .bfmd-info { border-top-color:#d8e2ed!important; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-header .bfmd-team,
      body:not(.dark) #bfMatchDetailsModal .bfmd-title,
      body:not(.dark) #bfMatchDetailsModal .bfmd-combined-team strong { color:#172033; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-league,
      body:not(.dark) #bfMatchDetailsModal .bfmd-status,
      body:not(.dark) #bfMatchDetailsModal .bfmd-extra-copy { color:#526176; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-score { color:#101828; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-info span { color:#334155; background:#edf2f7; border-color:#d6e0eb; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-section { color:#172033; background:linear-gradient(145deg,#ffffff,#f7f9fc); border-color:#d8e2ed; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-summary-box,
      body:not(.dark) #bfMatchDetailsModal .bfmd-bench-player,
      body:not(.dark) #bfMatchDetailsModal .bfmd-performance-player,
      body:not(.dark) #bfMatchDetailsModal .bfmd-selected-player-panel { color:#172033; background:#ffffff; border-color:#dce4ed; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-view-hint { color:#526176; background:#f1f5f9; border-color:#d6e0eb; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-center-nav { background:rgba(247,249,252,.96); border-color:#e0e6ee; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-center-nav button { color:#27364b; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-vote-option { color:#172033; background:#ffffff; border-color:#d6e0eb; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-mini-table th,
      body:not(.dark) #bfMatchDetailsModal .bfmd-mini-table td { color:#263348; border-color:#dce4ed; }
      body:not(.dark) #bfMatchDetailsModal .bfmd-h2h-row { border-color:#dce4ed; }
      @media(max-width:650px) {
        #bfMatchDetailsModal .bfmd-combined-player .bfmd-event-mini { top:8px; width:16px; max-width:16px; gap:2px; }
        #bfMatchDetailsModal .bfmd-combined-player .bfmd-event-mini .bfmd-chip { min-width:13px; min-height:13px; padding:1px 2px; font-size:6px; }
      }

      /* HORIZONTAL BROADCAST PITCH — teams face each other across the width. */
      #bfMatchDetailsModal .bfmd-pitch--combined { width:min(100%,900px); aspect-ratio:1.48; height:auto; min-height:0; max-height:none; margin:0 auto; overflow:visible; }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-border { inset:8px; }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-half { left:50%; right:auto; top:8px; bottom:8px; width:2px; height:auto; }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-box-line { left:0; right:auto; top:25%; bottom:25%; width:15%; height:auto; }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-box-line.top { left:8px; right:auto; top:25%; bottom:25%; }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-box-line.bottom { left:auto; right:8px; top:25%; bottom:25%; }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-goal-box { left:0; right:auto; top:39%; bottom:auto; width:3%; height:22%; border:1px solid rgba(255,255,255,.78); }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-goal-box.top { left:0; right:auto; top:39%; bottom:auto; border:1px solid rgba(255,255,255,.78); }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-goal-box.bottom { left:auto; right:0; top:39%; bottom:auto; border:1px solid rgba(255,255,255,.78); }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-penalty-spot { left:auto; right:auto; top:50%; bottom:auto; transform:translateY(-50%); }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-penalty-spot.top { left:20%; right:auto; }
      #bfMatchDetailsModal .bfmd-pitch--combined .bfmd-penalty-spot.bottom { left:auto; right:20%; }
      #bfMatchDetailsModal .bfmd-combined-player { width:clamp(52px,6vw,84px); }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-photo-wrap,
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-number-only { width:clamp(24px,2.8vw,38px); height:clamp(24px,2.8vw,38px); }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-name { max-width:76px; padding:2px 4px; font-size:clamp(7px,.65vw,9px); }
      #bfMatchDetailsModal .bfmd-combined-player .bfmd-event-mini { top:-4px; }
      #bfMatchDetailsModal .bfmd-info i { font-style:normal; }
      #bfMatchDetailsModal .bfmd-info b { font-weight:850; }
      @media(max-width:650px) {
        #bfMatchDetailsModal .bfmd-pitch--combined { width:100%; aspect-ratio:1.12; }
        #bfMatchDetailsModal .bfmd-combined-player { width:clamp(42px,11vw,58px); }
        #bfMatchDetailsModal .bfmd-combined-player .bfmd-photo-wrap,
        #bfMatchDetailsModal .bfmd-combined-player .bfmd-number-only { width:clamp(20px,5.4vw,27px); height:clamp(20px,5.4vw,27px); }
        #bfMatchDetailsModal .bfmd-combined-player .bfmd-name { max-width:55px; font-size:6.5px; padding:2px; }
        #bfMatchDetailsModal .bfmd-combined-player .bfmd-event-mini { top:0; width:15px; max-width:15px; }
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

function bfAssignFormationRoles(players, formation, readPosition) {
  if (!Array.isArray(players)) return [];
  return players.map(player => {
    const sourceRole = typeof readPosition === "function" ? readPosition(player) : "";
    const role = bfNormalizeTacticalRole(sourceRole);
    return { ...player, tacticalPosition: role || "" };
  });
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

  return [];
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

  function getEventPlayer(event) {
    const candidates = [
      event?.player, event?.scorer, event?.goalScorer, event?.goal_scorer,
      event?.goal?.player, event?.goal?.scorer, event?.athlete, event?.actor,
      event?.injury?.player, event?.injury?.athlete, event?.injuredPlayer, event?.injured_player,
      event?.card?.player, event?.relatedPlayer, event?.related_player,
      event?.participant, event?.person,
      event?.participants?.[0]?.athlete, event?.participants?.[0]?.player, event?.participants?.[0],
      event?.players?.[0]?.athlete, event?.players?.[0]?.player, event?.players?.[0],
      event?.player_name, event?.playerName, event?.scorer_name, event?.scorerName,
      event?.name
    ];
    const person = candidates.map(eventPersonName).find(Boolean);
    return first(person, event?.player_name, event?.playerName, event?.scorer_name, event?.scorerName, event?.name, "");
  }

  function eventPersonName(value) {
    if (typeof value === "string") return value.trim();
    if (!value || typeof value !== "object") return "";
    return String(first(
      value.name, value.displayName, value.display_name,
      value.fullName, value.full_name, value.short_name, value.shortName,
      value.player?.name, value.player?.displayName,
      value.athlete?.displayName, value.athlete?.name,
      value.person?.name, value.label, ""
    ) || "").trim();
  }

  function substitutionNamesFromText(event) {
    const type = norm(first(event?.type?.name, event?.type?.text, event?.type, event?.event_type, event?.incidentType, ""));
    const textValue = [event?.detail, event?.description, event?.text, event?.commentary, event?.shortText, event?.longText, event?.name]
      .filter(value => value !== null && value !== undefined && String(value).trim())
      .map(value => String(value).trim()).filter((value,index,items) => items.indexOf(value) === index).join(" ")
      .replace(/\s+/g, " ").trim();
    if (!/substitut|subbed|remplac|changement|player change|replaces|comes on|enters/.test(type + " " + norm(textValue))) {
      return { inName: "", outName: "" };
    }
    const patterns = [
      { re: /(?:substitution|remplacement)?\s*[:,\-]?\s*(.+?)\s+(?:comes on|came on|enters|entered|is brought on|replaces|replace|for)\s+(?:for\s+)?(.+?)(?:[.!;,]|$)/i, dir: "in-out" },
      { re: /(.+?)\s+(?:is replaced by|replaced by|subbed off for)\s+(.+?)(?:[.!;,]|$)/i, dir: "out-in" },
      { re: /(?:substitution|remplacement)[,:\-]?\s*(.+?)\s+for\s+(.+?)(?:[.!;,]|$)/i, dir: "in-out" },
      { re: /(.+?)\s+off[,;:\s]+(.+?)\s+on(?:[.!;,]|$)/i, dir: "out-in" }
    ];
    for (const item of patterns) {
      const match = textValue.match(item.re);
      if (!match) continue;
      const a = match[1].replace(/^(substitution|remplacement)\s*[:,\-]?\s*/i, "").trim();
      const b = match[2].trim();
      if (!a || !b || a.length > 75 || b.length > 75) continue;
      return item.dir === "in-out" ? { inName: a, outName: b } : { inName: b, outName: a };
    }
    return { inName: "", outName: "" };
  }

  function getEventAssist(event) {
    const direct = first(
      eventPersonName(event?.assist),
      eventPersonName(event?.assist1),
      eventPersonName(event?.assist_1),
      eventPersonName(event?.assist2),
      eventPersonName(event?.assist_2),
      eventPersonName(event?.assistPlayer),
      eventPersonName(event?.assist_player),
      eventPersonName(event?.relatedPlayer),
      eventPersonName(event?.related_player),
      event?.assist_name, event?.assistName, event?.assist_player_name, event?.assistPlayerName,
      eventPersonName(event?.goal?.assist),
      eventPersonName(event?.goal?.assist1),
      eventPersonName(event?.goal?.assist_1),
      eventPersonName(event?.assists?.[0]),
      eventPersonName(event?.participants?.[1]?.athlete),
      eventPersonName(event?.participants?.[1]?.player),
      eventPersonName(event?.participants?.[1]),
      eventPersonName(event?.players?.[1]), ""
    );
    const directText = String(direct || "").trim();
    const directKey = norm(directText).replace(/[^a-z0-9]/g, "");
    /* api/index.js can place its provider label in the assist field when no passer exists. */
    const nonPlayerLabels = new Set([
      "sportscore", "sofascore", "espn", "thesportsdb", "fotmob",
      "provider", "unknown", "none", "null", "undefined"
    ]);
    if (directText && !nonPlayerLabels.has(directKey)) {
      return directText;
    }
    const eventTypeText = norm([
      event?.type?.name, event?.type?.text, event?.type,
      event?.event_type, event?.incidentType
    ].filter(Boolean).join(" "));
    if (!/goal|score|but/.test(eventTypeText)) return "";
    const textValue = [event?.goalDescription, event?.goal_description, event?.detail, event?.description, event?.text, event?.commentary]
      .filter(value => value !== null && value !== undefined && String(value).trim())
      .map(value => String(value).trim()).filter((value,index,items) => items.indexOf(value) === index).join(" ");
    const patterns = [
      /assisted by\s+([^,.;()[\]]+)/i,
      /assist(?:ed)?\s+(?:by|from)\s+([^,.;()[\]]+)/i,
      /with an assist from\s+([^,.;()[\]]+)/i,
      /passe d[ée]cisive\s+(?:de|par)\s+([^,.;()[\]]+)/i,
      /assist[eé]?\s+par\s+([^,.;()[\]]+)/i
    ];
    for (const pattern of patterns) {
      const match = textValue.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return "";
  }

  function getSubIn(event) {
    const direct = first(
      eventPersonName(event?.player_in), eventPersonName(event?.playerIn),
      eventPersonName(event?.incoming), eventPersonName(event?.in_player),
      eventPersonName(event?.substituteIn), eventPersonName(event?.substitute_in),
      eventPersonName(event?.playerOn), eventPersonName(event?.player_on),
      eventPersonName(event?.substitution?.in), eventPersonName(event?.substitution?.incoming),
      eventPersonName(event?.swap?.in), eventPersonName(event?.replacement),
      event?.player_in_name, event?.playerInName, event?.incomingPlayerName, ""
    );
    if (direct) return String(direct).trim();
    return substitutionNamesFromText(event).inName;
  }

  function getSubOut(event) {
    const direct = first(
      eventPersonName(event?.player_out), eventPersonName(event?.playerOut),
      eventPersonName(event?.outgoing), eventPersonName(event?.out_player),
      eventPersonName(event?.replaced), eventPersonName(event?.substituteOut),
      eventPersonName(event?.substitute_out), eventPersonName(event?.playerOff),
      eventPersonName(event?.player_off), eventPersonName(event?.substitution?.out),
      eventPersonName(event?.substitution?.outgoing), eventPersonName(event?.swap?.out),
      event?.player_out_name, event?.playerOutName, event?.outgoingPlayerName, ""
    );
    if (direct) return String(direct).trim();
    return substitutionNamesFromText(event).outName;
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
  const rawType = first(
    event?.type?.name, event?.type?.text, event?.type?.label, event?.type?.slug,
    typeof event?.type === "string" || typeof event?.type === "number" ? event.type : null,
    event?.event_type?.name, event?.event_type?.text, event?.event_type?.label,
    typeof event?.event_type === "string" ? event.event_type : null,
    event?.incidentType?.name, event?.incidentType?.text,
    typeof event?.incidentType === "string" ? event.incidentType : null,
    event?.kind?.name, event?.kind?.text, typeof event?.kind === "string" ? event.kind : null,
    event?.incident?.type?.name, event?.incident?.type,
    event?.goal?.type?.name, event?.goal?.type,
    ""
  );

  const rawDetail = first(
    event?.detail?.name, event?.detail?.text, event?.detail?.description,
    typeof event?.detail === "string" || typeof event?.detail === "number" ? event.detail : null,
    event?.description?.text, event?.description?.label,
    typeof event?.description === "string" ? event.description : null,
    event?.goalDescription, event?.goal_description,
    event?.cardDescription, event?.incidentClass?.name, event?.incidentClass,
    event?.reason?.name, event?.reason,
    event?.text, event?.shortText, event?.longText, event?.commentary,
    event?.injury?.type?.name, event?.injury?.type,
    event?.card?.type?.name, event?.card?.type,
    event?.goal?.detail, event?.goal?.description,
    ""
  );

  const type =
    norm(rawType);

  const detail =
    norm(rawDetail);

  /* Preserve the event kind already normalized by the existing API response. */
  const sourceKind = norm(first(
    event?.kind?.name, event?.kind?.text,
    typeof event?.kind === "string" ? event.kind : null,
    ""
  )).replace(/[_-]+/g, " ");

  let kind = "other";

  /*
   * BUT
   */
  const missedPenalty = /(?:missed|saved|miss|wide|failed)\s+(?:penalty|penaltie)|(?:penalty|penaltie)\s+(?:missed|saved|wide|failed)/.test(type + " " + detail);

  if (
    !missedPenalty && (
      sourceKind === "goal" ||
      sourceKind === "own goal" ||
      sourceKind === "penalty goal" ||
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
    sourceKind.includes("red") ||
    sourceKind.includes("second yellow") ||
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
    sourceKind.includes("yellow") ||
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
    sourceKind.includes("substitution") ||
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
    sourceKind.includes("injur") ||
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
    sourceKind.includes("var") ||
    type.includes("var") ||
    detail.includes("var")
  ) {
    kind = "var";
  }

  let goalType = "regular";
  if (kind === "goal") {
    const goalDescriptor = norm([
      rawType, rawDetail, sourceKind, event?.kind, event?.incidentType, event?.incidentClass,
      event?.goalType, event?.goal_type, event?.goal?.type,
      event?.goal?.detail, event?.goal?.description
    ].filter(value => value !== null && value !== undefined).join(" ")).replace(/[_-]+/g, " ");
    const truthyEventFlag = value => value === true || value === 1 ||
      /^(true|1|yes|y)$/i.test(String(value ?? "").trim());
    const ownGoalFlag = [
      event?.own_goal, event?.ownGoal, event?.is_own_goal, event?.isOwnGoal,
      event?.goal?.own_goal, event?.goal?.ownGoal, event?.goal?.isOwnGoal,
      event?.goal?.is_own_goal, event?.goal?.ownGoal?.value
    ].some(truthyEventFlag);
    const penaltyFlag = [
      event?.is_penalty, event?.isPenalty, event?.penalty_goal,
      event?.penaltyGoal, event?.goal?.penalty, event?.goal?.is_penalty,
      event?.goal?.isPenalty, event?.penalty, event?.goal?.isPenalty?.value
    ].some(truthyEventFlag);
    if (
      ownGoalFlag ||
      sourceKind.includes("own goal") ||
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

  const assist = getEventAssist(event);
  const eventDescriptor = norm([
    rawType, rawDetail, event?.text, event?.shortText, event?.longText,
    event?.commentary, event?.reason?.name, event?.reason,
    event?.injury?.type?.name, event?.injury?.type
  ].filter(value => value !== null && value !== undefined).join(" "));
  const hasInjury = /injur|hurt|medical|bless|lesion/.test(eventDescriptor);
  const injuryName = first(
    eventPersonName(event?.injury?.player), eventPersonName(event?.injury?.athlete),
    eventPersonName(event?.injuredPlayer), eventPersonName(event?.injured_player),
    eventPersonName(event?.injured), kind === "injury" ? name : ""
  );

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
    hasInjury,
    injuryName,
    playerIn: getSubIn(event),
    playerOut: getSubOut(event),
    teamId: getEventTeamId(event),
    teamName: getEventTeamName(event),
    side: norm(first(event?.side, event?.team_side, ""))
  };
}

  function getEvents(details) {
    const eventKeys = new Set([
      "events", "timeline", "incidents", "matchevents", "plays",
      "injuries", "cards", "goals", "matchincidents", "matchtimeline"
    ]);
    const queue = [{ value: details, depth: 0 }];
    const visited = new Set();
    const raw = [];
    const rawSeen = new Set();
    const looksLikeEvent = event => {
      if (!event || typeof event !== "object" || Array.isArray(event)) return false;
      const has = key => Object.prototype.hasOwnProperty.call(event, key);
      return [
        "event_type", "eventType", "incidentType", "goal", "scorer", "goal_scorer",
        "goalScorer", "injury", "card", "player_in", "playerIn", "player_out", "playerOut"
      ].some(has) || (
        has("type") && ["player","athlete","actor","scorer","minute","elapsed","time","detail","description","text","comments"].some(has)
      );
    };
    const pushEvent = event => {
      if (!event || typeof event !== "object" || Array.isArray(event)) return;
      const id = first(event.id, event.event_id, event.eventId, event.incidentId, event.incident_id);
      const time = first(event.minute, event.elapsed, event.time?.elapsed, event.time?.minute, event.time);
      const eventTypeValue = first(event.type?.name, event.type?.text, event.type?.slug, event.type, event.event_type?.name, event.event_type, event.incidentType?.name, event.incidentType);
      const eventPlayerValue = getEventPlayer(event);
      const eventTextValue = first(event.detail?.name, event.detail?.text, event.detail, event.description?.text, event.description, event.text, event.commentary, event.shortText);
      const signature = [time, eventTypeValue, eventPlayerValue, eventTextValue].filter(v => v !== undefined && v !== null && v !== "").map(String).join("|") || JSON.stringify(event);
      const key = id !== null && id !== undefined && String(id) !== "" ? "id:" + String(id) : "sig:" + signature;
      if (rawSeen.has(key)) return;
      rawSeen.add(key);
      raw.push(event);
    };
    const collectEventContainer = (value, depth = 0) => {
      if (!value || typeof value !== "object" || depth > 4) return;
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (looksLikeEvent(item)) pushEvent(item);
          else collectEventContainer(item, depth + 1);
        });
        return;
      }
      if (looksLikeEvent(value)) pushEvent(value);
      for (const child of Object.values(value)) {
        if (child && typeof child === "object") collectEventContainer(child, depth + 1);
      }
    };
    while (queue.length && visited.size < 2000) {
      const item = queue.shift();
      const current = item?.value;
      if (!current || typeof current !== "object" || visited.has(current) || item.depth > 6) continue;
      visited.add(current);
      if (Array.isArray(current)) {
        if (item.depth < 6) current.forEach(value => {
          if (value && typeof value === "object") queue.push({ value, depth: item.depth + 1 });
        });
        continue;
      }
      for (const [key, value] of Object.entries(current)) {
        const normalizedKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
        if (eventKeys.has(normalizedKey)) collectEventContainer(value);
        if (value && typeof value === "object" && item.depth < 6) queue.push({ value, depth: item.depth + 1 });
      }
    }
    return raw.map(normalizeEvent);
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
      if (event.kind === "injury" || (event.hasInjury && event.injuryName)) {
        const player = data(event.injuryName || event.name);
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
    player?.statistics, player?.stats, player?.performance
  ].filter(value => value && typeof value === "object");
  const isMvpText = value => typeof value === "string" &&
    /\bmvp\b|man of the match|player of the match|player of the game|best player/i.test(value.trim());
  const isMvpAward = (value, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 4) return isMvpText(value);
    if (Array.isArray(value)) return value.some(item => isMvpAward(item, depth + 1));
    for (const [key, item] of Object.entries(value)) {
      const normalizedKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (["mvp","manofthematch","playerofthematch","playerofmatch","playerofthegame","bestplayer"].includes(normalizedKey)) {
        if (item === true || item === 1 || isMvpText(item) || isMvpAward(item, depth + 1)) return true;
      }
      if (["name","title","label","description","award","awards","type","value"].includes(normalizedKey) &&
          isMvpAward(item, depth + 1)) return true;
    }
    return false;
  };
  return sources.some(source => {
    const explicitFlags = [
      source.mvp, source.is_mvp, source.isMvp, source.isMVP,
      source.man_of_the_match, source.manOfTheMatch,
      source.player_of_match, source.playerOfMatch,
      source.player_of_the_match, source.playerOfTheMatch
    ];
    return explicitFlags.some(value => value === true || value === 1 || isMvpText(value)) ||
      isMvpAward(source.award) || isMvpAward(source.awards);
  });
 }

 function findExplicitMvp(details) {
  const keys = new Set([
    "mvp", "playermatch", "playerofmatch", "playerofthematch",
    "manofthematch", "bestplayer", "playerofthegame", "matchwinner"
  ]);
  const directRoots = [details, details?.data, details?.match, details?.fixture, details?.result, details?.response];
  for (const root of directRoots) {
    if (!root || typeof root !== "object" || Array.isArray(root)) continue;
    for (const [key, value] of Object.entries(root)) {
      if (keys.has(String(key).toLowerCase().replace(/[^a-z0-9]/g, "")) &&
          value !== null && value !== undefined && value !== "" && value !== false) return value;
    }
  }
  const queue = [{value:details,depth:0}], seen = new Set();
  while (queue.length && seen.size < 1500) {
    const item = queue.shift(), value = item?.value;
    if (!value || typeof value !== "object" || seen.has(value) || item.depth > 6) continue;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(child => { if (child && typeof child === "object") queue.push({value:child,depth:item.depth+1}); });
      continue;
    }
    for (const [key, child] of Object.entries(value)) {
      const normalizedKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (keys.has(normalizedKey) && child !== null && child !== undefined && child !== "" && child !== false) {
        if (child === true || child === 1) {
          const namedPlayer = first(value.player, value.athlete, value.name, value.player_name, value.playerName);
          if (namedPlayer) return namedPlayer;
        } else return child;
      }
      if (child && typeof child === "object" && item.depth < 6) queue.push({value:child,depth:item.depth+1});
    }
  }
  return null;
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
    const ratingValue = Number(rating);
    const ratingTone = ratingValue >= 8 ? "excellent" : ratingValue >= 7 ? "good" :
      ratingValue >= 6 ? "average" : ratingValue >= 5.5 ? "low" : "poor";
    badges.push('<span class="bfmd-chip bfmd-chip--rating bfmd-rating--' + ratingTone + '" title="Note du joueur">' +
      performanceIcon("rating") + '<span class="bfmd-chip-rating-number">' + ratingValue.toFixed(1) + '</span></span>');
  }
  const officialMvp = playerIsOfficialMvp(player);
  const selectedMvp = statsMap.mvpKey && statsMap.mvpKey === playerKey(player);
  if (officialMvp || selectedMvp) {
    const mvpTitle = statsMap.mvpFallback && !officialMvp
      ? "Meilleure note disponible — MVP non communiqué par la source"
      : "Joueur du match";
    badges.push('<span class="bfmd-chip bfmd-chip--mvp" title="' + esc(mvpTitle) + '">' + performanceIcon("mvp") + '</span>');
  }
  if (!badges.length) return "";
  return '<div class="bfmd-event-mini" aria-label="Performance de ' + esc(getPlayerName(player)) + '">' + badges.join("") + '</div>';
}
  /* =========================================================
     RENDER PITCH  /* =========================================================
     RENDER PITCH  /* =========================================================
     RENDER PITCH
  ========================================================= */

  function pitchNumberBadge(player) {
    const number = String(getPlayerNumber(player) ?? "").trim();
    if (!number || number === "—" || !getPlayerPhoto(player)) return "";
    return '<span class="bfmd-pitch-shirt" style="position:absolute;top:-4px;left:calc(50% + 5px);z-index:20;min-width:18px;height:18px;padding:0 3px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.9);border-radius:5px;background:#07121d;color:#fff;font-size:9px;line-height:1;font-weight:950;box-shadow:0 2px 5px #0008;">' + esc(number) + '</span>';
  }

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
      const player = item.player, name = getPlayerName(player);
      return '<div class="bfmd-player" style="left:' + item.x + '%;top:' + item.y + '%;" title="' + esc(name) + '">' +
        playerAvatar(player) + pitchNumberBadge(player) + '<div class="bfmd-name">' + esc(name) + '</div>' +
        playerBadges(player, statsMap) + '</div>';
    }).join("");
    return '<div class="bfmd-pitch-card" data-side="' + side + '">' + teamHeader +
      '<div class="bfmd-pitch bfmd-pitch--' + side + '">' + markings + playersHTML + '</div>' +
      '<div class="bfmd-pitch-foot"><span>' + esc(team.name || "Équipe") + '</span><span>' + arr(lineup.xi).length + ' titulaires</span></div>' +
      '<div class="bfmd-pitch-bench">' + renderBenchPerformance(lineup, statsMap) + '</div></div>';
  }

  function renderCombinedPitch(homeLineup, awayLineup, statsMap) {
    const markings = '<div class="bfmd-border"></div><div class="bfmd-half"></div><div class="bfmd-circle"></div><div class="bfmd-center-dot"></div><div class="bfmd-box-line top"></div><div class="bfmd-box-line bottom"></div><div class="bfmd-goal-box top"></div><div class="bfmd-goal-box bottom"></div><div class="bfmd-penalty-spot top"></div><div class="bfmd-penalty-spot bottom"></div>';
    const playerDetail = player => {
      const stats = statsMap.get(playerKey(player)) || {};
      const rating = getPlayerRating(player);
      const name = getPlayerName(player) || "Joueur";
      const photo = getPlayerPhoto(player);
      const shirtNumber = getPlayerNumber(player);
      const shirtLabel = shirtNumber && String(shirtNumber) !== "—" ? "N° " + shirtNumber : "Numéro non communiqué";
      const summary = [];
      if (rating !== null && rating !== undefined && rating !== "") summary.push("Note " + Number(rating).toFixed(1) + "/10");
      if (stats.goals) summary.push("Buts " + stats.goals);
      if (stats.assists) summary.push("Passes décisives " + stats.assists);
      if (stats.yellow) summary.push("Cartons jaunes " + stats.yellow);
      if (stats.red) summary.push("Cartons rouges " + stats.red);
      if (stats.in) summary.push("Entrées " + stats.in);
      if (stats.out) summary.push("Sorties " + stats.out);
      if (stats.injury) summary.push("Blessure signalée");
      return '<template class="bfmd-player-detail-template"><div class="bfmd-selected-player-inner">' +
        (photo ? '<img class="bfmd-selected-player-photo" src="' + esc(photo) + '" alt="" loading="lazy">' : '<span class="bfmd-selected-player-photo bfmd-selected-player-photo--fallback">⚽</span>') +
        '<div class="bfmd-selected-player-copy"><strong>' + esc(name) + '</strong><span>' + esc(shirtLabel) + '</span>' +
        '<p>' + esc(summary.length ? summary.join(" · ") : "Aucune statistique individuelle fournie pour ce joueur.") + '</p>' +
        '<div class="bfmd-selected-player-events">' + playerBadges(player, statsMap) + '</div></div></div></template>';
    };
    const placeTeam = (lineup, side) => {
      const positions = pitchPositions(lineup, side);
      if (!positions.length) return '<div class="bfmd-combined-empty bfmd-combined-empty--' + side + '">' + esc(lineup?.team?.name || "Équipe") + ' · positions non disponibles</div>';
      let orientedPositions = positions;
      const keepers = positions.filter(item => /goalkeeper|goalie|\bgk\b|gardien|portier|portero|guardameta/i.test(String(getPlayerPosition(item.player) || "")));
      const keeperAverage = keepers.length ? keepers.reduce((sum,item)=>sum+item.y,0)/keepers.length : null;
      /* If provider orientation is inconsistent, rotate the entire side, not just its depth. */
      if (keeperAverage !== null && ((side === "home" && keeperAverage > 50) || (side === "away" && keeperAverage < 50))) {
        orientedPositions = positions.map(item => ({...item,x:100-item.x,y:100-item.y}));
      }
      return orientedPositions.map(item => {
        const player = item.player;
        const fieldX = side === "home" ? 5 + item.y * 0.43 : 57 + item.y * 0.38;
        const fieldY = side === "home" ? 8 + item.x * 0.84 : 92 - item.x * 0.84;
        const performanceSide = side === "home" ? "right" : "left";
        return '<div role="button" tabindex="0" aria-expanded="false" data-bf-player-toggle="1" class="bfmd-player bfmd-combined-player bfmd-combined-player--' + side + ' bfmd-combined-player--perf-' + performanceSide + '" style="left:' + Math.max(10,Math.min(90,fieldX)) + '%;top:' + Math.max(10,Math.min(90,fieldY)) + '%" title="Cliquer pour afficher les détails de ' + esc(getPlayerName(player)) + '">' +
          playerAvatar(player) + pitchNumberBadge(player) + '<div class="bfmd-name">' + esc(getPlayerName(player)) + '</div>' + playerBadges(player, statsMap) +
          playerDetail(player) + '</div>';
      }).join("");
    };
    const teamHead = (lineup, fallback) => '<div class="bfmd-combined-team"><span>' +
      (lineup?.team?.logo ? '<img src="' + esc(lineup.team.logo) + '" alt="" loading="lazy">' : '⚽') +
      '</span><strong>' + esc(lineup?.team?.name || fallback) + '</strong><em>' + esc(lineup?.formation || "—") + '</em></div>';
    return '<div class="bfmd-combined-pitch-card"><div class="bfmd-combined-head">' +
      teamHead(homeLineup,"Domicile") + '<span class="bfmd-combined-vs">VS</span>' + teamHead(awayLineup,"Extérieur") +
      '</div><div class="bfmd-pitch bfmd-pitch--combined">' + markings + placeTeam(homeLineup,"home") + placeTeam(awayLineup,"away") +
      '</div><div class="bfmd-selected-player-panel" hidden></div><div class="bfmd-combined-caption"><span>DOMICILE · CÔTÉ GAUCHE</span><span>EXTÉRIEUR · CÔTÉ DROIT</span><small>Clique sur un joueur pour ouvrir sa fiche</small></div>' +
      '<div class="bfmd-combined-benches"><div><h4>' + esc(homeLineup?.team?.name || "Domicile") + ' · Banc</h4>' + renderBenchPerformance(homeLineup,statsMap) + '</div><div><h4>' + esc(awayLineup?.team?.name || "Extérieur") + ' · Banc</h4>' + renderBenchPerformance(awayLineup,statsMap) + '</div></div></div>';
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
    if (kind === "yellow" || kind === "red") {
      return '<span class="bfmd-performance-glyph-card bfmd-performance-glyph-card--' + esc(kind) + '" aria-hidden="true"></span>';
    }
    const drawings = {
      goal: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M9 8.5 12 6.8l3 1.7v3.4l-3 1.8-3-1.8zM9 8.5 6.7 10M15 8.5l2.3 1.5M9 11.9l-1.6 3M15 11.9l1.6 3M12 15.4v3.3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
      penalty: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
      own: '<path d="M6 18 18 6M9 6h9v9" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 5v5M5 5h5" stroke="currentColor" stroke-width="1.7" fill="none"/>',
      assist: '<circle cx="6" cy="18" r="2.2" fill="currentColor"/><path d="M8 16 17.5 6.5M11 6.5h6.5V13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      injury: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="currentColor"/>',
      subIn: '<path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      subOut: '<path d="M20 12H5M11 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      substitution: '<path d="M4 7h14l-3-3M20 17H6l3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      mvp: '<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.4l6.3-.9z" fill="currentColor"/>',
      rating: '<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.4l6.3-.9z" fill="currentColor"/>',
      var: '<path d="M4 5h16v14H4z" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="m8 9 4 6 4-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
      missed: '<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    };
    return '<svg class="bfmd-vector-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (drawings[kind] || '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/>') + '</svg>';
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

  // Match summary panel intentionally removed.

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
     MATCH BROADCAST METADATA — display only source-provided values
  ========================================================= */
  function bfMatchMetaText(value, depth = 0) {
    if (value === null || value === undefined || depth > 4) return "";
    if (typeof value === "string" || typeof value === "number") return String(value).trim();
    if (Array.isArray(value)) {
      return [...new Set(value.map(item => bfMatchMetaText(item, depth + 1)).filter(Boolean))].join(" · ");
    }
    if (typeof value !== "object") return "";
    const direct = first(
      value.name, value.displayName, value.display_name, value.fullName, value.full_name,
      value.shortName, value.short_name, value.label, value.title, value.channelName,
      value.channel_name, value.networkName, value.network_name, value.officialName,
      value.official_name, value.value?.name, value.value?.text
    );
    if (direct !== null && direct !== undefined && typeof direct !== "object" && String(direct).trim()) return String(direct).trim();
    for (const key of ["names", "items", "officials", "channels", "broadcasters", "commentators", "staff", "main", "referee"]) {
      const textValue = bfMatchMetaText(value[key], depth + 1);
      if (textValue) return textValue;
    }
    return "";
  }

  function bfFindMatchMeta(details, aliases) {
    const normalizeKey = value => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
    const targets = new Set(aliases.map(normalizeKey));
    const roots = [
      details, details?.fixture, details?.match, details?.metadata, details?.media,
      details?.broadcast, details?.broadcasts, details?.tv, details?.coverage,
      details?.officials, details?.matchOfficials, details?.match_officials,
      details?.data, details?.response, details?.result
    ].flatMap(value => Array.isArray(value) ? value : [value])
      .filter(value => value && typeof value === "object" && !Array.isArray(value));
    for (const root of roots) {
      for (const [key, value] of Object.entries(root)) {
        if (targets.has(normalizeKey(key))) {
          const textValue = bfMatchMetaText(value);
          if (textValue) return textValue;
        }
      }
    }
    return "";
  }

  /* =========================================================
     COMPETITION
  ========================================================= */

  function getCompetition(
    details
  ) {
    return first(
      details?.league?.name,
      details?.tournament?.name,
      details?.fixture?.league?.name,
      details?.fixture?.competition?.name,
      details?.competition?.name,
      typeof details?.competition === "string" ? details.competition : null,
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

function bfFixtureTextName(value) {
 if(typeof value==="string")return value.trim();
 if(!value||typeof value!=="object")return "";
 return String(value.name||value.displayName||value.display_name||value.shortName||value.short_name||value.teamName||value.team_name||"").trim();
}
function bfFixtureRoot(source) {
 let node=source;
 for(let i=0;i<4&&node&&typeof node==="object";i++){
  if(node.data&&typeof node.data==="object"&&(node.data.fixture||node.data.teams||node.data.lineups||node.data.events||node.data.match)){node=node.data;continue;}
  if(node.match&&typeof node.match==="object"&&(node.match.fixture||node.match.teams||node.match.lineups)){node=node.match;continue;}
  break;
 }
 return node||{};
}
function bfFixtureTeamName(source,side) {
 const node=bfFixtureRoot(source),home=side==="home";
 const values=home
  ?[node.teams?.home,node.fixture?.teams?.home,node.fixture?.homeTeam,node.fixture?.home_team,node.home_team,node.homeTeam,node.home,node.host,node.localTeam,node.competitors?.[0],node.lineups?.[0]?.team]
  :[node.teams?.away,node.fixture?.teams?.away,node.fixture?.awayTeam,node.fixture?.away_team,node.away_team,node.awayTeam,node.away,node.guest,node.visitorTeam,node.competitors?.[1],node.lineups?.[1]?.team];
 for(const value of values){const name=bfFixtureTextName(value);if(name&&!/^(home|away|home team|away team|domicile|extérieur|exterieur|local|visitor)$/i.test(name))return name;}
 return "";
}
function bfFixtureTime(source) {
 const node=bfFixtureRoot(source);
 const values=[node.fixture?.date,node.fixture?.utcDate,node.fixture?.dateTime,node.fixture?.kickoff,node.fixture?.timestamp,node.fixture?.startTimestamp,node.event?.date,node.event?.startTimestamp,node.utcDate,node.date,node.dateTime,node.kickoff,node.kickoff_time,node.startTime,node.start_time,node.timestamp,node.time,node.fixtureDate,node.fixture_date,node.gameDate];
 for(const value of values){
  if(value===null||value===undefined||value==="")continue;
  let result;
  if(typeof value==="number"||/^\d{10,13}$/.test(String(value).trim())){const n=Number(value);result=new Date(n<100000000000?n*1000:n).getTime();}
  else result=Date.parse(String(value));
  if(Number.isFinite(result))return result;
 }
 return null;
}
function bfFixtureNameKey(value) {
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/\b(football club|soccer club|fc|cf|sc|afc|f\.c\.|c\.f\.)\b/g," ")
  .replace(/[^a-z0-9\u0600-\u06ff]+/g,"").trim();
}
function bfFixtureNamesCompatible(a,b){if(!a||!b)return false;if(a===b)return true;return a.length>=5&&b.length>=5&&(a.includes(b)||b.includes(a));}
function bfSameFixtureMetadata(candidate,expected,requireDate=false) {
 const ah=bfFixtureTeamName(candidate,"home"),aa=bfFixtureTeamName(candidate,"away"),eh=bfFixtureTeamName(expected,"home"),ea=bfFixtureTeamName(expected,"away");
 if(eh&&ea){
  if(!ah||!aa)return false;
  const x=bfFixtureNameKey(ah),y=bfFixtureNameKey(aa),u=bfFixtureNameKey(eh),v=bfFixtureNameKey(ea);
  if(!((bfFixtureNamesCompatible(x,u)&&bfFixtureNamesCompatible(y,v))||(bfFixtureNamesCompatible(x,v)&&bfFixtureNamesCompatible(y,u))))return false;
 }
 const et=bfFixtureTime(expected),at=bfFixtureTime(candidate);
 if(et!==null&&requireDate&&at===null)return false;
 if(et!==null&&at!==null&&Math.abs(et-at)>36*60*60*1000)return false;
 return true;
}

  function bfFindExpectedMatch(identifier) {
    const id=String(identifier||"").trim().toLowerCase();
    if(window.__bfActiveExpectedMatch&&String(window.__bfActiveExpectedIdentifier||"").trim().toLowerCase()===id)return window.__bfActiveExpectedMatch;
    try{
      const matches=typeof currentMatches!=="undefined"&&Array.isArray(currentMatches)?currentMatches:[];
      const keys=match=>[match?.fixture?.upstreamId,match?.upstreamId,match?.fixture?.id,match?.fixture?.slug,match?.slug,match?.id,match?.match_id,match?.fixture_id].filter(v=>v!==null&&v!==undefined).map(v=>String(v).trim().toLowerCase());
      const scoreMatch=matches.find(match=>keys(match).includes(id));
      if(scoreMatch)return scoreMatch;
      const homeRegistry=window.__bfHomeMatchRegistry;
      if(homeRegistry instanceof Map&&homeRegistry.has(id))return homeRegistry.get(id);
      if(homeRegistry instanceof Map){
        for(const [key,match] of homeRegistry.entries()){
          if(keys(match).includes(id)||String(key).trim().toLowerCase()===id)return match;
        }
      }
      return null;
    }catch(error){return null;}
  }


  function setupMatchCenterNavigation(matchIdentifier, teams, competition, matchDate, rootElement = null) {
    const content = rootElement || document.getElementById("bfmdContent");
    if (!content) return;
    addStyles();
    if (content.dataset.bfPlayerDetailEvents !== "1") {
      content.dataset.bfPlayerDetailEvents = "1";
      const togglePlayer = target => {
        const player = target?.closest?.(".bfmd-combined-player");
        if (!player || !content.contains(player)) return;
        const pitchCard = player.closest(".bfmd-combined-pitch-card");
        const panel = pitchCard?.querySelector(".bfmd-selected-player-panel");
        const template = player.querySelector("template.bfmd-player-detail-template");
        if (!panel || !template) return;
        const isOpen = player.getAttribute("aria-expanded") === "true";
        pitchCard.querySelectorAll(".bfmd-combined-player[aria-expanded='true']").forEach(other => {
          other.setAttribute("aria-expanded","false");
          other.classList.remove("bfmd-combined-player--active");
        });
        if (isOpen) { panel.hidden = true; panel.innerHTML = ""; return; }
        player.setAttribute("aria-expanded","true");
        player.classList.add("bfmd-combined-player--active");
        panel.innerHTML = template.innerHTML;
        panel.hidden = false;
      };
      content.addEventListener("click", event => togglePlayer(event.target));
      content.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && event.target?.closest?.(".bfmd-combined-player")) {
          event.preventDefault(); togglePlayer(event.target);
        }
      });
    }
    content.querySelector(".bfmd-center-nav")?.remove();
    content.querySelector(".bfmd-match-comments")?.remove();
    content.querySelector(".bfmd-match-center-extras")?.remove();
    content.querySelector(".bfmd-match-vote")?.remove();
    const matchKey = String(matchIdentifier || "").slice(0,120);
    const homeName = String(teams?.home?.name || "").trim();
    const awayName = String(teams?.away?.name || "").trim();
    const voteSection = document.createElement("section");
    voteSection.className = "bfmd-section bfmd-match-vote";
    voteSection.innerHTML =
      '<div class="bfmd-title">🗳️ Qui va gagner ?</div>' +
      '<p class="bfmd-extra-copy">Vote pour l’équipe que tu vois gagner ce match. Tu peux changer ton choix.</p>' +
      '<div class="bfmd-vote-options">' +
      '<button type="button" class="bfmd-vote-option" data-bf-vote="home" aria-pressed="false">' +
      (teams?.home?.logo ? '<img src="' + esc(teams.home.logo) + '" alt="" loading="lazy">' : '<span class="bfmd-vote-mark">⚽</span>') +
      '<span class="bfmd-vote-team">' + esc(homeName || "Domicile") + '</span><strong data-bf-vote-count="home">—</strong></button>' +
      '<button type="button" class="bfmd-vote-option" data-bf-vote="away" aria-pressed="false">' +
      (teams?.away?.logo ? '<img src="' + esc(teams.away.logo) + '" alt="" loading="lazy">' : '<span class="bfmd-vote-mark">⚽</span>') +
      '<span class="bfmd-vote-team">' + esc(awayName || "Extérieur") + '</span><strong data-bf-vote-count="away">—</strong></button></div>' +
      '<div class="bfmd-vote-bar" aria-hidden="true"><span data-bf-vote-bar="home"></span><span data-bf-vote-bar="away"></span></div>' +
      '<div class="bfmd-vote-status" role="status">Chargement des votes…</div>';
    const metaAnchor = content.querySelector(".bfmd-info") || content.querySelector(".bfmd-header") ||
      content.querySelector(".bf-new-safe-info") || content.querySelector(".bf-new-safe-head") || content.firstChild;
    if (metaAnchor) metaAnchor.insertAdjacentElement("afterend", voteSection);
    else content.appendChild(voteSection);

    if (!rootElement && matchKey && !/^(sofa|espn|tsdb)-/i.test(matchKey)) {
      fetch("/api/match-event-enrichment?fixture=" + encodeURIComponent(matchKey), {
        cache:"no-store", headers:{Accept:"application/json"}
      }).then(response => response.ok ? response.json() : Promise.reject(new Error("metadata_unavailable")))
        .then(payload => {
          const metadata = payload?.data || {};
          const values = {
            venue: metadata.venue,
            referee: metadata.referee,
            channel: metadata.broadcastChannel,
            commentator: metadata.commentator
          };
          const labels = {
            venue: value => "🏟️ Stade : " + value,
            referee: value => "👨‍⚖️ Arbitre : " + value,
            channel: value => "📺 Chaîne : " + value,
            commentator: value => "🎙️ Commentateur : " + value
          };
          Object.entries(values).forEach(([key,value]) => {
            if (!value) return;
            const node = content.querySelector('[data-bf-meta="' + key + '"]');
            const valueNode = node?.querySelector('[data-bf-meta-value="' + key + '"]');
            if (valueNode && /^(?:Non communiqu[ée]|Not provided|غير متوفر(?:ة)?)$/i.test(valueNode.textContent.trim())) valueNode.textContent = String(value);
          });
        }).catch(() => {});
    }

    const voteStatus = voteSection.querySelector(".bfmd-vote-status");
    const voteButtons = Array.from(voteSection.querySelectorAll("[data-bf-vote]"));
    const renderVotes = payload => {
      const votes = payload?.votes || {};
      const homeVotes = Math.max(0, Number(votes.home) || 0);
      const awayVotes = Math.max(0, Number(votes.away) || 0);
      const total = homeVotes + awayVotes;
      const homePct = total ? Math.round(homeVotes * 100 / total) : 0;
      const awayPct = total ? 100 - homePct : 0;
      voteSection.querySelector('[data-bf-vote-count="home"]').textContent = homeVotes + " · " + homePct + "%";
      voteSection.querySelector('[data-bf-vote-count="away"]').textContent = awayVotes + " · " + awayPct + "%";
      voteSection.querySelector('[data-bf-vote-bar="home"]').style.width = homePct + "%";
      voteSection.querySelector('[data-bf-vote-bar="away"]').style.width = awayPct + "%";
      voteButtons.forEach(button => {
        const selected = payload?.voted === button.dataset.bfVote;
        button.classList.toggle("bfmd-vote-option--selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    };
    const voteStorageKey = "bf:local-votes:" + matchKey;
    let localVoteMode = false;
    const readLocalVote = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(voteStorageKey) || "{}");
        return {
          votes: {
            home: Math.max(0, Number(saved?.votes?.home) || 0),
            away: Math.max(0, Number(saved?.votes?.away) || 0)
          },
          voted: saved?.voted === "home" || saved?.voted === "away" ? saved.voted : null
        };
      } catch (_) {
        return { votes:{home:0,away:0}, voted:null };
      }
    };
    const saveLocalVote = team => {
      const saved = readLocalVote();
      if (saved.voted !== team) {
        if (saved.voted === "home" || saved.voted === "away") {
          saved.votes[saved.voted] = Math.max(0, saved.votes[saved.voted] - 1);
        }
        saved.votes[team] = Math.max(0, saved.votes[team] + 1);
        saved.voted = team;
        try { localStorage.setItem(voteStorageKey, JSON.stringify(saved)); } catch (_) {}
      }
      return saved;
    };
    const localVoteMessage = "Vote enregistré sur cet appareil.";
    const applyLocalVote = team => {
      localVoteMode = true;
      const local = saveLocalVote(team);
      renderVotes(local);
      voteStatus.textContent = localVoteMessage;
    };
    const voteURL = "/api/community?match=" + encodeURIComponent(matchKey) + "&vote=1";
    const loadVotes = async () => {
      try {
        const response = await fetch(voteURL, {cache:"no-store",headers:{Accept:"application/json"}});
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          localVoteMode = true;
          renderVotes(readLocalVote());
          voteStatus.textContent = "";
          return;
        }
        renderVotes(payload);
        voteStatus.textContent = payload?.voted
          ? "Ton vote est enregistré. Tu peux changer de choix."
          : "Choisis une équipe pour enregistrer ton vote.";
      } catch (_) {
        localVoteMode = true;
        renderVotes(readLocalVote());
        voteStatus.textContent = "";
      }
    };
    voteButtons.forEach(button => button.addEventListener("click", async () => {
      const team = button.dataset.bfVote;
      if (localVoteMode) {
        applyLocalVote(team);
        return;
      }
      voteButtons.forEach(item => item.disabled = true);
      voteStatus.textContent = "Enregistrement du vote…";
      try {
        const response = await fetch(voteURL, {
          method:"POST",cache:"no-store",
          headers:{"Content-Type":"application/json",Accept:"application/json"},
          body:JSON.stringify({type:"vote",team,match:matchKey})
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 429) {
            voteStatus.textContent = payload.message || "Attends un peu avant de voter à nouveau.";
          } else {
            applyLocalVote(team);
          }
          return;
        }
        renderVotes(payload);
        voteStatus.textContent = "Vote enregistré. Tu peux changer ton choix.";
      } catch (_) {
        applyLocalVote(team);
      } finally {
        voteButtons.forEach(item => item.disabled = false);
      }
    }));
    loadVotes();

    const comments = document.createElement("section");
    comments.className = "bfmd-section bfmd-match-comments";
    comments.innerHTML = '<div class="bfmd-title">💬 Commentaires de cette rencontre</div>' +
      '<p style="opacity:.75;font-size:13px">Discussion dédiée à ' + esc(teams?.home?.name || "l’équipe à domicile") + ' – ' + esc(teams?.away?.name || "l’équipe visiteuse") + '.</p>' +
      '<form style="display:grid;gap:10px;margin-bottom:16px">' +
      '<input name="author" maxlength="28" minlength="2" required placeholder="Ton pseudo" aria-label="Ton pseudo" style="box-sizing:border-box;width:100%;padding:12px;border:1px solid rgba(148,163,184,.25);border-radius:10px;background:rgba(127,127,127,.08);color:inherit">' +
      '<textarea name="message" maxlength="500" minlength="3" rows="3" required placeholder="Ton commentaire sur le match…" aria-label="Ton commentaire" style="box-sizing:border-box;width:100%;padding:12px;border:1px solid rgba(148,163,184,.25);border-radius:10px;background:rgba(127,127,127,.08);color:inherit;font:inherit"></textarea>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="submit" style="border:0;border-radius:10px;padding:11px 16px;background:#0b9b69;color:white;font-weight:900;cursor:pointer">Publier le commentaire</button><span role="status" style="font-size:12px"></span></div></form>' +
      '<div class="bfmd-match-comment-list"><div class="bfmd-empty">Chargement des commentaires…</div></div>';
    content.appendChild(comments);

    const extras = document.createElement("div");
    extras.className = "bfmd-match-center-extras";
    const competitionName = String(competition || "").trim();
    const highlightURL = "https://www.youtube.com/results?search_query=" + encodeURIComponent([homeName,awayName,competitionName,"highlights"].filter(Boolean).join(" "));
    extras.innerHTML =
      '<section class="bfmd-section bfmd-linked-recent"><div class="bfmd-title">🕘 Dernières confrontations directes</div>' +
      '<p class="bfmd-extra-copy">' + esc(homeName || "Domicile") + ' – ' + esc(awayName || "Extérieur") + '</p>' +
      '<div class="bfmd-h2h-list"><div class="bfmd-empty">Recherche des anciennes confrontations…</div></div></section>' +
      '<section class="bfmd-section bfmd-linked-standings"><div class="bfmd-title">🏆 Classement de ' + esc(competitionName || "la compétition") + '</div>' +
      '<div class="bfmd-standings-table"><div class="bfmd-empty">Chargement du classement…</div></div>' +
      '<button type="button" class="bfmd-extra-button bfmd-open-standings">Ouvrir le classement complet ↗</button></section>' +
      '<section class="bfmd-section bfmd-linked-highlights"><div class="bfmd-title">🎬 Highlights & résumés vidéo</div>' +
      '<p class="bfmd-extra-copy">Recherche les résumés liés à ' + esc(homeName || "l’équipe à domicile") + ' – ' + esc(awayName || "l’équipe visiteuse") + '.</p>' +
      '<a class="bfmd-extra-button" href="' + esc(highlightURL) + '" target="_blank" rel="noopener noreferrer">Voir les vidéos du match ↗</a></section>' +
      '<section class="bfmd-section bfmd-linked-news"><div class="bfmd-title">📰 Actualités liées au match</div>' +
      '<p class="bfmd-extra-copy">Articles liés aux équipes et à leur compétition.</p>' +
      '<div class="bfmd-linked-news-list"><div class="bfmd-empty">Chargement des actualités…</div></div></section>';
    content.appendChild(extras);

    const standingsButton = extras.querySelector(".bfmd-open-standings");
    standingsButton.addEventListener("click", () => {
      if (typeof window.openBakhiraCompetitionStandings === "function" && competitionName) {
        window.openBakhiraCompetitionStandings(competitionName);
      } else if (typeof window.go === "function") {
        window.go("leagues");
      }
    });

    const h2hList = extras.querySelector(".bfmd-h2h-list");
    const standingsList = extras.querySelector(".bfmd-standings-table");
    const matchCenterURL = "/api/match-center?home=" + encodeURIComponent(homeName) +
      "&away=" + encodeURIComponent(awayName) + "&competition=" + encodeURIComponent(competitionName) +
      "&date=" + encodeURIComponent(String(matchDate || ""));
    fetch(matchCenterURL, {cache:"no-store",headers:{Accept:"application/json"}})
      .then(response => response.ok ? response.json() : Promise.reject(new Error("match_center_unavailable")))
      .then(payload => {
        const metadata = payload.metadata || {};
        const metadataLabels = {
          venue: value => "🏟️ Stade : " + value,
          referee: value => "👨‍⚖️ Arbitre : " + value,
          channel: value => "📺 Chaîne : " + value,
          commentator: value => "🎙️ Commentateur : " + value
        };
        const metadataValues = {
          venue: metadata.venue,
          referee: metadata.referee,
          channel: metadata.broadcastChannel,
          commentator: metadata.commentator
        };
        Object.entries(metadataValues).forEach(([key,value]) => {
          if (!value) return;
          const node = content.querySelector('[data-bf-meta="' + key + '"]');
          const valueNode = node?.querySelector('[data-bf-meta-value="' + key + '"]');
          if (valueNode && /^(?:Non communiqu[ée]|Not provided|غير متوفر(?:ة)?)$/i.test(valueNode.textContent.trim())) valueNode.textContent = String(value);
        });
        const h2h = Array.isArray(payload.headToHead) ? payload.headToHead : [];
        h2hList.innerHTML = h2h.length ? h2h.map(item => {
          const date = item.date && !Number.isNaN(Date.parse(item.date))
            ? new Date(item.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "Date inconnue";
          return '<article class="bfmd-h2h-row"><small>' + esc(date) + (item.competition ? ' · ' + esc(item.competition) : '') + '</small>' +
            '<div><strong>' + esc(item.home || "Domicile") + '</strong><b>' + esc(item.score || "—") + '</b><strong>' + esc(item.away || "Extérieur") + '</strong></div></article>';
        }).join("") : '<div class="bfmd-empty">Aucune confrontation directe récente disponible pour ces équipes.</div>';

        const table = payload.standings || {};
        const rows = Array.isArray(table.rows) ? table.rows : [];
        standingsList.innerHTML = rows.length
          ? '<div class="bfmd-standings-scroll"><table class="bfmd-mini-table"><thead><tr><th>#</th><th>Équipe</th><th>MJ</th><th>V</th><th>N</th><th>D</th><th>Pts</th></tr></thead><tbody>' +
            rows.map(row => '<tr><td>' + esc(row.rank || "—") + '</td><td><span class="bfmd-mini-team">' +
              (row.logo ? '<img src="' + esc(row.logo) + '" alt="" loading="lazy">' : '') + '<span>' + esc(row.team || "Équipe") + '</span></span></td>' +
              '<td>' + esc(row.played || "—") + '</td><td>' + esc(row.won || "—") + '</td><td>' + esc(row.drawn || "—") + '</td><td>' + esc(row.lost || "—") + '</td><td><strong>' + esc(row.points || "—") + '</strong></td></tr>').join("") +
            '</tbody></table></div>'
          : '<div class="bfmd-empty">Le classement n’est pas disponible pour cette compétition depuis la source actuelle.</div>';
      })
      .catch(() => {
        h2hList.innerHTML = '<div class="bfmd-empty">Les confrontations ne sont pas disponibles pour le moment.</div>';
        standingsList.innerHTML = '<div class="bfmd-empty">Le classement n’est pas disponible pour le moment.</div>';
      });

    const newsList = extras.querySelector(".bfmd-linked-news-list");
    fetch("/api/news", {cache:"no-store",headers:{Accept:"application/json"}})
      .then(response => response.ok ? response.json() : Promise.reject(new Error("news_unavailable")))
      .then(payload => {
        const articles = Array.isArray(payload.articles) ? payload.articles : [];
        const tokens = [homeName, awayName, competitionName].map(value => value.toLocaleLowerCase()).filter(value => value.length >= 3);
        const related = articles.filter(article => {
          const articleText = (String(article.title || "") + " " + String(article.description || "")).toLocaleLowerCase();
          return tokens.some(token => articleText.includes(token));
        }).slice(0, 4);
        newsList.innerHTML = related.length ? related.map(article =>
          '<a class="bfmd-news-card" href="' + esc(article.url || "#") + '" target="_blank" rel="noopener noreferrer">' +
          (article.image ? '<img src="' + esc(article.image) + '" alt="" loading="lazy">' : '<span class="bfmd-news-card-mark">BF</span>') +
          '<span><strong>' + esc(article.title || "Actualité football") + '</strong><small>' + esc(article.source || "Source football") + '</small></span></a>'
        ).join("") : '<div class="bfmd-empty">Aucune actualité directement liée aux équipes ou à la compétition pour le moment.</div>';
      })
      .catch(() => { newsList.innerHTML = '<div class="bfmd-empty">Les actualités ne sont pas disponibles pour le moment.</div>'; });
    content.appendChild(extras);

    const api = "/api/community?match=" + encodeURIComponent(matchKey);
    const localCommentsKey = "bf:local-comments:" + matchKey;
    let localCommentsMode = false;
    const form = comments.querySelector("form");
    const status = form.querySelector('[role="status"]');
    const list = comments.querySelector(".bfmd-match-comment-list");
    const readLocalComments = () => {
      try {
        const value = JSON.parse(localStorage.getItem(localCommentsKey) || "[]");
        return Array.isArray(value) ? value.filter(item => item && typeof item.message === "string") : [];
      } catch (_) { return []; }
    };
    const renderComments = rows => {
      list.innerHTML = rows.length ? rows.map(item => {
        const date = item.createdAt ? new Date(item.createdAt) : null;
        const dateText = date && !Number.isNaN(date.getTime())
          ? date.toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"}) : "";
        return '<article style="padding:12px;border:1px solid rgba(148,163,184,.2);border-radius:11px;margin:8px 0;overflow-wrap:anywhere"><strong>' +
          esc(item.author || "Supporter") + '</strong><small style="float:right;opacity:.7">' + esc(dateText) +
          '</small><p style="white-space:pre-wrap;line-height:1.55;margin:7px 0 0">' + esc(item.message || "") + '</p></article>';
      }).join("") : '<div class="bfmd-empty">Pas encore de commentaire pour ce match. Lance la discussion !</div>';
    };
    const saveLocalComment = (author, message) => {
      const rows = readLocalComments();
      rows.unshift({id:"local-" + Date.now() + "-" + Math.random().toString(36).slice(2,7),author,message,createdAt:new Date().toISOString()});
      try {
        localStorage.setItem(localCommentsKey, JSON.stringify(rows.slice(0,50)));
        localCommentsMode = true;
        return true;
      } catch (_) {
        localCommentsMode = true;
        return false;
      }
    };
    const localCommentMessage = "Commentaire enregistré sur cet appareil.";
    async function load() {
      if (localCommentsMode) {
        renderComments(readLocalComments());
        return;
      }
      try {
        const response = await fetch(api,{cache:"no-store",headers:{Accept:"application/json"}});
        const data = await response.json().catch(()=>({}));
        if (!response.ok) {
          localCommentsMode = true;
          renderComments(readLocalComments());
          status.textContent = "";
          return;
        }
        renderComments(Array.isArray(data.comments) ? data.comments : []);
      } catch (_) {
        localCommentsMode = true;
        renderComments(readLocalComments());
        status.textContent = "";
      }
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const author = String(form.elements.author.value || "").trim();
      const message = String(form.elements.message.value || "").trim();
      const button = form.querySelector("button");
      if (author.length < 2 || message.length < 3) {
        status.textContent = "Vérifie le pseudo et le commentaire.";
        return;
      }
      button.disabled = true;
      status.textContent = "Publication…";
      const localSave = async () => {
        const saved = saveLocalComment(author, message);
        if (saved) {
          form.elements.message.value = "";
          renderComments(readLocalComments());
          status.textContent = localCommentMessage;
        } else {
          status.textContent = "Le navigateur n’a pas permis de sauvegarder ce commentaire localement.";
        }
      };
      try {
        if (localCommentsMode) {
          await localSave();
          return;
        }
        const response = await fetch(api,{
          method:"POST",cache:"no-store",
          headers:{"Content-Type":"application/json",Accept:"application/json"},
          body:JSON.stringify({author,message,match:matchKey})
        });
        const data = await response.json().catch(()=>({}));
        if (!response.ok) {
          if (response.status === 429) {
            status.textContent = data.message || "Attends un peu avant de republier.";
          } else if (response.status === 400 && data.error === "invalid_comment") {
            status.textContent = data.message || "Vérifie le pseudo et le commentaire.";
          } else {
            await localSave();
          }
          return;
        }
        form.elements.message.value = "";
        status.textContent = "Commentaire publié.";
        await load();
      } catch (_) {
        await localSave();
      } finally {
        button.disabled = false;
      }
    });
    load();
    const sectionSelector = ".bfmd-section,.bf-new-safe-section";
    const isHeaderSection = section => section.matches(".bfmd-header,.bfmd-info,.bf-new-safe-head,.bf-new-safe-info");
    const getSectionTitle = section => String(section.querySelector(".bfmd-title,.bf-new-safe-title")?.textContent || "").trim();
    const allSections = Array.from(content.querySelectorAll(sectionSelector));
    const headingMatches = regex => allSections.filter(section => regex.test(getSectionTitle(section).toLowerCase()));
    const tabDefinitions = [
      {key:"summary",label:"Résumé",find:()=>headingMatches(/événements|evenements|résumé/).slice(0,1)},
      {key:"lineup",label:"Compos & terrain",find:()=> {
        const explicit = content.querySelector(".bfmd-match-analysis");
        if (explicit) return [explicit];
        return headingMatches(/formations et compositions|compositions.*performances|terrain/).slice(0,1);
      }},
      {key:"stats",label:"Stats du match",find:()=> {
        const explicit = Array.from(content.querySelectorAll(".bfmd-statistics-section"));
        return explicit.length ? explicit : headingMatches(/statistiques du match/).slice(0,1);
      }},
      {key:"players",label:"Joueurs",find:()=>Array.from(content.querySelectorAll(".bfmd-player-statistics-details,.bfmd-player-statistics,.bf-new-safe-player-list"))},
      {key:"h2h",label:"Derniers matchs",find:()=>Array.from(content.querySelectorAll(".bfmd-linked-recent"))},
      {key:"standings",label:"Classement",find:()=>Array.from(content.querySelectorAll(".bfmd-linked-standings"))},
      {key:"vote",label:"Vote",find:()=>Array.from(content.querySelectorAll(".bfmd-match-vote"))},
      {key:"highlights",label:"Highlights",find:()=>Array.from(content.querySelectorAll(".bfmd-linked-highlights"))},
      {key:"news",label:"Actualités",find:()=>Array.from(content.querySelectorAll(".bfmd-linked-news"))},
      {key:"comments",label:"Commentaires",find:()=>Array.from(content.querySelectorAll(".bfmd-match-comments"))}
    ];
    const nav = document.createElement("nav");
    nav.className = "bfmd-center-nav";
    nav.setAttribute("aria-label", "Choisir une rubrique des détails du match");
    nav.style.cssText = "display:flex;gap:8px;overflow-x:auto;padding:12px 10px 9px;margin:14px 0 8px;position:sticky;top:0;z-index:20;background:transparent;scrollbar-width:thin";
    const viewHint = document.createElement("div");
    viewHint.className = "bfmd-view-hint";
    viewHint.textContent = "Choisis une rubrique pour afficher ses détails.";
    viewHint.style.cssText = "padding:10px 12px;margin:4px 0 12px;border:1px solid rgba(127,127,127,.18);border-radius:10px;font-size:12px;opacity:.78";
    nav.appendChild(viewHint);
    let activeTabKey = "";
    const uiLanguage = () => window.BakhiraFootLanguage?.get?.() || document.documentElement.lang || "fr";
    const translateLabel = label => window.BakhiraFootLanguage?.t?.(label) || label;
    const setOverviewHint = () => {
      const lang = uiLanguage();
      viewHint.textContent = lang === "en"
        ? "The score and match information stay visible. Choose a section to view details."
        : lang === "ar"
          ? "ستبقى النتيجة ومعلومات المباراة ظاهرة. اختر قسماً لعرض التفاصيل."
          : "Le score et les informations du match restent visibles. Choisis une rubrique pour consulter les détails.";
    };

    const activateTab = key => {
      const definition = tabDefinitions.find(tab => tab.key === key);
      if (!definition) return;
      activeTabKey = key;
      const selectable = allSections.filter(section => !isHeaderSection(section));
      selectable.forEach(section => { section.style.display = "none"; });
      const infoRows = Array.from(content.querySelectorAll(".bfmd-info,.bf-new-safe-info"));
      infoRows.forEach(row => { row.style.display = "flex"; });
      content.querySelectorAll(".bfmd-pitches,.bfmd-pitch-legend,.bfmd-tactics-caption,.bfmd-match-analysis > .bfmd-title")
        .forEach(node => { node.style.display = ""; });
      const targets = definition.find();
      const reveal = target => {
        if (!target || !content.contains(target)) return;
        target.style.display = "block";
        if (target.tagName === "DETAILS") target.open = true;
        let parent = target.parentElement;
        while (parent && parent !== content) {
          if (parent.matches(sectionSelector) && !isHeaderSection(parent)) parent.style.display = "block";
          parent = parent.parentElement;
        }
      };
      targets.forEach(reveal);
      if (key === "players") {
        content.querySelectorAll(".bfmd-pitches,.bfmd-pitch-legend,.bfmd-tactics-caption,.bfmd-match-analysis > .bfmd-title")
          .forEach(node => { node.style.display = "none"; });
      }
      const lang = uiLanguage();
      const label = translateLabel(definition.label);
      viewHint.textContent = targets.length
        ? lang === "en"
          ? "Selected section: " + label + ". Choose another section to change the view."
          : lang === "ar"
            ? "القسم المحدد: " + label + ". اختر قسماً آخر من القائمة لتغيير العرض."
            : "Rubrique sélectionnée : " + label + ". Choisis une autre rubrique dans le menu pour changer l’affichage."
        : lang === "en"
          ? "Data for “" + label + "” is not available for this match."
          : lang === "ar"
            ? "البيانات الخاصة بقسم «" + label + "» غير متاحة لهذه المباراة."
            : "Les données de « " + label + " » ne sont pas disponibles pour ce match.";
      nav.querySelectorAll("button[data-bf-match-tab]").forEach(button => {
        const active = button.dataset.bfMatchTab === key;
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.style.background = active ? "linear-gradient(110deg,#087f5b,#0b9b69)" : "rgba(127,127,127,.12)";
        button.style.color = active ? "#fff" : "inherit";
        button.style.borderColor = active ? "#0b9b69" : "rgba(148,163,184,.25)";
      });
      content.dataset.bfActiveMatchTab = key;
    };
    tabDefinitions.forEach(definition => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.bfMatchTab = definition.key;
      button.textContent = definition.label;
      button.setAttribute("aria-pressed","false");
      button.style.cssText = "flex:0 0 auto;border:1px solid rgba(148,163,184,.25);border-radius:999px;padding:9px 14px;background:rgba(127,127,127,.12);color:inherit;font-weight:850;cursor:pointer;white-space:nowrap";
      button.addEventListener("click",() => activateTab(definition.key));
      nav.appendChild(button);
    });
    const hero = content.querySelector(".bfmd-header,.bf-new-safe-head");
    const topInfo = content.querySelector(".bfmd-info,.bf-new-safe-info");
    if (hero && topInfo && !hero.contains(topInfo)) hero.appendChild(topInfo);
    if (hero) hero.insertAdjacentElement("afterend",nav);
    else content.insertBefore(nav,content.firstChild);
    nav.insertAdjacentElement("afterend",viewHint);
    allSections.filter(section => !isHeaderSection(section)).forEach(section => { section.style.display = "none"; });
    content.querySelectorAll(".bfmd-info,.bf-new-safe-info").forEach(row => { row.style.display = "flex"; });
    nav.querySelectorAll("button[data-bf-match-tab]").forEach(button => {
      button.setAttribute("aria-pressed","false");
      button.style.background = "rgba(127,127,127,.10)";
      button.style.color = "inherit";
      button.style.borderColor = "rgba(148,163,184,.24)";
    });
    activeTabKey = "";
    setOverviewHint();
    content.dataset.bfActiveMatchTab = "";
    if (content._bfLanguageRefresh) document.removeEventListener("bakhirafoot:languagechange", content._bfLanguageRefresh);
    content._bfLanguageRefresh = () => {
      if (!content.isConnected) return;
      if (activeTabKey) activateTab(activeTabKey);
      else setOverviewHint();
    };
    document.addEventListener("bakhirafoot:languagechange", content._bfLanguageRefresh);
  }

  async function openDetails(
    identifier
  ) {
    if (!identifier) {
      return;
    }

    const expectedMatch = bfFindExpectedMatch(identifier);
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

      if (expectedMatch && !bfSameFixtureMetadata(details, expectedMatch, false)) {
        throw new Error("Le fournisseur a renvoyé une ancienne rencontre ; ces données sont ignorées.");
      }

      /*
       * SportScore's normalized event mapping may omit event flags or string details.
       * Ask a separate endpoint for raw provider incidents; do not alter api/index.js.
       * On any failure, the already working normalized response remains in use.
       */
      if (!/^(sofa|espn|tsdb)-/i.test(value)) {
        try {
          const enrichmentResponse = await fetch(
            "/api/match-event-enrichment?fixture=" + encodeURIComponent(value),
            {
              cache: "no-store",
              signal: detailsController.signal,
              headers: { Accept: "application/json" }
            }
          );
          const enrichmentPayload = await enrichmentResponse.json().catch(() => ({}));
          const enrichment = enrichmentPayload?.data || {};
          if (enrichmentResponse.ok && enrichment && typeof enrichment === "object") {
            const rawEvents = Array.isArray(enrichment.events) ? enrichment.events : [];
            const merged = { ...details };
            if (rawEvents.length) {
              merged.events = rawEvents;
              merged.incidents = rawEvents;
              merged.match_events = rawEvents;
            }
            if (!merged.player_of_match && enrichment.player_of_match) merged.player_of_match = enrichment.player_of_match;
            if (!merged.playerOfMatch && enrichment.playerOfMatch) merged.playerOfMatch = enrichment.playerOfMatch;
            if (!merged.venue && enrichment.venue) merged.venue = enrichment.venue;
            if (!merged.referee && enrichment.referee) merged.referee = enrichment.referee;
            if (!merged.broadcastChannel && enrichment.broadcastChannel) merged.broadcastChannel = enrichment.broadcastChannel;
            if (!merged.commentator && enrichment.commentator) merged.commentator = enrichment.commentator;
            details = merged;
            console.info("BAKHIRAFOOT: raw SportScore event enrichment", {
              events: rawEvents.length,
              venue: Boolean(enrichment.venue),
              referee: Boolean(enrichment.referee),
              broadcastChannel: Boolean(enrichment.broadcastChannel),
              commentator: Boolean(enrichment.commentator)
            });
          }
        } catch (enrichmentError) {
          if (enrichmentError?.name !== "AbortError") {
            console.warn("BAKHIRAFOOT: raw event enrichment unavailable; using current match details", enrichmentError);
          }
        }
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
            const exactCurrentFixture = response.ok && official && typeof official === "object" &&
              bfSameFixtureMetadata(official, details, true) &&
              (!expectedMatch || bfSameFixtureMetadata(official, expectedMatch, true));
            if (exactCurrentFixture) {
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

      const venue = first(
        bfFindMatchMeta(details, ["venue", "stadium", "ground", "arena", "stadiumName", "venueName"]),
        details?.fixture?.venue?.name, details?.fixture?.venue?.displayName,
        typeof details?.fixture?.venue === "string" ? details.fixture.venue : null,
        typeof details?.venue === "string" ? details.venue : null, ""
      );

      const referee = first(
        bfFindMatchMeta(details, ["referee", "mainReferee", "matchReferee", "refereeName", "official"]),
        details?.fixture?.referee?.name,
        typeof details?.fixture?.referee === "string" ? details.fixture.referee : null,
        details?.referee?.name,
        typeof details?.referee === "string" ? details.referee : null, ""
      );

      const broadcastChannel = bfFindMatchMeta(details, [
        "tvChannel", "tv_channel", "tvChannels", "tv_channels", "tvStation", "tvStations",
        "broadcastChannel", "broadcast_channel", "broadcastName", "broadcast_name",
        "channel", "channels", "channelName", "channel_name", "broadcaster", "broadcasters",
        "broadcasterName", "broadcast", "broadcasts", "network", "networks", "television",
        "media", "coverage", "beIN", "beinSports", "beIN Sports", "beINConnect"
      ]);

      const commentator = bfFindMatchMeta(details, [
        "commentator", "commentators", "commentatorName", "commentator_name",
        "tvCommentator", "tv_commentator", "matchCommentator", "match_commentator",
        "liveCommentator", "broadcastCommentator", "announcer", "announcers",
        "commentaryTeam", "commentary_team", "presenter", "presenters", "caster", "beINCommentator", "beinCommentator", "beINCommentators", "beinSportsCommentator", "commentatorBein", "bein_sports_commentator"
      ]);

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
      const explicitMvp = findExplicitMvp(details);
      const explicitMvpName = typeof explicitMvp === "string"
        ? explicitMvp
        : first(eventPersonName(explicitMvp), explicitMvp?.name, explicitMvp?.player?.name, explicitMvp?.player_name, "");
      if (explicitMvpName) {
        statsMap.mvpKey = playerKey(explicitMvpName);
        statsMap.mvpFallback = false;
      }

      /* If the provider omits a named MVP, show the best sourced rating as a fallback,
         but label it honestly instead of claiming it is an official MVP. */
      if (!statsMap.mvpKey) {
        const allLineupPlayers = [
          ...arr(homeLineup.xi), ...arr(homeLineup.subs),
          ...arr(awayLineup.xi), ...arr(awayLineup.subs)
        ];
        const officialMvp = allLineupPlayers.find(player => playerIsOfficialMvp(player));
        if (officialMvp) {
          statsMap.mvpKey = playerKey(officialMvp);
          statsMap.mvpFallback = false;
        } else {
          const bestRated = allLineupPlayers.map(player => ({player, rating:getPlayerRating(player)}))
            .filter(item => item.rating !== null && Number.isFinite(Number(item.rating)))
            .sort((a,b) => Number(b.rating) - Number(a.rating))[0];
          if (bestRated) {
            statsMap.mvpKey = playerKey(bestRated.player);
            statsMap.mvpFallback = true;
          }
        }
      }

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

        <div class="bfmd-info">
          ${date ? '<span>📅 ' + esc(date) + '</span>' : ''}
          <span data-bf-meta="venue"><b>🏟️ Stade :</b> <i data-bf-meta-value="venue">${esc(venue || "Non communiqué")}</i></span>
          <span data-bf-meta="referee"><b>👨‍⚖️ Arbitre :</b> <i data-bf-meta-value="referee">${esc(referee || "Non communiqué")}</i></span>
          <span data-bf-meta="channel"><b>📺 Chaîne :</b> <i data-bf-meta-value="channel">${esc(broadcastChannel || "Non communiquée")}</i></span>
          <span data-bf-meta="commentator"><b>🎙️ Commentateur :</b> <i data-bf-meta-value="commentator">${esc(commentator || "Non communiqué")}</i></span>
        </div>

        ${renderMatchStatistics(details)}

        <div class="bfmd-section bfmd-match-analysis">
          <div class="bfmd-title">COMPOSITIONS & PERFORMANCES SUR LE TERRAIN</div>
          <div class="bfmd-tactics-caption">
            <span>NOTES · BUTS · PASSES · CARTONS · BLESSURES · MVP · REMPLACEMENTS</span>
            <span>DONNÉES DISPONIBLES POUR CHAQUE JOUEUR</span>
          </div>
          <div class="bfmd-pitches bfmd-pitches--performance">
            ${renderCombinedPitch(homeLineup, awayLineup, statsMap)}
          </div>
          <details class="bfmd-section bfmd-player-statistics bfmd-player-statistics-details">
            <summary class="bfmd-title">📊 Statistiques des joueurs · ouvrir</summary>
            <p class="bfmd-player-stats-intro">Clique sur un joueur sur le terrain pour afficher ses détails, ou ouvre cette liste complète.</p>
            <div class="bfmd-player-stats-grid">
              <div class="bfmd-player-stats-team"><h3>${esc(homeLineup.team.name || teams.home.name)}</h3>${renderPlayerColumn(homeLineup, statsMap)}</div>
              <div class="bfmd-player-stats-team"><h3>${esc(awayLineup.team.name || teams.away.name)}</h3>${renderPlayerColumn(awayLineup, statsMap)}</div>
            </div>
          </details>
          <div class="bfmd-pitch-legend">
            <span class="bfmd-chip bfmd-chip--goal" title="But"><span>But</span>${performanceIcon("goal")}</span>
            <span class="bfmd-chip bfmd-chip--assist" title="Passe décisive"><span>Passe décisive</span>${performanceIcon("assist")}</span>
            <span class="bfmd-chip bfmd-chip--penalty" title="But sur penalty"><span>Penalty</span>${performanceIcon("penalty")}</span>
            <span class="bfmd-chip bfmd-chip--own" title="But contre son camp"><span>But contre son camp</span>${performanceIcon("own")}</span>
            <span class="bfmd-chip bfmd-chip--yellow" title="Carton jaune"><span>Carton jaune</span>${performanceIcon("yellow")}</span>
            <span class="bfmd-chip bfmd-chip--red" title="Carton rouge"><span>Carton rouge</span>${performanceIcon("red")}</span>
            <span class="bfmd-chip bfmd-chip--injury" title="Blessure"><span>Blessure</span>${performanceIcon("injury")}</span>
            <span class="bfmd-chip bfmd-chip--mvp" title="Joueur du match"><span>Joueur du match</span>${performanceIcon("mvp")}</span>
            <span class="bfmd-chip bfmd-chip--subIn" title="Entrée en jeu"><span>Entrée</span>${performanceIcon("subIn")}</span>
            <span class="bfmd-chip bfmd-chip--subOut" title="Sortie du terrain"><span>Sortie</span>${performanceIcon("subOut")}</span>
            <span class="bfmd-chip bfmd-chip--rating" title="Note du joueur"><span>Note</span>${performanceIcon("rating")}</span>
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

      setupMatchCenterNavigation(value, teams, competition, date);

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

  window.bfSetupMatchCenter = setupMatchCenterNavigation;

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
