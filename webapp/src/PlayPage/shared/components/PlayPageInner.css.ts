import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const PlayPageInnerStyle = style({
  height: '100%',
  border: 'none',
  maxWidth: '1440px',
  backgroundSize: 'cover',
  ...responsiveStyle({
    desktop: {
      border: `1px solid ${ThemeVars.color.purple7}`,
      height: 'calc(100% - 24px)'
    }
  })
})

export const PlayPageInnerDeckTypeIcon = style({
  width: '200px',
  opacity: 0.12
})

export const PlayPageInnerGradient = style({
  background: `radial-gradient(
    57.16% 81.47% at 2.32% -10.68%,
    rgba(2, 9, 44, 0.9) 39.77%,
    rgba(12, 6, 30, 0) 100%
  ),
  linear-gradient(
    90deg,
    rgba(12, 6, 30, 0.9) 6.25%,
    rgba(12, 6, 30, 0) 34.9%,
    rgba(12, 6, 30, 0) 58.33%,
    rgba(12, 6, 30, 0.2) 99.78%
  ),
  linear-gradient(
    0deg,
    #0c061e 0%,
    rgba(12, 6, 30, 0.95) 10.12%,
    rgba(12, 6, 30, 0) 35.03%,
    rgba(12, 6, 30, 0) 85.93%,
    rgba(11, 6, 30, 0.8) 99.4%
  )`,
  selectors: {
    '&.isDiscovery': {
      background: `radial-gradient(
        57.16% 81.47% at 2.32% -10.68%,
        rgba(24, 0, 0, 0.9) 39.77%,
        rgba(12, 6, 30, 0) 100%
      ),
      linear-gradient(
        90deg,
        rgba(12, 6, 30, 0.9) 6.25%,
        rgba(12, 6, 30, 0) 34.9%,
        rgba(12, 6, 30, 0) 58.33%,
        rgba(12, 6, 30, 0.2) 99.78%
      ),
      linear-gradient(
        0deg,
        #0c061e 0%,
        rgba(12, 6, 30, 0.95) 10.12%,
        rgba(12, 6, 30, 0) 35.03%,
        rgba(12, 6, 30, 0) 85.93%,
        rgba(11, 6, 30, 0.8) 99.4%
      )`
    }
  }
})

export const PlayPageInnerChildWrapper = style({
  rowGap: '16px'
})
