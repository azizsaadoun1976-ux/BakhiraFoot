
"use strict";

const ESPN = "https://sports.core.api.espn.com/v2/sports/soccer/leagues";

const LEAGUES = {
  "english-premier-league": "eng.1",
  "spanish-la-liga": "esp.1",
  "italian-serie-a": "ita.1",
  "german-bundesliga": "ger.1",
  "french-ligue-1": "fra.1",
  "netherlands-eredivisie": "ned.1",
  "uefa-champions-league": "uefa.champions",
  "uefa-europa-league": "uefa.europa",
  "uefa-europa-conference-league": "uefa.europa.conf",
  "english-football-league-championship": "eng.2",
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

async function getJSON(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0"
    },
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    throw new Error(`ESPN HTTP ${response.status}: ${url}`);
  }

  return response.json();
}

function refURL(ref) {
  if (!ref) return "";
  return String(ref).replace(/^http:\/\//, "https://");
}

async function resolveEntity(value) {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      return await getJSON(refURL(value));
    } catch {
      return {};
    }
  }

  if (value.$ref && !(
    value.displayName ||
    value.fullName ||
    value.name
  )) {
    try {
      return await getJSON(refURL(value.$ref));
    } catch {
      return value;
    }
  }

  return value;
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getCategories(payload) {
  const possible = [
    payload?.categories,
    payload?.leaders?.categories,
    payload?.leader?.categories
  ];

  for (const categories of possible) {
    if (Array.isArray(categories) && categories.length) {
      return categories;
    }
  }

  return [];
}

function findCategory(categories, stat) {
  const aliases = stat === "goals"
    ? ["goals", "totalgoals", "goalsscored"]
    : ["assists", "totalassists"];

  return categories.find(category => {
    const name = norm(category.name);
    const display = norm(category.displayName);

    if (stat === "goals" && (
      name.includes("owngoal") ||
      name.includes("goalsagainst")
    )) {
      return false;
    }

    return aliases.includes(name) ||
      aliases.includes(display);
  });
}

async function normalizeLeaders(category, stat) {
  const leaders = Array.isArray(category?.leaders)
    ? category.leaders
    : [];

  const rows = await Promise.all(
    leaders.slice(0, 5).map(async row => {
      const athlete = await resolveEntity(
        row.athlete || row.player
      );

      const athleteName =
        athlete.displayName ||
        athlete.fullName ||
        athlete.shortName ||
        athlete.name ||
        "";

      if (!athleteName) return null;

      const rawTeam = await resolveEntity(
        row.team || athlete.team
      );

      const team = {
        name:
          rawTeam.displayName ||
          rawTeam.name ||
          rawTeam.shortDisplayName ||
          "",
        logo:
          rawTeam.logos?.[0]?.href ||
          rawTeam.logo ||
          ""
      };

      const athleteId = athlete.id || "";
      const photo =
        athlete.headshot?.href ||
        athlete.headshot ||
        athlete.images?.[0]?.href ||
        (
          athleteId
            ? `https://a.espncdn.com/i/headshots/soccer/players/full/${athleteId}.png`
            : ""
        );

      const value = Number(
        row.value ??
        row.displayValue ??
        0
      );

      return {
        name: athleteName,
        player_name: athleteName,
        value,
        [stat]: value,
        appearances: 0,
        player: {
          id: athleteId,
          name: athleteName,
          full_name: athlete.fullName || athleteName,
          photo,
          photo_url: photo,
          image: photo,
          logo: photo,
          team,
          [stat]: value
        },
        team
      };
    })
  );

  return rows
    .filter(row => row && Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value);
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
    const competition = String(
      req.query?.competition || ""
    ).trim();

    const season = Number(req.query?.season);
    const league = LEAGUES[competition];

    if (!league || !Number.isInteger(season)) {
      return res.status(400).json({
        error: "invalid_parameters",
        competition,
        season
      });
    }

    const url =
      `${ESPN}/${league}/seasons/${season}/leaders` +
      "?lang=en&region=us";

    let payload = await getJSON(url);
    let categories = getCategories(payload);

    if (!categories.length && payload.$ref) {
      payload = await getJSON(refURL(payload.$ref));
      categories = getCategories(payload);
    }

    if (!categories.length) {
      return res.status(502).json({
        error: "espn_categories_missing",
        league,
        season,
        details: "ESPN did not return player-stat categories."
      });
    }

    const goalsCategory = findCategory(categories, "goals");
    const assistsCategory = findCategory(categories, "assists");

    const [goals, assists] = await Promise.all([
      normalizeLeaders(goalsCategory, "goals"),
      normalizeLeaders(assistsCategory, "assists")
    ]);

    return res.status(200).json({
      provider: "ESPN",
      competition,
      league,
      season,
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
