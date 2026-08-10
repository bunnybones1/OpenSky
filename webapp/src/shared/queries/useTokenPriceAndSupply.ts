import { ChainId } from '@0xsequence/network'
import { getItemType } from '@opensky/shared/assetsIDs'
import { useQuery } from '@tanstack/react-query'
import { BigNumber } from 'ethers'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { AuthenticationClient, GlobalQueryClient } from '~/shared/clients'
import { APIClient } from '~/shared/clients'

import { VALID_MARKET_ITEM_TYPES } from '../constants/market'
import {
  getTokenPriceAndSupplyKey,
  getTokensSortedByPriceKey,
  UseTokenPriceAndSupplyArgs
} from '../constants/react-query-keys'
import { ONE_MINUTE } from '../constants/time'
import { formatNiftySwapSupply } from '../helpers/market/format-niftyswap-supply'
import { getPriceWithoutFees } from '../helpers/market/get-price-without-fees'
import { authenticationState } from '../state/authentication-state'
import { MarketMode } from '../types/market'

interface TokenPriceFetcherArgs {
  tokenId: number
  mode?: MarketMode
  quantity?: number
}

export const tokenPriceFetcher =
  ({ mode, quantity, tokenId }: TokenPriceFetcherArgs) =>
  async () => {
    if (!mode) throw new Error('Tried to fetch prices without mode param')
    if (!quantity) throw new Error('Tried to fetch prices without quantity param')

    const contracts = AuthenticationClient.wallet?.contracts

    if (!contracts) throw new Error('Tried to fetch prices without loading contracts')

    const { prices } = await APIClient.metadata.getNiftyswapUnitPricesWithQuantities({
      contractAddress: contracts.NiftyswapExchange.address,
      chainID: String(ChainId.POLYGON),
      req: {
        swapType: mode,
        ids: [String(tokenId)],
        amounts: [String(quantity * 100)]
      },
      fresh: true
    })

    if (
      !!prices &&
      !!prices[String(tokenId)] &&
      !!prices[String(tokenId)].unitPrice
    ) {
      const supply = formatNiftySwapSupply(prices[String(tokenId)].availableAmount)

      if (!supply || supply < 1) return null

      const price = getPriceWithoutFees(
        BigNumber.from(prices[String(tokenId)].unitPrice).div(quantity),
        mode
      )
        .mul(quantity)
        .toNumber()

      return {
        price,
        supply
      }
    }

    return null
  }

export const useTokenPriceAndSupply = ({
  id,
  quantity,
  mode,
  isDisabled
}: UseTokenPriceAndSupplyArgs) => {
  const { userAddress } = useSnapshot(authenticationState)

  const isValid = useMemo(() => {
    const itemType = getItemType(id)
    if (!itemType) return false
    return VALID_MARKET_ITEM_TYPES.includes(itemType)
  }, [id])

  return useQuery({
    queryKey: getTokenPriceAndSupplyKey({ mode, quantity, id }),
    queryFn: tokenPriceFetcher({ mode, quantity, tokenId: id }),
    enabled: !!userAddress && isValid && !isDisabled,
    staleTime: ONE_MINUTE * 3,
    onSuccess: () => {
      if (quantity === 1) {
        const itemType = getItemType(id)
        if (!!itemType && VALID_MARKET_ITEM_TYPES.includes(itemType)) {
          GlobalQueryClient.invalidateQueries(
            getTokensSortedByPriceKey(mode, itemType)
          )
        }
      }
    }
  })
}
