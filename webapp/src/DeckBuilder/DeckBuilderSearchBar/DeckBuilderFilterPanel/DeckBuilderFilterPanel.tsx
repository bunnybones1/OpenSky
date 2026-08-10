import { ExpectedBoldable } from '@opensky/parse-card-description'
import { EffectType, Element, Trait } from '@skyweaver/state-metadata'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { CardsFilterPanel } from '~/shared/components/CardsFilterPanel/CardsFilterPanel'
import { makeDeckBuilderSearchRoute } from '~/shared/helpers/routes/deck-builder'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDispatch } from '~/shared/redux'
import {
  deckBuilderFilterState,
  updateDeckBuilderFilter
} from '~/shared/state/deck-builder/deck-builder-filter-state'
import {
  CardCost,
  CardSearchParams,
  OwnershipFilter,
  Set
} from '~/shared/types/cards'

import { FilterClearButton } from './components/FilterClearButton'

const OWNERSHIP_OPTIONS: OwnershipFilter[] = [
  OwnershipFilter.OWNED,
  OwnershipFilter.LOCKED,
  OwnershipFilter.ALL,
  OwnershipFilter.SELECTED
]

export const DeckBuilderFilterPanel = memo(() => {
  const { type, cost, search, set, element, trait, effects, ownership } = useSnapshot(
    deckBuilderFilterState
  )

  const isDesktop = useResponsiveQuery('desktop')

  const dispatch = useDispatch()

  const updateRoute = useCallback(() => {
    dispatch(push(makeDeckBuilderSearchRoute()))
  }, [dispatch])

  const onOwnershipChange = useCallback(
    (value: CardSearchParams['ownership']) => {
      updateDeckBuilderFilter('ownership', value)
      updateRoute()
    },
    [updateRoute]
  )

  const onTypeChange = useCallback(
    (value: CardSearchParams['type']) => {
      if (deckBuilderFilterState.type === value) {
        updateDeckBuilderFilter('type', undefined)
      } else {
        updateDeckBuilderFilter('type', value)
      }
      updateRoute()
    },
    [updateRoute]
  )

  const onCostChange = useCallback(
    (value: CardCost) => {
      let newCost: CardSearchParams['cost']

      if (!deckBuilderFilterState.cost) {
        newCost = [value]
      } else if (deckBuilderFilterState.cost.includes(value)) {
        newCost = deckBuilderFilterState.cost.filter((_cost) => _cost !== value)
      } else {
        newCost = [...deckBuilderFilterState.cost, value]
      }

      updateDeckBuilderFilter('cost', newCost)
      updateRoute()
    },
    [updateRoute]
  )

  const onSearchChange = useCallback(
    (value: string) => {
      updateDeckBuilderFilter('search', value)
      updateRoute()
    },
    [updateRoute]
  )

  const onSetChange = useCallback(
    (value: Set) => {
      let newSet: CardSearchParams['set']

      if (!deckBuilderFilterState.set) {
        newSet = [value]
      } else if (deckBuilderFilterState.set.includes(value)) {
        newSet = deckBuilderFilterState.set.filter((_set) => _set !== value)
      } else {
        newSet = [...deckBuilderFilterState.set, value]
      }

      updateDeckBuilderFilter('set', newSet)
      updateRoute()
    },
    [updateRoute]
  )

  const onElementChange = useCallback(
    (value: Element) => {
      let newElements: Element[]

      if (!deckBuilderFilterState.element) {
        newElements = [value]
      } else if (deckBuilderFilterState.element.includes(value)) {
        newElements = deckBuilderFilterState.element.filter(
          (_element) => _element !== value
        )
      } else {
        newElements = [...deckBuilderFilterState.element, value]
      }

      updateDeckBuilderFilter('element', newElements)
      updateRoute()
    },
    [updateRoute]
  )

  const onTraitChange = useCallback(
    (value: Trait) => {
      let newTraits: Trait[]

      if (!deckBuilderFilterState.trait) {
        newTraits = [value]
      } else if (deckBuilderFilterState.trait.includes(value)) {
        newTraits = deckBuilderFilterState.trait.filter(
          (_element) => _element !== value
        )
      } else {
        newTraits = [...deckBuilderFilterState.trait, value]
      }

      updateDeckBuilderFilter('trait', newTraits)
      updateRoute()
    },
    [updateRoute]
  )

  const onEffectsChange = useCallback(
    (value: EffectType | ExpectedBoldable) => {
      let newEffects: CardSearchParams['effects']

      if (!deckBuilderFilterState.effects) {
        newEffects = [value]
      } else if (deckBuilderFilterState.effects.includes(value)) {
        newEffects = deckBuilderFilterState.effects.filter(
          (_effect) => _effect !== value
        )
      } else {
        newEffects = [...deckBuilderFilterState.effects, value]
      }

      updateDeckBuilderFilter('effects', newEffects)
      updateRoute()
    },
    [updateRoute]
  )

  return (
    <CardsFilterPanel
      type={type}
      onTypeChange={onTypeChange}
      cost={cost}
      onCostChange={onCostChange}
      search={!isDesktop ? search : undefined}
      onSearchChange={!isDesktop ? onSearchChange : undefined}
      set={set}
      onSetChange={onSetChange}
      onElementChange={onElementChange}
      element={element}
      onTraitChange={onTraitChange}
      trait={trait}
      onEffectsChange={onEffectsChange}
      effects={effects}
      ClearButton={FilterClearButton}
      ownership={!isDesktop ? ownership : undefined}
      onOwnershipChange={!isDesktop ? onOwnershipChange : undefined}
      allowedOwnershipOptions={OWNERSHIP_OPTIONS}
    />
  )
})

DeckBuilderFilterPanel.displayName = 'DeckBuilderFilterPanel'
