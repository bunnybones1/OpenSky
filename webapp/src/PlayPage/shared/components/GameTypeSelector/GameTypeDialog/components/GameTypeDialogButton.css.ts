import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const GameTypeDialogButtonStyle = style({
  height: '140px',
  filter: `drop-shadow(0px 0px 0px ${ThemeVars.color.purple8})`,
  transition: '0.25s ease-in-out',
  ...responsiveStyle({
    tabletWide: {
      height: '170px'
    }
  }),
  selectors: {
    '&:hover': {
      filter: `drop-shadow(0px 0px 8px ${ThemeVars.color.purple8})`
    },
    '&.isActive': {
      filter: `drop-shadow(0px 0px 8px ${ThemeVars.color.purple8})`
    }
  }
})

export const GameTypeDialogButtonGradient = style({
  background:
    'linear-gradient(90deg, rgba(12, 6, 30, 0.9) 15.82%, rgba(12, 6, 30, 0) 80.61%, rgba(12, 6, 30, 0.2) 99.78%), linear-gradient(0deg, #0C061E 0%, rgba(12, 6, 30, 0.95) 20.37%, rgba(12, 6, 30, 0) 64.81%, rgba(12, 6, 30, 0.2) 98.61%)',
  selectors: {
    '&.isActive': {
      background:
        'linear-gradient(0deg, rgba(172, 143, 255, 0.35), rgba(172, 143, 255, 0.35)), linear-gradient(0deg, rgba(12, 6, 30, 0.7), rgba(12, 6, 30, 0.7))'
    },
    '&.isLocked': {
      background:
        'linear-gradient(90deg, rgba(12, 6, 30, 0.9) 6.25%, rgba(12, 6, 30, 0.9) 34.9%), linear-gradient(0deg, #0C061E 0%, rgba(12, 6, 30, 0.95) 10.12%, rgba(12, 6, 30, 0) 35.03%)'
    }
  }
})

export const GameTypeDialogLockContainer = style({
  bottom: '10px',
  width: '60px',
  height: '39px'
})
