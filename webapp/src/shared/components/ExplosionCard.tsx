import clsx from 'clsx'
import { memo, useCallback, useState } from 'react'

import { CardImage } from '~/shared/components/CardImage/CardImage'

import { ExplosionCardStyle } from './ExplosionCard.css'
import { MagicExplosionWrapper } from './webgl/MagicExplosionWrapper'

interface Props {
  explosionEffect?: boolean
  id: number
  explosionEffectDelay?: number
  hasFlare?: boolean
  explosionEffectVisibleStart?: boolean
}

export const ExplosionCard = memo(
  ({
    id,
    explosionEffect = false,
    explosionEffectDelay = 0,
    hasFlare = true,
    explosionEffectVisibleStart = false
  }: Props) => {
    const [isImageLoaded, setIsImageLoaded] = useState(false)

    const onLoad = useCallback(() => {
      setIsImageLoaded(true)
    }, [])

    return (
      <MagicExplosionWrapper
        explosionEffect={explosionEffect}
        explosionEffectDelay={explosionEffectDelay}
        isReadyToAnimate={isImageLoaded}
        flare={hasFlare}
        explosionEffectVisibleStart={explosionEffectVisibleStart}
      >
        <CardImage
          onLoad={onLoad}
          id={id}
          className={clsx('card', ExplosionCardStyle)}
          data-card-id={id}
        />
      </MagicExplosionWrapper>
    )
  }
)

ExplosionCard.displayName = 'ExplosionCard'
