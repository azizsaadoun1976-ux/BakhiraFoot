(() => {
  "use strict";

  const STORAGE_KEY =
    "bakhirafoot_favorite_teams";

  let favoritesMode = false;
  let refreshQueued = false;

  /* =====================================================
     STORAGE
  ===================================================== */

  function getFavorites() {

    try {

      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );

      const parsed =
        saved
          ? JSON.parse(saved)
          : [];

      return Array.isArray(parsed)
        ? parsed
        : [];

    }
    catch {
      return [];
    }
  }

  function saveFavorites(
    list
  ) {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(list)
      );

    }
    catch {

      console.warn(
        "BakhiraFoot: localStorage unavailable"
      );

    }
  }

  /* =====================================================
     HELPERS
  ===================================================== */

  function normalize(
    value
  ) {

    return String(
      value || ""
    )
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function getTeamNames(
    card
  ) {

    if (!card) {
      return {
        home: "",
        away: ""
      };
    }

    const teams =
      card.querySelectorAll(
        ".flash-team"
      );

    const names = [];

    teams.forEach(
      team => {

        const name =
          team
            .querySelector(
              ".team span:not(.teamLogo)"
            )
            ?.textContent
            ?.trim() || "";

        if (name) {
          names.push(name);
        }

      }
    );

    return {

      home:
        names[0] || "",

      away:
        names[1] || ""

    };
  }

  function isFavorite(
    teamName
  ) {

    const key =
      normalize(
        teamName
      );

    if (!key) {
      return false;
    }

    return getFavorites()
      .some(
        item =>
          normalize(item) ===
          key
      );
  }

  /* =====================================================
     TOGGLE
  ===================================================== */

  function toggleFavorite(
    teamName
  ) {

    if (!teamName) {
      return;
    }

    const favorites =
      getFavorites();

    const key =
      normalize(
        teamName
      );

    const index =
      favorites.findIndex(
        item =>
          normalize(item) ===
          key
      );

    if (index >= 0) {

      favorites.splice(
        index,
        1
      );

    }
    else {

      favorites.push(
        teamName
      );

    }

    saveFavorites(
      favorites
    );

    /*
     * ما نستعملوش observer refresh بلا نهاية.
     */
    refreshStars();
    applyFavoritesFilter();

  }

  /* =====================================================
     FAVORITE BUTTON
  ===================================================== */

  function createFavoriteButton(
    teamName
  ) {

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "bf-favorite-btn";

    button.dataset.team =
      teamName;

    button.setAttribute(
      "aria-label",
      `Ajouter ${teamName} aux favoris`
    );

    updateFavoriteButton(
      button
    );

    button.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopPropagation();

        toggleFavorite(
          teamName
        );

      }
    );

    return button;
  }

  function updateFavoriteButton(
    button
  ) {

    if (!button) {
      return;
    }

    const team =
      button.dataset.team || "";

    if (!team) {
      return;
    }

    const active =
      isFavorite(
        team
      );

    const newIcon =
      active
        ? "★"
        : "☆";

    /*
     * مهم:
     * ما نبدلوش DOM إلا كان فعلاً تبدل.
     * هادشي كيمنع MutationObserver loop.
     */
    if (
      button.textContent !==
      newIcon
    ) {

      button.textContent =
        newIcon;

    }

    const alreadyActive =
      button.classList.contains(
        "active"
      );

    if (
      alreadyActive !==
      active
    ) {

      button.classList.toggle(
        "active",
        active
      );

    }

    const aria =
      active
        ? `Retirer ${team} des favoris`
        : `Ajouter ${team} aux favoris`;

    if (
      button.getAttribute(
        "aria-label"
      ) !== aria
    ) {

      button.setAttribute(
        "aria-label",
        aria
      );

    }

  }

  /* =====================================================
     ADD STARS
  ===================================================== */

  function addStarsToCards() {

    const cards =
      document.querySelectorAll(
        ".match-card"
      );

    cards.forEach(
      card => {

        if (
          card.querySelector(
            ".bf-favorite-wrap"
          )
        ) {
          return;
        }

        const {
          home,
          away
        } =
          getTeamNames(
            card
          );

        if (
          !home &&
          !away
        ) {
          return;
        }

        const wrapper =
          document.createElement(
            "div"
          );

        wrapper.className =
          "bf-favorite-wrap";

        if (home) {

          wrapper.appendChild(
            createFavoriteButton(
              home
            )
          );

        }

        if (away) {

          wrapper.appendChild(
            createFavoriteButton(
              away
            )
          );

        }

        card.appendChild(
          wrapper
        );

      }
    );
  }

  /* =====================================================
     REFRESH STARS
  ===================================================== */

  function refreshStars() {

    document
      .querySelectorAll(
        ".bf-favorite-btn"
      )
      .forEach(
        button => {

          updateFavoriteButton(
            button
          );

        }
      );
  }

  /* =====================================================
     FAVORITES FILTER
  ===================================================== */

  function applyFavoritesFilter() {

    const cards =
      document.querySelectorAll(
        ".match-card"
      );

    if (!favoritesMode) {

      cards.forEach(
        card => {

          if (
            card.style.display !==
            ""
          ) {
            card.style.display =
              "";
          }

        }
      );

      return;
    }

    const favorites =
      getFavorites();

    cards.forEach(
      card => {

        const {
          home,
          away
        } =
          getTeamNames(
            card
          );

        const visible =
          favorites.some(
            favorite =>
              normalize(
                favorite
              ) ===
                normalize(
                  home
                ) ||

              normalize(
                favorite
              ) ===
                normalize(
                  away
                )
          );

        const display =
          visible
            ? ""
            : "none";

        if (
          card.style.display !==
          display
        ) {

          card.style.display =
            display;

        }

      }
    );
  }

  /* =====================================================
     FAVORITES BUTTON
  ===================================================== */

  function findFavoritesButton() {

    const buttons =
      document.querySelectorAll(
        "aside .filter"
      );

    for (
      const button
      of buttons
    ) {

      const buttonText =
        button.textContent
          .trim()
          .toLowerCase();

      if (
        buttonText.includes(
          "favoris"
        )
      ) {

        return button;

      }

    }

    return null;
  }

  function setupFavoritesButton() {

    const button =
      findFavoritesButton();

    if (
      !button ||
      button.dataset.bfReady
    ) {
      return;
    }

    button.dataset.bfReady =
      "true";

    button.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopImmediatePropagation();

        favoritesMode =
          !favoritesMode;

        button.classList.toggle(
          "active",
          favoritesMode
        );

        if (
          favoritesMode
        ) {

          const favorites =
            getFavorites();

          if (
            !favorites.length
          ) {

            favoritesMode =
              false;

            button.classList.remove(
              "active"
            );

            alert(
              "⭐ Ajoute d'abord une équipe à tes favoris."
            );

            return;
          }
        }

        applyFavoritesFilter();

      },
      true
    );
  }

  /* =====================================================
     STYLES
  ===================================================== */

  function addStyles() {

    if (
      document.getElementById(
        "bf-favorites-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "bf-favorites-style";

    style.textContent = `

      .match-card {
        position: relative;
      }

      .bf-favorite-wrap {
        position: absolute;

        right: 10px;
        top: 38px;

        z-index: 20;

        display: flex;
        flex-direction: column;

        gap: 5px;
      }

      .bf-favorite-btn {
        width: 26px;
        height: 26px;

        display: flex;
        align-items: center;
        justify-content: center;

        padding: 0;

        border:
          1px solid #dfe5e9;

        border-radius: 7px;

        background:
          rgba(
            255,
            255,
            255,
            .92
          );

        color:
          #9aa6ae;

        font-size: 15px;
        line-height: 1;

        cursor: pointer;

        transition:
          transform .15s ease,
          background .15s ease,
          color .15s ease;
      }

      .bf-favorite-btn:hover {
        background:
          #f4f7f8;

        transform:
          scale(1.05);
      }

      .bf-favorite-btn.active {
        color:
          #e0a400;

        border-color:
          #ecd37a;

        background:
          #fff9df;
      }

      .dark .bf-favorite-btn {
        background:
          #1b252d;

        border-color:
          #34414b;

        color:
          #8d9aa3;
      }

      .dark .bf-favorite-btn.active {
        color:
          #ffd45a;

        border-color:
          #6b5a25;

        background:
          #302b1c;
      }

      @media(max-width:700px) {

        .bf-favorite-wrap {
          right: 6px;
          top: 35px;
        }

        .bf-favorite-btn {
          width: 23px;
          height: 23px;
          font-size: 13px;
        }

      }

    `;

    document.head.appendChild(
      style
    );
  }

  /* =====================================================
     SAFE REFRESH
  ===================================================== */

  function refresh() {

    if (
      refreshQueued
    ) {
      return;
    }

    refreshQueued =
      true;

    requestAnimationFrame(
      () => {

        refreshQueued =
          false;

        addStarsToCards();

        setupFavoritesButton();

        refreshStars();

        applyFavoritesFilter();

      }
    );
  }

  /* =====================================================
     OBSERVER
     -----------------------------------------------------
     كنراقبو غير ظهور match-card جديدة.
     ماشي كل mutation داخل body.
  ===================================================== */

  const observer =
    new MutationObserver(
      mutations => {

        let needsRefresh =
          false;

        for (
          const mutation
          of mutations
        ) {

          if (
            mutation.type !==
            "childList"
          ) {
            continue;
          }

          for (
            const node
            of mutation.addedNodes
          ) {

            if (
              node.nodeType !==
              1
            ) {
              continue;
            }

            if (
              node.matches?.(
                ".match-card"
              ) ||
              node.querySelector?.(
                ".match-card"
              )
            ) {

              needsRefresh =
                true;

              break;
            }

          }

          if (
            needsRefresh
          ) {
            break;
          }
        }

        if (
          needsRefresh
        ) {
          refresh();
        }

      }
    );

  /* =====================================================
     START
  ===================================================== */

  addStyles();

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  setTimeout(
    refresh,
    300
  );

})();
