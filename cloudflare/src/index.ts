import { handleApiRequest } from './api'
import { AccountDeletionRepository } from './account-deletion'
import { applyAssetCachePolicy } from './asset-cache'
import { deliverDueConquestGold } from './conquest-delivery'
import { runConquestReadinessDrills } from './conquest-drill'
import {
  CONQUEST_V2_REWARD_QUEUE_NAME,
  ConquestV2RewardWorkflow,
  dispatchDueConquestV2Rewards,
  handleConquestV2RewardQueue,
  type ConquestV2RewardQueueMessage
} from './conquest-v2-reward-orchestration'
import type { Env } from './env'
import { handleIdentityRequest } from './identity-api'
import {
  dispatchDueLeaderboardRewards,
  handleLeaderboardRewardQueue,
  LEADERBOARD_REWARD_QUEUE_NAME,
  LeaderboardRewardWorkflow,
  type LeaderboardRewardQueueMessage
} from './leaderboard-reward-orchestration'
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
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname.toLowerCase() === '/ping'
    ) {
      return new Response(request.method === 'HEAD' ? null : '.', {
        status: 200,
        headers: {
          'content-type': 'text/plain'
        }
      })
    }
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
        runConquestReadinessDrills(env),
        dispatchDueConquestV2Rewards(env),
        dispatchDueLeaderboardRewards(env),
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
  },
  async queue(
    batch: MessageBatch<
      ConquestV2RewardQueueMessage | LeaderboardRewardQueueMessage
    >,
    env
  ): Promise<void> {
    if (batch.queue === CONQUEST_V2_REWARD_QUEUE_NAME) {
      await handleConquestV2RewardQueue(
        batch as MessageBatch<ConquestV2RewardQueueMessage>,
        env.AUTH_DB
      )
      return
    }
    if (batch.queue === LEADERBOARD_REWARD_QUEUE_NAME) {
      await handleLeaderboardRewardQueue(
        batch as MessageBatch<LeaderboardRewardQueueMessage>,
        env.AUTH_DB
      )
      return
    }
    throw new Error(`unsupported Queue binding: ${batch.queue}`)
  }
} satisfies ExportedHandler<
  Env,
  ConquestV2RewardQueueMessage | LeaderboardRewardQueueMessage
>

export { ConquestV2RewardWorkflow, LeaderboardRewardWorkflow }
