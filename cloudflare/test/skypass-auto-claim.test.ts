import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Env } from '../src/env'
import { seasonStart } from '../src/legacy-seasons'
import { PlayerRepository } from '../src/player'
import { PlayerRpcRepository } from '../src/player-rpc'
import {
  acceptDueSkypassSeasonClose,
  applySkypassAutoClaimQueueMessage,
  dispatchDueSkypassAutoClaims,
  handleSkypassAutoClaimQueue,
  publishPendingSkypassAutoClaims,
  runSkypassSeasonCloseWorkflow,
  snapshotAcceptedSkypassSeasonClose,
  type SkypassAutoClaimQueueMessage
} from '../src/skypass-auto-claim'
import {
  clearTestSkypassPolicies,
  createTestSkypassPolicy
} from './helpers/skypass-policy'

const SEASON = 10
const DUE = new Date(seasonStart(SEASON + 1).getTime() + 10_000)

const setupPlayer = async (
  userId: string,
  premium = false,
  achievedAccountLevel: number | null = 1
) => {
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  if (achievedAccountLevel !== null) {
    await env.AUTH_DB.prepare(
      `INSERT INTO player_skypass_season_stats
         (user_id, season, has_premium, created_at, updated_at,
          initial_account_level, achieved_account_level)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    )
      .bind(userId, SEASON, premium ? 1 : 0, now, now, achievedAccountLevel)
      .run()
  }
}

const setSkypassLevel = (userId: string, level: number) =>
  env.AUTH_DB.prepare(
    `UPDATE player_progression SET basic_skypass_level = ? WHERE user_id = ?`
  )
    .bind(level, userId)
    .run()

const stageUnpublishedExperience = async (userId: string) => {
  const proposalId = `skypass-pending-xp-${crypto.randomUUID()}`
  const settlementToken = crypto.randomUUID()
  const beforeAt = '2026-08-21T15:54:00.000Z'
  const stagedAt = '2026-08-21T15:54:01.000Z'
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `UPDATE player_profiles
       SET level = 1, xp = 170, next_level_xp = 200, updated_at = ?
       WHERE user_id = ?`
    ).bind(beforeAt, userId),
    env.AUTH_DB.prepare(
      `UPDATE player_progression
       SET basic_skypass_level = 1, basic_skypass_xp = 170,
           basic_skypass_next_xp = 200, updated_at = ?
       WHERE user_id = ?`
    ).bind(beforeAt, userId),
    ...['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'].map(mode =>
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_stats
           (user_id, game_mode, season, score, player_rank,
            player_rank_stage, player_rank_state, created_at, updated_at)
         VALUES (?, ?, ?, 0, 'WANDERER', 'STAGE_I', '[1,1750,350,0]', ?, ?)`
      ).bind(userId, mode, SEASON, beforeAt, beforeAt)
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, player1_mode, player2_mode, version,
          player1_principal, player2_principal, player1_user_id,
          player2_user_id, match_payload_json, status, created_at, updated_at)
       VALUES (?, ?, 'PRACTICE_PVP', 'PRACTICE_PVP', 'PRACTICE_PVP',
               'skypass-auto-claim-test', ?, ?, ?, NULL, '{}', 'active', ?, ?)`
    ).bind(
      proposalId,
      `${proposalId}-replay`,
      `identity:${userId}`,
      `identity:bot:${proposalId}`,
      userId,
      stagedAt,
      stagedAt
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_experience_players
         (proposal_id, player_index, user_id, season, settlement_token,
          experience_gain, before_level, before_xp, before_skypass_level,
          before_skypass_xp, season_stats_existed_before,
          season_initial_account_level_before,
          season_achieved_account_level_before, profile_updated_at_before,
          after_level, after_xp, ranked_constructed_before,
          ranked_discovery_before, inviter_user_id,
          inviter_levels_before, inviter_sticker_points_before,
          inviter_sticker_points_existed_before,
          inviter_sticker_points_created_at_before,
          inviter_sticker_points_updated_at_before, rewards_json, processed_at)
       VALUES (?, 0, ?, ?, ?, 50, 1, 170, 1, 170, 1, 0, 0, ?,
               2, 20, 'WANDERER', 'WANDERER', NULL, 0, 0, 0, '', '', '[]', ?)`
    ).bind(proposalId, userId, SEASON, settlementToken, beforeAt, stagedAt),
    env.AUTH_DB.prepare(
      `UPDATE player_profiles
       SET level = 2, xp = 20, next_level_xp = 200, updated_at = ?
       WHERE user_id = ?`
    ).bind(stagedAt, userId),
    env.AUTH_DB.prepare(
      `UPDATE player_progression
       SET basic_skypass_level = 2, basic_skypass_xp = 20,
           basic_skypass_next_xp = 200, updated_at = ?
       WHERE user_id = ?`
    ).bind(stagedAt, userId),
    env.AUTH_DB.prepare(
      `UPDATE player_skypass_season_stats
       SET achieved_account_level = 1, updated_at = ?
       WHERE user_id = ? AND season = ?`
    ).bind(stagedAt, userId, SEASON),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_experience
         (proposal_id, player1_rewards_json, player2_rewards_json,
          processed_at, player_count, settlement_token)
       VALUES (?, '[]', '[]', ?, 1, ?)`
    ).bind(proposalId, stagedAt, settlementToken)
  ])
  return { proposalId, stagedAt }
}

const acceptAndSnapshot = async () => {
  const accepted = await acceptDueSkypassSeasonClose(env.AUTH_DB, DUE)
  expect(accepted.status).toBe('accepted')
  const close = accepted.close!
  const snapshot = await snapshotAcceptedSkypassSeasonClose(
    env.AUTH_DB,
    close.season,
    close.workflow_instance_id,
    DUE
  )
  expect(snapshot.ready).toBe(true)
  return close
}

const fakeQueue = () => {
  const bodies: SkypassAutoClaimQueueMessage[] = []
  const queue = {
    sendBatch: async (
      messages: Iterable<{ body: SkypassAutoClaimQueueMessage }>
    ) => {
      for (const message of messages) bodies.push(message.body)
    }
  } as unknown as Queue<SkypassAutoClaimQueueMessage>
  return { queue, bodies }
}

const publish = async () => {
  const queue = fakeQueue()
  const result = await publishPendingSkypassAutoClaims(
    { AUTH_DB: env.AUTH_DB, SKYPASS_AUTO_CLAIM_QUEUE: queue.queue },
    SEASON,
    DUE
  )
  return { ...queue, result }
}

const queueMessage = (
  body: SkypassAutoClaimQueueMessage,
  id: string,
  attempts: number
) => {
  const outcome = { acked: false, retried: false }
  const message = {
    id,
    timestamp: DUE,
    body,
    attempts,
    ack: () => {
      outcome.acked = true
    },
    retry: () => {
      outcome.retried = true
    }
  } as Message<SkypassAutoClaimQueueMessage>
  return { message, outcome }
}

const messageBatch = (messages: Message<SkypassAutoClaimQueueMessage>[]) =>
  ({
    messages,
    queue: 'cloud-weasel-skypass-auto-claim-delivery',
    metadata: {
      metrics: { backlogCount: messages.length, backlogBytes: 0 }
    },
    ackAll: () => undefined,
    retryAll: () => undefined
  }) as MessageBatch<SkypassAutoClaimQueueMessage>

const stickerPoints = (userId: string) =>
  env.AUTH_DB.prepare(
    `SELECT COALESCE(SUM(balance), 0) AS balance FROM player_items
     WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS'`
  )
    .bind(userId)
    .first<number>('balance')

