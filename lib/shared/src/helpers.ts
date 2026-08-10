import { DeckClass } from '@opensky/proto'
import { DECKS_CONFIG, PrismClass, BASE_HERO_SKINS, HeroSkin, DECKCLASS_HEROES } from './constants'
import type { Prism } from '@skyweaver/state-metadata'
import { HeroSkinLibrary } from './cosmetics'

export function getDeckClassFromPrisms(prisms: PrismClass[]) {
  if (prisms.length === 1) {
    return prisms[0] as any as DeckClass
  }
  const polyDeck = DECKS_CONFIG.find(deckType => {
    return (
      deckType.filters.includes(prisms[0]) &&
      deckType.filters.includes(prisms[1])
    )
  })
  if (!polyDeck) return
  return polyDeck.code
}

export function prismsToDeckClass(prisms: Prism[]): DeckClass {
  if (prisms.length === 0) {
    return DeckClass.UNKNOWN_CLASS
  }
  let prism: string = prisms[0]
  if (prisms.length === 2) {
    prism = prism[0] + prism[1] + prisms[1][0]
  }
  return prism.toUpperCase() as DeckClass
}

export const isVersionGreaterThan = (left: string, right: string): boolean => {
  if (typeof left + typeof right != 'stringstring') return false

  var a = left.split('.'),
    b = right.split('.'),
    i = 0,
    len = Math.max(a.length, b.length)

  for (; i < len; i++) {
    if (
      (a[i] && !b[i] && parseInt(a[i]) > 0) ||
      parseInt(a[i]) > parseInt(b[i])
    ) {
      return true
    } else if (
      (b[i] && !a[i] && parseInt(b[i]) > 0) ||
      parseInt(a[i]) < parseInt(b[i])
    ) {
      return false
    }
  }

  return false
}

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
