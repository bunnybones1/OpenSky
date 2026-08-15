import type {
  Notification,
  NotificationConquestV2Reward,
  NotificationEarnedRank,
  NotificationLeaderboardReward,
  NotificationOneTime,
  NotificationOneTimeWrapper,
  NotificationSeasonStart,
  NotificationType,
  PlayerRank,
  PlayerRankStage
} from '@opensky/proto'

type Nullable<T> = T | null | undefined

type SourceNotificationEarnedRankInput = {
  playerRank?: Nullable<PlayerRank>
  playerRankStage?: Nullable<PlayerRankStage>
}

type SourceNotificationLeaderboardRewardInput = {
  season?: number
  week?: number
  silverCardAmounts?: Nullable<Record<number, number>>
  ticketAmount?: number
  earnedConstructedPlayerRanks?: Nullable<
    readonly SourceNotificationEarnedRankInput[]
  >
  earnedDiscoveryPlayerRanks?: Nullable<
    readonly SourceNotificationEarnedRankInput[]
  >
  rankedConstructedRank?: number
  rankedDiscoveryRank?: number
}

type SourceNotificationConquestV2RewardInput = {
  season?: number
  week?: number
  treasureLevel?: number
  amountUSDC?: number
  silverCardAmounts?: Nullable<Record<number, number>>
}

type SourceNotificationOneTimeWrapperInput = {
  id?: number
  name?: string
  data?: unknown
}

type SourceNotificationSeasonStartInput = {
  seasonNumber?: number
  seasonName?: string
}

export type SourceNotificationInput = {
  id?: number
  type?: Nullable<NotificationType>
  leaderboardReward?: Nullable<SourceNotificationLeaderboardRewardInput>
  conquestV2Reward?: Nullable<SourceNotificationConquestV2RewardInput>
  oneTime?: Nullable<SourceNotificationOneTimeWrapperInput>
  seasonStart?: Nullable<SourceNotificationSeasonStartInput>
}

export type SourceNotificationOneTimeInput = {
  id?: number
  name?: string
  data?: unknown
  filter?: unknown
  createdAt?: Nullable<string>
  validFrom?: Nullable<string>
  expiresAt?: Nullable<string>
  updatedAt?: Nullable<string>
  updatedBy?: Nullable<number>
}

const sourceEarnedRankWire = (
  rank: SourceNotificationEarnedRankInput
): NotificationEarnedRank =>
  ({
    playerRank: rank.playerRank ?? null,
    playerRankStage: rank.playerRankStage ?? null
  }) as unknown as NotificationEarnedRank

const sourceEarnedRankListWire = (
  ranks: readonly SourceNotificationEarnedRankInput[] | null | undefined
): NotificationEarnedRank[] | null =>
  ranks == null ? null : ranks.map(sourceEarnedRankWire)

const sourceLeaderboardRewardWire = (
  reward: SourceNotificationLeaderboardRewardInput = {}
): NotificationLeaderboardReward =>
  ({
    season: reward.season ?? 0,
    week: reward.week ?? 0,
    silverCardAmounts: reward.silverCardAmounts ?? null,
    ticketAmount: reward.ticketAmount ?? 0,
    earnedConstructedPlayerRanks: sourceEarnedRankListWire(
      reward.earnedConstructedPlayerRanks
    ),
    earnedDiscoveryPlayerRanks: sourceEarnedRankListWire(
      reward.earnedDiscoveryPlayerRanks
    ),
    rankedConstructedRank: reward.rankedConstructedRank ?? 0,
    rankedDiscoveryRank: reward.rankedDiscoveryRank ?? 0
  }) as unknown as NotificationLeaderboardReward

const sourceConquestV2RewardWire = (
  reward: SourceNotificationConquestV2RewardInput = {}
): NotificationConquestV2Reward =>
  ({
    season: reward.season ?? 0,
    week: reward.week ?? 0,
    treasureLevel: reward.treasureLevel ?? 0,
    amountUSDC: reward.amountUSDC ?? 0,
    silverCardAmounts: reward.silverCardAmounts ?? null
  }) as unknown as NotificationConquestV2Reward

const sourceOneTimeWrapperWire = (
  wrapper: SourceNotificationOneTimeWrapperInput = {}
): NotificationOneTimeWrapper =>
  ({
    id: wrapper.id ?? 0,
    name: wrapper.name ?? '',
    ...(wrapper.data == null ? {} : { data: wrapper.data })
  }) as NotificationOneTimeWrapper

const sourceSeasonStartWire = (
  season: SourceNotificationSeasonStartInput = {}
): NotificationSeasonStart => ({
  seasonNumber: season.seasonNumber ?? 0,
  seasonName: season.seasonName ?? ''
})

/** Recreates encoding/json output for the generated Go notification union. */
export const sourceNotificationWire = (
  notification: SourceNotificationInput
): Notification => {
  const result: Record<string, unknown> = {
    id: notification.id ?? 0,
    type: notification.type ?? null
  }
  switch (notification.type) {
    case 'LEADERBOARD_REWARD':
      result.leaderboardReward = sourceLeaderboardRewardWire(
        notification.leaderboardReward ?? undefined
      )
      break
    case 'CONQUEST_V2_REWARD':
      result.conquestV2Reward = sourceConquestV2RewardWire(
        notification.conquestV2Reward ?? undefined
      )
      break
    case 'ONE_TIME':
      result.oneTime = sourceOneTimeWrapperWire(
        notification.oneTime ?? undefined
      )
      break
    case 'SEASON_START':
      result.seasonStart = sourceSeasonStartWire(
        notification.seasonStart ?? undefined
      )
      break
  }
  return result as unknown as Notification
}

export const sourceNullableNotificationListWire = (
  notifications: readonly SourceNotificationInput[]
): Notification[] | null =>
  notifications.length ? notifications.map(sourceNotificationWire) : null

/** Recreates encoding/json output for the generated Go staff template struct. */
export const sourceNotificationOneTimeWire = (
  notification: SourceNotificationOneTimeInput
): NotificationOneTime =>
  ({
    id: notification.id ?? 0,
    name: notification.name ?? '',
    ...(notification.data == null ? {} : { data: notification.data }),
    ...(notification.filter == null ? {} : { filter: notification.filter }),
    createdAt: notification.createdAt ?? null,
    ...(notification.validFrom == null
      ? {}
      : { validFrom: notification.validFrom }),
    ...(notification.expiresAt == null
      ? {}
      : { expiresAt: notification.expiresAt }),
    updatedAt: notification.updatedAt ?? null,
    updatedBy: notification.updatedBy ?? null
  }) as unknown as NotificationOneTime

export const sourceNullableNotificationOneTimeListWire = (
  notifications: readonly SourceNotificationOneTimeInput[]
): NotificationOneTime[] | null =>
  notifications.length ? notifications.map(sourceNotificationOneTimeWire) : null
