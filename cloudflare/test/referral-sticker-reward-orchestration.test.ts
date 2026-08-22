import { env, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'

import { seasonStart } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'
import {
  acceptDueReferralStickerRewardSweep,
  applyReferralStickerRewardQueueMessage,
  dispatchDueReferralStickerRewards,
  handleReferralStickerRewardQueue,
  publishDueReferralStickerDeliveries,
  publishPendingReferralStickerPreparations,
  runReferralStickerRewardWorkflow,
  snapshotAcceptedReferralStickerRewardSweep,
  type ReferralStickerRewardQueueMessage
} from '../src/referral-sticker-reward-orchestration'

const HOUR_MS = 60 * 60 * 1000
const DELIVERY_MS = 23 * HOUR_MS

const atSeason = (season: number, hours = 48) =>
  new Date(seasonStart(season).getTime() + hours * HOUR_MS)

const addPlayer = async (userId: string, now: Date, points: number) => {
  const nowText = now.toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, nowText, nowText)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  await env.AUTH_DB.prepare(
    `INSERT INTO player_items
       (user_id, item_type, token_id, balance, is_new, unlock_source,
        created_at, updated_at)
     VALUES (?, 'SW_STICKER_POINTS', 0, ?, 0, 'test', ?, ?)`
  )
    .bind(userId, points, nowText, nowText)
    .run()
}

const activateSchedule = async (
  season: number,
  version: number,
  now: Date,
  entries: Array<{ tokenId: number; requiredPoints: number }>
) => {
  const nowText = now.toISOString()
  for (const entry of entries) {
    await env.AUTH_DB.prepare(
      `INSERT INTO content_stickers (token_id, required_points, season)
       VALUES (?, ?, ?)`
    )
      .bind(entry.tokenId, entry.requiredPoints, season)
      .run()
  }
  await env.AUTH_DB.prepare(
    `INSERT INTO referral_sticker_schedule_versions
       (version, season, status, expected_entry_count, created_by_user_id,
        activated_by_user_id, reason, review_reference, created_at,
        activated_at)
     VALUES (?, ?, 'DRAFT', ?, 'system:test-author', NULL,
             'orchestration test', 'test:referral-workflow', ?, NULL)`
  )
    .bind(version, season, entries.length, nowText)
    .run()
  for (const entry of entries) {
    await env.AUTH_DB.prepare(
      `INSERT INTO referral_sticker_schedule_entries
         (schedule_version, token_id, required_points) VALUES (?, ?, ?)`
    )
      .bind(version, entry.tokenId, entry.requiredPoints)
      .run()
  }
  await env.AUTH_DB.prepare(
    `UPDATE referral_sticker_schedule_versions
     SET status = 'ACTIVE', activated_by_user_id = 'system:test-reviewer',
         activated_at = ? WHERE version = ?`
  )
    .bind(nowText, version)
    .run()
}

const queuePublisher = () => {
  const messages: ReferralStickerRewardQueueMessage[] = []
  const queue = {
    send: vi.fn(),
    sendBatch: vi.fn(async entries => {
      messages.push(
        ...entries.map(entry => entry.body as ReferralStickerRewardQueueMessage)
      )
    })
  } as unknown as Queue<ReferralStickerRewardQueueMessage>
  return { messages, queue }
}

const acceptAndSnapshot = async (season: number, now: Date) => {
  const accepted = await acceptDueReferralStickerRewardSweep(env.AUTH_DB, now)
  expect(accepted.status).toBe('accepted')
  if (!accepted.sweep) throw new Error('expected accepted referral sweep')
  await snapshotAcceptedReferralStickerRewardSweep(
    env.AUTH_DB,
    accepted.sweep.id,
    accepted.sweep.workflow_instance_id,
    now
  )
  expect(accepted.sweep.season).toBe(season)
  return accepted.sweep
}

