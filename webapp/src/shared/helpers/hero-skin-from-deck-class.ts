import {
  BASE_HERO_SKINS,
  DECKCLASS_HEROES,
  HeroSkin
} from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'

import { DeckClass } from '~/lib/proto'

export const heroSkinFromDeckClass = (deckClass: DeckClass) => {
  const hero = DECKCLASS_HEROES[deckClass]
  const baseSkin = BASE_HERO_SKINS[hero]

  let legacySkin: HeroSkin | undefined

  HeroSkinLibrary.forEach((heroSkin) => {
    if (heroSkin.hero === hero && !legacySkin) {
      legacySkin = heroSkin
    }
  })

  return {
    base: baseSkin,
    legacy: legacySkin
  }
}
