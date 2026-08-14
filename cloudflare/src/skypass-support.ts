import { internal, invalidArgument, notFound } from './errors'
import { seasonFromDate } from './legacy-seasons'

export const STAFF_SKYPASS_OPERATION_HEADER =
  'x-cloud-weasel-operation-key'

const OPERATION_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface TargetRow {
  user_id: string
  has_premium: number
  balance: number
}

interface EntitlementOperationRow {
  operation_key: string
  actor_user_id: string
  target_user_id: string
  season: number
  after_has_premium: number
  status: 'PREPARING' | 'APPLIED'
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

  private async operation(operationKey: string) {
    return this.database
      .prepare(
        `SELECT operation_key, actor_user_id, target_user_id, season,
                after_has_premium, status
         FROM staff_skypass_entitlement_operations WHERE operation_key = ?`
      )
      .bind(operationKey)
      .first<EntitlementOperationRow>()
  }

  private ensureOperationMatches(
    operation: EntitlementOperationRow,
    actorUserId: string,
    targetUserId: string,
    season: number
  ) {
    if (operation.actor_user_id !== actorUserId ||
        operation.target_user_id !== targetUserId ||
        operation.season !== season) {
      throw invalidArgument(
        'operation key belongs to a different SkyPass entitlement change'
      )
    }
  }

  async togglePremium(
    actorUserId: string,
    accountAddress: string | undefined,
    operationKey: string | null
  ): Promise<boolean> {
    if (!operationKey || !OPERATION_KEY_PATTERN.test(operationKey)) {
      throw invalidArgument('valid Cloud Weasel operation key missing')
    }
    const season = seasonFromDate()
    const target = await this.target(accountAddress, season)
    const existing = await this.operation(operationKey)
    if (existing) {
      this.ensureOperationMatches(existing, actorUserId, target.user_id, season)
      if (existing.status === 'APPLIED') {
        return existing.after_has_premium === 1
      }
    }

    // Preserve the source's production order: the season limit is evaluated
    // before the current direction, so a reached cap also blocks removal.
    const now = new Date().toISOString()
    const pendingOperation =
      `operation_key = ? AND actor_user_id = ? AND target_user_id = ? ` +
      `AND season = ? AND status = 'PREPARING'`
    try {
      await this.database.batch([
        this.database
          .prepare(
            `INSERT OR IGNORE INTO staff_skypass_entitlement_operations
               (operation_key, operation, actor_user_id, target_user_id, season,
                before_has_premium, after_has_premium,
                before_balance, after_balance,
                status, created_at, completed_at)
             SELECT ?, 'TOGGLE_SKYPASS_PREMIUM', ?, profile.user_id, ?,
                    COALESCE(stats.has_premium, 0),
                    1 - COALESCE(stats.has_premium, 0),
                    COALESCE(item.balance, 0),
                    COALESCE(item.balance, 0) +
                      CASE WHEN COALESCE(stats.has_premium, 0) = 0
                           THEN 1 ELSE -1 END,
                    'PREPARING', ?, NULL
             FROM player_profiles profile
             LEFT JOIN player_skypass_season_stats stats
               ON stats.user_id = profile.user_id AND stats.season = ?
             LEFT JOIN player_items item
               ON item.user_id = profile.user_id
              AND item.item_type = 'SW_SKYPASS' AND item.token_id = ?
             WHERE profile.user_id = ?
               AND (COALESCE(stats.has_premium, 0) = 0
                    OR COALESCE(item.balance, 0) >= 1)`
          )
          .bind(
            operationKey,
            actorUserId,
            season,
            now,
            season,
            season,
            target.user_id
          ),
        this.database
          .prepare(
            `INSERT INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             SELECT target_user_id, 'SW_SKYPASS', season, 1, 0,
                    'gm-skypass-giveaway', ?, ?
             FROM staff_skypass_entitlement_operations
             WHERE ${pendingOperation} AND after_has_premium = 1
             ON CONFLICT(user_id, item_type, token_id)
             DO UPDATE SET balance = player_items.balance + 1,
                           updated_at = excluded.updated_at`
          )
          .bind(
            now,
            now,
            operationKey,
            actorUserId,
            target.user_id,
            season
          ),
        this.database
          .prepare(
            `UPDATE player_items
             SET balance = balance - 1, updated_at = ?
             WHERE user_id = ? AND item_type = 'SW_SKYPASS'
               AND token_id = ? AND balance > 0
               AND EXISTS (
                 SELECT 1 FROM staff_skypass_entitlement_operations
                 WHERE ${pendingOperation} AND after_has_premium = 0
               )`
          )
          .bind(
            now,
            target.user_id,
            season,
            operationKey,
            actorUserId,
            target.user_id,
            season
          ),
        this.database
          .prepare(
            `INSERT INTO player_skypass_season_stats
               (user_id, season, has_premium, created_at, updated_at,
                initial_account_level, achieved_account_level)
             SELECT operation.target_user_id, operation.season,
                    operation.after_has_premium, ?, ?,
                    MAX(0, profile.level - 1), MAX(0, profile.level - 1)
             FROM staff_skypass_entitlement_operations operation
             JOIN player_profiles profile
               ON profile.user_id = operation.target_user_id
             WHERE ${pendingOperation}
             ON CONFLICT(user_id, season)
             DO UPDATE SET has_premium = excluded.has_premium,
                           updated_at = excluded.updated_at`
          )
          .bind(
            now,
            now,
            operationKey,
            actorUserId,
            target.user_id,
            season
          ),
        this.database
          .prepare(
            `INSERT INTO staff_skypass_entitlement_audit
               (operation, target_user_id, actor_user_id, season, before_json,
                after_json, created_at, operation_key)
             SELECT operation, target_user_id, actor_user_id, season,
                    json_object(
                      'hasPremium',
                        json(CASE WHEN before_has_premium = 1
                                  THEN 'true' ELSE 'false' END),
                      'balance', before_balance
                    ),
                    json_object(
                      'hasPremium',
                        json(CASE WHEN after_has_premium = 1
                                  THEN 'true' ELSE 'false' END),
                      'balance', after_balance
                    ), ?, operation_key
             FROM staff_skypass_entitlement_operations
             WHERE ${pendingOperation}`
          )
          .bind(
            now,
            operationKey,
            actorUserId,
            target.user_id,
            season
          ),
        this.database
          .prepare(
            `UPDATE staff_skypass_entitlement_operations
             SET status = 'APPLIED', completed_at = ?
             WHERE ${pendingOperation}`
          )
          .bind(
            now,
            operationKey,
            actorUserId,
            target.user_id,
            season
          )
      ])
    } catch (error) {
      if (String(error).includes('skypass giveaway limit is not configured')) {
        throw internal('skypass giveaway limit is not configured')
      }
      if (String(error).includes('skypass giveaway limit')) {
        throw internal('too many skypasses given away')
      }
      if (String(error).includes('skypass entitlement')) {
        throw internal('skypass entitlement changed; retry the operation')
      }
      throw error
    }

    const operation = await this.operation(operationKey)
    if (!operation) {
      if (target.has_premium === 1 && target.balance < 1) {
        throw internal('spend token: insufficient balance')
      }
      throw new Error('staff SkyPass entitlement change did not complete')
    }
    this.ensureOperationMatches(operation, actorUserId, target.user_id, season)
    if (operation.status !== 'APPLIED') {
      throw new Error('staff SkyPass entitlement change did not complete')
    }
    return operation.after_has_premium === 1
  }
}
