import { GameMode } from '@opensky/proto'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { env, SELF } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'

import { hexToBytes } from '../src/encoding'
import {
  BOT_PLACEHOLDER,
  INTERNAL_AUTH_HEADER,
  parseAcceptedMatchDispatch
} from '../src/protocol'
import { MatchRepository } from '../src/repository'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const SECOND_USER_ID = '22222222-2222-4222-8222-222222222222'
let PRINCIPAL = '0x0000000000000000000000000000000000000001'
let SECOND_PRINCIPAL = '0x0000000000000000000000000000000000000002'
const PROPOSAL_ID = 'proposal-practice-1'
const PLAYER_SESSION_ID = 'fcea164c-7449-449c-9718-27b98bd18c64'
const SECOND_PLAYER_SESSION_ID = 'a51d9958-b28c-4f0a-812f-4e622f387f31'
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
        sessionId: '',
        playerSessionId: PLAYER_SESSION_ID,
        clientVersionHash: 'release-1'
      },
      request: {
        type: 'find_match',
        privateSeed: privateSeed(cards),
        sessionID: '',
        mode: GameMode.PRACTICE_BOT,
        versionHash: 'release-1',
        playerSessionID: PLAYER_SESSION_ID
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
        sessionId: '',
        playerSessionId: '',
        clientVersionHash: 'release-1'
      }
    }
  ]
})

const mixedDispatch = () => {
  const accepted = dispatch()
  accepted.participants[0].player.mode = GameMode.PRACTICE_PVP
  accepted.participants[0].request!.mode = GameMode.PRACTICE_PVP
  accepted.participants[1] = {
    player: {
      address: SECOND_PRINCIPAL,
      mode: GameMode.RANKED_CONSTRUCTED,
      sessionId: '',
      playerSessionId: SECOND_PLAYER_SESSION_ID,
      clientVersionHash: 'release-1'
    },
    request: {
      type: 'find_match',
      privateSeed: privateSeed(),
      sessionID: '',
      mode: GameMode.RANKED_CONSTRUCTED,
      versionHash: 'release-1',
      playerSessionID: SECOND_PLAYER_SESSION_ID
    },
    identity: {
      principal: SECOND_PRINCIPAL,
      userId: SECOND_USER_ID,
      displayName: 'Ranked Player'
    }
  }
  return { accepted, secondUserId: SECOND_USER_ID }
}

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

const provisionSecondPlayer = async (level = 2) => {
  const now = new Date().toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, 'Second Player', 'second@example.com', NULL, ?, ?)`
    ).bind(SECOND_USER_ID, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_profiles
         (user_id, level, xp, next_level_xp, created_at, updated_at)
       VALUES (?, ?, 0, 200, ?, ?)`
    ).bind(SECOND_USER_ID, level, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_settings
         (user_id, name, locale, warm_ups, created_at, updated_at)
       VALUES (?, 'Second.Player', 'en', 0, ?, ?)`
    ).bind(SECOND_USER_ID, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_progression
         (user_id, basic_skypass_level, basic_skypass_xp,
          basic_skypass_next_xp, tutorial_completed, created_at, updated_at)
       VALUES (?, 1, 0, 200, 0, ?, ?)`
    ).bind(SECOND_USER_ID, now, now),
    ...STARTER_CARD_IDS.map(cardId =>
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_BASE_CARDS', ?, 1, 0, 'test', ?, ?)`
      ).bind(SECOND_USER_ID, cardId, now, now)
    )
  ])
}

