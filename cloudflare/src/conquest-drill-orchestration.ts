import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep
} from 'cloudflare:workers'

import {
  ConquestDrillRepository,
  normalizeConquestDrillOperationKey,
  type ConquestDrillOperationView
} from './conquest-drill'
import type { Env } from './env'

export const CONQUEST_DRILL_RECONCILE_INTERVAL_MS = 2 * 60 * 1_000

export interface ConquestReadinessDrillWorkflowParams {
  operationKey: string
}

export interface ConquestDrillDispatchResult {
  started: number
  existing: number
  restarted: number
  failed: number
}

export interface ConquestDrillWorkflowResponsibility {
  operationKey: string
  workflowInstanceId: string
  operationStatus: ConquestDrillOperationView['status']
  completedMatchCount: number
  acceptedAt: string
  completedAt?: string
}

interface ResponsibilityRow {
  operation_key: string
  workflow_instance_id: string
  operation_status: ConquestDrillOperationView['status']
  completed_match_count: number
  accepted_at: string
  completed_at: string | null
}

interface ConquestDrillWorkflowEnv {
  AUTH_DB: D1Database
  MATCH_SERVICE: Fetcher
  INTERNAL_AUTH_SECRET: string
}

export const conquestDrillWorkflowInstanceId = (operationKeyValue: string) =>
  `conquest-readiness-drill-${normalizeConquestDrillOperationKey(
    operationKeyValue
  )}`

const presentResponsibility = (
  row: ResponsibilityRow
): ConquestDrillWorkflowResponsibility => ({
  operationKey: row.operation_key,
  workflowInstanceId: row.workflow_instance_id,
  operationStatus: row.operation_status,
  completedMatchCount: row.completed_match_count,
  acceptedAt: row.accepted_at,
  ...(row.completed_at ? { completedAt: row.completed_at } : {})
})

export const conquestDrillWorkflowResponsibility = async (
  database: D1Database,
  operationKeyValue: string
): Promise<ConquestDrillWorkflowResponsibility> => {
  const operationKey = normalizeConquestDrillOperationKey(operationKeyValue)
  const row = await database
    .prepare(
      `SELECT operation.operation_key,
              orchestration.workflow_instance_id,
              operation.status AS operation_status,
              operation.completed_match_count,
              orchestration.accepted_at,
              orchestration.completed_at
       FROM staff_conquest_drill_operations operation
       JOIN staff_conquest_drill_orchestrations orchestration
         ON orchestration.operation_key = operation.operation_key
       WHERE operation.operation_key = ?`
    )
    .bind(operationKey)
    .first<ResponsibilityRow>()
  if (!row) throw new Error('Conquest drill Workflow responsibility is missing')
  if (
    row.workflow_instance_id !== conquestDrillWorkflowInstanceId(operationKey)
  ) {
    throw new Error('Conquest drill Workflow responsibility is invalid')
  }
  return presentResponsibility(row)
}

const incompleteConquestDrillResponsibilities = async (
  database: D1Database
): Promise<ConquestDrillWorkflowResponsibility[]> => {
  const rows = await database
    .prepare(
      `SELECT operation.operation_key,
              orchestration.workflow_instance_id,
              operation.status AS operation_status,
              operation.completed_match_count,
              orchestration.accepted_at,
              orchestration.completed_at
       FROM staff_conquest_drill_operations operation
       JOIN staff_conquest_drill_orchestrations orchestration
         ON orchestration.operation_key = operation.operation_key
       WHERE operation.status IN ('RUNNING', 'WAITING_DELIVERY')
         AND orchestration.completed_at IS NULL
       ORDER BY orchestration.accepted_at, operation.operation_key`
    )
    .all<ResponsibilityRow>()
  return rows.results.map(presentResponsibility)
}

