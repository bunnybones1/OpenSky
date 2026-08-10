import { Hero } from '@opensky/proto'
import { getLegacyHeroID } from '@opensky/shared/assetsIDs'
import { HeroSkin } from '@opensky/shared/constants'
import { BASE_HERO_SKINS as BASE_SKINS } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import uniq from 'lodash-es/uniq'

import { isNotNull } from '~/shared/helpers/is-defined-is-not-null'

export interface HeroSkinWithTokenId extends HeroSkin {
  tokenId?: number
}

const BASE_SKIN_CODES = Object.keys(BASE_SKINS).filter(
  (code) => code !== Hero.UNKNOWN
)

export const BASE_SKIN_ARRAY: HeroSkinWithTokenId[] = BASE_SKIN_CODES.map((code) => {
  const skin = BASE_SKINS[code] as HeroSkin
  return skin
})

const HERO_SKIN_IDS = uniq(
  Array.from(HeroSkinLibrary.entries()).map(([_, skin]) => {
    return skin.id
  })
)

/**
 * This is an array version of HeroSkinLibrary, with the duplicate skins removed.
 * HeroSkinLibrary gives us two version of each skin with identical data, one serialized by ID and the other
 * by tokenId, which is nice when getting data, but not nice when trying to iterate over
 * them to render.
 */
export const HERO_SKIN_ARRAY: HeroSkinWithTokenId[] = HERO_SKIN_IDS.map((id) => {
  const skin = HeroSkinLibrary.get(id)

  if (!!skin) {
    return { ...skin, tokenId: getLegacyHeroID(id) }
  }
  return null
}).filter(isNotNull)

export const HERO_FEATURE_SELECTOR_HEIGHT = 78
export const MOBILE_HERO_FEATURE_SELECTOR_HEIGHT = 40
