import {
  env,
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
  SELF
} from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { GameMatch, GameServerEnv } from '../src/game-match'
import {
  INTERNAL_AUTH_HEADER,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from '../src/protocol'
import { applyMatchProgression, applyMatchStats } from '../src/progression'
import {
  createMatchFixture,
  PRINCIPAL_1,
  PRINCIPAL_2,
  PROPOSAL_ID
} from './fixture'

const runtimeEnv = env as unknown as GameServerEnv
let proposalId = PROPOSAL_ID
const fixture = (overrides: Parameters<typeof createMatchFixture>[0] = {}) =>
  createMatchFixture({ ...overrides, proposalId })
const stub = () => runtimeEnv.GAME_MATCHES.getByName(`match:${proposalId}`)
const sockets: WebSocket[] = []

const internalHeaders = {
  'content-type': 'application/json',
  [INTERNAL_AUTH_HEADER]: 'game-server-test-secret'
}
const USER_ID_1 = '11111111-1111-4111-8111-111111111111'
const USER_ID_2 = '22222222-2222-4222-8222-222222222222'

const createMatch = (fixture = createMatchFixture({ proposalId })) =>
  SELF.fetch('https://game.example/internal/matches', {
    method: 'POST',
    headers: internalHeaders,
    body: JSON.stringify(fixture)
  })

const initializeMatch = async (
  fixture = createMatchFixture({ proposalId })
) => {
  const response = await createMatch(fixture)
  expect(response.status).toBe(200)
  return response.json()
}

const insertActiveLedgerRow = async (
  ledgerProposalId = proposalId,
  userIds: [string | null, string | null] = [null, null]
) => {
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_matches
       (proposal_id, replay_id, mode, version, player1_principal,
        player2_principal, player1_user_id, player2_user_id,
        match_payload_json, server_address, status, created_at, updated_at)
     VALUES (?, ?, 'RANKED_CONSTRUCTED', 'test-release', ?, ?, ?, ?,
             '{}', ?, 'active', ?, ?)`
  )
    .bind(
      ledgerProposalId,
      `replay-${ledgerProposalId}`,
      PRINCIPAL_1,
      PRINCIPAL_2,
      userIds[0],
      userIds[1],
      `wss://opensky.example/api/game/matches/${ledgerProposalId}`,
      now,
      now
    )
    .run()
}

const insertQuestPlayers = async () => {
  const now = new Date().toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, 'Player One', 'one@example.com', NULL, ?, ?)`
    ).bind(USER_ID_1, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, 'Player Two', 'two@example.com', NULL, ?, ?)`
    ).bind(USER_ID_2, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (id, user_id, created_at)
       VALUES (1, ?, ?)`
    ).bind(USER_ID_1, now),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (id, user_id, created_at)
       VALUES (2, ?, ?)`
    ).bind(USER_ID_2, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_stats
         (user_id, game_mode, season, score, player_rank, player_rank_stage,
          player_rank_state, created_at, updated_at)
       VALUES (?, 'RANKED_CONSTRUCTED', 126, 0, 'WANDERER', 'STAGE_I',
               '[-1,1750,350,0]', ?, ?)`
    ).bind(USER_ID_1, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_stats
         (user_id, game_mode, season, score, player_rank, player_rank_stage,
          player_rank_state, created_at, updated_at)
       VALUES (?, 'RANKED_CONSTRUCTED', 126, 0, 'WANDERER', 'STAGE_I',
               '[-1,1750,350,0]', ?, ?)`
    ).bind(USER_ID_2, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_quests
         (rowid, user_id, quest_key, title, description, progress, target,
          reward_xp, status, created_at, updated_at, quest_type, position,
          periodicity, is_rerollable, is_new, active)
       VALUES (7001, ?, 'strength-one', '', '', 0, 1, 100, 'active', ?, ?,
               'Strengthweaver', 1, 'DAILY', 0, 1, 1)`
    ).bind(USER_ID_1, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_quests
         (rowid, user_id, quest_key, title, description, progress, target,
          reward_xp, status, created_at, updated_at, quest_type, position,
          periodicity, is_rerollable, is_new, active)
       VALUES (7002, ?, 'strength-two', '', '', 0, 1, 100, 'active', ?, ?,
               'Strengthweaver', 1, 'DAILY', 0, 1, 1)`
    ).bind(USER_ID_2, now, now)
  ])
}

