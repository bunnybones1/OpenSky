/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { CardsGradeFilter } from '~/shared/components/CardsGradeFilter/CardsGradeFilter'
import { makeDeckBuilderSearchRoute } from '~/shared/helpers/routes/deck-builder'
import { useDispatch } from '~/shared/redux'
import {
  deckBuilderFilterState,
  updateDeckBuilderFilter
} from '~/shared/state/deck-builder/deck-builder-filter-state'
import { CardSearchParams } from '~/shared/types/cards'

export const DeckBuilderGradeFilter = memo(() => {
  const { grade } = useSnapshot(deckBuilderFilterState)

  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: CardSearchParams['grade']) => {
      updateDeckBuilderFilter(
        'grade',
        deckBuilderFilterState.grade === value ? undefined : value
      )
      dispatch(push(makeDeckBuilderSearchRoute()))
    },
    [dispatch]
  )

  return <CardsGradeFilter grade={grade} onChange={onChange} />
})

DeckBuilderGradeFilter.displayName = 'DeckBuilderGradeFilter'
