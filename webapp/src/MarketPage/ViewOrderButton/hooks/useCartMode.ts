import { SwapType } from '@0xsequence/metadata'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { useSelector } from '~/shared/redux/index'
import {
  isMarketCardBacksRouteSelector,
  isMarketCardsRouteSelector,
  isMarketDecksRouteSelector,
  isMarketStickersRouteSelector
} from '~/shared/redux/router/selectors'
import { marketCardBacksFilterState } from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'
import { marketCardsFilterState } from '~/shared/state/market-cards/market-cards-filter-state'
import { marketStickersFilterState } from '~/shared/state/market-stickers/market-stickers-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'

export const useCartMode = () => {
  const isMarketDecks = useSelector(isMarketDecksRouteSelector)
  const isMarketCards = useSelector(isMarketCardsRouteSelector)
  const isMarketStickers = useSelector(isMarketStickersRouteSelector)
  const isMarketCardBacks = useSelector(isMarketCardBacksRouteSelector)

  const { ownership: cardOwnerShip } = useSnapshot(marketCardsFilterState)
  const { ownership: stickerOwnerShip } = useSnapshot(marketStickersFilterState)
  const { ownership: cardBackOwnership } = useSnapshot(marketCardBacksFilterState)

  return useMemo(() => {
    if (isMarketDecks) return SwapType.BUY
    if (isMarketCards) {
      return cardOwnerShip === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY
    }
    if (isMarketStickers) {
      return stickerOwnerShip === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY
    }
    if (isMarketCardBacks) {
      return cardBackOwnership === OwnershipFilter.OWNED
        ? SwapType.SELL
        : SwapType.BUY
    }
    return
  }, [
    cardBackOwnership,
    cardOwnerShip,
    isMarketCardBacks,
    isMarketCards,
    isMarketDecks,
    isMarketStickers,
    stickerOwnerShip
  ])
}
