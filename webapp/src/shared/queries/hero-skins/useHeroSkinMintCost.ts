/* eslint-disable valtio/state-snapshot-rule */
import { SwapType } from '@0xsequence/metadata'
import { ChainId } from '@0xsequence/network'
import { ItemType } from '@opensky/proto'
import { getGoldID, getLegacyHeroID } from '@opensky/shared/assetsIDs'
import { useQueries, useQuery } from '@tanstack/react-query'
import { BigNumber } from 'ethers'
import _fill from 'lodash-es/fill'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { APIClient, AuthenticationClient } from '~/shared/clients'
import { AllHeroSkinIds } from '~/shared/constants/hero-skins'
import { getHeroSkinMintPriceKey } from '~/shared/constants/react-query-keys'
import { THIRTY_SECONDS } from '~/shared/constants/time'
import { toOpenSkyAssetDecimalAmount } from '~/shared/helpers/market/to-opensky-asset-decimal-amount'
import { withSlippage } from '~/shared/helpers/market/with-slippage'
import { authenticationState } from '~/shared/state/authentication-state'
import { MarketMode, PriceAndSupplyWithId } from '~/shared/types/market'

import { useTokensSortedByPrice } from '../useTokensSortedByPrice'

export const getGoldCosts = async (
  golds: { [id: number]: number },
  type: MarketMode
) => {
  const contracts = AuthenticationClient.wallet?.contracts

  if (!contracts) return null

  const { prices: buyGoldCosts } =
    await APIClient.metadata.getNiftyswapUnitPricesWithQuantities({
      chainID: String(ChainId.POLYGON),
      contractAddress: contracts.NiftyswapExchange.address,
      req: {
        swapType: type,
        ids: Object.keys(golds)
          .map(getGoldID)
          .map((a) => a.toString()),
        amounts: Object.values(golds)
          .map(toOpenSkyAssetDecimalAmount)
          .map((amount) => String(amount))
      },
      fresh: true
    })

  const costs: { [key: string]: string } = {}

  // Include slippage amount in price
  Object.keys(buyGoldCosts).forEach((id) => {
    costs[id] = withSlippage(
      BigNumber.from(buyGoldCosts[id]?.unitPrice || 0),
      type
    ).toString()
  })

  return costs
}

export const CHEAP_GOLD_SHARD_SIZE = 20 // Buying 0.2 of each gold card
export const N_CHEAPEST_GOLDS = 50 // Number of cheapest cards to buy from

export const getCheapestGolds = (
  numGolds: number,
  cardsSortedByPrice: PriceAndSupplyWithId[] | undefined | null
) => {
  if (!cardsSortedByPrice) return cardsSortedByPrice

  // How many card pieces need to be bought
  const nShards = (numGolds * 100) / CHEAP_GOLD_SHARD_SIZE
  const cheapestGolds = cardsSortedByPrice.slice(0, N_CHEAPEST_GOLDS)

  // Sample gold cards until we have nGolds gold amount
  const nFullSet = Math.floor(nShards / N_CHEAPEST_GOLDS) // Number of full sets of the cheapests
  const nSample = nShards % N_CHEAPEST_GOLDS // Number of golds to sample from set

  // Create a mapping of id:amount for golds selected
  const goldsToBuy: { [id: number]: number } = {}

  cheapestGolds.forEach(
    (g) => (goldsToBuy[g.id] = (nFullSet * CHEAP_GOLD_SHARD_SIZE) / 100)
  )

  // Sample ids for remaining golds
  for (let i = 0; i < nSample; i++) {
    goldsToBuy[cheapestGolds[i].price] += CHEAP_GOLD_SHARD_SIZE / 100
  }

  // Return non-zeros token ids
  return Object.keys(goldsToBuy).reduce(
    function (filtered, key) {
      if (goldsToBuy[key] >= CHEAP_GOLD_SHARD_SIZE / 100)
        filtered[key] = goldsToBuy[key]
      return filtered
    },
    {} as typeof goldsToBuy
  )
}

export const heroSkinMintPriceFetcher =
  (
    tokenId: number | undefined,
    quantity: number,
    cardsSortedByPrice: PriceAndSupplyWithId[] | undefined | null
  ) =>
  async () => {
    if (!tokenId) return null

    const contracts = AuthenticationClient.wallet?.contracts

    if (!contracts) return null

    // Get USDC and # of golds needed to mint heroes
    const mintCosts = await contracts.LegacyHeroSale.getMintingCost(
      [getLegacyHeroID(tokenId)],
      [toOpenSkyAssetDecimalAmount(quantity)]
    )

    // Number of golds needed is the same. We remove decimals returned from contract
    const numGolds = mintCosts[0][0].div(100)

    const cheapestGolds = getCheapestGolds(numGolds.toNumber(), cardsSortedByPrice)

    if (!cheapestGolds) return

    const buyGoldCosts = await getGoldCosts(cheapestGolds, SwapType.BUY)

    if (!buyGoldCosts) return

    const buyGoldTotalCost = Object.values(buyGoldCosts)
      .map(BigNumber.from)
      .reduce((total, current) => total.add(current), BigNumber.from(0))

    const price = buyGoldTotalCost.add(mintCosts[1][0]).toNumber()

    return price
  }

export const useHeroSkinMintCost = (
  tokenId: number | undefined,
  quantity: number
) => {
  const { userAddress } = useSnapshot(authenticationState)

  const { data: cardsSortedByPrice } = useTokensSortedByPrice(
    SwapType.BUY,
    ItemType.SW_GOLD_CARDS,
    env.AUTH_MODE === 'google'
  )

  const cardsSortedByPriceAscending = useMemo(() => {
    if (!cardsSortedByPrice) return
    return [...cardsSortedByPrice].reverse()
  }, [cardsSortedByPrice])

  return useQuery(
    getHeroSkinMintPriceKey(tokenId, quantity),
    heroSkinMintPriceFetcher(tokenId, quantity, cardsSortedByPriceAscending),
    {
      enabled:
        env.AUTH_MODE !== 'google' &&
        !!userAddress &&
        !!cardsSortedByPrice &&
        !!tokenId,
      staleTime: THIRTY_SECONDS
    }
  )
}

export const useHeroSkinMintCosts = () => {
  const { userAddress } = useSnapshot(authenticationState)
  const { data: cardsSortedByPrice } = useTokensSortedByPrice(
    SwapType.BUY,
    ItemType.SW_GOLD_CARDS,
    env.AUTH_MODE === 'google'
  )

  const cardsSortedByPriceAscending = useMemo(() => {
    if (!cardsSortedByPrice) return
    return [...cardsSortedByPrice].reverse()
  }, [cardsSortedByPrice])

  const queries = useQueries({
    queries: AllHeroSkinIds.map((id) => ({
      queryKey: getHeroSkinMintPriceKey(id, 1),
      queryFn: heroSkinMintPriceFetcher(id, 1, cardsSortedByPriceAscending),
      enabled: env.AUTH_MODE !== 'google' && !!userAddress && !!cardsSortedByPrice,
      staleTime: THIRTY_SECONDS
    }))
  })

  const costs = useMemo(() => {
    if (!queries) return undefined
    const isFetching = queries.some((result) => result.data === undefined)
    if (isFetching) return undefined

    return queries.map((result, index) => {
      return { id: AllHeroSkinIds[index], price: result.data }
    })
  }, [queries])

  return { costs }
}
