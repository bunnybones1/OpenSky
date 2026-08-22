import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep
} from 'cloudflare:workers'

import {
  AccountDeletionRepository,
  accountDeletionResponsibility,
  deleteAccountPrivateFeedback,
  finalizeAcceptedAccountDeletion,
  recordAccountDeletionFailure,
  type AccountDeletionRequest,
  type AccountDeletionResponsibility
} from './account-deletion'
import type { Env } from './env'

export interface AccountDeletionWorkflowParams {
  userId: string
}

export interface AccountDeletionDispatchResult {
  started: number
  existing: number
  restarted: number
  failed: number
}

export interface ScheduledAccountDeletion extends AccountDeletionRequest {
  dispatchStatus: 'started' | 'existing' | 'restarted' | 'pending_recovery'
}

interface AccountDeletionWorkflowEnv {
  AUTH_DB: D1Database
  CLIENT_FEEDBACK: R2Bucket
}

const incompleteAccountDeletions = async (
  database: D1Database
): Promise<AccountDeletionResponsibility[]> => {
  const rows = await database
    .prepare(
      `SELECT request.user_id
       FROM account_deletion_requests request
       JOIN account_deletion_orchestrations orchestration
         ON orchestration.user_id = request.user_id
       WHERE request.status = 'PENDING'
         AND orchestration.completed_at IS NULL
       ORDER BY request.execute_at, request.user_id`
    )
    .all<{ user_id: string }>()
  const responsibilities: AccountDeletionResponsibility[] = []
  for (const row of rows.results) {
    responsibilities.push(
      await accountDeletionResponsibility(database, row.user_id)
    )
  }
  return responsibilities
}

const ensureAccountDeletionWorkflow = async (
  workflow: Workflow<AccountDeletionWorkflowParams>,
  responsibility: AccountDeletionResponsibility
): Promise<'started' | 'existing' | 'restarted'> => {
  try {
    await workflow.create({
      id: responsibility.workflowInstanceId,
      params: { userId: responsibility.userId }
    })
    return 'started'
  } catch (creationError) {
    let instance: WorkflowInstance
    let current: Awaited<ReturnType<WorkflowInstance['status']>>
    try {
      instance = await workflow.get(responsibility.workflowInstanceId)
      current = await instance.status()
    } catch {
      throw creationError
    }
    if (current.status === 'unknown') throw creationError
    if (
      current.status === 'errored' ||
      current.status === 'terminated' ||
      current.status === 'complete'
    ) {
      await instance.restart()
      return 'restarted'
    }
    return 'existing'
  }
}

const bestEffortFailureObservation = async (
  database: D1Database,
  userId: string,
  workflowInstanceId: string,
  phase: 'WORKFLOW_DISPATCH' | 'R2_DELETE' | 'D1_FINALIZE',
  error: unknown
): Promise<void> => {
  try {
    await recordAccountDeletionFailure(
      database,
      userId,
      workflowInstanceId,
      phase,
      error
    )
  } catch (observationError) {
    console.error('Account deletion failure observation failed', observationError)
  }
}

export const scheduleAccountDeletion = async (
  env: Pick<
    Env,
    'AUTH_DB' | 'CLIENT_FEEDBACK' | 'ACCOUNT_DELETION_WORKFLOW'
  >,
  userId: string,
  now = new Date()
): Promise<ScheduledAccountDeletion> => {
  // Do not accept a durable privacy responsibility that this deployment cannot
  // drive across both authoritative stores.
  if (!env.CLIENT_FEEDBACK) {
    throw new Error('account deletion R2 binding is missing')
  }
  if (!env.ACCOUNT_DELETION_WORKFLOW) {
    throw new Error('account deletion Workflow binding is missing')
  }
  const request = await new AccountDeletionRepository(env.AUTH_DB).request(
    userId,
    now
  )
  if (request.status === 'COMPLETED') {
    return { ...request, dispatchStatus: 'existing' }
  }
  const responsibility = await accountDeletionResponsibility(
    env.AUTH_DB,
    userId
  )
  try {
    const dispatchStatus = await ensureAccountDeletionWorkflow(
      env.ACCOUNT_DELETION_WORKFLOW,
      responsibility
    )
    return { ...request, dispatchStatus }
  } catch (error) {
    await bestEffortFailureObservation(
      env.AUTH_DB,
      userId,
      responsibility.workflowInstanceId,
      'WORKFLOW_DISPATCH',
      error
    )
    // The D1 responsibility is the durable acceptance. Scheduled discovery
    // will re-ensure this exact instance, so a transient create response must
    // not tell the player that an already-accepted deletion was rejected.
    return { ...request, dispatchStatus: 'pending_recovery' }
  }
}

