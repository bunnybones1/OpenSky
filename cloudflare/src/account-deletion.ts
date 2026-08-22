import { ClientFeedbackRepository } from './client-feedback'
import { invalidArgument, notFound, permissionDenied } from './errors'
import { providerSubjectHash } from './identities'

const DELETION_DELAY_MS = (30 * 24 - 1) * 60 * 60 * 1_000

interface AccountDeletionRow {
  user_id: string
  status: 'PENDING' | 'COMPLETED'
  requested_at: string
  execute_at: string
  completed_at: string | null
  workflow_instance_id: string
  r2_cleanup_verified_at: string | null
  orchestration_completed_at: string | null
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
  workflowInstanceId: string
  completedAt?: string
}

export interface AccountDeletionResponsibility
  extends AccountDeletionRequest {
  userId: string
  accountStatus: string
  r2CleanupVerifiedAt?: string
  orchestrationCompletedAt?: string
}

export interface AccountDeletionCompletion {
  status: 'completed' | 'already_completed'
  completedAt: string
}

const deletionRequest = (row: AccountDeletionRow): AccountDeletionRequest => ({
  status: row.status,
  requestedAt: row.requested_at,
  executeAt: row.execute_at,
  workflowInstanceId: row.workflow_instance_id,
  ...(row.completed_at ? { completedAt: row.completed_at } : {})
})

const validUserId = (userId: string): boolean =>
  userId === userId.trim() && userId.length > 0 && userId.length <= 256

const accountDeletionRow = (database: D1Database, userId: string) =>
  database
    .prepare(
      `SELECT request.user_id, request.status, request.requested_at,
              request.execute_at, request.completed_at,
              orchestration.workflow_instance_id,
              orchestration.r2_cleanup_verified_at,
              orchestration.completed_at AS orchestration_completed_at
       FROM account_deletion_requests request
       JOIN account_deletion_orchestrations orchestration
         ON orchestration.user_id = request.user_id
       WHERE request.user_id = ?`
    )
    .bind(userId)
    .first<AccountDeletionRow>()

