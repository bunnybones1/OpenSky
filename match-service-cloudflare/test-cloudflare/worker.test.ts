import { GameMode } from '@opensky/proto'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { env, SELF } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'

import { hexToBytes } from '../src/encoding'
import { BOT_PLACEHOLDER, INTERNAL_AUTH_HEADER } from '../src/protocol'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const PRINCIPAL = '0x1111111111111111111111111111111111111111'
const PROPOSAL_ID = 'proposal-practice-1'
const STARTER_CARD_IDS = [
  6, 68, 136, 137, 138, 139, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150,
  151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164
]

const privateSeed = (cards: number[] = STARTER_CARD_IDS) => ({
  player: Array(20).fill(0xff),
  subkey: Array(20).fill(0x31),
  signature: Array(65).fill(0),
  prisms: ['str'],
  heroAbility: '25000',
  cards: cards.map(String),
  randomSeed: Array(16).fill(7),
  cardRarities: {}
})

const dispatch = (cards: number[] = STARTER_CARD_IDS) => ({
  proposalId: PROPOSAL_ID,
  createdAtMs: Date.now(),
  participants: [
    {
      player: {
        address: PRINCIPAL,
        mode: GameMode.PRACTICE_BOT,
        playerSessionId: 'player-session-1',
        clientVersionHash: 'release-1'
      },
      request: {
        type: 'find_match',
        privateSeed: privateSeed(cards),
        sessionID: '',
        mode: GameMode.PRACTICE_BOT,
        versionHash: 'release-1',
        playerSessionID: 'player-session-1'
      },
      identity: {
        principal: PRINCIPAL,
        userId: USER_ID,
        displayName: 'Cloud Player'
      }
    },
    {
      player: {
        address: BOT_PLACEHOLDER,
        mode: GameMode.PRACTICE_BOT,
        playerSessionId: '',
        clientVersionHash: 'release-1'
      }
    }
  ]
})

const create = (body = dispatch(), secret = 'match-service-test-secret') =>
  SELF.fetch('https://match-service.example/internal/matches', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': body.proposalId,
      [INTERNAL_AUTH_HEADER]: secret
    },
    body: JSON.stringify(body)
  })

