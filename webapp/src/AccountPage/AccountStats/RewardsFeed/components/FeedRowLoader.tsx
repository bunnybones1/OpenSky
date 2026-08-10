import { keyframes } from '@emotion/react'
import styled from '@emotion/styled'
import { memo } from 'react'
import { Transition } from 'react-transition-group'

import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'

const FeedRowLoaderRow = memo(({ opacity }: { opacity?: number }) => (
  <StyledFeedRowWrapper>
    <Box
      width="100%"
      position="absolute"
      zIndex={1}
      left={0}
      top={0}
      height="100%"
      bg="purple5"
      opacity={opacity || 0.3}
    />
  </StyledFeedRowWrapper>
))

FeedRowLoaderRow.displayName = 'FeedRowLoaderRow'

interface FeedRowLoaderProps {
  isFetching: boolean
}

export const FeedRowLoader = memo(({ isFetching }: FeedRowLoaderProps) => {
  return (
    <Transition appear={true} timeout={125} in={isFetching} unmountOnExit={true}>
      {(state) => (
        <FlexBox
          width="100%"
          height="auto"
          overflow="hidden"
          type="centered-start-column"
          bg="purple1"
          position="absolute"
          left={0}
          top={0}
          transitionTheme={true}
          zIndex={2}
          style={{
            pointerEvents: 'none',
            opacity: state === 'entering' || state === 'entered' ? 1 : 0
          }}
        >
          <FeedRowLoaderRow opacity={0.9} />
          <FeedRowLoaderRow opacity={0.8} />
          <FeedRowLoaderRow opacity={0.7} />
          <FeedRowLoaderRow opacity={0.6} />
          <FeedRowLoaderRow opacity={0.5} />
          <FeedRowLoaderRow opacity={0.4} />
          <FeedRowLoaderRow />
          <FeedRowLoaderRow />
          <FeedRowLoaderRow />
          <FeedRowLoaderRow />
        </FlexBox>
      )}
    </Transition>
  )
})

const FeedRowLoaderAnim = keyframes`
  0% {
    opacity: 1
  }
  60% {
    opacity: 0.5
  }
  100% {
    opacity: 1
  }
`

const StyledFeedRowWrapper = styled.div`
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
  animation: ${FeedRowLoaderAnim} 2s infinite ease-in-out;
`

FeedRowLoader.displayName = 'FeedRowLoader'
