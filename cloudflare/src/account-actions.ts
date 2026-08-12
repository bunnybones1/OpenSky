import type { AccountAction, ActionType, Page, SortBy } from '@opensky/proto'

import { invalidArgument, notFound, permissionDenied } from './errors'

const DAY_MS = 24 * 60 * 60 * 1_000
const DEFAULT_DURATION_MS: Record<SupportedActionType, number> = {
  MOD_BAN: 100 * 365 * DAY_MS,
  MOD_SUSPENSION: 30 * DAY_MS,
  MOD_FLAG: 100 * 365 * DAY_MS,
  MOD_VET: 60 * DAY_MS
}
const SUPPORTED_ACTIONS = new Set<SupportedActionType>([
  'MOD_BAN',
  'MOD_SUSPENSION',
  'MOD_FLAG',
  'MOD_VET'
])
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 200

type SupportedActionType = 'MOD_BAN' | 'MOD_SUSPENSION' | 'MOD_FLAG' | 'MOD_VET'

interface ActionRow {
  id: number
  account_user_id: string
  account_address: string
  action_type: ActionType
  created_by_account_id: number
  expires_at: string
  created_at: string
  updated_at: string
  deactivated: number
}

interface AccountStatusRow {
  account_status:
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'BANNED'
    | 'VIP'
    | 'FLAGGED'
    | 'TO_DELETE'
    | 'DELETED'
}

const encodeCursor = (offset: number) => btoa(JSON.stringify({ offset }))

const cursorOffset = (value?: string) => {
  if (!value) return 0
  try {
    const parsed = JSON.parse(atob(value)) as { offset?: unknown }
    if (Number.isSafeInteger(parsed.offset) && (parsed.offset as number) >= 0) {
      return parsed.offset as number
    }
  } catch {
    // Fall through to the source-compatible invalid page response.
  }
  throw invalidArgument('page cursor is invalid')
}

const pageSize = (page?: Page, fallback = DEFAULT_PAGE_SIZE) =>
  Math.min(
    MAX_PAGE_SIZE,
    Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
      ? page!.pageSize!
      : fallback
  )

const accountAction = (row: ActionRow): AccountAction => ({
  id: row.id,
  accountAddress: row.account_address,
  actionType: row.action_type,
  isActive: row.deactivated === 0,
  createdBy: row.created_by_account_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  expiresAt: row.expires_at
})

export class AccountActionsRepository {
  constructor(private readonly database: D1Database) {}

  async enforcePlayerAccess(userId: string, now = new Date()): Promise<void> {
    const status = await this.database
      .prepare(
        `SELECT account_status FROM player_account_settings WHERE user_id = ?`
      )
      .bind(userId)
      .first<AccountStatusRow>()
    if (!status) return
    if (!['BANNED', 'SUSPENDED'].includes(status.account_status)) return

    const active = await this.database
      .prepare(
        `SELECT 1 FROM player_account_actions action
         LEFT JOIN player_account_action_deactivations deactivation
           ON deactivation.action_id = action.id
         WHERE action.account_user_id = ?
           AND action.expires_at > ?
           AND deactivation.action_id IS NULL
         LIMIT 1`
      )
      .bind(userId, now.toISOString())
      .first()
    if (active) throw permissionDenied('account banned')

    const timestamp = now.toISOString()
    await this.database
      .prepare(
        `UPDATE player_account_settings
         SET account_status = 'ACTIVE', leaderboard_eligible = 1,
             updated_at = ?
         WHERE user_id = ? AND account_status IN ('BANNED', 'SUSPENDED')`
      )
      .bind(timestamp, userId)
      .run()
  }

