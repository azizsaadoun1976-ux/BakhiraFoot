
"use strict";

/*
 * BAKHIRAFOOT - HISTORICAL FOOTBALL API
 *
 * GET /api/history?action=countries
 * GET /api/history?action=competitions
 * GET /api/history?action=competitions&countryId=44
 * GET /api/history?action=seasons&competitionId=17
 * GET /api/history?action=matches&competitionId=17&seasonId=76986&page=0&direction=last
 *
 * Independent from api/index.js:
 * LIVE and current match details remain untouched.
 */

const BASES = [
  "https://www.sofascore.com/api/v1",
  "https://api.sofascore.com/api/v1"
];

module.exports = async (req, res) => {
  const query = req?.query || {};

  const action = String(
    query.action || "countries"
  ).trim().toLowerCase();

  function output(
    status,
    data,
    cache = "public, s-maxage=1800, stale-while-revalidate=3600"
  ) {
    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      cache
    );

    return res.status(status).json(data);
  }

  function numberId(value) {
    const raw = String(value ?? "").trim();

    return /^\d+$/.test(raw)
      ? raw
      : "";
  }

  async function requestJSON(path) {
    let lastError = null;

    for (const base of BASES) {
      const controller = new AbortController();

      const timer = setTimeout(
        () => controller.abort(),
        4500
      );

      try {
        const response = await fetch(
          `${base}${path}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
              Referer: "https://www.sofascore.com/",
              Origin: "https://www.sofascore.com"
            },
            cache: "no-store",
            signal: controller.signal
          }
        );

        const raw = await response.text();

        let data;

        try {
          data = JSON.parse(raw);
        } catch {
          data = { raw };
        }

        if (!response.ok) {
          const error = new Error(
            `SofaScore HTTP ${response.status}`
          );

          error.status = response.status;
          error.data = data;

          throw error;
        }

        return data;

      } catch (error) {
        lastError = error;

      } finally {
        clearTimeout(timer);
      }
    }

    throw (
      lastError ||
      new Error("Historical data unavailable")
    );
  }

  function collectArrays(root, wantedKeys) {
    const result = [];

    function visit(node) {
      if (
        !node ||
        typeof node !== "object"
      ) {
        return;
      }

      for (const [key, value] of Object.entries(node)) {
        if (
          wantedKeys.includes(key) &&
          Array.isArray(value)
        ) {
          result.push(...value);
        }

        if (
          value &&
          typeof value === "object"
        ) {
          visit(value);
        }
      }
    }

    visit(root);

    return result;
  }

  function normaliseCompetition(item) {
    const tournament =
      item?.uniqueTournament ||
      item?.tournament ||
      item;

    const category =
      tournament?.category ||
      item?.category ||
      {};

    const id =
      tournament?.id ||
      item?.id;

    const name =
      tournament?.name ||
      item?.name ||
      "";

    if (!id || !name) {
      return null;
    }

    return {
      id: String(id),
      name,
      slug: tournament?.slug || item?.slug || "",
      countryId: category?.id
        ? String(category.id)
        : "",
      country: category?.name || "",
      userCount: Number(
        tournament?.userCount ||
        item?.userCount ||
        0
      ),
      logo:
        `https://www.sofascore.com/api/v1/unique-tournament/${id}/image`
    };
  }

  function normaliseEvent(event) {
    const tournament =
      event?.tournament?.uniqueTournament ||
      event?.tournament ||
      {};

    const category =
      event?.tournament?.category ||
      tournament?.category ||
      {};

    const home =
      event?.homeTeam || {};

    const away =
      event?.awayTeam || {};

    const eventId =
      event?.id == null
        ? ""
        : String(event.id);

    return {
      id: eventId
        ? `sofa-${eventId}`
        : "",

      upstreamId: eventId,
      provider: "SofaScore",

      name:
        `${home.name || "Équipe"} - ${away.name || "Équipe"}`,

      home: {
        id: home.id ?? null,
        name: home.name || "Équipe",
        logo: home.id
          ? `https://www.sofascore.com/api/v1/team/${home.id}/image`
          : ""
      },

      away: {
        id: away.id ?? null,
        name: away.name || "Équipe",
        logo: away.id
          ? `https://www.sofascore.com/api/v1/team/${away.id}/image`
          : ""
      },

      score: {
        home: event?.homeScore?.current ?? null,
        away: event?.awayScore?.current ?? null
      },

      date: event?.startTimestamp
        ? new Date(
            Number(event.startTimestamp) * 1000
          ).toISOString()
        : null,

      status: {
        type: event?.status?.type || "",
        description:
          event?.status?.description || ""
      },

      competition: {
        id: String(tournament?.id || ""),
        name: tournament?.name || "Football",
        country: category?.name || ""
      },

      season: event?.season?.name || "",
      round: event?.roundInfo?.round ?? null
    };
  }

  try {
    /* ================================================
       1. COUNTRIES / CATEGORIES
    ================================================ */

    if (action === "countries") {
      const data = await requestJSON(
        "/sport/football/categories"
      );

      const rawCountries = Array.isArray(
        data?.categories
      )
        ? data.categories
        : [];

      const countries = rawCountries
        .filter(item => item?.id && item?.name)
        .map(item => ({
          id: String(item.id),
          name: item.name,
          slug: item.slug || "",
          code: item.alpha2 || "",
          flag: item.flag || ""
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      return output(
        200,
        {
          ok: true,
          action,
          count: countries.length,
          countries
        },
        "public, s-maxage=86400, stale-while-revalidate=172800"
      );
    }

    /* ================================================
       2. COMPETITIONS
    ================================================ */

    if (action === "competitions") {
      const countryId = numberId(
        query.countryId
      );

      let data;

      if (countryId) {
        data = await requestJSON(
          `/category/${countryId}/unique-tournaments`
        );
      } else {
        data = await requestJSON(
          "/sport/football/unique-tournaments"
        );
      }

      const rawCompetitions = collectArrays(
        data,
        [
          "uniqueTournaments",
          "tournaments"
        ]
      );

      const unique = new Map();

      rawCompetitions.forEach(item => {
        const competition =
          normaliseCompetition(item);

        if (!competition) return;

        if (
          countryId &&
          competition.countryId !== countryId
        ) {
          return;
        }

        if (!unique.has(competition.id)) {
          unique.set(
            competition.id,
            competition
          );
        }
      });

      const competitions =
        Array.from(unique.values())
          .sort((a, b) =>
            b.userCount - a.userCount ||
            a.name.localeCompare(b.name)
          );

      return output(
        200,
        {
          ok: true,
          action,
          countryId: countryId || "all",
          count: competitions.length,
          competitions
        },
        "public, s-maxage=21600, stale-while-revalidate=43200"
      );
    }

    /* ================================================
       3. SEASONS FOR ONE COMPETITION
    ================================================ */

    if (action === "seasons") {
      const competitionId = numberId(
        query.competitionId
      );

      if (!competitionId) {
        return output(400, {
          ok: false,
          error: "competitionId invalide"
        });
      }

      const data = await requestJSON(
        `/unique-tournament/${competitionId}/seasons`
      );

      const seasons = Array.isArray(data?.seasons)
        ? data.seasons
        : [];

      const unique = new Map();

      seasons.forEach(season => {
        if (!season?.id) return;

        const id = String(season.id);

        unique.set(id, {
          id,
          name:
            season.name ||
            season.year ||
            `Season ${id}`,
          year: season.year || "",
          competitionId
        });
      });

      const result =
        Array.from(unique.values())
          .sort((a, b) =>
            Number(b.id) - Number(a.id)
          );

      return output(
        200,
        {
          ok: true,
          action,
          competitionId,
          count: result.length,
          seasons: result
        },
        "public, s-maxage=21600, stale-while-revalidate=43200"
      );
    }

    /* ================================================
       4. MATCHES FOR ONE SEASON
       Paginated, so one request doesn't download
       an entire world season.
    ================================================ */

    if (action === "matches") {
      const competitionId = numberId(
        query.competitionId
      );

      const seasonId = numberId(
        query.seasonId
      );

      if (!competitionId || !seasonId) {
        return output(400, {
          ok: false,
          error:
            "competitionId et seasonId sont obligatoires"
        });
      }

      const direction =
        String(
          query.direction || "last"
        ).toLowerCase();

      if (
        direction !== "last" &&
        direction !== "next"
      ) {
        return output(400, {
          ok: false,
          error:
            "direction doit être last ou next"
        });
      }

      const rawPage = Number(query.page || 0);

      if (
        !Number.isInteger(rawPage) ||
        rawPage < 0 ||
        rawPage > 100
      ) {
        return output(400, {
          ok: false,
          error:
            "page doit être un nombre entre 0 et 100"
        });
      }

      const path =
        `/unique-tournament/${competitionId}` +
        `/season/${seasonId}/events/${direction}/${rawPage}`;

      const data = await requestJSON(path);

      const events = Array.isArray(data?.events)
        ? data.events
        : [];

      const matches =
        events.map(normaliseEvent);

      return output(
        200,
        {
          ok: true,
          action,
          competitionId,
          seasonId,
          direction,
          page: rawPage,
          count: matches.length,
          hasNextPage: Boolean(data?.hasNextPage),
          matches
        },
        "public, s-maxage=900, stale-while-revalidate=1800"
      );
    }

    return output(400, {
      ok: false,
      error:
        "action doit être countries, competitions, seasons ou matches"
    });

  } catch (error) {
    console.error(
      "BAKHIRAFOOT HISTORY API ERROR:",
      action,
      error?.message
    );

    return output(
      error?.status || 502,
      {
        ok: false,
        action,
        error:
          error?.message ||
          "Impossible de charger les données historiques",
        source: "SofaScore"
      },
      "no-store"
    );
  }
};
