import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { EXPECTED_QUEUES } from './audit-cloudflare-mint-queues.mjs'

export const EXPECTED_VISIBILITY = {
  ExitConquestQueue: [
    'player_conquest_feed_events',
    "['REWARD', silverTokenIds]",
    "['DELAYED_REWARD', goldTokenIds]",
    'FeedEventType.DELAYED_REWARD',
    'usePendingCards()'
  ],
  MintConquestEntriesQueue: [
    'stripe_checkout_fulfillment_receipts',
    "'SW_CONQUEST_TICKET'",
    'IdentityInventoryInfo',
    'conquestTicketBalance.total'
  ],
  MintSilverCardRewardsQueue: [
    'player_leaderboard_reward_feed_events',
    "'LEADERBOARD_REWARD'",
    'LeaderboardRewardNotification',
    'FeedEventType.LEADERBOARD_REWARD'
  ],
  MintTicketRewardsQueue: [
    'player_leaderboard_reward_feed_events',
    "'LEADERBOARD_REWARD'",
    'ticketAmount',
    'FeedItemType.ticketGained'
  ],
  MintStickerRewardsQueue: [
    'referral_sticker_reward_inventory_grants',
    "'SW_STICKERS'",
    'useTokenBalances(ItemType.SW_STICKERS)',
    'refetchInterval: THIRTY_SECONDS * 2'
  ],
  DelayedMintingQueue: [
    'player_conquest_feed_events',
    "'DELAYED_REWARD_MINTED'",
    'FeedEventType.DELAYED_REWARD_MINTED',
    'usePendingCards()'
  ],
  ConquestV2SendRewardQueue: [
    'player_conquest_v2_reward_feed_events',
    "'CONQUEST_V2_REWARD'",
    "type: 'REWARD'",
    'ConquestCardRewardNotification'
  ],
  MintLeaderboardRewardsQueue: [
    'player_leaderboard_reward_inventory_grants',
    'player_leaderboard_reward_feed_events',
    "'LEADERBOARD_REWARD'",
    'LeaderboardRewardNotification'
  ],
  MintCardBackRewardsQueue: [
    'player_skypass_claim_inventory_grants',
    'response.rewards',
    'FeedItemType.cardbackGained',
    'claimedRewards'
  ],
  MintSkypassConquestTicketsQueue: [
    'player_skypass_claim_inventory_grants',
    'response.rewards',
    'FeedItemType.ticketGained',
    'claimedRewards'
  ],
  MintSkypassSilverCardsQueue: [
    'player_skypass_claim_inventory_grants',
    'handleOpenModal(response.rewards)',
    'FeedItemType.cardGained',
    'claimedRewardCards'
  ],
  MintSkypassStickersQueue: [
    'player_skypass_claim_inventory_grants',
    'response.rewards',
    'FeedItemType.stickerGained',
    'claimedRewards'
  ]
}

