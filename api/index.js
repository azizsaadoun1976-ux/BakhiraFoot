/* =========================================================
   BAKHIRAFOOT PRO
   SPORTSCORE = LIVE + DATE
   SOFASCORE = MATCH DETAILS / LINEUPS / EVENTS / STATS
========================================================= */

module.exports = async (req, res) => {
  try {
    const { live, date, fixture } = req.query;

    const SPORTSCORE = "https://sportscore.com/api/v1";
    const SOFA = "https://api.sofascore.com/api/v1";

    const today = new Date().toISOString().split("T")[0];

    function output(status, data) {
      res.setHeader(
        "Cache-Control",
        "s-maxage=30, stale-while-revalidate=60"
      );

      res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
      );

      return res.status(status).json(data);
    }

    async function getJSON(url) {
      console.log("API REQUEST:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
          Referer: "https://www.sofascore.com/",
          Origin: "https://www.sofascore.com"
        },
        cache: "no-store"
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        data = {
          raw: text
        };
      }

      if (!response.ok) {
        const error = new Error(
          `HTTP ${response.status} for ${url}`
        );

        error.status = response.status;
        error.data = data;

        throw error;
      }

      return data;
    }

    function arr(value) {
      return Array.isArray(value)
        ? value
        : [];
    }

    function obj(value) {
      return (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      )
        ? value
        : {};
    }

    function text(value) {
      if (typeof value === "string") {
        return value;
      }

      if (typeof value === "number") {
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
          ""
        );
      }

      return "";
    }

    function idOf(value) {
      if (
        typeof value === "string" ||
        typeof value === "number"
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

    function norm(value) {
      return String(value || "")
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
       SPORTScore MATCH NORMALIZER
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
          statusShort = "LIVE";

        } else if (
          statusText.includes(
            "finish"
          ) ||
          statusText.includes(
            "ended"
          ) ||
          statusText === "ft"
        ) {
          statusShort = "FT";

        } else if (
          statusText.includes(
            "half"
          )
        ) {
          statusShort = "HT";

        } else if (
          statusText.includes(
            "postpon"
          )
        ) {
          statusShort = "PST";

        } else if (
          statusText.includes(
            "cancel"
          )
        ) {
          statusShort = "CANC";

        } else {
          statusShort = "NS";
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
            ""

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
            `${SPORTSCORE}/fixtures/?sport=football&date=${encodeURIComponent(
              matchDate
            )}&limit=200`
          );

      } catch (error) {

        if (
          matchDate ===
          today
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
       FIND MATCH IN SOFASCORE BY TEAMS + DATE
    ===================================================== */

    function toISODate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Date object
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().split("T")[0];
  }

  // Numeric timestamp
  if (typeof value === "number") {
    const ms =
      value < 10000000000
        ? value * 1000
        : value;

    const d = new Date(ms);

    if (Number.isNaN(d.getTime())) return null;

    return d.toISOString().split("T")[0];
  }

  const str = String(value).trim();

  // YYYY-MM-DD or ISO date
  const isoMatch =
    str.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoMatch) {
    return isoMatch[1];
  }

  // Numeric timestamp stored as string
  if (/^\d+$/.test(str)) {
    const num = Number(str);

    const ms =
      num < 10000000000
        ? num * 1000
        : num;

    const d = new Date(ms);

    if (Number.isNaN(d.getTime())) return null;

    return d.toISOString().split("T")[0];
  }

  // Any other valid date string
  const d = new Date(str);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d.toISOString().split("T")[0];
} 
   async function findSofaEvent(
  homeName,
  awayName,
  isoDate
) {
  const wantedHome = norm(homeName);
  const wantedAway = norm(awayName);

  const baseISO =
    toISODate(isoDate) ||
    today;

  const baseDate =
    new Date(`${baseISO}T12:00:00Z`);

  if (Number.isNaN(baseDate.getTime())) {
    console.warn(
      "INVALID SOFASCORE BASE DATE:",
      isoDate
    );

    return null;
  }

  const dates = [];

  for (let offset = -1; offset <= 1; offset++) {
    const d = new Date(baseDate);

    d.setUTCDate(
      d.getUTCDate() + offset
    );

    dates.push(
      d.toISOString().split("T")[0]
    );
  }

  console.log(
    "SOFASCORE SEARCH:",
    {
      home: wantedHome,
      away: wantedAway,
      dates
    }
  );

  for (const d of dates) {
    try {
      const body = await getJSON(
        `${SOFA}/sport/football/scheduled-events/${d}`
      );

      const events = arr(
        body?.events
      );

      console.log(
        "SOFASCORE EVENTS:",
        d,
        events.length
      );

      // 1. Exact match
      const exact = events.find(event => {
        const home = norm(
          event?.homeTeam?.name
        );

        const away = norm(
          event?.awayTeam?.name
        );

        return (
          home === wantedHome &&
          away === wantedAway
        );
      });

      if (exact) {
        console.log(
          "SOFASCORE EXACT MATCH:",
          exact.id,
          exact.homeTeam?.name,
          exact.awayTeam?.name
        );

        return exact;
      }

      // 2. Fuzzy match
      const fuzzy = events.find(event => {
        const home = norm(
          event?.homeTeam?.name
        );

        const away = norm(
          event?.awayTeam?.name
        );

        const homeOk =
          home.includes(wantedHome) ||
          wantedHome.includes(home);

        const awayOk =
          away.includes(wantedAway) ||
          wantedAway.includes(away);

        return homeOk && awayOk;
      });

      if (fuzzy) {
        console.log(
          "SOFASCORE FUZZY MATCH:",
          fuzzy.id,
          fuzzy.homeTeam?.name,
          fuzzy.awayTeam?.name
        );

        return fuzzy;
      }

    } catch (error) {
      console.warn(
        "SOFASCORE SCHEDULE ERROR:",
        d,
        error.message
      );
    }
  }

  console.warn(
    "SOFASCORE MATCH NOT FOUND:",
    homeName,
    "vs",
    awayName,
    baseISO
  );

  return null;
}

    /* =====================================================
       PLAYER NORMALIZATION
    ===================================================== */

    function normalizeSofaPlayer(
      row
    ) {

      const player =
        row?.player ||
        row ||
        {};

      const stat =
        row?.statistics?.[0] ||
        row?.statistics ||
        {};

      const games =
        stat?.games ||
        {};

      return {

        player: {

          id:
            player?.id ||
            null,

          name:
            player?.name ||
            player?.shortName ||
            row?.playerName ||
            "Joueur",

          number:
            row?.shirtNumber ??
            row?.jerseyNumber ??
            player?.shirtNumber ??
            player?.jerseyNumber ??
            null,

          pos:
            row?.position ||
            player?.position ||
            "",

          grid:
            row?.positionGrid ||
            row?.grid ||
            "",

          photo:
            player?.picture ||
            player?.image ||
            ""

        },

        rating:
          row?.rating ??
          stat?.rating ??
          games?.rating ??
          null,

        games: {

          rating:
            row?.rating ??
            stat?.rating ??
            games?.rating ??
            null,

          minutes:
            row?.minutesPlayed ??
            row?.minutes ??
            games?.minutes ??
            null,

          position:
            row?.position ||
            player?.position ||
            "",

          substitute:
            row?.substitute === true ||
            row?.starter === false,

          captain:
            row?.captain === true

        },

        goals: {

          total:
            row?.statistics?.[0]?.goals?.total ??
            row?.goals?.total ??
            0,

          assists:
            row?.statistics?.[0]?.goals?.assists ??
            row?.goals?.assists ??
            0

        },

        cards: {

          yellow:
            row?.statistics?.[0]?.cards?.yellow ??
            row?.cards?.yellow ??
            0,

          red:
            row?.statistics?.[0]?.cards?.red ??
            row?.cards?.red ??
            0

        },

        passes: {

          key:
            row?.statistics?.[0]?.passes?.key ??
            row?.passes?.key ??
            0

        },

        shots: {

          total:
            row?.statistics?.[0]?.shots?.total ??
            row?.shots?.total ??
            0,

          on:
            row?.statistics?.[0]?.shots?.on ??
            row?.shots?.on ??
            0

        }

      };
    }

    /* =====================================================
       LINEUPS
    ===================================================== */

    function normalizeSofaLineup(
      side,
      team
    ) {

      if (
        !side ||
        typeof side !== "object"
      ) {
        return null;
      }

      let allPlayers =
        arr(
          side?.players
        );

      if (
        !allPlayers.length
      ) {

        allPlayers = [

          ...arr(
            side?.startingLineup
          ),

          ...arr(
            side?.substitutes
          )

        ];

      }

      const startXI =
        allPlayers
          .filter(
            row => {

              if (
                row?.substitute ===
                true
              ) {
                return false;
              }

              if (
                row?.starter ===
                false
              ) {
                return false;
              }

              return true;
            }
          )
          .map(
            normalizeSofaPlayer
          );

      const substitutes =
        allPlayers
          .filter(
            row =>
              row?.substitute ===
                true ||
              row?.starter ===
                false
          )
          .map(
            normalizeSofaPlayer
          );

      return {

        team: {

          id:
            team?.id ||
            side?.team?.id ||
            null,

          name:
            team?.name ||
            side?.team?.name ||
            "",

          logo:
            team?.logo ||
            team?.picture ||
            side?.team?.logo ||
            ""

        },

        formation:
          side?.formation ||
          side?.formationUsed ||
          side?.tacticalFormation ||
          "—",

        coach:
          side?.manager ||
          side?.coach ||
          null,

        startXI,

        substitutes

      };
    }

    /* =====================================================
       INCIDENTS
    ===================================================== */

    function normalizeIncidents(
      body,
      sofaEvent
    ) {

      const incidents =
        arr(
          body?.incidents
        );

      return incidents.map(
        incident => {

          const isHome =
            incident?.isHome ===
            true;

          const player =
            incident?.player ||
            {};

          const assist =
            incident?.assist1 ||
            incident?.assist ||
            incident?.relatedPlayer ||
            {};

          let type =
            incident?.incidentType ||
            incident?.type ||
            "Other";

          let detail =
            incident?.incidentClass ||
            incident?.incidentClassName ||
            incident?.reason ||
            "";

          let playerName =
            player?.name ||
            incident?.playerName ||
            "";

          if (
            type ===
            "substitution"
          ) {

            const playerIn =
              incident?.playerIn?.name ||
              incident?.playerInName ||
              "";

            const playerOut =
              incident?.playerOut?.name ||
              incident?.playerOutName ||
              playerName ||
              "";

            playerName =
              playerOut ||
              playerIn ||
              "Substitution";

            detail =
              playerIn
                ? `Entrée : ${playerIn}`
                : "Changement";

          }

          if (
            type ===
            "card"
          ) {

            if (
              incident?.incidentClass ===
              "red"
            ) {

              detail =
                "red";

            } else if (
              incident?.incidentClass ===
                "yellowRed" ||
              incident?.incidentClass ===
                "yellow-red"
            ) {

              detail =
                "yellow-red";

            } else {

              detail =
                "yellow";

            }

          }

          return {

            time: {

              elapsed:
                incident?.time ??
                incident?.minute ??
                null,

              extra:
                incident?.addedTime ??
                null

            },

            team: {

              id:
                isHome
                  ? sofaEvent?.homeTeam?.id ||
                    null
                  : sofaEvent?.awayTeam?.id ||
                    null,

              name:
                isHome
                  ? sofaEvent?.homeTeam?.name ||
                    ""
                  : sofaEvent?.awayTeam?.name ||
                    ""

            },

            player: {

              id:
                player?.id ||
                null,

              name:
                playerName

            },

            assist: {

              id:
                assist?.id ||
                null,

              name:
                assist?.name ||
                ""

            },

            type,

            detail

          };

        }
      );

    }

    /* =====================================================
       STATISTICS
    ===================================================== */

    function normalizeStatistics(
      body,
      sofaEvent
    ) {

      const periods =
        arr(
          body?.statistics
        );

      const all =
        periods.find(
          block =>
            String(
              block?.period ||
              ""
            ).toUpperCase() ===
            "ALL"
        ) ||
        periods[0] ||
        {};

      const homeStats =
        [];

      const awayStats =
        [];

      for (
        const group of
        arr(
          all?.groups
        )
      ) {

        for (
          const item of
          arr(
            group?.statisticsItems
          )
        ) {

          const name =
            item?.name ||
            item?.key ||
            "Stat";

          const homeValue =
            item?.home ??
            item?.homeValue ??
            "-";

          const awayValue =
            item?.away ??
            item?.awayValue ??
            "-";

          homeStats.push({

            type:
              name,

            value:
              homeValue

          });

          awayStats.push({

            type:
              name,

            value:
              awayValue

          });

        }

      }

      return [

        {

          team: {

            id:
              sofaEvent?.homeTeam?.id ||
              null,

            name:
              sofaEvent?.homeTeam?.name ||
              "Domicile"

          },

          statistics:
            homeStats

        },

        {

          team: {

            id:
              sofaEvent?.awayTeam?.id ||
              null,

            name:
              sofaEvent?.awayTeam?.name ||
              "Extérieur"

          },

          statistics:
            awayStats

        }

      ];
    }

    /* =====================================================
       PLAYER GROUPS
    ===================================================== */

    function buildPlayerGroups(
      homeLineup,
      awayLineup
    ) {

      return [
        homeLineup,
        awayLineup
      ]
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
        "DETAILS REQUESTED:",
        slug
      );

      /* -----------------------------------------------
         SPORTScore basic data
      ----------------------------------------------- */

      let sportBody;

      try {

        sportBody =
          await getJSON(
            `${SPORTSCORE}/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}`
          );

      } catch (
        error
      ) {

        sportBody =
          await getJSON(
            `https://sportscore.com/api/widget/match/?sport=football&slug=${encodeURIComponent(
              slug
            )}`
          );

      }

      const sportMatch =
        sportBody?.match ||
        sportBody?.data?.match ||
        sportBody?.data ||
        sportBody;

      const basic =
        normalizeMatch(
          sportMatch
        );

      if (!basic) {

        return output(
          404,
          {

            error:
              "Match introuvable",

            data: []

          }
        );

      }

      /* -----------------------------------------------
         Find same match in SofaScore
      ----------------------------------------------- */

      const sofaEvent =
        await findSofaEvent(

          basic?.teams?.home?.name ||
          "",

          basic?.teams?.away?.name ||
          "",

         toISODate(
  basic?.fixture?.date
) || today

        );

      /*
         SofaScore unavailable:
         fallback to SportScore basic/event data.
      */

      if (
        !sofaEvent?.id
      ) {

        return output(
          200,
          {

            data: {

              ...basic,

              events:
                arr(
                  sportMatch?.events
                ),

              lineups:
                [],

              statistics:
                [],

              players:
                [],

              detailStatus:
                "SofaScore event not found"

            },

            provider:
              "SportScore"

          }
        );

      }

      const eventId =
        sofaEvent.id;

      console.log(
        "SOFASCORE EVENT ID:",
        eventId
      );

      /* -----------------------------------------------
         Fetch all detailed data
      ----------------------------------------------- */

      const [
        sofaEventBody,
        lineupBody,
        incidentBody,
        statisticsBody
      ] =
        await Promise.all([

          getJSON(
            `${SOFA}/event/${eventId}`
          ).catch(
            () => ({})
          ),

          getJSON(
            `${SOFA}/event/${eventId}/lineups`
          ).catch(
            () => ({})
          ),

          getJSON(
            `${SOFA}/event/${eventId}/incidents`
          ).catch(
            () => ({})
          ),

          getJSON(
            `${SOFA}/event/${eventId}/statistics`
          ).catch(
            () => ({})
          )

        ]);

      const eventCore =
        sofaEventBody?.event ||
        sofaEvent;

      /* -----------------------------------------------
         REAL TEAMS
      ----------------------------------------------- */

      const homeTeam = {

        id:
          eventCore?.homeTeam?.id ||
          sofaEvent?.homeTeam?.id ||
          basic.teams.home.id ||
          null,

        name:
          eventCore?.homeTeam?.name ||
          sofaEvent?.homeTeam?.name ||
          basic.teams.home.name,

        logo:
          eventCore?.homeTeam?.logo ||
          eventCore?.homeTeam?.image ||
          basic.teams.home.logo ||
          ""

      };

      const awayTeam = {

        id:
          eventCore?.awayTeam?.id ||
          sofaEvent?.awayTeam?.id ||
          basic.teams.away.id ||
          null,

        name:
          eventCore?.awayTeam?.name ||
          sofaEvent?.awayTeam?.name ||
          basic.teams.away.name,

        logo:
          eventCore?.awayTeam?.logo ||
          eventCore?.awayTeam?.image ||
          basic.teams.away.logo ||
          ""

      };

      /* -----------------------------------------------
         LINEUPS
      ----------------------------------------------- */

      const homeLineup =
        normalizeSofaLineup(
          lineupBody?.home,
          homeTeam
        );

      const awayLineup =
        normalizeSofaLineup(
          lineupBody?.away,
          awayTeam
        );

      const lineups = [

        homeLineup,

        awayLineup

      ].filter(Boolean);

      /* -----------------------------------------------
         EVENTS
      ----------------------------------------------- */

      const events =
        normalizeIncidents(
          incidentBody,
          {
            ...sofaEvent,
            ...eventCore
          }
        );

      /* -----------------------------------------------
         STATS
      ----------------------------------------------- */

      const statistics =
        normalizeStatistics(
          statisticsBody,
          {
            ...sofaEvent,
            ...eventCore
          }
        );

      /* -----------------------------------------------
         PLAYERS
      ----------------------------------------------- */

      const players =
        buildPlayerGroups(
          homeLineup,
          awayLineup
        );

      /* -----------------------------------------------
         SCORE
      ----------------------------------------------- */

      const homeScore =
        eventCore?.homeScore?.current ??
        eventCore?.homeScore?.display ??
        basic.goals.home ??
        null;

      const awayScore =
        eventCore?.awayScore?.current ??
        eventCore?.awayScore?.display ??
        basic.goals.away ??
        null;

      /* -----------------------------------------------
         STATUS
      ----------------------------------------------- */

      let statusShort =
        "NS";

      if (
        eventCore?.status?.type ===
        "finished"
      ) {

        statusShort =
          "FT";

      } else if (
        eventCore?.status?.type ===
        "inprogress"
      ) {

        statusShort =
          "LIVE";

      } else if (
        eventCore?.status?.type ===
        "postponed"
      ) {

        statusShort =
          "PST";

      }

      /* -----------------------------------------------
         FINAL RESPONSE
      ----------------------------------------------- */

      const finalDetails = {

        fixture: {

          id:
            slug,

          slug,

          upstreamId:
            eventId,

          date:
            eventCore?.startTimestamp
              ? new Date(
                  eventCore.startTimestamp *
                  1000
                ).toISOString()
              : basic.fixture.date ||
                null,

          timezone:
            "UTC",

          status: {

            short:
              statusShort,

            long:
              eventCore?.status?.description ||
              eventCore?.status?.type ||
              basic.fixture.status.long ||
              "Match",

            elapsed:
              eventCore?.status?.period1Elapsed ||
              eventCore?.status?.period2Elapsed ||
              null

          },

          venue:
            eventCore?.venue ||
            basic.fixture.venue ||
            null,

          referee:
            eventCore?.referee?.name ||
            basic.fixture.referee ||
            null

        },

        league: {

          id:
            eventCore?.tournament?.uniqueTournament?.id ||
            eventCore?.tournament?.id ||
            basic.league.id ||
            null,

          name:
            eventCore?.tournament?.uniqueTournament?.name ||
            eventCore?.tournament?.name ||
            basic.league.name,

          country:
            eventCore?.tournament?.category?.name ||
            basic.league.country ||
            "",

          logo:
            basic.league.logo ||
            "",

          round:
            eventCore?.roundInfo?.name ||
            eventCore?.roundInfo?.round ||
            null,

          season:
            eventCore?.season?.name ||
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
              eventCore?.homeScore?.period1 ??
              null,

            away:
              eventCore?.awayScore?.period1 ??
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

        sofascore: {

          eventId

        },

        provider:
          "SportScore + SofaScore"

      };

      console.log(
        "DETAILS RESULT:",
        JSON.stringify(
          {

            eventId,

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

      return output(
        200,
        {

          data:
            finalDetails,

          provider:
            "SportScore + SofaScore"

        }
      );
    }

    return output(
      400,
      {

        error:
          "Invalid request",

        data: []

      }
    );

  } catch (error) {

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

        data: []

      }
    );
  }
};
