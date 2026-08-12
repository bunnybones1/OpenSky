import type { AppDevKey, Page, SortBy } from '@opensky/proto'

import { invalidArgument, notFound } from './errors'
import { signAppDevSession } from './jwt'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

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
  const sort = page?.sort?.length
    ? page.sort
    : [{ column: 'name', order: 'ASC' as SortBy['order'] }]
  if (
    sort.length !== 1 ||
    !['id', 'name', 'email', 'disabled', 'created_at', 'createdAt'].includes(
      sort[0].column
    ) ||
    !['ASC', 'DESC'].includes(sort[0].order)
  ) {
    throw invalidArgument('app developer key sort is invalid')
  }
  const columns: Record<string, string> = {
    id: 'id',
    name: 'name',
    email: 'email',
    disabled: 'disabled',
    created_at: 'created_at',
    createdAt: 'created_at'
  }
  return {
    size,
    offset: cursorOffset(page?.before ?? page?.after),
    sort,
    column: columns[sort[0].column],
    direction: sort[0].order
  }
}

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
    const rows = await this.database
      .prepare(
        `SELECT id, app_key, name, email, disabled,
                created_by_game_account_id, updated_by_game_account_id,
                version, created_at, updated_at
         FROM app_dev_keys
         ORDER BY ${requested.column} ${requested.direction}, id ${requested.direction}
         LIMIT ? OFFSET ?`
      )
      .bind(requested.size + 1, requested.offset)
      .all<AppDevKeyRow>()
    const data = rows.results.slice(0, requested.size).map(present)
    const nextOffset = requested.offset + data.length
    return {
      page: {
        pageSize: requested.size,
        ...(data.length
          ? {
              before: encodeCursor(requested.offset),
              after: encodeCursor(nextOffset)
            }
          : {}),
        hasBefore: rows.results.length > requested.size,
        hasAfter: requested.offset > 0,
        sort: requested.sort
      },
      data
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
