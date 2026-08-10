/* eslint-disable valtio/state-snapshot-rule */
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ItemType } from '~/lib/proto'
import { Button } from '~/shared/components/Button'
import { makeDeckBuilderSearchRoute } from '~/shared/helpers/routes/deck-builder'
import { useDispatch } from '~/shared/redux'
import {
  deckBuilderFilterState,
  resetDeckBuilderFilters
} from '~/shared/state/deck-builder/deck-builder-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { OwnershipFilter } from '~/shared/types/cards'

import { FilterClearButtonStyle } from './FilterClearButton.css'

export const FilterClearButton = memo(() => {
  const { cost, type, element, trait, effects, ownership, grade, search } =
    useSnapshot(deckBuilderFilterState)

  const dispatch = useDispatch()

  const hasFilters = useMemo(() => {
    if (
      (cost !== undefined && !!cost.length) ||
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
  }, [cost, effects, element, grade, ownership, search, trait, type])

  const clearFilters = useCallback(() => {
    resetDeckBuilderFilters()
    dispatch(push(makeDeckBuilderSearchRoute()))
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
