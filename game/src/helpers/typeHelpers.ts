import { DeckClass, RewardCard } from '@opensky/proto'
import { PrismClass } from '@opensky/shared/constants'
import { getDeckClassFromPrisms } from '@opensky/shared/helpers'
import { getNext, getRandom } from '@opensky/shared/utils/arrayUtils'
import { BaseCard, Prism, Rarity, Trait } from '@skyweaver/state-metadata'

import { getFrameStyleFromItem } from '~/components/FrameStyleComponent'

export const __prismOrder: Prism[] = ['str', 'hrt', 'agy', 'int', 'wis', 'tok']

export function prismsToTextureBaseName(prisms: Prism[]): DeckClass {
  return (
    getDeckClassFromPrisms(
      prisms.map(str => str.toUpperCase()) as PrismClass[]
    ) ?? DeckClass.UNKNOWN_CLASS
  )
}

export function getRandomPrism() {
  let p = getRandom(__prismOrder)
  if (p === 'tok') {
    p = getNext(__prismOrder, p)
  }
  if (Math.random() > 0.2) {
    let p2 = getRandom(__prismOrder)
    while (p2 === 'tok' || p2 === p) {
      p2 = getNext(__prismOrder, p2)
    }
    return [p, p2].sort(
      (a, b) => __prismOrder.indexOf(a) - __prismOrder.indexOf(b)
    )
  } else {
    return [p]
  }
}

export const UnlockedRarityStrings = ['base', 'silver', 'gold'] as const

export type UnlockedRarity = (typeof UnlockedRarityStrings)[number]

export const RarityStrings: Rarity[] = ['none', 'base', 'silver', 'gold']

export const traitBadgeOrder: readonly Trait[] = [
  'stealth',
  'guard',
  'armor',
  'banner',
  'lifesteal',
  'wither',
  'dash'
] as const

export function traitBadgeSort(a: Trait, b: Trait) {
  return traitBadgeOrder.indexOf(a) - traitBadgeOrder.indexOf(b)
}

export type MatchEndType = 'victory' | 'defeat' | 'tie'

export interface SimpleRewardCard {
  id: BaseCard
  rarity: Rarity
}

export function rewardCardToSimpleRewardCard(
  reward: RewardCard
): SimpleRewardCard {
  return {
    id: `${reward.card.id}` as BaseCard,
    rarity: getFrameStyleFromItem(reward.item?.itemType)
  }
}

export type TextSentiment =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'defensive'
  | 'offensive'
