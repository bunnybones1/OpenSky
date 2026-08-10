/* eslint-disable valtio/state-snapshot-rule */
import { memo, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { Text } from '~/shared/components/Text'
import { padNumber } from '~/shared/helpers/pad-number'
import { playState } from '~/shared/state/play-state'

import { GreenSatus } from '../../shared/constants'
import { useMillisecondsElapsed } from '../../shared/useMillisecondsElapsed'

export const MatchMakerTimerCountDown = memo(() => {
  const { matchMakerCountDown, matchMakerStatus } = useSnapshot(playState)
  const { millisecondsElapsed } = useMillisecondsElapsed()

  const timeString = useMemo(() => {
    if (!matchMakerCountDown) return '00 : 00 : 00'

    const countDownSeconds = matchMakerCountDown / 1000
    const seconds = millisecondsElapsed / 1000
    const secondsToGo = countDownSeconds - seconds

    if (secondsToGo < 0) return '00 : 00 : 00'

    return `${padNumber(Math.floor(secondsToGo / 3600))} : ${padNumber(
      Math.floor(secondsToGo / 60) % 24
    )} : ${padNumber(Math.floor(secondsToGo % 60))}`
  }, [matchMakerCountDown, millisecondsElapsed])

  const isGreen = !!matchMakerStatus && GreenSatus.includes(matchMakerStatus)

  return (
    <Text fontWeight="400" fontSize="32px" color={isGreen ? 'forest7' : 'cold7'}>
      {timeString}
    </Text>
  )
})

MatchMakerTimerCountDown.displayName = 'MatchMakerTimerCountDown'
