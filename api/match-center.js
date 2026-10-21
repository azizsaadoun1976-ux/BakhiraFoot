"use strict";

const SOFA_HOSTS = [
  "https://www.sofascore.com/api/v1",
  "https://api.sofascore.com/api/v1"
];

const ESPN_CODES = [
  [/egyptian premier/i, "egy.1"],
  [/premier league|english premier/i, "eng.1"],
  [/championship/i, "eng.2"],
  [/la liga|spanish/i, "esp.1"],
  [/serie a|italian/i, "ita.1"],
  [/serie b/i, "ita.2"],
  [/bundesliga/i, "ger.1"],
  [/ligue 1|french/i, "fra.1"],
  [/eredivisie/i, "ned.1"],
  [/champions league/i, "uefa.champions"],
  [/europa league/i, "uefa.europa"],
  [/conference league/i, "uefa.europa.conf"],
  [/botola|moroccan/i, "mar.1"],
  [/world cup/i, "fifa.world"],
  [/european championship|uefa euro/i, "uefa.euro"],
  [/africa cup of nations|afcon/i, "caf.nations"],
  [/asian cup/i, "afc.asian.cup"],
  [/copa america/i, "conmebol.america"],
  [/nations league/i, "uefa.nations"],
  [/brazilian|brasileirao/i, "bra.1"],
  [/saudi/i, "ksa.1"],
  [/primeira liga|portuguese/i, "por.1"],
  [/turkish|super lig/i, "tur.1"],
  [/belgian pro/i, "bel.1"],
  [/scottish premiership/i, "sco.1"],
  [/argentine|primera division/i, "arg.1"]
];

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}

async function fetchJSON(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const host = new URL(url).hostname.toLowerCase();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; BakhiraFootMatchCenter/1.0)",
        ...(host.endsWith("sofascore.com")
          ? { Referer: "https://www.sofascore.com/", Origin: "https://www.sofascore.com" }
          : {})
      },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function norm(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ")
    .replace(/\b(football club|soccer club|fc|cf|afc|sc|cfc|club)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function sameTeam(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const xt = x.split(" ").filter(t => t.length > 2);
  const yt = y.split(" ").filter(t => t.length > 2);
  const common = xt.filter(t => yt.includes(t));
  return common.length >= 2 && common.length / Math.min(xt.length || 1, yt.length || 1) >= 0.8;
}

function findSofaTeam(payload, desiredName) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const candidates = results
    .filter(item => !item?.type || String(item.type).toLowerCase() === "team")
    .map(item => item?.entity || item?.team || item)
    .filter(item => item && item.id != null && item.name);
  return candidates.find(item => norm(item.name) === norm(desiredName)) ||
    candidates.find(item => sameTeam(item.name, desiredName)) || null;
}

async function sofaJSON(path) {
  let lastError;
  for (const host of SOFA_HOSTS) {
    try { return await fetchJSON(host + path, 6500); }
    catch (error) { lastError = error; }
  }
  throw lastError || new Error("SofaScore unavailable");
}

async function findSofaTeam(name) {
  const payload = await sofaJSON("/search/all?q=" + encodeURIComponent(name));
  return findSofaTeam(payload, name);
}

function eventTime(event) {
  const timestamp = Number(event?.startTimestamp || event?.time?.timestamp || 0);
  if (timestamp) return new Date(timestamp * 1000).toISOString();
  const value = event?.startDate || event?.date || "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function eventScore(event) {
  const home = event?.homeScore || {};
  const away = event?.awayScore || {};
  const h = home.current ?? home.display ?? home.normaltime ?? event?.homeScore;
  const a = away.current ?? away.display ?? away.normaltime ?? event?.awayScore;
  return h == null || a == null ? "—" : String(h) + " - " + String(a);
}

async function loadHeadToHead(homeName, awayName) {
  const [homeSearch, awaySearch] = await Promise.allSettled([
    findSofaTeam(homeName), findSofaTeam(awayName)
  ]);
  const homeTeam = homeSearch.status === "fulfilled" ? homeSearch.value : null;
  const awayTeam = awaySearch.status === "fulfilled" ? awaySearch.value : null;
  if (!homeTeam || !awayTeam) return [];

  const [homeEvents, awayEvents] = await Promise.allSettled([
    sofaJSON("/team/" + encodeURIComponent(homeTeam.id) + "/events/last/0"),
    sofaJSON("/team/" + encodeURIComponent(awayTeam.id) + "/events/last/0")
  ]);
  const all = [];
  for (const result of [homeEvents, awayEvents]) {
    if (result.status !== "fulfilled") continue;
    const list = result.value?.events || result.value?.events?.events || [];
    if (Array.isArray(list)) all.push(...list);
  }

  const unique = new Map();
  for (const event of all) {
    const h = event?.homeTeam?.name || "";
    const a = event?.awayTeam?.name || "";
    if (!(sameTeam(h, homeName) && sameTeam(a, awayName)) &&
        !(sameTeam(h, awayName) && sameTeam(a, homeName))) continue;
    const key = String(event.id ?? [h, a, eventTime(event)].join("|"));
    unique.set(key, {
      id: key,
      date: eventTime(event),
      home: h,
      away: a,
      score: eventScore(event),
      competition: event?.tournament?.name || event?.uniqueTournament?.name || "",
      status: event?.status?.description || event?.status?.type || ""
    });
  }
  return [...unique.values()].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)).slice(0, 8);
}

