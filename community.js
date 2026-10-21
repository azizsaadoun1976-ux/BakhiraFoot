(() => {
  "use strict";

  const API = "/api/community";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function initCommunity() {
    const root = document.getElementById("bfCommunity");
    if (!root || root.dataset.communityReady === "1") return;
    const grid = root.querySelector(".bf-community-grid");
    if (!grid) return;
    root.dataset.communityReady = "1";

    const intro = root.querySelector(".bf-community-intro");
    if (intro) intro.textContent = "Partage ton avis sur les matchs avec les autres supporters. Écris un pseudo et publie ton commentaire.";
    const count = root.querySelector("#bfCommunityCount");
    if (count) count.textContent = "Commentaires des supporters";

    grid.innerHTML = `
      <div class="bf-community-panel" style="width:100%;grid-column:1/-1;min-width:0">
        <form id="bfCommunityForm" style="display:grid;gap:10px;margin:0 0 20px">
          <label for="bfCommunityAuthor" style="font-weight:700;font-size:13px">Ton pseudo</label>
          <input id="bfCommunityAuthor" name="author" maxlength="28" minlength="2" required placeholder="Ex. Supporter12" autocomplete="nickname"
            style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid var(--bf-border,#d7dde2);border-radius:10px;background:var(--bf-card,#fff);color:var(--bf-text,#17212b)">
          <label for="bfCommunityMessage" style="font-weight:700;font-size:13px">Ton commentaire</label>
          <textarea id="bfCommunityMessage" name="message" maxlength="500" minlength="3" required rows="3" placeholder="Que penses-tu du match ?"
            style="width:100%;box-sizing:border-box;resize:vertical;padding:12px 14px;border:1px solid var(--bf-border,#d7dde2);border-radius:10px;background:var(--bf-card,#fff);color:var(--bf-text,#17212b);font:inherit"></textarea>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <button id="bfCommunitySubmit" type="submit" style="border:0;border-radius:10px;padding:11px 18px;font-weight:800;cursor:pointer;background:var(--bf-accent,#18a66a);color:#fff">Publier le commentaire</button>
            <span id="bfCommunityStatus" role="status" aria-live="polite" style="font-size:12px;color:var(--bf-muted,#71808a)"></span>
          </div>
        </form>
        <div id="bfCommunityComments" style="display:grid;gap:10px"></div>
      </div>
    `;

    const form = root.querySelector("#bfCommunityForm");
    const authorInput = root.querySelector("#bfCommunityAuthor");
    const messageInput = root.querySelector("#bfCommunityMessage");
    const submit = root.querySelector("#bfCommunitySubmit");
    const status = root.querySelector("#bfCommunityStatus");
    const commentsNode = root.querySelector("#bfCommunityComments");

    function setStatus(message, error = false) {
      status.textContent = message;
      status.style.color = error ? "#d94b4b" : "var(--bf-muted,#71808a)";
    }

    function renderComments(comments) {
      if (!Array.isArray(comments) || !comments.length) {
        commentsNode.innerHTML = '<p style="margin:0;padding:16px;border:1px solid var(--bf-border,#d7dde2);border-radius:10px;color:var(--bf-muted,#71808a)">Pas encore de commentaires. Sois le premier à réagir !</p>';
        return;
      }
      commentsNode.innerHTML = comments.map(comment => {
        const date = comment.createdAt ? new Date(comment.createdAt) : null;
        const dateLabel = date && !Number.isNaN(date.getTime())
          ? date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
          : "";
        return `<article style="padding:14px;border:1px solid var(--bf-border,#d7dde2);border-radius:12px;background:var(--bf-card,transparent);overflow-wrap:anywhere">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:7px">
            <strong>${esc(comment.author || "Supporter")}</strong>
            <time style="font-size:11px;color:var(--bf-muted,#71808a)">${esc(dateLabel)}</time>
          </div>
          <p style="white-space:pre-wrap;margin:0;line-height:1.6">${esc(comment.message || "")}</p>
        </article>`;
      }).join("");
    }

    const localCommentsKey = "bf:local-comments:general";
    let localCommentsMode = false;
    const localOnlyMessage = "Commentaire sauvegardé sur cet appareil uniquement. Pour le partager avec tous les visiteurs, il faut connecter un stockage commun à Vercel.";
    function readLocalComments() {
      try {
        const value = JSON.parse(localStorage.getItem(localCommentsKey) || "[]");
        return Array.isArray(value) ? value.filter(item => item && typeof item.message === "string") : [];
      } catch (_) { return []; }
    }
    function saveLocalComment(author, message) {
      const comments = readLocalComments();
      comments.unshift({
        id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2,7),
        author, message, createdAt: new Date().toISOString()
      });
      try {
        localStorage.setItem(localCommentsKey, JSON.stringify(comments.slice(0,50)));
        localCommentsMode = true;
        renderComments(comments.slice(0,50));
        if (count) count.textContent = comments.slice(0,50).length + " commentaire(s) · local";
        return true;
      } catch (_) {
        localCommentsMode = true;
        return false;
      }
    }

    async function loadComments() {
      if (localCommentsMode) {
        const local = readLocalComments();
        renderComments(local);
        if (count) count.textContent = local.length + " commentaire(s) · local";
        return;
      }
      try {
        const response = await fetch(API, { method: "GET", cache: "no-store", headers: { Accept: "application/json" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          localCommentsMode = true;
          renderComments(readLocalComments());
          if (count) count.textContent = readLocalComments().length + " commentaire(s) · local";
          setStatus("Mode local activé. Les nouveaux commentaires resteront sur cet appareil tant que le stockage partagé n’est pas configuré.");
          return;
        }
        renderComments(data.comments || []);
        if (count) count.textContent = (data.comments || []).length + " commentaire(s)";
      } catch (_) {
        localCommentsMode = true;
        renderComments(readLocalComments());
        if (count) count.textContent = readLocalComments().length + " commentaire(s) · local";
        setStatus("Mode local activé. Les nouveaux commentaires resteront sur cet appareil tant que le stockage partagé n’est pas configuré.");
      }
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const author = authorInput.value.trim();
      const message = messageInput.value.trim();
      if (author.length < 2 || message.length < 3) {
        setStatus("Ajoute un pseudo et un commentaire un peu plus long.", true);
        return;
      }
      submit.disabled = true;
      submit.style.opacity = ".65";
      setStatus("Publication…");
      const publishLocally = () => {
        const saved = saveLocalComment(author, message);
        if (saved) {
          messageInput.value = "";
          setStatus(localOnlyMessage);
        } else {
          setStatus("Le navigateur n’a pas permis de sauvegarder le commentaire localement.", true);
        }
      };
      try {
        if (localCommentsMode) {
          publishLocally();
          return;
        }
        const response = await fetch(API, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ author, message })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 429) {
            setStatus(data.message || "Attends un peu avant de publier à nouveau.", true);
          } else if (response.status === 400 && data.error === "invalid_comment") {
            setStatus(data.message || "Vérifie le pseudo et le commentaire.", true);
          } else {
            publishLocally();
          }
          return;
        }
        messageInput.value = "";
        setStatus("Commentaire publié.");
        await loadComments();
      } catch (_) {
        publishLocally();
      } finally {
        submit.disabled = false;
        submit.style.opacity = "1";
      }
    });

    loadComments();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCommunity, { once: true });
  } else {
    initCommunity();
  }
})();
