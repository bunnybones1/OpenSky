import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { getItemType } from '@opensky/shared/assetsIDs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { chunk, uniq } from 'lodash-es'
import { useSnapshot } from 'valtio'

import { TRADABLE_CARD_ITEM_TYPES } from '~/shared/constants/cards'
import { VALID_MARKET_ITEM_TYPES } from '~/shared/constants/market'
import {
  getTokenPriceAndSupplyKey,
  getTokensSortedByPriceKey,
  getWalletValueKey
} from '~/shared/constants/react-query-keys'
import { ONE_MINUTE } from '~/shared/constants/time'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { tokensPricesFetcher } from '~/shared/helpers/market/tokens-prices-fetcher'
import { useMultiTypeTokenBalances } from '~/shared/queries/useTokenBalances'
import { authenticationState } from '~/shared/state/authentication-state'
import { PriceAndSupply } from '~/shared/types/market'

export const useWalletCardValues = () => {
  const { userAddress } = useSnapshot(authenticationState)

  const cardBalances = useMultiTypeTokenBalances(TRADABLE_CARD_ITEM_TYPES)

  const queryClient = useQueryClient()

  return useQuery(
    getWalletValueKey(userAddress),
    async () => {
      if (!cardBalances) return

      const chunkedTokenInfo = chunk(cardBalances, 80)

      const prices = await Promise.all(
        chunkedTokenInfo.map(async (chunk) => {
          const tokenIds = chunk.map(({ tokenID }) => tokenID)
          const quantities = chunk.map(({ balance }) => balance)

          return await tokensPricesFetcher({
            tokenIds,
            mode: SwapType.SELL,
            quantities
          })()
        })
      ).then((resp) => resp.flatMap((prices) => prices))

      let goldValue: number | null = null
      let silverValue: number | null = null

      const updatedItemTypes: ItemType[] = []

      prices.forEach(({ tokenId, price, quantity, supply }) => {
        const itemType = getItemType(tokenId)

        if (
          !!itemType &&
          VALID_MARKET_ITEM_TYPES.includes(itemType) &&
          !!quantity &&
          Number(quantity) > 0
        ) {
          if (Number(quantity) === 1 && !updatedItemTypes.includes(itemType))
            updatedItemTypes.push(itemType)

          queryClient.setQueryData<PriceAndSupply>(
            getTokenPriceAndSupplyKey({
              id: tokenId,
              quantity: Number(quantity),
              mode: SwapType.SELL
            }),
            { price, supply }
          )
        }

        if (itemType === ItemType.SW_SILVER_CARDS) {
          silverValue = !silverValue ? price : silverValue + price
        }
        if (itemType === ItemType.SW_GOLD_CARDS) {
          goldValue = !goldValue ? price : goldValue + price
        }
      })

      uniq(updatedItemTypes).forEach((itemType) => {
        queryClient.invalidateQueries(
          getTokensSortedByPriceKey(SwapType.SELL, itemType)
        )
      })

      return {
        goldValue: !!goldValue ? formatUSDCBalance(goldValue) : goldValue,
        silverValue: !!silverValue ? formatUSDCBalance(silverValue) : silverValue
      }
    },
    {
      enabled: !!userAddress && !!cardBalances && !!cardBalances.length,
      staleTime: ONE_MINUTE * 10
    }
  )
}
