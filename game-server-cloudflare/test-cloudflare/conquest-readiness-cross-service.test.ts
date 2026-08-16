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
    botActionCounts?: [number, number]
  }
  state: { hasState: boolean }
}

const status = async (proposalId: string) => {
  const stub = runtimeEnv.GAME_MATCHES.getByName(`match:${proposalId}`)
  const response = await stub.fetch('https://match/internal/status', {
    headers: { [INTERNAL_AUTH_HEADER]: INTERNAL_SECRET }
  })
  expect(response.status).toBe(200)
  return response.json<InternalStatus>()
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
  it('dispatches the real orchestrator through match service into an authoritative dual-bot Durable Object', async () => {
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

    const gameService = {
      fetch: (request: Request) => SELF.fetch(request)
    } as Fetcher
    const matchEnv: MatchServiceEnv = {
      AUTH_DB: env.AUTH_DB,
      GAME_SERVICE: gameService,
      INTERNAL_AUTH_SECRET: INTERNAL_SECRET,
      CURRENT_SEASON: '126',
      TURN_TIMER_ENABLED: 'true',
      ENABLE_RANKED_BOTS: 'false',
      ENABLED_GAME_MODES:
        'PRACTICE_BOT,WARM_UP,PRACTICE_PVP,RANKED_CONSTRUCTED,' +
        'RANKED_DISCOVERY,CHALLENGE_CONSTRUCTED,CHALLENGE_DISCOVERY'
    }
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
          matchEnv
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
    expect(current.ended).toBe(false)

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
  })
})
