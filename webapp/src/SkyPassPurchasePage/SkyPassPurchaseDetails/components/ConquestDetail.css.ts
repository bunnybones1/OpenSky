import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const ConquestDetailImage = style({
  height: '114%',
  transform: 'translate(-6%, 9%)',
  ...responsiveStyle({
    tablet: {
      transform: 'translate(-1%, 9%)'
    }
  })
})
