const RANKED_MODES = ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'] as const
const BANNED_STATUSES = ['BANNED', 'SUSPENDED', 'DELETED'] as const

const GLICKO_RATING = 1_750
const GLICKO_RD_INITIAL = 350
const GLICKO_RD_RESET_FACTOR = 75
const GRANDWEAVER_COUNT = 100

type RankedMode = (typeof RANKED_MODES)[number]
type ResetKind = 'SOFT' | 'HARD'

interface ResetCycle {
  id: number
  season: number
  week: number
  status: string
}

interface HardResetDefinition {
  rank: string
  stage: string
  resetValue: number
}

const HARD_RESET_DEFINITIONS: readonly HardResetDefinition[] = [
  { rank: 'TRAINEE', stage: 'STAGE_I', resetValue: 300 },
  { rank: 'TRAINEE', stage: 'STAGE_II', resetValue: 350 },
  { rank: 'TRAINEE', stage: 'STAGE_III', resetValue: 400 },
  { rank: 'APPRENTICE', stage: 'STAGE_I', resetValue: 600 },
  { rank: 'APPRENTICE', stage: 'STAGE_II', resetValue: 650 },
  { rank: 'APPRENTICE', stage: 'STAGE_III', resetValue: 700 },
  { rank: 'EXPERT', stage: 'STAGE_I', resetValue: 750 },
  { rank: 'EXPERT', stage: 'STAGE_II', resetValue: 800 },
  { rank: 'EXPERT', stage: 'STAGE_III', resetValue: 850 },
  { rank: 'MASTER', stage: 'STAGE_NONE', resetValue: 900 },
  { rank: 'GRANDWEAVER', stage: 'STAGE_NONE', resetValue: 1_000 }
]

const rankForScore = (score: number): { rank: string; stage: string } => {
  if (score >= 1_200) return { rank: 'MASTER', stage: 'STAGE_NONE' }
  const bands = [
    [1_100, 'EXPERT', 'STAGE_III'],
    [1_000, 'EXPERT', 'STAGE_II'],
    [900, 'EXPERT', 'STAGE_I'],
    [800, 'APPRENTICE', 'STAGE_III'],
    [700, 'APPRENTICE', 'STAGE_II'],
    [600, 'APPRENTICE', 'STAGE_I'],
    [500, 'TRAINEE', 'STAGE_III'],
    [400, 'TRAINEE', 'STAGE_II'],
    [300, 'TRAINEE', 'STAGE_I'],
    [200, 'WANDERER', 'STAGE_III'],
    [100, 'WANDERER', 'STAGE_II']
  ] as const
  const band = bands.find(([minimum]) => score >= minimum)
  return band
    ? { rank: band[1], stage: band[2] }
    : { rank: 'WANDERER', stage: 'STAGE_I' }
}

const receiptExists = (claimToken: string) =>
  `EXISTS (
    SELECT 1 FROM leaderboard_rank_reset_receipts receipt
    WHERE receipt.cycle_id = ? AND receipt.claim_token = '${claimToken}'
  )`

const activeAccount = `EXISTS (
  SELECT 1 FROM player_account_settings settings
  WHERE settings.user_id = player_account_stats.user_id
    AND settings.account_status NOT IN (${BANNED_STATUSES.map(
      status => `'${status}'`
    ).join(', ')})
)`

const validRankState = (column = 'player_rank_state') =>
  `${column} <> '' AND json_valid(${column})
   AND json_type(${column}) = 'array'
   AND json_array_length(${column}) = 4`

const grandweaverStatements = (
  database: D1Database,
  cycleId: number,
  claimToken: string,
  season: number
): D1PreparedStatement[] =>
  RANKED_MODES.flatMap(mode => [
    database
      .prepare(
        `UPDATE player_account_stats
         SET player_rank = 'MASTER'
         WHERE game_mode = ? AND season = ?
           AND player_rank IN ('MASTER', 'GRANDWEAVER')
           AND ${activeAccount}
           AND ${receiptExists(claimToken)}`
      )
      .bind(mode, season, cycleId),
    database
      .prepare(
        `UPDATE player_account_stats SET player_rank = 'GRANDWEAVER'
         WHERE rowid IN (
           SELECT stats.rowid FROM player_account_stats stats
           JOIN player_account_settings settings
             ON settings.user_id = stats.user_id
           WHERE stats.game_mode = ? AND stats.season = ?
             AND stats.player_rank = 'MASTER'
             AND settings.account_status NOT IN (
               'BANNED', 'SUSPENDED', 'DELETED'
             )
             AND ${receiptExists(claimToken)}
           ORDER BY stats.score DESC, stats.updated_at ASC, stats.user_id ASC
           LIMIT ${GRANDWEAVER_COUNT}
         )`
      )
      .bind(mode, season, cycleId)
  ])

