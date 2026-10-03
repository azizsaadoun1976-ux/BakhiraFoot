/* =========================================================
   BAKHIRAFOOT PRO API
   SPORTScore + SofaScore + ESPN + TheSportsDB
   LIVE + DATE + MATCH DETAILS
   SCORE + EVENTS + LINEUPS + STATS
   ========================================================= */

module.exports = async (req, res) => {
  try {
    const live =
      req?.query?.live || "";

    const date =
      req?.query?.date || "";

    const fixture =
      req?.query?.fixture || "";

    const requestedSource =
      String(
        req?.query?.source || ""
      )
        .trim()
        .toLowerCase();

    const SPORTSCORE =
      "https://sportscore.com/api/v1";

    const WIDGET =
      "https://sportscore.com/api/widget";

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
       GENERIC FETCH
    ===================================================== */

    async function getJSON(
      url
    ) {
      console.log(
        "API REQUEST:",
        url
      );

      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () => controller.abort(),
          15000
        );

      try {
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
          timeout
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
        return value.trim();
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
          value.displayName ||
          value.shortName ||
          value.title ||
          value.label ||
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
          value.id ??
          value.team_id ??
          value.player_id ??
          value.fixture_id ??
          value.event_id ??
          null
        );
      }

      return null;
    }

    function first(
      ...values
    ) {
      for (
        const value of values
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
      return norm(
        value
      ).replace(
        /\s+/g,
        "-"
      );
    }

    function nameOf(value) {
      return text(value);
    }

    function imageOf(value) {
      if (
        !value ||
        typeof value !==
          "object"
      ) {
        return "";
      }

      return (
        value.picture ||
        value.image ||
        value.photo ||
        value.avatar ||
        value.logo ||
        value.icon ||
        value.image_url ||
        value.imageUrl ||
        value.logo_url ||
        value.logoUrl ||
        value.image_path ||
        value.imagePath ||
        value.logo_path ||
        value.logoPath ||
        value.badge ||
        value.badge_url ||
        value.badgeUrl ||
        value.strBadge ||
        value.strBadgeLogo ||
        value.strLeagueBadge ||
        value.strHomeTeamBadge ||
        value.strAwayTeamBadge ||
        value.team_logo ||
        value.teamLogo ||
        ""
      );
    }

    function toISODate(
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
          String(value).trim()
        )
      ) {
        const number =
          Number(value);

        const ms =
          number < 10000000000
            ? number * 1000
            : number;

        const d =
          new Date(ms);

        return Number.isNaN(
          d.getTime()
        )
          ? null
          : d
              .toISOString()
              .split("T")[0];
      }

      const str =
        String(value).trim();

      const direct =
        str.match(
          /^(\d{4}-\d{2}-\d{2})/
        );

      if (direct) {
        return direct[1];
      }

      const d =
        new Date(str);

      return Number.isNaN(
        d.getTime()
      )
        ? null
        : d
            .toISOString()
            .split("T")[0];
    }

    function normalizeTeam(
      team,
      fallbackName = "Équipe",
      fallbackLogo = ""
    ) {
      const raw =
        obj(team);

      return {
        id:
          idOf(raw),

        name:
          nameOf(raw) ||
          raw.name ||
          fallbackName ||
          "Équipe",

        logo:
          imageOf(raw) ||
          fallbackLogo ||
          ""
      };
    }

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
          body?.data?.matches
        )
      ) {
        return body.data.matches;
      }

      if (
        Array.isArray(
          body?.data?.fixtures
        )
      ) {
        return body.data.fixtures;
      }

      if (
        Array.isArray(body)
      ) {
        return body;
      }

      return [];
    }

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

      return body || null;
    }

    /* =====================================================
       SOURCE DETECTION
    ===================================================== */

    function inferSource(
      fixtureValue,
      requested
    ) {
      const value =
        String(
          fixtureValue || ""
        )
          .trim()
          .toLowerCase();

      if (
        requested ===
          "sofascore" ||
        requested ===
          "sofa"
      ) {
        return "sofascore";
      }

      if (
        requested ===
          "thesportsdb" ||
        requested ===
          "tsdb"
      ) {
        return "thesportsdb";
      }

      if (
        requested ===
          "espn"
      ) {
        return "espn";
      }

      if (
        requested ===
          "sportscore"
      ) {
        return "sportscore";
      }

      if (
        value.startsWith(
          "sofa-"
        )
      ) {
        return "sofascore";
      }

      if (
        value.startsWith(
          "tsdb-"
        )
      ) {
        return "thesportsdb";
      }

      if (
        value.startsWith(
          "espn-"
        )
      ) {
        return "espn";
      }

      return "sportscore";
    }

    /* =====================================================
       SPORTSSCORE NORMALIZE MATCH
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
        nameOf(homeRaw) ||
        raw?.home_name ||
        "Domicile";

      const awayName =
        nameOf(awayRaw) ||
        raw?.away_name ||
        "Extérieur";

      const homeLogo =
        imageOf(homeRaw) ||
        imageOf(raw?.home) ||
        imageOf(
          raw?.homeTeam
        ) ||
        raw?.home_logo ||
        raw?.homeLogo ||
        raw?.home_logo_url ||
        "";

      const awayLogo =
        imageOf(awayRaw) ||
        imageOf(raw?.away) ||
        imageOf(
          raw?.awayTeam
        ) ||
        raw?.away_logo ||
        raw?.awayLogo ||
        raw?.away_logo_url ||
        "";

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
        obj(raw?.score);

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

      let statusShort =
        first(
          raw?.status_code,
          raw?.short_status,
          raw?.status?.short,
          ""
        );

      const statusText =
        String(
          first(
            raw?.status_text,
            raw?.status?.long,
            raw?.status,
            ""
          )
        ).toLowerCase();

      if (!statusShort) {

        if (
          /live|in play|inplay/.test(
            statusText
          )
        ) {
          statusShort =
            "LIVE";
        }

        else if (
          /half|ht|halftime/.test(
            statusText
          )
        ) {
          statusShort =
            "HT";
        }

        else if (
          /finish|ended|finished|ft/.test(
            statusText
          )
        ) {
          statusShort =
            "FT";
        }

        else if (
          /postpon/.test(
            statusText
          )
        ) {
          statusShort =
            "PST";
        }

        else if (
          /cancel/.test(
            statusText
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

      const competition =
        first(
          raw?.competition,
          raw?.league,
          raw?.tournament,
          raw?.uniqueTournament,
          {}
        );

      const provider =
        raw?.provider ||
        item?.provider ||
        "SportScore";

      return {

        id:
          slug ||
          raw?.id ||
          raw?.match_id ||
          null,

        slug,

        provider,

        fixture: {

          id:
            slug ||
            raw?.id ||
            raw?.match_id ||
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
              statusShort,

            long:
              first(
                raw?.status_text,
                raw?.status?.long,
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
            nameOf(
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
            imageOf(
              competition
            ) ||
            imageOf(
              raw?.league
            ) ||
            imageOf(
              raw?.tournament
            ) ||
            imageOf(
              raw?.uniqueTournament
            ) ||
            raw?.competition_logo ||
            raw?.competitionLogo ||
            raw?.competition_logo_url ||
            raw?.league_logo ||
            raw?.leagueLogo ||
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
       SOFASCORE LIST
    ===================================================== */

    async function getSofaWorldMatches(
      dateValue
    ) {

      const sofaUrls = [

        `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${encodeURIComponent(
          dateValue
        )}/inverse`,

        `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${encodeURIComponent(
          dateValue
        )}`,

        `https://www.sofascore.com/api/v1/sport/football/scheduled-events/${encodeURIComponent(
          dateValue
        )}/inverse`,

        `https://www.sofascore.com/api/v1/sport/football/scheduled-events/${encodeURIComponent(
          dateValue
        )}`
      ];

      for (
        const url of sofaUrls
      ) {

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
                  "no-store"
              }
            );

          if (
            !response.ok
          ) {
            continue;
          }

          const data =
            await response.json();

          if (
            Array.isArray(
              data?.events
            )
          ) {

            console.log(
              "SOFASCORE WORLD:",
              data.events.length
            );

            return [
              ...data.events
            ];
          }

        }

        catch (error) {

          console.warn(
            "SOFASCORE WORLD ERROR:",
            error.message
          );

        }
      }

      /* ===================================================
         ESPN FALLBACK
      =================================================== */

      try {

        const compactDate =
          String(
            dateValue || ""
          ).replace(
            /-/g,
            ""
          );

        const url =
          `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${encodeURIComponent(
            compactDate
          )}`;

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

        if (
          !response.ok
        ) {
          return [];
        }

        const data =
          await response.json();

        return Array.isArray(
          data?.events
        )
          ? data.events
          : [];

      }

      catch (error) {

        console.warn(
          "ESPN WORLD ERROR:",
          error.message
        );

        return [];
      }
    }

    /* =====================================================
       SOFASCORE LIST ADAPTER
    ===================================================== */

    function adaptSofaWorldMatch(
      event
    ) {

      if (
        !event ||
        typeof event !==
          "object"
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

      const uniqueTournament =
        tournament?.uniqueTournament ||
        {};

      const category =
        tournament?.category ||
        {};

      let status =
        "NS";

      const statusType =
        String(
          event?.status?.type ||
          ""
        ).toLowerCase();

      if (
        statusType ===
        "inprogress"
      ) {
        status =
          "LIVE";
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
        "halftime"
      ) {
        status =
          "HT";
      }

      else if (
        statusType ===
          "postponed" ||
        statusType ===
          "postponed"
      ) {
        status =
          "PST";
      }

      else if (
        statusType ===
          "canceled" ||
        statusType ===
          "cancelled"
      ) {
        status =
          "CANC";
      }

      const startTimestamp =
        Number(
          event?.startTimestamp
        );

      const matchDate =
        Number.isFinite(
          startTimestamp
        )
          ? new Date(
              startTimestamp *
                1000
            ).toISOString()
          : null;

      const homeScore =
        event?.homeScore?.current ??
        event?.homeScore?.normaltime ??
        null;

      const awayScore =
        event?.awayScore?.current ??
        event?.awayScore?.normaltime ??
        null;

      return {

        id:
          event?.id ||
          null,

        slug:
          event?.slug ||
          `sofa-${event?.id || ""}`,

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
                ? `https://api.sofascore.com/api/v1/team/${home.id}/image`
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
                ? `https://api.sofascore.com/api/v1/team/${away.id}/image`
                : ""
            )
        },

        competition: {

          id:
            uniqueTournament?.id ||
            tournament?.id ||
            null,

          name:
            uniqueTournament?.name ||
            tournament?.name ||
            "Football",

          country:
            category?.name ||
            "",

          logo:
            uniqueTournament?.id
              ? `https://api.sofascore.com/api/v1/unique-tournament/${uniqueTournament.id}/image`
              : ""
        },

        home_score:
          homeScore,

        away_score:
          awayScore,

        status,

        status_text:
          event?.status?.description ||
          status,

        time:
          matchDate
      };
    }

    /* =====================================================
       THE SPORTs DB - DAY MATCHES
    ===================================================== */

    async function getTheSportsDBDayMatches(
      dateValue
    ) {

      const matchDate =
        String(
          dateValue || ""
        ).slice(0, 10);

      if (
        !matchDate
      ) {
        return [];
      }

      const url =
        `https://www.thesportsdb.com/api/v1/json/123/eventsday.php` +
        `?d=${encodeURIComponent(
          matchDate
        )}` +
        `&s=Soccer`;

      try {

        const response =
          await fetch(
            url,
            {
              method:
                "GET",

              headers: {
                Accept:
                  "application/json"
              },

              cache:
                "no-store"
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        return Array.isArray(
          data?.events
        )
          ? data.events
          : [];

      }

      catch (error) {

        console.warn(
          "THESPORTSDB DAY ERROR:",
          error.message
        );

        return [];
      }
    }

    /* =====================================================
       THE SPORTs DB - ONE EVENT
    ===================================================== */

    async function getTheSportsDBEvent(
      eventId
    ) {

      const id =
        String(
          eventId || ""
        ).trim();

      if (
        !id
      ) {
        return null;
      }

      try {

        const response =
          await fetch(
            `https://www.thesportsdb.com/api/v1/json/123/lookupevent.php?id=${encodeURIComponent(
              id
            )}`,
            {
              method:
                "GET",

              headers: {
                Accept:
                  "application/json"
              },

              cache:
                "no-store"
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            `TheSportsDB HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        return (
          Array.isArray(
            data?.events
          ) &&
          data.events.length
            ? data.events[0]
            : null
        );

      }

      catch (error) {

        console.warn(
          "THESPORTSDB EVENT ERROR:",
          error.message
        );

        return null;
      }
    }

    /* =====================================================
       FIND TSDB EVENT
    ===================================================== */

    async function findTheSportsDBEvent(
      homeName,
      awayName,
      matchDate
    ) {

      const home =
        String(
          homeName || ""
        )
          .trim()
          .replace(
            /\s+/g,
            "_"
          );

      const away =
        String(
          awayName || ""
        )
          .trim()
          .replace(
            /\s+/g,
            "_"
          );

      const dateValue =
        String(
          matchDate || ""
        ).slice(
          0,
          10
        );

      if (
        !home ||
        !away ||
        !dateValue
      ) {
        return null;
      }

      const eventName =
        `${home}_vs_${away}`;

      const url =
        `https://www.thesportsdb.com/api/v1/json/123/searchevents.php?e=${encodeURIComponent(
          eventName
        )}&d=${encodeURIComponent(
          dateValue
        )}`;

      try {

        const response =
          await fetch(
            url,
            {
              method:
                "GET",

              headers: {
                Accept:
                  "application/json"
              },

              cache:
                "no-store"
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            `TheSportsDB HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        if (
          !Array.isArray(
            data?.event
          )
        ) {
          return null;
        }

        return (
          data.event[0] ||
          null
        );

      }

      catch (error) {

        console.warn(
          "THESPORTSDB SEARCH ERROR:",
          error.message
        );

        return null;
      }
    }

    /* =====================================================
       THE SPORTs DB MATCH ADAPTER
    ===================================================== */

    function adaptTheSportsDBMatch(
      event
    ) {

      if (!event) {
        return null;
      }

      const eventId =
        event?.idEvent ||
        "";

      const homeName =
        event?.strHomeTeam ||
        "Domicile";

      const awayName =
        event?.strAwayTeam ||
        "Extérieur";

      let homeScore =
        event?.intHomeScore;

      let awayScore =
        event?.intAwayScore;

      if (
        homeScore === "" ||
        homeScore === null ||
        homeScore ===
          undefined
      ) {
        homeScore =
          null;
      }
      else {
        homeScore =
          Number(
            homeScore
          );
      }

      if (
        awayScore === "" ||
        awayScore === null ||
        awayScore ===
          undefined
      ) {
        awayScore =
          null;
      }
      else {
        awayScore =
          Number(
            awayScore
          );
      }

      const rawStatus =
        String(
          event?.strStatus ||
          event?.strProgress ||
          ""
        ).toLowerCase();

      let status =
        "NS";

      if (
        rawStatus.includes(
          "finished"
        ) ||
        rawStatus ===
          "ft"
      ) {
        status =
          "FT";
      }

      else if (
        rawStatus.includes(
          "half"
        ) ||
        rawStatus ===
          "ht"
      ) {
        status =
          "HT";
      }

      else if (
        rawStatus.includes(
          "live"
        ) ||
        rawStatus.includes(
          "progress"
        )
      ) {
        status =
          "LIVE";
      }

      return {

        id:
          `tsdb-${eventId}`,

        slug:
          `tsdb-${eventId}`,

        provider:
          "TheSportsDB",

        fixture: {

          id:
            `tsdb-${eventId}`,

          slug:
            `tsdb-${eventId}`,

          upstreamId:
            eventId,

          date:
            event?.dateEvent &&
            event?.strTime
              ? `${event.dateEvent}T${event.strTime}`
              : event?.dateEvent ||
                null,

          status: {

            short:
              status,

            long:
              event?.strStatus ||
              status,

            elapsed:
              null
          },

          venue:
            event?.strVenue ||
            null
        },

        league: {

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
            "",

          round:
            null,

          season:
            event?.strSeason ||
            null
        },

        teams: {

          home: {

            id:
              event?.idHomeTeam ||
              null,

            name:
              homeName,

            logo:
              event?.strHomeTeamBadge ||
              ""
          },

          away: {

            id:
              event?.idAwayTeam ||
              null,

            name:
              awayName,

            logo:
              event?.strAwayTeamBadge ||
              ""
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
        }
      };
    }

    /* =====================================================
       PLAYER NORMALIZATION
    ===================================================== */

    function normalizePlayer(
      row,
      forcedTeam = null,
      forcedSubstitute = false
    ) {

      const wrapper =
        obj(row);

      const raw =
        obj(
          wrapper?.player ||
          wrapper
        );

      const teamRaw =
        first(
          wrapper?.team,
          wrapper?.club,
          raw?.team,
          raw?.club,
          forcedTeam,
          {}
        );

      const name =
        first(
          raw?.name,
          raw?.full_name,
          raw?.fullName,
          wrapper?.name,
          wrapper?.player_name,
          "Joueur"
        );

      const number =
        first(
          wrapper?.shirtNumber,
          wrapper?.shirt_number,
          wrapper?.jerseyNumber,
          wrapper?.jersey,
          wrapper?.number,
          raw?.shirtNumber,
          raw?.shirt_number,
          raw?.jerseyNumber,
          raw?.jersey,
          raw?.number,
          null
        );

      const position =
        first(
          wrapper?.position,
          wrapper?.pos,
          wrapper?.role,
          raw?.position,
          raw?.pos,
          raw?.role,
          ""
        );

      const grid =
        first(
          wrapper?.grid,
          wrapper?.position_grid,
          wrapper?.positionGrid,
          raw?.grid,
          raw?.position_grid,
          raw?.positionGrid,
          ""
        );

      const rating =
        first(
          wrapper?.rating,
          wrapper?.performance?.rating,
          wrapper?.statistics?.rating,
          raw?.rating,
          raw?.performance?.rating,
          raw?.statistics?.rating,
          null
        );

      return {

        player: {

          id:
            first(
              raw?.id,
              wrapper?.player_id,
              wrapper?.id,
              null
            ),

          name,

          number,

          pos:
            position,

          position,

          grid,

          x:
            first(
              wrapper?.x,
              raw?.x,
              null
            ),

          y:
            first(
              wrapper?.y,
              raw?.y,
              null
            ),

          photo:
            imageOf(raw) ||
            imageOf(wrapper) ||
            "",

          team:
            normalizeTeam(
              teamRaw,
              "Équipe",
              ""
            )
        },

        rating,

        games: {

          rating,

          minutes:
            first(
              wrapper?.minutes,
              wrapper?.minutesPlayed,
              raw?.minutes,
              null
            ),

          position,

          substitute:
            forcedSubstitute ||
            wrapper?.substitute ===
              true ||
            wrapper?.starter ===
              false,

          captain:
            wrapper?.captain ===
              true ||
            raw?.captain ===
              true
        },

        goals: {

          total:
            Number(
              first(
                wrapper?.goals?.total,
                wrapper?.goals,
                raw?.goals?.total,
                raw?.goals,
                0
              )
            ) || 0,

          assists:
            Number(
              first(
                wrapper?.goals?.assists,
                wrapper?.assists,
                raw?.goals?.assists,
                raw?.assists,
                0
              )
            ) || 0
        },

        cards: {

          yellow:
            Number(
              first(
                wrapper?.cards?.yellow,
                wrapper?.yellow,
                raw?.cards?.yellow,
                raw?.yellow,
                0
              )
            ) || 0,

          red:
            Number(
              first(
                wrapper?.cards?.red,
                wrapper?.red,
                raw?.cards?.red,
                raw?.red,
                0
              )
            ) || 0
        },

        passes: {

          key:
            Number(
              first(
                wrapper?.passes?.key,
                wrapper?.key_passes,
                raw?.passes?.key,
                0
              )
            ) || 0
        },

        shots: {

          total:
            Number(
              first(
                wrapper?.shots?.total,
                wrapper?.shots,
                raw?.shots?.total,
                0
              )
            ) || 0,

          on:
            Number(
              first(
                wrapper?.shots?.on,
                wrapper?.shots_on_target,
                raw?.shots?.on,
                0
              )
            ) || 0
        },

        raw:
          row
      };
    }

    function isPlayerLike(
      value
    ) {
      if (
        !value ||
        typeof value !==
          "object"
      ) {
        return false;
      }

      return !!first(
        value?.player?.name,
        value?.name,
        value?.full_name,
        value?.player_name,
        value?.number,
        value?.shirtNumber,
        value?.shirt_number,
        value?.position,
        value?.pos,
        null
      );
    }

    function arrayFrom(
      value
    ) {

      if (
        Array.isArray(
          value
        )
      ) {
        return value;
      }

      if (
        value &&
        typeof value ===
          "object"
      ) {

        for (
          const key of [
            "players",
            "items",
            "list",
            "data",
            "xi",
            "startXI",
            "startingXI",
            "starters"
          ]
        ) {

          if (
            Array.isArray(
              value[key]
            )
          ) {
            return value[key];
          }
        }
      }

      return [];
    }

    /* =====================================================
       LINEUPS
    ===================================================== */

    function normalizeLineup(
      source,
      team,
      fallbackFormation = "—"
    ) {

      if (
        source === null ||
        source ===
          undefined
      ) {
        return null;
      }

      let raw =
        source;

      if (
        Array.isArray(source)
      ) {

        raw = {
          players:
            source
        };

      }
      else if (
        typeof source !==
          "object"
      ) {
        return null;
      }

      const formationValue =
        first(
          raw?.formation,
          raw?.tacticalFormation,
          raw?.formationUsed,
          raw?.tactics?.formation,
          fallbackFormation,
          "—"
        );

      const formation =
        typeof formationValue ===
          "object"
          ? first(
              formationValue?.name,
              formationValue?.value,
              formationValue?.formation,
              "—"
            )
          : formationValue;

      const starters =
        arrayFrom(
          first(
            raw?.startXI,
            raw?.startingXI,
            raw?.starting_xi,
            raw?.startingLineup,
            raw?.starters,
            raw?.xi,
            raw?.players,
            []
          )
        );

      const substitutes =
        arrayFrom(
          first(
            raw?.substitutes,
            raw?.subs,
            raw?.bench,
            raw?.players_substitutes,
            []
          )
        );

      const startXI =
        starters
          .filter(
            isPlayerLike
          )
          .map(
            p =>
              normalizePlayer(
                p,
                team,
                false
              )
          )
          .slice(
            0,
            11
          );

      const subs =
        substitutes
          .filter(
            isPlayerLike
          )
          .map(
            p =>
              normalizePlayer(
                p,
                team,
                true
              )
          );

      return {

        team:
          normalizeTeam(
            first(
              raw?.team,
              team,
              {}
            ),
            team?.name ||
              "Équipe",
            team?.logo ||
              ""
          ),

        formation:
          String(
            formation ||
              "—"
          ),

        coach:
          first(
            raw?.coach,
            raw?.manager,
            null
          ),

        startXI,

        substitutes:
          subs
      };
    }

    function getLineups(
      root,
      homeTeam,
      awayTeam
    ) {

      const source =
        first(
          root?.lineups,
          root?.lineup,
          root?.compositions,
          root?.formations,
          null
        );

      const result =
        [];

      if (
        source &&
        typeof source ===
          "object" &&
        !Array.isArray(
          source
        )
      ) {

        const homeRaw =
          first(
            source?.home,
            source?.homeTeam,
            source?.home_lineup,
            source?.homeXI,
            source?.home_startingXI,
            null
          );

        const awayRaw =
          first(
            source?.away,
            source?.awayTeam,
            source?.away_lineup,
            source?.awayXI,
            source?.away_startingXI,
            null
          );

        const home =
          homeRaw
            ? normalizeLineup(
                homeRaw,
                homeTeam
              )
            : null;

        const away =
          awayRaw
            ? normalizeLineup(
                awayRaw,
                awayTeam
              )
            : null;

        if (home) {
          result.push(
            home
          );
        }

        if (away) {
          result.push(
            away
          );
        }
      }

      return result.slice(
        0,
        2
      );
    }

    function buildPlayers(
      lineups
    ) {
      return arr(
        lineups
      ).map(
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
       EVENTS
    ===================================================== */

    function normalizeEvent(
      event
    ) {

      const raw =
        obj(event);

      const rawType =
        first(
          raw?.type,
          raw?.incidentType,
          raw?.event_type,
          raw?.kind,
          "Other"
        );

      const detail =
        first(
          raw?.detail,
          raw?.incidentClass,
          raw?.reason,
          raw?.description,
          raw?.text,
          ""
        );

      const typeNorm =
        norm(
          rawType
        );

      const detailNorm =
        norm(
          detail
        );

      let kind =
        "other";

      if (
        typeNorm.includes(
          "goal"
        ) ||
        detailNorm.includes(
          "goal"
        ) ||
        raw?.goal
      ) {
        kind =
          "goal";
      }

      else if (
        typeNorm.includes(
          "second yellow"
        ) ||
        detailNorm.includes(
          "second yellow"
        ) ||
        typeNorm.includes(
          "red"
        ) ||
        detailNorm.includes(
          "red"
        )
      ) {
        kind =
          "red";
      }

      else if (
        typeNorm.includes(
          "yellow"
        ) ||
        detailNorm.includes(
          "yellow"
        ) ||
        typeNorm.includes(
          "card"
        ) ||
        detailNorm.includes(
          "card"
        )
      ) {
        kind =
          "yellow";
      }

      else if (
        typeNorm.includes(
          "subst"
        ) ||
        typeNorm.includes(
          "change"
        ) ||
        raw?.player_in ||
        raw?.playerOut ||
        raw?.player_out ||
        raw?.playerIn
      ) {
        kind =
          "substitution";
      }

      else if (
        typeNorm.includes(
          "var"
        ) ||
        detailNorm.includes(
          "var"
        )
      ) {
        kind =
          "var";
      }

      const playerRaw =
        first(
          raw?.player,
          raw?.player_name,
          raw?.scorer,
          raw?.goalscorer,
          ""
        );

      const assistRaw =
        first(
          raw?.assist,
          raw?.assist1,
          raw?.assist_name,
          ""
        );

      const inRaw =
        first(
          raw?.player_in,
          raw?.playerIn,
          raw?.incoming,
          raw?.in_player,
          raw?.substitute,
          raw?.sub_in,
          ""
        );

      const outRaw =
        first(
          raw?.player_out,
          raw?.playerOut,
          raw?.outgoing,
          raw?.out_player,
          raw?.replaced,
          raw?.sub_out,
          ""
        );

      const teamRaw =
        first(
          raw?.team,
          raw?.club,
          {}
        );

      let minute =
        first(
          raw?.time?.elapsed,

          typeof raw?.time ===
            "number"
            ? raw.time
            : null,

          raw?.minute,
          raw?.elapsed,
          raw?.clock?.displayValue,
          null
        );

      if (
        typeof minute ===
          "string"
      ) {
        const match =
          minute.match(
            /\d+/
          );

        minute =
          match
            ? Number(
                match[0]
              )
            : minute;
      }

      const extra =
        first(
          raw?.time?.extra,
          raw?.addedTime,
          raw?.extra,
          null
        );

      return {

        time: {

          elapsed:
            minute,

          extra
        },

        minute,

        extra,

        team: {

          id:
            first(
              teamRaw?.id,
              raw?.team_id,
              raw?.teamId,
              raw?.club_id,
              null
            ),

          name:
            first(
              nameOf(
                teamRaw
              ),
              raw?.team_name,
              raw?.teamName,
              raw?.club_name,
              raw?.isHome ===
                true
                ? "home"
                : raw?.isHome ===
                  false
                  ? "away"
                  : "",
              ""
            )
        },

        player: {

          id:
            first(
              playerRaw?.id,
              raw?.player_id,
              raw?.playerId,
              null
            ),

          name:
            text(
              playerRaw
            )
        },

        assist: {

          id:
            first(
              assistRaw?.id,
              raw?.assist_id,
              raw?.assistId,
              null
            ),

          name:
            text(
              assistRaw
            )
        },

        type:
          String(
            rawType ||
              "Other"
          ),

        detail:
          String(
            detail ||
              ""
          ),

        kind,

        playerIn:
          text(
            inRaw
          ),

        playerOut:
          text(
            outRaw
          )
      };
    }

    function normalizeEvents(
      root
    ) {

      const source =
        first(
          root?.events,
          root?.incidents,
          root?.timeline,
          root?.match_events,
          root?.match?.events,
          []
        );

      return arr(
        source
      )
        .map(
          normalizeEvent
        )
        .filter(
          event =>
            event.minute !==
              null ||
            event.type ||
            event.detail
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
        first(
          root?.statistics,
          root?.stats,
          []
        );

      if (
        Array.isArray(source) &&
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

        const homeStats =
          [];

        const awayStats =
          [];

        arr(
          all?.groups
        ).forEach(
          group => {

            arr(
              group?.statisticsItems
            ).forEach(
              item => {

                const name =
                  first(
                    item?.name,
                    item?.key,
                    "Stat"
                  );

                homeStats.push({
                  type:
                    name,

                  value:
                    first(
                      item?.home,
                      item?.homeValue,
                      "-"
                    )
                });

                awayStats.push({
                  type:
                    name,

                  value:
                    first(
                      item?.away,
                      item?.awayValue,
                      "-"
                    )
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

      if (
        Array.isArray(source) &&
        source.length >= 2
      ) {

        return source
          .slice(
            0,
            2
          )
          .map(
            (
              block,
              index
            ) => ({
              team:
                index ===
                0
                  ? homeTeam
                  : awayTeam,

              statistics:
                arr(
                  block?.statistics ||
                  block?.stats
                ).map(
                  stat => ({
                    type:
                      first(
                        stat?.type,
                        stat?.name,
                        "Stat"
                      ),

                    value:
                      first(
                        stat?.value,
                        "-"
                      )
                  })
                )
            })
          );
      }

      return [];
    }

    /* =====================================================
       SOFASCORE DETAILS
    ===================================================== */

    async function getSofaScoreDetails(
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

      if (!id) {
        throw new Error(
          "SofaScore event ID manquant"
        );
      }

      const [
        eventBody,
        incidentsBody,
        lineupsBody,
        statisticsBody
      ] =
        await Promise.all([
          getJSON(
            `https://api.sofascore.com/api/v1/event/${encodeURIComponent(
              id
            )}`
          ),

          getJSON(
            `https://api.sofascore.com/api/v1/event/${encodeURIComponent(
              id
            )}/incidents`
          ),

          getJSON(
            `https://api.sofascore.com/api/v1/event/${encodeURIComponent(
              id
            )}/lineups`
          ),

          getJSON(
            `https://api.sofascore.com/api/v1/event/${encodeURIComponent(
              id
            )}/statistics`
          )
        ]);

      const event =
        eventBody?.event ||
        {};

      const home =
        event?.homeTeam ||
        {};

      const away =
        event?.awayTeam ||
        {};

      const tournament =
        event?.tournament ||
        {};

      const uniqueTournament =
        tournament?.uniqueTournament ||
        {};

      const category =
        tournament?.category ||
        {};

      const homeTeam =
        normalizeTeam(
          {
            id:
              home?.id,

            name:
              home?.name ||
              home?.shortName,

            logo:
              home?.logo ||
              (
                home?.id
                  ? `https://api.sofascore.com/api/v1/team/${home.id}/image`
                  : ""
              )
          },
          "Domicile"
        );

      const awayTeam =
        normalizeTeam(
          {
            id:
              away?.id,

            name:
              away?.name ||
              away?.shortName,

            logo:
              away?.logo ||
              (
                away?.id
                  ? `https://api.sofascore.com/api/v1/team/${away.id}/image`
                  : ""
              )
          },
          "Extérieur"
        );

      let status =
        "NS";

      const type =
        String(
          event?.status?.type ||
            ""
        ).toLowerCase();

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

      const lineups = [];

      if (
        lineupsBody?.home
      ) {

        const players =
          arr(
            lineupsBody.home
              .players
          );

        lineups.push({

          team:
            homeTeam,

          formation:
            lineupsBody.home
              .formation ||
            "—",

          coach:
            lineupsBody.home
              ?.manager?.name ||
            null,

          startXI:
            players
              .filter(
                player =>
                  player?.substitute !==
                  true
              )
              .slice(
                0,
                11
              )
              .map(
                player =>
                  normalizePlayer(
                    player,
                    homeTeam,
                    false
                  )
              ),

          substitutes:
            players
              .filter(
                player =>
                  player?.substitute ===
                  true
              )
              .map(
                player =>
                  normalizePlayer(
                    player,
                    homeTeam,
                    true
                  )
              )
        });
      }

      if (
        lineupsBody?.away
      ) {

        const players =
          arr(
            lineupsBody.away
              .players
          );

        lineups.push({

          team:
            awayTeam,

          formation:
            lineupsBody.away
              .formation ||
            "—",

          coach:
            lineupsBody.away
              ?.manager?.name ||
            null,

          startXI:
            players
              .filter(
                player =>
                  player?.substitute !==
                  true
              )
              .slice(
                0,
                11
              )
              .map(
                player =>
                  normalizePlayer(
                    player,
                    awayTeam,
                    false
                  )
              ),

          substitutes:
            players
              .filter(
                player =>
                  player?.substitute ===
                  true
              )
              .map(
                player =>
                  normalizePlayer(
                    player,
                    awayTeam,
                    true
                  )
              )
        });
      }

      const events =
        arr(
          incidentsBody?.incidents
        ).map(
          incident => {

            const copy =
              {
                ...incident
              };

            if (
              copy.team ===
              undefined
            ) {

              copy.team =
                copy.isHome ===
                true
                  ? homeTeam
                  : copy.isHome ===
                    false
                    ? awayTeam
                    : {};
            }

            if (
              copy.player ===
              undefined &&
              copy.playerIn ===
                undefined &&
              copy.playerOut ===
                undefined
            ) {

              copy.player =
                copy.player ||
                {};
            }

            return normalizeEvent(
              copy
            );
          }
        );

      const statistics =
        normalizeStatistics(
          {
            statistics:
              statisticsBody?.statistics ||
              []
          },
          homeTeam,
          awayTeam
        );

      const players =
        buildPlayers(
          lineups
        );

      const startDate =
        event?.startTimestamp
          ? new Date(
              Number(
                event.startTimestamp
              ) * 1000
            ).toISOString()
          : null;

      const details = {

        fixture: {

          id:
            id,

          slug:
            event?.slug ||
            `sofa-${id}`,

          upstreamId:
            id,

          date:
            startDate,

          status: {

            short:
              status,

            long:
              event?.status?.description ||
              "Match",

            elapsed:
              event?.time
                ?.currentPeriodStartTimestamp
                ? null
                : null
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
            uniqueTournament?.id ||
            tournament?.id ||
            null,

          name:
            uniqueTournament?.name ||
            tournament?.name ||
            "Football",

          country:
            category?.name ||
            "",

          logo:
            uniqueTournament?.id
              ? `https://api.sofascore.com/api/v1/unique-tournament/${uniqueTournament.id}/image`
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

        events,

        lineups,

        statistics,

        players,

        provider:
          "SofaScore"
      };

      return details;
    }

    /* =====================================================
       THE SPORTs DB DETAILS
    ===================================================== */

    function splitPlayers(
      value
    ) {

      return String(
        value || ""
      )
        .split(
          /[,;\n|]+/
        )
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);
    }

    function makeTSDBPlayers(
      names,
      team
    ) {

      return splitPlayers(
        names
      ).map(
        (
          name,
          index
        ) =>
          normalizePlayer(
            {
              player: {
                id:
                  null,

                name,

                shirtNumber:
                  index + 1
              }
            },

            team,

            false
          )
      );
    }

    function getTSDBLineup(
      event,
      homeTeam,
      awayTeam
    ) {

      const lineups =
        [];

      const homePlayers = [
        ...makeTSDBPlayers(
          event?.strHomeLineupGoalkeeper,
          homeTeam
        ),

        ...makeTSDBPlayers(
          event?.strHomeLineupDefense,
          homeTeam
        ),

        ...makeTSDBPlayers(
          event?.strHomeLineupMidfield,
          homeTeam
        ),

        ...makeTSDBPlayers(
          event?.strHomeLineupForward,
          homeTeam
        )
      ];

      const awayPlayers = [
        ...makeTSDBPlayers(
          event?.strAwayLineupGoalkeeper,
          awayTeam
        ),

        ...makeTSDBPlayers(
          event?.strAwayLineupDefense,
          awayTeam
        ),

        ...makeTSDBPlayers(
          event?.strAwayLineupMidfield,
          awayTeam
        ),

        ...makeTSDBPlayers(
          event?.strAwayLineupForward,
          awayTeam
        )
      ];

      if (
        homePlayers.length
      ) {

        lineups.push({

          team:
            homeTeam,

          formation:
            event?.strHomeFormation ||
            "—",

          coach:
            event?.strHomeCoach ||
            null,

          startXI:
            homePlayers.slice(
              0,
              11
            ),

          substitutes:
            []
        });
      }

      if (
        awayPlayers.length
      ) {

        lineups.push({

          team:
            awayTeam,

          formation:
            event?.strAwayFormation ||
            "—",

          coach:
            event?.strAwayCoach ||
            null,

          startXI:
            awayPlayers.slice(
              0,
              11
            ),

          substitutes:
            []
        });
      }

      return lineups;
    }

    function getTSDBGoalEvents(
      event,
      homeTeam,
      awayTeam
    ) {

      const result =
        [];

      function addGoals(
        value,
        team
      ) {

        if (!value) {
          return;
        }

        const pieces =
          String(value)
            .split(
              /[;,|]+/
            )
            .map(
              x =>
                x.trim()
            )
            .filter(Boolean);

        pieces.forEach(
          piece => {

            const match =
              piece.match(
                /(.+?)\s*(?:\((\d+)'?\)|(\d+)'?)?$/
              );

            result.push(
              normalizeEvent(
                {
                  type:
                    "goal",

                  detail:
                    "Goal",

                  player: {
                    name:
                      match?.[1] ||
                      piece
                  },

                  minute:
                    match?.[2] ||
                    match?.[3] ||
                    null,

                  team
                }
              )
            );
          }
        );
      }

      addGoals(
        event?.strHomeGoalDetails,
        homeTeam
      );

      addGoals(
        event?.strAwayGoalDetails,
        awayTeam
      );

      return result;
    }

    async function getTheSportsDBDetails(
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

      if (!id) {
        throw new Error(
          "TheSportsDB event ID manquant"
        );
      }

      const event =
        await getTheSportsDBEvent(
          id
        );

      if (!event) {
        throw new Error(
          "Match TheSportsDB introuvable"
        );
      }

      const homeTeam =
        normalizeTeam(
          {
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
          "Domicile"
        );

      const awayTeam =
        normalizeTeam(
          {
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
          "Extérieur"
        );

      let status =
        "NS";

      const rawStatus =
        String(
          event?.strStatus ||
          event?.strProgress ||
          ""
        ).toLowerCase();

      if (
        rawStatus.includes(
          "finished"
        ) ||
        rawStatus ===
          "ft"
      ) {
        status =
          "FT";
      }

      else if (
        rawStatus.includes(
          "half"
        ) ||
        rawStatus ===
          "ht"
      ) {
        status =
          "HT";
      }

      else if (
        rawStatus.includes(
          "live"
        ) ||
        rawStatus.includes(
          "progress"
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

      const lineups =
        getTSDBLineup(
          event,
          homeTeam,
          awayTeam
        );

      const events =
        getTSDBGoalEvents(
          event,
          homeTeam,
          awayTeam
        );

      const players =
        buildPlayers(
          lineups
        );

      const dateValue =
        event?.dateEvent &&
        event?.strTime
          ? `${event.dateEvent}T${event.strTime}`
          : event?.dateEvent ||
            null;

      return {

        fixture: {

          id:
            id,

          slug:
            `tsdb-${id}`,

          upstreamId:
            id,

          date:
            dateValue,

          status: {

            short:
              status,

            long:
              event?.strStatus ||
              status,

            elapsed:
              null
          },

          venue:
            event?.strVenue ||
            null,

          referee:
            event?.strReferee ||
            null,

          timezone:
            event?.strTime ||
            null
        },

        league: {

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
            "",

          round:
            event?.intRound ||
            null,

          season:
            event?.strSeason ||
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

        lineups,

        statistics:
          [],

        players,

        provider:
          "TheSportsDB"
      };
    }

    /* =====================================================
       ESPN DETAILS
    ===================================================== */

    function espnPlayer(
      athlete,
      team
    ) {

      const person =
        athlete?.athlete ||
        athlete ||
        {};

      return normalizePlayer(
        {
          player: {

            id:
              person?.id ||
              null,

            name:
              person?.displayName ||
              person?.fullName ||
              person?.shortName ||
              "Joueur",

            photo:
              person?.headshot?.href ||
              person?.headshot ||
              "",

            shirtNumber:
              athlete?.jersey ||
              person?.jersey ||
              null,

            position:
              athlete?.position?.abbreviation ||
              athlete?.position?.displayName ||
              person?.position?.displayName ||
              ""
          },

          position:
            athlete?.position?.abbreviation ||
            "",

          rating:
            athlete?.stats?.rating ||
            null
        },

        team,

        !(
          athlete?.starter !==
          true
        )
      );
    }

    function espnTeamFromCompetition(
      competitor
    ) {

      const team =
        competitor?.team ||
        {};

      return {

        id:
          team?.id ||
          null,

        name:
          team?.displayName ||
          team?.name ||
          "",

        logo:
          team?.logo ||
          (
            team?.id
              ? `https://a.espncdn.com/i/teamlogos/soccer/500/${team.id}.png`
              : ""
          )
      };
    }

    async function getESPNDetails(
      eventId
    ) {

      const id =
        String(
          eventId || ""
        )
          .replace(
            /^espn-/i,
            ""
          )
          .trim();

      if (!id) {
        throw new Error(
          "ESPN event ID manquant"
        );
      }

      const summary =
        await getJSON(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${encodeURIComponent(
            id
          )}`
        );

      const header =
        summary?.header ||
        {};

      const competition =
        Array.isArray(
          header?.competitions
        )
          ? header.competitions[0]
          : null;

      const competitors =
        arr(
          competition?.competitors
        );

      const homeComp =
        competitors.find(
          item =>
            item?.homeAway ===
            "home"
        );

      const awayComp =
        competitors.find(
          item =>
            item?.homeAway ===
            "away"
        );

      const homeTeam =
        normalizeTeam(
          espnTeamFromCompetition(
            homeComp
          ),
          "Domicile"
        );

      const awayTeam =
        normalizeTeam(
          espnTeamFromCompetition(
            awayComp
          ),
          "Extérieur"
        );

      let status =
        "NS";

      const statusState =
        String(
          competition?.status
            ?.type?.state ||
            header
              ?.competitions?.[0]
              ?.status?.type
              ?.state ||
            ""
        ).toLowerCase();

      if (
        statusState ===
        "in"
      ) {
        status =
          "LIVE";
      }

      else if (
        statusState ===
        "post"
      ) {
        status =
          "FT";
      }

      const dateValue =
        competition?.date ||
        header?.competitions?.[0]
          ?.date ||
        null;

      const homeScore =
        homeComp?.score !==
          undefined
          ? Number(
              homeComp.score
            )
          : null;

      const awayScore =
        awayComp?.score !==
          undefined
          ? Number(
              awayComp.score
            )
          : null;

      const lineups =
        [];

      arr(
        summary?.rosters
      ).forEach(
        roster => {

          const teamRaw =
            roster?.team ||
            {};

          const isHome =
            homeTeam.id &&
            String(
              homeTeam.id
            ) ===
              String(
                teamRaw?.id
              );

          const target =
            isHome
              ? homeTeam
              : awayTeam;

          const rosterPlayers =
            arr(
              roster?.roster ||
              roster?.players
            );

          if (
            !rosterPlayers.length
          ) {
            return;
          }

          const starters =
            rosterPlayers
              .filter(
                player =>
                  player?.starter ===
                  true
              )
              .slice(
                0,
                11
              )
              .map(
                player =>
                  espnPlayer(
                    player,
                    target
                  )
              );

          const substitutes =
            rosterPlayers
              .filter(
                player =>
                  player?.starter !==
                  true
              )
              .map(
                player =>
                  normalizePlayer(
                    {
                      player:
                        player?.athlete ||
                        player,

                      position:
                        player?.position
                          ?.abbreviation ||
                        "",

                      rating:
                        player?.stats?.rating ||
                        null
                    },

                    target,

                    true
                  )
              );

          lineups.push({

            team:
              target,

            formation:
              "—",

            coach:
              null,

            startXI:
              starters,

            substitutes:
              substitutes
          });
        }
      );

      const events =
        arr(
          summary?.plays
        )
          .filter(
            play =>
              play?.text ||
              play?.type
          )
          .map(
            play =>
              normalizeEvent(
                {
                  type:
                    play?.type?.text ||
                    play?.type?.id ||
                    "Other",

                  detail:
                    play?.text ||
                    "",

                  minute:
                    play?.clock?.displayValue ||
                    play?.clock?.value ||
                    null,

                  team:
                    play?.team
                      ? espnTeamFromCompetition(
                          {
                            team:
                              play.team
                          }
                        )
                      : {},

                  player:
                    play?.participants?.[0]
                      ?.athlete ||
                    {},

                  assist:
                    play?.participants?.[1]
                      ?.athlete ||
                    {}
                }
              )
          );

      const statistics =
        [];

      arr(
        summary?.boxscore
          ?.teams
      ).forEach(
        block => {

          const teamRaw =
            block?.team ||
            {};

          const target =
            homeTeam.id &&
            String(
              homeTeam.id
            ) ===
              String(
                teamRaw?.id
              )
              ? homeTeam
              : awayTeam;

          const stats =
            arr(
              block?.statistics
            ).map(
              stat => ({
                type:
                  first(
                    stat?.name,
                    stat?.label,
                    stat?.displayName,
                    "Stat"
                  ),

                value:
                  first(
                    stat?.displayValue,
                    stat?.value,
                    "-"
                  )
              })
            );

          if (
            stats.length
          ) {

            statistics.push({
              team:
                target,

              statistics:
                stats
            });
          }
        }
      );

      const players =
        buildPlayers(
          lineups
        );

      const leagueName =
        first(
          header?.league?.name,
          header?.season?.displayName,
          header?.season?.slug,
          competition?.league?.name,
          "Football"
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
            dateValue,

          status: {

            short:
              status,

            long:
              competition
                ?.status?.type
                ?.description ||
              status,

            elapsed:
              competition
                ?.status?.displayClock ||
              null
          },

          venue:
            competition
              ?.venue?.fullName ||
            competition
              ?.venue?.displayName ||
            null,

          referee:
            null,

          timezone:
            null
        },

        league: {

          id:
            competition
              ?.league?.id ||
            null,

          name:
            leagueName,

          country:
            "World",

          logo:
            "",

          round:
            header?.season
              ?.displayName ||
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

        lineups,

        statistics,

        players,

        provider:
          "ESPN"
      };
    }

    /* =====================================================
       SPORTScore LINEUPS HELPERS
       ===================================================== */

    function teamMatches(
      candidate,
      team,
      side
    ) {

      if (!candidate) {
        return false;
      }

      const c =
        obj(candidate);

      const ct =
        first(
          c?.team,
          c?.club,
          {}
        );

      const cid =
        idOf(ct) ||
        c?.team_id ||
        c?.teamId;

      const cname =
        nameOf(ct) ||
        c?.team_name ||
        c?.teamName;

      if (
        team?.id &&
        cid &&
        String(team.id) ===
          String(cid)
      ) {
        return true;
      }

      if (
        team?.name &&
        cname &&
        norm(team.name) ===
          norm(cname)
      ) {
        return true;
      }

      const label =
        norm(
          first(
            c?.side,
            c?.team_side,
            c?.for,
            c?.group,
            ""
          )
        );

      return (
        norm(
          side
        ) ===
          label ||
        (
          side ===
            "home" &&
          (
            label ===
              "home" ||
            label ===
              "host"
          )
        ) ||
        (
          side ===
            "away" &&
          (
            label ===
              "away" ||
            label ===
              "guest"
          )
        )
      );
    }

    /* =====================================================
       SPORTScore DETAILS
    ===================================================== */

    async function getSportScoreDetails(
      slug
    ) {

      let body;
      let firstError =
        null;

      try {

        body =
          await getJSON(
            `${SPORTSCORE}/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}`
          );

      }

      catch (error) {

        firstError =
          error;

        try {

          body =
            await getJSON(
              `${WIDGET}/match/?sport=football&slug=${encodeURIComponent(
                slug
              )}`
            );

          }

        }

        catch (widgetError) {

          throw (
            widgetError ||
            firstError
          );
        }
      }

      const root =
        getDetailRoot(
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

      const basic =
        normalizeMatch(
          root
        );

      if (!basic) {
        throw new Error(
          "Match introuvable"
        );
      }

      const homeTeam =
        normalizeTeam(
          first(
            root?.home_team,
            root?.homeTeam,
            root?.teams?.home,
            basic.teams.home
          ),

          basic.teams.home.name,

          basic.teams.home.logo
        );

      const awayTeam =
        normalizeTeam(
          first(
            root?.away_team,
            root?.awayTeam,
            root?.teams?.away,
            basic.teams.away
          ),

          basic.teams.away.name,

          basic.teams.away.logo
        );

      const lineups =
        getLineups(
          root,
          homeTeam,
          awayTeam
        );

      const events =
        normalizeEvents(
          root
        );

      const statistics =
        normalizeStatistics(
          root,
          homeTeam,
          awayTeam
        );

      const players =
        buildPlayers(
          lineups
        );

      const score =
        obj(
          root?.score
        );

      const homeScore =
        first(
          root?.home_score,
          root?.homeScore,
          score?.home,
          score?.fulltime?.home,
          basic.goals.home,
          null
        );

      const awayScore =
        first(
          root?.away_score,
          root?.awayScore,
          score?.away,
          score?.fulltime?.away,
          basic.goals.away,
          null
        );

      const rawStatusText =
        String(
          first(
            root?.status_text,
            root?.status?.long,
            root?.status,
            basic.fixture.status.long,
            ""
          )
        ).toLowerCase();

      let statusShort =
        String(
          first(
            root?.status_code,
            root?.short_status,
            root?.status?.short,
            basic.fixture.status.short,
            "NS"
          )
        );

      if (
        /live|in play|inplay/.test(
          rawStatusText
        )
      ) {
        statusShort =
          "LIVE";
      }

      else if (
        /half|halftime|ht/.test(
          rawStatusText
        )
      ) {
        statusShort =
          "HT";
      }

      else if (
        /finish|finished|ended|ft/.test(
          rawStatusText
        )
      ) {
        statusShort =
          "FT";
      }

      const competition =
        first(
          root?.competition,
          root?.league,
          {}
        );

      const referee =
        first(
          root?.referee,
          basic.fixture.referee,
          null
        );

      return {

        fixture: {

          id:
            slug,

          slug,

          upstreamId:
            first(
              root?.id,
              root?.match_id,
              root?.fixture_id,
              basic.fixture
                .upstreamId,
              slug
            ),

          date:
            first(
              root?.time,
              root?.date,
              root?.start_time,
              root?.kickoff,
              basic.fixture.date,
              null
            ),

          timezone:
            first(
              root?.timezone,
              null
            ),

          status: {

            short:
              statusShort,

            long:
              first(
                root?.status_text,
                root?.status?.long,
                root?.status,
                basic.fixture
                  .status.long,
                "Match"
              ),

            elapsed:
              first(
                root?.minute,
                root?.elapsed,
                root?.status?.elapsed,
                basic.fixture
                  .status.elapsed,
                null
              )
          },

          venue:
            first(
              root?.venue,
              basic.fixture
                .venue,
              null
            ),

          referee:
            typeof referee ===
              "object"
              ? first(
                  referee?.name,
                  ""
                )
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
            nameOf(
              competition
            ) ||
            root?.competition_name ||
            root?.league_name ||
            basic.league.name ||
            "Football",

          country:
            competition?.country ||
            root?.country ||
            basic.league
              .country ||
            "",

          logo:
            imageOf(
              competition
            ) ||
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
        },

        events,

        lineups,

        statistics,

        players,

        provider:
          "SportScore"
      };
    }

/* =====================================================
   EXTERNAL MATCH DETAILS
   SportScore / SofaScore / ESPN / TheSportsDB
===================================================== */

async function getSofaDetails(eventId) {
  const id = String(eventId || "")
    .replace(/^sofa-/i, "")
    .trim();

  if (!id) {
    throw new Error("SofaScore event ID manquant");
  }

  const eventBody = await getJSON(
    `https://www.sofascore.com/api/v1/event/${encodeURIComponent(id)}`
  );

  const event =
    eventBody?.event ||
    {};

  if (!event?.id) {
    throw new Error("SofaScore match introuvable");
  }

  const [
    incidentsBody,
    lineupsBody,
    statisticsBody
  ] = await Promise.allSettled([
    getJSON(
      `https://www.sofascore.com/api/v1/event/${encodeURIComponent(id)}/incidents`
    ),
    getJSON(
      `https://www.sofascore.com/api/v1/event/${encodeURIComponent(id)}/lineups`
    ),
    getJSON(
      `https://www.sofascore.com/api/v1/event/${encodeURIComponent(id)}/statistics`
    )
  ]);

  const incidents =
    incidentsBody.status === "fulfilled"
      ? incidentsBody.value
      : {};

  const lineups =
    lineupsBody.status === "fulfilled"
      ? lineupsBody.value
      : {};

  const statistics =
    statisticsBody.status === "fulfilled"
      ? statisticsBody.value
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

  const uniqueTournament =
    tournament?.uniqueTournament ||
    {};

  const category =
    tournament?.category ||
    {};

  function team(teamRaw) {
    return {
      id:
        teamRaw?.id ||
        null,

      name:
        teamRaw?.name ||
        teamRaw?.shortName ||
        "Équipe",

      logo:
        teamRaw?.logo ||
        (
          teamRaw?.id
            ? `https://api.sofascore.com/api/v1/team/${teamRaw.id}/image`
            : ""
        )
    };
  }

  function sofaStatus() {
    const type =
      String(
        event?.status?.type ||
        ""
      ).toLowerCase();

    if (type === "inprogress") {
      return "LIVE";
    }

    if (type === "halftime") {
      return "HT";
    }

    if (type === "finished") {
      return "FT";
    }

    if (type === "postponed") {
      return "PST";
    }

    if (
      type === "canceled" ||
      type === "cancelled"
    ) {
      return "CANC";
    }

    return "NS";
  }

  const homeTeam =
    team(home);

  const awayTeam =
    team(away);

  const outputLineups = [];

  if (
    lineups?.home
  ) {
    outputLineups.push({
      team:
        homeTeam,

      formation:
        lineups.home?.formation ||
        "—",

      coach:
        lineups.home?.manager?.name ||
        null,

      players:
        Array.isArray(
          lineups.home?.players
        )
          ? lineups.home.players
          : [],

      substitutes:
        []
    });
  }

  if (
    lineups?.away
  ) {
    outputLineups.push({
      team:
        awayTeam,

      formation:
        lineups.away?.formation ||
        "—",

      coach:
        lineups.away?.manager?.name ||
        null,

      players:
        Array.isArray(
          lineups.away?.players
        )
          ? lineups.away.players
          : [],

      substitutes:
        []
    });
  }

  return {
    fixture: {
      id:
        id,

      slug:
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
          sofaStatus(),

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
        null
    },

    competition: {
      id:
        uniqueTournament?.id ||
        tournament?.id ||
        null,

      name:
        uniqueTournament?.name ||
        tournament?.name ||
        "Football",

      country:
        category?.name ||
        "",

      logo:
        uniqueTournament?.id
          ? `https://api.sofascore.com/api/v1/unique-tournament/${uniqueTournament.id}/image`
          : ""
    },

    league: {
      id:
        uniqueTournament?.id ||
        tournament?.id ||
        null,

      name:
        uniqueTournament?.name ||
        tournament?.name ||
        "Football",

      country:
        category?.name ||
        "",

      logo:
        uniqueTournament?.id
          ? `https://api.sofascore.com/api/v1/unique-tournament/${uniqueTournament.id}/image`
          : "",

      round:
        event?.roundInfo?.name ||
        event?.roundInfo?.round ||
        null,

      season:
        event?.season?.name ||
        null
    },

    home_team:
      homeTeam,

    away_team:
      awayTeam,

    teams: {
      home:
        homeTeam,

      away:
        awayTeam
    },

    home_score:
      event?.homeScore?.current ??
      null,

    away_score:
      event?.awayScore?.current ??
      null,

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

    incidents:
      Array.isArray(
        incidents?.incidents
      )
        ? incidents.incidents
        : [],

    events:
      Array.isArray(
        incidents?.incidents
      )
        ? incidents.incidents
        : [],

    lineups:
      outputLineups,

    statistics:
      Array.isArray(
        statistics?.statistics
      )
        ? statistics.statistics
        : [],

    players: [],

    provider:
      "SofaScore"
  };
}


async function getESPNDetails(
  eventId
) {
  const id =
    String(eventId || "")
      .replace(/^espn-/i, "")
      .trim();

  if (!id) {
    throw new Error(
      "ESPN event ID manquant"
    );
  }

  const body =
    await getJSON(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${encodeURIComponent(id)}`
    );

  const header =
    body?.header ||
    {};

  const competition =
    Array.isArray(
      header?.competitions
    )
      ? header.competitions[0]
      : null;

  const competitors =
    Array.isArray(
      competition?.competitors
    )
      ? competition.competitors
      : [];

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

  let status = "NS";

  const state =
    String(
      competition?.status
        ?.type?.state ||
      ""
    ).toLowerCase();

  if (state === "in") {
    status = "LIVE";
  }

  else if (state === "post") {
    status = "FT";
  }

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
    header?.league?.name ||
    competition?.league?.name ||
    header?.season?.displayName ||
    "Football";

  const events =
    Array.isArray(
      body?.plays
    )
      ? body.plays.map(
          play => ({
            time: {
              elapsed:
                play?.clock?.displayValue ||
                null,

              extra:
                null
            },

            team: {
              id:
                play?.team?.id ||
                null,

              name:
                play?.team?.displayName ||
                play?.team?.name ||
                ""
            },

            player: {
              id:
                play?.participants?.[0]?.athlete?.id ||
                null,

              name:
                play?.participants?.[0]?.athlete
                  ?.displayName ||
                ""
            },

            assist: {
              id:
                play?.participants?.[1]?.athlete?.id ||
                null,

              name:
                play?.participants?.[1]?.athlete
                  ?.displayName ||
                ""
            },

            type:
              play?.type?.text ||
              play?.type?.id ||
              "Other",

            detail:
              play?.text ||
              ""
          })
        )
      : [];

  const lineups = [];

  if (
    Array.isArray(
      body?.rosters
    )
  ) {

    body.rosters.forEach(
      roster => {

        const rosterTeam =
          roster?.team ||
          {};

        const isHome =
          String(
            rosterTeam?.id ||
            ""
          ) ===
          String(
            homeTeam.id ||
            ""
          );

        const target =
          isHome
            ? homeTeam
            : awayTeam;

        const players =
          Array.isArray(
            roster?.roster
          )
            ? roster.roster
            : [];

        if (
          players.length
        ) {

          lineups.push({
            team:
              target,

            formation:
              "—",

            coach:
              null,

            players,

            substitutes:
              []
          });
        }
      }
    );
  }

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
        header?.competitions?.[0]?.date ||
        null,

      status: {
        short:
          status,

        long:
          competition?.status
            ?.type?.description ||
          status,

        elapsed:
          competition?.status
            ?.displayClock ||
          null
      },

      venue:
        competition?.venue?.fullName ||
        competition?.venue?.displayName ||
        null
    },

    competition: {
      id:
        header?.league?.id ||
        null,

      name:
        leagueName,

      country:
        "World",

      logo:
        ""
    },

    league: {
      id:
        header?.league?.id ||
        null,

      name:
        leagueName,

      country:
        "World",

      logo:
        "",

      round:
        header?.season?.displayName ||
        null,

      season:
        header?.season?.displayName ||
        null
    },

    home_team:
      homeTeam,

    away_team:
      awayTeam,

    teams: {
      home:
        homeTeam,

      away:
        awayTeam
    },

    home_score:
      homeScore,

    away_score:
      awayScore,

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

    lineups,

    statistics:
      [],

    players: [],

    provider:
      "ESPN"
  };
}


async function getTheSportsDBDetails(
  eventId
) {
  const id =
    String(eventId || "")
      .replace(/^tsdb-/i, "")
      .trim();

  if (!id) {
    throw new Error(
      "TheSportsDB event ID manquant"
    );
  }

  const event =
    await getTheSportsDBEvent(
      id
    );

  if (!event) {
    throw new Error(
      "Match TheSportsDB introuvable"
    );
  }

  const homeTeam = {
    id:
      event?.idHomeTeam ||
      null,

    name:
      event?.strHomeTeam ||
      "Domicile",

    logo:
      event?.strHomeTeamBadge ||
      ""
  };

  const awayTeam = {
    id:
      event?.idAwayTeam ||
      null,

    name:
      event?.strAwayTeam ||
      "Extérieur",

    logo:
      event?.strAwayTeamBadge ||
      ""
  };

  let homeScore =
    event?.intHomeScore;

  let awayScore =
    event?.intAwayScore;

  homeScore =
    homeScore === "" ||
    homeScore === null ||
    homeScore === undefined
      ? null
      : Number(
          homeScore
        );

  awayScore =
    awayScore === "" ||
    awayScore === null ||
    awayScore === undefined
      ? null
      : Number(
          awayScore
        );

  const rawStatus =
    String(
      event?.strStatus ||
      event?.strProgress ||
      ""
    ).toLowerCase();

  let status =
    "NS";

  if (
    rawStatus.includes(
      "finished"
    ) ||
    rawStatus === "ft"
  ) {
    status =
      "FT";
  }

  else if (
    rawStatus.includes(
      "half"
    ) ||
    rawStatus === "ht"
  ) {
    status =
      "HT";
  }

  else if (
    rawStatus.includes(
      "live"
    ) ||
    rawStatus.includes(
      "progress"
    )
  ) {
    status =
      "LIVE";
  }

  const events = [];

  function addGoal(
    value,
    team
  ) {
    if (!value) {
      return;
    }

    String(value)
      .split(
        /[;,|]+/
      )
      .map(
        x =>
          x.trim()
      )
      .filter(Boolean)
      .forEach(
        goal => {

          const match =
            goal.match(
              /(.+?)\s*(?:\((\d+)'?\)|(\d+)'?)?$/
            );

          events.push({
            time: {
              elapsed:
                match?.[2] ||
                match?.[3] ||
                null,

              extra:
                null
            },

            team,

            player: {
              id:
                null,

              name:
                match?.[1] ||
                goal
            },

            assist: {
              id:
                null,

              name:
                ""
            },

            type:
              "Goal",

            detail:
              "Goal"
          });
        }
      );
  }

  addGoal(
    event?.strHomeGoalDetails,
    homeTeam
  );

  addGoal(
    event?.strAwayGoalDetails,
    awayTeam
  );

  return {
    fixture: {

      id:
        id,

      slug:
        `tsdb-${id}`,

      upstreamId:
        id,

      date:
        event?.dateEvent &&
        event?.strTime
          ? `${event.dateEvent}T${event.strTime}`
          : event?.dateEvent ||
            null,

      status: {

        short:
          status,

        long:
          event?.strStatus ||
          status,

        elapsed:
          null
      },

      venue:
        event?.strVenue ||
        null,

      referee:
        event?.strReferee ||
        null
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

    league: {

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
        "",

      round:
        event?.intRound ||
        null,

      season:
        event?.strSeason ||
        null
    },

    home_team:
      homeTeam,

    away_team:
      awayTeam,

    teams: {

      home:
        homeTeam,

      away:
        awayTeam
    },

    home_score:
      homeScore,

    away_score:
      awayScore,

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
      "TheSportsDB"
  };
}

   /* =====================================================
   MATCH DETAILS
===================================================== */
/* =====================================================
   EXTERNAL MATCH DETAILS ROUTER
   كل match جديد يرجع Details ديالو
===================================================== */

async function getSofaMatchDetails(eventId) {

  const id =
    String(eventId || "")
      .replace(/^sofa-/i, "")
      .trim();

  if (!id) {
    throw new Error(
      "SofaScore event ID manquant"
    );
  }

  const eventBody =
    await getJSON(
      `https://www.sofascore.com/api/v1/event/${encodeURIComponent(id)}`
    );

  const event =
    eventBody?.event ||
    {};

  if (!event?.id) {
    throw new Error(
      "SofaScore match introuvable"
    );
  }

  const [
    incidentsBody,
    lineupsBody,
    statisticsBody
  ] =
    await Promise.allSettled([

      getJSON(
        `https://www.sofascore.com/api/v1/event/${encodeURIComponent(id)}/incidents`
      ),

      getJSON(
        `https://www.sofascore.com/api/v1/event/${encodeURIComponent(id)}/lineups`
      ),

      getJSON(
        `https://www.sofascore.com/api/v1/event/${encodeURIComponent(id)}/statistics`
      )

    ]);

  const incidents =
    incidentsBody.status === "fulfilled"
      ? incidentsBody.value
      : {};

  const lineups =
    lineupsBody.status === "fulfilled"
      ? lineupsBody.value
      : {};

  const statistics =
    statisticsBody.status === "fulfilled"
      ? statisticsBody.value
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

  const uniqueTournament =
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
          ? `https://api.sofascore.com/api/v1/team/${home.id}/image`
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
          ? `https://api.sofascore.com/api/v1/team/${away.id}/image`
          : ""
      )
  };

  let status =
    "NS";

  const statusType =
    String(
      event?.status?.type ||
      ""
    ).toLowerCase();

  if (
    statusType ===
    "inprogress"
  ) {
    status = "LIVE";
  }

  else if (
    statusType ===
    "halftime"
  ) {
    status = "HT";
  }

  else if (
    statusType ===
    "finished"
  ) {
    status = "FT";
  }

  else if (
    statusType ===
    "postponed"
  ) {
    status = "PST";
  }

  else if (
    statusType ===
      "canceled" ||
    statusType ===
      "cancelled"
  ) {
    status = "CANC";
  }

  const details = {

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
        null
    },

    competition: {

      id:
        uniqueTournament?.id ||
        tournament?.id ||
        null,

      name:
        uniqueTournament?.name ||
        tournament?.name ||
        "Football",

      country:
        category?.name ||
        "",

      logo:
        uniqueTournament?.id
          ? `https://api.sofascore.com/api/v1/unique-tournament/${uniqueTournament.id}/image`
          : ""
    },

    league: {

      id:
        uniqueTournament?.id ||
        tournament?.id ||
        null,

      name:
        uniqueTournament?.name ||
        tournament?.name ||
        "Football",

      country:
        category?.name ||
        "",

      logo:
        uniqueTournament?.id
          ? `https://api.sofascore.com/api/v1/unique-tournament/${uniqueTournament.id}/image`
          : "",

      round:
        event?.roundInfo?.name ||
        event?.roundInfo?.round ||
        null,

      season:
        event?.season?.name ||
        null
    },

    home_team:
      homeTeam,

    away_team:
      awayTeam,

    teams: {

      home:
        homeTeam,

      away:
        awayTeam
    },

    home_score:
      event?.homeScore?.current ??
      null,

    away_score:
      event?.awayScore?.current ??
      null,

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

    incidents:
      Array.isArray(
        incidents?.incidents
      )
        ? incidents.incidents
        : [],

    events:
      Array.isArray(
        incidents?.incidents
      )
        ? incidents.incidents
        : [],

    lineups: [

      ...(lineups?.home
        ? [{
            team:
              homeTeam,

            formation:
              lineups.home?.formation ||
              "—",

            coach:
              lineups.home?.manager?.name ||
              null,

            players:
              Array.isArray(
                lineups.home?.players
              )
                ? lineups.home.players
                : [],

            substitutes:
              []
          }]
        : []),

      ...(lineups?.away
        ? [{
            team:
              awayTeam,

            formation:
              lineups.away?.formation ||
              "—",

            coach:
              lineups.away?.manager?.name ||
              null,

            players:
              Array.isArray(
                lineups.away?.players
              )
                ? lineups.away.players
                : [],

            substitutes:
              []
          }]
        : [])
    ],

    statistics:
      Array.isArray(
        statistics?.statistics
      )
        ? statistics.statistics
        : [],

    players:
      [],

    provider:
      "SofaScore"
  };

  return details;
}


/* =====================================================
   THE SPORTs DB DETAILS
===================================================== */

async function getTSDBMatchDetails(eventId) {

  const id =
    String(eventId || "")
      .replace(/^tsdb-/i, "")
      .trim();

  if (!id) {
    throw new Error(
      "TheSportsDB event ID manquant"
    );
  }

  const event =
    await getTheSportsDBEvent(
      id
    );

  if (!event) {
    throw new Error(
      "TheSportsDB match introuvable"
    );
  }

  const homeTeam = {

    id:
      event?.idHomeTeam ||
      null,

    name:
      event?.strHomeTeam ||
      "Domicile",

    logo:
      event?.strHomeTeamBadge ||
      ""
  };

  const awayTeam = {

    id:
      event?.idAwayTeam ||
      null,

    name:
      event?.strAwayTeam ||
      "Extérieur",

    logo:
      event?.strAwayTeamBadge ||
      ""
  };

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

  const rawStatus =
    String(
      event?.strStatus ||
      event?.strProgress ||
      ""
    ).toLowerCase();

  let status =
    "NS";

  if (
    rawStatus.includes(
      "finished"
    ) ||
    rawStatus ===
      "ft"
  ) {
    status = "FT";
  }

  else if (
    rawStatus.includes(
      "half"
    ) ||
    rawStatus ===
      "ht"
  ) {
    status = "HT";
  }

  else if (
    rawStatus.includes(
      "live"
    ) ||
    rawStatus.includes(
      "progress"
    )
  ) {
    status = "LIVE";
  }

  return {

    fixture: {

      id:
        id,

      slug:
        `tsdb-${id}`,

      upstreamId:
        id,

      date:
        event?.dateEvent &&
        event?.strTime
          ? `${event.dateEvent}T${event.strTime}`
          : event?.dateEvent ||
            null,

      status: {

        short:
          status,

        long:
          event?.strStatus ||
          status,

        elapsed:
          null
      },

      venue:
        event?.strVenue ||
        null,

      referee:
        event?.strReferee ||
        null
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

    league: {

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
        "",

      round:
        event?.intRound ||
        null,

      season:
        event?.strSeason ||
        null
    },

    home_team:
      homeTeam,

    away_team:
      awayTeam,

    teams: {

      home:
        homeTeam,

      away:
        awayTeam
    },

    home_score:
      homeScore,

    away_score:
      awayScore,

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

    events: [],

    incidents: [],

    lineups: [],

    statistics: [],

    players: [],

    provider:
      "TheSportsDB"
  };
}


/* =====================================================
   ROUTER
===================================================== */

if (
  fixture &&
  String(fixture)
    .toLowerCase()
    .startsWith("sofa-")
) {

  try {

    const details =
      await getSofaMatchDetails(
        fixture
      );

    return output(
      200,
      {
        data:
          details,

        provider:
          "SofaScore"
      }
    );

  }

  catch (error) {

    console.error(
      "SOFASCORE DETAILS ERROR:",
      error
    );

    return output(
      502,
      {
        error:
          "Impossible de charger le match",

        details:
          error?.message ||
          null,

        data:
          []
      }
    );
  }
}


if (
  fixture &&
  String(fixture)
    .toLowerCase()
    .startsWith("tsdb-")
) {

  try {

    const details =
      await getTSDBMatchDetails(
        fixture
      );

    return output(
      200,
      {
        data:
          details,

        provider:
          "TheSportsDB"
      }
    );

  }

  catch (error) {

    console.error(
      "THESPORTSDB DETAILS ERROR:",
      error
    );

    return output(
      502,
      {
        error:
          "Impossible de charger le match",

        details:
          error?.message ||
          null,

        data:
          []
      }
    );
  }
}
if (fixture) {

  const fixtureValue =
    String(
      fixture || ""
    ).trim();

  if (!fixtureValue) {

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

  /*
    كنحددو المصدر من prefix ديال ID:

    sofa-123
    espn-123
    tsdb-123
    slug عادي = SportScore
  */

  let source =
    requestedSource;

  if (!source) {

    if (
      fixtureValue
        .toLowerCase()
        .startsWith(
          "sofa-"
        )
    ) {
      source =
        "sofascore";
    }

    else if (
      fixtureValue
        .toLowerCase()
        .startsWith(
          "espn-"
        )
    ) {
      source =
        "espn";
    }

    else if (
      fixtureValue
        .toLowerCase()
        .startsWith(
          "tsdb-"
        )
    ) {
      source =
        "thesportsdb";
    }

    else {
      source =
        "sportscore";
    }

  }

  try {

    /* =================================================
       SOFASCORE
    ================================================= */

    if (
      source ===
      "sofascore"
    ) {

      const details =
        await getSofaDetails(
          fixtureValue
        );

      return output(
        200,
        {
          data:
            details,

          provider:
            "SofaScore"
        }
      );
    }

    /* =================================================
       ESPN
    ================================================= */

    if (
      source ===
      "espn"
    ) {

      const details =
        await getESPNDetails(
          fixtureValue
        );

      return output(
        200,
        {
          data:
            details,

          provider:
            "ESPN"
        }
      );
    }

    /* =================================================
       THE SPORTs DB
    ================================================= */

    if (
      source ===
        "thesportsdb" ||
      source ===
        "tsdb"
    ) {

      const details =
        await getTheSportsDBDetails(
          fixtureValue
        );

      return output(
        200,
        {
          data:
            details,

          provider:
            "TheSportsDB"
        }
      );
    }

    /* =================================================
       SPORTScore
       الكود القديم ديالك
    ================================================= */

    const slug =
      fixtureValue;

    let body;
    let firstError =
      null;

    try {

      body =
        await getJSON(
          `${SPORTSCORE}/match/?sport=football&slug=${encodeURIComponent(
            slug
          )}`
        );

    }

    catch (error) {

      firstError =
        error;

      console.warn(
        "PRIMARY MATCH ENDPOINT FAILED:",
        error.message
      );

      try {

        body =
          await getJSON(
            `${WIDGET}/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}`
          );

      }

      catch (widgetError) {

        console.warn(
          "WIDGET MATCH ENDPOINT FAILED:",
          widgetError.message
        );

        return output(
          widgetError?.status ||
            firstError?.status ||
            502,

          {
            error:
              "Impossible de charger le match",

            details:
              widgetError?.data ||
              firstError?.data ||
              null,

            data:
              []
          }
        );
      }
    }

    const root =
      getDetailRoot(
        body
      );

    if (
      !root ||
      typeof root !==
        "object"
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

    if (!basic) {

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

    const homeTeam =
      normalizeTeam(
        first(
          root?.home_team,
          root?.homeTeam,
          root?.teams?.home,
          basic.teams.home
        ),

        basic.teams.home.name,

        basic.teams.home.logo
      );

    const awayTeam =
      normalizeTeam(
        first(
          root?.away_team,
          root?.awayTeam,
          root?.teams?.away,
          basic.teams.away
        ),

        basic.teams.away.name,

        basic.teams.away.logo
      );

    const lineups =
      getLineups(
        root,
        homeTeam,
        awayTeam
      );

    const events =
      normalizeEvents(
        root
      );

    const statistics =
      normalizeStatistics(
        root,
        homeTeam,
        awayTeam
      );

    const players =
      buildPlayers(
        lineups
      );

    const score =
      obj(
        root?.score
      );

    const homeScore =
      first(
        root?.home_score,
        root?.homeScore,
        score?.home,
        score?.fulltime?.home,
        basic.goals.home,
        null
      );

    const awayScore =
      first(
        root?.away_score,
        root?.awayScore,
        score?.away,
        score?.fulltime?.away,
        basic.goals.away,
        null
      );

    const competition =
      first(
        root?.competition,
        root?.league,
        {}
      );

    const referee =
      first(
        root?.referee,
        basic.fixture.referee,
        null
      );

    const rawStatusText =
      String(
        first(
          root?.status_text,
          root?.status?.long,
          root?.status,
          basic.fixture
            .status.long,
          ""
        )
      ).toLowerCase();

    let statusShort =
      String(
        first(
          root?.status_code,
          root?.short_status,
          root?.status?.short,
          basic.fixture
            .status.short,
          "NS"
        )
      );

    if (
      /live|in play|inplay/.test(
        rawStatusText
      )
    ) {
      statusShort =
        "LIVE";
    }

    else if (
      /half|halftime|ht/.test(
        rawStatusText
      )
    ) {
      statusShort =
        "HT";
    }

    else if (
      /finish|finished|ended|ft/.test(
        rawStatusText
      )
    ) {
      statusShort =
        "FT";
    }

    const details = {

      fixture: {

        id:
          slug,

        slug,

        upstreamId:
          first(
            root?.id,
            root?.match_id,
            root?.fixture_id,
            basic.fixture
              .upstreamId,
            slug
          ),

        date:
          first(
            root?.time,
            root?.date,
            root?.start_time,
            root?.kickoff,
            basic.fixture.date,
            null
          ),

        timezone:
          first(
            root?.timezone,
            null
          ),

        status: {

          short:
            statusShort,

          long:
            first(
              root?.status_text,
              root?.status?.long,
              root?.status,
              basic.fixture
                .status.long,
              "Match"
            ),

          elapsed:
            first(
              root?.minute,
              root?.elapsed,
              root?.status?.elapsed,
              basic.fixture
                .status.elapsed,
              null
            )
        },

        venue:
          first(
            root?.venue,
            basic.fixture
              .venue,
            null
          ),

        referee:
          typeof referee ===
            "object"
            ? first(
                referee?.name,
                ""
              )
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
          nameOf(
            competition
          ) ||
          root?.competition_name ||
          root?.league_name ||
          basic.league.name ||
          "Football",

        country:
          competition?.country ||
          root?.country ||
          basic.league
            .country ||
          "",

        logo:
          imageOf(
            competition
          ) ||
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
      },

      events,

      lineups,

      statistics,

      players,

      provider:
        "SportScore"
    };

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

  catch (error) {

    console.error(
      "MATCH DETAILS ERROR:",
      {
        fixture:
          fixtureValue,

        source,

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
          error?.data ||
          null,

        provider:
          source,

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

      const allLiveMatches =
        [];

      /* -----------------------------------------------
         1. SportScore fixtures
      ----------------------------------------------- */

      try {

        const liveBody =
          await getJSON(
            `${SPORTSCORE}/fixtures/?sport=football&status=live&limit=200`
          );

        allLiveMatches.push(
          ...getMatches(
            liveBody
          )
            .map(
              normalizeMatch
            )
            .filter(Boolean)
        );

      }

      catch (error) {

        console.warn(
          "FIXTURES LIVE ERROR:",
          error.message
        );
      }

      /* -----------------------------------------------
         2. Widget
      ----------------------------------------------- */

      try {

        const widgetBody =
          await getJSON(
            `${WIDGET}/matches/?sport=football&limit=50`
          );

        allLiveMatches.push(
          ...getMatches(
            widgetBody
          )
            .map(
              normalizeMatch
            )
            .filter(Boolean)
        );

      }

      catch (error) {

        console.warn(
          "WIDGET LIVE ERROR:",
          error.message
        );
      }

      /* -----------------------------------------------
         3. Filter LIVE + HT
      ----------------------------------------------- */

      const filtered =
        allLiveMatches.filter(
          match => {

            const status =
              String(
                match?.fixture
                  ?.status?.short ||
                ""
              ).toUpperCase();

            return (
              status ===
                "LIVE" ||
              status ===
                "HT" ||
              status ===
                "1H" ||
              status ===
                "2H" ||
              status ===
                "ET" ||
              status ===
                "P" ||
              status ===
                "BT" ||
              status.includes(
                "LIVE"
              ) ||
              status.includes(
                "HALF"
              )
            );
          }
        );

      /* -----------------------------------------------
         4. DEDUPE
      ----------------------------------------------- */

      const unique =
        new Map();

      filtered.forEach(
        match => {

          const id =
            match?.fixture?.id ||
            match?.fixture?.slug ||
            match?.id ||
            null;

          const home =
            norm(
              match?.teams?.home?.name
            );

          const away =
            norm(
              match?.teams?.away?.name
            );

          const key =
            id
              ? `id:${String(id)}`
              : `teams:${home}__${away}`;

          if (
            !unique.has(
              key
            )
          ) {
            unique.set(
              key,
              match
            );
          }
        }
      );

      const matches =
        Array.from(
          unique.values()
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
       DATE
    ===================================================== */

    const matchDate =
      date ||
      today;

    let body;

    try {

      const [
        upcomingBody,
        finishedBody,
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

      body = {

        matches: [

          ...getMatches(
            upcomingBody
          ),

          ...getMatches(
            finishedBody
          ),

          ...getMatches(
            liveBody
          )
        ]
      };

    }

    catch (error) {

      if (
        matchDate ===
        today
      ) {

        body =
          await getJSON(
            `${SPORTSCORE}/matches/?sport=football&limit=100`
          );

      }

      else {

        try {

          body =
            await getJSON(
              `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
                matchDate
              )}&limit=100`
            );

        }

        catch (secondError) {

          return output(
            secondError?.status ||
              error?.status ||
              502,

            {
              error:
                secondError?.message ||
                error?.message ||
                "API request failed",

              details:
                secondError?.data ||
                error?.data ||
                null,

              data:
                []
            }
          );
        }
      }
    }

    let matches =
      getMatches(
        body
      )
        .map(
          normalizeMatch
        )
        .filter(Boolean);

    /* =====================================================
       BOTOLA PRO EXTRA
    ===================================================== */

    try {

      const botolaBody =
        await getJSON(
          `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
            matchDate
          )}&competition=the-botola-pro&limit=200`
        );

      const botolaMatches =
        getMatches(
          botolaBody
        )
          .map(
            normalizeMatch
          )
          .filter(Boolean);

      matches.push(
        ...botolaMatches
      );

    }

    catch (error) {

      console.warn(
        "BOTOLA PRO ERROR:",
        error.message
      );
    }

    /* =====================================================
       THE SPORTs DB MERGE
    ===================================================== */

    try {

      const tsdbEvents =
        await getTheSportsDBDayMatches(
          matchDate
        );

      const tsdbMatches =
        tsdbEvents
          .map(
            adaptTheSportsDBMatch
          )
          .filter(Boolean);

      const existing =
        new Set();

      matches.forEach(
        match => {

          const home =
            norm(
              match?.teams?.home?.name
            );

          const away =
            norm(
              match?.teams?.away?.name
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

      tsdbMatches.forEach(
        match => {

          const home =
            norm(
              match?.teams?.home?.name
            );

          const away =
            norm(
              match?.teams?.away?.name
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
      );

      console.log(
        "THE SPORTs DB MATCHES:",
        tsdbMatches.length
      );

    }

    catch (error) {

      console.warn(
        "THE SPORTs DB MERGE ERROR:",
        error.message
      );
    }

    /* =====================================================
       SOFASCORE / ESPN WORLD
    ===================================================== */

    try {

      const sofaEvents =
        await getSofaWorldMatches(
          matchDate
        );

      const sofaMatches =
        sofaEvents
          .map(
            event => {

              /*
                SofaScore event
              */
              if (
                event?.homeTeam ||
                event?.awayTeam ||
                event?.tournament
              ) {
                return adaptSofaWorldMatch(
                  event
                );
              }

              /*
                ESPN event
              */
              return event;
            }
          )
          .map(
            event => {

              if (
                event?.provider ===
                "SofaScore"
              ) {
                return normalizeMatch(
                  event
                );
              }

              /* ESPN */
              const competition =
                Array.isArray(
                  event?.competitions
                )
                  ? event.competitions[0]
                  : null;

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
                return null;
              }

              let status =
                "NS";

              const state =
                String(
                  event?.status
                    ?.type?.state ||
                    ""
                ).toLowerCase();

              if (
                state ===
                "in"
              ) {
                status =
                  "LIVE";
              }

              else if (
                state ===
                "post"
              ) {
                status =
                  "FT";
              }

              const leagueName =
                event?.league
                  ?.name ||
                event?.competition
                  ?.name ||
                event?.season
                  ?.displayName ||
                "Football";

              return {

                id:
                  event?.id ||
                  null,

                slug:
                  `espn-${event?.id || ""}`,

                provider:
                  "ESPN",

                home_team: {

                  id:
                    home?.team?.id ||
                    null,

                  name:
                    home?.team
                      ?.displayName ||
                    home?.team
                      ?.name ||
                    "",

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
                    away?.team
                      ?.displayName ||
                    away?.team
                      ?.name ||
                    "",

                  logo:
                    away?.team?.logo ||
                    (
                      away?.team?.id
                        ? `https://a.espncdn.com/i/teamlogos/soccer/500/${away.team.id}.png`
                        : ""
                    )
                },

                league: {

                  id:
                    event?.league
                      ?.id ||
                    null,

                  name:
                    leagueName,

                  logo:
                    event?.league
                      ?.logo ||
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

                status,

                status_text:
                  event?.status
                    ?.type
                    ?.description ||
                  status,

                time:
                  event?.date ||
                  null
              };
            }
          )
          .map(
            normalizeMatch
          )
          .filter(Boolean);

      const existing =
        new Set();

      matches.forEach(
        match => {

          const id =
            match?.fixture?.id ||
            match?.fixture?.slug ||
            match?.id ||
            "";

          const home =
            norm(
              match?.teams?.home?.name
            );

          const away =
            norm(
              match?.teams?.away?.name
            );

          if (id) {
            existing.add(
              `id:${String(id)}`
            );
          }

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

      sofaMatches.forEach(
        match => {

          const id =
            match?.fixture?.id ||
            match?.fixture?.slug ||
            match?.id ||
            "";

          const home =
            norm(
              match?.teams?.home?.name
            );

          const away =
            norm(
              match?.teams?.away?.name
            );

          const exists =
            (
              id &&
              existing.has(
                `id:${String(id)}`
              )
            ) ||
            (
              home &&
              away &&
              existing.has(
                `teams:${home}__${away}`
              )
            );

          if (
            !exists
          ) {

            matches.push(
              match
            );

            if (id) {

              existing.add(
                `id:${String(id)}`
              );
            }

            if (
              home &&
              away
            ) {

              existing.add(
                `teams:${home}__${away}`
              );
            }
          }
        }
      );

      console.log(
        "BAKHIRAFOOT WORLD:",
        sofaMatches.length
      );

    }

    catch (error) {

      console.warn(
        "WORLD MERGE ERROR:",
        error.message
      );
    }

    /* =====================================================
       UEFA NATIONS LEAGUE EXTRA
    ===================================================== */

    try {

      const nationsBody =
        await getJSON(
          `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
            matchDate
          )}&competition=uefa-nations-league&limit=200`
        );

      const nationsMatches =
        getMatches(
          nationsBody
        )
          .map(
            normalizeMatch
          )
          .filter(Boolean);

      const existing =
        new Set(
          matches
            .map(
              match =>
                String(
                  match?.fixture?.id ||
                  match?.fixture?.slug ||
                  match?.id ||
                  ""
                )
            )
            .filter(Boolean)
        );

      nationsMatches.forEach(
        match => {

          const id =
            String(
              match?.fixture?.id ||
              match?.fixture?.slug ||
              match?.id ||
              ""
            );

          if (
            id &&
            !existing.has(
              id
            )
          ) {

            matches.push(
              match
            );

            existing.add(
              id
            );
          }
        }
      );

    }

    catch (error) {

      console.warn(
        "UEFA NATIONS LEAGUE EXTRA:",
        error.message
      );
    }

    /* =====================================================
       HIDE GENERIC STAGES
       Stage ≠ Competition
    ===================================================== */

    const stageNames =
      new Set([
        "fall season",
        "spring season",
        "summer season",
        "winter season",
        "group stage",
        "first round",
        "second round",
        "third round",
        "qualifying round",
        "qualification round",
        "league phase",
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

    for (
      const match of matches
    ) {

      const leagueName =
        String(
          match?.league?.name ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        !stageNames.has(
          leagueName
        )
      ) {
        continue;
      }

      const home =
        norm(
          match?.teams?.home?.name
        );

      const away =
        norm(
          match?.teams?.away?.name
        );

      const matchDateValue =
        toISODate(
          match?.fixture?.date ||
          match?.time
        ) ||
        matchDate;

      if (
        !home ||
        !away
      ) {
        continue;
      }

      const replacement =
        matches.find(
          other => {

            if (
              other ===
              match
            ) {
              return false;
            }

            const otherLeague =
              String(
                other?.league?.name ||
                ""
              )
                .trim()
                .toLowerCase();

            if (
              !otherLeague ||
              stageNames.has(
                otherLeague
              ) ||
              otherLeague ===
                "football"
            ) {
              return false;
            }

            const otherHome =
              norm(
                other?.teams?.home
                  ?.name
              );

            const otherAway =
              norm(
                other?.teams?.away
                  ?.name
              );

            const otherDate =
              toISODate(
                other?.fixture?.date ||
                other?.time
              ) ||
              matchDate;

            return (
              otherHome ===
                home &&
              otherAway ===
                away &&
              otherDate ===
                matchDateValue
            );
          }
        );

      if (
        replacement
      ) {

        match.league = {

          ...match.league,

          name:
            replacement
              ?.league?.name ||
            match.league.name,

          id:
            replacement
              ?.league?.id ||
            match.league.id,

          logo:
            replacement
              ?.league?.logo ||
            match.league.logo,

          country:
            replacement
              ?.league?.country ||
            match.league.country,

          round:
            match.league.round ||
            null
        };
      }
    }

    /* =====================================================
       FINAL DEDUPE
    ===================================================== */

    const finalUnique =
      new Map();

    for (
      const match of matches
    ) {

      const id =
        match?.fixture?.id ||
        match?.fixture?.slug ||
        match?.id ||
        "";

      const home =
        norm(
          match?.teams?.home?.name
        );

      const away =
        norm(
          match?.teams?.away?.name
        );

      const dateValue =
        match?.fixture?.date ||
        match?.time ||
        "";

      const matchDay =
        toISODate(
          dateValue
        ) ||
        matchDate;

      const timestamp =
        dateValue
          ? new Date(
              dateValue
            ).getTime()
          : 0;

      const competitionName =
        norm(
          match?.league?.name ||
          match?.competition?.name ||
          "football"
        );

      /*
        IDs ديال source محددين:
        كنحتافظو بهم.
      */

      if (
        id
      ) {

        const idKey =
          `id:${String(id)}`;

        if (
          !finalUnique.has(
            idKey
          )
        ) {

          finalUnique.set(
            idKey,
            match
          );
        }

        continue;
      }

      /*
        بلا ID:
        الفرق + النهار + البطولة
      */

      if (
        home &&
        away &&
        timestamp
      ) {

        const key =
          `${home}__${away}__${matchDay}__${competitionName}`;

        if (
          !finalUnique.has(
            key
          )
        ) {

          finalUnique.set(
            key,
            match
          );
        }
      }
    }

    matches =
      Array.from(
        finalUnique.values()
      );

    console.log(
      "BAKHIRAFOOT FINAL MATCHES:",
      matches.length
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

  catch (error) {

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
