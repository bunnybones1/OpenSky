import { env } from 'cloudflare:workers'
import { SortOrder } from '@opensky/proto'
import { afterEach, describe, expect, it } from 'vitest'

import { StaffRepository } from '../src/staff'

const PREFIX = 'account-pagination-'

const insertAccount = async (
  label: string,
  displayName: string,
  createdAt: string
) => {
  const suffix = crypto.randomUUID()
  const userId = `${PREFIX}${label}-${suffix}`
  const name = `${displayName} ${suffix}`
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(userId, name, `${userId}@example.com`, createdAt, createdAt),
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_settings
         (user_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?)`
    ).bind(userId, name, createdAt, createdAt),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (user_id, created_at) VALUES (?, ?)`
    ).bind(userId, createdAt)
  ])
  const accountId = await env.AUTH_DB.prepare(
    `SELECT id FROM game_accounts WHERE user_id = ?`
  )
    .bind(userId)
    .first<number>('id')
  return { accountId, name }
}

afterEach(async () => {
  await env.AUTH_DB.prepare(`DELETE FROM users WHERE id LIKE ?`)
    .bind(`${PREFIX}%`)
    .run()
})

describe('staff account-list pagination', () => {
  it('preserves the source account/name keyset and reverse traversal', async () => {
    const repository = new StaffRepository(env.AUTH_DB)
    const beta = await insertAccount('beta', 'Beta', '1900-01-02T00:00:00.000Z')
    const delta = await insertAccount(
      'delta',
      'Delta',
      '1900-01-01T00:00:00.000Z'
    )

    const omitted = await repository.listAccounts({})
    expect(omitted.page.pageSize).toBe(20)
    expect(omitted.page.sort).toEqual([
      { column: 'name', order: SortOrder.ASC }
    ])

    const first = await repository.listAccounts({ page: { pageSize: 1 } })
    expect(first.rows.map(row => row.account_name)).toEqual([beta.name])
    expect(first.page).toMatchObject({
      pageSize: 1,
      hasBefore: true,
      hasAfter: false,
      sort: [{ column: 'name', order: SortOrder.ASC }]
    })
    expect(JSON.parse(atob(first.page.before!))).toEqual([
      String(beta.accountId),
      beta.name
    ])
    expect(first.page.after).toBe(first.page.before)

    // A row inserted ahead of the name keyset must not shift the next page.
    const alpha = await insertAccount(
      'alpha',
      'Alpha',
      '1900-01-03T00:00:00.000Z'
    )
    const second = await repository.listAccounts({
      page: { pageSize: 1, before: first.page.after }
    })
    expect(second.rows.map(row => row.account_name)).toEqual([delta.name])
    expect(second.page.hasAfter).toBe(true)

    const previous = await repository.listAccounts({
      page: { pageSize: 1, after: second.page.before }
    })
    expect(previous.rows.map(row => row.account_name)).toEqual([beta.name])

    await expect(
      repository.listAccounts({
        page: { before: first.page.after, after: first.page.before }
      })
    ).rejects.toThrow('using before and after together is invalid')
    await expect(
      repository.listAccounts({ page: { before: 'not-a-cursor' } })
    ).rejects.toThrow('page cursor is invalid')

    const createdDescending = await repository.listAccounts({
      page: {
        pageSize: 1,
        sort: [{ column: 'created_at', order: SortOrder.DESC }]
      }
    })
    expect(createdDescending.rows.map(row => row.account_name)).toEqual([
      alpha.name
    ])
    expect(createdDescending.page.sort).toEqual([
      { column: 'created_at', order: SortOrder.DESC }
    ])
    expect(JSON.parse(atob(createdDescending.page.before!))).toEqual([
      String(alpha.accountId),
      '1900-01-03T00:00:00.000Z'
    ])

    const idDescending = await repository.listAccounts({
      page: {
        pageSize: 500,
        sort: [{ column: 'id', order: SortOrder.DESC }]
      }
    })
    expect(idDescending.page.pageSize).toBe(200)
    expect(idDescending.page.sort).toEqual([])
    expect(idDescending.rows[0].account_id).toBe(alpha.accountId)
    expect(JSON.parse(atob(idDescending.page.before!))).toEqual([
      String(alpha.accountId)
    ])

    await expect(
      repository.listAccounts({
        page: {
          sort: [{ column: 'primary_email', order: SortOrder.ASC }]
        }
      })
    ).rejects.toThrow('account sort is invalid')
  })
})
