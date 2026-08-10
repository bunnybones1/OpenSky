import { style } from '@vanilla-extract/css'

export const PlayPageBackgroundStyle = style({
  zIndex: -1,
  backgroundSize: 'cover',
  filter: 'blur(8px)',
  opacity: 0.65
})

export const PlayPageBackgroundGradient = style({
  background: 'linear-gradient(rgba(12, 6, 30, 0.6), rgba(12, 6, 30, 1))'
})
