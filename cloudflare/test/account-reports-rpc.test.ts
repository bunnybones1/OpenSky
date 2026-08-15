import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import {
  sanitizeReportComment,
  sourceReportRequest
} from '../src/account-reports'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'

const testEnv = env as unknown as Env
const REPORTER = 'report-player-one'
const OPPONENT = 'report-player-two'
const OUTSIDER = 'report-outsider'
const NOW = '2026-08-13T14:00:00.000Z'
const PRINCIPAL_1 = '0x1111111111111111111111111111111111111111'
const PRINCIPAL_2 = '0x2222222222222222222222222222222222222222'

const rpcAs = async (userId: string, body: object, signedIn = true) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request('https://opensky.example/api/rpc/SkyWeaverAPI/ReportAccount', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }),
    testEnv
  )
}

const report = (
  reportedAddress = `identity:${OPPONENT}`,
  matchId = 700,
  reporterComment = 'AFK'
) => ({ report: { reportedAddress, matchId, reporterComment } })

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM player_account_reports'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Reporter', 'reporter@example.com', ?, ?),
              (?, 'Opponent', 'opponent-report@example.com', ?, ?),
              (?, 'Outsider', 'outsider-report@example.com', ?, ?)`
    ).bind(REPORTER, NOW, NOW, OPPONENT, NOW, NOW, OUTSIDER, NOW, NOW),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (id, proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       VALUES (700, 'report-match', 'report-replay', 'RANKED_CONSTRUCTED',
               'test', ?, ?, ?, ?, '{}',
               'ended', ?, ?)`
    ).bind(PRINCIPAL_1, PRINCIPAL_2, REPORTER, OPPONENT, NOW, NOW)
  ])
})

describe('source match-scoped account reporting', () => {
  it('requires an identity session and a report object', async () => {
    expect((await rpcAs(REPORTER, report(), false)).status).toBe(401)
    expect((await rpcAs(REPORTER, {})).status).toBe(400)
    expect(await (await rpcAs(REPORTER, {})).json()).toMatchObject({
      msg: 'missing report data'
    })
    expect((await rpcAs(REPORTER, { report: { matchId: 700 } })).status).toBe(
      400
    )
    expect(
      sourceReportRequest({
        reportedAddress: `identity:${OPPONENT}`,
        matchId: 700
      })
    ).toEqual({
      reportedAddress: `identity:${OPPONENT}`,
      matchId: 700,
      reporterComment: ''
    })
  })

  it('persists a pending user-report signal with identity audit fields', async () => {
    const response = await rpcAs(REPORTER, report())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT match_id, reported_user_id, reporter_user_id, signal_type,
                signal_status, comment
         FROM player_account_reports`
      ).first()
    ).toEqual({
      match_id: 700,
      reported_user_id: OPPONENT,
      reporter_user_id: REPORTER,
      signal_type: 'user report',
      signal_status: 'PENDING',
      comment: 'AFK'
    })
  })

  it('preserves an omitted comment as the generated Go empty-string value', async () => {
    const response = await rpcAs(REPORTER, {
      report: {
        reportedAddress: `identity:${OPPONENT}`,
        matchId: 700
      }
    })
    expect(response.status).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        'SELECT comment FROM player_account_reports'
      ).first()
    ).toEqual({ comment: '' })
  })

  it('accepts the opponent principal emitted by the preserved game UI', async () => {
    const response = await rpcAs(REPORTER, report(PRINCIPAL_2.toUpperCase()))
    expect(response.status).toBe(200)
    expect(
      await env.AUTH_DB.prepare(
        'SELECT reported_user_id FROM player_account_reports'
      ).first()
    ).toEqual({ reported_user_id: OPPONENT })
  })

  it('rejects self, nonparticipant, non-opponent, missing-account, and missing-match reports', async () => {
    expect(
      await (await rpcAs(REPORTER, report(`identity:${REPORTER}`))).json()
    ).toMatchObject({ msg: 'reporting yourself? cute.' })
    expect(
      await (await rpcAs(REPORTER, report(PRINCIPAL_1))).json()
    ).toMatchObject({ msg: 'reporting yourself? cute.' })
    expect(await (await rpcAs(OUTSIDER, report())).json()).toMatchObject({
      msg: 'you can only send reports about matches you participaded in'
    })
    expect(
      await (await rpcAs(REPORTER, report(`identity:${OUTSIDER}`))).json()
    ).toMatchObject({
      msg: 'you can only send reports about your opponent in a match'
    })
    expect(
      await (await rpcAs(REPORTER, report('identity:missing-player'))).json()
    ).toMatchObject({ msg: 'account does not exist' })
    expect(
      await (await rpcAs(REPORTER, report(`identity:${OPPONENT}`, 999))).json()
    ).toMatchObject({ msg: 'failed to fetch reported match' })
  })

  it('matches strict plain-text sanitization and caps UTF-8 comments safely', async () => {
    expect(
      sanitizeReportComment(
        'Hello, <b>World</b>!<script>steal()</script>&amp; bye'
      )
    ).toBe('Hello, World!& bye')
    const comment = `<b>${'a'.repeat(3998)}🦦</b>`
    expect(
      (await rpcAs(REPORTER, report(undefined, 700, comment))).status
    ).toBe(200)
    const stored = await env.AUTH_DB.prepare(
      'SELECT comment FROM player_account_reports'
    ).first<{ comment: string }>()
    expect(stored?.comment).toBe('a'.repeat(3998))
    expect(
      new TextEncoder().encode(stored!.comment).byteLength
    ).toBeLessThanOrEqual(4000)
  })

  it('is idempotent across reconnect retries and allows the opponent to report back', async () => {
    expect((await rpcAs(REPORTER, report())).status).toBe(200)
    expect(
      (await rpcAs(REPORTER, report(undefined, 700, 'CHEATER'))).status
    ).toBe(200)
    expect(
      (
        await env.AUTH_DB.prepare(
          'SELECT reporter_user_id, comment FROM player_account_reports'
        ).all()
      ).results
    ).toEqual([{ reporter_user_id: REPORTER, comment: 'AFK' }])

    expect(
      (await rpcAs(OPPONENT, report(`identity:${REPORTER}`, 700, 'BOT'))).status
    ).toBe(200)
    expect(
      (
        await env.AUTH_DB.prepare(
          'SELECT COUNT(*) AS count FROM player_account_reports'
        ).first<{ count: number }>()
      )?.count
    ).toBe(2)
  })
})
