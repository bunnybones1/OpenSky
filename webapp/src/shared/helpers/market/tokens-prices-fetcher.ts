import { ChainId } from '@0xsequence/network'
import { BigNumber } from 'ethers'

import { APIClient, AuthenticationClient } from '~/shared/clients'
import { MarketMode } from '~/shared/types/market'

import { isDefined } from '../is-defined-is-not-null'
import { formatNiftySwapSupply } from './format-niftyswap-supply'
import { getPriceWithoutFees } from './get-price-without-fees'

interface TokensPricesFetcherArgs {
  tokenIds: number[]
  mode?: MarketMode
  quantities?: number[]
}

export const tokensPricesFetcher =
  ({ mode, quantities, tokenIds }: TokensPricesFetcherArgs) =>
  async () => {
    const contracts = AuthenticationClient.wallet?.contracts

    if (!contracts) throw new Error('Tried to fetch prices without loaded contracts')
    if (!mode) throw new Error('Tried to fetch prices without mode param')
    if (!quantities) throw new Error('Tried to fetch prices without quantity param')

    const { prices } = await APIClient.metadata.getNiftyswapUnitPricesWithQuantities({
      contractAddress: contracts.NiftyswapExchange.address,
      chainID: String(ChainId.POLYGON),
      req: {
        swapType: mode,
        ids: tokenIds.map((id) => String(id)),
        amounts: quantities.map((quantity) => String(quantity * 100))
      },
      fresh: true
    })

    return Object.keys(prices)
      .map((id) => {
        if (!prices[id]) return

        const price = prices[id].unitPrice
        const quantity = prices[id].unitAmount

        const supply = formatNiftySwapSupply(prices[id].availableAmount)

        if (!supply || supply < 1) return

        if (!price || !quantity) return

        const priceWithoutFee = getPriceWithoutFees(
          BigNumber.from(price).div(quantity),
          mode
        )
          .mul(quantity)
          .toNumber()

        return {
          tokenId: Number(id),
          price: priceWithoutFee,
          quantity,
          supply
        }
      })
      .filter(isDefined)
  }
