import styled from '@emotion/styled'
import clsx from 'clsx'
import { useRef, useState } from 'react'
import * as React from 'react'
import { useUnmount } from 'react-use'

import { Theme } from '~/__deprecated__/style/Theme'
import { Text } from '~/__deprecated__/Text'
import { SoundClient } from '~/shared/clients'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'

import {
  SelectListItem,
  StyledSelect,
  StyledSelectList
} from './components/Select.style'
import { getIcon, getSelected } from './helpers'

export interface ItemType {
  value: string
  label?: string | JSX.Element
  icon?: IconTypes
  image?: string
  disabled?: boolean
  selected?: boolean
}

interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  multi: boolean
  ascendingList?: boolean
  clearable: boolean
  placeholder: string
  placeholderIcon?: IconTypes
  options: ItemType[]
  onChange: (selected) => void
  className?: string
  maxListHeight?: string | number | Array<string | number>
  showBg?: boolean
  small?: boolean
  maxLabelLength?: number
  isOnRight?: boolean
  isLarge?: boolean
}

const SelectIcon = styled(Box)`
  .hidden {
    display: none;
  }
`
/**
 * @deprecated Use ~/shared/components/Select
 */
const Select = (props: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const {
    multi,
    ascendingList,
    clearable,
    options,
    onChange,
    className,
    maxListHeight,
    showBg,
    small,
    maxLabelLength,
    isOnRight,
    isLarge,
    ...rest
  } = props

  const list = useRef<HTMLDivElement>(null)
  const clearIcon = useRef<HTMLDivElement>(null)
  const arrowDown = useRef<HTMLDivElement>(null)
  const arrowUp = useRef<HTMLDivElement>(null)

  useUnmount(() => {
    document.removeEventListener('click', hide)
  })

  const handleList = (e, hasValue) => {
    // If the clear icon is present, dont close the list.
    if (
      clearIcon.current &&
      clearIcon.current!.contains(e.target) &&
      hasValue &&
      !isOpen &&
      clearable
    ) {
      return
    }
    setIsOpen(!isOpen)
    if (!isOpen) {
      document.addEventListener('click', hide)
    } else {
      document.removeEventListener('click', hide)
    }
  }

  const hide = (e) => {
    const selected = getSelected(options, multi)
    const hasValue = multi ? selected.length !== 0 : selected !== ''

    if (
      (list.current && list.current!.contains(e.target)) ||
      (clearIcon.current && clearIcon.current!.contains(e.target) && hasValue) ||
      (list.current && list.current!.contains(arrowDown.current!))
    ) {
      return
    }

    setIsOpen(false)

    document.removeEventListener('click', hide)
  }

  const selectItem = (e, value: ItemType['value']) => {
    const selected = getSelected(options, multi)

    if (multi) {
      e.nativeEvent.stopImmediatePropagation()

      const newSelected = selected.includes(value)
        ? Array.from(selected).filter((item) => item !== value)
        : selected.concat(value)

      const newValues = Array.from(newSelected).map((selectedValue) => {
        const selectedOption = options.find(
          (option) => option.value === selectedValue
        )

        return selectedOption ? selectedOption.value : null
      })

      onChange(newValues.length ? newValues : undefined)
    } else {
      const selectedOption = options.find((option) => option.value === value)
      if (selectedOption) {
        onChange(selectedOption.value)
      }
      setIsOpen(false)
    }
  }

  const handleClear = (hasValue: boolean) => {
    if (isOpen) return
    if (hasValue) {
      onChange(undefined)
    }
  }

  const getLabel = () => {
    const { multi, placeholderIcon, options, placeholder } = props

    const selected = getSelected(options, multi)

    const hasValues = multi ? selected.length !== 0 : selected !== ''

    if (!hasValues) {
      return (
        <>
          {placeholderIcon && (
            <Icon type={placeholderIcon} height="16px" color="white" />
          )}

          <Text
            fontSize={[2, 2, 3, 3]}
            color="white"
            fontFamily="condensed"
            pl={placeholderIcon ? 2 : 0}
            {...rest}
          >
            {placeholder}
          </Text>
        </>
      )
    }

    if (!multi) {
      const selectedItem = options.find((item) => item.value === selected)

      if (!selectedItem) {
        return null
      }

      return (
        <>
          {placeholder && (
            <Text
              fontSize={[2, 2, 3, 3]}
              color="purple8"
              fontFamily="condensed"
              pr={2}
            >
              {`${placeholder}:`}
            </Text>
          )}

          {selectedItem.image && <img src={selectedItem.image} width="24px" />}

          {selectedItem.icon && (
            <Icon type={selectedItem.icon || ''} height="14px" color="white" />
          )}

          {!small && (
            <Text
              fontSize={[2, 2, 3, 3]}
              color="white"
              fontFamily="condensed"
              pl={selectedItem.icon || selectedItem.image ? 2 : 0}
              {...rest}
            >
              {selectedItem.label}
            </Text>
          )}
        </>
      )
    }

    return (
      <>
        {Array.from(selected).map((id, i) => {
          const item = options.find((option) => option.value === id)

          if (!item || (maxLabelLength && i >= maxLabelLength)) {
            return null
          }

          if (item.image) {
            return (
              <img
                src={item.image}
                width="24px"
                style={{ marginRight: '2px' }}
                key={`${item.icon}-${i}`}
              />
            )
          }
          if (item.icon) {
            return (
              <Box pr={2} key={`${item.icon}-${i}`}>
                <Icon color="white" type={item.icon || ''} height="14px" />
              </Box>
            )
          }

          return (
            <Text
              fontSize={[2, 2, 3, 3]}
              color="white"
              fontFamily="condensed"
              pl={i !== 0 ? 2 : 0}
              key={`${item.label}-${i}`}
              {...rest}
            >
              {item.label}
            </Text>
          )
        })}
      </>
    )
  }

  const selected = getSelected(options, multi)
  const hasValue = multi ? selected.length !== 0 : selected !== ''
  const iconName = getIcon(isOpen, hasValue, clearable)

  return (
    <StyledSelect
      alignItems="center"
      justifyContent="space-between"
      borderRadius={4}
      className={className}
      width="100%"
      position="relative"
      isOpen={isOpen}
      ref={list}
      hasValue={hasValue}
      clearable={clearable}
      style={{
        backgroundImage: showBg
          ? `linear-gradient(to bottom, #2e2152 0%, #2e2152 
          29%, #2e2152 49%, #241844 50%, #241844 100%)`
          : undefined
      }}
      onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
      onMouseDown={() => SoundClient.playSound('CursorMainClick')}
      {...rest}
    >
      <FlexBox
        alignItems="center"
        justifyContent="space-between"
        width="100%"
        height="100%"
        px={[2, 2, 3, 3]}
        onClick={(e) => handleList(e, hasValue)}
        flexWrap="nowrap"
      >
        <FlexBox flex={1} type="centered-start-row">
          {getLabel()}
        </FlexBox>
        {maxLabelLength && selected.length > maxLabelLength && multi && (
          <FlexBox
            height={21}
            minWidth={21}
            width="auto"
            zIndex={3}
            style={{
              backgroundColor: Theme.colors.warm6,
              borderRadius: '100%'
            }}
            border="2.5px solid"
            borderColor="black"
            type="centered-row"
          >
            <Text
              fontFamily="condensed"
              fontSize={1}
              color="black"
              fontWeight="bold"
              lineHeight="12px"
            >
              +{selected.length - maxLabelLength}
            </Text>
          </FlexBox>
        )}
        <SelectIcon
          ref={clearIcon}
          onClick={hasValue && clearable ? () => handleClear(hasValue) : undefined}
        >
          {iconName === 'close-circled' && (
            <Icon type="close-circled" color="white" height="14px" />
          )}
          <Box
            ref={arrowUp}
            style={{ display: iconName === 'caret-up' ? 'block' : 'none' }}
          >
            <Icon
              type="caret-up"
              color="white"
              height="14px"
              style={{ marginLeft: '5px' }}
              className={iconName !== 'caret-up' ? 'hidden' : ''}
            />
          </Box>

          <Box
            ref={arrowDown}
            style={{ display: iconName === 'caret-down' ? 'block' : 'none' }}
          >
            <Icon
              type="caret-down"
              color="white"
              height="14px"
              style={{ marginLeft: '5px' }}
              className={iconName !== 'caret-down' ? 'hidden' : ''}
            />
          </Box>
        </SelectIcon>
      </FlexBox>

      {isOpen && (
        <StyledSelectList
          maxHeight={maxListHeight || [200, 300, 'unset']}
          style={
            isOnRight
              ? { right: 0, left: 'initial', minWidth: isLarge ? '175px' : '170px' }
              : { minWidth: isLarge ? '175px' : '170px' }
          }
          className={clsx({ isAscending: ascendingList })}
        >
          {options.map((option, i) => {
            const isSelected = !multi
              ? selected === option.value
              : selected.includes(option.value)

            const disabled = !!option.disabled

            return (
              <SelectListItem
                key={`${option.label}-${i}`}
                data-key={option.value}
                onClick={!disabled ? (e) => selectItem(e, option.value) : undefined}
                isSelected={isSelected}
                disabled={disabled}
                onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
              >
                {option.icon && (
                  <Box pr={2}>
                    <Icon
                      type={option.icon}
                      color={disabled ? 'purple7' : 'white'}
                      height="14px"
                    />
                  </Box>
                )}

                {option.image && (
                  <img
                    src={option.image}
                    width="24px"
                    style={{ marginRight: '10px' }}
                  />
                )}

                {option.label}
                {isSelected && (
                  <Box ml="auto" pr={3}>
                    <Icon type="check" color="white" height="14px" />
                  </Box>
                )}
              </SelectListItem>
            )
          })}
        </StyledSelectList>
      )}
    </StyledSelect>
  )
}

Select.defaultProps = {
  multi: false,
  clearable: true,
  small: false
}

export default Select
