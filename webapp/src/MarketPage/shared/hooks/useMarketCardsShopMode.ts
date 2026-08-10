import { SwapType } from '@0xsequence/metadata'
import { useSnapshot } from 'valtio'

import { marketCardsFilterState } from '~/shared/state/market-cards/market-cards-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const useMarketCardsShopMode = () => {
  const { ownership } = useSnapshot(marketCardsFilterState)

  return ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY
}
