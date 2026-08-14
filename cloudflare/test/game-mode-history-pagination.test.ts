import { env } from 'cloudflare:workers'
import { GameMode, SortOrder } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { StaffRepository } from '../src/staff'

const insertHistory = async (label: string, createdAt: string) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO game_mode_status_history
       (actor_user_id, game_mode, enabled, created_at)
     VALUES (?, 'PRACTICE_BOT', 1, ?)`
  )
    .bind(`history-${label}`, createdAt)
    .run()
  return env.AUTH_DB.prepare(
    `SELECT id FROM game_mode_status_history
     WHERE actor_user_id = ? ORDER BY id DESC LIMIT 1`
  )
    .bind(`history-${label}`)
    .first<number>('id')
}

describe('game-mode status history pagination', () => {
  it('preserves the source timestamp keyset and omitted-page default', async () => {
    const repository = new StaffRepository(env.AUTH_DB)
    await insertHistory('middle', '1900-01-02T00:00:00.000Z')
    await insertHistory('later', '1900-01-03T00:00:00.000Z')

    const omitted = await repository.gameModeStatusHistory(undefined, [
      GameMode.PRACTICE_BOT
    ])
    expect(omitted.page.pageSize).toBe(200)
    expect(omitted.page.sort).toEqual([])

    const first = await repository.gameModeStatusHistory({ pageSize: 1 }, [
      GameMode.PRACTICE_BOT
    ])
    expect(first.rows.map(row => row.createdAt)).toEqual([
      '1900-01-02T00:00:00.000Z'
    ])
    expect(first.page).toMatchObject({
      pageSize: 1,
      hasBefore: true,
      hasAfter: false,
      sort: []
    })
    expect(JSON.parse(atob(first.page.before!))).toEqual([
      '1900-01-02T00:00:00.000Z'
    ])
    expect(first.page.after).toBe(first.page.before)

    // An insertion ahead of the timestamp keyset must not shift the next page.
    await insertHistory('earlier', '1900-01-01T00:00:00.000Z')
    const second = await repository.gameModeStatusHistory(
      { pageSize: 1, before: first.page.after },
      [GameMode.PRACTICE_BOT]
    )
    expect(second.rows.map(row => row.createdAt)).toEqual([
      '1900-01-03T00:00:00.000Z'
    ])
    expect(second.page.hasAfter).toBe(true)

    const previous = await repository.gameModeStatusHistory(
      { pageSize: 1, after: second.page.before },
      [GameMode.PRACTICE_BOT]
    )
    expect(previous.rows.map(row => row.createdAt)).toEqual([
      '1900-01-02T00:00:00.000Z'
    ])

    await expect(
      repository.gameModeStatusHistory({
        before: first.page.after,
        after: first.page.before
      })
    ).rejects.toThrow('using before and after together is invalid')
    await expect(
      repository.gameModeStatusHistory({ before: 'not-a-cursor' })
    ).rejects.toThrow('page cursor is invalid')

    const idDescending = await repository.gameModeStatusHistory({
      pageSize: 500,
      sort: [{ column: 'id', order: SortOrder.DESC }]
    })
    expect(idDescending.page.pageSize).toBe(200)
    expect(idDescending.page.sort).toEqual([
      { column: 'id', order: SortOrder.DESC }
    ])
    expect(JSON.parse(atob(idDescending.page.before!))).toEqual([
      idDescending.rows[0].createdAt,
      String(idDescending.rows[0].id)
    ])
    await expect(
      repository.gameModeStatusHistory({
        sort: [{ column: 'unknown', order: SortOrder.ASC }]
      })
    ).rejects.toThrow('game mode status history sort is invalid')
  })
})
