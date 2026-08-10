import { style } from '@vanilla-extract/css'

import { TOP_OFFSET_KEY } from '~/shared/style/constants'
import { responsiveStyle } from '~/shared/style/Theme'

export const PendingGoldsPageStyle = style({
  paddingTop: `calc(44px + var(${TOP_OFFSET_KEY}))`,
  ...responsiveStyle({
    tabletWide: {
      paddingTop: `calc(92px + var(${TOP_OFFSET_KEY}))`
    }
  })
})
