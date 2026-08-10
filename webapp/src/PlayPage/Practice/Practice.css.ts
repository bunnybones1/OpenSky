import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const PracticeToggleButton = style({
  width: '129px',
  ...responsiveStyle({
    tabletWide: {
      width: '141px'
    }
  })
})
