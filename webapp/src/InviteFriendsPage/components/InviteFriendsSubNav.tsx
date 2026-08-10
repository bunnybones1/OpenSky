import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SubNav, SubNavProps } from '~/__deprecated__/SubNav'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useInvitePointsForUser } from '~/shared/queries/invite-a-friend/useInvitePointsForUser'
import { useSelector } from '~/shared/redux'
import {
  isInviteAFriendRewardsRouteSelector,
  isInvitedFriendsRouteSelector
} from '~/shared/redux/router/selectors'

export const InviteFriendsSubNav = memo(() => {
  const { data: points } = useInvitePointsForUser()
  const { t } = useTranslation()

  const isInvitedFriendsRoute = useSelector(isInvitedFriendsRouteSelector)
  const isInviteAFriendRewardsRoute = useSelector(isInviteAFriendRewardsRouteSelector)

  const numInvited = useMemo(() => {
    if (!points || !points.friends.length) return
    return points.friends.length
  }, [points])

  const routes = useMemo<SubNavProps['subRoutes']>(() => {
    return [
      {
        to: ROUTES_CONFIG.routes.INVITE_FRIENDS.routes.REWARDS.directPath,
        label: t('inviteFriends.subNavRewards'),
        isActive: isInviteAFriendRewardsRoute,
        icon: 'stickers',
        id: 'rewards'
      },
      {
        to: ROUTES_CONFIG.routes.INVITE_FRIENDS.routes.INVITED.directPath,
        label: `${t('inviteFriends.subNavInvited')}${
          !!numInvited ? ` (${numInvited})` : ''
        }`,
        isActive: isInvitedFriendsRoute,
        icon: 'profile',
        id: 'invited'
      }
    ]
  }, [t, isInviteAFriendRewardsRoute, numInvited, isInvitedFriendsRoute])

  return <SubNav subRoutes={routes} />
})

InviteFriendsSubNav.displayName = 'InviteFriendsSubNav'
