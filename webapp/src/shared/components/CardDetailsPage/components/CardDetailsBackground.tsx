import clsx from 'clsx'
import { memo } from 'react'

import { CardType } from '~/shared/constants/cards'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  CardDetailsBackgroundStyle,
  ImageWrapper,
  UnitImage
} from './CardDetailsBackground.css'

interface CardDetailsBackgroundProps {
  id: number
  backgroundAsset: string
  asset: string
  type: CardType['type']
}

export const CardDetailsBackground = memo(
  ({ type, backgroundAsset, asset }: CardDetailsBackgroundProps) => {
    const isTabletWide = useResponsiveQuery('tabletWide')
    const { getAssetUrl } = useGetAssetContext()
    const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()

    if (!isTabletWide || !getAssetUrl) return null

    const isSpell = type === 'enchant' || type === 'spell'

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end'
          }),
          CardDetailsBackgroundStyle
        )}
      >
        <div
          style={{
            backgroundImage: `linear-gradient(90deg, #0C061E 0%, rgba(12, 6, 30, 0) 34%),
            linear-gradient(90deg, rgba(12, 6, 30, 0) 0%, rgba(12, 6, 30, 0) 66%, #0C061E 100%), 
            linear-gradient(0deg, rgba(12,6,30,1) 0%, rgba(12,6,30,1) 6%, rgba(12,6,30,0) 40%, rgba(12,6,30,0) 100%), 
            url(${getAssetUrl(
              !isSpell
                ? `webapp/backgrounds/${backgroundAsset}.webp`
                : `webapp/spell-art/6x/${asset}@6x.webp`
            )})`
          }}
          className={clsx(
            Sprinkles({
              height: 'full',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }),
            ImageWrapper
          )}
        >
          {!isSpell && (
            <img
              src={getAssetUrl(`webapp/unit-art/6x/${asset}@6x.webp`)}
              className={clsx(
                Sprinkles({
                  height: 'full'
                }),
                { isLoaded },
                UnitImage
              )}
              ref={imgRef}
              onLoad={handleLoad}
            />
          )}
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              position: 'absolute',
              bottom: 0,
              left: 0,
              zIndex: 2
            })}
            style={{
              backgroundImage:
                'linear-gradient(0deg, rgba(12,6,30,1) 0%, rgba(12,6,30,1) 6%, rgba(12,6,30,0) 40%, rgba(12,6,30,0) 100%)'
            }}
          />
        </div>
      </div>
    )
  }
)

CardDetailsBackground.displayName = 'CardDetailsBackground'
