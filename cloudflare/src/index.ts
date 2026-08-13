import { handleApiRequest } from './api'
import { AccountDeletionRepository } from './account-deletion'
import { applyAssetCachePolicy } from './asset-cache'
import { deliverDueConquestGold } from './conquest-delivery'
import { runDueConquestV2Rewards } from './conquest-v2-reward-worker'
import type { Env } from './env'
import { handleIdentityRequest } from './identity-api'
import { runDueLeaderboardRewards } from './leaderboard-reward-worker'
import { handleMultiplayerGateway } from './multiplayer-gateway'
import { handlePlayerRequest } from './player-api'
import { runPushNotifications } from './push-notifications'
import { runReferralStickerRewards } from './referral-sticker-rewards'
import { handleReplayRequest } from './replays'
import { runDueSkypassAutoClaims } from './skypass-auto-claim'
import { WalletLinksRepository } from './wallet-links'

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
    return applyAssetCachePolicy(request, await env.ASSETS.fetch(request))
  },
  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(
      Promise.all([
        deliverDueConquestGold(env.AUTH_DB),
        runDueConquestV2Rewards(env.AUTH_DB),
        runDueLeaderboardRewards(env.AUTH_DB),
        runReferralStickerRewards(env.AUTH_DB),
        runDueSkypassAutoClaims(env.AUTH_DB),
        runPushNotifications(env.AUTH_DB, env),
        new AccountDeletionRepository(
          env.AUTH_DB,
          env.CLIENT_FEEDBACK
        ).finalizeDue(),
        new WalletLinksRepository(env.AUTH_DB).cleanupExpired()
      ]).then(() => undefined)
    )
  }
} satisfies ExportedHandler<Env>
