import { getLegacyHeroID, getStickerID } from '@opensky/shared/assetsIDs'
import { BASE_HERO_SKINS, ID_HEROES } from '@opensky/shared/constants'
import { SkyTagTitlesLibrary } from '@opensky/shared/cosmetics'
import { useMemo } from 'react'

import { ItemType } from '~/lib/proto'

import { AllHeroSkins } from '../constants/hero-skins'
import { AllStickers } from '../constants/stickers'

export const useArtIdByType = (type?: ItemType, id?: number) => {
  return useMemo(() => {
    if (!id || !type) return null
    if (type === ItemType.SW_STICKERS) {
      return AllStickers.get(getStickerID(id))
    } else if (type === ItemType.SW_HERO) {
      return BASE_HERO_SKINS[ID_HEROES[id]]
    } else if (type === ItemType.SW_HERO_SKINS) {
      return AllHeroSkins.get(getLegacyHeroID(id))
    } else if (type === ItemType.SW_TITLES) {
      return SkyTagTitlesLibrary.get(id)
    }
    return null
  }, [type, id])
}
