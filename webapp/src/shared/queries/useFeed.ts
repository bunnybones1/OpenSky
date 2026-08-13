import {
  FeedEventType,
  GameMode,
  GetFeedReturn,
  ItemType,
  SortOrder
} from '@opensky/proto'
import { getBaseID, getItemType } from '@opensky/shared/assetsIDs'
import { useQuery } from '@tanstack/react-query'

import env from '~/env'
import { APIClient } from '~/shared/clients'

import { AllCardBacks } from '../constants/card-backs'
import { Cards } from '../constants/cards'
import { getFeedKey } from '../constants/react-query-keys'
import { AllStickers } from '../constants/stickers'
import { ONE_MINUTE } from '../constants/time'
import { isDefined } from '../helpers/is-defined-is-not-null'
import {
  CardbackGainedFeedItem,
  CardsGainedFeedItem,
  ConquestV2FeedItem,
  FeedItem,
  FeedItemType,
  RankUpFeedItem,
  StartDeckUnlockedFeedItem,
  StickersGainedFeedItem,
  TicketGainedFeedItem
} from '../types/feed'

const getCardsFromTokenIds = (tokenIds: number[]) =>
  tokenIds
    .map((id) => {
      const _id = id >= 10000 ? id : getBaseID(id)
      return Cards.get(_id)
    })
    .filter(isDefined)

