/* =========================================================
   BAKHIRAFOOT
   MATCH DETAILS API - SEPARATE ENDPOINT

   URL:
   /api/match-details?fixture=MATCH_SLUG

   This file does NOT touch:
   /api/index.js
========================================================= */

module.exports = async (req, res) => {

  try {

    const fixture =
      String(
        req.query?.fixture ||
        ""
      ).trim();

    /* =====================================================
       BASIC VALIDATION
    ===================================================== */

    if (!fixture) {

      return res.status(400).json({
        error:
          "Fixture / match slug manquant",

        data:
          []
      });
    }

    /* =====================================================
       SPORTScore
    ===================================================== */

    const url =
      `https://sportscore.com/api/widget/match/?sport=football&slug=${encodeURIComponent(
        fixture
      )}&src=bakhira-foot.vercel.app`;

    console.log(
      "BAKHIRAFOOT MATCH DETAILS:",
      url
    );

    /* =====================================================
       FETCH
    ===================================================== */

    const response =
      await fetch(
        url,
        {
          method:
            "GET",

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

    let body;

    try {

      body =
        JSON.parse(
          rawText
        );

    } catch {

      body = {
        raw:
          rawText
      };

    }

    /* =====================================================
       API ERROR
    ===================================================== */

    if (!response.ok) {

      console.error(
        "SPORTSCORE MATCH ERROR:",
        response.status,
        body
      );

      return res.status(
        response.status
      ).json({

        error:
          `SportScore HTTP ${response.status}`,

        details:
          body,

        data:
          []

      });
    }

    /* =====================================================
       ROOT
    ===================================================== */

    const root =
      body?.match ||
      body?.data?.match ||
      body?.data ||
      body;

    if (
      !root ||
      typeof root !==
        "object"
    ) {

      return res.status(404).json({

        error:
          "Match details introuvables",

        data:
          []

      });
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function arr(value) {

      return Array.isArray(value)
        ? value
        : [];
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
        return String(
          value
        );
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

    function team(raw) {

      raw =
        raw || {};

      return {

        id:
          idOf(raw),

        name:
          text(raw) ||
          raw?.name ||
          "Équipe",

        logo:
          raw?.logo ||
          raw?.image ||
          raw?.picture ||
          ""

      };
    }

    /* =====================================================
       TEAMS
    ===================================================== */

    const homeTeam =
      team(
        root?.home_team ||
        root?.homeTeam ||
        root?.teams?.home ||
        root?.home
      );

    const awayTeam =
      team(
        root?.away_team ||
        root?.awayTeam ||
        root?.teams?.away ||
        root?.away
      );

    /* =====================================================
       SCORE
    ===================================================== */

    const score =
      root?.score ||
      {};

    const homeScore =
      root?.home_score ??
      root?.homeScore ??
      score?.home ??
      score?.fulltime?.home ??
      null;

    const awayScore =
      root?.away_score ??
      root?.awayScore ??
      score?.away ??
      score?.fulltime?.away ??
      null;

    /* =====================================================
       STATUS
    ===================================================== */

    let statusShort =
      root?.status_code ||
      root?.short_status ||
      "";

    const statusText =
      String(
        root?.status_text ||
        root?.status ||
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

      }
      else if (
        statusText.includes(
          "half"
        )
      ) {

        statusShort =
          "HT";

      }
      else if (
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

      }
      else if (
        statusText.includes(
          "postpon"
        )
      ) {

        statusShort =
          "PST";

      }
      else if (
        statusText.includes(
          "cancel"
        )
      ) {

        statusShort =
          "CANC";

      }
      else {

        statusShort =
          "NS";

      }

    }

    /* =====================================================
       LINEUPS SOURCE
    ===================================================== */

    const lineupSource =
      root?.lineups ||
      root?.lineup ||
      root?.compositions ||
      root?.formations ||
      null;

    let homeLineup =
      null;

    let awayLineup =
      null;

    /* =====================================================
       LINEUP NORMALIZER
    ===================================================== */

    function normalizePlayer(
      item
    ) {

      const p =
        item?.player ||
        item ||
        {};

      return {

        player: {

          id:
            p?.id ||
            item?.player_id ||
            null,

          name:
            p?.name ||
            item?.name ||
            "Joueur",

          number:
            item?.shirtNumber ??
            item?.jerseyNumber ??
            p?.shirtNumber ??
            p?.jerseyNumber ??
            item?.number ??
            null,

          pos:
            item?.position ||
            p?.position ||
            p?.pos ||
            "",

          grid:
            item?.grid ||
            item?.positionGrid ||
            p?.grid ||
            "",

          photo:
            p?.picture ||
            p?.image ||
            item?.photo ||
            ""

        },

        rating:
          item?.rating ??
          item?.performance?.rating ??
          null,

        games: {

          rating:
            item?.rating ??
            item?.performance?.rating ??
            null,

          minutes:
            item?.minutes ??
            item?.minutesPlayed ??
            null,

          position:
            item?.position ||
            p?.position ||
            "",

          substitute:
            item?.substitute === true ||
            item?.starter === false,

          captain:
            item?.captain === true

        },

        goals: {

          total:
            item?.goals?.total ??
            item?.goals ??
            0,

          assists:
            item?.goals?.assists ??
            item?.assists ??
            0

        },

        cards: {

          yellow:
            item?.cards?.yellow ??
            item?.yellow ??
            0,

          red:
            item?.cards?.red ??
            item?.red ??
            0

        },

        passes: {

          key:
            item?.passes?.key ??
            item?.key_passes ??
            0

        },

        shots: {

          total:
            item?.shots?.total ??
            item?.shots ??
            0,

          on:
            item?.shots?.on ??
            item?.shots_on_target ??
            0

        }

      };
    }

    function normalizeLineup(
      source,
      fallbackTeam
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
            source?.starting_xi
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

        team:
          fallbackTeam,

        formation:
          source?.formation ||
          source?.tacticalFormation ||
          source?.formationUsed ||
          source?.tactics?.formation ||
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
       LINEUP DETECTION
    ===================================================== */

    if (
      Array.isArray(
        lineupSource
      )
    ) {

      const first =
        lineupSource[0];

      const second =
        lineupSource[1];

      if (
        first
      ) {

        const firstTeam =
          first?.team ||
          {};

        const firstId =
          firstTeam?.id ||
          null;

        if (
          homeTeam.id &&
          firstId &&
          String(
            homeTeam.id
          ) ===
          String(firstId)
        ) {

          homeLineup =
            normalizeLineup(
              first,
              homeTeam
            );

        }
        else {

          homeLineup =
            normalizeLineup(
              first,
              homeTeam
            );

        }

      }

      if (
        second
      ) {

        awayLineup =
          normalizeLineup(
            second,
            awayTeam
          );

      }

    }
    else if (
      lineupSource &&
      typeof lineupSource ===
        "object"
    ) {

      const homeSource =
        lineupSource?.home ||
        lineupSource?.homeTeam ||
        lineupSource?.host ||
        null;

      const awaySource =
        lineupSource?.away ||
        lineupSource?.awayTeam ||
        lineupSource?.guest ||
        null;

      if (
        homeSource
      ) {

        homeLineup =
          normalizeLineup(
            homeSource,
            homeTeam
          );

      }

      if (
        awaySource
      ) {

        awayLineup =
          normalizeLineup(
            awaySource,
            awayTeam
          );

      }

    }

    const lineups = [
      homeLineup,
      awayLineup
    ].filter(Boolean);

    /* =====================================================
       EVENTS / TIMELINE
    ===================================================== */

    const eventSource =
      root?.events ||
      root?.timeline ||
      root?.incidents ||
      root?.match_events ||
      [];

    const events =
      arr(
        eventSource
      )
        .map(
          event => {

            const player =
              event?.player ||
              {};

            const assist =
              event?.assist ||
              event?.assist1 ||
              {};

            const eventTeam =
              event?.team ||
              {};

            return {

              time: {

                elapsed:
                  event?.time?.elapsed ??
                  event?.minute ??
                  event?.time ??
                  null,

                extra:
                  event?.time?.extra ??
                  event?.addedTime ??
                  event?.extra ??
                  null

              },

              team: {

                id:
                  eventTeam?.id ||
                  event?.team_id ||
                  null,

                name:
                  eventTeam?.name ||
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
                event?.type ||
                event?.incidentType ||
                event?.event_type ||
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

    /* =====================================================
       STATISTICS
    ===================================================== */

    const statsSource =
      root?.statistics ||
      root?.stats ||
      [];

    let statistics = [];

    if (
      Array.isArray(
        statsSource
      )
    ) {

      if (
        statsSource[0]?.groups
      ) {

        const block =
          statsSource.find(
            item =>
              String(
                item?.period ||
                ""
              ).toUpperCase() ===
              "ALL"
          ) ||
          statsSource[0];

        const homeStats = [];
        const awayStats = [];

        arr(
          block?.groups
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

        statistics = [

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
      else {

        statistics =
          statsSource
            .slice(0, 2)
            .map(
              (block, index) => {

                const values =
                  arr(
                    block?.statistics ||
                    block?.stats
                  )
                    .map(
                      item => ({

                        type:
                          item?.type ||
                          item?.name ||
                          "Stat",

                        value:
                          item?.value ??
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

    }

    /* =====================================================
       PLAYERS
    ===================================================== */

    const players =
      lineups
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

    /* =====================================================
       VENUE
    ===================================================== */

    const venue =
      root?.venue ||
      root?.stadium ||
      null;

    /* =====================================================
       COMPETITION
    ===================================================== */

    const competition =
      root?.competition ||
      root?.league ||
      {};

    /* =====================================================
       DATE
    ===================================================== */

    const matchDate =
      root?.time ||
      root?.date ||
      root?.start_time ||
      root?.kickoff ||
      null;

    /* =====================================================
       FINAL RESULT
    ===================================================== */

    const details = {

      fixture: {

        id:
          fixture,

        slug:
          fixture,

        upstreamId:
          root?.id ||
          root?.match_id ||
          null,

        date:
          matchDate,

        timezone:
          root?.timezone ||
          "UTC",

        status: {

          short:
            statusShort,

          long:
            root?.status_text ||
            root?.status ||
            "Match",

          elapsed:
            root?.minute ??
            root?.elapsed ??
            root?.status?.elapsed ??
            null

        },

        venue,

        referee:
          typeof root?.referee ===
            "object"
            ? root?.referee?.name ||
              ""
            : root?.referee ||
              ""

      },

      league: {

        id:
          idOf(
            competition
          ),

        name:
          text(
            competition
          ) ||
          root?.competition_name ||
          root?.league_name ||
          "Football",

        country:
          competition?.country ||
          root?.country ||
          "",

        logo:
          competition?.logo ||
          "",

        round:
          root?.round ||
          root?.round_name ||
          null,

        season:
          root?.season?.name ||
          root?.season ||
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

      sportscore: {

        matchSlug:
          fixture,

        source:
          "sportscore"

      },

      provider:
        "SportScore"

    };

    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
      "MATCH DETAILS RESULT:",
      JSON.stringify(
        {
          fixture,

          home:
            homeTeam.name,

          away:
            awayTeam.name,

          score:
            `${homeScore}-${awayScore}`,

          lineups:
            lineups.length,

          homePlayers:
            homeLineup?.startXI?.length ||
            0,

          awayPlayers:
            awayLineup?.startXI?.length ||
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

    /* =====================================================
       RESPONSE
    ===================================================== */

    res.setHeader(
      "Cache-Control",
      "s-maxage=30, stale-while-revalidate=60"
    );

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    return res.status(200).json({
      data:
        details,

      provider:
        "SportScore"
    });

  }

  catch (
    error
  ) {

    console.error(
      "BAKHIRAFOOT MATCH DETAILS ERROR:",
      error
    );

    return res.status(
      error?.status ||
      500
    ).json({

      error:
        error?.message ||
        "Match details API failed",

      details:
        error?.data ||
        null,

      data:
        []

    });

  }

};
