import { BaseCard } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { ComponentType } from 'react'
import { memo } from 'react'

import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckCardsListCards } from './components/DeckCardsListCards'
import { DeckCardsListFooterGradient, DeckCardsListStyle } from './DeckCardsList.css'

const DEFAULT_CARD_IDS: BaseCard[] = []

interface DeckCardsListProps {
  deckString: string
  CardRowComponent: ComponentType<{ id: BaseCard }>
  FooterComponent?: ComponentType
}

export const DeckCardsList = memo(
  ({ deckString, CardRowComponent, FooterComponent }: DeckCardsListProps) => {
    const { deckClass, cardIds } = useDecodedDeckString(deckString)

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            height: 'full',
            position: 'relative',
            flexDirection: 'column',
            backgroundColor: 'purple3'
          }),
          DeckCardsListStyle
        )}
      >
        <DeckCardsListCards
          CardRowComponent={CardRowComponent}
          cardIds={cardIds || DEFAULT_CARD_IDS}
          deckClass={deckClass}
        />
        {!!FooterComponent && (
          <div
            className={Sprinkles({
              width: 'full',
              position: 'relative',
              borderTop: '1px solid',
              borderColor: 'purple7'
            })}
          >
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  pointerEvents: 'none',
                  position: 'absolute',
                  left: 0
                }),
                DeckCardsListFooterGradient
              )}
            />
            <FooterComponent />
          </div>
        )}
      </div>
    )
  }
)

DeckCardsList.displayName = 'DeckCardsList'
