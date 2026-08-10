import styled from '@emotion/styled'
import clsx from 'clsx'
import isEqual from 'lodash-es/isEqual'
import type * as React from 'react'
import { memo, useEffect, useState } from 'react'

import { SpriteKeys } from '~/clients/SoundClient/types'
import { SoundClient } from '~/shared/clients'
import Glow from '~/shared/components/Glow'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'

import { Box } from '../shared/components/Base/Box'
import { FlexBox } from '../shared/components/Base/FlexBox'
import { ThemeColorType } from '../shared/style/Theme'
import { Theme } from './style/Theme'
import { Text } from './Text'
import ToolTipWrapper from './Tooltip'

export interface Item {
  text?: string
  toolTip?: string | React.ReactNode
  tooltipXOffset?: number
  tooltipYOffset?: number
  tooltipDelay?: number
  value: string | number
  flipValue?: undefined | string | number
  icon?: IconTypes
  iconColor?: ThemeColorType
  disabled?: boolean
  image?: string
}

interface Props extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: Item[]
  onChange: (selected: Array<string | number>) => void
  selected: Array<string | number>
  allowNoSelection?: boolean
  allowMultiSelection?: boolean
  maxSelectionLength?: number
  buttonWidth?: number | string | Array<number | string>
  className?: string
  hideToolTips?: boolean
  component?: React.FC<Item> | (() => React.FC<any>)
  fontWeight?: string
  isLocked?: boolean
  hoverSound?: SpriteKeys | null
  clickSound?: SpriteKeys | null
}

/**
 * @deprecated Use ~/shared/components/ToggleButtonGroup
 */
