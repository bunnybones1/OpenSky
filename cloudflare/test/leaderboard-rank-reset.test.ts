import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { applyLeaderboardRankReset } from '../src/leaderboard-rank-reset'
import { PlayerRepository } from '../src/player'

const SEASON = 20
let scheduleVersion = 500

const setupPlayer = async (userId: string, status = 'ACTIVE') => {
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(userId, userId, `${userId}@example.com`, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
  if (status !== 'ACTIVE') {
    await env.AUTH_DB.prepare(
      `UPDATE player_account_settings SET account_status = ? WHERE user_id = ?`
    )
      .bind(status, userId)
      .run()
  }
}

const addStat = async (
  userId: string,
  values: {
    mode?: string
    score: number
    rank: string
    stage: string
    state: number[] | string
    weeks?: Array<number | null>
  }
) => {
  const now = new Date().toISOString()
  const weeks = values.weeks ?? [null, null, null, null]
  await env.AUTH_DB.prepare(
    `INSERT INTO player_account_stats
       (user_id, game_mode, season, score, player_rank, player_rank_stage,
        player_rank_state, week1_score, week2_score, week3_score, week4_score,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      userId,
      values.mode ?? 'RANKED_CONSTRUCTED',
      SEASON,
      values.score,
      values.rank,
      values.stage,
      typeof values.state === 'string'
        ? values.state
        : JSON.stringify(values.state),
      weeks[0],
      weeks[1],
      weeks[2],
      weeks[3],
      now,
      now
    )
    .run()
}

const makeCycle = async (week: number) => {
  scheduleVersion += 1
  const now = new Date(Date.UTC(2026, 0, scheduleVersion - 500)).toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO leaderboard_reward_schedule_versions
       (version, enabled, starts_at, reason, created_at)
     VALUES (?, 0, ?, 'rank reset test', ?)`
  )
    .bind(scheduleVersion, now, now)
    .run()
  const result = await env.AUTH_DB.prepare(
    `INSERT INTO leaderboard_reward_cycles
       (schedule_version, scheduled_at, season, week, random_seed, status,
        attempt_count, started_at)
     VALUES (?, ?, ?, ?, ?, 'DELIVERING', 0, ?)`
  )
    .bind(scheduleVersion, now, SEASON, week, crypto.randomUUID(), now)
    .run()
  return Number(result.meta.last_row_id)
}

describe('source leaderboard rank resets', () => {
  it('applies the weekly snapshot, selective floors, RD inflation, and top 100 once', async () => {
    const players = [
      ['reset-soft-trainee', 489, 'TRAINEE', 'STAGE_II', 100],
      ['reset-soft-expert', 970, 'EXPERT', 'STAGE_I', 350],
      ['reset-soft-master', 1_250, 'MASTER', 'STAGE_NONE', 100],
      ['reset-soft-grand-1', 1_500, 'GRANDWEAVER', 'STAGE_NONE', 100],
      ['reset-soft-grand-2', 1_600, 'GRANDWEAVER', 'STAGE_NONE', 100]
    ] as const
    for (const [userId, score, rank, stage, deviation] of players) {
      await setupPlayer(userId)
      await addStat(userId, {
        score,
        rank,
        stage,
        state: [-1, 1_750, deviation, score]
      })
    }
    const cycleId = await makeCycle(2)

    expect(
      await applyLeaderboardRankReset(
        env.AUTH_DB,
        cycleId,
        new Date('2026-02-01T00:00:00.000Z')
      )
    ).toBe('applied')

    const rows = await env.AUTH_DB.prepare(
      `SELECT user_id, score, player_rank, player_rank_stage,
              player_rank_state, week2_score
       FROM player_account_stats
       WHERE season = ? AND user_id LIKE 'reset-soft-%'
       ORDER BY user_id`
    )
      .bind(SEASON)
      .all<{
        user_id: string
        score: number
        player_rank: string
        player_rank_stage: string
        player_rank_state: string
        week2_score: number
      }>()
    const byUser = new Map(rows.results.map(row => [row.user_id, row]))
    expect(byUser.get('reset-soft-trainee')).toMatchObject({
      score: 489,
      player_rank: 'TRAINEE',
      player_rank_stage: 'STAGE_II',
      week2_score: 489
    })
    expect(
      JSON.parse(byUser.get('reset-soft-trainee')!.player_rank_state)
    ).toEqual([-1, 1_750, 125, 489])
    expect(
      JSON.parse(byUser.get('reset-soft-expert')!.player_rank_state)[2]
    ).toBe(350)
    expect(byUser.get('reset-soft-master')).toMatchObject({
      score: 1_250,
      player_rank: 'GRANDWEAVER'
    })
    expect(byUser.get('reset-soft-grand-1')).toMatchObject({
      score: 1_400,
      player_rank: 'GRANDWEAVER',
      week2_score: 1_500
    })
    expect(
      JSON.parse(byUser.get('reset-soft-grand-1')!.player_rank_state)[3]
    ).toBe(1_400)
    expect(byUser.get('reset-soft-grand-2')).toMatchObject({
      score: 1_400,
      player_rank: 'GRANDWEAVER',
      week2_score: 1_600
    })

    const stateBeforeRetry = byUser.get('reset-soft-trainee')!.player_rank_state
    expect(await applyLeaderboardRankReset(env.AUTH_DB, cycleId)).toBe(
      'already_applied'
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT player_rank_state FROM player_account_stats
         WHERE user_id = 'reset-soft-trainee' AND game_mode =
               'RANKED_CONSTRUCTED' AND season = ?`
      )
        .bind(SEASON)
        .first('player_rank_state')
    ).toBe(stateBeforeRetry)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT reset_kind, season, week
         FROM leaderboard_rank_reset_receipts WHERE cycle_id = ?`
      )
        .bind(cycleId)
        .first()
    ).toEqual({ reset_kind: 'SOFT', season: SEASON, week: 2 })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT status FROM leaderboard_reward_cycles WHERE id = ?`
      )
        .bind(cycleId)
        .first('status')
    ).toBe('COMPLETED')
  })

  it('carries source hard-reset floors and Glicko transforms into the next season', async () => {
    const players = [
      [
        'reset-hard-trainee',
        489,
        'TRAINEE',
        'STAGE_II',
        1_000,
        [300, 400, null, null]
      ],
      [
        'reset-hard-expert',
        970,
        'EXPERT',
        'STAGE_I',
        2_500,
        [900, 950, 970, null]
      ],
      [
        'reset-hard-master',
        1_200,
        'MASTER',
        'STAGE_NONE',
        1_750,
        [1_100, 1_150, 1_175, null]
      ],
      [
        'reset-hard-grand',
        1_400,
        'GRANDWEAVER',
        'STAGE_NONE',
        2_000,
        [1_300, 1_350, 1_400, null]
      ]
    ] as const
    for (const [userId, score, rank, stage, rating, weeks] of players) {
      await setupPlayer(userId)
      await addStat(userId, {
        score,
        rank,
        stage,
        state: [-1, rating, 100, score],
        weeks: [...weeks]
      })
    }
    await setupPlayer('reset-hard-banned', 'BANNED')
    await addStat('reset-hard-banned', {
      score: 1_600,
      rank: 'GRANDWEAVER',
      stage: 'STAGE_NONE',
      state: [-1, 50, 100, 1_600],
      weeks: [1_600, 1_600, 1_600, null]
    })
    const cycleId = await makeCycle(4)

    expect(await applyLeaderboardRankReset(env.AUTH_DB, cycleId)).toBe(
      'applied'
    )
    const current = await env.AUTH_DB.prepare(
      `SELECT user_id, score, week4_score FROM player_account_stats
       WHERE season = ? AND user_id LIKE 'reset-hard-%'
       ORDER BY user_id`
    )
      .bind(SEASON)
      .all<{ user_id: string; score: number; week4_score: number }>()
    const currentByUser = new Map(
      current.results.map(row => [row.user_id, row])
    )
    expect(currentByUser.get('reset-hard-trainee')).toMatchObject({
      score: 396,
      week4_score: 489
    })
    expect(currentByUser.get('reset-hard-banned')).toMatchObject({
      score: 1_600,
      week4_score: 1_600
    })

    const next = await env.AUTH_DB.prepare(
      `SELECT user_id, score, player_rank, player_rank_stage, player_rank_state
       FROM player_account_stats
       WHERE season = ? AND user_id LIKE 'reset-hard-%'
       ORDER BY user_id`
    )
      .bind(SEASON + 1)
      .all<{
        user_id: string
        score: number
        player_rank: string
        player_rank_stage: string
        player_rank_state: string
      }>()
    expect(next.results.map(row => row.user_id)).toEqual([
      'reset-hard-expert',
      'reset-hard-grand',
      'reset-hard-master',
      'reset-hard-trainee'
    ])
    const nextByUser = new Map(next.results.map(row => [row.user_id, row]))
    expect(nextByUser.get('reset-hard-trainee')).toMatchObject({
      score: 350,
      player_rank: 'TRAINEE',
      player_rank_stage: 'STAGE_I'
    })
    const traineeState = JSON.parse(
      nextByUser.get('reset-hard-trainee')!.player_rank_state
    )
    expect(traineeState[1]).toBeCloseTo(1_821.428571, 5)
    expect(traineeState[2]).toBe(125)
    expect(traineeState[3]).toBe(350)
    expect(nextByUser.get('reset-hard-expert')).toMatchObject({
      score: 750,
      player_rank: 'APPRENTICE',
      player_rank_stage: 'STAGE_II'
    })
    expect(nextByUser.get('reset-hard-master')).toMatchObject({
      score: 900,
      player_rank: 'EXPERT',
      player_rank_stage: 'STAGE_I'
    })
    expect(nextByUser.get('reset-hard-grand')).toMatchObject({
      score: 1_000,
      player_rank: 'EXPERT',
      player_rank_stage: 'STAGE_II'
    })

    const nextStateBeforeRetry =
      nextByUser.get('reset-hard-trainee')!.player_rank_state
    expect(await applyLeaderboardRankReset(env.AUTH_DB, cycleId)).toBe(
      'already_applied'
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT player_rank_state FROM player_account_stats
         WHERE user_id = 'reset-hard-trainee' AND game_mode =
               'RANKED_CONSTRUCTED' AND season = ?`
      )
        .bind(SEASON + 1)
        .first('player_rank_state')
    ).toBe(nextStateBeforeRetry)
  })

  it('rejects malformed new rank states at the schema boundary', async () => {
    await setupPlayer('reset-rank-state-guard')
    await expect(
      addStat('reset-rank-state-guard', {
        score: 900,
        rank: 'EXPERT',
        stage: 'STAGE_I',
        state: '[1,1750]'
      })
    ).rejects.toThrow('player rank state must be empty or four numbers')
  })

  it('does not reset a cycle before reward delivery reaches the reset boundary', async () => {
    const cycleId = await makeCycle(1)
    await env.AUTH_DB.prepare(
      `UPDATE leaderboard_reward_cycles
       SET status = 'FAILED', completed_at = ?, last_error = 'test failure'
       WHERE id = ?`
    )
      .bind(new Date().toISOString(), cycleId)
      .run()
    await expect(
      applyLeaderboardRankReset(env.AUTH_DB, cycleId)
    ).rejects.toThrow('leaderboard reward cycle is not ready for rank reset')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM leaderboard_rank_reset_receipts
         WHERE cycle_id = ?`
      )
        .bind(cycleId)
        .first('count')
    ).toBe(0)
  })
})
