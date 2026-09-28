(() => {
  "use strict";

  const STORAGE_KEY =
    "bakhirafoot_favorite_teams";

  let favoritesMode = false;

  function getFavorites() {
    try {
      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );

      const parsed =
        saved ? JSON.parse(saved) : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  function saveFavorites(list) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list)
    );
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function getTeamNames(card) {
    const teams =
      card.querySelectorAll(
        ".flash-team"
      );

    const names = [];

    teams.forEach(team => {
      const name =
        team
          .querySelector(
            ".team span:not(.teamLogo)"
          )
          ?.textContent
          .trim();

      if (name) {
        names.push(name);
      }
    });

    return {
      home: names[0] || "",
      away: names[1] || ""
    };
  }

  function isFavorite(teamName) {
    const key =
      normalize(teamName);

    return getFavorites()
      .some(
        item =>
          normalize(item) === key
      );
  }

  function toggleFavorite(teamName) {
    if (!teamName) return;

    const favorites =
      getFavorites();

    const key =
      normalize(teamName);

    const index =
      favorites.findIndex(
        item =>
          normalize(item) === key
      );

    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push(teamName);
    }

    saveFavorites(favorites);

    refreshStars();
    applyFavoritesFilter();
  }

  function createFavoriteButton(
    teamName
  ) {
    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "bf-favorite-btn";

    button.dataset.team =
      teamName;

    button.setAttribute(
      "aria-label",
      `Ajouter ${teamName} aux favoris`
    );

    button.innerHTML =
      isFavorite(teamName)
        ? "★"
        : "☆";

    if (isFavorite(teamName)) {
      button.classList.add("active");
    }

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        toggleFavorite(teamName);
      }
    );

    return button;
  }

  function addStarsToCards() {
    const cards =
      document.querySelectorAll(
        ".match-card"
      );

    cards.forEach(card => {

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
      } = getTeamNames(card);

      if (!home && !away) {
        return;
      }

      const wrapper =
        document.createElement("div");

      wrapper.className =
        "bf-favorite-wrap";

      if (home) {
        wrapper.appendChild(
          createFavoriteButton(home)
        );
      }

      if (away) {
        wrapper.appendChild(
          createFavoriteButton(away)
        );
      }

      card.appendChild(wrapper);
    });
  }

  function refreshStars() {
    document
      .querySelectorAll(
        ".bf-favorite-btn"
      )
      .forEach(button => {

        const team =
          button.dataset.team;

        const active =
          isFavorite(team);

        button.innerHTML =
          active ? "★" : "☆";

        button.classList.toggle(
          "active",
          active
        );

        button.setAttribute(
          "aria-label",
          active
            ? `Retirer ${team} des favoris`
            : `Ajouter ${team} aux favoris`
        );
      });
  }

  function applyFavoritesFilter() {
    const cards =
      document.querySelectorAll(
        ".match-card"
      );

    if (!favoritesMode) {
      cards.forEach(card => {
        card.style.display = "";
      });

      return;
    }

    const favorites =
      getFavorites();

    cards.forEach(card => {

      const {
        home,
        away
      } = getTeamNames(card);

      const visible =
        favorites.some(
          favorite =>
            normalize(favorite) ===
              normalize(home) ||
            normalize(favorite) ===
              normalize(away)
        );

      card.style.display =
        visible ? "" : "none";
    });
  }

  function findFavoritesButton() {
    const buttons =
      document.querySelectorAll(
        "aside .filter"
      );

    for (const button of buttons) {

      const text =
        button.textContent
          .trim()
          .toLowerCase();

      if (
        text.includes("favoris")
      ) {
        return button;
      }
    }

    return null;
  }

  function setupFavoritesButton() {
    const button =
      findFavoritesButton();

    if (!button || button.dataset.bfReady) {
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

        if (favoritesMode) {

          const favorites =
            getFavorites();

          if (!favorites.length) {

            favoritesMode = false;

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

  function addStyles() {

    if (
      document.getElementById(
        "bf-favorites-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

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

        z-index: 5;

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

        background: rgba(
          255,
          255,
          255,
          .92
        );

        color: #9aa6ae;

        font-size: 15px;
        line-height: 1;

        cursor: pointer;

        transition:
          .15s ease;
      }

      .bf-favorite-btn:hover {
        background: #f4f7f8;
        transform: scale(1.05);
      }

      .bf-favorite-btn.active {
        color: #e0a400;
        border-color: #ecd37a;
        background: #fff9df;
      }

      .dark .bf-favorite-btn {
        background: #1b252d;
        border-color: #34414b;
        color: #8d9aa3;
      }

      .dark .bf-favorite-btn.active {
        color: #ffd45a;
        border-color: #6b5a25;
        background: #302b1c;
      }

      @media (max-width: 700px) {

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

    document.head.appendChild(style);
  }

  function refresh() {
    addStarsToCards();
    setupFavoritesButton();
    refreshStars();
    applyFavoritesFilter();
  }

  addStyles();

  /*
   * Les cartes des matchs sont générées
   * dynamiquement par script.js.
   * On les surveille sans toucher à script.js.
   */

  const observer =
    new MutationObserver(() => {
      refresh();
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  /*
   * Première exécution
   */

  setTimeout(
    refresh,
    300
  );

})();
