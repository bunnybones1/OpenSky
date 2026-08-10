import sample from 'lodash-es/sample'
import { useMemo } from 'react'

import { CardSet, ItemType } from '~/lib/proto'

const IMAGE_TYPES = {
  [ItemType.SW_SILVER_CARDS]: 'skypass-reward-silver-purple',
  [ItemType.SW_BASE_CARDS]: 'skypass-reward-base-purple',
  [ItemType.SW_CONQUEST_TICKET]: 'skypass-conquest-ticket',
  [ItemType.SW_STICKERS]: 'skypass-reward-sticker-bg',
  [ItemType.SW_STICKER_POINTS]: 'skypass-reward-sticker-points',
  [ItemType.SW_HERO_SKINS]: '',
  [ItemType.SW_HERO]: '',
  [ItemType.SW_CARD_BACKS]: '',
  [CardSet.HEXBOUND_INVASION]: 'reward-hexinv'
}

export const useSkypassRewardImageURL = (
  type: ItemType,
  amount: number,
  cardSet?: CardSet
) => {
  return useMemo(() => {
    if (type === ItemType.SW_TITLES) {
      return 'skypass-reward-bg-default'
    }
    if (type === ItemType.SW_BASE_CARDS) {
      if (!!cardSet && amount === 1) return `${IMAGE_TYPES[cardSet]}${'-singlecard'}`
      return amount > 1
        ? 'skypass-reward-bg-default'
        : `skypass-reward-base-${sample(['red', 'blue', 'purple', 'green'])}`
    } else if (type === ItemType.SW_SILVER_CARDS) {
      if (!!cardSet && amount === 1)
        return `${IMAGE_TYPES[cardSet]}${'-singlecard'}-silver`
      return amount > 1
        ? 'skypass-reward-bg-default'
        : `skypass-reward-silver-${sample(['red', 'blue', 'purple', 'green'])}`
    }
    return type && IMAGE_TYPES[type]
  }, [amount, type, cardSet])
}
