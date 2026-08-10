import { memo } from 'react'

import { Box } from '~/shared/components/Base'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { FeedItem, FeedItemType } from '~/shared/types/feed'

import { CardbackGained } from './components/CardbackGained'
import { CardGained } from './components/CardGained'
import { ConquestTreasure } from './components/ConquestTreasure'
import { RankUp } from './components/RankUp'
import { StickerGained } from './components/StickerGained'
import { TicketsGained } from './components/TicketsGained'

interface Props {
  feedItem: FeedItem
}

export const FeedRowImages = memo(({ feedItem }: Props) => {
  const renderImageType = () => {
    switch (feedItem.type) {
      case FeedItemType.cardGained: {
        return <CardGained meta={feedItem.meta} />
      }
      case FeedItemType.stickerGained: {
        return <StickerGained meta={feedItem.meta} />
      }
      case FeedItemType.cardbackGained: {
        return <CardbackGained meta={feedItem.meta} />
      }
      case FeedItemType.rankedRewards: {
        return <CardGained meta={feedItem.meta} />
      }
      case FeedItemType.rankedRewardsTickets:
      case FeedItemType.ticketGained: {
        return <TicketsGained />
      }
      case FeedItemType.rankUp: {
        return (
          <RankUp
            rank={feedItem.meta.rank}
            mode={feedItem.meta.mode}
            rankStage={feedItem.meta.rankStage}
          />
        )
      }
      case FeedItemType.delayedRewards: {
        return (
          <>
            <CardGained meta={feedItem.meta} />
            <Box
              style={{
                position: 'absolute',
                right: feedItem.meta.cards.length === 1 ? '24%' : '8%',
                bottom: '20px',
                zIndex: 10
              }}
            >
              <Icon
                type="clock-stroke"
                color="warm6"
                height="32px"
                style={{ filter: 'drop-shadow(0px 0px 2px #000)' }}
              />
            </Box>
          </>
        )
      }
      case FeedItemType.delayedRewardsMinted: {
        return <CardGained meta={feedItem.meta} />
      }
      case FeedItemType.conquestV2Reward: {
        return <ConquestTreasure level={feedItem.meta.level} />
      }
      default:
        return null
    }
  }
  return (
    <FlexBox position="relative" width="30%" height="100%">
      {renderImageType()}
    </FlexBox>
  )
})

FeedRowImages.displayName = 'FeedRowImages'
