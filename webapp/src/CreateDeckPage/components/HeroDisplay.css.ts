import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const HeroDisplayStyle = style({
  minWidth: '25vw'
})

export const HeroDisplayInner = style({
  width: '90%',
  maxWidth: '750px',
  left: '5%',
  ...responsiveStyle({
    mobile: { width: '80%', left: '6%' },
    tablet: { width: '70%', left: '15%' }
  })
})

export const HeroDisplayGradient = style({
  width: '100vw',
  height: '50%',
  backgroundImage:
    'linear-gradient(to bottom, rgba(12, 6, 30, 0), #0c061e 65%, #0c061e)',
  ...responsiveStyle({
    mobile: { height: '45%' },
    tablet: { height: '40%' },
    tabletWide: { height: '50%' }
  })
})

export const HeroDisplayImage = style({
  top: '16px',
  ...responsiveStyle({
    mobile: { top: '0px' },
    tablet: { top: '5vh' },
    tabletWide: { top: '0px' }
  })
})