const connect = async (principal: string) => {
  const response = await SELF.fetch(
    `https://game.example/v1/matches/${proposalId}`,
    {
      headers: {
        Upgrade: 'websocket',
        Origin: 'https://opensky.example',
        [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
        [TRUSTED_PRINCIPAL_HEADER]: principal,
        [TRUSTED_USER_ID_HEADER]: `user-${principal.slice(2, 6)}`
      }
    }
  )
  expect(response.status).toBe(101)
  const socket = response.webSocket!
  socket.accept()
  sockets.push(socket)
  return socket
}

const collectMessages = (socket: WebSocket, count: number) =>
  new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const messages: Record<string, unknown>[] = []
    const timeout = setTimeout(
      () =>
        reject(
          new Error(
            `timed out waiting for messages: ${JSON.stringify(messages)}`
          )
        ),
      2_000
    )
    const listener = (event: MessageEvent) => {
      messages.push(JSON.parse(event.data as string))
      if (messages.length === count) {
        clearTimeout(timeout)
        socket.removeEventListener('message', listener)
        resolve(messages)
      }
    }
    socket.addEventListener('message', listener)
  })

const nextMessage = async (socket: WebSocket) =>
  (await collectMessages(socket, 1))[0]

const join = (socket: WebSocket, subkeyByte: number) => {
  socket.send(
    JSON.stringify({
      type: 'join_server',
      authToken: 'legacy-token-is-ignored',
      loadingProgress: 1,
      subkeyCertification: {
        player: Array(20).fill(0xff),
        subkey: Array(20).fill(subkeyByte),
        signature: Array(65).fill(0)
      }
    })
  )
}

