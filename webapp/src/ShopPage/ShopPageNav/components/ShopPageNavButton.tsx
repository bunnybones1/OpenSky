import clsx from 'clsx'
import { memo, useCallback } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import {
  SubNavActiveBG,
  SubNavActiveGlow,
  SubNavButtonStyle,
  SubNavButtonTextStyle,
  SubNavButtonUnreadBadge,
  SubNavIcon,
  SubNavPulse
} from '~/shared/components/SubNav/exported/SubNavButton.css'
import { SubNavDivider } from '~/shared/components/SubNav/shared/components/SubNavDivider'
import { Text } from '~/shared/components/Text'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { SHOP_NAV_BUTTON_CLASSNAME } from '~/ShopPage/shared/constants'
import { useShopTopOffset } from '~/ShopPage/shared/hooks/useShopTopOffset'

const IconHeight = { base: '14px', tabletWide: '16px' } as const

interface ShopPageNavButtonProps {
  pulseText?: string
  icon?: IconTypes
  unread?: number
  text: string
  id: string
}

export const ShopPageNavButton = memo(
  ({ pulseText, icon, text, unread, id }: ShopPageNavButtonProps) => {
    const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()
    const { getAssetUrl } = useGetAssetContext()
    const topOffset = useShopTopOffset()

    const onClick = useCallback(() => {
      const section = document.querySelector(`section#${id}`) as HTMLElement | null

      if (!!section) {
        window.scrollTo({ top: section.offsetTop - topOffset, behavior: 'smooth' })
      }
    }, [id, topOffset])

    return (
      <div
        onClick={onClick}
        className={clsx(
          Sprinkles({
            height: 'full',
            display: 'flex',
            alignItems: 'center',
            position: 'relative'
          }),
          SubNavButtonStyle,
          `shop-nav-${id}`,
          SHOP_NAV_BUTTON_CLASSNAME
        )}
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
      </div>
    )
  }
)

ShopPageNavButton.displayName = 'ShopPageNavButton'
