import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

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
  GAME_MATCHES: namespace(request =>
    Response.json({
      target: new URL(request.url).pathname,
      principal: request.headers.get('x-cloud-weasel-principal'),
      userId: request.headers.get('x-cloud-weasel-user-id'),
      internal: request.headers.get('x-cloud-weasel-internal-auth'),
      cookie: request.headers.get('cookie')
    })
  )
} satisfies Env

const gateway = (path: string, headers: HeadersInit) =>
  handleMultiplayerGateway(
    new Request(`https://opensky.example${path}`, { headers }),
    testEnv
  )

beforeEach(async () => {
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
      internal: 'multiplayer-gateway-test-secret',
      cookie: null
    })
  })

  it('restores the source match-info contract for the authenticated principal', async () => {
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
      // The URL address is deliberately forged. Session identity is authoritative.
      '/api/matchmaker/matchinfo/0xffffffffffffffffffffffffffffffffffffffff',
      headers
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      type: 'in_progress_match_info',
      matchInfo: {
        id: expect.any(Number),
        replayID: 'gateway-replay',
        mode: 'PRACTICE_BOT',
        playerIDs: [principal, opponent],
        version: 'client-release',
        initialized: true
      },
      serverInfo: {
        status: 'online',
        name: 'cloud-weasel-game-server',
        hostname: 'opensky.example',
        internalHostname: '',
        port: 443,
        ws: 'wss://opensky.example/api/game/matches/gateway-proposal',
        http: 'https://opensky.example/api/game/matches/gateway-proposal',
        internalHttp: '',
        load: {
          inProgressMatches: 1,
          maxCapacity: 1,
          completedMatches: 0
        },
        releaseVersion: 'client-release'
      },
      disconnectTimeout: 180
    })
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
