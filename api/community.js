"use strict";

const crypto = require("crypto");

const REDIS_URL = String(process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
const REDIS_TOKEN = String(process.env.UPSTASH_REDIS_REST_TOKEN || "");
const DEFAULT_COMMENTS_KEY = "bf:community:comments";

function safeMatchSlug(value) {
  return String(value || "").trim().toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "general";
}

function matchVotesKey(value) {
  return "bf:community:votes:" + safeMatchSlug(value);
}

function matchVoterKey(value, hash) {
  return "bf:community:voter:" + safeMatchSlug(value) + ":" + hash;
}

function matchCommentsKey(value) {
  const match = String(value || "").trim().toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  return match ? "bf:community:match:" + match : DEFAULT_COMMENTS_KEY;
}

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}

function visitorHash(req) {
  const realIp = req.headers["x-real-ip"];
  const forwarded = req.headers["x-forwarded-for"];
  const ip = String(realIp || (Array.isArray(forwarded) ? forwarded[0] : forwarded || "")
    .split(",")[0] || "").trim();
  if (!ip) return "";
  return crypto.createHash("sha256").update(ip).digest("hex");
}

async function redisCommand() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    const error = new Error("Community storage is not configured");
    error.code = "STORAGE_NOT_CONFIGURED";
    throw error;
  }
  const command = Array.from(arguments);
  const response = await fetch(REDIS_URL + "/pipeline", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + REDIS_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([command])
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(body) || body[0]?.error) {
    const error = new Error(body?.[0]?.error || body?.error || "Community storage request failed");
    error.code = "STORAGE_REQUEST_FAILED";
    throw error;
  }
  return body[0]?.result;
}

function moderationText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .trim();
}

function hasProfanity(value) {
  const normalized = moderationText(value);
  if (!normalized) return false;

  // Exact/common variants are checked per token so ordinary football words are less likely to be blocked.
  const bannedLatin = new Set([
    "fuck", "fucker", "fuckers", "fucking", "motherfucker", "motherfuckers",
    "shit", "shitty", "bullshit", "bitch", "bitches", "bitching", "asshole",
    "assholes", "dickhead", "dickheads", "cunt", "cunts", "pussy", "cock",
    "cocks", "blowjob", "handjob", "whore", "whores", "slut", "sluts",
    "nigger", "niggers", "faggot", "faggots",
    "zebi", "zebbi", "zbi", "zob", "zobby", "9a7ba", "9ehba", "9ahba",
    "nikek", "nikha", "nikkom", "nikom", "nikem", "mnyek", "mnayek",
    "chermout", "chermota", "charmout", "charmota", "tizi", "kossk",
    "kossom", "kessom", "zamel", "zaml", "3ars", "3erra"
  ]);
  const bannedArabic = new Set([
    "قحبه", "قحب", "زبي", "زبي", "زبي", "زب", "نيك", "نيكك", "نيكها",
    "نيكهم", "منيك", "مناك", "متناك", "طيز", "خرا", "عرص", "معرص",
    "شرموط", "شرموطه", "قواد", "كس", "كسك", "كسمك", "كسختك"
  ]);

  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) || [];
  for (const originalToken of tokens) {
    const token = originalToken.replace(/[^a-z0-9\u0600-\u06ff]/gi, "");
    if (bannedLatin.has(token) || bannedArabic.has(token)) return true;

    // Catch common elongated/spaced suffix variants without matching short roots in unrelated words.
    if (/^(fuck|shit|bitch|asshole|motherfucker|nigger|faggot)(er|ers|ing|ed|s)?$/.test(token)) return true;
    if (/^(قحبه|قحب|زبي|نيكك|نيكها|نيكهم|منيك|مناك|متناك|شرموط|شرموطه|معرص|كسمك)$/.test(token)) return true;
  }

  // Catch simple punctuation inserted inside common explicit profanity (for example f.u.c.k).
  const punctFreeTokens = String(value || "").toLowerCase()
    .split(/\s+/)
    .map(token => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  const punctFree = punctFreeTokens.join(" ");
  const separatedProfanity = [
    /f\s*u\s*c\s*k/i, /s\s*h\s*i\s*t/i, /b\s*i\s*t\s*c\s*h/i,
    /z\s*e\s*b\s*i/i, /n\s*i\s*k\s*e?k/i
  ];
  return separatedProfanity.some(pattern => pattern.test(punctFree));
}

