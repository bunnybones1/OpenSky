import { env } from 'cloudflare:workers'
import { SortOrder } from '@opensky/proto'
import { afterEach, describe, expect, it } from 'vitest'

import { CompetitiveRepository } from '../src/competitive'

const PREFIX = 'admin-match-pagination-'

const insertMatch = async (
  label: string,
  createdAt: string,
  endedAt: string | null,
  status: 'active' | 'ended' = 'ended'
) => {
  const proposalId = `${PREFIX}${label}-${crypto.randomUUID()}`
  await env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_matches
       (proposal_id, replay_id, mode, version, player1_principal,
        player2_principal, match_payload_json, status, winner_player,
        result_json, created_at, updated_at, ended_at)
     VALUES (?, ?, 'RANKED_CONSTRUCTED', 'pagination-test',
             'identity:pagination-player-1', 'identity:pagination-player-2',
             '{}', ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      proposalId,
      `${PREFIX}replay-${label}-${crypto.randomUUID()}`,
      status,
      status === 'ended' ? 0 : null,
      status === 'ended' ? '{"status":"COMPLETED"}' : null,
      createdAt,
      endedAt ?? createdAt,
      endedAt
    )
    .run()
  const id = await env.AUTH_DB.prepare(
    `SELECT id FROM multiplayer_matches WHERE proposal_id = ?`
  )
    .bind(proposalId)
    .first<number>('id')
  if (!id) throw new Error('match fixture was not inserted')
  return id
}

afterEach(async () => {
  await env.AUTH_DB.prepare(
    `DELETE FROM multiplayer_matches WHERE proposal_id LIKE ?`
  )
    .bind(`${PREFIX}%`)
    .run()
})

describe('staff match pagination', () => {
  it('preserves source match/sort keysets and reverse traversal', async () => {
    const repository = new CompetitiveRepository(env.AUTH_DB)
    const tiedStart = '1900-01-01T00:00:00.000Z'
    const firstId = await insertMatch(
      'first',
      tiedStart,
      '1900-01-01T00:10:00.000Z'
    )
    const secondId = await insertMatch(
      'second',
      tiedStart,
      '1900-01-01T00:20:00.000Z'
    )

    const omitted = await repository.listAdminMatches(undefined, undefined)
    expect(omitted.page.pageSize).toBe(20)
    expect(omitted.page.sort).toEqual([
      { column: 'matches.started_at', order: SortOrder.DESC }
    ])
    expect(omitted.res.map(item => item.match.id)).toEqual([secondId, firstId])

    const first = await repository.listAdminMatches({ pageSize: 1 }, {})
    expect(first.res[0].match.id).toBe(secondId)
    expect(first.page).toMatchObject({
      pageSize: 1,
      hasBefore: true,
      hasAfter: false,
      sort: [{ column: 'matches.started_at', order: SortOrder.DESC }]
    })
    expect(JSON.parse(atob(first.page.before!))).toEqual([
      String(secondId),
      tiedStart
    ])
    expect(first.page.after).toBe(first.page.before)

    // A newly completed match ahead of the boundary cannot offset page two.
    const aheadId = await insertMatch(
      'ahead',
      '1900-02-01T00:00:00.000Z',
      '1900-02-01T00:10:00.000Z'
    )
    const second = await repository.listAdminMatches(
      { pageSize: 1, before: first.page.after },
      {}
    )
    expect(second.res[0].match.id).toBe(firstId)
    expect(second.page.hasAfter).toBe(true)

    const previous = await repository.listAdminMatches(
      { pageSize: 1, after: second.page.before },
      {}
    )
    expect(previous.res[0].match.id).toBe(secondId)

    const endedAscending = await repository.listAdminMatches(
      {
        pageSize: 500,
        sort: [{ column: 'ended_at', order: SortOrder.ASC }]
      },
      {}
    )
    expect(endedAscending.page.pageSize).toBe(200)
    expect(endedAscending.page.sort).toEqual([
      { column: 'ended_at', order: SortOrder.ASC }
    ])
    expect(endedAscending.res[0].match.id).toBe(firstId)
    expect(JSON.parse(atob(endedAscending.page.before!))).toEqual([
      String(firstId),
      '1900-01-01T00:10:00.000Z'
    ])

    const activeId = await insertMatch(
      'active',
      '1900-03-01T00:00:00.000Z',
      null,
      'active'
    )
    const endedDescending = await repository.listAdminMatches(
      {
        pageSize: 1,
        sort: [{ column: 'endedAt', order: SortOrder.DESC }]
      },
      {}
    )
    expect(endedDescending.res[0].match.id).toBe(activeId)
    expect(endedDescending.res[0]).toMatchObject({
      reviewed: false,
      duration: null
    })
    expect(Object.keys(endedDescending.res[0]).sort()).toEqual([
      'duration',
      'match',
      'reviewed'
    ])
    expect(JSON.parse(atob(endedDescending.page.before!))).toEqual([
      String(activeId),
      null
    ])

    const uniqueOnly = await repository.listAdminMatches(
      {
        pageSize: 1,
        sort: [{ column: 'id', order: SortOrder.ASC }]
      },
      {}
    )
    expect(uniqueOnly.res[0].match.id).toBe(firstId)
    expect(uniqueOnly.page.sort).toEqual([])
    expect(JSON.parse(atob(uniqueOnly.page.before!))).toEqual([String(firstId)])
    expect(aheadId).toBeGreaterThan(secondId)

    await expect(
      repository.listAdminMatches(
        { before: first.page.after, after: first.page.before },
        {}
      )
    ).rejects.toThrow('using before and after together is invalid')
    await expect(
      repository.listAdminMatches({ before: 'not-a-cursor' }, {})
    ).rejects.toThrow('page cursor is invalid')
    await expect(
      repository.listAdminMatches(
        { sort: [{ column: 'duration', order: SortOrder.ASC }] },
        {}
      )
    ).rejects.toThrow('match sort is invalid')
  })
})
