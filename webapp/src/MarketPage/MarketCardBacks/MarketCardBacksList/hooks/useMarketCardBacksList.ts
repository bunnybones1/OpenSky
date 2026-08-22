import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { useFilteredCardBacksList } from '~/shared/hooks/card-backs/useFilteredCardBacksList'
import { useTokenBalances } from '~/shared/queries/useTokenBalances'
import { useTokensSortedByPrice } from '~/shared/queries/useTokensSortedByPrice'
import { marketCardBacksFilterState } from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'
import { updateMarketCardBacksState } from '~/shared/state/market-cardbacks/market-cardbacks-state'
import { CARD_SORTING_OPTIONS, OwnershipFilter } from '~/shared/types/cards'
import { PriceAndSupplyWithId } from '~/shared/types/market'

export const useMarketCardBacksList = (inventoryOnly = false) => {
  const filters = useSnapshot(marketCardBacksFilterState)

  const mode =
    filters.ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY

  const { data: cardBacksSortedByPriceDesc } = useTokensSortedByPrice(
    mode,
    ItemType.SW_CARD_BACKS,
    inventoryOnly
  )

  const { cardBacksList } = useFilteredCardBacksList(filters)
  const { data: balances } = useTokenBalances(ItemType.SW_CARD_BACKS)

  const marketCardBacksList = useMemo(() => {
    if (inventoryOnly) {
      if (cardBacksList === undefined || balances === undefined) return undefined

      const balanceById = new Map(
        (balances || []).map((balance) => [balance.tokenID, balance.balance])
      )
      const direction =
        filters.sort === CARD_SORTING_OPTIONS.QUANTITY_ASCENDING ? 1 : -1

      return [...cardBacksList].sort((left, right) => {
        const quantityDifference =
          ((balanceById.get(left.id) || 0) - (balanceById.get(right.id) || 0)) *
          direction
        return quantityDifference || left.id - right.id
      })
    }

    if (cardBacksSortedByPriceDesc === undefined || cardBacksList === undefined)
      return undefined

    let sortedCardBackPrices: PriceAndSupplyWithId[] =
      cardBacksSortedByPriceDesc || []

    // eslint-disable-next-line valtio/state-snapshot-rule
    if (filters.sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING) {
      sortedCardBackPrices = [...sortedCardBackPrices].reverse()
    }
    const sortedCardBacks = sortedCardBackPrices
      .map((priceAndSupply) =>
        cardBacksList.find((cardBack) => cardBack.id === priceAndSupply.id)
      )
      .filter(isDefined)

    const cardBacksWithoutPrice =
      mode === SwapType.SELL
        ? []
        : cardBacksList.filter(({ id }) => {
            return !sortedCardBacks.find((cardBack) => cardBack.id === id)
          })

    return [...sortedCardBacks, ...cardBacksWithoutPrice]
  }, [
    balances,
    cardBacksList,
    cardBacksSortedByPriceDesc,
    filters.sort,
    inventoryOnly,
    mode
  ])

  useEffect(() => {
    updateMarketCardBacksState('numSearchResults', marketCardBacksList?.length)
  }, [marketCardBacksList])

  return { marketCardBacksList }
}
