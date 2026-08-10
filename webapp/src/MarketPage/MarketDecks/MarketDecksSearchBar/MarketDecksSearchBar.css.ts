import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

export const MarketDecksSearchBarStyle = style({
  top: '0px',
  ...responsiveStyle({
    tabletWide: { top: `${NAVBAR_HEIGHT - 10}px` }
  })
})
