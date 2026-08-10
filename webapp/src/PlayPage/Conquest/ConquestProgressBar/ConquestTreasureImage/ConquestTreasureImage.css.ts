import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const ConquestTreasureImageWrapper = style({
  width: '60px',
  ...responsiveStyle({
    desktop: {
      width: '100px'
    }
  })
})

export const TreasureTooltipWrapper = style({
  width: '318px'
})

export const TreasureTooltipHeader = style({
  height: '50px',
  borderBottom: `1px solid ${ThemeVars.color.purple6}`
})

export const TreasureTooltipDivider = style({
  height: '90px',
  width: '1px',
  background:
    'linear-gradient(0deg, rgba(172,143,255,0) 0%, rgba(172,143,255,1) 48%, rgba(172,143,255,0) 100%)'
})

export const ConquestTreasureImageLoader = style({
  height: '198px'
})

export const ConquestTreasureImageIcon = style({
  right: '8px',
  bottom: '12px'
})
