"use strict";

const SPORTSCORE = "https://sportscore.com/api/v1";
const WIDGET = "https://sportscore.com/api/widget";

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}

function first() {
  for (const value of arguments) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function labelText(value, depth = 0) {
  if (depth > 4 || value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) {
    return [...new Set(value.map(item => labelText(item, depth + 1)).filter(Boolean))].join(" · ");
  }
  if (typeof value !== "object") return "";
  const direct = first(
    value.name, value.displayName, value.display_name, value.fullName, value.full_name,
    value.shortName, value.short_name, value.label, value.title,
    value.channelName, value.channel_name, value.networkName, value.network_name,
    value.officialName, value.official_name, value.value?.name, value.value?.text
  );
  if (direct != null && typeof direct !== "object" && String(direct).trim()) return String(direct).trim();
  for (const key of ["names", "items", "officials", "channels", "broadcasters", "commentators", "staff", "main", "referee"]) {
    const text = labelText(value[key], depth + 1);
    if (text) return text;
  }
  return "";
}

async function getJSON(url, timeoutMs = 14000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const host = new URL(url).hostname.toLowerCase();
    const headers = {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36"
    };
    if (host.endsWith("sportscore.com")) {
      headers.Referer = "https://sportscore.com/";
      headers.Origin = "https://sportscore.com";
    } else if (host.endsWith("sofascore.com")) {
      headers.Referer = "https://www.sofascore.com/";
      headers.Origin = "https://www.sofascore.com";
    }
    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal
    });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); }
    catch (_) { body = null; }
    if (!response.ok) {
      const error = new Error("SportScore HTTP " + response.status);
      error.status = response.status;
      throw error;
    }
    if (!body || typeof body !== "object") throw new Error("Invalid SportScore JSON");
    return body;
  } finally {
    clearTimeout(timeout);
  }
}



// Exact-date fallback for match metadata: when SportScore omits the referee or
// venue, locate the same fixture on SofaScore using both teams and match date.
// The team pair must match; we never borrow an official from a different match.
function scalarByKeys(root, aliases) {
  const targets = new Set(aliases.map(normalizeKey));
  const queue = [{ value: root, depth: 0 }];
  const visited = new Set();
  while (queue.length && visited.size < 1800) {
    const item = queue.shift();
    const value = item?.value;
    if (!value || typeof value !== "object" || visited.has(value) || item.depth > 6) continue;
    visited.add(value);
    if (Array.isArray(value)) {
      if (item.depth < 6) value.forEach(child => {
        if (child && typeof child === "object") queue.push({ value: child, depth: item.depth + 1 });
      });
      continue;
    }
    for (const [key, child] of Object.entries(value)) {
      if (targets.has(normalizeKey(key))) {
        if (typeof child === "string" || typeof child === "number") return child;
        if (child && typeof child === "object") {
          for (const dateKey of ["iso", "datetime", "dateTime", "date", "value", "timestamp", "startTimestamp"]) {
            if (typeof child[dateKey] === "string" || typeof child[dateKey] === "number") return child[dateKey];
          }
        }
      }
      if (child && typeof child === "object" && item.depth < 6) {
        queue.push({ value: child, depth: item.depth + 1 });
      }
    }
  }
  return null;
}

function normalTeamName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(football club|soccer club|fc|cf|afc|sc|cfc|club)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sameTeamName(left, right) {
  const a = normalTeamName(left);
  const b = normalTeamName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const aa = a.split(" ").filter(token => token.length > 2);
  const bb = b.split(" ").filter(token => token.length > 2);
  if (!aa.length || !bb.length) return false;
  const common = aa.filter(token => bb.includes(token));
  return common.length >= 2 && common.length / Math.min(aa.length, bb.length) >= 0.8;
}

