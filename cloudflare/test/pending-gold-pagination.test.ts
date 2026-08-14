import { env } from 'cloudflare:workers'
import { SortOrder } from '@opensky/proto'
import { afterEach, describe, expect, it } from 'vitest'

import { StaffRepository } from '../src/staff'

const PREFIX = 'pending-gold-pagination-'

const insertUser = async (userId: string, createdAt: string) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Pending Gold Weasel', ?, ?, ?)`
  )
    .bind(userId, `${userId}@example.com`, createdAt, createdAt)
    .run()
}

const insertPendingDelivery = async (
  userId: string,
  conquestId: number,
  label: string,
  deliverAt: string,
  createdAt: string
) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO player_conquests
       (id, entry_key, user_id, status, nonce, mode, hero, deck_class,
        match_progress, created_at, ended_at)
     VALUES (?, ?, ?, 'COMPLETED', ?, 'CONQUEST_CONSTRUCTED', 'ADA', 'STR',
             '{}', ?, ?)`
  )
    .bind(
      conquestId,
      `${PREFIX}${label}-${crypto.randomUUID()}`,
      userId,
      conquestId,
      createdAt,
      createdAt
    )
    .run()
  await env.AUTH_DB.prepare(
    `INSERT INTO player_conquest_gold_deliveries
       (conquest_id, user_id, card_ids_json, token_ids_json, deliver_at,
        status, attempt_count, created_at)
     VALUES (?, ?, '[11]', '[1011]', ?, 'PENDING', 0, ?)`
  )
    .bind(conquestId, userId, deliverAt, createdAt)
    .run()
}

afterEach(async () => {
  await env.AUTH_DB.prepare(
    `DELETE FROM player_conquest_gold_deliveries WHERE user_id LIKE ?`
  )
    .bind(`${PREFIX}%`)
    .run()
  await env.AUTH_DB.prepare(`DELETE FROM player_conquests WHERE user_id LIKE ?`)
    .bind(`${PREFIX}%`)
    .run()
  await env.AUTH_DB.prepare(`DELETE FROM users WHERE id LIKE ?`)
    .bind(`${PREFIX}%`)
    .run()
})

describe('pending off-chain Gold pagination', () => {
  it('preserves the source task/run-at keyset and reverse traversal', async () => {
    const repository = new StaffRepository(env.AUTH_DB)
    const userId = `${PREFIX}${crypto.randomUUID()}`
    const createdAt = '1900-01-01T00:00:00.000Z'
    const tiedDeliverAt = '1900-02-01T00:00:00.000Z'
    const baseId =
      (await env.AUTH_DB.prepare(
        `SELECT COALESCE(MAX(id), 1000000) + 100 AS next_id
         FROM player_conquests`
      ).first<number>('next_id')) ?? 1000100
    await insertUser(userId, createdAt)
    await insertPendingDelivery(
      userId,
      baseId,
      'first',
      tiedDeliverAt,
      createdAt
    )
    await insertPendingDelivery(
      userId,
      baseId + 1,
      'second',
      tiedDeliverAt,
      createdAt
    )

    const omitted = await repository.pendingGold()
    expect(omitted.page.pageSize).toBe(200)
    expect(omitted.page.sort).toEqual([
      { column: 'run_at', order: SortOrder.ASC }
    ])
    expect((await repository.pendingGold({})).page.pageSize).toBe(20)

    const first = await repository.pendingGold({ pageSize: 1 })
    expect(first.rows[0].userId).toBe(userId)
    expect(first.rows[0].mintAt).toBe(tiedDeliverAt)
    expect(first.page).toMatchObject({
      pageSize: 1,
      hasBefore: true,
      hasAfter: false,
      sort: [{ column: 'run_at', order: SortOrder.ASC }]
    })
    expect(JSON.parse(atob(first.page.before!))).toEqual([
      String(baseId),
      tiedDeliverAt
    ])
    expect(first.page.after).toBe(first.page.before)

    // A newly queued delivery ahead of the boundary cannot offset page two.
    await insertPendingDelivery(
      userId,
      baseId + 2,
      'ahead',
      '1900-01-01T00:00:00.000Z',
      createdAt
    )
    const second = await repository.pendingGold({
      pageSize: 1,
      before: first.page.after
    })
    expect(JSON.parse(atob(second.page.before!))).toEqual([
      String(baseId + 1),
      tiedDeliverAt
    ])
    expect(second.page.hasAfter).toBe(true)

    const previous = await repository.pendingGold({
      pageSize: 1,
      after: second.page.before
    })
    expect(JSON.parse(atob(previous.page.before!))).toEqual([
      String(baseId),
      tiedDeliverAt
    ])

    const descending = await repository.pendingGold({
      pageSize: 500,
      sort: [{ column: 'mint_at', order: SortOrder.DESC }]
    })
    expect(descending.page.pageSize).toBe(200)
    expect(descending.page.sort).toEqual([
      { column: 'mint_at', order: SortOrder.DESC }
    ])
    expect(JSON.parse(atob(descending.page.before!))).toEqual([
      String(baseId + 1),
      tiedDeliverAt
    ])

    const uniqueOnly = await repository.pendingGold({
      pageSize: 1,
      sort: [{ column: 'id', order: SortOrder.DESC }]
    })
    expect(uniqueOnly.page.sort).toEqual([])
    expect(JSON.parse(atob(uniqueOnly.page.before!))).toEqual([
      String(baseId + 2)
    ])

    await expect(
      repository.pendingGold({
        before: first.page.after,
        after: first.page.before
      })
    ).rejects.toThrow('using before and after together is invalid')
    await expect(
      repository.pendingGold({ before: 'not-a-cursor' })
    ).rejects.toThrow('page cursor is invalid')
    await expect(
      repository.pendingGold({
        sort: [{ column: 'primary_email', order: SortOrder.ASC }]
      })
    ).rejects.toThrow('pending-card sort is invalid')
  })
})
