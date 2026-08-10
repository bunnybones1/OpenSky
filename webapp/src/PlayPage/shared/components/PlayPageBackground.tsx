import clsx from 'clsx'
import { memo } from 'react'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  PlayPageBackgroundGradient,
  PlayPageBackgroundStyle
} from './PlayPageBackground.css'

interface PlayPageBackgroundProps {
  bgUrl: string
  isLoading?: boolean
}

export const PlayPageBackground = memo(
  ({ bgUrl, isLoading }: PlayPageBackgroundProps) => {
    const { getAssetUrl } = useGetAssetContext()

    const isDesktop = useResponsiveQuery('desktop')

    if (!getAssetUrl || !isDesktop) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            left: 0,
            top: 0,
            width: 'full',
            height: 'full',
            pointerEvents: 'none'
          }),
          PlayPageBackgroundStyle
        )}
        style={{
          backgroundImage: isLoading ? undefined : `url(${getAssetUrl(bgUrl)})`
        }}
      >
        <div
          className={clsx(
            PlayPageBackgroundGradient,
            Sprinkles({ width: 'full', height: 'full' })
          )}
        />
      </div>
    )
  }
)

PlayPageBackground.displayName = 'PlayPageBackground'
