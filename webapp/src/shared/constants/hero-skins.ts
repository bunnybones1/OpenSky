import { getLegacyHeroID } from '@opensky/shared/assetsIDs'
import { HeroSkin } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import { Prism } from '@skyweaver/state-metadata'
import uniq from 'lodash-es/uniq'

import { OwnershipFilter } from '../types/cards'

export const HERO_BASE_CLASSNAME = 'HERO_BASE'

export enum HERO_SKIN_SORTING_OPTIONS {
  PRICE_ASCENDING = 'PRICE_ASCENDING',
  PRICE_DESCENDING = 'PRICE_DESCENDING'
}

export interface HeroSkinSearchFilters {
  ownership?: OwnershipFilter
  prism?: Prism[]
}

export const HeroSkinSearchFilterArrayKeys = []

export const DEFAULT_HERO_SKIN_FILTERS: HeroSkinSearchFilters = {
  ownership: OwnershipFilter.OWNED
}

export const DEFAULT_HERO_SKIN_BUY_FILTERS: HeroSkinSearchFilters = {
  ownership: OwnershipFilter.ALL
}

export const DEFAULT_HERO_SKIN_SELL_FILTERS: HeroSkinSearchFilters = {
  ownership: OwnershipFilter.OWNED
}

const baseOffset = getLegacyHeroID(0)

export const AllHeroSkinIds = uniq(
  Array.from(HeroSkinLibrary.keys())
    .reduce((prev, curr) => {
      const withoutOffset = curr - baseOffset

      if (prev.includes(withoutOffset)) return prev

      return [...prev, curr]
    }, [] as number[])
    .map(getLegacyHeroID)
)

export const AllHeroSkins = new Map<number, HeroSkin>()

AllHeroSkinIds.forEach((id) => {
  const skin = HeroSkinLibrary.get(id)

  if (!!skin) {
    AllHeroSkins.set(id, skin)
  }
})
