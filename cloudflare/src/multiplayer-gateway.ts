import { deriveGamePrincipal } from '@opensky/shared/game-principal'

import { readCookies } from './cookies'
import type { Env } from './env'
import {
  IDENTITY_SESSION_COOKIE,
  verifyIdentitySession
} from './identity-session'
import { IdentitiesRepository } from './identities'

const INTERNAL_AUTH_HEADER = 'x-cloud-weasel-internal-auth'
const TRUSTED_PRINCIPAL_HEADER = 'x-cloud-weasel-principal'
const TRUSTED_USER_ID_HEADER = 'x-cloud-weasel-user-id'
const TRUSTED_DISPLAY_NAME_HEADER = 'x-cloud-weasel-display-name'
const TRUSTED_CLIENT_IP_HEADER = 'x-cloud-weasel-client-ip'
const MATCH_INFO_PREFIX = '/api/matchmaker/matchinfo/'

interface MatchInfoRow {
  id: number
  proposal_id: string
  replay_id: string
  mode: string
  version: string
  match_payload_json: string
  server_address: string
}

const json = (body: unknown, status: number) =>
  Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  })

const identity = async (request: Request, env: Env) => {
  const token = readCookies(request).get(IDENTITY_SESSION_COOKIE)
  if (!token) return
  const userId = await verifyIdentitySession(token, env.SESSION_SIGNING_KEY)
  if (!userId) return
  const user = await new IdentitiesRepository(env.AUTH_DB).findUserById(userId)
  if (!user) return
  return { user, principal: await deriveGamePrincipal(userId) }
}

const trustedRequest = (
  request: Request,
  target: string,
  userId: string,
  displayName: string,
  principal: string,
  env: Env
) => {
  const headers = new Headers(request.headers)
  headers.delete('authorization')
  headers.delete('cookie')
  headers.set(INTERNAL_AUTH_HEADER, env.INTERNAL_AUTH_SECRET)
  headers.set(TRUSTED_PRINCIPAL_HEADER, principal)
  headers.set(TRUSTED_USER_ID_HEADER, userId)
  headers.set(TRUSTED_DISPLAY_NAME_HEADER, displayName.slice(0, 256))
  headers.set(
    TRUSTED_CLIENT_IP_HEADER,
    (request.headers.get('CF-Connecting-IP') ?? '').slice(0, 128)
  )
  return new Request(target, { method: request.method, headers })
}

const activeMatchFor = (env: Env, principal: string) =>
  env.AUTH_DB.prepare(
    `SELECT id, proposal_id, replay_id, mode, version, match_payload_json,
            server_address
     FROM multiplayer_matches
     WHERE status = 'active'
       AND server_address IS NOT NULL
       AND (player1_principal = ? OR player2_principal = ?)
     ORDER BY updated_at DESC
     LIMIT 1`
  )
    .bind(principal, principal)
    .first<MatchInfoRow>()

const matchInfo = async (env: Env, principal: string) => {
  const row = await activeMatchFor(env, principal)
  if (!row) return json({ type: 'no_match_found' }, 200)

  try {
    const payload = JSON.parse(row.match_payload_json) as {
      match?: {
        player1?: { account?: { address?: unknown } }
        player2?: { account?: { address?: unknown } }
      }
    }
    const playerIDs = [
      payload.match?.player1?.account?.address,
      payload.match?.player2?.account?.address
    ]
    if (playerIDs.some((address) => typeof address !== 'string')) {
      throw new Error('match payload is missing player addresses')
    }
    const websocket = new URL(row.server_address)
    const releaseVersion =
      env.MULTIPLAYER_RELEASE_VERSION?.trim() || row.version || 'cloud-weasel'
    return json(
      {
        type: 'in_progress_match_info',
        matchInfo: {
          id: row.id,
          replayID: row.replay_id,
          mode: row.mode,
          playerIDs,
          version: releaseVersion,
          initialized: true
        },
        serverInfo: {
          status: 'online',
          name: 'cloud-weasel-game-server',
          hostname: websocket.hostname,
          internalHostname: '',
          port: Number(websocket.port) || (websocket.protocol === 'wss:' ? 443 : 80),
          ws: row.server_address,
          http: row.server_address.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'),
          internalHttp: '',
          load: {
            inProgressMatches: 1,
            maxCapacity: 1,
            completedMatches: 0
          },
          releaseVersion
        },
        // The Go matchmaker reports this duration in seconds.
        disconnectTimeout: 180
      },
      200
    )
  } catch (error) {
    console.error('invalid active match record', row.proposal_id, error)
    return json({ type: 'error', level: 'server', message: 'Match record is invalid.' }, 500)
  }
}

export const handleMultiplayerGateway = async (
  request: Request,
  env: Env
): Promise<Response> => {
  const authenticated = await identity(request, env)
  if (!authenticated) return json({ error: 'authentication required' }, 401)
  const url = new URL(request.url)

  if (request.method === 'GET' && url.pathname.startsWith(MATCH_INFO_PREFIX)) {
    return matchInfo(env, authenticated.principal)
  }
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return json({ error: 'websocket upgrade required' }, 426)
  }
  const common = [
    authenticated.user.id,
    authenticated.user.displayName,
    authenticated.principal,
    env
  ] as const

  if (url.pathname === '/api/matchmaker' || url.pathname === '/api/matchmaker/') {
    const target = new URL('https://cloud-weasel-matchmaker/v1/matchmaker')
    target.search = url.search
    return env.MATCHMAKER_SERVICE.fetch(
      trustedRequest(request, target.href, ...common)
    )
  }
  if (url.pathname.startsWith('/api/game/matches/')) {
    const proposal = url.pathname.slice('/api/game/matches/'.length)
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(proposal)) {
      return json({ error: 'invalid match ID' }, 400)
    }
    const target = `https://cloud-weasel-game/v1/matches/${encodeURIComponent(proposal)}`
    return env.GAME_SERVICE.fetch(trustedRequest(request, target, ...common))
  }
  return json({ error: 'not found' }, 404)
}
