import { handleApiRequest } from './api'
import { AccountDeletionRepository } from './account-deletion'
import { deliverDueConquestGold } from './conquest-delivery'
import type { Env } from './env'
import { handleIdentityRequest } from './identity-api'
import { runDueLeaderboardRewards } from './leaderboard-reward-worker'
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
  },
  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(
      Promise.all([
        deliverDueConquestGold(env.AUTH_DB),
        runDueLeaderboardRewards(env.AUTH_DB),
        new AccountDeletionRepository(env.AUTH_DB).finalizeDue()
      ]).then(() => undefined)
    )
  }
} satisfies ExportedHandler<Env>
