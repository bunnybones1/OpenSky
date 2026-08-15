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

import { sourceAccountSignalListWire } from './account-signal-wire'
import { invalidArgument, notFound, permissionDenied } from './errors'
import { isConquestQueueReady } from './conquest-readiness'
import type { ConquestRewardPoolOperation } from './conquest-reward-pool-operations'
import type { ConquestV2RewardScheduleOperation } from './conquest-v2-reward-schedule-operations'
import type { LeaderboardRewardScheduleOperation } from './leaderboard-reward-schedule-operations'
import type { ReferralStickerScheduleOperation } from './referral-sticker-schedule-operations'

interface StatusCountRow {
  account_status: AccountStatus
  count: number
}

interface StaffAccountRow {
  user_id: string
  account_id: number
  account_name: string
  created_at: string
  conquests_unlocked: number
}

type StaffAccountSortValue = string | number

interface AccountSortConfig {
  sort: Array<{
    response: SortBy
    sql: string
    value: (row: StaffAccountRow) => StaffAccountSortValue
  }>
  uniqueOrder: SortBy['order']
}

interface AccountCursor {
  accountId: number
  values: string[]
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
  account_id: number
  updated_at: string
  account_created_at: string
  score: number
}

type SignalSummarySortValue = string | number

interface SignalSortConfig {
  sort: Array<{
    response: SortBy
    sql: string
    value: (row: SignalSummaryRow) => SignalSummarySortValue
    numeric: boolean
  }>
  uniqueOrder: SortBy['order']
}

interface SignalCursor {
  accountId: number
  values: Array<string | number>
}

interface PendingGoldRow {
  conquest_id: number
  user_id: string
  deliver_at: string
  cards_won_last_day: number
  cards_won_last_week: number
}

interface PendingGoldSortConfig {
  sort: Array<{
    response: SortBy
    sql: string
    value: (row: PendingGoldRow) => string
  }>
  uniqueOrder: SortBy['order']
}

interface PendingGoldCursor {
  conquestId: number
  values: string[]
}

interface ConquestTreasureProgressRow {
  account_id: number
  account_name: string
  event_id: number
  current_points: number
  total_points: number
}

type ConquestProgressSortColumn =
  | 'account_id'
  | 'event_id'
  | 'current_points'
  | 'total_points'

interface ConquestProgressSortConfig {
  sort: Array<{
    response: SortBy
    column: ConquestProgressSortColumn
  }>
  uniqueOrder: SortBy['order']
}

interface ConquestProgressCursor {
  currentPoints: number
  values: number[]
}

interface GameModeStatusHistoryRow {
  id: number
  actor_account_id?: number | null
  game_mode: GameMode
  enabled: number
  created_at: string
}

type GameModeHistorySortValue = string | number | null

interface GameModeHistorySortConfig {
  sort: Array<{
    response: SortBy
    value: (row: GameModeStatusHistoryRow) => GameModeHistorySortValue
    numeric: boolean
  }>
  uniqueOrder: SortBy['order']
}