const ensureConquestDrillWorkflow = async (
  workflow: Workflow<ConquestReadinessDrillWorkflowParams>,
  responsibility: ConquestDrillWorkflowResponsibility
): Promise<'started' | 'existing' | 'restarted'> => {
  try {
    await workflow.create({
      id: responsibility.workflowInstanceId,
      params: { operationKey: responsibility.operationKey }
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

const bestEffortConquestDrillFailureObservation = async (
  database: D1Database,
  operationKeyValue: string,
  workflowInstanceId: string,
  phase: 'WORKFLOW_DISPATCH' | 'WORKFLOW_VALIDATE' | 'WORKFLOW_PROGRESS',
  failureCode: string,
  at = new Date()
): Promise<void> => {
  try {
    const operationKey = normalizeConquestDrillOperationKey(operationKeyValue)
    await database
      .prepare(
        `INSERT INTO staff_conquest_drill_orchestration_failures
           (operation_key, workflow_instance_id, phase, failure_code,
            observed_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        operationKey,
        workflowInstanceId,
        phase,
        failureCode,
        at.toISOString()
      )
      .run()
  } catch (observationError) {
    console.error(
      'Conquest drill Workflow failure observation failed',
      observationError
    )
  }
}

export const scheduleConquestReadinessDrill = async (
  env: Pick<Env, 'AUTH_DB' | 'CONQUEST_READINESS_DRILL_WORKFLOW'>,
  actorUserId: string,
  value: { poolVersion?: unknown; reason?: unknown },
  operationKeyValue: string | null,
  at = new Date()
): Promise<ConquestDrillOperationView> => {
  if (!env.CONQUEST_READINESS_DRILL_WORKFLOW) {
    throw new Error('Conquest readiness drill Workflow binding is missing')
  }
  const operation = await new ConquestDrillRepository(env.AUTH_DB).start(
    actorUserId,
    value,
    operationKeyValue,
    at
  )
  if (
    operation.status !== 'RUNNING' &&
    operation.status !== 'WAITING_DELIVERY'
  ) {
    return operation
  }
  const responsibility = await conquestDrillWorkflowResponsibility(
    env.AUTH_DB,
    operation.operationKey
  )
  try {
    await ensureConquestDrillWorkflow(
      env.CONQUEST_READINESS_DRILL_WORKFLOW,
      responsibility
    )
  } catch {
    await bestEffortConquestDrillFailureObservation(
      env.AUTH_DB,
      operation.operationKey,
      responsibility.workflowInstanceId,
      'WORKFLOW_DISPATCH',
      'WORKFLOW_API_UNAVAILABLE',
      at
    )
  }
  return operation
}

export const dispatchPendingConquestReadinessDrills = async (
  env: Pick<Env, 'AUTH_DB' | 'CONQUEST_READINESS_DRILL_WORKFLOW'>
): Promise<ConquestDrillDispatchResult> => {
  if (!env.CONQUEST_READINESS_DRILL_WORKFLOW) {
    throw new Error('Conquest readiness drill Workflow binding is missing')
  }
  const result: ConquestDrillDispatchResult = {
    started: 0,
    existing: 0,
    restarted: 0,
    failed: 0
  }
  const responsibilities = await incompleteConquestDrillResponsibilities(
    env.AUTH_DB
  )
  for (const responsibility of responsibilities) {
    try {
      const status = await ensureConquestDrillWorkflow(
        env.CONQUEST_READINESS_DRILL_WORKFLOW,
        responsibility
      )
      result[status] += 1
    } catch {
      result.failed += 1
      await bestEffortConquestDrillFailureObservation(
        env.AUTH_DB,
        responsibility.operationKey,
        responsibility.workflowInstanceId,
        'WORKFLOW_DISPATCH',
        'WORKFLOW_API_UNAVAILABLE'
      )
    }
  }
  return result
}

const dispatchReadinessMatch =
  (
    env: Pick<
      ConquestDrillWorkflowEnv,
      'MATCH_SERVICE' | 'INTERNAL_AUTH_SECRET'
    >
  ) =>
  async (operationKey: string, matchNumber: number): Promise<void> => {
    const response = await env.MATCH_SERVICE.fetch(
      new Request(
        'https://cloud-weasel-match-service/internal/conquest-readiness/matches',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-cloud-weasel-internal-auth': env.INTERNAL_AUTH_SECRET
          },
          body: JSON.stringify({ operationKey, matchNumber })
        }
      )
    )
    if (!response.ok) {
      throw new Error(`readiness match service returned ${response.status}`)
    }
  }

export const runConquestReadinessDrillWorkflow = async (
  env: ConquestDrillWorkflowEnv,
  event: Readonly<WorkflowEvent<ConquestReadinessDrillWorkflowParams>>,
  step: WorkflowStep
): Promise<{
  operationKey: string
  status: 'COMPLETED' | 'FAILED'
}> => {
  const operationKey = normalizeConquestDrillOperationKey(
    event.payload.operationKey
  )
  let initial: ConquestDrillWorkflowResponsibility
  try {
    initial = await step.do('validate Conquest drill responsibility', () =>
      conquestDrillWorkflowResponsibility(env.AUTH_DB, operationKey)
    )
    if (initial.workflowInstanceId !== event.instanceId) {
      throw new Error('Conquest drill Workflow instance is not authoritative')
    }
  } catch (error) {
    await bestEffortConquestDrillFailureObservation(
      env.AUTH_DB,
      operationKey,
      event.instanceId,
      'WORKFLOW_VALIDATE',
      'WORKFLOW_RESPONSIBILITY_INVALID'
    )
    throw error
  }

  const repository = new ConquestDrillRepository(env.AUTH_DB)
  while (true) {
    let reconciliation:
      | { terminal: true; status: 'COMPLETED' | 'FAILED' }
      | { terminal: false; nextObservationAt: string }
    try {
      reconciliation = await step.do(
        'reconcile Conquest readiness drill',
        async () => {
          await repository.run(
            dispatchReadinessMatch(env),
            new Date(),
            operationKey
          )
          const operation = await repository.get(operationKey)
          if (
            operation.status === 'COMPLETED' ||
            operation.status === 'FAILED'
          ) {
            return { terminal: true as const, status: operation.status }
          }
          return {
            terminal: false as const,
            nextObservationAt: (
              await repository.nextObservationAt(
                operationKey,
                new Date(),
                CONQUEST_DRILL_RECONCILE_INTERVAL_MS
              )
            ).toISOString()
          }
        }
      )
    } catch (error) {
      await bestEffortConquestDrillFailureObservation(
        env.AUTH_DB,
        operationKey,
        initial.workflowInstanceId,
        'WORKFLOW_PROGRESS',
        'WORKFLOW_PROGRESS_ERROR'
      )
      throw error
    }

    if (reconciliation.terminal) {
      return { operationKey, status: reconciliation.status }
    }

    const boundary = new Date(reconciliation.nextObservationAt)
    if (boundary.getTime() > Date.now()) {
      await step.sleepUntil('wait for Conquest drill evidence', boundary)
    }
  }
}

export class ConquestReadinessDrillWorkflow extends WorkflowEntrypoint<
  Env,
  ConquestReadinessDrillWorkflowParams
> {
  async run(
    event: Readonly<WorkflowEvent<ConquestReadinessDrillWorkflowParams>>,
    step: WorkflowStep
  ) {
    return runConquestReadinessDrillWorkflow(
      {
        AUTH_DB: this.env.AUTH_DB,
        MATCH_SERVICE: this.env.MATCH_SERVICE,
        INTERNAL_AUTH_SECRET: this.env.INTERNAL_AUTH_SECRET
      },
      event,
      step
    )
  }
}
