import { GameMatch, GameServerEnv } from './game-match'
import {
  CreateMatchRequest,
  INTERNAL_AUTH_HEADER,
  MATCH_PATH_PREFIX,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from './protocol'

const MAX_CREATE_REQUEST_BYTES = 1024 * 1024

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  })

const isInternal = (request: Request, env: GameServerEnv) =>
  env.INTERNAL_AUTH_SECRET.length >= 16 &&
  request.headers.get(INTERNAL_AUTH_HEADER) === env.INTERNAL_AUTH_SECRET

const allowedOrigin = (request: Request, env: GameServerEnv) => {
  const origin = request.headers.get('Origin')
  return (
    origin !== null &&
    new Set(
      (env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    ).has(origin)
  )
}

export default {
  async fetch(request: Request, env: GameServerEnv): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        component: 'cloud-weasel-game-server',
        protocolVersion: 2
      })
    }
    if (request.method === 'POST' && url.pathname === '/internal/matches') {
      if (!isInternal(request, env)) return json({ error: 'not found' }, 404)
      const length = Number(request.headers.get('content-length') ?? 0)
      if (length > MAX_CREATE_REQUEST_BYTES) {
        return json({ error: 'request too large' }, 413)
      }
      let body: CreateMatchRequest
      try {
        const text = await request.text()
        if (new TextEncoder().encode(text).byteLength > MAX_CREATE_REQUEST_BYTES) {
          return json({ error: 'request too large' }, 413)
        }
        body = JSON.parse(text) as CreateMatchRequest
      } catch {
        return json({ error: 'invalid JSON' }, 400)
      }
      if (!body || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.proposalId ?? '')) {
        return json({ error: 'invalid proposal ID' }, 400)
      }
      const match = env.GAME_MATCHES.getByName(`match:${body.proposalId}`)
      try {
        return await match.fetch(
          new Request('https://game-match/internal/create', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              [INTERNAL_AUTH_HEADER]: env.INTERNAL_AUTH_SECRET
            },
            body: JSON.stringify(body)
          })
        )
      } catch (error) {
        console.error('match creation failed', error)
        return json({ error: error instanceof Error ? error.message : 'match creation failed' }, 400)
      }
    }
    if (request.method === 'GET' && url.pathname.startsWith(MATCH_PATH_PREFIX)) {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return json({ error: 'websocket upgrade required' }, 426)
      }
      if (!allowedOrigin(request, env)) return json({ error: 'origin not allowed' }, 403)
      if (
        !isInternal(request, env) ||
        !/^0x[0-9a-f]{40}$/.test(request.headers.get(TRUSTED_PRINCIPAL_HEADER) ?? '') ||
        !(request.headers.get(TRUSTED_USER_ID_HEADER) ?? '').length
      ) {
        return json({ error: 'authenticated gateway required' }, 401)
      }
      let proposalId: string
      try {
        proposalId = decodeURIComponent(url.pathname.slice(MATCH_PATH_PREFIX.length))
      } catch {
        return json({ error: 'invalid match ID' }, 400)
      }
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(proposalId)) {
        return json({ error: 'invalid match ID' }, 400)
      }
      return env.GAME_MATCHES.getByName(`match:${proposalId}`).fetch(request)
    }
    return json({ error: 'not found' }, 404)
  }
} satisfies ExportedHandler<GameServerEnv>

export { GameMatch }
