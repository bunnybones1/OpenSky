import { memo, useMemo } from 'react'
import { v4 } from 'uuid'

import { Box, FlexBox } from '~/shared/components/Base'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { claimRewardImageSize } from '~/SkyPassPage/shared/constants'
import { useSkypassItemRotations } from '~/SkyPassPage/SkyPassForeground/SkyPassClaimReward/shared/hooks/useSkypassItemRotations'

import { CardContainerBase } from './CardBackImageFan.css'

interface Props {
  amount: number
  cardBack: string
}

export const CardBackImageFan = memo(({ amount, cardBack }: Props) => {
  const { getAssetUrl } = useGetAssetContext()
  const { centerRotation, list, reversed } = useSkypassItemRotations(amount, cardBack)
  const isTablet = useResponsiveQuery('tablet')
  const isSmallScreen = !isTablet

  const renderCards = useMemo(() => {
    return list?.map((_id, index) => {
      const currIndex = reversed[index]
      const { rotation, rightOffset } = centerRotation[index]
      return (
        <FlexBox
          type={'centered-end-row'}
          position="absolute"
          right="0"
          top="0"
          key={v4()}
          height={claimRewardImageSize}
          width={claimRewardImageSize}
        >
          <Box
            style={{
              position: 'absolute',
              marginRight: '5vh',
              right: rightOffset,
              top: `${isSmallScreen ? 2 : 10}vh`,
              transform: `rotate(${rotation}deg) scale(${1 - currIndex * 0.05})`,
              width: `${isSmallScreen ? 40 : 36}vh`,
              zIndex: 3
            }}
            className={CardContainerBase}
          >
            {!!getAssetUrl && <img width="100%" src={getAssetUrl(cardBack)} />}
          </Box>
        </FlexBox>
      )
    })
  }, [list, reversed, centerRotation, isSmallScreen, getAssetUrl, cardBack])

  return <>{renderCards}</>
})

CardBackImageFan.displayName = 'CardBackImageFan'
