(() => {
  "use strict";

  const STORAGE_KEY = "bakhirafoot-theme";

  function safeSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "dark" || saved === "light" ? saved : null;
    } catch (_) {
      return null;
    }
  }

  function persistTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {
      /* Theme remains usable for this page even when storage is blocked. */
    }
  }

  function ensureThemeButton() {
    const existing = document.getElementById("theme");
    if (existing) return existing;

    const header = document.querySelector("body > header");
    if (!header) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "theme";
    button.className = "site-theme";
    button.textContent = "☾";
    button.setAttribute("aria-label", "Activer le mode sombre");
    button.setAttribute("title", "Changer le thème");
    header.appendChild(button);
    return button;
  }

  function applyTheme(theme) {
    const dark = theme === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.body.classList.toggle("dark", dark);

    const button = document.getElementById("theme");
    if (button) {
      button.textContent = dark ? "☀" : "☾";
      button.setAttribute("aria-label", dark ? "Activer le mode clair" : "Activer le mode sombre");
      button.setAttribute("title", dark ? "Passer au thème clair" : "Passer au thème sombre");
      button.setAttribute("aria-pressed", dark ? "true" : "false");
    }

    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }

  function init() {
    const button = ensureThemeButton();
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    applyTheme(safeSavedTheme() || (system.matches ? "dark" : "light"));

    if (button && button.dataset.themeBound !== "true") {
      button.dataset.themeBound = "true";
      button.addEventListener("click", () => {
        const next = document.body.classList.contains("dark") ? "light" : "dark";
        persistTheme(next);
        applyTheme(next);
      });
    }

    if (system.addEventListener) {
      system.addEventListener("change", event => {
        if (safeSavedTheme()) return;
        applyTheme(event.matches ? "dark" : "light");
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
