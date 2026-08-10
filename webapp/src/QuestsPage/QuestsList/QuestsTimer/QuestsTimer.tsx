import { QuestPeriodicity } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Skeleton from 'react-loading-skeleton'

import { GlobalQueryClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { getQuestsListsKey, QUESTS_TIMER } from '~/shared/constants/react-query-keys'
import { getTimeUntilString } from '~/shared/helpers/get-time-until-string'
import { authenticationState } from '~/shared/state/authentication-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { THEME_COLORS } from '~/shared/style/Theme'

import { useQuestTimers } from './queries/useQuestTimers'
import { QuestTimerStyle } from './QuestsTimer.css'

const FontSize = { base: '12px', tabletWide: '16px' } as const

interface QuestsTimerProps {
  periodicity: QuestPeriodicity
}

export const QuestsTimer = memo(({ periodicity }: QuestsTimerProps) => {
  const { data: timers } = useQuestTimers()
  const intervalRef = useRef<number | null>(null)
  const resetDateRef = useRef<string | undefined>()

  const [timeUntilReset, setTimeUntilReset] = useState<string | undefined>()

  useLayoutEffect(() => {
    let resetDate: string | undefined

    if (periodicity === QuestPeriodicity.DAILY) resetDate = timers?.daily
    if (periodicity === QuestPeriodicity.WEEKLY) resetDate = timers?.weekly
    if (periodicity === QuestPeriodicity.SEASONAL) resetDate = timers?.seasonal

    if (!!resetDate && resetDateRef.current !== resetDate) {
      resetDateRef.current = resetDate
    }
  }, [periodicity, timers])

  useEffect(() => {
    const mountTime = getTimeUntilString({
      nextDate: resetDateRef.current,
      onEnd: () => {
        if (!!intervalRef.current) window.clearInterval(intervalRef.current)
      }
    })

    setTimeUntilReset(mountTime)

    intervalRef.current = window.setInterval(() => {
      const time = getTimeUntilString({
        nextDate: resetDateRef.current,
        onEnd: () => {
          if (!!intervalRef.current) window.clearInterval(intervalRef.current)

          if (!!authenticationState.userAddress) {
            GlobalQueryClient.invalidateQueries(
              getQuestsListsKey(authenticationState.userAddress)
            )
            GlobalQueryClient.invalidateQueries(QUESTS_TIMER)
          }
        }
      })
      setTimeUntilReset(time)
    }, 1000)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          zIndex: 3,
          padding: '8px',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: { base: 'flex-end', tabletWide: 'center' },
          flexDirection: { base: 'row', tabletWide: 'column' },
          backgroundColor: 'purple1'
        }),
        QuestTimerStyle
      )}
      data-id="resets_in"
    >
      {!timeUntilReset ? (
        <Skeleton
          baseColor={THEME_COLORS.purple4}
          highlightColor={THEME_COLORS.purple5}
          height="15px"
          width="52px"
        />
      ) : (
        <Text color="purple8" fontWeight="600" fontSize={FontSize}>
          RESETS IN
        </Text>
      )}
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        {!timeUntilReset ? (
          <Skeleton
            baseColor={THEME_COLORS.purple4}
            highlightColor={THEME_COLORS.purple5}
            height="15px"
            width="64px"
          />
        ) : (
          <>
            <Icon height={FontSize} type="clock" color="warm6" marginRight="4px" />
            <Text color="warm6" fontSize={FontSize} marginRight="4px">
              {timeUntilReset}
            </Text>
          </>
        )}
      </div>
    </div>
  )
})

QuestsTimer.displayName = 'QuestsTimer'
