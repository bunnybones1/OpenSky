import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo } from 'react'
import { push } from 'redux-first-history'

import { SoundClient } from '~/shared/clients'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { CardImage } from '~/shared/components/CardImage/CardImage'
import { makeItemsCardDetailsRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux/index'
import { CardsGainedFeedItem } from '~/shared/types/feed'

import { FeedItemGlow } from '../shared/components/FeedItemGlow'

interface Props {
  meta: CardsGainedFeedItem['meta']
}

export const CardGained = memo(({ meta }: Props) => {
  let additionalCards = 0
  const maxCardsToShow = 5

  const dispatch = useDispatch()

  let cardShowAmount = meta.cards.length
  if (cardShowAmount > maxCardsToShow) {
    additionalCards = meta.cards.length - maxCardsToShow
    cardShowAmount = maxCardsToShow
  }

  let additionalCardsText = 'CARDS'

  if (additionalCards === 1) {
    additionalCardsText = 'CARD'
  }

  return (
    <>
      <CardGainedWrapper
        className={clsx({
          oneCard: cardShowAmount === 1,
          twoCard: cardShowAmount === 2,
          threeCard: cardShowAmount === 3,
          fourCard: cardShowAmount === 4,
          fiveCard: cardShowAmount === 5
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
        {meta.cards.map((card, i) => {
          if (i < maxCardsToShow) {
            return (
              <Box
                key={`${card.id}-${i}`}
                style={{
                  zIndex: i,
                  width: `${100 / meta.cards.length}%`,
                  position: 'absolute',
                  top: '0px',
                  left: '50%',
                  maxWidth: '50%',
                  minWidth: '30%',
                  transformOrigin: 'center 120%'
                }}
                onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
                onMouseDown={() => SoundClient.playSound('CursorMainClick')}
                onClick={() => dispatch(push(makeItemsCardDetailsRoute(card.id)))}
                className="rewardCard"
              >
                <CardImage id={card.id} />
              </Box>
            )
          }
          return null
        })}
        {additionalCards > 0 && (
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
            + {additionalCards} {additionalCardsText}
          </Box>
        )}
      </CardGainedWrapper>
      <FeedItemGlow />
    </>
  )
})

const CardGainedWrapper = styled(FlexBox)`
  &.oneCard {
    .rewardCard {
      transform: translate(-55%, 4px);
    }
  }
  &.twoCard {
    .rewardCard {
      :nth-of-type(1) {
        transform: translate(-45%, 4px) rotate(10deg);
      }
      :nth-of-type(2) {
        transform: translate(-55%, 4px) rotate(-10deg);
      }
    }
  }
  &.threeCard {
    .rewardCard {
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
  &.fourCard {
    .rewardCard {
      :nth-of-type(1) {
        transform: translate(-35%, 12px) rotate(30deg);
      }
      :nth-of-type(2) {
        transform: translate(-45%, 8px) rotate(15deg);
      }
      :nth-of-type(3) {
        transform: translate(-55%, 8px) rotate(-15deg);
      }
      :nth-of-type(4) {
        transform: translate(-65%, 12px) rotate(-30deg);
      }
    }
  }
  &.fiveCard {
    .rewardCard {
      :nth-of-type(1) {
        transform: translate(-10%, 12px) rotate(30deg);
      }
      :nth-of-type(2) {
        transform: translate(-30%, 8px) rotate(15deg);
      }
      :nth-of-type(3) {
        transform: translateX(-50%);
      }
      :nth-of-type(4) {
        transform: translate(-70%, 8px) rotate(-15deg);
      }
      :nth-of-type(5) {
        transform: translate(-90%, 12px) rotate(-30deg);
      }
    }
  }
`

CardGained.displayName = 'CardGained'
