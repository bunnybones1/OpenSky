import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckSelectorHeroDetailsTooltipStyle = style({
  width: '278px',
  maxWidth: '278px',
  height: `calc(100vh - 56px)`,
  maxHeight: `calc(100vh - 56px)`,
  minWidth: '200px',
  overflowY: 'auto',
  ...responsiveStyle({
    tabletWide: {
      width: '350px',
      maxWidth: '350px',
      height: '380px',
      maxHeight: '380px'
    }
  })
})

export const HeroDetailsToolTipGradientWrapper = style({
  height: '164px'
})

export const HeroDetailsTooltipBottomGradientWrapper = style({
  top: '-16px'
})

export const TopHeroDetailsGradient = style({
  background: `linear-gradient(
    to bottom,
    ${ThemeVars.color.purple3} 0%,
    rgba(28, 16, 56, 0) 35%,
    rgba(28, 16, 56, 0) 100%
  )`
})

export const BottomHeroDetailsGradient = style({
  background: `linear-gradient(
    to top,
    ${ThemeVars.color.purple3} 0%,
    rgba(28, 16, 56, 0) 30%,
    rgba(28, 16, 56, 0) 100%
  )`
})

export const HeroDetailsTooltipDescWrapper = style({
  zIndex: 7,
  marginTop: '-20px'
})

export const HeroDetailsTooltipPrismImage = style({
  width: '60px',
  height: '60px',
  ...responsiveStyle({
    tabletWide: {
      width: '72px',
      height: '72px'
    }
  })
})
