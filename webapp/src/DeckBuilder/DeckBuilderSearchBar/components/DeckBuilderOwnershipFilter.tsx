/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { OwnershipFilterSelect } from '~/shared/components/OwnershipFilterSelect/OwnershipFilterSelect'
import { makeDeckBuilderSearchRoute } from '~/shared/helpers/routes/deck-builder'
import { useDispatch } from '~/shared/redux'
import {
  deckBuilderFilterState,
  updateDeckBuilderFilter
} from '~/shared/state/deck-builder/deck-builder-filter-state'
import {
  OwnershipFilter,
  OwnershipFilter as OwnershipFilterType
} from '~/shared/types/cards'

const ALLOWED_OPTIONS: OwnershipFilter[] = [
  OwnershipFilter.OWNED,
  OwnershipFilter.LOCKED,
  OwnershipFilter.ALL,
  OwnershipFilter.SELECTED
]

export const DeckBuilderOwnershipFilter = memo(() => {
  const { ownership } = useSnapshot(deckBuilderFilterState)

  const dispatch = useDispatch()

  const { t } = useTranslation()

  const onChange = useCallback(
    (value: OwnershipFilterType) => {
      updateDeckBuilderFilter('ownership', value)
      dispatch(push(makeDeckBuilderSearchRoute()))
    },
    [dispatch]
  )

  return (
    <OwnershipFilterSelect
      ownedText={t('cards.MyCards')}
      ownership={ownership}
      onChange={onChange}
      allowedOptions={ALLOWED_OPTIONS}
    />
  )
})

DeckBuilderOwnershipFilter.displayName = 'DeckBuilderOwnershipFilter'
