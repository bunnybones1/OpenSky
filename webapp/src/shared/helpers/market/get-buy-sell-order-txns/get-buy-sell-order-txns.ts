import { SwapType } from '@0xsequence/metadata'
import { sequence } from '0xsequence'
import { BigNumber, constants } from 'ethers'

import env from '~/env'
import { AuthenticationClient } from '~/shared/clients'
import { FRONTEND_FEE_PERCENTAGE } from '~/shared/constants/market'
import { CartItem, MarketMode } from '~/shared/types/market'

import { toOpenSkyAssetDecimalAmount } from '../to-opensky-asset-decimal-amount'
import { getSellTokenData20 } from './get-sell-token-data'
import { prepareOrder } from './prepare-order'

const getExtraFee = (totalCost: BigNumber) =>
  totalCost.mul(FRONTEND_FEE_PERCENTAGE * 100).div(10000)

const getOrderDeadline = () => Math.floor(Date.now() / 1000) + 900 // now + 15 min

interface GetBuySellOrderTxnsArgs {
  items: CartItem[]
  mode: MarketMode
}

export const getBuySellOrderTxns = async ({
  items,
  mode
}: GetBuySellOrderTxnsArgs) => {
  const address = AuthenticationClient.wallet?.address

  const contracts = AuthenticationClient.wallet?.contracts

  if (!address || !contracts) return

  const txns: sequence.transactions.Transaction[] = []

  // niftyswap requires us to sort order by ascending asset ids
  const sortedItems = items.sort((a, b) => a.tokenId - b.tokenId)

  const ids = sortedItems.map(({ tokenId }) => tokenId.toString())
  const amounts = sortedItems.map(({ amount }) =>
    toOpenSkyAssetDecimalAmount(amount).toString()
  )

  const orderInfo = await prepareOrder({
    ids,
    amounts,
    mode,
    address
  })

  if (!orderInfo) return

  if (orderInfo.allowanceTxn) {
    txns.push(orderInfo.allowanceTxn)
  }

  const { totalCost } = orderInfo

  if (mode === SwapType.BUY) {
    // Create buy order
    const maxCost = totalCost.add(getExtraFee(totalCost))

    txns.push({
      to: contracts.NiftyswapExchange.address,
      data: contracts.NiftyswapExchange.interface.encodeFunctionData('buyTokens', [
        ids,
        amounts,
        maxCost,
        getOrderDeadline(),
        address,
        [env.SW_TREASURY_CONTRACT_ADDRESS],
        [getExtraFee(totalCost)]
      ]),
      revertOnError: true
    })
  } else {
    // Create and append sell transaction
    const sellTokenData = getSellTokenData20(
      constants.AddressZero,
      totalCost.sub(getExtraFee(totalCost)), // min receive
      getOrderDeadline(),
      [env.SW_TREASURY_CONTRACT_ADDRESS],
      [getExtraFee(totalCost)]
    )

    txns.push({
      to: contracts.OpenSkyAssets.address,
      data: contracts.OpenSkyAssets.interface.encodeFunctionData(
        'safeBatchTransferFrom',
        [address, contracts.NiftyswapExchange.address, ids, amounts, sellTokenData]
      ),
      revertOnError: true
    })
  }

  return txns
}
