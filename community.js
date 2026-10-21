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

    async function loadComments() {
      try {
        const response = await fetch(API, { method: "GET", cache: "no-store", headers: { Accept: "application/json" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 503) throw new Error("Le service de commentaires partagés n’est pas encore activé.");
          throw new Error("Impossible de charger les commentaires pour le moment.");
        }
        renderComments(data.comments || []);
        if (count) count.textContent = (data.comments || []).length + " commentaire(s)";
      } catch (error) {
        commentsNode.innerHTML = '<p style="margin:0;padding:14px;border:1px solid rgba(217,75,75,.35);border-radius:10px;color:var(--bf-muted,#71808a)">Les commentaires ne peuvent pas être chargés pour le moment.</p>';
        setStatus(error.message || "Erreur de connexion.", true);
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
      try {
        const response = await fetch(API, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ author, message })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 503) throw new Error("Il faut activer le stockage partagé dans Vercel avant de publier.");
          if (response.status === 429) throw new Error(data.message || "Attends un peu avant de publier à nouveau.");
          throw new Error(data.message || "Le commentaire n’a pas pu être publié.");
        }
        messageInput.value = "";
        setStatus("Commentaire publié.");
        await loadComments();
      } catch (error) {
        setStatus(error.message || "Erreur de connexion.", true);
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
