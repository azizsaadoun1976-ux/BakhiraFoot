/* =========================================================
   BAKHIRAFOOT PRO
   SPORTScore API
   LIVE + DATE + MATCH DETAILS
========================================================= */

module.exports = async (req, res) => {
  try {

    const {
      live,
      date,
      fixture
    } = req.query;

    const BASE =
      "https://sportscore.com/api/v1";

    const WIDGET_BASE =
      "https://sportscore.com/api/widget";

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    /* =====================================================
       RESPONSE
    ===================================================== */

    function output(status, data) {

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

    /*
       Compatibility avec les anciennes parties
       du fichier.
    */
    const sendJSON = output;

    /* =====================================================
       GET JSON
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
                "BakhiraFoot/1.0 (+https://bakhira-foot.vercel.app/)"
            },
            cache: "no-store"
          }
        );

      const text =
        await response.text();

      let data;

      try {

        data =
          JSON.parse(text);

      } catch {

        data = {
          raw: text
        };

      }

      if (!response.ok) {

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
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function object(value) {

      return (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      )
        ? value
        : {};

    }

    function text(value) {

      if (
        typeof value === "string"
      ) {
        return value;
      }

      if (
        typeof value === "number"
      ) {
        return String(value);
      }

      if (
        value &&
        typeof value === "object"
      ) {

        return (
          value.name ||
          value.full_name ||
          value.fullName ||
          value.title ||
          value.label ||
          ""
        );

      }

      return "";
    }

    function idOf(value) {

      if (
        typeof value === "number" ||
        typeof value === "string"
      ) {
        return value;
      }

      if (
        value &&
        typeof value === "object"
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

    function array(value) {

      return Array.isArray(value)
        ? value
        : [];

    }

    /* =====================================================
       RECURSIVE ARRAY FINDER
    ===================================================== */

    function findArrays(
      source,
      wantedKeys,
      results = [],
      depth = 0
    ) {

      if (
        !source ||
        typeof source !== "object" ||
        depth > 8
      ) {
        return results;
      }

      if (
        Array.isArray(source)
      ) {

        source.forEach(
          item =>
            findArrays(
              item,
              wantedKeys,
              results,
              depth + 1
            )
        );

        return results;
      }

      Object.keys(source)
        .forEach(key => {

          const value =
            source[key];

          if (
            wantedKeys.includes(
              String(key).toLowerCase()
            ) &&
            Array.isArray(value)
          ) {

            results.push(value);

          }

          if (
            value &&
            typeof value === "object"
          ) {

            findArrays(
              value,
              wantedKeys,
              results,
              depth + 1
            );

          }

        });

      return results;
    }

    function bestArray(
      source,
      keys
    ) {

      const arrays =
        findArrays(
          source,
          keys.map(
            key =>
              key.toLowerCase()
          )
        );

      if (!arrays.length) {
        return [];
      }

      return arrays.reduce(
        (best, current) =>
          current.length >
          best.length
            ? current
            : best,
        []
      );

    }

    /* =====================================================
       SLUG
    ===================================================== */

    function makeSlug(value) {

      return String(value || "")
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .toLowerCase()
        .replace(
          /&/g,
          "and"
        )
        .replace(
          /[^a-z0-9]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          "");

    }

    /* =====================================================
       MATCH NORMALIZATION
    ===================================================== */

    function normalizeMatch(item) {

      if (!item) {
        return null;
      }

      const raw =
        item?.match &&
        typeof item.match === "object"
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
        raw?.homeTeamName ||
        "Domicile";

      const awayName =
        text(awayRaw) ||
        raw?.away_name ||
        raw?.awayTeamName ||
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
            ? `${makeSlug(homeName)}-vs-${makeSlug(awayName)}`
            : null
        );

      const id =
        slug ||
        raw?.id ||
        raw?.match_id ||
        item?.id ||
        null;

      const score =
        object(
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
          statusText.includes("live") ||
          statusText.includes("in play") ||
          statusText.includes("inplay")
        ) {

          statusShort =
            "LIVE";

        } else if (
          statusText.includes("finish") ||
          statusText.includes("ended") ||
          statusText === "ft"
        ) {

          statusShort =
            "FT";

        } else if (
          statusText.includes("half")
        ) {

          statusShort =
            "HT";

        } else if (
          statusText.includes("postpon")
        ) {

          statusShort =
            "PST";

        } else if (
          statusText.includes("cancel")
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

      const leagueName =
        text(competition) ||
        raw?.competition_name ||
        raw?.league_name ||
        "Football";

      const leagueId =
        idOf(competition) ||
        raw?.competition_id ||
        raw?.league_id ||
        null;

      const leagueLogo =
        competition?.logo ||
        competition?.image ||
        raw?.competition_logo ||
        raw?.league_logo ||
        "";

      const leagueCountry =
        competition?.country ||
        raw?.country ||
        "";

      return {

        id,

        slug,

        fixture: {

          id,

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
            null

        },

        league: {

          id:
            leagueId,

          name:
            leagueName,

          country:
            leagueCountry,

          logo:
            leagueLogo,

          round:
            competition?.round ||
            raw?.round ||
            null,

          season:
            competition?.season ||
            raw?.season ||
            null

        },

        teams: {

          home: {

            id:
              homeId,

            name:
              homeName,

            logo:
              homeLogo

          },

          away: {

            id:
              awayId,

            name:
              awayName,

            logo:
              awayLogo

          }

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
              home: null,
              away: null
            },

          fulltime:
            score?.fulltime ||
            {
              home: homeScore,
              away: awayScore
            }

        }

      };

    }

    /* =====================================================
       MATCH LIST RESPONSE
    ===================================================== */

    function getMatches(body) {

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
        Array.isArray(body)
      ) {

        return body;

      }

      if (
        Array.isArray(
          body?.fixtures
        )
      ) {

        return body.fixtures;

      }

      return [];

    }

    /* =====================================================
       DATE MATCHES
    ===================================================== */

    if (
      !live &&
      !fixture
    ) {

      const matchDate =
        date ||
        today;

      let body;

      try {

        body =
          await getJSON(
            `${BASE}/fixtures/?sport=football&date=${encodeURIComponent(
              matchDate
            )}&limit=200&src=bakhira-foot.vercel.app`
          );

      } catch (error) {

        if (
          matchDate === today
        ) {

          body =
            await getJSON(
              `${BASE}/matches/?sport=football&limit=50&src=bakhira-foot.vercel.app`
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

    }

    /* =====================================================
       LIVE
    ===================================================== */

    if (
      live === "all"
    ) {

      const body =
        await getJSON(
          `${BASE}/fixtures/?sport=football&status=live&limit=200&src=bakhira-foot.vercel.app`
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
       MATCH DETAILS
    ===================================================== */

    if (fixture) {

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
            data: []
          }
        );

      }

      console.log(
        "MATCH DETAILS SLUG:",
        slug
      );

      /* -------------------------------------------------
         PRIMARY DETAIL ENDPOINT
      ------------------------------------------------- */

      let primary;

      try {

        primary =
          await getJSON(
            `${BASE}/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}&src=bakhira-foot.vercel.app`
          );

      } catch (firstError) {

        console.warn(
          "V1 MATCH FAILED, TRYING WIDGET MATCH:",
          firstError.message
        );

        primary =
          await getJSON(
            `${WIDGET_BASE}/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}&src=bakhira-foot.vercel.app`
          );

      }

      /*
         كنخليو response كامل متوفر
         باش ما تضيع حتى معلومة.
      */

      let detailSource =
        primary;

      /* -------------------------------------------------
         ROOT
      ------------------------------------------------- */

      let root =
        primary?.data ||
        primary;

      if (
        root?.match &&
        typeof root.match === "object"
      ) {

        /*
           مهم:
           مناخدوش غير match.
           كنخليو envelope كامل.
        */

        root = {
          ...root,
          ...root.match
        };

      }

      const rawMatch =
        root?.match &&
        typeof root.match === "object"
          ? root.match
          : root;

      /* -------------------------------------------------
         TEAMS
      ------------------------------------------------- */

      const normalized =
        normalizeMatch(
          rawMatch
        );

      const home =
        normalized?.teams?.home ||
        {
          id: null,
          name: "Domicile",
          logo: ""
        };

      const away =
        normalized?.teams?.away ||
        {
          id: null,
          name: "Extérieur",
          logo: ""
        };

      /* -------------------------------------------------
         EVENTS
      ------------------------------------------------- */

      const eventsArrays =
        [
          ...findArrays(
            detailSource,
            [
              "events",
              "timeline",
              "incidents"
            ]
          ),
          ...findArrays(
            root,
            [
              "events",
              "timeline",
              "incidents"
            ]
          )
        ];

      let rawEvents = [];

      if (
        eventsArrays.length
      ) {

        rawEvents =
          eventsArrays.reduce(
            (best, current) =>
              current.length >
              best.length
                ? current
                : best,
            []
          );

      }

      const events =
        rawEvents.map(
          event => {

            const team =
              event?.team ||
              event?.club ||
              event?.participant ||
              {};

            const player =
              event?.player ||
              event?.scorer ||
              event?.person ||
              {};

            const assist =
              event?.assist ||
              event?.assistant ||
              {};

            const teamId =
              idOf(team) ||
              event?.team_id ||
              event?.teamId ||
              null;

            let teamName =
              text(team) ||
              event?.team_name ||
              event?.teamName ||
              "";

            if (!teamName) {

              if (
                home.id &&
                teamId &&
                String(home.id) ===
                String(teamId)
              ) {

                teamName =
                  home.name;

              }

              if (
                away.id &&
                teamId &&
                String(away.id) ===
                String(teamId)
              ) {

                teamName =
                  away.name;

              }

            }

            const playerId =
              idOf(player) ||
              event?.player_id ||
              event?.playerId ||
              null;

            const playerName =
              text(player) ||
              event?.player_name ||
              event?.playerName ||
              event?.scorer_name ||
              event?.scorerName ||
              "";

            const assistId =
              idOf(assist) ||
              event?.assist_id ||
              event?.assistId ||
              null;

            const assistName =
              text(assist) ||
              event?.assist_name ||
              event?.assistName ||
              "";

            return {

              time: {

                elapsed:
                  event?.time?.elapsed ??
                  event?.elapsed ??
                  event?.minute ??
                  event?.time_minute ??
                  null,

                extra:
                  event?.time?.extra ??
                  event?.extra ??
                  null

              },

              team: {

                id:
                  teamId,

                name:
                  teamName

              },

              player: {

                id:
                  playerId,

                name:
                  playerName

              },

              assist: {

                id:
                  assistId,

                name:
                  assistName

              },

              type:
                event?.type ||
                event?.event_type ||
                event?.eventType ||
                event?.category ||
                "Other",

              detail:
                event?.detail ||
                event?.description ||
                event?.text ||
                event?.comments ||
                event?.subtype ||
                ""

            };

          }
        );

      /* -------------------------------------------------
         LINEUPS
      ------------------------------------------------- */

      const lineupArrays =
        [
          ...findArrays(
            detailSource,
            [
              "lineups",
              "lineup",
              "formations",
              "compositions"
            ]
          ),
          ...findArrays(
            root,
            [
              "lineups",
              "lineup",
              "formations",
              "compositions"
            ]
          )
        ];

      let rawLineups =
        lineupArrays.reduce(
          (best, current) =>
            current.length >
            best.length
              ? current
              : best,
          []
        );

      /*
         بعض responses:
         lineups: {
           home: {...},
           away: {...}
         }
         
         فهاد الحالة findArrays ما كيلقاهاش
         حيث ماشي Array، لذلك كنفتشو عليها.
      */

      if (
        !rawLineups.length
      ) {

        const lineupObjects = [];

        function searchLineupObject(
          source,
          depth = 0
        ) {

          if (
            !source ||
            typeof source !== "object" ||
            depth > 8
          ) {
            return;
          }

          if (
            !Array.isArray(source)
          ) {

            for (
              const key of Object.keys(source)
            ) {

              const value =
                source[key];

              const keyLower =
                key.toLowerCase();

              if (
                (
                  keyLower ===
                    "lineups" ||
                  keyLower ===
                    "lineup"
                ) &&
                value &&
                typeof value === "object" &&
                !Array.isArray(value)
              ) {

                if (
                  value.home ||
                  value.away
                ) {

                  if (
                    value.home
                  ) {

                    lineupObjects.push(
                      {
                        ...object(
                          value.home
                        ),
                        _side:
                          "home"
                      }
                    );

                  }

                  if (
                    value.away
                  ) {

                    lineupObjects.push(
                      {
                        ...object(
                          value.away
                        ),
                        _side:
                          "away"
                      }
                    );

                  }

                }

              }

              if (
                value &&
                typeof value === "object"
              ) {

                searchLineupObject(
                  value,
                  depth + 1
                );

              }

            }

          }

        }

        searchLineupObject(
          detailSource
        );

        searchLineupObject(
          root
        );

        rawLineups =
          lineupObjects;

      }

      /* -------------------------------------------------
         PLAYER NORMALIZER
      ------------------------------------------------- */

      function normalizePlayer(
        item
      ) {

        const p =
          item?.player &&
          typeof item.player === "object"
            ? item.player
            : (
                item?.person &&
                typeof item.person === "object"
                  ? item.person
                  : item
              );

        const statistics =
          item?.statistics?.[0] ||
          item?.statistics ||
          item?.stats ||
          {};

        const games =
          statistics?.games ||
          item?.games ||
          {};

        const goals =
          statistics?.goals ||
          item?.goals ||
          {};

        const cards =
          statistics?.cards ||
          item?.cards ||
          {};

        const passes =
          statistics?.passes ||
          item?.passes ||
          {};

        const firstName =
          p?.first_name ||
          p?.firstName ||
          "";

        const lastName =
          p?.last_name ||
          p?.lastName ||
          "";

        const playerName =
          p?.name ||
          p?.full_name ||
          p?.fullName ||
          item?.player_name ||
          item?.playerName ||
          item?.name ||
          `${firstName} ${lastName}`.trim() ||
          "Joueur";

        return {

          player: {

            id:
              p?.id ||
              item?.player_id ||
              item?.playerId ||
              item?.id ||
              null,

            name:
              playerName,

            number:
              p?.number ??
              p?.jersey_number ??
              item?.number ??
              item?.shirt_number ??
              item?.jersey_number ??
              null,

            pos:
              p?.pos ||
              p?.position ||
              item?.position ||
              item?.position_name ||
              item?.pos ||
              "",

            grid:
              p?.grid ||
              item?.grid ||
              item?.position_grid ||
              "",

            photo:
              p?.photo ||
              p?.image ||
              item?.photo ||
              item?.image ||
              ""

          },

          rating:
            item?.rating ??
            item?.player_rating ??
            statistics?.rating ??
            games?.rating ??
            p?.rating ??
            null,

          games: {

            rating:
              item?.rating ??
              item?.player_rating ??
              statistics?.rating ??
              games?.rating ??
              p?.rating ??
              null,

            minutes:
              item?.minutes ??
              statistics?.minutes ??
              games?.minutes ??
              null,

            position:
              item?.position ||
              item?.position_name ||
              games?.position ||
              p?.pos ||
              p?.position ||
              "",

            substitute:
              item?.substitute === true ||
              item?.is_substitute === true ||
              item?.bench === true,

            captain:
              item?.captain === true ||
              item?.is_captain === true

          },

          goals: {

            total:
              goals?.total ??
              item?.goals_total ??
              0,

            assists:
              goals?.assists ??
              item?.assists ??
              0

          },

          cards: {

            yellow:
              cards?.yellow ??
              item?.yellow ??
              0,

            red:
              cards?.red ??
              item?.red ??
              0

          },

          passes: {

            key:
              passes?.key ??
              passes?.key_passes ??
              item?.key_passes ??
              0

          },

          shots: {

            total:
              shotsTotal(
                statistics,
                item
              ),

            on:
              shotsOn(
                statistics,
                item
              )

          }

        };

      }

      function shotsTotal(
        statistics,
        item
      ) {

        return (
          statistics?.shots?.total ??
          item?.shots?.total ??
          item?.shots_total ??
          0
        );

      }

      function shotsOn(
        statistics,
        item
      ) {

        return (
          statistics?.shots?.on ??
          item?.shots?.on ??
          item?.shots_on ??
          0
        );

      }

      /* -------------------------------------------------
         LINEUP NORMALIZATION
      ------------------------------------------------- */

      const lineups =
        rawLineups
          .map(
            (lineup, index) => {

              const team =
                lineup?.team ||
                lineup?.club ||
                lineup?.participant ||
                {};

              let teamId =
                idOf(team) ||
                lineup?.team_id ||
                lineup?.teamId ||
                null;

              let teamName =
                text(team) ||
                lineup?.team_name ||
                lineup?.teamName ||
                "";

              let teamLogo =
                team?.logo ||
                team?.image ||
                lineup?.team_logo ||
                "";

              if (
                lineup?._side ===
                "home"
              ) {

                teamId =
                  teamId ||
                  home.id;

                teamName =
                  teamName ||
                  home.name;

                teamLogo =
                  teamLogo ||
                  home.logo;

              }

              if (
                lineup?._side ===
                "away"
              ) {

                teamId =
                  teamId ||
                  away.id;

                teamName =
                  teamName ||
                  away.name;

                teamLogo =
                  teamLogo ||
                  away.logo;

              }

              if (
                !teamName &&
                index === 0
              ) {

                teamId =
                  teamId ||
                  home.id;

                teamName =
                  home.name;

                teamLogo =
                  teamLogo ||
                  home.logo;

              }

              if (
                !teamName &&
                index === 1
              ) {

                teamId =
                  teamId ||
                  away.id;

                teamName =
                  away.name;

                teamLogo =
                  teamLogo ||
                  away.logo;

              }

              let starters =
                lineup?.startXI ||
                lineup?.startingXI ||
                lineup?.starting_xi ||
                lineup?.starters ||
                lineup?.starting ||
                null;

              let substitutes =
                lineup?.substitutes ||
                lineup?.bench ||
                lineup?.subs ||
                [];

              /*
                 fallback players / roster
              */

              if (
                !Array.isArray(starters)
              ) {

                const allPlayers =
                  lineup?.players ||
                  lineup?.roster ||
                  lineup?.squad ||
                  [];

                if (
                  Array.isArray(
                    allPlayers
                  )
                ) {

                  starters =
                    allPlayers.filter(
                      player =>
                        !(
                          player?.substitute === true ||
                          player?.is_substitute === true ||
                          player?.bench === true
                        )
                    );

                  substitutes =
                    allPlayers.filter(
                      player =>
                        player?.substitute === true ||
                        player?.is_substitute === true ||
                        player?.bench === true
                    );

                } else {

                  starters =
                    [];

                }

              }

              if (
                !Array.isArray(
                  substitutes
                )
              ) {

                substitutes =
                  [];

              }

              return {

                team: {

                  id:
                    teamId,

                  name:
                    teamName,

                  logo:
                    teamLogo

                },

                formation:
                  lineup?.formation ||
                  lineup?.tactics?.formation ||
                  lineup?.tactical_formation ||
                  "—",

                coach:
                  lineup?.coach ||
                  lineup?.manager ||
                  null,

                startXI:
                  starters.map(
                    normalizePlayer
                  ),

                substitutes:
                  substitutes.map(
                    normalizePlayer
                  )

              };

            }
          )
          .filter(
            lineup =>
              lineup.startXI.length ||
              lineup.substitutes.length ||
              lineup.formation !== "—"
          );

      /* -------------------------------------------------
         PLAYER STATISTICS
      ------------------------------------------------- */

      const playerArrays =
        [
          ...findArrays(
            detailSource,
            [
              "players",
              "player_stats",
              "playerstatistics"
            ]
          ),
          ...findArrays(
            root,
            [
              "players",
              "player_stats",
              "playerstatistics"
            ]
          )
        ];

      let players =
        playerArrays.reduce(
          (best, current) =>
            current.length >
            best.length
              ? current
              : best,
          []
        );

      /*
         إلا ماكانش players separate،
         نجمعو starters + substitutes.
      */

      if (
        !players.length &&
        lineups.length
      ) {

        players =
          lineups.map(
            lineup => ({

              team:
                lineup.team,

              players: [
                ...lineup.startXI,
                ...lineup.substitutes
              ]

            })
          );

      }

      /* -------------------------------------------------
         STATISTICS
      ------------------------------------------------- */

      const statisticsArrays =
        [
          ...findArrays(
            detailSource,
            [
              "statistics",
              "stats"
            ]
          ),
          ...findArrays(
            root,
            [
              "statistics",
              "stats"
            ]
          )
        ];

      const statistics =
        statisticsArrays.reduce(
          (best, current) =>
            current.length >
            best.length
              ? current
              : best,
          []
        );

      /* -------------------------------------------------
         FINAL DETAILS
      ------------------------------------------------- */

      const normalizedDetails = {

        fixture: {

          id:
            normalized?.fixture?.id ||
            slug,

          slug:

            normalized?.fixture?.slug ||
            slug,

          upstreamId:
            normalized?.fixture?.upstreamId ||
            rawMatch?.id ||
            rawMatch?.match_id ||
            null,

          date:
            normalized?.fixture?.date ||
            rawMatch?.time ||
            rawMatch?.date ||
            null,

          timezone:
            rawMatch?.timezone ||
            "UTC",

          status:
            normalized?.fixture?.status ||
            {
              short: "MATCH",
              long: "Match",
              elapsed: null
            },

          venue:
            rawMatch?.venue ||
            null,

          referee:
            rawMatch?.referee ||
            null

        },

        league:
          normalized?.league ||
          {
            id: null,
            name: "Football",
            country: "",
            logo: ""
          },

        teams: {

          home,

          away

        },

        goals:
          normalized?.goals ||
          {
            home: null,
            away: null
          },

        score:
          normalized?.score ||
          {
            home: null,
            away: null,
            halftime: {
              home: null,
              away: null
            },
            fulltime: {
              home: null,
              away: null
            }
          },

        events,

        lineups,

        statistics,

        players,

        /*
           raw response محفوظ،
           باش أي field موجود فالمصدر
           وما استعملناهش دابا ما يضيعش.
        */

        raw:
          detailSource,

        provider:
          "SportScore"

      };

      console.log(
        "DETAILS RESULT:",
        JSON.stringify(
          {
            slug,
            events:
              events.length,
            lineups:
              lineups.length,
            players:
              players.length,
            statistics:
              statistics.length
          },
          null,
          2
        )
      );

      return output(
        200,
        {
          data:
            normalizedDetails,

          provider:
            "SportScore"
        }
      );

    }

    /* =====================================================
       INVALID REQUEST
    ===================================================== */

    return output(
      400,
      {
        error:
          "Invalid request",

        provider:
          "SportScore",

        data: []
      }
    );

  } catch (error) {

    console.error(
      "SPORTSCORE ERROR:",
      error
    );

    return output(
      error?.status || 500,
      {

        error:
          error?.message ||
          "SportScore request failed",

        provider:
          "SportScore",

        details:
          error?.data ||
          null,

        data: []

      }
    );

  }

};
