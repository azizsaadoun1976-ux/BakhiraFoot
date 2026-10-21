(function () {
  "use strict";
  const API = "/api/community";

  function injectStyles() {
    if (document.getElementById("bf-community-style")) return;
    const style = document.createElement("style");
    style.id = "bf-community-style";
    style.textContent = `
      .bf-community{margin:28px 0;padding:22px;border:1px solid var(--bf-border,rgba(100,116,139,.2));border-radius:14px;background:var(--bf-surface,#fff);color:var(--bf-text,#172027)}
      .bf-community-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:18px}
      .bf-community-eyebrow{font-size:10px;font-weight:900;letter-spacing:.12em;color:#159765}
      .bf-community h2{margin:5px 0 6px;font-size:clamp(20px,2.5vw,27px);font-weight:950}
      .bf-community-intro{max-width:700px;margin:0;color:var(--bf-muted,#71808a);font-size:12px;line-height:1.65}
      .bf-community-count{flex:0 0 auto;border:1px solid var(--bf-border,rgba(100,116,139,.2));border-radius:999px;padding:7px 10px;font-size:10px;font-weight:850}
      .bf-community-notice{display:none;padding:10px 12px;margin:12px 0;border-radius:8px;font-size:12px;line-height:1.5}
      .bf-community-notice[data-kind="error"]{display:block;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);color:#b91c1c}
      .bf-community-notice[data-kind="success"]{display:block;background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.2);color:#15803d}
      .bf-community-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.7fr);gap:18px;align-items:start}
      .bf-community-feed{display:grid;gap:9px;max-height:430px;overflow:auto;padding-right:3px}
      .bf-community-comment{padding:13px;border:1px solid var(--bf-border,rgba(100,116,139,.15));border-radius:10px;background:var(--bf-card,#f8fafc)}
      .bf-community-comment-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px}
      .bf-community-author{font-size:12px;font-weight:950;overflow-wrap:anywhere}
      .bf-community-date{font-size:9px;color:var(--bf-muted,#71808a);white-space:nowrap}
      .bf-community-message{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.65}
      .bf-community-empty{padding:20px 14px;border:1px dashed var(--bf-border,rgba(100,116,139,.25));border-radius:10px;color:var(--bf-muted,#71808a);font-size:12px;text-align:center}
      .bf-community-form{display:grid;gap:10px;padding:15px;border:1px solid var(--bf-border,rgba(100,116,139,.17));border-radius:12px;background:var(--bf-card,#f8fafc)}
      .bf-community-form label{display:grid;gap:5px;font-size:11px;font-weight:850}
      .bf-community-form input,.bf-community-form textarea{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid var(--bf-border,#d8e0e5);border-radius:8px;background:var(--bf-input,#fff);color:inherit;font:inherit;font-size:12px;outline:none}
      .bf-community-form input:focus,.bf-community-form textarea:focus{border-color:#159765;box-shadow:0 0 0 3px rgba(21,151,101,.12)}
      .bf-community-form textarea{min-height:108px;resize:vertical}
      .bf-community-submit{min-height:41px;border:0;border-radius:8px;background:#16a36b;color:#fff;font-weight:950;cursor:pointer}
      .bf-community-submit:disabled{opacity:.6;cursor:wait}
      .bf-community-rules{font-size:10px;line-height:1.55;color:var(--bf-muted,#71808a)}
      .bf-community-ban-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:#08131bee;color:#f8fafc;text-align:center}
      .bf-community-ban-card{width:min(560px,100%);padding:30px 24px;border:1px solid #842e42;border-radius:16px;background:#111d28;box-shadow:0 30px 100px #0008}
      .bf-community-ban-mark{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:#7f1d1d;color:#fecaca;font-size:23px;font-weight:1000}
      .bf-community-ban-card h1{margin:14px 0 9px;font-size:clamp(24px,4vw,32px)}
      .bf-community-ban-card p{color:#bdc9d5;font-size:13px;line-height:1.7}
      .bf-community-ban-card a{display:inline-flex;margin-top:8px;padding:10px 14px;border-radius:8px;background:#16a36b;color:white;text-decoration:none;font-size:12px;font-weight:900}
      @media(max-width:760px){.bf-community{padding:15px}.bf-community-grid{grid-template-columns:1fr}.bf-community-feed{max-height:380px}.bf-community-count{display:none}}
      html.dark .bf-community-form,body.dark .bf-community-form{--bf-card:#14202a;--bf-input:#101a22}
    `;
    document.head.appendChild(style);
  }

  function showSiteBan(message) {
    if (document.getElementById("bf-community-ban-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "bf-community-ban-overlay";
    overlay.className = "bf-community-ban-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const card = document.createElement("div");
    card.className = "bf-community-ban-card";
    const mark = document.createElement("div");
    mark.className = "bf-community-ban-mark";
    mark.textContent = "!";
    const title = document.createElement("h1");
    title.textContent = "Accès suspendu";
    const text = document.createElement("p");
    text.textContent = message || "L’accès à BakhiraFoot est suspendu pour ce réseau à la suite d’un commentaire contenant des insultes ou des propos obscènes. Les commentaires doivent rester respectueux.";
    const help = document.createElement("p");
    help.textContent = "Pour demander une révision de cette décision, utilisez la page Contact.";
    const contact = document.createElement("a");
    contact.href = "/contact.html";
    contact.textContent = "Contacter BakhiraFoot";
    card.append(mark,title,text,help,contact);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function setNotice(root, kind, message) {
    const notice = root.querySelector("#bfCommunityNotice");
    if (!notice) return;
    notice.dataset.kind = kind || "";
    notice.textContent = message || "";
    notice.hidden = !message;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {dateStyle:"medium",timeStyle:"short"}).format(date);
  }

  function renderComments(root, comments) {
    const feed = root.querySelector("#bfCommunityFeed");
    const count = root.querySelector("#bfCommunityCount");
    if (!feed) return;
    feed.replaceChildren();
    if (count) count.textContent = String(comments.length) + (comments.length > 1 ? " réactions" : " réaction");
    if (!comments.length) {
      const empty = document.createElement("div");
      empty.className = "bf-community-empty";
      empty.textContent = "Pas encore de réaction. Lance le débat, mais reste respectueux.";
      feed.appendChild(empty);
      return;
    }
    comments.forEach(comment => {
      const article = document.createElement("article");
      article.className = "bf-community-comment";
      const top = document.createElement("div");
      top.className = "bf-community-comment-top";
      const author = document.createElement("strong");
      author.className = "bf-community-author";
      author.textContent = String(comment.author || "");
      const date = document.createElement("time");
      date.className = "bf-community-date";
      date.dateTime = String(comment.createdAt || "");
      date.textContent = formatDate(comment.createdAt);
      const message = document.createElement("p");
      message.className = "bf-community-message";
      message.textContent = String(comment.message || "");
      top.append(author,date);
      article.append(top,message);
      feed.appendChild(article);
    });
  }

  async function getJSON(url, options) {
    const response = await fetch(url, Object.assign({
      cache: "no-store",
      headers: { Accept: "application/json" }
    }, options || {}));
    const data = await response.json().catch(() => ({}));
    if (response.status === 403 && data.banned) {
      showSiteBan(data.message);
      const error = new Error(data.message || "Accès suspendu");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(data.message || data.error || "Service indisponible");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  async function checkSiteAccess() {
    // Keep Contact reachable so a suspended visitor can request a review.
    const path = String(window.location.pathname || "").toLowerCase();
    if (path.endsWith("/contact.html") || path === "/contact" || path.endsWith("/contact")) return;
    try {
      await getJSON(API + "?status=1");
    } catch (error) {
      if (error.status === 403) showSiteBan(error.data?.message || error.message);
    }
  }

  async function initCommunity() {
    const root = document.getElementById("bfCommunity");
    if (!root) return;
    const form = root.querySelector("#bfCommunityForm");
    const submit = root.querySelector("#bfCommunitySubmit");
    const feed = root.querySelector("#bfCommunityFeed");
    if (!form || !submit || !feed) return;

    try {
      const data = await getJSON(API);
      renderComments(root, Array.isArray(data.comments) ? data.comments : []);
    } catch (error) {
      if (error.status === 503) {
        setNotice(root, "error", "Les commentaires partagés ne sont pas encore configurés. Le service nécessite son stockage sécurisé.");
      } else if (error.status !== 403) {
        setNotice(root, "error", "Impossible de charger les commentaires pour le moment.");
      }
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const author = String(form.elements.author?.value || "").trim();
      const message = String(form.elements.message?.value || "").trim();
      submit.disabled = true;
      submit.textContent = "Publication…";
      setNotice(root, "", "");
      try {
        const data = await getJSON(API, {
          method: "POST",
          headers: {"Content-Type":"application/json",Accept:"application/json"},
          body: JSON.stringify({author,message})
        });
        form.elements.message.value = "";
        const existing = Array.from(feed.querySelectorAll(".bf-community-comment")).map(node => ({
          author: node.querySelector(".bf-community-author")?.textContent || "",
          message: node.querySelector(".bf-community-message")?.textContent || "",
          createdAt: node.querySelector("time")?.dateTime || ""
        }));
        renderComments(root,[data.comment].concat(existing).slice(0,100));
        setNotice(root,"success","Ton commentaire a été publié. Merci de garder un débat sportif et respectueux.");
      } catch (error) {
        if (error.status === 403) {
          showSiteBan(error.data?.message || error.message);
        } else if (error.status === 503) {
          setNotice(root,"error","La publication sera possible dès que le stockage partagé sera configuré.");
        } else {
          setNotice(root,"error",error.message || "Le commentaire n’a pas pu être publié.");
        }
      } finally {
        submit.disabled = false;
        submit.textContent = "Publier le commentaire";
      }
    });
  }

  function boot() {
    injectStyles();
    checkSiteAccess();
    initCommunity();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  } else {
    boot();
  }
})();