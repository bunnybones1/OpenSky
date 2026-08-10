import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { FlexBox, Text } from '~/shared/components/Base'
import { DynamicProgressWithRewards } from '~/shared/components/DynamicProgressWithRewards'
import { Icon } from '~/shared/components/Icon/Icon'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useNavigateToSkyPass } from '~/shared/hooks/useNavigateToSkypass'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useInvitePointsForUser } from '../../shared/queries/invite-a-friend/useInvitePointsForUser'
import {
  StickerInfo,
  useCurrentSeasonStickers
} from '../../shared/queries/useCurrentSeasonStickers'

const REWARD_HEIGHT = [120, 120, 120, 160]
const IconHeight = { base: '24px', tabletWide: '32px' } as const

interface NormalizedSticker extends StickerInfo {
  originalPoints: number
}

interface NormalizedSticker extends StickerInfo {
  originalPoints: number
}

const InviteAFriendRewards = memo(() => {
  const { data: stickers } = useCurrentSeasonStickers()
  const { data: points } = useInvitePointsForUser()
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()

  const stickerInfo = useMemo(() => {
    if (!stickers || !stickers.length || !points) return

    const sortedStickers = stickers.sort((a, b) => {
      return a.requiredPoints - b.requiredPoints
    })

    const endProgress = sortedStickers[stickers.length - 1].requiredPoints

    // Ask Salvatore about this math :D
    const normalizingFactor =
      Math.log10(sortedStickers[0].requiredPoints) * 2 -
      Math.log10(sortedStickers[1].requiredPoints)

    const normalizedProgress =
      points.total < sortedStickers[0].requiredPoints
        ? points.total *
          ((Math.log10(sortedStickers[0].requiredPoints) - normalizingFactor) /
            sortedStickers[0].requiredPoints)
        : Math.log10(points.total) - normalizingFactor

    return {
      // We want to leave a little bit of room on the progress bar for points overflow,
      // so we add a sixth length buffer to the end.
      normalizingFactor,
      endProgress: Math.log10(endProgress + 50) - normalizingFactor,
      progress: isFinite(normalizedProgress) ? normalizedProgress : 0
    }
  }, [stickers, points])

  const normalizedStickers = useMemo<NormalizedSticker[] | undefined>(() => {
    if (!stickers || !stickers.length || !stickerInfo) return

    return stickers.map((sticker) => {
      return {
        ...sticker,
        requiredPoints:
          Math.log10(sticker.requiredPoints) - stickerInfo.normalizingFactor,
        originalPoints: sticker.requiredPoints
      }
    })
  }, [stickers, stickerInfo])

  const renderReward = useCallback(
    (reward: NormalizedSticker) => {
      const isUnlocked = !!points?.total && reward.originalPoints <= points.total
      return (
        <FlexBox
          width={[80, 80, 80, 120]}
          flexDirection="column"
          alignItems="center"
          justifyContent="flex-end"
          position="relative"
        >
          {!!getAssetUrl && (
            <img
              src={getAssetUrl(`webapp/stickers/4x/${reward.artID}.webp`)}
              style={{ width: '100%', marginBottom: '4px' }}
            />
          )}
          <FlexBox
            position="absolute"
            left="50%"
            transform="translateX(-50%)"
            bottom={32}
            className={clsx({ isUnlocked })}
          >
            <Icon
              height={IconHeight}
              type={isUnlocked ? 'check-circled' : 'lock-stroke'}
              color={isUnlocked ? 'forest4' : 'purple8'}
            />
          </FlexBox>
          <Text
            color="white"
            fontWeight="medium"
            fontSize={12}
            lineHeight="14px"
            my={11}
          >
            {reward.name}
          </Text>
        </FlexBox>
      )
    },
    [points?.total, getAssetUrl]
  )

  const getRewardPoints = useCallback((reward: NormalizedSticker) => {
    return reward.originalPoints
  }, [])

  const { skyPassTo } = useNavigateToSkyPass()

  const getCurrentProgress = useCallback(() => {
    if (!points) return 0
    return points?.total
  }, [points])

  return (
    <FlexBox
      width="100%"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      borderBottom="1px solid"
      borderColor="purple7"
      px={[24, 48]}
      pt={24}
      pb={[24, 24, 24, 32]}
      bg="purple1"
      style={{
        background: !!getAssetUrl
          ? `url(${getAssetUrl('webapp/backgrounds/celestial-map.webp')})`
          : undefined,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <Text
        color="white"
        fontSize={20}
        fontWeight="bold"
        mb={16}
        mt={16}
        fontFamily="condensed"
      >
        {t('inviteFriends.progressHeaderTitle')}
      </Text>
      {!stickerInfo || !normalizedStickers ? (
        <FlexBox
          height={200}
          width="100%"
          alignItems="center"
          justifyContent="center"
        >
          <Icon height="32px" color="purple8" type="spinner" />
        </FlexBox>
      ) : (
        <FlexBox width="100%" maxWidth={890}>
          <DynamicProgressWithRewards
            endProgress={stickerInfo.endProgress}
            progress={stickerInfo.progress}
            rewards={normalizedStickers}
            rewardHeight={REWARD_HEIGHT}
            renderReward={renderReward}
            getRewardPoints={getRewardPoints}
            getCurrentProgress={getCurrentProgress}
          />
        </FlexBox>
      )}
      <Text color="warm7" fontSize={14} fontWeight="regular" mt={2}>
        {t('inviteFriends.disclaimer')}
      </Text>
      <Text color="purple9" fontSize={12} fontWeight="regular" mt={2}>
        {t('inviteFriends.collection')}
      </Text>
      <FlexBox
        width="100%"
        maxWidth={900}
        p={[12, 16]}
        height={[150, 150, 150, 250]}
        border="1px solid"
        borderColor="purple7"
        alignItems="center"
        justifyContent="flex-start"
        flexWrap="nowrap"
        mt={[16, 16, 16, 50]}
        overflow="hidden"
        position="relative"
      >
        <FlexBox
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="center"
          pl={[16, 16, 16, 32]}
          flexWrap="nowrap"
          width={['50%', '60%', '50%', '40%']}
        >
          <Text
            width="100%"
            fontFamily="condensed"
            color="white"
            fontSize={[18, 24]}
            fontWeight="extraBold"
            textWrap
          >
            {t('inviteFriends.collectFromSkypass')}
          </Text>

          <Link to={skyPassTo}>
            <Text
              width="100%"
              color="purple9"
              fontWeight="regular"
              fontSize={[14, 16]}
              mt={[8, 16]}
              textWrap
            >
              →{t('inviteFriends.goToSkypass')}
            </Text>
          </Link>
        </FlexBox>
        <FlexBox
          position="absolute"
          alignItems="center"
          justifyContent="center"
          height={[350, 350, 350, 550]}
          top={['-40px', '-40px', '-40px', '-40px']}
          right={['-60px', '-60px', '-60px', '-100px']}
        >
          {!!getAssetUrl && (
            <img
              className={Sprinkles({ height: 'full' })}
              src={getAssetUrl('webapp/misc/skypass-reward-sticker-points.webp')}
            />
          )}
        </FlexBox>
      </FlexBox>
      <FlexBox
        width="100%"
        maxWidth={900}
        p={[12, 16]}
        height={[180, 180, 180, 300]}
        bg="purple3"
        border="1px solid"
        borderColor="purple7"
        alignItems="center"
        justifyContent="flex-start"
        flexWrap="nowrap"
        mt={[16, 16, 16, 50]}
      >
        <FlexBox alignItems="center" justifyContent="center" height="100%">
          {!!getAssetUrl && (
            <video
              style={{ height: '100%' }}
              autoPlay
              loop
              src={getAssetUrl('webapp/backgrounds/stickers_explainer.mp4')}
              muted
              playsInline={true}
            />
          )}
        </FlexBox>
        <FlexBox
          flex={1}
          height="100%"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="center"
          pl={[16, 16, 16, 32]}
          flexWrap="nowrap"
        >
          <Text
            fontFamily="condensed"
            color="white"
            fontSize={[18, 22]}
            fontWeight="extraBold"
            textWrap
          >
            {t('inviteFriends.stickerExplainerHeader')}
          </Text>
          <Text
            color="purple9"
            fontWeight="medium"
            fontSize={[14, 16]}
            mt={[8, 16]}
            textWrap
          >
            {t('inviteFriends.stickerExplainerBody')}
          </Text>
        </FlexBox>
      </FlexBox>
    </FlexBox>
  )
})

export default InviteAFriendRewards

InviteAFriendRewards.displayName = 'InviteAFriendRewards'
