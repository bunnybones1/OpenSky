import {
  env,
  runDurableObjectAlarm,
  runInDurableObject,
  SELF
} from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  conquestDrillProposalId,
  ConquestDrillRepository
} from '../../cloudflare/src/conquest-drill'
import {
  deliverDueConquestGold,
  pendingConquestCards
} from '../../cloudflare/src/conquest-delivery'
import { approvedConquestPoolStatements } from '../../cloudflare/test/helpers/conquest-pool'
import matchService, {
  type MatchServiceEnv
} from '../../match-service-cloudflare/src/worker'
import type { GameServerEnv } from '../src/game-match'
import { INTERNAL_AUTH_HEADER } from '../src/protocol'

const runtimeEnv = env as unknown as GameServerEnv
const INTERNAL_SECRET = 'game-server-test-secret'
const RUNNER_USER_ID = 'readiness-cross-service-runner'

interface InternalStatus {
  ended: boolean
  players: Record<string, { finishedLoadingAssets: boolean }>
  timers: {
    botAtMs?: number
    commitRevealAtMs?: number
    turnAtMs?: number
    botActionCounts?: [number, number]
  }
  state: {
    hasState: boolean
    statusType?: string
    winner?: 0 | 1
    turnCount?: number
  }
}

const status = async (proposalId: string) => {
  const stub = runtimeEnv.GAME_MATCHES.getByName(`match:${proposalId}`)
  const response = await stub.fetch('https://match/internal/status', {
    headers: { [INTERNAL_AUTH_HEADER]: INTERNAL_SECRET }
  })
  expect(response.status).toBe(200)
  return response.json<InternalStatus>()
}

const readinessMatchEnv = (): MatchServiceEnv => ({
  AUTH_DB: env.AUTH_DB,
  GAME_SERVICE: {
    fetch: (request: Request) => SELF.fetch(request)
  } as Fetcher,
  INTERNAL_AUTH_SECRET: INTERNAL_SECRET,
  CURRENT_SEASON: '126',
  TURN_TIMER_ENABLED: 'true',
  ENABLE_RANKED_BOTS: 'false',
  ENABLED_GAME_MODES:
    'PRACTICE_BOT,WARM_UP,PRACTICE_PVP,RANKED_CONSTRUCTED,' +
    'RANKED_DISCOVERY,CHALLENGE_CONSTRUCTED,CHALLENGE_DISCOVERY'
})

const dispatchReadinessMatch = async (
  operationKey: string,
  matchNumber: number
) => {
  const response = await matchService.fetch(
    new Request(
      'https://cloud-weasel-match-service' +
        '/internal/conquest-readiness/matches',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [INTERNAL_AUTH_HEADER]: INTERNAL_SECRET
        },
        body: JSON.stringify({ operationKey, matchNumber })
      }
    ),
    readinessMatchEnv()
  )
  expect(response.status).toBe(200)
}

const runReadinessMatchToTerminal = async (proposalId: string) => {
  let current = await status(proposalId)
  expect(Object.values(current.players)).toEqual([
    expect.objectContaining({ finishedLoadingAssets: true }),
    expect.objectContaining({ finishedLoadingAssets: true })
  ])
  const stub = runtimeEnv.GAME_MATCHES.getByName(`match:${proposalId}`)
  for (let attempt = 0; attempt < 400 && !current.ended; attempt += 1) {
    await runInDurableObject(
      stub as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          (await state.storage.get<Record<string, unknown>>('match:timers')) ??
          {}
        const dueTimer =
          typeof timers.botAtMs === 'number'
            ? 'botAtMs'
            : typeof timers.turnAtMs === 'number'
              ? 'turnAtMs'
              : typeof timers.commitRevealAtMs === 'number'
                ? 'commitRevealAtMs'
                : undefined
        if (!dueTimer) {
          throw new Error(
            `real readiness match has no due timer: ${JSON.stringify({
              current,
              timers
            })}`
          )
        }
        await state.storage.put('match:timers', {
          ...timers,
          [dueTimer]: Date.now() - 1
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    expect(await runDurableObjectAlarm(stub)).toBe(true)
    current = await status(proposalId)
  }
  expect(current).toMatchObject({
    ended: true,
    state: {
      hasState: true,
      statusType: 'GameOver',
      turnCount: expect.any(Number)
    }
  })
  return current
}

beforeEach(async () => {
  const now = new Date().toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE status = 'ACTIVE'`
    ),
    env.AUTH_DB.prepare(
      `UPDATE game_mode_status
       SET enabled = 0, updated_by_user_id = 'system:test-reset',
           updated_at = ?
       WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')`
    ).bind(now),
    env.AUTH_DB.prepare(
      `INSERT OR IGNORE INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Readiness Integration Runner',
               'readiness-cross-service@example.com', ?, ?)`
    ).bind(RUNNER_USER_ID, now, now),
    env.AUTH_DB.prepare(
      `INSERT OR IGNORE INTO staff_roles
         (user_id, role, granted_by_user_id, reason, created_at)
       VALUES (?, 'ADMIN', NULL, 'cross-service readiness proof', ?)`
    ).bind(RUNNER_USER_ID, now),
    env.AUTH_DB.prepare(
      `INSERT OR IGNORE INTO staff_conquest_drill_permissions
         (user_id, permission, granted_by_user_id, reason, created_at)
       VALUES (?, 'RUN', NULL, 'cross-service readiness proof', ?)`
    ).bind(RUNNER_USER_ID, now)
  ])
})

