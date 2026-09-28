(() => {
  "use strict";

  const STORAGE_KEY = "bakhirafoot_theme";

  const systemTheme = window.matchMedia(
    "(prefers-color-scheme: dark)"
  );

  function applyTheme(theme) {
    const dark = theme === "dark";

    document.documentElement.classList.toggle(
      "dark",
      dark
    );

    document.body?.classList.toggle(
      "dark",
      dark
    );
  }

  function getSavedTheme() {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (
      saved === "dark" ||
      saved === "light"
    ) {
      return saved;
    }

    return null;
  }

  function getCurrentTheme() {
    const dark =
      document.documentElement.classList.contains("dark") ||
      document.body?.classList.contains("dark");

    return dark ? "dark" : "light";
  }

  function init() {
    /*
     * أول زيارة:
     * يتبع إعدادات الجهاز.
     *
     * إذا سبق للمستخدم اختيار mode:
     * نستعمل اختياره.
     */

    const saved = getSavedTheme();

    applyTheme(
      saved ||
      (systemTheme.matches
        ? "dark"
        : "light")
    );

    /*
     * نخلي الزر الأصلي #theme خدام.
     * من بعد كل click نحفظ الاختيار الجديد.
     */

    const themeButton =
      document.getElementById("theme");

    if (themeButton) {
      themeButton.addEventListener(
        "click",
        () => {
          setTimeout(() => {
            const current =
              getCurrentTheme();

            localStorage.setItem(
              STORAGE_KEY,
              current
            );
          }, 0);
        }
      );
    }

    /*
     * إلا تبدل mode ديال الجهاز:
     * نتبع الجهاز غير إلا المستخدم
     * ما سبقش اختار mode بيديه.
     */

    systemTheme.addEventListener(
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
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();
