module.exports = async (req, res) => {
  try {
    const fixture = String(req.query?.fixture || "").trim();

    if (!fixture) {
      return res.status(400).json({
        error: "Fixture manquant",
        data: []
      });
    }

    const urls = [
      `https://sportscore.com/api/v1/match/?sport=football&slug=${encodeURIComponent(fixture)}&src=bakhira-foot.vercel.app`,
      `https://sportscore.com/api/widget/match/?sport=football&slug=${encodeURIComponent(fixture)}&src=bakhira-foot.vercel.app`
    ];

    let body = null;
    let lastError = null;

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36"
          },
          cache: "no-store"
        });

        const raw = await response.text();

        let json;

        try {
          json = JSON.parse(raw);
        } catch {
          json = null;
        }

        if (!response.ok || !json) {
          throw new Error(`HTTP ${response.status}`);
        }

        body = json;
        break;

      } catch (error) {
        lastError = error;
      }
    }

    if (!body) {
      return res.status(502).json({
        error:
          lastError?.message ||
          "SportScore indisponible",
        data: []
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

    /* =====================================================
       HELPERS
    ===================================================== */

    function arr(value) {
      return Array.isArray(value) ? value : [];
    }

    function first(...values) {
      for (const value of values) {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          return value;
        }
      }
      return null;
    }

    function text(value) {
      if (typeof value === "string") return value;
      if (typeof value === "number") return String(value);

      if (
        value &&
        typeof value === "object"
      ) {
        return first(
          value.name,
          value.full_name,
          value.fullName,
          value.title
        ) || "";
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
        return first(
          value.id,
          value.team_id,
          value.player_id
        );
      }

      return null;
    }

    function normalizeName(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function findValue(obj, keys, depth = 0) {
      if (!obj || typeof obj !== "object" || depth > 6) {
        return null;
      }

      for (const key of keys) {
        if (
          Object.prototype.hasOwnProperty.call(obj, key) &&
          obj[key] !== undefined &&
          obj[key] !== null
        ) {
          return obj[key];
        }
      }

      for (const value of Object.values(obj)) {
        if (
          value &&
          typeof value === "object"
        ) {
          const found =
            findValue(
              value,
              keys,
              depth + 1
            );

          if (found !== null) {
            return found;
          }
        }
      }

      return null;
    }

    function normalizeTeam(raw, fallbackName) {
      raw = raw || {};

      return {
        id: first(
          raw.id,
          raw.team_id
        ),

        name:
          text(raw) ||
          fallbackName ||
          "Équipe",

        logo:
          first(
            raw.logo,
            raw.image,
            raw.picture,
            raw.photo
          ) || ""
      };
    }

    /* =====================================================
       TEAMS
    ===================================================== */

    const rawHome =
      first(
        root?.home_team,
        root?.homeTeam,
        root?.teams?.home,
        root?.home
      ) || {};

    const rawAway =
      first(
        root?.away_team,
        root?.awayTeam,
        root?.teams?.away,
        root?.away
      ) || {};

    const homeTeam =
      normalizeTeam(
        rawHome,
        root?.home_name || "Domicile"
      );

    const awayTeam =
      normalizeTeam(
        rawAway,
        root?.away_name || "Extérieur"
      );

    /* =====================================================
       SCORE
    ===================================================== */

    const score =
      root?.score || {};

    const homeScore =
      first(
        root?.home_score,
        root?.homeScore,
        score?.home,
        score?.fulltime?.home
      );

    const awayScore =
      first(
        root?.away_score,
        root?.awayScore,
        score?.away,
        score?.fulltime?.away
      );

    /* =====================================================
       STATUS
    ===================================================== */

    const rawStatus =
      root?.status;

    const statusText =
      String(
        root?.status_text ||
        root?.status?.text ||
        root?.status?.description ||
        root?.status ||
        ""
      ).toLowerCase();

    let statusShort =
      root?.status_code ||
      root?.short_status ||
      "";

    if (!statusShort) {
      if (
        statusText.includes("live") ||
        statusText.includes("in play") ||
        statusText.includes("inplay")
      ) {
        statusShort = "LIVE";
      } else if (
        statusText.includes("half")
      ) {
        statusShort = "HT";
      } else if (
        statusText.includes("finish") ||
        statusText.includes("ended") ||
        statusText === "ft"
      ) {
        statusShort = "FT";
      } else if (
        statusText.includes("postpon")
      ) {
        statusShort = "PST";
      } else {
        statusShort = "NS";
      }
    }

    const elapsed =
      first(
        root?.minute,
        root?.elapsed,
        root?.status?.elapsed,
        root?.status?.minute
      );

    /* =====================================================
       EVENTS
    ===================================================== */

    const rawEvents =
      first(
        root?.events,
        root?.timeline,
        root?.incidents,
        root?.match_events,
        findValue(
          root,
          [
            "events",
            "timeline",
            "incidents"
          ]
        )
      );

    const events =
      arr(rawEvents).map(event => {

        const player =
          event?.player || {};

        const assist =
          event?.assist ||
          event?.assist1 ||
          event?.relatedPlayer ||
          {};

        const team =
          event?.team || {};

        return {
          time: {
            elapsed:
              first(
                event?.time?.elapsed,
                event?.minute,
                event?.time
              ),

            extra:
              first(
                event?.time?.extra,
                event?.addedTime,
                event?.extra
              )
          },

          team: {
            id:
              first(
                team?.id,
                event?.team_id
              ),

            name:
              first(
                team?.name,
                event?.team_name
              ) || ""
          },

          player: {
            id:
              first(
                player?.id,
                event?.player_id
              ),

            name:
              first(
                player?.name,
                event?.player_name
              ) || ""
          },

          assist: {
            id:
              first(
                assist?.id,
                event?.assist_id
              ),

            name:
              first(
                assist?.name,
                event?.assist_name
              ) || ""
          },

          type:
            first(
              event?.type,
              event?.incidentType,
              event?.event_type
            ) || "Other",

          detail:
            first(
              event?.detail,
              event?.incidentClass,
              event?.reason,
              event?.description
            ) || ""
        };
      });

    /* =====================================================
       LINEUPS
    ===================================================== */

    const rawLineups =
      first(
        root?.lineups,
        root?.lineup,
        root?.compositions,
        root?.formations,
        findValue(
          root,
          [
            "lineups",
            "lineup",
            "compositions"
          ]
        )
      );

    function normalizePlayer(item) {
      const player =
        item?.player ||
        item ||
        {};

      return {
        player: {
          id:
            first(
              player?.id,
              item?.player_id
            ),

          name:
            first(
              player?.name,
              item?.name
            ) || "Joueur",

          number:
            first(
              item?.shirtNumber,
              item?.jerseyNumber,
              item?.number,
              player?.shirtNumber,
              player?.jerseyNumber
            ),

          pos:
            first(
              item?.position,
              item?.pos,
              player?.position,
              player?.pos
            ) || "",

          grid:
            first(
              item?.grid,
              item?.positionGrid,
              player?.grid
            ) || "",

          photo:
            first(
              player?.picture,
              player?.image,
              player?.photo,
              item?.photo
            ) || ""
        },

        rating:
          first(
            item?.rating,
            item?.performance?.rating,
            item?.statistics?.rating
          ),

        games: {
          rating:
            first(
              item?.rating,
              item?.performance?.rating
            ),

          minutes:
            first(
              item?.minutes,
              item?.minutesPlayed
            ),

          position:
            first(
              item?.position,
              item?.pos
            ) || "",

          substitute:
            item?.substitute === true ||
            item?.starter === false,

          captain:
            item?.captain === true
        },

        goals: {
          total:
            first(
              item?.goals?.total,
              item?.goals
            ) || 0,

          assists:
            first(
              item?.goals?.assists,
              item?.assists
            ) || 0
        },

        cards: {
          yellow:
            first(
              item?.cards?.yellow,
              item?.yellow
            ) || 0,

          red:
            first(
              item?.cards?.red,
              item?.red
            ) || 0
        },

        passes: {
          key:
            first(
              item?.passes?.key,
              item?.key_passes
            ) || 0
        },

        shots: {
          total:
            first(
              item?.shots?.total,
              item?.shots
            ) || 0,

          on:
            first(
              item?.shots?.on,
              item?.shots_on_target
            ) || 0
        }
      };
    }

    function normalizeLineup(
      source,
      team
    ) {
      if (
        !source ||
        typeof source !== "object"
      ) {
        return null;
      }

      const sourceTeam =
        source?.team || {};

      const lineupTeam = {
        id:
          first(
            sourceTeam?.id,
            team?.id
          ),

        name:
          first(
            sourceTeam?.name,
            team?.name
          ) || "",

        logo:
          first(
            sourceTeam?.logo,
            team?.logo
          ) || ""
      };

      let starters =
        first(
          source?.startXI,
          source?.startingXI,
          source?.startingLineup,
          source?.starting_xi,
          source?.starters,
          source?.players
        );

      let substitutes =
        first(
          source?.substitutes,
          source?.bench,
          source?.substitution
        );

      starters =
        arr(starters);

      substitutes =
        arr(substitutes);

      const startXI =
        starters
          .filter(player => {
            if (
              player?.substitute === true
            ) {
              return false;
            }

            if (
              player?.starter === false
            ) {
              return false;
            }

            return true;
          })
          .map(normalizePlayer);

      const bench =
        substitutes.map(
          normalizePlayer
        );

      return {
        team: lineupTeam,

        formation:
          first(
            source?.formation,
            source?.formationUsed,
            source?.tacticalFormation,
            source?.tactics?.formation
          ) || "—",

        coach:
          first(
            source?.coach,
            source?.manager
          ) || null,

        startXI,

        substitutes:
          bench
      };
    }

    let lineups = [];

    if (
      Array.isArray(rawLineups)
    ) {

      lineups =
        rawLineups
          .map((item, index) => {

            const itemTeam =
              item?.team || {};

            const itemTeamId =
              itemTeam?.id;

            const isAway =
              awayTeam.id &&
              itemTeamId &&
              String(awayTeam.id) ===
                String(itemTeamId);

            const team =
              isAway
                ? awayTeam
                : index === 1
                  ? awayTeam
                  : homeTeam;

            return normalizeLineup(
              item,
              team
            );
          })
          .filter(Boolean);

    } else if (
      rawLineups &&
      typeof rawLineups === "object"
    ) {

      const homeSource =
        first(
          rawLineups?.home,
          rawLineups?.homeTeam,
          rawLineups?.host
        );

      const awaySource =
        first(
          rawLineups?.away,
          rawLineups?.awayTeam,
          rawLineups?.guest
        );

      if (homeSource) {
        const item =
          normalizeLineup(
            homeSource,
            homeTeam
          );

        if (item) lineups.push(item);
      }

      if (awaySource) {
        const item =
          normalizeLineup(
            awaySource,
            awayTeam
          );

        if (item) lineups.push(item);
      }
    }

    /* =====================================================
       STATISTICS
    ===================================================== */

    const rawStatistics =
      first(
        root?.statistics,
        root?.stats,
        findValue(
          root,
          [
            "statistics",
            "stats"
          ]
        )
      );

    let statistics = [];

    if (
      Array.isArray(
        rawStatistics
      )
    ) {

      if (
        rawStatistics[0]?.groups
      ) {

        const block =
          rawStatistics.find(
            item =>
              String(
                item?.period || ""
              ).toUpperCase() ===
              "ALL"
          ) ||
          rawStatistics[0];

        const homeStats = [];
        const awayStats = [];

        arr(
          block?.groups
        ).forEach(group => {

          arr(
            group?.statisticsItems
          ).forEach(item => {

            const name =
              first(
                item?.name,
                item?.key
              ) || "Stat";

            homeStats.push({
              type: name,
              value:
                first(
                  item?.home,
                  item?.homeValue
                ) ?? "-"
            });

            awayStats.push({
              type: name,
              value:
                first(
                  item?.away,
                  item?.awayValue
                ) ?? "-"
            });
          });

        });

        statistics = [
          {
            team: homeTeam,
            statistics: homeStats
          },
          {
            team: awayTeam,
            statistics: awayStats
          }
        ];

      } else {

        statistics =
          rawStatistics
            .slice(0, 2)
            .map(
              (block, index) => {

                const values =
                  arr(
                    block?.statistics ||
                    block?.stats
                  ).map(
                    item => ({
                      type:
                        first(
                          item?.type,
                          item?.name
                        ) || "Stat",

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
       VENUE / REFEREE
    ===================================================== */

    const venue =
      first(
        root?.venue,
        root?.stadium
      ) || null;

    const referee =
      typeof root?.referee === "object"
        ? root?.referee?.name || ""
        : root?.referee || "";

    /* =====================================================
       COMPETITION
    ===================================================== */

    const competition =
      first(
        root?.competition,
        root?.league
      ) || {};

    /* =====================================================
       RESULT
    ===================================================== */

    const details = {

      fixture: {

        id: fixture,

        slug: fixture,

        upstreamId:
          first(
            root?.id,
            root?.match_id,
            root?.fixture_id
          ),

        date:
          first(
            root?.time,
            root?.date,
            root?.start_time,
            root?.kickoff
          ),

        timezone:
          root?.timezone ||
          "UTC",

        status: {

          short:
            statusShort,

          long:
            root?.status_text ||
            root?.status?.description ||
            root?.status ||
            "Match",

          elapsed:
            elapsed
        },

        venue,

        referee
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

      players:
        lineups.map(
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
        ),

      sportscore: {
        matchSlug:
          fixture
      },

      provider:
        "SportScore"
    };

    return res.status(200).json({
      data: details,
      provider: "SportScore"
    });

  } catch (error) {

    console.error(
      "MATCH DETAILS ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Match details failed",
      data: []
    });
  }
};
