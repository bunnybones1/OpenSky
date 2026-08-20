import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { GameMode } from '@opensky/proto'

import {
  publishMatchCompletion,
  type MatchCompletionPublication,
  type MatchCompletionRequirements
} from '../src/completion-publication'

const endedAt = '2026-08-20T21:00:00.000Z'
const emptyRequirements = (): MatchCompletionRequirements => ({
  rankedStats: false,
  warmUpProgress: false,
  abandonPenalty: false
})

const createUser = async (userId: string) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, endedAt, endedAt)
    .run()
}

const createActiveMatch = async (
  proposalId: string,
  mode = GameMode.PRACTICE_BOT,
  userIds: [string | null, string | null] = [null, null]
) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_matches
       (proposal_id, replay_id, mode, version, player1_principal,
        player2_principal, player1_user_id, player2_user_id,
        match_payload_json, server_address, status, created_at, updated_at)
     VALUES (?, ?, ?, 'completion-test', ?, ?, ?, ?, '{}', ?, 'active', ?, ?)`
  )
    .bind(
      proposalId,
      `replay-${proposalId}`,
      mode,
      `principal:${proposalId}:1`,
      `principal:${proposalId}:2`,
      userIds[0],
      userIds[1],
      `wss://example.test/${proposalId}`,
      endedAt,
      endedAt
    )
    .run()
  const row = await env.AUTH_DB.prepare(
    'SELECT id FROM multiplayer_matches WHERE proposal_id = ?'
  )
    .bind(proposalId)
    .first<{ id: number }>()
  return row!.id
}

const insertDeckPair = (proposalId: string) =>
  env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_authoritative_decks
         (proposal_id, player_index, deck_string, captured_at)
       VALUES (?, 0, 'SWxSTR02A', ?)`
    ).bind(proposalId, endedAt),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_authoritative_decks
         (proposal_id, player_index, deck_string, captured_at)
       VALUES (?, 1, 'SWxSTR02B', ?)`
    ).bind(proposalId, endedAt)
  ])

const insertProgression = (proposalId: string) =>
  env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_match_progression
       (proposal_id, player1_quest_progress_json,
        player2_quest_progress_json, rewards_json, processed_at)
     VALUES (?, '{}', '{}', '[[],[]]', ?)`
  )
    .bind(proposalId, endedAt)
    .run()

const insertExperience = (proposalId: string) =>
  env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_match_experience
       (proposal_id, player1_rewards_json, player2_rewards_json,
        processed_at, player_count, settlement_token)
     VALUES (?, '[]', '[]', ?, 0, ?)`
  )
    .bind(proposalId, endedAt, crypto.randomUUID())
    .run()

const insertUniversalReceipts = async (proposalId: string) => {
  await insertDeckPair(proposalId)
  await insertProgression(proposalId)
  await insertExperience(proposalId)
}

const publication = (
  proposalId: string,
  requirements = emptyRequirements()
): MatchCompletionPublication => ({
  proposalId,
  winner: 0,
  result: { winner: 0, status: 'COMPLETED', rewards: [[], []] },
  endedAt,
  requirements
})

const storedMatch = (proposalId: string) =>
  env.AUTH_DB.prepare(
    `SELECT status, winner_player, result_json, ended_at
     FROM multiplayer_matches WHERE proposal_id = ?`
  )
    .bind(proposalId)
    .first<{
      status: string
      winner_player: number | null
      result_json: string | null
      ended_at: string | null
    }>()

