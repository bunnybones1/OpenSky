import { ExpectedBoldable } from '@opensky/parse-card-description'
import { ItemType } from '@opensky/proto'
import { EffectType, Element, Trait } from '@skyweaver/state-metadata'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { CardsFilterPanel } from '~/shared/components/CardsFilterPanel/CardsFilterPanel'
import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDispatch } from '~/shared/redux'
import {
  itemsCardsFiltersState,
  updateItemsCardsFilter
} from '~/shared/state/items-cards/items-cards-filter-state'
import {
  CardCost,
  CardSearchParams,
  OwnershipFilter,
  Set
} from '~/shared/types/cards'

import { FilterClearButton } from './components/FilterClearButton'

export const ItemsCardsFilterPanel = memo(() => {
  const {
    type,
    cost,
    search,
    set,
    element,
    trait,
    effects,
    onlyDuplicates,
    ownership,
    grade
  } = useSnapshot(itemsCardsFiltersState)
  const dispatch = useDispatch()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const updateRoute = useCallback(() => {
    dispatch(push(makeItemsCardsRoute()))
  }, [dispatch])

  const onTypeChange = useCallback(
    (value: CardSearchParams['type']) => {
      if (itemsCardsFiltersState.type === value) {
        updateItemsCardsFilter('type', undefined)
      } else {
        updateItemsCardsFilter('type', value)
      }
      updateRoute()
    },
    [updateRoute]
  )

  const onCostChange = useCallback(
    (value: CardCost) => {
      let newCost: CardSearchParams['cost']

      if (!itemsCardsFiltersState.cost) {
        newCost = [value]
      } else if (itemsCardsFiltersState.cost.includes(value)) {
        newCost = itemsCardsFiltersState.cost.filter((_cost) => _cost !== value)
      } else {
        newCost = [...itemsCardsFiltersState.cost, value]
      }

      updateItemsCardsFilter('cost', newCost)
      updateRoute()
    },
    [updateRoute]
  )

  const onSearchChange = useCallback(
    (value: string) => {
      updateItemsCardsFilter('search', value)
      updateRoute()
    },
    [updateRoute]
  )

  const onSetChange = useCallback(
    (value: Set) => {
      let newSet: CardSearchParams['set']

      if (!itemsCardsFiltersState.set) {
        newSet = [value]
      } else if (itemsCardsFiltersState.set.includes(value)) {
        newSet = itemsCardsFiltersState.set.filter((_set) => _set !== value)
      } else {
        newSet = [...itemsCardsFiltersState.set, value]
      }

      updateItemsCardsFilter('set', newSet)
      updateRoute()
    },
    [updateRoute]
  )

  const onElementChange = useCallback(
    (value: Element) => {
      let newElements: Element[]

      if (!itemsCardsFiltersState.element) {
        newElements = [value]
      } else if (itemsCardsFiltersState.element.includes(value)) {
        newElements = itemsCardsFiltersState.element.filter(
          (_element) => _element !== value
        )
      } else {
        newElements = [...itemsCardsFiltersState.element, value]
      }

      updateItemsCardsFilter('element', newElements)
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  const onTraitChange = useCallback(
    (value: Trait) => {
      let newTraits: Trait[]

      if (!itemsCardsFiltersState.trait) {
        newTraits = [value]
      } else if (itemsCardsFiltersState.trait.includes(value)) {
        newTraits = itemsCardsFiltersState.trait.filter(
          (_element) => _element !== value
        )
      } else {
        newTraits = [...itemsCardsFiltersState.trait, value]
      }

      updateItemsCardsFilter('trait', newTraits)
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  const onEffectsChange = useCallback(
    (value: EffectType | ExpectedBoldable) => {
      let newEffects: CardSearchParams['effects']

      if (!itemsCardsFiltersState.effects) {
        newEffects = [value]
      } else if (itemsCardsFiltersState.effects.includes(value)) {
        newEffects = itemsCardsFiltersState.effects.filter(
          (_effect) => _effect !== value
        )
      } else {
        newEffects = [...itemsCardsFiltersState.effects, value]
      }

      updateItemsCardsFilter('effects', newEffects)
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  const onOnlyDuplicatesChange = useCallback(
    (value: boolean) => {
      updateItemsCardsFilter('onlyDuplicates', !value)
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  const isDuplicatesDisabled =
    ownership === OwnershipFilter.LOCKED || grade === ItemType.SW_BASE_CARDS

  return (
    <CardsFilterPanel
      type={type}
      onTypeChange={onTypeChange}
      cost={cost}
      onCostChange={onCostChange}
      search={!isTabletWide ? search : undefined}
      onSearchChange={!isTabletWide ? onSearchChange : undefined}
      set={set}
      onSetChange={onSetChange}
      onElementChange={onElementChange}
      element={element}
      onTraitChange={onTraitChange}
      trait={trait}
      onEffectsChange={onEffectsChange}
      effects={effects}
      ClearButton={FilterClearButton}
      onOnlyDuplicatesChange={
        isDuplicatesDisabled ? undefined : onOnlyDuplicatesChange
      }
      onlyDuplicates={isDuplicatesDisabled ? undefined : onlyDuplicates}
    />
  )
})

ItemsCardsFilterPanel.displayName = 'ItemsCardsFilterPanel'
