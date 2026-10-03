(function () {
  "use strict";

  /* =========================================================
     BAKHIRAFOOT - NEW MATCH DETAILS
     
     هاد الملف كيخدم غير مع:
     - SofaScore
     - ESPN
     - TheSportsDB

     SportScore القديم ما كنقربوش ليه.
  ========================================================= */

  function clean(value) {
    return String(value || "").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function addPrefix(value, prefix) {
    const id = clean(value);

    if (!id) {
      return null;
    }

    if (
      lower(id).startsWith(prefix)
    ) {
      return id;
    }

    return `${prefix}${id}`;
  }

  function getMatchFromIndex(index) {
    try {
      if (
        typeof currentMatches !== "undefined" &&
        Array.isArray(currentMatches)
      ) {
        return currentMatches[index] || null;
      }
    } catch (error) {
      console.error(
        "BakhiraFoot new details:",
        error
      );
    }

    return null;
  }

  function getNewMatchIdentifier(
    match,
    card
  ) {
    if (!match) {
      return null;
    }

    const provider =
      lower(
        match?.provider ||
        match?.score?.provider ||
        match?.source ||
        match?.fixture?.provider ||
        ""
      );

    const rawId =
      clean(
        card?.dataset?.fixtureId ||
        match?.fixture?.upstreamId ||
        match?.upstreamId ||
        match?.fixture?.slug ||
        match?.slug ||
        match?.fixture?.id ||
        match?.id ||
        match?.match_id ||
        ""
      );

    if (!rawId) {
      return null;
    }

    /* =====================================================
       SOFASCORE
    ===================================================== */

    if (
      provider === "sofascore" ||
      provider === "sofa" ||
      lower(rawId).startsWith("sofa-")
    ) {
      return addPrefix(
        rawId,
        "sofa-"
      );
    }

    /* =====================================================
       ESPN
    ===================================================== */

    if (
      provider === "espn" ||
      lower(rawId).startsWith("espn-")
    ) {
      return addPrefix(
        rawId,
        "espn-"
      );
    }

    /* =====================================================
       THESPORTSDB
    ===================================================== */

    if (
      provider === "thesportsdb" ||
      provider === "tsdb" ||
      lower(rawId).startsWith("tsdb-")
    ) {
      return addPrefix(
        rawId,
        "tsdb-"
      );
    }

    /* =====================================================
       SportScore
       → ما ندير والو
    ===================================================== */

    return null;
  }

  /* =========================================================
     NEW MATCH CLICK
     
     capture = true
     
     مهم:
     هاد الملف خاصو يتحط قبل match-details.js
     فـ index.html
  ========================================================= */

  document.addEventListener(
    "click",
    function (event) {

      const target =
        event.target;

      if (
        !target ||
        !target.closest
      ) {
        return;
      }

      const card =
        target.closest(
          ".match-card"
        );

      if (!card) {
        return;
      }

      const index =
        Number(
          card.dataset.matchIndex
        );

      if (
        !Number.isInteger(index) ||
        index < 0
      ) {
        return;
      }

      const match =
        getMatchFromIndex(
          index
        );

      const identifier =
        getNewMatchIdentifier(
          match,
          card
        );

      /*
       * إلا ما كانش ماتش جديد:
       * نخليو النظام القديم خدام.
       */

      if (!identifier) {
        return;
      }

      /*
       * ماتش جديد:
       * نوقفو onclick ديال script.js
       * باش ما يمشيش لـSportScore.
       */

      event.preventDefault();
      event.stopImmediatePropagation();

      console.log(
        "BAKHIRAFOOT NEW MATCH:",
        {
          identifier,
          provider:
            match?.provider ||
            match?.score?.provider ||
            null
        }
      );

      /*
       * نستعملو نفس واجهة
       * match-details.js القديمة.
       */

      if (
        typeof window.bfOpenMatchDetails ===
        "function"
      ) {
        window.bfOpenMatchDetails(
          identifier
        );
        return;
      }

      console.error(
        "BakhiraFoot: match-details.js introuvable"
      );
    },
    true
  );

})();
