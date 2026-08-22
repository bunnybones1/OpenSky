import { env } from 'cloudflare:workers'
import { SortOrder } from '@opensky/proto'
import { afterEach, describe, expect, it } from 'vitest'

import { StaffRepository } from '../src/staff'

const PREFIX = 'signal-pagination-'

const insertReportedAccount = async (
  label: string,
  accountCreatedAt: string,
  signalUpdatedAt: string
) => {
  const suffix = crypto.randomUUID()
  const targetUserId = `${PREFIX}target-${label}-${suffix}`
  const reporterUserId = `${PREFIX}reporter-${label}-${suffix}`
  const name = `Signal ${label} ${suffix}`
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`
  )
    .bind(
      targetUserId,
      name,
      `${targetUserId}@example.com`,
      accountCreatedAt,
      accountCreatedAt,
      reporterUserId,
      `Reporter ${label} ${suffix}`,
      `${reporterUserId}@example.com`,
      accountCreatedAt,
      accountCreatedAt
    )
    .run()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_settings
         (user_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?)`
    ).bind(targetUserId, name, accountCreatedAt, accountCreatedAt),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (user_id, created_at) VALUES (?, ?)`
    ).bind(targetUserId, accountCreatedAt),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       VALUES (?, ?, 'PRACTICE_PVP', 'pagination-test', ?, ?, ?, ?,
               '{}', 'active', ?, ?)`
    ).bind(
      `${PREFIX}proposal-${label}-${suffix}`,
      `${PREFIX}replay-${label}-${suffix}`,
      `identity:${reporterUserId}`,
      `identity:${targetUserId}`,
      reporterUserId,
      targetUserId,
      signalUpdatedAt,
      signalUpdatedAt
    )
  ])
  const matchId = await env.AUTH_DB.prepare(
    `SELECT id FROM multiplayer_matches WHERE proposal_id = ?`
  )
    .bind(`${PREFIX}proposal-${label}-${suffix}`)
    .first<number>('id')
  await env.AUTH_DB.prepare(
    `INSERT INTO player_account_reports
       (match_id, reported_user_id, reporter_user_id, comment,
        created_at, updated_at)
     VALUES (?, ?, ?, 'pagination report', ?, ?)`
  )
    .bind(
      matchId,
      targetUserId,
      reporterUserId,
      signalUpdatedAt,
      signalUpdatedAt
    )
    .run()
  const accountId = await env.AUTH_DB.prepare(
    `SELECT id FROM game_accounts WHERE user_id = ?`
  )
    .bind(targetUserId)
    .first<number>('id')
  return { accountId, name }
}

afterEach(async () => {
  await env.AUTH_DB.prepare(
    `DELETE FROM multiplayer_matches WHERE proposal_id LIKE ?`
  )
    .bind(`${PREFIX}%`)
    .run()
  await env.AUTH_DB.prepare(`DELETE FROM users WHERE id LIKE ?`)
    .bind(`${PREFIX}%`)
    .run()
})

describe('account signal-summary pagination', () => {
  it('preserves the source account/score keyset and reverse traversal', async () => {
    const repository = new StaffRepository(env.AUTH_DB)
    const older = await insertReportedAccount(
      'older',
      '1900-01-01T00:00:00.000Z',
      '1900-02-01T00:00:00.000Z'
    )
    const middle = await insertReportedAccount(
      'middle',
      '1900-01-02T00:00:00.000Z',
      '1900-02-02T00:00:00.000Z'
    )

    const omitted = await repository.signalSummaries({})
    expect(omitted.page.pageSize).toBe(20)
    expect(omitted.page.sort).toEqual([
      { column: 'score', order: SortOrder.DESC }
    ])

    const first = await repository.signalSummaries({ page: { pageSize: 1 } })
    expect(first.rows.map(row => row.user_id)).toHaveLength(1)
    expect(first.rows[0].account_id).toBe(middle.accountId)
    expect(first.rows[0].score).toBe(0)
    expect(first.page).toMatchObject({
      pageSize: 1,
      hasBefore: true,
      hasAfter: false,
      sort: [{ column: 'score', order: SortOrder.DESC }]
    })
    expect(JSON.parse(atob(first.page.before!))).toEqual([
      String(middle.accountId),
      '0'
    ])
    expect(first.page.after).toBe(first.page.before)

    // A newer account ID sorts ahead of the neutral-score cursor.
    const ahead = await insertReportedAccount(
      'ahead',
      '1900-01-03T00:00:00.000Z',
      '1900-02-03T00:00:00.000Z'
    )
    const second = await repository.signalSummaries({
      page: { pageSize: 1, before: first.page.after }
    })
    expect(second.rows[0].account_id).toBe(older.accountId)
    expect(second.page.hasAfter).toBe(true)

    const previous = await repository.signalSummaries({
      page: { pageSize: 1, after: second.page.before }
    })
    expect(previous.rows[0].account_id).toBe(middle.accountId)

    await expect(
      repository.signalSummaries({
        page: { before: first.page.after, after: first.page.before }
      })
    ).rejects.toThrow('using before and after together is invalid')
    await expect(
      repository.signalSummaries({ page: { before: 'not-a-cursor' } })
    ).rejects.toThrow('page cursor is invalid')

    const updatedAscending = await repository.signalSummaries({
      page: {
        pageSize: 1,
        sort: [{ column: 'updated_at', order: SortOrder.ASC }]
      }
    })
    expect(updatedAscending.rows[0].account_id).toBe(older.accountId)
    expect(updatedAscending.page.sort).toEqual([
      { column: 'updated_at', order: SortOrder.ASC }
    ])
    expect(JSON.parse(atob(updatedAscending.page.before!))).toEqual([
      String(older.accountId),
      '1900-02-01T00:00:00.000Z'
    ])

    const createdDescending = await repository.signalSummaries({
      page: {
        pageSize: 500,
        sort: [{ column: 'createdAt', order: SortOrder.DESC }]
      }
    })
    expect(createdDescending.page.pageSize).toBe(200)
    expect(createdDescending.rows[0].account_id).toBe(ahead.accountId)
    expect(JSON.parse(atob(createdDescending.page.before!))).toEqual([
      String(ahead.accountId),
      '1900-01-03T00:00:00.000Z'
    ])

    await expect(
      repository.signalSummaries({
        page: { sort: [{ column: 'name', order: SortOrder.ASC }] }
      })
    ).rejects.toThrow('signal sort is invalid')
  })
})
