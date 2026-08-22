import { useEffect, useState } from 'react'

import { useNextRewardsTime } from '~/shared/queries/useNextRewardsTime'

import { getTimeUntilString } from '../helpers/get-time-until-string'

export const useTimeUntilRewards = (enabled = true) => {
  const { data: nextRewardDate, isError } = useNextRewardsTime(enabled)
  const [timeUntilRewards, setTimeUntilRewards] = useState<string>()

  useEffect(() => {
    if (!enabled || !nextRewardDate) {
      setTimeUntilRewards(undefined)
      return
    }

    const update = () => {
      setTimeUntilRewards(
        getTimeUntilString({
          nextDate: nextRewardDate
        })
      )
    }
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [enabled, nextRewardDate])

  return {
    timeUntilRewards: enabled ? timeUntilRewards : undefined,
    rewardScheduleUnavailable: enabled && isError
  }
}
