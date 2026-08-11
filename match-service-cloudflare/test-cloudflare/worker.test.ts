import { GameMode } from '@opensky/proto'
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

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
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
        botSubkey: false
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
