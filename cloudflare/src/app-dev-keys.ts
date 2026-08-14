import type { AppDevKey, Page, SortBy } from '@opensky/proto'

import { invalidArgument, notFound } from './errors'
import { signAppDevSession } from './jwt'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 200

interface AppDevKeyRow {
  id: number
  app_key: string
  name: string
  email: string
  disabled: number
  created_by_game_account_id: number
  updated_by_game_account_id: number | null
  version: number
  created_at: string
  updated_at: string
}

const present = (row: AppDevKeyRow): AppDevKey => ({
  id: row.id,
  appKey: row.app_key,
  name: row.name,
  email: row.email,
  disabled: row.disabled === 1,
  createdBy: row.created_by_game_account_id,
  ...(row.updated_by_game_account_id
    ? { updatedBy: row.updated_by_game_account_id }
    : {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const auditSnapshot = (row: AppDevKeyRow) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  disabled: row.disabled === 1,
  createdBy: row.created_by_game_account_id,
  ...(row.updated_by_game_account_id
    ? { updatedBy: row.updated_by_game_account_id }
    : {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

type AppDevKeySortValue = string | number | null

interface AppDevKeySortConfig {
  sort: Array<{ response: SortBy; column: keyof AppDevKeyRow }>
  uniqueOrder: SortBy['order']
}

interface AppDevKeyCursor {
  id: number
  values: Array<string | null>
}

const SORT_COLUMNS: Record<string, keyof AppDevKeyRow | undefined> = {
  id: 'id',
  app_key: 'app_key',
  appKey: 'app_key',
  name: 'name',
  email: 'email',
  disabled: 'disabled',
  created_by: 'created_by_game_account_id',
  createdBy: 'created_by_game_account_id',
  updated_by: 'updated_by_game_account_id',
  updatedBy: 'updated_by_game_account_id',
  created_at: 'created_at',
  createdAt: 'created_at',
  updated_at: 'updated_at',
  updatedAt: 'updated_at'
}

const sortValue = (
  row: AppDevKeyRow,
  column: keyof AppDevKeyRow
): AppDevKeySortValue => row[column]

const compareSortValues = (
  left: AppDevKeySortValue,
  right: AppDevKeySortValue,
  order: SortBy['order']
): number => {
  if (left === null || right === null) {
    if (left === right) return 0
    // Match PostgreSQL's default ordering: NULLS LAST for ASC and FIRST for DESC.
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

const encodeCursor = (row: AppDevKeyRow, config: AppDevKeySortConfig) =>
  btoa(
    JSON.stringify([
      String(row.id),
      ...config.sort.map(item => {
        const value = sortValue(row, item.column)
        return value === null ? null : String(value)
      })
    ])
  )

const decodeCursor = (
  value: string,
  config: AppDevKeySortConfig
): AppDevKeyCursor => {
  try {
    const values = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(values) ||
      values.length !== config.sort.length + 1 ||
      values.some(item => item !== null && typeof item !== 'string') ||
      typeof values[0] !== 'string'
    ) {
      throw new Error('cursor shape')
    }
    const id = Number(values[0])
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('cursor ID')
    return { id, values: values.slice(1) as Array<string | null> }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const cursorValue = (
  value: string | null,
  column: keyof AppDevKeyRow
): AppDevKeySortValue => {
  if (value === null) return null
  if (
    [
      'id',
      'disabled',
      'created_by_game_account_id',
      'updated_by_game_account_id'
    ].includes(column)
  ) {
    const parsed = Number(value)
    if (!Number.isSafeInteger(parsed))
      throw invalidArgument('page cursor is invalid')
    return parsed
  }
  return value
}

const compareCursor = (
  row: AppDevKeyRow,
  cursor: AppDevKeyCursor,
  config: AppDevKeySortConfig
): number => {
  for (const [index, item] of config.sort.entries()) {
    const compared = compareSortValues(
      sortValue(row, item.column),
      cursorValue(cursor.values[index], item.column),
      item.response.order
    )
    if (compared) return compared
  }
  return compareSortValues(row.id, cursor.id, config.uniqueOrder)
}

const requestedPage = (page?: Page) => {
  if (page?.before && page.after) {
    throw invalidArgument('page cannot contain both before and after')
  }
  const size = Math.min(
    MAX_PAGE_SIZE,
    Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
      ? page!.pageSize!
      : DEFAULT_PAGE_SIZE
  )
  const requestedSort = page?.sort?.length
    ? page.sort
    : [{ column: 'name', order: 'ASC' as SortBy['order'] }]
  const sort: AppDevKeySortConfig['sort'] = []
  let uniqueOrder = 'ASC' as SortBy['order']
  for (const item of requestedSort) {
    const column = SORT_COLUMNS[item.column]
    if (!column || !['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('app developer key sort is invalid')
    }
    if (column === 'id') {
      uniqueOrder = item.order
    } else {
      sort.push({ response: item, column })
    }
  }
  if (sort.length === 1) uniqueOrder = sort[0].response.order
  return {
    size,
    sort,
    uniqueOrder
  }
}

const sortRows = (rows: AppDevKeyRow[], config: AppDevKeySortConfig) =>
  rows.sort((left, right) => {
    for (const item of config.sort) {
      const compared = compareSortValues(
        sortValue(left, item.column),
        sortValue(right, item.column),
        item.response.order
      )
      if (compared) return compared
    }
    return compareSortValues(left.id, right.id, config.uniqueOrder)
  })

const randomKey = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(14))
  return `SW01${[...bytes].map(value => value.toString(16).padStart(2, '0')).join('')}`
}

const isUniqueConflict = (error: unknown) =>
  error instanceof Error &&
  (error.message.includes('UNIQUE constraint failed') ||
    error.message.includes('app_dev_keys_enabled_'))

export class AppDevKeyRepository {
  constructor(private readonly database: D1Database) {}

  private async actorGameAccountId(userId: string): Promise<number> {
    const id = await this.database
      .prepare('SELECT id FROM game_accounts WHERE user_id = ?')
      .bind(userId)
      .first<number>('id')
    if (!id) throw new Error('staff game account is missing')
    return id
  }

  private async row(id: number): Promise<AppDevKeyRow> {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw invalidArgument('appDevKeyId is invalid')
    }
    const row = await this.database
      .prepare(
        `SELECT id, app_key, name, email, disabled,
                created_by_game_account_id, updated_by_game_account_id,
                version, created_at, updated_at
         FROM app_dev_keys WHERE id = ?`
      )
      .bind(id)
      .first<AppDevKeyRow>()
    if (!row) throw notFound('app developer key not found')
    return row
  }

  async create(
    actorUserId: string,
    req: { name?: unknown; email?: unknown } | undefined,
    at = new Date()
  ): Promise<AppDevKey> {
    if (!req) throw invalidArgument('req is required')
    if (typeof req.name !== 'string' || req.name.length < 1) {
      throw invalidArgument('name is empty')
    }
    if (typeof req.email !== 'string' || req.email.length < 1) {
      throw invalidArgument('email is empty')
    }
    if (req.name.length > 120) throw invalidArgument('name is too long')
    if (req.email.length > 320) throw invalidArgument('email is too long')

    const actorGameAccountId = await this.actorGameAccountId(actorUserId)
    const timestamp = at.toISOString()
    for (let attempt = 0; attempt < 4; attempt++) {
      const appKey = randomKey()
      const mutationId = crypto.randomUUID()
      try {
        await this.database.batch([
          this.database
            .prepare(
              `INSERT INTO app_dev_keys
                 (app_key, name, email, disabled, created_by_game_account_id,
                  version, mutation_id, created_at, updated_at)
               VALUES (?, ?, ?, 0, ?, 0, ?, ?, ?)`
            )
            .bind(
              appKey,
              req.name,
              req.email,
              actorGameAccountId,
              mutationId,
              timestamp,
              timestamp
            ),
          this.database
            .prepare(
              `INSERT INTO staff_app_dev_key_audit
                 (operation, app_dev_key_id, actor_user_id, before_json,
                  after_json, created_at)
               SELECT 'CREATE', id, ?, NULL,
                      json_object(
                        'id', id, 'name', name, 'email', email,
                        'disabled', json('false'),
                        'createdBy', created_by_game_account_id,
                        'createdAt', created_at, 'updatedAt', updated_at
                      ), ?
               FROM app_dev_keys WHERE mutation_id = ?`
            )
            .bind(actorUserId, timestamp, mutationId)
        ])
        const created = await this.database
          .prepare(
            `SELECT id, app_key, name, email, disabled,
                    created_by_game_account_id, updated_by_game_account_id,
                    version, created_at, updated_at
             FROM app_dev_keys WHERE mutation_id = ?`
          )
          .bind(mutationId)
          .first<AppDevKeyRow>()
        if (!created) throw new Error('created app developer key is missing')
        return present(created)
      } catch (error) {
        if (!isUniqueConflict(error)) throw error
        const duplicate = await this.database
          .prepare(
            `SELECT 1 FROM app_dev_keys
             WHERE disabled = 0 AND (name = ? OR email = ?) LIMIT 1`
          )
          .bind(req.name, req.email)
          .first()
        if (duplicate) {
          throw invalidArgument(
            'another app developer key with the same name or email already exists'
          )
        }
        // The statistically negligible remaining conflict is the random key;
        // retry without changing the source duplicate-name/email behavior.
      }
    }
    throw new Error('generate unique app developer key')
  }

  async list(page?: Page): Promise<{ page: Page; data: AppDevKey[] }> {
    const requested = requestedPage(page)
    const result = await this.database
      .prepare(
        `SELECT id, app_key, name, email, disabled,
                created_by_game_account_id, updated_by_game_account_id,
                version, created_at, updated_at
         FROM app_dev_keys`
      )
      .all<AppDevKeyRow>()
    const rows = sortRows(result.results, requested)
    let start = 0
    let end = Math.min(rows.length, requested.size)
    if (page?.before) {
      const cursor = decodeCursor(page.before, requested)
      const next = rows.findIndex(
        row => compareCursor(row, cursor, requested) > 0
      )
      start = next < 0 ? rows.length : next
      end = Math.min(rows.length, start + requested.size)
    } else if (page?.after) {
      const cursor = decodeCursor(page.after, requested)
      const previousEnd = rows.findIndex(
        row => compareCursor(row, cursor, requested) >= 0
      )
      end = previousEnd < 0 ? rows.length : previousEnd
      start = Math.max(0, end - requested.size)
    }
    const selected = rows.slice(start, end)
    return {
      page: {
        pageSize: requested.size,
        ...(selected.length
          ? {
              before: encodeCursor(selected[0], requested),
              after: encodeCursor(selected[selected.length - 1], requested)
            }
          : {}),
        hasBefore: end < rows.length,
        hasAfter: start > 0,
        sort: requested.sort.map(item => item.response)
      },
      data: selected.map(present)
    }
  }

  async setDisabled(
    actorUserId: string,
    id: number,
    disabled: boolean,
    at = new Date()
  ): Promise<boolean> {
    const actorGameAccountId = await this.actorGameAccountId(actorUserId)
    for (let attempt = 0; attempt < 4; attempt++) {
      const before = await this.row(id)
      const timestamp = at.toISOString()
      const mutationId = crypto.randomUUID()
      const after: AppDevKeyRow = {
        ...before,
        disabled: disabled ? 1 : 0,
        updated_by_game_account_id: actorGameAccountId,
        version: before.version + 1,
        updated_at: timestamp
      }
      try {
        const result = await this.database.batch([
          this.database
            .prepare(
              `UPDATE app_dev_keys
               SET disabled = ?, updated_by_game_account_id = ?,
                   version = version + 1, mutation_id = ?, updated_at = ?
               WHERE id = ? AND version = ?`
            )
            .bind(
              after.disabled,
              actorGameAccountId,
              mutationId,
              timestamp,
              id,
              before.version
            ),
          this.database
            .prepare(
              `INSERT INTO staff_app_dev_key_audit
                 (operation, app_dev_key_id, actor_user_id, before_json,
                  after_json, created_at)
               SELECT ?, id, ?, ?, ?, ? FROM app_dev_keys
               WHERE id = ? AND mutation_id = ?`
            )
            .bind(
              disabled ? 'DISABLE' : 'ENABLE',
              actorUserId,
              JSON.stringify(auditSnapshot(before)),
              JSON.stringify(auditSnapshot(after)),
              timestamp,
              id,
              mutationId
            )
        ])
        if ((result[0].meta.changes ?? 0) === 1) return true
      } catch (error) {
        if (!disabled && isUniqueConflict(error)) {
          throw invalidArgument(
            'another enabled key with the same name or email already exists'
          )
        }
        throw error
      }
    }
    throw new Error('update app developer key contention')
  }

  async token(
    actorUserId: string,
    id: number,
    signingKey: string,
    now = Math.floor(Date.now() / 1_000)
  ): Promise<{ appDevKey: AppDevKey; token: string }> {
    const row = await this.row(id)
    if (row.disabled === 1) throw invalidArgument('key is disabled')
    const appDevKey = present(row)
    const token = await signAppDevSession(appDevKey, signingKey, now)
    await this.database
      .prepare(
        `INSERT INTO staff_app_dev_key_audit
           (operation, app_dev_key_id, actor_user_id, before_json,
            after_json, created_at)
         VALUES ('TOKEN_REVEAL', ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        actorUserId,
        JSON.stringify(auditSnapshot(row)),
        JSON.stringify(auditSnapshot(row)),
        new Date(now * 1_000).toISOString()
      )
      .run()
    return { appDevKey, token }
  }
}
