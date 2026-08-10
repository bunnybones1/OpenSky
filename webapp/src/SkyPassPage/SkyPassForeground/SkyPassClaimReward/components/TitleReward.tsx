import clsx from 'clsx'
import { memo } from 'react'

import { SkyTagTitle } from '~/shared/components/SkyTagTitle'
import { MagicExplosionWrapper } from '~/shared/components/webgl/MagicExplosionWrapper'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { TitleRewardContainer, TitleRewardStyle } from './TitleReward.css'

interface TitleRewardProps {
  id: number
  explosionEffect: boolean
}

export const TitleReward = memo(({ id, explosionEffect }: TitleRewardProps) => {
  const isTabletWide = useResponsiveQuery('tabletWide')
  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'full',
          position: 'absolute',
          right: 0
        }),
        TitleRewardContainer
      )}
    >
      <div className={clsx(Sprinkles({ pointerEvents: 'none' }), TitleRewardStyle)}>
        <MagicExplosionWrapper
          explosionEffect={explosionEffect}
          explosionEffectVisibleStart={true}
          explosionEffectDelay={0}
          isReadyToAnimate={true}
        >
          <div
            className={Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'full',
              height: 'full',
              zIndex: 3,
              paddingTop: isTabletWide ? '60px' : '32px'
            })}
          >
            <SkyTagTitle id={id} fontSize={isTabletWide ? '32px' : '16px'} />
          </div>
        </MagicExplosionWrapper>
      </div>
    </div>
  )
})

TitleReward.displayName = 'TitleReward'
