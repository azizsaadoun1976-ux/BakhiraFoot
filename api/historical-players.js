"use strict";

/*
 * BakhiraFoot Pro — historical scorers and assists
 * Uses ESPN's season-specific leaders endpoints for soccer.
 * This file is intentionally independent from api/index.js.
 */

const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_CORE = "https://sports.core.api.espn.com/v2/sports/soccer/leagues";

const LEAGUES = {
  "english-premier-league": "eng.1",
  "spanish-la-liga": "esp.1",
  "italian-serie-a": "ita.1",
  /* Keep both historical slugs supported: the current standings UI uses
     "bundesliga", while older saved links may use "german-bundesliga". */
  "bundesliga": "ger.1",
  "german-bundesliga": "ger.1",
  "french-ligue-1": "fra.1",
  "netherlands-eredivisie": "ned.1",
  "uefa-champions-league": "uefa.champions",
  "uefa-europa-league": "uefa.europa",
  "uefa-europa-conference-league": "uefa.europa.conf",
  "english-football-league-championship": "eng.2",
  "the-botola-pro": "mar.1",
  "egyptian-premier-league": "egy.1",
  "italian-serie-b": "ita.2",
  "portuguese-primera-liga": "por.1",
  "belgian-pro-league": "bel.1",
  "turkish-super-league": "tur.1",
  "scottish-premiership": "sco.1",
  "argentine-division-1": "arg.1",
  "brazilian-serie-a": "bra.1",
  "saudi-professional-league": "ksa.1",
  "fifa-world-cup": "fifa.world",
  "uefa-european-championship": "uefa.euro",
  "uefa-nations-league": "uefa.nations",
  "caf-africa-cup-of-nations": "caf.nations",
  "afc-asian-cup": "afc.asian.cup",
  "conmebol-copa-america": "conmebol.america"
};


const FOTMOB_ROOT = "https://www.fotmob.com/api/data";
const FOTMOB_FIXED_IDS = {
  "english-premier-league":47,"spanish-la-liga":87,"italian-serie-a":55,
  "bundesliga":54,"french-ligue-1":53,"netherlands-eredivisie":57,
  "uefa-champions-league":42,"uefa-europa-league":73,"the-botola-pro":530,
  "english-football-league-championship":48,"fifa-world-cup":77
};
const FOTMOB_DIRECTORY_HINTS = {
  "italian-serie-b":{names:["serie b"],countries:["italy","ita"]},
  "portuguese-primera-liga":{names:["primeira liga","liga portugal","liga portugal betclic"],countries:["portugal","por"]},
  "turkish-super-league":{names:["super lig","trendyol super lig"],countries:["turkey","tur"]},
  "belgian-pro-league":{names:["pro league","jupiler pro league"],countries:["belgium","bel"]},
  "scottish-premiership":{names:["scottish premiership","premiership"],countries:["scotland","sco"]},
  "argentine-division-1":{names:["liga profesional","argentina primera division"],countries:["argentina","arg"]},
  "brazilian-serie-a":{names:["brasileirao","brasileirao serie a","serie a"],countries:["brazil","bra"]},
  "egyptian-premier-league":{names:["egyptian premier league","premier league"],countries:["egypt","egy"]},
  "saudi-professional-league":{names:["saudi pro league","saudi professional league","roshn saudi league"],countries:["saudi arabia","ksa"]},
  "uefa-europa-conference-league":{names:["conference league","uefa conference league"],countries:["international","int"]},
  "uefa-european-championship":{names:["european championship","uefa euro","euro"],countries:["international","int"]},
  "uefa-nations-league":{names:["nations league","uefa nations league"],countries:["international","int"]},
  "caf-africa-cup-of-nations":{names:["africa cup of nations","afcon"],countries:["international","int"]},
  "afc-asian-cup":{names:["asian cup","afc asian cup"],countries:["international","int"]},
  "conmebol-copa-america":{names:["copa america"],countries:["international","int"]}
};
let fotmobDirectoryCache = null;
let fotmobDirectoryCacheAt = 0;
let fotmobDirectoryPending = null;

async function getFotmobJSON(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method:"GET",
      headers:{Accept:"application/json", Referer:"https://www.fotmob.com/"},
      signal:controller.signal
    });
    const body = await response.text();
    if (!response.ok) throw new Error("FotMob HTTP " + response.status);
    try { return JSON.parse(body); }
    catch { throw new Error("FotMob returned invalid JSON"); }
  } finally { clearTimeout(timer); }
}

async function getFotmobDirectory() {
  if (fotmobDirectoryCache && Date.now()-fotmobDirectoryCacheAt < 21600000) return fotmobDirectoryCache;
  if (fotmobDirectoryPending) return fotmobDirectoryPending;
  fotmobDirectoryPending = getFotmobJSON(FOTMOB_ROOT+"/allLeagues",5500)
    .then(payload => { fotmobDirectoryCache=payload; fotmobDirectoryCacheAt=Date.now(); return payload; })
    .finally(() => { fotmobDirectoryPending=null; });
  return fotmobDirectoryPending;
}