  async list(page?: Page): Promise<{ page: Page; actions: AccountAction[] }> {
    if (page?.before !== undefined && page.after !== undefined) {
      throw invalidArgument('using before and after together is invalid')
    }
    const size = pageSize(page)
    const offset = cursorOffset(page?.before ?? page?.after)
    const result = await this.database
      .prepare(
        `SELECT action.id, action.account_user_id, action.account_address,
                action.action_type, action.created_by_account_id,
                action.expires_at, action.created_at, action.updated_at,
                CASE WHEN deactivation.action_id IS NULL THEN 0 ELSE 1 END
                  AS deactivated
         FROM player_account_actions action
         LEFT JOIN player_account_action_deactivations deactivation
           ON deactivation.action_id = action.id
         ORDER BY action.created_at DESC, action.id DESC
         LIMIT ? OFFSET ?`
      )
      .bind(size + 1, offset)
      .all<ActionRow>()
    const rows = result.results.slice(0, size)
    const nextOffset = offset + rows.length
    return {
      page: {
        pageSize: size,
        before: rows.length ? encodeCursor(offset) : undefined,
        after: rows.length ? encodeCursor(nextOffset) : undefined,
        hasBefore: result.results.length > size,
        hasAfter: offset > 0,
        sort: [{ column: 'created_at', order: 'DESC' as SortBy['order'] }]
      },
      actions: rows.map(accountAction)
    }
  }

  async forUsers(
    userIds: string[],
    activeOnly = false,
    now = new Date()
  ): Promise<Map<string, AccountAction[]>> {
    const actions = new Map<string, AccountAction[]>()
    if (userIds.length === 0) return actions
    const activeFilter = activeOnly
      ? `AND action.expires_at > ? AND deactivation.action_id IS NULL`
      : ''
    const result = await this.database
      .prepare(
        `SELECT action.id, action.account_user_id, action.account_address,
                action.action_type, action.created_by_account_id,
                action.expires_at, action.created_at, action.updated_at,
                CASE WHEN deactivation.action_id IS NULL THEN 0 ELSE 1 END
                  AS deactivated
         FROM player_account_actions action
         LEFT JOIN player_account_action_deactivations deactivation
           ON deactivation.action_id = action.id
         WHERE action.account_user_id IN (${userIds.map(() => '?').join(',')})
         ${activeFilter}
         ORDER BY deactivated DESC, action.created_at DESC, action.id DESC`
      )
      .bind(...userIds, ...(activeOnly ? [now.toISOString()] : []))
      .all<ActionRow>()
    for (const row of result.results) {
      const current = actions.get(row.account_user_id) ?? []
      current.push(accountAction(row))
      actions.set(row.account_user_id, current)
    }
    return actions
  }

  async forUser(
    userId: string,
    activeOnly = false,
    now = new Date()
  ): Promise<AccountAction[]> {
    return (await this.forUsers([userId], activeOnly, now)).get(userId) ?? []
  }

  async create(
    actorUserId: string,
    input: Partial<AccountAction>,
    now = new Date()
  ): Promise<AccountAction> {
    if (!input || typeof input.accountAddress !== 'string') {
      throw invalidArgument('missing action to create')
    }
    if (!input.accountAddress.startsWith('identity:')) {
      throw invalidArgument('invalid account address')
    }
    const accountUserId = input.accountAddress.slice('identity:'.length)
    if (!accountUserId) throw invalidArgument('invalid account address')
    if (!SUPPORTED_ACTIONS.has(input.actionType as SupportedActionType)) {
      throw invalidArgument('unsupported action type')
    }
    const actionType = input.actionType as SupportedActionType
    const createdAt = now.toISOString()
    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : new Date(now.getTime() + DEFAULT_DURATION_MS[actionType])
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) {
      throw invalidArgument('action has to expire in the future')
    }
    const [target, actor] = await Promise.all([
      this.database
        .prepare(
          `SELECT account_status FROM player_account_settings WHERE user_id = ?`
        )
        .bind(accountUserId)
        .first<AccountStatusRow>(),
      this.database
        .prepare(`SELECT id FROM game_accounts WHERE user_id = ?`)
        .bind(actorUserId)
        .first<{ id: number }>()
    ])
    if (!target) throw notFound("account doesn't exist")
    if (['TO_DELETE', 'DELETED'].includes(target.account_status)) {
      throw invalidArgument("can't create action for deleted account")
    }
    if (!actor) throw invalidArgument('admin account is missing')

