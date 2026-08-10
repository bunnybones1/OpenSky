import clsx from 'clsx'
import {
  ComponentType,
  memo,
  MouseEventHandler,
  TouchEventHandler,
  useMemo
} from 'react'

import { SpriteKeys } from '~/clients/SoundClient/types'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'
import { useIconOrImage, UseIconOrImageProps } from '~/shared/hooks/ui/useIconOrImage'
import { IconSize } from '~/shared/style/IconSprinkles.css'
import {
  ButtonColorTypes,
  ButtonColorVariants,
  ButtonHoverVariants,
  ButtonSizeSprinkles,
  ButtonSizeSprinklesType,
  toggleClassName
} from '~/shared/style/SharedButtonStyles.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SoundClient } from '../clients'
import { ThemeColorType } from '../style/Theme'
import {
  ButtonBorderTypes,
  ButtonCheckBoxStyle,
  ButtonOuterRecipe,
  ButtonText,
  ButtonWrapperStyle,
  CheckBoxBgVariants
} from './Button.css'
import { Text, TextProps } from './Text'

export interface ButtonProps extends ButtonSizeSprinklesType {
  colorType: ButtonColorTypes
  frameType: ButtonBorderTypes
  onClick: MouseEventHandler<HTMLButtonElement>
  onMouseDown?: MouseEventHandler<HTMLButtonElement>
  onMouseUp?: MouseEventHandler<HTMLButtonElement>
  onTouchStart?: TouchEventHandler<HTMLButtonElement>
  onTouchEnd?: TouchEventHandler<HTMLButtonElement>
  onMouseLeave?: MouseEventHandler<HTMLButtonElement>
  text?: string
  isToggled?: boolean
  disabled?: boolean
  buttonId?: string
  className?: Parameters<typeof clsx>[0]
  buttonClassName?: Parameters<typeof clsx>[0]
  isHighlighted?: boolean
  isUppercase?: boolean
  hoverSound?: SpriteKeys | null
  clickSound?: SpriteKeys | null
  leftAdornment?: {
    icon?: IconTypes | ImageIconTypes
    image?: string
    component?: ComponentType
  }
  rightAdornment?: {
    icon?: IconTypes | ImageIconTypes
    image?: string
    component?: ComponentType
  }
  checked?: boolean
  paddingX?:
    | '12px'
    | '16px'
    | '20px'
    | '24px'
    | '32px'
    | '48px'
    | '96px'
    | '0px'
    | '4px'
    | '8px'
    | '60px'
    | undefined
  paddingXMobile?:
    | '12px'
    | '16px'
    | '20px'
    | '24px'
    | '32px'
    | '48px'
    | '96px'
    | '0px'
    | '4px'
    | '8px'
    | '60px'
    | undefined
}

export const Button = memo(
  ({
    colorType,
    height = '36px',
    frameType,
    onClick,
    onMouseDown,
    onMouseUp,
    onTouchStart,
    onTouchEnd,
    onMouseLeave,
    width,
    text,
    isHighlighted,
    isUppercase,
    disabled,
    leftAdornment,
    rightAdornment,
    hoverSound = 'CursorMainHover',
    clickSound = 'CursorMainClick',
    checked,
    className,
    isToggled,
    buttonClassName,
    buttonId
  }: ButtonProps) => {
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
        case '44px':
        case '52px':
        case '64px': {
          return '22px'
        }
        case '76px': {
          return '26px'
        }
        default:
          return '32px'
      }
    }, [height])

    const iconHeight = useMemo<IconSize>(() => {
      switch (height) {
        case '28px':
        case '32px': {
          return '14px'
        }
        case '36px': {
          return '16px'
        }
        case '44px':
        case '52px': {
          return '20px'
        }
        case '64px': {
          return '24px'
        }
        case '76px': {
          return '32px'
        }

        default:
          return '24px'
      }
    }, [height])

    const color = useMemo<ThemeColorType>(() => {
      return disabled ? 'purple7' : 'white'
    }, [disabled])

    const leftIconOpts = useMemo<UseIconOrImageProps>(() => {
      return {
        height: iconHeight,
        color,
        paddingRight: !!text ? '8px' : undefined
      }
    }, [color, iconHeight, text])

    const LeftIcon = useIconOrImage(
      leftAdornment?.icon || leftAdornment?.image,
      leftIconOpts
    )

    const LeftAdorment = useMemo(() => {
      if (LeftIcon) return LeftIcon
      if (leftAdornment?.component) return <leftAdornment.component />
      return null
    }, [LeftIcon, leftAdornment])

    const rightIconOpts = useMemo<UseIconOrImageProps>(() => {
      return {
        height: iconHeight,
        color,
        paddingLeft: !!text ? '8px' : undefined
      }
    }, [color, iconHeight, text])

    const RightIcon = useIconOrImage(
      rightAdornment?.icon || rightAdornment?.image,
      rightIconOpts
    )

    const RightAdornment = useMemo(() => {
      if (RightIcon) return RightIcon
      if (rightAdornment?.component) return <rightAdornment.component />
      return null
    }, [RightIcon, rightAdornment])

    return (
      <div
        className={clsx(
          ButtonWrapperStyle,
          className,
          ButtonHoverVariants[colorType],
          {
            isHighlighted,
            isDisabled: disabled
          }
        )}
        data-button-id={buttonId}
      >
        {checked !== undefined && (
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center'
              }),
              ButtonCheckBoxStyle,
              { isChecked: checked },
              CheckBoxBgVariants[colorType]
            )}
          >
            {checked === true && <Icon type="check" color="white" height="10px" />}
          </div>
        )}
        <button
          onMouseEnter={() => {
            if (!!hoverSound) SoundClient.playSound(hoverSound)
          }}
          onMouseDown={(e) => {
            if (!!clickSound) SoundClient.playSound(clickSound)
            if (onMouseDown) onMouseDown(e)
          }}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
          className={clsx(
            { isHighlighted, [toggleClassName]: isToggled },
            ButtonOuterRecipe({ frameType }),
            ButtonSizeSprinkles({ height, width }),
            ButtonColorVariants[colorType],
            buttonClassName
          )}
          disabled={disabled}
        >
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingX: !text ? '8px' : '12px',
              pointerEvents: 'none'
            })}
          >
            {LeftAdorment}
            {!!text && (
              <Text
                className={ButtonText}
                fontSize={fontSize}
                fontFamily="condensed"
                color={color}
                uppercase={isUppercase}
              >
                {text}
              </Text>
            )}
            {RightAdornment}
          </div>
        </button>
      </div>
    )
  }
)

Button.displayName = 'Button'
