/* =========================================================
   BAKHIRAFOOT PRO API
   SPORTScore ONLY
   LIVE + DATE + MATCH DETAILS
   SCORE + EVENTS + LINEUPS + STATS
========================================================= */

module.exports = async (req, res) => {
  try {

    const {
      live,
      date,
      fixture
    } = req.query;

    const SPORTSCORE =
      "https://sportscore.com/api/v1";

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    /* =====================================================
       RESPONSE
    ===================================================== */

    function output(
      status,
      data
    ) {

      res.setHeader(
        "Cache-Control",
        "s-maxage=30, stale-while-revalidate=60"
      );

      res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
      );

      return res
        .status(status)
        .json(data);
    }

    /* =====================================================
       FETCH JSON
    ===================================================== */

   async function getJSON(url) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      10000
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
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36"
          },

          cache:
            "no-store",

          signal:
            controller.signal
        }
      );

    const rawText =
      await response.text();

    let data;

    try {
      data =
        JSON.parse(
          rawText
        );
    }
    catch {
      data = {
        raw:
          rawText
      };
    }

    if (!response.ok) {

      const error =
        new Error(
          `HTTP ${response.status}`
        );

      error.status =
        response.status;

      error.data =
        data;

      throw error;
    }

    return data;

  }
  catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "SportScore timeout"
      );
    }

    throw error;

  }
  finally {

    clearTimeout(
      timeout
    );

  }
}
    /* =====================================================
       HELPERS
    ===================================================== */

    function arr(value) {

      return Array.isArray(value)
        ? value
        : [];
    }

    function obj(value) {

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

    function norm(value) {

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
          " "
        )
        .trim();
    }

    function slugPart(value) {

      return norm(value)
        .replace(
          /\s+/g,
          "-"
        );
    }

    /* =====================================================
       DATE NORMALIZER
    ===================================================== */

    function toISODate(value) {

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return null;
      }

      if (
        typeof value ===
        "number"
      ) {

        const ms =
          value < 10000000000
            ? value * 1000
            : value;

        const d =
          new Date(ms);

        if (
          Number.isNaN(
            d.getTime()
          )
        ) {
          return null;
        }

        return d
          .toISOString()
          .split("T")[0];
      }

      const str =
        String(value)
          .trim();

      const direct =
        str.match(
          /^(\d{4}-\d{2}-\d{2})/
        );

      if (direct) {
        return direct[1];
      }

      if (
        /^\d+$/.test(str)
      ) {

        const number =
          Number(str);

        const ms =
          number < 10000000000
            ? number * 1000
            : number;

        const d =
          new Date(ms);

        if (
          Number.isNaN(
            d.getTime()
          )
        ) {
          return null;
        }

        return d
          .toISOString()
          .split("T")[0];
      }

      const d =
        new Date(str);

      if (
        Number.isNaN(
          d.getTime()
        )
      ) {
        return null;
      }

      return d
        .toISOString()
        .split("T")[0];
    }

    /* =====================================================
       NORMALIZE TEAM
    ===================================================== */

    function normalizeTeam(
      team,
      fallbackName,
      fallbackLogo
    ) {

      const raw =
        team || {};

      return {

        id:
          idOf(raw),

        name:
          text(raw) ||
          raw?.name ||
          fallbackName ||
          "Équipe",

        logo:
          raw?.logo ||
          raw?.image ||
          raw?.picture ||
          fallbackLogo ||
          ""

      };
    }

    /* =====================================================
       NORMALIZE MATCH
    ===================================================== */

    function normalizeMatch(
      item
    ) {

      if (!item) {
        return null;
      }

      const raw =
        item?.match &&
        typeof item.match ===
          "object"
          ? item.match
          : item;

      const homeRaw =
        raw?.home_team ||
        raw?.homeTeam ||
        raw?.teams?.home ||
        raw?.home ||
        {};

      const awayRaw =
        raw?.away_team ||
        raw?.awayTeam ||
        raw?.teams?.away ||
        raw?.away ||
        {};

      const homeName =
        text(homeRaw) ||
        raw?.home_name ||
        "Domicile";

      const awayName =
        text(awayRaw) ||
        raw?.away_name ||
        "Extérieur";

      const homeLogo =
        homeRaw?.logo ||
        homeRaw?.image ||
        raw?.home_logo ||
        "";

      const awayLogo =
        awayRaw?.logo ||
        awayRaw?.image ||
        raw?.away_logo ||
        "";

      const homeId =
        idOf(homeRaw) ||
        raw?.home_id ||
        null;

      const awayId =
        idOf(awayRaw) ||
        raw?.away_id ||
        null;

      const slug =
        raw?.slug ||
        raw?.match_slug ||
        item?.slug ||
        item?.match_slug ||
        (
          homeName &&
          awayName
            ? `${slugPart(
                homeName
              )}-vs-${slugPart(
                awayName
              )}`
            : null
        );

      const score =
        obj(
          raw?.score
        );

      const homeScore =
        raw?.home_score ??
        raw?.homeScore ??
        score?.home ??
        score?.fulltime?.home ??
        null;

      const awayScore =
        raw?.away_score ??
        raw?.awayScore ??
        score?.away ??
        score?.fulltime?.away ??
        null;

      let statusShort =
        raw?.status_code ||
        raw?.short_status ||
        "";

      const statusText =
        String(
          raw?.status_text ||
          raw?.status ||
          ""
        ).toLowerCase();

      if (!statusShort) {

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

          statusShort =
            "LIVE";

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

          statusShort =
            "FT";

        } else if (
          statusText.includes(
            "half"
          )
        ) {

          statusShort =
            "HT";

        } else if (
          statusText.includes(
            "postpon"
          )
        ) {

          statusShort =
            "PST";

        } else if (
          statusText.includes(
            "cancel"
          )
        ) {

          statusShort =
            "CANC";

        } else {

          statusShort =
            "NS";
        }
      }

      const competition =
        raw?.competition ||
        raw?.league ||
        {};

      return {

        id:
          slug ||
          raw?.id ||
          null,

        slug,

        fixture: {

          id:
            slug ||
            raw?.id ||
            null,

          slug,

          upstreamId:
            raw?.id ||
            raw?.match_id ||
            raw?.fixture_id ||
            null,

          date:
            raw?.time ||
            raw?.date ||
            raw?.start_time ||
            raw?.kickoff ||
            null,

          status: {

            short:
              statusShort,

            long:
              raw?.status_text ||
              raw?.status ||
              "Match",

            elapsed:
              raw?.minute ??
              raw?.elapsed ??
              null

          },

          venue:
            raw?.venue ||
            null,

          referee:
            raw?.referee ||
            null,

          timezone:
            raw?.timezone ||
            null

        },

        league: {

          id:
            idOf(
              competition
            ) ||
            raw?.competition_id ||
            raw?.league_id ||
            null,

          name:
            text(
              competition
            ) ||
            raw?.competition_name ||
            raw?.league_name ||
            "Football",

          country:
            competition?.country ||
            raw?.country ||
            null,

          logo:
            competition?.logo ||
            raw?.competition_logo ||
            "",

          round:
            raw?.round ||
            raw?.round_name ||
            null,

          season:
            raw?.season ||
            null

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

          halftime:
            score?.halftime ||
            {
              home:
                score?.ht?.home ??
                null,

              away:
                score?.ht?.away ??
                null
            },

          fulltime:
            score?.fulltime ||
            {
              home:
                homeScore,

              away:
                awayScore
            }

        }

      };
    }

    /* =====================================================
       MATCH LIST EXTRACTION
    ===================================================== */

    function getMatches(
      body
    ) {

      if (
        Array.isArray(
          body?.matches
        )
      ) {
        return body.matches;
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
          body?.fixtures
        )
      ) {
        return body.fixtures;
      }

      if (
        Array.isArray(body)
      ) {
        return body;
      }

      return [];
    }

    /* =====================================================
       DETAIL ROOT
    ===================================================== */

    function getDetailRoot(
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

    /* =====================================================
       PLAYER
    ===================================================== */

function normalizePlayer(row) {

  const source =
    row &&
    typeof row === "object"
      ? row
      : {};

  const raw =
    source?.player &&
    typeof source.player === "object"
      ? source.player
      : source;

  const firstValue =
    source?.first ??
    raw?.first ??
    null;

  const hasFirstFlag =
    firstValue !== null &&
    firstValue !== undefined;

  const starter =
    hasFirstFlag
      ? (
          firstValue === 1 ||
          firstValue === true ||
          firstValue === "1"
        )
      : (
          source?.starter !== false &&
          source?.substitute !== true
        );

  const substitute =
    source?.substitute === true ||
    source?.starter === false ||
    (
      hasFirstFlag &&
      (
        firstValue === 0 ||
        firstValue === false ||
        firstValue === "0"
      )
    );

  return {

    player: {

      id:
        raw?.id ??
        source?.player_id ??
        null,

      name:
        raw?.name ||
        raw?.full_name ||
        raw?.fullName ||
        source?.name ||
        source?.player_name ||
        "Joueur",

      number:
        source?.shirt_number ??
        source?.shirtNumber ??
        source?.jersey_number ??
        source?.jerseyNumber ??
        source?.number ??
        raw?.shirt_number ??
        raw?.shirtNumber ??
        raw?.number ??
        null,

      pos:
        source?.position ||
        source?.pos ||
        source?.role ||
        raw?.position ||
        raw?.pos ||
        "",

      /*
       * IMPORTANT:
       * TheSports/SportScore donne x/y
       * directement pour placer le joueur.
       */
      x:
        source?.x ??
        raw?.x ??
        null,

      y:
        source?.y ??
        raw?.y ??
        null,

      /*
       * الصورة الحقيقية ديال اللاعب
       */
      photo:
        source?.photo ||
        source?.logo ||
        source?.picture ||
        source?.image ||
        source?.avatar ||
        raw?.photo ||
        raw?.logo ||
        raw?.picture ||
        raw?.image ||
        raw?.avatar ||
        "",

      logo:
        source?.logo ||
        raw?.logo ||
        source?.photo ||
        raw?.photo ||
        ""
    },

    /*
     * Rating ديال المباراة
     */
    rating:
      source?.rating ??
      source?.performance?.rating ??
      raw?.rating ??
      null,

    /*
     * Starter / Remplaçant
     */
    starter,

    substitute,

    /*
     * Captain
     */
    captain:
      source?.captain === true ||
      source?.captain === 1 ||
      source?.captain === "1",

    /*
     * Minutes
     */
    minutes:
      source?.minutes ??
      source?.minutesPlayed ??
      null,

    /*
     * Incidents liés باللاعب
     */
    incidents:
      Array.isArray(
        source?.incidents
      )
        ? source.incidents
        : Array.isArray(
            raw?.incidents
          )
          ? raw.incidents
          : [],

    /*
     * إصابة اللاعب إذا كانت موجودة
     */
    injury:
      source?.injury ??
      source?.injured ??
      raw?.injury ??
      raw?.injured ??
      null,

    games: {

      rating:
        source?.rating ??
        source?.performance?.rating ??
        raw?.rating ??
        null,

      minutes:
        source?.minutes ??
        source?.minutesPlayed ??
        null,

      position:
        source?.position ||
        source?.pos ||
        raw?.position ||
        raw?.pos ||
        "",

      substitute,

      captain:
        source?.captain === true ||
        source?.captain === 1 ||
        source?.captain === "1"
    },

    goals: {

      total:
        source?.goals?.total ??
        source?.goals ??
        0,

      assists:
        source?.goals?.assists ??
        source?.assists ??
        0
    },

    cards: {

      yellow:
        source?.cards?.yellow ??
        source?.yellow ??
        0,

      red:
        source?.cards?.red ??
        source?.red ??
        0
    },

    passes: {

      key:
        source?.passes?.key ??
        source?.key_passes ??
        0
    },

    shots: {

      total:
        source?.shots?.total ??
        source?.shots ??
        0,

      on:
        source?.shots?.on ??
        source?.shots_on_target ??
        0
    }
  };
}

    /* =====================================================
       LINEUP NORMALIZER
    ===================================================== */

   function normalizeLineup(
  source,
  team
) {

  /*
   * source ممكن تكون:
   * - object
   * - أو array ديال players
   */

  if (
    !source
  ) {
    return null;
  }

  let players = [];

  let substitutes = [];

  let formation =
    "—";

  let coach =
    null;

  /*
   * -------------------------------------------------------
   * ARRAY
   * -------------------------------------------------------
   */

  if (
    Array.isArray(
      source
    )
  ) {

    players =
      source.slice();

  }

  /*
   * -------------------------------------------------------
   * OBJECT
   * -------------------------------------------------------
   */

  else if (
    typeof source ===
      "object"
  ) {

    players =
      arr(
        source?.players
      );

    if (
      !players.length
    ) {
      players =
        arr(
          source?.startingLineup
        );
    }

    if (
      !players.length
    ) {
      players =
        arr(
          source?.startingXI
        );
    }

    if (
      !players.length
    ) {
      players =
        arr(
          source?.starters
        );
    }

    substitutes =
      arr(
        source?.substitutes
      );

    if (
      !substitutes.length
    ) {
      substitutes =
        arr(
          source?.bench
        );
    }

    formation =
      source?.formation ||
      source?.tacticalFormation ||
      source?.formationUsed ||
      "—";

    coach =
      source?.coach ||
      source?.manager ||
      null;
  }

  /*
   * -------------------------------------------------------
   * formation ممكن تكون من parent
   * -------------------------------------------------------
   */

  if (
    !formation ||
    formation === "—"
  ) {
    formation =
      source?.formation ||
      source?.tacticalFormation ||
      source?.formationUsed ||
      "—";
  }

  /*
   * -------------------------------------------------------
   * واش source فيه first؟
   *
   * 1 = starter
   * 0 = bench
   * -------------------------------------------------------
   */

  const hasFirstFlag =
    players.some(
      player =>
        player &&
        typeof player ===
          "object" &&
        (
          player.first !==
            undefined
        )
    );

  let startSource = [];

  let benchSource =
    substitutes.slice();

  if (
    hasFirstFlag
  ) {

    startSource =
      players.filter(
        player =>
          player?.first === 1 ||
          player?.first === true ||
          player?.first === "1"
      );

    const autoBench =
      players.filter(
        player =>
          player?.first === 0 ||
          player?.first === false ||
          player?.first === "0"
      );

    if (
      !benchSource.length
    ) {
      benchSource =
        autoBench;
    }

  }
  else {

    startSource =
      players.filter(
        player => {

          if (
            player?.substitute ===
              true
          ) {
            return false;
          }

          if (
            player?.starter ===
              false
          ) {
            return false;
          }

          return true;
        }
      );
  }

  /*
   * -------------------------------------------------------
   * Normalize
   * -------------------------------------------------------
   */

  const startXI =
    startSource.map(
      normalizePlayer
    );

  const bench =
    benchSource.map(
      normalizePlayer
    );

  /*
   * -------------------------------------------------------
   * injury
   * -------------------------------------------------------
   */

  const injuries =
    source?.injury ||
    source?.injuries ||
    [];

  return {

    team: {

      id:
        team?.id ||
        source?.team?.id ||
        null,

      name:
        team?.name ||
        source?.team?.name ||
        "",

      logo:
        team?.logo ||
        source?.team?.logo ||
        ""
    },

    formation,

    coach,

    startXI,

    substitutes:
      bench,

    injuries:
      injuries
  };
}
    /* =====================================================
       FIND LINEUPS
    ===================================================== */

  function getLineups(
  root,
  homeTeam,
  awayTeam
) {

  const source =
    root?.lineups ||
    root?.lineup ||
    root?.compositions ||
    root?.formations ||
    null;

  const result = [];

  if (!source) {
    return result;
  }

  /*
   * =====================================================
   * FORMAT DIRECT
   *
   * home_formation
   * away_formation
   * home_xi
   * away_xi
   * home_subs
   * away_subs
   * =====================================================
   */

  if (
    source &&
    typeof source === "object" &&
    !Array.isArray(source)
  ) {

    const homeXI =
      Array.isArray(
        source.home_xi
      )
        ? source.home_xi
        : Array.isArray(
            source.home_starting_xi
          )
          ? source.home_starting_xi
          : Array.isArray(
              source.home_startingXI
            )
            ? source.home_startingXI
            : [];

    const awayXI =
      Array.isArray(
        source.away_xi
      )
        ? source.away_xi
        : Array.isArray(
            source.away_starting_xi
          )
          ? source.away_starting_xi
          : Array.isArray(
              source.away_startingXI
            )
            ? source.away_startingXI
            : [];

    const homeSubs =
      Array.isArray(
        source.home_subs
      )
        ? source.home_subs
        : Array.isArray(
            source.home_substitutes
          )
          ? source.home_substitutes
          : Array.isArray(
              source.home_bench
            )
            ? source.home_bench
            : [];

    const awaySubs =
      Array.isArray(
        source.away_subs
      )
        ? source.away_subs
        : Array.isArray(
            source.away_substitutes
          )
          ? source.away_substitutes
          : Array.isArray(
              source.away_bench
            )
            ? source.away_bench
            : [];

    const homeFormation =
      source.home_formation ||
      source.homeFormation ||
      source.home_tactic ||
      source.home?.formation ||
      "—";

    const awayFormation =
      source.away_formation ||
      source.awayFormation ||
      source.away_tactic ||
      source.away?.formation ||
      "—";

    /*
     * HOME
     */

    if (
      homeXI.length ||
      homeSubs.length ||
      homeFormation !== "—"
    ) {

      result.push({

        team: {
          id:
            homeTeam?.id ||
            null,

          name:
            homeTeam?.name ||
            "Domicile",

          logo:
            homeTeam?.logo ||
            ""
        },

        formation:
          homeFormation,

        coach:
          source.home_coach ||
          source.homeCoach ||
          source.home?.coach ||
          null,

        startXI:
          homeXI.map(
            normalizePlayer
          ),

        substitutes:
          homeSubs.map(
            normalizePlayer
          )

      });
    }

    /*
     * AWAY
     */

    if (
      awayXI.length ||
      awaySubs.length ||
      awayFormation !== "—"
    ) {

      result.push({

        team: {
          id:
            awayTeam?.id ||
            null,

          name:
            awayTeam?.name ||
            "Extérieur",

          logo:
            awayTeam?.logo ||
            ""
        },

        formation:
          awayFormation,

        coach:
          source.away_coach ||
          source.awayCoach ||
          source.away?.coach ||
          null,

        startXI:
          awayXI.map(
            normalizePlayer
          ),

        substitutes:
          awaySubs.map(
            normalizePlayer
          )

      });
    }

    /*
     * إلا لقينا direct format
     * كنرجعو هنا.
     */

    if (
      result.length
    ) {
      return result;
    }
  }

  /*
   * =====================================================
   * ARRAY FORMAT
   * =====================================================
   */

  if (
    Array.isArray(source)
  ) {

    return source
      .map(
        item => {

          const itemTeam =
            item?.team ||
            {};

          let team =
            null;

          if (
            homeTeam?.id &&
            itemTeam?.id &&
            String(
              homeTeam.id
            ) ===
            String(
              itemTeam.id
            )
          ) {
            team =
              homeTeam;
          }
          else if (
            awayTeam?.id &&
            itemTeam?.id &&
            String(
              awayTeam.id
            ) ===
            String(
              itemTeam.id
            )
          ) {
            team =
              awayTeam;
          }
          else {

            const name =
              itemTeam?.name ||
              item?.team_name ||
              "";

            if (
              name &&
              homeTeam?.name &&
              norm(name) ===
                norm(
                  homeTeam.name
                )
            ) {
              team =
                homeTeam;
            }
            else if (
              name &&
              awayTeam?.name &&
              norm(name) ===
                norm(
                  awayTeam.name
                )
            ) {
              team =
                awayTeam;
            }
          }

          if (!team) {
            return null;
          }

          return normalizeLineup(
            item,
            team
          );
        }
      )
      .filter(Boolean);
  }

  /*
   * =====================================================
   * HOME / AWAY OBJECT
   * =====================================================
   */

  const homeSource =
    source.home ||
    source.homeTeam ||
    source.host ||
    null;

  const awaySource =
    source.away ||
    source.awayTeam ||
    source.guest ||
    null;

  if (
    homeSource
  ) {

    const lineup =
      normalizeLineup(
        homeSource,
        homeTeam
      );

    if (
      lineup
    ) {
      result.push(
        lineup
      );
    }
  }

  if (
    awaySource
  ) {

    const lineup =
      normalizeLineup(
        awaySource,
        awayTeam
      );

    if (
      lineup
    ) {
      result.push(
        lineup
      );
    }
  }

  return result;
}

    /* =====================================================
       EVENTS
    ===================================================== */

   function normalizeEvents(
  root
) {

  const source =
    root?.events ||
    root?.incidents ||
    root?.timeline ||
    root?.match_events ||
    [];

  function getName(value) {

    if (
      typeof value === "string"
    ) {
      return value;
    }

    if (
      value &&
      typeof value === "object"
    ) {
      return (
        value.name ||
        value.full_name ||
        value.fullName ||
        value.short_name ||
        value.player?.name ||
        ""
      );
    }

    return "";
  }

  return arr(
    source
  ).map(
    event => {

      const type =
        event?.type ||
        event?.event_type ||
        event?.incidentType ||
        event?.kind ||
        "Other";

      const detail =
        event?.detail ||
        event?.incidentClass ||
        event?.reason ||
        event?.description ||
        "";

      const playerName =
        getName(
          event?.player
        ) ||
        getName(
          event?.scorer
        ) ||
        getName(
          event?.goal_scorer
        ) ||
        event?.player_name ||
        event?.playerName ||
        event?.scorer_name ||
        "";

      const assistName =
        getName(
          event?.assist
        ) ||
        getName(
          event?.assist1
        ) ||
        event?.assist_name ||
        event?.assistName ||
        "";

      const playerIn =
        getName(
          event?.player_in
        ) ||
        getName(
          event?.playerIn
        ) ||
        getName(
          event?.incoming
        ) ||
        event?.player_in_name ||
        event?.playerInName ||
        "";

      const playerOut =
        getName(
          event?.player_out
        ) ||
        getName(
          event?.playerOut
        ) ||
        getName(
          event?.outgoing
        ) ||
        event?.player_out_name ||
        event?.playerOutName ||
        "";

      const team =
        event?.team &&
        typeof event.team === "object"
          ? event.team
          : {};

      const minute =
        event?.time?.elapsed ??
        (
          typeof event?.time === "number"
            ? event.time
            : null
        ) ??
        event?.minute ??
        event?.elapsed ??
        null;

      const extra =
        event?.time?.extra ??
        event?.extra ??
        event?.addedTime ??
        null;

      return {

        time: {
          elapsed:
            minute,

          extra:
            extra
        },

        team: {
          id:
            team?.id ??
            event?.team_id ??
            event?.teamId ??
            null,

          name:
            team?.name ||
            event?.team_name ||
            event?.teamName ||
            ""
        },

        player: {
          id:
            (
              event?.player &&
              typeof event.player === "object"
            )
              ? event.player.id || null
              : event?.player_id || null,

          name:
            playerName
        },

        assist: {
          id:
            (
              event?.assist &&
              typeof event.assist === "object"
            )
              ? event.assist.id || null
              : event?.assist_id || null,

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
          type,

        detail:
          detail
      };
    }
  );
}
    /* =====================================================
       STATISTICS
    ===================================================== */

    function normalizeStatistics(
      root,
      homeTeam,
      awayTeam
    ) {

      const source =
        root?.statistics ||
        root?.stats ||
        [];

      /* SportScore / SofaScore-like groups */

      if (
        Array.isArray(
          source
        ) &&
        source[0]?.groups
      ) {

        const all =
          source.find(
            block =>
              String(
                block?.period ||
                ""
              ).toUpperCase() ===
              "ALL"
          ) ||
          source[0] ||
          {};

        const homeStats = [];
        const awayStats = [];

        arr(
          all?.groups
        )
          .forEach(
            group => {

              arr(
                group?.statisticsItems
              )
                .forEach(
                  item => {

                    const name =
                      item?.name ||
                      item?.key ||
                      "Stat";

                    homeStats.push({

                      type:
                        name,

                      value:
                        item?.home ??
                        item?.homeValue ??
                        "-"

                    });

                    awayStats.push({

                      type:
                        name,

                      value:
                        item?.away ??
                        item?.awayValue ??
                        "-"

                    });

                  }
                );

            }
          );

        return [

          {

            team:
              homeTeam,

            statistics:
              homeStats

          },

          {

            team:
              awayTeam,

            statistics:
              awayStats

          }

        ];
      }

      /* Array: one block per team */

      if (
        Array.isArray(
          source
        ) &&
        source.length >= 2
      ) {

        return source
          .slice(0, 2)
          .map(
            (
              block,
              index
            ) => {

              const values =
                arr(
                  block?.statistics ||
                  block?.stats
                )
                  .map(
                    stat => ({

                      type:
                        stat?.type ||
                        stat?.name ||
                        "Stat",

                      value:
                        stat?.value ??
                        "-"

                    })
                  );

              return {

                team:
                  index === 0
                    ? homeTeam
                    : awayTeam,

                statistics:
                  values

              };

            }
          );
      }

      return [];
    }

    /* =====================================================
       PLAYERS GROUPS
    ===================================================== */

    function buildPlayers(
      lineups
    ) {

      return lineups
        .filter(Boolean)
        .map(
          lineup => ({

            team:
              lineup.team,

            players: [

              ...arr(
                lineup.startXI
              ),

              ...arr(
                lineup.substitutes
              )

            ]

          })
        );
    }

    /* =====================================================
       MATCH DETAILS
    ===================================================== */

    if (
      fixture
    ) {

      const slug =
        String(
          fixture
        ).trim();

      if (!slug) {

        return output(
          400,
          {
            error:
              "Match slug manquant",

            data:
              []
          }
        );
      }

      console.log(
        "DETAILS REQUESTED:",
        slug
      );

      let body;

      try {

        body =
          await getJSON(
            `${SPORTSCORE}/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}`
          );

      } catch (
        firstError
      ) {

        console.warn(
          "PRIMARY MATCH ENDPOINT FAILED:",
          firstError.message
        );

        body =
          await getJSON(
            `https://sportscore.com/api/widget/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}`
          );
      }

      const root =
        getDetailRoot(
          body
        );

      if (
        !root
      ) {

        return output(
          404,
          {

            error:
              "Match introuvable",

            data:
              []

          }
        );
      }

      const basic =
        normalizeMatch(
          root
        );

      if (
        !basic
      ) {

        return output(
          404,
          {

            error:
              "Match introuvable",

            data:
              []

          }
        );
      }

      /* =================================================
         REAL TEAMS
      ================================================= */

      const homeTeam =
        normalizeTeam(
          root?.home_team ||
          root?.homeTeam ||
          root?.teams?.home ||
          basic.teams.home,
          basic.teams.home.name,
          basic.teams.home.logo
        );

      const awayTeam =
        normalizeTeam(
          root?.away_team ||
          root?.awayTeam ||
          root?.teams?.away ||
          basic.teams.away,
          basic.teams.away.name,
          basic.teams.away.logo
        );

      /* =================================================
         LINEUPS
      ================================================= */

      const lineups =
        getLineups(
          root,
          homeTeam,
          awayTeam
        );

      /* =================================================
         EVENTS
      ================================================= */

      const events =
        normalizeEvents(
          root
        );

      /* =================================================
         STATISTICS
      ================================================= */

      const statistics =
        normalizeStatistics(
          root,
          homeTeam,
          awayTeam
        );

      /* =================================================
         PLAYERS
      ================================================= */

      const players =
        buildPlayers(
          lineups
        );

      /* =================================================
         SCORE
      ================================================= */

      const score =
        obj(
          root?.score
        );

      const homeScore =
        root?.home_score ??
        root?.homeScore ??
        score?.home ??
        score?.fulltime?.home ??
        basic.goals.home ??
        null;

      const awayScore =
        root?.away_score ??
        root?.awayScore ??
        score?.away ??
        score?.fulltime?.away ??
        basic.goals.away ??
        null;

      /* =================================================
         STATUS
      ================================================= */

      const statusText =
        String(
          root?.status_text ||
          root?.status ||
          basic.fixture.status.long ||
          ""
        ).toLowerCase();

      let statusShort =
        root?.status_code ||
        root?.short_status ||
        basic.fixture.status.short ||
        "NS";

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

        statusShort =
          "LIVE";

      } else if (
        statusText.includes(
          "half"
        )
      ) {

        statusShort =
          "HT";

      } else if (
        statusText.includes(
          "finish"
        ) ||
        statusText.includes(
          "ended"
        ) ||
        statusText === "ft"
      ) {

        statusShort =
          "FT";
      }

      /* =================================================
         DATE
      ================================================= */

      const date =
        root?.time ||
        root?.date ||
        root?.start_time ||
        root?.kickoff ||
        basic.fixture.date ||
        null;

      /* =================================================
         LEAGUE
      ================================================= */

      const competition =
        root?.competition ||
        root?.league ||
        {};

      /* =================================================
         VENUE
      ================================================= */

      const venue =
        root?.venue ||
        basic.fixture.venue ||
        null;

      const referee =
        root?.referee ||
        basic.fixture.referee ||
        null;

      /* =================================================
         FINAL DETAIL
      ================================================= */

      const details = {

        fixture: {

          id:
            slug,

          slug,

          upstreamId:
            root?.id ||
            root?.match_id ||
            basic.fixture.upstreamId ||
            slug,

          date,

          timezone:
            root?.timezone ||
            null,

          status: {

            short:
              statusShort,

            long:
              root?.status_text ||
              root?.status ||
              basic.fixture.status.long ||
              "Match",

            elapsed:
              root?.minute ??
              root?.elapsed ??
              root?.status?.elapsed ??
              basic.fixture.status.elapsed ??
              null

          },

          venue,

          referee:
            typeof referee ===
            "object"
              ? referee?.name ||
                ""
              : referee

        },

        league: {

          id:
            idOf(
              competition
            ) ||
            basic.league.id ||
            null,

          name:
            text(
              competition
            ) ||
            root?.competition_name ||
            root?.league_name ||
            basic.league.name,

          country:
            competition?.country ||
            root?.country ||
            basic.league.country ||
            "",

          logo:
            competition?.logo ||
            basic.league.logo ||
            "",

          round:
            root?.round ||
            root?.round_name ||
            basic.league.round ||
            null,

          season:
            root?.season?.name ||
            root?.season ||
            basic.league.season ||
            null

        },

        teams: {

          home:
            homeTeam,

          away:
            awayTeam

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

        },

        events,

        lineups,

        statistics,

        players,

        provider:
          "SportScore"

      };

      console.log(
        "DETAIL RESULT:",
        JSON.stringify(
          {
            match:
              `${homeTeam.name} vs ${awayTeam.name}`,

            lineups:
              lineups.length,

            homePlayers:
              lineups[0]?.startXI?.length ||
              0,

            awayPlayers:
              lineups[1]?.startXI?.length ||
              0,

            events:
              events.length,

            statistics:
              statistics?.[0]?.statistics?.length ||
              0

          },
          null,
          2
        )
      );

      return output(
        200,
        {

          data:
            details,

          provider:
            "SportScore"

        }
      );
    }

    /* =====================================================
       LIVE
    ===================================================== */

    if (
      live === "all"
    ) {

      const body =
        await getJSON(
          `${SPORTSCORE}/fixtures/?sport=football&status=live&limit=200`
        );

      const matches =
        getMatches(body)
          .map(
            normalizeMatch
          )
          .filter(Boolean);

      return output(
        200,
        {

          data:
            matches,

          provider:
            "SportScore"

        }
      );
    }

    /* =====================================================
       DATE
    ===================================================== */

    const matchDate =
      date ||
      today;

    let body;

    try {

      body =
        await getJSON(
          `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
            matchDate
          )}&limit=200`
        );

    } catch (
      error
    ) {

      if (
        matchDate === today
      ) {

        body =
          await getJSON(
            `${SPORTSCORE}/matches/?sport=football&limit=50`
          );

      } else {

        throw error;

      }
    }

    const matches =
      getMatches(body)
        .map(
          normalizeMatch
        )
        .filter(Boolean);

    return output(
      200,
      {

        data:
          matches,

        provider:
          "SportScore"

      }
    );

  } catch (
    error
  ) {

    console.error(
      "BAKHIRAFOOT API ERROR:",
      error
    );

    return output(
      error?.status ||
      500,
      {

        error:
          error?.message ||
          "API request failed",

        details:
          error?.data ||
          null,

        data:
          []

      }
    );
  }
};
