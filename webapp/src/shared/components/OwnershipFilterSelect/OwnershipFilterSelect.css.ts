import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const OwnershipFilterSelectStyle = style({
  minWidth: '100px',
  ...responsiveStyle({
    tablet: {
      minWidth: '129px'
    }
  })
})