const profile = async (
  mode: GameMode,
  principal: string,
  userId = USER_ID,
  secret = 'match-service-test-secret',
  versionHash = 'release-1'
) =>
  SELF.fetch(
    'https://match-service.example/internal/matchmaker/player-profile',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [INTERNAL_AUTH_HEADER]: secret
      },
      body: JSON.stringify({ userId, principal, mode, versionHash })
    }
  )

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM multiplayer_abandon_penalties_applied'),
    env.AUTH_DB.prepare('DELETE FROM player_abandon_penalties'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
    env.AUTH_DB.prepare('DELETE FROM player_account_stats'),
    env.AUTH_DB.prepare('DELETE FROM game_accounts'),
    env.AUTH_DB.prepare('DELETE FROM player_card_unlocks'),
    env.AUTH_DB.prepare('DELETE FROM player_quests'),
    env.AUTH_DB.prepare('DELETE FROM player_decks'),
    env.AUTH_DB.prepare('DELETE FROM player_progression'),
    env.AUTH_DB.prepare('DELETE FROM player_profiles'),
    env.AUTH_DB.prepare('DELETE FROM auth_identities'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
  const now = new Date().toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, 'Cloud Player', 'player@example.com', NULL, ?, ?)`
    ).bind(USER_ID, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_stats
         (user_id, game_mode, season, score, player_rank, loss_streak,
          player_rank_stage, created_at, updated_at)
       VALUES (?, 'RANKED_CONSTRUCTED', 126, 1700, 'EXPERT', 1,
               'STAGE_II', ?, ?)`
    ).bind(USER_ID, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_profiles
         (user_id, level, xp, next_level_xp, created_at, updated_at)
       VALUES (?, 1, 0, 200, ?, ?)`
    ).bind(USER_ID, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_progression
         (user_id, basic_skypass_level, basic_skypass_xp,
          basic_skypass_next_xp, tutorial_completed, created_at, updated_at)
       VALUES (?, 1, 0, 200, 0, ?, ?)`
    ).bind(USER_ID, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_quests
         (user_id, quest_key, title, description, progress, target,
          reward_xp, status, created_at, updated_at, quest_type, epic_type,
          epic_index, epic_length, position, periodicity, is_rerollable,
          is_new, active)
       VALUES (?, 'starter-deck', 'Strengthweaver', '', 0, 1, 100,
               'active', ?, ?, 'Strengthweaver', 'starter1_test', 1, 3, 1,
               'DAILY', 0, 1, 1)`
    ).bind(USER_ID, now, now),
    ...STARTER_CARD_IDS.map(cardId =>
      env.AUTH_DB.prepare(
        `INSERT INTO player_card_unlocks
           (user_id, card_id, card_name, prism, unlock_source, unlocked_at,
            item_type, is_new)
         VALUES (?, ?, ?, 'strength', 'starter-deck', ?, 'SW_BASE_CARDS', 0)`
      ).bind(USER_ID, cardId, `Card ${cardId}`, now)
    )
  ])
})

describe('Cloud Weasel accepted-match service', () => {
  it('resolves source matchmaking data and an existing match from D1', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_profiles SET level = 2, xp = 0 WHERE user_id = ?`
      ).bind(USER_ID),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, version, player1_principal,
            player2_principal, player1_user_id, player2_user_id,
            match_payload_json, server_address, status, created_at, updated_at,
            winner_player, result_json, ended_at)
         VALUES ('profile-ended', 'profile-ended-replay', 'RANKED_CONSTRUCTED',
                 'release-1', ?, ?, ?, NULL, '{}',
                 'wss://match.example/ended', 'ended', ?, ?, 1, '{}', ?)`
      ).bind(principal, PRINCIPAL, USER_ID, now, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, version, player1_principal,
            player2_principal, player1_user_id, player2_user_id,
            match_payload_json, server_address, status, created_at, updated_at)
         VALUES ('profile-active', 'profile-active-replay', 'PRACTICE_BOT',
                 'release-1', ?, ?, ?, NULL, '{}',
                 'wss://match.example/active', 'active', ?, ?)`
      ).bind(principal, BOT_PLACEHOLDER, USER_ID, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_abandon_penalties
           (principal, release_version, abandon_count, window_expires_at,
            cooldown_expires_at, updated_at)
         VALUES (?, 'release-1', 2, ?, ?, ?)`
      ).bind(
        principal,
        new Date(Date.now() + 60_000).toISOString(),
        new Date(Date.now() + 10_000).toISOString(),
        now
      )
    ])

    const response = await profile(GameMode.RANKED_CONSTRUCTED, principal)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      gameModeEnabled: true,
      profile: {
        score: 1600,
        rank: 'EXPERT',
        rankedEligible: true,
        lostLastMatch: true,
        cards: expect.arrayContaining([[6, 'base']]),
        recentMatches: [{ opponentId: PRINCIPAL }],
        abandonPenaltyMs: expect.any(Number),
        activeMatch: {
          mode: GameMode.PRACTICE_BOT,
          serverAddress: 'wss://match.example/active'
        }
      }
    })
    const body = await profile(GameMode.RANKED_CONSTRUCTED, principal).then(
      result => result.json<{ profile: { abandonPenaltyMs: number } }>()
    )
    expect(body.profile.abandonPenaltyMs).toBeGreaterThan(0)
    expect(body.profile.abandonPenaltyMs).toBeLessThanOrEqual(10_000)
  })

  it('disables unfinished conquest queues and rejects forged identity bindings', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const disabled = await profile(GameMode.CONQUEST_CONSTRUCTED, principal)
    expect(await disabled.json()).toMatchObject({ gameModeEnabled: false })

    const forged = await profile(GameMode.PRACTICE_BOT, PRINCIPAL)
    expect(forged.status).toBe(403)
    expect(await forged.json()).toEqual({
      error: 'identity principal mismatch'
    })
  })

  it('enforces ranked experience on the server while leaving practice open', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    await env.AUTH_DB.prepare(
      `UPDATE player_profiles SET level = 1, xp = 0 WHERE user_id = ?`
    )
      .bind(USER_ID)
      .run()

    const ranked = await profile(GameMode.RANKED_CONSTRUCTED, principal)
    expect(await ranked.json()).toMatchObject({
      gameModeEnabled: false,
      profile: { rankedEligible: false }
    })

    const practice = await profile(GameMode.PRACTICE_PVP, principal)
    expect(await practice.json()).toMatchObject({
      gameModeEnabled: true,
      profile: { rankedEligible: false }
    })
  })

  it('builds an authoritative source-compatible practice match idempotently', async () => {
    const first = await create()
    expect(first.status).toBe(200)
    const firstBody = (await first.json()) as {
      matchId: number
      serverAddress: string
    }
    expect(firstBody.serverAddress).toBe(
      `wss://opensky.example/api/game/matches/${PROPOSAL_ID}`
    )

    const row = await env.AUTH_DB.prepare(
      `SELECT match_payload_json, status FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(PROPOSAL_ID)
      .first<{ match_payload_json: string; status: string }>()
    const payload = JSON.parse(row!.match_payload_json)
    expect(row!.status).toBe('active')
    expect(payload.releaseVersion).toBe('release-1')
    expect(payload.match).toMatchObject({
      type: 'start_match',
      matchID: firstBody.matchId,
      player1: {
        gameMode: GameMode.PRACTICE_BOT,
        account: { address: PRINCIPAL, name: 'Cloud Player' },
        privateSeed: {
          player: hexToBytes(PRINCIPAL),
          subkey: Array(20).fill(0x31)
        },
        botSubkey: false,
        quests: [
          {
            id: expect.any(Number),
            questType: 'Strengthweaver',
            progress: 0,
            endProgress: 1,
            reward: { itemType: 'SW_XP', amount: 100 },
            isClaimable: false
          }
        ]
      },
      player2: {
        gameMode: GameMode.PRACTICE_BOT,
        account: { name: 'Majordomo' }
      },
      matchSettings: { season: 126, turnTimer: true, botDifficulty: 0.34 }
    })
    expect(payload.match.player2.account.address).toMatch(/^0x[0-9a-f]{40}$/)
    expect(payload.match.player2.botSubkey).toMatch(/^0x[0-9a-f]{64}$/)
    expect(payload.match.player2.privateSeed.cards).toEqual(
      STARTER_CARD_IDS.map(String)
    )

    const second = await create()
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual(firstBody)
    const count = await env.AUTH_DB.prepare(
      'SELECT COUNT(*) AS count FROM multiplayer_matches'
    ).first<{ count: number }>()
    expect(count?.count).toBe(1)
  })

  it('overrides forged player bytes and rejects cards outside the account collection', async () => {
    const response = await create(dispatch([30]))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'card 30 is not unlocked'
    })
  })

  it('supersedes an older active match without allowing it to reactivate', async () => {
    const first = await create()
    expect(first.status).toBe(200)

    const newerDispatch = {
      ...dispatch(),
      proposalId: 'proposal-practice-2',
      createdAtMs: Date.now() + 1
    }
    const newer = await create(newerDispatch)
    expect(newer.status).toBe(200)

    const rows = await env.AUTH_DB.prepare(
      `SELECT proposal_id, status, result_json, ended_at
       FROM multiplayer_matches ORDER BY id`
    ).all<{
      proposal_id: string
      status: string
      result_json: string | null
      ended_at: string | null
    }>()
    expect(rows.results).toEqual([
      expect.objectContaining({
        proposal_id: PROPOSAL_ID,
        status: 'ended',
        ended_at: expect.any(String)
      }),
      expect.objectContaining({
        proposal_id: 'proposal-practice-2',
        status: 'active'
      })
    ])
    expect(JSON.parse(rows.results[0].result_json!)).toEqual({
      reason: 'superseded',
      byProposalId: 'proposal-practice-2'
    })

    const staleRetry = await create()
    expect(staleRetry.status).toBe(409)
    expect(await staleRetry.json()).toEqual({
      error: 'accepted proposal has already ended'
    })
  })

  it('hides its internal endpoint and binds idempotency to the accepted proposal', async () => {
    const denied = await create(dispatch(), 'wrong-secret')
    expect(denied.status).toBe(404)
    await denied.json()

    const body = dispatch()
    const mismatch = await SELF.fetch(
      'https://match-service.example/internal/matches',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': 'different-proposal',
          [INTERNAL_AUTH_HEADER]: 'match-service-test-secret'
        },
        body: JSON.stringify(body)
      }
    )
    expect(mismatch.status).toBe(400)
    await mismatch.json()
  })
})
