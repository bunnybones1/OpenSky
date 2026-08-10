import { SKYWEAVER_ASSETS_BASE_UNIT } from '@opensky/shared/constants'
import { BigNumber, BigNumberish } from 'ethers'

export const toOpenSkyAssetDecimalAmount = (val: BigNumberish): BigNumber =>
  typeof val === 'number'
    ? BigNumber.from(val * SKYWEAVER_ASSETS_BASE_UNIT)
    : BigNumber.from(val).mul(SKYWEAVER_ASSETS_BASE_UNIT)
