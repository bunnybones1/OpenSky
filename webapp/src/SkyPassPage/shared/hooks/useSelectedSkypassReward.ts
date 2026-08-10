import { SkypassReward } from '@opensky/proto'
import { useMemo } from 'react'

import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import { useSelector } from '~/shared/redux/index'
import { skyPassParamsSelector } from '~/shared/redux/router/selectors'

export const useSelectedSkypassReward = () => {
  const params = useSelector(skyPassParamsSelector)
  const { data: skypassInfo } = useSkyPassInfo()

  return useMemo(() => {
    if (!skypassInfo || params.level === undefined) return

    const level = skypassInfo.levels.find((_level) => _level.level === params.level)
    let reward: SkypassReward | undefined

    if (!!level) {
      if (!!params.reward) {
        reward = level.rewards[params.reward]
      }
      if (!reward) reward = level.rewards[0]
    }
    return reward
  }, [params, skypassInfo])
}
