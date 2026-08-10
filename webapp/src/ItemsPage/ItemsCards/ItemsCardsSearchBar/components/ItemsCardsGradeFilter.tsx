/* eslint-disable valtio/state-snapshot-rule */
import { ItemType } from '@opensky/proto'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { CardsGradeFilter } from '~/shared/components/CardsGradeFilter/CardsGradeFilter'
import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsCardsFiltersState,
  updateItemsCardsFilter
} from '~/shared/state/items-cards/items-cards-filter-state'
import { CardSearchParams } from '~/shared/types/cards'

export const GradeFilter = memo(() => {
  const { grade } = useSnapshot(itemsCardsFiltersState)
  const dispatch = useDispatch()

  const updateGrade = useCallback(
    (value: CardSearchParams['grade']) => {
      if (
        value === ItemType.SW_BASE_CARDS &&
        itemsCardsFiltersState.grade !== value
      ) {
        updateItemsCardsFilter('onlyDuplicates', false)
      }

      updateItemsCardsFilter(
        'grade',
        itemsCardsFiltersState.grade === value ? undefined : value
      )
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  return (
    <CardsGradeFilter showUnseenCardCounts grade={grade} onChange={updateGrade} />
  )
})

GradeFilter.displayName = 'PrismFilter'
