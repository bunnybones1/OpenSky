import {
  env,
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
  SELF
} from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GameMode, MatchStatus } from '@opensky/proto'

import { GameMatch, GameServerEnv } from '../src/game-match'
import { recordAbandonPenalty } from '../src/abandon-penalties'
import {
  INTERNAL_AUTH_HEADER,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from '../src/protocol'
import {
  applyMatchExperience,
  applyMatchProgression,
  applyMatchStats
} from '../src/progression'
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
const SPECTATOR_USER_ID = '33333333-3333-4333-8333-333333333333'
const PRIVATE_SPECTATOR_USER_ID = '44444444-4444-4444-8444-444444444444'
const SPECTATOR_PRINCIPAL = '0x3333333333333333333333333333333333333333'
const PRIVATE_SPECTATOR_PRINCIPAL = '0x4444444444444444444444444444444444444444'
const PLAYER_1_SPECTATE_CODE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

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

const insertSpectateIdentities = async () => {
  const now = new Date().toISOString()
  const identities = [
    [USER_ID_1, 'Spectated One', 'spectated-one@example.com'],
    [USER_ID_2, 'Spectated Two', 'spectated-two@example.com'],
    [SPECTATOR_USER_ID, 'Public Viewer', 'public-viewer@example.com'],
    [PRIVATE_SPECTATOR_USER_ID, 'Private Viewer', 'private-viewer@example.com']
  ] as const
  await env.AUTH_DB.batch([
    ...identities.map(([userId, name, email]) =>
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?)`
      ).bind(userId, name, email, now, now)
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_settings
         (user_id, name, locale, spectate_code, spectate_code_expires_at,
          created_at, updated_at)
       VALUES (?, 'Spectated.One', 'en', ?, ?, ?, ?)`
    ).bind(
      USER_ID_1,
      PLAYER_1_SPECTATE_CODE,
      new Date(Date.now() + 60_000).toISOString(),
      now,
      now
    )
  ])
}

