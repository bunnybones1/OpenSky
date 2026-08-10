import { Placement } from '@popperjs/core'
import clsx from 'clsx'
import {
  Children,
  cloneElement,
  isValidElement,
  memo,
  ReactElement,
  useCallback,
  useMemo,
  useState
} from 'react'
import { PopperOptions, usePopperTooltip } from 'react-popper-tooltip'

import { SpriteKeys } from '~/clients/SoundClient/types'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'
import { SmallUnreadBadge } from '~/shared/components/SmallUnreadBadge'
import { useIconOrImage, UseIconOrImageProps } from '~/shared/hooks/ui/useIconOrImage'
import { IconSize } from '~/shared/style/IconSprinkles.css'
import {
  ButtonColorTypes,
  ButtonColorVariants,
  ButtonHoverVariants,
  toggleClassName
} from '~/shared/style/SharedButtonStyles.css'

import { SoundClient } from '../clients'
import { ThemeColorType } from '../style/Theme'
import {
  BaseSelectStyle,
  OptionsWrapperBorderVariants,
  SelectOptionsWrapper,
  TitleStyle
} from './Select.css'
import { SelectOption, SelectOptionProps } from './SelectOption'
import { Text } from './Text'

const FontSize = { mobile: '14px', tablet: '14px', desktop: '16px' } as const

export interface SelectProps<T> {
  className?: Parameters<typeof clsx>[0]
  title?: string
  text?: string
  colorType: ButtonColorTypes
  isFullWidth?: boolean
  isDisabled?: boolean
  adornmentHeight?: IconSize
  optionsMatchParentWidth?: boolean
  optionsPlacement?: Placement
  optionsClassName?: string
  hoverSound?: SpriteKeys | null
  clickSound?: SpriteKeys | null
  adornment?: {
    icon?: {
      type: IconTypes | ImageIconTypes
      color?: ThemeColorType
    }
    image?: string
  }
  value?: T | T[]
  unread?: number
  onChange: (value: T) => void
  children: (ReactElement<SelectOptionProps<T>, typeof SelectOption> | false)[]
}

const _Select = <T,>({
  text,
  title,
  adornment,
  children,
  value,
  onChange,
  colorType,
  isFullWidth,
  isDisabled,
  hoverSound = 'CursorMainHover',
  clickSound = 'CursorMainClick',
  className,
  optionsMatchParentWidth = true,
  adornmentHeight,
  optionsPlacement,
  unread,
  optionsClassName
}: SelectProps<T>) => {
  const [isVisible, setIsVisible] = useState(false)

  const modifiers = useMemo<PopperOptions['modifiers']>(
    () => [
      {
        name: 'sameWidth',
        enabled: true,
        fn: ({ state }) => {
          state.styles.popper.width = `${state.rects.reference.width}px`
        },
        phase: 'beforeWrite',
        requires: ['computeStyles'],
        effect: ({ state }) => {
          state.elements.popper.style.width = `${
            (state.elements.reference as Element).clientWidth
          }px`
        }
      },
      { name: 'offset', options: { offset: [0, 8] } }
    ],
    []
  )

  const toggleVisibility = useCallback(() => {
    setIsVisible((_isVisible) => !_isVisible)
  }, [])

  const { setTriggerRef, visible, getTooltipProps, setTooltipRef, triggerRef } =
    usePopperTooltip(
      {
        trigger: 'click',
        placement: optionsPlacement || 'bottom-start',
        onVisibleChange: toggleVisibility,
        closeOnOutsideClick: true
      },
      optionsMatchParentWidth
        ? {
            modifiers,
            strategy: 'absolute'
          }
        : { strategy: 'absolute' }
    )

  const _onChange = useCallback(
    (value: T) => {
      triggerRef?.click()
      onChange(value)
    },
    [onChange, triggerRef]
  )

  const adornmentOpts = useMemo<UseIconOrImageProps>(
    () => ({
      color: adornment?.icon?.color || 'white',
      height: adornmentHeight || '16px',
      paddingRight: '8px'
    }),
    [adornment?.icon?.color, adornmentHeight]
  )

  const Adornment = useIconOrImage(
    adornment?.icon?.type || adornment?.image,
    adornmentOpts
  )

  return (
    <>
      <button
        onMouseEnter={() => {
          if (!!hoverSound) SoundClient.playSound(hoverSound)
        }}
        onMouseDown={() => {
          if (!!clickSound) SoundClient.playSound(clickSound)
        }}
        className={clsx(
          className,
          BaseSelectStyle,
          ButtonHoverVariants[colorType],
          ButtonColorVariants[colorType],
          { [toggleClassName]: visible, isFullWidth, isDisabled }
        )}
        ref={setTriggerRef}
        disabled={isDisabled}
      >
        {!!title && (
          <Text
            fontSize={FontSize}
            fontWeight="400"
            fontFamily="condensed"
            className={TitleStyle[colorType]}
            marginRight="8px"
          >
            {`${title}:`}
          </Text>
        )}
        {Adornment}
        {!!text && (
          <Text
            fontSize={FontSize}
            color="white"
            fontFamily="condensed"
            fontWeight="400"
            marginRight="8px"
          >
            {text}
          </Text>
        )}
        <Icon
          type={isVisible ? 'caret-up' : 'caret-down'}
          color="white"
          height="16px"
          marginLeft="auto"
        />
        {!!unread && <SmallUnreadBadge unread={unread} />}
      </button>
      {visible && (
        <div
          className={clsx(
            SelectOptionsWrapper,
            OptionsWrapperBorderVariants[colorType],
            optionsClassName
          )}
          ref={setTooltipRef}
          {...getTooltipProps()}
        >
          {Children.map(children, (child) => {
            if (
              !!child &&
              !!child.type &&
              !!child.type.type &&
              isValidElement(child)
            ) {
              let isActive = false

              if (!!value) {
                if (Array.isArray(value)) {
                  isActive = value.includes(child.props.value)
                } else {
                  isActive = value === child.props.value
                }
              }

              return cloneElement(child, {
                isActive,
                onChange: _onChange,
                colorType
              })
            } else if (!!child && !!child?.type) {
              throw new Error(
                `Unable to render Select. Wrong child passed in: ${child.type}`
              )
            } else {
              return null
            }
          })}
        </div>
      )}
    </>
  )
}

export const Select = memo(_Select) as typeof _Select
