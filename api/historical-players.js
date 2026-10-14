"use strict";

const ESPN =
  "https://site.web.api.espn.com/apis/common/v3/sports/soccer";

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

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function numberValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : null;
}

async function getJSON(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.espn.com/"
    },
    signal: AbortSignal.timeout(15000)
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `ESPN HTTP ${response.status}: ${url}`
    );
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`ESPN returned invalid JSON: ${url}`);
  }
}

function findStatValue(root, stat) {
 const aliases = stat === "goals"
    ? [
        "goals",
        "goal",
        "totalgoals",
        "goalsscored",
        "goalscored"
      ]
    : [
        "assists",
        "assist",
        "totalassists",
        "goalassists",
        "goalassist"
      ];

  const labels = stat === "goals"
    ? ["g", "gls", "goals"]
    : ["a", "ast", "assists"];

  const visited = new Set();

  function walk(node, depth = 0) {
    if (
      !node ||
      typeof node !== "object" ||
      depth > 14 ||
      visited.has(node)
    ) {
      return null;
    }

    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const result = walk(item, depth + 1);
        if (result !== null) return result;
      }

      return null;
    }

    // ESPN may return names/labels and totals as parallel arrays.
    for (const field of ["names", "labels"]) {
      const names = node[field];
      const totals = node.totals;

      if (Array.isArray(names) && Array.isArray(totals)) {
        const index = names.findIndex(name => {
          const key = normalize(name);
          return aliases.includes(key) ||
            labels.includes(key);
        });

        if (index >= 0 && index < totals.length) {
          const result = numberValue(totals[index]);

          if (result !== null) return result;
        }
      }
    }

    // ESPN may also return individual statistic objects.
    for (const [key, value] of Object.entries(node)) {
      if (aliases.includes(normalize(key))) {
        const direct = numberValue(value);

        if (direct !== null) return direct;

        if (value && typeof value === "object") {
          for (const field of [
            "value",
            "total",
            "displayValue",
            "displayValueText"
          ]) {
            const result = numberValue(value[field]);

            if (result !== null) return result;
          }
        }
      }
    }

    const ownName = normalize(
      node.name || node.displayName || node.shortDisplayName
    );

    if (aliases.includes(ownName) || labels.includes(ownName)) {
      for (const field of [
        "value",
        "total",
        "displayValue",
        "displayValueText"
      ]) {
        const result = numberValue(node[field]);

        if (result !== null) return result;
      }

      if (Array.isArray(node.totals) && node.totals.length) {
        const result = numberValue(node.totals[0]);

        if (result !== null) return result;
      }
    }

    for (const value of Object.values(node)) {
      const result = walk(value, depth + 1);

      if (result !== null) return result;
    }

    return null;
  }

  return walk(root);
}

function getRows(payload) {
  const candidates = [
    payload?.athletes,
    payload?.results,
    payload?.leaders,
    payload?.items,
    payload?.entries
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    if (Array.isArray(candidate?.items)) {
      return candidate.items;
    }

    if (Array.isArray(candidate?.athletes)) {
      return candidate.athletes;
    }
  }

  return [];
}