beforeEach(async () => {
  ;[PRINCIPAL, SECOND_PRINCIPAL] = await Promise.all([
    deriveGamePrincipal(USER_ID),
    deriveGamePrincipal(SECOND_USER_ID)
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM multiplayer_abandon_penalties_applied'),
    env.AUTH_DB.prepare('DELETE FROM player_abandon_penalties'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
    env.AUTH_DB.prepare('DELETE FROM player_account_stats'),
    env.AUTH_DB.prepare('DELETE FROM game_accounts'),
    env.AUTH_DB.prepare('DELETE FROM player_items'),
    env.AUTH_DB.prepare('DELETE FROM player_card_unlocks'),
    env.AUTH_DB.prepare('DELETE FROM player_quests'),
    env.AUTH_DB.prepare('DELETE FROM player_decks'),
    env.AUTH_DB.prepare('DELETE FROM player_progression'),
    env.AUTH_DB.prepare('DELETE FROM player_profiles'),
    env.AUTH_DB.prepare('DELETE FROM auth_identities'),
    env.AUTH_DB.prepare('DELETE FROM users'),
    env.AUTH_DB.prepare(
      `UPDATE game_mode_status
       SET enabled = CASE
         WHEN game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
           THEN 0
         ELSE 1
       END,
       updated_by_user_id = 'system:test-reset',
       updated_at = ?`
    ).bind(new Date().toISOString())
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
      `INSERT INTO player_account_settings
         (user_id, name, locale, region, tag_art_id, title_id, warm_ups,
          spectate_code, spectate_code_expires_at, account_status,
          created_at, updated_at)
       VALUES (?, 'WeaselAlias', 'fr', 'CA', 'bg-mind-03', 77, 2,
               'shared-spectate-code', ?, 'ACTIVE', ?, ?)`
    ).bind(
      USER_ID,
      new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
      now,
      now
    ),
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
    ),
    ...STARTER_CARD_IDS.map(cardId =>
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_BASE_CARDS', ?, 1, 0, 'starter-deck', ?, ?)`
      ).bind(USER_ID, cardId, now, now)
    ),
    ...[
      ['SW_STICKERS', 5],
      ['SW_CARD_BACKS', 7],
      ['SW_CARD_BACKS', 8],
      ['SW_HERO_SKINS', 1],
      ['SW_CRYSTALS', 7],
      ['SW_CRYSTALS', 1]
    ].map(([itemType, tokenId]) =>
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, ?, ?, 1, 0, 'test-fixture', ?, ?)`
      ).bind(USER_ID, itemType, tokenId, now, now)
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO player_items_equipped
         (user_id, item_id, item_type, token_id, updated_at)
       SELECT user_id, id, item_type, token_id, ? FROM player_items
       WHERE user_id = ? AND item_type IN ('SW_STICKERS', 'SW_CARD_BACKS')`
    ).bind(now, USER_ID)
  ])
})

