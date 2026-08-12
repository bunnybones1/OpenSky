import { seasonFromDate } from './legacy-seasons'

const STICKER_REWARD_AMOUNT = 100
const DELIVERY_DELAY_MS = 23 * 60 * 60 * 1000
const MAX_PREPARATIONS_PER_RUN = 20
const MAX_DELIVERIES_PER_RUN = 100

interface StickerRow {
  token_id: number
  required_points: number
}

interface AwardedCostRow {
  required_points: number
}

interface CandidateRow {
  user_id: string
}

interface FriendPointRow {
  invitee_user_id: string
  points: number
}

interface DueBatchRow {
  id: number
  user_id: string
}

export interface ReferralStickerRewardRun {
  status: 'no_content' | 'idle' | 'processed'
  prepared: number
  delivered: number
}

const carryPointsIntoSeason = async (
  database: D1Database,
  season: number,
  now: string
): Promise<void> => {
  if (season <= 1) return
  await database
    .prepare(
      `INSERT INTO player_friend_points
         (invitee_user_id, inviter_user_id, season, levels, points_carried,
          points_spent, updated_at)
       SELECT invitee_user_id, inviter_user_id, ?, 0,
              levels + points_carried - points_spent, 0, ?
       FROM player_friend_points
       WHERE season = ? AND levels + points_carried - points_spent > 0
       ON CONFLICT(invitee_user_id, inviter_user_id, season)
       DO UPDATE SET points_carried = excluded.points_carried,
                     updated_at = excluded.updated_at`
    )
    .bind(season, now, season - 1)
    .run()
}

const candidateUsers = async (
  database: D1Database,
  season: number,
  minimumPoints: number
): Promise<CandidateRow[]> => {
  const rows = await database
    .prepare(
      `SELECT item.user_id
       FROM player_items item
       JOIN player_account_settings settings ON settings.user_id = item.user_id
       WHERE item.item_type = 'SW_STICKER_POINTS' AND item.token_id = 0
         AND item.balance >= ?
         AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
         AND EXISTS (
           SELECT 1 FROM content_stickers sticker
           WHERE sticker.season = ?
             AND sticker.required_points <= item.balance + COALESCE((
               SELECT MAX(previous.required_points)
               FROM referral_sticker_reward_awards previous
               WHERE previous.user_id = item.user_id
                 AND previous.season = sticker.season
             ), 0)
             AND NOT EXISTS (
             SELECT 1 FROM referral_sticker_reward_awards award
             WHERE award.user_id = item.user_id
               AND award.season = sticker.season
               AND award.token_id = sticker.token_id
           )
         )
       ORDER BY item.user_id ASC
       LIMIT ?`
    )
    .bind(minimumPoints, season, MAX_PREPARATIONS_PER_RUN)
    .all<CandidateRow>()
  return rows.results
}

