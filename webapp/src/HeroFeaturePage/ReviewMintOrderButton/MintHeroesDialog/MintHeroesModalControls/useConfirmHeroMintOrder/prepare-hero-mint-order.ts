import { BigNumber, constants } from 'ethers'

import { AuthenticationClient } from '~/shared/clients'
import { heroSkinMintPriceFetcher } from '~/shared/queries/hero-skins/useHeroSkinMintCost'
import { PriceAndSupplyWithId } from '~/shared/types/market'

interface PrepareOrderArgs {
  ids: number[]
  amounts: number[]
  cardPrices: PriceAndSupplyWithId[]
  address: string
}

export const prepareHeroMintOrder = async ({
  ids,
  amounts,
  cardPrices,
  address
}: PrepareOrderArgs) => {
  const costs = await Promise.all(
    ids.map((id, index) => heroSkinMintPriceFetcher(id, amounts[index], cardPrices)())
  )

  let totalCost = BigNumber.from(0)

  costs.forEach((cost) => {
    if (!!cost) {
      totalCost = totalCost.add(BigNumber.from(cost))
    }
  })

  const contracts = AuthenticationClient.wallet?.contracts

  if (!contracts) return { totalCost, allowanceTxn: undefined }

  const currentAllowance = await contracts.USDC.allowance(
    address,
    contracts.LegacyHeroSale.address
  )

  const allowanceTxn = !currentAllowance.lt(totalCost)
    ? undefined
    : {
        // infinite approval
        to: contracts.USDC.address,
        data: contracts.USDC.interface.encodeFunctionData('approve', [
          contracts.LegacyHeroSale.address,
          constants.MaxUint256
        ]),
        revertOnError: true
      }

  return { allowanceTxn, totalCost }
}
