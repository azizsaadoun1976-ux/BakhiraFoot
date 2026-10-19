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
    const request = getJSON(url).catch(error => {
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
  for (const key of ["leaders", "items", "entries", "results", "athletes"]) {
    if (resolved?.[key] === undefined) continue;
    const rows = await collectionItems(resolved[key]);
    if (rows.length) return rows;
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
        total = numberValue(stats?.value ?? stats?.displayValue ?? stats?.total);
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

async function fetchSeasonLeaders(league, season) {
  const urls = [
    `${ESPN_CORE}/${encodeURIComponent(league)}/seasons/${season}/leaders?limit=100&lang=en&region=us`,
    `${ESPN_CORE}/${encodeURIComponent(league)}/seasons/${season}/types/2/leaders?limit=100&lang=en&region=us`,
    `${ESPN_SITE}/${encodeURIComponent(league)}/leaders?season=${season}&limit=100&lang=en&region=us`
  ];

  let lastError = null;

  for (const url of urls) {
    try {
      const payload = await getJSON(url);
      const foundCategories = await findCategories(payload);
      const categories = await flattenLeaderCategories(foundCategories);
      if (categories.some(category =>
        categoryMatches(category, "goals") ||
        categoryMatches(category, "assists")
      )) {
        return { categories, source: url };
      }
      lastError = new Error(`No leader categories in ESPN response: ${url}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`ESPN returned no leader categories for ${league}, season ${season}.`);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

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
    const { categories, source } = await fetchSeasonLeaders(league, season);

    const goalsCategory = categories.find(category => categoryMatches(category, "goals"));
    const assistsCategory = categories.find(category => categoryMatches(category, "assists"));

    const [goalRows, assistRows] = await Promise.all([
      goalsCategory ? getCategoryRows(goalsCategory) : Promise.resolve([]),
      assistsCategory ? getCategoryRows(assistsCategory) : Promise.resolve([])
    ]);

    const [goals, assists] = await Promise.all([
      normalizeLeaderRows(goalRows, "goals"),
      normalizeLeaderRows(assistRows, "assists")
    ]);

    if (!goals.length && !assists.length) {
      const available = categories.map(category =>
        category?.displayName || category?.name || category?.abbreviation || "?"
      ).join(", ");
      throw new Error(
        `ESPN seasonal leaders contain no usable goals/assists for ${league}, season ${season}. Categories: ${available || "none"}.`
      );
    }

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
