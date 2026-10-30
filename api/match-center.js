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
  const cache = status === 200
    ? "public, s-maxage=180, stale-while-revalidate=600"
    : "no-store, max-age=0";
  res.setHeader("Cache-Control", cache);
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

function selectSofaTeam(payload, desiredName) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const candidates = results
    .filter(item => !item?.type || String(item.type).toLowerCase() === "team")
    .map(item => item?.entity || item?.team || item)
    .filter(item => item && item.id != null && item.name);
  return candidates.find(item => norm(item.name) === norm(desiredName)) ||
    candidates.find(item => sameTeam(item.name, desiredName)) || null;
}

async function sofaJSON(path) {
  const results = await Promise.allSettled(SOFA_HOSTS.map(host => fetchJSON(host + path, 1800)));
  for (const result of results) if (result.status === "fulfilled") return result.value;
  const last = results.find(result => result.status === "rejected");
  throw last?.reason || new Error("SofaScore unavailable");
}

async function findSofaTeam(name) {
  const payload = await sofaJSON("/search/all?q=" + encodeURIComponent(name));
  return selectSofaTeam(payload, name);
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
  if (!homeTeam || !awayTeam) {
    return { headToHead: [], homeRecent: [], awayRecent: [] };
  }

  const [homeEvents, awayEvents] = await Promise.allSettled([
    sofaJSON("/team/" + encodeURIComponent(homeTeam.id) + "/events/last/0"),
    sofaJSON("/team/" + encodeURIComponent(awayTeam.id) + "/events/last/0")
  ]);

  const eventsFrom = result => {
    if (result.status !== "fulfilled") return [];
    const list = result.value?.events || result.value?.events?.events || [];
    return Array.isArray(list) ? list : [];
  };
  const summarize = event => {
    const h = event?.homeTeam?.name || "";
    const a = event?.awayTeam?.name || "";
    return {
      id: String(event.id ?? [h, a, eventTime(event)].join("|")),
      date: eventTime(event),
      home: h,
      away: a,
      score: eventScore(event),
      competition: event?.tournament?.name || event?.tournament?.uniqueTournament?.name || event?.uniqueTournament?.name || "",
      status: event?.status?.description || event?.status?.type || ""
    };
  };
  const sortRecent = events => events
    .filter(event => event?.homeTeam?.name && event?.awayTeam?.name)
    .map(summarize)
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));

  const homeRaw = eventsFrom(homeEvents);
  const awayRaw = eventsFrom(awayEvents);
  const homeRecent = sortRecent(homeRaw).slice(0, 5);
  const awayRecent = sortRecent(awayRaw).slice(0, 5);

  const unique = new Map();
  for (const event of [...homeRaw, ...awayRaw]) {
    const h = event?.homeTeam?.name || "";
    const a = event?.awayTeam?.name || "";
    if (!(sameTeam(h, homeName) && sameTeam(a, awayName)) &&
        !(sameTeam(h, awayName) && sameTeam(a, homeName))) continue;
    const item = summarize(event);
    unique.set(item.id, item);
  }
  const headToHead = [...unique.values()]
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
    .slice(0, 8);

  return { headToHead, homeRecent, awayRecent };
}