describe('referral sticker Workflow orchestration', () => {
  it('accepts at source cadence and fails closed before binding-less acceptance', async () => {
    const season = 20
    const now = atSeason(season)
    await activateSchedule(season, 2001, now, [
      { tokenId: 20001, requiredPoints: 10 }
    ])

    await expect(
      dispatchDueReferralStickerRewards({ AUTH_DB: env.AUTH_DB }, now)
    ).rejects.toThrow('Workflow binding is missing')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM referral_sticker_reward_sweeps
         WHERE schedule_version = 2001`
      ).first('count')
    ).toBe(0)

    const first = await acceptDueReferralStickerRewardSweep(env.AUTH_DB, now)
    expect(first.status).toBe('accepted')
    expect(
      await acceptDueReferralStickerRewardSweep(
        env.AUTH_DB,
        new Date(now.getTime() + HOUR_MS - 1)
      )
    ).toEqual({ status: 'not_due', sweep: null })
    expect(
      (
        await acceptDueReferralStickerRewardSweep(
          env.AUTH_DB,
          new Date(now.getTime() + HOUR_MS)
        )
      ).status
    ).toBe('accepted')
  })

  it('publishes every player through platform-sized pages, not source caps', async () => {
    const season = 21
    const now = atSeason(season)
    const userIds = Array.from(
      { length: 101 },
      (_, index) => `sticker-workflow-bulk-${String(index).padStart(3, '0')}`
    )
    for (const userId of userIds) await addPlayer(userId, now, 10)
    await activateSchedule(season, 2101, now, [
      { tokenId: 21001, requiredPoints: 10 }
    ])
    const sweep = await acceptAndSnapshot(season, now)
    const publisher = queuePublisher()

    const first = await publishPendingReferralStickerPreparations(
      { AUTH_DB: env.AUTH_DB, REFERRAL_STICKER_REWARD_QUEUE: publisher.queue },
      sweep.id
    )
    expect(first).toMatchObject({ published: 100 })
    const second = await publishPendingReferralStickerPreparations(
      { AUTH_DB: env.AUTH_DB, REFERRAL_STICKER_REWARD_QUEUE: publisher.queue },
      sweep.id,
      first.nextCursor
    )
    expect(second).toEqual({ published: 1 })
    expect(publisher.messages).toHaveLength(101)
  })

  it('publishes atomic offchain inventory only after the 23-hour boundary', async () => {
    const season = 22
    const now = atSeason(season)
    const userId = 'sticker-workflow-player-22'
    await addPlayer(userId, now, 30)
    await activateSchedule(season, 2201, now, [
      { tokenId: 22001, requiredPoints: 10 },
      { tokenId: 22002, requiredPoints: 30 }
    ])
    const sweep = await acceptAndSnapshot(season, now)

    expect(
      await applyReferralStickerRewardQueueMessage(
        env.AUTH_DB,
        { kind: 'PREPARE', version: 1, sweepId: sweep.id, userId },
        now
      )
    ).toBe('applied')
    expect(
      await applyReferralStickerRewardQueueMessage(
        env.AUTH_DB,
        { kind: 'PREPARE', version: 1, sweepId: sweep.id, userId },
        now
      )
    ).toBe('duplicate')
    const batch = await env.AUTH_DB.prepare(
      `SELECT id, deliver_at FROM referral_sticker_reward_batches
       WHERE user_id = ? AND season = ?`
    )
      .bind(userId, season)
      .first<{ id: number; deliver_at: string }>()
    expect(batch?.deliver_at).toBe(
      new Date(now.getTime() + DELIVERY_MS).toISOString()
    )
    if (!batch) throw new Error('expected prepared referral batch')

    await expect(
      applyReferralStickerRewardQueueMessage(
        env.AUTH_DB,
        {
          kind: 'DELIVER',
          version: 1,
          sweepId: sweep.id,
          batchId: batch.id
        },
        new Date(now.getTime() + DELIVERY_MS - 1)
      )
    ).rejects.toThrow('delivery authority is invalid')

    const due = new Date(now.getTime() + DELIVERY_MS)
    const publisher = queuePublisher()
    expect(
      await publishDueReferralStickerDeliveries(
        {
          AUTH_DB: env.AUTH_DB,
          REFERRAL_STICKER_REWARD_QUEUE: publisher.queue
        },
        sweep.id,
        due
      )
    ).toEqual({ published: 1 })
    expect(
      await applyReferralStickerRewardQueueMessage(
        env.AUTH_DB,
        publisher.messages[0],
        due
      )
    ).toBe('applied')
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT token_id, balance FROM player_items
           WHERE user_id = ? AND item_type = 'SW_STICKERS'
           ORDER BY token_id`
        )
          .bind(userId)
          .all()
      ).results
    ).toEqual([
      { token_id: 22001, balance: 100 },
      { token_id: 22002, balance: 100 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM referral_sticker_reward_sweep_deliveries
         WHERE sweep_id = ? AND batch_id = ?`
      )
        .bind(sweep.id, batch.id)
        .first('status')
    ).toBe('APPLIED')
  })

  it('prepares a later tier while the earlier sweep is sleeping', async () => {
    const season = 23
    const now = atSeason(season)
    const userId = 'sticker-workflow-player-23'
    await addPlayer(userId, now, 30)
    await activateSchedule(season, 2301, now, [
      { tokenId: 23001, requiredPoints: 30 },
      { tokenId: 23002, requiredPoints: 40 }
    ])
    const first = await acceptAndSnapshot(season, now)
    await applyReferralStickerRewardQueueMessage(
      env.AUTH_DB,
      { kind: 'PREPARE', version: 1, sweepId: first.id, userId },
      now
    )
    const later = new Date(now.getTime() + HOUR_MS)
    await env.AUTH_DB.prepare(
      `UPDATE player_items SET balance = balance + 10, updated_at = ?
       WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
    )
      .bind(later.toISOString(), userId)
      .run()
    const second = await acceptAndSnapshot(season, later)
    await applyReferralStickerRewardQueueMessage(
      env.AUTH_DB,
      { kind: 'PREPARE', version: 1, sweepId: second.id, userId },
      later
    )

    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT total_cost, previous_cost, points_deducted, status
           FROM referral_sticker_reward_batches
           WHERE user_id = ? ORDER BY total_cost`
        )
          .bind(userId)
          .all()
      ).results
    ).toEqual([
      {
        total_cost: 30,
        previous_cost: 0,
        points_deducted: 30,
        status: 'PENDING'
      },
      {
        total_cost: 40,
        previous_cost: 30,
        points_deducted: 10,
        status: 'PENDING'
      }
    ])
  })

  it('acks poison and duplicates while retaining valid failures beyond source retries', async () => {
    const season = 24
    const now = atSeason(season)
    const userId = 'sticker-workflow-player-24'
    await addPlayer(userId, now, 10)
    await activateSchedule(season, 2401, now, [
      { tokenId: 24001, requiredPoints: 10 }
    ])
    const sweep = await acceptAndSnapshot(season, now)
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings SET account_status = 'SUSPENDED'
       WHERE user_id = ?`
    )
      .bind(userId)
      .run()

    const poison = {
      id: 'poison-message',
      timestamp: now,
      attempts: 1,
      body: { kind: 'PREPARE', version: 1, sweepId: sweep.id },
      ack: vi.fn(),
      retry: vi.fn()
    }
    const valid = {
      id: 'valid-failure-101',
      timestamp: now,
      attempts: 101,
      body: {
        kind: 'PREPARE',
        version: 1,
        sweepId: sweep.id,
        userId
      },
      ack: vi.fn(),
      retry: vi.fn()
    }
    await handleReferralStickerRewardQueue(
      {
        queue: 'cloud-weasel-referral-sticker-reward-delivery',
        messages: [poison, valid]
      } as unknown as MessageBatch<ReferralStickerRewardQueueMessage>,
      env.AUTH_DB,
      now
    )
    expect(poison.ack).toHaveBeenCalledOnce()
    expect(poison.retry).not.toHaveBeenCalled()
    expect(valid.retry).toHaveBeenCalledOnce()
    expect(valid.ack).not.toHaveBeenCalled()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT delivery_attempt FROM referral_sticker_reward_queue_failures
         WHERE message_id = 'valid-failure-101'`
      ).first('delivery_attempt')
    ).toBe(101)
  })

  it('runs the Workflow through durable preparation, sleep, delivery, and completion', async () => {
    const season = 26
    const now = atSeason(season)
    const userId = 'sticker-workflow-player-26'
    await addPlayer(userId, now, 10)
    await activateSchedule(season, 2601, now, [
      { tokenId: 26001, requiredPoints: 10 }
    ])
    const accepted = await acceptDueReferralStickerRewardSweep(env.AUTH_DB, now)
    if (!accepted.sweep) throw new Error('expected accepted referral sweep')

    vi.useFakeTimers()
    vi.setSystemTime(now)
    try {
      const queue = {
        send: vi.fn(),
        sendBatch: vi.fn(async entries => {
          for (const entry of entries) {
            await applyReferralStickerRewardQueueMessage(
              env.AUTH_DB,
              entry.body,
              new Date()
            )
          }
        })
      } as unknown as Queue<ReferralStickerRewardQueueMessage>
      const step = {
        do: vi.fn(async (_name, callback) => callback()),
        sleep: vi.fn(async () => undefined),
        sleepUntil: vi.fn(async (_name, date: Date) => {
          vi.setSystemTime(date)
        })
      } as unknown as WorkflowStep

      await expect(
        runReferralStickerRewardWorkflow(
          { AUTH_DB: env.AUTH_DB, REFERRAL_STICKER_REWARD_QUEUE: queue },
          {
            instanceId: accepted.sweep.workflow_instance_id,
            workflowName: 'cloud-weasel-referral-sticker-rewards',
            payload: { sweepId: accepted.sweep.id },
            timestamp: now
          } satisfies WorkflowEvent<{ sweepId: number }>,
          step
        )
      ).resolves.toEqual({ sweepId: accepted.sweep.id, completed: true })
    } finally {
      vi.useRealTimers()
    }
    expect(
      await env.AUTH_DB.prepare(
        `SELECT completed_at FROM referral_sticker_reward_sweeps WHERE id = ?`
      )
        .bind(accepted.sweep.id)
        .first('completed_at')
    ).not.toBeNull()
  })

  it('restarts terminal Workflows whose D1 sweep is incomplete', async () => {
    const season = 25
    const now = atSeason(season)
    await activateSchedule(season, 2501, now, [
      { tokenId: 25001, requiredPoints: 0 }
    ])
    const restart = vi.fn(async () => undefined)
    const workflow = {
      create: vi.fn(async () => {
        throw new Error('instance exists')
      }),
      get: vi.fn(() => ({
        status: vi.fn(async () => ({ status: 'errored' as const })),
        restart
      }))
    } as unknown as Workflow<{ sweepId: number }>
    const queue = queuePublisher().queue

    const result = await dispatchDueReferralStickerRewards(
      {
        AUTH_DB: env.AUTH_DB,
        REFERRAL_STICKER_REWARD_WORKFLOW: workflow,
        REFERRAL_STICKER_REWARD_QUEUE: queue
      },
      now
    )
    expect(result.status).toBe('dispatched')
    expect(result.restarted).toBeGreaterThanOrEqual(1)
    expect(restart).toHaveBeenCalledTimes(result.restarted)
  })
})
