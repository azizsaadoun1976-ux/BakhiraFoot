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
  let activeNewDetailsRequest = 0;

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

    // Provider detail endpoints require the provider's event ID first.
    // Human-readable slugs can be stale or unrelated to the upstream ID.
    let value =
      String(
        first(
          id,
          slug,
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
    if (player?.tacticalPosition) return String(player.tacticalPosition);
    const p =
      getPlayerObject(
        player
      );

    const raw = player?.raw?.player || player?.raw || {};
    const candidates = [
      player?.position_name, player?.positionName,
      player?.position_abbreviation, player?.positionAbbreviation,
      player?.position_code, player?.positionCode,
      p?.position_name, p?.positionName,
      p?.position_abbreviation, p?.positionAbbreviation,
      p?.position_code, p?.positionCode,
      raw?.position_name, raw?.positionName,
      raw?.position_abbreviation, raw?.positionAbbreviation,
      raw?.position_code, raw?.positionCode,
      raw?.position, raw?.pos, raw?.role,
      player?.position, player?.pos, player?.role,
      p?.position, p?.pos, p?.role
    ];

    const labels = [];
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined || candidate === "") continue;
      if (typeof candidate === "object") {
        for (const key of [
          "position_name", "positionName",
          "position_abbreviation", "positionAbbreviation",
          "position_code", "positionCode",
          "abbreviation", "shortName", "short_name",
          "displayName", "display_name", "name", "label", "code"
        ]) {
          const label = candidate[key];
          if (label !== null && label !== undefined && String(label).trim()) labels.push(String(label).trim());
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
    const exactRole = labels.find(label =>
      !broadRoles.has(norm(label).replace(/[^a-z0-9]/g, ""))
    );
    const slotCandidate = first(
      player?.formation_slot, player?.formationSlot,
      player?.lineup_position, player?.lineupPosition,
      player?.formation_position, player?.formationPosition,
      p?.formation_slot, p?.formationSlot,
      p?.lineup_position, p?.lineupPosition,
      p?.formation_position, p?.formationPosition
    );
    const textualSlot = slotCandidate !== null &&
      slotCandidate !== undefined &&
      !/^\d+$/.test(String(slotCandidate).trim())
        ? String(slotCandidate)
        : "";
    const value = exactRole || labels[0] || textualSlot || "";

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

  function playerPhoto(player) {
    const p = getPlayerObject(player);
    const value = first(
      player?.photo, player?.image, player?.picture, player?.headshot, player?.avatar,
      p?.photo, p?.image, p?.picture, p?.headshot, p?.avatar,
      player?.profileImage, player?.profile_image,
      p?.profileImage, p?.profile_image
    );
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      return String(first(value.href, value.url, value.src, value.imageUrl, value.image_url, value.path, ""));
    }
    return "";
  }

  function playerRating(
    player
  ) {
    const p = getPlayerObject(player);
    const value = first(
      player?.rating, player?.match_rating, player?.statistics?.rating,
      player?.performance?.rating, p?.rating, p?.statistics?.rating,
      p?.performance?.rating, player?.raw?.rating, player?.raw?.statistics?.rating
    );
    if (value === null) return null;
    const number = Number(String(value).replace(",", "."));
    return Number.isFinite(number) && number > 0
      ? (number > 10 && number <= 100 ? number / 10 : number)
      : null;
  }

  function ratingToneClass(value) {
    const rating = Number(value);
    if (!Number.isFinite(rating)) return "";
    if (rating >= 8) return "bf-rating--excellent";
    if (rating >= 7) return "bf-rating--good";
    if (rating >= 6) return "bf-rating--average";
    if (rating >= 5.5) return "bf-rating--low";
    return "bf-rating--poor";
  }

  /* =========================================================
     LINEUP
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

    const firstArray = values => values.find(value => Array.isArray(value) && value.length) || [];
    const explicitStarters = firstArray([block?.startXI, block?.startingXI, block?.starting_xi, block?.xi, block?.starters]);
    const allPlayers = firstArray([block?.players, block?.lineup, block?.roster, explicitStarters, block?.substitutes]);
    const substitutes = firstArray([block?.substitutes, block?.subs, block?.bench]);
    const markedStarters = allPlayers.filter(player => player?.substitute !== true && player?.starter !== false);
    const hasSubstituteMarkers = allPlayers.some(player => player?.substitute === true || player?.starter === false);
    const starters = explicitStarters.length
      ? explicitStarters.slice(0, 11)
      : hasSubstituteMarkers
        ? markedStarters.slice(0, 11)
        : allPlayers.length <= 11 ? allPlayers.slice(0, 11) : [];

    const rawFormation = [
      typeof block?.formation === "string" ? block.formation : null,
      block?.formation?.name,
      block?.formation?.displayName,
      block?.formation?.label,
      block?.formation?.value,
      block?.formation?.formation,
      block?.tactics?.formation,
      block?.formationName,
      block?.formation_name,
      block?.tacticalFormation,
      block?.tactical_formation
    ].find(value => value !== undefined && value !== null && String(value).trim() !== "");

    let formationText = String(rawFormation || "").trim().replace(/[‐‑‒–—−]/g, "-").replace(/\s+/g, "");
    if (/^\d{3,4}$/.test(formationText)) formationText = formationText.split("").join("-");
    const formationParts = formationText.split("-").map(Number);
    const isValidFormation = formationParts.length >= 2 &&
      formationParts.length <= 4 &&
      formationParts.every(value => Number.isInteger(value) && value >= 1 && value <= 5) &&
      formationParts.reduce((sum, value) => sum + value, 0) === 10;

    const finalFormation = isValidFormation ? formationText : "—";
    const labelledStarters = bfAssignFormationRoles(starters, finalFormation, playerPosition);
    const keyOfPlayer = player => {
      const p = getPlayerObject(player);
      const id = first(player?.id, player?.player_id, player?.playerId, p?.id, p?.player_id, p?.playerId);
      return id !== null && id !== undefined && String(id).trim()
        ? "id:" + String(id).trim()
        : "name:" + norm(playerName(player));
    };
    const rolesByKey = new Map();
    labelledStarters.forEach(player => rolesByKey.set(keyOfPlayer(player), player.tacticalPosition || ""));
    const sourcePlayers = allPlayers.length ? allPlayers : [...starters, ...substitutes];
    const labelledPlayers = sourcePlayers.map(player => {
      const role = rolesByKey.get(keyOfPlayer(player));
      return role ? { ...player, tacticalPosition: role } : player;
    });
    return {
      formation: finalFormation,
      players: labelledPlayers,
      starters: labelledStarters,
      substitutes,
      pitchAvailable: starters.length > 0
    };
  }

  /* =========================================================
     EVENTS
     ========================================================= */

  function getEvents(details) {
    const eventKeys = new Set(["events", "incidents", "plays", "injuries", "cards", "goals", "timeline", "matchevents", "matchincidents", "matchtimeline"]);
    const queue = [{ value: details, depth: 0 }];
    const visited = new Set();
    const combined = [];
    const seenEvents = new Set();
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
    const addEvent = event => {
      if (!event || typeof event !== "object" || Array.isArray(event)) return;
      const time = first(event.minute, event.elapsed, event.time?.elapsed, event.time?.minute, event.time);
      const type = first(event.type?.name, event.type?.text, event.type?.slug, event.type, event.eventType, event.event_type, event.incidentType);
      const personValue = first(event.player, event.scorer, event.athlete, event.actor, event.person, event.injury?.player, event.card?.player, event.participants?.[0]?.athlete, event.participants?.[0]?.player, event.participants?.[0], event.players?.[0]);
      const player = eventPersonName(personValue);
      const detail = first(event.detail?.name, event.detail?.text, event.detail, event.description?.text, event.description, event.text, event.commentary, event.shortText, event.longText);
      const id = first(event.id, event.event_id, event.eventId, event.incidentId, event.incident_id);
      const signature = [time, type, player, detail].filter(v => v !== null && v !== undefined && v !== "").map(String).join("|") || JSON.stringify(event);
      const identity = id !== null && id !== undefined && String(id) !== "" ? "id:" + String(id) : "sig:" + signature;
      if (seenEvents.has(identity)) return;
      seenEvents.add(identity);
      combined.push(event);
    };
    const collectEventContainer = (value, depth = 0) => {
      if (!value || typeof value !== "object" || depth > 4) return;
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (looksLikeEvent(item)) addEvent(item);
          else collectEventContainer(item, depth + 1);
        });
        return;
      }
      if (looksLikeEvent(value)) addEvent(value);
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
    return combined;
  }

  function eventType(event) {
    const typeValue = value => {
      if (typeof value === "string" || typeof value === "number") return String(value);
      if (value && typeof value === "object") return String(first(value.name, value.text, value.label, value.slug, value.description, value.type, ""));
      return "";
    };
    const values = [
      typeValue(event?.type), typeValue(event?.eventType), typeValue(event?.event_type),
      typeValue(event?.incidentType), typeValue(event?.kind), typeValue(event?.detail),
      typeValue(event?.goal?.type), typeValue(event?.goal?.detail),
      typeValue(event?.injury?.type), typeValue(event?.card?.type),
      event?.text, event?.description, event?.commentary, event?.shortText, event?.longText,
      event?.incidentClass?.name, event?.reason?.name, event?.reason
    ];
    return norm(values.filter(v => v !== null && v !== undefined && v !== "").join(" "));
  }

  function eventPersonName(value) {
    if (typeof value === "string" || typeof value === "number") return String(value).trim();
    if (!value || typeof value !== "object") return "";
    return String(first(
      value.name, value.displayName, value.display_name,
      value.fullName, value.full_name, value.shortName, value.short_name,
      value.player?.name, value.player?.displayName,
      value.athlete?.displayName, value.athlete?.name,
      value.person?.name, value.injury?.player?.name, value.card?.player?.name,
      value.label, value.value?.name, value.value?.displayName, ""
    ) || "").trim();
  }

  function eventPlayerId(value) {
    if (!value || typeof value !== "object") return "";
    return String(first(
      value.id, value.player_id, value.playerId,
      value.athlete?.id, value.player?.id, value.person?.id, ""
    ) || "");
  }

  function samePerson(candidate, player) {
    const directId = eventPlayerId(candidate);
    const p = getPlayerObject(player);
    const playerIds = [
      player?.id, player?.player_id, player?.playerId,
      p?.id, p?.player_id, p?.playerId,
      player?.raw?.id, player?.raw?.player?.id
    ].filter(value => value !== null && value !== undefined && String(value).trim()).map(String);
    if (directId && playerIds.includes(directId)) return true;
    const a = norm(eventPersonName(candidate)).replace(/[^a-z0-9 ]/g, "").trim();
    const b = norm(playerName(player)).replace(/[^a-z0-9 ]/g, "").trim();
    if (!a || !b) return false;
    if (a === b) return true;
    const aa = a.split(/\s+/), bb = b.split(/\s+/);
    if (aa.length > 1 && bb.length > 1 && aa[aa.length - 1] === bb[bb.length - 1]) {
      if (aa[0][0] === bb[0][0]) return true;
      if (aa[0].length > 2 && bb[0].length > 2 &&
          (aa[0].startsWith(bb[0]) || bb[0].startsWith(aa[0]))) return true;
    }
    return false;
  }

  function eventIsGoal(event) {
    const type = eventType(event);
    return /goal|score|scoring|but\b/.test(type);
  }

  function eventIsSubstitution(event) {
    const type = eventType(event);
    return /substitut|subbing|subbed|replacement|replace|remplacement|changement|player change/.test(type);
  }

  function eventSubstitutionData(event) {
    const nested = event?.substitution || event?.substitutions || event?.change || event?.swap || {};
    let incoming = String(first(
      eventPersonName(event?.playerIn), eventPersonName(event?.player_in),
      eventPersonName(event?.incoming), eventPersonName(event?.incomingPlayer),
      eventPersonName(event?.incoming_player), eventPersonName(event?.substituteIn),
      eventPersonName(event?.substitute_in), eventPersonName(event?.playerOn),
      eventPersonName(event?.player_on), eventPersonName(nested?.in),
      eventPersonName(nested?.incoming), eventPersonName(nested?.playerIn),
      event?.playerInName, event?.player_in_name, event?.incomingPlayerName,
      ""
    ) || "").trim();
    let outgoing = String(first(
      eventPersonName(event?.playerOut), eventPersonName(event?.player_out),
      eventPersonName(event?.outgoing), eventPersonName(event?.outgoingPlayer),
      eventPersonName(event?.outgoing_player), eventPersonName(event?.replaced),
      eventPersonName(event?.substituteOut), eventPersonName(event?.substitute_out),
      eventPersonName(event?.playerOff), eventPersonName(event?.player_off),
      eventPersonName(nested?.out), eventPersonName(nested?.outgoing),
      eventPersonName(nested?.playerOut), event?.playerOutName, event?.player_out_name, ""
    ) || "").trim();

    const textValue = [event?.detail, event?.description, event?.text, event?.commentary, event?.shortText, event?.longText, event?.name]
      .filter(value => value !== null && value !== undefined && String(value).trim())
      .map(value => String(value).trim()).filter((value,index,items) => items.indexOf(value) === index).join(" ").replace(/\s+/g, " ").trim();
    const patterns = [
      { regex: /(?:substitution|remplacement)?\s*[:,\-]?\s*(.+?)\s+(?:comes on|come on|came on|enters|entered|is brought on|replaces|replace|for)\s+(?:for\s+)?(.+?)(?:[.!;,]|$)/i, mode: "in-out" },
      { regex: /(.+?)\s+(?:is substituted off|goes off|comes off|leaves the field|is taken off)\s*[,;:\-]?\s*(?:and\s+)?(.+?)\s+(?:comes on|enters|is brought on)/i, mode: "out-in" },
      { regex: /(.+?)\s+(?:is replaced by|replaced by|subbed off for)\s+(.+?)(?:[.!;,]|$)/i, mode: "out-in" },
      { regex: /(?:substitution|remplacement)[,:\-]?\s*(.+?)\s+for\s+(.+?)(?:[.!;,]|$)/i, mode: "in-out" },
      { regex: /(.+?)\s*↔\s*(.+?)(?:[.!;,]|$)/i, mode: "pair" }
    ];
    for (const item of patterns) {
      const match = textValue.match(item.regex);
      if (!match) continue;
      const firstName = match[1].replace(/^(substitution|remplacement)\s*[:,\-]?\s*/i, "").trim();
      const secondName = match[2].trim();
      if (firstName && secondName && firstName.length < 80 && secondName.length < 80) {
        if (item.mode === "in-out") { incoming = incoming || firstName; outgoing = outgoing || secondName; }
        else if (item.mode === "out-in") { outgoing = outgoing || firstName; incoming = incoming || secondName; }
      }
      if (incoming || outgoing) break;
    }

    const involved = [];
    const addInvolved = value => {
      const name = eventPersonName(value);
      if (name && !involved.some(existing => norm(existing) === norm(name))) involved.push(name);
    };
    addInvolved(event?.playerIn); addInvolved(event?.player_in); addInvolved(event?.playerOut); addInvolved(event?.player_out);
    addInvolved(event?.player); addInvolved(event?.assist);
    arr(event?.participants).forEach(person => addInvolved(person?.athlete || person?.player || person));
    arr(event?.players).forEach(addInvolved);
    if (incoming) addInvolved(incoming);
    if (outgoing) addInvolved(outgoing);
    return { incoming, outgoing, involved, text: textValue };
  }

  function eventType(event) {
    const values = [
      typeof event?.type === "object" ? event?.type?.name : event?.type,
      typeof event?.type === "object" ? event?.type?.text : "",
      event?.eventType, event?.event_type, event?.incidentType, event?.kind,
      event?.detail, event?.text, event?.description, event?.commentary,
      event?.injury?.type, event?.card?.type, event?.goalDescription, event?.cardDescription
    ];
    return norm(values.filter(v => v !== null && v !== undefined && v !== "").join(" "));
  }

  function eventIcon(event) {
    const type = eventType(event);
    if (/red card|second yellow|redcard|carton rouge/.test(type)) return '<span class="bf-new-event-glyph bf-new-event-glyph--red" title="Carton rouge"></span>';
    if (/yellow card|yellowcard|carton jaune/.test(type)) return '<span class="bf-new-event-glyph bf-new-event-glyph--yellow" title="Carton jaune"></span>';
    if (eventIsSubstitution(event)) return '<span class="bf-new-event-glyph bf-new-event-glyph--sub" title="Remplacement">⇄</span>';
    if (/injur|hurt|medical|bless/.test(type)) return '<span class="bf-new-event-glyph bf-new-event-glyph--injury" title="Blessure">✚</span>';
    if (/missed.*penalty|penalty.*missed|penalty.*saved/.test(type)) return '<span class="bf-new-event-glyph bf-new-event-glyph--missed" title="Penalty raté">×</span>';
    if (/penalt/.test(type)) return '<span class="bf-new-event-glyph bf-new-event-glyph--penalty" title="Penalty">🎯</span>';
    if (/goal|score|scoring|but\b/.test(type)) return '<span class="bf-new-event-glyph bf-new-event-glyph--goal" title="But">⚽</span>';
    if (/assist|passe decisive/.test(type)) return '<span class="bf-new-event-glyph bf-new-event-glyph--assist" title="Passe décisive">👟</span>';
    if (/var|video review/.test(type)) return '<span class="bf-new-event-glyph bf-new-event-glyph--var" title="VAR">VAR</span>';
    return '<span class="bf-new-event-glyph bf-new-event-glyph--other" title="Événement">•</span>';
  }

  function eventPlayer(event) {
    const primary = first(
      eventPersonName(event?.player), eventPersonName(event?.scorer),
      eventPersonName(event?.goalScorer), eventPersonName(event?.goal_scorer),
      eventPersonName(event?.goal?.player), eventPersonName(event?.athlete),
      eventPersonName(event?.actor), event?.player_name, event?.playerName,
      event?.scorer_name, event?.scorerName, event?.participant?.name,
      event?.participants?.[0]?.athlete?.displayName,
      event?.participants?.[0]?.athlete?.name,
      event?.participants?.[0]?.name, event?.participants?.[0]?.player?.name,
      event?.players?.[0]?.name, event?.name, ""
    );
    if (primary) return String(primary);
    if (eventIsSubstitution(event)) {
      const swap = eventSubstitutionData(event);
      if (swap.incoming && swap.outgoing) return "Remplacement";
      return swap.incoming || swap.outgoing || "Remplacement";
    }
    return String(first(event?.text, event?.detail, event?.description, "Événement"));
  }

  function eventAssist(event) {
    const direct = first(
      typeof event?.assist === "string" ? event.assist : null,
      eventPersonName(event?.assist), eventPersonName(event?.assistPlayer),
      eventPersonName(event?.assist_player), eventPersonName(event?.assistPerson),
      eventPersonName(event?.assist_person), eventPersonName(event?.relatedPlayer),
      eventPersonName(event?.related_player), eventPersonName(event?.secondPlayer),
      eventPersonName(event?.second_player), event?.assist_name, event?.assistName,
      event?.assist_player_name, event?.assistPlayerName,
      /* SofaScore incidents expose the decisive passer as assist1 (sometimes assist2). */
      eventPersonName(event?.assist1), eventPersonName(event?.assist_1),
      eventPersonName(event?.assist2), eventPersonName(event?.assist_2),
      event?.assist1_name, event?.assist1Name, event?.assist_1_name,
      eventPersonName(event?.goal?.assist), eventPersonName(event?.goal?.assistPlayer),
      eventPersonName(event?.goal?.assist1), eventPersonName(event?.goal?.assist_1),
      eventPersonName(event?.assists?.[0]), eventPersonName(event?.participants?.[1]?.athlete),
      eventPersonName(event?.participants?.[1]?.player), eventPersonName(event?.participants?.[1]),
      eventPersonName(event?.players?.[1]), ""
    );
    if (direct && String(direct).trim()) return String(direct).trim();
    if (!eventIsGoal(event)) return "";
    const textValue = [event?.goalDescription, event?.goal_description, event?.detail, event?.description, event?.text, event?.commentary, event?.shortText]
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
      if (match && match[1]) return match[1].trim();
    }
    return "";
  }

  function eventMinute(event) {
    return first(
      event?.minute, event?.elapsed, event?.clock?.displayValue,
      event?.time?.elapsed, event?.time?.displayValue,
      event?.time?.minute, "-"
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

      .bf-new-safe-combined-wrap { padding:8px 0; border:1px solid rgba(127,127,127,.18); border-radius:16px; overflow:hidden; background:rgba(127,127,127,.025); }
      .bf-new-safe-combined-head { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); align-items:center; gap:8px; padding:12px; background:linear-gradient(110deg,rgba(11,155,105,.13),rgba(59,130,246,.09)); }
      .bf-new-safe-combined-team { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:6px; min-width:0; font-size:12px; text-align:center; }
      .bf-new-safe-combined-team img { width:27px; height:27px; object-fit:contain; }
      .bf-new-safe-combined-team strong { overflow-wrap:anywhere; }
      .bf-new-safe-combined-team em { padding:3px 6px; border-radius:6px; background:rgba(127,127,127,.13); font-size:10px; font-style:normal; }
      .bf-new-safe-combined-vs { opacity:.55; font-size:10px; font-weight:950; }
      .bf-new-safe-combined-pitch { position:relative; width:min(100%,460px); height:auto; aspect-ratio:.70; min-height:0; max-height:none; margin:0 auto; overflow:hidden; background:repeating-linear-gradient(90deg,#26743b 0,#26743b 10%,#2e8045 10%,#2e8045 20%); }
      .bf-new-safe-combined-border { position:absolute; inset:8px; border:2px solid rgba(255,255,255,.92); }
      .bf-new-safe-combined-half { position:absolute; left:8px; right:8px; top:50%; height:2px; background:#fff; }
      .bf-new-safe-combined-circle { position:absolute; left:50%; top:50%; width:18%; aspect-ratio:1; transform:translate(-50%,-50%); border:2px solid #fff; border-radius:50%; }
      .bf-new-safe-combined-dot { position:absolute; left:50%; top:50%; width:6px; height:6px; transform:translate(-50%,-50%); border-radius:50%; background:#fff; }
      .bf-new-safe-combined-box { position:absolute; left:32%; right:32%; height:14%; border:2px solid #fff; }
      .bf-new-safe-combined-box--top { top:8px; }
      .bf-new-safe-combined-box--bottom { bottom:8px; }
      .bf-new-safe-combined-player { position:absolute; transform:translate(-50%,-50%); width:clamp(74px,7vw,94px); display:flex; flex-direction:column; align-items:center; z-index:5; cursor:pointer; color:#fff; text-align:center; outline-offset:2px; }
      .bf-new-safe-combined-player img,.bf-new-safe-combined-avatar { display:block; width:clamp(29px,2.8vw,42px); height:clamp(29px,2.8vw,42px); border:2px solid white; border-radius:50%; object-fit:cover; background:#f4f7f9; box-shadow:0 3px 10px #0005; }
      .bf-new-safe-combined-avatar { display:grid; place-items:center; color:#122; font-weight:900; font-size:12px; }
      .bf-new-safe-combined-shirt { position:absolute; right:calc(50% - 27px); top:-2px; display:grid; place-items:center; min-width:18px; height:18px; padding:0 3px; border-radius:6px; background:#07121d; color:#fff; font-size:9px; font-weight:950; }
      .bf-new-safe-combined-name { display:block; max-width:100px; margin-top:3px; padding:3px 5px; border:1px solid #ffffff4f; border-radius:5px; background:#07121df0; color:#fff; font-size:clamp(8px,.72vw,10px); font-weight:900; line-height:1.1; overflow-wrap:anywhere; }
      .bf-new-safe-combined-player--active .bf-new-safe-combined-name { background:#087f5b; }
      .bf-new-safe-combined-empty { position:absolute; left:5%; width:90%; padding:8px; border-radius:8px; background:#07121dbd; color:white; text-align:center; font-size:11px; font-weight:800; }
      .bf-new-safe-combined-empty--home { top:22%; }
      .bf-new-safe-combined-empty--away { top:72%; }
      .bf-new-safe-player-detail-panel:not([hidden]) { margin:10px 12px; padding:13px; border:1px solid rgba(11,155,105,.35); border-radius:14px; background:rgba(11,155,105,.08); }
      .bf-new-safe-selected-player { display:flex; align-items:center; gap:13px; }
      .bf-new-safe-selected-player>img,.bf-new-safe-selected-avatar { flex:0 0 62px; width:62px; height:62px; border-radius:50%; object-fit:cover; background:#dce7e2; }
      .bf-new-safe-selected-avatar { display:grid; place-items:center; font-weight:950; }
      .bf-new-safe-selected-copy { min-width:0; }
      .bf-new-safe-selected-copy strong { display:block; font-size:15px; font-weight:950; }
      .bf-new-safe-selected-copy>span { display:block; margin-top:4px; font-size:11px; opacity:.7; }
      .bf-new-safe-selected-rating { display:inline-block; margin-top:6px; font-size:11px; }
      .bf-new-safe-selected-events { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
      .bf-new-safe-selected-mvp { margin:7px 0 0; font-size:11px; font-weight:900; }
      .bf-new-safe-selected-note { margin:7px 0 0; font-size:10px; opacity:.65; }
      .bf-new-safe-combined-caption { display:flex; flex-wrap:wrap; gap:8px 14px; padding:9px 12px; font-size:10px; font-weight:850; opacity:.7; }
      .bf-new-safe-combined-caption small { flex-basis:100%; }
      .bf-new-safe-combined-benches { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; padding:12px; }
      .bf-new-safe-combined-benches>div { min-width:0; }
      .bf-new-safe-combined-benches>div>b { display:block; margin-bottom:8px; font-size:12px; }
      .bf-new-safe-player-list>summary { cursor:pointer; list-style:none; }
      .bf-new-safe-player-list>summary::-webkit-details-marker { display:none; }
      .bf-new-safe-player-list>summary:after { content:"＋"; float:right; opacity:.6; }
      .bf-new-safe-player-list[open]>summary:after { content:"−"; }
      @media(max-width:650px) {
        .bf-new-safe-combined-pitch { width:min(100%,390px); aspect-ratio:.68; height:auto; min-height:0; }
        .bf-new-safe-combined-player { width:clamp(52px,14vw,67px); }
        .bf-new-safe-combined-name { max-width:62px; font-size:7px; padding:2px; }
        .bf-new-safe-combined-player img,.bf-new-safe-combined-avatar { width:27px; height:27px; }
        .bf-new-safe-combined-benches { grid-template-columns:minmax(0,1fr); }
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
      .bf-new-safe-shirt{position:absolute;right:-2px;top:24px;min-width:19px;height:19px;padding:0 4px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:#fff;color:#111827;border:1px solid rgba(0,0,0,.18);font-size:9px;font-weight:950;box-shadow:0 2px 5px rgba(0,0,0,.25)}
      .bf-new-safe-player-role{margin-top:2px;padding:2px 4px;border-radius:4px;background:rgba(0,0,0,.72);color:#fff;font-size:7px;font-weight:800}
      .bf-new-safe-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      .bf-new-safe-stat{padding:11px;border-radius:10px;background:rgba(127,127,127,.07);min-width:0}
      .bf-new-safe-stat-label{font-size:10px;opacity:.72;margin-bottom:6px}
      .bf-new-safe-stat-values{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;font-weight:950}
      .bf-new-safe-stat-values span:last-child{text-align:right}
      .bf-new-safe-mvp{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:rgba(250,204,21,.12);margin-bottom:14px}
      .bf-new-safe-mvp img{width:48px;height:48px;border-radius:50%;object-fit:cover}
      .bf-new-safe-mvp-name{font-size:13px;font-weight:950}
      .bf-new-safe-mvp-note{font-size:10px;opacity:.7;margin-top:3px}
      .bf-new-safe-player-events{display:flex;gap:3px;flex-wrap:wrap;margin-top:3px;font-size:10px}
      @media(max-width:600px){.bf-new-safe-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}

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


      /* Match Centre premium lineups and stat comparisons */
      .bf-new-safe-box { width:min(1240px,100%); padding:24px; border:1px solid rgba(126,145,167,.2); }
      .bf-new-safe-league { text-transform:uppercase; font-size:10px; letter-spacing:.15em; }
      .bf-new-safe-head { padding:18px 14px; border:1px solid rgba(126,145,167,.16); border-radius:16px; background:rgba(100,116,139,.04); }
      .bf-new-safe-score { letter-spacing:.04em; font-variant-numeric:tabular-nums; }
      .bf-new-safe-section { margin-top:24px; padding-top:20px; }
      .bf-new-safe-title { font-size:15px; letter-spacing:.01em; }
      .bf-new-safe-pitches { gap:12px; }
      .bf-new-safe-pitch-wrap { padding:10px; min-width:0; border:1px solid rgba(126,145,167,.2); border-radius:14px; background:rgba(100,116,139,.025); }
      .bf-new-safe-pitch-head { font-size:12px; padding:4px 3px 10px; border-bottom:1px solid rgba(126,145,167,.15); }
      .bf-new-safe-pitch { border-radius:11px; margin-top:8px; background:repeating-linear-gradient(90deg,#17633d 0,#17633d 12.5%,#1d7046 12.5%,#1d7046 25%); }
      .bf-new-safe-player { width:88px; display:flex; flex-direction:column; align-items:center; gap:2px; transform:translate(-50%,-50%); z-index:3; }
      .bf-new-safe-player img,.bf-new-safe-avatar { width:33px; height:33px; border-radius:50%; border:2px solid rgba(255,255,255,.96); box-shadow:0 3px 8px rgba(0,0,0,.25); }
      .bf-new-safe-avatar { display:flex; align-items:center; justify-content:center; color:#172033; font-size:9px; font-weight:950; background:#edf2f7; }
      .bf-new-safe-shirt { position:relative; min-width:20px; height:19px; margin-top:-6px; z-index:1; box-shadow:none; border:0; }
      .bf-new-safe-role { padding:2px 5px; border-radius:5px; color:#fff; background:#11243a; border:1px solid rgba(255,255,255,.35); font-size:8px; line-height:1.05; font-weight:950; letter-spacing:.04em; }
      .bf-new-safe-player-name { max-width:86px; padding:3px 5px; border-radius:5px; border:1px solid rgba(255,255,255,.14); background:rgba(5,16,28,.92); color:#fff; text-align:center; font-size:8px; line-height:1.1; }
      .bf-new-safe-pitch-events { display:flex; justify-content:center; flex-wrap:wrap; gap:2px; max-width:86px; }
      .bf-new-safe-event-badge { display:inline-flex; align-items:center; justify-content:center; padding:2px 4px; border-radius:4px; background:#334155; color:#fff; font-size:7px; line-height:1; font-weight:950; }
      .bf-new-safe-event-badge--goal { background:#087f5b; } .bf-new-safe-event-badge--assist { background:#1d4ed8; }
      .bf-new-safe-event-badge--injury { background:#475569; } .bf-new-safe-event-badge--yellow { background:#a16207; }
      .bf-new-safe-event-badge--red { background:#b91c1c; } .bf-new-safe-event-badge--sub { background:#475569; }
      .bf-new-safe-player-rate { display:inline-flex; align-items:center; justify-content:center; padding:2px 5px; border-radius:4px; background:#f8fafc; color:#122033; font-size:8px; line-height:1; font-weight:950; }
      .bf-new-safe-mvp-chip { display:inline-flex; align-items:center; padding:2px 5px; border-radius:4px; background:#facc15; color:#422006; font-size:7px; font-weight:950; }
      .bf-new-safe-mvp { border:1px solid rgba(202,138,4,.2); background:linear-gradient(120deg,rgba(250,204,21,.12),rgba(245,158,11,.03)); }
      .bf-new-safe-mvp-initials { display:flex; align-items:center; justify-content:center; width:42px; height:42px; border-radius:10px; background:#facc15; color:#422006; font-size:10px; font-weight:950; }
      .bf-new-safe-event { grid-template-columns:48px 44px minmax(0,1fr); }
      .bf-new-safe-icon { display:flex; align-items:center; justify-content:center; min-height:23px; font-size:8px; line-height:1; font-weight:950; background:#172a41; color:#fff; border-radius:5px; }
      .bf-new-safe-player-events { display:flex; flex-wrap:wrap; gap:3px; }
      .bf-new-safe-stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      .bf-new-safe-stat { border:1px solid rgba(126,145,167,.15); }
      .bf-new-safe-stat-track { display:flex; gap:3px; height:5px; margin-top:8px; }
      .bf-new-safe-stat-home,.bf-new-safe-stat-away { height:5px; min-width:3px; border-radius:99px; display:block; }
      .bf-new-safe-stat-home { background:linear-gradient(90deg,#1d4ed8,#60a5fa); }
      .bf-new-safe-stat-away { background:linear-gradient(90deg,#fb7185,#e11d48); }
      .bf-new-safe-icon { min-width:38px; text-align:center; padding:4px; border-radius:5px; background:#172a41; color:#fff; font-size:8px; font-weight:950; letter-spacing:.05em; }
      .bf-new-safe-assist { font-size:10px; font-weight:800; color:#2563eb; }
      @media(max-width:700px) {
        .bf-new-safe-box { padding:15px 9px; }
        .bf-new-safe-player { width:62px; gap:1px; }
        .bf-new-safe-player img,.bf-new-safe-avatar { width:25px; height:25px; }
        .bf-new-safe-shirt { min-width:17px; height:16px; font-size:8px; }
        .bf-new-safe-role { font-size:6px; padding:2px 3px; }
        .bf-new-safe-player-name { max-width:61px; font-size:6px; padding:2px; }
        .bf-new-safe-pitch-events { max-width:61px; gap:1px; }
        .bf-new-safe-event-badge { font-size:5px; padding:2px; }
        .bf-new-safe-player-rate,.bf-new-safe-mvp-chip { font-size:6px; }
        .bf-new-safe-stat-grid { grid-template-columns:1fr; }
      }

      /* BROADCAST PERFORMANCE OVERLAYS — both match-detail modals */
      .bf-new-safe-player { width:90px; gap:3px; z-index:8; }
      .bf-new-safe-player img,.bf-new-safe-avatar { width:36px; height:36px; border:2px solid rgba(255,255,255,.98); box-shadow:0 4px 10px rgba(0,0,0,.32); }
      .bf-new-safe-shirt { position:relative; display:inline-flex; align-items:center; justify-content:center; min-width:25px; height:22px; padding:0 6px; margin-top:-7px; z-index:4; border-radius:7px; border:1px solid #9bf0c8; background:linear-gradient(145deg,#f4fff9,#c9f8e0); color:#06462f; font-size:10px; line-height:1; font-weight:1000; box-shadow:0 3px 9px rgba(0,0,0,.3); }
      .bf-new-safe-role,.bf-new-safe-pos { display:none!important; }
      .bf-new-safe-player-name { width:100%; max-width:90px; padding:3px 5px; font-size:8px; line-height:1.15; font-weight:950; border:1px solid rgba(255,255,255,.22); box-shadow:0 2px 6px rgba(0,0,0,.23); }
      .bf-new-safe-pitch-events { display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:3px; max-width:90px; min-height:19px; margin-top:1px; }
      .bf-new-safe-event-badge { display:inline-flex; align-items:center; justify-content:center; gap:2px; min-width:21px; height:21px; padding:2px 4px; border:1px solid rgba(255,255,255,.35); border-radius:7px; color:#fff; background:#25364a; box-shadow:0 2px 6px rgba(0,0,0,.26); }
      .bf-new-safe-event-svg { display:block; width:14px; height:14px; flex:0 0 14px; }
      .bf-new-safe-event-count { display:inline-flex; align-items:center; justify-content:center; min-width:9px; font-size:8px; line-height:1; font-weight:1000; color:#fff; }
      .bf-new-safe-event-badge--goal { background:#087f5b; border-color:#56d7a7; }
      .bf-new-safe-event-badge--penalty { background:#80530c; border-color:#f6d38a; }
      .bf-new-safe-event-badge--own { background:#7d2d68; border-color:#f0a9db; }
      .bf-new-safe-event-badge--assist { background:#1749a1; border-color:#9ac2ff; }
      .bf-new-safe-event-badge--injury { background:#394a5e; border-color:#c2d0e0; }
      .bf-new-safe-event-badge--yellow { background:#75520a; border-color:#facc15; }
      .bf-new-safe-event-badge--red { background:#8b1d2c; border-color:#fda4af; }
      .bf-new-safe-event-badge--sub { background:#145b54; border-color:#7be6d1; }
      .bf-new-safe-player-rate { display:inline-flex; align-items:center; justify-content:center; gap:3px; min-width:43px; height:22px; padding:3px 6px; border:1px solid #f7d56c; border-radius:7px; background:linear-gradient(145deg,#fff7ce,#facc15); color:#392900; font-size:10px; line-height:1; font-weight:1000; box-shadow:0 3px 8px rgba(0,0,0,.26); }
      .bf-new-safe-rating-star { width:12px; height:12px; display:block; fill:#7c5700; flex:0 0 12px; }
      .bf-new-safe-mvp-chip { display:inline-flex; align-items:center; justify-content:center; min-width:22px; height:22px; padding:3px; border:1px solid #fde68a; border-radius:7px; background:#facc15; color:#422006; box-shadow:0 3px 8px rgba(0,0,0,.25); }
      .bf-new-safe-mvp-chip svg { width:14px; height:14px; fill:#422006; }
      /* Ensure position abbreviations are removed in the legacy SportScore window too. */
      html body #bfMatchDetailsModal .bfmd-role,
      html body #bfMatchDetailsModal .bfmd-bench-role,
      html body #bfMatchDetailsModal .bfmd-position { display:none!important; }
      html body #bfMatchDetailsModal .bfmd-player { width:clamp(70px,6.8vw,100px)!important; gap:2px!important; z-index:8!important; }
      html body #bfMatchDetailsModal .bfmd-name { max-width:96px!important; padding:3px 5px!important; font-size:clamp(7px,.68vw,9px)!important; line-height:1.15!important; background:rgba(3,12,22,.96)!important; border-color:rgba(255,255,255,.28)!important; }
      html body #bfMatchDetailsModal .bfmd-event-mini { position:static!important; left:auto!important; top:auto!important; transform:none!important; display:flex!important; flex-wrap:wrap!important; align-items:center!important; justify-content:center!important; gap:3px!important; width:100%!important; max-width:100%!important; min-height:20px!important; margin-top:3px!important; padding:0!important; border:0!important; background:transparent!important; }
      html body #bfMatchDetailsModal .bfmd-chip { display:inline-flex!important; align-items:center!important; justify-content:center!important; min-width:20px!important; min-height:20px!important; padding:3px!important; gap:2px!important; border-radius:7px!important; font-size:8px!important; line-height:1!important; box-shadow:0 2px 6px rgba(0,0,0,.28)!important; }
      html body #bfMatchDetailsModal .bfmd-chip .bfmd-vector-icon { width:14px!important; height:14px!important; }
      html body #bfMatchDetailsModal .bfmd-chip--rating { display:inline-flex!important; color:#3f2e00!important; background:linear-gradient(145deg,#fff7ce,#facc15)!important; border:1px solid #f7d56c!important; }
      html body #bfMatchDetailsModal .bfmd-chip-rating-number { color:#3f2e00!important; font-size:9px!important; font-weight:1000!important; }
      html body #bfMatchDetailsModal .bfmd-chip--mvp { display:inline-flex!important; background:#facc15!important; color:#422006!important; border:1px solid #fde68a!important; }
      @media(max-width:700px) {
        .bf-new-safe-player { width:70px; gap:2px; }
        .bf-new-safe-player img,.bf-new-safe-avatar { width:27px; height:27px; }
        .bf-new-safe-shirt { min-width:20px; height:19px; font-size:9px; }
        .bf-new-safe-player-name { max-width:70px; padding:2px 3px; font-size:7px; }
        .bf-new-safe-pitch-events { max-width:70px; gap:2px; min-height:17px; }
        .bf-new-safe-event-badge { min-width:18px; height:18px; padding:2px; border-radius:5px; }
        .bf-new-safe-event-svg { width:11px; height:11px; flex-basis:11px; }
        .bf-new-safe-event-count { font-size:7px; }
        .bf-new-safe-player-rate { min-width:36px; height:19px; padding:2px 4px; font-size:9px; }
        .bf-new-safe-rating-star { width:10px; height:10px; flex-basis:10px; }
        .bf-new-safe-mvp-chip { min-width:19px; height:19px; }
        html body #bfMatchDetailsModal .bfmd-player { width:clamp(66px,14vw,94px)!important; }
        html body #bfMatchDetailsModal .bfmd-name { max-width:84px!important; font-size:7px!important; }
        html body #bfMatchDetailsModal .bfmd-chip { min-width:18px!important; min-height:18px!important; }
      }


      /* Professional flat performance marks — no hand-drawn SVGs */
      .bf-new-safe-player { position:absolute; overflow:visible; }
      .bf-new-safe-pitch-events { position:absolute!important; top:-8px!important; right:-13px!important; left:auto!important; z-index:15; display:flex!important; flex-direction:column!important; align-items:center; justify-content:flex-start; width:auto; max-width:none!important; min-height:0!important; margin:0!important; padding:0!important; gap:3px!important; overflow:visible; }
      .bf-new-safe-event-badge { display:inline-flex; align-items:center; justify-content:center; gap:2px; min-width:22px; width:auto; height:22px; padding:2px 4px; border:1px solid rgba(255,255,255,.34); border-radius:7px; box-shadow:0 3px 8px rgba(0,0,0,.34); }
      .bf-new-safe-icon-glyph { display:inline-flex; align-items:center; justify-content:center; min-width:14px; height:16px; font-size:13px; line-height:1; font-weight:1000; }
      .bf-new-safe-icon-glyph--subIn,.bf-new-safe-icon-glyph--subOut,.bf-new-safe-icon-glyph--sub { font-size:16px; font-family:Arial,sans-serif; }
      .bf-new-safe-icon-glyph--own { font-size:16px; }
      .bf-new-safe-icon-glyph--assist { font-size:14px; }
      .bf-new-safe-card-glyph { display:block; width:9px; height:14px; border-radius:2px; border:1px solid rgba(255,255,255,.95); box-shadow:0 1px 2px rgba(0,0,0,.25); }
      .bf-new-safe-card-glyph--yellow { background:#ffd32a; }
      .bf-new-safe-card-glyph--red { background:#ef3340; }
      .bf-new-safe-event-count { display:inline-flex; align-items:center; justify-content:center; min-width:10px; height:13px; font-size:8px; line-height:1; font-weight:1000; }
      .bf-new-safe-player-rate { position:absolute!important; top:-8px!important; left:-11px!important; z-index:14; display:inline-flex!important; align-items:center; gap:2px; min-width:39px; height:21px; padding:2px 5px; border-radius:7px; border:1px solid #f7d46a; background:#ffdd67; color:#2c2309; box-shadow:0 3px 9px rgba(0,0,0,.3); font-size:9px; line-height:1; font-weight:1000; }
      .bf-new-safe-rating-star { color:#8a6300; font-size:12px; line-height:1; }
      .bf-new-safe-mvp-chip { position:absolute!important; top:28px!important; left:-10px!important; z-index:14; display:inline-flex!important; align-items:center; justify-content:center; min-width:21px; height:21px; padding:2px 4px; border-radius:7px; border:1px solid #ffe28a; background:#ffda55; color:#493400; box-shadow:0 3px 8px rgba(0,0,0,.28); font-size:14px; line-height:1; }
      .bf-new-safe-player-name { position:relative; z-index:4; }
      .bf-new-safe-event-glyph { display:inline-flex; flex:0 0 27px; align-items:center; justify-content:center; width:27px; height:27px; border-radius:8px; background:#263b53; color:#eef6ff; font-family:Arial,sans-serif; font-size:14px; line-height:1; font-weight:1000; }
      .bf-new-event-glyph--goal { background:#123e32; color:#a7f3d0; }
      .bf-new-event-glyph--penalty { background:#4c3915; color:#ffe5a0; }
      .bf-new-event-glyph--assist { background:#193d73; color:#b9d7ff; }
      .bf-new-event-glyph--sub { background:#12463e; color:#8ff3dc; font-size:19px; }
      .bf-new-event-glyph--injury { background:#25384c; color:#c4e2ff; }
      .bf-new-event-glyph--missed { background:#4b2630; color:#ffb4c0; font-size:22px; }
      .bf-new-event-glyph--var { font-size:9px; letter-spacing:-.04em; }
      .bf-new-event-glyph--other { background:#25344a; color:#a9bbd2; }
      .bf-new-event-glyph--yellow,.bf-new-event-glyph--red { width:13px; height:19px; min-height:19px; min-width:13px; flex-basis:13px; margin:auto; border:1px solid rgba(255,255,255,.7); border-radius:2px; }
      .bf-new-event-glyph--yellow { background:#ffcc29; }
      .bf-new-event-glyph--red { background:#ef3340; }
      .bf-new-safe-substitution-line { display:flex; align-items:center; flex-wrap:wrap; gap:7px; margin:8px 0 3px; padding:9px 10px; border:1px solid rgba(20,184,166,.18); border-radius:10px; background:rgba(20,184,166,.07); }
      .bf-new-safe-substitution-line strong { color:inherit; font-size:11px; font-weight:950; }
      .bf-new-safe-sub-out,.bf-new-safe-sub-in,.bf-new-safe-sub-neutral { display:inline-flex; align-items:center; gap:3px; padding:4px 6px; border-radius:6px; font-size:8px; font-weight:1000; letter-spacing:.06em; white-space:nowrap; }
      .bf-new-safe-sub-out { color:#fecdd3; background:rgba(190,24,45,.18); }
      .bf-new-safe-sub-in { color:#a7f3d0; background:rgba(5,150,105,.18); }
      .bf-new-safe-sub-neutral { color:#a9f3e6; background:rgba(13,148,136,.18); }
      .bf-new-safe-sub-arrow { color:#8298b3; font-size:17px; font-weight:900; }
      .bf-new-safe-assist { display:flex; align-items:center; gap:7px; width:max-content; max-width:100%; margin-top:7px; padding:6px 9px; border:1px solid rgba(59,130,246,.18); border-radius:8px; background:rgba(59,130,246,.08); color:#b4d1ff; font-size:10px; line-height:1.4; }
      .bf-new-safe-assist-icon { font-size:14px; }
      .bf-new-safe-assist strong { color:#d8e7ff; font-weight:950; }
      .bf-new-safe-event-detail { margin-top:5px; color:#9fb2c9; font-size:10px; line-height:1.55; }
      #bfMatchDetailsModal .bfmd-event-mini { position:absolute!important; top:-8px!important; right:-13px!important; left:auto!important; transform:none!important; z-index:15; display:flex!important; flex-direction:column!important; align-items:center!important; justify-content:flex-start!important; gap:3px!important; width:auto!important; max-width:none!important; min-height:0!important; margin:0!important; padding:0!important; overflow:visible; border:0!important; background:transparent!important; }
      #bfMatchDetailsModal .bfmd-chip { display:inline-flex!important; align-items:center!important; justify-content:center!important; gap:2px!important; width:auto!important; min-width:22px!important; height:22px!important; min-height:22px!important; padding:2px 4px!important; border:1px solid rgba(255,255,255,.36)!important; border-radius:7px!important; box-shadow:0 3px 8px rgba(0,0,0,.32)!important; }
      #bfMatchDetailsModal .bfmd-chip .bfmd-vector-icon { display:none!important; }
      #bfMatchDetailsModal .bfmd-chip:before { content:none!important; display:none!important; }
      #bfMatchDetailsModal .bfmd-chip--goal:before { content:"⚽"; font-size:13px; line-height:1; }
      #bfMatchDetailsModal .bfmd-chip--penalty:before { content:"🎯"; font-size:13px; line-height:1; }
      #bfMatchDetailsModal .bfmd-chip--own:before { content:"↗"; font-size:15px; line-height:1; }
      #bfMatchDetailsModal .bfmd-chip--assist:before { content:"👟"; font-size:13px; line-height:1; }
      #bfMatchDetailsModal .bfmd-chip--yellow:before,#bfMatchDetailsModal .bfmd-chip--red:before { content:""; display:block; width:9px; height:14px; border:1px solid rgba(255,255,255,.92); border-radius:2px; }
      #bfMatchDetailsModal .bfmd-chip--yellow:before { background:#ffd32a; }
      #bfMatchDetailsModal .bfmd-chip--red:before { background:#ef3340; }
      #bfMatchDetailsModal .bfmd-chip--injury:before { content:"✚"; font-size:13px; line-height:1; }
      #bfMatchDetailsModal .bfmd-chip--subIn:before { content:"↗"; color:#b7f5d7; font:1000 15px/1 Arial,sans-serif; }
      #bfMatchDetailsModal .bfmd-chip--subOut:before { content:"↙"; color:#ffccd2; font:1000 15px/1 Arial,sans-serif; }
      #bfMatchDetailsModal .bfmd-chip--mvp:before { content:"🏆"; font-size:12px; line-height:1; }
      #bfMatchDetailsModal .bfmd-chip--rating:before { content:"★"; font-size:13px; line-height:1; color:#806000; }
      #bfMatchDetailsModal .bfmd-chip--yellow .bfmd-chip-count,#bfMatchDetailsModal .bfmd-chip--red .bfmd-chip-count { color:#fff; font-size:8px; font-weight:1000; }
      @media(max-width:700px) {
        .bf-new-safe-pitch-events { top:-5px!important; right:-9px!important; gap:2px!important; }
        .bf-new-safe-event-badge { min-width:18px; height:18px; padding:1px 3px; border-radius:5px; }
        .bf-new-safe-icon-glyph { min-width:11px; height:13px; font-size:11px; }
        .bf-new-safe-card-glyph { width:7px; height:11px; }
        .bf-new-safe-player-rate { top:-5px!important; left:-8px!important; min-width:33px; height:18px; padding:2px 4px; font-size:8px; }
        .bf-new-safe-mvp-chip { top:23px!important; left:-8px!important; min-width:18px; height:18px; }
        #bfMatchDetailsModal .bfmd-event-mini { top:-5px!important; right:-9px!important; gap:2px!important; }
        #bfMatchDetailsModal .bfmd-chip { min-width:18px!important; height:18px!important; min-height:18px!important; padding:1px 3px!important; }
      }

      /* SofaScore-inspired player performance marks: event icons sit below each name. */
      .bf-new-safe-player { width:clamp(76px,7.2vw,96px); }
      .bf-new-safe-pitch-events {
        position:relative!important; top:auto!important; right:auto!important; left:auto!important;
        z-index:8!important; display:flex!important; flex-direction:row!important;
        align-items:center!important; justify-content:center!important; flex-wrap:wrap!important;
        width:100%!important; max-width:92px!important; min-height:0!important;
        margin:3px 0 0!important; padding:0!important; gap:3px!important;
        overflow:visible!important; background:transparent!important;
      }
      .bf-new-safe-event-badge {
        min-width:19px!important; width:19px!important; height:19px!important;
        min-height:19px!important; padding:2px!important; border-radius:6px!important;
      }
      .bf-new-safe-event-badge svg { display:block!important; width:13px!important; height:13px!important; }
      .bf-new-safe-event-count { min-width:9px!important; height:10px!important; font-size:7px!important; }
      .bf-new-safe-player-rate { top:-7px!important; left:-9px!important; }
      .bf-new-safe-mvp-chip { top:-7px!important; right:-9px!important; left:auto!important; }
      @media(max-width:700px) {
        .bf-new-safe-player { width:clamp(68px,16vw,90px)!important; }
        .bf-new-safe-pitch-events { max-width:88px!important; gap:2px!important; }
        .bf-new-safe-event-badge { min-width:17px!important; width:17px!important; height:17px!important; min-height:17px!important; }
        .bf-new-safe-event-badge svg { width:12px!important; height:12px!important; }
      }


      /* SofaScore-inspired pitch performance markers: SVG icons, compact badges, color-coded ratings. */
      .bf-new-safe-event-badge { position:relative; display:inline-flex!important; align-items:center; justify-content:center; flex:0 0 21px; width:21px; min-width:21px; height:21px; padding:2px; border-radius:50%!important; gap:0; overflow:visible; }
      .bf-new-safe-event-svg { display:block; width:13px; height:13px; flex:0 0 13px; color:currentColor; }
      .bf-new-safe-event-count { position:absolute; right:-4px; bottom:-4px; display:inline-flex; align-items:center; justify-content:center; min-width:11px; height:11px; padding:0 2px; border:1px solid #fff; border-radius:99px; background:#102033; color:#fff; font-size:7px; line-height:1; font-weight:1000; }
      .bf-new-safe-player-rate { display:inline-flex!important; align-items:center; justify-content:center; position:absolute!important; top:-8px!important; left:-11px!important; z-index:16; min-width:30px; width:auto; height:22px; padding:3px 5px; border:1px solid rgba(255,255,255,.68); border-radius:7px!important; color:#fff; font-size:10px; line-height:1; font-weight:1000; box-shadow:0 3px 8px rgba(0,0,0,.3); font-variant-numeric:tabular-nums; }
      .bf-new-safe-player-rate.bf-rating--excellent { background:#087f5b!important; border-color:#6ee7b7!important; color:#f0fdf4!important; }
      .bf-new-safe-player-rate.bf-rating--good { background:#36a66b!important; border-color:#a7f3d0!important; color:#062d1a!important; }
      .bf-new-safe-player-rate.bf-rating--average { background:#d7d93b!important; border-color:#fef08a!important; color:#27300a!important; }
      .bf-new-safe-player-rate.bf-rating--low { background:#e9a23b!important; border-color:#fed7aa!important; color:#422006!important; }
      .bf-new-safe-player-rate.bf-rating--poor { background:#d94848!important; border-color:#fda4af!important; color:#fff!important; }
      .bf-new-safe-mvp-chip { display:inline-flex!important; align-items:center; justify-content:center; position:absolute!important; top:27px!important; left:-10px!important; min-width:21px; width:21px; height:21px; padding:3px; border-radius:50%!important; background:#facc15!important; color:#422006!important; }
      .bf-new-safe-mvp-chip .bf-new-safe-event-svg { width:13px; height:13px; flex-basis:13px; }
      #bfMatchDetailsModal .bfmd-chip .bfmd-vector-icon { display:block!important; width:13px!important; height:13px!important; flex:0 0 13px; }
      #bfMatchDetailsModal .bfmd-chip:before { content:none!important; display:none!important; }
      #bfMatchDetailsModal .bfmd-chip--rating { border-radius:7px!important; }
      html body #bfMatchDetailsModal .bfmd-chip:not(.bfmd-chip--rating) { width:22px!important; min-width:22px!important; height:22px!important; min-height:22px!important; padding:2px!important; border-radius:50%!important; position:relative!important; overflow:visible!important; }
      html body #bfMatchDetailsModal .bfmd-chip-count { position:absolute!important; right:-4px!important; bottom:-4px!important; display:inline-flex!important; align-items:center!important; justify-content:center!important; min-width:11px!important; height:11px!important; padding:0 2px!important; border:1px solid #fff!important; border-radius:99px!important; background:#102033!important; color:#fff!important; font-size:7px!important; line-height:1!important; font-weight:1000!important; }
      html body #bfMatchDetailsModal .bfmd-chip--rating.bfmd-rating--excellent { background:#087f5b!important; border-color:#6ee7b7!important; color:#fff!important; }
      html body #bfMatchDetailsModal .bfmd-chip--rating.bfmd-rating--good { background:#36a66b!important; border-color:#a7f3d0!important; color:#062d1a!important; }
      html body #bfMatchDetailsModal .bfmd-chip--rating.bfmd-rating--average { background:#d7d93b!important; border-color:#fef08a!important; color:#27300a!important; }
      html body #bfMatchDetailsModal .bfmd-chip--rating.bfmd-rating--low { background:#e9a23b!important; border-color:#fed7aa!important; color:#422006!important; }
      html body #bfMatchDetailsModal .bfmd-chip--rating.bfmd-rating--poor { background:#d94848!important; border-color:#fda4af!important; color:#fff!important; }
      html body #bfMatchDetailsModal .bfmd-rating--excellent .bfmd-chip-rating-number,
      html body #bfMatchDetailsModal .bfmd-rating--poor .bfmd-chip-rating-number { color:#fff!important; }
      html body #bfMatchDetailsModal .bfmd-rating--good .bfmd-chip-rating-number,
      html body #bfMatchDetailsModal .bfmd-rating--average .bfmd-chip-rating-number,
      html body #bfMatchDetailsModal .bfmd-rating--low .bfmd-chip-rating-number { color:inherit!important; }
      @media(max-width:700px) {
        .bf-new-safe-event-badge { flex-basis:18px; width:18px; min-width:18px; height:18px; padding:1px; }
        .bf-new-safe-event-svg { width:11px; height:11px; flex-basis:11px; }
        .bf-new-safe-event-count { min-width:10px; height:10px; font-size:6px; }
        .bf-new-safe-player-rate { min-width:27px; height:19px; font-size:9px; }
        .bf-new-safe-mvp-chip { min-width:18px; width:18px; height:18px; }
        #bfMatchDetailsModal .bfmd-chip .bfmd-vector-icon { width:11px!important; height:11px!important; flex-basis:11px; }
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
    const players = (lineup.starters?.length
      ? lineup.starters
      : lineup.pitchAvailable ? lineup.players.slice(0, 11) : []).slice(0, 11);

    if (!players.length) return [];

    /*
     * Use the source lineup grid ("row:column") before role-group fallbacks.
     * It distinguishes lanes even when the source only labels players MID/DEF/FWD.
     */
    const gridEntries = players.map(player => {
      const p = getPlayerObject(player);
      const rawGrid = first(
        player?.grid, player?.position?.grid,
        p?.grid, p?.position?.grid
      );
      let row = null, col = null;
      if (Array.isArray(rawGrid) && rawGrid.length >= 2) {
        row = Number(rawGrid[0]); col = Number(rawGrid[1]);
      } else if (rawGrid && typeof rawGrid === "object") {
        row = Number(first(rawGrid?.row, rawGrid?.y, rawGrid?.line));
        col = Number(first(rawGrid?.column, rawGrid?.col, rawGrid?.x, rawGrid?.slot));
      } else if (typeof rawGrid === "string") {
        const match = rawGrid.trim().match(/^(\d+)\s*[:;,.-]\s*(\d+)$/);
        if (match) { row = Number(match[1]); col = Number(match[2]); }
      }
      return { player, row, col, valid: Number.isInteger(row) && row >= 0 && Number.isInteger(col) && col >= 0 && col <= 10 };
    });
    const gridRows = [...new Set(gridEntries.filter(item => item.valid).map(item => item.row))].sort((a,b) => a-b);
    if (gridEntries.length >= 10 && gridEntries.every(item => item.valid) && gridRows.length >= 3) {
      const minRow = gridRows[0], maxRow = gridRows[gridRows.length - 1];
      return gridEntries.map(item => {
        const columns = [...new Set(gridEntries.filter(other => other.row === item.row).map(other => other.col))].sort((a,b) => a-b);
        const colIndex = columns.indexOf(item.col);
        const x = columns.length <= 1 ? 50 : 10 + 80 * colIndex / (columns.length - 1);
        let y = maxRow === minRow ? 50 : 8 + 84 * (item.row - minRow) / (maxRow - minRow);
        if (side === "away") y = 100 - y;
        return { player: item.player, x: Math.max(6, Math.min(94, x)), y: Math.max(6, Math.min(94, y)) };
      });
    }

    /* Trust provider coordinates only when the coordinate scale is recognizable. */
    const coords = players.map(player => {
      const p = getPlayerObject(player);
      const rawX = first(player?.x, player?.coord_x, player?.coordinate_x, p?.x, p?.coord_x, p?.coordinate_x);
      const rawY = first(player?.y, player?.coord_y, player?.coordinate_y, p?.y, p?.coord_y, p?.coordinate_y);
      const x = Number(rawX), y = Number(rawY);
      return { player, x, y, oriented:!!(player?.coordinatesOriented || p?.coordinatesOriented), valid: rawX !== null && rawX !== undefined && rawX !== "" && rawY !== null && rawY !== undefined && rawY !== "" && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= 120 && y <= 100 };
    });
    if (coords.length >= 10 && coords.every(item => item.valid)) {
      const xs = coords.map(item => item.x), ys = coords.map(item => item.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const normalized = minX >= 0 && minY >= 0 && maxX <= 1 && maxY <= 1 && maxX - minX >= 0.2 && maxY - minY >= 0.2;
      const integerGrid = xs.every(v => Number.isInteger(v) && v >= 1 && v <= 11) && ys.every(v => Number.isInteger(v) && v >= 1 && v <= 11) && maxX - minX >= 3 && maxY - minY >= 3;
      const pitchUnits = maxX > 100;
      const percentages = !pitchUnits && maxX > 11 && maxY > 11 && maxX - minX >= 15 && maxY - minY >= 15;
      if (normalized || integerGrid || pitchUnits || percentages) {
        return coords.map(item => {
          let x = item.x, y = item.y;
          if (normalized) { x = 8 + x * 84; y = 8 + y * 84; }
          else if (integerGrid) { x = 8 + ((x - 1) / 10) * 84; y = 8 + ((y - 1) / 10) * 84; }
          else if (pitchUnits) {
            const pitchLength = maxX > 105 ? 120 : 105;
            const pitchWidth = maxY > 68 ? 80 : 68;
            x = 8 + (x / pitchLength) * 84;
            y = 8 + (y / pitchWidth) * 84;
          }
          if (side === "away" && !item.oriented) y = 100 - y;
          return { player: item.player, x: Math.max(6, Math.min(94, x)), y: Math.max(6, Math.min(94, y)) };
        });
      }
    }

    return [];
    return [];
  }

  /* =========================================================
     RENDER PITCH
     ========================================================= */

  function renderPitch(
    lineup,
    team,
    side,
    details,
    pitchMvp = null
  ) {

    if (!getPitchPlayers(lineup, side).length) {
      return `
        <div class="bf-new-safe-panel">
          <div class="bf-new-safe-pitch-head">
            <span>${esc(team.name)}</span>
            <span>${esc(lineup.formation)}</span>
          </div>
          <div class="bf-new-safe-empty">Composition officielle indisponible. Aucun joueur n’est placé au hasard sur le terrain.</div>
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
${esc(String(playerName(player) || "P").split(/\s+/).map(part => part[0] || "").join("").slice(0,2).toUpperCase())}
                          </div>

                        `
                    }

                    <span class="bf-new-safe-shirt">${esc(playerNumber(player))}</span>
                    
                    <div class="bf-new-safe-player-name">${esc(playerName(player))}</div>
                    <div class="bf-new-safe-pitch-events">${playerEventBadges(player, details)}</div>
                    ${((playerIsOfficialMvp(player) || playerIsNamedMvp(player, details)) || (pitchMvp && samePerson(pitchMvp.player, player))) ? '<span class="bf-new-safe-mvp-chip" title="' + esc(pitchMvp && samePerson(pitchMvp.player, player) && !pitchMvp.official ? "Meilleure note disponible — MVP non communiqué par la source" : "Joueur du match") + '" aria-label="' + esc(pitchMvp && samePerson(pitchMvp.player, player) && !pitchMvp.official ? "Meilleure note disponible" : "Joueur du match") + '">' + playerPerformanceIcon("mvp") + '</span>' : ""}
                    ${rating !== null ? '<span class="bf-new-safe-player-rate ' + ratingToneClass(rating) + '" title="Note du joueur ' + esc(Number(rating).toFixed(1)) + '/10" aria-label="Note du joueur ' + esc(Number(rating).toFixed(1)) + ' sur 10">' + esc(Number(rating).toFixed(1)) + '</span>' : ""}

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

  function renderCombinedPitch(homeLineup, home, awayLineup, away, details, pitchMvp) {
    const markings = '<div class="bf-new-safe-combined-border"></div><div class="bf-new-safe-combined-half"></div><div class="bf-new-safe-combined-circle"></div><div class="bf-new-safe-combined-dot"></div><div class="bf-new-safe-combined-box bf-new-safe-combined-box--top"></div><div class="bf-new-safe-combined-box bf-new-safe-combined-box--bottom"></div><div class="bf-new-safe-combined-goal bf-new-safe-combined-goal--left"></div><div class="bf-new-safe-combined-goal bf-new-safe-combined-goal--right"></div><div class="bf-new-safe-combined-spot bf-new-safe-combined-spot--left"></div><div class="bf-new-safe-combined-spot bf-new-safe-combined-spot--right"></div>';
    const detailTemplate = (player, team, side) => {
      const photo = playerPhoto(player);
      const rating = playerRating(player);
      const badges = playerEventBadges(player, details);
      const isMvp = playerIsOfficialMvp(player) || playerIsNamedMvp(player, details) ||
        (pitchMvp && samePerson(pitchMvp.player, player));
      return '<template class="bf-new-safe-player-template"><div class="bf-new-safe-selected-player">' +
        (photo ? '<img src="' + esc(photo) + '" alt="" loading="lazy">' :
          '<span class="bf-new-safe-selected-avatar">' + esc(String(playerName(player) || "P").split(/\s+/).map(part=>part[0]||"").join("").slice(0,2).toUpperCase()) + '</span>') +
        '<div class="bf-new-safe-selected-copy"><strong>' + esc(playerName(player) || "Joueur") + '</strong>' +
        '<span>' + esc(team.name || "Équipe") + ' · ' + esc(side === "home" ? "Domicile" : "Extérieur") + ' · #' + esc(playerNumber(player)) + '</span>' +
        (rating !== null ? '<b class="bf-new-safe-selected-rating ' + ratingToneClass(rating) + '">Note ' + esc(Number(rating).toFixed(1)) + '/10</b>' : '') +
        '<div class="bf-new-safe-selected-events">' + badges + '</div>' +
        (isMvp ? '<p class="bf-new-safe-selected-mvp">⭐ Joueur clé de la rencontre</p>' : '') +
        '<p class="bf-new-safe-selected-note">Seules les informations reçues de la source du match sont affichées.</p></div></div></template>';
    };
    const renderTeam = (lineup, team, side) => {
      const positions = getPitchPlayers(lineup, side);
      if (!positions.length) {
        return '<div class="bf-new-safe-combined-empty bf-new-safe-combined-empty--' + side + '">' +
          esc(team.name || "Équipe") + ' · composition ou positions indisponibles</div>';
      }
      let orientedPositions = positions;
      const keepers = positions.filter(item => /goalkeeper|goalie|\bgk\b|gardien|portier|portero|guardameta/i.test(String(playerPosition(item.player) || "")));
      const keeperAverage = keepers.length ? keepers.reduce((sum,item)=>sum+item.y,0)/keepers.length : null;
      /* When a provider reverses the visitors, rotate the full formation in both axes. */
      if (keeperAverage !== null && ((side === "home" && keeperAverage > 50) || (side === "away" && keeperAverage < 50))) {
        orientedPositions = positions.map(item => ({...item,x:100-item.x,y:100-item.y}));
      }
      return orientedPositions.map(item => {
        const player = item.player;
        const fieldX = side === "home" ? 5 + item.y * 0.43 : 57 + item.y * 0.38;
        const fieldY = side === "home" ? 8 + item.x * 0.84 : 92 - item.x * 0.84;
        const photo = playerPhoto(player);
        const rating = playerRating(player);
        const badges = playerEventBadges(player, details);
        const isMvp = playerIsOfficialMvp(player) || playerIsNamedMvp(player, details) ||
          (pitchMvp && samePerson(pitchMvp.player, player));
        const performanceSide = side === "home" ? "right" : "left";
        const performance = badges +
          (rating !== null ? '<span class="bf-new-safe-player-rate ' + ratingToneClass(rating) + '" title="Note du joueur">' + esc(Number(rating).toFixed(1)) + '</span>' : '') +
          (isMvp ? '<span class="bf-new-safe-mvp-chip" title="Joueur du match">⭐</span>' : '');
        return '<div class="bf-new-safe-combined-player bf-new-safe-combined-player--perf-' + performanceSide + '" role="button" tabindex="0" aria-expanded="false" data-bf-new-player="1" ' +
          'style="left:' + Math.max(10,Math.min(90,fieldX)) + '%;top:' + Math.max(10,Math.min(90,fieldY)) + '%" title="Cliquer pour afficher ' + esc(playerName(player)) + '">' +
          (photo ? '<img src="' + esc(photo) + '" alt="" loading="lazy">' :
            '<span class="bf-new-safe-combined-avatar">' + esc(String(playerName(player) || "P").split(/\s+/).map(part=>part[0]||"").join("").slice(0,2).toUpperCase()) + '</span>') +
          '<span class="bf-new-safe-combined-shirt">' + esc(playerNumber(player)) + '</span>' +
          '<span class="bf-new-safe-combined-name">' + esc(playerName(player) || "Joueur") + '</span>' +
          '<span class="bf-new-safe-combined-performance">' + performance + '</span>' +
          detailTemplate(player, team, side) + '</div>';
      }).join("");
    };
    const head = (lineup, team, fallback) => '<div class="bf-new-safe-combined-team">' +
      (team.logo ? '<img src="' + esc(team.logo) + '" alt="" loading="lazy">' : '<span>⚽</span>') +
      '<strong>' + esc(team.name || fallback) + '</strong><em>' + esc(lineup.formation || "—") + '</em></div>';
    return '<div class="bf-new-safe-combined-wrap"><div class="bf-new-safe-combined-head">' +
      head(homeLineup,home,"Domicile") + '<span class="bf-new-safe-combined-vs">VS</span>' + head(awayLineup,away,"Extérieur") +
      '</div><div class="bf-new-safe-combined-pitch">' + markings + renderTeam(homeLineup,home,"home") + renderTeam(awayLineup,away,"away") +
      '</div><div class="bf-new-safe-player-detail-panel" hidden></div><div class="bf-new-safe-combined-caption"><span>DOMICILE · CÔTÉ GAUCHE</span><span>EXTÉRIEUR · CÔTÉ DROIT</span><small>Clique sur un joueur pour ouvrir sa fiche</small></div></div>';
  }

  /* =========================================================
     RENDER PLAYERS
     ========================================================= */

  function renderPlayers(
    lineup,
    details
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

                    <div class="bf-new-safe-list-avatar">
                      ${esc(String(playerName(player) || "P").split(/\s+/).map(part => part[0] || "").join("").slice(0,2).toUpperCase())}
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
<div class="bf-new-safe-player-events">${playerEventBadges(player, details)}</div>

              </div>

              <div
                class="bf-new-safe-rating"
              >

                ${
                  rating !== null
                    ? `Note ${esc(
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

  function renderEvents(details) {
    const events = getEvents(details);
    if (!events.length) {
      return '<div class="bf-new-safe-empty">Aucun événement détaillé disponible.</div>';
    }
    return events.map(event => {
      const type = eventType(event);
      const team = String(first(event?.team?.name, event?.team_name, event?.club?.name, ""));
      const isGoal = eventIsGoal(event);
      const isSub = eventIsSubstitution(event);
      const assist = isGoal ? eventAssist(event) : "";
      const swap = isSub ? eventSubstitutionData(event) : null;
      const minute = esc(eventMinute(event));
      let description = "";
      if (isSub && swap && (swap.incoming || swap.outgoing)) {
        description = '<div class="bf-new-safe-substitution-line">' +
          (swap.outgoing ? '<span class="bf-new-safe-sub-out">↘ SORTIE</span><strong>' + esc(swap.outgoing) + '</strong>' : '') +
          (swap.outgoing && swap.incoming ? '<span class="bf-new-safe-sub-arrow">→</span>' : '') +
          (swap.incoming ? '<span class="bf-new-safe-sub-in">↗ ENTRÉE</span><strong>' + esc(swap.incoming) + '</strong>' : '') +
          '</div>';
      } else if (isSub && swap && swap.involved.length) {
        description = '<div class="bf-new-safe-substitution-line"><span class="bf-new-safe-sub-neutral">⇄ REMPLACEMENT</span><strong>' +
          esc(swap.involved.slice(0,2).join(" ↔ ")) + '</strong></div>';
      }
      const playerLine = isSub
        ? (swap && (swap.incoming || swap.outgoing) ? "Remplacement" : eventPlayer(event))
        : eventPlayer(event);
      return '<article class="bf-new-safe-event' + (isSub ? ' bf-new-safe-event--substitution' : '') + '">' +
        '<div class="bf-new-safe-minute">' + minute + (String(minute).includes("'") ? "" : "'") + '</div>' +
        '<div class="bf-new-safe-icon">' + eventIcon(event) + '</div>' +
        '<div class="bf-new-safe-event-main">' +
          '<div class="bf-new-safe-event-player">' + esc(playerLine) + '</div>' +
          (description || '') +
          (team ? '<div class="bf-new-safe-event-team">' + esc(team) + '</div>' : '') +
          (assist ? '<div class="bf-new-safe-assist"><span class="bf-new-safe-assist-icon">👟</span><strong>Passe décisive</strong><span>' + esc(assist) + '</span></div>' : '') +
          (!isSub && !assist && event?.detail && isGoal ? '<div class="bf-new-safe-event-detail">' + esc(event.detail) + '</div>' : '') +
        '</div></article>';
    }).join("");
  }

    function statRows(details) {
    const raw = first(details?.statistics, details?.stats, details?.matchStatistics, []);
    const label = item => String(first(item?.type?.name, typeof item?.type === "string" ? item.type : null,
      item?.name, item?.label, item?.key, item?.stat?.name, ""));
    const value = item => first(item?.value, item?.displayValue, item?.stat?.value, item?.total, item?.display, null);
    const blocks = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? [
      { side: "home", statistics: first(raw.home, raw.host, raw.homeTeam, raw.homeStatistics, []) },
      { side: "away", statistics: first(raw.away, raw.guest, raw.awayTeam, raw.awayStatistics, []) }
    ] : []);
    if (!blocks.length) return [];
    const homeName = norm(details?.teams?.home?.name), awayName = norm(details?.teams?.away?.name);
    const homeBlock = blocks.find(x => norm(x?.team?.name || x?.team_name || x?.side) === homeName || ["home","host"].includes(norm(x?.side)));
    const awayBlock = blocks.find(x => norm(x?.team?.name || x?.team_name || x?.side) === awayName || ["away","guest"].includes(norm(x?.side)));
    const homeStats = arr(homeBlock?.statistics || homeBlock?.stats || homeBlock?.statisticsItems || homeBlock?.data);
    const awayStats = arr(awayBlock?.statistics || awayBlock?.stats || awayBlock?.statisticsItems || awayBlock?.data);
    const allLabels = [...new Set([...homeStats.map(label), ...awayStats.map(label)].filter(Boolean))];
    if (allLabels.length) return allLabels.map(name => {
      const h = homeStats.find(item => norm(label(item)) === norm(name));
      const a = awayStats.find(item => norm(label(item)) === norm(name));
      return { label: name, home: h ? value(h) : null, away: a ? value(a) : null };
    });
    if (blocks.length >= 2) {
      const hs = arr(blocks[0]?.statistics || blocks[0]?.stats || blocks[0]?.statisticsItems);
      const as = arr(blocks[1]?.statistics || blocks[1]?.stats || blocks[1]?.statisticsItems);
      const names = [...new Set([...hs.map(label), ...as.map(label)].filter(Boolean))];
      return names.map(name => {
        const h=hs.find(item=>norm(label(item))===norm(name)), a=as.find(item=>norm(label(item))===norm(name));
        return {label:name,home:h?value(h):null,away:a?value(a):null};
      });
    }
    return [];
  }

  function renderStatistics(details) {
    const rows = statRows(details);
    const priority = ["ball possession","possession","total shots","shots on target","shots off target","corner kicks","corners","fouls","yellow cards","red cards","offsides","passes","accurate passes","expected goals","xg"];
    rows.sort((a,b)=>{const rank=x=>{const i=priority.findIndex(p=>norm(x).includes(p));return i<0?999:i;};return rank(a.label)-rank(b.label);});
    if (!rows.length) return '<div class="bf-new-safe-empty">Statistiques détaillées indisponibles pour cette rencontre.</div>';
    const numeric=value=>{
      if(value===null||value===undefined)return null;
      const parsed=Number(String(value).replace("%","").replace(",",".").replace(/[^\d.\-]/g,""));
      return Number.isFinite(parsed)?parsed:null;
    };
    return '<div class="bf-new-safe-stat-grid">' + rows.map(row=>{
      const h=numeric(row.home),a=numeric(row.away);
      const total=Math.max(0,h||0)+Math.max(0,a||0);
      const hw=total>0&&h!==null?Math.max(0,Math.min(100,h/total*100)):50;
      const aw=total>0&&a!==null?Math.max(0,Math.min(100,a/total*100)):50;
      return '<div class="bf-new-safe-stat"><div class="bf-new-safe-stat-label">' + esc(row.label) + '</div><div class="bf-new-safe-stat-values"><span>' + esc(row.home ?? "—") + '</span><span>' + esc(row.away ?? "—") + '</span></div><div class="bf-new-safe-stat-track"><span class="bf-new-safe-stat-home" style="width:' + hw.toFixed(1) + '%"></span><span class="bf-new-safe-stat-away" style="width:' + aw.toFixed(1) + '%"></span></div></div>';
    }).join("") + '</div>';
  }

  function playerPerformanceIcon(kind) {
    if (kind === "yellow" || kind === "red") {
      return '<span class="bf-new-safe-card-glyph bf-new-safe-card-glyph--' + kind + '" aria-hidden="true"></span>';
    }
    const drawings = {
      goal: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M9 8.5 12 6.8l3 1.7v3.4l-3 1.8-3-1.8zM9 8.5 6.7 10M15 8.5l2.3 1.5M9 11.9l-1.6 3M15 11.9l1.6 3M12 15.4v3.3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
      penalty: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
      own: '<path d="M6 18 18 6M9 6h9v9" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 5v5M5 5h5" stroke="currentColor" stroke-width="1.7" fill="none"/>',
      assist: '<circle cx="6" cy="18" r="2.2" fill="currentColor"/><path d="M8 16 17.5 6.5M11 6.5h6.5V13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      injury: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="currentColor"/>',
      subIn: '<path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      subOut: '<path d="M20 12H5M11 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      sub: '<path d="M4 7h14l-3-3M20 17H6l3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      mvp: '<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.4l6.3-.9z" fill="currentColor"/>',
      rating: '<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.4l6.3-.9z" fill="currentColor"/>'
    };
    return '<svg class="bf-new-safe-event-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (drawings[kind] || '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/>') + '</svg>';
  }

  function playerMetricCount(player, aliases) {
    const aliasSet = new Set(aliases.map(value => norm(value).replace(/[^a-z0-9]/g, "")));
    const seen = new Set();
    const queue = [{ value: player, depth: 0 }, { value: getPlayerObject(player), depth: 0 }];
    let maximum = 0;
    const numericValue = value => {
      if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const match = value.replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : null;
      }
      if (typeof value === "object") {
        for (const key of ["total", "value", "count", "number", "amount", "displayValue", "display", "statValue"]) {
          if (value[key] !== undefined && value[key] !== value) {
            const result = numericValue(value[key]);
            if (result !== null) return result;
          }
        }
      }
      return null;
    };
    while (queue.length) {
      const item = queue.shift();
      const current = item?.value;
      if (!current || typeof current !== "object" || seen.has(current) || item.depth > 4) continue;
      seen.add(current);
      if (Array.isArray(current)) {
        for (const child of current) queue.push({ value: child, depth: item.depth + 1 });
        continue;
      }
      const label = norm(first(current.name, current.label, current.type?.name, current.type, current.stat?.name, current.key, "")).replace(/[^a-z0-9]/g, "");
      if (aliasSet.has(label)) {
        const n = numericValue(first(current.value, current.total, current.count, current.displayValue, current.stat?.value, current.stat?.total, current));
        if (n !== null && n >= 0) maximum = Math.max(maximum, n);
      }
      for (const [key, value] of Object.entries(current)) {
        const normalKey = norm(key).replace(/[^a-z0-9]/g, "");
        if (aliasSet.has(normalKey)) {
          const n = numericValue(value);
          if (n !== null && n >= 0) maximum = Math.max(maximum, n);
        }
        if (value && typeof value === "object" && item.depth < 4) queue.push({ value, depth: item.depth + 1 });
      }
    }
    return maximum;
  }

  function playerEventBadges(player, details) {
    const counts = { goals:0, penalties:0, ownGoals:0, assists:0, yellow:0, red:0, injury:0, subIn:0, subOut:0, subs:0 };
    const events = getEvents(details);
    const truthyFlag = value => value === true || value === 1 || /^(true|1|yes|y)$/i.test(String(value ?? "").trim());

    events.forEach(event => {
      const type = eventType(event);
      const description = norm([
        event?.goalType, event?.goal_type, event?.detail, event?.text, event?.description,
        event?.commentary, event?.shortText, event?.longText, event?.goalDescription,
        event?.goal_description, event?.reason?.name, event?.reason,
        event?.injury?.type?.name, event?.injury?.type
      ].filter(value => value !== null && value !== undefined && value !== "").join(" "));
      const people = [
        event?.player, event?.scorer, event?.goalScorer, event?.goal_scorer,
        event?.goal?.player, event?.goal?.scorer, event?.athlete, event?.actor,
        event?.injury?.player, event?.injury?.athlete, event?.injuredPlayer, event?.injured_player,
        event?.card?.player, event?.relatedPlayer, event?.related_player,
        event?.participant, event?.person, event?.player_name, event?.playerName, event?.scorer_name,
        event?.participants?.[0]?.athlete, event?.participants?.[0]?.player, event?.participants?.[0],
        event?.players?.[0]?.athlete, event?.players?.[0]?.player, event?.players?.[0],
        event?.playerIn, event?.player_in, event?.playerOut, event?.player_out,
        event?.substitution?.incoming, event?.substitution?.outgoing
      ].filter(value => eventPersonName(value));
      const primary = people[0] || null;
      const playerInvolved = people.some(value => samePerson(value, player));
      const isGoal = eventIsGoal(event);

      if (isGoal && primary && samePerson(primary, player)) {
        const goalText = norm([type, description].join(" "));
        const ownGoal = [
          event?.ownGoal, event?.own_goal, event?.isOwnGoal, event?.is_own_goal,
          event?.goal?.ownGoal, event?.goal?.own_goal, event?.goal?.isOwnGoal,
          event?.goal?.is_own_goal
        ].some(truthyFlag) ||
          /own[ _-]?goal|but contre son camp|contre son camp|autogoal|auto[ _-]?goal|autobut|\bcsc\b/.test(goalText);
        const penalty = [
          event?.isPenalty, event?.is_penalty, event?.penalty, event?.penaltyGoal,
          event?.penalty_goal, event?.goal?.penalty, event?.goal?.isPenalty,
          event?.goal?.is_penalty
        ].some(truthyFlag) || /penalt|tir au but/.test(goalText);
        if (ownGoal) counts.ownGoals += 1;
        else if (penalty) counts.penalties += 1;
        else counts.goals += 1;
      }

      let injuryCounted = false;
      if (!isGoal && playerInvolved) {
        if (/second yellow|red card|redcard|carton rouge/.test(type)) counts.red += 1;
        else if (/yellow card|yellowcard|carton jaune/.test(type)) counts.yellow += 1;
        else if (/injur|hurt|medical|bless|lesion/.test(type + " " + description)) {
          counts.injury += 1;
          injuryCounted = true;
        }
      }

      const assist = eventIsGoal(event) ? eventAssist(event) : "";
      if (assist && samePerson(assist, player)) counts.assists += 1;

      const injuryTargets = [
        event?.injury?.player, event?.injury?.athlete, event?.injuredPlayer,
        event?.injured_player, event?.injured, event?.player_injured, event?.injuryPlayer
      ].filter(value => eventPersonName(value));
      if (!injuryCounted && /injur|hurt|medical|bless|lesion/.test(type + " " + description) &&
          injuryTargets.some(value => samePerson(value, player))) counts.injury += 1;

      if (eventIsSubstitution(event)) {
        const swap = eventSubstitutionData(event);
        if (swap.incoming && samePerson(swap.incoming, player)) counts.subIn += 1;
        if (swap.outgoing && samePerson(swap.outgoing, player)) counts.subOut += 1;
        if (!swap.incoming && !swap.outgoing && swap.involved.some(name => samePerson(name, player))) counts.subs += 1;
      }
    });

    const goals = playerMetricCount(player, ["goals", "goal", "goalsScored", "scoredGoals"]);
    const assists = playerMetricCount(player, ["assists", "assist", "goalAssists", "assistsMade"]);
    const yellows = playerMetricCount(player, ["yellowCards", "yellowCard", "yellow", "yellowCardsTotal"]);
    const reds = playerMetricCount(player, ["redCards", "redCard", "red", "redCardsTotal"]);
    const penalties = playerMetricCount(player, ["penaltyGoals", "penaltiesScored", "goalsFromPenalty"]);
    const ownGoals = playerMetricCount(player, ["ownGoals", "ownGoal"]);
    const injuries = playerMetricCount(player, ["injury", "injuries", "injuryCount", "injuryEvents"]);
    counts.penalties = Math.max(counts.penalties, penalties);
    counts.ownGoals = Math.max(counts.ownGoals, ownGoals);
    counts.goals = Math.max(counts.goals, Math.max(0, goals - counts.penalties - counts.ownGoals));
    counts.assists = Math.max(counts.assists, assists);
    counts.yellow = Math.max(counts.yellow, yellows);
    counts.red = Math.max(counts.red, reds);
    counts.injury = Math.max(counts.injury, injuries);

    const badges = [];
    const add = (kind, value, title) => {
      if (!(value > 0)) return;
      badges.push(
        '<span class="bf-new-safe-event-badge bf-new-safe-event-badge--' + kind +
        '" title="' + esc(title) + '" aria-label="' + esc(title) + '">' +
        playerPerformanceIcon(kind) +
        (value > 1 ? '<span class="bf-new-safe-event-count">' + value + '</span>' : '') +
        '</span>'
      );
    };
    add("goal",counts.goals,"Buts");
    add("penalty",counts.penalties,"Buts sur penalty");
    add("own",counts.ownGoals,"But contre son camp");
    add("assist",counts.assists,"Passes décisives");
    add("injury",counts.injury,"Blessures");
    add("yellow",counts.yellow,"Cartons jaunes");
    add("red",counts.red,"Cartons rouges");
    add("subIn",counts.subIn,"Entrée en jeu");
    add("subOut",counts.subOut,"Sortie du terrain");
    if (!counts.subIn && !counts.subOut) add("sub",counts.subs,"Remplacements");
    return badges.join("");
  }

    function playerIsNamedMvp(player, details) {
    const keys = new Set([
      "playerofmatch", "playerofthematch", "manofthematch", "mvp",
      "bestplayer", "playerofthegame", "playermatch"
    ]);
    const queue = [{value:details,depth:0}], seen = new Set();
    while (queue.length && seen.size < 1500) {
      const item = queue.shift(), current = item?.value;
      if (!current || typeof current !== "object" || seen.has(current) || item.depth > 6) continue;
      seen.add(current);
      if (Array.isArray(current)) {
        current.forEach(child => { if (child && typeof child === "object") queue.push({value:child,depth:item.depth+1}); });
        continue;
      }
      for (const [key, value] of Object.entries(current)) {
        const normalizedKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
        if (keys.has(normalizedKey) && value !== null && value !== undefined && value !== "" && value !== false) {
          if (samePerson(value, player)) return true;
          const name = eventPersonName(value);
          if (name && norm(name) === norm(playerName(player))) return true;
          if ((value === true || value === 1) &&
              [current.player, current.athlete, current.name, current.player_name, current.playerName]
                .some(candidate => samePerson(candidate, player))) return true;
        }
        if (value && typeof value === "object" && item.depth < 6) queue.push({value,depth:item.depth+1});
      }
    }
    return false;
  }

    function playerIsOfficialMvp(player) {
    const p = getPlayerObject(player);
    const sources = [player, p, player?.raw, player?.raw?.player, player?.statistics, player?.stats, player?.performance]
      .filter(value => value && typeof value === "object");
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

  function selectPitchMvp(homeLineup, awayLineup, details) {
    const all = [...homeLineup.players, ...awayLineup.players];
    const official = all.find(player => playerIsOfficialMvp(player) || playerIsNamedMvp(player, details));
    if (official) return { player: official, official: true };
    const best = all.map(player => ({ player, rating: playerRating(player) }))
      .filter(item => item.rating !== null && item.rating >= 0 && item.rating <= 10)
      .sort((a, b) => b.rating - a.rating)[0];
    return best ? { player: best.player, official: false } : null;
  }

  function renderMvp(homeLineup, awayLineup, details) {
    const all=[...homeLineup.players,...awayLineup.players];
    const official=all.find(player=>playerIsOfficialMvp(player) || playerIsNamedMvp(player, details));
    if(official){
      const photo=playerPhoto(official), rating=playerRating(official);
      return '<div class="bf-new-safe-mvp">' +
        (photo ? '<img src="' + esc(photo) + '" alt="' + esc(playerName(official)) + '" loading="lazy" referrerpolicy="no-referrer">' : '<div class="bf-new-safe-mvp-initials">MVP</div>') +
        '<div><div class="bf-new-safe-mvp-name">MVP officiel · ' + esc(playerName(official)) +
        '</div><div class="bf-new-safe-mvp-note">' +
        (rating!==null ? "Note : "+esc(Number(rating).toFixed(1))+"/10" : "Désignation de la source de données") +
        '</div></div></div>';
    }
    const best=all.map(player=>({player,rating:playerRating(player)})).filter(item=>item.rating!==null&&item.rating>=0&&item.rating<=10).sort((a,b)=>b.rating-a.rating)[0];
    if(!best)return '<div class="bf-new-safe-empty">Aucun MVP officiel ni note de joueur fournis par la source.</div>';
    const photo=playerPhoto(best.player);
    return '<div class="bf-new-safe-mvp">' +
      (photo ? '<img src="' + esc(photo) + '" alt="' + esc(playerName(best.player)) + '" loading="lazy" referrerpolicy="no-referrer">' : '<div class="bf-new-safe-mvp-initials">NOTE</div>') +
      '<div><div class="bf-new-safe-mvp-name">Meilleure note disponible · ' + esc(playerName(best.player)) +
      '</div><div class="bf-new-safe-mvp-note">Note : ' + esc(Number(best.rating).toFixed(1)) +
      '/10 — note calculée, pas une désignation officielle du MVP.</div></div></div>';
  }
  /* =========================================================
     RENDER DETAILS
     ========================================================= */
  function bfNewMatchMetaText(value, depth = 0) {
    if (value === null || value === undefined || depth > 4) return "";
    if (typeof value === "string" || typeof value === "number") return String(value).trim();
    if (Array.isArray(value)) {
      return [...new Set(value.map(item => bfNewMatchMetaText(item, depth + 1)).filter(Boolean))].join(" · ");
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
      const textValue = bfNewMatchMetaText(value[key], depth + 1);
      if (textValue) return textValue;
    }
    return "";
  }

  function bfNewFindMatchMeta(details, aliases) {
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
          const textValue = bfNewMatchMetaText(value);
          if (textValue) return textValue;
        }
      }
    }
    return "";
  }

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

    const pitchMvp = selectPitchMvp(homeLineup, awayLineup, details);

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
        details?.tournament?.name,
        details?.fixture?.league?.name,
        details?.fixture?.competition?.name,
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

    const date = first(
      details?.fixture?.date, details?.date, details?.time, ""
    );

    const venue = first(
      bfNewFindMatchMeta(details, ["venue", "stadium", "ground", "arena", "stadiumName", "venueName"]),
      details?.fixture?.venue?.name, details?.fixture?.venue?.displayName,
      typeof details?.fixture?.venue === "string" ? details.fixture.venue : null,
      typeof details?.venue === "string" ? details.venue : null, ""
    );

    const referee = first(
      bfNewFindMatchMeta(details, ["referee", "mainReferee", "matchReferee", "refereeName", "official"]),
      details?.fixture?.referee?.name,
      typeof details?.fixture?.referee === "string" ? details.fixture.referee : null,
      details?.referee?.name,
      typeof details?.referee === "string" ? details.referee : null, ""
    );

    const broadcastChannel = bfNewFindMatchMeta(details, [
      "tvChannel", "tv_channel", "tvChannels", "tv_channels", "tvStation", "tvStations",
      "broadcastChannel", "broadcast_channel", "broadcastName", "broadcast_name",
      "channel", "channels", "channelName", "channel_name", "broadcaster", "broadcasters",
      "broadcasterName", "broadcast", "broadcasts", "network", "networks", "television",
      "media", "coverage", "beIN", "beinSports", "beIN Sports", "beINConnect"
    ]);

    const commentator = bfNewFindMatchMeta(details, [
      "commentator", "commentators", "commentatorName", "commentator_name",
      "tvCommentator", "tv_commentator", "matchCommentator", "match_commentator",
      "liveCommentator", "broadcastCommentator", "announcer", "announcers",
      "commentaryTeam", "commentary_team", "presenter", "presenters", "caster", "beINCommentator", "beinCommentator", "beINCommentators", "beinSportsCommentator", "commentatorBein", "bein_sports_commentator"
    ]);

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
        ${esc(
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

              : esc(String(home.name || "FC").trim().split(/\s+/).map(part => part[0] || "").join("").slice(0,3).toUpperCase())
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

              : esc(String(away.name || "FC").trim().split(/\s+/).map(part => part[0] || "").join("").slice(0,3).toUpperCase())
          }

          <div>
            ${esc(
              away.name
            )}
          </div>

        </div>

      </div>


      <div class="bf-new-safe-info">
        ${date ? '<span>📅 ' + esc(new Date(date).toLocaleString("fr-FR")) + '</span>' : ''}
        <span data-bf-meta="venue"><b>🏟️ Stade :</b> <i data-bf-meta-value="venue">${esc(venue || "Non communiqué")}</i></span>
        <span data-bf-meta="referee"><b>👨‍⚖️ Arbitre :</b> <i data-bf-meta-value="referee">${esc(referee || "Non communiqué")}</i></span>
        <span data-bf-meta="channel"><b>📺 Chaîne :</b> <i data-bf-meta-value="channel">${esc(broadcastChannel || "Non communiquée")}</i></span>
        <span data-bf-meta="commentator"><b>🎙️ Commentateur :</b> <i data-bf-meta-value="commentator">${esc(commentator || "Non communiqué")}</i></span>
        ${providerText ? '<span>' + esc(providerText) + '</span>' : ''}
      </div>

      <div
        class="bf-new-safe-section"
      >

        <div
          class="bf-new-safe-title"
        >
          Formations et compositions
        </div>

        ${renderCombinedPitch(
          homeLineup,
          home,
          awayLineup,
          away,
          details,
          pitchMvp
        )}

      </div>


      <div class="bf-new-safe-section">
        <div class="bf-new-safe-title">MVP et meilleure note</div>
        ${renderMvp(homeLineup, awayLineup, details)}
      </div>

      <div class="bf-new-safe-section">
        <div class="bf-new-safe-title">Statistiques du match</div>
        ${renderStatistics(details)}
      </div>

      <details class="bf-new-safe-section bf-new-safe-player-list">
        <summary class="bf-new-safe-title">Joueurs et statistiques individuelles · ouvrir</summary>

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
              homeLineup,
              details
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
              awayLineup,
              details
            )}

          </div>

        </div>

      </details>


      <div
        class="bf-new-safe-section"
      >

        <div
          class="bf-new-safe-title"
        >
          Événements
        </div>

        ${renderEvents(
          details
        )}

      </div>

    `;

    if (!content.dataset.bfNewPlayerDetailEvents) {
      content.dataset.bfNewPlayerDetailEvents = "1";
      const openPlayerDetail = target => {
        const player = target?.closest?.(".bf-new-safe-combined-player");
        if (!player || !content.contains(player)) return;
        const frame = player.closest(".bf-new-safe-combined-wrap");
        const panel = frame?.querySelector(".bf-new-safe-player-detail-panel");
        const template = player.querySelector("template.bf-new-safe-player-template");
        if (!panel || !template) return;
        const alreadyOpen = player.getAttribute("aria-expanded") === "true";
        frame.querySelectorAll(".bf-new-safe-combined-player[aria-expanded='true']").forEach(other => {
          other.setAttribute("aria-expanded","false");
          other.classList.remove("bf-new-safe-combined-player--active");
        });
        if (alreadyOpen) { panel.hidden = true; panel.innerHTML = ""; return; }
        player.setAttribute("aria-expanded","true");
        player.classList.add("bf-new-safe-combined-player--active");
        panel.innerHTML = template.innerHTML;
        panel.hidden = false;
      };
      content.addEventListener("click", event => openPlayerDetail(event.target));
      content.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && event.target?.closest?.(".bf-new-safe-combined-player")) {
          event.preventDefault();
          openPlayerDetail(event.target);
        }
      });
    }

    modal.style.display =
      "block";

    document.body.style.overflow =
      "hidden";

    if (typeof window.bfSetupMatchCenter === "function") {
      const matchIdentifier = first(source?.value, source?.id, window.__bfActiveExpectedIdentifier, "");
      window.bfSetupMatchCenter(matchIdentifier, {home,away}, competition, date, content);
    }
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


  function hasOfficialLineupCoordinates(details) {
    const groups = Array.isArray(details?.lineups) ? details.lineups : [];
    if (groups.length < 2) return false;
    return groups.slice(0,2).every(group => {
      const starters = Array.isArray(group?.startXI) ? group.startXI
        : Array.isArray(group?.starters) ? group.starters
        : Array.isArray(group?.xi) ? group.xi : [];
      if (starters.length !== 11) return false;
      const points = starters.map(player => {
        const p = getPlayerObject(player);
        const objects = [player?.player,player,player?.raw?.player,player?.raw,p].filter(x=>x&&typeof x==="object");
        for (const source of objects) {
          const xRaw=source.x??source.coord_x??source.coordinate_x??source.pitch_x??source.pitchX;
          const yRaw=source.y??source.coord_y??source.coordinate_y??source.pitch_y??source.pitchY;
          if (xRaw===null||xRaw===undefined||xRaw===""||yRaw===null||yRaw===undefined||yRaw==="") continue;
          const x=Number(xRaw),y=Number(yRaw);
          if (Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=120&&y>=0&&y<=100) return {x,y};
        }
        return null;
      });
      if (points.every(Boolean)) {
        const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
        const spreadX=Math.max(...xs)-Math.min(...xs), spreadY=Math.max(...ys)-Math.min(...ys);
        const normalized=Math.max(...xs)<=1 && Math.max(...ys)<=1 && spreadX>=0.2 && spreadY>=0.2;
        const integerGrid=xs.every(v=>Number.isInteger(v)&&v>=1&&v<=11) &&
          ys.every(v=>Number.isInteger(v)&&v>=1&&v<=11) && spreadX>=3 && spreadY>=3;
        if(normalized || integerGrid || (spreadX>=10 && spreadY>=10)) return true;
      }
      const grids=starters.map(player=>{
        const p=getPlayerObject(player);
        const sources=[player?.player,player,player?.raw?.player,player?.raw,p].filter(x=>x&&typeof x==="object");
        for(const source of sources){
          const value=source.grid??source.position_grid??source.positionGrid??source.formation_grid??source.formationGrid;
          if(Array.isArray(value)&&value.length>=2){
            const row=Number(value[0]),col=Number(value[1]);if(Number.isInteger(row)&&Number.isInteger(col))return {row,col};
          }
          if(value&&typeof value==="object"){
            const row=Number(value.row??value.line??value.y),col=Number(value.column??value.col??value.slot??value.x);
            if(Number.isInteger(row)&&Number.isInteger(col))return {row,col};
          }
          if(typeof value==="string"){
            const match=value.trim().match(/^(\d+)\s*[:;,.-]\s*(\d+)$/);
            if(match)return {row:Number(match[1]),col:Number(match[2])};
          }
        }
        return null;
      });
      return grids.every(Boolean)&&new Set(grids.map(item=>item.row+":"+item.col)).size===11&&
        new Set(grids.map(item=>item.row)).size>=3;
    });
  }

  /* =========================================================
     OPEN NEW MATCH
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

  async function openNewMatch(
    index,
    matchOverride = null,
    identifierOverride = ""
  ) {

    const requestId = ++activeNewDetailsRequest;
    const match = matchOverride || getMatch(index);

    if (match) {
      window.__bfActiveExpectedMatch = match;
      window.__bfActiveExpectedIdentifier = String(identifierOverride || match?.fixture?.id || match?.id || match?.fixture?.slug || match?.slug || "");
    }

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

        let details =
          await fetchDetails(
            source
          );

        if (requestId !== activeNewDetailsRequest) {
          return true;
        }

        if (!bfSameFixtureMetadata(details, match, false)) {
          throw new Error("Le fournisseur a renvoyé une ancienne rencontre ; ses détails sont ignorés.");
        }

        if (!hasOfficialLineupCoordinates(details)) {
          try {
            const homeName = details?.teams?.home?.name || details?.home_team?.name ||
              details?.home?.name || details?.lineups?.[0]?.team?.name || match?.home?.name || "";
            const awayName = details?.teams?.away?.name || details?.away_team?.name ||
              details?.away?.name || details?.lineups?.[1]?.team?.name || match?.away?.name || "";
            const lookupDate = details?.fixture?.date || details?.date || details?.time ||
              match?.fixture?.date || match?.date || match?.time || "";
            if (homeName && awayName && lookupDate) {
              const params = new URLSearchParams({
                fixture: "sofa-fotmob-lookup",
                home: String(homeName),
                away: String(awayName),
                date: String(lookupDate)
              });
              const response = await fetch("/api?" + params.toString(), {
                cache: "no-store",
                headers: { Accept: "application/json" }
              });
              const payload = await response.json();
              const official = payload?.data || payload?.match || payload;
              if (response.ok && bfSameFixtureMetadata(official, match, true) &&
                  bfSameFixtureMetadata(official, details, true) &&
                  hasOfficialLineupCoordinates(official)) {
                details = { ...details, lineups: official.lineups };
                console.info("BAKHIRAFOOT: exact official lineup coordinates loaded", {
                  provider: official?.provider || "FotMob",
                  home: homeName,
                  away: awayName
                });
              } else {
                console.warn("BAKHIRAFOOT: no exact official layout for this fixture",
                  payload?.details || payload?.error || "No complete lineups");
              }
            }
          } catch (layoutError) {
            console.warn("BAKHIRAFOOT: official lineup fallback failed", layoutError);
          }
        }

        renderDetails(
          details,
          source.source
        );

        return true;

      } catch (error) {

        if (requestId !== activeNewDetailsRequest) {
          return true;
        }

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

      /* Professional combined pitch: player performance beside each card. */
      #bf-new-match-safe-modal .bf-new-safe-combined-player { overflow:visible; }
      #bf-new-match-safe-modal .bf-new-safe-combined-performance { position:absolute; top:10px; left:calc(100% - 1px); right:auto; z-index:15; display:flex; flex-direction:column; align-items:center; gap:3px; width:20px; max-width:20px; overflow:visible; }
      #bf-new-match-safe-modal .bf-new-safe-combined-player--perf-left .bf-new-safe-combined-performance { left:auto; right:calc(100% - 1px); }
      #bf-new-match-safe-modal .bf-new-safe-combined-performance .bf-new-safe-event-badge,
      #bf-new-match-safe-modal .bf-new-safe-combined-performance .bf-new-safe-player-rate,
      #bf-new-match-safe-modal .bf-new-safe-combined-performance .bf-new-safe-mvp-chip { display:inline-flex; align-items:center; justify-content:center; min-width:15px; min-height:14px; padding:2px; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,.25); font-size:7px; line-height:1; }
      #bf-new-match-safe-modal .bf-new-safe-combined-performance .bf-new-safe-player-rate { background:#f8fafc; color:#122033; font-weight:950; }
      #bf-new-match-safe-modal .bf-new-safe-combined-performance .bf-new-safe-mvp-chip { background:#facc15; color:#422006; }
      #bf-new-match-safe-modal .bf-new-safe-head .bf-new-safe-info { width:100%; grid-column:1/-1; flex:0 0 100%; justify-content:flex-start; margin-top:15px; padding-top:13px; border-top:1px solid rgba(148,163,184,.22); }
      #bf-new-match-safe-modal .bfmd-center-nav { background:transparent; border-bottom:1px solid rgba(127,127,127,.13); }
      body.dark #bf-new-match-safe-modal .bf-new-safe-box { color:#edf4ff; background:#0b1422; border:1px solid rgba(148,176,211,.2); }
      body.dark #bf-new-match-safe-modal .bf-new-safe-section,
      body.dark #bf-new-match-safe-modal .bfmd-section { color:#edf4ff; background:linear-gradient(145deg,rgba(19,34,54,.94),rgba(12,23,38,.96)); border-color:rgba(157,181,211,.18); }
      body.dark #bf-new-match-safe-modal .bf-new-safe-title,
      body.dark #bf-new-match-safe-modal .bf-new-safe-team,
      body.dark #bf-new-match-safe-modal .bf-new-safe-score { color:#f3f7ff; }
      body.dark #bf-new-match-safe-modal .bf-new-safe-info span { color:#d9e7fa; background:#132238; border-color:rgba(157,181,211,.18); }
      body.dark #bf-new-match-safe-modal .bfmd-center-nav button { color:#edf4ff; }
      body:not(.dark) #bf-new-match-safe-modal .bf-new-safe-box { color:#172033; background:#f7f9fc; border:1px solid #d9e2ee; }
      body:not(.dark) #bf-new-match-safe-modal .bf-new-safe-section,
      body:not(.dark) #bf-new-match-safe-modal .bfmd-section { color:#172033; background:linear-gradient(145deg,#fff,#f7f9fc); border-color:#d8e2ed; }
      body:not(.dark) #bf-new-match-safe-modal .bf-new-safe-title,
      body:not(.dark) #bf-new-match-safe-modal .bf-new-safe-team { color:#172033; }
      body:not(.dark) #bf-new-match-safe-modal .bf-new-safe-score { color:#101828; }
      body:not(.dark) #bf-new-match-safe-modal .bf-new-safe-info span { color:#334155; background:#edf2f7; border-color:#d6e0eb; }
      body:not(.dark) #bf-new-match-safe-modal .bfmd-center-nav { background:rgba(247,249,252,.96); }
      body:not(.dark) #bf-new-match-safe-modal .bfmd-center-nav button { color:#27364b; }
      @media(max-width:650px) {
        #bf-new-match-safe-modal .bf-new-safe-combined-performance { top:8px; width:16px; max-width:16px; gap:2px; }
        #bf-new-match-safe-modal .bf-new-safe-combined-performance .bf-new-safe-event-badge,
        #bf-new-match-safe-modal .bf-new-safe-combined-performance .bf-new-safe-player-rate,
        #bf-new-match-safe-modal .bf-new-safe-combined-performance .bf-new-safe-mvp-chip { min-width:12px; min-height:12px; padding:1px; font-size:6px; }
      }

      /* Landscape pitch: home occupies the left half, away the right half. */
      #bf-new-match-safe-modal .bf-new-safe-combined-pitch { width:min(100%,900px); aspect-ratio:1.48; height:auto; min-height:0; max-height:none; margin:0 auto; overflow:visible; }
      #bf-new-match-safe-modal .bf-new-safe-combined-pitch .bf-new-safe-combined-half { left:50%; right:auto; top:8px; bottom:8px; width:2px; height:auto; }
      #bf-new-match-safe-modal .bf-new-safe-combined-pitch .bf-new-safe-combined-box { left:0; right:auto; top:25%; bottom:25%; width:15%; height:auto; }
      #bf-new-match-safe-modal .bf-new-safe-combined-pitch .bf-new-safe-combined-box--top { left:8px; right:auto; top:25%; bottom:25%; }
      #bf-new-match-safe-modal .bf-new-safe-combined-pitch .bf-new-safe-combined-box--bottom { left:auto; right:8px; top:25%; bottom:25%; }
      #bf-new-match-safe-modal .bf-new-safe-combined-goal { position:absolute; top:39%; width:3%; height:22%; border:1px solid rgba(255,255,255,.85); pointer-events:none; }
      #bf-new-match-safe-modal .bf-new-safe-combined-goal--left { left:0; border-left:0; }
      #bf-new-match-safe-modal .bf-new-safe-combined-goal--right { right:0; border-right:0; }
      #bf-new-match-safe-modal .bf-new-safe-combined-spot { position:absolute; top:calc(50% - 2px); width:4px; height:4px; border-radius:50%; background:#fff; }
      #bf-new-match-safe-modal .bf-new-safe-combined-spot--left { left:20%; }
      #bf-new-match-safe-modal .bf-new-safe-combined-spot--right { right:20%; }
      #bf-new-match-safe-modal .bf-new-safe-combined-player { width:clamp(52px,6vw,84px); }
      #bf-new-match-safe-modal .bf-new-safe-combined-player img,
      #bf-new-match-safe-modal .bf-new-safe-combined-avatar { width:clamp(24px,2.8vw,38px); height:clamp(24px,2.8vw,38px); }
      #bf-new-match-safe-modal .bf-new-safe-combined-name { max-width:76px; font-size:clamp(7px,.65vw,9px); padding:2px 4px; }
      #bf-new-match-safe-modal .bf-new-safe-combined-performance { top:0; }
      #bf-new-match-safe-modal .bf-new-safe-combined-info i { font-style:normal; }
      #bf-new-match-safe-modal .bf-new-safe-info i { font-style:normal; }
      #bf-new-match-safe-modal .bf-new-safe-info b { font-weight:850; }
      @media(max-width:650px) {
        #bf-new-match-safe-modal .bf-new-safe-combined-pitch { width:100%; aspect-ratio:1.12; }
        #bf-new-match-safe-modal .bf-new-safe-combined-player { width:clamp(42px,11vw,58px); }
        #bf-new-match-safe-modal .bf-new-safe-combined-player img,
        #bf-new-match-safe-modal .bf-new-safe-combined-avatar { width:clamp(20px,5.4vw,27px); height:clamp(20px,5.4vw,27px); }
        #bf-new-match-safe-modal .bf-new-safe-combined-name { max-width:55px; font-size:6.5px; padding:2px; }
        #bf-new-match-safe-modal .bf-new-safe-combined-performance { top:0; width:15px; max-width:15px; }
      }

    `;

    return true;
  }

  /* =========================================================
     CLICK INTERCEPTOR
     ========================================================= */

  document.addEventListener(
    "keydown",
    function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target?.closest?.(".match-card, .bf-score-pro-card, .bf-score-professional-match, [data-search-type=\"match\"]");
      if (!card || card.getAttribute("role") !== "button") return;
      event.preventDefault();
      card.click();
    },
    true
  );

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
            ".bf-score-professional-match",
            '[data-search-type="match"]'
          ].join(",")
        );

      if (!card) {
        return;
      }

      const index =
        Number(card.dataset.matchIndex);

      if (!Number.isInteger(index) || index < 0) {
        const cardIdentifier = String(
          card.dataset.fixtureId ||
          card.dataset.matchSlug ||
          card.dataset.slug ||
          card.dataset.fixture ||
          ""
        ).trim();

        if (!cardIdentifier) return;

        /*
         * Home cards and a few competition lists don't carry data-match-index.
         * Resolve their identifier against the API-backed currentMatches array
         * before choosing a provider. Otherwise ESPN/SofaScore/TSDB fixtures
         * incorrectly fall through to the SportScore-only details endpoint.
         */
        const identifierKeys = match => [
          match?.fixture?.upstreamId,
          match?.upstreamId,
          match?.fixture?.id,
          match?.fixture?.slug,
          match?.slug,
          match?.id,
          match?.match_slug,
          match?.fixture_id,
          match?.match_id
        ].filter(value => value !== null && value !== undefined && String(value).trim())
          .map(value => String(value).trim().toLowerCase());

        const clickedKey = cardIdentifier.toLowerCase();
        const matches = getMatches();
        const resolvedIndex = matches.findIndex(match =>
          identifierKeys(match).includes(clickedKey)
        );

        if (resolvedIndex >= 0) {
          const resolvedMatch = getMatch(resolvedIndex);
          const resolvedSources = getExternalSources(resolvedMatch);

          event.preventDefault();
          event.stopImmediatePropagation();

          if (resolvedSources.length) {
            openNewMatch(resolvedIndex);
          } else if (typeof window.bfOpenMatchDetails === "function") {
            window.__bfActiveExpectedMatch = resolvedMatch;
            window.__bfActiveExpectedIdentifier = cardIdentifier;
            window.bfOpenMatchDetails(cardIdentifier);
          }
          return;
        }

        // Homepage fixtures are fetched separately from Scores. Resolve the exact
        // clicked fixture from this registry instead of using the same numeric index.
        const homeRegistry = window.__bfHomeMatchRegistry;
        const homeMatch = homeRegistry instanceof Map ? homeRegistry.get(clickedKey) : null;
        if (homeMatch) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const homeSources = getExternalSources(homeMatch);
          if (homeSources.length) {
            openNewMatch(-1, homeMatch, cardIdentifier);
          } else if (typeof window.bfOpenMatchDetails === "function") {
            window.__bfActiveExpectedMatch = homeMatch;
            window.__bfActiveExpectedIdentifier = cardIdentifier;
            window.bfOpenMatchDetails(cardIdentifier);
          }
          return;
        }

        /*
         * If no matching list entry exists, preserve the old SportScore path.
         * Never invent provider IDs or guess an external fixture from its label.
         */
        if (typeof window.bfOpenMatchDetails !== "function") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        window.bfOpenMatchDetails(cardIdentifier);
        return;
      }

      const match =
        getMatch(index);

      if (!match) {
        return;
      }

      const sources =
        getExternalSources(match);

      /*
       * External-provider fixtures must use openNewMatch(index):
       * it tries SofaScore, ESPN, then TheSportsDB if a provider fails.
       * SportScore fixtures keep the legacy details handler.
       */
      if (sources.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openNewMatch(index);
        return;
      }

      const identifier = String(
        match?.fixture?.slug ||
        match?.slug ||
        match?.fixture?.id ||
        match?.id ||
        card?.dataset?.fixtureId ||
        ""
      ).trim();

      if (!identifier || typeof window.bfOpenMatchDetails !== "function") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      window.__bfActiveExpectedMatch = match;
      window.__bfActiveExpectedIdentifier = identifier;
      window.bfOpenMatchDetails(identifier);

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

  // Install shared match-centre styles at startup for both data-provider paths.
  createStyles();

  console.log(
    "✅ BakhiraFoot NEW MATCH DETAILS SAFE loaded"
  );

})();
