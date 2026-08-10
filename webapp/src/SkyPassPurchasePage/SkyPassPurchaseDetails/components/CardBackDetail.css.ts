import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const CardBackDetailStyle = style({
  height: '150px',
  ...responsiveStyle({
    tablet: {
      height: '276px'
    }
  })
})

export const FirstCardBack = style({
  height: '72%',
  left: '18%',
  top: '50%',
  transform: 'translateY(-50%)',
  ...responsiveStyle({
    tablet: {
      left: '0px'
    }
  })
})

export const SecondCardBack = style({
  left: '33.46%',
  top: '50%',
  transform: 'rotate(5deg) translateY(-50%)',
  height: '68%',
  filter: 'brightness(60%)',
  ...responsiveStyle({
    tablet: {
      left: '18.5%'
    }
  })
})

export const ThirdCardBack = style({
  height: '59%',
  left: '47.37%',
  top: '50%',
  transform: 'rotate(7deg) translateY(-50%)',
  filter: 'brightness(40%)',
  ...responsiveStyle({
    tablet: {
      left: '35.93%'
    }
  })
})
