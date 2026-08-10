import { SwapType } from '@0xsequence/metadata'
import { useSnapshot } from 'valtio'

import { marketCardBacksFilterState } from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const useMarketCardBacksShopMode = () => {
  const { ownership } = useSnapshot(marketCardBacksFilterState)

  return ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY
}
