import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { GameMode } from '@opensky/proto'
import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Env } from '../src/env'
import { createIdentitySession } from '../src/identity-session'
import { handleMultiplayerGateway } from '../src/multiplayer-gateway'

const USER_ID = '22222222-2222-4222-8222-222222222222'

const service = (handler: (request: Request) => Response | Promise<Response>) =>
  ({ fetch: handler }) as unknown as Fetcher

const namespace = (
  handler: (request: Request) => Response | Promise<Response>
) =>
  ({ getByName: () => service(handler) }) as unknown as DurableObjectNamespace

let recentMatchResponse = (_request: Request) =>
  new Response('Recent match not found', { status: 404 })
let matchStatusResponse = (_request: Request) =>
  new Response('Match status not found', { status: 404 })

const testEnv = {
  ...(env as unknown as Env),
  MATCHMAKER_POOLS: namespace(request =>
    Response.json({
      target: new URL(request.url).pathname,
      search: new URL(request.url).search,
      principal: request.headers.get('x-cloud-weasel-principal'),
      userId: request.headers.get('x-cloud-weasel-user-id'),
      displayName: request.headers.get('x-cloud-weasel-display-name'),
      clientIp: request.headers.get('x-cloud-weasel-client-ip'),
      internal: request.headers.get('x-cloud-weasel-internal-auth'),
      cookie: request.headers.get('cookie')
    })
  ),
  GAME_MATCHES: namespace(request => {
    const pathname = new URL(request.url).pathname
    if (pathname === '/internal/recent-match-info') {
      return recentMatchResponse(request)
    }
    if (pathname === '/internal/status') return matchStatusResponse(request)
    return Response.json({
      target: new URL(request.url).pathname,
      principal: request.headers.get('x-cloud-weasel-principal'),
      userId: request.headers.get('x-cloud-weasel-user-id'),
      displayName: request.headers.get('x-cloud-weasel-display-name'),
      anonymous: request.headers.get('x-cloud-weasel-anonymous-spectator'),
      internal: request.headers.get('x-cloud-weasel-internal-auth'),
      cookie: request.headers.get('cookie')
    })
  })
} satisfies Env

const gateway = (path: string, headers: HeadersInit) =>
  handleMultiplayerGateway(
    new Request(`https://opensky.example${path}`, { headers }),
    testEnv
  )

