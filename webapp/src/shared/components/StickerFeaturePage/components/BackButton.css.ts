import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const BackButtonStyle = style({
  width: '75px',
  left: 'env(safe-area-inset-left, 0px)',
  ...responsiveStyle({
    tabletWide: {
      width: '102px'
    }
  })
})
