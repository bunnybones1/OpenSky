import { GameMode, PlayerRank, PlayerRankStage } from '@opensky/proto'
import { CardBack, Sticker } from '@opensky/shared/constants'

import { CardType } from '~/shared/constants/cards'

interface BaseFeedItem {
  createdAt: string
  id: number
}

export enum FeedItemType {
  cardGained = 'cardGained',
  ticketGained = 'ticketGained',
  stickerGained = 'stickerGained',
  cardbackGained = 'cardbackGained',
  rankedRewards = 'rankedRewards',
  rankedRewardsTickets = 'rankedRewardsTickets',
  rankUp = 'rankUp',
  delayedRewards = 'delayedRewards',
  delayedRewardsMinted = 'delayedRewardsMinted',
  starterDeckUnlocked = 'starterDeckUnlocked',
  conquestV2Reward = 'conquestV2Reward'
}

export interface CardsGainedFeedItem extends BaseFeedItem {
  type:
    | FeedItemType.cardGained
    | FeedItemType.delayedRewards
    | FeedItemType.delayedRewardsMinted
    | FeedItemType.rankedRewards
  meta: {
    cards: CardType[]
  }
}

export interface StickersGainedFeedItem extends BaseFeedItem {
  type: FeedItemType.stickerGained
  meta: {
    stickers: Sticker[]
  }
}

export interface CardbackGainedFeedItem extends BaseFeedItem {
  type: FeedItemType.cardbackGained
  meta: {
    cardbacks: CardBack[]
  }
}

export interface RankUpFeedItem extends BaseFeedItem {
  type: FeedItemType.rankUp
  meta: {
    rank: PlayerRank
    rankStage?: PlayerRankStage
    mode: GameMode
  }
}

export interface ConquestV2FeedItem extends BaseFeedItem {
  type: FeedItemType.conquestV2Reward
  meta: {
    level: number
    amount: number
  }
}

export interface TicketGainedFeedItem extends BaseFeedItem {
  type: FeedItemType.ticketGained | FeedItemType.rankedRewardsTickets
  meta: number
}

export interface StartDeckUnlockedFeedItem extends BaseFeedItem {
  type: FeedItemType.starterDeckUnlocked
}

export type FeedItem =
  | CardsGainedFeedItem
  | StickersGainedFeedItem
  | CardbackGainedFeedItem
  | RankUpFeedItem
  | ConquestV2FeedItem
  | TicketGainedFeedItem
  | StartDeckUnlockedFeedItem
