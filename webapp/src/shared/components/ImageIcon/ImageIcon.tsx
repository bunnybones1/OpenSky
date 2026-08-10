import clsx from 'clsx'
import { memo } from 'react'

import { IconSprinkles, IconStyle } from '~/shared/style/IconSprinkles.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { SharedIconProps } from '~/shared/types/icon'

import { ImageIcons, ImageIconTypes } from './ImageIconConfig'

export interface ImageIconProps extends SharedIconProps {
  type: ImageIconTypes
}

export const ImageIcon = memo(
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
    type,
    ...htmlProps
  }: ImageIconProps) => {
    const Icon = ImageIcons[type]

    if (!Icon) {
      console.warn('IMAGE ICON GOT WRONG ICON: ', type)
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
        <Icon height={height} />
      </div>
    )
  }
)

ImageIcon.displayName = 'ImageIcon'
