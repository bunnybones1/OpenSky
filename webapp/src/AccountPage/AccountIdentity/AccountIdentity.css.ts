import { style } from '@vanilla-extract/css'

import { TOP_OFFSET_KEY } from '~/shared/style/constants'
import { responsiveStyle } from '~/shared/style/Theme'

export const AccountIdentityStyle = style({
  paddingTop: `calc(var(${TOP_OFFSET_KEY}) + 16px)`,
  ...responsiveStyle({
    tabletWide: {
      paddingTop: `calc(var(${TOP_OFFSET_KEY}) + 20px)`
    }
  })
})