function metadataText(value, depth = 0) {
  if (depth > 5 || value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return value.map(item => metadataText(item, depth + 1)).filter(Boolean).join(" · ");
  if (typeof value !== "object") return "";
  for (const key of ["name","displayName","display_name","fullName","full_name","shortName","short_name","label","title","channelName","channel_name","officialName","official_name","names","items","officials","broadcasters","channels","crew","person","value"]) {
    const candidate = value[key];
    if (candidate !== undefined && candidate !== null && candidate !== value) {
      const text = metadataText(candidate, depth + 1);
      if (text) return text;
    }
  }
  return "";
}

function findMetadataValue(root, aliases) {
  const targets = new Set(aliases.map(value => String(value).toLowerCase().replace(/[^a-z0-9]/g, "")));
  const queue = [{value:root,depth:0}];
  const seen = new Set();
  while (queue.length && seen.size < 1600) {
    const item = queue.shift();
    const node = item?.value;
    if (!node || typeof node !== "object" || seen.has(node) || item.depth > 6) continue;
    seen.add(node);
    if (Array.isArray(node)) {
      if (item.depth < 6) node.forEach(child => { if (child && typeof child === "object") queue.push({value:child,depth:item.depth+1}); });
      continue;
    }
    for (const [key,value] of Object.entries(node)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (targets.has(normalized)) {
        const text = metadataText(value);
        if (text && text.length < 180) return text;
      }
      if (value && typeof value === "object" && item.depth < 6) queue.push({value,depth:item.depth+1});
    }
  }
  return "";
}

function getESPNCode(competition) {
  const match = ESPN_CODES.find(([pattern]) => pattern.test(String(competition || "")));
  return match ? match[1] : "";
}

function dateStamp(value) {
  const parsed = Date.parse(String(value || ""));
  if (!Number.isFinite(parsed)) return new Date().toISOString().slice(0,10).replace(/-/g,"");
  const date = new Date(parsed);
  return date.getUTCFullYear().toString() +
    String(date.getUTCMonth()+1).padStart(2,"0") +
    String(date.getUTCDate()).padStart(2,"0");
}

function moveDateStamp(stamp, offset) {
  const year = Number(stamp.slice(0,4)), month = Number(stamp.slice(4,6)), day = Number(stamp.slice(6,8));
  const date = new Date(Date.UTC(year,month-1,day+offset));
  return date.getUTCFullYear().toString() + String(date.getUTCMonth()+1).padStart(2,"0") + String(date.getUTCDate()).padStart(2,"0");
}

function espnCompetitors(event) {
  const list = Array.isArray(event?.competitions)
    ? event.competitions.flatMap(competition => Array.isArray(competition?.competitors) ? competition.competitors : [])
    : Array.isArray(event?.competitors) ? event.competitors : [];
  const homeEntry = list.find(item => String(item?.homeAway || "").toLowerCase() === "home") || list[0];
  const awayEntry = list.find(item => String(item?.homeAway || "").toLowerCase() === "away") || list[1];
  const name = entry => String(entry?.team?.displayName || entry?.team?.name || entry?.displayName || entry?.name || "").trim();
  return {home:name(homeEntry),away:name(awayEntry),homeEntry,awayEntry};
}

function espnEventDate(event) {
  return event?.date || event?.competitions?.[0]?.date || event?.competitions?.[0]?.startDate || "";
}

function espnEventScore(event) {
  const teams = espnCompetitors(event);
  const score = entry => {
    const value = entry?.score;
    if (value && typeof value === "object") return value.displayValue ?? value.value ?? value.current ?? "—";
    return value ?? "—";
  };
  return String(score(teams.homeEntry)) + " - " + String(score(teams.awayEntry));
}

function espnSeriesEvents(summary, homeName, awayName) {
  const roots = [];
  const queue = [{value:summary,depth:0}];
  const seen = new Set();
  while (queue.length && seen.size < 2400) {
    const item = queue.shift();
    const node = item?.value;
    if (!node || typeof node !== "object" || seen.has(node) || item.depth > 7) continue;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const child of node) if (child && typeof child === "object") queue.push({value:child,depth:item.depth+1});
      continue;
    }
    for (const [key,value] of Object.entries(node)) {
      if (/(seasonseries|headtohead|head2head|previousmeetings|previousmatches|seriesgames)/i.test(key) && value && typeof value === "object") roots.push(value);
      if (value && typeof value === "object" && item.depth < 7) queue.push({value,depth:item.depth+1});
    }
  }
  const candidates = [];
  const visited = new Set();
  const addCandidate = (value,depth=0) => {
    if (!value || typeof value !== "object" || visited.has(value) || depth>6 || candidates.length>100) return;
    visited.add(value);
    if (Array.isArray(value)) { value.forEach(child => addCandidate(child,depth+1)); return; }
    const names = espnCompetitors(value);
    if (names.home && names.away &&
        ((sameTeam(names.home,homeName)&&sameTeam(names.away,awayName)) ||
         (sameTeam(names.home,awayName)&&sameTeam(names.away,homeName)))) {
      const date = espnEventDate(value);
      candidates.push({
        id:String(value.id || [names.home,names.away,date].join("|")),
        date:eventTime({date}),
        home:names.home,
        away:names.away,
        score:espnEventScore(value),
        competition:value?.league?.name || value?.competitions?.[0]?.name || "",
        status:value?.status?.type?.description || value?.status?.description || ""
      });
    }
    for (const child of Object.values(value)) if (child && typeof child === "object") addCandidate(child,depth+1);
  };
  roots.forEach(root => addCandidate(root));
  const unique = new Map();
  candidates.forEach(item=>unique.set(item.id,item));
  return [...unique.values()].sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0)).slice(0,8);
}

