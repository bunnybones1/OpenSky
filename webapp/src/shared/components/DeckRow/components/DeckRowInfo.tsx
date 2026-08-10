import { DeckClass } from '@opensky/proto'
import clsx from 'clsx'
import { memo } from 'react'

import { CostGraph } from '~/shared/components/CostGraph/CostGraph'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckRowInfoCountSpan, DeckRowInfoStyle } from './DeckRowInfo.css'

interface DeckRowInfoProps {
  deckClass: DeckClass
  numCardsInDeck?: number
  numCardsRequiredInDeck: number
  isLarge: boolean
  name: string
  hasGradeMeter: boolean
  deckString: string
}

export const DeckRowInfo = memo(
  ({
    name,
    hasGradeMeter,
    isLarge,
    numCardsInDeck,
    numCardsRequiredInDeck,
    deckString
  }: DeckRowInfoProps) => {
    const isInvalid =
      numCardsInDeck !== undefined && numCardsInDeck !== numCardsRequiredInDeck

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start'
          }),
          DeckRowInfoStyle,
          { noGradeMeter: !hasGradeMeter }
        )}
      >
        <Text
          fontSize={isLarge ? '22px' : '18px'}
          fontFamily="condensed"
          color="white"
          marginBottom="4px"
          fontWeight="500"
        >
          {name.toUpperCase()}
        </Text>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: 'nowrap'
          })}
        >
          {numCardsInDeck === undefined ? (
            <Icon type="spinner" color="white" height="14px" />
          ) : (
            <Text
              marginRight="4px"
              color="purple8"
              fontSize={isLarge ? '16px' : '12px'}
              fontWeight="400"
            >
              <span className={clsx({ isInvalid }, DeckRowInfoCountSpan)}>
                {numCardsInDeck}
              </span>
              {` / ${numCardsRequiredInDeck}`}
            </Text>
          )}

          <CostGraph deckString={deckString} height={isLarge ? 14.29 : 10} />
        </div>
      </div>
    )
  }
)

DeckRowInfo.displayName = 'DeckRowInfo'
