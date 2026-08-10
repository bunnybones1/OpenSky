import { ItemType } from '@opensky/proto'
import { BaseCard } from '@skyweaver/state-metadata'
import { useMemo } from 'react'

import { CARD_ITEM_TYPES } from '~/shared/constants/cards'
import { useMultiTypeTokenBalances } from '~/shared/queries/useTokenBalances'

export const useDeckOwnedCards = (
  cardIds?: BaseCard[],
  grade?: ItemType.SW_SILVER_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_BASE_CARDS
) => {
  const cardBalances = useMultiTypeTokenBalances(CARD_ITEM_TYPES)

  return useMemo(() => {
    if (cardBalances === undefined || !cardIds) return undefined

    const unlockedCards = cardIds.filter((baseId) => {
      if (!!grade) {
        return !!cardBalances.some(
          (balance) => String(balance.id) === baseId && balance.itemType === grade
        )
      }

      return !!cardBalances.some((balance) => String(balance.id) === baseId)
    })

    return unlockedCards.map((id) => String(id) as BaseCard)
  }, [cardBalances, cardIds, grade])
}
