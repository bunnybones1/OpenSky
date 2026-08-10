import { memo } from 'react'

import { CardSet, ItemType } from '~/lib/proto'
import { Box } from '~/shared/components/Base'
import { MagicExplosionWrapper } from '~/shared/components/webgl/MagicExplosionWrapper'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

import { useSkypassRewardImageURL } from './hooks/useSkypassRewardImageURL'
import { Container } from './RewardImage.css'

interface RewardImageProps {
  itemType: ItemType
  amount: number
  cardSet?: CardSet
  showExplosion: boolean
  hasExplosion: boolean
}

export const RewardImage = memo(
  ({ itemType, amount, cardSet, showExplosion, hasExplosion }: RewardImageProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const isTablet = useResponsiveQuery('tablet')
    const isSmallScreen = !isTablet

    const rewardImage = useSkypassRewardImageURL(
      itemType as ItemType,
      amount as number,
      cardSet
    )

    if (!rewardImage) return null

    return (
      <Box
        className={Container}
        style={
          hasExplosion
            ? {
                height: isSmallScreen ? '60vh' : 'calc(60vh - 54px)',
                width: isSmallScreen ? '60vh' : 'calc(60vh - 54px)',
                right: isSmallScreen ? '40vh' : 'calc(50vh - 54px)'
              }
            : {}
        }
      >
        <MagicExplosionWrapper
          explosionEffect={showExplosion}
          explosionEffectVisibleStart={true}
          isReadyToAnimate={true}
        >
          {!!getAssetUrl && (
            <img
              src={getAssetUrl(`webapp/misc/${rewardImage}.webp`)}
              style={{
                height: isSmallScreen ? '100vh' : 'calc(100vh - 54px)',
                width: isSmallScreen ? '100vh' : 'calc(100vh - 54px)'
              }}
            />
          )}
        </MagicExplosionWrapper>
      </Box>
    )
  }
)

RewardImage.displayName = 'RewardImage'
