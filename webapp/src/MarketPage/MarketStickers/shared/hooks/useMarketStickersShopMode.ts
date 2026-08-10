import { SwapType } from '@0xsequence/metadata'
import { useSnapshot } from 'valtio'

import { marketStickersFilterState } from '~/shared/state/market-stickers/market-stickers-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const useMarketStickersShopMode = () => {
  const { ownership } = useSnapshot(marketStickersFilterState)

  return ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY
}
