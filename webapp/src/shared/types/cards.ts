import { ExpectedBoldable } from '@opensky/parse-card-description'
import { EffectType, Element, Prism, Trait, Type } from '@skyweaver/state-metadata'

import { BalanceTuple, ItemType } from '~/lib/proto'
import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'

import { CardType } from '../constants/cards'

export interface CardKeywordMeta {
  icon?: ImageIconTypes
  name: string
  description: string
  lockImage?: string
}

export interface CardSearchFilters {
  cardManaCost?: string[]
  cardPrism?: Prism[]
  cardType?: Type[]
  cardElement?: Element[]
  cardKeyword?: Trait[]
  otherEffects?: ExpectedBoldable[]
  unitEffect?: EffectType[]
  ownership?: OwnershipFilter
  itemType?: ItemType
  shopAvailability?: AvailabilityFilter
  set?: string[]
  multipleOwned?: string[]
}

export const CardCosts = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10+',
  'X'
] as const

export enum CardSet {
  CORE = 'CORE',
  CORE_EXPANSION = 'CORE_EXPANSION'
}

export const CardSearchFilterArrayKeys = [
  'cardManaCost',
  'cardPrism',
  'cardType',
  'cardElement',
  'cardKeyword',
  'cardTrigger',
  'unitEffect',
  'otherEffects',
  'set',
  'multipleOwned'
]

export enum OwnershipFilter {
  OWNED = 'OWNED',
  LOCKED = 'LOCKED',
  ALL = 'ALL',
  OWN_MULTIPLE = 'OWN_MULTIPLE',
  SELECTED = 'SELECTED'
}

export enum AvailabilityFilter {
  AVAILABLE = 'AVAILABLE',
  ALL = 'ALL'
}

export interface CardBalanceArgs {
  balance: CardBalance
  isNew: CardIsNew
}

export interface CardBalance {
  [ItemType.SW_BASE_CARDS]: number
  [ItemType.SW_GOLD_CARDS]: number
  [ItemType.SW_SILVER_CARDS]: number
}

export type CardBalanceTuples = {
  [key in
    | ItemType.SW_BASE_CARDS
    | ItemType.SW_SILVER_CARDS
    | ItemType.SW_GOLD_CARDS]: BalanceTuple
}

export interface CardIsNew {
  [ItemType.SW_BASE_CARDS]: boolean
  [ItemType.SW_GOLD_CARDS]: boolean
  [ItemType.SW_SILVER_CARDS]: boolean
}

export enum CardRenderModes {
  DECKBUILDER = 'DECKBUILDER',
  LIBRARY = 'LIBRARY',
  MARKET_BUY = 'MARKET_BUY',
  MARKET_SELL = 'MARKET_SELL',
  SELECT_SILVERS_FOR_CONQUEST = 'SELECT_SILVERS_FOR_CONQUEST',
  BUY_SILVERS_FOR_CONQUEST = 'BUY_SILVERS_FOR_CONQUEST',
  SELECT_GOLDS_FOR_HEROSKIN = 'SELECT_GOLDS_FOR_HEROSKIN'
}

export enum CARD_SORTING_OPTIONS {
  MANA_ASCENDING = 'MANA_ASCENDING',
  MANA_DESCENDING = 'MANA_DESCENDING',
  PRICE_ASCENDING = 'PRICE_ASCENDING',
  PRICE_DESCENDING = 'PRICE_DESCENDING',
  POWER_DESCENDING = 'POWER_DESCENDING',
  HEALTH_DESCENDING = 'HEALTH_DESCENDING',
  QUANTITY_ASCENDING = 'QUANTITY_ASCENDING',
  QUANTITY_DESCENDING = 'QUANTITY_DESCENDING',
  DATE_RECIEVED_ASCENDING = 'DATE_RECIEVED_ASCENDING',
  DATE_RECIEVED_DESCENDING = 'DATE_RECIEVED_DESCENDING'
}

export type FilterablePrism = Exclude<Prism, 'tut' | 'tok'>

export type Set =
  | 'Clash of Inventors'
  | 'Core Set'
  | 'Core Expansion'
  | 'Hexbound Invasion'

export type CardCost = (typeof CardCosts)[number]

export const CardsArrayParams = [
  'cost',
  'prism',
  'element',
  'trait',
  'set',
  'effects'
]

export interface CardSearchParams {
  cost?: CardCost[]
  prism?: FilterablePrism[]
  element?: Element[]
  trait?: Trait[]
  effects?: (ExpectedBoldable | EffectType)[]
  set?: Set[]
  type?: Exclude<Type, 'enchant' | 'hero'>
  grade?: CardType['grade']
  ownership?: OwnershipFilter
  search?: string
  sort?: CARD_SORTING_OPTIONS
  onlyDuplicates?: boolean
}

export type TradeableGrade = ItemType.SW_SILVER_CARDS | ItemType.SW_GOLD_CARDS