export const rewardVisibilityAuditErrors = ({
  queueReviews = EXPECTED_QUEUES,
  evidenceSources
}) => {
  const errors = []
  for (const [queue, review] of Object.entries(queueReviews)) {
    const hasNoPlayerOutcome = review.disposition === 'unused-infrastructure'
    const visibility = EXPECTED_VISIBILITY[queue]
    if (hasNoPlayerOutcome) {
      if (visibility) {
        errors.push(
          `${queue} is unused infrastructure but has an active player visibility contract`
        )
      }
      continue
    }
    if (!visibility) {
      errors.push(`${queue} has no reviewed player-visible off-chain outcome`)
      continue
    }
    const evidence = evidenceSources[queue] ?? ''
    for (const token of visibility) {
      if (!evidence.includes(token)) {
        errors.push(`${queue} is missing player visibility evidence: ${token}`)
      }
    }
  }
  for (const queue of Object.keys(EXPECTED_VISIBILITY)) {
    if (!queueReviews[queue]) {
      errors.push(`visibility contract references an unknown queue: ${queue}`)
    }
  }

  const notificationQuery = evidenceSources.notificationQuery ?? ''
  for (const token of [
    'staleTime: THIRTY_SECONDS',
    'refetchInterval: ONE_MINUTE'
  ]) {
    if (!notificationQuery.includes(token)) {
      errors.push(`scheduled reward notifications can remain stale: ${token}`)
    }
  }
  if (notificationQuery.includes('refetchIntervalInBackground: true')) {
    errors.push('scheduled reward notifications poll in background tabs')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sources = async files =>
    (await Promise.all(files.map(file => readFile(path.join(root, file), 'utf8')))).join(
      '\n'
    )
  const [
    conquest,
    leaderboard,
    referral,
    conquestV2,
    skypass,
    stripe,
    browserFeed,
    browserPending,
    browserNotifications,
    browserInventory,
    notificationQuery
  ] = await Promise.all([
    sources([
      'game-server-cloudflare/src/conquest-settlement.ts',
      'cloudflare/src/conquest-delivery.ts',
      'cloudflare/src/player-rpc.ts'
    ]),
    sources([
      'cloudflare/src/leaderboard-reward-worker.ts',
      'cloudflare/src/player-rpc.ts',
      'webapp/src/HomePage/NotificationsDialog/components/LeaderboardRewardNotification.tsx'
    ]),
    sources([
      'cloudflare/src/referral-sticker-rewards.ts',
      'webapp/src/shared/hooks/stickers/useFilteredStickerList.tsx',
      'webapp/src/shared/queries/useTokenBalances.ts'
    ]),
    sources([
      'cloudflare/src/conquest-v2-reward-worker.ts',
      'cloudflare/src/player-rpc.ts',
      'webapp/src/HomePage/NotificationsDialog/NotificationsDialog.tsx'
    ]),
    sources([
      'cloudflare/src/player-rpc.ts',
      'webapp/src/SkyPassPage/SkyPassForeground/SkyPassClaimReward/SkyPassClaimReward.tsx'
    ]),
    sources([
      'cloudflare/src/stripe-checkout.ts',
      'webapp/src/shared/components/ProfileLink/IdentityInventoryInfo.tsx',
      'webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/IdentityInventoryInfo.tsx'
    ]),
    sources(['webapp/src/shared/queries/useFeed.ts']),
    sources([
      'webapp/src/shared/queries/cards/usePendingCards.ts',
      'webapp/src/PendingGoldsPage/PendingGoldsPage.tsx'
    ]),
    sources([
      'webapp/src/HomePage/NotificationsDialog/NotificationsDialog.tsx',
      'webapp/src/HomePage/NotificationsDialog/components/LeaderboardRewardNotification.tsx',
      'webapp/src/HomePage/NotificationsDialog/components/ConquestCardRewardNotification.tsx'
    ]),
    sources([
      'webapp/src/shared/queries/useTokenBalances.ts',
      'webapp/src/shared/queries/useConquestAndUSDCBalances.ts',
      'webapp/src/shared/components/ProfileLink/IdentityInventoryInfo.tsx',
      'webapp/src/AccountPage/AccountIdentity/ExpandedBattleTag/IdentityInventoryInfo.tsx'
    ]),
    sources(['webapp/src/shared/queries/useNotifications.ts'])
  ])
  const errors = rewardVisibilityAuditErrors({
    evidenceSources: {
      ExitConquestQueue: `${conquest}\n${browserFeed}\n${browserPending}`,
      MintConquestEntriesQueue: `${stripe}\n${browserInventory}`,
      MintSilverCardRewardsQueue: `${leaderboard}\n${browserFeed}\n${browserNotifications}`,
      MintTicketRewardsQueue: `${leaderboard}\n${browserFeed}\n${browserNotifications}`,
      MintStickerRewardsQueue: `${referral}\n${browserInventory}`,
      DelayedMintingQueue: `${conquest}\n${browserFeed}\n${browserPending}`,
      ConquestV2SendRewardQueue: `${conquestV2}\n${browserFeed}\n${browserNotifications}`,
      MintLeaderboardRewardsQueue: `${leaderboard}\n${browserFeed}\n${browserNotifications}`,
      MintCardBackRewardsQueue: `${skypass}\n${browserFeed}`,
      MintSkypassConquestTicketsQueue: `${skypass}\n${browserFeed}`,
      MintSkypassSilverCardsQueue: `${skypass}\n${browserFeed}`,
      MintSkypassStickersQueue: `${skypass}\n${browserFeed}`,
      notificationQuery
    }
  })
  if (errors.length) {
    for (const error of errors) {
      process.stderr.write(`Reward visibility audit: ${error}\n`)
    }
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'All 12 active off-chain transaction queues retain reviewed player-visible outcomes\n'
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
