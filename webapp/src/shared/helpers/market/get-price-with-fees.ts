import { SwapType } from '@0xsequence/metadata'

import {
  FRONTEND_FEE_PERCENTAGE,
  LP_FEE_PERCENTAGE,
  ROYALTY_FEE_PERCENTAGE,
  SLIPPAGE_PERCENTAGE
} from '~/shared/constants/market'
import { MarketMode } from '~/shared/types/market'

const getRoyaltyFees = (amount: number) => {
  return (amount * ROYALTY_FEE_PERCENTAGE * 10) / 1000
}

const getFrontendFees = (amount: number) => {
  return (amount * FRONTEND_FEE_PERCENTAGE * 100) / 10000
}

const getSlippageBuffer = (amount: number) => (amount * SLIPPAGE_PERCENTAGE) / 100

export const getPriceWithFees = (price: number, mode: MarketMode): number => {
  const lpFees = (price * LP_FEE_PERCENTAGE * 10) / 1000

  let priceWithFees = price

  if (mode === SwapType.BUY) {
    const royaltyFees = getRoyaltyFees(price + lpFees)

    const fees = lpFees + royaltyFees + getFrontendFees(price + lpFees + royaltyFees)

    priceWithFees = price + fees
  } else {
    const royaltyFees = getRoyaltyFees(price - lpFees)

    const fees = lpFees + royaltyFees + getFrontendFees(price - lpFees - royaltyFees)

    priceWithFees = price - fees
  }

  return priceWithFees + getSlippageBuffer(priceWithFees)
}