function asCalendarDate(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" || /^\d{10,13}$/.test(String(value))) {
    const numeric = Number(value);
    const milliseconds = String(Math.trunc(numeric)).length >= 13 ? numeric : numeric * 1000;
    const date = new Date(milliseconds);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
  }
  const match = String(value).match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (match) return match[1];
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function shiftCalendarDate(value, days) {
  const date = new Date(value + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getSofaJSON(path) {
  const hosts = [
    "https://www.sofascore.com/api/v1",
    "https://api.sofascore.com/api/v1"
  ];
  let lastError = null;
  for (const host of hosts) {
    try {
      return await getJSON(host + path, 1800);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("SofaScore unavailable");
}

async function lookupSofaScoreMetadata(root) {
  const homeName = findMeta(root, ["homeTeam", "home_team", "homeTeamName", "home_team_name", "homeName", "localTeam", "home"]);
  const awayName = findMeta(root, ["awayTeam", "away_team", "awayTeamName", "away_team_name", "awayName", "visitorTeam", "away"]);
  const rawDate = scalarByKeys(root, [
    "date", "matchDate", "startDate", "kickoff", "kickoffTime", "startTime",
    "datetime", "dateTime", "startTimestamp", "timestamp"
  ]);
  const baseDate = asCalendarDate(rawDate);
  if (!homeName || !awayName || !baseDate) return {};

  // Check the exact date and, for UTC/local-time boundary cases, the prior date.
  // Short timeouts keep metadata enrichment from holding up the working match view.
  const dates = [baseDate, shiftCalendarDate(baseDate, -1)];
  for (const date of dates) {
    let calendar;
    try {
      calendar = await getSofaJSON("/sport/football/scheduled-events/" + date);
    } catch (_) {
      continue;
    }
    const events = Array.isArray(calendar?.events)
      ? calendar.events
      : Array.isArray(calendar?.scheduledEvents) ? calendar.scheduledEvents : [];
    const match = events.find(event => {
      const h = event?.homeTeam?.name || event?.homeTeam?.shortName;
      const a = event?.awayTeam?.name || event?.awayTeam?.shortName;
      return (sameTeamName(h, homeName) && sameTeamName(a, awayName)) ||
        (sameTeamName(h, awayName) && sameTeamName(a, homeName));
    });
    if (!match?.id) continue;

    let matchRoot = match;
    const matchId = encodeURIComponent(String(match.id));
    try {
      const detail = await getSofaJSON("/event/" + matchId);
      if (detail?.event && typeof detail.event === "object") matchRoot = detail.event;
    } catch (_) {}

    return {
      venue: findMeta(matchRoot, ["venue", "stadium", "ground", "arena", "venueName", "stadiumName"]),
      referee: findMeta(matchRoot, ["referee", "mainReferee", "matchReferee", "refereeName"]),
      broadcastChannel: findMeta(matchRoot, ["tvChannel", "tv_channel", "channel", "channels", "broadcaster", "broadcasters", "broadcast", "broadcasts", "network", "networks", "television"]),
      commentator: findMeta(matchRoot, ["commentator", "commentators", "commentatorName", "tvCommentator", "matchCommentator", "announcer", "announcers", "commentaryTeam"]),
      metadataSource: "SofaScore exact match lookup"
    };
  }
  return {};
}

function detailRoot(body) {
  if (body?.match && typeof body.match === "object") return body.match;
  if (body?.data?.match && typeof body.data.match === "object") return body.data.match;
  if (body?.data && typeof body.data === "object" && !Array.isArray(body.data)) return body.data;
  return body || null;
}

function collectEvents(root) {
  const eventKeys = new Set([
    "events", "incidents", "timeline", "matchevents", "plays", "injuries",
    "cards", "goals", "matchincidents", "matchtimeline"
  ]);
  const queue = [{ value: root, depth: 0 }];
  const seenObjects = new Set();
  const seenEvents = new Set();
  const events = [];
  const looksLikeEvent = value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const has = key => Object.prototype.hasOwnProperty.call(value, key);
    return [
      "event_type", "eventType", "incidentType", "goal", "scorer", "goal_scorer",
      "goalScorer", "injury", "card", "own_goal", "ownGoal", "isOwnGoal",
      "assist", "assist1", "assist_name", "player_in", "playerIn", "player_out", "playerOut"
    ].some(has) || (
      has("type") && ["player", "athlete", "actor", "scorer", "minute", "elapsed", "time", "detail", "description", "text", "comments"].some(has)
    );
  };
  const add = value => {
    if (!looksLikeEvent(value)) return;
    const id = first(value.id, value.event_id, value.eventId, value.incidentId, value.incident_id);
    const minute = first(value.minute, value.elapsed, value.time?.elapsed, value.time?.minute, value.time);
    const rawType = first(value.type?.name, value.type?.text, value.type?.label, value.type, value.event_type?.name, value.event_type, value.incidentType?.name, value.incidentType);
    const person = labelText(first(value.player, value.scorer, value.goalScorer, value.goal_scorer, value.athlete, value.actor, value.person, value.participants?.[0]?.athlete, value.participants?.[0]?.player, value.participants?.[0]));
    const detail = first(value.detail?.name, value.detail?.text, value.detail, value.description?.text, value.description, value.goalDescription, value.goal_description, value.cardDescription, value.text, value.commentary, "");
    const identity = id !== null ? "id:" + String(id) : [minute, rawType, person, detail].map(v => String(v ?? "")).join("|");
    if (seenEvents.has(identity)) return;
    seenEvents.add(identity);
    events.push(value);
  };
  const walkEventContainer = (value, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 5) return;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (looksLikeEvent(item)) add(item);
        else walkEventContainer(item, depth + 1);
      }
      return;
    }
    if (looksLikeEvent(value)) add(value);
    for (const child of Object.values(value)) {
      if (child && typeof child === "object") walkEventContainer(child, depth + 1);
    }
  };
  while (queue.length && seenObjects.size < 2500) {
    const item = queue.shift();
    const value = item?.value;
    if (!value || typeof value !== "object" || seenObjects.has(value) || item.depth > 6) continue;
    seenObjects.add(value);
    if (Array.isArray(value)) {
      if (item.depth < 6) value.forEach(child => {
        if (child && typeof child === "object") queue.push({ value: child, depth: item.depth + 1 });
      });
      continue;
    }
    for (const [key, child] of Object.entries(value)) {
      if (eventKeys.has(normalizeKey(key))) walkEventContainer(child);
      if (child && typeof child === "object" && item.depth < 6) queue.push({ value: child, depth: item.depth + 1 });
    }
  }
  return events;
}

