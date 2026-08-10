import 'react-popper-tooltip/dist/styles.css'

import clsx from 'clsx'
import { ChangeEvent, FormEvent, HTMLProps, memo, useCallback, useMemo } from 'react'
import { usePopperTooltip } from 'react-popper-tooltip'

import { SoundClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'
import { useIconOrImage, UseIconOrImageProps } from '~/shared/hooks/ui/useIconOrImage'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeColorType } from '~/shared/style/Theme'

import { Text } from '../Text'
import {
  InputStyle,
  LeftIconStyle,
  RightIconWrapperStyle,
  TooltipArrowStyle,
  TooltipWrapperStyle
} from './Input.css'
export interface InputProps extends Pick<HTMLProps<HTMLInputElement>, 'onKeyDown'> {
  onChange: (value: string) => void
  onSubmit?: () => void
  value: string
  formClassName?: string
  inputClassname?: string
  placeholder?: string
  leftIcon?: {
    type: IconTypes | ImageIconTypes
    color?: ThemeColorType
  }
  rightIcon?: {
    type: IconTypes | ImageIconTypes
    color?: ThemeColorType
  }
  onClear?: () => void
  errorMessage?: string
  inputId?: string
  disabled?: boolean
}

export const Input = memo(
  ({
    placeholder,
    value,
    onChange,
    onSubmit,
    leftIcon,
    rightIcon,
    onClear,
    errorMessage,
    formClassName,
    inputClassname,
    inputId,
    disabled,
    onKeyDown
  }: InputProps) => {
    const { getTooltipProps, setTooltipRef, setTriggerRef, visible, getArrowProps } =
      usePopperTooltip(
        {
          trigger: 'focus',
          placement: 'bottom-start'
        },
        { strategy: 'fixed' }
      )

    const _onSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (onSubmit) {
          onSubmit()
        }
      },
      [onSubmit]
    )

    const _onChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value)
      },
      [onChange]
    )

    const leftIconOpts = useMemo<UseIconOrImageProps>(
      () => ({
        height: '16px',
        color: disabled ? 'purple7' : leftIcon?.color || 'white',
        className: LeftIconStyle
      }),
      [disabled, leftIcon?.color]
    )

    const LeftIcon = useIconOrImage(leftIcon?.type, leftIconOpts)

    const rightIconOpts = useMemo<UseIconOrImageProps>(
      () => ({
        height: '16px',
        color: rightIcon?.color || 'white'
      }),
      [rightIcon?.color]
    )

    const RightIcon = useIconOrImage(rightIcon?.type, rightIconOpts)

    return (
      <form
        className={clsx(
          Sprinkles({
            position: 'relative',
            display: 'inline-grid'
          }),
          formClassName
        )}
        onSubmit={_onSubmit}
        onMouseEnter={() => {
          if (!disabled) SoundClient.playSound('CursorMainHover')
        }}
        onMouseDown={() => {
          if (!disabled) SoundClient.playSound('CursorMainClick')
        }}
      >
        {LeftIcon}
        <input
          ref={setTriggerRef}
          data-input-id={inputId}
          disabled={disabled}
          onKeyDown={onKeyDown}
          className={clsx(
            InputStyle,
            Sprinkles({ fontSize: '16px', color: 'white', fontWeight: '500' }),
            {
              hasLeftIcon: !!leftIcon,
              hasRightIcon: !!rightIcon,
              hasClearButton: !!onClear,
              hasError: !!errorMessage
            },
            inputClassname
          )}
          placeholder={placeholder}
          value={value}
          onChange={_onChange}
        />
        {(!!RightIcon || (!!onClear && !!value && !disabled)) && (
          <div className={RightIconWrapperStyle}>
            {!!onClear && !!value && (
              <Icon type="close" height="16px" onClick={onClear} color="white" />
            )}
            {RightIcon}
          </div>
        )}
        <input type="submit" className={Sprinkles({ display: 'none' })} />
        {visible && !!errorMessage && (
          <div
            ref={setTooltipRef}
            {...getTooltipProps()}
            className={TooltipWrapperStyle}
          >
            <div className={TooltipArrowStyle} {...getArrowProps()} />

            <Icon type="alert" height="16px" color="white" paddingRight="8px" />
            <Text color="white" fontSize="16px">
              {errorMessage}
            </Text>
          </div>
        )}
      </form>
    )
  }
)

Input.displayName = 'Input'