export const Tab = memo(
  ({
    selected: outsideSelected,
    allowMultiSelection,
    allowNoSelection,
    maxSelectionLength,
    className,
    items,
    component,
    buttonWidth,
    hideToolTips,
    hoverSound = 'CursorMainHover',
    clickSound = 'CursorMainClick',
    onChange,
    fontWeight = '300',
    isLocked = false,
    ...props
  }: Props) => {
    const [selected, updateSelected] =
      useState<Array<number | string>>(outsideSelected)

    useEffect(() => {
      // Update selected state if selected change w/o tab interaction (e.g. filters are cleared)
      if (isEqual(outsideSelected, selected)) return
      updateSelected(outsideSelected)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [outsideSelected])

    const changeTab = (item: Item) => {
      if (item.disabled || isLocked) return
      const isSelected = selected.includes(item.value)
      if (isSelected && selected.length === 1 && !allowNoSelection && !item.flipValue)
        return
      if (isSelected) {
        if (item.flipValue) {
          updateSelected([item.flipValue])
          onChange([item.flipValue])
        } else {
          const newSelected = selected.filter((val) => item.value !== val)
          updateSelected(newSelected)
          onChange(newSelected)
        }

        return
      }

      if (!allowMultiSelection) {
        updateSelected([item.value])
        onChange([item.value])
        return
      }

      if (maxSelectionLength && selected.length + 1 > maxSelectionLength) {
        const newSelected = selected
        newSelected.splice(0, 1)
        updateSelected([...newSelected, item.value])
        onChange([...newSelected, item.value])
        return
      }

      updateSelected([...selected, item.value])
      onChange([...selected, item.value])
    }

    return (
      <TabButtonWrapper
        className={className}
        color="white"
        flexWrap="nowrap"
        style={{ opacity: isLocked ? '0.3' : '1' }}
        {...props}
      >
        {items.map((item) => {
          const isSelected = selected.includes(item.value)
          let toolTip

          if (item.toolTip && !hideToolTips) {
            toolTip = item.toolTip
          }

          return (
            <ToolTipWrapper
              key={item.value}
              tooltip={toolTip}
              containerClassName={clsx('tabButtonWrapper', {
                isSelected,
                isDisabled: !!item.disabled
              })}
              xOffset={item.tooltipXOffset ? item.tooltipXOffset : 0}
              yOffset={item.tooltipYOffset ? item.tooltipYOffset : 0}
              delay={item.tooltipDelay ? item.tooltipDelay : 0}
            >
              <TabButton
                height={36}
                width={buttonWidth || [40, 40, 54]}
                onClick={() => changeTab(item)}
                type="centered-row"
                className="tabButton"
                onMouseEnter={() => {
                  if (!isSelected && !item.disabled && !!hoverSound) {
                    SoundClient.playSound(hoverSound)
                  }
                }}
                onMouseDown={() => {
                  if (!isSelected && !item.disabled && !!clickSound) {
                    SoundClient.playSound(clickSound)
                  }
                }}
              >
                <>
                  {isSelected && (
                    <Glow
                      duration={0.8}
                      borderRadius="0px 10px 0px 10px"
                      blur="4px"
                      color="purple10"
                    />
                  )}
                  {!!component ? (
                    component(item)
                  ) : item.icon ? (
                    <Box ml={1} mr={1}>
                      <Icon
                        className="tab-icon"
                        type={item.icon}
                        color={item.iconColor || 'white'}
                        height="24px"
                      />
                    </Box>
                  ) : (
                    <FlexBox type="centered-row">
                      {item.image && <img src={item.image} width="24px" />}
                      {item.text && (
                        <Text
                          fontFamily="condensed"
                          style={{
                            color: Theme.colors[!!item.disabled ? 'purple7' : 'white']
                          }}
                          fontSize={3}
                          px={2}
                          fontWeight={fontWeight}
                        >
                          {item.text}
                        </Text>
                      )}
                    </FlexBox>
                  )}
                </>
              </TabButton>
            </ToolTipWrapper>
          )
        })}
      </TabButtonWrapper>
    )
  }
)

Tab.displayName = 'Tab'

const TabButton = styled(FlexBox)`
  user-select: none;
  position: relative;
  border: 1px solid ${(props) => props.theme.colors.purple11};
  border-right: none;
  background: ${(props) => props.theme.colors.purple7};
  transition: 0.125s ease-in-out;
  filter: drop-shadow(0 0 0 ${(props) => props.theme.colors.purple10});
  cursor: pointer;
`

const TabButtonWrapper = styled(FlexBox)`
  .tabButtonWrapper {
    &:first-of-type {
      .tabButton {
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
      }
    }
    &:last-of-type {
      .tabButton {
        border-right: 1px solid ${(props) => props.theme.colors.purple11};
        border-bottom-right-radius: 4px;
        border-top-right-radius: 4px;
      }
    }
    &:not(.isDisabled) {
      .tabButton {
        background: linear-gradient(
          to bottom,
          #2e2152 0%,
          #2e2152 29%,
          #2e2152 49%,
          #241844 50%,
          #241844 100%
        );
      }
      &:active {
        .tabButton {
          background: ${(props) => props.theme.colors.purple8};
        }
      }
      &:hover {
        &:last-of-type {
          .tabButton {
            border-right: 1px solid ${(props) => props.theme.colors.purple9};
          }
        }
        + .tabButtonWrapper .tabButton {
          border-left-color: ${(props) => props.theme.colors.purple9};
        }
        .tabButton {
          border-color: ${(props) => props.theme.colors.purple9};
        }
        &:not(.isSelected) {
          background: linear-gradient(
            to bottom,
            #3e3068 0%,
            #3e3068 29%,
            #3e3068 49%,
            #33255b 50%,
            #33255b 100%
          );
          filter: drop-shadow(0 0 10px ${(props) => props.theme.colors.purple10});
        }
      }
    }
    &.isSelected {
      + .tabButtonWrapper .tabButton {
        border-left-color: ${(props) => props.theme.colors.purple9};
      }
      .tabButton {
        filter: drop-shadow(0 0 10px ${(props) => props.theme.colors.purple10});
        border-color: ${(props) => props.theme.colors.purple9};
        background: ${(props) => props.theme.colors.purple7};
      }
    }
    &.isDisabled {
      .tabButton {
        border-color: ${(props) => props.theme.colors.purple11};
        background: ${(props) => props.theme.colors.purple3};
        color: ${(props) => props.theme.colors.white};
      }
    }
  }
`
