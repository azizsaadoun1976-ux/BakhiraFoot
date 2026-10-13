"use strict";

const SOFA = "https://api.sofascore.com/api/v1";

const LEAGUES = {
  "english-premier-league": {
    aliases: ["premier-league"],
    countries: ["england"]
  },
  "spanish-la-liga": {
    aliases: ["la-liga", "laliga"],
    countries: ["spain"]
  },
  "italian-serie-a": {
    aliases: ["serie-a"],
    countries: ["italy"]
  },
  "bundesliga": {
    aliases: ["bundesliga"],
    countries: ["germany"]
  },
  "french-ligue-1": {
    aliases: ["ligue-1"],
    countries: ["france"]
  },
  "netherlands-eredivisie": {
    aliases: ["eredivisie"],
    countries: ["netherlands"]
  },
  "uefa-champions-league": {
    aliases: ["champions-league", "uefa-champions-league"]
  },
  "uefa-europa-league": {
    aliases: ["europa-league", "uefa-europa-league"]
  },
  "uefa-europa-conference-league": {
    aliases: [
      "uefa-europa-conference-league",
      "conference-league"
    ]
  },
  "the-botola-pro": {
    aliases: ["botola-pro", "botola-pro-1"],
    countries: ["morocco"]
  },
  "fifa-world-cup": {
    aliases: ["world-cup", "fifa-world-cup"]
  },
  "uefa-european-championship": {
    aliases: ["european-championship"]
  },
  "caf-africa-cup-of-nations": {
    aliases: ["africa-cup-of-nations"]
  },
  "afc-asian-cup": {
    aliases: ["asian-cup"]
  },
  "conmebol-copa-america": {
    aliases: ["copa-america"]
  },
  "uefa-nations-league": {
    aliases: ["uefa-nations-league", "nations-league"]
  },
  "english-football-league-championship": {
    aliases: ["championship"],
    countries: ["england"]
  },
  "italian-serie-b": {
    aliases: ["serie-b"],
    countries: ["italy"]
  },
  "brazilian-serie-a": {
    aliases: ["brasileirao-serie-a", "brasileiro-serie-a", "serie-a"],
    countries: ["brazil"]
  },
  "egyptian-premier-league": {
    aliases: ["premier-league"],
    countries: ["egypt"]
  },
  "saudi-professional-league": {
    aliases: ["saudi-pro-league", "saudi-professional-league"],
    countries: ["saudi-arabia"]
  },
  "portuguese-primera-liga": {
    aliases: ["primeira-liga", "liga-portugal"],
    countries: ["portugal"]
  },
  "turkish-super-league": {
    aliases: ["super-lig"],
    countries: ["turkey"]
  },
  "belgian-pro-league": {
    aliases: ["pro-league"],
    countries: ["belgium"]
  },
  "scottish-premiership": {
    aliases: ["premiership"],
    countries: ["scotland"]
  },
  "argentine-division-1": {
    aliases: ["liga-profesional", "primera-division"],
    countries: ["argentina"]
  }
};

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
     headers: {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0",
  "X-Requested-With": "XMLHttpRequest",
  Origin: "https://www.sofascore.com",
  Referer: "https://www.sofascore.com/"
}
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`SofaScore HTTP ${response.status}: ${text.slice(0, 180)}`);
    }

    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

function seasonStartYear(value) {
  const match = String(value || "").match(/\d{2,4}/);

  if (!match) return NaN;

  let year = Number(match[0]);

  if (match[0].length === 2) {
    year += year <= 60 ? 2000 : 1900;
  }

  return year;
}

function findTournament(tournaments, slug) {
  const config = LEAGUES[slug];

  if (!config) return null;

  const matches = tournaments.filter(tournament => {
    const tournamentSlug = normalize(tournament.slug);
    const tournamentName = normalize(tournament.name);

    return config.aliases.some(alias => {
      const key = normalize(alias);
      return tournamentSlug === key || tournamentName === key;
    });
  });

  if (!matches.length) return null;

  if (config.countries?.length) {
    const matchingCountry = matches.find(tournament => {
      const category = tournament.category || {};
      const countryValues = [
        category.name,
        category.slug,
        tournament.categoryName
      ].map(normalize);

      return config.countries.some(country =>
        countryValues.includes(normalize(country))
      );
    });

    if (matchingCountry) return matchingCountry;
  }

  return matches.length === 1 ? matches[0] : null;
}

