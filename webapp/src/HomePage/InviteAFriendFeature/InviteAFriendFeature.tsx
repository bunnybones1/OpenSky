import { UserStorageKeys } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import NewBadge from '~/shared/components/LargeCornerBadge'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useInvitePointsForUser } from '~/shared/queries/invite-a-friend/useInvitePointsForUser'
import { useSeenInvitePoints } from '~/shared/queries/invite-a-friend/useSeenInvitePoints'
import { useCurrentSeasonStickers } from '~/shared/queries/useCurrentSeasonStickers'
import {
  FEATURE_KEYS,
  useMarkFeatureAsSeen
} from '~/shared/queries/useMarkFeatureAsSeen'
import { useUserStorage } from '~/shared/queries/useUserStorage'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { InviteAFriendFeatureInner } from './components/InviteAFriendFeatureInner'
import {
  InviteAFriendExplosionWrapper,
  InviteAFriendFeatureWrapper
} from './InviteAFriendFeature.css'
import { useMarkInvitePointsAsSeen } from './useMarkInvitePointsAsSeen'

export const InviteAFriendFeature = memo(() => {
  const { data: stickersData } = useCurrentSeasonStickers()
  const { data: pointsData } = useInvitePointsForUser()
  const { data: seenFeatures } = useUserStorage(UserStorageKeys.NEW_FEATURES_SEEN)
  const seenPoints = useSeenInvitePoints()
  const markPointsAsSeen = useMarkInvitePointsAsSeen()
  const markFeatureAsSeen = useMarkFeatureAsSeen()
  const { getAssetUrl } = useGetAssetContext()
  const navigate = useNavigate()
  const isTabletWide = useResponsiveQuery('tabletWide')

  const hasSeenThisFeature = useMemo(() => {
    if (!Array.isArray(seenFeatures)) return false
    if (!seenFeatures) return true
    return seenFeatures.includes(FEATURE_KEYS.INVITE_A_FRIEND)
  }, [seenFeatures])

  const onClick = useCallback(() => {
    navigate(ROUTES_CONFIG.routes.INVITE_FRIENDS.routes.REWARDS.directPath)
  }, [navigate])

  const onHover = useCallback(() => {
    if (!hasSeenThisFeature) {
      markFeatureAsSeen.mutate(FEATURE_KEYS.INVITE_A_FRIEND)
    }

    if (
      pointsData?.total &&
      seenPoints !== null &&
      seenPoints !== undefined &&
      seenPoints !== pointsData.total
    ) {
      markPointsAsSeen.mutate(pointsData.total)
    }
  }, [
    hasSeenThisFeature,
    pointsData?.total,
    seenPoints,
    markFeatureAsSeen,
    markPointsAsSeen
  ])

  const stickerInfo = useMemo(() => {
    if (!pointsData || !stickersData) return

    const nextSticker = stickersData.find((sticker) => {
      return sticker.requiredPoints > pointsData.total
    })

    const totalStickers = stickersData.length
    const unlockedStickers = nextSticker
      ? stickersData.findIndex((sticker) => sticker.id === nextSticker.id)
      : totalStickers

    let newEarnedPoints = 0
    if (seenPoints) newEarnedPoints = pointsData.total - seenPoints
    else if (seenPoints !== undefined) newEarnedPoints = pointsData.total

    return {
      nextSticker,
      unlockedStickers,
      totalStickers,
      earnedPoints: pointsData.total,
      newEarnedPoints
    }
  }, [stickersData, pointsData, seenPoints])

  const badge = useMemo(() => {
    if (!!stickerInfo?.newEarnedPoints) {
      return (
        <NewBadge
          badgeColor="forest5"
          badgeText={`+ ${stickerInfo.newEarnedPoints}`}
        />
      )
    }

    if (!hasSeenThisFeature) {
      return <NewBadge badgeColor="warm6" badgeText="New" />
    }

    return null
  }, [stickerInfo?.newEarnedPoints, hasSeenThisFeature])

  return (
    <div
      onClick={!stickerInfo || !stickerInfo.totalStickers ? undefined : onClick}
      onMouseEnter={!stickerInfo || !stickerInfo.totalStickers ? undefined : onHover}
      data-id="invite-a-friend"
      className={clsx(
        Sprinkles({
          width: 'full',
          height: 'full',
          position: 'relative',
          backgroundColor: 'purple2',
          border: '2px solid',
          borderColor: 'purple7'
        }),
        InviteAFriendFeatureWrapper
      )}
    >
      {!!stickerInfo && (
        <>
          {badge}
          <InviteAFriendFeatureInner
            nextSticker={stickerInfo.nextSticker}
            totalStickersCount={stickerInfo.totalStickers}
            unlockedStickersCount={stickerInfo.unlockedStickers}
            earnedPoints={stickerInfo.earnedPoints}
            newEarnedPoints={stickerInfo.newEarnedPoints}
          />
        </>
      )}
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'full'
          }),
          InviteAFriendExplosionWrapper
        )}
        style={{
          backgroundImage: getAssetUrl
            ? `url(${getAssetUrl('webapp/backgrounds/explosion.webp')})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: !isTabletWide ? '80% 60%' : undefined
        }}
      />
    </div>
  )
})

InviteAFriendFeature.displayName = 'InviteAFriendFeature'
