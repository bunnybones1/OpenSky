import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const CardDetailsHeaderStyle = style({
  height: '56px',
  ...responsiveStyle({
    tabletWide: {
      height: '64px'
    }
  })
})
