import { useEffect, useRef, useState } from 'react'
import { useMount, useUnmount } from 'react-use'

import { getTimeUntilString } from '../helpers/get-time-until-string'

export const useTimeLeftSpecialOffer = (time: string) => {
  const intervalRef = useRef<number | null>(null)
  const timeEndDateRef = useRef<string | undefined>(time)

  const [timeLeftSpecialOffer, setTimeLeftSpecialOffer] = useState<
    string | undefined
  >(
    getTimeUntilString({
      nextDate: !!time ? time : undefined
    })
  )

  useEffect(() => {
    if (timeEndDateRef.current !== time) {
      timeEndDateRef.current = time
    }
  }, [time])

  useMount(() => {
    intervalRef.current = window.setInterval(() => {
      const time = getTimeUntilString({
        nextDate: timeEndDateRef.current,
        onEnd: () => {
          if (!!intervalRef.current) window.clearInterval(intervalRef.current)
        }
      })
      setTimeLeftSpecialOffer(time)
    }, 1000)
  })

  useUnmount(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
  })

  return timeLeftSpecialOffer
}
