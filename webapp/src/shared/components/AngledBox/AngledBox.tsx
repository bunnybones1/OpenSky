import { assignInlineVars } from '@vanilla-extract/dynamic'
import clsx from 'clsx'
import { memo, ReactNode } from 'react'

import { ThemeColorType } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

import {
  AngledBoxBorderSizes,
  AngledBoxCornerSizes,
  AngledBoxCornerTypes,
  AngledBoxInnerRecipe,
  AngledBoxOuterRecipe,
  backgroundColorVar,
  borderColorVar,
  hoverBackgroundColorVar,
  hoverBorderColorVar
} from './AngledBox.css'

export interface AngledBoxProps {
  children: ReactNode
  borderSize: AngledBoxBorderSizes
  cornerSize: AngledBoxCornerSizes
  borderColor: ThemeColorType
  hoverBorderColor?: ThemeColorType
  hoverBackgroundColor?: ThemeColorType
  backgroundColor: ThemeColorType
  cornerType?: AngledBoxCornerTypes
  className?: string
}

export const AngledBox = memo(
  ({
    children,
    borderSize,
    backgroundColor,
    borderColor,
    cornerSize,
    cornerType,
    className,
    hoverBorderColor,
    hoverBackgroundColor
  }: AngledBoxProps) => {
    return (
      <div
        style={assignInlineVars({
          [borderColorVar]: ThemeVars.color[borderColor],
          [backgroundColorVar]: ThemeVars.color[backgroundColor],
          [hoverBackgroundColorVar]:
            ThemeVars.color[hoverBackgroundColor || backgroundColor],
          [hoverBorderColorVar]: ThemeVars.color[hoverBorderColor || borderColor]
        })}
        className={clsx(
          className,
          AngledBoxOuterRecipe({ borderSize, cornerSize, cornerType })
        )}
      >
        <div className={clsx(AngledBoxInnerRecipe({ cornerType }))}>{children}</div>
      </div>
    )
  }
)

AngledBox.displayName = 'AngledBox'
