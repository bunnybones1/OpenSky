import { Zone } from '@skyweaver/state-metadata'

export type FakeZone =
  | { name: 'Conjuring' }
  | { name: 'Staging' }
  | { name: 'Reward' }
  | { name: 'ConquestReward' }
  | { name: 'HeroReward' }
  | { name: 'DualPrismHeroReward' }
  | { name: 'ConquestPotentialReward' }
  | { name: 'DisabledReward' }
  | { name: 'UseState' }
  | { name: 'Dragging' }
  | { name: 'Void' }
  | { name: 'OptimisticCasting' }
  | { name: 'OptimisticHand' }
  | { name: 'Inspection' }
  | { name: 'HeroAbilityStaging' }
  | { name: 'Drafting' }

export type CardStatus = Zone['name'] | FakeZone['name']

export type Owner = 'Player' | 'Opponent'

export type DeckCardStatuses = 'Deck' | 'Graveyard'

export type OwnedCardStatus = `${Owner}_${CardStatus}`
