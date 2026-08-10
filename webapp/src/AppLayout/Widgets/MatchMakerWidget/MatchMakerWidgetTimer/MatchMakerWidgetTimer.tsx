import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/shared/components/Text'
import { playState } from '~/shared/state/play-state'

import { OrangeStatus } from '../shared/constants'
import { MatchMakerTimerCountDown } from './components/MatchMakerTimerCountDown'
import { MatchMakerTimerCountUp } from './components/MatchMakerTimerCountUp'

export const MatchMakerWidgetTimer = memo(() => {
  const { matchMakerStatus, matchMakerCountDown } = useSnapshot(playState)

  const { t } = useTranslation()

  if (!!matchMakerStatus && OrangeStatus.includes(matchMakerStatus)) {
    return (
      <Text fontWeight="400" fontSize="32px" color="warm6">
        {t('playPage.matchMaker.Oops!')}
      </Text>
    )
  }

  if (!!matchMakerCountDown) {
    return <MatchMakerTimerCountDown />
  }

  return <MatchMakerTimerCountUp />
})

MatchMakerWidgetTimer.displayName = 'MatchMakerWidgetTimer'
