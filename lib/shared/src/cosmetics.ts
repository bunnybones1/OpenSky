import {
  getCardBackID,
  getCrystalID,
  getLegacyHeroID,
  getStickerID
} from './assetsIDs'
import { CardBack, Crystal, HeroSkin, SkyTagTitle, Sticker } from './constants'
import {
  cardBacks,
  crystals,
  heroSkins,
  skyTagTitles,
  stickers
} from './cosmetics_data'

export const heroSkinBaseOffset = getLegacyHeroID(0)
export const crystalBaseOffset = getCrystalID(0)
export const stickerBaseOffset = getStickerID(0)
export const cardBackBaseOffset = getCardBackID(0)

//everything is stored TWICE in these libraries, once using offset and once not using offsets, for easier testing
export const HeroSkinLibrary = new Map<number, Readonly<HeroSkin>>([
  ...heroSkins.map(item => [item.id, item] as const),
  ...heroSkins.map(item => [item.id + heroSkinBaseOffset, item] as const)
])
export const CrystalLibrary = new Map<number, Readonly<Crystal>>([
  ...crystals.map(item => [item.id, item] as const),
  ...crystals.map(item => [item.id + crystalBaseOffset, item] as const)
])
export const StickerLibrary = new Map<number, Readonly<Sticker>>([
  ...stickers.map(item => [item.id, item] as const),
  ...stickers.map(item => [item.id + stickerBaseOffset, item] as const)
])
export const CardBackLibrary = new Map<number, Readonly<CardBack>>([
  ...cardBacks.map(item => [item.id, item] as const),
  ...cardBacks.map(item => [item.id + cardBackBaseOffset, item] as const)
])

export const SkyTagTitlesLibrary = new Map<number, Readonly<SkyTagTitle>>(
  skyTagTitles.map(item => [item.id, item] as const)
)