function normalizeRows(rows, stat) {
  const result = [];

  for (const row of rows) {
    const athlete =
      row.athlete ||
      row.player ||
      row;

    const name =
      athlete.displayName ||
      athlete.fullName ||
      athlete.shortName ||
      athlete.name ||
      "";

    const value = findStatValue(row, stat);

    if (!name || value === null || value <= 0) {
      continue;
    }

    const sourceTeam =
      row.team ||
      athlete.team ||
      {};

    const team = {
      name:
        sourceTeam.displayName ||
        sourceTeam.name ||
        sourceTeam.shortDisplayName ||
        "",
      logo:
        sourceTeam.logo ||
        sourceTeam.logos?.[0]?.href ||
        ""
    };

    const id = athlete.id || "";

    const photo =
      athlete.headshot?.href ||
      athlete.headshot ||
      athlete.images?.[0]?.href ||
      (
        id
          ? `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png`
          : ""
      );

    result.push({
      name,
      player_name: name,
      value,
      [stat]: value,
      appearances: Number(
        findStatValue(row, "appearances") || 0
      ),
      player: {
        id,
        name,
        full_name: athlete.fullName || name,
        photo,
        photo_url: photo,
        image: photo,
        logo: photo,
        team,
        [stat]: value
      },
      team
    });
  }

  return result
    .sort((a, b) => b.value - a.value)
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

    
async function getLeaders(stat) {
  const aliases = stat === "goals"
    ? ["goals", "totalgoals", "goalscored"]
    : ["assists", "totalassists", "goalassists"];

  const shortLabels = stat === "goals"
    ? ["g", "gls"]
    : ["a", "ast"];

  const normalize = value =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const toNumber = value => {
    const raw = value?.value ??
      value?.total ??
      value?.displayValue ??
      value;

    if (raw === null || raw === undefined || raw === "") {
      return null;
    }

    const result = Number(String(raw).replace(/,/g, ""));
    return Number.isFinite(result) ? result : null;
  };

  const attempts = [
    { category: "offensive", sort: `${stat}:desc` },
    { category: "scoring", sort: `${stat}:desc` },
    { category: "offensive", sort: `offensive.${stat}:desc` },
    { category: "scoring", sort: `scoring.${stat}:desc` }
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const params = new URLSearchParams({
        region: "us",
        lang: "en",
        contentorigin: "espn",
        category: attempt.category,
        season: String(season),
        seasontype: "2",
        page: "1",
        limit: "50",
        sort: attempt.sort
      });

      const url =
        `${ESPN}/${league}/statistics/byathlete?${params}`;

      const payload = await getJSON(url);
      const rows = Array.isArray(payload.athletes)
        ? payload.athletes
        : [];

      const metadata = Array.isArray(payload.categories)
        ? payload.categories
        : [];

      const players = rows.map(row => {
        const athlete = row.athlete || row.player || row;
        const name =
          athlete.displayName ||
          athlete.fullName ||
          athlete.shortName ||
          athlete.name ||
          "";

        const categories = Array.isArray(row.categories)
          ? row.categories
          : [];

        const category =
          categories.find(item =>
            /scoring|offensive/i.test(
              `${item.name || ""} ${item.displayName || ""}`
            )
          ) ||
          categories.find(item => {
            const names = item.names || [];
            return names.some(name =>
              aliases.includes(normalize(name))
            );
          }) ||
          categories[0] ||
          row.statistics ||
          row.stats ||
          {};

        const meta = metadata.find(item =>
          normalize(item.name) === normalize(category.name)
        ) || metadata.find(item =>
          /scoring|offensive/i.test(
            `${item.name || ""} ${item.displayName || ""}`
          )
        ) || {};

        const names = category.names || meta.names || [];
        const labels = category.labels || meta.labels || [];
        const totals =
          category.totals ||
          category.values ||
          category.statistics?.totals ||
          [];

        let index = names.findIndex(name =>
          aliases.includes(normalize(name))
        );

        if (index < 0) {
          index = labels.findIndex(label =>
            shortLabels.includes(normalize(label))
          );
        }

        let value = index >= 0
          ? toNumber(totals[index])
          : null;

        if (value === null) {
          for (const key of aliases) {
            if (row[key] !== undefined) {
              value = toNumber(row[key]);
              if (value !== null) break;
            }
          }
        }

        if (!name || value === null || value <= 0) {
          return null;
        }

        const sourceTeam = row.team || athlete.team || {};
        const team = {
          name:
            sourceTeam.displayName ||
            sourceTeam.name ||
            sourceTeam.shortDisplayName ||
            "",
          logo:
            sourceTeam.logos?.[0]?.href ||
            sourceTeam.logo ||
            ""
        };

        const photo =
          athlete.headshot?.href ||
          athlete.headshot?.url ||
          (typeof athlete.headshot === "string"
            ? athlete.headshot
            : "") ||
          "";

        return {
          name,
          player_name: name,
          value,
          [stat]: value,
          player: {
            id: athlete.id || "",
            name,
            full_name: athlete.fullName || name,
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
      .filter(Boolean)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

      if (players.length) {
        return players;
      }

      lastError = new Error(
        `ESPN returned no ${stat} rows for ${league}, season ${season}.`
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Aucun ${stat} trouvé.`);
}
