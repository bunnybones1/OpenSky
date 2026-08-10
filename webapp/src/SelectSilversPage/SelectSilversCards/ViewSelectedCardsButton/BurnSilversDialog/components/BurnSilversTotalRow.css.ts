import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const BurnSilversTotalRowStyle = style({
  height: '36px',
  ...responsiveStyle({
    tabletWide: {
      height: '60px'
    }
  })
})
