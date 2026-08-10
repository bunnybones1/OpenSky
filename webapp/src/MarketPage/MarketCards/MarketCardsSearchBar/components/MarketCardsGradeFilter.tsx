/* eslint-disable valtio/state-snapshot-rule */
import { ItemType } from '@opensky/proto'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { CardsGradeFilter } from '~/shared/components/CardsGradeFilter/CardsGradeFilter'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  MarketCardSearchParams,
  marketCardsFilterState,
  updateMarketCardsFilterState
} from '~/shared/state/market-cards/market-cards-filter-state'

const GRADES_TO_USE = [ItemType.SW_SILVER_CARDS, ItemType.SW_GOLD_CARDS] as const

export const MarketCardsGradeFilter = memo(() => {
  const { grade } = useSnapshot(marketCardsFilterState)
  const dispatch = useDispatch()

  const updateGrade = useCallback(
    (value: MarketCardSearchParams['grade']) => {
      if (value === marketCardsFilterState.grade) return
      updateMarketCardsFilterState('grade', value)
      dispatch(push(makeMarketCardsRoute()))
    },
    [dispatch]
  )

  return (
    <CardsGradeFilter
      gradesToUse={GRADES_TO_USE}
      grade={grade}
      onChange={updateGrade}
    />
  )
})

MarketCardsGradeFilter.displayName = 'MarketCardsGradeFilter'
