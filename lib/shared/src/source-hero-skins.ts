import { DeckClass, Hero } from '@opensky/proto'

import { DECKCLASS_HEROES } from './constants'

/**
 * The source hero_skins table assigns its legacy ownership token IDs to the
 * corresponding proto Hero values. Keep that chain-owned identity separate
 * from cosmetic metadata: Conquest V2 points use these exact item token IDs.
 */
export const SOURCE_HERO_SKIN_ID_BY_HERO: Partial<Record<Hero, number>> = {
  [Hero.ADA]: 1,
  [Hero.SAMYA]: 2,
  [Hero.FOX]: 3,
  [Hero.LOTUS]: 4,
  [Hero.TITUS]: 5,
  [Hero.IRIS]: 6,
  [Hero.BOURAN]: 7,
  [Hero.HORIK]: 8,
  [Hero.ZOEY]: 9,
  [Hero.AXEL]: 10,
  [Hero.ARI]: 11,
  [Hero.MIRA]: 12,
  [Hero.MAI]: 13,
  [Hero.BANJO]: 14,
  [Hero.SITTI]: 15
}

export const sourceHeroSkinIdForDeckClass = (deckClass: DeckClass) =>
  SOURCE_HERO_SKIN_ID_BY_HERO[DECKCLASS_HEROES[deckClass]]
