import { noUnpublishedMatchExperienceSQL } from './experience-publication'
import { seasonName, seasonStart } from './legacy-seasons'
import { PlayerRpcRepository } from './player-rpc'

const SOURCE_CLOSE_DELAY_MS = 10_000
const PLAYER_BATCH_SIZE = 10
const REWARD_BATCH_SIZE = 5

interface SeasonRow {
  season: number
}

interface PlayerRow {
  user_id: string
}

export interface SkypassAutoClaimRun {
  cyclesCreated: number
  seasonsCompleted: number
  playersProcessed: number
  rewardsClaimed: number
  failures: number
}

const emptyRun = (): SkypassAutoClaimRun => ({
  cyclesCreated: 0,
  seasonsCompleted: 0,
  playersProcessed: 0,
  rewardsClaimed: 0,
  failures: 0
})

const closeTime = (season: number): Date =>
  new Date(seasonStart(season + 1).getTime() + SOURCE_CLOSE_DELAY_MS)

const discoverDueCycles = async (
  database: D1Database,
  now: Date
): Promise<number> => {
  const seasons = await database
    .prepare(
      `SELECT DISTINCT season FROM skypass_reward_active_rewards ORDER BY season`
    )
    .all<SeasonRow>()
  let created = 0
  for (const row of seasons.results) {
    const closesAt = closeTime(row.season)
    if (closesAt.getTime() > now.getTime()) continue
    const result = await database
      .prepare(
        `INSERT OR IGNORE INTO skypass_season_close_cycles
           (season, closes_at, created_at)
         VALUES (?, ?, ?)`
      )
      .bind(row.season, closesAt.toISOString(), now.toISOString())
      .run()
    created += result.meta.changes
  }
  return created
}

const nextCycle = (database: D1Database) =>
  database
    .prepare(
      `SELECT season FROM skypass_season_close_cycles
       WHERE completed_at IS NULL
       ORDER BY closes_at, season LIMIT 1`
    )
    .first<SeasonRow>()

const pendingPlayers = (database: D1Database, season: number) =>
  database
    .prepare(
      `SELECT stats.user_id
       FROM player_skypass_season_stats stats
       WHERE stats.season = ?
         AND stats.achieved_account_level > stats.initial_account_level
         AND ${noUnpublishedMatchExperienceSQL('stats.user_id', 'stats.season')}
         AND NOT EXISTS (
           SELECT 1 FROM player_skypass_auto_claims receipt
         WHERE receipt.user_id = stats.user_id
             AND receipt.season = ?
         )
         AND NOT EXISTS (
           SELECT 1 FROM player_skypass_auto_claim_failures failure
           WHERE failure.user_id = stats.user_id
             AND failure.season = ? AND failure.attempts >= 5
         )
         AND EXISTS (
           SELECT 1 FROM skypass_reward_active_rewards reward
           WHERE reward.season = ?
         )
       ORDER BY stats.user_id
       LIMIT ?`
    )
    .bind(season, season, season, season, PLAYER_BATCH_SIZE)
    .all<PlayerRow>()

const recordFailure = async (
  database: D1Database,
  userId: string,
  season: number,
  error: unknown,
  failedAt: string
): Promise<void> => {
  const message =
    (error instanceof Error ? error.message : String(error))
      .trim()
      .slice(0, 500) || 'unknown SkyPass auto-claim failure'
  await database
    .prepare(
      `INSERT INTO player_skypass_auto_claim_failures
         (user_id, season, attempts, first_failed_at, last_failed_at, last_error)
       VALUES (?, ?, 1, ?, ?, ?)
       ON CONFLICT(user_id, season) DO UPDATE SET
         attempts = player_skypass_auto_claim_failures.attempts + 1,
         last_failed_at = excluded.last_failed_at,
         last_error = excluded.last_error
       WHERE player_skypass_auto_claim_failures.attempts < 5`
    )
    .bind(userId, season, failedAt, failedAt, message)
    .run()
}

const recordPlayerCompletion = async (
  database: D1Database,
  userId: string,
  season: number,
  rewardCount: number,
  gainedRewards: Array<Record<string, unknown>>,
  completedAt: string
): Promise<boolean> => {
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT OR IGNORE INTO player_skypass_auto_claims
           (user_id, season, claimed_reward_count, gained_rewards, completed_at)
         SELECT ?, ?, ?, ?, ?
         WHERE ${noUnpublishedMatchExperienceSQL('?', '?')}`
      )
      .bind(
        userId,
        season,
        rewardCount,
        JSON.stringify(gainedRewards),
        completedAt,
        userId,
        season
      )
  ]
  if (rewardCount > 0) {
    const payload = {
      oneTime: {
        id: season,
        name: 'Autoclaimed Rewards',
        data: {
          title: 'ALL AVAILABLE UNCLAIMED REWARDS WERE AUTO-CLAIMED!',
          subtitle: `SKYPASS SEASON ${season}: ${seasonName(season).toUpperCase()} COMPLETE!`,
          background: 'webapp/backgrounds/spbg-all-claimed.webp'
        }
      }
    }
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO player_notifications
             (user_id, notification_type, payload, created_at,
              skypass_auto_claim_season)
           SELECT ?, 'ONE_TIME', ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM player_skypass_auto_claims receipt
             WHERE receipt.user_id = ? AND receipt.season = ?
           )`
        )
        .bind(
          userId,
          JSON.stringify(payload),
          completedAt,
          season,
          userId,
          season
        )
    )
  }
  await database.batch(statements)
  return (
    (await database
      .prepare(
        `SELECT 1 FROM player_skypass_auto_claims
         WHERE user_id = ? AND season = ?`
      )
      .bind(userId, season)
      .first()) !== null
  )
}