beforeEach(async () => {
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_one_skypass_queue_player'
  ).run()
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_skypass_atomic_claim'
  ).run()
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  await env.AUTH_DB.prepare(
    'DROP TRIGGER skypass_season_close_orchestrations_no_delete'
  ).run()
  await env.AUTH_DB.prepare(
    'DELETE FROM skypass_season_close_orchestrations'
  ).run()
  await env.AUTH_DB.prepare('DELETE FROM skypass_season_close_cycles').run()
  await env.AUTH_DB.prepare(
    `CREATE TRIGGER skypass_season_close_orchestrations_no_delete
     BEFORE DELETE ON skypass_season_close_orchestrations
     BEGIN
       SELECT RAISE(ABORT, 'SkyPass close orchestrations are immutable');
     END`
  ).run()
  await clearTestSkypassPolicies(env.AUTH_DB, [SEASON])
})

describe('SkyPass season-close orchestration', () => {
  it('fails closed on missing topology and accepts the exact source boundary and policy', async () => {
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 1, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    const emptyQueue = fakeQueue().queue
    await expect(
      dispatchDueSkypassAutoClaims(
        {
          AUTH_DB: env.AUTH_DB,
          SKYPASS_AUTO_CLAIM_QUEUE: emptyQueue
        } as Pick<
          Env,
          | 'AUTH_DB'
          | 'SKYPASS_SEASON_CLOSE_WORKFLOW'
          | 'SKYPASS_AUTO_CLAIM_QUEUE'
        >,
        DUE
      )
    ).rejects.toThrow('Workflow binding is missing')
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM skypass_season_close_cycles'
      ).first()
    ).toEqual({ count: 0 })

    expect(
      await acceptDueSkypassSeasonClose(
        env.AUTH_DB,
        new Date(DUE.getTime() - 1)
      )
    ).toEqual({ status: 'not_due', close: null })
    const accepted = await acceptDueSkypassSeasonClose(env.AUTH_DB, DUE)
    expect(accepted).toMatchObject({
      status: 'accepted',
      close: {
        season: SEASON,
        workflow_instance_id: `skypass-close-${SEASON}`,
        version: 1,
        content_sha256:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }
    })
    expect(accepted.close?.closes_at).toBe(DUE.toISOString())

    await expect(
      createTestSkypassPolicy(env.AUTH_DB, SEASON, [
        { level: 1, tier: 1, itemType: 303, amount: 2, isInfinite: 0 },
        { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
      ])
    ).rejects.toThrow('policy is frozen after season close acceptance')
  })

  it('delivers free and entitled premium rewards off chain exactly once', async () => {
    await setupPlayer('free-player')
    await setupPlayer('premium-player', true)
    const policy = await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 5, isInfinite: 0 },
      { level: 1, tier: 2, itemType: 303, amount: 7, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    await acceptAndSnapshot()
    const first = await publish()
    expect(first.bodies).toHaveLength(2)
    await Promise.all(
      first.bodies.map(body =>
        applySkypassAutoClaimQueueMessage(env.AUTH_DB, body, DUE)
      )
    )
    await expect(
      publishPendingSkypassAutoClaims(
        {
          AUTH_DB: env.AUTH_DB,
          SKYPASS_AUTO_CLAIM_QUEUE: first.queue
        },
        SEASON,
        DUE
      )
    ).resolves.toEqual({ completed: true, published: 0 })

    expect(await stickerPoints('free-player')).toBe(5)
    expect(await stickerPoints('premium-player')).toBe(12)
    const claims = await env.AUTH_DB.prepare(
      `SELECT user_id, reward_id, auto_claim_season
       FROM player_skypass_claims ORDER BY user_id, reward_id`
    ).all<{
      user_id: string
      reward_id: number
      auto_claim_season: number
    }>()
    expect(claims.results).toEqual([
      {
        user_id: 'free-player',
        reward_id: policy.rows[0].id,
        auto_claim_season: SEASON
      },
      {
        user_id: 'premium-player',
        reward_id: policy.rows[0].id,
        auto_claim_season: SEASON
      },
      {
        user_id: 'premium-player',
        reward_id: policy.rows[1].id,
        auto_claim_season: SEASON
      }
    ])
    const completions = await env.AUTH_DB.prepare(
      `SELECT stats.user_id, stats.autoclaimed, receipt.claimed_reward_count
       FROM player_skypass_season_stats stats
       JOIN player_skypass_auto_claims receipt
         ON receipt.user_id = stats.user_id AND receipt.season = stats.season
       WHERE stats.season = ? ORDER BY stats.user_id`
    )
      .bind(SEASON)
      .all()
    expect(completions.results).toEqual([
      {
        user_id: 'free-player',
        autoclaimed: 1,
        claimed_reward_count: 1
      },
      {
        user_id: 'premium-player',
        autoclaimed: 1,
        claimed_reward_count: 2
      }
    ])
    const notifications = await env.AUTH_DB.prepare(
      `SELECT user_id, payload FROM player_notifications
       WHERE skypass_auto_claim_season = ? ORDER BY user_id`
    )
      .bind(SEASON)
      .all<{ user_id: string; payload: string }>()
    expect(notifications.results).toHaveLength(2)
    expect(JSON.parse(notifications.results[0].payload)).toEqual({
      oneTime: {
        id: 0,
        name: 'Autoclaimed Rewards',
        data: {
          title: 'ALL AVAILABLE UNCLAIMED REWARDS WERE AUTO-CLAIMED!',
          subtitle: 'SKYPASS SEASON 10: UNKNOWN COMPLETE!',
          background: 'webapp/backgrounds/spbg-all-claimed.webp'
        }
      }
    })
    expect(
      await applySkypassAutoClaimQueueMessage(env.AUTH_DB, first.bodies[0], DUE)
    ).toBe('duplicate')
    expect(await stickerPoints('free-player')).toBe(5)
  })

  it('claims more than five rewards in one player transaction and rolls back a late fault', async () => {
    await setupPlayer('atomic-player', false, 6)
    await setSkypassLevel('atomic-player', 6)
    const policy = await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      ...Array.from({ length: 6 }, (_, index) => ({
        level: index + 1,
        tier: 1 as const,
        itemType: 303,
        amount: 1,
        isInfinite: 0 as const
      })),
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    await acceptAndSnapshot()
    const { bodies } = await publish()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_skypass_atomic_claim
       BEFORE INSERT ON player_skypass_claims
       WHEN NEW.reward_id = ${policy.rows[5].id}
       BEGIN SELECT RAISE(ABORT, 'injected late atomic claim failure'); END`
    ).run()
    await expect(
      applySkypassAutoClaimQueueMessage(env.AUTH_DB, bodies[0], DUE)
    ).rejects.toThrow('injected late atomic claim failure')
    expect(await stickerPoints('atomic-player')).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_skypass_claims
         WHERE user_id = 'atomic-player'`
      ).first()
    ).toEqual({ count: 0 })

    await env.AUTH_DB.prepare('DROP TRIGGER reject_skypass_atomic_claim').run()
    expect(
      await applySkypassAutoClaimQueueMessage(env.AUTH_DB, bodies[0], DUE)
    ).toBe('applied')
    expect(await stickerPoints('atomic-player')).toBe(6)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT claimed_reward_count FROM player_skypass_auto_claims
         WHERE user_id = 'atomic-player' AND season = ?`
      )
        .bind(SEASON)
        .first()
    ).toEqual({ claimed_reward_count: 6 })
  })

  it('marks a manually exhausted player without manufacturing a notification', async () => {
    await setupPlayer('manual-player')
    const policy = await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 4, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    await new PlayerRpcRepository(env.AUTH_DB).claimSkypassRewards(
      'manual-player',
      [policy.rows[0].id],
      { now: new Date(DUE.getTime() - 1_000) }
    )
    await acceptAndSnapshot()
    const { bodies } = await publish()
    expect(
      await applySkypassAutoClaimQueueMessage(env.AUTH_DB, bodies[0], DUE)
    ).toBe('applied')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT claimed_reward_count FROM player_skypass_auto_claims
         WHERE user_id = 'manual-player' AND season = ?`
      )
        .bind(SEASON)
        .first()
    ).toEqual({ claimed_reward_count: 0 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_notifications
         WHERE user_id = 'manual-player'
           AND skypass_auto_claim_season = ?`
      )
        .bind(SEASON)
        .first()
    ).toEqual({ count: 0 })
  })

  it('does not snapshot absent or zero-progress rows and waits for staged match XP', async () => {
    await setupPlayer('zero-progress-player', false, 0)
    await setupPlayer('absent-progress-player', false, null)
    await setupPlayer('pending-match-player', false, 0)
    const pending = await stageUnpublishedExperience('pending-match-player')
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 5, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    const accepted = await acceptDueSkypassSeasonClose(env.AUTH_DB, DUE)
    expect(
      await snapshotAcceptedSkypassSeasonClose(
        env.AUTH_DB,
        SEASON,
        accepted.close!.workflow_instance_id,
        DUE
      )
    ).toEqual({ season: SEASON, ready: false, playersAdded: 0 })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM skypass_auto_claim_deliveries'
      ).first()
    ).toEqual({ count: 0 })

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches SET status = 'ended', ended_at = ?,
         updated_at = ? WHERE proposal_id = ?`
    )
      .bind(pending.stagedAt, pending.stagedAt, pending.proposalId)
      .run()
    expect(
      await snapshotAcceptedSkypassSeasonClose(
        env.AUTH_DB,
        SEASON,
        accepted.close!.workflow_instance_id,
        DUE
      )
    ).toEqual({ season: SEASON, ready: true, playersAdded: 1 })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT user_id FROM skypass_auto_claim_deliveries'
      ).first()
    ).toEqual({ user_id: 'pending-match-player' })
  })

  it('isolates poison players, preserves six failures, and recovers on attempt seven', async () => {
    await setupPlayer('queue-fault')
    await setupPlayer('queue-success')
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 3, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    await acceptAndSnapshot()
    const { bodies } = await publish()
    const faultBody = bodies.find(body => body.userId === 'queue-fault')!
    const successBody = bodies.find(body => body.userId === 'queue-success')!
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_one_skypass_queue_player
       BEFORE INSERT ON player_items
       WHEN NEW.user_id = 'queue-fault'
         AND NEW.unlock_source LIKE 'skypass:%'
       BEGIN SELECT RAISE(ABORT, 'injected poison player'); END`
    ).run()

    const firstFault = queueMessage(faultBody, 'fault-message', 1)
    const success = queueMessage(successBody, 'success-message', 1)
    await handleSkypassAutoClaimQueue(
      messageBatch([firstFault.message, success.message]),
      env.AUTH_DB,
      DUE
    )
    expect(firstFault.outcome).toEqual({ acked: false, retried: true })
    expect(success.outcome).toEqual({ acked: true, retried: false })
    expect(await stickerPoints('queue-success')).toBe(3)
    expect(await stickerPoints('queue-fault')).toBe(0)

    for (let attempt = 2; attempt <= 6; attempt++) {
      const failed = queueMessage(faultBody, 'fault-message', attempt)
      await handleSkypassAutoClaimQueue(
        messageBatch([failed.message]),
        env.AUTH_DB,
        DUE
      )
      expect(failed.outcome.retried).toBe(true)
    }
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_skypass_auto_claim_failures
         WHERE user_id = 'queue-fault'`
      ).first()
    ).toEqual({ count: 6 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM skypass_auto_claim_deliveries
         WHERE user_id = 'queue-fault' AND season = ?`
      )
        .bind(SEASON)
        .first()
    ).toEqual({ status: 'PENDING' })

    await env.AUTH_DB.prepare(
      'DROP TRIGGER reject_one_skypass_queue_player'
    ).run()
    const recovered = queueMessage(faultBody, 'fault-message', 7)
    await handleSkypassAutoClaimQueue(
      messageBatch([recovered.message]),
      env.AUTH_DB,
      DUE
    )
    expect(recovered.outcome).toEqual({ acked: true, retried: false })
    expect(await stickerPoints('queue-fault')).toBe(3)
  })

  it('acknowledges malformed and unknown messages without mutation', async () => {
    await setupPlayer('message-player')
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 2, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    await acceptAndSnapshot()
    expect(
      await applySkypassAutoClaimQueueMessage(env.AUTH_DB, {
        kind: 'SKYPASS_AUTO_CLAIM',
        version: 1,
        season: SEASON,
        userId: 'message-player',
        rewardIds: [1]
      })
    ).toBe('ignored')
    expect(
      await applySkypassAutoClaimQueueMessage(env.AUTH_DB, {
        kind: 'SKYPASS_AUTO_CLAIM',
        version: 1,
        season: SEASON,
        userId: 'unknown-player'
      })
    ).toBe('ignored')
    expect(await stickerPoints('message-player')).toBe(0)
  })

  it('keeps concurrent delivery idempotent', async () => {
    await setupPlayer('concurrent-player')
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 9, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    await acceptAndSnapshot()
    const { bodies } = await publish()
    await Promise.all([
      applySkypassAutoClaimQueueMessage(env.AUTH_DB, bodies[0], DUE),
      applySkypassAutoClaimQueueMessage(env.AUTH_DB, bodies[0], DUE)
    ])
    expect(await stickerPoints('concurrent-player')).toBe(9)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM player_skypass_claims
            WHERE user_id = 'concurrent-player') AS claims,
           (SELECT COUNT(*) FROM player_skypass_auto_claims
            WHERE user_id = 'concurrent-player') AS completions,
           (SELECT COUNT(*) FROM player_notifications
            WHERE user_id = 'concurrent-player'
              AND skypass_auto_claim_season = ?) AS notifications`
      )
        .bind(SEASON)
        .first()
    ).toEqual({ claims: 1, completions: 1, notifications: 1 })
  })

  it('runs the Workflow to durable D1 completion and restarts a terminal orphan', async () => {
    await setupPlayer('workflow-player')
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 8, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    const accepted = await acceptDueSkypassSeasonClose(env.AUTH_DB, DUE)
    const close = accepted.close!
    const bodies: SkypassAutoClaimQueueMessage[] = []
    const queue = {
      sendBatch: async (
        messages: Iterable<{ body: SkypassAutoClaimQueueMessage }>
      ) => {
        for (const message of messages) {
          bodies.push(message.body)
          await applySkypassAutoClaimQueueMessage(
            env.AUTH_DB,
            message.body,
            new Date()
          )
        }
      }
    } as unknown as Queue<SkypassAutoClaimQueueMessage>
    const calls: string[] = []
    const step = {
      do: async (name: string, ...args: unknown[]) => {
        calls.push(`do:${name}`)
        const callback = args.find(value => typeof value === 'function') as
          | (() => Promise<unknown>)
          | undefined
        if (!callback) throw new Error('missing Workflow callback')
        return callback()
      },
      sleep: async (name: string) => {
        calls.push(`sleep:${name}`)
      }
    } as unknown as Parameters<typeof runSkypassSeasonCloseWorkflow>[2]
    expect(
      await runSkypassSeasonCloseWorkflow(
        { AUTH_DB: env.AUTH_DB, SKYPASS_AUTO_CLAIM_QUEUE: queue },
        {
          payload: { season: SEASON },
          timestamp: DUE,
          instanceId: close.workflow_instance_id,
          workflowName: 'cloud-weasel-skypass-season-close'
        },
        step
      )
    ).toEqual({ season: SEASON, completed: true })
    expect(bodies).toEqual([
      {
        kind: 'SKYPASS_AUTO_CLAIM',
        version: 1,
        season: SEASON,
        userId: 'workflow-player'
      }
    ])
    expect(calls).toContain('sleep:wait for durable SkyPass receipts')
    expect(await stickerPoints('workflow-player')).toBe(8)

    // Reopen only in a transaction for a recovery-path fixture. Production
    // guards prevent this shape; the dispatch assertion below starts from a
    // fresh accepted close in its own isolated test storage.
  })

  it('restarts a terminal Workflow while D1 remains incomplete', async () => {
    await createTestSkypassPolicy(env.AUTH_DB, SEASON, [
      { level: 1, tier: 1, itemType: 303, amount: 1, isInfinite: 0 },
      { level: 100, tier: 1, itemType: 403, amount: 1, isInfinite: 1 }
    ])
    let creates = 0
    let restarts = 0
    const workflow = {
      create: async () => {
        creates++
        throw new Error('instance already exists')
      },
      get: async () => ({
        status: async () => ({ status: 'errored' as const }),
        restart: async () => {
          restarts++
        }
      })
    } as unknown as Workflow<{ season: number }>
    const queue = fakeQueue().queue
    expect(
      await dispatchDueSkypassAutoClaims(
        {
          AUTH_DB: env.AUTH_DB,
          SKYPASS_SEASON_CLOSE_WORKFLOW: workflow,
          SKYPASS_AUTO_CLAIM_QUEUE: queue
        },
        DUE
      )
    ).toEqual({
      status: 'restarted',
      season: SEASON,
      workflowInstanceId: `skypass-close-${SEASON}`
    })
    expect({ creates, restarts }).toEqual({ creates: 1, restarts: 1 })
    expect(await acceptDueSkypassSeasonClose(env.AUTH_DB, DUE)).toMatchObject({
      status: 'existing'
    })
  })
})