interface GameModeHistoryCursor {
  createdAt: string
  values: Array<string | null>
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
const ACCOUNT_SORT_COLUMNS: Record<
  string,
  | {
      sql: string
      value: (row: StaffAccountRow) => StaffAccountSortValue
      unique?: boolean
    }
  | undefined
> = {
  id: { sql: 'game.id', value: row => row.account_id, unique: true },
  name: { sql: 'settings.name', value: row => row.account_name },
  created_at: { sql: 'users.created_at', value: row => row.created_at },
  createdAt: { sql: 'users.created_at', value: row => row.created_at }
}
const SIGNAL_SORT_COLUMNS: Record<
  string,
  | {
      sql: string
      value: (row: SignalSummaryRow) => SignalSummarySortValue
      numeric?: boolean
    }
  | undefined
> = {
  score: { sql: 'score', value: row => row.score, numeric: true },
  updated_at: { sql: 'updated_at', value: row => row.updated_at },
  updatedAt: { sql: 'updated_at', value: row => row.updated_at },
  created_at: {
    sql: 'account_created_at',
    value: row => row.account_created_at
  },
  createdAt: {
    sql: 'account_created_at',
    value: row => row.account_created_at
  }
}
const PENDING_GOLD_SORT_COLUMNS: Record<
  string,
  | {
      sql: string
      value: (row: PendingGoldRow) => string
    }
  | undefined
> = {
  mint_at: { sql: 'pending.deliver_at', value: row => row.deliver_at },
  mintAt: { sql: 'pending.deliver_at', value: row => row.deliver_at },
  run_at: { sql: 'pending.deliver_at', value: row => row.deliver_at },
  deliver_at: { sql: 'pending.deliver_at', value: row => row.deliver_at }
}
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
const GAME_MODE_HISTORY_SORT_COLUMNS: Record<
  string,
  | {
      value: (row: GameModeStatusHistoryRow) => GameModeHistorySortValue
      numeric?: boolean
      unique?: boolean
    }
  | undefined
> = {
  id: { value: row => row.id, numeric: true },
  account_id: {
    value: row => row.actor_account_id ?? null,
    numeric: true
  },
  accountID: {
    value: row => row.actor_account_id ?? null,
    numeric: true
  },
  game_mode: { value: row => row.game_mode },
  gameMode: { value: row => row.game_mode },
  enabled: { value: row => (row.enabled === 1 ? 'true' : 'false') },
  created_at: { value: row => row.created_at, unique: true },
  createdAt: { value: row => row.created_at, unique: true }
}
const CONQUEST_PROGRESS_SORT_COLUMNS: Record<
  string,
  ConquestProgressSortColumn | undefined
> = {
  account_id: 'account_id',
  accountID: 'account_id',
  event_id: 'event_id',
  eventID: 'event_id',
  current_points: 'current_points',
  currentPoints: 'current_points',
  total_points: 'total_points',
  totalPoints: 'total_points'
}

const compareGameModeHistoryValues = (
  left: GameModeHistorySortValue,
  right: GameModeHistorySortValue,
  order: SortBy['order']
): number => {
  if (left === null || right === null) {
    if (left === right) return 0
    return left === null ? (order === 'ASC' ? 1 : -1) : order === 'ASC' ? -1 : 1
  }
  const compared =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left) < String(right)
        ? -1
        : String(left) > String(right)
          ? 1
          : 0
  return order === 'ASC' ? compared : -compared
}