async function loadESPNMatchBundle(homeName, awayName, competition, requestedDate) {
  const league = getESPNCode(competition);
  if (!league || !homeName || !awayName) return {metadata:{},headToHead:[]};
  const stamp = dateStamp(requestedDate);
  const dates = [...new Set([moveDateStamp(stamp,-1),stamp,moveDateStamp(stamp,1)])];
  const scoreboardResults = await Promise.allSettled(dates.map(date =>
    fetchJSON("https://site.api.espn.com/apis/site/v2/sports/soccer/" +
      encodeURIComponent(league) + "/scoreboard?dates=" + date, 2400)
  ));
  const events = [];
  for (const result of scoreboardResults) {
    if (result.status === "fulfilled" && Array.isArray(result.value?.events)) events.push(...result.value.events);
  }
  const expectedTime = Date.parse(String(requestedDate || ""));
  const matches = events.filter(event => {
    const pair = espnCompetitors(event);
    return (sameTeam(pair.home,homeName)&&sameTeam(pair.away,awayName)) ||
      (sameTeam(pair.home,awayName)&&sameTeam(pair.away,homeName));
  }).map(event => {
    const time = Date.parse(espnEventDate(event) || "");
    return {event,delta:Number.isFinite(expectedTime)&&Number.isFinite(time)?Math.abs(expectedTime-time):Number.POSITIVE_INFINITY};
  }).filter(item => !Number.isFinite(item.delta) || item.delta <= 48*60*60*1000)
    .sort((a,b)=>a.delta-b.delta);
  const fixture = matches[0]?.event;
  if (!fixture?.id) return {metadata:{},headToHead:[]};

  let summary = {};
  const summaryPaths = [
    "https://site.api.espn.com/apis/site/v2/sports/soccer/" + encodeURIComponent(league) + "/summary?event=" + encodeURIComponent(fixture.id),
    "https://site.web.api.espn.com/apis/site/v2/sports/soccer/" + encodeURIComponent(league) + "/summary?event=" + encodeURIComponent(fixture.id)
  ];
  for (const url of summaryPaths) {
    try {
      summary = await fetchJSON(url,2400);
      if (summary && typeof summary === "object" && Object.keys(summary).length) break;
    } catch (_) {}
  }
  const root = {event:fixture,summary,...(summary?.gameInfo && typeof summary.gameInfo==="object" ? summary.gameInfo : {})};
  const metadata = {
    venue: findMetadataValue(root, ["venue","stadium","ground","arena","venueName","stadiumName","groundName"]),
    referee: findMetadataValue(root, ["referee","referees","official","officials","mainOfficial","matchReferee","refereeName"]),
    broadcastChannel: findMetadataValue(root, ["tvChannel","tvChannels","tvStation","broadcastChannel","broadcastName","broadcast","broadcasts","channel","channels","channelName","broadcaster","broadcasters","network","networks","television","beIN","beinSports","beINConnect"]),
    commentator: findMetadataValue(root, ["commentator","commentators","commentatorName","tvCommentator","matchCommentator","liveCommentator","broadcastCommentator","announcer","announcers","commentaryTeam","presenter","caster","beINCommentator","beinSportsCommentator"])
  };
  return {metadata,headToHead:espnSeriesEvents(summary,homeName,awayName)};
}

