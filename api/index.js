/* =========================================================
   BAKHIRAFOOT PRO API - CLEAN VERSION
   SportScore + SofaScore + ESPN + TheSportsDB

   DATE:
     /api?date=YYYY-MM-DD

   LIVE:
     /api?live=all

   DETAILS:
     /api?fixture=<sportscore-slug>
     /api?fixture=sofa-123456
     /api?fixture=espn-123456
     /api?fixture=tsdb-123456

   SOURCE OPTIONAL:
     &source=sofascore
     &source=espn
     &source=thesportsdb
     &source=sportscore
   ========================================================= */

module.exports = async (req, res) => {
  try {

    /* =====================================================
       QUERY
    ===================================================== */

    const live =
      String(
        req?.query?.live || ""
      )
        .trim()
        .toLowerCase();

    const date =
      String(
        req?.query?.date || ""
      )
        .trim();

    const fixture =
      String(
        req?.query?.fixture || ""
      )
        .trim();

    const source =
      String(
        req?.query?.source || ""
      )
        .trim()
        .toLowerCase();


    /* =====================================================
       PROVIDERS
    ===================================================== */

    const SPORTSCORE =
      "https://sportscore.com/api/v1";

    const WIDGET =
      "https://sportscore.com/api/widget";

    const SOFA =
      "https://api.sofascore.com/api/v1";

    const ESPN =
      "https://site.api.espn.com/apis/site/v2";

    const TSDB =
      "https://www.thesportsdb.com/api/v1/json/123";

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);


    /* =====================================================
       OUTPUT
    ===================================================== */

    function output(
      status,
      payload
    ) {

      res.setHeader(
        "Cache-Control",
        "no-store, s-maxage=30, stale-while-revalidate=60"
      );

      res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
      );

      return res
        .status(status)
        .json(payload);
    }


    /* =====================================================
       HTTP JSON
    ===================================================== */

    async function getJSON(
      url,
      timeout = 15000
    ) {

      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () => {
            controller.abort();
          },
          timeout
        );

      try {

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
        catch (_) {

          data = {
            raw:
              rawText
          };

        }


        if (
          !response.ok
        ) {

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
      finally {

        clearTimeout(
          timer
        );

      }
    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function arr(value) {

      return Array.isArray(
        value
      )
        ? value
        : [];

    }


    function obj(value) {

      return (
        value &&
        typeof value ===
          "object" &&
        !Array.isArray(
          value
        )
      )
        ? value
        : {};

    }


    function first(
      ...values
    ) {

      for (
        const value of
          values
      ) {

        if (
          value !==
            undefined &&
          value !== null &&
          value !== ""
        ) {

          return value;

        }

      }

      return null;

    }


    function text(
      value
    ) {

      if (
        typeof value ===
        "string"
      ) {

        return value.trim();

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

        return String(

          first(

            value.name,

            value.displayName,

            value.full_name,

            value.fullName,

            value.shortName,

            value.title,

            value.label,

            ""

          ) || ""

        ).trim();

      }


      return "";

    }


    function idOf(
      value
    ) {

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

        return first(

          value.id,

          value.team_id,

          value.player_id,

          value.fixture_id,

          value.event_id,

          null

        );

      }


      return null;

    }


    function imageOf(
      value
    ) {

      if (
        !value ||
        typeof value !==
          "object"
      ) {

        return "";

      }


      return String(

        first(

          value.logo,

          value.image,

          value.picture,

          value.photo,

          value.avatar,

          value.icon,

          value.badge,

          value.logo_url,

          value.logoUrl,

          value.image_url,

          value.imageUrl,

          value.strBadge,

          value.strBadgeLogo,

          value.strLeagueBadge,

          value.strHomeTeamBadge,

          value.strAwayTeamBadge,

          value.team_logo,

          value.teamLogo,

          ""

        ) || ""

      );

    }


    function norm(
      value
    ) {

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


    function slugPart(
      value
    ) {

      return norm(
        value
      )
        .replace(
          /\s+/g,
          "-"
        );

    }


    function isoDate(
      value
    ) {

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {

        return null;

      }


      if (
        typeof value ===
          "number" ||
        /^\d+$/.test(
          String(value)
            .trim()
        )
      ) {

        const number =
          Number(
            value
          );

        const dateObject =
          new Date(

            number <
              10000000000

              ? number * 1000

              : number

          );

        return (
          Number.isNaN(
            dateObject.getTime()
          )
            ? null
            : dateObject
                .toISOString()
                .slice(0, 10)
        );

      }


      const stringValue =
        String(
          value
        ).trim();


      const direct =
        stringValue.match(
          /^(\d{4}-\d{2}-\d{2})/
        );


      if (
        direct
      ) {

        return direct[1];

      }


      const dateObject =
        new Date(
          stringValue
        );


      return (
        Number.isNaN(
          dateObject.getTime()
        )
          ? null
          : dateObject
              .toISOString()
              .slice(0, 10)
      );

    }


    /* =====================================================
       STAGE-ONLY COMPETITIONS
    ===================================================== */

    const STAGES =
      new Set([

        "regular season",

        "fall season",

        "spring season",

        "summer season",

        "winter season",

        "group stage",

        "league phase",

        "first round",

        "second round",

        "third round",

        "qualifying round",

        "qualification round",

        "round of 16",

        "round of 32",

        "round of 64",

        "quarterfinal",

        "quarterfinals",

        "quarter-final",

        "quarter-finals",

        "semifinal",

        "semifinals",

        "semi-final",

        "semi-finals",

        "final",

        "playoff",

        "playoffs",

        "play-off",

        "play-offs"

      ]);


    function isStageName(
      value
    ) {

      const name =
        norm(
          value
        );


      return (

        STAGES.has(
          name
        ) ||

        /^(regular season|fall season|spring season|summer season|winter season|group stage|league phase|first round|second round|third round|qualifying round|qualification round|round of \d+|quarter ?finals?|semi ?finals?|final|play ?offs?)$/
          .test(
            name
          )

      );

    }


    function cleanLeague(
      value
    ) {

      const original =
        text(
          value
        );


      if (
        !original
      ) {

        return "Football";

      }


      const cleaned =
        original

          .replace(

            /\s*[-–—:|]\s*(Regular Season|Fall Season|Spring Season|Summer Season|Winter Season|Group Stage|League Phase|Qualifying Round|Qualification Round|First Round|Second Round|Third Round|Round of \d+|Quarter[- ]?Finals?|Semi[- ]?Finals?|Final|Play[- ]?offs?)\s*(?:[-–—:|]\s*\d+)?\s*$/i,

            ""

          )

          .trim();


      return (
        cleaned ||
        "Football"
      );

    }


    /* =====================================================
       TEAM
    ===================================================== */

    function normalizeTeam(
      value,
      fallbackName = "Équipe",
      fallbackLogo = ""
    ) {

      const team =
        obj(
          value
        );


      return {

        id:
          idOf(
            team
          ),

        name:
          text(
            team
          ) ||
          fallbackName,

        logo:
          imageOf(
            team
          ) ||
          fallbackLogo ||
          ""

      };

    }


    /* =====================================================
       STATUS
    ===================================================== */

    function statusOf(
      raw
    ) {

      const explicit =
        String(

          first(

            raw?.status_code,

            raw?.short_status,

            raw?.status?.short,

            ""

          ) || ""

        )
          .toUpperCase();


      if (
        explicit
      ) {

        return explicit;

      }


      const statusText =
        String(

          first(

            raw?.status_text,

            raw?.status?.long,

            raw?.status?.description,

            raw?.status,

            ""

          ) || ""

        )
          .toLowerCase();


      if (
        /live|in play|inplay/
          .test(
            statusText
          )
      ) {

        return "LIVE";

      }


      if (
        /half|halftime/
          .test(
            statusText
          )
      ) {

        return "HT";

      }


      if (
        /finish|finished|ended|ft/
          .test(
            statusText
          )
      ) {

        return "FT";

      }


      if (
        /postpon/
          .test(
            statusText
          )
      ) {

        return "PST";

      }


      if (
        /cancel/
          .test(
            statusText
          )
      ) {

        return "CANC";

      }


      return "NS";

    }


    /* =====================================================
       NORMALIZE MATCH
    ===================================================== */

    function normalizeMatch(
      item,
      forcedProvider = null,
      allowStageOnly = false
    ) {

      if (
        !item
      ) {

        return null;

      }


      const raw =

        item?.match &&
        typeof item.match ===
          "object"

          ? item.match

          : item;


      const homeRaw =
        first(

          raw?.home_team,

          raw?.homeTeam,

          raw?.teams?.home,

          raw?.home,

          {}

        );


      const awayRaw =
        first(

          raw?.away_team,

          raw?.awayTeam,

          raw?.teams?.away,

          raw?.away,

          {}

        );


      const homeName =
        text(
          homeRaw
        ) ||
        raw?.home_name ||
        "Domicile";


      const awayName =
        text(
          awayRaw
        ) ||
        raw?.away_name ||
        "Extérieur";


      const competition =
        first(

          raw?.competition,

          raw?.league,

          raw?.tournament,

          raw?.uniqueTournament,

          {}

        );


      const rawLeagueName =
        first(

          text(
            competition
          ),

          raw?.competition_name,

          raw?.league_name,

          ""

        );


      if (

        !allowStageOnly &&

        isStageName(
          rawLeagueName
        )

      ) {

        return null;

      }


      const cleanName =
        cleanLeague(
          rawLeagueName
        );


      const score =
        obj(
          raw?.score
        );


      const homeScore =
        first(

          raw?.home_score,

          raw?.homeScore,

          score?.home,

          score?.fulltime?.home,

          score?.current?.home,

          null

        );


      const awayScore =
        first(

          raw?.away_score,

          raw?.awayScore,

          score?.away,

          score?.fulltime?.away,

          score?.current?.away,

          null

        );


      const slug =

        raw?.slug ||

        raw?.match_slug ||

        item?.slug ||

        item?.match_slug ||

        (

          homeName &&
          awayName

            ? `${slugPart(homeName)}-vs-${slugPart(awayName)}`

            : null

        );


      const provider =
        forcedProvider ||

        raw?.provider ||

        item?.provider ||

        "SportScore";


      return {

        id:
          slug ||
          raw?.id ||
          raw?.match_id ||
          raw?.event_id ||
          null,

        slug,

        provider,

        fixture: {

          id:
            slug ||
            raw?.id ||
            raw?.fixture_id ||
            raw?.event_id ||
            null,

          slug,

          upstreamId:
            raw?.id ||
            raw?.match_id ||
            raw?.fixture_id ||
            raw?.event_id ||
            null,

          date:
            first(

              raw?.time,

              raw?.date,

              raw?.start_time,

              raw?.kickoff,

              null

            ),

          status: {

            short:
              statusOf(
                raw
              ),

            long:
              first(

                raw?.status_text,

                raw?.status?.long,

                raw?.status?.description,

                raw?.status,

                "Match"

              ),

            elapsed:
              first(

                raw?.minute,

                raw?.elapsed,

                raw?.status?.elapsed,

                null

              )

          },

          venue:
            first(
              raw?.venue,
              null
            ),

          referee:
            first(
              raw?.referee,
              null
            ),

          timezone:
            first(
              raw?.timezone,
              null
            )

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
            cleanName,

          country:
            competition?.country ||
            raw?.country ||
            "",

          logo:
            imageOf(
              competition
            ) ||

            raw?.competition_logo ||

            raw?.competitionLogo ||

            raw?.league_logo ||

            raw?.leagueLogo ||

            "",

          round:
            raw?.round ||
            raw?.round_name ||
            null,

          season:
            raw?.season?.name ||
            raw?.season ||
            null

        },


        teams: {

          home:
            normalizeTeam(
              homeRaw,
              homeName
            ),

          away:
            normalizeTeam(
              awayRaw,
              awayName
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
              first(

                score?.halftime?.home,

                score?.ht?.home,

                null

              ),

            away:
              first(

                score?.halftime?.away,

                score?.ht?.away,

                null

              )

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


    /* =====================================================
       GET LIST
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
          body?.fixtures
        )
      ) {

        return body.fixtures;

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
          body?.events
        )
      ) {

        return body.events;

      }


      if (
        Array.isArray(
          body
        )
      ) {

        return body;

      }


      return [];

    }


    /* =====================================================
       SPORTScore DETAILS
    ===================================================== */

    async function getSportScoreDetails(
      slug
    ) {

      let body;


      try {

        body =
          await getJSON(

            `${SPORTSCORE}/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}`

          );

      }

      catch (
        primaryError
      ) {

        try {

          body =
            await getJSON(

              `${WIDGET}/match/?sport=football&slug=${encodeURIComponent(
                slug
              )}`

            );

        }

        catch (
          widgetError
        ) {

          const error =
            widgetError ||
            primaryError;

          error.data =
            error.data ||
            primaryError?.data ||
            null;

          throw error;

        }

      }


      const root =

        body?.match ||

        body?.data?.match ||

        body?.data ||

        body;


      const basic =
        normalizeMatch(
          root,
          "SportScore",
          true
        );


      if (
        !basic
      ) {

        throw new Error(
          "Match introuvable"
        );

      }


      return {

        fixture:
          basic.fixture,

        league:
          basic.league,

        teams:
          basic.teams,

        goals:
          basic.goals,

        score:
          basic.score,

        events:
          arr(

            root?.events ||

            root?.incidents ||

            root?.timeline ||

            root?.match_events

          ),

        lineups:
          arr(

            root?.lineups ||

            root?.lineup ||

            root?.compositions ||

            root?.formations

          ),

        statistics:
          arr(

            root?.statistics ||

            root?.stats

          ),

        players:
          arr(

            root?.players

          ),

        provider:
          "SportScore"

      };

    }


    /* =====================================================
       SOFASCORE LIST
    ===================================================== */

    async function getSofaMatches(
      dateValue
    ) {

      const urls = [

        `${SOFA}/sport/football/scheduled-events/${encodeURIComponent(
          dateValue
        )}`,

        `${SOFA}/sport/football/scheduled-events/${encodeURIComponent(
          dateValue
        )}/inverse`

      ];


      for (
        const url of urls
      ) {

        try {

          const body =
            await getJSON(
              url
            );


          if (
            Array.isArray(
              body?.events
            )
          ) {

            return body.events;

          }

        }

        catch (_) {

          /* try next */

        }

      }


      return [];

    }


    /* =====================================================
       SOFASCORE LIST ADAPTER
    ===================================================== */

    function adaptSofaMatch(
      event
    ) {

      if (
        !event?.id
      ) {

        return null;

      }


      const home =
        event?.homeTeam ||
        {};

      const away =
        event?.awayTeam ||
        {};

      const tournament =
        event?.tournament ||
        {};

      const unique =
        tournament?.uniqueTournament ||
        {};

      const category =
        tournament?.category ||
        {};


      const statusType =
        String(
          event?.status?.type ||
          ""
        ).toLowerCase();


      let status =
        "NS";


      if (
        statusType ===
        "inprogress"
      ) {

        status =
          "LIVE";

      }

      else if (
        statusType ===
        "halftime"
      ) {

        status =
          "HT";

      }

      else if (
        statusType ===
        "finished"
      ) {

        status =
          "FT";

      }

      else if (
        statusType ===
        "postponed"
      ) {

        status =
          "PST";

      }


      const time =
        event?.startTimestamp

          ? new Date(
              Number(
                event.startTimestamp
              ) * 1000
            ).toISOString()

          : null;


      return normalizeMatch(

        {

          id:
            event.id,

          slug:
            `sofa-${event.id}`,

          provider:
            "SofaScore",


          home_team: {

            id:
              home?.id ||
              null,

            name:
              home?.name ||
              home?.shortName ||
              "Domicile",

            logo:
              home?.logo ||

              (

                home?.id

                  ? `${SOFA}/team/${home.id}/image`

                  : ""

              )

          },


          away_team: {

            id:
              away?.id ||
              null,

            name:
              away?.name ||
              away?.shortName ||
              "Extérieur",

            logo:
              away?.logo ||

              (

                away?.id

                  ? `${SOFA}/team/${away.id}/image`

                  : ""

              )

          },


          competition: {

            id:
              unique?.id ||
              tournament?.id ||
              null,

            name:
              unique?.name ||
              tournament?.name ||
              "Football",

            country:
              category?.name ||
              "",

            logo:

              unique?.id

                ? `${SOFA}/unique-tournament/${unique.id}/image`

                : ""

          },


          home_score:
            event?.homeScore?.current ??
            null,

          away_score:
            event?.awayScore?.current ??
            null,

          status_code:
            status,

          status_text:
            event?.status?.description ||
            status,

          time

        },

        "SofaScore"

      );

    }


    /* =====================================================
       SOFASCORE DETAILS
    ===================================================== */

    async function getSofaDetails(
      eventId
    ) {

      const id =
        String(
          eventId || ""
        )
          .replace(
            /^sofa-/i,
            ""
          )
          .trim();


      if (
        !id
      ) {

        throw new Error(
          "SofaScore event ID manquant"
        );

      }


      const eventBody =
        await getJSON(

          `${SOFA}/event/${encodeURIComponent(
            id
          )}`

        );


      const event =
        eventBody?.event;


      if (
        !event?.id
      ) {

        throw new Error(
          "SofaScore match introuvable"
        );

      }


      const results =
        await Promise.allSettled([

          getJSON(

            `${SOFA}/event/${encodeURIComponent(
              id
            )}/incidents`

          ),

          getJSON(

            `${SOFA}/event/${encodeURIComponent(
              id
            )}/lineups`

          ),

          getJSON(

            `${SOFA}/event/${encodeURIComponent(
              id
            )}/statistics`

          )

        ]);


      const incidents =
        results[0].status ===
        "fulfilled"

          ? results[0].value

          : {};

      const lineups =
        results[1].status ===
        "fulfilled"

          ? results[1].value

          : {};

      const statistics =
        results[2].status ===
        "fulfilled"

          ? results[2].value

          : {};


      const home =
        event?.homeTeam ||
        {};

      const away =
        event?.awayTeam ||
        {};

      const tournament =
        event?.tournament ||
        {};

      const unique =
        tournament?.uniqueTournament ||
        {};

      const category =
        tournament?.category ||
        {};


      const homeTeam = {

        id:
          home?.id ||
          null,

        name:
          home?.name ||
          home?.shortName ||
          "Domicile",

        logo:
          home?.logo ||

          (

            home?.id

              ? `${SOFA}/team/${home.id}/image`

              : ""

          )

      };


      const awayTeam = {

        id:
          away?.id ||
          null,

        name:
          away?.name ||
          away?.shortName ||
          "Extérieur",

        logo:
          away?.logo ||

          (

            away?.id

              ? `${SOFA}/team/${away.id}/image`

              : ""

          )

      };


      const type =
        String(
          event?.status?.type ||
          ""
        ).toLowerCase();


      let status =
        "NS";


      if (
        type ===
        "inprogress"
      ) {

        status =
          "LIVE";

      }

      else if (
        type ===
        "halftime"
      ) {

        status =
          "HT";

      }

      else if (
        type ===
        "finished"
      ) {

        status =
          "FT";

      }

      else if (
        type ===
        "postponed"
      ) {

        status =
          "PST";

      }

      else if (
        type ===
          "canceled" ||
        type ===
          "cancelled"
      ) {

        status =
          "CANC";

      }


      const outputLineups = [];


      if (
        lineups?.home
      ) {

        outputLineups.push({

          team:
            homeTeam,

          formation:
            lineups.home
              ?.formation ||
            "—",

          coach:
            lineups.home
              ?.manager?.name ||
            null,

          players:
            arr(
              lineups.home
                ?.players
            ),

          substitutes:
            arr(
              lineups.home
                ?.substitutes
            )

        });

      }


      if (
        lineups?.away
      ) {

        outputLineups.push({

          team:
            awayTeam,

          formation:
            lineups.away
              ?.formation ||
            "—",

          coach:
            lineups.away
              ?.manager?.name ||
            null,

          players:
            arr(
              lineups.away
                ?.players
            ),

          substitutes:
            arr(
              lineups.away
                ?.substitutes
            )

        });

      }


      return {

        fixture: {

          id:
            id,

          slug:
            event?.slug ||
            `sofa-${id}`,

          upstreamId:
            id,

          date:
            event?.startTimestamp

              ? new Date(

                  Number(
                    event.startTimestamp
                  ) * 1000

                ).toISOString()

              : null,

          status: {

            short:
              status,

            long:
              event?.status?.description ||
              "Match",

            elapsed:
              null

          },

          venue:
            event?.venue?.name ||
            null,

          referee:
            event?.referee?.name ||
            null,

          timezone:
            event?.timeZone ||
            null

        },


        league: {

          id:
            unique?.id ||
            tournament?.id ||
            null,

          name:
            cleanLeague(

              unique?.name ||
              tournament?.name ||
              "Football"

            ),

          country:
            category?.name ||
            "",

          logo:

            unique?.id

              ? `${SOFA}/unique-tournament/${unique.id}/image`

              : "",

          round:
            event?.roundInfo?.name ||
            event?.roundInfo?.round ||
            null,

          season:
            event?.season?.name ||
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
            event?.homeScore?.current ??
            null,

          away:
            event?.awayScore?.current ??
            null

        },


        score: {

          home:
            event?.homeScore?.current ??
            null,

          away:
            event?.awayScore?.current ??
            null,

          halftime: {

            home:
              event?.homeScore?.period1 ??
              null,

            away:
              event?.awayScore?.period1 ??
              null

          },

          fulltime: {

            home:
              event?.homeScore?.current ??
              null,

            away:
              event?.awayScore?.current ??
              null

          }

        },


        events:
          arr(
            incidents?.incidents
          ),


        incidents:
          arr(
            incidents?.incidents
          ),


        lineups:
          outputLineups,


        statistics:
          arr(
            statistics?.statistics
          ),


        players:
          [],


        provider:
          "SofaScore"

      };

    }


    /* =====================================================
       ESPN LIST
    ===================================================== */

    async function getESPNMatches(
      dateValue
    ) {

      try {

        const compact =
          String(
            dateValue
          ).replace(
            /-/g,
            ""
          );


        const body =
          await getJSON(

            `${ESPN}/sports/soccer/all/scoreboard?dates=${encodeURIComponent(
              compact
            )}`

          );


        return arr(
          body?.events
        );

      }

      catch (_) {

        return [];

      }

    }


    /* =====================================================
       ESPN ADAPTER
    ===================================================== */

    function adaptESPN(
      event
    ) {

      const competition =
        arr(
          event?.competitions
        )[0];


      const competitors =
        arr(
          competition?.competitors
        );


      const home =
        competitors.find(
          item =>
            item?.homeAway ===
            "home"
        );


      const away =
        competitors.find(
          item =>
            item?.homeAway ===
            "away"
        );


      if (
        !event?.id ||
        !home ||
        !away
      ) {

        return null;

      }


      const leagueName =
        cleanLeague(

          event?.league?.name ||

          event?.competition?.name ||

          event?.season?.displayName ||

          "Football"

        );


      const state =
        String(
          event?.status
            ?.type?.state ||
          ""
        ).toLowerCase();


      const status =
        state ===
          "in"

          ? "LIVE"

          : state ===
            "post"

            ? "FT"

            : "NS";


      return normalizeMatch(

        {

          id:
            event.id,

          slug:
            `espn-${event.id}`,

          provider:
            "ESPN",


          home_team: {

            id:
              home?.team?.id ||
              null,

            name:
              home?.team?.displayName ||
              home?.team?.name ||
              "Domicile",

            logo:
              home?.team?.logo ||

              (

                home?.team?.id

                  ? `https://a.espncdn.com/i/teamlogos/soccer/500/${home.team.id}.png`

                  : ""

              )

          },


          away_team: {

            id:
              away?.team?.id ||
              null,

            name:
              away?.team?.displayName ||
              away?.team?.name ||
              "Extérieur",

            logo:
              away?.team?.logo ||

              (

                away?.team?.id

                  ? `https://a.espncdn.com/i/teamlogos/soccer/500/${away.team.id}.png`

                  : ""

              )

          },


          competition: {

            id:
              event?.league?.id ||
              null,

            name:
              leagueName,

            country:
              "World",

            logo:
              event?.league?.logo ||
              ""

          },


          home_score:
            home?.score !==
              undefined

              ? Number(
                  home.score
                )

              : null,


          away_score:
            away?.score !==
              undefined

              ? Number(
                  away.score
                )

              : null,


          status_code:
            status,

          status_text:
            event?.status
              ?.type
              ?.description ||
            status,

          time:
            event?.date ||
            null

        },

        "ESPN"

      );

    }


    /* =====================================================
       ESPN DETAILS
    ===================================================== */

    async function getESPNDetails(
      eventId
    ) {

      const id =
        String(
          eventId
        )
          .replace(
            /^espn-/i,
            ""
          )
          .trim();


      if (
        !id
      ) {

        throw new Error(
          "ESPN event ID manquant"
        );

      }


      const body =
        await getJSON(

          `${ESPN}/sports/soccer/all/summary?event=${encodeURIComponent(
            id
          )}`

        );


      const header =
        body?.header ||
        {};


      const competition =
        arr(
          header?.competitions
        )[0];


      const competitors =
        arr(
          competition?.competitors
        );


      const home =
        competitors.find(
          item =>
            item?.homeAway ===
            "home"
        );


      const away =
        competitors.find(
          item =>
            item?.homeAway ===
            "away"
        );


      if (
        !home ||
        !away
      ) {

        throw new Error(
          "ESPN match introuvable"
        );

      }


      const homeTeam = {

        id:
          home?.team?.id ||
          null,

        name:
          home?.team?.displayName ||
          home?.team?.name ||
          "Domicile",

        logo:
          home?.team?.logo ||

          (

            home?.team?.id

              ? `https://a.espncdn.com/i/teamlogos/soccer/500/${home.team.id}.png`

              : ""

          )

      };


      const awayTeam = {

        id:
          away?.team?.id ||
          null,

        name:
          away?.team?.displayName ||
          away?.team?.name ||
          "Extérieur",

        logo:
          away?.team?.logo ||

          (

            away?.team?.id

              ? `https://a.espncdn.com/i/teamlogos/soccer/500/${away.team.id}.png`

              : ""

          )

      };


      const state =
        String(
          competition?.status
            ?.type?.state ||
          ""
        ).toLowerCase();


      const status =
        state ===
          "in"

          ? "LIVE"

          : state ===
            "post"

            ? "FT"

            : "NS";


      const homeScore =
        home?.score !==
          undefined

          ? Number(
              home.score
            )

          : null;


      const awayScore =
        away?.score !==
          undefined

          ? Number(
              away.score
            )

          : null;


      const leagueName =
        cleanLeague(

          header?.league?.name ||

          competition?.league?.name ||

          header?.season?.displayName ||

          "Football"

        );


      const events =
        arr(
          body?.plays
        )
          .map(
            play => ({

              time: {

                elapsed:
                  play?.clock
                    ?.displayValue ||
                  null,

                extra:
                  null

              },


              team: {

                id:
                  play?.team?.id ||
                  null,

                name:
                  play?.team
                    ?.displayName ||
                  play?.team?.name ||
                  ""

              },


              player: {

                id:
                  play
                    ?.participants
                    ?.[0]
                    ?.athlete
                    ?.id ||
                  null,

                name:
                  play
                    ?.participants
                    ?.[0]
                    ?.athlete
                    ?.displayName ||
                  ""

              },


              assist: {

                id:
                  play
                    ?.participants
                    ?.[1]
                    ?.athlete
                    ?.id ||
                  null,

                name:
                  play
                    ?.participants
                    ?.[1]
                    ?.athlete
                    ?.displayName ||
                  ""

              },


              type:
                play?.type
                  ?.text ||
                play?.type?.id ||
                "Other",


              detail:
                play?.text ||
                ""

            })

          );


      return {

        fixture: {

          id:
            id,

          slug:
            `espn-${id}`,

          upstreamId:
            id,

          date:
            competition?.date ||
            header
              ?.competitions
              ?.[0]
              ?.date ||
            null,

          status: {

            short:
              status,

            long:
              competition
                ?.status
                ?.type
                ?.description ||
              status,

            elapsed:
              competition
                ?.status
                ?.displayClock ||
              null

          },

          venue:
            competition
              ?.venue
              ?.fullName ||
            competition
              ?.venue
              ?.displayName ||
            null

        },


        league: {

          id:
            header?.league
              ?.id ||
            null,

          name:
            leagueName,

          country:
            "World",

          logo:
            "",

          round:
            null,

          season:
            header?.season
              ?.displayName ||
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
              null,

            away:
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


        incidents:
          events,


        lineups:
          [],


        statistics:
          [],


        players:
          [],


        provider:
          "ESPN"

      };

    }


    /* =====================================================
       THESPORTSDB LIST
    ===================================================== */

    async function getTSDBMatches(
      dateValue
    ) {

      try {

        const body =
          await getJSON(

            `${TSDB}/eventsday.php?d=${encodeURIComponent(
              dateValue
            )}&s=Soccer`

          );


        return arr(
          body?.events
        );

      }

      catch (_) {

        return [];

      }

    }


    /* =====================================================
       THESPORTSDB EVENT
    ===================================================== */

    async function getTSDBEvent(
      eventId
    ) {

      const id =
        String(
          eventId || ""
        )
          .replace(
            /^tsdb-/i,
            ""
          )
          .trim();


      if (
        !id
      ) {

        return null;

      }


      try {

        const body =
          await getJSON(

            `${TSDB}/lookupevent.php?id=${encodeURIComponent(
              id
            )}`

          );


        return (
          arr(
            body?.events
          )[0] ||
          null
        );

      }

      catch (_) {

        return null;

      }

    }


    /* =====================================================
       THESPORTSDB ADAPTER
    ===================================================== */

    function adaptTSDB(
      event
    ) {

      if (
        !event?.idEvent
      ) {

        return null;

      }


      const rawStatus =
        String(

          event?.strStatus ||

          event?.strProgress ||

          ""

        )
          .toLowerCase();


      let status =
        "NS";


      if (
        /finished|ft/
          .test(
            rawStatus
          )
      ) {

        status =
          "FT";

      }

      else if (
        /half|ht/
          .test(
            rawStatus
          )
      ) {

        status =
          "HT";

      }

      else if (
        /live|progress/
          .test(
            rawStatus
          )
      ) {

        status =
          "LIVE";

      }


      const homeScore =
        event?.intHomeScore ===
          "" ||

        event?.intHomeScore ===
          null ||

        event?.intHomeScore ===
          undefined

          ? null

          : Number(
              event.intHomeScore
            );


      const awayScore =
        event?.intAwayScore ===
          "" ||

        event?.intAwayScore ===
          null ||

        event?.intAwayScore ===
          undefined

          ? null

          : Number(
              event.intAwayScore
            );


      return normalizeMatch(

        {

          id:
            `tsdb-${event.idEvent}`,

          slug:
            `tsdb-${event.idEvent}`,

          provider:
            "TheSportsDB",


          home_team: {

            id:
              event?.idHomeTeam ||
              null,

            name:
              event?.strHomeTeam ||
              "Domicile",

            logo:
              event?.strHomeTeamBadge ||
              ""

          },


          away_team: {

            id:
              event?.idAwayTeam ||
              null,

            name:
              event?.strAwayTeam ||
              "Extérieur",

            logo:
              event?.strAwayTeamBadge ||
              ""

          },


          competition: {

            id:
              event?.idLeague ||
              null,

            name:
              event?.strLeague ||
              "Football",

            country:
              event?.strCountry ||
              "",

            logo:
              event?.strLeagueBadge ||
              ""

          },


          home_score:
            homeScore,

          away_score:
            awayScore,

          status_code:
            status,

          status_text:
            event?.strStatus ||
            status,

          time:

            event?.dateEvent &&
            event?.strTime

              ? `${event.dateEvent}T${event.strTime}`

              : event?.dateEvent ||
                null,

          round:
            event?.intRound ||
            null,

          season:
            event?.strSeason ||
            null

        },

        "TheSportsDB"

      );

    }


    /* =====================================================
       THESPORTSDB DETAILS
    ===================================================== */

    async function getTSDBDetails(
      eventId
    ) {

      const event =
        await getTSDBEvent(
          eventId
        );


      if (
        !event
      ) {

        throw new Error(
          "TheSportsDB match introuvable"
        );

      }


      const match =
        adaptTSDB(
          event
        );


      if (
        !match
      ) {

        throw new Error(
          "TheSportsDB match introuvable"
        );

      }


      return {

        ...match,

        fixture: {

          ...match.fixture,

          id:
            String(
              event.idEvent
            ),

          slug:
            `tsdb-${event.idEvent}`,

          upstreamId:
            String(
              event.idEvent
            )

        },

        events:
          [],

        incidents:
          [],

        lineups:
          [],

        statistics:
          [],

        players:
          [],

        provider:
          "TheSportsDB"

      };

    }


    /* =====================================================
       MATCH DETAILS ROUTER
       ONE ROUTER ONLY
    ===================================================== */

    if (
      fixture
    ) {

      const value =
        fixture;


      const lower =
        value.toLowerCase();


      let selectedSource =
        source;


      if (
        !selectedSource
      ) {

        if (
          lower.startsWith(
            "sofa-"
          )
        ) {

          selectedSource =
            "sofascore";

        }

        else if (
          lower.startsWith(
            "espn-"
          )
        ) {

          selectedSource =
            "espn";

        }

        else if (
          lower.startsWith(
            "tsdb-"
          )
        ) {

          selectedSource =
            "thesportsdb";

        }

        else {

          selectedSource =
            "sportscore";

        }

      }


      try {

        let details;


        if (
          selectedSource ===
            "sofa" ||
          selectedSource ===
            "sofascore"
        ) {

          details =
            await getSofaDetails(
              value
            );

        }


        else if (
          selectedSource ===
          "espn"
        ) {

          details =
            await getESPNDetails(
              value
            );

        }


        else if (
          selectedSource ===
            "tsdb" ||
          selectedSource ===
            "thesportsdb"
        ) {

          details =
            await getTSDBDetails(
              value
            );

        }


        else {

          details =
            await getSportScoreDetails(
              value
            );

        }


        return output(

          200,

          {

            data:
              details,

            provider:
              details?.provider ||
              selectedSource

          }

        );

      }


      catch (
        error
      ) {

        console.error(

          "MATCH DETAILS ERROR:",

          {

            fixture:
              value,

            source:
              selectedSource,

            message:
              error?.message

          }

        );


        return output(

          error?.status ||
            502,

          {

            error:
              "Impossible de charger le match",

            details:
              error?.message ||
              null,

            provider:
              selectedSource,

            data:
              []

          }

        );

      }

    }


    /* =====================================================
       LIVE
    ===================================================== */

    if (
      live ===
      "all"
    ) {

      let matches =
        [];


      try {

        const body =
          await getJSON(

            `${SPORTSCORE}/fixtures/?sport=football&status=live&limit=200`

          );


        matches.push(

          ...getMatches(
            body
          )
            .map(
              item =>
                normalizeMatch(
                  item,
                  "SportScore"
                )
            )
            .filter(Boolean)

        );

      }

      catch (_) {}



      try {

        const body =
          await getJSON(

            `${WIDGET}/matches/?sport=football&limit=100`

          );


        matches.push(

          ...getMatches(
            body
          )
            .map(
              item =>
                normalizeMatch(
                  item,
                  "SportScore"
                )
            )
            .filter(Boolean)

        );

      }

      catch (_) {}


      const seen =
        new Set();


      matches =
        matches.filter(
          match => {

            const status =
              String(

                match
                  ?.fixture
                  ?.status
                  ?.short ||

                ""

              )
                .toUpperCase();


            const valid =
              status ===
                "LIVE" ||

              status ===
                "HT" ||

              status.includes(
                "LIVE"
              ) ||

              status.includes(
                "HALF"
              );


            const key =
              String(

                match
                  ?.fixture
                  ?.id ||

                `${norm(
                  match
                    ?.teams
                    ?.home
                    ?.name
                )}__${norm(
                  match
                    ?.teams
                    ?.away
                    ?.name
                )}`

              );


            if (
              !valid
            ) {

              return false;

            }


            if (
              seen.has(
                key
              )
            ) {

              return false;

            }


            seen.add(
              key
            );


            return true;

          }
        );


      return output(

        200,

        {

          data:
            matches,

          provider:
            "BakhiraFoot"

        }

      );

    }


    /* =====================================================
       DATE MATCHES
    ===================================================== */

    const matchDate =
      date ||
      today;


    let matches =
      [];


    /* -----------------------------------------------------
       SPORTScore
    ----------------------------------------------------- */

    try {

      const [

        upcoming,

        finished,

        liveBody

      ] =
        await Promise.all([

          getJSON(

            `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
              matchDate
            )}&status=upcoming&limit=200`

          ),

          getJSON(

            `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
              matchDate
            )}&status=finished&limit=200`

          ),

          getJSON(

            `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
              matchDate
            )}&status=live&limit=200`

          )

        ]);


      matches.push(

        ...getMatches(
          upcoming
        ),

        ...getMatches(
          finished
        ),

        ...getMatches(
          liveBody
        )

      );


      matches =
        matches
          .map(
            item =>
              normalizeMatch(
                item,
                "SportScore"
              )
          )
          .filter(Boolean);


    }

    catch (_) {

      try {

        const fallback =
          await getJSON(

            `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
              matchDate
            )}&limit=100`

          );


        matches =
          getMatches(
            fallback
          )
            .map(
              item =>
                normalizeMatch(
                  item,
                  "SportScore"
                )
            )
            .filter(Boolean);

      }

      catch (_) {}

    }


    /* -----------------------------------------------------
       BOTOLA EXTRA
    ----------------------------------------------------- */

    try {

      const body =
        await getJSON(

          `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
            matchDate
          )}&competition=the-botola-pro&limit=200`

        );


      const botola =
        getMatches(
          body
        )
          .map(
            item =>
              normalizeMatch(
                item,
                "SportScore"
              )
          )
          .filter(Boolean);


      matches.push(
        ...botola
      );

    }

    catch (_) {}


    /* -----------------------------------------------------
       THE SPORTs DB
    ----------------------------------------------------- */

    try {

      const events =
        await getTSDBMatches(
          matchDate
        );


      const tsdbMatches =
        events
          .map(
            adaptTSDB
          )
          .filter(Boolean);


      const existing =
        new Set();


      matches.forEach(
        match => {

          const home =
            norm(
              match
                ?.teams
                ?.home
                ?.name
            );


          const away =
            norm(
              match
                ?.teams
                ?.away
                ?.name
            );


          if (
            home &&
            away
          ) {

            existing.add(

              `teams:${home}__${away}`

            );

          }

        }
      );


      for (
        const match of
          tsdbMatches
      ) {

        const home =
          norm(
            match
              ?.teams
              ?.home
              ?.name
          );


        const away =
          norm(
            match
              ?.teams
              ?.away
              ?.name
          );


        const key =
          `teams:${home}__${away}`;


        if (
          home &&
          away &&
          !existing.has(
            key
          )
        ) {

          matches.push(
            match
          );


          existing.add(
            key
          );

        }

      }

    }

    catch (_) {}


    /* -----------------------------------------------------
       SOFASCORE
    ----------------------------------------------------- */

    try {

      const sofaEvents =
        await getSofaMatches(
          matchDate
        );


      const sofaMatches =
        sofaEvents
          .map(
            adaptSofaMatch
          )
          .filter(Boolean);


      const existing =
        new Set();


      matches.forEach(
        match => {

          const home =
            norm(
              match
                ?.teams
                ?.home
                ?.name
            );


          const away =
            norm(
              match
                ?.teams
                ?.away
                ?.name
            );


          if (
            home &&
            away
          ) {

            existing.add(

              `teams:${home}__${away}`

            );

          }

        }
      );


      for (
        const match of
          sofaMatches
      ) {

        const home =
          norm(
            match
              ?.teams
              ?.home
              ?.name
          );


        const away =
          norm(
            match
              ?.teams
              ?.away
              ?.name
          );


        const key =
          `teams:${home}__${away}`;


        if (
          home &&
          away &&
          !existing.has(
            key
          )
        ) {

          matches.push(
            match
          );


          existing.add(
            key
          );

        }

      }

    }

    catch (_) {}


    /* -----------------------------------------------------
       ESPN
    ----------------------------------------------------- */

    try {

      const espnEvents =
        await getESPNMatches(
          matchDate
        );


      const espnMatches =
        espnEvents
          .map(
            adaptESPN
          )
          .filter(Boolean);


      const existing =
        new Set();


      matches.forEach(
        match => {

          const home =
            norm(
              match
                ?.teams
                ?.home
                ?.name
            );


          const away =
            norm(
              match
                ?.teams
                ?.away
                ?.name
            );


          if (
            home &&
            away
          ) {

            existing.add(

              `teams:${home}__${away}`

            );

          }

        }
      );


      for (
        const match of
          espnMatches
      ) {

        const home =
          norm(
            match
              ?.teams
              ?.home
              ?.name
          );


        const away =
          norm(
            match
              ?.teams
              ?.away
              ?.name
          );


        const key =
          `teams:${home}__${away}`;


        if (
          home &&
          away &&
          !existing.has(
            key
          )
        ) {

          matches.push(
            match
          );


          existing.add(
            key
          );

        }

      }

    }

    catch (_) {}


    /* =====================================================
       FINAL STAGE FILTER
    ===================================================== */

    matches =
      matches.filter(
        match => {

          const league =
            norm(
              match
                ?.league
                ?.name ||
              ""
            );


          return (
            league &&
            !isStageName(
              league
            )
          );

        }
      );


    /* =====================================================
       FINAL DEDUPE
    ===================================================== */

    const seenId =
      new Set();

    const seenGame =
      new Set();

    const uniqueMatches =
      [];


    for (
      const match of
        matches
    ) {

      const provider =
        String(
          match
            ?.provider ||
          "SportScore"
        );


      const id =
        String(

          match
            ?.fixture
            ?.upstreamId ||

          match
            ?.fixture
            ?.id ||

          match
            ?.id ||

          ""

        );


      const home =
        norm(
          match
            ?.teams
            ?.home
            ?.name
        );


      const away =
        norm(
          match
            ?.teams
            ?.away
            ?.name
        );


      const day =
        isoDate(

          match
            ?.fixture
            ?.date ||

          match
            ?.time

        ) ||
        matchDate;


      const league =
        norm(
          match
            ?.league
            ?.name ||
          ""
        );


      const idKey =
        id
          ? `${provider}:${id}`
          : "";


      const gameKey =
        home &&
        away

          ? `${home}__${away}__${day}__${league}`

          : "";


      if (
        idKey &&
        seenId.has(
          idKey
        )
      ) {

        continue;

      }


      if (
        gameKey &&
        seenGame.has(
          gameKey
        )
      ) {

        continue;

      }


      if (
        idKey
      ) {

        seenId.add(
          idKey
        );

      }


      if (
        gameKey
      ) {

        seenGame.add(
          gameKey
        );

      }


      uniqueMatches.push(
        match
      );

    }


    /* =====================================================
       RESPONSE
    ===================================================== */

    return output(

      200,

      {

        data:
          uniqueMatches,

        provider:
          "BakhiraFoot"

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


    return res
      .status(
        error?.status ||
          500
      )
      .json({

        error:
          error?.message ||
          "API request failed",

        details:
          error?.data ||
          null,

        data:
          []

      });

  }

};
