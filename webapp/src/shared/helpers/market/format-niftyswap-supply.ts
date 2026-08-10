import { SKYWEAVER_ASSETS_BASE_UNIT } from '@opensky/shared/constants'

export const formatNiftySwapSupply = (_supply?: string) => {
  if (!_supply) return null

  return Math.floor(
    (Number(_supply) - (Number(_supply) % SKYWEAVER_ASSETS_BASE_UNIT)) /
      SKYWEAVER_ASSETS_BASE_UNIT
  )
}
