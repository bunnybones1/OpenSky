/* eslint-disable valtio/state-snapshot-rule */
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemType } from '~/lib/proto'
import { Button } from '~/shared/components/Button'
import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux'
import {
  itemsCardsFiltersState,
  resetItemsCardsFilters
} from '~/shared/state/items-cards/items-cards-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { OwnershipFilter } from '~/shared/types/cards'

import { FilterClearButtonStyle } from './FilterClearButton.css'

export const FilterClearButton = memo(() => {
  const {
    cost,
    prism,
    type,
    element,
    trait,
    effects,
    ownership,
    grade,
    search,
    set,
    onlyDuplicates
  } = useSnapshot(itemsCardsFiltersState)

  const dispatch = useDispatch()

  const hasFilters = useMemo(() => {
    if (
      (onlyDuplicates !== undefined && onlyDuplicates === true) ||
      (set !== undefined && !!set.length) ||
      (cost !== undefined && !!cost.length) ||
      (prism !== undefined && !!prism.length) ||
      type !== undefined ||
      (element !== undefined && !!element.length) ||
      (trait !== undefined && !!trait.length) ||
      (effects !== undefined && !!effects.length) ||
      (ownership !== undefined && ownership !== OwnershipFilter.OWNED) ||
      (grade !== undefined && grade !== ItemType.SW_BASE_CARDS) ||
      !!search
    ) {
      return true
    }
    return false
  }, [
    cost,
    effects,
    element,
    grade,
    onlyDuplicates,
    ownership,
    prism,
    search,
    set,
    trait,
    type
  ])

  const clearFilters = useCallback(() => {
    resetItemsCardsFilters()
    dispatch(push(makeItemsCardsRoute()))
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
