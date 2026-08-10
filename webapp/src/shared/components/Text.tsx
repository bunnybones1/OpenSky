import clsx from 'clsx'
import { AllHTMLAttributes, memo, ReactNode } from 'react'

import { Sprinkles, SprinklesParams } from '~/shared/style/Sprinkles.css'
import { ThemeColorType } from '~/shared/style/Theme'

import { BaseTextStyle } from './Text.css'

export interface TextProps
  extends Pick<
    SprinklesParams,
    | 'marginLeft'
    | 'marginRight'
    | 'marginTop'
    | 'marginBottom'
    | 'margin'
    | 'marginX'
    | 'marginY'
    | 'cursor'
    | 'textAlign'
    | 'fontSize'
    | 'fontFamily'
    | 'fontWeight'
    | 'color'
  > {
  children: ReactNode
  color?: ThemeColorType
  className?: string
  uppercase?: boolean
  noWrap?: boolean
  onClick?: AllHTMLAttributes<HTMLElement>['onClick']
}

export const Text = memo(
  ({
    children,
    fontSize = '16px',
    fontWeight = '500',
    fontFamily = 'normal',
    color,
    textAlign,
    className,
    margin,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    marginX,
    marginY,
    onClick,
    cursor,
    uppercase,
    noWrap
  }: TextProps) => {
    return (
      <div
        className={clsx(
          className,
          BaseTextStyle,
          Sprinkles({
            display: 'block',
            color,
            textAlign,
            fontSize,
            fontWeight,
            cursor,
            fontFamily,
            margin,
            marginBottom,
            marginLeft,
            marginRight,
            marginTop,
            marginX,
            marginY
          }),
          { uppercase, noWrap }
        )}
        onClick={onClick}
      >
        {children}
      </div>
    )
  }
)

Text.displayName = 'Text'
