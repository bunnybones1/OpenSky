import { getCardBackID } from '@opensky/shared/assetsIDs'
import { CardBack } from '@opensky/shared/constants'
import { CardBackLibrary } from '@opensky/shared/cosmetics'
import uniq from 'lodash-es/uniq'

import { OwnershipFilter } from '../types/cards'

export const CARDBACK_BASE_CLASSNAME = 'CARDBACK_BASE'

export enum CARD_BACK_SORTING_OPTIONS {
  PRICE_ASCENDING = 'PRICE_ASCENDING',
  PRICE_DESCENDING = 'PRICE_DESCENDING'
}

export interface CardBackSearchFilters {
  ownership?: OwnershipFilter
}

export const StickerSearchFilterArrayKeys = []

export const DEFAULT_CARD_BACK_FILTERS: CardBackSearchFilters = {
  ownership: OwnershipFilter.OWNED
}

export const DEFAULT_CARD_BACK_BUY_FILTERS: CardBackSearchFilters = {
  ownership: OwnershipFilter.ALL
}

export const DEFAULT_CARD_BACK_SELL_FILTERS: CardBackSearchFilters = {
  ownership: OwnershipFilter.OWNED
}

const baseOffset = getCardBackID(0)

export const AllCardBackIds = uniq(
  Array.from(CardBackLibrary.keys())
    .reduce((prev, curr) => {
      const withoutOffset = curr - baseOffset

      if (prev.includes(withoutOffset)) return prev

      return [...prev, curr]
    }, [] as number[])
    .map(getCardBackID)
)

export const AllCardBacks = new Map<number, CardBack>()

AllCardBackIds.forEach((id) => {
  const cardBack = CardBackLibrary.get(id)

  if (!!cardBack) {
    AllCardBacks.set(id, { ...cardBack, id })
  }
})
