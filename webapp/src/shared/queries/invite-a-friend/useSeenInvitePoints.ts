import { UserStorageKeys } from '@opensky/shared/constants'
import { useLayoutEffect, useMemo } from 'react'

import { useMarkInvitePointsAsSeen } from '~/HomePage/InviteAFriendFeature/useMarkInvitePointsAsSeen'

import { useUserStorage } from '../useUserStorage'
import { useInvitePointsForUser } from './useInvitePointsForUser'

export const useSeenInvitePoints = () => {
  const { data: pointsData, isFetching, isLoading } = useInvitePointsForUser()
  const { data: seenPoints } = useUserStorage(UserStorageKeys.SEEN_INVITE_POINTS)
  const markInvitePointsAsSeen = useMarkInvitePointsAsSeen()

  useLayoutEffect(() => {
    if (pointsData?.total !== undefined && !!seenPoints) {
      if (seenPoints > pointsData.total) {
        markInvitePointsAsSeen.mutate(pointsData.total)
      }
    }
  }, [markInvitePointsAsSeen, pointsData?.total, seenPoints])

  return useMemo(() => {
    if (isFetching || isLoading) return undefined
    return seenPoints as number | undefined | null
  }, [isFetching, isLoading, seenPoints])
}
