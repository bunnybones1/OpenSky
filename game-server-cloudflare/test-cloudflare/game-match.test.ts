import {
  env,
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
  SELF
} from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GameMode, MatchStatus } from '@opensky/proto'
import { WEBSOCKET_FORCED_CLOSE_CODE } from '@opensky/shared/constants'
import { gameStateParse } from '@opensky/shared/gameStateSerializer'
import type { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'
import * as StateBindings from '@skyweaver/state-browser-sys'
import type { PlayerSecret, SkyWeaver } from '@skyweaver/state-metadata'

import {
  archiveReplayRecords,
  botDifficultyForParticipant,
  GameMatch,
  GameServerEnv
} from '../src/game-match'
import { readAuthoritativeMatchDecks } from '../src/authoritative-decks'
import { hexToBytes } from '../src/encoding'
import { recordAbandonPenalty } from '../src/abandon-penalties'
import {
  INTERNAL_AUTH_HEADER,
  TRUSTED_ANONYMOUS_SPECTATOR_HEADER,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from '../src/protocol'
import {
  applyMatchExperience,
  applyMatchProgression,
  applyMatchStats,
  applyWarmUpProgress
} from '../src/progression'
import { initializeStateWasm } from '../src/state-runtime'
import {
  createMatchFixture,
  PLAYER_SESSION_ID_1,
  PRINCIPAL_1,
  PRINCIPAL_2,
  PROPOSAL_ID
} from './fixture'

const runtimeEnv = env as unknown as GameServerEnv
const analyticsBucket = runtimeEnv.GAME_ANALYTICS!
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
const ANONYMOUS_SPECTATOR_ID = 'anonymous-55555555-5555-4555-8555-555555555555'

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

const insertSpectatedPlayers = async () => {
  const now = new Date().toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, 'Spectated One', 'spectated-one@example.com', NULL, ?, ?)`
    ).bind(USER_ID_1, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, 'Spectated Two', 'spectated-two@example.com', NULL, ?, ?)`
    ).bind(USER_ID_2, now, now)
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

const connectAs = async (
  principal: string,
  userId: string,
  extraHeaders: Record<string, string> = {}
) => {
  const response = await SELF.fetch(
    `https://game.example/v1/matches/${proposalId}`,
    {
      headers: {
        Upgrade: 'websocket',
        Origin: 'https://opensky.example',
        [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
        [TRUSTED_PRINCIPAL_HEADER]: principal,
        [TRUSTED_USER_ID_HEADER]: userId,
        ...extraHeaders
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

const join = (socket: WebSocket, subkeyByte: number, loadingProgress = 1) => {
  socket.send(
    JSON.stringify({
      type: 'join_server',
      authToken: 'legacy-token-is-ignored',
      loadingProgress,
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
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_deck_ranks_applied'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_rank_wins'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_ranks'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_progression'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_warmups_applied'),
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
  it('uses asymmetric source-bot difficulty only for guarded readiness matches', () => {
    const readiness = createMatchFixture({
      botPlayer1: true,
      botPlayer2: true,
      gameMode: GameMode.CONQUEST_CONSTRUCTED,
      proposalId: 'readiness-drill-match-difficulty-contract'
    })
    expect(
      botDifficultyForParticipant(readiness.proposalId, readiness.match, 0)
    ).toBe(1)
    expect(
      botDifficultyForParticipant(readiness.proposalId, readiness.match, 1)
    ).toBe(0)

    const ordinary = createMatchFixture({
      botPlayer1: true,
      botPlayer2: true,
      proposalId: 'ordinary-bot-difficulty-contract'
    })
    expect(
      botDifficultyForParticipant(ordinary.proposalId, ordinary.match, 0)
    ).toBe(0.34)
    expect(
      botDifficultyForParticipant(ordinary.proposalId, ordinary.match, 1)
    ).toBe(0.34)

    const wrongMode = createMatchFixture({
      botPlayer1: true,
      botPlayer2: true,
      proposalId: 'readiness-drill-match-wrong-mode'
    })
    expect(
      botDifficultyForParticipant(wrongMode.proposalId, wrongMode.match, 0)
    ).toBe(0.34)
    const mixed = createMatchFixture({
      botPlayer1: true,
      botPlayer2: false,
      gameMode: GameMode.CONQUEST_CONSTRUCTED,
      proposalId: 'readiness-drill-match-mixed-participants'
    })
    expect(botDifficultyForParticipant(mixed.proposalId, mixed.match, 0)).toBe(
      0.34
    )
  })

  it('advances the source practice-win counter at most once per match', async () => {
    await insertExperiencePlayers()
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_settings
           (user_id, name, locale, warm_ups, created_at, updated_at)
         VALUES (?, 'Warmup.One', 'en', 2, ?, ?)`
      ).bind(USER_ID_1, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_settings
           (user_id, name, locale, warm_ups, created_at, updated_at)
         VALUES (?, 'Warmup.Two', 'en', 1, ?, ?)`
      ).bind(USER_ID_2, now, now)
    ])
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])

    expect(
      await applyWarmUpProgress(
        env.AUTH_DB,
        proposalId,
        [GameMode.PRACTICE_PVP, GameMode.PRACTICE_PVP],
        0,
        MatchStatus.COMPLETED,
        now
      )
    ).toMatchObject({
      applied: true,
      creditedPlayer: 0,
      userId: USER_ID_1,
      before: 2,
      after: 3
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT warm_ups FROM player_account_settings WHERE user_id = ?`
      )
        .bind(USER_ID_1)
        .first('warm_ups')
    ).toBe(3)

    expect(
      await applyWarmUpProgress(
        env.AUTH_DB,
        proposalId,
        [GameMode.PRACTICE_PVP, GameMode.PRACTICE_PVP],
        1,
        MatchStatus.COMPLETED,
        new Date(Date.now() + 1_000).toISOString()
      )
    ).toMatchObject({
      applied: false,
      creditedPlayer: 0,
      before: 2,
      after: 3
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT warm_ups FROM player_account_settings WHERE user_id = ?`
      )
        .bind(USER_ID_2)
        .first('warm_ups')
    ).toBe(1)

    const draw = `${proposalId}-draw`
    await insertActiveLedgerRow(draw, [USER_ID_1, USER_ID_2])
    expect(
      await applyWarmUpProgress(
        env.AUTH_DB,
        draw,
        [GameMode.WARM_UP, GameMode.WARM_UP],
        undefined,
        MatchStatus.COMPLETED,
        now
      )
    ).toMatchObject({
      applied: true,
      creditedPlayer: 0,
      before: 3,
      after: 3
    })
  })

  it('only counts completed human wins in practice-bot matches', async () => {
    await insertExperiencePlayers()
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_account_settings
         (user_id, name, locale, warm_ups, created_at, updated_at)
       VALUES (?, 'Practice.Bot', 'en', 0, ?, ?)`
    )
      .bind(USER_ID_1, now, now)
      .run()

    const botWon = `${proposalId}-bot-won`
    await insertActiveLedgerRow(botWon, [USER_ID_1, null])
    expect(
      await applyWarmUpProgress(
        env.AUTH_DB,
        botWon,
        [GameMode.PRACTICE_BOT, GameMode.PRACTICE_BOT],
        1,
        MatchStatus.COMPLETED,
        now
      )
    ).toMatchObject({ applied: false })

    const abandoned = `${proposalId}-abandoned`
    await insertActiveLedgerRow(abandoned, [USER_ID_1, null])
    expect(
      await applyWarmUpProgress(
        env.AUTH_DB,
        abandoned,
        [GameMode.PRACTICE_BOT, GameMode.PRACTICE_BOT],
        0,
        MatchStatus.ABANDONED,
        now
      )
    ).toMatchObject({ applied: false })

    const humanWon = `${proposalId}-human-won`
    await insertActiveLedgerRow(humanWon, [USER_ID_1, null])
    expect(
      await applyWarmUpProgress(
        env.AUTH_DB,
        humanWon,
        [GameMode.PRACTICE_BOT, GameMode.PRACTICE_BOT],
        0,
        MatchStatus.COMPLETED,
        now
      )
    ).toMatchObject({ applied: true, before: 0, after: 1 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT warm_ups FROM player_account_settings WHERE user_id = ?`
      )
        .bind(USER_ID_1)
        .first('warm_ups')
    ).toBe(1)
  })

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
    await env.AUTH_DB.prepare(
      `INSERT INTO player_invites
         (invitee_user_id, inviter_user_id, created_at)
       VALUES (?, ?, ?)`
    )
      .bind(USER_ID_1, USER_ID_2, processedAt)
      .run()

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
          {
            type: 'EXP',
            exp: { amount: 30, reason: 'MatchPlayed', currentLevel: 0 }
          },
          {
            type: 'EXP',
            exp: { amount: 20, reason: 'Victory', currentLevel: 0 }
          },
          {
            type: 'RANK',
            gameMode: 'RANKED_CONSTRUCTED',
            rank: {
              beforeMatch: { rank: 'UNRANKED' },
              afterMatch: { rank: 'WANDERER', rankStage: 'STAGE_I' }
            }
          }
        ],
        [
          {
            type: 'EXP',
            exp: { amount: 30, reason: 'MatchPlayed', currentLevel: 0 }
          }
        ]
      ]
    })

    const profiles = await env.AUTH_DB.prepare(
      `SELECT user_id, level, xp FROM player_profiles ORDER BY user_id`
    ).all<{ user_id: string; level: number; xp: number }>()
    expect(profiles.results).toEqual([
      { user_id: USER_ID_1, level: 2, xp: 20 },
      { user_id: USER_ID_2, level: 1, xp: 30 }
    ])
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT user_id, initial_account_level, achieved_account_level
           FROM player_skypass_season_stats WHERE season = 126
           ORDER BY user_id`
        ).all()
      ).results
    ).toEqual([
      {
        user_id: USER_ID_1,
        initial_account_level: 0,
        achieved_account_level: 1
      },
      {
        user_id: USER_ID_2,
        initial_account_level: 0,
        achieved_account_level: 0
      }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT levels FROM player_friend_points
         WHERE invitee_user_id = ? AND inviter_user_id = ? AND season = 126`
      )
        .bind(USER_ID_1, USER_ID_2)
        .first('levels')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
      )
        .bind(USER_ID_2)
        .first('balance')
    ).toBe(1)
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
        `SELECT levels FROM player_friend_points
         WHERE invitee_user_id = ? AND inviter_user_id = ? AND season = 126`
      )
        .bind(USER_ID_1, USER_ID_2)
        .first('levels')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
      )
        .bind(USER_ID_2)
        .first('balance')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_match_experience
         WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('count')
    ).toBe(1)
  })

  it('serializes XP from distinct matches ending for the same players', async () => {
    await insertExperiencePlayers()
    const secondProposalId = `${proposalId}-simultaneous`
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    await insertActiveLedgerRow(secondProposalId, [USER_ID_1, USER_ID_2])
    const processedAt = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_invites
         (invitee_user_id, inviter_user_id, created_at)
       VALUES (?, ?, ?)`
    )
      .bind(USER_ID_1, USER_ID_2, processedAt)
      .run()

    const settlements = await Promise.all(
      [proposalId, secondProposalId].map(id =>
        applyMatchExperience(
          env.AUTH_DB,
          id,
          126,
          [GameMode.RANKED_CONSTRUCTED, GameMode.RANKED_CONSTRUCTED],
          0,
          MatchStatus.COMPLETED,
          10,
          processedAt
        )
      )
    )

    expect(settlements.every(settlement => settlement.applied)).toBe(true)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT level, xp FROM player_profiles WHERE user_id = ?`
      )
        .bind(USER_ID_1)
        .first()
    ).toEqual({ level: 2, xp: 70 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT level, xp FROM player_profiles WHERE user_id = ?`
      )
        .bind(USER_ID_2)
        .first()
    ).toEqual({ level: 1, xp: 60 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT levels FROM player_friend_points
         WHERE invitee_user_id = ? AND inviter_user_id = ? AND season = 126`
      )
        .bind(USER_ID_1, USER_ID_2)
        .first('levels')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT balance FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS' AND token_id = 0`
      )
        .bind(USER_ID_2)
        .first('balance')
    ).toBe(1)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_match_experience_players
         WHERE proposal_id IN (?, ?)`
      )
        .bind(proposalId, secondProposalId)
        .first('count')
    ).toBe(4)
  })

  it('coalesces simultaneous retries of one match into one XP grant', async () => {
    await insertExperiencePlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    const input = () =>
      applyMatchExperience(
        env.AUTH_DB,
        proposalId,
        126,
        [GameMode.RANKED_CONSTRUCTED, GameMode.RANKED_CONSTRUCTED],
        0,
        MatchStatus.COMPLETED,
        10,
        new Date().toISOString()
      )

    const settlements = await Promise.all([input(), input()])
    expect(settlements.map(settlement => settlement.applied).sort()).toEqual([
      false,
      true
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT level, xp FROM player_profiles WHERE user_id = ?`
      )
        .bind(USER_ID_1)
        .first()
    ).toEqual({ level: 2, xp: 20 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_match_experience_players WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('count')
    ).toBe(2)
  })

  it('rolls back match XP when durable receipt completion fails', async () => {
    await insertExperiencePlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER test_match_experience_failure
       BEFORE INSERT ON multiplayer_match_experience
       BEGIN
         SELECT RAISE(ABORT, 'injected match experience failure');
       END`
    ).run()

    await expect(
      applyMatchExperience(
        env.AUTH_DB,
        proposalId,
        126,
        [GameMode.RANKED_CONSTRUCTED, GameMode.RANKED_CONSTRUCTED],
        0,
        MatchStatus.COMPLETED,
        10,
        new Date().toISOString()
      )
    ).rejects.toThrow('injected match experience failure')
    await env.AUTH_DB.prepare(
      'DROP TRIGGER test_match_experience_failure'
    ).run()

    expect(
      await env.AUTH_DB.prepare(
        `SELECT level, xp FROM player_profiles WHERE user_id = ?`
      )
        .bind(USER_ID_1)
        .first()
    ).toEqual({ level: 1, xp: 170 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_match_experience_players WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('count')
    ).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_match_experience WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('count')
    ).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_skypass_season_stats
         WHERE season = 126`
      ).first('count')
    ).toBe(0)
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
      MatchStatus.COMPLETED,
      processedAt
    )
    expect(stats.rewards[0]).toEqual([
      expect.objectContaining({
        type: 'EXP',
        exp: expect.objectContaining({
          amount: 100,
          reason: 'RankUp',
          currentLevel: 0
        })
      }),
      expect.objectContaining({
        type: 'RANK',
        rank: expect.objectContaining({
          beforeMatch: expect.objectContaining({
            rankStage: 'STAGE_I',
            rankPosition: 1
          }),
          afterMatch: expect.objectContaining({
            rankStage: 'STAGE_II',
            rankPosition: 1
          })
        })
      })
    ])
    expect(stats.rewards[1]).toEqual([
      expect.objectContaining({
        type: 'RANK',
        rank: expect.objectContaining({
          beforeMatch: expect.objectContaining({ rankPosition: 2 }),
          afterMatch: expect.objectContaining({ rankPosition: 2 })
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
        MatchStatus.COMPLETED,
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
      MatchStatus.COMPLETED,
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

  it('projects source Master positions and promotes the top 100 once', async () => {
    await insertExperiencePlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    const earlier = '2026-08-13T20:00:00.000Z'
    const beforeMatch = '2026-08-13T21:00:00.000Z'
    const processedAt = '2026-08-13T22:00:00.000Z'
    const statements: D1PreparedStatement[] = [
      ...[USER_ID_1, USER_ID_2].map(userId =>
        env.AUTH_DB.prepare(
          `INSERT INTO player_account_stats
             (user_id, game_mode, season, score, player_rank,
              player_rank_stage, player_rank_state, created_at, updated_at)
           VALUES (?, 'RANKED_CONSTRUCTED', 126, 1201, 'MASTER',
                   'STAGE_NONE', '[-1,1750,350,1201]', ?, ?)`
        ).bind(userId, beforeMatch, beforeMatch)
      )
    ]
    for (let index = 0; index < 100; index += 1) {
      const userId = `grandweaver-${index}`
      statements.push(
        env.AUTH_DB.prepare(
          `INSERT INTO users
             (id, display_name, primary_email, avatar_url, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?)`
        ).bind(
          userId,
          `Grandweaver ${index}`,
          `grandweaver-${index}@example.com`,
          earlier,
          earlier
        ),
        env.AUTH_DB.prepare(
          `INSERT INTO game_accounts (id, user_id, created_at)
           VALUES (?, ?, ?)`
        ).bind(index + 100, userId, earlier),
        env.AUTH_DB.prepare(
          `INSERT INTO player_account_stats
             (user_id, game_mode, season, score, player_rank,
              player_rank_stage, player_rank_state, created_at, updated_at)
           VALUES (?, 'RANKED_CONSTRUCTED', 126, 1201, 'GRANDWEAVER',
                   'STAGE_NONE', '[-1,1750,350,1201]', ?, ?)`
        ).bind(userId, earlier, earlier)
      )
    }
    const bannedUserId = 'banned-grandweaver'
    statements.push(
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, avatar_url, created_at, updated_at)
         VALUES (?, 'Banned Grandweaver', 'banned-grandweaver@example.com',
                 NULL, ?, ?)`
      ).bind(bannedUserId, earlier, earlier),
      env.AUTH_DB.prepare(
        `INSERT INTO game_accounts (id, user_id, created_at)
         VALUES (999, ?, ?)`
      ).bind(bannedUserId, earlier),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_settings
           (user_id, name, locale, account_status, created_at, updated_at)
         VALUES (?, 'Banned.Grandweaver', 'en', 'BANNED', ?, ?)`
      ).bind(bannedUserId, earlier, earlier),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_stats
           (user_id, game_mode, season, score, player_rank,
            player_rank_stage, player_rank_state, created_at, updated_at)
         VALUES (?, 'RANKED_CONSTRUCTED', 126, 9999, 'GRANDWEAVER',
                 'STAGE_NONE', '[-1,1750,350,9999]', ?, ?)`
      ).bind(bannedUserId, earlier, earlier)
    )
    for (let index = 0; index < statements.length; index += 75) {
      await env.AUTH_DB.batch(statements.slice(index, index + 75))
    }

    await env.AUTH_DB.prepare(
      `CREATE TRIGGER test_grandweaver_receipt_failure
       BEFORE INSERT ON multiplayer_match_stats_applied
       BEGIN SELECT RAISE(FAIL, 'injected grandweaver receipt failure'); END`
    ).run()
    await expect(
      applyMatchStats(
        env.AUTH_DB,
        proposalId,
        126,
        0,
        MatchStatus.COMPLETED,
        processedAt
      )
    ).rejects.toThrow('injected grandweaver receipt failure')
    await env.AUTH_DB.prepare(
      'DROP TRIGGER test_grandweaver_receipt_failure'
    ).run()
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT user_id, score, player_rank FROM player_account_stats
           WHERE user_id IN (?, ?) ORDER BY user_id`
        )
          .bind(USER_ID_1, USER_ID_2)
          .all()
      ).results
    ).toEqual([
      { user_id: USER_ID_1, score: 1201, player_rank: 'MASTER' },
      { user_id: USER_ID_2, score: 1201, player_rank: 'MASTER' }
    ])

    const result = await applyMatchStats(
      env.AUTH_DB,
      proposalId,
      126,
      0,
      MatchStatus.COMPLETED,
      processedAt
    )
    const winnerRank = result.rewards[0].find(
      reward => reward.type === 'RANK'
    )!.rank!
    const loserRank = result.rewards[1].find(
      reward => reward.type === 'RANK'
    )!.rank!
    expect(winnerRank.beforeMatch).toMatchObject({
      rank: 'MASTER',
      rankPosition: 1,
      scoreAbove: 1201,
      scoreBelow: 0
    })
    expect(winnerRank.afterMatch).toMatchObject({
      rank: 'GRANDWEAVER',
      rankPosition: 1,
      scoreAbove: 0,
      scoreBelow: 1201
    })
    expect(loserRank.beforeMatch).toMatchObject({
      rank: 'MASTER',
      rankPosition: 2,
      scoreAbove: 1201,
      scoreBelow: 0
    })
    expect(loserRank.afterMatch).toMatchObject({
      rank: 'MASTER',
      rankPosition: 2,
      scoreAbove: 1201,
      scoreBelow: 0
    })

    const activeRanks = await env.AUTH_DB.prepare(
      `SELECT stats.player_rank, COUNT(*) AS count
       FROM player_account_stats stats
       LEFT JOIN player_account_settings settings
         ON settings.user_id = stats.user_id
       WHERE stats.game_mode = 'RANKED_CONSTRUCTED' AND stats.season = 126
         AND COALESCE(settings.account_status, 'ACTIVE') NOT IN (
           'BANNED', 'SUSPENDED', 'DELETED'
         )
       GROUP BY stats.player_rank ORDER BY stats.player_rank`
    ).all()
    expect(activeRanks.results).toEqual([
      { player_rank: 'GRANDWEAVER', count: 100 },
      { player_rank: 'MASTER', count: 2 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT player_rank FROM player_account_stats WHERE user_id = ?`
      )
        .bind(USER_ID_1)
        .first('player_rank')
    ).toBe('GRANDWEAVER')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT player_rank FROM player_account_stats WHERE user_id = ?`
      )
        .bind(bannedUserId)
        .first('player_rank')
    ).toBe('GRANDWEAVER')

    expect(
      await applyMatchStats(
        env.AUTH_DB,
        proposalId,
        126,
        1,
        MatchStatus.FORFEITED,
        '2026-08-13T23:00:00.000Z'
      )
    ).toMatchObject({ applied: false, rewards: result.rewards })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_account_stats stats
         LEFT JOIN player_account_settings settings
           ON settings.user_id = stats.user_id
         WHERE stats.game_mode = 'RANKED_CONSTRUCTED' AND stats.season = 126
           AND stats.player_rank = 'GRANDWEAVER'
           AND COALESCE(settings.account_status, 'ACTIVE') NOT IN (
             'BANNED', 'SUSPENDED', 'DELETED'
           )`
      ).first('count')
    ).toBe(100)
  })

  it('preserves the source unpositioned after-rank reward on draws', async () => {
    await insertExperiencePlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    const beforeMatch = '2026-08-13T21:00:00.000Z'
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_stats
           (user_id, game_mode, season, score, player_rank,
            player_rank_stage, player_rank_state, created_at, updated_at)
         VALUES (?, 'RANKED_CONSTRUCTED', 126, 1201, 'MASTER',
                 'STAGE_NONE', '[-1,1750,350,1201]', ?, ?)`
      ).bind(USER_ID_1, beforeMatch, beforeMatch),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_stats
           (user_id, game_mode, season, score, player_rank,
            player_rank_stage, player_rank_state, created_at, updated_at)
         VALUES (?, 'RANKED_CONSTRUCTED', 126, 1201, 'GRANDWEAVER',
                 'STAGE_NONE', '[-1,1750,350,1201]', ?, ?)`
      ).bind(USER_ID_2, beforeMatch, beforeMatch)
    ])

    const result = await applyMatchStats(
      env.AUTH_DB,
      proposalId,
      126,
      undefined,
      MatchStatus.COMPLETED,
      '2026-08-13T22:00:00.000Z'
    )
    const player1Rank = result.rewards[0].find(
      reward => reward.type === 'RANK'
    )!.rank!
    const player2Rank = result.rewards[1].find(
      reward => reward.type === 'RANK'
    )!.rank!
    expect(player1Rank.beforeMatch).toMatchObject({
      rank: 'MASTER',
      rankPosition: 1,
      scoreBelow: 1201
    })
    expect(player2Rank.beforeMatch).toMatchObject({
      rank: 'GRANDWEAVER',
      rankPosition: 1,
      scoreAbove: 1201
    })
    expect(player1Rank.afterMatch).toMatchObject({
      rank: 'MASTER',
      rankPosition: 0,
      scoreAbove: 0,
      scoreBelow: 0
    })
    expect(player2Rank.afterMatch).toMatchObject({
      rank: 'MASTER',
      rankPosition: 0,
      scoreAbove: 0,
      scoreBelow: 0
    })
    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT user_id, player_rank, tie_count
           FROM player_account_stats ORDER BY user_id`
        ).all()
      ).results
    ).toEqual([
      { user_id: USER_ID_1, player_rank: 'MASTER', tie_count: 1 },
      { user_id: USER_ID_2, player_rank: 'MASTER', tie_count: 1 }
    ])
  })

  it('persists only the ranked side of a mixed practice-PVP match', async () => {
    await insertExperiencePlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    const processedAt = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE multiplayer_matches
         SET player1_mode = 'PRACTICE_PVP',
             player2_mode = 'RANKED_CONSTRUCTED'
         WHERE proposal_id = ?`
      ).bind(proposalId),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_stats
           (user_id, game_mode, season, score, player_rank,
            player_rank_stage, player_rank_state, created_at, updated_at)
         VALUES (?, 'RANKED_CONSTRUCTED', 126, 0, 'WANDERER',
                 'STAGE_I', '[-1,1750,350,0]', ?, ?)`
      ).bind(USER_ID_2, processedAt, processedAt)
    ])

    const result = await applyMatchStats(
      env.AUTH_DB,
      proposalId,
      126,
      0,
      MatchStatus.COMPLETED,
      processedAt
    )
    expect(result.rewards[0]).toEqual([])
    expect(result.rewards[1]).toEqual([
      expect.objectContaining({
        type: 'RANK',
        gameMode: GameMode.RANKED_CONSTRUCTED
      })
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_account_stats
         WHERE user_id = ? AND game_mode = 'PRACTICE_PVP'`
      )
        .bind(USER_ID_1)
        .first('count')
    ).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT win_count, loss_count FROM player_account_stats
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED' AND season = 126`
      )
        .bind(USER_ID_2)
        .first()
    ).toEqual({ win_count: 0, loss_count: 1 })
  })

  it('tracks source loser abandon and forfeit counters exactly once', async () => {
    await insertExperiencePlayers()
    const processedAt = new Date().toISOString()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])

    expect(
      await applyMatchStats(
        env.AUTH_DB,
        proposalId,
        126,
        1,
        MatchStatus.ABANDONED,
        processedAt
      )
    ).toMatchObject({ applied: true })
    // A conflicting alarm retry must return the stored settlement without
    // reclassifying or incrementing the original loser.
    expect(
      await applyMatchStats(
        env.AUTH_DB,
        proposalId,
        126,
        0,
        MatchStatus.FORFEITED,
        new Date(Date.parse(processedAt) + 1_000).toISOString()
      )
    ).toMatchObject({ applied: false })

    const forfeitProposalId = `${proposalId}-forfeit`
    await insertActiveLedgerRow(forfeitProposalId, [USER_ID_1, USER_ID_2])
    await applyMatchStats(
      env.AUTH_DB,
      forfeitProposalId,
      126,
      0,
      MatchStatus.FORFEITED,
      new Date(Date.parse(processedAt) + 2_000).toISOString()
    )

    expect(
      (
        await env.AUTH_DB.prepare(
          `SELECT user_id, win_count, loss_count, abandon_count, forfeit_count
           FROM player_account_stats
           WHERE game_mode = 'RANKED_CONSTRUCTED' AND season = 126
           ORDER BY user_id`
        ).all()
      ).results
    ).toEqual([
      {
        user_id: USER_ID_1,
        win_count: 1,
        loss_count: 1,
        abandon_count: 1,
        forfeit_count: 0
      },
      {
        user_id: USER_ID_2,
        win_count: 1,
        loss_count: 1,
        abandon_count: 0,
        forfeit_count: 1
      }
    ])
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

  it('normalizes source UUID forms and rejects malformed player sessions', async () => {
    const alternate = fixture()
    alternate.match.player1.playerSessionID =
      'URN:UUID:FCEA164C-7449-449C-9718-27B98BD18C64'
    const response = await createMatch(alternate)
    expect(response.status).toBe(200)
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const metadata = await state.storage.get<{
          match: MatchmakerStartMatchMessage
        }>('match:metadata')
        expect(metadata?.match.player1.playerSessionID).toBe(
          PLAYER_SESSION_ID_1
        )
      }
    )

    proposalId = 'proposal-malformed-player-session'
    const malformed = fixture()
    malformed.match.player1.playerSessionID = 'player-session-1'
    const rejected = await createMatch(malformed)
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toEqual({
      error: 'invalid player session ID'
    })
  })

  it('repairs interrupted initialization on an identical create retry', async () => {
    await initializeMatch()
    const originalDeadlines = await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers = await state.storage.get<{
          loadExpiryAtMs?: number
          commitRevealAtMs?: number
        }>('match:timers')
        expect(timers?.loadExpiryAtMs).toEqual(expect.any(Number))
        expect(timers?.commitRevealAtMs).toEqual(expect.any(Number))
        await state.storage.deleteAlarm()
        return timers!
      }
    )

    const alarmRetry = await createMatch()
    expect(alarmRetry.status).toBe(200)
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers = await state.storage.get<{
          loadExpiryAtMs?: number
          commitRevealAtMs?: number
        }>('match:timers')
        expect(timers).toEqual(originalDeadlines)
        expect(await state.storage.getAlarm()).toBe(
          originalDeadlines.loadExpiryAtMs
        )

        // Represents failure after the immutable match/snapshot batch but
        // before afterStateChange could persist its first deadline.
        await state.storage.put('match:timers', {})
        await state.storage.deleteAlarm()
      }
    )

    const stateRetry = await createMatch()
    expect(stateRetry.status).toBe(200)
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers = await state.storage.get<{
          loadExpiryAtMs?: number
          commitRevealAtMs?: number
        }>('match:timers')
        expect(timers?.loadExpiryAtMs).toEqual(expect.any(Number))
        expect(timers?.commitRevealAtMs).toEqual(expect.any(Number))
        expect(await state.storage.getAlarm()).toBe(timers!.loadExpiryAtMs)
      }
    )
  })

  it('ends an unjoined match without rewards when neither player loads', async () => {
    await insertActiveLedgerRow()
    await initializeMatch()
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          await state.storage.get<Record<string, unknown>>('match:timers')
        await state.storage.put('match:timers', {
          ...timers,
          loadExpiryAtMs: Date.now() - 1
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    expect(await runDurableObjectAlarm(stub())).toBe(true)

    const status = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(await status.json()).toMatchObject({
      ended: true,
      started: false,
      timers: {}
    })
    const row = await env.AUTH_DB.prepare(
      `SELECT status, winner_player, result_json
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(proposalId)
      .first<{
        status: string
        winner_player: number | null
        result_json: string
      }>()
    expect(row).toMatchObject({ status: 'ended', winner_player: null })
    expect(JSON.parse(row!.result_json)).toEqual({
      reason: 'players_did_not_load'
    })
    const recent = await stub().fetch(
      'https://match/internal/recent-match-info',
      {
        headers: {
          [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
          [TRUSTED_PRINCIPAL_HEADER]: PRINCIPAL_1
        }
      }
    )
    expect(recent.status).toBe(404)
    await recent.text()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_match_progression
         WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('count')
    ).toBe(0)
  })

  it('abandons the no-show when exactly one player finishes loading', async () => {
    await insertQuestPlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    await initializeMatch()
    const first = await connectAs(PRINCIPAL_1, USER_ID_1)
    const joined = collectMessages(first, 2)
    join(first, 0x31)
    await joined

    // Finished-loading is a source one-way transition even if a stale lower
    // progress update arrives later.
    first.send(
      JSON.stringify({ type: 'player_loading_progress', progress: 0.25 })
    )
    await expect
      .poll(async () => {
        const response = await stub().fetch('https://match/internal/status', {
          headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
        })
        const body = await response.json<{
          players: Record<
            string,
            { loadingProgress: number; finishedLoadingAssets: boolean }
          >
        }>()
        return body.players[PRINCIPAL_1]
      })
      .toEqual({
        connected: true,
        joined: true,
        loadingProgress: 1,
        finishedLoadingAssets: true,
        opponentMuted: false,
        lastEmoteTimestamps: [0, 0, 0]
      })

    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          await state.storage.get<Record<string, unknown>>('match:timers')
        await state.storage.put('match:timers', {
          ...timers,
          loadExpiryAtMs: Date.now() - 1
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    expect(await runDurableObjectAlarm(stub())).toBe(true)
    const status = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(await status.json()).toMatchObject({
      ended: true,
      state: {
        statusType: 'GameOver',
        winner: 0
      }
    })
    const row = await env.AUTH_DB.prepare(
      `SELECT status, winner_player, result_json
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(proposalId)
      .first<{
        status: string
        winner_player: number
        result_json: string
      }>()
    expect(row).toMatchObject({ status: 'ended', winner_player: 0 })
    expect(JSON.parse(row!.result_json)).toMatchObject({
      winner: 0,
      status: MatchStatus.ABANDONED
    })
  })

  it('persists source-shaped replay initialization and authoritative diffs', async () => {
    await initializeMatch(
      createMatchFixture({
        proposalId,
        gameMode: GameMode.PRACTICE_PVP
      })
    )
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
    const [init] = gameStateParse(await initialRecord.text()) as Array<{
      type: string
      version: string
      rootProof: string
      players: unknown[]
      secrets: Array<[PlayerSecret<SkyWeaver>, number[]]>
    }>
    expect(init).toMatchObject({
      type: 'init',
      version: 'test-release',
      gameMode: GameMode.PRACTICE_PVP,
      rootProof: expect.stringMatching(/^0x[0-9a-f]+$/)
    })
    expect(init.players).toHaveLength(2)
    expect(init.secrets).toHaveLength(2)
    expect(init.secrets[0][0].instances).toBeInstanceOf(Map)
    expect(init.secrets[0][0].secret.cardRarities).toBeInstanceOf(Map)
    expect(init.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          initDeckString: expect.stringMatching(/^SWx[A-Z]{3}02/)
        })
      ])
    )

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
    const diffLog = gameStateParse(await diffRecord.text()) as Array<{
      type: string
      timestamp: string
      message: { type: string; data: string[] }
    }>
    expect(diffLog).toEqual([
      {
        type: 'gameplay',
        timestamp: expect.any(String),
        message: {
          type: 'gameplay',
          data: [expect.stringMatching(/^0x[0-9a-f]+$/)]
        }
      }
    ])

    // Exercise the same boundary as the browser replay worker. JSON must
    // restore secret Maps before the real WASM constructor sees them, and
    // every authoritative diff must decode with the same generated enums.
    initializeStateWasm()
    const replay = new StateBindings.WasmMatch(
      undefined,
      hexToBytes(init.rootProof),
      init.secrets.map(([secret, randomSeed]) => [
        secret,
        Uint8Array.from(randomSeed)
      ]),
      true,
      () => undefined,
      () => undefined,
      () => undefined,
      () => undefined,
      (length: number) => Array.from({ length }, () => 0)
    )
    try {
      for (const diff of diffLog.flatMap(record => record.message.data)) {
        expect(() => replay.raw_apply(hexToBytes(diff))).not.toThrow()
      }
      expect(replay.serialize(3).byteLength).toBeGreaterThan(0)
    } finally {
      replay.free()
    }

    const denied = await stub().fetch('https://match/internal/replay/0')
    expect(denied.status).toBe(404)
  })

  it('archives replay records and writes the manifest last', async () => {
    const archived = await archiveReplayRecords(analyticsBucket, {
      proposalId: 'archive-test',
      replayId: 'archive-replay',
      releaseVersion: 'test-release',
      matchId: 42,
      endedAt: '2026-08-12T00:00:00.000Z',
      records: [
        { index: 1, body: '[{"type":"gameplay"}]' },
        { index: 0, body: '[{"type":"init"}]' }
      ]
    })
    expect(archived).toMatchObject({
      archivePrefix: 'replays/test-release/archive-test/',
      replayRecordCount: 2
    })
    const manifest = await analyticsBucket.get(
      `${archived.archivePrefix}manifest.json`
    )
    expect(await manifest?.json()).toMatchObject({
      proposalId: 'archive-test',
      replayId: 'archive-replay',
      replayRecordCount: 2,
      replayBytes: archived.replayBytes
    })
    expect(
      await analyticsBucket.get(`${archived.archivePrefix}000000.json`)
    ).not.toBeNull()
    expect(
      await analyticsBucket.get(`${archived.archivePrefix}000001.json`)
    ).not.toBeNull()
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

  it('keeps the joined player until a replacement completes join_server', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const firstJoined = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoined

    const pendingReplacement = await connect(PRINCIPAL_1)
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(first.readyState).toBe(WebSocket.OPEN)
    const timeSync = nextMessage(first)
    first.send(JSON.stringify({ type: 'timesync', clientTime: 777 }))
    expect(await timeSync).toMatchObject({
      type: 'timesync',
      clientTime: 777
    })

    pendingReplacement.close(1000, 'replacement abandoned before join')
    await new Promise(resolve => setTimeout(resolve, 50))
    const beforeHandoff = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    const beforeHandoffBody = await beforeHandoff.json<{
      players: Record<
        string,
        { connected: boolean; joined: boolean; abandonAtMs?: number }
      >
    }>()
    expect(beforeHandoffBody.players[PRINCIPAL_1]).toMatchObject({
      connected: true,
      joined: true
    })
    expect(beforeHandoffBody.players[PRINCIPAL_1]).not.toHaveProperty(
      'abandonAtMs'
    )

    const replacement = await connect(PRINCIPAL_1)
    const displaced = nextMessage(first)
    const replacementJoined = collectMessages(replacement, 2)
    join(replacement, 0x31)
    expect(await displaced).toEqual({
      type: 'error',
      level: 'server',
      message: 'You connected in another session, please play there.'
    })
    expect(await replacementJoined).toEqual([
      expect.objectContaining({ type: 'reconnect' }),
      expect.objectContaining({ type: 'opponent_loading_progress' })
    ])
    const displacedTimeSync = nextMessage(first)
    first.send(JSON.stringify({ type: 'timesync', clientTime: 778 }))
    expect(await displacedTimeSync).toMatchObject({
      type: 'timesync',
      clientTime: 778
    })
    expect(first.readyState).toBe(WebSocket.OPEN)
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        expect(
          state
            .getWebSockets(PRINCIPAL_1)
            .map(
              socket =>
                (socket.deserializeAttachment() as { joined: boolean }).joined
            )
            .sort()
        ).toEqual([false, true])
      }
    )
    const displacedGameplay = nextMessage(first)
    const displacedClosed = new Promise<CloseEvent>(resolve =>
      first.addEventListener('close', resolve, { once: true })
    )
    first.send(JSON.stringify({ type: 'gameplay', data: ['0x00'] }))
    expect(await displacedGameplay).toEqual({
      type: 'error',
      level: 'user',
      message: 'You have no game in progress!'
    })
    await expect(displacedClosed).resolves.toMatchObject({
      code: 1005,
      reason: ''
    })
    await new Promise(resolve => setTimeout(resolve, 50))
    const afterHandoff = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    const afterHandoffBody = await afterHandoff.json<{
      players: Record<
        string,
        { connected: boolean; joined: boolean; abandonAtMs?: number }
      >
    }>()
    expect(afterHandoffBody.players[PRINCIPAL_1]).toMatchObject({
      connected: true,
      joined: true
    })
    expect(afterHandoffBody.players[PRINCIPAL_1]).not.toHaveProperty(
      'abandonAtMs'
    )
  })

  it('does not let an unjoined replacement suppress player abandonment', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const second = await connect(PRINCIPAL_2)
    const firstJoined = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoined
    const secondJoined = collectMessages(second, 3)
    join(second, 0x32)
    await secondJoined

    const pendingReplacement = await connect(PRINCIPAL_1)
    const disconnected = nextMessage(second)
    first.close(1000, 'real player disconnected')
    expect(await disconnected).toEqual({ type: 'opponent_disconnected' })
    await new Promise(resolve => setTimeout(resolve, 50))

    const status = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    const body = await status.json<{
      players: Record<
        string,
        { connected: boolean; joined: boolean; abandonAtMs?: number }
      >
    }>()
    expect(body.players[PRINCIPAL_1]).toMatchObject({
      connected: false,
      joined: true,
      abandonAtMs: expect.any(Number)
    })

    pendingReplacement.close(1000, 'test complete')
  })

  it('preserves a player-owned commit-reveal deadline on disconnect', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const second = await connect(PRINCIPAL_2)
    const firstJoined = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoined
    const secondJoined = collectMessages(second, 3)
    join(second, 0x32)
    await secondJoined

    const deadline = Date.now() + 30_000
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          (await state.storage.get<Record<string, unknown>>('match:timers')) ??
          {}
        await state.storage.put('match:timers', {
          ...timers,
          commitRevealAtMs: deadline
        })
        await state.storage.setAlarm(deadline)
      }
    )

    const disconnected = nextMessage(second)
    first.close(1000, 'disconnect during player reveal')
    expect(await disconnected).toEqual({ type: 'opponent_disconnected' })
    await new Promise(resolve => setTimeout(resolve, 50))

    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const [players, timers] = await Promise.all([
          state.storage.get<Record<string, { abandonAtMs?: number }>>(
            'match:players'
          ),
          state.storage.get<{ commitRevealAtMs?: number }>('match:timers')
        ])
        expect(players?.[PRINCIPAL_1].abandonAtMs).toEqual(expect.any(Number))
        expect(players![PRINCIPAL_1].abandonAtMs).toBeGreaterThan(deadline)
        expect(timers?.commitRevealAtMs).toBe(deadline)
        expect(await state.storage.getAlarm()).toBe(deadline)
      }
    )
  })

  it('rejects player stickers outside the accepted match equipment', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const second = await connect(PRINCIPAL_2)
    const firstJoined = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoined
    const secondJoined = collectMessages(second, 3)
    join(second, 0x32)
    await secondJoined

    const rejected = nextMessage(first)
    first.send(JSON.stringify({ type: 'emote', sticker: 999 }))
    expect(await rejected).toMatchObject({
      type: 'error',
      message: 'Error: player used unowned sticker'
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

  it('restores source anonymous public spectators without account capabilities', async () => {
    await insertSpectatedPlayers()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    await initializeMatch()

    const playerCollision = await SELF.fetch(
      `https://game.example/v1/matches/${proposalId}`,
      {
        headers: {
          Upgrade: 'websocket',
          Origin: 'https://opensky.example',
          [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
          [TRUSTED_PRINCIPAL_HEADER]: PRINCIPAL_1,
          [TRUSTED_USER_ID_HEADER]: ANONYMOUS_SPECTATOR_ID,
          [TRUSTED_ANONYMOUS_SPECTATOR_HEADER]: '1'
        }
      }
    )
    expect(playerCollision.status).toBe(401)
    expect(await playerCollision.text()).toBe('Not authorized for match')

    const first = await connectAs(PRINCIPAL_1, USER_ID_1)
    const firstJoined = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoined
    const second = await connectAs(PRINCIPAL_2, USER_ID_2)
    const secondJoined = collectMessages(second, 3)
    join(second, 0x32)
    await secondJoined

    const viewer = await connectAs(
      SPECTATOR_PRINCIPAL,
      ANONYMOUS_SPECTATOR_ID,
      { [TRUSTED_ANONYMOUS_SPECTATOR_HEADER]: '1' }
    )
    const spectatorMessages = collectMessages(viewer, 2)
    spectate(viewer, `identity:${USER_ID_1}`)
    const [reconnect, list] = await spectatorMessages
    expect(reconnect).toMatchObject({
      type: 'reconnect',
      replayID: 'replay-test-42'
    })
    expect(list).toEqual({
      type: 'spectators_list',
      spectators: [
        {
          id: 0,
          address: ANONYMOUS_SPECTATOR_ID,
          canSeeHand: false
        }
      ]
    })

    const stickerError = nextMessage(viewer)
    viewer.send(JSON.stringify({ type: 'emote', sticker: 1 }))
    expect(await stickerError).toMatchObject({
      type: 'error',
      message: 'Error: player used unowned sticker'
    })
  })

  it('replaces only the prior joined spectator with the source close frame', async () => {
    await insertSpectateIdentities()
    await insertActiveLedgerRow(proposalId, [USER_ID_1, USER_ID_2])
    await initializeMatch()

    const player = await connectAs(PRINCIPAL_1, USER_ID_1)
    const playerJoined = collectMessages(player, 2)
    join(player, 0x31)
    await playerJoined

    const firstViewer = await connectAs(SPECTATOR_PRINCIPAL, SPECTATOR_USER_ID)
    const firstMessages = collectMessages(firstViewer, 2)
    spectate(firstViewer, `identity:${USER_ID_1}`)
    await firstMessages

    const firstDisplaced = nextMessage(firstViewer)
    const firstClosed = new Promise<CloseEvent>(resolve =>
      firstViewer.addEventListener('close', resolve, { once: true })
    )
    const replacement = await connectAs(SPECTATOR_PRINCIPAL, SPECTATOR_USER_ID)
    const replacementMessages = collectMessages(replacement, 2)
    spectate(replacement, `identity:${USER_ID_1}`)
    expect(await firstDisplaced).toEqual({
      type: 'error',
      level: 'user',
      message: 'connected in another location'
    })
    expect(await replacementMessages).toEqual([
      expect.objectContaining({ type: 'reconnect' }),
      {
        type: 'spectators_list',
        spectators: [
          {
            id: 0,
            address: `identity:${SPECTATOR_USER_ID}`,
            canSeeHand: false
          }
        ]
      }
    ])
    await expect(firstClosed).resolves.toMatchObject({
      code: 1005,
      reason: ''
    })
  })

  it('rejects malformed anonymous identities at the public Worker boundary', async () => {
    const response = await SELF.fetch(
      `https://game.example/v1/matches/${proposalId}`,
      {
        headers: {
          Upgrade: 'websocket',
          Origin: 'https://opensky.example',
          [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
          [TRUSTED_PRINCIPAL_HEADER]: SPECTATOR_PRINCIPAL,
          [TRUSTED_USER_ID_HEADER]: 'anonymous-not-a-uuid',
          [TRUSTED_ANONYMOUS_SPECTATOR_HEADER]: '1'
        }
      }
    )
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'invalid anonymous spectator'
    })
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

    first.send(JSON.stringify({ type: 'player_loading_progress', progress: 1 }))

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

  it('does not count forged pre-join progress as a loaded player', async () => {
    await insertActiveLedgerRow()
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    first.send(JSON.stringify({ type: 'player_loading_progress', progress: 1 }))
    await expect
      .poll(async () =>
        runInDurableObject(
          stub() as DurableObjectStub,
          async (_instance, state) => {
            const players =
              await state.storage.get<
                Record<string, { finishedLoadingAssets: boolean }>
              >('match:players')
            return players?.[PRINCIPAL_1].finishedLoadingAssets
          }
        )
      )
      .toBe(false)
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          await state.storage.get<Record<string, unknown>>('match:timers')
        await state.storage.put('match:timers', {
          ...timers,
          loadExpiryAtMs: Date.now() - 1
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    expect(await runDurableObjectAlarm(stub())).toBe(true)
    const row = await env.AUTH_DB.prepare(
      `SELECT winner_player, result_json FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(proposalId)
      .first<{ winner_player: number | null; result_json: string }>()
    expect(row?.winner_player).toBeNull()
    expect(JSON.parse(row!.result_json)).toEqual({
      reason: 'players_did_not_load'
    })
  })

  it('does not extend durable timers when a loaded player repeats progress', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const second = await connect(PRINCIPAL_2)
    const firstJoined = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoined
    const secondJoined = collectMessages(second, 3)
    join(second, 0x32)
    await secondJoined

    const deadline = Date.now() + 30_000
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          (await state.storage.get<Record<string, unknown>>('match:timers')) ??
          {}
        await state.storage.put('match:timers', {
          ...timers,
          commitRevealAtMs: deadline
        })
        await state.storage.setAlarm(deadline)
      }
    )

    const relayed = collectMessages(first, 2)
    first.send(JSON.stringify({ type: 'player_loading_progress', progress: 1 }))
    expect(await relayed).toEqual([
      expect.objectContaining({
        type: 'opponent_loading_progress',
        progress: 1
      }),
      {
        type: 'opponent_loading_progress',
        progress: 1,
        matchAbandonTime: -1
      }
    ])

    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers = await state.storage.get<{ commitRevealAtMs?: number }>(
          'match:timers'
        )
        expect(timers?.commitRevealAtMs).toBe(deadline)
        expect(await state.storage.getAlarm()).toBe(deadline)
      }
    )
  })

  it('keeps fractional loading progress out of authoritative timers', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const joined = collectMessages(first, 2)
    join(first, 0x31, 0.25)
    await joined

    const deadline = Date.now() + 30_000
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          (await state.storage.get<Record<string, unknown>>('match:timers')) ??
          {}
        await state.storage.put('match:timers', {
          ...timers,
          commitRevealAtMs: deadline
        })
        await state.storage.setAlarm(deadline)
      }
    )

    const relayed = nextMessage(first)
    first.send(
      JSON.stringify({ type: 'player_loading_progress', progress: 0.5 })
    )
    expect(await relayed).toMatchObject({
      type: 'opponent_loading_progress',
      progress: 0
    })

    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const [players, timers] = await Promise.all([
          state.storage.get<
            Record<
              string,
              { loadingProgress: number; finishedLoadingAssets: boolean }
            >
          >('match:players'),
          state.storage.get<{ commitRevealAtMs?: number }>('match:timers')
        ])
        expect(players?.[PRINCIPAL_1]).toMatchObject({
          loadingProgress: 0.5,
          finishedLoadingAssets: false
        })
        expect(timers?.commitRevealAtMs).toBe(deadline)
        expect(await state.storage.getAlarm()).toBe(deadline)
      }
    )
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

    const turnDeadline = Date.now() + 30_000
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          (await state.storage.get<Record<string, unknown>>('match:timers')) ??
          {}
        await state.storage.put('match:timers', {
          ...timers,
          turnAtMs: turnDeadline
        })
        await state.storage.setAlarm(turnDeadline)
      }
    )

    const disconnected = nextMessage(second)
    first.close(1000, 'test disconnect')
    expect(await disconnected).toEqual({ type: 'opponent_disconnected' })
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const players =
          await state.storage.get<Record<string, { abandonAtMs?: number }>>(
            'match:players'
          )
        const timers = await state.storage.get<{ turnAtMs?: number }>(
          'match:timers'
        )
        expect(players?.[PRINCIPAL_1].abandonAtMs).toEqual(expect.any(Number))
        expect(players![PRINCIPAL_1].abandonAtMs).toBeGreaterThan(turnDeadline)
        expect(timers?.turnAtMs).toBe(turnDeadline)
        expect(await state.storage.getAlarm()).toBe(turnDeadline)
        players![PRINCIPAL_1].abandonAtMs = Date.now() - 1
        await state.storage.put('match:players', players)
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER test_match_completion_publication_failure
       BEFORE UPDATE OF status ON multiplayer_matches
       WHEN NEW.status = 'ended'
       BEGIN
         SELECT RAISE(ABORT, 'injected match publication failure');
       END`
    ).run()
    const terminalGameplay = nextMessage(second)
    expect(await runDurableObjectAlarm(stub())).toBe(true)
    expect(await terminalGameplay).toMatchObject({ type: 'gameplay' })

    const pendingStatus = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(await pendingStatus.json()).toMatchObject({
      ended: true,
      completionRecorded: false,
      state: { statusType: 'GameOver', winner: 1 }
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM multiplayer_matches WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('status')
    ).toBe('active')
    const pendingRecent = await stub().fetch(
      'https://match/internal/recent-match-info',
      {
        headers: {
          [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
          [TRUSTED_PRINCIPAL_HEADER]: PRINCIPAL_2
        }
      }
    )
    expect(pendingRecent.status).toBe(404)
    await pendingRecent.text()

    await env.AUTH_DB.prepare(
      'DROP TRIGGER test_match_completion_publication_failure'
    ).run()
    const completedClose = new Promise<CloseEvent>(resolve =>
      second.addEventListener('close', resolve, { once: true })
    )
    const completionMessages = collectMessages(second, 2)
    expect(await runDurableObjectAlarm(stub())).toBe(true)
    const completed = await completionMessages
    expect(completed.map(message => message.type)).toEqual([
      'rewards',
      'match_ended'
    ])
    expect(completed[0]).toMatchObject({ type: 'rewards' })
    await expect(completedClose).resolves.toMatchObject({
      code: WEBSOCKET_FORCED_CLOSE_CODE,
      reason: ''
    })
    const endedStatus = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(await endedStatus.json()).toMatchObject({
      ended: true,
      completionRecorded: true,
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
    const realDecks = await readAuthoritativeMatchDecks(env.AUTH_DB, proposalId)
    expect(realDecks.map(deck => deck.cardIds.length)).toEqual([30, 30])
    expect(fixture().match.player1.privateSeed.cards).toEqual([])
    expect(fixture().match.player2.privateSeed.cards).toEqual([])
    await runInDurableObject(
      stub() as DurableObjectStub,
      async (_instance, state) => {
        const metadata = await state.storage.get<{
          realDeckStrings?: [string, string]
        }>('match:metadata')
        expect(metadata?.realDeckStrings).toEqual(
          realDecks.map(deck => deck.deckString)
        )
      }
    )
    const storedResult = JSON.parse(ledger!.result_json)
    expect(storedResult).toMatchObject({
      winner: 1,
      status: 'ABANDONED',
      player1Moves: 0,
      player2Moves: 0,
      rewards: [
        [expect.objectContaining({ type: 'RANK' })],
        [expect.objectContaining({ type: 'RANK' })]
      ]
    })
    for (const reward of storedResult.rewards.flat()) {
      expect(Object.keys(reward).sort()).toEqual(
        [
          'accountID',
          'type',
          'gameMode',
          'rank',
          'exp',
          'card',
          'hero',
          'heroSkin',
          'deck',
          'conquestV2TreasureProgress',
          'stickerPoints'
        ].sort()
      )
      expect(reward).toMatchObject({
        rank: expect.any(Object),
        exp: null,
        card: null,
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null,
        stickerPoints: null
      })
    }

    await evictDurableObject(stub())
    const reconnected = await connectAs(PRINCIPAL_2, USER_ID_2)
    const recentMessages = collectMessages(reconnected, 2)
    join(reconnected, 0x32)
    const [recentReconnect, recentRewards] = await recentMessages
    expect(recentReconnect).toMatchObject({
      type: 'reconnect',
      isGameStart: false,
      turnExpiryTime: Number.MAX_SAFE_INTEGER,
      replayID: 'replay-test-42',
      gitCommit: 'test-release'
    })
    expect(recentReconnect.store).toMatch(/^0x[0-9a-f]+$/)
    expect(recentRewards).toEqual({
      type: 'rewards',
      data: storedResult.rewards[1]
    })
    expect(reconnected.readyState).toBe(WebSocket.OPEN)

    const originalRecentContinuation = nextMessage(reconnected)
    const parallelRecent = await connectAs(PRINCIPAL_2, USER_ID_2)
    const parallelRecentMessages = collectMessages(parallelRecent, 2)
    join(parallelRecent, 0x32)
    expect(await parallelRecentMessages).toEqual([
      expect.objectContaining({
        type: 'reconnect',
        store: recentReconnect.store
      }),
      recentRewards
    ])
    expect(parallelRecent.readyState).toBe(WebSocket.OPEN)
    reconnected.send(
      JSON.stringify({ type: 'timesync', clientTime: 1_234_567 })
    )
    expect(await originalRecentContinuation).toMatchObject({
      type: 'timesync',
      clientTime: 1_234_567,
      serverTime: expect.any(Number)
    })
    expect(reconnected.readyState).toBe(WebSocket.OPEN)

    const recentInfoResponse = await stub().fetch(
      'https://match/internal/recent-match-info',
      {
        headers: {
          [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
          [TRUSTED_PRINCIPAL_HEADER]: PRINCIPAL_2
        }
      }
    )
    expect(recentInfoResponse.status).toBe(200)
    expect(await recentInfoResponse.json()).toEqual({
      type: 'recent_match_info',
      playerID: PRINCIPAL_2,
      gameMode: GameMode.RANKED_CONSTRUCTED,
      matchID: 42,
      replayID: 'replay-test-42',
      accounts: [
        fixture().match.player1.account,
        fixture().match.player2.account
      ],
      store: recentReconnect.store,
      rewards: storedResult.rewards[1]
    })
    const privateInfo = await stub().fetch(
      'https://match/internal/recent-match-info',
      {
        headers: {
          [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
          [TRUSTED_PRINCIPAL_HEADER]: SPECTATOR_PRINCIPAL
        }
      }
    )
    expect(privateInfo.status).toBe(404)
    await privateInfo.text()

    const detachedGameplay = nextMessage(parallelRecent)
    const detachedClosed = new Promise<CloseEvent>(resolve =>
      parallelRecent.addEventListener('close', resolve, { once: true })
    )
    parallelRecent.send(JSON.stringify({ type: 'gameplay', data: ['0x00'] }))
    expect(await detachedGameplay).toEqual({
      type: 'error',
      level: 'user',
      message: 'You have no game in progress!'
    })
    await expect(detachedClosed).resolves.toMatchObject({
      code: 1005,
      reason: ''
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
      `SELECT user_id, win_count, loss_count, tie_count, forfeit_count,
              abandon_count, win_streak, loss_streak, season, score,
              player_rank, player_rank_stage, player_rank_state
       FROM player_account_stats
       WHERE game_mode = 'RANKED_CONSTRUCTED'
       ORDER BY user_id`
    ).all<{
      user_id: string
      win_count: number
      loss_count: number
      tie_count: number
      forfeit_count: number
      abandon_count: number
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
        forfeit_count: 0,
        abandon_count: 1,
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
        forfeit_count: 0,
        abandon_count: 0,
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
        MatchStatus.FORFEITED,
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

  it('drives both server-controlled participants without a player socket', async () => {
    const ordinaryBotOnly = await createMatch(
      createMatchFixture({
        botPlayer1: true,
        botPlayer2: true,
        proposalId: 'proposal-ordinary-dual-bot'
      })
    )
    expect(ordinaryBotOnly.status).toBe(400)
    expect(await ordinaryBotOnly.json()).toEqual({
      error: 'bot-only matches are reserved for Conquest readiness'
    })
    const nonConquestDrill = await createMatch(
      createMatchFixture({
        botPlayer1: true,
        botPlayer2: true,
        proposalId: 'readiness-drill-match-practice'
      })
    )
    expect(nonConquestDrill.status).toBe(400)
    expect(await nonConquestDrill.json()).toEqual({
      error: 'bot-only matches are reserved for Conquest readiness'
    })

    const botProposalId = 'readiness-drill-match-dual-bot-test'
    const dualBotStub = () =>
      runtimeEnv.GAME_MATCHES.getByName(`match:${botProposalId}`)
    const created = await createMatch(
      createMatchFixture({
        botPlayer1: true,
        botPlayer2: true,
        gameMode: GameMode.CONQUEST_CONSTRUCTED,
        proposalId: botProposalId
      })
    )
    expect(created.status).toBe(200)

    type InternalStatus = {
      ended: boolean
      players: Record<string, { finishedLoadingAssets: boolean }>
      timers: {
        botAtMs?: number
        commitRevealAtMs?: number
        botActionCounts?: [number, number]
      }
      state: {
        hasState: boolean
        lastActionPlayer?: 0 | 1
        playersDoneCardSelection?: [boolean, boolean]
      }
    }
    const status = async () => {
      const response = await dualBotStub().fetch(
        'https://match/internal/status',
        { headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' } }
      )
      return response.json<InternalStatus>()
    }
    expect(Object.values((await status()).players)).toEqual([
      expect.objectContaining({ finishedLoadingAssets: true }),
      expect.objectContaining({ finishedLoadingAssets: true })
    ])

    let current = await status()
    for (
      let attempt = 0;
      attempt < 6 && !current.state.hasState;
      attempt += 1
    ) {
      await runInDurableObject(
        dualBotStub() as DurableObjectStub,
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
      expect(await runDurableObjectAlarm(dualBotStub())).toBe(true)
      current = await status()
    }
    expect(current.state.hasState).toBe(true)
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (
        current.state.playersDoneCardSelection?.every(done => done) ||
        current.ended
      ) {
        break
      }
      await runInDurableObject(
        dualBotStub() as DurableObjectStub,
        async (_instance, state) => {
          const timers =
            (await state.storage.get<Record<string, unknown>>(
              'match:timers'
            )) ?? {}
          const dueTimer = current.state.hasState
            ? 'botAtMs'
            : 'commitRevealAtMs'
          expect(timers[dueTimer]).toEqual(expect.any(Number))
          await state.storage.put('match:timers', {
            ...timers,
            [dueTimer]: Date.now() - 1
          })
          await state.storage.setAlarm(Date.now() + 60_000)
        }
      )
      expect(await runDurableObjectAlarm(dualBotStub())).toBe(true)
      current = await status()
    }
    expect(current.state.playersDoneCardSelection).toEqual([true, true])
    expect(current.timers.botActionCounts?.[0]).toBeGreaterThan(0)
    expect(current.timers.botActionCounts?.[1]).toBeGreaterThan(0)
    expect(current.ended).toBe(false)
  })
})
