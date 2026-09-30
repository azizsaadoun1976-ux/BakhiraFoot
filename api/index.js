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
              "no-store"
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

      } catch {

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

    function normalizePlayer(
      row
    ) {

      const raw =
        row?.player ||
        row ||
        {};

      return {

        player: {

          id:
            raw?.id ||
            row?.player_id ||
            null,

          name:
            raw?.name ||
            raw?.short_name ||
            row?.name ||
            "Joueur",

          number:
            row?.shirtNumber ??
            row?.jerseyNumber ??
            raw?.shirtNumber ??
            raw?.jerseyNumber ??
            row?.number ??
            null,

          pos:
            row?.position ||
            raw?.position ||
            row?.pos ||
            "",

          grid:
            row?.grid ||
            row?.positionGrid ||
            raw?.grid ||
            "",

          photo:
            raw?.picture ||
            raw?.image ||
            row?.photo ||
            ""

        },

        rating:
          row?.rating ??
          row?.performance?.rating ??
          null,

        games: {

          rating:
            row?.rating ??
            row?.performance?.rating ??
            null,

          minutes:
            row?.minutes ??
            row?.minutesPlayed ??
            null,

          position:
            row?.position ||
            raw?.position ||
            "",

          substitute:
            row?.substitute === true ||
            row?.starter === false,

          captain:
            row?.captain === true

        },

        goals: {

          total:
            row?.goals?.total ??
            row?.goals ??
            0,

          assists:
            row?.goals?.assists ??
            row?.assists ??
            0

        },

        cards: {

          yellow:
            row?.cards?.yellow ??
            row?.yellow ??
            0,

          red:
            row?.cards?.red ??
            row?.red ??
            0

        },

        passes: {

          key:
            row?.passes?.key ??
            row?.key_passes ??
            0

        },

        shots: {

          total:
            row?.shots?.total ??
            row?.shots ??
            0,

          on:
            row?.shots?.on ??
            row?.shots_on_target ??
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

      if (
        !source ||
        typeof source !==
          "object"
      ) {
        return null;
      }

      let players =
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

      let substitutes =
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

      const startXI =
        players
          .filter(
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
          )
          .map(
            normalizePlayer
          );

      const bench =
        substitutes
          .map(
            normalizePlayer
          );

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

        formation:
          source?.formation ||
          source?.tacticalFormation ||
          source?.formationUsed ||
          "—",

        coach:
          source?.coach ||
          source?.manager ||
          null,

        startXI,

        substitutes:
          bench

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

      if (
        !source
      ) {
        return [];
      }

      /* Array format */

      if (
        Array.isArray(
          source
        )
      ) {

        const normalized =
          source
            .map(
              item => {

                const itemTeam =
                  item?.team ||
                  {};

                const isHome =
                  (
                    homeTeam.id &&
                    itemTeam.id &&
                    String(
                      homeTeam.id
                    ) ===
                    String(
                      itemTeam.id
                    )
                  );

                const isAway =
                  (
                    awayTeam.id &&
                    itemTeam.id &&
                    String(
                      awayTeam.id
                    ) ===
                    String(
                      itemTeam.id
                    )
                  );

                return {

                  raw:
                    item,

                  isHome,

                  isAway

                };

              }
            );

        return normalized
          .map(
            item =>
              normalizeLineup(
                item.raw,
                item.isHome
                  ? homeTeam
                  : item.isAway
                    ? awayTeam
                    : item.raw?.team ||
                      {}
              )
          )
          .filter(Boolean);
      }

      /* Home / Away format */

      const homeSource =
        source?.home ||
        source?.homeTeam ||
        source?.host ||
        null;

      const awaySource =
        source?.away ||
        source?.awayTeam ||
        source?.guest ||
        null;

      const result = [];

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

      return arr(
        source
      )
        .map(
          event => {

            const type =
              event?.type ||
              event?.incidentType ||
              event?.event_type ||
              "Other";

            const detail =
              event?.detail ||
              event?.incidentClass ||
              event?.reason ||
              event?.description ||
              "";

            const player =
              event?.player ||
              {};

            const assist =
              event?.assist ||
              event?.assist1 ||
              {};

            const team =
              event?.team ||
              {};

            const minute =
              event?.time?.elapsed ??
              event?.minute ??
              event?.time ??
              null;

            const extra =
              event?.time?.extra ??
              event?.addedTime ??
              event?.extra ??
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
                  team?.id ||
                  event?.team_id ||
                  null,

                name:
                  team?.name ||
                  event?.team_name ||
                  ""

              },

              player: {

                id:
                  player?.id ||
                  event?.player_id ||
                  null,

                name:
                  player?.name ||
                  event?.player_name ||
                  ""

              },

              assist: {

                id:
                  assist?.id ||
                  event?.assist_id ||
                  null,

                name:
                  assist?.name ||
                  event?.assist_name ||
                  ""

              },

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

    /* =====================================================
   MATCH DETAILS
===================================================== */

if (fixture) {

  const slug =
    String(fixture).trim();

  if (!slug) {
    return output(
      400,
      {
        error:
          "Fixture manquant",
        data: []
      }
    );
  }

  const url =
    `https://sportscore.com/api/widget/match/?sport=football&slug=${encodeURIComponent(
      slug
    )}&src=bakhira-foot`;

  const raw =
    await getJSON(url);

  const root =
    raw?.match ||
    raw?.data?.match ||
    raw?.data ||
    raw;

  if (
    !root ||
    typeof root !== "object"
  ) {
    return output(
      404,
      {
        error:
          "Détails du match introuvables",
        data: []
      }
    );
  }

  /*
   * كنخليو lineups كما هي:
   *
   * home_formation
   * away_formation
   * home_xi
   * away_xi
   * home_subs
   * away_subs
   */

  const lineups =
    root?.lineups ||
    root?.lineup ||
    {};

  /*
   * الأحداث الحقيقية
   */

  const events =
    root?.incidents ||
    root?.events ||
    root?.timeline ||
    [];

  /*
   * الإحصائيات
   */

  const statistics =
    root?.statistics ||
    root?.stats ||
    [];

  /*
   * اللاعبين
   */

  const players =
    root?.players ||
    [];

  return output(
    200,
    {
      data: {
        ...root,

        lineups,

        lineup:
          lineups,

        events,

        incidents:
          events,

        timeline:
          events,

        statistics,

        stats:
          statistics,

        players
      }
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
