import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo } from 'react'

import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { CardbackGainedFeedItem } from '~/shared/types/feed'

import { FeedItemGlow } from '../shared/components/FeedItemGlow'

interface Props {
  meta: CardbackGainedFeedItem['meta']
}

export const CardbackGained = memo(({ meta }: Props) => {
  const { getAssetUrl } = useGetAssetContext()
  let additionalCardback = 0
  const maxCardbacksToShow = 3

  let cardbackShowAmount = meta.cardbacks.length
  if (cardbackShowAmount > maxCardbacksToShow) {
    additionalCardback = meta.cardbacks.length - maxCardbacksToShow
    cardbackShowAmount = maxCardbacksToShow
  }

  let additionalCardbackText = 'CARDBACKS'

  if (additionalCardback === 1) {
    additionalCardbackText = 'CARDBACK'
  }

  return (
    <>
      <CardbackGainedWrapper
        className={clsx({
          oneCardback: cardbackShowAmount === 1,
          twoCardbacks: cardbackShowAmount === 2,
          threeCardbacks: cardbackShowAmount === 3
        })}
        height="100%"
        width="100%"
        justifyContent="center"
        overflow="hidden"
        position="absolute"
        top={0}
        left={0}
        zIndex={2}
      >
        {meta.cardbacks.map((cardback, i) => {
          if (i < maxCardbacksToShow) {
            return (
              <Box
                key={`${cardback.id}-${i}`}
                style={{
                  zIndex: i,
                  width: `${100 / meta.cardbacks.length}%`,
                  position: 'absolute',
                  top: '0px',
                  left: '50%',
                  maxWidth: '50%',
                  minWidth: '30%',
                  transformOrigin: 'center 120%'
                }}
                className="rewardCardback"
              >
                {!!getAssetUrl && (
                  <CardbackImg
                    src={getAssetUrl(`webapp/card-backs/4x/${cardback.artID}.webp`)}
                  />
                )}
              </Box>
            )
          }
          return null
        })}
        {additionalCardback > 0 && (
          <Box
            style={{
              color: '#c5b4f4',
              zIndex: 20,
              position: 'absolute',
              right: '5px',
              top: '5px',
              fontSize: '11px'
            }}
          >
            + {additionalCardback} {additionalCardbackText}
          </Box>
        )}
      </CardbackGainedWrapper>
      <FeedItemGlow />
    </>
  )
})

const CardbackImg = styled.img`
  filter: brightness(100%);
  width: 100%;
  -webkit-filter: brightness(100%);
`

const CardbackGainedWrapper = styled(FlexBox)`
  &.oneCardback {
    .rewardCardback {
      transform: translate(-55%, 4px);
    }
  }
  &.twoCardbacks {
    .rewardCardback {
      :nth-of-type(1) {
        transform: translate(-45%, 4px) rotate(10deg);
      }
      :nth-of-type(2) {
        transform: translate(-55%, 4px) rotate(-10deg);
      }
    }
  }
  &.threeCardbacks {
    .rewardCardback {
      :nth-of-type(1) {
        transform: translate(-30%, 8px) rotate(15deg);
      }
      :nth-of-type(2) {
        transform: translateX(-50%);
      }
      :nth-of-type(3) {
        transform: translate(-80%, 8px) rotate(-15deg);
      }
    }
  }
`

CardbackGained.displayName = 'CardbackGained'
