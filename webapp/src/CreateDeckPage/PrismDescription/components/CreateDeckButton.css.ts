import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const CreateDeckButtonStyle = style({
  width: '185px',
  ...responsiveStyle({
    tablet: { width: '250px' }
  })
})
