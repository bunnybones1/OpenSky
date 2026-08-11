import { handleApiRequest } from './api'
import type { Env } from './env'
import { handleIdentityRequest } from './identity-api'
import { handleMultiplayerGateway } from './multiplayer-gateway'
import { handlePlayerRequest } from './player-api'
import { handleReplayRequest } from './replays'

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (
      url.pathname === '/api/matchmaker' ||
      url.pathname.startsWith('/api/matchmaker/') ||
      url.pathname.startsWith('/api/game/matches/')
    ) {
      return handleMultiplayerGateway(request, env)
    }
    if (url.pathname.startsWith('/api/auth/'))
      return handleIdentityRequest(request, env)
    if (url.pathname.startsWith('/api/player/'))
      return handlePlayerRequest(request, env)
    if (url.pathname.startsWith('/api/replays/'))
      return handleReplayRequest(request, env)
    if (url.pathname.startsWith('/api/')) return handleApiRequest(request, env)
    return env.ASSETS.fetch(request)
  }
} satisfies ExportedHandler<Env>
