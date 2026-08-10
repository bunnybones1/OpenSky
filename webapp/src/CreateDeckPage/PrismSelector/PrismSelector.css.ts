import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const PrismSelectorInner = style({
  bottom: '12px',
  left: '50%',
  width: '475px',
  transform: 'translateX(-50%)',
  ...responsiveStyle({
    tablet: {
      width: '660px',
      bottom: '18px'
    },
    desktop: {
      width: '1069px',
      bottom: '30px'
    }
  })
})

export const PrismSelectorStyle = style({
  transform: 'scale(0.7)'
})
