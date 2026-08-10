import { memo, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { Text } from '~/shared/components/Text'
import { padNumber } from '~/shared/helpers/pad-number'
import { playState } from '~/shared/state/play-state'

import { GreenSatus } from '../../shared/constants'
import { useMillisecondsElapsed } from '../../shared/useMillisecondsElapsed'

const formatCountDown = (millisecondsElapsed: number) => {
  const seconds = millisecondsElapsed / 1000

  return `${padNumber(Math.floor(seconds / 3600))} : ${padNumber(
    Math.floor(seconds / 60) % 24
  )} : ${padNumber(Math.floor(seconds % 60))}`
}

export const MatchMakerTimerCountUp = memo(() => {
  const { matchMakerStatus } = useSnapshot(playState)
  const { millisecondsElapsed } = useMillisecondsElapsed()

  const timeString = useMemo(
    () => formatCountDown(millisecondsElapsed),
    [millisecondsElapsed]
  )

  const isGreen = !!matchMakerStatus && GreenSatus.includes(matchMakerStatus)

  return (
    <Text fontWeight="400" fontSize="32px" color={isGreen ? 'forest7' : 'cold7'}>
      {timeString}
    </Text>
  )
})

MatchMakerTimerCountUp.displayName = 'MatchMakerTimerCountUp'
