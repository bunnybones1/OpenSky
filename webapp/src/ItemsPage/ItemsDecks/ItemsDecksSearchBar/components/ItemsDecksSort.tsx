import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Select } from '~/shared/components/Select'
import { SelectOption } from '~/shared/components/SelectOption'
import { DECK_SORTING_OPTIONS } from '~/shared/constants/decks'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDispatch } from '~/shared/redux'
import {
  itemsDecksFilterState,
  updateItemsDecksFilter
} from '~/shared/state/items-decks/items-decks-filter-state'

const Adornments = {
  [DECK_SORTING_OPTIONS.LAST_MODIFIED_DESCENDING]: {
    icon: { type: 'last-modified' }
  },
  [DECK_SORTING_OPTIONS.ALPHABETICAL_ASCENDING]: {
    icon: { type: 'sort-ascending-alpha' }
  },
  [DECK_SORTING_OPTIONS.ALPHABETICAL_DESCENDING]: {
    icon: { type: 'sort-descending-alpha' }
  }
} as const

const Texts = {
  [DECK_SORTING_OPTIONS.LAST_MODIFIED_DESCENDING]: 'decks.sorts.LastModified',
  [DECK_SORTING_OPTIONS.ALPHABETICAL_ASCENDING]: 'decks.sorts.AlphabeticalAsc',
  [DECK_SORTING_OPTIONS.ALPHABETICAL_DESCENDING]: 'decks.sorts.AlphabeticalDesc'
} as const

export const ItemsDecksSort = memo(() => {
  const { sort } = useSnapshot(itemsDecksFilterState)
  const isTabletWide = useResponsiveQuery('tabletWide')
  const dispatch = useDispatch()

  const onChange = useCallback(
    (newSort: DECK_SORTING_OPTIONS) => {
      updateItemsDecksFilter('sort', newSort)
      dispatch(push(makeItemsDecksRoute()))
    },
    [dispatch]
  )

  const { t } = useTranslation()

  return (
    <Select
      text={sort && !!isTabletWide ? t(Texts[sort]) : undefined}
      adornment={sort ? Adornments[sort] : undefined}
      title={t('generic.Sorting')}
      onChange={onChange}
      colorType="default"
      value={sort}
      optionsMatchParentWidth={isTabletWide ? true : false}
    >
      <SelectOption
        adornment={Adornments[DECK_SORTING_OPTIONS.LAST_MODIFIED_DESCENDING]}
        text={t(Texts[DECK_SORTING_OPTIONS.LAST_MODIFIED_DESCENDING])}
        value={DECK_SORTING_OPTIONS.LAST_MODIFIED_DESCENDING}
      />
      <SelectOption
        adornment={Adornments[DECK_SORTING_OPTIONS.ALPHABETICAL_ASCENDING]}
        text={t(Texts[DECK_SORTING_OPTIONS.ALPHABETICAL_ASCENDING])}
        value={DECK_SORTING_OPTIONS.ALPHABETICAL_ASCENDING}
      />
      <SelectOption
        adornment={Adornments[DECK_SORTING_OPTIONS.ALPHABETICAL_DESCENDING]}
        text={t(Texts[DECK_SORTING_OPTIONS.ALPHABETICAL_DESCENDING])}
        value={DECK_SORTING_OPTIONS.ALPHABETICAL_DESCENDING}
      />
    </Select>
  )
})

ItemsDecksSort.displayName = 'ItemsDecksSort'
