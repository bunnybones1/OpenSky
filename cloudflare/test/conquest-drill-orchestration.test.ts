import { env, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ConquestDrillRepository,
  conquestDrillProposalId
} from '../src/conquest-drill'
import {
  conquestDrillWorkflowInstanceId,
  dispatchPendingConquestReadinessDrills,
  runConquestReadinessDrillWorkflow,
  scheduleConquestReadinessDrill
} from '../src/conquest-drill-orchestration'
import { PlayerRepository } from '../src/player'
import { approvedConquestPoolStatements } from './helpers/conquest-pool'

let sequence = 0

const provisionActor = async (now: Date) => {
  sequence += 1
  const actor = `conquest-drill-workflow-actor-${sequence}`
  const timestamp = now.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(actor, actor, `${actor}@example.com`, timestamp, timestamp)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(actor)
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO staff_roles
         (user_id, role, granted_by_user_id, reason, created_at)
       VALUES (?, 'ADMIN', NULL, 'Workflow drill test', ?)`
    ).bind(actor, timestamp),
    env.AUTH_DB.prepare(
      `INSERT INTO staff_conquest_drill_permissions
         (user_id, permission, granted_by_user_id, reason, created_at)
       VALUES (?, 'RUN', NULL, 'Workflow drill test', ?)`
    ).bind(actor, timestamp)
  ])
  return actor
}

const approvedPool = async (now: Date) => {
  const version = `conquest-drill-workflow-pool-${++sequence}`
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE status = 'ACTIVE'`
    ),
    env.AUTH_DB.prepare(
      `UPDATE game_mode_status SET enabled = 0, updated_at = ?
       WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')`
    ).bind(now.toISOString())
  ])
  await env.AUTH_DB.batch(
    approvedConquestPoolStatements(env.AUTH_DB, {
      version,
      createdAt: new Date(now.getTime() - 60 * 60 * 1_000).toISOString(),
      startsAt: new Date(now.getTime() - 30 * 60 * 1_000).toISOString(),
      endsAt: new Date(now.getTime() + 48 * 60 * 60 * 1_000).toISOString(),
      silver: [6],
      gold: [136]
    })
  )
  return version
}

const workflowEvent = (
  operationKey: string,
  now: Date,
  instanceId = conquestDrillWorkflowInstanceId(operationKey)
): WorkflowEvent<{ operationKey: string }> => ({
  instanceId,
  workflowName: 'cloud-weasel-conquest-readiness-drill',
  payload: { operationKey },
  timestamp: now
})

const immediateStep = (): WorkflowStep =>
  ({
    do: vi.fn(
      async (
        _name: string,
        configOrCallback: unknown,
        configuredCallback?: () => unknown
      ) => {
        const callback =
          typeof configOrCallback === 'function'
            ? configOrCallback
            : configuredCallback
        if (!callback) throw new Error('missing Workflow step callback')
        return callback()
      }
    ),
    sleepUntil: vi.fn(async () => undefined),
    sleep: vi.fn(async () => undefined)
  }) as unknown as WorkflowStep

