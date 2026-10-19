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
  const label = normalize(node.name || node.displayName || node.shortDisplayName || node.abbreviation || node.label || node.statName || node.key || "");
  if (aliases.includes(label)) {
    const n = numberValue(node.value ?? node.total ?? node.displayValue ?? node.displayValueText ?? node.count ?? node.stat);
    if (n !== null) return n;
  }
  for (const labelsKey of ["names", "labels", "abbreviations"]) {
    const labels = node[labelsKey];
    if (!Array.isArray(labels)) continue;
    const index = labels.findIndex(item => aliases.includes(normalize(item)));
    if (index < 0) continue;
    for (const valuesKey of ["totals", "values", "stats", "statistics"]) {
      const values = node[valuesKey];
      if (Array.isArray(values) && values[index] !== undefined) {
        const n = numberValue(values[index]);
        if (n !== null) return n;
      }
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (aliases.includes(normalize(key))) {
      const n = numberValue(value);
      if (n !== null) return n;
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
    const name = athlete?.displayName || athlete?.fullName || athlete?.shortName || athlete?.name || row?.displayName || row?.name || "";
    if (!name) continue;
    let total = historicalNestedStat(row, stat);
    if (total === null) total = numberValue(row?.value ?? row?.displayValue ?? row?.total);
    if (total === null || total <= 0) continue;
    const rawTeam = row.team || athlete.team || {};
    const team = {
      name: rawTeam.displayName || rawTeam.name || rawTeam.shortDisplayName || "Équipe non renseignée",
      logo: rawTeam?.logos?.find(item => item?.href)?.href || rawTeam.logo || rawTeam.logoUrl || ""
    };
    const id = String(athlete.id || row.athleteId || row.playerId || "");
    const photo = athlete?.headshot?.href || athlete?.headshot?.url ||
      (typeof athlete?.headshot === "string" ? athlete.headshot : "") ||
      athlete?.photo || athlete?.image ||
      (id ? "https://a.espncdn.com/i/headshots/soccer/players/full/" + id + ".png" : "");
    results.push({
      name, player_name:name, value:total, [stat]:total,
      player:{id,name,full_name:athlete.fullName || name,photo,photo_url:photo,image:photo,logo:photo,team,[stat]:total},
      team
    });
  }
  return results.sort((a,b)=>b.value-a.value).slice(0,5);
}

async function fetchHistoricalByAthlete(league, season) {
  const code = encodeURIComponent(league);
  const requests = [];
  for (const host of ["https://site.web.api.espn.com", "https://site.api.espn.com"]) {
    for (const [stat, sortKey] of [["goals","offensive.goals"],["assists","offensive.assists"]]) {
      const url = host + "/apis/common/v3/sports/soccer/" + code +
        "/statistics/byathlete?category=offensive&season=" + season +
        "&seasontype=2&limit=50&page=1&sort=" + encodeURIComponent(sortKey + ":desc") +
        "&region=us&lang=en";
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

async function fetchSeasonLeaders(league, season) {
  // ESPN's newer season-filtered athlete leaderboard is the primary source.
  try {
    const modern = await fetchHistoricalByAthlete(league, season);
    if (modern.goals.length || modern.assists.length) {
      return { goals: modern.goals, assists: modern.assists, source: "ESPN by-athlete" };
    }
  } catch (error) {
    console.warn("ESPN by-athlete fallback:", error?.message || error);
  }

  const code = encodeURIComponent(league);
  const siteV2 = ESPN_SITE.replace("/apis/site/v2", "/apis/v2");
  const urls = [
    // ESPN Core seasonal endpoints first. Site endpoints are fallbacks.
    ESPN_CORE + "/" + code + "/seasons/" + season + "/types/2/leaders?limit=100&lang=en&region=us",
    ESPN_CORE + "/" + code + "/seasons/" + season + "/leaders?limit=100&lang=en&region=us",
    siteV2 + "/" + code + "/leaders?season=" + season + "&limit=100&lang=en&region=us",
    ESPN_SITE + "/" + code + "/leaders?season=" + season + "&limit=100&lang=en&region=us"
  ];

  let goals = [];
  let assists = [];
  let lastError = null;
  const diagnostics = [];

  for (const url of urls) {
    try {
      const payload = await getJSON(url, 8000);
      const rawCategories = await findCategories(payload);
      const categories = await flattenLeaderCategories(rawCategories);

      // A first category named "Goals" may be an empty parent/container.
      // Continue until a matching category actually contains normalizable player rows.
      for (const category of categories) {
        const wantsGoals = !goals.length && categoryMatches(category, "goals");
        const wantsAssists = !assists.length && categoryMatches(category, "assists");
        if (!wantsGoals && !wantsAssists) continue;

        try {
          const rows = await getCategoryRows(category);
          if (!rows.length) {
            diagnostics.push((category.displayName || category.name || category.abbreviation || "category") + ": empty");
            continue;
          }

          if (wantsGoals) {
            const normalized = await normalizeLeaderRows(rows, "goals");
            if (normalized.length) goals = normalized;
            else diagnostics.push((category.displayName || category.name || "goals") + ": no usable player rows");
          }
          if (wantsAssists) {
            const normalized = await normalizeLeaderRows(rows, "assists");
            if (normalized.length) assists = normalized;
            else diagnostics.push((category.displayName || category.name || "assists") + ": no usable player rows");
          }
        } catch (categoryError) {
          diagnostics.push((category.displayName || category.name || "category") + ": " + (categoryError.message || "failed"));
        }

        if (goals.length && assists.length) break;
      }

      if (goals.length && assists.length) {
        return { goals, assists, source: url };
      }
      lastError = new Error("Endpoint returned no usable rows for both stats: " + url);
    } catch (error) {
      lastError = error;
      diagnostics.push(url + ": " + (error.message || "failed"));
    }
  }

  // Return whichever real list exists rather than dropping it because the other category is missing.
  if (goals.length || assists.length) {
    return { goals, assists, source: "ESPN seasonal leaders (partial)" };
  }

  throw new Error(
    "ESPN returned no usable historical scorers or assists for " + league +
    ", season " + season +
    (diagnostics.length ? ". " + diagnostics.slice(0, 6).join(" | ") : "") +
    (lastError?.message ? ". " + lastError.message : "")
  );
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
    const { goals, assists, source } = await fetchSeasonLeaders(league, season);

    if (!goals.length && !assists.length) {
      throw new Error(
        `ESPN seasonal leaders contain no usable goals/assists for ${league}, season ${season}.`
      );
    }

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({
      provider: "ESPN seasonal leaders",
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
