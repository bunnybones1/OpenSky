import { DeckClass, GameMode, PlayerRank } from '@opensky/proto'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { env, SELF } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'

import { hexToBytes } from '../src/encoding'
import { selectSourceBotDeck, sourceBotDecksForLevel } from '../src/bot'
import { selectRegisteredBot } from '../src/registered-bot'
import {
  BOT_PLACEHOLDER,
  INTERNAL_AUTH_HEADER,
  parseAcceptedMatchDispatch
} from '../src/protocol'
import { MatchRepository } from '../src/repository'
import matchServiceWorker, {
  type MatchServiceEnv,
  currentEnabledGameModes,
  currentMatchmakerGameModes
} from '../src/worker'
import { settlePendingConquest } from '../../game-server-cloudflare/src/conquest-settlement'
import { approvedConquestPoolStatements } from '../../cloudflare/test/helpers/conquest-pool'
import { applyConquestGoldDeliveryQueueMessage } from '../../cloudflare/src/conquest-delivery'
import { ConquestDrillRepository } from '../../cloudflare/src/conquest-drill'
import { ConquestReadinessOperationsRepository } from '../../cloudflare/src/conquest-readiness-operations'
import { isConquestQueueReady } from '../../cloudflare/src/conquest-readiness'
import { PlayerRepository } from '../../cloudflare/src/player'
import { STARTER_DECKS } from '../../cloudflare/src/starter-decks'

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
const READINESS_USER_ID = 'system:conquest-readiness-drill:match-service-test'
const SYSTEM_ADMISSION_USER_ID = 'system:match-service-public-admission'
let readinessPoolVersion = 'match-service-readiness-test-v1'

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

const rankedBotsEnv = () =>
  ({
    ...env,
    INTERNAL_AUTH_SECRET: 'match-service-test-secret',
    CURRENT_SEASON: '126',
    TURN_TIMER_ENABLED: 'true',
    ENABLE_RANKED_BOTS: 'true',
    ENABLED_GAME_MODES:
      'PRACTICE_BOT,WARM_UP,PRACTICE_PVP,RANKED_CONSTRUCTED,' +
      'RANKED_DISCOVERY,CHALLENGE_CONSTRUCTED,CHALLENGE_DISCOVERY'
  }) as unknown as MatchServiceEnv