    const actionKey = crypto.randomUUID()
    const status = {
      MOD_BAN: 'BANNED',
      MOD_SUSPENSION: 'SUSPENDED',
      MOD_FLAG: 'FLAGGED',
      MOD_VET: 'ACTIVE'
    }[actionType]
    const signalType = {
      MOD_BAN: 'banned by human',
      MOD_SUSPENSION: 'suspended by human',
      MOD_FLAG: 'flagged to be banned',
      MOD_VET: 'vetted by human'
    }[actionType]
    const deactivateTypes =
      actionType === 'MOD_VET'
        ? ['MOD_BAN', 'MOD_FLAG']
        : ['MOD_BAN', 'MOD_FLAG'].includes(actionType)
          ? ['MOD_VET']
          : []
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT INTO player_account_actions
             (action_key, account_user_id, account_address, action_type,
              created_by_user_id, created_by_account_id, expires_at,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          actionKey,
          accountUserId,
          `identity:${accountUserId}`,
          actionType,
          actorUserId,
          actor.id,
          expiresAt.toISOString(),
          createdAt,
          createdAt
        )
    ]
    if (deactivateTypes.length > 0) {
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_account_action_deactivations
               (action_id, deactivated_by_action_id, actor_user_id, reason,
                created_at)
             SELECT previous.id, current.id, ?, ?, ?
             FROM player_account_actions previous
             JOIN player_account_actions current ON current.action_key = ?
             LEFT JOIN player_account_action_deactivations existing
               ON existing.action_id = previous.id
             WHERE previous.account_user_id = ?
               AND previous.action_type IN (${deactivateTypes.map(() => '?').join(',')})
               AND existing.action_id IS NULL
               AND previous.id <> current.id`
          )
          .bind(
            actorUserId,
            actionType === 'MOD_VET' ? 'VETTED' : 'SUPERSEDED_BY_SANCTION',
            createdAt,
            actionKey,
            accountUserId,
            ...deactivateTypes
          )
      )
    }
    statements.push(
      this.database
        .prepare(
          `UPDATE player_account_settings
           SET account_status = ?,
               leaderboard_eligible = CASE
                 WHEN ? = 'MOD_BAN' THEN 0
                 WHEN ? = 'MOD_VET' THEN 1
                 ELSE leaderboard_eligible
               END,
               updated_at = ?
           WHERE user_id = ?`
        )
        .bind(status, actionType, actionType, createdAt, accountUserId),
      this.database
        .prepare(
          `UPDATE player_conquest_gold_deliveries
           SET status = CASE WHEN ? = 'MOD_VET' THEN 'PENDING' ELSE 'DISABLED' END
           WHERE user_id = ?
             AND status = CASE WHEN ? = 'MOD_VET' THEN 'DISABLED' ELSE 'PENDING' END`
        )
        .bind(actionType, accountUserId, actionType),
      this.database
        .prepare(
          `INSERT INTO staff_account_action_signals
             (action_id, account_user_id, signal_type, signal_status,
              created_at, updated_at)
           SELECT id, account_user_id, ?, 'PENDING', ?, ?
           FROM player_account_actions WHERE action_key = ?`
        )
        .bind(signalType, createdAt, createdAt, actionKey)
    )
    await this.database.batch(statements)
    const created = await this.database
      .prepare(
        `SELECT action.id, action.account_user_id, action.account_address,
                action.action_type, action.created_by_account_id,
                action.expires_at, action.created_at, action.updated_at,
                0 AS deactivated
         FROM player_account_actions action WHERE action.action_key = ?`
      )
      .bind(actionKey)
      .first<ActionRow>()
    if (!created) throw new Error('account action did not persist')
    return accountAction(created)
  }
}
