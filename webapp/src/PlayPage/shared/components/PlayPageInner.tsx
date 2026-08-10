import clsx from 'clsx'
import { memo, ReactNode } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  PlayPageInnerChildWrapper,
  PlayPageInnerDeckTypeIcon,
  PlayPageInnerGradient,
  PlayPageInnerStyle
} from './PlayPageInner.css'

interface PlayPageInnerProps {
  children: ReactNode
  bgUrl: string
  isDiscovery?: boolean
  isGameTypeHidden?: boolean
  className?: string
  isLoading?: boolean
}

export const PlayPageInner = memo(
  ({
    children,
    bgUrl,
    isDiscovery,
    isGameTypeHidden,
    className,
    isLoading
  }: PlayPageInnerProps) => {
    const { getAssetUrl } = useGetAssetContext()
    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            marginTop: { base: '0px', desktop: '24px' },
            position: 'relative'
          }),
          PlayPageInnerStyle,
          className
        )}
        style={{
          backgroundImage:
            !!getAssetUrl && !isLoading ? `url(${getAssetUrl(bgUrl)})` : undefined
        }}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              zIndex: 2
            }),
            PlayPageInnerGradient,
            { isDiscovery }
          )}
        />
        {!!getAssetUrl && !isGameTypeHidden && (
          <img
            className={clsx(
              Sprinkles({
                position: 'absolute',
                zIndex: 1,
                left: 0,
                top: 0
              }),
              PlayPageInnerDeckTypeIcon
            )}
            src={getAssetUrl(
              `webapp/icons/${
                isDiscovery ? 'discovery' : 'constructed'
              }large-icon.webp`
            )}
          />
        )}
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              flexDirection: 'column',
              flexWrap: 'nowrap',
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 3,
              padding: { base: '16px', tabletWide: '24px' }
            }),
            PlayPageInnerChildWrapper
          )}
        >
          {children}
        </div>
      </div>
    )
  }
)

PlayPageInner.displayName = 'PlayPageInner'
