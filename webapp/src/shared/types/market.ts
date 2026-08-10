import { SwapType } from '@0xsequence/metadata'

import { Item, ItemType } from '~/lib/proto'

import { FilterablePrism } from './cards'

export enum MARKET_ITEM_TYPE {
  cards = 'cards',
  decks = 'decks',
  heroes = 'heroes',
  stickers = 'stickers',
  cardbacks = 'cardbacks'
}

export type MarketMode = SwapType.BUY | SwapType.SELL

export enum MARKET_DECK_COLUMN_TYPE {
  TOP_DECKS = 'score',
  MOST_PLAYED = 'games_played'
}

export interface MarketDecksFilters {
  prisms: FilterablePrism[]
  column: MARKET_DECK_COLUMN_TYPE
}

export interface CartItem {
  tokenId: number
  type: ItemType
  amount: number
  side: MarketMode
}

export interface BalanceItem extends Omit<Item, 'balance'> {
  balance: number
}

export interface PriceAndSupply {
  price: number
  supply: number | null
}

export interface PriceAndSupplyWithId extends PriceAndSupply {
  id: number
}
