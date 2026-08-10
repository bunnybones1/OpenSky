import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BattleTagArtMainGradient,
  BattleTagArtSmallGradient
} from './BattleTagArt.css'

interface BattleTagArtProps {
  artUrl: string
  isSmall?: boolean
}

export const BattleTagArt = memo(({ artUrl, isSmall }: BattleTagArtProps) => {
  const { isLoaded, handleLoad, imgRef } = useImageIsLoaded()
  const { getAssetUrl } = useGetAssetContext()

  const src = useMemo(() => {
    if (!getAssetUrl) return
    return getAssetUrl(artUrl)
  }, [artUrl, getAssetUrl])

  return (
    <div
      className={Sprinkles({
        height: 'full',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative'
      })}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'full',
            left: 0,
            top: 0,
            position: 'absolute',
            zIndex: 1
          }),
          BattleTagArtMainGradient
        )}
      />
      {!!isSmall && (
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              left: 0,
              top: 0,
              position: 'absolute',
              zIndex: 1
            }),
            BattleTagArtSmallGradient
          )}
        />
      )}
      {!!src && (
        <img
          ref={imgRef}
          onLoad={handleLoad}
          src={src}
          className={Sprinkles({ height: 'full', opacity: isLoaded ? 1 : 0 })}
        />
      )}
    </div>
  )
})

BattleTagArt.displayName = 'BattleTagArt'
