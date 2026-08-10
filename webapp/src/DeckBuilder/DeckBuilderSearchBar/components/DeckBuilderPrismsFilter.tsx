/* eslint-disable valtio/state-snapshot-rule */
import { DeckClass } from '@opensky/proto'
import { CODE_PRISMS } from '@opensky/shared/constants'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { deckBuilderDeckClassSelector } from '~/DeckBuilder/shared/selectors'
import { ItemsPrismFilter } from '~/shared/components/ItemsPrismFilter/ItemsPrismFilter'
import { makeDeckBuilderSearchRoute } from '~/shared/helpers/routes/deck-builder'
import { useDispatch, useSelector } from '~/shared/redux'
import {
  deckBuilderFilterState,
  updateDeckBuilderFilter
} from '~/shared/state/deck-builder/deck-builder-filter-state'
import { FilterablePrism } from '~/shared/types/cards'

export const DeckBuilderPrismsFilter = memo(() => {
  const dispatch = useDispatch()
  const deckClass = useSelector(deckBuilderDeckClassSelector)
  const { prism } = useSnapshot(deckBuilderFilterState)

  const validPrisms = useMemo(() => {
    if (!deckClass) return
    return CODE_PRISMS[deckClass as DeckClass].map((p) =>
      p.toLowerCase()
    ) as FilterablePrism[]
  }, [deckClass])

  const onChange = useCallback(
    (value: FilterablePrism[]) => {
      const prismToUse = value.length > 1 ? value[1] : value[0]
      if (!prismToUse) {
        updateDeckBuilderFilter('prism', undefined)
      } else if (
        !!deckBuilderFilterState.prism &&
        deckBuilderFilterState.prism[0] === prismToUse
      ) {
        updateDeckBuilderFilter('prism', undefined)
      } else {
        updateDeckBuilderFilter('prism', [prismToUse])
      }
      dispatch(push(makeDeckBuilderSearchRoute()))
    },
    [dispatch]
  )

  if (!validPrisms || validPrisms.length === 1) return null

  return (
    <ItemsPrismFilter validPrisms={validPrisms} onChange={onChange} prism={prism} />
  )
})

DeckBuilderPrismsFilter.displayName = 'DeckBuilderPrismsFilter'
