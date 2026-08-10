import { style } from '@vanilla-extract/css'

export const ImgWrapper = style({
  position: 'absolute',
  objectFit: 'cover',
  width: '100%',
  height: '100%',
  left: '50%',
  top: '0px',
  transform: 'translateX(-50%)',
  objectPosition: 'top left'
})
