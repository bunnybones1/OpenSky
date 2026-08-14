import { env } from 'cloudflare:workers'
import { SortOrder } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { AccountActionsRepository } from '../src/account-actions'

const insertAction = async (label: string, createdAt: string) => {
  await env.AUTH_DB.prepare(
    `INSERT INTO player_account_actions
       (action_key, account_user_id, account_address, action_type,
        created_by_user_id, created_by_account_id, expires_at, created_at,
        updated_at)
     VALUES (?, ?, ?, 'MOD_FLAG', 'pagination-admin', 1, ?, ?, ?)`
  )
    .bind(
      `pagination-${label}-${crypto.randomUUID()}`,
      `pagination-${label}`,
      `identity:pagination-${label}`,
      '2199-01-01T00:00:00.000Z',
      createdAt,
      createdAt
    )
    .run()
  return env.AUTH_DB.prepare(
    `SELECT id FROM player_account_actions
     WHERE account_user_id = ? ORDER BY id DESC LIMIT 1`
  )
    .bind(`pagination-${label}`)
    .first<number>('id')
}

describe('account-action history pagination', () => {
  it('preserves source keysets across inserts and reverse traversal', async () => {
    const repository = new AccountActionsRepository(env.AUTH_DB)
    const middleId = await insertAction('middle', '2099-01-02T00:00:00.000Z')
    await insertAction('oldest', '2099-01-01T00:00:00.000Z')

    const first = await repository.list({ pageSize: 1 })
    expect(first.actions.map(action => action.accountAddress)).toEqual([
      'identity:pagination-middle'
    ])
    expect(first.page).toMatchObject({
      pageSize: 1,
      hasBefore: true,
      hasAfter: false,
      sort: [{ column: 'created_at', order: 'DESC' }]
    })
    expect(JSON.parse(atob(first.page.before!))).toEqual([
      String(middleId),
      '2099-01-02T00:00:00.000Z'
    ])
    expect(first.page.after).toBe(first.page.before)

    await insertAction('newest', '2099-01-03T00:00:00.000Z')
    const second = await repository.list({
      pageSize: 1,
      before: first.page.after
    })
    expect(second.actions.map(action => action.accountAddress)).toEqual([
      'identity:pagination-oldest'
    ])
    expect(second.page.hasAfter).toBe(true)

    const previous = await repository.list({
      pageSize: 1,
      after: second.page.before
    })
    expect(previous.actions.map(action => action.accountAddress)).toEqual([
      'identity:pagination-middle'
    ])

    await expect(
      repository.list({ before: first.page.after, after: first.page.before })
    ).rejects.toThrow('using before and after together is invalid')
    await expect(repository.list({ before: 'not-a-cursor' })).rejects.toThrow(
      'page cursor is invalid'
    )

    const idDescending = await repository.list({
      pageSize: 500,
      sort: [{ column: 'id', order: SortOrder.DESC }]
    })
    expect(idDescending.page.pageSize).toBe(200)
    expect(idDescending.page.sort).toEqual([])
    expect(JSON.parse(atob(idDescending.page.before!))).toEqual([
      String(idDescending.actions[0].id)
    ])
    await expect(
      repository.list({
        sort: [{ column: 'unknown', order: SortOrder.ASC }]
      })
    ).rejects.toThrow('account action sort is invalid')
  })
})
