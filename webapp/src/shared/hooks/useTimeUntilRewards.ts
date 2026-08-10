import { useEffect, useRef, useState } from 'react'
import { useMount, useUnmount } from 'react-use'

import { useNextRewardsTime } from '~/shared/queries/useNextRewardsTime'

import { getTimeUntilString } from '../helpers/get-time-until-string'

export const useTimeUntilRewards = () => {
  const { data: nextRewardDate } = useNextRewardsTime()
  const intervalRef = useRef<number | null>(null)
  const nextDateRef = useRef<string | undefined>(nextRewardDate)

  const [timeUntilRewardsString, setTimeUntilRewardsString] = useState<
    string | undefined
  >(
    getTimeUntilString({
      nextDate: !!nextRewardDate ? nextRewardDate : undefined
    })
  )

  useEffect(() => {
    if (nextDateRef.current !== nextRewardDate) {
      nextDateRef.current = nextRewardDate
    }
  }, [nextRewardDate])

  useMount(() => {
    intervalRef.current = window.setInterval(() => {
      const time = getTimeUntilString({
        nextDate: nextDateRef.current,
        onEnd: () => {
          if (!!intervalRef.current) window.clearInterval(intervalRef.current)
        }
      })
      setTimeUntilRewardsString(time)
    }, 1000)
  })

  useUnmount(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
  })

  return timeUntilRewardsString
}