describe('Conquest readiness cross-service boundary', () => {
  it('runs the real orchestrator through an authoritative dual-bot terminal result', async () => {
    const now = Date.now()
    const poolVersion = `readiness-cross-service-${crypto.randomUUID()}`
    await env.AUTH_DB.batch(
      approvedConquestPoolStatements(env.AUTH_DB, {
        version: poolVersion,
        createdAt: new Date(now - 60 * 60 * 1_000).toISOString(),
        startsAt: new Date(now - 30 * 60 * 1_000).toISOString(),
        endsAt: new Date(now + 48 * 60 * 60 * 1_000).toISOString(),
        silver: [6],
        gold: [136]
      })
    )
    const operationKey = crypto.randomUUID()
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const operation = await repository.start(
      RUNNER_USER_ID,
      { poolVersion, reason: 'real cross-service readiness proof' },
      operationKey,
      new Date(now)
    )

    const summary = await repository.run(
      async (key, matchNumber) => {
        const response = await matchService.fetch(
          new Request(
            'https://cloud-weasel-match-service' +
              '/internal/conquest-readiness/matches',
            {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                [INTERNAL_AUTH_HEADER]: INTERNAL_SECRET
              },
              body: JSON.stringify({ operationKey: key, matchNumber })
            }
          ),
          readinessMatchEnv()
        )
        expect(response.status).toBe(200)
      },
      new Date(now + 1_000),
      operationKey
    )
    expect(summary).toEqual({
      dispatched: 1,
      advanced: 0,
      completed: 0,
      failed: 0,
      waiting: 0
    })

    const proposalId = conquestDrillProposalId(operationKey, 1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT player1_user_id, player2_user_id, status
         FROM multiplayer_matches WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first()
    ).toEqual({
      player1_user_id: operation.targetUserId,
      player2_user_id: operation.opponentUserIds[0],
      status: 'active'
    })

    let current = await status(proposalId)
    expect(Object.values(current.players)).toEqual([
      expect.objectContaining({ finishedLoadingAssets: true }),
      expect.objectContaining({ finishedLoadingAssets: true })
    ])
    const stub = runtimeEnv.GAME_MATCHES.getByName(`match:${proposalId}`)
    for (
      let attempt = 0;
      attempt < 6 && !current.state.hasState;
      attempt += 1
    ) {
      await runInDurableObject(
        stub as DurableObjectStub,
        async (_instance, state) => {
          const timers =
            (await state.storage.get<Record<string, unknown>>(
              'match:timers'
            )) ?? {}
          expect(timers.commitRevealAtMs).toEqual(expect.any(Number))
          await state.storage.put('match:timers', {
            ...timers,
            commitRevealAtMs: Date.now() - 1
          })
          await state.storage.setAlarm(Date.now() + 60_000)
        }
      )
      expect(await runDurableObjectAlarm(stub)).toBe(true)
      current = await status(proposalId)
    }
    expect(current.state.hasState).toBe(true)

    await runInDurableObject(
      stub as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          (await state.storage.get<Record<string, unknown>>('match:timers')) ??
          {}
        expect(timers.botAtMs).toEqual(expect.any(Number))
        await state.storage.put('match:timers', {
          ...timers,
          botAtMs: Date.now() - 1
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    expect(await runDurableObjectAlarm(stub)).toBe(true)
    current = await status(proposalId)
    expect(
      current.timers.botActionCounts?.reduce((sum, value) => sum + value)
    ).toBeGreaterThan(0)

    for (let attempt = 0; attempt < 400 && !current.ended; attempt += 1) {
      await runInDurableObject(
        stub as DurableObjectStub,
        async (_instance, state) => {
          const timers =
            (await state.storage.get<Record<string, unknown>>(
              'match:timers'
            )) ?? {}
          const dueTimer =
            typeof timers.botAtMs === 'number'
              ? 'botAtMs'
              : typeof timers.turnAtMs === 'number'
                ? 'turnAtMs'
                : typeof timers.commitRevealAtMs === 'number'
                  ? 'commitRevealAtMs'
                  : undefined
          if (!dueTimer) {
            throw new Error(
              `real readiness match has no due timer: ${JSON.stringify({
                current,
                timers
              })}`
            )
          }
          await state.storage.put('match:timers', {
            ...timers,
            [dueTimer]: Date.now() - 1
          })
          await state.storage.setAlarm(Date.now() + 60_000)
        }
      )
      expect(await runDurableObjectAlarm(stub)).toBe(true)
      current = await status(proposalId)
    }
    expect(current).toMatchObject({
      ended: true,
      state: {
        hasState: true,
        statusType: 'GameOver',
        turnCount: expect.any(Number)
      }
    })
    const winner = current.state.winner
    expect([undefined, 0, 1]).toContain(winner)

    const terminal = await env.AUTH_DB.prepare(
      `SELECT match.status, match.winner_player, match.result_json,
              progress.player1_result, progress.player2_result
       FROM multiplayer_matches match
       JOIN multiplayer_match_conquest_progress progress
         ON progress.proposal_id = match.proposal_id
       WHERE match.proposal_id = ?`
    )
      .bind(proposalId)
      .first<{
        status: string
        winner_player: number | null
        result_json: string
        player1_result: string
        player2_result: string
      }>()
    expect(terminal).not.toBeNull()
    expect(terminal).toMatchObject({
      status: 'ended',
      winner_player: winner ?? null,
      player1_result:
        winner === undefined ? 'DRAW' : winner === 0 ? 'WIN' : 'LOSS',
      player2_result:
        winner === undefined ? 'DRAW' : winner === 1 ? 'WIN' : 'LOSS'
    })
    const result = JSON.parse(terminal!.result_json)
    expect(result).toMatchObject({
      status: 'COMPLETED',
      turnCount: current.state.turnCount,
      rewards: [expect.any(Array), expect.any(Array)]
    })
    if (winner === undefined) expect(result).not.toHaveProperty('winner')
    else expect(result.winner).toBe(winner)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM multiplayer_match_conquest_points
            WHERE proposal_id = ?) point_receipts,
           (SELECT COUNT(*) FROM multiplayer_match_conquest_point_players
            WHERE proposal_id = ?) point_player_receipts,
           (SELECT COUNT(*) FROM player_conquest_settlements) card_settlements`
      )
        .bind(proposalId, proposalId)
        .first()
    ).toEqual({
      point_receipts: 1,
      point_player_receipts: 2,
      card_settlements: 0
    })

    const terminalSummary = await repository.run(
      async () => {
        throw new Error('terminal match must not be dispatched twice')
      },
      new Date(now + 2_000),
      operationKey
    )
    expect(terminalSummary).toEqual(
      winner === 0
        ? {
            dispatched: 0,
            advanced: 1,
            completed: 0,
            failed: 0,
            waiting: 0
          }
        : {
            dispatched: 0,
            advanced: 0,
            completed: 0,
            failed: 1,
            waiting: 0
          }
    )

    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM conquest_queue_readiness
            WHERE pool_version = ?) readiness,
           (SELECT COUNT(*) FROM game_mode_status
            WHERE game_mode IN (
              'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'
            ) AND enabled = 1) enabled_modes`
      )
        .bind(poolVersion)
        .first()
    ).toEqual({ readiness: 0, enabled_modes: 0 })
  }, 60_000)

  it('settles a three-match source-bot operation and delivers Gold after 24 hours', async () => {
    const now = Date.now()
    const poolVersion = `readiness-source-bot-settlement-${crypto.randomUUID()}`
    await env.AUTH_DB.batch(
      approvedConquestPoolStatements(env.AUTH_DB, {
        version: poolVersion,
        createdAt: new Date(now - 60 * 60 * 1_000).toISOString(),
        startsAt: new Date(now - 30 * 60 * 1_000).toISOString(),
        endsAt: new Date(now + 48 * 60 * 60 * 1_000).toISOString(),
        silver: [6],
        gold: [136]
      })
    )
    const repository = new ConquestDrillRepository(env.AUTH_DB)
    const operationKey = crypto.randomUUID()
    const completedOperation = await repository.start(
      RUNNER_USER_ID,
      {
        poolVersion,
        reason: 'source-bot three-win cross-service settlement proof'
      },
      operationKey,
      new Date()
    )
    for (const matchNumber of [1, 2, 3]) {
      expect(
        await repository.run(dispatchReadinessMatch, new Date(), operationKey)
      ).toEqual({
        dispatched: 1,
        advanced: 0,
        completed: 0,
        failed: 0,
        waiting: 0
      })
      const proposalId = conquestDrillProposalId(operationKey, matchNumber)
      const terminal = await runReadinessMatchToTerminal(proposalId)
      expect(terminal.state.winner).toBe(0)
      expect(
        await repository.run(
          async () => {
            throw new Error('terminal match must not be dispatched twice')
          },
          new Date(),
          operationKey
        )
      ).toEqual({
        dispatched: 0,
        advanced: 1,
        completed: 0,
        failed: 0,
        waiting: 0
      })
    }

    expect(
      (await repository.list(poolVersion)).find(
        operation => operation.operationKey === operationKey
      )
    ).toMatchObject({
      status: 'WAITING_DELIVERY',
      completedMatchCount: 3,
      targetUserId: completedOperation.targetUserId
    })

    const settlement = await env.AUTH_DB.prepare(
      `SELECT conquest.id AS conquest_id, conquest.status AS conquest_status,
              conquest.match_progress, settlement.application_status AS
                settlement_status, settlement.wins,
              settlement.silver_card_ids_json,
              settlement.gold_card_ids_json,
              settlement.silver_token_ids_json,
              settlement.gold_token_ids_json, settlement.settled_at,
              delivery.status AS delivery_status,
              delivery.application_status AS delivery_application_status,
              delivery.deliver_at
       FROM player_conquests conquest
       JOIN player_conquest_settlements settlement
         ON settlement.conquest_id = conquest.id
       JOIN player_conquest_gold_deliveries delivery
         ON delivery.conquest_id = conquest.id
       WHERE conquest.user_id = ?`
    )
      .bind(completedOperation.targetUserId)
      .first<{
        conquest_id: number
        conquest_status: string
        match_progress: string
        settlement_status: string
        wins: number
        silver_card_ids_json: string
        gold_card_ids_json: string
        silver_token_ids_json: string
        gold_token_ids_json: string
        settled_at: string
        delivery_status: string
        delivery_application_status: string
        deliver_at: string
      }>()
    expect(settlement).not.toBeNull()
    expect(settlement).toMatchObject({
      conquest_status: 'COMPLETED',
      settlement_status: 'APPLIED',
      wins: 3,
      silver_card_ids_json: '[6]',
      gold_card_ids_json: '[136]',
      silver_token_ids_json: '[65542]',
      gold_token_ids_json: '[131208]',
      delivery_status: 'PENDING',
      delivery_application_status: 'READY'
    })
    expect(Object.values(JSON.parse(settlement!.match_progress))).toEqual([
      'WIN',
      'WIN',
      'WIN'
    ])
    expect(
      Date.parse(settlement!.deliver_at) - Date.parse(settlement!.settled_at)
    ).toBe(24 * 60 * 60 * 1_000)

    const proposalIds = [1, 2, 3].map(matchNumber =>
      conquestDrillProposalId(operationKey, matchNumber)
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM multiplayer_matches
            WHERE proposal_id IN (?, ?, ?)) matches,
           (SELECT COUNT(*) FROM multiplayer_match_conquest_progress
            WHERE proposal_id IN (?, ?, ?)) progress_receipts,
           (SELECT COUNT(*) FROM multiplayer_match_conquest_points
            WHERE proposal_id IN (?, ?, ?)) point_receipts,
           (SELECT COUNT(*) FROM multiplayer_match_conquest_point_players
            WHERE proposal_id IN (?, ?, ?)) point_player_receipts,
           (SELECT balance FROM player_items
            WHERE user_id = ? AND item_type = 'SW_SILVER_CARDS'
              AND token_id = 6) silver_balance,
           (SELECT COUNT(*) FROM player_conquest_feed_events
            WHERE conquest_id = ?) feed_events`
      )
        .bind(
          ...proposalIds,
          ...proposalIds,
          ...proposalIds,
          ...proposalIds,
          completedOperation.targetUserId,
          settlement!.conquest_id
        )
        .first()
    ).toEqual({
      matches: 3,
      progress_receipts: 3,
      point_receipts: 3,
      point_player_receipts: 6,
      silver_balance: 1,
      feed_events: 2
    })

    expect(
      await pendingConquestCards(env.AUTH_DB, completedOperation.targetUserId)
    ).toMatchObject([
      {
        cards: [{ id: 136 }],
        tokenIDs: [131_208],
        mintAt: settlement!.deliver_at
      }
    ])
    expect(
      await deliverDueConquestGold(
        env.AUTH_DB,
        new Date(Date.parse(settlement!.deliver_at) - 1)
      )
    ).toEqual({ delivered: 0, failed: 0, remaining: 0 })
    const deliveredAt = new Date(settlement!.deliver_at)
    expect(await deliverDueConquestGold(env.AUTH_DB, deliveredAt)).toEqual({
      delivered: 1,
      failed: 0,
      remaining: 0
    })
    expect(
      await pendingConquestCards(env.AUTH_DB, completedOperation.targetUserId)
    ).toEqual([])
    expect(
      await repository.run(
        async () => {
          throw new Error('delivered operation must not dispatch')
        },
        deliveredAt,
        operationKey
      )
    ).toEqual({
      dispatched: 0,
      advanced: 0,
      completed: 1,
      failed: 0,
      waiting: 0
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT delivery.status AS delivery_status,
                delivery.application_status,
                item.balance AS gold_balance,
                (SELECT COUNT(*) FROM player_conquest_feed_events
                 WHERE conquest_id = delivery.conquest_id
                   AND event_type = 'DELAYED_REWARD_MINTED') minted_events,
                (SELECT COUNT(*) FROM conquest_queue_readiness
                 WHERE pool_version = ?) readiness,
                (SELECT COUNT(*) FROM conquest_verified_drill_receipts
                 WHERE pool_version = ? AND user_id = delivery.user_id)
                  verified_drill_receipts,
                (SELECT COUNT(*) FROM game_mode_status
                 WHERE game_mode IN (
                   'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'
                 ) AND enabled = 1) enabled_modes
         FROM player_conquest_gold_deliveries delivery
         JOIN player_items item
           ON item.user_id = delivery.user_id
          AND item.item_type = 'SW_GOLD_CARDS' AND item.token_id = 136
         WHERE delivery.conquest_id = ?`
      )
        .bind(poolVersion, poolVersion, settlement!.conquest_id)
        .first()
    ).toEqual({
      delivery_status: 'DELIVERED',
      application_status: 'APPLIED',
      gold_balance: 1,
      minted_events: 1,
      readiness: 0,
      verified_drill_receipts: 1,
      enabled_modes: 0
    })
    expect(
      (await repository.list(poolVersion)).find(
        operation => operation.operationKey === operationKey
      )
    ).toMatchObject({
      status: 'COMPLETED',
      completedMatchCount: 3,
      completedAt: deliveredAt.toISOString()
    })
  }, 90_000)
})
