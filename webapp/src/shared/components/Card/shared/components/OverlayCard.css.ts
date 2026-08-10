import { style } from '@vanilla-extract/css'

export const OverlayCardImage = style({
  zIndex: 2,
  width: '100%',
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)'
})

export const OverlayCardShadow = style({
  position: 'absolute',
  top: '1%',
  left: '-2.9%',
  zIndex: 1,
  width: '110%'
})
