import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const EmptyPlayerLeaderboardStyle = style({
  minHeight: '300px',
  ...responsiveStyle({
    tabletWide: {
      height: '700px'
    }
  })
})
