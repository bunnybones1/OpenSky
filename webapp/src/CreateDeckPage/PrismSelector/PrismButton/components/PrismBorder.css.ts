import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

import { PrismButtonStyle } from '../PrismButton.css'

export const PrismBorderStyle = style({
  zIndex: -1
})

export const PrismBorderStroke = style({
  transition: '0.125s ease-out',
  selectors: {
    [`${PrismButtonStyle}:hover:not(.isSelected) &`]: {
      stroke: `${ThemeVars.color.purple8}!important`
    }
  }
})
