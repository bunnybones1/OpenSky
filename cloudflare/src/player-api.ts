import { readCookies } from './cookies'
import type { Env } from './env'
import {
  IDENTITY_SESSION_COOKIE,
  verifyIdentitySession
} from './identity-session'
import { PlayerRepository } from './player'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })

const authenticatedUserId = (request: Request, env: Env) => {
  const token = readCookies(request).get(IDENTITY_SESSION_COOKIE)
  return token
    ? verifyIdentitySession(token, env.SESSION_SIGNING_KEY)
    : undefined
}

const sameOrigin = (request: Request): boolean => {
  const origin = request.headers.get('Origin')
  return !origin || origin === new URL(request.url).origin
}

export const handlePlayerRequest = async (
  request: Request,
  env: Env
): Promise<Response> => {
  const userId = await authenticatedUserId(request, env)
  if (!userId) {
    return json(
      {
        code: 'player.unauthorized',
        message: 'Sign in to access player data.'
      },
      401
    )
  }

  const url = new URL(request.url)
  const players = new PlayerRepository(env.AUTH_DB)

  try {
    if (url.pathname === '/api/player/bootstrap' && request.method === 'POST') {
      if (!sameOrigin(request)) {
        return json(
          {
            code: 'player.forbidden',
            message: 'Cross-origin requests are not allowed.'
          },
          403
        )
      }
      const existing = await players.getState(userId)
      return json({
        player: await players.bootstrap(userId),
        created: !existing
      })
    }
    if (url.pathname === '/api/player/state' && request.method === 'GET') {
      const player = await players.getState(userId)
      return player
        ? json({ player })
        : json(
            {
              code: 'player.not_initialized',
              message: 'Player setup is required.'
            },
            404
          )
    }
    return json(
      { code: 'player.not_found', message: 'Player route not found.' },
      404
    )
  } catch (error) {
    console.error('Cloudflare player API error', error)
    return json(
      { code: 'player.internal', message: 'Unable to load player data.' },
      500
    )
  }
}
