import styled from '@emotion/styled'
import { memo, useMemo } from 'react'

import { Text } from '~/__deprecated__/Text'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { FeedItem, FeedItemType } from '~/shared/types/feed'

import { FeedRowText } from './components/FeedRowText'
import { FeedRowImages } from './FeedRowImages/FeedRowImages'

interface Props {
  feedItem: FeedItem
}

export const FeedRow = memo(({ feedItem }: Props) => {
  const isTablet = useResponsiveQuery('tablet')

  const icon = useMemo(() => {
    switch (feedItem.type) {
      case FeedItemType.rankUp: {
        return 'rank-up' as const
      }
      default:
        return 'cards' as const
    }
  }, [feedItem.type])

  const readableDate = useMemo(() => {
    const date = new Date(feedItem.createdAt)
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
  }, [feedItem.createdAt])

  return (
    <FeedRowWrapper data-id={`feed-row-${feedItem.type}`}>
      <FlexBox
        width="100%"
        type="centered-start-row"
        position="absolute"
        zIndex={1}
        left={0}
        top={0}
        height="100%"
        border="1px solid"
        borderColor="purple7"
        flexWrap="nowrap"
      >
        <FlexBox
          width="15%"
          height="100%"
          borderRight="1px solid"
          type="centered-row"
          borderColor="purple7"
        >
          <Icon type={icon} height={!isTablet ? '24px' : '32px'} color="purple9" />
        </FlexBox>
        <FlexBox type="start-column" flex={1} pl={[16, 16, 24, 32]}>
          <FeedRowText feedItem={feedItem} />
          <FlexBox type="centered-start-row" mt={[2, 2, 3, 4]}>
            <Text fontSize={1} fontFamily="mono" color="purple9">
              {readableDate}
            </Text>
          </FlexBox>
        </FlexBox>
        <FeedRowImages feedItem={feedItem} />
      </FlexBox>
    </FeedRowWrapper>
  )
})

const FeedRowWrapper = styled.div`
  position: relative;
  width: 100%;
  margin: 6px 0 6px 0;
  padding-top: calc((11 / 75) * 100%);
  &:last-of-type {
    margin-bottom: 0px;
  }
  &:first-of-type {
    margin-top: 0px;
  }
`

FeedRow.displayName = 'FeedRow'
