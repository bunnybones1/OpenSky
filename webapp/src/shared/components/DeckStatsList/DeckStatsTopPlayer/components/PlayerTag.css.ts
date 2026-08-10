import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const PlayerTagStyle = style({
  height: '36px',
  border: `1px solid ${ThemeVars.color.purple7}`,
  selectors: {
    '&.isClickable': {
      cursor: 'pointer'
    },
    '&.isClickable:hover': {
      borderColor: ThemeVars.color.purple9
    }
  }
})

export const PlayerTagInfo = style({
  zIndex: 2
})