function collectEntries(root) {
  const out = [];
  const seen = new Set();
  const queue = [root];
  while (queue.length && seen.size < 4000) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const value of node) if (value && typeof value === "object") queue.push(value);
      continue;
    }
    if (Array.isArray(node.entries)) {
      for (const entry of node.entries) {
        if (entry?.team && (Array.isArray(entry.stats) || Array.isArray(entry.statistics))) out.push(entry);
      }
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }
  const unique = new Map();
  for (const entry of out) {
    const teamName = entry?.team?.displayName || entry?.team?.name || entry?.team?.shortDisplayName;
    if (!teamName) continue;
    unique.set(String(entry.team.id ?? teamName), entry);
  }
  return [...unique.values()];
}

function statValue(entry, aliases) {
  const stats = Array.isArray(entry?.stats) ? entry.stats : Array.isArray(entry?.statistics) ? entry.statistics : [];
  for (const stat of stats) {
    const name = String(stat?.name || stat?.abbreviation || stat?.shortDisplayName || stat?.displayName || "").toLowerCase();
    if (!aliases.some(alias => name === alias || name.includes(alias))) continue;
    const value = stat?.displayValue ?? stat?.value ?? stat?.display ?? stat?.description;
    if (value !== null && value !== undefined && value !== "") return String(value);
  }
  return "—";
}

async function loadStandings(competition, date) {
  const codeEntry = ESPN_CODES.find(([pattern]) => pattern.test(competition));
  if (!codeEntry) return { league: competition, rows: [] };
  const rawDate = String(date || "");
  const parsedYear = Number(rawDate.slice(0, 4));
  const month = Number(rawDate.slice(5, 7));
  const calendarCompetition = /world cup|european championship|euro|africa cup of nations|afcon|asian cup|copa america|nations league/i.test(competition);
  const currentYear = Number.isInteger(parsedYear) && parsedYear >= 2000
    ? (calendarCompetition ? parsedYear : (month >= 7 ? parsedYear : parsedYear - 1))
    : new Date().getUTCFullYear();
  const urls = [
    "https://site.api.espn.com/apis/v2/sports/soccer/" + encodeURIComponent(codeEntry[1]) + "/standings?season=" + currentYear,
    "https://site.web.api.espn.com/apis/v2/sports/soccer/" + encodeURIComponent(codeEntry[1]) + "/standings?season=" + currentYear
  ];
  for (const url of urls) {
    try {
      const payload = await fetchJSON(url, 6500);
      const entries = collectEntries(payload);
      if (!entries.length) continue;
      return {
        league: competition,
        season: currentYear,
        rows: entries.map((entry, index) => ({
          rank: statValue(entry, ["rank", "playoffseed"]) === "—" ? String(index + 1) : statValue(entry, ["rank", "playoffseed"]),
          team: entry.team.displayName || entry.team.name || entry.team.shortDisplayName || "Équipe",
          logo: entry.team.logos?.[0]?.href || entry.team.logo || "",
          played: statValue(entry, ["gamesplayed", "played", "matchesplayed"]),
          won: statValue(entry, ["wins", "win"]),
          drawn: statValue(entry, ["ties", "draws", "draw"]),
          lost: statValue(entry, ["losses", "loss"]),
          points: statValue(entry, ["points", "pts"]),
          differential: statValue(entry, ["pointdifferential", "differential", "goal difference"])
        })).sort((a,b) => Number(a.rank) - Number(b.rank)).slice(0, 24)
      };
    } catch (_) {}
  }
  return { league: competition, rows: [] };
}

module.exports = async function matchCenter(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "method_not_allowed" });
  }
  const home = String(req.query?.home || "").trim().slice(0, 100);
  const away = String(req.query?.away || "").trim().slice(0, 100);
  const competition = String(req.query?.competition || "").trim().slice(0, 100);
  const date = String(req.query?.date || "").trim().slice(0, 30);
  if (!home || !away) return send(res, 400, { error: "home_and_away_required" });

  const [h2hResult, standingsResult] = await Promise.allSettled([
    loadHeadToHead(home, away),
    loadStandings(competition, date)
  ]);
  return send(res, 200, {
    headToHead: h2hResult.status === "fulfilled" ? h2hResult.value : [],
    standings: standingsResult.status === "fulfilled" ? standingsResult.value : { league: competition, rows: [] },
    availability: {
      headToHead: h2hResult.status === "fulfilled" && h2hResult.value.length > 0,
      standings: standingsResult.status === "fulfilled" && standingsResult.value.rows.length > 0
    }
  });
};
