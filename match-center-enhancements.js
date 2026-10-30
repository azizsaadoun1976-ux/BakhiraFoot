/* BakhiraFoot Match Centre extensions
 * Adds anchored navigation and sourced match context without replacing the working fixture renderer.
 */
(() => {
  "use strict";

  if (window.BFMatchEnhancements) return;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
  const norm = value => String(value ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const first = (...values) => values.find(v => v !== null && v !== undefined && v !== "") ?? "";
  const dateLabel = value => {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? "—" :
      date.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
  };

  function style() {
    if (document.getElementById("bfMatchEnhancementsStyle")) return;
    const node = document.createElement("style");
    node.id = "bfMatchEnhancementsStyle";
    node.textContent = `
      #bf-new-match-safe-modal .bfmc-context-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #bf-new-match-safe-modal .bfmc-context-columns>section{min-width:0;padding:10px;border:1px solid rgba(90,135,155,.2);border-radius:10px;background:rgba(7,22,32,.38)}
      #bf-new-match-safe-modal .bfmc-context-columns h4{margin:0 0 8px;color:#a4edcf;font-size:11px}
      #bf-new-match-safe-modal .bfmc-result-list{display:grid;gap:7px}
      #bf-new-match-safe-modal .bfmc-result{display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px;border:1px solid rgba(105,145,168,.16);border-radius:8px;background:rgba(13,31,43,.78);color:#edf6fb}
      #bf-new-match-safe-modal .bfmc-result time{color:#91a8b9;font-size:8px}
      #bf-new-match-safe-modal .bfmc-result-teams{display:grid;gap:3px;min-width:0;font-size:9px;font-weight:800}
      #bf-new-match-safe-modal .bfmc-result-teams small{color:#839bad;font-size:8px;font-weight:600}
      #bf-new-match-safe-modal .bfmc-result-score{font-size:10px;font-weight:950;white-space:nowrap}
      #bf-new-match-safe-modal .bfmc-caption{margin:0 0 9px;color:#8da7b8;font-size:9px}
      #bf-new-match-safe-modal .bfmc-table-wrap{width:100%;overflow-x:auto;border:1px solid rgba(95,137,159,.2);border-radius:9px}
      #bf-new-match-safe-modal .bfmc-table{width:100%;min-width:520px;border-collapse:collapse;color:#dce8f0;font-size:9px}
      #bf-new-match-safe-modal .bfmc-table th,#bf-new-match-safe-modal .bfmc-table td{padding:8px 9px;border-bottom:1px solid rgba(110,150,172,.14);text-align:center;white-space:nowrap}
      #bf-new-match-safe-modal .bfmc-table th{background:#102b3c;color:#8eb6ce;font-size:8px}
      #bf-new-match-safe-modal .bfmc-table td:nth-child(2){text-align:left}
      #bf-new-match-safe-modal .bfmc-table tr.is-target{background:rgba(20,112,77,.22)}
      #bf-new-match-safe-modal .bfmc-standing-team{display:flex;align-items:center;gap:6px}
      #bf-new-match-safe-modal .bfmc-standing-team img{width:20px;height:20px;object-fit:contain}
      #bf-new-match-safe-modal .bfmc-highlights,#bf-new-match-safe-modal .bfmc-news{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #bf-new-match-safe-modal .bfmc-highlight,#bf-new-match-safe-modal .bfmc-news-card{display:flex;align-items:center;gap:10px;min-width:0;padding:10px;border:1px solid rgba(91,144,168,.2);border-radius:9px;background:rgba(12,31,44,.78);color:#e8f3f9;text-decoration:none}
      #bf-new-match-safe-modal .bfmc-highlight>span:first-child{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:8px;background:#143c42;color:#7ce5ba}
      #bf-new-match-safe-modal .bfmc-highlight strong,#bf-new-match-safe-modal .bfmc-news-card strong{display:block;color:#eaf5fb;font-size:9px;line-height:1.4}
      #bf-new-match-safe-modal .bfmc-news-card img,#bf-new-match-safe-modal .bfmc-news-placeholder{width:76px;height:58px;flex:0 0 76px;object-fit:cover;border-radius:6px;background:#163449}
      #bf-new-match-safe-modal .bfmc-news-placeholder{display:grid;place-items:center;color:#8bb1c8;font-size:18px}
      #bf-new-match-safe-modal .bfmc-news-card small{display:block;margin-bottom:4px;color:#8da8bb;font-size:7px}
      #bf-new-match-safe-modal .bfmc-news-card em{display:block;margin-top:5px;color:#72dcb2;font-size:8px;font-style:normal}
      #bf-new-match-safe-modal .bfmc-comment-form{display:grid;gap:7px;margin-bottom:12px}
      #bf-new-match-safe-modal .bfmc-comment-form label{color:#b6c9d6;font-size:9px;font-weight:850}
      #bf-new-match-safe-modal .bfmc-comment-form input,#bf-new-match-safe-modal .bfmc-comment-form textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid rgba(117,157,179,.25);border-radius:8px;background:#081c2a;color:#eff7fb;font:inherit;font-size:10px}
      #bf-new-match-safe-modal .bfmc-comment-form textarea{resize:vertical}
      #bf-new-match-safe-modal .bfmc-comment-submit{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      #bf-new-match-safe-modal .bfmc-comment-submit button{padding:9px 14px;border:1px solid #228a64;border-radius:8px;background:#0b7752;color:#fff;font-size:9px;font-weight:900;cursor:pointer}
      #bf-new-match-safe-modal .bfmc-comment-submit button:disabled{opacity:.5;cursor:wait}
      #bf-new-match-safe-modal .bfmc-comment-status{color:#91a9b9;font-size:8px}
      #bf-new-match-safe-modal .bfmc-comment-status.is-error{color:#ff9da7}
      #bf-new-match-safe-modal .bfmc-vote{display:grid;gap:8px;margin:0 0 12px;padding:11px;border:1px solid rgba(77,151,129,.25);border-radius:9px;background:rgba(9,40,37,.26)}
      #bf-new-match-safe-modal .bfmc-vote-head{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#dcefe7;font-size:9px;font-weight:900}
      #bf-new-match-safe-modal .bfmc-vote-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      #bf-new-match-safe-modal .bfmc-vote-buttons button{padding:8px;border:1px solid rgba(108,160,185,.24);border-radius:7px;background:#102b3b;color:#dbeaf2;font-size:9px;font-weight:850;cursor:pointer}
      #bf-new-match-safe-modal .bfmc-vote-buttons button[aria-pressed="true"]{border-color:#31b781;background:#0b563e;color:#fff}
      #bf-new-match-safe-modal .bfmc-vote-results{display:grid;gap:5px}
      #bf-new-match-safe-modal .bfmc-vote-result{display:grid;grid-template-columns:1fr 36px;gap:8px;align-items:center;color:#a9c0cf;font-size:8px}
      #bf-new-match-safe-modal .bfmc-vote-track{height:5px;grid-column:1/-1;overflow:hidden;border-radius:5px;background:#1a3341}
      #bf-new-match-safe-modal .bfmc-vote-track i{display:block;height:100%;background:linear-gradient(90deg,#1a9b69,#5be3a4)}
      #bf-new-match-safe-modal .bfmc-vote-status{color:#91a9b9;font-size:8px}
      #bf-new-match-safe-modal .bfmc-vote-status.is-error{color:#ff9da7}
      #bf-new-match-safe-modal .bfmc-comment{margin-top:7px;padding:10px;border:1px solid rgba(103,143,164,.18);border-radius:8px;background:rgba(9,27,40,.76)}
      #bf-new-match-safe-modal .bfmc-comment header{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
      #bf-new-match-safe-modal .bfmc-comment strong{color:#dcebf4;font-size:9px}
      #bf-new-match-safe-modal .bfmc-comment time{color:#829bad;font-size:8px}
      #bf-new-match-safe-modal .bfmc-comment p{margin:6px 0 0;color:#c3d2dc;font-size:10px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
      #bf-new-match-safe-modal [data-bf-match-panel]{scroll-margin-top:68px}
      @media(max-width:700px){
        #bf-new-match-safe-modal .bfmc-context-columns{grid-template-columns:1fr}
        #bf-new-match-safe-modal .bfmc-highlights,#bf-new-match-safe-modal .bfmc-news{grid-template-columns:1fr}
        #bf-new-match-safe-modal .bfmc-result{grid-template-columns:55px minmax(0,1fr) auto;padding:7px;gap:6px}
        #bf-new-match-safe-modal .bfmc-result time{font-size:7px}
        #bf-new-match-safe-modal .bfmc-table{min-width:470px}
      }
      body:not(.dark) #bf-new-match-safe-modal .bfmc-context-columns>section{background:#f2f7fa;border-color:#dae5ec}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-result,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-highlight,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-news-card,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment{background:#f7fbfd;border-color:#dbe6ed;color:#1b3040}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-result-teams,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-news-card strong,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment strong{color:#20394b}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment-form input,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment-form textarea{background:#fff;color:#182f40;border-color:#d4e0e8}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-table{color:#20394b}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-table th{background:#eaf2f7;color:#4b6f84}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment p{color:#40596b}
    `;
    document.head.appendChild(node);
  }

  function addPanel(content, id, title, html) {
    const panel = document.createElement("section");
    panel.id = id;
    panel.dataset.bfMatchPanel = "1";
    panel.className = "bf-new-safe-section";
    const heading = document.createElement("div");
    heading.className = "bf-new-safe-title";
    heading.textContent = title;
    const body = document.createElement("div");
    body.innerHTML = html;
    panel.append(heading, body);
    content.appendChild(panel);
    return body;
  }

  function formatRows(items, emptyText) {
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) return '<div class="bf-new-safe-empty">' + esc(emptyText) + '</div>';
    return '<div class="bfmc-result-list">' + rows.map(item =>
      '<article class="bfmc-result"><time>' + esc(dateLabel(item.date)) + '</time>' +
      '<div class="bfmc-result-teams"><strong>' + esc(item.home || "Équipe") + '</strong>' +
      '<small>' + esc(item.competition || item.status || "Football") + '</small>' +
      '<strong>' + esc(item.away || "Équipe") + '</strong></div>' +
      '<b class="bfmc-result-score">' + esc(item.score || "—") + '</b></article>'
    ).join("") + '</div>';
  }

  function renderStandings(rows, homeName, awayName) {
    const all = Array.isArray(rows) ? rows : [];
    if (!all.length) return '<div class="bf-new-safe-empty">Classement non disponible pour cette compétition ou cette saison.</div>';
    const normalize = value => norm(value).replace(/[^a-z0-9]/g,"");
    const target = name => normalize(name) === normalize(homeName) || normalize(name) === normalize(awayName);
    const top = all.slice(0,8);
    const extras = all.filter(row => target(row.team) && !top.some(item => String(item.team) === String(row.team)));
    const list = [...top,...extras].slice(0,12);
    return '<div class="bfmc-table-wrap"><table class="bfmc-table"><thead><tr><th>#</th><th>Équipe</th><th>MJ</th><th>V</th><th>N</th><th>D</th><th>Pts</th></tr></thead><tbody>' +
      list.map(row => '<tr class="' + (target(row.team) ? "is-target" : "") + '"><td>' + esc(row.rank || "—") +
        '</td><td><span class="bfmc-standing-team">' + (row.logo ? '<img src="' + esc(row.logo) + '" alt="" loading="lazy">' : "") +
        esc(row.team || "Équipe") + '</span></td><td>' + esc(row.played || "—") + '</td><td>' + esc(row.won || "—") +
        '</td><td>' + esc(row.drawn || "—") + '</td><td>' + esc(row.lost || "—") + '</td><td><strong>' +
        esc(row.points || "—") + '</strong></td></tr>').join("") + '</tbody></table></div>';
  }

  function findHighlights(details) {
    const result = [], seen = new Set(), queue = [{value:details,depth:0}];
    const visited = new Set();
    while (queue.length && visited.size < 900) {
      const current = queue.shift(), node = current.value;
      if (!node || typeof node !== "object" || visited.has(node) || current.depth > 5) continue;
      visited.add(node);
      if (Array.isArray(node)) {
        node.forEach(value => { if (value && typeof value === "object") queue.push({value,depth:current.depth+1}); });
        continue;
      }
      for (const [key,value] of Object.entries(node)) {
        if (/highlight|replay|clip|video/i.test(key)) {
          const url = typeof value === "string" ? value :
            value && typeof value === "object" ? (value.url || value.href || value.embedUrl || value.embed_url || value.src || value.link) : "";
          const label = value && typeof value === "object" ? (value.title || value.name || value.label || key) : key;
          try {
            const parsed = new URL(String(url || ""));
            if (/^https?:$/.test(parsed.protocol) && !seen.has(parsed.href)) {
              seen.add(parsed.href);
              result.push({url:parsed.href,label:String(label || "Voir le résumé vidéo")});
            }
          } catch (_) {}
        }
        if (value && typeof value === "object") queue.push({value,depth:current.depth+1});
      }
    }
    return result.slice(0,6);
  }

  function setupTabs(content, nav) {
    nav.querySelectorAll("[data-bf-match-tab]").forEach(button => {
      button.addEventListener("click", () => {
        const target = content.querySelector("#" + button.dataset.bfMatchTab);
        if (!target) return;
        nav.querySelectorAll("[data-bf-match-tab]").forEach(item =>
          item.setAttribute("aria-pressed", item === button ? "true" : "false")
        );
        target.scrollIntoView({behavior:"smooth",block:"start"});
      });
    });
  }

  async function loadContext(content, args, recentNode, h2hNode, standingsNode) {
    const params = new URLSearchParams({
      home: String(args.home.name || ""),
      away: String(args.away.name || ""),
      competition: String(args.competition || ""),
      date: String(args.date || "")
    });
    const token = String(args.key || "");
    content.dataset.bfMatchContextToken = token;
    try {
      const url = "/api/match-center?" + params.toString();
      const data = window.BFAPI && typeof window.BFAPI.getJSON === "function"
        ? await window.BFAPI.getJSON(url,{ttlMs:180000,staleIfErrorMs:600000,timeoutMs:16000})
        : await fetch(url,{headers:{Accept:"application/json"},cache:"no-store"}).then(async response => {
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.error || "Match context unavailable");
            return payload;
          });
      if (!content.isConnected || content.dataset.bfMatchContextToken !== token) return;

      recentNode.innerHTML = '<div class="bfmc-context-columns"><section><h4>' + esc(args.home.name) +
        '</h4>' + formatRows(data.homeRecent,"Historique récent non disponible pour cette équipe.") +
        '</section><section><h4>' + esc(args.away.name) + '</h4>' +
        formatRows(data.awayRecent,"Historique récent non disponible pour cette équipe.") + '</section></div>';

      h2hNode.innerHTML = formatRows(data.headToHead,"Aucune confrontation directe récente n’a été trouvée.");
      const table = data.standings || {};
      standingsNode.innerHTML = (table.league
        ? '<p class="bfmc-caption">' + esc(table.league) + (table.season ? " · " + esc(table.season) : "") + '</p>'
        : "") + renderStandings(table.rows,args.home.name,args.away.name);

      const meta = data.metadata || {};
      const values = {venue:meta.venue,referee:meta.referee,channel:meta.broadcastChannel,commentator:meta.commentator};
      Object.entries(values).forEach(([key,value]) => {
        if (!value) return;
        const target = content.querySelector('[data-bf-meta-value="' + key + '"]');
        if (target && /^(?:Non communiqué|Non communiquée|—)$/i.test(target.textContent.trim())) {
          target.textContent = String(value);
        }
      });
    } catch (error) {
      console.warn("BakhiraFoot match context:",error);
      if (!content.isConnected || content.dataset.bfMatchContextToken !== token) return;
      const fallback = '<div class="bf-new-safe-empty">Les derniers résultats et le classement ne sont pas disponibles actuellement.</div>';
      recentNode.innerHTML = fallback;
      h2hNode.innerHTML = fallback;
      standingsNode.innerHTML = fallback;
    }
  }

  async function loadNews(content, args, node) {
    try {
      const data = window.BFAPI && typeof window.BFAPI.getJSON === "function"
        ? await window.BFAPI.getJSON("/api/news",{ttlMs:300000,staleIfErrorMs:1200000,timeoutMs:12000})
        : await fetch("/api/news",{headers:{Accept:"application/json"},cache:"no-store"}).then(r=>r.json());
      if (!content.isConnected) return;
      const articles = Array.isArray(data.articles) ? data.articles : [];
      const terms = [args.home.name,args.away.name,args.competition]
        .flatMap(value => String(value || "").toLowerCase().split(/[^a-z0-9à-ÿ]+/i))
        .filter(value => value.length >= 4);
      const related = articles.filter(article => {
        const text = [article.title,article.description,article.category].join(" ").toLowerCase();
        return terms.some(term => text.includes(term));
      }).slice(0,4);
      if (!related.length) {
        node.innerHTML = '<div class="bf-new-safe-empty">Aucun article récent ne cite clairement ces équipes ou cette compétition. Consulte la rubrique Actualités pour le fil football complet.</div>';
        return;
      }
      node.innerHTML = '<div class="bfmc-news">' + related.map(article => {
        const image = /^https?:\/\//i.test(String(article.image || ""))
          ? '<img src="' + esc(article.image) + '" alt="" loading="lazy">'
          : '<span class="bfmc-news-placeholder">⚽</span>';
        return '<a class="bfmc-news-card" href="' + esc(article.url) + '" target="_blank" rel="noopener noreferrer">' +
          image + '<span><small>' + esc(article.source || article.category || "Football") +
          ' · ' + esc(dateLabel(article.date)) + '</small><strong>' + esc(article.title) +
          '</strong><em>Lire la source ↗</em></span></a>';
      }).join("") + '</div>';
    } catch (error) {
      console.warn("BakhiraFoot match news:",error);
      if (content.isConnected) node.innerHTML = '<div class="bf-new-safe-empty">Les actualités ne sont pas disponibles pour le moment.</div>';
    }
  }

  function setupComments(content, args, formNode, commentsNode) {
    const form = formNode.querySelector("form");
    const status = formNode.querySelector("[data-bf-comment-status]");
    const authorInput = formNode.querySelector("[name=author]");
    const messageInput = formNode.querySelector("[name=message]");
    const submit = formNode.querySelector("button[type=submit]");
    const slug = String(args.key || "match").toLowerCase()
      .replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100) || "match";
    const localKey = "bf:local:match-comments:" + slug;

    const setStatus = (message,error=false) => {
      status.textContent = message;
      status.classList.toggle("is-error",error);
    };
    const readLocal = () => {
      try {
        const value = JSON.parse(localStorage.getItem(localKey) || "[]");
        return Array.isArray(value) ? value.filter(item => item && typeof item.message === "string") : [];
      } catch (_) { return []; }
    };
    const render = comments => {
      const list = Array.isArray(comments) ? comments : [];
      commentsNode.innerHTML = list.length ? list.slice(0,50).map(item =>
        '<article class="bfmc-comment"><header><strong>' + esc(item.author || "Supporter") +
        '</strong><time>' + esc(dateLabel(item.createdAt)) + '</time></header><p>' +
        esc(item.message || "") + '</p></article>'
      ).join("") : '<div class="bf-new-safe-empty">Pas encore de commentaires. Lance le débat avec respect.</div>';
    };
    const saveLocal = (author,message) => {
      const comments = readLocal();
      comments.unshift({id:"local-"+Date.now(),author,message,createdAt:new Date().toISOString()});
      try { localStorage.setItem(localKey,JSON.stringify(comments.slice(0,50))); } catch (_) {}
      return comments.slice(0,50);
    };
    const refresh = async () => {
      try {
        const response = await fetch("/api/community?match="+encodeURIComponent(slug),{
          headers:{Accept:"application/json"},cache:"no-store"
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw Object.assign(new Error(payload?.message || payload?.error || "Comments unavailable"),{status:response.status});
        render(payload.comments || []);
        setStatus("Commentaires partagés");
      } catch (_) {
        render(readLocal());
        setStatus("Stockage partagé indisponible : les commentaires sauvegardés ici restent sur cet appareil.",true);
      }
    };
    if (form.dataset.ready === "1") return;
    form.dataset.ready = "1";
    form.addEventListener("submit",async event => {
      event.preventDefault();
      const author = String(authorInput.value || "").trim().slice(0,28);
      const message = String(messageInput.value || "").trim().slice(0,500);
      if (author.length < 2 || message.length < 3) {
        setStatus("Ajoute un pseudo et un commentaire plus long.",true);
        return;
      }
      submit.disabled = true;
      try {
        const response = await fetch("/api/community?match="+encodeURIComponent(slug),{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({author,message,match:slug})
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 400 || response.status === 429) {
            setStatus(payload?.message || "Impossible de publier ce commentaire.",true);
            return;
          }
          throw new Error(payload?.message || "Shared comment storage unavailable");
        }
        form.reset();
        await refresh();
        setStatus("Ton commentaire a été publié.");
      } catch (_) {
        render(saveLocal(author,message));
        form.reset();
        setStatus("Enregistré sur cet appareil uniquement : le stockage partagé n’est pas configuré.",true);
      } finally {
        submit.disabled = false;
      }
    });
    render(readLocal());
    refresh();
  }


  function setupVote(content, args, overviewNode) {
    const slug = String(args.key || "match").toLowerCase()
      .replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100) || "match";
    const localKey = "bf:local:match-vote:" + slug;
    const section = document.createElement("div");
    section.className = "bfmc-vote";
    section.innerHTML = '<div class="bfmc-vote-head"><strong>Qui remportera cette rencontre ?</strong><span data-bf-vote-total>0 vote</span></div>' +
      '<div class="bfmc-vote-buttons"><button type="button" data-bf-vote="home" aria-pressed="false">' + esc(args.home.name) +
      '</button><button type="button" data-bf-vote="away" aria-pressed="false">' + esc(args.away.name) + '</button></div>' +
      '<div class="bfmc-vote-results"><div class="bfmc-vote-result"><span>' + esc(args.home.name) + '</span><b data-bf-vote-home>0%</b><div class="bfmc-vote-track"><i data-bf-vote-home-bar style="width:0%"></i></div></div>' +
      '<div class="bfmc-vote-result"><span>' + esc(args.away.name) + '</span><b data-bf-vote-away>0%</b><div class="bfmc-vote-track"><i data-bf-vote-away-bar style="width:0%"></i></div></div></div>' +
      '<span class="bfmc-vote-status" data-bf-vote-status role="status" aria-live="polite">Ton pronostic est anonyme.</span>';
    const heading = overviewNode.querySelector(".bf-new-safe-title");
    if (heading) heading.insertAdjacentElement("afterend", section);
    else overviewNode.prepend(section);

    const buttons = Array.from(section.querySelectorAll("[data-bf-vote]"));
    const status = section.querySelector("[data-bf-vote-status]");
    const localState = () => {
      try {
        const value = JSON.parse(localStorage.getItem(localKey) || "{}");
        return value && typeof value === "object" ? value : {};
      } catch (_) { return {}; }
    };
    const render = (votes, voted, localOnly) => {
      const homeVotes = Math.max(0,Number(votes?.home || 0));
      const awayVotes = Math.max(0,Number(votes?.away || 0));
      const total = homeVotes + awayVotes;
      const homePercent = total ? Math.round(homeVotes*100/total) : 0;
      const awayPercent = total ? 100-homePercent : 0;
      section.querySelector("[data-bf-vote-total]").textContent = total + (total === 1 ? " vote" : " votes");
      section.querySelector("[data-bf-vote-home]").textContent = homePercent + "%";
      section.querySelector("[data-bf-vote-away]").textContent = awayPercent + "%";
      section.querySelector("[data-bf-vote-home-bar]").style.width = homePercent + "%";
      section.querySelector("[data-bf-vote-away-bar]").style.width = awayPercent + "%";
      buttons.forEach(button => button.setAttribute("aria-pressed",button.dataset.bfVote === voted ? "true" : "false"));
      if (localOnly) {
        status.textContent = "Pronostic enregistré sur cet appareil uniquement (stockage partagé indisponible).";
        status.classList.add("is-error");
      } else {
        status.textContent = voted ? "Ton pronostic est enregistré. Tu peux le modifier." : "Ton pronostic est anonyme.";
        status.classList.remove("is-error");
      }
    };
    const refresh = async () => {
      try {
        const response = await fetch("/api/community?match="+encodeURIComponent(slug)+"&vote=1",{
          headers:{Accept:"application/json"},cache:"no-store"
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Votes indisponibles");
        render(payload.votes,payload.voted,false);
      } catch (_) {
        const local = localState();
        const votes = local.votes || {home:0,away:0};
        render(votes,local.voted || null,true);
      }
    };
    buttons.forEach(button => button.addEventListener("click",async () => {
      const team = button.dataset.bfVote;
      buttons.forEach(item => item.disabled = true);
      try {
        const response = await fetch("/api/community?match="+encodeURIComponent(slug),{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({type:"vote",team,match:slug})
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.message || "Votes partagés indisponibles");
        render(payload.votes,payload.voted,false);
      } catch (_) {
        const local = localState();
        const votes = local.votes || {home:0,away:0};
        const previous = local.voted;
        if (previous !== team) {
          if (previous === "home" || previous === "away") votes[previous] = Math.max(0,Number(votes[previous]||0)-1);
          votes[team] = Number(votes[team]||0)+1;
        }
        try { localStorage.setItem(localKey,JSON.stringify({votes,voted:team})); } catch (_) {}
        render(votes,team,true);
      } finally {
        buttons.forEach(item => item.disabled = false);
      }
    }));
    refresh();
  }

  function attach(args) {
    const content = args?.content;
    if (!content) return;
    const matchKey = String(args.key || "");
    if (content.dataset.bfMatchEnhancementsReady === "1" &&
        content.dataset.bfMatchEnhancementKey === matchKey &&
        content.querySelector(".bfmd-center-nav")) return;
    content.dataset.bfMatchEnhancementsReady = "0";
    content.dataset.bfMatchEnhancementKey = matchKey;
    style();

    const panels = Array.from(content.children).filter(node =>
      node.classList?.contains("bf-new-safe-section") ||
      (node.tagName === "DETAILS" && node.classList?.contains("bf-new-safe-player-list"))
    );
    const panelIds = ["bfmc-lineups","bfmc-overview","bfmc-stats","bfmc-players","bfmc-events"];
    const panelNames = ["Formations et compositions","Résumé et meilleure note","Statistiques du match","Statistiques des joueurs","Événements"];
    panels.slice(0,5).forEach((panel,index) => {
      panel.id = panelIds[index];
      panel.dataset.bfMatchPanel = "1";
      if (index === 1) {
        const heading = panel.querySelector(".bf-new-safe-title");
        if (heading) heading.textContent = panelNames[index];
      }
    });

    const nav = document.createElement("nav");
    nav.className = "bfmd-center-nav";
    nav.setAttribute("aria-label","Sections du Match Centre");
    const tabs = [
      ["bfmc-overview","Résumé"],["bfmc-lineups","Compos"],["bfmc-stats","Stats"],
      ["bfmc-players","Stats joueurs"],["bfmc-events","Événements"],
      ["bfmc-form","Derniers matchs"],["bfmc-standings","Classement"],
      ["bfmc-highlights","Highlights"],["bfmc-news","Actualités"],["bfmc-comments","Commentaires"]
    ];
    nav.innerHTML = tabs.map((tab,index) =>
      '<button type="button" data-bf-match-tab="' + tab[0] + '" aria-pressed="' +
      (index===0?"true":"false") + '">' + tab[1] + '</button>'
    ).join("");
    const info = content.querySelector(".bf-new-safe-info");
    if (info) info.insertAdjacentElement("afterend",nav);
    else content.insertBefore(nav,content.firstChild);

    const recentNode = addPanel(content,"bfmc-form","Derniers matchs des deux équipes",
      '<div class="bfmc-context-columns"><section><h4>' + esc(args.home.name) +
      '</h4><div class="bf-new-safe-empty">Chargement des derniers matchs…</div></section><section><h4>' +
      esc(args.away.name) + '</h4><div class="bf-new-safe-empty">Chargement des derniers matchs…</div></section></div>' +
      '<div class="bf-new-safe-title bf-new-safe-subtitle">Confrontations directes</div><div data-bf-h2h><div class="bf-new-safe-empty">Chargement des confrontations…</div></div>');
    const standingsNode = addPanel(content,"bfmc-standings","Classement de la compétition",
      '<div class="bf-new-safe-empty">Chargement du classement…</div>');
    const highlights = findHighlights(args.details);
    const highlightsHtml = highlights.length
      ? '<div class="bfmc-highlights">' + highlights.map(item =>
          '<a class="bfmc-highlight" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer"><span>▶</span><strong>' +
          esc(item.label) + '<br><small>Ouvrir la vidéo ↗</small></strong></a>'
        ).join("") + '</div>'
      : '<div class="bf-new-safe-empty">Aucun lien officiel de highlights n’a été fourni par la source pour cette rencontre.</div>';
    addPanel(content,"bfmc-highlights","Highlights et vidéos",highlightsHtml);
    const newsNode = addPanel(content,"bfmc-news","Actualités liées au match",
      '<div class="bf-new-safe-empty">Recherche des articles liés à cette affiche…</div>');
    const commentsRoot = addPanel(content,"bfmc-comments","Commentaires des supporters",
      '<form class="bfmc-comment-form"><label for="bfmc-comment-author">Pseudo</label><input id="bfmc-comment-author" name="author" minlength="2" maxlength="28" required placeholder="Ton pseudo" autocomplete="nickname"><label for="bfmc-comment-message">Ton commentaire</label><textarea id="bfmc-comment-message" name="message" minlength="3" maxlength="500" rows="3" required placeholder="Réagis à cette rencontre…"></textarea><div class="bfmc-comment-submit"><button type="submit">Publier</button><span class="bfmc-comment-status" data-bf-comment-status role="status" aria-live="polite"></span></div></form><div data-bf-comment-list><div class="bf-new-safe-empty">Chargement des commentaires…</div></div>');
    const h2hNode = recentNode.querySelector("[data-bf-h2h]");
    const commentList = commentsRoot.querySelector("[data-bf-comment-list]");

    setupTabs(content,nav);
    const overviewNode = content.querySelector("#bfmc-overview");
    if (overviewNode) setupVote(content,args,overviewNode);
    content.dataset.bfMatchEnhancementsReady = "1";
    content.dataset.bfMatchEnhancementKey = matchKey;
    const matchArgs = {...args,key:String(args.key || "")};
    loadContext(content,matchArgs,recentNode,h2hNode,standingsNode);
    loadNews(content,matchArgs,newsNode);
    setupComments(content,matchArgs,commentsRoot,commentList);
  }

  window.BFMatchEnhancements = Object.freeze({attach});
})();
