/* eslint-disable valtio/state-snapshot-rule */
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemType } from '~/lib/proto'
import { Button } from '~/shared/components/Button'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketCardsFilterState,
  resetMarketCardsFilterState
} from '~/shared/state/market-cards/market-cards-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { OwnershipFilter } from '~/shared/types/cards'

import { FilterClearButtonStyle } from './FilterClearButton.css'

export const FilterClearButton = memo(() => {
  const { cost, prism, type, element, trait, effects, ownership, grade, search } =
    useSnapshot(marketCardsFilterState)

  const dispatch = useDispatch()

  const hasFilters = useMemo(() => {
    if (
      (cost !== undefined && !!cost.length) ||
      (prism !== undefined && !!prism.length) ||
      type !== undefined ||
      (element !== undefined && !!element.length) ||
      (trait !== undefined && !!trait.length) ||
      (effects !== undefined && !!effects.length) ||
      (ownership !== undefined && ownership !== OwnershipFilter.ALL) ||
      (grade !== undefined && grade !== ItemType.SW_SILVER_CARDS) ||
      !!search
    ) {
      return true
    }
    return false
  }, [cost, effects, element, grade, ownership, prism, search, trait, type])

  const clearFilters = useCallback(() => {
    resetMarketCardsFilterState()
    dispatch(push(makeMarketCardsRoute()))
  }, [dispatch])

  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        Sprinkles({
          backgroundColor: 'purple2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: '12px'
        }),
        FilterClearButtonStyle
      )}
    >
      <Button
        onClick={clearFilters}
        frameType="default"
        colorType="default"
        leftAdornment={{ icon: 'eraser' }}
        text={t('generic.Clear')}
        disabled={!hasFilters}
      />
    </div>
  )
})

FilterClearButton.displayName = 'FilterClearButton'
