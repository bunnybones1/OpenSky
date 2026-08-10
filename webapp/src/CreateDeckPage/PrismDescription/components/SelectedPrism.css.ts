import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const SelectedPrismStyle = style({
  maxWidth: '200px',
  width: '60%',
  ...responsiveStyle({
    tablet: {
      width: '40%'
    }
  })
})

export const SelectedPrismInner = style({
  width: '56px',
  height: '56px',
  ...responsiveStyle({
    tablet: {
      width: '70px',
      height: '70px'
    },
    tabletWide: {
      width: '80px',
      height: '80px'
    }
  })
})

export const SelectedPrismImage = style({
  transition: 'background 0.3s ease-in-out',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover'
})
