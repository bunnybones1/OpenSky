import { css } from '@emotion/react'
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

export type FlexTypes =
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

export interface FlexBoxProps
  extends BoxProps,
    AlignItemsProps,
    JustifyContentProps,
    FlexWrapProps,
    FlexDirectionProps,
    FlexProps {
  type?: FlexTypes
  border?: string
  css?: any
}

export const FlexBox = styled.div<FlexBoxProps>`
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
  ${transitionTheme}
  ${transform}
  display: flex;
  user-select: none;

  flex-shrink: ${(props) => props.flexShrink || 0};
  cursor: ${(props) => (props.onClick ? 'pointer' : 'unset')};
  ${(props) =>
    props.overflow &&
    css`
      overflow: ${props.overflow};
    `}
  ${(props) =>
    props.css &&
    css`
      ${props.css}
    `}
`

FlexBox.defaultProps = {
  flexDirection: 'row',
  flexWrap: 'wrap'
}

FlexBox.displayName = 'FlexBox'
