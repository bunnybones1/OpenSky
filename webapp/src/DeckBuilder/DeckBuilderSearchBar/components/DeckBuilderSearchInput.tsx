import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemsSearchInput } from '~/shared/components/ItemsSearchInput/ItemsSearchInput'
import { makeDeckBuilderSearchRoute } from '~/shared/helpers/routes/deck-builder'
import { useDispatch } from '~/shared/redux'
import {
  deckBuilderFilterState,
  updateDeckBuilderFilter
} from '~/shared/state/deck-builder/deck-builder-filter-state'

export const DeckBuilderSearchInput = memo(() => {
  const { search } = useSnapshot(deckBuilderFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: string) => {
      updateDeckBuilderFilter('search', value)
      dispatch(push(makeDeckBuilderSearchRoute()))
    },
    [dispatch]
  )

  return <ItemsSearchInput search={search} onChange={onChange} />
})

DeckBuilderSearchInput.displayName = 'DeckBuilderSearchInput'
