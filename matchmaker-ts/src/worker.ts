import { CLOUDFLARE_MATCHMAKER_POOL_NAME } from '@opensky/shared/cloudflare-multiplayer'

import { isGamePrincipal } from './identity'
import { MATCHMAKER_PATH } from './protocol'
import {
  INTERNAL_AUTH_HEADER,
  MatchmakerEnv,
  MatchmakerPool,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from './runtime'

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  })

const allowedOrigin = (request: Request, env: MatchmakerEnv) => {
  const allowed = new Set(
    (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  )
  const origin = request.headers.get('Origin')
  return origin !== null && allowed.has(origin)
}

const hasTrustedGatewayIdentity = (request: Request, env: MatchmakerEnv) => {
  const principal = request.headers.get(TRUSTED_PRINCIPAL_HEADER) ?? ''
  const userId = request.headers.get(TRUSTED_USER_ID_HEADER) ?? ''
  const token = request.headers.get(INTERNAL_AUTH_HEADER) ?? ''
  return (
    env.INTERNAL_AUTH_SECRET.length >= 16 &&
    token === env.INTERNAL_AUTH_SECRET &&
    isGamePrincipal(principal) &&
    userId.length > 0 &&
    userId.length <= 256
  )
}

export default {
  async fetch(request: Request, env: MatchmakerEnv): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        component: 'cloud-weasel-matchmaker',
        protocolVersion: 3
      })
    }
    if (url.pathname !== MATCHMAKER_PATH)
      return json({ error: 'not found' }, 404)
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return json({ error: 'websocket upgrade required' }, 426)
    }
    if (!allowedOrigin(request, env))
      return json({ error: 'origin not allowed' }, 403)
    if (!hasTrustedGatewayIdentity(request, env)) {
      return json({ error: 'authenticated gateway required' }, 401)
    }

    // A single durable pool preserves the original global queue semantics. The
    // matching core still separates incompatible sessions, versions and modes.
    // Sharding can be introduced later with an explicit compatibility contract.
    const pool = env.MATCHMAKER_POOLS.getByName(CLOUDFLARE_MATCHMAKER_POOL_NAME)
    return pool.fetch(request)
  }
} satisfies ExportedHandler<MatchmakerEnv>

export { MatchmakerPool }
