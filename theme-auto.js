(() => {
  "use strict";

  const media =
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

  function applySystemTheme() {
    const dark =
      media.matches;

    document.documentElement
      .classList.toggle(
        "dark",
        dark
      );

    document.body?.classList.toggle(
      "dark",
      dark
    );
  }

  function init() {
    applySystemTheme();

    if (
      typeof media.addEventListener ===
      "function"
    ) {
      media.addEventListener(
        "change",
        applySystemTheme
      );
    }
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