async function loadFixtureMetadata(homeName, awayName, requestedDate, competition) {
  if (!homeName || !awayName) return {metadata:{},headToHead:[]};
  const espn = await loadESPNMatchBundle(homeName,awayName,competition,requestedDate);
  let metadata = {...(espn.metadata || {})};
  let headToHead = Array.isArray(espn.headToHead) ? espn.headToHead : [];

  if (!metadata.venue && !metadata.referee && !metadata.broadcastChannel && !metadata.commentator) {
    try {
      const homeTeam = await findSofaTeam(homeName);
      if (homeTeam) {
        const [lastResult,nextResult] = await Promise.allSettled([
          sofaJSON("/team/" + encodeURIComponent(homeTeam.id) + "/events/last/0"),
          sofaJSON("/team/" + encodeURIComponent(homeTeam.id) + "/events/next/0")
        ]);
        const events = [];
        for (const result of [lastResult,nextResult]) {
          if (result.status === "fulfilled" && Array.isArray(result.value?.events)) events.push(...result.value.events);
        }
        const expectedTimestamp = Date.parse(String(requestedDate || ""));
        const candidates = events.filter(event => {
          const h=event?.homeTeam?.name||"", a=event?.awayTeam?.name||"";
          return (sameTeam(h,homeName)&&sameTeam(a,awayName)) || (sameTeam(h,awayName)&&sameTeam(a,homeName));
        }).map(event => {
          const dateValue=eventTime(event), timestamp=dateValue?Date.parse(dateValue):NaN;
          return {event,delta:Number.isFinite(expectedTimestamp)&&Number.isFinite(timestamp)?Math.abs(expectedTimestamp-timestamp):Number.POSITIVE_INFINITY};
        }).filter(item=>!Number.isFinite(item.delta)||item.delta<=72*60*60*1000).sort((a,b)=>a.delta-b.delta);
        const candidate=candidates[0]?.event;
        if (candidate?.id) {
          let detail={};
          try{detail=await sofaJSON("/event/"+encodeURIComponent(candidate.id));}catch(_){}
          const root={event:candidate,detail,...(detail?.event&&typeof detail.event==="object"?detail.event:{})};
          const fallback = {
            venue:findMetadataValue(root,["venue","stadium","ground","arena","venueName","stadiumName","groundName"]),
            referee:findMetadataValue(root,["referee","referees","official","officials","mainReferee","matchReferee","refereeName"]),
            broadcastChannel:findMetadataValue(root,["tvChannel","tvChannels","tvStation","broadcastChannel","broadcastName","broadcast","broadcasts","channel","channels","channelName","broadcaster","broadcasters","network","television","beIN","beinSports","beINConnect"]),
            commentator:findMetadataValue(root,["commentator","commentators","commentatorName","tvCommentator","matchCommentator","liveCommentator","broadcastCommentator","announcer","announcers","commentaryTeam","presenter","caster","beINCommentator","beinSportsCommentator"])
          };
          for(const key of ["venue","referee","broadcastChannel","commentator"]) if(!metadata[key]&&fallback[key]) metadata[key]=fallback[key];
        }
      }
    } catch (_) {}
  }
  return {metadata,headToHead};
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

async function loadSofaScoreStandings(homeName, awayName, requestedDate) {
  if (!homeName || !awayName) return {rows:[]};
  try {
    const homeTeam = await findSofaTeam(homeName);
    if (!homeTeam) return {rows:[]};
    const [lastResult,nextResult] = await Promise.allSettled([
      sofaJSON("/team/" + encodeURIComponent(homeTeam.id) + "/events/last/0"),
      sofaJSON("/team/" + encodeURIComponent(homeTeam.id) + "/events/next/0")
    ]);
    const events = [];
    for (const result of [lastResult,nextResult]) {
      if (result.status === "fulfilled" && Array.isArray(result.value?.events)) events.push(...result.value.events);
    }
    const expected = Date.parse(String(requestedDate || ""));
    const candidates = events.filter(event => {
      const h=event?.homeTeam?.name||"", a=event?.awayTeam?.name||"";
      return (sameTeam(h,homeName)&&sameTeam(a,awayName)) || (sameTeam(h,awayName)&&sameTeam(a,homeName));
    }).map(event=>{
      const time = Date.parse(eventTime(event)||"");
      return {event,delta:Number.isFinite(expected)&&Number.isFinite(time)?Math.abs(expected-time):Number.POSITIVE_INFINITY};
    }).filter(item=>!Number.isFinite(item.delta)||item.delta<=72*60*60*1000).sort((a,b)=>a.delta-b.delta);
    const fixture = candidates[0]?.event;
    const tournament = fixture?.tournament?.uniqueTournament || fixture?.uniqueTournament ||
      fixture?.tournament || null;
    const tournamentId = tournament?.id;
    if (!tournamentId) return {rows:[]};

    let seasonId = fixture?.season?.id || fixture?.seasonId || fixture?.season_id || null;
    let seasonLabel = fixture?.season?.name || "";
    if (!seasonId) {
      const seasonPayload = await sofaJSON("/unique-tournament/" + encodeURIComponent(tournamentId) + "/seasons");
      const seasons = Array.isArray(seasonPayload?.seasons) ? seasonPayload.seasons : [];
      const year = String(new Date(Number.isFinite(expected)?expected:Date.now()).getUTCFullYear());
      const shortYear = year.slice(-2);
      const matched = seasons.find(item => String(item.year||item.name||"").includes(year) ||
        String(item.year||item.name||"").includes(shortYear + "/" + String(Number(shortYear)+1).padStart(2,"0")));
      const selected = matched || seasons[0];
      seasonId = selected?.id || null;
      seasonLabel = selected?.name || selected?.year || "";
    }
    if (!seasonId) return {rows:[]};
    const payload = await sofaJSON("/unique-tournament/" + encodeURIComponent(tournamentId) +
      "/season/" + encodeURIComponent(seasonId) + "/standings/total");
    const groups = Array.isArray(payload?.standings) ? payload.standings : [];
    const rows = groups.flatMap(group => Array.isArray(group?.rows) ? group.rows : []);
    const unique = new Map();
    for (const row of rows) {
      const team = row?.team || {};
      const name = team.name || team.shortName || team.short_name;
      if (!name) continue;
      unique.set(String(team.id || name), {
        rank: String(row.position ?? row.rank ?? unique.size+1),
        team: name,
        logo: team.id ? "https://www.sofascore.com/api/v1/team/" + encodeURIComponent(team.id) + "/image" : "",
        played: String(row.matches ?? row.played ?? "—"),
        won: String(row.wins ?? row.won ?? "—"),
        drawn: String(row.draws ?? row.drawn ?? "—"),
        lost: String(row.losses ?? row.lost ?? "—"),
        points: String(row.points ?? "—"),
        differential: (row.scoresFor != null && row.scoresAgainst != null)
          ? String(Number(row.scoresFor)-Number(row.scoresAgainst)) : "—"
      });
    }
    return {
      league: tournament?.name || fixture?.tournament?.name || "",
      season: seasonLabel,
      rows: [...unique.values()].sort((a,b)=>Number(a.rank)-Number(b.rank)).slice(0,32)
    };
  } catch (_) {
    return {rows:[]};
  }
}

async function loadStandings(competition, date, home, away) {
  const codeEntry = ESPN_CODES.find(([pattern]) => pattern.test(String(competition || "")));
  if (codeEntry) {
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
    const responses = await Promise.allSettled(urls.map(url => fetchJSON(url,2400)));
    for (const result of responses) {
      if (result.status !== "fulfilled") continue;
      const entries = collectEntries(result.value);
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
        })).sort((a,b) => Number(a.rank) - Number(b.rank)).slice(0, 32)
      };
    }
  }
  const sofaRows = await loadSofaScoreStandings(home, away, date);
  return sofaRows.rows?.length ? sofaRows : { league: competition, rows: [] };
}