function flattenFotmobLeagues(payload) {
  const found=[];
  function walk(node,country="",code="") {
    if (Array.isArray(node)) { node.forEach(item=>walk(item,country,code)); return; }
    if (!node || typeof node!=="object") return;
    const currentCountry=node.country || node.countryName || country;
    const currentCode=node.ccode || node.ccode3 || node.countryCode || code;
    if (node.id!==undefined && (node.name || node.localizedName)) {
      const id=Number(node.id);
      if(Number.isFinite(id)) found.push({id,name:node.name||node.localizedName,country:currentCountry,ccode:currentCode});
    }
    if (node.leagues) walk(node.leagues,node.name||currentCountry,node.ccode||currentCode);
    if (node.international) walk(node.international,"International","INT");
    if (node.countries) walk(node.countries);
    if (node.popular) walk(node.popular);
    if (node.items) walk(node.items,currentCountry,currentCode);
  }
  walk(payload);
  const unique=new Map();
  found.forEach(item=>unique.set(String(item.id),item));
  return Array.from(unique.values());
}

async function getFotmobLeagueId(slug) {
  if(FOTMOB_FIXED_IDS[slug]) return FOTMOB_FIXED_IDS[slug];
  const hint=FOTMOB_DIRECTORY_HINTS[slug];
  if(!hint) return null;
  const directory=await getFotmobDirectory();
  const all=flattenFotmobLeagues(directory);
  const wantedNames=new Set(hint.names.map(normalize));
  const wantedCountries=new Set(hint.countries.map(normalize));
  const matches=all.filter(item=>wantedNames.has(normalize(item.name)));
  if(!matches.length)return null;
  const countryMatch=matches.find(item=>wantedCountries.has(normalize(item.country))||wantedCountries.has(normalize(item.ccode)));
  return (countryMatch||matches[0]).id||null;
}

function fotmobSeasonLabel(slug, season) {
  const year=Number(season);
  if(!Number.isInteger(year))return String(season);
  const singleYear=new Set(["fifa-world-cup","uefa-european-championship","caf-africa-cup-of-nations","afc-asian-cup","conmebol-copa-america","brazilian-serie-a","argentine-division-1"]);
  if(singleYear.has(slug))return String(year);
  return year+"/"+String(year+1);
}

function fotmobStatLabelMatches(label, stat) {
  const key=normalize(label);
  if(stat==="goals")return ["goal","goals","topscorer","topscorers","goalscorer","goalscorers","scoring"].includes(key);
  return ["assist","assists","goalassist","goalassists","topassists","assistleader"].includes(key);
}

function normalizeFotmobPlayerRows(payload, stat) {
  const root=payload?.data||payload||{};
  const candidates=[
    ...(Array.isArray(root?.statsData)?root.statsData:[]),
    ...(Array.isArray(root?.stats?.players)?root.stats.players.flatMap(group=>{
      const title=group.header||group.title||group.name||"";
      const list=Array.isArray(group.topThree)?group.topThree:Array.isArray(group.players)?group.players:[];
      return list.map(player=>({...player,__statHeader:title}));
    }):[]),
    ...(Array.isArray(root?.players)?root.players:[]),
    ...(Array.isArray(root?.topThree)?root.topThree:[])
  ];
  const rows=candidates.map(item=>{
    if(!item||typeof item!=="object")return null;
    const categoryHeader = item.__statHeader || item.statHeader || item.categoryName ||
      item.statName || item.statType || item.category || item.header || "";
    if(categoryHeader&&!fotmobStatLabelMatches(categoryHeader,stat))return null;
    const name=item.name||item.playerName||item.participant?.name||item.player?.name||item.athlete?.displayName||item.displayName||"";
    const total=numberValue(item.statValue?.value??item.statValue??item.substatValue??item.value??item.total??item.displayValue??item.stat?.value);
    if(!name||total===null||total<0)return null;
    const teamName=item.teamName||item.team?.name||item.clubName||item.team?.displayName||"";
    const teamLogo=item.teamLogo||item.team?.logo||item.team?.image||"";
    const photo=item.photo||item.imageUrl||item.image||item.player?.photo||"";
    const id=String(item.id||item.playerId||item.participant?.id||"");
    const team={name:teamName||"Équipe non renseignée",logo:teamLogo};
    return {name,player_name:name,value:total,[stat]:total,player:{id,name,full_name:name,photo,photo_url:photo,image:photo,logo:photo,team,[stat]:total},team};
  }).filter(Boolean);
  const unique=new Map();
  rows.forEach(row=>{const key=normalize(row.name);if(!unique.has(key)||row.value>unique.get(key).value)unique.set(key,row);});
  return Array.from(unique.values()).sort((a,b)=>b.value-a.value).slice(0,5);
}

