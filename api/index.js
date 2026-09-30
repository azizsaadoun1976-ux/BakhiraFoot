/* =========================================================
   BAKHIRAFOOT PRO API
   LIVE + DATE + MATCH DETAILS
   ========================================================= */

module.exports = async function handler(req, res) {
  const query = req.query || {};

  const live = query.live || null;
  const date = query.date || null;
  const fixture = query.fixture || null;

  const SPORTSCORE_V1 =
    "https://sportscore.com/api/v1";

  const SPORTSCORE_WIDGET =
    "https://sportscore.com";

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  /* =======================================================
     RESPONSE
  ======================================================= */

  function send(
    status,
    payload
  ) {

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "s-maxage=30, stale-while-revalidate=60"
    );

    return res
      .status(status)
      .json(payload);
  }

  /* =======================================================
     FETCH WITH TIMEOUT
  ======================================================= */

  async function fetchJSON(
    url,
    timeoutMs = 12000
  ) {

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () => {
          controller.abort();
        },
        timeoutMs
      );

    try {

      console.log(
        "SPORTSCORE REQUEST:",
        url
      );

      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",

              "User-Agent":
                "Mozilla/5.0"
            },

            cache:
              "no-store",

            signal:
              controller.signal
          }
        );

      const raw =
        await response.text();

      let data = null;

      try {

        data =
          JSON.parse(
            raw
          );

      } catch {

        data = {
          raw
        };

      }

      if (
        !response.ok
      ) {

        const error =
          new Error(
            `SportScore HTTP ${response.status}`
          );

        error.status =
          response.status;

        error.data =
          data;

        throw error;
      }

      return data;

    } finally {

      clearTimeout(
        timer
      );

    }
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  function arr(value) {
    return Array.isArray(value)
      ? value
      : [];
  }

  function object(value) {

    return (
      value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
    )
      ? value
      : {};
  }

  function text(value) {

    if (
      typeof value ===
      "string"
    ) {
      return value;
    }

    if (
      typeof value ===
      "number"
    ) {
      return String(value);
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {

      return (
        value.name ||
        value.full_name ||
        value.fullName ||
        value.title ||
        ""
      );

    }

    return "";
  }

  function idOf(value) {

    if (
      typeof value ===
        "string" ||
      typeof value ===
        "number"
    ) {
      return value;
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {

      return (
        value.id ||
        value.team_id ||
        value.player_id ||
        null
      );

    }

    return null;
  }

  function slugify(value) {

    return String(
      value || ""
    )
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );
  }

  /* =======================================================
     EXTRACT MATCHES
  ======================================================= */

  function extractMatches(
    body
  ) {

    if (
      Array.isArray(
        body
      )
    ) {
      return body;
    }

    if (
      Array.isArray(
        body?.data
      )
    ) {
      return body.data;
    }

    if (
      Array.isArray(
        body?.matches
      )
    ) {
      return body.matches;
    }

    if (
      Array.isArray(
        body?.fixtures
      )
    ) {
      return body.fixtures;
    }

    if (
      Array.isArray(
        body?.response
      )
    ) {
      return body.response;
    }

    return [];
  }

  /* =======================================================
     EXTRACT DETAILS
  ======================================================= */

  function extractDetails(
    body
  ) {

    if (
      body?.match &&
      typeof body.match ===
        "object"
    ) {

      return body.match;

    }

    if (
      body?.data?.match &&
      typeof body.data.match ===
        "object"
    ) {

      return body.data.match;

    }

    if (
      body?.data &&
      typeof body.data ===
        "object" &&
      !Array.isArray(
        body.data
      )
    ) {

      return body.data;

    }

    return body;
  }

  /* =======================================================
     TEAM
  ======================================================= */

  function normalizeTeam(
    raw,
    fallbackName = "",
    fallbackLogo = ""
  ) {

    const team =
      raw &&
      typeof raw ===
        "object"
        ? raw
        : {};

    return {

      id:
        idOf(team),

      name:
        text(team) ||
        team.name ||
        fallbackName ||
        "Équipe",

      logo:
        team.logo ||
        team.image ||
        team.picture ||
        fallbackLogo ||
        ""

    };
  }

  /* =======================================================
     MATCH LIST NORMALIZATION
  ======================================================= */

  function normalizeMatch(
    raw
  ) {

    if (
      !raw
    ) {
      return null;
    }

    const item =
      raw?.match &&
      typeof raw.match ===
        "object"
        ? raw.match
        : raw;

    const homeRaw =
      item?.home_team ||
      item?.homeTeam ||
      item?.teams?.home ||
      item?.home ||
      {};

    const awayRaw =
      item?.away_team ||
      item?.awayTeam ||
      item?.teams?.away ||
      item?.away ||
      {};

    const homeName =
      text(homeRaw) ||
      item?.home_name ||
      "Domicile";

    const awayName =
      text(awayRaw) ||
      item?.away_name ||
      "Extérieur";

    const homeLogo =
      homeRaw?.logo ||
      homeRaw?.image ||
      item?.home_logo ||
      "";

    const awayLogo =
      awayRaw?.logo ||
      awayRaw?.image ||
      item?.away_logo ||
      "";

    const homeId =
      idOf(homeRaw) ||
      item?.home_id ||
      null;

    const awayId =
      idOf(awayRaw) ||
      item?.away_id ||
      null;

    const slug =
      item?.slug ||
      item?.match_slug ||
      (
        homeName &&
        awayName
          ? `${slugify(
              homeName
            )}-vs-${slugify(
              awayName
            )}`
          : null
      );

    const score =
      object(
        item?.score
      );

    const homeScore =
      item?.home_score ??
      item?.homeScore ??
      score?.home ??
      score?.fulltime?.home ??
      null;

    const awayScore =
      item?.away_score ??
      item?.awayScore ??
      score?.away ??
      score?.fulltime?.away ??
      null;

    let status =
      item?.status_code ||
      item?.short_status ||
      "";

    const statusText =
      String(
        item?.status_text ||
        item?.status ||
        ""
      ).toLowerCase();

    if (
      !status
    ) {

      if (
        statusText.includes(
          "live"
        ) ||
        statusText.includes(
          "in play"
        ) ||
        statusText.includes(
          "inplay"
        )
      ) {

        status =
          "LIVE";

      } else if (
        statusText.includes(
          "half"
        )
      ) {

        status =
          "HT";

      } else if (
        statusText.includes(
          "finish"
        ) ||
        statusText.includes(
          "ended"
        ) ||
        statusText ===
          "ft"
      ) {

        status =
          "FT";

      } else {

        status =
          "NS";
      }
    }

    const competition =
      item?.competition ||
      item?.league ||
      {};

    return {

      id:
        slug ||
        item?.id ||
        null,

      slug,

      fixture: {

        id:
          slug ||
          item?.id ||
          null,

        slug,

        upstreamId:
          item?.id ||
          item?.match_id ||
          item?.fixture_id ||
          null,

        date:
          item?.time ||
          item?.date ||
          item?.start_time ||
          item?.kickoff ||
          null,

        status: {

          short:
            status,

          long:
            item?.status_text ||
            item?.status ||
            "Match",

          elapsed:
            item?.minute ??
            item?.elapsed ??
            null

        },

        venue:
          item?.venue ||
          null,

        referee:
          item?.referee ||
          null,

        timezone:
          item?.timezone ||
          "UTC"

      },

      league: {

        id:
          idOf(
            competition
          ) ||
          item?.league_id ||
          item?.competition_id ||
          null,

        name:
          text(
            competition
          ) ||
          item?.league_name ||
          item?.competition_name ||
          "Football",

        country:
          competition?.country ||
          item?.country ||
          "",

        logo:
          competition?.logo ||
          item?.competition_logo ||
          ""

      },

      teams: {

        home:
          normalizeTeam(
            homeRaw,
            homeName,
            homeLogo
          ),

        away:
          normalizeTeam(
            awayRaw,
            awayName,
            awayLogo
          )

      },

      goals: {

        home:
          homeScore,

        away:
          awayScore

      },

      score: {

        home:
          homeScore,

        away:
          awayScore,

        halftime: {

          home:
            score?.halftime?.home ??
            score?.ht?.home ??
            null,

          away:
            score?.halftime?.away ??
            score?.ht?.away ??
            null

        },

        fulltime: {

          home:
            homeScore,

          away:
            awayScore

        }

      }

    };
  }

  /* =======================================================
     PLAYER
  ======================================================= */

  function normalizePlayer(
    item
  ) {

    if (
      typeof item ===
        "string"
    ) {

      return {

        player: {

          id:
            null,

          name:
            item,

          number:
            null,

          pos:
            "",

          grid:
            "",

          x:
            null,

          y:
            null,

          photo:
            "",

          logo:
            ""

        },

        rating:
          null,

        first:
          null,

        injury:
          null

      };
    }

    const source =
      object(item);

    const player =
      source?.player &&
      typeof source.player ===
        "object"
        ? source.player
        : source;

    return {

      player: {

        id:
          player?.id ??
          source?.player_id ??
          null,

        name:
          player?.name ||
          player?.full_name ||
          player?.fullName ||
          source?.name ||
          source?.player_name ||
          "Joueur",

        number:
          source?.shirt_number ??
          source?.shirtNumber ??
          source?.number ??
          player?.shirt_number ??
          player?.shirtNumber ??
          player?.number ??
          null,

        pos:
          source?.position ||
          source?.pos ||
          player?.position ||
          player?.pos ||
          "",

        grid:
          source?.grid ||
          source?.positionGrid ||
          player?.grid ||
          "",

        x:
          source?.x ??
          player?.x ??
          null,

        y:
          source?.y ??
          player?.y ??
          null,

        photo:
          source?.photo ||
          source?.logo ||
          source?.picture ||
          source?.image ||
          source?.avatar ||
          player?.photo ||
          player?.logo ||
          player?.picture ||
          player?.image ||
          "",

        logo:
          source?.logo ||
          player?.logo ||
          source?.photo ||
          player?.photo ||
          ""

      },

      rating:
        source?.rating ??
        source?.performance?.rating ??
        source?.statistics?.rating ??
        player?.rating ??
        null,

      first:
        source?.first ??
        player?.first ??
        null,

      injury:
        source?.injury ??
        source?.injured ??
        player?.injury ??
        player?.injured ??
        null

    };
  }

  /* =======================================================
     LINEUPS
  ======================================================= */

  function normalizeLineups(
    root
  ) {

    const raw =
      root?.lineups ||
      root?.lineup ||
      root?.compositions ||
      {};

    const result =
      [];

    if (
      Array.isArray(
        raw
      )
    ) {

      for (
        let i = 0;
        i < raw.length;
        i++
      ) {

        const item =
          object(
            raw[i]
          );

        const team =
          normalizeTeam(
            item?.team ||
            item?.club ||
            {},
            i === 0
              ? "Domicile"
              : "Extérieur",
            ""
          );

        const players =
          arr(
            item?.players ||
            item?.startXI ||
            item?.startingXI ||
            item?.xi
          );

        const bench =
          arr(
            item?.substitutes ||
            item?.subs ||
            item?.bench
          );

        result.push({

          team,

          formation:
            item?.formation ||
            "—",

          startXI:
            players
              .filter(
                player =>
                  player?.first !==
                    0 &&
                  player?.starter !==
                    false &&
                  player?.substitute !==
                    true
              )
              .slice(0,11)
              .map(
                normalizePlayer
              ),

          substitutes:
            bench.map(
              normalizePlayer
            )

        });

      }

      return result;
    }

    const homeXI =
      arr(
        raw?.home_xi
      );

    const awayXI =
      arr(
        raw?.away_xi
      );

    const homeSubs =
      arr(
        raw?.home_subs
      );

    const awaySubs =
      arr(
        raw?.away_subs
      );

    if (
      homeXI.length ||
      raw?.home_formation
    ) {

      result.push({

        team:
          normalizeTeam(
            root?.home_team ||
            root?.teams?.home ||
            {},
            "Domicile",
            root?.home_logo ||
            ""
          ),

        formation:
          raw?.home_formation ||
          "—",

        startXI:
          homeXI
            .map(
              normalizePlayer
            ),

        substitutes:
          homeSubs
            .map(
              normalizePlayer
            )

      });

    }

    if (
      awayXI.length ||
      raw?.away_formation
    ) {

      result.push({

        team:
          normalizeTeam(
            root?.away_team ||
            root?.teams?.away ||
            {},
            "Extérieur",
            root?.away_logo ||
            ""
          ),

        formation:
          raw?.away_formation ||
          "—",

        startXI:
          awayXI
            .map(
              normalizePlayer
            ),

        substitutes:
          awaySubs
            .map(
              normalizePlayer
            )

      });

    }

    return result;
  }

  /* =======================================================
     EVENTS
  ======================================================= */

  function normalizeEvents(
    root
  ) {

    const raw =
      root?.incidents ||
      root?.events ||
      root?.timeline ||
      root?.match_events ||
      [];

    return arr(
      raw
    ).map(
      (event, index) => {

        const player =
          event?.player;

        const assist =
          event?.assist;

        function nameOf(
          value
        ) {

          if (
            typeof value ===
              "string"
          ) {
            return value;
          }

          if (
            value &&
            typeof value ===
              "object"
          ) {

            return (
              value.name ||
              value.full_name ||
              value.fullName ||
              ""
            );
          }

          return "";
        }

        const playerName =
          nameOf(
            player
          ) ||
          event?.player_name ||
          event?.playerName ||
          event?.scorer_name ||
          "";

        const assistName =
          nameOf(
            assist
          ) ||
          nameOf(
            event?.assist1
          ) ||
          event?.assist_name ||
          event?.assistName ||
          "";

        const playerIn =
          nameOf(
            event?.player_in
          ) ||
          nameOf(
            event?.playerIn
          ) ||
          nameOf(
            event?.incoming
          ) ||
          event?.player_in_name ||
          "";

        const playerOut =
          nameOf(
            event?.player_out
          ) ||
          nameOf(
            event?.playerOut
          ) ||
          nameOf(
            event?.outgoing
          ) ||
          event?.player_out_name ||
          "";

        return {

          id:
            index,

          time: {

            elapsed:
              event?.time?.elapsed ??
              (
                typeof event?.time ===
                  "number"
                  ? event.time
                  : null
              ) ??
              event?.minute ??
              null,

            extra:
              event?.time?.extra ??
              event?.extra ??
              null

          },

          team: {

            id:
              event?.team?.id ??
              event?.team_id ??
              event?.teamId ??
              null,

            name:
              event?.team?.name ||
              event?.team_name ||
              event?.teamName ||
              ""

          },

          player: {

            id:
              typeof player ===
                "object"
                ? player?.id ??
                  null
                : event?.player_id ??
                  null,

            name:
              playerName

          },

          assist: {

            id:
              typeof assist ===
                "object"
                ? assist?.id ??
                  null
                : event?.assist_id ??
                  null,

            name:
              assistName

          },

          player_in:
            playerIn,

          player_out:
            playerOut,

          playerIn:
            playerIn,

          playerOut:
            playerOut,

          type:
            event?.type ||
            event?.event_type ||
            event?.incidentType ||
            "Other",

          detail:
            event?.detail ||
            event?.incidentClass ||
            event?.reason ||
            event?.description ||
            ""

        };

      }
    );
  }

  /* =======================================================
     STATISTICS
  ======================================================= */

  function normalizeStatistics(
    root
  ) {

    const source =
      root?.statistics ||
      root?.stats ||
      [];

    if (
      Array.isArray(
        source
      )
    ) {

      return source;

    }

    if (
      Array.isArray(
        source?.data
      )
    ) {

      return source.data;

    }

    if (
      Array.isArray(
        source?.response
      )
    ) {

      return source.response;

    }

    return [];
  }

  /* =======================================================
     MATCH DETAILS
  ======================================================= */

  async function matchDetails(
    slug
  ) {

    /*
     * Widget مباشرة.
     * هادي هي أهم نقطة.
     */

    const url =
      `${SPORTSCORE_WIDGET}/api/widget/match/?sport=football&slug=${encodeURIComponent(
        slug
      )}&src=bakhira-foot`;

    const body =
      await fetchJSON(
        url
      );

    const root =
      extractDetails(
        body
      );

    if (
      !root ||
      typeof root !==
        "object"
    ) {

      throw new Error(
        "Match introuvable"
      );
    }

    const normalized =
      normalizeMatch(
        root
      );

    const lineups =
      normalizeLineups(
        root
      );

    const events =
      normalizeEvents(
        root
      );

    const statistics =
      normalizeStatistics(
        root
      );

    const home =
      normalized?.teams?.home ||
      normalizeTeam(
        root?.home_team ||
        root?.teams?.home ||
        {},
        root?.home_name ||
        "Domicile",
        root?.home_logo ||
        ""
      );

    const away =
      normalized?.teams?.away ||
      normalizeTeam(
        root?.away_team ||
        root?.teams?.away ||
        {},
        root?.away_name ||
        "Extérieur",
        root?.away_logo ||
        ""
      );

    const score =
      normalized?.score ||
      {};

    return {

      fixture: {

        id:
          normalized?.fixture?.id ||
          slug,

        slug:
          normalized?.fixture?.slug ||
          slug,

        upstreamId:
          root?.id ||
          root?.match_id ||
          normalized?.fixture?.upstreamId ||
          null,

        date:
          root?.time ||
          root?.date ||
          normalized?.fixture?.date ||
          null,

        timezone:
          root?.timezone ||
          "UTC",

        status:
          normalized?.fixture?.status ||
          {

            short:
              root?.status_code ||
              root?.short_status ||
              "NS",

            long:
              root?.status_text ||
              root?.status ||
              "Match",

            elapsed:
              root?.minute ??
              root?.elapsed ??
              null

          },

        venue:
          root?.venue ||
          null,

        referee:
          root?.referee ||
          null

      },

      league:
        normalized?.league ||
        {

          id:
            null,

          name:
            text(
              root?.competition ||
              root?.league
            ) ||
            "Football",

          country:
            "",

          logo:
            ""

        },

      teams: {

        home,

        away

      },

      goals: {

        home:
          score?.home ??
          root?.home_score ??
          null,

        away:
          score?.away ??
          root?.away_score ??
          null

      },

      score: {

        home:
          score?.home ??
          root?.home_score ??
          null,

        away:
          score?.away ??
          root?.away_score ??
          null,

        halftime:
          score?.halftime ||
          {

            home:
              null,

            away:
              null

          },

        fulltime:
          score?.fulltime ||
          {

            home:
              score?.home ??
              root?.home_score ??
              null,

            away:
              score?.away ??
              root?.away_score ??
              null

          }

      },

      events,

      lineups,

      statistics,

      players:
        lineups.map(
          group => ({

            team:
              group.team,

            players: [

              ...arr(
                group.startXI
              ),

              ...arr(
                group.substitutes
              )

            ]

          })
        )

    };
  }

  /* =======================================================
     MAIN ROUTES
  ======================================================= */

  try {

    /*
     * -------------------------------------------------------
     * MATCH DETAILS
     * -------------------------------------------------------
     */

    if (
      fixture
    ) {

      const slug =
        String(
          fixture
        ).trim();

      if (
        !slug
      ) {

        return send(
          400,
          {
            error:
              "Fixture manquant",
            data:
              []
          }
        );

      }

      const data =
        await matchDetails(
          slug
        );

      return send(
        200,
        {
          data,
          provider:
            "SportScore"
        }
      );
    }

    /*
     * -------------------------------------------------------
     * LIVE
     * -------------------------------------------------------
     */

    if (
      live === "all"
    ) {

      const body =
        await fetchJSON(
          `${SPORTSCORE_V1}/fixtures/?sport=football&status=live&limit=200`
        );

      const matches =
        extractMatches(
          body
        )
          .map(
            normalizeMatch
          )
          .filter(
            Boolean
          );

      return send(
        200,
        {
          data:
            matches,

          provider:
            "SportScore"
        }
      );
    }

    /*
     * -------------------------------------------------------
     * DATE
     * -------------------------------------------------------
     */

    const requestedDate =
      date ||
      today;

    let body;

    try {

      body =
        await fetchJSON(
          `${SPORTSCORE_V1}/fixtures/?sport=football&date=${encodeURIComponent(
            requestedDate
          )}&limit=200`
        );

    } catch (
      error
    ) {

      /*
       * fallback غير لليوم الحالي
       */

      if (
        requestedDate ===
        today
      ) {

        body =
          await fetchJSON(
            `${SPORTSCORE_V1}/matches/?sport=football&limit=50`
          );

      } else {

        /*
         * ما نرجعوش Vercel 500.
         * نرجعو JSON واضح.
         */

        return send(
          200,
          {

            data:
              [],

            provider:
              "SportScore",

            warning:
              error?.message ||
              "Impossible de charger les matchs pour cette date."

          }
        );
      }
    }

    const matches =
      extractMatches(
        body
      )
        .map(
          normalizeMatch
        )
        .filter(
          Boolean
        );

    return send(
      200,
      {
        data:
          matches,

        provider:
          "SportScore"
      }
    );

  }
  catch (
    error
  ) {

    console.error(
      "BAKHIRAFOOT API ERROR:",
      error
    );

    /*
     * مهم:
     * حتى إلا وقع خطأ، Vercel يرجع JSON
     * وماشي صفحة "This page is unavailable".
     */

    return send(
      error?.status >= 400
        ? error.status
        : 502,
      {

        error:
          error?.message ||
          "API request failed",

        data:
          [],

        provider:
          "SportScore"

      }
    );
  }
};
