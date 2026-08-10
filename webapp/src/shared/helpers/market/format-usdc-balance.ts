import { BigNumber, BigNumberish } from 'ethers'

import { captureError } from '~/shared/helpers/sentry'

// format 6 decimal balances to 2 decimal precision
export const formatUSDCBalance = (_value: BigNumberish): number => {
  try {
    const value = BigNumber.from(_value)

    // 4 decimal base
    const base = BigNumber.from(10).pow(4)

    if (value.lt(base)) {
      return 0
    }

    return value.div(base).toNumber() / 100
  } catch (error) {
    captureError(error, 'Format USDC Balance Failed')
    // console.error(error, { _value })
    return 0
  }
}