const insertExperiencePlayers = async () => {
  const now = new Date().toISOString()
  const statements: D1PreparedStatement[] = []
  for (const [index, userId] of [USER_ID_1, USER_ID_2].entries()) {
    statements.push(
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?)`
      ).bind(
        userId,
        `XP Player ${index + 1}`,
        `xp${index + 1}@example.com`,
        now,
        now
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO game_accounts (id, user_id, created_at)
         VALUES (?, ?, ?)`
      ).bind(index + 1, userId, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_profiles
           (user_id, level, xp, next_level_xp, created_at, updated_at)
         VALUES (?, 1, ?, 200, ?, ?)`
      ).bind(userId, index === 0 ? 170 : 0, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_progression
           (user_id, basic_skypass_level, basic_skypass_xp,
            basic_skypass_next_xp, tutorial_completed, created_at, updated_at)
         VALUES (?, 1, ?, 200, 0, ?, ?)`
      ).bind(userId, index === 0 ? 170 : 0, now, now)
    )
    for (const heroId of [1, 2, 3]) {
      statements.push(
        env.AUTH_DB.prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           VALUES (?, 'SW_HERO', ?, 1, 0, 'test', ?, ?)`
        ).bind(userId, heroId, now, now)
      )
    }
  }
  await env.AUTH_DB.batch(statements)
}

const connectAs = async (principal: string, userId: string) => {
  const response = await SELF.fetch(
    `https://game.example/v1/matches/${proposalId}`,
    {
      headers: {
        Upgrade: 'websocket',
        Origin: 'https://opensky.example',
        [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
        [TRUSTED_PRINCIPAL_HEADER]: principal,
        [TRUSTED_USER_ID_HEADER]: userId
      }
    }
  )
  expect(response.status).toBe(101)
  const socket = response.webSocket!
  socket.accept()
  sockets.push(socket)
  return socket
}

const connect = (principal: string) =>
  connectAs(principal, `user-${principal.slice(2, 6)}`)

const spectate = (
  socket: WebSocket,
  spectateToken: string,
  authToken: string | null = null
) => {
  socket.send(
    JSON.stringify({ type: 'spectate_server', spectateToken, authToken })
  )
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
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_experience'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_stats_applied'),
    env.AUTH_DB.prepare('DELETE FROM player_rank_up_rewards'),
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
  it('records fixed-window abandon counts and idempotent proposal markers', async () => {
    const principal = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const releaseVersion = 'penalty-policy-release'
    const now = Date.parse('2026-08-11T12:00:00.000Z')
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `DELETE FROM multiplayer_abandon_penalties_applied
         WHERE proposal_id LIKE 'penalty-policy-%'`
      ),
      env.AUTH_DB.prepare(
        `DELETE FROM player_abandon_penalties
         WHERE principal = ? AND release_version = ?`
      ).bind(principal, releaseVersion)
    ])
    const input = (proposalId: string) => ({
      proposalId,
      principal,
      releaseVersion,
      mode: GameMode.RANKED_CONSTRUCTED
    })
    const config = { windowMs: 10_000, penaltyMs: [0, 2_000, 4_000] }

    expect(
      await recordAbandonPenalty(
        env.AUTH_DB,
        input('penalty-policy-1'),
        config,
        now
      )
    ).toEqual({ applied: true, count: 1, cooldownMs: 0 })
    expect(
      await recordAbandonPenalty(
        env.AUTH_DB,
        input('penalty-policy-1'),
        config,
        now + 1
      )
    ).toEqual({ applied: false, count: 0, cooldownMs: 0 })
    expect(
      await recordAbandonPenalty(
        env.AUTH_DB,
        input('penalty-policy-2'),
        config,
        now + 1_000
      )
    ).toEqual({ applied: true, count: 2, cooldownMs: 2_000 })

    expect(
      await env.AUTH_DB.prepare(
        `SELECT abandon_count FROM player_abandon_penalties
         WHERE principal = ? AND release_version = ?`
      )
        .bind(principal, releaseVersion)
        .first('abandon_count')
    ).toBe(2)
    expect(
      await recordAbandonPenalty(
        env.AUTH_DB,
        input('penalty-policy-3'),
        config,
        now + 10_001
      )
    ).toEqual({ applied: true, count: 1, cooldownMs: 0 })
  })

  it('applies source match XP, level-up, and ranked unlock only once', async () => {
    await insertExperiencePlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    const processedAt = new Date().toISOString()

    const first = await applyMatchExperience(
      env.AUTH_DB,
      proposalId,
      126,
      [GameMode.RANKED_CONSTRUCTED, GameMode.RANKED_CONSTRUCTED],
      0,
      MatchStatus.COMPLETED,
      10,
      processedAt
    )
    expect(first).toMatchObject({
      applied: true,
      rewards: [
        [
          { type: 'EXP', exp: { amount: 30, reason: 'MatchPlayed' } },
          { type: 'EXP', exp: { amount: 20, reason: 'Victory' } },
          {
            type: 'RANK',
            gameMode: 'RANKED_CONSTRUCTED',
            rank: {
              beforeMatch: { rank: 'UNRANKED' },
              afterMatch: { rank: 'WANDERER', rankStage: 'STAGE_I' }
            }
          }
        ],
        [{ type: 'EXP', exp: { amount: 30, reason: 'MatchPlayed' } }]
      ]
    })

    const profiles = await env.AUTH_DB.prepare(
      `SELECT user_id, level, xp FROM player_profiles ORDER BY user_id`
    ).all<{ user_id: string; level: number; xp: number }>()
    expect(profiles.results).toEqual([
      { user_id: USER_ID_1, level: 2, xp: 20 },
      { user_id: USER_ID_2, level: 1, xp: 30 }
    ])
    const ranks = await env.AUTH_DB.prepare(
      `SELECT user_id, game_mode, player_rank, player_rank_stage
       FROM player_account_stats ORDER BY user_id, game_mode`
    ).all<{
      user_id: string
      game_mode: string
      player_rank: string
      player_rank_stage: string
    }>()
    expect(ranks.results).toEqual([
      {
        user_id: USER_ID_1,
        game_mode: 'RANKED_CONSTRUCTED',
        player_rank: 'WANDERER',
        player_rank_stage: 'STAGE_I'
      },
      {
        user_id: USER_ID_1,
        game_mode: 'RANKED_DISCOVERY',
        player_rank: 'WANDERER',
        player_rank_stage: 'STAGE_I'
      }
    ])

    const retry = await applyMatchExperience(
      env.AUTH_DB,
      proposalId,
      126,
      [GameMode.RANKED_CONSTRUCTED, GameMode.RANKED_CONSTRUCTED],
      1,
      MatchStatus.ABANDONED,
      1,
      new Date(Date.now() + 1_000).toISOString()
    )
    expect(retry).toMatchObject({ applied: false, rewards: first.rewards })
    const profilesAfterRetry = await env.AUTH_DB.prepare(
      `SELECT user_id, level, xp FROM player_profiles ORDER BY user_id`
    ).all<{ user_id: string; level: number; xp: number }>()
    expect(profilesAfterRetry.results).toEqual(profiles.results)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_match_experience
         WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('count')
    ).toBe(1)
  })

  it('adds a source rank-up bonus to match XP once per season and stage', async () => {
    await insertExperiencePlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    const processedAt = new Date().toISOString()
    await env.AUTH_DB.batch(
      [USER_ID_1, USER_ID_2].map(userId =>
        env.AUTH_DB.prepare(
          `INSERT INTO player_account_stats
             (user_id, game_mode, season, score, player_rank,
              player_rank_stage, player_rank_state, created_at, updated_at)
           VALUES (?, 'RANKED_CONSTRUCTED', 126, 90, 'WANDERER',
                   'STAGE_I', '[1,1750,350,90]', ?, ?)`
        ).bind(userId, processedAt, processedAt)
      )
    )

    const stats = await applyMatchStats(
      env.AUTH_DB,
      proposalId,
      126,
      0,
      processedAt
    )
    expect(stats.rewards[0]).toEqual([
      expect.objectContaining({
        type: 'EXP',
        exp: expect.objectContaining({ amount: 100, reason: 'RankUp' })
      }),
      expect.objectContaining({
        type: 'RANK',
        rank: expect.objectContaining({
          beforeMatch: expect.objectContaining({ rankStage: 'STAGE_I' }),
          afterMatch: expect.objectContaining({ rankStage: 'STAGE_II' })
        })
      })
    ])

    const experience = await applyMatchExperience(
      env.AUTH_DB,
      proposalId,
      126,
      [GameMode.RANKED_CONSTRUCTED, GameMode.RANKED_CONSTRUCTED],
      0,
      MatchStatus.COMPLETED,
      10,
      processedAt,
      stats.rewards
    )
    expect(experience.rewards[0]).toEqual([
      expect.objectContaining({ exp: expect.objectContaining({ amount: 30 }) }),
      expect.objectContaining({ exp: expect.objectContaining({ amount: 20 }) })
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT level, xp FROM player_profiles WHERE user_id = ?`
      )
        .bind(USER_ID_1)
        .first()
    ).toEqual({ level: 2, xp: 120 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_rank_up_rewards
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED'
           AND season = 126 AND player_rank = 'WANDERER'
           AND player_rank_stage = 'STAGE_II'`
      )
        .bind(USER_ID_1)
        .first('count')
    ).toBe(1)

    expect(
      await applyMatchStats(
        env.AUTH_DB,
        proposalId,
        126,
        1,
        new Date(Date.now() + 1_000).toISOString()
      )
    ).toMatchObject({ applied: false, rewards: stats.rewards })

    const secondProposalId = `${proposalId}-rank-reentry`
    await insertActiveLedgerRow(secondProposalId, [USER_ID_1, USER_ID_2])
    await env.AUTH_DB.prepare(
      `UPDATE player_account_stats
       SET score = 90, player_rank = 'WANDERER',
           player_rank_stage = 'STAGE_I',
           player_rank_state = '[1,1750,350,90]'
       WHERE game_mode = 'RANKED_CONSTRUCTED' AND season = 126`
    ).run()
    const repeatedStage = await applyMatchStats(
      env.AUTH_DB,
      secondProposalId,
      126,
      0,
      new Date(Date.now() + 2_000).toISOString()
    )
    expect(repeatedStage.rewards[0].map(reward => reward.type)).toEqual([
      'RANK'
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_rank_up_rewards
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED'
           AND season = 126 AND player_rank = 'WANDERER'
           AND player_rank_stage = 'STAGE_II'`
      )
        .bind(USER_ID_1)
        .first('count')
    ).toBe(1)
  })

  it('enforces public gateway and request-boundary safeties', async () => {
    const health = await SELF.fetch('https://game.example/health')
    expect(await health.json()).toEqual({
      ok: true,
      component: 'cloud-weasel-game-server',
      protocolVersion: 3
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

  it('persists source-shaped replay initialization and authoritative diffs', async () => {
    await initializeMatch()
    const headers = {
      [INTERNAL_AUTH_HEADER]: 'game-server-test-secret'
    }
    const initialIndex = await stub().fetch(
      'https://match/internal/replay-index',
      { headers }
    )
    expect(await initialIndex.json()).toEqual({ indexes: [0] })
    const initialRecord = await stub().fetch(
      'https://match/internal/replay/0',
      { headers }
    )
    const [init] = (await initialRecord.json()) as Array<{
      type: string
      version: string
      rootProof: string
      players: unknown[]
      secrets: unknown[]
    }>
    expect(init).toMatchObject({
      type: 'init',
      version: 'test-release',
      rootProof: expect.stringMatching(/^0x[0-9a-f]+$/)
    })
    expect(init.players).toHaveLength(2)
    expect(init.secrets).toHaveLength(2)

    const player = await connect(PRINCIPAL_1)
    const joined = collectMessages(player, 2)
    join(player, 0x41)
    await joined
    const updatedIndex = await stub().fetch(
      'https://match/internal/replay-index',
      { headers }
    )
    expect(await updatedIndex.json()).toEqual({ indexes: [0, 1] })
    const diffRecord = await stub().fetch('https://match/internal/replay/1', {
      headers
    })
    expect(await diffRecord.json()).toEqual([
      {
        type: 'gameplay',
        timestamp: expect.any(String),
        message: {
          type: 'gameplay',
          data: [expect.stringMatching(/^0x[0-9a-f]+$/)]
        }
      }
    ])

    const denied = await stub().fetch('https://match/internal/replay/0')
    expect(denied.status).toBe(404)
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

  it('restores public and private spectator state without exposing it to public viewers', async () => {
    await insertSpectateIdentities()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    await initializeMatch()

    const player = await connectAs(PRINCIPAL_1, USER_ID_1)
    const joined = collectMessages(player, 2)
    join(player, 0x31)
    await joined

    const publicViewer = await connectAs(SPECTATOR_PRINCIPAL, SPECTATOR_USER_ID)
    const publicMessages = collectMessages(publicViewer, 2)
    const playerList = nextMessage(player)
    spectate(publicViewer, `identity:${USER_ID_1}`)
    const [publicReconnect, publicList] = await publicMessages
    expect(publicReconnect).toMatchObject({
      type: 'reconnect',
      replayID: 'replay-test-42',
      gitCommit: 'test-release'
    })
    expect(publicList).toEqual({
      type: 'spectators_list',
      spectators: [
        {
          id: 0,
          address: `identity:${SPECTATOR_USER_ID}`,
          canSeeHand: false
        }
      ]
    })
    expect(await playerList).toEqual(publicList)

    const privateViewer = await connectAs(
      PRIVATE_SPECTATOR_PRINCIPAL,
      PRIVATE_SPECTATOR_USER_ID
    )
    const privateMessages = collectMessages(privateViewer, 2)
    spectate(privateViewer, `identity:${USER_ID_1}.${PLAYER_1_SPECTATE_CODE}`)
    const [privateReconnect, privateList] = await privateMessages
    expect(privateReconnect).toMatchObject({ type: 'reconnect' })
    expect(privateReconnect.store).not.toBe(publicReconnect.store)
    expect(privateList).toEqual({
      type: 'spectators_list',
      spectators: expect.arrayContaining([
        {
          id: 0,
          address: `identity:${SPECTATOR_USER_ID}`,
          canSeeHand: false
        },
        {
          id: 0,
          address: `identity:${PRIVATE_SPECTATOR_USER_ID}`,
          canSeeHand: true
        }
      ])
    })
    expect(privateList.spectators).toHaveLength(2)
  })

  it('isolates spectator protocol errors and disconnects from player abandon state', async () => {
    await insertSpectateIdentities()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    await initializeMatch()

    const viewer = await connectAs(SPECTATOR_PRINCIPAL, SPECTATOR_USER_ID)
    const beforeJoinError = nextMessage(viewer)
    viewer.send(JSON.stringify({ type: 'gameplay', data: ['0x00'] }))
    expect(await beforeJoinError).toMatchObject({
      type: 'error',
      message: 'Error: spectate_server is required first'
    })

    const connected = await connectAs(SPECTATOR_PRINCIPAL, SPECTATOR_USER_ID)
    const spectatorMessages = collectMessages(connected, 2)
    spectate(connected, PRINCIPAL_1)
    await spectatorMessages
    const playerActionError = nextMessage(connected)
    connected.send(JSON.stringify({ type: 'gameplay', data: ['0x00'] }))
    expect(await playerActionError).toMatchObject({
      type: 'error',
      message: 'Error: spectator cannot send player actions'
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    const status = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    const body = (await status.json()) as {
      players: Record<string, { abandonAtMs?: number }>
    }
    expect(body.players[PRINCIPAL_1].abandonAtMs).toBeUndefined()
    expect(body.players[PRINCIPAL_2].abandonAtMs).toBeUndefined()
  })

  it('caps pending and joined spectators at the source limit', async () => {
    await initializeMatch()
    for (let index = 0; index < 50; index += 1) {
      const principal = `0x${BigInt(index + 100)
        .toString(16)
        .padStart(40, '0')}`
      await connectAs(principal, `spectator-${index}`)
    }

    const overflow = await SELF.fetch(
      `https://game.example/v1/matches/${proposalId}`,
      {
        headers: {
          Upgrade: 'websocket',
          Origin: 'https://opensky.example',
          [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
          [TRUSTED_PRINCIPAL_HEADER]:
            '0xffffffffffffffffffffffffffffffffffffffff',
          [TRUSTED_USER_ID_HEADER]: 'spectator-overflow'
        }
      }
    )
    expect(overflow.status).toBe(429)
    expect(await overflow.text()).toBe('Too many spectators')
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
    expect(JSON.parse(ledger!.result_json)).toMatchObject({
      winner: 1,
      status: 'ABANDONED'
    })

    const abandonPenalty = await env.AUTH_DB.prepare(
      `SELECT abandon_count, cooldown_expires_at
       FROM player_abandon_penalties
       WHERE principal = ? AND release_version = 'test-release'`
    )
      .bind(PRINCIPAL_1)
      .first<{ abandon_count: number; cooldown_expires_at: string | null }>()
    expect(abandonPenalty).toEqual({
      abandon_count: 1,
      // The first checked-in test penalty is zero, matching Redis setex's
      // source no-op behavior.
      cooldown_expires_at: null
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_abandon_penalties_applied
         WHERE proposal_id = ? AND principal = ?`
      )
        .bind(proposalId, PRINCIPAL_1)
        .first('count')
    ).toBe(1)

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
        player_rank_state: '[1,1882.1627313643605,350,43]'
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
