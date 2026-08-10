import { getGradedID } from '@opensky/shared/assetsIDs'
import { memo, useCallback, useMemo } from 'react'
import Tilt from 'react-parallax-tilt'

import { ItemType } from '~/lib/proto'
import { Box } from '~/shared/components/Base'
import { CardImage } from '~/shared/components/CardImage/CardImage'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { claimRewardImageSize } from '~/SkyPassPage/shared/constants'
import { useSkypassItemRotations } from '~/SkyPassPage/SkyPassForeground/SkyPassClaimReward/shared/hooks/useSkypassItemRotations'

import { MultiCardContainer, SingleCardContainer } from './CardImageFan.css'

interface Props {
  rewardTokens: number[]
  amount: number
  id: number
  itemType: ItemType
  onClick?: () => void
}

export const CardImageFan = memo(
  ({ rewardTokens, amount, id, itemType, onClick }: Props) => {
    const isTablet = useResponsiveQuery('tablet')
    const isSmallScreen = !isTablet

    const cardList = useMemo(
      () => rewardTokens?.slice(0, amount > 5 ? 5 : amount),
      [rewardTokens, amount]
    )

    const { centerRotation, reversed } = useSkypassItemRotations(amount, '', cardList)

    const getImage = useCallback(
      (tokenId: number) => {
        const gradedId = getGradedID(tokenId, itemType)

        return (
          tokenId && (
            <Tilt
              tiltReverse={true}
              tiltMaxAngleX={10}
              tiltMaxAngleY={10}
              tiltEnable={amount > 1 && !!onClick}
            >
              <CardImage id={gradedId} onClick={onClick} />
            </Tilt>
          )
        )
      },
      [itemType, amount, onClick]
    )

    const renderCards = useMemo(() => {
      if (amount > 1) {
        return cardList?.map((id, index) => {
          const currIndex = reversed[index]
          const { rotation, rightOffset } = centerRotation[index]
          return (
            <Box
              key={id}
              style={{
                right: rightOffset,
                top: `${isSmallScreen ? 2 : 10}vh`,
                transform: `rotate(${rotation}deg) scale(${1 - currIndex * 0.05})`,
                width: `${isSmallScreen ? 40 : 36}vh`
              }}
              className={MultiCardContainer}
              onClick={onClick}
            >
              {getImage(id)}
            </Box>
          )
        })
      } else
        return (
          <Box
            key={id}
            height={claimRewardImageSize}
            width={claimRewardImageSize}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              zIndex: 3
            }}
          >
            <Box
              onClick={onClick}
              className={SingleCardContainer[!!onClick ? 'clickable' : 'primary']}
            >
              {getImage(Number(rewardTokens?.[0]))}
            </Box>
          </Box>
        )
    }, [
      amount,
      id,
      onClick,
      getImage,
      rewardTokens,
      cardList,
      reversed,
      centerRotation,
      isSmallScreen
    ])

    return <>{renderCards}</>
  }
)

CardImageFan.displayName = 'CardImageFan'
