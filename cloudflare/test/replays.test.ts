import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import { handleReplayRequest } from '../src/replays'

const USER_ID = '77777777-7777-4777-8777-777777777777'
const REPLAY_ID = '88888888-8888-4888-8888-888888888888'
const PROPOSAL_ID = 'replay-contract-test'
const MATCH_ID = 900001

const service = (handler: (request: Request) => Response | Promise<Response>) =>
  ({ fetch: handler }) as unknown as Fetcher

const gameMatches = {
  getByName: () =>
    service(request => {
      const path = new URL(request.url).pathname
      if (
        request.headers.get('x-cloud-weasel-internal-auth') !==
        'multiplayer-gateway-test-secret'
      ) {
        return new Response('Not found', { status: 404 })
      }
      if (path === '/internal/replay-index') {
        return Response.json({ indexes: [0, 1] })
      }
      if (path === '/internal/replay/0') {
        return Response.json([{ type: 'init', version: 'test-release' }])
      }
      if (path === '/internal/replay/1') {
        return Response.json([
          {
            type: 'gameplay',
            message: { type: 'gameplay', data: ['0x00'] }
          }
        ])
      }
      return new Response('Not found', { status: 404 })
    })
} as unknown as DurableObjectNamespace

const testEnv = {
  ...(env as unknown as Env),
  GAME_MATCHES: gameMatches
} satisfies Env

const rpc = (body: object) =>
  handleApiRequest(
    new Request(
      'https://opensky.example/api/rpc/SkyWeaverAPI/GetMatchArchiveRecordsURI',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }
    ),
    testEnv
  )

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM multiplayer_matches').run()
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, avatar_url, created_at, updated_at)
     VALUES (?, 'Replay Player', 'replay@example.com', NULL, ?, ?)`
  )
    .bind(USER_ID, now, now)
    .run()
  await env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_matches
       (id, proposal_id, replay_id, mode, version, player1_principal,
        player2_principal, player1_user_id, player2_user_id,
        match_payload_json, server_address, status, winner_player,
        result_json, ended_at, created_at, updated_at)
     VALUES (?, ?, ?, 'RANKED_CONSTRUCTED', 'test-release',
             '0x1111111111111111111111111111111111111111',
             '0x2222222222222222222222222222222222222222', ?, NULL,
             ?, 'wss://opensky.example/api/game/matches/replay-contract-test',
             'ended', 0, '{"status":"COMPLETED","turnCount":4}', ?, ?, ?)`
  )
    .bind(
      MATCH_ID,
      PROPOSAL_ID,
      REPLAY_ID,
      USER_ID,
      JSON.stringify({
        match: {
          player1: {
            privateSeed: { cards: [1], prisms: ['str'] },
            account: {
              address: '0x1111111111111111111111111111111111111111',
              name: 'Replay Player'
            }
          },
          player2: {
            privateSeed: { cards: [2], prisms: ['agy'] },
            account: {
              address: '0x2222222222222222222222222222222222222222',
              name: 'Opponent'
            }
          }
        }
      }),
      now,
      now,
      now
    )
    .run()
})

describe('source replay archive contract', () => {
  it('returns public capability URLs and proxies source-shaped record chunks', async () => {
    const response = await rpc({ matchID: MATCH_ID, replayID: REPLAY_ID })
    expect(response.status).toBe(200)
    const body = await response.json<{
      ok: boolean
      match: {
        status: string
        replayID: string
        winningPlayer: number | null
        tutorialLevel: unknown
        player1: Record<string, unknown>
        player2: Record<string, unknown>
      }
      recordURIs: string[]
      archiveIndexURI: string
    }>()
    expect(body).toMatchObject({
      ok: true,
      match: {
        status: 'COMPLETED',
        replayID: REPLAY_ID,
        winningPlayer: 1
      },
      archiveIndexURI: ''
    })
    expect(body.recordURIs).toEqual([
      `https://opensky.example/api/replays/${MATCH_ID}/${REPLAY_ID}/0`,
      `https://opensky.example/api/replays/${MATCH_ID}/${REPLAY_ID}/1`
    ])
    expect(body.match).toMatchObject({ tutorialLevel: null })
    expect(body.match.player1).toMatchObject({
      region: null,
      tagArtID: null,
      crystalID: null,
      playerSessionId: null
    })
    expect(body.match.player2).toMatchObject({
      region: null,
      tagArtID: null,
      crystalID: null,
      playerSessionId: null
    })

    const record = await handleReplayRequest(
      new Request(body.recordURIs[0]),
      testEnv
    )
    expect(record.status).toBe(200)
    expect(await record.json()).toEqual([
      { type: 'init', version: 'test-release' }
    ])
  })

  it('fails closed for a wrong replay capability or record index', async () => {
    const wrong = await rpc({ matchID: MATCH_ID, replayID: 'wrong-replay' })
    expect(wrong.status).toBe(404)
    expect(await wrong.json()).toMatchObject({
      code: 'webrpc.not_found'
    })

    const missing = await handleReplayRequest(
      new Request(
        `https://opensky.example/api/replays/${MATCH_ID}/${REPLAY_ID}/999999`
      ),
      testEnv
    )
    expect(missing.status).toBe(404)
  })

  it('withholds active matches for two hours, then preserves their source status', async () => {
    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches
       SET status = 'active', winner_player = NULL, result_json = NULL,
           ended_at = NULL
       WHERE id = ?`
    )
      .bind(MATCH_ID)
      .run()

    const recent = await rpc({ matchID: MATCH_ID, replayID: REPLAY_ID })
    expect(recent.status).toBe(400)
    expect(await recent.json()).toMatchObject({
      code: 'webrpc.invalid_argument'
    })

    const staleStart = new Date(Date.now() - 121 * 60 * 1000).toISOString()
    await env.AUTH_DB.prepare(
      'UPDATE multiplayer_matches SET created_at = ? WHERE id = ?'
    )
      .bind(staleStart, MATCH_ID)
      .run()

    const stale = await rpc({ matchID: MATCH_ID, replayID: REPLAY_ID })
    expect(stale.status).toBe(200)
    const staleBody = await stale.json<{
      ok: boolean
      match: { status: string; winningPlayer: unknown; endedAt: unknown }
    }>()
    expect(staleBody).toMatchObject({
      ok: true,
      match: { status: 'IN_PROGRESS', winningPlayer: null, endedAt: null }
    })
  })
})
