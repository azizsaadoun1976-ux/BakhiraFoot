(() => {
  "use strict";

  if (window.__bakhiraFootHistoryInstalled) return;
  window.__bakhiraFootHistoryInstalled = true;

  const TREE_URL =
    "https://api.github.com/repos/openfootball/football.json/git/trees/master?recursive=1";

  const RAW_BASE =
    "https://raw.githubusercontent.com/openfootball/football.json/master/";

  const MAX_FILES_PER_SEARCH = 40;

  let catalogPromise = null;
  let catalogTruncated = false;

  const COUNTRIES = {
    en: "Angleterre",
    de: "Allemagne",
    es: "Espagne",
    it: "Italie",
    fr: "France",
    nl: "Pays-Bas",
    pt: "Portugal",
    ma: "Maroc",
    sco: "Écosse",
    at: "Autriche",
    be: "Belgique",
    ch: "Suisse",
    tr: "Turquie",
    gr: "Grèce",
    br: "Brésil",
    ar: "Argentine",
    us: "États-Unis",
    mx: "Mexique",
    jp: "Japon",
    au: "Australie",
    cn: "Chine",
    ru: "Russie",
    ua: "Ukraine",
    pl: "Pologne",
    dk: "Danemark",
    se: "Suède",
    no: "Norvège",
    fi: "Finlande",
    ie: "Irlande",
    cz: "Tchéquie",
    hr: "Croatie",
    rs: "Serbie",
    ro: "Roumanie",
    hu: "Hongrie",
    bg: "Bulgarie",
    za: "Afrique du Sud",
    id: "Indonésie",
    th: "Thaïlande",
    in: "Inde",
    sa: "Arabie saoudite",
    kr: "Corée du Sud",
    eg: "Égypte",
    tn: "Tunisie",
    ng: "Nigeria",
    cl: "Chili",
    co: "Colombie",
    pe: "Pérou",
    ec: "Équateur",
    uy: "Uruguay",
    py: "Paraguay",
    ca: "Canada",
    cr: "Costa Rica",
    pa: "Panama",
    jm: "Jamaïque",
    world: "Monde",
    europe: "Europe",
    uefa: "Europe",
    fifa: "International"
  };

  const LEAGUES = {
    "en.1": "Premier League",
    "en.2": "Championship",
    "en.3": "League One",
    "en.4": "League Two",

    "de.1": "Bundesliga",
    "de.2": "2. Bundesliga",
    "de.3": "3. Liga",

    "es.1": "La Liga",
    "es.2": "Segunda División",

    "it.1": "Serie A",
    "it.2": "Serie B",

    "fr.1": "Ligue 1",
    "fr.2": "Ligue 2",

    "nl.1": "Eredivisie",
    "pt.1": "Primeira Liga",
    "ma.1": "Botola Pro 1",

    "sco.1": "Scottish Premiership",
    "at.1": "Austrian Bundesliga",
    "be.1": "Belgian Pro League",
    "ch.1": "Swiss Super League",

    "tr.1": "Süper Lig",
    "gr.1": "Greek Super League",

    "br.1": "Brasileirão Série A",
    "ar.1": "Primera División",
    "us.1": "Major League Soccer",
    "mx.1": "Liga MX",
    "jp.1": "J1 League",
    "au.1": "A-League",

    "europe.uefa-cl": "UEFA Champions League",
    "europe.uefa-el": "UEFA Europa League",
    "europe.uefa-ecl": "UEFA Conference League",
    "europe.uefa-euro": "UEFA Euro",
    "world.fifa-wc": "FIFA World Cup"
  };

  function countryCode(code) {
    return String(code || "")
      .split(".")[0]
      .toLowerCase();
  }

  function countryName(code) {
    const prefix = countryCode(code);

    return (
      COUNTRIES[prefix] ||
      `Autres (${prefix.toUpperCase()})`
    );
  }

  function leagueName(code) {
    return LEAGUES[code] || `Compétition (${code})`;
  }

  function seasonLabel(season) {
    return /^\d{4}-\d{2}$/.test(season)
      ? season.replace("-", "/")
      : season;
  }

  function el(tag, props = {}, text = "") {
    const node = document.createElement(tag);

    Object.entries(props).forEach(([key, value]) => {
      if (key === "className") {
        node.className = value;
      } else if (key === "type") {
        node.type = value;
      } else {
        node.setAttribute(key, value);
      }
    });

    if (text !== "") {
      node.textContent = text;
    }

    return node;
  }

  function addStyle() {
    const css = `
      #bf-history-open {
  position: static;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: 999px;
  padding: 9px 13px;
  background: #16a34a;
  color: #fff;
  font-weight: 800;
  box-shadow: 0 8px 20px #0002;
  cursor: pointer;
  font: 700 12px system-ui, sans-serif;
  white-space: nowrap;
}

      #bf-history-overlay {
        position: fixed;
        inset: 0;
        z-index: 10002;
        background: #030914cc;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      }

      #bf-history-overlay[hidden] {
        display: none !important;
      }

      #bf-history-panel {
        width: min(100%, 940px);
        max-height: 92vh;
        overflow: auto;
        background: #0d1b2a;
        color: #eef5fb;
        border: 1px solid #2c4357;
        border-radius: 18px;
        box-shadow: 0 24px 80px #0008;
        padding: 20px;
        box-sizing: border-box;
      }

      #bf-history-panel * {
        box-sizing: border-box;
      }

      .bfh-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .bfh-title {
        margin: 0;
        font-size: 22px;
        font-weight: 850;
      }

      .bfh-close {
        border: 1px solid #52677a;
        border-radius: 10px;
        background: #172b3e;
        color: #fff;
        padding: 8px 12px;
        cursor: pointer;
      }

      .bfh-desc {
        margin: 0 0 16px;
        color: #b6c6d5;
        font-size: 13px;
        line-height: 1.5;
      }

      .bfh-filters {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .bfh-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }

      .bfh-field label {
        font-size: 12px;
        font-weight: 750;
        color: #c7d5e2;
      }

      .bfh-field select,
      .bfh-field input {
        width: 100%;
        min-width: 0;
        border: 1px solid #3c5368;
        border-radius: 10px;
        padding: 11px 10px;
        background: #13263a;
        color: #f5f8fb;
        outline: none;
        font: inherit;
        font-size: 14px;
      }

      .bfh-searchrow {
        display: flex;
        gap: 10px;
        margin-top: 12px;
      }

      .bfh-searchrow input {
        flex: 1;
        min-width: 0;
        border: 1px solid #3c5368;
        border-radius: 10px;
        padding: 11px;
        background: #13263a;
        color: #fff;
        font: inherit;
      }

      .bfh-search {
        border: 0;
        border-radius: 10px;
        padding: 11px 16px;
        background: #16a34a;
        color: white;
        font-weight: 800;
        cursor: pointer;
      }

      .bfh-status {
        margin: 14px 0 8px;
        font-size: 13px;
        color: #c9d8e4;
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .bfh-results {
        display: grid;
        gap: 8px;
      }

      .bfh-match {
        display: grid;
        grid-template-columns: minmax(105px, 150px) 1fr minmax(64px, 90px);
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid #2b4154;
        border-radius: 12px;
        background: #102236;
      }

      .bfh-meta {
        font-size: 11px;
        color: #9db2c5;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }

      .bfh-teams {
        font-weight: 750;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      .bfh-score {
        text-align: center;
        font-size: 17px;
        font-weight: 900;
        color: #8cf0ad;
      }

      .bfh-source {
        font-size: 11px;
        color: #91a8bb;
        margin-top: 14px;
      }

      @media (max-width: 640px) {
       #bf-history-open {
  padding: 9px 12px;
  align-self: flex-start;
}

        .bfh-filters {
          grid-template-columns: 1fr;
        }

        .bfh-searchrow {
          flex-direction: column;
        }

        .bfh-search {
          width: 100%;
        }

        #bf-history-panel {
          padding: 14px;
          max-height: 94vh;
        }

        .bfh-title {
          font-size: 19px;
        }

        .bfh-match {
          grid-template-columns: 1fr auto;
          gap: 6px;
        }

        .bfh-meta {
          grid-column: 1 / -1;
        }

        .bfh-teams {
          grid-column: 1;
        }

        .bfh-score {
          grid-column: 2;
          grid-row: 2;
        }
      }
    `;

    const style = el("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function installUI() {
    addStyle();

    const openButton = el(
      "button",
      { id: "bf-history-open", type: "button" },
      "📚 Historique"
    );

    openButton.setAttribute("aria-haspopup", "dialog");
    openButton.setAttribute("aria-controls", "bf-history-overlay");

    const overlay = el("div", {
      id: "bf-history-overlay",
      hidden: "",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Recherche historique des matchs"
    });

    const panel = el("div", { id: "bf-history-panel" });
    const top = el("div", { className: "bfh-top" });

    top.appendChild(
      el(
        "h2",
        { className: "bfh-title" },
        "📚 Recherche des saisons historiques"
      )
    );

    const closeButton = el(
      "button",
      { className: "bfh-close", type: "button" },
      "Fermer ✕"
    );

    closeButton.addEventListener("click", () => {
      overlay.hidden = true;
    });

    top.appendChild(closeButton);
    panel.appendChild(top);

    panel.appendChild(
      el(
        "p",
        { className: "bfh-desc" },
        "Choisissez un pays, une compétition et une saison, puis recherchez un club. Archive publique sans clé API. La disponibilité dépend des fichiers historiques existants."
      )
    );

    const filters = el("div", { className: "bfh-filters" });

    const country = el("select", { id: "bfh-country" });
    const competition = el("select", { id: "bfh-competition" });
    const season = el("select", { id: "bfh-season" });

    const field1 = el("div", { className: "bfh-field" });
    field1.appendChild(el("label", { for: "bfh-country" }, "Pays"));
    field1.appendChild(country);

    const field2 = el("div", { className: "bfh-field" });
    field2.appendChild(el("label", { for: "bfh-competition" }, "Compétition"));
    field2.appendChild(competition);

    const field3 = el("div", { className: "bfh-field" });
    field3.appendChild(el("label", { for: "bfh-season" }, "Saison"));
    field3.appendChild(season);

    filters.append(field1, field2, field3);
    panel.appendChild(filters);

    const searchRow = el("div", { className: "bfh-searchrow" });

    const teamSearch = el("input", {
      id: "bfh-team",
      type: "search",
      placeholder: "Nom d’une équipe (facultatif)"
    });

    const searchButton = el(
      "button",
      { className: "bfh-search", type: "button" },
      "Rechercher les matchs"
    );

    searchRow.append(teamSearch, searchButton);
    panel.appendChild(searchRow);

    const status = el(
      "div",
      { className: "bfh-status", "aria-live": "polite" },
      "Ouvrez la recherche pour charger la liste des saisons disponibles."
    );

    const results = el("div", { className: "bfh-results" });

    const source = el(
      "div",
      { className: "bfh-source" },
      "Source : OpenFootball / football.json. Calendriers et résultats uniquement, pas les compositions ni les événements détaillés."
    );

    panel.append(status, results, source);
    overlay.appendChild(panel);
    const dateTitle = document.querySelector(
  "#scores .scores-date-title"
);

if (dateTitle) {
  dateTitle.appendChild(openButton);
} else {
  document.body.appendChild(openButton);
}

document.body.appendChild(overlay);

    openButton.addEventListener("click", () => {
      overlay.hidden = false;

      if (!catalogPromise) {
        loadCatalog(country, competition, season, status).catch(() => {});
      } else {
        catalogPromise
          .then(catalog => {
            if (!country.options.length) {
              populateAll(
                catalog,
                country,
                competition,
                season,
                status
              );
            }
          })
          .catch(() => {});
      }
    });

    overlay.addEventListener("click", event => {
      if (event.target === overlay) overlay.hidden = true;
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") overlay.hidden = true;
    });

    country.addEventListener("change", () => {
      if (!catalogPromise) return;

      catalogPromise.then(catalog => {
        populateCompetitions(catalog, country, competition);
        populateSeasons(catalog, country, competition, season);
      });
    });

    competition.addEventListener("change", () => {
      if (!catalogPromise) return;

      catalogPromise.then(catalog => {
        populateSeasons(catalog, country, competition, season);
      });
    });

    searchButton.addEventListener("click", () => {
      if (!catalogPromise) {
        status.textContent = "Chargement du catalogue historique…";

        loadCatalog(country, competition, season, status)
          .then(() => {
            return performSearch(
              country,
              competition,
              season,
              teamSearch,
              status,
              results
            );
          })
          .catch(() => {});

        return;
      }

      performSearch(
        country,
        competition,
        season,
        teamSearch,
        status,
        results
      );
    });

    teamSearch.addEventListener("keydown", event => {
      if (event.key === "Enter") searchButton.click();
    });
  }

  async function fetchCatalog() {
    const response = await fetch(TREE_URL, {
      headers: { Accept: "application/vnd.github+json" }
    });

    if (!response.ok) {
      throw new Error(
        `Catalogue GitHub indisponible (HTTP ${response.status}). Réessayez plus tard.`
      );
    }

    const json = await response.json();

    if (!Array.isArray(json.tree)) {
      throw new Error("Réponse du catalogue historique invalide.");
    }

    catalogTruncated = Boolean(json.truncated);

    const files = [];

    for (const entry of json.tree) {
      if (entry.type !== "blob") continue;

      const match = String(entry.path || "").match(
        /^(\d{4}(?:-\d{2})?)\/([a-z0-9._-]+)\.json$/i
      );

      if (!match) continue;

      const season = match[1];
      const code = match[2].toLowerCase();

      files.push({
        season,
        code,
        country: countryName(code),
        countryCode: countryCode(code),
        path: entry.path
      });
    }

    if (!files.length) {
      throw new Error("Aucun fichier de saison trouvé dans l’archive publique.");
    }

    files.sort(
      (a, b) =>
        b.season.localeCompare(a.season) ||
        a.code.localeCompare(b.code)
    );

    return files;
  }

  function loadCatalog(country, competition, season, status) {
    status.textContent =
      "Chargement de la liste des pays, compétitions et saisons…";

    catalogPromise = fetchCatalog();

    return catalogPromise
      .then(catalog => {
        populateAll(catalog, country, competition, season, status);

        const countries = new Set(
          catalog.map(file => file.countryCode)
        ).size;

        const comps = new Set(
          catalog.map(file => file.code)
        ).size;

        status.textContent =
          `Catalogue prêt : ${countries} groupes de pays, ` +
          `${comps} codes de compétition et ${catalog.length} ` +
          `fichiers saison/compétition disponibles.` +
          (catalogTruncated
            ? " Attention : GitHub a tronqué la liste retournée."
            : "") +
          " Choisissez les filtres puis lancez la recherche.";

        return catalog;
      })
      .catch(error => {
        catalogPromise = null;
        status.textContent = `Erreur : ${error.message}`;
        throw error;
      });
  }

  function setOptions(
    select,
    options,
    firstLabel,
    selectedValue = "all"
  ) {
    select.replaceChildren();
    select.appendChild(new Option(firstLabel, "all"));

    for (const item of options) {
      select.appendChild(new Option(item.label, item.value));
    }

    select.value = options.some(
      item => item.value === selectedValue
    )
      ? selectedValue
      : "all";
  }

  function populateAll(catalog, country, competition, season, status) {
    const countryValues = [
      ...new Map(
        catalog.map(file => [
          file.countryCode,
          {
            value: file.countryCode,
            label: file.country
          }
        ])
      ).values()
    ].sort((a, b) => a.label.localeCompare(b.label, "fr"));

    setOptions(
      country,
      countryValues,
      "Tous les pays",
      country.value || "all"
    );

    populateCompetitions(catalog, country, competition);
    populateSeasons(catalog, country, competition, season);

    if (status && status.textContent.startsWith("Chargement")) {
      status.textContent =
        "Catalogue prêt. Choisissez les filtres puis lancez la recherche.";
    }
  }

  function getFilteredFiles(catalog, country, competition) {
    return catalog.filter(
      file =>
        (country.value === "all" ||
          file.countryCode === country.value) &&
        (competition.value === "all" ||
          file.code === competition.value)
    );
  }

  function populateCompetitions(catalog, country, competition) {
    const filtered = catalog.filter(
      file =>
        country.value === "all" ||
        file.countryCode === country.value
    );

    const comps = [
      ...new Map(
        filtered.map(file => [
          file.code,
          {
            value: file.code,
            label: `${leagueName(file.code)} — ${countryName(file.code)}`
          }
        ])
      ).values()
    ].sort((a, b) => a.label.localeCompare(b.label, "fr"));

    setOptions(
      competition,
      comps,
      "Toutes les compétitions",
      "all"
    );
  }

  function populateSeasons(catalog, country, competition, season) {
    const filtered = getFilteredFiles(
      catalog,
      country,
      competition
    );

    const seasonValues = [
      ...new Set(filtered.map(file => file.season))
    ]
      .sort((a, b) => b.localeCompare(a))
      .map(value => ({
        value,
        label: seasonLabel(value)
      }));

    setOptions(
      season,
      seasonValues,
      "Toutes les saisons",
      "all"
    );
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async function performSearch(
    country,
    competition,
    season,
    teamSearch,
    status,
    results
  ) {
    results.replaceChildren();
    status.textContent = "Préparation de la recherche…";

    const catalog = await catalogPromise;

    const selectedFiles = catalog.filter(
      file =>
        (country.value === "all" ||
          file.countryCode === country.value) &&
        (competition.value === "all" ||
          file.code === competition.value) &&
        (season.value === "all" ||
          file.season === season.value)
    );

    if (!selectedFiles.length) {
      status.textContent =
        "Aucun fichier disponible pour cette combinaison. Essayez d’autres filtres.";
      return;
    }

    if (selectedFiles.length > MAX_FILES_PER_SEARCH) {
      status.textContent =
        `Cette sélection correspond à ${selectedFiles.length} fichiers. ` +
        `Pour éviter de charger trop de données d’un coup, ` +
        `choisissez une compétition ou une saison plus précise ` +
        `(maximum ${MAX_FILES_PER_SEARCH} fichiers par recherche).`;
      return;
    }

    status.textContent =
      `Chargement de ${selectedFiles.length} fichier(s) historique(s)…`;

    const allMatches = [];
    let failed = 0;
    let nextIndex = 0;

    const workers = Array.from(
      { length: Math.min(5, selectedFiles.length) },
      async () => {
        while (nextIndex < selectedFiles.length) {
          const index = nextIndex++;
          const file = selectedFiles[index];

          try {
            const data = await fetchJson(
              RAW_BASE + file.path
            );

            const matches = Array.isArray(data.matches)
              ? data.matches
              : [];

            for (const match of matches) {
              allMatches.push({
                ...match,
                _competition: data.name || leagueName(file.code),
                _country: file.country,
                _season: file.season,
                _code: file.code
              });
            }
          } catch (_) {
            failed++;
          }
        }
      }
    );

    await Promise.all(workers);

    const query = teamSearch.value
      .trim()
      .toLocaleLowerCase();

    const filteredMatches = allMatches
      .filter(match => {
        if (!query) return true;

        return (
          `${match.team1 || ""} ` +
          `${match.team2 || ""} ` +
          `${match._competition || ""} ` +
          `${match.round || ""}`
        )
          .toLocaleLowerCase()
          .includes(query);
      })
      .sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || ""))
      );

    const total = filteredMatches.length;
    const shown = filteredMatches.slice(0, 150);

    status.textContent =
      `${total} match(s) trouvé(s) dans ${selectedFiles.length} fichier(s).` +
      (failed
        ? ` ${failed} fichier(s) n’ont pas pu être chargés.`
        : "") +
      (total > shown.length
        ? ` Affichage des ${shown.length} premiers matchs.`
        : "");

    if (!shown.length) {
      results.appendChild(
        el(
          "div",
          { className: "bfh-meta" },
          "Aucun match ne correspond à cette recherche. Essayez un autre nom d’équipe ou une autre saison."
        )
      );
      return;
    }

    for (const match of shown) {
      const card = el("article", {
        className: "bfh-match"
      });

      const meta = el("div", {
        className: "bfh-meta"
      });

      meta.appendChild(
        el("div", {}, match.date || "Date inconnue")
      );

      meta.appendChild(
        el(
          "div",
          {},
          `${seasonLabel(match._season)} · ${match._country}`
        )
      );

      meta.appendChild(
        el(
          "div",
          {},
          match._competition || leagueName(match._code)
        )
      );

      const teams = el("div", {
        className: "bfh-teams"
      });

      teams.appendChild(
        el("div", {}, match.team1 || "Équipe 1")
      );

      teams.appendChild(
        el("div", {}, match.team2 || "Équipe 2")
      );

      const ft =
        match.score && Array.isArray(match.score.ft)
          ? match.score.ft
          : null;

      const scoreText =
        ft &&
        ft.length >= 2 &&
        ft[0] != null &&
        ft[1] != null
          ? `${ft[0]} - ${ft[1]}`
          : "—";

      const score = el(
        "div",
        { className: "bfh-score" },
        scoreText
      );

      card.append(meta, teams, score);
      results.appendChild(card);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      installUI,
      { once: true }
    );
  } else {
    installUI();
  }
})();
