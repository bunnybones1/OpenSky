import { SwapType } from '@0xsequence/metadata'
import { ExpectedBoldable } from '@opensky/parse-card-description'
import { EffectType, Element, Trait } from '@skyweaver/state-metadata'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { CardsFilterPanel } from '~/shared/components/CardsFilterPanel/CardsFilterPanel'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDispatch } from '~/shared/redux'
import {
  marketCardsFilterState,
  updateMarketCardsFilterState
} from '~/shared/state/market-cards/market-cards-filter-state'
import {
  CardCost,
  CardSearchParams,
  OwnershipFilter,
  Set
} from '~/shared/types/cards'

import { FilterClearButton } from './components/FilterClearButton'

export const MarketCardsFilterPanel = memo(() => {
  const {
    type,
    cost,
    search,
    set,
    element,
    trait,
    effects,
    ownership,
    onlyDuplicates
  } = useSnapshot(marketCardsFilterState)
  const dispatch = useDispatch()
  const isTabletWide = useResponsiveQuery('tabletWide')

  const mode = ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY

  const updateRoute = useCallback(() => {
    dispatch(push(makeMarketCardsRoute()))
  }, [dispatch])

  const onTypeChange = useCallback(
    (value: CardSearchParams['type']) => {
      if (marketCardsFilterState.type === value) {
        updateMarketCardsFilterState('type', undefined)
      } else {
        updateMarketCardsFilterState('type', value)
      }
      updateRoute()
    },
    [updateRoute]
  )

  const onCostChange = useCallback(
    (value: CardCost) => {
      let newCost: CardSearchParams['cost']

      if (!marketCardsFilterState.cost) {
        newCost = [value]
      } else if (marketCardsFilterState.cost.includes(value)) {
        newCost = marketCardsFilterState.cost.filter((_cost) => _cost !== value)
      } else {
        newCost = [...marketCardsFilterState.cost, value]
      }

      updateMarketCardsFilterState('cost', newCost)
      updateRoute()
    },
    [updateRoute]
  )

  const onSearchChange = useCallback(
    (value: string) => {
      updateMarketCardsFilterState('search', value)
      updateRoute()
    },
    [updateRoute]
  )

  const onSetChange = useCallback(
    (value: Set) => {
      let newSet: CardSearchParams['set']

      if (!marketCardsFilterState.set) {
        newSet = [value]
      } else if (marketCardsFilterState.set.includes(value)) {
        newSet = marketCardsFilterState.set.filter((_set) => _set !== value)
      } else {
        newSet = [...marketCardsFilterState.set, value]
      }

      updateMarketCardsFilterState('set', newSet)
      updateRoute()
    },
    [updateRoute]
  )

  const onElementChange = useCallback(
    (value: Element) => {
      let newElements: Element[]

      if (!marketCardsFilterState.element) {
        newElements = [value]
      } else if (marketCardsFilterState.element.includes(value)) {
        newElements = marketCardsFilterState.element.filter(
          (_element) => _element !== value
        )
      } else {
        newElements = [...marketCardsFilterState.element, value]
      }

      updateMarketCardsFilterState('element', newElements)
      updateRoute()
    },
    [updateRoute]
  )

  const onTraitChange = useCallback(
    (value: Trait) => {
      let newTraits: Trait[]

      if (!marketCardsFilterState.trait) {
        newTraits = [value]
      } else if (marketCardsFilterState.trait.includes(value)) {
        newTraits = marketCardsFilterState.trait.filter(
          (_element) => _element !== value
        )
      } else {
        newTraits = [...marketCardsFilterState.trait, value]
      }

      updateMarketCardsFilterState('trait', newTraits)
      updateRoute()
    },
    [updateRoute]
  )

  const onEffectsChange = useCallback(
    (value: EffectType | ExpectedBoldable) => {
      let newEffects: CardSearchParams['effects']

      if (!marketCardsFilterState.effects) {
        newEffects = [value]
      } else if (marketCardsFilterState.effects.includes(value)) {
        newEffects = marketCardsFilterState.effects.filter(
          (_effect) => _effect !== value
        )
      } else {
        newEffects = [...marketCardsFilterState.effects, value]
      }

      updateMarketCardsFilterState('effects', newEffects)
      updateRoute()
    },
    [updateRoute]
  )

  const onOwnershipChange = useCallback(
    (value: OwnershipFilter) => {
      if (mode === SwapType.BUY) {
        updateMarketCardsFilterState('ownership', value)
        updateRoute()
      }
    },
    [mode, updateRoute]
  )

  const onOnlyDuplicatesChange = useCallback(
    (value: boolean) => {
      updateMarketCardsFilterState('onlyDuplicates', !value)
      updateRoute()
    },
    [updateRoute]
  )

  const isDuplicatesDisabled = ownership !== OwnershipFilter.OWNED

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
      onOwnershipChange={mode === SwapType.BUY ? onOwnershipChange : undefined}
      ownership={mode === SwapType.BUY ? ownership : undefined}
      onOnlyDuplicatesChange={
        isDuplicatesDisabled ? undefined : onOnlyDuplicatesChange
      }
      onlyDuplicates={isDuplicatesDisabled ? undefined : onlyDuplicates}
    />
  )
})

MarketCardsFilterPanel.displayName = 'MarketCardsFilterPanel'
