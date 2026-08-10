import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { ReactNode } from 'react'
import {
  borderColor,
  BorderColorProps,
  borderRadius,
  BorderRadiusProps,
  borders,
  BordersProps,
  bottom,
  BottomProps,
  color,
  ColorProps,
  display,
  DisplayProps,
  flex,
  FlexProps,
  height,
  HeightProps,
  left,
  LeftProps,
  maxHeight,
  MaxHeightProps,
  maxWidth,
  MaxWidthProps,
  minHeight,
  MinHeightProps,
  minWidth,
  MinWidthProps,
  opacity,
  OpacityProps,
  position,
  PositionProps,
  right,
  RightProps,
  space,
  SpaceProps,
  top,
  TopProps,
  width,
  WidthProps,
  zIndex,
  ZIndexProps
} from 'styled-system'

import { transform, transitionTheme } from './shared/helpers'

/* eslint-disable max-len */

export interface BoxProps
  extends SpaceProps,
    HeightProps,
    WidthProps,
    ColorProps,
    BordersProps,
    BorderColorProps,
    BorderRadiusProps,
    PositionProps,
    TopProps,
    RightProps,
    BottomProps,
    LeftProps,
    OpacityProps,
    MaxHeightProps,
    MinWidthProps,
    MaxWidthProps,
    MinHeightProps,
    FlexProps,
    DisplayProps,
    ZIndexProps {
  flexShrink?: number
  onClick?: (e) => void
  border?: string
  transform?: string
  overflow?: string
  transitionTheme?: boolean
  children?: ReactNode
}

export const Box = styled.div<BoxProps>`
  ${space}
  ${height}
  ${width}
  ${color}
  ${borders}
  ${borderColor}
  ${borderRadius}
  ${position}
  ${top}
  ${right}
  ${bottom}
  ${left}
  ${opacity}
  ${maxHeight}
  ${minWidth}
  ${maxWidth}
  ${minHeight}
  ${flex}
  ${zIndex}
  ${display}
  ${transform}
  user-select: none;
  transition: ${transitionTheme};
  cursor: ${(props) => (props.onClick ? 'pointer' : 'unset')};
  ${(props) =>
    props.overflow &&
    css`
      overflow: ${props.overflow};
    `}
`

Box.displayName = 'Box'
