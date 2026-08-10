import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSortSelect } from '~/shared/components/ItemsSortSelect/ItemsSortSelect'
import { makeDeckBuilderSearchRoute } from '~/shared/helpers/routes/deck-builder'
import { useDispatch } from '~/shared/redux'
import {
  deckBuilderFilterState,
  updateDeckBuilderFilter
} from '~/shared/state/deck-builder/deck-builder-filter-state'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'

export const DeckBuilderSortSelect = memo(() => {
  const { sort } = useSnapshot(deckBuilderFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (newSort: CARD_SORTING_OPTIONS) => {
      updateDeckBuilderFilter('sort', newSort)
      dispatch(push(makeDeckBuilderSearchRoute()))
    },
    [dispatch]
  )

  return <ItemsSortSelect sort={sort} onChange={onChange} />
})

DeckBuilderSortSelect.displayName = 'DeckBuilderSortSelect'
