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

    function todayISO() {
      return new Date()
        .toISOString()
        .split("T")[0];
    }

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

    async function sportScoreFetch(
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

      console.log(
        "SPORTSCORE:",
        url
      );

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

    function extractMatches(
      body
    ) {
      if (
        Array.isArray(body?.matches)
      ) {
        return body.matches;
      }

      if (
        Array.isArray(body?.data)
      ) {
        return body.data;
      }

      if (
        Array.isArray(body)
      ) {
        return body;
      }

      return [];
    }

    function pick(
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
       TEAM
    ===================================================== */

    function normalizeTeam(
      raw,
      root,
      side
    ) {
      const source =
        typeof raw === "object" &&
        raw !== null
          ? raw
          : {};

      const prefix =
        side === "home"
          ? "home"
          : "away";

      return {

        id:
          pick(
            source,
            [
              "id",
              "team_id"
            ]
          ) ||
          pick(
            root,
            [
              `${prefix}_id`,
              `${prefix}_team_id`,
              `${prefix}_team.id`
            ]
          ),

        name:
          (
            typeof raw === "string"
              ? raw
              : null
          ) ||
          pick(
            source,
            [
              "name",
              "team",
              "title"
            ]
          ) ||
          pick(
            root,
            [
              prefix,
              `${prefix}_name`,
              `${prefix}_team.name`
            ],
            side === "home"
              ? "Domicile"
              : "Extérieur"
          ),

        logo:
          pick(
            source,
            [
              "logo",
              "image",
              "team_logo"
            ]
          ) ||
          pick(
            root,
            [
              `${prefix}_logo`,
              `${prefix}_team.logo`
            ],
            ""
          )

      };
    }

    /* =====================================================
       FIXTURE ADAPTER
    ===================================================== */

const slug =
  pick(
    item,
    [
      "slug",
      "match_slug",
      "url_slug",
      "match.slug",
      "fixture.slug",
      "data.slug"
    ],
    null
  );

const upstreamId =
  pick(
    item,
    [
      "id",
      "match_id",
      "fixture_id",
      "match.id",
      "fixture.id"
    ],
    null
  );

/*
 * SportScore Match Details كيتطلب slug.
 * لذلك كنستعملو slug كـ public fixture id.
 */
const publicId =
  slug ||
  upstreamId ||
  null;
      const home =
        normalizeTeam(
          pick(
            item,
            [
              "home_team",
              "homeTeam",
              "home"
            ]
          ),
          item,
          "home"
        );

      const away =
        normalizeTeam(
          pick(
            item,
            [
              "away_team",
              "awayTeam",
              "away"
            ]
          ),
          item,
          "away"
        );

      const homeScore =
        pick(
          item,
          [
            "home_score",
            "score.home",
            "homeScore"
          ],
          null
        );

      const awayScore =
        pick(
          item,
          [
            "away_score",
            "score.away",
            "awayScore"
          ],
          null
        );

      const rawStatus =
        String(
          pick(
            item,
            [
              "status",
              "state",
              "status_text"
            ],
            ""
          )
        ).toLowerCase();

      let shortStatus =
        pick(
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

      const competition =
        pick(
          item,
          [
            "competition",
            "league"
          ],
          null
        );

      const leagueName =
        typeof competition === "string"
          ? competition
          : (
              pick(
                competition,
                [
                  "name",
                  "title"
                ],
                null
              ) ||
              "Football"
            );

      const leagueId =
        pick(
          item,
          [
            "competition_id",
            "competition.id",
            "league.id"
          ]
        );

      const leagueLogo =
        pick(
          item,
          [
            "competition_logo",
            "competition.logo",
            "league.logo"
          ],
          ""
        );

      const leagueCountry =
        pick(
          item,
          [
            "country",
            "competition.country",
            "league.country"
          ]
        );

      return {

        fixture: {

          /*
             slug هو ID المستعمل داخلياً
             مع endpoint /match/
          */
          id:
            publicId,

          slug:
            slug,

          /*
             numeric/native ID محفوظ هنا
          */
          upstreamId:
            upstreamId,

          date:
            pick(
              item,
              [
                "time",
                "date",
                "start_time",
                "kickoff"
              ]
            ),

          timezone:
            "UTC",

          status: {

            short:
              shortStatus,

            long:
              pick(
                item,
                [
                  "status_text",
                  "status_long",
                  "status"
                ],
                "Match"
              ),

            elapsed:
              pick(
                item,
                [
                  "minute",
                  "elapsed",
                  "time.elapsed"
                ],
                null
              )

          },

          venue:
            pick(
              item,
              [
                "venue"
              ]
            ),

          referee:
            pick(
              item,
              [
                "referee"
              ]
            )

        },

        league: {

          id:
            leagueId,

          name:
            leagueName,

          country:
            leagueCountry,

          logo:
            leagueLogo

        },

        teams: {

          home:
            home,

          away:
            away

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
            pick(
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
            pick(
              item,
              [
                "score.fulltime"
              ],
              {
                home:
                  homeScore,

                away:
                  awayScore
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
        date ||
        todayISO();

      const body =
        await sportScoreFetch(
          `/fixtures/?sport=football&date=${encodeURIComponent(
            matchDate
          )}&limit=200`
        );

      const raw =
        extractMatches(
          body
        );

      const matches =
        raw
          .map(
            normalizeFixture
          )
          .filter(Boolean);

      return sendJSON(
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
        await sportScoreFetch(
          `/fixtures/?sport=football&status=live&limit=200`
        );

      const raw =
        extractMatches(
          body
        );

      const matches =
        raw
          .map(
            normalizeFixture
          )
          .filter(Boolean);

      return sendJSON(
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

    if (
      fixture
    ) {

      const slug =
        String(
          fixture
        ).trim();

      const body =
        await sportScoreFetch(
          `/match/?sport=football&slug=${encodeURIComponent(
            slug
          )}`
        );

      /*
         SportScore documented match endpoint
         كيرجع match detail envelope فيها
         score + status + lineups + timeline.
      */

      const root =
        body?.data ||
        body?.match ||
        body;

      const match =
        root?.match ||
        root?.fixture ||
        root;

      const normalized =
        normalizeFixture(
          match
        );

      /* ===================================================
         EVENTS / TIMELINE
      =================================================== */

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

      /* ===================================================
         LINEUPS
      =================================================== */

      const lineups =
        root?.lineups ||
        root?.lineup ||
        [];

      /* ===================================================
         STATISTICS
      =================================================== */

      const statistics =
        root?.statistics ||
        root?.stats ||
        [];

      /* ===================================================
         PLAYERS
      =================================================== */

      const players =
        root?.players ||
        [];

      return sendJSON(
        200,
        {

          /*
             نفس structure اللي script.js
             ديالك كيستنى
          */

          fixture:
            normalized?.fixture ||
            {
              id:
                slug,

              slug:
                slug
            },

          league:
            normalized?.league ||
            {},

          teams:
            normalized?.teams ||
            {},

          goals:
            normalized?.goals ||
            {},

          score:
            normalized?.score ||
            {},

          events:
            Array.isArray(
              events
            )
              ? events
              : [],

          lineups:
            Array.isArray(
              lineups
            )
              ? lineups
              : [],

          statistics:
            Array.isArray(
              statistics
            )
              ? statistics
              : [],

          players:
            Array.isArray(
              players
            )
              ? players
              : [],

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

        provider:
          "SportScore",

        data: []

      }
    );
  }
};
