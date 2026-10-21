(function () {
  "use strict";

  function initUtterances() {
    const root = document.getElementById("bfCommunity");
    if (!root || root.dataset.utterancesReady === "1") return;
    const grid = root.querySelector(".bf-community-grid");
    if (!grid) return;

    root.dataset.utterancesReady = "1";

    const intro = root.querySelector(".bf-community-intro");
    if (intro) {
      intro.textContent = "Réagis aux matchs et partage ton analyse avec les autres supporters. Les commentaires sont publics et partagés entre tous les visiteurs. Pour publier, connecte-toi avec un compte GitHub.";
    }

    const count = root.querySelector("#bfCommunityCount");
    if (count) count.textContent = "Commentaires publics";

    const oldNotice = root.querySelector("#bfCommunityNotice");
    if (oldNotice) oldNotice.remove();

    grid.replaceChildren();

    const panel = document.createElement("div");
    panel.className = "bf-utterances-panel";
    panel.style.cssText = "min-width:0;width:100%;grid-column:1/-1;";

    const heading = document.createElement("p");
    heading.className = "bf-community-login-note";
    heading.textContent = "La discussion est commune à tous les visiteurs. GitHub est utilisé uniquement pour authentifier la publication; les commentaires se modèrent depuis le dépôt BakhiraFoot.";
    heading.style.cssText = "margin:0 0 12px;color:var(--bf-muted,#71808a);font-size:12px;line-height:1.6;";

    const mount = document.createElement("div");
    mount.id = "bfUtterances";
    mount.style.cssText = "width:100%;min-width:0;";

    const script = document.createElement("script");
    script.src = "https://utteranc.es/client.js";
    script.async = true;
    script.setAttribute("repo", "azizsaadoun1976-ux/BakhiraFoot");
    script.setAttribute("issue-term", "pathname");
    script.setAttribute("theme", "preferred-color-scheme");
    script.setAttribute("crossorigin", "anonymous");

    const fallback = document.createElement("p");
    fallback.className = "bf-community-login-note";
    fallback.style.cssText = "margin:12px 0 0;color:var(--bf-muted,#71808a);font-size:11px;line-height:1.6;";
    const link = document.createElement("a");
    link.href = "https://github.com/azizsaadoun1976-ux/BakhiraFoot/issues";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Ouvrir la discussion sur GitHub";
    fallback.append("Si le module de commentaires ne se charge pas, ", link, ".");

    panel.append(heading, mount, fallback);
    grid.appendChild(panel);
    mount.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUtterances, { once: true });
  } else {
    initUtterances();
  }
})();
