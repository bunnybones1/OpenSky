import clsx from 'clsx'
import { memo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import {
  SubNavButtonTextStyle,
  SubNavIcon
} from '~/shared/components/SubNav/exported/SubNavButton.css'
import { Text } from '~/shared/components/Text'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { FancyPageTitleBackImg, FancyPageTitleContainer } from './FancyPageTitle.css'

export interface FancyPageTitleProps {
  text: string
  icon?: IconTypes
  textClassName?: string
}

const IconHeight = { base: '16px', tabletWide: '24px' } as const
const FontSize = { base: '16px', tabletWide: '26px' } as const

export const FancyPageTitle = memo(
  ({ text, icon, textClassName }: FancyPageTitleProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const isTabletWide = useResponsiveQuery('tabletWide')

    return (
      <>
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              top: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              height: 'full'
            }),
            FancyPageTitleContainer
          )}
        >
          {!!getAssetUrl && (
            <img
              className={clsx(
                Sprinkles({
                  height: 'full',
                  position: 'absolute'
                }),
                FancyPageTitleBackImg
              )}
              src={getAssetUrl(
                `webapp/misc/title-edge-${isTabletWide ? 'large' : 'small'}.webp`
              )}
            />
          )}
          <div
            className={clsx(
              Sprinkles({
                height: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5,
                paddingX: {
                  base: '4px',
                  tabletWide: '20px'
                }
              }),
              textClassName
            )}
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
              fontSize={FontSize}
              fontFamily="condensed"
              fontWeight="600"
              className={SubNavButtonTextStyle}
              color="purple9"
            >
              {text}
            </Text>
          </div>
        </div>
      </>
    )
  }
)

FancyPageTitle.displayName = 'FancyPageTitle'