const gameModeHistorySort = (page?: Page): GameModeHistorySortConfig => {
  const requested = page?.sort?.length
    ? page.sort
    : [{ column: 'created_at', order: 'ASC' as SortBy['order'] }]
  const sort: GameModeHistorySortConfig['sort'] = []
  let uniqueOrder = 'ASC' as SortBy['order']
  for (const item of requested) {
    const column = GAME_MODE_HISTORY_SORT_COLUMNS[item.column]
    if (!column || !['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('game mode status history sort is invalid')
    }
    if (column.unique) {
      uniqueOrder = item.order
    } else {
      sort.push({
        response: item,
        value: column.value,
        numeric: column.numeric === true
      })
    }
  }
  if (sort.length === 1) uniqueOrder = sort[0].response.order
  return { sort, uniqueOrder }
}

const encodeGameModeHistoryCursor = (
  row: GameModeStatusHistoryRow,
  config: GameModeHistorySortConfig
) =>
  btoa(
    JSON.stringify([
      row.created_at,
      ...config.sort.map(item => {
        const value = item.value(row)
        return value === null ? null : String(value)
      })
    ])
  )

const decodeGameModeHistoryCursor = (
  value: string,
  config: GameModeHistorySortConfig
): GameModeHistoryCursor => {
  try {
    const values = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(values) ||
      values.length !== config.sort.length + 1 ||
      values.some(item => item !== null && typeof item !== 'string') ||
      typeof values[0] !== 'string' ||
      !values[0]
    ) {
      throw new Error('cursor shape')
    }
    return {
      createdAt: values[0],
      values: values.slice(1) as Array<string | null>
    }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const compareGameModeHistoryCursor = (
  row: GameModeStatusHistoryRow,
  cursor: GameModeHistoryCursor,
  config: GameModeHistorySortConfig
): number => {
  for (const [index, item] of config.sort.entries()) {
    const raw = cursor.values[index]
    let cursorValue: GameModeHistorySortValue = raw
    if (raw !== null && item.numeric) {
      const parsed = Number(raw)
      if (!Number.isSafeInteger(parsed))
        throw invalidArgument('page cursor is invalid')
      cursorValue = parsed
    }
    const compared = compareGameModeHistoryValues(
      item.value(row),
      cursorValue,
      item.response.order
    )
    if (compared) return compared
  }
  return compareGameModeHistoryValues(
    row.created_at,
    cursor.createdAt,
    config.uniqueOrder
  )
}

const sortGameModeHistoryRows = (
  rows: GameModeStatusHistoryRow[],
  config: GameModeHistorySortConfig
) =>
  rows.sort((left, right) => {
    for (const item of config.sort) {
      const compared = compareGameModeHistoryValues(
        item.value(left),
        item.value(right),
        item.response.order
      )
      if (compared) return compared
    }
    return compareGameModeHistoryValues(
      left.created_at,
      right.created_at,
      config.uniqueOrder
    )
  })

const conquestProgressSort = (page?: Page): ConquestProgressSortConfig => {
  const requested = page?.sort?.length
    ? page.sort
    : [{ column: 'current_points', order: 'DESC' as SortBy['order'] }]
  const sort: ConquestProgressSortConfig['sort'] = []
  let uniqueOrder = 'DESC' as SortBy['order']
  for (const item of requested) {
    const column = CONQUEST_PROGRESS_SORT_COLUMNS[item.column]
    if (!column || !['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('Conquest progress sort is invalid')
    }
    if (column === 'current_points') {
      uniqueOrder = item.order
    } else {
      sort.push({ response: item, column })
    }
  }
  if (sort.length === 1) uniqueOrder = sort[0].response.order
  return { sort, uniqueOrder }
}

const encodeConquestProgressCursor = (
  row: ConquestTreasureProgressRow,
  config: ConquestProgressSortConfig
) =>
  btoa(
    JSON.stringify([
      String(row.current_points),
      ...config.sort.map(item => String(row[item.column]))
    ])
  )

const decodeConquestProgressCursor = (
  value: string,
  config: ConquestProgressSortConfig
): ConquestProgressCursor => {
  try {
    const raw = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(raw) ||
      raw.length !== config.sort.length + 1 ||
      raw.some(item => typeof item !== 'string' || !/^(0|[1-9]\d*)$/.test(item))
    ) {
      throw new Error('cursor shape')
    }
    const values = raw.map(Number)
    if (values.some(item => !Number.isSafeInteger(item))) {
      throw new Error('cursor value')
    }
    return { currentPoints: values[0], values: values.slice(1) }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const compareConquestProgressValues = (
  left: number,
  right: number,
  order: SortBy['order']
) => (order === 'ASC' ? left - right : right - left)

const compareConquestProgressCursor = (
  row: ConquestTreasureProgressRow,
  cursor: ConquestProgressCursor,
  config: ConquestProgressSortConfig
) => {
  for (const [index, item] of config.sort.entries()) {
    const compared = compareConquestProgressValues(
      row[item.column],
      cursor.values[index],
      item.response.order
    )
    if (compared) return compared
  }
  return compareConquestProgressValues(
    row.current_points,
    cursor.currentPoints,
    config.uniqueOrder
  )
}

const sortConquestProgressRows = (
  rows: ConquestTreasureProgressRow[],
  config: ConquestProgressSortConfig
) =>
  rows.sort((left, right) => {
    for (const item of config.sort) {
      const compared = compareConquestProgressValues(
        left[item.column],
        right[item.column],
        item.response.order
      )
      if (compared) return compared
    }
    return compareConquestProgressValues(
      left.current_points,
      right.current_points,
      config.uniqueOrder
    )
  })

const accountSort = (page?: Page): AccountSortConfig => {
  const requested = page?.sort?.length
    ? page.sort
    : [{ column: 'name', order: 'ASC' as SortBy['order'] }]
  const sort: AccountSortConfig['sort'] = []
  let uniqueOrder = 'ASC' as SortBy['order']
  for (const item of requested) {
    const column = ACCOUNT_SORT_COLUMNS[item.column]
    if (!column || !['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('account sort is invalid')
    }
    if (column.unique) {
      uniqueOrder = item.order
    } else {
      sort.push({ response: item, sql: column.sql, value: column.value })
    }
  }
  if (sort.length === 1) uniqueOrder = sort[0].response.order
  return { sort, uniqueOrder }
}

const encodeAccountCursor = (row: StaffAccountRow, config: AccountSortConfig) =>
  btoa(
    JSON.stringify([
      String(row.account_id),
      ...config.sort.map(item => String(item.value(row)))
    ])
  )

const decodeAccountCursor = (
  value: string,
  config: AccountSortConfig
): AccountCursor => {
  try {
    const raw = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(raw) ||
      raw.length !== config.sort.length + 1 ||
      raw.some(item => typeof item !== 'string') ||
      !/^[1-9]\d*$/.test(raw[0] as string)
    ) {
      throw new Error('cursor shape')
    }
    const accountId = Number(raw[0])
    if (!Number.isSafeInteger(accountId)) throw new Error('cursor value')
    return { accountId, values: raw.slice(1) as string[] }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const invertOrder = (order: SortBy['order']): SortBy['order'] =>
  order === 'ASC' ? ('DESC' as SortBy['order']) : ('ASC' as SortBy['order'])

const accountCursorCondition = (
  cursor: AccountCursor,
  config: AccountSortConfig,
  reverse: boolean
): { sql: string; bindings: Array<string | number> } => {
  const clauses: string[] = []
  const bindings: Array<string | number> = []
  for (let index = 0; index <= config.sort.length; index += 1) {
    const terms: string[] = []
    for (let equal = 0; equal < index; equal += 1) {
      terms.push(`${config.sort[equal].sql} = ?`)
      bindings.push(cursor.values[equal])
    }
    if (index < config.sort.length) {
      const item = config.sort[index]
      const order = reverse
        ? invertOrder(item.response.order)
        : item.response.order
      terms.push(`${item.sql} ${order === 'ASC' ? '>' : '<'} ?`)
      bindings.push(cursor.values[index])
    } else {
      const order = reverse
        ? invertOrder(config.uniqueOrder)
        : config.uniqueOrder
      terms.push(`game.id ${order === 'ASC' ? '>' : '<'} ?`)
      bindings.push(cursor.accountId)
    }
    clauses.push(`(${terms.join(' AND ')})`)
  }
  return { sql: `(${clauses.join(' OR ')})`, bindings }
}

const accountOrder = (config: AccountSortConfig, reverse: boolean) =>
  [
    ...config.sort.map(item => {
      const order = reverse
        ? invertOrder(item.response.order)
        : item.response.order
      return `${item.sql} ${order}`
    }),
    `game.id ${reverse ? invertOrder(config.uniqueOrder) : config.uniqueOrder}`
  ].join(', ')

const signalSort = (page?: Page): SignalSortConfig => {
  const requested = page?.sort?.length
    ? page.sort
    : [{ column: 'score', order: 'DESC' as SortBy['order'] }]
  const sort: SignalSortConfig['sort'] = []
  let uniqueOrder = 'DESC' as SortBy['order']
  for (const item of requested) {
    const column = SIGNAL_SORT_COLUMNS[item.column]
    if (!column || !['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('signal sort is invalid')
    }
    sort.push({
      response: item,
      sql: column.sql,
      value: column.value,
      numeric: column.numeric === true
    })
  }
  if (sort.length === 1) uniqueOrder = sort[0].response.order
  return { sort, uniqueOrder }
}

const encodeSignalCursor = (row: SignalSummaryRow, config: SignalSortConfig) =>
  btoa(
    JSON.stringify([
      String(row.account_id),
      ...config.sort.map(item => String(item.value(row)))
    ])
  )

const decodeSignalCursor = (
  value: string,
  config: SignalSortConfig
): SignalCursor => {
  try {
    const raw = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(raw) ||
      raw.length !== config.sort.length + 1 ||
      raw.some(item => typeof item !== 'string') ||
      !/^[1-9]\d*$/.test(raw[0] as string)
    ) {
      throw new Error('cursor shape')
    }
    const accountId = Number(raw[0])
    if (!Number.isSafeInteger(accountId)) throw new Error('cursor value')
    const values = config.sort.map((item, index) => {
      const cursorValue = raw[index + 1] as string
      if (!item.numeric) return cursorValue
      const parsed = Number(cursorValue)
      if (!Number.isFinite(parsed)) throw new Error('cursor value')
      return parsed
    })
    return { accountId, values }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const signalCursorCondition = (
  cursor: SignalCursor,
  config: SignalSortConfig,
  reverse: boolean
): { sql: string; bindings: Array<string | number> } => {
  const clauses: string[] = []
  const bindings: Array<string | number> = []
  for (let index = 0; index <= config.sort.length; index += 1) {
    const terms: string[] = []
    for (let equal = 0; equal < index; equal += 1) {
      terms.push(`${config.sort[equal].sql} = ?`)
      bindings.push(cursor.values[equal])
    }
    if (index < config.sort.length) {
      const item = config.sort[index]
      const order = reverse
        ? invertOrder(item.response.order)
        : item.response.order
      terms.push(`${item.sql} ${order === 'ASC' ? '>' : '<'} ?`)
      bindings.push(cursor.values[index])
    } else {
      const order = reverse
        ? invertOrder(config.uniqueOrder)
        : config.uniqueOrder
      terms.push(`account_id ${order === 'ASC' ? '>' : '<'} ?`)
      bindings.push(cursor.accountId)
    }
    clauses.push(`(${terms.join(' AND ')})`)
  }
  return { sql: `(${clauses.join(' OR ')})`, bindings }
}

const signalOrder = (config: SignalSortConfig, reverse: boolean) =>
  [
    ...config.sort.map(item => {
      const order = reverse
        ? invertOrder(item.response.order)
        : item.response.order
      return `${item.sql} ${order}`
    }),
    `account_id ${reverse ? invertOrder(config.uniqueOrder) : config.uniqueOrder}`
  ].join(', ')

const pendingGoldSort = (page?: Page): PendingGoldSortConfig => {
  const requested = page?.sort?.length
    ? page.sort
    : [{ column: 'run_at', order: 'ASC' as SortBy['order'] }]
  const sort: PendingGoldSortConfig['sort'] = []
  let uniqueOrder = 'ASC' as SortBy['order']
  for (const item of requested) {
    if (!['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('pending-card sort is invalid')
    }
    if (item.column === 'id' || item.column === 'conquest_id') {
      uniqueOrder = item.order
      continue
    }
    const column = PENDING_GOLD_SORT_COLUMNS[item.column]
    if (!column) throw invalidArgument('pending-card sort is invalid')
    sort.push({ response: item, sql: column.sql, value: column.value })
  }
  if (sort.length === 1) uniqueOrder = sort[0].response.order
  return { sort, uniqueOrder }
}

const encodePendingGoldCursor = (
  row: PendingGoldRow,
  config: PendingGoldSortConfig
) =>
  btoa(
    JSON.stringify([
      String(row.conquest_id),
      ...config.sort.map(item => item.value(row))
    ])
  )

const decodePendingGoldCursor = (
  value: string,
  config: PendingGoldSortConfig
): PendingGoldCursor => {
  try {
    const raw = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(raw) ||
      raw.length !== config.sort.length + 1 ||
      raw.some(item => typeof item !== 'string') ||
      !/^[1-9]\d*$/.test(raw[0] as string)
    ) {
      throw new Error('cursor shape')
    }
    const conquestId = Number(raw[0])
    if (!Number.isSafeInteger(conquestId)) throw new Error('cursor value')
    return { conquestId, values: raw.slice(1) as string[] }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const pendingGoldCursorCondition = (
  cursor: PendingGoldCursor,
  config: PendingGoldSortConfig,
  reverse: boolean
): { sql: string; bindings: Array<string | number> } => {
  const clauses: string[] = []
  const bindings: Array<string | number> = []
  for (let index = 0; index <= config.sort.length; index += 1) {
    const terms: string[] = []
    for (let equal = 0; equal < index; equal += 1) {
      terms.push(`${config.sort[equal].sql} = ?`)
      bindings.push(cursor.values[equal])
    }
    if (index < config.sort.length) {
      const item = config.sort[index]
      const order = reverse
        ? invertOrder(item.response.order)
        : item.response.order
      terms.push(`${item.sql} ${order === 'ASC' ? '>' : '<'} ?`)
      bindings.push(cursor.values[index])
    } else {
      const order = reverse
        ? invertOrder(config.uniqueOrder)
        : config.uniqueOrder
      terms.push(`pending.conquest_id ${order === 'ASC' ? '>' : '<'} ?`)
      bindings.push(cursor.conquestId)
    }
    clauses.push(`(${terms.join(' AND ')})`)
  }
  return { sql: `(${clauses.join(' OR ')})`, bindings }
}

const pendingGoldOrder = (config: PendingGoldSortConfig, reverse: boolean) =>
  [
    ...config.sort.map(item => {
      const order = reverse
        ? invertOrder(item.response.order)
        : item.response.order
      return `${item.sql} ${order}`
    }),
    `pending.conquest_id ${
      reverse ? invertOrder(config.uniqueOrder) : config.uniqueOrder
    }`
  ].join(', ')

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

  async requireConquestReadinessWrite(userId: string): Promise<void> {
    await this.requireAdmin(userId)
    const row = await this.database
      .prepare(
        `SELECT 1 FROM staff_conquest_readiness_permissions
         WHERE user_id = ? AND permission = 'VERIFY'`
      )
      .bind(userId)
      .first()
    if (!row) {
      throw permissionDenied('Conquest readiness verify access required')
    }
  }

  async requireConquestV2RewardScheduleWrite(
    userId: string,
    permission: ConquestV2RewardScheduleOperation
  ): Promise<void> {
    await this.requireAdmin(userId)
    const row = await this.database
      .prepare(
        `SELECT 1 FROM staff_conquest_v2_reward_schedule_permissions
         WHERE user_id = ? AND permission = ?`
      )
      .bind(userId, permission)
      .first()
    if (!row) {
      throw permissionDenied(
        `Conquest V2 reward schedule ${permission.toLowerCase()} access required`
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

  async requireReferralStickerScheduleWrite(
    userId: string,
    permission: ReferralStickerScheduleOperation
  ): Promise<void> {
    await this.requireAdmin(userId)
    const row = await this.database
      .prepare(
        `SELECT 1 FROM staff_referral_sticker_schedule_permissions
         WHERE user_id = ? AND permission = ?`
      )
      .bind(userId, permission)
      .first()
    if (!row) {
      throw permissionDenied(
        `referral sticker schedule ${permission.toLowerCase()} access required`
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
      .prepare(
        `SELECT 1 FROM staff_skypass_reward_permissions WHERE user_id = ?`
      )
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
    const sort = gameModeHistorySort(page)
    const filters = modes.length
      ? `WHERE history.game_mode IN (${modes.map(() => '?').join(',')})`
      : ''
    const result = await this.database
      .prepare(
        `SELECT history.id, actor.id AS actor_account_id,
                history.game_mode, history.enabled, history.created_at
         FROM game_mode_status_history history
         LEFT JOIN game_accounts actor ON actor.user_id = history.actor_user_id
         ${filters}`
      )
      .bind(...modes)
      .all<GameModeStatusHistoryRow>()
    const rows = sortGameModeHistoryRows(result.results, sort)
    let start = 0
    let end = Math.min(rows.length, size)
    if (page?.before) {
      const cursor = decodeGameModeHistoryCursor(page.before, sort)
      const next = rows.findIndex(
        row => compareGameModeHistoryCursor(row, cursor, sort) > 0
      )
      start = next < 0 ? rows.length : next
      end = Math.min(rows.length, start + size)
    } else if (page?.after) {
      const cursor = decodeGameModeHistoryCursor(page.after, sort)
      const previousEnd = rows.findIndex(
        row => compareGameModeHistoryCursor(row, cursor, sort) >= 0
      )
      end = previousEnd < 0 ? rows.length : previousEnd
      start = Math.max(0, end - size)
    }
    const selected = rows.slice(start, end)
    return {
      page: {
        pageSize: size,
        before: selected.length
          ? encodeGameModeHistoryCursor(selected[0], sort)
          : undefined,
        after: selected.length
          ? encodeGameModeHistoryCursor(selected[selected.length - 1], sort)
          : undefined,
        hasBefore: end < rows.length,
        hasAfter: start > 0,
        sort: sort.sort.map(item => item.response)
      },
      rows: selected.map(row => ({
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
    if (input.page?.before !== undefined && input.page.after !== undefined) {
      throw invalidArgument('using before and after together is invalid')
    }
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

    const size = Math.min(
      200,
      Number.isSafeInteger(input.page?.pageSize) &&
        (input.page?.pageSize ?? 0) > 0
        ? input.page!.pageSize!
        : 20
    )
    const sort = accountSort(input.page)
    const reverse = input.page?.after !== undefined
    const cursorValue = reverse ? input.page?.after : input.page?.before
    if (cursorValue !== undefined) {
      const condition = accountCursorCondition(
        decodeAccountCursor(cursorValue, sort),
        sort,
        reverse
      )
      filters.push(condition.sql)
      bindings.push(...condition.bindings)
    }
    const order = accountOrder(sort, reverse)
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const result = await this.database
      .prepare(
        `SELECT settings.user_id, game.id AS account_id,
                settings.name AS account_name, users.created_at,
                ${conquestExpression} AS conquests_unlocked
         FROM player_account_settings settings
         JOIN users ON users.id = settings.user_id
         JOIN game_accounts game ON game.user_id = settings.user_id
         ${where}
         ORDER BY ${order}
         LIMIT ?`
      )
      .bind(...bindings, size + 1)
      .all<StaffAccountRow>()
    const hasExtra = result.results.length > size
    const rows = result.results.slice(0, size)
    if (reverse) rows.reverse()
    return {
      page: {
        pageSize: size,
        before: rows.length ? encodeAccountCursor(rows[0], sort) : undefined,
        after: rows.length
          ? encodeAccountCursor(rows[rows.length - 1], sort)
          : undefined,
        hasBefore: reverse ? cursorValue !== undefined : hasExtra,
        hasAfter: reverse ? hasExtra : cursorValue !== undefined,
        sort: sort.sort.map(item => item.response)
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
    return sourceAccountSignalListWire(
      result.results.map(row => ({
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
    )
  }

  async signalSummaries(input: {
    page?: Page
    accountStatus?: AccountStatus[]
    createdBefore?: string
    createdAfter?: string
    accountAddress?: string
  }): Promise<{ page: Page; rows: SignalSummaryRow[] }> {
    if (input.page?.before !== undefined && input.page.after !== undefined) {
      throw invalidArgument('using before and after together is invalid')
    }
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
    const size = Math.min(
      200,
      Number.isSafeInteger(input.page?.pageSize) &&
        (input.page?.pageSize ?? 0) > 0
        ? input.page!.pageSize!
        : 20
    )
    const reverse = input.page?.after !== undefined
    const cursorValue = reverse ? input.page?.after : input.page?.before
    let cursorWhere = ''
    const cursorBindings: Array<string | number> = []
    if (cursorValue !== undefined) {
      const condition = signalCursorCondition(
        decodeSignalCursor(cursorValue, sort),
        sort,
        reverse
      )
      cursorWhere = `WHERE ${condition.sql}`
      cursorBindings.push(...condition.bindings)
    }
    const order = signalOrder(sort, reverse)
    const result = await this.database
      .prepare(
        `WITH all_signals AS (
           SELECT reported_user_id AS user_id, updated_at
           FROM player_account_reports
           UNION ALL
           SELECT account_user_id AS user_id, updated_at
           FROM staff_account_action_signals
         ), summaries AS (
           SELECT signals.user_id, game.id AS account_id,
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
         )
         SELECT user_id, account_id, updated_at, account_created_at, score
         FROM summaries
         ${cursorWhere}
         ORDER BY ${order}
         LIMIT ?`
      )
      .bind(...bindings, ...cursorBindings, size + 1)
      .all<SignalSummaryRow>()
    const hasExtra = result.results.length > size
    const rows = result.results.slice(0, size)
    if (reverse) rows.reverse()
    return {
      page: {
        pageSize: size,
        before: rows.length ? encodeSignalCursor(rows[0], sort) : undefined,
        after: rows.length
          ? encodeSignalCursor(rows[rows.length - 1], sort)
          : undefined,
        hasBefore: reverse ? cursorValue !== undefined : hasExtra,
        hasAfter: reverse ? hasExtra : cursorValue !== undefined,
        sort: sort.sort.map(item => item.response)
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
    if (page?.before !== undefined && page.after !== undefined) {
      throw invalidArgument('using before and after together is invalid')
    }
    const sort = pendingGoldSort(page)
    const size = Math.min(
      200,
      Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
        ? page!.pageSize!
        : page === undefined
          ? 200
          : 20
    )
    const reverse = page?.after !== undefined
    const cursorValue = reverse ? page?.after : page?.before
    let cursorWhere = ''
    const cursorBindings: Array<string | number> = []
    if (cursorValue !== undefined) {
      const condition = pendingGoldCursorCondition(
        decodePendingGoldCursor(cursorValue, sort),
        sort,
        reverse
      )
      cursorWhere = `AND ${condition.sql}`
      cursorBindings.push(...condition.bindings)
    }
    const now = Date.now()
    const day = new Date(now - 24 * 60 * 60 * 1000).toISOString()
    const week = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
    const result = await this.database
      .prepare(
        `SELECT pending.conquest_id, pending.user_id, pending.deliver_at,
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
         ${cursorWhere}
         ORDER BY ${pendingGoldOrder(sort, reverse)}
         LIMIT ?`
      )
      .bind(day, week, ...cursorBindings, size + 1)
      .all<PendingGoldRow>()
    const hasExtra = result.results.length > size
    const rows = result.results.slice(0, size)
    if (reverse) rows.reverse()
    return {
      page: {
        pageSize: size,
        before: rows.length
          ? encodePendingGoldCursor(rows[0], sort)
          : undefined,
        after: rows.length
          ? encodePendingGoldCursor(rows[rows.length - 1], sort)
          : undefined,
        hasBefore: reverse ? cursorValue !== undefined : hasExtra,
        hasAfter: reverse ? hasExtra : cursorValue !== undefined,
        sort: sort.sort.map(item => item.response)
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
    if (page?.before !== undefined && page.after !== undefined) {
      throw invalidArgument('using before and after together is invalid')
    }
    const size = Math.min(
      200,
      Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
        ? page!.pageSize!
        : 20
    )
    const sort = conquestProgressSort(page)
    const result = await this.database
      .prepare(
        `SELECT game.id AS account_id, settings.name AS account_name,
                points.event_id, points.current_points, points.total_points
         FROM player_conquest_points points
         JOIN player_account_settings settings
           ON settings.user_id = points.user_id
         JOIN game_accounts game ON game.user_id = points.user_id
         WHERE points.event_id = 2`
      )
      .all<ConquestTreasureProgressRow>()
    const rows = sortConquestProgressRows(result.results, sort)
    let start = 0
    let end = Math.min(rows.length, size)
    if (page?.before) {
      const cursor = decodeConquestProgressCursor(page.before, sort)
      const next = rows.findIndex(
        row => compareConquestProgressCursor(row, cursor, sort) > 0
      )
      start = next < 0 ? rows.length : next
      end = Math.min(rows.length, start + size)
    } else if (page?.after) {
      const cursor = decodeConquestProgressCursor(page.after, sort)
      const previousEnd = rows.findIndex(
        row => compareConquestProgressCursor(row, cursor, sort) >= 0
      )
      end = previousEnd < 0 ? rows.length : previousEnd
      start = Math.max(0, end - size)
    }
    const selected = rows.slice(start, end)
    return {
      page: {
        pageSize: size,
        before: selected.length
          ? encodeConquestProgressCursor(selected[0], sort)
          : undefined,
        after: selected.length
          ? encodeConquestProgressCursor(selected[selected.length - 1], sort)
          : undefined,
        hasBefore: end < rows.length,
        hasAfter: start > 0,
        sort: sort.sort.map(item => item.response)
      },
      rows: selected
    }
  }
}
