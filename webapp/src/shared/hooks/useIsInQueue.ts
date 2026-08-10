/* eslint-disable valtio/state-snapshot-rule */
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { MatchMakerStatus } from '~/clients/MatchMakerClient/shared/types'

import { playState } from '../state/play-state'

const IN_QUEUE_STATUSES: MatchMakerStatus[] = [
  MatchMakerStatus.SEARCHING,
  MatchMakerStatus.JOINING_QUEUE,
  MatchMakerStatus.MATCH_FOUND,
  MatchMakerStatus.OPPONENT_DECLINED,
  MatchMakerStatus.WAITING_OPPONENT,
  MatchMakerStatus.IN_PROGRESS_MATCH
]

export const useIsInQueue = () => {
  const { matchMakerStatus } = useSnapshot(playState)

  const isInQueue = useMemo(() => {
    return !!matchMakerStatus && IN_QUEUE_STATUSES.includes(matchMakerStatus)
  }, [matchMakerStatus])

  return { isInQueue }
}
