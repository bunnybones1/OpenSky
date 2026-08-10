import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const CardImageTooltipWrapper = style({
  zIndex: 1000,
  width: '200px',
  ...responsiveStyle({
    tabletWide: {
      width: '300px',
      marginTop: '12px'
    }
  })
})
