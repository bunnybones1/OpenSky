import clsx from 'clsx'
import { memo } from 'react'

import { IconSprinkles, IconStyle } from '~/shared/style/IconSprinkles.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeColorType } from '~/shared/style/Theme'
import { SharedIconProps } from '~/shared/types/icon'

import { Icons, IconTypes } from './IconConfig'

export type { IconTypes }

export interface IconProps extends SharedIconProps {
  type: IconTypes
  color: ThemeColorType
}

export const Icon = memo(
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
    color,
    type,
    ...htmlProps
  }: IconProps) => {
    const Icon = Icons[type]

    if (!Icon) {
      console.warn('ICON GOT WRONG ICON: ', type)
      return null
    }

    return (
      <div
        onClick={onClick}
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
        <Icon color={color} height={height} />
      </div>
    )
  }
)

Icon.displayName = 'Icon'
