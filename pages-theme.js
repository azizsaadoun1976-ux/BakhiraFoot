(() => {
  "use strict";

  const STORAGE_KEY =
    "bakhirafoot_theme";

  const systemTheme =
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

  function applyTheme(theme) {

    const dark =
      theme === "dark";

    document.body.classList.toggle(
      "dark",
      dark
    );

    document.documentElement.classList.toggle(
      "dark",
      dark
    );

    const button =
      document.getElementById("theme");

    if (button) {

      button.textContent =
        dark ? "☀️" : "☾";

      button.setAttribute(
        "aria-label",
        dark
          ? "Activer le mode clair"
          : "Activer le mode sombre"
      );
    }
  }

  function getSavedTheme() {

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (
      saved === "dark" ||
      saved === "light"
    ) {
      return saved;
    }

    return null;
  }

  function init() {

    const saved =
      getSavedTheme();

    applyTheme(
      saved ||
      (
        systemTheme.matches
          ? "dark"
          : "light"
      )
    );

    const button =
      document.getElementById("theme");

    if (!button) {
      return;
    }

    button.addEventListener(
      "click",
      () => {

        const current =
          document.body.classList.contains(
            "dark"
          );

        const next =
          current
            ? "light"
            : "dark";

        localStorage.setItem(
          STORAGE_KEY,
          next
        );

        applyTheme(next);
      }
    );

    systemTheme.addEventListener(
      "change",
      event => {

        /*
         * Si l'utilisateur a déjà choisi
         * manuellement, on respecte son choix.
         */

        if (getSavedTheme()) {
          return;
        }

        applyTheme(
          event.matches
            ? "dark"
            : "light"
        );
      }
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