const processEvents = (
  events: GetFeedReturn
): { page?: GetFeedReturn['page']; feed: FeedItem[] } => {
  const feedEvents = events.res

  const feed = feedEvents.reduce((feedItems, event) => {
    const _tokenIds = event.tokenIds

    if (event.type === FeedEventType.REWARD && _tokenIds) {
      // Can be ticket, sticker or cardback
      const ticketIds = _tokenIds.filter(
        (tokenId) => getItemType(tokenId) === ItemType.SW_CONQUEST_TICKET
      )
      const stickers = _tokenIds
        .filter((tokenId) => getItemType(tokenId) === ItemType.SW_STICKERS)
        .map((id) => AllStickers.get(id))
        .filter(isDefined)

      const cardbacks = _tokenIds
        .filter((tokenId) => getItemType(tokenId) === ItemType.SW_CARD_BACKS)
        .map((id) => AllCardBacks.get(id))
        .filter(isDefined)

      if (ticketIds.length > 0) {
        return [
          ...feedItems,
          {
            meta: ticketIds.length,
            type: FeedItemType.ticketGained,
            id: event.id,
            createdAt: event.createdAt
          } as TicketGainedFeedItem
        ]
      }

      if (stickers.length > 0) {
        return [
          ...feedItems,
          {
            type: FeedItemType.stickerGained,
            id: event.id,
            createdAt: event.createdAt,
            meta: {
              stickers
            }
          } as StickersGainedFeedItem
        ]
      }

      if (cardbacks.length > 0) {
        return [
          ...feedItems,
          {
            type: FeedItemType.cardbackGained,
            id: event.id,
            createdAt: event.createdAt,
            meta: {
              cardbacks
            }
          } as CardbackGainedFeedItem
        ]
      }
    }

    if (event.type === FeedEventType.REWARD && event.cards && _tokenIds) {
      const cards = getCardsFromTokenIds(_tokenIds)

      if (cards && cards.length > 0) {
        return [
          ...feedItems,
          {
            type: FeedItemType.cardGained,
            id: event.id,
            createdAt: event.createdAt,
            meta: {
              cards
            }
          } as CardsGainedFeedItem
        ]
      }
    }

    if (event.type === FeedEventType.RANKUP && !!event.playerRank) {
      return [
        ...feedItems,
        {
          type: FeedItemType.rankUp,
          id: event.id,
          createdAt: event.createdAt,
          meta: {
            rank: event.playerRank,
            rankStage: event.playerRankStage,
            mode:
              event.gameMode === GameMode.RANKED_CONSTRUCTED
                ? GameMode.RANKED_CONSTRUCTED
                : GameMode.RANKED_DISCOVERY
          }
        } as RankUpFeedItem
      ]
    }

    if (event.type === FeedEventType.DELAYED_REWARD && _tokenIds) {
      const cards = getCardsFromTokenIds(_tokenIds)

      if (cards && cards.length > 0) {
        return [
          ...feedItems,
          {
            type: FeedItemType.delayedRewards,
            id: event.id,
            createdAt: event.createdAt,
            meta: {
              cards
            }
          } as CardsGainedFeedItem
        ]
      }
    }
    if (event.type === FeedEventType.DELAYED_REWARD_MINTED && _tokenIds) {
      const cards = getCardsFromTokenIds(_tokenIds)

      if (cards && cards.length > 0) {
        return [
          ...feedItems,
          {
            type: FeedItemType.delayedRewardsMinted,
            id: event.id,
            createdAt: event.createdAt,
            meta: {
              cards
            }
          } as CardsGainedFeedItem
        ]
      }
    }

    if (event.type === FeedEventType.STARTED_DECK_UNLOCK) {
      return [
        ...feedItems,
        {
          type: FeedItemType.starterDeckUnlocked,
          id: event.id,
          createdAt: event.createdAt
        } as StartDeckUnlockedFeedItem
      ]
    }

    if (
      env.AUTH_MODE !== 'google' &&
      event.type === FeedEventType.CONQUEST_V2_REWARD &&
      event.conquestV2Reward &&
      event.conquestV2TreasureLevel
    ) {
      return [
        ...feedItems,
        {
          type: FeedItemType.conquestV2Reward,
          id: event.id,
          createdAt: event.createdAt,
          meta: {
            level: event.conquestV2TreasureLevel,
            amount: event.conquestV2Reward
          }
        } as ConquestV2FeedItem
      ]
    }

    if (event.type === FeedEventType.LEADERBOARD_REWARD && _tokenIds) {
      const cards = getCardsFromTokenIds(_tokenIds)
      const ticketIds = _tokenIds.filter(
        (tokenId) => getItemType(tokenId) === ItemType.SW_CONQUEST_TICKET
      )

      const toAdd: FeedItem[] = []

      if (cards && cards.length > 0) {
        if (cards.length <= 5) {
          toAdd.push({
            type: FeedItemType.rankedRewards,
            id: event.id,
            createdAt: event.createdAt,
            meta: {
              cards
            }
          } as CardsGainedFeedItem)
        } else {
          // Break into two events for better visibility
          const cardSet1 = cards.slice(0, 5)
          const cardSet2 = cards.slice(5)
          toAdd.push({
            type: FeedItemType.rankedRewards,
            id: event.id,
            createdAt: event.createdAt,
            meta: {
              cards: cardSet1
            }
          } as CardsGainedFeedItem)
          toAdd.push({
            type: FeedItemType.rankedRewards,
            id: event.id,
            createdAt: event.createdAt,
            meta: {
              cards: cardSet2
            }
          } as CardsGainedFeedItem)
        }
      }

      if (ticketIds.length > 0) {
        // add ticket feeditem here
        toAdd.push({
          type: FeedItemType.rankedRewardsTickets,
          id: event.id,
          createdAt: event.createdAt,
          meta: ticketIds.length
        } as TicketGainedFeedItem)
      }
      return feedItems.concat(toAdd)
    }
    return feedItems
  }, [] as FeedItem[])

  return { feed, page: events.page }
}

export const useFeed = (address?: string) => {
  return useQuery({
    queryKey: getFeedKey(address),
    staleTime: ONE_MINUTE * 5,
    enabled: !!address,
    queryFn: async () => {
      if (!address) return null

      const events = await APIClient.opensky.getFeed({
        req: {
          accountAddress: address
        },
        page: {
          pageSize: 50,
          sort: [{ column: 'created_at', order: SortOrder.DESC }]
        }
      })

      return processEvents(events)
    }
  })
}