beforeEach(async () => {
  recentMatchResponse = () =>
    new Response('Recent match not found', { status: 404 })
  matchStatusResponse = () =>
    new Response('Match status not found', { status: 404 })
  await env.AUTH_DB.prepare('DELETE FROM multiplayer_matches').run()
  await env.AUTH_DB.prepare('DELETE FROM auth_identities').run()
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, avatar_url, created_at, updated_at)
     VALUES (?, 'Gateway Player', 'gateway@example.com', NULL, ?, ?)`
  )
    .bind(USER_ID, now, now)
    .run()
})

afterEach(() => vi.restoreAllMocks())

const authenticatedHeaders = async () => {
  const token = await createIdentitySession(USER_ID, env.SESSION_SIGNING_KEY)
  return {
    Upgrade: 'websocket',
    Origin: 'https://opensky.example',
    Cookie: `opensky_identity_session=${token}`,
    'CF-Connecting-IP': '192.0.2.55'
  }
}

describe('same-origin multiplayer gateway', () => {
  it('authenticates and forwards the matcher socket with trusted identity only', async () => {
    const response = await gateway(
      '/api/matchmaker?release=release-1',
      await authenticatedHeaders()
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      target: '/api/matchmaker',
      search: '?release=release-1',
      principal: await deriveGamePrincipal(USER_ID),
      userId: USER_ID,
      displayName: 'Gateway Player',
      clientIp: '192.0.2.55',
      internal: 'multiplayer-gateway-test-secret',
      cookie: null
    })
  })

  it('forwards game sockets to the separate game service', async () => {
    const response = await gateway(
      '/api/game/matches/proposal_123',
      await authenticatedHeaders()
    )
    expect(await response.json()).toEqual({
      target: '/api/game/matches/proposal_123',
      principal: await deriveGamePrincipal(USER_ID),
      userId: USER_ID,
      displayName: 'Gateway Player',
      anonymous: null,
      internal: 'multiplayer-gateway-test-secret',
      cookie: null
    })
  })

  it('mints an isolated anonymous identity only for a game spectator socket', async () => {
    const response = await gateway('/api/game/matches/proposal_123', {
      Upgrade: 'websocket',
      Origin: 'https://opensky.example',
      Cookie: 'unrelated=value',
      'x-cloud-weasel-principal':
        '0xffffffffffffffffffffffffffffffffffffffff',
      'x-cloud-weasel-user-id': 'forged-user',
      'x-cloud-weasel-display-name': 'forged-name',
      'x-cloud-weasel-anonymous-spectator': 'forged-marker'
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      target: '/api/game/matches/proposal_123',
      principal: expect.stringMatching(/^0x[0-9a-f]{40}$/),
      userId: expect.stringMatching(
        /^anonymous-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ),
      anonymous: '1',
      internal: 'multiplayer-gateway-test-secret',
      cookie: null
    })
    expect(body.displayName).toBe(body.userId)
  })

  it('restores the source match-info contract for the requested player', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const opponent = '0x3333333333333333333333333333333333333333'
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, server_address, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 'active', ?, ?)`
    )
      .bind(
        'gateway-proposal',
        'gateway-replay',
        'PRACTICE_BOT',
        'client-release',
        principal,
        opponent,
        USER_ID,
        JSON.stringify({
          proposalId: 'gateway-proposal',
          match: {
            player1: { account: { address: principal } },
            player2: { account: { address: opponent } }
          }
        }),
        'wss://opensky.example/api/game/matches/gateway-proposal',
        now,
        now
      )
      .run()

    const headers = await authenticatedHeaders()
    delete (headers as { Upgrade?: string }).Upgrade
    const response = await gateway(
      `/api/matchmaker/matchinfo/identity:${USER_ID}`,
      headers
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      type: 'in_progress_match_info',
      matchInfo: {
        id: expect.any(Number),
        mode: 'PRACTICE_BOT',
        playerIDs: [principal, opponent],
        serverLocationKey: 'match:gateway-proposal',
        version: 'client-release',
        initialized: true
      },
      serverInfo: {
        status: 'online',
        name: 'cloud-weasel-game-server',
        hostname: 'opensky.example',
        port: 443,
        ws: 'wss://opensky.example/api/game/matches/gateway-proposal',
        http: 'https://opensky.example/api/game/matches/gateway-proposal',
        load: {
          inProgressMatches: 1,
          maxCapacity: 1,
          completedMatches: 0
        },
        releaseVersion: 'client-release'
      },
      disconnectTimeout: 0
    })

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches SET status = 'ended' WHERE proposal_id = ?`
    )
      .bind('gateway-proposal')
      .run()
    const afterCompletion = await gateway(
      `/api/matchmaker/matchinfo/${principal}`,
      headers
    )
    expect(await afterCompletion.json()).toEqual({ type: 'no_match_found' })
  })

  it('preserves source initializing match info for the client retry loop', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const opponent = '0x3333333333333333333333333333333333333333'
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, server_address, status, created_at, updated_at)
       VALUES ('initializing-proposal', 'initializing-replay', 'PRACTICE_PVP',
               'initializing-release', ?, ?, ?, NULL, '', NULL, 'creating',
               ?, ?)`
    )
      .bind(principal, opponent, USER_ID, now, now)
      .run()

    const headers = await authenticatedHeaders()
    delete (headers as { Upgrade?: string }).Upgrade
    const response = await gateway(
      `/api/matchmaker/matchinfo/identity:${USER_ID}`,
      headers
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      type: 'in_progress_match_info',
      matchInfo: {
        id: expect.any(Number),
        mode: 'PRACTICE_PVP',
        playerIDs: [principal, opponent],
        serverLocationKey: 'match:initializing-proposal',
        version: 'initializing-release',
        initialized: false
      },
      serverInfo: {
        status: 'online',
        name: 'cloud-weasel-game-server',
        hostname: 'opensky.example',
        port: 443,
        ws: 'wss://opensky.example/api/game/matches/initializing-proposal',
        http: 'https://opensky.example/api/game/matches/initializing-proposal',
        load: {
          inProgressMatches: 1,
          maxCapacity: 1,
          completedMatches: 0
        },
        releaseVersion: 'initializing-release'
      },
      disconnectTimeout: 0
    })
  })

  it('uses the source minimum remaining loading and disconnect TTL', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const opponent = '0x3333333333333333333333333333333333333333'
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, server_address, status, created_at, updated_at)
       VALUES ('timeout-proposal', 'timeout-replay', 'PRACTICE_PVP',
               'timeout-release', ?, ?, ?, NULL, ?, ?, 'active', ?, ?)`
    )
      .bind(
        principal,
        opponent,
        USER_ID,
        JSON.stringify({
          match: {
            player1: { account: { address: principal } },
            player2: { account: { address: opponent } }
          }
        }),
        'wss://opensky.example/api/game/matches/timeout-proposal',
        now,
        now
      )
      .run()

    const deadlineBase = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(deadlineBase)
    matchStatusResponse = request => {
      expect(request.headers.get('x-cloud-weasel-internal-auth')).toBe(
        'multiplayer-gateway-test-secret'
      )
      return Response.json({
        initialized: true,
        proposalId: 'timeout-proposal',
        ended: false,
        players: {
          [principal]: {
            finishedLoadingAssets: false,
            abandonAtMs: deadlineBase + 60_900
          }
        },
        timers: { loadExpiryAtMs: deadlineBase + 120_900 }
      })
    }

    const headers = await authenticatedHeaders()
    delete (headers as { Upgrade?: string }).Upgrade
    const path = `/api/matchmaker/matchinfo/identity:${USER_ID}`
    const active = (await (await gateway(path, headers)).json()) as {
      disconnectTimeout: number
    }
    expect(active.disconnectTimeout).toBe(60)

    matchStatusResponse = () =>
      Response.json({
        initialized: true,
        proposalId: 'timeout-proposal',
        ended: false,
        players: {
          [principal]: { finishedLoadingAssets: false }
        },
        timers: { loadExpiryAtMs: deadlineBase + 120_900 }
      })
    const loadingOnly = (await (await gateway(path, headers)).json()) as {
      disconnectTimeout: number
    }
    expect(loadingOnly.disconnectTimeout).toBe(120)

    matchStatusResponse = () =>
      Response.json({
        initialized: true,
        proposalId: 'timeout-proposal',
        ended: false,
        players: {
          [principal]: {
            finishedLoadingAssets: true,
            abandonAtMs: deadlineBase + 30_900
          }
        },
        timers: { loadExpiryAtMs: deadlineBase + 120_900 }
      })
    const abandonOnly = (await (await gateway(path, headers)).json()) as {
      disconnectTimeout: number
    }
    expect(abandonOnly.disconnectTimeout).toBe(30)

    matchStatusResponse = () =>
      Response.json({
        initialized: true,
        proposalId: 'different-proposal',
        ended: false,
        players: {
          [principal]: {
            finishedLoadingAssets: false,
            abandonAtMs: deadlineBase + 60_900
          }
        },
        timers: { loadExpiryAtMs: deadlineBase + 120_900 }
      })
    expect(await (await gateway(path, headers)).json()).toMatchObject({
      disconnectTimeout: 0
    })

    matchStatusResponse = () =>
      Response.json({
        initialized: true,
        proposalId: 'timeout-proposal',
        ended: false,
        players: {
          [principal]: { finishedLoadingAssets: true }
        },
        timers: { loadExpiryAtMs: deadlineBase + 120_900 }
      })
    expect(await (await gateway(path, headers)).json()).toMatchObject({
      disconnectTimeout: 0
    })
  })

  it("returns player one's source registry mode for both mixed-match participants", async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const opponentId = '33333333-3333-4333-8333-333333333333'
    const opponent = await deriveGamePrincipal(opponentId)
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, 'Ranked Opponent', 'ranked-opponent@example.com', NULL, ?, ?)`
    )
      .bind(opponentId, now, now)
      .run()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, player1_mode, player2_mode, version,
          player1_principal, player2_principal, player1_user_id,
          player2_user_id, match_payload_json, server_address, status,
          created_at, updated_at)
       VALUES ('mixed-gateway', 'mixed-replay', 'RANKED_CONSTRUCTED',
               'PRACTICE_PVP', 'RANKED_CONSTRUCTED', 'mixed-release',
               ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
      .bind(
        principal,
        opponent,
        USER_ID,
        opponentId,
        JSON.stringify({
          match: {
            player1: { account: { address: principal } },
            player2: { account: { address: opponent } }
          }
        }),
        'wss://opensky.example/api/game/matches/mixed-gateway',
        now,
        now
      )
      .run()

    await expect(
      env.AUTH_DB.prepare(
        `UPDATE multiplayer_matches
         SET player1_mode = 'PRACTICE_PVP',
             player2_mode = 'RANKED_DISCOVERY'
         WHERE proposal_id = 'mixed-gateway'`
      ).run()
    ).rejects.toThrow('multiplayer match modes are incompatible')

    const headers = await authenticatedHeaders()
    delete (headers as { Upgrade?: string }).Upgrade
    expect(
      await (
        await gateway(`/api/matchmaker/matchinfo/identity:${USER_ID}`, headers)
      ).json()
    ).toMatchObject({ matchInfo: { mode: GameMode.PRACTICE_PVP } })
    expect(
      await (
        await gateway(
          `/api/matchmaker/matchinfo/identity:${opponentId}`,
          headers
        )
      ).json()
    ).toMatchObject({ matchInfo: { mode: GameMode.PRACTICE_PVP } })
  })

  it('returns a participant recent match for 24 hours without leaking it to spectators', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const opponentId = '33333333-3333-4333-8333-333333333333'
    const opponent = await deriveGamePrincipal(opponentId)
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, 'Recent Opponent', 'recent-opponent@example.com', NULL, ?, ?)`
    )
      .bind(opponentId, now, now)
      .run()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, server_address, status, result_json,
          created_at, updated_at, ended_at)
       VALUES ('recent-proposal', 'recent-replay', 'PRACTICE_PVP',
               'recent-release', ?, ?, ?, ?, '{}', ?, 'ended', '{}', ?, ?, ?)`
    )
      .bind(
        principal,
        opponent,
        USER_ID,
        opponentId,
        'wss://opensky.example/api/game/matches/recent-proposal',
        now,
        now,
        now
      )
      .run()

    const stored = {
      type: 'recent_match_info',
      playerID: principal,
      gameMode: GameMode.PRACTICE_PVP,
      matchID: 91,
      replayID: 'recent-replay',
      accounts: [{ address: principal }, { address: opponent }],
      store: '0x0102',
      rewards: [{ type: 'XP', amount: 42 }]
    }
    const emptyConquest = {
      id: 0,
      status: 'UNKNOWN',
      nonce: 0,
      mode: 'UNKNOWN',
      hero: 'UNKNOWN',
      deckClass: null,
      matchProgress: null,
      createdAt: null,
      endedAt: null
    }
    const expected = {
      ...stored,
      conquestInfo: [emptyConquest, emptyConquest]
    }
    let recoveryRequests = 0
    recentMatchResponse = request => {
      recoveryRequests += 1
      expect(request.headers.get('x-cloud-weasel-principal')).toBe(principal)
      expect(request.headers.get('x-cloud-weasel-internal-auth')).toBe(
        'multiplayer-gateway-test-secret'
      )
      return Response.json(stored)
    }

    const headers = await authenticatedHeaders()
    delete (headers as { Upgrade?: string }).Upgrade
    const response = await gateway(
      `/api/matchmaker/matchinfo/identity:${USER_ID}`,
      headers
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(expected)
    expect(recoveryRequests).toBe(1)

    const spectator = await gateway(
      `/api/matchmaker/matchinfo/identity:${opponentId}`,
      headers
    )
    expect(await spectator.json()).toEqual({ type: 'no_match_found' })
    expect(recoveryRequests).toBe(1)

    const conquestInfo = [
      {
        ...emptyConquest,
        id: 11,
        status: 'COMPLETED',
        mode: GameMode.CONQUEST_CONSTRUCTED,
        hero: 'ADA',
        matchProgress: { 0: 'WIN' }
      },
      {
        ...emptyConquest,
        id: 12,
        status: 'COMPLETED',
        mode: GameMode.CONQUEST_CONSTRUCTED,
        hero: 'FOX',
        matchProgress: { 0: 'LOSS' }
      }
    ]
    recentMatchResponse = () => {
      recoveryRequests += 1
      return Response.json({
        ...stored,
        gameMode: GameMode.CONQUEST_CONSTRUCTED,
        conquestInfo
      })
    }
    const conquestResponse = await gateway(
      `/api/matchmaker/matchinfo/identity:${USER_ID}`,
      headers
    )
    expect(await conquestResponse.json()).toMatchObject({
      gameMode: GameMode.CONQUEST_CONSTRUCTED,
      conquestInfo
    })

    recentMatchResponse = () => {
      recoveryRequests += 1
      return Response.json({
        ...stored,
        gameMode: GameMode.CONQUEST_CONSTRUCTED
      })
    }
    const invalidConquestResponse = await gateway(
      `/api/matchmaker/matchinfo/identity:${USER_ID}`,
      headers
    )
    expect(invalidConquestResponse.status).toBe(500)
    expect(await invalidConquestResponse.json()).toEqual({
      type: 'error',
      level: 'server',
      message: 'Recent match is unavailable.'
    })
    expect(recoveryRequests).toBe(3)

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches
       SET ended_at = ?, updated_at = ?
       WHERE proposal_id = 'recent-proposal'`
    )
      .bind(
        new Date(Date.now() - 24 * 60 * 60 * 1_000 - 1).toISOString(),
        now
      )
      .run()
    const expired = await gateway(
      `/api/matchmaker/matchinfo/identity:${USER_ID}`,
      headers
    )
    expect(await expired.json()).toEqual({ type: 'no_match_found' })
    expect(recoveryRequests).toBe(3)
  })

  it('suppresses no-load results and stale results after a newer match attempt', async () => {
    const principal = await deriveGamePrincipal(USER_ID)
    const opponent = '0x3333333333333333333333333333333333333333'
    const now = new Date().toISOString()
    const insert = (
      proposal: string,
      status: 'ended' | 'failed',
      result: string | null,
      endedAt: string | null
    ) =>
      env.AUTH_DB.prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, version, player1_principal,
            player2_principal, player1_user_id, player2_user_id,
            match_payload_json, server_address, status, result_json,
            created_at, updated_at, ended_at)
         VALUES (?, ?, 'PRACTICE_PVP', 'recent-release', ?, ?, ?, NULL,
                 '{}', NULL, ?, ?, ?, ?, ?)`
      )
        .bind(
          proposal,
          `replay-${proposal}`,
          principal,
          opponent,
          USER_ID,
          status,
          result,
          now,
          now,
          endedAt
        )
        .run()

    await insert(
      'no-load-proposal',
      'ended',
      JSON.stringify({ reason: 'players_did_not_load' }),
      now
    )
    const headers = await authenticatedHeaders()
    delete (headers as { Upgrade?: string }).Upgrade
    const path = `/api/matchmaker/matchinfo/identity:${USER_ID}`
    expect(await (await gateway(path, headers)).json()).toEqual({
      type: 'no_match_found'
    })

    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches SET result_json = '{}'
       WHERE proposal_id = 'no-load-proposal'`
    ).run()
    await insert('newer-failed-proposal', 'failed', null, null)
    expect(await (await gateway(path, headers)).json()).toEqual({
      type: 'no_match_found'
    })
  })

  it('allows public live-match lookup without leaking ended or unknown matches', async () => {
    const playerId = '33333333-3333-4333-8333-333333333333'
    const playerPrincipal = await deriveGamePrincipal(playerId)
    const opponent = '0x4444444444444444444444444444444444444444'
    const now = new Date().toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, avatar_url, created_at, updated_at)
       VALUES (?, 'Spectated Player', 'spectated@example.com', NULL, ?, ?)`
    )
      .bind(playerId, now, now)
      .run()
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, server_address, status, created_at, updated_at)
       VALUES ('spectated-proposal', 'spectated-replay', 'RANKED_CONSTRUCTED',
               'spectated-release', ?, ?, ?, NULL, ?, ?, 'active', ?, ?)`
    )
      .bind(
        playerPrincipal,
        opponent,
        playerId,
        JSON.stringify({
          match: {
            player1: { account: { address: playerPrincipal } },
            player2: { account: { address: opponent } }
          }
        }),
        'wss://opensky.example/api/game/matches/spectated-proposal',
        now,
        now
      )
      .run()

    const headers = await authenticatedHeaders()
    delete (headers as { Upgrade?: string }).Upgrade
    const response = await gateway(
      `/api/matchmaker/matchinfo/identity:${playerId}`,
      headers
    )
    expect(await response.json()).toMatchObject({
      type: 'in_progress_match_info',
      matchInfo: { serverLocationKey: 'match:spectated-proposal' }
    })

    const publicResponse = await gateway(
      `/api/matchmaker/matchinfo/identity:${playerId}`,
      {}
    )
    expect(await publicResponse.json()).toMatchObject({
      type: 'in_progress_match_info',
      matchInfo: { serverLocationKey: 'match:spectated-proposal' }
    })

    const unknown = await gateway(
      '/api/matchmaker/matchinfo/identity:unknown-player',
      {}
    )
    expect(await unknown.json()).toEqual({ type: 'no_match_found' })

    let recentRequests = 0
    recentMatchResponse = () => {
      recentRequests += 1
      return Response.json({ private: true })
    }
    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches
       SET status = 'ended', result_json = '{}', ended_at = ?
       WHERE proposal_id = 'spectated-proposal'`
    )
      .bind(new Date().toISOString())
      .run()
    const ended = await gateway(
      `/api/matchmaker/matchinfo/identity:${playerId}`,
      {}
    )
    expect(await ended.json()).toEqual({ type: 'no_match_found' })
    expect(recentRequests).toBe(0)
  })

  it('rejects missing sessions and malformed match IDs before service dispatch', async () => {
    const unauthenticated = await gateway('/api/matchmaker', {
      Upgrade: 'websocket',
      Origin: 'https://opensky.example'
    })
    expect(unauthenticated.status).toBe(401)
    await unauthenticated.json()

    const malformed = await gateway(
      '/api/game/matches/not%20valid',
      await authenticatedHeaders()
    )
    expect(malformed.status).toBe(400)
    await malformed.json()
  })
})
