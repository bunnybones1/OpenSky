/* eslint-disable valtio/state-snapshot-rule */
import { ItemType } from '@opensky/proto'
import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { useFilteredHeroSkinsList } from '~/shared/hooks/hero-skins/useFilteredHeroSkinsList'
import { useHeroSkinMintCosts } from '~/shared/queries/hero-skins/useHeroSkinMintCost'
import { useTokenBalances } from '~/shared/queries/useTokenBalances'
import { marketHeroesFilterState } from '~/shared/state/market-heroes/market-heroes-filter-state'
import { updateMarketHeroesState } from '~/shared/state/market-heroes/market-heroes-state'
import { CARD_SORTING_OPTIONS } from '~/shared/types/cards'

const getHeroesSortedByPrice = (
  ids: number[] | undefined,
  prices: { id: number; price: number | null | undefined }[] | undefined,
  sort?: CARD_SORTING_OPTIONS
) => {
  if (!sort || !ids) {
    return ids
  }

  if (
    sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING ||
    sort === CARD_SORTING_OPTIONS.PRICE_DESCENDING
  ) {
    const isAsc = sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING

    if (!prices) return undefined

    const sortedPrices = prices.sort((a, b) => {
      const aPrice = !!a.price ? a.price : !isAsc ? 0 : 999999
      const bPrice = !!b.price ? b.price : !isAsc ? 0 : 999999

      if (isAsc) {
        return aPrice - bPrice
      }
      return bPrice - aPrice
    })

    return sortedPrices.filter(({ id }) => ids.includes(id)).map(({ id }) => id)
  }

  return ids
}

export const useMarketHeroesList = (inventoryOnly = false) => {
  const filters = useSnapshot(marketHeroesFilterState)

  const { heroSkinList } = useFilteredHeroSkinsList(filters)
  const { costs } = useHeroSkinMintCosts(inventoryOnly)
  const { data: balances } = useTokenBalances(ItemType.SW_HERO_SKINS)

  const marketHeroSkinList = useMemo(() => {
    let ids = heroSkinList?.map(({ id }) => id)
    if (inventoryOnly) {
      if (ids === undefined || balances === undefined) return undefined

      const balanceById = new Map(
        (balances || []).map((balance) => [balance.tokenID, balance.balance])
      )
      const direction =
        filters.sort === CARD_SORTING_OPTIONS.QUANTITY_ASCENDING ? 1 : -1

      ids = [...ids].sort((left, right) => {
        const quantityDifference =
          ((balanceById.get(left) || 0) - (balanceById.get(right) || 0)) * direction
        return quantityDifference || left - right
      })
    }
    if (
      !inventoryOnly &&
      !!ids &&
      !!filters?.sort &&
      (filters.sort === CARD_SORTING_OPTIONS.PRICE_ASCENDING ||
        filters.sort === CARD_SORTING_OPTIONS.PRICE_DESCENDING)
    ) {
      ids = getHeroesSortedByPrice(ids, costs, filters.sort)
    }

    return ids?.map((id) => ({ id }))
  }, [balances, costs, filters.sort, heroSkinList, inventoryOnly])

  useEffect(() => {
    updateMarketHeroesState('numSearchResults', marketHeroSkinList?.length)
  }, [marketHeroSkinList])

  return { marketHeroSkinList }
}