function findMeta(root, aliases) {
  const targets = new Set(aliases.map(normalizeKey));
  const queue = [{ value: root, depth: 0 }];
  const visited = new Set();
  while (queue.length && visited.size < 1200) {
    const item = queue.shift();
    const current = item?.value;
    if (!current || typeof current !== "object" || visited.has(current) || item.depth > 5) continue;
    visited.add(current);
    if (Array.isArray(current)) {
      if (item.depth < 5) current.forEach(value => { if (value && typeof value === "object") queue.push({ value, depth: item.depth + 1 }); });
      continue;
    }
    for (const [key, value] of Object.entries(current)) {
      if (targets.has(normalizeKey(key))) {
        const text = labelText(value);
        if (text) return text;
      }
      if (value && typeof value === "object" && item.depth < 5) queue.push({ value, depth: item.depth + 1 });
    }
  }
  return "";
}

module.exports = async function matchEventEnrichment(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "method_not_allowed" });
  }
  const slug = String(req.query?.fixture || req.query?.slug || "").trim();
  if (!slug || /^(sofa|espn|tsdb)-/i.test(slug)) {
    return send(res, 400, { error: "sportscore_fixture_slug_required" });
  }

  let body = null;
  let firstError = null;
  try {
    try {
      body = await getJSON(SPORTSCORE + "/match/?sport=football&slug=" + encodeURIComponent(slug));
    } catch (error) {
      firstError = error;
      body = await getJSON(WIDGET + "/match/?sport=football&slug=" + encodeURIComponent(slug));
    }
    const root = detailRoot(body);
    if (!root || typeof root !== "object") return send(res, 404, { error: "match_not_found" });

    const events = collectEvents(root).slice(0, 400);
    const metadata = {
      events,
      player_of_match: first(
        root.player_of_match, root.playerOfMatch, root.man_of_the_match,
        root.manOfTheMatch, root.mvp, root.best_player, null
      ),
      venue: findMeta(root, ["venue", "stadium", "ground", "arena", "venueName", "stadiumName"]),
      referee: findMeta(root, ["referee", "mainReferee", "matchReferee", "refereeName"]),
      broadcastChannel: findMeta(root, [
        "tvChannel", "tv_channel", "tvChannels", "tv_channels", "tvStation", "tvStations",
        "channel", "channels", "channelName", "channel_name", "broadcaster", "broadcasters",
        "broadcasterName", "broadcastName", "broadcastChannel", "broadcast_channel",
        "broadcast", "broadcasts", "network", "networks", "television", "media", "coverage"
      ]),
      commentator: findMeta(root, [
        "commentator", "commentators", "commentatorName", "commentator_name",
        "tvCommentator", "tv_commentator", "matchCommentator", "match_commentator",
        "liveCommentator", "broadcastCommentator", "announcer", "announcers",
        "commentaryTeam", "commentary_team", "presenter", "presenters", "caster"
      ])
    };

    // SportScore can omit venue/referee on otherwise well-known fixtures.
    // Look up the exact same teams on the same date before displaying metadata.
    if (!metadata.venue || !metadata.referee) {
      try {
        const fallback = await lookupSofaScoreMetadata(root);
        if (!metadata.venue && fallback.venue) metadata.venue = fallback.venue;
        if (!metadata.referee && fallback.referee) metadata.referee = fallback.referee;
        if (!metadata.broadcastChannel && fallback.broadcastChannel) metadata.broadcastChannel = fallback.broadcastChannel;
        if (!metadata.commentator && fallback.commentator) metadata.commentator = fallback.commentator;
        if (fallback.metadataSource) metadata.metadataSource = fallback.metadataSource;
      } catch (error) {
        console.warn("BAKHIRAFOOT metadata fallback unavailable:", error?.message || error);
      }
    }

    return send(res, 200, { data: metadata, provider: metadata.metadataSource || "SportScore raw event enrichment" });
  } catch (error) {
    console.warn("BAKHIRAFOOT raw match event enrichment unavailable:", error?.message || firstError?.message || error);
    return send(res, 502, { error: "match_event_enrichment_unavailable" });
  }
};