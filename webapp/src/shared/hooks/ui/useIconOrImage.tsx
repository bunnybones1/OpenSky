import clsx from 'clsx'
import { useMemo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { IconKeys, IconTypes } from '~/shared/components/Icon/IconConfig'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import {
  ImageIconKeys,
  ImageIconTypes
} from '~/shared/components/ImageIcon/ImageIconConfig'
import { IconSprinkles } from '~/shared/style/IconSprinkles.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeColorType } from '~/shared/style/Theme'
import { SharedIconProps } from '~/shared/types/icon'

export const isImageIcon = (
  type: ImageIconTypes | IconTypes | string
): type is ImageIconTypes => {
  return (ImageIconKeys as string[]).includes(type)
}

export const isBaseIcon = (
  type: ImageIconTypes | IconTypes | string
): type is IconTypes => {
  return IconKeys.map((key) => key as string).includes(type)
}

export interface UseIconOrImageProps extends SharedIconProps {
  color?: ThemeColorType
}

export const getIconOrImage = (
  icon: IconTypes | ImageIconTypes | string | undefined,
  { color, height, ...props }: UseIconOrImageProps
) => {
  if (!icon) return null
  if (isBaseIcon(icon)) {
    return (
      <Icon
        type={icon}
        height={height || '16px'}
        {...props}
        color={color || 'white'}
      />
    )
  }
  if (isImageIcon(icon)) {
    return <ImageIcon type={icon} height={height || '16px'} {...props} />
  }

  const {
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
    cursor,
    onClick,
    className,
    ...rest
  } = props
  return (
    <img
      src={icon}
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
        IconSprinkles({ height }),
        className
      )}
      {...rest}
      onClick={onClick}
    />
  )
}

export const useIconOrImage = (
  icon: IconTypes | ImageIconTypes | string | undefined,
  props: UseIconOrImageProps
) => {
  return useMemo(() => {
    return getIconOrImage(icon, props)
  }, [icon, props])
}
