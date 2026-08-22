import { env } from 'cloudflare:workers'
import { SortOrder } from '@opensky/proto'
import { afterEach, describe, expect, it } from 'vitest'

import { StaffRepository } from '../src/staff'

const PREFIX = 'conquest-pagination-'

const insertProgress = async (
  label: string,
  currentPoints: number,
  totalPoints: number
) => {
  const suffix = crypto.randomUUID()
  const userId = `${PREFIX}${label}-${suffix}`
  const name = `Conquest ${label} ${suffix}`
  const now = new Date().toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(userId, name, `${userId}@example.com`, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_settings
         (user_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?)`
    ).bind(userId, name, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (user_id, created_at) VALUES (?, ?)`
    ).bind(userId, now),
    env.AUTH_DB.prepare(
      `INSERT INTO player_conquest_points
         (user_id, event_id, current_points, total_points, updated_at)
       VALUES (?, 2, ?, ?, ?)`
    ).bind(userId, currentPoints, totalPoints, now)
  ])
  return name
}

afterEach(async () => {
  await env.AUTH_DB.prepare(`DELETE FROM users WHERE id LIKE ?`)
    .bind(`${PREFIX}%`)
    .run()
})

describe('Conquest treasure-progress pagination', () => {
  it('preserves the source points keyset across inserts and reverse traversal', async () => {
    const repository = new StaffRepository(env.AUTH_DB)
    const middleName = await insertProgress('middle', 20, 200)
    const laterName = await insertProgress('later', 10, 100)

    const omitted = await repository.conquestTreasureProgress()
    expect(omitted.page.pageSize).toBe(20)
    expect(omitted.page.sort).toEqual([])

    const first = await repository.conquestTreasureProgress({ pageSize: 1 })
    expect(first.rows.map(row => row.account_name)).toEqual([middleName])
    expect(first.page).toMatchObject({
      pageSize: 1,
      hasBefore: true,
      hasAfter: false,
      sort: []
    })
    expect(JSON.parse(atob(first.page.before!))).toEqual(['20'])
    expect(first.page.after).toBe(first.page.before)

    // A row inserted ahead of the points keyset must not shift the next page.
    await insertProgress('ahead', 30, 300)
    const second = await repository.conquestTreasureProgress({
      pageSize: 1,
      before: first.page.after
    })
    expect(second.rows.map(row => row.account_name)).toEqual([laterName])
    expect(second.page.hasAfter).toBe(true)

    const previous = await repository.conquestTreasureProgress({
      pageSize: 1,
      after: second.page.before
    })
    expect(previous.rows.map(row => row.account_name)).toEqual([middleName])

    await expect(
      repository.conquestTreasureProgress({
        before: first.page.after,
        after: first.page.before
      })
    ).rejects.toThrow('using before and after together is invalid')
    await expect(
      repository.conquestTreasureProgress({ before: 'not-a-cursor' })
    ).rejects.toThrow('page cursor is invalid')

    const custom = await repository.conquestTreasureProgress({
      pageSize: 1,
      sort: [{ column: 'total_points', order: SortOrder.ASC }]
    })
    expect(custom.rows.map(row => row.account_name)).toEqual([laterName])
    expect(custom.page.sort).toEqual([
      { column: 'total_points', order: SortOrder.ASC }
    ])
    expect(JSON.parse(atob(custom.page.before!))).toEqual(['10', '100'])

    const pointsAscending = await repository.conquestTreasureProgress({
      pageSize: 500,
      sort: [{ column: 'currentPoints', order: SortOrder.ASC }]
    })
    expect(pointsAscending.page.pageSize).toBe(200)
    expect(pointsAscending.page.sort).toEqual([])
    expect(pointsAscending.rows[0].account_name).toBe(laterName)
    expect(JSON.parse(atob(pointsAscending.page.before!))).toEqual(['10'])

    await expect(
      repository.conquestTreasureProgress({
        sort: [{ column: 'account_name', order: SortOrder.ASC }]
      })
    ).rejects.toThrow('Conquest progress sort is invalid')
  })
})