function safeComment(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

module.exports = async function community(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "method_not_allowed" });
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    return send(res, 503, {
      error: "community_storage_not_configured",
      message: "Visitor comments are not enabled until a shared Redis store is connected."
    });
  }

  const hash = visitorHash(req);
  if (!hash) {
    return send(res, 400, { error: "visitor_identity_unavailable" });
  }

  try {
    // Comments are intentionally open: abusive words do not trigger a site ban.
    // The status endpoint remains for compatibility with older community.js builds.
    if (req.method === "GET") {
      if (String(req.query?.status || "") === "1") {
        return send(res, 200, { banned: false });
      }
      if (String(req.query?.vote || "") === "1") {
        const match = req.query?.match;
        const countsKey = matchVotesKey(match);
        const currentVote = await redisCommand("GET", matchVoterKey(match, hash));
        const homeVotes = Number(await redisCommand("HGET", countsKey, "home") || 0);
        const awayVotes = Number(await redisCommand("HGET", countsKey, "away") || 0);
        return send(res, 200, { votes: { home: homeVotes, away: awayVotes }, voted: currentVote || null });
      }
      const key = matchCommentsKey(req.query?.match);
      const records = await redisCommand("LRANGE", key, "0", "99");
      const comments = [];
      for (const item of Array.isArray(records) ? records : []) {
        try {
          const comment = JSON.parse(item);
          if (comment && typeof comment.message === "string" && typeof comment.author === "string") {
            comments.push(comment);
          }
        } catch (_) {}
      }
      return send(res, 200, { banned: false, comments });
    }

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) body = {};

    if (body.type === "vote") {
      const team = String(body.team || "").toLowerCase();
      if (team !== "home" && team !== "away") {
        return send(res, 400, { error: "invalid_vote", message: "Choisis une des deux équipes." });
      }
      const match = body.match || req.query?.match;
      const slug = safeMatchSlug(match);
      const voterKey = matchVoterKey(slug, hash);
      const countsKey = matchVotesKey(slug);
      const previous = await redisCommand("GET", voterKey);
      if (previous !== "home" && previous !== "away") {
        const reserved = await redisCommand("SET", voterKey, team, "NX");
        if (reserved === "OK") {
          await redisCommand("HINCRBY", countsKey, team, "1");
        } else {
          const latest = await redisCommand("GET", voterKey);
          if (latest === "home" || latest === "away") {
            if (latest !== team) {
              await redisCommand("HINCRBY", countsKey, latest, "-1");
              await redisCommand("HINCRBY", countsKey, team, "1");
              await redisCommand("SET", voterKey, team);
            }
          }
        }
      } else if (previous !== team) {
        await redisCommand("HINCRBY", countsKey, previous, "-1");
        await redisCommand("HINCRBY", countsKey, team, "1");
        await redisCommand("SET", voterKey, team);
      }
      const homeVotes = Number(await redisCommand("HGET", countsKey, "home") || 0);
      const awayVotes = Number(await redisCommand("HGET", countsKey, "away") || 0);
      return send(res, 200, { votes: { home: homeVotes, away: awayVotes }, voted: await redisCommand("GET", voterKey) || team });
    }

    const author = safeComment(body.author, 28);
    const message = safeComment(body.message, 500);

    if (author.length < 2 || message.length < 3) {
      return send(res, 400, {
        error: "invalid_comment",
        message: "Ajoute un pseudo (2 caractères minimum) et un commentaire (3 caractères minimum)."
      });
    }

    const commentKey = matchCommentsKey(body.match || req.query?.match);
    const rateKey = "bf:community:rate:" + hash + ":" + commentKey.split(":").slice(-1)[0];
    const rate = await redisCommand("SET", rateKey, "1", "NX", "EX", "20");
    if (rate !== "OK") {
      return send(res, 429, {
        error: "rate_limited",
        message: "Attends 20 secondes avant de publier un autre commentaire."
      });
    }

    const comment = {
      id: crypto.randomUUID(),
      author,
      message,
      createdAt: new Date().toISOString()
    };
    await redisCommand("LPUSH", commentKey, JSON.stringify(comment));
    await redisCommand("LTRIM", commentKey, "0", "99");
    return send(res, 201, { banned: false, comment });
  } catch (error) {
    console.error("BAKHIRAFOOT community error:", error?.code || error?.message || error);
    if (error?.code === "STORAGE_NOT_CONFIGURED") {
      return send(res, 503, { error: "community_storage_not_configured" });
    }
    return send(res, 502, { error: "community_storage_unavailable" });
  }
};
