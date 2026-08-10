import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const GameModeDialogButtonImage = style({
  width: 'calc(100% + 2px)',
  top: '-2px',
  left: '-2px'
})

export const GameModeDialogButtonStyle = style({
  width: '200px',
  height: '108px',
  transition: '0.25s ease-in-out',
  selectors: {
    '&:hover': {
      filter: `drop-shadow(0px 0px 8px ${ThemeVars.color.purple8})`
    },
    '&.isActive': {
      filter: `drop-shadow(0px 0px 8px ${ThemeVars.color.purple8})`
    }
  }
})

export const GameModeDialogButtonGradient = style({
  background:
    'linear-gradient(90deg, rgba(12, 6, 30, 0.9) 15.82%, rgba(12, 6, 30, 0) 80.61%, rgba(12, 6, 30, 0.2) 99.78%), linear-gradient(0deg, #0C061E 0%, rgba(12, 6, 30, 0.95) 20.37%, rgba(12, 6, 30, 0) 64.81%, rgba(12, 6, 30, 0.2) 98.61%)',
  selectors: {
    '&.isActive': {
      background:
        'linear-gradient(0deg, rgba(172, 143, 255, 0.35), rgba(172, 143, 255, 0.35)), linear-gradient(0deg, rgba(12, 6, 30, 0.7), rgba(12, 6, 30, 0.7))'
    }
  }
})
