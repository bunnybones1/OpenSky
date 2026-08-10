import { css } from '@emotion/react'
import styled from '@emotion/styled'
import {
  borderColor,
  borderRadius,
  borders,
  bottom,
  color,
  flex,
  fontSize,
  FontSizeProps,
  fontWeight,
  height,
  left,
  lineHeight,
  LineHeightProps,
  maxHeight,
  maxWidth,
  minHeight,
  minWidth,
  opacity,
  position,
  right,
  space,
  textAlign,
  TextAlignProps,
  top,
  width,
  zIndex
} from 'styled-system'

import { ThemeColorType } from '~/__deprecated__/style/types'

import { BoxProps } from '../shared/components/Base/Box'
import {
  textType,
  transitionTheme
} from '../shared/components/Base/shared/helpers/index'

type TextTypes = 'header' | 'description' | 'body'

export interface TextProps
  extends BoxProps,
    FontSizeProps,
    TextAlignProps,
    LineHeightProps {
  textWrap?: boolean
  fontFamily?: string
  fontWeight?: string
  type?: TextTypes
  allowUserSelect?: boolean
  color?: ThemeColorType
  whiteSpace?: React.CSSProperties['whiteSpace']
}
/**
 * @deprecated Use ~/shared/components/Text
 */
export const Text = styled.div<TextProps>`
  ${fontSize}
  ${textAlign}
  ${fontWeight}
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
  ${transitionTheme}
  ${(props) =>
    !props.textWrap &&
    css`
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    `};
  font-family: ${(props) =>
    props.fontFamily
      ? props.theme.fontFamilies[props.fontFamily]
      : props.theme.fontFamilies.primary};
  ${textType}
  ${(props) => {
    if (props.lineHeight) {
      return lineHeight(props)
    }
    return { lineHeight: '1.250em' }
  }}
  ${({ allowUserSelect, theme }) => {
    if (allowUserSelect) {
      return ''
    }

    return `${theme.mediaQueries.tablet} { user-select: none; }`
  }}
  vertical-align: middle;
  strong {
    color: ${({ theme }) => theme.colors.white};
    font-weight: ${(props) => props.theme.fontWeights.bold};
  }
  .discovery {
    color: #e5918d;
  }
  .constructed {
    color: #a5ddd5;
  }
`

Text.defaultProps = {
  fontSize: 2,
  fontWeight: 'regular',
  fontFamily: 'primary',
  className: 'sequence-platforms-text'
}

Text.displayName = 'Text'
