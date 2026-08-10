import { style } from '@vanilla-extract/css'

import { SUBNAV_HEIGHT } from '~/shared/constants/ui'
import { TOP_OFFSET_KEY } from '~/shared/style/constants'
import { responsiveStyle } from '~/shared/style/Theme'

export const ShopPageNavStyle = style({
  top: `var(${TOP_OFFSET_KEY})`,
  ...responsiveStyle({
    tabletWide: {
      marginTop: '-10px',
      paddingTop: '10px',
      top: `calc(var(${TOP_OFFSET_KEY}) - 10px)`,
      height: `calc(${SUBNAV_HEIGHT}px + 10px)`
    }
  })
})
