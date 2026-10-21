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

async function getJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const host = new URL(url).hostname.toLowerCase();
    const headers = {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36"
    };
    if (host.endsWith("sportscore.com")) {
      headers.Referer = "https://sportscore.com/";
      headers.Origin = "https://sportscore.com";
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
      broadcastChannel: findMeta(root, ["tvChannel", "tv_channel", "channel", "channels", "broadcaster", "broadcasters", "broadcast", "broadcasts", "network", "networks", "television"]),
      commentator: findMeta(root, ["commentator", "commentators", "commentatorName", "tvCommentator", "matchCommentator", "announcer", "announcers", "commentaryTeam"])
    };
    return send(res, 200, { data: metadata, provider: "SportScore raw event enrichment" });
  } catch (error) {
    console.warn("BAKHIRAFOOT raw match event enrichment unavailable:", error?.message || firstError?.message || error);
    return send(res, 502, { error: "match_event_enrichment_unavailable" });
  }
};