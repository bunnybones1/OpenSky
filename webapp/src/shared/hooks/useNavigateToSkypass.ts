/* eslint-disable valtio/state-snapshot-rule */
import { findLast } from 'lodash-es'
import { useCallback, useMemo } from 'react'
import { createSearchParams } from 'react-router-dom'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ROUTES_CONFIG } from '../constants/routes'
import { useSkyPassInfo } from '../queries/useSkyPassInfo'
import { useDispatch } from '../redux/index'
import {
  SelectedLevelAndReward,
  skypassSelectorState,
  updateSkypassSelectorState
} from '../state/skypass-state'

export const useNavigateToSkyPass = () => {
  const { selectedLevelAndReward } = useSnapshot(skypassSelectorState)
  const { data: skyPassInfo } = useSkyPassInfo()
  const dispatch = useDispatch()

  const skyPassTo = useMemo(() => {
    const params: Record<string, string | string[]> = {}
    if (!!selectedLevelAndReward) {
      params.level = String(selectedLevelAndReward.level)
      params.reward = String(selectedLevelAndReward.reward || 0)
    } else {
      const lastClaimable = findLast(skyPassInfo?.levels, (level) => {
        const hasClaimable = level.rewards.some(
          (reward) => reward.claimable && !reward.claimed
        )
        return level.earned && !!hasClaimable
      })

      if (!!lastClaimable) {
        params.level = String(lastClaimable.level)

        const reward = lastClaimable.rewards.findIndex(
          (reward) => !!reward.claimable && !reward.claimed
        )

        params.reward = String(reward !== -1 ? reward : 0)
      } else {
        const nextToEarn = findLast(skyPassInfo?.levels, (level) => {
          return level.earned
        })?.level

        params.level = String(!!nextToEarn ? nextToEarn + 1 : 0)
        params.reward = '0'
      }
    }

    return `${ROUTES_CONFIG.routes.SKY_PASS.directPath}?${createSearchParams(params)}`
  }, [selectedLevelAndReward, skyPassInfo?.levels])

  const navigateToSkypass = useCallback(() => {
    dispatch(push(skyPassTo))
  }, [dispatch, skyPassTo])

  const navigateToSkypassReward = useCallback(
    (rewardToSelect: SelectedLevelAndReward) => {
      updateSkypassSelectorState('selectedLevelAndReward', rewardToSelect)
      dispatch(
        push(
          `${ROUTES_CONFIG.routes.SKY_PASS.directPath}?${createSearchParams({
            level: String(rewardToSelect.level),
            reward: !!rewardToSelect.reward ? String(rewardToSelect.reward) : '0'
          })}`
        )
      )
    },
    [dispatch]
  )

  return {
    skyPassTo,
    navigateToSkypass,
    navigateToSkypassReward
  }
}
