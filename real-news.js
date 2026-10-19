/* BakhiraFoot — verified news feed from FRMF, CAF and BBC Sport */
(() => {
  "use strict";

  const NEWS_API = "/api/news";
  const sourceFallbacks = [
    { name: "BBC Sport Football", url: "https://www.bbc.com/sport/football" },
    { name: "Sky Sports Football", url: "https://www.skysports.com/football" },
    { name: "The Guardian Football", url: "https://www.theguardian.com/football" },
    { name: "UEFA", url: "https://www.uefa.com/news/" },
    { name: "ESPN Soccer", url: "https://www.espn.com/soccer/" },
    { name: "Google News Football Maroc", url: "https://news.google.com/search?q=football%20Maroc&hl=fr&gl=MA&ceid=MA:fr" },
    { name: "FRMF", url: "https://frmf.ma/fr/categorie/actualites" },
    { name: "CAF", url: "https://www.cafonline.com/fr/ligue-des-champions/news/" }
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
      <article class="bf-real-news-card" data-category="${esc(category)}">
        <a class="bf-news-image-wrap ${article.image && (article.image.startsWith("https://") || article.image.startsWith("http://")) ? "" : "no-image"}" href="${esc(article.url)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">${article.image && (article.image.startsWith("https://") || article.image.startsWith("http://")) ? `<img class="bf-news-image" src="${esc(article.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}<span class="bf-news-image-mark">BAKHIR<span>A</span>FOOT</span></a>
        <div class="bf-news-card-content">
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

  function categoryControls(articles) {
    const categories = ["Toutes", ...new Set(articles.map(item => item.category || "Monde"))];
    return '<div class="bf-news-filters" role="group" aria-label="Filtrer les actualités">' +
      categories.map((category, index) => '<button type="button" class="bf-news-filter ' + (index === 0 ? "active" : "") + '" data-news-filter="' + esc(category) + '">' + esc(category) + '</button>').join("") +
      '</div>';
  }

  function render(articles, updatedAt, sources = []) {
    if (!articles.length) return renderError();
    const homeCards = articles.slice(0, 6).map(articleCard).join("");
    const fullCards = articles.map(articleCard).join("");
    const note = '<div class="bf-news-update">Actualités récentes récupérées depuis des médias et flux RSS · Mise à jour : ' + esc(prettyDate(updatedAt) || "à l’instant") + '</div>';
    const sourceHtml = sources.length
      ? '<div class="bf-news-sources"><span>Sources consultées</span>' + sources.map(source => '<a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(source.name) + ' ↗</a>').join("") + '</div>'
      : sourceCards();
    const home = document.getElementById("homeNews");
    if (home) { home.innerHTML = note + homeCards + sourceHtml; home.dataset.newsLoaded = "true"; }
    const news = document.getElementById("newsGrid");
    if (news) { news.innerHTML = note + categoryControls(articles) + fullCards + sourceHtml; news.dataset.newsLoaded = "true"; }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-news-filter]");
    if (!button) return;
    const container = document.getElementById("newsGrid");
    if (!container) return;
    container.querySelectorAll("[data-news-filter]").forEach(item => item.classList.toggle("active", item === button));
    const category = button.dataset.newsFilter;
    container.querySelectorAll(".bf-real-news-card").forEach(card => { card.hidden = category !== "Toutes" && card.dataset.category !== category; });
  });

  async function load() {
    const targets = ["homeNews", "newsGrid"].map(id => document.getElementById(id)).filter(Boolean);
    targets.forEach(node => node.innerHTML = '<div class="bf-news-status">Chargement des actualités réelles…</div>');
    try {
      const response = await fetch(NEWS_API, { headers: { "Accept": "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("News API HTTP " + response.status);
      const data = await response.json();
      if (!Array.isArray(data.articles) || !data.articles.length) throw new Error("No articles returned");
      render(data.articles, data.updatedAt, Array.isArray(data.sources) ? data.sources : []);
    } catch (error) {
      console.warn("BAKHIRAFOOT REAL NEWS:", error);
      renderError();
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    #homeNews.cards,#newsGrid.cards{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch}
    #newsGrid .bf-news-filters{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:7px;margin:2px 0 10px}
    #newsGrid .bf-news-filter{padding:8px 12px;border:1px solid #2a4053;border-radius:8px;background:#102234;color:#a7bac9;font-size:11px;font-weight:850;cursor:pointer}
    #newsGrid .bf-news-filter.active{border-color:#2a805d;background:#15392e;color:#8af0c3}
    .bf-real-news-card[hidden]{display:none!important}
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
  style.textContent += `
    #homeNews.cards,#newsGrid.cards{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:16px}
    .bf-real-news-card{display:flex;flex-direction:column;overflow:hidden;border:1px solid #253c50!important;border-radius:13px!important;background:#0b1926!important;color:#eef5fb!important;box-shadow:0 8px 24px rgba(0,0,0,.12);transition:transform .18s,border-color .18s}
    .bf-real-news-card:hover{transform:translateY(-3px);border-color:#34745b!important}
    .bf-news-image-wrap{position:relative;display:flex;align-items:center;justify-content:center;height:174px;overflow:hidden;background:radial-gradient(circle at 75% 20%,#235440,#112c3a 45%,#091622);text-decoration:none}
    .bf-news-image-wrap:after{content:"";position:absolute;inset:40% 0 0;background:linear-gradient(transparent,rgba(7,17,27,.65));pointer-events:none}
    .bf-news-image-wrap.no-image{display:flex}
    .bf-news-image{display:block;width:100%;height:100%;object-fit:cover;transition:transform .35s}
    .bf-real-news-card:hover .bf-news-image{transform:scale(1.045)}
    .bf-news-image-mark{position:absolute;left:13px;bottom:12px;z-index:1;color:#d9f8e9;font-size:10px;font-weight:950;letter-spacing:.14em}
    .bf-news-image-mark span{color:#3ce3a2}
    .bf-news-card-content{display:flex;flex:1;flex-direction:column;padding:15px 16px 13px}
    .bf-real-news-card h3{margin:0 0 10px!important;color:#f4f8fc!important;font-size:15px!important;line-height:1.48!important}
    .bf-real-news-card p{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;margin:0 0 16px!important;color:#9db1c1!important;font-size:12px!important;line-height:1.7!important}
    .bf-real-news-bottom{margin-top:auto;padding-top:12px;border-top:1px solid #22384a}
    #newsGrid .bf-news-filters{grid-column:1/-1}
    .bf-real-news-card[hidden]{display:none!important}
    @media(max-width:900px){#homeNews.cards,#newsGrid.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.bf-news-image-wrap{height:155px}}
    @media(max-width:600px){#homeNews.cards,#newsGrid.cards{grid-template-columns:1fr;gap:12px}.bf-news-image-wrap{height:195px}}
  `;
  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", load);
})();
