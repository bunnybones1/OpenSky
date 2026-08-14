import { env } from 'cloudflare:test'
import { GameMode, MatchStatus } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { applyConquestScores } from '../src/conquest-score'

const SEASON = 126
const NOW = '2026-08-13T12:00:00.000Z'

interface Fixture {
  proposalId: string
  user1: string
  user2: string
}

const setupMatch = async (
  suffix: string,
  options: {
    mode?: GameMode
    user1?: string
    user2?: string
    createUsers?: boolean
    processedAt?: string
  } = {}
): Promise<Fixture> => {
  const proposalId = `conquest-score-${suffix}`
  const user1 = options.user1 ?? `${proposalId}-one`
  const user2 = options.user2 ?? `${proposalId}-two`
  const processedAt = options.processedAt ?? NOW
  const statements: D1PreparedStatement[] = []
  if (options.createUsers !== false) {
    statements.push(
      env.AUTH_DB.prepare(
        `INSERT INTO users
           (id, display_name, primary_email, created_at, updated_at)
         VALUES (?, 'Conquest Score One', ?, ?, ?),
                (?, 'Conquest Score Two', ?, ?, ?)`
      ).bind(
        user1,
        `${user1}@example.com`,
        processedAt,
        processedAt,
        user2,
        `${user2}@example.com`,
        processedAt,
        processedAt
      )
    )
  }
  statements.push(
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       VALUES (?, ?, ?, 'test',
               '0x1111111111111111111111111111111111111111',
               '0x2222222222222222222222222222222222222222',
               ?, ?, '{}', 'active', ?, ?)`
    ).bind(
      proposalId,
      `replay-${proposalId}`,
      options.mode ?? GameMode.CONQUEST_CONSTRUCTED,
      user1,
      user2,
      processedAt,
      processedAt
    )
  )
  await env.AUTH_DB.batch(statements)
  return { proposalId, user1, user2 }
}

const addEndedMatch = async (
  fixture: Fixture,
  index: number,
  options: {
    mode?: GameMode
    winner?: 0 | 1
    status?: MatchStatus
    endedAt?: string
  } = {}
) => {
  const proposalId = `${fixture.proposalId}-history-${index}`
  const endedAt =
    options.endedAt ??
    new Date(Date.parse(NOW) - (index + 1) * 60_000).toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_matches
       (proposal_id, replay_id, mode, version, player1_principal,
        player2_principal, player1_user_id, player2_user_id,
        match_payload_json, result_json, status, winner_player,
        created_at, ended_at, updated_at)
     VALUES (?, ?, ?, 'test',
             '0x1111111111111111111111111111111111111111',
             '0x2222222222222222222222222222222222222222',
             ?, ?, '{}', ?, 'ended', ?, ?, ?, ?)`
  )
    .bind(
      proposalId,
      `replay-${proposalId}`,
      options.mode ?? GameMode.CONQUEST_CONSTRUCTED,
      fixture.user1,
      fixture.user2,
      JSON.stringify({ status: options.status ?? MatchStatus.COMPLETED }),
      options.winner ?? null,
      new Date(Date.parse(endedAt) - 30_000).toISOString(),
      endedAt,
      endedAt
    )
    .run()
}

const stats = (fixture: Fixture) =>
  env.AUTH_DB.prepare(
    `SELECT user_id, score, win_count, loss_count, tie_count, updated_at
     FROM player_account_stats
     WHERE user_id IN (?, ?) AND game_mode = 'CONQUEST_CONSTRUCTED'
       AND season = ?
     ORDER BY user_id`
  )
    .bind(fixture.user1, fixture.user2, SEASON)
    .all()

