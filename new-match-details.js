(function () {
  "use strict";

  /* =========================================================
     BAKHIRAFOOT PRO - NEW MATCH DETAILS

     الهدف:
     - كيتدخل فـ Match Details الجديدة
     - كيدعم cards الحالية ديال Scores
     - كيحاول SofaScore ثم ESPN ثم TheSportsDB
     - ما كيحتاجش source=auto
     - إذا ما لقا حتى مصدر خارجي، كيخلي القديم SportScore يخدم
     ========================================================= */

  const API = "/api?fixture=";

  function arr(v) {
    return Array.isArray(v) ? v : [];
  }

  function obj(v) {
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  }

  function first(...values) {
    for (const v of values) {
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  }

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function norm(v) {
    return String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function dateOnly(v) {
    if (!v) return "";

    const s = String(v);

    const m =
      s.match(/^(\d{4}-\d{2}-\d{2})/);

    if (m) return m[1];

    const d = new Date(s);

    return Number.isNaN(d.getTime())
      ? ""
      : d.toISOString().slice(0, 10);
  }

  function toCompactDate(v) {
    return dateOnly(v).replace(/-/g, "");
  }

  function teamName(team) {
    return String(
      first(
        team?.name,
        team?.displayName,
        team?.shortName,
        team?.fullName,
        ""
      )
    );
  }

  function getCurrentMatches() {
    try {
      if (
        typeof currentMatches !== "undefined" &&
        Array.isArray(currentMatches)
      ) {
        return currentMatches;
      }
    } catch (e) {}

    return [];
  }

  function getMatch(index) {
    return getCurrentMatches()[index] || null;
  }

  function getHome(match) {
    return (
      match?.teams?.home ||
      match?.home_team ||
      match?.home ||
      {}
    );
  }

  function getAway(match) {
    return (
      match?.teams?.away ||
      match?.away_team ||
      match?.away ||
      {}
    );
  }

  function getProvider(match) {
    return String(
      first(
        match?.provider,
        match?.fixture?.provider,
        match?.score?.provider,
        ""
      )
    )
      .trim()
      .toLowerCase();
  }

  function getMatchDate(match) {
    return first(
      match?.fixture?.date,
      match?.date,
      match?.kickoff,
      match?.start_time,
      ""
    );
  }

  function getRawId(match, card) {
    return String(
      first(
        match?.fixture?.upstreamId,
        match?.upstreamId,
        match?.fixture?.id,
        match?.id,
        match?.fixture?.slug,
        match?.slug,
        card?.dataset?.fixtureId,
        card?.dataset?.matchSlug,
        card?.dataset?.slug,
        ""
      )
    ).trim();
  }

  function cleanProvider(v) {
    const s =
      norm(v).replace(/ /g, "");

    if (
      s === "sofa" ||
      s === "sofascore"
    ) {
      return "sofascore";
    }

    if (s === "espn") {
      return "espn";
    }

    if (
      s === "tsdb" ||
      s === "thesportsdb" ||
      s === "the-sports-db"
    ) {
      return "thesportsdb";
    }

    if (s === "sportscore") {
      return "sportscore";
    }

    return "";
  }

  function sourceValue(
    provider,
    id,
    slug
  ) {
    const p =
      cleanProvider(provider);

    let value =
      String(
        first(
          slug,
          id,
          ""
        ) || ""
      ).trim();

    if (
      !p ||
      !value ||
      p === "sportscore"
    ) {
      return null;
    }

    if (
      p === "sofascore" &&
      !/^sofa-/i.test(value)
    ) {
      value =
        `sofa-${value}`;
    }

    if (
      p === "espn" &&
      !/^espn-/i.test(value)
    ) {
      value =
        `espn-${value}`;
    }

    if (
      p === "thesportsdb" &&
      !/^tsdb-/i.test(value)
    ) {
      value =
        `tsdb-${value}`;
    }

    return {
      provider: p,
      value
    };
  }

  function collectKnownSources(
    match,
    card
  ) {
    const out = [];

    const add = (
      provider,
      id,
      slug
    ) => {
      const x =
        sourceValue(
          provider,
          id,
          slug
        );

      if (!x) return;

      if (
        !out.some(
          y =>
            y.provider === x.provider &&
            y.value === x.value
        )
      ) {
        out.push(x);
      }
    };

    add(
      match?.provider ||
        match?.fixture?.provider,

      match?.fixture?.upstreamId ||
        match?.upstreamId ||
        match?.fixture?.id ||
        match?.id,

      match?.fixture?.slug ||
        match?.slug ||
        card?.dataset?.fixtureId
    );

    const lists = [
      match?.detailsProviders,
      match?.detailsSources,
      match?.fixture?.detailsProviders,
      match?.fixture?.detailsSources
    ];

    for (
      const list of lists
    ) {
      for (
        const item of arr(list)
      ) {
        add(
          item?.provider ||
            item?.source,

          item?.id ||
            item?.upstreamId,

          item?.slug
        );
      }
    }

    add(
      match?.detailsProvider,
      match?.detailsId,
      match?.detailsSlug
    );

    add(
      match?.fixture?.detailsProvider,
      match?.fixture?.detailsId,
      match?.fixture?.detailsSlug
    );

    return out;
  }

  function sameTeams(
    aHome,
    aAway,
    bHome,
    bAway
  ) {
    const ah =
      norm(aHome);

    const aa =
      norm(aAway);

    const bh =
      norm(bHome);

    const ba =
      norm(bAway);

    if (
      !ah ||
      !aa ||
      !bh ||
      !ba
    ) {
      return false;
    }

    const direct =
      ah === bh &&
      aa === ba;

    const swap =
      ah === ba &&
      aa === bh;

    return (
      direct ||
      swap
    );
  }

  function matchTimeClose(
    target,
    candidate
  ) {
    const t =
      new Date(
        target || ""
      ).getTime();

    const c =
      new Date(
        candidate || ""
      ).getTime();

    if (
      !Number.isFinite(t) ||
      !Number.isFinite(c)
    ) {
      return true;
    }

    return (
      Math.abs(t - c) <=
      3 *
        24 *
        60 *
        60 *
        1000
    );
  }

  /* =========================================================
     SOFASCORE AUTO LOOKUP
  ========================================================= */

  async function findSofaMatch(
    match
  ) {
    const date =
      dateOnly(
        getMatchDate(match)
      );

    if (!date) {
      return null;
    }

    const home =
      teamName(
        getHome(match)
      );

    const away =
      teamName(
        getAway(match)
      );

    if (
      !home ||
      !away
    ) {
      return null;
    }

    try {

      const r =
        await fetch(
          `https://www.sofascore.com/api/v1/sport/football/scheduled-events/${encodeURIComponent(date)}`,
          {
            cache:
              "no-store",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (!r.ok) {
        return null;
      }

      const body =
        await r.json();

      const events =
        arr(
          body?.events
        );

      let best =
        null;

      for (
        const event of events
      ) {

        const eh =
          teamName(
            event?.homeTeam
          );

        const ea =
          teamName(
            event?.awayTeam
          );

        if (
          !sameTeams(
            home,
            away,
            eh,
            ea
          )
        ) {
          continue;
        }

        const candidateDate =
          event?.startTimestamp
            ? new Date(
                event.startTimestamp *
                  1000
              ).toISOString()
            : null;

        if (
          !matchTimeClose(
            getMatchDate(match),
            candidateDate
          )
        ) {
          continue;
        }

        best =
          event;

        break;
      }

      if (
        !best?.id
      ) {
        return null;
      }

      return {
        provider:
          "sofascore",

        value:
          `sofa-${best.id}`
      };

    } catch (e) {

      console.warn(
        "BAKHIRAFOOT SofaScore lookup failed",
        e
      );

      return null;
    }
  }

  /* =========================================================
     ESPN AUTO LOOKUP
  ========================================================= */

  async function findESPNMatch(
    match
  ) {
    const compact =
      toCompactDate(
        getMatchDate(match)
      );

    if (!compact) {
      return null;
    }

    const home =
      teamName(
        getHome(match)
      );

    const away =
      teamName(
        getAway(match)
      );

    try {

      const r =
        await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${encodeURIComponent(compact)}`,
          {
            cache:
              "no-store",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (!r.ok) {
        return null;
      }

      const body =
        await r.json();

      for (
        const event of
          arr(
            body?.events
          )
      ) {

        const competition =
          arr(
            event?.competitions
          )[0] || {};

        const competitors =
          arr(
            competition?.competitors
          );

        const h =
          competitors.find(
            x =>
              x?.homeAway ===
              "home"
          );

        const a =
          competitors.find(
            x =>
              x?.homeAway ===
              "away"
          );

        if (
          !h ||
          !a ||
          !event?.id
        ) {
          continue;
        }

        if (
          sameTeams(
            home,
            away,
            teamName(h?.team),
            teamName(a?.team)
          )
        ) {
          return {
            provider:
              "espn",

            value:
              `espn-${event.id}`
          };
        }
      }

    } catch (e) {

      console.warn(
        "BAKHIRAFOOT ESPN lookup failed",
        e
      );

    }

    return null;
  }

  /* =========================================================
     THESPORTSDB AUTO LOOKUP
  ========================================================= */

  async function findTSDBMatch(
    match
  ) {
    const date =
      dateOnly(
        getMatchDate(match)
      );

    if (!date) {
      return null;
    }

    const home =
      teamName(
        getHome(match)
      );

    const away =
      teamName(
        getAway(match)
      );

    try {

      const r =
        await fetch(
          `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${encodeURIComponent(date)}&s=Soccer`,
          {
            cache:
              "no-store",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (!r.ok) {
        return null;
      }

      const body =
        await r.json();

      for (
        const event of
          arr(
            body?.events
          )
      ) {

        if (
          !event?.idEvent
        ) {
          continue;
        }

        if (
          sameTeams(
            home,
            away,
            event?.strHomeTeam,
            event?.strAwayTeam
          )
        ) {

          return {
            provider:
              "thesportsdb",

            value:
              `tsdb-${event.idEvent}`
          };

        }
      }

    } catch (e) {

      console.warn(
        "BAKHIRAFOOT TSDB lookup failed",
        e
      );

    }

    return null;
  }

  async function findExternalSource(
    match,
    card
  ) {

    const known =
      collectKnownSources(
        match,
        card
      );

    if (
      known.length
    ) {
      return known[0];
    }

    const sofa =
      await findSofaMatch(
        match
      );

    if (sofa) {
      return sofa;
    }

    const espn =
      await findESPNMatch(
        match
      );

    if (espn) {
      return espn;
    }

    const tsdb =
      await findTSDBMatch(
        match
      );

    if (tsdb) {
      return tsdb;
    }

    return null;
  }

  /* =========================================================
     MODAL STYLES
  ========================================================= */

  function ensureStyles() {

    if (
      document.getElementById(
        "bf-new-details-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "bf-new-details-style";

    style.textContent = `

      #bf-new-details-modal{
        display:none;
        position:fixed;
        inset:0;
        z-index:1000000;
      }

      .bfnd-overlay{
        position:absolute;
        inset:0;
        background:rgba(0,0,0,.82);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:12px;
      }

      .bfnd-box{
        position:relative;
        width:min(1100px,100%);
        max-height:94vh;
        overflow:auto;
        background:var(--card,#fff);
        color:var(--text,#111827);
        border-radius:22px;
        box-shadow:0 30px 100px rgba(0,0,0,.45);
        padding:22px;
      }

      .bfnd-close{
        position:absolute;
        right:12px;
        top:12px;
        border:0;
        border-radius:50%;
        width:38px;
        height:38px;
        font-weight:900;
        cursor:pointer;
        font-size:18px;
      }

      .bfnd-loading{
        text-align:center;
        padding:50px 15px;
        font-weight:900;
      }

      .bfnd-league{
        text-align:center;
        font-size:13px;
        font-weight:900;
        opacity:.7;
      }

      .bfnd-head{
        display:grid;
        grid-template-columns:1fr auto 1fr;
        align-items:center;
        gap:16px;
        text-align:center;
        margin:16px 0;
      }

      .bfnd-team{
        font-weight:950;
        overflow-wrap:anywhere;
      }

      .bfnd-team img{
        width:72px;
        height:72px;
        object-fit:contain;
        display:block;
        margin:0 auto 7px;
      }

      .bfnd-score{
        font-size:42px;
        font-weight:950;
      }

      .bfnd-status{
        font-size:10px;
        font-weight:900;
        display:inline-block;
        margin-top:7px;
        padding:6px 10px;
        border-radius:999px;
        background:rgba(127,127,127,.12);
      }

      .bfnd-info{
        display:flex;
        justify-content:center;
        flex-wrap:wrap;
        gap:7px;
      }

      .bfnd-info span{
        font-size:10px;
        padding:6px 9px;
        border-radius:999px;
        background:rgba(127,127,127,.08);
      }

      .bfnd-section{
        margin-top:22px;
        padding-top:18px;
        border-top:1px solid rgba(127,127,127,.16);
      }

      .bfnd-title{
        font-size:17px;
        font-weight:950;
        margin-bottom:12px;
      }

      .bfnd-grid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:16px;
      }

      .bfnd-panel{
        padding:12px;
        border-radius:14px;
        background:rgba(127,127,127,.06);
      }

      .bfnd-player{
        display:grid;
        grid-template-columns:40px 34px 1fr auto;
        gap:7px;
        align-items:center;
        padding:7px;
        margin-bottom:6px;
        border-radius:8px;
        background:rgba(127,127,127,.07);
      }

      .bfnd-player img,
      .bfnd-avatar{
        width:38px;
        height:38px;
        border-radius:50%;
        object-fit:cover;
        background:rgba(127,127,127,.12);
      }

      .bfnd-num{
        width:28px;
        height:28px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(127,127,127,.12);
        font-size:9px;
        font-weight:900;
      }

      .bfnd-name{
        font-size:11px;
        font-weight:900;
      }

      .bfnd-pos{
        font-size:9px;
        opacity:.6;
      }

      .bfnd-rating{
        font-size:9px;
        font-weight:900;
      }

      .bfnd-pitches{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:16px;
      }

      .bfnd-pitch-wrap{
        padding:8px;
      }

      .bfnd-pitch-head{
        display:flex;
        justify-content:space-between;
        font-size:11px;
        font-weight:900;
        margin-bottom:7px;
      }

      .bfnd-pitch{
        position:relative;
        aspect-ratio:.68;
        border-radius:13px;
        overflow:hidden;

        background:
          repeating-linear-gradient(
            90deg,
            #2f7e44 0,
            #2f7e44 10%,
            #37884d 10%,
            #37884d 20%
          );
      }

      .bfnd-border{
        position:absolute;
        inset:7px;
        border:2px solid #fff;
      }

      .bfnd-half{
        position:absolute;
        left:7px;
        right:7px;
        top:50%;
        height:2px;
        background:#fff;
      }

      .bfnd-circle{
        position:absolute;
        left:50%;
        top:50%;
        width:20%;
        aspect-ratio:1;
        border:2px solid #fff;
        border-radius:50%;
        transform:translate(-50%,-50%);
      }

      .bfnd-pitch-player{
        position:absolute;
        transform:translate(-50%,-50%);
        width:80px;
        text-align:center;
        color:#fff;
      }

      .bfnd-pitch-player img,
      .bfnd-pitch-avatar{
        width:40px;
        height:40px;
        border-radius:50%;
        object-fit:cover;
        background:#fff;
        border:2px solid #fff;
      }

      .bfnd-pitch-name{
        font-size:8px;
        font-weight:900;
        background:rgba(0,0,0,.75);
        border-radius:4px;
        padding:2px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .bfnd-pitch-rate{
        font-size:8px;
        background:#fff;
        color:#111;
        border-radius:4px;
        padding:2px 4px;
        display:inline-block;
      }

      .bfnd-event{
        display:grid;
        grid-template-columns:44px 30px 1fr;
        gap:8px;
        align-items:center;
        padding:8px;
        margin-bottom:6px;
        border-radius:8px;
        background:rgba(127,127,127,.07);
      }

      .bfnd-event-minute{
        font-size:10px;
        font-weight:900;
      }

      .bfnd-event-icon{
        font-size:17px;
      }

      .bfnd-event-main{
        font-size:10px;
        font-weight:900;
      }

      .bfnd-event-team{
        font-size:9px;
        opacity:.55;
      }

      .bfnd-empty{
        padding:12px;
        border-radius:9px;
        background:rgba(127,127,127,.06);
        font-size:10px;
        opacity:.7;
      }

      @media(max-width:800px){
        .bfnd-grid,
        .bfnd-pitches{
          grid-template-columns:1fr;
        }
      }

      @media(max-width:600px){

        .bfnd-box{
          padding:15px 9px;
        }

        .bfnd-head{
          gap:7px;
        }

        .bfnd-score{
          font-size:28px;
        }

        .bfnd-team{
          font-size:11px;
        }

        .bfnd-team img{
          width:55px;
          height:55px;
        }
      }

    `;

    document.head.appendChild(
      style
    );
  }

  /* =========================================================
     MODAL
  ========================================================= */

  function ensureModal() {

    let modal =
      document.getElementById(
        "bf-new-details-modal"
      );

    if (modal) {
      return modal;
    }

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "bf-new-details-modal";

    modal.innerHTML = `

      <div class="bfnd-overlay">

        <div
          class="bfnd-box"
          onclick="event.stopPropagation()"
        >

          <button
            class="bfnd-close"
            type="button"
          >
            ✕
          </button>

          <div id="bfnd-content"></div>

        </div>

      </div>

    `;

    document.body.appendChild(
      modal
    );

    modal
      .querySelector(
        ".bfnd-close"
      )
      .onclick =
      closeModal;

    modal
      .querySelector(
        ".bfnd-overlay"
      )
      .onclick =
      closeModal;

    ensureStyles();

    return modal;
  }

  function closeModal() {

    const modal =
      document.getElementById(
        "bf-new-details-modal"
      );

    if (modal) {
      modal.style.display =
        "none";
    }

    document.body.style.overflow =
      "";
  }

  /* =========================================================
     DETAILS TEAM
  ========================================================= */

  function getTeam(
    details,
    side
  ) {

    const t =
      details?.teams?.[side] ||
      details?.[
        side + "_team"
      ] ||
      {};

    return {
      id:
        first(
          t?.id,
          t?.team_id
        ),

      name:
        String(
          first(
            t?.name,
            t?.displayName,

            side === "home"
              ? "Domicile"
              : "Extérieur"
          )
        ),

      logo:
        String(
          first(
            t?.logo,
            t?.image,
            t?.badge,
            t?.picture,
            ""
          )
        )
    };
  }

  function getScore(
    details,
    side
  ) {

    return first(
      details?.goals?.[side],

      details?.score?.[side],

      details?.[
        side + "_score"
      ],

      "-"
    );
  }

  /* =========================================================
     LINEUPS
  ========================================================= */

  function getLineup(
    details,
    side,
    team
  ) {

    const raw =
      details?.lineups;

    let block =
      null;

    if (
      Array.isArray(raw)
    ) {

      block =
        raw.find(
          x => {

            const t =
              x?.team || {};

            return (

              (
                team.id &&
                t.id &&
                String(team.id) ===
                  String(t.id)
              )

              ||

              (
                team.name &&
                t.name &&
                norm(team.name) ===
                  norm(t.name)
              )

              ||

              norm(x?.side) ===
                side

              ||

              (
                side === "home" &&
                norm(x?.side) ===
                  "host"
              )

              ||

              (
                side === "away" &&
                norm(x?.side) ===
                  "guest"
              )

            );

          }
        );

    } else {

      block =
        raw?.[side] ||
        raw?.[
          side + "Team"
        ] ||
        null;
    }

    if (!block) {

      return {
        formation:
          "—",

        players:
          []
      };

    }

    return {

      formation:
        String(
          first(
            block?.formation,
            block?.tactics
              ?.formation,
            "—"
          )
        ),

      players:
        arr(
          first(
            block?.players,
            block?.startXI,
            block?.startingXI,
            block?.xi,
            []
          )
        )

    };
  }

  /* =========================================================
     PLAYER
  ========================================================= */

  function playerName(p) {

    const x =
      p?.player &&
      obj(p.player)
        ? p.player
        : p;

    return String(
      first(
        p?.name,
        p?.player_name,
        x?.name,
        x?.displayName,
        x?.fullName,
        "Joueur"
      )
    );
  }

  function playerNumber(p) {

    const x =
      p?.player &&
      obj(p.player)
        ? p.player
        : p;

    return first(
      p?.number,
      p?.shirt_number,
      p?.shirtNumber,
      p?.jersey,
      x?.number,
      "-"
    );
  }

  function playerPosition(p) {

    const x =
      p?.player &&
      obj(p.player)
        ? p.player
        : p;

    const v =
      first(
        p?.position,
        p?.pos,
        p?.role,
        x?.position,
        x?.pos,
        ""
      );

    return String(
      typeof v ===
        "object"
        ? first(
            v?.name,
            v?.abbreviation,
            ""
          )
        : v
    );
  }

  function playerPhoto(p) {

    const x =
      p?.player &&
      obj(p.player)
        ? p.player
        : p;

    return String(
      first(
        p?.photo,
        p?.image,
        p?.picture,
        p?.headshot,
        p?.avatar,

        x?.photo,
        x?.image,
        x?.picture,
        x?.headshot,
        x?.avatar,

        ""
      )
    );
  }

  function playerRating(p) {

    const x =
      p?.player &&
      obj(p.player)
        ? p.player
        : p;

    const r =
      first(
        p?.rating,
        p?.match_rating,
        p?.statistics
          ?.rating,
        p?.performance
          ?.rating,

        x?.rating,
        x?.statistics
          ?.rating
      );

    if (r === null) {
      return null;
    }

    const n =
      Number(
        String(r)
          .replace(
            ",",
            "."
          )
      );

    return Number.isFinite(n)
      ? n
      : null;
  }

  function classify(p) {

    const x =
      norm(
        playerPosition(p)
      );

    if (!x) {
      return "unknown";
    }

    if (
      x.includes("goal") ||
      x === "g" ||
      x === "gk" ||
      x.includes("keeper")
    ) {
      return "gk";
    }

    if (
      x.includes("def") ||
      x.includes("back") ||
      x.includes("cb") ||
      x.includes("lb") ||
      x.includes("rb")
    ) {
      return "def";
    }

    if (
      x.includes("mid") ||
      x.includes("mf") ||
      x.includes("cm") ||
      x.includes("dm") ||
      x.includes("am")
    ) {
      return "mid";
    }

    if (
      x.includes("att") ||
      x.includes("fwd") ||
      x.includes("fw") ||
      x.includes("strik") ||
      x.includes("wing") ||
      x.includes("forward")
    ) {
      return "att";
    }

    return "unknown";
  }

  function formationRows(
    formation
  ) {

    const a =
      String(
        formation || ""
      )
        .split("-")
        .map(Number)
        .filter(
          n => n > 0
        );

    return a.length
      ? a
      : [4, 3, 3];
  }

  /* =========================================================
     PITCH POSITION
  ========================================================= */

  function pitchPositions(
    lineup,
    side
  ) {

    const players =
      lineup.players.slice(
        0,
        11
      );

    if (
      !players.length
    ) {
      return [];
    }

    const groups = {
      gk: [],
      def: [],
      mid: [],
      att: [],
      unknown: []
    };

    players.forEach(
      p => {

        groups[
          classify(p)
        ].push(p);

      }
    );

    const rows = [
      groups.gk.slice(
        0,
        1
      )
    ];

    const formation =
      formationRows(
        lineup.formation
      );

    let di = 0;
    let mi = 0;
    let ai = 0;
    let ui = 0;

    formation.forEach(
      (
        count,
        rowIndex
      ) => {

        let source;

        if (
          rowIndex === 0
        ) {

          source =
            groups.def.slice(
              di,
              di + count
            );

          di +=
            source.length;

        } else if (
          rowIndex ===
          formation.length - 1
        ) {

          source =
            groups.att.slice(
              ai,
              ai + count
            );

          ai +=
            source.length;

        } else {

          source =
            groups.mid.slice(
              mi,
              mi + count
            );

          mi +=
            source.length;

        }

        while (
          source.length <
            count &&
          ui <
            groups.unknown.length
        ) {

          source.push(
            groups.unknown[
              ui++
            ]
          );

        }

        rows.push(
          source
        );

      }
    );

    const flat =
      [];

    rows.forEach(
      (
        row,
        ri
      ) => {

        row.forEach(
          (
            player,
            pi
          ) => {

            const x =
              row.length === 1
                ? 50
                : 16 +
                  68 *
                    (
                      pi /
                      (
                        row.length - 1
                      )
                    );

            let y =
              rows.length === 1
                ? 50
                : 8 +
                  84 *
                    (
                      ri /
                      Math.max(
                        1,
                        rows.length - 1
                      )
                    );

            if (
              side ===
              "away"
            ) {
              y =
                100 - y;
            }

            flat.push({
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

    const used =
      new Set(
        flat.map(
          x =>
            x.player
        )
      );

    for (
      const p of players
    ) {

      if (
        !used.has(p) &&
        flat.length < 11
      ) {

        flat.push({
          player: p,
          x: 50,
          y: 50
        });

      }

    }

    return flat;
  }

  /* =========================================================
     PITCH
  ========================================================= */

  function renderPitch(
    lineup,
    team,
    side
  ) {

    if (
      !lineup.players.length
    ) {

      return `

        <div class="bfnd-panel">

          <div class="bfnd-pitch-head">

            <span>
              ${esc(
                team.name
              )}
            </span>

            <span>
              ${esc(
                lineup.formation
              )}
            </span>

          </div>

          <div class="bfnd-empty">
            Composition indisponible
          </div>

        </div>

      `;

    }

    const positions =
      pitchPositions(
        lineup,
        side
      );

    return `

      <div class="bfnd-pitch-wrap">

        <div class="bfnd-pitch-head">

          <span>
            ${esc(
              team.name
            )}
          </span>

          <span>
            ${esc(
              lineup.formation
            )}
          </span>

        </div>

        <div class="bfnd-pitch">

          <div class="bfnd-border"></div>

          <div class="bfnd-half"></div>

          <div class="bfnd-circle"></div>

          ${positions
            .map(
              item => {

                const p =
                  item.player;

                const photo =
                  playerPhoto(p);

                const rating =
                  playerRating(p);

                return `

                  <div
                    class="bfnd-pitch-player"
                    style="
                      left:${item.x}%;
                      top:${item.y}%;
                    "
                  >

                    ${
                      photo
                        ? `
                          <img
                            src="${esc(
                              photo
                            )}"
                            alt="${esc(
                              playerName(p)
                            )}"
                          >
                        `
                        : `
                          <div
                            class="bfnd-pitch-avatar"
                          >
                            ⚽
                          </div>
                        `
                    }

                    <div
                      class="bfnd-pitch-name"
                    >
                      ${esc(
                        playerName(p)
                      )}
                    </div>

                    ${
                      rating != null
                        ? `
                          <div
                            class="bfnd-pitch-rate"
                          >
                            ⭐ ${esc(
                              rating.toFixed(1)
                            )}
                          </div>
                        `
                        : ""
                    }

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
     PLAYER LIST
  ========================================================= */

  function renderPlayers(
    lineup
  ) {

    if (
      !lineup.players.length
    ) {

      return `

        <div class="bfnd-empty">
          Joueurs indisponibles
        </div>

      `;

    }

    return lineup.players
      .map(
        p => {

          const photo =
            playerPhoto(p);

          const rating =
            playerRating(p);

          return `

            <div
              class="bfnd-player"
            >

              ${
                photo
                  ? `
                    <img
                      src="${esc(
                        photo
                      )}"
                      alt="${esc(
                        playerName(p)
                      )}"
                    >
                  `
                  : `
                    <div class="bfnd-avatar">
                      ⚽
                    </div>
                  `
              }

              <div class="bfnd-num">
                ${esc(
                  playerNumber(p)
                )}
              </div>

              <div>

                <div class="bfnd-name">
                  ${esc(
                    playerName(p)
                  )}
                </div>

                <div class="bfnd-pos">
                  ${esc(
                    playerPosition(p)
                  )}
                </div>

              </div>

              <div class="bfnd-rating">

                ${
                  rating != null
                    ? `⭐ ${esc(
                        rating.toFixed(1)
                      )}`
                    : "—"
                }

              </div>

            </div>

          `;
        }
      )
      .join("");
  }

  /* =========================================================
     EVENT ICON
  ========================================================= */

  function eventIcon(
    event
  ) {

    const t =
      norm(
        first(

          typeof event?.type ===
            "object"

            ? event?.type?.name

            : event?.type,

          event?.incidentType,

          event?.kind,

          event?.detail,

          event?.text,

          ""
        )
      );

    if (
      t.includes("goal") ||
      t.includes("score")
    ) {
      return "⚽";
    }

    if (
      t.includes("yellow")
    ) {
      return "🟨";
    }

    if (
      t.includes("red")
    ) {
      return "🟥";
    }

    if (
      t.includes("sub")
    ) {
      return "🔄";
    }

    return "•";
  }

  /* =========================================================
     EVENTS
  ========================================================= */

  function renderEvents(
    details
  ) {

    const events =
      arr(
        first(
          details?.events,
          details?.incidents,
          details?.plays,
          []
        )
      );

    if (
      !events.length
    ) {

      return `

        <div class="bfnd-empty">
          Aucun événement détaillé disponible.
        </div>

      `;

    }

    return events
      .map(
        e => {

          const p =
            first(

              e?.player?.name,

              e?.player_name,

              e?.athlete
                ?.displayName,

              e?.name,

              e?.participants
                ?.
                [0]
                ?.athlete
                ?.displayName,

              e?.text,

              e?.detail,

              "Événement"
            );

          const team =
            first(
              e?.team?.name,
              e?.team_name,
              e?.club?.name,
              ""
            );

          const minute =
            first(
              e?.minute,
              e?.elapsed,
              e?.clock
                ?.displayValue,
              e?.time
                ?.elapsed,
              "-"
            );

          return `

            <div
              class="bfnd-event"
            >

              <div
                class="bfnd-event-minute"
              >
                ${esc(
                  minute
                )}'
              </div>

              <div
                class="bfnd-event-icon"
              >
                ${eventIcon(e)}
              </div>

              <div>

                <div
                  class="bfnd-event-main"
                >
                  ${esc(p)}
                </div>

                ${
                  team
                    ? `
                      <div
                        class="bfnd-event-team"
                      >
                        ${esc(
                          team
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
  }

  /* =========================================================
     RENDER FULL DETAILS
  ========================================================= */

  function renderDetails(
    details,
    source
  ) {

    const modal =
      ensureModal();

    const content =
      document.getElementById(
        "bfnd-content"
      );

    const home =
      getTeam(
        details,
        "home"
      );

    const away =
      getTeam(
        details,
        "away"
      );

    const homeLineup =
      getLineup(
        details,
        "home",
        home
      );

    const awayLineup =
      getLineup(
        details,
        "away",
        away
      );

    const league =
      String(
        first(
          details?.league?.name,
          details?.competition?.name,
          "Football"
        )
      );

    const status =
      String(
        first(
          details?.fixture
            ?.status?.long,

          details?.fixture
            ?.status?.short,

          details?.status_text,

          details?.status,

          "MATCH"
        )
      );

    const date =
      first(
        details?.fixture?.date,
        details?.date,
        ""
      );

    content.innerHTML = `

      <div
        class="bfnd-league"
      >
        🏆 ${esc(
          league
        )}
      </div>


      <div
        class="bfnd-head"
      >

        <div
          class="bfnd-team"
        >

          ${
            home.logo
              ? `
                <img
                  src="${esc(
                    home.logo
                  )}"
                  alt="${esc(
                    home.name
                  )}"
                >
              `
              : "⚽"
          }

          <div>
            ${esc(
              home.name
            )}
          </div>

        </div>


        <div>

          <div
            class="bfnd-score"
          >

            ${esc(
              getScore(
                details,
                "home"
              )
            )}

            -

            ${esc(
              getScore(
                details,
                "away"
              )
            )}

          </div>

          <div
            class="bfnd-status"
          >
            ${esc(
              status
            )}
          </div>

        </div>


        <div
          class="bfnd-team"
        >

          ${
            away.logo
              ? `
                <img
                  src="${esc(
                    away.logo
                  )}"
                  alt="${esc(
                    away.name
                  )}"
                >
              `
              : "⚽"
          }

          <div>
            ${esc(
              away.name
            )}
          </div>

        </div>

      </div>


      <div
        class="bfnd-info"
      >

        ${
          date
            ? `
              <span>
                📅 ${esc(
                  new Date(
                    date
                  ).toLocaleString(
                    "fr-FR"
                  )
                )}
              </span>
            `
            : ""
        }


        ${
          details?.fixture
            ?.venue
            ? `
              <span>

                🏟️ ${esc(
                  typeof
                    details
                      .fixture
                      .venue ===
                    "object"

                    ? first(
                        details
                          .fixture
                          .venue
                          ?.name,

                        details
                          .fixture
                          .venue
                          ?.displayName,

                        ""
                      )

                    : details
                        .fixture
                        .venue
                )}

              </span>
            `
            : ""
        }


        <span>
          🔗 ${esc(
            source
          )}
        </span>

      </div>


      <div
        class="bfnd-section"
      >

        <div
          class="bfnd-title"
        >
          🧩 Formations & Compositions
        </div>

        <div
          class="bfnd-pitches"
        >

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


      <div
        class="bfnd-section"
      >

        <div
          class="bfnd-title"
        >
          👥 Joueurs
        </div>

        <div
          class="bfnd-grid"
        >

          <div
            class="bfnd-panel"
          >

            <b>
              ${esc(
                home.name
              )}
            </b>

            ${renderPlayers(
              homeLineup
            )}

          </div>


          <div
            class="bfnd-panel"
          >

            <b>
              ${esc(
                away.name
              )}
            </b>

            ${renderPlayers(
              awayLineup
            )}

          </div>

        </div>

      </div>


      <div
        class="bfnd-section"
      >

        <div
          class="bfnd-title"
        >
          ⏱️ Événements
        </div>

        ${renderEvents(
          details
        )}

      </div>

    `;

    modal.style.display =
      "block";

    document.body.style.overflow =
      "hidden";
  }

  /* =========================================================
     FETCH DETAILS
  ========================================================= */

  async function fetchDetails(
    source
  ) {

    const response =
      await fetch(
        API +
          encodeURIComponent(
            source.value
          ) +
          "&source=" +
          encodeURIComponent(
            source.provider
          ),

        {
          cache:
            "no-store",

          headers: {
            Accept:
              "application/json"
          }
        }
      );

    const raw =
      await response.text();

    if (
      !response.ok
    ) {

      throw new Error(
        `API HTTP ${response.status}`
      );

    }

    let data;

    try {

      data =
        JSON.parse(
          raw
        );

    } catch {

      throw new Error(
        "Réponse JSON invalide"
      );

    }

    const details =
      data?.data ||
      data?.match ||
      data;

    if (
      !details ||
      typeof details !==
        "object" ||
      Array.isArray(details)
    ) {

      throw new Error(
        "Détails du match introuvables"
      );

    }

    return details;
  }

  /* =========================================================
     OPEN NEW MATCH
  ========================================================= */

  async function openNewMatch(
    index,
    card
  ) {

    const match =
      getMatch(index);

    if (!match) {
      return false;
    }

    const modal =
      ensureModal();

    const content =
      document.getElementById(
        "bfnd-content"
      );

    modal.style.display =
      "block";

    document.body.style.overflow =
      "hidden";

    content.innerHTML = `

      <div
        class="bfnd-loading"
      >

        ⏳ جاري البحث على تفاصيل الماتش...

      </div>

    `;

    try {

      const source =
        await findExternalSource(
          match,
          card
        );

      if (!source) {

        closeModal();

        return false;

      }

      console.log(
        "BAKHIRAFOOT NEW MATCH SOURCE:",
        source
      );

      const details =
        await fetchDetails(
          source
        );

      renderDetails(
        details,

        source.provider ===
          "sofascore"

          ? "SofaScore"

          : source.provider ===
              "espn"

            ? "ESPN"

            : "TheSportsDB"
      );

      return true;

    } catch (error) {

      console.error(
        "BAKHIRAFOOT NEW MATCH DETAILS ERROR:",
        error
      );

      content.innerHTML = `

        <div
          class="bfnd-loading"
        >

          ❌ ما قدرناش نجيبو تفاصيل هاد الماتش دابا.

          <br>
          <br>

          <small>
            ${esc(
              error?.message ||
                "Erreur inconnue"
            )}
          </small>

        </div>

      `;

      return true;
    }
  }

  /* =========================================================
     CLICK INTERCEPTOR
  ========================================================= */

  document.addEventListener(
    "click",

    async function (event) {

      const target =
        event.target;

      if (
        !target?.closest
      ) {
        return;
      }

      const card =
        target.closest(

          ".match-card, " +
          ".bf-score-pro-card, " +
          ".bf-score-professional-match"

        );

      if (!card) {
        return;
      }

      const index =
        Number(
          card.dataset.matchIndex
        );

      if (
        !Number.isInteger(
          index
        ) ||
        index < 0
      ) {
        return;
      }

      const match =
        getMatch(index);

      if (!match) {
        return;
      }

      const hasExternal =
        collectKnownSources(
          match,
          card
        ).length > 0
        ||
        getProvider(
          match
        ) ===
          "sofascore"
        ||
        getProvider(
          match
        ) ===
          "sofa"
        ||
        getProvider(
          match
        ) ===
          "espn"
        ||
        getProvider(
          match
        ) ===
          "thesportsdb"
        ||
        getProvider(
          match
        ) ===
          "tsdb";

      /*
       * ماتش جديد:
       * نحبسو onclick القديم
       */

      if (!hasExternal) {

        event.preventDefault();

        event.stopImmediatePropagation();

        const worked =
          await openNewMatch(
            index,
            card
          );

        /*
         * إلا ما لقا حتى source
         * نرجعو للقديم
         */

        if (
          !worked &&
          typeof
            window
              .bfOldOpenMatchDetails ===
            "function"
        ) {

          window
            .bfOldOpenMatchDetails(
              index
            );

        }

        return;
      }

      event.preventDefault();

      event.stopImmediatePropagation();

      await openNewMatch(
        index,
        card
      );

    },

    true
  );

  /* =========================================================
     PROGRAMMATIC openMatchDetails(index)
  ========================================================= */

  const oldOpen =
    window.openMatchDetails;

  if (
    !window
      .bfOldOpenMatchDetails
  ) {

    window
      .bfOldOpenMatchDetails =
      oldOpen;

  }

  window.bfOpenMatchDetails =
    async function (
      identifier
    ) {

      let source =
        null;

      const value =
        String(
          identifier ||
            ""
        ).trim();

      if (
        /^sofa-/i.test(
          value
        )
      ) {

        source = {
          provider:
            "sofascore",

          value
        };

      } else if (
        /^espn-/i.test(
          value
        )
      ) {

        source = {
          provider:
            "espn",

          value
        };

      } else if (
        /^tsdb-/i.test(
          value
        )
      ) {

        source = {
          provider:
            "thesportsdb",

          value
        };

      }

      if (!source) {
        return false;
      }

      try {

        const details =
          await fetchDetails(
            source
          );

        renderDetails(
          details,

          source.provider ===
            "sofascore"

            ? "SofaScore"

            : source.provider ===
                "espn"

              ? "ESPN"

              : "TheSportsDB"
        );

        return true;

      } catch (error) {

        console.error(
          error
        );

        return false;
      }
    };

  window.openMatchDetails =
    async function (
      index
    ) {

      const card =
        document.querySelector(

          [
            `.match-card[data-match-index="${index}"]`,

            `.bf-score-pro-card[data-match-index="${index}"]`,

            `.bf-score-professional-match[data-match-index="${index}"]`
          ].join(",")

        );

      const worked =
        await openNewMatch(
          Number(index),
          card
        );

      if (
        !worked &&
        typeof
          window
            .bfOldOpenMatchDetails ===
          "function"
      ) {

        return window
          .bfOldOpenMatchDetails(
            index
          );

      }
    };

  /* =========================================================
     ESC CLOSE
  ========================================================= */

  document.addEventListener(
    "keydown",

    event => {

      if (
        event.key ===
        "Escape"
      ) {

        closeModal();

      }

    }
  );

  console.log(
    "✅ BakhiraFoot New Match Details loaded"
  );

})();