describe('match completion publication barrier', () => {
  it('keeps match history active until every universal receipt exists and rejects a conflicting retry', async () => {
    const proposalId = `completion-universal-${crypto.randomUUID()}`
    await createActiveMatch(proposalId)

    await expect(
      publishMatchCompletion(env.AUTH_DB, publication(proposalId))
    ).rejects.toThrow('publication requirements are incomplete')
    await insertDeckPair(proposalId)
    await expect(
      publishMatchCompletion(env.AUTH_DB, publication(proposalId))
    ).rejects.toThrow('publication requirements are incomplete')
    await insertProgression(proposalId)
    await expect(
      publishMatchCompletion(env.AUTH_DB, publication(proposalId))
    ).rejects.toThrow('publication requirements are incomplete')
    expect(await storedMatch(proposalId)).toMatchObject({
      status: 'active',
      winner_player: null,
      result_json: null,
      ended_at: null
    })

    await insertExperience(proposalId)
    await publishMatchCompletion(env.AUTH_DB, publication(proposalId))
    const stored = await storedMatch(proposalId)
    expect(stored).toEqual({
      status: 'ended',
      winner_player: 0,
      result_json: JSON.stringify(publication(proposalId).result),
      ended_at: endedAt
    })

    await publishMatchCompletion(env.AUTH_DB, publication(proposalId))
    await expect(
      publishMatchCompletion(env.AUTH_DB, {
        ...publication(proposalId),
        winner: 1,
        result: { winner: 1, status: 'COMPLETED', rewards: [[], []] }
      })
    ).rejects.toThrow('publication requirements are incomplete')
    expect(await storedMatch(proposalId)).toEqual(stored)
  })

  it('requires each applicable player mutation receipt', async () => {
    const rankedId = `completion-ranked-${crypto.randomUUID()}`
    await createActiveMatch(rankedId, GameMode.RANKED_CONSTRUCTED)
    await insertUniversalReceipts(rankedId)
    const ranked = publication(rankedId, {
      ...emptyRequirements(),
      rankedStats: true
    })
    await expect(publishMatchCompletion(env.AUTH_DB, ranked)).rejects.toThrow(
      'publication requirements are incomplete'
    )
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_stats_applied
         (proposal_id, processed_at, player1_rewards_json,
          player2_rewards_json)
       VALUES (?, ?, '[]', '[]')`
    )
      .bind(rankedId, endedAt)
      .run()
    await publishMatchCompletion(env.AUTH_DB, ranked)

    const warmUser = `completion-warm-user-${crypto.randomUUID()}`
    const warmId = `completion-warm-${crypto.randomUUID()}`
    await createUser(warmUser)
    await createActiveMatch(warmId, GameMode.PRACTICE_PVP, [warmUser, null])
    await insertUniversalReceipts(warmId)
    const warm = publication(warmId, {
      ...emptyRequirements(),
      warmUpProgress: true
    })
    await expect(publishMatchCompletion(env.AUTH_DB, warm)).rejects.toThrow(
      'publication requirements are incomplete'
    )
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_warmups_applied
         (proposal_id, credited_player, user_id, warm_ups_before,
          warm_ups_after, processed_at)
       VALUES (?, 0, ?, 0, 1, ?)`
    )
      .bind(warmId, warmUser, endedAt)
      .run()
    await publishMatchCompletion(env.AUTH_DB, warm)

    const abandonId = `completion-abandon-${crypto.randomUUID()}`
    await createActiveMatch(abandonId)
    await insertUniversalReceipts(abandonId)
    const abandon = publication(abandonId, {
      ...emptyRequirements(),
      abandonPenalty: true
    })
    await expect(publishMatchCompletion(env.AUTH_DB, abandon)).rejects.toThrow(
      'publication requirements are incomplete'
    )
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_abandon_penalties_applied
         (proposal_id, principal, release_version, applied_at)
       VALUES (?, 'principal:loser', 'completion-test', ?)`
    )
      .bind(abandonId, endedAt)
      .run()
    await publishMatchCompletion(env.AUTH_DB, abandon)
  })

  it('keeps a Conquest result unpublished while its matching run awaits cards', async () => {
    const player1 = `completion-conquest-one-${crypto.randomUUID()}`
    const player2 = `completion-conquest-two-${crypto.randomUUID()}`
    const proposalId = `completion-conquest-${crypto.randomUUID()}`
    await createUser(player1)
    await createUser(player2)
    const matchId = await createActiveMatch(
      proposalId,
      GameMode.CONQUEST_CONSTRUCTED,
      [player1, player2]
    )
    await insertUniversalReceipts(proposalId)
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_conquest_points
           (proposal_id, player1_points, player2_points,
            player1_rewards_json, player2_rewards_json, processed_at,
            player_count, settlement_token)
         VALUES (?, 0, 0, '[]', '[]', ?, 0, ?)`
      ).bind(proposalId, endedAt, crypto.randomUUID()),
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_match_conquest_progress
           (proposal_id, player1_result, player2_result, processed_at)
         VALUES (?, 'WIN', 'LOSS', ?)`
      ).bind(proposalId, endedAt),
      env.AUTH_DB.prepare(
        `INSERT INTO player_conquests
           (entry_key, user_id, status, nonce, mode, hero, deck_class,
            match_progress, created_at, ended_at)
         VALUES (?, ?, 'REWARDS_PENDING', 1, 'CONQUEST_CONSTRUCTED',
                 'test-hero', 'STR', ?, ?, ?)`
      ).bind(
        `entry-${proposalId}`,
        player1,
        JSON.stringify({ [matchId]: 'WIN' }),
        endedAt,
        endedAt
      )
    ])
    const conquest = publication(proposalId, {
      ...emptyRequirements(),
      conquestMode: GameMode.CONQUEST_CONSTRUCTED
    })

    await expect(publishMatchCompletion(env.AUTH_DB, conquest)).rejects.toThrow(
      'publication requirements are incomplete'
    )
    expect((await storedMatch(proposalId))?.status).toBe('active')

    await env.AUTH_DB.prepare(
      'DELETE FROM player_conquests WHERE entry_key = ?'
    )
      .bind(`entry-${proposalId}`)
      .run()
    await publishMatchCompletion(env.AUTH_DB, conquest)
    expect((await storedMatch(proposalId))?.status).toBe('ended')
  })
})
