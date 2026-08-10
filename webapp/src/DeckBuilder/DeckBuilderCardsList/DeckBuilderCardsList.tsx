import clsx from 'clsx'
import { memo } from 'react'

import { DeckCardsList } from '~/shared/components/DeckCardsList/DeckCardsList'
import { DeckStatsList } from '~/shared/components/DeckStatsList/DeckStatsList'
import { Portal } from '~/shared/components/Portal'
import { DECK_BUILDER_CARDS_LIST_ID } from '~/shared/constants/ui'
import { useSelector } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { deckBuilderDeckStringSelector } from '../shared/selectors'
import { DeckBuilderCardRow } from './components/DeckBuilderCardRow'
import { DeckBuilderCardListFooter } from './DeckBuilderCardListFooter/DeckBuilderCardListFooter'
import { DeckBuilderCardsListStyle } from './DeckBuilderCardsList.css'

interface DeckBuilderCardsListProps {
  isStatsOpen: boolean
}

export const DeckBuilderCardsList = memo(
  ({ isStatsOpen }: DeckBuilderCardsListProps) => {
    const deckString = useSelector(deckBuilderDeckStringSelector)

    if (!deckString) return null

    return (
      <Portal>
        <div
          className={clsx(
            Sprinkles({ position: 'fixed', right: 0 }),
            DeckBuilderCardsListStyle
          )}
          id={DECK_BUILDER_CARDS_LIST_ID}
        >
          {!!isStatsOpen && !!deckString && (
            <DeckStatsList hideTopPlayer deckString={deckString} />
          )}
          <DeckCardsList
            deckString={deckString}
            CardRowComponent={DeckBuilderCardRow}
            FooterComponent={DeckBuilderCardListFooter}
          />
        </div>
      </Portal>
    )
  }
)

DeckBuilderCardsList.displayName = 'DeckBuilderCardsList'
