import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { SoundClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { NavBarLink } from '../shared/components/NavBarLink/NavBarLink'
import { HomeLinkBetaBlock, HomeLinkHighlight, HomeLinkStyle } from './HomeLink.css'

interface HomeLinkProps {
  isHorizontal: boolean
}

export const HomeLink = memo(({ isHorizontal }: HomeLinkProps) => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()
  const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()

  if (isHorizontal) {
    return (
      <div
        className={Sprinkles({
          flex: 1,
          height: 'full',
          backgroundColor: 'purple4',
          borderBottom: '1px solid',
          borderColor: 'purple7'
        })}
      >
        <NavLink
          onMouseDown={() => SoundClient.playSound('CursorMainClick')}
          onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
          className={({ isActive }) =>
            clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                paddingX: '16px',
                height: 'full',
                width: 'full',
                borderRight: '1px solid'
              }),
              { isActive },
              HomeLinkStyle
            )
          }
          to={ROUTES_CONFIG.routes.HOME.directPath}
        >
          <Icon height="32px" color="white" type="opensky-full" />
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'purple9',
                fontSize: '12px',
                color: 'purple4',
                marginLeft: '4px',
                fontWeight: '700'
              }),
              HomeLinkBetaBlock
            )}
          >
            {t('generic.BETA')}
          </div>
          {!!getAssetUrl && (
            <img
              src={getAssetUrl('webapp/misc/nav-selector-horizontal.webp')}
              ref={imgRef}
              onLoad={handleLoad}
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  opacity: 0
                }),
                HomeLinkHighlight,
                { isLoaded }
              )}
            />
          )}
        </NavLink>
      </div>
    )
  }

  return (
    <NavBarLink
      to={ROUTES_CONFIG.routes.HOME.directPath}
      icon="opensky"
      text={t('navigation.home')}
      isHorizontal={false}
      id="home"
    />
  )
})

HomeLink.displayName = 'HomeLink'
