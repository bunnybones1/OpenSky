import { ItemType } from '@opensky/proto'
import { getBaseID, getGoldID, getSilverID } from '@opensky/shared/assetsIDs'
import { PrismClass } from '@opensky/shared/constants'
import { BaseCard, CardLibrary, CardMetadata } from '@skyweaver/state-metadata'
import { uniqBy } from 'lodash-es'

import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { CardSearchFilters, OwnershipFilter } from '~/shared/types/cards'

export const CARD_BASE_CLASSNAME = 'CARD_BASE'

export const CARD_ITEM_TYPES = [
  ItemType.SW_GOLD_CARDS,
  ItemType.SW_SILVER_CARDS,
  ItemType.SW_BASE_CARDS
]

export const TRADABLE_CARD_ITEM_TYPES = [
  ItemType.SW_GOLD_CARDS,
  ItemType.SW_SILVER_CARDS
]

export const ELEMENTS = [
  'air',
  'dark',
  'earth',
  'fire',
  'light',
  'metal',
  'mind',
  'water'
] as const

export const DEFAULT_CARD_FILTERS: CardSearchFilters = {
  ownership: OwnershipFilter.OWNED
}

export const DEFAULT_CARD_BUY_FILTERS: CardSearchFilters = {
  ownership: OwnershipFilter.ALL,
  itemType: ItemType.SW_SILVER_CARDS
}

export const DEFAULT_CARD_SELL_FILTERS: CardSearchFilters = {
  ownership: OwnershipFilter.OWNED,
  itemType: ItemType.SW_SILVER_CARDS
}

export const PRISM_ICON_TYPES: { [key in PrismClass]: IconTypes } = {
  [PrismClass.AGY]: 'prism-agility',
  [PrismClass.HRT]: 'prism-heart',
  [PrismClass.INT]: 'prism-intellect',
  [PrismClass.STR]: 'prism-strength',
  [PrismClass.WIS]: 'prism-wisdom'
}
export interface CardType extends CardMetadata {
  grade: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
  baseId: BaseCard
  id: number
}

export const Cards = new Map<number, CardType>()

export const GoldCards: CardType[] = Array.from(CardLibrary.entries()).map(
  ([baseId, metaData]) => ({
    ...metaData,
    id: getGoldID(baseId),
    baseId,
    grade: ItemType.SW_GOLD_CARDS
  })
)

GoldCards.forEach((card) => Cards.set(card.id, card))

export const SilverCards: CardType[] = Array.from(CardLibrary.entries()).map(
  ([baseId, metaData]) => ({
    ...metaData,
    id: getSilverID(baseId),
    baseId,
    grade: ItemType.SW_SILVER_CARDS
  })
)

SilverCards.forEach((card) => Cards.set(card.id, card))

export const BaseCards: CardType[] = Array.from(CardLibrary.entries()).map(
  ([baseId, metaData]) => ({
    ...metaData,
    id: getBaseID(baseId),
    baseId,
    grade: ItemType.SW_BASE_CARDS
  })
)

BaseCards.forEach((card) => Cards.set(card.id, card))

export const AllCards = uniqBy([...BaseCards, ...SilverCards, ...GoldCards], 'id')

export const validGoldCardTokenIds = GoldCards.filter(
  (card) => card.prism !== 'tok' && card.prism !== 'tut'
)
  .map((card) => card.id)
  .map((id) => String(id))

export const validSilverCardTokenIds = SilverCards.filter(
  (card) => card.prism !== 'tok' && card.prism !== 'tut'
)
  .map((card) => card.id)
  .map((id) => String(id))
