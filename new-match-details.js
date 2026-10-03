(function () {
  "use strict";

  /* =========================================================
     BAKHIRAFOOT PRO - NEW MATCH DETAILS SAFE VERSION

     - ما كيمسش Match Details القديم
     - ما كيدير حتى request مباشر لـSofaScore/ESPN/TSDB
     - كيهضر غير مع /api ديال الموقع
     - كيتدخل غير للماتش اللي عندو مصدر details خارجي
     ========================================================= */

  if (window.__BF_NEW_MATCH_DETAILS_SAFE__) {
    return;
  }

  window.__BF_NEW_MATCH_DETAILS_SAFE__ = true;

  const API = "/api?fixture=";

  const arr = value =>
    Array.isArray(value)
      ? value
      : [];

  const obj = value =>
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value
      : {};

  const first = (...values) => {
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
  };

  const esc = value =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const norm = value =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  /* =========================================================
     CURRENT MATCHES
     ========================================================= */

  function getMatches() {
    try {
      if (
        typeof currentMatches !== "undefined" &&
        Array.isArray(currentMatches)
      ) {
        return currentMatches;
      }
    } catch (error) {}

    return [];
  }

  function getMatch(index) {
    return (
      getMatches()[index] ||
      null
    );
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

  /* =========================================================
     PROVIDER
     ========================================================= */

  function providerName(value) {
    const p =
      norm(value).replace(/ /g, "");

    if (
      p.includes("sofa")
    ) {
      return "sofascore";
    }

    if (
      p.includes("espn")
    ) {
      return "espn";
    }

    if (
      p.includes("sportsdb") ||
      p.includes("tsdb")
    ) {
      return "thesportsdb";
    }

    return "";
  }

  /* =========================================================
     SOURCE BUILDER
     ========================================================= */

  function makeSource(
    provider,
    id,
    slug
  ) {
    const source =
      providerName(provider);

    if (!source) {
      return null;
    }

    let value =
      String(
        first(
          slug,
          id,
          ""
        ) || ""
      ).trim();

    if (!value) {
      return null;
    }

    if (
      source === "sofascore" &&
      !/^sofa-/i.test(value)
    ) {
      value =
        "sofa-" + value;
    }

    if (
      source === "espn" &&
      !/^espn-/i.test(value)
    ) {
      value =
        "espn-" + value;
    }

    if (
      source === "thesportsdb" &&
      !/^tsdb-/i.test(value)
    ) {
      value =
        "tsdb-" + value;
    }

    return {
      source,
      value
    };
  }

  function getExternalSources(
    match
  ) {
    const sources = [];

    function add(
      provider,
      id,
      slug
    ) {
      const source =
        makeSource(
          provider,
          id,
          slug
        );

      if (!source) {
        return;
      }

      if (
        !sources.some(
          item =>
            item.source ===
              source.source &&
            item.value ===
              source.value
        )
      ) {
        sources.push(
          source
        );
      }
    }

    /* مصدر الماتش */

    add(
      match?.provider,
      match?.fixture
        ?.upstreamId ||
        match?.upstreamId ||
        match?.fixture?.id ||
        match?.id,

      match?.fixture
        ?.slug ||
        match?.slug
    );

    /* detailsProviders */

    const lists = [
      match?.detailsProviders,
      match?.detailsSources,
      match?.fixture
        ?.detailsProviders,
      match?.fixture
        ?.detailsSources
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

    /* direct details fields */

    add(
      match?.detailsProvider,
      match?.detailsId,
      match?.detailsSlug
    );

    add(
      match?.fixture
        ?.detailsProvider,

      match?.fixture
        ?.detailsId,

      match?.fixture
        ?.detailsSlug
    );

    /*
     * الأولوية
     * SofaScore
     * ثم ESPN
     * ثم TheSportsDB
     */

    const priority = {
      sofascore: 1,
      espn: 2,
      thesportsdb: 3
    };

    sources.sort(
      (a, b) =>
        (
          priority[a.source] ||
          99
        ) -
        (
          priority[b.source] ||
          99
        )
    );

    return sources;
  }

  /* =========================================================
     TEAM
     ========================================================= */

  function getTeam(
    details,
    side
  ) {
    const team =
      details?.teams?.[side] ||
      details?.[
        side + "_team"
      ] ||
      details?.[side] ||
      {};

    return {
      id:
        first(
          team?.id,
          team?.team_id
        ),

      name:
        String(
          first(
            team?.name,
            team?.displayName,
            team?.shortName,

            side === "home"
              ? "Domicile"
              : "Extérieur"
          )
        ),

      logo:
        String(
          first(
            team?.logo,
            team?.image,
            team?.badge,
            team?.picture,
            ""
          )
        )
    };
  }

  /* =========================================================
     PLAYER HELPERS
     ========================================================= */

  function getPlayerObject(
    player
  ) {
    if (
      player?.player &&
      typeof player.player ===
        "object"
    ) {
      return player.player;
    }

    return player || {};
  }

  function playerName(
    player
  ) {
    const p =
      getPlayerObject(
        player
      );

    return String(
      first(
        player?.name,
        player?.player_name,
        p?.name,
        p?.displayName,
        p?.fullName,
        "Joueur"
      )
    );
  }

  function playerNumber(
    player
  ) {
    const p =
      getPlayerObject(
        player
      );

    return first(
      player?.number,
      player?.shirt_number,
      player?.shirtNumber,
      player?.jersey,
      p?.number,
      "-"
    );
  }

  function playerPosition(
    player
  ) {
    const p =
      getPlayerObject(
        player
      );

    const value =
      first(
        player?.position,
        player?.pos,
        player?.role,
        p?.position,
        p?.pos,
        ""
      );

    if (
      typeof value ===
      "object"
    ) {
      return String(
        first(
          value?.name,
          value?.abbreviation,
          ""
        )
      );
    }

    return String(
      value || ""
    );
  }

  function playerPhoto(
    player
  ) {
    const p =
      getPlayerObject(
        player
      );

    return String(
      first(
        player?.photo,
        player?.image,
        player?.picture,
        player?.headshot,
        player?.avatar,

        p?.photo,
        p?.image,
        p?.picture,
        p?.headshot,
        p?.avatar,

        ""
      )
    );
  }

  function playerRating(
    player
  ) {
    const p =
      getPlayerObject(
        player
      );

    const value =
      first(
        player?.rating,
        player?.match_rating,
        player?.statistics
          ?.rating,
        player?.performance
          ?.rating,

        p?.rating,
        p?.statistics
          ?.rating
      );

    if (
      value === null
    ) {
      return null;
    }

    const number =
      Number(
        String(value)
          .replace(
            ",",
            "."
          )
      );

    return Number.isFinite(
      number
    )
      ? number
      : null;
  }

  /* =========================================================
     LINEUP
     ========================================================= */

  function getLineup(
    details,
    side,
    team
  ) {
    const raw =
      details?.lineups;

    let block = null;

    if (
      Array.isArray(raw)
    ) {

      block =
        raw.find(
          item => {

            const t =
              item?.team ||
              {};

            const itemSide =
              norm(
                item?.side
              );

            return (
              (
                team?.id &&
                t?.id &&
                String(
                  team.id
                ) ===
                String(
                  t.id
                )
              )

              ||

              (
                team?.name &&
                t?.name &&
                norm(
                  team.name
                ) ===
                norm(
                  t.name
                )
              )

              ||

              itemSide ===
                side

              ||

              (
                side ===
                  "home" &&
                itemSide ===
                  "host"
              )

              ||

              (
                side ===
                  "away" &&
                itemSide ===
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
        formation: "—",
        players: []
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
     EVENTS
     ========================================================= */

  function getEvents(
    details
  ) {
    return arr(
      first(
        details?.events,
        details?.incidents,
        details?.plays,
        []
      )
    );
  }

  function eventType(
    event
  ) {
    return norm(
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
  }

  function eventIcon(
    event
  ) {
    const type =
      eventType(
        event
      );

    if (
      type.includes(
        "goal"
      ) ||
      type.includes(
        "score"
      )
    ) {
      return "⚽";
    }

    if (
      type.includes(
        "yellow"
      )
    ) {
      return "🟨";
    }

    if (
      type.includes(
        "red"
      )
    ) {
      return "🟥";
    }

    if (
      type.includes(
        "sub"
      )
    ) {
      return "🔄";
    }

    return "•";
  }

  function eventPlayer(
    event
  ) {
    return String(
      first(

        event?.player
          ?.name,

        event?.player_name,

        event?.athlete
          ?.displayName,

        event?.name,

        event
          ?.participants?.[0]
          ?.athlete
          ?.displayName,

        event?.text,

        event?.detail,

        "Événement"
      )
    );
  }

  function eventAssist(
    event
  ) {
    return String(
      first(
        event?.assist
          ?.name,

        event?.assist
          ?.player
          ?.name,

        event
          ?.participants?.[1]
          ?.athlete
          ?.displayName,

        ""
      )
    );
  }

  function eventMinute(
    event
  ) {
    return first(
      event?.minute,
      event?.elapsed,
      event?.clock
        ?.displayValue,
      event?.time
        ?.elapsed,
      "-"
    );
  }

  /* =========================================================
     STYLES
     ========================================================= */

  function createStyles() {

    if (
      document.getElementById(
        "bf-new-match-safe-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "bf-new-match-safe-style";

    style.textContent = `

      #bf-new-match-safe-modal{
        display:none;
        position:fixed;
        inset:0;
        z-index:1000000;
      }

      .bf-new-safe-overlay{
        position:absolute;
        inset:0;
        background:rgba(0,0,0,.84);

        display:flex;
        justify-content:center;
        align-items:center;

        padding:12px;
      }

      .bf-new-safe-box{
        position:relative;

        width:min(
          1120px,
          100%
        );

        max-height:94vh;

        overflow:auto;

        background:
          var(--card,#fff);

        color:
          var(--text,#111827);

        border-radius:22px;

        padding:22px;

        box-shadow:
          0 30px 100px
          rgba(0,0,0,.45);
      }

      .bf-new-safe-close{
        position:absolute;

        right:12px;
        top:12px;

        width:40px;
        height:40px;

        border:0;
        border-radius:50%;

        cursor:pointer;

        font-size:18px;
        font-weight:950;
      }

      .bf-new-safe-league{
        text-align:center;

        font-size:13px;
        font-weight:900;

        opacity:.7;
      }

      .bf-new-safe-head{
        display:grid;

        grid-template-columns:
          1fr auto 1fr;

        gap:16px;

        align-items:center;

        text-align:center;

        margin:
          18px 0;
      }

      .bf-new-safe-team{
        font-size:14px;
        font-weight:950;

        overflow-wrap:anywhere;
      }

      .bf-new-safe-team img{
        width:72px;
        height:72px;

        object-fit:contain;

        display:block;

        margin:
          0 auto 7px;
      }

      .bf-new-safe-score{
        font-size:42px;
        font-weight:950;
      }

      .bf-new-safe-status{
        display:inline-block;

        margin-top:7px;

        padding:
          6px 11px;

        border-radius:999px;

        background:
          rgba(127,127,127,.1);

        font-size:10px;
        font-weight:900;
      }

      .bf-new-safe-info{
        display:flex;

        justify-content:center;

        flex-wrap:wrap;

        gap:7px;
      }

      .bf-new-safe-info span{
        padding:
          6px 10px;

        border-radius:999px;

        background:
          rgba(127,127,127,.08);

        font-size:10px;
      }

      .bf-new-safe-section{
        margin-top:22px;

        padding-top:18px;

        border-top:
          1px solid
          rgba(127,127,127,.16);
      }

      .bf-new-safe-title{
        font-size:17px;
        font-weight:950;

        margin-bottom:13px;
      }

      .bf-new-safe-pitches{
        display:grid;

        grid-template-columns:
          1fr 1fr;

        gap:16px;
      }

      .bf-new-safe-pitch-wrap{
        padding:8px;
      }

      .bf-new-safe-pitch-head{
        display:flex;

        justify-content:
          space-between;

        gap:8px;

        margin-bottom:7px;

        font-size:11px;
        font-weight:950;
      }

      .bf-new-safe-pitch{
        position:relative;

        aspect-ratio:
          .68;

        border-radius:13px;

        overflow:hidden;

        background:
          repeating-linear-gradient(
            90deg,
            #2f7d43 0,
            #2f7d43 10%,
            #35874a 10%,
            #35874a 20%
          );
      }

      .bf-new-safe-border{
        position:absolute;

        inset:7px;

        border:
          2px solid #fff;
      }

      .bf-new-safe-half{
        position:absolute;

        left:7px;
        right:7px;

        top:50%;

        height:2px;

        background:#fff;
      }

      .bf-new-safe-circle{
        position:absolute;

        left:50%;
        top:50%;

        width:20%;

        aspect-ratio:1;

        border:
          2px solid #fff;

        border-radius:50%;

        transform:
          translate(
            -50%,
            -50%
          );
      }

      .bf-new-safe-player{
        position:absolute;

        transform:
          translate(
            -50%,
            -50%
          );

        width:82px;

        text-align:center;

        color:#fff;
      }

      .bf-new-safe-player img,
      .bf-new-safe-avatar{
        width:41px;
        height:41px;

        border-radius:50%;

        object-fit:cover;

        background:#fff;

        border:
          2px solid #fff;
      }

      .bf-new-safe-player-name{
        font-size:8px;
        font-weight:900;

        background:
          rgba(0,0,0,.76);

        border-radius:4px;

        padding:2px;

        white-space:nowrap;

        overflow:hidden;

        text-overflow:ellipsis;
      }

      .bf-new-safe-player-rate{
        display:inline-block;

        padding:
          2px 4px;

        background:#fff;

        color:#111;

        border-radius:4px;

        font-size:8px;
        font-weight:900;
      }

      .bf-new-safe-columns{
        display:grid;

        grid-template-columns:
          1fr 1fr;

        gap:16px;
      }

      .bf-new-safe-panel{
        padding:12px;

        border-radius:14px;

        background:
          rgba(127,127,127,.06);
      }

      .bf-new-safe-list-player{
        display:grid;

        grid-template-columns:
          40px 30px 1fr auto;

        align-items:center;

        gap:7px;

        padding:7px;

        margin-bottom:6px;

        border-radius:8px;

        background:
          rgba(127,127,127,.07);
      }

      .bf-new-safe-list-player img,
      .bf-new-safe-list-avatar{
        width:38px;
        height:38px;

        border-radius:50%;

        object-fit:cover;

        background:
          rgba(127,127,127,.1);
      }

      .bf-new-safe-number{
        width:28px;
        height:28px;

        display:flex;
        align-items:center;
        justify-content:center;

        border-radius:50%;

        background:
          rgba(127,127,127,.1);

        font-size:9px;
        font-weight:950;
      }

      .bf-new-safe-name{
        font-size:11px;
        font-weight:950;
      }

      .bf-new-safe-pos{
        font-size:9px;
        opacity:.58;
      }

      .bf-new-safe-rating{
        font-size:9px;
        font-weight:950;
      }

      .bf-new-safe-event{
        display:grid;

        grid-template-columns:
          45px 30px 1fr;

        align-items:center;

        gap:8px;

        padding:8px;

        margin-bottom:6px;

        border-radius:8px;

        background:
          rgba(127,127,127,.07);
      }

      .bf-new-safe-minute{
        font-size:10px;
        font-weight:950;
      }

      .bf-new-safe-icon{
        font-size:17px;
      }

      .bf-new-safe-event-player{
        font-size:10px;
        font-weight:950;
      }

      .bf-new-safe-event-team{
        font-size:9px;
        opacity:.55;
      }

      .bf-new-safe-assist{
        font-size:9px;
        opacity:.7;

        margin-top:2px;
      }

      .bf-new-safe-loading{
        text-align:center;

        padding:
          60px 12px;

        font-size:13px;
        font-weight:950;
      }

      .bf-new-safe-empty{
        padding:12px;

        border-radius:9px;

        background:
          rgba(127,127,127,.06);

        font-size:10px;

        opacity:.7;
      }

      .bf-new-safe-error{
        text-align:center;

        padding:
          40px 12px;

        color:#ef4444;

        font-weight:950;
      }

      @media(max-width:800px){

        .bf-new-safe-pitches,
        .bf-new-safe-columns{
          grid-template-columns:1fr;
        }

      }

      @media(max-width:600px){

        .bf-new-safe-box{
          padding:16px 9px;
        }

        .bf-new-safe-head{
          gap:7px;
        }

        .bf-new-safe-score{
          font-size:28px;
        }

        .bf-new-safe-team{
          font-size:11px;
        }

        .bf-new-safe-team img{
          width:56px;
          height:56px;
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
        "bf-new-match-safe-modal"
      );

    if (modal) {
      return modal;
    }

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "bf-new-match-safe-modal";

    modal.innerHTML = `

      <div
        class="bf-new-safe-overlay"
      >

        <div
          class="bf-new-safe-box"
          onclick="
            event.stopPropagation()
          "
        >

          <button
            type="button"
            class="bf-new-safe-close"
          >
            ✕
          </button>

          <div
            id="bf-new-safe-content"
          ></div>

        </div>

      </div>

    `;

    document.body.appendChild(
      modal
    );

    modal
      .querySelector(
        ".bf-new-safe-close"
      )
      .onclick =
      closeModal;

    modal
      .querySelector(
        ".bf-new-safe-overlay"
      )
      .onclick =
      closeModal;

    createStyles();

    return modal;
  }

  function closeModal() {

    const modal =
      document.getElementById(
        "bf-new-match-safe-modal"
      );

    if (modal) {
      modal.style.display =
        "none";
    }

    document.body.style.overflow =
      "";
  }

  /* =========================================================
     PITCH POSITIONS
     ========================================================= */

  function getPitchPlayers(
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

    for (
      const player of players
    ) {

      const p =
        norm(
          playerPosition(
            player
          )
        );

      if (
        p.includes("goal") ||
        p.includes("keeper") ||
        p === "gk" ||
        p === "g"
      ) {

        groups.gk.push(
          player
        );

      } else if (
        p.includes("def") ||
        p.includes("back") ||
        p.includes("cb") ||
        p.includes("lb") ||
        p.includes("rb")
      ) {

        groups.def.push(
          player
        );

      } else if (
        p.includes("mid") ||
        p.includes("mf") ||
        p.includes("cm") ||
        p.includes("dm") ||
        p.includes("am")
      ) {

        groups.mid.push(
          player
        );

      } else if (
        p.includes("att") ||
        p.includes("fwd") ||
        p.includes("fw") ||
        p.includes("strik") ||
        p.includes("wing") ||
        p.includes("forward")
      ) {

        groups.att.push(
          player
        );

      } else {

        groups.unknown.push(
          player
        );

      }

    }

    let formation =
      String(
        lineup.formation ||
        "4-3-3"
      )
        .split("-")
        .map(Number)
        .filter(
          n => n > 0
        );

    if (
      !formation.length
    ) {
      formation =
        [4,3,3];
    }

    const rows = [
      groups.gk.slice(0,1)
    ];

    let di = 0;
    let mi = 0;
    let ai = 0;
    let ui = 0;

    formation.forEach(
      (
        count,
        rowIndex
      ) => {

        let source = [];

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

    const result = [];

    rows.forEach(
      (
        row,
        rowIndex
      ) => {

        row.forEach(
          (
            player,
            playerIndex
          ) => {

            const x =
              row.length === 1
                ? 50
                : 16 +
                  68 *
                    (
                      playerIndex /
                      Math.max(
                        1,
                        row.length - 1
                      )
                    );

            let y =
              rows.length === 1
                ? 50
                : 8 +
                  84 *
                    (
                      rowIndex /
                      Math.max(
                        1,
                        rows.length - 1
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

    return result;
  }

  /* =========================================================
     RENDER PITCH
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

        <div
          class="bf-new-safe-panel"
        >

          <div
            class="bf-new-safe-pitch-head"
          >

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

          <div
            class="bf-new-safe-empty"
          >
            Composition indisponible
          </div>

        </div>

      `;

    }

    return `

      <div
        class="bf-new-safe-pitch-wrap"
      >

        <div
          class="bf-new-safe-pitch-head"
        >

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

        <div
          class="bf-new-safe-pitch"
        >

          <div
            class="bf-new-safe-border"
          ></div>

          <div
            class="bf-new-safe-half"
          ></div>

          <div
            class="bf-new-safe-circle"
          ></div>

          ${
            getPitchPlayers(
              lineup,
              side
            )
            .map(
              item => {

                const player =
                  item.player;

                const photo =
                  playerPhoto(
                    player
                  );

                const rating =
                  playerRating(
                    player
                  );

                return `

                  <div
                    class="bf-new-safe-player"
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
                              playerName(
                                player
                              )
                            )}"
                          >

                        `

                        : `

                          <div
                            class="bf-new-safe-avatar"
                          >
                            ⚽
                          </div>

                        `
                    }

                    <div
                      class="bf-new-safe-player-name"
                    >
                      ${esc(
                        playerName(
                          player
                        )
                      )}
                    </div>

                    ${
                      rating !== null

                        ? `

                          <div
                            class="bf-new-safe-player-rate"
                          >
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
            .join("")
          }

        </div>

      </div>

    `;
  }

  /* =========================================================
     RENDER PLAYERS
     ========================================================= */

  function renderPlayers(
    lineup
  ) {

    if (
      !lineup.players.length
    ) {

      return `

        <div
          class="bf-new-safe-empty"
        >
          Joueurs indisponibles
        </div>

      `;

    }

    return lineup.players
      .map(
        player => {

          const photo =
            playerPhoto(
              player
            );

          const rating =
            playerRating(
              player
            );

          return `

            <div
              class="bf-new-safe-list-player"
            >

              ${
                photo

                  ? `

                    <img
                      src="${esc(
                        photo
                      )}"
                      alt="${esc(
                        playerName(
                          player
                        )
                      )}"
                    >

                  `

                  : `

                    <div
                      class="bf-new-safe-list-avatar"
                    >
                      ⚽
                    </div>

                  `
              }

              <div
                class="bf-new-safe-number"
              >
                ${esc(
                  playerNumber(
                    player
                  )
                )}
              </div>

              <div>

                <div
                  class="bf-new-safe-name"
                >
                  ${esc(
                    playerName(
                      player
                    )
                  )}
                </div>

                <div
                  class="bf-new-safe-pos"
                >
                  ${esc(
                    playerPosition(
                      player
                    )
                  )}
                </div>

              </div>

              <div
                class="bf-new-safe-rating"
              >

                ${
                  rating !== null
                    ? `⭐ ${esc(
                        Number(
                          rating
                        ).toFixed(1)
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
     RENDER EVENTS
     ========================================================= */

  function renderEvents(
    details
  ) {

    const events =
      getEvents(
        details
      );

    if (
      !events.length
    ) {

      return `

        <div
          class="bf-new-safe-empty"
        >
          Aucun événement détaillé disponible.
        </div>

      `;

    }

    return events
      .map(
        event => {

          const team =
            String(
              first(
                event?.team?.name,
                event?.team_name,
                event?.club?.name,
                ""
              )
            );

          const assist =
            eventAssist(
              event
            );

          return `

            <div
              class="bf-new-safe-event"
            >

              <div
                class="bf-new-safe-minute"
              >
                ${esc(
                  eventMinute(
                    event
                  )
                )}'
              </div>

              <div
                class="bf-new-safe-icon"
              >
                ${eventIcon(
                  event
                )}
              </div>

              <div>

                <div
                  class="bf-new-safe-event-player"
                >
                  ${esc(
                    eventPlayer(
                      event
                    )
                  )}
                </div>

                ${
                  team

                    ? `

                      <div
                        class="bf-new-safe-event-team"
                      >
                        ${esc(
                          team
                        )}
                      </div>

                    `

                    : ""
                }

                ${
                  assist

                    ? `

                      <div
                        class="bf-new-safe-assist"
                      >
                        🅰️ ${esc(
                          assist
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
     RENDER DETAILS
     ========================================================= */

  function renderDetails(
    details,
    source
  ) {

    const modal =
      ensureModal();

    const content =
      document.getElementById(
        "bf-new-safe-content"
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

    const homeScore =
      first(
        details?.score?.home,
        details?.goals?.home,
        details?.home_score,
        "-"
      );

    const awayScore =
      first(
        details?.score?.away,
        details?.goals?.away,
        details?.away_score,
        "-"
      );

    const competition =
      first(
        details?.league?.name,
        details?.competition?.name,
        "Football"
      );

    const status =
      first(
        details?.fixture
          ?.status?.long,

        details?.fixture
          ?.status?.short,

        details?.status_text,

        details?.status,

        "MATCH"
      );

    const date =
      first(
        details?.fixture
          ?.date,

        details?.date,

        ""
      );

    const providerText =
      source ===
        "sofascore"

        ? "SofaScore"

        : source ===
            "espn"

          ? "ESPN"

          : "TheSportsDB";

    content.innerHTML = `

      <div
        class="bf-new-safe-league"
      >
        🏆 ${esc(
          competition
        )}
      </div>


      <div
        class="bf-new-safe-head"
      >

        <div
          class="bf-new-safe-team"
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
            class="bf-new-safe-score"
          >

            ${esc(
              homeScore
            )}

            -

            ${esc(
              awayScore
            )}

          </div>

          <div
            class="bf-new-safe-status"
          >
            ${esc(
              status
            )}
          </div>

        </div>


        <div
          class="bf-new-safe-team"
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
        class="bf-new-safe-info"
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
          🔗 ${providerText}
        </span>

      </div>


      <div
        class="bf-new-safe-section"
      >

        <div
          class="bf-new-safe-title"
        >
          🧩 Formations & Compositions
        </div>

        <div
          class="bf-new-safe-pitches"
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
        class="bf-new-safe-section"
      >

        <div
          class="bf-new-safe-title"
        >
          👥 Joueurs
        </div>

        <div
          class="bf-new-safe-columns"
        >

          <div
            class="bf-new-safe-panel"
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
            class="bf-new-safe-panel"
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
        class="bf-new-safe-section"
      >

        <div
          class="bf-new-safe-title"
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
     FETCH THROUGH OUR API ONLY
     ========================================================= */

  async function fetchDetails(
    source
  ) {

    const url =
      API +
      encodeURIComponent(
        source.value
      ) +
      "&source=" +
      encodeURIComponent(
        source.source
      );

    console.log(
      "BAKHIRAFOOT NEW DETAILS REQUEST:",
      url
    );

    const response =
      await fetch(
        url,
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

    let payload;

    try {

      payload =
        JSON.parse(
          raw
        );

    } catch {

      throw new Error(
        "Réponse JSON invalide"
      );

    }

    if (
      !response.ok
    ) {

      const error =
        new Error(
          `API HTTP ${response.status}`
        );

      error.status =
        response.status;

      error.payload =
        payload;

      throw error;
    }

    const details =
      payload?.data ||
      payload?.match ||
      payload;

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
    index
  ) {

    const match =
      getMatch(index);

    if (!match) {
      return false;
    }

    const sources =
      getExternalSources(
        match
      );

    /*
     * مهم جداً:
     *
     * ماكاين حتى source خارجي؟
     * ما نديرو والو.
     *
     * هكا الماتش القديم
     * كيمشي للكود القديم ديالو.
     */

    if (
      !sources.length
    ) {

      return false;

    }

    const modal =
      ensureModal();

    const content =
      document.getElementById(
        "bf-new-safe-content"
      );

    modal.style.display =
      "block";

    document.body.style.overflow =
      "hidden";

    content.innerHTML = `

      <div
        class="bf-new-safe-loading"
      >
        ⏳ جاري تحميل تفاصيل المباراة...
      </div>

    `;

    let lastError =
      null;

    /*
     * نجرب المصدر الأول.
     * إذا ما خدمش نجرب الثاني.
     */

    for (
      const source of sources
    ) {

      try {

        const details =
          await fetchDetails(
            source
          );

        renderDetails(
          details,
          source.source
        );

        return true;

      } catch (error) {

        lastError =
          error;

        console.warn(
          "BAKHIRAFOOT SOURCE FAILED:",
          source,
          error
        );

      }

    }

    content.innerHTML = `

      <div
        class="bf-new-safe-error"
      >

        ❌ ما قدرناش نحملو تفاصيل هاد الماتش.

        <br>
        <br>

        <small>
          ${esc(
            lastError?.message ||
            "Erreur inconnue"
          )}
        </small>

      </div>

    `;

    return true;
  }

  /* =========================================================
     CLICK INTERCEPTOR
     ========================================================= */

  document.addEventListener(
    "click",
    async function (
      event
    ) {

      const target =
        event.target;

      if (
        !target ||
        !target.closest
      ) {
        return;
      }

      const card =
        target.closest(
          [
            ".match-card",
            ".bf-score-pro-card",
            ".bf-score-professional-match"
          ].join(",")
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

      const sources =
        getExternalSources(
          match
        );

      /*
       * أهم سطر:
       *
       * الماتشات القديمة
       * ما نتدخلوش فيها نهائياً.
       */

      if (
        !sources.length
      ) {

        return;

      }

      /*
       * غير هنا
       * كنوقفو onclick القديم.
       */

      event.preventDefault();

      event.stopImmediatePropagation();

      await openNewMatch(
        index
      );

    },

    true
  );

  /* =========================================================
     ESC
     ========================================================= */

  document.addEventListener(
    "keydown",
    function (
      event
    ) {

      if (
        event.key ===
        "Escape"
      ) {

        closeModal();

      }

    }
  );

  console.log(
    "✅ BakhiraFoot NEW MATCH DETAILS SAFE loaded"
  );

})();