const insertActiveMatch = async (
  operation: Awaited<ReturnType<ConquestDrillRepository['start']>>,
  updatedAt: Date
) => {
  const timestamp = updatedAt.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_matches
       (proposal_id, replay_id, mode, version,
        player1_principal, player2_principal, player1_user_id,
        player2_user_id, match_payload_json, status, created_at, updated_at,
        player1_mode, player2_mode)
     VALUES (?, ?, 'CONQUEST_CONSTRUCTED', 'readiness-workflow-test',
             '0x1111111111111111111111111111111111111111',
             '0x2222222222222222222222222222222222222222', ?, ?, '{}',
             'active', ?, ?, 'CONQUEST_CONSTRUCTED',
             'CONQUEST_CONSTRUCTED')`
  )
    .bind(
      conquestDrillProposalId(operation.operationKey, 1),
      `readiness-workflow-replay-${operation.operationKey}`,
      operation.targetUserId,
      operation.opponentUserIds[0],
      timestamp,
      timestamp
    )
    .run()
}

beforeEach(() => {
  vi.useRealTimers()
})

describe('Conquest readiness drill Workflow orchestration', () => {
  it('fails before durable acceptance when the Workflow binding is missing', async () => {
    const now = new Date('2026-08-01T00:00:00.000Z')
    const actor = await provisionActor(now)
    const poolVersion = await approvedPool(now)
    const operationKey = crypto.randomUUID()

    await expect(
      scheduleConquestReadinessDrill(
        { AUTH_DB: env.AUTH_DB },
        actor,
        { poolVersion, reason: 'Missing Workflow binding test' },
        operationKey,
        now
      )
    ).rejects.toThrow('Workflow binding is missing')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM staff_conquest_drill_operations
         WHERE operation_key = ?`
      )
        .bind(operationKey)
        .first('count')
    ).toBe(0)
  })

  it('recovers a committed creation gap under one deterministic instance', async () => {
    const now = new Date('2026-08-02T00:00:00.000Z')
    const actor = await provisionActor(now)
    const poolVersion = await approvedPool(now)
    const operationKey = crypto.randomUUID()
    const unavailable = {
      create: vi.fn(async () => {
        throw new Error('Workflow API unavailable')
      }),
      get: vi.fn(async () => {
        throw new Error('Workflow API unavailable')
      })
    } as unknown as Workflow<{ operationKey: string }>

    const accepted = await scheduleConquestReadinessDrill(
      {
        AUTH_DB: env.AUTH_DB,
        CONQUEST_READINESS_DRILL_WORKFLOW: unavailable
      },
      actor,
      { poolVersion, reason: 'Recover the exact accepted operation' },
      operationKey,
      now
    )
    expect(accepted.status).toBe('RUNNING')
    const instanceId = conquestDrillWorkflowInstanceId(operationKey)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT workflow_instance_id, completed_at
         FROM staff_conquest_drill_orchestrations WHERE operation_key = ?`
      )
        .bind(operationKey)
        .first()
    ).toEqual({ workflow_instance_id: instanceId, completed_at: null })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT phase, failure_code
         FROM staff_conquest_drill_orchestration_failures
         WHERE operation_key = ? ORDER BY id DESC LIMIT 1`
      )
        .bind(operationKey)
        .first()
    ).toEqual({
      phase: 'WORKFLOW_DISPATCH',
      failure_code: 'WORKFLOW_API_UNAVAILABLE'
    })

    const create = vi.fn(async () => ({ id: instanceId }))
    expect(
      await dispatchPendingConquestReadinessDrills({
        AUTH_DB: env.AUTH_DB,
        CONQUEST_READINESS_DRILL_WORKFLOW: {
          create
        } as unknown as Workflow<{ operationKey: string }>
      })
    ).toEqual({ started: 1, existing: 0, restarted: 0, failed: 0 })
    expect(create).toHaveBeenCalledWith({
      id: instanceId,
      params: { operationKey }
    })
  })

  it('restarts terminal Workflow state while D1 remains active', async () => {
    const now = new Date('2026-08-03T00:00:00.000Z')
    const actor = await provisionActor(now)
    const poolVersion = await approvedPool(now)
    const operationKey = crypto.randomUUID()
    await new ConquestDrillRepository(env.AUTH_DB).start(
      actor,
      { poolVersion, reason: 'Restart incomplete drill Workflow' },
      operationKey,
      now
    )
    const restart = vi.fn(async () => undefined)
    const workflow = {
      create: vi.fn(async () => {
        throw new Error('instance already exists')
      }),
      get: vi.fn(async () => ({
        status: vi.fn(async () => ({ status: 'complete' as const })),
        restart
      }))
    } as unknown as Workflow<{ operationKey: string }>

    const result = await dispatchPendingConquestReadinessDrills({
      AUTH_DB: env.AUTH_DB,
      CONQUEST_READINESS_DRILL_WORKFLOW: workflow
    })
    expect(result).toMatchObject({ started: 0, existing: 0, failed: 0 })
    expect(result.restarted).toBeGreaterThanOrEqual(1)
    expect(workflow.get).toHaveBeenCalledWith(
      conquestDrillWorkflowInstanceId(operationKey)
    )
    expect(restart).toHaveBeenCalledTimes(result.restarted)
  })

  it('preserves the exact match deadline and terminal business receipt', async () => {
    const startedAt = new Date('2026-08-04T00:00:00.000Z')
    const actor = await provisionActor(startedAt)
    const poolVersion = await approvedPool(startedAt)
    const operationKey = crypto.randomUUID()
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const operation = await repository.start(
      actor,
      { poolVersion, reason: 'Exercise exact match deadline' },
      operationKey,
      startedAt
    )
    await insertActiveMatch(operation, startedAt)
    const beforeDeadline = new Date('2026-08-04T03:59:59.999Z')
    expect(
      await repository.run(async () => undefined, beforeDeadline, operationKey)
    ).toMatchObject({ waiting: 1, failed: 0 })
    expect(
      await repository.nextObservationAt(
        operationKey,
        new Date('2026-08-04T03:58:30.000Z')
      )
    ).toEqual(new Date('2026-08-04T04:00:00.000Z'))

    const deadline = new Date('2026-08-04T04:00:00.000Z')
    expect(
      await repository.run(async () => undefined, deadline, operationKey)
    ).toMatchObject({ waiting: 0, failed: 1 })
    expect(await repository.get(operationKey)).toMatchObject({
      status: 'FAILED',
      failureReason: 'MATCH_LEDGER_FAILED',
      completedAt: deadline.toISOString()
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT completed_at FROM staff_conquest_drill_orchestrations
         WHERE operation_key = ?`
      )
        .bind(operationKey)
        .first('completed_at')
    ).toBe(deadline.toISOString())
  })

  it('rejects a tampered Workflow instance and drives a genuine timeout once', async () => {
    vi.useFakeTimers()
    const startedAt = new Date('2026-08-05T00:00:00.000Z')
    vi.setSystemTime(startedAt)
    const actor = await provisionActor(startedAt)
    const poolVersion = await approvedPool(startedAt)
    const operationKey = crypto.randomUUID()
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const operation = await repository.start(
      actor,
      { poolVersion, reason: 'Workflow authority and timeout test' },
      operationKey,
      startedAt
    )
    await insertActiveMatch(operation, startedAt)

    await expect(
      runConquestReadinessDrillWorkflow(
        {
          AUTH_DB: env.AUTH_DB,
          MATCH_SERVICE: {
            fetch: vi.fn()
          } as unknown as Fetcher,
          INTERNAL_AUTH_SECRET: 'test-secret'
        },
        workflowEvent(
          operationKey,
          startedAt,
          `${conquestDrillWorkflowInstanceId(operationKey)}-tampered`
        ),
        immediateStep()
      )
    ).rejects.toThrow('instance is not authoritative')
    expect((await repository.get(operationKey)).status).toBe('RUNNING')

    const deadline = new Date('2026-08-05T04:00:00.000Z')
    vi.setSystemTime(deadline)
    expect(
      await runConquestReadinessDrillWorkflow(
        {
          AUTH_DB: env.AUTH_DB,
          MATCH_SERVICE: {
            fetch: vi.fn()
          } as unknown as Fetcher,
          INTERNAL_AUTH_SECRET: 'test-secret'
        },
        workflowEvent(operationKey, deadline),
        immediateStep()
      )
    ).toEqual({ operationKey, status: 'FAILED' })
  })
})
