import { getCardBackID } from '@opensky/shared/assetsIDs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DeckClass, ItemType } from '~/lib/proto'
import { AllCardBacks } from '~/shared/constants/card-backs'

export const useSkypassRewardTitle = (
  name: string,
  type: ItemType,
  amount: number,
  rewardTokens: number[],
  unlockedDecks?: DeckClass[]
) => {
  const { t } = useTranslation()

  return useMemo(() => {
    switch (type) {
      case ItemType.SW_TITLES:
        return `${name} ${t('skypass.title')}`
      case ItemType.SW_STICKERS:
        return `${name} ${t('skypass.sticker')}`
      case ItemType.SW_HERO:
        return `${name}${
          (unlockedDecks &&
            unlockedDecks[0] &&
            ` + ${unlockedDecks[0]} ${t(`skypass.deck`)}`) ||
          ''
        }`
      case ItemType.SW_BASE_CARDS:
      case ItemType.SW_SILVER_CARDS:
        return amount > 1
          ? `${amount} ${t(`skypass.titles.${type}`)}S`
          : t(`skypass.titles.${type}`)
      case ItemType.SW_CONQUEST_TICKET:
      case ItemType.SW_STICKER_POINTS:
        return `${amount} ${t(`skypass.titles.${type}`)}${amount > 1 ? 'S' : ''}`
      case ItemType.SW_CARD_BACKS:
        if (rewardTokens[0]) {
          const cardName = AllCardBacks.get(getCardBackID(rewardTokens[0]))?.name
          return `${cardName} ${t(`skypass.titles.${type}`)}`
        } else return t(`skypass.titles.${type}`)
      default:
        return t(`skypass.titles.${type}`)
    }
  }, [name, type, amount, rewardTokens, unlockedDecks, t])
}
