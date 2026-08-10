import { style } from '@vanilla-extract/css'

import { MOBILE_SUBNAV_HEIGHT, SUBNAV_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

export const SubNavContainer = style({
  height: `${MOBILE_SUBNAV_HEIGHT}px`,
  flexShrink: 0,
  ...responsiveStyle({
    tabletWide: {
      height: `${SUBNAV_HEIGHT}px`
    }
  })
})
