import { internal, invalidArgument, notFound } from './errors'
import { seasonFromDate } from './legacy-seasons'

interface TargetRow {
  user_id: string
  has_premium: number
  balance: number
}

export class SkypassSupportRepository {
  constructor(private readonly database: D1Database) {}

  private async target(
    accountAddress: string | undefined,
    season: number
  ): Promise<TargetRow> {
    if (!accountAddress?.startsWith('identity:')) {
      throw invalidArgument('address is required')
    }
    const userId = accountAddress.slice('identity:'.length)
    if (!userId) throw invalidArgument('address is required')
    const row = await this.database
      .prepare(
        `SELECT profile.user_id,
                COALESCE(stats.has_premium, 0) AS has_premium,
                COALESCE(item.balance, 0) AS balance
         FROM player_profiles profile
         LEFT JOIN player_skypass_season_stats stats
           ON stats.user_id = profile.user_id AND stats.season = ?
         LEFT JOIN player_items item
           ON item.user_id = profile.user_id AND item.item_type = 'SW_SKYPASS'
          AND item.token_id = ?
         WHERE profile.user_id = ?`
      )
      .bind(season, season, userId)
      .first<TargetRow>()
    if (!row) throw notFound('account not found')
    return row
  }

  async togglePremium(
    actorUserId: string,
    accountAddress: string | undefined
  ): Promise<boolean> {
    const season = seasonFromDate()
    const [target, limit] = await Promise.all([
      this.target(accountAddress, season),
      this.database
        .prepare(
          `SELECT giveaway_limit FROM skypass_giveaway_limits
           WHERE season = ?`
        )
        .bind(season)
        .first<{ giveaway_limit: number }>()
    ])
    if (!limit) throw internal('skypass giveaway limit is not configured')
    const grants = await this.database
      .prepare(
        `SELECT COUNT(*) AS count FROM staff_skypass_entitlement_audit
         WHERE season = ?
           AND json_extract(before_json, '$.hasPremium') = 0
           AND json_extract(after_json, '$.hasPremium') = 1`
      )
      .bind(season)
      .first<{ count: number }>()
    // Preserve the source order: it checks the production giveaway count even
    // when an existing entitlement would otherwise be removed.
    if ((grants?.count ?? 0) >= limit.giveaway_limit) {
      throw internal('too many skypasses given away')
    }

    const before = target.has_premium === 1
    const after = !before
    if (before && target.balance < 1) {
      throw internal('spend token: insufficient balance')
    }
    const now = new Date().toISOString()
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT INTO staff_skypass_entitlement_audit
             (operation, target_user_id, actor_user_id, season, before_json,
              after_json, created_at)
           VALUES ('TOGGLE_SKYPASS_PREMIUM', ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          target.user_id,
          actorUserId,
          season,
          JSON.stringify({ hasPremium: before, balance: target.balance }),
          JSON.stringify({
            hasPremium: after,
            balance: target.balance + (after ? 1 : -1)
          }),
          now
        )
    ]
    if (after) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             VALUES (?, 'SW_SKYPASS', ?, 1, 0, 'gm-skypass-giveaway', ?, ?)
             ON CONFLICT(user_id, item_type, token_id)
             DO UPDATE SET balance = player_items.balance + 1,
                           updated_at = excluded.updated_at`
          )
          .bind(target.user_id, season, now, now),
        this.database
          .prepare(
            `INSERT INTO player_skypass_season_stats
               (user_id, season, has_premium, created_at, updated_at)
             VALUES (?, ?, 1, ?, ?)
             ON CONFLICT(user_id, season)
             DO UPDATE SET has_premium = 1, updated_at = excluded.updated_at`
          )
          .bind(target.user_id, season, now, now)
      )
    } else {
      statements.push(
        this.database
          .prepare(
            `UPDATE player_items SET balance = balance - 1, updated_at = ?
             WHERE user_id = ? AND item_type = 'SW_SKYPASS'
               AND token_id = ? AND balance > 0`
          )
          .bind(now, target.user_id, season),
        this.database
          .prepare(
            `UPDATE player_skypass_season_stats
             SET has_premium = 0, updated_at = ?
             WHERE user_id = ? AND season = ?`
          )
          .bind(now, target.user_id, season)
      )
    }
    try {
      await this.database.batch(statements)
    } catch (error) {
      if (String(error).includes('skypass giveaway limit')) {
        throw internal('too many skypasses given away')
      }
      if (String(error).includes('skypass entitlement')) {
        throw internal('skypass entitlement changed; retry the operation')
      }
      throw error
    }
    return after
  }
}