function normalizePlayers(payload, stat) {
  const rows = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload?.topPlayers)
      ? payload.topPlayers
      : [];

  return rows
    .map(row => {
      const rawPlayer = row.player || row.athlete || {};
      const rawTeam = row.team || rawPlayer.team || {};
      const stats = row.statistics || {};

      const value = Number(
        row[stat] ??
        stats[stat] ??
        row.value ??
        row.total
      );

      const name =
        rawPlayer.name ||
        rawPlayer.fullName ||
        rawPlayer.shortName ||
        row.name ||
        "";

      if (!name || !Number.isFinite(value) || value <= 0) {
        return null;
      }

      const photo =
        rawPlayer.photo ||
        rawPlayer.image ||
        rawPlayer.photoUrl ||
        (rawPlayer.id
          ? `${SOFA}/player/${rawPlayer.id}/image`
          : "");

      const teamLogo =
        rawTeam.logo ||
        (rawTeam.id
          ? `${SOFA}/team/${rawTeam.id}/image`
          : "");

      const team = {
        name: rawTeam.name || rawTeam.shortName || "",
        logo: teamLogo
      };

      const player = {
        id: rawPlayer.id || "",
        name,
        full_name: name,
        photo,
        photo_url: photo,
        image: photo,
        logo: photo,
        team,
        [stat]: value
      };

      return {
        name,
        player_name: name,
        player,
        team,
        value,
        [stat]: value,
        appearances: Number(
          row.appearances ?? stats.appearances ?? 0
        )
      };
    })
    .filter(Boolean)
    .sort((a, b) => b[stat] - a[stat])
    .slice(0, 5);
}

module.exports = async (req, res) => {
  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "method_not_allowed"
    });
  }

  try {
    const slug = normalize(req.query?.competition);
    const year = Number(req.query?.season);

    if (!LEAGUES[slug] || !Number.isInteger(year)) {
      return res.status(400).json({
        error: "invalid_parameters",
        details: "Competition ou saison invalide."
      });
    }

    const config = await getJSON(
      `${SOFA}/config/unique-tournaments/en/football`
    );

    let tournaments = Array.isArray(config.uniqueTournaments)
      ? config.uniqueTournaments
      : [];

    let tournament = findTournament(tournaments, slug);

    if (!tournament) {
      const fallback = await getJSON(
        `${SOFA}/sport/football/unique-tournaments`
      );

      tournaments = Array.isArray(fallback.uniqueTournaments)
        ? fallback.uniqueTournaments
        : [];

      tournament = findTournament(tournaments, slug);
    }

    if (!tournament) {
      return res.status(404).json({
        error: "competition_not_found",
        details: `Compétition SofaScore introuvable : ${slug}`
      });
    }

    const seasonsPayload = await getJSON(
      `${SOFA}/unique-tournament/${tournament.id}/seasons`
    );

    const seasons = Array.isArray(seasonsPayload.seasons)
      ? seasonsPayload.seasons
      : [];

    const selectedSeason = seasons.find(season =>
      seasonStartYear(season.year || season.name) === year
    );

    if (!selectedSeason) {
      return res.status(404).json({
        error: "season_not_found",
        details: `Saison ${year} introuvable pour ${tournament.name}.`
      });
    }

    async function getLeaders(stat) {
      const url =
        `${SOFA}/unique-tournament/${tournament.id}` +
        `/season/${selectedSeason.id}/statistics` +
        `?limit=100&order=-${stat}&offset=0` +
        `&accumulation=total` +
        `&fields=goals%2Cassists%2Cappearances%2Crating`;

      const payload = await getJSON(url);

      return normalizePlayers(payload, stat);
    }

    const [goalsResult, assistsResult] = await Promise.allSettled([
      getLeaders("goals"),
      getLeaders("assists")
    ]);

    const goals =
      goalsResult.status === "fulfilled" ? goalsResult.value : [];

    const assists =
      assistsResult.status === "fulfilled" ? assistsResult.value : [];

    if (
      goalsResult.status === "rejected" &&
      assistsResult.status === "rejected"
    ) {
      throw new Error(
        goalsResult.reason?.message ||
        assistsResult.reason?.message ||
        "Impossible de charger les statistiques."
      );
    }

    return res.status(200).json({
      provider: "SofaScore",
      competition: tournament.name,
      season: year,
      data: {
        goals,
        assists
      }
    });
  } catch (error) {
    console.error(
      "BakhiraFoot historical players:",
      error?.message || error
    );

    return res.status(502).json({
      error: "historical_players_failed",
      details: error?.message || "Erreur inconnue"
    });
  }
};
