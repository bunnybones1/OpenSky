import { Children, cloneElement, isValidElement, memo, ReactElement } from 'react'

import {
  ButtonColorTypes,
  ButtonSizeSprinklesType
} from '~/shared/style/SharedButtonStyles.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ToggleButton, ToggleButtonProps } from './ToggleButton'

export interface ToggleButtonGroupProps<T> {
  value?: T | T[]
  onChange: (value: T) => void
  height: ButtonSizeSprinklesType['height']
  colorType: ButtonColorTypes
  children: ReactElement<ToggleButtonProps<T>, typeof ToggleButton>[]
}

const _ToggleButtonGroup = <T,>({
  value,
  children,
  onChange,
  colorType,
  height
}: ToggleButtonGroupProps<T>) => {
  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'nowrap'
      })}
    >
      {Children.map(children, (child, i) => {
        if (isValidElement(child) && !!child.type.type) {
          const isActive = !!value
            ? Array.isArray(value)
              ? value.includes(child.props.value)
              : value === child.props.value
            : false

          return cloneElement(child, {
            isActive,
            onChange,
            height,
            colorType,
            isFirst: i === 0,
            isLast: i === children.length - 1
          })
        } else {
          throw new Error(
            `Unable to render ToggleButtonGroup. Wrong child passed in: ${child.type}`
          )
        }
      })}
    </div>
  )
}

_ToggleButtonGroup.displayName = 'TabInput'

export const ToggleButtonGroup = memo(_ToggleButtonGroup) as typeof _ToggleButtonGroup