async function fetchFotmobSeasonLeaders(slug, season) {
  const leagueId=await getFotmobLeagueId(slug);
  if(!leagueId)return {goals:[],assists:[],source:""};
  const label=fotmobSeasonLabel(slug,season);
  let leaguePayload=null;
  try {
    leaguePayload=await getFotmobJSON(FOTMOB_ROOT+"/leagues?id="+encodeURIComponent(leagueId)+"&season="+encodeURIComponent(label),6000);
  } catch(error) {
    console.warn("FotMob historical league:",slug,season,error.message||error);
  }
  const root=leaguePayload?.data||leaguePayload||{};
  const directGoals=normalizeFotmobPlayerRows(root,"goals");
  const directAssists=normalizeFotmobPlayerRows(root,"assists");
  const seasons=Array.isArray(root.seasons)?root.seasons:[];
  const keys=new Set([normalize(label),normalize(String(season))]);
  const selected=seasons.find(item=>keys.has(normalize(item?.name||""))||keys.has(normalize(item?.id||"")));
  const seasonId=selected?.id||label;
  const seasonCandidates=Array.from(new Set([String(seasonId),label]));
  const requests=[];
  for(const seasonValue of seasonCandidates){
    for(const [stat,statId] of [["goals","goals"],["assists","goal_assist"]]){
      const url=FOTMOB_ROOT+"/leagueseasondeepstats?id="+encodeURIComponent(leagueId)+"&season="+encodeURIComponent(seasonValue)+"&type=players&stat="+encodeURIComponent(statId);
      requests.push({stat,url});
    }
  }
  const deep=await Promise.all(requests.map(async request=>{
    try{return {stat:request.stat,rows:normalizeFotmobPlayerRows(await getFotmobJSON(request.url,5500),request.stat)};}
    catch(error){return {stat:request.stat,rows:[],error:error.message||"failed"};}
  }));
  let goals=directGoals,assists=directAssists;
  for(const item of deep){
    if(item.stat==="goals"&&item.rows.length>goals.length)goals=item.rows;
    if(item.stat==="assists"&&item.rows.length>assists.length)assists=item.rows;
  }
  return {goals,assists,source:"FotMob historical players"};
}

