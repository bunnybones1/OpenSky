import { handleApiRequest } from './api'
import {
  AccountDeletionWorkflow,
  dispatchPendingAccountDeletions
} from './account-deletion-orchestration'
import { applyAssetCachePolicy } from './asset-cache'
import {
  dispatchDueConquestGoldDeliveries,
  handleConquestGoldDeliveryQueue
} from './conquest-delivery'
import {
  ConquestReadinessDrillWorkflow,
  dispatchPendingConquestReadinessDrills
} from './conquest-drill-orchestration'
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
import {
  dispatchDuePushNotifications,
  handlePushNotificationQueue,
  PUSH_NOTIFICATION_QUEUE_NAME,
  type PushNotificationQueueMessage
} from './push-notifications'
import {
  dispatchDueReferralStickerRewards,
  handleReferralStickerRewardQueue,
  REFERRAL_STICKER_REWARD_QUEUE_NAME,
  ReferralStickerRewardWorkflow,
  type ReferralStickerRewardQueueMessage
} from './referral-sticker-reward-orchestration'
import { handleReplayRequest } from './replays'
import {
  dispatchDueSkypassAutoClaims,
  handleSkypassAutoClaimQueue,
  SKYPASS_AUTO_CLAIM_QUEUE_NAME,
  SkypassSeasonCloseWorkflow,
  type SkypassAutoClaimQueueMessage
} from './skypass-auto-claim'
import {
  WALLET_CHALLENGE_CLEANUP_CRON,
  WalletLinksRepository
} from './wallet-links'
import {
  CONQUEST_GOLD_DELIVERY_QUEUE_NAME,
  type ConquestGoldDeliveryQueueMessage
} from '@opensky/shared/conquest-gold-delivery'

export const DURABLE_EFFECT_DISCOVERY_CRON = '* * * * *'

export type DurableEffectDiscovery = Readonly<{
  name: string
  run: (env: Env) => Promise<unknown>
}>

export const DURABLE_EFFECT_DISCOVERIES: readonly DurableEffectDiscovery[] =
  Object.freeze([
    {
      name: 'conquest-gold-delivery',
      run: env => dispatchDueConquestGoldDeliveries(env)
    },
    {
      name: 'conquest-readiness-drill',
      run: env => dispatchPendingConquestReadinessDrills(env)
    },
    {
      name: 'conquest-v2-rewards',
      run: env => dispatchDueConquestV2Rewards(env)
    },
    {
      name: 'leaderboard-rewards',
      run: env => dispatchDueLeaderboardRewards(env)
    },
    {
      name: 'referral-sticker-rewards',
      run: env => dispatchDueReferralStickerRewards(env)
    },
    {
      name: 'skypass-auto-claims',
      run: env => dispatchDueSkypassAutoClaims(env)
    },
    {
      name: 'push-notifications',
      run: env => dispatchDuePushNotifications(env.AUTH_DB, env)
    },
    {
      name: 'account-deletions',
      run: env => dispatchPendingAccountDeletions(env)
    }
  ])

export const runScheduled = (
  controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
  durableEffectDiscoveries = DURABLE_EFFECT_DISCOVERIES
): void => {
  if (controller.cron === WALLET_CHALLENGE_CLEANUP_CRON) {
    ctx.waitUntil(
      new WalletLinksRepository(env.AUTH_DB)
        .cleanupExpired()
        .then(() => undefined)
    )
    return
  }
  if (controller.cron !== DURABLE_EFFECT_DISCOVERY_CRON) {
    throw new Error(`unsupported Cron Trigger: ${controller.cron}`)
  }
  for (const discovery of durableEffectDiscoveries) {
    // Register every independent responsibility before starting it. Cloudflare
    // keeps separately registered waitUntil promises alive when a sibling
    // rejects, while the rejection still marks the Cron invocation failed.
    ctx.waitUntil(
      Promise.resolve()
        .then(() => discovery.run(env))
        .then(() => undefined)
    )
  }
}

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
  async scheduled(controller, env, ctx): Promise<void> {
    runScheduled(controller, env, ctx)
  },
  async queue(
    batch: MessageBatch<
      | ConquestGoldDeliveryQueueMessage
      | ConquestV2RewardQueueMessage
      | LeaderboardRewardQueueMessage
      | PushNotificationQueueMessage
      | ReferralStickerRewardQueueMessage
      | SkypassAutoClaimQueueMessage
    >,
    env
  ): Promise<void> {
    if (batch.queue === CONQUEST_GOLD_DELIVERY_QUEUE_NAME) {
      await handleConquestGoldDeliveryQueue(
        batch as MessageBatch<ConquestGoldDeliveryQueueMessage>,
        env.AUTH_DB
      )
      return
    }
    if (batch.queue === CONQUEST_V2_REWARD_QUEUE_NAME) {
      await handleConquestV2RewardQueue(
        batch as MessageBatch<ConquestV2RewardQueueMessage>,
        env.AUTH_DB,
        new Date(),
        env
      )
      return
    }
    if (batch.queue === LEADERBOARD_REWARD_QUEUE_NAME) {
      await handleLeaderboardRewardQueue(
        batch as MessageBatch<LeaderboardRewardQueueMessage>,
        env.AUTH_DB,
        new Date(),
        env
      )
      return
    }
    if (batch.queue === PUSH_NOTIFICATION_QUEUE_NAME) {
      await handlePushNotificationQueue(
        batch as MessageBatch<PushNotificationQueueMessage>,
        env.AUTH_DB,
        env
      )
      return
    }
    if (batch.queue === REFERRAL_STICKER_REWARD_QUEUE_NAME) {
      await handleReferralStickerRewardQueue(
        batch as MessageBatch<ReferralStickerRewardQueueMessage>,
        env.AUTH_DB
      )
      return
    }
    if (batch.queue === SKYPASS_AUTO_CLAIM_QUEUE_NAME) {
      await handleSkypassAutoClaimQueue(
        batch as MessageBatch<SkypassAutoClaimQueueMessage>,
        env.AUTH_DB
      )
      return
    }
    throw new Error(`unsupported Queue binding: ${batch.queue}`)
  }
} satisfies ExportedHandler<
  Env,
  | ConquestGoldDeliveryQueueMessage
  | ConquestV2RewardQueueMessage
  | LeaderboardRewardQueueMessage
  | PushNotificationQueueMessage
  | ReferralStickerRewardQueueMessage
  | SkypassAutoClaimQueueMessage
>

export {
  AccountDeletionWorkflow,
  ConquestReadinessDrillWorkflow,
  ConquestV2RewardWorkflow,
  LeaderboardRewardWorkflow,
  ReferralStickerRewardWorkflow,
  SkypassSeasonCloseWorkflow
}