const claimForPlayer = async (
  database: D1Database,
  userId: string,
  season: number,
  now: Date
): Promise<{ claimed: number; completed: boolean }> => {
  const playerRpc = new PlayerRpcRepository(database)
  const { levels } = await playerRpc.listSkypassRewards(userId, season)
  const rewardIds = levels.flatMap(level =>
    level.earned
      ? level.rewards
          .filter(reward => reward.claimable && !reward.claimed)
          .map(reward => reward.id)
      : []
  )
  const priorAutoClaims = await database
    .prepare(
      `SELECT COUNT(*) AS count FROM player_skypass_claims
       WHERE user_id = ? AND auto_claim_season = ?`
    )
    .bind(userId, season)
    .first<{ count: number }>()
  const rewardBatch = rewardIds.slice(0, REWARD_BATCH_SIZE)
  if (rewardBatch.length) {
    await playerRpc.claimSkypassRewards(userId, rewardBatch, {
      autoClaimSeason: season,
      now
    })
  }
  const refreshed = await playerRpc.listSkypassRewards(userId, season)
  const remaining = refreshed.levels.some(
    level =>
      level.earned &&
      level.rewards.some(reward => reward.claimable && !reward.claimed)
  )
  const autoClaims = await database
    .prepare(
      `SELECT rewards FROM player_skypass_claims
       WHERE user_id = ? AND auto_claim_season = ?
       ORDER BY reward_id`
    )
    .bind(userId, season)
    .all<{ rewards: string }>()
  const gainedRewards: Array<Record<string, unknown>> = []
  for (const claim of autoClaims.results) {
    const rewards = JSON.parse(claim.rewards) as Array<Record<string, unknown>>
    gainedRewards.push(...rewards)
  }
  if (remaining) {
    return {
      claimed: autoClaims.results.length - (priorAutoClaims?.count ?? 0),
      completed: false
    }
  }
  const completed = await recordPlayerCompletion(
    database,
    userId,
    season,
    autoClaims.results.length,
    gainedRewards,
    now.toISOString()
  )
  return {
    claimed: autoClaims.results.length - (priorAutoClaims?.count ?? 0),
    completed
  }
}

const cycleStillHasPendingPlayers = async (
  database: D1Database,
  season: number
): Promise<boolean> => {
  const unpublishedExperience = await database
    .prepare(
      `SELECT 1
       FROM multiplayer_match_experience_players experience
       JOIN multiplayer_matches match
         ON match.proposal_id = experience.proposal_id
       WHERE experience.season = ? AND match.status <> 'ended'
       LIMIT 1`
    )
    .bind(season)
    .first()
  if (unpublishedExperience) return true
  const pending = await pendingPlayers(database, season)
  return pending.results.length > 0
}

export const runDueSkypassAutoClaims = async (
  database: D1Database,
  now = new Date()
): Promise<SkypassAutoClaimRun> => {
  const run = emptyRun()
  run.cyclesCreated = await discoverDueCycles(database, now)
  const cycle = await nextCycle(database)
  if (!cycle) return run

  const players = await pendingPlayers(database, cycle.season)
  for (const player of players.results) {
    try {
      const playerRun = await claimForPlayer(
        database,
        player.user_id,
        cycle.season,
        now
      )
      run.rewardsClaimed += playerRun.claimed
      if (playerRun.completed) run.playersProcessed++
    } catch (error) {
      // A malformed content definition must not prevent other players from
      // completing. Match the source runner's five-attempt retry budget while
      // preserving the last failure for operators.
      run.failures++
      await recordFailure(
        database,
        player.user_id,
        cycle.season,
        error,
        now.toISOString()
      )
    }
  }

  if (!(await cycleStillHasPendingPlayers(database, cycle.season))) {
    const completed = await database
      .prepare(
        `UPDATE skypass_season_close_cycles SET completed_at = ?
         WHERE season = ? AND completed_at IS NULL`
      )
      .bind(now.toISOString(), cycle.season)
      .run()
    run.seasonsCompleted += completed.meta.changes
  }
  return run
}
