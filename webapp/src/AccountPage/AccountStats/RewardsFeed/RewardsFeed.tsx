import { memo } from 'react'

import { Box, FlexBox } from '~/shared/components/Base'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { useFeed } from '~/shared/queries/useFeed'

import { EmptyFeed } from './components/EmptyFeed'
import { FeedRowLoader } from './components/FeedRowLoader'
import { FeedRow } from './FeedList/FeedRow/FeedRow'

export const RewardsFeed = memo(() => {
  const { data: activeAccount } = useActiveAccount()

  const { data: feedItems, isLoading } = useFeed(activeAccount?.address)

  return (
    <Box width="100%" height="auto">
      <FlexBox
        width="100%"
        flex={1}
        type="centered-start-column"
        position="relative"
        bg="purple1"
      >
        <FeedRowLoader isFetching={feedItems === undefined || isLoading} />
        <FlexBox
          className="feedListWrapper"
          type="centered-start-column"
          width="100%"
        >
          {!!feedItems &&
            feedItems.feed.map((feedItem) => (
              <FeedRow key={feedItem.id} feedItem={feedItem} />
            ))}
          {(feedItems === null || !feedItems?.feed.length) &&
            feedItems !== undefined && <EmptyFeed />}
        </FlexBox>
      </FlexBox>
    </Box>
  )
})

RewardsFeed.displayName = 'RewardsFeed'
