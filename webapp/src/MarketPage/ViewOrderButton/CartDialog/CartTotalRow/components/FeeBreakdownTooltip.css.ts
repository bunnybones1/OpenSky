import { globalStyle, style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const FeeBreakdownTooltipStyle = style({
  maxWidth: '272px',
  lineHeight: '18px'
})

globalStyle(`${FeeBreakdownTooltipStyle} strong`, {
  fontWeight: '700',
  color: ThemeVars.color.purple9
})
