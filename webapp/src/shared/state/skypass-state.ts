import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '../constants/routes'

export interface RewardCardsType {
  rewardId: number
  cardIds: number[]
}

export interface SelectedLevelAndReward {
  level: number
  reward?: number
}

export interface SkypassSelectorState {
  selectedLevelAndReward?: SelectedLevelAndReward
  claimedRewards?: number[]
  claimedRewardCards?: RewardCardsType[]
  isSkypassIAPInProgress?: boolean
  isSkypassCheckoutActive?: boolean
  loadingClaimingReward?: number
  paymentHasCompleted?: boolean
}

const DEFAULT_SKYPASS_STATE: SkypassSelectorState = {
  selectedLevelAndReward: undefined,
  claimedRewards: [NaN],
  claimedRewardCards: undefined,
  isSkypassCheckoutActive: false,
  loadingClaimingReward: undefined,
  paymentHasCompleted: undefined
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.SKY_PASS.directPath,
    window.location.pathname
  )

  // If the first load is on the skypass page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const levelParam = params.get('level')
    const rewardParam = params.get('reward')

    if (!!levelParam) {
      const selectedLevelAndReward: SkypassSelectorState['selectedLevelAndReward'] = {
        level: Number(levelParam)
      }
      if (!!rewardParam) {
        selectedLevelAndReward.reward = Number(rewardParam)
      }
      return {
        ...DEFAULT_SKYPASS_STATE,
        selectedLevelAndReward
      }
    } else {
      return DEFAULT_SKYPASS_STATE
    }
  } else {
    return DEFAULT_SKYPASS_STATE
  }
}

export const skypassSelectorState = proxy<SkypassSelectorState>(instantiateState())

export const updateSkypassSelectorState = <T extends keyof SkypassSelectorState>(
  key: T,
  value: SkypassSelectorState[T]
) => {
  skypassSelectorState[key] = value
}
