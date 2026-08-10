import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const HeroSelectStyle = style({
  gridTemplateRows: 'repeat(5, 1fr)',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginBottom: '0px',
  userSelect: 'none',
  transformOrigin: 'top',
  width: '240px',
  height: '260px',
  backfaceVisibility: 'hidden',
  transform: 'scale(0.60) translateZ(0)',
  ...responsiveStyle({
    mobile: {
      transform: 'scale(0.62) translateZ(0)',
      height: '280px'
    },
    tablet: {
      marginBottom: '80px',
      transform: 'scale(0.65) translateZ(0)',
      height: '430px'
    },
    tabletWide: {
      transform: 'scale(1) translateZ(0)',
      marginBottom: '60px'
    },
    desktopWide: {
      marginBottom: '0px',
      width: '420px',
      height: '255px',
      gridTemplateRows: 'repeat(3, 1fr)',
      gridTemplateColumns: 'repeat(5, 1fr)'
    }
  })
})
