import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { MagicExplosionWrapper } from '~/shared/components/webgl/MagicExplosionWrapper'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { useSkypassItemRotations } from '~/SkyPassPage/SkyPassForeground/SkyPassClaimReward/shared/hooks/useSkypassItemRotations'

import { CardBackContainer } from './CardBacks.css'

interface Props {
  amount?: number
  cardBack: string
  explosionEffect?: boolean
}

export const CardBacks = memo(
  ({ amount = 3, cardBack, explosionEffect = false }: Props) => {
    const { getAssetUrl } = useGetAssetContext()
    const { leftStartRotation, list, reversed } = useSkypassItemRotations(
      amount,
      cardBack
    )
    const isTablet = useResponsiveQuery('tablet')
    const isSmallScreen = !isTablet

    const topPadding = useMemo(() => (isSmallScreen ? 2 : 6), [isSmallScreen])

    const renderCards = useMemo(() => {
      return list?.map((_value, index) => {
        const currIndex = reversed[index]
        const { rotation, rightOffset } = leftStartRotation[index]
        return (
          <div
            key={`cardbacks-${currIndex}`}
            className={clsx(
              CardBackContainer,
              Sprinkles({ zIndex: 1, pointerEvents: 'none', position: 'absolute' })
            )}
            style={{
              right: rightOffset,
              top: `${topPadding + currIndex}vh`,
              transform: `rotate(${rotation}deg) scale(${1 - currIndex * 0.09})`,
              filter: currIndex > 0 ? 'brightness(40%)' : 'none'
            }}
          >
            <MagicExplosionWrapper
              explosionEffect={explosionEffect}
              explosionEffectVisibleStart={true}
              explosionEffectDelay={currIndex * 500 + 300}
              isReadyToAnimate={true}
            >
              {!!getAssetUrl && (
                <img
                  className={Sprinkles({
                    width: 'full'
                  })}
                  src={getAssetUrl(cardBack)}
                />
              )}
            </MagicExplosionWrapper>
          </div>
        )
      })
    }, [
      list,
      reversed,
      leftStartRotation,
      topPadding,
      explosionEffect,
      getAssetUrl,
      cardBack
    ])

    return <>{renderCards}</>
  }
)

CardBacks.displayName = 'CardBacks'
