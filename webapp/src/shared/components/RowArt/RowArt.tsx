import clsx from 'clsx'
import { memo } from 'react'

import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  RowArtColorVariants,
  RowArtFadeInImage,
  RowArtWrapper,
  UseHeightStyle
} from './RowArt.css'

interface RowArtProps {
  url: string
  className?: Parameters<typeof clsx>[0]
  useHeight?: boolean
  useWidthHeight?: boolean
  colorType?: keyof typeof RowArtColorVariants
}

export const RowArt = memo(
  ({ url, className, useHeight, useWidthHeight, colorType }: RowArtProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { handleLoad, isLoaded, imgRef } = useImageIsLoaded()

    return (
      <div
        className={clsx(
          Sprinkles({
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            pointerEvents: 'none',
            position: 'relative'
          }),
          className,
          RowArtWrapper,
          UseHeightStyle,
          {
            useHeight,
            useWidthHeight
          }
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              left: 0,
              right: 0,
              height: 'full',
              zIndex: 3,
              width: 'full'
            }),
            RowArtColorVariants[colorType || 'default']
          )}
        />
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(url)}
            className={clsx(RowArtFadeInImage, UseHeightStyle, {
              isLoaded,
              useHeight,
              useWidthHeight
            })}
            ref={imgRef}
            onLoad={handleLoad}
          />
        )}
      </div>
    )
  }
)

RowArt.displayName = 'RowArt'
