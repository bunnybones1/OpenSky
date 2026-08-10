import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { useFilteredCardBacksList } from '~/shared/hooks/card-backs/useFilteredCardBacksList'
import { useTokensSortedByPrice } from '~/shared/queries/useTokensSortedByPrice'
import { marketCardBacksFilterState } from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'
import { updateMarketCardBacksState } from '~/shared/state/market-cardbacks/market-cardbacks-state'
import { CARD_SORTING_OPTIONS, OwnershipFilter } from '~/shared/types/cards'
import { PriceAndSupplyWithId } from '~/shared/types/market'

export const useMarketCardBacksList = () => {
  const filters = useSnapshot(marketCardBacksFilterState)

  const mode =
    filters.ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY

  const { data: cardBacksSortedByPriceDesc } = useTokensSortedByPrice(
    mode,
    ItemType.SW_CARD_BACKS
  )

  const { cardBacksList } = useFilteredCardBacksList(filters)

  const marketCardBacksList = useMemo(() => {
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
  }, [filters.sort, mode, cardBacksList, cardBacksSortedByPriceDesc])

  useEffect(() => {
    updateMarketCardBacksState('numSearchResults', marketCardBacksList?.length)
  }, [marketCardBacksList])

  return { marketCardBacksList }
}
