import clsx from 'clsx'
import { memo } from 'react'

import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { OwnedCardsCountStyle } from './OwnedCardsCount.css'

interface OwnedCardsCountProps {
  numOwnedCards: number
  numTotalCards: number
}

export const OwnedCardsCount = memo(
  ({ numOwnedCards, numTotalCards }: OwnedCardsCountProps) => {
    const isFullyOwned = numOwnedCards === numTotalCards
    return (
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          padding: '8px',
          alignItems: 'center',
          justifyContent: 'flex-start',
          backgroundColor: 'purple3'
        })}
      >
        <Text
          color={isFullyOwned ? 'forest5' : 'warm5'}
          fontSize="12px"
          fontWeight="500"
        >
          {numOwnedCards}
        </Text>
        <Text marginLeft="4px" color="purple9" fontSize="12px" fontWeight="500">
          {`/ ${numTotalCards}`}
        </Text>
        <div
          className={clsx(
            Sprinkles({
              flex: 1,
              marginLeft: '8px',
              position: 'relative'
            }),
            OwnedCardsCountStyle
          )}
        >
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              backgroundColor: 'purple5'
            })}
          />
          {!!numOwnedCards && (
            <div
              className={Sprinkles({
                height: 'full',
                position: 'absolute',
                left: 0,
                top: 0,
                backgroundColor: isFullyOwned ? 'forest5' : 'warm5',
                zIndex: 1
              })}
              style={{
                width: `${(numOwnedCards / numTotalCards) * 100}%`
              }}
            />
          )}
        </div>
      </div>
    )
  }
)

OwnedCardsCount.displayName = 'OwnedCardsCount'
