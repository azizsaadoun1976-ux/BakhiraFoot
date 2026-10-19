/* BakhiraFoot — verified news feed from FRMF, CAF and BBC Sport */
(() => {
  "use strict";

  const NEWS_API = "/api/news";
  const sourceFallbacks = [
    { name: "FRMF", url: "https://frmf.ma/fr/categorie/actualites" },
    { name: "CAF", url: "https://www.cafonline.com/fr/ligue-des-champions/news/" },
    { name: "BBC Sport", url: "https://www.bbc.com/sport/football" }
  ];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function prettyDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "short", year: "numeric"
    }).format(date);
  }

  function articleCard(article, index) {
    const source = article.source || "Source officielle";
    const category = article.category || "Football";
    const date = prettyDate(article.date);
    const description = article.description && article.description !== article.title
      ? article.description
      : "Consultez l’article original pour lire les informations complètes et les détails.";
    return `
      <article class="bf-real-news-card">
        <div class="bf-real-news-top">
          <span class="bf-real-news-category">${esc(category)}</span>
          ${date ? `<time>${esc(date)}</time>` : ""}
        </div>
        <div class="bf-real-news-number">${String(index + 1).padStart(2, "0")}</div>
        <h3><a href="${esc(article.url)}" target="_blank" rel="noopener noreferrer">${esc(article.title)}</a></h3>
        <p>${esc(description)}</p>
        <div class="bf-real-news-bottom">
          <span>Source : <strong>${esc(source)}</strong></span>
          <a href="${esc(article.url)}" target="_blank" rel="noopener noreferrer" aria-label="Lire l’article original">Lire l’article ↗</a>
        </div>
      </article>`;
  }

  function sourceCards() {
    return `
      <div class="bf-news-sources">
        <span>Sources football</span>
        ${sourceFallbacks.map(source => `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.name} ↗</a>`).join("")}
      </div>`;
  }

  function renderError() {
    const message = `
      <div class="bf-news-status">
        <strong>Les actualités ne sont pas disponibles pour le moment.</strong>
        <p>On n’affiche pas de faux articles. Consultez directement les sources officielles ci-dessous.</p>
        ${sourceCards()}
      </div>`;
    ["homeNews", "newsGrid"].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.innerHTML = message;
    });
  }

  function render(articles, updatedAt) {
    if (!articles.length) return renderError();
    const cards = articles.map(articleCard).join("");
    const note = `<div class="bf-news-update">Articles récupérés depuis les sites des médias · Mise à jour : ${esc(prettyDate(updatedAt))}</div>`;
    ["homeNews", "newsGrid"].forEach(id => {
      const node = document.getElementById(id);
      if (node) {
        node.innerHTML = note + cards + sourceCards();
        node.dataset.newsLoaded = "true";
      }
    });
  }

  async function load() {
    const targets = ["homeNews", "newsGrid"].map(id => document.getElementById(id)).filter(Boolean);
    targets.forEach(node => node.innerHTML = '<div class="bf-news-status">Chargement des actualités réelles…</div>');
    try {
      const response = await fetch(NEWS_API, { headers: { "Accept": "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("News API HTTP " + response.status);
      const data = await response.json();
      if (!Array.isArray(data.articles) || !data.articles.length) throw new Error("No articles returned");
      render(data.articles, data.updatedAt);
    } catch (error) {
      console.warn("BAKHIRAFOOT REAL NEWS:", error);
      renderError();
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    #homeNews.cards,#newsGrid.cards{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch}
    .bf-real-news-card{position:relative;display:flex;flex-direction:column;min-width:0;min-height:255px;padding:18px!important;overflow:hidden;border:1px solid #263e51!important;border-radius:12px!important;background:linear-gradient(155deg,#102336,#0b1926)!important;color:#eef5fb!important}
    .bf-real-news-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#39e6a5}
    .bf-real-news-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:16px}
    .bf-real-news-category{display:inline-flex;max-width:72%;padding:5px 8px;border:1px solid #285542;border-radius:5px;background:#123629;color:#8af0c3;font-size:9px;font-weight:900}
    .bf-real-news-top time{color:#8298aa;font-size:9px}
    .bf-real-news-number{color:#39e6a5;font-size:11px;font-weight:950;letter-spacing:.12em}
    .bf-real-news-card h3{margin:7px 0 10px!important;color:#f4f8fc!important;font-size:15px!important;line-height:1.45!important}
    .bf-real-news-card h3 a{color:inherit!important;text-decoration:none!important}
    .bf-real-news-card h3 a:hover{color:#8af0c3!important}
    .bf-real-news-card p{margin:0 0 18px!important;color:#9db1c1!important;font-size:12px!important;line-height:1.75!important}
    .bf-real-news-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:12px;border-top:1px solid #22384a;color:#8097a9;font-size:9px}
    .bf-real-news-bottom strong{color:#d3e0e9}
    .bf-real-news-bottom a{color:#7ce8b9!important;text-decoration:none!important;font-size:10px;font-weight:900;white-space:nowrap}
    .bf-news-update{grid-column:1/-1;color:#8097a9;font-size:10px;padding:2px 0 5px}
    .bf-news-sources{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:5px;padding:12px;border:1px solid #23394c;border-radius:10px;background:#0c1b29;color:#8298aa;font-size:10px}
    .bf-news-sources>span{font-weight:900;color:#e1eaf0;margin-right:3px}
    .bf-news-sources a{padding:6px 8px;border:1px solid #2b4255;border-radius:6px;color:#a9f2d3!important;text-decoration:none!important}
    .bf-news-status{grid-column:1/-1;padding:20px;border:1px solid #293e51;border-radius:10px;background:#0d1b29;color:#eaf2f7}
    .bf-news-status p{color:#94a9ba}
    @media(max-width:900px){#homeNews.cards,#newsGrid.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:600px){#homeNews.cards,#newsGrid.cards{grid-template-columns:1fr}.bf-real-news-card{min-height:0}}
  `;
  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", load);
})();