const selectBot = (
  mode = GameMode.RANKED_CONSTRUCTED,
  score = 650,
  rank = PlayerRank.EXPERT
) =>
  matchServiceWorker.fetch(
    new Request(
      'https://match-service.example/internal/matchmaker/registered-bot',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [INTERNAL_AUTH_HEADER]: 'match-service-test-secret'
        },
        body: JSON.stringify({
          userId: USER_ID,
          principal: PRINCIPAL,
          mode,
          score,
          rank
        })
      }
    ),
    rankedBotsEnv()
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
  readinessPoolVersion = `match-service-readiness-${crypto.randomUUID()}`
  ;[PRINCIPAL, SECOND_PRINCIPAL] = await Promise.all([
    deriveGamePrincipal(USER_ID),
    deriveGamePrincipal(SECOND_USER_ID)
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE status = 'ACTIVE'`
    ),
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
    env.AUTH_DB.prepare(
      `DELETE FROM users
       WHERE id NOT LIKE 'system:conquest-readiness-drill:%'`
    ),
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

const provisionReceiptBackedConquestReadiness = async () => {
  const now = Date.now()
  const startsAt = new Date(now - 26 * 60 * 60 * 1_000).toISOString()
  const settledAt = new Date(now - 25 * 60 * 60 * 1_000).toISOString()
  const deliveredAt = new Date(now - 60 * 60 * 1_000).toISOString()
  const endsAt = new Date(now + 2 * 60 * 60 * 1_000).toISOString()
  const runCreatedAt = new Date(now - 25.75 * 60 * 60 * 1_000).toISOString()
  const readinessEntryKey = `readiness-drill:${readinessPoolVersion}`
  const drillPrincipal = randomPrincipal()
  const matches = [0, 1, 2].map(index => ({
    proposalId: `readiness-drill-match-${crypto.randomUUID()}`,
    replayId: crypto.randomUUID(),
    opponentUserId: `system:conquest-readiness-opponent:${crypto.randomUUID()}`,
    opponentPrincipal: randomPrincipal(),
    endedAt: new Date(
      now - (25.5 - index * 0.2) * 60 * 60 * 1_000
    ).toISOString()
  }))
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT OR IGNORE INTO users
         (id, display_name, primary_email, user_kind, created_at, updated_at)
       VALUES (?, 'Readiness Drill', 'readiness-drill@example.com',
               'SYSTEM', ?, ?)`
    ).bind(READINESS_USER_ID, startsAt, startsAt),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (user_id, created_at) VALUES (?, ?)`
    ).bind(READINESS_USER_ID, startsAt),
    ...matches.flatMap(match => [
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, user_kind, created_at, updated_at)
         VALUES (?, 'Readiness Opponent', ?, 'SYSTEM', ?, ?)`
      ).bind(
        match.opponentUserId,
        `${crypto.randomUUID()}@example.com`,
        startsAt,
        startsAt
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO game_accounts (user_id, created_at) VALUES (?, ?)`
      ).bind(match.opponentUserId, startsAt)
    ]),
    ...approvedConquestPoolStatements(env.AUTH_DB, {
      version: readinessPoolVersion,
      startsAt,
      endsAt,
      createdAt: startsAt,
      silver: [6],
      gold: [136]
    }),
    ...matches.map(match =>
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, version,
            player1_principal, player2_principal,
            player1_user_id, player2_user_id, match_payload_json,
            server_address, status, created_at, updated_at,
            winner_player, result_json, ended_at,
            player1_mode, player2_mode, dispatch_fingerprint)
         VALUES (?, ?, 'CONQUEST_CONSTRUCTED', 'test-readiness',
                 ?, ?, ?, ?, '{}', 'test-authoritative-game', 'ended',
                 ?, ?, 0, '{"status":"COMPLETED"}', ?,
                 'CONQUEST_CONSTRUCTED', 'CONQUEST_CONSTRUCTED', NULL)`
      ).bind(
        match.proposalId,
        match.replayId,
        drillPrincipal,
        match.opponentPrincipal,
        READINESS_USER_ID,
        match.opponentUserId,
        runCreatedAt,
        match.endedAt,
        match.endedAt
      )
    )
  ])
  const matchRows = await env.AUTH_DB.prepare(
    `SELECT id, proposal_id FROM multiplayer_matches
     WHERE player1_user_id = ? AND proposal_id LIKE 'readiness-drill-match-%'
     ORDER BY ended_at, id`
  )
    .bind(READINESS_USER_ID)
    .all<{ id: number; proposal_id: string }>()
  expect(matchRows.results).toHaveLength(3)
  await env.AUTH_DB.batch([
    ...matches.map(match =>
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_conquest_progress
           (proposal_id, player1_result, player2_result, processed_at)
         VALUES (?, 'WIN', 'LOSS', ?)`
      ).bind(match.proposalId, match.endedAt)
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at, ended_at, reward_pool_version)
       VALUES (?, ?, 'REWARDS_PENDING',
               (SELECT COALESCE(MAX(nonce), 0) + 1
                FROM player_conquests WHERE user_id = ?),
               'CONQUEST_CONSTRUCTED', 'ADA', 'STR', ?, ?, ?, ?)`
    ).bind(
      readinessEntryKey,
      READINESS_USER_ID,
      READINESS_USER_ID,
      JSON.stringify(
        Object.fromEntries(
          matchRows.results.map(row => [String(row.id), 'WIN'])
        )
      ),
      runCreatedAt,
      settledAt,
      readinessPoolVersion
    )
  ])
  const conquest = await env.AUTH_DB.prepare(
    `SELECT id FROM player_conquests
     WHERE entry_key = ?`
  )
    .bind(readinessEntryKey)
    .first<{ id: number }>()
  await settlePendingConquest(env.AUTH_DB, conquest!.id, settledAt, () => 0)
  const settlement = await env.AUTH_DB.prepare(
    `SELECT settlement_key FROM player_conquest_settlements
     WHERE conquest_id = ?`
  )
    .bind(conquest!.id)
    .first<{ settlement_key: string }>()

  await expect(
    env.AUTH_DB.prepare(
      `INSERT INTO conquest_queue_readiness
         (pool_version, conquest_id, settlement_key, delivery_key,
          verified_by_user_id, drill_reference, verified_at)
       VALUES (?, ?, ?, ?, 'system:test', 'before-delivery', ?)`
    )
      .bind(
        readinessPoolVersion,
        conquest!.id,
        settlement!.settlement_key,
        crypto.randomUUID(),
        deliveredAt
      )
      .run()
  ).rejects.toThrow('verified off-chain Conquest drill receipts required')

  expect(
    await applyConquestGoldDeliveryQueueMessage(
      env.AUTH_DB,
      {
        kind: 'CONQUEST_GOLD',
        version: 1,
        conquestId: conquest!.id
      },
      new Date(deliveredAt)
    )
  ).toBe('applied')
  const evidence = await env.AUTH_DB.prepare(
    `SELECT settlement.settlement_key, delivery.delivery_key
     FROM player_conquest_settlements settlement
     JOIN player_conquest_gold_deliveries delivery
       ON delivery.conquest_id = settlement.conquest_id
     WHERE settlement.conquest_id = ?`
  )
    .bind(conquest!.id)
    .first<{ settlement_key: string; delivery_key: string }>()
  const verifiedAt = new Date(now).toISOString()
  const verifierId = `readiness-verifier-${crypto.randomUUID()}`
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Readiness Verifier', ?, ?, ?)`
    ).bind(
      verifierId,
      `${crypto.randomUUID()}@example.com`,
      verifiedAt,
      verifiedAt
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO staff_roles
         (user_id, role, granted_by_user_id, reason, created_at)
       VALUES (?, 'ADMIN', NULL, 'test readiness verifier', ?)`
    ).bind(verifierId, verifiedAt),
    env.AUTH_DB.prepare(
      `INSERT INTO staff_conquest_readiness_permissions
         (user_id, permission, granted_by_user_id, reason, created_at)
       VALUES (?, 'VERIFY', NULL, 'test readiness verifier', ?)`
    ).bind(verifierId, verifiedAt)
  ])
  await new ConquestReadinessOperationsRepository(env.AUTH_DB).verify(
    verifierId,
    {
      poolVersion: readinessPoolVersion,
      conquestId: conquest!.id,
      settlementKey: evidence!.settlement_key,
      deliveryKey: evidence!.delivery_key,
      drillReference: 'receipt-backed-e2e'
    },
    crypto.randomUUID()
  )
  return { endsAt, verifiedAt }
}

const randomPrincipal = () => {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return `0x${[...bytes]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')}`
}

const insertActiveConquest = (
  userId: string,
  entryKey: string,
  createdAt: string,
  rewardPoolVersion: string | null = readinessPoolVersion
) =>
  env.AUTH_DB.prepare(
    `INSERT INTO player_conquests
       (entry_key, user_id, status, nonce, mode, hero, deck_class,
        match_progress, created_at, reward_pool_version)
     VALUES (?, ?, 'IN_PROGRESS', 1, 'CONQUEST_CONSTRUCTED', 'ADA', 'STR',
             '{}', ?, ?)`
  ).bind(entryKey, userId, createdAt, rewardPoolVersion)

const enableConstructedConquest = (at: string) =>
  env.AUTH_DB.prepare(
    `UPDATE game_mode_status
     SET enabled = 1, updated_by_user_id = 'system:test', updated_at = ?
     WHERE game_mode = 'CONQUEST_CONSTRUCTED'`
  ).bind(at)

describe('Cloud Weasel accepted-match service', () => {
  it('installs the exact dormant source bot registry without creating login users', async () => {
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count,
                (SELECT source_name FROM registered_matchmaker_bots
                 WHERE source_index = 1) AS first_name,
                (SELECT source_name FROM registered_matchmaker_bots
                 WHERE source_index = 308) AS last_name
         FROM registered_matchmaker_bots`
      ).first()
    ).toEqual({
      count: 308,
      first_name: 'BlazeHunter',
      last_name: 'wizardswit_'
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM users WHERE id LIKE 'system:bot:%'`
      ).first()
    ).toEqual({ count: 0 })
  })

  it('keeps registry identity immutable and disabled bots out of allocations', async () => {
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE registered_matchmaker_bots SET source_name = 'rewritten'
         WHERE source_index = 1`
      ).run()
    ).rejects.toThrow('registered bot identity is immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM registered_matchmaker_bots WHERE source_index = 1`
      ).run()
    ).rejects.toThrow('registered bot registry is immutable')

    const now = new Date().toISOString()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, created_at, updated_at, user_kind)
         VALUES ('system:bot:0001', 'BlazeHunter',
                 'bot-0001@cloud-weasel.invalid', ?, ?, 'SYSTEM')`
      ).bind(now, now),
      env.AUTH_DB.prepare(
        `UPDATE registered_matchmaker_bots SET enabled = 0
         WHERE source_index = 1`
      )
    ])
    try {
      await expect(
        env.AUTH_DB.prepare(
          `INSERT INTO multiplayer_matches
             (proposal_id, replay_id, mode, version, player1_principal,
              player2_principal, player1_user_id, player2_user_id,
              match_payload_json, status, created_at, updated_at)
           VALUES ('disabled-registered-bot', 'disabled-registered-bot-replay',
                   'PRACTICE_PVP', 'release-1', ?, ?, ?,
                   'system:bot:0001', '{}', 'creating', ?, ?)`
        )
          .bind(
            PRINCIPAL,
            await deriveGamePrincipal('system:bot:0001'),
            USER_ID,
            now,
            now
          )
          .run()
      ).rejects.toThrow(
        'match participant class does not match allocation path'
      )
    } finally {
      await env.AUTH_DB.prepare(
        `UPDATE registered_matchmaker_bots SET enabled = 1
         WHERE source_index = 1`
      ).run()
    }
  })

  it('keeps the registered bot selector hidden while the production flag is off', async () => {
    const response = await SELF.fetch(
      'https://match-service.example/internal/matchmaker/registered-bot',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [INTERNAL_AUTH_HEADER]: 'match-service-test-secret'
        },
        body: JSON.stringify({
          userId: USER_ID,
          principal: PRINCIPAL,
          mode: GameMode.RANKED_CONSTRUCTED,
          score: 650,
          rank: PlayerRank.EXPERT
        })
      }
    )
    expect(response.status).toBe(404)
    await response.json()
  })

  it('selects, provisions, and excludes source-compatible registered bots', async () => {
    await new PlayerRepository(env.AUTH_DB).bootstrap(USER_ID)
    const selected = await selectBot()
    expect(selected.status).toBe(200)
    const body = await selected.json<{
      bot: {
        userId: string
        principal: string
        name: string
        score: number
        rank: PlayerRank
        deckClass: DeckClass
        prism: string
        deckString: string
        cardIds: number[]
      }
    }>()
    expect(body.bot).toMatchObject({
      userId: 'system:bot:0003',
      principal: await deriveGamePrincipal('system:bot:0003'),
      name: 'darkwidow',
      score: 700,
      rank: PlayerRank.APPRENTICE,
      deckClass: DeckClass.STR,
      prism: 'str',
      cardIds: STARTER_CARD_IDS
    })
    expect(body.bot.deckString).toBe(STARTER_DECKS[0].deckString)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT user.user_kind, profile.level, account.warm_ups,
                account.leaderboard_eligible,
                (SELECT COUNT(*) FROM player_account_stats stats
                 WHERE stats.user_id = user.id AND stats.season = 126) stats
         FROM users user
         JOIN player_profiles profile ON profile.user_id = user.id
         JOIN player_account_settings account ON account.user_id = user.id
         WHERE user.id = ?`
      )
        .bind(body.bot.userId)
        .first()
    ).toEqual({
      user_kind: 'SYSTEM',
      level: 30,
      warm_ups: 3,
      leaderboard_eligible: 0,
      stats: 1
    })

    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       VALUES ('active-source-bot', 'active-source-bot-replay',
               'RANKED_CONSTRUCTED', 'release-1', ?, ?, ?, ?, '{}',
               'active', ?, ?)`
    )
      .bind(PRINCIPAL, body.bot.principal, USER_ID, body.bot.userId, now, now)
      .run()
    const replacement = await selectBot()
    expect(replacement.status).toBe(200)
    expect(
      (await replacement.json<{ bot: { userId: string } }>()).bot.userId
    ).toBe('system:bot:0008')
  })

  it('uses an unlocked starter class but an empty deck for registered discovery bots', async () => {
    await new PlayerRepository(env.AUTH_DB).bootstrap(USER_ID)
    const selected = await selectBot(GameMode.RANKED_DISCOVERY)
    expect(selected.status).toBe(200)
    const body = await selected.json<{
      bot: { deckClass: DeckClass; deckString: string; cardIds: number[] }
    }>()
    expect(body.bot).toMatchObject({
      deckClass: DeckClass.STR,
      deckString: 'SWxSTR02',
      cardIds: []
    })
  })

  it('keeps Practice registered bots free of invented ranked stats', async () => {
    await new PlayerRepository(env.AUTH_DB).bootstrap(USER_ID)
    const selected = await selectBot(GameMode.PRACTICE_PVP)
    expect(selected.status).toBe(200)
    const { bot } = await selected.json<{ bot: { userId: string } }>()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_account_stats WHERE user_id = ?`
      )
        .bind(bot.userId)
        .first<{ count: number }>()
    ).toEqual({ count: 0 })
  })

  it('fails closed when a registered bot selector returns an invalid index', async () => {
    await new PlayerRepository(env.AUTH_DB).bootstrap(USER_ID)
    await expect(
      selectRegisteredBot(
        env.AUTH_DB,
        {
          userId: USER_ID,
          principal: PRINCIPAL,
          mode: GameMode.RANKED_CONSTRUCTED,
          score: 650,
          rank: PlayerRank.EXPERT
        },
        126,
        () => -1
      )
    ).rejects.toThrow('registered bot selector returned an invalid index')
  })

  it('rejects inconsistent unlocked starter snapshots', async () => {
    await new PlayerRepository(env.AUTH_DB).bootstrap(USER_ID)
    await env.AUTH_DB.prepare(
      `UPDATE player_decks SET card_ids = json_array(
         1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
         11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
         21, 22, 23, 24, 25, 26, 27, 28, 29, 30
       ) WHERE user_id = ? AND deck_type = 'UNLOCKED_STARTER'`
    )
      .bind(USER_ID)
      .run()
    const response = await selectBot()
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'registered bot selection failed'
    })
  })

  it('allocates a registered bot snapshot only through the enabled internal contract', async () => {
    await new PlayerRepository(env.AUTH_DB).bootstrap(USER_ID)
    await env.AUTH_DB.prepare(
      `UPDATE player_profiles SET level = 2 WHERE user_id = ?`
    )
      .bind(USER_ID)
      .run()
    const selectionResponse = await selectBot()
    const selection = (
      await selectionResponse.json<{
        bot: Record<string, unknown>
      }>()
    ).bot
    const accepted = dispatch()
    accepted.participants[0].player.mode = GameMode.RANKED_CONSTRUCTED
    accepted.participants[0].request!.mode = GameMode.RANKED_CONSTRUCTED
    const registeredParticipant = {
      player: {
        address: selection.principal as string,
        mode: GameMode.RANKED_CONSTRUCTED,
        sessionId: '',
        playerSessionId: '',
        clientVersionHash: 'release-1',
        registeredBot: selection
      }
    }
    accepted.participants[1] = registeredParticipant
    expect(() => parseAcceptedMatchDispatch(accepted)).toThrow(
      'registered bots are disabled'
    )

    const response = await matchServiceWorker.fetch(
      new Request('https://match-service.example/internal/matches', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': accepted.proposalId,
          [INTERNAL_AUTH_HEADER]: 'match-service-test-secret'
        },
        body: JSON.stringify(accepted)
      }),
      rankedBotsEnv()
    )
    expect(response.status).toBe(200)
    const ledger = await env.AUTH_DB.prepare(
      `SELECT player2_principal, player2_user_id, match_payload_json, status
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(accepted.proposalId)
      .first<{
        player2_principal: string
        player2_user_id: string
        match_payload_json: string
        status: string
      }>()
    expect(ledger).toMatchObject({
      player2_principal: selection.principal,
      player2_user_id: selection.userId,
      status: 'active'
    })
    const payload = JSON.parse(ledger!.match_payload_json)
    expect(payload.match.player2).toMatchObject({
      gameMode: GameMode.RANKED_CONSTRUCTED,
      account: {
        address: selection.principal,
        name: selection.name,
        level: 30,
        warmUps: 3
      },
      botSubkey: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      quests: []
    })
    expect(payload.match.player2.privateSeed).toMatchObject({
      player: hexToBytes(selection.principal as string),
      prisms: ['str'],
      cards: STARTER_CARD_IDS.map(String)
    })
    expect(payload.match.player2.privateSeed).not.toHaveProperty('heroAbility')
  })

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

  it('requires real off-chain settlement and delayed-delivery receipts, then expires dynamically', async () => {
    const { endsAt } = await provisionReceiptBackedConquestReadiness()
    await env.AUTH_DB.prepare(
      `UPDATE game_mode_status
       SET enabled = 1, updated_by_user_id = 'system:test', updated_at = ?
       WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')`
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
      status: { conquestConstructed: true, conquestDiscovery: true }
    })
    expect(await isConquestQueueReady(env.AUTH_DB)).toBe(true)
    expect(await isConquestQueueReady(env.AUTH_DB, new Date(endsAt))).toBe(true)
    const afterEnd = new Date(Date.parse(endsAt) + 1)
    expect(await isConquestQueueReady(env.AUTH_DB, afterEnd)).toBe(false)
    const atExpiry = await currentEnabledGameModes(
      env as unknown as Parameters<typeof currentEnabledGameModes>[0],
      new Date(endsAt)
    )
    expect(atExpiry.has(GameMode.CONQUEST_CONSTRUCTED)).toBe(true)
    expect(atExpiry.has(GameMode.CONQUEST_DISCOVERY)).toBe(true)
    const afterExpiry = await currentEnabledGameModes(
      env as unknown as Parameters<typeof currentEnabledGameModes>[0],
      afterEnd
    )
    expect(afterExpiry.has(GameMode.CONQUEST_CONSTRUCTED)).toBe(false)
    expect(afterExpiry.has(GameMode.CONQUEST_DISCOVERY)).toBe(false)

    expect(
      await env.AUTH_DB.prepare(
        `SELECT item_type, token_id, balance, unlock_source
         FROM player_items WHERE user_id = ?
           AND item_type IN ('SW_SILVER_CARDS', 'SW_GOLD_CARDS')
         ORDER BY item_type`
      )
        .bind(READINESS_USER_ID)
        .all()
    ).toMatchObject({
      results: [
        {
          item_type: 'SW_GOLD_CARDS',
          token_id: 136,
          balance: 1,
          unlock_source: expect.stringMatching(/^conquest:\d+:gold$/)
        },
        {
          item_type: 'SW_SILVER_CARDS',
          token_id: 6,
          balance: 1,
          unlock_source: expect.stringMatching(/^conquest:\d+$/)
        }
      ]
    })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE conquest_queue_readiness SET drill_reference = 'rewritten'
         WHERE pool_version = ?`
      )
        .bind(readinessPoolVersion)
        .run()
    ).rejects.toThrow('Conquest queue readiness receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM conquest_queue_readiness WHERE pool_version = ?`
      )
        .bind(readinessPoolVersion)
        .run()
    ).rejects.toThrow('Conquest queue readiness receipts are immutable')
  })

  it('keeps an exact receipt-backed run drainable after the inclusive window closes', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const { endsAt, verifiedAt } =
      await provisionReceiptBackedConquestReadiness()
    await env.AUTH_DB.batch([
      enableConstructedConquest(verifiedAt),
      insertActiveConquest(
        USER_ID,
        'match-service-drainable-conquest',
        verifiedAt
      )
    ])

    const publicModes = await currentEnabledGameModes(
      env as unknown as Parameters<typeof currentEnabledGameModes>[0],
      new Date(Date.parse(endsAt) + 1)
    )
    expect(publicModes.has(GameMode.CONQUEST_CONSTRUCTED)).toBe(false)
    const matchmakerModes = await currentMatchmakerGameModes(
      env as unknown as Parameters<typeof currentMatchmakerGameModes>[0],
      new Date(Date.parse(endsAt) + 1)
    )
    expect(matchmakerModes.has(GameMode.CONQUEST_CONSTRUCTED)).toBe(true)
    expect(matchmakerModes.has(GameMode.CONQUEST_DISCOVERY)).toBe(false)

    await env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE version = ?`
    )
      .bind(readinessPoolVersion)
      .run()
    const publicStatus = await SELF.fetch(
      'https://match-service.example/internal/game-modes',
      {
        headers: { [INTERNAL_AUTH_HEADER]: 'match-service-test-secret' }
      }
    )
    expect(await publicStatus.json()).toMatchObject({
      status: { conquestConstructed: false }
    })
    const matchmakerStatus = await SELF.fetch(
      'https://match-service.example/internal/matchmaker/game-modes',
      {
        headers: { [INTERNAL_AUTH_HEADER]: 'match-service-test-secret' }
      }
    )
    expect(await matchmakerStatus.json()).toMatchObject({
      status: {
        conquestConstructed: true,
        conquestDiscovery: false
      }
    })
    expect(
      await profile(GameMode.CONQUEST_CONSTRUCTED, principal).then(response =>
        response.json()
      )
    ).toMatchObject({ gameModeEnabled: true })

    await env.AUTH_DB.prepare(
      `UPDATE game_mode_status
       SET enabled = 0, updated_by_user_id = 'system:emergency-stop',
           updated_at = ?
       WHERE game_mode = 'CONQUEST_CONSTRUCTED'`
    )
      .bind(new Date().toISOString())
      .run()
    expect(
      await profile(GameMode.CONQUEST_CONSTRUCTED, principal).then(response =>
        response.json()
      )
    ).toMatchObject({ gameModeEnabled: false })
    expect(
      await SELF.fetch(
        'https://match-service.example/internal/matchmaker/game-modes',
        {
          headers: { [INTERNAL_AUTH_HEADER]: 'match-service-test-secret' }
        }
      ).then(response => response.json())
    ).toMatchObject({ status: { conquestConstructed: false } })
  })

  it('rejects a pool pin whose run was not admitted inside its window', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const { endsAt, verifiedAt } =
      await provisionReceiptBackedConquestReadiness()
    await env.AUTH_DB.batch([
      enableConstructedConquest(verifiedAt),
      insertActiveConquest(
        USER_ID,
        'match-service-forged-conquest-window',
        new Date(Date.parse(endsAt) + 1).toISOString()
      )
    ])
    await env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE version = ?`
    )
      .bind(readinessPoolVersion)
      .run()

    expect(
      await profile(GameMode.CONQUEST_CONSTRUCTED, principal).then(response =>
        response.json()
      )
    ).toMatchObject({ gameModeEnabled: false })
    const matchmakerModes = await currentMatchmakerGameModes(
      env as unknown as Parameters<typeof currentMatchmakerGameModes>[0]
    )
    expect(matchmakerModes.has(GameMode.CONQUEST_CONSTRUCTED)).toBe(false)
  })

  it('dispatches an expired-window Conquest match only for admitted identities', async () => {
    const { verifiedAt } = await provisionReceiptBackedConquestReadiness()
    await provisionSecondPlayer()
    await env.AUTH_DB.batch([
      enableConstructedConquest(verifiedAt),
      insertActiveConquest(
        USER_ID,
        'match-service-drain-dispatch-one',
        verifiedAt
      ),
      insertActiveConquest(
        SECOND_USER_ID,
        'match-service-drain-dispatch-two',
        verifiedAt
      )
    ])
    await env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE version = ?`
    )
      .bind(readinessPoolVersion)
      .run()
    const { accepted } = mixedDispatch()
    for (const participant of accepted.participants) {
      participant.player.mode = GameMode.CONQUEST_CONSTRUCTED
      participant.request!.mode = GameMode.CONQUEST_CONSTRUCTED
    }

    const response = await create(accepted)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      proposalId: PROPOSAL_ID,
      matchId: expect.any(Number),
      serverAddress: expect.stringMatching(/^wss:\/\//)
    })
  })

  it('rejects final Conquest dispatch when either identity lacks an admission pin', async () => {
    const { verifiedAt } = await provisionReceiptBackedConquestReadiness()
    await provisionSecondPlayer()
    await env.AUTH_DB.batch([
      enableConstructedConquest(verifiedAt),
      insertActiveConquest(
        USER_ID,
        'match-service-guarded-dispatch-one',
        verifiedAt
      ),
      insertActiveConquest(
        SECOND_USER_ID,
        'match-service-guarded-dispatch-two',
        verifiedAt,
        null
      )
    ])
    await env.AUTH_DB.prepare(
      `UPDATE conquest_reward_pools SET status = 'RETIRED'
       WHERE version = ?`
    )
      .bind(readinessPoolVersion)
      .run()
    const { accepted } = mixedDispatch()
    for (const participant of accepted.participants) {
      participant.player.mode = GameMode.CONQUEST_CONSTRUCTED
      participant.request!.mode = GameMode.CONQUEST_CONSTRUCTED
    }

    const response = await create(accepted)
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'game mode is disabled' })
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
        `INSERT INTO player_account_stats
           (user_id, game_mode, season, score, player_rank, loss_streak,
            player_rank_stage, created_at, updated_at)
         VALUES (?, 'RANKED_DISCOVERY', 126, 900, 'MASTER', 0,
                 'STAGE_NONE', ?, ?)`
      ).bind(USER_ID, now, now),
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
        rankedConstructedRank: 'EXPERT',
        rankedDiscoveryRank: 'MASTER',
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

  it('forces the source full-strength bot for Warm Up matches', async () => {
    const accepted = dispatch()
    accepted.proposalId = 'proposal-warm-up-difficulty'
    accepted.participants[0].player.mode = GameMode.WARM_UP
    accepted.participants[0].request!.mode = GameMode.WARM_UP
    accepted.participants[1].player.mode = GameMode.WARM_UP

    const response = await create(accepted)
    expect(response.status).toBe(200)
    const row = await env.AUTH_DB.prepare(
      `SELECT match_payload_json FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(accepted.proposalId)
      .first<{ match_payload_json: string }>()
    const payload = JSON.parse(row!.match_payload_json)
    expect(payload.match).toMatchObject({
      player2: {
        gameMode: GameMode.WARM_UP,
        account: { name: 'Mecha Gygax' }
      },
      matchSettings: { botDifficulty: 1 }
    })
  })

  it('preserves every source level-gated unregistered bot deck', () => {
    expect(
      [0, 6, 11, 16, 21].map(level =>
        sourceBotDecksForLevel(level).map(deck => deck.deckClass)
      )
    ).toEqual([
      [DeckClass.STR],
      [DeckClass.STR, DeckClass.AGY],
      [DeckClass.STR, DeckClass.AGY, DeckClass.WIS],
      [DeckClass.STR, DeckClass.AGY, DeckClass.WIS, DeckClass.HRT],
      [
        DeckClass.STR,
        DeckClass.AGY,
        DeckClass.WIS,
        DeckClass.HRT,
        DeckClass.INT
      ]
    ])
    expect(selectSourceBotDeck(21, length => length - 1)).toMatchObject({
      minimumLevel: 21,
      deckClass: DeckClass.INT,
      prism: 'int',
      heroAbility: '25003',
      cardIds: STARTER_DECKS[4].cardIds
    })
    expect(() => selectSourceBotDeck(21, length => length)).toThrow(
      'source bot deck selector returned an invalid index'
    )
  })

  it('builds a high-level Practice bot from one complete eligible source deck', async () => {
    await env.AUTH_DB.prepare(
      `UPDATE player_profiles SET level = 21 WHERE user_id = ?`
    )
      .bind(USER_ID)
      .run()
    const accepted = dispatch()
    accepted.proposalId = 'proposal-source-bot-deck'

    const response = await create(accepted)
    expect(response.status).toBe(200)
    const row = await env.AUTH_DB.prepare(
      `SELECT match_payload_json FROM multiplayer_matches
       WHERE proposal_id = ?`
    )
      .bind(accepted.proposalId)
      .first<{ match_payload_json: string }>()
    const payload = JSON.parse(row!.match_payload_json)
    const bot = payload.match.player2
    const prism = bot.privateSeed.prisms[0]
    const selected = STARTER_DECKS.find(
      deck => deck.deckClass.toLowerCase() === prism
    )
    const heroAbilities = new Map<DeckClass, string>([
      [DeckClass.STR, '25000'],
      [DeckClass.AGY, '25001'],
      [DeckClass.WIS, '25004'],
      [DeckClass.HRT, '25002'],
      [DeckClass.INT, '25003']
    ])
    expect(selected).toBeDefined()
    expect(bot.account.prisms).toEqual([prism])
    expect(bot.privateSeed.heroAbility).toBe(
      heroAbilities.get(selected!.deckClass)
    )
    expect(bot.privateSeed.cards).toEqual(selected!.cardIds.map(String))
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
    await env.AUTH_DB.prepare(
      `INSERT INTO player_account_stats
         (user_id, game_mode, season, score, created_at, updated_at)
       VALUES (?, 'CONQUEST_CONSTRUCTED', 126, -7, ?, ?)`
    )
      .bind(USER_ID, now, now)
      .run()
    const disabled = await profile(GameMode.CONQUEST_CONSTRUCTED, principal)
    expect(await disabled.json()).toMatchObject({
      gameModeEnabled: false,
      profile: {
        score: -7,
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
      GameMode.CONQUEST_CONSTRUCTED,
      'PLAYER'
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
        GameMode.CONQUEST_CONSTRUCTED,
        'PLAYER'
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

  it('partitions public match admission from operational system accounts', async () => {
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, user_kind, created_at, updated_at)
       VALUES (?, 'System Admission', 'system-admission@example.com',
               'SYSTEM', ?, ?)`
    )
      .bind(SYSTEM_ADMISSION_USER_ID, now, now)
      .run()
    await new PlayerRepository(env.AUTH_DB).bootstrap(SYSTEM_ADMISSION_USER_ID)
    const systemPrincipal = await deriveGamePrincipal(SYSTEM_ADMISSION_USER_ID)

    const systemProfile = await profile(
      GameMode.PRACTICE_BOT,
      systemPrincipal,
      SYSTEM_ADMISSION_USER_ID
    )
    expect(systemProfile.status).toBe(404)
    expect(await systemProfile.json()).toEqual({
      error: 'player was not found'
    })

    const systemDispatch = dispatch()
    systemDispatch.proposalId = 'proposal-system-public-admission'
    systemDispatch.participants[0].player.address = systemPrincipal
    systemDispatch.participants[0].identity!.principal = systemPrincipal
    systemDispatch.participants[0].identity!.userId = SYSTEM_ADMISSION_USER_ID
    const rejected = await create(systemDispatch)
    expect(rejected.status).toBe(403)
    expect(await rejected.json()).toEqual({
      error: 'player account is unavailable'
    })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT 1 FROM multiplayer_matches WHERE proposal_id = ?'
      )
        .bind(systemDispatch.proposalId)
        .first()
    ).toBeNull()

    const repository = new MatchRepository(env.AUTH_DB)
    await expect(
      repository.humanAccount(
        SYSTEM_ADMISSION_USER_ID,
        systemPrincipal,
        ['str'],
        126,
        GameMode.PRACTICE_BOT,
        'PLAYER'
      )
    ).rejects.toMatchObject({ reason: 'INVALID_ACCOUNT' })

    const insertMatch = (
      proposalId: string,
      replayId: string,
      player1UserId: string | null,
      player2UserId: string | null
    ) =>
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, player1_mode, player2_mode, version,
            player1_principal, player2_principal, player1_user_id,
            player2_user_id, match_payload_json, status, created_at,
            updated_at, dispatch_fingerprint)
         VALUES (?, ?, 'PRACTICE_BOT', 'PRACTICE_BOT', 'PRACTICE_BOT',
                 'test-release', ?, ?, ?, ?, '', 'creating', ?, ?, ?)`
      ).bind(
        proposalId,
        replayId,
        PRINCIPAL,
        BOT_PLACEHOLDER,
        player1UserId,
        player2UserId,
        now,
        now,
        null
      )

    await expect(
      insertMatch(
        'ordinary-system-allocation',
        'ordinary-system-replay',
        SYSTEM_ADMISSION_USER_ID,
        null
      ).run()
    ).rejects.toThrow('match participant class does not match allocation path')
    await expect(
      insertMatch(
        'readiness-drill-match-player-allocation',
        'readiness-player-replay',
        USER_ID,
        SYSTEM_ADMISSION_USER_ID
      ).run()
    ).rejects.toThrow('match participant class does not match allocation path')

    await insertMatch(
      'ordinary-player-allocation',
      'ordinary-player-replay',
      USER_ID,
      null
    ).run()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE multiplayer_matches SET player1_user_id = ?
         WHERE proposal_id = 'ordinary-player-allocation'`
      )
        .bind(SYSTEM_ADMISSION_USER_ID)
        .run()
    ).rejects.toThrow('match participant identity is immutable')
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
          seasonLevel: 0,
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

  it('projects unpublished Warm Up progress into authoritative match accounts', async () => {
    const processedAt = '2026-08-21T15:42:00.000Z'
    const proposalId = `pending-warm-up-account-${crypto.randomUUID()}`
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, player1_mode, player2_mode, version,
            player1_principal, player2_principal, player1_user_id,
            player2_user_id, match_payload_json, status, created_at,
            updated_at)
         VALUES (?, ?, 'WARM_UP', 'WARM_UP', 'WARM_UP',
                 'warm-up-publication-test', ?, ?, ?, NULL, '{}', 'active',
                 ?, ?)`
      ).bind(
        proposalId,
        `${proposalId}-replay`,
        PRINCIPAL,
        BOT_PLACEHOLDER,
        USER_ID,
        processedAt,
        processedAt
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_warmups_applied
           (proposal_id, credited_player, user_id, warm_ups_before,
            warm_ups_after, processed_at)
         VALUES (?, 0, ?, 1, 2, ?)`
      ).bind(proposalId, USER_ID, processedAt)
    ])

    const repository = new MatchRepository(env.AUTH_DB)
    const pending = await repository.humanAccount(
      USER_ID,
      PRINCIPAL,
      ['str'],
      126,
      GameMode.PRACTICE_BOT,
      'PLAYER'
    )
    expect(pending.account.warmUps).toBe(1)

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches SET status = 'ended', updated_at = ?
       WHERE proposal_id = ?`
    )
      .bind(processedAt, proposalId)
      .run()
    const published = await repository.humanAccount(
      USER_ID,
      PRINCIPAL,
      ['str'],
      126,
      GameMode.PRACTICE_BOT,
      'PLAYER'
    )
    expect(published.account.warmUps).toBe(2)
  })

  it('projects unpublished match experience into authoritative match accounts', async () => {
    const beforeAt = '2026-08-21T15:52:00.000Z'
    const stagedAt = '2026-08-21T15:52:01.000Z'
    const proposalId = `pending-experience-account-${crypto.randomUUID()}`
    const settlementToken = crypto.randomUUID()
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_profiles
         SET level = 4, xp = 180, next_level_xp = 200, updated_at = ?
         WHERE user_id = ?`
      ).bind(beforeAt, USER_ID),
      env.AUTH_DB.prepare(
        `UPDATE player_progression
         SET basic_skypass_level = 4, basic_skypass_xp = 180,
             basic_skypass_next_xp = 200, updated_at = ?
         WHERE user_id = ?`
      ).bind(beforeAt, USER_ID),
      env.AUTH_DB.prepare(
        `INSERT INTO player_skypass_season_stats
           (user_id, season, has_premium, created_at, updated_at,
            initial_account_level, achieved_account_level)
         VALUES (?, 126, 0, ?, ?, 1, 3)`
      ).bind(USER_ID, beforeAt, beforeAt),
      env.AUTH_DB.prepare(
        `INSERT INTO player_account_stats
           (user_id, game_mode, season, score, player_rank,
            player_rank_stage, player_rank_state, created_at, updated_at)
         VALUES (?, 'RANKED_DISCOVERY', 126, 0, 'WANDERER', 'STAGE_I',
                 '[1,1750,350,0]', ?, ?)`
      ).bind(USER_ID, beforeAt, beforeAt),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, player1_mode, player2_mode, version,
            player1_principal, player2_principal, player1_user_id,
            player2_user_id, match_payload_json, status, created_at,
            updated_at)
         VALUES (?, ?, 'PRACTICE_PVP', 'PRACTICE_PVP', 'PRACTICE_PVP',
                 'experience-publication-test', ?, ?, ?, NULL, '{}', 'active',
                 ?, ?)`
      ).bind(
        proposalId,
        `${proposalId}-replay`,
        PRINCIPAL,
        BOT_PLACEHOLDER,
        USER_ID,
        stagedAt,
        stagedAt
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_experience_players
           (proposal_id, player_index, user_id, season, settlement_token,
            experience_gain, before_level, before_xp, before_skypass_level,
            before_skypass_xp, season_stats_existed_before,
            season_initial_account_level_before,
            season_achieved_account_level_before,
            profile_updated_at_before, after_level, after_xp,
            ranked_constructed_before, ranked_discovery_before,
            inviter_user_id,
            inviter_levels_before, inviter_sticker_points_before,
            inviter_sticker_points_existed_before,
            inviter_sticker_points_created_at_before,
            inviter_sticker_points_updated_at_before, rewards_json,
            processed_at)
         VALUES (?, 0, ?, 126, ?, 50, 4, 180, 4, 180, 1, 1, 3, ?,
                 5, 30, 'EXPERT', 'WANDERER', NULL, 0, 0, 0, '', '', '[]', ?)`
      ).bind(proposalId, USER_ID, settlementToken, beforeAt, stagedAt),
      env.AUTH_DB.prepare(
        `UPDATE player_profiles
         SET level = 5, xp = 30, next_level_xp = 200, updated_at = ?
         WHERE user_id = ?`
      ).bind(stagedAt, USER_ID),
      env.AUTH_DB.prepare(
        `UPDATE player_progression
         SET basic_skypass_level = 5, basic_skypass_xp = 30,
             basic_skypass_next_xp = 200, updated_at = ?
         WHERE user_id = ?`
      ).bind(stagedAt, USER_ID),
      env.AUTH_DB.prepare(
        `UPDATE player_skypass_season_stats
         SET achieved_account_level = 4, updated_at = ?
         WHERE user_id = ? AND season = 126`
      ).bind(stagedAt, USER_ID),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_experience
           (proposal_id, player1_rewards_json, player2_rewards_json,
            processed_at, player_count, settlement_token)
         VALUES (?, '[]', '[]', ?, 1, ?)`
      ).bind(proposalId, stagedAt, settlementToken)
    ])

    const repository = new MatchRepository(env.AUTH_DB)
    const pending = await repository.humanAccount(
      USER_ID,
      PRINCIPAL,
      ['str'],
      126,
      GameMode.PRACTICE_BOT,
      'PLAYER'
    )
    expect(pending).toMatchObject({
      level: 4,
      account: { level: 4, experience: 180, seasonLevel: 2 }
    })

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches
       SET status = 'ended', ended_at = ?, updated_at = ?
       WHERE proposal_id = ?`
    )
      .bind(stagedAt, stagedAt, proposalId)
      .run()
    const published = await repository.humanAccount(
      USER_ID,
      PRINCIPAL,
      ['str'],
      126,
      GameMode.PRACTICE_BOT,
      'PLAYER'
    )
    expect(published).toMatchObject({
      level: 5,
      account: { level: 5, experience: 30, seasonLevel: 3 }
    })
  })

  it('projects ranked stats before terminal publication for matchmaking and match accounts', async () => {
    const proposalId = `pending-rank-account-${crypto.randomUUID()}`
    const beforeAt = '2026-08-21T16:02:00.000Z'
    const stagedAt = '2026-08-21T16:02:01.000Z'
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE player_profiles SET level = 2, updated_at = ?
         WHERE user_id = ?`
      ).bind(beforeAt, USER_ID),
      env.AUTH_DB.prepare(
        `UPDATE player_account_stats
         SET win_count = 4, loss_count = 2, score = 1700,
             player_rank = 'EXPERT', player_rank_stage = 'STAGE_II',
             player_rank_state = '[1,1750,350,1700]', win_streak = 0,
             loss_streak = 1, created_at = ?, updated_at = ?
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED'
           AND season = 126`
      ).bind(beforeAt, beforeAt, USER_ID),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, player1_mode, player2_mode, version,
            player1_principal, player2_principal, player1_user_id,
            player2_user_id, match_payload_json, status, created_at,
            updated_at)
         VALUES (?, ?, 'RANKED_CONSTRUCTED', 'RANKED_CONSTRUCTED',
                 'RANKED_CONSTRUCTED', 'rank-publication-test', ?, ?, ?, NULL,
                 '{"match":{"matchSettings":{"season":126}}}', 'active', ?, ?)`
      ).bind(
        proposalId,
        `${proposalId}-replay`,
        PRINCIPAL,
        BOT_PLACEHOLDER,
        USER_ID,
        stagedAt,
        stagedAt
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_account_stat_snapshots
           (proposal_id, phase, player_index, user_id, game_mode, season,
            stat_existed_before, before_win_count, before_loss_count,
            before_tie_count, before_forfeit_count, before_abandon_count,
            before_score, before_player_rank, before_player_rank_stage,
            before_player_rank_state, before_win_streak, before_loss_streak,
            before_created_at, before_updated_at)
         VALUES (?, 'RANKED_STATS', 0, ?, 'RANKED_CONSTRUCTED', 126, 1,
                 4, 2, 0, 0, 0, 1700, 'EXPERT', 'STAGE_II',
                 '[1,1750,350,1700]', 0, 1, ?, ?)`
      ).bind(proposalId, USER_ID, beforeAt, beforeAt),
      env.AUTH_DB.prepare(
        `UPDATE player_account_stats
         SET win_count = 5, score = 1740,
             player_rank_state = '[1,1750,350,1740]', win_streak = 1,
             loss_streak = 0, updated_at = ?
         WHERE user_id = ? AND game_mode = 'RANKED_CONSTRUCTED'
           AND season = 126`
      ).bind(stagedAt, USER_ID),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_account_stat_outcomes
           (proposal_id, phase, player_index, user_id, game_mode, season,
            after_win_count, after_loss_count, after_tie_count,
            after_forfeit_count, after_abandon_count, after_score,
            after_player_rank, after_player_rank_stage,
            after_player_rank_state, after_win_streak, after_loss_streak,
            after_created_at, after_updated_at)
         VALUES (?, 'RANKED_STATS', 0, ?, 'RANKED_CONSTRUCTED', 126,
                 5, 2, 0, 0, 0, 1740, 'EXPERT', 'STAGE_II',
                 '[1,1750,350,1740]', 1, 0, ?, ?)`
      ).bind(proposalId, USER_ID, beforeAt, stagedAt),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_stats_applied
           (proposal_id, player1_rewards_json, player2_rewards_json,
            processed_at)
         VALUES (?, '[]', '[]', ?)`
      ).bind(proposalId, stagedAt)
    ])

    const repository = new MatchRepository(env.AUTH_DB)
    const expectVisible = async (
      score: number,
      winCount: number,
      lossStreak: number,
      queueScore: number
    ) => {
      const matchmaking = await repository.matchmakingProfile(
        USER_ID,
        PRINCIPAL,
        GameMode.RANKED_CONSTRUCTED,
        126,
        'rank-publication-test'
      )
      expect(matchmaking).toMatchObject({
        score: queueScore,
        rank: 'EXPERT'
      })
      const account = await repository.humanAccount(
        USER_ID,
        PRINCIPAL,
        ['str'],
        126,
        GameMode.RANKED_CONSTRUCTED,
        'PLAYER'
      )
      expect(account.account.stats!.rankedConstructed).toMatchObject({
        score,
        winCount,
        lossStreak
      })
    }

    await expectVisible(1700, 4, 1, 1600)
    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches SET status = 'ended', ended_at = ?,
       updated_at = ? WHERE proposal_id = ?`
    )
      .bind(stagedAt, stagedAt, proposalId)
      .run()
    await expectVisible(1740, 5, 0, 1600)
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
    expect(await rejected.json()).toEqual({
      error: 'invalid matchmaker player'
    })
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

  it('dispatches only the authorized next readiness match with two identity-bound bots', async () => {
    const now = Date.now()
    const timestamp = new Date(now).toISOString()
    const poolVersion = `readiness-operation-pool-${crypto.randomUUID()}`
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO staff_roles
           (user_id, role, granted_by_user_id, reason, created_at)
         VALUES (?, 'ADMIN', NULL, 'test readiness runner', ?)`
      ).bind(USER_ID, timestamp),
      env.AUTH_DB.prepare(
        `INSERT INTO staff_conquest_drill_permissions
           (user_id, permission, granted_by_user_id, reason, created_at)
         VALUES (?, 'RUN', NULL, 'test readiness runner', ?)`
      ).bind(USER_ID, timestamp),
      ...approvedConquestPoolStatements(env.AUTH_DB, {
        version: poolVersion,
        createdAt: new Date(now - 60 * 60 * 1_000).toISOString(),
        startsAt: new Date(now - 30 * 60 * 1_000).toISOString(),
        endsAt: new Date(now + 48 * 60 * 60 * 1_000).toISOString(),
        silver: [6],
        gold: [136]
      })
    ])
    const operationKey = crypto.randomUUID()
    const operation = await new ConquestDrillRepository(env.AUTH_DB).start(
      USER_ID,
      { poolVersion, reason: 'Match-service guarded dispatch test' },
      operationKey
    )

    const request = (body: object, secret = 'match-service-test-secret') =>
      SELF.fetch(
        'https://match-service.example/internal/conquest-readiness/matches',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [INTERNAL_AUTH_HEADER]: secret
          },
          body: JSON.stringify(body)
        }
      )
    expect(
      (
        await request(
          { operationKey, matchNumber: 1 },
          'incorrect-internal-secret'
        )
      ).status
    ).toBe(404)
    expect(
      (await request({ operationKey, matchNumber: 1, extra: true })).status
    ).toBe(400)
    expect((await request({ operationKey, matchNumber: 2 })).status).toBe(409)

    const created = await request({ operationKey, matchNumber: 1 })
    expect(created.status).toBe(200)
    const response = await created.json<{
      match: { proposalId: string; matchId: number; serverAddress: string }
    }>()
    expect(response.match).toMatchObject({
      proposalId: `readiness-drill-match-${operationKey}-1`,
      matchId: expect.any(Number),
      serverAddress:
        `wss://opensky.example/api/game/matches/` +
        `readiness-drill-match-${operationKey}-1`
    })

    const ledger = await env.AUTH_DB.prepare(
      `SELECT player1_principal, player2_principal, player1_user_id,
              player2_user_id, status, match_payload_json
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(response.match.proposalId)
      .first<{
        player1_principal: string
        player2_principal: string
        player1_user_id: string
        player2_user_id: string
        status: string
        match_payload_json: string
      }>()
    expect(ledger).toMatchObject({
      player1_principal: await deriveGamePrincipal(operation.targetUserId),
      player2_principal: await deriveGamePrincipal(
        operation.opponentUserIds[0]
      ),
      player1_user_id: operation.targetUserId,
      player2_user_id: operation.opponentUserIds[0],
      status: 'active'
    })
    const payload = JSON.parse(ledger!.match_payload_json)
    expect(payload).toMatchObject({
      proposalId: response.match.proposalId,
      releaseVersion: 'cloud-weasel-conquest-readiness-v1',
      match: {
        matchID: response.match.matchId,
        player1: {
          gameMode: GameMode.CONQUEST_CONSTRUCTED,
          account: { address: ledger!.player1_principal },
          botSubkey: expect.stringMatching(/^0x[0-9a-f]{64}$/),
          quests: [],
          conquestInfo: { matchProgress: {} }
        },
        player2: {
          gameMode: GameMode.CONQUEST_CONSTRUCTED,
          account: { address: ledger!.player2_principal },
          botSubkey: expect.stringMatching(/^0x[0-9a-f]{64}$/),
          quests: [],
          conquestInfo: { matchProgress: {} }
        },
        matchSettings: { botDifficulty: 0.5 }
      }
    })
    expect(payload.match.player1.privateSeed.player).toEqual(
      hexToBytes(ledger!.player1_principal)
    )
    expect(payload.match.player2.privateSeed.player).toEqual(
      hexToBytes(ledger!.player2_principal)
    )

    const retried = await request({ operationKey, matchNumber: 1 })
    expect(retried.status).toBe(200)
    expect(await retried.json()).toEqual(response)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM multiplayer_matches
            WHERE proposal_id = ?) matches,
           (SELECT COUNT(*) FROM conquest_queue_readiness
            WHERE pool_version = ?) readiness,
           (SELECT COUNT(*) FROM game_mode_status
            WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
              AND enabled = 1) enabled_modes`
      )
        .bind(response.match.proposalId, poolVersion)
        .first()
    ).toEqual({ matches: 1, readiness: 0, enabled_modes: 0 })
  })
})
