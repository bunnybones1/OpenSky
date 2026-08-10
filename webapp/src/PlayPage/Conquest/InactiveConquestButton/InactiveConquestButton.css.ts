import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const InactiveConquestButtonUnlock = style({
  color: ThemeVars.color.white,
  transition: '0.125s ease-out',
  left: '50%',
  bottom: '-32px',
  transform: 'translateX(-50%)',
  selectors: {
    '&:hover': {
      color: ThemeVars.color.warm7
    }
  }
})
