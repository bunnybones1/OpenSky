import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const QuestsPageButtonContainer = style({
  width: '75px',
  ...responsiveStyle({
    tabletWide: {
      width: '102px'
    }
  })
})
