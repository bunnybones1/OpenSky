import clsx from 'clsx'
import { memo, useCallback, useState } from 'react'
import { useLifecycles } from 'react-use'

import { useReduxStore } from '~/shared/redux'
import { resetDeckBuilderFilters } from '~/shared/state/deck-builder/deck-builder-filter-state'
import {
  deckBuilderState,
  resetDeckbuilderState
} from '~/shared/state/deck-builder/deck-builder-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { EmptyDeckBuilderList } from './components/EmptyDeckBuilderList'
import { DeckbuilderCardListStyle } from './DeckBuilder.css'
import { DeckBuilderCardsGrid } from './DeckBuilderCardsGrid/DeckBuilderCardsGrid'
import { DeckBuilderCardsList } from './DeckBuilderCardsList/DeckBuilderCardsList'
import { DeckBuilderHeader } from './DeckBuilderHeader/DeckBuilderHeader'
import { DeckBuilderSearchBar } from './DeckBuilderSearchBar/DeckBuilderSearchBar'
import { deckBuilderDeckStringSelector } from './shared/selectors'

export const DeckBuilder = memo(() => {
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const store = useReduxStore()

  const toggleStats = useCallback(() => setIsStatsOpen((isOpen) => !isOpen), [])

  useLifecycles(
    () => {
      document.body.classList.add('scrollBody')
      const deckString = deckBuilderDeckStringSelector(store.getState())
      deckBuilderState.originalDeckString = deckString
    },
    () => {
      document.body.classList.remove('scrollBody')
      resetDeckbuilderState()
      resetDeckBuilderFilters()
    }
  )

  return (
    <>
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          position: 'relative'
        })}
      >
        <DeckBuilderHeader isStatsOpen={isStatsOpen} toggleStats={toggleStats} />
        <div
          className={Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'flex-start',
            flexDirection: 'column',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start'
          })}
        >
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                width: 'full',
                flexDirection: 'column',
                flexWrap: 'nowrap'
              }),
              DeckbuilderCardListStyle
            )}
          >
            <DeckBuilderSearchBar />
            <EmptyDeckBuilderList />
            <DeckBuilderCardsGrid />
          </div>
        </div>
      </div>
      <DeckBuilderCardsList isStatsOpen={isStatsOpen} />
    </>
  )
})

DeckBuilder.displayName = 'DeckBuilder'
