/* BakhiraFoot shared API client
 * - Coalesces identical in-flight requests
 * - Keeps short-lived browser memory cache for live/date feeds
 * - Serves stale data briefly if a refresh fails
 * - Does not cache mutations or non-GET requests
 */
(() => {
  "use strict";

  if (window.BFAPI && typeof window.BFAPI.getJSON === "function") return;

  const cache = new Map();
  const pending = new Map();
  const clone = value => {
    if (value === null || value === undefined) return value;
    try {
      if (typeof structuredClone === "function") return structuredClone(value);
    } catch (_) {}
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  };

  function defaultsFor(url) {
    let parsed;
    try { parsed = new URL(url, window.location.href); }
    catch (_) { return { ttlMs: 0, staleIfErrorMs: 0 }; }

    const path = parsed.pathname;
    const params = parsed.searchParams;
    if (path === "/api" && params.has("date")) {
      return { ttlMs: 20000, staleIfErrorMs: 90000 };
    }
    if (path === "/api" && params.get("live") === "all") {
      return { ttlMs: 8000, staleIfErrorMs: 25000 };
    }
    if (path === "/api" && params.has("fixture")) {
      return { ttlMs: 15000, staleIfErrorMs: 45000 };
    }
    if (path === "/api/news") {
      return { ttlMs: 300000, staleIfErrorMs: 1200000 };
    }
    if (path === "/api/match-center") {
      return { ttlMs: 180000, staleIfErrorMs: 600000 };
    }
    if (path === "/api/match-event-enrichment") {
      return { ttlMs: 60000, staleIfErrorMs: 180000 };
    }
    return { ttlMs: 0, staleIfErrorMs: 0 };
  }

  async function getJSON(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    if (method !== "GET") {
      throw new TypeError("BFAPI.getJSON only supports GET requests.");
    }

    const key = String(url);
    const defaults = defaultsFor(key);
    const ttlMs = Number.isFinite(options.ttlMs) ? Math.max(0, options.ttlMs) : defaults.ttlMs;
    const staleIfErrorMs = Number.isFinite(options.staleIfErrorMs)
      ? Math.max(0, options.staleIfErrorMs)
      : defaults.staleIfErrorMs;
    const now = Date.now();
    const existing = cache.get(key);

    if (!options.force && existing && existing.expiresAt > now) {
      return clone(existing.value);
    }
    if (pending.has(key)) return clone(await pending.get(key));

    const request = (async () => {
      const controller = new AbortController();
      const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 12000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const headers = new Headers(options.headers || {});
        if (!headers.has("Accept")) headers.set("Accept", "application/json");
        const response = await fetch(key, {
          method: "GET",
          headers,
          cache: "no-store",
          credentials: options.credentials || "same-origin",
          signal: options.signal || controller.signal
        });

        const raw = await response.text();
        let payload;
        try { payload = raw ? JSON.parse(raw) : {}; }
        catch (_) {
          const error = new Error("Réponse JSON invalide");
          error.status = response.status;
          throw error;
        }

        if (!response.ok) {
          const error = new Error(payload?.message || payload?.error || ("HTTP " + response.status));
          error.status = response.status;
          error.payload = payload;
          throw error;
        }

        const value = clone(payload);
        if (ttlMs > 0) {
          cache.set(key, {
            value,
            storedAt: Date.now(),
            expiresAt: Date.now() + ttlMs
          });
        }
        return value;
      } catch (error) {
        const failedAt = Date.now();
        if (existing && staleIfErrorMs > 0 &&
            failedAt - existing.storedAt <= ttlMs + staleIfErrorMs) {
          console.warn("BakhiraFoot API: stale response used for", key, error);
          return clone(existing.value);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })();

    pending.set(key, request);
    try {
      return clone(await request);
    } finally {
      if (pending.get(key) === request) pending.delete(key);
    }
  }

  function invalidate(match) {
    if (!match) {
      cache.clear();
      return;
    }
    const prefix = String(match);
    for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
  }

  window.BFAPI = Object.freeze({ getJSON, invalidate });
})();
