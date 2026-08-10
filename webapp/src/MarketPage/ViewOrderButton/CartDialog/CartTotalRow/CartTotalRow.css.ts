import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const CartTotalRowStyle = style({
  height: '36px',
  ...responsiveStyle({
    tabletWide: {
      height: '60px'
    }
  })
})

export const CartTotalRowTotalText = style({
  minWidth: '116px'
})
