import { ExpectedBoldable } from '@opensky/parse-card-description'
import { EffectType, Element, Trait } from '@skyweaver/state-metadata'
import { ComponentType, memo } from 'react'

import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import {
  CardCost,
  CardSearchParams,
  OwnershipFilter,
  Set
} from '~/shared/types/cards'

import { ItemsSearchInput } from '../ItemsSearchInput/ItemsSearchInput'
import { CardsFilterPanelOwnershipFilter } from './components/CardsFilterPanelOwnershipFilter'
import { CardTypeFilter } from './components/CardTypeFilter'
import { CostFilter } from './components/CostFilter'
import { EffectsFilter } from './components/EffectsFilter'
import { ElementFilter } from './components/ElementFilter'
import { OnlyDuplicatesFilter } from './components/OnlyDuplicatesFilter'
import { SetFilter } from './components/SetFilter'
import { TraitFilter } from './components/TraitsFilter'

const DEFAULT_OWNERSHIP_OPTIONS: OwnershipFilter[] = [
  OwnershipFilter.LOCKED,
  OwnershipFilter.ALL
]

interface CardsFilterPanelProps {
  type?: CardSearchParams['type']
  onTypeChange?: (value: CardSearchParams['type']) => void
  search?: CardSearchParams['search']
  onSearchChange?: (value: CardSearchParams['search']) => void
  cost?: CardSearchParams['cost']
  onCostChange?: (value: CardCost) => void
  set?: CardSearchParams['set']
  onSetChange?: (value: Set) => void
  element?: CardSearchParams['element']
  onElementChange?: (value: Element) => void
  trait?: CardSearchParams['trait']
  onTraitChange?: (value: Trait) => void
  onEffectsChange?: (value: EffectType | ExpectedBoldable) => void
  effects?: CardSearchParams['effects']
  ClearButton?: ComponentType
  ownership?: OwnershipFilter
  onOwnershipChange?: (value: OwnershipFilter) => void
  onlyDuplicates?: CardSearchParams['onlyDuplicates']
  onOnlyDuplicatesChange?: (value: CardSearchParams['onlyDuplicates']) => void
  allowedOwnershipOptions?: OwnershipFilter[]
}

export const CardsFilterPanel = memo(
  ({
    type,
    onTypeChange,
    search,
    onSearchChange,
    onCostChange,
    cost,
    set,
    onSetChange,
    onElementChange,
    element,
    trait,
    onTraitChange,
    onEffectsChange,
    effects,
    ClearButton,
    onOwnershipChange,
    ownership,
    onlyDuplicates,
    onOnlyDuplicatesChange,
    allowedOwnershipOptions = DEFAULT_OWNERSHIP_OPTIONS
  }: CardsFilterPanelProps) => {
    return (
      <>
        {!!onSearchChange && (
          <ItemsSearchInput search={search} onChange={onSearchChange} />
        )}
        {!!onOwnershipChange && !!ownership && (
          <CardsFilterPanelOwnershipFilter
            ownership={ownership}
            onChange={onOwnershipChange}
            allowedOwnershipOptions={allowedOwnershipOptions}
          />
        )}
        {isDefined(onlyDuplicates) && !!onOnlyDuplicatesChange && (
          <OnlyDuplicatesFilter
            onlyDuplicates={onlyDuplicates}
            onChange={onOnlyDuplicatesChange}
          />
        )}
        {!!onTypeChange && <CardTypeFilter type={type} onChange={onTypeChange} />}
        {!!onSetChange && <SetFilter onChange={onSetChange} set={set} />}
        {!!onElementChange && (
          <ElementFilter onChange={onElementChange} element={element} />
        )}
        {!!onTraitChange && <TraitFilter onChange={onTraitChange} trait={trait} />}
        {!!onEffectsChange && (
          <EffectsFilter effects={effects} onChange={onEffectsChange} />
        )}
        {!!onCostChange && <CostFilter onChange={onCostChange} cost={cost} />}
        {!!ClearButton && <ClearButton />}
      </>
    )
  }
)

CardsFilterPanel.displayName = 'CardsFilterPanel'
