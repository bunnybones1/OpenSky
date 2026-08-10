import { SwapType } from '@0xsequence/metadata'
import { ethers } from 'ethers'

import { SLIPPAGE_PERCENTAGE } from '~/shared/constants/market'
import { MarketMode } from '~/shared/types/market'

export const calcSlippage = (price: ethers.BigNumber) =>
  price.mul(SLIPPAGE_PERCENTAGE).div(100)

export const withSlippage = (price: ethers.BigNumber, type: MarketMode) => {
  const slippage = calcSlippage(price)

  if (type === SwapType.BUY) {
    return price.add(slippage)
  }

  if (type === SwapType.SELL) {
    return price.sub(slippage)
  }

  throw new Error('invalid order type to add slippage')
}