export const dispatchPendingAccountDeletions = async (
  env: Pick<
    Env,
    'AUTH_DB' | 'CLIENT_FEEDBACK' | 'ACCOUNT_DELETION_WORKFLOW'
  >
): Promise<AccountDeletionDispatchResult> => {
  if (!env.CLIENT_FEEDBACK) {
    throw new Error('account deletion R2 binding is missing')
  }
  if (!env.ACCOUNT_DELETION_WORKFLOW) {
    throw new Error('account deletion Workflow binding is missing')
  }
  const result: AccountDeletionDispatchResult = {
    started: 0,
    existing: 0,
    restarted: 0,
    failed: 0
  }
  const responsibilities = await incompleteAccountDeletions(env.AUTH_DB)
  for (const responsibility of responsibilities) {
    try {
      const status = await ensureAccountDeletionWorkflow(
        env.ACCOUNT_DELETION_WORKFLOW,
        responsibility
      )
      result[status] += 1
    } catch (error) {
      result.failed += 1
      await bestEffortFailureObservation(
        env.AUTH_DB,
        responsibility.userId,
        responsibility.workflowInstanceId,
        'WORKFLOW_DISPATCH',
        error
      )
    }
  }
  return result
}

export const runAccountDeletionWorkflow = async (
  env: AccountDeletionWorkflowEnv,
  event: Readonly<WorkflowEvent<AccountDeletionWorkflowParams>>,
  step: WorkflowStep
): Promise<{ status: 'completed' | 'already_completed' }> => {
  const initial = await step.do('validate account deletion responsibility', () =>
    accountDeletionResponsibility(env.AUTH_DB, event.payload.userId)
  )
  if (initial.workflowInstanceId !== event.instanceId) {
    throw new Error('account deletion Workflow instance is not authoritative')
  }
  if (initial.status === 'COMPLETED') {
    return { status: 'already_completed' }
  }
  const executeAt = new Date(initial.executeAt)
  if (executeAt.getTime() > Date.now()) {
    await step.sleepUntil('wait for account deletion deadline', executeAt)
  }

  await step.do('validate due account deletion', async () => {
    const due = await accountDeletionResponsibility(
      env.AUTH_DB,
      event.payload.userId
    )
    if (due.workflowInstanceId !== event.instanceId) {
      throw new Error('account deletion Workflow instance is not authoritative')
    }
    if (due.status === 'COMPLETED') return due
    if (due.accountStatus !== 'TO_DELETE') {
      throw new Error('account is not flagged for deletion')
    }
    if (Date.parse(due.executeAt) > Date.now()) {
      throw new Error('account deletion deadline has not elapsed')
    }
    return due
  })

  const cleanup = await step.do('delete private account feedback', async () => {
    try {
      const objectsDeleted = await deleteAccountPrivateFeedback(
        env.AUTH_DB,
        env.CLIENT_FEEDBACK,
        event.payload.userId
      )
      return {
        objectsDeleted,
        verifiedAt: new Date().toISOString()
      }
    } catch (error) {
      await bestEffortFailureObservation(
        env.AUTH_DB,
        event.payload.userId,
        event.instanceId,
        'R2_DELETE',
        error
      )
      throw error
    }
  })

  try {
    return await step.do('complete account deletion in D1', () =>
      finalizeAcceptedAccountDeletion(
        env.AUTH_DB,
        event.payload.userId,
        event.instanceId,
        cleanup.verifiedAt,
        cleanup.objectsDeleted,
        new Date()
      )
    )
  } catch (error) {
    await bestEffortFailureObservation(
      env.AUTH_DB,
      event.payload.userId,
      event.instanceId,
      'D1_FINALIZE',
      error
    )
    throw error
  }
}

export class AccountDeletionWorkflow extends WorkflowEntrypoint<
  Env,
  AccountDeletionWorkflowParams
> {
  async run(
    event: Readonly<WorkflowEvent<AccountDeletionWorkflowParams>>,
    step: WorkflowStep
  ) {
    if (!this.env.CLIENT_FEEDBACK) {
      throw new Error('account deletion R2 binding is missing')
    }
    return runAccountDeletionWorkflow(
      {
        AUTH_DB: this.env.AUTH_DB,
        CLIENT_FEEDBACK: this.env.CLIENT_FEEDBACK
      },
      event,
      step
    )
  }
}
