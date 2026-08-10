import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const MaxPlayerLeaderboardWidth = style({
  ...responsiveStyle({
    tabletWide: {
      maxWidth: '1000px'
    }
  })
})
