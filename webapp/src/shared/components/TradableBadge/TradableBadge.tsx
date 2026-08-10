import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { ItemType } from '~/lib/proto'
import { Box, FlexBox } from '~/shared/components/Base'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import {
  claimRewardImageSize,
  TRADABLE_REWARDS,
  TRADABLE_REWARDS_LIMITED
} from '~/SkyPassPage/shared/constants'

import TradableBadgeTooltip from './components/TradableBadgeTooltip'
import { BadgeContainer } from './TradableBadge.css'

interface Props {
  itemType: ItemType
  enableAnimation?: boolean
  disableTooltip?: boolean
}

export const TradableBadge = memo(
  ({ itemType, enableAnimation = true, disableTooltip }: Props) => {
    const { getAssetUrl } = useGetAssetContext()
    const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()
    const isTablet = useResponsiveQuery('tablet')
    const isSmallScreen = !isTablet

    const badgeImage = useMemo(() => {
      if (TRADABLE_REWARDS_LIMITED.includes(itemType))
        return 'webapp/icons/badge-limited-time-mint-reward.webp'
      return 'webapp/icons/badge-mint-reward.webp'
    }, [itemType])

    const heightConstant = useMemo(() => {
      if (TRADABLE_REWARDS_LIMITED.includes(itemType)) return 0.69
      return 0.51
    }, [itemType])

    if (
      !TRADABLE_REWARDS_LIMITED.includes(itemType) &&
      !TRADABLE_REWARDS.includes(itemType)
    )
      return null

    if (!getAssetUrl) return null

    return (
      <FlexBox
        type="end-row"
        style={{
          position: 'absolute',
          right: '3vh',
          top: `${isSmallScreen ? 3 : 6}vh`,
          width: '100%'
        }}
      >
        <Tooltip
          tooltip={!!disableTooltip ? undefined : <TradableBadgeTooltip />}
          placement="bottom-start"
        >
          <Box
            width={claimRewardImageSize}
            className={clsx(
              'badgeContainer',
              BadgeContainer[isLoaded && enableAnimation ? 'animate' : 'primary']
            )}
            style={{
              width: `${isSmallScreen ? 27 : 20}vh`,
              height: `calc(${isSmallScreen ? 27 : 20}vh * ${heightConstant})`,
              WebkitMask: `url(${getAssetUrl(
                badgeImage
              )}) center/cover no-repeat,linear-gradient(#fff 0 0)`,
              mask: `url(${getAssetUrl(
                badgeImage
              )}) center/cover no-repeat,linear-gradient(#fff 0 0)`,
              maskComposite: 'intersect'
            }}
          >
            <img
              ref={imgRef}
              onLoad={handleLoad}
              src={getAssetUrl(badgeImage)}
              style={{ height: '100%', width: '100%' }}
            />
          </Box>
        </Tooltip>
      </FlexBox>
    )
  }
)

TradableBadge.displayName = 'TradableBadge'
