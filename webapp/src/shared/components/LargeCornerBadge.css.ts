import { style } from '@vanilla-extract/css'

export const BadgeContainer = style({
  width: '60px',
  height: '60px',
  top: '-12px',
  right: '-12px',
  borderRadius: '50%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
})

export const Badge = style({
  width: '46px',
  height: '46px',
  borderRadius: '50%',
  textTransform: 'uppercase'
})
