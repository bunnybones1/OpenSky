import { getStickerID } from '@opensky/shared/assetsIDs'
import { Sticker } from '@opensky/shared/constants'
import { StickerLibrary } from '@opensky/shared/cosmetics'
import uniq from 'lodash-es/uniq'

import { OwnershipFilter } from '../types/cards'

export const STICKER_BASE_CLASSNAME = 'STICKER_BASE'

export enum STICKER_SORTING_OPTIONS {
  PRICE_ASCENDING = 'PRICE_ASCENDING',
  PRICE_DESCENDING = 'PRICE_DESCENDING'
}

export interface StickerSearchFilters {
  ownership?: OwnershipFilter
}

export const StickerSearchFilterArrayKeys = []

export const DEFAULT_STICKER_FILTERS: StickerSearchFilters = {
  ownership: OwnershipFilter.OWNED
}

export const DEFAULT_STICKER_BUY_FILTERS: StickerSearchFilters = {
  ownership: OwnershipFilter.ALL
}

export const DEFAULT_STICKER_SELL_FILTERS: StickerSearchFilters = {
  ownership: OwnershipFilter.OWNED
}

const baseOffset = getStickerID(0)

export const AllStickerIds = uniq(
  Array.from(StickerLibrary.keys())
    .reduce((prev, curr) => {
      const withoutOffset = curr - baseOffset

      if (prev.includes(withoutOffset)) return prev

      return [...prev, curr]
    }, [] as number[])
    .map(getStickerID)
)

export const AllStickers = new Map<number, Sticker>()

AllStickerIds.forEach((id) => {
  const sticker = StickerLibrary.get(id)

  if (!!sticker) {
    AllStickers.set(id, { ...sticker, id })
  }
})
