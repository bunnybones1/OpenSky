import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { GlobalQueryClient } from '~/shared/clients'
import { VALID_MARKET_ITEM_TYPES } from '~/shared/constants/market'
import {
  getTokenPriceAndSupplyKey,
  getTokensSortedByPriceKey
} from '~/shared/constants/react-query-keys'
import { ONE_MINUTE } from '~/shared/constants/time'
import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { getPriceWithFees } from '~/shared/helpers/market/get-price-with-fees'
import { tokenPriceFetcher } from '~/shared/queries/useTokenPriceAndSupply'
import { CartItem, MarketMode } from '~/shared/types/market'

export const useCheckoutPanelTotals = (items: CartItem[], mode: MarketMode) => {
  const queries = useQueries({
    queries: (items || [])
      .filter((item) => {
        return VALID_MARKET_ITEM_TYPES.includes(item.type)
      })
      .map((item) => {
        return {
          queryKey: getTokenPriceAndSupplyKey({
            id: item.tokenId,
            mode: item.side,
            quantity: item.amount
          }),
          queryFn: tokenPriceFetcher({
            tokenId: item.tokenId,
            mode: item.side,
            quantity: item.amount
          }),
          staleTime: ONE_MINUTE * 3,
          onSuccess: () => {
            if (item.amount === 1) {
              GlobalQueryClient.invalidateQueries(
                getTokensSortedByPriceKey(item.side, item.type)
              )
            }
          }
        }
      })
  })

  return useMemo(() => {
    const isFetching = queries.some((result) => result.data === undefined)

    if (isFetching) return undefined

    const totalWithoutFees = queries
      .map((result) => {
        return result.data || undefined
      })
      .filter(isDefined)
      .reduce((prev, curr) => {
        if (!curr) return prev

        return prev + curr.price
      }, 0 as number)

    return getPriceWithFees(formatUSDCBalance(totalWithoutFees), mode).toFixed(2)
  }, [mode, queries])
}