describe('source Conquest rolling matchmaking scores', () => {
  it('uses only the latest 20 completed decisive outcomes and receipts retries', async () => {
    const fixture = await setupMatch('history-cap')
    for (let index = 0; index < 20; index++) {
      await addEndedMatch(fixture, index, { winner: 1 })
    }

    const first = await applyConquestScores(
      env.AUTH_DB,
      fixture.proposalId,
      SEASON,
      0,
      MatchStatus.COMPLETED,
      NOW
    )
    // The current win plus the 19 newest losses displace the oldest loss.
    expect(first).toEqual({
      applied: true,
      scores: [-18, 18],
      processedAt: NOW
    })
    expect((await stats(fixture)).results).toEqual([
      {
        user_id: fixture.user1,
        score: -18,
        win_count: 0,
        loss_count: 0,
        tie_count: 0,
        updated_at: NOW
      },
      {
        user_id: fixture.user2,
        score: 18,
        win_count: 0,
        loss_count: 0,
        tie_count: 0,
        updated_at: NOW
      }
    ])

    const retry = await applyConquestScores(
      env.AUTH_DB,
      fixture.proposalId,
      SEASON,
      1,
      MatchStatus.ABANDONED,
      '2026-08-13T12:01:00.000Z'
    )
    expect(retry).toEqual({ ...first, applied: false })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE multiplayer_match_conquest_scores SET player1_score = 20
         WHERE proposal_id = ?`
      )
        .bind(fixture.proposalId)
        .run()
    ).rejects.toThrow('Conquest match score receipts are immutable')
    await expect(
      env.AUTH_DB.prepare(
        'DELETE FROM multiplayer_match_conquest_scores WHERE proposal_id = ?'
      )
        .bind(fixture.proposalId)
        .run()
    ).rejects.toThrow('Conquest match score receipts are immutable')
  })

  it('excludes draws, abandons, forfeits, and the other Conquest mode', async () => {
    const fixture = await setupMatch('eligibility')
    await addEndedMatch(fixture, 1, { winner: 0 })
    await addEndedMatch(fixture, 2, { winner: 0 })
    await addEndedMatch(fixture, 3, {
      winner: 1,
      status: MatchStatus.ABANDONED
    })
    await addEndedMatch(fixture, 4, {
      winner: 1,
      status: MatchStatus.FORFEITED
    })
    await addEndedMatch(fixture, 5)
    await addEndedMatch(fixture, 6, {
      mode: GameMode.CONQUEST_DISCOVERY,
      winner: 1
    })

    const result = await applyConquestScores(
      env.AUTH_DB,
      fixture.proposalId,
      SEASON,
      1,
      MatchStatus.FORFEITED,
      NOW
    )
    expect(result.scores).toEqual([2, -2])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT game_mode, match_status, winner_player
         FROM multiplayer_match_conquest_scores WHERE proposal_id = ?`
      )
        .bind(fixture.proposalId)
        .first()
    ).toEqual({
      game_mode: GameMode.CONQUEST_CONSTRUCTED,
      match_status: MatchStatus.FORFEITED,
      winner_player: 1
    })
  })

  it('serializes simultaneous scores and sees a prior unended receipt', async () => {
    const first = await setupMatch('coordinator-one')
    const second = await setupMatch('coordinator-two', {
      user1: first.user1,
      user2: first.user2,
      createUsers: false
    })
    const coordinator = env.DECK_RANK_COORDINATOR.getByName('current-library')
    const apply = (proposalId: string) =>
      coordinator.fetch('https://deck-rank-coordinator/internal/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cloud-weasel-internal-auth': 'game-server-test-secret'
        },
        body: JSON.stringify({
          proposalId,
          season: SEASON,
          winner: 0,
          status: MatchStatus.COMPLETED,
          processedAt: NOW
        })
      })
    const responses = await Promise.all([
      apply(first.proposalId),
      apply(second.proposalId)
    ])
    expect(responses.map(response => response.status)).toEqual([200, 200])
    expect((await stats(first)).results).toMatchObject([
      { user_id: first.user1, score: 2 },
      { user_id: first.user2, score: -2 }
    ])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_match_conquest_scores
         WHERE proposal_id IN (?, ?)`
      )
        .bind(first.proposalId, second.proposalId)
        .first('count')
    ).toBe(2)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_matches
         WHERE proposal_id IN (?, ?) AND status = 'active'`
      )
        .bind(first.proposalId, second.proposalId)
        .first('count')
    ).toBe(2)
  })

  it('does not write for other modes and rolls a failed score batch back', async () => {
    const practice = await setupMatch('practice', {
      mode: GameMode.PRACTICE_PVP
    })
    expect(
      await applyConquestScores(
        env.AUTH_DB,
        practice.proposalId,
        SEASON,
        0,
        MatchStatus.COMPLETED,
        NOW
      )
    ).toEqual({ applied: false, scores: [0, 0], processedAt: NOW })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_match_conquest_scores
         WHERE proposal_id = ?`
      )
        .bind(practice.proposalId)
        .first('count')
    ).toBe(0)

    const conquest = await setupMatch('rollback')
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_conquest_score_update
       BEFORE UPDATE ON player_account_stats
       BEGIN SELECT RAISE(ABORT, 'reject Conquest score update'); END`
    ).run()
    try {
      await expect(
        applyConquestScores(
          env.AUTH_DB,
          conquest.proposalId,
          SEASON,
          0,
          MatchStatus.COMPLETED,
          NOW
        )
      ).rejects.toThrow('reject Conquest score update')
    } finally {
      await env.AUTH_DB.prepare(
        'DROP TRIGGER IF EXISTS reject_conquest_score_update'
      ).run()
    }
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_match_conquest_scores
         WHERE proposal_id = ?`
      )
        .bind(conquest.proposalId)
        .first('count')
    ).toBe(0)
    expect((await stats(conquest)).results).toHaveLength(0)
  })
})