async function withDeadline(promise, milliseconds, fallback) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(promise).catch(() => fallback),
      new Promise(resolve => { timer = setTimeout(() => resolve(fallback), milliseconds); })
    ]);
  } finally {
    clearTimeout(timer);
  }
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

  const [formData, standings, metadataResult] = await Promise.all([
    withDeadline(loadHeadToHead(home, away), 5000, {headToHead:[],homeRecent:[],awayRecent:[]}),
    withDeadline(loadStandings(competition, date, home, away), 8000, { league: competition, rows: [] }),
    withDeadline(loadFixtureMetadata(home, away, date, competition), 8000, {metadata:{},headToHead:[]})
  ]);
  const metadata = metadataResult?.metadata || {};
  const enrichedH2H = Array.isArray(metadataResult?.headToHead) ? metadataResult.headToHead : [];
  const headToHead = formData.headToHead?.length ? formData.headToHead : enrichedH2H;
  const homeRecent = Array.isArray(formData.homeRecent) ? formData.homeRecent : [];
  const awayRecent = Array.isArray(formData.awayRecent) ? formData.awayRecent : [];
  return send(res, 200, {
    headToHead,
    homeRecent,
    awayRecent,
    standings,
    metadata,
    availability: {
      headToHead: headToHead.length > 0,
      homeRecent: homeRecent.length > 0,
      awayRecent: awayRecent.length > 0,
      standings: Array.isArray(standings?.rows) && standings.rows.length > 0,
      metadata: !!(metadata.venue || metadata.referee || metadata.broadcastChannel || metadata.commentator)
    }
  });
};
