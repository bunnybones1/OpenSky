import { env } from 'cloudflare:test'
import {
  ConquestMatchResult,
  ConquestStatus,
  GameMode,
  MatchStatus,
  RewardType
} from '@opensky/proto'
import { beforeEach, describe, expect, it } from 'vitest'

import { applyConquestProgress } from '../src/progression'
import { applyConquestPoints } from '../src/conquest-points'
import { settleConquestRewardsForMatch } from '../src/conquest-settlement'

const USER_1 = 'conquest-progress-user-1'
const USER_2 = 'conquest-progress-user-2'

const setup = async (
  proposalId: string,
  progress: [
    Record<number, ConquestMatchResult>,
    Record<number, ConquestMatchResult>
  ] = [{}, {}],
  mode = GameMode.CONQUEST_CONSTRUCTED
) => {
  const now = '2026-08-11T12:00:00.000Z'
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Conquest One', 'conquest-one@example.com', ?, ?)`
    ).bind(USER_1, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Conquest Two', 'conquest-two@example.com', ?, ?)`
    ).bind(USER_2, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (id, user_id, created_at) VALUES (1, ?, ?)`
    ).bind(USER_1, now),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (id, user_id, created_at) VALUES (2, ?, ?)`
    ).bind(USER_2, now),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       VALUES (?, ?, ?, 'test', '0x1111111111111111111111111111111111111111',
               '0x2222222222222222222222222222222222222222', ?, ?, '{}',
               'active', ?, ?)`
    ).bind(proposalId, `replay-${proposalId}`, mode, USER_1, USER_2, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at)
       VALUES (?, ?, 'IN_PROGRESS', 1, ?, 'ADA', 'STR', ?, ?)`
    ).bind(
      `entry-${proposalId}-1`,
      USER_1,
      mode,
      JSON.stringify(progress[0]),
      now
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at)
       VALUES (?, ?, 'IN_PROGRESS', 1, ?, 'ADA', 'STR', ?, ?)`
    ).bind(
      `entry-${proposalId}-2`,
      USER_2,
      mode,
      JSON.stringify(progress[1]),
      now
    )
  ])
  return env.AUTH_DB.prepare(
    'SELECT id FROM multiplayer_matches WHERE proposal_id = ?'
  )
    .bind(proposalId)
    .first<{ id: number }>()
}

const conquests = () =>
  env.AUTH_DB.prepare(
    `SELECT user_id, status, match_progress, ended_at
     FROM player_conquests ORDER BY user_id`
  ).all<{
    user_id: string
    status: ConquestStatus
    match_progress: string
    ended_at: string | null
  }>()

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_deck_ranks_applied'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_rank_wins'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_ranks'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_conquest_progress'),
    env.AUTH_DB.prepare('DELETE FROM player_conquest_points'),
    env.AUTH_DB.prepare('DELETE FROM player_conquests'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
})

describe('source Conquest authoritative match progression', () => {
  it('awards source match, owned-card, and hero-skin points exactly once', async () => {
    const proposalId = 'conquest-points-completed'
    await setup(proposalId)
    const now = '2026-08-11T12:00:30.000Z'
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare(
        `UPDATE multiplayer_matches SET match_payload_json = ?
         WHERE proposal_id = ?`
      ).bind(
        JSON.stringify({
          match: {
            player1: { privateSeed: { cards: [10, 11, 10] } },
            player2: { privateSeed: { cards: [] } }
          }
        }),
        proposalId
      ),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_SILVER_CARDS', 10, 1, 0, 'test', ?, ?)`
      ).bind(USER_1, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_GOLD_CARDS', 11, 1, 0, 'test', ?, ?)`
      ).bind(USER_1, now, now),
      env.AUTH_DB.prepare(
        `INSERT INTO player_items
           (user_id, item_type, token_id, balance, is_new, unlock_source,
            created_at, updated_at)
         VALUES (?, 'SW_HERO_SKINS', 1, 1, 0, 'test', ?, ?)`
      ).bind(USER_1, now, now)
    ])

    const first = await applyConquestPoints(
      env.AUTH_DB,
      proposalId,
      0,
      MatchStatus.COMPLETED,
      5,
      now
    )
    expect(first.applied).toBe(true)
    expect(first.points).toEqual([10, 4])
    expect(first.rewards[0][0]).toMatchObject({
      accountID: 1,
      type: RewardType.CONQUEST_POINTS,
      conquestV2TreasureProgress: {
        beforeMatch: {
          treasureLevel: 0,
          treasurePoints: 0,
          treasurePointsRequired: 250
        },
        afterMatch: {
          treasureLevel: 0,
          treasurePoints: 10,
          treasurePointsRequired: 240
        }
      }
    })
    expect(first.rewards[1][0].accountID).toBe(2)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT user_id, event_id, current_points, total_points
         FROM player_conquest_points ORDER BY user_id`
      ).all()
    ).toMatchObject({
      results: [
        { user_id: USER_1, event_id: 2, current_points: 10, total_points: 10 },
        { user_id: USER_2, event_id: 2, current_points: 4, total_points: 4 }
      ]
    })

    const retry = await applyConquestPoints(
      env.AUTH_DB,
      proposalId,
      1,
      MatchStatus.ABANDONED,
      9,
      '2026-08-11T12:01:30.000Z'
    )
    expect(retry).toEqual({ ...first, applied: false })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT SUM(current_points) AS points FROM player_conquest_points'
      ).first<{ points: number }>()
    ).toEqual({ points: 14 })
  })

  it('only awards a short abandoned match to its winner', async () => {
    const proposalId = 'conquest-points-short-abandon'
    await setup(proposalId)
    const receipt = await applyConquestPoints(
      env.AUTH_DB,
      proposalId,
      0,
      MatchStatus.ABANDONED,
      7,
      '2026-08-11T12:01:45.000Z'
    )

    expect(receipt.points).toEqual([4, 0])
    expect(receipt.rewards.map(rewards => rewards.length)).toEqual([1, 0])
  })

  it.each([MatchStatus.FORFEITED, MatchStatus.ABANDONED])(
    'awards both players at the source turn-eight boundary for %s matches',
    async status => {
      const proposalId = `conquest-points-turn-eight-${status.toLowerCase()}`
      await setup(proposalId)
      const receipt = await applyConquestPoints(
        env.AUTH_DB,
        proposalId,
        0,
        status,
        8,
        '2026-08-11T12:01:46.000Z'
      )

      expect(receipt.points).toEqual([4, 4])
      expect(receipt.rewards.map(rewards => rewards.length)).toEqual([1, 1])
      expect(
        await env.AUTH_DB.prepare(
          `SELECT user_id, current_points, total_points
           FROM player_conquest_points ORDER BY user_id`
        ).all()
      ).toMatchObject({
        results: [
          { user_id: USER_1, current_points: 4, total_points: 4 },
          { user_id: USER_2, current_points: 4, total_points: 4 }
        ]
      })
    }
  )

  it('awards no points without a winner even at the turn boundary', async () => {
    const proposalId = 'conquest-points-draw'
    await setup(proposalId)
    const receipt = await applyConquestPoints(
      env.AUTH_DB,
      proposalId,
      undefined,
      MatchStatus.COMPLETED,
      8,
      '2026-08-11T12:01:47.000Z'
    )

    expect(receipt.points).toEqual([0, 0])
    expect(receipt.rewards).toEqual([[], []])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_conquest_points`
      ).first('count')
    ).toBe(0)
  })

  it('serializes simultaneous point awards at the source event cap', async () => {
    const firstProposal = 'conquest-points-cap-one'
    const secondProposal = 'conquest-points-cap-two'
    await setup(firstProposal)
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       SELECT ?, ?, mode, version, player1_principal, player2_principal,
              player1_user_id, player2_user_id, match_payload_json, status,
              created_at, updated_at
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
      .bind(secondProposal, `replay-${secondProposal}`, firstProposal)
      .run()
    await env.AUTH_DB.batch(
      [USER_1, USER_2].map(userId =>
        env.AUTH_DB.prepare(
          `INSERT INTO player_conquest_points
             (user_id, event_id, current_points, total_points, updated_at)
           VALUES (?, 2, 13747, 13747, ?)`
        ).bind(userId, '2026-08-11T12:01:30.000Z')
      )
    )

    const receipts = await Promise.all(
      [firstProposal, secondProposal].map(proposalId =>
        applyConquestPoints(
          env.AUTH_DB,
          proposalId,
          0,
          MatchStatus.COMPLETED,
          5,
          '2026-08-11T12:01:31.000Z'
        )
      )
    )
    expect(receipts.every(receipt => receipt.applied)).toBe(true)
    expect(
      receipts.map(receipt => receipt.points[0]).sort((a, b) => a - b)
    ).toEqual([0, 3])
    expect(
      receipts.map(receipt => receipt.points[1]).sort((a, b) => a - b)
    ).toEqual([0, 3])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT user_id, current_points, total_points
         FROM player_conquest_points ORDER BY user_id`
      ).all()
    ).toMatchObject({
      results: [
        { user_id: USER_1, current_points: 13750, total_points: 13750 },
        { user_id: USER_2, current_points: 13750, total_points: 13750 }
      ]
    })
    const transitions = await env.AUTH_DB.prepare(
      `SELECT user_id, before_points, awarded_points, after_points
       FROM multiplayer_match_conquest_point_players
       WHERE proposal_id IN (?, ?) ORDER BY user_id, before_points`
    )
      .bind(firstProposal, secondProposal)
      .all()
    expect(transitions.results).toMatchObject([
      {
        user_id: USER_1,
        before_points: 13747,
        awarded_points: 3,
        after_points: 13750
      },
      {
        user_id: USER_1,
        before_points: 13750,
        awarded_points: 0,
        after_points: 13750
      },
      {
        user_id: USER_2,
        before_points: 13747,
        awarded_points: 3,
        after_points: 13750
      },
      {
        user_id: USER_2,
        before_points: 13750,
        awarded_points: 0,
        after_points: 13750
      }
    ])
  })

  it('coalesces simultaneous retries into one Conquest point award', async () => {
    const proposalId = 'conquest-points-duplicate'
    await setup(proposalId)
    const settle = () =>
      applyConquestPoints(
        env.AUTH_DB,
        proposalId,
        0,
        MatchStatus.COMPLETED,
        5,
        '2026-08-11T12:01:32.000Z'
      )

    const receipts = await Promise.all([settle(), settle()])
    expect(receipts.map(receipt => receipt.applied).sort()).toEqual([
      false,
      true
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT user_id, current_points FROM player_conquest_points
         ORDER BY user_id`
      ).all()
    ).toMatchObject({
      results: [
        { user_id: USER_1, current_points: 4 },
        { user_id: USER_2, current_points: 4 }
      ]
    })
  })

  it('rolls back point balances when final receipt persistence fails', async () => {
    const proposalId = 'conquest-points-rollback'
    await setup(proposalId)
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER test_conquest_point_failure
       BEFORE INSERT ON multiplayer_match_conquest_points
       BEGIN
         SELECT RAISE(ABORT, 'injected Conquest point failure');
       END`
    ).run()

    await expect(
      applyConquestPoints(
        env.AUTH_DB,
        proposalId,
        0,
        MatchStatus.COMPLETED,
        5,
        '2026-08-11T12:01:33.000Z'
      )
    ).rejects.toThrow('injected Conquest point failure')
    await env.AUTH_DB.prepare('DROP TRIGGER test_conquest_point_failure').run()
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM player_conquest_points`
      ).first('count')
    ).toBe(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_match_conquest_point_players WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('count')
    ).toBe(0)
  })

  it('records a win and zero-win completion exactly once', async () => {
    const proposalId = 'conquest-progress-first-win'
    const match = await setup(proposalId)
    const processedAt = '2026-08-11T12:01:00.000Z'

    expect(
      await applyConquestProgress(env.AUTH_DB, proposalId, 0, processedAt)
    ).toEqual({
      applied: true,
      results: [ConquestMatchResult.WIN, ConquestMatchResult.LOSS],
      processedAt
    })
    const first = await conquests()
    expect(JSON.parse(first.results[0].match_progress)).toEqual({
      [match!.id]: ConquestMatchResult.WIN
    })
    expect(first.results[0].status).toBe(ConquestStatus.IN_PROGRESS)
    expect(first.results[0].ended_at).toBeNull()
    expect(JSON.parse(first.results[1].match_progress)).toEqual({
      [match!.id]: ConquestMatchResult.LOSS
    })
    expect(first.results[1].status).toBe(ConquestStatus.COMPLETED)
    expect(first.results[1].ended_at).toBe(processedAt)

    expect(
      await applyConquestProgress(
        env.AUTH_DB,
        proposalId,
        1,
        '2026-08-11T12:02:00.000Z'
      )
    ).toEqual({
      applied: false,
      results: [ConquestMatchResult.WIN, ConquestMatchResult.LOSS],
      processedAt
    })
    expect((await conquests()).results).toEqual(first.results)
  })

  it('moves earned-reward runs to pending on a third win or later loss', async () => {
    const proposalId = 'conquest-progress-terminal-rewards'
    const match = await setup(proposalId, [
      {
        1_000_010: ConquestMatchResult.WIN,
        1_000_011: ConquestMatchResult.WIN
      },
      { 1_000_010: ConquestMatchResult.WIN }
    ])
    const processedAt = '2026-08-11T12:03:00.000Z'

    await applyConquestProgress(env.AUTH_DB, proposalId, 0, processedAt)
    const rows = (await conquests()).results
    expect(rows.map(row => row.status)).toEqual([
      ConquestStatus.REWARDS_PENDING,
      ConquestStatus.REWARDS_PENDING
    ])
    expect(JSON.parse(rows[0].match_progress)[match!.id]).toBe(
      ConquestMatchResult.WIN
    )
    expect(JSON.parse(rows[1].match_progress)[match!.id]).toBe(
      ConquestMatchResult.LOSS
    )
    expect(rows.map(row => row.ended_at)).toEqual([processedAt, processedAt])
  })

  it('completes the source default branch when terminal progress exceeds three wins', async () => {
    const proposalId = 'conquest-progress-fourth-win'
    const match = await setup(proposalId, [
      {
        10_001: ConquestMatchResult.WIN,
        10_002: ConquestMatchResult.WIN,
        10_003: ConquestMatchResult.WIN
      },
      {}
    ])
    const processedAt = '2026-08-11T12:03:30.000Z'

    await applyConquestProgress(env.AUTH_DB, proposalId, 0, processedAt)
    const rows = (await conquests()).results
    expect(rows.map(row => row.status)).toEqual([
      ConquestStatus.COMPLETED,
      ConquestStatus.COMPLETED
    ])
    expect(JSON.parse(rows[0].match_progress)).toEqual({
      10_001: ConquestMatchResult.WIN,
      10_002: ConquestMatchResult.WIN,
      10_003: ConquestMatchResult.WIN,
      [match!.id]: ConquestMatchResult.WIN
    })
    expect(JSON.parse(rows[1].match_progress)).toEqual({
      [match!.id]: ConquestMatchResult.LOSS
    })
    expect(rows.map(row => row.ended_at)).toEqual([processedAt, processedAt])
    await expect(
      settleConquestRewardsForMatch(
        env.AUTH_DB,
        proposalId,
        processedAt,
        () => {
          throw new Error('the source default branch must not draw rewards')
        }
      )
    ).resolves.toEqual([[], []])
  })

  it('keeps both runs active after a draw', async () => {
    const proposalId = 'conquest-progress-draw'
    const match = await setup(proposalId)

    await applyConquestProgress(
      env.AUTH_DB,
      proposalId,
      undefined,
      '2026-08-11T12:04:00.000Z'
    )
    const rows = (await conquests()).results
    expect(rows.map(row => row.status)).toEqual([
      ConquestStatus.IN_PROGRESS,
      ConquestStatus.IN_PROGRESS
    ])
    expect(rows.map(row => JSON.parse(row.match_progress)[match!.id])).toEqual([
      ConquestMatchResult.DRAW,
      ConquestMatchResult.DRAW
    ])
    expect(rows.map(row => row.ended_at)).toEqual([null, null])
  })

  it('fails closed before changing either player when an active run is missing', async () => {
    const proposalId = 'conquest-progress-missing-run'
    await setup(proposalId)
    await env.AUTH_DB.prepare('DELETE FROM player_conquests WHERE user_id = ?')
      .bind(USER_2)
      .run()

    await expect(
      applyConquestProgress(
        env.AUTH_DB,
        proposalId,
        0,
        '2026-08-11T12:04:30.000Z'
      )
    ).rejects.toThrow('there is no conquest in progress')
    expect(JSON.parse((await conquests()).results[0].match_progress)).toEqual(
      {}
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_match_conquest_progress WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first<{ count: number }>()
    ).toEqual({ count: 0 })
  })

  it.each([
    ['an array', '[]'],
    ['a nonnumeric match ID', '{"not-a-match":"WIN"}'],
    ['an out-of-range match ID', '{"18446744073709551616":"WIN"}'],
    ['a non-string match result', '{"10":1}']
  ])(
    'fails closed before changing either player for %s progress',
    async (_description, malformedProgress) => {
      const proposalId = `conquest-progress-malformed-${malformedProgress.length}`
      await setup(proposalId)
      await env.AUTH_DB.prepare(
        `UPDATE player_conquests SET match_progress = ? WHERE user_id = ?`
      )
        .bind(malformedProgress, USER_2)
        .run()
      const before = (await conquests()).results

      await expect(
        applyConquestProgress(
          env.AUTH_DB,
          proposalId,
          0,
          '2026-08-11T12:04:45.000Z'
        )
      ).rejects.toThrow('Conquest match progress is malformed')
      expect((await conquests()).results).toEqual(before)
      expect(
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) AS count
           FROM multiplayer_match_conquest_progress WHERE proposal_id = ?`
        )
          .bind(proposalId)
          .first<{ count: number }>()
      ).toEqual({ count: 0 })
    }
  )

  it('rejects invalid JSON at the D1 source boundary', async () => {
    const proposalId = 'conquest-progress-invalid-json'
    await setup(proposalId)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_conquests SET match_progress = '[' WHERE user_id = ?`
      )
        .bind(USER_2)
        .run()
    ).rejects.toThrow('Conquest match progress must be valid JSON')
    expect(JSON.parse((await conquests()).results[1].match_progress)).toEqual(
      {}
    )
  })

  it('matches source uint64-key and unknown-enum normalization', async () => {
    const proposalId = 'conquest-progress-source-normalization'
    const match = await setup(proposalId)
    await env.AUTH_DB.prepare(
      `UPDATE player_conquests SET match_progress = ? WHERE user_id = ?`
    )
      .bind('{"+01":"FUTURE_VALUE","0":"DRAW","2":null}', USER_1)
      .run()

    await applyConquestProgress(
      env.AUTH_DB,
      proposalId,
      0,
      '2026-08-11T12:04:50.000Z'
    )
    expect(JSON.parse((await conquests()).results[0].match_progress)).toEqual({
      0: ConquestMatchResult.DRAW,
      1: ConquestMatchResult.UNKNOWN,
      2: ConquestMatchResult.UNKNOWN,
      [match!.id]: ConquestMatchResult.WIN
    })
  })

  it('matches the source nil-map behavior for JSON null progress', async () => {
    const proposalId = 'conquest-progress-null-map'
    const match = await setup(proposalId)
    await env.AUTH_DB.prepare(
      `UPDATE player_conquests SET match_progress = 'null' WHERE user_id = ?`
    )
      .bind(USER_1)
      .run()

    await applyConquestProgress(
      env.AUTH_DB,
      proposalId,
      0,
      '2026-08-11T12:04:55.000Z'
    )
    expect(JSON.parse((await conquests()).results[0].match_progress)).toEqual({
      [match!.id]: ConquestMatchResult.WIN
    })
  })

  it('does nothing for non-Conquest matches', async () => {
    const proposalId = 'conquest-progress-ranked'
    await setup(proposalId)
    await env.AUTH_DB.prepare(
      'UPDATE multiplayer_matches SET mode = ? WHERE proposal_id = ?'
    )
      .bind(GameMode.RANKED_CONSTRUCTED, proposalId)
      .run()

    expect(
      await applyConquestProgress(
        env.AUTH_DB,
        proposalId,
        0,
        '2026-08-11T12:05:00.000Z'
      )
    ).toMatchObject({ applied: false })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_match_conquest_progress WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first<{ count: number }>()
    ).toEqual({ count: 0 })
  })
})
