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
    const keys = ["events", "incidents", "plays", "injuries", "cards", "goals"];
    const combined = [];
    const seen = new Set();
    for (const key of keys) {
      const list = Array.isArray(details?.[key]) ? details[key] : [];
      for (const event of list) {
        const signature = [
          event?.minute ?? event?.elapsed ?? event?.time?.elapsed,
          typeof event?.type === "object" ? event?.type?.name : event?.type,
          event?.player?.name || event?.player_name || event?.athlete?.displayName || event?.name,
          event?.detail || event?.text
        ].filter(value => value !== null && value !== undefined && value !== "").join("|");
        const identity = String(first(event?.id, event?.event_id, event?.incidentId, signature || JSON.stringify(event)));
        if (!seen.has(identity)) { seen.add(identity); combined.push(event); }
      }
    }
    return combined;
  }

  function eventType(event) {
    const values = [
      typeof event?.type === "object" ? event?.type?.name : event?.type,
      typeof event?.type === "object" ? event?.type?.text : "",
      event?.incidentType, event?.kind, event?.detail, event?.text,
      event?.description, event?.commentary, event?.injury?.type, event?.card?.type
    ];
    return norm(values.filter(v => v !== null && v !== undefined && v !== "").join(" "));
  }

  function eventIcon(event) {
    const type=eventType(event);
    if(type.includes("goal")||type.includes("score"))return "GOAL";
    if(type.includes("yellow"))return "YC";
    if(type.includes("red"))return "RC";
    if(type.includes("sub"))return "SUB";
    if(type.includes("injur")||type.includes("hurt"))return "INJ";
    if(type.includes("assist"))return "AST";
    return "EVENT";
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

  function eventAssist(event) {
    return String(first(
      typeof event?.assist === "string" ? event.assist : null,
      event?.assist?.name,
      event?.assist?.player?.name,
      event?.assistPlayer?.name,
      event?.assist_player?.name,
      event?.assist_name,
      event?.assistName,
      event?.assists?.[0]?.name,
      event?.participants?.[1]?.athlete?.displayName,
      ""
    ));
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
      .bf-new-safe-player-events { display:flex; flex-wrap:wrap; gap:3px; }
      .bf-new-safe-stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      .bf-new-safe-stat { border:1px solid rgba(126,145,167,.15); }
      .bf-new-safe-stat-track { display:grid; grid-template-columns:1fr 1fr; gap:3px; height:5px; margin-top:8px; }
      .bf-new-safe-stat-home,.bf-new-safe-stat-away { height:5px; min-width:3px; border-radius:99px; display:block; }
      .bf-new-safe-stat-home { justify-self:end; background:linear-gradient(90deg,#1d4ed8,#60a5fa); }
      .bf-new-safe-stat-away { justify-self:start; background:linear-gradient(90deg,#fb7185,#e11d48); }
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

    /* Use the declared formation when source X/Y and grid are missing. */
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
     RENDER PITCH
     ========================================================= */

  function renderPitch(
    lineup,
    team,
    side,
    details
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
                    <span class="bf-new-safe-role">${esc(playerPosition(player) || "—")}</span>
                    <div class="bf-new-safe-player-name">${esc(playerName(player))}</div>
                    <div class="bf-new-safe-pitch-events">${playerEventBadges(player, details)}</div>
                    ${playerIsOfficialMvp(player) ? '<span class="bf-new-safe-mvp-chip" title="MVP officiel">MVP</span>' : ""}
                    ${rating !== null ? '<span class="bf-new-safe-player-rate">' + esc(Number(rating).toFixed(1)) + '</span>' : ""}

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

                <div
                  class="bf-new-safe-pos"
                >
                  ${esc(playerPosition(player) || "Position indisponible")}
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
                        Assist · ${esc(
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

  function playerEventBadges(player, details) {
    const name = norm(playerName(player));
    if (!name) return "";
    const counts = { goals:0, assists:0, yellow:0, red:0, injury:0, subs:0 };
    getEvents(details).forEach(event => {
      const scorer = norm(first(
        event?.player?.name, event?.player_name, event?.athlete?.displayName,
        event?.participants?.[0]?.athlete?.displayName, eventPlayer(event)
      ));
      const assist = norm(eventAssist(event));
      const type = eventType(event);
      if (scorer === name) {
        if (type.includes("goal") || type.includes("score")) counts.goals += 1;
        else if (type.includes("yellow")) counts.yellow += 1;
        else if (type.includes("red")) counts.red += 1;
        else if (type.includes("sub")) counts.subs += 1;
        else if (type.includes("injur") || type.includes("hurt") || type.includes("medical")) counts.injury += 1;
      }
      if (assist && assist === name && (type.includes("goal") || type.includes("score"))) counts.assists += 1;
    });
    const badges = [];
    const add = (label,value,kind) => {
      if (value > 0) badges.push('<span class="bf-new-safe-event-badge bf-new-safe-event-badge--' + kind + '">' + label + (value > 1 ? " " + value : "") + '</span>');
    };
    add("G",counts.goals,"goal");
    add("A",counts.assists,"assist");
    add("INJ",counts.injury,"injury");
    add("YC",counts.yellow,"yellow");
    add("RC",counts.red,"red");
    add("SUB",counts.subs,"sub");
    return badges.join("");
  }

  function playerIsOfficialMvp(player) {
    const p = getPlayerObject(player);
    const sources = [player, p, player?.raw, player?.raw?.player].filter(value => value && typeof value === "object");
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

  function renderMvp(homeLineup, awayLineup) {
    const all=[...homeLineup.players,...awayLineup.players];
    const official=all.find(player=>playerIsOfficialMvp(player));
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
     =========================================================

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

              : "TEAM"
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

              : "TEAM"
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
                ${esc(
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
                ${esc(

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
          ${providerText}
        </span>

      </div>


      <div
        class="bf-new-safe-section"
      >

        <div
          class="bf-new-safe-title"
        >
          Formations et compositions
        </div>

        <div
          class="bf-new-safe-pitches"
        >

          ${renderPitch(
            homeLineup,
            home,
            "home",
            details
          )}

          ${renderPitch(
            awayLineup,
            away,
            "away",
            details
          )}

        </div>

      </div>


      <div class="bf-new-safe-section">
        <div class="bf-new-safe-title">MVP et meilleure note</div>
        ${renderMvp(homeLineup, awayLineup)}
      </div>

      <div class="bf-new-safe-section">
        <div class="bf-new-safe-title">Statistiques du match</div>
        ${renderStatistics(details)}
      </div>

      <div
        class="bf-new-safe-section"
      >

        <div
          class="bf-new-safe-title"
        >
          Joueurs
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

      </div>


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

  async function openNewMatch(
    index
  ) {

    const requestId = ++activeNewDetailsRequest;
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

        let details =
          await fetchDetails(
            source
          );

        if (requestId !== activeNewDetailsRequest) {
          return true;
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
              if (response.ok && hasOfficialLineupCoordinates(official)) {
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

        if (!cardIdentifier || typeof window.bfOpenMatchDetails !== "function") {
          return;
        }

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

  console.log(
    "✅ BakhiraFoot NEW MATCH DETAILS SAFE loaded"
  );

})();
