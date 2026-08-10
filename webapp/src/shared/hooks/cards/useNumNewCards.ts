import { ItemType } from '@opensky/proto'
import { useMemo } from 'react'

import { CARD_ITEM_TYPES } from '~/shared/constants/cards'
import { useMultiTypeTokenBalances } from '~/shared/queries/useTokenBalances'

export const useNumNewCards = () => {
  const cardBalances = useMultiTypeTokenBalances(CARD_ITEM_TYPES)

  return useMemo(() => {
    let baseCount = 0
    let silverCount = 0
    let goldCount = 0

    if (!!cardBalances?.length) {
      cardBalances.forEach((balance) => {
        if (balance.isNew) {
          if (balance.itemType === ItemType.SW_BASE_CARDS) baseCount += 1
          if (balance.itemType === ItemType.SW_SILVER_CARDS) silverCount += 1
          if (balance.itemType === ItemType.SW_GOLD_CARDS) goldCount += 1
        }
      })
    }
    return {
      baseCount,
      silverCount,
      goldCount
    }
  }, [cardBalances])
}
