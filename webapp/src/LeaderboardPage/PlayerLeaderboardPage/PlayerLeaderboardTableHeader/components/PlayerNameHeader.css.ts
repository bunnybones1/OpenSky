import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const PlayerNameInputStyle = style({
  width: '100%',
  ...responsiveStyle({
    tabletWide: {
      width: '300px'
    }
  })
})
