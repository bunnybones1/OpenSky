import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const HeaderDeckStringStyle = style({
  transition: 'color 0.2s ease-in',
  selectors: {
    '&:hover': {
      color: ThemeVars.color.purple9
    }
  }
})
