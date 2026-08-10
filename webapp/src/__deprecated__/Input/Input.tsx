import clsx from 'clsx'
import { memo, useRef, useState } from 'react'
import { useMount } from 'react-use'

import { Box } from '~/shared/components/Base/Box'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { ThemeColorType } from '~/shared/style/Theme'

import ActiveLine from './components/ActiveLine'
import BackgroundGradient from './components/BackgroundGradient'
import ClearIcon from './components/ClearIcon'
import { InputWrapper, StyledInput } from './components/Input.style'
import InputLabel from './components/InputLabel'
import InputSubmit from './components/InputSubmit'
import InputTooltip from './components/InputToolTip'

type InputType =
  | 'number'
  | 'password'
  | 'range'
  | 'text'
  | 'time'
  | 'date'
  | 'email'
  | 'datetime-local'

export interface InputProps
  extends Pick<React.HTMLProps<HTMLInputElement>, 'onKeyDown'> {
  value?: string | number
  icon?: IconTypes | undefined
  iconPosition?: 'left' | 'right'
  iconColor?: ThemeColorType
  isSmallScreen?: boolean
  label?: React.ReactNode
  placeholder?: string
  isErrored?: boolean
  isInvalid?: boolean
  rounded?: boolean
  showBg?: boolean
  onSubmit?: () => void
  onFocus?: (e) => void
  submitDisabled?: boolean
  autoFocus?: boolean
  type?: InputType
  height?: string | number | Array<string | number>
  toolTip?: string
  toolTipDirection?: 'top' | 'bottom'
  defaultValue?: string
  pattern?: string
  className?: string
  name?: string
  required?: boolean
  tooltipMiddle?: boolean
  readOnly?: boolean
  padding?: string
  onChange?(e: React.ChangeEvent<HTMLInputElement>): void
  onClear?(): void
  onBlur?(): void
}

/**
 * @deprecated Use ~/shared/components/Input
 */
export const Input = memo((props: InputProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const handleClear = () => {
    if (inputRef.current) inputRef.current.focus()
    if (props.onClear) props.onClear()
  }

  const handleKeyDown = (e) => {
    const { onKeyDown, onSubmit } = props

    if (onSubmit && e.keyCode === 13) {
      e.preventDefault()
      onSubmit()
      return
    }

    if (onKeyDown) {
      onKeyDown(e)
    }
  }

  const handleBlur = () => {
    const { onBlur } = props
    if (onBlur) {
      onBlur()
    }
    setFocused(false)
  }

  const handleFocus = (e) => {
    const { onFocus } = props
    if (onFocus) {
      onFocus(e)
    }
    setFocused(true)
  }

  useMount(() => {
    if (inputRef.current && props.autoFocus) {
      inputRef.current.focus()
    }
  })

  const {
    icon,
    iconColor,
    iconPosition = 'left',
    isSmallScreen,
    label,
    placeholder,
    onSubmit,
    value,
    onClear,
    isErrored,
    isInvalid,
    rounded,
    type,
    onChange,
    defaultValue,
    pattern,
    className,
    name,
    required,
    tooltipMiddle,
    readOnly,
    showBg,
    padding,
    ...extraProps
  } = props

  const hasValue = !!value

  return (
    <InputWrapper
      alignItems={rounded ? 'center' : 'flex-end'}
      pb={rounded ? 1 : ['2px', 2, 2]}
      pt={1}
      pl={icon || isSmallScreen ? '2px' : 2}
      p={padding ? padding : '0px 8px'}
      width="100%"
      flexWrap="nowrap"
      position="relative"
      rounded={rounded}
      isInvalid={isInvalid}
      isErrored={isErrored}
      height={props.height || [28, 32, 36]}
      className={clsx(className, { showBg })}
      {...extraProps}
    >
      {icon && (
        <Box
          px={2}
          style={
            iconPosition === 'right'
              ? {
                  position: 'absolute',
                  right: '0px'
                }
              : {}
          }
        >
          <Icon color={iconColor ? iconColor : 'purple9'} type={icon} height="16px" />
        </Box>
      )}

      <InputLabel label={label} isSmallScreen={isSmallScreen} />

      <StyledInput
        className="input"
        isSmallScreen={isSmallScreen}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        type={type}
        pattern={pattern}
        readOnly={readOnly}
        name={name}
        required={required}
        defaultValue={defaultValue}
      />

      {onClear && (
        <ClearIcon
          hasValue={hasValue}
          isSmallScreen={isSmallScreen}
          onClear={handleClear}
        />
      )}

      <InputSubmit
        hasValue={hasValue}
        onClick={onSubmit}
        disabled={props.submitDisabled}
      />

      {!rounded && (
        <ActiveLine
          hasValue={hasValue}
          focused={focused}
          isErrored={isErrored}
          isInvalid={isInvalid}
        />
      )}

      <BackgroundGradient
        focused={focused}
        isErrored={isErrored}
        isInvalid={isInvalid}
      />

      <InputTooltip
        isErrored={isErrored}
        toolTip={props.toolTip}
        toolTipDirection={props.toolTipDirection}
        tooltipMiddle={tooltipMiddle}
      />
    </InputWrapper>
  )
})

Input.displayName = 'Input'
