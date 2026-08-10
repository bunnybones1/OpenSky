import clsx from 'clsx'
import { memo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { SoundClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { Text } from '~/shared/components/Text'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SubNavDivider } from '../shared/components/SubNavDivider'
import {
  SubNavActiveBG,
  SubNavActiveGlow,
  SubNavButtonStyle,
  SubNavButtonTextStyle,
  SubNavButtonUnreadBadge,
  SubNavIcon,
  SubNavPulse
} from './SubNavButton.css'

export interface SubNavButtonProps {
  text: string
  pulseText?: string
  to: string
  onClick?: () => void
  unread?: number
  id: string
  icon?: IconTypes
  isDisabled?: boolean
  isInactive?: boolean
}
const IconHeight = { base: '14px', tabletWide: '16px' } as const

export const SubNavButton = memo(
  ({
    text,
    to,
    icon,
    id,
    onClick,
    unread,
    isDisabled,
    pulseText,
    isInactive
  }: SubNavButtonProps) => {
    const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()
    const { getAssetUrl } = useGetAssetContext()

    const location = useLocation()
    const isActive = to.includes(location.pathname)

    return (
      <>
        <NavLink
          onMouseEnter={() => {
            if (!isActive) SoundClient.playSound('CursorMainHover')
          }}
          onMouseDown={() => {
            if (!isActive) SoundClient.playSound('CursorMainClick')
          }}
          to={to}
          data-link-id={id}
          onClick={onClick}
          className={({ isActive }) =>
            clsx(
              Sprinkles({
                height: 'full',
                display: 'flex',
                alignItems: 'center',
                position: 'relative'
              }),
              SubNavButtonStyle,
              { isActive: isInactive ? false : isActive, isDisabled }
            )
          }
        >
          {!!pulseText && (
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
                SubNavPulse
              )}
            >
              {pulseText}
            </div>
          )}
          <div
            className={Sprinkles({
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingX: {
                base: '12px',
                tabletWide: '20px'
              }
            })}
          >
            {!!icon && (
              <Icon
                type={icon}
                className={SubNavIcon}
                height={IconHeight}
                color="purple8"
              />
            )}
            <Text
              fontSize={{ base: '12px', tabletWide: '16px' }}
              fontFamily="condensed"
              className={SubNavButtonTextStyle}
              color="purple9"
            >
              {text}
            </Text>
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/backgrounds/selected-desktop.webp')}
                ref={imgRef}
                onLoad={handleLoad}
                className={clsx(
                  Sprinkles({
                    position: 'absolute',
                    bottom: 0,
                    opacity: 0
                  }),
                  { isLoaded },
                  SubNavActiveGlow
                )}
              />
            )}
          </div>
          <div
            className={clsx(
              Sprinkles({
                height: 'full',
                width: 'full',
                position: 'absolute',
                opacity: 0
              }),
              SubNavActiveBG
            )}
          />
          <SubNavDivider />
          {!!unread && (
            <div
              className={clsx(
                Sprinkles({
                  backgroundColor: 'warm6',
                  position: 'absolute',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid',
                  borderColor: 'purple1'
                }),
                SubNavButtonUnreadBadge
              )}
            >
              <Text
                color="black"
                fontSize="10px"
                fontWeight="400"
                fontFamily="condensed"
              >
                {unread > 99 ? '99+' : unread}
              </Text>
            </div>
          )}
        </NavLink>
      </>
    )
  }
)

SubNavButton.displayName = 'SubNavButton'
