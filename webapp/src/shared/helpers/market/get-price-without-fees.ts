import { SwapType } from '@0xsequence/metadata'
import { BigNumber } from 'ethers'

import { LP_FEE_PERCENTAGE, ROYALTY_FEE_PERCENTAGE } from '~/shared/constants/market'
import { MarketMode } from '~/shared/types/market'

// Removing the fees from the unit price returned
// We have to first remove the LP FEE and then the royalty fee, in that order, like on-chain
// we make everything an order of magnitude bigger than *100 so we can support fees with up to one decimal place.
export const getPriceWithoutFees = (price: BigNumber, mode: MarketMode) => {
  if (mode === SwapType.BUY) {
    return price
      .mul(1000)
      .div(1000 + LP_FEE_PERCENTAGE * 10)
      .mul(1000)
      .div(1000 + ROYALTY_FEE_PERCENTAGE * 10)
  }

  return price
    .mul(1000)
    .div(1000 - LP_FEE_PERCENTAGE * 10)
    .mul(1000)
    .div(1000 - ROYALTY_FEE_PERCENTAGE * 10)
}
