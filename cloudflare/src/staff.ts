import type {
  AccountSignal,
  AccountStatus,
  GameMode,
  GameModeStatusHistory,
  GMStatsResponse,
  GMPendingCardsReponse,
  Page,
  SortBy
} from '@opensky/proto'

import { invalidArgument, notFound, permissionDenied } from './errors'
import { isConquestQueueReady } from './conquest-readiness'
import type { ConquestRewardPoolOperation } from './conquest-reward-pool-operations'
import type { LeaderboardRewardScheduleOperation } from './leaderboard-reward-schedule-operations'

interface StatusCountRow {
  account_status: AccountStatus
  count: number
}

interface StaffAccountRow {
  user_id: string
  conquests_unlocked: number
}

interface SignalRow {
  id: number
  match_id: number | null
  reporter_user_id: string | null
  signal_type: string
  signal_status: AccountSignal['signalStatus']
  comment: string
  created_at: string
  updated_at: string
}

interface SignalSummaryRow {
  user_id: string
  updated_at: string
  score: number
}

interface PendingGoldRow {
  user_id: string
  deliver_at: string
  cards_won_last_day: number
  cards_won_last_week: number
}

interface ConquestTreasureProgressRow {
  account_id: number
  account_name: string
  current_points: number
}

interface GameModeStatusHistoryRow {
  id: number
  game_mode: GameMode
  enabled: number
  created_at: string
}

