import { keyframes, style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

const TooltipGlow = keyframes({
  '0%': {
    boxShadow: '0px 0px 8px 0px rgba(172, 143, 255, 0)'
  },
  '50%': {
    boxShadow: '0px 0px 8px 0px rgba(172, 143, 255, 1)'
  },
  '100%': {
    boxShadow: '0px 0px 8px 0px rgba(172, 143, 255, 0)'
  }
})

export const TooltipStyle = style({
  padding: '6px 10px',
  backgroundColor: ThemeVars.color.black,
  pointerEvents: 'none',
  border: `1px solid ${ThemeVars.color.purple6}`,
  boxShadow: `0px 0px 12px 0px ${ThemeVars.color.purple8}`,
  animationName: TooltipGlow,
  animationDuration: '4s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'ease-in-out',
  zIndex: 1000,
  selectors: {
    '&.noPadding': {
      padding: '0px'
    }
  }
})
