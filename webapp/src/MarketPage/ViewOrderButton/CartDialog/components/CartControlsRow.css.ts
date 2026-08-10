import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const CartControlsRowStyle = style({
  height: '60px',
  ...responsiveStyle({
    tabletWide: { height: '80px' }
  })
})
