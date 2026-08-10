import clsx from 'clsx'
import { memo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'

import { DeckCardsCountSpanStyle, DeckCardsCountStyle } from './DeckCardsCount.css'

interface DeckCardsCountProps {
  numCardsInDeck?: number
  numCardsRequiredInDeck: number
}

export const DeckCardsCount = memo(
  ({ numCardsInDeck, numCardsRequiredInDeck }: DeckCardsCountProps) => {
    const isInvalid = numCardsInDeck !== numCardsRequiredInDeck

    if (numCardsInDeck === undefined) {
      return <Icon type="spinner" height="16px" color="white" />
    }

    return (
      <Text
        className={DeckCardsCountStyle}
        color="purple8"
        fontSize="14px"
        fontWeight="400"
      >
        <span className={clsx({ isInvalid }, DeckCardsCountSpanStyle)}>
          {numCardsInDeck}
        </span>
        {` / ${numCardsRequiredInDeck}`}
      </Text>
    )
  }
)

DeckCardsCount.displayName = 'DeckCardsCount'
