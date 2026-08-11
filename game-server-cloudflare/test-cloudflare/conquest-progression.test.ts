import { env } from 'cloudflare:test'
import {
  ConquestMatchResult,
  ConquestStatus,
  GameMode
} from '@opensky/proto'
import { beforeEach, describe, expect, it } from 'vitest'

import { applyConquestProgress } from '../src/progression'

const USER_1 = 'conquest-progress-user-1'
const USER_2 = 'conquest-progress-user-2'

const setup = async (
  proposalId: string,
  progress: [Record<number, ConquestMatchResult>, Record<number, ConquestMatchResult>] = [
    {},
    {}
  ],
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
    ).bind(`entry-${proposalId}-1`, USER_1, mode, JSON.stringify(progress[0]), now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_conquests
         (entry_key, user_id, status, nonce, mode, hero, deck_class,
          match_progress, created_at)
       VALUES (?, ?, 'IN_PROGRESS', 1, ?, 'ADA', 'STR', ?, ?)`
    ).bind(`entry-${proposalId}-2`, USER_2, mode, JSON.stringify(progress[1]), now)
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
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_conquest_progress'),
    env.AUTH_DB.prepare('DELETE FROM player_conquests'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
})

describe('source Conquest authoritative match progression', () => {
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
      { 10: ConquestMatchResult.WIN, 11: ConquestMatchResult.WIN },
      { 10: ConquestMatchResult.WIN }
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
    expect(JSON.parse((await conquests()).results[0].match_progress)).toEqual({})
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count
         FROM multiplayer_match_conquest_progress WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first<{ count: number }>()
    ).toEqual({ count: 0 })
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
