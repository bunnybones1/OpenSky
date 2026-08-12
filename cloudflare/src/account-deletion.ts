import { invalidArgument, notFound, permissionDenied } from './errors'
import { providerSubjectHash } from './identities'

const DELETION_DELAY_MS = (30 * 24 - 1) * 60 * 60 * 1_000
const FINALIZATION_BATCH_SIZE = 50

interface AccountDeletionRow {
  user_id: string
  status: 'PENDING' | 'COMPLETED'
  requested_at: string
  execute_at: string
  completed_at: string | null
}

interface AccountDeletionTarget {
  user_id: string
  name: string
  account_status: string
}

interface ProviderIdentityRow {
  provider: string
  provider_subject: string
}

export interface AccountDeletionRequest {
  status: 'PENDING' | 'COMPLETED'
  requestedAt: string
  executeAt: string
  completedAt?: string
}

export interface AccountDeletionRun {
  completed: number
}

const deletionRequest = (row: AccountDeletionRow): AccountDeletionRequest => ({
  status: row.status,
  requestedAt: row.requested_at,
  executeAt: row.execute_at,
  ...(row.completed_at ? { completedAt: row.completed_at } : {})
})

export class AccountDeletionRepository {
  constructor(private readonly database: D1Database) {}

  async target(userId: string): Promise<AccountDeletionTarget> {
    const row = await this.database
      .prepare(
        `SELECT user_id, name, account_status
         FROM player_account_settings WHERE user_id = ?`
      )
      .bind(userId)
      .first<AccountDeletionTarget>()
    if (!row) throw notFound('account not found')
    return row
  }

  async request(
    userId: string,
    now = new Date()
  ): Promise<AccountDeletionRequest> {
    const target = await this.target(userId)
    if (target.account_status === 'DELETED') {
      throw permissionDenied('account deleted')
    }

    const existing = await this.database
      .prepare(
        `SELECT user_id, status, requested_at, execute_at, completed_at
         FROM account_deletion_requests WHERE user_id = ?`
      )
      .bind(userId)
      .first<AccountDeletionRow>()
    if (existing) return deletionRequest(existing)

    const requestedAt = now.toISOString()
    const executeAt = new Date(now.getTime() + DELETION_DELAY_MS).toISOString()
    try {
      await this.database.batch([
        this.database
          .prepare(
            `UPDATE player_account_settings
             SET account_status = 'TO_DELETE', leaderboard_eligible = 0,
                 updated_at = ?
             WHERE user_id = ? AND account_status NOT IN ('TO_DELETE', 'DELETED')`
          )
          .bind(requestedAt, userId),
        this.database
          .prepare(
            `INSERT INTO account_deletion_requests
               (user_id, status, reauthenticated_provider, requested_at,
                execute_at, completed_at)
             VALUES (?, 'PENDING', 'google', ?, ?, NULL)`
          )
          .bind(userId, requestedAt, executeAt)
      ])
    } catch (error) {
      const concurrentlyCreated = await this.database
        .prepare(
          `SELECT user_id, status, requested_at, execute_at, completed_at
           FROM account_deletion_requests WHERE user_id = ?`
        )
        .bind(userId)
        .first<AccountDeletionRow>()
      if (concurrentlyCreated) return deletionRequest(concurrentlyCreated)
      throw error
    }

    return { status: 'PENDING', requestedAt, executeAt }
  }

  async confirmAccountName(
    userId: string,
    expectedName: string
  ): Promise<void> {
    const target = await this.target(userId)
    if (!expectedName || expectedName !== target.name) {
      throw invalidArgument('account name does not match')
    }
    if (target.account_status === 'TO_DELETE') {
      throw permissionDenied('account flagged for deletion')
    }
    if (target.account_status === 'DELETED') {
      throw permissionDenied('account deleted')
    }
  }

  async finalizeDue(now = new Date()): Promise<AccountDeletionRun> {
    const completedAt = now.toISOString()
    const due = await this.database
      .prepare(
        `SELECT user_id, status, requested_at, execute_at, completed_at
         FROM account_deletion_requests
         WHERE status = 'PENDING' AND execute_at <= ?
         ORDER BY execute_at, user_id LIMIT ?`
      )
      .bind(completedAt, FINALIZATION_BATCH_SIZE)
      .all<AccountDeletionRow>()

    let completed = 0
    for (const row of due.results) {
      const identities = await this.database
        .prepare(
          `SELECT provider, provider_subject FROM auth_identities
           WHERE user_id = ? ORDER BY provider`
        )
        .bind(row.user_id)
        .all<ProviderIdentityRow>()
      const deletedName = `Deleted-${crypto.randomUUID()}`
      const deletedEmail = `deleted-${crypto.randomUUID()}@users.invalid`
      const statements: D1PreparedStatement[] = []
      for (const identity of identities.results) {
        statements.push(
          this.database
            .prepare(
              `INSERT OR IGNORE INTO identity_provider_tombstones
                 (provider, provider_subject_hash, deleted_user_id, deleted_at)
               VALUES (?, ?, ?, ?)`
            )
            .bind(
              identity.provider,
              await providerSubjectHash(
                identity.provider,
                identity.provider_subject
              ),
              row.user_id,
              completedAt
            )
        )
      }
      statements.push(
        this.database
          .prepare(`DELETE FROM wallet_link_challenges WHERE user_id = ?`)
          .bind(row.user_id),
        this.database
          .prepare(`DELETE FROM wallet_connections WHERE user_id = ?`)
          .bind(row.user_id),
        this.database
          .prepare(`DELETE FROM auth_identities WHERE user_id = ?`)
          .bind(row.user_id),
        this.database
          .prepare(`DELETE FROM user_storage WHERE owner = ?`)
          .bind(`identity:${row.user_id}`),
        this.database
          .prepare(
            `UPDATE users
             SET display_name = ?, primary_email = ?, avatar_url = NULL,
                 updated_at = ?
             WHERE id = ?
               AND EXISTS (
                 SELECT 1 FROM account_deletion_requests request
                 WHERE request.user_id = users.id
                   AND request.status = 'PENDING'
               )`
          )
          .bind(deletedName, deletedEmail, completedAt, row.user_id),
        this.database
          .prepare(
            `UPDATE player_account_settings
             SET name = ?, locale = 'en', region = NULL, tag_art_id = NULL,
                 title_id = NULL, hide_player_names = 0,
                 request_more_invites = 0, twitch_profile = NULL,
                 rename_locked_until = NULL, spectate_code = NULL,
                 spectate_code_expires_at = NULL, account_status = 'DELETED',
                 leaderboard_eligible = 0, updated_at = ?
             WHERE user_id = ? AND account_status = 'TO_DELETE'`
          )
          .bind(deletedName, completedAt, row.user_id),
        this.database
          .prepare(
            `UPDATE account_deletion_requests
             SET status = 'COMPLETED', completed_at = ?
             WHERE user_id = ? AND status = 'PENDING'`
          )
          .bind(completedAt, row.user_id)
      )
      const results = await this.database.batch(statements)
      if ((results.at(-1)?.meta.changes ?? 0) === 1) completed += 1
    }
    return { completed }
  }
}
