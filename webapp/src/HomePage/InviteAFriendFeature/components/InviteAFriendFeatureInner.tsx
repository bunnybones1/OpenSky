import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { ItemType } from '~/lib/proto'
import { Box, FlexBox, Text } from '~/shared/components/Base'
import { CurrentSeasonStickerPack } from '~/shared/components/CurrentSeasonStickerPack/CurrentSeasonStickerPack'
import { DynamicProgressBar } from '~/shared/components/DynamicProgressBar'
import { Icon } from '~/shared/components/Icon/Icon'
import { TradableBadge } from '~/shared/components/TradableBadge/TradableBadge'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { StickerInfo } from '~/shared/queries/useCurrentSeasonStickers'

interface InviteAFriendFeatureInnerProps {
  nextSticker?: StickerInfo
  totalStickersCount: number
  unlockedStickersCount: number
  earnedPoints: number
  newEarnedPoints: number
}

export const InviteAFriendFeatureInner = memo(
  ({
    totalStickersCount,
    unlockedStickersCount,
    earnedPoints,
    nextSticker,
    newEarnedPoints
  }: InviteAFriendFeatureInnerProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { t } = useTranslation()
    const isTablet = useResponsiveQuery('tablet')

    return (
      <FlexBox
        width="100%"
        height="100%"
        alignItems="flex-start"
        justifyContent="flex-start"
        flexWrap="nowrap"
        p="16px 8px 8px 16px"
        position="absolute"
        top={0}
        left={0}
        zIndex={3}
        overflow="hidden"
      >
        <FlexBox
          height="100%"
          flex={1}
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="flex-start"
          pb="8px"
          flexWrap="nowrap"
          zIndex={4}
        >
          <FlexBox
            type="start-row"
            alignItems="flex-start"
            justifyContent="flex-start"
          >
            <Text
              textWrap
              fontWeight="extraBold"
              color="purple9"
              fontSize={[16, 16, 16, '24px']}
              fontFamily="condensed"
            >
              {t('dashboard.stickers.collect')}
            </Text>
            {!!getAssetUrl && (
              <img
                style={{
                  width: !isTablet ? '24px' : '32px',
                  margin: '0 4px 0 6px'
                }}
                src={getAssetUrl('webapp/icons/sticker-points.webp')}
                alt="sticker"
              />
            )}
            <Text
              textWrap
              fontWeight="extraBold"
              color="cold8"
              fontSize={[16, 16, 16, '24px']}
              fontFamily="condensed"
            >
              {t('dashboard.stickers.stickerPoints')}
            </Text>
            <Text
              textWrap
              fontWeight="extraBold"
              color="purple9"
              fontSize={[16, 16, 16, '24px']}
              fontFamily="condensed"
            >
              {t('dashboard.stickers.toEarnStickers')}
            </Text>
          </FlexBox>

          {!!nextSticker ? (
            <>
              <Text
                textWrap
                fontWeight="medium"
                fontSize={[12, 12, 12, '16px']}
                color="purple9"
                mt={1}
              >
                {t('dashboard.stickers.stickersCollected', {
                  collected: totalStickersCount,
                  unlocked: unlockedStickersCount
                })}
              </Text>
              <StickerProgressText
                zIndex={4}
                textWrap
                mb={2}
                fontSize={[12, 12, 12, '14px']}
                dangerouslySetInnerHTML={{
                  __html: t('dashboard.stickers.ptsForNextReward', {
                    earned: earnedPoints,
                    required: nextSticker.requiredPoints
                  })
                }}
              />
            </>
          ) : (
            <FlexBox
              width="100%"
              alignItems="center"
              justifyContent="flex-start"
              mt="auto"
            >
              <Icon type="check-circled" height="24px" color="forest4" />
              <FlexBox
                flexDirection="column"
                alignItems="flex-start"
                justifyContent="flex-start"
                ml="8px"
              >
                <Text
                  textWrap
                  fontSize={14}
                  color="forest5"
                  lineHeight="17px"
                  fontWeight="medium"
                >
                  {t('dashboard.stickers.allStickersEarnedHeader')}
                </Text>
                <Text
                  textWrap
                  fontSize={14}
                  color="purple8"
                  fontWeight="medium"
                  lineHeight="17px"
                >
                  {t('dashboard.stickers.allStickersEarnedBody')}
                </Text>
              </FlexBox>
            </FlexBox>
          )}
          {!!nextSticker && (
            <DynamicProgressBar
              endProgress={nextSticker.requiredPoints}
              progress={earnedPoints}
              newProgress={newEarnedPoints}
            />
          )}
        </FlexBox>
        <Box
          width="100%"
          height="100%"
          position="absolute"
          top={0}
          left={0}
          style={{
            background: 'rgba(12, 6, 30, 0.4)'
          }}
        />
        <FlexBox
          height="100%"
          width="100%"
          pl={['57.64%', '57.64%', '57.64%', '56.83%']}
          pr={['8.16%', '8.16%', '8.16%', '4.3%']}
          position="absolute"
          top={0}
          left={0}
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          zIndex={3}
        >
          <Box
            width="100%"
            height={['46.92%', '46.92%', '46.92%', '64%']}
            position="relative"
            mt={['-12px', '-12px', '-12px', 0]}
          >
            <CurrentSeasonStickerPack nextStickerTokenId={nextSticker?.tokenId} />
          </Box>
        </FlexBox>
        <FlexBox
          height="100%"
          width={['27.22%', '27.22%', '27.22%', '23.22%']}
          zIndex={4}
          flexDirection="column"
          alignItems="flex-end"
          justifyContent="flex-end"
        >
          {!!nextSticker && !!getAssetUrl && (
            <StickerImg
              src={getAssetUrl(`webapp/stickers/4x/${nextSticker.artID}.webp`)}
            />
          )}
        </FlexBox>
        <Box
          position="absolute"
          top={['-5px', '-10px', '-20px', '-20px']}
          right={0}
          zIndex={4}
          style={{
            transform: `scale(${!isTablet ? '0.6' : '0.45'})`
          }}
        >
          <TradableBadge
            disableTooltip
            itemType={ItemType.SW_STICKERS}
            enableAnimation={false}
          />
        </Box>
      </FlexBox>
    )
  }
)

const StickerProgressText = styled(Text)`
  font-weight: 500;
  color: ${(props) => props.theme.colors.purple8};
  margin-top: auto;
  strong {
    font-weight: inherit;
    font-family: inherit;
    font-size: inherit;
    color: ${(props) => props.theme.colors.forest3};
  }
`

const StickerImg = styled('img')`
  width: 100%;
  height: auto;
`

InviteAFriendFeatureInner.displayName = 'InviteAFriendFeatureInner'
