import styled from '@emotion/styled'
import {
  alignItems,
  AlignItemsProps,
  borderColor,
  borderRadius,
  borders,
  bottom,
  color,
  flex,
  flexDirection,
  FlexDirectionProps,
  FlexProps,
  flexWrap,
  FlexWrapProps,
  gridColumnGap,
  gridGap,
  GridProps,
  gridRowGap,
  gridTemplateAreas,
  gridTemplateColumns,
  gridTemplateRows,
  height,
  justifyContent,
  JustifyContentProps,
  left,
  maxHeight,
  maxWidth,
  minHeight,
  minWidth,
  opacity,
  position,
  right,
  space,
  top,
  width,
  zIndex
} from 'styled-system'

import { BoxProps } from './Box'
import { flexBoxType, transform, transitionTheme } from './shared/helpers'

type FlexTypes =
  | 'centered-row'
  | 'centered-column'
  | 'start-column'
  | 'start-row'
  | 'end-row'
  | 'end-column'
  | 'centered-start-column'
  | 'centered-start-row'
  | 'centered-between-row'
  | 'centered-end-column'
  | 'centered-end-row'

export interface GridContainerProps
  extends BoxProps,
    AlignItemsProps,
    JustifyContentProps,
    FlexWrapProps,
    FlexDirectionProps,
    GridProps,
    FlexProps {
  type?: FlexTypes
  border?: string
}

export const Grid = styled.div<GridContainerProps>`
  ${alignItems}
  ${justifyContent}
  ${flexWrap}
  ${flexDirection}
  ${flex}
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
  ${zIndex}
  ${flexBoxType}
  ${transform}
  ${transitionTheme}
  ${gridTemplateColumns}
  ${gridTemplateRows}
  ${gridTemplateAreas}
  ${gridGap}
  ${gridRowGap}
  ${gridColumnGap}
  user-select: none;
  display: grid;
  cursor: ${(props) => (props.onClick ? 'pointer' : 'unset')};
`

Grid.displayName = 'Grid'
