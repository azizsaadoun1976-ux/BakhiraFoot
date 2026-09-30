(() => {
  "use strict";

  const STORAGE_KEY = "bakhirafoot-theme";

  function getSavedTheme() {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    return saved === "dark" ||
      saved === "light"
      ? saved
      : null;
  }

  function applyTheme(theme) {
    const dark =
      theme === "dark";

    document.documentElement.classList.toggle(
      "dark",
      dark
    );

    document.body.classList.toggle(
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

  function init() {
    const button =
      document.getElementById("theme");

    const saved =
      getSavedTheme();

    const system =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    applyTheme(
      saved ||
      (
        system.matches
          ? "dark"
          : "light"
      )
    );

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

    system.addEventListener(
      "change",
      event => {
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
