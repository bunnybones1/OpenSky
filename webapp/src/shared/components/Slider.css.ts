import { globalStyle, style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const SliderRange = style({
  background: `linear-gradient(to right, ${ThemeVars.color.purple9} 0%, ${ThemeVars.color.purple9} 100%, ${ThemeVars.color.purple6} 100%, ${ThemeVars.color.purple6} 100%)`,
  height: '10px',
  width: '180px',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  selectors: {
    '&:disabled': {
      opacity: 0.55
    }
  }
})

globalStyle(`input[type="range"]::-webkit-slider-thumb`, {
  WebkitAppearance: 'none',
  appearance: 'none',
  height: '28px',
  width: '8px',
  background: ThemeVars.color.white,
  borderRadius: '2px',
  boxShadow: '0 0 1px 1px rgba(0,0,0, 0.15)',
  cursor: 'pointer'
})

globalStyle(`input[type="range"]::-moz-range-thumb`, {
  appearance: 'none',
  height: '24px',
  width: '8px',
  background: ThemeVars.color.white,
  borderRadius: '2px',
  boxShadow: '0 0 1px 1px rgba(0,0,0, 0.15)',
  cursor: 'pointer'
})

export const SliderLabel = style({
  width: '42px'
})

export const SliderLeftLabel = style({
  width: '180px'
})
