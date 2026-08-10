import { FlagCodes } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo } from 'react'
import ReactCountryFlag from 'react-country-flag'

import { IconSprinkles, IconStyle } from '~/shared/style/IconSprinkles.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { SharedIconProps } from '~/shared/types/icon'

export interface FlagIconProps extends SharedIconProps {
  code: FlagCodes
}

export const FlagIcon = memo(
  ({
    position,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    pointerEvents,
    height,
    padding,
    paddingX,
    paddingY,
    margin,
    marginX,
    marginY,
    cursor,
    onClick,
    className,
    code,
    ...htmlProps
  }: FlagIconProps) => {
    return (
      <div
        className={clsx(
          Sprinkles({
            position,
            paddingTop,
            paddingBottom,
            paddingLeft,
            paddingRight,
            marginTop,
            marginBottom,
            marginLeft,
            marginRight,
            pointerEvents,
            padding,
            paddingX,
            paddingY,
            margin,
            marginX,
            marginY,
            cursor: !!onClick ? 'pointer' : cursor
          }),
          IconSprinkles({
            height
          }),
          IconStyle,
          className
        )}
        {...htmlProps}
      >
        <ReactCountryFlag
          countryCode={code}
          style={{ height: '100%', width: 'auto' }}
          className="flag-icon"
          svg
        />
      </div>
    )
  }
)

FlagIcon.displayName = 'FlagIcon'
