import clsx from 'clsx'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'

import { SpriteKeys } from '~/clients/SoundClient/types'
import { SoundClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { Text } from '~/shared/components/Text'
import { UnreadBadge } from '~/shared/components/UnreadBadge'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  NavBarHighlightStyle,
  NavBarLinkPulse,
  NavBarLinkStyle,
  NavBarLinkUnreadBadge,
  NavBarTextStyle
} from './NavBarLink.css'
import { NavBarLinkNotification } from './NavBarLinkNotification/NavBarLinkNotification'

interface NavBarLinkProps {
  to: string
  unread?: number
  pulseText?: string
  icon: IconTypes
  text: string
  isHorizontal: boolean
  isActive?: boolean
  hoverSound?: SpriteKeys | null
  clickSound?: SpriteKeys | null
  onClick?: () => void
  id: string
  notification?: {
    text: string
    onNotificationEnd: () => void
  }
}

export const NavBarLink = memo(
  ({
    to,
    isActive,
    isHorizontal,
    icon,
    text,
    unread,
    onClick,
    pulseText,
    notification,
    hoverSound = 'CursorMainHover',
    clickSound = 'CursorMainClick',
    id
  }: NavBarLinkProps) => {
    const { getAssetUrl } = useGetAssetContext()

    const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()

    return (
      <NavLink
        onMouseEnter={() => {
          if (!isActive && !!hoverSound) SoundClient.playSound(hoverSound)
        }}
        onMouseDown={() => {
          if (!isActive && !!clickSound) SoundClient.playSound(clickSound)
        }}
        to={to}
        className={({ isActive: isRouteActive }) =>
          clsx(
            {
              isActive: isActive !== undefined ? isActive : isRouteActive,
              isHorizontal
            },
            NavBarLinkStyle,
            Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              position: 'relative'
            })
          )
        }
        data-link-id={id}
        onClick={onClick}
      >
        <Icon height="20px" type={icon} color="purple9" />
        <Text
          color="purple9"
          fontSize={isHorizontal ? '12px' : '10px'}
          fontWeight={isHorizontal ? '500' : '700'}
          marginTop="4px"
          className={NavBarTextStyle}
        >
          {text}
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
              NavBarHighlightStyle,
              { isHorizontal, isLoaded }
            )}
          />
        )}
        {!!unread && (
          <UnreadBadge
            unread={unread}
            className={clsx(NavBarLinkUnreadBadge, { isHorizontal })}
          />
        )}
        {!!pulseText && !notification && (
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                fontSize: '10px',
                padding: '4px',
                fontWeight: '600',
                textAlign: 'center',
                color: 'purple1',
                backgroundColor: 'warm6'
              }),
              NavBarLinkPulse,
              { isHorizontal }
            )}
          >
            {pulseText}
          </div>
        )}
        {!!notification && (
          <NavBarLinkNotification
            text={notification.text}
            onNotificationEnd={notification.onNotificationEnd}
            isHorizontal={isHorizontal}
          />
        )}
      </NavLink>
    )
  }
)

NavBarLink.displayName = 'NavBarLink'
