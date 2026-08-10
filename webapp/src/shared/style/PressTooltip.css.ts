import { globalStyle, style } from '@vanilla-extract/css'

export const PressTooltipStyle = style({})

globalStyle(`${PressTooltipStyle} *`, {
  userSelect: 'none'
})
