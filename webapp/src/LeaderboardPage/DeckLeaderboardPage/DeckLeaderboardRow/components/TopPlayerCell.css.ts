import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const TopPlayerCellContainer = style({
  maxWidth: '200px',
  height: '36px',
  selectors: {
    '&:hover': {
      borderColor: ThemeVars.color.purple7
    }
  }
})
