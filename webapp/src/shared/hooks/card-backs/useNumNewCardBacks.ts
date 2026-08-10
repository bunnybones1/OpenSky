import { ItemType } from '@opensky/proto'
import { useMemo } from 'react'

import { useTokenBalances } from '~/shared/queries/useTokenBalances'

export const useNumNewCardBacks = () => {
  const { data: cardBackBalances } = useTokenBalances(ItemType.SW_CARD_BACKS)
  return useMemo(() => {
    return cardBackBalances?.filter((cardBack) => cardBack.isNew).length || 0
  }, [cardBackBalances])
}
