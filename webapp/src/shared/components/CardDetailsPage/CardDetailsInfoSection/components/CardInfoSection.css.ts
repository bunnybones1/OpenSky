import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const CardInfoSectionStyle = style({
  gridAutoFlow: 'row'
})

export const CardInfoSectionRow = style({
  backgroundColor: ThemeVars.color.purple2,
  gridTemplateColumns: '1fr 1.4fr',
  height: '40px',
  selectors: {
    '&:nth-of-type(even)': {
      backgroundColor: ThemeVars.color.purple3
    }
  }
})
