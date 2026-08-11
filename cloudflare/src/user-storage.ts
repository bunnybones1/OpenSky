export interface UserStorageEntry {
  key: string
  object: unknown
}

interface UserStorageRow {
  key: string
  object_json: string
}

export class UserStorageRepository {
  constructor(private readonly database: D1Database) {}

  async fetch(owner: string, key: string): Promise<unknown> {
    const row = await this.database
      .prepare(
        `SELECT object_json FROM user_storage WHERE owner = ? AND key = ?`
      )
      .bind(owner, key)
      .first<Pick<UserStorageRow, 'object_json'>>()
    return row ? JSON.parse(row.object_json) : null
  }

  async fetchAll(owner: string, keys: string[]): Promise<UserStorageEntry[]> {
    const query = keys.length
      ? `SELECT key, object_json FROM user_storage
         WHERE owner = ? AND key IN (${keys.map(() => '?').join(', ')})
         ORDER BY key`
      : `SELECT key, object_json FROM user_storage
         WHERE owner = ? ORDER BY key`
    const rows = await this.database
      .prepare(query)
      .bind(owner, ...keys)
      .all<UserStorageRow>()
    return rows.results.map(row => ({
      key: row.key,
      object: JSON.parse(row.object_json)
    }))
  }

  async save(owner: string, key: string, objectJson: string): Promise<void> {
    const now = new Date().toISOString()
    await this.database
      .prepare(
        `INSERT INTO user_storage
           (owner, key, object_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(owner, key) DO UPDATE SET
           object_json = excluded.object_json,
           updated_at = excluded.updated_at`
      )
      .bind(owner, key, objectJson, now, now)
      .run()
  }

  async delete(owner: string, key: string): Promise<void> {
    await this.database
      .prepare(`DELETE FROM user_storage WHERE owner = ? AND key = ?`)
      .bind(owner, key)
      .run()
  }
}
