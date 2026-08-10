import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { MatchMakerStatus } from '~/clients/MatchMakerClient/shared/types'
import { getInProgressMatchKey } from '~/shared/constants/react-query-keys'
import { useInProgressMatch } from '~/shared/queries/play/useInProgressMatch'
import { authenticationState } from '~/shared/state/authentication-state'
import { updatePlayState } from '~/shared/state/play-state'

export const useHandleInProgressMatch = () => {
  const { data: inProgressMatchInfo } = useInProgressMatch()
  const timeOutRef = useRef<number | null>(null)
  const queryClient = useQueryClient()
  const { userAddress } = useSnapshot(authenticationState)

  useLayoutEffect(() => {
    if (!!inProgressMatchInfo) {
      updatePlayState('matchMakerStatus', inProgressMatchInfo.status)
      updatePlayState(
        'matchMakerCountDown',
        inProgressMatchInfo.disconnectTimeout * 1000
      )

      if (!timeOutRef.current) {
        timeOutRef.current = window.setTimeout(
          () => {
            updatePlayState('matchMakerStatus', MatchMakerStatus.TIMED_OUT)
            updatePlayState('matchMakerErrorReason', undefined)
            updatePlayState('matchMakerCountDown', undefined)
            if (!!userAddress) {
              queryClient.invalidateQueries(getInProgressMatchKey(userAddress))
            }
          },
          (inProgressMatchInfo.disconnectTimeout - 1) * 1000
        )
      }
    }
  }, [userAddress, inProgressMatchInfo, queryClient])

  useEffect(() => {
    return () => {
      if (!!timeOutRef.current) {
        window.clearTimeout(timeOutRef.current)
      }
    }
  }, [])
}