beforeEach(async () => {
  proposalId = `proposal-test-${crypto.randomUUID()}`
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_progression'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_stats_applied'),
    env.AUTH_DB.prepare('DELETE FROM player_account_stats'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
    env.AUTH_DB.prepare('DELETE FROM player_quests'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
})

afterEach(() => {
  for (const socket of sockets.splice(0)) {
    try {
      socket.close(1000, 'test complete')
    } catch {
      // Already closed.
    }
  }
})

describe('Cloudflare authoritative game Match Durable Object', () => {
  it('enforces public gateway and request-boundary safeties', async () => {
    const health = await SELF.fetch('https://game.example/health')
    expect(await health.json()).toEqual({
      ok: true,
      component: 'cloud-weasel-game-server',
      protocolVersion: 1
    })

    const tooLarge = await SELF.fetch('https://game.example/internal/matches', {
      method: 'POST',
      headers: {
        ...internalHeaders,
        'content-length': String(1024 * 1024 + 1)
      },
      body: '{}'
    })
    expect(tooLarge.status).toBe(413)
    await tooLarge.json()

    const badPath = await SELF.fetch('https://game.example/v1/matches/%', {
      headers: {
        Upgrade: 'websocket',
        Origin: 'https://opensky.example',
        [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
        [TRUSTED_PRINCIPAL_HEADER]: PRINCIPAL_1,
        [TRUSTED_USER_ID_HEADER]: 'user-1'
      }
    })
    expect(badPath.status).toBe(400)
    await badPath.json()
  })

  it('can evict an initialized object without a connected socket', async () => {
    await initializeMatch()
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        await state.storage.deleteAlarm()
      }
    )
    await evictDurableObject(stub())
  })

  it('creates a WASM match idempotently and rejects conflicting reuse', async () => {
    const response = await createMatch()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      proposalId,
      matchId: 42,
      serverAddress: `wss://opensky.example/api/game/matches/${proposalId}`
    })
    await initializeMatch()

    const conflict = await SELF.fetch('https://game.example/internal/matches', {
      method: 'POST',
      headers: internalHeaders,
      body: JSON.stringify(fixture({ matchID: 43 }))
    })
    expect(conflict.status).toBe(409)

    const mutated = await createMatch(fixture({ replayID: 'different-replay' }))
    expect(mutated.status).toBe(409)

    const wrongRelease = await createMatch(
      fixture({ releaseVersion: 'different-release' })
    )
    expect(wrongRelease.status).toBe(409)
  })

  it('authenticates players at the gateway boundary and sends private reconnect state', async () => {
    await initializeMatch()
    const denied = await SELF.fetch(
      `https://game.example/v1/matches/${proposalId}`,
      {
        headers: {
          Upgrade: 'websocket',
          Origin: 'https://opensky.example',
          [INTERNAL_AUTH_HEADER]: 'wrong-secret',
          [TRUSTED_PRINCIPAL_HEADER]: PRINCIPAL_1,
          [TRUSTED_USER_ID_HEADER]: 'user-1'
        }
      }
    )
    expect(denied.status).toBe(401)

    const first = await connect(PRINCIPAL_1)
    const firstMessages = collectMessages(first, 2)
    join(first, 0x31)
    const received = await firstMessages
    expect(received[0]).toMatchObject({
      type: 'reconnect',
      replayID: 'replay-test-42',
      gitCommit: 'test-release'
    })
    expect(received[0].store).toMatch(/^0x[0-9a-f]+$/)
    expect(received[1]).toMatchObject({
      type: 'opponent_loading_progress',
      progress: 0
    })
  })

  it('preserves the source client time-sync-before-join handshake', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)

    first.send(
      JSON.stringify({ type: 'player_loading_progress', progress: 0.25 })
    )

    for (const clientTime of [101, 102, 103, 104, 105]) {
      const response = nextMessage(first)
      first.send(JSON.stringify({ type: 'timesync', clientTime }))
      expect(await response).toMatchObject({
        type: 'timesync',
        clientTime
      })
    }

    const joined = collectMessages(first, 2)
    join(first, 0x31)
    expect(await joined).toEqual([
      expect.objectContaining({ type: 'reconnect' }),
      expect.objectContaining({ type: 'opponent_loading_progress' })
    ])
  })

  it('still rejects gameplay before join_server', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const response = nextMessage(first)
    first.send(JSON.stringify({ type: 'gameplay', data: ['0x00'] }))

    expect(await response).toMatchObject({
      type: 'error',
      message: 'Error: join_server is required first'
    })
  })

  it('restores the authoritative WASM snapshot and socket attachment after eviction', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const firstJoinMessages = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoinMessages

    const drained = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    await drained.json()
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        await state.storage.deleteAlarm()
      }
    )
    await evictDurableObject(stub())
    const timeSync = nextMessage(first)
    first.send(JSON.stringify({ type: 'timesync', clientTime: 1234 }))
    expect(await timeSync).toMatchObject({
      type: 'timesync',
      clientTime: 1234
    })

    const status = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(status.status).toBe(200)
    expect(await status.json()).toMatchObject({
      initialized: true,
      matchId: 42,
      sockets: 1
    })
  }, 10_000)

  it('uses durable alarms to advance commit-reveal state', async () => {
    await insertQuestPlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const second = await connect(PRINCIPAL_2)
    const firstJoinMessages = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoinMessages
    const secondReconnect = nextMessage(second)
    join(second, 0x32)
    expect(await secondReconnect).toMatchObject({ type: 'reconnect' })

    const initialStatus = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    const initialBody = (await initialStatus.json()) as {
      state: { hasState: boolean; pendingPlayer?: number }
      timers: Record<string, unknown>
    }
    let hasState = initialBody.state.hasState
    for (let attempt = 0; attempt < 6 && !hasState; attempt += 1) {
      await runInDurableObject(
        stub() as DurableObjectStub,
        async (_instance, state) => {
          const timers =
            (await state.storage.get<Record<string, unknown>>(
              'match:timers'
            )) ?? {}
          await state.storage.put('match:timers', {
            ...timers,
            commitRevealAtMs: Date.now() - 1,
            turnAtMs: undefined
          })
          await state.storage.setAlarm(Date.now() + 60_000)
        }
      )
      expect(await runDurableObjectAlarm(stub())).toBe(true)
      const status = await stub().fetch('https://match/internal/status', {
        headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
      })
      const body = (await status.json()) as { state: { hasState: boolean } }
      hasState = body.state.hasState
    }
    expect(hasState).toBe(true)

    await evictDurableObject(stub())
    const statusAfterEviction = await stub().fetch(
      'https://match/internal/status',
      {
        headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
      }
    )
    expect(await statusAfterEviction.json()).toMatchObject({
      state: { hasState: true }
    })

    const completionMessages = collectMessages(first, 3)
    first.send(JSON.stringify({ type: 'abandon_match' }))
    const completed = await completionMessages
    expect(completed.map(message => message.type)).toEqual([
      'gameplay',
      'match_ended',
      'rewards'
    ])
    expect(completed[2]).toMatchObject({
      type: 'rewards',
      data: [
        {
          accountID: 1,
          type: 'RANK',
          gameMode: 'RANKED_CONSTRUCTED',
          rank: {
            beforeMatch: {
              rank: 'WANDERER',
              rankStage: 'STAGE_I',
              score: 0,
              requiredRankPoints: 100
            },
            afterMatch: {
              rank: 'WANDERER',
              rankStage: 'STAGE_I',
              score: 0,
              requiredRankPoints: 100
            }
          }
        }
      ]
    })
    const endedStatus = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(await endedStatus.json()).toMatchObject({
      ended: true,
      state: { statusType: 'GameOver', winner: 1 },
      questProgress: [{ 7001: 0 }, { 7002: 1 }]
    })

    const ledger = await env.AUTH_DB.prepare(
      `SELECT status, winner_player, result_json, ended_at
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(proposalId)
      .first<{
        status: string
        winner_player: number
        result_json: string
        ended_at: string
      }>()
    expect(ledger).toMatchObject({
      status: 'ended',
      winner_player: 1,
      ended_at: expect.any(String)
    })
    expect(JSON.parse(ledger!.result_json)).toMatchObject({ winner: 1 })

    const stats = await env.AUTH_DB.prepare(
      `SELECT user_id, win_count, loss_count, tie_count, win_streak,
              loss_streak, season, score, player_rank, player_rank_stage,
              player_rank_state
       FROM player_account_stats
       WHERE game_mode = 'RANKED_CONSTRUCTED'
       ORDER BY user_id`
    ).all<{
      user_id: string
      win_count: number
      loss_count: number
      tie_count: number
      win_streak: number
      loss_streak: number
      season: number
      score: number
      player_rank: string
      player_rank_stage: string
      player_rank_state: string
    }>()
    expect(stats.results).toEqual([
      {
        user_id: USER_ID_1,
        win_count: 0,
        loss_count: 1,
        tie_count: 0,
        win_streak: 0,
        loss_streak: 1,
        season: 126,
        score: 0,
        player_rank: 'WANDERER',
        player_rank_stage: 'STAGE_I',
        player_rank_state: '[-1,1750,350,0]'
      },
      {
        user_id: USER_ID_2,
        win_count: 1,
        loss_count: 0,
        tie_count: 0,
        win_streak: 1,
        loss_streak: 0,
        season: 126,
        score: 43,
        player_rank: 'WANDERER',
        player_rank_stage: 'STAGE_I',
        player_rank_state:
          '[1,1882.1627313643605,350,43]'
      }
    ])
    expect(
      await applyMatchStats(
        env.AUTH_DB,
        proposalId,
        126,
        0,
        new Date(Date.now() + 1_000).toISOString()
      )
    ).toMatchObject({
      applied: false,
      rewards: [
        [expect.objectContaining({ type: 'RANK' })],
        [expect.objectContaining({ type: 'RANK' })]
      ]
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_match_stats_applied
         WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('count')
    ).toBe(1)

    const quests = await env.AUTH_DB.prepare(
      `SELECT rowid AS id, progress, status FROM player_quests ORDER BY rowid`
    ).all<{ id: number; progress: number; status: string }>()
    expect(quests.results).toEqual([
      { id: 7001, progress: 0, status: 'active' },
      { id: 7002, progress: 1, status: 'complete' }
    ])
    const progression = await env.AUTH_DB.prepare(
      `SELECT player1_quest_progress_json, player2_quest_progress_json,
              rewards_json
       FROM multiplayer_match_progression WHERE proposal_id = ?`
    )
      .bind(proposalId)
      .first<{
        player1_quest_progress_json: string
        player2_quest_progress_json: string
        rewards_json: string
      }>()
    expect(JSON.parse(progression!.player1_quest_progress_json)).toEqual({})
    expect(JSON.parse(progression!.player2_quest_progress_json)).toEqual({
      7002: 1
    })
    expect(JSON.parse(progression!.rewards_json)).toEqual([[], []])

    const retried = await applyMatchProgression(
      env.AUTH_DB,
      proposalId,
      [{ 7001: 1 }, { 7002: 1 }],
      new Date(Date.now() + 1_000).toISOString()
    )
    expect(retried.questProgress).toEqual([{}, { 7002: 1 }])
    const afterRetry = await env.AUTH_DB.prepare(
      `SELECT progress FROM player_quests WHERE rowid = 7002`
    ).first<{ progress: number }>()
    expect(afterRetry?.progress).toBe(1)
  })

  it('restores a hibernated practice bot and applies one validated action per alarm', async () => {
    const botProposalId = 'proposal-bot-test-1'
    const practiceStub = () =>
      runtimeEnv.GAME_MATCHES.getByName(`match:${botProposalId}`)
    const created = await createMatch(
      createMatchFixture({ botPlayer2: true, proposalId: botProposalId })
    )
    expect(created.status).toBe(200)
    await created.json()

    await runInDurableObject(
      practiceStub() as DurableObjectStub,
      async (_instance, state) => {
        const players =
          await state.storage.get<Record<string, Record<string, unknown>>>(
            'match:players'
          )
        expect(players).toBeDefined()
        players![PRINCIPAL_1] = {
          ...players![PRINCIPAL_1],
          connected: true,
          joined: true,
          loadingProgress: 1,
          finishedLoadingAssets: true
        }
        await state.storage.put('match:players', players!)
      }
    )

    let hasState = false
    for (let attempt = 0; attempt < 6 && !hasState; attempt += 1) {
      await runInDurableObject(
        practiceStub() as DurableObjectStub,
        async (_instance, state) => {
          const timers =
            (await state.storage.get<Record<string, unknown>>(
              'match:timers'
            )) ?? {}
          await state.storage.put('match:timers', {
            ...timers,
            commitRevealAtMs: Date.now() - 1
          })
          await state.storage.setAlarm(Date.now() + 60_000)
        }
      )
      expect(await runDurableObjectAlarm(practiceStub())).toBe(true)
      const response = await practiceStub().fetch(
        'https://match/internal/status',
        {
          headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
        }
      )
      const body = (await response.json()) as {
        state: { hasState: boolean }
      }
      hasState = body.state.hasState
    }
    expect(hasState).toBe(true)

    await runInDurableObject(
      practiceStub() as DurableObjectStub,
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
    await evictDurableObject(practiceStub())
    expect(await runDurableObjectAlarm(practiceStub())).toBe(true)

    const status = await practiceStub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(await status.json()).toMatchObject({
      ended: false,
      state: { hasState: true },
      timers: {
        botActionCount: 1,
        botFailureCount: 0
      }
    })
  })
})
