import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { SoundClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { usePlayLinkProps } from './hooks/usePlayLinkProps'
import {
  PlayLinkHighlightStyle,
  PlayLinkStyle,
  PlayLinkTextStyle,
  PlayLinkWrapperStyle
} from './PlayLink.css'

interface NavBarLinkProps {
  isHorizontal: boolean
}

export const PlayLink = memo(({ isHorizontal }: NavBarLinkProps) => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()
  const { to, isActive } = usePlayLinkProps()

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'relative'
        }),
        PlayLinkWrapperStyle,
        { isHorizontal }
      )}
      data-link-id="play"
      onMouseEnter={() => {
        if (!isActive) SoundClient.playSound('CursorMainHover')
      }}
      onMouseDown={() => {
        if (!isActive) SoundClient.playSound('JuicySwipeStingerCombo')
      }}
    >
      <NavLink
        to={to}
        className={({ isActive: isRouteActive }) =>
          clsx(
            {
              isActive: isActive !== undefined ? isActive : isRouteActive,
              isHorizontal
            },
            PlayLinkStyle,
            Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              flexDirection: isHorizontal ? 'row' : 'column',
              width: 'full',
              height: 'full',
              zIndex: 2,
              borderTop: isHorizontal ? undefined : '1px solid',
              borderRight: isHorizontal ? undefined : '1px solid',
              borderLeft: isHorizontal ? '1px solid' : undefined,
              borderBottom: isHorizontal ? '1px solid' : undefined
            })
          )
        }
      >
        <Icon height="20px" type="play" color="white" />
        <Text
          color="white"
          fontSize={isHorizontal ? '22px' : '10px'}
          fontWeight={isHorizontal ? '500' : '700'}
          marginTop={isHorizontal ? undefined : '4px'}
          marginLeft={!isHorizontal ? undefined : '4px'}
          className={PlayLinkTextStyle}
          fontFamily="condensed"
        >
          {t('navigation.play')}
        </Text>
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(
              `webapp/misc/${
                isHorizontal ? 'nav-selector-horizontal' : 'nav-selector-vertical'
              }.webp`
            )}
            ref={imgRef}
            onLoad={handleLoad}
            className={clsx(
              Sprinkles({
                position: 'absolute',
                opacity: 0
              }),
              PlayLinkHighlightStyle,
              { isHorizontal, isLoaded }
            )}
          />
        )}
      </NavLink>
    </div>
  )
})

PlayLink.displayName = 'PlayLink'