const softResetStatements = (
  database: D1Database,
  cycleId: number,
  claimToken: string,
  season: number,
  week: number
): D1PreparedStatement[] => {
  const weekColumn = `week${week}_score`
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `UPDATE player_account_stats SET ${weekColumn} = score
         WHERE season = ?
           AND game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
           AND ${receiptExists(claimToken)}`
      )
      .bind(season, cycleId)
  ]
  for (const definition of [
    { rank: 'APPRENTICE', stage: 'STAGE_III', resetValue: 750 },
    { rank: 'MASTER', stage: 'STAGE_NONE', resetValue: 1_300 },
    { rank: 'GRANDWEAVER', stage: 'STAGE_NONE', resetValue: 1_400 }
  ] as const) {
    statements.push(
      database
        .prepare(
          `UPDATE player_account_stats
           SET score = ?,
               player_rank_state = json_set(player_rank_state, '$[3]', ?)
           WHERE season = ?
             AND game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
             AND player_rank = ? AND player_rank_stage = ?
             AND ${validRankState()}
             AND score >= ?
             AND ${receiptExists(claimToken)}`
        )
        .bind(
          definition.resetValue,
          definition.resetValue,
          season,
          definition.rank,
          definition.stage,
          definition.resetValue,
          cycleId
        )
    )
  }
  statements.push(
    database
      .prepare(
        `UPDATE player_account_stats
         SET player_rank_state = json_set(
           player_rank_state,
           '$[2]',
           MIN(
             SQRT(
               json_extract(player_rank_state, '$[2]')
                 * json_extract(player_rank_state, '$[2]')
               + ${GLICKO_RD_RESET_FACTOR * GLICKO_RD_RESET_FACTOR}
             ),
             ${GLICKO_RD_INITIAL}
           )
         )
         WHERE season = ?
           AND game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
           AND ${validRankState()}
           AND ${receiptExists(claimToken)}`
      )
      .bind(season, cycleId)
  )
  return [
    ...statements,
    ...grandweaverStatements(database, cycleId, claimToken, season)
  ]
}

const ratingBoundsCte = (mode: RankedMode, season: number) => `
  WITH raw_bounds AS (
    SELECT
      COALESCE(
        MIN(CAST(json_extract(stats.player_rank_state, '$[1]') AS REAL)),
        0
      ) AS raw_minimum,
      COALESCE(
        MAX(CAST(json_extract(stats.player_rank_state, '$[1]') AS REAL)),
        0
      ) AS raw_maximum
    FROM player_account_stats stats
    JOIN player_account_settings settings ON settings.user_id = stats.user_id
    WHERE stats.season = ${season}
      AND stats.game_mode = '${mode}'
      AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
      AND ${validRankState('stats.player_rank_state')}
  ),
  base_bounds AS (
    SELECT
      CASE WHEN raw_minimum < 1 THEN 1 ELSE raw_minimum END AS base_minimum,
      CASE WHEN raw_maximum < 1 THEN ${GLICKO_RATING}
           ELSE raw_maximum END AS base_maximum
    FROM raw_bounds
  ),
  rating_bounds AS (
    SELECT
      CASE WHEN base_maximum = base_minimum THEN 0
           ELSE base_minimum END AS minimum,
      CASE WHEN base_maximum = base_minimum THEN ${GLICKO_RATING}
           ELSE base_maximum END AS maximum
    FROM base_bounds
  )`

const weekAverageParts = () => {
  const scores = [1, 2, 3, 4].map(week => `COALESCE(week${week}_score, 0)`)
  const played = [1, 2, 3, 4].map(
    week => `MIN(COALESCE(week${week}_score, 0), 1)`
  )
  return { total: `(${scores.join(' + ')})`, count: `(${played.join(' + ')})` }
}