export const accountDeletionResponsibility = async (
  database: D1Database,
  userId: string
): Promise<AccountDeletionResponsibility> => {
  if (!validUserId(userId)) {
    throw new Error('account deletion user identifier is invalid')
  }
  const row = await database
    .prepare(
      `SELECT request.user_id, request.status, request.requested_at,
              request.execute_at, request.completed_at,
              orchestration.workflow_instance_id,
              orchestration.r2_cleanup_verified_at,
              orchestration.completed_at AS orchestration_completed_at,
              settings.account_status
       FROM account_deletion_requests request
       JOIN account_deletion_orchestrations orchestration
         ON orchestration.user_id = request.user_id
       JOIN player_account_settings settings
         ON settings.user_id = request.user_id
       WHERE request.user_id = ?`
    )
    .bind(userId)
    .first<AccountDeletionRow & { account_status: string }>()
  if (!row) throw new Error('account deletion Workflow responsibility is missing')
  if (row.workflow_instance_id !== `account-deletion-${userId}`) {
    throw new Error('account deletion Workflow responsibility is invalid')
  }
  if (
    (row.status === 'COMPLETED') !==
      Boolean(row.completed_at && row.orchestration_completed_at) ||
    (row.status === 'PENDING' && row.orchestration_completed_at !== null)
  ) {
    throw new Error('account deletion completion receipts disagree')
  }
  return {
    userId: row.user_id,
    accountStatus: row.account_status,
    ...deletionRequest(row),
    ...(row.r2_cleanup_verified_at
      ? { r2CleanupVerifiedAt: row.r2_cleanup_verified_at }
      : {}),
    ...(row.orchestration_completed_at
      ? { orchestrationCompletedAt: row.orchestration_completed_at }
      : {})
  }
}

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

    const existing = await accountDeletionRow(this.database, userId)
    if (existing) return deletionRequest(existing)

    const orphanedRequest = await this.database
      .prepare(
        `SELECT 1 FROM account_deletion_requests WHERE user_id = ?`
      )
      .bind(userId)
      .first()
    if (orphanedRequest) {
      throw new Error('account deletion orchestration receipt is missing')
    }

    const requestedAt = now.toISOString()
    const executeAt = new Date(now.getTime() + DELETION_DELAY_MS).toISOString()
    try {
      await this.database.batch([
        this.database
          .prepare(
            `UPDATE player_account_settings
             SET account_status = 'TO_DELETE', leaderboard_eligible = 0,
                 updated_at = ?
             WHERE user_id = ?
               AND account_status NOT IN ('TO_DELETE', 'DELETED')`
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
      const concurrentlyCreated = await accountDeletionRow(this.database, userId)
      if (concurrentlyCreated) return deletionRequest(concurrentlyCreated)
      throw error
    }

    const accepted = await accountDeletionRow(this.database, userId)
    if (
      !accepted ||
      accepted.status !== 'PENDING' ||
      accepted.requested_at !== requestedAt ||
      accepted.execute_at !== executeAt ||
      accepted.workflow_instance_id !== `account-deletion-${userId}` ||
      accepted.r2_cleanup_verified_at !== null ||
      accepted.orchestration_completed_at !== null
    ) {
      throw new Error('account deletion acceptance was not atomic')
    }
    return deletionRequest(accepted)
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
}

export const deleteAccountPrivateFeedback = async (
  database: D1Database,
  feedbackBucket: R2Bucket,
  userId: string
): Promise<number> =>
  new ClientFeedbackRepository(database, feedbackBucket).deleteForUser(userId)

export const recordAccountDeletionFailure = async (
  database: D1Database,
  userId: string,
  workflowInstanceId: string,
  phase: 'WORKFLOW_DISPATCH' | 'R2_DELETE' | 'D1_FINALIZE',
  error: unknown,
  now = new Date()
): Promise<void> => {
  const errorCode =
    error instanceof Error && error.name
      ? error.name.slice(0, 128)
      : 'UnknownError'
  await database
    .prepare(
      `INSERT INTO account_deletion_orchestration_failures
         (user_id, workflow_instance_id, phase, error_code, observed_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(userId, workflowInstanceId, phase, errorCode, now.toISOString())
    .run()
}

export const finalizeAcceptedAccountDeletion = async (
  database: D1Database,
  userId: string,
  workflowInstanceId: string,
  r2CleanupVerifiedAt: string,
  r2ObjectsDeletedInVerifiedAttempt: number,
  now = new Date()
): Promise<AccountDeletionCompletion> => {
  const responsibility = await accountDeletionResponsibility(database, userId)
  if (responsibility.workflowInstanceId !== workflowInstanceId) {
    throw new Error('account deletion Workflow instance does not own request')
  }
  if (
    responsibility.status === 'COMPLETED' &&
    responsibility.completedAt &&
    responsibility.orchestrationCompletedAt
  ) {
    return {
      status: 'already_completed',
      completedAt: responsibility.completedAt
    }
  }
  if (responsibility.accountStatus !== 'TO_DELETE') {
    throw new Error('account is not flagged for deletion')
  }
  if (Date.parse(responsibility.executeAt) > now.getTime()) {
    throw new Error('account deletion deadline has not elapsed')
  }
  if (
    !Number.isSafeInteger(r2ObjectsDeletedInVerifiedAttempt) ||
    r2ObjectsDeletedInVerifiedAttempt < 0 ||
    !Number.isFinite(Date.parse(r2CleanupVerifiedAt)) ||
    Date.parse(r2CleanupVerifiedAt) > now.getTime()
  ) {
    throw new Error('account deletion R2 cleanup evidence is invalid')
  }

  const completedAt = now.toISOString()
  const identities = await database
    .prepare(
      `SELECT provider, provider_subject FROM auth_identities
       WHERE user_id = ? ORDER BY provider`
    )
    .bind(userId)
    .all<ProviderIdentityRow>()
  const deletedName = `Deleted-${crypto.randomUUID()}`
  const deletedEmail = `deleted-${crypto.randomUUID()}@users.invalid`
  const statements: D1PreparedStatement[] = []
  for (const identity of identities.results) {
    statements.push(
      database
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
          userId,
          completedAt
        )
    )
  }
  statements.push(
    database
      .prepare(`DELETE FROM wallet_link_challenges WHERE user_id = ?`)
      .bind(userId),
    database
      .prepare(`DELETE FROM wallet_connections WHERE user_id = ?`)
      .bind(userId),
    database
      .prepare(`DELETE FROM auth_identities WHERE user_id = ?`)
      .bind(userId),
    database
      .prepare(`DELETE FROM user_storage WHERE owner = ?`)
      .bind(`identity:${userId}`),
    database
      .prepare(`DELETE FROM client_feedback_rate_limits WHERE user_id = ?`)
      .bind(userId),
    database
      .prepare(
        `UPDATE users
         SET display_name = ?, primary_email = ?, avatar_url = NULL,
             updated_at = ?
         WHERE id = ?
           AND EXISTS (
             SELECT 1 FROM account_deletion_requests request
             WHERE request.user_id = users.id AND request.status = 'PENDING'
           )`
      )
      .bind(deletedName, deletedEmail, completedAt, userId),
    database
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
      .bind(deletedName, completedAt, userId),
    database
      .prepare(
        `UPDATE account_deletion_orchestrations
         SET r2_cleanup_verified_at = ?,
             r2_objects_deleted_in_verified_attempt = ?
         WHERE user_id = ? AND workflow_instance_id = ?
           AND r2_cleanup_verified_at IS NULL AND completed_at IS NULL`
      )
      .bind(
        r2CleanupVerifiedAt,
        r2ObjectsDeletedInVerifiedAttempt,
        userId,
        workflowInstanceId
      ),
    database
      .prepare(
        `UPDATE account_deletion_requests
         SET status = 'COMPLETED', completed_at = ?
         WHERE user_id = ? AND status = 'PENDING'`
      )
      .bind(completedAt, userId),
    database
      .prepare(
        `UPDATE account_deletion_orchestrations
         SET completed_at = ?
         WHERE user_id = ? AND workflow_instance_id = ?
           AND r2_cleanup_verified_at = ? AND completed_at IS NULL`
      )
      .bind(completedAt, userId, workflowInstanceId, r2CleanupVerifiedAt)
  )
  const results = await database.batch(statements)
  const requestCompletion = results.at(-2)?.meta.changes ?? 0
  const orchestrationCompletion = results.at(-1)?.meta.changes ?? 0
  if (requestCompletion !== 1 || orchestrationCompletion !== 1) {
    throw new Error('account deletion completion was not atomic')
  }
  return { status: 'completed', completedAt }
}
