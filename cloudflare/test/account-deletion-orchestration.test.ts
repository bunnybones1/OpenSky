import { env, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AccountDeletionRepository,
  finalizeAcceptedAccountDeletion
} from '../src/account-deletion'
import {
  dispatchPendingAccountDeletions,
  runAccountDeletionWorkflow,
  scheduleAccountDeletion
} from '../src/account-deletion-orchestration'
import { feedbackPrefixForUser } from '../src/client-feedback'
import { PlayerRepository } from '../src/player'

let sequence = 0

const addPlayer = async (now: Date) => {
  sequence += 1
  const userId = `account-deletion-workflow-${sequence}`
  const nowText = now.toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, 'https://example.com/private.png', ?, ?)`
    ).bind(userId, `Delete Workflow ${sequence}`, `${userId}@example.com`, nowText, nowText),
    env.AUTH_DB.prepare(
      `INSERT INTO auth_identities
         (provider, provider_subject, user_id, email, email_verified,
          created_at, updated_at)
       VALUES ('google', ?, ?, ?, 1, ?, ?)`
    ).bind(
      `google-account-deletion-${sequence}`,
      userId,
      `${userId}@example.com`,
      nowText,
      nowText
    )
  ])
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  return userId
}

const workflowEvent = (
  userId: string,
  now: Date,
  instanceId = `account-deletion-${userId}`
): WorkflowEvent<{ userId: string }> => ({
  instanceId,
  workflowName: 'cloud-weasel-account-deletion',
  payload: { userId },
  timestamp: now
})

const immediateStep = (onSleepUntil?: (date: Date) => void): WorkflowStep =>
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
    sleepUntil: vi.fn(async (_name: string, date: Date) => onSleepUntil?.(date)),
    sleep: vi.fn(async () => undefined)
  }) as unknown as WorkflowStep

beforeEach(() => {
  vi.useRealTimers()
})

describe('account deletion Workflow orchestration', () => {
  it('fails closed before acceptance when either required binding is absent', async () => {
    const now = new Date('2026-08-01T00:00:00.000Z')
    const userId = await addPlayer(now)
    const workflow = {
      create: vi.fn(async () => ({ id: 'created' }))
    } as unknown as Workflow<{ userId: string }>

    await expect(
      scheduleAccountDeletion(
        { AUTH_DB: env.AUTH_DB, ACCOUNT_DELETION_WORKFLOW: workflow },
        userId,
        now
      )
    ).rejects.toThrow('R2 binding is missing')
    await expect(
      scheduleAccountDeletion(
        { AUTH_DB: env.AUTH_DB, CLIENT_FEEDBACK: env.CLIENT_FEEDBACK },
        userId,
        now
      )
    ).rejects.toThrow('Workflow binding is missing')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM account_deletion_requests
         WHERE user_id = ?`
      )
        .bind(userId)
        .first('count')
    ).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT account_status FROM player_account_settings WHERE user_id = ?`
      )
        .bind(userId)
        .first('account_status')
    ).toBe('ACTIVE')
  })

  it('keeps a committed creation gap recoverable under one deterministic instance', async () => {
    const now = new Date('2026-08-02T00:00:00.000Z')
    const userId = await addPlayer(now)
    const unavailable = {
      create: vi.fn(async () => {
        throw new Error('Workflow API unavailable')
      }),
      get: vi.fn(async () => {
        throw new Error('Workflow API unavailable')
      })
    } as unknown as Workflow<{ userId: string }>

    const accepted = await scheduleAccountDeletion(
      {
        AUTH_DB: env.AUTH_DB,
        CLIENT_FEEDBACK: env.CLIENT_FEEDBACK,
        ACCOUNT_DELETION_WORKFLOW: unavailable
      },
      userId,
      now
    )
    expect(accepted).toMatchObject({
      status: 'PENDING',
      workflowInstanceId: `account-deletion-${userId}`,
      dispatchStatus: 'pending_recovery'
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT phase FROM account_deletion_orchestration_failures
         WHERE user_id = ? ORDER BY id DESC LIMIT 1`
      )
        .bind(userId)
        .first('phase')
    ).toBe('WORKFLOW_DISPATCH')

    const create = vi.fn(async () => ({ id: `account-deletion-${userId}` }))
    const recovered = await dispatchPendingAccountDeletions({
      AUTH_DB: env.AUTH_DB,
      CLIENT_FEEDBACK: env.CLIENT_FEEDBACK,
      ACCOUNT_DELETION_WORKFLOW: { create } as unknown as Workflow<{
        userId: string
      }>
    })
    expect(recovered).toMatchObject({ started: 1, failed: 0 })
    expect(create).toHaveBeenCalledWith({
      id: `account-deletion-${userId}`,
      params: { userId }
    })
  })

  it('restarts a terminal Workflow while its D1 privacy receipt is incomplete', async () => {
    const now = new Date('2026-08-03T00:00:00.000Z')
    const userId = await addPlayer(now)
    await new AccountDeletionRepository(env.AUTH_DB).request(userId, now)
    const restart = vi.fn(async () => undefined)
    const workflow = {
      create: vi.fn(async () => {
        throw new Error('instance already exists')
      }),
      get: vi.fn(async () => ({
        status: vi.fn(async () => ({ status: 'errored' as const })),
        restart
      }))
    } as unknown as Workflow<{ userId: string }>

    const result = await dispatchPendingAccountDeletions({
      AUTH_DB: env.AUTH_DB,
      CLIENT_FEEDBACK: env.CLIENT_FEEDBACK,
      ACCOUNT_DELETION_WORKFLOW: workflow
    })
    expect(result.restarted).toBeGreaterThanOrEqual(1)
    expect(result.failed).toBe(0)
    expect(restart).toHaveBeenCalledTimes(result.restarted)
    expect(workflow.get).toHaveBeenCalledWith(`account-deletion-${userId}`)
  })

  it('sleeps to the exact source deadline, purges R2 first, and completes D1 once', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-04T00:00:00.000Z')
    vi.setSystemTime(now)
    const userId = await addPlayer(now)
    const request = await new AccountDeletionRepository(env.AUTH_DB).request(
      userId,
      now
    )
    const objectKey = `${feedbackPrefixForUser(userId)}2026-08/private.json`
    await env.CLIENT_FEEDBACK.put(objectKey, '{"private":true}')
    const sleepUntil = vi.fn((date: Date) => vi.setSystemTime(date))
    const step = immediateStep(sleepUntil)

    expect(
      await runAccountDeletionWorkflow(
        { AUTH_DB: env.AUTH_DB, CLIENT_FEEDBACK: env.CLIENT_FEEDBACK },
        workflowEvent(userId, now),
        step
      )
    ).toMatchObject({ status: 'completed' })
    expect(sleepUntil).toHaveBeenCalledWith(new Date(request.executeAt))
    expect(await env.CLIENT_FEEDBACK.head(objectKey)).toBeNull()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT request.status,
                orchestration.r2_cleanup_verified_at IS NOT NULL AS r2_clean,
                orchestration.completed_at IS NOT NULL AS completed,
                settings.account_status
         FROM account_deletion_requests request
         JOIN account_deletion_orchestrations orchestration
           ON orchestration.user_id = request.user_id
         JOIN player_account_settings settings
           ON settings.user_id = request.user_id
         WHERE request.user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({
      status: 'COMPLETED',
      r2_clean: 1,
      completed: 1,
      account_status: 'DELETED'
    })
    expect(
      await finalizeAcceptedAccountDeletion(
        env.AUTH_DB,
        userId,
        `account-deletion-${userId}`,
        request.executeAt,
        0,
        new Date(request.executeAt)
      )
    ).toMatchObject({ status: 'already_completed' })
  })

  it('rejects a tampered Workflow instance before private data changes', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T00:00:00.000Z')
    vi.setSystemTime(now)
    const userId = await addPlayer(now)
    await new AccountDeletionRepository(env.AUTH_DB).request(userId, now)
    const objectKey = `${feedbackPrefixForUser(userId)}2026-08/private.json`
    await env.CLIENT_FEEDBACK.put(objectKey, '{"private":true}')

    await expect(
      runAccountDeletionWorkflow(
        { AUTH_DB: env.AUTH_DB, CLIENT_FEEDBACK: env.CLIENT_FEEDBACK },
        workflowEvent(userId, now, `account-deletion-${userId}-tampered`),
        immediateStep(date => vi.setSystemTime(date))
      )
    ).rejects.toThrow('instance is not authoritative')
    expect(await env.CLIENT_FEEDBACK.head(objectKey)).not.toBeNull()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM account_deletion_requests WHERE user_id = ?`
      )
        .bind(userId)
        .first('status')
    ).toBe('PENDING')
  })

  it('keeps D1 pending when R2 cleanup fails and records no abandonment state', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-06T00:00:00.000Z')
    vi.setSystemTime(now)
    const userId = await addPlayer(now)
    await new AccountDeletionRepository(env.AUTH_DB).request(userId, now)
    const failingBucket = {
      list: vi.fn(async () => {
        throw new Error('R2 unavailable')
      })
    } as unknown as R2Bucket

    await expect(
      runAccountDeletionWorkflow(
        { AUTH_DB: env.AUTH_DB, CLIENT_FEEDBACK: failingBucket },
        workflowEvent(userId, now),
        immediateStep(date => vi.setSystemTime(date))
      )
    ).rejects.toThrow('R2 unavailable')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT request.status, orchestration.completed_at
         FROM account_deletion_requests request
         JOIN account_deletion_orchestrations orchestration
           ON orchestration.user_id = request.user_id
         WHERE request.user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ status: 'PENDING', completed_at: null })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT phase FROM account_deletion_orchestration_failures
         WHERE user_id = ? ORDER BY id DESC LIMIT 1`
      )
        .bind(userId)
        .first('phase')
    ).toBe('R2_DELETE')
  })

  it('recovers the privacy-safe R2-empty/D1-pending half-state', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-07T00:00:00.000Z')
    vi.setSystemTime(now)
    const userId = await addPlayer(now)
    await new AccountDeletionRepository(env.AUTH_DB).request(userId, now)
    const objectKey = `${feedbackPrefixForUser(userId)}2026-08/private.json`
    await env.CLIENT_FEEDBACK.put(objectKey, '{"private":true}')
    const failingDatabase = new Proxy(env.AUTH_DB, {
      get(target, property) {
        if (property === 'batch') {
          return async () => {
            throw new Error('D1 completion unavailable')
          }
        }
        const value = Reflect.get(target, property)
        return typeof value === 'function' ? value.bind(target) : value
      }
    }) as D1Database

    await expect(
      runAccountDeletionWorkflow(
        { AUTH_DB: failingDatabase, CLIENT_FEEDBACK: env.CLIENT_FEEDBACK },
        workflowEvent(userId, now),
        immediateStep(date => vi.setSystemTime(date))
      )
    ).rejects.toThrow('D1 completion unavailable')
    expect(await env.CLIENT_FEEDBACK.head(objectKey)).toBeNull()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM account_deletion_requests WHERE user_id = ?`
      )
        .bind(userId)
        .first('status')
    ).toBe('PENDING')

    expect(
      await runAccountDeletionWorkflow(
        { AUTH_DB: env.AUTH_DB, CLIENT_FEEDBACK: env.CLIENT_FEEDBACK },
        workflowEvent(userId, now),
        immediateStep()
      )
    ).toMatchObject({ status: 'completed' })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM account_deletion_requests WHERE user_id = ?`
      )
        .bind(userId)
        .first('status')
    ).toBe('COMPLETED')
  })
})
