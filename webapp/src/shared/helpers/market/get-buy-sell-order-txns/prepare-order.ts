import { ChainId } from '@0xsequence/network'
import { BigNumber, constants } from 'ethers'

import { AuthenticationClient } from '~/shared/clients'
import { APIClient } from '~/shared/clients'
import { MarketMode } from '~/shared/types/market'

import { withSlippage } from '../with-slippage'

interface PrepareOrderArgs {
  ids: string[]
  amounts: string[]
  mode: MarketMode
  address: string
  skipSlippage?: boolean
  skipAllowanceTxn?: boolean
}

export const prepareOrder = async ({
  ids,
  amounts,
  mode,
  address,
  skipSlippage,
  skipAllowanceTxn
}: PrepareOrderArgs) => {
  const contracts = AuthenticationClient.wallet?.contracts

  if (!contracts) return

  const { prices } = await APIClient.metadata.getNiftyswapUnitPricesWithQuantities({
    contractAddress: contracts.NiftyswapExchange.address,
    chainID: String(ChainId.POLYGON),
    req: {
      swapType: mode,
      ids,
      amounts
    },
    fresh: true
  })

  const priceMap = new Map(
    ids.map((id) => [id, BigNumber.from(prices[id]?.unitPrice || 0)])
  )

  if (!priceMap.size) {
    throw new Error('invalid total cost for this order')
  }

  // Calculate total cost before slippage and such are applied
  let exactTotalCost = BigNumber.from(0)

  priceMap.forEach((cost) => {
    exactTotalCost = exactTotalCost.add(BigNumber.from(cost))
  })

  const totalCost = skipSlippage
    ? exactTotalCost
    : withSlippage(BigNumber.from(exactTotalCost), mode)

  const currentAllowance = await contracts.USDC.allowance(
    address,
    contracts.NiftyswapExchange.address
  )

  const allowanceTxn =
    skipAllowanceTxn || !currentAllowance.lt(totalCost)
      ? undefined
      : {
          // infinite approval
          to: contracts.USDC.address,
          data: contracts.USDC.interface.encodeFunctionData('approve', [
            contracts.NiftyswapExchange.address,
            constants.MaxUint256
          ]),
          revertOnError: true
        }

  return { allowanceTxn, totalCost }
}