describe('Cloud Weasel accepted-match service', () => {
  it('reports the authoritative deployment mode switches only to trusted services', async () => {
    const response = await SELF.fetch(
      'https://match-service.example/internal/game-modes',
      {
        headers: { [INTERNAL_AUTH_HEADER]: 'match-service-test-secret' }
      }
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: {
        tutorial: true,
        practicePVP: true,
        practiceBot: true,
        warmUp: true,
        rankedConstructed: true,
        rankedDiscovery: true,
        conquestConstructed: false,
        conquestDiscovery: false,
        challengeConstructed: true,
        challengeDiscovery: true
      }
    })

    const denied = await SELF.fetch(
      'https://match-service.example/internal/game-modes'
    )
    expect(denied.status).toBe(404)
  })

  it('uses shared D1 queue switches for status, admission, and dispatch', async () => {
    await env.AUTH_DB.prepare(
      `UPDATE game_mode_status SET enabled = 0, updated_at = ?
       WHERE game_mode = 'PRACTICE_BOT'`
    )
      .bind(new Date().toISOString())
      .run()

    const status = await SELF.fetch(
      'https://match-service.example/internal/game-modes',
      {
        headers: { [INTERNAL_AUTH_HEADER]: 'match-service-test-secret' }
      }
    )
    expect(await status.json()).toMatchObject({
      status: { practiceBot: false }
    })
    expect(
      await profile(
        GameMode.PRACTICE_BOT,
        await deriveGamePrincipal(USER_ID)
      ).then(response => response.json())
    ).toMatchObject({ gameModeEnabled: false })
    const dispatched = await create()
    expect(dispatched.status).toBe(409)
    expect(await dispatched.json()).toEqual({ error: 'game mode is disabled' })
  })

  it('rejects sanctioned accounts at profile admission and final dispatch', async () => {
    const userPrincipal = await deriveGamePrincipal(USER_ID)
    const now = new Date().toISOString()
    const future = new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_account_settings SET account_status = 'BANNED'
         WHERE user_id = ?`
      ).bind(USER_ID),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_actions
           (action_key, account_user_id, account_address, action_type,
            created_by_user_id, created_by_account_id, expires_at,
            created_at, updated_at)
         VALUES ('match-service-ban', ?, ?, 'MOD_BAN', 'staff', 1, ?, ?, ?)`
      ).bind(USER_ID, `identity:${USER_ID}`, future, now, now)
    ])

    const deniedProfile = await profile(GameMode.PRACTICE_BOT, userPrincipal)
    expect(deniedProfile.status).toBe(403)
    expect(await deniedProfile.json()).toEqual({ error: 'account banned' })
    const deniedDispatch = await create()
    expect(deniedDispatch.status).toBe(403)
    expect(await deniedDispatch.json()).toEqual({ error: 'account banned' })
  })

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

  it('uses the identity inventory as the authoritative playable-card source', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_items SET balance = 0, updated_at = ?
         WHERE user_id = ? AND item_type = 'SW_BASE_CARDS' AND token_id = 6`
      ).bind(now, USER_ID),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_GOLD_CARDS', 6, 1, 1, 'conquest:test', ?, ?)`
      ).bind(USER_ID, now, now)
    ])

    const response = await profile(GameMode.PRACTICE_PVP, principal)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      profile: { cards: expect.arrayContaining([[6, 'gold']]) }
    })

    // The legacy table cannot represent more than one frame for a card. A
    // zero-balance identity inventory row must not remain playable merely
    // because that compatibility row still exists.
    await env.AUTH_DB.prepare(
      `UPDATE player_items SET balance = 0, updated_at = ?
       WHERE user_id = ? AND token_id = 6`
    )
      .bind(now, USER_ID)
      .run()
    const accepted = await create(dispatch([6]))
    expect(accepted.status).toBe(200)
    const row = await env.AUTH_DB.prepare(
      `SELECT match_payload_json FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(PROPOSAL_ID)
      .first<{ match_payload_json: string }>()
    expect(
      JSON.parse(row!.match_payload_json).match.player1.privateSeed.cards
    ).toEqual([])
  })

  it('disables unfinished conquest queues and rejects forged identity bindings', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at)
       VALUES ('match-service-conquest', ?, 'IN_PROGRESS', 1,
               'CONQUEST_CONSTRUCTED', 'ADA', 'STR',
               '{"41":"WIN","42":"DRAW"}', ?)`
    )
      .bind(USER_ID, now)
      .run()
    const disabled = await profile(GameMode.CONQUEST_CONSTRUCTED, principal)
    expect(await disabled.json()).toMatchObject({
      gameModeEnabled: false,
      profile: {
        conquest: {
          id: expect.any(Number),
          status: 'IN_PROGRESS',
          nonce: 1,
          mode: GameMode.CONQUEST_CONSTRUCTED,
          hero: 'ADA',
          deckClass: 'STR',
          matchProgress: { 41: 'WIN', 42: 'DRAW' }
        }
      }
    })

    const repository = new MatchRepository(env.AUTH_DB)
    const accepted = await repository.humanAccount(
      USER_ID,
      principal,
      ['str'],
      126,
      GameMode.CONQUEST_CONSTRUCTED
    )
    expect(accepted.conquestInfo).toMatchObject({
      mode: GameMode.CONQUEST_CONSTRUCTED,
      deckClass: 'STR'
    })
    await expect(
      repository.humanAccount(
        USER_ID,
        principal,
        ['hrt'],
        126,
        GameMode.CONQUEST_CONSTRUCTED
      )
    ).rejects.toMatchObject({
      reason: 'CONQUEST_DECK_CLASS_MISMATCH'
    })

    const forged = await profile(GameMode.PRACTICE_BOT, SECOND_PRINCIPAL)
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

    await provisionSecondPlayer()
    const { accepted: rankedDispatch } = mixedDispatch()
    rankedDispatch.participants[0].player.mode = GameMode.RANKED_CONSTRUCTED
    rankedDispatch.participants[0].request!.mode = GameMode.RANKED_CONSTRUCTED
    const finalCheck = await create(rankedDispatch)
    expect(finalCheck.status).toBe(409)
    expect(await finalCheck.json()).toEqual({
      error: 'ranked play is not unlocked',
      reason: 'RANK_TOO_LOW'
    })
  })

  it('builds an authoritative source-compatible practice match idempotently', async () => {
    const accepted = dispatch()
    accepted.participants[0].request!.privateSeed.cardRarities = { 6: 'gold' }
    const first = await create(accepted)
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
        spectateCode: 'shared-spectate-code',
        account: {
          address: PRINCIPAL,
          name: 'WeaselAlias',
          locale: 'fr',
          region: 'CA',
          tagArtID: 'bg-mind-03',
          titleID: 77,
          crystalID: 7,
          warmUps: 2,
          stats: {
            rankedConstructed: {
              gameMode: GameMode.RANKED_CONSTRUCTED,
              score: 1700,
              playerRank: 'EXPERT',
              playerRankStage: 'STAGE_II',
              lossStreak: 1
            }
          },
          deckEquipment: {
            stickers: [5],
            heroSkin: 1,
            cardBack: expect.toSatisfy((value: number) =>
              [7, 8].includes(value)
            )
          }
        },
        privateSeed: {
          player: hexToBytes(PRINCIPAL),
          subkey: Array(20).fill(0x31),
          heroAbility: '25000',
          cardRarities: { 6: 'base' }
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

    const second = await create(accepted)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual(firstBody)
    const count = await env.AUTH_DB.prepare(
      'SELECT COUNT(*) AS count FROM multiplayer_matches'
    ).first<{ count: number }>()
    expect(count?.count).toBe(1)
  })

  it('rejects proposal reuse with a different accepted dispatch', async () => {
    const accepted = dispatch()
    const first = await create(accepted)
    expect(first.status).toBe(200)

    const changed = dispatch()
    changed.participants[0].player.playerSessionId =
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    changed.participants[0].request!.playerSessionID =
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    const conflict = await create(changed)
    expect(conflict.status).toBe(409)
    expect(await conflict.json()).toEqual({
      error: 'accepted proposal does not match its existing allocation',
      reason: 'PLAYER_HAS_EXISTING_MATCH'
    })

    const row = await env.AUTH_DB.prepare(
      `SELECT status, dispatch_fingerprint FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(PROPOSAL_ID)
      .first<{ status: string; dispatch_fingerprint: string }>()
    expect(row).toEqual({
      status: 'active',
      dispatch_fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/)
    })

    const reordered = dispatch()
    reordered.createdAtMs = accepted.createdAtMs
    const reorderedSeed = reordered.participants[0].request!.privateSeed
    reordered.participants[0].request!.privateSeed = Object.fromEntries(
      Object.entries(reorderedSeed).reverse()
    ) as typeof reorderedSeed
    const semanticRetry = await create(reordered)
    expect(semanticRetry.status).toBe(200)
    expect(await semanticRetry.json()).toEqual(await first.clone().json())
  })

  it('coalesces concurrent identical proposal allocation races', async () => {
    const accepted = dispatch()
    accepted.proposalId = 'proposal-concurrent-identical'
    const [first, second] = await Promise.all([
      create(accepted),
      create(accepted)
    ])
    expect([first.status, second.status]).toEqual([200, 200])
    const bodies = await Promise.all([first.json(), second.json()])
    expect(bodies[0]).toEqual(bodies[1])
    const rows = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count, COUNT(DISTINCT replay_id) AS replay_count,
              COUNT(DISTINCT dispatch_fingerprint) AS fingerprint_count
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(accepted.proposalId)
      .first<{
        count: number
        replay_count: number
        fingerprint_count: number
      }>()
    expect(rows).toEqual({
      count: 1,
      replay_count: 1,
      fingerprint_count: 1
    })
  })

  it('keeps the winning allocation active during a conflicting proposal race', async () => {
    const accepted = dispatch()
    accepted.proposalId = 'proposal-concurrent-conflict'
    const changed = dispatch()
    changed.proposalId = accepted.proposalId
    changed.participants[0].player.playerSessionId =
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    changed.participants[0].request!.playerSessionID =
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

    const responses = await Promise.all([create(accepted), create(changed)])
    expect(responses.map(response => response.status).sort()).toEqual([
      200, 409
    ])
    const conflict = responses.find(response => response.status === 409)!
    expect(await conflict.json()).toEqual({
      error: 'accepted proposal does not match its existing allocation',
      reason: 'PLAYER_HAS_EXISTING_MATCH'
    })
    const row = await env.AUTH_DB.prepare(
      `SELECT status, COUNT(*) OVER () AS count
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(accepted.proposalId)
      .first<{ status: string; count: number }>()
    expect(row).toEqual({ status: 'active', count: 1 })
  })

  it('reactivates a failed allocation after an idempotent game retry succeeds', async () => {
    const accepted = {
      ...dispatch(),
      proposalId: 'proposal-retry-activation'
    }
    const first = await create(accepted)
    expect(first.status).toBe(502)
    expect(await first.json()).toEqual({
      error: 'transient game allocation failure'
    })
    const failed = await env.AUTH_DB.prepare(
      `SELECT id, replay_id, match_payload_json, server_address, status
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(accepted.proposalId)
      .first<{
        id: number
        replay_id: string
        match_payload_json: string
        server_address: string | null
        status: string
      }>()
    expect(failed).toMatchObject({
      status: 'failed',
      server_address: null
    })
    expect(failed?.match_payload_json).not.toBe('')

    const retry = await create(accepted)
    expect(retry.status).toBe(200)
    expect(await retry.json()).toEqual({
      proposalId: accepted.proposalId,
      matchId: failed?.id,
      serverAddress: `wss://opensky.example/api/game/matches/${accepted.proposalId}`
    })
    const active = await env.AUTH_DB.prepare(
      `SELECT id, replay_id, match_payload_json, server_address, status
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(accepted.proposalId)
      .first<{
        id: number
        replay_id: string
        match_payload_json: string
        server_address: string | null
        status: string
      }>()
    expect(active).toMatchObject({
      id: failed?.id,
      replay_id: failed?.replay_id,
      match_payload_json: failed?.match_payload_json,
      status: 'active',
      server_address: `wss://opensky.example/api/game/matches/${accepted.proposalId}`
    })
  })

  it('does not let a delayed failed retry supersede a newer active match', async () => {
    const stale = {
      ...dispatch(),
      proposalId: 'proposal-stale-retry',
      createdAtMs: Date.now()
    }
    expect((await create(stale)).status).toBe(502)

    const newer = {
      ...dispatch(),
      proposalId: 'proposal-newer-active',
      createdAtMs: stale.createdAtMs + 1
    }
    expect((await create(newer)).status).toBe(200)

    const retry = await create(stale)
    expect(retry.status).toBe(409)
    expect(await retry.json()).toEqual({
      error: 'accepted proposal has been superseded',
      reason: 'PLAYER_HAS_EXISTING_MATCH'
    })
    const rows = await env.AUTH_DB.prepare(
      `SELECT proposal_id, status, result_json
       FROM multiplayer_matches ORDER BY id`
    ).all<{
      proposal_id: string
      status: string
      result_json: string | null
    }>()
    expect(rows.results).toEqual([
      {
        proposal_id: stale.proposalId,
        status: 'ended',
        result_json: JSON.stringify({
          reason: 'superseded',
          byProposalId: newer.proposalId
        })
      },
      {
        proposal_id: newer.proposalId,
        status: 'active',
        result_json: null
      }
    ])
  })

  it('rejects chosen discovery cards at the final service boundary', async () => {
    await provisionSecondPlayer()
    const { accepted } = mixedDispatch()
    for (const participant of accepted.participants) {
      participant.player.mode = GameMode.CHALLENGE_DISCOVERY
      participant.player.sessionId = 'WEASEL'
      participant.request!.mode = GameMode.CHALLENGE_DISCOVERY
      participant.request!.sessionID = 'WEASEL'
    }
    const response = await create(accepted)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'DECK_IS_NOT_RANDOM' })
  })

  it('normalizes source UUID forms and rejects malformed player sessions', async () => {
    const accepted = dispatch()
    accepted.participants[0].player.playerSessionId =
      'FCEA164C7449449C971827B98BD18C64'
    accepted.participants[0].request!.playerSessionID =
      'URN:UUID:fcea164c-7449-449c-9718-27b98bd18c64'
    const response = await create(accepted)
    expect(response.status).toBe(200)
    const row = await env.AUTH_DB.prepare(
      `SELECT match_payload_json FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(PROPOSAL_ID)
      .first<{ match_payload_json: string }>()
    expect(
      JSON.parse(row!.match_payload_json).match.player1.playerSessionID
    ).toBe(PLAYER_SESSION_ID)

    const malformed = dispatch()
    malformed.proposalId = 'proposal-malformed-player-session'
    malformed.participants[0].player.playerSessionId = 'player-session-1'
    malformed.participants[0].request!.playerSessionID = 'player-session-1'
    const rejected = await create(malformed)
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toEqual({
      error: 'invalid player session ID'
    })
  })

  it('rejects release mismatch at the final service boundary', async () => {
    const accepted = dispatch()
    accepted.participants[1].player.clientVersionHash = 'release-2'
    const response = await create(accepted)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'participants use different releases'
    })
    const count = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(PROPOSAL_ID)
      .first<{ count: number }>()
    expect(count?.count).toBe(0)

    const empty = dispatch()
    empty.proposalId = 'proposal-empty-release'
    empty.participants[0].player.clientVersionHash = ''
    empty.participants[0].request!.versionHash = ''
    const rejected = await create(empty)
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toEqual({ error: 'invalid matchmaker player' })
  })

  it('limits bot placeholders to source bot-capable modes', async () => {
    const ranked = dispatch()
    ranked.participants[0].player.mode = GameMode.RANKED_CONSTRUCTED
    ranked.participants[0].request!.mode = GameMode.RANKED_CONSTRUCTED
    ranked.participants[1].player.mode = GameMode.RANKED_CONSTRUCTED

    expect(() => parseAcceptedMatchDispatch(ranked)).toThrow(
      'bots are disabled for this game mode'
    )
    expect(
      parseAcceptedMatchDispatch(ranked, { enableRankedBots: true })
        .participants[1].player.mode
    ).toBe(GameMode.RANKED_CONSTRUCTED)

    const challenge = dispatch()
    challenge.proposalId = 'proposal-forged-challenge-bot'
    for (const participant of challenge.participants) {
      participant.player.mode = GameMode.CHALLENGE_CONSTRUCTED
      participant.player.sessionId = 'FORGED-BOT-SESSION'
    }
    challenge.participants[0].request!.mode = GameMode.CHALLENGE_CONSTRUCTED
    challenge.participants[0].request!.sessionID = 'FORGED-BOT-SESSION'
    const rejected = await create(challenge)
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toEqual({
      error: 'bots are disabled for this game mode'
    })
  })

  it('rejects session mismatch and empty challenge sessions at final dispatch', async () => {
    const mismatched = dispatch()
    mismatched.participants[1].player.sessionId = 'OTHER-SESSION'
    const response = await create(mismatched)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'participants use different sessions'
    })

    const { accepted: emptyChallenge } = mixedDispatch()
    emptyChallenge.proposalId = 'proposal-empty-challenge-session'
    for (const participant of emptyChallenge.participants) {
      participant.player.mode = GameMode.CHALLENGE_CONSTRUCTED
      participant.request!.mode = GameMode.CHALLENGE_CONSTRUCTED
    }
    const rejected = await create(emptyChallenge)
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toEqual({
      error: 'challenge session is required'
    })

    const count = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count FROM multiplayer_matches
       WHERE proposal_id IN (?, ?)`
    )
      .bind(PROPOSAL_ID, emptyChallenge.proposalId)
      .first<{ count: number }>()
    expect(count?.count).toBe(0)
  })

  it('preserves the normalized challenge session as the matchmaking code', async () => {
    const { accepted, secondUserId } = mixedDispatch()
    accepted.participants[0].player.mode = GameMode.CHALLENGE_CONSTRUCTED
    accepted.participants[0].player.sessionId = 'CLOUD-WEASEL'
    accepted.participants[0].request!.mode = GameMode.CHALLENGE_CONSTRUCTED
    accepted.participants[0].request!.sessionID = 'CLOUD-WEASEL'
    accepted.participants[1].player.mode = GameMode.CHALLENGE_CONSTRUCTED
    accepted.participants[1].player.sessionId = 'CLOUD-WEASEL'
    accepted.participants[1].request!.mode = GameMode.CHALLENGE_CONSTRUCTED
    accepted.participants[1].request!.sessionID = 'CLOUD-WEASEL'
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, avatar_url, created_at, updated_at)
         VALUES (?, 'Challenge Player', 'challenge@example.com', NULL, ?, ?)`
      ).bind(secondUserId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_profiles
           (user_id, level, xp, next_level_xp, created_at, updated_at)
         VALUES (?, 1, 0, 200, ?, ?)`
      ).bind(secondUserId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_settings
           (user_id, name, locale, warm_ups, created_at, updated_at)
         VALUES (?, 'Challenge.Player', 'en', 0, ?, ?)`
      ).bind(secondUserId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_progression
           (user_id, basic_skypass_level, basic_skypass_xp,
            basic_skypass_next_xp, tutorial_completed, created_at, updated_at)
         VALUES (?, 1, 0, 200, 0, ?, ?)`
      ).bind(secondUserId, now, now),
      ...STARTER_CARD_IDS.map(cardId =>
        env.AUTH_DB.prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           VALUES (?, 'SW_BASE_CARDS', ?, 1, 0, 'test', ?, ?)`
        ).bind(secondUserId, cardId, now, now)
      )
    ])

    const response = await create(accepted)
    expect(response.status).toBe(200)
    const row = await env.AUTH_DB.prepare(
      `SELECT match_payload_json FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(PROPOSAL_ID)
      .first<{ match_payload_json: string }>()
    const payload = JSON.parse(row!.match_payload_json)
    expect(payload.match.matchSettings.matchmakingCode).toBe('CLOUD-WEASEL')
  })

  it('rejects duplicate and oversized constructed decks', async () => {
    const duplicate = await create(dispatch([6, 6]))
    expect(duplicate.status).toBe(400)
    expect(await duplicate.json()).toEqual({
      error: 'invalid deck: duplicate cards'
    })

    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO player_items
         (user_id, item_type, token_id, balance, is_new, unlock_source,
          created_at, updated_at)
       VALUES (?, 'SW_BASE_CARDS', 30, 1, 0, 'test', ?, ?)`
    )
      .bind(USER_ID, now, now)
      .run()
    const oversized = dispatch([...STARTER_CARD_IDS, 30])
    oversized.proposalId = 'proposal-oversized-deck'
    const response = await create(oversized)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'invalid deck: more than 30 cards'
    })
  })

  it('preserves the source mixed practice-PVP/ranked participant modes', async () => {
    const { accepted, secondUserId } = mixedDispatch()
    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, avatar_url, created_at, updated_at)
         VALUES (?, 'Ranked Player', 'ranked@example.com', NULL, ?, ?)`
      ).bind(secondUserId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_profiles
           (user_id, level, xp, next_level_xp, created_at, updated_at)
         VALUES (?, 2, 0, 200, ?, ?)`
      ).bind(secondUserId, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_settings
           (user_id, name, locale, warm_ups, spectate_code,
            spectate_code_expires_at, created_at, updated_at)
         VALUES (?, 'Ranked.Player', 'en', 0, 'ranked-spectate', ?, ?, ?)`
      ).bind(
        secondUserId,
        new Date(Date.now() + 60_000).toISOString(),
        now,
        now
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO player_progression
           (user_id, basic_skypass_level, basic_skypass_xp,
            basic_skypass_next_xp, tutorial_completed, created_at, updated_at)
         VALUES (?, 1, 0, 200, 0, ?, ?)`
      ).bind(secondUserId, now, now),
      ...STARTER_CARD_IDS.map(cardId =>
        env.AUTH_DB.prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           VALUES (?, 'SW_BASE_CARDS', ?, 1, 0, 'test', ?, ?)`
        ).bind(secondUserId, cardId, now, now)
      )
    ])

    const response = await create(accepted)
    expect(response.status).toBe(200)
    const row = await env.AUTH_DB.prepare(
      `SELECT mode, player1_mode, player2_mode, match_payload_json
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(PROPOSAL_ID)
      .first<{
        mode: GameMode
        player1_mode: GameMode
        player2_mode: GameMode
        match_payload_json: string
      }>()
    expect(row).toMatchObject({
      mode: GameMode.RANKED_CONSTRUCTED,
      player1_mode: GameMode.PRACTICE_PVP,
      player2_mode: GameMode.RANKED_CONSTRUCTED
    })
    const payload = JSON.parse(row!.match_payload_json)
    expect(payload.match.player1.gameMode).toBe(GameMode.PRACTICE_PVP)
    expect(payload.match.player2.gameMode).toBe(GameMode.RANKED_CONSTRUCTED)
  })

  it('rejects mode combinations not compatible in the source', async () => {
    const accepted = dispatch()
    accepted.participants[0].player.mode = GameMode.PRACTICE_PVP
    accepted.participants[0].request!.mode = GameMode.PRACTICE_PVP
    accepted.participants[1].player.mode = GameMode.RANKED_DISCOVERY
    const response = await create(accepted)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'participants use incompatible game modes'
    })
  })

  it('revalidates both identity bindings before mixed final dispatch', async () => {
    const { accepted } = mixedDispatch()
    accepted.participants[1].identity!.userId = USER_ID
    const response = await create(accepted)
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: 'identity principal mismatch'
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_matches
         WHERE proposal_id = ?`
      )
        .bind(PROPOSAL_ID)
        .first('count')
    ).toBe(0)
  })

  it('overrides forged player bytes and removes cards outside the account collection', async () => {
    const accepted = dispatch([6, 30])
    accepted.participants[0].request!.privateSeed.cards = ['+6', '030']
    const response = await create(accepted)
    expect(response.status).toBe(200)
    const row = await env.AUTH_DB.prepare(
      `SELECT match_payload_json FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(PROPOSAL_ID)
      .first<{ match_payload_json: string }>()
    const player = JSON.parse(row!.match_payload_json).match.player1
    expect(player.privateSeed.player).toEqual(hexToBytes(PRINCIPAL))
    expect(player.privateSeed.cards).toEqual(['6'])
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
