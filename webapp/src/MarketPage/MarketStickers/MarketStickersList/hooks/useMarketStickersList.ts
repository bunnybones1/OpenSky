import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { useFilteredStickerList } from '~/shared/hooks/stickers/useFilteredStickerList'
import { useTokenBalances } from '~/shared/queries/useTokenBalances'
import { useTokensSortedByPrice } from '~/shared/queries/useTokensSortedByPrice'
import { marketStickersFilterState } from '~/shared/state/market-stickers/market-stickers-filter-state'
import { updateMarketStickersState } from '~/shared/state/market-stickers/market-stickers-state'
import { CARD_SORTING_OPTIONS, OwnershipFilter } from '~/shared/types/cards'

export const useMarketStickersList = (inventoryOnly = false) => {
  const filters = useSnapshot(marketStickersFilterState)

  const mode =
    filters.ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY

  const { data: stickersSortedByPriceDesc } = useTokensSortedByPrice(
    mode,
    ItemType.SW_STICKERS,
    inventoryOnly
  )

  const { stickersList } = useFilteredStickerList(filters)
  const { data: balances } = useTokenBalances(ItemType.SW_STICKERS)

  const marketStickerList = useMemo(() => {
    if (inventoryOnly) {
      if (stickersList === undefined || balances === undefined) return undefined

      const balanceById = new Map(
        (balances || []).map((balance) => [balance.tokenID, balance.balance])
      )
      const direction =
        filters.sort === CARD_SORTING_OPTIONS.QUANTITY_ASCENDING ? 1 : -1

      return [...stickersList].sort((left, right) => {
        const quantityDifference =
          ((balanceById.get(left.id) || 0) - (balanceById.get(right.id) || 0)) *
          direction
        return quantityDifference || left.id - right.id
      })
    }

    if (stickersSortedByPriceDesc === undefined || stickersList === undefined)
      return undefined

    let sortedStickerPrices = stickersSortedByPriceDesc || []

    // eslint-disable-next-line valtio/state-snapshot-rule
    if (filters.sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING) {
      sortedStickerPrices = [...sortedStickerPrices].reverse()
    }
    const sortedStickers = sortedStickerPrices
      .map((priceAndSupply) =>
        stickersList.find((sticker) => sticker.id === priceAndSupply.id)
      )
      .filter(isDefined)

    const stickersWithoutPrice =
      mode === SwapType.SELL
        ? []
        : stickersList.filter(({ id }) => {
            return !sortedStickers.find((sticker) => sticker.id === id)
          })

    return [...sortedStickers, ...stickersWithoutPrice]
  }, [
    balances,
    filters.sort,
    inventoryOnly,
    mode,
    stickersList,
    stickersSortedByPriceDesc
  ])

  useEffect(() => {
    updateMarketStickersState('numSearchResults', marketStickerList?.length)
  }, [marketStickerList])

  return { marketStickerList }
}
