(() => {
  "use strict";

  const COOKIE_NAME =
    "bakhirafoot_cookie_consent";

  const COOKIE_DAYS = 180;

  function getCookie(name) {
    const cookies =
      document.cookie.split(";");

    for (const item of cookies) {
      const [key, ...rest] =
        item.trim().split("=");

      if (key === name) {
        return decodeURIComponent(
          rest.join("=")
        );
      }
    }

    return null;
  }

  function setCookie(
    name,
    value,
    days
  ) {
    const maxAge =
      days * 24 * 60 * 60;

    document.cookie =
      `${name}=${encodeURIComponent(value)}; ` +
      `max-age=${maxAge}; path=/; SameSite=Lax`;
  }

  function addStyles() {
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

      /* =================================
         BAKHIRAFOOT COOKIE BANNER
         ================================= */

      .bf-cookie-overlay {
        position: fixed;
        inset: 0;
        z-index: 99998;
        background: rgba(15, 23, 42, .34);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
      }

      .bf-cookie-banner {
        position: fixed;
        left: 20px;
        right: 20px;
        bottom: 20px;
        z-index: 99999;

        width: min(
          920px,
          calc(100% - 40px)
        );

        margin: auto;

        padding: 20px;

        border: 1px solid #e4e9ed;
        border-radius: 18px;

        background: #ffffff;

        box-shadow:
          0 20px 55px rgba(15, 23, 42, .18);

        display: grid;

        grid-template-columns:
          minmax(0, 1fr)
          auto;

        gap: 24px;

        animation:
          bfCookieUp
          .28s ease;
      }

      @keyframes bfCookieUp {
        from {
          opacity: 0;
          transform: translateY(18px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .bf-cookie-brand {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        min-width: 0;
      }

      .bf-cookie-logo {
        width: 44px;
        height: 44px;
        min-width: 44px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 12px;

        background: #f3f6f8;

        overflow: hidden;
      }

      .bf-cookie-logo img {
        width: 32px;
        height: 32px;
        object-fit: contain;
      }

      .bf-cookie-main {
        min-width: 0;
      }

      .bf-cookie-title {
        margin: 0 0 5px;

        font-size: 15px;
        line-height: 1.3;
        font-weight: 850;

        color: #16232c;
      }

      .bf-cookie-description {
        margin: 0;

        max-width: 650px;

        font-size: 12px;
        line-height: 1.55;

        color: #687780;
      }

      .bf-cookie-description a {
        color: #344b5a;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .bf-cookie-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;

        align-self: center;

        flex-wrap: wrap;
      }

      .bf-cookie-btn {
        min-height: 42px;

        padding: 0 15px;

        border-radius: 9px;

        border: 1px solid #d9e0e5;

        background: #ffffff;

        color: #283741;

        font-size: 12px;
        font-weight: 800;

        cursor: pointer;

        transition:
          background .15s ease,
          border-color .15s ease,
          transform .15s ease;
      }

      .bf-cookie-btn:hover {
        background: #f5f7f8;
        border-color: #cbd4da;
      }

      .bf-cookie-btn:active {
        transform: scale(.98);
      }

      .bf-cookie-btn.primary {
        border-color: #17232c;
        background: #17232c;
        color: #ffffff;
      }

      .bf-cookie-btn.primary:hover {
        background: #26353f;
      }

      .bf-cookie-btn.manage {
        background: #f6f8f9;
      }

      /* =================================
         SETTINGS MODAL
         ================================= */

      .bf-cookie-settings-overlay {
        position: fixed;
        inset: 0;

        z-index: 100000;

        display: flex;
        align-items: center;
        justify-content: center;

        padding: 18px;

        background:
          rgba(15, 23, 42, .45);

        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }

      .bf-cookie-settings {
        width: min(
          520px,
          100%
        );

        max-height: min(
          620px,
          calc(100vh - 36px)
        );

        overflow: auto;

        border: 1px solid #e2e8ec;
        border-radius: 18px;

        background: #ffffff;

        box-shadow:
          0 25px 70px rgba(15, 23, 42, .22);
      }

      .bf-cookie-settings-head {
        display: flex;
        align-items: center;
        justify-content: space-between;

        gap: 15px;

        padding: 18px 20px;

        border-bottom:
          1px solid #edf0f2;
      }

      .bf-cookie-settings-head h3 {
        margin: 0;

        font-size: 16px;
        font-weight: 850;

        color: #182630;
      }

      .bf-cookie-close {
        width: 34px;
        height: 34px;

        border: 0;
        border-radius: 8px;

        background: #f3f6f8;

        color: #667680;

        font-size: 17px;

        cursor: pointer;
      }

      .bf-cookie-settings-body {
        padding: 18px 20px;
      }

      .bf-cookie-setting-item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;

        gap: 14px;

        padding: 13px 0;

        border-bottom:
          1px solid #eef1f3;
      }

      .bf-cookie-setting-item:last-child {
        border-bottom: 0;
      }

      .bf-cookie-setting-text {
        min-width: 0;
      }

      .bf-cookie-setting-text strong {
        display: block;

        margin-bottom: 3px;

        font-size: 12px;
        font-weight: 800;

        color: #26343e;
      }

      .bf-cookie-setting-text p {
        margin: 0;

        font-size: 11px;
        line-height: 1.5;

        color: #788690;
      }

      .bf-cookie-badge {
        flex-shrink: 0;

        padding: 5px 8px;

        border-radius: 6px;

        background: #eef3f5;

        color: #62727c;

        font-size: 9px;
        font-weight: 850;
      }

      .bf-cookie-settings-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;

        padding:
          14px 20px 18px;
      }

      /* =================================
         DARK MODE
         ================================= */

      .dark .bf-cookie-overlay {
        background:
          rgba(0, 0, 0, .52);
      }

      .dark .bf-cookie-banner,
      .dark .bf-cookie-settings {
        background: #151d24;
        border-color: #29343d;
      }

      .dark .bf-cookie-logo,
      .dark .bf-cookie-btn.manage,
      .dark .bf-cookie-close,
      .dark .bf-cookie-badge {
        background: #1b252d;
      }

      .dark .bf-cookie-title,
      .dark .bf-cookie-settings-head h3,
      .dark .bf-cookie-setting-text strong {
        color: #edf2f5;
      }

      .dark .bf-cookie-description,
      .dark .bf-cookie-setting-text p {
        color: #94a3ad;
      }

      .dark .bf-cookie-description a {
        color: #c7d2d9;
      }

      .dark .bf-cookie-btn {
        background: #1b252d;
        border-color: #34414b;
        color: #edf2f5;
      }

      .dark .bf-cookie-btn.primary {
        background: #edf2f5;
        border-color: #edf2f5;
        color: #151d24;
      }

      .dark .bf-cookie-settings-head,
      .dark .bf-cookie-setting-item {
        border-color: #29343d;
      }

      /* =================================
         MOBILE
         ================================= */

      @media (max-width: 700px) {

        .bf-cookie-banner {
          left: 10px;
          right: 10px;
          bottom: 10px;

          width:
            calc(100% - 20px);

          padding: 15px;

          grid-template-columns: 1fr;

          gap: 14px;

          border-radius: 15px;
        }

        .bf-cookie-logo {
          width: 40px;
          height: 40px;
          min-width: 40px;
        }

        .bf-cookie-logo img {
          width: 29px;
          height: 29px;
        }

        .bf-cookie-actions {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          width: 100%;
        }

        .bf-cookie-btn {
          width: 100%;
          padding: 0 8px;
          font-size: 11px;
        }

        .bf-cookie-settings {
          border-radius: 15px;
        }
      }

      @media (max-width: 430px) {

        .bf-cookie-actions {
          grid-template-columns: 1fr;
        }

        .bf-cookie-btn {
          min-height: 40px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function removeBanner() {
    document
      .getElementById(
        "bf-cookie-overlay"
      )
      ?.remove();

    document
      .getElementById(
        "bf-cookie-banner"
      )
      ?.remove();
  }

  function closeSettings() {
    document
      .getElementById(
        "bf-cookie-settings-overlay"
      )
      ?.remove();
  }

  function accept() {
    setCookie(
      COOKIE_NAME,
      "accepted",
      COOKIE_DAYS
    );

    closeSettings();
    removeBanner();
  }

  function refuse() {
    setCookie(
      COOKIE_NAME,
      "refused",
      COOKIE_DAYS
    );

    closeSettings();
    removeBanner();
  }

  function createSettings() {
    if (
      document.getElementById(
        "bf-cookie-settings-overlay"
      )
    ) {
      return;
    }

    const overlay =
      document.createElement("div");

    overlay.id =
      "bf-cookie-settings-overlay";

    overlay.className =
      "bf-cookie-settings-overlay";

    overlay.innerHTML = `

      <div
        class="bf-cookie-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bf-cookie-settings-title"
      >

        <div class="bf-cookie-settings-head">

          <h3 id="bf-cookie-settings-title">
            Gérer vos préférences
          </h3>

          <button
            type="button"
            class="bf-cookie-close"
            id="bf-cookie-close"
            aria-label="Fermer"
          >
            ×
          </button>

        </div>

        <div class="bf-cookie-settings-body">

          <div class="bf-cookie-setting-item">

            <div class="bf-cookie-setting-text">

              <strong>
                Cookies nécessaires
              </strong>

              <p>
                Utilisés pour permettre au site
                de fonctionner correctement et
                mémoriser vos préférences.
              </p>

            </div>

            <span class="bf-cookie-badge">
              Toujours actifs
            </span>

          </div>

          <div class="bf-cookie-setting-item">

            <div class="bf-cookie-setting-text">

              <strong>
                Cookies optionnels
              </strong>

              <p>
                Vous pouvez choisir de les
                accepter ou de les refuser.
                Votre choix peut être modifié
                ultérieurement.
              </p>

            </div>

            <span class="bf-cookie-badge">
              Votre choix
            </span>

          </div>

          <div class="bf-cookie-setting-item">

            <div class="bf-cookie-setting-text">

              <strong>
                Confidentialité
              </strong>

              <p>
                Consultez notre politique de
                confidentialité pour plus
                d'informations.
              </p>

            </div>

            <a
              href="/privacy.html"
              class="bf-cookie-badge"
              style="text-decoration:none"
            >
              Voir
            </a>

          </div>

        </div>

        <div class="bf-cookie-settings-actions">

          <button
            type="button"
            class="bf-cookie-btn"
            id="bf-cookie-settings-refuse"
          >
            Refuser
          </button>

          <button
            type="button"
            class="bf-cookie-btn primary"
            id="bf-cookie-settings-accept"
          >
            Accepter
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(
      overlay
    );

    document
      .getElementById(
        "bf-cookie-close"
      )
      ?.addEventListener(
        "click",
        closeSettings
      );

    document
      .getElementById(
        "bf-cookie-settings-refuse"
      )
      ?.addEventListener(
        "click",
        refuse
      );

    document
      .getElementById(
        "bf-cookie-settings-accept"
      )
      ?.addEventListener(
        "click",
        accept
      );

    overlay.addEventListener(
      "click",
      event => {
        if (
          event.target === overlay
        ) {
          closeSettings();
        }
      }
    );
  }

  function createBanner() {
    if (
      document.getElementById(
        "bf-cookie-banner"
      )
    ) {
      return;
    }

    const overlay =
      document.createElement("div");

    overlay.id =
      "bf-cookie-overlay";

    overlay.className =
      "bf-cookie-overlay";

    document.body.appendChild(
      overlay
    );

    const banner =
      document.createElement("div");

    banner.id =
      "bf-cookie-banner";

    banner.className =
      "bf-cookie-banner";

    banner.innerHTML = `

      <div class="bf-cookie-brand">

        <div class="bf-cookie-logo">

          <img
            src="/logo.svg"
            alt="BakhiraFoot"
          >

        </div>

        <div class="bf-cookie-main">

          <h3 class="bf-cookie-title">
            🍪 Votre confidentialité compte
          </h3>

          <p class="bf-cookie-description">

            BakhiraFoot utilise des cookies
            nécessaires au fonctionnement du site
            et pour mémoriser vos préférences.
            Vous gardez le contrôle sur votre choix.

            <a href="/privacy.html">
              En savoir plus
            </a>

          </p>

        </div>

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
          class="bf-cookie-btn manage"
          id="bf-cookie-manage"
        >
          Gérer
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

    document.body.appendChild(
      banner
    );

    document
      .getElementById(
        "bf-cookie-refuse"
      )
      ?.addEventListener(
        "click",
        refuse
      );

    document
      .getElementById(
        "bf-cookie-accept"
      )
      ?.addEventListener(
        "click",
        accept
      );

    document
      .getElementById(
        "bf-cookie-manage"
      )
      ?.addEventListener(
        "click",
        createSettings
      );
  }

  addStyles();

  const consent =
    getCookie(
      COOKIE_NAME
    );

  if (!consent) {
    createBanner();
  }

})();
