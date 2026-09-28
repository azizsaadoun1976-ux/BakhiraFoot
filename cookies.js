(() => {
  "use strict";

  const COOKIE_NAME = "bakhirafoot_cookie_consent";
  const COOKIE_DAYS = 180;

  function getCookie(name) {
    const cookies = document.cookie.split(";");

    for (const item of cookies) {
      const [key, ...rest] = item.trim().split("=");

      if (key === name) {
        return decodeURIComponent(rest.join("="));
      }
    }

    return null;
  }

  function setCookie(name, value, days) {
    const maxAge =
      days * 24 * 60 * 60;

    document.cookie =
      `${name}=${encodeURIComponent(value)}; ` +
      `max-age=${maxAge}; path=/; SameSite=Lax`;
  }

  function createStyles() {
    if (
      document.getElementById(
        "bf-cookie-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "bf-cookie-style";

    style.textContent = `
      .bf-cookie-banner {
        position: fixed;
        left: 18px;
        right: 18px;
        bottom: 18px;
        z-index: 99999;
        max-width: 760px;
        margin: auto;
        padding: 16px 18px;
        border: 1px solid #dfe5e9;
        border-radius: 14px;
        background: #ffffff;
        box-shadow: 0 12px 35px rgba(15,23,42,.16);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }

      .bf-cookie-content {
        min-width: 0;
      }

      .bf-cookie-title {
        margin: 0 0 5px;
        font-size: 14px;
        font-weight: 800;
        color: #17212b;
      }

      .bf-cookie-text {
        margin: 0;
        font-size: 12px;
        line-height: 1.5;
        color: #687780;
      }

      .bf-cookie-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .bf-cookie-btn {
        min-height: 40px;
        padding: 0 15px;
        border-radius: 9px;
        border: 1px solid #d8e0e5;
        background: #ffffff;
        color: #26343e;
        font-size: 12px;
        font-weight: 750;
        cursor: pointer;
      }

      .bf-cookie-btn:hover {
        background: #f5f7f8;
      }

      .bf-cookie-btn.primary {
        border-color: #17212b;
        background: #17212b;
        color: #ffffff;
      }

      .bf-cookie-btn.primary:hover {
        background: #26343e;
      }

      .dark .bf-cookie-banner {
        background: #151d24;
        border-color: #29343d;
      }

      .dark .bf-cookie-title {
        color: #edf2f5;
      }

      .dark .bf-cookie-text {
        color: #96a4ad;
      }

      .dark .bf-cookie-btn {
        background: #1b252d;
        border-color: #34414b;
        color: #edf2f5;
      }

      .dark .bf-cookie-btn.primary {
        background: #edf2f5;
        color: #151d24;
      }

      @media (max-width: 650px) {
        .bf-cookie-banner {
          left: 10px;
          right: 10px;
          bottom: 10px;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
          padding: 14px;
        }

        .bf-cookie-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .bf-cookie-btn {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createBanner() {
    if (
      document.getElementById(
        "bf-cookie-banner"
      )
    ) {
      return;
    }

    const banner =
      document.createElement("div");

    banner.id =
      "bf-cookie-banner";

    banner.className =
      "bf-cookie-banner";

    banner.innerHTML = `
      <div class="bf-cookie-content">

        <p class="bf-cookie-title">
          🍪 Cookies sur BakhiraFoot
        </p>

        <p class="bf-cookie-text">
          Nous utilisons des cookies nécessaires
          au fonctionnement du site et pour mémoriser
          vos préférences.
        </p>

      </div>

      <div class="bf-cookie-actions">

        <button
          type="button"
          class="bf-cookie-btn"
          id="bf-cookie-refuse"
        >
          Refuser
        </button>

        <button
          type="button"
          class="bf-cookie-btn primary"
          id="bf-cookie-accept"
        >
          Accepter
        </button>

      </div>
    `;

    document.body.appendChild(banner);

    document
      .getElementById("bf-cookie-accept")
      ?.addEventListener(
        "click",
        () => {
          setCookie(
            COOKIE_NAME,
            "accepted",
            COOKIE_DAYS
          );

          banner.remove();
        }
      );

    document
      .getElementById("bf-cookie-refuse")
      ?.addEventListener(
        "click",
        () => {
          setCookie(
            COOKIE_NAME,
            "refused",
            COOKIE_DAYS
          );

          banner.remove();
        }
      );
  }

  createStyles();

  const consent =
    getCookie(COOKIE_NAME);

  if (!consent) {
    createBanner();
  }
})();