const prepareForUser = async (
  database: D1Database,
  userId: string,
  season: number,
  now: Date
): Promise<boolean> => {
  const [stickersResult, previous, points, friendsResult] = await Promise.all([
    database
      .prepare(
        `SELECT sticker.token_id, sticker.required_points
         FROM content_stickers sticker
         WHERE sticker.season = ? AND NOT EXISTS (
           SELECT 1 FROM referral_sticker_reward_awards award
           WHERE award.user_id = ? AND award.season = sticker.season
             AND award.token_id = sticker.token_id
         )
         ORDER BY sticker.required_points ASC, sticker.id ASC`
      )
      .bind(season, userId)
      .all<StickerRow>(),
    database
      .prepare(
        `SELECT MAX(required_points) AS required_points
         FROM referral_sticker_reward_awards
         WHERE user_id = ? AND season = ?`
      )
      .bind(userId, season)
      .first<AwardedCostRow>(),
    database
      .prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
      )
      .bind(userId)
      .first<{ balance: number }>(),
    database
      .prepare(
        `SELECT points.invitee_user_id,
                points.levels + points.points_carried AS points
         FROM player_friend_points points
         JOIN player_account_settings settings
           ON settings.user_id = points.invitee_user_id
         WHERE points.inviter_user_id = ? AND points.season = ?
           AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
         ORDER BY points.levels + points.points_carried DESC,
                  points.invitee_user_id ASC
         LIMIT 5`
      )
      .bind(userId, season)
      .all<FriendPointRow>()
  ])

  const previousCost = previous?.required_points ?? 0
  const totalPoints = (points?.balance ?? 0) + previousCost
  const earned = stickersResult.results.filter(
    sticker => sticker.required_points <= totalPoints
  )
  if (earned.length === 0) return false
  const totalCost = Math.max(...earned.map(sticker => sticker.required_points))
  const pointsDeducted = totalCost - previousCost

  const nowText = now.toISOString()
  const deliverAt = new Date(now.getTime() + DELIVERY_DELAY_MS).toISOString()
  const claimToken = crypto.randomUUID()
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT OR IGNORE INTO referral_sticker_reward_batches
           (user_id, season, total_cost, previous_cost, points_deducted,
            claim_token, status, deliver_at, created_at)
         SELECT ?, ?, ?, ?, ?, ?, 'PREPARING', ?, ?
         WHERE EXISTS (
           SELECT 1 FROM player_items
           WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS'
             AND token_id = 0 AND balance >= ?
         ) AND NOT EXISTS (
           SELECT 1 FROM referral_sticker_reward_batches
           WHERE user_id = ? AND season = ?
             AND status IN ('PREPARING', 'PENDING', 'DELIVERING')
         )`
      )
      .bind(
        userId,
        season,
        totalCost,
        previousCost,
        pointsDeducted,
        claimToken,
        deliverAt,
        nowText,
        userId,
        pointsDeducted,
        userId,
        season
      ),
    database
      .prepare(
        `UPDATE player_items
         SET balance = balance - ?, updated_at = ?
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0
           AND balance >= ? AND EXISTS (
             SELECT 1 FROM referral_sticker_reward_batches
             WHERE claim_token = ? AND status = 'PREPARING'
           )`
      )
      .bind(pointsDeducted, nowText, userId, pointsDeducted, claimToken),
    database
      .prepare(
        `UPDATE player_friend_points SET points_spent = 0, updated_at = ?
         WHERE inviter_user_id = ? AND season = ? AND EXISTS (
           SELECT 1 FROM referral_sticker_reward_batches
           WHERE claim_token = ? AND status = 'PREPARING'
         )`
      )
      .bind(nowText, userId, season, claimToken)
  ]

  let remaining = totalCost
  for (const friend of friendsResult.results) {
    const spent = Math.min(friend.points, remaining)
    if (spent > 0) {
      statements.push(
        database
          .prepare(
            `UPDATE player_friend_points
             SET points_spent = ?, updated_at = ?
             WHERE invitee_user_id = ? AND inviter_user_id = ? AND season = ?
               AND EXISTS (
                 SELECT 1 FROM referral_sticker_reward_batches
                 WHERE claim_token = ? AND status = 'PREPARING'
               )`
          )
          .bind(
            spent,
            nowText,
            friend.invitee_user_id,
            userId,
            season,
            claimToken
          )
      )
      remaining -= spent
    }
    if (remaining === 0) break
  }

  for (const sticker of earned) {
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO referral_sticker_reward_awards
             (batch_id, user_id, season, token_id, required_points, amount,
              created_at)
           SELECT id, user_id, season, ?, ?, ?, ?
           FROM referral_sticker_reward_batches
           WHERE claim_token = ? AND status = 'PREPARING'`
        )
        .bind(
          sticker.token_id,
          sticker.required_points,
          STICKER_REWARD_AMOUNT,
          nowText,
          claimToken
        )
    )
  }
  statements.push(
    database
      .prepare(
        `UPDATE referral_sticker_reward_batches SET status = 'PENDING'
         WHERE claim_token = ? AND status = 'PREPARING'`
      )
      .bind(claimToken)
  )
  await database.batch(statements)
  const prepared = await database
    .prepare(
      `SELECT 1 FROM referral_sticker_reward_batches
       WHERE claim_token = ? AND status = 'PENDING'`
    )
    .bind(claimToken)
    .first()
  return prepared !== null
}