const ACCOUNT_STATUSES = new Set<AccountStatus>([
  'ACTIVE' as AccountStatus,
  'SUSPENDED' as AccountStatus,
  'BANNED' as AccountStatus,
  'VIP' as AccountStatus,
  'FLAGGED' as AccountStatus,
  'TO_DELETE' as AccountStatus,
  'DELETED' as AccountStatus
])
const ACCOUNT_SORT_COLUMNS: Record<string, string> = {
  id: 'game.id',
  name: 'settings.name',
  created_at: 'users.created_at',
  createdAt: 'users.created_at'
}
const SIGNAL_SORT_COLUMNS: Record<string, string> = {
  score: 'score',
  updated_at: 'updated_at',
  updatedAt: 'updated_at',
  created_at: 'account_created_at',
  createdAt: 'account_created_at'
}
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const GAME_MODES = new Set<GameMode>([
  'RANKED_CONSTRUCTED' as GameMode,
  'CHALLENGE_CONSTRUCTED' as GameMode,
  'TUTORIAL' as GameMode,
  'PRACTICE_BOT' as GameMode,
  'RANKED_DISCOVERY' as GameMode,
  'CONQUEST_CONSTRUCTED' as GameMode,
  'CONQUEST_DISCOVERY' as GameMode,
  'WARM_UP' as GameMode,
  'CHALLENGE_DISCOVERY' as GameMode,
  'PRACTICE_PVP' as GameMode
])
const ACTION_TYPES_BY_FILTER: Record<string, string[]> = {
  // The source RIDL accidentally exposes this action-type filter as
  // AccountStatus[]. Go consequently compares the status ordinal to the
  // action-type ordinal: ACTIVE (0) selects MOD_BAN (0), and so on. Also accept
  // direct action names from clients that worked around that generated type.
  ACTIVE: ['MOD_BAN'],
  SUSPENDED: ['MOD_SUSPENSION'],
  BANNED: ['AUTO_BAN'],
  VIP: ['AUTO_SUSPENSION'],
  FLAGGED: ['DELAYED_MOD_BAN'],
  TO_DELETE: ['DELAYED_MOD_SUSPENSION'],
  DELETED: ['DELAYED_AUTO_BAN'],
  MOD_BAN: ['MOD_BAN'],
  MOD_SUSPENSION: ['MOD_SUSPENSION'],
  MOD_FLAG: ['MOD_FLAG'],
  MOD_VET: ['MOD_VET']
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

const pageSize = (page?: Page) =>
  Math.min(
    MAX_PAGE_SIZE,
    Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
      ? page!.pageSize!
      : DEFAULT_PAGE_SIZE
  )

const accountSort = (page?: Page): SortBy[] => {
  const sort = page?.sort?.length
    ? page.sort
    : [
        { column: 'id', order: 'ASC' as SortBy['order'] },
        { column: 'name', order: 'ASC' as SortBy['order'] }
      ]
  for (const item of sort) {
    if (!ACCOUNT_SORT_COLUMNS[item.column]) {
      throw invalidArgument(`unsupported account sort column '${item.column}'`)
    }
    if (!['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('account sort order is invalid')
    }
  }
  return sort
}

const signalSort = (page?: Page): SortBy[] => {
  const sort = page?.sort?.length
    ? page.sort
    : [{ column: 'score', order: 'DESC' as SortBy['order'] }]
  for (const item of sort) {
    if (!SIGNAL_SORT_COLUMNS[item.column]) {
      throw invalidArgument(`unsupported signal sort column '${item.column}'`)
    }
    if (!['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('signal sort order is invalid')
    }
  }
  return sort
}

const emptyStats = (): GMStatsResponse => ({
  total_active_users: 0,
  total_suspended_users: 0,
  total_banned_users: 0,
  total_vip_users: 0,
  total_flagged_users: 0,
  total_to_delete_users: 0
})

export class StaffRepository {
  constructor(private readonly database: D1Database) {}

  async requireAdmin(userId: string): Promise<void> {
    const role = await this.database
      .prepare(
        `SELECT 1 FROM staff_roles
         WHERE user_id = ? AND role = 'ADMIN'`
      )
      .bind(userId)
      .first()
    if (!role) throw permissionDenied('admin access required')
  }

  async requireContentWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(
        `SELECT 1 FROM staff_permissions
         WHERE user_id = ? AND permission = 'CONTENT_WRITE'`
      )
      .bind(userId)
      .first()
    if (!permission) throw permissionDenied('content write access required')
  }

  async requireModerationWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(`SELECT 1 FROM staff_moderation_permissions WHERE user_id = ?`)
      .bind(userId)
      .first()
    if (!permission) {
      throw permissionDenied('moderation write access required')
    }
  }

  async requireAccountActionWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(
        `SELECT 1 FROM staff_account_action_permissions WHERE user_id = ?`
      )
      .bind(userId)
      .first()
    if (!permission) {
      throw permissionDenied('account action write access required')
    }
  }

  async requirePlayerSupportWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(
        `SELECT 1 FROM staff_player_support_permissions WHERE user_id = ?`
      )
      .bind(userId)
      .first()
    if (!permission) {
      throw permissionDenied('player support write access required')
    }
  }

  async requireProgressionWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(`SELECT 1 FROM staff_progression_permissions WHERE user_id = ?`)
      .bind(userId)
      .first()
    if (!permission) {
      throw permissionDenied('progression write access required')
    }
  }

  async requireEntitlementWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(`SELECT 1 FROM staff_entitlement_permissions WHERE user_id = ?`)
      .bind(userId)
      .first()
    if (!permission) {
      throw permissionDenied('entitlement write access required')
    }
  }

  async requireGameModeWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(`SELECT 1 FROM staff_game_mode_permissions WHERE user_id = ?`)
      .bind(userId)
      .first()
    if (!permission) {
      throw permissionDenied('game mode write access required')
    }
  }

  async requireConquestConfigWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(
        `SELECT 1 FROM staff_conquest_config_permissions WHERE user_id = ?`
      )
      .bind(userId)
      .first()
    if (!permission) {
      throw permissionDenied('Conquest config write access required')
    }
  }

  async requireConquestRewardPoolWrite(
    userId: string,
    permission: ConquestRewardPoolOperation
  ): Promise<void> {
    await this.requireAdmin(userId)
    const row = await this.database
      .prepare(
        `SELECT 1 FROM staff_conquest_reward_pool_permissions
         WHERE user_id = ? AND permission = ?`
      )
      .bind(userId, permission)
      .first()
    if (!row) {
      throw permissionDenied(
        `Conquest reward pool ${permission.toLowerCase()} access required`
      )
    }
  }

  async requireLeaderboardRewardScheduleWrite(
    userId: string,
    permission: LeaderboardRewardScheduleOperation
  ): Promise<void> {
    await this.requireAdmin(userId)
    const row = await this.database
      .prepare(
        `SELECT 1 FROM staff_leaderboard_reward_schedule_permissions
         WHERE user_id = ? AND permission = ?`
      )
      .bind(userId, permission)
      .first()
    if (!row) {
      throw permissionDenied(
        `leaderboard reward schedule ${permission.toLowerCase()} access required`
      )
    }
  }

  async requireAppDevKeyWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(`SELECT 1 FROM staff_app_dev_key_permissions WHERE user_id = ?`)
      .bind(userId)
      .first()
    if (!permission) {
      throw permissionDenied('app developer key write access required')
    }
  }

  async requireSkypassRewardWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const permission = await this.database
      .prepare(`SELECT 1 FROM staff_skypass_reward_permissions WHERE user_id = ?`)
      .bind(userId)
      .first()
    if (!permission) {
      throw permissionDenied('SkyPass reward write access required')
    }
  }

  async setGameModeStatus(
    actorUserId: string,
    gameMode: GameMode,
    enable: boolean
  ): Promise<boolean> {
    if (!GAME_MODES.has(gameMode)) {
      throw invalidArgument('invalid game mode')
    }
    if (typeof enable !== 'boolean') {
      throw invalidArgument('enable must be a boolean')
    }
    if (
      enable &&
      ['CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'].includes(gameMode)
    ) {
      if (!(await isConquestQueueReady(this.database))) {
        throw invalidArgument('verified active Conquest reward pool required')
      }
    }
    const now = new Date().toISOString()
    const value = enable ? 1 : 0
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO game_mode_status_history
             (actor_user_id, game_mode, enabled, created_at)
           VALUES (?, ?, ?, ?)`
        )
        .bind(actorUserId, gameMode, value, now),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO game_mode_status
             (game_mode, enabled, updated_by_user_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(gameMode, value, actorUserId, now, now),
      this.database
        .prepare(
          `UPDATE game_mode_status
           SET enabled = ?, updated_by_user_id = ?, updated_at = ?
           WHERE game_mode = ? AND enabled <> ?`
        )
        .bind(value, actorUserId, now, gameMode, value)
    ])
    return true
  }

  async gameModeStatusHistory(
    page?: Page,
    gameModes?: GameMode[]
  ): Promise<{ page: Page; rows: GameModeStatusHistory[] }> {
    const modes = gameModes ?? []
    if (modes.some(mode => !GAME_MODES.has(mode))) {
      throw invalidArgument('invalid game mode filter')
    }
    if (page?.before !== undefined && page.after !== undefined) {
      throw invalidArgument('using before and after together is invalid')
    }
    const size = Math.min(
      200,
      page === undefined
        ? 200
        : Number.isSafeInteger(page.pageSize) && (page.pageSize ?? 0) > 0
          ? page.pageSize!
          : 20
    )
    const offset = cursorOffset(page?.before ?? page?.after)
    const filters = modes.length
      ? `WHERE game_mode IN (${modes.map(() => '?').join(',')})`
      : ''
    const result = await this.database
      .prepare(
        `SELECT id, game_mode, enabled, created_at
         FROM game_mode_status_history
         ${filters}
         ORDER BY created_at ASC, id ASC
         LIMIT ? OFFSET ?`
      )
      .bind(...modes, size + 1, offset)
      .all<GameModeStatusHistoryRow>()
    const rows = result.results.slice(0, size)
    const nextOffset = offset + rows.length
    return {
      page: {
        pageSize: size,
        before: rows.length ? encodeCursor(offset) : undefined,
        after: rows.length ? encodeCursor(nextOffset) : undefined,
        hasBefore: result.results.length > size,
        hasAfter: offset > 0,
        sort: [{ column: 'created_at', order: 'ASC' as SortBy['order'] }]
      },
      rows: rows.map(row => ({
        id: row.id,
        gameMode: row.game_mode,
        enabled: row.enabled === 1,
        createdAt: row.created_at
      }))
    }
  }

  async stats(): Promise<GMStatsResponse> {
    const rows = await this.database
      .prepare(
        `SELECT account_status, COUNT(*) AS count
         FROM player_account_settings
         GROUP BY account_status`
      )
      .all<StatusCountRow>()
    const stats = emptyStats()
    for (const row of rows.results) {
      switch (row.account_status) {
        case 'ACTIVE':
          stats.total_active_users = row.count
          break
        case 'SUSPENDED':
          stats.total_suspended_users = row.count
          break
        case 'BANNED':
          stats.total_banned_users = row.count
          break
        case 'VIP':
          stats.total_vip_users = row.count
          break
        case 'FLAGGED':
          stats.total_flagged_users = row.count
          break
        case 'TO_DELETE':
          stats.total_to_delete_users = row.count
          break
        case 'DELETED':
          break
      }
    }
    return stats
  }

  async accountStatus(accountReference: string): Promise<AccountStatus> {
    if (!accountReference.startsWith('identity:')) {
      throw notFound(
        `account with the address '${accountReference}' does not exist`
      )
    }
    const userId = accountReference.slice('identity:'.length)
    const row = await this.database
      .prepare(
        `SELECT account_status FROM player_account_settings WHERE user_id = ?`
      )
      .bind(userId)
      .first<{ account_status: AccountStatus }>()
    if (!row) {
      throw notFound(
        `account with the address '${accountReference}' does not exist`
      )
    }
    return row.account_status
  }

  async listAccounts(input: {
    page?: Page
    accountStatus?: AccountStatus[]
    accountActions?: AccountStatus[]
    createdBefore?: string
    createdAfter?: string
    conquestsUnlocked?: boolean
  }): Promise<{ page: Page; rows: StaffAccountRow[] }> {
    const statuses = input.accountStatus ?? []
    if (statuses.some(status => !ACCOUNT_STATUSES.has(status))) {
      throw invalidArgument('accountStatus is invalid')
    }
    const filters: string[] = []
    const bindings: unknown[] = []
    if (statuses.length) {
      filters.push(
        `settings.account_status IN (${statuses.map(() => '?').join(',')})`
      )
      bindings.push(...statuses)
    }
    for (const [field, value, operator] of [
      ['createdBefore', input.createdBefore, '<'],
      ['createdAfter', input.createdAfter, '>']
    ] as const) {
      if (value === undefined) continue
      if (!Number.isFinite(Date.parse(value))) {
        throw invalidArgument(`${field} is invalid`)
      }
      filters.push(`users.created_at ${operator} ?`)
      bindings.push(new Date(value).toISOString())
    }
    const conquestExpression = `EXISTS (
      SELECT 1 FROM player_account_stats stats
      WHERE stats.user_id = users.id
        AND stats.player_rank IN (
          'WANDERER', 'TRAINEE', 'APPRENTICE',
          'EXPERT', 'MASTER', 'GRANDWEAVER'
        )
    )`
    if (input.conquestsUnlocked !== undefined) {
      filters.push(`${conquestExpression} = ?`)
      bindings.push(input.conquestsUnlocked ? 1 : 0)
    }
    if (input.accountActions?.length) {
      const actionTypes = [
        ...new Set(
          input.accountActions.flatMap(
            status => ACTION_TYPES_BY_FILTER[status] ?? []
          )
        )
      ]
      if (actionTypes.length === 0) {
        filters.push('0 = 1')
      } else {
        filters.push(
          `EXISTS (
            SELECT 1 FROM player_account_actions action
            WHERE action.account_user_id = settings.user_id
              AND action.action_type IN (${actionTypes.map(() => '?').join(',')})
          )`
        )
        bindings.push(...actionTypes)
      }
    }

    const size = pageSize(input.page)
    const offset = cursorOffset(input.page?.before ?? input.page?.after)
    const sort = accountSort(input.page)
    const order = [
      ...sort.map(item => `${ACCOUNT_SORT_COLUMNS[item.column]} ${item.order}`),
      'game.id ASC'
    ].join(', ')
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const result = await this.database
      .prepare(
        `SELECT settings.user_id,
                ${conquestExpression} AS conquests_unlocked
         FROM player_account_settings settings
         JOIN users ON users.id = settings.user_id
         JOIN game_accounts game ON game.user_id = settings.user_id
         ${where}
         ORDER BY ${order}
         LIMIT ? OFFSET ?`
      )
      .bind(...bindings, size + 1, offset)
      .all<StaffAccountRow>()
    const rows = result.results.slice(0, size)
    const nextOffset = offset + rows.length
    return {
      page: {
        pageSize: size,
        before: rows.length ? encodeCursor(offset) : undefined,
        after: rows.length ? encodeCursor(nextOffset) : undefined,
        hasBefore: result.results.length > size,
        hasAfter: offset > 0,
        sort
      },
      rows
    }
  }

  async listAccountSignals(accountReference: string): Promise<AccountSignal[]> {
    if (!accountReference) throw invalidArgument('missing account address')
    if (!accountReference.startsWith('identity:')) return []
    const userId = accountReference.slice('identity:'.length)
    if (!userId) return []
    const result = await this.database
      .prepare(
        `SELECT id, match_id, reporter_user_id, signal_type, signal_status,
                comment, created_at, updated_at
         FROM player_account_reports WHERE reported_user_id = ?
         UNION ALL
         SELECT signal.id, NULL AS match_id, NULL AS reporter_user_id,
                signal.signal_type, signal.signal_status, '' AS comment,
                signal.created_at, signal.updated_at
         FROM staff_account_action_signals signal
         WHERE signal.account_user_id = ?
         ORDER BY signal_status ASC, created_at DESC, id DESC`
      )
      .bind(userId, userId)
      .all<SignalRow>()
    return result.results.map(row => ({
      id: row.id,
      signalType: row.signal_type,
      signalStatus: row.signal_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      signalData:
        row.reporter_user_id && row.match_id
          ? {
              reportedBy: `identity:${row.reporter_user_id}`,
              matchId: row.match_id,
              comment: row.comment
            }
          : {},
      // The current source score table does not assign a raw weight to the
      // "user report" signal. Aggregate fraud probability belongs to a
      // separate analytics pipeline that Cloud Weasel has not fabricated.
      score: 0
    }))
  }

  async signalSummaries(input: {
    page?: Page
    accountStatus?: AccountStatus[]
    createdBefore?: string
    createdAfter?: string
    accountAddress?: string
  }): Promise<{ page: Page; rows: SignalSummaryRow[] }> {
    const filters: string[] = []
    const bindings: unknown[] = []
    if (input.accountAddress?.startsWith('identity:')) {
      filters.push('signals.user_id = ?')
      bindings.push(input.accountAddress.slice('identity:'.length))
    } else {
      const statuses = input.accountStatus?.length
        ? input.accountStatus
        : (['ACTIVE'] as AccountStatus[])
      if (statuses.some(status => !ACCOUNT_STATUSES.has(status))) {
        throw invalidArgument('accountStatus is invalid')
      }
      filters.push(
        `settings.account_status IN (${statuses.map(() => '?').join(',')})`
      )
      bindings.push(...statuses)
      for (const [field, value, operator] of [
        ['createdBefore', input.createdBefore, '<'],
        ['createdAfter', input.createdAfter, '>']
      ] as const) {
        if (value === undefined) continue
        if (!Number.isFinite(Date.parse(value))) {
          throw invalidArgument(`${field} is invalid`)
        }
        filters.push(`users.created_at ${operator} ?`)
        bindings.push(new Date(value).toISOString())
      }
    }

    const sort = signalSort(input.page)
    const size = pageSize(input.page)
    const offset = cursorOffset(input.page?.before ?? input.page?.after)
    const order = [
      ...sort.map(item => `${SIGNAL_SORT_COLUMNS[item.column]} ${item.order}`),
      'game.id DESC'
    ].join(', ')
    const result = await this.database
      .prepare(
        `WITH all_signals AS (
           SELECT reported_user_id AS user_id, updated_at
           FROM player_account_reports
           UNION ALL
           SELECT account_user_id AS user_id, updated_at
           FROM staff_account_action_signals
         )
         SELECT signals.user_id,
                MAX(signals.updated_at) AS updated_at,
                users.created_at AS account_created_at,
                0.0 AS score
         FROM all_signals signals
         JOIN users ON users.id = signals.user_id
         JOIN player_account_settings settings
           ON settings.user_id = signals.user_id
         JOIN game_accounts game ON game.user_id = signals.user_id
         WHERE ${filters.join(' AND ')}
         GROUP BY signals.user_id, users.created_at, game.id
         ORDER BY ${order}
         LIMIT ? OFFSET ?`
      )
      .bind(...bindings, size + 1, offset)
      .all<SignalSummaryRow>()
    const rows = result.results.slice(0, size)
    const nextOffset = offset + rows.length
    return {
      page: {
        pageSize: size,
        before: rows.length ? encodeCursor(offset) : undefined,
        after: rows.length ? encodeCursor(nextOffset) : undefined,
        hasBefore: result.results.length > size,
        hasAfter: offset > 0,
        sort
      },
      rows
    }
  }

  async pendingGold(page?: Page): Promise<{
    page: Page
    rows: Array<
      Pick<
        GMPendingCardsReponse,
        'mintAt' | 'cardsWonLastDay' | 'cardsWonLastWeek'
      > & {
        userId: string
      }
    >
  }> {
    const sort = page?.sort?.length
      ? page.sort
      : [{ column: 'mint_at', order: 'ASC' as SortBy['order'] }]
    for (const item of sort) {
      if (
        !['mint_at', 'mintAt', 'run_at', 'deliver_at'].includes(item.column)
      ) {
        throw invalidArgument(
          `unsupported pending-card sort column '${item.column}'`
        )
      }
      if (!['ASC', 'DESC'].includes(item.order)) {
        throw invalidArgument('pending-card sort order is invalid')
      }
    }
    const size = Math.min(
      500,
      Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
        ? page!.pageSize!
        : 500
    )
    const offset = cursorOffset(page?.before ?? page?.after)
    const direction = sort[0].order
    const now = Date.now()
    const day = new Date(now - 24 * 60 * 60 * 1000).toISOString()
    const week = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
    const result = await this.database
      .prepare(
        `SELECT pending.user_id, pending.deliver_at,
                COALESCE((
                  SELECT SUM(json_array_length(day.card_ids_json))
                  FROM player_conquest_gold_deliveries day
                  WHERE day.user_id = pending.user_id AND day.created_at >= ?
                ), 0) AS cards_won_last_day,
                COALESCE((
                  SELECT SUM(json_array_length(week.card_ids_json))
                  FROM player_conquest_gold_deliveries week
                  WHERE week.user_id = pending.user_id AND week.created_at >= ?
                ), 0) AS cards_won_last_week
         FROM player_conquest_gold_deliveries pending
         WHERE pending.status = 'PENDING'
         ORDER BY pending.deliver_at ${direction}, pending.conquest_id ${direction}
         LIMIT ? OFFSET ?`
      )
      .bind(day, week, size + 1, offset)
      .all<PendingGoldRow>()
    const rows = result.results.slice(0, size)
    const nextOffset = offset + rows.length
    return {
      page: {
        pageSize: size,
        before: rows.length
          ? encodeCursor(Math.max(0, offset - size))
          : undefined,
        after: rows.length ? encodeCursor(nextOffset) : undefined,
        hasBefore: result.results.length > size,
        hasAfter: offset > 0,
        sort
      },
      rows: rows.map(row => ({
        userId: row.user_id,
        mintAt: row.deliver_at,
        cardsWonLastDay: row.cards_won_last_day,
        cardsWonLastWeek: row.cards_won_last_week
      }))
    }
  }

  async conquestTreasureProgress(page?: Page): Promise<{
    page: Page
    rows: ConquestTreasureProgressRow[]
  }> {
    const sort = page?.sort?.length
      ? page.sort
      : [{ column: 'current_points', order: 'DESC' as SortBy['order'] }]
    if (
      sort.length !== 1 ||
      !['current_points', 'currentPoints'].includes(sort[0].column)
    ) {
      throw invalidArgument('unsupported Conquest progress sort')
    }
    if (!['ASC', 'DESC'].includes(sort[0].order)) {
      throw invalidArgument('Conquest progress sort order is invalid')
    }
    const size = Math.min(200, pageSize(page))
    const offset = cursorOffset(page?.before ?? page?.after)
    const direction = sort[0].order
    const result = await this.database
      .prepare(
        `SELECT game.id AS account_id, settings.name AS account_name,
                points.current_points
         FROM player_conquest_points points
         JOIN player_account_settings settings
           ON settings.user_id = points.user_id
         JOIN game_accounts game ON game.user_id = points.user_id
         WHERE points.event_id = 2
         ORDER BY points.current_points ${direction}, game.id ${direction}
         LIMIT ? OFFSET ?`
      )
      .bind(size + 1, offset)
      .all<ConquestTreasureProgressRow>()
    const rows = result.results.slice(0, size)
    const nextOffset = offset + rows.length
    return {
      page: {
        pageSize: size,
        before: rows.length ? encodeCursor(offset) : undefined,
        after: rows.length ? encodeCursor(nextOffset) : undefined,
        hasBefore: result.results.length > size,
        hasAfter: offset > 0,
        sort
      },
      rows
    }
  }
}
