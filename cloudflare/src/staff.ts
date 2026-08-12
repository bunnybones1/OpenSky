import type {
  AccountSignal,
  AccountStatus,
  GMStatsResponse,
  GMPendingCardsReponse,
  Page,
  SortBy
} from '@opensky/proto'

import { invalidArgument, notFound, permissionDenied } from './errors'

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
  match_id: number
  reporter_user_id: string
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
    // Account actions have no Cloud Weasel rows until the audited moderation
    // action model is ported, so a requested action filter has no matches.
    if (input.accountActions?.length) filters.push('0 = 1')

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
         FROM player_account_reports
         WHERE reported_user_id = ?
         ORDER BY signal_status ASC, created_at DESC, id DESC`
      )
      .bind(userId)
      .all<SignalRow>()
    return result.results.map(row => ({
      id: row.id,
      signalType: row.signal_type,
      signalStatus: row.signal_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      signalData: {
        reportedBy: `identity:${row.reporter_user_id}`,
        matchId: row.match_id,
        comment: row.comment
      },
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
      filters.push('reports.reported_user_id = ?')
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
        `SELECT reports.reported_user_id AS user_id,
                MAX(reports.updated_at) AS updated_at,
                users.created_at AS account_created_at,
                0.0 AS score
         FROM player_account_reports reports
         JOIN users ON users.id = reports.reported_user_id
         JOIN player_account_settings settings
           ON settings.user_id = reports.reported_user_id
         JOIN game_accounts game ON game.user_id = reports.reported_user_id
         WHERE ${filters.join(' AND ')}
         GROUP BY reports.reported_user_id, users.created_at, game.id
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
}
