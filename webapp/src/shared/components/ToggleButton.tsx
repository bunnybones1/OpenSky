import clsx from 'clsx'
import { memo, ReactNode, useCallback, useMemo } from 'react'

import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'
import { useIconOrImage, UseIconOrImageProps } from '~/shared/hooks/ui/useIconOrImage'
import { IconSize } from '~/shared/style/IconSprinkles.css'
import {
  ButtonColorTypes,
  ButtonColorVariants,
  ButtonHeightTypes,
  ButtonHoverVariants,
  ButtonSizeSprinkles,
  toggleClassName
} from '~/shared/style/SharedButtonStyles.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { TooltipPadding } from '~/shared/types/tooltip'

import { SoundClient } from '../clients'
import { ThemeColorType } from '../style/Theme'
import { SmallUnreadBadge } from './SmallUnreadBadge'
import { Text, TextProps } from './Text'
import { BaseToggleButton } from './ToggleButton.css'
import { Tooltip } from './Tooltip/Tooltip'

const ToggleButtonTooltipWrapper = memo(
  ({
    tooltip,
    tooltipPadding,
    children
  }: {
    tooltip?: string
    tooltipPadding?: TooltipPadding
    children: ReactNode
  }) => {
    if (tooltip) {
      return (
        <Tooltip
          className={Sprinkles({ position: 'relative' })}
          placement="top"
          tooltip={tooltip}
          tooltipPadding={tooltipPadding}
        >
          {children}
        </Tooltip>
      )
    }

    return <>{children}</>
  }
)

ToggleButtonTooltipWrapper.displayName = 'ToggleButtonTooltipWrapper'

export interface ToggleButtonProps<T> {
  value: T
  colorType?: ButtonColorTypes
  height?: ButtonHeightTypes
  disabled?: boolean
  text?: string
  isActive?: boolean
  iconHeight?: IconSize
  className?: string
  leftAdornment?: {
    icon?: IconTypes | ImageIconTypes
    image?: string
  }
  rightAdornment?: {
    icon?: IconTypes | ImageIconTypes
    image?: string
  }
  onChange?: (value: T) => void
  extraPadding?: boolean
  tooltip?: string
  tooltipPadding?: TooltipPadding
  isFirst?: boolean
  isLast?: boolean
  unread?: number
}

const _ToggleButton = <T,>({
  value,
  onChange,
  colorType = 'default',
  height = '36px',
  text,
  disabled,
  isActive,
  leftAdornment,
  rightAdornment,
  extraPadding,
  tooltip,
  tooltipPadding,
  isLast,
  isFirst,
  iconHeight,
  className,
  unread
}: ToggleButtonProps<T>) => {
  const onClick = useCallback(() => {
    if (onChange) onChange(value)
  }, [onChange, value])

  const fontSize = useMemo<TextProps['fontSize']>(() => {
    switch (height) {
      case '28px': {
        return '12px'
      }
      case '32px': {
        return '14px'
      }
      case '36px': {
        return '16px'
      }
      case '52px': {
        return '22px'
      }
      default:
        return '34px'
    }
  }, [height])

  const _iconHeight = useMemo<IconSize>(() => {
    if (iconHeight) return iconHeight
    switch (height) {
      case '28px':
      case '32px': {
        return '14px'
      }
      case '36px':
      case '52px': {
        return '16px'
      }

      default:
        return '24px'
    }
  }, [height, iconHeight])

  const color = useMemo<ThemeColorType>(() => {
    return disabled ? 'purple7' : 'white'
  }, [disabled])

  const leftAdornmentOpts = useMemo<UseIconOrImageProps>(
    () => ({
      color,
      height: _iconHeight,
      paddingRight: !!text ? '8px' : undefined
    }),
    [color, _iconHeight, text]
  )

  const LeftAdornment = useIconOrImage(
    leftAdornment?.icon || leftAdornment?.image,
    leftAdornmentOpts
  )

  const rightAdornmentOpts = useMemo<UseIconOrImageProps>(
    () => ({
      color,
      height: _iconHeight,
      paddingLeft: !!text ? '8px' : undefined
    }),
    [color, _iconHeight, text]
  )

  const RightAdornment = useIconOrImage(
    rightAdornment?.icon || rightAdornment?.image,
    rightAdornmentOpts
  )

  return (
    <ToggleButtonTooltipWrapper tooltip={tooltip} tooltipPadding={tooltipPadding}>
      <button
        onMouseDown={() => SoundClient.playSound('CursorMainClick')}
        onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'all',
            cursor: 'pointer',
            position: 'relative'
          }),
          BaseToggleButton,
          ButtonColorVariants[colorType],
          ButtonHoverVariants[colorType],
          colorType,
          { [toggleClassName]: isActive, isDisabled: disabled, isLast, isFirst },
          ButtonSizeSprinkles({ height }),
          className
        )}
        data-tab-id={value}
        onClick={onClick}
        disabled={disabled}
      >
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingX: extraPadding ? '12px' : undefined
          })}
        >
          {LeftAdornment}
          {!!text && (
            <Text fontSize={fontSize} fontFamily="condensed" color={color}>
              {text}
            </Text>
          )}
          {RightAdornment}
        </div>
      </button>
      {!!unread && <SmallUnreadBadge unread={unread} />}
    </ToggleButtonTooltipWrapper>
  )
}

export const ToggleButton = memo(_ToggleButton)

ToggleButton.displayName = 'ToggleButton'
