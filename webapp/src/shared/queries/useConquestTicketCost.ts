import { SwapType } from '@0xsequence/metadata'
import { ChainId } from '@0xsequence/network'
import { ItemType } from '@opensky/proto'
import { getSilverID } from '@opensky/shared/assetsIDs'
import { USDC_BASE_UNIT } from '@opensky/shared/constants'
import { useQuery } from '@tanstack/react-query'
import { BigNumber } from 'ethers'
import { useMemo } from 'react'

import { AuthenticationClient, GlobalQueryClient } from '~/shared/clients'
import { APIClient } from '~/shared/clients'
import { getConquestTicketUSDCPriceKey } from '~/shared/constants/react-query-keys'
import { THIRTY_SECONDS } from '~/shared/constants/time'

import { CONQUEST_TICKET_UNIT_PRICE } from '../constants/market'
import { toOpenSkyAssetDecimalAmount } from '../helpers/market/to-opensky-asset-decimal-amount'
import { withSlippage } from '../helpers/market/with-slippage'
import { captureError } from '../helpers/sentry'
import { PriceAndSupplyWithId } from '../types/market'
import { useTokensSortedByPrice } from './useTokensSortedByPrice'

export const CHEAP_SILVER_SHARD_SIZE = 100 // Buying 1 of each silver card
export const N_CHEAPEST_SILVER = 25 // Number of cheaper silvers to buy from
export const TICKET_COST_FETCH_DEADLINE = 30000 // 30 seconds

const SILVER_MAX_PRICE = CONQUEST_TICKET_UNIT_PRICE * USDC_BASE_UNIT

// OLD STUFF ABOVE
export const getSilverCosts = async (silvers: { [id: number]: number }) => {
  const contracts = AuthenticationClient.wallet?.contracts

  if (!contracts) return null

  const { prices: buySilverCosts } =
    await APIClient.metadata.getNiftyswapUnitPricesWithQuantities({
      chainID: String(ChainId.POLYGON),
      contractAddress: contracts.NiftyswapExchange.address,
      req: {
        swapType: SwapType.BUY,
        ids: Object.keys(silvers)
          .map(getSilverID)
          .map((a) => a.toString()),
        amounts: Object.values(silvers)
          .map(toOpenSkyAssetDecimalAmount)
          .map((amount) => String(amount))
      },
      fresh: true
    })

  const costs: { [key: string]: string } = {}

  // Include slippage amount in price
  Object.keys(buySilverCosts).forEach((id) => {
    costs[id] = withSlippage(
      BigNumber.from(buySilverCosts[id]?.unitPrice || 0),
      SwapType.BUY
    ).toString()
  })

  return costs
}

export const getCheapestSilvers = (
  numSilvers: number,
  cardsSortedByPrice: PriceAndSupplyWithId[] | undefined | null
) => {
  if (!cardsSortedByPrice) return cardsSortedByPrice

  // How many card pieces need to be bought
  const nShards = (numSilvers * 100) / CHEAP_SILVER_SHARD_SIZE
  const cheapestSilvers = cardsSortedByPrice.slice(0, N_CHEAPEST_SILVER)

  // Sample silver cards until we have nSilvers silver amount
  const nFullSet = Math.floor(nShards / N_CHEAPEST_SILVER) // Number of full sets of the cheapests
  const nSample = nShards % N_CHEAPEST_SILVER // Number of silvers to sample from set

  // Create a mapping of id:amount for silvers selected
  const silversToBuy: { [id: number]: number } = {}

  cheapestSilvers.forEach(
    (g) => (silversToBuy[g.id] = (nFullSet * CHEAP_SILVER_SHARD_SIZE) / 100)
  )

  // Sample ids for remaining silvers
  for (let i = 0; i < nSample; i++) {
    silversToBuy[cheapestSilvers[i].id] += CHEAP_SILVER_SHARD_SIZE / 100
  }

  // Return non-zeros token ids
  return Object.keys(silversToBuy).reduce(
    function (filtered, key) {
      if (silversToBuy[key] >= CHEAP_SILVER_SHARD_SIZE / 100)
        filtered[key] = silversToBuy[key]
      return filtered
    },
    {} as typeof silversToBuy
  )
}

export const silverCardsMintPriceFetcher =
  (
    quantity: number,
    cardsSortedByPrice: PriceAndSupplyWithId[] | undefined | null,
    unitPrice: number
  ) =>
  async () => {
    // Get USDC and # of silvers needed to mint heroes
    const mintCostUSDC = BigNumber.from(unitPrice * quantity * USDC_BASE_UNIT)

    // Use USDC price as default, in case can't fetch silver prices
    let price = mintCostUSDC.toString()

    try {
      // Get list of cheapest silvers
      const cheapestSilvers = getCheapestSilvers(quantity, cardsSortedByPrice)
      if (!cheapestSilvers) {
        throw new Error('Failed to get cheapest silvers')
      }

      // Get full cost for buy order
      const buySilverCost = await getSilverCosts(cheapestSilvers)

      if (!buySilverCost) return null

      const buySilverTotalCost = Object.values(buySilverCost)
        .map(BigNumber.from)
        .reduce((total, current) => total.add(current), BigNumber.from(0))

      // Return silver price if cheapest then base USDC cost of tickets
      price =
        buySilverTotalCost && buySilverTotalCost.lte(mintCostUSDC)
          ? buySilverTotalCost.toString()
          : mintCostUSDC.toString()
    } catch (e) {
      captureError(
        e,
        'Failed to get silver card price for conquest tickets',
        false,
        true
      )
    }

    return Number(price)
  }

export const useConquestTicketCost = (quantity: number) => {
  const { data: cardSortedByPrice, isLoading } = useTokensSortedByPrice(
    SwapType.BUY,
    ItemType.SW_SILVER_CARDS
  )

  const ascendingSortedCardPrices = useMemo(() => {
    if (!cardSortedByPrice) return
    return cardSortedByPrice
      .filter((priceAndSupply) => priceAndSupply.price <= SILVER_MAX_PRICE)
      .reverse()
  }, [cardSortedByPrice])

  return useQuery(
    getConquestTicketUSDCPriceKey(quantity),
    silverCardsMintPriceFetcher(
      quantity,
      ascendingSortedCardPrices,
      CONQUEST_TICKET_UNIT_PRICE
    ),
    {
      enabled: !isLoading,
      staleTime: THIRTY_SECONDS / 3,
      refetchInterval: THIRTY_SECONDS / 3
    }
  )
}

export const getConquestTicketCost = (quantity: number) => {
  return GlobalQueryClient.getQueryData<number | undefined>(
    getConquestTicketUSDCPriceKey(quantity)
  )
}