const referenceCache = new Map();

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function numberValue(value) {
  const candidate =
    value?.value ??
    value?.total ??
    value?.displayValue ??
    value?.displayValueText ??
    value;

  if (candidate === null || candidate === undefined || candidate === "") {
    return null;
  }

  const match = String(candidate).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

async function getJSON(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.espn.com/"
      },
      signal: controller.signal
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`ESPN HTTP ${response.status}: ${url}`);
    }

    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`ESPN returned invalid JSON: ${url}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function resolveEntity(entity) {
  if (!entity) return {};

  const reference = typeof entity === "string" ? entity : entity.$ref;
  if (!reference) return typeof entity === "object" ? entity : {};

  const url = String(reference)
    .replace(/^http:\/\//i, "https://")
    .replace("sports.core.api.espn.pvt", "sports.core.api.espn.com");

  if (!referenceCache.has(url)) {
    const request = getJSON(url, 5000).catch(error => {
      referenceCache.delete(url);
      throw error;
    });
    referenceCache.set(url, request);
  }

  try {
    return await referenceCache.get(url);
  } catch (error) {
    // Keep any usable fields already present on the object if a linked
    // ESPN resource cannot be loaded.
    if (typeof entity === "object") return entity;
    throw error;
  }
}

async function collectionItems(collection) {
  let value = await resolveEntity(collection);

  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  for (const key of ["items", "leaders", "entries", "results", "athletes"]) {
    if (value[key] === undefined) continue;
    const nested = await resolveEntity(value[key]);

    if (Array.isArray(nested)) return nested;
    if (Array.isArray(nested?.items)) return nested.items;
    if (Array.isArray(nested?.leaders)) return nested.leaders;
    if (Array.isArray(nested?.entries)) return nested.entries;
  }

  return [];
}

async function findCategories(input, depth = 0, visited = new Set()) {
  if (!input || depth > 8) return [];

  const node = await resolveEntity(input);
  if (!node || typeof node !== "object") return [];
  if (visited.has(node)) return [];
  visited.add(node);

  if (Array.isArray(node)) {
    const all = [];
    for (const item of node) {
      const found = await findCategories(item, depth + 1, visited);
      all.push(...found);
    }
    return all;
  }

  // ESPN may return categories directly or inside a paged items collection.
  if (node.categories !== undefined) {
    const items = await collectionItems(node.categories);
    if (items.length) {
      const resolved = await Promise.all(items.map(async item => {
        try { return await resolveEntity(item); }
        catch { return item && typeof item === "object" ? item : null; }
      }));
      return resolved.filter(Boolean);
    }
    const nested = await findCategories(node.categories, depth + 1, visited);
    if (nested.length) return nested;
  }

  if (node.leaders !== undefined) {
    let leaders;
    try { leaders = await resolveEntity(node.leaders); }
    catch { leaders = node.leaders; }

    if (leaders?.categories !== undefined) {
      const items = await collectionItems(leaders.categories);
      if (items.length) {
        const resolved = await Promise.all(items.map(async item => {
          try { return await resolveEntity(item); }
          catch { return item && typeof item === "object" ? item : null; }
        }));
        return resolved.filter(Boolean);
      }
    }

    if (Array.isArray(leaders)) {
      const categories = leaders.filter(item =>
        item && typeof item === "object" &&
        (item.name || item.displayName || item.$ref) &&
        (item.leaders !== undefined || item.items !== undefined ||
         item.entries !== undefined || item.categories !== undefined || item.$ref)
      );
      if (categories.length) {
        const resolved = await Promise.all(categories.map(async item => {
          try { return await resolveEntity(item); }
          catch { return item; }
        }));
        if (resolved.length) return resolved;
      }
    }

    const nested = await findCategories(leaders, depth + 1, visited);
    if (nested.length) return nested;
  }

  for (const key of ["items", "data", "results", "content", "records"]) {
    if (node[key] === undefined) continue;
    const nested = await findCategories(node[key], depth + 1, visited);
    if (nested.length) return nested;
  }

  return [];
}

function categoryMatches(category, stat) {
  const labels = [
    category?.name,
    category?.displayName,
    category?.shortDisplayName,
    category?.abbreviation,
    category?.description
  ].filter(Boolean).map(normalize);

  if (stat === "goals") {
    return labels.some(label => {
      if (["g", "gls", "goals", "goal"].includes(label)) return true;
      if (label.includes("assist") || label.includes("against")) return false;
      return label.includes("goal") || label.includes("but") || label === "scoring";
    });
  }

  return labels.some(label => {
    if (["a", "ast", "assist", "assists"].includes(label)) return true;
    return label.includes("assist") || label.includes("passdecisive");
  });
}

/* ESPN sometimes nests goals/assists inside a parent category
   such as "Offensive". Flatten category-only containers before matching,
   while leaving actual player rows to getCategoryRows(). */
async function flattenLeaderCategories(input, depth = 0, visited = new Set()) {
  if (!Array.isArray(input) || depth > 6) return [];

  const output = [];

  for (const item of input) {
    let category;
    try {
      category = await resolveEntity(item);
    } catch {
      continue;
    }

    if (!category || typeof category !== "object" || visited.has(category)) {
      continue;
    }
    visited.add(category);
    output.push(category);

    let children = Array.isArray(category.categories)
      ? category.categories
      : [];

    if (!children.length && category.leaders !== undefined) {
      try {
        const leaders = await resolveEntity(category.leaders);
        if (Array.isArray(leaders?.categories)) {
          children = leaders.categories;
        } else if (Array.isArray(leaders)) {
          children = leaders.filter(child =>
            child && typeof child === "object" &&
            (child.categories !== undefined || child.leaders !== undefined) &&
            (child.name || child.displayName || child.$ref)
          );
        }
      } catch {
        // Keep the parent category; other ESPN endpoints may still work.
      }
    }

    if (children.length) {
      output.push(...await flattenLeaderCategories(children, depth + 1, visited));
    }
  }

  return output;
}

async function getCategoryRows(category) {
  const resolved = await resolveEntity(category);
  for (const key of ["leaders", "items", "entries", "results", "athletes", "scorers", "statistics", "stats"]) {
    if (resolved?.[key] === undefined) continue;
    try {
      const rows = await collectionItems(resolved[key]);
      if (rows.length) return rows;
    } catch {
      // One category envelope can fail while another ESPN endpoint still works.
    }
  }
  return [];
}

async function normalizeLeaderRows(rows, stat) {
  const normalized = [];

  // ESPN usually returns these already ranked. Read extra entries to cover
  // linked rows which might not contain a complete athlete object.
  for (const rawRow of rows.slice(0, 20)) {
    let row;
    try {
      row = await resolveEntity(rawRow);
    } catch {
      continue;
    }

    let athlete;
    try {
      athlete = await resolveEntity(row?.athlete || row?.player || {});
    } catch {
      athlete = row?.athlete || row?.player || {};
    }

    const name =
      athlete?.displayName ||
      athlete?.fullName ||
      athlete?.shortName ||
      athlete?.name ||
      row?.displayName ||
      row?.name ||
      "";

    let total = numberValue(row?.value ?? row?.displayValue ?? row?.total);

    if (total === null) {
      let stats = row?.statistics || row?.stats;
      if (stats) {
        try {
          stats = await resolveEntity(stats);
        } catch {
          // Continue to the other common fields below.
        }
        if (Array.isArray(stats)) {
          const matchingStat = stats.find(item => categoryMatches(item, stat));
          total = numberValue(matchingStat?.value ?? matchingStat?.displayValue ?? matchingStat?.total);
        } else {
          total = numberValue(stats?.value ?? stats?.displayValue ?? stats?.total);
        }
      }
    }

    if (!name || total === null || total <= 0) continue;

    let rawTeam = row?.team || athlete?.team || {};
    try {
      rawTeam = await resolveEntity(rawTeam);
    } catch {
      // Player names and values are still useful if team metadata fails.
    }

    const id = String(athlete?.id || row?.athlete?.id || "");
    let photo =
      athlete?.headshot?.href ||
      athlete?.headshot?.url ||
      (typeof athlete?.headshot === "string" ? athlete.headshot : "") ||
      athlete?.images?.[0]?.href ||
      athlete?.photo ||
      athlete?.image ||
      "";

    if (!photo && id) {
      photo = `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png`;
    }

    const team = {
      name:
        rawTeam?.displayName ||
        rawTeam?.name ||
        rawTeam?.shortDisplayName ||
        "Équipe non renseignée",
      logo:
        rawTeam?.logos?.find(item => item?.href)?.href ||
        rawTeam?.logo ||
        ""
    };

    normalized.push({
      name,
      player_name: name,
      value: total,
      [stat]: total,
      player: {
        id,
        name,
        full_name: athlete?.fullName || name,
        photo,
        photo_url: photo,
        image: photo,
        logo: photo,
        team,
        [stat]: total
      },
      team
    });
  }

  return normalized
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}


function historicalStatAliases(stat) {
  return stat === "goals"
    ? ["goal", "goals", "totalgoal", "totalgoals", "goalscored", "goalsscored", "g", "gls"]
    : ["assist", "assists", "goalassist", "goalassists", "totalassist", "totalassists", "a", "ast"];
}
function historicalNestedStat(node, stat, depth = 0, visited = new Set()) {
  if (!node || typeof node !== "object" || depth > 9 || visited.has(node)) return null;
  visited.add(node);
  const aliases = historicalStatAliases(stat);
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = historicalNestedStat(child, stat, depth + 1, visited);
      if (found !== null) return found;
    }
    return null;
  }
  const label = normalize(node.name || node.displayName || node.shortDisplayName ||
    node.abbreviation || node.label || node.statName || node.key || "");
  if (aliases.includes(label)) {
    const value = numberValue(node.value ?? node.total ?? node.displayValue ?? node.displayValueText ?? node.count ?? node.stat);
    if (value !== null) return value;
  }
  for (const labelsKey of ["names", "displayNames", "labels", "abbreviations", "shortDisplayNames"]) {
    const labels = node[labelsKey];
    if (!Array.isArray(labels)) continue;
    const index = labels.findIndex(item => aliases.includes(normalize(item)));
    if (index < 0) continue;
    for (const valuesKey of ["totals", "values", "stats", "statistics"]) {
      const values = node[valuesKey];
      if (Array.isArray(values) && values[index] !== undefined) {
        const value = numberValue(values[index]);
        if (value !== null) return value;
      }
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (aliases.includes(normalize(key))) {
      const parsed = numberValue(value);
      if (parsed !== null) return parsed;
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (["athlete", "player", "team", "headshot", "images", "logos"].includes(key)) continue;
    if (value && typeof value === "object") {
      const found = historicalNestedStat(value, stat, depth + 1, visited);
      if (found !== null) return found;
    }
  }
  return null;
}
function historicalStatIndex(metadataCategory, stat) {
  if (!metadataCategory || typeof metadataCategory !== "object") return -1;
  const aliases = historicalStatAliases(stat);
  for (const field of [
    metadataCategory.names, metadataCategory.displayNames, metadataCategory.labels,
    metadataCategory.abbreviations, metadataCategory.shortDisplayNames
  ]) {
    if (!Array.isArray(field)) continue;
    const index = field.findIndex(value => aliases.includes(normalize(value)));
    if (index >= 0) return index;
  }
  return -1;
}
function historicalCategoryTotal(rowCategory, metaCategories, rowCategoryIndex, stat) {
  if (!rowCategory || typeof rowCategory !== "object") return null;
  const direct = historicalNestedStat(rowCategory, stat);
  if (direct !== null) return direct;
  const totals = rowCategory.totals || rowCategory.values || rowCategory.stats || [];
  if (!Array.isArray(totals)) return null;
  const rowName = normalize(rowCategory.name || rowCategory.displayName ||
    rowCategory.shortDisplayName || rowCategory.abbreviation || rowCategory.label || "");
  const metas = Array.isArray(metaCategories) ? metaCategories : [];
  let matches = metas.filter(meta => {
    const metaName = normalize(meta?.name || meta?.displayName ||
      meta?.shortDisplayName || meta?.abbreviation || meta?.label || "");
    return metaName && rowName && metaName === rowName;
  });
  if (!matches.length && metas[rowCategoryIndex]) matches = [metas[rowCategoryIndex]];
  if (!matches.length && metas.length === 1) matches = [metas[0]];
  for (const meta of matches) {
    const index = historicalStatIndex(meta, stat);
    if (index >= 0 && totals[index] !== undefined) {
      const value = numberValue(totals[index]);
      if (value !== null) return value;
    }
  }
  return null;
}
function historicalStatFromRow(payload, row, stat) {
  const direct = historicalNestedStat(row, stat);
  if (direct !== null) return direct;
  const meta = Array.isArray(payload?.categories) ? payload.categories : [];
  const rowCategories = Array.isArray(row?.categories) ? row.categories : [];
  for (let index = 0; index < rowCategories.length; index++) {
    const value = historicalCategoryTotal(rowCategories[index], meta, index, stat);
    if (value !== null) return value;
  }
  const rowStats = Array.isArray(row?.statistics) ? row.statistics : Array.isArray(row?.stats) ? row.stats : [];
  for (let index = 0; index < rowStats.length; index++) {
    const value = historicalCategoryTotal(rowStats[index], meta, index, stat);
    if (value !== null) return value;
  }
  return null;
}
function historicalAthleteRows(payload) {
  const candidates = [
    payload?.athletes?.items, payload?.athletes, payload?.items, payload?.results,
    payload?.data?.athletes?.items, payload?.data?.athletes, payload?.data?.items,
    payload?.data?.results, payload?.data
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.athletes)) return value.athletes;
    if (Array.isArray(value?.results)) return value.results;
  }
  return [];
}
function normalizeHistoricalAthletes(payload, stat) {
  const results = [];
  for (const row of historicalAthleteRows(payload)) {
    if (!row || typeof row !== "object") continue;
    const athlete = row.athlete || row.player || row;
    const name = athlete?.displayName || athlete?.fullName || athlete?.shortName ||
      athlete?.name || row?.displayName || row?.name || "";
    if (!name) continue;
    let total = historicalStatFromRow(payload, row, stat);
    if (total === null) total = numberValue(row?.value ?? row?.displayValue ?? row?.total);
    if (total === null || total <= 0) continue;
    const rawTeam = row.team || athlete.team || {};
    const team = {
      name: rawTeam.displayName || rawTeam.name || rawTeam.shortDisplayName ||
        athlete.teamName || athlete.teamShortName || "Équipe non renseignée",
      logo: rawTeam?.logos?.find(item => item?.href)?.href || rawTeam.logo || rawTeam.logoUrl || ""
    };
    const id = String(athlete.id || row.athleteId || row.playerId || "");
    const photo = athlete?.headshot?.href || athlete?.headshot?.url ||
      (typeof athlete?.headshot === "string" ? athlete.headshot : "") ||
      athlete?.photo || athlete?.image ||
      (id ? "https://a.espncdn.com/i/headshots/soccer/players/full/" + id + ".png" : "");
    results.push({
      name: name, player_name: name, value: total, [stat]: total,
      player: {
        id: id, name: name, full_name: athlete.fullName || name,
        photo: photo, photo_url: photo, image: photo, logo: photo, team: team, [stat]: total
      },
      team: team
    });
  }
  return results.sort((a, b) => b.value - a.value).slice(0, 5);
}

async function fetchHistoricalByAthlete(league, season) {
  const code = encodeURIComponent(league);
  const requests = [];
  for (const host of ["https://site.web.api.espn.com", "https://site.api.espn.com"]) {
    for (const [stat, sortKey] of [["goals","offensive.goals"],["assists","offensive.assists"]]) {
      const url = host + "/apis/common/v3/sports/soccer/" + code +
        "/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=false" +
        "&limit=50&sort=" + encodeURIComponent(sortKey + ":desc") +
        "&category=offensive&season=" + season + "&seasontype=2&page=1";
      requests.push({stat,url});
    }
  }
  const rows = await Promise.all(requests.map(async request => {
    try {
      const payload = await getJSON(request.url, 5000);
      return {stat:request.stat, rows:normalizeHistoricalAthletes(payload,request.stat)};
    } catch (error) {
      return {stat:request.stat,rows:[],error:error.message || "request failed"};
    }
  }));
  const result = {goals:[],assists:[],diagnostics:[]};
  for (const item of rows) {
    if (item.stat === "goals" && item.rows.length > result.goals.length) result.goals = item.rows;
    if (item.stat === "assists" && item.rows.length > result.assists.length) result.assists = item.rows;
    if (item.error) result.diagnostics.push(item.error);
  }
  return result;
}

async function fetchLegacySeasonLeaders(league, season) {
  const code=encodeURIComponent(league);
  const siteV2=ESPN_SITE.replace("/apis/site/v2","/apis/v2");
  const urls=[
    ESPN_CORE+"/"+code+"/seasons/"+season+"/types/2/leaders?limit=100&lang=en&region=us",
    ESPN_CORE+"/"+code+"/seasons/"+season+"/leaders?limit=100&lang=en&region=us",
    siteV2+"/"+code+"/leaders?season="+season+"&limit=100&lang=en&region=us",
    ESPN_SITE+"/"+code+"/leaders?season="+season+"&limit=100&lang=en&region=us"
  ];
  const responses=await Promise.all(urls.map(async url=>{
    try{return {url,payload:await getJSON(url,5000)};}
    catch(error){return {url,error};}
  }));
  let goals=[],assists=[];
  const diagnostics=[];
  for(const result of responses){
    if(!result.payload){diagnostics.push((result.error?.message||"failed").slice(0,150));continue;}
    try{
      const raw=await findCategories(result.payload);
      const categories=await flattenLeaderCategories(raw);
      for(const category of categories){
        const wantsGoals=!goals.length&&categoryMatches(category,"goals");
        const wantsAssists=!assists.length&&categoryMatches(category,"assists");
        if(!wantsGoals&&!wantsAssists)continue;
        try{
          const rows=await getCategoryRows(category);
          if(!rows.length)continue;
          if(wantsGoals){const normalized=await normalizeLeaderRows(rows,"goals");if(normalized.length)goals=normalized;}
          if(wantsAssists){const normalized=await normalizeLeaderRows(rows,"assists");if(normalized.length)assists=normalized;}
        }catch(error){diagnostics.push((error.message||"category failed").slice(0,150));}
        if(goals.length&&assists.length)break;
      }
    }catch(error){diagnostics.push((error.message||"parse failed").slice(0,150));}
    if(goals.length&&assists.length)break;
  }
  return {goals,assists,source:"ESPN seasonal leaders fallback",diagnostics};
}

function chooseHistoricalLeaderRows(...lists) {
  return lists.reduce((best,current)=>Array.isArray(current)&&current.length>best.length?current:best,[]);
}

async function fetchSeasonLeaders(league, season, competitionSlug) {
  const results=await Promise.allSettled([
    fetchHistoricalByAthlete(league,season),
    fetchLegacySeasonLeaders(league,season),
    fetchFotmobSeasonLeaders(competitionSlug,season)
  ]);
  const modern=results[0].status==="fulfilled"?results[0].value:{goals:[],assists:[],diagnostics:[]};
  const legacy=results[1].status==="fulfilled"?results[1].value:{goals:[],assists:[],diagnostics:[]};
  const fotmob=results[2].status==="fulfilled"?results[2].value:{goals:[],assists:[],diagnostics:[]};
  const goals=chooseHistoricalLeaderRows(modern.goals,legacy.goals,fotmob.goals);
  const assists=chooseHistoricalLeaderRows(modern.assists,legacy.assists,fotmob.assists);
  if(goals.length||assists.length){
    const source=[
      modern.goals.length||modern.assists.length?"ESPN by-athlete":"",
      legacy.goals.length||legacy.assists.length?"ESPN seasonal leaders":"",
      fotmob.goals.length||fotmob.assists.length?"FotMob":""
    ].filter(Boolean).join(" + ");
    return {goals,assists,source};
  }
  const diagnostics=[...(modern.diagnostics||[]),...(legacy.diagnostics||[]),...(fotmob.diagnostics||[])];
  throw new Error("Aucune statistique historique exploitable pour "+league+", saison "+season+
    (diagnostics.length?". "+diagnostics.slice(0,4).join(" | "):""));
}

module.exports =

function normalizeFotmobStandingTableRows(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((row,index)=>{
    const scoreText=String(row?.scoresStr||row?.scoreStr||"");
    const scoreMatch=scoreText.match(/(-?\d+)\s*[-:]\s*(-?\d+)/);
    const goalsFor=scoreMatch?Number(scoreMatch[1]):null;
    const goalsAgainst=scoreMatch?Number(scoreMatch[2]):null;
    const gd=numberValue(row?.goalConDiff??row?.goalDifference??row?.gd) ??
      (goalsFor!==null&&goalsAgainst!==null?goalsFor-goalsAgainst:null);
    const teamId=String(row?.id||row?.teamId||"");
    const logo=row?.logo||row?.teamLogo||row?.image||
      (teamId?"https://images.fotmob.com/image_resources/logo/teamlogo/"+encodeURIComponent(teamId)+".png":"");
    const teamName=row?.name||row?.teamName||row?.team?.name||"";
    if(!teamName)return null;
    const position=numberValue(row?.idx??row?.position??row?.rank) ?? index+1;
    const played=numberValue(row?.played??row?.matches);
    const wins=numberValue(row?.wins);
    const draws=numberValue(row?.draws);
    const losses=numberValue(row?.losses);
    const points=numberValue(row?.pts??row?.points);
    return {
      position,
      team:{id:teamId,name:teamName,logo},
      ...(played!==null?{played}:{}),
      ...(wins!==null?{wins}:{}),
      ...(draws!==null?{draws}:{}),
      ...(losses!==null?{losses}:{}),
      ...(goalsFor!==null?{goals_for:goalsFor}:{}),
      ...(goalsAgainst!==null?{goals_against:goalsAgainst}:{}),
      ...(gd!==null?{goal_difference:gd}:{}),
      ...(points!==null?{points}:{}),
      ...(row?.form?{form:row.form}:{})
    };
  }).filter(Boolean).sort((x,y)=>x.position-y.position);
}

function normalizeFotmobStandingGroups(payload) {
  const root=payload?.data||payload||{};
  const tables=Array.isArray(root?.table)?root.table:
    Array.isArray(root?.tables)?root.tables:[];
  const groups=[];
  tables.forEach((entry,tableIndex)=>{
    const data=entry?.data||entry;
    const direct=data?.table?.all||data?.table?.overall||data?.all;
    if(Array.isArray(direct)&&direct.length){
      const rows=normalizeFotmobStandingTableRows(direct);
      if(rows.length)groups.push({
        name:data?.table?.name||data?.leagueName||data?.name||"",
        rows
      });
    }

    const subtables=Array.isArray(data?.tables)?data.tables:[];
    subtables.forEach((sub,subIndex)=>{
      const rowsData=sub?.table?.all||sub?.table?.overall||sub?.all||
        sub?.data?.table?.all||[];
      const rows=normalizeFotmobStandingTableRows(rowsData);
      if(!rows.length)return;
      groups.push({
        name:sub?.leagueName||sub?.name||sub?.title||sub?.table?.name||
          ("Groupe "+String.fromCharCode(65+subIndex)),
        rows
      });
    });

    if(!direct&&!subtables.length){
      const nested=data?.data?.table?.all||data?.standings?.all||[];
      const rows=normalizeFotmobStandingTableRows(nested);
      if(rows.length)groups.push({name:data?.leagueName||data?.name||"",rows});
    }
  });

  // Some responses use a table object directly instead of an array.
  if(!groups.length){
    const direct=root?.table?.all||root?.standings?.all;
    const rows=normalizeFotmobStandingTableRows(direct);
    if(rows.length)groups.push({name:root?.details?.name||root?.leagueName||"",rows});
  }
  const seen=new Set();
  return groups.filter(group=>{
    const signature=group.name+"|"+group.rows.map(row=>row.team.name+":"+row.position).join(",");
    if(seen.has(signature))return false;
    seen.add(signature);
    return true;
  });
}

async function fetchFotmobSeasonStandings(competitionSlug, season) {
  const leagueId=await getFotmobLeagueId(competitionSlug);
  if(!leagueId)return [];
  const label=fotmobSeasonLabel(competitionSlug,season);
  const candidates=Array.from(new Set([
    label,
    String(season),
    String(season)+"/"+String(Number(season)+1),
    String(season)+"/"+String(Number(season)+1)
  ]));
  for(const seasonValue of candidates){
    try{
      const payload=await getFotmobJSON(
        FOTMOB_ROOT+"/leagues?id="+encodeURIComponent(leagueId)+"&season="+encodeURIComponent(seasonValue),
        6500
      );
      const groups=normalizeFotmobStandingGroups(payload);
      if(groups.length)return sortFotmobStandingGroups(groups);
    }catch(error){
      console.warn("FotMob historical standings:",competitionSlug,seasonValue,error.message||error);
    }
  }
  return [];
}

function sortFotmobStandingGroups(groups) {
  return (Array.isArray(groups)?groups:[]).map(group=>({
    ...group,
    rows:Array.isArray(group.rows)?group.rows.slice().sort((a,b)=>
      Number(a.position||999)-Number(b.position||999)
    ):[]
  })).filter(group=>group.rows.length).sort((a,b)=>{
    const parse=name=>{
      const label=String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
      const letter=label.match(/(?:group|groupe)\s+([a-z])\b/);
      if(letter)return letter[1].charCodeAt(0);
      const number=label.match(/(?:group|groupe)\s+(\d+)\b/);
      if(number)return Number(number[1]);
      return 999;
    };
    return parse(a.name)-parse(b.name)||String(a.name||"").localeCompare(String(b.name||""));
  });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const competition = String(
    req.query?.competition ||
    req.query?.historicalPlayers ||
    req.query?.slug ||
    ""
  ).trim();
  const season = Number(req.query?.season);
  const league = LEAGUES[competition];

  if (!league || !Number.isInteger(season) || season < 1900 || season > 2200) {
    return res.status(400).json({
      error: "invalid_parameters",
      competition,
      season
    });
  }

  try {
    if (String(req.query?.type || "").toLowerCase() === "standings") {
      const groups = await fetchFotmobSeasonStandings(competition, season);
      if (!groups.length) {
        return res.status(404).json({
          error: "historical_standings_unavailable",
          competition,
          season,
          details: "FotMob ne fournit pas de classement historique exploitable pour cette saison."
        });
      }
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({
        provider: "FotMob historical standings",
        competition,
        season,
        data: { groups }
      });
    }

    const { goals, assists, source } = await fetchSeasonLeaders(league, season, competition);

    if (!goals.length && !assists.length) {
      throw new Error(
        `ESPN seasonal leaders contain no usable goals/assists for ${league}, season ${season}.`
      );
    }

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({
      provider: "ESPN/FotMob historical leaders",
      source: source || "Historical statistics provider",
      competition,
      league,
      season,
      data: { goals, assists }
    });
  } catch (error) {
    console.error("BakhiraFoot historical players:", error?.message || error);
    return res.status(502).json({
      error: "historical_players_failed",
      details: error?.message || "Erreur inconnue"
    });
  }
};
