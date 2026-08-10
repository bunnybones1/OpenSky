import { BASE_HERO_SKINS, DECKCLASS_HEROES } from '@opensky/shared/constants'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import {
  BaseCard,
  CardLibrary,
  isHero,
  Prism,
  Type
} from '@skyweaver/state-metadata'

import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { cardArtFolder } from '~/helpers/cardArtHelpers'
import { getHeroSkin } from '~/helpers/heroSkins'

export function getCharacterAtlasKey(card: RelaxedCardInstance) {
  return `type:${isHero(card) ? 'hero' : card.state.view.type}${
    card.state.view.traits.includes('guard') ? '-guard' : ''
  }-element:${card.state.view.element}-art:${getCardAssetString(card)}`
}

export function getCardAtlasKey(card: RelaxedCardInstance) {
  const res = `type:${isHero(card) ? 'hero' : card.state.view.type}-element:${
    card.state.view.element
  }-art:${getCardAssetString(card)}-traits:${card.state.view.traits.join('_')}`
  return res
}

export function getBGAtlasKey(card: RelaxedCardInstance) {
  const key =
    (isHero(card) && card.base === 'Hero'
      ? getHeroSkin(card).bgID
      : CardLibrary.get(card.base)?.backgroundArtSlug) || 'bg-air-01'
  if (key.includes('bg-sky')) {
    return key.replace('bg-sky', 'bg-air')
  } else {
    return key
  }
}

export function heroAssetForPrisms(prisms: Prism[]): string {
  const deckClass = prismsToDeckClass(prisms)
  return (
    BASE_HERO_SKINS[DECKCLASS_HEROES[deckClass]] || BASE_HERO_SKINS.UNKNOWN
  ).artID
}

export function getCardAssetString(
  card: RelaxedCardInstance | BaseCard
): string {
  if (typeof card === 'object' && isHero(card) && card.base === 'Hero') {
    return getHeroSkin(card).artID
  } else {
    return CardLibrary.get(typeof card === 'object' ? card.base : card)!.artSlug
  }
}

export function getCardFgUrlFromAsset(assetName: string, type: Type): string {
  return assetName.startsWith('blob:')
    ? assetName
    : `game/cards/art-full/${cardArtFolder[type]}s/${assetName}.png`
}
