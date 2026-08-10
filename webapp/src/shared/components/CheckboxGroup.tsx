import clsx from 'clsx'
import { Children, cloneElement, isValidElement, memo, ReactElement } from 'react'

import { Checkbox, CheckboxProps } from './Checkbox'
import { CheckboxGroupStyle } from './CheckboxGroup.css'

export interface CheckboxGroupProps<T> {
  value: T | readonly T[]
  onChange: (value: T) => void
  orientation: 'vertical' | 'horizontal'
  children: (ReactElement<CheckboxProps<T>, typeof Checkbox> | false)[]
}

const _CheckboxGroup = <T,>({
  value,
  orientation = 'vertical',
  onChange,
  children
}: CheckboxGroupProps<T>) => {
  return (
    <div
      className={clsx(CheckboxGroupStyle, { isVertical: orientation === 'vertical' })}
    >
      {Children.map(children, (child) => {
        if (!!child && !!child.type && !!child.type.type && isValidElement(child)) {
          const isActive = !!value
            ? Array.isArray(value)
              ? value.includes(child.props.value)
              : value === child.props.value
            : false

          return cloneElement(child, {
            isActive,
            onChange
          })
        } else if (!!child && !!child?.type) {
          throw new Error(
            `Unable to render CheckboxGroup. Wrong child passed in: ${child.type}`
          )
        } else {
          return null
        }
      })}
    </div>
  )
}

export const CheckboxGroup = memo(_CheckboxGroup) as typeof _CheckboxGroup

_CheckboxGroup.displayName = 'CheckboxGroup'