const dueBatches = async (
  database: D1Database,
  now: Date
): Promise<DueBatchRow[]> => {
  const rows = await database
    .prepare(
      `SELECT id, user_id FROM referral_sticker_reward_batches
       WHERE status = 'PENDING' AND deliver_at <= ? AND EXISTS (
         SELECT 1 FROM player_account_settings settings
         WHERE settings.user_id = referral_sticker_reward_batches.user_id
           AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
       )
       ORDER BY deliver_at ASC, id ASC LIMIT ?`
    )
    .bind(now.toISOString(), MAX_DELIVERIES_PER_RUN)
    .all<DueBatchRow>()
  return rows.results
}

const deliverBatch = async (
  database: D1Database,
  batch: DueBatchRow,
  now: Date
): Promise<boolean> => {
  const deliveryToken = crypto.randomUUID()
  const nowText = now.toISOString()
  const awards = await database
    .prepare(
      `SELECT token_id, amount FROM referral_sticker_reward_awards
       WHERE batch_id = ? ORDER BY token_id ASC`
    )
    .bind(batch.id)
    .all<{ token_id: number; amount: number }>()
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `UPDATE referral_sticker_reward_batches
         SET status = 'DELIVERING', delivery_token = ?
         WHERE id = ? AND status = 'PENDING'`
      )
      .bind(deliveryToken, batch.id)
  ]
  for (const award of awards.results) {
    statements.push(
      database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT user_id, 'SW_STICKERS', ?, ?, 1, 'referral-sticker-reward', ?, ?
           FROM referral_sticker_reward_batches
           WHERE id = ? AND delivery_token = ? AND status = 'DELIVERING'
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET balance = player_items.balance + excluded.balance,
                         is_new = 1, updated_at = excluded.updated_at`
        )
        .bind(
          award.token_id,
          award.amount,
          nowText,
          nowText,
          batch.id,
          deliveryToken
        )
    )
  }
  statements.push(
    database
      .prepare(
        `UPDATE referral_sticker_reward_batches
         SET status = 'DELIVERED', delivered_at = ?
         WHERE id = ? AND delivery_token = ? AND status = 'DELIVERING'`
      )
      .bind(nowText, batch.id, deliveryToken)
  )
  await database.batch(statements)
  const delivered = await database
    .prepare(
      `SELECT 1 FROM referral_sticker_reward_batches
       WHERE id = ? AND delivery_token = ? AND status = 'DELIVERED'`
    )
    .bind(batch.id, deliveryToken)
    .first()
  return delivered !== null
}

export const runReferralStickerRewards = async (
  database: D1Database,
  now = new Date()
): Promise<ReferralStickerRewardRun> => {
  const season = seasonFromDate(now)
  const nowText = now.toISOString()
  const minimum = await database
    .prepare(
      `SELECT MIN(required_points) AS required_points
       FROM content_stickers WHERE season = ?`
    )
    .bind(season)
    .first<{ required_points: number | null }>()

  let prepared = 0
  if (
    minimum?.required_points !== null &&
    minimum?.required_points !== undefined
  ) {
    await carryPointsIntoSeason(database, season, nowText)
    const candidates = await candidateUsers(
      database,
      season,
      minimum.required_points
    )
    for (const candidate of candidates) {
      if (await prepareForUser(database, candidate.user_id, season, now)) {
        prepared += 1
      }
    }
  }

  let delivered = 0
  for (const batch of await dueBatches(database, now)) {
    if (await deliverBatch(database, batch, now)) delivered += 1
  }

  return {
    status:
      prepared > 0 || delivered > 0
        ? 'processed'
        : minimum?.required_points === null ||
            minimum?.required_points === undefined
          ? 'no_content'
          : 'idle',
    prepared,
    delivered
  }
}
