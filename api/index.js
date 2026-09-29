module.exports = async (req, res) => {
  try {
    const {
      live,
      date,
      fixture,
      details
    } = req.query;

    const SPORTSCORE_BASE =
      "https://sportscore.com/api/v1";

    const SRC =
      "bakhira-foot.vercel.app";

    /* =====================================================
       HELPERS
    ===================================================== */

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    function sendJSON(
      status,
      data
    ) {
      res.setHeader(
        "Cache-Control",
        "s-maxage=60, stale-while-revalidate=120"
      );

      return res
        .status(status)
        .json(data);
    }

    async function fetchSportScore(
      path
    ) {
      const separator =
        path.includes("?")
          ? "&"
          : "?";

      const url =
        `${SPORTSCORE_BASE}${path}` +
        `${separator}src=${encodeURIComponent(
          SRC
        )}`;

      const response =
        await fetch(url, {
          headers: {
            Accept:
              "application/json"
          },
          cache: "no-store"
        });

      const text =
        await response.text();

      let data = {};

      try {
        data = JSON.parse(text);
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

    function extractArray(
      body,
      keys = []
    ) {

      if (Array.isArray(body)) {
        return body;
      }

      for (
        const key
        of keys
      ) {

        if (
          Array.isArray(
            body?.[key]
          )
        ) {
          return body[key];
        }

      }

      if (
        Array.isArray(
          body?.data
        )
      ) {
        return body.data;
      }

      return [];
    }

    function getValue(
      obj,
      paths,
      fallback = null
    ) {

      for (
        const path
        of paths
      ) {

        const parts =
          path.split(".");

        let value =
          obj;

        for (
          const part
          of parts
        ) {

          if (
            value === null ||
            value === undefined
          ) {
            value =
              undefined;
            break;
          }

          value =
            value[part];
        }

        if (
          value !== undefined &&
          value !== null
        ) {
          return value;
        }
      }

      return fallback;
    }

    /* =====================================================
       TEAM NORMALIZER
    ===================================================== */

    function normalizeTeam(
      team,
      fallbackName
    ) {

      if (
        typeof team === "string"
      ) {

        return {
          id: null,
          name: team,
          logo: ""
        };

      }

      team =
        team || {};

      return {

        id:
          getValue(
            team,
            [
              "id",
              "team_id"
            ]
          ),

        name:
          getValue(
            team,
            [
              "name",
              "team",
              "title"
            ],
            fallbackName
          ),

        logo:
          getValue(
            team,
            [
              "logo",
              "image",
              "team_logo"
            ],
            ""
          )

      };
    }

    /* =====================================================
       FIXTURE NORMALIZER
    ===================================================== */

    function normalizeFixture(
      item
    ) {

      if (!item) {
        return null;
      }

      const home =
        normalizeTeam(
          getValue(
            item,
            [
              "home_team",
              "homeTeam",
              "home"
            ],
            null
          ),
          "Domicile"
        );

      const away =
        normalizeTeam(
          getValue(
            item,
            [
              "away_team",
              "awayTeam",
              "away"
            ],
            null
          ),
          "Extérieur"
        );

      const scoreHome =
        getValue(
          item,
          [
            "home_score",
            "score.home",
            "homeScore"
          ],
          null
        );

      const scoreAway =
        getValue(
          item,
          [
            "away_score",
            "score.away",
            "awayScore"
          ],
          null
        );

      const slug =
        getValue(
          item,
          [
            "slug",
            "match_slug"
          ],
          null
        );

      /*
         مهم:
         SportScore match detail كيستعمل slug.
         لذلك إلا ما كانش numeric ID،
         كنخليو fixture.id = slug
         باش script.js الحالي يقدر يفتح Details.
      */

      const id =
        getValue(
          item,
          [
            "id",
            "match_id",
            "fixture_id"
          ],
          null
        ) ||
        slug;

      const rawStatus =
        String(
          getValue(
            item,
            [
              "status",
              "state"
            ],
            ""
          )
        ).toLowerCase();

      let shortStatus =
        getValue(
          item,
          [
            "status_code",
            "short_status"
          ],
          null
        );

      if (!shortStatus) {

        if (
          rawStatus.includes("live") ||
          rawStatus.includes("in play") ||
          rawStatus.includes("inplay")
        ) {
          shortStatus =
            "LIVE";
        }
        else if (
          rawStatus.includes("finish") ||
          rawStatus === "ft" ||
          rawStatus.includes("ended")
        ) {
          shortStatus =
            "FT";
        }
        else if (
          rawStatus.includes("postpon")
        ) {
          shortStatus =
            "PST";
        }
        else if (
          rawStatus.includes("cancel")
        ) {
          shortStatus =
            "CANC";
        }
        else if (
          rawStatus.includes("half")
        ) {
          shortStatus =
            "HT";
        }
        else {
          shortStatus =
            "NS";
        }

      }

      const matchDate =
        getValue(
          item,
          [
            "time",
            "date",
            "start_time",
            "kickoff"
          ],
          null
        );

      const league =
        getValue(
          item,
          [
            "competition",
            "competition.name",
            "league",
            "league.name"
          ],
          "Football"
        );

      const leagueName =
        typeof league === "string"
          ? league
          : (
              league?.name ||
              "Football"
            );

      return {

        fixture: {

          id,

          slug,

          date:
            matchDate,

          timezone:
            "UTC",

          venue:
            getValue(
              item,
              [
                "venue"
              ]
            ),

          referee:
            getValue(
              item,
              [
                "referee"
              ]
            ),

          status: {

            short:
              shortStatus,

            long:
              getValue(
                item,
                [
                  "status_text",
                  "status_long",
                  "status"
                ],
                "Match"
              ),

            elapsed:
              getValue(
                item,
                [
                  "minute",
                  "elapsed",
                  "time.elapsed"
                ],
                null
              )

          }

        },

        league: {

          id:
            getValue(
              item,
              [
                "competition_id",
                "competition.id",
                "league.id"
              ]
            ),

          name:
            leagueName,

          country:
            getValue(
              item,
              [
                "country",
                "competition.country",
                "league.country"
              ]
            ),

          logo:
            getValue(
              item,
              [
                "competition_logo",
                "competition.logo",
                "league.logo"
              ],
              ""
            )

        },

        teams: {

          home,

          away

        },

        goals: {

          home:
            scoreHome,

          away:
            scoreAway

        },

        score: {

          home:
            scoreHome,

          away:
            scoreAway,

          halftime:
            getValue(
              item,
              [
                "score.halftime"
              ],
              {
                home: null,
                away: null
              }
            ),

          fulltime:
            getValue(
              item,
              [
                "score.fulltime"
              ],
              {
                home: scoreHome,
                away: scoreAway
              }
            )

        }

      };
    }

    /* =====================================================
       FIXTURES BY DATE
    ===================================================== */

    if (
      !live &&
      !fixture
    ) {

      const matchDate =
        date || today;

      const data =
        await fetchSportScore(
          `/fixtures/?sport=football&date=${encodeURIComponent(
            matchDate
          )}&limit=200`
        );

      const rawMatches =
        extractArray(
          data,
          [
            "matches"
          ]
        );

      const matches =
        rawMatches
          .map(
            normalizeFixture
          )
          .filter(Boolean);

      return sendJSON(
        200,
        {
          data: matches,
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

      const data =
        await fetchSportScore(
          `/fixtures/?sport=football&status=live&limit=200`
        );

      const rawMatches =
        extractArray(
          data,
          [
            "matches"
          ]
        );

      const matches =
        rawMatches
          .map(
            normalizeFixture
          )
          .filter(Boolean);

      return sendJSON(
        200,
        {
          data: matches,
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

      const data =
        await fetchSportScore(
          `/match/?sport=football&slug=${encodeURIComponent(
            slug
          )}`
        );

      /*
         SportScore detail envelope
      */

      const root =
        data?.data ||
        data?.match ||
        data;

      const match =
        root?.match ||
        root?.fixture ||
        root;

      const adaptedMatch =
        normalizeFixture(
          match
        );

      /* ================================================
         EVENTS / TIMELINE
      ================================================ */

      const rawEvents =
        root?.timeline ||
        root?.events ||
        root?.incidents ||
        [];

      const events =
        Array.isArray(
          rawEvents
        )
          ? rawEvents.map(
              event => {

                const team =
                  event?.team ||
                  {};

                const player =
                  event?.player ||
                  {};

                const assist =
                  event?.assist ||
                  {};

                return {

                  time: {

                    elapsed:
                      event?.minute ??
                      event?.elapsed ??
                      event?.time?.elapsed ??
                      null,

                    extra:
                      event?.extra ??
                      event?.time?.extra ??
                      null

                  },

                  team: {

                    id:
                      team?.id ??
                      event?.team_id ??
                      null,

                    name:
                      team?.name ??
                      event?.team_name ??
                      ""

                  },

                  player: {

                    id:
                      player?.id ??
                      event?.player_id ??
                      null,

                    name:
                      player?.name ??
                      event?.player_name ??
                      ""

                  },

                  assist: {

                    id:
                      assist?.id ??
                      event?.assist_id ??
                      null,

                    name:
                      assist?.name ??
                      event?.assist_name ??
                      ""

                  },

                  type:
                    event?.type ||
                    event?.event_type ||
                    "Other",

                  detail:
                    event?.detail ||
                    event?.description ||
                    event?.text ||
                    event?.comments ||
                    ""

                };

              }
            )
          : [];

      /* ================================================
         LINEUPS
      ================================================ */

      const rawLineups =
        root?.lineups ||
        root?.lineup ||
        [];

      const lineupArray =
        Array.isArray(
          rawLineups
        )
          ? rawLineups
          : [];

      const lineups =
        lineupArray.map(
          lineup => {

            const team =
              normalizeTeam(
                lineup?.team ||
                {
                  id:
                    lineup?.team_id,
                  name:
                    lineup?.team_name,
                  logo:
                    lineup?.team_logo
                },
                "Équipe"
              );

            const starters =
              lineup?.startXI ||
              lineup?.startingXI ||
              lineup?.starting_xi ||
              lineup?.starters ||
              [];

            const substitutes =
              lineup?.substitutes ||
              lineup?.bench ||
              [];

            function playerNormal(
              item
            ) {

              const player =
                item?.player ||
                item ||
                {};

              return {

                player: {

                  id:
                    player?.id ||
                    item?.player_id ||
                    null,

                  name:
                    player?.name ||
                    item?.name ||
                    "Joueur",

                  number:
                    player?.number ??
                    item?.number ??
                    item?.shirt_number ??
                    null,

                  pos:
                    player?.pos ||
                    player?.position ||
                    item?.position ||
                    item?.pos ||
                    "",

                  grid:
                    player?.grid ||
                    item?.grid ||
                    "",

                  photo:
                    player?.photo ||
                    item?.photo ||
                    ""

                },

                rating:
                  item?.rating ??
                  item?.statistics?.rating ??
                  null,

                games: {

                  rating:
                    item?.rating ??
                    item?.statistics?.rating ??
                    null,

                  minutes:
                    item?.minutes ??
                    item?.statistics?.minutes ??
                    null,

                  position:
                    item?.position ??
                    item?.statistics?.position ??
                    player?.pos ??
                    "",

                  substitute:
                    item?.substitute ??
                    false,

                  captain:
                    item?.captain ??
                    false

                },

                goals:
                  item?.goals ||
                  item?.statistics?.goals ||
                  {},

                cards:
                  item?.cards ||
                  item?.statistics?.cards ||
                  {},

                passes:
                  item?.passes ||
                  item?.statistics?.passes ||
                  {},

                shots:
                  item?.shots ||
                  item?.statistics?.shots ||
                  {}

              };

            }

            return {

              team,

              formation:
                lineup?.formation ||
                lineup?.tactics ||
                "—",

              coach:
                lineup?.coach ||
                lineup?.manager ||
                null,

              startXI:
                starters.map(
                  playerNormal
                ),

              substitutes:
                substitutes.map(
                  playerNormal
                )

            };

          }
        );

      /* ================================================
         PLAYER STATS
      ================================================ */

      let players =
        Array.isArray(
          root?.players
        )
          ? root.players
          : [];

      /*
         إذا SportScore رجعاتش players بشكل
         مستقل، كنصنعوهم من lineups.
      */

      if (
        !players.length &&
        lineups.length
      ) {

        players =
          lineups.map(
            lineup => {

              return {

                team:
                  lineup.team,

                players: [

                  ...lineup.startXI,
                  ...lineup.substitutes

                ].map(
                  item => {

                    const p =
                      item.player ||
                      {};

                    return {

                      player: p,

                      statistics: [

                        {

                          games:
                            item.games ||
                            {},

                          goals:
                            item.goals ||
                            {},

                          cards:
                            item.cards ||
                            {},

                          passes:
                            item.passes ||
                            {},

                          shots:
                            item.shots ||
                            {}

                        }

                      ]

                    };

                  }
                )

              };

            }
          );

      }

      /* ================================================
         STATISTICS
      ================================================ */

      const statistics =
        root?.statistics ||
        root?.stats ||
        [];

      /* ================================================
         FINAL RESPONSE
      ================================================ */

      return sendJSON(
        200,
        {

          fixture:
            adaptedMatch?.fixture ||
            {
              id: slug,
              slug
            },

          league:
            adaptedMatch?.league ||
            {},

          teams:
            adaptedMatch?.teams ||
            {},

          goals:
            adaptedMatch?.goals ||
            {},

          score:
            adaptedMatch?.score ||
            {},

          events,

          lineups,

          statistics,

          players,

          provider:
            "SportScore"

        }
      );

    }

    return sendJSON(
      400,
      {
        error:
          "Invalid request"
      }
    );

  } catch (error) {

    console.error(
      "SPORTSCORE API ERROR:",
      error
    );

    return sendJSON(
      error?.status || 500,
      {

        error:
          error?.message ||
          "SportScore request failed",

        code:
          error?.data?.code ||
          null,

        data: []

      }
    );
  }
};
