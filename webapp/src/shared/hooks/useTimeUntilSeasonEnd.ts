import { useEffect, useRef, useState } from 'react'
import { useMount, useUnmount } from 'react-use'

import { getTimeUntilString } from '../helpers/get-time-until-string'
import { useSeasonInfo } from '../queries/useSeasonInfo'

export const useTimeUntilSeasonEnd = () => {
  const { data: seasonInfo } = useSeasonInfo()
  const intervalRef = useRef<number | null>(null)
  const seasonEndDateRef = useRef<string | undefined>(seasonInfo?.nextSeasonStartTime)

  const [timeUntilSeasonEnd, setTimeUntilSeasonEnd] = useState<string | undefined>(
    getTimeUntilString({
      nextDate: !!seasonInfo?.nextSeasonStartTime
        ? seasonInfo.nextSeasonStartTime
        : undefined
    })
  )

  useEffect(() => {
    if (seasonEndDateRef.current !== seasonInfo?.nextSeasonStartTime) {
      seasonEndDateRef.current = seasonInfo?.nextSeasonStartTime
    }
  }, [seasonInfo?.nextSeasonStartTime])

  useMount(() => {
    intervalRef.current = window.setInterval(() => {
      const time = getTimeUntilString({
        nextDate: seasonEndDateRef.current,
        onEnd: () => {
          if (!!intervalRef.current) window.clearInterval(intervalRef.current)
        }
      })
      setTimeUntilSeasonEnd(time)
    }, 1000)
  })

  useUnmount(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
  })

  return timeUntilSeasonEnd
}