const hardResetStatements = (
  database: D1Database,
  cycleId: number,
  claimToken: string,
  season: number,
  now: string
): D1PreparedStatement[] => {
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `UPDATE player_account_stats SET week4_score = score
         WHERE season = ?
           AND game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
           AND ${receiptExists(claimToken)}`
      )
      .bind(season, cycleId)
  ]
  for (const definition of HARD_RESET_DEFINITIONS) {
    const nextRank = rankForScore(definition.resetValue)
    for (const mode of RANKED_MODES) {
      statements.push(
        database
          .prepare(
            `${ratingBoundsCte(mode, season)}
             INSERT INTO player_account_stats
               (user_id, game_mode, season, player_rank, player_rank_stage,
                player_rank_state, score, created_at, updated_at)
             SELECT stats.user_id, stats.game_mode, ?, ?, ?,
                    json_array(
                      COALESCE(json_extract(stats.player_rank_state, '$[0]'), -1),
                      CASE
                        WHEN json_extract(stats.player_rank_state, '$[1]') > 0
                        THEN ${GLICKO_RATING}
                          + ((json_extract(stats.player_rank_state, '$[1]')
                              - ${GLICKO_RATING / 2}) / ${GLICKO_RATING}.0)
                            * bounds.minimum
                        ELSE bounds.maximum - bounds.minimum
                      END,
                      MIN(
                        SQRT(
                          json_extract(stats.player_rank_state, '$[2]')
                            * json_extract(stats.player_rank_state, '$[2]')
                          + ${GLICKO_RD_RESET_FACTOR * GLICKO_RD_RESET_FACTOR}
                        ),
                        ${GLICKO_RD_INITIAL}
                      ),
                      ?
                    ),
                    ?, ?, ?
             FROM player_account_stats stats
             JOIN player_account_settings settings
               ON settings.user_id = stats.user_id
             CROSS JOIN rating_bounds bounds
             WHERE stats.game_mode = ? AND stats.season = ?
               AND stats.player_rank = ? AND stats.player_rank_stage = ?
               AND settings.account_status NOT IN (
                 'BANNED', 'SUSPENDED', 'DELETED'
               )
               AND ${receiptExists(claimToken)}
             ON CONFLICT(user_id, game_mode, season) DO UPDATE SET
               player_rank = excluded.player_rank,
               player_rank_stage = excluded.player_rank_stage,
               player_rank_state = excluded.player_rank_state,
               score = excluded.score`
          )
          .bind(
            season + 1,
            nextRank.rank,
            nextRank.stage,
            definition.resetValue,
            definition.resetValue,
            now,
            now,
            mode,
            season,
            definition.rank,
            definition.stage,
            cycleId
          )
      )
    }
  }
  const average = weekAverageParts()
  statements.push(
    database
      .prepare(
        `UPDATE player_account_stats
         SET score = CAST(${average.total} / ${average.count} AS INTEGER)
         WHERE season = ?
           AND game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
           AND ${activeAccount}
           AND ${average.count} > 0
           AND ${receiptExists(claimToken)}`
      )
      .bind(season, cycleId)
  )
  return [
    ...statements,
    ...grandweaverStatements(database, cycleId, claimToken, season),
    ...grandweaverStatements(database, cycleId, claimToken, season + 1)
  ]
}

export const applyLeaderboardRankReset = async (
  database: D1Database,
  cycleId: number,
  now = new Date()
): Promise<'applied' | 'already_applied'> => {
  const cycle = await database
    .prepare(
      `SELECT id, season, week, status FROM leaderboard_reward_cycles
       WHERE id = ?`
    )
    .bind(cycleId)
    .first<ResetCycle>()
  if (!cycle) throw new Error('leaderboard reward cycle not found')
  if (cycle.week < 1 || cycle.week > 4) {
    throw new Error('leaderboard reward cycle week is invalid')
  }
  const existing = await database
    .prepare(`SELECT 1 FROM leaderboard_rank_reset_receipts WHERE cycle_id = ?`)
    .bind(cycle.id)
    .first()
  if (existing) return 'already_applied'
  if (cycle.status !== 'DELIVERING') {
    throw new Error('leaderboard reward cycle is not ready for rank reset')
  }

  const resetKind: ResetKind = cycle.week === 4 ? 'HARD' : 'SOFT'
  const claimToken = crypto.randomUUID()
  const appliedAt = now.toISOString()
  const mutations =
    resetKind === 'SOFT'
      ? softResetStatements(
          database,
          cycle.id,
          claimToken,
          cycle.season,
          cycle.week
        )
      : hardResetStatements(
          database,
          cycle.id,
          claimToken,
          cycle.season,
          appliedAt
        )
  await database.batch([
    database
      .prepare(
        `INSERT OR IGNORE INTO leaderboard_rank_reset_receipts
           (cycle_id, reset_kind, season, week, claim_token, applied_at)
         SELECT id, ?, season, week, ?, ?
         FROM leaderboard_reward_cycles
         WHERE id = ? AND status = 'DELIVERING'`
      )
      .bind(resetKind, claimToken, appliedAt, cycle.id),
    ...mutations,
    database
      .prepare(
        `UPDATE leaderboard_reward_cycles
         SET status = 'COMPLETED', completed_at = ?
         WHERE id = ? AND status = 'DELIVERING'
           AND ${receiptExists(claimToken)}`
      )
      .bind(appliedAt, cycle.id, cycle.id)
  ])
  const applied = await database
    .prepare(
      `SELECT 1 FROM leaderboard_rank_reset_receipts
       WHERE cycle_id = ? AND claim_token = ?`
    )
    .bind(cycle.id, claimToken)
    .first()
  return applied ? 'applied' : 'already_applied'
}
